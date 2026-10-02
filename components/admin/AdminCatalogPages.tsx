"use client";

import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import SlugIcon, { GAMIFICATION_ICON_OPTIONS } from "@/components/ui/SlugIcon";
import { IconEye, IconLock, IconPlus, IconTerminal, IconTrash, IconX } from "@/components/ui/Icon";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatNumber } from "@/lib/format";
import { slugifyCourse } from "@/lib/course-import";
import {
  adminGetLabFlag, adminSetLabFlag, createBadge, createChallenge, createLab, deleteBadge, deleteChallenge, deleteLab,
  listAdminCourses, listBadges, listChallenges, listLabs, updateBadge, updateChallenge, updateLab,
  type AdminCourseListItem, type BadgeChanges, type BadgeRow, type ChallengeChanges, type ChallengeRow, type LabChanges, type LabRow,
} from "@/services/admin.service";
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader, ConfirmModal, Notice } from "./AdminState";
import {
  Field, LAB_CATEGORY_LABELS, LEVEL_LABELS, STATUS_LABELS, StatusBadge, Textarea, Toggle, asInt, isoToLocalInput, joinLines, lines,
  localInputToIso, toOptions,
} from "./AdminFields";

// ─── Shared catalog building blocks ──────────────────────────────────────────

type Flash = { kind: "success" | "error"; text: string } | null;
type CatalogItem = { id: string; position: number };
type CatalogSort = "position" | "title" | "updated";

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ICON_PATTERN = /^[a-z0-9-]{2,40}$/;
const toSlug = (value: string) => (value.trim() ? slugifyCourse(value) : "");
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const matches = (needle: string, ...values: (string | null | undefined)[]) => {
  const folded = fold(needle.trim());
  return !folded || values.some((value) => value && fold(value).includes(folded));
};
const plural = (count: number, one: string, many: string) => `${formatNumber(count)} ${count > 1 ? many : one}`;
const CATALOG_SORT_OPTIONS = [
  { value: "position", label: "Position" },
  { value: "title", label: "Titre A-Z" },
  { value: "updated", label: "Mis à jour récemment" },
];

function upsertSorted<T extends CatalogItem>(rows: T[] | undefined, row: T, label: (row: T) => string): T[] {
  const list = rows ?? [];
  const next = list.some((item) => item.id === row.id) ? list.map((item) => (item.id === row.id ? row : item)) : [...list, row];
  return next.sort((a, b) => a.position - b.position || label(a).localeCompare(label(b), "fr"));
}

function sortCatalogRows<T extends CatalogItem>(rows: T[], sort: CatalogSort, label: (row: T) => string): T[] {
  return [...rows].sort((a, b) => {
    if (sort === "title") return label(a).localeCompare(label(b), "fr");
    if (sort === "updated") return new Date((b as { updated_at?: string }).updated_at ?? 0).getTime() - new Date((a as { updated_at?: string }).updated_at ?? 0).getTime();
    return a.position - b.position || label(a).localeCompare(label(b), "fr");
  });
}

/** Loads a catalog and tracks which row is in the editor (`undefined` = closed, `null` = new row). */
function useCatalog<T extends CatalogItem>(loader: () => Promise<T[]>, label: (row: T) => string) {
  const state = useAsync(loader, []);
  const [editing, setEditing] = useState<T | null | undefined>(undefined);
  const [flash, setFlash] = useState<Flash>(null);
  return {
    ...state,
    editing,
    flash,
    open(row: T | null) { setEditing(row); setFlash(null); },
    close() { setEditing(undefined); setFlash(null); },
    saved(row: T, message: Flash) {
      state.setData((current) => upsertSorted(current, row, label));
      setEditing(row);
      setFlash(message);
    },
    removed(id: string, message: string) {
      state.setData((current) => current?.filter((item) => item.id !== id));
      setEditing(undefined);
      setFlash({ kind: "success", text: message });
    },
  };
}

function CatalogLayout({ editor, children }: { editor: ReactNode | null; children: ReactNode }) {
  if (!editor) return <div>{children}</div>;
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <div className="min-w-0">{children}</div>
      <div className="order-first xl:sticky xl:top-6 xl:order-last xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto">{editor}</div>
    </div>
  );
}

function EditorCard({ title, subtitle, flash, onClose, children }: { title: string; subtitle?: string; flash: Flash; onClose: () => void; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="adm-editor-panel">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={headingId} className="adm-section-title">{title}</h2>
          {subtitle && <p className="adm-muted mt-1 text-sm">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer l’éditeur"
          className="adm-action-link"
        >
          <IconX size={18} />
        </button>
      </div>
      {flash && <div className="mb-5"><Notice kind={flash.kind}>{flash.text}</Notice></div>}
      {children}
    </section>
  );
}

function Toolbar({ search, onSearch, placeholder, filterLabel, filter, onFilter, filterOptions, sort, onSort, sortOptions = CATALOG_SORT_OPTIONS, summary }: {
  search: string; onSearch: (value: string) => void; placeholder: string;
  filterLabel: string; filter: string; onFilter: (value: string) => void; filterOptions: { value: string; label: string }[];
  sort?: string; onSort?: (value: CatalogSort) => void; sortOptions?: { value: string; label: string }[];
  summary: string;
}) {
  const searchId = useId();
  const filterId = useId();
  const sortId = useId();
  return (
    <div>
      <div className="adm-toolbar">
        <div className="adm-toolbar__grow">
          <Input id={searchId} type="search" label="Rechercher" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} autoComplete="off" />
        </div>
        <div>
          <Select id={filterId} label={filterLabel} value={filter} onChange={(e) => onFilter(e.target.value)} options={filterOptions} />
        </div>
        {sort && onSort && (
          <div>
            <Select id={sortId} label="Tri" value={sort} onChange={(e) => onSort(e.target.value as CatalogSort)} options={sortOptions} />
          </div>
        )}
      </div>
      <p className="adm-summary" aria-live="polite">{summary}</p>
    </div>
  );
}

