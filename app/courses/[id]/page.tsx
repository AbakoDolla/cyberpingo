"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { IconBolt, IconCertificate, IconCheck, IconClock, IconLesson, IconLock, IconTrophy } from "@/components/ui/Icon";
import { useLearner } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { formatDuration, levelLabel } from "@/lib/format";
import {
  enrollInCourse, getCourseBySlug, getMyCourseProgress, listMyLessonProgress, listMyQuizResults, orderedLessons,
} from "@/services/courses.service";
import type { CourseProgress, CourseDetail, LessonStatus } from "@/types/api";

const statusCopy: Record<LessonStatus, { label: string; tone: "green" | "blue" | "neutral" }> = {
  completed: { label: "Terminée", tone: "green" },
  in_progress: { label: "En cours", tone: "blue" },
  not_started: { label: "À faire", tone: "neutral" },
};

type QuizResults = Awaited<ReturnType<typeof listMyQuizResults>>;
type CoursePageData = {
  course: CourseDetail | null;
  progress: CourseProgress | null;
  lessons: Awaited<ReturnType<typeof listMyLessonProgress>>;
  quizResults: QuizResults;
};

function quizSummary(results: QuizResults, quizId: string) {
  const result = results[quizId];
  if (!result) return "Aucune tentative";
  return `${result.best_percentage} % · ${result.passed ? "validé" : "à revoir"} · ${result.attempts} tentative${result.attempts > 1 ? "s" : ""}`;
}

function nextUncompletedLesson(course: CourseDetail, completed: Set<string>) {
  return orderedLessons(course).find((lesson) => !completed.has(lesson.id)) ?? null;
}

