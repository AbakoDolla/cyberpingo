"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import QuestionCard from "@/components/quiz/QuestionCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { IconArrowRight, IconCheck, IconLesson, IconTrophy } from "@/components/ui/Icon";
import { useLearner, useUserActions } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { playSuccessSound, playFailureSound } from "@/lib/mascot/sound-effects";
import { getCourseBySlug, orderedLessons } from "@/services/courses.service";
import { getMyQuizAttempts, getQuiz } from "@/services/quiz.service";
import type { QuizQuestion, QuizQuestionResult, QuizSubmission } from "@/types/api";

function resultFor(results: QuizQuestionResult[], questionId: string) {
  return results.find((item) => item.question_id === questionId);
}

function nextLessonId(lessonId: string | null | undefined, sequence: { id: string }[]) {
  if (!lessonId) return null;
  const index = sequence.findIndex((lesson) => lesson.id === lessonId);
  return index >= 0 ? sequence[index + 1]?.id ?? null : null;
}

function correctLabels(question: QuizQuestion, result: QuizQuestionResult) {
  return question.answers.filter((answer) => result.correct_answer_ids.includes(answer.id)).map((answer) => answer.label).join(", ");
}

function QuizView() {
  const params = useParams<{ id: string }>();
  const quizId = params.id;
  const { profile } = useLearner();
  const { submitQuiz } = useUserActions();
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<QuizSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data, error, loading, reload } = useAsync(async () => {
    const quiz = await getQuiz(quizId);
    if (!quiz) return { quiz: null, attempts: null, course: null };
    const [attempts, course] = await Promise.all([getMyQuizAttempts(profile.id, quiz.id), getCourseBySlug(quiz.course.slug)]);
    return { quiz, attempts, course };
  }, [quizId, profile.id]);

  const quiz = data?.quiz ?? null;
  const allAnswered = Boolean(quiz?.questions.length && quiz.questions.every((question) => (answers[question.id] ?? []).length > 0));
  const answeredCount = quiz?.questions.filter((question) => (answers[question.id] ?? []).length > 0).length ?? 0;
  const nextLesson = useMemo(() => nextLessonId(quiz?.lesson?.id, data?.course ? orderedLessons(data.course) : []), [quiz?.lesson?.id, data?.course]);
  const attemptCopy = data?.attempts
    ? data.attempts.attempts
      ? `Meilleur score : ${data.attempts.best_percentage ?? 0} % · ${data.attempts.attempts} tentative${data.attempts.attempts > 1 ? "s" : ""}`
      : "Aucune tentative enregistrée."
    : null;

  function selectAnswer(question: QuizQuestion, answerId: string) {
    setAnswers((current) => {
      const selected = current[question.id] ?? [];
      if (question.question_type === "multiple_choice") {
        const next = selected.includes(answerId) ? selected.filter((id) => id !== answerId) : [...selected, answerId];
        return { ...current, [question.id]: next };
      }
      return { ...current, [question.id]: [answerId] };
    });
    setSubmitError(null);
  }

  async function submit() {
    if (!quiz) return;
    if (!allAnswered) { setSubmitError("Réponds à toutes les questions avant de valider."); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await submitQuiz(quiz.id, answers);
      setResult(res);
      if (res.passed) {
        playSuccessSound();
      } else {
        playFailureSound();
      }
    } catch (cause) {
      setSubmitError(errorMessage(cause, "Ton résultat n’a pas pu être enregistré."));
    } finally {
      setSubmitting(false);
    }
  }

  async function retry() {
    setResult(null);
    setAnswers({});
    setSubmitError(null);
    await reload();
  }

  return (
    <div className="study-page quiz-page">
        {loading && <div className="study-empty" role="status"><h1>Chargement du quiz…</h1></div>}
        {error && !loading && <div className="study-empty" role="alert"><h1>Impossible de charger ce quiz.</h1><p>{error.message}</p><Button variant="secondary" onClick={() => void reload()}>Réessayer</Button></div>}
        {!loading && !error && !quiz && <div className="study-empty"><h1>Quiz introuvable.</h1><Link className="study-link" href="/courses">Retour aux cours</Link></div>}
        {quiz && (
          <>
            <Link className="study-link" href={quiz.lesson ? `/lessons/${quiz.lesson.id}` : `/courses/${quiz.course.slug}`}>← {quiz.lesson ? quiz.lesson.title : quiz.course.title}</Link>
            {data?.course?.status === "draft" && <div className="learning-banner learning-banner--preview">Aperçu brouillon : la correction fonctionne, mais aucun XP ne sera accordé.</div>}
            <header className="quiz-hero">
              <div>
                <div className="course-detail-hero__badges"><Badge tone="purple">{quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""}</Badge><Badge tone="blue">Validation à {quiz.pass_percentage} %</Badge><Badge tone="green">+{quiz.total_xp} XP possibles</Badge></div>
                <h1>{quiz.title}</h1>
                <p>{quiz.description || "Teste ta compréhension avant de continuer."}</p>
                {attemptCopy && !result && <p className="quiz-hero__attempts">{attemptCopy}</p>}
              </div>
              {!result && <div className="lesson-hero__progress"><strong>{answeredCount} / {quiz.questions.length}</strong><ProgressBar value={quiz.questions.length ? (answeredCount / quiz.questions.length) * 100 : 0} tone="purple" /></div>}
            </header>

            {quiz.questions.length === 0 ? <div className="study-empty"><h2>Ce quiz ne contient pas encore de question.</h2></div> : result ? (
              <section className={`quiz-result ${result.passed ? "is-passed" : "is-failed"}`} aria-live="polite">
                <div className="quiz-result__summary">
                  {result.passed ? <IconTrophy size={48} /> : <IconLesson size={48} />}
                  <h2>{result.passed ? "Quiz validé !" : "Encore un passage, et ça va rentrer."}</h2>
                  <p>Score : {result.score} / {result.total} · {result.percentage} % (seuil : {result.pass_percentage} %)</p>
                  <strong>{result.xp_awarded > 0 ? `+${result.xp_awarded} XP gagnés` : "Aucun XP supplémentaire sur cette tentative"}</strong>
                  <small>Les récompenses sont aussi affichées dans les toasts CyberPingo.</small>
                </div>
                <div className="quiz-result__answers">
                  {quiz.questions.map((question) => {
                    const questionResult = resultFor(result.results, question.id);
                    return questionResult ? <div key={question.id} className="quiz-result__question"><QuestionCard question={question} selected={answers[question.id] ?? []} result={questionResult} /><p className="quiz-result__correct"><IconCheck size={14} /> Réponse correcte : {correctLabels(question, questionResult)}</p></div> : null;
                  })}
                </div>
                <div className="study-actions"><Button variant="secondary" onClick={() => void retry()}>Réessayer</Button><Link className="study-button" href={`/courses/${quiz.course.slug}`}>Retour au parcours</Link>{nextLesson && <Link className="study-link" href={`/lessons/${nextLesson}`}>Leçon suivante <IconArrowRight size={14} /></Link>}</div>
              </section>
            ) : (
              <section className="quiz-form" aria-label="Questions du quiz">
                <p className="quiz-keyboard-hint">Astuce clavier : utilise Tab pour passer d’une réponse à l’autre, puis Entrée ou Espace pour sélectionner.</p>
                {quiz.questions.map((question) => <QuestionCard key={question.id} question={question} selected={answers[question.id] ?? []} onSelect={(answerId) => selectAnswer(question, answerId)} disabled={submitting} />)}
                {submitError && <p className="settings-status is-error" role="alert">{submitError}</p>}
                <div className="quiz-submit"><Button variant="success" onClick={() => void submit()} loading={submitting} disabled={!allAnswered}>Corriger mon quiz</Button><p>{allAnswered ? "Prêt pour la correction." : "Sélectionne au moins une réponse par question."}</p></div>
              </section>
            )}
          </>
        )}
    </div>
  );
}

/** AppShell gates rendering on a loaded profile, so the view can call useLearner() safely. */
export default function QuizPage() {
  return <AppShell><QuizView /></AppShell>;
}
