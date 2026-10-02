"use client";

import { useMemo, useState } from "react";
import { formatDateTime, formatRelative } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { useAsync } from "@/hooks/useAsync";
import { listContactMessages, updateContactStatus, type ContactMessageRow } from "@/services/admin.service";
import { AdminEmpty, AdminError, AdminLoading, Notice } from "./AdminState";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

const STATUS_LABELS: Record<string, string> = { nouveau: "Nouveau", en_cours: "En cours", traite: "Traité" };
const STATUSES = ["all", ...Object.keys(STATUS_LABELS)];

export default function ContactInbox({ onChanged }: { onChanged?: () => void }) {
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const { data, loading, error, reload, setData } = useAsync(() => listContactMessages(status), [status]);
  const messages = useMemo(() => {
    const needle = query.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return (data ?? [])
      .filter((message) => {
        if (!needle) return true;
        return [message.subject, message.email, message.message].some((value) => value && value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sort === "status") return (STATUS_LABELS[a.status] ?? a.status).localeCompare(STATUS_LABELS[b.status] ?? b.status, "fr");
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [data, query, sort]);
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
  return (
    <section className="adm-panel">
      <div className="adm-panel__head">
        <div>
          <h2 className="adm-section-title">Messages reçus</h2>
          <p className="adm-muted mt-1 text-sm">Contact support, triage par statut et réponse par e-mail.</p>
        </div>
      </div>
      <div className="adm-toolbar">
        <div className="adm-toolbar__grow">
          <Input label="Rechercher" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sujet, e-mail, contenu" autoComplete="off" />
        </div>
        <Select label="Statut" value={status} onChange={(event) => setStatus(event.target.value)} options={STATUSES.map((value) => ({ value, label: value === "all" ? "Tous" : STATUS_LABELS[value] }))} />
        <Select label="Tri" value={sort} onChange={(event) => setSort(event.target.value)} options={[{ value: "recent", label: "Plus récents" }, { value: "oldest", label: "Plus anciens" }, { value: "status", label: "Statut" }]} />
      </div>
      <p className="adm-summary" aria-live="polite">{messages.length} message{messages.length > 1 ? "s" : ""} affiché{messages.length > 1 ? "s" : ""}</p>
      {notice && <div className="mb-4"><Notice kind={notice.kind}>{notice.text}</Notice></div>}
      {messages.length === 0 ? (
        <AdminEmpty>{query ? "Aucun message ne correspond à ces filtres." : "Aucun message disponible pour le moment."}</AdminEmpty>
      ) : (
        <ul className="adm-list">
          {messages.map((message) => (
            <li key={message.id} className="adm-list-row">
              <button type="button" onClick={() => setOpen(open === message.id ? null : message.id)} className="adm-list-button">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-white">{message.subject}</span>
                  <span className="adm-muted mt-1 block text-xs">{message.email ?? "Compte connecté"} · <time dateTime={message.created_at} title={formatDateTime(message.created_at)}>{formatRelative(message.created_at)}</time></span>
                </span>
                <Badge tone={message.status === "nouveau" ? "blue" : message.status === "en_cours" ? "amber" : "green"}>{STATUS_LABELS[message.status] ?? message.status}</Badge>
              </button>
              {open === message.id && (
                <div className="border-t border-[var(--cp-line)] px-4 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-cyan-50/85">{message.message}</p>
                  <div className="adm-row-actions mt-4">
                    <select aria-label="Statut du message" value={message.status} onChange={(event) => void change(message, event.target.value)} className="adm-native-select max-w-48 text-sm">
                      {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    {message.email && <a className="adm-action-link" href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject} — CyberPingo`)}`}>Répondre par e-mail</a>}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}