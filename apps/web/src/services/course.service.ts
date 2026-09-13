import type { Course } from '@cyberpingo/types';

import { api } from './api';

export const courseService = {
  list: async (): Promise<Course[]> => {
    const { data } = await api.get<Course[]>('/courses');
    return data;
  },

  getById: async (courseId: string): Promise<Course> => {
    const { data } = await api.get<Course>(`/courses/${courseId}`);
    return data;
  },
};
