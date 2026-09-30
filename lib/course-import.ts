import type { AdminQuizQuestion, CourseImport, Difficulty, LessonBlock, QuestionType, SkillLevel } from "@/types/api";

const LEVELS: SkillLevel[] = ["debutant", "intermediaire", "avance"];
const DIFFICULTIES: Difficulty[] = ["facile", "moyen", "difficile"];
const QUESTION_TYPES: QuestionType[] = ["single_choice", "multiple_choice", "true_false"];
const TEXT_BLOCKS = new Set(["text", "heading", "schema", "example", "callout"]);
const MEDIA_BLOCKS = new Set(["video", "image", "resource"]);

type Loose = Record<string, unknown>;
const isRecord = (value: unknown): value is Loose => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

function text(value: unknown, max: number, fallback = "") {
  const clean = typeof value === "string" ? value.trim() : "";
  return (clean || fallback).slice(0, max);
}

function integer(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

export function slugifyCourse(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/g, "") || "cours";
}

function normalizeBlock(value: unknown): LessonBlock | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  if (value.type === "code") {
    const content = text(value.content, 20_000);
    if (!content) return null;
    const language = text(value.language, 30);
    return { type: "code", content, ...(language ? { language } : {}) };
  }
  if (TEXT_BLOCKS.has(value.type)) {
    const content = text(value.content, 20_000);
    return content ? { type: value.type as "text", content } : null;
  }
  if (MEDIA_BLOCKS.has(value.type)) {
    const url = text(value.url, 2_000);
    if (!/^https:\/\/\S+$/.test(url)) return null;
    const content = text(value.content, 500);
    return { type: value.type as "video", url, ...(content ? { content } : {}) };
  }
  return null;
}

function normalizeAnswers(value: unknown, type: QuestionType) {
  const answers = list(value).map((answer) => {
    if (isRecord(answer)) return { label: text(answer.label ?? answer.content, 500), is_correct: Boolean(answer.is_correct ?? answer.correct) };
    return { label: text(answer, 500), is_correct: false };
  }).filter((answer) => answer.label).slice(0, 8);
  const fallback = type === "true_false"
    ? [{ label: "Vrai", is_correct: true }, { label: "Faux", is_correct: false }]
    : [{ label: "Réponse A", is_correct: true }, { label: "Réponse B", is_correct: false }];
  const normalized = answers.length >= 2 ? answers : fallback;
  if (!normalized.some((answer) => answer.is_correct)) normalized[0] = { ...normalized[0], is_correct: true };
  if (type === "true_false") return normalized.slice(0, 2).map((answer, index) => ({ ...answer, label: answer.label || (index === 0 ? "Vrai" : "Faux"), is_correct: index === normalized.findIndex((item) => item.is_correct) }));
  if (type === "single_choice") {
    let used = false;
    return normalized.map((answer) => {
      const correct = answer.is_correct && !used;
      if (correct) used = true;
      return { ...answer, is_correct: correct };
    });
  }
  return normalized;
}

function normalizeQuestion(value: unknown, index: number): AdminQuizQuestion | null {
  if (!isRecord(value)) return null;
  const rawType = value.question_type ?? value.type;
  const questionType = QUESTION_TYPES.find((type) => type === rawType) ?? (rawType === "qcm" ? "single_choice" : "single_choice");
  const prompt = text(value.prompt ?? value.question, 1_500, `Question ${index + 1}`);
  const answers = normalizeAnswers(value.answers ?? value.options, questionType);
  return {
    question_type: questionType,
    prompt,
    image_url: text(value.image_url, 2_000) || null,
    explanation: text(value.explanation, 2_000),
    difficulty: DIFFICULTIES.find((difficulty) => difficulty === value.difficulty) ?? "facile",
    xp_reward: integer(value.xp_reward ?? value.xpReward, 0, 500, 10),
    answers,
  };
}

