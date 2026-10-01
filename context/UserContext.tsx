"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { errorMessage } from "@/lib/errors";
import { computeLevelInfo, effectiveStreak } from "@/lib/levels";
import { isStaff as roleIsStaff } from "@/lib/roles";
import { signOut } from "@/services/auth.service";
import {
  completeOnboarding as saveOnboarding, deleteMyAccount, getMyProfile, getMySettings, removeAvatar, resetMyProgress, updateMyProfile,
  uploadAvatar, type ProfileChanges,
} from "@/services/profile.service";
import { listLevels } from "@/services/gamification.service";
import { completeLesson as completeLessonRequest } from "@/services/lessons.service";
import { submitQuiz as submitQuizRequest } from "@/services/quiz.service";
import { submitLab as submitLabRequest } from "@/services/labs.service";
import { countUnreadNotifications, subscribeToNotifications } from "@/services/notification.service";
import { sendHeartbeat } from "@/services/platform.service";
import { hasRewards, type LabSubmission, type LessonCompletion, type LevelInfo, type MyProfile, type OnboardingAnswers, type QuizSubmission, type RewardSummary } from "@/types/api";

type Level = Awaited<ReturnType<typeof listLevels>>[number];

export interface RewardToast {
  id: number;
  tone: "success" | "level-up" | "badge" | "info";
  title: string;
  detail?: string;
}

interface UserStateValue {
  /** false when NEXT_PUBLIC_SUPABASE_* are missing: the app shows a configuration notice instead of data. */
  configured: boolean;
  hydrated: boolean;
  isAuthenticated: boolean;
  isStaff: boolean;
  profile: MyProfile | null;
  level: LevelInfo | null;
  /** Current streak as the server counts it (0 once a full day was missed). */
  streak: number;
  timezone: string;
  unreadNotifications: number;
  syncError: string | null;
}

interface UserActionsValue {
  refresh: () => Promise<void>;
  /** Applies an RPC reward summary locally (XP, level, streak) and queues the matching toasts. */
  applyRewards: (result: unknown) => void;
  completeLesson: (lessonId: string) => Promise<LessonCompletion>;
  submitQuiz: (quizId: string, answers: Record<string, string[]>) => Promise<QuizSubmission>;
  submitLab: (labId: string, answer: string) => Promise<LabSubmission>;
  completeOnboarding: (answers: OnboardingAnswers) => Promise<void>;
  updateProfile: (changes: ProfileChanges) => Promise<void>;
  updateAvatar: (file: File | null) => Promise<void>;
  resetProgress: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => Promise<void>;
  setUnreadNotifications: (update: number | ((current: number) => number)) => void;
}

interface RewardToastValue { toasts: RewardToast[]; dismiss: (id: number) => void }

const UserStateContext = createContext<UserStateValue | null>(null);
const UserActionsContext = createContext<UserActionsValue | null>(null);
const RewardToastContext = createContext<RewardToastValue>({ toasts: [], dismiss: () => undefined });

const browserZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris"; } catch { return "Europe/Paris"; }
};

/** Keeps the admin supervision view up to date while a learner has the app open. */
function SessionHeartbeat() {
  const pathname = usePathname();
  useEffect(() => {
    const beat = () => { void sendHeartbeat(pathname, document.visibilityState === "visible"); };
    beat();
    const interval = window.setInterval(beat, 60_000);
    document.addEventListener("visibilitychange", beat);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", beat); };
  }, [pathname]);
  return null;
}

