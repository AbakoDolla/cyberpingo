"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { courses } from "@/data/courses";
import { IconArrowRight } from "@/components/ui/Icon";
import { levelLabels } from "@/lib/catalog";

const artwork: Record<string, string> = {
  c1: "course-foundations.png", c2: "course-foundations.png", c3: "course-pentest.png",
  c4: "course-web.png", c5: "course-pentest.png", c6: "course-logs.png",
};

export default function Catalog() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const filtered = courses.filter((course) =>
    (!level || course.level === level) &&
    `${course.title} ${course.description} ${course.category}`.toLocaleLowerCase("fr").includes(query.trim().toLocaleLowerCase("fr"))
  );
  return (
    <>
      <div className="library-filters">
        <label>Rechercher un parcours<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Réseaux, Linux, phishing…" /></label>
        <label>Niveau<select value={level} onChange={(event) => setLevel(event.target.value)}><option value="">Tous les niveaux</option>{Object.entries(levelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <p className="result-count" role="status">{filtered.length} parcours trouvé{filtered.length > 1 ? "s" : ""}</p>
      <div className="catalog-grid">
        {filtered.map((course) => (
          <Link key={course.id} className="catalog-course" href={`/parcours/${course.slug}`}>
            <div className="catalog-art"><Image src={`/images/${artwork[course.id]}`} alt="" width={240} height={130} /><span>{levelLabels[course.level]}</span></div>
            <div className="catalog-body"><p className="catalog-category">{course.category}</p><h2>{course.title}</h2><p>{course.description}</p>
              <div className="catalog-footer"><span>{course.lessonCount} leçons · {course.durationMinutes} min</span><IconArrowRight size={20} /></div>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length && <div className="library-empty"><h2>Aucun parcours pour cette recherche.</h2><p>Essaie un autre mot-clé ou enlève le filtre de niveau.</p><button type="button" className="public-button button-outline" onClick={() => { setQuery(""); setLevel(""); }}>Effacer les filtres</button></div>}
    </>
  );
}
