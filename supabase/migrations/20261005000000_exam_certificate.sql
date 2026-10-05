-- CyberPingo · Examen final et délivrance du certificat (70 % requis)
--
-- Le certificat n’est plus délivré automatiquement à la fin des leçons :
-- 1. Terminer toutes les leçons et quiz d'un parcours marque le parcours comme terminé (enrollments.status = 'completed')
--    et débloque l'examen final de certification.
-- 2. L'examen tire au sort 25 questions réparties équitablement sur les modules du parcours, avec timer (40 min).
-- 3. Pour obtenir le certificat CyberPingo, l'apprenant doit réussir l'examen avec au moins 70 % de bonnes réponses.
-- 4. Les certificats existants restent valides.

-- ─── Configuration de l'examen sur les parcours ──────────────────────────────

alter table public.courses
  add column if not exists exam_pass_percentage integer not null default 70 check (exam_pass_percentage between 50 and 100),
  add column if not exists exam_duration_minutes integer not null default 40 check (exam_duration_minutes between 10 and 180),
  add column if not exists exam_question_count integer not null default 25 check (exam_question_count between 1 and 100);

-- ─── Tentatives d'examen ─────────────────────────────────────────────────────

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  score integer,
  total_questions integer not null default 25 check (total_questions > 0),
  percentage integer check (percentage is null or percentage between 0 and 100),
  passed boolean check (passed is null or (passed = (percentage >= pass_percentage))),
  pass_percentage integer not null default 70,
  module_breakdown jsonb default '[]'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'expired')),
  created_at timestamptz not null default now()
);

create index if not exists exam_attempts_user_course_idx on public.exam_attempts (user_id, course_id, started_at desc);
create index if not exists exam_attempts_expires_idx on public.exam_attempts (expires_at) where status = 'in_progress';

create table if not exists private.exam_attempt_keys (
  attempt_id uuid primary key references public.exam_attempts (id) on delete cascade,
  keys jsonb not null
);

-- ─── Extension des certificats ───────────────────────────────────────────────

alter table public.certificates
  add column if not exists exam_percentage integer check (exam_percentage is null or exam_percentage between 0 and 100),
  add column if not exists exam_attempt_id uuid references public.exam_attempts (id) on delete set null;

-- ─── Moteur : délivrance du certificat conditionnée à l'examen ───────────────

create or replace function private.issue_certificate(
  p_user uuid,
  p_course uuid,
  p_exam_attempt uuid default null,
  p_percentage integer default null
) returns public.certificates
language plpgsql security definer set search_path = '' as $$
declare
  cert public.certificates;
begin
  insert into public.certificates (user_id, course_id, recipient_name, course_title, exam_percentage, exam_attempt_id)
  select p.id, c.id, p.display_name, c.title, p_percentage, p_exam_attempt
  from public.profiles p, public.courses c
  where p.id = p_user and c.id = p_course
  on conflict (user_id, course_id) do update set
    exam_percentage = greatest(coalesce(public.certificates.exam_percentage, 0), coalesce(excluded.exam_percentage, 0)),
    exam_attempt_id = coalesce(excluded.exam_attempt_id, public.certificates.exam_attempt_id)
  returning * into cert;

  if cert.id is not null then
    perform private.notify(p_user, 'certificate', 'Certificat obtenu 🎓',
      'Félicitations ! Ton certificat « ' || cert.course_title || ' » est disponible et vérifiable publiquement.',
      '/certificat/' || cert.verification_code,
      jsonb_build_object('certificate_id', cert.id, 'verification_code', cert.verification_code, 'exam_percentage', cert.exam_percentage));
    perform private.log_activity(p_user, 'certificate', cert.id::text, 'Certificat : ' || cert.course_title, '/certificat/' || cert.verification_code);
  end if;
  return cert;
end $$;

