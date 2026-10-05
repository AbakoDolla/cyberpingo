// Shapes of the JSON returned by CyberPingo's SQL functions (supabase/migrations) and the view
// models the services build from table rows. Table rows themselves come from database.types.ts.
import type { Role } from "@/lib/roles";
import type { Tables } from "@/types/database.types";
import type { CbReward } from "./cyberbits";

export type SkillLevel = "debutant" | "intermediaire" | "avance";
export type LearningGoal = "decouvrir" | "professionnel" | "emploi" | "competences" | "certification";
export type CourseStatus = "draft" | "review" | "published" | "archived";
export type AccessLevel = "free" | "premium" | "private";
export type LessonStatus = "not_started" | "in_progress" | "completed";
export type EnrollmentStatus = "active" | "completed";
export type QuestionType = "single_choice" | "multiple_choice" | "true_false";
export type Difficulty = "facile" | "moyen" | "difficile";
export type NotificationType = "achievement" | "course" | "challenge" | "system" | "certificate" | "streak" | "level";
export type ChallengePeriod = "daily" | "weekly" | "one_time";
export type LabCategory = "reseau" | "linux" | "web" | "cryptographie" | "osint" | "securite";
export type LabFormat = "terminal" | "pcap" | "logs" | "packet_tracer";
export type LabAssetKind = "log" | "pcap" | "pkt" | "guide" | "image" | "topology" | "report_template";
export type SkillState = "not_studied" | "learning" | "consolidating" | "exercises_mastered" | "validated";
export type ReportStatus = "pending" | "approved" | "changes_requested";
export type BadgeCriteria =
  | "lessons_completed" | "quizzes_passed" | "courses_completed" | "streak_days" | "xp_total"
  | "labs_solved" | "certificates_earned" | "course_completed" | "lab_completed" | "skill_validated";
export type XpReason =
  | "lesson_completed" | "quiz_completed" | "lab_completed" | "challenge_completed" | "course_completed"
  | "achievement" | "daily_goal" | "admin_adjustment";
export type ChallengeMetric = "lessons_completed" | "quizzes_passed" | "labs_solved" | "xp_earned" | "study_minutes";

// ─── Gamification ─────────────────────────────────────────────────────────────

export interface LevelInfo {
  xp: number;
  level: number;
  title: string;
  current_level_xp: number;
  next_level: number | null;
  next_level_xp: number | null;
  next_title: string | null;
  progress_percentage: number;
}

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface EarnedBadge { id: string; slug: string; name: string; description: string; icon: string; rarity?: Rarity }

/** Everything a learning action unlocked, computed inside the same transaction. */
export interface RewardSummary {
  xp_gained: number;
  level_info: LevelInfo;
  leveled_up: boolean;
  current_streak: number;
  longest_streak: number;
  new_badges: EarnedBadge[];
  completed_challenges: { id: string; title: string; xp_reward: number }[];
  course_completed: { id: string; slug: string; title: string } | null;
  certificate: { id: string; certificate_number: string; verification_code: string; course_title: string } | null;
  new_rank?: { slug: string; name: string; description: string; position: number } | null;
  new_skills?: { id: string; slug: string; name: string; state: SkillState }[];
  cyberbits?: CbReward | null;
}

// ─── Learning RPCs ────────────────────────────────────────────────────────────

export interface LessonStart {
  preview: boolean;
  status: LessonStatus;
  progress_percentage: number;
  started_at?: string | null;
  completed_at?: string | null;
  /** Minimum reading time enforced by complete_lesson(). */
  min_seconds: number;
}

export type LessonCompletion =
  | { preview: true; lesson_id: string; next_lesson_id: string | null }
  | (RewardSummary & { preview?: false; already_completed: boolean; xp_awarded: number; lesson_id: string; next_lesson_id: string | null });

export interface QuizQuestionResult {
  question_id: string;
  correct: boolean;
  selected: string[];
  correct_answer_ids: string[];
  explanation: string;
}

interface QuizGrade {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  pass_percentage: number;
  xp_awarded: number;
  results: QuizQuestionResult[];
}
export type QuizSubmission =
  | (QuizGrade & { preview: true })
  | (QuizGrade & RewardSummary & { preview: false; attempt_id: string; best_percentage: number });

export type LabSubmission =
  | { correct: false; remaining_attempts: number }
  | { correct: true; preview: true; xp_awarded: 0 }
  | (RewardSummary & { correct: true; preview?: false; already_solved: boolean; xp_awarded: number });

