-- CyberPingo · Phase 4 & 5 — Gamification and certificates
-- Levels, the XP ledger (single source of truth for profiles.xp / profiles.level), badges,
-- daily activity, challenges, in-app notifications and verifiable certificates.
-- Rewards are only granted by the progress engine (next migration); clients can read, never write.

-- ─── Levels ───────────────────────────────────────────────────────────────────

create table public.levels (
  level integer primary key check (level >= 1),
  required_xp integer not null unique check (required_xp >= 0),
  title text not null check (char_length(btrim(title)) between 2 and 60)
);

-- Level n requires 50·n·(n−1) XP: 0, 100, 300, 600, 1000, 1500…
insert into public.levels (level, required_xp, title)
select n, 50 * n * (n - 1), (array[
  'Recrue', 'Curieux', 'Apprenti', 'Veilleur', 'Gardien', 'Analyste junior', 'Analyste', 'Défenseur',
  'Chasseur de menaces', 'Enquêteur numérique', 'Spécialiste', 'Architecte sécurité', 'Expert', 'Mentor',
  'Stratège', 'Sentinelle', 'Maître cyber', 'Légende', 'Gardien d’élite', 'Grand maître'
])[n]
from generate_series(1, 20) as n;

create function private.level_for_xp(p_xp integer) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(max(level), 1) from public.levels where required_xp <= greatest(p_xp, 0);
$$;

-- ─── Notifications ────────────────────────────────────────────────────────────

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('achievement', 'course', 'challenge', 'system', 'certificate', 'streak', 'level')),
  title text not null check (char_length(btrim(title)) between 2 and 160),
  body text not null default '' check (char_length(body) <= 1000),
  link text check (link is null or (link ~ '^/\S*$' and length(link) <= 301)),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create function private.notify(p_user uuid, p_type text, p_title text, p_body text default '', p_link text default null, p_data jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, type, title, body, link, data)
  values (p_user, p_type, left(p_title, 160), left(coalesce(p_body, ''), 1000), p_link, coalesce(p_data, '{}'::jsonb));
end $$;

-- ─── XP ledger ────────────────────────────────────────────────────────────────

create table public.xp_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount <> 0 and amount between -100000 and 100000),
  reason text not null check (reason in (
    'lesson_completed', 'quiz_completed', 'lab_completed', 'challenge_completed', 'course_completed',
    'achievement', 'daily_goal', 'admin_adjustment'
  )),
  reference_type text check (reference_type in ('lesson', 'quiz', 'lab', 'challenge', 'course', 'badge', 'day', 'admin')),
  reference_id text,
  label text not null default '' check (char_length(label) <= 200),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (amount > 0 or reason = 'admin_adjustment')
);
create index xp_transactions_user_idx on public.xp_transactions (user_id, created_at desc);
-- One-shot rewards can never be granted twice, even under concurrent requests.
create unique index xp_transactions_once on public.xp_transactions (user_id, reason, reference_id)
  where reason in ('lesson_completed', 'lab_completed', 'challenge_completed', 'course_completed', 'achievement', 'daily_goal');

-- Keeps profiles.xp = SUM(ledger) and profiles.level = level_for_xp(xp) at all times.
create function private.apply_xp_ledger() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  target uuid := coalesce(new.user_id, old.user_id);
  before_level integer;
  total integer;
  after_level integer;
begin
  select level into before_level from public.profiles where id = target for update;
  if not found then
    return null;
  end if;
  select greatest(coalesce(sum(amount), 0), 0) into total from public.xp_transactions where user_id = target;
  after_level := private.level_for_xp(total);
  update public.profiles set xp = total, level = after_level where id = target;

  if tg_op = 'INSERT' and after_level > before_level then
    perform private.notify(target, 'level',
      'Niveau ' || after_level || ' atteint !',
      'Tu es maintenant « ' || (select title from public.levels where level = after_level) || ' ». Continue comme ça.',
      '/progression', jsonb_build_object('level', after_level));
    perform private.log_activity(target, 'level_up', after_level::text, 'Niveau ' || after_level || ' atteint', null, 0);
  end if;
  return null;
