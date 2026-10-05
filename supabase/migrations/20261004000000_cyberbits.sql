-- CyberPingo · CyberBits (CB), la monnaie de la plateforme
--
-- On gagne des CyberBits en apprenant (leçons, quiz, modules, parcours, défis, labs) et on les dépense pour
-- débloquer des parcours intermédiaires ou avancés et des labs. Le prix suit la complexité.
--
-- Invariants :
--   * le registre cb_transactions est en ajout seul, le portefeuille (cb_wallets) en est déduit par un trigger ;
--   * chaque récompense est calculée à partir de la progression réelle (leçons terminées, quiz réussis…), avec une
--     ligne unique par (apprenant, motif, référence) : impossible de la verser deux fois, même en parallèle ;
--   * une dépense est atomique : débit et déblocage dans la même transaction, rien n’est débité si un contrôle échoue ;
--   * les clients ne font jamais d’écriture directe : lecture sous RLS, écriture par des fonctions SECURITY DEFINER ;
--   * private.after_progress() appelle private.sync_cb_rewards() en dernier : toute migration qui le remplace doit
--     conserver cet appel.
--
-- Débloquer un parcours ou un lab ouvre la validation (XP, CyberBits, progression, compétences). La lecture des leçons
-- et des fichiers de lab reste publique, comme avant : le blocage porte sur les actions, pas sur la lecture.

-- ─── Règles, prix par défaut et réglages ─────────────────────────────────────

create table public.cb_rules (
  key text primary key check (key ~ '^[a-z_]{3,60}$'),
  kind text not null check (kind in ('reward', 'price')),
  label text not null check (char_length(btrim(label)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 300),
  amount integer not null check (amount between 0 and 10000),
  is_active boolean not null default true,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.cb_rules (key, kind, label, description, amount, position) values
  ('lesson_completed', 'reward', 'Leçon terminée', 'Chaque leçon validée, une seule fois.', 10, 10),
  ('quiz_passed', 'reward', 'Quiz réussi', 'Chaque quiz réussi, une seule fois.', 5, 20),
  ('quiz_perfect', 'reward', 'Quiz parfait', 'Bonus la première fois que tu obtiens 100 % à un quiz.', 5, 30),
  ('module_completed', 'reward', 'Module terminé', 'Toutes les leçons et tous les quiz du module sont validés.', 25, 40),
  ('course_completed_debutant', 'reward', 'Parcours débutant terminé', 'Un parcours de niveau débutant mené jusqu’au bout.', 100, 50),
  ('course_completed_intermediaire', 'reward', 'Parcours intermédiaire terminé', 'Un parcours de niveau intermédiaire mené jusqu’au bout.', 150, 51),
  ('course_completed_avance', 'reward', 'Parcours avancé terminé', 'Un parcours de niveau avancé mené jusqu’au bout.', 250, 52),
  ('challenge_daily', 'reward', 'Défi du jour réussi', 'Chaque défi quotidien réussi.', 5, 60),
  ('challenge_weekly', 'reward', 'Défi de la semaine réussi', 'Chaque défi hebdomadaire réussi.', 40, 61),
  ('challenge_one_time', 'reward', 'Défi spécial réussi', 'Chaque défi unique réussi.', 20, 62),
  ('daily_activity', 'reward', 'Première activité du jour', 'Une action d’apprentissage par jour.', 5, 70),
  ('lab_completed', 'reward', 'Lab réussi', 'Chaque lab résolu, une seule fois.', 15, 80),
  ('price_course_debutant', 'price', 'Parcours débutant', 'Prix par défaut d’un parcours débutant (0 = gratuit).', 0, 110),
  ('price_course_intermediaire', 'price', 'Parcours intermédiaire', 'Prix par défaut d’un parcours intermédiaire.', 120, 111),
  ('price_course_avance', 'price', 'Parcours avancé', 'Prix par défaut d’un parcours avancé.', 250, 112),
  ('price_lab_debutant', 'price', 'Lab débutant', 'Prix par défaut d’un lab débutant.', 30, 120),
  ('price_lab_intermediaire', 'price', 'Lab intermédiaire', 'Prix par défaut d’un lab intermédiaire.', 80, 121),
  ('price_lab_avance', 'price', 'Lab avancé', 'Prix par défaut d’un lab avancé.', 180, 122);

create table public.cb_settings (
  singleton boolean primary key default true check (singleton),
  -- Faux : plus aucune récompense n’est versée (elles sont rattrapées à la reprise, car calculées sur la progression réelle).
  rewards_enabled boolean not null default true,
  -- Faux : la boutique est fermée, plus aucun déblocage payant.
  purchases_enabled boolean not null default true,
  -- Faux : mode libre, tous les parcours et labs sont ouverts sans CyberBits.
  gating_enabled boolean not null default true,
  paused_reason text check (paused_reason is null or char_length(paused_reason) <= 300),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.cb_settings (singleton) values (true);

-- ─── Portefeuilles et registre ───────────────────────────────────────────────

create table public.cb_wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  lifetime_spent integer not null default 0 check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);

create table public.cb_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount <> 0 and amount between -100000 and 100000),
  reason text not null check (reason in (
    'lesson_completed', 'quiz_passed', 'quiz_perfect', 'module_completed', 'course_completed', 'challenge_completed',
    'daily_activity', 'lab_completed', 'course_unlock', 'lab_unlock', 'admin_adjustment'
  )),
  reference_type text check (reference_type in ('lesson', 'quiz', 'module', 'course', 'challenge', 'day', 'lab', 'admin')),
  reference_id text,
  label text not null default '' check (char_length(label) <= 200),
  -- activity : récompense en direct ; backfill : rattrapage de la progression passée ; purchase : dépense ; admin : ajustement.
  source text not null default 'activity' check (source in ('activity', 'backfill', 'purchase', 'admin')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (amount > 0 or reason in ('course_unlock', 'lab_unlock', 'admin_adjustment')),
  check (amount < 0 or reason not in ('course_unlock', 'lab_unlock')),
  check (reason = 'admin_adjustment' or reference_id is not null)
);
create index cb_transactions_user_idx on public.cb_transactions (user_id, id desc);
create index cb_transactions_created_idx on public.cb_transactions (created_at desc);
-- Une récompense, ou un achat, ne peut exister qu’une fois par apprenant et par élément, même en parallèle.
create unique index cb_transactions_once on public.cb_transactions (user_id, reason, reference_id) where reason <> 'admin_adjustment';

-- Seul le nettoyage de created_by (suppression du compte d’un administrateur) peut modifier une ligne.
create function private.cb_ledger_is_append_only() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.created_by is null and (to_jsonb(new) - 'created_by') = (to_jsonb(old) - 'created_by') then
    return new;
  end if;
  raise exception 'Le registre CyberBits est en lecture seule.' using errcode = '42501', hint = 'cyberpingo';
end $$;
create trigger cb_transactions_append_only before update on public.cb_transactions
for each row execute function private.cb_ledger_is_append_only();

-- Le solde est toujours la somme du registre. Recalculé après insertion (donc jamais pour une ligne ignorée par
-- ON CONFLICT DO NOTHING), il reste juste quel que soit l’ordre d’une insertion multiple.
create function private.apply_cb_ledger() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  gained integer;
  spent integer;
begin
  select coalesce(sum(amount) filter (where amount > 0), 0), coalesce(-sum(amount) filter (where amount < 0), 0)
  into gained, spent from public.cb_transactions where user_id = new.user_id;
  insert into public.cb_wallets as w (user_id, balance, lifetime_earned, lifetime_spent)
  values (new.user_id, gained - spent, gained, spent)
  on conflict (user_id) do update set
    balance = excluded.balance, lifetime_earned = excluded.lifetime_earned, lifetime_spent = excluded.lifetime_spent, updated_at = now();
  return null;
end $$;
create trigger cb_transactions_apply after insert on public.cb_transactions
for each row execute function private.apply_cb_ledger();

create function private.create_cb_wallet() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.cb_wallets (user_id) values (new.id) on conflict do nothing;
  return null;
end $$;
create trigger profiles_cb_wallet after insert on public.profiles for each row execute function private.create_cb_wallet();
insert into public.cb_wallets (user_id) select id from public.profiles on conflict do nothing;

-- ─── Prix et déblocages ──────────────────────────────────────────────────────

-- null = prix par défaut du niveau (cb_rules) ; 0 = gratuit.
alter table public.courses
  add column cb_price integer check (cb_price is null or cb_price between 0 and 10000),
  add column prerequisite_course_id uuid references public.courses (id) on delete set null,
  add constraint courses_prerequisite_not_self check (prerequisite_course_id is distinct from id);
alter table public.labs
  add column cb_price integer check (cb_price is null or cb_price between 0 and 10000);

create table public.course_unlocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  source text not null check (source in ('purchase', 'grandfathered', 'admin')),
  price_paid integer not null default 0 check (price_paid >= 0),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
create index course_unlocks_course_idx on public.course_unlocks (course_id);

create table public.lab_unlocks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lab_id uuid not null references public.labs (id) on delete cascade,
  source text not null check (source in ('purchase', 'grandfathered', 'admin')),
  price_paid integer not null default 0 check (price_paid >= 0),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, lab_id)
);
create index lab_unlocks_lab_idx on public.lab_unlocks (lab_id);

