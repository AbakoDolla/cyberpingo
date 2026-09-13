import type { Id, IsoDateString } from './common.js';

export interface Lesson {
  id: Id;
  courseId: Id;
  slug: string;
  title: string;
  content: string;
  order: number;
  xpReward: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface Quiz {
  id: Id;
  lessonId: Id;
  title: string;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: Id;
  quizId: Id;
  prompt: string;
  choices: string[];
  order: number;
}
