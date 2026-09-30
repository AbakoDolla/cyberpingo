import { FunctionsHttpError, type RealtimeChannel } from "@supabase/supabase-js";
import { AppError, toAppError, unwrap } from "@/lib/errors";
import { parseLessonBlocks } from "@/lib/lesson-content";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Role } from "@/lib/roles";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@/types/database.types";
import type {
  AccessLevel, AdminCourseStats, AdminOverview, AdminQuiz, AdminQuizQuestion, AdminUserDetail, AdminUsersPage,
  CourseImport, CourseImportResult, CourseStatus, LabCategory, LessonBlock, LevelInfo, SkillLevel,
} from "@/types/api";

export type CourseRow = Tables<"courses"> & { status: CourseStatus; level: SkillLevel; access_level: AccessLevel };
export type CourseModuleRow = Tables<"course_modules">;
export type LessonRow = Omit<Tables<"lessons">, "content"> & { content: Json; blocks: LessonBlock[] };
export type QuizRow = Tables<"quizzes">;
export type LabRow = Tables<"labs"> & { category: LabCategory; difficulty: SkillLevel; status: CourseStatus };
export type BadgeRow = Tables<"badges">;
export type ChallengeRow = Tables<"challenges">;
export type ContactMessageRow = Tables<"contact_messages">;
export type AdminLogRow = Tables<"admin_logs"> & { actor: ProfileSummary | null };
export type LearnerSessionRow = Tables<"learner_sessions">;
export type ActivityEventRow = Tables<"activity_events">;

export interface ProfileSummary {
  id?: string;
  display_name: string;
  username: string;
  email?: string;
  avatar_path: string | null;
  role: Role;
  xp: number;
}

export interface AdminCourseListItem extends CourseRow {
  module_count: number;
  lesson_count: number;
  quiz_count: number;
}

export interface AdminCourseBundle {
  course: CourseRow;
  modules: CourseModuleRow[];
  lessons: LessonRow[];
  quizzes: QuizRow[];
}

export interface AdminCertificate extends Tables<"certificates"> {
  profile: Pick<Tables<"profiles">, "id" | "display_name" | "username" | "email" | "avatar_path"> | null;
  course: Pick<Tables<"courses">, "id" | "title" | "slug"> | null;
}

export interface LiveSession extends LearnerSessionRow { profile: ProfileSummary | null }
export interface LiveEvent extends ActivityEventRow { profile: ProfileSummary | null }

export type AdminAction = "ban" | "unban" | "delete_user" | "send_password_reset" | "auth_status";
export interface AdminAuthStatus { banned_until: string | null; email_confirmed_at: string | null; last_sign_in_at: string | null }
export interface AdminActionBody { action: AdminAction; user_id: string; reason?: string; ban_hours?: number }

export type CourseChanges = Partial<Pick<TablesUpdate<"courses">,
  "slug" | "title" | "short_description" | "description" | "thumbnail_url" | "level" | "category" | "icon" | "estimated_duration" |
  "status" | "access_level" | "position" | "completion_xp" | "certificate_enabled">>;
export type CourseCreate = Pick<TablesInsert<"courses">, "slug" | "title"> & CourseChanges;
export type ModuleChanges = Partial<Pick<TablesUpdate<"course_modules">, "title" | "description" | "position">>;
export type ModuleCreate = Pick<TablesInsert<"course_modules">, "course_id" | "title"> & ModuleChanges;
export type LessonChanges = Partial<Pick<TablesUpdate<"lessons">, "module_id" | "title" | "summary" | "content_type" | "duration_minutes" | "xp_reward" | "position">> & { blocks?: LessonBlock[] };
export type LessonCreate = Pick<TablesInsert<"lessons">, "course_id" | "module_id" | "title"> & LessonChanges;
export type QuizChanges = Partial<Pick<TablesUpdate<"quizzes">, "module_id" | "lesson_id" | "title" | "description" | "pass_percentage" | "position">>;
export type QuizCreate = Pick<TablesInsert<"quizzes">, "course_id" | "module_id" | "title"> & QuizChanges;
export type LabChanges = Partial<Pick<TablesUpdate<"labs">, "slug" | "title" | "description" | "category" | "difficulty" | "xp_reward" | "objectives" | "hints" | "terminal_lines" | "flag_placeholder" | "status" | "position">>;
export type LabCreate = Pick<TablesInsert<"labs">, "slug" | "title"> & LabChanges;
export type BadgeChanges = Partial<Pick<TablesUpdate<"badges">, "slug" | "name" | "description" | "icon" | "criteria_type" | "criteria_value" | "criteria_course_id" | "xp_reward" | "is_active" | "position">>;
export type BadgeCreate = Pick<TablesInsert<"badges">, "slug" | "name" | "criteria_type"> & BadgeChanges;
export type ChallengeChanges = Partial<Pick<TablesUpdate<"challenges">, "slug" | "title" | "description" | "icon" | "period" | "metric" | "target" | "xp_reward" | "is_active" | "starts_at" | "ends_at" | "position">>;
export type ChallengeCreate = Pick<TablesInsert<"challenges">, "slug" | "title" | "period" | "metric" | "target"> & ChallengeChanges;

