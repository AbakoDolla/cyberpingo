"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ChallengeCard from "@/components/challenges/ChallengeCard";
import Badge from "@/components/ui/Badge";
import { challenges as staticChallenges } from "@/data/challenges";
import { usePublishStore } from "@/hooks/usePublishStore";
import { Challenge, ChallengeCategory } from "@/types";
import { IconBolt } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const categories: { value: ChallengeCategory | "tous"; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "reseau", label: "Réseau" },
  { value: "linux", label: "Linux" },
  { value: "web", label: "Web" },
  { value: "cryptographie", label: "Cryptographie" },
  { value: "osint", label: "OSINT" },
  { value: "securite", label: "Sécurité" },
];

export default function ChallengesPage() {
  const [filter, setFilter] = useState<ChallengeCategory | "tous">("tous");
  const { publishedChallenges, hydrated } = usePublishStore();

  // Convertit les challenges publiés en format Challenge
  const publishedAsChallenges: Challenge[] = publishedChallenges.map((pc) => ({
    id: pc.id,
    slug: pc.slug,
    title: pc.title,
    description: pc.description,
    category: pc.category,
    difficulty: pc.difficulty,
    xpReward: pc.xpReward,
    status: "disponible" as const,
    objectives: pc.objectives,
    hints: pc.hints,
    terminalLines: pc.terminalLines,
    flagPlaceholder: pc.flagPlaceholder,
    expectedAnswer: pc.expectedAnswer,
  }));

  const allChallenges = [...staticChallenges, ...publishedAsChallenges];
  const filtered = filter === "tous"
    ? allChallenges
    : allChallenges.filter((c) => c.category === filter);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Challenges</h1>
            <p className="text-white/50 text-sm mt-1">
              Des mini-laboratoires pratiques, dans un environnement pédagogique contrôlé.
            </p>
          </div>
          {hydrated && publishedAsChallenges.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-cyber-green bg-cyber-green/10 border border-cyber-green/20 px-3 py-1.5 rounded-full">
              <IconBolt size={12} />
              {publishedAsChallenges.length} publié{publishedAsChallenges.length > 1 ? "s" : ""}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button key={cat.value} onClick={() => setFilter(cat.value)}>
              <Badge
                tone={filter === cat.value ? "blue" : "neutral"}
                className={cn("cursor-pointer", filter === cat.value && "border-cyber-blue")}
              >
                {cat.label}
              </Badge>
            </button>
          ))}
        </div>

        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-white/30 col-span-3 text-center py-8">
              Aucun challenge dans cette catégorie.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
