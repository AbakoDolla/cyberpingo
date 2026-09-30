import type { Tables } from "@/types/database.types";
import type { LevelInfo } from "@/types/api";

type Level = Pick<Tables<"levels">, "level" | "required_xp" | "title">;

/** Client mirror of private.level_info(): same thresholds (public.levels), same rounding. */
export function computeLevelInfo(xp: number, levels: Level[]): LevelInfo {
  const safeXp = Math.max(0, xp);
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  const current = [...sorted].reverse().find((item) => item.required_xp <= safeXp) ?? sorted[0] ?? { level: 1, required_xp: 0, title: "Recrue" };
  const next = sorted.find((item) => item.required_xp > safeXp) ?? null;
  return {
    xp,
    level: current.level,
    title: current.title,
    current_level_xp: current.required_xp,
    next_level: next?.level ?? null,
    next_level_xp: next?.required_xp ?? null,
    next_title: next?.title ?? null,
    progress_percentage: next ? Math.floor((100 * (xp - current.required_xp)) / (next.required_xp - current.required_xp)) : 100,
  };
}

/** Calendar date (YYYY-MM-DD) in a given IANA timezone. */
export function dateInZone(date: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Mirror of private.effective_streak(): a streak survives until the end of the day after the last activity. */
export function effectiveStreak(currentStreak: number, lastActivityDate: string | null, timeZone: string, now = new Date()) {
  if (!lastActivityDate) return 0;
  const yesterday = dateInZone(new Date(now.getTime() - 86_400_000), timeZone);
  return lastActivityDate >= yesterday ? currentStreak : 0;
}
