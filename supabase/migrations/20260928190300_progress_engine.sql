-- CyberPingo · Phase 2–5 — Progress engine
-- Enrollments, lesson progress, quiz attempts and lab completions, plus every server-side rule
-- that turns learning activity into rewards. Each public function runs in ONE transaction:
--
--   validate caller → validate content & access → record progress → XP ledger → streak & daily
--   activity → course completion & certificate → badges → daily goal → challenges → summary
--
-- If any step fails the whole call is rolled back, so progress can never be half-recorded.

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed')),
  last_lesson_id uuid references public.lessons (id) on delete set null,
  enrolled_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id),
  check ((status = 'completed') = (completed_at is not null))
);
create index enrollments_course_idx on public.enrollments (course_id, status);
create index enrollments_user_idx on public.enrollments (user_id, last_activity_at desc);

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('not_started', 'in_progress', 'completed')),
  progress_percentage integer not null default 0 check (progress_percentage between 0 and 100),
  started_at timestamptz,
  completed_at timestamptz,
  last_viewed_at timestamptz not null default now(),
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  primary key (user_id, lesson_id),
  check (status <> 'completed' or (completed_at is not null and progress_percentage = 100))
);
create index lesson_progress_course_idx on public.lesson_progress (user_id, course_id, status);
create index lesson_progress_lesson_idx on public.lesson_progress (lesson_id);
create index lesson_progress_completed_idx on public.lesson_progress (completed_at desc) where status = 'completed';

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  -- {question_id: [answer_id…]} as graded (unknown ids are dropped before storage).
  answers jsonb not null default '{}'::jsonb,
  score integer not null check (score >= 0),
  total integer not null check (total > 0 and score <= total),
  percentage integer not null check (percentage between 0 and 100),
  passed boolean not null,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  created_at timestamptz not null default now()
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id, quiz_id, created_at desc);
create index quiz_attempts_quiz_idx on public.quiz_attempts (quiz_id);
create index quiz_attempts_created_idx on public.quiz_attempts (created_at desc);

create table public.lab_completions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lab_id uuid not null references public.labs (id) on delete cascade,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  completed_at timestamptz not null default now(),
  primary key (user_id, lab_id)
);
create index lab_completions_lab_idx on public.lab_completions (lab_id);

-- Learners keep access to courses they started, even after the course is archived.
create policy "Enrolled learners keep archived courses" on public.courses
  for select to authenticated using (
    status = 'archived' and id in (select course_id from public.enrollments where user_id = (select auth.uid()))
  );

-- Per-course progress for the current user (or every user for staff), computed on read.
create view public.course_progress with (security_invoker = true) as
select
  e.user_id, e.course_id, e.status, e.enrolled_at, e.completed_at, e.last_lesson_id, e.last_activity_at,
  counts.total_lessons, counts.completed_lessons, counts.total_quizzes, counts.passed_quizzes,
  case when counts.total_lessons + counts.total_quizzes = 0 then 0
       else floor(100.0 * (counts.completed_lessons + counts.passed_quizzes) / (counts.total_lessons + counts.total_quizzes))::integer
  end as progress_percentage
from public.enrollments e
cross join lateral (
  select
    (select count(*) from public.lessons l where l.course_id = e.course_id)::integer as total_lessons,
    (select count(*) from public.lesson_progress lp
      where lp.user_id = e.user_id and lp.course_id = e.course_id and lp.status = 'completed')::integer as completed_lessons,
    (select count(*) from public.quizzes q where q.course_id = e.course_id)::integer as total_quizzes,
    (select count(distinct a.quiz_id) from public.quiz_attempts a
      where a.user_id = e.user_id and a.course_id = e.course_id and a.passed)::integer as passed_quizzes
) counts;

-- ─── Engine helpers (private) ─────────────────────────────────────────────────

