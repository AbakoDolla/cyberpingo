"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import CourseArt from "@/components/art/CourseArt";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatDuration, formatNumber, formatRelative, levelLabel, plural } from "@/lib/format";
import { isSuperadmin, ROLE_LABELS, type Role } from "@/lib/roles";
import { useUser } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { useAdminLive } from "@/hooks/useRealtime";
import { normalizeCourseImport, parseCourseImportJson, slugifyCourse } from "@/lib/course-import";
import type { CourseImport, SkillLevel } from "@/types/api";
import {
  adminAdjustXp, adminAuthStatus, adminImportCourse, adminRunUserAction, adminSetRole, adminUserDetail, createCourse, deleteCourse,
  listAdminCourses, type AdminCourseListItem,
} from "@/services/admin.service";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import OverviewPanel from "./OverviewPanel";
import LearnersPanel from "./LearnersPanel";
import AdminCourseEditor from "./AdminCourseEditor";
import RealtimeDashboard from "@/components/realtime/RealtimeDashboard";
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader, ConfirmModal, Notice } from "./AdminState";
import { LEVEL_LABELS, StateMsg, StatusBadge, Textarea, asInt, useRouteId } from "./AdminFields";
import { IconPlus, IconTrash } from "@/components/ui/Icon";

export { AdminBadgesPage, AdminChallengesPage, AdminLabsPage } from "./AdminCatalogPages";
export { AdminCompetencesPage, AdminMascottePage, AdminRendusPage } from "./AdminAcademyPages";
export { AdminCertificatesPage, AdminLogsPage, AdminMessagesPage, AdminNotificationsPage } from "./AdminOpsPages";

const COURSE_STATUS_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  { value: "draft", label: "Brouillons" },
  { value: "review", label: "En relecture" },
  { value: "published", label: "Publiés" },
  { value: "archived", label: "Archivés" },
];
const COURSE_LEVEL_OPTIONS = [{ value: "all", label: "Tous les niveaux" }, ...Object.entries(LEVEL_LABELS).map(([value, label]) => ({ value, label }))];
const COURSE_SORT_OPTIONS = [
  { value: "position", label: "Position" },
  { value: "updated", label: "Mis à jour récemment" },
  { value: "title", label: "Titre A-Z" },
  { value: "lessons", label: "Leçons décroissantes" },
];

function fold(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="adm-kpi"><p className="adm-kpi__label">{label}</p><p className="adm-kpi__value">{value}</p></div>;
}

export function AdminOverviewPage() {
  const live = useAdminLive(true);
  return (
    <>
      <AdminPageHeader title="Vue d’ensemble" description="Indicateurs issus des RPC admin, supervision temps réel et actions d’exploitation prioritaires." />
      <div className="space-y-8">
        <OverviewPanel overview={live.overview} />
        <RealtimeDashboard live={live} />
      </div>
    </>
  );
}

export function AdminUsersPage() {
  const { profile } = useUser();
  return (
    <>
      <AdminPageHeader title="Utilisateurs" description="Recherche, filtres, progression et actions sensibles depuis la fiche utilisateur." />
      <LearnersPanel currentUserId={profile?.id} />
    </>
  );
}

export function AdminCourseEditorPage() {
  return <AdminCourseEditor />;
}

type UserActionKind = "reset" | "ban" | "unban" | "delete";

