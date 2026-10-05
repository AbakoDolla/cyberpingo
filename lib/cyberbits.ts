// Pure helpers behind the CyberBits screens: labels, number formats and the access state of a course or a lab.
import { formatNumber } from "@/lib/format";
import type {
  CbAccess, CbCatalog, CbCatalogCourse, CbCatalogLab, CbPrerequisite, CbReason, CbSettings, CbUnlockSource,
} from "@/types/cyberbits";

export const CB_REASON_LABELS: Record<CbReason, string> = {
  lesson_completed: "Leçon terminée",
  quiz_passed: "Quiz réussi",
  quiz_perfect: "Quiz parfait",
  module_completed: "Module terminé",
  course_completed: "Parcours terminé",
  challenge_completed: "Défi réussi",
  daily_activity: "Première activité du jour",
  lab_completed: "Lab réussi",
  course_unlock: "Parcours débloqué",
  lab_unlock: "Lab débloqué",
  admin_adjustment: "Ajustement de l’équipe",
};

export const CB_SOURCE_LABELS = { activity: "Apprentissage", backfill: "Rattrapage", purchase: "Boutique", admin: "Équipe" } as const;

/** Used until the catalogue is loaded, and when it cannot be loaded: the server still enforces the real rules. */
export const DEFAULT_CB_SETTINGS: CbSettings = { rewards_enabled: true, purchases_enabled: true, gating_enabled: true, paused_reason: null };

/** 1 240 CB */
export const formatCb = (amount: number) => `${formatNumber(amount)} CB`;

/** +15 CB or −120 CB, with a real minus sign. */
export function formatCbSigned(amount: number) {
  const sign = amount > 0 ? "+" : amount < 0 ? "\u2212" : "";
  return `${sign}${formatNumber(Math.abs(amount))} CB`;
}

/** The rewards of one learning action, grouped by reason: "Leçon terminée +10 · Première activité du jour +5". */
export function summarizeReward(items: { reason: CbReason; amount: number }[]) {
  const totals = new Map<CbReason, number>();
  for (const item of items) totals.set(item.reason, (totals.get(item.reason) ?? 0) + item.amount);
  return Array.from(totals, ([reason, amount]) => `${CB_REASON_LABELS[reason] ?? reason} +${formatNumber(amount)}`).join(" · ");
}

export interface PricedItem {
  price: number;
  unlocked: boolean;
  unlock_source: CbUnlockSource | null;
  prerequisite?: CbPrerequisite | null;
}

/** What a learner can do with a course or a lab right now. The database decides; this only explains it. */
export function accessOf(item: PricedItem, balance: number, settings: CbSettings): CbAccess {
  const free = item.price === 0 || !settings.gating_enabled;
  const missing = item.unlocked ? 0 : Math.max(0, item.price - balance);
  const blockedBy = !item.unlocked && item.prerequisite && !item.prerequisite.completed ? item.prerequisite : null;
  return {
    price: item.price,
    free,
    unlocked: item.unlocked,
    source: item.unlock_source,
    missing,
    blockedBy,
    canBuy: !item.unlocked && settings.purchases_enabled && !blockedBy && missing === 0,
  };
}

export type CbNextUnlock =
  | { kind: "course"; item: CbCatalogCourse; missing: number }
  | { kind: "lab"; item: CbCatalogLab; missing: number };

/** The goal to show on the dashboard: the cheapest closed course that is not blocked, else the cheapest closed lab. */
export function nextUnlock(catalog: Pick<CbCatalog, "courses" | "labs">, balance: number): CbNextUnlock | null {
  const closedCourse = catalog.courses
    .filter((course) => !course.unlocked && course.price > 0 && !(course.prerequisite && !course.prerequisite.completed))
    .sort((a, b) => a.price - b.price || a.title.localeCompare(b.title, "fr"))[0];
  if (closedCourse) return { kind: "course", item: closedCourse, missing: Math.max(0, closedCourse.price - balance) };
  const closedLab = catalog.labs
    .filter((lab) => !lab.unlocked && lab.price > 0)
    .sort((a, b) => a.price - b.price || a.title.localeCompare(b.title, "fr"))[0];
  return closedLab ? { kind: "lab", item: closedLab, missing: Math.max(0, closedLab.price - balance) } : null;
}

/** Share of the price already in the wallet, 0 to 100. */
export function affordPercent(price: number, balance: number) {
  if (price <= 0) return 100;
  return Math.max(0, Math.min(100, Math.floor((balance / price) * 100)));
}
