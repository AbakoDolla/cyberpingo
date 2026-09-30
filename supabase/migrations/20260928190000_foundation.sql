-- CyberPingo · Phase 1 — Foundation
-- Profiles, roles (user / admin / superadmin), user settings, admin audit log, shared helpers,
-- platform telemetry (sessions, activity feed), contact form and AI mentor quota.
--
-- Security model used by every migration:
--   * clients (anon / authenticated) only READ through row level security;
--   * every privileged write (progress, XP, badges, roles…) goes through SECURITY DEFINER functions
--     that validate the caller, run in a single transaction and never trust client input;
--   * the `private` schema is not exposed by the Data API.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ─── Shared helpers ───────────────────────────────────────────────────────────

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Sliding-window rate limiter shared by contact, quiz, lab and mentor endpoints.
create table private.rate_events (
  key text not null,
  created_at timestamptz not null default now()
);
create index rate_events_key_idx on private.rate_events (key, created_at desc);

create function private.enforce_rate_limit(p_key text, p_max integer, p_window interval, p_message text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from private.rate_events where key = p_key and created_at > now() - p_window) >= p_max then
    raise exception '%', p_message using errcode = 'PT429', hint = 'cyberpingo';
  end if;
  insert into private.rate_events (key) values (p_key);
  if random() < 0.02 then
    delete from private.rate_events where created_at < now() - interval '2 days';
  end if;
end $$;

-- ─── Profiles & roles ─────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  username text not null unique check (username ~ '^[a-z0-9_]{3,32}$'),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 50),
  -- Storage path inside the `avatars` bucket (never an arbitrary URL): "<user id>/<file>".
  avatar_path text check (avatar_path is null or avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'),
  bio text not null default '' check (char_length(bio) <= 280),
  role text not null default 'user' check (role in ('user', 'admin', 'superadmin')),
  goal text not null default 'decouvrir' check (goal in ('decouvrir', 'professionnel', 'emploi', 'competences', 'certification')),
  skill_level text not null default 'debutant' check (skill_level in ('debutant', 'intermediaire', 'avance')),
  daily_minutes integer not null default 20 check (daily_minutes in (10, 20, 30, 45, 60, 90)),
  known_areas text[] not null default '{}' check (known_areas <@ array['reseaux', 'linux', 'programmation', 'securite', 'aucune']::text[]),
  onboarding_completed boolean not null default false,
  -- Maintained exclusively from public.xp_transactions (see the gamification migration).
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  -- Calendar day of the last qualifying activity, in the learner's own timezone.
  last_activity_date date,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (avatar_path is null or split_part(avatar_path, '/', 1) = id::text),
  check (longest_streak >= current_streak)
);
create index profiles_staff_idx on public.profiles (role) where role <> 'user';
create index profiles_xp_idx on public.profiles (xp desc);
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();

create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  timezone text not null default 'Europe/Paris',
  email_notifications boolean not null default true,
  streak_reminders boolean not null default true,
  new_content_alerts boolean not null default true,
  sound_effects boolean not null default true,
  updated_at timestamptz not null default now()
);
create trigger user_settings_touch before update on public.user_settings for each row execute function private.touch_updated_at();

create function private.validate_timezone() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Fuseau horaire inconnu.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  return new;
end $$;
create trigger user_settings_timezone before insert or update of timezone on public.user_settings
for each row execute function private.validate_timezone();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('admin', 'superadmin'));
$$;

create function public.is_superadmin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'superadmin');
$$;

create function private.require_user() returns uuid
language plpgsql stable set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Connexion requise.' using errcode = '28000', hint = 'cyberpingo';
  end if;
  return uid;
end $$;

create function private.require_admin() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  if not public.is_admin() then
    raise exception 'Accès réservé aux administrateurs.' using errcode = '42501', hint = 'cyberpingo';
  end if;
  return uid;
end $$;

create function private.require_superadmin() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  if not public.is_superadmin() then
    raise exception 'Action réservée aux super-administrateurs.' using errcode = '42501', hint = 'cyberpingo';
  end if;
  return uid;
end $$;

-- Local calendar day of a learner, used for streaks, daily goals and challenges.
create function private.user_today(p_user uuid) returns date
language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce((select timezone from public.user_settings where user_id = p_user), 'UTC'))::date;
$$;

create function private.lock_profile(p_user uuid) returns public.profiles
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

-- ─── Admin audit log ──────────────────────────────────────────────────────────

