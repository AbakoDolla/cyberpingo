// Authoring shapes of the starter content. These files are only read by
// scripts/generate-content-seed.cjs, which turns them into supabase/seed/01_starter_content.sql;
// the application itself reads everything from Supabase.
export type SkillLevel = "debutant" | "intermediaire" | "avance";

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

export interface Question {
  id: string;
  type: "qcm" | "vrai_faux" | "pratique";
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

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: "reseau" | "linux" | "web" | "cryptographie" | "osint" | "securite";
  difficulty: SkillLevel;
  xpReward: number;
  status: "verrouille" | "disponible" | "termine";
  objectives: string[];
  hints: string[];
  terminalLines: string[];
  flagPlaceholder: string;
}