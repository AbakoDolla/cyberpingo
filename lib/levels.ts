import type { Tables } from "@/types/database.types";
import type { LevelInfo } from "@/types/api";

export type Level = Pick<Tables<"levels">, "level" | "required_xp" | "title">;

export interface LevelMetadata {
  level: number;
  required_xp: number;
  title_fr: string;
  title_en: string;
  tier: "scout" | "watcher" | "guardian" | "defender" | "hunter" | "architect" | "mythic";
  badge_icon: string;
  accent_color: string;
  description_fr: string;
  description_en: string;
}

export const PLATFORM_LEVELS: LevelMetadata[] = [
  { level: 1, required_xp: 0, title_fr: "Recrue", title_en: "Recruit", tier: "scout", badge_icon: "compass", accent_color: "#10b981", description_fr: "Découverte des premiers protocoles et réflexes de sécurité.", description_en: "First steps discovering security protocols and reflexes." },
  { level: 2, required_xp: 250, title_fr: "Curieux", title_en: "Curious", tier: "scout", badge_icon: "lens", accent_color: "#10b981", description_fr: "Curiosité technique et assimilation des fondamentaux.", description_en: "Technical curiosity and understanding fundamentals." },
  { level: 3, required_xp: 750, title_fr: "Apprenti", title_en: "Apprentice", tier: "watcher", badge_icon: "blade", accent_color: "#06b6d4", description_fr: "Maîtrise des commandes de base et lecture de paquets.", description_en: "Mastering CLI basics and packet inspection." },
  { level: 4, required_xp: 1500, title_fr: "Veilleur", title_en: "Watcher", tier: "watcher", badge_icon: "visor", accent_color: "#06b6d4", description_fr: "Surveillance proactive et identification des anomalies.", description_en: "Proactive surveillance and anomaly detection." },
  { level: 5, required_xp: 2600, title_fr: "Gardien", title_en: "Guardian", tier: "guardian", badge_icon: "bastion", accent_color: "#6366f1", description_fr: "Mise en place de règles de filtrage et défense de périmètre.", description_en: "Firewall rule deployment and perimeter defense." },
  { level: 6, required_xp: 4000, title_fr: "Analyste junior", title_en: "Junior Analyst", tier: "guardian", badge_icon: "scope", accent_color: "#6366f1", description_fr: "Corrélation de premières alertes SOC et analyse d'incidents.", description_en: "First SOC alert correlation and incident triaging." },
  { level: 7, required_xp: 5800, title_fr: "Analyste", title_en: "Analyst", tier: "defender", badge_icon: "core", accent_color: "#a855f7", description_fr: "Expertise en analyse de journaux et investigation réseau.", description_en: "Deep log analysis and network traffic forensics." },
  { level: 8, required_xp: 8000, title_fr: "Défenseur", title_en: "Defender", tier: "defender", badge_icon: "aegis", accent_color: "#a855f7", description_fr: "Résilience globale des architectures face aux attaques.", description_en: "Architecture hardening against modern threats." },
  { level: 9, required_xp: 11000, title_fr: "Chasseur de menaces", title_en: "Threat Hunter", tier: "hunter", badge_icon: "falcon", accent_color: "#f43f5e", description_fr: "Recherche active de vulnérabilités et d'APT dissimulées.", description_en: "Active hunting for stealthy vulnerabilities and APTs." },
  { level: 10, required_xp: 15000, title_fr: "Enquêteur numérique", title_en: "Digital Investigator", tier: "hunter", badge_icon: "chrono", accent_color: "#f43f5e", description_fr: "Rétro-ingénierie et expertise forensic approfondie.", description_en: "Advanced forensics, timeline reconstruction, and reverse-engineering." },
  { level: 11, required_xp: 20000, title_fr: "Spécialiste", title_en: "Specialist", tier: "hunter", badge_icon: "cross", accent_color: "#f43f5e", description_fr: "Maîtrise chirurgicale des vecteurs offensifs et défensifs.", description_en: "Surgical mastery of offensive and defensive vectors." },
  { level: 12, required_xp: 26000, title_fr: "Architecte sécurité", title_en: "Security Architect", tier: "architect", badge_icon: "pillar", accent_color: "#f59e0b", description_fr: "Conception de systèmes Zero-Trust invulnérables.", description_en: "Designing resilient, zero-trust enterprise blueprints." },
  { level: 13, required_xp: 33000, title_fr: "Expert", title_en: "Expert", tier: "architect", badge_icon: "crest", accent_color: "#f59e0b", description_fr: "Référence technique reconnue sur les audits critiques.", description_en: "Authoritative technical reference on mission-critical audits." },
  { level: 14, required_xp: 41000, title_fr: "Mentor", title_en: "Mentor", tier: "architect", badge_icon: "sceptre", accent_color: "#f59e0b", description_fr: "Transmission du savoir et supervision des équipes défensives.", description_en: "Knowledge sharing and supervision of defensive squads." },
  { level: 15, required_xp: 50000, title_fr: "Stratège", title_en: "Strategist", tier: "architect", badge_icon: "crown", accent_color: "#f59e0b", description_fr: "Vision prospective et modélisation avancée de la menace.", description_en: "Forward threat modeling and cyber doctrine orchestration." },
  { level: 16, required_xp: 62000, title_fr: "Sentinelle", title_en: "Sentinel", tier: "mythic", badge_icon: "vigil", accent_color: "#38bdf8", description_fr: "Vigilance sans faille sur les infrastructures souveraines.", description_en: "Flawless vigilance protecting sovereign infrastructure." },
  { level: 17, required_xp: 76000, title_fr: "Maître cyber", title_en: "Cyber Master", tier: "mythic", badge_icon: "halo", accent_color: "#38bdf8", description_fr: "Domination des défis les plus redoutables de la cybersécurité.", description_en: "Dominance over the most formidable cyber challenges." },
  { level: 18, required_xp: 92000, title_fr: "Légende", title_en: "Legend", tier: "mythic", badge_icon: "phoenix", accent_color: "#ec4899", description_fr: "Statut légendaire gravé dans les annales de CyberPingo.", description_en: "Legendary status etched in the CyberPingo chronicles." },
  { level: 19, required_xp: 110000, title_fr: "Gardien d’élite", title_en: "Elite Guardian", tier: "mythic", badge_icon: "sovereign", accent_color: "#ec4899", description_fr: "Bastion ultime de la souveraineté numérique.", description_en: "Ultimate bastion of digital sovereignty." },
  { level: 20, required_xp: 135000, title_fr: "Grand maître", title_en: "Grand Master", tier: "mythic", badge_icon: "nova", accent_color: "#8b5cf6", description_fr: "Sommet absolu du savoir et de la pratique cyber.", description_en: "Pinnacle of cybersecurity excellence, wisdom, and grit." },
];