create function private.course_price(p_course uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(c.cb_price, (select r.amount from public.cb_rules r where r.key = 'price_course_' || c.level), 0)
  from public.courses c where c.id = p_course
$$;

create function private.lab_price(p_lab uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(l.cb_price, (select r.amount from public.cb_rules r where r.key = 'price_lab_' || l.difficulty), 0)
  from public.labs l where l.id = p_lab
$$;

-- Ouvert : mode libre, gratuit, déjà acheté (ou repris), ou déjà inscrit (inscription obtenue avant le prix).
create function private.course_unlocked(p_user uuid, p_course uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not (select s.gating_enabled from public.cb_settings s)
    or coalesce(private.course_price(p_course), 0) = 0
    or exists (select 1 from public.course_unlocks u where u.user_id = p_user and u.course_id = p_course)
    or exists (select 1 from public.enrollments e where e.user_id = p_user and e.course_id = p_course)
$$;

create function private.lab_unlocked(p_user uuid, p_lab uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select not (select s.gating_enabled from public.cb_settings s)
    or coalesce(private.lab_price(p_lab), 0) = 0
    or exists (select 1 from public.lab_unlocks u where u.user_id = p_user and u.lab_id = p_lab)
    or exists (select 1 from public.lab_completions c where c.user_id = p_user and c.lab_id = p_lab)
$$;

-- Appelée AVANT de comparer une réponse : un lab fermé ne révèle rien sur la bonne réponse.
create function private.assert_lab_unlocked(p_user uuid, p_lab uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  lab_status text;
begin
  select status into lab_status from public.labs where id = p_lab;
  if lab_status is distinct from 'published' or public.is_admin() then
    return;
  end if;
  if not private.lab_unlocked(p_user, p_lab) then
    raise exception 'Débloque ce lab avec tes CyberBits pour valider tes réponses.' using errcode = '42501', hint = 'cyberpingo';
  end if;
end $$;

-- Les apprenants déjà inscrits ou qui ont déjà avancé sur un lab gardent leur accès.
create function private.cb_grandfather() returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.course_unlocks (user_id, course_id, source)
  select e.user_id, e.course_id, 'grandfathered' from public.enrollments e
  where coalesce(private.course_price(e.course_id), 0) > 0
  on conflict do nothing;

  insert into public.lab_unlocks (user_id, lab_id, source)
  select x.user_id, x.lab_id, 'grandfathered' from (
    select user_id, lab_id from public.lab_completions
    union select user_id, lab_id from public.lab_task_completions
    union select user_id, lab_id from public.lab_submissions) x
  where coalesce(private.lab_price(x.lab_id), 0) > 0
  on conflict do nothing;
end $$;

-- ─── Récompenses calculées sur la progression réelle ─────────────────────────

create function private.sync_cb_rewards(p_user uuid, p_source text default 'activity') returns integer
language plpgsql security definer set search_path = '' as $$
declare
  total integer := 0;
  added integer;
begin
  if not (select s.rewards_enabled from public.cb_settings s) then
    return 0;
  end if;

  insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id, label, source)
  select p_user, r.amount, 'lesson_completed', 'lesson', lp.lesson_id::text, left('Leçon : ' || l.title, 200), p_source
  from public.lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id
  join public.cb_rules r on r.key = 'lesson_completed' and r.is_active and r.amount > 0
  where lp.user_id = p_user and lp.status = 'completed'
  on conflict (user_id, reason, reference_id) where reason <> 'admin_adjustment' do nothing;
  get diagnostics added = row_count;
  total := total + added;

  insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id, label, source)
  select p_user, r.amount, 'quiz_passed', 'quiz', q.id::text, left('Quiz réussi : ' || q.title, 200), p_source
  from public.quizzes q
  join public.cb_rules r on r.key = 'quiz_passed' and r.is_active and r.amount > 0
  where exists (select 1 from public.quiz_attempts a where a.user_id = p_user and a.quiz_id = q.id and a.passed)
  on conflict (user_id, reason, reference_id) where reason <> 'admin_adjustment' do nothing;
  get diagnostics added = row_count;
  total := total + added;

  insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id, label, source)
  select p_user, r.amount, 'quiz_perfect', 'quiz', q.id::text, left('Quiz parfait : ' || q.title, 200), p_source
  from public.quizzes q
  join public.cb_rules r on r.key = 'quiz_perfect' and r.is_active and r.amount > 0
  where exists (select 1 from public.quiz_attempts a where a.user_id = p_user and a.quiz_id = q.id and a.passed and a.percentage = 100)
  on conflict (user_id, reason, reference_id) where reason <> 'admin_adjustment' do nothing;
  get diagnostics added = row_count;
  total := total + added;

  insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id, label, source)
  select p_user, r.amount, 'module_completed', 'module', m.id::text, left('Module terminé : ' || m.title, 200), p_source
  from public.course_modules m
  join public.cb_rules r on r.key = 'module_completed' and r.is_active and r.amount > 0
  where m.course_id in (select lp.course_id from public.lesson_progress lp where lp.user_id = p_user)
    and exists (select 1 from public.lessons l where l.module_id = m.id)
    and not exists (
      select 1 from public.lessons l where l.module_id = m.id and not exists (
        select 1 from public.lesson_progress lp where lp.user_id = p_user and lp.lesson_id = l.id and lp.status = 'completed'))
    and not exists (
      select 1 from public.quizzes q where q.module_id = m.id and not exists (
        select 1 from public.quiz_attempts a where a.user_id = p_user and a.quiz_id = q.id and a.passed))
  on conflict (user_id, reason, reference_id) where reason <> 'admin_adjustment' do nothing;
  get diagnostics added = row_count;
  total := total + added;

  insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id, label, source)
  select p_user, r.amount, 'course_completed', 'course', c.id::text, left('Parcours terminé : ' || c.title, 200), p_source
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  join public.cb_rules r on r.key = 'course_completed_' || c.level and r.is_active and r.amount > 0
  where e.user_id = p_user and e.status = 'completed'
  on conflict (user_id, reason, reference_id) where reason <> 'admin_adjustment' do nothing;
  get diagnostics added = row_count;
  total := total + added;

  insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id, label, source)
  select p_user, r.amount, 'challenge_completed', 'challenge', ch.id::text || ':' || uc.period_start::text, left('Défi : ' || ch.title, 200), p_source
  from public.user_challenges uc
  join public.challenges ch on ch.id = uc.challenge_id
  join public.cb_rules r on r.key = 'challenge_' || ch.period and r.is_active and r.amount > 0
  where uc.user_id = p_user and uc.completed_at is not null
  on conflict (user_id, reason, reference_id) where reason <> 'admin_adjustment' do nothing;
  get diagnostics added = row_count;
  total := total + added;

  insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id, label, source)
  select p_user, r.amount, 'daily_activity', 'day', da.activity_date::text, 'Première activité du ' || to_char(da.activity_date, 'DD/MM/YYYY'), p_source
  from public.daily_activity da
  join public.cb_rules r on r.key = 'daily_activity' and r.is_active and r.amount > 0
  where da.user_id = p_user and da.lessons_completed + da.quizzes_passed + da.labs_solved > 0
  on conflict (user_id, reason, reference_id) where reason <> 'admin_adjustment' do nothing;
  get diagnostics added = row_count;
  total := total + added;

  insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id, label, source)
  select p_user, r.amount, 'lab_completed', 'lab', lc.lab_id::text, left('Lab réussi : ' || lb.title, 200), p_source
  from public.lab_completions lc
  join public.labs lb on lb.id = lc.lab_id
  join public.cb_rules r on r.key = 'lab_completed' and r.is_active and r.amount > 0
  where lc.user_id = p_user
  on conflict (user_id, reason, reference_id) where reason <> 'admin_adjustment' do nothing;
  get diagnostics added = row_count;
  total := total + added;

  return total;
