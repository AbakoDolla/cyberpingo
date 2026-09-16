"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import QuestionCard from "@/components/quiz/QuestionCard";
import ProgressBar from "@/components/ui/ProgressBar";
import Button from "@/components/ui/Button";
import { quizzes } from "@/data/quizzes";
import { useUserActions } from "@/context/UserContext";
import { IconTrophy, IconLesson } from "@/components/ui/Icon";

export default function QuizPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const quiz = quizzes.find((q) => q.id === params.id);
  const { addXp, completeQuiz } = useUserActions();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  if (!quiz) {
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <p className="text-white/50">Quiz introuvable.</p>
        </div>
      </AppShell>
    );
  }

  const question = quiz.questions[questionIndex];
  const progress = ((questionIndex + (answered ? 1 : 0)) / quiz.questions.length) * 100;

  function handleSelect(option: string) {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    if (option === question.correctAnswer) setScore((s) => s + 1);
  }

  function handleContinue() {
    if (questionIndex + 1 < quiz!.questions.length) {
      setQuestionIndex((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      // score est déjà mis à jour par handleSelect avant ce clic
      const earned = Math.round((score / quiz!.questions.length) * quiz!.xpReward);
      addXp(earned);
      completeQuiz();
      setXpEarned(earned);
      setFinished(true);
    }
  }

  if (finished) {
    const passed = score >= Math.ceil(quiz.questions.length / 2);
    return (
      <AppShell>
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <span className="text-5xl">{passed ? <IconTrophy size={48} strokeWidth={1.2} className="mx-auto text-cyber-yellow" /> : <IconLesson size={48} strokeWidth={1.2} className="mx-auto text-cyber-blue" />}</span>
          <h1 className="font-display text-2xl font-semibold mt-4">Quiz terminé !</h1>
          <p className="text-white/60 mt-2">
            Score : {score} / {quiz.questions.length}
          </p>
          {xpEarned > 0 ? (
            <p className="mt-4 font-display font-semibold text-cyber-green text-lg">+{xpEarned} XP</p>
          ) : (
            <p className="mt-4 text-sm text-white/50">Révise les leçons et réessaie pour gagner des XP.</p>
          )}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="secondary" onClick={() => router.back()}>
              Retour au cours
            </Button>
            <Button variant="primary" onClick={() => router.push("/dashboard")}>
              Tableau de bord
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-white/50">
            Question {questionIndex + 1} / {quiz.questions.length}
          </p>
          <p className="text-sm text-white/50">{quiz.title}</p>
        </div>
        <ProgressBar value={progress} tone="purple" />

        <div className="mt-8 bg-dark-navy border border-white/5 rounded-xl2 p-8">
          <QuestionCard
            question={question}
            selected={selected}
            answered={answered}
            onSelect={handleSelect}
          />

          {answered && (
            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={handleContinue}>
                Continuer
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
