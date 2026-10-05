"use client";

import { useMemo, useState } from "react";
import EmptyArt from "@/components/art/EmptyArt";
import SceneBanner from "@/components/art/SceneBanner";
import AppShell from "@/components/layout/AppShell";
import CourseCard from "@/components/courses/CourseCard";
import Button from "@/components/ui/Button";
import { useUser } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { useTranslation } from "@/lib/i18n";
import { localizeCourseSummary, localizeLevel, localizeCategory } from "@/lib/content-i18n";
import { LEVEL_LABELS } from "@/lib/format";
import { listMyCourseProgress, listPublishedCourses } from "@/services/courses.service";

type ProgressFilter = "" | "not_started" | "in_progress" | "completed";

function CoursesView() {
  const { profile } = useUser();
  const { lang, t } = useTranslation();
  const isEn = lang === "en";
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
  
  // Localize raw courses according to current lang
  const localizedCourses = useMemo(() => {
    return (data?.courses ?? []).map((c) => localizeCourseSummary(c, lang));
  }, [data?.courses, lang]);

  const categories = useMemo(() => Array.from(new Set(localizedCourses.map((course) => course.category))).sort((a, b) => a.localeCompare(b, isEn ? "en" : "fr")), [localizedCourses, isEn]);
  const normalizedQuery = query.trim().toLocaleLowerCase(isEn ? "en" : "fr");
  const filtered = useMemo(() => localizedCourses.filter((course) => {
    const matchesQuery = !normalizedQuery || `${course.title} ${course.short_description} ${course.description} ${course.category}`.toLocaleLowerCase(isEn ? "en" : "fr").includes(normalizedQuery);
    const progress = progressByCourse.get(course.id);
    const derivedProgress: ProgressFilter = progress?.status === "completed" || (progress?.progress_percentage ?? 0) >= 100
      ? "completed"
      : progress
        ? "in_progress"
        : "not_started";
    return matchesQuery && (!level || course.level === level) && (!category || course.category === category) && (!progressState || derivedProgress === progressState);
  }), [localizedCourses, normalizedQuery, level, category, progressByCourse, progressState, isEn]);
  
  const enrolledCount = data?.progress.length ?? 0;
  const completedCount = data?.progress.filter((item) => item.status === "completed" || item.progress_percentage >= 100).length ?? 0;

  return (
    <div className="study-page course-catalogue-page">
        <header>
          <SceneBanner variant="courses" className="study-heading study-hero course-catalogue-hero">
            <div>
              <h1>{isEn ? "Choose your next track." : "Choisis ton prochain parcours."}</h1>
              <p>
                {isEn
                  ? "Short hands-on modules, validation quizzes, and progress synchronized with your CyberPingo account."
                  : "Des modules courts, des quiz de validation et une progression synchronisée avec ton compte CyberPingo."}
                {!userId && (isEn ? " Explore freely, your account is only needed to save your progression." : " Parcours le catalogue librement, ton compte ne sert qu’à enregistrer ta progression.")}
              </p>
            </div>
            <div className="study-hero__panel" aria-live="polite">
              <strong>{data?.courses.length ?? 0}</strong>
              <span>{isEn ? "published tracks" : "parcours publiés"}</span>
              {userId && (
                <small>
                  {isEn
                    ? `${completedCount} completed · ${enrolledCount} started`
                    : `${completedCount} terminé${completedCount > 1 ? "s" : ""} · ${enrolledCount} démarré${enrolledCount > 1 ? "s" : ""}`}
                </small>
              )}
            </div>
          </SceneBanner>
        </header>

        <section className="study-filters course-filters" aria-label={isEn ? "Track filters" : "Filtres des parcours"}>
          <label>
            {isEn ? "Search" : "Rechercher"}
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isEn ? "Networks, Linux, phishing…" : "Réseaux, Linux, phishing…"}
            />
          </label>
          <label>
            {isEn ? "Level" : "Niveau"}
            <select value={level} onChange={(event) => setLevel(event.target.value)}>
              <option value="">{isEn ? "All levels" : "Tous les niveaux"}</option>
              {Object.keys(LEVEL_LABELS).map((value) => (
                <option key={value} value={value}>
                  {localizeLevel(value, lang)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {isEn ? "Category" : "Catégorie"}
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">{isEn ? "All categories" : "Toutes les catégories"}</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            {isEn ? "Progress" : "Progression"}
            <select value={progressState} onChange={(event) => setProgressState(event.target.value as ProgressFilter)}>
              <option value="">{isEn ? "All statuses" : "Tous les statuts"}</option>
              <option value="not_started">{isEn ? "Not started" : "Non commencés"}</option>
              <option value="in_progress">{isEn ? "In progress" : "En cours"}</option>
              <option value="completed">{isEn ? "Completed" : "Terminés"}</option>
            </select>
          </label>
        </section>

        {loading && <div className="course-card-grid" role="status" aria-label={isEn ? "Loading courses" : "Chargement des cours"}>{Array.from({ length: 6 }, (_, index) => <div key={index} className="course-card-skeleton"><span /><strong /><p /><p /></div>)}</div>}
        {error && !loading && (
          <div className="study-empty" role="alert">
            <h2>{isEn ? "Unable to load courses." : "Impossible de charger les cours."}</h2>
            <p>{error.message}</p>
            <Button variant="secondary" onClick={() => void reload()}>{isEn ? "Retry" : "Réessayer"}</Button>
          </div>
        )}
        {!loading && !error && data && data.courses.length === 0 && (
          <div className="study-empty">
            <EmptyArt kind="courses" />
            <h2>{isEn ? "No courses available at this time." : "Aucun cours disponible pour le moment."}</h2>
          </div>
        )}
        {!loading && !error && data && data.courses.length > 0 && (
          <>
            <p className="study-result-count" role="status">
              {isEn
                ? `${filtered.length} track${filtered.length > 1 ? "s" : ""} found`
                : `${filtered.length} parcours trouvé${filtered.length > 1 ? "s" : ""}`}
            </p>
            {filtered.length ? (
              <div className="course-card-grid">
                {filtered.map((course) => <CourseCard key={course.id} course={course} href={`/courses/${course.slug}`} progress={progressByCourse.get(course.id)} publicView={!userId} />)}
              </div>
            ) : (
              <div className="study-empty">
                <EmptyArt kind="search" />
                <h2>{isEn ? "No track matches your filters." : "Aucun parcours ne correspond à tes filtres."}</h2>
                <button type="button" className="study-link" onClick={() => { setQuery(""); setLevel(""); setCategory(""); setProgressState(""); }}>
                  {isEn ? "Clear filters" : "Effacer les filtres"}
                </button>
              </div>
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
