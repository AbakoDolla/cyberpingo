-- CyberPingo · Academy engine
-- Additive layer on top of the existing progress engine:
--
--   domains → paths (courses) → modules → lessons          (teaching engine)
--   skills + skill_links + user_skills                     (competence profile, computed server-side)
--   lab tasks, lab assets, lab reports                     (labs with auto-checked steps)
--   ranks + user_ranks                                     (pedagogical grades, explicit criteria)
--   mascot_lines                                           (event → line, optional human audio)
--   badges: lab / skill conditions and a rarity
--
-- Nothing here is awarded by the client: every reward still flows through the XP ledger and
-- the existing after_progress() hook, which now also refreshes skills and rank.

-- --- Publication workflow: draft → review → published → archived -------------------------

do $$
declare
  c record;
begin
  for c in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where contype = 'c'
      and conrelid in ('public.courses'::regclass, 'public.labs'::regclass)
      and pg_get_constraintdef(oid) ilike '%''draft''%'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

alter table public.courses add constraint courses_status_check
  check (status in ('draft', 'review', 'published', 'archived'));
alter table public.labs add constraint labs_status_check
  check (status in ('draft', 'review', 'published', 'archived'));

-- --- Domains ---------------------------------------------------------------------------

create table public.domains (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 500),
  icon text not null default 'fondamentaux' check (icon ~ '^[a-z0-9-]{2,40}$'),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses add column domain_id uuid references public.domains (id) on delete set null;
create index courses_domain_idx on public.courses (domain_id);

-- --- Labs: mission metadata -------------------------------------------------------------

alter table public.labs
  add column course_id uuid references public.courses (id) on delete set null,
  add column format text not null default 'terminal' check (format in ('terminal', 'pcap', 'logs', 'packet_tracer')),
  add column briefing text not null default '' check (char_length(briefing) <= 4000),
  add column constraints text[] not null default '{}' check (cardinality(constraints) <= 10),
  add column tools text[] not null default '{}' check (cardinality(tools) <= 10),
  add column requires_computer boolean not null default false,
  add column is_assessment boolean not null default false,
  add column estimated_minutes integer not null default 15 check (estimated_minutes between 1 and 600);
create index labs_course_idx on public.labs (course_id, position);

