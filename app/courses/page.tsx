"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import CourseCard from "@/components/courses/CourseCard";
import Button from "@/components/ui/Button";
import { useLearner } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { LEVEL_LABELS } from "@/lib/format";
import { listMyCourseProgress, listPublishedCourses } from "@/services/courses.service";

function CoursesView() {
  const { profile } = useLearner();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const { data, error, loading, reload } = useAsync(async () => {
    const [courses, progress] = await Promise.all([listPublishedCourses(), listMyCourseProgress(profile.id)]);
    return { courses, progress };
  }, [profile.id]);

  const progressByCourse = useMemo(() => new Map((data?.progress ?? []).map((item) => [item.course_id, item])), [data?.progress]);
  const categories = useMemo(() => Array.from(new Set((data?.courses ?? []).map((course) => course.category))).sort((a, b) => a.localeCompare(b, "fr")), [data?.courses]);
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const filtered = useMemo(() => (data?.courses ?? []).filter((course) => {
    const matchesQuery = !normalizedQuery || `${course.title} ${course.short_description} ${course.description} ${course.category}`.toLocaleLowerCase("fr").includes(normalizedQuery);
    return matchesQuery && (!level || course.level === level) && (!category || course.category === category);
  }), [data?.courses, normalizedQuery, level, category]);

  return (
    <>
      <main className="study-page">
        <header className="study-heading learning-hero">
          <div>
            <h1>Choisis ton prochain parcours.</h1>
            <p>Des modules courts, des quiz de validation et une progression synchronisée avec ton compte CyberPingo.</p>
          </div>
          <p className="learning-hero__badge" aria-live="polite">{data?.courses.length ?? 0} parcours publiés</p>
        </header>

        <section className="study-filters learning-filters" aria-label="Filtres des parcours">
          <label>Rechercher<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Réseaux, Linux, phishing…" /></label>
          <label>Niveau<select value={level} onChange={(event) => setLevel(event.target.value)}><option value="">Tous les niveaux</option>{Object.entries(LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Toutes les catégories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        </section>

        {loading && <div className="study-empty" role="status"><h2>Chargement des cours…</h2><p>On prépare le catalogue publié.</p></div>}
        {error && !loading && <div className="study-empty" role="alert"><h2>Impossible de charger les cours.</h2><p>{error.message}</p><Button variant="secondary" onClick={() => void reload()}>Réessayer</Button></div>}
        {!loading && !error && data && data.courses.length === 0 && <div className="study-empty"><h2>Aucun cours disponible pour le moment.</h2></div>}
        {!loading && !error && data && data.courses.length > 0 && (
          <>
            <p className="result-count" role="status">{filtered.length} parcours trouvé{filtered.length > 1 ? "s" : ""}</p>
            {filtered.length ? (
              <div className="learning-card-grid">
                {filtered.map((course) => <CourseCard key={course.id} course={course} href={`/courses/${course.slug}`} progress={progressByCourse.get(course.id)} />)}
              </div>
            ) : (
              <div className="study-empty"><h2>Aucun parcours ne correspond à tes filtres.</h2><button type="button" className="study-link" onClick={() => { setQuery(""); setLevel(""); setCategory(""); }}>Effacer les filtres</button></div>
            )}
          </>
        )}
      </main>
    </>
  );
}

/** AppShell gates rendering on a loaded profile, so the view can call useLearner() safely. */
export default function CoursesPage() {
  return <AppShell><CoursesView /></AppShell>;
}
