import { getSupabaseBrowserClient, type TypedSupabaseClient } from "@/lib/supabase/client";
import { AppError, unwrap } from "@/lib/errors";
import type { Tables } from "@/types/database.types";
import type { CourseStatus, Lab, LabCategory, LabSubmission, SkillLevel } from "@/types/api";

const LAB_COLUMNS = "id, slug, title, description, category, difficulty, xp_reward, objectives, hints, terminal_lines, flag_placeholder, status, position";
type LabRow = Pick<Tables<"labs">, "id" | "slug" | "title" | "description" | "category" | "difficulty" | "xp_reward" | "objectives" | "hints" | "terminal_lines" | "flag_placeholder" | "status" | "position">;

function toLab(row: LabRow, solvedAt: string | null): Lab {
  return {
    ...row,
    category: row.category as LabCategory,
    difficulty: row.difficulty as SkillLevel,
    status: row.status as CourseStatus,
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