const COURSE_SELECT = "id, slug, title, short_description, description, thumbnail_url, level, category, icon, estimated_duration, status, access_level, position, completion_xp, certificate_enabled, created_by, created_at, updated_at, published_at";
const MODULE_SELECT = "id, course_id, title, description, position, created_at, updated_at";
const LESSON_SELECT = "id, course_id, module_id, title, summary, content_type, content, duration_minutes, xp_reward, position, created_at, updated_at";
const QUIZ_SELECT = "id, course_id, module_id, lesson_id, title, description, pass_percentage, position, created_at, updated_at";

const asCourse = (row: Tables<"courses">): CourseRow => ({ ...row, status: row.status as CourseStatus, level: row.level as SkillLevel, access_level: row.access_level as AccessLevel });
const asLab = (row: Tables<"labs">): LabRow => ({ ...row, category: row.category as LabCategory, difficulty: row.difficulty as SkillLevel, status: row.status as CourseStatus });
const asLesson = (row: Tables<"lessons">): LessonRow => ({ ...row, blocks: parseLessonBlocks(row.content) });
const contentFromBlocks = (blocks: LessonBlock[]): Json => ({ blocks: blocks as unknown as Json[] });
const countOf = (value: unknown) => Array.isArray(value) && typeof value[0]?.count === "number" ? value[0].count as number : 0;

function supabase() { return getSupabaseBrowserClient(); }

function rpcJson<T>(value: Json | null, fallback: T): T {
  if (value === null) return fallback;
  return value as unknown as T;
}

function errorKindFromStatus(status: number): "unauthenticated" | "forbidden" | "not_found" | "invalid" | "rate_limited" | "server" {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 400 || status === 422) return "invalid";
  if (status === 429) return "rate_limited";
  return "server";
}

async function edgeAppError(error: unknown): Promise<AppError> {
  if (error instanceof FunctionsHttpError) {
    let message: string | undefined;
    try {
      const body = await error.context.json() as { error?: unknown };
      if (typeof body.error === "string") message = body.error;
    } catch {
      message = undefined;
    }
    return new AppError(errorKindFromStatus(error.context.status), message);
  }
  return toAppError(error);
}

// ─── Admin RPCs ──────────────────────────────────────────────────────────────

export async function adminOverview(): Promise<AdminOverview> {
  return rpcJson(unwrap(await supabase().rpc("admin_overview"), "Impossible de charger la vue d’ensemble."), {} as AdminOverview);
}

export async function adminUsers(params: { search?: string; role?: Role | "all"; limit?: number; offset?: number } = {}): Promise<AdminUsersPage> {
  const data = unwrap(await supabase().rpc("admin_users", {
    p_search: params.search || undefined,
    p_role: params.role && params.role !== "all" ? params.role : undefined,
    p_limit: params.limit ?? 50,
    p_offset: params.offset ?? 0,
  }), "Impossible de charger les utilisateurs.");
  return rpcJson(data, { total: 0, users: [] });
}

export async function adminUserDetail(userId: string): Promise<AdminUserDetail> {
  return rpcJson(unwrap(await supabase().rpc("admin_user_detail", { p_user: userId }), "Impossible de charger cet utilisateur."), {} as AdminUserDetail);
}

export async function adminSetRole(userId: string, role: Role): Promise<void> {
  unwrap(await supabase().rpc("admin_set_role", { p_user: userId, p_role: role }), "Le rôle n’a pas pu être modifié.");
}

