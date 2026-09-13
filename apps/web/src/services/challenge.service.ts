import type { Challenge, ChallengeSubmission } from '@cyberpingo/types';

import { api } from './api';

export const challengeService = {
  getById: async (challengeId: string): Promise<Challenge> => {
    const { data } = await api.get<Challenge>(`/challenges/${challengeId}`);
    return data;
  },

  submit: async (challengeId: string, answer: string): Promise<ChallengeSubmission> => {
    const { data } = await api.post<ChallengeSubmission>(`/challenges/${challengeId}/submit`, {
      answer,
    });
    return data;
  },
};
