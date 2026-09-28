"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { currentUser as mockUser } from "@/data/users";
import { courses } from "@/data/courses";
import { readStorage, writeStorage, setSessionCookie, clearSessionCookie, setAdminCookie, clearAdminCookie } from "@/lib/storage";
import { dailyGoals, isStoredUser, migrateUser, profileKey, recordQuiz, resetUserProgress, rewardProgress } from "@/lib/learning-progress";
import type { User, Quiz, OnboardingAnswers } from "@/types";

const STORAGE_KEY = "cyberpingo_user_v1";
const guest: User = { ...mockUser, id: "guest", name: "Explorateur", username: "explorateur", email: "", isAdmin: false };
const storageMessage = "Sauvegarde locale indisponible. Tes changements restent en mémoire pour cette session ; exporte tes données avant de fermer la page.";

export interface XpToastState { amount: number; id: number; isLevelUp?: boolean }
interface UserStateValue {
  user: User;
  isAuthenticated: boolean;
  hydrated: boolean;
  storageError: string | null;
  getCourseProgress: (courseId: string) => number;
}
interface UserActionsValue {
  addXp: (amount: number) => void;
  completeLesson: (lessonId: string, xp: number) => void;
  completeChallenge: (challengeId: string, xp: number) => void;
  completeQuiz: (quiz: Quiz, score: number) => number;
  applyOnboarding: (answers: OnboardingAnswers) => void;
  updateProfile: (name: string, dailyMinutes: number) => boolean;
  loginMock: (user: User) => void;
  logout: () => void;
  resetProgress: () => boolean;
}

