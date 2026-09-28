import Link from "next/link";
import { notFound } from "next/navigation";
import { courses } from "@/data/courses";
import { levelLabels } from "@/lib/catalog";
import { quizzes } from "@/data/quizzes";

export const dynamicParams = false;
export function generateStaticParams() { return courses.map((course) => ({ slug: course.slug })); }
export function generateMetadata({ params }: { params: { slug: string } }) {
  const course = courses.find((item) => item.slug === params.slug);
  return { title: course?.title ?? "Parcours introuvable", description: course?.description };
}

export default function CourseProgram({ params }: { params: { slug: string } }) {
  const course = courses.find((item) => item.slug === params.slug);
  if (!course) notFound();
  const quizCount = course.lessons.filter((lesson) => quizzes.some((quiz) => quiz.id === lesson.quizId)).length;
  return <div className="public-container inner-page">
    <Link className="back-link" href="/parcours">← Tous les parcours</Link>
    <header className="page-heading"><h1>{course.title}</h1><p>{course.description}</p><div className="page-facts"><span>{levelLabels[course.level]}</span><span>{course.durationMinutes} min de lecture estimée</span><span>{quizCount} quiz</span></div></header>
    <div className="reading-layout">
      <section className="curriculum"><h2>Le programme</h2><ol>{course.lessons.map((lesson) => <li key={lesson.id}><div><h3>{lesson.title}</h3><p>{lesson.durationMinutes} min · {lesson.xpReward} XP{lesson.quizId ? " · Quiz de compréhension" : ""}</p><p>{lesson.blocks.find((block) => block.type === "text")?.content.slice(0, 190)}…</p></div></li>)}</ol></section>
      <aside className="course-enrol"><h2>À toi de jouer.</h2><p>{course.level === "debutant" ? "Aucun prérequis technique. Prends le temps d’assimiler les exemples." : "Commence par les fondamentaux et les réseaux pour profiter pleinement de ce parcours."}</p><p>Un profil local permet de conserver tes leçons et tes scores sur cet appareil. Aucun certificat accrédité n’est délivré.</p><Link className="public-button button-primary" href={`/courses/${course.slug}`}>Commencer le parcours</Link><Link className="back-link" href="/ressources">Lire les guides gratuits</Link></aside>
    </div>
  </div>;
}
