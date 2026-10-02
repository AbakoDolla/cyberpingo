import type { MascotEvent, MascotLine } from "@/types/api";
import { EVENT_PRIORITY } from "@/lib/mascot/events";

/** Two ordinary interventions never follow each other closer than this. */
export const COOLDOWN_MS = 6000;
const IMPORTANT = 7;

export interface SchedulerState {
  /** Priority of the intervention currently on screen, or 0. */
  activePriority: number;
  activeUntil: number;
  lastEnd: number;
}

export const IDLE_STATE: SchedulerState = { activePriority: 0, activeUntil: 0, lastEnd: 0 };

export type Decision = "show" | "replace" | "drop";

/**
 * One voice at a time: a more important event replaces the current one, a lesser one is dropped, and
 * ordinary events respect a cooldown so the mascot never becomes noise.
 */
export function decide(state: SchedulerState, event: MascotEvent, now: number): Decision {
  const priority = EVENT_PRIORITY[event];
  if (now < state.activeUntil) return priority > state.activePriority ? "replace" : "drop";
  if (now - state.lastEnd < COOLDOWN_MS && priority < IMPORTANT) return "drop";
  return "show";
}

/** Picks a line for the event, weighted by priority and avoiding an immediate repeat. */
export function pickLine(lines: readonly MascotLine[], event: MascotEvent, avoidId: string | null, random: () => number = Math.random): MascotLine | null {
  const candidates = lines.filter((line) => line.event === event);
  if (!candidates.length) return null;
  const pool = candidates.length > 1 ? candidates.filter((line) => line.id !== avoidId) : candidates;
  const total = pool.reduce((sum, line) => sum + line.priority, 0);
  let cursor = random() * total;
  for (const line of pool) {
    cursor -= line.priority;
    if (cursor < 0) return line;
  }
  return pool[pool.length - 1];
}

/** Long enough to read the line, never so long that it lingers. */
export function displayDuration(text: string): number {
  return Math.min(9000, Math.max(4500, text.length * 65));
}