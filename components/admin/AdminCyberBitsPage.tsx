"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import {
  IconAlert,
  IconAward,
  IconBolt,
  IconLock,
  IconStar,
  IconUsers,
} from "@/components/ui/Icon";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { formatDateTime, formatNumber, formatRelative, formatShortDate, levelLabel } from "@/lib/format";
import type {
  AdminCbOverview,
  AdminCbWallet,
  CbCatalog,
  CbCatalogCourse,
  CbCatalogLab,
  CbReason,
  CbRule,
} from "@/types/cyberbits";
import {
  adminAdjustCb,
  adminCbOverview,
  adminCbTransactions,
  adminCbWallets,
  adminGrantCbUnlock,
  adminSetCbPrerequisite,
  adminSetCbPrice,
  adminSetCbRule,
  adminSetCbSettings,
  getCbCatalog,
} from "@/services/admin-cyberbits.service";
import { Field, Textarea } from "./AdminFields";
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader, Notice } from "./AdminState";

const PAGE_SIZE = 50;
const DECIMAL_FORMAT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const DIFFICULTY_OPTIONS = [
  { value: "all", label: "Toutes les difficultés" },
  { value: "debutant", label: levelLabel("debutant") },
  { value: "intermediaire", label: levelLabel("intermediaire") },
  { value: "avance", label: levelLabel("avance") },
];
const REASON_LABELS: Record<CbReason, string> = {
  lesson_completed: "Leçon terminée",
  quiz_passed: "Quiz réussi",
  quiz_perfect: "Quiz parfait",
  module_completed: "Module terminé",
  course_completed: "Parcours terminé",
  challenge_completed: "Défi réussi",
  daily_activity: "Première activité du jour",
  lab_completed: "Lab réussi",
  course_unlock: "Parcours débloqué",
  lab_unlock: "Lab débloqué",
  admin_adjustment: "Ajustement de l’équipe",
};
const SOURCE_LABELS = {
  activity: { label: "Activité", tone: "green" as const },
  backfill: { label: "Rattrapage", tone: "amber" as const },
  purchase: { label: "Achat", tone: "blue" as const },
  admin: { label: "Admin", tone: "purple" as const },
};

type Flash = { kind: "success" | "error"; text: string } | null;
type SettingKey = "rewards" | "purchases" | "free";
type SettingEditorState = { key: SettingKey | null; value: boolean; reason: string; pausedMessage: string; error: string | null; busy: boolean };
type RuleEditorState = { key: string | null; amount: string; active: boolean; reason: string; error: string | null; busy: boolean };
type CatalogEditorState = {
  kind: "course-price" | "course-prerequisite" | "lab-price" | null;
  id: string | null;
  price: string;
  prerequisiteId: string;
  reason: string;
  error: string | null;
  busy: boolean;
};
type WalletEditorState = {
  kind: "adjust" | "grant" | null;
  userId: string | null;
  amount: string;
  grantValue: string;
  reason: string;
  error: string | null;
  busy: boolean;
};
type WalletFilter = { id: string; label: string; username: string } | null;

const initialSettingEditor: SettingEditorState = { key: null, value: false, reason: "", pausedMessage: "", error: null, busy: false };
const initialRuleEditor: RuleEditorState = { key: null, amount: "", active: true, reason: "", error: null, busy: false };
const initialCatalogEditor: CatalogEditorState = { kind: null, id: null, price: "", prerequisiteId: "", reason: "", error: null, busy: false };
const initialWalletEditor: WalletEditorState = { kind: null, userId: null, amount: "", grantValue: "", reason: "", error: null, busy: false };

function fold(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatCb(value: number) {
  return `${formatNumber(value)} CB`;
}

function formatAverageHours(value: number | null) {
  if (value === null) return "n/a";
  return `${DECIMAL_FORMAT.format(value)} h`;
}

function formatPrice(price: number) {
  return price === 0 ? "Gratuit" : `${formatNumber(price)} CB`;
}

function validateReason(reason: string) {
  const trimmed = reason.trim();
  if (trimmed.length < 5) return "Le motif doit contenir au moins 5 caractères.";
  if (trimmed.length > 200) return "Le motif ne doit pas dépasser 200 caractères.";
  return null;
}

function validatePausedMessage(value: string) {
  if (value.trim().length > 300) return "Le message apprenant ne doit pas dépasser 300 caractères.";
  return null;
}

function parseWholeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : NaN;
}

function tableSummary(total: number, page: number, pageSize: number) {
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return `${formatNumber(from)} à ${formatNumber(to)} sur ${formatNumber(total)}`;
}

function topWarnings(overview: AdminCbOverview) {
  const items: { key: string; tone: "amber" | "red" | "violet"; text: string; detail?: string | null }[] = [];
  if (!overview.settings.rewards_enabled) {
    items.push({
      key: "rewards",
      tone: "amber",
      text: "Les actions faites pendant la pause seront récompensées à la reprise.",
      detail: overview.settings.paused_reason,
    });
  }
  if (!overview.settings.purchases_enabled) {
    items.push({ key: "shop", tone: "red", text: "La boutique CyberBits est fermée, les achats sont temporairement bloqués." });
  }
  if (!overview.settings.gating_enabled) {
    items.push({ key: "free", tone: "violet", text: "Mode libre activé, tous les parcours et labs sont ouverts sans CyberBits." });
  }
  return items;
}

function chartMax(daily: AdminCbOverview["daily"]) {
  return Math.max(1, ...daily.flatMap((point) => [point.earned, point.spent]));
}

function sortRules(rules: CbRule[], kind: CbRule["kind"]) {
  return rules.filter((rule) => rule.kind === kind).sort((a, b) => a.position - b.position || a.label.localeCompare(b.label, "fr"));
}

function filteredCourses(catalog: CbCatalog, search: string) {
  const query = fold(search.trim());
  if (!query) return catalog.courses;
  return catalog.courses.filter((course) => [course.title, course.slug, course.short_description, levelLabel(course.level)].some((value) => fold(value).includes(query)));
}

function filteredLabs(catalog: CbCatalog, search: string, difficulty: string) {
  const query = fold(search.trim());
  return catalog.labs.filter((lab) => {
    if (difficulty !== "all" && lab.difficulty !== difficulty) return false;
    if (!query) return true;
    return [lab.title, lab.slug, lab.course_slug ?? "", levelLabel(lab.difficulty)].some((value) => fold(value).includes(query));
  });
}

function grantOptions(catalog: CbCatalog) {
  const courses = catalog.courses.map((course) => ({
    value: `course:${course.id}`,
    label: `[Parcours] ${course.title}`,
  }));
  const labs = catalog.labs.map((lab) => ({
    value: `lab:${lab.id}`,
    label: `[Lab] ${lab.title}`,
  }));
  return [...courses, ...labs];
}

function parseGrantValue(value: string) {
  const [kind, id] = value.split(":");
  if ((kind === "course" || kind === "lab") && id) return { kind, id } as const;
  return null;
}