-- Fin de parcours : marque le cours terminé, verse l'XP mais ne délivre pas le certificat directement.
create or replace function private.check_course_completion(p_user uuid, p_course uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.courses;
  enrollment_id uuid;
  enrollment_status text;
  total_lessons integer;
begin
  if p_course is null then
    return;
  end if;
  select id, status into enrollment_id, enrollment_status
  from public.enrollments where user_id = p_user and course_id = p_course for update;
  if enrollment_id is null or enrollment_status = 'completed' then
    return;
  end if;
  select count(*) into total_lessons from public.lessons where course_id = p_course;
  if total_lessons = 0
     or exists (
       select 1 from public.lessons l
       where l.course_id = p_course and not exists (
         select 1 from public.lesson_progress lp where lp.user_id = p_user and lp.lesson_id = l.id and lp.status = 'completed'))
     or exists (
       select 1 from public.quizzes q
       where q.course_id = p_course and not exists (
         select 1 from public.quiz_attempts a where a.user_id = p_user and a.quiz_id = q.id and a.passed)) then
    return;
  end if;

  select * into c from public.courses where id = p_course;
  update public.enrollments set status = 'completed', completed_at = now(), last_activity_at = now() where id = enrollment_id;
  perform private.award_xp(p_user, c.completion_xp, 'course_completed', 'course', c.id::text, 'Parcours terminé : ' || c.title);
  perform private.log_activity(p_user, 'course_complete', c.id::text, c.title, '/courses/' || c.slug, c.completion_xp);
  perform private.notify(p_user, 'course', 'Parcours terminé 🏆', 'Bravo, tu as terminé toutes les leçons de « ' || c.title || ' ». L’examen final de certification est désormais accessible !',
    '/courses/' || c.slug, jsonb_build_object('course_id', c.id));
end $$;

-- ─── RPCs de l'examen ────────────────────────────────────────────────────────

create or replace function public.get_course_exam_status(p_course_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  c public.courses;
  enrolled boolean;
  completed boolean;
  cert public.certificates;
  active_att public.exam_attempts;
  best_score integer;
  att_count integer;
begin
  select * into c from public.courses where id = p_course_id;
  if not found or (c.status <> 'published' and not public.is_admin()) then
    raise exception 'Parcours introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;

  select exists(select 1 from public.enrollments where user_id = uid and course_id = c.id),
         exists(select 1 from public.enrollments where user_id = uid and course_id = c.id and status = 'completed')
  into enrolled, completed;

  select * into cert from public.certificates where user_id = uid and course_id = c.id;

  select * into active_att from public.exam_attempts
  where user_id = uid and course_id = c.id and status = 'in_progress' and expires_at > now()
  order by started_at desc limit 1;

  select count(*), max(percentage) into att_count, best_score
  from public.exam_attempts
  where user_id = uid and course_id = c.id and status = 'completed';

  return jsonb_build_object(
    'course_id', c.id,
    'course_title', c.title,
    'course_slug', c.slug,
    'course_completed', coalesce(completed, false),
    'can_take_exam', (coalesce(completed, false) or public.is_admin()),
    'pass_percentage', c.exam_pass_percentage,
    'duration_minutes', c.exam_duration_minutes,
    'question_count', c.exam_question_count,
    'attempts_count', coalesce(att_count, 0),
    'best_percentage', best_score,
    'active_attempt', case when active_att.id is not null then jsonb_build_object(
      'id', active_att.id,
      'started_at', active_att.started_at,
      'expires_at', active_att.expires_at,
      'remaining_seconds', greatest(0, floor(extract(epoch from (active_att.expires_at - now())))::int),
      'total_questions', active_att.total_questions
    ) else null end,
    'certificate', case when cert.id is not null then jsonb_build_object(
      'id', cert.id,
      'certificate_number', cert.certificate_number,
      'verification_code', cert.verification_code,
      'issued_at', cert.issued_at,
      'exam_percentage', cert.exam_percentage,
      'is_revoked', cert.revoked_at is not null
    ) else null end
  );
end $$;

create or replace function public.start_course_exam(p_course_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  c public.courses;
  completed boolean;
  active_att public.exam_attempts;
  attempt_id uuid;
  limit_count integer;
  duration integer;
  exp timestamptz;
  q_row record;
  questions_client jsonb := '[]'::jsonb;
  keys_secret jsonb := '{}'::jsonb;
  options_arr jsonb;
  correct_ids uuid[];
  q_count integer := 0;
begin
  perform private.lock_profile(uid);
  select * into c from public.courses where id = p_course_id;
  if not found or (c.status <> 'published' and not public.is_admin()) then
    raise exception 'Ce parcours n’est pas disponible.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;

  select exists(select 1 from public.enrollments where user_id = uid and course_id = c.id and status = 'completed')
  into completed;
  if not completed and not public.is_admin() then
    raise exception 'Termine toutes les leçons et quiz du parcours avant de passer l’examen.' using errcode = '42501', hint = 'cyberpingo';
  end if;

  select * into active_att from public.exam_attempts
  where user_id = uid and course_id = c.id and status = 'in_progress' and expires_at > now()
  order by started_at desc limit 1;

  if active_att.id is not null then
    return jsonb_build_object(
      'attempt_id', active_att.id,
      'started_at', active_att.started_at,
      'expires_at', active_att.expires_at,
      'remaining_seconds', greatest(0, floor(extract(epoch from (active_att.expires_at - now())))::int),
      'duration_minutes', c.exam_duration_minutes,
      'pass_percentage', c.exam_pass_percentage,
      'total_questions', active_att.total_questions,
      'questions', active_att.questions
    );
  end if;

  update public.exam_attempts set status = 'expired'
  where user_id = uid and course_id = c.id and status = 'in_progress' and expires_at <= now();

  perform private.enforce_rate_limit('exam:' || uid::text || ':' || c.id::text, 10, interval '12 hours',
    'Trop de tentatives d’examen récentes. Prends le temps de réviser avant de retenter.');

  limit_count := coalesce(c.exam_question_count, 25);
  duration := coalesce(c.exam_duration_minutes, 40);
  exp := now() + (duration || ' minutes')::interval;

  for q_row in
    with available_q as (
      select qq.id, qq.question_type, qq.prompt, qq.image_url, qq.explanation,
             m.id as module_id, m.title as module_title,
             row_number() over (partition by m.id order by random()) as module_rank
      from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      join public.course_modules m on m.id = q.module_id
      where q.course_id = c.id
    )
    select * from available_q
    order by module_rank, random()
    limit limit_count
  loop
    q_count := q_count + 1;
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'label', a.label) order by random()), '[]'::jsonb),
           coalesce(array_agg(a.id) filter (where a.is_correct), '{}')
    into options_arr, correct_ids
    from public.quiz_answers a where a.question_id = q_row.id;

    questions_client := questions_client || jsonb_build_array(jsonb_build_object(
      'id', q_row.id,
      'prompt', q_row.prompt,
      'question_type', q_row.question_type,
      'image_url', q_row.image_url,
      'module_id', q_row.module_id,
      'module_title', q_row.module_title,
      'options', options_arr
    ));

    keys_secret := keys_secret || jsonb_build_object(
      q_row.id::text, jsonb_build_object(
        'correct', to_jsonb(correct_ids),
        'explanation', q_row.explanation,
        'module_id', q_row.module_id,
        'module_title', q_row.module_title
      )
    );
  end loop;

  if q_count = 0 then
    raise exception 'Ce parcours ne dispose pas encore d’assez de questions pour l’examen.' using errcode = '22023', hint = 'cyberpingo';
  end if;

  insert into public.exam_attempts (user_id, course_id, started_at, expires_at, total_questions, pass_percentage, questions, status)
  values (uid, c.id, now(), exp, q_count, c.exam_pass_percentage, questions_client, 'in_progress')
  returning id into attempt_id;

  insert into private.exam_attempt_keys (attempt_id, keys) values (attempt_id, keys_secret);

  return jsonb_build_object(
    'attempt_id', attempt_id,
    'started_at', now(),
    'expires_at', exp,
    'remaining_seconds', duration * 60,
    'duration_minutes', duration,
    'pass_percentage', c.exam_pass_percentage,
    'total_questions', q_count,
    'questions', questions_client
  );