export interface LabTask { id: string; lab_id: string; position: number; prompt: string; hint: string; answer_format: string; solved: boolean }
export interface LabAsset { id: string; lab_id: string; kind: LabAssetKind; title: string; description: string; url: string; position: number }
export interface LabReport { id: string; lab_id: string; note: string; link: string | null; status: ReportStatus; feedback: string; created_at: string; updated_at: string; reviewed_at: string | null }

export type LabTaskResult =
  | { correct: false; remaining_attempts: number }
  | { correct: true; preview: true; xp_awarded: 0; explanation: string }
  | (RewardSummary & {
    correct: true; preview?: false; already_solved: boolean; tasks_done: number; tasks_total: number;
    lab_completed: boolean; lab_newly_completed: boolean; xp_awarded: number; explanation: string;
  });
/** Any RPC result that may carry rewards. */
export function hasRewards(value: unknown): value is RewardSummary {
  return Boolean(value && typeof value === "object" && "level_info" in value && "xp_gained" in value);
}

// ─── Dashboard & statistics ───────────────────────────────────────────────────

export interface ContinueLearningItem {
  course_id: string;
  slug: string;
  title: string;
  icon: string;
  level: SkillLevel;
  category: string;
  status: EnrollmentStatus;
  progress_percentage: number;
  completed_lessons: number;
  total_lessons: number;
  last_lesson_id: string | null;
  last_activity_at: string;
}

export interface ChallengeProgress {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  period: ChallengePeriod;
  metric: ChallengeMetric;
  target: number;
  xp_reward: number;
  ends_at: string | null;
  progress: number;
  completed: boolean;
}

export interface CourseRecommendation {
  course_id: string;
  slug: string;
  title: string;
  short_description: string;
  icon: string;
  level: SkillLevel;
  category: string;
  estimated_duration: number;
}

export interface Dashboard {
  profile: {
    id: string;
    display_name: string;
    username: string;
    avatar_path: string | null;
    role: Role;
    skill_level: SkillLevel;
    goal: LearningGoal;
    daily_minutes: number;
    onboarding_completed: boolean;
  };
  level: LevelInfo;
  streak: { current: number; longest: number; active_today: boolean; last_activity_date: string | null };
  today: {
    date: string;
    lessons_completed: number;
    quizzes_passed: number;
    labs_solved: number;
    xp_earned: number;
    study_minutes: number;
    goal_minutes: number;
    goal_reached: boolean;
  };
  stats: {
    lessons_completed: number;
    quizzes_passed: number;
    labs_solved: number;
    courses_in_progress: number;
    courses_completed: number;
    badges: number;
    certificates: number;
  };
  continue_learning: ContinueLearningItem[];
  recent_badges: (EarnedBadge & { earned_at: string })[];
  challenges: ChallengeProgress[];
  recommendations: CourseRecommendation[];
  week: { date: string; xp: number; lessons: number; minutes: number }[];
  unread_notifications: number;
}

export interface LearnerStats {
  xp: number;
  level: LevelInfo;
  current_streak: number;
  longest_streak: number;
  courses_started: number;
  courses_completed: number;
  lessons_completed: number;
  quizzes_passed: number;
  quiz_attempts: number;
  average_quiz_score: number;
  labs_solved: number;
  study_minutes: number;
  active_days: number;
  badges: number;
  certificates: number;
  xp_by_reason: Record<string, number>;
  activity: { date: string; xp: number; lessons: number; quizzes: number; labs: number; minutes: number }[];
}

export interface CertificateVerification {
  found: boolean;
  valid: boolean;
  certificate_number?: string;
  verification_code?: string;
  recipient_name?: string;
  course_title?: string;
  course_slug?: string | null;
  issued_at?: string;
  revoked_at?: string | null;
  revoked_reason?: string | null;
  exam_percentage?: number | null;
}

export interface MentorQuota { allowed: boolean; remaining: number; limit: number }

// ─── Content view models (built by services from table rows) ─────────────────

export type LessonBlock =
  | { type: "text" | "heading" | "schema" | "example" | "callout"; content: string }
  | { type: "code"; content: string; language?: string }
  | { type: "video" | "image" | "resource"; url: string; content?: string };

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  thumbnail_url: string | null;
  level: SkillLevel;
  category: string;
  icon: string;
  estimated_duration: number;
  status: CourseStatus;
  access_level: AccessLevel;
  position: number;
  completion_xp: number;
  certificate_enabled: boolean;
  published_at: string | null;
  cb_price?: number | null;
  prerequisite_course_id?: string | null;
  exam_pass_percentage?: number;
  exam_duration_minutes?: number;
  exam_question_count?: number;
  module_count: number;
  lesson_count: number;
  quiz_count: number;
}