-- 'learner' when the caller may record progress, 'preview' for staff looking at unpublished content.
create function private.course_mode(p_user uuid, p_course uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  c_status text;
  c_access text;
  enrolled boolean;
begin
  select status, access_level into c_status, c_access from public.courses where id = p_course;
  if not found then
    raise exception 'Cours introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  enrolled := exists (select 1 from public.enrollments where user_id = p_user and course_id = p_course);
  if c_status = 'published' then
    if c_access <> 'free' and not enrolled and not public.is_admin() then
      raise exception 'Ce parcours n’est pas encore accessible avec ton compte.' using errcode = '42501', hint = 'cyberpingo';
    end if;
    return 'learner';
  end if;
  if c_status = 'archived' and enrolled then
    return 'learner';
  end if;
  if public.is_admin() then
    return 'preview';
  end if;
  raise exception 'Ce cours n’est pas disponible.' using errcode = '42501', hint = 'cyberpingo';
end $$;

create function private.ensure_enrollment(p_user uuid, p_course uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c_title text;
  c_slug text;
begin
  insert into public.enrollments (user_id, course_id) values (p_user, p_course) on conflict (user_id, course_id) do nothing;
  if found then
    select title, slug into c_title, c_slug from public.courses where id = p_course;
    perform private.log_activity(p_user, 'enroll', p_course::text, 'Inscription : ' || c_title, '/courses/' || c_slug);
  end if;
end $$;

create function private.level_info(p_xp integer) returns jsonb
language sql stable security definer set search_path = '' as $$
  with cur as (
    select level, required_xp, title from public.levels where required_xp <= greatest(p_xp, 0) order by level desc limit 1
  ), nxt as (
    select level, required_xp, title from public.levels where required_xp > greatest(p_xp, 0) order by level limit 1
  )
  select jsonb_build_object(
    'xp', p_xp,
    'level', cur.level,
    'title', cur.title,
    'current_level_xp', cur.required_xp,
    'next_level', nxt.level,
    'next_level_xp', nxt.required_xp,
    'next_title', nxt.title,
    'progress_percentage', case when nxt.required_xp is null then 100
      else floor(100.0 * (p_xp - cur.required_xp) / (nxt.required_xp - cur.required_xp))::integer end
  )
  from cur left join nxt on true;
$$;

create function private.effective_streak(p_user uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select case when p.last_activity_date >= private.user_today(p_user) - 1 then p.current_streak else 0 end
  from public.profiles p where p.id = p_user;
$$;

-- Adds XP through the ledger (the ledger trigger updates profiles.xp / level). One-shot reasons
-- are protected by a unique index: a duplicate silently awards nothing.
create function private.award_xp(p_user uuid, p_amount integer, p_reason text, p_ref_type text, p_ref_id text, p_label text) returns integer
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(p_amount, 0) <= 0 then
    return 0;
  end if;
  insert into public.xp_transactions (user_id, amount, reason, reference_type, reference_id, label)
  values (p_user, p_amount, p_reason, p_ref_type, p_ref_id, left(coalesce(p_label, ''), 200))
  on conflict do nothing;
  if not found then
    return 0;
  end if;
  -- Challenge rewards do not count toward "earn X XP" challenges (no self-feeding loop).
  if p_reason not in ('challenge_completed', 'admin_adjustment') then
    insert into public.daily_activity as da (user_id, activity_date, xp_earned)
    values (p_user, private.user_today(p_user), p_amount)
    on conflict (user_id, activity_date) do update set xp_earned = da.xp_earned + excluded.xp_earned;
  end if;
  return p_amount;
end $$;

-- Daily counters and the streak, both in the learner's own timezone.
create function private.record_activity(p_user uuid, p_lessons integer, p_quizzes integer, p_labs integer, p_minutes integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  today date := private.user_today(p_user);
  last_day date;
  streak integer;
  best integer;
begin
  insert into public.daily_activity as da (user_id, activity_date, lessons_completed, quizzes_passed, labs_solved, study_minutes)
  values (p_user, today, p_lessons, p_quizzes, p_labs, p_minutes)
  on conflict (user_id, activity_date) do update set
    lessons_completed = da.lessons_completed + excluded.lessons_completed,
    quizzes_passed = da.quizzes_passed + excluded.quizzes_passed,
    labs_solved = da.labs_solved + excluded.labs_solved,
    study_minutes = da.study_minutes + excluded.study_minutes;

  select last_activity_date, current_streak, longest_streak into last_day, streak, best
  from public.profiles where id = p_user for update;
  -- Same local day (or a later one after a timezone change): the streak is already counted.
  if last_day is not null and last_day >= today then
    update public.profiles set last_activity_at = now() where id = p_user;
    return;
  end if;
  streak := case when last_day = today - 1 then streak + 1 else 1 end;
  update public.profiles set
    current_streak = streak,
    longest_streak = greatest(best, streak),
    last_activity_date = today,
    last_activity_at = now()
  where id = p_user;
  if streak in (3, 7, 14, 30, 50, 100, 200, 365) then
    perform private.notify(p_user, 'streak', streak || ' jours de série 🔥',
      'Tu as appris ' || streak || ' jours d’affilée. Ne casse pas la chaîne !', '/progression',
      jsonb_build_object('streak', streak));
  end if;
end $$;

create function private.issue_certificate(p_user uuid, p_course uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cert public.certificates;
begin
  insert into public.certificates (user_id, course_id, recipient_name, course_title)
  select p.id, c.id, p.display_name, c.title
  from public.profiles p, public.courses c
  where p.id = p_user and c.id = p_course
  on conflict (user_id, course_id) do nothing
  returning * into cert;
  if cert.id is not null then
    perform private.notify(p_user, 'certificate', 'Certificat obtenu 🎓',
      'Ton certificat « ' || cert.course_title || ' » est disponible et vérifiable publiquement.',
      '/certificat/' || cert.verification_code,
      jsonb_build_object('certificate_id', cert.id, 'verification_code', cert.verification_code));
    perform private.log_activity(p_user, 'certificate', cert.id::text, 'Certificat : ' || cert.course_title, '/certificat/' || cert.verification_code);
  end if;
end $$;

-- A course is complete when every lesson is completed and every quiz has been passed once.
create function private.check_course_completion(p_user uuid, p_course uuid) returns void
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
  perform private.notify(p_user, 'course', 'Parcours terminé 🏆', 'Bravo, tu as terminé « ' || c.title || ' ».',
    '/courses/' || c.slug, jsonb_build_object('course_id', c.id));
  if c.certificate_enabled then
    perform private.issue_certificate(p_user, c.id);
  end if;
end $$;

create function private.evaluate_badges(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  b public.badges;
  me public.profiles;
  metric integer;
  awarded boolean := true;
  rounds integer := 0;
begin
  -- Badge XP can unlock an XP badge, hence a (bounded) second pass.
  while awarded and rounds < 3 loop
    awarded := false;
    rounds := rounds + 1;
    select * into me from public.profiles where id = p_user;
    for b in
      select bd.* from public.badges bd
      where bd.is_active and not exists (select 1 from public.user_badges ub where ub.user_id = p_user and ub.badge_id = bd.id)
      order by bd.position, bd.created_at
    loop
      metric := case b.criteria_type
        when 'lessons_completed' then (select count(*) from public.lesson_progress where user_id = p_user and status = 'completed')
        when 'quizzes_passed' then (select count(distinct quiz_id) from public.quiz_attempts where user_id = p_user and passed)
        when 'courses_completed' then (select count(*) from public.enrollments where user_id = p_user and status = 'completed')
        when 'streak_days' then me.longest_streak
        when 'xp_total' then me.xp
        when 'labs_solved' then (select count(*) from public.lab_completions where user_id = p_user)
        when 'certificates_earned' then (select count(*) from public.certificates where user_id = p_user and revoked_at is null)
        when 'course_completed' then (select count(*) from public.enrollments
          where user_id = p_user and course_id = b.criteria_course_id and status = 'completed')
        else 0
      end;
      if metric >= b.criteria_value then
        insert into public.user_badges (user_id, badge_id) values (p_user, b.id) on conflict do nothing;
        if found then
          awarded := true;
          perform private.award_xp(p_user, b.xp_reward, 'achievement', 'badge', b.id::text, 'Badge : ' || b.name);
          perform private.notify(p_user, 'achievement', 'Nouveau badge débloqué 🎉', b.name || ' — ' || b.description,
            '/profile', jsonb_build_object('badge_id', b.id, 'slug', b.slug, 'icon', b.icon));
          perform private.log_activity(p_user, 'badge_earned', b.id::text, 'Badge : ' || b.name, null, b.xp_reward);
        end if;
      end if;
    end loop;
  end loop;
end $$;

create function private.check_daily_goal(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  today date := private.user_today(p_user);
  goal_minutes integer := (select p.daily_minutes from public.profiles p where p.id = p_user);
  studied integer := coalesce((select da.study_minutes from public.daily_activity da where da.user_id = p_user and da.activity_date = today), 0);
begin
  if studied >= goal_minutes and private.award_xp(p_user, 20, 'daily_goal', 'day', today::text, 'Objectif quotidien atteint') > 0 then
    perform private.notify(p_user, 'achievement', 'Objectif du jour atteint ✅',
      goal_minutes || ' minutes d’apprentissage aujourd’hui : +20 XP.', '/dashboard', jsonb_build_object('date', today));
  end if;
end $$;

create function private.challenge_period_start(p_user uuid, p_period text, p_starts_at timestamptz) returns date
language plpgsql stable security definer set search_path = '' as $$
declare
  today date := private.user_today(p_user);
  zone text := coalesce((select timezone from public.user_settings where user_id = p_user), 'UTC');
begin
  return case p_period
    when 'daily' then today
    when 'weekly' then date_trunc('week', today::timestamp)::date
    else coalesce((p_starts_at at time zone zone)::date, date '2000-01-01')
  end;
end $$;

create function private.challenge_progress(p_user uuid, p_metric text, p_from date) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(case p_metric
    when 'lessons_completed' then lessons_completed
    when 'quizzes_passed' then quizzes_passed
    when 'xp_earned' then xp_earned
    when 'study_minutes' then study_minutes
    when 'labs_solved' then labs_solved
    else 0 end), 0)::integer
  from public.daily_activity
  where user_id = p_user and activity_date >= p_from and activity_date <= private.user_today(p_user);
$$;

create function private.refresh_challenges(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.challenges;
  start_day date;
  amount integer;
  already_done boolean;
begin
  for c in
    select * from public.challenges
    where is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
    order by position
  loop
    start_day := private.challenge_period_start(p_user, c.period, c.starts_at);
    amount := private.challenge_progress(p_user, c.metric, start_day);
    continue when amount = 0;
    select completed_at is not null into already_done from public.user_challenges
    where user_id = p_user and challenge_id = c.id and period_start = start_day for update;
    continue when coalesce(already_done, false);
    insert into public.user_challenges as uc (user_id, challenge_id, period_start, progress)
    values (p_user, c.id, start_day, least(amount, c.target))
    on conflict (user_id, challenge_id, period_start) do update set progress = excluded.progress, updated_at = now();
    if amount >= c.target then
      update public.user_challenges set completed_at = now(), xp_awarded = c.xp_reward
      where user_id = p_user and challenge_id = c.id and period_start = start_day;
      perform private.award_xp(p_user, c.xp_reward, 'challenge_completed', 'challenge', c.id::text || ':' || start_day::text, 'Défi : ' || c.title);
      perform private.notify(p_user, 'challenge', 'Défi relevé 🎯', c.title || ' : +' || c.xp_reward || ' XP.', '/dashboard',
        jsonb_build_object('challenge_id', c.id, 'period_start', start_day));
      perform private.log_activity(p_user, 'challenge_complete', c.id::text, 'Défi : ' || c.title, null, c.xp_reward);
    end if;
  end loop;
end $$;

create function private.after_progress(p_user uuid, p_course uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_course_completion(p_user, p_course);
  perform private.evaluate_badges(p_user);
  perform private.check_daily_goal(p_user);
  perform private.refresh_challenges(p_user);
  perform private.evaluate_badges(p_user);
end $$;

-- Rewards granted during the current transaction (now() is the transaction timestamp).
create function private.reward_summary(p_user uuid, p_xp_before integer, p_level_before integer) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'xp_gained', p.xp - p_xp_before,
    'level_info', private.level_info(p.xp),
    'leveled_up', p.level > p_level_before,
    'current_streak', private.effective_streak(p.id),
    'longest_streak', p.longest_streak,
    'new_badges', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'slug', b.slug, 'name', b.name, 'description', b.description, 'icon', b.icon) order by b.position)
      from public.user_badges ub join public.badges b on b.id = ub.badge_id
      where ub.user_id = p.id and ub.earned_at = now()), '[]'::jsonb),
    'completed_challenges', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'xp_reward', uc.xp_awarded) order by c.position)
      from public.user_challenges uc join public.challenges c on c.id = uc.challenge_id
      where uc.user_id = p.id and uc.completed_at = now()), '[]'::jsonb),
    'course_completed', (
      select jsonb_build_object('id', c.id, 'slug', c.slug, 'title', c.title)
      from public.enrollments e join public.courses c on c.id = e.course_id
      where e.user_id = p.id and e.completed_at = now() limit 1),
    'certificate', (
      select jsonb_build_object('id', ce.id, 'certificate_number', ce.certificate_number,
        'verification_code', ce.verification_code, 'course_title', ce.course_title)
      from public.certificates ce where ce.user_id = p.id and ce.issued_at = now() limit 1)
  )
  from public.profiles p where p.id = p_user;