end $$;

-- Grandfathering, puis rattrapage de la progression passée (une seule fois, les lignes sont uniques).
select private.cb_grandfather();
select private.sync_cb_rewards(p.id, 'backfill') from public.profiles p;
select private.notify(w.user_id, 'system', 'Bienvenue dans l’économie CyberBits',
  'Ta progression passée t’a déjà rapporté ' || w.balance || ' CB. Utilise-les dans la boutique pour débloquer des parcours et des labs.', '/boutique')
from public.cb_wallets w where w.balance > 0;

-- ─── Moteur : accès, fin de progression, résumé des récompenses ──────────────

create or replace function private.course_mode(p_user uuid, p_course uuid) returns text
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
    if not public.is_admin() and not private.course_unlocked(p_user, p_course) then
      raise exception 'Débloque ce parcours avec tes CyberBits pour le suivre.' using errcode = '42501', hint = 'cyberpingo';
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
  perform private.sync_cb_rewards(p_user);
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
      where us.user_id = p.id and us.changed_at = now()), '[]'::jsonb),
    'cyberbits', (
      select jsonb_build_object(
        'gained', coalesce(sum(t.amount), 0),
        'balance', coalesce((select w.balance from public.cb_wallets w where w.user_id = p.id), 0),
        'items', coalesce(jsonb_agg(jsonb_build_object('reason', t.reason, 'amount', t.amount, 'label', t.label) order by t.id), '[]'::jsonb))
      from public.cb_transactions t
      where t.user_id = p.id and t.created_at = now() and t.source = 'activity' and t.amount > 0)
  )
  from public.profiles p where p.id = p_user;
