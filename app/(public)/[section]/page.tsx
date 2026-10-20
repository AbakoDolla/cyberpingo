import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { informationPages } from "@/data/public-content";
import { publicFaq } from "@/data/landing";
import ContactForm from "@/components/public/ContactForm";
import PingoIntroPlayer from "@/components/public/PingoIntroPlayer";
import { IconChevronDown } from "@/components/ui/Icon";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildPageMetadata } from "@/lib/seo";

const specialTitles: Record<string, string> = { faq: "Les réponses avant de commencer.", contact: "Un retour peut tout améliorer." };
const specialDescriptions: Record<string, string> = {
  faq: "Parcours, comptes, XP et données : voici comment fonctionne CyberPingo.",
  contact: "Signale un problème ou propose une idée : ton message arrive directement à l’équipe.",
};
export const dynamicParams = false;
export function generateStaticParams() { return [...Object.keys(informationPages), "faq", "contact"].map((section) => ({ section })); }
export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  const page = informationPages[section];
  const title = page?.title ?? specialTitles[section];
  const description = page?.introduction ?? specialDescriptions[section];
  if (!title || !description) return { title: "Page introuvable", robots: { index: false, follow: false } };
  return buildPageMetadata({
    title,
    description,
    path: `/${section}`,
    image: page?.hero?.src,
    imageAlt: page?.hero?.alt ?? title,
  });
}

const faqExtras = [
  { question: "Mes progrès suivent-ils mon compte sur un autre appareil ?", answer: "Oui. Ta progression, tes scores et tes badges sont enregistrés sur ton compte CyberPingo : reconnecte-toi sur n’importe quel appareil pour les retrouver." },
  { question: "Puis-je refaire un quiz ?", answer: "Oui. Ton meilleur score est conservé. Les XP supplémentaires correspondent uniquement à l’amélioration de ce score. Un quiz compte comme validé à partir de 70 %." },
  { question: "Que devient mon message de contact ?", answer: "Il est transmis à l’équipe CyberPingo, qui le consulte depuis son espace d’administration. Ajoute ton e-mail si tu souhaites une réponse, et n’y mets jamais de mot de passe ni d’information sensible." },
  { question: "Comment supprimer mon compte ?", answer: "Dans Paramètres, la zone « Supprimer mon compte » efface définitivement ton compte et toute ta progression." },
];

const heroActions: Record<string, { kicker: string; primary: { href: string; label: string }; secondary: { href: string; label: string } }> = {
  fonctionnalites: { kicker: "Fonctionnalités", primary: { href: "/parcours", label: "Explorer les programmes" }, secondary: { href: "/register", label: "Créer mon compte" } },
  "a-propos": { kicker: "À propos", primary: { href: "/fonctionnalites", label: "Voir ce qui est disponible" }, secondary: { href: "/faq", label: "Lire la FAQ" } },
};

export default async function InformationPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: slug } = await params;
  const page = Object.hasOwn(informationPages, slug) ? informationPages[slug] : undefined;
  const title = page?.title ?? (Object.hasOwn(specialTitles, slug) ? specialTitles[slug] : undefined);
  if (!title) notFound();
  const hero = page?.hero;
  const actions = heroActions[slug];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Accueil", path: "/" },
    { name: title, path: `/${slug}` },
  ]);
  const faqJsonLd = slug === "faq" ? buildFaqJsonLd([...publicFaq, ...faqExtras]) : null;
  return <div className="public-container inner-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
    {hero && page ? <header className="page-hero">
      <Image className="page-hero__image" src={hero.src} alt={hero.alt} fill priority sizes="(max-width: 1100px) 100vw, 1392px" />
      <div className="page-hero__shade" aria-hidden="true" />
      <div className="page-hero__copy">
        {actions && <p className="page-hero__kicker">{actions.kicker}</p>}
        <h1>{title}</h1>
        <p>{page.introduction}</p>
        {actions && <div className="page-actions"><Link className="public-button button-primary" href={actions.primary.href}>{actions.primary.label}</Link><Link className="public-button button-outline" href={actions.secondary.href}>{actions.secondary.label}</Link></div>}
      </div>
    </header> : <header className="page-heading"><h1>{title}</h1><p>{page?.introduction ?? specialDescriptions[slug]}</p></header>}
    {slug === "a-propos" && <PingoIntroPlayer />}
    {page && hero && <div className="feature-stack">{page.sections.map((section, index) => <article className="feature-card" key={section.title}>
      {section.image && <figure className="feature-card__media"><Image src={section.image.src} alt={section.image.alt} width={1000} height={640} sizes="(max-width: 900px) 100vw, 560px" /></figure>}
      <div className="feature-card__copy">
        <span className="feature-card__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <h2>{section.title}</h2>
        <p>{section.text}</p>
        {section.points && <ul className="feature-card__points">{section.points.map((point) => <li key={point}>{point}</li>)}</ul>}
        {section.href && <Link className="inline-link" href={section.href}>{section.link} →</Link>}
      </div>
    </article>)}</div>}
    {page && !hero && <div className="info-sections">{page.sections.map((section) => <section key={section.title}><h2>{section.title}</h2><div><p>{section.text}</p>{section.href && <Link className="inline-link" href={section.href}>{section.link} →</Link>}</div></section>)}</div>}
    {slug === "faq" && <section className="standalone-faq faq-questions" aria-label="Questions fréquentes">{[...publicFaq, ...faqExtras].map((item) => <details key={item.question}><summary>{item.question}<IconChevronDown size={18} /></summary><p>{item.answer}</p></details>)}</section>}
    {slug === "contact" && <div className="reading-layout"><ContactForm /><aside className="reading-aside"><h2>Un retour public ?</h2><p>Les problèmes du projet peuvent aussi être décrits dans les issues GitHub. Un compte GitHub est requis.</p><a className="inline-link" href="https://github.com/AbakoDolla/cyberpingo/issues" target="_blank" rel="noreferrer">Ouvrir les issues GitHub ↗</a><p>Pour une urgence ou un incident réel, contacte le support de ton organisation. Cette page n’est pas un service de réponse à incident.</p></aside></div>}
    <div className="page-next"><div><h2>Un petit pas aujourd’hui.</h2><p>Crée ton compte pour enregistrer tes leçons, tes quiz et tes badges.</p></div><div className="page-actions"><Link className="public-button button-primary" href="/register">Créer mon compte</Link><Link className="public-button button-outline" href="/parcours">Voir les parcours</Link></div></div>
  </div>;
}
