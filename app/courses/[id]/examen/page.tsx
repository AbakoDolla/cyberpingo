"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell, { loginHref } from "@/components/layout/AppShell";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  IconAlert, IconArrowRight, IconCertificate, IconCheck, IconClock, IconCourses, IconLock, IconShield,
  IconTrophy, IconX,
} from "@/components/ui/Icon";
import { useUser } from "@/context/UserContext";
import { useAsync } from "@/hooks/useAsync";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import { getCourseBySlug } from "@/services/courses.service";
import { getCourseExamStatus, startCourseExam, submitCourseExam } from "@/services/exam.service";
import type { ExamQuestion, ExamStartResult, ExamStatus, ExamSubmitResult } from "@/types/exam";

function formatTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function ExamPageView() {
  const params = useParams<{ id: string }>();
  const slug = params.id;
  const { profile, isAuthenticated } = useUser();
  const userId = profile?.id ?? null;

  // Active exam states
  const [examState, setExamState] = useState<ExamStartResult | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [remainingSecs, setRemainingSecs] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<ExamSubmitResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, loading, reload } = useAsync(async () => {
    const course = await getCourseBySlug(slug);
    if (!course) return { course: null, status: null as ExamStatus | null };
    const status = userId ? await getCourseExamStatus(course.id) : null;
    return { course, status };
  }, [slug, userId]);

  const course = data?.course ?? null;
  const status = data?.status ?? null;

  const autoSubmitRef = useRef<() => void>(() => {});
  autoSubmitRef.current = () => {
    if (!examState || submitting) return;
    setSubmitting(true);
    submitCourseExam(examState.attempt_id, answers)
      .then((res) => {
        setSubmitResult(res);
        void reload();
      })
      .catch(() => {
        setErrorMsg("Le temps est écoulé. Les réponses ont été enregistrées.");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  // Countdown timer
  useEffect(() => {
    if (!examState || submitResult) return;
    const interval = setInterval(() => {
      setRemainingSecs((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          autoSubmitRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [examState, submitResult]);

  async function handleStart() {
    if (!course || !status?.can_take_exam) return;
    setErrorMsg(null);
    try {
      const res = await startCourseExam(course.id);
      setExamState(res);
      setRemainingSecs(res.remaining_seconds);
      setCurrentIdx(0);
      setAnswers({});
      setSubmitResult(null);
    } catch (err) {
      setErrorMsg(errorMessage(err, "Impossible de démarrer l’examen. Réessaie."));
    }
  }

  function handleSelectOption(questionId: string, optionId: string, type: string) {
    setAnswers((prev) => {
      if (type === "multiple_choice") {
        const cur = prev[questionId] ?? [];
        const next = cur.includes(optionId) ? cur.filter((x) => x !== optionId) : [...cur, optionId];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  }

  async function handleSubmit() {
    if (!examState || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await submitCourseExam(examState.attempt_id, answers);
      setSubmitResult(res);
      void reload();
    } catch (err) {
      setErrorMsg(errorMessage(err, "Échec lors de la validation de l’examen."));
    } finally {
      setSubmitting(false);
    }
  }

  const currentQ: ExamQuestion | null = examState?.questions[currentIdx] ?? null;
  const answeredCount = Object.keys(answers).filter((k) => (answers[k]?.length ?? 0) > 0).length;
  const totalQ = examState?.total_questions ?? 0;

  return (
    <div className="study-page exam-page max-w-4xl mx-auto py-8 px-4">
      <Link href={`/courses/${slug}`} className="study-link mb-6 inline-flex items-center gap-1">
        ← Retour au parcours
      </Link>

      {/* 1. Results View */}
      {submitResult && (
        <section className="exam-result-panel space-y-6 animate-fadeIn" aria-live="polite">
          <div
            className={`p-8 rounded-2xl border text-center ${
              submitResult.passed
                ? "bg-gradient-to-b from-cyber-green/15 to-transparent border-cyber-green/50 shadow-glow-green"
                : "bg-gradient-to-b from-amber-500/15 to-transparent border-amber-500/50"
            }`}
          >
            <div className="inline-grid place-items-center w-20 h-20 rounded-full mx-auto mb-4 bg-cyber-surface border border-cyber-line">
              {submitResult.passed ? <IconTrophy size={40} className="text-cyber-green" /> : <IconAlert size={36} className="text-amber-400" />}
            </div>
            <h1 className="text-3xl font-extrabold text-white mb-2 font-display">
              {submitResult.passed ? "Félicitations, certification obtenue !" : "Examen non validé"}
            </h1>
            <p className="text-cyber-muted max-w-lg mx-auto mb-6 text-sm">
              {submitResult.passed
                ? `Tu as brillamment réussi l'examen officiel CyberPingo avec un score de ${submitResult.percentage} % (seuil de validation : ${submitResult.pass_percentage} %).`
                : `Tu as obtenu ${submitResult.percentage} % (${submitResult.score} / ${submitResult.total_questions} réponses correctes). Le seuil requis pour la certification est de ${submitResult.pass_percentage} %.`}
            </p>

            {/* Certificate Awarded CTA */}
            {submitResult.certificate && (
              <div className="p-6 rounded-xl bg-cyber-surface/90 border border-cyber-cyan/40 max-w-lg mx-auto mb-6 space-y-4 text-left">
                <div className="flex items-center gap-3">
                  <IconCertificate size={28} className="text-cyber-cyan" />
                  <div>
                    <strong className="block text-white text-base">Certificat officiel CyberPingo</strong>
                    <span className="text-xs text-cyber-muted font-mono">N° {submitResult.certificate.certificate_number}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link
                    href={`/certificat/${submitResult.certificate.verification_code}`}
                    className="study-button study-button--sm"
                  >
                    Voir mon certificat en ligne
                  </Link>
                  <a
                    href={`/api/certificat/${submitResult.certificate.verification_code}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="study-button study-button--sm study-button--ghost"
                  >
                    Télécharger le PDF officiel
                  </a>
                </div>
              </div>
            )}

            {!submitResult.passed && (
              <Button variant="primary" onClick={() => void handleStart()}>
                Repasser l’examen
              </Button>
            )}
          </div>

          {/* Module Breakdown */}
          {submitResult.module_breakdown.length > 0 && (
            <div className="p-6 rounded-2xl bg-cyber-surface border border-cyber-line space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <IconCourses size={18} /> Performance par module
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {submitResult.module_breakdown.map((m) => {
                  const pct = Math.round((m.score / Math.max(1, m.total)) * 100);
                  return (
                    <div key={m.module_id} className="p-3 rounded-lg bg-cyber-black/50 border border-cyber-line/40 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-white font-medium">{m.module_title}</span>
                        <span className="text-cyber-cyan font-bold">{m.score} / {m.total} ({pct} %)</span>
                      </div>
                      <ProgressBar value={pct} tone={pct >= 70 ? "green" : "blue"} height="sm" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question Review */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <IconCheck size={18} /> Correction détaillée
            </h2>
            {submitResult.results.map((r, i) => (
              <div
                key={r.question_id}
                className={`p-4 rounded-xl border space-y-2 ${
                  r.correct ? "bg-cyber-surface/60 border-cyber-green/40" : "bg-cyber-surface/60 border-amber-500/40"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`p-1 rounded ${r.correct ? "bg-cyber-green/20 text-cyber-green" : "bg-amber-500/20 text-amber-400"}`}>
                    {r.correct ? <IconCheck size={14} /> : <IconX size={14} />}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">
                      {i + 1}. {r.prompt}
                    </p>
                    {r.explanation && (
                      <p className="text-xs text-cyber-muted mt-1 bg-cyber-black/40 p-2 rounded">
                        <strong>Explication :</strong> {r.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Active Taking View */}
      {examState && !submitResult && currentQ && (
        <section className="space-y-6" aria-label="Questionnaire d'examen">
          {/* Top Sticky Status Bar */}
          <header className="sticky top-16 z-20 p-4 rounded-xl bg-cyber-surface/95 border border-cyber-line backdrop-blur flex items-center justify-between shadow-soft">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyber-subtle">
                Question {currentIdx + 1} / {totalQ}
              </span>
              <Badge tone="blue">{answeredCount} répondu{answeredCount > 1 ? "s" : ""}</Badge>
            </div>
            <div className={`flex items-center gap-2 font-mono font-bold text-base ${remainingSecs < 300 ? "text-amber-400 animate-pulse" : "text-cyber-cyan"}`}>
              <IconClock size={16} />
              <span>{formatTimer(remainingSecs)}</span>
            </div>
          </header>

          {/* Stepper Grid */}
          <nav className="flex gap-1.5 flex-wrap p-2 rounded-lg bg-cyber-surface/50 border border-cyber-line/50" aria-label="Sélecteur de question">
            {examState.questions.map((q, idx) => {
              const answered = (answers[q.id]?.length ?? 0) > 0;
              const isCurrent = idx === currentIdx;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-cyber-cyan text-cyber-black shadow-glow-cyan"
                      : answered
                      ? "bg-cyber-surface border border-cyber-green text-cyber-green"
                      : "bg-cyber-surface border border-cyber-line text-cyber-muted hover:border-cyber-cyan"
                  }`}
                  aria-label={`Aller à la question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </nav>

          {/* Question Card */}
          <article className="p-6 rounded-2xl bg-cyber-surface border border-cyber-line space-y-6">
            <div>
              <span className="text-xs text-cyber-cyan font-bold uppercase tracking-wider">
                {currentQ.module_title}
              </span>
              <h2 className="text-lg font-bold text-white mt-1">{currentQ.prompt}</h2>
            </div>

            <div className="space-y-3">
              {currentQ.options.map((opt) => {
                const selected = (answers[currentQ.id] ?? []).includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, opt.id, currentQ.question_type)}
                    className={`w-full p-4 rounded-xl border text-left text-sm font-medium transition-all flex items-center justify-between ${
                      selected
                        ? "bg-cyber-cyan/15 border-cyber-cyan text-white shadow-soft"
                        : "bg-cyber-black/40 border-cyber-line/60 text-cyber-text hover:border-cyber-cyan/50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${selected ? "border-cyber-cyan bg-cyber-cyan text-cyber-black" : "border-cyber-line"}`}>
                      {selected && "✓"}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Stepper buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-cyber-line/60">
              <Button
                variant="secondary"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              >
                Précédente
              </Button>
              {currentIdx < totalQ - 1 ? (
                <Button variant="secondary" onClick={() => setCurrentIdx((i) => Math.min(totalQ - 1, i + 1))}>
                  Suivante <IconArrowRight size={14} />
                </Button>
              ) : (
                <Button variant="success" loading={submitting} onClick={() => void handleSubmit()}>
                  Soumettre l’examen ({answeredCount}/{totalQ})
                </Button>
              )}
            </div>
          </article>

          {errorMsg && (
            <p className="settings-status is-error" role="alert">
              {errorMsg}
            </p>
          )}
        </section>
      )}

      {/* 3. Landing Intro View (Not taking yet) */}
      {!examState && !submitResult && course && (
        <section className="space-y-6">
          <header className="p-8 rounded-2xl border border-cyber-cyan/30 bg-gradient-to-br from-cyber-surface via-cyber-surface to-[#061833] relative overflow-hidden">
            <div className="space-y-4 max-w-xl">
              <div className="flex gap-2">
                <Badge tone="purple">Certification officielle</Badge>
                <Badge tone="green">Seuil : 70 %</Badge>
              </div>
              <h1 className="text-3xl font-extrabold text-white font-display">
                Examen final · {course.title}
              </h1>
              <p className="text-sm text-cyber-muted leading-relaxed">
                Cet examen valide de manière rigoureuse l’ensemble des compétences développées tout au long du parcours.
                Il comporte 25 questions réparties équitablement sur chaque module, soumises à un chronomètre de 40 minutes.
              </p>
            </div>
          </header>

          {/* Previous certificate banner if achieved */}
          {status?.certificate && (
            <div className="p-6 rounded-2xl bg-cyber-green/10 border border-cyber-green/40 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <IconCertificate size={32} className="text-cyber-green" />
                <div>
                  <h2 className="text-base font-bold text-white">Certificat déjà obtenu !</h2>
                  <p className="text-xs text-cyber-muted">
                    N° {status.certificate.certificate_number} · Délivré le {formatDate(status.certificate.issued_at)}
                    {status.certificate.exam_percentage ? ` · Score : ${status.certificate.exam_percentage} %` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/certificat/${status.certificate.verification_code}`} className="study-button study-button--sm">
                  Voir mon certificat
                </Link>
                <a
                  href={`/api/certificat/${status.certificate.verification_code}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="study-button study-button--sm study-button--ghost"
                >
                  PDF
                </a>
              </div>
            </div>
          )}

          {/* Exam conditions card */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-cyber-surface border border-cyber-line text-center space-y-1">
              <span className="text-xs text-cyber-subtle uppercase">Questions</span>
              <strong className="block text-xl text-white font-display">{status?.question_count ?? 25}</strong>
              <small className="text-cyber-muted text-xs">Tirées au sort par module</small>
            </div>
            <div className="p-4 rounded-xl bg-cyber-surface border border-cyber-line text-center space-y-1">
              <span className="text-xs text-cyber-subtle uppercase">Temps alloué</span>
              <strong className="block text-xl text-cyber-cyan font-display">{status?.duration_minutes ?? 40} min</strong>
              <small className="text-cyber-muted text-xs">Chronomètre continu</small>
            </div>
            <div className="p-4 rounded-xl bg-cyber-surface border border-cyber-line text-center space-y-1">
              <span className="text-xs text-cyber-subtle uppercase">Score de passage</span>
              <strong className="block text-xl text-cyber-green font-display">{status?.pass_percentage ?? 70} %</strong>
              <small className="text-cyber-muted text-xs">Délivrance immédiate</small>
            </div>
          </div>

          {/* Prerequisites check */}
          {!status?.can_take_exam && (
            <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <IconLock size={22} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <strong className="text-white text-sm">Parcours non complété</strong>
                <p className="text-xs text-cyber-muted">
                  Pour accéder à cet examen de certification, tu dois avoir terminé toutes les leçons et validé tous les quiz du parcours.
                </p>
                <Link href={`/courses/${slug}`} className="study-link text-xs block pt-2">
                  Continuer les leçons du parcours →
                </Link>
              </div>
            </div>
          )}

          {status?.can_take_exam && (
            <div className="p-6 rounded-2xl bg-cyber-surface border border-cyber-line text-center space-y-4">
              <p className="text-sm text-cyber-text">
                Prêt à faire reconnaître tes compétences ? Assure-toi d’avoir 40 minutes au calme.
              </p>
              <Button size="lg" variant="success" onClick={() => void handleStart()}>
                {status.certificate ? "Repasser l’examen" : "Commencer l’examen final"}
              </Button>
            </div>
          )}

          {errorMsg && (
            <p className="settings-status is-error" role="alert">
              {errorMsg}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default function ExamPage() {
  return (
    <AppShell allowGuest>
      <ExamPageView />
    </AppShell>
  );
}