$$;

-- ─── Accès aux labs : le contrôle précède toute comparaison de réponse ───────

alter function public.submit_lab(uuid, text) set schema private;
alter function private.submit_lab(uuid, text) rename to submit_lab_core;
alter function public.submit_lab_task(uuid, text) set schema private;
alter function private.submit_lab_task(uuid, text) rename to submit_lab_task_core;
alter function public.submit_lab_report(uuid, text, text) set schema private;
alter function private.submit_lab_report(uuid, text, text) rename to submit_lab_report_core;

create function public.submit_lab(p_lab_id uuid, p_answer text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_lab_unlocked(private.require_user(), p_lab_id);
  return private.submit_lab_core(p_lab_id, p_answer);
end $$;

create function public.submit_lab_task(p_task_id uuid, p_answer text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
begin
  perform private.assert_lab_unlocked(uid, (select t.lab_id from public.lab_tasks t where t.id = p_task_id));
  return private.submit_lab_task_core(p_task_id, p_answer);
end $$;

create function public.submit_lab_report(p_lab_id uuid, p_note text, p_link text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_lab_unlocked(private.require_user(), p_lab_id);
  perform private.submit_lab_report_core(p_lab_id, p_note, p_link);
end $$;

-- ─── Fonctions apprenant ─────────────────────────────────────────────────────

create function public.get_my_wallet() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  w public.cb_wallets;
begin
  select * into w from public.cb_wallets where user_id = uid;
  return jsonb_build_object(
    'balance', coalesce(w.balance, 0),
    'lifetime_earned', coalesce(w.lifetime_earned, 0),
    'lifetime_spent', coalesce(w.lifetime_spent, 0),
    'settings', (select jsonb_build_object('rewards_enabled', s.rewards_enabled, 'purchases_enabled', s.purchases_enabled,
      'gating_enabled', s.gating_enabled, 'paused_reason', s.paused_reason) from public.cb_settings s),
    'unlocked_courses', (select count(*) from public.course_unlocks where user_id = uid),
    'unlocked_labs', (select count(*) from public.lab_unlocks where user_id = uid));
end $$;

-- Historique paginé (du plus récent au plus ancien) avec le solde après chaque mouvement.
create function public.get_my_cb_history(p_limit integer default 30, p_before bigint default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  page_size integer := least(greatest(coalesce(p_limit, 30), 1), 100);
begin
  return jsonb_build_object('transactions', coalesce((
    select jsonb_agg(to_jsonb(page) order by page.id desc)
    from (
      select t.id, t.amount, t.reason, t.reference_type, t.reference_id, t.label, t.source, t.created_at, t.running as balance_after
      from (select x.*, sum(x.amount) over (order by x.id) as running from public.cb_transactions x where x.user_id = uid) t
      where p_before is null or t.id < p_before
      order by t.id desc limit page_size) page), '[]'::jsonb));
end $$;

-- Catalogue de la boutique : parcours et labs publiés, avec prix, état de déblocage et prérequis. Lisible sans compte.
create function public.get_cb_catalog() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  is_staff boolean := public.is_admin();
begin
  return jsonb_build_object(
    'balance', coalesce((select w.balance from public.cb_wallets w where w.user_id = uid), 0),
    'settings', (select jsonb_build_object('rewards_enabled', s.rewards_enabled, 'purchases_enabled', s.purchases_enabled,
      'gating_enabled', s.gating_enabled, 'paused_reason', s.paused_reason) from public.cb_settings s),
    'courses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'slug', c.slug, 'title', c.title, 'short_description', c.short_description, 'level', c.level,
        'category', c.category, 'icon', c.icon, 'estimated_duration', c.estimated_duration,
        'price', coalesce(private.course_price(c.id), 0),
        'custom_price', c.cb_price is not null,
        'unlocked', is_staff or private.course_unlocked(uid, c.id),
        'unlock_source', (select u.source from public.course_unlocks u where u.user_id = uid and u.course_id = c.id),
        'enrolled', exists (select 1 from public.enrollments e where e.user_id = uid and e.course_id = c.id),
        'completed', exists (select 1 from public.enrollments e where e.user_id = uid and e.course_id = c.id and e.status = 'completed'),
        'prerequisite', (
          select jsonb_build_object('id', p.id, 'slug', p.slug, 'title', p.title,
            'completed', exists (select 1 from public.enrollments e where e.user_id = uid and e.course_id = p.id and e.status = 'completed'))
          from public.courses p where p.id = c.prerequisite_course_id)
      ) order by c.position, c.created_at)
      from public.courses c where c.status = 'published'), '[]'::jsonb),
    'labs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'slug', l.slug, 'title', l.title, 'difficulty', l.difficulty, 'category', l.category, 'format', l.format,
        'is_assessment', l.is_assessment, 'estimated_minutes', l.estimated_minutes, 'course_id', l.course_id,
        'course_slug', (select c.slug from public.courses c where c.id = l.course_id),
        'price', coalesce(private.lab_price(l.id), 0),
        'custom_price', l.cb_price is not null,
        'unlocked', is_staff or private.lab_unlocked(uid, l.id),
        'unlock_source', (select u.source from public.lab_unlocks u where u.user_id = uid and u.lab_id = l.id),
        'completed', exists (select 1 from public.lab_completions lc where lc.user_id = uid and lc.lab_id = l.id)
      ) order by l.position, l.created_at)
      from public.labs l where l.status = 'published'), '[]'::jsonb));