function CatalogRow({ active, icon, title, meta, aside, onSelect }: { active: boolean; icon: ReactNode; title: string; meta: string; aside: ReactNode; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        onClick={onSelect}
        className={`adm-list-button ${active ? "adm-list-row border-[var(--cp-line-strong)] bg-cyan-400/5" : "adm-list-row"}`}
      >
        <span className="adm-list-icon" aria-hidden="true">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-white">{title}</span>
          <span className="adm-muted mt-0.5 block truncate text-sm">{meta}</span>
        </span>
        <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">{aside}</span>
      </button>
    </li>
  );
}

function EditorActions({ busy, isNew, createLabel, onDelete }: { busy: boolean; isNew: boolean; createLabel: string; onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cp-line)] pt-5">
        <Button type="submit" size="sm" loading={busy}>{isNew ? createLabel : "Enregistrer"}</Button>
        {!isNew && <Button type="button" size="sm" variant="danger" icon={<IconTrash size={16} />} onClick={() => setConfirmOpen(true)} disabled={busy}>Supprimer</Button>}
      </div>
      <ConfirmModal
        open={confirmOpen}
        title="Confirmer la suppression"
        description="Cette suppression est définitive. Archive ou désactive plutôt l’élément si des apprenants peuvent déjà y être liés."
        danger
        confirmLabel="Supprimer"
        loading={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); onDelete(); }}
      />
    </>
  );
}

function CatalogBody<T extends CatalogItem>({ catalog, loadingLabel, emptyAll, emptyFiltered, rows, renderRow }: {
  catalog: ReturnType<typeof useCatalog<T>>; loadingLabel: string; emptyAll: string; emptyFiltered: string; rows: T[]; renderRow: (row: T) => ReactNode;
}) {
  if (catalog.loading && !catalog.data) return <AdminLoading label={loadingLabel} />;
  if (catalog.error && !catalog.data) return <AdminError message={catalog.error.message} onRetry={() => void catalog.reload()} />;
  if (!catalog.data?.length) return <AdminEmpty>{emptyAll}</AdminEmpty>;
  if (!rows.length) return <AdminEmpty>{emptyFiltered}</AdminEmpty>;
  return <ul className="adm-list">{rows.map(renderRow)}</ul>;
}

/** Title input whose value seeds the slug until the slug is edited by hand. */
function useTitleSlug(initialTitle: string, initialSlug: string, isNew: boolean) {
  const [title, setTitleState] = useState(initialTitle);
  const [slug, setSlugState] = useState(initialSlug);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  return {
    title,
    slug,
    setTitle(value: string) { setTitleState(value); if (!slugTouched) setSlugState(toSlug(value)); },
    setSlug(value: string) { setSlugTouched(true); setSlugState(value.toLowerCase().replace(/\s+/g, "-")); },
  };
}

function iconOptions(current: string) {
  return GAMIFICATION_ICON_OPTIONS.some((option) => option.value === current) ? GAMIFICATION_ICON_OPTIONS : [{ value: current, label: current }, ...GAMIFICATION_ICON_OPTIONS];
}

const ACTIVE_FILTER = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "inactive", label: "Inactifs" },
];

// ─── Labs ────────────────────────────────────────────────────────────────────

const LAB_STATUS_FILTER = [{ value: "all", label: "Tous les statuts" }, ...toOptions(STATUS_LABELS)];

function terminalLines(value: string): string[] {
  const rows = value.split(/\r?\n/).map((line) => line.replace(/\s+$/, ""));
  while (rows.length && !rows[0]) rows.shift();
  while (rows.length && !rows[rows.length - 1]) rows.pop();
  return rows;
}

