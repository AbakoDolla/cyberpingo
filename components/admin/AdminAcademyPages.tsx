"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import SlugIcon from "@/components/ui/SlugIcon";
import { IconCheck, IconPlus, IconSend, IconStar, IconTarget, IconTrash } from "@/components/ui/Icon";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatNumber } from "@/lib/format";
import { linkKindLabel } from "@/lib/academy-view";
import { MASCOT_EVENTS, MASCOT_EVENT_LABELS, MASCOT_EXPRESSIONS, MASCOT_EXPRESSION_LABELS } from "@/lib/mascot/events";
import {
  adminReviewSubmission, createDomain, createMascotLine, createSkill, createSkillLink, deleteDomain, deleteMascotLine, deleteSkill,
  deleteSkillLink, listDomains, listLabSubmissions, listMascotLines, listSkillLinkTargets, listSkillLinks, listSkills, updateDomain,
  updateMascotLine, updateSkill,
  type AdminSubmission, type DomainInput, type DomainRow, type MascotLineInput, type MascotLineRow, type SkillInput, type SkillLinkKind,
  type SkillLinkRow, type SkillLinkTargets, type SkillRow, type SubmissionStatus,
} from "@/services/admin.service";
import type { MascotEvent, MascotExpression } from "@/types/api";
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader, Notice } from "./AdminState";
import {
  ACTIVE_FILTER, CatalogBody, CatalogLayout, CatalogRow, EditorActions, EditorCard, ICON_PATTERN, SLUG_PATTERN, Toolbar, matches, plural,
  sortCatalogRows, useCatalog, useTitleSlug, type CatalogSort, type Flash,
} from "./AdminCatalogPages";
import { Field, Textarea, Toggle, asInt } from "./AdminFields";

const nextPosition = (rows: { position: number }[] | undefined) => (rows?.length ? Math.max(...rows.map((row) => row.position)) + 1 : 0);

// ─── Compétences et domaines ─────────────────────────────────────────────────

type CompetenceView = "skills" | "domains";

const DOMAIN_ICON_SLUGS = ["fondamentaux", "reseaux", "linux", "securite-web", "pentest-intro", "analyse-logs", "shield", "lock", "terminal", "network", "web", "eye", "brain", "target"];

const SKILL_FILTER_NONE = "none";

