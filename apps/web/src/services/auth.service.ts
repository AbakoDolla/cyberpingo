import type { AuthSession, LoginPayload, PublicUser, RegisterPayload } from '@cyberpingo/types';

import { api } from './api';

/** Thin transport layer over `/api/v1/auth`. No business logic lives here. */
export const authService = {
  register: async (payload: RegisterPayload): Promise<AuthSession> => {
    const { data } = await api.post<AuthSession>('/auth/register', payload);
    return data;
  },

  login: async (payload: LoginPayload): Promise<AuthSession> => {
    const { data } = await api.post<AuthSession>('/auth/login', payload);
    return data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  me: async (): Promise<PublicUser> => {
    const { data } = await api.get<PublicUser>('/auth/me');
    return data;
  },
};
