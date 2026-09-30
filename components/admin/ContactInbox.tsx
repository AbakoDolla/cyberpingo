"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/learner-mapping";
import { cn } from "@/lib/utils";
import type { ContactMessageRow, ContactStatus } from "@/types/database";
import { IconSend, IconChevronDown } from "@/components/ui/Icon";

const STATUS_META: Record<ContactStatus, { label: string; tone: string }> = {
  nouveau: { label: "Nouveau", tone: "border-cyber-red/30 bg-cyber-red/10 text-red-200" },
  en_cours: { label: "En cours", tone: "border-cyber-yellow/30 bg-cyber-yellow/10 text-cyber-yellow" },
  traite: { label: "Traité", tone: "border-cyber-green/25 bg-cyber-green/10 text-cyber-green" },
};

type Filter = "ouverts" | ContactStatus | "tous";

export default function ContactInbox({ onChanged }: { onChanged?: () => void }) {
  const [messages, setMessages] = useState<ContactMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ouverts");
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await getSupabaseBrowserClient()
      .from("contact_messages")
      .select("id, user_id, email, subject, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (queryError) setError(friendlyError(queryError, "Impossible de charger les messages."));
    else setMessages((data ?? []) as ContactMessageRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => messages.reduce(
    (acc, message) => ({ ...acc, [message.status]: acc[message.status] + 1 }),
    { nouveau: 0, en_cours: 0, traite: 0 } as Record<ContactStatus, number>
  ), [messages]);

  const visible = useMemo(() => messages.filter((message) =>
    filter === "tous" || (filter === "ouverts" ? message.status !== "traite" : message.status === filter)
  ), [messages, filter]);

  async function setStatus(message: ContactMessageRow, status: ContactStatus) {
    if (message.status === status) return;
    setSaving(message.id);
    setError(null);
    const { error: updateError } = await getSupabaseBrowserClient().from("contact_messages").update({ status }).eq("id", message.id);
    setSaving(null);
    if (updateError) {
      setError(friendlyError(updateError, "Le statut n’a pas pu être mis à jour."));
      return;
    }
    setMessages((current) => current.map((item) => item.id === message.id ? { ...item, status } : item));
    onChanged?.();
  }

  function toggle(message: ContactMessageRow) {
    const opening = openId !== message.id;
    setOpenId(opening ? message.id : null);
    if (opening && message.status === "nouveau") void setStatus(message, "en_cours");
  }

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "ouverts", label: "À traiter", count: counts.nouveau + counts.en_cours },
    { key: "nouveau", label: "Nouveaux", count: counts.nouveau },
    { key: "traite", label: "Traités", count: counts.traite },
    { key: "tous", label: "Tous", count: messages.length },
  ];

  return (
    <section className="bg-dark-navy border border-white/5 rounded-xl2 overflow-hidden" aria-labelledby="inbox-title">
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-5 border-b border-white/5">
        <div>
          <h2 id="inbox-title" className="font-display font-semibold text-base">Messages reçus</h2>
          <p className="text-xs text-white/45 mt-0.5">Envoyés depuis la page Contact. Ouvrir un nouveau message le passe « En cours ».</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/60 hover:text-white hover:border-white/25 disabled:opacity-50">
          Actualiser
        </button>
      </div>

      <div className="flex gap-2 px-6 pt-4 flex-wrap" role="group" aria-label="Filtrer les messages">
        {FILTERS.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              filter === key ? "border-cyber-blue/40 bg-cyber-blue/15 text-cyber-blue" : "border-white/10 text-white/55 hover:text-white"
            )}
          >
            {label} <span className="tabular-nums opacity-70">{count}</span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mx-6 mt-4 rounded-xl border border-cyber-red/30 bg-cyber-red/10 px-4 py-3 text-sm text-red-100">{error}</p>}

      <div className="p-6">
        {loading && messages.length === 0 ? (
          <div className="space-y-2" aria-busy="true">{[0, 1, 2].map((index) => <div key={index} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />)}</div>
        ) : visible.length === 0 ? (
          <div className="py-10 text-center">
            <IconSend size={22} className="mx-auto text-white/25" />
            <p className="mt-3 text-sm text-white/50">{filter === "ouverts" ? "Aucun message en attente. Tout est traité." : "Aucun message dans cette vue."}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((message) => {
              const open = openId === message.id;
              const date = new Date(message.created_at);
              return (
                <li key={message.id} className={cn("rounded-xl border transition-colors", open ? "border-white/15 bg-white/[0.02]" : "border-white/5")}>
                  <button
                    type="button"
                    onClick={() => toggle(message)}
                    aria-expanded={open}
                    aria-controls={`message-${message.id}`}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px]", STATUS_META[message.status].tone)}>{STATUS_META[message.status].label}</span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm truncate", message.status === "nouveau" ? "font-semibold text-white" : "text-white/80")}>{message.subject}</span>
                      <span className="block text-[11px] text-white/40 truncate">
                        {message.email ?? (message.user_id ? "Apprenant connecté, sans adresse de réponse" : "Anonyme")} · {date.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </span>
                    <IconChevronDown size={15} className={cn("shrink-0 text-white/40 transition-transform duration-200", open && "rotate-180")} />
                  </button>
                  {open && (
                    <div id={`message-${message.id}`} className="border-t border-white/5 px-4 py-4 animate-fade-in-up">
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/80">{message.message}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {message.email && (
                          <a
                            href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject} — CyberPingo`)}`}
                            className="rounded-full border border-cyber-blue/30 bg-cyber-blue/10 px-3 py-1 text-xs text-cyber-blue hover:bg-cyber-blue/20"
                          >
                            Répondre par e-mail
                          </a>
                        )}
                        <label className="sr-only" htmlFor={`status-${message.id}`}>Statut du message</label>
                        <select
                          id={`status-${message.id}`}
                          value={message.status}
                          disabled={saving === message.id}
                          onChange={(event) => void setStatus(message, event.target.value as ContactStatus)}
                          className="rounded-full border border-white/10 bg-cyber-black/60 px-3 py-1 text-xs focus:border-cyber-blue/60 focus:outline-none"
                        >
                          <option value="nouveau">Nouveau</option>
                          <option value="en_cours">En cours</option>
                          <option value="traite">Traité</option>
                        </select>
                        {message.status !== "traite" && (
                          <button type="button" disabled={saving === message.id} onClick={() => void setStatus(message, "traite")} className="rounded-full border border-cyber-green/30 px-3 py-1 text-xs text-cyber-green hover:bg-cyber-green/10 disabled:opacity-50">
                            Marquer comme traité
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
