import type { Id, IsoDateString } from './common.js';

export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface Progress {
  id: Id;
  userId: Id;
  courseId: Id | null;
  lessonId: Id | null;
  status: ProgressStatus;
  completedAt: IsoDateString | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

/** Aggregated progress returned by `GET /api/v1/progress/me`. */
export interface ProgressSummary {
  xp: number;
  level: number;
  completedLessons: number;
  completedCourses: number;
  currentStreak: number;
}
