"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toAppError } from "@/lib/errors";
import {
  adminOverview, getProfileSummary, listActivityEvents, listLiveSessions, subscribeToActivityEvents, subscribeToLearnerSessions,
  type ActivityEventRow, type LearnerSessionRow, type ProfileSummary,
} from "@/services/admin.service";
import type { AdminOverview } from "@/types/api";
import type { LiveConnection, LiveEvent, LiveSession } from "@/types/realtime";

const EVENT_LIMIT = 120;
const FRESH_MS = 4500;

function profileName(profile: ProfileSummary | null | undefined) {
  return profile?.display_name || profile?.username || "Apprenant";
}

function toSession(row: LearnerSessionRow, profile: ProfileSummary | null | undefined): LiveSession {
  return {
    userId: row.user_id,
    displayName: profileName(profile),
    username: profile?.username ?? "",
    role: profile?.role ?? "user",
    xp: profile?.xp ?? 0,
    currentPage: row.current_page,
    visible: row.visible,
    connectedAt: row.connected_at,
    lastSeenAt: row.last_seen_at,
    endedAt: row.ended_at,
  };
}

function toEvent(row: ActivityEventRow, profile: ProfileSummary | null | undefined): LiveEvent {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: profileName(profile),
    kind: row.kind,
    label: row.label,
    page: row.page,
    xpDelta: row.xp_delta,
    createdAt: row.created_at,
  };
}

export interface AdminLive {
  overview: AdminOverview | null;
  sessions: LiveSession[];
  events: LiveEvent[];
  freshEvents: LiveEvent[];
  connection: LiveConnection;
  error: string | null;
  loading: boolean;
  now: number;
  refresh: () => Promise<void>;
}

export function useAdminLive(enabled: boolean): AdminLive {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [freshEvents, setFreshEvents] = useState<LiveEvent[]>([]);
  const [connection, setConnection] = useState<LiveConnection>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const profiles = useRef(new Map<string, ProfileSummary>());
  const freshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const remember = useCallback((profile: ProfileSummary | null | undefined, userId?: string) => {
    if (!profile) return;
    profiles.current.set(profile.id ?? userId ?? "", profile);
  }, []);

  const profileFor = useCallback(async (userId: string) => {
    const known = profiles.current.get(userId);
    if (known) return known;
    const profile = await getProfileSummary(userId);
    if (profile) profiles.current.set(userId, profile);
    return profile;
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [overviewData, sessionRows, eventRows] = await Promise.all([adminOverview(), listLiveSessions(), listActivityEvents(EVENT_LIMIT)]);
      if (!mounted.current) return;
      for (const row of [...sessionRows, ...eventRows]) remember(row.profile, row.user_id);
      setOverview(overviewData);
      setSessions(sessionRows.map((row) => toSession(row, row.profile)));
      setEvents(eventRows.map((row) => toEvent(row, row.profile)));
      setConnection("live");
      setNow(Date.now());
    } catch (cause) {
      if (!mounted.current) return;
      setError(toAppError(cause, "Impossible de charger la supervision.").message);
      setConnection("offline");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [enabled, remember]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (freshTimer.current) clearTimeout(freshTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    void refresh();
    let unsubscribeSessions: (() => void) | undefined;
    let unsubscribeEvents: (() => void) | undefined;
    try {
      unsubscribeSessions = subscribeToLearnerSessions((row) => {
        void profileFor(row.user_id).then((profile) => {
          if (!mounted.current) return;
          setSessions((current) => [toSession(row, profile), ...current.filter((session) => session.userId !== row.user_id)]);
          setNow(Date.now());
        });
      }, (userId) => setSessions((current) => current.filter((session) => session.userId !== userId)));
      unsubscribeEvents = subscribeToActivityEvents((row) => {
        void profileFor(row.user_id).then((profile) => {
          if (!mounted.current) return;
          const event = toEvent(row, profile);
          setEvents((current) => current.some((item) => item.id === event.id) ? current : [event, ...current].slice(0, EVENT_LIMIT));
          setFreshEvents((current) => [event, ...current].slice(0, 3));
          if (freshTimer.current) clearTimeout(freshTimer.current);
          freshTimer.current = setTimeout(() => { if (mounted.current) setFreshEvents([]); }, FRESH_MS);
          void adminOverview().then((data) => { if (mounted.current) setOverview(data); }).catch(() => undefined);
        });
      });
      setConnection("live");
    } catch {
      setConnection("offline");
    }
    const clock = window.setInterval(() => setNow(Date.now()), 15_000);
    const poll = window.setInterval(() => { void adminOverview().then((data) => mounted.current && setOverview(data)).catch(() => undefined); }, 60_000);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(poll);
      unsubscribeSessions?.();
      unsubscribeEvents?.();
    };
  }, [enabled, refresh, profileFor]);

  return useMemo(() => ({ overview, sessions, events, freshEvents, connection, error, loading, now, refresh }), [overview, sessions, events, freshEvents, connection, error, loading, now, refresh]);
}