export function AdminCompetencesPage() {
  const [view, setView] = useState<CompetenceView>("skills");
  const domains = useCatalog<DomainRow>(listDomains, (domain) => domain.name);
  const skills = useCatalog<SkillRow>(listSkills, (skill) => skill.name);
  const links = useAsync(listSkillLinks, []);
  const targets = useAsync(listSkillLinkTargets, []);
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");
  const [sort, setSort] = useState<CatalogSort>("position");

  const skillRows = useMemo(() => skills.data ?? [], [skills.data]);
  const domainRows = useMemo(() => domains.data ?? [], [domains.data]);
  const active = view === "skills" ? skills : domains;

  function switchView(next: CompetenceView) {
    if (next === view) return;
    skills.close();
    domains.close();
    setSearch("");
    setDomainFilter("all");
    setView(next);
  }

  const domainById = useMemo(() => new Map(domainRows.map((domain) => [domain.id, domain])), [domainRows]);
  const skillCountByDomain = useMemo(() => {
    const counts = new Map<string, number>();
    for (const skill of skillRows) if (skill.domain_id) counts.set(skill.domain_id, (counts.get(skill.domain_id) ?? 0) + 1);
    return counts;
  }, [skillRows]);
  const linksBySkill = useMemo(() => {
    const grouped = new Map<string, SkillLinkRow[]>();
    for (const link of links.data ?? []) grouped.set(link.skill_id, [...(grouped.get(link.skill_id) ?? []), link]);
    return grouped;
  }, [links.data]);

  const visibleSkills = useMemo(
    () => sortCatalogRows(
      skillRows.filter((skill) => {
        const inDomain = domainFilter === "all" || (domainFilter === SKILL_FILTER_NONE ? !skill.domain_id : skill.domain_id === domainFilter);
        return inDomain && matches(search, skill.name, skill.slug, skill.description);
      }),
      sort,
      (skill) => skill.name,
    ),
    [skillRows, domainFilter, search, sort],
  );
  const visibleDomains = useMemo(
    () => sortCatalogRows(
      domainRows.filter((domain) => {
        const count = skillCountByDomain.get(domain.id) ?? 0;
        const byCount = domainFilter === "all" || (domainFilter === "with" ? count > 0 : count === 0);
        return byCount && matches(search, domain.name, domain.slug, domain.description);
      }),
      sort,
      (domain) => domain.name,
    ),
    [domainRows, skillCountByDomain, domainFilter, search, sort],
  );

  const skillEditor = skills.editing === undefined ? null : (
    <SkillEditor
      key={skills.editing?.id ?? "new"}
      skill={skills.editing}
      domains={domainRows}
      defaultDomainId={domainById.has(domainFilter) ? domainFilter : ""}
      nextPosition={nextPosition(skills.data)}
      links={skills.editing ? linksBySkill.get(skills.editing.id) ?? [] : []}
      targets={targets.data}
      targetsError={targets.error?.message ?? links.error?.message ?? null}
      flash={skills.flash}
      onClose={skills.close}
      onSaved={skills.saved}
      onDeleted={(id) => { skills.removed(id, "Compétence supprimée."); void links.reload(); }}
      onLinkAdded={(link) => links.setData((current) => [...(current ?? []), link])}
      onLinkRemoved={(linkId) => links.setData((current) => current?.filter((link) => link.id !== linkId))}
    />
  );

  const domainEditor = domains.editing === undefined ? null : (
    <DomainEditor
      key={domains.editing?.id ?? "new"}
      domain={domains.editing}
      nextPosition={nextPosition(domains.data)}
      skillCount={domains.editing ? skillCountByDomain.get(domains.editing.id) ?? 0 : 0}
      flash={domains.flash}
      onClose={domains.close}
      onSaved={domains.saved}
      onDeleted={(id) => { domains.removed(id, "Domaine supprimé."); void skills.reload(); }}
    />
  );

  const skillTotal = skillRows.length;
  const validatable = skillRows.filter((skill) => linksBySkill.get(skill.id)?.some((link) => link.kind === "validation")).length;

  return (
    <div>
      <AdminPageHeader
        title="Compétences"
        description="Les domaines regroupent les compétences. Chaque compétence est reliée à des leçons, des quiz et des labs : sa maîtrise est calculée par le serveur, et seule une évaluation pratique la valide."
        action={
          <Button size="sm" icon={<IconPlus size={16} />} onClick={() => active.open(null)}>
            {view === "skills" ? "Nouvelle compétence" : "Nouveau domaine"}
          </Button>
        }
      />
      {active.editing === undefined && active.flash && <div className="mb-4"><Notice kind={active.flash.kind}>{active.flash.text}</Notice></div>}
      <div role="group" aria-label="Affichage" className="mb-5 flex flex-wrap gap-2">
        <Button size="sm" variant={view === "skills" ? "primary" : "secondary"} aria-pressed={view === "skills"} onClick={() => switchView("skills")}>
          Compétences
        </Button>
        <Button size="sm" variant={view === "domains" ? "primary" : "secondary"} aria-pressed={view === "domains"} onClick={() => switchView("domains")}>
          Domaines
        </Button>
      </div>

      {view === "skills" ? (
        <CatalogLayout editor={skillEditor}>
          <Toolbar
            search={search} onSearch={setSearch} placeholder="Nom, slug ou description"
            filterLabel="Domaine" filter={domainFilter} onFilter={setDomainFilter}
            filterOptions={[
              { value: "all", label: "Tous les domaines" },
              ...domainRows.map((domain) => ({ value: domain.id, label: domain.name })),
              { value: SKILL_FILTER_NONE, label: "Sans domaine" },
            ]}
            sort={sort} onSort={setSort}
            summary={`${plural(visibleSkills.length, "compétence affichée", "compétences affichées")} sur ${formatNumber(skillTotal)} · ${plural(validatable, "validable", "validables")} par une évaluation`}
          />
          <CatalogBody
            catalog={skills}
            rows={visibleSkills}
            loadingLabel="Chargement des compétences…"
            emptyAll="Aucune compétence pour le moment. Crée un domaine puis ta première compétence."
            emptyFiltered="Aucune compétence ne correspond à ces filtres."
            renderRow={(skill) => {
              const domain = skill.domain_id ? domainById.get(skill.domain_id) : undefined;
              const skillLinks = linksBySkill.get(skill.id) ?? [];
              const hasValidation = skillLinks.some((link) => link.kind === "validation");
              return (
                <CatalogRow
                  key={skill.id}
                  active={skills.editing?.id === skill.id}
                  onSelect={() => skills.open(skill)}
                  icon={<SlugIcon name={domain?.icon ?? "target"} size={20} fallback={IconTarget} />}
                  title={skill.name}
                  meta={`${domain?.name ?? "Sans domaine"} · ${plural(skillLinks.length, "ressource liée", "ressources liées")}`}
                  aside={<Badge tone={hasValidation ? "green" : "neutral"}>{hasValidation ? "Validable" : "Sans évaluation"}</Badge>}
                />
              );
            }}
          />
        </CatalogLayout>
      ) : (
        <CatalogLayout editor={domainEditor}>
          <Toolbar
            search={search} onSearch={setSearch} placeholder="Nom, slug ou description"
            filterLabel="Contenu" filter={domainFilter} onFilter={setDomainFilter}
            filterOptions={[
              { value: "all", label: "Tous les domaines" },
              { value: "with", label: "Avec compétences" },
              { value: "empty", label: "Sans compétence" },
            ]}
            sort={sort} onSort={setSort}
            summary={`${plural(visibleDomains.length, "domaine affiché", "domaines affichés")} sur ${formatNumber(domainRows.length)}`}
          />
          <CatalogBody
            catalog={domains}
            rows={visibleDomains}
            loadingLabel="Chargement des domaines…"
            emptyAll="Aucun domaine pour le moment. Crée le premier avec « Nouveau domaine »."
            emptyFiltered="Aucun domaine ne correspond à ces filtres."
            renderRow={(domain) => {
              const count = skillCountByDomain.get(domain.id) ?? 0;
              return (
                <CatalogRow
                  key={domain.id}
                  active={domains.editing?.id === domain.id}
                  onSelect={() => domains.open(domain)}
                  icon={<SlugIcon name={domain.icon} size={20} fallback={IconTarget} />}
                  title={domain.name}
                  meta={`${domain.slug} · ${plural(count, "compétence", "compétences")}`}
                  aside={<Badge tone={count > 0 ? "blue" : "neutral"}>{plural(count, "compétence", "compétences")}</Badge>}
                />
              );
            }}
          />
        </CatalogLayout>
      )}
    </div>
  );
}

