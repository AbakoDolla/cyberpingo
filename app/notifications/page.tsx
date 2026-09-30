"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { IconAward, IconBell, IconCertificate, IconFlame, IconLesson, IconTrash, IconTrophy, IconAlert } from "@/components/ui/Icon";
import { useLearner, useUserActions } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { formatRelative } from "@/lib/format";
import { deleteNotification, listMyNotifications, markAllNotificationsRead, markNotificationRead, subscribeToNotifications } from "@/services/notification.service";
import type { AppNotification, NotificationType } from "@/types/api";

const typeConfig: Record<NotificationType, { label: string; icon: React.ReactNode; tone: "blue" | "green" | "purple" | "red" | "neutral" }> = {
  achievement: { label: "Badge", icon: <IconAward size={18} />, tone: "purple" },
  course: { label: "Parcours", icon: <IconLesson size={18} />, tone: "blue" },
  challenge: { label: "Défi", icon: <IconTrophy size={18} />, tone: "green" },
  system: { label: "Système", icon: <IconAlert size={18} />, tone: "neutral" },
  certificate: { label: "Certificat", icon: <IconCertificate size={18} />, tone: "green" },
  streak: { label: "Série", icon: <IconFlame size={18} />, tone: "red" },
  level: { label: "Niveau", icon: <IconAward size={18} />, tone: "blue" },
};

function typeDetails(type: string) {
  return typeConfig[type as NotificationType] ?? typeConfig.system;
}

function NotificationsLoading() {
  return <div className="study-page" aria-busy="true"><div className="h-8 w-64 rounded-lg bg-white/[0.04] animate-pulse" /><div className="mt-8 grid gap-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-24 rounded-xl2 bg-white/[0.04] animate-pulse" />)}</div></div>;
}

function NotificationRow({ notification, onOpen, onDelete, busy }: { notification: AppNotification; onOpen: (notification: AppNotification) => void; onDelete: (notification: AppNotification) => void; busy: boolean }) {
  const details = typeDetails(notification.type);
  const unread = !notification.read_at;
  return <article className={`rounded-xl border p-4 transition-colors ${unread ? "border-cyber-blue/35 bg-cyber-blue/10" : "border-white/5 bg-dark-navy"}`}>
    <div className="flex gap-4">
      <button type="button" className="flex flex-1 items-start gap-4 text-left" onClick={() => onOpen(notification)} disabled={busy}>
        <span className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${unread ? "bg-cyber-blue/15 text-cyber-blue" : "bg-white/5 text-white/55"}`}>{details.icon}</span>
        <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="font-display text-base">{notification.title}</strong><Badge tone={details.tone}>{details.label}</Badge>{unread && <Badge tone="blue">Non lue</Badge>}</span><span className="mt-1 block text-sm leading-6 text-white/60">{notification.body}</span><span className="mt-2 block text-xs text-white/35">{formatRelative(notification.created_at)}{notification.link ? " · ouvrir le lien" : ""}</span></span>
      </button>
      <button type="button" className="h-10 w-10 rounded-lg text-white/35 transition-colors hover:bg-cyber-red/10 hover:text-cyber-red" onClick={() => onDelete(notification)} disabled={busy} aria-label="Supprimer la notification"><IconTrash size={16} className="mx-auto" /></button>
    </div>
  </article>;
}

function NotificationsContent() {
  const router = useRouter();
  const { profile } = useLearner();
  const { setUnreadNotifications } = useUserActions();
  const { data, error, loading, reload, setData } = useAsync(() => listMyNotifications(profile.id), [profile.id]);
  const [status, setStatus] = useState<{ message: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setUnreadNotifications(data.filter((notification) => !notification.read_at).length);
  }, [data, setUnreadNotifications]);

  useEffect(() => subscribeToNotifications(profile.id, (notification) => {
    setData((current) => {
      const list = current ?? [];
      if (list.some((item) => item.id === notification.id)) return list;
      return [notification, ...list].slice(0, 50);
    });
    setUnreadNotifications((count) => count + 1);
  }), [profile.id, setData, setUnreadNotifications]);

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
    } finally { setBusy(false); }
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
    } finally { setBusy(false); }
  }

  async function remove(notification: AppNotification) {
    setBusy(true);
    setStatus(null);
    try {
      await deleteNotification(notification.id);
      setData((current) => (current ?? []).filter((item) => item.id !== notification.id));
      if (!notification.read_at) setUnreadNotifications((count) => count - 1);
      setStatus({ message: "Notification supprimée." });
    } catch (cause) {
      setStatus({ message: errorMessage(cause, "La notification n’a pas pu être supprimée."), error: true });
    } finally { setBusy(false); }
  }

  if (loading) return <NotificationsLoading />;
  if (error) return <div className="study-page"><Card className="border-cyber-red/30 bg-cyber-red/10"><h1 className="font-display text-2xl font-semibold">Impossible de charger les notifications.</h1><p className="mt-3 text-sm text-red-100">{error.message}</p><Button type="button" variant="secondary" className="mt-5" onClick={() => void reload()}>Réessayer</Button></Card></div>;
  const notifications = data ?? [];
  const unread = notifications.filter((notification) => !notification.read_at).length;

  return <div className="study-page space-y-6">
    <header className="study-heading"><p className="text-[11px] uppercase tracking-[0.2em] text-cyber-blue">Notifications</p><h1>Ce qui mérite ton attention.</h1><p>Récompenses, rappels de série, certificats et annonces apparaissent ici en temps réel.</p></header>
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyber-blue/10 text-cyber-blue"><IconBell size={20} /></div><div><p className="font-display text-xl font-semibold">{unread} non lue{unread > 1 ? "s" : ""}</p><p className="text-sm text-white/50">{notifications.length} notification{notifications.length > 1 ? "s" : ""} au total</p></div></div><Button type="button" variant="secondary" onClick={() => void markAll()} disabled={busy || unread === 0}>Tout marquer comme lu</Button></Card>
    {status && <p className={`settings-status ${status.error ? "is-error" : ""}`} role={status.error ? "alert" : "status"}>{status.message}</p>}
    {notifications.length === 0 ? <Card className="text-center"><IconBell size={28} className="mx-auto text-cyber-blue" /><h2 className="mt-3 font-display text-xl font-semibold">Aucune notification pour le moment.</h2><p className="mt-2 text-sm text-white/55">Tes récompenses et rappels apparaîtront ici.</p></Card> : <div className="grid gap-3">{notifications.map((notification) => <NotificationRow key={notification.id} notification={notification} busy={busy} onOpen={(item) => void openNotification(item)} onDelete={(item) => void remove(item)} />)}</div>}
  </div>;
}

export default function NotificationsPage() {
  return <AppShell><NotificationsContent /></AppShell>;
}