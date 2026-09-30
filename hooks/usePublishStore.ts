"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { PublishedChallenge, PublishedCourse } from "@/types";
import { useUser } from "@/context/UserContext";
import { friendlyError } from "@/lib/learner-mapping";
import { normalizePublishedChallenge, normalizePublishedCourse } from "@/lib/publishing";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

interface Snapshot {
  courses: PublishedCourse[];
  challenges: PublishedChallenge[];
  hydrated: boolean;
  error: string | null;
}
interface Row<T> { id: string; slug: string; title: string; payload: T; published_at: string }

const empty: Snapshot = { courses: [], challenges: [], hydrated: false, error: null };
let snapshot = empty;
let loadedFor: string | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const getSnapshot = () => snapshot;
const getServerSnapshot = () => empty;

// The row columns win over the payload so the listing always matches what the database enforces.
const fromCourseRow = (row: Row<PublishedCourse>): PublishedCourse => ({ ...row.payload, id: row.id, slug: row.slug, title: row.title, publishedAt: row.published_at });
const fromChallengeRow = (row: Row<PublishedChallenge>): PublishedChallenge => ({ ...row.payload, id: row.id, slug: row.slug, title: row.title, publishedAt: row.published_at, status: "disponible" });

async function fetchPublished(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const columns = "id, slug, title, payload, published_at";
  const [courses, challenges] = await Promise.all([
    supabase.from("published_courses").select(columns).order("published_at", { ascending: false }),
    supabase.from("published_challenges").select(columns).order("published_at", { ascending: false }),
  ]);
  if (loadedFor !== userId) return;
  const error = courses.error ?? challenges.error;
  if (error) {
    set({ hydrated: true, error: friendlyError(error, "Les contenus publiés n’ont pas pu être chargés.") });
    return;
  }
  set({
    courses: (courses.data as Row<PublishedCourse>[]).map(fromCourseRow),
    challenges: (challenges.data as Row<PublishedChallenge>[]).map(fromChallengeRow),
    hydrated: true,
    error: null,
  });
}

function load(userId: string, force = false) {
  if (!force && loadedFor === userId && (inflight || snapshot.hydrated)) return inflight ?? Promise.resolve();
  loadedFor = userId;
  const run = fetchPublished(userId).finally(() => { if (inflight === run) inflight = null; });
  inflight = run;
  return run;
}

/** Published courses and challenges, shared by every page and refreshed after admin changes. */
export function usePublishStore() {
  const { user, isAuthenticated, hydrated: userHydrated } = useUser();
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!userHydrated) return;
    if (!isSupabaseConfigured || !isAuthenticated) {
      loadedFor = null;
      if (!snapshot.hydrated || snapshot.courses.length || snapshot.challenges.length || snapshot.error) set({ ...empty, hydrated: true });
      return;
    }
    void load(user.id);
  }, [isAuthenticated, user.id, userHydrated]);

  const refresh = useCallback(() => (loadedFor ? load(loadedFor, true) : Promise.resolve()), []);

  const publishCourse = useCallback(async (draft: PublishedCourse) => {
    const course = normalizePublishedCourse(draft);
    const { error } = await getSupabaseBrowserClient().from("published_courses")
      .insert({ id: course.id, slug: course.slug, title: course.title, payload: course, published_by: user.id });
    if (error) throw new Error(friendlyError(error, "Le cours n’a pas pu être publié."));
    await refresh();
    return course;
  }, [refresh, user.id]);

  const publishChallenge = useCallback(async (draft: PublishedChallenge) => {
    const challenge = normalizePublishedChallenge(draft);
    if (!challenge.expectedAnswer) throw new Error("Indique la réponse attendue du challenge avant de publier.");
    // The database moves expectedAnswer to a private table before the row becomes readable.
    const { error } = await getSupabaseBrowserClient().from("published_challenges")
      .insert({ id: challenge.id, slug: challenge.slug, title: challenge.title, payload: challenge, published_by: user.id });
    if (error) throw new Error(friendlyError(error, "Le challenge n’a pas pu être publié."));
    await refresh();
    return challenge;
  }, [refresh, user.id]);

  const remove = useCallback(async (table: "published_courses" | "published_challenges", id: string) => {
    const { error } = await getSupabaseBrowserClient().from(table).delete().eq("id", id);
    if (error) throw new Error(friendlyError(error, "La suppression a échoué."));
    await refresh();
  }, [refresh]);
  const unpublishCourse = useCallback((id: string) => remove("published_courses", id), [remove]);
  const unpublishChallenge = useCallback((id: string) => remove("published_challenges", id), [remove]);

  return {
    hydrated: state.hydrated,
    error: state.error,
    publishedCourses: state.courses,
    publishedChallenges: state.challenges,
    publishCourse,
    publishChallenge,
    unpublishCourse,
    unpublishChallenge,
    refresh,
  };
}
