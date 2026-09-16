"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import MockTerminal from "@/components/challenges/MockTerminal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { challenges } from "@/data/challenges";
import { useUserFull } from "@/context/UserContext";
import { IconHint } from "@/components/ui/Icon";

const difficultyLabel: Record<string, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

export default function ChallengeDetailPage({ params }: { params: { id: string } }) {
  const challenge = challenges.find((c) => c.slug === params.id);
  const [answer, setAnswer] = useState("");
  const [showHints, setShowHints] = useState(false);
  const [result, setResult] = useState<"idle" | "correct" | "incorrect">("idle");
  const { completeChallenge, user } = useUserFull();

  if (!challenge) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <p className="text-white/50">Challenge introuvable.</p>
        </div>
      </AppShell>
    );
  }

  const alreadyCompleted = user.completedChallenges.includes(challenge.id);

  function handleValidate() {
    const trimmed = answer.trim().toLowerCase();
    if (!trimmed) return;

    const expected = challenge!.expectedAnswer.toLowerCase();
    if (trimmed === expected) {
      setResult("correct");
      if (!alreadyCompleted) {
        completeChallenge(challenge!.id, challenge!.xpReward);
      }
    } else {
      setResult("incorrect");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleValidate();
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone="blue">{difficultyLabel[challenge.difficulty]}</Badge>
          {alreadyCompleted && <Badge tone="green">✓ Résolu</Badge>}
          <span className="text-cyber-green text-sm font-medium">+{challenge.xpReward} XP</span>
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold mt-3">{challenge.title}</h1>
        <p className="text-white/60 mt-2">{challenge.description}</p>

        <div className="mt-8 bg-dark-navy border border-white/5 rounded-xl2 p-6">
          <h2 className="font-display font-semibold mb-3">Objectifs</h2>
          <ul className="space-y-2">
            {challenge.objectives.map((obj) => (
              <li key={obj} className="flex items-start gap-2 text-sm text-white/70">
                <span className="text-cyber-blue mt-0.5">›</span>
                {obj}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <MockTerminal lines={challenge.terminalLines} />
        </div>

        <div className="mt-6 bg-dark-navy border border-white/5 rounded-xl2 p-6">
          <h2 className="font-display font-semibold mb-3">Ta réponse</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder={challenge.flagPlaceholder}
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                if (result === "incorrect") setResult("idle");
              }}
              onKeyDown={handleKeyDown}
              disabled={result === "correct" || alreadyCompleted}
              error={result === "incorrect" ? "Réponse incorrecte, réessaie." : undefined}
            />
            <Button
              variant="success"
              onClick={handleValidate}
              disabled={result === "correct" || alreadyCompleted}
              className="shrink-0"
            >
              Valider
            </Button>
          </div>

          {(result === "correct" || alreadyCompleted) && (
            <p className="mt-4 text-sm text-cyber-green">
              ✅ Bravo, challenge résolu !{!alreadyCompleted && ` +${challenge.xpReward} XP ajoutés à ton profil.`}
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowHints((v) => !v)}
            className="mt-4 text-sm text-cyber-blue hover:underline"
          >
            {showHints ? "Masquer les indices" : "Afficher les indices"}
          </button>
          {showHints && (
            <ul className="mt-3 space-y-2">
              {challenge.hints.map((hint) => (
                <li key={hint} className="flex items-start gap-2 text-sm text-white/60 bg-white/5 rounded-lg px-4 py-2.5">
                  <IconHint size={14} strokeWidth={1.6} className="text-cyber-yellow shrink-0 mt-0.5" />
                  {hint}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
