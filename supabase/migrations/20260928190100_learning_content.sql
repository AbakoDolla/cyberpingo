-- CyberPingo · Phase 2 & 3 — Learning content
-- courses → course_modules → lessons, quizzes → quiz_questions → quiz_answers, and hands-on labs.
-- Visitors see the published catalogue outline; signed-in learners also read lesson content and
-- quiz questions. Correct answers, explanations and lab flags are never readable by learners:
-- grading happens in the progress engine (next migration).

-- ─── Courses ──────────────────────────────────────────────────────────────────

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 80),
  title text not null check (char_length(btrim(title)) between 3 and 160),
  short_description text not null default '' check (char_length(short_description) <= 280),
  description text not null default '' check (char_length(description) <= 5000),
  thumbnail_url text check (thumbnail_url is null or (thumbnail_url ~ '^https://\S{4,}$' and length(thumbnail_url) <= 508)),
  level text not null default 'debutant' check (level in ('debutant', 'intermediaire', 'avance')),
  category text not null default 'Fondamentaux' check (char_length(btrim(category)) between 2 and 60),
  icon text not null default 'fondamentaux' check (icon ~ '^[a-z0-9-]{2,40}$'),
  -- Minutes; the admin editor keeps it in sync with the lessons.
  estimated_duration integer not null default 0 check (estimated_duration between 0 and 10000),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  -- Only free courses are open today; the column prepares premium, private and cohort access.
  access_level text not null default 'free' check (access_level in ('free', 'premium', 'private')),
  position integer not null default 0,
  completion_xp integer not null default 100 check (completion_xp between 0 and 5000),
  certificate_enabled boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (status <> 'published' or published_at is not null)
);
create index courses_catalog_idx on public.courses (status, position, created_at);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  description text not null default '' check (char_length(description) <= 1000),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index course_modules_course_idx on public.course_modules (course_id, position);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  -- Derived from the module by a trigger; kept on the row for fast visibility checks.
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid not null references public.course_modules (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  summary text not null default '' check (char_length(summary) <= 500),
  content_type text not null default 'article' check (content_type in ('article', 'video', 'exercise', 'mixed')),
  -- {"blocks": [{"type": "text" | "heading" | "schema" | "code" | "example" | "callout", "content": "…", "language"?: "bash"}
  --             | {"type": "video" | "image" | "resource", "url": "https://…", "content"?: "légende"}]}
  content jsonb not null default '{"blocks": []}'::jsonb,
  duration_minutes integer not null default 10 check (duration_minutes between 1 and 240),
  xp_reward integer not null default 50 check (xp_reward between 0 and 1000),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lessons_module_idx on public.lessons (module_id, position);
create index lessons_course_idx on public.lessons (course_id);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  module_id uuid not null references public.course_modules (id) on delete cascade,
  -- A quiz belongs to a lesson (lesson check) or directly to a module (module review).
  lesson_id uuid references public.lessons (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 160),
  description text not null default '' check (char_length(description) <= 1000),
  pass_percentage integer not null default 70 check (pass_percentage between 1 and 100),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index quizzes_one_per_lesson on public.quizzes (lesson_id) where lesson_id is not null;
create index quizzes_module_idx on public.quizzes (module_id, position);
create index quizzes_course_idx on public.quizzes (course_id);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  question_type text not null default 'single_choice' check (question_type in ('single_choice', 'multiple_choice', 'true_false')),
  prompt text not null check (char_length(btrim(prompt)) between 3 and 1000),
  image_url text check (image_url is null or (image_url ~ '^https://\S{4,}$' and length(image_url) <= 508)),
  -- Revealed by submit_quiz only after the learner has answered.
  explanation text not null default '' check (char_length(explanation) <= 2000),
  difficulty text not null default 'facile' check (difficulty in ('facile', 'moyen', 'difficile')),
  xp_reward integer not null default 10 check (xp_reward between 0 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quiz_questions_quiz_idx on public.quiz_questions (quiz_id, position);

create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  label text not null check (char_length(btrim(label)) between 1 and 500),
  -- Not readable by learners (column privileges below).
  is_correct boolean not null default false
);
create index quiz_answers_question_idx on public.quiz_answers (question_id, position);

-- ─── Labs (hands-on challenges with a flag) ───────────────────────────────────

create table public.labs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 80),
  title text not null check (char_length(btrim(title)) between 3 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null default 'securite' check (category in ('reseau', 'linux', 'web', 'cryptographie', 'osint', 'securite')),
  difficulty text not null default 'debutant' check (difficulty in ('debutant', 'intermediaire', 'avance')),
  xp_reward integer not null default 100 check (xp_reward between 0 and 2000),
  objectives text[] not null default '{}' check (cardinality(objectives) <= 12),
  hints text[] not null default '{}' check (cardinality(hints) <= 12),
  terminal_lines text[] not null default '{}' check (cardinality(terminal_lines) <= 80),
  flag_placeholder text not null default 'Ta réponse' check (char_length(flag_placeholder) between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  position integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (status <> 'published' or published_at is not null)
);
create index labs_catalog_idx on public.labs (status, position);

create table private.lab_flags (
  lab_id uuid primary key references public.labs (id) on delete cascade,
  flag text not null check (char_length(btrim(flag)) between 1 and 200)
);

-- ─── Integrity triggers ───────────────────────────────────────────────────────

create trigger courses_touch before update on public.courses for each row execute function private.touch_updated_at();
create trigger course_modules_touch before update on public.course_modules for each row execute function private.touch_updated_at();
create trigger lessons_touch before update on public.lessons for each row execute function private.touch_updated_at();
create trigger quizzes_touch before update on public.quizzes for each row execute function private.touch_updated_at();
create trigger quiz_questions_touch before update on public.quiz_questions for each row execute function private.touch_updated_at();
create trigger labs_touch before update on public.labs for each row execute function private.touch_updated_at();

create function private.set_created_by() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.created_by := coalesce((select auth.uid()), new.created_by);
  return new;
end $$;
create trigger courses_created_by before insert on public.courses for each row execute function private.set_created_by();
create trigger labs_created_by before insert on public.labs for each row execute function private.set_created_by();

create function private.prepare_lesson() returns trigger
language plpgsql set search_path = '' as $$
declare
  block jsonb;
  kind text;
  target_course uuid := (select course_id from public.course_modules where id = new.module_id);
begin
  if target_course is null then
    raise exception 'Module introuvable.' using errcode = '23503', hint = 'cyberpingo';
  end if;
  if tg_op = 'UPDATE' and target_course <> old.course_id then
    raise exception 'Une leçon ne peut pas changer de cours.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  new.course_id := target_course;

  if jsonb_typeof(new.content) <> 'object' or jsonb_typeof(new.content -> 'blocks') <> 'array'
     or jsonb_array_length(new.content -> 'blocks') > 80 or pg_column_size(new.content) > 262144 then
    raise exception 'Le contenu de la leçon doit être une liste de 80 blocs au maximum.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  for block in select value from jsonb_array_elements(new.content -> 'blocks') loop
    kind := case when jsonb_typeof(block) = 'object' then block ->> 'type' end;
    if kind in ('video', 'image', 'resource') then
      if coalesce(block ->> 'url', '') !~ '^https://\S{4,}$' or length(block ->> 'url') > 508 then
        raise exception 'Chaque vidéo, image ou ressource doit avoir une adresse https valide.' using errcode = '22023', hint = 'cyberpingo';
      end if;
    elsif kind in ('text', 'heading', 'schema', 'code', 'example', 'callout') then
      if jsonb_typeof(block -> 'content') <> 'string' or char_length(block ->> 'content') not between 1 and 20000 then
        raise exception 'Chaque bloc de texte doit contenir entre 1 et 20 000 caractères.' using errcode = '22023', hint = 'cyberpingo';
      end if;
    else
      raise exception 'Type de bloc de leçon inconnu : %.', coalesce(kind, '?') using errcode = '22023', hint = 'cyberpingo';
    end if;
  end loop;
  return new;
end $$;
create trigger lessons_prepare before insert or update on public.lessons for each row execute function private.prepare_lesson();

create function private.prepare_quiz() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.lesson_id is not null then
    new.module_id := (select module_id from public.lessons where id = new.lesson_id);
    if new.module_id is null then
      raise exception 'Leçon introuvable.' using errcode = '23503', hint = 'cyberpingo';
    end if;
  end if;
  new.course_id := (select course_id from public.course_modules where id = new.module_id);
  if new.course_id is null then
    raise exception 'Module introuvable.' using errcode = '23503', hint = 'cyberpingo';
  end if;
  return new;
end $$;
create trigger quizzes_prepare before insert or update on public.quizzes for each row execute function private.prepare_quiz();

-- A lesson moved to another module of the same course takes its quiz along.
create function private.follow_lesson_module() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.quizzes set module_id = new.module_id where lesson_id = new.id and module_id <> new.module_id;
  return new;
end $$;
create trigger lessons_follow_module after update of module_id on public.lessons
for each row when (old.module_id is distinct from new.module_id) execute function private.follow_lesson_module();

-- Refuses to publish a course learners could not complete.
create function private.assert_course_publishable(p_course uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  broken text;
begin
  if not exists (select 1 from public.course_modules where course_id = p_course) then
    raise exception 'Ajoute au moins un module avant de publier.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  select m.title into broken from public.course_modules m
  where m.course_id = p_course and not exists (select 1 from public.lessons l where l.module_id = m.id)
  order by m.position limit 1;
  if broken is not null then
    raise exception 'Le module « % » ne contient aucune leçon.', broken using errcode = '22023', hint = 'cyberpingo';
  end if;
  select l.title into broken from public.lessons l
  where l.course_id = p_course and jsonb_array_length(l.content -> 'blocks') = 0 limit 1;
  if broken is not null then
    raise exception 'La leçon « % » est vide.', broken using errcode = '22023', hint = 'cyberpingo';
  end if;
  select q.title into broken from public.quizzes q
  where q.course_id = p_course and not exists (select 1 from public.quiz_questions qq where qq.quiz_id = q.id) limit 1;
  if broken is not null then
    raise exception 'Le quiz « % » n’a aucune question.', broken using errcode = '22023', hint = 'cyberpingo';
  end if;
  select qq.prompt into broken from public.quiz_questions qq
  join public.quizzes q on q.id = qq.quiz_id
  where q.course_id = p_course and (
    (select count(*) from public.quiz_answers a where a.question_id = qq.id) < 2
    or (select count(*) from public.quiz_answers a where a.question_id = qq.id and a.is_correct) = 0
  ) limit 1;
  if broken is not null then
    raise exception 'La question « % » doit avoir au moins deux réponses dont une correcte.', left(broken, 80) using errcode = '22023', hint = 'cyberpingo';
  end if;
end $$;

create function private.prepare_course_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    perform private.assert_course_publishable(new.id);
    new.published_at := now();
  end if;
  return new;
end $$;
create trigger courses_status before insert or update of status on public.courses
for each row execute function private.prepare_course_status();

create function private.prepare_lab_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    if not exists (select 1 from private.lab_flags where lab_id = new.id) then
      raise exception 'Définis la réponse attendue du lab avant de le publier.' using errcode = '22023', hint = 'cyberpingo';
    end if;
    new.published_at := now();
  end if;
  return new;
end $$;
create trigger labs_status before insert or update of status on public.labs
for each row execute function private.prepare_lab_status();

create trigger courses_audit after insert or update or delete on public.courses for each row execute function private.audit_admin_change();
create trigger course_modules_audit after insert or update or delete on public.course_modules for each row execute function private.audit_admin_change();
create trigger lessons_audit after insert or update or delete on public.lessons for each row execute function private.audit_admin_change();
create trigger quizzes_audit after insert or update or delete on public.quizzes for each row execute function private.audit_admin_change();
create trigger labs_audit after insert or update or delete on public.labs for each row execute function private.audit_admin_change();

-- ─── Row level security ───────────────────────────────────────────────────────

alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.labs enable row level security;
alter table private.lab_flags enable row level security;

-- Drafts and archives are only visible to staff (an extra policy in the progress engine keeps
-- archived courses readable by learners who were enrolled).
create policy "Published courses are public" on public.courses
  for select to anon, authenticated using (status = 'published' or (select public.is_admin()));
-- Children inherit the visibility of their course: the sub-select is itself filtered by RLS.
create policy "Modules of visible courses" on public.course_modules
  for select to anon, authenticated using (course_id in (select id from public.courses));
create policy "Lessons of visible courses" on public.lessons
  for select to anon, authenticated using (course_id in (select id from public.courses));
create policy "Quizzes of visible courses" on public.quizzes
  for select to anon, authenticated using (course_id in (select id from public.courses));
create policy "Questions of visible quizzes" on public.quiz_questions
  for select to authenticated using (quiz_id in (select id from public.quizzes));
create policy "Answer choices of visible questions" on public.quiz_answers
  for select to authenticated using (question_id in (select id from public.quiz_questions));
create policy "Published labs are public" on public.labs
  for select to anon, authenticated using (status = 'published' or (select public.is_admin()));

create policy "Staff create courses" on public.courses for insert to authenticated with check ((select public.is_admin()));
create policy "Staff edit courses" on public.courses for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff delete courses" on public.courses for delete to authenticated using ((select public.is_admin()));
create policy "Staff create modules" on public.course_modules for insert to authenticated with check ((select public.is_admin()));
create policy "Staff edit modules" on public.course_modules for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff delete modules" on public.course_modules for delete to authenticated using ((select public.is_admin()));
create policy "Staff create lessons" on public.lessons for insert to authenticated with check ((select public.is_admin()));
create policy "Staff edit lessons" on public.lessons for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff delete lessons" on public.lessons for delete to authenticated using ((select public.is_admin()));
create policy "Staff create quizzes" on public.quizzes for insert to authenticated with check ((select public.is_admin()));
create policy "Staff edit quizzes" on public.quizzes for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff delete quizzes" on public.quizzes for delete to authenticated using ((select public.is_admin()));
create policy "Staff create labs" on public.labs for insert to authenticated with check ((select public.is_admin()));
create policy "Staff edit labs" on public.labs for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff delete labs" on public.labs for delete to authenticated using ((select public.is_admin()));

-- ─── Privileges ───────────────────────────────────────────────────────────────

revoke all on public.courses, public.course_modules, public.lessons, public.quizzes,
  public.quiz_questions, public.quiz_answers, public.labs from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

grant select on public.courses, public.course_modules, public.quizzes, public.labs to anon, authenticated;
-- Visitors get the lesson outline; signed-in learners also get the content.
grant select (id, course_id, module_id, title, summary, content_type, duration_minutes, xp_reward, position, created_at, updated_at)
  on public.lessons to anon;
grant select on public.lessons to authenticated;
grant select (id, quiz_id, position, question_type, prompt, image_url, difficulty, xp_reward) on public.quiz_questions to authenticated;
grant select (id, question_id, position, label) on public.quiz_answers to authenticated;

-- Staff content editing (RLS restricts every write to admins; the audit triggers log it).
grant insert, delete on public.courses, public.course_modules, public.lessons, public.quizzes, public.labs to authenticated;
grant update (slug, title, short_description, description, thumbnail_url, level, category, icon, estimated_duration,
  status, access_level, position, completion_xp, certificate_enabled) on public.courses to authenticated;
grant update (title, description, position) on public.course_modules to authenticated;
grant update (module_id, title, summary, content_type, content, duration_minutes, xp_reward, position) on public.lessons to authenticated;
grant update (title, description, pass_percentage, position) on public.quizzes to authenticated;
grant update (slug, title, description, category, difficulty, xp_reward, objectives, hints, terminal_lines,
  flag_placeholder, status, position) on public.labs to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
