import { courses } from "@/data/courses";
import { badges } from "@/data/badges";
import type { Quiz, User } from "@/types";

export const dailyGoals = [10, 20, 30, 45, 60, 90];

export function isStoredUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  if (!["id", "email", "name", "username", "avatarUrl", "joinedAt"].every((field) => typeof profile[field] === "string")) return false;
  if (!["xp", "level", "xpToNextLevel", "streak", "dailyMinutes"].every((field) => typeof profile[field] === "number" && Number.isFinite(profile[field]) && Number(profile[field]) >= 0)) return false;
  if (!Array.isArray(profile.badges) || !profile.badges.every((badge) => badge && typeof badge.id === "string" && typeof badge.earned === "boolean")) return false;
  for (const field of ["completedLessons", "completedChallenges"]) {
    if (profile[field] !== undefined && (!Array.isArray(profile[field]) || !profile[field].every((id) => typeof id === "string"))) return false;
  }
  if (profile.quizResults !== undefined) {
    if (!profile.quizResults || typeof profile.quizResults !== "object" || Array.isArray(profile.quizResults)) return false;
    for (const result of Object.values(profile.quizResults)) {
      if (!result || typeof result !== "object" || !Number.isInteger(result.score) || !Number.isInteger(result.totalQuestions) || result.totalQuestions <= 0 || result.score < 0 || result.score > result.totalQuestions || !Number.isFinite(result.earnedXp) || result.earnedXp < 0 || typeof result.passed !== "boolean" || typeof result.completedAt !== "string") return false;
    }
  }
  return true;
}

export function computeLevel(xp: number) {
  let level = 1;
  let threshold = 800;
  let remaining = xp;
  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = Math.round(threshold * 1.2);
  }
  return { level, xpToNextLevel: threshold, levelXp: remaining };
}

export function computeSkills(completed: string[]): User["skills"] {
  return courses.map((course) => ({
    name: course.category,
    percent: course.lessons.length ? Math.round(course.lessons.filter((lesson) => completed.includes(lesson.id)).length / course.lessons.length * 100) : 0,
  }));
}

export function refreshBadges(user: User): User {
  const network = courses.find((course) => course.id === "c2");
  return { ...user, badges: badges.map((badge) => {
    const previous = user.badges.find((item) => item.id === badge.id);
    const earned = previous?.earned ||
      (badge.id === "b1" && user.completedLessons.length > 0) ||
      (badge.id === "b2" && user.streak >= 7) ||
      (badge.id === "b3" && user.completedChallenges.length > 0) ||
      (badge.id === "b4" && user.completedQuizzes >= 10) ||
      (badge.id === "b5" && !!network?.lessons.length && network.lessons.every((lesson) => user.completedLessons.includes(lesson.id)));
    return { ...badge, earned, earnedAt: earned ? previous?.earnedAt ?? new Date().toISOString().slice(0, 10) : undefined };
  }) };
}

export function rewardProgress(user: User, amount: number, now = new Date()): User {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("La récompense XP doit être positive ou nulle.");
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const streak = user.lastActivityDate === today ? user.streak : user.lastActivityDate === yesterday ? user.streak + 1 : 1;
  const xp = user.xp + amount;
  const { level, xpToNextLevel } = computeLevel(xp);
  return refreshBadges({ ...user, xp, level, xpToNextLevel, streak, lastActivityDate: today, skills: computeSkills(user.completedLessons) });
}

export function recordQuiz(user: User, quiz: Quiz, score: number, now = new Date()): { user: User; awarded: number } {
  if (!quiz.questions.length || !Number.isInteger(score) || score < 0 || score > quiz.questions.length) throw new Error("Résultat de quiz invalide.");
  const previous = user.quizResults[quiz.id];
  const earnedXp = Math.round(score / quiz.questions.length * quiz.xpReward);
  const awarded = Math.max(0, earnedXp - (previous?.earnedXp ?? 0));
  const better = !previous || score / quiz.questions.length > previous.score / previous.totalQuestions;
  if (!better) return { user, awarded: 0 };
  const quizResults = { ...user.quizResults, [quiz.id]: {
    score, totalQuestions: quiz.questions.length, earnedXp: Math.max(previous?.earnedXp ?? 0, earnedXp),
    passed: score / quiz.questions.length >= .7, completedAt: now.toISOString(),
  } };
  const completedQuizzes = Object.values(quizResults).filter((result) => result.passed).length;
  return { user: rewardProgress({ ...user, quizResults, completedQuizzes }, awarded, now), awarded };
}

export function resetUserProgress(user: User): User {
  return {
    ...user, xp: 0, level: 1, xpToNextLevel: 800, streak: 0, lastActivityDate: undefined,
    completedLessons: [], completedChallenges: [], completedQuizzes: 0, quizResults: {},
    badges: badges.map((badge) => ({ ...badge, earned: false, earnedAt: undefined })),
    skills: computeSkills([]),
  };
}

export function migrateUser(user: User): User {
  const quizResults = user.quizResults ?? {};
  const completedLessons = user.completedLessons ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return refreshBadges({
    ...user, quizResults, completedLessons,
    completedChallenges: user.completedChallenges ?? [],
    completedQuizzes: Object.values(quizResults).filter((result) => result.passed).length,
    skills: computeSkills(completedLessons),
    streak: user.lastActivityDate === today || user.lastActivityDate === yesterday ? user.streak : 0,
  });
}

export function profileKey(id: string) { return `cyberpingo_user_${id}`; }

export function safeReturnPath(next: string | null, isAdmin: boolean) {
  const fallback = isAdmin ? "/dashboard" : "/courses";
  if (!next || !/^\/(courses|lessons|quiz|challenges|mentor|profile|progression|parametres|dashboard|onboarding)(\/[a-zA-Z0-9_-]+)*$/.test(next)) return fallback;
  if (!isAdmin && next.startsWith("/dashboard")) return fallback;
  return next;
}
