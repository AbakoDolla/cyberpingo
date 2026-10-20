import type { MascotEvent, MascotExpression, MascotLine } from "@/types/api";

/**
 * Identifiant de la voix officielle "cyberpingo" sur ElevenLabs
 * et modèle expressif v3 supportant les balisages émotionnels automatiques ([tags]).
 */
export const CYBERPINGO_VOICE_ID = "IUovyCa9veb0Bu5IUFy9";
export const CYBERPINGO_MODEL_ID = "eleven_v3";
export const CYBERPINGO_VOICE_CREDIT = "Voix de synthèse neuronale CyberPingo (ElevenLabs)";

/**
 * Balisages expressifs ElevenLabs v3 selon l'humeur de Pingo :
 * - opening : tag au début de la première phrase
 * - followUp : tag au début de la deuxième phrase pour varier l'intonation humaine
 * - settings : stabilité et expressivité adaptées à l'émotion
 */
export const EXPRESSION_AUDIO_TAGS: Readonly<
  Record<
    MascotExpression,
    {
      opening: string;
      followUp: string;
      stability: number;
      similarity_boost: number;
      style: number;
    }
  >
> = {
  celebration: {
    opening: "[excited]",
    followUp: "[proud]",
    stability: 0.4,
    similarity_boost: 0.8,
    style: 0.45,
  },
  proud: {
    opening: "[proud]",
    followUp: "[warmly]",
    stability: 0.45,
    similarity_boost: 0.8,
    style: 0.35,
  },
  happy: {
    opening: "[cheerfully]",
    followUp: "[warmly]",
    stability: 0.45,
    similarity_boost: 0.8,
    style: 0.35,
  },
  surprised: {
    opening: "[surprised]",
    followUp: "[chuckles softly]",
    stability: 0.4,
    similarity_boost: 0.8,
    style: 0.4,
  },
  encouraging: {
    opening: "[warmly]",
    followUp: "[encouraging]",
    stability: 0.48,
    similarity_boost: 0.8,
    style: 0.3,
  },
  mission: {
    opening: "[confident]",
    followUp: "[focused]",
    stability: 0.5,
    similarity_boost: 0.82,
    style: 0.3,
  },
  focused: {
    opening: "[focused]",
    followUp: "[calm]",
    stability: 0.52,
    similarity_boost: 0.82,
    style: 0.25,
  },
  thinking: {
    opening: "[thoughtful]",
    followUp: "[curious]",
    stability: 0.48,
    similarity_boost: 0.8,
    style: 0.3,
  },
  disappointed: {
    opening: "[sighs softly] [gentle]",
    followUp: "[encouraging]",
    stability: 0.48,
    similarity_boost: 0.8,
    style: 0.3,
  },
  expert: {
    opening: "[confident]",
    followUp: "[warmly]",
    stability: 0.52,
    similarity_boost: 0.82,
    style: 0.28,
  },
  explanation: {
    opening: "[calm]",
    followUp: "[warmly]",
    stability: 0.52,
    similarity_boost: 0.82,
    style: 0.25,
  },
};

/**
 * Répliques enrichies avec balisages expressifs sur mesure pour un rendu 100 % naturel et humain.
 */
