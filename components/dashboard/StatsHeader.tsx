"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import ProgressBar from "@/components/ui/ProgressBar";
import { clamp, formatXP } from "@/lib/utils";
import { User } from "@/types";
import { IconFlame } from "@/components/ui/Icon";

/** Anime un nombre de 0 à la valeur cible */
function useCountUp(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    if (from === target) return;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(from + (target - from) * p));
      if (p < 1) requestAnimationFrame(step);
      else prevRef.current = target;
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return display;
}

export default function StatsHeader({ user }: { user: User }) {
  const xpPercent = useMemo(
    () => clamp((user.xp / user.xpToNextLevel) * 100),
    [user.xp, user.xpToNextLevel]
  );
  const overallProgress = useMemo(
    () => user.skills.length > 0
      ? Math.round(user.skills.reduce((s, sk) => s + sk.percent, 0) / user.skills.length)
      : 0,
    [user.skills]
  );

  const animatedXp = useCountUp(user.xp);
  const animatedLevel = user.level;
  const streakColor =
    user.streak >= 7 ? "text-cyber-green" : user.streak >= 3 ? "text-cyber-yellow" : "text-white/70";

  return (
    <div className="bg-dark-navy border border-white/5 rounded-xl2 p-6 flex flex-col md:flex-row md:items-center gap-6 animate-fade-in-up">
      {/* Identité */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative">
          <Avatar name={user.name} size="lg" />
          <span className="absolute -bottom-1 -right-1 bg-neon-purple text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-cyber-black">
            {animatedLevel}
          </span>
        </div>
        <div>
          <p className="font-display font-semibold text-lg leading-tight">{user.name}</p>
          <p className="text-sm text-white/50">Niveau {user.level}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1 grid sm:grid-cols-3 gap-5">
        {/* XP */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <p className="text-xs text-white/50">Expérience</p>
            <p className="text-xs text-white/30">
              {formatXP(user.xp)} / {formatXP(user.xpToNextLevel)} XP
            </p>
          </div>
          <ProgressBar value={xpPercent} tone="blue" height="sm" className="mb-1" />
          <p className="font-display font-semibold text-cyber-blue text-sm">
            {formatXP(animatedXp)} XP
          </p>
        </div>

        {/* Streak */}
        <div className="flex flex-col justify-center">
          <p className="text-xs text-white/50 mb-1">Série en cours</p>
          <p className={`font-display font-bold text-2xl ${streakColor}`}>
            <IconFlame size={20} strokeWidth={1.8} className="inline mr-1 mb-0.5" />
            {user.streak}
            <span className="text-sm font-normal text-white/50 ml-1">jours</span>
          </p>
          {user.streak === 0 && (
            <p className="text-[10px] text-white/30 mt-0.5">Lance ta première leçon !</p>
          )}
          {user.streak > 0 && user.streak < 3 && (
            <p className="text-[10px] text-cyber-yellow mt-0.5">Continue, ça prend forme</p>
          )}
          {user.streak >= 7 && (
            <p className="text-[10px] text-cyber-green mt-0.5">Incroyable — garde le rythme !</p>
          )}
        </div>

        {/* Progression globale */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <p className="text-xs text-white/50">Progression</p>
            <p className="text-xs text-cyber-green font-medium">{overallProgress}%</p>
          </div>
          <ProgressBar value={overallProgress} tone="green" height="sm" className="mb-1" />
          <p className="text-xs text-white/40">
            {user.completedLessons.length} leçon{user.completedLessons.length !== 1 ? "s" : ""} ·{" "}
            {user.completedChallenges.length} challenge{user.completedChallenges.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
