"use client";

import AppShell from "@/components/layout/AppShell";
import CourseCard from "@/components/courses/CourseCard";
import { courses } from "@/data/courses";
import { usePublishStore } from "@/hooks/usePublishStore";
import { Course } from "@/types";
import { IconBolt } from "@/components/ui/Icon";
import { useState } from "react";
import { levelLabels } from "@/lib/catalog";

export default function CoursesPage() {
  const { publishedCourses, hydrated } = usePublishStore();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");

  // Convertit les cours publiés en format Course pour CourseCard
  const publishedAsCourses: Course[] = publishedCourses.map((pc) => ({
    id: pc.id,
    slug: pc.slug,
    title: pc.title,
    description: pc.description,
    level: pc.level,
    durationMinutes: pc.durationMinutes,
    lessonCount: pc.lessons.length,
    progress: 0,
    category: pc.category,
    locked: false,
    icon: pc.icon ?? pc.slug,
    lessons: pc.lessons,
  }));

  const matches = (course: Course) => (!level || course.level === level) && `${course.title} ${course.description} ${course.category}`.toLocaleLowerCase("fr").includes(query.trim().toLocaleLowerCase("fr"));
  const filteredCourses = courses.filter(matches);
  const filteredPublished = publishedAsCourses.filter(matches);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Cours</h1>
            <p className="text-white/50 text-sm mt-1">
              Progresse module par module, à ton propre rythme.
            </p>
          </div>
          {hydrated && publishedAsCourses.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-cyber-green bg-cyber-green/10 border border-cyber-green/20 px-3 py-1.5 rounded-full">
              <IconBolt size={12} />
              {publishedAsCourses.length} cours publié{publishedAsCourses.length > 1 ? "s" : ""}
            </div>
          )}
        </div>

        <div className="study-filters">
          <label>Rechercher<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Un sujet, un parcours…" /></label>
          <label>Niveau<select value={level} onChange={(event) => setLevel(event.target.value)}><option value="">Tous les niveaux</option>{Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <p role="status" className="mt-5 text-sm text-slate-300">{filteredCourses.length + filteredPublished.length} parcours trouvé(s)</p>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>

        {/* Cours publiés */}
        {hydrated && filteredPublished.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display font-semibold text-lg">Cours publiés par l’équipe</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyber-green/10 text-cyber-green border border-cyber-green/20">
                Nouveau
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPublished.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        )}
        {!filteredCourses.length && !filteredPublished.length && <div className="study-empty"><p>Aucun parcours ne correspond à tes filtres.</p><button className="study-link" onClick={() => { setQuery(""); setLevel(""); }}>Effacer les filtres</button></div>}
      </div>
    </AppShell>
  );
}