export function AdminLabsPage() {
  const catalog = useCatalog<LabRow>(listLabs, (lab) => lab.title);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<CatalogSort>("position");
  const rows = useMemo(
    () => sortCatalogRows((catalog.data ?? []).filter((lab) => (status === "all" || lab.status === status) && matches(search, lab.title, lab.slug, LAB_CATEGORY_LABELS[lab.category])), sort, (lab) => lab.title),
    [catalog.data, search, sort, status],
  );
  const total = catalog.data?.length ?? 0;
  const published = catalog.data?.filter((lab) => lab.status === "published").length ?? 0;

  const editor = catalog.editing === undefined ? null : (
    <LabEditor
      key={catalog.editing?.id ?? "new"}
      lab={catalog.editing}
      flash={catalog.flash}
      onClose={catalog.close}
      onSaved={catalog.saved}
      onDeleted={(id) => catalog.removed(id, "Lab supprimé.")}
    />
  );

  return (
    <div>
      <AdminPageHeader
        title="Labs"
        description="Scénarios pratiques joués dans le terminal. Un lab ne peut être publié qu’une fois sa réponse attendue définie."
        action={<Button size="sm" icon={<IconPlus size={16} />} onClick={() => catalog.open(null)}>Nouveau lab</Button>}
      />
      {catalog.editing === undefined && catalog.flash && <div className="mb-4"><Notice kind={catalog.flash.kind}>{catalog.flash.text}</Notice></div>}
      <CatalogLayout editor={editor}>
        <Toolbar
          search={search} onSearch={setSearch} placeholder="Titre, slug ou catégorie"
          filterLabel="Statut" filter={status} onFilter={setStatus} filterOptions={LAB_STATUS_FILTER}
          sort={sort} onSort={setSort}
          summary={`${plural(rows.length, "lab affiché", "labs affichés")} sur ${formatNumber(total)} · ${plural(published, "publié", "publiés")}`}
        />
        <CatalogBody
          catalog={catalog}
          rows={rows}
          loadingLabel="Chargement des labs…"
          emptyAll="Aucun lab pour le moment. Crée le premier scénario avec « Nouveau lab »."
          emptyFiltered="Aucun lab ne correspond à ces filtres."
          renderRow={(lab) => (
            <CatalogRow
              key={lab.id}
              active={catalog.editing?.id === lab.id}
              onSelect={() => catalog.open(lab)}
              icon={<IconTerminal size={20} />}
              title={lab.title}
              meta={`${LAB_CATEGORY_LABELS[lab.category] ?? lab.category} · ${LEVEL_LABELS[lab.difficulty] ?? lab.difficulty} · ${formatNumber(lab.xp_reward)} XP`}
              aside={<StatusBadge status={lab.status} />}
            />
          )}
        />
      </CatalogLayout>
    </div>
  );
}

