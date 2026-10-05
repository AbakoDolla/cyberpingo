"use client";

import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import LessonBlockRenderer from "@/components/courses/LessonBlockRenderer";
import EquipmentBox from "@/components/equipment/EquipmentBox";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { IconCheck, IconClock, IconLesson, IconTrophy } from "@/components/ui/Icon";
import { useLearner, useUserActions } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { useTranslation } from "@/lib/i18n";
import { localizeLesson } from "@/lib/content-i18n";
import { errorMessage } from "@/lib/errors";
import { formatDuration } from "@/lib/format";
import { equipmentBoxes, type EquipmentBoxData } from "@/lib/lesson-equipment";
import { pendingVideoTitle } from "@/lib/lesson-content";
import { getLesson, getMyLessonProgress, saveLessonProgress, startLesson } from "@/services/lessons.service";
import type { LessonCompletion, LessonStart } from "@/types/api";

function sequenceAround(sequence: { id: string; title: string }[], lessonId: string) {
  const index = sequence.findIndex((item) => item.id === lessonId);
  return { index, previous: index > 0 ? sequence[index - 1] : null, next: index >= 0 ? sequence[index + 1] ?? null : null };
}

function LessonView() {
  const { lang, t } = useTranslation();
  const isEn = lang === "en";
  const params = useParams<{ id: string }>();
  const lessonId = params.id;
  const { profile } = useLearner();
  const { completeLesson } = useUserActions();
  const articleRef = useRef<HTMLElement | null>(null);
  const lastSavedPct = useRef(0);
  const lastSaveAt = useRef(0);
  const [startInfo, setStartInfo] = useState<LessonStart | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [readingPct, setReadingPct] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState<LessonCompletion | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsync(async () => {
    const rawLesson = await getLesson(lessonId);
    const lesson = rawLesson ? localizeLesson(rawLesson, lang) : null;
    const progress = lesson ? await getMyLessonProgress(profile.id, lesson.id) : null;
    return { lesson, progress };
  }, [lessonId, profile.id, lang]);

  const lesson = data?.lesson ?? null;
  const sequence = useMemo(() => lesson ? sequenceAround(lesson.sequence, lesson.id) : { index: -1, previous: null, next: null }, [lesson]);
  const equipmentAfter = useMemo(() => lesson ? equipmentBoxes(lesson.id, lesson.blocks) : new Map<number, EquipmentBoxData[]>(), [lesson]);
  const completed = Boolean(completion) || startInfo?.status === "completed" || data?.progress?.status === "completed";
  const preview = Boolean(startInfo?.preview || lesson?.course.status === "draft");
  const startMs = startInfo?.started_at ? new Date(startInfo.started_at).getTime() : startedAtMs;
  const minSeconds = startInfo?.min_seconds ?? 15;
  const remaining = completed || !startMs ? 0 : Math.max(0, minSeconds - Math.floor((now - startMs) / 1000));
  const nextLessonId = completion?.next_lesson_id ?? sequence.next?.id ?? null;
  const completionXp = completion && "xp_awarded" in completion ? completion.xp_awarded : 0;
  const alreadyCompleted = completion && "already_completed" in completion ? completion.already_completed : data?.progress?.status === "completed";

  useEffect(() => {
    if (!lesson) return;
    let active = true;
    const localStart = Date.now();
    setStartInfo(null);
    setStartedAtMs(localStart);
    setStartError(null);
    setSaveError(null);
    setCompletion(null);
    setCompletionError(null);
    setStarting(true);
    const storedPct = data?.progress?.progress_percentage ?? 0;
    setReadingPct(storedPct);
    lastSavedPct.current = storedPct;
    lastSaveAt.current = 0;
    void startLesson(lesson.id).then((info) => {
      if (!active) return;
      setStartInfo(info);
      setStartedAtMs(info.started_at ? new Date(info.started_at).getTime() : localStart);
      setReadingPct(info.progress_percentage ?? storedPct);
      lastSavedPct.current = info.progress_percentage ?? storedPct;
    }).catch((cause) => {
      if (active) setStartError(errorMessage(cause, "La leçon n’a pas pu être ouverte."));
    }).finally(() => { if (active) setStarting(false); });
    return () => { active = false; };
    // Start once per lesson; the stored progress is only a fallback for the first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  useEffect(() => {
    if (!startMs || completed) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [startMs, completed]);

  useEffect(() => {
    if (!lesson || !startInfo || preview || completed) return;
    const update = () => {
      const article = articleRef.current;
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const total = Math.max(1, article.offsetHeight - window.innerHeight * 0.7);
      const read = Math.min(total, Math.max(0, -rect.top + window.innerHeight * 0.35));
      const pct = Math.max(startInfo.progress_percentage ?? 0, Math.min(99, Math.round((read / total) * 100)));
      setReadingPct(pct);
      const crossedQuarter = pct >= lastSavedPct.current + 25;
      const nearEnd = pct >= 95 && lastSavedPct.current < 95;
      const spaced = Date.now() - lastSaveAt.current >= 10_000;
      if ((crossedQuarter || nearEnd) && spaced) {
        lastSavedPct.current = pct;
        lastSaveAt.current = Date.now();
        void saveLessonProgress(lesson.id, pct)
          .then(() => setSaveError(null))
          .catch((cause) => setSaveError(errorMessage(cause, "La progression de lecture n’a pas pu être enregistrée.")));
      }
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [lesson, startInfo, preview, completed]);

  async function finishLesson() {
    if (!lesson || remaining > 0) return;
    setSaving(true);
    setCompletionError(null);
    try {
      const result = await completeLesson(lesson.id);
      setCompletion(result);
      setReadingPct(100);
    } catch (cause) {
      setCompletionError(errorMessage(cause, "La leçon n’a pas pu être validée."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="study-page lesson-page">
        {loading && <div className="study-empty" role="status"><h1>{isEn ? "Loading lesson…" : "Chargement de la leçon…"}</h1></div>}
        {error && !loading && <div className="study-empty" role="alert"><h1>{isEn ? "Unable to load this lesson." : "Impossible de charger cette leçon."}</h1><p>{error.message}</p><Button variant="secondary" onClick={() => void reload()}>{t("action.retry")}</Button></div>}
        {!loading && !error && !lesson && <div className="study-empty"><h1>{isEn ? "Lesson not found." : "Leçon introuvable."}</h1><Link className="study-link" href="/courses">{isEn ? "Back to courses" : "Retour aux cours"}</Link></div>}
        {lesson && (
          <>
            <Link className="study-link" href={`/courses/${lesson.course.slug}`}>← {lesson.course.title}</Link>
            {preview && <div className="learning-banner learning-banner--preview">{isEn ? "Preview mode: this lesson will not award XP." : "Mode aperçu : cette leçon ne donnera pas d’XP."}</div>}
            {startError && <div className="settings-status is-error" role="alert">{startError}</div>}
            <header className="lesson-hero">
              <div>
                <p className="lesson-hero__module">{lesson.module.title}</p>
                <h1>{lesson.title}</h1>
                <p>{lesson.summary}</p>
                <div className="lesson-hero__meta">
                  <span><IconLesson size={15} /> {isEn ? `Lesson ${sequence.index + 1} / ${lesson.sequence.length}` : `Leçon ${sequence.index + 1} / ${lesson.sequence.length}`}</span>
                  <span><IconClock size={15} /> {formatDuration(lesson.duration_minutes)}</span>
                  <span>+{lesson.xp_reward} XP</span>
                </div>
              </div>
              <div className="lesson-hero__progress"><strong>{completed ? 100 : readingPct} %</strong><ProgressBar value={completed ? 100 : readingPct} tone="blue" /></div>
            </header>

            <div className="lesson-reader-layout">
              <aside className="lesson-progress-rail" aria-label={isEn ? "Reading progression" : "Progression de lecture"}>
                <h2>{isEn ? "Reading" : "Lecture"}</h2>
                <strong>{completed ? "100" : readingPct} %</strong>
                <ProgressBar value={completed ? 100 : readingPct} tone={completed ? "green" : "blue"} height="sm" label={isEn ? "Reading progression" : "Progression de lecture"} />
                <p>{completed ? (isEn ? "Lesson completed." : "Leçon validée.") : remaining > 0 ? (isEn ? `Validation available in ${remaining}s.` : `Validation disponible dans ${remaining} s.`) : (isEn ? "You can validate when you are ready." : "Tu peux valider quand tu es prêt.")}</p>
                {saveError && <p className="lesson-progress-rail__error" role="alert">{saveError}</p>}
                <nav aria-label={isEn ? "Adjacent lessons" : "Leçons proches"}>
                  {sequence.previous && <Link href={`/lessons/${sequence.previous.id}`}>{isEn ? "Previous" : "Précédente"}</Link>}
                  {sequence.next && <Link href={`/lessons/${sequence.next.id}`}>{isEn ? "Next" : "Suivante"}</Link>}
                </nav>
              </aside>
              <article ref={articleRef} className="lesson-content">
                {!lesson.blocks.some((b) => b.type === "video" || (b.type === "callout" && pendingVideoTitle(b.content))) && (
                  <figure className="lesson-media lesson-video-slot mb-6">
                    <div className="lesson-video-slot__frame" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9.5 5 2.5-5 2.5z" /></svg>
                    </div>
                    <figcaption>
                      <strong>{isEn ? "Course video in production" : "Vidéo du cours en préparation"}</strong>
                      <span>{lesson.title}</span>
                      <small>{isEn ? "Reserved slot. The illustrated walkthroughs and interactive diagrams below already cover the essentials." : "Emplacement réservé. Le contenu illustré et les schémas interactifs ci-dessous couvrent déjà l’essentiel."}</small>
                    </figcaption>
                  </figure>
                )}
                {lesson.blocks.length ? lesson.blocks.map((block, index) => <Fragment key={`${lesson.id}-${index}`}><LessonBlockRenderer block={block} />{equipmentAfter.get(index)?.map((box) => <EquipmentBox key={box.title} title={box.title} devices={box.devices} />)}</Fragment>) : <div className="study-empty"><p>{isEn ? "This lesson has no content blocks yet." : "Cette leçon ne contient pas encore de bloc de contenu."}</p></div>}
              </article>
            </div>

            <section className="study-completion lesson-completion" aria-live="polite">
              <div>
                <h2>{completed ? (isEn ? "Lesson Completed" : "Leçon terminée") : (isEn ? "Complete once you have reviewed the key concepts." : "Valide quand tu as parcouru l’essentiel.")}</h2>
                <p>{completed ? (alreadyCompleted ? (isEn ? "You can review this lesson anytime without earning repeat XP." : "Tu peux relire cette leçon sans gagner une deuxième fois les XP.") : (isEn ? `Well done! ${completionXp > 0 ? `+${completionXp} XP awarded.` : "No additional XP for this review."}` : `Bravo ! ${completionXp > 0 ? `+${completionXp} XP ont été ajoutés.` : "Aucun XP supplémentaire sur cette validation."}`)) : (isEn ? "A minimum reading time is required before completing." : "Le serveur impose un temps minimum de lecture avant la validation.")}</p>
              </div>
              {!completed && <Button variant="success" onClick={() => void finishLesson()} loading={saving} disabled={starting || !startInfo || remaining > 0}>{remaining > 0 ? (isEn ? `${remaining}s remaining` : `Encore ${remaining} s`) : (isEn ? "Finish Lesson" : "Terminer la leçon")}</Button>}
              {completed && (
                <div className="study-actions">
                  {lesson.quiz ? <Link className="study-button" href={`/quiz/${lesson.quiz.id}`}>{isEn ? "Take Quiz" : "Passer le quiz"}</Link> : nextLessonId ? <Link className="study-button" href={`/lessons/${nextLessonId}`}>{isEn ? "Next Lesson" : "Leçon suivante"}</Link> : <Link className="study-button" href={`/courses/${lesson.course.slug}`}>{isEn ? "Back to Track" : "Retour au parcours"}</Link>}
                  <Badge tone="green"><IconTrophy size={13} /> {isEn ? "Earned" : "Acquis"}</Badge>
                </div>
              )}
              {completionError && <p className="settings-status is-error" role="alert">{completionError}</p>}
            </section>

            <nav className="lesson-nav" aria-label={isEn ? "Lesson navigation" : "Navigation des leçons"}>
              {sequence.previous ? <Link href={`/lessons/${sequence.previous.id}`}>← {sequence.previous.title}</Link> : <span />}
              {sequence.next ? <Link href={`/lessons/${sequence.next.id}`}>{sequence.next.title} →</Link> : <Link href={`/courses/${lesson.course.slug}`}>{isEn ? "Back to Track →" : "Retour au parcours →"}</Link>}
            </nav>
          </>
        )}
    </div>
  );
}

/** AppShell gates rendering on a loaded profile, so the view can call useLearner() safely. */
export default function LessonPage() {
  return <AppShell><LessonView /></AppShell>;
}