function DomainEditor({ domain, nextPosition: suggested, skillCount, flash, onClose, onSaved, onDeleted }: {
  domain: DomainRow | null; nextPosition: number; skillCount: number; flash: Flash;
  onClose: () => void; onSaved: (domain: DomainRow, flash: Flash) => void; onDeleted: (id: string) => void;
}) {
  const isNew = !domain;
  const id = useId();
  const names = useTitleSlug(domain?.name ?? "", domain?.slug ?? "", isNew);
  const [description, setDescription] = useState(domain?.description ?? "");
  const [icon, setIcon] = useState(domain?.icon ?? "shield");
  const [position, setPosition] = useState(String(domain?.position ?? suggested));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function validate(): string | null {
    const name = names.title.trim();
    if (name.length < 2 || name.length > 80) return "Le nom doit contenir entre 2 et 80 caractères.";
    if (names.slug.length < 2 || names.slug.length > 60 || !SLUG_PATTERN.test(names.slug)) return "Le slug doit contenir 2 à 60 caractères : minuscules, chiffres et tirets.";
    if (description.trim().length > 500) return "La description ne doit pas dépasser 500 caractères.";
    if (!ICON_PATTERN.test(icon.trim())) return "L’icône doit être un identifiant de 2 à 40 caractères : minuscules, chiffres et tirets.";
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) { setErr(problem); return; }
    setBusy(true);
    setErr(null);
    const input: DomainInput = {
      slug: names.slug,
      name: names.title.trim(),
      description: description.trim(),
      icon: icon.trim(),
      position: asInt(position, 0),
    };
    try {
      const saved = domain ? await updateDomain(domain.id, input) : await createDomain(input);
      onSaved(saved, { kind: "success", text: domain ? "Domaine enregistré." : "Domaine créé." });
    } catch (cause) {
      setErr(errorMessage(cause, "Le domaine n’a pas pu être enregistré."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!domain) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteDomain(domain.id);
      onDeleted(domain.id);
    } catch (cause) {
      setErr(errorMessage(cause, "Le domaine n’a pas pu être supprimé."));
      setBusy(false);
    }
  }

  return (
    <EditorCard
      title={isNew ? "Nouveau domaine" : "Modifier le domaine"}
      subtitle={!isNew && skillCount > 0 ? `${plural(skillCount, "compétence rattachée", "compétences rattachées")} : elles resteront, sans domaine, si tu le supprimes.` : undefined}
      flash={flash}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input id={`${id}-name`} label="Nom" value={names.title} onChange={(e) => names.setTitle(e.target.value)} maxLength={80} required />
        <Input id={`${id}-slug`} label="Slug" value={names.slug} onChange={(e) => names.setSlug(e.target.value)} maxLength={60} required spellCheck={false} autoCapitalize="off" />
        <Field label={`Description (${description.length}/500)`}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
        </Field>
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <Input id={`${id}-icon`} label="Icône" value={icon} onChange={(e) => setIcon(e.target.value.toLowerCase())} list={`${id}-icons`} maxLength={40} spellCheck={false} autoCapitalize="off" />
            <datalist id={`${id}-icons`}>{DOMAIN_ICON_SLUGS.map((slug) => <option key={slug} value={slug} />)}</datalist>
          </div>
          <span className="adm-list-icon" aria-hidden="true"><SlugIcon name={icon.trim()} size={22} fallback={IconTarget} /></span>
        </div>
        <Input id={`${id}-position`} label="Position" type="number" inputMode="numeric" value={position} onChange={(e) => setPosition(e.target.value)} />
        {err && <Notice kind="error">{err}</Notice>}
        <EditorActions busy={busy} isNew={isNew} createLabel="Créer le domaine" onDelete={() => void remove()} />
      </form>
    </EditorCard>
  );
}

