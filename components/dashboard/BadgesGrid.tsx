"use client";

import { useState } from "react";
import { Badge as BadgeType } from "@/types";
import { cn } from "@/lib/utils";
import {
  IconAward, IconFlame, IconShield, IconBrain, IconNetwork,
  IconTrophy, IconStar,
} from "@/components/ui/Icon";

type IconKey = string;
type IconComp = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const badgeIconMap: Record<IconKey, IconComp> = {
  award:   IconAward,
  flame:   IconFlame,
  shield:  IconShield,
  brain:   IconBrain,
  network: IconNetwork,
  trophy:  IconTrophy,
  star:    IconStar,
};

function BadgeCard({ badge }: { badge: BadgeType }) {
  const [hovered, setHovered] = useState(false);
  const Icon = badgeIconMap[badge.icon] ?? IconStar;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={cn(
          "aspect-square rounded-xl flex flex-col items-center justify-center gap-2 border transition-all duration-200 cursor-default p-2",
          badge.earned
            ? "border-neon-purple/40 bg-neon-purple/10 hover:bg-neon-purple/20 hover:border-neon-purple/60"
            : "border-white/5 bg-white/[0.02] opacity-35"
        )}
      >
        <Icon
          size={22}
          strokeWidth={1.6}
          className={badge.earned ? "text-neon-purple" : "text-white/30"}
        />
        <span className="text-[10px] leading-tight text-white/70 font-medium text-center">
          {badge.name}
        </span>
      </div>

      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-44 bg-dark-navy border border-white/10 rounded-xl p-3 shadow-soft pointer-events-none animate-fade-in-up">
          <p className="text-xs font-semibold text-white">{badge.name}</p>
          <p className="text-[11px] text-white/50 mt-1">{badge.description}</p>
          {badge.earned ? (
            <p className="text-[10px] text-cyber-green mt-1.5">
              ✓ Obtenu{badge.earnedAt ? ` le ${badge.earnedAt}` : ""}
            </p>
          ) : (
            <div className="flex items-center gap-1 mt-1.5">
              <div className="w-3 h-3 rounded border border-white/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white/20 rounded-sm" />
              </div>
              <p className="text-[10px] text-white/30">Non encore débloqué</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BadgesGrid({ badges }: { badges: BadgeType[] }) {
  const earned = badges.filter((b) => b.earned).length;

  return (
    <div className="bg-dark-navy border border-white/5 rounded-xl2 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg">Badges</h3>
        <span className="text-sm text-white/40 tabular-nums">{earned} / {badges.length}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {badges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
      {earned === 0 && (
        <p className="text-sm text-white/30 text-center mt-4">
          Termine ta première leçon pour débloquer ton premier badge
        </p>
      )}
    </div>
  );
}
