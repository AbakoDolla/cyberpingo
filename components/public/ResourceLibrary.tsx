"use client";

import Link from "next/link";
import { useState } from "react";
import { articles } from "@/data/public-content";
import { IconArrowRight } from "@/components/ui/Icon";

export default function ResourceLibrary() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const filtered = articles.filter((article) => (!category || article.category === category) && `${article.title} ${article.description}`.toLocaleLowerCase("fr").includes(query.trim().toLocaleLowerCase("fr")));
  return (
    <>
      <div className="library-filters">
        <label>Rechercher un guide<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Comptes, sauvegardes, logs…" /></label>
        <label>Thème<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Tous les thèmes</option>{Array.from(new Set(articles.map((article) => article.category))).map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <p className="result-count" role="status">{filtered.length} guide{filtered.length > 1 ? "s" : ""} disponible{filtered.length > 1 ? "s" : ""}</p>
      <div className="resource-list">{filtered.map((article) => (
        <Link href={`/ressources/${article.slug}`} className="resource-row" key={article.slug}>
          <span className="resource-meta">{article.category}<span>{article.minutes} min de lecture</span></span>
          <div><h2>{article.title}</h2><p>{article.description}</p></div><IconArrowRight size={22} />
        </Link>
      ))}</div>
      {!filtered.length && <div className="library-empty"><h2>Aucun guide trouvé.</h2><p>Essaie un autre thème ou un mot plus court.</p><button className="public-button button-outline" onClick={() => { setQuery(""); setCategory(""); }}>Effacer les filtres</button></div>}
    </>
  );
}
