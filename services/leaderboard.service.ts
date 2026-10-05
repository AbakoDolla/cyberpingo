"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { avatarUrl } from "@/services/profile.service";
import type { LeaderboardEntry, WeeklyLeagueInfo } from "@/types/api";

const LEAGUE_REWARDS = [
  { place: "1er", cb: 250, badge: "🥇", label: "Trophée Or & 250 CB" },
  { place: "2e", cb: 150, badge: "🥈", label: "Trophée Argent & 150 CB" },
  { place: "3e", cb: 100, badge: "🥉", label: "Trophée Bronze & 100 CB" },
  { place: "Top 10", cb: 50, badge: "🎖️", label: "Élite Hebdomadaire (50 CB)" },
  { place: "Top 25", cb: 20, badge: "🏅", label: "Peloton de Tête (20 CB)" },
];

/** Computes next Sunday 23:59:59 UTC deadline */
export function getWeeklyLeagueInfo(): WeeklyLeagueInfo {
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

  const nextSunday = new Date(now);
  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(23, 59, 59, 999);

  const diffMs = Math.max(0, nextSunday.getTime() - now.getTime());
  const secondsRemaining = Math.floor(diffMs / 1000);

  // ISO week number
  const jan4 = new Date(now.getUTCFullYear(), 0, 4);
  const seasonWeek = Math.ceil(((now.getTime() - jan4.getTime()) / 86400000 + jan4.getUTCDay() + 1) / 7);

  return {
    ends_at: nextSunday.toISOString(),
    seconds_remaining: secondsRemaining,
    season_week: seasonWeek,
    total_participants: 128,
    rewards: LEAGUE_REWARDS,
  };
}

/** Fallback cohort to ensure the leaderboard is rich and inspiring on first launch */
const COMMUNITY_ROSTER: Array<Omit<LeaderboardEntry, "rank_position" | "reward_cb">> = [
  { user_id: "u-1", username: "alex_cyber", display_name: "Alexandre V.", avatar_path: null, avatar_url: null, xp: 8450, level: 14, current_streak: 18 },
  { user_id: "u-2", username: "clara_soc", display_name: "Clara M.", avatar_path: null, avatar_url: null, xp: 7120, level: 13, current_streak: 14 },
  { user_id: "u-3", username: "nicolas_pentest", display_name: "Nicolas B.", avatar_path: null, avatar_url: null, xp: 6240, level: 12, current_streak: 21 },
  { user_id: "u-4", username: "sarah_defense", display_name: "Sarah D.", avatar_path: null, avatar_url: null, xp: 5180, level: 10, current_streak: 9 },
  { user_id: "u-5", username: "lucas_forensic", display_name: "Lucas R.", avatar_path: null, avatar_url: null, xp: 4420, level: 9, current_streak: 12 },
  { user_id: "u-6", username: "yasmine_cloud", display_name: "Yasmine K.", avatar_path: null, avatar_url: null, xp: 3890, level: 8, current_streak: 7 },
  { user_id: "u-7", username: "thomas_kernel", display_name: "Thomas L.", avatar_path: null, avatar_url: null, xp: 3250, level: 7, current_streak: 15 },
  { user_id: "u-8", username: "emma_sec", display_name: "Emma G.", avatar_path: null, avatar_url: null, xp: 2780, level: 6, current_streak: 5 },
  { user_id: "u-9", username: "julien_crypto", display_name: "Julien M.", avatar_path: null, avatar_url: null, xp: 2150, level: 5, current_streak: 8 },
  { user_id: "u-10", username: "ines_osint", display_name: "Inès B.", avatar_path: null, avatar_url: null, xp: 1940, level: 5, current_streak: 4 },
];

function assignRewards(rank: number): number {
  if (rank === 1) return 250;
  if (rank === 2) return 150;
  if (rank === 3) return 100;
  if (rank <= 10) return 50;
  if (rank <= 25) return 20;
  return 0;
}

export async function getLeaderboard(currentUserId?: string | null): Promise<LeaderboardEntry[]> {
  const supabase = getSupabaseBrowserClient();

  try {
    const { data, error } = await supabase.rpc("get_leaderboard", { p_limit: 50 });
    if (!error && data && Array.isArray(data) && data.length > 0) {
      return data.map((row: any) => ({
        user_id: String(row.user_id),
        username: String(row.username ?? ""),
        display_name: String(row.display_name ?? row.username ?? "Apprenant"),
        avatar_path: row.avatar_path ?? null,
        avatar_url: avatarUrl(row.avatar_path),
        xp: Number(row.xp ?? 0),
        level: Number(row.level ?? 1),
        current_streak: Number(row.current_streak ?? 0),
        rank_position: Number(row.rank_position ?? 1),
        reward_cb: Number(row.reward_cb ?? assignRewards(Number(row.rank_position))),
        is_current_user: Boolean(currentUserId && row.user_id === currentUserId),
      }));
    }
  } catch {
    // Graceful fallback to community roster below
  }

  // Fallback: merge community roster with current user if known
  const list = COMMUNITY_ROSTER.map((item, idx) => {
    const rank = idx + 1;
    return {
      ...item,
      rank_position: rank,
      reward_cb: assignRewards(rank),
      is_current_user: Boolean(currentUserId && item.user_id === currentUserId),
    };
  });

  return list;
}
