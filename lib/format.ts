import type { SkillLevel } from "@/types/api";

const numberFormat = new Intl.NumberFormat("fr-FR");
const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const shortDateFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const relativeFormat = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export const LEVEL_LABELS: Record<SkillLevel, string> = { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" };
export const levelLabel = (level: string) => LEVEL_LABELS[level as SkillLevel] ?? level;

export const formatNumber = (value: number) => numberFormat.format(value);
export const formatDate = (value: string | Date) => dateFormat.format(new Date(value));
export const formatShortDate = (value: string | Date) => shortDateFormat.format(new Date(value));
export const formatDateTime = (value: string | Date) => dateTimeFormat.format(new Date(value));

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function formatRelative(value: string | Date, now = new Date()) {
  const seconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [["day", 86_400], ["hour", 3_600], ["minute", 60]];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relativeFormat.format(Math.round(seconds / size), unit);
  }
  return "à l’instant";
}

/** "Bonjour", "Bon après-midi" or "Bonsoir" + first name, computed on the client clock. */
export function greeting(name: string, now = new Date()) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  const hour = now.getHours();
  const hello = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  return first ? `${hello}, ${first}` : hello;
}
