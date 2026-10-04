// Publication checklist of CyberPingo lessons, labs and modules, turned into code. The same rules run
// while authoring (scripts/check-path-part.cjs) and in the test suite (tests/content-quality.test.cjs),
// so a course is only called finished when its content really meets them.
//
// Two levels exist for lessons:
//   - "base": what every published lesson of a finished course must have (objectives, example, schema or
//     code, a video slot, a takeaway, a three-question quiz, references);
//   - "template": the full lesson template used by the lessons written for the programmes (prerequisites,
//     scenario, common mistakes, a pointer to the practice, richer demonstrations and quiz).

const MIN_BASE_TEXT = 1100;
const MIN_TEMPLATE_CHARS = 2400;

const { load } = require("./ts-loader.cjs");

/**
 * A schema is drawn as a figure (lib/figure-spec.ts). While courses are being converted the plain-text schemas are tolerated;
 * once a course is converted it must not fall back to text: flip the switch when every course is.
 */
const FIGURES_REQUIRED = process.env.FIGURES_OPTIONAL !== "1";

/** The structure and the typography of a figure stored in a schema block. */
function figureIssues(content, where) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return FIGURES_REQUIRED ? [`${where} : schéma en texte brut (dessine-le avec figure({ … }), voir lib/figure-spec.ts)`] : [];
  let value;
  try { value = JSON.parse(trimmed); } catch { return [`${where} : figure illisible (JSON invalide)`]; }
  const spec = load("lib/figure-spec");
  const problems = spec.validateFigure(value);
  if (problems.length) return problems.map((problem) => `${where} : figure invalide, ${problem}`);
  const prose = spec.figureProse(value);
  const issues = textHygiene(prose, `${where} (figure)`);
  if (prose.some((line) => /->|=>/.test(line))) issues.push(`${where} (figure) : flèche en texte (-> ou =>) : le dessin trace déjà les flèches`);
  return issues;
}

const PROSE = new Set(["text", "heading", "example", "callout"]);
const VIDEO_SLOT = /^Vidéo à venir\s*:/u;

const startsWith = (block, label) => block.type === "callout" && new RegExp(`^${label}\\s*:`, "u").test(block.content.trim());
const count = (blocks, predicate) => blocks.filter(predicate).length;

/** Prose is checked for typography; code, schemas and commands legitimately contain straight quotes. */
function proseOf(lesson, withQuiz) {
  const parts = lesson.blocks.filter((block) => PROSE.has(block.type)).map((block) => block.content);
  if (withQuiz) for (const question of lesson.quiz?.questions ?? []) parts.push(question.prompt, question.explanation, ...question.options);
  return parts;
}

/**
 * Words that are always written with an accent in French. Finding one of them without it means an ASCII-only edit stripped the
 * accents of a passage. A word touching a hyphen, a slash, a dot or an underscore is a file name or an identifier and is ignored.
 */
const STRIPPED_WORDS = [
  "deja", "meme", "memes", "apres", "etre", "ete", "reponse", "reponses", "reussi", "reussie", "reussis", "reussir", "executer", "verification",
  "verifier", "evenement", "evenements", "donnee", "donnees", "probleme", "problemes", "systeme", "systemes", "numero", "numeros", "resultat",
  "resultats", "differente", "differents", "differentes", "derniere", "dernieres", "premiere", "premieres", "periode", "periodes", "securite",
  "ecart", "ecarts", "ecrit", "ecrite", "ecrire", "ecris", "etape", "etapes", "interet", "interessant", "interessante", "metier", "metiers",
  "reseau", "reseaux", "requete", "requetes", "tres", "prevue", "prevus", "prevues", "specifique", "specifiques", "equipe", "equipes", "reperer",
  "decision", "decisions", "decider", "egalite", "regle", "regles", "reglage", "regulier", "reguliere", "reguliers", "regulieres", "methode",
  "methodes", "memoire", "modele", "modeles", "theorie", "reel", "reelle", "reels", "reelles", "creer", "difficulte", "necessaire", "necessite",
  "legitime", "legitimes", "completer", "entree", "entrees", "gravite", "criticite", "priorite", "priorites", "probabilite", "duree", "echec",
  "echecs", "reussite", "activite", "detecter", "evaluer", "francais", "caractere", "caracteres", "elevee", "debut", "propriete",
];
const STRIPPED = new RegExp(`(?<![\\p{L}\\p{N}_.\\/\\\\$@-])(?:${STRIPPED_WORDS.join("|")})(?![\\p{L}\\p{N}_.\\/\\\\@-])`, "iu");

