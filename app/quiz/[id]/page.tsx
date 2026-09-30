"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import QuestionCard from "@/components/quiz/QuestionCard";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import { quizzes } from "@/data/quizzes";
import { useUserActions } from "@/context/UserContext";
import { IconTrophy, IconLesson } from "@/components/ui/Icon";
import { usePublishStore } from "@/hooks/usePublishStore";
import type { Quiz } from "@/types";
import type { QuizSubmission } from "@/types/database";

function QuizSession({ quiz }: { quiz: Quiz }) {
  const { completeQuiz } = useUserActions();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<QuizSubmission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answered = selected !== null;
  const question = quiz.questions[index];

  const retry = () => { setIndex(0); setSelected(null); setAnswers([]); setResult(null); setError(null); };
  const submit = async (all: string[]) => {
    setSubmitting(true);
    setError(null);
    try { setResult(await completeQuiz(quiz.id, all)); } catch (err) { setError(err instanceof Error ? err.message : "Ton résultat n’a pas pu être enregistré."); } finally { setSubmitting(false); }
  };
  if (result) {
    const { passed, score, total, awarded } = result;
    return <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      {passed ? <IconTrophy size={48} className="mx-auto text-cyber-yellow" /> : <IconLesson size={48} className="mx-auto text-cyber-blue" />}
      <h1 className="font-display text-3xl font-semibold mt-5">{passed ? "Quiz validé !" : "Un peu de révision, puis on réessaie."}</h1>
      <p className="text-slate-300 mt-4">Score : {score} / {total} · Validation à partir de 70 %.</p>
      <p role="status" className="mt-5 text-cyber-green">{awarded > 0 ? `+${awarded} XP gagnés` : "Aucun XP supplémentaire : seul un meilleur score apporte de nouveaux XP."}</p>
      <p className="text-sm text-slate-300 mt-3">Ton meilleur résultat est conservé, même si cette tentative est moins bonne.</p>
      <div className="study-actions justify-center mt-8"><Button variant="secondary" onClick={retry}>Réessayer le quiz</Button><Link href={`/lessons/${quiz.lessonId}`} className="study-button">Revoir la leçon</Link><Link href="/progression" className="study-link">Ma progression →</Link></div>
    </div>;
  }
  const last = index + 1 === quiz.questions.length;
  return <div className="max-w-2xl mx-auto px-6 py-10">
    <Link className="study-link" href={`/lessons/${quiz.lessonId}`}>← Revenir à la leçon</Link>
    <h1 className="font-display text-2xl font-semibold mt-5 mb-4">{quiz.title}</h1>
    <p className="text-sm text-slate-300 mb-3">Question {index + 1} / {quiz.questions.length}</p>
    <ProgressBar value={(index + (answered ? 1 : 0)) / quiz.questions.length * 100} tone="purple" />
    <div className="mt-8 bg-dark-navy border border-white/10 rounded-xl2 p-5 sm:p-8">
      <QuestionCard question={question} selected={selected} answered={answered} onSelect={(option) => { if (!answered) { setSelected(option); setAnswers((previous) => [...previous.slice(0, index), option]); } }} />
      {answered && <div className="mt-6 flex flex-col items-end gap-3">
        {error && <p className="text-sm text-cyber-red self-stretch" role="alert">{error}</p>}
        <Button disabled={submitting} aria-busy={submitting} onClick={() => {
          if (!last) { setIndex(index + 1); setSelected(null); }
          else void submit(answers);
        }}>{last ? (submitting ? "Correction en cours…" : error ? "Renvoyer mes réponses" : "Voir mon résultat") : "Question suivante"}</Button>
      </div>}
    </div>
  </div>;
}

export default function QuizPage() {
  const params = useParams<{ id: string }>();
  const { publishedCourses, hydrated } = usePublishStore();
  const quiz = [...quizzes, ...publishedCourses.flatMap((course) => course.quizzes)].find((item) => item.id === params.id);
  return <AppShell>{quiz?.questions.length ? <QuizSession key={quiz.id} quiz={quiz} /> : <div className="study-empty"><h1>{hydrated ? "Ce quiz est introuvable ou ne contient pas de question." : "Chargement du quiz…"}</h1><Link className="study-link" href="/courses">Retour aux cours</Link></div>}</AppShell>;
}
