"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { lessons } from "@/data/lessons";
import { useUser } from "@/context/UserContext";

export default function DailyMission() {
  const { user } = useUser();

  // La mission du jour = première leçon non terminée, dans l'ordre des cours
  const nextLesson = lessons.find((l) => !user.completedLessons.includes(l.id));

  if (!nextLesson) {
    return (
      <Card glow="blue" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Badge tone="blue">Mission du jour</Badge>
          <h3 className="mt-3 font-display font-semibold text-lg">
            Toutes les leçons sont terminées !
          </h3>
          <p className="mt-1 text-sm text-white/50">Essaie les challenges pour continuer à progresser.</p>
        </div>
        <Link href="/challenges">
          <Button variant="primary">Voir les challenges</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card glow="blue" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <Badge tone="blue">Mission du jour</Badge>
        <h3 className="mt-3 font-display font-semibold text-lg">{nextLesson.title}</h3>
        <p className="mt-1 text-sm text-white/50">
          Environ {nextLesson.durationMinutes} minutes · +{nextLesson.xpReward} XP
        </p>
      </div>
      <Link href={`/lessons/${nextLesson.id}`}>
        <Button variant="primary">Continuer</Button>
      </Link>
    </Card>
  );
}
