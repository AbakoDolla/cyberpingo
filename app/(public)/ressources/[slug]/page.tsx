import Link from "next/link";
import { notFound } from "next/navigation";
import { articles } from "@/data/public-content";
export const dynamicParams = false;
export function generateStaticParams() { return articles.map((article) => ({ slug: article.slug })); }
export function generateMetadata({ params }: { params: { slug: string } }) {
  const article = articles.find((item) => item.slug === params.slug);
  return { title: article?.title ?? "Guide introuvable", description: article?.description };
}
export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = articles.find((item) => item.slug === params.slug);
  if (!article) notFound();
  return <div className="public-container inner-page">
    <Link href="/ressources" className="back-link">← Tous les guides</Link>
    <header className="page-heading"><h1>{article.title}</h1><p>{article.description}</p><div className="page-facts"><span>{article.category}</span><span>{article.minutes} min de lecture</span></div></header>
    <div className="reading-layout"><article className="editorial-content">{article.sections.map((section, index) => <section id={`partie-${index + 1}`} key={section.title}><h2>{section.title}</h2><p>{section.text}</p>{section.checklist && <ul>{section.checklist.map((item) => <li key={item}>{item}</li>)}</ul>}</section>)}<section><h2>Pour approfondir</h2><a href={article.source.url} className="inline-link" target="_blank" rel="noreferrer">{article.source.label} ↗</a><p>Ce guide est pédagogique. En cas d’incident professionnel, suis les procédures de ton organisation.</p></section></article>
      <aside className="reading-aside"><nav aria-label="Sommaire du guide"><h2>Dans ce guide</h2>{article.sections.map((section, index) => <a key={section.title} href={`#partie-${index + 1}`}>{section.title}</a>)}</nav><Link className="public-button button-outline" href={`/parcours/${article.courseSlug}`}>Passer à la pratique</Link></aside>
    </div>
  </div>;
}
