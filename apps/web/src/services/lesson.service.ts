import type { Lesson, ProgressSummary } from '@cyberpingo/types';

import { api } from './api';

export const lessonService = {
  getById: async (lessonId: string): Promise<Lesson> => {
    const { data } = await api.get<Lesson>(`/lessons/${lessonId}`);
    return data;
  },

  /**
   * The backend is the source of truth for XP: the client only signals that a
   * lesson was completed and reads back the progression it decided.
   */
  complete: async (lessonId: string): Promise<ProgressSummary> => {
    const { data } = await api.post<ProgressSummary>(`/lessons/${lessonId}/complete`);
    return data;
  },
};
