"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import StatsHeader from "@/components/dashboard/StatsHeader";
import DailyMission from "@/components/dashboard/DailyMission";
import RoadmapVisual from "@/components/dashboard/RoadmapVisual";
import BadgesGrid from "@/components/dashboard/BadgesGrid";
import CoursesInProgress from "@/components/dashboard/CoursesInProgress";
import QuickStats from "@/components/dashboard/QuickStats";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import AdminPublishSection from "@/components/publish/AdminPublishSection";
import RealtimeDashboard from "@/components/realtime/RealtimeDashboard";
import { roadmap } from "@/data/roadmap";
import { courses } from "@/data/courses";
import { useUser } from "@/context/UserContext";

function getGreeting(name: string) {
  const hour = new Date().getHours();
  const first = name.split(" ")[0];
  if (hour < 12) return `Bonjour, ${first}`;
  if (hour < 18) return `Bon après-midi, ${first}`;
  return `Bonsoir, ${first}`;
}

function getMotivation(completedLessons: number, xpPercent: number): string {
  if (completedLessons === 0) return "Commence ta première leçon pour lancer ta progression.";
  if (xpPercent >= 90) return `Plus que ${100 - xpPercent}% avant le prochain niveau — fonce !`;
  if (xpPercent >= 50) return `Tu es à ${xpPercent}% du prochain niveau. Continue comme ça !`;
  return `Continue sur ta lancée, tu es à ${xpPercent}% du prochain niveau.`;
}

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();

  const xpPercent = useMemo(
    () => Math.round((user.xp / user.xpToNextLevel) * 100),
    [user.xp, user.xpToNextLevel]
  );
  const greeting = useMemo(() => getGreeting(user.name), [user.name]);
  const motivation = useMemo(
    () => getMotivation(user.completedLessons.length, xpPercent),
    [user.completedLessons.length, xpPercent]
  );

  // Double protection côté client : rediriger les non-admins
  useEffect(() => {
    if (user.isAdmin === false) {
      router.replace("/courses");
    }
  }, [user.isAdmin, router]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* Titre de bienvenue */}
        <div className="animate-fade-in-up">
          <h1 className="font-display text-2xl md:text-3xl font-semibold">
            {greeting}
          </h1>
          <p className="text-white/50 text-sm mt-1">
            {motivation}
          </p>
        </div>

        {/* Statistiques rapides — 4 cards cliquables */}
        <QuickStats />

        {/* En-tête stats utilisateur */}
        <StatsHeader user={user} />

        {/* Mission du jour */}
        <DailyMission />

        {/* Grille principale */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Colonne gauche — 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            <CoursesInProgress courses={courses} />
            <ActivityFeed />
          </div>

          {/* Colonne droite — 1/3 */}
          <div className="space-y-6">
            <RoadmapVisual nodes={roadmap} />
            <BadgesGrid badges={user.badges} />
          </div>
        </div>

        {/* Zone admin — Publication de contenu */}
        <AdminPublishSection />

        {/* Supervision temps réel */}
        <RealtimeDashboard />

      </div>
    </AppShell>
  );
}
