import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/ui/Badge";
import ReloadButton from "@/components/public/ReloadButton";
import { errorMessage } from "@/lib/errors";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { formatDuration, levelLabel, plural } from "@/lib/format";
import { getCourseBySlug } from "@/services/courses.service";
import type { CourseDetail } from "@/types/api";

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
  if (!client) return <div className="public-container inner-page"><section className="public-state public-state--warning"><h1>Parcours indisponible.</h1><p>Le service Supabase n’est pas configuré sur ce déploiement. Le programme ne peut pas être lu.</p></section></div>;
  let course: CourseDetail | null;
  try {
    course = await getCourseBySlug(slug, client);
  } catch (error) {
    return <div className="public-container inner-page"><Link className="back-link" href="/parcours">← Tous les parcours</Link><section className="public-state public-state--error"><h1>Parcours indisponible.</h1><p>{errorMessage(error, "Impossible de charger ce parcours pour le moment.")}</p><ReloadButton /></section></div>;
  }
  if (!course) notFound();
  const registerHref = `/register?next=/courses/${course.slug}`;
  const loginHref = `/login?next=/courses/${course.slug}`;
  const lessonTotal = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const moduleQuizTotal = course.modules.reduce((sum, module) => sum + module.quizzes.length, 0);
  return <div className="public-container inner-page">
    <Link className="back-link" href="/parcours">← Tous les parcours</Link>
    <header className="page-heading page-heading--course">
      <div>
        <h1>{course.title}</h1>
        <p>{course.description}</p>
        <div className="page-facts"><span>{levelLabel(course.level)}</span><span>{formatDuration(course.estimated_duration)}</span><span>{course.module_count} {plural(course.module_count, "module")}</span><span>{course.lesson_count} {plural(course.lesson_count, "leçon")}</span><span>{course.quiz_count} quiz</span></div>
      </div>
    </header>
    <div className="reading-layout">
      <section className="curriculum" aria-labelledby="course-outline-title">
        <div className="section-heading-row"><h2 id="course-outline-title">Le programme complet</h2><p>{lessonTotal} {plural(lessonTotal, "leçon")} et {moduleQuizTotal} {plural(moduleQuizTotal, "quiz", "quiz")} de module listés avant inscription.</p></div>
        {course.modules.length ? <ol>{course.modules.map((module) => (
          <li key={module.id}>
            <div className="module-heading">
              <h3>{module.title}</h3>
              <span>{module.lessons.length} leçon{module.lessons.length > 1 ? "s" : ""}</span>
            </div>
            {module.description && <p>{module.description}</p>}
            <ul className="public-outline-list">
              {module.lessons.map((lesson) => <li key={lesson.id}><div><strong>{lesson.title}</strong>{lesson.summary && <p>{lesson.summary}</p>}</div><span>{formatDuration(lesson.duration_minutes)} · +{lesson.xp_reward} XP</span>{course.lesson_quizzes[lesson.id] && <Badge tone="purple">Quiz de leçon</Badge>}</li>)}
              {module.quizzes.map((quiz) => <li key={quiz.id}><div><strong>{quiz.title}</strong>{quiz.description && <p>{quiz.description}</p>}</div><span>Quiz de révision · validation à {quiz.pass_percentage} %</span></li>)}
            </ul>
          </li>
        ))}</ol> : <div className="library-empty"><p>Aucune leçon disponible pour le moment.</p></div>}
      </section>
      <aside className="course-enrol">
        <h2>Commencer ce parcours</h2>
        <p>Crée un compte gratuit pour enregistrer tes leçons, tes scores, tes badges et tes certificats quand ils sont disponibles.</p>
        <dl>
          <div><dt>Niveau</dt><dd>{levelLabel(course.level)}</dd></div>
          <div><dt>Durée estimée</dt><dd>{formatDuration(course.estimated_duration)}</dd></div>
          <div><dt>Certificat</dt><dd>{course.certificate_enabled ? "Disponible en fin de parcours" : "Non prévu pour ce parcours"}</dd></div>
          {course.completion_xp > 0 && <div><dt>Bonus de fin</dt><dd>+{course.completion_xp} XP</dd></div>}
        </dl>
        <Link className="public-button button-primary" href={registerHref}>Commencer ce parcours</Link>
        <Link className="back-link" href={loginHref}>J’ai déjà un compte</Link>
      </aside>
    </div>
  </div>;
}