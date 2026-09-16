"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRealtime } from "@/hooks/useRealtime";
import { RealtimeSession, RealtimeEvent, UserStatus } from "@/types/realtime";
import { PAGE_LABELS } from "@/lib/realtimeMock";
import { cn } from "@/lib/utils";
import {
  IconActivity, IconProfile, IconBolt, IconClock, IconDashboard,
  IconShield, IconAI, IconLesson, IconCheck,
  IconArrowRight, IconCircle,
} from "@/components/ui/Icon";

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5)  return "à l'instant";
  if (diff < 60) return `il y a ${diff}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  return `il y a ${Math.floor(diff / 3600)}h`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Constantes UI ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<UserStatus, { dot: string; badge: string; label: string }> = {
  online:  { dot: "bg-cyber-green animate-pulse",   badge: "bg-cyber-green/15 text-cyber-green border-cyber-green/25",  label: "En ligne"   },
  idle:    { dot: "bg-cyber-yellow",                badge: "bg-cyber-yellow/15 text-cyber-yellow border-cyber-yellow/25", label: "Inactif"  },
  offline: { dot: "bg-white/20",                    badge: "bg-white/5 text-white/30 border-white/10",                   label: "Hors ligne" },
};

const ACTION_ICON: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  page_view:          IconArrowRight,
  lesson_start:       IconLesson,
  lesson_complete:    IconCheck,
  challenge_start:    IconShield,
  challenge_complete: IconShield,
  quiz_start:         IconBolt,
  quiz_complete:      IconBolt,
  mentor_chat:        IconAI,
  login:              IconProfile,
  logout:             IconProfile,
};

const ACTION_COLOR: Record<string, string> = {
  page_view:          "text-white/40",
  lesson_start:       "text-cyber-blue",
  lesson_complete:    "text-cyber-green",
  challenge_start:    "text-cyber-yellow",
  challenge_complete: "text-cyber-green",
  quiz_start:         "text-neon-purple",
  quiz_complete:      "text-cyber-green",
  mentor_chat:        "text-neon-purple",
  login:              "text-cyber-blue",
  logout:             "text-white/40",
};

// ─── Sous-composants ─────────────────────────────────────────────────────────

/** Carte stat numérique avec animation de changement */
function StatCard({
  label, value, sub, accent, Icon,
}: {
  label: string;
  value: number;
  sub?: string;
  accent: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevRef.current !== value) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      prevRef.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div className={cn(
      "bg-dark-navy border rounded-xl p-4 transition-all duration-300",
      flash ? "border-white/20 shadow-glow" : "border-white/5"
    )}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${accent.replace("text-", "bg-")}/10`}>
        <Icon size={17} strokeWidth={1.7} className={accent} />
      </div>
      <p className={cn("font-display font-bold text-3xl tabular-nums transition-all duration-300", accent, flash && "scale-105")}>
        {value}
      </p>
      <p className="text-xs text-white/50 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
    </div>
  );
}

