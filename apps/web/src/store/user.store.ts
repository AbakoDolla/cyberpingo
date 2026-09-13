import { create } from 'zustand';

export type ThemePreference = 'dark' | 'light';

/** Global, non-sensitive user preferences. */
interface UserPreferencesState {
  theme: ThemePreference;
  sidebarCollapsed: boolean;
  setTheme: (theme: ThemePreference) => void;
  toggleSidebar: () => void;
}

export const useUserStore = create<UserPreferencesState>((set) => ({
  theme: 'dark',
  sidebarCollapsed: false,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