export interface LessonOutline {
  id: string;
  module_id: string;
  title: string;
  summary: string;
  content_type: string;
  duration_minutes: number;
  xp_reward: number;
  position: number;
}

export interface QuizOutline {
  id: string;
  module_id: string;
  lesson_id: string | null;
  title: string;
  description: string;
  pass_percentage: number;
  position: number;
}

export interface ModuleOutline {
  id: string;
  title: string;
  description: string;
  position: number;
  lessons: LessonOutline[];
  /** Module-level review quizzes (quizzes not attached to a lesson). */
  quizzes: QuizOutline[];
}

export interface CourseDetail extends CourseSummary {
  modules: ModuleOutline[];
  /** Lesson-attached quizzes, keyed by lesson id. */
  lesson_quizzes: Record<string, QuizOutline>;
}

export interface CourseProgress {
  course_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  last_lesson_id: string | null;
  last_activity_at: string;
  total_lessons: number;
  completed_lessons: number;
  total_quizzes: number;
  passed_quizzes: number;
  progress_percentage: number;
}

export interface LessonProgressState {
  lesson_id: string;
  status: LessonStatus;
  progress_percentage: number;
  completed_at: string | null;
}

export interface LessonDetail extends LessonOutline {
  course_id: string;
  blocks: LessonBlock[];
  course: { id: string; slug: string; title: string; status: CourseStatus };
  module: { id: string; title: string; position: number };
  quiz: QuizOutline | null;
  /** Every lesson of the course in learning order, for previous/next navigation. */
  sequence: { id: string; title: string }[];
}

export interface QuizAnswerChoice { id: string; label: string; position: number }
export interface QuizQuestion {
  id: string;
  position: number;
  question_type: QuestionType;
  prompt: string;
  image_url: string | null;
  difficulty: Difficulty;
  xp_reward: number;
  answers: QuizAnswerChoice[];
}
export interface QuizDetail extends QuizOutline {
  course: { id: string; slug: string; title: string };
  lesson: { id: string; title: string } | null;
  questions: QuizQuestion[];
  total_xp: number;
}

export interface QuizAttemptSummary { attempts: number; best_percentage: number | null; passed: boolean; last_attempt_at: string | null }

export interface Lab {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: LabCategory;
  difficulty: SkillLevel;
  xp_reward: number;
  objectives: string[];
  hints: string[];
  terminal_lines: string[];
  flag_placeholder: string;
  status: CourseStatus;
  position: number;
  course_id: string | null;
  format: LabFormat;
  briefing: string;
  constraints: string[];
  tools: string[];
  requires_computer: boolean;
  is_assessment: boolean;
  estimated_minutes: number;
  cb_price?: number | null;
  solved: boolean;
  solved_at: string | null;
}

export interface BadgeWithState {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  criteria_type: BadgeCriteria;
  criteria_value: number;
  criteria_lab_id: string | null;
  criteria_skill_id: string | null;
  rarity: Rarity;
  earned: boolean;
  earned_at: string | null;
}

// ─── Academy: domains, skills, ranks, mascot ──────────────────────────────────

export interface AcademyDomain { id: string; slug: string; name: string; description: string; icon: string }
export interface SkillLink { kind: "lesson" | "quiz" | "practice" | "validation"; id: string; title: string; slug?: string; done: boolean }
export interface Skill { id: string; slug: string; name: string; description: string; domain_id: string; state: SkillState; links: SkillLink[] }
export interface RankRequirement { key: string; required: number; current: number }
export interface Rank { slug: string; name: string; description: string; position: number; achieved_at?: string | null }
export interface RankStep extends Rank { criteria: Record<string, number>; achieved: boolean }
export interface AcademyMetrics {
  min_level: number; lessons_completed: number; labs_solved: number; courses_completed: number;
  skills_mastered: number; skills_validated: number;
}
export interface Academy {
  metrics: AcademyMetrics;
  rank: Rank;
  next_rank: (Rank & { requirements: RankRequirement[] }) | null;
  ranks: RankStep[];
  domains: AcademyDomain[];
  skills: Skill[];
}