export async function adminAdjustXp(userId: string, amount: number, reason: string): Promise<LevelInfo> {
  return rpcJson(unwrap(await supabase().rpc("admin_adjust_xp", { p_user: userId, p_amount: amount, p_reason: reason }), "L’ajustement XP a échoué."), {} as LevelInfo);
}

export async function adminGetQuiz(quizId: string): Promise<AdminQuiz | null> {
  const data = unwrap(await supabase().rpc("admin_get_quiz", { p_quiz_id: quizId }), "Impossible de charger le quiz.");
  return data ? rpcJson(data, null as AdminQuiz | null) : null;
}

export async function adminSaveQuiz(quizId: string, questions: AdminQuizQuestion[]): Promise<number> {
  return unwrap(await supabase().rpc("admin_save_quiz", { p_quiz_id: quizId, p_questions: questions as unknown as Json }), "Le quiz n’a pas pu être enregistré.") ?? 0;
}

export async function adminGetLabFlag(labId: string): Promise<string> {
  return unwrap(await supabase().rpc("admin_get_lab_flag", { p_lab_id: labId }), "Impossible de révéler la réponse du lab.") ?? "";
}

export async function adminSetLabFlag(labId: string, flag: string): Promise<void> {
  unwrap(await supabase().rpc("admin_set_lab_flag", { p_lab_id: labId, p_flag: flag }), "La réponse du lab n’a pas pu être enregistrée.");
}

export async function adminImportCourse(course: CourseImport): Promise<CourseImportResult> {
  return rpcJson(unwrap(await supabase().rpc("admin_import_course", { p_course: course as unknown as Json }), "L’import du cours a échoué."), {} as CourseImportResult);
}

export async function adminCourseStats(courseId: string): Promise<AdminCourseStats> {
  return rpcJson(unwrap(await supabase().rpc("admin_course_stats", { p_course_id: courseId }), "Impossible de charger les statistiques du cours."), {} as AdminCourseStats);
}

export async function adminRevokeCertificate(certificateId: string, reason: string): Promise<void> {
  unwrap(await supabase().rpc("admin_revoke_certificate", { p_certificate_id: certificateId, p_reason: reason }), "Le certificat n’a pas pu être révoqué.");
}

export async function adminRestoreCertificate(certificateId: string): Promise<void> {
  unwrap(await supabase().rpc("admin_restore_certificate", { p_certificate_id: certificateId }), "Le certificat n’a pas pu être restauré.");
}

export async function adminBroadcastNotification(input: { title: string; body: string; link?: string | null; audience?: "all" | "learners" | "staff" }): Promise<number> {
  return unwrap(await supabase().rpc("admin_broadcast_notification", {
    p_title: input.title,
    p_body: input.body,
    p_link: input.link || undefined,
    p_audience: input.audience ?? "all",
  }), "L’annonce n’a pas pu être envoyée.") ?? 0;
}

// ─── Edge Function admin-actions ─────────────────────────────────────────────

export async function adminAuthAction(body: AdminActionBody): Promise<{ ok: true } | AdminAuthStatus> {
  const result = await supabase().functions.invoke<{ ok: true } | AdminAuthStatus>("admin-actions", { body });
  if (result.error) throw await edgeAppError(result.error);
  if (!result.data) throw new AppError("server", "Réponse admin-actions vide.");
  return result.data;
}

export async function adminAuthStatus(userId: string): Promise<AdminAuthStatus> {
  return adminAuthAction({ action: "auth_status", user_id: userId }) as Promise<AdminAuthStatus>;
}

export async function adminRunUserAction(body: Exclude<AdminActionBody, { action: "auth_status" }>): Promise<{ ok: true }> {
  return adminAuthAction(body) as Promise<{ ok: true }>;
}

// ─── Content tables ──────────────────────────────────────────────────────────

export async function listAdminCourses(): Promise<AdminCourseListItem[]> {
  const rows = unwrap(await supabase().from("courses")
    .select(`${COURSE_SELECT}, course_modules(count), lessons(count), quizzes(count)`)
    .order("position").order("title"), "Impossible de charger les cours.") ?? [];
  return rows.map((row) => {
    const withCounts = row as unknown as Tables<"courses"> & { course_modules: unknown; lessons: unknown; quizzes: unknown };
    const { course_modules, lessons, quizzes, ...course } = withCounts;
    return { ...asCourse(course), module_count: countOf(course_modules), lesson_count: countOf(lessons), quiz_count: countOf(quizzes) };
  });
}

