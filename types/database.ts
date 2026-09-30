import type { OnboardingGoal, PublishedChallenge, PublishedCourse, SkillLevel } from "@/types";

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string;
  username: string;
  role: "learner" | "admin";
  goal: OnboardingGoal;
  skill_level: SkillLevel;
  daily_minutes: number;
  known_areas: string[];
  onboarding_completed: boolean;
  xp: number;
  streak: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonCompletionRow { lesson_id: string; course_id: string; xp_earned: number; completed_at: string }
export interface QuizResultRow {
  quiz_id: string;
  best_score: number;
  total_questions: number;
  earned_xp: number;
  passed: boolean;
  attempts: number;
  best_at: string;
  last_attempt_at: string;
}
export interface ChallengeCompletionRow { challenge_id: string; xp_earned: number; completed_at: string }
export interface BadgeRow { badge_id: string; earned_at: string }

export interface LearnerSnapshot {
  profile: ProfileRow;
  lessons: LessonCompletionRow[];
  quizzes: QuizResultRow[];
  challenges: ChallengeCompletionRow[];
  badges: BadgeRow[];
}

export type ActivityKind = "login" | "logout" | "lesson_complete" | "quiz_complete" | "challenge_complete" | "mentor_chat" | "onboarding" | "reset";

export interface ActivityEventRow {
  id: number;
  user_id: string;
  kind: ActivityKind;
  entity_id: string | null;
  label: string;
  page: string | null;
  xp_delta: number;
  created_at: string;
}

export interface LearnerSessionRow {
  user_id: string;
  current_page: string;
  visible: boolean;
  connected_at: string;
  last_seen_at: string;
  ended_at: string | null;
}

export type ContactStatus = "nouveau" | "en_cours" | "traite";
export interface ContactMessageRow {
  id: string;
  user_id: string | null;
  email: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  created_at: string;
}

export interface PublishedCourseRow { id: string; slug: string; title: string; payload: PublishedCourse; published_by: string | null; published_at: string }
export interface PublishedChallengeRow { id: string; slug: string; title: string; payload: PublishedChallenge; published_by: string | null; published_at: string }

export interface AdminOverview {
  learners: number;
  admins: number;
  newThisWeek: number;
  activeToday: number;
  onlineNow: number;
  lessonsCompleted: number;
  lessonsToday: number;
  quizAttempts: number;
  quizzesPassed: number;
  averageBestScore: number;
  challengesSolved: number;
  xpToday: number;
  newMessages: number;
  publishedCourses: number;
  publishedChallenges: number;
  topCourses: { courseId: string; completions: number }[];
  signupsByDay: { day: string; count: number }[];
}

export interface AdminLearnerRow {
  id: string;
  display_name: string;
  username: string;
  email: string;
  role: "learner" | "admin";
  xp: number;
  streak: number;
  last_activity_date: string | null;
  created_at: string;
  lessons_completed: number;
  quizzes_passed: number;
  challenges_solved: number;
}

export interface QuizSubmission { score: number; total: number; passed: boolean; awarded: number; improved: boolean; xp: number; streak: number }
export interface ChallengeSubmission { correct: boolean; awarded: number; xp?: number; streak?: number; alreadyCompleted?: boolean }
export interface LessonSubmission { awarded: number; xp: number; streak: number; alreadyCompleted: boolean }
