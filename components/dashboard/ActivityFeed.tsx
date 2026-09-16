"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { lessons } from "@/data/lessons";
import { challenges } from "@/data/challenges";
import { cn } from "@/lib/utils";
import { IconLesson, IconShield, IconTrophy, IconStar, IconActivity } from "@/components/ui/Icon";

interface ActivityItem {
  id: string;
  type: "lesson" | "challenge" | "quiz" | "badge";
  label: string;
  xp?: number;
  href?: string;
}

const typeConfig = {
  lesson:    { label: "Leçon",     Icon: IconLesson,  color: "text-cyber-blue",   bg: "bg-cyber-blue/10"   },
  challenge: { label: "Challenge", Icon: IconShield,  color: "text-cyber-green",  bg: "bg-cyber-green/10"  },
  quiz:      { label: "Quiz",      Icon: IconTrophy,  color: "text-neon-purple",  bg: "bg-neon-purple/10"  },
  badge:     { label: "Badge",     Icon: IconStar,    color: "text-cyber-yellow", bg: "bg-cyber-yellow/10" },
} as const;

// Maps O(1) construites une seule fois au module level (hors render)
const lessonsMap = new Map(lessons.map((l) => [l.id, l]));
const challengesMap = new Map(challenges.map((c) => [c.id, c]));

export default function ActivityFeed() {
  const { user } = useUser();

  // Mémoïsé — ne recalcule que si les listes changent
  const items = useMemo<ActivityItem[]>(() => {
    const lessonItems = user.completedLessons.map((id) => {
      const lesson = lessonsMap.get(id);
      if (!lesson) return null;
      return { id: `l-${id}`, type: "lesson" as const, label: lesson.title, xp: lesson.xpReward, href: `/lessons/${id}` };
    }).filter(Boolean) as ActivityItem[];

    const challengeItems = user.completedChallenges.map((id) => {
      const challenge = challengesMap.get(id);
      if (!challenge) return null;
      return { id: `c-${id}`, type: "challenge" as const, label: challenge.title, xp: challenge.xpReward, href: `/challenges/${challenge.slug}` };
    }).filter(Boolean) as ActivityItem[];

    const badgeItems = user.badges
      .filter((b) => b.earned)
      .map((b) => ({ id: `b-${b.id}`, type: "badge" as const, label: b.name }));

    return [...lessonItems, ...challengeItems, ...badgeItems].reverse();
  }, [user.completedLessons, user.completedChallenges, user.badges]);

  return (
    <div className="bg-dark-navy border border-white/5 rounded-xl2 p-6">
      <div className="flex items-center gap-2 mb-4">
        <IconActivity size={16} className="text-white/40" />
        <h3 className="font-display font-semibold text-lg">Activité récente</h3>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
            <IconActivity size={20} className="text-white/30" />
          </div>
          <p className="text-sm text-white/50">Aucune activité pour l&apos;instant.</p>
          <p className="text-xs text-white/30 mt-1">Lance ta première leçon pour commencer !</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((item) => {
            const { Icon, label: typeLabel, color, bg } = typeConfig[item.type];
            const content = (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-colors">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", bg)}>
                  <Icon size={16} strokeWidth={1.8} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className={cn("text-xs", color)}>{typeLabel}</p>
                </div>
                {item.xp && (
                  <span className="text-xs font-medium text-cyber-green shrink-0 tabular-nums">
                    +{item.xp} XP
                  </span>
                )}
              </div>
            );

            return item.href ? (
              <Link key={item.id} href={item.href}>{content}</Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
