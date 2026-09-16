"use client";


import {
  createContext, useCallback, useContext, useEffect,
  useMemo, useRef, useState,
} from "react";
import { currentUser as mockUser } from "@/data/users";
import { courses } from "@/data/courses";
import { lessons } from "@/data/lessons";
import {
  readStorage, writeStorage,
  setSessionCookie, clearSessionCookie,
  setAdminCookie, clearAdminCookie,
} from "@/lib/storage";
import { User, OnboardingAnswers } from "@/types";

const STORAGE_KEY = "cyberpingo_user_v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface XpToastState {
  amount: number;
  id: number;
  isLevelUp?: boolean;
}

interface UserStateValue {
  user: User;
  isAuthenticated: boolean;
  getCourseProgress: (courseId: string) => number;
}

interface UserActionsValue {
  addXp: (amount: number) => void;
  completeLesson: (lessonId: string, xp: number) => void;
  completeChallenge: (challengeId: string, xp: number) => void;
  completeQuiz: () => void;
  applyOnboarding: (answers: OnboardingAnswers) => void;
  loginMock: (loggedInUser: User) => void;
  logout: () => void;
  resetProgress: () => void;
}

// ─── Contextes séparés ────────────────────────────────────────────────────────
// 3 contextes au lieu d'un → chaque consommateur ne re-rend que lorsque
// la tranche dont il a besoin change.

/** Données utilisateur + progression. Change à chaque mutation XP/leçon. */
const UserStateContext = createContext<UserStateValue | null>(null);

/** Actions stables (useCallback avec deps vides ou quasi-stables). Ne change jamais. */
const UserActionsContext = createContext<UserActionsValue | null>(null);

/**
 * État du toast XP. Change souvent (toutes les 2-3s quand l'utilisateur gagne des XP).
 * Isolé pour que seul AppShell (qui affiche le Toast) re-rende lors des toasts.
 */
const XpToastContext = createContext<XpToastState | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeLevel(xp: number): { level: number; xpToNextLevel: number } {
  let level = 1;
  let threshold = 800;
  let remaining = xp;
  while (remaining >= threshold) {
    remaining -= threshold;
    level += 1;
    threshold = Math.round(threshold * 1.2);
  }
  return { level, xpToNextLevel: threshold };
}

function computeSkills(completedLessons: string[]): User["skills"] {
  const courseSkillMap: Record<string, string> = {
    c1: "Networking", c2: "Networking",
    c3: "Linux",
    c4: "Web Security", c5: "Web Security",
  };
  const skillTotals: Record<string, { done: number; total: number }> = {
    Networking: { done: 0, total: 0 },
    Linux: { done: 0, total: 0 },
    "Web Security": { done: 0, total: 0 },
    Cryptographie: { done: 0, total: 0 },
  };
  for (const course of courses) {
    const sk = courseSkillMap[course.id];
    if (!sk || !skillTotals[sk]) continue;
    skillTotals[sk].total += course.lessons.length;
    for (const lesson of course.lessons) {
      if (completedLessons.includes(lesson.id)) skillTotals[sk].done += 1;
    }
  }
  return Object.entries(skillTotals).map(([name, { done, total }]) => ({
    name,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  }));
}

