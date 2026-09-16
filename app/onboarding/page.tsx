"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/layout/Logo";
import OptionCard from "@/components/onboarding/OptionCard";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { useUserActions } from "@/context/UserContext";
import { OnboardingAnswers, OnboardingGoal, SkillLevel } from "@/types";

const steps = [
  {
    key: "skillLevel",
    question: "Quel est ton niveau ?",
    options: [
      { value: "debutant", label: "Débutant" },
      { value: "intermediaire", label: "Intermédiaire" },
      { value: "avance", label: "Avancé" },
    ],
  },
  {
    key: "goal",
    question: "Quel est ton objectif ?",
    options: [
      { value: "decouvrir", label: "Découvrir la cybersécurité" },
      { value: "professionnel", label: "Devenir professionnel" },
      { value: "emploi", label: "Trouver un emploi" },
      { value: "competences", label: "Améliorer mes compétences" },
      { value: "certification", label: "Préparer une certification" },
    ],
  },
  {
    key: "dailyMinutes",
    question: "Combien de temps peux-tu apprendre ?",
    options: [
      { value: "10", label: "10 min/jour" },
      { value: "20", label: "20 min/jour" },
      { value: "30", label: "30 min/jour" },
      { value: "60", label: "1 h/jour" },
      { value: "90", label: "Plus d'une heure" },
    ],
  },
  {
    key: "knownAreas",
    question: "Quelles connaissances possèdes-tu déjà ?",
    multi: true,
    options: [
      { value: "reseaux", label: "Réseaux" },
      { value: "linux", label: "Linux" },
      { value: "programmation", label: "Programmation" },
      { value: "securite", label: "Sécurité" },
      { value: "aucune", label: "Aucune" },
    ],
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const { applyOnboarding } = useUserActions();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    skillLevel: null,
    goal: null,
    dailyMinutes: null,
    knownAreas: [],
  });
  const [generating, setGenerating] = useState(false);

  const step = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const isLast = stepIndex === steps.length - 1;

  const canContinue = useMemo(() => {
    if (step.key === "skillLevel") return Boolean(answers.skillLevel);
    if (step.key === "goal") return Boolean(answers.goal);
    if (step.key === "dailyMinutes") return Boolean(answers.dailyMinutes);
    if (step.key === "knownAreas") return answers.knownAreas.length > 0;
    return false;
  }, [step.key, answers]);

  function selectSingle(value: string) {
    if (step.key === "skillLevel") setAnswers((a) => ({ ...a, skillLevel: value as SkillLevel }));
    if (step.key === "goal") setAnswers((a) => ({ ...a, goal: value as OnboardingGoal }));
    if (step.key === "dailyMinutes") setAnswers((a) => ({ ...a, dailyMinutes: Number(value) }));
  }

  function toggleMulti(value: string) {
    setAnswers((a) => {
      const exists = a.knownAreas.includes(value);
      return {
        ...a,
        knownAreas: exists ? a.knownAreas.filter((v) => v !== value) : [...a.knownAreas, value],
      };
    });
  }

  async function handleNext() {
    if (!isLast) {
      setStepIndex((i) => i + 1);
      return;
    }
    setGenerating(true);
    // Sauvegarde les préférences dans le UserContext avant de rediriger.
    await new Promise((resolve) => setTimeout(resolve, 1400));
    applyOnboarding(answers);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen grid-lines flex flex-col items-center px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="flex justify-center mb-8">
          <Logo />
        </div>

        <ProgressBar value={progress} tone="blue" />
        <p className="text-center text-xs text-white/40 mt-2 mb-8">
          Étape {stepIndex + 1} sur {steps.length}
        </p>

        {generating ? (
          <div className="bg-dark-navy border border-white/5 rounded-xl2 p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-full border-4 border-white/10 border-t-cyber-blue animate-spin" />
            <h2 className="mt-6 font-display text-xl font-semibold">
              Nous créons ta roadmap personnalisée…
            </h2>
            <p className="mt-2 text-sm text-white/50">
              Cyberpingo adapte ton parcours à ton niveau et à ton objectif.
            </p>
          </div>
        ) : (
          <div className="bg-dark-navy border border-white/5 rounded-xl2 p-8">
            <h1 className="font-display text-2xl font-semibold text-center">{step.question}</h1>
            <div className="mt-8 grid gap-3">
              {step.options.map((opt) => {
                const selected =
                  step.key === "knownAreas"
                    ? answers.knownAreas.includes(opt.value)
                    : step.key === "dailyMinutes"
                    ? answers.dailyMinutes === Number(opt.value)
                    : step.key === "skillLevel"
                    ? answers.skillLevel === opt.value
                    : answers.goal === opt.value;

                return (
                  <OptionCard
                    key={opt.value}
                    label={opt.label}
                    selected={selected}
                    onClick={() =>
                      step.key === "knownAreas" ? toggleMulti(opt.value) : selectSingle(opt.value)
                    }
                  />
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={stepIndex === 0}
              >
                Précédent
              </Button>
              <Button variant="primary" onClick={handleNext} disabled={!canContinue}>
                {isLast ? "Créer ma roadmap" : "Continuer"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