end $$;

create or replace function public.submit_course_exam(p_attempt_id uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  me public.profiles;
  att public.exam_attempts;
  keys_row private.exam_attempt_keys;
  c public.courses;
  q record;
  given jsonb;
  selected uuid[];
  expected uuid[];
  is_right boolean;
  v_score integer := 0;
  v_total integer := 0;
  v_percentage integer;
  v_passed boolean;
  mod_scores jsonb := '{}'::jsonb;
  mod_totals jsonb := '{}'::jsonb;
  mod_titles jsonb := '{}'::jsonb;
  v_breakdown jsonb := '[]'::jsonb;
  v_results jsonb := '[]'::jsonb;
  cert public.certificates;
  k record;
  mod_key text;
begin
  me := private.lock_profile(uid);
  select * into att from public.exam_attempts where id = p_attempt_id and user_id = uid for update;
  if not found then
    raise exception 'Tentative d’examen introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  if att.status <> 'in_progress' then
    raise exception 'Cet examen a déjà été soumis ou a expiré.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if now() > att.expires_at + interval '2 minutes' then
    update public.exam_attempts set status = 'expired' where id = att.id;
    raise exception 'Le temps alloué pour cet examen est écoulé.' using errcode = '22023', hint = 'cyberpingo';
  end if;

  select * into keys_row from private.exam_attempt_keys where attempt_id = att.id;
  select * into c from public.courses where id = att.course_id;

  for q in select * from jsonb_array_elements(att.questions) loop
    v_total := v_total + 1;
    given := coalesce(p_answers -> (q.value ->> 'id'), '[]'::jsonb);
    select coalesce(array_agg(value::uuid), '{}') into selected
    from jsonb_array_elements_text(case jsonb_typeof(given)
      when 'array' then given when 'string' then jsonb_build_array(given) else '[]'::jsonb end);

    select coalesce(array_agg(value::uuid), '{}') into expected
    from jsonb_array_elements_text(keys_row.keys -> (q.value ->> 'id') -> 'correct');

    is_right := cardinality(selected) > 0 and selected = expected;
    if is_right then
      v_score := v_score + 1;
    end if;

    mod_key := keys_row.keys -> (q.value ->> 'id') ->> 'module_id';
    mod_titles := mod_titles || jsonb_build_object(mod_key, keys_row.keys -> (q.value ->> 'id') ->> 'module_title');
    mod_totals := mod_totals || jsonb_build_object(mod_key, coalesce((mod_totals ->> mod_key)::int, 0) + 1);
    mod_scores := mod_scores || jsonb_build_object(mod_key, coalesce((mod_scores ->> mod_key)::int, 0) + case when is_right then 1 else 0 end);

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'question_id', q.value ->> 'id',
      'prompt', q.value ->> 'prompt',
      'correct', is_right,
      'selected', to_jsonb(selected),
      'correct_answers', to_jsonb(expected),
      'explanation', keys_row.keys -> (q.value ->> 'id') ->> 'explanation'
    ));
  end loop;

  v_percentage := floor(100.0 * v_score / greatest(v_total, 1))::integer;
  v_passed := v_percentage >= att.pass_percentage;

  for k in select * from jsonb_each_text(mod_totals) loop
    v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
      'module_id', k.key,
      'module_title', mod_titles ->> k.key,
      'score', coalesce((mod_scores ->> k.key)::int, 0),
      'total', k.value::int
    ));
  end loop;

  update public.exam_attempts set
    score = v_score,
    total_questions = v_total,
    percentage = v_percentage,
    passed = v_passed,
    answers = p_answers,
    module_breakdown = v_breakdown,
    status = 'completed',
    submitted_at = now()
  where id = att.id;

  if v_passed then
    cert := private.issue_certificate(uid, att.course_id, att.id, v_percentage);
  end if;

  return jsonb_build_object(
    'attempt_id', att.id,
    'score', v_score,
    'total_questions', v_total,
    'percentage', v_percentage,
    'passed', v_passed,
    'pass_percentage', att.pass_percentage,
    'module_breakdown', v_breakdown,
    'certificate', case when cert.id is not null then jsonb_build_object(
      'id', cert.id,
      'certificate_number', cert.certificate_number,
      'verification_code', cert.verification_code,
      'issued_at', cert.issued_at,
      'exam_percentage', cert.exam_percentage
    ) else null end,
    'results', v_results
  );