$$;

create function private.next_lesson(p_lesson uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  with ordered as (
    select l.id, row_number() over (order by m.position, m.created_at, l.position, l.created_at) as rank
    from public.lessons l join public.course_modules m on m.id = l.module_id
    where l.course_id = (select course_id from public.lessons where id = p_lesson)
  )
  select o.id from ordered o
  where o.rank = (select rank + 1 from ordered where id = p_lesson);
$$;

-- ─── Learner RPCs ─────────────────────────────────────────────────────────────

create function public.enroll_in_course(p_course_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  if private.course_mode(uid, p_course_id) <> 'learner' then
    raise exception 'Publie le cours avant de t’y inscrire.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  perform private.ensure_enrollment(uid, p_course_id);
  return (select to_jsonb(cp) from public.course_progress cp where cp.user_id = uid and cp.course_id = p_course_id);
end $$;

create function public.start_lesson(p_lesson_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  l public.lessons;
  progress public.lesson_progress;
begin
  select * into l from public.lessons where id = p_lesson_id;
  if not found then
    raise exception 'Leçon introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  if private.course_mode(uid, l.course_id) = 'preview' then
    return jsonb_build_object('preview', true, 'status', 'not_started', 'progress_percentage', 0, 'min_seconds', 15);
  end if;
  perform private.ensure_enrollment(uid, l.course_id);
  insert into public.lesson_progress as lp (user_id, lesson_id, course_id, status, started_at, last_viewed_at)
  values (uid, l.id, l.course_id, 'in_progress', now(), now())
  on conflict (user_id, lesson_id) do update set
    last_viewed_at = now(),
    started_at = coalesce(lp.started_at, now()),
    status = case when lp.status = 'not_started' then 'in_progress' else lp.status end
  returning * into progress;
  update public.enrollments set last_lesson_id = l.id, last_activity_at = now() where user_id = uid and course_id = l.course_id;
  if progress.started_at = now() then
    perform private.log_activity(uid, 'lesson_start', l.id::text, l.title, '/lessons/' || l.id);
  end if;
  return jsonb_build_object(
    'preview', false, 'status', progress.status, 'progress_percentage', progress.progress_percentage,
    'started_at', progress.started_at, 'completed_at', progress.completed_at, 'min_seconds', 15
  );
end $$;

create function public.save_lesson_progress(p_lesson_id uuid, p_percentage integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  -- 100 % is only reachable through complete_lesson().
  update public.lesson_progress set
    progress_percentage = greatest(progress_percentage, least(greatest(coalesce(p_percentage, 0), 0), 99)),
    last_viewed_at = now()
  where user_id = uid and lesson_id = p_lesson_id and status = 'in_progress';
end $$;

create function public.complete_lesson(p_lesson_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  me public.profiles;
  l public.lessons;
  progress public.lesson_progress;
  minutes integer;
begin
  me := private.lock_profile(uid);
  select * into l from public.lessons where id = p_lesson_id;
  if not found then
    raise exception 'Leçon introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  if private.course_mode(uid, l.course_id) = 'preview' then
    return jsonb_build_object('preview', true, 'lesson_id', l.id, 'next_lesson_id', private.next_lesson(l.id));
  end if;
  select * into progress from public.lesson_progress where user_id = uid and lesson_id = l.id for update;
  if not found or progress.started_at is null then
    raise exception 'Ouvre la leçon avant de la valider.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if progress.status = 'completed' then
    return private.reward_summary(uid, me.xp, me.level)
      || jsonb_build_object('already_completed', true, 'xp_awarded', 0, 'lesson_id', l.id, 'next_lesson_id', private.next_lesson(l.id));
  end if;
  if progress.started_at > now() - interval '15 seconds' then
    raise exception 'Prends le temps de parcourir la leçon avant de la valider.' using errcode = '22023', hint = 'cyberpingo';
  end if;

  minutes := least(l.duration_minutes, greatest(1, ceil(extract(epoch from now() - progress.started_at) / 60)::integer));
  update public.lesson_progress set
    status = 'completed', progress_percentage = 100, completed_at = now(), last_viewed_at = now(), xp_awarded = l.xp_reward
  where user_id = uid and lesson_id = l.id;
  update public.enrollments set last_lesson_id = l.id, last_activity_at = now() where user_id = uid and course_id = l.course_id;
  perform private.award_xp(uid, l.xp_reward, 'lesson_completed', 'lesson', l.id::text, 'Leçon : ' || l.title);
  perform private.record_activity(uid, 1, 0, 0, minutes);
  perform private.log_activity(uid, 'lesson_complete', l.id::text, l.title, '/lessons/' || l.id, l.xp_reward);
  perform private.after_progress(uid, l.course_id);
  return private.reward_summary(uid, me.xp, me.level)
    || jsonb_build_object('already_completed', false, 'xp_awarded', l.xp_reward, 'lesson_id', l.id, 'next_lesson_id', private.next_lesson(l.id));
end $$;

-- p_answers: {"<question id>": ["<answer id>", …]} (a single id string is accepted too).
create function public.submit_quiz(p_quiz_id uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  me public.profiles;
  q public.quizzes;
  preview boolean;
  question record;
  given jsonb;
  selected uuid[];
  expected uuid[];
  is_right boolean;
  score integer := 0;
  total integer := 0;
  earned integer := 0;
  graded jsonb := '{}'::jsonb;
  results jsonb := '[]'::jsonb;
  percentage integer;
  passed boolean;
  previous_xp integer;
  award integer := 0;
  counts_today boolean := false;
  attempt_id uuid;
  zone text;
begin
  me := private.lock_profile(uid);
  select * into q from public.quizzes where id = p_quiz_id;
  if not found then
    raise exception 'Quiz introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  preview := private.course_mode(uid, q.course_id) = 'preview';
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or pg_column_size(p_answers) > 65536 then
    raise exception 'Réponses invalides.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if not preview then
    perform private.enforce_rate_limit('quiz:' || uid::text, 30, interval '10 minutes', 'Trop de tentatives. Fais une pause de quelques minutes.');
  end if;

  for question in
    select qq.id, qq.xp_reward, qq.explanation from public.quiz_questions qq where qq.quiz_id = q.id order by qq.position, qq.id
  loop
    total := total + 1;
    given := p_answers -> question.id::text;
    select coalesce(array_agg(a.id order by a.position, a.id), '{}') into selected
    from public.quiz_answers a
    where a.question_id = question.id and a.id::text in (
      select value from jsonb_array_elements_text(case jsonb_typeof(given)
        when 'array' then given when 'string' then jsonb_build_array(given) else '[]'::jsonb end));
    select coalesce(array_agg(a.id order by a.position, a.id), '{}') into expected
    from public.quiz_answers a where a.question_id = question.id and a.is_correct;
    is_right := cardinality(selected) > 0 and selected = expected;
    if is_right then
      score := score + 1;
      earned := earned + question.xp_reward;
    end if;
    graded := graded || jsonb_build_object(question.id::text, to_jsonb(selected));
    results := results || jsonb_build_array(jsonb_build_object(
      'question_id', question.id, 'correct', is_right, 'selected', to_jsonb(selected),
      'correct_answer_ids', to_jsonb(expected), 'explanation', question.explanation));
  end loop;
  if total = 0 then
    raise exception 'Ce quiz ne contient encore aucune question.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  percentage := floor(100.0 * score / total)::integer;
  passed := percentage >= q.pass_percentage;

  if preview then
    return jsonb_build_object('preview', true, 'score', score, 'total', total, 'percentage', percentage,
      'passed', passed, 'pass_percentage', q.pass_percentage, 'xp_awarded', 0, 'results', results);
  end if;

  perform private.ensure_enrollment(uid, q.course_id);
  -- Only the improvement over the best previous reward is granted: replaying a quiz can't farm XP.
  select coalesce(sum(amount), 0) into previous_xp from public.xp_transactions
  where user_id = uid and reason = 'quiz_completed' and reference_id = q.id::text;
  if passed then
    award := greatest(0, earned - previous_xp);
    zone := coalesce((select timezone from public.user_settings where user_id = uid), 'UTC');
    -- Daily/weekly quiz challenges count each quiz at most once per day.
    counts_today := not exists (
      select 1 from public.quiz_attempts qa
      where qa.user_id = uid and qa.quiz_id = q.id and qa.passed and (qa.created_at at time zone zone)::date = private.user_today(uid));
  end if;
  insert into public.quiz_attempts (user_id, quiz_id, course_id, answers, score, total, percentage, passed, xp_awarded)
  values (uid, q.id, q.course_id, graded, score, total, percentage, passed, award)
  returning id into attempt_id;
  perform private.award_xp(uid, award, 'quiz_completed', 'quiz', q.id::text, 'Quiz : ' || q.title);
  perform private.record_activity(uid, 0, case when counts_today then 1 else 0 end, 0, 0);
  update public.enrollments set last_activity_at = now() where user_id = uid and course_id = q.course_id;
  perform private.log_activity(uid, 'quiz_complete', q.id::text, q.title || ' — ' || percentage || ' %', '/quiz/' || q.id, award);
  perform private.after_progress(uid, q.course_id);

  return private.reward_summary(uid, me.xp, me.level) || jsonb_build_object(
    'preview', false, 'attempt_id', attempt_id, 'score', score, 'total', total, 'percentage', percentage,
    'passed', passed, 'pass_percentage', q.pass_percentage, 'xp_awarded', award,
    'best_percentage', (select max(a.percentage) from public.quiz_attempts a where a.user_id = uid and a.quiz_id = q.id),
    'results', results);
end $$;

create function public.submit_lab(p_lab_id uuid, p_answer text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  me public.profiles;
  lab public.labs;
  expected text;
  attempt_key text;
  wrong_recent integer;
  max_wrong constant integer := 10;
begin
  me := private.lock_profile(uid);
  select * into lab from public.labs where id = p_lab_id;
  if not found or (lab.status <> 'published' and not public.is_admin()) then
    raise exception 'Ce lab n’est pas disponible.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  if p_answer is null or char_length(btrim(p_answer)) = 0 or char_length(p_answer) > 300 then
    raise exception 'Saisis une réponse (300 caractères maximum).' using errcode = '22023', hint = 'cyberpingo';
  end if;
  select flag into expected from private.lab_flags where lab_id = lab.id;
  if expected is null then
    raise exception 'Ce lab n’a pas encore de réponse configurée.' using errcode = '22023', hint = 'cyberpingo';
  end if;

  -- Budget checked BEFORE comparing, so a blocked request reveals nothing about the answer.
  attempt_key := 'lab:' || uid::text || ':' || lab.id::text;
  select count(*) into wrong_recent from private.rate_events where key = attempt_key and created_at > now() - interval '10 minutes';
  if wrong_recent >= max_wrong then
    raise exception 'Trop de tentatives sur ce lab. Réessaie dans quelques minutes.' using errcode = 'PT429', hint = 'cyberpingo';
  end if;
  if lower(regexp_replace(btrim(p_answer), '\s+', ' ', 'g')) <> lower(regexp_replace(btrim(expected), '\s+', ' ', 'g')) then
    insert into private.rate_events (key) values (attempt_key);
    return jsonb_build_object('correct', false, 'remaining_attempts', max_wrong - wrong_recent - 1);
  end if;

  if lab.status <> 'published' then
    return jsonb_build_object('correct', true, 'preview', true, 'xp_awarded', 0);
  end if;
  insert into public.lab_completions (user_id, lab_id, xp_awarded) values (uid, lab.id, lab.xp_reward) on conflict do nothing;
  if not found then
    return private.reward_summary(uid, me.xp, me.level) || jsonb_build_object('correct', true, 'already_solved', true, 'xp_awarded', 0);
  end if;
  perform private.award_xp(uid, lab.xp_reward, 'lab_completed', 'lab', lab.id::text, 'Lab : ' || lab.title);
  perform private.record_activity(uid, 0, 0, 1, 0);
  perform private.log_activity(uid, 'lab_complete', lab.id::text, lab.title, '/challenges/' || lab.slug, lab.xp_reward);
  perform private.after_progress(uid, null);
  return private.reward_summary(uid, me.xp, me.level) || jsonb_build_object('correct', true, 'already_solved', false, 'xp_awarded', lab.xp_reward);
end $$;

create function public.get_my_dashboard() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  me public.profiles;
  today date;
  da public.daily_activity;
begin
  select * into me from public.profiles where id = uid;
  today := private.user_today(uid);
  select * into da from public.daily_activity where user_id = uid and activity_date = today;
  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', me.id, 'display_name', me.display_name, 'username', me.username, 'avatar_path', me.avatar_path,
      'role', me.role, 'skill_level', me.skill_level, 'goal', me.goal, 'daily_minutes', me.daily_minutes,
      'onboarding_completed', me.onboarding_completed),
    'level', private.level_info(me.xp),
    'streak', jsonb_build_object(
      'current', private.effective_streak(uid), 'longest', me.longest_streak,
      'active_today', coalesce(me.last_activity_date >= today, false), 'last_activity_date', me.last_activity_date),
    'today', jsonb_build_object(
      'date', today,
      'lessons_completed', coalesce(da.lessons_completed, 0), 'quizzes_passed', coalesce(da.quizzes_passed, 0),
      'labs_solved', coalesce(da.labs_solved, 0), 'xp_earned', coalesce(da.xp_earned, 0),
      'study_minutes', coalesce(da.study_minutes, 0), 'goal_minutes', me.daily_minutes,
      'goal_reached', exists (select 1 from public.xp_transactions x where x.user_id = uid and x.reason = 'daily_goal' and x.reference_id = today::text)),
    'stats', jsonb_build_object(
      'lessons_completed', (select count(*) from public.lesson_progress where user_id = uid and status = 'completed'),
      'quizzes_passed', (select count(distinct quiz_id) from public.quiz_attempts where user_id = uid and passed),
      'labs_solved', (select count(*) from public.lab_completions where user_id = uid),
      'courses_in_progress', (select count(*) from public.enrollments where user_id = uid and status = 'active'),
      'courses_completed', (select count(*) from public.enrollments where user_id = uid and status = 'completed'),
      'badges', (select count(*) from public.user_badges where user_id = uid),
      'certificates', (select count(*) from public.certificates where user_id = uid and revoked_at is null)),
    'continue_learning', coalesce((
      select jsonb_agg(item order by (item ->> 'last_activity_at') desc)
      from (
        select jsonb_build_object(
          'course_id', c.id, 'slug', c.slug, 'title', c.title, 'icon', c.icon, 'level', c.level, 'category', c.category,
          'status', cp.status, 'progress_percentage', cp.progress_percentage,
          'completed_lessons', cp.completed_lessons, 'total_lessons', cp.total_lessons,
          'last_lesson_id', coalesce(
            (select l.id from public.lessons l join public.course_modules m on m.id = l.module_id
             where l.course_id = c.id and not exists (
               select 1 from public.lesson_progress lp where lp.user_id = uid and lp.lesson_id = l.id and lp.status = 'completed')
             order by m.position, m.created_at, l.position, l.created_at limit 1),
            cp.last_lesson_id),
          'last_activity_at', cp.last_activity_at) as item
        from public.course_progress cp join public.courses c on c.id = cp.course_id
        where cp.user_id = uid and cp.status = 'active'
        order by cp.last_activity_at desc limit 4
      ) recent), '[]'::jsonb),
    'recent_badges', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'slug', b.slug, 'name', b.name, 'description', b.description,
        'icon', b.icon, 'earned_at', ub.earned_at) order by ub.earned_at desc)
      from (select * from public.user_badges where user_id = uid order by earned_at desc limit 6) ub
      join public.badges b on b.id = ub.badge_id), '[]'::jsonb),
    'challenges', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'slug', c.slug, 'title', c.title, 'description', c.description, 'icon', c.icon, 'period', c.period,
        'metric', c.metric, 'target', c.target, 'xp_reward', c.xp_reward, 'ends_at', c.ends_at,
        'progress', least(private.challenge_progress(uid, c.metric, private.challenge_period_start(uid, c.period, c.starts_at)), c.target),
        'completed', exists (select 1 from public.user_challenges uc where uc.user_id = uid and uc.challenge_id = c.id
          and uc.period_start = private.challenge_period_start(uid, c.period, c.starts_at) and uc.completed_at is not null)
      ) order by c.position)
      from public.challenges c
      where c.is_active and (c.starts_at is null or c.starts_at <= now()) and (c.ends_at is null or c.ends_at > now())), '[]'::jsonb),
    'recommendations', coalesce((
      select jsonb_agg(jsonb_build_object('course_id', r.id, 'slug', r.slug, 'title', r.title, 'short_description', r.short_description,
        'icon', r.icon, 'level', r.level, 'category', r.category, 'estimated_duration', r.estimated_duration))
      from (
        select c.* from public.courses c
        where c.status = 'published' and c.access_level = 'free'
          and not exists (select 1 from public.enrollments e where e.user_id = uid and e.course_id = c.id)
        order by (c.level = me.skill_level) desc, c.position, c.created_at limit 3
      ) r), '[]'::jsonb),
    'week', (
      select jsonb_agg(jsonb_build_object('date', d::date, 'xp', coalesce(a.xp_earned, 0),
        'lessons', coalesce(a.lessons_completed, 0), 'minutes', coalesce(a.study_minutes, 0)) order by d)
      from generate_series(today - 6, today, interval '1 day') d
      left join public.daily_activity a on a.user_id = uid and a.activity_date = d::date),
    'unread_notifications', (select count(*) from public.notifications where user_id = uid and read_at is null)
  );