end $$;

create function public.unlock_course(p_course_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  c public.courses;
  prerequisite public.courses;
  price integer;
  bal integer;
begin
  perform private.lock_profile(uid);
  select * into c from public.courses where id = p_course_id;
  if not found or c.status <> 'published' then
    raise exception 'Ce parcours n’est pas disponible.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  select coalesce(w.balance, 0) into bal from public.cb_wallets w where w.user_id = uid;
  bal := coalesce(bal, 0);
  if private.course_unlocked(uid, c.id) then
    return jsonb_build_object('kind', 'course', 'id', c.id, 'unlocked', true, 'already_unlocked', true, 'price_paid', 0, 'balance', bal);
  end if;
  if not (select s.purchases_enabled from public.cb_settings s) then
    raise exception 'La boutique est fermée pour le moment. Réessaie plus tard.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if c.prerequisite_course_id is not null and not exists (
       select 1 from public.enrollments e where e.user_id = uid and e.course_id = c.prerequisite_course_id and e.status = 'completed') then
    select * into prerequisite from public.courses where id = c.prerequisite_course_id;
    raise exception 'Termine d’abord « % » pour débloquer ce parcours.', prerequisite.title using errcode = '22023', hint = 'cyberpingo';
  end if;
  price := private.course_price(c.id);
  if bal < price then
    raise exception 'Il te manque % CyberBits pour débloquer ce parcours.', price - bal using errcode = '22023', hint = 'cyberpingo';
  end if;
  insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id, label, source)
  values (uid, -price, 'course_unlock', 'course', c.id::text, left('Parcours débloqué : ' || c.title, 200), 'purchase');
  insert into public.course_unlocks (user_id, course_id, source, price_paid) values (uid, c.id, 'purchase', price);
  perform private.log_activity(uid, 'cb_unlock', c.id::text, 'Parcours débloqué : ' || c.title, '/courses/' || c.slug, 0);
  return jsonb_build_object('kind', 'course', 'id', c.id, 'unlocked', true, 'already_unlocked', false, 'price_paid', price, 'balance', bal - price);
end $$;

create function public.unlock_lab(p_lab_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  l public.labs;
  price integer;
  bal integer;
begin
  perform private.lock_profile(uid);
  select * into l from public.labs where id = p_lab_id;
  if not found or l.status <> 'published' then
    raise exception 'Ce lab n’est pas disponible.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  select coalesce(w.balance, 0) into bal from public.cb_wallets w where w.user_id = uid;
  bal := coalesce(bal, 0);
  if private.lab_unlocked(uid, l.id) then
    return jsonb_build_object('kind', 'lab', 'id', l.id, 'unlocked', true, 'already_unlocked', true, 'price_paid', 0, 'balance', bal);
  end if;
  if not (select s.purchases_enabled from public.cb_settings s) then
    raise exception 'La boutique est fermée pour le moment. Réessaie plus tard.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  price := private.lab_price(l.id);
  if bal < price then
    raise exception 'Il te manque % CyberBits pour débloquer ce lab.', price - bal using errcode = '22023', hint = 'cyberpingo';
  end if;
  insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id, label, source)
  values (uid, -price, 'lab_unlock', 'lab', l.id::text, left('Lab débloqué : ' || l.title, 200), 'purchase');
  insert into public.lab_unlocks (user_id, lab_id, source, price_paid) values (uid, l.id, 'purchase', price);
  perform private.log_activity(uid, 'cb_unlock', l.id::text, 'Lab débloqué : ' || l.title, '/challenges/' || l.slug, 0);
  return jsonb_build_object('kind', 'lab', 'id', l.id, 'unlocked', true, 'already_unlocked', false, 'price_paid', price, 'balance', bal - price);
end $$;

-- ─── Administration ──────────────────────────────────────────────────────────