function rewardToasts(summary: RewardSummary): Omit<RewardToast, "id">[] {
  const toasts: Omit<RewardToast, "id">[] = [];
  if (summary.leveled_up) {
    toasts.push({ tone: "level-up", title: `Niveau ${summary.level_info.level} atteint !`, detail: `${summary.level_info.title} · +${summary.xp_gained} XP` });
  } else if (summary.xp_gained > 0) {
    toasts.push({ tone: "success", title: `+${summary.xp_gained} XP`, detail: summary.level_info.next_level ? `${summary.level_info.progress_percentage} % vers le niveau ${summary.level_info.next_level}` : undefined });
  }
  for (const badge of summary.new_badges) toasts.push({ tone: "badge", title: `Badge débloqué : ${badge.name}`, detail: badge.description });
  for (const challenge of summary.completed_challenges) toasts.push({ tone: "success", title: `Défi réussi : ${challenge.title}`, detail: `+${challenge.xp_reward} XP` });
  if (summary.course_completed) toasts.push({ tone: "level-up", title: "Parcours terminé !", detail: summary.course_completed.title });
  if (summary.certificate) toasts.push({ tone: "badge", title: "Certificat obtenu", detail: `N° ${summary.certificate.certificate_number}` });
  return toasts;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);
  const [timezone, setTimezone] = useState(browserZone);
  const [unreadNotifications, setUnreadState] = useState(0);
  const [hydrated, setHydrated] = useState(!isSupabaseConfigured);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<RewardToast[]>([]);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const loadedFor = useRef<string | null>(null);
  const request = useRef(0);
  const toastId = useRef(0);
  const toastTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = toastTimers.current.get(id);
    if (timer) clearTimeout(timer);
    toastTimers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToasts = useCallback((items: Omit<RewardToast, "id">[]) => {
    const created = items.map((item) => ({ ...item, id: ++toastId.current }));
    setToasts((current) => [...current, ...created].slice(-4));
    // Stagger the exits so a burst of rewards stays readable.
    created.forEach((toast, index) => toastTimers.current.set(toast.id, setTimeout(() => dismiss(toast.id), 3600 + index * 900)));
  }, [dismiss]);

  const becomeGuest = useCallback(() => {
    request.current += 1;
    loadedFor.current = null;
    setSessionUserId(null);
    setProfile(null);
    setUnreadState(0);
    setSyncError(null);
    for (const timer of toastTimers.current.values()) clearTimeout(timer);
    toastTimers.current.clear();
    setToasts([]);
  }, []);

  /** Reloads the learner from the database, the single source of truth for progress. */
  const load = useCallback(async (userId: string) => {
    const ticket = ++request.current;
    loadedFor.current = userId;
    setSessionUserId(userId);
    try {
      const [nextProfile, settings, levelRows, unread] = await Promise.all([
        getMyProfile(userId),
        getMySettings(userId),
        levels.length ? Promise.resolve(levels) : listLevels(),
        countUnreadNotifications(userId),
      ]);
      if (ticket !== request.current) return;
      if (!nextProfile) throw new Error("Profil introuvable");
      setProfile(nextProfile);
      if (settings) setTimezone(settings.timezone);
      if (!levels.length) setLevels(levelRows);
      setUnreadState(unread);
      setSyncError(null);
    } catch (error) {
      if (ticket !== request.current) return;
      console.error("Chargement du profil impossible", error);
      setSyncError(errorMessage(error, "Impossible de charger ton profil. Vérifie ta connexion puis réessaie."));
    } finally {
      if (ticket === request.current) setHydrated(true);
    }
  }, [levels]);

  const loadRef = useRef(load);
  loadRef.current = load;

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
        void loadRef.current(id);
      }, 0);
    });
    const timers = toastTimers.current;
    return () => {
      active = false;
      subscription.unsubscribe();
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, [becomeGuest]);

  const userId = profile?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    return subscribeToNotifications(userId, () => setUnreadState((count) => count + 1));
  }, [userId]);

  const requireUser = useCallback(() => {
    const id = loadedFor.current;
    if (!id) throw new Error("Connecte-toi pour enregistrer ta progression.");
    return id;
  }, []);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data: { user } } = await getSupabaseBrowserClient().auth.getUser();
    if (user) await loadRef.current(user.id); else { becomeGuest(); setHydrated(true); }
  }, [becomeGuest]);

  const applyRewards = useCallback((result: unknown) => {
    if (!hasRewards(result)) return;
    setProfile((current) => current && {
      ...current,
      xp: result.level_info.xp,
      level: result.level_info.level,
      current_streak: result.current_streak,
      longest_streak: result.longest_streak,
      // The server just recorded a qualifying activity for "today" in the learner's timezone.
      last_activity_date: result.current_streak > 0 ? new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date()) : current.last_activity_date,
    });
    pushToasts(rewardToasts(result));
  }, [pushToasts, timezone]);

  const completeLesson = useCallback(async (lessonId: string) => {
    requireUser();
    const result = await completeLessonRequest(lessonId);
    applyRewards(result);
    return result;
  }, [applyRewards, requireUser]);

  const submitQuiz = useCallback(async (quizId: string, answers: Record<string, string[]>) => {
    requireUser();
    const result = await submitQuizRequest(quizId, answers);
    applyRewards(result);
    return result;
  }, [applyRewards, requireUser]);

  const submitLab = useCallback(async (labId: string, answer: string) => {
    requireUser();
    const result = await submitLabRequest(labId, answer);
    applyRewards(result);
    return result;
  }, [applyRewards, requireUser]);

  const completeOnboarding = useCallback(async (answers: OnboardingAnswers) => {
    const id = requireUser();
    if (!profile) throw new Error("Profil non chargé.");
    await saveOnboarding(answers, profile);
    await loadRef.current(id);
  }, [profile, requireUser]);

  const updateProfile = useCallback(async (changes: ProfileChanges) => {
    const id = requireUser();
    await updateMyProfile(id, changes);
    await loadRef.current(id);
  }, [requireUser]);

  const updateAvatar = useCallback(async (file: File | null) => {
    const id = requireUser();
    if (file) await uploadAvatar(id, file, profile?.avatar_path ?? null);
    else await removeAvatar(id, profile?.avatar_path ?? null);
    await loadRef.current(id);
  }, [profile?.avatar_path, requireUser]);

  const resetProgress = useCallback(async () => {
    const id = requireUser();
    await resetMyProgress();
    await loadRef.current(id);
  }, [requireUser]);

  const deleteAccount = useCallback(async () => {
    requireUser();
    await deleteMyAccount();
    becomeGuest();
  }, [becomeGuest, requireUser]);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured) await signOut();
    becomeGuest();
  }, [becomeGuest]);

  const setUnreadNotifications = useCallback((update: number | ((current: number) => number)) => {
    setUnreadState((current) => Math.max(0, typeof update === "function" ? update(current) : update));
  }, []);

  const level = useMemo(() => (profile && levels.length ? computeLevelInfo(profile.xp, levels) : null), [profile, levels]);
  const streak = profile ? effectiveStreak(profile.current_streak, profile.last_activity_date, timezone) : 0;

  const state = useMemo<UserStateValue>(() => ({
    configured: isSupabaseConfigured,
    hydrated,
    isAuthenticated: Boolean(sessionUserId),
    isStaff: roleIsStaff(profile?.role),
    profile,
    level,
    streak,
    timezone,
    unreadNotifications,
    syncError,
  }), [hydrated, sessionUserId, profile, level, streak, timezone, unreadNotifications, syncError]);

  const actions = useMemo<UserActionsValue>(() => ({
    refresh, applyRewards, completeLesson, submitQuiz, submitLab, completeOnboarding, updateProfile, updateAvatar, resetProgress, deleteAccount, logout,
    setUnreadNotifications,
  }), [refresh, applyRewards, completeLesson, submitQuiz, submitLab, completeOnboarding, updateProfile, updateAvatar, resetProgress, deleteAccount, logout, setUnreadNotifications]);

  const toastValue = useMemo(() => ({ toasts, dismiss }), [toasts, dismiss]);

  return <UserStateContext.Provider value={state}>
    <UserActionsContext.Provider value={actions}>
      <RewardToastContext.Provider value={toastValue}>
        {profile && <SessionHeartbeat />}
        {children}
      </RewardToastContext.Provider>
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
/** For components rendered inside AppShell, which only mounts its children once the profile is loaded. */
export function useLearner() {
  const state = useUser();
  if (!state.profile) throw new Error("useLearner doit être utilisé dans AppShell (profil non chargé).");
  return { ...state, profile: state.profile };
}
export function useRewardToasts() { return useContext(RewardToastContext); }
export function useUserFull() { return { ...useUser(), ...useUserActions() }; }
