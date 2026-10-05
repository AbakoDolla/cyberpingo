import type { BadgeCriteria, Rarity, RankRequirement, Skill, SkillLink, SkillState } from "@/types/api";

export const SKILL_STATE_LABELS: Record<SkillState, string> = {
  not_studied: "Non étudiée",
  learning: "En cours d’apprentissage",
  consolidating: "En cours de consolidation",
  exercises_mastered: "Maîtrisée dans les exercices",
  validated: "Validée par une évaluation pratique",
};

export const SKILL_STATE_LABELS_EN: Record<SkillState, string> = {
  not_studied: "Not started",
  learning: "Currently learning",
  consolidating: "Consolidating knowledge",
  exercises_mastered: "Mastered in exercises",
  validated: "Validated by hands-on assessment",
};

export function localizeSkillState(state: SkillState, lang: "fr" | "en" = "fr"): string {
  if (lang === "en") return SKILL_STATE_LABELS_EN[state] ?? state;
  return SKILL_STATE_LABELS[state] ?? state;
}

const STATE_STEPS: Record<SkillState, number> = {
  not_studied: 0,
  learning: 1,
  consolidating: 2,
  exercises_mastered: 3,
  validated: 4,
};

export const SKILL_STATE_STEP_COUNT = 4;

export function skillStateStep(state: SkillState): number {
  return STATE_STEPS[state] ?? 0;
}

export function skillStateTone(state: SkillState): "neutral" | "blue" | "purple" | "green" {
  if (state === "validated") return "green";
  if (state === "exercises_mastered") return "purple";
  if (state === "not_studied") return "neutral";
  return "blue";
}

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

/** Human-readable rank requirement, e.g. "Résoudre 3 labs". Unknown keys are shown as-is. */
export function requirementLabel(key: string, required: number): string {
  switch (key) {
    case "lessons_completed": return `Terminer ${plural(required, "leçon", "leçons")}`;
    case "labs_solved": return `Résoudre ${plural(required, "lab", "labs")}`;
    case "courses_completed": return `Terminer ${plural(required, "parcours", "parcours")}`;
    case "skills_mastered": return `Maîtriser ${plural(required, "compétence", "compétences")} dans les exercices`;
    case "skills_validated": return `Valider ${plural(required, "compétence", "compétences")} par une évaluation`;
    case "min_level": return `Atteindre le niveau ${required}`;
    default: return `${key} : ${required}`;
  }
}

/** Overall completion of the next rank, from 0 to 100. A rank without requirements counts as reached. */
export function rankProgress(requirements: RankRequirement[]): number {
  if (requirements.length === 0) return 100;
  const total = requirements.reduce((sum, item) => sum + (item.required > 0 ? Math.min(1, Math.max(0, item.current) / item.required) : 1), 0);
  return Math.round((total / requirements.length) * 100);
}

export function linkKindLabel(kind: SkillLink["kind"], lang: "fr" | "en" = "fr"): string {
  if (lang === "en") {
    switch (kind) {
      case "lesson": return "Lesson";
      case "quiz": return "Quiz";
      case "practice": return "Practice";
      case "validation": return "Assessment";
    }
  }
  switch (kind) {
    case "lesson": return "Leçon";
    case "quiz": return "Quiz";
    case "practice": return "Pratique";
    case "validation": return "Évaluation";
  }
}

export const localizeLinkKind = linkKindLabel;

/** In-app destination of a skill link. Labs are addressed by slug, lessons and quizzes by id. */
export function linkHref(link: SkillLink): string | null {
  if (link.kind === "lesson") return `/lessons/${link.id}`;
  if (link.kind === "quiz") return `/quiz/${link.id}`;
  return link.slug ? `/challenges/${link.slug}` : null;
}

export function groupSkillsByDomain<D extends { id: string }>(domains: D[], skills: Skill[]): { domain: D; skills: Skill[] }[] {
  return domains
    .map((domain) => ({ domain, skills: skills.filter((skill) => skill.domain_id === domain.id) }))
    .filter((group) => group.skills.length > 0);
}

export const RARITY_LABELS: Record<Rarity, string> = {
  common: "Commun",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
};

export interface BadgeConditionContext {
  labTitle?: string | null;
  skillName?: string | null;
}

const countText = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Explicit, verifiable unlock condition of a badge, built from its stored criteria. */
export function badgeCondition(
  badge: { criteria_type: BadgeCriteria; criteria_value: number },
  context: BadgeConditionContext = {},
): string {
  const n = badge.criteria_value;
  switch (badge.criteria_type) {
    case "lessons_completed": return `Termine ${countText(n, "leçon", "leçons")}.`;
    case "quizzes_passed": return `Réussis ${countText(n, "quiz", "quiz")}.`;
    case "courses_completed": return `Termine ${countText(n, "parcours", "parcours")}.`;
    case "streak_days": return `Tiens une série de ${countText(n, "jour", "jours")}.`;
    case "xp_total": return `Atteins ${n} XP cumulés.`;
    case "labs_solved": return `Résous ${countText(n, "lab", "labs")}.`;
    case "certificates_earned": return `Obtiens ${countText(n, "certificat", "certificats")}.`;
    case "course_completed": return "Termine le parcours associé.";
    case "lab_completed": return context.labTitle ? `Réussis le laboratoire « ${context.labTitle} ».` : "Réussis le laboratoire associé.";
    case "skill_validated": return context.skillName ? `Fais valider la compétence « ${context.skillName} » par une évaluation pratique.` : "Fais valider la compétence associée.";
    default: return "Continue ta progression pour le débloquer.";
  }
}