export function AdminUserDetailPage() {
  const id = useRouteId();
  const { profile } = useUser();
  const { data, loading, error, reload } = useAsync(() => adminUserDetail(id), [id]);
  const [role, setRole] = useState<Role>("user");
  const [xp, setXp] = useState("50");
  const [reason, setReason] = useState("");
  const [auth, setAuth] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<UserActionKind | null>(null);
  const [banReason, setBanReason] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  useEffect(() => { if (data?.profile.role) setRole(data.profile.role); }, [data?.profile.role]);

  async function action(run: () => Promise<void>, success: string) {
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      await run();
      setMsg(success);
      await reload();
    } catch (cause) {
      setErr(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function runPendingAction() {
    if (!pendingAction || !data) return;
    const target = data.profile;
    if (pendingAction === "ban" && banReason.trim().length < 5) {
      setErr("Indique une raison de suspension d’au moins 5 caractères.");
      return;
    }
    if (pendingAction === "delete" && deleteConfirmation !== `SUPPRIMER ${target.email}`) {
      setErr(`Tape exactement SUPPRIMER ${target.email} pour confirmer la suppression.`);
      return;
    }
    const selected = pendingAction;
    setPendingAction(null);
    setBanReason("");
    setDeleteConfirmation("");
    if (selected === "reset") {
      await action(() => adminRunUserAction({ action: "send_password_reset", user_id: id }).then(() => undefined), "E-mail de réinitialisation envoyé.");
    } else if (selected === "ban") {
      await action(() => adminRunUserAction({ action: "ban", user_id: id, reason: banReason.trim(), ban_hours: 168 }).then(() => undefined), "Compte suspendu pour 7 jours.");
    } else if (selected === "unban") {
      await action(() => adminRunUserAction({ action: "unban", user_id: id }).then(() => undefined), "Compte réactivé.");
    } else {
      await action(() => adminRunUserAction({ action: "delete_user", user_id: id, reason: "Suppression confirmée en console" }).then(() => undefined), "Compte supprimé.");
    }
  }

  if (loading && !data) return <AdminLoading />;
  if (error) return <AdminError message={error.message} onRetry={reload} />;
  if (!data) return <AdminEmpty>Utilisateur introuvable.</AdminEmpty>;

  const target = data.profile;
  const canChangeRole = isSuperadmin(profile?.role) && target.id !== profile?.id;
  const exactDelete = `SUPPRIMER ${target.email}`;
  const confirmationTitle = pendingAction === "delete" ? "Supprimer le compte" : pendingAction === "ban" ? "Suspendre le compte" : pendingAction === "reset" ? "Envoyer un reset mot de passe" : "Réactiver le compte";
  const confirmationDescription = pendingAction === "delete"
    ? "Cette action supprime le compte et ne doit être utilisée qu’après une demande vérifiée."
    : pendingAction === "ban"
      ? "La suspension bloque temporairement la connexion du compte pendant 7 jours."
      : pendingAction === "reset"
        ? "Le titulaire recevra un lien de réinitialisation si son e-mail est valide."
        : "Le compte pourra de nouveau se connecter immédiatement.";

  return (
    <>
      <AdminPageHeader
        title={target.display_name}
        description={`@${target.username} · ${target.email}`}
        action={<Link href="/admin/utilisateurs" className="adm-text-link">Retour aux utilisateurs</Link>}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
        <div className="space-y-6">
          <section className="adm-panel">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={target.display_name} size="lg" ringTone={target.role === "superadmin" ? "purple" : target.role === "admin" ? "blue" : "none"} />
              <div className="min-w-0">
                <h2 className="adm-section-title">{target.display_name}</h2>
                <p className="adm-muted mt-1 text-sm">@{target.username} · {ROLE_LABELS[target.role]}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Niveau" value={String(data.level.level)} />
              <Kpi label="XP" value={formatNumber(target.xp)} />
              <Kpi label="Série" value={`${formatNumber(target.current_streak)} j`} />
              <Kpi label="Cours suivis" value={String(data.courses.length)} />
            </div>
          </section>

          <section className="adm-panel">
            <div className="adm-panel__head">
              <h2 className="adm-section-title">Parcours</h2>
              <span className="adm-muted text-sm">{formatNumber(data.courses.length)} inscription{data.courses.length > 1 ? "s" : ""}</span>
            </div>
            {data.courses.length ? (
              <ul className="adm-list">
                {data.courses.map((course) => (
                  <li key={course.course_id} className="adm-list-row p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/courses/${course.slug}`} className="font-semibold text-white hover:text-cyan-100">{course.title}</Link>
                        <p className="adm-muted mt-1 text-sm">{course.completed_at ? `Terminé ${formatRelative(course.completed_at)}` : `Inscrit ${formatRelative(course.enrolled_at)}`}</p>
                      </div>
                      <Badge tone={course.completed_at ? "green" : "blue"}>{course.completed_at ? "Terminé" : "En cours"}</Badge>
                    </div>
                    <div className="adm-progress-track mt-3" aria-label={`${course.progress_percentage} % de progression`}>
                      <div className="adm-progress-fill" style={{ width: `${course.progress_percentage}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : <AdminEmpty>Aucun cours disponible pour le moment.</AdminEmpty>}
          </section>

          <section className="adm-panel">
            <div className="adm-panel__head"><h2 className="adm-section-title">Activité récente</h2></div>
            {data.activity.length ? (
              <ol className="adm-list">
                {data.activity.map((event, index) => (
                  <li key={`${event.created_at}-${index}`} className="adm-list-row p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{event.label}</p>
                        <time className="adm-muted mt-1 block text-sm" dateTime={event.created_at} title={formatDateTime(event.created_at)}>{formatRelative(event.created_at)}</time>
                      </div>
                      {event.xp_delta > 0 && <Badge tone="green">+{formatNumber(event.xp_delta)} XP</Badge>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : <AdminEmpty>Aucune activité récente.</AdminEmpty>}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="adm-panel">
            <h2 className="adm-section-title">Actions compte</h2>
            <div className="mt-4 space-y-4">
              <StateMsg error={err} message={msg} />
              {canChangeRole ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Select label="Rôle" value={role} onChange={(event) => setRole(event.target.value as Role)} options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))} />
                  <Button type="button" disabled={saving} className="self-end" size="sm" onClick={() => void action(() => adminSetRole(id, role), "Rôle mis à jour.")}>Changer</Button>
                </div>
              ) : (
                <Notice kind="info">Seuls les superadmins peuvent modifier un rôle, et jamais leur propre compte.</Notice>
              )}
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <Input label="XP" type="number" value={xp} onChange={(event) => setXp(event.target.value)} />
                <Input label="Raison" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Correction support" />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={saving}
                onClick={() => {
                  const amount = asInt(xp);
                  if (!amount) { setErr("Indique un ajustement XP différent de 0."); return; }
                  if (reason.trim().length < 3) { setErr("Indique une raison lisible pour le journal d’audit."); return; }
                  void action(() => adminAdjustXp(id, amount, reason.trim()).then(() => undefined), "XP ajusté.");
                }}
              >
                Ajuster XP
              </Button>
              <div className="adm-row-actions">
                <Button type="button" size="sm" variant="secondary" onClick={() => void adminAuthStatus(id).then((status) => setAuth(JSON.stringify(status, null, 2))).catch((cause) => setAuth(errorMessage(cause)))}>Statut du compte</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setPendingAction("reset")}>Réinitialiser le mot de passe</Button>
                <Button type="button" size="sm" variant="danger" onClick={() => setPendingAction("ban")}>Suspendre</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setPendingAction("unban")}>Réactiver</Button>
                <Button type="button" size="sm" variant="danger" onClick={() => setPendingAction("delete")}>Supprimer</Button>
              </div>
              {auth && <pre className="max-h-56 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-cyan-50/80">{auth}</pre>}
            </div>
          </section>

          <section className="adm-panel">
            <h2 className="adm-section-title">Récompenses</h2>
            <div className="mt-4 space-y-4">
              {data.badges.length ? <p className="adm-muted text-sm">{formatNumber(data.badges.length)} badge{data.badges.length > 1 ? "s" : ""} obtenu{data.badges.length > 1 ? "s" : ""}</p> : <p className="adm-muted text-sm">Aucun badge obtenu.</p>}
              {data.certificates.length ? (
                <ul className="space-y-2">
                  {data.certificates.map((certificate) => (
                    <li key={certificate.id} className="adm-list-row p-3">
                      <Link href={`/certificat/${encodeURIComponent(certificate.verification_code)}`} className="font-medium text-white hover:text-cyan-100">{certificate.course_title}</Link>
                      <p className="adm-muted mt-1 text-xs">{certificate.certificate_number} · {formatRelative(certificate.issued_at)}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="adm-muted text-sm">Aucun certificat délivré.</p>}
            </div>
          </section>
        </aside>
      </div>
      <ConfirmModal
        open={pendingAction !== null}
        title={confirmationTitle}
        description={confirmationDescription}
        danger={pendingAction === "ban" || pendingAction === "delete"}
        confirmLabel={pendingAction === "delete" ? "Supprimer" : "Confirmer"}
        loading={saving}
        onCancel={() => { setPendingAction(null); setBanReason(""); setDeleteConfirmation(""); }}
        onConfirm={() => void runPendingAction()}
      >
        {pendingAction === "ban" && <Input label="Raison de suspension" value={banReason} onChange={(event) => setBanReason(event.target.value)} placeholder="Spam, abus, demande légale…" autoFocus />}
        {pendingAction === "delete" && <Input label={`Confirmation (${exactDelete})`} value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoFocus />}
      </ConfirmModal>
    </>
  );
}

export function AdminCoursesPage() {
  const { data, loading, error, reload, setData } = useAsync(listAdminCourses, []);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState("position");

  const courses = useMemo(() => {
    const needle = fold(query.trim());
    return (data ?? [])
      .filter((course) => {
        if (status !== "all" && course.status !== status) return false;
        if (level !== "all" && course.level !== level) return false;
        if (!needle) return true;
        return [course.title, course.slug, course.category, course.short_description].some((value) => value && fold(value).includes(needle));
      })
      .sort((a, b) => {
        if (sort === "updated") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        if (sort === "title") return a.title.localeCompare(b.title, "fr");
        if (sort === "lessons") return b.lesson_count - a.lesson_count || a.title.localeCompare(b.title, "fr");
        return a.position - b.position || a.title.localeCompare(b.title, "fr");
      });
  }, [data, level, query, sort, status]);

  async function create() {
    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) { setNotice({ kind: "error", text: "Le titre doit contenir au moins 3 caractères." }); return; }
    setSaving(true);
    setNotice(null);
    try {
      const course = await createCourse({ title: cleanTitle, slug: slugifyCourse(cleanTitle), status: "draft" });
      setData((rows) => [{ ...course, module_count: 0, lesson_count: 0, quiz_count: 0 }, ...(rows ?? [])]);
      setTitle("");
      setNotice({ kind: "success", text: "Brouillon créé. Ouvre-le pour structurer modules, leçons et quiz." });
    } catch (cause) {
      setNotice({ kind: "error", text: errorMessage(cause, "Le cours n’a pas pu être créé.") });
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <AdminLoading />;
  if (error) return <AdminError message={error.message} onRetry={reload} />;

  return (
    <>
      <AdminPageHeader title="Cours" description="Catalogue complet : brouillons, publications, modules, leçons et quiz." />
      <section className="adm-panel">
        <div className="adm-panel__head"><h2 className="adm-section-title">Créer un parcours</h2></div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <Input label="Nouveau cours" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titre du parcours" />
          </div>
          <Button type="button" loading={saving} onClick={() => void create()} icon={<IconPlus size={16} />}>Créer un brouillon</Button>
        </div>
        {notice && <div className="mt-4"><Notice kind={notice.kind}>{notice.text}</Notice></div>}
      </section>
      <section className="adm-panel mt-6">
        <div className="adm-toolbar">
          <div className="adm-toolbar__grow">
            <Input type="search" label="Rechercher" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Titre, slug, catégorie" autoComplete="off" />
          </div>
          <Select label="Statut" value={status} onChange={(event) => setStatus(event.target.value)} options={COURSE_STATUS_OPTIONS} />
          <Select label="Niveau" value={level} onChange={(event) => setLevel(event.target.value)} options={COURSE_LEVEL_OPTIONS} />
          <Select label="Tri" value={sort} onChange={(event) => setSort(event.target.value)} options={COURSE_SORT_OPTIONS} />
        </div>
        <p className="adm-summary" aria-live="polite">{formatNumber(courses.length)} cours affiché{courses.length > 1 ? "s" : ""} sur {formatNumber(data?.length ?? 0)}</p>
        {!data?.length ? (
          <AdminEmpty>Aucun cours disponible pour le moment.</AdminEmpty>
        ) : !courses.length ? (
          <AdminEmpty>Aucun cours ne correspond à ces filtres.</AdminEmpty>
        ) : (
          <div className="adm-list">
            {courses.map((course) => (
              <CourseRowCard
                key={course.id}
                course={course}
                onDeleted={() => {
                  setData((rows) => (rows ?? []).filter((item) => item.id !== course.id));
                  setNotice({ kind: "success", text: `« ${course.title} » supprimé.` });
                }}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function CourseRowCard({ course, onDeleted }: { course: AdminCourseListItem; onDeleted: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await deleteCourse(course.id);
      setConfirmOpen(false);
      onDeleted();
    } catch (cause) {
      setError(errorMessage(cause, "Le cours n’a pas pu être supprimé."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="adm-list-row p-4">
      <div className="adm-course-row">
        <div className="adm-row-art" aria-hidden="true">
          <div className="adm-row-art__media">
            {course.thumbnail_url ? (
              <Image
                src={course.thumbnail_url}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 720px) 100vw, 104px"
                className="adm-row-art__image"
              />
            ) : (
              <CourseArt slug={course.slug} category={course.category} className="adm-row-art__art" />
            )}
          </div>
        </div>
        <div className="adm-course-row__copy min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/cours/${course.id}`} className="font-display text-lg font-semibold text-white hover:text-cyan-100">{course.title}</Link>
            <StatusBadge status={course.status} />
          </div>
          <p className="adm-muted mt-1 truncate text-sm">
            /{course.slug} · {levelLabel(course.level as SkillLevel)} · {formatDuration(course.estimated_duration)} · {course.module_count} {plural(course.module_count, "module")} · {course.lesson_count} {plural(course.lesson_count, "leçon")} · {course.quiz_count} quiz
          </p>
          <p className="adm-muted mt-1 text-xs">Mis à jour {formatRelative(course.updated_at)}</p>
        </div>
        <div className="adm-row-actions">
          <Link href={`/admin/cours/${course.id}`} className="adm-action-link">Éditer</Link>
          <Link href={`/courses/${course.slug}`} className="adm-action-link" target="_blank">Prévisualiser</Link>
          <Button type="button" size="sm" variant="danger" onClick={() => setConfirmOpen(true)} icon={<IconTrash size={14} />}>Supprimer</Button>
        </div>
      </div>
      {error && <div className="mt-3"><Notice kind="error">{error}</Notice></div>}
      <ConfirmModal
        open={confirmOpen}
        title="Supprimer le cours"
        description={`Supprimer définitivement « ${course.title} » ? Archive-le plutôt si des apprenants ont déjà progressé dessus.`}
        danger
        confirmLabel="Supprimer"
        loading={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void remove()}
      />
    </article>
  );
}

export function AdminImportPage() {
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [json, setJson] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function readFile(file: File) {
    setFileName(file.name);
    setText(await file.text());
    setJson("");
    setResult(null);
    setError(null);
  }

  async function analyze() {
    if (text.trim().length < 20) { setError("Ajoute un contenu texte ou Markdown d’au moins 20 caractères à analyser."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/publish/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text, fileName }) });
      const body = await res.json() as { course?: CourseImport; error?: string };
      if (!res.ok || !body.course) throw new Error(body.error ?? "Analyse impossible.");
      setJson(JSON.stringify(body.course, null, 2));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  async function importCourse() {
    setLoading(true);
    setError(null);
    try {
      const course = parseCourseImportJson(json);
      const imported = await adminImportCourse(course);
      setResult(`Cours importé en brouillon : ${imported.slug}`);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AdminPageHeader title="Import IA" description="Analyse un fichier texte ou Markdown, relis le plan de cours généré, puis crée un brouillon que tu pourras éditer avant publication." />
      <section className="adm-panel">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-4">
            <label className="adm-field">
              <span>Fichier source</span>
              <input type="file" accept=".txt,.md,.markdown,text/plain,text/markdown" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); }} className="block min-h-11 w-full rounded-xl border border-[var(--cp-line)] bg-black/20 px-3 py-2 text-sm text-cyan-50" />
            </label>
            {fileName && <p className="adm-muted text-sm">Fichier : {fileName}</p>}
            <Textarea rows={12} value={text} onChange={(event) => setText(event.target.value)} placeholder="Colle aussi directement un contenu à analyser…" />
            <div className="adm-row-actions">
              <Button type="button" loading={loading} disabled={!text.trim()} onClick={() => void analyze()}>Analyser</Button>
              <Button type="button" variant="secondary" disabled={!json || loading} onClick={() => { try { setJson(JSON.stringify(normalizeCourseImport(JSON.parse(json) as unknown), null, 2)); } catch (cause) { setError(errorMessage(cause)); } }}>Normaliser</Button>
              <Button type="button" variant="success" disabled={!json || loading} onClick={() => void importCourse()}>Créer le brouillon</Button>
            </div>
            {error && <Notice kind="error">{error}</Notice>}
            {result && <Notice>{result} · <Link href="/admin/cours" className="underline">ouvrir les cours</Link></Notice>}
          </div>
          <div>
            <label className="adm-field">
              <span>Plan de cours généré (JSON)</span>
              <Textarea rows={24} value={json} onChange={(event) => setJson(event.target.value)} className="font-mono text-xs" placeholder="Le JSON analysé apparaîtra ici. Tu peux le corriger avant import." />
            </label>
          </div>
        </div>
      </section>
    </>
  );
}
