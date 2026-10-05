import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { unwrap } from "@/lib/errors";
import type { ExamStartResult, ExamStatus, ExamSubmitResult } from "@/types/exam";

export async function getCourseExamStatus(courseId: string): Promise<ExamStatus> {
  const supabase = getSupabaseBrowserClient();
  return unwrap(
    await supabase.rpc("get_course_exam_status", { p_course_id: courseId }),
    "Impossible de charger le statut de l’examen."
  ) as unknown as ExamStatus;
}

export async function startCourseExam(courseId: string): Promise<ExamStartResult> {
  const supabase = getSupabaseBrowserClient();
  return unwrap(
    await supabase.rpc("start_course_exam", { p_course_id: courseId }),
    "Impossible de démarrer l’examen."
  ) as unknown as ExamStartResult;
}

export async function submitCourseExam(attemptId: string, answers: Record<string, string[]>): Promise<ExamSubmitResult> {
  const supabase = getSupabaseBrowserClient();
  return unwrap(
    await supabase.rpc("submit_course_exam", { p_attempt_id: attemptId, p_answers: answers }),
    "La soumission de l’examen a échoué. Tes réponses ont été conservées, réessaie."
  ) as unknown as ExamSubmitResult;
}
