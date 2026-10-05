import { getSupabaseBrowserClient, type TypedSupabaseClient } from "@/lib/supabase/client";
import { AppError, unwrap } from "@/lib/errors";
import type { Tables } from "@/types/database.types";
import type {
  CourseStatus, Lab, LabAsset, LabAssetKind, LabCategory, LabFormat, LabReport, LabSubmission, LabTask, LabTaskResult, ReportStatus, SkillLevel,
} from "@/types/api";

const LAB_COLUMNS = "id, slug, title, description, category, difficulty, xp_reward, objectives, hints, terminal_lines, flag_placeholder, status, position, course_id, format, briefing, constraints, tools, requires_computer, is_assessment, estimated_minutes, cb_price";
type LabRow = Pick<Tables<"labs">, "id" | "slug" | "title" | "description" | "category" | "difficulty" | "xp_reward" | "objectives" | "hints" | "terminal_lines" | "flag_placeholder" | "status" | "position" | "course_id" | "format" | "briefing" | "constraints" | "tools" | "requires_computer" | "is_assessment" | "estimated_minutes" | "cb_price">;

function toLab(row: LabRow, solvedAt: string | null): Lab {
  return {
    ...row,
    category: row.category as LabCategory,
    difficulty: row.difficulty as SkillLevel,
    status: row.status as CourseStatus,
    format: row.format as LabFormat,
    solved: Boolean(solvedAt),
    solved_at: solvedAt,
  };
}

async function mySolvedLabs(userId: string | null) {
  if (!userId) return new Map<string, string>();
  const supabase = getSupabaseBrowserClient();
  const rows = unwrap(await supabase.from("lab_completions").select("lab_id, completed_at").eq("user_id", userId), "Impossible de charger tes labs résolus.") ?? [];
  return new Map(rows.map((row) => [row.lab_id, row.completed_at]));
}

/** Published labs (drafts too for staff, through RLS), with the learner's solved state. */
export async function listLabs(userId: string | null, client?: TypedSupabaseClient): Promise<Lab[]> {
  const supabase = client ?? getSupabaseBrowserClient();
  const [rows, solved] = await Promise.all([
    supabase.from("labs").select(LAB_COLUMNS).eq("status", "published").order("position").order("title"),
    mySolvedLabs(userId),
  ]);
  return (unwrap(rows, "Impossible de charger les labs.") ?? []).map((row) => toLab(row, solved.get(row.id) ?? null));
}

export async function getLab(slugOrId: string, userId: string | null): Promise<Lab | null> {
  const supabase = getSupabaseBrowserClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  const query = supabase.from("labs").select(LAB_COLUMNS);
  const row = unwrap(await (isUuid ? query.eq("id", slugOrId) : query.eq("slug", slugOrId)).maybeSingle(), "Impossible de charger ce lab.");
  if (!row) return null;
  const solved = await mySolvedLabs(userId);
  return toLab(row, solved.get(row.id) ?? null);
}

/** The flag is compared to a hash server-side; wrong answers are rate-limited (10 / 10 min). */
export async function submitLab(labId: string, answer: string): Promise<LabSubmission> {
  const value = answer.trim();
  if (!value) throw new AppError("invalid", "Saisis ta réponse avant de valider.");
  if (value.length > 300) throw new AppError("invalid", "Ta réponse est trop longue.");
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("submit_lab", { p_lab_id: labId, p_answer: value }), "Ta réponse n’a pas pu être vérifiée. Réessaie.") as unknown as LabSubmission;
}

/** Tasks never expose their accepted answers: those live in a private table checked by submit_lab_task(). */
export async function listLabTasks(labId: string, userId: string | null): Promise<LabTask[]> {
  const supabase = getSupabaseBrowserClient();
  const [rows, done] = await Promise.all([
    supabase.from("lab_tasks").select("id, lab_id, position, prompt, hint, answer_format").eq("lab_id", labId).order("position"),
    userId
      ? supabase.from("lab_task_completions").select("task_id").eq("user_id", userId).eq("lab_id", labId)
      : Promise.resolve({ data: [] as { task_id: string }[], error: null }),
  ]);
  const solved = new Set((unwrap(done, "Impossible de charger ta progression sur ce lab.") ?? []).map((row) => row.task_id));
  return (unwrap(rows, "Impossible de charger les tâches de ce lab.") ?? []).map((row) => ({ ...row, solved: solved.has(row.id) }));
}

export async function listLabAssets(labId: string): Promise<LabAsset[]> {
  const supabase = getSupabaseBrowserClient();
  const rows = unwrap(
    await supabase.from("lab_assets").select("id, lab_id, kind, title, description, url, position").eq("lab_id", labId).order("position"),
    "Impossible de charger les ressources de ce lab.",
  ) ?? [];
  return rows.map((row) => ({ ...row, kind: row.kind as LabAssetKind }));
}

export async function submitLabTask(taskId: string, answer: string): Promise<LabTaskResult> {
  const value = answer.trim();
  if (!value) throw new AppError("invalid", "Saisis ta réponse avant de valider.");
  if (value.length > 300) throw new AppError("invalid", "Ta réponse est trop longue.");
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("submit_lab_task", { p_task_id: taskId, p_answer: value }), "Ta réponse n’a pas pu être vérifiée. Réessaie.") as unknown as LabTaskResult;
}

export async function getMyReport(labId: string, userId: string): Promise<LabReport | null> {
  const supabase = getSupabaseBrowserClient();
  const row = unwrap(
    await supabase.from("lab_submissions").select("id, lab_id, note, link, status, feedback, created_at, updated_at, reviewed_at").eq("lab_id", labId).eq("user_id", userId).maybeSingle(),
    "Impossible de charger ton rapport.",
  );
  return row ? { ...row, status: row.status as ReportStatus } : null;
}

export async function submitLabReport(labId: string, note: string, link: string): Promise<void> {
  const text = note.trim();
  if (!text) throw new AppError("invalid", "Décris ce que tu as fait avant d’envoyer ton rapport.");
  if (text.length > 2000) throw new AppError("invalid", "Ton rapport est trop long (2000 caractères maximum).");
  const url = link.trim();
  if (url && !/^https:\/\/\S{4,}$/.test(url)) throw new AppError("invalid", "Le lien doit commencer par https://.");
  const supabase = getSupabaseBrowserClient();
  unwrap(await supabase.rpc("submit_lab_report", { p_lab_id: labId, p_note: text, p_link: url || undefined }), "Ton rapport n’a pas pu être envoyé. Réessaie.");
}