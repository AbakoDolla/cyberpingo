import SceneBanner from "@/components/art/SceneBanner";
import ResourceLibrary from "@/components/public/ResourceLibrary";
import { articles } from "@/data/public-content";
export const metadata = { title: "Guides et ressources", description: "Des guides pratiques en français pour protéger ses comptes, repérer le phishing et apprendre avec méthode." };
export default function ResourcesPage() {
  const categories = new Set(articles.map((article) => article.category));
  return <div className="public-container inner-page">
    <SceneBanner variant="library" anchor="end" className="page-heading page-heading--split">
      <div>
        <h1>Des repères.<br /><span>Pas du jargon.</span></h1>
        <p>Des guides courts, sourcés et applicables sans connexion pour mieux protéger tes comptes, tes fichiers et tes analyses.</p>
      </div>
      <aside className="page-heading-panel" aria-label="Résumé des ressources">
        <p>Bibliothèque ouverte</p>
        <dl>
          <div><dt>Guides</dt><dd>{articles.length}</dd></div>
          <div><dt>Thèmes</dt><dd>{categories.size}</dd></div>
        </dl>
        <span>Lecture libre, puis passage à la pratique dans les parcours.</span>
      </aside>
    </SceneBanner>
    <ResourceLibrary />
  </div>;
}
