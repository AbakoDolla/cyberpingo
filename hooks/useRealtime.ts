"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/learner-mapping";
import type { ActivityEventRow, AdminOverview, LearnerSessionRow } from "@/types/database";
import type { LiveConnection, LiveEvent, LiveSession } from "@/types/realtime";

interface ProfileSummary { display_name: string; xp: number; role: "learner" | "admin" }
type EmbeddedProfile = ProfileSummary | ProfileSummary[] | null;
type SessionWithProfile = LearnerSessionRow & { profiles: EmbeddedProfile };
type EventWithProfile = ActivityEventRow & { profiles: EmbeddedProfile };

const EVENT_LIMIT = 100;
const FRESH_MS = 4500;

function embedded(profile: EmbeddedProfile): ProfileSummary | null {
  return Array.isArray(profile) ? profile[0] ?? null : profile;
}

function toSession(row: LearnerSessionRow, profile: ProfileSummary | null | undefined): LiveSession {
  return {
    userId: row.user_id,
    displayName: profile?.display_name ?? "Apprenant",
    xp: profile?.xp ?? 0,
    role: profile?.role ?? "learner",
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
    displayName: profile?.display_name ?? "Apprenant",
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

/** Admin supervision: initial snapshot + Supabase Realtime changes, with RLS limiting rows to admins. */
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
  const overviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const freshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  const loadOverview = useCallback(async () => {
    const { data, error: rpcError } = await getSupabaseBrowserClient().rpc("admin_overview");
    if (!mounted.current) return;
    if (rpcError) throw rpcError;
    setOverview(data as AdminOverview);
  }, []);

  const scheduleOverview = useCallback(() => {
    if (overviewTimer.current) clearTimeout(overviewTimer.current);
    overviewTimer.current = setTimeout(() => { loadOverview().catch(() => undefined); }, 1500);
  }, [loadOverview]);

  const profileFor = useCallback(async (userId: string) => {
    const known = profiles.current.get(userId);
    if (known) return known;
    const { data } = await getSupabaseBrowserClient()
      .from("profiles").select("display_name, xp, role").eq("id", userId).maybeSingle();
    if (data) profiles.current.set(userId, data as ProfileSummary);
    return (data as ProfileSummary | null) ?? null;
  }, []);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    setError(null);
    try {
      const [sessionResult, eventResult] = await Promise.all([
        supabase.from("learner_sessions")
          .select("user_id, current_page, visible, connected_at, last_seen_at, ended_at, profiles(display_name, xp, role)")
          .order("last_seen_at", { ascending: false }).limit(200),
        supabase.from("activity_events")
          .select("id, user_id, kind, entity_id, label, page, xp_delta, created_at, profiles(display_name, xp, role)")
          .order("created_at", { ascending: false }).limit(EVENT_LIMIT),
        loadOverview(),
      ]);
      if (sessionResult.error) throw sessionResult.error;
      if (eventResult.error) throw eventResult.error;
      if (!mounted.current) return;
      const sessionRows = (sessionResult.data ?? []) as unknown as SessionWithProfile[];
      const eventRows = (eventResult.data ?? []) as unknown as EventWithProfile[];
      for (const row of [...sessionRows, ...eventRows]) {
        const profile = embedded(row.profiles);
        if (profile) profiles.current.set(row.user_id, profile);
      }
      setSessions(sessionRows.map((row) => toSession(row, embedded(row.profiles))));
      setEvents(eventRows.map((row) => toEvent(row, embedded(row.profiles))));
      setNow(Date.now());
    } catch (cause) {
      if (mounted.current) setError(friendlyError(cause, "Impossible de charger la supervision."));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [loadOverview]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (overviewTimer.current) clearTimeout(overviewTimer.current);
      if (freshTimer.current) clearTimeout(freshTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const supabase = getSupabaseBrowserClient();
    let channel: RealtimeChannel | null = null;
    void refresh();

    channel = supabase.channel("admin-supervision")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_events" }, (payload) => {
        const row = payload.new as ActivityEventRow;
        void profileFor(row.user_id).then((profile) => {
          if (!mounted.current) return;
          if (profile && row.xp_delta) {
            const updated = { ...profile, xp: profile.xp + row.xp_delta };
            profiles.current.set(row.user_id, updated);
            setSessions((current) => current.map((session) => session.userId === row.user_id ? { ...session, xp: updated.xp } : session));
          }
          const event = toEvent(row, profile);
          setEvents((current) => current.some((item) => item.id === event.id) ? current : [event, ...current].slice(0, EVENT_LIMIT));
          setFreshEvents((current) => [event, ...current].slice(0, 3));
          if (freshTimer.current) clearTimeout(freshTimer.current);
          freshTimer.current = setTimeout(() => { if (mounted.current) setFreshEvents([]); }, FRESH_MS);
        });
        scheduleOverview();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "learner_sessions" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const old = payload.old as Partial<LearnerSessionRow>;
          setSessions((current) => current.filter((session) => session.userId !== old.user_id));
          return;
        }
        const row = payload.new as LearnerSessionRow;
        void profileFor(row.user_id).then((profile) => {
          if (!mounted.current) return;
          const next = toSession(row, profile);
          setSessions((current) => [next, ...current.filter((session) => session.userId !== row.user_id)]);
          setNow(Date.now());
        });
        if (payload.eventType === "INSERT") scheduleOverview();
      })
      .subscribe((status) => {
        if (!mounted.current) return;
        if (status === "SUBSCRIBED") setConnection("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConnection("offline");
      });

    const clock = window.setInterval(() => setNow(Date.now()), 15_000);
    const overviewPoll = window.setInterval(() => { loadOverview().catch(() => undefined); }, 60_000);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(overviewPoll);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enabled, refresh, profileFor, scheduleOverview, loadOverview]);

  return { overview, sessions, events, freshEvents, connection, error, loading, now, refresh };
}