function CourseDetailView() {
  const params = useParams<{ id: string }>();
  const slug = params.id;
  const { profile, isStaff } = useLearner();
  const [enrolling, setEnrolling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, loading, reload, setData } = useAsync(async (): Promise<CoursePageData> => {
    const course = await getCourseBySlug(slug);
    if (!course) return { course: null, progress: null, lessons: [], quizResults: {} as QuizResults };
    const [progress, lessons, quizResults] = await Promise.all([
      getMyCourseProgress(profile.id, course.id),
      listMyLessonProgress(profile.id, course.id),
      listMyQuizResults(profile.id, course.id),
    ]);
    return { course, progress, lessons, quizResults };
  }, [slug, profile.id]);

  const lessonProgress = useMemo(() => new Map((data?.lessons ?? []).map((item) => [item.lesson_id, item])), [data?.lessons]);
  const completedLessons = useMemo(() => new Set((data?.lessons ?? []).filter((item) => item.status === "completed").map((item) => item.lesson_id)), [data?.lessons]);

  async function enroll(courseId: string) {
    setEnrolling(true);
    setActionError(null);
    try {
      const progress = await enrollInCourse(courseId);
      setData((current) => current ? { ...current, progress } : current);
    } catch (cause) {
      setActionError(errorMessage(cause, "L’inscription au parcours a échoué."));
    } finally {
      setEnrolling(false);
    }
  }

  const course = data?.course ?? null;
  const progressValue = Math.round(data?.progress?.progress_percentage ?? 0);
  const nextLesson = course ? nextUncompletedLesson(course, completedLessons) : null;
  const canPreview = course?.status === "draft" && isStaff;
  const canContinue = Boolean(nextLesson && (data?.progress || canPreview));

  return (
    <>
      <main className="study-page course-detail-page">
        <Link href="/courses" className="study-link">← Tous les cours</Link>
        {loading && <div className="study-empty" role="status"><h1>Chargement du parcours…</h1></div>}
        {error && !loading && <div className="study-empty" role="alert"><h1>Impossible de charger ce parcours.</h1><p>{error.message}</p><Button variant="secondary" onClick={() => void reload()}>Réessayer</Button></div>}
        {!loading && !error && data && !course && <div className="study-empty"><h1>Parcours introuvable.</h1><p>Il n’est peut-être pas publié ou tu n’y as pas accès.</p></div>}
        {!loading && !error && data && course && (
          <>
            {course.status === "draft" && <div className="learning-banner learning-banner--preview">Aperçu brouillon : seuls les membres de l’équipe peuvent ouvrir ce parcours. Aucun XP ne sera accordé.</div>}
            {course.status === "archived" && <div className="learning-banner">Ce parcours est archivé. Tu peux le consulter si tu étais déjà inscrit, mais il n’apparaît plus dans le catalogue public.</div>}
            <header className="course-detail-hero">
              <div>
                <div className="course-detail-hero__badges">
                  <Badge tone="blue">{levelLabel(course.level)}</Badge>
                  <Badge tone="neutral">{course.category}</Badge>
                  <Badge tone={course.access_level === "free" ? "green" : "purple"}>{course.access_level === "free" ? "Gratuit" : course.access_level}</Badge>
                </div>
                <h1>{course.title}</h1>
                <p>{course.description}</p>
              </div>
              <aside className="course-detail-hero__panel">
                <span><IconClock size={16} /> {formatDuration(course.estimated_duration)}</span>
                <span><IconLesson size={16} /> {course.module_count} modules · {course.lesson_count} leçons</span>
                <span><IconBolt size={16} /> {course.quiz_count} quiz · +{course.completion_xp} XP de fin</span>
                <span><IconCertificate size={16} /> {course.certificate_enabled ? "Certificat activé" : "Sans certificat"}</span>
              </aside>
            </header>

            <section className="course-progress-card" aria-label="Progression du parcours">
              <div><h2>{data.progress ? "Ta progression" : "Inscription"}</h2><p>{data.progress ? `${data.progress.completed_lessons} leçons terminées sur ${data.progress.total_lessons}.` : "Inscris-toi gratuitement pour enregistrer tes leçons, quiz et récompenses."}</p></div>
              <div className="course-progress-card__bar"><strong>{progressValue} %</strong><ProgressBar value={progressValue} tone="green" /></div>
              <div className="study-actions">
                {!data.progress && course.status === "published" && course.access_level === "free" && <Button variant="success" onClick={() => void enroll(course.id)} loading={enrolling}>S’inscrire gratuitement</Button>}
                {canContinue && <Link className="study-button" href={`/lessons/${nextLesson?.id}`}>Continuer</Link>}
                {!nextLesson && data.progress && <Badge tone="green"><IconTrophy size={13} /> Parcours terminé</Badge>}
              </div>
              {actionError && <p className="settings-status is-error" role="alert">{actionError}</p>}
            </section>

            <section className="module-outline" aria-labelledby="modules-title">
              <h2 id="modules-title">Programme du parcours</h2>
              {course.modules.length === 0 ? <div className="study-empty"><p>Aucune leçon disponible pour le moment.</p></div> : course.modules.map((module) => (
                <article key={module.id} className="module-outline__module">
                  <div className="module-outline__module-head"><h3>{module.title}</h3>{module.description && <p>{module.description}</p>}</div>
                  <ol>
                    {module.lessons.map((lesson) => {
                      const progress = lessonProgress.get(lesson.id);
                      const state = progress?.status ?? "not_started";
                      const quiz = course.lesson_quizzes[lesson.id];
                      return (
                        <li key={lesson.id}>
                          <Link href={`/lessons/${lesson.id}`} className="module-outline__lesson">
                            <span className={`module-outline__status is-${state}`}>{state === "completed" ? <IconCheck size={14} /> : <IconLock size={13} />}</span>
                            <span><strong>{lesson.title}</strong><small>{lesson.summary || `${formatDuration(lesson.duration_minutes)} · +${lesson.xp_reward} XP`}</small></span>
                            <Badge tone={statusCopy[state].tone}>{statusCopy[state].label}</Badge>
                          </Link>
                          {quiz && <Link href={`/quiz/${quiz.id}`} className="module-outline__quiz">Quiz de leçon : {quiz.title}<span>{quizSummary(data.quizResults, quiz.id)}</span></Link>}
                        </li>
                      );
                    })}
                  </ol>
                  {module.quizzes.length > 0 && <div className="module-outline__reviews"><h4>Quiz de révision</h4>{module.quizzes.map((quiz) => <Link key={quiz.id} href={`/quiz/${quiz.id}`}>{quiz.title}<span>{quizSummary(data.quizResults, quiz.id)}</span></Link>)}</div>}
                </article>
              ))}
            </section>
          </>
        )}
      </main>
    </>
  );
}

/** AppShell gates rendering on a loaded profile, so the view can call useLearner() safely. */
export default function CourseDetailPage() {
  return <AppShell><CourseDetailView /></AppShell>;
}