end $$;

-- ─── Vérification publique enrichie avec le score d'examen ───────────────────

create or replace function public.verify_certificate(p_code text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_build_object(
      'found', true,
      'valid', ce.revoked_at is null,
      'certificate_number', ce.certificate_number,
      'verification_code', ce.verification_code,
      'recipient_name', ce.recipient_name,
      'course_title', ce.course_title,
      'course_slug', (select c.slug from public.courses c where c.id = ce.course_id and c.status = 'published'),
      'issued_at', ce.issued_at,
      'revoked_at', ce.revoked_at,
      'revoked_reason', ce.revoked_reason,
      'exam_percentage', ce.exam_percentage)
    from public.certificates ce
    where ce.verification_code = upper(btrim(coalesce(p_code, '')))
  ), jsonb_build_object('found', false, 'valid', false));
$$;

-- ─── Sécurité et permissions ─────────────────────────────────────────────────

alter table public.exam_attempts enable row level security;
alter table private.exam_attempt_keys enable row level security;

create policy "Own exam attempts or staff" on public.exam_attempts
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

revoke all on public.exam_attempts from anon, authenticated;
revoke all on private.exam_attempt_keys from anon, authenticated;
grant select on public.exam_attempts to authenticated;

revoke execute on function
  public.get_course_exam_status(uuid),
  public.start_course_exam(uuid),
  public.submit_course_exam(uuid, jsonb)
from public, anon;

grant execute on function
  public.get_course_exam_status(uuid),
  public.start_course_exam(uuid),
  public.submit_course_exam(uuid, jsonb)
to authenticated;

grant execute on function public.verify_certificate(text) to anon, authenticated;