create function public.admin_cb_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_admin();
  return jsonb_build_object(
    'settings', (select to_jsonb(s) - 'singleton' from public.cb_settings s),
    'circulation', jsonb_build_object(
      'in_circulation', (select coalesce(sum(balance), 0) from public.cb_wallets),
      'wallets', (select count(*) from public.cb_wallets),
      'wallets_with_balance', (select count(*) from public.cb_wallets where balance > 0),
      'earned_total', (select coalesce(sum(amount), 0) from public.cb_transactions where amount > 0 and reason <> 'admin_adjustment'),
      'spent_total', (select coalesce(-sum(amount), 0) from public.cb_transactions where amount < 0 and reason <> 'admin_adjustment'),
      'adjusted_total', (select coalesce(sum(amount), 0) from public.cb_transactions where reason = 'admin_adjustment')),
    'last_7d', jsonb_build_object(
      'earned', (select coalesce(sum(amount), 0) from public.cb_transactions where amount > 0 and reason <> 'admin_adjustment' and created_at > now() - interval '7 days'),
      'spent', (select coalesce(-sum(amount), 0) from public.cb_transactions where amount < 0 and reason <> 'admin_adjustment' and created_at > now() - interval '7 days'),
      'earners', (select count(distinct user_id) from public.cb_transactions where amount > 0 and reason <> 'admin_adjustment' and created_at > now() - interval '7 days'),
      'spenders', (select count(distinct user_id) from public.cb_transactions where amount < 0 and reason <> 'admin_adjustment' and created_at > now() - interval '7 days')),
    'by_reason', coalesce((
      select jsonb_agg(jsonb_build_object('reason', r.reason, 'count', r.n, 'amount', r.total) order by abs(r.total) desc)
      from (select reason, count(*) as n, sum(amount) as total from public.cb_transactions group by reason) r), '[]'::jsonb),
    'daily', (
      select jsonb_agg(jsonb_build_object('date', d::date,
        'earned', (select coalesce(sum(t.amount), 0) from public.cb_transactions t
          where t.amount > 0 and t.reason <> 'admin_adjustment' and t.created_at >= d and t.created_at < d + interval '1 day'),
        'spent', (select coalesce(-sum(t.amount), 0) from public.cb_transactions t
          where t.amount < 0 and t.reason <> 'admin_adjustment' and t.created_at >= d and t.created_at < d + interval '1 day')) order by d)
      from generate_series(date_trunc('day', now()) - interval '13 days', date_trunc('day', now()), interval '1 day') d),
    'top_earners_24h', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', e.user_id, 'display_name', e.display_name, 'username', e.username,
        'earned', e.earned, 'balance', e.balance) order by e.earned desc)
      from (
        select t.user_id, p.display_name, p.username, sum(t.amount) as earned, coalesce(w.balance, 0) as balance
        from public.cb_transactions t join public.profiles p on p.id = t.user_id left join public.cb_wallets w on w.user_id = t.user_id
        where t.amount > 0 and t.reason <> 'admin_adjustment' and t.source = 'activity' and t.created_at > now() - interval '24 hours'
        group by t.user_id, p.display_name, p.username, w.balance order by sum(t.amount) desc limit 5) e), '[]'::jsonb),
    'top_unlocks', coalesce((
      select jsonb_agg(jsonb_build_object('kind', u.kind, 'id', u.id, 'title', u.title, 'count', u.n, 'total', u.total) order by u.n desc, u.title)
      from (
        select 'course' as kind, c.id, c.title, count(*) as n, sum(x.price_paid) as total
        from public.course_unlocks x join public.courses c on c.id = x.course_id where x.source = 'purchase' group by c.id, c.title
        union all
        select 'lab', l.id, l.title, count(*), sum(x.price_paid)
        from public.lab_unlocks x join public.labs l on l.id = x.lab_id where x.source = 'purchase' group by l.id, l.title
        order by n desc limit 8) u), '[]'::jsonb),
    'unlocks', jsonb_build_object(
      'courses', (select count(*) from public.course_unlocks where source = 'purchase'),
      'labs', (select count(*) from public.lab_unlocks where source = 'purchase')),
    'avg_hours_to_first_spend', (
      select round(avg(extract(epoch from (f.first_spend - f.first_earn)) / 3600)::numeric, 1)
      from (
        select min(created_at) filter (where amount > 0 and reason <> 'admin_adjustment') as first_earn,
               min(created_at) filter (where reason in ('course_unlock', 'lab_unlock')) as first_spend
        from public.cb_transactions group by user_id) f
      where f.first_spend is not null and f.first_earn is not null),
    'rules', coalesce((
      select jsonb_agg(jsonb_build_object('key', r.key, 'kind', r.kind, 'label', r.label, 'description', r.description,
        'amount', r.amount, 'is_active', r.is_active) order by r.position)
      from public.cb_rules r), '[]'::jsonb));
end $$;

create function public.admin_cb_wallets(p_search text default null, p_limit integer default 50, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  needle text := nullif(btrim(lower(coalesce(p_search, ''))), '');
  page_size integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  skip integer := greatest(coalesce(p_offset, 0), 0);
begin
  perform private.require_admin();
  return (
    with matching as (
      select w.*, p.display_name, p.username, p.email
      from public.cb_wallets w join public.profiles p on p.id = w.user_id
      where needle is null or strpos(lower(p.display_name), needle) > 0 or strpos(p.username, needle) > 0 or strpos(lower(p.email), needle) > 0
    )
    select jsonb_build_object(
      'total', (select count(*) from matching),
      'wallets', coalesce((
        select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'display_name', m.display_name, 'username', m.username, 'email', m.email,
          'balance', m.balance, 'lifetime_earned', m.lifetime_earned, 'lifetime_spent', m.lifetime_spent,
          'last_movement_at', (select max(t.created_at) from public.cb_transactions t where t.user_id = m.user_id)) order by m.balance desc, m.display_name)
        from (select * from matching order by balance desc, display_name limit page_size offset skip) m), '[]'::jsonb)));
end $$;