export const CURATED_TAGGED_LINES: Readonly<Record<string, string>> = {
  intro:
    "[warmly] Salut, moi c’est Pingo ! [cheerfully] Je suis la mascotte de CyberPingo. [calm] Ici, on apprend la cybersécurité pas à pas, avec des leçons courtes, des laboratoires sans risque et des badges pour garder la motivation. [encouraging] Pas besoin de tout savoir pour commencer... je t’accompagne à chaque étape. [enthusiastic] Prêt à prendre le premier réflexe ?",
  "da285d27-f5dc-9470-288b-5239d3b4d73b":
    "[warmly] Salut, moi c’est Pingo ! [cheerfully] Je t’accompagne dans chaque leçon... On commence quand tu veux.",
  "d87276bc-32ac-b61e-b061-c611b495e6e5":
    "[warmly] Content de te revoir ! [encouraging] Une leçon, un exercice, et tu avances déjà.",
  "199c8897-2797-aff0-de28-71ca23bad1e1":
    "[focused] On se concentre : [calm] lis les objectifs, ils te disent ce que tu sauras faire à la fin.",
  "8a6d2c0b-c6af-5861-5ecb-a3e7b19d9457":
    "[calm] Si un schéma te semble obscur, relis-le calmement. [warmly] Un bon schéma vaut dix paragraphes.",
  "f81109a2-298b-3425-fd9a-8900724b9882":
    "[enthusiastic] Bonne réponse ! [proud] Tu viens de prouver que tu as compris, pas seulement retenu.",
  "ff1f8c62-0c3e-8b51-17fb-1aa2e1e0e778":
    "[cheerfully] Exact ! [encouraging] Continue sur cette lancée.",
  "d20265aa-6f59-18a3-fa9c-7efd94751304":
    "[gentle] Pas tout à fait... [encouraging] Relis l’énoncé, regarde l’indice et retente : se tromper fait partie de l’entraînement.",
  "fdbce325-8d11-86ed-0c3f-4711db554265":
    "[thoughtful] Hmm... [curious] Ouvre la capture ou le journal, et cherche la ligne qui prouve ta réponse.",
  "4e16390a-9efb-7a07-e19d-c240cab0e2e5":
    "[proud] Leçon terminée ! [warmly] Prends une seconde pour résumer ce que tu viens d’apprendre avec tes mots.",
  "5ebb2053-f07e-6ea3-bef4-de8e81774703":
    "[cheerfully] Une de plus de validée ! [warmly] La régularité bat l’intensité.",
  "c92bb8fc-2df0-6989-781c-0b77358c1f0b":
    "[excited] Niveau supérieur ! [proud] Chaque niveau est le résultat de vrais efforts. Bravo !",
  "ef264b05-6e2e-1a7e-0c7d-a43b1bd16255":
    "[excited] Un nouveau badge pour ta collection ! [proud] Va voir sa condition : tu l’as gagné pour de bon.",
  "72a62b06-091f-21d3-b2d5-d8de43eaafe2":
    "[surprised] Oh, un badge ! [chuckles softly] Tu ne l’avais pas vu venir ?",
  "65b23789-9944-a131-fe16-66c717af20fa":
    "[confident] Nouvelle mission : [focused] lis le briefing, repère les contraintes et lance-toi.",
  "1c741aeb-ee97-8044-13ea-300e4588d990":
    "[focused] En situation réelle, personne ne te donne la réponse. [confident] Fie-toi aux preuves.",
  "a8fd2f99-7338-2c44-a64e-efee18234cd9":
    "[warmly] Te revoilà ! [cheerfully] Pas de souci pour la pause : on reprend doucement là où tu étais.",
  "cb170032-3907-6241-cf05-f3a6ced1c2c5":
    "[warmly] Un petit rappel pour se remettre en route : [encouraging] refais le dernier quiz, c’est rapide.",
  "5a82bf3c-f089-d148-7238-39f21025814a":
    "[proud] Compétence validée par une vraie mise en pratique. [confident] C’est ce qui compte face à un employeur.",
  "7782fcb9-e6b4-bfd0-b152-fbca1c58b83b":
    "[excited] Nouveau rang ! [proud] Ton parcours se voit maintenant. [encouraging] Continue, la suite t’attend.",
  "60a3491a-3849-6fb4-4ab7-710bc689838d":
    "[excited] Parcours terminé ! [proud] De la théorie à la pratique, tu as bouclé la boucle... Fier de toi.",
  "f7ca590c-213a-a310-4c5c-b43ab4568a82":
    "[proud] Laboratoire réussi ! [warmly] Tu as fait un vrai travail d’analyste : preuve par preuve.",
  "77509e8f-4f43-9818-e577-3a9ff2771018":
    "[confident] Mission accomplie. [calm] Retiens la méthode : observer, formuler une hypothèse, vérifier.",
  "df374134-0736-2213-df0c-1178db413ca5":
    "[focused] Dans un journal, chaque ligne est un témoin. [curious] Cherche d’abord l’adresse qui revient trop souvent.",
  "e282253a-f4a3-9fea-3a65-ec50330cb473":
    "[confident] Mission d’analyste : [focused] trouve ce qui s’est passé, et prouve-le avec une ligne du fichier.",
  "463bd6b8-2caf-cfab-21d0-b8d528ce2889":
    "[thoughtful] Vérifie l’heure : les journaux sont en UTC. [calm] Une heure de décalage change toute l’histoire.",
  "1ed50ce2-fb13-a77e-4713-1a5b3edd1458":
    "[gentle] Un faux positif t’a peut-être piégé. [encouraging] Cherche si l’adresse a réussi à se connecter, pas seulement essayé.",
  "6fd7b129-3f65-3b43-f76e-1dffb8b3add4":
    "[enthusiastic] Bien vu ! [confident] Une bonne réponse d’analyste s’appuie toujours sur une ligne de preuve.",
  "c141e802-ba05-10df-5c4c-e2fcd9e97d18":
    "[proud] Enquête bouclée. [warmly] Pense à écrire ta chronologie : c’est la base d’un vrai rapport d’incident.",
  "31c4b118-21b2-c0ba-c32a-49c0db3e1470":
    "[proud] Compétence d’investigation validée. [confident] Les équipes de sécurité cherchent exactement ce réflexe.",
  "179f965c-0df7-6c74-4565-18949dfb36ad":
    "[calm] Un journal se lit comme une histoire : qui, quoi, quand, d’où. [warmly] Garde ces quatre questions en tête.",
};

