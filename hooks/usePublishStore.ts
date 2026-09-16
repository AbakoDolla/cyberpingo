"use client";

import { useCallback, useEffect, useState } from "react";
import { PublishedCourse, PublishedChallenge } from "@/types";
import { readStorage, writeStorage } from "@/lib/storage";

const COURSES_KEY = "cyberpingo_published_courses_v1";
const CHALLENGES_KEY = "cyberpingo_published_challenges_v1";

export function usePublishStore() {
  const [publishedCourses, setPublishedCourses] = useState<PublishedCourse[]>([]);
  const [publishedChallenges, setPublishedChallenges] = useState<PublishedChallenge[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydratation depuis localStorage
  useEffect(() => {
    setPublishedCourses(readStorage<PublishedCourse[]>(COURSES_KEY, []));
    setPublishedChallenges(readStorage<PublishedChallenge[]>(CHALLENGES_KEY, []));
    setHydrated(true);
  }, []);

  const publishCourse = useCallback((course: PublishedCourse) => {
    setPublishedCourses((prev) => {
      // Évite les doublons par ID
      const filtered = prev.filter((c) => c.id !== course.id);
      const next = [course, ...filtered];
      writeStorage(COURSES_KEY, next);
      return next;
    });
  }, []);

  const publishChallenge = useCallback((challenge: PublishedChallenge) => {
    setPublishedChallenges((prev) => {
      const filtered = prev.filter((c) => c.id !== challenge.id);
      const next = [challenge, ...filtered];
      writeStorage(CHALLENGES_KEY, next);
      return next;
    });
  }, []);

  const unpublishCourse = useCallback((courseId: string) => {
    setPublishedCourses((prev) => {
      const next = prev.filter((c) => c.id !== courseId);
      writeStorage(COURSES_KEY, next);
      return next;
    });
  }, []);

  const unpublishChallenge = useCallback((challengeId: string) => {
    setPublishedChallenges((prev) => {
      const next = prev.filter((c) => c.id !== challengeId);
      writeStorage(CHALLENGES_KEY, next);
      return next;
    });
  }, []);

  const updateCourse = useCallback((updated: PublishedCourse) => {
    setPublishedCourses((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? updated : c));
      writeStorage(COURSES_KEY, next);
      return next;
    });
  }, []);

  const updateChallenge = useCallback((updated: PublishedChallenge) => {
    setPublishedChallenges((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? updated : c));
      writeStorage(CHALLENGES_KEY, next);
      return next;
    });
  }, []);

  return {
    hydrated,
    publishedCourses,
    publishedChallenges,
    publishCourse,
    publishChallenge,
    unpublishCourse,
    unpublishChallenge,
    updateCourse,
    updateChallenge,
  };
}
