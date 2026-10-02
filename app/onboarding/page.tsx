"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import OptionCard from "@/components/onboarding/OptionCard";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  IconAward,
  IconBrain,
  IconCheck,
  IconClock,
  IconLinux,
  IconList,
  IconNetwork,
  IconShield,
  IconTarget,
} from "@/components/ui/Icon";
import { useLearner, useUserActions } from "@/context/UserContext";
import { errorMessage } from "@/lib/errors";
import { DAILY_GOALS } from "@/lib/navigation";
import type { LearningGoal, OnboardingAnswers, SkillLevel } from "@/types/api";

const skillOptions: { value: SkillLevel; label: string; description: string; icon: ReactNode }[] = [
  { value: "debutant", label: "Débutant", description: "Je découvre les bases et j’ai besoin d’un vocabulaire clair.", icon: <IconBrain size={20} /> },
  { value: "intermediaire", label: "Intermédiaire", description: "Je connais déjà quelques notions réseau, Linux ou web.", icon: <IconShield size={20} /> },
  { value: "avance", label: "Avancé", description: "Je veux pratiquer sur des scénarios plus exigeants.", icon: <IconAward size={20} /> },
];
const goalOptions: { value: LearningGoal; label: string; description: string; icon: ReactNode }[] = [
  { value: "decouvrir", label: "Découvrir la cybersécurité", description: "Comprendre les fondamentaux sans pression.", icon: <IconShield size={20} /> },
  { value: "professionnel", label: "Devenir professionnel", description: "Structurer une montée en compétence métier.", icon: <IconTarget size={20} /> },
  { value: "emploi", label: "Trouver un emploi", description: "Construire des réflexes et un portfolio crédibles.", icon: <IconList size={20} /> },
  { value: "competences", label: "Améliorer mes compétences", description: "Renforcer les sujets que tu pratiques déjà.", icon: <IconBrain size={20} /> },
  { value: "certification", label: "Préparer une certification", description: "Suivre un rythme régulier et mesurable.", icon: <IconAward size={20} /> },
];
const areaOptions = [
  { value: "reseaux", label: "Réseaux", description: "IP, DNS, ports, modèle OSI.", icon: <IconNetwork size={20} /> },
  { value: "linux", label: "Linux", description: "Terminal, fichiers, permissions.", icon: <IconLinux size={20} /> },
  { value: "programmation", label: "Programmation", description: "Scripts, logique, bases web.", icon: <IconList size={20} /> },
  { value: "securite", label: "Sécurité", description: "OWASP, vulnérabilités, bonnes pratiques.", icon: <IconShield size={20} /> },
  { value: "aucune", label: "Aucune", description: "Je pars de zéro et c’est très bien.", icon: <IconCheck size={20} /> },
];

type StepKey = keyof OnboardingAnswers | "summary";
const steps: { key: StepKey; question: string; helper: string }[] = [
  { key: "skillLevel", question: "Quel point de départ te ressemble le plus ?", helper: "CyberPingo ajuste le vocabulaire, les rappels et les parcours recommandés." },
  { key: "goal", question: "Qu’est-ce que tu veux obtenir en priorité ?", helper: "Ton objectif rend les prochaines actions plus lisibles sur le tableau de bord." },
  { key: "dailyMinutes", question: "Quel rythme peux-tu tenir sans te cramer ?", helper: "Un objectif réaliste protège ta série et garde les sessions rapides." },
  { key: "knownAreas", question: "Quelles bases possèdes-tu déjà ?", helper: "Tu peux cocher plusieurs réponses, ou partir de zéro." },
  { key: "summary", question: "Ton parcours est prêt.", helper: "Vérifie le résumé, puis ouvre ton espace d’apprentissage personnalisé." },
];