const UserStateContext = createContext<UserStateValue | null>(null);
const UserActionsContext = createContext<UserActionsValue | null>(null);
const XpToastContext = createContext<XpToastState | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(guest);
  const current = useRef(user);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [lastXpToast, setLastXpToast] = useState<XpToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readProfile = useCallback((key: string) => {
    const stored = readStorage<unknown>(key, null, () => setStorageError(storageMessage));
    if (stored !== null && !isStoredUser(stored)) {
      console.error("Le profil local est endommagé.");
      setStorageError("Le profil local est illisible. Reconnecte-toi avec ton profil de démonstration.");
      return null;
    }
    return isStoredUser(stored) ? migrateUser(stored) : null;
  }, []);

  useEffect(() => {
    const hasCookie = document.cookie.split("; ").includes("cyberpingo_session=1");
    if (hasCookie) {
      const stored = readProfile(STORAGE_KEY);
      if (stored && stored.id !== "guest") {
        current.current = stored;
        setUser(stored);
        setIsAuthenticated(true);
      } else {
        clearSessionCookie();
        clearAdminCookie();
        setStorageError("Aucun profil local ne correspond à cette session. Reconnecte-toi pour continuer.");
      }
    }
    setHydrated(true);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [readProfile]);

  // The ref serializes rapid actions without side effects in React state updaters.
  const persist = useCallback((next: User) => {
    current.current = next;
    setUser(next);
    const profileSaved = writeStorage(profileKey(next.id), next);
    const activeSaved = writeStorage(STORAGE_KEY, next);
    const saved = profileSaved && activeSaved;
    setStorageError(saved ? null : storageMessage);
    return saved;
  }, []);

  const showReward = useCallback((amount: number, previous: User, next: User) => {
    if (amount <= 0) return;
    if (timer.current) clearTimeout(timer.current);
    setLastXpToast({ amount, id: Date.now(), isLevelUp: next.level > previous.level });
    timer.current = setTimeout(() => setLastXpToast(null), 2600);
  }, []);

  const addXp = useCallback((amount: number) => {
    const previous = current.current;
    const next = rewardProgress(previous, amount);
    persist(next);
    showReward(amount, previous, next);
  }, [persist, showReward]);

  const completeLesson = useCallback((id: string, xp: number) => {
    const previous = current.current;
    if (previous.completedLessons.includes(id)) return;
    const next = rewardProgress({ ...previous, completedLessons: [...previous.completedLessons, id] }, xp);
    persist(next);
    showReward(xp, previous, next);
  }, [persist, showReward]);

  const completeChallenge = useCallback((id: string, xp: number) => {
    const previous = current.current;
    if (previous.completedChallenges.includes(id)) return;
    const next = rewardProgress({ ...previous, completedChallenges: [...previous.completedChallenges, id] }, xp);
    persist(next);
    showReward(xp, previous, next);
  }, [persist, showReward]);

  const completeQuiz = useCallback((quiz: Quiz, score: number) => {
    const previous = current.current;
    const result = recordQuiz(previous, quiz, score);
    if (result.user !== previous) persist(result.user);
    showReward(result.awarded, previous, result.user);
    return result.awarded;
  }, [persist, showReward]);

  const applyOnboarding = useCallback((answers: OnboardingAnswers) => {
    const previous = current.current;
    persist({ ...previous, goal: answers.goal ?? previous.goal, skillLevel: answers.skillLevel ?? previous.skillLevel, dailyMinutes: answers.dailyMinutes ?? previous.dailyMinutes, knownAreas: answers.knownAreas });
  }, [persist]);

  const updateProfile = useCallback((name: string, dailyMinutes: number) => {
    if (name.trim().length < 2 || name.trim().length > 50 || !dailyGoals.includes(dailyMinutes)) throw new Error("Choisis un nom de 2 à 50 caractères et un objectif proposé.");
    return persist({ ...current.current, name: name.trim(), dailyMinutes });
  }, [persist]);

  const loginMock = useCallback((loggedInUser: User) => {
    const stored = readProfile(profileKey(loggedInUser.id));
    // Recover profiles created before full-email IDs and per-profile persistence.
    const matchingEmail = (profile: User | null) => profile?.email.toLowerCase() === loggedInUser.email.toLowerCase();
    const legacy = stored ?? readProfile(profileKey(`user-${loggedInUser.username}`));
    const active = matchingEmail(legacy) ? legacy : readProfile(STORAGE_KEY);
    const matching = matchingEmail(active) ? active : null;
    const profile = migrateUser({ ...(matching ?? loggedInUser), id: loggedInUser.id, email: loggedInUser.email, isAdmin: loggedInUser.isAdmin });
    setSessionCookie();
    if (profile.isAdmin) setAdminCookie(); else clearAdminCookie();
    persist(profile);
    setIsAuthenticated(true);
  }, [persist, readProfile]);

  const logout = useCallback(() => {
    clearSessionCookie();
    clearAdminCookie();
    if (timer.current) clearTimeout(timer.current);
    setLastXpToast(null);
    current.current = guest;
    setUser(guest);
    setIsAuthenticated(false);
  }, []);

  const resetProgress = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setLastXpToast(null);
    return persist(resetUserProgress(current.current));
  }, [persist]);

  const getCourseProgress = useCallback((id: string) => {
    const course = courses.find((item) => item.id === id);
    return course?.lessons.length ? Math.round(course.lessons.filter((lesson) => user.completedLessons.includes(lesson.id)).length / course.lessons.length * 100) : 0;
  }, [user.completedLessons]);
  const state = useMemo(() => ({ user, isAuthenticated, hydrated, storageError, getCourseProgress }), [user, isAuthenticated, hydrated, storageError, getCourseProgress]);
  const actions = useMemo(() => ({ addXp, completeLesson, completeChallenge, completeQuiz, applyOnboarding, updateProfile, loginMock, logout, resetProgress }), [addXp, completeLesson, completeChallenge, completeQuiz, applyOnboarding, updateProfile, loginMock, logout, resetProgress]);
  return <UserStateContext.Provider value={state}><UserActionsContext.Provider value={actions}><XpToastContext.Provider value={lastXpToast}>{children}</XpToastContext.Provider></UserActionsContext.Provider></UserStateContext.Provider>;
}

export function useUser() {
  const value = useContext(UserStateContext);
  if (!value) throw new Error("useUser doit être utilisé dans UserProvider.");
  return value;
}
export function useUserActions() {
  const value = useContext(UserActionsContext);
  if (!value) throw new Error("useUserActions doit être utilisé dans UserProvider.");
  return value;
}
export function useXpToast() { return useContext(XpToastContext); }
export function useUserFull() { return { ...useUser(), ...useUserActions() }; }
