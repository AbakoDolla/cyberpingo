import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/ui/Badge";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { formatDuration, levelLabel } from "@/lib/format";
import { getCourseBySlug } from "@/services/courses.service";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const client = createSupabasePublicClient();
  if (!client) return { title: "Parcours" };
  try {
    const course = await getCourseBySlug(slug, client);
    return { title: course?.title ?? "Parcours introuvable", description: course?.short_description || course?.description };
  } catch {
    return { title: "Parcours" };
  }
}

export default async function CourseProgram({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = createSupabasePublicClient();
  if (!client) return <div className="public-container inner-page"><div className="library-empty"><h1>Catalogue indisponible.</h1><p>Le service Supabase n’est pas configuré sur ce déploiement.</p></div></div>;
  const course = await getCourseBySlug(slug, client);
  if (!course) notFound();
  const registerHref = `/register?next=/courses/${course.slug}`;
  const loginHref = `/login?next=/courses/${course.slug}`;
  return <div className="public-container inner-page">
    <Link className="back-link" href="/parcours">← Tous les parcours</Link>
    <header className="page-heading"><h1>{course.title}</h1><p>{course.description}</p><div className="page-facts"><span>{levelLabel(course.level)}</span><span>{formatDuration(course.estimated_duration)}</span><span>{course.lesson_count} leçons</span><span>{course.quiz_count} quiz</span></div></header>
    <div className="reading-layout">
      <section className="curriculum"><h2>Le programme</h2>{course.modules.length ? <ol>{course.modules.map((module) => <li key={module.id}><div><h3>{module.title}</h3>{module.description && <p>{module.description}</p>}<ul className="public-outline-list">{module.lessons.map((lesson) => <li key={lesson.id}><strong>{lesson.title}</strong><span>{formatDuration(lesson.duration_minutes)} · +{lesson.xp_reward} XP</span>{course.lesson_quizzes[lesson.id] && <Badge tone="purple">Quiz de leçon</Badge>}</li>)}{module.quizzes.map((quiz) => <li key={quiz.id}><strong>{quiz.title}</strong><span>Quiz de révision · validation à {quiz.pass_percentage} %</span></li>)}</ul></div></li>)}</ol> : <div className="library-empty"><p>Aucune leçon disponible pour le moment.</p></div>}</section>
      <aside className="course-enrol"><h2>Commencer ce parcours</h2><p>Crée un compte gratuit pour enregistrer tes leçons, tes scores et tes récompenses.</p><p>{course.certificate_enabled ? "Un certificat CyberPingo peut être généré lorsque le parcours est terminé." : "Ce parcours ne délivre pas de certificat."}</p><Link className="public-button button-primary" href={registerHref}>Commencer ce parcours</Link><Link className="back-link" href={loginHref}>J’ai déjà un compte</Link></aside>
    </div>
  </div>;
}