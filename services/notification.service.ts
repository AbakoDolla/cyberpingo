"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { unwrap } from "@/lib/errors";
import type { AppNotification } from "@/types/api";

export async function listMyNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
  const supabase = getSupabaseBrowserClient();
  return (unwrap(
    await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit),
    "Impossible de charger tes notifications.",
  ) ?? []) as AppNotification[];
}

export async function countUnreadNotifications(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(id: string) {
  const supabase = getSupabaseBrowserClient();
  unwrap(await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null), "La notification n’a pas pu être mise à jour.");
}

export async function markAllNotificationsRead() {
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("mark_all_notifications_read"), "Les notifications n’ont pas pu être mises à jour.") ?? 0;
}

export async function deleteNotification(id: string) {
  const supabase = getSupabaseBrowserClient();
  unwrap(await supabase.from("notifications").delete().eq("id", id), "La notification n’a pas pu être supprimée.");
}

/** Live delivery of new notifications (Realtime publication on public.notifications, filtered by RLS). */
let notificationChannelSeq = 0;

export function subscribeToNotifications(userId: string, onInsert: (notification: AppNotification) => void): () => void {
  const supabase = getSupabaseBrowserClient();
  const channel: RealtimeChannel = supabase
    .channel(`notifications:${userId}:${++notificationChannelSeq}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
      onInsert(payload.new as AppNotification);
    })
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