end $$;

create function public.get_my_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  me public.profiles;
  today date;
begin
  select * into me from public.profiles where id = uid;
  today := private.user_today(uid);
  return jsonb_build_object(
    'xp', me.xp,
    'level', private.level_info(me.xp),
    'current_streak', private.effective_streak(uid),
    'longest_streak', me.longest_streak,
    'courses_started', (select count(*) from public.enrollments where user_id = uid),
    'courses_completed', (select count(*) from public.enrollments where user_id = uid and status = 'completed'),
    'lessons_completed', (select count(*) from public.lesson_progress where user_id = uid and status = 'completed'),
    'quizzes_passed', (select count(distinct quiz_id) from public.quiz_attempts where user_id = uid and passed),
    'quiz_attempts', (select count(*) from public.quiz_attempts where user_id = uid),
    'average_quiz_score', (select coalesce(round(avg(percentage)), 0) from public.quiz_attempts where user_id = uid),
    'labs_solved', (select count(*) from public.lab_completions where user_id = uid),
    'study_minutes', (select coalesce(sum(study_minutes), 0) from public.daily_activity where user_id = uid),
    'active_days', (select count(*) from public.daily_activity where user_id = uid),
    'badges', (select count(*) from public.user_badges where user_id = uid),
    'certificates', (select count(*) from public.certificates where user_id = uid and revoked_at is null),
    'xp_by_reason', coalesce((
      select jsonb_object_agg(reason, total) from (
        select reason, sum(amount) as total from public.xp_transactions where user_id = uid group by reason
      ) grouped), '{}'::jsonb),
    'activity', (
      select jsonb_agg(jsonb_build_object('date', d::date, 'xp', coalesce(a.xp_earned, 0), 'lessons', coalesce(a.lessons_completed, 0),
        'quizzes', coalesce(a.quizzes_passed, 0), 'labs', coalesce(a.labs_solved, 0), 'minutes', coalesce(a.study_minutes, 0)) order by d)
      from generate_series(today - 29, today, interval '1 day') d
      left join public.daily_activity a on a.user_id = uid and a.activity_date = d::date)
  );
