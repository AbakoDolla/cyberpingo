import type { CSSProperties } from "react";
import { resolveSlugIcon } from "@/components/ui/SlugIcon";
import { IconLock } from "@/components/ui/Icon";
import { useArtIdPrefix, type MedalTier } from "@/components/art/shared";
import { cn } from "@/lib/utils";

interface BadgeMedalProps {
  icon: string | null | undefined;
  earned: boolean;
  size?: number;
  tier: MedalTier;
}

const TIER_STYLES: Record<MedalTier, { rimStart: string; rimEnd: string; core: string; glow: string; glyph: string }> = {
  bronze: { rimStart: "#f3c096", rimEnd: "#8f5433", core: "#2f180d", glow: "#ffb86b", glyph: "#fff2e4" },
  silver: { rimStart: "#eff6ff", rimEnd: "#7d97b8", core: "#13243d", glow: "#9ad7ff", glyph: "#f5fbff" },
  gold: { rimStart: "#ffe8a8", rimEnd: "#b67a00", core: "#30210a", glow: "#ffd56e", glyph: "#fff8e3" },
  legend: { rimStart: "#f6edff", rimEnd: "#7b47ff", core: "#1c1232", glow: "#9a64ff", glyph: "#f8f4ff" },
};

export default function BadgeMedal({ icon, earned, size = 72, tier }: BadgeMedalProps) {
  const Icon = resolveSlugIcon(icon);
  const prefix = useArtIdPrefix("cp-medal");
  const colors = TIER_STYLES[tier];
  const outerId = `${prefix}-outer`;
  const innerId = `${prefix}-inner`;
  const style = {
    "--badge-size": `${size}px`,
    "--badge-glow": colors.glow,
    "--badge-glyph": colors.glyph,
  } as CSSProperties;

  return (
    <span className={cn("cp-badge-medal", `is-${tier}`, earned ? "is-earned" : "is-locked")} style={style} aria-hidden="true">
      {earned && <span className="cp-badge-medal__shine" />}
      <svg className="cp-badge-medal__svg" viewBox="0 0 112 112" focusable="false" aria-hidden="true">
        <defs>
          <linearGradient id={outerId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors.rimStart} />
            <stop offset="100%" stopColor={colors.rimEnd} />
          </linearGradient>
          <linearGradient id={innerId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.core} />
            <stop offset="100%" stopColor="#060d1d" />
          </linearGradient>
        </defs>
        <path d="M56 8L92 28V70L56 104L20 70V28L56 8Z" fill={`url(#${outerId})`} />
        <path d="M56 18L82 33V64L56 88L30 64V33L56 18Z" fill={`url(#${innerId})`} stroke={colors.rimStart} strokeOpacity="0.28" />
        <path d="M56 14L86 31V67L56 95L26 67V31L56 14Z" fill="none" stroke="#fff" strokeOpacity="0.2" />
      </svg>
      <span className="cp-badge-medal__glyph">
        <Icon size={Math.round(size * 0.32)} strokeWidth={1.8} />
      </span>
      {!earned && (
        <span className="cp-badge-medal__lock">
          <IconLock size={Math.round(size * 0.23)} strokeWidth={2} />
        </span>
      )}
    </span>
  );
}
