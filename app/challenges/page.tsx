"use client";

import { useMemo, useState } from "react";
import EmptyArt from "@/components/art/EmptyArt";
import SceneBanner from "@/components/art/SceneBanner";
import AppShell from "@/components/layout/AppShell";
import ChallengeCard, { LAB_CATEGORY_LABELS } from "@/components/challenges/ChallengeCard";
import Button from "@/components/ui/Button";
import { useUser } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { LEVEL_LABELS } from "@/lib/format";
import { listLabs } from "@/services/labs.service";
import type { LabCategory, SkillLevel } from "@/types/api";

function ChallengesView() {
  const { profile } = useUser();
  const userId = profile?.id ?? null;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LabCategory | "">("");
  const [difficulty, setDifficulty] = useState<SkillLevel | "">("");
  const { data: labs, error, loading, reload } = useAsync(() => listLabs(userId), [userId]);
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const filtered = useMemo(() => (labs ?? []).filter((lab) => {
    const searchable = `${lab.title} ${lab.description} ${LAB_CATEGORY_LABELS[lab.category]} ${lab.objectives.join(" ")}`.toLocaleLowerCase("fr");
    return (!normalizedQuery || searchable.includes(normalizedQuery)) && (!category || lab.category === category) && (!difficulty || lab.difficulty === difficulty);
  }), [labs, normalizedQuery, category, difficulty]);
  const solvedCount = labs?.filter((lab) => lab.solved).length ?? 0;

  return (
    <div className="study-page lab-catalogue-page">
        <header>
          <SceneBanner variant="challenges" className="study-heading study-hero lab-catalogue-hero">
            <div><h1>Labs pratiques</h1><p>Des exercices guidés où tu raisonnes sur des objectifs, des indices et un terminal de simulation.{!userId && " Explore les labs librement, connecte-toi pour soumettre tes flags et gagner de l’XP."}</p></div>
            <div className="study-hero__panel" aria-live="polite">
              <strong>{userId ? solvedCount : labs?.length ?? 0}</strong>
              <span>{userId ? `lab${solvedCount > 1 ? "s" : ""} résolu${solvedCount > 1 ? "s" : ""}` : `lab${(labs?.length ?? 0) > 1 ? "s" : ""} disponible${(labs?.length ?? 0) > 1 ? "s" : ""}`}</span>
            </div>
          </SceneBanner>
        </header>
        <section className="study-filters lab-filters" aria-label="Filtres des labs">
          <label>Rechercher<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="OSINT, flag, terminal…" /></label>
          <label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value as LabCategory | "")}><option value="">Toutes les catégories</option>{Object.entries(LAB_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Difficulté<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as SkillLevel | "")}><option value="">Toutes les difficultés</option>{Object.entries(LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </section>
        {loading && <div className="lab-card-grid" role="status" aria-label="Chargement des labs">{Array.from({ length: 6 }, (_, index) => <div key={index} className="lab-card-skeleton"><span /><strong /><p /><p /></div>)}</div>}
        {error && !loading && <div className="study-empty" role="alert"><h2>Impossible de charger les labs.</h2><p>{error.message}</p><Button variant="secondary" onClick={() => void reload()}>Réessayer</Button></div>}
        {!loading && !error && labs && labs.length === 0 && <div className="study-empty"><EmptyArt kind="labs" /><h2>Aucun lab disponible pour le moment.</h2></div>}
        {!loading && !error && labs && labs.length > 0 && (
          <>
            <p className="study-result-count" role="status">{filtered.length} lab{filtered.length > 1 ? "s" : ""} trouvé{filtered.length > 1 ? "s" : ""}</p>
            {filtered.length ? <div className="lab-card-grid">{filtered.map((lab) => <ChallengeCard key={lab.id} lab={lab} />)}</div> : <div className="study-empty"><EmptyArt kind="search" /><h2>Aucun lab ne correspond à tes filtres.</h2><button type="button" className="study-link" onClick={() => { setQuery(""); setCategory(""); setDifficulty(""); }}>Effacer les filtres</button></div>}
          </>
        )}
    </div>
  );
}

/** Visitors can browse the lab catalogue; submitting a flag requires an account. */
export default function ChallengesPage() {
  return <AppShell allowGuest><ChallengesView /></AppShell>;
}
