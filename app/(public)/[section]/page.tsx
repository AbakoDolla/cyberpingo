import Link from "next/link";
import { notFound } from "next/navigation";
import { informationPages } from "@/data/public-content";
import { publicFaq } from "@/data/landing";
import ContactForm from "@/components/public/ContactForm";

const specialTitles: Record<string, string> = { faq: "Les réponses avant de commencer.", contact: "Un retour peut tout améliorer." };
export const dynamicParams = false;
export function generateStaticParams() { return [...Object.keys(informationPages), "faq", "contact"].map((section) => ({ section })); }
export function generateMetadata({ params }: { params: { section: string } }) {
  return { title: informationPages[params.section]?.title ?? specialTitles[params.section] ?? "Page introuvable" };
}

export default function InformationPage({ params }: { params: { section: string } }) {
  const page = Object.hasOwn(informationPages, params.section) ? informationPages[params.section] : undefined;
  const title = page?.title ?? (Object.hasOwn(specialTitles, params.section) ? specialTitles[params.section] : undefined);
  if (!title) notFound();
  return <div className="public-container inner-page">
    <header className="page-heading"><h1>{title}</h1><p>{page?.introduction ?? (params.section === "faq" ? "Parcours, comptes, XP et données : voici comment fonctionne cette version." : "Signale un problème ou propose une idée. Ton brouillon reste sur ton appareil tant que tu ne le partages pas.")}</p></header>
    {page && <div className="info-sections">{page.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><div><p>{section.text}</p>{section.href && <Link className="inline-link" href={section.href}>{section.link} →</Link>}</div></section>)}</div>}
    {params.section === "faq" && <div className="standalone-faq faq-questions">{[...publicFaq, { question: "Mes progrès suivent-ils mon compte sur un autre appareil ?", answer: "Non. Le profil et la progression sont enregistrés dans ce navigateur. La déconnexion conserve le profil local, mais effacer les données du site le supprime. Tu peux télécharger une copie JSON dans les paramètres." }, { question: "Puis-je refaire un quiz ?", answer: "Oui. Ton meilleur score est conservé. Les XP supplémentaires correspondent uniquement à l’amélioration de ce score. Un quiz compte comme validé à partir de 70 %." }, { question: "Le formulaire de contact envoie-t-il un e-mail ?", answer: "Non, aucun service d’envoi n’est configuré. Il permet de préparer un brouillon texte. Le dépôt GitHub accueille les retours publics, sans information sensible." }].map((item) => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div>}
    {params.section === "contact" && <div className="reading-layout"><ContactForm /><aside className="reading-aside"><h2>Un retour public ?</h2><p>Les problèmes du projet peuvent être décrits dans les issues GitHub. Un compte GitHub est requis.</p><a className="inline-link" href="https://github.com/AbakoDolla/cyberpingo/issues" target="_blank" rel="noreferrer">Ouvrir les issues GitHub ↗</a><p>Pour une urgence ou un incident réel, contacte le support de ton organisation. Cette page n’est pas un service de réponse à incident.</p></aside></div>}
    <div className="page-next"><h2>Un petit pas aujourd’hui.</h2><Link className="public-button button-primary" href="/parcours">Trouver mon parcours</Link></div>
  </div>;
}