function LabEditor({ lab, flash, onClose, onSaved, onDeleted }: {
  lab: LabRow | null; flash: Flash; onClose: () => void; onSaved: (lab: LabRow, flash: Flash) => void; onDeleted: (id: string) => void;
}) {
  const isNew = !lab;
  const id = useId();
  const names = useTitleSlug(lab?.title ?? "", lab?.slug ?? "", isNew);
  const [description, setDescription] = useState(lab?.description ?? "");
  const [category, setCategory] = useState<string>(lab?.category ?? "reseau");
  const [difficulty, setDifficulty] = useState<string>(lab?.difficulty ?? "debutant");
  const [xp, setXp] = useState(String(lab?.xp_reward ?? 100));
  const [position, setPosition] = useState(String(lab?.position ?? 0));
  const [status, setStatus] = useState<string>(lab?.status ?? "draft");
  const [objectives, setObjectives] = useState(joinLines(lab?.objectives ?? []));
  const [hints, setHints] = useState(joinLines(lab?.hints ?? []));
  const [terminal, setTerminal] = useState(joinLines(lab?.terminal_lines ?? []));
  const [placeholder, setPlaceholder] = useState(lab?.flag_placeholder ?? "Ta réponse");
  const [flag, setFlag] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function validate(): string | null {
    const title = names.title.trim();
    if (title.length < 3 || title.length > 160) return "Le titre doit contenir entre 3 et 160 caractères.";
    if (names.slug.length < 2 || names.slug.length > 80 || !SLUG_PATTERN.test(names.slug)) return "Le slug doit contenir 2 à 80 caractères : lettres minuscules, chiffres et tirets.";
    if (description.trim().length > 2000) return "La description ne doit pas dépasser 2 000 caractères.";
    const xpValue = asInt(xp, -1);
    if (xpValue < 0 || xpValue > 2000) return "La récompense doit être comprise entre 0 et 2 000 XP.";
    if (lines(objectives).length > 12) return "12 objectifs maximum.";
    if (lines(hints).length > 12) return "12 indices maximum.";
    if (terminalLines(terminal).length > 80) return "Le terminal accepte 80 lignes maximum.";
    const hint = placeholder.trim();
    if (hint.length < 1 || hint.length > 120) return "Le texte d’aide du champ réponse doit contenir entre 1 et 120 caractères.";
    if (flag.trim().length > 200) return "La réponse attendue ne doit pas dépasser 200 caractères.";
    if (isNew && status === "published" && !flag.trim()) return "Définis la réponse attendue pour publier ce lab dès sa création.";
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) { setErr(problem); return; }
    setBusy(true);
    setErr(null);
    const changes: LabChanges = {
      slug: names.slug,
      title: names.title.trim(),
      description: description.trim(),
      category,
      difficulty,
      xp_reward: asInt(xp),
      position: asInt(position),
      objectives: lines(objectives),
      hints: lines(hints),
      terminal_lines: terminalLines(terminal),
      flag_placeholder: placeholder.trim(),
    };
    try {
      if (lab) {
        onSaved(await updateLab(lab.id, { ...changes, status }), { kind: "success", text: "Lab enregistré." });
        return;
      }
      // The database refuses to publish a lab without its answer: create as draft, store the answer, then publish.
      let created = await createLab({ ...changes, slug: names.slug, title: names.title.trim(), status: "draft" });
      try {
        if (flag.trim()) await adminSetLabFlag(created.id, flag.trim());
        if (status !== "draft") created = await updateLab(created.id, { status });
        onSaved(created, { kind: "success", text: status === "published" ? "Lab créé et publié." : "Lab créé." });
      } catch (cause) {
        onSaved(created, { kind: "error", text: `Lab créé en brouillon, mais l’étape suivante a échoué : ${errorMessage(cause)}` });
      }
    } catch (cause) {
      setErr(errorMessage(cause, "Le lab n’a pas pu être enregistré."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!lab) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteLab(lab.id);
      onDeleted(lab.id);
    } catch (cause) {
      setErr(errorMessage(cause, "Le lab n’a pas pu être supprimé."));
      setBusy(false);
    }
  }

  return (
    <EditorCard
      title={isNew ? "Nouveau lab" : "Modifier le lab"}
      subtitle={lab?.published_at ? `Publié le ${formatDateTime(lab.published_at)}` : isNew ? "Créé en brouillon tant que la réponse n’est pas définie." : undefined}
      flash={flash}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input id={`${id}-title`} label="Titre" value={names.title} onChange={(e) => names.setTitle(e.target.value)} maxLength={160} required />
        <Input id={`${id}-slug`} label="Slug" value={names.slug} onChange={(e) => names.setSlug(e.target.value)} maxLength={80} required spellCheck={false} autoCapitalize="off" />
        <Field label={`Description (${description.length}/2000)`}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id={`${id}-category`} label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)} options={toOptions(LAB_CATEGORY_LABELS)} />
          <Select id={`${id}-difficulty`} label="Niveau" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} options={toOptions(LEVEL_LABELS)} />
          <Input id={`${id}-xp`} label="Récompense (XP)" type="number" inputMode="numeric" min={0} max={2000} value={xp} onChange={(e) => setXp(e.target.value)} />
          <Input id={`${id}-position`} label="Position" type="number" inputMode="numeric" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <Select id={`${id}-status`} label="Statut" value={status} onChange={(e) => setStatus(e.target.value)} options={toOptions(STATUS_LABELS)} />
        <Field label="Objectifs (un par ligne, 12 maximum)">
          <Textarea value={objectives} onChange={(e) => setObjectives(e.target.value)} rows={4} />
        </Field>
        <Field label="Indices (un par ligne, 12 maximum)">
          <Textarea value={hints} onChange={(e) => setHints(e.target.value)} rows={3} />
        </Field>
        <Field label="Sortie du terminal (une ligne par ligne affichée, 80 maximum)">
          <Textarea value={terminal} onChange={(e) => setTerminal(e.target.value)} rows={6} spellCheck={false} className="font-mono text-sm" />
        </Field>
        <Input id={`${id}-placeholder`} label="Texte d’aide du champ réponse" value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} maxLength={120} />
        {isNew && (
          <Input
            id={`${id}-flag`}
            label="Réponse attendue (obligatoire pour publier)"
            type="password"
            autoComplete="off"
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            maxLength={200}
          />
        )}
        {err && <Notice kind="error">{err}</Notice>}
        <EditorActions busy={busy} isNew={isNew} createLabel="Créer le lab" onDelete={() => void remove()} />
      </form>
      {lab && <LabFlagPanel labId={lab.id} />}
    </EditorCard>
  );
}

