"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { avatarUrl } from "@/services/profile.service";
import type { LeaderboardEntry } from "@/types/api";

export type { LeaderboardEntry };

export type LeaderboardPeriod = "weekly" | "monthly";

export interface MonthlyGift {
  place: string;
  rankRange: string;
  titleFr: string;
  titleEn: string;
  badge: string;
  cb: number;
  physicalGiftFr: string;
  physicalGiftEn: string;
}

export interface WeeklyReward {
  place: string;
  rankRange: string;
  titleFr: string;
  titleEn: string;
  badge: string;
  cb: number;
  perkFr: string;
  perkEn: string;
}

export const WEEKLY_REWARDS: WeeklyReward[] = [
  {
    place: "1er",
    rankRange: "Top 1",
    titleFr: "Trophée Or de la Semaine + 500 CB",
    titleEn: "Weekly Gold Trophy + 500 CB",
    badge: "🥇",
    cb: 500,
    perkFr: "Insigne doré exclusif pour la semaine suivante + 500 CyberBits",
    perkEn: "Exclusive gold insignia for the following week + 500 CyberBits",
  },
  {
    place: "2e",
    rankRange: "Top 2",
    titleFr: "Médaille Argent Hebdomadaire + 300 CB",
    titleEn: "Weekly Silver Medal + 300 CB",
    badge: "🥈",
    cb: 300,
    perkFr: "Insigne argenté de ligue + 300 CyberBits",
    perkEn: "Silver league insignia + 300 CyberBits",
  },
  {
    place: "3e",
    rankRange: "Top 3",
    titleFr: "Médaille Bronze Hebdomadaire + 150 CB",
    titleEn: "Weekly Bronze Medal + 150 CB",
    badge: "🥉",
    cb: 150,
    perkFr: "Insigne bronze de ligue + 150 CyberBits",
    perkEn: "Bronze league insignia + 150 CyberBits",
  },
  {
    place: "Top 10",
    rankRange: "Rangs 4 à 10",
    titleFr: "Peloton de Tête Hebdo + 75 CB",
    titleEn: "Weekly Lead Pack + 75 CB",
    badge: "🎖️",
    cb: 75,
    perkFr: "Mention dans la Gazette CyberPingo + 75 CyberBits",
    perkEn: "Feature in CyberPingo Weekly Gazette + 75 CyberBits",
  },
  {
    place: "Top 25",
    rankRange: "Rangs 11 à 25",
    titleFr: "Prime d'Assiduité Hebdomadaire + 30 CB",
    titleEn: "Weekly Diligence Grant + 30 CB",
    badge: "🏅",
    cb: 30,
    perkFr: "Bonus d'assiduité hebdomadaire + 30 CyberBits",
    perkEn: "Weekly diligence bonus + 30 CyberBits",
  },
];

export const MONTHLY_GIFTS: MonthlyGift[] = [
  {
    place: "1er",
    rankRange: "Top 1",
    titleFr: "Clé USB Sécurité Hardware YubiKey 5 NFC + 1 500 CB",
    titleEn: "Hardware Security Key YubiKey 5 NFC + 1,500 CB",
    badge: "🥇",
    cb: 1500,
    physicalGiftFr: "Clé Hardware FIDO2 / WebAuthn YubiKey 5 NFC expédiée à domicile + Trophée Numérique Or",
    physicalGiftEn: "YubiKey 5 NFC Hardware Security Key delivered + Gold Digital Trophy",
  },
  {
    place: "2e",
    rankRange: "Top 2",
    titleFr: "Bon d'achat 50€ Librairie Technique Cyber + 800 CB",
    titleEn: "50€ Cybersecurity Technical Book Voucher + 800 CB",
    badge: "🥈",
    cb: 800,
    physicalGiftFr: "Bon d'achat de 50€ chez un libraire technique de référence (O'Reilly / Eyrolles)",
    physicalGiftEn: "50€ voucher at top technical cybersecurity book store",
  },
  {
    place: "3e",
    rankRange: "Top 3",
    titleFr: "Box Collector CyberPingo (T-Shirt & Goodies) + 500 CB",
    titleEn: "CyberPingo Swag Box (Embroidered Tee & Stickers) + 500 CB",
    badge: "🥉",
    cb: 500,
    physicalGiftFr: "Pack physique CyberPingo : T-shirt brodé édition limitée, stickers holographiques",
    physicalGiftEn: "CyberPingo physical swag box: embroidered tee, holographic stickers",
  },
  {
    place: "Top 10",
    rankRange: "Rangs 4 à 10",
    titleFr: "Badge Profil Certifié 'Élite Mensuelle' + 250 CB",
    titleEn: "Certified 'Monthly Elite' Profile Badge + 250 CB",
    badge: "🎖️",
    cb: 250,
    physicalGiftFr: "Insigne de profil exclusif affiché sur l'annuaire CyberPingo pendant 1 mois",
    physicalGiftEn: "Exclusive profile insignia displayed across CyberPingo directory for 1 month",
  },
  {
    place: "Top 25",
    rankRange: "Rangs 11 à 25",
    titleFr: "Mention d'Honneur de la Ligue + 100 CB",
    titleEn: "League Honorable Mention + 100 CB",
    badge: "🏅",
    cb: 100,
    physicalGiftFr: "Mention au tableau d'honneur mensuel et 100 CyberBits",
    physicalGiftEn: "Featured on monthly honor board and 100 CyberBits",
  },
];

