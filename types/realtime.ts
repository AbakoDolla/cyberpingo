import type { ActivityKind } from "@/types/database";

export type LearnerStatus = "online" | "idle" | "offline";

export interface LiveSession {
  userId: string;
  displayName: string;
  xp: number;
  role: "learner" | "admin";
  currentPage: string;
  visible: boolean;
  connectedAt: string;
  lastSeenAt: string;
  endedAt: string | null;
}

export interface LiveEvent {
  id: number;
  userId: string;
  displayName: string;
  kind: ActivityKind;
  label: string;
  page: string | null;
  xpDelta: number;
  createdAt: string;
}

export type LiveConnection = "connecting" | "live" | "offline";

/** Online: heartbeat within 2 minutes on a visible tab. Idle: recent but hidden or quiet. */
export const ONLINE_WINDOW_MS = 2 * 60 * 1000;
export const IDLE_WINDOW_MS = 15 * 60 * 1000;

export function sessionStatus(session: Pick<LiveSession, "visible" | "lastSeenAt" | "endedAt">, now: number): LearnerStatus {
  if (session.endedAt) return "offline";
  const age = now - new Date(session.lastSeenAt).getTime();
  if (age <= ONLINE_WINDOW_MS && session.visible) return "online";
  if (age <= IDLE_WINDOW_MS) return "idle";
  return "offline";
}