-- Auto-checked steps. Expected answers live in private.lab_task_keys and never reach a client.
create table public.lab_tasks (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs (id) on delete cascade,
  position integer not null default 0,
  prompt text not null check (char_length(btrim(prompt)) between 1 and 600),
  hint text not null default '' check (char_length(hint) <= 400),
  answer_format text not null default '' check (char_length(answer_format) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lab_tasks_lab_idx on public.lab_tasks (lab_id, position);

create table private.lab_task_keys (
  task_id uuid primary key references public.lab_tasks (id) on delete cascade,
  accepted text[] not null check (cardinality(accepted) between 1 and 8),
  explanation text not null default '' check (char_length(explanation) <= 1000)
);

create table public.lab_task_completions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  task_id uuid not null references public.lab_tasks (id) on delete cascade,
  lab_id uuid not null references public.labs (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, task_id)
);
create index lab_task_completions_lab_idx on public.lab_task_completions (user_id, lab_id);

-- Files and guides attached to a lab. Binary files stay outside the database: only a URL is kept.
create table public.lab_assets (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs (id) on delete cascade,
  kind text not null check (kind in ('log', 'pcap', 'pkt', 'guide', 'image', 'topology', 'report_template')),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  description text not null default '' check (char_length(description) <= 500),
  url text not null check (
    (url ~ '^https://\S{4,}$' and char_length(url) <= 508)
    or (url ~ '^/labs/[A-Za-z0-9._/-]{1,200}$' and url !~ '\.\.')
  ),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lab_assets_lab_idx on public.lab_assets (lab_id, position);

-- Packet Tracer (and any practical lab) reports: reviewed by staff, feedback goes back to the learner.
create table public.lab_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lab_id uuid not null references public.labs (id) on delete cascade,
  note text not null check (char_length(btrim(note)) between 1 and 2000),
  link text check (link is null or (link ~ '^https://\S{4,}$' and char_length(link) <= 508)),
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested')),
  feedback text not null default '' check (char_length(feedback) <= 1000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lab_id)
);
create index lab_submissions_status_idx on public.lab_submissions (status, updated_at desc);

-- --- Skills ----------------------------------------------------------------------------------

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid references public.domains (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 80),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  description text not null default '' check (char_length(description) <= 500),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index skills_domain_idx on public.skills (domain_id, position);

-- What a learner has to do to progress on a skill:
--   lesson      → finish the lesson
--   quiz        → pass the quiz
--   practice    → complete a lab
--   validation  → complete a practical assessment lab (labs.is_assessment)
create table public.skill_links (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills (id) on delete cascade,
  kind text not null check (kind in ('lesson', 'quiz', 'practice', 'validation')),
  lesson_id uuid references public.lessons (id) on delete cascade,
  quiz_id uuid references public.quizzes (id) on delete cascade,
  lab_id uuid references public.labs (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (kind = 'lesson' and lesson_id is not null and quiz_id is null and lab_id is null)
    or (kind = 'quiz' and quiz_id is not null and lesson_id is null and lab_id is null)
    or (kind in ('practice', 'validation') and lab_id is not null and lesson_id is null and quiz_id is null)
  )
);
create unique index skill_links_unique_idx on public.skill_links (skill_id, kind, coalesce(lesson_id, quiz_id, lab_id));
create index skill_links_lesson_idx on public.skill_links (lesson_id) where lesson_id is not null;
create index skill_links_quiz_idx on public.skill_links (quiz_id) where quiz_id is not null;
create index skill_links_lab_idx on public.skill_links (lab_id) where lab_id is not null;

create function private.check_skill_link() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'validation' and not exists (select 1 from public.labs where id = new.lab_id and is_assessment) then
    raise exception 'Une validation de compétence doit pointer vers un lab d’évaluation.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  return new;
end $$;
create trigger skill_links_check before insert or update on public.skill_links
for each row execute function private.check_skill_link();

-- Snapshot of the learner's skill states (rows exist only once a skill is started).
create table public.user_skills (
  user_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  state text not null check (state in ('learning', 'consolidating', 'exercises_mastered', 'validated')),
  changed_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);
create index user_skills_state_idx on public.user_skills (user_id, state);

-- --- Ranks -----------------------------------------------------------------------------------

create table public.ranks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 300),
  position integer not null unique check (position >= 1),
  -- Every key is a minimum. Allowed keys: min_level, lessons_completed, labs_solved,
  -- courses_completed, skills_mastered, skills_validated.
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function private.validate_rank_criteria() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  k record;
begin
  if jsonb_typeof(new.criteria) <> 'object' then
    raise exception 'Les critères d’un grade doivent être un objet.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  for k in select key, value from jsonb_each(new.criteria) loop
    if k.key not in ('min_level', 'lessons_completed', 'labs_solved', 'courses_completed', 'skills_mastered', 'skills_validated')
       or jsonb_typeof(k.value) <> 'number' or (k.value #>> '{}') !~ '^[0-9]{1,6}$' then
      raise exception 'Critère de grade invalide : %.', k.key using errcode = '22023', hint = 'cyberpingo';
    end if;
  end loop;
  return new;
end $$;
create trigger ranks_criteria before insert or update on public.ranks
for each row execute function private.validate_rank_criteria();

create table public.user_ranks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  rank_id uuid not null references public.ranks (id) on delete cascade,
  achieved_at timestamptz not null default now(),
  primary key (user_id, rank_id)
);

insert into public.ranks (slug, name, description, position, criteria) values
  ('novice-numerique', 'Novice numérique', 'Tu viens de rejoindre l’académie.', 1, '{}'),
  ('explorateur-cyber', 'Explorateur cyber', 'Tu as terminé tes premières leçons.', 2, '{"lessons_completed": 3}'),
  ('apprenti-analyste', 'Apprenti analyste', 'Tu lis déjà des traces et tu as réussi un premier lab.', 3, '{"lessons_completed": 8, "labs_solved": 1}'),
  ('technicien-reseau', 'Technicien réseau', 'Un parcours terminé et plusieurs compétences maîtrisées en exercice.', 4, '{"courses_completed": 1, "skills_mastered": 3, "labs_solved": 3}'),
  ('defenseur-numerique', 'Défenseur numérique', 'Tu défends un système avec méthode.', 5, '{"lessons_completed": 20, "labs_solved": 4, "skills_mastered": 5}'),
  ('analyste-soc-junior', 'Analyste SOC junior', 'Tu valides tes compétences par des évaluations pratiques.', 6, '{"min_level": 8, "labs_solved": 6, "skills_validated": 2}'),
  ('analyste-confirme', 'Analyste confirmé', 'Tu enchaînes les investigations et tu as plusieurs parcours à ton actif.', 7, '{"min_level": 12, "courses_completed": 3, "skills_validated": 4}'),
  ('specialiste-cyber', 'Spécialiste cyber', 'Tu maîtrises plusieurs domaines de la cybersécurité.', 8, '{"min_level": 16, "courses_completed": 4, "skills_validated": 8}'),
  ('expert-de-domaine', 'Expert de domaine', 'Le plus haut grade de l’académie.', 9, '{"min_level": 20, "courses_completed": 6, "skills_validated": 12}');

-- --- Mascot lines ------------------------------------------------------------------------------
-- A line is text first. An audio file may be attached only with a voice credit: the platform never
-- presents a synthetic voice as a human recording.

