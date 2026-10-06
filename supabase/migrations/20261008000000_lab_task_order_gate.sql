-- CyberPingo · Verrouillage séquentiel des tâches de lab
--
-- Règle pédagogique : dans tout lab comportant plusieurs tâches, la première question
-- (position minimale) doit être résolue avec succès avant de pouvoir continuer et
-- soumettre les tâches suivantes.

create or replace function public.submit_lab_task(p_task_id uuid, p_answer text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  me public.profiles;
  task public.lab_tasks;
  lab public.labs;
  keys private.lab_task_keys;
  attempt_key text;
  wrong_recent integer;
  max_wrong constant integer := 10;
  total_count integer;
  done_count integer;
  inserted boolean;
  finished boolean := false;
  min_task_pos integer;
begin
  me := private.lock_profile(uid);
  select * into task from public.lab_tasks where id = p_task_id;
  if found then
    select * into lab from public.labs where id = task.lab_id;
  end if;
  if task.id is null or lab.id is null or (lab.status <> 'published' and not public.is_admin()) then
    raise exception 'Cette tâche n’est pas disponible.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  if p_answer is null or char_length(btrim(p_answer)) = 0 or char_length(p_answer) > 300 then
    raise exception 'Saisis une réponse (300 caractères maximum).' using errcode = '22023', hint = 'cyberpingo';
  end if;

  -- Contrôle pédagogique : la première question du lab doit être résolue avant de soumettre les tâches suivantes
  select min(position) into min_task_pos from public.lab_tasks where lab_id = lab.id;
  if task.position > min_task_pos then
    if not exists (
      select 1 from public.lab_task_completions ltc
      join public.lab_tasks lt on lt.id = ltc.task_id
      where ltc.user_id = uid and lt.lab_id = lab.id and lt.position = min_task_pos
    ) then
      raise exception 'Réponds d’abord avec succès à la première question du lab avant de continuer.' using errcode = '42501', hint = 'cyberpingo';
    end if;
  end if;

  select * into keys from private.lab_task_keys where task_id = task.id;
  if keys.task_id is null then
    raise exception 'Cette tâche n’a pas encore de réponse configurée.' using errcode = '22023', hint = 'cyberpingo';
  end if;

  -- Budget checked BEFORE comparing, so a blocked request reveals nothing about the answer.
  attempt_key := 'labtask:' || uid::text || ':' || task.id::text;
  select count(*) into wrong_recent from private.rate_events
  where key = attempt_key and created_at > now() - interval '10 minutes';
  if wrong_recent >= max_wrong then
    raise exception 'Trop de tentatives sur cette tâche. Réessaie dans quelques minutes.' using errcode = 'PT429', hint = 'cyberpingo';
  end if;
  if not exists (select 1 from unnest(keys.accepted) a where private.norm_answer(a) = private.norm_answer(p_answer)) then
    insert into private.rate_events (key) values (attempt_key);
    return jsonb_build_object('correct', false, 'remaining_attempts', max_wrong - wrong_recent - 1);
  end if;

  if lab.status <> 'published' then
    return jsonb_build_object('correct', true, 'preview', true, 'xp_awarded', 0, 'explanation', keys.explanation);
  end if;

  insert into public.lab_task_completions (user_id, task_id, lab_id) values (uid, task.id, lab.id) on conflict do nothing;
  inserted := found;
  select count(*) into total_count from public.lab_tasks where lab_id = lab.id;
  select count(*) into done_count from public.lab_task_completions where user_id = uid and lab_id = lab.id;
  if done_count >= total_count then
    finished := private.finish_lab(uid, lab);
  end if;

  return private.reward_summary(uid, me.xp, me.level) || jsonb_build_object(
    'correct', true,
    'already_solved', not inserted,
    'tasks_done', done_count,
    'tasks_total', total_count,
    'lab_completed', done_count >= total_count,
    'lab_newly_completed', finished,
    'xp_awarded', case when finished then lab.xp_reward else 0 end,
    'explanation', keys.explanation);
end $$;
