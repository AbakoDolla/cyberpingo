import type { LeaderboardEntry, ProgressSummary } from '@cyberpingo/types';

import { api } from './api';

export const progressService = {
  me: async (): Promise<ProgressSummary> => {
    const { data } = await api.get<ProgressSummary>('/progress/me');
    return data;
  },

  leaderboard: async (): Promise<LeaderboardEntry[]> => {
    const { data } = await api.get<LeaderboardEntry[]>('/leaderboard');
    return data;
  },
};
