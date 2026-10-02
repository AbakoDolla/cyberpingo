"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import CourseCard from "@/components/courses/CourseCard";
import Button from "@/components/ui/Button";
import { useUser } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { LEVEL_LABELS } from "@/lib/format";
import { listMyCourseProgress, listPublishedCourses } from "@/services/courses.service";

type ProgressFilter = "" | "not_started" | "in_progress" | "completed";

function CoursesView() {
  const { profile } = useUser();
  const userId = profile?.id ?? null;
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [progressState, setProgressState] = useState<ProgressFilter>("");
  const { data, error, loading, reload } = useAsync(async () => {
    const [courses, progress] = await Promise.all([listPublishedCourses(), userId ? listMyCourseProgress(userId) : Promise.resolve([])]);
    return { courses, progress };
  }, [userId]);

  const progressByCourse = useMemo(() => new Map((data?.progress ?? []).map((item) => [item.course_id, item])), [data?.progress]);
  const categories = useMemo(() => Array.from(new Set((data?.courses ?? []).map((course) => course.category))).sort((a, b) => a.localeCompare(b, "fr")), [data?.courses]);
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const filtered = useMemo(() => (data?.courses ?? []).filter((course) => {
    const matchesQuery = !normalizedQuery || `${course.title} ${course.short_description} ${course.description} ${course.category}`.toLocaleLowerCase("fr").includes(normalizedQuery);
    const progress = progressByCourse.get(course.id);
    const derivedProgress: ProgressFilter = progress?.status === "completed" || (progress?.progress_percentage ?? 0) >= 100
      ? "completed"
      : progress
        ? "in_progress"
        : "not_started";
    return matchesQuery && (!level || course.level === level) && (!category || course.category === category) && (!progressState || derivedProgress === progressState);
  }), [data?.courses, normalizedQuery, level, category, progressByCourse, progressState]);
  const enrolledCount = data?.progress.length ?? 0;
  const completedCount = data?.progress.filter((item) => item.status === "completed" || item.progress_percentage >= 100).length ?? 0;

  return (
    <div className="study-page course-catalogue-page">
        <header className="study-heading study-hero course-catalogue-hero">
          <div>
            <h1>Choisis ton prochain parcours.</h1>
            <p>Des modules courts, des quiz de validation et une progression synchronisée avec ton compte CyberPingo.{!userId && " Parcours le catalogue librement, ton compte ne sert qu’à enregistrer ta progression."}</p>
          </div>
          <div className="study-hero__panel" aria-live="polite">
            <strong>{data?.courses.length ?? 0}</strong>
            <span>parcours publiés</span>
            {userId && <small>{completedCount} terminé{completedCount > 1 ? "s" : ""} · {enrolledCount} démarré{enrolledCount > 1 ? "s" : ""}</small>}
          </div>
        </header>

        <section className="study-filters course-filters" aria-label="Filtres des parcours">
          <label>Rechercher<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Réseaux, Linux, phishing…" /></label>
          <label>Niveau<select value={level} onChange={(event) => setLevel(event.target.value)}><option value="">Tous les niveaux</option>{Object.entries(LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Catégorie<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Toutes les catégories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>Progression<select value={progressState} onChange={(event) => setProgressState(event.target.value as ProgressFilter)}><option value="">Tous les statuts</option><option value="not_started">Non commencés</option><option value="in_progress">En cours</option><option value="completed">Terminés</option></select></label>
        </section>

        {loading && <div className="course-card-grid" role="status" aria-label="Chargement des cours">{Array.from({ length: 6 }, (_, index) => <div key={index} className="course-card-skeleton"><span /><strong /><p /><p /></div>)}</div>}
        {error && !loading && <div className="study-empty" role="alert"><h2>Impossible de charger les cours.</h2><p>{error.message}</p><Button variant="secondary" onClick={() => void reload()}>Réessayer</Button></div>}
        {!loading && !error && data && data.courses.length === 0 && <div className="study-empty"><h2>Aucun cours disponible pour le moment.</h2></div>}
        {!loading && !error && data && data.courses.length > 0 && (
          <>
            <p className="study-result-count" role="status">{filtered.length} parcours trouvé{filtered.length > 1 ? "s" : ""}</p>
            {filtered.length ? (
              <div className="course-card-grid">
                {filtered.map((course) => <CourseCard key={course.id} course={course} href={`/courses/${course.slug}`} progress={progressByCourse.get(course.id)} publicView={!userId} />)}
              </div>
            ) : (
              <div className="study-empty"><h2>Aucun parcours ne correspond à tes filtres.</h2><button type="button" className="study-link" onClick={() => { setQuery(""); setLevel(""); setCategory(""); setProgressState(""); }}>Effacer les filtres</button></div>
            )}
          </>
        )}
    </div>
  );
}

/** Open to visitors: the catalogue is public, progress is only loaded for signed-in learners. */
export default function CoursesPage() {
  return <AppShell allowGuest><CoursesView /></AppShell>;
}