end $$;

-- Public certificate check (/certificat/:code). Exposes only what is printed on the certificate.
create function public.verify_certificate(p_code text) returns jsonb
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
      'revoked_reason', ce.revoked_reason)
    from public.certificates ce
    where ce.verification_code = upper(btrim(coalesce(p_code, '')))
  ), jsonb_build_object('found', false, 'valid', false));
$$;

create function public.mark_all_notifications_read() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  touched integer;
begin
  update public.notifications set read_at = now() where user_id = uid and read_at is null;
  get diagnostics touched = row_count;
  return touched;
end $$;

-- Restart from zero. Certificates already issued stay valid.
create function public.reset_my_progress() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  perform private.lock_profile(uid);
  delete from public.lesson_progress where user_id = uid;
  delete from public.quiz_attempts where user_id = uid;
  delete from public.lab_completions where user_id = uid;
  delete from public.enrollments where user_id = uid;
  delete from public.user_badges where user_id = uid;
  delete from public.user_challenges where user_id = uid;
  delete from public.daily_activity where user_id = uid;
  delete from public.xp_transactions where user_id = uid;
  update public.profiles set current_streak = 0, longest_streak = 0, last_activity_date = null where id = uid;
  perform private.log_activity(uid, 'reset', null, 'Progression réinitialisée');
