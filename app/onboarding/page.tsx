"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import OptionCard from "@/components/onboarding/OptionCard";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import { useLearner, useUserActions } from "@/context/UserContext";
import { DAILY_GOALS } from "@/lib/navigation";
import type { LearningGoal, OnboardingAnswers, SkillLevel } from "@/types/api";

const skillOptions: { value: SkillLevel; label: string; description: string }[] = [
  { value: "debutant", label: "Débutant", description: "Je découvre les bases de la cybersécurité." },
  { value: "intermediaire", label: "Intermédiaire", description: "Je connais déjà quelques notions réseau, Linux ou web." },
  { value: "avance", label: "Avancé", description: "Je veux consolider et pratiquer sur des scénarios plus exigeants." },
];
const goalOptions: { value: LearningGoal; label: string; description: string }[] = [
  { value: "decouvrir", label: "Découvrir la cybersécurité", description: "Comprendre les fondamentaux sans pression." },
  { value: "professionnel", label: "Devenir professionnel", description: "Structurer une montée en compétence métier." },
  { value: "emploi", label: "Trouver un emploi", description: "Construire des réflexes et un portfolio crédibles." },
  { value: "competences", label: "Améliorer mes compétences", description: "Renforcer les sujets que tu pratiques déjà." },
  { value: "certification", label: "Préparer une certification", description: "Suivre un rythme régulier et mesurable." },
];
const areaOptions = [
  { value: "reseaux", label: "Réseaux", description: "IP, DNS, ports, modèle OSI." },
  { value: "linux", label: "Linux", description: "Terminal, fichiers, permissions." },
  { value: "programmation", label: "Programmation", description: "Scripts, logique, bases web." },
  { value: "securite", label: "Sécurité", description: "OWASP, vulnérabilités, bonnes pratiques." },
  { value: "aucune", label: "Aucune", description: "Je pars de zéro et c’est très bien." },
];

type StepKey = keyof OnboardingAnswers;
const steps: { key: StepKey; question: string; helper: string }[] = [
  { key: "skillLevel", question: "Quel est ton niveau ?", helper: "On adapte le vocabulaire et les recommandations." },
  { key: "goal", question: "Quel est ton objectif ?", helper: "Ton tableau de bord proposera les bons parcours." },
  { key: "dailyMinutes", question: "Combien de temps peux-tu apprendre ?", helper: "Un objectif réaliste protège ta série." },
  { key: "knownAreas", question: "Quelles bases possèdes-tu déjà ?", helper: "Tu peux cocher plusieurs réponses." },
];

function OnboardingFlow() {
  const { profile } = useLearner();
  const { completeOnboarding } = useUserActions();
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    skillLevel: profile.skill_level ?? null,
    goal: profile.goal ?? null,
    dailyMinutes: profile.daily_minutes ?? null,
    knownAreas: profile.known_areas.length ? profile.known_areas : [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const canContinue = useMemo(() => {
    if (step.key === "skillLevel") return Boolean(answers.skillLevel);
    if (step.key === "goal") return Boolean(answers.goal);
    if (step.key === "dailyMinutes") return Boolean(answers.dailyMinutes);
    return answers.knownAreas.length > 0;
  }, [answers, step.key]);

  function toggleArea(value: string) {
    setAnswers((current) => {
      if (value === "aucune") return { ...current, knownAreas: current.knownAreas.includes("aucune") ? [] : ["aucune"] };
      const withoutNone = current.knownAreas.filter((area) => area !== "aucune");
      return { ...current, knownAreas: withoutNone.includes(value) ? withoutNone.filter((area) => area !== value) : [...withoutNone, value] };
    });
  }

  async function next() {
    if (!canContinue) return;
    if (!isLast) { setStepIndex((index) => index + 1); return; }
    setSaving(true);
    setError(null);
    try {
      await completeOnboarding(answers);
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tes préférences n’ont pas pu être enregistrées. Réessaie.");
      setSaving(false);
    }
  }

  return <div className="study-page max-w-2xl">
    <ProgressBar value={progress} tone="blue" />
    <p className="mt-2 text-center text-xs text-white/40">Étape {stepIndex + 1} sur {steps.length}</p>
    <div className="mt-8 rounded-xl2 border border-white/5 bg-dark-navy p-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-cyber-blue">Bienvenue {profile.display_name}</p>
      <h1 className="mt-2 text-center font-display text-2xl font-semibold">{step.question}</h1>
      <p className="mt-2 text-center text-sm text-white/55">{step.helper}</p>
      {saving ? <div role="status" className="py-10 text-center"><div className="mx-auto h-14 w-14 rounded-full border-4 border-white/10 border-t-cyber-blue animate-spin" /><h2 className="mt-6 font-display text-xl font-semibold">Ton espace s’ouvre…</h2><p className="mt-2 text-sm text-white/50">Nous synchronisons tes préférences.</p></div> : <>
        <div className="mt-8 grid gap-3">
          {step.key === "skillLevel" && skillOptions.map((option) => <OptionCard key={option.value} label={option.label} description={option.description} selected={answers.skillLevel === option.value} onClick={() => setAnswers((current) => ({ ...current, skillLevel: option.value }))} />)}
          {step.key === "goal" && goalOptions.map((option) => <OptionCard key={option.value} label={option.label} description={option.description} selected={answers.goal === option.value} onClick={() => setAnswers((current) => ({ ...current, goal: option.value }))} />)}
          {step.key === "dailyMinutes" && DAILY_GOALS.map((value) => <OptionCard key={value} label={`${value} min/jour`} description={value <= 20 ? "Parfait pour créer l’habitude." : value >= 60 ? "Pour les sessions approfondies." : "Un rythme soutenu mais réaliste."} selected={answers.dailyMinutes === value} onClick={() => setAnswers((current) => ({ ...current, dailyMinutes: value }))} />)}
          {step.key === "knownAreas" && areaOptions.map((option) => <OptionCard key={option.value} label={option.label} description={option.description} selected={answers.knownAreas.includes(option.value)} onClick={() => toggleArea(option.value)} />)}
        </div>
        {error && <p role="alert" className="mt-6 text-center text-sm text-cyber-red">{error}</p>}
        <div className="mt-8 flex items-center justify-between"><Button type="button" variant="ghost" onClick={() => setStepIndex((index) => Math.max(0, index - 1))} disabled={stepIndex === 0}>Précédent</Button><Button type="button" onClick={() => void next()} disabled={!canContinue}>{isLast ? "Commencer à apprendre" : "Continuer"}</Button></div>
      </>}
    </div>
  </div>;
}

export default function OnboardingPage() {
  return <AppShell><OnboardingFlow /></AppShell>;
}