end $$;
create trigger xp_transactions_apply after insert or delete on public.xp_transactions
for each row execute function private.apply_xp_ledger();

-- ─── Badges ───────────────────────────────────────────────────────────────────

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 300),
  icon text not null default 'award' check (icon ~ '^[a-z0-9-]{2,40}$'),
  criteria_type text not null check (criteria_type in (
    'lessons_completed', 'quizzes_passed', 'courses_completed', 'streak_days', 'xp_total',
    'labs_solved', 'certificates_earned', 'course_completed'
  )),
  criteria_value integer not null default 1 check (criteria_value between 1 and 1000000),
  criteria_course_id uuid references public.courses (id) on delete cascade,
  xp_reward integer not null default 0 check (xp_reward between 0 and 5000),
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((criteria_type = 'course_completed') = (criteria_course_id is not null))
);
create trigger badges_touch before update on public.badges for each row execute function private.touch_updated_at();
create trigger badges_audit after insert or update or delete on public.badges for each row execute function private.audit_admin_change();

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
create index user_badges_badge_idx on public.user_badges (badge_id);

insert into public.badges (slug, name, description, icon, criteria_type, criteria_value, xp_reward, position) values
  ('premier-pas', 'Premier pas', 'Terminer ta première leçon.', 'footprints', 'lessons_completed', 1, 10, 10),
  ('premier-quiz', 'Premier quiz réussi', 'Réussir ton premier quiz.', 'check-circle', 'quizzes_passed', 1, 10, 20),
  ('assidu', 'Assidu', 'Terminer 10 leçons.', 'book-open', 'lessons_completed', 10, 30, 30),
  ('premier-flag', 'Premier flag', 'Résoudre ton premier lab pratique.', 'flag', 'labs_solved', 1, 20, 40),
  ('serie-3', 'Série de 3 jours', 'Apprendre 3 jours d’affilée.', 'flame', 'streak_days', 3, 15, 50),
  ('serie-7', '7 jours consécutifs', 'Apprendre 7 jours d’affilée.', 'flame', 'streak_days', 7, 40, 60),
  ('serie-30', 'Mois de feu', 'Apprendre 30 jours d’affilée.', 'zap', 'streak_days', 30, 150, 70),
  ('premier-cours', 'Premier cours terminé', 'Terminer entièrement un parcours.', 'graduation-cap', 'courses_completed', 1, 50, 80),
  ('xp-1000', '1000 XP', 'Cumuler 1000 points d’expérience.', 'star', 'xp_total', 1000, 0, 90),
  ('premiere-certification', 'Première certification', 'Obtenir ton premier certificat CyberPingo.', 'award', 'certificates_earned', 1, 50, 100);

-- ─── Daily activity (per learner, per local calendar day) ─────────────────────

create table public.daily_activity (
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_date date not null,
  lessons_completed integer not null default 0 check (lessons_completed >= 0),
  quizzes_passed integer not null default 0 check (quizzes_passed >= 0),
  labs_solved integer not null default 0 check (labs_solved >= 0),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  study_minutes integer not null default 0 check (study_minutes >= 0),
  primary key (user_id, activity_date)
);

-- ─── Challenges ───────────────────────────────────────────────────────────────

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 500),
  icon text not null default 'target' check (icon ~ '^[a-z0-9-]{2,40}$'),
  period text not null check (period in ('daily', 'weekly', 'one_time')),
  metric text not null check (metric in ('lessons_completed', 'quizzes_passed', 'xp_earned', 'study_minutes', 'labs_solved')),
  target integer not null check (target between 1 and 100000),
  xp_reward integer not null default 20 check (xp_reward between 0 and 5000),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  position integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create trigger challenges_touch before update on public.challenges for each row execute function private.touch_updated_at();
create trigger challenges_created_by before insert on public.challenges for each row execute function private.set_created_by();
create trigger challenges_audit after insert or update or delete on public.challenges for each row execute function private.audit_admin_change();

create table public.user_challenges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  -- First local day of the period (the day, the Monday of the week, or the challenge start).
  period_start date not null,
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, challenge_id, period_start)
);
create index user_challenges_user_idx on public.user_challenges (user_id, period_start desc);

