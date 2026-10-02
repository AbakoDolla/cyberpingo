"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { articleCover, articles } from "@/data/public-content";
import { IconArrowRight } from "@/components/ui/Icon";

export default function ResourceLibrary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const categories = useMemo(() => Array.from(new Set(articles.map((article) => article.category))).sort((a, b) => a.localeCompare(b, "fr")), []);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    return articles.filter((article) => (!category || article.category === category) && `${article.slug} ${article.title} ${article.description} ${article.sections.map((section) => section.title).join(" ")}`.toLocaleLowerCase("fr").includes(normalizedQuery));
  }, [category, query]);
  const hasActiveFilters = Boolean(query.trim() || category);
  return (
    <section className="public-stack" aria-label="Bibliothèque de ressources">
      <div className="library-filters library-filters--resources" role="search" aria-label="Filtrer les guides">
        <label>Rechercher un guide<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Comptes, sauvegardes, logs…" /></label>
        <label>Thème<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Tous les thèmes</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className="library-results-bar">
        <p className="result-count" role="status" aria-live="polite">{filtered.length} guide{filtered.length > 1 ? "s" : ""} disponible{filtered.length > 1 ? "s" : ""}</p>
        {hasActiveFilters && <button type="button" className="public-text-link" onClick={() => { setQuery(""); setCategory(""); }}>Effacer les filtres</button>}
      </div>
      <div className="resource-list">{filtered.map((article) => (
        <Link href={`/ressources/${article.slug}`} className="resource-row" key={article.slug}>
          <span className="resource-thumb" aria-hidden="true"><Image src={articleCover(article.slug).src} alt="" width={400} height={250} sizes="(max-width: 760px) 100vw, 220px" /></span>
          <div className="resource-body">
            <span className="resource-meta">{article.category}<span>{article.minutes} min de lecture</span></span>
            <h2>{article.title}</h2>
            <p>{article.description}</p>
          </div>
          <IconArrowRight size={22} />
        </Link>
      ))}</div>
      {!filtered.length && <div className="library-empty"><h2>Aucun guide trouvé.</h2><p>Essaie un autre thème ou un mot plus court.</p><button className="public-button button-outline" onClick={() => { setQuery(""); setCategory(""); }}>Effacer les filtres</button></div>}
    </section>
  );
}