export async function getAdminCourseBundle(courseId: string): Promise<AdminCourseBundle | null> {
  const client = supabase();
  const course = unwrap(await client.from("courses").select(COURSE_SELECT).eq("id", courseId).maybeSingle(), "Impossible de charger le cours.");
  if (!course) return null;
  const [modules, lessons, quizzes] = await Promise.all([
    client.from("course_modules").select(MODULE_SELECT).eq("course_id", courseId).order("position").order("title"),
    client.from("lessons").select(LESSON_SELECT).eq("course_id", courseId).order("position").order("title"),
    client.from("quizzes").select(QUIZ_SELECT).eq("course_id", courseId).order("position").order("title"),
  ]);
  return {
    course: asCourse(course),
    modules: unwrap(modules, "Impossible de charger les modules.") ?? [],
    lessons: (unwrap(lessons, "Impossible de charger les leçons.") ?? []).map(asLesson),
    quizzes: unwrap(quizzes, "Impossible de charger les quiz.") ?? [],
  };
}

export async function createCourse(input: CourseCreate): Promise<CourseRow> {
  return asCourse(unwrap(await supabase().from("courses").insert(input).select(COURSE_SELECT).single(), "Le cours n’a pas pu être créé."));
}

export async function updateCourse(courseId: string, changes: CourseChanges): Promise<CourseRow> {
  return asCourse(unwrap(await supabase().from("courses").update(changes).eq("id", courseId).select(COURSE_SELECT).single(), "Le cours n’a pas pu être enregistré."));
}

export async function deleteCourse(courseId: string): Promise<void> {
  unwrap(await supabase().from("courses").delete().eq("id", courseId), "Le cours n’a pas pu être supprimé.");
}

export async function createModule(input: ModuleCreate): Promise<CourseModuleRow> {
  return unwrap(await supabase().from("course_modules").insert(input).select(MODULE_SELECT).single(), "Le module n’a pas pu être créé.");
}

export async function updateModule(moduleId: string, changes: ModuleChanges): Promise<CourseModuleRow> {
  return unwrap(await supabase().from("course_modules").update(changes).eq("id", moduleId).select(MODULE_SELECT).single(), "Le module n’a pas pu être enregistré.");
}

export async function deleteModule(moduleId: string): Promise<void> {
  unwrap(await supabase().from("course_modules").delete().eq("id", moduleId), "Le module n’a pas pu être supprimé.");
}

export async function createLesson(input: LessonCreate): Promise<LessonRow> {
  const { blocks, ...rest } = input;
  const payload: TablesInsert<"lessons"> = { ...rest, content: contentFromBlocks(blocks ?? []) };
  return asLesson(unwrap(await supabase().from("lessons").insert(payload).select(LESSON_SELECT).single(), "La leçon n’a pas pu être créée."));
}

export async function updateLesson(lessonId: string, changes: LessonChanges): Promise<LessonRow> {
  const { blocks, ...rest } = changes;
  const payload: TablesUpdate<"lessons"> = { ...rest, ...(blocks ? { content: contentFromBlocks(blocks) } : {}) };
  return asLesson(unwrap(await supabase().from("lessons").update(payload).eq("id", lessonId).select(LESSON_SELECT).single(), "La leçon n’a pas pu être enregistrée."));
}

export async function deleteLesson(lessonId: string): Promise<void> {
  unwrap(await supabase().from("lessons").delete().eq("id", lessonId), "La leçon n’a pas pu être supprimée.");
}

export async function createQuiz(input: QuizCreate): Promise<QuizRow> {
  return unwrap(await supabase().from("quizzes").insert(input).select(QUIZ_SELECT).single(), "Le quiz n’a pas pu être créé.");
}

export async function updateQuiz(quizId: string, changes: QuizChanges): Promise<QuizRow> {
  return unwrap(await supabase().from("quizzes").update(changes).eq("id", quizId).select(QUIZ_SELECT).single(), "Le quiz n’a pas pu être enregistré.");
}

export async function deleteQuiz(quizId: string): Promise<void> {
  unwrap(await supabase().from("quizzes").delete().eq("id", quizId), "Le quiz n’a pas pu être supprimé.");
}

export async function listLabs(): Promise<LabRow[]> {
  const rows = unwrap(await supabase().from("labs").select("*").order("position").order("title"), "Impossible de charger les labs.") ?? [];
  return rows.map(asLab);
}

