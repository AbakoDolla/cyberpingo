"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import CoinIcon from "@/components/cyberbits/CoinIcon";
import UnlockModal, { type UnlockTarget } from "@/components/cyberbits/UnlockModal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  IconActivity, IconAlert, IconArrowRight, IconBolt, IconCheck, IconClock, IconCourses, IconLock,
  IconShield, IconTarget, IconTerminal,
} from "@/components/ui/Icon";
import { useUser, useUserActions } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { formatDate, formatDateTime, formatDuration, formatNumber, formatRelative, levelLabel, plural } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import { localizeCategory, localizeLevel } from "@/lib/content-i18n";
import { CB_REASON_LABELS, CB_SOURCE_LABELS, formatCb, formatCbSigned } from "@/lib/cyberbits";
import { getCatalog, getHistory, getWallet, listRules } from "@/services/cyberbits.service";
import type { CbCatalogCourse, CbCatalogLab, CbRule, CbTransaction } from "@/types/cyberbits";
import type { SkillLevel, LabCategory } from "@/types/api";
import { LAB_CATEGORY_LABELS } from "@/components/challenges/ChallengeCard";

type TabKey = "courses" | "labs" | "history" | "rules";

function BoutiqueView() {
  const { lang, t } = useTranslation();
  const isEn = lang === "en";
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "historique" ? "history" : "courses";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [unlockTarget, setUnlockTarget] = useState<UnlockTarget | null>(null);

  // Filters for Labs
  const [labSearch, setLabSearch] = useState("");
  const [labCategory, setLabCategory] = useState<LabCategory | "">("");
  const [labDifficulty, setLabDifficulty] = useState<SkillLevel | "">("");

  const { isAuthenticated, cbBalance } = useUser();
  const { refreshWallet } = useUserActions();

  const { data: catalog, loading: loadingCatalog, reload: reloadCatalog } = useAsync(() => getCatalog(), []);
  const { data: wallet, reload: reloadWallet } = useAsync(() => (isAuthenticated ? getWallet() : Promise.resolve(null)), [isAuthenticated]);
  const { data: history, loading: loadingHistory, reload: reloadHistory } = useAsync(() => (isAuthenticated ? getHistory(50) : Promise.resolve([])), [isAuthenticated]);
  const { data: rules } = useAsync(() => listRules(), []);

  const settings = catalog?.settings;
  const balance = isAuthenticated ? cbBalance : 0;

  function refreshAll() {
    void reloadCatalog();
    void reloadWallet();
    void reloadHistory();
    void refreshWallet();
  }

  // Filtered labs
  const filteredLabs = useMemo(() => {
    if (!catalog?.labs) return [];
    const q = labSearch.trim().toLowerCase();
    return catalog.labs.filter((lab) => {
      const matchesQ = !q || lab.title.toLowerCase().includes(q) || (lab.course_slug && lab.course_slug.toLowerCase().includes(q));
      const matchesCat = !labCategory || lab.category === labCategory;
      const matchesDiff = !labDifficulty || lab.difficulty === labDifficulty;
      return matchesQ && matchesCat && matchesDiff;
    });
  }, [catalog?.labs, labSearch, labCategory, labDifficulty]);

  return (
    <div className="study-page cb-shop-page">
      {/* Hero / Wallet Overview Banner */}
      <header className="cb-shop-hero">
        <div>
          <h1>{t("shop.title")}</h1>
          <p>{t("shop.subtitle")}</p>
        </div>
        <div className="cb-shop-hero__wallet">
          <span className="cb-shop-hero__wallet-label">{t("shop.available_balance")}</span>
          <div className="cb-shop-hero__wallet-amount">
            <CoinIcon size={32} glow />
            <strong>{formatNumber(balance)}</strong>
            <span>CB</span>
          </div>
          {isAuthenticated && wallet ? (
            <span className="cb-shop-hero__wallet-sub">
              {isEn
                ? `+${formatNumber(wallet.lifetime_earned)} earned · −${formatNumber(wallet.lifetime_spent)} spent`
                : `+${formatNumber(wallet.lifetime_earned)} gagnés · −${formatNumber(wallet.lifetime_spent)} dépensés`}
            </span>
          ) : (
            <span className="cb-shop-hero__wallet-sub">{t("shop.discovery_mode")}</span>
          )}
        </div>
      </header>

      {/* Maintenance / Gating Status Alerts */}
      {settings?.paused_reason && (
        <div className="cb-unlock-modal__alert is-warning" role="alert">
          <IconAlert size={20} />
          <div>
            <strong>{isEn ? "CyberPingo Team Notice" : "Message de l’équipe CyberPingo"}</strong>
            <p>{settings.paused_reason}</p>
          </div>
        </div>
      )}
      {!settings?.purchases_enabled && (
        <div className="cb-unlock-modal__alert is-warning" role="alert">
          <IconAlert size={20} />
          <div>
            <strong>{isEn ? "Shop temporarily closed" : "Boutique temporairement fermée"}</strong>
            <p>{isEn ? "Purchases are paused for maintenance. Your CyberBits remain secure." : "Les achats sont suspendus pour maintenance. Tes CyberBits sont en sécurité."}</p>
          </div>
        </div>
      )}
      {!settings?.gating_enabled && (
        <div className="cb-unlock-modal__alert is-info" role="status">
          <IconBolt size={20} />
          <div>
            <strong>{isEn ? "Free Access Mode Enabled" : "Accès libre activé"}</strong>
            <p>{isEn ? "All courses and labs are currently accessible without spending CyberBits." : "Tous les parcours et laboratoires sont actuellement ouverts sans dépense de CyberBits."}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <nav className="cb-shop-tabs" aria-label={isEn ? "Shop sections" : "Sections de la boutique"}>
        <button
          type="button"
          onClick={() => setActiveTab("courses")}
          className={`cb-shop-tab ${activeTab === "courses" ? "is-active" : ""}`}
        >
          <IconCourses size={16} /> {t("shop.tab_courses")} ({catalog?.courses.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("labs")}
          className={`cb-shop-tab ${activeTab === "labs" ? "is-active" : ""}`}
        >
          <IconShield size={16} /> {t("shop.tab_labs")} ({catalog?.labs.length ?? 0})
        </button>
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`cb-shop-tab ${activeTab === "history" ? "is-active" : ""}`}
          >
            <IconClock size={16} /> {t("shop.tab_history")}
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={`cb-shop-tab ${activeTab === "rules" ? "is-active" : ""}`}
        >
          <IconTarget size={16} /> {t("shop.tab_rules")}
        </button>
      </nav>

      {/* Tab: Courses */}
      {activeTab === "courses" && (
        <section aria-label={isEn ? "Learning Tracks" : "Parcours de formation"}>
          {loadingCatalog && <div className="study-empty"><p>{t("shop.loading_catalog")}</p></div>}
          {catalog?.courses && (
            <div className="cb-shop-grid">
              {catalog.courses.map((course) => {
                const isFree = course.price === 0;
                const canBuy = !course.unlocked && (!course.prerequisite || course.prerequisite.completed) && balance >= course.price;
                return (
                  <article key={course.id} className="cb-item-card">
                    <div className="cb-item-card__top">
                      <div className="cb-item-card__badges">
                        <Badge tone="blue">{localizeLevel(course.level, lang)}</Badge>
                        <Badge tone="neutral">{localizeCategory(course.category, lang)}</Badge>
                      </div>
                      <span className={`cb-item-card__price ${isFree ? "is-free" : ""}`}>
                        {isFree ? t("shop.free") : <><CoinIcon size={14} /> {course.price} CB</>}
                      </span>
                    </div>

                    <h3>{course.title}</h3>
                    <p>{course.short_description || (isEn ? "Complete track with lessons, quizzes, and practical validation." : "Parcours complet avec leçons, quiz et validation pratique.")}</p>

                    {course.prerequisite && !course.unlocked && (
                      <div className="cb-item-card__prereq">
                        {course.prerequisite.completed ? (
                          <span><IconCheck size={14} className="inline mr-1 text-cyber-green" /> {t("shop.valid_prereq")} : {course.prerequisite.title}</span>
                        ) : (
                          <span><IconLock size={14} className="inline mr-1" /> {t("shop.locked_prereq")} : {course.prerequisite.title}</span>
                        )}
                      </div>
                    )}

                    <div className="cb-item-card__footer">
                      <span className="text-xs text-cyber-muted flex items-center gap-1">
                        <IconClock size={13} /> {formatDuration(course.estimated_duration)}
                      </span>
                      {course.unlocked ? (
                        <Link href={`/courses/${course.slug}`} className="study-button study-button--sm study-button--ghost">
                          {t("shop.access")} <IconArrowRight size={14} />
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          variant={canBuy ? "primary" : "secondary"}
                          onClick={() => setUnlockTarget({
                            kind: "course",
                            id: course.id,
                            slug: course.slug,
                            title: course.title,
                            price: course.price,
                            level: course.level,
                            category: course.category,
                            prerequisite: course.prerequisite,
                          })}
                        >
                          {t("shop.unlock")}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Tab: Labs */}
      {activeTab === "labs" && (
        <section aria-label={isEn ? "Hands-on Labs" : "Laboratoires pratiques"}>
          {/* Filters */}
          <div className="study-filters mb-6">
            <label>
              {isEn ? "Search a lab" : "Rechercher un lab"}
              <input
                type="search"
                value={labSearch}
                onChange={(e) => setLabSearch(e.target.value)}
                placeholder="Nmap, pcap, sudo, sql..."
              />
            </label>
            <label>
              {isEn ? "Difficulty" : "Difficulté"}
              <select value={labDifficulty} onChange={(e) => setLabDifficulty(e.target.value as SkillLevel | "")}>
                <option value="">{t("shop.all_levels")}</option>
                <option value="debutant">{isEn ? "Beginner (30 CB)" : "Débutant (30 CB)"}</option>
                <option value="intermediaire">{isEn ? "Intermediate (80 CB)" : "Intermédiaire (80 CB)"}</option>
                <option value="avance">{isEn ? "Advanced (180 CB)" : "Avancé (180 CB)"}</option>
              </select>
            </label>
            <label>
              {isEn ? "Category" : "Catégorie"}
              <select value={labCategory} onChange={(e) => setLabCategory(e.target.value as LabCategory | "")}>
                <option value="">{t("shop.all_categories")}</option>
                {Object.entries(LAB_CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{localizeCategory(v, lang)}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="cb-shop-grid">
            {filteredLabs.map((lab) => {
              const isFree = lab.price === 0;
              const canBuy = !lab.unlocked && balance >= lab.price;
              return (
                <article key={lab.id} className="cb-item-card">
                  <div className="cb-item-card__top">
                    <div className="cb-item-card__badges">
                      <Badge tone="purple">{localizeCategory(LAB_CATEGORY_LABELS[lab.category] || lab.category, lang)}</Badge>
                      <Badge tone="blue">{localizeLevel(lab.difficulty, lang)}</Badge>
                      {lab.is_assessment && <Badge tone="amber">{isEn ? "Assessment" : "Évaluation"}</Badge>}
                    </div>
                    <span className={`cb-item-card__price ${isFree ? "is-free" : ""}`}>
                      {isFree ? t("shop.free") : <><CoinIcon size={14} /> {lab.price} CB</>}
                    </span>
                  </div>

                  <h3>{lab.title}</h3>
                  <p>{lab.course_slug ? (isEn ? `Associated Track: ${lab.course_slug}` : `Parcours associé : ${lab.course_slug}`) : (isEn ? "Autonomous hands-on lab." : "Laboratoire d’entraînement autonome.")}</p>

                  <div className="cb-item-card__footer">
                    <span className="text-xs text-cyber-muted flex items-center gap-1">
                      <IconClock size={13} /> {lab.estimated_minutes} min
                    </span>
                    {lab.unlocked ? (
                      <Link href={`/challenges/${lab.slug}`} className="study-button study-button--sm study-button--ghost">
                        {lab.completed ? (isEn ? "Replay" : "Rejouer") : (isEn ? "Open" : "Ouvrir")} <IconArrowRight size={14} />
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        variant={canBuy ? "primary" : "secondary"}
                        onClick={() => setUnlockTarget({
                          kind: "lab",
                          id: lab.id,
                          slug: lab.slug,
                          title: lab.title,
                          price: lab.price,
                          level: lab.difficulty,
                          category: lab.category,
                        })}
                      >
                        {t("shop.unlock")}
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {filteredLabs.length === 0 && (
            <div className="study-empty">
              <p>{t("shop.empty_labs")}</p>
            </div>
          )}
        </section>
      )}

      {/* Tab: History */}
      {activeTab === "history" && isAuthenticated && (
        <section aria-label={isEn ? "CyberBits transaction history" : "Historique des transactions CyberBits"}>
          <div className="adm-panel">
            {loadingHistory && <p className="adm-muted text-sm">{isEn ? "Loading history…" : "Chargement de l’historique…"}</p>}
            {history && history.length === 0 && (
              <p className="adm-muted text-sm">{t("shop.history_empty")}</p>
            )}
            {history && history.length > 0 && (
              <div className="overflow-x-auto">
                <table className="cb-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>{isEn ? "Operation" : "Opération"}</th>
                      <th>{isEn ? "Amount" : "Montant"}</th>
                      <th>{isEn ? "Balance after" : "Solde après"}</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((tx) => (
                      <tr key={tx.id}>
                        <td className="text-xs text-cyber-muted">{formatDateTime(tx.created_at)}</td>
                        <td>
                          <strong>{tx.label || CB_REASON_LABELS[tx.reason] || tx.reason}</strong>
                        </td>
                        <td className={tx.amount > 0 ? "is-positive" : "is-negative"}>
                          <strong>{formatCbSigned(tx.amount)}</strong>
                        </td>
                        <td className="text-cyber-muted">
                          {formatNumber(tx.balance_after)} CB
                        </td>
                        <td>
                          <Badge tone="neutral">{CB_SOURCE_LABELS[tx.source] ?? tx.source}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tab: Rules & Economy */}
      {activeTab === "rules" && (
        <section aria-label={isEn ? "CyberBits Economy Rules" : "Barème des CyberBits"} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="adm-panel">
              <h2 className="adm-section-title mb-4 flex items-center gap-2">
                <IconBolt size={18} className="text-cyber-green" /> {isEn ? "How to earn CyberBits?" : "Comment gagner des CyberBits ?"}
              </h2>
              <p className="text-sm text-cyber-muted mb-4">
                {isEn
                  ? "CyberBits cannot be purchased with real money. They solely reward your dedication, hard work, and verified progression."
                  : "Les CyberBits ne s’achètent pas avec de l’argent réel. Ils récompensent uniquement tes efforts et ta progression réelle."}
              </p>
              <ul className="space-y-3 text-sm">
                {(rules ?? []).filter((r) => r.kind === "reward").map((r) => (
                  <li key={r.key} className="flex items-center justify-between border-b border-cyber-line/50 pb-2">
                    <div>
                      <strong className="block text-white">{r.label}</strong>
                      <span className="text-xs text-cyber-muted">{r.description}</span>
                    </div>
                    <Badge tone="green">+{r.amount} CB</Badge>
                  </li>
                ))}
              </ul>
            </div>

            <div className="adm-panel">
              <h2 className="adm-section-title mb-4 flex items-center gap-2">
                <IconLock size={18} className="text-cyber-cyan" /> {isEn ? "Indicative Content Pricing" : "Coût indicatif des déblocages"}
              </h2>
              <p className="text-sm text-cyber-muted mb-4">
                {isEn
                  ? "Introductory courses remain 100% free so everyone can start with peace of mind."
                  : "Les cours d’initiation restent toujours 100 % gratuits pour démarrer sereinement."}
              </p>
              <ul className="space-y-3 text-sm">
                {(rules ?? []).filter((r) => r.kind === "price").map((r) => (
                  <li key={r.key} className="flex items-center justify-between border-b border-cyber-line/50 pb-2">
                    <div>
                      <strong className="block text-white">{r.label}</strong>
                      <span className="text-xs text-cyber-muted">{r.description}</span>
                    </div>
                    <Badge tone={r.amount === 0 ? "green" : "blue"}>
                      {r.amount === 0 ? (isEn ? "Free" : "Gratuit") : `${r.amount} CB`}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Unlock Confirmation Modal */}
      <UnlockModal
        open={Boolean(unlockTarget)}
        onClose={() => setUnlockTarget(null)}
        target={unlockTarget}
        onSuccess={() => refreshAll()}
      />
    </div>
  );
}

export default function BoutiquePage() {
  return (
    <AppShell allowGuest>
      <BoutiqueView />
    </AppShell>
  );
}
