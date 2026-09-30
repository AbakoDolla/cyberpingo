"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import OverviewPanel from "@/components/admin/OverviewPanel";
import LearnersPanel from "@/components/admin/LearnersPanel";
import ContactInbox from "@/components/admin/ContactInbox";
import { useAdminLive } from "@/hooks/useRealtime";
import { roadmap } from "@/data/roadmap";
import { courses } from "@/data/courses";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";

type Tab = "overview" | "live" | "learners" | "messages" | "publish" | "me";

const TAB_ORDER: Tab[] = ["overview", "live", "learners", "messages", "publish", "me"];

function getGreeting(name: string) {
  const hour = new Date().getHours();
  const first = name.split(" ")[0];
  if (hour < 12) return `Bonjour, ${first}`;
  if (hour < 18) return `Bon après-midi, ${first}`;
  return `Bonsoir, ${first}`;
}

export default function DashboardPage() {
  const { user, hydrated } = useUser();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const live = useAdminLive(hydrated && user.isAdmin === true);
  const [greeting, setGreeting] = useState("Console d’administration");

  useEffect(() => {
    if (hydrated && user.isAdmin === false) router.replace("/courses");
  }, [hydrated, user.isAdmin, router]);

  useEffect(() => {
    if (user.name) setGreeting(getGreeting(user.name));
  }, [user.name]);

  const onlineNow = useMemo(() => live.overview?.onlineNow ?? 0, [live.overview]);
  const tabs: { key: Tab; label: string; badge?: number; alert?: boolean }[] = [
    { key: "overview", label: "Vue d’ensemble" },
    { key: "live", label: "En direct", badge: onlineNow || undefined },
    { key: "learners", label: "Apprenants" },
    { key: "messages", label: "Messages", badge: live.overview?.newMessages || undefined, alert: Boolean(live.overview?.newMessages) },
    { key: "publish", label: "Publication" },
    { key: "me", label: "Mon parcours" },
  ];

  function onTabKey(event: React.KeyboardEvent<HTMLButtonElement>) {
    const index = TAB_ORDER.indexOf(tab);
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const target = event.key === "Home" ? TAB_ORDER[0] : event.key === "End" ? TAB_ORDER[TAB_ORDER.length - 1] : delta ? TAB_ORDER[(index + delta + TAB_ORDER.length) % TAB_ORDER.length] : null;
    if (!target) return;
    event.preventDefault();
    setTab(target);
    tabRefs.current[target]?.focus();
  }

  if (!hydrated || !user.isAdmin) {
    return (
      <AppShell>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-4" aria-busy="true">
          <div className="h-9 w-72 rounded-lg bg-white/[0.04] animate-pulse" />
          <div className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />
          <div className="h-64 rounded-xl2 bg-white/[0.04] animate-pulse" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4 animate-fade-in-up">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyber-blue">Console d’administration</p>
            <h1 className="font-display text-2xl md:text-3xl font-semibold mt-1">{greeting}</h1>
            <p className="text-white/55 text-sm mt-1">
              Suis l’activité des apprenants, réponds aux messages et publie de nouveaux contenus.
            </p>
          </div>
          <p className="flex items-center gap-2 text-xs text-white/50" role="status">
            <span className={cn("h-2 w-2 rounded-full", live.connection === "live" ? "bg-cyber-green animate-pulse" : live.connection === "connecting" ? "bg-cyber-yellow animate-pulse" : "bg-cyber-red")} />
            {live.connection === "live" ? "Données en direct" : live.connection === "connecting" ? "Connexion…" : "Flux temps réel indisponible"}
          </p>
        </header>

        <div className="sticky top-0 z-20 -mx-4 md:mx-0 px-4 md:px-0 bg-cyber-black/80 backdrop-blur-md">
          <div role="tablist" aria-label="Sections de la console" className="flex gap-1 overflow-x-auto border-b border-white/10">
            {tabs.map(({ key, label, badge, alert }) => (
              <button
                key={key}
                ref={(node) => { tabRefs.current[key] = node; }}
                type="button"
                role="tab"
                id={`admin-tab-${key}`}
                aria-selected={tab === key}
                aria-controls={`admin-panel-${key}`}
                tabIndex={tab === key ? 0 : -1}
                onClick={() => setTab(key)}
                onKeyDown={onTabKey}
                className={cn(
                  "relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm transition-colors",
                  tab === key ? "text-white" : "text-white/50 hover:text-white/80"
                )}
              >
                {label}
                {badge !== undefined && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] tabular-nums", alert ? "bg-cyber-red/20 text-red-200" : "bg-cyber-green/15 text-cyber-green")}>{badge}</span>
                )}
                <span className={cn("absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-cyber-blue transition-transform duration-300 origin-center", tab === key ? "scale-x-100" : "scale-x-0")} />
              </button>
            ))}
          </div>
        </div>

        <div role="tabpanel" id={`admin-panel-${tab}`} aria-labelledby={`admin-tab-${tab}`} key={tab} className="animate-fade-in-up">
          {tab === "overview" && (
            <OverviewPanel overview={live.overview} onOpenMessages={() => setTab("messages")} onOpenLearners={() => setTab("learners")} />
          )}
          {tab === "live" && <RealtimeDashboard live={live} />}
          {tab === "learners" && <LearnersPanel currentUserId={user.id} onChanged={() => void live.refresh()} />}
          {tab === "messages" && <ContactInbox onChanged={() => void live.refresh()} />}
          {tab === "publish" && <AdminPublishSection />}
          {tab === "me" && (
            <div className="space-y-6">
              <QuickStats />
              <StatsHeader user={user} />
              <DailyMission />
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <CoursesInProgress courses={courses} />
                  <ActivityFeed />
                </div>
                <div className="space-y-6">
                  <RoadmapVisual nodes={roadmap} />
                  <BadgesGrid badges={user.badges} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