create table public.mascot_lines (
  id uuid primary key default gen_random_uuid(),
  event text not null check (event in (
    'welcome', 'lesson_start', 'exercise_success', 'exercise_fail', 'chapter_end', 'level_up', 'badge',
    'challenge', 'return_after_absence', 'new_skill', 'rank_up', 'path_complete', 'lab_complete')),
  expression text not null check (expression in (
    'happy', 'proud', 'encouraging', 'focused', 'surprised', 'disappointed', 'thinking', 'expert',
    'celebration', 'mission', 'explanation')),
  text_fr text not null check (char_length(btrim(text_fr)) between 1 and 280),
  audio_url text check (audio_url is null or (
    (audio_url ~ '^https://\S{4,}$' and char_length(audio_url) <= 508)
    or (audio_url ~ '^/audio/[A-Za-z0-9._/-]{1,200}$' and audio_url !~ '\.\.'))),
  voice_credit text check (voice_credit is null or char_length(btrim(voice_credit)) between 1 and 120),
  priority integer not null default 5 check (priority between 1 and 10),
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (audio_url is null or voice_credit is not null)
);
create index mascot_lines_event_idx on public.mascot_lines (event, is_active, position);

-- --- Badges: lab / skill conditions and a rarity -----------------------------------------------

alter table public.badges
  add column criteria_lab_id uuid references public.labs (id) on delete cascade,
  add column criteria_skill_id uuid references public.skills (id) on delete cascade,
  add column rarity text not null default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary'));

do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.badges'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%criteria_type%'
  loop
    execute format('alter table public.badges drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.badges
  add constraint badges_criteria_type_check check (criteria_type in (
    'lessons_completed', 'quizzes_passed', 'courses_completed', 'streak_days', 'xp_total',
    'labs_solved', 'certificates_earned', 'course_completed', 'lab_completed', 'skill_validated')),
  add constraint badges_course_target_check check ((criteria_type = 'course_completed') = (criteria_course_id is not null)),
  add constraint badges_lab_target_check check ((criteria_type = 'lab_completed') = (criteria_lab_id is not null)),
  add constraint badges_skill_target_check check ((criteria_type = 'skill_validated') = (criteria_skill_id is not null));

-- --- Helpers -----------------------------------------------------------------------------------

create function private.norm_answer(p_text text) returns text
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(btrim(coalesce(p_text, '')), '\s+', ' ', 'g'))
$$;

create function private.skill_order(p_state text) returns integer
language sql immutable set search_path = '' as $$
  select case p_state
    when 'learning' then 1 when 'consolidating' then 2 when 'exercises_mastered' then 3 when 'validated' then 4 else 0 end
$$;

