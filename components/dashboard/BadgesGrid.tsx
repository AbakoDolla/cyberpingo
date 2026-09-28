"use client";

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
  const Icon = badgeIconMap[badge.icon] ?? IconStar;

  return (
    <details className="badge-detail">
      <summary
        className={cn(
          "min-h-32 rounded-xl flex flex-col items-center justify-center gap-2 border transition-colors duration-200 cursor-pointer p-3 text-center",
          badge.earned
            ? "border-neon-purple/40 bg-neon-purple/10 hover:bg-neon-purple/20 hover:border-neon-purple/60"
            : "border-slate-600 bg-white/[0.02]"
        )}
      >
        <Icon
          size={22}
          strokeWidth={1.6}
          className={badge.earned ? "text-purple-300" : "text-slate-400"}
        />
        <span className="text-xs leading-snug text-slate-200 font-medium">
          {badge.name}
        </span>
        <span className={badge.earned ? "text-xs text-cyber-green" : "text-xs text-slate-300"}>{badge.earned ? "Obtenu" : "À débloquer"}</span>
      </summary>
      <div className="pt-3 text-xs text-slate-300 leading-relaxed">
        <p>{badge.description}</p>
        {badge.earnedAt && <p className="mt-2">Obtenu le {badge.earnedAt}</p>}
      </div>
    </details>
  );
}

export default function BadgesGrid({ badges }: { badges: BadgeType[] }) {
  const earned = badges.filter((b) => b.earned).length;

  return (
    <div className="bg-dark-navy border border-white/5 rounded-xl2 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg">Badges</h3>
        <span className="text-sm text-slate-300 tabular-nums">{earned} / {badges.length}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {badges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
      {earned === 0 && (
        <p className="text-sm text-slate-300 text-center mt-4">
          Termine ta première leçon pour débloquer ton premier badge
        </p>
      )}
    </div>
  );
}