function SkillEditor({ skill, domains, defaultDomainId, nextPosition: suggested, links, targets, targetsError, flash, onClose, onSaved, onDeleted, onLinkAdded, onLinkRemoved }: {
  skill: SkillRow | null; domains: DomainRow[]; defaultDomainId: string; nextPosition: number;
  links: SkillLinkRow[]; targets: SkillLinkTargets | undefined; targetsError: string | null; flash: Flash;
  onClose: () => void; onSaved: (skill: SkillRow, flash: Flash) => void; onDeleted: (id: string) => void;
  onLinkAdded: (link: SkillLinkRow) => void; onLinkRemoved: (linkId: string) => void;
}) {
  const isNew = !skill;
  const id = useId();
  const names = useTitleSlug(skill?.name ?? "", skill?.slug ?? "", isNew);
  const [domainId, setDomainId] = useState(skill?.domain_id ?? defaultDomainId);
  const [description, setDescription] = useState(skill?.description ?? "");
  const [position, setPosition] = useState(String(skill?.position ?? suggested));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function validate(): string | null {
    const name = names.title.trim();
    if (!domainId) return "Choisis le domaine de la compétence.";
    if (name.length < 2 || name.length > 120) return "Le nom doit contenir entre 2 et 120 caractères.";
    if (names.slug.length < 2 || names.slug.length > 80 || !SLUG_PATTERN.test(names.slug)) return "Le slug doit contenir 2 à 80 caractères : minuscules, chiffres et tirets.";
    if (description.trim().length > 500) return "La description ne doit pas dépasser 500 caractères.";
    return null;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) { setErr(problem); return; }
    setBusy(true);
    setErr(null);
    const input: SkillInput = { domain_id: domainId, slug: names.slug, name: names.title.trim(), description: description.trim(), position: asInt(position, 0) };
    try {
      const saved = skill ? await updateSkill(skill.id, input) : await createSkill(input);
      onSaved(saved, { kind: "success", text: skill ? "Compétence enregistrée." : "Compétence créée : relie-lui maintenant des leçons, des quiz et des labs." });
    } catch (cause) {
      setErr(errorMessage(cause, "La compétence n’a pas pu être enregistrée."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!skill) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteSkill(skill.id);
      onDeleted(skill.id);
    } catch (cause) {
      setErr(errorMessage(cause, "La compétence n’a pas pu être supprimée."));
      setBusy(false);
    }
  }

  return (
    <EditorCard title={isNew ? "Nouvelle compétence" : "Modifier la compétence"} flash={flash} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Select
          id={`${id}-domain`}
          label="Domaine"
          value={domainId}
          onChange={(e) => setDomainId(e.target.value)}
          options={[{ value: "", label: domains.length ? "Choisir un domaine" : "Aucun domaine : crées-en un d’abord" }, ...domains.map((domain) => ({ value: domain.id, label: domain.name }))]}
        />
        <Input id={`${id}-name`} label="Nom" value={names.title} onChange={(e) => names.setTitle(e.target.value)} maxLength={120} required />
        <Input id={`${id}-slug`} label="Slug" value={names.slug} onChange={(e) => names.setSlug(e.target.value)} maxLength={80} required spellCheck={false} autoCapitalize="off" />
        <Field label={`Description (${description.length}/500)`}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
        </Field>
        <Input id={`${id}-position`} label="Position" type="number" inputMode="numeric" value={position} onChange={(e) => setPosition(e.target.value)} />
        {err && <Notice kind="error">{err}</Notice>}
        <EditorActions busy={busy} isNew={isNew} createLabel="Créer la compétence" onDelete={() => void remove()} />
      </form>
      {skill
        ? <SkillLinksPanel skillId={skill.id} links={links} targets={targets} loadError={targetsError} onAdded={onLinkAdded} onRemoved={onLinkRemoved} />
        : <p className="adm-muted adm-divider mt-6 pt-5 text-sm">Enregistre la compétence pour lui relier des leçons, des quiz et des labs.</p>}
    </EditorCard>
  );
}

const LINK_KINDS: SkillLinkKind[] = ["lesson", "quiz", "practice", "validation"];

const LINK_KIND_HELP: Record<SkillLinkKind, string> = {
  lesson: "Terminer la leçon fait progresser la compétence.",
  quiz: "Réussir le quiz consolide la compétence.",
  practice: "Résoudre le lab entraîne la compétence.",
  validation: "Réussir cette évaluation pratique valide la compétence.",
};

function targetOptions(kind: SkillLinkKind, targets: SkillLinkTargets | undefined, taken: Set<string>) {
  if (!targets) return [];
  if (kind === "lesson") return targets.lessons.map((row) => ({ value: row.id, label: `${row.course_title} · ${row.title}` }));
  if (kind === "quiz") return targets.quizzes.map((row) => ({ value: row.id, label: `${row.course_title} · ${row.title}` }));
  const labs = kind === "validation" ? targets.labs.filter((lab) => lab.is_assessment) : targets.labs;
  return labs.map((lab) => ({ value: lab.id, label: lab.title })).filter((option) => !taken.has(option.value));
}

function linkTargetId(link: SkillLinkRow): string {
  return link.lesson_id ?? link.quiz_id ?? link.lab_id ?? "";
}

function linkTargetTitle(link: SkillLinkRow, targets: SkillLinkTargets | undefined): string {
  if (!targets) return "…";
  const targetId = linkTargetId(link);
  const found = link.kind === "lesson"
    ? targets.lessons.find((row) => row.id === targetId)
    : link.kind === "quiz"
      ? targets.quizzes.find((row) => row.id === targetId)
      : targets.labs.find((row) => row.id === targetId);
  if (!found) return "Ressource introuvable";
  return "course_title" in found ? `${found.course_title} · ${found.title}` : found.title;
}