function LabFlagPanel({ labId }: { labId: string }) {
  const inputId = useId();
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "reveal" | null>(null);
  const [notice, setNotice] = useState<Flash>(null);

  async function save() {
    const flag = value.trim();
    if (flag.length < 1 || flag.length > 200) { setNotice({ kind: "error", text: "La réponse doit contenir entre 1 et 200 caractères." }); return; }
    setBusy("save");
    setNotice(null);
    try {
      await adminSetLabFlag(labId, flag);
      setValue("");
      setRevealed(null);
      setNotice({ kind: "success", text: "Réponse enregistrée." });
    } catch (cause) {
      setNotice({ kind: "error", text: errorMessage(cause, "La réponse n’a pas pu être enregistrée.") });
    } finally {
      setBusy(null);
    }
  }

  async function toggleReveal() {
    if (revealed !== null) { setRevealed(null); return; }
    setBusy("reveal");
    setNotice(null);
    try {
      setRevealed(await adminGetLabFlag(labId));
    } catch (cause) {
      setNotice({ kind: "error", text: errorMessage(cause, "Impossible de révéler la réponse.") });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby={`${inputId}-heading`} className="adm-divider mt-6 space-y-3 pt-5">
      <div className="flex items-center gap-2">
        <IconLock size={16} className="adm-accent-icon" />
        <h3 id={`${inputId}-heading`} className="font-display text-sm font-semibold text-white">Réponse attendue</h3>
      </div>
      <p className="adm-muted text-sm">Stockée dans un schéma privé : les apprenants ne la reçoivent jamais, la vérification se fait côté serveur.</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Input
            id={inputId}
            label="Nouvelle réponse"
            type="password"
            autoComplete="off"
            value={value}
            maxLength={200}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }}
          />
        </div>
        <Button type="button" size="sm" variant="secondary" loading={busy === "save"} disabled={busy !== null} onClick={() => void save()}>Définir</Button>
      </div>
      <Button type="button" size="sm" variant="ghost" icon={<IconEye size={16} />} loading={busy === "reveal"} disabled={busy !== null} onClick={() => void toggleReveal()}>
        {revealed !== null ? "Masquer la réponse" : "Révéler la réponse actuelle"}
      </Button>
      {revealed !== null && (
        revealed
          ? <p className="adm-code-preview break-all px-3 py-2 font-mono text-sm">{revealed}</p>
          : <p className="adm-muted text-sm">Aucune réponse définie.</p>
      )}
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
    </section>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────────

const CRITERIA_LABELS: Record<string, string> = {
  lessons_completed: "Leçons terminées",
  quizzes_passed: "Quiz réussis",
  courses_completed: "Cours terminés",
  streak_days: "Jours de série",
  xp_total: "XP total",
  labs_solved: "Labs résolus",
  certificates_earned: "Certificats obtenus",
  course_completed: "Cours précis terminé",
};

function criteriaSummary(badge: BadgeRow, courses: AdminCourseListItem[] | undefined) {
  if (badge.criteria_type === "course_completed") {
    const course = courses?.find((item) => item.id === badge.criteria_course_id);
    return `Cours terminé : ${course?.title ?? "cours introuvable"}`;
  }
  return `${CRITERIA_LABELS[badge.criteria_type] ?? badge.criteria_type} : ${formatNumber(badge.criteria_value)}`;
}

export function AdminBadgesPage() {
  const catalog = useCatalog<BadgeRow>(listBadges, (badge) => badge.name);
  const courses = useAsync(listAdminCourses, []);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("all");
  const [sort, setSort] = useState<CatalogSort>("position");
  const rows = useMemo(
    () => sortCatalogRows((catalog.data ?? []).filter((badge) => (active === "all" || badge.is_active === (active === "active")) && matches(search, badge.name, badge.slug, badge.description)), sort, (badge) => badge.name),
    [catalog.data, search, active, sort],
  );
  const total = catalog.data?.length ?? 0;
  const activeCount = catalog.data?.filter((badge) => badge.is_active).length ?? 0;

  const editor = catalog.editing === undefined ? null : (
    <BadgeEditor
      key={catalog.editing?.id ?? "new"}
      badge={catalog.editing}
      courses={courses.data ?? []}
      coursesError={courses.error?.message ?? null}
      flash={catalog.flash}
      onClose={catalog.close}
      onSaved={catalog.saved}
      onDeleted={(id) => catalog.removed(id, "Badge supprimé.")}
    />
  );

  return (
    <div>
      <AdminPageHeader
        title="Badges"
        description="Récompenses attribuées automatiquement par le serveur dès qu’un apprenant atteint le critère."
        action={<Button size="sm" icon={<IconPlus size={16} />} onClick={() => catalog.open(null)}>Nouveau badge</Button>}
      />
      {catalog.editing === undefined && catalog.flash && <div className="mb-4"><Notice kind={catalog.flash.kind}>{catalog.flash.text}</Notice></div>}
      <CatalogLayout editor={editor}>
        <Toolbar
          search={search} onSearch={setSearch} placeholder="Nom, slug ou description"
          filterLabel="État" filter={active} onFilter={setActive} filterOptions={ACTIVE_FILTER}
          sort={sort} onSort={setSort}
          summary={`${plural(rows.length, "badge affiché", "badges affichés")} sur ${formatNumber(total)} · ${plural(activeCount, "actif", "actifs")}`}
        />
        <CatalogBody
          catalog={catalog}
          rows={rows}
          loadingLabel="Chargement des badges…"
          emptyAll="Aucun badge pour le moment. Crée le premier avec « Nouveau badge »."
          emptyFiltered="Aucun badge ne correspond à ces filtres."
          renderRow={(badge) => (
            <CatalogRow
              key={badge.id}
              active={catalog.editing?.id === badge.id}
              onSelect={() => catalog.open(badge)}
              icon={<SlugIcon name={badge.icon} size={20} />}
              title={badge.name}
              meta={`${criteriaSummary(badge, courses.data)} · ${formatNumber(badge.xp_reward)} XP`}
              aside={<Badge tone={badge.is_active ? "green" : "neutral"}>{badge.is_active ? "Actif" : "Inactif"}</Badge>}
            />
          )}
        />
      </CatalogLayout>
    </div>
  );
}

function BadgeEditor({ badge, courses, coursesError, flash, onClose, onSaved, onDeleted }: {
  badge: BadgeRow | null; courses: AdminCourseListItem[]; coursesError: string | null; flash: Flash;
  onClose: () => void; onSaved: (badge: BadgeRow, flash: Flash) => void; onDeleted: (id: string) => void;
}) {
  const isNew = !badge;
  const id = useId();
  const names = useTitleSlug(badge?.name ?? "", badge?.slug ?? "", isNew);
  const [description, setDescription] = useState(badge?.description ?? "");
  const [icon, setIcon] = useState(badge?.icon ?? "award");
  const [criteria, setCriteria] = useState(badge?.criteria_type ?? "lessons_completed");
  const [value, setValue] = useState(String(badge?.criteria_value ?? 1));
  const [courseId, setCourseId] = useState(badge?.criteria_course_id ?? "");
  const [xp, setXp] = useState(String(badge?.xp_reward ?? 50));
  const [position, setPosition] = useState(String(badge?.position ?? 0));
  const [isActive, setIsActive] = useState(badge?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const forCourse = criteria === "course_completed";
  const courseOptions = [{ value: "", label: courses.length ? "Choisir un cours" : "Aucun cours disponible" }, ...courses.map((course) => ({ value: course.id, label: course.title }))];

  function validate(): string | null {
    const name = names.title.trim();
    if (name.length < 2 || name.length > 80) return "Le nom doit contenir entre 2 et 80 caractères.";
    if (names.slug.length < 2 || names.slug.length > 60 || !SLUG_PATTERN.test(names.slug)) return "Le slug doit contenir 2 à 60 caractères : lettres minuscules, chiffres et tirets.";
    if (description.trim().length > 300) return "La description ne doit pas dépasser 300 caractères.";
    if (!ICON_PATTERN.test(icon)) return "Choisis une icône valide.";
    if (forCourse && !courseId) return "Choisis le cours à terminer pour obtenir ce badge.";
    const threshold = asInt(value, 0);
    if (!forCourse && (threshold < 1 || threshold > 1_000_000)) return "Le seuil doit être compris entre 1 et 1 000 000.";
    const xpValue = asInt(xp, -1);
    if (xpValue < 0 || xpValue > 5000) return "La récompense doit être comprise entre 0 et 5 000 XP.";
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) { setErr(problem); return; }
    setBusy(true);
    setErr(null);
    const changes: BadgeChanges = {
      slug: names.slug,
      name: names.title.trim(),
      description: description.trim(),
      icon,
      criteria_type: criteria,
      criteria_value: forCourse ? 1 : asInt(value, 1),
      criteria_course_id: forCourse ? courseId : null,
      xp_reward: asInt(xp),
      position: asInt(position),
      is_active: isActive,
    };
    try {
      const saved = badge
        ? await updateBadge(badge.id, changes)
        : await createBadge({ ...changes, slug: names.slug, name: names.title.trim(), criteria_type: criteria });
      onSaved(saved, { kind: "success", text: badge ? "Badge enregistré." : "Badge créé." });
    } catch (cause) {
      setErr(errorMessage(cause, "Le badge n’a pas pu être enregistré."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!badge) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteBadge(badge.id);
      onDeleted(badge.id);
    } catch (cause) {
      setErr(errorMessage(cause, "Le badge n’a pas pu être supprimé."));
      setBusy(false);
    }
  }

  return (
    <EditorCard title={isNew ? "Nouveau badge" : "Modifier le badge"} flash={flash} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="flex items-center gap-4 rounded-xl border border-[var(--cp-line)] bg-black/20 px-4 py-3">
          <span className="adm-list-icon" aria-hidden="true">
            <SlugIcon name={icon} size={24} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-white">{names.title.trim() || "Nom du badge"}</p>
            <p className="adm-muted truncate text-sm">{description.trim() || "Aperçu tel que les apprenants le verront."}</p>
          </div>
        </div>
        <Input id={`${id}-name`} label="Nom" value={names.title} onChange={(e) => names.setTitle(e.target.value)} maxLength={80} required />
        <Input id={`${id}-slug`} label="Slug" value={names.slug} onChange={(e) => names.setSlug(e.target.value)} maxLength={60} required spellCheck={false} autoCapitalize="off" />
        <Field label={`Description (${description.length}/300)`}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={300} />
        </Field>
        <Select id={`${id}-icon`} label="Icône" value={icon} onChange={(e) => setIcon(e.target.value)} options={iconOptions(icon)} />
        <Select id={`${id}-criteria`} label="Critère d’obtention" value={criteria} onChange={(e) => setCriteria(e.target.value)} options={toOptions(CRITERIA_LABELS)} />
        {forCourse ? (
          <div className="space-y-2">
            <Select id={`${id}-course`} label="Cours à terminer" value={courseId} onChange={(e) => setCourseId(e.target.value)} options={courseOptions} />
            {coursesError && <p className="text-sm text-red-200">{coursesError}</p>}
          </div>
        ) : (
          <Input id={`${id}-value`} label="Seuil à atteindre" type="number" inputMode="numeric" min={1} max={1000000} value={value} onChange={(e) => setValue(e.target.value)} />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id={`${id}-xp`} label="Bonus (XP)" type="number" inputMode="numeric" min={0} max={5000} value={xp} onChange={(e) => setXp(e.target.value)} />
          <Input id={`${id}-position`} label="Position" type="number" inputMode="numeric" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <Toggle label="Badge actif (attribuable aux apprenants)" checked={isActive} onChange={setIsActive} />
        {err && <Notice kind="error">{err}</Notice>}
        <EditorActions busy={busy} isNew={isNew} createLabel="Créer le badge" onDelete={() => void remove()} />
      </form>
    </EditorCard>
  );
}

// ─── Challenges ──────────────────────────────────────────────────────────────

const PERIOD_LABELS: Record<string, string> = { daily: "Quotidien", weekly: "Hebdomadaire", one_time: "Ponctuel" };
const METRIC_LABELS: Record<string, string> = {
  lessons_completed: "Leçons terminées",
  quizzes_passed: "Quiz réussis",
  xp_earned: "XP gagné",
  study_minutes: "Minutes d’étude",
  labs_solved: "Labs résolus",
};
const METRIC_UNITS: Record<string, [string, string]> = {
  lessons_completed: ["leçon", "leçons"],
  quizzes_passed: ["quiz réussi", "quiz réussis"],
  xp_earned: ["XP", "XP"],
  study_minutes: ["minute d’étude", "minutes d’étude"],
  labs_solved: ["lab résolu", "labs résolus"],
};

function challengeGoal(challenge: Pick<ChallengeRow, "metric" | "target">) {
  const [one, many] = METRIC_UNITS[challenge.metric] ?? [challenge.metric, challenge.metric];
  return plural(challenge.target, one, many);
}

function scheduleState(challenge: ChallengeRow, now: number): "scheduled" | "ended" | null {
  if (challenge.starts_at && new Date(challenge.starts_at).getTime() > now) return "scheduled";
  if (challenge.ends_at && new Date(challenge.ends_at).getTime() < now) return "ended";
  return null;
}

export function AdminChallengesPage() {
  const catalog = useCatalog<ChallengeRow>(listChallenges, (challenge) => challenge.title);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("all");
  const [sort, setSort] = useState<CatalogSort>("position");
  const [now] = useState(() => Date.now());
  const rows = useMemo(
    () => sortCatalogRows((catalog.data ?? []).filter((challenge) => (active === "all" || challenge.is_active === (active === "active")) && matches(search, challenge.title, challenge.slug, challenge.description)), sort, (challenge) => challenge.title),
    [catalog.data, search, active, sort],
  );
  const total = catalog.data?.length ?? 0;
  const activeCount = catalog.data?.filter((challenge) => challenge.is_active).length ?? 0;

  const editor = catalog.editing === undefined ? null : (
    <ChallengeEditor
      key={catalog.editing?.id ?? "new"}
      challenge={catalog.editing}
      flash={catalog.flash}
      onClose={catalog.close}
      onSaved={catalog.saved}
      onDeleted={(id) => catalog.removed(id, "Défi supprimé.")}
    />
  );

  return (
    <div>
      <AdminPageHeader
        title="Défis"
        description="Objectifs quotidiens, hebdomadaires ou ponctuels. La progression est comptée par le serveur à chaque activité validée."
        action={<Button size="sm" icon={<IconPlus size={16} />} onClick={() => catalog.open(null)}>Nouveau défi</Button>}
      />
      {catalog.editing === undefined && catalog.flash && <div className="mb-4"><Notice kind={catalog.flash.kind}>{catalog.flash.text}</Notice></div>}
      <CatalogLayout editor={editor}>
        <Toolbar
          search={search} onSearch={setSearch} placeholder="Titre, slug ou description"
          filterLabel="État" filter={active} onFilter={setActive} filterOptions={ACTIVE_FILTER}
          sort={sort} onSort={setSort}
          summary={`${plural(rows.length, "défi affiché", "défis affichés")} sur ${formatNumber(total)} · ${plural(activeCount, "actif", "actifs")}`}
        />
        <CatalogBody
          catalog={catalog}
          rows={rows}
          loadingLabel="Chargement des défis…"
          emptyAll="Aucun défi pour le moment. Crée le premier avec « Nouveau défi »."
          emptyFiltered="Aucun défi ne correspond à ces filtres."
          renderRow={(challenge) => {
            const schedule = scheduleState(challenge, now);
            return (
              <CatalogRow
                key={challenge.id}
                active={catalog.editing?.id === challenge.id}
                onSelect={() => catalog.open(challenge)}
                icon={<SlugIcon name={challenge.icon} size={20} />}
                title={challenge.title}
                meta={`${PERIOD_LABELS[challenge.period] ?? challenge.period} · ${challengeGoal(challenge)} · ${formatNumber(challenge.xp_reward)} XP`}
                aside={(
                  <>
                    {schedule === "scheduled" && <Badge tone="blue">Programmé</Badge>}
                    {schedule === "ended" && <Badge tone="neutral">Terminé</Badge>}
                    <Badge tone={challenge.is_active ? "green" : "neutral"}>{challenge.is_active ? "Actif" : "Inactif"}</Badge>
                  </>
                )}
              />
            );
          }}
        />
      </CatalogLayout>
    </div>
  );
}

function ChallengeEditor({ challenge, flash, onClose, onSaved, onDeleted }: {
  challenge: ChallengeRow | null; flash: Flash; onClose: () => void; onSaved: (challenge: ChallengeRow, flash: Flash) => void; onDeleted: (id: string) => void;
}) {
  const isNew = !challenge;
  const id = useId();
  const names = useTitleSlug(challenge?.title ?? "", challenge?.slug ?? "", isNew);
  const [description, setDescription] = useState(challenge?.description ?? "");
  const [icon, setIcon] = useState(challenge?.icon ?? "target");
  const [period, setPeriod] = useState(challenge?.period ?? "daily");
  const [metric, setMetric] = useState(challenge?.metric ?? "lessons_completed");
  const [target, setTarget] = useState(String(challenge?.target ?? 2));
  const [xp, setXp] = useState(String(challenge?.xp_reward ?? 50));
  const [startsAt, setStartsAt] = useState(isoToLocalInput(challenge?.starts_at));
  const [endsAt, setEndsAt] = useState(isoToLocalInput(challenge?.ends_at));
  const [position, setPosition] = useState(String(challenge?.position ?? 0));
  const [isActive, setIsActive] = useState(challenge?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const targetValue = asInt(target, 0);

  function validate(): string | null {
    const title = names.title.trim();
    if (title.length < 3 || title.length > 120) return "Le titre doit contenir entre 3 et 120 caractères.";
    if (names.slug.length < 2 || names.slug.length > 60 || !SLUG_PATTERN.test(names.slug)) return "Le slug doit contenir 2 à 60 caractères : lettres minuscules, chiffres et tirets.";
    if (description.trim().length > 500) return "La description ne doit pas dépasser 500 caractères.";
    if (!ICON_PATTERN.test(icon)) return "Choisis une icône valide.";
    if (targetValue < 1 || targetValue > 100_000) return "L’objectif doit être compris entre 1 et 100 000.";
    const xpValue = asInt(xp, -1);
    if (xpValue < 0 || xpValue > 5000) return "La récompense doit être comprise entre 0 et 5 000 XP.";
    const start = localInputToIso(startsAt);
    const end = localInputToIso(endsAt);
    if (startsAt && !start) return "La date de début est invalide.";
    if (endsAt && !end) return "La date de fin est invalide.";
    if (start && end && new Date(end) <= new Date(start)) return "La date de fin doit suivre la date de début.";
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) { setErr(problem); return; }
    setBusy(true);
    setErr(null);
    const changes: ChallengeChanges = {
      slug: names.slug,
      title: names.title.trim(),
      description: description.trim(),
      icon,
      period,
      metric,
      target: targetValue,
      xp_reward: asInt(xp),
      starts_at: localInputToIso(startsAt),
      ends_at: localInputToIso(endsAt),
      position: asInt(position),
      is_active: isActive,
    };
    try {
      const saved = challenge
        ? await updateChallenge(challenge.id, changes)
        : await createChallenge({ ...changes, slug: names.slug, title: names.title.trim(), period, metric, target: targetValue });
      onSaved(saved, { kind: "success", text: challenge ? "Défi enregistré." : "Défi créé." });
    } catch (cause) {
      setErr(errorMessage(cause, "Le défi n’a pas pu être enregistré."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!challenge) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteChallenge(challenge.id);
      onDeleted(challenge.id);
    } catch (cause) {
      setErr(errorMessage(cause, "Le défi n’a pas pu être supprimé."));
      setBusy(false);
    }
  }

  return (
    <EditorCard
      title={isNew ? "Nouveau défi" : "Modifier le défi"}
      subtitle={`${PERIOD_LABELS[period] ?? period} : ${targetValue > 0 ? challengeGoal({ metric, target: targetValue }) : "objectif à définir"}`}
      flash={flash}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input id={`${id}-title`} label="Titre" value={names.title} onChange={(e) => names.setTitle(e.target.value)} maxLength={120} required />
        <Input id={`${id}-slug`} label="Slug" value={names.slug} onChange={(e) => names.setSlug(e.target.value)} maxLength={60} required spellCheck={false} autoCapitalize="off" />
        <Field label={`Description (${description.length}/500)`}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
        </Field>
        <div className="flex items-end gap-3">
          <span className="adm-list-icon" aria-hidden="true">
            <SlugIcon name={icon} size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <Select id={`${id}-icon`} label="Icône" value={icon} onChange={(e) => setIcon(e.target.value)} options={iconOptions(icon)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id={`${id}-period`} label="Période" value={period} onChange={(e) => setPeriod(e.target.value)} options={toOptions(PERIOD_LABELS)} />
          <Select id={`${id}-metric`} label="Mesure" value={metric} onChange={(e) => setMetric(e.target.value)} options={toOptions(METRIC_LABELS)} />
          <Input id={`${id}-target`} label="Objectif" type="number" inputMode="numeric" min={1} max={100000} value={target} onChange={(e) => setTarget(e.target.value)} />
          <Input id={`${id}-xp`} label="Récompense (XP)" type="number" inputMode="numeric" min={0} max={5000} value={xp} onChange={(e) => setXp(e.target.value)} />
          <Input id={`${id}-starts`} label="Début (facultatif)" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <Input id={`${id}-ends`} label="Fin (facultatif)" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <Input id={`${id}-position`} label="Position" type="number" inputMode="numeric" value={position} onChange={(e) => setPosition(e.target.value)} />
        <Toggle label="Défi actif (visible par les apprenants)" checked={isActive} onChange={setIsActive} />
        {err && <Notice kind="error">{err}</Notice>}
        <EditorActions busy={busy} isNew={isNew} createLabel="Créer le défi" onDelete={() => void remove()} />
      </form>
    </EditorCard>
  );
}
