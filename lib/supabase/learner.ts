import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearnerSnapshot } from "@/types/database";

/** Loads everything the learner UI needs. Filters by user because admins may read every row. */
export async function fetchLearnerSnapshot(supabase: SupabaseClient, userId: string): Promise<LearnerSnapshot> {
  const [profile, lessons, quizzes, challenges, badges] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("lesson_completions").select("lesson_id, course_id, xp_earned, completed_at").eq("user_id", userId),
    supabase.from("quiz_results").select("quiz_id, best_score, total_questions, earned_xp, passed, attempts, best_at, last_attempt_at").eq("user_id", userId),
    supabase.from("challenge_completions").select("challenge_id, xp_earned, completed_at").eq("user_id", userId),
    supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", userId),
  ]);
  const failed = [profile, lessons, quizzes, challenges, badges].find((result) => result.error);
  if (failed?.error) throw failed.error;
  return {
    profile: profile.data,
    lessons: lessons.data ?? [],
    quizzes: quizzes.data ?? [],
    challenges: challenges.data ?? [],
    badges: badges.data ?? [],
  };
}