/**
 * Ajoute automatiquement des balisages expressifs ElevenLabs v3 (`[warmly]`, `[enthusiastic]`, etc.)
 * sur n'importe quel texte français pour lui donner des intonations et respirations humaines.
 */
export function autoTagForElevenLabs(
  rawText: string,
  expression: MascotExpression = "encouraging",
  lineId?: string
): string {
  if (lineId && CURATED_TAGGED_LINES[lineId]) {
    return CURATED_TAGGED_LINES[lineId];
  }

  const trimmed = rawText.trim();
  if (!trimmed) return trimmed;
  // Si le texte contient déjà des balisages expressifs entre crochets, on les conserve
  if (/^\[[a-z\s]+\]/i.test(trimmed)) return trimmed;

  const preset = EXPRESSION_AUDIO_TAGS[expression] ?? EXPRESSION_AUDIO_TAGS.encouraging;
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);

  if (sentences.length <= 1) {
    return `${preset.opening} ${trimmed}`;
  }

  return sentences
    .map((sentence, index) => {
      if (index === 0) {
        if (/^(salut|bonjour|bienvenue|te revoilà)/i.test(sentence)) {
          return `[warmly] ${sentence}`;
        }
        if (/^(bravo| félicitations|excellent|exact|bonne réponse|bien vu|niveau supérieur|nouveau)/i.test(sentence)) {
          return `[enthusiastic] ${sentence}`;
        }
        if (/^(hmm|attention|pas tout à fait|vérifie)/i.test(sentence)) {
          return `[thoughtful] ${sentence}`;
        }
        return `${preset.opening} ${sentence}`;
      }
      if (index === 1) {
        if (/\?$/.test(sentence)) {
          return `[curious] ${sentence}`;
        }
        return `${preset.followUp} ${sentence}`;
      }
      if (/\?$/.test(sentence)) {
        return `[encouraging] ${sentence}`;
      }
      if (/!$/.test(sentence)) {
        return `[warmly] ${sentence}`;
      }
      return `[calm] ${sentence}`;
    })
    .join(" ");
}

/**
 * Catalogue complet des 30 répliques officielles de Pingo avec leurs audios CyberPingo pré-générés.
 * Garantit que Pingo parle toujours avec la voix CyberPingo même si la base de données distante
 * n'a pas encore exécuté le seed 04_mascot_voices.sql.
 */
