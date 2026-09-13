import type { Id, IsoDateString } from './common.js';

export type ChallengeCategory =
  | 'NETWORKING'
  | 'LINUX'
  | 'SECURITY_FUNDAMENTALS'
  | 'LOG_ANALYSIS'
  | 'AUTHENTICATION'
  | 'WEB_SECURITY'
  | 'THREAT_DETECTION'
  | 'SIEM'
  | 'VULNERABILITY_MANAGEMENT';

export interface Challenge {
  id: Id;
  lessonId: Id | null;
  slug: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  xpReward: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export type SubmissionStatus = 'PENDING' | 'CORRECT' | 'INCORRECT';

/** A submission never echoes the expected answer back to the client. */
export interface ChallengeSubmission {
  id: Id;
  challengeId: Id;
  userId: Id;
  status: SubmissionStatus;
  awardedXp: number;
  createdAt: IsoDateString;
}
