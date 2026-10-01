import ResourceLibrary from "@/components/public/ResourceLibrary";
export const metadata = { title: "Guides et ressources", description: "Des guides pratiques en français pour protéger ses comptes, repérer le phishing et apprendre avec méthode." };
export default function ResourcesPage() {
  return <div className="public-container inner-page"><header className="page-heading"><h1>Des repères.<br /><span>Pas du jargon.</span></h1><p>Des guides à lire, à partager et à mettre en pratique. Accessibles sans connexion.</p></header><ResourceLibrary /></div>;
}
