-- CyberPingo backend: profiles, authoritative progress, publishing, contact and admin supervision.
-- Progress and rewards are written only by SECURITY DEFINER functions; learners can read their own rows.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ─── Admin publications and the scoring catalogue (the private schema is not exposed by the API) ───

create table public.published_courses (
  id text primary key check (id ~ '^[a-z0-9-]{3,80}$'),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title text not null check (char_length(title) between 3 and 160),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and jsonb_typeof(payload -> 'lessons') = 'array'
    and jsonb_typeof(payload -> 'quizzes') = 'array'
    and jsonb_array_length(payload -> 'lessons') between 1 and 20
    and jsonb_array_length(payload -> 'quizzes') <= 20
  ),
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.published_challenges (
  id text primary key check (id ~ '^[a-z0-9-]{3,80}$'),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title text not null check (char_length(title) between 3 and 160),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and not (payload ? 'expectedAnswer')),
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.content_lessons (
  id text primary key,
  course_id text not null,
  title text not null,
  xp_reward integer not null check (xp_reward between 0 and 1000),
  source text not null default 'catalog' check (source in ('catalog', 'published')),
  published_course_id text references public.published_courses (id) on delete cascade
);

create table private.content_quizzes (
  id text primary key,
  lesson_id text,
  title text not null,
  xp_reward integer not null check (xp_reward between 0 and 2000),
  correct_answers text[] not null check (cardinality(correct_answers) between 1 and 50),
  source text not null default 'catalog' check (source in ('catalog', 'published')),
  published_course_id text references public.published_courses (id) on delete cascade
);

create table private.content_challenges (
  id text primary key,
  title text not null,
  xp_reward integer not null check (xp_reward between 0 and 2000),
  expected_answer text not null check (char_length(expected_answer) between 1 and 200),
  source text not null default 'catalog' check (source in ('catalog', 'published')),
  -- No foreign key: the published row is created after this one (see sync_published_challenge).
  published_challenge_id text
);

-- ─── Learners ───

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null check (char_length(btrim(display_name)) between 2 and 50),
  username text not null unique check (username ~ '^[a-z0-9_]{2,48}$'),
  role text not null default 'learner' check (role in ('learner', 'admin')),
  goal text not null default 'decouvrir' check (goal in ('decouvrir', 'professionnel', 'emploi', 'competences', 'certification')),
  skill_level text not null default 'debutant' check (skill_level in ('debutant', 'intermediaire', 'avance')),
  daily_minutes integer not null default 20 check (daily_minutes in (10, 20, 30, 45, 60, 90)),
  known_areas text[] not null default '{}' check (known_areas <@ array['reseaux', 'linux', 'programmation', 'securite', 'aucune']::text[]),
  onboarding_completed boolean not null default false,
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0 check (streak >= 0),
  last_activity_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_completions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null references private.content_lessons (id) on delete cascade,
  course_id text not null,
  xp_earned integer not null default 0,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.quiz_results (
  user_id uuid not null references public.profiles (id) on delete cascade,
  quiz_id text not null references private.content_quizzes (id) on delete cascade,
  best_score integer not null check (best_score >= 0),
  total_questions integer not null check (total_questions > 0),
  earned_xp integer not null default 0 check (earned_xp >= 0),
  passed boolean not null default false,
  attempts integer not null default 1 check (attempts > 0),
  best_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  primary key (user_id, quiz_id),
  check (best_score <= total_questions)
);

create table public.challenge_completions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id text not null references private.content_challenges (id) on delete cascade,
  xp_earned integer not null default 0,
  completed_at timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id text not null check (badge_id in ('b1', 'b2', 'b3', 'b4', 'b5')),
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('login', 'logout', 'lesson_complete', 'quiz_complete', 'challenge_complete', 'mentor_chat', 'onboarding', 'reset')),
  entity_id text,
  label text not null,
  page text,
  xp_delta integer not null default 0,
  created_at timestamptz not null default now()
);
create index activity_events_created_idx on public.activity_events (created_at desc);
create index activity_events_user_idx on public.activity_events (user_id, created_at desc);