export async function createLab(input: LabCreate): Promise<LabRow> {
  return asLab(unwrap(await supabase().from("labs").insert(input).select("*").single(), "Le lab n’a pas pu être créé."));
}

export async function updateLab(labId: string, changes: LabChanges): Promise<LabRow> {
  return asLab(unwrap(await supabase().from("labs").update(changes).eq("id", labId).select("*").single(), "Le lab n’a pas pu être enregistré."));
}

export async function deleteLab(labId: string): Promise<void> {
  unwrap(await supabase().from("labs").delete().eq("id", labId), "Le lab n’a pas pu être supprimé.");
}

export async function listBadges(): Promise<BadgeRow[]> {
  return unwrap(await supabase().from("badges").select("*").order("position").order("name"), "Impossible de charger les badges.") ?? [];
}

export async function createBadge(input: BadgeCreate): Promise<BadgeRow> {
  return unwrap(await supabase().from("badges").insert(input).select("*").single(), "Le badge n’a pas pu être créé.");
}

export async function updateBadge(badgeId: string, changes: BadgeChanges): Promise<BadgeRow> {
  return unwrap(await supabase().from("badges").update(changes).eq("id", badgeId).select("*").single(), "Le badge n’a pas pu être enregistré.");
}

export async function deleteBadge(badgeId: string): Promise<void> {
  unwrap(await supabase().from("badges").delete().eq("id", badgeId), "Le badge n’a pas pu être supprimé.");
}

export async function listChallenges(): Promise<ChallengeRow[]> {
  return unwrap(await supabase().from("challenges").select("*").order("position").order("title"), "Impossible de charger les défis.") ?? [];
}

export async function createChallenge(input: ChallengeCreate): Promise<ChallengeRow> {
  return unwrap(await supabase().from("challenges").insert(input).select("*").single(), "Le défi n’a pas pu être créé.");
}

export async function updateChallenge(challengeId: string, changes: ChallengeChanges): Promise<ChallengeRow> {
  return unwrap(await supabase().from("challenges").update(changes).eq("id", challengeId).select("*").single(), "Le défi n’a pas pu être enregistré.");
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  unwrap(await supabase().from("challenges").delete().eq("id", challengeId), "Le défi n’a pas pu être supprimé.");
}

// ─── Admin lists ─────────────────────────────────────────────────────────────

function embeddedOne<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function listCertificates(params: { search?: string; limit?: number; offset?: number } = {}): Promise<AdminCertificate[]> {
  let query = supabase().from("certificates")
    .select("*, profiles(id, display_name, username, email, avatar_path), courses(id, title, slug)")
    .order("issued_at", { ascending: false })
    .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 50) - 1);
  const needle = params.search?.trim();
  if (needle) {
    const safe = needle.replace(/[%,()]/g, "");
    query = query.or(`certificate_number.ilike.%${safe}%,verification_code.ilike.%${safe}%,recipient_name.ilike.%${safe}%,course_title.ilike.%${safe}%`);
  }
  const rows = unwrap(await query, "Impossible de charger les certificats.") ?? [];
  return rows.map((row) => {
    const value = row as unknown as Tables<"certificates"> & { profiles?: AdminCertificate["profile"] | AdminCertificate["profile"][]; courses?: AdminCertificate["course"] | AdminCertificate["course"][] };
    const { profiles, courses, ...certificate } = value;
    return { ...certificate, profile: embeddedOne(profiles), course: embeddedOne(courses) };
  });
}

export async function listContactMessages(status?: string): Promise<ContactMessageRow[]> {
  let query = supabase().from("contact_messages").select("*").order("created_at", { ascending: false }).limit(250);
  if (status && status !== "all") query = query.eq("status", status);
  return unwrap(await query, "Impossible de charger les messages.") ?? [];
}

export async function updateContactStatus(messageId: string, status: string): Promise<ContactMessageRow> {
  return unwrap(await supabase().from("contact_messages").update({ status }).eq("id", messageId).select("*").single(), "Le statut du message n’a pas pu être modifié.");
}