/** Badge de statut utilisateur */
function StatusBadge({ status }: { status: UserStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border font-medium", cfg.badge)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

/** Ligne d'événement dans le flux */
function EventRow({ event, isNew }: { event: RealtimeEvent; isNew: boolean }) {
  const Icon = ACTION_ICON[event.action] ?? IconActivity;
  const color = ACTION_COLOR[event.action] ?? "text-white/40";

  return (
    <div className={cn(
      "flex items-start gap-3 py-2.5 px-3 rounded-xl transition-all duration-500",
      isNew ? "bg-cyber-blue/8 border border-cyber-blue/15" : "hover:bg-white/[0.02]"
    )}>
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
        isNew ? "bg-cyber-blue/15" : "bg-white/5"
      )}>
        <Icon size={13} strokeWidth={1.8} className={cn(color, isNew && "text-cyber-blue")} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-white">{event.displayName}</span>
          <span className="text-xs text-white/40">{event.label}</span>
          {event.xpDelta && (
            <span className="text-[10px] text-cyber-green font-medium">+{event.xpDelta} XP</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-white/25">{PAGE_LABELS[event.page] ?? event.page}</span>
          <span className="text-[10px] text-white/20">·</span>
          <span className="text-[10px] text-white/25">{timeAgo(event.timestamp)}</span>
        </div>
      </div>
      {isNew && (
        <span className="text-[9px] text-cyber-blue bg-cyber-blue/10 px-1.5 py-0.5 rounded-full border border-cyber-blue/20 shrink-0">
          Nouveau
        </span>
      )}
    </div>
  );
}

/** Ligne de session utilisateur */
function SessionRow({ session }: { session: RealtimeSession }) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border transition-all duration-300",
      session.status === "online"
        ? "border-cyber-green/10 bg-cyber-green/[0.03]"
        : session.status === "idle"
        ? "border-cyber-yellow/10 bg-cyber-yellow/[0.02]"
        : "border-white/5 opacity-60"
    )}>
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-9 h-9 rounded-xl bg-neon-purple/15 border border-neon-purple/20 flex items-center justify-center">
          <span className="text-xs font-display font-bold text-neon-purple">
            {session.displayName.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <span className={cn(
          "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-cyber-black",
          STATUS_CONFIG[session.status].dot
        )} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{session.displayName}</span>
          <StatusBadge status={session.status} />
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {/* Niveau & XP */}
          <span className="text-[10px] text-white/30 flex items-center gap-1">
            <IconBolt size={9} className="text-cyber-yellow" />
            Niv.{session.level} · {session.xp.toLocaleString("fr-FR")} XP
          </span>
          {/* Page courante */}
          {session.status !== "offline" && (
            <span className="text-[10px] text-white/30 flex items-center gap-1">
              <IconArrowRight size={9} />
              {PAGE_LABELS[session.currentPage] ?? session.currentPage}
            </span>
          )}
        </div>
      </div>

      {/* Temps */}
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-[10px] text-white/25">
          {session.status === "offline" && session.disconnectedAt
            ? `Déco. ${timeAgo(session.disconnectedAt)}`
            : `Co. ${timeAgo(session.connectedAt)}`}
        </p>
        <p className="text-[10px] text-white/20">
          {session.status !== "offline"
            ? `Actif ${timeAgo(session.lastActivityAt)}`
            : formatTime(session.disconnectedAt ?? session.lastActivityAt)}
        </p>
      </div>
    </div>
  );
}

/** Barre de page populaire */
function PageBar({ page, count, max }: { page: string; count: number; max: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/50 w-28 truncate shrink-0">
        {PAGE_LABELS[page] ?? page}
      </span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-cyber-blue/60 rounded-full transition-all duration-700"
          style={{ width: `${(count / max) * 100}%` }}
        />
      </div>
      <span className="text-[10px] text-white/30 w-6 text-right tabular-nums">{count}</span>
    </div>
  );
}

// ─── Notification toast temps réel ────────────────────────────────────────────

