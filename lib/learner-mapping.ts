import { badges } from "@/data/badges";
import { computeLevel, computeSkills } from "@/lib/learning-progress";
import type { LearnerSnapshot } from "@/types/database";
import type { User } from "@/types";

const day = (value: Date) => value.toISOString().slice(0, 10);

/** A streak only stays alive while the last qualifying activity was today or yesterday (UTC). */
export function effectiveStreak(streak: number, lastActivityDate: string | null, now = new Date()) {
  if (!lastActivityDate) return 0;
  const today = day(now);
  const yesterday = day(new Date(now.getTime() - 86_400_000));
  return lastActivityDate === today || lastActivityDate === yesterday ? streak : 0;
}

export function buildUser({ profile, lessons, quizzes, challenges, badges: earned }: LearnerSnapshot, now = new Date()): User {
  const completedLessons = lessons.map((row) => row.lesson_id);
  const { level, xpToNextLevel } = computeLevel(profile.xp);
  const earnedAt = new Map(earned.map((row) => [row.badge_id, row.earned_at.slice(0, 10)]));
  return {
    id: profile.id,
    name: profile.display_name,
    username: profile.username,
    email: profile.email,
    avatarUrl: "/avatar-placeholder.svg",
    level,
    xp: profile.xp,
    xpToNextLevel,
    streak: effectiveStreak(profile.streak, profile.last_activity_date, now),
    joinedAt: profile.created_at.slice(0, 10),
    goal: profile.goal,
    skillLevel: profile.skill_level,
    dailyMinutes: profile.daily_minutes,
    knownAreas: profile.known_areas,
    badges: badges.map((badge) => ({ ...badge, earned: earnedAt.has(badge.id), earnedAt: earnedAt.get(badge.id) })),
    skills: computeSkills(completedLessons),
    completedLessons,
    completedChallenges: challenges.map((row) => row.challenge_id),
    completedQuizzes: quizzes.filter((row) => row.passed).length,
    quizResults: Object.fromEntries(quizzes.map((row) => [row.quiz_id, {
      score: row.best_score,
      totalQuestions: row.total_questions,
      earnedXp: row.earned_xp,
      passed: row.passed,
      completedAt: row.best_at,
    }])),
    lastActivityDate: profile.last_activity_date ?? undefined,
    isAdmin: profile.role === "admin",
    onboardingCompleted: profile.onboarding_completed,
  };
}

const errorMessages: Record<string, string> = {
  "Invalid login credentials": "Adresse e-mail ou mot de passe incorrect.",
  "Email not confirmed": "Confirme ton adresse e-mail avec le lien reçu avant de te connecter.",
  "User already registered": "Un compte existe déjà avec cette adresse. Connecte-toi ou réinitialise ton mot de passe.",
  "Password should be at least 6 characters.": "Le mot de passe doit contenir au moins 8 caractères.",
  "New password should be different from the old password.": "Choisis un mot de passe différent de l’ancien.",
  "Failed to fetch": "Connexion au serveur impossible. Vérifie ta connexion internet puis réessaie.",
};

/** Turns Supabase/PostgREST errors into French messages without leaking internals. */
export function friendlyError(error: unknown, fallback = "Une erreur est survenue. Réessaie dans un instant.") {
  const details = error && typeof error === "object" ? error as { message?: unknown; hint?: unknown } : {};
  const message = typeof details.message === "string" ? details.message : "";
  // Errors raised by CyberPingo SQL functions carry this hint and are written for learners.
  if (details.hint === "cyberpingo" && message) return message;
  if (errorMessages[message]) return errorMessages[message];
  if (/rate limit|too many/i.test(message)) return "Trop de tentatives. Patiente quelques minutes avant de réessayer.";
  if (/network|fetch/i.test(message)) return errorMessages["Failed to fetch"];
  return fallback;
}
