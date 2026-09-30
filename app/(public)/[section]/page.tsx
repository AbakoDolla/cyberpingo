import Link from "next/link";
import { notFound } from "next/navigation";
import { informationPages } from "@/data/public-content";
import { publicFaq } from "@/data/landing";
import ContactForm from "@/components/public/ContactForm";

const specialTitles: Record<string, string> = { faq: "Les réponses avant de commencer.", contact: "Un retour peut tout améliorer." };
export const dynamicParams = false;
export function generateStaticParams() { return [...Object.keys(informationPages), "faq", "contact"].map((section) => ({ section })); }
export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return { title: informationPages[section]?.title ?? specialTitles[section] ?? "Page introuvable" };
}

const faqExtras = [
  { question: "Mes progrès suivent-ils mon compte sur un autre appareil ?", answer: "Oui. Ta progression, tes scores et tes badges sont enregistrés sur ton compte CyberPingo : reconnecte-toi sur n’importe quel appareil pour les retrouver." },
  { question: "Puis-je refaire un quiz ?", answer: "Oui. Ton meilleur score est conservé. Les XP supplémentaires correspondent uniquement à l’amélioration de ce score. Un quiz compte comme validé à partir de 70 %." },
  { question: "Que devient mon message de contact ?", answer: "Il est transmis à l’équipe CyberPingo, qui le consulte depuis son espace d’administration. Ajoute ton e-mail si tu souhaites une réponse, et n’y mets jamais de mot de passe ni d’information sensible." },
  { question: "Comment supprimer mon compte ?", answer: "Dans Paramètres, la zone « Supprimer mon compte » efface définitivement ton compte et toute ta progression." },
];

export default async function InformationPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: slug } = await params;
  const page = Object.hasOwn(informationPages, slug) ? informationPages[slug] : undefined;
  const title = page?.title ?? (Object.hasOwn(specialTitles, slug) ? specialTitles[slug] : undefined);
  if (!title) notFound();
  return <div className="public-container inner-page">
    <header className="page-heading"><h1>{title}</h1><p>{page?.introduction ?? (slug === "faq" ? "Parcours, comptes, XP et données : voici comment fonctionne CyberPingo." : "Signale un problème ou propose une idée : ton message arrive directement à l’équipe.")}</p></header>
    {page && <div className="info-sections">{page.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><div><p>{section.text}</p>{section.href && <Link className="inline-link" href={section.href}>{section.link} →</Link>}</div></section>)}</div>}
    {slug === "faq" && <div className="standalone-faq faq-questions">{[...publicFaq, ...faqExtras].map((item) => <details key={item.question}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div>}
    {slug === "contact" && <div className="reading-layout"><ContactForm /><aside className="reading-aside"><h2>Un retour public ?</h2><p>Les problèmes du projet peuvent aussi être décrits dans les issues GitHub. Un compte GitHub est requis.</p><a className="inline-link" href="https://github.com/AbakoDolla/cyberpingo/issues" target="_blank" rel="noreferrer">Ouvrir les issues GitHub ↗</a><p>Pour une urgence ou un incident réel, contacte le support de ton organisation. Cette page n’est pas un service de réponse à incident.</p></aside></div>}
    <div className="page-next"><h2>Un petit pas aujourd’hui.</h2><Link className="public-button button-primary" href="/parcours">Trouver mon parcours</Link></div>
  </div>;
}