export type MascotEvent =
  | "welcome" | "lesson_start" | "exercise_success" | "exercise_fail" | "chapter_end" | "level_up" | "badge"
  | "challenge" | "return_after_absence" | "new_skill" | "rank_up" | "path_complete" | "lab_complete";
export type MascotExpression =
  | "happy" | "proud" | "encouraging" | "focused" | "surprised" | "disappointed" | "thinking" | "expert"
  | "celebration" | "mission" | "explanation";
export interface MascotLine {
  id: string; event: MascotEvent; expression: MascotExpression; text_fr: string;
  audio_url: string | null; voice_credit: string | null; priority: number;
}
export type Certificate = Tables<"certificates">;
export type AppNotification = Tables<"notifications"> & { type: NotificationType };
export type XpTransaction = Tables<"xp_transactions">;
export type UserSettings = Tables<"user_settings">;

export interface MyProfile {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  avatar_url: string | null;
  bio: string;
  role: Role;
  goal: LearningGoal;
  skill_level: SkillLevel;
  daily_minutes: number;
  known_areas: string[];
  onboarding_completed: boolean;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  last_activity_at: string | null;
  created_at: string;
}

export interface OnboardingAnswers {
  skillLevel: SkillLevel | null;
  goal: LearningGoal | null;
  dailyMinutes: number | null;
  knownAreas: string[];
}

// ─── Admin RPCs ───────────────────────────────────────────────────────────────

export interface AdminOverview {
  users_total: number;
  staff_total: number;
  new_users_7d: number;
  online_now: number;
  active_24h: number;
  courses: { published: number; draft: number; archived: number };
  lessons_total: number;
  quizzes_total: number;
  labs_published: number;
  enrollments_total: number;
  courses_completed_total: number;
  lessons_completed_total: number;
  lessons_completed_7d: number;
  quiz_attempts_7d: number;
  average_quiz_score_7d: number;
  xp_awarded_7d: number;
  certificates_total: number;
  messages_new: number;
  signups_by_day: { date: string; count: number }[];
  top_courses: { id: string; slug: string; title: string; status: CourseStatus; enrollments: number; completions: number }[];
}

export interface AdminUserRow {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
  role: Role;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_at: string | null;
  created_at: string;
  lessons_completed: number;
  quizzes_passed: number;
  labs_solved: number;
  courses_completed: number;
}
export interface AdminUsersPage { total: number; users: AdminUserRow[] }

export interface AdminUserDetail {
  profile: Tables<"profiles"> & { role: Role };
  timezone: string | null;
  level: LevelInfo;
  courses: { course_id: string; title: string; slug: string; status: EnrollmentStatus; progress_percentage: number; enrolled_at: string; completed_at: string | null }[];
  badges: { name: string; icon: string; earned_at: string }[];
  certificates: { id: string; certificate_number: string; verification_code: string; course_title: string; issued_at: string; revoked_at: string | null }[];
  xp_history: { amount: number; reason: string; label: string; created_at: string }[];
  activity: { kind: string; label: string; xp_delta: number; created_at: string }[];
}

export interface AdminQuizAnswer { id?: string; label: string; is_correct: boolean }
export interface AdminQuizQuestion {
  id?: string;
  question_type: QuestionType;
  prompt: string;
  image_url?: string | null;
  explanation: string;
  difficulty: Difficulty;
  xp_reward: number;
  answers: AdminQuizAnswer[];
}
export type AdminQuiz = Tables<"quizzes"> & { questions: AdminQuizQuestion[] };

export interface AdminCourseStats {
  enrollments: number;
  completions: number;
  average_progress: number;
  lessons: { id: string; title: string; started: number; completed: number }[];
  quizzes: { id: string; title: string; attempts: number; learners_passed: number; average_score: number }[];
}

export interface CourseImportResult { id: string; slug: string; modules: number; lessons: number; quizzes: number }

/** Input accepted by admin_import_course() (the AI studio produces this shape). */
export interface CourseImport {
  title: string;
  slug?: string;
  short_description?: string;
  description?: string;
  level?: SkillLevel;
  category?: string;
  icon?: string;
  modules: {
    title: string;
    description?: string;
    lessons: {
      title: string;
      summary?: string;
      content_type?: string;
      blocks: LessonBlock[];
      duration_minutes?: number;
      xp_reward?: number;
      quiz?: { title?: string; description?: string; pass_percentage?: number; questions: AdminQuizQuestion[] };
    }[];
    quiz?: { title?: string; description?: string; pass_percentage?: number; questions: AdminQuizQuestion[] };
  }[];
}
