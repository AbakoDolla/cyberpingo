"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { unwrap } from "@/lib/errors";
import { parseLessonBlocks } from "@/lib/lesson-content";
import { QUIZ_OUTLINE_COLUMNS } from "@/services/courses.service";
import type { CourseStatus, LessonCompletion, LessonDetail, LessonProgressState, LessonStart, LessonStatus, QuizOutline } from "@/types/api";

/** A lesson with its content, its course/module context, its quiz and the course sequence for navigation. */
export async function getLesson(lessonId: string): Promise<LessonDetail | null> {
  const supabase = getSupabaseBrowserClient();
  const lesson = unwrap(
    await supabase.from("lessons")
      .select("id, course_id, module_id, title, summary, content_type, content, duration_minutes, xp_reward, position")
      .eq("id", lessonId)
      .maybeSingle(),
    "Impossible de charger cette leçon.",
  );
  if (!lesson) return null;
  const [course, modules, lessons, quiz] = await Promise.all([
    supabase.from("courses").select("id, slug, title, status").eq("id", lesson.course_id).maybeSingle(),
    supabase.from("course_modules").select("id, title, position").eq("course_id", lesson.course_id).order("position"),
    supabase.from("lessons").select("id, module_id, title, position").eq("course_id", lesson.course_id).order("position"),
    supabase.from("quizzes").select(QUIZ_OUTLINE_COLUMNS).eq("lesson_id", lesson.id).order("position").limit(1).maybeSingle(),
  ]);
  const courseRow = unwrap(course, "Impossible de charger le parcours de cette leçon.");
  if (!courseRow) return null;
  const moduleRows = unwrap(modules, "Impossible de charger les modules.") ?? [];
  const lessonRows = unwrap(lessons, "Impossible de charger les leçons.") ?? [];
  const modulePosition = new Map(moduleRows.map((module) => [module.id, module.position]));
  const sequence = [...lessonRows]
    .sort((a, b) => (modulePosition.get(a.module_id) ?? 0) - (modulePosition.get(b.module_id) ?? 0) || a.position - b.position)
    .map(({ id, title }) => ({ id, title }));
  const module = moduleRows.find((item) => item.id === lesson.module_id) ?? { id: lesson.module_id, title: "", position: 0 };
  const { content, ...outline } = lesson;
  return {
    ...outline,
    blocks: parseLessonBlocks(content),
    course: { ...courseRow, status: courseRow.status as CourseStatus },
    module,
    quiz: (unwrap(quiz, "Impossible de charger le quiz de cette leçon.") as QuizOutline | null) ?? null,
    sequence,
  };
}

export async function getMyLessonProgress(userId: string, lessonId: string): Promise<LessonProgressState | null> {
  const supabase = getSupabaseBrowserClient();
  const row = unwrap(
    await supabase.from("lesson_progress").select("lesson_id, status, progress_percentage, completed_at").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle(),
    "Impossible de charger ta progression.",
  );
  return row ? { ...row, status: row.status as LessonStatus } : null;
}

/** Marks the lesson as started (enrolling in its course if needed). Staff previews are not recorded. */
export async function startLesson(lessonId: string): Promise<LessonStart> {
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("start_lesson", { p_lesson_id: lessonId }), "La leçon n’a pas pu être ouverte.") as unknown as LessonStart;
}

/** Saves the reading position (capped at 99 %: only complete_lesson can reach 100 %). */
export async function saveLessonProgress(lessonId: string, percentage: number) {
  const supabase = getSupabaseBrowserClient();
  const value = Math.max(0, Math.min(99, Math.round(percentage)));
  unwrap(await supabase.rpc("save_lesson_progress", { p_lesson_id: lessonId, p_percentage: value }), "Ta progression n’a pas pu être sauvegardée.");
}

/** Server-validated completion: XP, streak, badges, challenges and certificate are granted atomically. */
export async function completeLesson(lessonId: string): Promise<LessonCompletion> {
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("complete_lesson", { p_lesson_id: lessonId }), "La leçon n’a pas pu être validée. Réessaie.") as unknown as LessonCompletion;
}
