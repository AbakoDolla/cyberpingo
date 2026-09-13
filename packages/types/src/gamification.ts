import type { Id, IsoDateString } from './common.js';

export interface Badge {
  id: Id;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
}

export interface UserBadge {
  id: Id;
  userId: Id;
  badgeId: Id;
  badge: Badge;
  earnedAt: IsoDateString;
}

export interface LeaderboardEntry {
  rank: number;
  userId: Id;
  username: string;
  avatar: string | null;
  xp: number;
  level: number;
}
