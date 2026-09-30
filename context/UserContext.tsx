"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { currentUser as mockUser } from "@/data/users";
import { courses } from "@/data/courses";
import { dailyGoals, resetUserProgress } from "@/lib/learning-progress";
import { buildUser, friendlyError } from "@/lib/learner-mapping";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, missingConfigMessage } from "@/lib/supabase/config";
import { fetchLearnerSnapshot } from "@/lib/supabase/learner";
import type { OnboardingAnswers, User } from "@/types";
import type { ChallengeSubmission, LessonSubmission, QuizSubmission } from "@/types/database";

const guest: User = { ...resetUserProgress(mockUser), id: "guest", name: "Explorateur", username: "explorateur", email: "", isAdmin: false, onboardingCompleted: false };
const loadMessage = "Impossible de charger ta progression. Vérifie ta connexion puis réessaie.";

export interface XpToastState { amount: number; id: number; isLevelUp?: boolean }
interface UserStateValue {
  user: User;
  isAuthenticated: boolean;
  hydrated: boolean;
  syncError: string | null;
  getCourseProgress: (courseId: string) => number;
}
interface UserActionsValue {
  completeLesson: (lessonId: string) => Promise<LessonSubmission>;
  completeQuiz: (quizId: string, answers: string[]) => Promise<QuizSubmission>;
  completeChallenge: (challengeId: string, answer: string) => Promise<ChallengeSubmission>;
  applyOnboarding: (answers: OnboardingAnswers) => Promise<void>;
  updateProfile: (name: string, dailyMinutes: number) => Promise<void>;
  resetProgress: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const UserStateContext = createContext<UserStateValue | null>(null);
const UserActionsContext = createContext<UserActionsValue | null>(null);
const XpToastContext = createContext<XpToastState | null>(null);

/** Keeps the admin supervision view up to date while a learner has the app open. */
function SessionHeartbeat() {
  const pathname = usePathname();
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const beat = () => {
      // Supabase queries are lazy: `then` is what sends the request.
      supabase.rpc("heartbeat", { p_page: pathname, p_visible: document.visibilityState === "visible" }).then(() => undefined);
    };
    beat();
    const interval = window.setInterval(beat, 60_000);
    document.addEventListener("visibilitychange", beat);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", beat); };
  }, [pathname]);
  return null;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(guest);
  const current = useRef(user);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hydrated, setHydrated] = useState(!isSupabaseConfigured);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastXpToast, setLastXpToast] = useState<XpToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedFor = useRef<string | null>(null);
  const request = useRef(0);

  const apply = useCallback((next: User) => { current.current = next; setUser(next); }, []);

  const clearToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setLastXpToast(null);
  }, []);

  const becomeGuest = useCallback(() => {
    request.current += 1;
    loadedFor.current = null;
    clearToast();
    apply(guest);
    setIsAuthenticated(false);
  }, [apply, clearToast]);

  /** Reloads the learner from the database, the single source of truth for progress. */
  const load = useCallback(async (userId: string) => {
    const ticket = ++request.current;
    loadedFor.current = userId;
    try {
      const snapshot = await fetchLearnerSnapshot(getSupabaseBrowserClient(), userId);
      if (ticket !== request.current) return;
      apply(buildUser(snapshot));
      setIsAuthenticated(true);
      setSyncError(null);
    } catch (error) {
      if (ticket !== request.current) return;
      console.error("Chargement du profil impossible", error);
      setIsAuthenticated(true);
      setSyncError(friendlyError(error, loadMessage));
    } finally {
      if (ticket === request.current) setHydrated(true);
    }
  }, [apply]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase deadlocks if its own client is awaited inside this callback, so defer the work.
      setTimeout(() => {
        if (!active) return;
        const id = session?.user.id ?? null;
        if (!id) { becomeGuest(); setHydrated(true); return; }
        if (id === loadedFor.current && event !== "USER_UPDATED") return;
        void load(id);
      }, 0);
    });
    return () => { active = false; subscription.unsubscribe(); if (timer.current) clearTimeout(timer.current); };
  }, [becomeGuest, load]);

  const requireSession = useCallback(() => {
    if (!isSupabaseConfigured) throw new Error(missingConfigMessage);
    const id = loadedFor.current;
    if (!id) throw new Error("Connecte-toi pour enregistrer ta progression.");
    return { supabase: getSupabaseBrowserClient(), id };
  }, []);

  const reward = useCallback(async (amount: number) => {
    const previous = current.current;
    const { id } = requireSession();
    await load(id);
    if (amount <= 0) return;
    if (timer.current) clearTimeout(timer.current);
    setLastXpToast({ amount, id: Date.now(), isLevelUp: current.current.level > previous.level });
    timer.current = setTimeout(() => setLastXpToast(null), 2600);
  }, [load, requireSession]);

  const call = useCallback(async <T,>(fn: string, args: Record<string, unknown> | undefined, fallback: string) => {
    const { supabase } = requireSession();
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw new Error(friendlyError(error, fallback));
    return data as T;
  }, [requireSession]);

  const completeLesson = useCallback(async (lessonId: string) => {
    const result = await call<LessonSubmission>("complete_lesson", { p_lesson_id: lessonId }, "La leçon n’a pas pu être enregistrée. Réessaie.");
    await reward(result.awarded);
    return result;
  }, [call, reward]);

  const completeQuiz = useCallback(async (quizId: string, answers: string[]) => {
    const result = await call<QuizSubmission>("submit_quiz", { p_quiz_id: quizId, p_answers: answers }, "Ton résultat n’a pas pu être enregistré. Réessaie.");
    await reward(result.awarded);
    return result;
  }, [call, reward]);

  const completeChallenge = useCallback(async (challengeId: string, answer: string) => {
    const result = await call<ChallengeSubmission>("submit_challenge", { p_challenge_id: challengeId, p_answer: answer }, "Ta réponse n’a pas pu être vérifiée. Réessaie.");
    if (result.correct) await reward(result.awarded);
    return result;
  }, [call, reward]);

  const applyOnboarding = useCallback(async (answers: OnboardingAnswers) => {
    const previous = current.current;
    await call<null>("complete_onboarding", {
      p_skill_level: answers.skillLevel ?? previous.skillLevel,
      p_goal: answers.goal ?? previous.goal,
      p_daily_minutes: answers.dailyMinutes ?? previous.dailyMinutes,
      p_known_areas: answers.knownAreas,
    }, "Ton parcours n’a pas pu être enregistré. Réessaie.");
    await load(requireSession().id);
  }, [call, load, requireSession]);

  const updateProfile = useCallback(async (name: string, dailyMinutes: number) => {
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 50 || !dailyGoals.includes(dailyMinutes)) throw new Error("Choisis un nom de 2 à 50 caractères et un objectif proposé.");
    const { supabase, id } = requireSession();
    const { error } = await supabase.from("profiles").update({ display_name: trimmed, daily_minutes: dailyMinutes }).eq("id", id);
    if (error) throw new Error(friendlyError(error, "Le profil n’a pas pu être enregistré. Réessaie."));
    await load(id);
  }, [load, requireSession]);

  const resetProgress = useCallback(async () => {
    await call<null>("reset_my_progress", undefined, "La réinitialisation a échoué. Tes progrès sont intacts.");
    clearToast();
    await load(requireSession().id);
  }, [call, clearToast, load, requireSession]);

  const deleteAccount = useCallback(async () => {
    const { supabase } = requireSession();
    await call<null>("delete_my_account", undefined, "La suppression du compte a échoué. Réessaie.");
    // The account no longer exists on the server, so only the local session remains to clear.
    await supabase.auth.signOut({ scope: "local" });
    becomeGuest();
  }, [becomeGuest, call, requireSession]);

  const logout = useCallback(async () => {
    if (!isSupabaseConfigured) { becomeGuest(); return; }
    const supabase = getSupabaseBrowserClient();
    if (loadedFor.current) await supabase.rpc("end_session").then(() => undefined);
    const { error } = await supabase.auth.signOut();
    if (error) await supabase.auth.signOut({ scope: "local" });
    becomeGuest();
  }, [becomeGuest]);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data: { user: authUser } } = await getSupabaseBrowserClient().auth.getUser();
    if (authUser) await load(authUser.id); else becomeGuest();
  }, [becomeGuest, load]);

  const getCourseProgress = useCallback((id: string) => {
    const course = courses.find((item) => item.id === id);
    return course?.lessons.length ? Math.round(course.lessons.filter((lesson) => user.completedLessons.includes(lesson.id)).length / course.lessons.length * 100) : 0;
  }, [user.completedLessons]);

  const state = useMemo(() => ({ user, isAuthenticated, hydrated, syncError, getCourseProgress }), [user, isAuthenticated, hydrated, syncError, getCourseProgress]);
  const actions = useMemo(
    () => ({ completeLesson, completeQuiz, completeChallenge, applyOnboarding, updateProfile, resetProgress, deleteAccount, logout, refresh }),
    [completeLesson, completeQuiz, completeChallenge, applyOnboarding, updateProfile, resetProgress, deleteAccount, logout, refresh],
  );
  return <UserStateContext.Provider value={state}>
    <UserActionsContext.Provider value={actions}>
      <XpToastContext.Provider value={lastXpToast}>
        {isAuthenticated && <SessionHeartbeat />}
        {children}
      </XpToastContext.Provider>
    </UserActionsContext.Provider>
  </UserStateContext.Provider>;
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