export const DEFAULT_MASCOT_LINES: ReadonlyArray<MascotLine> = [
  { id: "da285d27-f5dc-9470-288b-5239d3b4d73b", event: "welcome" as MascotEvent, expression: "happy" as MascotExpression, text_fr: "Salut, moi c’est Pingo ! Je t’accompagne dans chaque leçon. On commence quand tu veux.", audio_url: "/audio/mascot/da285d27-f5dc-9470-288b-5239d3b4d73b.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 5 },
  { id: "d87276bc-32ac-b61e-b061-c611b495e6e5", event: "welcome" as MascotEvent, expression: "encouraging" as MascotExpression, text_fr: "Content de te revoir ! Une leçon, un exercice, et tu avances déjà.", audio_url: "/audio/mascot/d87276bc-32ac-b61e-b061-c611b495e6e5.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 4 },
  { id: "199c8897-2797-aff0-de28-71ca23bad1e1", event: "lesson_start" as MascotEvent, expression: "focused" as MascotExpression, text_fr: "On se concentre : lis les objectifs, ils te disent ce que tu sauras faire à la fin.", audio_url: "/audio/mascot/199c8897-2797-aff0-de28-71ca23bad1e1.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 5 },
  { id: "8a6d2c0b-c6af-5861-5ecb-a3e7b19d9457", event: "lesson_start" as MascotEvent, expression: "explanation" as MascotExpression, text_fr: "Si un schéma te semble obscur, relis-le calmement. Un bon schéma vaut dix paragraphes.", audio_url: "/audio/mascot/8a6d2c0b-c6af-5861-5ecb-a3e7b19d9457.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 4 },
  { id: "f81109a2-298b-3425-fd9a-8900724b9882", event: "exercise_success" as MascotEvent, expression: "proud" as MascotExpression, text_fr: "Bonne réponse ! Tu viens de prouver que tu as compris, pas seulement retenu.", audio_url: "/audio/mascot/f81109a2-298b-3425-fd9a-8900724b9882.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 5 },
  { id: "ff1f8c62-0c3e-8b51-17fb-1aa2e1e0e778", event: "exercise_success" as MascotEvent, expression: "happy" as MascotExpression, text_fr: "Exact ! Continue sur cette lancée.", audio_url: "/audio/mascot/ff1f8c62-0c3e-8b51-17fb-1aa2e1e0e778.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 4 },
  { id: "d20265aa-6f59-18a3-fa9c-7efd94751304", event: "exercise_fail" as MascotEvent, expression: "disappointed" as MascotExpression, text_fr: "Pas tout à fait. Relis l’énoncé, regarde l’indice et retente : se tromper fait partie de l’entraînement.", audio_url: "/audio/mascot/d20265aa-6f59-18a3-fa9c-7efd94751304.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 5 },
  { id: "fdbce325-8d11-86ed-0c3f-4711db554265", event: "exercise_fail" as MascotEvent, expression: "thinking" as MascotExpression, text_fr: "Hmm. Ouvre la capture ou le journal et cherche la ligne qui prouve ta réponse.", audio_url: "/audio/mascot/fdbce325-8d11-86ed-0c3f-4711db554265.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 4 },
  { id: "4e16390a-9efb-7a07-e19d-c240cab0e2e5", event: "chapter_end" as MascotEvent, expression: "proud" as MascotExpression, text_fr: "Leçon terminée ! Prends une seconde pour résumer ce que tu viens d’apprendre avec tes mots.", audio_url: "/audio/mascot/4e16390a-9efb-7a07-e19d-c240cab0e2e5.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 5 },
  { id: "5ebb2053-f07e-6ea3-bef4-de8e81774703", event: "chapter_end" as MascotEvent, expression: "happy" as MascotExpression, text_fr: "Une de plus de validée. La régularité bat l’intensité.", audio_url: "/audio/mascot/5ebb2053-f07e-6ea3-bef4-de8e81774703.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 4 },
  { id: "c92bb8fc-2df0-6989-781c-0b77358c1f0b", event: "level_up" as MascotEvent, expression: "celebration" as MascotExpression, text_fr: "Niveau supérieur ! Chaque niveau est le résultat de vrais efforts. Bravo !", audio_url: "/audio/mascot/c92bb8fc-2df0-6989-781c-0b77358c1f0b.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 8 },
  { id: "ef264b05-6e2e-1a7e-0c7d-a43b1bd16255", event: "badge" as MascotEvent, expression: "celebration" as MascotExpression, text_fr: "Un nouveau badge pour ta collection. Va voir sa condition : tu l’as gagné pour de bon.", audio_url: "/audio/mascot/ef264b05-6e2e-1a7e-0c7d-a43b1bd16255.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 7 },
  { id: "72a62b06-091f-21d3-b2d5-d8de43eaafe2", event: "badge" as MascotEvent, expression: "surprised" as MascotExpression, text_fr: "Oh, un badge ! Tu ne l’avais pas vu venir ?", audio_url: "/audio/mascot/72a62b06-091f-21d3-b2d5-d8de43eaafe2.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 5 },
  { id: "65b23789-9944-a131-fe16-66c717af20fa", event: "challenge" as MascotEvent, expression: "mission" as MascotExpression, text_fr: "Nouvelle mission : lis le briefing, repère les contraintes et lance-toi.", audio_url: "/audio/mascot/65b23789-9944-a131-fe16-66c717af20fa.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 6 },
  { id: "1c741aeb-ee97-8044-13ea-300e4588d990", event: "challenge" as MascotEvent, expression: "focused" as MascotExpression, text_fr: "En situation réelle, personne ne te donne la réponse. Fie-toi aux preuves.", audio_url: "/audio/mascot/1c741aeb-ee97-8044-13ea-300e4588d990.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 5 },
  { id: "a8fd2f99-7338-2c44-a64e-efee18234cd9", event: "return_after_absence" as MascotEvent, expression: "happy" as MascotExpression, text_fr: "Te revoilà ! Pas de souci pour la pause : on reprend doucement là où tu étais.", audio_url: "/audio/mascot/a8fd2f99-7338-2c44-a64e-efee18234cd9.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 6 },
  { id: "cb170032-3907-6241-cf05-f3a6ced1c2c5", event: "return_after_absence" as MascotEvent, expression: "encouraging" as MascotExpression, text_fr: "Un petit rappel pour se remettre en route : refais le dernier quiz, c’est rapide.", audio_url: "/audio/mascot/cb170032-3907-6241-cf05-f3a6ced1c2c5.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 5 },
  { id: "5a82bf3c-f089-d148-7238-39f21025814a", event: "new_skill" as MascotEvent, expression: "expert" as MascotExpression, text_fr: "Compétence validée par une vraie mise en pratique. C’est ce qui compte face à un employeur.", audio_url: "/audio/mascot/5a82bf3c-f089-d148-7238-39f21025814a.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 8 },
  { id: "7782fcb9-e6b4-bfd0-b152-fbca1c58b83b", event: "rank_up" as MascotEvent, expression: "celebration" as MascotExpression, text_fr: "Nouveau rang ! Ton parcours se voit maintenant. Continue, la suite t’attend.", audio_url: "/audio/mascot/7782fcb9-e6b4-bfd0-b152-fbca1c58b83b.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 9 },
  { id: "60a3491a-3849-6fb4-4ab7-710bc689838d", event: "path_complete" as MascotEvent, expression: "celebration" as MascotExpression, text_fr: "Parcours terminé ! De la théorie à la pratique, tu as bouclé la boucle. Fier de toi.", audio_url: "/audio/mascot/60a3491a-3849-6fb4-4ab7-710bc689838d.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 9 },
  { id: "f7ca590c-213a-a310-4c5c-b43ab4568a82", event: "lab_complete" as MascotEvent, expression: "proud" as MascotExpression, text_fr: "Laboratoire réussi ! Tu as fait un vrai travail d’analyste : preuve par preuve.", audio_url: "/audio/mascot/f7ca590c-213a-a310-4c5c-b43ab4568a82.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 7 },
  { id: "77509e8f-4f43-9818-e577-3a9ff2771018", event: "lab_complete" as MascotEvent, expression: "expert" as MascotExpression, text_fr: "Mission accomplie. Retiens la méthode : observer, formuler une hypothèse, vérifier.", audio_url: "/audio/mascot/77509e8f-4f43-9818-e577-3a9ff2771018.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 6 },
  { id: "df374134-0736-2213-df0c-1178db413ca5", event: "challenge" as MascotEvent, expression: "focused" as MascotExpression, text_fr: "Dans un journal, chaque ligne est un témoin. Cherche d’abord l’adresse qui revient trop souvent.", audio_url: "/audio/mascot/df374134-0736-2213-df0c-1178db413ca5.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 6 },
  { id: "e282253a-f4a3-9fea-3a65-ec50330cb473", event: "challenge" as MascotEvent, expression: "mission" as MascotExpression, text_fr: "Mission d’analyste : trouve ce qui s’est passé, et prouve-le avec une ligne du fichier.", audio_url: "/audio/mascot/e282253a-f4a3-9fea-3a65-ec50330cb473.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 5 },
  { id: "463bd6b8-2caf-cfab-21d0-b8d528ce2889", event: "exercise_fail" as MascotEvent, expression: "thinking" as MascotExpression, text_fr: "Vérifie l’heure : les journaux sont en UTC. Une heure de décalage change toute l’histoire.", audio_url: "/audio/mascot/463bd6b8-2caf-cfab-21d0-b8d528ce2889.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 5 },
  { id: "1ed50ce2-fb13-a77e-4713-1a5b3edd1458", event: "exercise_fail" as MascotEvent, expression: "encouraging" as MascotExpression, text_fr: "Un faux positif t’a peut-être piégé. Cherche si l’adresse a réussi à se connecter, pas seulement essayé.", audio_url: "/audio/mascot/1ed50ce2-fb13-a77e-4713-1a5b3edd1458.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 4 },
  { id: "6fd7b129-3f65-3b43-f76e-1dffb8b3add4", event: "exercise_success" as MascotEvent, expression: "expert" as MascotExpression, text_fr: "Bien vu ! Une bonne réponse d’analyste s’appuie toujours sur une ligne de preuve.", audio_url: "/audio/mascot/6fd7b129-3f65-3b43-f76e-1dffb8b3add4.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 5 },
  { id: "c141e802-ba05-10df-5c4c-e2fcd9e97d18", event: "lab_complete" as MascotEvent, expression: "proud" as MascotExpression, text_fr: "Enquête bouclée. Pense à écrire ta chronologie : c’est la base d’un vrai rapport d’incident.", audio_url: "/audio/mascot/c141e802-ba05-10df-5c4c-e2fcd9e97d18.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 6 },
  { id: "31c4b118-21b2-c0ba-c32a-49c0db3e1470", event: "new_skill" as MascotEvent, expression: "expert" as MascotExpression, text_fr: "Compétence d’investigation validée. Les équipes de sécurité cherchent exactement ce réflexe.", audio_url: "/audio/mascot/31c4b118-21b2-c0ba-c32a-49c0db3e1470.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 8 },
  { id: "179f965c-0df7-6c74-4565-18949dfb36ad", event: "lesson_start" as MascotEvent, expression: "explanation" as MascotExpression, text_fr: "Un journal se lit comme une histoire : qui, quoi, quand, d’où. Garde ces quatre questions en tête.", audio_url: "/audio/mascot/179f965c-0df7-6c74-4565-18949dfb36ad.mp3", voice_credit: CYBERPINGO_VOICE_CREDIT, priority: 5 },
];

const BUILTIN_AUDIO_BY_ID = new Map<string, string>(
  DEFAULT_MASCOT_LINES.map((line) => [line.id, line.audio_url!])
);

function normalizeMascotText(text?: string | null): string {
  return (text ?? "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");
}

const BUILTIN_AUDIO_BY_TEXT = new Map<string, string>(
  DEFAULT_MASCOT_LINES.map((line) => [normalizeMascotText(line.text_fr), line.audio_url!])
);

/**
 * Résout l'URL audio CyberPingo d'une réplique (garantit l'utilisation de la voix CyberPingo
 * pour toutes les répliques officielles même si `audio_url` est vide en base ou si l'UUID diffère).
 */
export function resolveCyberPingoAudioUrl(
  id: string,
  currentUrl?: string | null,
  textFr?: string | null
): string | null {
  const builtinById = BUILTIN_AUDIO_BY_ID.get(id);
  if (builtinById) return builtinById;
  if (textFr) {
    const builtinByText = BUILTIN_AUDIO_BY_TEXT.get(normalizeMascotText(textFr));
    if (builtinByText) return builtinByText;
  }
  return currentUrl ?? null;
}

/**
 * Garantit que le crédit vocal indique explicitement la voix CyberPingo (ElevenLabs)
 * pour toutes les pistes CyberPingo.
 */
export function resolveCyberPingoVoiceCredit(
  audioUrl?: string | null,
  currentCredit?: string | null
): string | null {
  if (!audioUrl) return currentCredit ?? null;
  if (
    audioUrl.startsWith("/audio/mascot/") ||
    audioUrl.startsWith("/audio/pingo") ||
    audioUrl.startsWith("/audio/professeur-pingo") ||
    !currentCredit ||
    /en attendant une voix humaine/i.test(currentCredit)
  ) {
    return CYBERPINGO_VOICE_CREDIT;
  }
  return currentCredit;
}