function textHygiene(strings, where) {
  const issues = [];
  strings.forEach((value) => {
    if (/[—]/u.test(value)) issues.push(`${where} : tiret cadratin interdit dans « ${value.slice(0, 50)}… »`);
    if (/\p{L}'\p{L}/u.test(value)) issues.push(`${where} : apostrophe droite dans « ${value.slice(0, 50)}… » (utilise ’)`);
    if (/lorem|todo|à compléter|xxx/iu.test(value)) issues.push(`${where} : texte provisoire dans « ${value.slice(0, 50)}… »`);
    if (value.includes("`")) issues.push(`${where} : accent grave dans « ${value.slice(0, 50)}… » (le texte n’est pas interprété comme du Markdown : écris « commande » entre guillemets ou utilise un bloc code)`);
    if (/\*{4,}/u.test(value)) issues.push(`${where} : suite d’astérisques dans « ${value.slice(0, 50)}… » (un secret masqué à l’écran a été recopié : rétablis le texte d’origine)`);
    const stripped = STRIPPED.exec(value);
    if (stripped) issues.push(`${where} : accent manquant sur « ${stripped[0]} » dans « ${value.slice(Math.max(0, stripped.index - 25), stripped.index + 40)} »`);
  });
  return issues;
}

function quizIssues(lesson, level) {
  const issues = [];
  const where = `${lesson.key ?? lesson.title} (quiz)`;
  const quiz = lesson.quiz;
  if (!quiz) return [`${where} : quiz manquant`];
  const items = quiz.questions;
  if (items.length < 3) issues.push(`${where} : au moins 3 questions (${items.length} trouvée${items.length > 1 ? "s" : ""})`);
  items.forEach((question, index) => {
    const label = `${where} Q${index + 1}`;
    if (question.explanation.trim().length < 50) issues.push(`${label} : correction trop courte (50 caractères minimum)`);
    if (question.options.length < 2) issues.push(`${label} : au moins deux options`);
    if (new Set(question.options.map((option) => option.trim().toLowerCase())).size !== question.options.length) issues.push(`${label} : options en double`);
    if (question.prompt.trim().length < 15) issues.push(`${label} : énoncé trop court`);
  });
  if (level === "template" && items.length >= 3) {
    if (new Set(items.map((question) => question.difficulty)).size < 2) issues.push(`${where} : mélange au moins deux niveaux de difficulté`);
    const singles = items.filter((question) => question.type !== "true_false" && !Array.isArray(question.correct)).map((question) => question.correct);
    if (singles.length >= 3 && new Set(singles).size === 1) issues.push(`${where} : la bonne réponse est toujours à la même place`);
  }
  return issues;
}

/**
 * lesson: { key?, title, minutes?, blocks: [{ type, content, url? }], quiz?: { questions: [...] } }
 * options: { level: "base" | "template", allowedUrls?: Set<string>, quizInherited?: boolean }
 * `quizInherited` is for an upgraded starter lesson that keeps the quiz it already had: that quiz is not re-checked.
 */
function lessonIssues(lesson, { level = "base", allowedUrls, quizInherited = false } = {}) {
  const where = lesson.key ?? lesson.title;
  const blocks = lesson.blocks;
  const issues = [];
  const total = blocks.reduce((sum, block) => sum + block.content.length, 0);
  const teaching = blocks.filter((block) => PROSE.has(block.type) && !VIDEO_SLOT.test(block.content)).reduce((sum, block) => sum + block.content.length, 0);

  if (!blocks.length || !startsWith(blocks[0], "Objectifs?")) issues.push(`${where} : le premier bloc doit être « Objectifs : … »`);
  else if (blocks[0].content.length < 70) issues.push(`${where} : objectifs trop vagues (70 caractères minimum)`);
  if (teaching < MIN_BASE_TEXT) issues.push(`${where} : contenu trop court (${teaching} caractères de cours, ${MIN_BASE_TEXT} minimum)`);
  if (!count(blocks, (block) => block.type === "example")) issues.push(`${where} : au moins un exemple`);
  if (!count(blocks, (block) => block.type === "schema" || block.type === "code")) issues.push(`${where} : au moins un schéma ou un bloc de code`);
  if (!count(blocks, (block) => (block.type === "callout" && VIDEO_SLOT.test(block.content)) || block.type === "video")) issues.push(`${where} : prévois l’espace vidéo (« Vidéo à venir : … »)`);
  if (!count(blocks, (block) => startsWith(block, "À retenir"))) issues.push(`${where} : conclus par un bloc « À retenir : … »`);
  const resources = blocks.filter((block) => block.type === "resource");
  if (!resources.length) issues.push(`${where} : au moins une référence (bloc resource)`);
  resources.forEach((block) => {
    if (!/^https:\/\/\S{4,}$/.test(block.url ?? "")) issues.push(`${where} : référence sans adresse https`);
    else if (allowedUrls && !allowedUrls.has(block.url)) issues.push(`${where} : référence hors liste vérifiée ${block.url}`);
  });
  if (!quizInherited) issues.push(...quizIssues(lesson, level));
  issues.push(...textHygiene(proseOf(lesson, !quizInherited), where));
  for (const block of blocks) {
    if (!PROSE.has(block.type) && /\*{6}/u.test(block.content)) issues.push(`${where} : suite d’astérisques dans un bloc ${block.type} (un secret masqué à l’écran a été recopié : rétablis le texte d’origine)`);
    if (block.type === "schema") issues.push(...figureIssues(block.content, where));
  }

  if (level === "template") {
    if (blocks.length < 2 || !startsWith(blocks[1], "Prérequis")) issues.push(`${where} : le deuxième bloc doit être « Prérequis : … »`);
    if (!count(blocks, (block) => startsWith(block, "Mise en situation"))) issues.push(`${where} : ajoute une « Mise en situation : … »`);
    if (!count(blocks, (block) => startsWith(block, "Erreurs fréquentes"))) issues.push(`${where} : ajoute les « Erreurs fréquentes : … »`);
    if (!count(blocks, (block) => startsWith(block, "Pour pratiquer"))) issues.push(`${where} : indique le lab avec « Pour pratiquer : … »`);
    if (total < MIN_TEMPLATE_CHARS) issues.push(`${where} : leçon trop courte pour le gabarit (${total} caractères, ${MIN_TEMPLATE_CHARS} minimum)`);
    if (count(blocks, (block) => block.type === "text") < 3) issues.push(`${where} : au moins trois blocs de cours`);
    if (count(blocks, (block) => block.type === "schema" || block.type === "code") < 2) issues.push(`${where} : au moins deux schémas ou démonstrations`);
    if (resources.length < 2) issues.push(`${where} : au moins deux références`);
    const last = blocks.findIndex((block) => block.type === "resource");
    if (last >= 0 && blocks.slice(last).some((block) => block.type !== "resource")) issues.push(`${where} : place les références en fin de leçon`);
  }
  return issues;
}

function labIssues(lab) {
  const where = `lab ${lab.slug}`;
  const issues = [];
  const minTasks = lab.isAssessment ? 8 : 5;
  if (lab.tasks.length < minTasks) issues.push(`${where} : au moins ${minTasks} tâches (${lab.tasks.length})`);
  if (lab.briefing.length < 120) issues.push(`${where} : briefing trop court`);
  if (lab.objectives.length < 3) issues.push(`${where} : au moins 3 objectifs`);
  if (lab.constraints.length < 1) issues.push(`${where} : au moins une contrainte (cadre et limites)`);
  if (lab.tools.length < 1) issues.push(`${where} : outils manquants`);
  if (lab.hints.length < 2) issues.push(`${where} : au moins 2 indices`);
  if (lab.minutes < 15) issues.push(`${where} : durée estimée trop courte`);
  if (!lab.assets.length) issues.push(`${where} : au moins un fichier de laboratoire`);
  if (lab.format === "pcap" && !lab.assets.some((asset) => asset.kind === "pcap")) issues.push(`${where} : une capture est attendue`);
  if (lab.format === "logs" && !lab.assets.some((asset) => asset.kind === "log")) issues.push(`${where} : un journal est attendu`);
  if (lab.format === "packet_tracer") {
    if (!lab.requiresComputer) issues.push(`${where} : un lab Packet Tracer demande un ordinateur`);
    if (!lab.assets.some((asset) => asset.kind === "guide")) issues.push(`${where} : un guide pas à pas est attendu`);
    if (!lab.assets.some((asset) => asset.kind === "topology")) issues.push(`${where} : un schéma de topologie est attendu`);
  }
  lab.tasks.forEach((task, index) => {
    const label = `${where} tâche ${index + 1}`;
    if (task.prompt.trim().length < 20) issues.push(`${label} : énoncé trop court`);
    if (task.hint.trim().length < 10) issues.push(`${label} : indice manquant`);
    if (!task.answerFormat.trim()) issues.push(`${label} : format de réponse manquant`);
    if (task.explanation.trim().length < 40) issues.push(`${label} : correction trop courte (40 caractères minimum)`);
    if (!task.accepted.length) issues.push(`${label} : aucune réponse acceptée`);
  });
  const prose = [lab.title, lab.description, lab.briefing, ...lab.constraints, ...lab.objectives, ...lab.hints, ...lab.tasks.flatMap((task) => [task.prompt, task.hint, task.explanation])];
  issues.push(...textHygiene(prose, where));
  return issues;
}

function moduleIssues(module) {
  const where = `module ${module.title}`;
  const issues = [];
  if (!module.lessons.length) issues.push(`${where} : aucune leçon`);
  if (!/Critères de réussite\s*:/u.test(module.description)) issues.push(`${where} : décris les « Critères de réussite : … »`);
  if (module.description.length > 1000) issues.push(`${where} : description trop longue (1000 caractères maximum)`);
  issues.push(...textHygiene([module.title, module.description], where));
  return issues;
}

/** Every address the authors may cite, from the kit (the only addresses that were verified). */
function allowedReferenceUrls(references) {
  return new Set(Object.values(references).map((entry) => entry.url));
}

/** Courses whose lessons must all meet the checklist: they are the ones declared finished. */
const ENFORCED_COURSES = ["reseaux", "fondamentaux", "linux", "analyse-logs", "securite-web", "pentest-intro"];

/** The programme planned for each course in the specification of the six paths (modules and indicative hours). */
const PLAN = {
  fondamentaux: { modules: 8, hours: "25 à 35" },
  reseaux: { modules: 9, hours: "45 à 60" },
  linux: { modules: 9, hours: "40 à 55" },
  "securite-web": { modules: 10, hours: "45 à 65" },
  "pentest-intro": { modules: 10, hours: "50 à 70" },
  "analyse-logs": { modules: 10, hours: "40 à 60" },
};

module.exports = { lessonIssues, labIssues, moduleIssues, quizIssues, textHygiene, figureIssues, allowedReferenceUrls, ENFORCED_COURSES, PLAN, MIN_BASE_TEXT, MIN_TEMPLATE_CHARS };
