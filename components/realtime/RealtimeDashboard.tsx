"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import { pageLabel } from "@/lib/page-labels";
import { formatNumber, formatRelative } from "@/lib/format";
import type { AdminLive } from "@/hooks/useRealtime";
import { sessionStatus, type LearnerStatus, type LiveEvent, type LiveSession } from "@/types/realtime";
import { IconActivity, IconBolt, IconCircle, IconClock, IconProfile } from "@/components/ui/Icon";

const STATUS: Record<LearnerStatus, { label: string; cls: string }> = {
  online: { label: "En ligne", cls: "is-online" },
  idle: { label: "Inactif", cls: "is-idle" },
  offline: { label: "Hors ligne", cls: "is-offline" },
};
const ORDER: Record<LearnerStatus, number> = { online: 0, idle: 1, offline: 2 };

function StatusBadge({ status }: { status: LearnerStatus }) {
  const state = STATUS[status];
  return <span className={`dash-live-status ${state.cls}`}>{state.label}</span>;
}

function EventRow({ event, now }: { event: LiveEvent; now: number }) {
  return (
    <li className="dash-live-event">
      <div>
        <strong>{event.displayName}</strong>
        <span>{event.label}</span>
        {event.xpDelta > 0 && <em>+{formatNumber(event.xpDelta)} XP</em>}
      </div>
      <small>{event.page ? `${pageLabel(event.page)} · ` : ""}{formatRelative(event.createdAt, new Date(now))}</small>
    </li>
  );
}

function SessionRow({ session, now }: { session: LiveSession; now: number }) {
  const status = sessionStatus(session, now);
  return (
    <li className="dash-live-session">
      <div className="dash-live-avatar">{session.displayName.slice(0, 2).toUpperCase()}</div>
      <div className="dash-live-session-copy">
        <div>
          <strong>{session.displayName}</strong>
          <StatusBadge status={status} />
        </div>
        <small>{pageLabel(session.currentPage)} · vu {formatRelative(session.lastSeenAt, new Date(now))}</small>
      </div>
      <span>{formatNumber(session.xp)} XP</span>
    </li>
  );
}

function Mini({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: number;
  Icon: ComponentType<{ size?: number; className?: string }>;
  tone: "green" | "amber" | "blue" | "purple";
}) {
  return (
    <div className={`dash-live-mini is-${tone}`}>
      <Icon size={16} />
      <strong>{formatNumber(value)}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function RealtimeDashboard({ live }: { live: AdminLive }) {
  const [tab, setTab] = useState<"sessions" | "feed">("sessions");
  const withStatus = useMemo(
    () => live.sessions
      .map((session) => ({ session, status: sessionStatus(session, live.now) }))
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.session.lastSeenAt.localeCompare(a.session.lastSeenAt)),
    [live.sessions, live.now],
  );
  const counts = withStatus.reduce<Record<LearnerStatus, number>>((acc, item) => {
    acc[item.status] += 1;
    return acc;
  }, { online: 0, idle: 0, offline: 0 });

  return (
    <section className="dash-live" aria-labelledby="dash-live-title">
      <header className="dash-live-header">
        <div>
          <h2 id="dash-live-title">Supervision temps réel</h2>
          <p className={`dash-live-connection is-${live.connection}`}>
            <span />
            {live.connection === "live" ? "En direct" : live.connection === "connecting" ? "Connexion…" : "Flux interrompu"}
          </p>
        </div>
        <button type="button" onClick={() => void live.refresh()} className="dash-live-refresh">Actualiser</button>
      </header>

      {live.error && <p role="alert" className="dash-live-error">{live.error}</p>}

      <div className="dash-live-minis" aria-label="Résumé temps réel">
        <Mini label="En ligne" value={counts.online} Icon={IconCircle} tone="green" />
        <Mini label="Inactifs" value={counts.idle} Icon={IconClock} tone="amber" />
        <Mini label="Actifs 24 h" value={live.overview?.active_24h ?? 0} Icon={IconProfile} tone="blue" />
        <Mini label="Événements" value={live.events.length} Icon={IconActivity} tone="purple" />
      </div>

      <div className="dash-live-tabs" role="tablist" aria-label="Flux temps réel">
        <button type="button" role="tab" aria-selected={tab === "sessions"} onClick={() => setTab("sessions")}>Sessions</button>
        <button type="button" role="tab" aria-selected={tab === "feed"} onClick={() => setTab("feed")}>Activité</button>
      </div>

      <div className="dash-live-body">
        {live.loading ? (
          <div className="dash-skeleton dash-live-skeleton" aria-busy="true" />
        ) : tab === "sessions" ? (
          withStatus.length ? (
            <ul className="dash-live-list">
              {withStatus.map(({ session }) => <SessionRow key={session.userId} session={session} now={live.now} />)}
            </ul>
          ) : (
            <p className="dash-empty">Aucune session pour l’instant.</p>
          )
        ) : live.events.length ? (
          <ul className="dash-live-list">
            {live.events.map((event) => <EventRow key={event.id} event={event} now={live.now} />)}
          </ul>
        ) : (
          <p className="dash-empty">Aucune activité enregistrée pour le moment.</p>
        )}
      </div>

      <div aria-live="polite" className="dash-live-toasts">
        {live.freshEvents.map((event) => (
          <div key={event.id} className="dash-live-toast">
            <IconBolt size={13} />
            {event.displayName} · {event.label}
          </div>
        ))}
      </div>
    </section>
  );
}
