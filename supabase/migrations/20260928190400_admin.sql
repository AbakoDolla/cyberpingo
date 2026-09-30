-- CyberPingo · Phase 6 — Administration
-- Every function checks the caller's role in the database (never trusting the UI), writes an
-- entry in public.admin_logs and returns clean, French error messages.

-- ─── Supervision ──────────────────────────────────────────────────────────────

create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'users_total', (select count(*) from public.profiles),
    'staff_total', (select count(*) from public.profiles where role <> 'user'),
    'new_users_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'online_now', (select count(*) from public.learner_sessions where ended_at is null and last_seen_at > now() - interval '2 minutes'),
    'active_24h', (select count(distinct user_id) from public.activity_events where created_at > now() - interval '24 hours'),
    'courses', jsonb_build_object(
      'published', (select count(*) from public.courses where status = 'published'),
      'draft', (select count(*) from public.courses where status = 'draft'),
      'archived', (select count(*) from public.courses where status = 'archived')),
    'lessons_total', (select count(*) from public.lessons),
    'quizzes_total', (select count(*) from public.quizzes),
    'labs_published', (select count(*) from public.labs where status = 'published'),
    'enrollments_total', (select count(*) from public.enrollments),
    'courses_completed_total', (select count(*) from public.enrollments where status = 'completed'),
    'lessons_completed_total', (select count(*) from public.lesson_progress where status = 'completed'),
    'lessons_completed_7d', (select count(*) from public.lesson_progress where status = 'completed' and completed_at > now() - interval '7 days'),
    'quiz_attempts_7d', (select count(*) from public.quiz_attempts where created_at > now() - interval '7 days'),
    'average_quiz_score_7d', (select coalesce(round(avg(percentage)), 0) from public.quiz_attempts where created_at > now() - interval '7 days'),
    'xp_awarded_7d', (select coalesce(sum(amount), 0) from public.xp_transactions where amount > 0 and created_at > now() - interval '7 days'),
    'certificates_total', (select count(*) from public.certificates where revoked_at is null),
    'messages_new', (select count(*) from public.contact_messages where status = 'nouveau'),
    'signups_by_day', (
      select jsonb_agg(jsonb_build_object('date', d::date,
        'count', (select count(*) from public.profiles p where p.created_at >= d and p.created_at < d + interval '1 day')) order by d)
      from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d),
    'top_courses', coalesce((
      select jsonb_agg(row_to_json(t)::jsonb order by t.enrollments desc, t.title)
      from (
        select c.id, c.slug, c.title, c.status,
          (select count(*) from public.enrollments e where e.course_id = c.id) as enrollments,
          (select count(*) from public.enrollments e where e.course_id = c.id and e.status = 'completed') as completions
        from public.courses c
        order by enrollments desc, c.title limit 6
      ) t), '[]'::jsonb)
  );
end $$;

create function public.admin_users(p_search text default null, p_role text default null, p_limit integer default 50, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  needle text := nullif(btrim(lower(coalesce(p_search, ''))), '');
  page_size integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  skip integer := greatest(coalesce(p_offset, 0), 0);
begin
  perform private.require_admin();
  if p_role is not null and p_role not in ('user', 'admin', 'superadmin') then
    raise exception 'Rôle inconnu.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  return (
    with matching as (
      select p.* from public.profiles p
      where (p_role is null or p.role = p_role)
        and (needle is null or strpos(lower(p.display_name), needle) > 0 or strpos(p.username, needle) > 0 or strpos(lower(p.email), needle) > 0)
    )
    select jsonb_build_object(
      'total', (select count(*) from matching),
      'users', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', m.id, 'email', m.email, 'username', m.username, 'display_name', m.display_name, 'avatar_path', m.avatar_path,
          'role', m.role, 'xp', m.xp, 'level', m.level,
          'current_streak', private.effective_streak(m.id), 'longest_streak', m.longest_streak,
          'last_activity_at', m.last_activity_at, 'created_at', m.created_at,
          'lessons_completed', (select count(*) from public.lesson_progress lp where lp.user_id = m.id and lp.status = 'completed'),
          'quizzes_passed', (select count(distinct a.quiz_id) from public.quiz_attempts a where a.user_id = m.id and a.passed),
          'labs_solved', (select count(*) from public.lab_completions lc where lc.user_id = m.id),
          'courses_completed', (select count(*) from public.enrollments e where e.user_id = m.id and e.status = 'completed')
        ) order by m.xp desc, m.created_at)
        from (select * from matching order by xp desc, created_at limit page_size offset skip) m), '[]'::jsonb)
    )
  );