-- not_studied → learning → consolidating → exercises_mastered → validated.
-- A skill is never mastered on a quiz alone: it needs a practice lab, and it is only
-- "validated" by a practical assessment lab.
create function private.skill_state(p_user uuid, p_skill uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  lessons_total integer; lessons_done integer; lessons_started integer;
  quizzes_total integer; quizzes_passed integer; quizzes_tried integer;
  practice_total integer; practice_done integer; practice_started integer;
  validation_total integer; validation_done integer; validation_started integer;
begin
  select
    count(*) filter (where l.kind = 'lesson'),
    count(*) filter (where l.kind = 'lesson' and lp.status = 'completed'),
    count(*) filter (where l.kind = 'lesson' and lp.lesson_id is not null),
    count(*) filter (where l.kind = 'quiz'),
    count(*) filter (where l.kind = 'quiz' and exists (
      select 1 from public.quiz_attempts qa where qa.user_id = p_user and qa.quiz_id = l.quiz_id and qa.passed)),
    count(*) filter (where l.kind = 'quiz' and exists (
      select 1 from public.quiz_attempts qa where qa.user_id = p_user and qa.quiz_id = l.quiz_id)),
    count(*) filter (where l.kind = 'practice'),
    count(*) filter (where l.kind = 'practice' and lc.lab_id is not null),
    count(*) filter (where l.kind = 'practice' and (lc.lab_id is not null or exists (
      select 1 from public.lab_task_completions tc where tc.user_id = p_user and tc.lab_id = l.lab_id))),
    count(*) filter (where l.kind = 'validation'),
    count(*) filter (where l.kind = 'validation' and lc.lab_id is not null),
    count(*) filter (where l.kind = 'validation' and (lc.lab_id is not null or exists (
      select 1 from public.lab_task_completions tc where tc.user_id = p_user and tc.lab_id = l.lab_id)))
  into lessons_total, lessons_done, lessons_started, quizzes_total, quizzes_passed, quizzes_tried,
       practice_total, practice_done, practice_started, validation_total, validation_done, validation_started
  from public.skill_links l
  left join public.lesson_progress lp on lp.user_id = p_user and lp.lesson_id = l.lesson_id
  left join public.lab_completions lc on lc.user_id = p_user and lc.lab_id = l.lab_id
  where l.skill_id = p_skill;

  if validation_total > 0 and validation_done = validation_total then
    return 'validated';
  end if;
  if lessons_total > 0 and lessons_done = lessons_total and quizzes_passed = quizzes_total and practice_done > 0 then
    return 'exercises_mastered';
  end if;
  if lessons_total > 0 and lessons_done = lessons_total then
    return 'consolidating';
  end if;
  if lessons_started > 0 or quizzes_tried > 0 or practice_started > 0 or validation_started > 0 then
    return 'learning';
  end if;
  return 'not_studied';
end $$;

create function private.sync_skills(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  new_state text;
  old_state text;
begin
  for s in select id, name from public.skills loop
    new_state := private.skill_state(p_user, s.id);
    select state into old_state from public.user_skills where user_id = p_user and skill_id = s.id;
    if new_state = 'not_studied' then
      delete from public.user_skills where user_id = p_user and skill_id = s.id;
      continue;
    end if;
    if old_state is distinct from new_state then
      insert into public.user_skills (user_id, skill_id, state) values (p_user, s.id, new_state)
      on conflict (user_id, skill_id) do update set state = excluded.state, changed_at = now();
      if new_state in ('exercises_mastered', 'validated')
         and private.skill_order(new_state) > private.skill_order(coalesce(old_state, 'none')) then
        perform private.notify(p_user, 'achievement',
          case new_state when 'validated' then 'Compétence validée' else 'Compétence maîtrisée en exercice' end,
          s.name, '/competences', jsonb_build_object('skill_id', s.id, 'state', new_state));
      end if;
    end if;
  end loop;
end $$;

create function private.academy_metrics(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'min_level', p.level,
    'lessons_completed', (select count(*) from public.lesson_progress lp where lp.user_id = p.id and lp.status = 'completed'),
    'labs_solved', (select count(*) from public.lab_completions lc where lc.user_id = p.id),
    'courses_completed', (select count(*) from public.enrollments e where e.user_id = p.id and e.status = 'completed'),
    'skills_mastered', (select count(*) from public.user_skills us where us.user_id = p.id and us.state in ('exercises_mastered', 'validated')),
    'skills_validated', (select count(*) from public.user_skills us where us.user_id = p.id and us.state = 'validated'))
  from public.profiles p where p.id = p_user
$$;

create function private.evaluate_rank(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := private.academy_metrics(p_user);
  r public.ranks;
  met boolean;
begin
  if m is null then
    return;
  end if;
  for r in
    select rk.* from public.ranks rk
    where not exists (select 1 from public.user_ranks ur where ur.user_id = p_user and ur.rank_id = rk.id)
    order by rk.position
  loop
    select coalesce(bool_and(coalesce((m ->> k.key)::integer, 0) >= k.value::integer), true)
    into met from jsonb_each_text(r.criteria) k;
    if met then
      insert into public.user_ranks (user_id, rank_id) values (p_user, r.id) on conflict do nothing;
      if found and r.position > 1 then
        perform private.notify(p_user, 'level', 'Nouveau grade : ' || r.name, r.description, '/competences',
          jsonb_build_object('rank_id', r.id, 'slug', r.slug));
      end if;
    end if;
  end loop;
end $$;

-- Single completion path for labs (flag labs, task labs): XP ledger, activity, badges, rank.
create function private.finish_lab(p_user uuid, p_lab public.labs) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.lab_completions (user_id, lab_id, xp_awarded) values (p_user, p_lab.id, p_lab.xp_reward)
  on conflict do nothing;
  if not found then
    return false;
  end if;
  perform private.award_xp(p_user, p_lab.xp_reward, 'lab_completed', 'lab', p_lab.id::text, 'Lab : ' || p_lab.title);
  perform private.record_activity(p_user, 0, 0, 1, 0);
  perform private.log_activity(p_user, 'lab_complete', p_lab.id::text, p_lab.title, '/challenges/' || p_lab.slug, p_lab.xp_reward);
  perform private.after_progress(p_user, null);
  return true;
end $$;

-- --- Engine hooks (replace the existing bodies, same signatures) -----------------------------

create or replace function private.prepare_lab_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if not exists (select 1 from private.lab_flags where lab_id = new.id)
       and not exists (
         select 1 from public.lab_tasks t join private.lab_task_keys k on k.task_id = t.id where t.lab_id = new.id) then
      raise exception 'Définis la réponse attendue ou les tâches du lab avant de le publier.' using errcode = '22023', hint = 'cyberpingo';
    end if;
    new.published_at := now();
  end if;
  return new;
end $$;

create or replace function private.evaluate_badges(p_user uuid) returns void
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
        when 'lab_completed' then (select count(*) from public.lab_completions
          where user_id = p_user and lab_id = b.criteria_lab_id)
        when 'skill_validated' then (select count(*) from public.user_skills
          where user_id = p_user and skill_id = b.criteria_skill_id and state = 'validated')
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

create or replace function private.after_progress(p_user uuid, p_course uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_course_completion(p_user, p_course);
  perform private.sync_skills(p_user);
  perform private.evaluate_badges(p_user);
  perform private.check_daily_goal(p_user);
  perform private.refresh_challenges(p_user);
  perform private.evaluate_badges(p_user);
  perform private.evaluate_rank(p_user);
end $$;

create or replace function private.reward_summary(p_user uuid, p_xp_before integer, p_level_before integer) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'xp_gained', p.xp - p_xp_before,
    'level_info', private.level_info(p.xp),
    'leveled_up', p.level > p_level_before,
    'current_streak', private.effective_streak(p.id),
    'longest_streak', p.longest_streak,
    'new_badges', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'slug', b.slug, 'name', b.name, 'description', b.description,
        'icon', b.icon, 'rarity', b.rarity) order by b.position)
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
      from public.certificates ce where ce.user_id = p.id and ce.issued_at = now() limit 1),
    'new_rank', (
      select jsonb_build_object('slug', r.slug, 'name', r.name, 'description', r.description, 'position', r.position)
      from public.user_ranks ur join public.ranks r on r.id = ur.rank_id
      where ur.user_id = p.id and ur.achieved_at = now() and r.position > 1 order by r.position desc limit 1),
    'new_skills', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'slug', s.slug, 'name', s.name, 'state', us.state) order by s.position)
      from public.user_skills us join public.skills s on s.id = us.skill_id
      where us.user_id = p.id and us.changed_at = now()), '[]'::jsonb)
  )
  from public.profiles p where p.id = p_user;