function RealtimeNotification({ events }: { events: RealtimeEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {events.slice(0, 3).map((ev) => {
        const Ic = ACTION_ICON[ev.action] ?? IconActivity;
        const col = ACTION_COLOR[ev.action] ?? "text-white/40";
        return (
          <div
            key={ev.id}
            className="flex items-center gap-3 bg-dark-navy border border-white/10 rounded-xl px-4 py-3 shadow-soft animate-fade-in-up backdrop-blur-sm min-w-[280px] max-w-xs"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
              <Ic size={14} strokeWidth={1.8} className={col} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight">{ev.displayName}</p>
              <p className="text-[11px] text-white/50 mt-0.5 truncate">{ev.label}</p>
            </div>
            {ev.xpDelta && (
              <span className="text-xs text-cyber-green font-medium shrink-0 ml-auto">
                +{ev.xpDelta} XP
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Constante hors composant — évite la recréation à chaque render
const STATUS_ORDER: Record<UserStatus, number> = { online: 0, idle: 1, offline: 2 };

type Tab = "sessions" | "feed" | "stats";

export default function RealtimeDashboard() {
  const { state, newEvents, isLive, pause, resume } = useRealtime();
  const [tab, setTab] = useState<Tab>("sessions");
  const [mounted, setMounted] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Évite le hydration mismatch : tout ce qui dépend de Date()
  // ne doit être rendu qu'après montage côté client.
  useEffect(() => { setMounted(true); }, []);

  // Auto-scroll du feed sur nouveaux events
  useEffect(() => {
    if (tab === "feed" && newEvents.length > 0) {
      feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [newEvents, tab]);

  const { stats, sessions, events } = state;
  const maxPageCount = Math.max(...(stats.mostVisitedPages.map((p) => p.count)), 1);

  // useMemo — évite de recréer le Set et de retrier toutes les 3s si les données n'ont pas changé
  const newEventIds = useMemo(() => new Set(newEvents.map((e) => e.id)), [newEvents]);
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [sessions]
  );
  if (!mounted) {
    return (
      <div className="bg-dark-navy border border-white/5 rounded-xl2 p-6 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-white/5" />
          <div className="space-y-1.5">
            <div className="w-40 h-3.5 bg-white/5 rounded" />
            <div className="w-28 h-2.5 bg-white/5 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-white/5 rounded-xl" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; count?: number }[] = [
    { key: "sessions", label: "Sessions",  Icon: IconProfile,  count: stats.totalSessions },
    { key: "feed",     label: "Activité",  Icon: IconActivity, count: events.length },
    { key: "stats",    label: "Stats",     Icon: IconDashboard },
  ];

  return (
    <>
      {/* Notifications flottantes */}
      <RealtimeNotification events={newEvents} />

      <div className="bg-dark-navy border border-white/5 rounded-xl2 overflow-hidden">

        {/* ── En-tête ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyber-blue/10 border border-cyber-blue/20 flex items-center justify-center">
              <IconActivity size={17} strokeWidth={1.6} className="text-cyber-blue" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-base">Supervision temps réel</h3>
              <p className="text-[10px] text-white/35 flex items-center gap-1.5">
                {isLive ? (
                  <><span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse inline-block" />Mise à jour toutes les 3s</>
                ) : (
                  <><span className="w-1.5 h-1.5 rounded-full bg-white/20 inline-block" />En pause</>
                )}
                <span className="text-white/20">·</span>
                {formatTime(state.lastUpdated)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Compteur en ligne */}
            <div className="flex items-center gap-1.5 bg-cyber-green/10 border border-cyber-green/20 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
              <span className="text-xs font-medium text-cyber-green tabular-nums">{stats.totalOnline} en ligne</span>
            </div>
            {/* Pause / Resume */}
            <button
              onClick={isLive ? pause : resume}
              className="text-[11px] px-3 py-1.5 rounded-full border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-colors"
            >
              {isLive ? "Pause" : "Reprendre"}
            </button>
          </div>
        </div>

        {/* ── Stats rapides ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-white/5">
          <StatCard label="En ligne"  value={stats.totalOnline}  accent="text-cyber-green"  Icon={IconCircle} />
          <StatCard label="Inactifs"  value={stats.totalIdle}    accent="text-cyber-yellow" Icon={IconClock}  sub="Aucune action récente" />
          <StatCard label="Hors ligne" value={stats.totalOffline} accent="text-white/40"    Icon={IconProfile} />
          <StatCard label="XP gagné aujourd'hui" value={stats.totalXpEarnedToday} accent="text-neon-purple" Icon={IconBolt} sub="Toutes sessions" />
        </div>

        {/* ── Onglets ──────────────────────────────────────────────────── */}
        <div className="flex gap-0 border-b border-white/5 px-6">
          {TABS.map(({ key, label, Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors -mb-px",
                tab === key
                  ? "border-cyber-blue text-cyber-blue"
                  : "border-transparent text-white/40 hover:text-white/70"
              )}
            >
              <Icon size={14} />
              {label}
              {count !== undefined && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full",
                  tab === key ? "bg-cyber-blue/20 text-cyber-blue" : "bg-white/5 text-white/30"
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Contenu des onglets ──────────────────────────────────────── */}
        <div className="p-6">

          {/* Sessions */}
          {tab === "sessions" && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {/* Ligne admin en premier */}
              {sortedSessions.map((session) => (                  <SessionRow key={session.sessionId} session={session} />
                ))}
            </div>
          )}

          {/* Flux d'activité */}
          {tab === "feed" && (
            <div ref={feedRef} className="space-y-1 max-h-96 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-sm text-white/30 text-center py-8">Aucune activité enregistrée</p>
              ) : (
                events.map((event) => (
                  <EventRow
                    key={event.id}
                    event={event}
                    isNew={newEventIds.has(event.id)}
                  />
                ))
              )}
            </div>
          )}

          {/* Statistiques */}
          {tab === "stats" && (
            <div className="space-y-6">
              {/* Pages les plus visitées */}
              <div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">
                  Pages les plus consultées
                </p>
                <div className="space-y-3">
                  {stats.mostVisitedPages.map(({ page, count }) => (
                    <PageBar key={page} page={page} count={count} max={maxPageCount} />
                  ))}
                  {stats.mostVisitedPages.length === 0 && (
                    <p className="text-sm text-white/30">Aucune donnée</p>
                  )}
                </div>
              </div>

              {/* Actions du jour */}
              <div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">
                  Actions effectuées
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.entries(stats.actionCounts) as [string, number][])
                    .filter(([, v]) => v > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([action, count]) => {
                      const Icon = ACTION_ICON[action] ?? IconActivity;
                      const color = ACTION_COLOR[action] ?? "text-white/40";
                      const labels: Record<string, string> = {
                        page_view: "Vues de page",
                        lesson_start: "Leçons démarrées",
                        lesson_complete: "Leçons finies",
                        challenge_start: "Challenges lancés",
                        challenge_complete: "Challenges réussis",
                        quiz_start: "Quiz démarrés",
                        quiz_complete: "Quiz validés",
                        mentor_chat: "Questions mentor",
                        login: "Connexions",
                        logout: "Déconnexions",
                      };
                      return (
                        <div key={action} className="bg-cyber-black/40 border border-white/5 rounded-xl p-3 flex items-center gap-3">
                          <Icon size={14} strokeWidth={1.8} className={color} />
                          <div className="min-w-0">
                            <p className="font-display font-bold text-base tabular-nums">{count}</p>
                            <p className="text-[10px] text-white/35 truncate">{labels[action] ?? action}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Résumé sessions */}
              <div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-widest mb-3">
                  Résumé des sessions
                </p>
                <div className="bg-cyber-black/40 border border-white/5 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left px-4 py-2.5 text-white/30 font-medium">Utilisateur</th>
                        <th className="text-left px-4 py-2.5 text-white/30 font-medium hidden sm:table-cell">Niv. / XP</th>
                        <th className="text-left px-4 py-2.5 text-white/30 font-medium">Statut</th>
                        <th className="text-left px-4 py-2.5 text-white/30 font-medium hidden md:table-cell">Connexion</th>
                        <th className="text-left px-4 py-2.5 text-white/30 font-medium hidden md:table-cell">IP masquée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.sessionId} className="border-b border-white/[0.03] hover:bg-white/[0.01]">
                          <td className="px-4 py-2.5 font-medium">{s.displayName}</td>
                          <td className="px-4 py-2.5 text-white/40 hidden sm:table-cell">
                            Niv.{s.level} · {s.xp.toLocaleString("fr-FR")} XP
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={s.status} />
                          </td>
                          <td className="px-4 py-2.5 text-white/30 hidden md:table-cell">
                            {formatDate(s.connectedAt)} {formatTime(s.connectedAt)}
                          </td>
                          <td className="px-4 py-2.5 text-white/25 font-mono hidden md:table-cell">
                            {s.ipMasked}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-white/20 mt-2">
                  Les adresses IP sont masquées conformément aux règles de confidentialité.
                  Seules les données nécessaires à la supervision sont collectées.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