end $$;

create function public.admin_user_detail(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  target public.profiles;
begin
  perform private.require_admin();
  select * into target from public.profiles where id = p_user;
  if not found then
    raise exception 'Utilisateur introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  return jsonb_build_object(
    'profile', to_jsonb(target) || jsonb_build_object('current_streak', private.effective_streak(target.id)),
    'timezone', (select timezone from public.user_settings where user_id = target.id),
    'level', private.level_info(target.xp),
    'courses', coalesce((
      select jsonb_agg(jsonb_build_object('course_id', c.id, 'title', c.title, 'slug', c.slug, 'status', cp.status,
        'progress_percentage', cp.progress_percentage, 'enrolled_at', cp.enrolled_at, 'completed_at', cp.completed_at) order by cp.enrolled_at desc)
      from public.course_progress cp join public.courses c on c.id = cp.course_id where cp.user_id = target.id), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(jsonb_build_object('name', b.name, 'icon', b.icon, 'earned_at', ub.earned_at) order by ub.earned_at desc)
      from public.user_badges ub join public.badges b on b.id = ub.badge_id where ub.user_id = target.id), '[]'::jsonb),
    'certificates', coalesce((
      select jsonb_agg(jsonb_build_object('id', ce.id, 'certificate_number', ce.certificate_number, 'verification_code', ce.verification_code,
        'course_title', ce.course_title, 'issued_at', ce.issued_at, 'revoked_at', ce.revoked_at) order by ce.issued_at desc)
      from public.certificates ce where ce.user_id = target.id), '[]'::jsonb),
    'xp_history', coalesce((
      select jsonb_agg(jsonb_build_object('amount', x.amount, 'reason', x.reason, 'label', x.label, 'created_at', x.created_at) order by x.created_at desc)
      from (select * from public.xp_transactions where user_id = target.id order by created_at desc, id desc limit 25) x), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object('kind', a.kind, 'label', a.label, 'xp_delta', a.xp_delta, 'created_at', a.created_at) order by a.created_at desc)
      from (select * from public.activity_events where user_id = target.id order by created_at desc, id desc limit 25) a), '[]'::jsonb)
  );
end $$;

-- ─── Roles and XP adjustments ─────────────────────────────────────────────────

create function public.admin_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_superadmin();
  previous text;
begin
  if p_role not in ('user', 'admin', 'superadmin') then
    raise exception 'Rôle inconnu.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if p_user = actor then
    raise exception 'Tu ne peux pas modifier ton propre rôle.' using errcode = '42501', hint = 'cyberpingo';
  end if;
  select role into previous from public.profiles where id = p_user for update;
  if previous is null then
    raise exception 'Utilisateur introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  if previous = p_role then
    return;
  end if;
  if previous = 'superadmin' and (select count(*) from public.profiles where role = 'superadmin') <= 1 then
    raise exception 'La plateforme doit garder au moins un super-administrateur.' using errcode = '42501', hint = 'cyberpingo';
  end if;
  update public.profiles set role = p_role where id = p_user;
  perform private.log_admin('set_role', 'profile', p_user::text, jsonb_build_object('from', previous, 'to', p_role));
  perform private.notify(p_user, 'system', 'Ton rôle a changé',
    case p_role when 'user' then 'Ton compte est de nouveau un compte apprenant.'
                when 'admin' then 'Tu as maintenant accès à la console d’administration.'
                else 'Tu es maintenant super-administrateur de CyberPingo.' end,
    case when p_role = 'user' then '/dashboard' else '/admin' end);
end $$;

