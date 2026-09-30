"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import ChallengeCard, { LAB_CATEGORY_LABELS } from "@/components/challenges/ChallengeCard";
import Button from "@/components/ui/Button";
import { useLearner } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { LEVEL_LABELS } from "@/lib/format";
import { listLabs } from "@/services/labs.service";
import type { LabCategory, SkillLevel } from "@/types/api";

function ChallengesView() {
  const { profile } = useLearner();
  const [category, setCategory] = useState<LabCategory | "">("");
  const [difficulty, setDifficulty] = useState<SkillLevel | "">("");
  const { data: labs, error, loading, reload } = useAsync(() => listLabs(profile.id), [profile.id]);
  const filtered = useMemo(() => (labs ?? []).filter((lab) => (!category || lab.category === category) && (!difficulty || lab.difficulty === difficulty)), [labs, category, difficulty]);

  return (
    <>
      <main className="study-page labs-page">
        <header className="study-heading learning-hero">
          <div><h1>Labs pratiques</h1><p>Des exercices guidés où tu raisonnes sur des objectifs, des indices et un terminal de simulation.</p></div>
          <p className="learning-hero__badge">{labs?.filter((lab) => lab.solved).length ?? 0} résolu{(labs?.filter((lab) => lab.solved).length ?? 0) > 1 ? "s" : ""}</p>
        </header>
        <section className="study-filters learning-filters" aria-label="Filtres des labs">
          <label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value as LabCategory | "")}><option value="">Toutes les catégories</option>{Object.entries(LAB_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Difficulté<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as SkillLevel | "")}><option value="">Toutes les difficultés</option>{Object.entries(LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </section>
        {loading && <div className="study-empty" role="status"><h2>Chargement des labs…</h2></div>}
        {error && !loading && <div className="study-empty" role="alert"><h2>Impossible de charger les labs.</h2><p>{error.message}</p><Button variant="secondary" onClick={() => void reload()}>Réessayer</Button></div>}
        {!loading && !error && labs && labs.length === 0 && <div className="study-empty"><h2>Aucun lab disponible pour le moment.</h2></div>}
        {!loading && !error && labs && labs.length > 0 && (
          <>
            <p className="result-count" role="status">{filtered.length} lab{filtered.length > 1 ? "s" : ""} trouvé{filtered.length > 1 ? "s" : ""}</p>
            {filtered.length ? <div className="learning-card-grid">{filtered.map((lab) => <ChallengeCard key={lab.id} lab={lab} />)}</div> : <div className="study-empty"><h2>Aucun lab ne correspond à tes filtres.</h2><button type="button" className="study-link" onClick={() => { setCategory(""); setDifficulty(""); }}>Effacer les filtres</button></div>}
          </>
        )}
      </main>
    </>
  );
}

/** AppShell gates rendering on a loaded profile, so the view can call useLearner() safely. */
export default function ChallengesPage() {
  return <AppShell><ChallengesView /></AppShell>;
}
