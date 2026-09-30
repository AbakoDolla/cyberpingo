"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { useAsync } from "@/hooks/useAsync";
import { listContactMessages, updateContactStatus, type ContactMessageRow } from "@/services/admin.service";
import { AdminEmpty, AdminError, AdminLoading, Notice } from "./AdminState";
import Select from "@/components/ui/Select";

const STATUS_LABELS: Record<string, string> = { nouveau: "Nouveau", en_cours: "En cours", traite: "Traité" };
const STATUSES = ["all", ...Object.keys(STATUS_LABELS)];

export default function ContactInbox({ onChanged }: { onChanged?: () => void }) {
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const { data, loading, error, reload, setData } = useAsync(() => listContactMessages(status), [status]);
  async function change(row: ContactMessageRow, next: string) {
    setNotice(null);
    try {
      const updated = await updateContactStatus(row.id, next);
      setData((current) => (current ?? []).map((item) => item.id === row.id ? updated : item));
      onChanged?.();
      setNotice({ kind: "success", text: "Statut mis à jour." });
    } catch (cause) { setNotice({ kind: "error", text: errorMessage(cause) }); }
  }
  if (loading && !data) return <AdminLoading />;
  if (error) return <AdminError message={error.message} onRetry={reload} />;
  const messages = data ?? [];
  return <section className="rounded-xl2 border border-white/5 bg-dark-navy"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/5 p-5"><div><h2 className="font-display font-semibold">Messages reçus</h2><p className="mt-1 text-xs text-white/45">Contact support, trié par date.</p></div><Select label="Statut" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUSES.map((value) => ({ value, label: value === "all" ? "Tous" : STATUS_LABELS[value] }))} className="md:w-48" /></div>{notice && <div className="p-5 pb-0"><Notice kind={notice.kind}>{notice.text}</Notice></div>}<div className="p-5">{messages.length === 0 ? <AdminEmpty>Aucun message disponible pour le moment.</AdminEmpty> : <ul className="space-y-2">{messages.map((message) => <li key={message.id} className="rounded-xl border border-white/5 bg-white/[0.02]"><button type="button" onClick={() => setOpen(open === message.id ? null : message.id)} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"><span className="min-w-0"><span className="block truncate font-medium">{message.subject}</span><span className="block text-xs text-white/42">{message.email ?? "Compte connecté"} · {formatDateTime(message.created_at)}</span></span><span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/55">{STATUS_LABELS[message.status] ?? message.status}</span></button>{open === message.id && <div className="border-t border-white/5 px-4 py-4"><p className="whitespace-pre-wrap text-sm leading-relaxed text-white/78">{message.message}</p><div className="mt-4 flex flex-wrap items-center gap-2"><select aria-label="Statut du message" value={message.status} onChange={(e) => void change(message, e.target.value)} className="rounded-xl border border-white/10 bg-cyber-black px-3 py-2 text-sm">{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{message.email && <a className="rounded-xl border border-cyber-blue/30 px-3 py-2 text-sm text-cyber-blue" href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject} — CyberPingo`)}`}>Répondre par e-mail</a>}</div></div>}</li>)}</ul>}</div></section>;
}