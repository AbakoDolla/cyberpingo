-- CyberPingo · Remise à zéro complète des comptes, XP, CyberBits et progressions
-- Script d'assainissement et réinitialisation complète des comptes apprenants

BEGIN;

-- 1. Purge des certifications et examens
TRUNCATE TABLE public.exam_certificates CASCADE;

-- 2. Purge des progressions pédagogiques, quiz et soumissions de labs
TRUNCATE TABLE public.lab_submissions CASCADE;
TRUNCATE TABLE public.quiz_attempts CASCADE;
TRUNCATE TABLE public.lesson_completions CASCADE;
TRUNCATE TABLE public.user_progress CASCADE;

-- 3. Purge des badges et de l'historique d'expérience (XP)
TRUNCATE TABLE public.user_badges CASCADE;
TRUNCATE TABLE public.xp_transactions CASCADE;

-- 4. Purge des déblocages et transactions CyberBits (CB)
TRUNCATE TABLE public.cb_unlocks CASCADE;
TRUNCATE TABLE public.cb_transactions CASCADE;
TRUNCATE TABLE public.cb_wallets CASCADE;

-- 5. Purge des activités, logs d'audits et notifications
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.activities CASCADE;

-- 6. Remise à zéro des statistiques pour les comptes staff/admin
UPDATE public.profiles
SET 
  xp = 0,
  level = 1,
  current_streak = 0,
  longest_streak = 0,
  last_activity_date = NULL,
  last_activity_at = NULL,
  onboarding_completed = false
WHERE role IN ('admin', 'superadmin');

-- 7. Suppression définitive des comptes apprenants standards (auth.users avec cascade sur profiles)
DELETE FROM auth.users 
WHERE id IN (
  SELECT id FROM public.profiles WHERE role = 'user'
);

-- Nettoyage de sécurité pour tout profil sans compte auth
DELETE FROM public.profiles WHERE role = 'user';

COMMIT;