export async function listAdminLogs(params: { limit?: number; offset?: number } = {}): Promise<AdminLogRow[]> {
  const from = params.offset ?? 0;
  const rows = unwrap(await supabase().from("admin_logs")
    .select("*, profiles(display_name, username, email, avatar_path, role, xp)")
    .order("created_at", { ascending: false })
    .range(from, from + (params.limit ?? 80) - 1), "Impossible de charger le journal.") ?? [];
  return rows.map((row) => {
    const value = row as unknown as Tables<"admin_logs"> & { profiles?: Omit<ProfileSummary, "id"> | Omit<ProfileSummary, "id">[] | null };
    const { profiles, ...log } = value;
    return { ...log, actor: embeddedOne(profiles) };
  });
}

export async function listLiveSessions(): Promise<LiveSession[]> {
  const rows = unwrap(await supabase().from("learner_sessions")
    .select("*, profiles(display_name, username, email, avatar_path, role, xp)")
    .order("last_seen_at", { ascending: false }).limit(200), "Impossible de charger les sessions.") ?? [];
  return rows.map((row) => {
    const value = row as unknown as LearnerSessionRow & { profiles?: Omit<ProfileSummary, "id"> | Omit<ProfileSummary, "id">[] | null };
    const { profiles, ...session } = value;
    return { ...session, profile: embeddedOne(profiles) };
  });
}

export async function listActivityEvents(limit = 120): Promise<LiveEvent[]> {
  const rows = unwrap(await supabase().from("activity_events")
    .select("*, profiles(display_name, username, email, avatar_path, role, xp)")
    .order("created_at", { ascending: false }).limit(limit), "Impossible de charger l’activité.") ?? [];
  return rows.map((row) => {
    const value = row as unknown as ActivityEventRow & { profiles?: Omit<ProfileSummary, "id"> | Omit<ProfileSummary, "id">[] | null };
    const { profiles, ...event } = value;
    return { ...event, profile: embeddedOne(profiles) };
  });
}

export function subscribeToLearnerSessions(onChange: (row: LearnerSessionRow) => void, onDelete?: (userId: string) => void): () => void {
  const client = supabase();
  const channel: RealtimeChannel = client.channel("admin-learner-sessions")
    .on("postgres_changes", { event: "*", schema: "public", table: "learner_sessions" }, (payload) => {
      if (payload.eventType === "DELETE") {
        const old = payload.old as Partial<LearnerSessionRow>;
        if (old.user_id) onDelete?.(old.user_id);
        return;
      }
      onChange(payload.new as LearnerSessionRow);
    })
    .subscribe();
  return () => { void client.removeChannel(channel); };
}

export function subscribeToActivityEvents(onInsert: (row: ActivityEventRow) => void): () => void {
  const client = supabase();
  const channel: RealtimeChannel = client.channel("admin-activity-events")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, (payload) => onInsert(payload.new as ActivityEventRow))
    .subscribe();
  return () => { void client.removeChannel(channel); };
}

export async function getProfileSummary(userId: string): Promise<ProfileSummary | null> {
  const row = unwrap(await supabase().from("profiles")
    .select("id, display_name, username, email, avatar_path, role, xp")
    .eq("id", userId).maybeSingle(), "Impossible de charger le profil.");
  return row ? { ...row, role: row.role as Role } : null;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const THUMBNAIL_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const LESSON_ASSET_TYPES: Record<string, string> = {
  "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif",
  "application/pdf": "pdf", "video/mp4": "mp4", "video/webm": "webm",
};

function extensionFor(file: File, allowed: Record<string, string>): string {
  const ext = allowed[file.type];
  if (!ext) throw new AppError("invalid", "Format de fichier non pris en charge.");
  return ext;
}

async function uploadPublic(bucket: "course-images" | "lesson-assets", path: string, file: File): Promise<string> {
  const client = supabase();
  const uploaded = await client.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
  if (uploaded.error) throw toAppError(uploaded.error, "Le téléversement a échoué.");
  return client.storage.from(bucket).getPublicUrl(uploaded.data.path).data.publicUrl;
}

export async function uploadCourseThumbnail(courseId: string, file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new AppError("invalid", "L’image du cours doit peser 5 Mo maximum.");
  const ext = extensionFor(file, THUMBNAIL_TYPES);
  return uploadPublic("course-images", `${courseId}/${Date.now()}.${ext}`, file);
}

export async function uploadLessonAsset(lessonId: string, file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new AppError("invalid", "La ressource de leçon doit peser 20 Mo maximum.");
  const ext = extensionFor(file, LESSON_ASSET_TYPES);
  return uploadPublic("lesson-assets", `${lessonId}/${Date.now()}.${ext}`, file);
}