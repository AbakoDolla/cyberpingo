import { courses } from "@/data/courses";
import { badges } from "@/data/badges";
import type { User } from "@/types";

export const dailyGoals = [10, 20, 30, 45, 60, 90];

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

export function resetUserProgress(user: User): User {
  return {
    ...user, xp: 0, level: 1, xpToNextLevel: 800, streak: 0, lastActivityDate: undefined,
    completedLessons: [], completedChallenges: [], completedQuizzes: 0, quizResults: {},
    badges: badges.map((badge) => ({ ...badge, earned: false, earnedAt: undefined })),
    skills: computeSkills([]),
  };
}

export function safeReturnPath(next: string | null, isAdmin: boolean) {
  const fallback = isAdmin ? "/dashboard" : "/courses";
  if (!next || !/^\/(courses|lessons|quiz|challenges|mentor|profile|progression|parametres|dashboard|onboarding)(\/[a-zA-Z0-9_-]+)*$/.test(next)) return fallback;
  if (!isAdmin && next.startsWith("/dashboard")) return fallback;
  return next;
}