function SkillLinksPanel({ skillId, links, targets, loadError, onAdded, onRemoved }: {
  skillId: string; links: SkillLinkRow[]; targets: SkillLinkTargets | undefined; loadError: string | null;
  onAdded: (link: SkillLinkRow) => void; onRemoved: (linkId: string) => void;
}) {
  const headingId = useId();
  const id = useId();
  const [kind, setKind] = useState<SkillLinkKind>("lesson");
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Flash>(null);

  const taken = useMemo(() => new Set(links.filter((link) => link.kind === kind).map(linkTargetId)), [links, kind]);
  const options = useMemo(() => targetOptions(kind, targets, taken).filter((option) => !taken.has(option.value)), [kind, targets, taken]);
  const validationCount = links.filter((link) => link.kind === "validation").length;

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!targetId) { setNotice({ kind: "error", text: "Choisis la ressource à relier." }); return; }
    setBusy(true);
    setNotice(null);
    try {
      const created = await createSkillLink({
        skill_id: skillId,
        kind,
        ...(kind === "lesson" ? { lesson_id: targetId } : kind === "quiz" ? { quiz_id: targetId } : { lab_id: targetId }),
      });
      onAdded(created);
      setTargetId("");
      setNotice({ kind: "success", text: "Ressource reliée." });
    } catch (cause) {
      setNotice({ kind: "error", text: errorMessage(cause, "Le lien n’a pas pu être créé.") });
    } finally {
      setBusy(false);
    }
  }

  async function remove(link: SkillLinkRow) {
    setBusy(true);
    setNotice(null);
    try {
      await deleteSkillLink(link.id);
      onRemoved(link.id);
    } catch (cause) {
      setNotice({ kind: "error", text: errorMessage(cause, "Le lien n’a pas pu être retiré.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={headingId} className="adm-divider mt-6 space-y-4 pt-5">
      <div>
        <h3 id={headingId} className="font-display text-sm font-semibold text-white">Ressources reliées</h3>
        <p className="adm-muted mt-1 text-sm">
          {validationCount === 0
            ? "Sans évaluation reliée, cette compétence ne pourra jamais être validée."
            : `${plural(validationCount, "évaluation reliée", "évaluations reliées")} : la compétence peut être validée.`}
        </p>
      </div>
      {loadError && <Notice kind="error">{loadError}</Notice>}
      {links.length === 0 ? (
        <p className="adm-muted text-sm">Aucune ressource reliée pour le moment.</p>
      ) : (
        <ul className="skill-links-list">
          {LINK_KINDS.flatMap((group) => links.filter((link) => link.kind === group)).map((link) => (
            <li key={link.id}>
              <Badge tone={link.kind === "validation" ? "green" : "blue"}>{linkKindLabel(link.kind)}</Badge>
              <span className="truncate text-sm text-white">{linkTargetTitle(link, targets)}</span>
              <Button type="button" size="sm" variant="ghost" icon={<IconTrash size={15} />} disabled={busy} onClick={() => void remove(link)} aria-label={`Retirer ${linkTargetTitle(link, targets)}`} />
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} noValidate className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <Select
            id={`${id}-kind`}
            label="Type"
            value={kind}
            onChange={(e) => { setKind(e.target.value as SkillLinkKind); setTargetId(""); }}
            options={LINK_KINDS.map((value) => ({ value, label: linkKindLabel(value) }))}
          />
          <Select
            id={`${id}-target`}
            label="Ressource"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            disabled={!targets}
            options={[{ value: "", label: !targets ? "Chargement…" : options.length ? "Choisir…" : kind === "validation" ? "Aucun lab d’évaluation disponible" : "Rien à relier" }, ...options]}
          />
        </div>
        <p className="adm-muted text-sm">{LINK_KIND_HELP[kind]}{kind === "validation" ? " Seuls les labs marqués « Évaluation » sont proposés." : ""}</p>
        <Button type="submit" size="sm" variant="secondary" icon={<IconPlus size={16} />} loading={busy} disabled={!targets || options.length === 0}>Relier</Button>
        {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}
      </form>
    </section>
  );
}

// ─── Répliques de la mascotte ────────────────────────────────────────────────

const EVENT_OPTIONS = MASCOT_EVENTS.map((value) => ({ value, label: MASCOT_EVENT_LABELS[value] }));
const EXPRESSION_OPTIONS = MASCOT_EXPRESSIONS.map((value) => ({ value, label: MASCOT_EXPRESSION_LABELS[value] }));
const MASCOT_SORT_OPTIONS = [
  { value: "position", label: "Position" },
  { value: "title", label: "Texte A-Z" },
  { value: "updated", label: "Mis à jour récemment" },
];
const AUDIO_HTTPS = /^https:\/\/\S{4,}$/;
const AUDIO_LOCAL = /^\/audio\/[A-Za-z0-9._/-]{1,200}$/;

export function AdminMascottePage() {
  const catalog = useCatalog<MascotLineRow>(listMascotLines, (line) => line.text_fr);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [sort, setSort] = useState<CatalogSort>("position");

  const rows = useMemo(
    () => sortCatalogRows(
      (catalog.data ?? []).filter((line) => (eventFilter === "all" || line.event === eventFilter) && matches(search, line.text_fr, MASCOT_EVENT_LABELS[line.event], MASCOT_EXPRESSION_LABELS[line.expression])),
      sort,
      (line) => line.text_fr,
    ),
    [catalog.data, search, eventFilter, sort],
  );
  const uncovered = useMemo(
    () => (catalog.data ? MASCOT_EVENTS.filter((event) => !catalog.data?.some((line) => line.event === event && line.is_active)) : []),
    [catalog.data],
  );
  const total = catalog.data?.length ?? 0;
  const voiced = catalog.data?.filter((line) => line.audio_url).length ?? 0;

  const editor = catalog.editing === undefined ? null : (
    <MascotLineEditor
      key={catalog.editing?.id ?? "new"}
      line={catalog.editing}
      defaultEvent={eventFilter === "all" ? "welcome" : (eventFilter as MascotEvent)}
      nextPosition={nextPosition(catalog.data)}
      flash={catalog.flash}
      onClose={catalog.close}
      onSaved={catalog.saved}
      onDeleted={(id) => catalog.removed(id, "Réplique supprimée.")}
    />
  );

  return (
    <div>
      <AdminPageHeader
        title="Mascotte"
        description="Les répliques que Pingo prononce selon les événements de la formation. Aucune phrase n’est écrite en dur dans l’application : tout vient d’ici."
        action={<Button size="sm" icon={<IconPlus size={16} />} onClick={() => catalog.open(null)}>Nouvelle réplique</Button>}
      />
      <p className="mascot-admin-note">
        La voix ne passe que par de vraies voix humaines enregistrées. Renseigne le fichier audio et le crédit de la personne qui l’a enregistré ; sans audio, la réplique s’affiche en sous-titre uniquement.
      </p>
      {catalog.editing === undefined && catalog.flash && <div className="mb-4"><Notice kind={catalog.flash.kind}>{catalog.flash.text}</Notice></div>}
      {uncovered.length > 0 && (
        <div className="mb-4">
          <Notice kind="info">
            {`Événements sans réplique active : ${uncovered.map((event) => MASCOT_EVENT_LABELS[event]).join(", ")}. Pingo restera silencieux pour ces moments.`}
          </Notice>
        </div>
      )}
      <CatalogLayout editor={editor}>
        <Toolbar
          search={search} onSearch={setSearch} placeholder="Texte, événement ou expression"
          filterLabel="Événement" filter={eventFilter} onFilter={setEventFilter}
          filterOptions={[{ value: "all", label: "Tous les événements" }, ...EVENT_OPTIONS]}
          sort={sort} onSort={setSort} sortOptions={MASCOT_SORT_OPTIONS}
          summary={`${plural(rows.length, "réplique affichée", "répliques affichées")} sur ${formatNumber(total)} · ${plural(voiced, "avec voix", "avec voix")}`}
        />
        <CatalogBody
          catalog={catalog}
          rows={rows}
          loadingLabel="Chargement des répliques…"
          emptyAll="Aucune réplique pour le moment. Pingo reste muet tant que tu n’en ajoutes pas."
          emptyFiltered="Aucune réplique ne correspond à ces filtres."
          renderRow={(line) => (
            <CatalogRow
              key={line.id}
              active={catalog.editing?.id === line.id}
              onSelect={() => catalog.open(line)}
              icon={<IconStar size={18} />}
              title={line.text_fr}
              meta={`${MASCOT_EVENT_LABELS[line.event]} · ${MASCOT_EXPRESSION_LABELS[line.expression]} · priorité ${line.priority}`}
              aside={
                <>
                  {!line.is_active && <Badge tone="amber">Inactive</Badge>}
                  <Badge tone={line.audio_url ? "green" : "neutral"}>{line.audio_url ? "Voix" : "Texte seul"}</Badge>
                </>
              }
            />
          )}
        />
      </CatalogLayout>
    </div>
  );
}

function MascotLineEditor({ line, defaultEvent, nextPosition: suggested, flash, onClose, onSaved, onDeleted }: {
  line: MascotLineRow | null; defaultEvent: MascotEvent; nextPosition: number; flash: Flash;
  onClose: () => void; onSaved: (line: MascotLineRow, flash: Flash) => void; onDeleted: (id: string) => void;
}) {
  const isNew = !line;
  const id = useId();
  const [event, setEvent] = useState<MascotEvent>(line?.event ?? defaultEvent);
  const [expression, setExpression] = useState<MascotExpression>(line?.expression ?? "happy");
  const [text, setText] = useState(line?.text_fr ?? "");
  const [priority, setPriority] = useState(String(line?.priority ?? 5));
  const [audioUrl, setAudioUrl] = useState(line?.audio_url ?? "");
  const [credit, setCredit] = useState(line?.voice_credit ?? "");
  const [isActive, setIsActive] = useState(line?.is_active ?? true);
  const [position, setPosition] = useState(String(line?.position ?? suggested));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function validate(): string | null {
    const sentence = text.trim();
    if (sentence.length < 1 || sentence.length > 280) return "La réplique doit contenir entre 1 et 280 caractères.";
    const weight = Number(priority);
    if (!Number.isInteger(weight) || weight < 1 || weight > 10) return "La priorité est un nombre entier entre 1 et 10.";
    const audio = audioUrl.trim();
    if (audio) {
      const valid = audio.length <= 508 && !audio.includes("..") && (AUDIO_HTTPS.test(audio) || AUDIO_LOCAL.test(audio));
      if (!valid) return "Le fichier audio doit commencer par https:// ou par /audio/ (fichier hébergé avec le site).";
      if (credit.trim().length < 1) return "Indique le crédit de la voix : seule une vraie voix humaine créditée est acceptée.";
    }
    if (credit.trim().length > 120) return "Le crédit de la voix ne doit pas dépasser 120 caractères.";
    return null;
  }

  async function submit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    const problem = validate();
    if (problem) { setErr(problem); return; }
    setBusy(true);
    setErr(null);
    const input: MascotLineInput = {
      event,
      expression,
      text_fr: text.trim(),
      audio_url: audioUrl.trim() || null,
      voice_credit: credit.trim() || null,
      priority: Number(priority),
      is_active: isActive,
      position: asInt(position, 0),
    };
    try {
      const saved = line ? await updateMascotLine(line.id, input) : await createMascotLine(input);
      onSaved(saved, { kind: "success", text: line ? "Réplique enregistrée." : "Réplique créée." });
    } catch (cause) {
      setErr(errorMessage(cause, "La réplique n’a pas pu être enregistrée."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!line) return;
    setBusy(true);
    setErr(null);
    try {
      await deleteMascotLine(line.id);
      onDeleted(line.id);
    } catch (cause) {
      setErr(errorMessage(cause, "La réplique n’a pas pu être supprimée."));
      setBusy(false);
    }
  }

  return (
    <EditorCard title={isNew ? "Nouvelle réplique" : "Modifier la réplique"} flash={flash} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select id={`${id}-event`} label="Événement" value={event} onChange={(e) => setEvent(e.target.value as MascotEvent)} options={EVENT_OPTIONS} />
          <Select id={`${id}-expression`} label="Expression" value={expression} onChange={(e) => setExpression(e.target.value as MascotExpression)} options={EXPRESSION_OPTIONS} />
        </div>
        <Field label={`Réplique (${text.length}/280)`}>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={280} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id={`${id}-priority`} label="Priorité (1 à 10)" type="number" inputMode="numeric" min={1} max={10} value={priority} onChange={(e) => setPriority(e.target.value)} />
          <Input id={`${id}-position`} label="Position" type="number" inputMode="numeric" value={position} onChange={(e) => setPosition(e.target.value)} />
        </div>
        <Input id={`${id}-audio`} label="Fichier audio (facultatif)" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="/audio/bienvenue.mp3 ou https://…" maxLength={508} spellCheck={false} autoCapitalize="off" />
        <Input id={`${id}-credit`} label="Crédit de la voix" value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="Nom de la personne qui a enregistré" maxLength={120} />
        {line?.audio_url && (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- the spoken sentence is the text field above
          <audio controls preload="none" src={line.audio_url} className="w-full" />
        )}
        <Toggle label="Réplique active" checked={isActive} onChange={setIsActive} />
        {err && <Notice kind="error">{err}</Notice>}
        <EditorActions busy={busy} isNew={isNew} createLabel="Créer la réplique" onDelete={() => void remove()} />
      </form>
    </EditorCard>
  );
}

// ─── Rendus à corriger ───────────────────────────────────────────────────────

const SUBMISSION_LABELS: Record<SubmissionStatus, string> = {
  pending: "En attente",
  approved: "Validé",
  changes_requested: "À corriger",
};
const SUBMISSION_TONES: Record<SubmissionStatus, "amber" | "green" | "red"> = { pending: "amber", approved: "green", changes_requested: "red" };
const SUBMISSION_FILTER = [
  { value: "pending", label: "En attente" },
  { value: "changes_requested", label: "À corriger" },
  { value: "approved", label: "Validés" },
  { value: "all", label: "Tous les rendus" },
];

const learnerName = (submission: AdminSubmission) => submission.learner?.display_name || submission.learner?.username || "Apprenant";

export function AdminRendusPage() {
  const submissions = useAsync(listLabSubmissions, []);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(null);

  const all = submissions.data;
  const rows = useMemo(
    () => (all ?? []).filter((item) => (status === "all" || item.status === status) && matches(search, item.lab?.title, item.learner?.display_name, item.learner?.username, item.learner?.email, item.note)),
    [all, search, status],
  );
  const pending = all?.filter((item) => item.status === "pending").length ?? 0;
  const selected = all?.find((item) => item.id === selectedId) ?? null;

  async function reviewed(message: string) {
    await submissions.reload();
    setFlash({ kind: "success", text: message });
  }

  const editor = selected ? (
    <SubmissionReview
      key={selected.id}
      submission={selected}
      flash={flash}
      onClose={() => { setSelectedId(null); setFlash(null); }}
      onReviewed={reviewed}
    />
  ) : null;

  let body: React.ReactNode;
  if (submissions.loading && !all) body = <AdminLoading label="Chargement des rendus…" />;
  else if (submissions.error && !all) body = <AdminError message={submissions.error.message} onRetry={() => void submissions.reload()} />;
  else if (!all?.length) body = <AdminEmpty>Aucun rendu pour le moment. Ils arrivent ici quand un apprenant envoie son travail à la fin d’un lab Packet Tracer.</AdminEmpty>;
  else if (!rows.length) body = <AdminEmpty>Aucun rendu ne correspond à ces filtres.</AdminEmpty>;
  else {
    body = (
      <ul className="adm-list">
        {rows.map((item) => (
          <CatalogRow
            key={item.id}
            active={selectedId === item.id}
            onSelect={() => { setSelectedId(item.id); setFlash(null); }}
            icon={<IconSend size={18} />}
            title={item.lab?.title ?? "Lab supprimé"}
            meta={`${learnerName(item)} · ${formatDateTime(item.created_at)}`}
            aside={<Badge tone={SUBMISSION_TONES[item.status]}>{SUBMISSION_LABELS[item.status]}</Badge>}
          />
        ))}
      </ul>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Rendus"
        description="Les comptes rendus envoyés par les apprenants après un lab Packet Tracer. Valide le travail ou demande des corrections : l’apprenant est prévenu."
      />
      <CatalogLayout editor={editor}>
        <Toolbar
          search={search} onSearch={setSearch} placeholder="Lab, apprenant ou contenu du rendu"
          filterLabel="Statut" filter={status} onFilter={setStatus} filterOptions={SUBMISSION_FILTER}
          summary={`${plural(rows.length, "rendu affiché", "rendus affichés")} sur ${formatNumber(all?.length ?? 0)} · ${plural(pending, "en attente", "en attente")}`}
        />
        {body}
      </CatalogLayout>
    </div>
  );
}

function SubmissionReview({ submission, flash, onClose, onReviewed }: {
  submission: AdminSubmission; flash: Flash; onClose: () => void; onReviewed: (message: string) => Promise<void>;
}) {
  const id = useId();
  const [feedback, setFeedback] = useState(submission.feedback);
  const [busy, setBusy] = useState<Exclude<SubmissionStatus, "pending"> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const safeLink = submission.link && /^https:\/\/\S{4,}$/.test(submission.link) ? submission.link : null;

  async function review(next: Exclude<SubmissionStatus, "pending">) {
    const comment = feedback.trim();
    if (comment.length > 1000) { setErr("Le commentaire ne doit pas dépasser 1 000 caractères."); return; }
    if (next === "changes_requested" && !comment) { setErr("Explique ce qu’il faut corriger avant de renvoyer le rendu."); return; }
    setBusy(next);
    setErr(null);
    try {
      await adminReviewSubmission(submission.id, next, comment);
      await onReviewed(next === "approved" ? "Rendu validé. L’apprenant est prévenu." : "Corrections demandées. L’apprenant est prévenu.");
    } catch (cause) {
      setErr(errorMessage(cause, "La correction n’a pas pu être enregistrée."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <EditorCard
      title={submission.lab?.title ?? "Lab supprimé"}
      subtitle={`${SUBMISSION_LABELS[submission.status]}${submission.reviewed_at ? ` · corrigé le ${formatDateTime(submission.reviewed_at)}` : ""}`}
      flash={flash}
      onClose={onClose}
    >
      <div className="submission-review">
        <dl>
          <div><dt>Apprenant</dt><dd>{learnerName(submission)}{submission.learner?.email ? ` · ${submission.learner.email}` : ""}</dd></div>
          <div><dt>Envoyé le</dt><dd>{formatDateTime(submission.created_at)}</dd></div>
          {submission.link && (
            <div>
              <dt>Fichier ou lien</dt>
              <dd>{safeLink ? <a href={safeLink} target="_blank" rel="noopener noreferrer">{safeLink}</a> : submission.link}</dd>
            </div>
          )}
        </dl>
        <blockquote>{submission.note}</blockquote>
        <Field label={`Commentaire pour l’apprenant (${feedback.length}/1000)`}>
          <Textarea id={`${id}-feedback`} value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} maxLength={1000} />
        </Field>
        {err && <Notice kind="error">{err}</Notice>}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" variant="success" icon={<IconCheck size={16} />} loading={busy === "approved"} disabled={busy !== null} onClick={() => void review("approved")}>
            Valider le rendu
          </Button>
          <Button type="button" size="sm" variant="secondary" loading={busy === "changes_requested"} disabled={busy !== null} onClick={() => void review("changes_requested")}>
            Demander des corrections
          </Button>
        </div>
      </div>
    </EditorCard>
  );
}
