"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import CourseArt from "@/components/art/CourseArt";
import EmptyArt from "@/components/art/EmptyArt";
import AppShell, { loginHref } from "@/components/layout/AppShell";
import UnlockModal from "@/components/cyberbits/UnlockModal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { IconArrowRight, IconBolt, IconCertificate, IconCheck, IconClock, IconLesson, IconLock, IconTrophy } from "@/components/ui/Icon";
import { useUser } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { formatDuration, formatRelative, levelLabel, plural } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";
import { localizeCourseDetail, localizeLevel } from "@/lib/content-i18n";
import {
  enrollInCourse, getCourseBySlug, getMyCourseProgress, listMyLessonProgress, listMyQuizResults, orderedLessons,
} from "@/services/courses.service";
import type { CourseProgress, CourseDetail, LessonStatus } from "@/types/api";

type QuizResults = Awaited<ReturnType<typeof listMyQuizResults>>;
type CoursePageData = {
  course: CourseDetail | null;
  progress: CourseProgress | null;
  lessons: Awaited<ReturnType<typeof listMyLessonProgress>>;
  quizResults: QuizResults;
};

function quizSummary(results: QuizResults, quizId: string, isEn: boolean) {
  const result = results[quizId];
  if (!result) return isEn ? "No attempts" : "Aucune tentative";
  return `${result.best_percentage} % · ${result.passed ? (isEn ? "passed" : "validé") : (isEn ? "needs review" : "à revoir")} · ${result.attempts} ${isEn ? (result.attempts > 1 ? "attempts" : "attempt") : (result.attempts > 1 ? "tentatives" : "tentative")}`;
}

function nextUncompletedLesson(course: CourseDetail, completed: Set<string>) {
  return orderedLessons(course).find((lesson) => !completed.has(lesson.id)) ?? null;
}

function moduleProgress(courseModule: CourseDetail["modules"][number], completed: Set<string>) {
  const total = courseModule.lessons.length;
  const done = courseModule.lessons.filter((lesson) => completed.has(lesson.id)).length;
  return { done, total, value: total ? Math.round((done / total) * 100) : 0 };
}

function quizState(results: QuizResults, quizId: string): LessonStatus {
  const result = results[quizId];
  if (!result) return "not_started";
  return result.passed ? "completed" : "in_progress";
}