create function public.admin_cb_transactions(p_user uuid default null, p_reason text default null, p_limit integer default 50, p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  page_size integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  skip integer := greatest(coalesce(p_offset, 0), 0);
begin
  perform private.require_admin();
  return (
    with matching as (
      select t.* from public.cb_transactions t
      where (p_user is null or t.user_id = p_user) and (p_reason is null or t.reason = p_reason)
    )
    select jsonb_build_object(
      'total', (select count(*) from matching),
      'transactions', coalesce((
        select jsonb_agg(jsonb_build_object('id', m.id, 'user_id', m.user_id, 'display_name', p.display_name, 'username', p.username,
          'amount', m.amount, 'reason', m.reason, 'label', m.label, 'source', m.source, 'created_at', m.created_at) order by m.id desc)
        from (select * from matching order by id desc limit page_size offset skip) m
        join public.profiles p on p.id = m.user_id), '[]'::jsonb)));
end $$;

create function public.admin_set_cb_rule(p_key text, p_amount integer, p_active boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  note text := btrim(coalesce(p_reason, ''));
  previous public.cb_rules;
begin
  perform private.require_admin();
  if char_length(note) not between 5 and 200 then
    raise exception 'Explique le changement (5 à 200 caractères).' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if p_amount is null or p_amount not between 0 and 10000 then
    raise exception 'Le montant doit être compris entre 0 et 10 000 CB.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  select * into previous from public.cb_rules where key = p_key for update;
  if not found then
    raise exception 'Règle inconnue.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  update public.cb_rules set amount = p_amount, is_active = coalesce(p_active, is_active), updated_at = now() where key = p_key;
  perform private.log_admin('set_cb_rule', 'cb_rule', p_key, jsonb_build_object(
    'from', jsonb_build_object('amount', previous.amount, 'active', previous.is_active),
    'to', jsonb_build_object('amount', p_amount, 'active', coalesce(p_active, previous.is_active)), 'reason', note));
end $$;

-- p_price null : le prix par défaut du niveau s’applique de nouveau.
create function public.admin_set_cb_price(p_kind text, p_id uuid, p_price integer, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  note text := btrim(coalesce(p_reason, ''));
  previous integer;
  found_row boolean;
begin
  perform private.require_admin();
  if char_length(note) not between 5 and 200 then
    raise exception 'Explique le changement (5 à 200 caractères).' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if p_price is not null and p_price not between 0 and 10000 then
    raise exception 'Le prix doit être compris entre 0 et 10 000 CB.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if p_kind = 'course' then
    select c.cb_price, true into previous, found_row from public.courses c where c.id = p_id for update;
    if found_row is distinct from true then
      raise exception 'Parcours introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
    end if;
    update public.courses set cb_price = p_price where id = p_id;
  elsif p_kind = 'lab' then
    select l.cb_price, true into previous, found_row from public.labs l where l.id = p_id for update;
    if found_row is distinct from true then
      raise exception 'Lab introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
    end if;
    update public.labs set cb_price = p_price where id = p_id;
  else
    raise exception 'Type d’élément inconnu.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  perform private.log_admin('set_cb_price', p_kind, p_id::text, jsonb_build_object('from', previous, 'to', p_price, 'reason', note));
end $$;

create function public.admin_set_cb_prerequisite(p_course_id uuid, p_prerequisite_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  note text := btrim(coalesce(p_reason, ''));
  previous uuid;
  found_row boolean;
begin
  perform private.require_admin();
  if char_length(note) not between 5 and 200 then
    raise exception 'Explique le changement (5 à 200 caractères).' using errcode = '22023', hint = 'cyberpingo';
  end if;
  select c.prerequisite_course_id, true into previous, found_row from public.courses c where c.id = p_course_id for update;
  if found_row is distinct from true then
    raise exception 'Parcours introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
  end if;
  if p_prerequisite_id is not null then
    if not exists (select 1 from public.courses where id = p_prerequisite_id) then
      raise exception 'Le parcours prérequis est introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
    end if;
    -- Refuse toute boucle : le prérequis ne doit pas, directement ou non, exiger ce parcours.
    if p_prerequisite_id = p_course_id or exists (
      with recursive chain(id) as (
        select p_prerequisite_id
        union
        select c.prerequisite_course_id from public.courses c join chain on c.id = chain.id where c.prerequisite_course_id is not null)
      select 1 from chain where id = p_course_id) then
      raise exception 'Ce prérequis créerait une boucle entre parcours.' using errcode = '22023', hint = 'cyberpingo';
    end if;
  end if;
  update public.courses set prerequisite_course_id = p_prerequisite_id where id = p_course_id;
  perform private.log_admin('set_cb_prerequisite', 'course', p_course_id::text, jsonb_build_object('from', previous, 'to', p_prerequisite_id, 'reason', note));
end $$;

create function public.admin_set_cb_settings(p_rewards boolean, p_purchases boolean, p_gating boolean, p_paused_reason text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_admin();
  note text := btrim(coalesce(p_reason, ''));
  previous public.cb_settings;
  message text := nullif(btrim(coalesce(p_paused_reason, '')), '');
begin
  if char_length(note) not between 5 and 200 then
    raise exception 'Explique le changement (5 à 200 caractères).' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if message is not null and char_length(message) > 300 then
    raise exception 'Le message affiché aux apprenants est limité à 300 caractères.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  select * into previous from public.cb_settings for update;
  update public.cb_settings set
    rewards_enabled = coalesce(p_rewards, rewards_enabled),
    purchases_enabled = coalesce(p_purchases, purchases_enabled),
    gating_enabled = coalesce(p_gating, gating_enabled),
    paused_reason = message, updated_at = now(), updated_by = actor;
  perform private.log_admin('set_cb_settings', 'cb_settings', 'main', jsonb_build_object(
    'from', to_jsonb(previous) - 'singleton' - 'updated_at' - 'updated_by',
    'to', jsonb_build_object('rewards_enabled', coalesce(p_rewards, previous.rewards_enabled),
      'purchases_enabled', coalesce(p_purchases, previous.purchases_enabled),
      'gating_enabled', coalesce(p_gating, previous.gating_enabled), 'paused_reason', message),
    'reason', note));
end $$;

create function public.admin_adjust_cb(p_user uuid, p_amount integer, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_admin();
  note text := btrim(coalesce(p_reason, ''));
  bal integer;
begin
  if p_user = actor then
    raise exception 'Tu ne peux pas ajuster tes propres CyberBits.' using errcode = '42501', hint = 'cyberpingo';
  end if;
  if p_amount is null or p_amount = 0 or p_amount not between -5000 and 5000 then
    raise exception 'L’ajustement doit être compris entre -5 000 et 5 000 CB (hors zéro).' using errcode = '22023', hint = 'cyberpingo';
  end if;
  if char_length(note) not between 5 and 200 then
    raise exception 'Explique l’ajustement (5 à 200 caractères).' using errcode = '22023', hint = 'cyberpingo';
  end if;
  perform private.lock_profile(p_user);
  select coalesce(w.balance, 0) into bal from public.cb_wallets w where w.user_id = p_user;
  bal := coalesce(bal, 0);
  if bal + p_amount < 0 then
    raise exception 'Le solde de cet utilisateur ne peut pas devenir négatif.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id, label, source, created_by)
  values (p_user, p_amount, 'admin_adjustment', 'admin', actor::text, note, 'admin', actor);
  perform private.log_admin('adjust_cb', 'profile', p_user::text, jsonb_build_object('amount', p_amount, 'reason', note));
  perform private.notify(p_user, 'system', case when p_amount > 0 then '+' || p_amount || ' CB' else p_amount || ' CB' end,
    'Ajustement par l’équipe CyberPingo : ' || note, '/boutique');
  return jsonb_build_object('balance', bal + p_amount);
end $$;

create function public.admin_grant_unlock(p_kind text, p_id uuid, p_user uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  note text := btrim(coalesce(p_reason, ''));
  item_title text;
  item_link text;
begin
  perform private.require_admin();
  if char_length(note) not between 5 and 200 then
    raise exception 'Explique le déblocage (5 à 200 caractères).' using errcode = '22023', hint = 'cyberpingo';
  end if;
  perform private.lock_profile(p_user);
  if p_kind = 'course' then
    select title, '/courses/' || slug into item_title, item_link from public.courses where id = p_id;
    if item_title is null then
      raise exception 'Parcours introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
    end if;
    insert into public.course_unlocks (user_id, course_id, source) values (p_user, p_id, 'admin') on conflict do nothing;
  elsif p_kind = 'lab' then
    select title, '/challenges/' || slug into item_title, item_link from public.labs where id = p_id;
    if item_title is null then
      raise exception 'Lab introuvable.' using errcode = 'P0002', hint = 'cyberpingo';
    end if;
    insert into public.lab_unlocks (user_id, lab_id, source) values (p_user, p_id, 'admin') on conflict do nothing;
  else
    raise exception 'Type d’élément inconnu.' using errcode = '22023', hint = 'cyberpingo';
  end if;
  perform private.log_admin('grant_cb_unlock', p_kind, p_id::text, jsonb_build_object('user', p_user, 'reason', note));
  perform private.notify(p_user, 'system', 'Accès débloqué', 'L’équipe CyberPingo t’a ouvert « ' || item_title || ' ».', item_link);
end $$;

-- ─── Sécurité : lecture seule sous RLS, écriture uniquement par les fonctions ──

alter table public.cb_rules enable row level security;
alter table public.cb_settings enable row level security;
alter table public.cb_wallets enable row level security;
alter table public.cb_transactions enable row level security;
alter table public.course_unlocks enable row level security;
alter table public.lab_unlocks enable row level security;

create policy "CyberBits rules are public" on public.cb_rules for select to anon, authenticated using (true);
create policy "CyberBits settings are public" on public.cb_settings for select to anon, authenticated using (true);
create policy "Own wallet or staff" on public.cb_wallets for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own CyberBits history or staff" on public.cb_transactions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own course unlocks or staff" on public.course_unlocks for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Own lab unlocks or staff" on public.lab_unlocks for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

revoke all on public.cb_rules, public.cb_settings, public.cb_wallets, public.cb_transactions, public.course_unlocks, public.lab_unlocks
from anon, authenticated;
grant select on public.cb_rules, public.cb_settings to anon, authenticated;
grant select on public.cb_wallets, public.cb_transactions, public.course_unlocks, public.lab_unlocks to authenticated;

-- Le fil d’activité de l’administration affiche aussi les déblocages.
alter table public.activity_events drop constraint if exists activity_events_kind_check;
alter table public.activity_events add constraint activity_events_kind_check check (kind in (
  'login', 'logout', 'enroll', 'lesson_start', 'lesson_complete', 'quiz_complete', 'lab_complete',
  'course_complete', 'badge_earned', 'challenge_complete', 'level_up', 'certificate', 'mentor_chat', 'onboarding', 'reset',
  'cb_unlock'
));

revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function
  public.submit_lab(uuid, text), public.submit_lab_task(uuid, text), public.submit_lab_report(uuid, text, text),
  public.get_my_wallet(), public.get_my_cb_history(integer, bigint), public.get_cb_catalog(),
  public.unlock_course(uuid), public.unlock_lab(uuid),
  public.admin_cb_overview(), public.admin_cb_wallets(text, integer, integer), public.admin_cb_transactions(uuid, text, integer, integer),
  public.admin_set_cb_rule(text, integer, boolean, text), public.admin_set_cb_price(text, uuid, integer, text),
  public.admin_set_cb_prerequisite(uuid, uuid, text), public.admin_set_cb_settings(boolean, boolean, boolean, text, text),
  public.admin_adjust_cb(uuid, integer, text), public.admin_grant_unlock(text, uuid, uuid, text)
from public, anon;
grant execute on function
  public.submit_lab(uuid, text), public.submit_lab_task(uuid, text), public.submit_lab_report(uuid, text, text),
  public.get_my_wallet(), public.get_my_cb_history(integer, bigint),
  public.unlock_course(uuid), public.unlock_lab(uuid),
  public.admin_cb_overview(), public.admin_cb_wallets(text, integer, integer), public.admin_cb_transactions(uuid, text, integer, integer),
  public.admin_set_cb_rule(text, integer, boolean, text), public.admin_set_cb_price(text, uuid, integer, text),
  public.admin_set_cb_prerequisite(uuid, uuid, text), public.admin_set_cb_settings(boolean, boolean, boolean, text, text),
  public.admin_adjust_cb(uuid, integer, text), public.admin_grant_unlock(text, uuid, uuid, text)
to authenticated;
grant execute on function public.get_cb_catalog() to anon, authenticated;