function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="cbadm-pagination">
      <span className="cbadm-pagination__summary" aria-live="polite">{tableSummary(total, page, pageSize)}</span>
      <div className="cbadm-pagination__actions">
        <Button type="button" variant="ghost" size="sm" disabled={page === 0} onClick={() => onPageChange(page - 1)}>Précédent</Button>
        <span className="cbadm-pagination__page">Page {formatNumber(page + 1)} / {formatNumber(pageCount)}</span>
        <Button type="button" variant="ghost" size="sm" disabled={page + 1 >= pageCount} onClick={() => onPageChange(page + 1)}>Suivant</Button>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: "cyan" | "green" | "violet" | "amber" | "red" | "muted";
}) {
  return (
    <div className="adm-metric-card">
      <div className="adm-metric-card__top">
        <span>{label}</span>
        <span className={`adm-tone-${tone}`} aria-hidden="true">{icon}</span>
      </div>
      <span className="adm-metric-card__value">{value}</span>
      <span className="adm-metric-card__detail">{detail}</span>
    </div>
  );
}

function DailyChart({ daily }: { daily: AdminCbOverview["daily"] }) {
  const max = chartMax(daily);
  return (
    <section className="adm-panel">
      <div className="adm-panel__head">
        <div>
          <h2 className="adm-section-title">14 derniers jours</h2>
          <p className="adm-muted mt-1 text-sm">Gagnés et dépensés par jour, sans bibliothèque externe.</p>
        </div>
      </div>
      {daily.length === 0 ? (
        <AdminEmpty>Aucune activité CyberBits sur les 14 derniers jours.</AdminEmpty>
      ) : (
        <div className="cbadm-chart">
          <div className="cbadm-chart__bars" role="img" aria-label="Histogramme des CyberBits gagnés et dépensés sur 14 jours">
            {daily.map((point) => (
              <div key={point.date} className="cbadm-chart__day">
                <div className="cbadm-chart__track" aria-hidden="true">
                  <div className="cbadm-chart__bar cbadm-chart__bar--spent" style={{ height: `${(point.spent / max) * 100}%` }} />
                  <div className="cbadm-chart__bar cbadm-chart__bar--earned" style={{ height: `${(point.earned / max) * 100}%` }} />
                </div>
                <p className="cbadm-chart__totals">{formatNumber(point.earned)} / {formatNumber(point.spent)}</p>
                <p className="cbadm-chart__label">{formatShortDate(point.date)}</p>
              </div>
            ))}
          </div>
          <div className="cbadm-legend" aria-hidden="true">
            <span><i className="cbadm-legend__dot cbadm-legend__dot--earned" /> Gagnés</span>
            <span><i className="cbadm-legend__dot cbadm-legend__dot--spent" /> Dépensés</span>
          </div>
          <table className="sr-only">
            <caption>Résumé texte des gains et dépenses CyberBits sur 14 jours</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Gagnés</th>
                <th scope="col">Dépensés</th>
              </tr>
            </thead>
            <tbody>
              {daily.map((point) => (
                <tr key={`sr-${point.date}`}>
                  <td>{formatShortDate(point.date)}</td>
                  <td>{formatNumber(point.earned)}</td>
                  <td>{formatNumber(point.spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function AdminCyberBitsPage() {
  const walletSearchId = useId();
  const catalogSearchId = useId();
  const transactionsRef = useRef<HTMLElement | null>(null);

  const overview = useAsync(() => adminCbOverview(), []);
  const catalog = useAsync(() => getCbCatalog(), []);

  const [flash, setFlash] = useState<Flash>(null);
  const [settingsEditor, setSettingsEditor] = useState<SettingEditorState>(initialSettingEditor);
  const [ruleEditor, setRuleEditor] = useState<RuleEditorState>(initialRuleEditor);
  const [catalogEditor, setCatalogEditor] = useState<CatalogEditorState>(initialCatalogEditor);
  const [walletEditor, setWalletEditor] = useState<WalletEditorState>(initialWalletEditor);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [labDifficulty, setLabDifficulty] = useState("all");
  const [walletSearch, setWalletSearch] = useState("");
  const [walletPage, setWalletPage] = useState(0);
  const [transactionReason, setTransactionReason] = useState<"all" | CbReason>("all");
  const [transactionPage, setTransactionPage] = useState(0);
  const [transactionUser, setTransactionUser] = useState<WalletFilter>(null);

  const wallets = useAsync(
    () => adminCbWallets({ search: walletSearch.trim() || undefined, limit: PAGE_SIZE, offset: walletPage * PAGE_SIZE }),
    [walletSearch, walletPage],
  );
  const transactions = useAsync(
    () => adminCbTransactions({
      userId: transactionUser?.id,
      reason: transactionReason === "all" ? undefined : transactionReason,
      limit: PAGE_SIZE,
      offset: transactionPage * PAGE_SIZE,
    }),
    [transactionUser?.id, transactionReason, transactionPage],
  );

  useEffect(() => {
    setWalletPage(0);
  }, [walletSearch]);

  useEffect(() => {
    setTransactionPage(0);
  }, [transactionReason, transactionUser?.id]);

  const loadingInitial = (overview.loading && !overview.data) || (catalog.loading && !catalog.data);
  const initialError = (!overview.data ? overview.error : null) ?? (!catalog.data ? catalog.error : null);

  const overviewData = overview.data;
  const catalogData = catalog.data;
  const filteredCatalogCourses = useMemo(() => (catalogData ? filteredCourses(catalogData, catalogSearch) : []), [catalogData, catalogSearch]);
  const filteredCatalogLabs = useMemo(() => (catalogData ? filteredLabs(catalogData, catalogSearch, labDifficulty) : []), [catalogData, catalogSearch, labDifficulty]);
  const grantItems = useMemo(() => (catalogData ? grantOptions(catalogData) : []), [catalogData]);

  async function refreshOverviewAndCatalog() {
    await Promise.all([overview.reload(), catalog.reload()]);
  }

  async function refreshEconomyViews() {
    await Promise.all([overview.reload(), wallets.reload(), transactions.reload()]);
  }

  function openSettingEditor(key: SettingKey, current: boolean, pausedReason: string | null) {
    setSettingsEditor({
      key,
      value: current,
      reason: "",
      pausedMessage: key === "rewards" && !current ? pausedReason ?? "" : "",
      error: null,
      busy: false,
    });
  }

  async function submitSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!overviewData || !settingsEditor.key) return;
    const reasonProblem = validateReason(settingsEditor.reason);
    const pausedProblem = settingsEditor.key === "rewards" ? validatePausedMessage(settingsEditor.pausedMessage) : null;
    if (reasonProblem || pausedProblem) {
      setSettingsEditor((current) => ({ ...current, error: reasonProblem ?? pausedProblem ?? null }));
      return;
    }
    setSettingsEditor((current) => ({ ...current, busy: true, error: null }));
    try {
      const pausedReason = settingsEditor.key === "rewards"
        ? (settingsEditor.value ? null : settingsEditor.pausedMessage.trim() || null)
        : overviewData.settings.paused_reason;
      await adminSetCbSettings({
        rewards: settingsEditor.key === "rewards" ? settingsEditor.value : null,
        purchases: settingsEditor.key === "purchases" ? settingsEditor.value : null,
        gating: settingsEditor.key === "free" ? !settingsEditor.value : null,
        pausedReason,
        reason: settingsEditor.reason.trim(),
      });
      await refreshOverviewAndCatalog();
      setFlash({ kind: "success", text: "Réglage CyberBits mis à jour." });
      setSettingsEditor(initialSettingEditor);
    } catch (cause) {
      setSettingsEditor((current) => ({ ...current, busy: false, error: errorMessage(cause, "Le réglage n’a pas pu être enregistré.") }));
    }
  }

  function openRuleEditor(rule: CbRule) {
    setRuleEditor({ key: rule.key, amount: String(rule.amount), active: rule.is_active, reason: "", error: null, busy: false });
  }

  async function submitRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ruleEditor.key || !overviewData) return;
    const amount = parseWholeNumber(ruleEditor.amount);
    if (!Number.isFinite(amount) || amount < 0 || amount > 10_000) {
      setRuleEditor((current) => ({ ...current, error: "Le montant doit être compris entre 0 et 10 000." }));
      return;
    }
    const reasonProblem = validateReason(ruleEditor.reason);
    if (reasonProblem) {
      setRuleEditor((current) => ({ ...current, error: reasonProblem }));
      return;
    }
    const rule = overviewData.rules.find((entry) => entry.key === ruleEditor.key);
    if (!rule) return;
    setRuleEditor((current) => ({ ...current, busy: true, error: null }));
    try {
      await adminSetCbRule({
        key: rule.key,
        amount,
        active: rule.kind === "reward" ? ruleEditor.active : true,
        reason: ruleEditor.reason.trim(),
      });
      await overview.reload();
      setFlash({ kind: "success", text: `Barème mis à jour pour « ${rule.label} ».` });
      setRuleEditor(initialRuleEditor);
    } catch (cause) {
      setRuleEditor((current) => ({ ...current, busy: false, error: errorMessage(cause, "Le barème n’a pas pu être enregistré.") }));
    }
  }

  function openCoursePriceEditor(course: CbCatalogCourse) {
    setCatalogEditor({
      kind: "course-price",
      id: course.id,
      price: course.custom_price ? String(course.price) : "",
      prerequisiteId: course.prerequisite?.id ?? "",
      reason: "",
      error: null,
      busy: false,
    });
  }

  function openCoursePrerequisiteEditor(course: CbCatalogCourse) {
    setCatalogEditor({
      kind: "course-prerequisite",
      id: course.id,
      price: "",
      prerequisiteId: course.prerequisite?.id ?? "",
      reason: "",
      error: null,
      busy: false,
    });
  }

  function openLabPriceEditor(lab: CbCatalogLab) {
    setCatalogEditor({
      kind: "lab-price",
      id: lab.id,
      price: lab.custom_price ? String(lab.price) : "",
      prerequisiteId: "",
      reason: "",
      error: null,
      busy: false,
    });
  }

  async function saveCatalogPrice(kind: "course" | "lab", title: string, forcedPrice?: number | null) {
    if (!catalogEditor.id) return;
    const reasonProblem = validateReason(catalogEditor.reason);
    if (reasonProblem) {
      setCatalogEditor((current) => ({ ...current, error: reasonProblem }));
      return;
    }
    const price = forcedPrice !== undefined
      ? forcedPrice
      : catalogEditor.price.trim() === ""
        ? null
        : parseWholeNumber(catalogEditor.price);
    if (price !== null && (!Number.isFinite(price) || price < 0 || price > 10_000)) {
      setCatalogEditor((current) => ({ ...current, error: "Le prix doit être compris entre 0 et 10 000, ou laissé vide pour revenir au défaut." }));
      return;
    }
    setCatalogEditor((current) => ({ ...current, busy: true, error: null }));
    try {
      await adminSetCbPrice({ kind, id: catalogEditor.id, price, reason: catalogEditor.reason.trim() });
      await refreshOverviewAndCatalog();
      setFlash({ kind: "success", text: `Prix enregistré pour « ${title} ».` });
      setCatalogEditor(initialCatalogEditor);
    } catch (cause) {
      setCatalogEditor((current) => ({ ...current, busy: false, error: errorMessage(cause, "Le prix n’a pas pu être enregistré.") }));
    }
  }

  async function saveCoursePrerequisite(title: string) {
    if (!catalogEditor.id) return;
    const reasonProblem = validateReason(catalogEditor.reason);
    if (reasonProblem) {
      setCatalogEditor((current) => ({ ...current, error: reasonProblem }));
      return;
    }
    setCatalogEditor((current) => ({ ...current, busy: true, error: null }));
    try {
      await adminSetCbPrerequisite({
        courseId: catalogEditor.id,
        prerequisiteId: catalogEditor.prerequisiteId || null,
        reason: catalogEditor.reason.trim(),
      });
      await refreshOverviewAndCatalog();
      setFlash({ kind: "success", text: `Prérequis enregistré pour « ${title} ».` });
      setCatalogEditor(initialCatalogEditor);
    } catch (cause) {
      setCatalogEditor((current) => ({ ...current, busy: false, error: errorMessage(cause, "Le prérequis n’a pas pu être enregistré.") }));
    }
  }

  function openWalletAdjuster(wallet: AdminCbWallet) {
    setWalletEditor({ kind: "adjust", userId: wallet.user_id, amount: "", grantValue: "", reason: "", error: null, busy: false });
  }

  function openWalletGrant(wallet: AdminCbWallet) {
    setWalletEditor({
      kind: "grant",
      userId: wallet.user_id,
      amount: "",
      grantValue: grantItems[0]?.value ?? "",
      reason: "",
      error: null,
      busy: false,
    });
  }

  async function submitWalletAdjust(wallet: AdminCbWallet) {
    if (walletEditor.userId !== wallet.user_id) return;
    const amount = parseWholeNumber(walletEditor.amount);
    if (!Number.isFinite(amount) || amount < -5_000 || amount > 5_000 || amount === 0) {
      setWalletEditor((current) => ({ ...current, error: "L’ajustement doit être compris entre -5 000 et 5 000, hors 0." }));
      return;
    }
    const reasonProblem = validateReason(walletEditor.reason);
    if (reasonProblem) {
      setWalletEditor((current) => ({ ...current, error: reasonProblem }));
      return;
    }
    setWalletEditor((current) => ({ ...current, busy: true, error: null }));
    try {
      const result = await adminAdjustCb({ userId: wallet.user_id, amount, reason: walletEditor.reason.trim() });
      await refreshEconomyViews();
      setFlash({ kind: "success", text: `Ajustement enregistré pour ${wallet.display_name}. Nouveau solde : ${formatCb(result.balance)}.` });
      setWalletEditor(initialWalletEditor);
    } catch (cause) {
      setWalletEditor((current) => ({ ...current, busy: false, error: errorMessage(cause, "L’ajustement n’a pas pu être enregistré.") }));
    }
  }

  async function submitWalletGrant(wallet: AdminCbWallet) {
    if (walletEditor.userId !== wallet.user_id) return;
    const parsed = parseGrantValue(walletEditor.grantValue);
    const reasonProblem = validateReason(walletEditor.reason);
    if (!parsed) {
      setWalletEditor((current) => ({ ...current, error: "Choisis un parcours ou un lab à ouvrir." }));
      return;
    }
    if (reasonProblem) {
      setWalletEditor((current) => ({ ...current, error: reasonProblem }));
      return;
    }
    setWalletEditor((current) => ({ ...current, busy: true, error: null }));
    try {
      await adminGrantCbUnlock({
        kind: parsed.kind,
        id: parsed.id,
        userId: wallet.user_id,
        reason: walletEditor.reason.trim(),
      });
      await refreshEconomyViews();
      setFlash({ kind: "success", text: `Accès offert enregistré pour ${wallet.display_name}.` });
      setWalletEditor(initialWalletEditor);
    } catch (cause) {
      setWalletEditor((current) => ({ ...current, busy: false, error: errorMessage(cause, "L’accès offert n’a pas pu être enregistré.") }));
    }
  }

  function focusTransactions(wallet: AdminCbWallet) {
    setTransactionUser({ id: wallet.user_id, label: wallet.display_name, username: wallet.username });
    transactionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loadingInitial) {
    return (
      <>
        <AdminPageHeader title="CyberBits" description="Pilote la monnaie virtuelle CyberBits, son barème, la boutique et les opérations de support." />
        <AdminLoading label="Chargement de la console CyberBits…" />
      </>
    );
  }

  if (initialError || !overviewData || !catalogData) {
    return (
      <>
        <AdminPageHeader title="CyberBits" description="Pilote la monnaie virtuelle CyberBits, son barème, la boutique et les opérations de support." />
        <AdminError message={(initialError ?? new Error("La console CyberBits est indisponible.")).message} onRetry={() => { void refreshOverviewAndCatalog(); }} />
      </>
    );
  }

  const warnings = topWarnings(overviewData);
  const rewardRules = sortRules(overviewData.rules, "reward");
  const priceRules = sortRules(overviewData.rules, "price");

  return (
    <>
      <AdminPageHeader
        title="CyberBits"
        description="Pilote la monnaie virtuelle CyberBits, son barème, la boutique et les opérations de support."
      />

      <div className="cbadm-stack">
        {flash && <Notice kind={flash.kind}>{flash.text}</Notice>}

        <section className="adm-panel">
          <div className="adm-panel__head">
            <div>
              <h2 className="adm-section-title">Réglages</h2>
              <p className="adm-muted mt-1 text-sm">Chaque changement demande un motif, écrit pour le journal d’audit.</p>
            </div>
          </div>

          {warnings.length > 0 && (
            <div className="cbadm-warnings" role="status" aria-live="polite">
              {warnings.map((warning) => (
                <div key={warning.key} className={`cbadm-warning cbadm-warning--${warning.tone}`}>
                  <IconAlert size={16} className="shrink-0" />
                  <div>
                    <p>{warning.text}</p>
                    {warning.detail ? <p className="cbadm-warning__detail">{warning.detail}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="cbadm-settings">
            <article className="cbadm-setting-card">
              <div className="cbadm-setting-card__head">
                <div>
                  <h3>Récompenses actives</h3>
                  <p>Verse les gains liés à la progression réelle des apprenants.</p>
                </div>
                <Badge tone={overviewData.settings.rewards_enabled ? "green" : "amber"}>{overviewData.settings.rewards_enabled ? "Actives" : "En pause"}</Badge>
              </div>
              <div className="cbadm-setting-card__meta">
                <span>Dernière mise à jour : {formatRelative(overviewData.settings.updated_at)}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => openSettingEditor("rewards", overviewData.settings.rewards_enabled, overviewData.settings.paused_reason)}>Modifier</Button>
              </div>
              {settingsEditor.key === "rewards" && (
                <form className="cbadm-inline-form" onSubmit={(event) => { void submitSetting(event); }}>
                  <label className="adm-toggle">
                    <input type="checkbox" checked={settingsEditor.value} onChange={(event) => setSettingsEditor((current) => ({ ...current, value: event.target.checked, error: null }))} />
                    Récompenses actives
                  </label>
                  {!settingsEditor.value && (
                    <Field label={`Message affiché aux apprenants (${settingsEditor.pausedMessage.length}/300)`}>
                      <Textarea
                        rows={3}
                        maxLength={300}
                        value={settingsEditor.pausedMessage}
                        onChange={(event) => setSettingsEditor((current) => ({ ...current, pausedMessage: event.target.value, error: null }))}
                        placeholder="Pause temporaire du service, les gains seront versés à la reprise."
                      />
                    </Field>
                  )}
                  <Input label="Motif" value={settingsEditor.reason} onChange={(event) => setSettingsEditor((current) => ({ ...current, reason: event.target.value, error: null }))} maxLength={200} />
                  {settingsEditor.error && <p className="ui-field__error" role="alert">{settingsEditor.error}</p>}
                  <div className="cbadm-inline-actions">
                    <Button type="submit" size="sm" loading={settingsEditor.busy}>Enregistrer</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSettingsEditor(initialSettingEditor)} disabled={settingsEditor.busy}>Annuler</Button>
                  </div>
                </form>
              )}
            </article>

            <article className="cbadm-setting-card">
              <div className="cbadm-setting-card__head">
                <div>
                  <h3>Boutique ouverte</h3>
                  <p>Autorise les achats de parcours et de labs avec les CyberBits.</p>
                </div>
                <Badge tone={overviewData.settings.purchases_enabled ? "green" : "red"}>{overviewData.settings.purchases_enabled ? "Ouverte" : "Fermée"}</Badge>
              </div>
              <div className="cbadm-setting-card__meta">
                <span>Achats débloqués pour les apprenants</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => openSettingEditor("purchases", overviewData.settings.purchases_enabled, overviewData.settings.paused_reason)}>Modifier</Button>
              </div>
              {settingsEditor.key === "purchases" && (
                <form className="cbadm-inline-form" onSubmit={(event) => { void submitSetting(event); }}>
                  <label className="adm-toggle">
                    <input type="checkbox" checked={settingsEditor.value} onChange={(event) => setSettingsEditor((current) => ({ ...current, value: event.target.checked, error: null }))} />
                    Boutique ouverte
                  </label>
                  <Input label="Motif" value={settingsEditor.reason} onChange={(event) => setSettingsEditor((current) => ({ ...current, reason: event.target.value, error: null }))} maxLength={200} />
                  {settingsEditor.error && <p className="ui-field__error" role="alert">{settingsEditor.error}</p>}
                  <div className="cbadm-inline-actions">
                    <Button type="submit" size="sm" loading={settingsEditor.busy}>Enregistrer</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSettingsEditor(initialSettingEditor)} disabled={settingsEditor.busy}>Annuler</Button>
                  </div>
                </form>
              )}
            </article>

            <article className="cbadm-setting-card">
              <div className="cbadm-setting-card__head">
                <div>
                  <h3>Mode libre, tout est ouvert sans CyberBits</h3>
                  <p>Désactive le verrouillage économique, utile pour une période de test ou d’ouverture.</p>
                </div>
                <Badge tone={overviewData.settings.gating_enabled ? "neutral" : "purple"}>{overviewData.settings.gating_enabled ? "Désactivé" : "Activé"}</Badge>
              </div>
              <div className="cbadm-setting-card__meta">
                <span>Ouverture générale des contenus</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => openSettingEditor("free", !overviewData.settings.gating_enabled, overviewData.settings.paused_reason)}>Modifier</Button>
              </div>
              {settingsEditor.key === "free" && (
                <form className="cbadm-inline-form" onSubmit={(event) => { void submitSetting(event); }}>
                  <label className="adm-toggle">
                    <input type="checkbox" checked={settingsEditor.value} onChange={(event) => setSettingsEditor((current) => ({ ...current, value: event.target.checked, error: null }))} />
                    Activer le mode libre
                  </label>
                  <Input label="Motif" value={settingsEditor.reason} onChange={(event) => setSettingsEditor((current) => ({ ...current, reason: event.target.value, error: null }))} maxLength={200} />
                  {settingsEditor.error && <p className="ui-field__error" role="alert">{settingsEditor.error}</p>}
                  <div className="cbadm-inline-actions">
                    <Button type="submit" size="sm" loading={settingsEditor.busy}>Enregistrer</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSettingsEditor(initialSettingEditor)} disabled={settingsEditor.busy}>Annuler</Button>
                  </div>
                </form>
              )}
            </article>
          </div>
        </section>

        <section className="adm-panel">
          <div className="adm-panel__head">
            <div>
              <h2 className="adm-section-title">Indicateurs</h2>
              <p className="adm-muted mt-1 text-sm">Vue rapide sur la circulation, les achats et les ajustements.</p>
            </div>
          </div>
          <div className="adm-metric-grid">
            <MetricCard label="En circulation" value={formatCb(overviewData.circulation.in_circulation)} detail={`${formatNumber(overviewData.circulation.wallets_with_balance)} portefeuilles positifs`} icon={<IconBolt size={18} />} tone="cyan" />
            <MetricCard label="Total gagné" value={formatCb(overviewData.circulation.earned_total)} detail={`Dépensés : ${formatCb(overviewData.circulation.spent_total)}`} icon={<IconAward size={18} />} tone="green" />
            <MetricCard label="7 derniers jours" value={`${formatCb(overviewData.last_7d.earned)} / ${formatCb(overviewData.last_7d.spent)}`} detail="Gagnés puis dépensés" icon={<IconStar size={18} />} tone="violet" />
            <MetricCard label="Gagnants / acheteurs, 7 j" value={`${formatNumber(overviewData.last_7d.earners)} / ${formatNumber(overviewData.last_7d.spenders)}`} detail="Comptes ayant gagné puis dépensé" icon={<IconUsers size={18} />} tone="amber" />
            <MetricCard label="Portefeuilles" value={`${formatNumber(overviewData.circulation.wallets_with_balance)} / ${formatNumber(overviewData.circulation.wallets)}`} detail="Avec solde positif sur le total" icon={<IconUsers size={18} />} tone="muted" />
            <MetricCard label="Ajustements" value={formatCb(overviewData.circulation.adjusted_total)} detail="Total des corrections d’équipe" icon={<IconAlert size={18} />} tone="red" />
            <MetricCard label="1er achat après" value={formatAverageHours(overviewData.avg_hours_to_first_spend)} detail="Moyenne avant la première dépense" icon={<IconLock size={18} />} tone="amber" />
            <MetricCard label="Déblocages achetés" value={`${formatNumber(overviewData.unlocks.courses)} / ${formatNumber(overviewData.unlocks.labs)}`} detail="Parcours puis labs" icon={<IconLock size={18} />} tone="cyan" />
          </div>
        </section>

        <DailyChart daily={overviewData.daily} />

        <section className="adm-panel">
          <div className="adm-panel__head">
            <div>
              <h2 className="adm-section-title">Répartition par motif</h2>
              <p className="adm-muted mt-1 text-sm">Chaque ligne regroupe le nombre de mouvements et leur montant total.</p>
            </div>
          </div>
          {overviewData.by_reason.length === 0 ? (
            <AdminEmpty>Aucun mouvement CyberBits enregistré pour le moment.</AdminEmpty>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <caption className="sr-only">Répartition des mouvements CyberBits par motif</caption>
                <thead>
                  <tr>
                    <th scope="col">Motif</th>
                    <th scope="col">Mouvements</th>
                    <th scope="col">Montant total</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewData.by_reason.map((row) => (
                    <tr key={row.reason}>
                      <td>{REASON_LABELS[row.reason]}</td>
                      <td className="tabular-nums">{formatNumber(row.count)}</td>
                      <td className={`tabular-nums ${row.amount < 0 ? "cbadm-amount cbadm-amount--negative" : "cbadm-amount cbadm-amount--positive"}`}>{formatCb(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="adm-panel">
          <div className="adm-panel__head">
            <div>
              <h2 className="adm-section-title">Barème</h2>
              <p className="adm-muted mt-1 text-sm">Récompenses et prix par défaut. Les prix utilisent toujours un statut actif implicite.</p>
            </div>
          </div>

          <div className="cbadm-rule-groups">
            {[{ title: "Récompenses", rows: rewardRules }, { title: "Prix par défaut", rows: priceRules }].map((group) => (
              <section key={group.title} className="cbadm-subpanel">
                <h3 className="cbadm-subpanel__title">{group.title}</h3>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <caption className="sr-only">{group.title}</caption>
                    <thead>
                      <tr>
                        <th scope="col">Règle</th>
                        <th scope="col">Description</th>
                        <th scope="col">Montant</th>
                        <th scope="col">Statut</th>
                        <th scope="col" className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((rule) => {
                        const editing = ruleEditor.key === rule.key;
                        return (
                          <Fragment key={rule.key}>
                            <tr key={rule.key}>
                              <td className="font-medium text-white">{rule.label}</td>
                              <td className="adm-muted">{rule.description}</td>
                              <td className="tabular-nums">{formatCb(rule.amount)}</td>
                              <td>
                                {rule.kind === "reward" ? (
                                  <Badge tone={rule.is_active ? "green" : "amber"}>{rule.is_active ? "Actif" : "Inactif"}</Badge>
                                ) : (
                                  <span className="adm-muted">Par défaut</span>
                                )}
                              </td>
                              <td className="text-right">
                                <Button type="button" size="sm" variant="ghost" onClick={() => openRuleEditor(rule)}>Modifier</Button>
                              </td>
                            </tr>
                            {editing && (
                              <tr key={`${rule.key}-edit`}>
                                <td colSpan={5}>
                                  <form className="cbadm-row-editor" onSubmit={(event) => { void submitRule(event); }}>
                                    <div className="cbadm-row-editor__grid">
                                      <Input
                                        label="Montant"
                                        type="number"
                                        min={0}
                                        max={10_000}
                                        inputMode="numeric"
                                        value={ruleEditor.amount}
                                        onChange={(event) => setRuleEditor((current) => ({ ...current, amount: event.target.value, error: null }))}
                                      />
                                      {rule.kind === "reward" && (
                                        <label className="adm-toggle cbadm-row-editor__toggle">
                                          <input type="checkbox" checked={ruleEditor.active} onChange={(event) => setRuleEditor((current) => ({ ...current, active: event.target.checked, error: null }))} />
                                          Récompense active
                                        </label>
                                      )}
                                    </div>
                                    <Input label="Motif" value={ruleEditor.reason} onChange={(event) => setRuleEditor((current) => ({ ...current, reason: event.target.value, error: null }))} maxLength={200} />
                                    {ruleEditor.error && <p className="ui-field__error" role="alert">{ruleEditor.error}</p>}
                                    <div className="cbadm-inline-actions">
                                      <Button type="submit" size="sm" loading={ruleEditor.busy}>Enregistrer</Button>
                                      <Button type="button" variant="ghost" size="sm" onClick={() => setRuleEditor(initialRuleEditor)} disabled={ruleEditor.busy}>Annuler</Button>
                                    </div>
                                  </form>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="adm-panel">
          <div className="adm-panel__head">
            <div>
              <h2 className="adm-section-title">Prix des parcours et des labs</h2>
              <p className="adm-muted mt-1 text-sm">Recherche, surcharges de prix et prérequis des parcours publiés.</p>
            </div>
          </div>

          {catalog.error && !catalog.data ? (
            <AdminError message={catalog.error.message} onRetry={() => { void catalog.reload(); }} />
          ) : (
            <>
              <div className="adm-toolbar">
                <div className="adm-toolbar__grow">
                  <Input id={catalogSearchId} type="search" label="Rechercher" value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Titre, slug ou niveau" autoComplete="off" />
                </div>
                <Select label="Difficulté des labs" value={labDifficulty} onChange={(event) => setLabDifficulty(event.target.value)} options={DIFFICULTY_OPTIONS} />
              </div>
              <p className="adm-summary" aria-live="polite">
                {formatNumber(filteredCatalogCourses.length)} parcours, {formatNumber(filteredCatalogLabs.length)} labs affichés
              </p>

              <div className="cbadm-catalog-stack">
                <section className="cbadm-subpanel">
                  <h3 className="cbadm-subpanel__title">Parcours</h3>
                  {filteredCatalogCourses.length === 0 ? (
                    <AdminEmpty>Aucun parcours ne correspond à la recherche.</AdminEmpty>
                  ) : (
                    <div className="adm-table-wrap">
                      <table className="adm-table">
                        <caption className="sr-only">Tarifs et prérequis des parcours</caption>
                        <thead>
                          <tr>
                            <th scope="col">Parcours</th>
                            <th scope="col">Niveau</th>
                            <th scope="col">Prix actuel</th>
                            <th scope="col">Prérequis</th>
                            <th scope="col" className="text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCatalogCourses.map((course) => {
                            const editingPrice = catalogEditor.kind === "course-price" && catalogEditor.id === course.id;
                            const editingPrerequisite = catalogEditor.kind === "course-prerequisite" && catalogEditor.id === course.id;
                            return (
                              <Fragment key={course.id}>
                                <tr key={course.id}>
                                  <td>
                                    <div className="min-w-0">
                                      <p className="font-medium text-white">{course.title}</p>
                                      <p className="adm-muted mt-1 text-xs">{course.slug}</p>
                                    </div>
                                  </td>
                                  <td><Badge tone={course.level === "avance" ? "purple" : course.level === "intermediaire" ? "blue" : "neutral"}>{levelLabel(course.level)}</Badge></td>
                                  <td>
                                    <span className="font-medium text-white">{formatPrice(course.price)}</span>
                                    {course.custom_price && <Badge tone="amber" className="ml-2">Prix personnalisé</Badge>}
                                  </td>
                                  <td>{course.prerequisite ? course.prerequisite.title : <span className="adm-muted">Aucun</span>}</td>
                                  <td className="text-right">
                                    <div className="cbadm-table-actions">
                                      <Button type="button" variant="ghost" size="sm" onClick={() => openCoursePriceEditor(course)}>Prix</Button>
                                      <Button type="button" variant="ghost" size="sm" onClick={() => openCoursePrerequisiteEditor(course)}>Prérequis</Button>
                                    </div>
                                  </td>
                                </tr>
                                {editingPrice && (
                                  <tr key={`${course.id}-price`}>
                                    <td colSpan={5}>
                                      <div className="cbadm-row-editor">
                                        <div className="cbadm-row-editor__grid">
                                          <Input
                                            label="Prix personnalisé"
                                            type="number"
                                            min={0}
                                            max={10_000}
                                            inputMode="numeric"
                                            value={catalogEditor.price}
                                            onChange={(event) => setCatalogEditor((current) => ({ ...current, price: event.target.value, error: null }))}
                                            placeholder="Laisse vide pour le prix du niveau"
                                          />
                                          <div className="cbadm-row-editor__hint">
                                            <p className="cbadm-help">Vide = retour au prix du niveau ({formatPrice(course.price)}).</p>
                                          </div>
                                        </div>
                                        <Input label="Motif" value={catalogEditor.reason} onChange={(event) => setCatalogEditor((current) => ({ ...current, reason: event.target.value, error: null }))} maxLength={200} />
                                        {catalogEditor.error && <p className="ui-field__error" role="alert">{catalogEditor.error}</p>}
                                        <div className="cbadm-inline-actions">
                                          <Button type="button" size="sm" loading={catalogEditor.busy} onClick={() => { void saveCatalogPrice("course", course.title); }}>Enregistrer</Button>
                                          <Button type="button" variant="secondary" size="sm" disabled={catalogEditor.busy} onClick={() => { void saveCatalogPrice("course", course.title, null); }}>Revenir au prix du niveau</Button>
                                          <Button type="button" variant="ghost" size="sm" disabled={catalogEditor.busy} onClick={() => setCatalogEditor(initialCatalogEditor)}>Annuler</Button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                {editingPrerequisite && (
                                  <tr key={`${course.id}-prerequisite`}>
                                    <td colSpan={5}>
                                      <div className="cbadm-row-editor">
                                        <Field label="Prérequis">
                                          <select className="adm-native-select" value={catalogEditor.prerequisiteId} onChange={(event) => setCatalogEditor((current) => ({ ...current, prerequisiteId: event.target.value, error: null }))}>
                                            <option value="">Aucun</option>
                                            {catalogData.courses.filter((candidate) => candidate.id !== course.id).map((candidate) => (
                                              <option key={candidate.id} value={candidate.id}>{candidate.title}</option>
                                            ))}
                                          </select>
                                        </Field>
                                        <Input label="Motif" value={catalogEditor.reason} onChange={(event) => setCatalogEditor((current) => ({ ...current, reason: event.target.value, error: null }))} maxLength={200} />
                                        {catalogEditor.error && <p className="ui-field__error" role="alert">{catalogEditor.error}</p>}
                                        <div className="cbadm-inline-actions">
                                          <Button type="button" size="sm" loading={catalogEditor.busy} onClick={() => { void saveCoursePrerequisite(course.title); }}>Enregistrer</Button>
                                          <Button type="button" variant="ghost" size="sm" disabled={catalogEditor.busy} onClick={() => setCatalogEditor(initialCatalogEditor)}>Annuler</Button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="cbadm-subpanel">
                  <h3 className="cbadm-subpanel__title">Labs</h3>
                  {filteredCatalogLabs.length === 0 ? (
                    <AdminEmpty>Aucun lab ne correspond aux filtres.</AdminEmpty>
                  ) : (
                    <div className="adm-table-wrap">
                      <table className="adm-table">
                        <caption className="sr-only">Tarifs des labs</caption>
                        <thead>
                          <tr>
                            <th scope="col">Lab</th>
                            <th scope="col">Difficulté</th>
                            <th scope="col">Prix actuel</th>
                            <th scope="col" className="text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCatalogLabs.map((lab) => {
                            const editing = catalogEditor.kind === "lab-price" && catalogEditor.id === lab.id;
                            return (
                              <Fragment key={lab.id}>
                                <tr key={lab.id}>
                                  <td>
                                    <div className="min-w-0">
                                      <p className="font-medium text-white">{lab.title}</p>
                                      <p className="adm-muted mt-1 text-xs">{lab.course_slug ? `Parcours : ${lab.course_slug}` : "Lab autonome"}</p>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="flex flex-wrap gap-2">
                                      <Badge tone={lab.difficulty === "avance" ? "purple" : lab.difficulty === "intermediaire" ? "blue" : "neutral"}>{levelLabel(lab.difficulty)}</Badge>
                                      {lab.is_assessment && <Badge tone="amber">Évaluation</Badge>}
                                    </div>
                                  </td>
                                  <td>
                                    <span className="font-medium text-white">{formatPrice(lab.price)}</span>
                                    {lab.custom_price && <Badge tone="amber" className="ml-2">Prix personnalisé</Badge>}
                                  </td>
                                  <td className="text-right">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => openLabPriceEditor(lab)}>Modifier</Button>
                                  </td>
                                </tr>
                                {editing && (
                                  <tr key={`${lab.id}-price`}>
                                    <td colSpan={4}>
                                      <div className="cbadm-row-editor">
                                        <Input
                                          label="Prix personnalisé"
                                          type="number"
                                          min={0}
                                          max={10_000}
                                          inputMode="numeric"
                                          value={catalogEditor.price}
                                          onChange={(event) => setCatalogEditor((current) => ({ ...current, price: event.target.value, error: null }))}
                                          placeholder="Laisse vide pour le prix par défaut"
                                        />
                                        <Input label="Motif" value={catalogEditor.reason} onChange={(event) => setCatalogEditor((current) => ({ ...current, reason: event.target.value, error: null }))} maxLength={200} />
                                        {catalogEditor.error && <p className="ui-field__error" role="alert">{catalogEditor.error}</p>}
                                        <div className="cbadm-inline-actions">
                                          <Button type="button" size="sm" loading={catalogEditor.busy} onClick={() => { void saveCatalogPrice("lab", lab.title); }}>Enregistrer</Button>
                                          <Button type="button" variant="secondary" size="sm" disabled={catalogEditor.busy} onClick={() => { void saveCatalogPrice("lab", lab.title, null); }}>Revenir au prix du niveau</Button>
                                          <Button type="button" variant="ghost" size="sm" disabled={catalogEditor.busy} onClick={() => setCatalogEditor(initialCatalogEditor)}>Annuler</Button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </section>

        <section className="adm-panel">
          <div className="adm-panel__head">
            <div>
              <h2 className="adm-section-title">Portefeuilles</h2>
              <p className="adm-muted mt-1 text-sm">Recherche, solde, ajustement manuel et ouverture gratuite d’un contenu.</p>
            </div>
          </div>
          <div className="adm-toolbar">
            <div className="adm-toolbar__grow">
              <Input id={walletSearchId} type="search" label="Rechercher" value={walletSearch} onChange={(event) => setWalletSearch(event.target.value)} placeholder="Nom, pseudo ou e-mail" autoComplete="off" />
            </div>
          </div>

          {wallets.loading && !wallets.data ? (
            <AdminLoading label="Chargement des portefeuilles…" />
          ) : wallets.error && !wallets.data ? (
            <AdminError message={wallets.error.message} onRetry={() => { void wallets.reload(); }} />
          ) : wallets.data && wallets.data.wallets.length === 0 ? (
            <AdminEmpty>Aucun portefeuille ne correspond à la recherche.</AdminEmpty>
          ) : (
            <>
              <p className="adm-summary" aria-live="polite">
                {wallets.data ? tableSummary(wallets.data.total, walletPage, PAGE_SIZE) : ""}
              </p>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <caption className="sr-only">Liste des portefeuilles CyberBits</caption>
                  <thead>
                    <tr>
                      <th scope="col">Apprenant</th>
                      <th scope="col">Solde</th>
                      <th scope="col">Gagnés</th>
                      <th scope="col">Dépensés</th>
                      <th scope="col">Dernier mouvement</th>
                      <th scope="col" className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(wallets.data?.wallets ?? []).map((wallet) => {
                      const editingAdjust = walletEditor.kind === "adjust" && walletEditor.userId === wallet.user_id;
                      const editingGrant = walletEditor.kind === "grant" && walletEditor.userId === wallet.user_id;
                      return (
                        <Fragment key={wallet.user_id}>
                          <tr key={wallet.user_id}>
                            <td>
                              <div className="min-w-0">
                                <p className="font-medium text-white">{wallet.display_name}</p>
                                <p className="adm-muted mt-1 truncate text-xs">@{wallet.username} · {wallet.email}</p>
                              </div>
                            </td>
                            <td className="tabular-nums font-medium text-white">{formatCb(wallet.balance)}</td>
                            <td className="tabular-nums">{formatCb(wallet.lifetime_earned)}</td>
                            <td className="tabular-nums">{formatCb(wallet.lifetime_spent)}</td>
                            <td className="text-sm">
                              {wallet.last_movement_at ? (
                                <time dateTime={wallet.last_movement_at} title={formatDateTime(wallet.last_movement_at)}>{formatRelative(wallet.last_movement_at)}</time>
                              ) : (
                                <span className="adm-muted">Jamais</span>
                              )}
                            </td>
                            <td className="text-right">
                              <div className="cbadm-table-actions">
                                <Button type="button" variant="ghost" size="sm" onClick={() => openWalletAdjuster(wallet)}>Ajuster</Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => openWalletGrant(wallet)}>Ouvrir un accès</Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => focusTransactions(wallet)}>Historique</Button>
                              </div>
                            </td>
                          </tr>
                          {editingAdjust && (
                            <tr key={`${wallet.user_id}-adjust`}>
                              <td colSpan={6}>
                                <div className="cbadm-row-editor">
                                  <div className="cbadm-row-editor__grid">
                                    <Input
                                      label="Ajustement signé"
                                      type="number"
                                      min={-5_000}
                                      max={5_000}
                                      inputMode="numeric"
                                      value={walletEditor.amount}
                                      onChange={(event) => setWalletEditor((current) => ({ ...current, amount: event.target.value, error: null }))}
                                      placeholder="-50 ou +150"
                                    />
                                    <div className="cbadm-row-editor__hint">
                                      <p className="cbadm-help">Utilise un signe moins pour retirer des CyberBits. Le serveur bloque les soldes négatifs.</p>
                                    </div>
                                  </div>
                                  <Input label="Motif" value={walletEditor.reason} onChange={(event) => setWalletEditor((current) => ({ ...current, reason: event.target.value, error: null }))} maxLength={200} />
                                  {walletEditor.error && <p className="ui-field__error" role="alert">{walletEditor.error}</p>}
                                  <div className="cbadm-inline-actions">
                                    <Button type="button" size="sm" loading={walletEditor.busy} onClick={() => { void submitWalletAdjust(wallet); }}>Enregistrer</Button>
                                    <Button type="button" variant="ghost" size="sm" disabled={walletEditor.busy} onClick={() => setWalletEditor(initialWalletEditor)}>Annuler</Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          {editingGrant && (
                            <tr key={`${wallet.user_id}-grant`}>
                              <td colSpan={6}>
                                <div className="cbadm-row-editor">
                                  <Field label="Parcours ou lab">
                                    <select className="adm-native-select" value={walletEditor.grantValue} onChange={(event) => setWalletEditor((current) => ({ ...current, grantValue: event.target.value, error: null }))}>
                                      {grantItems.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                    </select>
                                  </Field>
                                  <Input label="Motif" value={walletEditor.reason} onChange={(event) => setWalletEditor((current) => ({ ...current, reason: event.target.value, error: null }))} maxLength={200} />
                                  {walletEditor.error && <p className="ui-field__error" role="alert">{walletEditor.error}</p>}
                                  <div className="cbadm-inline-actions">
                                    <Button type="button" size="sm" loading={walletEditor.busy} onClick={() => { void submitWalletGrant(wallet); }}>Ouvrir l’accès</Button>
                                    <Button type="button" variant="ghost" size="sm" disabled={walletEditor.busy} onClick={() => setWalletEditor(initialWalletEditor)}>Annuler</Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {wallets.data && <Pagination page={walletPage} pageSize={PAGE_SIZE} total={wallets.data.total} onPageChange={setWalletPage} />}
            </>
          )}
        </section>

        <section ref={transactionsRef} className="adm-panel">
          <div className="adm-panel__head">
            <div>
              <h2 className="adm-section-title">Mouvements</h2>
              <p className="adm-muted mt-1 text-sm">Historique paginé des gains, dépenses et ajustements.</p>
            </div>
          </div>
          <div className="adm-toolbar">
            <Select
              label="Motif"
              value={transactionReason}
              onChange={(event) => setTransactionReason(event.target.value as "all" | CbReason)}
              options={[{ value: "all", label: "Tous les motifs" }, ...Object.entries(REASON_LABELS).map(([value, label]) => ({ value, label }))]}
            />
            {transactionUser && (
              <div className="cbadm-filter-pill">
                <span>Filtre apprenant : {transactionUser.label} (@{transactionUser.username})</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setTransactionUser(null)}>Effacer</Button>
              </div>
            )}
          </div>

          {transactions.loading && !transactions.data ? (
            <AdminLoading label="Chargement des mouvements…" />
          ) : transactions.error && !transactions.data ? (
            <AdminError message={transactions.error.message} onRetry={() => { void transactions.reload(); }} />
          ) : transactions.data && transactions.data.transactions.length === 0 ? (
            <AdminEmpty>Aucun mouvement ne correspond aux filtres.</AdminEmpty>
          ) : (
            <>
              <p className="adm-summary" aria-live="polite">
                {transactions.data ? tableSummary(transactions.data.total, transactionPage, PAGE_SIZE) : ""}
              </p>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <caption className="sr-only">Historique des mouvements CyberBits</caption>
                  <thead>
                    <tr>
                      <th scope="col">Apprenant</th>
                      <th scope="col">Montant</th>
                      <th scope="col">Motif</th>
                      <th scope="col">Source</th>
                      <th scope="col">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(transactions.data?.transactions ?? []).map((transaction) => {
                      const source = SOURCE_LABELS[transaction.source];
                      return (
                        <tr key={transaction.id}>
                          <td>
                            <div className="min-w-0">
                              <p className="font-medium text-white">{transaction.display_name}</p>
                              <p className="adm-muted mt-1 text-xs">@{transaction.username}</p>
                            </div>
                          </td>
                          <td className={`tabular-nums font-medium ${transaction.amount < 0 ? "cbadm-amount cbadm-amount--negative" : "cbadm-amount cbadm-amount--positive"}`}>
                            {transaction.amount > 0 ? "+" : ""}{formatCb(transaction.amount)}
                          </td>
                          <td>
                            <p className="text-white">{REASON_LABELS[transaction.reason]}</p>
                            <p className="adm-muted mt-1 text-xs">{transaction.label}</p>
                          </td>
                          <td><Badge tone={source.tone}>{source.label}</Badge></td>
                          <td>
                            <time dateTime={transaction.created_at} title={formatDateTime(transaction.created_at)}>{formatRelative(transaction.created_at)}</time>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {transactions.data && <Pagination page={transactionPage} pageSize={PAGE_SIZE} total={transactions.data.total} onPageChange={setTransactionPage} />}
            </>
          )}
        </section>

        <section className="adm-panel">
          <div className="adm-panel__head">
            <div>
              <h2 className="adm-section-title">À surveiller</h2>
              <p className="adm-muted mt-1 text-sm">Des gains très élevés en 24 h méritent une vérification rapide.</p>
            </div>
          </div>
          {overviewData.top_earners_24h.length === 0 ? (
            <AdminEmpty>Aucun pic de gains sur les dernières 24 heures.</AdminEmpty>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <caption className="sr-only">Apprenants ayant gagné le plus de CyberBits sur les 24 dernières heures</caption>
                <thead>
                  <tr>
                    <th scope="col">Apprenant</th>
                    <th scope="col">Gagnés en 24 h</th>
                    <th scope="col">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {overviewData.top_earners_24h.map((wallet) => (
                    <tr key={wallet.user_id}>
                      <td>
                        <p className="font-medium text-white">{wallet.display_name}</p>
                        <p className="adm-muted mt-1 text-xs">@{wallet.username}</p>
                      </td>
                      <td className="tabular-nums cbadm-amount cbadm-amount--positive">+{formatCb(wallet.earned)}</td>
                      <td className="tabular-nums">{formatCb(wallet.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