function CourseDetailView() {
  const params = useParams<{ id: string }>();
  const slug = params.id;
  const { profile, isStaff } = useUser();
  const { lang } = useTranslation();
  const isEn = lang === "en";
  const userId = profile?.id ?? null;
  const guest = !userId;
  const [enrolling, setEnrolling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const { data, error, loading, reload, setData } = useAsync(async (): Promise<CoursePageData> => {
    const course = await getCourseBySlug(slug);
    if (!course || !userId) return { course, progress: null, lessons: [], quizResults: {} as QuizResults };
    const [progress, lessons, quizResults] = await Promise.all([
      getMyCourseProgress(userId, course.id),
      listMyLessonProgress(userId, course.id),
      listMyQuizResults(userId, course.id),
    ]);
    return { course, progress, lessons, quizResults };
  }, [slug, userId]);

  const rawCourse = data?.course ?? null;
  const course = useMemo(() => (rawCourse ? localizeCourseDetail(rawCourse, lang) : null), [rawCourse, lang]);

  const statusCopy = useMemo(() => ({
    completed: { label: isEn ? "Completed" : "Terminée", tone: "green" as const },
    in_progress: { label: isEn ? "In progress" : "En cours", tone: "blue" as const },
    not_started: { label: isEn ? "To do" : "À faire", tone: "neutral" as const },
    locked: { label: isEn ? "Locked" : "Verrouillé", tone: "neutral" as const },
  }), [isEn]);

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

  const progressValue = Math.round(data?.progress?.progress_percentage ?? 0);
  const nextLesson = course ? nextUncompletedLesson(course, completedLessons) : null;
  const canPreview = course?.status === "draft" && isStaff;
  const canOpenContent = Boolean(data?.progress || canPreview);
  const canContinue = Boolean(nextLesson && canOpenContent);
  const coursePath = `/courses/${slug}`;
  const gated = (href: string) => (guest ? loginHref(coursePath) : canOpenContent ? href : null);

  return (
    <div className="study-page course-detail-page">
        <Link href="/courses" className="study-link">{isEn ? "← All courses" : "← Tous les cours"}</Link>
        {loading && <div className="study-empty" role="status"><h1>{isEn ? "Loading track…" : "Chargement du parcours…"}</h1></div>}
        {error && !loading && <div className="study-empty" role="alert"><h1>{isEn ? "Unable to load this track." : "Impossible de charger ce parcours."}</h1><p>{error.message}</p><Button variant="secondary" onClick={() => void reload()}>{isEn ? "Retry" : "Réessayer"}</Button></div>}
        {!loading && !error && data && !course && <div className="study-empty"><h1>{isEn ? "Track not found." : "Parcours introuvable."}</h1><p>{isEn ? "It may not be published or you may not have access." : "Il n’est peut-être pas publié ou tu n’y as pas accès."}</p></div>}
        {!loading && !error && data && course && (
          <>
            {course.status === "draft" && <div className="learning-banner learning-banner--preview">{isEn ? "Draft preview: only team members can view this track. No XP will be awarded." : "Aperçu brouillon : seuls les membres de l’équipe peuvent ouvrir ce parcours. Aucun XP ne sera accordé."}</div>}
            {course.status === "archived" && <div className="learning-banner">{isEn ? "This track is archived. You can access it if already enrolled, but it is no longer listed in the public catalog." : "Ce parcours est archivé. Tu peux le consulter si tu étais déjà inscrit, mais il n’apparaît plus dans le catalogue public."}</div>}
            <header className="course-detail-hero course-detail-hero--visual">
              <div className="course-detail-hero__visual">
                <div className="course-detail-hero__media" aria-hidden="true">
                  {course.thumbnail_url ? (
                    <Image
                      src={course.thumbnail_url}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 1100px) 100vw, 66vw"
                      className="course-detail-hero__image"
                    />
                  ) : (
                    <CourseArt slug={course.slug} category={course.category} className="course-detail-hero__art" photo sizes="(max-width: 1100px) 100vw, 66vw" priority />
                  )}
                </div>
                <div className="course-detail-hero__content">
                  <div className="course-detail-hero__badges">
                    <Badge tone="blue">{localizeLevel(course.level, lang)}</Badge>
                    <Badge tone="neutral">{course.category}</Badge>
                    <Badge tone={course.access_level === "free" ? "green" : "purple"}>{course.access_level === "free" ? (isEn ? "Free" : "Gratuit") : course.access_level}</Badge>
                  </div>
                  <h1>{course.title}</h1>
                  <p>{course.description}</p>
                  <div className="course-detail-hero__facts" aria-label={isEn ? "Key info" : "Informations clés"}>
                    <span><IconClock size={15} /> {formatDuration(course.estimated_duration)}</span>
                    <span><IconLesson size={15} /> {course.module_count} {isEn ? "modules" : plural(course.module_count, "module")} · {course.lesson_count} {isEn ? "lessons" : plural(course.lesson_count, "leçon")}</span>
                    <span><IconBolt size={15} /> {course.quiz_count} quiz · +{course.completion_xp} XP</span>
                  </div>
                  {data.progress && (
                    <div className="course-detail-hero__progress-inline" aria-label={isEn ? "Track progress" : "Progression du parcours"}>
                      <div><span>{isEn ? "Progress" : "Progression"}</span><strong>{progressValue} %</strong></div>
                      <ProgressBar value={progressValue} tone={data.progress.status === "completed" ? "green" : "blue"} height="sm" />
                    </div>
                  )}
                  {data.progress?.last_activity_at && <p className="course-detail-hero__activity">{isEn ? "Last activity" : "Dernière activité"} {formatRelative(data.progress.last_activity_at)}</p>}
                </div>
              </div>
              <aside className="course-detail-hero__panel">
                <span><IconClock size={16} /> {formatDuration(course.estimated_duration)}</span>
                <span><IconLesson size={16} /> {course.module_count} {isEn ? "modules" : plural(course.module_count, "module")} · {course.lesson_count} {isEn ? "lessons" : plural(course.lesson_count, "leçon")}</span>
                <span><IconBolt size={16} /> {course.quiz_count} quiz · +{course.completion_xp} {isEn ? "completion XP" : "XP de fin"}</span>
                <span><IconCertificate size={16} /> {course.certificate_enabled ? (isEn ? "Certificate included" : "Certificat activé") : (isEn ? "No certificate" : "Sans certificat")}</span>
              </aside>
            </header>

            <section className="course-progress-card" aria-label={isEn ? "Track progress" : "Progression du parcours"}>
              <div>
                <h2>{data.progress ? (isEn ? "Your progress" : "Ta progression") : guest ? (isEn ? "Start this track" : "Commence ce parcours") : (isEn ? "Enrollment" : "Inscription")}</h2>
                <p>{data.progress
                  ? (isEn
                      ? `${data.progress.completed_lessons} of ${data.progress.total_lessons} lessons completed.`
                      : `${data.progress.completed_lessons} ${plural(data.progress.completed_lessons, "leçon terminée", "leçons terminées")} sur ${data.progress.total_lessons}.`)
                  : guest
                    ? (isEn
                        ? "The syllabus is freely accessible. Sign in to track lessons, take quizzes, and earn XP."
                        : "Le programme est consultable librement. Connecte-toi pour suivre les leçons, passer les quiz et gagner tes XP.")
                    : (isEn
                        ? "Enroll for free to save your lesson progress, quizzes, and earn rewards."
                        : "Inscris-toi gratuitement pour enregistrer tes leçons, quiz et récompenses.")}</p>
                {nextLesson && <p className="course-progress-card__next">{isEn ? "Next step : " : "Prochaine étape : "}<strong>{nextLesson.title}</strong></p>}
              </div>
              <div className="course-progress-card__bar"><strong>{progressValue} %</strong><ProgressBar value={progressValue} tone="green" label={isEn ? "Track progress" : "Progression du parcours"} /></div>
              <div className="study-actions">
                {guest && course.status === "published" && <>
                  <Link className="study-button" href={loginHref(coursePath)}>{isEn ? "Sign in to start" : "Se connecter pour commencer"}</Link>
                  <Link className="study-button study-button--ghost" href="/register">{isEn ? "Create free account" : "Créer un compte gratuit"}</Link>
                </>}
                {!guest && !data.progress && course.status === "published" && course.access_level === "free" && (
                  (course.cb_price ?? (course.level === "avance" ? 250 : course.level === "intermediaire" ? 120 : 0)) > 0 ? (
                    <Button variant="primary" onClick={() => setUnlockModalOpen(true)}>
                      {isEn ? "Unlock track" : "Débloquer le parcours"} ({(course.cb_price ?? (course.level === "avance" ? 250 : course.level === "intermediaire" ? 120 : 0))} CB)
                    </Button>
                  ) : (
                    <Button variant="success" onClick={() => void enroll(course.id)} loading={enrolling}>
                      {isEn ? "Enroll for free" : "S’inscrire gratuitement"}
                    </Button>
                  )
                )}
                {canContinue && <Link className="study-button" href={`/lessons/${nextLesson?.id}`}>{data.progress && data.progress.completed_lessons > 0 ? (isEn ? "Continue" : "Continuer") : (isEn ? "Start" : "Commencer")}<IconArrowRight size={15} /></Link>}
                {!nextLesson && data.progress && (
                  <>
                    <Badge tone="green"><IconTrophy size={13} /> {isEn ? "Track completed" : "Parcours terminé"}</Badge>
                    <Link className="study-button" href={`/courses/${slug}/examen`}>
                      {isEn ? "Final exam" : "Examen final"} <IconArrowRight size={15} />
                    </Link>
                  </>
                )}
              </div>
              {actionError && (
                <div className="settings-status is-error flex items-center justify-between gap-3" role="alert">
                  <span>{actionError}</span>
                  {actionError.includes("CyberBits") && (
                    <Button variant="secondary" size="sm" onClick={() => setUnlockModalOpen(true)}>
                      {isEn ? "Unlock with my CB" : "Débloquer avec mes CB"}
                    </Button>
                  )}
                </div>
              )}
            </section>

            {data.progress && data.progress.status === "completed" && (
              <section className="p-6 rounded-2xl bg-gradient-to-r from-cyber-surface via-[#091b36] to-cyber-surface border border-cyber-cyan/40 my-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="p-3 rounded-xl bg-cyber-cyan/15 text-cyber-cyan border border-cyber-cyan/30">
                    <IconCertificate size={28} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">{isEn ? "Final Certification Exam" : "Examen final de certification"}</h3>
                    <p className="text-xs text-cyber-muted">{isEn ? "25 questions · 40 minutes · 70% passing score required to obtain your official certificate." : "25 questions · 40 minutes · Score minimum de 70 % requis pour décrocher le certificat officiel."}</p>
                  </div>
                </div>
                <Link href={`/courses/${slug}/examen`} className="study-button study-button--sm">
                  {isEn ? "Access final exam" : "Accéder à l’examen final"} <IconArrowRight size={14} />
                </Link>
              </section>
            )}

            <section className="course-outline" aria-labelledby="modules-title">
              <h2 id="modules-title">{isEn ? "Track syllabus" : "Programme du parcours"}</h2>
              {course.modules.length === 0 ? <div className="study-empty"><EmptyArt kind="courses" /><p>{isEn ? "No lessons available at this time." : "Aucune leçon disponible pour le moment."}</p></div> : course.modules.map((module) => {
                const moduleStats = moduleProgress(module, completedLessons);
                return (
                <article key={module.id} className="course-outline__module">
                  <div className="course-outline__module-head">
                    <div>
                      <h3>{module.title}</h3>
                      {module.description && <p>{module.description}</p>}
                    </div>
                    <div className="course-outline__module-progress">
                      <span>{moduleStats.done} / {moduleStats.total} {isEn ? "lessons" : "leçons"}</span>
                      <ProgressBar value={moduleStats.value} tone="green" height="sm" label={isEn ? `Progress for module ${module.title}` : `Progression du module ${module.title}`} />
                    </div>
                  </div>
                  <ol>
                    {module.lessons.map((lesson) => {
                      const progress = lessonProgress.get(lesson.id);
                      const rawState = progress?.status ?? "not_started";
                      const state: LessonStatus | "locked" = canOpenContent ? rawState : "locked";
                      const quiz = course.lesson_quizzes[lesson.id];
                      const href = gated(`/lessons/${lesson.id}`);
                      const lessonContent = (
                        <>
                          <span className={`course-outline__status is-${state}`}>{state === "completed" ? <IconCheck size={14} /> : state === "locked" ? <IconLock size={13} /> : <IconLesson size={13} />}</span>
                          <span><strong>{lesson.title}</strong><small>{lesson.summary || `${formatDuration(lesson.duration_minutes)} · +${lesson.xp_reward} XP`}</small></span>
                          <Badge tone={statusCopy[state].tone}>{state === "locked" ? guest ? `+${lesson.xp_reward} XP` : (isEn ? "Enrollment required" : "Inscription requise") : statusCopy[state].label}</Badge>
                        </>
                      );
                      return (
                        <li key={lesson.id}>
                          {href ? <Link href={href} className="course-outline__lesson">{lessonContent}</Link> : <div className="course-outline__lesson is-locked" aria-disabled="true">{lessonContent}</div>}
                          {quiz && (() => {
                            const quizHref = gated(`/quiz/${quiz.id}`);
                            const state = canOpenContent ? quizState(data.quizResults, quiz.id) : "locked";
                            const content = <>{isEn ? "Lesson quiz : " : "Quiz de leçon : "}{quiz.title}<span>{state === "locked" ? guest ? (isEn ? "Login required" : "Connexion requise") : (isEn ? "Enrollment required" : "Inscription requise") : quizSummary(data.quizResults, quiz.id, isEn)}</span></>;
                            return quizHref ? <Link href={quizHref} className={`course-outline__quiz is-${state}`}>{content}</Link> : <div className={`course-outline__quiz is-${state}`} aria-disabled="true">{content}</div>;
                          })()}
                        </li>
                      );
                    })}
                  </ol>
                  {module.quizzes.length > 0 && <div className="course-outline__reviews"><h4>{isEn ? "Review quizzes" : "Quiz de révision"}</h4>{module.quizzes.map((quiz) => {
                    const quizHref = gated(`/quiz/${quiz.id}`);
                    const state = canOpenContent ? quizState(data.quizResults, quiz.id) : "locked";
                    const content = <>{quiz.title}<span>{state === "locked" ? guest ? (isEn ? "Login required" : "Connexion requise") : (isEn ? "Enrollment required" : "Inscription requise") : quizSummary(data.quizResults, quiz.id, isEn)}</span></>;
                    return quizHref ? <Link key={quiz.id} href={quizHref} className={`is-${state}`}>{content}</Link> : <div key={quiz.id} className={`is-${state}`} aria-disabled="true">{content}</div>;
                  })}</div>}
                </article>
              );})}
            </section>

            <UnlockModal
              open={unlockModalOpen}
              onClose={() => setUnlockModalOpen(false)}
              target={course ? {
                kind: "course",
                id: course.id,
                slug: course.slug,
                title: course.title,
                price: course.cb_price ?? (course.level === "avance" ? 250 : course.level === "intermediaire" ? 120 : 0),
                level: course.level,
                category: course.category,
              } : null}
              onSuccess={() => {
                void reload();
              }}
            />
          </>
        )}
    </div>
  );
}

/** Open to visitors: the programme is public, progress and actions require a session. */
export default function CourseDetailPage() {
  return <AppShell allowGuest><CourseDetailView /></AppShell>;
}