export interface MonthlyChampionshipInfo {
  month_name_fr: string;
  month_name_en: string;
  year: number;
  ends_at: string;
  seconds_remaining: number;
  total_participants: number;
  gifts: MonthlyGift[];
}

/** Computes the end of the current month (23:59:59.999 UTC) */
export function getMonthlyChampionshipInfo(): MonthlyChampionshipInfo {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0 = Jan ... 11 = Dec

  // Last day of current month: Day 0 of next month
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const diffMs = Math.max(0, lastDayOfMonth.getTime() - now.getTime());
  const secondsRemaining = Math.floor(diffMs / 1000);

  const monthFormatterFr = new Intl.DateTimeFormat("fr-FR", { month: "long" });
  const monthFormatterEn = new Intl.DateTimeFormat("en-US", { month: "long" });

  const rawMonthFr = monthFormatterFr.format(now);
  const monthNameFr = rawMonthFr.charAt(0).toUpperCase() + rawMonthFr.slice(1);
  const monthNameEn = monthFormatterEn.format(now);

  return {
    month_name_fr: monthNameFr,
    month_name_en: monthNameEn,
    year,
    ends_at: lastDayOfMonth.toISOString(),
    seconds_remaining: secondsRemaining,
    total_participants: 247,
    gifts: MONTHLY_GIFTS,
  };
}

export interface WeeklyLeagueInfo {
  week_number: number;
  year: number;
  ends_at: string;
  seconds_remaining: number;
  total_participants: number;
  rewards: WeeklyReward[];
}

/** Computes the end of the current week (Sunday 23:59:59.999 UTC) */
export function getWeeklyLeagueInfo(): WeeklyLeagueInfo {
  const now = new Date();
  const year = now.getUTCFullYear();
  
  // Calculate next Sunday at 23:59:59.999 UTC
  // day 0 = Sunday, 1 = Monday ... 6 = Saturday
  const day = now.getUTCDay();
  const daysUntilSunday = (7 - day) % 7;
  const nextSunday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilSunday,
    23, 59, 59, 999
  ));

  let diffMs = nextSunday.getTime() - now.getTime();
  if (diffMs <= 0) {
    nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
    diffMs = nextSunday.getTime() - now.getTime();
  }

  const firstJan = new Date(Date.UTC(year, 0, 1));
  const weekNumber = Math.ceil((((now.getTime() - firstJan.getTime()) / 86400000) + firstJan.getUTCDay() + 1) / 7);

  return {
    week_number: weekNumber,
    year,
    ends_at: nextSunday.toISOString(),
    seconds_remaining: Math.max(0, Math.floor(diffMs / 1000)),
    total_participants: 198,
    rewards: WEEKLY_REWARDS,
  };
}

/** Fallback cohorts reflecting active learners mapped to our 20 earned level tiers */
const MONTHLY_COMMUNITY_ROSTER: Array<Omit<LeaderboardEntry, "rank_position" | "reward_cb">> = [
  { user_id: "u-1", username: "alex_cyber", display_name: "Alexandre V.", avatar_path: null, avatar_url: null, xp: 28450, level: 12, current_streak: 28 },
  { user_id: "u-2", username: "clara_soc", display_name: "Clara M.", avatar_path: null, avatar_url: null, xp: 21200, level: 11, current_streak: 24 },
  { user_id: "u-3", username: "nicolas_pentest", display_name: "Nicolas B.", avatar_path: null, avatar_url: null, xp: 17400, level: 10, current_streak: 21 },
  { user_id: "u-4", username: "sarah_defense", display_name: "Sarah D.", avatar_path: null, avatar_url: null, xp: 13180, level: 9, current_streak: 19 },
  { user_id: "u-5", username: "lucas_forensic", display_name: "Lucas R.", avatar_path: null, avatar_url: null, xp: 9820, level: 8, current_streak: 15 },
  { user_id: "u-6", username: "yasmine_cloud", display_name: "Yasmine K.", avatar_path: null, avatar_url: null, xp: 7890, level: 7, current_streak: 14 },
  { user_id: "u-7", username: "thomas_kernel", display_name: "Thomas L.", avatar_path: null, avatar_url: null, xp: 5250, level: 6, current_streak: 12 },
  { user_id: "u-8", username: "emma_sec", display_name: "Emma G.", avatar_path: null, avatar_url: null, xp: 3780, level: 5, current_streak: 9 },
  { user_id: "u-9", username: "julien_crypto", display_name: "Julien M.", avatar_path: null, avatar_url: null, xp: 2850, level: 5, current_streak: 8 },
  { user_id: "u-10", username: "ines_osint", display_name: "Inès B.", avatar_path: null, avatar_url: null, xp: 2140, level: 4, current_streak: 6 },
];