function labelFor<T extends string | number>(items: { value: T; label: string }[], value: T | null) {
  return items.find((item) => item.value === value)?.label ?? "Non renseigné";
}

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
  const isSummary = step.key === "summary";
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const canContinue = useMemo(() => {
    if (step.key === "skillLevel") return Boolean(answers.skillLevel);
    if (step.key === "goal") return Boolean(answers.goal);
    if (step.key === "dailyMinutes") return Boolean(answers.dailyMinutes);
    if (step.key === "knownAreas") return answers.knownAreas.length > 0;
    return Boolean(answers.skillLevel && answers.goal && answers.dailyMinutes && answers.knownAreas.length > 0);
  }, [answers, step.key]);

  const summary = useMemo(() => {
    const dailyOptions = DAILY_GOALS.map((value) => ({ value, label: `${value} min/jour` }));
    return [
      { label: "Niveau", value: labelFor(skillOptions, answers.skillLevel) },
      { label: "Objectif", value: labelFor(goalOptions, answers.goal) },
      { label: "Rythme", value: labelFor(dailyOptions, answers.dailyMinutes) },
      {
        label: "Bases connues",
        value: answers.knownAreas.length
          ? answers.knownAreas.map((area) => areaOptions.find((option) => option.value === area)?.label ?? area).join(", ")
          : "Non renseigné",
      },
    ];
  }, [answers]);

  function toggleArea(value: string) {
    setAnswers((current) => {
      if (value === "aucune") return { ...current, knownAreas: current.knownAreas.includes("aucune") ? [] : ["aucune"] };
      const withoutNone = current.knownAreas.filter((area) => area !== "aucune");
      return {
        ...current,
        knownAreas: withoutNone.includes(value) ? withoutNone.filter((area) => area !== value) : [...withoutNone, value],
      };
    });
  }

  async function next() {
    if (!canContinue) return;
    if (!isSummary) {
      setStepIndex((index) => index + 1);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await completeOnboarding(answers);
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause, "Tes préférences n’ont pas pu être enregistrées. Réessaie."));
      setSaving(false);
    }
  }

  return (
    <div className="study-page acct-page onb-page">
      <div className="onb-shell">
        <aside className="onb-progress-card" aria-label="Progression de l’onboarding">
          <div className="onb-progress-head">
            <strong>{Math.round(progress)} %</strong>
            <span>Configuration</span>
          </div>
          <ProgressBar value={progress} tone="brand" height="sm" label="Progression du questionnaire" />
          <ol className="onb-stepper">
            {steps.map((item, index) => (
              <li key={item.key} className={index === stepIndex ? "is-active" : index < stepIndex ? "is-done" : undefined}>
                <span>{index < stepIndex ? <IconCheck size={14} /> : index + 1}</span>
                <strong>{item.key === "summary" ? "Résumé" : item.question}</strong>
              </li>
            ))}
          </ol>
        </aside>

        <section className="onb-card" aria-labelledby="onb-title">
          <div className="onb-card__head">
            <div>
              <h1 id="onb-title">{step.question}</h1>
              <p>{step.helper}</p>
            </div>
            <div className="onb-mini-profile">
              <strong>{profile.display_name}</strong>
              <span>@{profile.username}</span>
            </div>
          </div>

          {saving ? (
            <div role="status" className="onb-saving" aria-live="polite">
              <span />
              <h2>Ton espace s’ouvre…</h2>
              <p>Nous synchronisons tes préférences et préparons tes premières recommandations.</p>
            </div>
          ) : (
            <>
              {step.key === "skillLevel" && (
                <div className="onb-options" role="radiogroup" aria-label="Niveau actuel">
                  {skillOptions.map((option) => (
                    <OptionCard
                      key={option.value}
                      label={option.label}
                      description={option.description}
                      icon={option.icon}
                      selected={answers.skillLevel === option.value}
                      onClick={() => setAnswers((current) => ({ ...current, skillLevel: option.value }))}
                    />
                  ))}
                </div>
              )}

              {step.key === "goal" && (
                <div className="onb-options" role="radiogroup" aria-label="Objectif principal">
                  {goalOptions.map((option) => (
                    <OptionCard
                      key={option.value}
                      label={option.label}
                      description={option.description}
                      icon={option.icon}
                      selected={answers.goal === option.value}
                      onClick={() => setAnswers((current) => ({ ...current, goal: option.value }))}
                    />
                  ))}
                </div>
              )}

              {step.key === "dailyMinutes" && (
                <div className="onb-options onb-options--compact" role="radiogroup" aria-label="Temps quotidien">
                  {DAILY_GOALS.map((value) => (
                    <OptionCard
                      key={value}
                      label={`${value} min/jour`}
                      description={value <= 20 ? "Parfait pour créer l’habitude." : value >= 60 ? "Pour les sessions approfondies." : "Un rythme soutenu mais réaliste."}
                      meta={value <= 20 ? "léger" : value >= 60 ? "intense" : "régulier"}
                      icon={<IconClock size={20} />}
                      selected={answers.dailyMinutes === value}
                      onClick={() => setAnswers((current) => ({ ...current, dailyMinutes: value }))}
                    />
                  ))}
                </div>
              )}

              {step.key === "knownAreas" && (
                <div className="onb-options" role="group" aria-label="Connaissances déjà présentes">
                  {areaOptions.map((option) => (
                    <OptionCard
                      key={option.value}
                      label={option.label}
                      description={option.description}
                      icon={option.icon}
                      selected={answers.knownAreas.includes(option.value)}
                      multiple
                      onClick={() => toggleArea(option.value)}
                    />
                  ))}
                </div>
              )}

              {isSummary && (
                <div className="onb-summary">
                  {summary.map((item) => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              )}

              {error && <p role="alert" className="acct-status is-error onb-error">{error}</p>}
              <div className="onb-actions">
                <Button type="button" variant="ghost" onClick={() => setStepIndex((index) => Math.max(0, index - 1))} disabled={stepIndex === 0 || saving}>
                  Précédent
                </Button>
                <Button type="button" onClick={() => void next()} disabled={!canContinue || saving}>
                  {isSummary ? "Commencer à apprendre" : "Continuer"}
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return <AppShell><OnboardingFlow /></AppShell>;
}
