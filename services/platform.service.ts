"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AppError, unwrap } from "@/lib/errors";
import type { MentorQuota } from "@/types/api";

export const CONTACT_SUBJECTS = ["Signaler un problème", "Proposer un contenu", "Améliorer une explication", "Autre"] as const;
export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];

/** Public feedback form (rate-limited to 5 messages per hour per account or per client address). */
export async function submitContactMessage(subject: ContactSubject, email: string, message: string) {
  const text = message.trim();
  const address = email.trim();
  if (text.length < 20 || text.length > 5000) throw new AppError("invalid", "Ton message doit contenir entre 20 et 5000 caractères.");
  if (address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new AppError("invalid", "Cette adresse e-mail n’est pas valide.");
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("submit_contact_message", { p_subject: subject, p_email: address, p_message: text }), "Ton message n’a pas pu être envoyé. Réessaie.");
}

/** Presence ping for the admin live view (every minute while the app is open). */
export function sendHeartbeat(page: string, visible: boolean) {
  const supabase = getSupabaseBrowserClient();
  // Supabase queries are lazy: `then` is what sends the request. Failures are harmless here.
  return supabase.rpc("heartbeat", { p_page: page.slice(0, 200), p_visible: visible }).then(() => undefined, () => undefined);
}

/** Daily AI mentor allowance, counted server-side. */
export async function consumeMentorQuota(): Promise<MentorQuota> {
  const supabase = getSupabaseBrowserClient();
  return unwrap(await supabase.rpc("consume_mentor_quota"), "Le mentor est indisponible pour le moment.") as unknown as MentorQuota;
}