$$;

create or replace function public.reset_my_progress() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  perform private.lock_profile(uid);
  delete from public.lesson_progress where user_id = uid;
  delete from public.quiz_attempts where user_id = uid;
  delete from public.lab_completions where user_id = uid;
  delete from public.lab_task_completions where user_id = uid;
  delete from public.lab_submissions where user_id = uid;
  delete from public.enrollments where user_id = uid;
  delete from public.user_badges where user_id = uid;
  delete from public.user_challenges where user_id = uid;
  delete from public.user_skills where user_id = uid;
  delete from public.user_ranks where user_id = uid;
  delete from public.daily_activity where user_id = uid;
  delete from public.xp_transactions where user_id = uid;
  update public.profiles set current_streak = 0, longest_streak = 0, last_activity_date = null where id = uid;
  perform private.log_activity(uid, 'reset', null, 'Progression réinitialisée');
end $$;

-- --- Learner RPCs ------------------------------------------------------------------------------

create function public.submit_lab_task(p_task_id uuid, p_answer text) returns jsonb
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

create function public.submit_lab_report(p_lab_id uuid, p_note text, p_link text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  lab public.labs;
  existing public.lab_submissions;
begin
  perform private.lock_profile(uid);
  select * into lab from public.labs where id = p_lab_id;
  if not found or lab.status <> 'published' then
    raise exception 'Ce lab n’est pas disponible.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) not between 1 and 2000 then
    raise exception 'Décris ton travail (2000 caractères maximum).' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if p_link is not null and (p_link !~ '^https://\S{4,}$' or char_length(p_link) > 508) then
    raise exception 'Le lien doit être une adresse https valide.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  select * into existing from public.lab_submissions where user_id = uid and lab_id = lab.id;
  if found and existing.status = 'approved' then
    raise exception 'Ce rapport a déjà été validé.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  perform private.enforce_rate_limit('labreport:' || uid::text, 5, interval '1 hour',
    'Trop d’envois. Réessaie dans une heure.');
  insert into public.lab_submissions (user_id, lab_id, note, link)
  values (uid, lab.id, btrim(p_note), nullif(btrim(coalesce(p_link, '')), ''))
  on conflict (user_id, lab_id) do update
    set note = excluded.note, link = excluded.link, status = 'pending', updated_at = now();
end $$;

-- Competence profile + rank, computed from the learner's real activity.
create function public.get_my_academy() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  m jsonb := private.academy_metrics(uid);
  cur public.ranks;
  nxt public.ranks;