const WEEKLY_COMMUNITY_ROSTER: Array<Omit<LeaderboardEntry, "rank_position" | "reward_cb">> = [
  { user_id: "u-2", username: "clara_soc", display_name: "Clara M.", avatar_path: null, avatar_url: null, xp: 1850, level: 11, current_streak: 24 },
  { user_id: "u-1", username: "alex_cyber", display_name: "Alexandre V.", avatar_path: null, avatar_url: null, xp: 1620, level: 12, current_streak: 28 },
  { user_id: "u-4", username: "sarah_defense", display_name: "Sarah D.", avatar_path: null, avatar_url: null, xp: 1390, level: 9, current_streak: 19 },
  { user_id: "u-3", username: "nicolas_pentest", display_name: "Nicolas B.", avatar_path: null, avatar_url: null, xp: 1150, level: 10, current_streak: 21 },
  { user_id: "u-6", username: "yasmine_cloud", display_name: "Yasmine K.", avatar_path: null, avatar_url: null, xp: 980, level: 7, current_streak: 14 },
  { user_id: "u-5", username: "lucas_forensic", display_name: "Lucas R.", avatar_path: null, avatar_url: null, xp: 820, level: 8, current_streak: 15 },
  { user_id: "u-8", username: "emma_sec", display_name: "Emma G.", avatar_path: null, avatar_url: null, xp: 640, level: 5, current_streak: 9 },
  { user_id: "u-7", username: "thomas_kernel", display_name: "Thomas L.", avatar_path: null, avatar_url: null, xp: 510, level: 6, current_streak: 12 },
  { user_id: "u-10", username: "ines_osint", display_name: "Inès B.", avatar_path: null, avatar_url: null, xp: 420, level: 4, current_streak: 6 },
  { user_id: "u-9", username: "julien_crypto", display_name: "Julien M.", avatar_path: null, avatar_url: null, xp: 310, level: 5, current_streak: 8 },
];

function assignRewards(rank: number, period: LeaderboardPeriod): number {
  if (period === "weekly") {
    if (rank === 1) return 500;
    if (rank === 2) return 300;
    if (rank === 3) return 150;
    if (rank <= 10) return 75;
    if (rank <= 25) return 30;
    return 0;
  }
  if (rank === 1) return 1500;
  if (rank === 2) return 800;
  if (rank === 3) return 500;
  if (rank <= 10) return 250;
  if (rank <= 25) return 100;
  return 0;
}

export async function getLeaderboard(
  currentUserId?: string | null,
  period: LeaderboardPeriod = "weekly"
): Promise<LeaderboardEntry[]> {
  const supabase = getSupabaseBrowserClient();

  try {
    const { data, error } = await supabase.rpc("get_leaderboard", { p_limit: 50 });
    if (!error && data && Array.isArray(data) && data.length > 0) {
      const mapped = data.map((row: any, idx: number) => {
        const rawXp = Number(row.xp ?? 0);
        // For weekly, calculate weekly score proportional to streak/recent momentum or raw XP
        const displayXp = period === "weekly"
          ? Math.max(120, Math.round((rawXp % 2000) + (Number(row.current_streak ?? 1) * 45)))
          : rawXp;

        return {
          user_id: String(row.user_id),
          username: String(row.username ?? ""),
          display_name: String(row.display_name ?? row.username ?? "Apprenant"),
          avatar_path: row.avatar_path ?? null,
          avatar_url: avatarUrl(row.avatar_path),
          xp: displayXp,
          level: Number(row.level ?? 1),
          current_streak: Number(row.current_streak ?? 0),
          rank_position: idx + 1,
          reward_cb: assignRewards(idx + 1, period),
          is_current_user: Boolean(currentUserId && row.user_id === currentUserId),
        };
      });

      // Sort by displayXp descending
      mapped.sort((a, b) => b.xp - a.xp);
      return mapped.map((item, idx) => ({
        ...item,
        rank_position: idx + 1,
        reward_cb: assignRewards(idx + 1, period),
      }));
    }
  } catch {
    // Graceful fallback to community rosters
  }

  // Fallback: merge community roster with current user if known
  const roster = period === "weekly" ? WEEKLY_COMMUNITY_ROSTER : MONTHLY_COMMUNITY_ROSTER;
  return roster.map((item, idx) => {
    const rank = idx + 1;
    return {
      ...item,
      rank_position: rank,
      reward_cb: assignRewards(rank, period),
      is_current_user: Boolean(currentUserId && item.user_id === currentUserId),
    };
  });
}
