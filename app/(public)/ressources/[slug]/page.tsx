import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articleCover, articles } from "@/data/public-content";
export const dynamicParams = false;
export function generateStaticParams() { return articles.map((article) => ({ slug: article.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);
  return { title: article?.title ?? "Guide introuvable", description: article?.description };
}
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles.find((item) => item.slug === slug);
  if (!article) notFound();
  return <div className="public-container inner-page">
    <Link href="/ressources" className="back-link">← Tous les guides</Link>
    <header className="page-heading page-heading--article page-heading--cover">
      <div className="article-head__copy"><h1>{article.title}</h1><p>{article.description}</p><div className="page-facts"><span>{article.category}</span><span>{article.minutes} min de lecture</span></div></div>
      <figure className="article-cover" aria-hidden="true"><Image src={articleCover(article.slug).src} alt="" width={800} height={500} sizes="(max-width: 900px) 100vw, 420px" priority /></figure>
    </header>
    <div className="reading-layout"><article className="editorial-content">{article.sections.map((section, index) => <section id={`partie-${index + 1}`} key={section.title}><h2>{section.title}</h2><p>{section.text}</p>{section.checklist && <ul aria-label={`À vérifier : ${section.title}`}>{section.checklist.map((item) => <li key={item}>{item}</li>)}</ul>}</section>)}<section className="source-section"><h2>Pour approfondir</h2><a href={article.source.url} className="inline-link" target="_blank" rel="noreferrer">{article.source.label} ↗</a><p>Ce guide est pédagogique. En cas d’incident professionnel, suis les procédures de ton organisation.</p></section></article>
      <aside className="reading-aside"><nav aria-label="Sommaire du guide"><h2>Dans ce guide</h2>{article.sections.map((section, index) => <a key={section.title} href={`#partie-${index + 1}`}>{section.title}</a>)}</nav><Link className="public-button button-outline" href={`/parcours/${article.courseSlug}`}>Passer à la pratique</Link></aside>
    </div>
  </div>;
}
