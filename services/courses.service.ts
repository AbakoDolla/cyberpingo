import { getSupabaseBrowserClient, type TypedSupabaseClient } from "@/lib/supabase/client";
import { unwrap } from "@/lib/errors";
import type { Tables, Views } from "@/types/database.types";
import type {
  AccessLevel, CourseDetail, CourseProgress, CourseStatus, CourseSummary, EnrollmentStatus, LessonOutline, LessonProgressState,
  LessonStatus, ModuleOutline, QuizOutline, SkillLevel,
} from "@/types/api";

export const COURSE_COLUMNS =
  "id, slug, title, short_description, description, thumbnail_url, level, category, icon, estimated_duration, status, access_level, position, completion_xp, certificate_enabled, published_at, cb_price, prerequisite_course_id";
// Never select lessons.content here: visitors are only granted the outline columns.
export const LESSON_OUTLINE_COLUMNS = "id, module_id, title, summary, content_type, duration_minutes, xp_reward, position";
export const QUIZ_OUTLINE_COLUMNS = "id, module_id, lesson_id, title, description, pass_percentage, position";

type CourseRow = Pick<Tables<"courses">,
  "id" | "slug" | "title" | "short_description" | "description" | "thumbnail_url" | "level" | "category" | "icon" | "estimated_duration"
  | "status" | "access_level" | "position" | "completion_xp" | "certificate_enabled" | "published_at" | "cb_price" | "prerequisite_course_id">;

export function toCourseSummary(row: CourseRow, counts: { modules: number; lessons: number; quizzes: number }): CourseSummary {
  return {
    ...row,
    level: row.level as SkillLevel,
    status: row.status as CourseStatus,
    access_level: row.access_level as AccessLevel,
    module_count: counts.modules,
    lesson_count: counts.lessons,
    quiz_count: counts.quizzes,
  };
}

const countOf = (value: unknown) => (Array.isArray(value) && typeof value[0]?.count === "number" ? value[0].count as number : 0);
const lengthOf = (value: unknown) => (Array.isArray(value) ? value.length : 0);

/**
 * Published catalog, in editorial order, with module / lesson / quiz counts.
 * Visitors only hold column-level SELECT on lessons, which PostgREST's `count` aggregate rejects,
 * so lessons are counted from their ids instead.
 */
export async function listPublishedCourses(client?: TypedSupabaseClient): Promise<CourseSummary[]> {
  const supabase = client ?? getSupabaseBrowserClient();
  const rows = unwrap(
    await supabase.from("courses")
      .select(`${COURSE_COLUMNS}, course_modules(count), lessons(id), quizzes(count)`)
      .eq("status", "published")
      .order("position")
      .order("title"),
    "Impossible de charger les parcours.",
  );
  return (rows ?? []).map((row) => {
    const { course_modules, lessons, quizzes, ...course } = row as CourseRow & { course_modules: unknown; lessons: unknown; quizzes: unknown };
    return toCourseSummary(course, { modules: countOf(course_modules), lessons: lengthOf(lessons), quizzes: countOf(quizzes) });
  });
}

/**
 * Full outline of one course. RLS decides visibility: published for everyone, archived for enrolled
 * learners, drafts for staff (preview).
 */
export async function getCourseBySlug(slug: string, client?: TypedSupabaseClient): Promise<CourseDetail | null> {
  const supabase = client ?? getSupabaseBrowserClient();
  const course = unwrap(await supabase.from("courses").select(COURSE_COLUMNS).eq("slug", slug).maybeSingle(), "Impossible de charger ce parcours.");
  if (!course) return null;
  const [modules, lessons, quizzes] = await Promise.all([
    supabase.from("course_modules").select("id, title, description, position").eq("course_id", course.id).order("position"),
    supabase.from("lessons").select(LESSON_OUTLINE_COLUMNS).eq("course_id", course.id).order("position"),
    supabase.from("quizzes").select(QUIZ_OUTLINE_COLUMNS).eq("course_id", course.id).order("position"),
  ]);
  const moduleRows = unwrap(modules, "Impossible de charger les modules.") ?? [];
  const lessonRows = (unwrap(lessons, "Impossible de charger les leçons.") ?? []) as LessonOutline[];
  const quizRows = (unwrap(quizzes, "Impossible de charger les quiz.") ?? []) as QuizOutline[];

  const lessonQuizzes: Record<string, QuizOutline> = {};
  for (const quiz of quizRows) if (quiz.lesson_id) lessonQuizzes[quiz.lesson_id] = quiz;
  const outline: ModuleOutline[] = moduleRows.map((module) => ({
    ...module,
    lessons: lessonRows.filter((lesson) => lesson.module_id === module.id),
    quizzes: quizRows.filter((quiz) => quiz.module_id === module.id && !quiz.lesson_id),
  }));
  return {
    ...toCourseSummary(course, { modules: moduleRows.length, lessons: lessonRows.length, quizzes: quizRows.length }),
    modules: outline,
    lesson_quizzes: lessonQuizzes,
  };
}