export function getLevelMetadata(levelNum: number): LevelMetadata {
  return (
    PLATFORM_LEVELS.find((l) => l.level === levelNum) ??
    PLATFORM_LEVELS[PLATFORM_LEVELS.length - 1]
  );
}

export const getPlatformLevel = getLevelMetadata;

export interface TierTheme {
  accent: string;
  labelFr: string;
  labelEn: string;
  toString(): string;
}

export function getTierColor(tier: string): TierTheme {
  const themes: Record<string, { accent: string; labelFr: string; labelEn: string }> = {
    scout: { accent: "#10b981", labelFr: "Éclaireur", labelEn: "Scout" },
    watcher: { accent: "#06b6d4", labelFr: "Veilleur", labelEn: "Watcher" },
    guardian: { accent: "#6366f1", labelFr: "Gardien", labelEn: "Guardian" },
    defender: { accent: "#a855f7", labelFr: "Défenseur", labelEn: "Defender" },
    hunter: { accent: "#f43f5e", labelFr: "Chasseur", labelEn: "Hunter" },
    architect: { accent: "#f59e0b", labelFr: "Architecte", labelEn: "Architect" },
    mythic: { accent: "#ec4899", labelFr: "Mythique", labelEn: "Mythic" },
  };
  const theme = themes[tier] ?? { accent: "#3b82f6", labelFr: "Initié", labelEn: "Initiate" };
  return {
    ...theme,
    toString() { return theme.accent; },
  };
}

export function localizeRankTitle(levelNum: number, lang: "fr" | "en" = "fr"): string {
  const meta = getLevelMetadata(levelNum);
  return lang === "en" ? meta.title_en : meta.title_fr;
}

/** Client mirror of private.level_info(): same thresholds (public.levels), same rounding. */
export function computeLevelInfo(xp: number, levels: Level[] = []): LevelInfo {
  const safeXp = Math.max(0, xp);
  const activeLevels = levels.length > 0 ? levels : PLATFORM_LEVELS.map(l => ({ level: l.level, required_xp: l.required_xp, title: l.title_fr }));
  const sorted = [...activeLevels].sort((a, b) => a.level - b.level);
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