create table public.learner_sessions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current_page text not null default '/',
  visible boolean not null default true,
  connected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  email text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  subject text not null check (subject in ('Signaler un problème', 'Proposer un contenu', 'Améliorer une explication', 'Autre')),
  message text not null check (char_length(btrim(message)) between 20 and 5000),
  status text not null default 'nouveau' check (status in ('nouveau', 'en_cours', 'traite')),
  created_at timestamptz not null default now()
);
create index contact_messages_created_idx on public.contact_messages (created_at desc);

create table private.contact_rate (
  sender_key text not null,
  created_at timestamptz not null default now()
);
create index contact_rate_idx on private.contact_rate (sender_key, created_at desc);

create table private.mentor_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  requests integer not null default 0,
  primary key (user_id, day)
);

-- ─── Helpers ───

create or replace function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger published_courses_touch before update on public.published_courses for each row execute function private.touch_updated_at();
create trigger published_challenges_touch before update on public.published_challenges for each row execute function private.touch_updated_at();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

create or replace function private.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Connexion requise.' using errcode = '28000', hint = 'cyberpingo';
  end if;
  return uid;
end $$;

create or replace function private.require_admin() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501', hint = 'cyberpingo';
  end if;
  return uid;
end $$;

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  candidate text;
  requested_name text;