end $$;

-- ─── Row level security ───────────────────────────────────────────────────────

alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.lab_completions enable row level security;

create policy "Own enrollments or staff" on public.enrollments
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own lesson progress or staff" on public.lesson_progress
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own quiz attempts or staff" on public.quiz_attempts
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own lab completions or staff" on public.lab_completions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ─── Privileges ───────────────────────────────────────────────────────────────

revoke all on public.enrollments, public.lesson_progress, public.quiz_attempts, public.lab_completions, public.course_progress
  from anon, authenticated;
grant select on public.enrollments, public.lesson_progress, public.quiz_attempts, public.lab_completions, public.course_progress
  to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function
  public.enroll_in_course(uuid), public.start_lesson(uuid), public.save_lesson_progress(uuid, integer),
  public.complete_lesson(uuid), public.submit_quiz(uuid, jsonb), public.submit_lab(uuid, text),
  public.get_my_dashboard(), public.get_my_stats(), public.verify_certificate(text),
  public.mark_all_notifications_read(), public.reset_my_progress()
from public, anon;
grant execute on function
  public.enroll_in_course(uuid), public.start_lesson(uuid), public.save_lesson_progress(uuid, integer),
  public.complete_lesson(uuid), public.submit_quiz(uuid, jsonb), public.submit_lab(uuid, text),
  public.get_my_dashboard(), public.get_my_stats(), public.verify_certificate(text),
  public.mark_all_notifications_read(), public.reset_my_progress()
to authenticated;
grant execute on function public.verify_certificate(text) to anon;
