// Shapes returned by the CyberBits SQL functions (supabase/migrations/20261004000000_cyberbits.sql).
import type { SkillLevel, LabCategory, LabFormat } from "@/types/api";

/** Why a movement exists. Rewards are derived from real progress, purchases come from unlock_course/unlock_lab. */
export type CbReason =
  | "lesson_completed" | "quiz_passed" | "quiz_perfect" | "module_completed" | "course_completed" | "challenge_completed"
  | "daily_activity" | "lab_completed" | "course_unlock" | "lab_unlock" | "admin_adjustment";

export type CbSource = "activity" | "backfill" | "purchase" | "admin";
export type CbUnlockSource = "purchase" | "grandfathered" | "admin";
export type CbItemKind = "course" | "lab";

export interface CbSettings {
  /** false: no reward is paid (they are caught up on resume). */
  rewards_enabled: boolean;
  /** false: the shop is closed. */
  purchases_enabled: boolean;
  /** false: free mode, every course and lab is open without CyberBits. */
  gating_enabled: boolean;
  paused_reason: string | null;
}

export interface CbPrerequisite { id: string; slug: string; title: string; completed: boolean }

export interface CbCatalogCourse {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  level: SkillLevel;
  category: string;
  icon: string;
  estimated_duration: number;
  price: number;
  /** true when an admin set a price on this course instead of the level default. */
  custom_price: boolean;
  unlocked: boolean;
  unlock_source: CbUnlockSource | null;
  enrolled: boolean;
  completed: boolean;
  prerequisite: CbPrerequisite | null;
}

export interface CbCatalogLab {
  id: string;
  slug: string;
  title: string;
  difficulty: SkillLevel;
  category: LabCategory;
  format: LabFormat;
  is_assessment: boolean;
  estimated_minutes: number;
  course_id: string | null;
  course_slug: string | null;
  price: number;
  custom_price: boolean;
  unlocked: boolean;
  unlock_source: CbUnlockSource | null;
  completed: boolean;
}

export interface CbCatalog {
  balance: number;
  settings: CbSettings;
  courses: CbCatalogCourse[];
  labs: CbCatalogLab[];
}

export interface CbWallet {
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  settings: CbSettings;
  unlocked_courses: number;
  unlocked_labs: number;
}

export interface CbTransaction {
  id: number;
  amount: number;
  reason: CbReason;
  reference_type: string | null;
  reference_id: string | null;
  label: string;
  source: CbSource;
  created_at: string;
  /** Balance right after this movement. */
  balance_after: number;
}

/** What one learning action just paid, carried by every reward summary. */
export interface CbReward {
  gained: number;
  balance: number;
  items: { reason: CbReason; amount: number; label: string }[];
}

export interface CbUnlockResult {
  kind: CbItemKind;
  id: string;
  unlocked: boolean;
  already_unlocked: boolean;
  price_paid: number;
  balance: number;
}

export interface CbRule {
  key: string;
  kind: "reward" | "price";
  label: string;
  description: string;
  amount: number;
  is_active: boolean;
  position: number;
}

/** What a learner can do with one course or lab, computed from the catalogue entry and the current balance. */
export interface CbAccess {
  price: number;
  /** Nothing to buy: free by level or by an admin price of 0, or the free mode is on. */
  free: boolean;
  unlocked: boolean;
  source: CbUnlockSource | null;
  /** CyberBits still missing to afford the price (0 when affordable). */
  missing: number;
  /** A prerequisite course that is not completed yet. */
  blockedBy: CbPrerequisite | null;
  /** Locked, affordable, shop open and prerequisite met. */
  canBuy: boolean;
}

// ─── Administration ──────────────────────────────────────────────────────────

export interface AdminCbOverview {
  settings: CbSettings & { updated_at: string; updated_by: string | null };
  circulation: {
    in_circulation: number;
    wallets: number;
    wallets_with_balance: number;
    earned_total: number;
    spent_total: number;
    adjusted_total: number;
  };
  last_7d: { earned: number; spent: number; earners: number; spenders: number };
  by_reason: { reason: CbReason; count: number; amount: number }[];
  daily: { date: string; earned: number; spent: number }[];
  top_earners_24h: { user_id: string; display_name: string; username: string; earned: number; balance: number }[];
  top_unlocks: { kind: CbItemKind; id: string; title: string; count: number; total: number }[];
  unlocks: { courses: number; labs: number };
  /** null until somebody has earned and then spent. */
  avg_hours_to_first_spend: number | null;
  rules: CbRule[];
}

export interface AdminCbWallet {
  user_id: string;
  display_name: string;
  username: string;
  email: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  last_movement_at: string | null;
}

export interface AdminCbTransaction {
  id: number;
  user_id: string;
  display_name: string;
  username: string;
  amount: number;
  reason: CbReason;
  label: string;
  source: CbSource;
  created_at: string;
}