create table public.admin_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) between 3 and 80),
  target_type text not null check (char_length(target_type) between 2 and 40),
  target_id text,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);
create index admin_logs_created_idx on public.admin_logs (created_at desc);
create index admin_logs_actor_idx on public.admin_logs (actor_id, created_at desc);
create index admin_logs_target_idx on public.admin_logs (target_type, target_id);

create function private.log_admin(p_action text, p_target_type text, p_target_id text, p_details jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_logs (actor_id, action, target_type, target_id, details)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'::jsonb));
end $$;

-- Generic audit trigger for admin-managed content tables (only logs changes made by a signed-in user).
create function private.audit_admin_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  row_data jsonb := to_jsonb(coalesce(new, old));
  changed text[];
begin
  if (select auth.uid()) is null then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(key order by key), '{}') into changed
    from jsonb_each(to_jsonb(new)) as fresh(key, value)
    where key not in ('updated_at') and fresh.value is distinct from (to_jsonb(old) -> key);
    if cardinality(changed) = 0 then
      return new;
    end if;
  end if;
  perform private.log_admin(
    lower(tg_op) || '_' || tg_table_name,
    tg_table_name,
    coalesce(row_data ->> 'id', row_data ->> 'slug'),
    jsonb_strip_nulls(jsonb_build_object(
      'title', coalesce(row_data ->> 'title', row_data ->> 'name'),
      'status', row_data ->> 'status',
      'changed', to_jsonb(changed)
    ))
  );
  return coalesce(new, old);
end $$;

-- ─── Account lifecycle ────────────────────────────────────────────────────────

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  candidate text;
  requested_name text;
  requested_zone text := new.raw_user_meta_data ->> 'timezone';
begin
  base := left(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_]', '_', 'g'), 24);
  if char_length(base) < 3 then base := 'apprenant'; end if;
  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    candidate := base || '_' || substr(md5(gen_random_uuid()::text), 1, 6);
  end loop;

  requested_name := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''));
  if char_length(requested_name) not between 2 and 50 then
    requested_name := left(btrim(initcap(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[._-]+', ' ', 'g'))), 50);
  end if;
  if char_length(requested_name) < 2 then requested_name := 'Apprenant'; end if;

  if requested_zone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = requested_zone) then
    requested_zone := 'Europe/Paris';
  end if;

  insert into public.profiles (id, email, display_name, username)
  values (new.id, coalesce(new.email, ''), requested_name, candidate);
  insert into public.user_settings (user_id, timezone) values (new.id, requested_zone);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create function private.sync_user_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = coalesce(new.email, '') where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed after update of email on auth.users
for each row when (old.email is distinct from new.email) execute function private.sync_user_email();

-- ─── Platform telemetry (admin realtime supervision) ─────────────────────────

create table public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in (
    'login', 'logout', 'enroll', 'lesson_start', 'lesson_complete', 'quiz_complete', 'lab_complete',
    'course_complete', 'badge_earned', 'challenge_complete', 'level_up', 'certificate', 'mentor_chat', 'onboarding', 'reset'
  )),
  entity_id text,
  label text not null,
  page text,
  xp_delta integer not null default 0,
  created_at timestamptz not null default now()
);
create index activity_events_created_idx on public.activity_events (created_at desc);
create index activity_events_user_idx on public.activity_events (user_id, created_at desc);

create function private.log_activity(p_user uuid, p_kind text, p_entity text, p_label text, p_page text default null, p_xp integer default 0) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.activity_events (user_id, kind, entity_id, label, page, xp_delta)
  values (p_user, p_kind, p_entity, left(p_label, 200), p_page, coalesce(p_xp, 0));
end $$;

create table public.learner_sessions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  current_page text not null default '/',
  visible boolean not null default true,
  connected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz
);
create index learner_sessions_seen_idx on public.learner_sessions (last_seen_at desc);

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

create table private.mentor_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  requests integer not null default 0,
  primary key (user_id, day)
);

-- ─── Account RPCs ─────────────────────────────────────────────────────────────

