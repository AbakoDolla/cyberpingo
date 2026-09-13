import type { Id, IsoDateString } from './common.js';

export type CourseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export interface Course {
  id: Id;
  slug: string;
  title: string;
  description: string;
  difficulty: CourseDifficulty;
  estimatedMinutes: number;
  published: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
