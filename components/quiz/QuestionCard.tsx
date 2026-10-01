"use client";

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

export default function QuestionCard({ question, selected, onSelect, disabled = false, result }: QuestionCardProps) {
  return (
    <article className="question-card" aria-labelledby={`question-${question.id}`}>
      <div className="question-card__meta"><span>{typeLabel[question.question_type]}</span><span>{difficultyLabel[question.difficulty]}</span><span>+{question.xp_reward} XP</span></div>
      <h2 id={`question-${question.id}`}>{question.prompt}</h2>
      {question.image_url && <img className="question-card__image" src={question.image_url} alt="Illustration de la question" loading="lazy" />}
      <div className="question-card__answers">
        {question.answers.map((answer) => {
          const isSelected = (result?.selected ?? selected).includes(answer.id);
          const isCorrect = result?.correct_answer_ids.includes(answer.id) ?? false;
          const isWrongSelection = Boolean(result && isSelected && !isCorrect);
          return (
            <button
              key={answer.id}
              type="button"
              disabled={disabled || Boolean(result)}
              aria-pressed={isSelected}
              onClick={() => onSelect?.(answer.id)}
              className={cn(
                "question-card__answer",
                isSelected && !result && "is-selected",
                isCorrect && "is-correct",
                isWrongSelection && "is-wrong",
              )}
            >
              <span aria-hidden="true">{isCorrect ? "✓" : isWrongSelection ? "×" : isSelected ? "●" : "○"}</span>
              {answer.label}
            </button>
          );
        })}
      </div>
      {result && (
        <div className={cn("question-card__feedback", result.correct ? "is-correct" : "is-wrong")} role="status">
          <strong>{result.correct ? "Bonne réponse." : "À revoir."}</strong>
          {result.explanation && <p>{result.explanation}</p>}
        </div>
      )}
    </article>
  );
}