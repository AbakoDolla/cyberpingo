import {
  IconActivity, IconAward, IconBolt, IconBrain, IconCertificate, IconCheck, IconClock, IconCourses, IconCrosshair, IconEye,
  IconFlame, IconGlobe, IconLesson, IconLinux, IconLock, IconMap, IconNetwork, IconShield, IconStar, IconTarget, IconTerminal,
  IconTrophy, IconUsers, type IconProps,
} from "@/components/ui/Icon";
import type { JSX } from "react";

type IconComponent = (props: IconProps) => JSX.Element;

// Icons are stored in the database as slugs (check: ^[a-z0-9-]{2,40}$) so content never depends on emoji rendering.
const ICONS: Record<string, IconComponent> = {
  fondamentaux: IconShield,
  reseaux: IconNetwork,
  linux: IconLinux,
  "securite-web": IconGlobe,
  "pentest-intro": IconCrosshair,
  "analyse-logs": IconActivity,
  web: IconGlobe,
  network: IconNetwork,
  shield: IconShield,
  award: IconAward,
  footprints: IconMap,
  "check-circle": IconCheck,
  "book-open": IconLesson,
  flag: IconTarget,
  flame: IconFlame,
  zap: IconBolt,
  "graduation-cap": IconCertificate,
  star: IconStar,
  target: IconTarget,
  clock: IconClock,
  trophy: IconTrophy,
  brain: IconBrain,
  terminal: IconTerminal,
  lock: IconLock,
  eye: IconEye,
  users: IconUsers,
  courses: IconCourses,
};

const ICON_LABELS: Record<string, string> = {
  award: "Médaille", trophy: "Trophée", star: "Étoile", flame: "Flamme", zap: "Éclair", target: "Cible", flag: "Drapeau",
  "check-circle": "Validation", "book-open": "Livre", "graduation-cap": "Diplôme", footprints: "Premiers pas", clock: "Horloge",
  brain: "Cerveau", terminal: "Terminal", shield: "Bouclier", lock: "Cadenas", eye: "Œil", users: "Communauté",
};

export const GAMIFICATION_ICON_OPTIONS = Object.entries(ICON_LABELS).map(([value, label]) => ({ value, label }));

export function resolveSlugIcon(name: string | null | undefined, fallback: IconComponent = IconAward): IconComponent {
  return (name && ICONS[name]) || fallback;
}

export default function SlugIcon({ name, fallback, ...props }: IconProps & { name: string | null | undefined; fallback?: IconComponent }) {
  const Icon = resolveSlugIcon(name, fallback);
  return <Icon {...props} />;
}
