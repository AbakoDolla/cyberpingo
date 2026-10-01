"use client";

import { useMemo, useState } from "react";
import CourseCard from "@/components/courses/CourseCard";
import Button from "@/components/ui/Button";
import { LEVEL_LABELS } from "@/lib/format";
import type { CourseSummary } from "@/types/api";

export default function Catalog({ courses }: { courses: CourseSummary[] }) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const categories = useMemo(() => Array.from(new Set(courses.map((course) => course.category))).sort((a, b) => a.localeCompare(b, "fr")), [courses]);
  const [category, setCategory] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const filtered = courses.filter((course) =>
    (!level || course.level === level) &&
    (!category || course.category === category) &&
    (!normalizedQuery || `${course.title} ${course.short_description} ${course.description} ${course.category}`.toLocaleLowerCase("fr").includes(normalizedQuery))
  );
  return (
    <>
      <div className="library-filters">
        <label>Rechercher un parcours<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Réseaux, Linux, phishing…" /></label>
        <label>Niveau<select value={level} onChange={(event) => setLevel(event.target.value)}><option value="">Tous les niveaux</option>{Object.entries(LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Toutes les catégories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <p className="result-count" role="status">{filtered.length} parcours trouvé{filtered.length > 1 ? "s" : ""}</p>
      {filtered.length ? <div className="catalog-grid catalog-grid--cards">{filtered.map((course) => <CourseCard key={course.id} course={course} href={`/parcours/${course.slug}`} publicView />)}</div> : <div className="library-empty"><h2>Aucun parcours pour cette recherche.</h2><p>Essaie un autre mot-clé ou enlève les filtres.</p><Button variant="secondary" onClick={() => { setQuery(""); setLevel(""); setCategory(""); }}>Effacer les filtres</Button></div>}
    </>
  );
}