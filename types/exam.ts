import type { QuestionType } from "@/types/api";

export interface ExamStatus {
  course_id: string;
  course_title: string;
  course_slug: string;
  course_completed: boolean;
  can_take_exam: boolean;
  pass_percentage: number;
  duration_minutes: number;
  question_count: number;
  attempts_count: number;
  best_percentage: number | null;
  active_attempt: {
    id: string;
    started_at: string;
    expires_at: string;
    remaining_seconds: number;
    total_questions: number;
  } | null;
  certificate: {
    id: string;
    certificate_number: string;
    verification_code: string;
    issued_at: string;
    exam_percentage: number | null;
    is_revoked: boolean;
  } | null;
}

export interface ExamOption {
  id: string;
  label: string;
}

export interface ExamQuestion {
  id: string;
  prompt: string;
  question_type: QuestionType;
  image_url: string | null;
  module_id: string;
  module_title: string;
  options: ExamOption[];
}

export interface ExamStartResult {
  attempt_id: string;
  started_at: string;
  expires_at: string;
  remaining_seconds: number;
  duration_minutes: number;
  pass_percentage: number;
  total_questions: number;
  questions: ExamQuestion[];
}

export interface ExamModuleBreakdown {
  module_id: string;
  module_title: string;
  score: number;
  total: number;
}

export interface ExamQuestionResult {
  question_id: string;
  prompt: string;
  correct: boolean;
  selected: string[];
  correct_answers: string[];
  explanation: string;
}

export interface ExamSubmitResult {
  attempt_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  passed: boolean;
  pass_percentage: number;
  module_breakdown: ExamModuleBreakdown[];
  certificate: {
    id: string;
    certificate_number: string;
    verification_code: string;
    issued_at: string;
    exam_percentage: number;
  } | null;
  results: ExamQuestionResult[];
}