create function public.admin_adjust_xp(p_user uuid, p_amount integer, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_admin();
  target public.profiles;
  note text := btrim(coalesce(p_reason, ''));
begin
  if p_user = actor then
    raise exception 'Tu ne peux pas ajuster ton propre XP.' using errcode = '42501', hint = 'cyberpingo';
  end if;
  if p_amount is null or p_amount = 0 or p_amount not between -10000 and 10000 then
    raise exception 'L’ajustement doit être compris entre -10 000 et 10 000 XP (hors zéro).' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if char_length(note) not between 5 and 200 then
    raise exception 'Explique l’ajustement (5 à 200 caractères).' using errcode = '22023', hint = 'cyberpingo';
  end if;
  target := private.lock_profile(p_user);
  if target.xp + p_amount < 0 then
    raise exception 'L’XP de cet utilisateur ne peut pas devenir négatif.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  insert into public.xp_transactions (user_id, amount, reason, reference_type, reference_id, label, created_by)
  values (p_user, p_amount, 'admin_adjustment', 'admin', actor::text, note, actor);
  perform private.log_admin('adjust_xp', 'profile', p_user::text, jsonb_build_object('amount', p_amount, 'reason', note));
  perform private.notify(p_user, 'system', case when p_amount > 0 then '+' || p_amount || ' XP' else p_amount || ' XP' end,
    'Ajustement par l’équipe CyberPingo : ' || note, '/progression');
  perform private.evaluate_badges(p_user);
  return private.level_info((select xp from public.profiles where id = p_user));
end $$;

-- ─── Quiz editor ──────────────────────────────────────────────────────────────

create function private.insert_quiz_questions(p_quiz uuid, p_questions jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  question jsonb;
  answer jsonb;
  kind text;
  question_id uuid;
  answer_count integer;
  correct_count integer;
  index integer := 0;
  answer_index integer;
begin
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) not between 1 and 50 then
    raise exception 'Un quiz contient entre 1 et 50 questions.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  for question in select value from jsonb_array_elements(p_questions) loop
    index := index + 1;
    if jsonb_typeof(question) <> 'object' or jsonb_typeof(question -> 'answers') <> 'array' then
      raise exception 'Question % : format invalide.', index using errcode = '22023', hint = 'cyberpingo';
    end if;
    kind := coalesce(question ->> 'question_type', 'single_choice');
    answer_count := jsonb_array_length(question -> 'answers');
    select count(*) into correct_count from jsonb_array_elements(question -> 'answers') a
    where jsonb_typeof(a) = 'object' and coalesce((a ->> 'is_correct')::boolean, false);
    if answer_count not between 2 and 8 then
      raise exception 'Question % : il faut entre 2 et 8 réponses.', index using errcode = '22023', hint = 'cyberpingo';
    end if;
    if correct_count = 0 then
      raise exception 'Question % : coche au moins une bonne réponse.', index using errcode = '22023', hint = 'cyberpingo';
    end if;
    if kind in ('single_choice', 'true_false') and correct_count <> 1 then
      raise exception 'Question % : une seule bonne réponse est attendue.', index using errcode = '22023', hint = 'cyberpingo';
    end if;
    if kind = 'true_false' and answer_count <> 2 then
      raise exception 'Question % : une question vrai/faux a exactement deux réponses.', index using errcode = '22023', hint = 'cyberpingo';
    end if;
    insert into public.quiz_questions (quiz_id, position, question_type, prompt, image_url, explanation, difficulty, xp_reward)
    values (p_quiz, index, kind, btrim(coalesce(question ->> 'prompt', '')), nullif(btrim(coalesce(question ->> 'image_url', '')), ''),
      btrim(coalesce(question ->> 'explanation', '')), coalesce(question ->> 'difficulty', 'facile'),
      coalesce((question ->> 'xp_reward')::integer, 10))
    returning id into question_id;
    answer_index := 0;
    for answer in select value from jsonb_array_elements(question -> 'answers') loop
      answer_index := answer_index + 1;
      insert into public.quiz_answers (question_id, position, label, is_correct)
      values (question_id, answer_index, btrim(coalesce(answer ->> 'label', '')), coalesce((answer ->> 'is_correct')::boolean, false));
    end loop;
  end loop;
  return index;
end $$;

create function public.admin_get_quiz(p_quiz_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return (
    select to_jsonb(q) || jsonb_build_object('questions', coalesce((
      select jsonb_agg(to_jsonb(qq) || jsonb_build_object('answers', coalesce((
        select jsonb_agg(jsonb_build_object('id', a.id, 'label', a.label, 'is_correct', a.is_correct) order by a.position)
        from public.quiz_answers a where a.question_id = qq.id), '[]'::jsonb)) order by qq.position)
      from public.quiz_questions qq where qq.quiz_id = q.id), '[]'::jsonb))
    from public.quizzes q where q.id = p_quiz_id
  );
end $$;

-- Replaces every question of a quiz (answers included) in one transaction.
create function public.admin_save_quiz(p_quiz_id uuid, p_questions jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  saved integer;
begin
  perform private.require_admin();
  perform 1 from public.quizzes where id = p_quiz_id for update;
  if not found then
    raise exception 'Quiz introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  delete from public.quiz_questions where quiz_id = p_quiz_id;
  saved := private.insert_quiz_questions(p_quiz_id, p_questions);
  perform private.log_admin('save_quiz', 'quiz', p_quiz_id::text, jsonb_build_object('questions', saved));
  return saved;
end $$;

-- ─── Labs ─────────────────────────────────────────────────────────────────────

create function public.admin_get_lab_flag(p_lab_id uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return (select flag from private.lab_flags where lab_id = p_lab_id);
end $$;

create function public.admin_set_lab_flag(p_lab_id uuid, p_flag text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_admin();
  if not exists (select 1 from public.labs where id = p_lab_id) then
    raise exception 'Lab introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  if char_length(btrim(coalesce(p_flag, ''))) not between 1 and 200 then
    raise exception 'La réponse attendue doit contenir entre 1 et 200 caractères.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  insert into private.lab_flags (lab_id, flag) values (p_lab_id, btrim(p_flag))
  on conflict (lab_id) do update set flag = excluded.flag;
  perform private.log_admin('set_lab_flag', 'lab', p_lab_id::text);
end $$;

-- ─── Course import (AI studio / JSON) → always a draft ────────────────────────

create function private.slugify(p_text text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(nullif(left(btrim(regexp_replace(
    translate(lower(coalesce(p_text, '')), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ’''', 'aaaaaaceeeeiiiinooooouuuuyyoa--'),
    '[^a-z0-9]+', '-', 'g'), '-'), 60), ''), 'cours');
$$;

create function public.admin_import_course(p_course jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  base_slug text;
  final_slug text;
  course_id uuid;
  module jsonb;
  lesson jsonb;
  module_id uuid;
  lesson_id uuid;
  quiz_id uuid;
  module_index integer := 0;
  lesson_index integer;
  lesson_total integer := 0;
  quiz_total integer := 0;
  minutes integer := 0;
begin
  perform private.require_admin();
  if jsonb_typeof(p_course) <> 'object' or pg_column_size(p_course) > 1048576 then
    raise exception 'Format de cours invalide (1 Mo maximum).' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if jsonb_typeof(p_course -> 'modules') <> 'array' or jsonb_array_length(p_course -> 'modules') not between 1 and 30 then
    raise exception 'Un cours importé contient entre 1 et 30 modules.' using errcode = '22023', hint = 'cyberpingo';
  end if;

  base_slug := private.slugify(coalesce(nullif(p_course ->> 'slug', ''), p_course ->> 'title'));
  final_slug := base_slug;
  while exists (select 1 from public.courses where slug = final_slug) loop
    final_slug := left(base_slug, 53) || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
  end loop;

  insert into public.courses (slug, title, short_description, description, level, category, icon, status)
  values (final_slug, btrim(coalesce(p_course ->> 'title', '')), left(btrim(coalesce(p_course ->> 'short_description', '')), 280),
    btrim(coalesce(p_course ->> 'description', '')), coalesce(p_course ->> 'level', 'debutant'),
    coalesce(nullif(btrim(p_course ->> 'category'), ''), 'Fondamentaux'), coalesce(p_course ->> 'icon', 'fondamentaux'), 'draft')
  returning id into course_id;

  for module in select value from jsonb_array_elements(p_course -> 'modules') loop
    module_index := module_index + 1;
    if jsonb_typeof(module -> 'lessons') <> 'array' or jsonb_array_length(module -> 'lessons') not between 1 and 40 then
      raise exception 'Module % : il faut entre 1 et 40 leçons.', module_index using errcode = '22023', hint = 'cyberpingo';
    end if;
    insert into public.course_modules (course_id, title, description, position)
    values (course_id, btrim(coalesce(module ->> 'title', '')), btrim(coalesce(module ->> 'description', '')), module_index)
    returning id into module_id;

    lesson_index := 0;
    for lesson in select value from jsonb_array_elements(module -> 'lessons') loop
      lesson_index := lesson_index + 1;
      insert into public.lessons (module_id, course_id, title, summary, content_type, content, duration_minutes, xp_reward, position)
      values (module_id, course_id, btrim(coalesce(lesson ->> 'title', '')), left(btrim(coalesce(lesson ->> 'summary', '')), 500),
        coalesce(lesson ->> 'content_type', 'article'),
        case when jsonb_typeof(lesson -> 'content') = 'object' then lesson -> 'content'
             else jsonb_build_object('blocks', coalesce(lesson -> 'blocks', '[]'::jsonb)) end,
        coalesce((lesson ->> 'duration_minutes')::integer, 10), coalesce((lesson ->> 'xp_reward')::integer, 50), lesson_index)
      returning id into lesson_id;
      lesson_total := lesson_total + 1;
      minutes := minutes + coalesce((lesson ->> 'duration_minutes')::integer, 10);

      if jsonb_typeof(lesson -> 'quiz') = 'object' then
        insert into public.quizzes (module_id, course_id, lesson_id, title, description, pass_percentage)
        values (module_id, course_id, lesson_id, coalesce(nullif(btrim(lesson -> 'quiz' ->> 'title'), ''), 'Quiz — ' || btrim(lesson ->> 'title')),
          btrim(coalesce(lesson -> 'quiz' ->> 'description', '')), coalesce((lesson -> 'quiz' ->> 'pass_percentage')::integer, 70))
        returning id into quiz_id;
        perform private.insert_quiz_questions(quiz_id, lesson -> 'quiz' -> 'questions');
        quiz_total := quiz_total + 1;
      end if;
    end loop;

    if jsonb_typeof(module -> 'quiz') = 'object' then
      insert into public.quizzes (module_id, course_id, title, description, pass_percentage, position)
      values (module_id, course_id, coalesce(nullif(btrim(module -> 'quiz' ->> 'title'), ''), 'Révision — ' || btrim(module ->> 'title')),
        btrim(coalesce(module -> 'quiz' ->> 'description', '')), coalesce((module -> 'quiz' ->> 'pass_percentage')::integer, 70), 100)
      returning id into quiz_id;
      perform private.insert_quiz_questions(quiz_id, module -> 'quiz' -> 'questions');
      quiz_total := quiz_total + 1;
    end if;
  end loop;

  update public.courses set estimated_duration = minutes where id = course_id;
  perform private.log_admin('import_course', 'course', course_id::text,
    jsonb_build_object('slug', final_slug, 'modules', module_index, 'lessons', lesson_total, 'quizzes', quiz_total));
  return jsonb_build_object('id', course_id, 'slug', final_slug, 'modules', module_index, 'lessons', lesson_total, 'quizzes', quiz_total);
end $$;

create function public.admin_course_stats(p_course_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'enrollments', (select count(*) from public.enrollments where course_id = p_course_id),
    'completions', (select count(*) from public.enrollments where course_id = p_course_id and status = 'completed'),
    'average_progress', (select coalesce(round(avg(progress_percentage)), 0) from public.course_progress where course_id = p_course_id),
    'lessons', coalesce((
      select jsonb_agg(jsonb_build_object('id', l.id, 'title', l.title,
        'started', (select count(*) from public.lesson_progress lp where lp.lesson_id = l.id),
        'completed', (select count(*) from public.lesson_progress lp where lp.lesson_id = l.id and lp.status = 'completed'))
        order by m.position, l.position)
      from public.lessons l join public.course_modules m on m.id = l.module_id where l.course_id = p_course_id), '[]'::jsonb),
    'quizzes', coalesce((
      select jsonb_agg(jsonb_build_object('id', q.id, 'title', q.title,
        'attempts', (select count(*) from public.quiz_attempts a where a.quiz_id = q.id),
        'learners_passed', (select count(distinct a.user_id) from public.quiz_attempts a where a.quiz_id = q.id and a.passed),
        'average_score', (select coalesce(round(avg(a.percentage)), 0) from public.quiz_attempts a where a.quiz_id = q.id))
        order by q.position, q.title)
      from public.quizzes q where q.course_id = p_course_id), '[]'::jsonb)
  );
end $$;

-- ─── Certificates & notifications ─────────────────────────────────────────────

create function public.admin_revoke_certificate(p_certificate_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cert public.certificates;
  note text := btrim(coalesce(p_reason, ''));
begin
  perform private.require_admin();
  if char_length(note) not between 5 and 300 then
    raise exception 'Indique la raison de la révocation (5 à 300 caractères).' using errcode = '22023', hint = 'cyberpingo';
  end if;
  update public.certificates set revoked_at = now(), revoked_reason = note
  where id = p_certificate_id and revoked_at is null returning * into cert;
  if cert.id is null then
    raise exception 'Certificat introuvable ou déjà révoqué.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  perform private.log_admin('revoke_certificate', 'certificate', cert.id::text,
    jsonb_build_object('certificate_number', cert.certificate_number, 'reason', note));
  perform private.notify(cert.user_id, 'certificate', 'Certificat révoqué',
    'Le certificat « ' || cert.course_title || ' » a été révoqué : ' || note, '/profile');
end $$;

create function public.admin_restore_certificate(p_certificate_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cert public.certificates;
begin
  perform private.require_admin();
  update public.certificates set revoked_at = null, revoked_reason = null
  where id = p_certificate_id and revoked_at is not null returning * into cert;
  if cert.id is null then
    raise exception 'Certificat introuvable ou déjà valide.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  perform private.log_admin('restore_certificate', 'certificate', cert.id::text, jsonb_build_object('certificate_number', cert.certificate_number));
end $$;

create function public.admin_broadcast_notification(p_title text, p_body text, p_link text default null, p_audience text default 'all') returns integer
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_admin();
  sent integer;
begin
  if p_audience not in ('all', 'learners', 'staff') then
    raise exception 'Audience inconnue.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 2 and 160 or char_length(coalesce(p_body, '')) > 1000 then
    raise exception 'Titre de 2 à 160 caractères et message de 1000 caractères maximum.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if p_link is not null and (p_link !~ '^/\S*$' or length(p_link) > 301) then
    raise exception 'Le lien doit être un chemin interne commençant par « / ».' using errcode = '22023', hint = 'cyberpingo';
  end if;
  perform private.enforce_rate_limit('broadcast:' || actor::text, 10, interval '1 hour', 'Trop d’annonces envoyées. Réessaie plus tard.');
  insert into public.notifications (user_id, type, title, body, link)
  select p.id, 'system', btrim(p_title), coalesce(p_body, ''), p_link
  from public.profiles p
  where p_audience = 'all' or (p_audience = 'learners' and p.role = 'user') or (p_audience = 'staff' and p.role <> 'user');
  get diagnostics sent = row_count;
  perform private.log_admin('broadcast_notification', 'notification', null,
    jsonb_build_object('title', btrim(p_title), 'audience', p_audience, 'recipients', sent));
  return sent;
end $$;

-- ─── Realtime (admin supervision + learner notifications) ─────────────────────

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.activity_events, public.learner_sessions, public.notifications;
  end if;
exception when duplicate_object then
  null;
end $$;

-- ─── Privileges ───────────────────────────────────────────────────────────────

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function
  public.admin_overview(), public.admin_users(text, text, integer, integer), public.admin_user_detail(uuid),
  public.admin_set_role(uuid, text), public.admin_adjust_xp(uuid, integer, text),
  public.admin_get_quiz(uuid), public.admin_save_quiz(uuid, jsonb),
  public.admin_get_lab_flag(uuid), public.admin_set_lab_flag(uuid, text),
  public.admin_import_course(jsonb), public.admin_course_stats(uuid),
  public.admin_revoke_certificate(uuid, text), public.admin_restore_certificate(uuid),
  public.admin_broadcast_notification(text, text, text, text)
from public, anon;
grant execute on function
  public.admin_overview(), public.admin_users(text, text, integer, integer), public.admin_user_detail(uuid),
  public.admin_set_role(uuid, text), public.admin_adjust_xp(uuid, integer, text),
  public.admin_get_quiz(uuid), public.admin_save_quiz(uuid, jsonb),
  public.admin_get_lab_flag(uuid), public.admin_set_lab_flag(uuid, text),
  public.admin_import_course(jsonb), public.admin_course_stats(uuid),
  public.admin_revoke_certificate(uuid, text), public.admin_restore_certificate(uuid),
  public.admin_broadcast_notification(text, text, text, text)
to authenticated;