create function public.complete_onboarding(p_skill_level text, p_goal text, p_daily_minutes integer, p_known_areas text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  update public.profiles set
    skill_level = p_skill_level, goal = p_goal, daily_minutes = p_daily_minutes,
    known_areas = coalesce(p_known_areas, '{}'), onboarding_completed = true
  where id = uid;
  perform private.log_activity(uid, 'onboarding', null, 'Parcours personnalisé', '/onboarding');
end $$;

create function public.record_login() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  insert into public.learner_sessions (user_id, current_page, visible, connected_at, last_seen_at, ended_at)
  values (uid, '/login', true, now(), now(), null)
  on conflict (user_id) do update set connected_at = now(), last_seen_at = now(), ended_at = null, visible = true;
  perform private.log_activity(uid, 'login', null, 'Connexion', '/login');
end $$;

create function public.heartbeat(p_page text, p_visible boolean default true) returns void
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

create function public.end_session() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  update public.learner_sessions set ended_at = now(), visible = false where user_id = uid;
  perform private.log_activity(uid, 'logout', null, 'Déconnexion');
end $$;

create function public.consume_mentor_quota() returns jsonb
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
  perform private.log_activity(uid, 'mentor_chat', null, 'Question au mentor IA', '/mentor');
  return jsonb_build_object('allowed', true, 'remaining', daily_limit - used, 'limit', daily_limit);
end $$;

-- Public feedback form, rate-limited per account or per hashed client address.
create function public.submit_contact_message(p_subject text, p_email text, p_message text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  forwarded text := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json ->> 'x-forwarded-for';
  sender text;
  message_id uuid;
begin
  sender := case when uid is not null then 'contact:user:' || uid::text
                 else 'contact:ip:' || md5(coalesce(btrim(split_part(forwarded, ',', 1)), 'unknown')) end;
  perform private.enforce_rate_limit(sender, 5, interval '1 hour', 'Trop de messages envoyés. Réessaie dans une heure.');
  insert into public.contact_messages (user_id, email, subject, message)
  values (uid, nullif(btrim(lower(p_email)), ''), p_subject, btrim(p_message))
  returning id into message_id;
  return message_id;
end $$;

create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  if (select role from public.profiles where id = uid) = 'superadmin'
     and (select count(*) from public.profiles where role = 'superadmin') <= 1 then
    raise exception 'Nomme un autre super-administrateur avant de supprimer ce compte.' using errcode = '42501', hint = 'cyberpingo';
  end if;
  delete from auth.users where id = uid;
end $$;

-- ─── Row level security ───────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.admin_logs enable row level security;
alter table public.activity_events enable row level security;
alter table public.learner_sessions enable row level security;
alter table public.contact_messages enable row level security;
alter table private.rate_events enable row level security;
alter table private.mentor_usage enable row level security;

create policy "Profiles are visible to their owner and staff" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Users edit their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Users read their settings" on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users edit their settings" on public.user_settings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "Staff read the audit log" on public.admin_logs
  for select to authenticated using ((select public.is_admin()));

create policy "Own activity or staff" on public.activity_events
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own session or staff" on public.learner_sessions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Staff read contact messages" on public.contact_messages
  for select to authenticated using ((select public.is_admin()));
create policy "Staff triage contact messages" on public.contact_messages
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ─── Privileges: reads go through RLS, writes only through the functions above ─

revoke all on public.profiles, public.user_settings, public.admin_logs, public.activity_events,
  public.learner_sessions, public.contact_messages from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;

grant select on public.profiles, public.user_settings, public.admin_logs, public.activity_events, public.learner_sessions to authenticated;
-- XP, level, streaks and role are deliberately absent: only server functions change them.
grant update (username, display_name, avatar_path, bio, goal, skill_level, daily_minutes, known_areas) on public.profiles to authenticated;
grant update (timezone, email_notifications, streak_reminders, new_content_alerts, sound_effects) on public.user_settings to authenticated;
grant select, update (status) on public.contact_messages to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function
  public.is_admin(), public.is_superadmin(), public.complete_onboarding(text, text, integer, text[]),
  public.record_login(), public.heartbeat(text, boolean), public.end_session(), public.consume_mentor_quota(),
  public.submit_contact_message(text, text, text), public.delete_my_account()
from public, anon;
grant execute on function
  public.is_admin(), public.is_superadmin(), public.complete_onboarding(text, text, integer, text[]),
  public.record_login(), public.heartbeat(text, boolean), public.end_session(), public.consume_mentor_quota(),
  public.submit_contact_message(text, text, text), public.delete_my_account()
to authenticated;
-- Row level security policies on public content call these for visitors too.
grant execute on function public.is_admin(), public.is_superadmin(), public.submit_contact_message(text, text, text) to anon;
