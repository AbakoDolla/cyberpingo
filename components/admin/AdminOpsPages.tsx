"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { IconBell, IconCertificate } from "@/components/ui/Icon";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatDateTime, formatNumber, formatRelative, plural } from "@/lib/format";
import {
  adminBroadcastNotification, adminRestoreCertificate, adminRevokeCertificate, listAdminLogs, listCertificates,
  type AdminCertificate, type AdminLogRow,
} from "@/services/admin.service";
import type { Json } from "@/types/database.types";
import ContactInbox from "./ContactInbox";
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader, ConfirmModal, Notice } from "./AdminState";
import { Field, Textarea } from "./AdminFields";

type Flash = { kind: "success" | "error"; text: string } | null;
const PAGE_SIZE = 50;
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// ─── Certificates ────────────────────────────────────────────────────────────

export function AdminCertificatesPage() {
  const searchId = useId();
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("issued");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const [revoking, setRevoking] = useState<AdminCertificate | null>(null);
  const [restoring, setRestoring] = useState<AdminCertificate | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const certificates = useAsync(() => listCertificates({ search, limit }), [search, limit]);
  const rows = useMemo(() => {
    const filtered = (certificates.data ?? []).filter((certificate) => {
      if (status === "valid") return !certificate.revoked_at;
      if (status === "revoked") return Boolean(certificate.revoked_at);
      return true;
    });
    return filtered.sort((a, b) => {
      if (sort === "name") return a.recipient_name.localeCompare(b.recipient_name, "fr");
      if (sort === "course") return (a.course?.title ?? a.course_title).localeCompare(b.course?.title ?? b.course_title, "fr");
      return new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime();
    });
  }, [certificates.data, sort, status]);
  const revoked = rows.filter((row) => row.revoked_at).length;

  function applySearch(event: FormEvent) {
    event.preventDefault();
    setLimit(PAGE_SIZE);
    setSearch(draft.trim());
  }

  function patch(id: string, changes: Partial<AdminCertificate>) {
    certificates.setData((current) => current?.map((row) => (row.id === id ? { ...row, ...changes } : row)));
  }

  async function revoke(certificate: AdminCertificate, inputReason: string) {
    const reason = inputReason.trim();
    if (reason.length < 5 || reason.length > 300) {
      setFlash({ kind: "error", text: "Le motif doit contenir entre 5 et 300 caractères. Rien n’a été modifié." });
      return;
    }
    setBusyId(certificate.id);
    setFlash(null);
    try {
      await adminRevokeCertificate(certificate.id, reason);
      patch(certificate.id, { revoked_at: new Date().toISOString(), revoked_reason: reason });
      setFlash({ kind: "success", text: `Certificat ${certificate.certificate_number} révoqué. Le titulaire a été notifié.` });
      setRevoking(null);
      setRevokeReason("");
    } catch (cause) {
      setFlash({ kind: "error", text: errorMessage(cause, "Le certificat n’a pas pu être révoqué.") });
    } finally {
      setBusyId(null);
    }
  }

  async function restore(certificate: AdminCertificate) {
    setBusyId(certificate.id);
    setFlash(null);
    try {
      await adminRestoreCertificate(certificate.id);
      patch(certificate.id, { revoked_at: null, revoked_reason: null });
      setFlash({ kind: "success", text: `Certificat ${certificate.certificate_number} rétabli.` });
      setRestoring(null);
    } catch (cause) {
      setFlash({ kind: "error", text: errorMessage(cause, "Le certificat n’a pas pu être rétabli.") });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Certificats"
        description="Certificats délivrés automatiquement à la fin d’un parcours. Une révocation est immédiatement visible sur la page publique de vérification."
      />
      <form onSubmit={applySearch} className="adm-toolbar" role="search">
        <div className="adm-toolbar__grow">
          <Input id={searchId} type="search" label="Rechercher" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Numéro, code de vérification, titulaire ou cours" autoComplete="off" />
        </div>
        <Select label="Statut" value={status} onChange={(event) => setStatus(event.target.value)} options={[{ value: "all", label: "Tous" }, { value: "valid", label: "Valides" }, { value: "revoked", label: "Révoqués" }]} />
        <Select label="Tri" value={sort} onChange={(event) => setSort(event.target.value)} options={[{ value: "issued", label: "Délivrance récente" }, { value: "name", label: "Titulaire A-Z" }, { value: "course", label: "Cours A-Z" }]} />
        <Button type="submit" variant="secondary" size="md">Rechercher</Button>
      </form>
      {flash && <div className="mb-4"><Notice kind={flash.kind}>{flash.text}</Notice></div>}

      {certificates.loading && !certificates.data ? (
        <AdminLoading label="Chargement des certificats…" />
      ) : certificates.error && !certificates.data ? (
        <AdminError message={certificates.error.message} onRetry={() => void certificates.reload()} />
      ) : !rows.length ? (
        <AdminEmpty>{search ? `Aucun certificat ne correspond à « ${search} ».` : "Aucun certificat délivré pour le moment. Ils apparaîtront ici dès qu’un apprenant terminera un parcours."}</AdminEmpty>
      ) : (
        <>
          <p className="mb-3 text-sm text-white/60" aria-live="polite">
            {formatNumber(rows.length)} certificat{rows.length > 1 ? "s" : ""} affiché{rows.length > 1 ? "s" : ""}
            {revoked > 0 && ` · ${formatNumber(revoked)} révoqué${revoked > 1 ? "s" : ""}`}
          </p>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <caption className="sr-only">Certificats délivrés, du plus récent au plus ancien</caption>
              <thead>
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Titulaire</th>
                  <th scope="col" className="px-4 py-3 font-medium">Cours</th>
                  <th scope="col" className="px-4 py-3 font-medium">Numéro</th>
                  <th scope="col" className="px-4 py-3 font-medium">Délivré le</th>
                  <th scope="col" className="px-4 py-3 font-medium">Statut</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((certificate) => {
                  const contact = certificate.profile?.email || (certificate.profile?.username ? `@${certificate.profile.username}` : null);
                  const busy = busyId === certificate.id;
                  return (
                    <tr key={certificate.id} className="align-top">
                      <td className="px-4 py-3">
                        {certificate.profile?.id ? (
                          <Link href={`/admin/utilisateurs/${certificate.profile.id}`} className="font-medium text-white hover:text-cyan-100">{certificate.recipient_name}</Link>
                        ) : (
                          <span className="font-medium text-white">{certificate.recipient_name}</span>
                        )}
                        {contact && <span className="mt-0.5 block text-white/60">{contact}</span>}
                      </td>
                      <td className="px-4 py-3 text-white/80">{certificate.course?.title ?? certificate.course_title}</td>
                      <td className="px-4 py-3 font-mono text-white/80">{certificate.certificate_number}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-white/80">{formatDate(certificate.issued_at)}</td>
                      <td className="px-4 py-3">
                        {certificate.revoked_at ? (
                          <>
                            <Badge tone="red">Révoqué</Badge>
                            {certificate.revoked_reason && <span className="mt-1 block max-w-[16rem] text-white/60">{certificate.revoked_reason}</span>}
                          </>
                        ) : (
                          <Badge tone="green">Valide</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <a
                            href={`/certificat/${encodeURIComponent(certificate.verification_code)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="adm-action-link"
                          >
                            Vérifier<span className="sr-only"> le certificat {certificate.certificate_number} (nouvel onglet)</span>
                          </a>
                          {certificate.revoked_at ? (
                            <Button type="button" size="sm" variant="secondary" loading={busy} disabled={busyId !== null} onClick={() => setRestoring(certificate)}>Rétablir</Button>
                          ) : (
                            <Button type="button" size="sm" variant="danger" loading={busy} disabled={busyId !== null} onClick={() => { setRevoking(certificate); setRevokeReason(""); }}>Révoquer</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length >= limit && (
            <div className="mt-4 flex justify-center">
              <Button type="button" variant="ghost" loading={certificates.loading} onClick={() => setLimit((value) => value + PAGE_SIZE)}>Charger plus</Button>
            </div>
          )}
          {certificates.error && <div className="mt-4"><Notice kind="error">{certificates.error.message}</Notice></div>}
        </>
      )}
      <ConfirmModal
        open={Boolean(revoking)}
        title="Révoquer le certificat"
        description={revoking ? `Le certificat ${revoking.certificate_number} de ${revoking.recipient_name} sera invalidé publiquement.` : ""}
        danger
        confirmLabel="Révoquer"
        loading={busyId === revoking?.id}
        onCancel={() => { setRevoking(null); setRevokeReason(""); }}
        onConfirm={() => { if (revoking) void revoke(revoking, revokeReason); }}
      >
        <Field label="Motif visible par le titulaire (5 à 300 caractères)">
          <Textarea rows={4} value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} autoFocus />
        </Field>
      </ConfirmModal>
      <ConfirmModal
        open={Boolean(restoring)}
        title="Rétablir le certificat"
        description={restoring ? `Le certificat ${restoring.certificate_number} redeviendra valide sur la page de vérification.` : ""}
        confirmLabel="Rétablir"
        loading={busyId === restoring?.id}
        onCancel={() => setRestoring(null)}
        onConfirm={() => { if (restoring) void restore(restoring); }}
      />
    </div>
  );
}

// ─── Audit log ───────────────────────────────────────────────────────────────

type LogCategory = "contenu" | "utilisateurs" | "certificats" | "annonces" | "autre";

const CATEGORY_LABELS: Record<LogCategory, string> = {
  contenu: "Contenu",
  utilisateurs: "Utilisateurs",
  certificats: "Certificats",
  annonces: "Annonces",
  autre: "Autre",
};
const CATEGORY_TONES: Record<LogCategory, "blue" | "purple" | "green" | "neutral"> = {
  contenu: "blue",
  utilisateurs: "purple",
  certificats: "green",
  annonces: "neutral",
  autre: "neutral",
};
const VERBS: Record<string, string> = { insert: "Création", update: "Modification", delete: "Suppression" };
const TABLES: Record<string, string> = {
  courses: "cours",
  course_modules: "module",
  lessons: "leçon",
  quizzes: "quiz",
  labs: "lab",
  badges: "badge",
  challenges: "défi",
};
const ACTION_LABELS: Record<string, string> = {
  set_role: "Changement de rôle",
  adjust_xp: "Ajustement d’XP",
  save_quiz: "Questions de quiz enregistrées",
  set_lab_flag: "Réponse de lab définie",
  import_course: "Import de cours",
  revoke_certificate: "Certificat révoqué",
  restore_certificate: "Certificat rétabli",
  broadcast_notification: "Annonce envoyée",
  auth_ban: "Compte suspendu",
  auth_unban: "Compte réactivé",
  auth_delete_user: "Compte supprimé",
  auth_send_password_reset: "Lien de réinitialisation envoyé",
};
const ROLE_LABELS: Record<string, string> = { user: "Apprenant", admin: "Administrateur", superadmin: "Super-admin" };
const AUDIENCE_LABELS: Record<string, string> = { all: "tous les comptes", learners: "apprenants", staff: "équipe" };
const AUDIT_PATTERN = /^(insert|update|delete)_(courses|course_modules|lessons|quizzes|labs|badges|challenges)$/;

type Details = Record<string, Json | undefined>;
const asDetails = (value: Json): Details => (value && typeof value === "object" && !Array.isArray(value) ? (value as Details) : {});
const text = (value: Json | undefined) => (typeof value === "string" || typeof value === "number" ? String(value) : "");
const count = (value: Json | undefined) => (typeof value === "number" ? value : Number(value) || 0);

function describeLog(log: AdminLogRow): { category: LogCategory; label: string; summary: string } {
  const details = asDetails(log.details);
  const audit = AUDIT_PATTERN.exec(log.action);
  if (audit) {
    const [, verb, table] = audit;
    const title = text(details.title);
    const changed = Array.isArray(details.changed) ? details.changed.filter((field): field is string => typeof field === "string") : [];
    const parts = [title && `« ${title} »`, verb === "update" && changed.length ? `Champs : ${changed.join(", ")}` : ""];
    return { category: "contenu", label: `${VERBS[verb]} · ${TABLES[table]}`, summary: parts.filter(Boolean).join(" · ") };
  }
  const label = ACTION_LABELS[log.action] ?? log.action;
  switch (log.action) {
    case "set_role":
      return { category: "utilisateurs", label, summary: `${ROLE_LABELS[text(details.from)] ?? (text(details.from) || "?")} → ${ROLE_LABELS[text(details.to)] ?? (text(details.to) || "?")}` };
    case "adjust_xp": {
      const amount = count(details.amount);
      return { category: "utilisateurs", label, summary: [`${amount > 0 ? "+" : ""}${formatNumber(amount)} XP`, text(details.reason)].filter(Boolean).join(" · ") };
    }
    case "save_quiz":
      return { category: "contenu", label, summary: `${formatNumber(count(details.questions))} question(s)` };
    case "set_lab_flag":
      return { category: "contenu", label, summary: "" };
    case "import_course":
      return {
        category: "contenu",
        label,
        summary: [text(details.slug), `${formatNumber(count(details.modules))} ${plural(count(details.modules), "module")}, ${formatNumber(count(details.lessons))} ${plural(count(details.lessons), "leçon")}, ${formatNumber(count(details.quizzes))} quiz`].filter(Boolean).join(" · "),
      };
    case "revoke_certificate":
    case "restore_certificate":
      return { category: "certificats", label, summary: [text(details.certificate_number), text(details.reason)].filter(Boolean).join(" · ") };
    case "broadcast_notification":
      return {
        category: "annonces",
        label,
        summary: [text(details.title) && `« ${text(details.title)} »`, AUDIENCE_LABELS[text(details.audience)], `${formatNumber(count(details.recipients))} destinataire(s)`].filter(Boolean).join(" · "),
      };
    default:
      return { category: log.action.startsWith("auth_") ? "utilisateurs" : "autre", label, summary: text(details.email) };
  }
}

const LOG_FILTERS = [
  { value: "all", label: "Toutes les catégories" },
  ...(["contenu", "utilisateurs", "certificats", "annonces"] as const).map((value) => ({ value, label: CATEGORY_LABELS[value] })),
];

export function AdminLogsPage() {
  const searchId = useId();
  const filterId = useId();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const logs = useAsync(() => listAdminLogs({ limit }), [limit]);
  const entries = useMemo(() => (logs.data ?? []).map((log) => ({ log, ...describeLog(log) })), [logs.data]);
  const visible = useMemo(() => {
    const needle = fold(search.trim());
    return entries.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      if (!needle) return true;
      const haystack = [entry.label, entry.summary, entry.log.action, entry.log.target_id, entry.log.actor?.display_name, entry.log.actor?.username].filter(Boolean).join(" ");
      return fold(haystack).includes(needle);
    });
  }, [entries, search, category]);
  const total = logs.data?.length ?? 0;

  return (
    <div>
      <AdminPageHeader
        title="Journal d’audit"
        description="Chaque modification de contenu, de rôle, d’XP ou de certificat est enregistrée par la base de données. Le journal est en lecture seule."
      />
      <div className="adm-toolbar">
        <div className="adm-toolbar__grow">
          <Input id={searchId} type="search" label="Filtrer les entrées chargées" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Action, titre, auteur…" autoComplete="off" />
        </div>
        <div>
          <Select id={filterId} label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} options={LOG_FILTERS} />
        </div>
      </div>

      {logs.loading && !logs.data ? (
        <AdminLoading label="Chargement du journal…" />
      ) : logs.error && !logs.data ? (
        <AdminError message={logs.error.message} onRetry={() => void logs.reload()} />
      ) : !total ? (
        <AdminEmpty>Aucune action enregistrée pour le moment.</AdminEmpty>
      ) : (
        <>
          <p className="mb-3 text-sm text-white/60" aria-live="polite">{formatNumber(visible.length)} entrée(s) affichée(s) sur les {formatNumber(total)} plus récentes</p>
          {!visible.length ? (
            <AdminEmpty>Aucune entrée ne correspond à ces filtres.</AdminEmpty>
          ) : (
            <ol className="adm-panel divide-y divide-[rgba(0,191,255,0.08)] !p-0">
              {visible.map(({ log, category: kind, label, summary }) => (
                <li key={log.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-4">
                  <time dateTime={log.created_at} title={formatDateTime(log.created_at)} className="adm-muted text-sm">
                    {formatRelative(log.created_at)}
                    <span className="block text-xs">{formatDateTime(log.created_at)}</span>
                  </time>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={CATEGORY_TONES[kind]}>{CATEGORY_LABELS[kind]}</Badge>
                      <span className="font-medium text-white">{label}</span>
                    </div>
                    {summary && <p className="mt-1 break-words text-sm text-cyan-50/85">{summary}</p>}
                    <p className="adm-muted mt-1 text-sm">
                      Par {log.actor ? `${log.actor.display_name} (@${log.actor.username})` : "Système"}
                      {log.target_type && ` · ${log.target_type}`}
                    </p>
                    {log.details && Object.keys(asDetails(log.details)).length > 0 && (
                      <details className="mt-2 text-sm">
                        <summary className="adm-muted cursor-pointer hover:text-white">Détails techniques</summary>
                        <pre className="adm-code-preview mt-2 p-3 font-mono text-xs">{JSON.stringify({ target_id: log.target_id, ...asDetails(log.details) }, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {total >= limit && (
            <div className="mt-4 flex justify-center">
              <Button type="button" variant="ghost" loading={logs.loading} onClick={() => setLimit((value) => value + PAGE_SIZE)}>Charger les entrées plus anciennes</Button>
            </div>
          )}
          {logs.error && <div className="mt-4"><Notice kind="error">{logs.error.message}</Notice></div>}
        </>
      )}
    </div>
  );
}

// ─── Contact messages ────────────────────────────────────────────────────────

export function AdminMessagesPage() {
  return (
    <div>
      <AdminPageHeader title="Messages" description="Demandes envoyées depuis le formulaire de contact. Change leur statut pour suivre leur traitement." />
      <ContactInbox />
    </div>
  );
}

// ─── Broadcast notifications ─────────────────────────────────────────────────

const AUDIENCE_OPTIONS = [
  { value: "all", label: "Tous les comptes" },
  { value: "learners", label: "Apprenants uniquement" },
  { value: "staff", label: "Équipe (administrateurs)" },
];
const LINK_PATTERN = /^\/\S*$/;

export function AdminNotificationsPage() {
  const id = useId();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [audience, setAudience] = useState<"all" | "learners" | "staff">("all");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<Flash>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  function validate(): string | null {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 2 || cleanTitle.length > 160) return "Le titre doit contenir entre 2 et 160 caractères.";
    if (body.trim().length > 1000) return "Le message ne doit pas dépasser 1 000 caractères.";
    const cleanLink = link.trim();
    if (cleanLink && (!LINK_PATTERN.test(cleanLink) || cleanLink.startsWith("//") || cleanLink.length > 301)) return "Le lien doit être un chemin interne commençant par « / », par exemple /courses.";
    return null;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) { setFlash({ kind: "error", text: problem }); return; }
    setConfirmSend(true);
  }

  async function send() {
    setBusy(true);
    setFlash(null);
    try {
      const sent = await adminBroadcastNotification({ title: title.trim(), body: body.trim(), link: link.trim() || null, audience });
      setFlash({ kind: "success", text: `Annonce envoyée à ${formatNumber(sent)} destinataire${sent > 1 ? "s" : ""}.` });
      setTitle("");
      setBody("");
      setLink("");
      setConfirmSend(false);
    } catch (cause) {
      setFlash({ kind: "error", text: errorMessage(cause, "L’annonce n’a pas pu être envoyée.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Annonces"
        description="Envoie une notification dans l’application à un groupe de comptes. Limite : 10 annonces par heure."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form onSubmit={submit} className="adm-panel space-y-4" noValidate>
          <Input id={`${id}-title`} label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required placeholder="Nouveau parcours disponible" />
          <Field label={`Message (${body.length}/1000)`}>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={1000} placeholder="Ce que les apprenants doivent savoir." />
          </Field>
          <Input id={`${id}-link`} label="Lien interne (facultatif)" value={link} onChange={(e) => setLink(e.target.value)} maxLength={301} placeholder="/courses" spellCheck={false} autoCapitalize="off" />
          <Select id={`${id}-audience`} label="Destinataires" value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)} options={AUDIENCE_OPTIONS} />
          {flash && <Notice kind={flash.kind}>{flash.text}</Notice>}
          <div className="adm-divider pt-5">
            <Button type="submit" size="sm" loading={busy} icon={<IconBell size={16} />}>Envoyer l’annonce</Button>
          </div>
        </form>
        <section aria-labelledby={`${id}-preview`} className="adm-panel">
          <h2 id={`${id}-preview`} className="adm-section-title mb-3">Aperçu dans la boîte de réception</h2>
          <div className="flex gap-3 rounded-xl border border-[var(--cp-line)] bg-black/20 p-4">
            <span className="adm-list-icon h-9 w-9" aria-hidden="true">
              {audience === "staff" ? <IconCertificate size={18} /> : <IconBell size={18} />}
            </span>
            <div className="min-w-0">
              <p className="break-words font-medium text-white">{title.trim() || "Titre de l’annonce"}</p>
              <p className="adm-muted mt-1 whitespace-pre-line break-words text-sm">{body.trim() || "Le message apparaîtra ici."}</p>
              {link.trim() && <p className="mt-2 truncate text-sm text-cyan-100">Ouvrir {link.trim()}</p>}
              <p className="adm-muted mt-2 text-xs">À l’instant</p>
            </div>
          </div>
        </section>
      </div>
      <ConfirmModal
        open={confirmSend}
        title="Envoyer l’annonce"
        description={`Envoyer « ${title.trim()} » à ${AUDIENCE_OPTIONS.find((option) => option.value === audience)?.label.toLowerCase() ?? audience} ? L’annonce ne pourra pas être retirée des boîtes de réception.`}
        confirmLabel="Envoyer"
        loading={busy}
        onCancel={() => setConfirmSend(false)}
        onConfirm={() => void send()}
      />
    </div>
  );
}