insert into public.challenges (slug, title, description, icon, period, metric, target, xp_reward, position) values
  ('deux-lecons-du-jour', 'Terminer 2 leçons aujourd’hui', 'Deux leçons terminées dans la journée.', 'book-open', 'daily', 'lessons_completed', 2, 30, 10),
  ('cent-xp-du-jour', 'Gagner 100 XP aujourd’hui', 'Cumule 100 XP en une journée.', 'zap', 'daily', 'xp_earned', 100, 25, 20),
  ('vingt-minutes', 'Étudier 20 minutes', 'Passe au moins 20 minutes sur tes leçons aujourd’hui.', 'clock', 'daily', 'study_minutes', 20, 20, 30),
  ('trois-quiz-semaine', 'Réussir 3 quiz cette semaine', 'Trois quiz différents réussis d’ici dimanche.', 'check-circle', 'weekly', 'quizzes_passed', 3, 60, 40);

-- ─── Certificates ─────────────────────────────────────────────────────────────

create sequence private.certificate_number_seq;

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Kept when a course is removed: the certificate stays valid with its snapshot title.
  course_id uuid references public.courses (id) on delete set null,
  certificate_number text not null unique
    default 'CP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('private.certificate_number_seq')::text, 6, '0'),
  verification_code text not null unique
    default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
    check (verification_code ~ '^[A-Z0-9]{16}$'),
  recipient_name text not null check (char_length(btrim(recipient_name)) between 2 and 80),
  course_title text not null check (char_length(btrim(course_title)) between 2 and 160),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text check (revoked_reason is null or char_length(revoked_reason) <= 300),
  pdf_path text check (pdf_path is null or pdf_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  unique (user_id, course_id)
);
create index certificates_user_idx on public.certificates (user_id, issued_at desc);

-- ─── Row level security ───────────────────────────────────────────────────────

alter table public.levels enable row level security;
alter table public.notifications enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.daily_activity enable row level security;
alter table public.challenges enable row level security;
alter table public.user_challenges enable row level security;
alter table public.certificates enable row level security;

create policy "Levels are public" on public.levels for select to anon, authenticated using (true);

create policy "Own notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Mark own notifications as read" on public.notifications
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Dismiss own notifications" on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "Own XP history or staff" on public.xp_transactions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Active badges are public" on public.badges
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "Staff create badges" on public.badges for insert to authenticated with check ((select public.is_admin()));
create policy "Staff edit badges" on public.badges for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff delete badges" on public.badges for delete to authenticated using ((select public.is_admin()));

create policy "Own badges or staff" on public.user_badges
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own daily activity or staff" on public.daily_activity
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Active challenges are visible" on public.challenges
  for select to authenticated using (is_active or (select public.is_admin()));
create policy "Staff create challenges" on public.challenges for insert to authenticated with check ((select public.is_admin()));
create policy "Staff edit challenges" on public.challenges for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Staff delete challenges" on public.challenges for delete to authenticated using ((select public.is_admin()));

create policy "Own challenge progress or staff" on public.user_challenges
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
-- Public verification goes through public.verify_certificate(), never through this table.
create policy "Own certificates or staff" on public.certificates
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ─── Privileges ───────────────────────────────────────────────────────────────

revoke all on public.levels, public.notifications, public.xp_transactions, public.badges, public.user_badges,
  public.daily_activity, public.challenges, public.user_challenges, public.certificates from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;
revoke all on all sequences in schema private from anon, authenticated;

grant select on public.levels, public.badges to anon, authenticated;
grant select on public.notifications, public.xp_transactions, public.user_badges, public.daily_activity,
  public.challenges, public.user_challenges, public.certificates to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

grant insert, delete on public.badges, public.challenges to authenticated;
grant update (slug, name, description, icon, criteria_type, criteria_value, criteria_course_id, xp_reward, is_active, position)
  on public.badges to authenticated;
grant update (slug, title, description, icon, period, metric, target, xp_reward, is_active, starts_at, ends_at, position)
  on public.challenges to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
