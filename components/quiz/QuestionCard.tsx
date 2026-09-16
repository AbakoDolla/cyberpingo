"use client";

import { Question } from "@/types";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  question: Question;
  selected: string | null;
  answered: boolean;
  onSelect: (option: string) => void;
}

export default function QuestionCard({ question, selected, answered, onSelect }: QuestionCardProps) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold">{question.prompt}</h2>

      <div className="mt-6 grid gap-3">
        {question.options.map((option) => {
          const isCorrect = option === question.correctAnswer;
          const isSelected = option === selected;

          let stateClasses = "border-white/10 hover:border-white/25";
          if (answered) {
            if (isCorrect) stateClasses = "border-cyber-green bg-cyber-green/10 text-cyber-green";
            else if (isSelected) stateClasses = "border-cyber-red bg-cyber-red/10 text-cyber-red";
          } else if (isSelected) {
            stateClasses = "border-cyber-blue bg-cyber-blue/10";
          }

          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              onClick={() => onSelect(option)}
              className={cn(
                "text-left px-5 py-3.5 rounded-xl border bg-cyber-black transition-colors disabled:cursor-default",
                stateClasses
              )}
            >
              {option}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={cn(
            "mt-6 p-4 rounded-xl text-sm",
            selected === question.correctAnswer
              ? "bg-cyber-green/10 border border-cyber-green/30 text-cyber-green"
              : "bg-cyber-red/10 border border-cyber-red/30 text-white/80"
          )}
        >
          <p className="font-medium mb-1">
            {selected === question.correctAnswer ? "Bonne réponse !" : "Pas tout à fait."}
          </p>
          {question.explanation}
        </div>
      )}
    </div>
  );
}
