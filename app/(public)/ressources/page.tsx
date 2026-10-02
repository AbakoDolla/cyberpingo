import Image from "next/image";
import ResourceLibrary from "@/components/public/ResourceLibrary";
import { articles } from "@/data/public-content";
export const metadata = { title: "Guides et ressources", description: "Des guides pratiques en français pour protéger ses comptes, repérer le phishing et apprendre avec méthode." };
export default function ResourcesPage() {
  const categories = new Set(articles.map((article) => article.category));
  return <div className="public-container inner-page">
    <header className="page-hero">
      <Image className="page-hero__image" src="/images/resources/hero.webp" alt="Une bibliothèque de guides, un cadenas et Pingo qui lit un livre." fill priority sizes="(max-width: 1100px) 100vw, 1392px" />
      <div className="page-hero__shade" aria-hidden="true" />
      <div className="page-hero__copy">
        <p className="page-hero__kicker">Ressources</p>
        <h1>Des repères.<br /><span>Pas du jargon.</span></h1>
        <p>Des guides courts, sourcés et applicables sans connexion pour mieux protéger tes comptes, tes fichiers et tes analyses.</p>
        <dl className="page-hero__stats" aria-label="Résumé des ressources">
          <div><dt>Guides</dt><dd>{articles.length}</dd></div>
          <div><dt>Thèmes</dt><dd>{categories.size}</dd></div>
          <div><dt>Lecture</dt><dd>Libre</dd></div>
        </dl>
      </div>
    </header>
    <ResourceLibrary />
  </div>;
}
