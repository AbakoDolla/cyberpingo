import type { MascotEvent, MascotExpression, RewardSummary } from "@/types/api";
import type { PingoState } from "@/components/mascot/Pingo";

/** How important an intervention is: it decides what may interrupt what. */
export const EVENT_PRIORITY: Record<MascotEvent, number> = {
  rank_up: 9,
  path_complete: 9,
  level_up: 8,
  new_skill: 7,
  badge: 7,
  lab_complete: 7,
  chapter_end: 5,
  challenge: 5,
  exercise_success: 4,
  exercise_fail: 4,
  welcome: 3,
  return_after_absence: 3,
  lesson_start: 2,
};

/** Expressions come from the CMS; each one maps onto an existing Pingo pose. */
export const EXPRESSION_STATE: Record<MascotExpression, PingoState> = {
  happy: "happy",
  proud: "celebrate",
  encouraging: "welcome",
  focused: "typing",
  surprised: "shy",
  disappointed: "sad",
  thinking: "thinking",
  expert: "explain",
  celebration: "celebrate",
  mission: "typing",
  explanation: "explain",
};

export const MASCOT_EVENTS = Object.keys(EVENT_PRIORITY) as MascotEvent[];
export const MASCOT_EXPRESSIONS = Object.keys(EXPRESSION_STATE) as MascotExpression[];

export const MASCOT_EVENT_LABELS: Record<MascotEvent, string> = {
  welcome: "Accueil",
  lesson_start: "Début de leçon",
  exercise_success: "Exercice réussi",
  exercise_fail: "Exercice raté",
  chapter_end: "Fin de chapitre",
  level_up: "Passage de niveau",
  badge: "Badge obtenu",
  challenge: "Défi réussi",
  return_after_absence: "Retour après absence",
  new_skill: "Nouvelle compétence",
  rank_up: "Nouveau grade",
  path_complete: "Parcours terminé",
  lab_complete: "Laboratoire terminé",
};

export const MASCOT_EXPRESSION_LABELS: Record<MascotExpression, string> = {
  happy: "Content",
  proud: "Fier",
  encouraging: "Encourageant",
  focused: "Concentré",
  surprised: "Surpris",
  disappointed: "Déçu avec bienveillance",
  thinking: "Réfléchit",
  expert: "Expert",
  celebration: "Célébration",
  mission: "En mission",
  explanation: "Explication",
};

/** The milestones carried by a server reward summary, from the most to the least important. */
export function mascotEventsFromRewards(summary: RewardSummary): MascotEvent[] {
  const events: MascotEvent[] = [];
  if (summary.new_rank) events.push("rank_up");
  if (summary.course_completed) events.push("path_complete");
  if (summary.leveled_up) events.push("level_up");
  if (summary.new_skills?.length) events.push("new_skill");
  if (summary.new_badges.length) events.push("badge");
  if (summary.completed_challenges.length) events.push("challenge");
  return events;
}

export function strongestEvent(events: readonly MascotEvent[]): MascotEvent | null {
  let best: MascotEvent | null = null;
  for (const event of events) if (!best || EVENT_PRIORITY[event] > EVENT_PRIORITY[best]) best = event;
  return best;
}