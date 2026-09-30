"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { pageLabel } from "@/lib/page-labels";
import { computeLevel } from "@/lib/learning-progress";
import type { AdminLive } from "@/hooks/useRealtime";
import { sessionStatus, type LearnerStatus, type LiveEvent, type LiveSession } from "@/types/realtime";
import type { ActivityKind } from "@/types/database";
import {
  IconActivity, IconProfile, IconBolt, IconClock, IconDashboard,
  IconShield, IconAI, IconLesson, IconArrowRight, IconCircle, IconLogout, IconTarget,
} from "@/components/ui/Icon";

type IconType = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

export function timeAgo(iso: string, now: number): string {
  const diff = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (diff < 10) return "à l’instant";
  if (diff < 60) return `il y a ${diff} s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_CONFIG: Record<LearnerStatus, { dot: string; badge: string; label: string }> = {
  online: { dot: "bg-cyber-green animate-pulse", badge: "bg-cyber-green/15 text-cyber-green border-cyber-green/25", label: "En ligne" },
  idle: { dot: "bg-cyber-yellow", badge: "bg-cyber-yellow/15 text-cyber-yellow border-cyber-yellow/25", label: "Inactif" },
  offline: { dot: "bg-white/20", badge: "bg-white/5 text-white/40 border-white/10", label: "Hors ligne" },
};

export const ACTIVITY_META: Record<ActivityKind, { Icon: IconType; color: string; plural: string }> = {
  login: { Icon: IconProfile, color: "text-cyber-blue", plural: "Connexions" },
  logout: { Icon: IconLogout, color: "text-white/40", plural: "Déconnexions" },
  lesson_complete: { Icon: IconLesson, color: "text-cyber-green", plural: "Leçons terminées" },
  quiz_complete: { Icon: IconBolt, color: "text-neon-purple", plural: "Quiz soumis" },
  challenge_complete: { Icon: IconShield, color: "text-cyber-yellow", plural: "Challenges réussis" },
  mentor_chat: { Icon: IconAI, color: "text-neon-purple", plural: "Questions au mentor" },
  onboarding: { Icon: IconTarget, color: "text-cyber-blue", plural: "Onboardings" },
  reset: { Icon: IconClock, color: "text-cyber-red", plural: "Réinitialisations" },
};

const STATUS_ORDER: Record<LearnerStatus, number> = { online: 0, idle: 1, offline: 2 };

function StatCard({ label, value, sub, accent, Icon }: { label: string; value: number | string; sub?: string; accent: string; Icon: IconType }) {
  return (
    <div className="bg-dark-navy border border-white/5 rounded-xl p-4">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-white/[0.04]">
        <Icon size={17} strokeWidth={1.7} className={accent} />
      </div>
      <p key={String(value)} className={cn("font-display font-bold text-3xl tabular-nums animate-fade-in-up", accent)}>{value}</p>
      <p className="text-xs text-white/55 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-white/35 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: LearnerStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border font-medium", cfg.badge)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export function EventRow({ event, isNew, now }: { event: LiveEvent; isNew?: boolean; now: number }) {
  const { Icon, color } = ACTIVITY_META[event.kind] ?? { Icon: IconActivity, color: "text-white/40" };
  return (
    <li className={cn(
      "flex items-start gap-3 py-2.5 px-3 rounded-xl transition-colors duration-700",
      isNew ? "bg-cyber-blue/[0.08] border border-cyber-blue/15 animate-fade-in-up" : "border border-transparent hover:bg-white/[0.02]"
    )}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-white/5">
        <Icon size={13} strokeWidth={1.8} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug">
          <span className="font-semibold text-white">{event.displayName}</span>{" "}
          <span className="text-white/55">{event.label}</span>
          {event.xpDelta > 0 && <span className="ml-1.5 text-[11px] text-cyber-green font-medium">+{event.xpDelta} XP</span>}
        </p>
        <p className="text-[11px] text-white/35 mt-0.5">
          {event.page ? `${pageLabel(event.page)} · ` : ""}
          <time dateTime={event.createdAt} title={new Date(event.createdAt).toLocaleString("fr-FR")}>{timeAgo(event.createdAt, now)}</time>
        </p>
      </div>
    </li>
  );
}

function SessionRow({ session, status, now }: { session: LiveSession; status: LearnerStatus; now: number }) {
  const { level } = computeLevel(session.xp);
  return (
    <li className={cn(
      "flex items-center gap-3 p-3 rounded-xl border transition-colors duration-500",
      status === "online" ? "border-cyber-green/10 bg-cyber-green/[0.03]" : status === "idle" ? "border-cyber-yellow/10 bg-cyber-yellow/[0.02]" : "border-white/5"
    )}>
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-xl bg-neon-purple/15 border border-neon-purple/20 flex items-center justify-center">
          <span className="text-xs font-display font-bold text-neon-purple" aria-hidden="true">{session.displayName.slice(0, 2).toUpperCase()}</span>
        </div>
        <span className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-cyber-black", STATUS_CONFIG[status].dot)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-sm font-medium", status === "offline" && "text-white/60")}>{session.displayName}</span>
          {session.role === "admin" && <span className="text-[10px] uppercase tracking-wider text-cyber-blue">Admin</span>}
          <StatusBadge status={status} />
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[11px] text-white/40">
          <span className="flex items-center gap-1"><IconBolt size={10} className="text-cyber-yellow" />Niv. {level} · {session.xp.toLocaleString("fr-FR")} XP</span>
          {status !== "offline" && <span className="flex items-center gap-1 min-w-0"><IconArrowRight size={10} /><span className="truncate">{pageLabel(session.currentPage)}</span></span>}
        </div>
      </div>
      <div className="text-right shrink-0 hidden sm:block text-[11px] text-white/35">
        <p>{status === "offline" ? `Vu ${timeAgo(session.endedAt ?? session.lastSeenAt, now)}` : `Connecté ${timeAgo(session.connectedAt, now)}`}</p>
        <p className="text-white/25">{status === "offline" ? formatTime(session.endedAt ?? session.lastSeenAt) : `Actif ${timeAgo(session.lastSeenAt, now)}`}</p>
      </div>
    </li>
  );
}

function RealtimeToasts({ events }: { events: LiveEvent[] }) {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite">
      {events.map((event) => {
        const { Icon, color } = ACTIVITY_META[event.kind] ?? { Icon: IconActivity, color: "text-white/40" };
        return (
          <div key={event.id} className="flex items-center gap-3 bg-dark-navy/95 border border-white/10 rounded-xl px-4 py-3 shadow-soft animate-fade-in-up backdrop-blur-sm min-w-[260px] max-w-xs">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
              <Icon size={14} strokeWidth={1.8} className={color} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight">{event.displayName}</p>
              <p className="text-[11px] text-white/55 mt-0.5 truncate">{event.label}</p>
            </div>
            {event.xpDelta > 0 && <span className="text-xs text-cyber-green font-medium shrink-0 ml-auto">+{event.xpDelta} XP</span>}
          </div>
        );
      })}
    </div>
  );
}

const CONNECTION_LABEL = {
  connecting: { text: "Connexion au flux…", dot: "bg-cyber-yellow animate-pulse" },
  live: { text: "En direct", dot: "bg-cyber-green animate-pulse" },
  offline: { text: "Flux interrompu · actualisation manuelle", dot: "bg-cyber-red" },
};

type Tab = "sessions" | "feed" | "trends";

export default function RealtimeDashboard({ live }: { live: AdminLive }) {
  const { sessions, events, freshEvents, connection, now, overview, loading, error, refresh } = live;
  const [tab, setTab] = useState<Tab>("sessions");
  const [refreshing, setRefreshing] = useState(false);

  const withStatus = useMemo(
    () => sessions
      .map((session) => ({ session, status: sessionStatus(session, now) }))
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.session.lastSeenAt.localeCompare(a.session.lastSeenAt)),
    [sessions, now]
  );
  const counts = useMemo(() => withStatus.reduce((acc, { status }) => ({ ...acc, [status]: acc[status] + 1 }), { online: 0, idle: 0, offline: 0 }), [withStatus]);
  const freshIds = useMemo(() => new Set(freshEvents.map((event) => event.id)), [freshEvents]);
  const livePages = useMemo(() => {
    const tally = new Map<string, number>();
    for (const { session, status } of withStatus) if (status !== "offline") tally.set(pageLabel(session.currentPage), (tally.get(pageLabel(session.currentPage)) ?? 0) + 1);
    return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [withStatus]);
  const kindCounts = useMemo(() => {
    const tally = new Map<ActivityKind, number>();
    for (const event of events) tally.set(event.kind, (tally.get(event.kind) ?? 0) + 1);
    return [...tally.entries()].sort((a, b) => b[1] - a[1]);
  }, [events]);

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const TABS: { key: Tab; label: string; Icon: IconType; count?: number }[] = [
    { key: "sessions", label: "Sessions", Icon: IconProfile, count: sessions.length },
    { key: "feed", label: "Activité", Icon: IconActivity, count: events.length },
    { key: "trends", label: "Tendances", Icon: IconDashboard },
  ];
  const connectionLabel = CONNECTION_LABEL[connection];
  const maxPage = Math.max(1, ...livePages.map(([, count]) => count));

  return (
    <>
      <RealtimeToasts events={freshEvents} />
      <section className="bg-dark-navy border border-white/5 rounded-xl2 overflow-hidden" aria-labelledby="live-title">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyber-blue/10 border border-cyber-blue/20 flex items-center justify-center">
              <IconActivity size={17} strokeWidth={1.6} className="text-cyber-blue" />
            </div>
            <div>
              <h2 id="live-title" className="font-display font-semibold text-base">Supervision temps réel</h2>
              <p className="text-[11px] text-white/45 flex items-center gap-1.5" role="status">
                <span className={cn("w-1.5 h-1.5 rounded-full inline-block", connectionLabel.dot)} />
                {connectionLabel.text}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-cyber-green/10 border border-cyber-green/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
              <span className="text-xs font-medium text-cyber-green tabular-nums">{counts.online} en ligne</span>
            </div>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/25 transition-colors disabled:opacity-50"
            >
              {refreshing ? "Actualisation…" : "Actualiser"}
            </button>
          </div>
        </div>

        {error && <p role="alert" className="mx-6 mt-4 rounded-xl border border-cyber-red/30 bg-cyber-red/10 px-4 py-3 text-sm text-red-100">{error}</p>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 py-4 border-b border-white/5">
          <StatCard label="En ligne" value={counts.online} accent="text-cyber-green" Icon={IconCircle} sub="Onglet ouvert, actif < 2 min" />
          <StatCard label="Inactifs" value={counts.idle} accent="text-cyber-yellow" Icon={IconClock} sub="Vus il y a moins de 15 min" />
          <StatCard label="Actifs aujourd’hui" value={overview?.activeToday ?? "—"} accent="text-cyber-blue" Icon={IconProfile} sub="Au moins une action (UTC)" />
          <StatCard label="XP gagnés aujourd’hui" value={overview ? overview.xpToday.toLocaleString("fr-FR") : "—"} accent="text-neon-purple" Icon={IconBolt} sub="Tous apprenants" />
        </div>

        <div className="flex gap-0 border-b border-white/5 px-6 overflow-x-auto" role="tablist" aria-label="Vues de supervision">
          {TABS.map(({ key, label, Icon, count }) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`live-tab-${key}`}
              aria-selected={tab === key}
              aria-controls={`live-panel-${key}`}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors -mb-px whitespace-nowrap",
                tab === key ? "border-cyber-blue text-cyber-blue" : "border-transparent text-white/50 hover:text-white/80"
              )}
            >
              <Icon size={14} />
              {label}
              {count !== undefined && (
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full tabular-nums", tab === key ? "bg-cyber-blue/20 text-cyber-blue" : "bg-white/5 text-white/40")}>{count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6" role="tabpanel" id={`live-panel-${tab}`} aria-labelledby={`live-tab-${tab}`}>
          {loading ? (
            <div className="space-y-2" aria-busy="true">
              {[0, 1, 2, 3].map((index) => <div key={index} className="h-14 rounded-xl bg-white/[0.04] animate-pulse" />)}
            </div>
          ) : tab === "sessions" ? (
            withStatus.length === 0 ? (
              <p className="text-sm text-white/45 text-center py-10">Aucune session pour l’instant. Elles apparaîtront dès qu’un apprenant se connectera.</p>
            ) : (
              <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                {withStatus.map(({ session, status }) => <SessionRow key={session.userId} session={session} status={status} now={now} />)}
              </ul>
            )
          ) : tab === "feed" ? (
            events.length === 0 ? (
              <p className="text-sm text-white/45 text-center py-10">Aucune activité enregistrée pour le moment.</p>
            ) : (
              <ul className="space-y-1 max-h-[28rem] overflow-y-auto pr-1">
                {events.map((event) => <EventRow key={event.id} event={event} isNew={freshIds.has(event.id)} now={now} />)}
              </ul>
            )
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-widest mb-3">Où sont les apprenants</h3>
                {livePages.length === 0 ? (
                  <p className="text-sm text-white/40">Personne n’est connecté en ce moment.</p>
                ) : (
                  <ul className="space-y-3">
                    {livePages.map(([page, count]) => (
                      <li key={page} className="flex items-center gap-3">
                        <span className="text-xs text-white/60 w-40 truncate shrink-0" title={page}>{page}</span>
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-cyber-blue/70 rounded-full transition-[width] duration-700" style={{ width: `${(count / maxPage) * 100}%` }} />
                        </div>
                        <span className="text-[11px] text-white/45 w-6 text-right tabular-nums">{count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-widest mb-3">Sur les {events.length} derniers événements</h3>
                {kindCounts.length === 0 ? (
                  <p className="text-sm text-white/40">Aucune donnée.</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2">
                    {kindCounts.map(([kind, count]) => {
                      const { Icon, color, plural } = ACTIVITY_META[kind];
                      return (
                        <li key={kind} className="bg-cyber-black/40 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                          <Icon size={14} strokeWidth={1.8} className={color} />
                          <div className="min-w-0">
                            <p className="font-display font-bold text-base tabular-nums">{count}</p>
                            <p className="text-[11px] text-white/45 truncate">{plural}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