begin
  select r.* into cur from public.ranks r join public.user_ranks ur on ur.rank_id = r.id
  where ur.user_id = uid order by r.position desc limit 1;
  if not found then
    select * into cur from public.ranks order by position limit 1;
  end if;
  select * into nxt from public.ranks where position > coalesce(cur.position, 0) order by position limit 1;

  return jsonb_build_object(
    'metrics', m,
    'rank', case when cur.id is null then null else jsonb_build_object(
      'slug', cur.slug, 'name', cur.name, 'description', cur.description, 'position', cur.position,
      'achieved_at', (select ur.achieved_at from public.user_ranks ur where ur.user_id = uid and ur.rank_id = cur.id)) end,
    'next_rank', case when nxt.id is null then null else jsonb_build_object(
      'slug', nxt.slug, 'name', nxt.name, 'description', nxt.description, 'position', nxt.position,
      'requirements', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'key', k.key, 'required', k.value::integer, 'current', coalesce((m ->> k.key)::integer, 0)) order by k.key), '[]'::jsonb)
        from jsonb_each_text(nxt.criteria) k)) end,
    'ranks', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'slug', r.slug, 'name', r.name, 'description', r.description, 'position', r.position,
        'criteria', r.criteria, 'achieved', ur.user_id is not null) order by r.position), '[]'::jsonb)
      from public.ranks r left join public.user_ranks ur on ur.rank_id = r.id and ur.user_id = uid),
    'domains', (
      select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'slug', d.slug, 'name', d.name,
        'description', d.description, 'icon', d.icon) order by d.position), '[]'::jsonb)
      from public.domains d),
    'skills', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'slug', s.slug, 'name', s.name, 'description', s.description, 'domain_id', s.domain_id,
        'state', private.skill_state(uid, s.id),
        'links', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'kind', l.kind,
            'id', coalesce(l.lesson_id, l.quiz_id, l.lab_id),
            'title', coalesce(ls.title, qz.title, lb.title),
            'slug', lb.slug,
            'done', case l.kind
              when 'lesson' then exists (select 1 from public.lesson_progress lp
                where lp.user_id = uid and lp.lesson_id = l.lesson_id and lp.status = 'completed')
              when 'quiz' then exists (select 1 from public.quiz_attempts qa
                where qa.user_id = uid and qa.quiz_id = l.quiz_id and qa.passed)
              else exists (select 1 from public.lab_completions lc where lc.user_id = uid and lc.lab_id = l.lab_id)
            end) order by l.created_at, l.id), '[]'::jsonb)
          from public.skill_links l
          left join public.lessons ls on ls.id = l.lesson_id
          left join public.courses cs on cs.id = ls.course_id
          left join public.quizzes qz on qz.id = l.quiz_id
          left join public.courses cq on cq.id = qz.course_id
          left join public.labs lb on lb.id = l.lab_id
          where l.skill_id = s.id and coalesce(cs.status, cq.status, lb.status) = 'published')
      ) order by coalesce(d.position, 0), s.position), '[]'::jsonb)
      from public.skills s left join public.domains d on d.id = s.domain_id));
end $$;

-- --- Admin RPCs ----------------------------------------------------------------------------------

create function public.admin_get_lab_tasks(p_lab_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t.id, 'prompt', t.prompt, 'hint', t.hint, 'answer_format', t.answer_format,
      'accepted', to_jsonb(k.accepted), 'explanation', k.explanation) order by t.position, t.created_at)
    from public.lab_tasks t left join private.lab_task_keys k on k.task_id = t.id
    where t.lab_id = p_lab_id), '[]'::jsonb);
end $$;