function computeBadges(user: User): User["badges"] {
  return user.badges.map((badge) => {
    if (badge.earned) return badge;
    let earned = false;
    if (badge.id === "b1" && user.completedLessons.length >= 1) earned = true;
    if (badge.id === "b2" && user.streak >= 7) earned = true;
    if (badge.id === "b3" && user.completedChallenges.length >= 1) earned = true;
    if (badge.id === "b4" && user.completedQuizzes >= 10) earned = true;
    if (badge.id === "b5") {
      const c2Lessons = lessons.filter((l) => l.courseId === "c2");
      if (c2Lessons.length > 0 && c2Lessons.every((l) => user.completedLessons.includes(l.id)))
        earned = true;
    }
    return earned
      ? { ...badge, earned: true, earnedAt: new Date().toISOString().split("T")[0] }
      : badge;
  });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(mockUser);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastXpToast, setLastXpToast] = useState<XpToastState | null>(null);
  const prevLevelRef = useRef<number>(mockUser.level);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydratation depuis localStorage
  useEffect(() => {
    const stored = readStorage<User | null>(STORAGE_KEY, null);
    if (stored) {
      const migrated: User = {
        ...stored,
        completedLessons:    stored.completedLessons    ?? [],
        completedChallenges: stored.completedChallenges ?? [],
        completedQuizzes:    stored.completedQuizzes    ?? 0,
      };
      setUser(migrated);
      prevLevelRef.current = migrated.level;
    }
    const hasCookie =
      typeof document !== "undefined" && document.cookie.includes("cyberpingo_session=1");
    setIsAuthenticated(hasCookie);
  }, []);

  // Nettoyage du timer de toast au démontage
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); }, []);

  // ── Progression des cours (stable tant que completedLessons ne change pas) ──

  const getCourseProgress = useCallback(
    (courseId: string): number => {
      const course = courses.find((c) => c.id === courseId);
      if (!course || course.lessons.length === 0) return 0;
      const done = course.lessons.filter((l) => user.completedLessons.includes(l.id)).length;
      return Math.round((done / course.lessons.length) * 100);
    },
    [user.completedLessons]
  );

  // ── Toast XP (propre, sans setTimeout dans un setter) ──────────────────────

  const triggerToast = useCallback((amount: number, isLevelUp = false) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const toastId = Date.now();
    setLastXpToast({ amount, id: toastId, isLevelUp });
    toastTimerRef.current = setTimeout(() => {
      setLastXpToast((cur) => (cur?.id === toastId ? null : cur));
    }, isLevelUp ? 2600 : 2000);
  }, []);

  const persist = useCallback((next: User) => {
    setUser(next);
    writeStorage(STORAGE_KEY, next);
  }, []);

  // ── Actions mutations ───────────────────────────────────────────────────────

  const addXp = useCallback((amount: number) => {
    setUser((prev) => {
      const nextXp = prev.xp + amount;
      const { level, xpToNextLevel } = computeLevel(nextXp);
      const leveledUp = level > prevLevelRef.current;
      if (leveledUp) prevLevelRef.current = level;
      const next = { ...prev, xp: nextXp, level, xpToNextLevel };
      writeStorage(STORAGE_KEY, next);
      return next;
    });
    // triggerToast en dehors du setter — plus de side-effect dans l'updater
    setTimeout(() => triggerToast(amount, false), 0);
  }, [triggerToast]);

  const completeLesson = useCallback((lessonId: string, xp: number) => {
    setUser((prev) => {
      if (prev.completedLessons.includes(lessonId)) return prev;
      const completedLessons = [...prev.completedLessons, lessonId];
      const nextXp = prev.xp + xp;
      const { level, xpToNextLevel } = computeLevel(nextXp);
      const leveledUp = level > prevLevelRef.current;
      if (leveledUp) prevLevelRef.current = level;
      const skills = computeSkills(completedLessons);
      const badges = computeBadges({ ...prev, completedLessons, xp: nextXp });
      const next: User = { ...prev, xp: nextXp, level, xpToNextLevel, completedLessons, skills, badges };
      writeStorage(STORAGE_KEY, next);
      return next;
    });
    setTimeout(() => triggerToast(xp, false), 0);
  }, [triggerToast]);

  const completeChallenge = useCallback((challengeId: string, xp: number) => {
    setUser((prev) => {
      if (prev.completedChallenges.includes(challengeId)) return prev;
      const completedChallenges = [...prev.completedChallenges, challengeId];
      const nextXp = prev.xp + xp;
      const { level, xpToNextLevel } = computeLevel(nextXp);
      const leveledUp = level > prevLevelRef.current;
      if (leveledUp) prevLevelRef.current = level;
      const badges = computeBadges({ ...prev, completedChallenges, xp: nextXp });
      const next: User = { ...prev, xp: nextXp, level, xpToNextLevel, completedChallenges, badges };
      writeStorage(STORAGE_KEY, next);
      return next;
    });
    setTimeout(() => triggerToast(xp, false), 0);
  }, [triggerToast]);

  const completeQuiz = useCallback(() => {
    setUser((prev) => {
      const completedQuizzes = prev.completedQuizzes + 1;
      const badges = computeBadges({ ...prev, completedQuizzes });
      const next: User = { ...prev, completedQuizzes, badges };
      writeStorage(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const applyOnboarding = useCallback((answers: OnboardingAnswers) => {
    setUser((prev) => {
      const next: User = {
        ...prev,
        goal: answers.goal ?? prev.goal,
        skillLevel: answers.skillLevel ?? prev.skillLevel,
        dailyMinutes: answers.dailyMinutes ?? prev.dailyMinutes,
      };
      writeStorage(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const loginMock = useCallback((loggedInUser: User) => {
    setSessionCookie();
    if (loggedInUser.isAdmin) setAdminCookie();
    else clearAdminCookie();
    const STORAGE_KEY_USER = `cyberpingo_user_${loggedInUser.id}`;
    const stored = readStorage<User | null>(STORAGE_KEY_USER, null);
    const profile: User = stored
      ? {
          ...stored,
          isAdmin: loggedInUser.isAdmin,
          completedLessons:    stored.completedLessons    ?? [],
          completedChallenges: stored.completedChallenges ?? [],
          completedQuizzes:    stored.completedQuizzes    ?? 0,
        }
      : loggedInUser;
    persist(profile);
    prevLevelRef.current = profile.level;
    setIsAuthenticated(true);
  }, [persist]);

  const logout = useCallback(() => {
    clearSessionCookie();
    clearAdminCookie();
    persist(mockUser);
    prevLevelRef.current = mockUser.level;
    setIsAuthenticated(false);
  }, [persist]);

  const resetProgress = useCallback(() => {
    prevLevelRef.current = mockUser.level;
    persist(mockUser);
  }, [persist]);

  // ── Valeurs mémoïsées par contexte ─────────────────────────────────────────
  // Chaque objet ne change que si ses dépendances changent.
  // Les consommateurs de UserActionsContext ne re-rendent JAMAIS (actions stables).

  const stateValue = useMemo<UserStateValue>(
    () => ({ user, isAuthenticated, getCourseProgress }),
    [user, isAuthenticated, getCourseProgress]
  );

  const actionsValue = useMemo<UserActionsValue>(
    () => ({
      addXp, completeLesson, completeChallenge, completeQuiz,
      applyOnboarding, loginMock, logout, resetProgress,
    }),
    [addXp, completeLesson, completeChallenge, completeQuiz,
      applyOnboarding, loginMock, logout, resetProgress]
  );

  return (
    <UserStateContext.Provider value={stateValue}>
      <UserActionsContext.Provider value={actionsValue}>
        <XpToastContext.Provider value={lastXpToast}>
          {children}
        </XpToastContext.Provider>
      </UserActionsContext.Provider>
    </UserStateContext.Provider>
  );
}

// ─── Hooks publics ────────────────────────────────────────────────────────────

/** Données utilisateur. Re-rend quand user ou isAuthenticated change. */
export function useUser() {
  const ctx = useContext(UserStateContext);
  if (!ctx) throw new Error("useUser doit être utilisé à l'intérieur de <UserProvider>");
  return ctx;
}

/** Actions. Ne provoque JAMAIS de re-render (stable). */
export function useUserActions() {
  const ctx = useContext(UserActionsContext);
  if (!ctx) throw new Error("useUserActions doit être utilisé à l'intérieur de <UserProvider>");
  return ctx;
}

/** Toast XP. Re-rend uniquement quand un toast XP apparaît/disparaît. */
export function useXpToast() {
  return useContext(XpToastContext);
}

/**
 * Hook de compatibilité rétrograde — combine useUser + useUserActions.
 * À utiliser quand les deux sont nécessaires dans le même composant.
 * Préférer useUser() ou useUserActions() séparément si possible.
 */
export function useUserFull() {
  const state = useUser();
  const actions = useUserActions();
  return { ...state, ...actions };
}