/** Lessons in learning order (module position, then lesson position). */
export function orderedLessons(course: Pick<CourseDetail, "modules">) {
  return course.modules.flatMap((module) => module.lessons);
}

function toCourseProgress(row: Views<"course_progress">): CourseProgress | null {
  if (!row.course_id || !row.status || !row.enrolled_at) return null;
  return {
    course_id: row.course_id,
    status: row.status as EnrollmentStatus,
    enrolled_at: row.enrolled_at,
    completed_at: row.completed_at,
    last_lesson_id: row.last_lesson_id,
    last_activity_at: row.last_activity_at ?? row.enrolled_at,
    total_lessons: row.total_lessons ?? 0,
    completed_lessons: row.completed_lessons ?? 0,
    total_quizzes: row.total_quizzes ?? 0,
    passed_quizzes: row.passed_quizzes ?? 0,
    progress_percentage: row.progress_percentage ?? 0,
  };
}

/** The current learner's enrollments (the view is security_invoker; staff see everyone, hence the filter). */
export async function listMyCourseProgress(userId: string): Promise<CourseProgress[]> {
  const supabase = getSupabaseBrowserClient();
  const rows = unwrap(
    await supabase.from("course_progress").select("*").eq("user_id", userId).order("last_activity_at", { ascending: false }),
    "Impossible de charger ta progression.",
  );
  return (rows ?? []).map(toCourseProgress).filter((item): item is CourseProgress => item !== null);
}

export async function getMyCourseProgress(userId: string, courseId: string): Promise<CourseProgress | null> {
  const supabase = getSupabaseBrowserClient();
  const row = unwrap(
    await supabase.from("course_progress").select("*").eq("user_id", userId).eq("course_id", courseId).maybeSingle(),
    "Impossible de charger ta progression.",
  );
  return row ? toCourseProgress(row) : null;
}

export async function listMyLessonProgress(userId: string, courseId: string): Promise<LessonProgressState[]> {
  const supabase = getSupabaseBrowserClient();
  const rows = unwrap(
    await supabase.from("lesson_progress").select("lesson_id, status, progress_percentage, completed_at").eq("user_id", userId).eq("course_id", courseId),
    "Impossible de charger ta progression.",
  );
  return (rows ?? []).map((row) => ({ ...row, status: row.status as LessonStatus }));
}

/** Best result per quiz of a course for the current learner. */
export async function listMyQuizResults(userId: string, courseId: string) {
  const supabase = getSupabaseBrowserClient();
  const rows = unwrap(
    await supabase.from("quiz_attempts").select("quiz_id, percentage, passed").eq("user_id", userId).eq("course_id", courseId),
    "Impossible de charger tes résultats de quiz.",
  );
  const best: Record<string, { best_percentage: number; passed: boolean; attempts: number }> = {};
  for (const row of rows ?? []) {
    const current = best[row.quiz_id] ?? { best_percentage: 0, passed: false, attempts: 0 };
    best[row.quiz_id] = { best_percentage: Math.max(current.best_percentage, row.percentage), passed: current.passed || row.passed, attempts: current.attempts + 1 };
  }
  return best;
}

/** Idempotent: enrolling twice returns the existing enrollment. Free courses only (checked in SQL). */
export async function enrollInCourse(courseId: string): Promise<CourseProgress | null> {
  const supabase = getSupabaseBrowserClient();
  const row = unwrap(await supabase.rpc("enroll_in_course", { p_course_id: courseId }), "L’inscription au parcours a échoué. Réessaie.");
  return row ? toCourseProgress(row as unknown as Views<"course_progress">) : null;
}
