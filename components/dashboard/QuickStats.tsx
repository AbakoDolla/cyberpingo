"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { useUser } from "@/context/UserContext";
import { courses } from "@/data/courses";
import { challenges } from "@/data/challenges";
import { lessons } from "@/data/lessons";
import { IconLesson, IconTarget, IconAward, IconBolt } from "@/components/ui/Icon";

type IconComp = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

interface StatCardProps {
  Icon: IconComp;
  label: string;
  value: string | number;
  sub?: string;
  href: string;
  accent: string;
  borderAccent: string;
}

// memo : ne re-rend que si les props changent
const StatCard = memo(function StatCard({ Icon, label, value, sub, href, accent, borderAccent }: StatCardProps) {
  return (
    <Link
      href={href}
      className={`group bg-dark-navy border ${borderAccent} rounded-xl2 p-5 hover:brightness-110 transition-all hover:-translate-y-0.5 duration-200`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent.replace("text-", "bg-").replace(/\b(cyber-blue|cyber-green|neon-purple|cyber-yellow)\b/, (m) => m + "/15")}`}>
          <Icon size={18} strokeWidth={1.8} className={accent} />
        </div>
        <span className={`text-xs ${accent} opacity-60 group-hover:opacity-100 transition-opacity`}>→</span>
      </div>
      <p className={`font-display font-bold text-3xl mt-4 ${accent} tabular-nums`}>{value}</p>
      <p className="text-sm text-white/60 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </Link>
  );
});

// Constantes calculées une fois au module level (jamais dans le render)
const TOTAL_LESSONS = lessons.length;
const AVAILABLE_CHALLENGES = challenges.filter((c) => c.status !== "verrouille").length;
const UNLOCKED_COURSES = courses.filter((c) => !c.locked);

export default function QuickStats() {
  const { user, getCourseProgress } = useUser();

  // useMemo : recalcule uniquement quand completedLessons, xp ou xpToNextLevel change
  const { completedCourses, xpToNext } = useMemo(() => ({
    completedCourses: UNLOCKED_COURSES.filter((c) => getCourseProgress(c.id) === 100).length,
    xpToNext: user.xpToNextLevel - (user.xp % user.xpToNextLevel),
  }), [getCourseProgress, user.xp, user.xpToNextLevel]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        Icon={IconLesson}
        label="Leçons terminées"
        value={user.completedLessons.length}
        sub={`sur ${TOTAL_LESSONS} disponibles`}
        href="/courses"
        accent="text-cyber-blue"
        borderAccent="border-cyber-blue/15 hover:border-cyber-blue/30"
      />
      <StatCard
        Icon={IconTarget}
        label="Challenges réussis"
        value={user.completedChallenges.length}
        sub={`sur ${AVAILABLE_CHALLENGES} disponibles`}
        href="/challenges"
        accent="text-cyber-green"
        borderAccent="border-cyber-green/15 hover:border-cyber-green/30"
      />
      <StatCard
        Icon={IconAward}
        label="Cours complétés"
        value={completedCourses}
        sub={`sur ${UNLOCKED_COURSES.length} débloqués`}
        href="/courses"
        accent="text-neon-purple"
        borderAccent="border-neon-purple/15 hover:border-neon-purple/30"
      />
      <StatCard
        Icon={IconBolt}
        label="XP vers niv. suivant"
        value={user.xpToNextLevel}
        sub={`encore ${xpToNext} XP`}
        href="/profile"
        accent="text-cyber-yellow"
        borderAccent="border-cyber-yellow/15 hover:border-cyber-yellow/30"
      />
    </div>
  );
}
