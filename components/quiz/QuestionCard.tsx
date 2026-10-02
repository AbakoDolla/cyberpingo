"use client";

import Image from "next/image";
import { IconCheck, IconX } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import type { QuizQuestion, QuizQuestionResult } from "@/types/api";

interface QuestionCardProps {
  question: QuizQuestion;
  selected: string[];
  onSelect?: (answerId: string) => void;
  disabled?: boolean;
  result?: QuizQuestionResult;
}

const typeLabel = {
  single_choice: "Choix unique",
  multiple_choice: "Choix multiples",
  true_false: "Vrai / faux",
} as const;

const difficultyLabel = {
  facile: "Facile",
  moyen: "Moyen",
  difficile: "Difficile",
} as const;

const answerLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function QuestionCard({ question, selected, onSelect, disabled = false, result }: QuestionCardProps) {
  const feedbackId = result ? `question-${question.id}-feedback` : undefined;

  return (
    <article className="question-card" aria-labelledby={`question-${question.id}`}>
      <div className="question-card__meta"><span>{typeLabel[question.question_type]}</span><span>{difficultyLabel[question.difficulty]}</span><span>+{question.xp_reward} XP</span></div>
      <h2 id={`question-${question.id}`}>{question.prompt}</h2>
      {question.image_url && <Image className="question-card__image" src={question.image_url} alt="Illustration de la question" width={900} height={506} sizes="(max-width: 900px) 100vw, 760px" unoptimized />}
      <div className="question-card__answers" role="group" aria-labelledby={`question-${question.id}`} aria-describedby={feedbackId}>
        {question.answers.map((answer, index) => {
          const isSelected = (result?.selected ?? selected).includes(answer.id);
          const isCorrect = result?.correct_answer_ids.includes(answer.id) ?? false;
          const isWrongSelection = Boolean(result && isSelected && !isCorrect);
          const stateLabel = result ? isCorrect ? "réponse correcte" : isWrongSelection ? "réponse sélectionnée incorrecte" : "réponse non sélectionnée" : isSelected ? "sélectionnée" : "non sélectionnée";
          return (
            <button
              key={answer.id}
              type="button"
              disabled={disabled || Boolean(result)}
              aria-pressed={isSelected}
              aria-label={`${answer.label}, ${stateLabel}`}
              onClick={() => onSelect?.(answer.id)}
              className={cn(
                "question-card__answer",
                isSelected && !result && "is-selected",
                isCorrect && "is-correct",
                isWrongSelection && "is-wrong",
              )}
            >
              <span className="question-card__answer-mark" aria-hidden="true">
                {isCorrect ? <IconCheck size={15} /> : isWrongSelection ? <IconX size={15} /> : answerLetters[index] ?? index + 1}
              </span>
              <span>{answer.label}</span>
            </button>
          );
        })}
      </div>
      {result && (
        <div id={feedbackId} className={cn("question-card__feedback", result.correct ? "is-correct" : "is-wrong")} role="status">
          <strong>{result.correct ? "Bonne réponse." : "À revoir."}</strong>
          {result.explanation && <p>{result.explanation}</p>}
        </div>
      )}
    </article>
  );
}