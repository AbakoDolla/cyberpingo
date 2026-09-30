"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppError, unwrap } from "@/lib/errors";
import { QUIZ_OUTLINE_COLUMNS } from "@/services/courses.service";
import type { Difficulty, QuestionType, QuizAttemptSummary, QuizDetail, QuizOutline, QuizSubmission } from "@/types/api";

/**
 * Loads a quiz for answering. Correct answers and explanations are not readable by learners
 * (column grants); they only come back from submit_quiz() once the attempt is graded.
 */
export async function getQuiz(quizId: string): Promise<QuizDetail | null> {
  const supabase = getSupabaseBrowserClient();
  const quiz = unwrap(await supabase.from("quizzes").select(`${QUIZ_OUTLINE_COLUMNS}, course_id`).eq("id", quizId).maybeSingle(), "Impossible de charger ce quiz.") as
    (QuizOutline & { course_id: string }) | null;
  if (!quiz) return null;
  const [course, lesson, questions] = await Promise.all([
    supabase.from("courses").select("id, slug, title").eq("id", quiz.course_id).maybeSingle(),
    quiz.lesson_id ? supabase.from("lessons").select("id, title").eq("id", quiz.lesson_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("quiz_questions").select("id, position, question_type, prompt, image_url, difficulty, xp_reward").eq("quiz_id", quizId).order("position"),
  ]);
  const courseRow = unwrap(course, "Impossible de charger le parcours de ce quiz.");
  if (!courseRow) return null;
  const questionRows = unwrap(questions, "Impossible de charger les questions.") ?? [];
  const answers = questionRows.length
    ? unwrap(
      await supabase.from("quiz_answers").select("id, question_id, position, label").in("question_id", questionRows.map((question) => question.id)).order("position"),
      "Impossible de charger les réponses proposées.",
    ) ?? []
    : [];
  const { course_id: _courseId, ...outline } = quiz;
  void _courseId;
  const formatted = questionRows.map((question) => ({
    ...question,
    question_type: question.question_type as QuestionType,
    difficulty: question.difficulty as Difficulty,
    answers: answers.filter((answer) => answer.question_id === question.id).map(({ id, label, position }) => ({ id, label, position })),
  }));
  return {
    ...outline,
    course: courseRow,
    lesson: unwrap(lesson, "Impossible de charger la leçon de ce quiz.") ?? null,
    questions: formatted,
    total_xp: formatted.reduce((sum, question) => sum + question.xp_reward, 0),
  };
}

/** answers: question id → selected answer ids. Grading, XP and rewards happen in SQL (30 attempts / 10 min). */
export async function submitQuiz(quizId: string, answers: Record<string, string[]>): Promise<QuizSubmission> {
  if (!Object.keys(answers).length) throw new AppError("invalid", "Réponds au moins à une question avant de valider.");
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("submit_quiz", { p_quiz_id: quizId, p_answers: answers }), "Ton résultat n’a pas pu être enregistré. Réessaie.") as unknown as QuizSubmission;
}

export async function getMyQuizAttempts(userId: string, quizId: string): Promise<QuizAttemptSummary> {
  const supabase = getSupabaseBrowserClient();
  const rows = unwrap(
    await supabase.from("quiz_attempts").select("percentage, passed, created_at").eq("user_id", userId).eq("quiz_id", quizId).order("created_at", { ascending: false }),
    "Impossible de charger tes tentatives.",
  ) ?? [];
  return {
    attempts: rows.length,
    best_percentage: rows.length ? Math.max(...rows.map((row) => row.percentage)) : null,
    passed: rows.some((row) => row.passed),
    last_attempt_at: rows[0]?.created_at ?? null,
  };
}
