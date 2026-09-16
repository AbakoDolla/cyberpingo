export type SkillLevel = "debutant" | "intermediaire" | "avance";

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  streak: number;
  joinedAt: string;
  goal: OnboardingGoal;
  skillLevel: SkillLevel;
  dailyMinutes: number;
  badges: Badge[];
  skills: SkillProgress[];
  /** IDs des leçons terminées par l'utilisateur */
  completedLessons: string[];
  /** IDs des challenges réussis par l'utilisateur */
  completedChallenges: string[];
  /** Nombre de quiz validés */
  completedQuizzes: number;
  /** true = accès au panneau d'administration */
  isAdmin?: boolean;
}

export interface SkillProgress {
  name: string;
  percent: number;
}

export type OnboardingGoal =
  | "decouvrir"
  | "professionnel"
  | "emploi"
  | "competences"
  | "certification";

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: SkillLevel;
  durationMinutes: number;
  lessonCount: number;
  progress: number;
  category: string;
  locked: boolean;
  icon: string;
  lessons: Lesson[];
}

export interface LessonBlock {
  type: "text" | "schema" | "video" | "code" | "example";
  content: string;
  language?: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  order: number;
  durationMinutes: number;
  xpReward: number;
  blocks: LessonBlock[];
  quizId?: string;
  completed: boolean;
}

export type QuestionType = "qcm" | "vrai_faux" | "pratique";

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  questions: Question[];
  xpReward: number;
}

export type ChallengeCategory =
  | "reseau"
  | "linux"
  | "web"
  | "cryptographie"
  | "osint"
  | "securite";

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  difficulty: SkillLevel;
  xpReward: number;
  status: "verrouille" | "disponible" | "termine";
  objectives: string[];
  hints: string[];
  terminalLines: string[];
  flagPlaceholder: string;
  /** Réponse attendue (insensible à la casse) pour la validation réelle */
  expectedAnswer: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
}

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  status: "termine" | "en_cours" | "verrouille";
  order: number;
  /** Slug du cours correspondant pour le lien cliquable */
  courseSlug?: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "xp" | "badge" | "streak" | "system";
  read: boolean;
  createdAt: string;
}

export interface MentorMessage {
  id: string;
  role: "mentor" | "user";
  content: string;
  createdAt: string;
}

export interface OnboardingAnswers {
  skillLevel: SkillLevel | null;
  goal: OnboardingGoal | null;
  dailyMinutes: number | null;
  knownAreas: string[];
}

// ─── Système de publication ──────────────────────────────────────────────────

export interface PublishedLesson {
  id: string;
  title: string;
  order: number;
  durationMinutes: number;
  xpReward: number;
  blocks: LessonBlock[];
  quizId?: string;
  completed: boolean;
  courseId: string;
}

export interface PublishedQuestion {
  id: string;
  type: "qcm" | "vrai_faux";
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface PublishedQuiz {
  id: string;
  lessonId: string;
  title: string;
  questions: PublishedQuestion[];
  xpReward: number;
}

export interface PublishedCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  level: SkillLevel;
  category: string;
  durationMinutes: number;
  icon: string;
  locked: boolean;
  lessons: PublishedLesson[];
  quizzes: PublishedQuiz[];
  publishedAt: string;
  sourceFileName: string;
  aiAnalysis: string;
}

export interface PublishedChallenge {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  difficulty: SkillLevel;
  xpReward: number;
  status: "disponible";
  objectives: string[];
  hints: string[];
  terminalLines: string[];
  flagPlaceholder: string;
  expectedAnswer: string;
  publishedAt: string;
  sourceFileName: string;
}

export type PublishType = "course" | "challenge";

export type PublishStep =
  | "idle"
  | "uploading"
  | "analyzing"
  | "review"
  | "publishing"
  | "done"
  | "error";

export interface PublishState {
  step: PublishStep;
  type: PublishType;
  fileName: string;
  fileContent: string;
  aiAnalysis: string;
  generatedCourse: PublishedCourse | null;
  generatedChallenge: PublishedChallenge | null;
  error: string | null;
}
