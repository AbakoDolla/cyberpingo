import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MedalTier = "bronze" | "silver" | "gold" | "legend";

export interface ArtPalette {
  base: string;
  base2: string;
  surface: string;
  surfaceAlt: string;
  accent: string;
  accentSoft: string;
  accentAlt: string;
  glow: string;
  glowAlt: string;
  line: string;
  grid: string;
  hex: string;
  highlight: string;
  warm: string;
}

export interface ArtIds {
  background: string;
  grid: string;
  hex: string;
  glow: string;
  glowAlt: string;
  panel: string;
  scan: string;
}

const DEFAULT_PALETTE: ArtPalette = {
  base: "#041225",
  base2: "#0a1e3a",
  surface: "#0f2340",
  surfaceAlt: "#132b4e",
  accent: "#00d5ff",
  accentSoft: "#7cecff",
  accentAlt: "#9a64ff",
  glow: "#3efa95",
  glowAlt: "#00d5ff",
  line: "#7cb6ff",
  grid: "#18365f",
  hex: "#20416e",
  highlight: "#dff8ff",
  warm: "#ff6b7d",
};

export function createPalette(overrides: Partial<ArtPalette>): ArtPalette {
  return { ...DEFAULT_PALETTE, ...overrides };
}

export function normalizeArtKey(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function hashArtKey(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function badgeTierFromXp(xp: number): MedalTier {
  if (xp <= 10) return "bronze";
  if (xp <= 25) return "silver";
  if (xp <= 50) return "gold";
  return "legend";
}

export function useArtIdPrefix(prefix: string) {
  const id = useId();
  return `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export function pointString(points: Array<[number, number]>) {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

export function sharedArtIds(prefix: string): ArtIds {
  return {
    background: `${prefix}-background`,
    grid: `${prefix}-grid`,
    hex: `${prefix}-hex`,
    glow: `${prefix}-glow`,
    glowAlt: `${prefix}-glow-alt`,
    panel: `${prefix}-panel`,
    scan: `${prefix}-scan`,
  };
}

interface ArtCanvasProps {
  className?: string;
  palette: ArtPalette;
  viewBox?: string;
  preserveAspectRatio?: string;
  children: (ids: ArtIds, palette: ArtPalette) => ReactNode;
}

export function ArtCanvas({
  className,
  palette,
  viewBox = "0 0 480 270",
  preserveAspectRatio = "xMidYMid slice",
  children,
}: ArtCanvasProps) {
  const prefix = useArtIdPrefix("cp-art");
  const ids = sharedArtIds(prefix);

  return (
    <div className={cn("cp-art", className)} aria-hidden="true">
      <svg
        className="cp-art__svg"
        viewBox={viewBox}
        preserveAspectRatio={preserveAspectRatio}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={ids.background} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette.base} />
            <stop offset="65%" stopColor={palette.base2} />
            <stop offset="100%" stopColor="#020817" />
          </linearGradient>
          <pattern id={ids.grid} width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0H0V28" fill="none" stroke={palette.grid} strokeOpacity="0.78" strokeWidth="1" />
            <circle cx="0.5" cy="0.5" r="1" fill={palette.highlight} fillOpacity="0.18" />
          </pattern>
          <pattern id={ids.hex} width="54" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M13 2H40L52 24L40 46H13L1 24Z"
              fill="none"
              stroke={palette.hex}
              strokeOpacity="0.58"
              strokeWidth="1"
            />
          </pattern>
          <radialGradient id={ids.glow} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.glow} stopOpacity="0.38" />
            <stop offset="55%" stopColor={palette.accent} stopOpacity="0.14" />
            <stop offset="100%" stopColor={palette.accent} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={ids.glowAlt} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.accentAlt} stopOpacity="0.34" />
            <stop offset="58%" stopColor={palette.glowAlt} stopOpacity="0.16" />
            <stop offset="100%" stopColor={palette.glowAlt} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={ids.panel} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette.surface} stopOpacity="0.96" />
            <stop offset="100%" stopColor={palette.surfaceAlt} stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id={ids.scan} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette.accent} stopOpacity="0" />
            <stop offset="48%" stopColor={palette.highlight} stopOpacity="0.68" />
            <stop offset="100%" stopColor={palette.accentAlt} stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill={`url(#${ids.background})`} />
        <rect width="100%" height="100%" fill={`url(#${ids.grid})`} opacity="0.28" />
        <rect width="100%" height="100%" fill={`url(#${ids.hex})`} opacity="0.14" />
        <ellipse className="cp-art__float" cx="362" cy="52" rx="122" ry="88" fill={`url(#${ids.glow})`} />
        <ellipse className="cp-art__float cp-art__float--alt" cx="118" cy="228" rx="154" ry="82" fill={`url(#${ids.glowAlt})`} />
        <path d="M-30 216C84 182 160 192 255 214C334 232 398 230 520 182" fill="none" stroke={palette.line} strokeOpacity="0.16" strokeWidth="2" />
        <path d="M-12 240C90 204 173 210 266 230C345 247 411 243 510 208" fill="none" stroke={palette.highlight} strokeOpacity="0.09" strokeWidth="1.2" />
        {children(ids, palette)}
      </svg>
    </div>
  );
}
