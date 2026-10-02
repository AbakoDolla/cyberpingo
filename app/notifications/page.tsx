"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  IconAlert,
  IconAward,
  IconBell,
  IconCertificate,
  IconFlame,
  IconLesson,
  IconTrash,
  IconTrophy,
} from "@/components/ui/Icon";
import { useLearner, useUserActions } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatRelative } from "@/lib/format";
import {
  deleteNotification,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "@/services/notification.service";
import type { AppNotification, NotificationType } from "@/types/api";

const typeConfig: Record<NotificationType, { label: string; icon: ReactNode; tone: "blue" | "green" | "purple" | "red" | "neutral" }> = {
  achievement: { label: "Badge", icon: <IconAward size={18} />, tone: "purple" },
  course: { label: "Parcours", icon: <IconLesson size={18} />, tone: "blue" },
  challenge: { label: "Défi", icon: <IconTrophy size={18} />, tone: "green" },
  system: { label: "Système", icon: <IconAlert size={18} />, tone: "neutral" },
  certificate: { label: "Certificat", icon: <IconCertificate size={18} />, tone: "green" },
  streak: { label: "Série", icon: <IconFlame size={18} />, tone: "red" },
  level: { label: "Niveau", icon: <IconAward size={18} />, tone: "blue" },
};
const TYPE_ORDER: NotificationType[] = ["achievement", "course", "challenge", "certificate", "streak", "level", "system"];
const UNDO_DELAY_MS = 6500;

type Filter = "all" | "unread" | NotificationType;
type Status = { message: string; error?: boolean; undoId?: string } | null;

function typeDetails(type: string) {
  return typeConfig[type as NotificationType] ?? typeConfig.system;
}

function sortNotifications(list: AppNotification[]) {
  return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function dayLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((start - target) / 86400000);
  if (diff === 0) return "Aujourd’hui";
  if (diff === 1) return "Hier";
  return formatDate(value);
}

function NotificationsLoading() {
  return (
    <div className="study-page acct-page notif-page" aria-busy="true">
      <div className="notif-hero">
        <div className="ui-skeleton ui-skeleton--title" />
        <div className="ui-skeleton ui-skeleton--line" />
      </div>
      <div className="notif-list">
        {Array.from({ length: 5 }).map((_, index) => <div key={index} className="ui-skeleton notif-skeleton-row" />)}
      </div>
    </div>
  );
}

function NotificationRow({
  notification,
  onOpen,
  onDelete,
  busy,
}: {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
  onDelete: (notification: AppNotification) => void;
  busy: boolean;
}) {
  const details = typeDetails(notification.type);
  const unread = !notification.read_at;
  return (
    <article className={`notif-row ${unread ? "is-unread" : ""}`}>
      <button type="button" className="notif-row__open" onClick={() => onOpen(notification)} disabled={busy}>
        <span className="notif-row__icon">{details.icon}</span>
        <span className="notif-row__body">
          <span className="notif-row__title">
            <strong>{notification.title}</strong>
            <Badge tone={details.tone}>{details.label}</Badge>
            {unread && <Badge tone="blue">Non lue</Badge>}
          </span>
          <span className="notif-row__text">{notification.body}</span>
          <span className="notif-row__meta">{formatRelative(notification.created_at)}{notification.link ? " · ouvrir le lien" : ""}</span>
        </span>
      </button>
      <button
        type="button"
        className="notif-row__delete"
        onClick={() => onDelete(notification)}
        disabled={busy}
        aria-label={`Supprimer ${notification.title}`}
      >
        <IconTrash size={16} />
      </button>
    </article>
  );
}

function NotificationsContent() {
  const router = useRouter();
  const { profile } = useLearner();
  const { setUnreadNotifications } = useUserActions();
  const { data, error, loading, reload, setData } = useAsync(() => listMyNotifications(profile.id), [profile.id]);
  const [status, setStatus] = useState<Status>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<Record<string, AppNotification>>({});
  const deleteTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingDeletesRef = useRef(pendingDeletes);

  useEffect(() => {
    pendingDeletesRef.current = pendingDeletes;
  }, [pendingDeletes]);

  useEffect(() => {
    const timers = deleteTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      Object.values(pendingDeletesRef.current).forEach((notification) => {
        void deleteNotification(notification.id);
      });
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    setUnreadNotifications(data.filter((notification) => !notification.read_at).length);
  }, [data, setUnreadNotifications]);

  useEffect(() => subscribeToNotifications(profile.id, (notification) => {
    setData((current) => {
      const list = current ?? [];
      if (list.some((item) => item.id === notification.id)) return list;
      return sortNotifications([notification, ...list]).slice(0, 50);
    });
    setStatus({ message: "Nouvelle notification reçue." });
  }), [profile.id, setData]);

  const notifications = useMemo(() => data ?? [], [data]);
  const unread = notifications.filter((notification) => !notification.read_at).length;
  const typeCounts = useMemo(() => TYPE_ORDER.reduce<Record<NotificationType, number>>((acc, type) => {
    acc[type] = notifications.filter((notification) => notification.type === type).length;
    return acc;
  }, {
    achievement: 0,
    course: 0,
    challenge: 0,
    system: 0,
    certificate: 0,
    streak: 0,
    level: 0,
  }), [notifications]);
  const filtered = useMemo(() => notifications.filter((notification) => {
    if (filter === "all") return true;
    if (filter === "unread") return !notification.read_at;
    return notification.type === filter;
  }), [filter, notifications]);
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: AppNotification[] }>();
    filtered.forEach((notification) => {
      const key = new Date(notification.created_at).toLocaleDateString("fr-FR");
      const current = map.get(key) ?? { label: dayLabel(notification.created_at), items: [] };
      current.items.push(notification);
      map.set(key, current);
    });
    return Array.from(map.values());
  }, [filtered]);

  async function openNotification(notification: AppNotification) {
    setBusy(true);
    setStatus(null);
    try {
      if (!notification.read_at) {
        await markNotificationRead(notification.id);
        const readAt = new Date().toISOString();
        setData((current) => (current ?? []).map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item));
        setUnreadNotifications((count) => count - 1);
      }
      if (notification.link) router.push(notification.link);
    } catch (cause) {
      setStatus({ message: errorMessage(cause, "La notification n’a pas pu être mise à jour."), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function markAll() {
    setBusy(true);
    setStatus(null);
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setData((current) => (current ?? []).map((item) => ({ ...item, read_at: item.read_at ?? readAt })));
      setUnreadNotifications(0);
      setStatus({ message: "Toutes les notifications sont marquées comme lues." });
    } catch (cause) {
      setStatus({ message: errorMessage(cause, "Les notifications n’ont pas pu être mises à jour."), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function commitDelete(notification: AppNotification) {
    deleteTimers.current.delete(notification.id);
    setPendingDeletes((current) => {
      const next = { ...current };
      delete next[notification.id];
      return next;
    });
    try {
      await deleteNotification(notification.id);
      setStatus((current) => current?.undoId === notification.id ? { message: "Notification supprimée définitivement." } : current);
    } catch (cause) {
      setData((current) => sortNotifications([notification, ...(current ?? [])]));
      setStatus({ message: errorMessage(cause, "La notification n’a pas pu être supprimée."), error: true });
    }
  }

  function remove(notification: AppNotification) {
    if (deleteTimers.current.has(notification.id)) return;
    setData((current) => (current ?? []).filter((item) => item.id !== notification.id));
    if (!notification.read_at) setUnreadNotifications((count) => count - 1);
    setPendingDeletes((current) => ({ ...current, [notification.id]: notification }));
    setStatus({ message: "Notification retirée de la liste.", undoId: notification.id });
    const timer = setTimeout(() => void commitDelete(notification), UNDO_DELAY_MS);
    deleteTimers.current.set(notification.id, timer);
  }

  function undoDelete(id: string) {
    const notification = pendingDeletes[id];
    if (!notification) return;
    const timer = deleteTimers.current.get(id);
    if (timer) clearTimeout(timer);
    deleteTimers.current.delete(id);
    setPendingDeletes((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setData((current) => sortNotifications([notification, ...(current ?? [])]));
    if (!notification.read_at) setUnreadNotifications((count) => count + 1);
    setStatus({ message: "Suppression annulée." });
  }

  if (loading) return <NotificationsLoading />;
  if (error) {
    return (
      <div className="study-page acct-page">
        <div className="ui-state is-error" role="alert">
          <span className="ui-state__icon"><IconAlert size={20} /></span>
          <h1>Impossible de charger les notifications.</h1>
          <p className="ui-state__body">{error.message}</p>
          <Button type="button" variant="secondary" onClick={() => void reload()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="study-page acct-page notif-page">
      <header className="notif-hero">
        <div>
          <h1>Centre de notifications</h1>
          <p>Récompenses, rappels de série, certificats et annonces arrivent ici en temps réel.</p>
        </div>
        <div className="notif-summary" aria-label="Résumé des notifications">
          <IconBell size={24} aria-hidden="true" />
          <strong>{unread}</strong>
          <span>non lue{unread > 1 ? "s" : ""}</span>
          <small>{notifications.length} au total</small>
        </div>
      </header>

      <section className="notif-toolbar" aria-label="Actions sur les notifications">
        <div className="notif-filters" role="list" aria-label="Filtres">
          <button type="button" className={filter === "all" ? "is-active" : undefined} onClick={() => setFilter("all")}>Toutes <span>{notifications.length}</span></button>
          <button type="button" className={filter === "unread" ? "is-active" : undefined} onClick={() => setFilter("unread")}>Non lues <span>{unread}</span></button>
          {TYPE_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              className={filter === type ? "is-active" : undefined}
              onClick={() => setFilter(type)}
              disabled={typeCounts[type] === 0}
            >
              {typeConfig[type].label} <span>{typeCounts[type]}</span>
            </button>
          ))}
        </div>
        <Button type="button" variant="secondary" onClick={() => void markAll()} loading={busy} disabled={busy || unread === 0}>
          Tout marquer comme lu
        </Button>
      </section>

      {status && (
        <div className={`acct-status notif-status ${status.error ? "is-error" : ""}`} role={status.error ? "alert" : "status"} aria-live="polite">
          <span>{status.message}</span>
          {status.undoId && <button type="button" onClick={() => undoDelete(status.undoId ?? "")}>Annuler</button>}
        </div>
      )}

      {notifications.length === 0 ? (
        <section className="notif-empty">
          <IconBell size={30} aria-hidden="true" />
          <h2>Aucune notification pour le moment.</h2>
          <p>Tes récompenses, rappels et certificats apparaîtront ici dès qu’ils seront disponibles.</p>
        </section>
      ) : groups.length === 0 ? (
        <section className="notif-empty">
          <IconBell size={30} aria-hidden="true" />
          <h2>Aucun résultat avec ce filtre.</h2>
          <p>Change de filtre ou marque les notifications comme lues pour clarifier la liste.</p>
        </section>
      ) : (
        <div className="notif-list">
          {groups.map((group) => (
            <section key={group.label} className="notif-day" aria-labelledby={`notif-day-${group.label}`}>
              <h2 id={`notif-day-${group.label}`}>{group.label}</h2>
              <div className="notif-day__items">
                {group.items.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    busy={busy}
                    onOpen={(item) => void openNotification(item)}
                    onDelete={remove}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  return <AppShell><NotificationsContent /></AppShell>;
}