-- Replaces the whole task list of a lab in one transaction (ids are kept so progress survives edits).
create function public.admin_set_lab_tasks(p_lab_id uuid, p_tasks jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  lab public.labs;
  t jsonb;
  v_task uuid;
  kept uuid[] := '{}';
  pos integer := 0;
  v_prompt text;
  v_hint text;
  v_format text;
  v_explanation text;
  v_accepted text[];
begin
  perform private.require_admin();
  select * into lab from public.labs where id = p_lab_id;
  if not found then
    raise exception 'Lab introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  if p_tasks is null or jsonb_typeof(p_tasks) <> 'array' or jsonb_array_length(p_tasks) > 30 then
    raise exception 'Une liste de 30 tâches maximum est attendue.' using errcode = '22023', hint = 'cyberpingo';
  end if;

  for t in select value from jsonb_array_elements(p_tasks) loop
    pos := pos + 1;
    v_prompt := btrim(coalesce(t ->> 'prompt', ''));
    v_hint := btrim(coalesce(t ->> 'hint', ''));
    v_format := btrim(coalesce(t ->> 'answer_format', ''));
    v_explanation := btrim(coalesce(t ->> 'explanation', ''));
    if char_length(v_prompt) not between 1 and 600 then
      raise exception 'Tâche %: l’énoncé doit contenir entre 1 et 600 caractères.', pos using errcode = '22023', hint = 'cyberpingo';
    end if;
    if char_length(v_hint) > 400 or char_length(v_format) > 120 or char_length(v_explanation) > 1000 then
      raise exception 'Tâche %: un champ dépasse la longueur autorisée.', pos using errcode = '22023', hint = 'cyberpingo';
    end if;
    if jsonb_typeof(t -> 'accepted') is distinct from 'array' then
      raise exception 'Tâche %: liste de réponses acceptées manquante.', pos using errcode = '22023', hint = 'cyberpingo';
    end if;
    select coalesce(array_agg(btrim(a)), '{}') into v_accepted
    from jsonb_array_elements_text(t -> 'accepted') a where char_length(btrim(a)) > 0;
    if cardinality(v_accepted) not between 1 and 8 or exists (select 1 from unnest(v_accepted) a where char_length(a) > 200) then
      raise exception 'Tâche %: entre 1 et 8 réponses de 200 caractères maximum.', pos using errcode = '22023', hint = 'cyberpingo';
    end if;

    v_task := nullif(t ->> 'id', '')::uuid;
    if v_task is not null and not exists (select 1 from public.lab_tasks where id = v_task and lab_id = p_lab_id) then
      raise exception 'Tâche %: identifiant inconnu pour ce lab.', pos using errcode = '22023', hint = 'cyberpingo';
    end if;
    if v_task is null then
      insert into public.lab_tasks (lab_id, position, prompt, hint, answer_format)
      values (p_lab_id, pos, v_prompt, v_hint, v_format) returning id into v_task;
    else
      update public.lab_tasks set position = pos, prompt = v_prompt, hint = v_hint, answer_format = v_format, updated_at = now()
      where id = v_task;
    end if;
    insert into private.lab_task_keys (task_id, accepted, explanation) values (v_task, v_accepted, v_explanation)
    on conflict (task_id) do update set accepted = excluded.accepted, explanation = excluded.explanation;
    kept := kept || v_task;
  end loop;

  delete from public.lab_tasks where lab_id = p_lab_id and id <> all(kept);
  if lab.status = 'published' and pos = 0 and not exists (select 1 from private.lab_flags where lab_id = p_lab_id) then
    raise exception 'Un lab publié a besoin d’une réponse attendue ou de tâches.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  perform private.log_admin('set_lab_tasks', 'lab', p_lab_id::text, jsonb_build_object('tasks', pos));
end $$;

create function public.admin_review_submission(p_id uuid, p_status text, p_feedback text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare
  sub public.lab_submissions;
  lab public.labs;
  v_note text := btrim(coalesce(p_feedback, ''));
begin
  perform private.require_admin();
  if p_status not in ('approved', 'changes_requested') then
    raise exception 'Statut de relecture invalide.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if char_length(v_note) > 1000 or (p_status = 'changes_requested' and char_length(v_note) = 0) then
    raise exception 'Ajoute un retour (1000 caractères maximum) pour demander des corrections.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  select * into sub from public.lab_submissions where id = p_id;
  if not found then
    raise exception 'Rapport introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  select * into lab from public.labs where id = sub.lab_id;
  update public.lab_submissions
  set status = p_status, feedback = v_note, reviewed_by = (select auth.uid()), reviewed_at = now(), updated_at = now()
  where id = p_id;
  perform private.notify(sub.user_id, 'challenge',
    case p_status when 'approved' then 'Rapport validé : ' else 'Corrections demandées : ' end || lab.title,
    v_note, '/challenges/' || lab.slug, jsonb_build_object('lab_id', lab.id, 'status', p_status));
  perform private.log_admin('review_submission', 'lab_submission', p_id::text,
    jsonb_build_object('status', p_status, 'lab', lab.slug));
end $$;

-- --- Triggers ----------------------------------------------------------------------------------------

create trigger domains_touch before update on public.domains for each row execute function private.touch_updated_at();
create trigger lab_tasks_touch before update on public.lab_tasks for each row execute function private.touch_updated_at();
create trigger lab_assets_touch before update on public.lab_assets for each row execute function private.touch_updated_at();
create trigger lab_submissions_touch before update on public.lab_submissions for each row execute function private.touch_updated_at();
create trigger skills_touch before update on public.skills for each row execute function private.touch_updated_at();
create trigger ranks_touch before update on public.ranks for each row execute function private.touch_updated_at();
create trigger mascot_lines_touch before update on public.mascot_lines for each row execute function private.touch_updated_at();

create trigger domains_audit after insert or update or delete on public.domains for each row execute function private.audit_admin_change();
create trigger lab_tasks_audit after insert or update or delete on public.lab_tasks for each row execute function private.audit_admin_change();
create trigger lab_assets_audit after insert or update or delete on public.lab_assets for each row execute function private.audit_admin_change();
create trigger skills_audit after insert or update or delete on public.skills for each row execute function private.audit_admin_change();
create trigger skill_links_audit after insert or update or delete on public.skill_links for each row execute function private.audit_admin_change();
create trigger ranks_audit after insert or update or delete on public.ranks for each row execute function private.audit_admin_change();
create trigger mascot_lines_audit after insert or update or delete on public.mascot_lines for each row execute function private.audit_admin_change();

-- --- Row level security ----------------------------------------------------------------------------------

alter table public.domains enable row level security;
alter table public.lab_tasks enable row level security;
alter table private.lab_task_keys enable row level security;
alter table public.lab_task_completions enable row level security;
alter table public.lab_assets enable row level security;
alter table public.lab_submissions enable row level security;
alter table public.skills enable row level security;
alter table public.skill_links enable row level security;
alter table public.user_skills enable row level security;
alter table public.ranks enable row level security;
alter table public.user_ranks enable row level security;
alter table public.mascot_lines enable row level security;

create policy "Domains are public" on public.domains for select to anon, authenticated using (true);
create policy "Staff insert domains" on public.domains for insert to authenticated with check ((select public.is_admin()));
create policy "Staff update domains" on public.domains for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff delete domains" on public.domains for delete to authenticated using ((select public.is_admin()));

create policy "Skills are public" on public.skills for select to anon, authenticated using (true);
create policy "Staff insert skills" on public.skills for insert to authenticated with check ((select public.is_admin()));
create policy "Staff update skills" on public.skills for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff delete skills" on public.skills for delete to authenticated using ((select public.is_admin()));

create policy "Skill links are public" on public.skill_links for select to anon, authenticated using (true);
create policy "Staff insert skill links" on public.skill_links for insert to authenticated with check ((select public.is_admin()));
create policy "Staff update skill links" on public.skill_links for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff delete skill links" on public.skill_links for delete to authenticated using ((select public.is_admin()));

create policy "Ranks are public" on public.ranks for select to anon, authenticated using (true);
create policy "Staff insert ranks" on public.ranks for insert to authenticated with check ((select public.is_admin()));
create policy "Staff update ranks" on public.ranks for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff delete ranks" on public.ranks for delete to authenticated using ((select public.is_admin()));

create policy "Tasks follow lab visibility" on public.lab_tasks for select to anon, authenticated
  using (lab_id in (select id from public.labs));

create policy "Assets follow lab visibility" on public.lab_assets for select to anon, authenticated
  using (lab_id in (select id from public.labs));
create policy "Staff insert lab assets" on public.lab_assets for insert to authenticated with check ((select public.is_admin()));
create policy "Staff update lab assets" on public.lab_assets for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff delete lab assets" on public.lab_assets for delete to authenticated using ((select public.is_admin()));

create policy "Active mascot lines are public" on public.mascot_lines for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "Staff insert mascot lines" on public.mascot_lines for insert to authenticated with check ((select public.is_admin()));
create policy "Staff update mascot lines" on public.mascot_lines for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff delete mascot lines" on public.mascot_lines for delete to authenticated using ((select public.is_admin()));

create policy "Own task completions or staff" on public.lab_task_completions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own reports or staff" on public.lab_submissions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own skills or staff" on public.user_skills for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own ranks or staff" on public.user_ranks for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- --- Privileges ----------------------------------------------------------------------------------------------

revoke all on public.domains, public.lab_tasks, public.lab_task_completions, public.lab_assets, public.lab_submissions,
  public.skills, public.skill_links, public.user_skills, public.ranks, public.user_ranks, public.mascot_lines
from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

grant select on public.domains, public.lab_tasks, public.lab_assets, public.skills, public.skill_links,
  public.ranks, public.mascot_lines to anon, authenticated;
grant select on public.lab_task_completions, public.lab_submissions, public.user_skills, public.user_ranks to authenticated;

-- Staff editing (RLS restricts every write to admins; the audit triggers log it).
grant insert, delete on public.domains, public.lab_assets, public.skills, public.skill_links, public.ranks, public.mascot_lines to authenticated;
grant update (slug, name, description, icon, position) on public.domains to authenticated;
grant update (kind, title, description, url, position) on public.lab_assets to authenticated;
grant update (domain_id, slug, name, description, position) on public.skills to authenticated;
grant update (skill_id, kind, lesson_id, quiz_id, lab_id) on public.skill_links to authenticated;
grant update (slug, name, description, position, criteria) on public.ranks to authenticated;
grant update (event, expression, text_fr, audio_url, voice_credit, priority, is_active, position) on public.mascot_lines to authenticated;
grant update (domain_id) on public.courses to authenticated;
grant update (course_id, format, briefing, constraints, tools, requires_computer, is_assessment, estimated_minutes)
  on public.labs to authenticated;
grant update (criteria_lab_id, criteria_skill_id, rarity) on public.badges to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function
  public.submit_lab_task(uuid, text), public.submit_lab_report(uuid, text, text), public.get_my_academy(),
  public.admin_get_lab_tasks(uuid), public.admin_set_lab_tasks(uuid, jsonb), public.admin_review_submission(uuid, text, text),
  public.reset_my_progress()
from public, anon;
grant execute on function
  public.submit_lab_task(uuid, text), public.submit_lab_report(uuid, text, text), public.get_my_academy(),
  public.admin_get_lab_tasks(uuid), public.admin_set_lab_tasks(uuid, jsonb), public.admin_review_submission(uuid, text, text),
  public.reset_my_progress()
to authenticated;