function normalizeQuiz(value: unknown, fallbackTitle: string): { title?: string; description?: string; pass_percentage?: number; questions: AdminQuizQuestion[] } | undefined {
  if (!isRecord(value)) return undefined;
  const questions = list(value.questions).map(normalizeQuestion).filter((item): item is AdminQuizQuestion => item !== null).slice(0, 50);
  if (!questions.length) return undefined;
  return {
    title: text(value.title, 160, fallbackTitle),
    description: text(value.description, 1_000),
    pass_percentage: integer(value.pass_percentage ?? value.passPercentage, 1, 100, 70),
    questions,
  };
}

export function normalizeCourseImport(input: unknown): CourseImport {
  const source = isRecord(input) && isRecord(input.course) ? input.course : input;
  if (!isRecord(source)) throw new Error("Le JSON généré doit contenir un objet cours.");
  const title = text(source.title, 160, "Cours importé");
  const modules = list(source.modules).map((rawModule, moduleIndex) => {
    const moduleSource = isRecord(rawModule) ? rawModule : {};
    const moduleTitle = text(moduleSource.title, 160, `Module ${moduleIndex + 1}`);
    const lessons = list(moduleSource.lessons).map((rawLesson, lessonIndex) => {
      const lesson = isRecord(rawLesson) ? rawLesson : {};
      const lessonTitle = text(lesson.title, 160, `Leçon ${lessonIndex + 1}`);
      const blocks = list(lesson.blocks ?? (isRecord(lesson.content) ? lesson.content.blocks : undefined))
        .map(normalizeBlock)
        .filter((block): block is LessonBlock => block !== null)
        .slice(0, 80);
      const safeBlocks = blocks.length ? blocks : [{ type: "text" as const, content: text(lesson.summary, 800, "Contenu à compléter par l’équipe pédagogique.") }];
      return {
        title: lessonTitle,
        summary: text(lesson.summary, 500),
        content_type: text(lesson.content_type ?? lesson.contentType, 40, "article"),
        blocks: safeBlocks,
        duration_minutes: integer(lesson.duration_minutes ?? lesson.durationMinutes, 1, 240, 10),
        xp_reward: integer(lesson.xp_reward ?? lesson.xpReward, 0, 500, 50),
        quiz: normalizeQuiz(lesson.quiz, `Quiz — ${lessonTitle}`),
      };
    }).filter((lesson) => lesson.title).slice(0, 40);
    return {
      title: moduleTitle,
      description: text(moduleSource.description, 1_000),
      lessons: lessons.length ? lessons : [{ title: "Leçon à compléter", summary: "", content_type: "article", blocks: [{ type: "text" as const, content: "Contenu à compléter." }], duration_minutes: 10, xp_reward: 50 }],
      quiz: normalizeQuiz(moduleSource.quiz, `Révision — ${moduleTitle}`),
    };
  }).slice(0, 30);
  if (!modules.length) throw new Error("Le cours importé doit contenir au moins un module.");
  return {
    title,
    slug: slugifyCourse(text(source.slug, 80, title)),
    short_description: text(source.short_description ?? source.shortDescription ?? source.description, 280, "Cours généré depuis un document source."),
    description: text(source.description, 4_000, "Cours généré depuis un document source."),
    level: LEVELS.find((level) => level === source.level) ?? "debutant",
    category: text(source.category, 80, "Fondamentaux"),
    icon: text(source.icon, 60, "fondamentaux"),
    modules,
  };
}

export function parseCourseImportJson(json: string): CourseImport {
  return normalizeCourseImport(JSON.parse(json) as unknown);
}

export function validateAdminQuizQuestions(questions: AdminQuizQuestion[]): string | null {
  if (!questions.length) return "Ajoute au moins une question.";
  for (const [index, question] of questions.entries()) {
    const number = index + 1;
    if (!question.prompt.trim()) return `Question ${number} : renseigne l’intitulé.`;
    if (question.answers.length < 2) return `Question ${number} : ajoute au moins deux réponses.`;
    const correct = question.answers.filter((answer) => answer.is_correct).length;
    if (correct === 0) return `Question ${number} : coche au moins une bonne réponse.`;
    if ((question.question_type === "single_choice" || question.question_type === "true_false") && correct !== 1) return `Question ${number} : une seule bonne réponse est attendue.`;
    if (question.question_type === "true_false" && question.answers.length !== 2) return `Question ${number} : vrai/faux attend exactement deux réponses.`;
  }
  return null;
}