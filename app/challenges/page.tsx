"use client";

import { useMemo, useState } from "react";
import EmptyArt from "@/components/art/EmptyArt";
import SceneBanner from "@/components/art/SceneBanner";
import AppShell from "@/components/layout/AppShell";
import ChallengeCard, { LAB_CATEGORY_LABELS, LAB_CATEGORY_I18N } from "@/components/challenges/ChallengeCard";
import Button from "@/components/ui/Button";
import { useUser } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { useTranslation } from "@/lib/i18n";
import { localizeLab, localizeLevel } from "@/lib/content-i18n";
import { LEVEL_LABELS } from "@/lib/format";
import { listLabs } from "@/services/labs.service";
import type { LabCategory, SkillLevel } from "@/types/api";

function ChallengesView() {
  const { profile } = useUser();
  const { lang } = useTranslation();
  const isEn = lang === "en";
  const userId = profile?.id ?? null;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LabCategory | "">("");
  const [difficulty, setDifficulty] = useState<SkillLevel | "">("");
  const { data: rawLabs, error, loading, reload } = useAsync(() => listLabs(userId), [userId]);

  const labs = useMemo(() => {
    return (rawLabs ?? []).map((l) => localizeLab(l, lang));
  }, [rawLabs, lang]);

  const normalizedQuery = query.trim().toLocaleLowerCase(isEn ? "en" : "fr");
  const filtered = useMemo(() => labs.filter((lab) => {
    const catName = LAB_CATEGORY_I18N[lab.category]?.[isEn ? "en" : "fr"] ?? lab.category;
    const searchable = `${lab.title} ${lab.description} ${catName} ${lab.objectives.join(" ")}`.toLocaleLowerCase(isEn ? "en" : "fr");
    return (!normalizedQuery || searchable.includes(normalizedQuery)) && (!category || lab.category === category) && (!difficulty || lab.difficulty === difficulty);
  }), [labs, normalizedQuery, category, difficulty, isEn]);
  
  const solvedCount = labs.filter((lab) => lab.solved).length;

  return (
    <div className="study-page lab-catalogue-page">
        <header>
          <SceneBanner variant="challenges" className="study-heading study-hero lab-catalogue-hero">
            <div>
              <h1>{isEn ? "Hands-on Labs" : "Labs pratiques"}</h1>
              <p>
                {isEn
                  ? "Guided cyber security challenges where you work with realistic clues, terminal simulation, and defense concepts."
                  : "Des exercices guidés où tu raisonnes sur des objectifs, des indices et un terminal de simulation."}
                {!userId && (isEn ? " Explore freely, sign in to submit flags and earn XP." : " Explore les labs librement, connecte-toi pour soumettre tes flags et gagner de l’XP.")}
              </p>
            </div>
            <div className="study-hero__panel" aria-live="polite">
              <strong>{userId ? solvedCount : labs.length}</strong>
              <span>
                {userId
                  ? isEn
                    ? `${solvedCount} lab${solvedCount > 1 ? "s" : ""} solved`
                    : `lab${solvedCount > 1 ? "s" : ""} résolu${solvedCount > 1 ? "s" : ""}`
                  : isEn
                  ? `${labs.length} lab${labs.length > 1 ? "s" : ""} available`
                  : `lab${labs.length > 1 ? "s" : ""} disponible${labs.length > 1 ? "s" : ""}`}
              </span>
            </div>
          </SceneBanner>
        </header>
        <section className="study-filters lab-filters" aria-label={isEn ? "Lab filters" : "Filtres des labs"}>
          <label>
            {isEn ? "Search" : "Rechercher"}
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isEn ? "OSINT, flag, terminal…" : "OSINT, flag, terminal…"} />
          </label>
          <label>
            {isEn ? "Category" : "Catégorie"}
            <select value={category} onChange={(event) => setCategory(event.target.value as LabCategory | "")}>
              <option value="">{isEn ? "All categories" : "Toutes les catégories"}</option>
              {(Object.keys(LAB_CATEGORY_LABELS) as LabCategory[]).map((value) => (
                <option key={value} value={value}>
                  {LAB_CATEGORY_I18N[value]?.[isEn ? "en" : "fr"] ?? value}
                </option>
              ))}
            </select>
          </label>
          <label>
            {isEn ? "Difficulty" : "Difficulté"}
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as SkillLevel | "")}>
              <option value="">{isEn ? "All difficulties" : "Toutes les difficultés"}</option>
              {Object.keys(LEVEL_LABELS).map((value) => (
                <option key={value} value={value}>
                  {localizeLevel(value, lang)}
                </option>
              ))}
            </select>
          </label>
        </section>
        {loading && <div className="lab-card-grid" role="status" aria-label={isEn ? "Loading labs" : "Chargement des labs"}>{Array.from({ length: 6 }, (_, index) => <div key={index} className="lab-card-skeleton"><span /><strong /><p /><p /></div>)}</div>}
        {error && !loading && (
          <div className="study-empty" role="alert">
            <h2>{isEn ? "Unable to load labs." : "Impossible de charger les labs."}</h2>
            <p>{error.message}</p>
            <Button variant="secondary" onClick={() => void reload()}>{isEn ? "Retry" : "Réessayer"}</Button>
          </div>
        )}
        {!loading && !error && labs && labs.length === 0 && (
          <div className="study-empty">
            <EmptyArt kind="labs" />
            <h2>{isEn ? "No labs available at this time." : "Aucun lab disponible pour le moment."}</h2>
          </div>
        )}
        {!loading && !error && labs && labs.length > 0 && (
          <>
            <p className="study-result-count" role="status">
              {isEn
                ? `${filtered.length} lab${filtered.length > 1 ? "s" : ""} found`
                : `${filtered.length} lab${filtered.length > 1 ? "s" : ""} trouvé${filtered.length > 1 ? "s" : ""}`}
            </p>
            {filtered.length ? (
              <div className="lab-card-grid">
                {filtered.map((lab) => <ChallengeCard key={lab.id} lab={lab} />)}
              </div>
            ) : (
              <div className="study-empty">
                <EmptyArt kind="search" />
                <h2>{isEn ? "No lab matches your filters." : "Aucun lab ne correspond à tes filtres."}</h2>
                <button type="button" className="study-link" onClick={() => { setQuery(""); setCategory(""); setDifficulty(""); }}>
                  {isEn ? "Clear filters" : "Effacer les filtres"}
                </button>
              </div>
            )}
          </>
        )}
    </div>
  );
}

/** Visitors can browse the lab catalogue; submitting a flag requires an account. */
export default function ChallengesPage() {
  return <AppShell allowGuest><ChallengesView /></AppShell>;
}
