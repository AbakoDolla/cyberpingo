"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RealtimeState, RealtimeEvent } from "@/types/realtime";
import { generateInitialState, tickState } from "@/lib/realtimeMock";

const TICK_MS = 3000;

const EMPTY_STATE: RealtimeState = {
  sessions: [],
  events: [],
  stats: {
    totalOnline: 0, totalIdle: 0, totalOffline: 0, totalSessions: 0,
    peakOnlineToday: 0, totalLoginsToday: 0, totalXpEarnedToday: 0,
    mostVisitedPages: [],
    actionCounts: {} as RealtimeState["stats"]["actionCounts"],
  },
  lastUpdated: "",
  connected: false,
};

interface UseRealtimeReturn {
  state: RealtimeState;
  newEvents: RealtimeEvent[];
  isLive: boolean;
  pause: () => void;
  resume: () => void;
}

export function useRealtime(): UseRealtimeReturn {
  const [state, setState] = useState<RealtimeState>(EMPTY_STATE);
  const [isLive, setIsLive] = useState(true);
  const [newEvents, setNewEvents] = useState<RealtimeEvent[]>([]);
  const prevEventIdsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const newEventsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const isMountedRef = useRef(true);

  // Nettoyage au démontage
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (newEventsTimerRef.current) clearTimeout(newEventsTimerRef.current);
    };
  }, []);

  // Initialisation différée côté client uniquement
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const initial = generateInitialState();
    prevEventIdsRef.current = new Set(initial.events.map((e) => e.id));
    setState(initial);
  }, []);

  // Nettoyage du timer newEvents quand ils changent
  useEffect(() => {
    if (newEvents.length === 0) return;
    if (newEventsTimerRef.current) clearTimeout(newEventsTimerRef.current);
    newEventsTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setNewEvents([]);
    }, 4000);
  }, [newEvents]);

  const tick = useCallback(() => {
    setState((prev) => {
      if (!prev.connected) return prev;
      const next = tickState(prev);
      const prevIds = prevEventIdsRef.current;
      const fresh = next.events.filter((e) => !prevIds.has(e.id));
      prevEventIdsRef.current = new Set(next.events.map((e) => e.id));
      // Mise à jour des nouveaux events en dehors du setter
      if (fresh.length > 0) {
        // setTimeout(0) pour sortir du setter React
        setTimeout(() => {
          if (isMountedRef.current) setNewEvents(fresh);
        }, 0);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (isLive) {
      intervalRef.current = setInterval(tick, TICK_MS);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLive, tick]);

  const pause = useCallback(() => setIsLive(false), []);
  const resume = useCallback(() => setIsLive(true), []);

  return { state, newEvents, isLive, pause, resume };
}