begin
  base := left(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_]', '_', 'g'), 32);
  if char_length(base) < 2 then base := 'apprenant'; end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    candidate := base || '_' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
  end loop;

  requested_name := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''));
  if char_length(requested_name) not between 2 and 50 then
    requested_name := left(btrim(initcap(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[._-]+', ' ', 'g'))), 50);
  end if;
  if char_length(requested_name) < 2 then requested_name := 'Apprenant'; end if;

  insert into public.profiles (id, email, display_name, username)
  values (new.id, coalesce(new.email, ''), requested_name, candidate);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.sync_user_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed after update of email on auth.users
for each row when (old.email is distinct from new.email) execute function private.sync_user_email();

-- Keep the scoring catalogue aligned with admin publications; catalogue IDs cannot be taken over.
create or replace function private.sync_published_course() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  lesson jsonb;
  quiz jsonb;
  lesson_ids text[];
  quiz_ids text[];
  answers text[];
begin
  select coalesce(array_agg(value ->> 'id'), '{}') into lesson_ids from jsonb_array_elements(new.payload -> 'lessons');
  select coalesce(array_agg(value ->> 'id'), '{}') into quiz_ids from jsonb_array_elements(new.payload -> 'quizzes');

  delete from private.content_lessons where published_course_id = new.id and not (id = any (lesson_ids));
  delete from private.content_quizzes where published_course_id = new.id and not (id = any (quiz_ids));

  for lesson in select value from jsonb_array_elements(new.payload -> 'lessons') loop
    if coalesce(lesson ->> 'id', '') !~ '^[a-z0-9-]{3,120}$' then
      raise exception 'Identifiant de leçon invalide.' using errcode = '22023', hint = 'cyberpingo';
    end if;
    if exists (select 1 from private.content_lessons where id = lesson ->> 'id' and published_course_id is distinct from new.id) then
      raise exception 'La leçon % existe déjà dans un autre cours.', lesson ->> 'id' using errcode = '23505', hint = 'cyberpingo';
    end if;
    insert into private.content_lessons (id, course_id, title, xp_reward, source, published_course_id)
    values (lesson ->> 'id', new.id, left(coalesce(lesson ->> 'title', 'Leçon'), 160),
            least(greatest(coalesce((lesson ->> 'xpReward')::integer, 0), 0), 1000), 'published', new.id)
    on conflict (id) do update set course_id = excluded.course_id, title = excluded.title, xp_reward = excluded.xp_reward;
  end loop;

  for quiz in select value from jsonb_array_elements(new.payload -> 'quizzes') loop
    if coalesce(quiz ->> 'id', '') !~ '^[a-z0-9-]{3,120}$' then
      raise exception 'Identifiant de quiz invalide.' using errcode = '22023', hint = 'cyberpingo';
    end if;
    if exists (select 1 from private.content_quizzes where id = quiz ->> 'id' and published_course_id is distinct from new.id) then
      raise exception 'Le quiz % existe déjà dans un autre cours.', quiz ->> 'id' using errcode = '23505', hint = 'cyberpingo';
    end if;
    select coalesce(array_agg(question ->> 'correctAnswer' order by position), '{}') into answers
    from jsonb_array_elements(coalesce(quiz -> 'questions', '[]'::jsonb)) with ordinality as item(question, position);
    insert into private.content_quizzes (id, lesson_id, title, xp_reward, correct_answers, source, published_course_id)
    values (quiz ->> 'id', quiz ->> 'lessonId', left(coalesce(quiz ->> 'title', 'Quiz'), 160),
            least(greatest(coalesce((quiz ->> 'xpReward')::integer, 0), 0), 2000), answers, 'published', new.id)
    on conflict (id) do update set lesson_id = excluded.lesson_id, title = excluded.title, xp_reward = excluded.xp_reward, correct_answers = excluded.correct_answers;
  end loop;
  return new;
end $$;

create trigger published_course_content after insert or update of payload on public.published_courses
for each row execute function private.sync_published_course();

-- Moves the flag of a published challenge into the private catalogue so learners never receive it.
create or replace function private.sync_published_challenge() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  answer text := btrim(coalesce(new.payload ->> 'expectedAnswer', ''));
begin
  if tg_op = 'UPDATE' and new.id <> old.id then
    raise exception 'L’identifiant d’un challenge publié ne peut pas changer.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if exists (select 1 from private.content_challenges where id = new.id and published_challenge_id is distinct from new.id) then
    raise exception 'Le challenge % existe déjà.', new.id using errcode = '23505', hint = 'cyberpingo';
  end if;
  if answer = '' then
    select expected_answer into answer from private.content_challenges where id = new.id;
    if answer is null then
      raise exception 'Indique la réponse attendue du challenge.' using errcode = '22023', hint = 'cyberpingo';
    end if;
  end if;
  if char_length(answer) > 200 then
    raise exception 'La réponse attendue doit faire 200 caractères au maximum.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  new.payload := new.payload - 'expectedAnswer';
  insert into private.content_challenges (id, title, xp_reward, expected_answer, source, published_challenge_id)
  values (new.id, new.title, least(greatest(coalesce((new.payload ->> 'xpReward')::integer, 0), 0), 2000), answer, 'published', new.id)
  on conflict (id) do update set title = excluded.title, xp_reward = excluded.xp_reward, expected_answer = excluded.expected_answer;
  return new;
end $$;

create trigger published_challenge_content before insert or update on public.published_challenges
for each row execute function private.sync_published_challenge();

create or replace function private.remove_published_challenge() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from private.content_challenges where published_challenge_id = old.id;
  return old;
end $$;

create trigger published_challenge_removed after delete on public.published_challenges
for each row execute function private.remove_published_challenge();

create or replace function private.refresh_badges(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  current_streak integer;
begin
  select streak into current_streak from public.profiles where id = p_user;
  if exists (select 1 from public.lesson_completions where user_id = p_user) then
    insert into public.user_badges (user_id, badge_id) values (p_user, 'b1') on conflict do nothing;
  end if;
  if coalesce(current_streak, 0) >= 7 then
    insert into public.user_badges (user_id, badge_id) values (p_user, 'b2') on conflict do nothing;
  end if;
  if exists (select 1 from public.challenge_completions where user_id = p_user) then
    insert into public.user_badges (user_id, badge_id) values (p_user, 'b3') on conflict do nothing;
  end if;
  if (select count(*) from public.quiz_results where user_id = p_user and passed) >= 10 then
    insert into public.user_badges (user_id, badge_id) values (p_user, 'b4') on conflict do nothing;
  end if;
  if exists (select 1 from private.content_lessons where course_id = 'c2')
     and not exists (
       select 1 from private.content_lessons lesson
       where lesson.course_id = 'c2'
         and not exists (select 1 from public.lesson_completions done where done.user_id = p_user and done.lesson_id = lesson.id)
     ) then
    insert into public.user_badges (user_id, badge_id) values (p_user, 'b5') on conflict do nothing;
  end if;
end $$;

-- Adds XP and advances the UTC-day streak once per day of qualifying progress.
create or replace function private.apply_progress(p_user uuid, p_xp integer) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'utc')::date;
  result public.profiles;
begin
  update public.profiles set
    xp = xp + greatest(coalesce(p_xp, 0), 0),
    streak = case
      when last_activity_date = today then greatest(streak, 1)
      when last_activity_date = today - 1 then streak + 1
      else 1
    end,
    last_activity_date = today
  where id = p_user
  returning * into result;
  perform private.refresh_badges(p_user);
  return result;
end $$;

create or replace function private.lock_profile(p_user uuid) returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare
  result public.profiles;
begin
  select * into result from public.profiles where id = p_user for update;
  if not found then
    raise exception 'Profil introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  return result;
end $$;

-- ─── Learner RPCs ───

create or replace function public.complete_lesson(p_lesson_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  lesson private.content_lessons;
  profile public.profiles;
  inserted integer;
begin
  select * into lesson from private.content_lessons where id = p_lesson_id;
  if not found then
    raise exception 'Leçon inconnue.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  profile := private.lock_profile(uid);
  insert into public.lesson_completions (user_id, lesson_id, course_id, xp_earned)
  values (uid, lesson.id, lesson.course_id, lesson.xp_reward)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return jsonb_build_object('awarded', 0, 'xp', profile.xp, 'streak', profile.streak, 'alreadyCompleted', true);
  end if;
  profile := private.apply_progress(uid, lesson.xp_reward);
  insert into public.activity_events (user_id, kind, entity_id, label, page, xp_delta)
  values (uid, 'lesson_complete', lesson.id, 'Leçon terminée : ' || lesson.title, '/lessons/' || lesson.id, lesson.xp_reward);
  return jsonb_build_object('awarded', lesson.xp_reward, 'xp', profile.xp, 'streak', profile.streak, 'alreadyCompleted', false);
end $$;

-- Grades on the server; XP is only granted for an improved best score.
create or replace function public.submit_quiz(p_quiz_id text, p_answers text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  quiz private.content_quizzes;
  profile public.profiles;
  previous public.quiz_results;
  v_total integer;
  v_score integer;
  v_earned integer;
  v_passed boolean;
  v_awarded integer := 0;
  v_improved boolean;
begin
  select * into quiz from private.content_quizzes where id = p_quiz_id;
  if not found then
    raise exception 'Quiz inconnu.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  v_total := cardinality(quiz.correct_answers);
  if p_answers is null or cardinality(p_answers) <> v_total then
    raise exception 'Réponds à toutes les questions avant de valider.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  select count(*) into v_score from unnest(quiz.correct_answers, p_answers) as graded(expected, given) where expected = given;
  v_earned := round(v_score::numeric / v_total * quiz.xp_reward);
  v_passed := v_score::numeric / v_total >= 0.7;

  profile := private.lock_profile(uid);
  select * into previous from public.quiz_results where user_id = uid and quiz_id = quiz.id;
  if not found then
    v_improved := true;
    v_awarded := v_earned;
    insert into public.quiz_results (user_id, quiz_id, best_score, total_questions, earned_xp, passed)
    values (uid, quiz.id, v_score, v_total, v_earned, v_passed);
  else
    v_improved := v_score::numeric / v_total > previous.best_score::numeric / previous.total_questions;
    if v_improved then
      v_awarded := greatest(0, v_earned - previous.earned_xp);
      update public.quiz_results set
        best_score = v_score, total_questions = v_total, earned_xp = greatest(previous.earned_xp, v_earned),
        passed = v_passed, attempts = previous.attempts + 1, best_at = now(), last_attempt_at = now()
      where user_id = uid and quiz_id = quiz.id;
    else
      update public.quiz_results set attempts = previous.attempts + 1, last_attempt_at = now()
      where user_id = uid and quiz_id = quiz.id;
    end if;
  end if;

  if v_improved and v_score > 0 then
    profile := private.apply_progress(uid, v_awarded);
  end if;
  insert into public.activity_events (user_id, kind, entity_id, label, page, xp_delta)
  values (uid, 'quiz_complete', quiz.id, 'Quiz : ' || quiz.title || ' (' || v_score || '/' || v_total || ')', '/quiz/' || quiz.id, v_awarded);

  return jsonb_build_object('score', v_score, 'total', v_total, 'passed', v_passed, 'awarded', v_awarded,
    'improved', v_improved, 'xp', profile.xp, 'streak', profile.streak);
end $$;

create or replace function public.submit_challenge(p_challenge_id text, p_answer text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  challenge private.content_challenges;
  profile public.profiles;
  inserted integer;
begin
  select * into challenge from private.content_challenges where id = p_challenge_id;
  if not found then
    raise exception 'Challenge inconnu.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  if lower(btrim(coalesce(p_answer, ''))) <> lower(btrim(challenge.expected_answer)) then
    return jsonb_build_object('correct', false, 'awarded', 0);
  end if;
  profile := private.lock_profile(uid);
  insert into public.challenge_completions (user_id, challenge_id, xp_earned)
  values (uid, challenge.id, challenge.xp_reward)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return jsonb_build_object('correct', true, 'awarded', 0, 'xp', profile.xp, 'streak', profile.streak, 'alreadyCompleted', true);
  end if;
  profile := private.apply_progress(uid, challenge.xp_reward);
  insert into public.activity_events (user_id, kind, entity_id, label, page, xp_delta)
  values (uid, 'challenge_complete', challenge.id, 'Challenge résolu : ' || challenge.title, '/challenges', challenge.xp_reward);
  return jsonb_build_object('correct', true, 'awarded', challenge.xp_reward, 'xp', profile.xp, 'streak', profile.streak, 'alreadyCompleted', false);
end $$;

create or replace function public.reset_my_progress() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  perform private.lock_profile(uid);
  delete from public.lesson_completions where user_id = uid;
  delete from public.quiz_results where user_id = uid;
  delete from public.challenge_completions where user_id = uid;
  delete from public.user_badges where user_id = uid;
  update public.profiles set xp = 0, streak = 0, last_activity_date = null where id = uid;
  insert into public.activity_events (user_id, kind, label) values (uid, 'reset', 'Progression réinitialisée');
end $$;

create or replace function public.complete_onboarding(p_skill_level text, p_goal text, p_daily_minutes integer, p_known_areas text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  update public.profiles set
    skill_level = p_skill_level, goal = p_goal, daily_minutes = p_daily_minutes,
    known_areas = coalesce(p_known_areas, '{}'), onboarding_completed = true
  where id = uid;
  insert into public.activity_events (user_id, kind, label, page) values (uid, 'onboarding', 'Parcours personnalisé', '/onboarding');
end $$;

create or replace function public.record_login() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  insert into public.learner_sessions (user_id, current_page, visible, connected_at, last_seen_at, ended_at)
  values (uid, '/login', true, now(), now(), null)
  on conflict (user_id) do update set connected_at = now(), last_seen_at = now(), ended_at = null, visible = true;
  insert into public.activity_events (user_id, kind, label, page) values (uid, 'login', 'Connexion', '/login');
end $$;

create or replace function public.heartbeat(p_page text, p_visible boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  safe_page text := left(coalesce(nullif(p_page, ''), '/'), 200);
begin
  if left(safe_page, 1) <> '/' then safe_page := '/'; end if;
  insert into public.learner_sessions (user_id, current_page, visible, connected_at, last_seen_at, ended_at)
  values (uid, safe_page, coalesce(p_visible, true), now(), now(), null)
  on conflict (user_id) do update set
    current_page = excluded.current_page,
    visible = excluded.visible,
    connected_at = case
      when public.learner_sessions.ended_at is not null or public.learner_sessions.last_seen_at < now() - interval '10 minutes' then now()
      else public.learner_sessions.connected_at
    end,
    last_seen_at = now(),
    ended_at = null;
end $$;

create or replace function public.end_session() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  update public.learner_sessions set ended_at = now(), visible = false where user_id = uid;
  insert into public.activity_events (user_id, kind, label) values (uid, 'logout', 'Déconnexion');
end $$;

create or replace function public.consume_mentor_quota() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  daily_limit constant integer := 40;
  used integer;
begin
  insert into private.mentor_usage (user_id, day, requests)
  values (uid, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day) do update set requests = private.mentor_usage.requests + 1
  returning requests into used;
  if used > daily_limit then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'limit', daily_limit);
  end if;
  insert into public.activity_events (user_id, kind, label, page) values (uid, 'mentor_chat', 'Question au mentor IA', '/mentor');
  return jsonb_build_object('allowed', true, 'remaining', daily_limit - used, 'limit', daily_limit);
end $$;

-- Public feedback form, rate-limited per account or per hashed client address.
create or replace function public.submit_contact_message(p_subject text, p_email text, p_message text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  forwarded text := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json ->> 'x-forwarded-for';
  key text;
  message_id uuid;
begin
  key := case when uid is not null then 'user:' || uid::text
              else 'ip:' || md5(coalesce(btrim(split_part(forwarded, ',', 1)), 'unknown')) end;
  if (select count(*) from private.contact_rate where sender_key = key and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Trop de messages envoyés. Réessaie dans une heure.' using errcode = 'PT429', hint = 'cyberpingo';
  end if;
  insert into public.contact_messages (user_id, email, subject, message)
  values (uid, nullif(btrim(lower(p_email)), ''), p_subject, btrim(p_message))
  returning id into message_id;
  insert into private.contact_rate (sender_key) values (key);
  delete from private.contact_rate where created_at < now() - interval '1 day';
  return message_id;
end $$;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  if (select role from public.profiles where id = uid) = 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'Nomme un autre administrateur avant de supprimer ce compte.' using errcode = '42501', hint = 'cyberpingo';
  end if;
  delete from auth.users where id = uid;
end $$;

-- ─── Admin RPCs ───

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'utc')::date;
  day_start timestamptz := (now() at time zone 'utc')::date::timestamp at time zone 'utc';
  result jsonb;
begin
  perform private.require_admin();
  select jsonb_build_object(
    'learners', (select count(*) from public.profiles where role = 'learner'),
    'admins', (select count(*) from public.profiles where role = 'admin'),
    'newThisWeek', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'activeToday', (select count(distinct user_id) from public.activity_events where created_at >= day_start),
    'onlineNow', (select count(*) from public.learner_sessions where ended_at is null and last_seen_at >= now() - interval '2 minutes'),
    'lessonsCompleted', (select count(*) from public.lesson_completions),
    'lessonsToday', (select count(*) from public.lesson_completions where completed_at >= day_start),
    'quizAttempts', (select coalesce(sum(attempts), 0) from public.quiz_results),
    'quizzesPassed', (select count(*) from public.quiz_results where passed),
    'averageBestScore', (select coalesce(round(avg(best_score::numeric / total_questions) * 100), 0) from public.quiz_results),
    'challengesSolved', (select count(*) from public.challenge_completions),
    'xpToday', (select coalesce(sum(xp_delta), 0) from public.activity_events where created_at >= day_start),
    'newMessages', (select count(*) from public.contact_messages where status = 'nouveau'),
    'publishedCourses', (select count(*) from public.published_courses),
    'publishedChallenges', (select count(*) from public.published_challenges),
    'topCourses', coalesce((
      select jsonb_agg(jsonb_build_object('courseId', course_id, 'completions', total) order by total desc)
      from (select course_id, count(*) as total from public.lesson_completions group by course_id order by total desc limit 5) ranked
    ), '[]'::jsonb),
    'signupsByDay', coalesce((
      select jsonb_agg(jsonb_build_object('day', day, 'count', total) order by day)
      from (
        select series.day::date as day, count(p.id) as total
        from generate_series((today - 6)::timestamp, today::timestamp, interval '1 day') as series(day)
        left join public.profiles p on (p.created_at at time zone 'utc')::date = series.day::date
        group by series.day
      ) daily
    ), '[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.admin_learners(p_limit integer default 100)
returns table (
  id uuid, display_name text, username text, email text, role text, xp integer, streak integer,
  last_activity_date date, created_at timestamptz, lessons_completed bigint, quizzes_passed bigint, challenges_solved bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return query
  select p.id, p.display_name, p.username, p.email, p.role, p.xp, p.streak, p.last_activity_date, p.created_at,
    (select count(*) from public.lesson_completions l where l.user_id = p.id),
    (select count(*) from public.quiz_results q where q.user_id = p.id and q.passed),
    (select count(*) from public.challenge_completions c where c.user_id = p.id)
  from public.profiles p
  order by p.xp desc, p.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
end $$;

create or replace function public.admin_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_admin();
begin
  if p_role not in ('learner', 'admin') then
    raise exception 'Rôle invalide.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if p_user = uid and p_role <> 'admin' then
    raise exception 'Tu ne peux pas retirer ton propre accès administrateur.' using errcode = '42501', hint = 'cyberpingo';
  end if;
  update public.profiles set role = p_role where id = p_user;
end $$;

-- ─── Row level security ───

alter table public.profiles enable row level security;
alter table public.lesson_completions enable row level security;
alter table public.quiz_results enable row level security;
alter table public.challenge_completions enable row level security;
alter table public.user_badges enable row level security;
alter table public.activity_events enable row level security;
alter table public.learner_sessions enable row level security;
alter table public.contact_messages enable row level security;
alter table public.published_courses enable row level security;
alter table public.published_challenges enable row level security;
alter table private.content_lessons enable row level security;
alter table private.content_quizzes enable row level security;
alter table private.content_challenges enable row level security;
alter table private.contact_rate enable row level security;
alter table private.mentor_usage enable row level security;

create policy "Profiles are visible to their owner and admins" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Learners edit their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Own lesson progress or admin" on public.lesson_completions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own quiz results or admin" on public.quiz_results
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own challenges or admin" on public.challenge_completions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own badges or admin" on public.user_badges
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own activity or admin" on public.activity_events
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own session or admin" on public.learner_sessions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Admins read contact messages" on public.contact_messages
  for select to authenticated using ((select public.is_admin()));
create policy "Admins triage contact messages" on public.contact_messages
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Learners read published courses" on public.published_courses
  for select to authenticated using (true);
create policy "Admins insert courses" on public.published_courses
  for insert to authenticated with check ((select public.is_admin()) and published_by = (select auth.uid()));
create policy "Admins update courses" on public.published_courses
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete courses" on public.published_courses
  for delete to authenticated using ((select public.is_admin()));

create policy "Learners read published challenges" on public.published_challenges
  for select to authenticated using (true);
create policy "Admins insert challenges" on public.published_challenges
  for insert to authenticated with check ((select public.is_admin()) and published_by = (select auth.uid()));
create policy "Admins update challenges" on public.published_challenges
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete challenges" on public.published_challenges
  for delete to authenticated using ((select public.is_admin()));

-- ─── Privileges: reads go through RLS, writes only through the functions above ───

revoke all on public.profiles, public.lesson_completions, public.quiz_results, public.challenge_completions,
  public.user_badges, public.activity_events, public.learner_sessions, public.contact_messages,
  public.published_courses, public.published_challenges from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

grant select on public.profiles, public.lesson_completions, public.quiz_results, public.challenge_completions,
  public.user_badges, public.activity_events, public.learner_sessions to authenticated;
grant update (display_name, goal, skill_level, daily_minutes, known_areas) on public.profiles to authenticated;
grant select, update (status) on public.contact_messages to authenticated;
grant select, insert, update, delete on public.published_courses, public.published_challenges to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function
  public.is_admin(), public.complete_lesson(text), public.submit_quiz(text, text[]), public.submit_challenge(text, text),
  public.reset_my_progress(), public.complete_onboarding(text, text, integer, text[]), public.record_login(),
  public.heartbeat(text, boolean), public.end_session(), public.consume_mentor_quota(),
  public.submit_contact_message(text, text, text), public.delete_my_account(), public.admin_overview(),
  public.admin_learners(integer), public.admin_set_role(uuid, text)
from public, anon;
grant execute on function
  public.is_admin(), public.complete_lesson(text), public.submit_quiz(text, text[]), public.submit_challenge(text, text),
  public.reset_my_progress(), public.complete_onboarding(text, text, integer, text[]), public.record_login(),
  public.heartbeat(text, boolean), public.end_session(), public.consume_mentor_quota(),
  public.submit_contact_message(text, text, text), public.delete_my_account(), public.admin_overview(),
  public.admin_learners(integer), public.admin_set_role(uuid, text)
to authenticated;
grant execute on function public.submit_contact_message(text, text, text) to anon;

-- ─── Realtime supervision for administrators (RLS still applies) ───

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.activity_events, public.learner_sessions;
  end if;
end $$;
