import type {
  ChallengeCategory, LessonBlock, PublishedChallenge, PublishedCourse, PublishedLesson, PublishedQuestion, PublishedQuiz, SkillLevel,
} from "@/types";

const levels: SkillLevel[] = ["debutant", "intermediaire", "avance"];
const categories: ChallengeCategory[] = ["reseau", "linux", "web", "cryptographie", "osint", "securite"];
const blockTypes: LessonBlock["type"][] = ["text", "schema", "video", "code", "example"];
const PUBLISHED_ID = /^pub-[a-z0-9-]{3,40}$/;

type Loose = Record<string, unknown>;
const record = (value: unknown): Loose => (value && typeof value === "object" && !Array.isArray(value) ? value as Loose : {});
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};
function text(value: unknown, max: number, fallback = "") {
  const clean = typeof value === "string" ? value.trim() : "";
  return (clean || fallback).slice(0, max);
}
const strings = (value: unknown, maxItems: number, maxLength: number) =>
  list(value).map((item) => text(item, maxLength)).filter(Boolean).slice(0, maxItems);

export function slugify(value: string) {
  const slug = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.slice(0, 48).replace(/-+$/g, "") || "contenu";
}

export function newPublishedId(now = Date.now(), random = Math.random) {
  return `pub-${now.toString(36)}-${Math.floor(random() * 36 ** 4).toString(36).padStart(4, "0")}`;
}

/** Published IDs are namespaced so they can never replace a catalogue lesson, quiz or challenge. */
function publishedId(value: unknown, makeId: () => string) {
  return typeof value === "string" && PUBLISHED_ID.test(value) ? value : makeId();
}
const publishedSlug = (title: string, id: string) => `${slugify(title)}-${id.slice(4)}`;
const isoDate = (value: unknown, now: Date) => (typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : now.toISOString());

function normalizeBlocks(value: unknown): LessonBlock[] {
  return list(value).map(record).flatMap((block) => {
    const type = blockTypes.find((item) => item === block.type);
    const content = text(block.content, 20_000);
    if (!type || !content) return [];
    const language = text(block.language, 30);
    return [{ type, content, ...(language ? { language } : {}) }];
  }).slice(0, 40);
}

function normalizeQuestions(value: unknown, quizId: string): PublishedQuestion[] {
  return list(value).map(record).flatMap((question) => {
    const options = [...new Set(strings(question.options, 6, 300))];
    const correctAnswer = text(question.correctAnswer, 300);
    const prompt = text(question.prompt, 1000);
    if (!prompt || options.length < 2 || !options.includes(correctAnswer)) return [];
    return [{
      id: "",
      type: question.type === "vrai_faux" ? "vrai_faux" as const : "qcm" as const,
      prompt,
      options,
      correctAnswer,
      explanation: text(question.explanation, 2000),
    }];
  }).slice(0, 20).map((question, index) => ({ ...question, id: `${quizId}-${index + 1}` }));
}

/**
 * Cleans an AI-generated or edited course before it is stored. The function is idempotent:
 * normalizing an already normalized course returns the same identifiers and links.
 */
export function normalizePublishedCourse(input: unknown, options: { now?: Date; makeId?: () => string } = {}): PublishedCourse {
  const now = options.now ?? new Date();
  const source = record(input);
  const id = publishedId(source.id, options.makeId ?? (() => newPublishedId(now.getTime())));
  const title = text(source.title, 160, "Cours publié");
  const rawLessons = list(source.lessons).map(record).slice(0, 20);
  const rawQuizzes = list(source.quizzes).map(record).slice(0, 20);

  const lessonIds = new Map<string, string>();
  rawLessons.forEach((lesson, index) => { if (typeof lesson.id === "string") lessonIds.set(lesson.id, `${id}-l${index + 1}`); });
  const quizIds = new Map<string, string>();
  rawQuizzes.forEach((quiz, index) => { if (typeof quiz.id === "string") quizIds.set(quiz.id, `${id}-q${index + 1}`); });

  const quizzes: PublishedQuiz[] = rawQuizzes.flatMap((quiz, index) => {
    const quizId = `${id}-q${index + 1}`;
    const questions = normalizeQuestions(quiz.questions, quizId);
    const lessonId = typeof quiz.lessonId === "string" ? lessonIds.get(quiz.lessonId) : undefined;
    if (!questions.length || !lessonId) return [];
    return [{ id: quizId, lessonId, title: text(quiz.title, 160, `Quiz — ${title}`), questions, xpReward: clampNumber(quiz.xpReward, 0, 500, 80) }];
  });
  const validQuizzes = new Set(quizzes.map((quiz) => quiz.id));

  const lessons: PublishedLesson[] = rawLessons.map((lesson, index) => {
    const lessonId = `${id}-l${index + 1}`;
    const linked = typeof lesson.quizId === "string" ? quizIds.get(lesson.quizId) : undefined;
    const quizId = linked && validQuizzes.has(linked) ? linked : quizzes.find((quiz) => quiz.lessonId === lessonId)?.id;
    return {
      id: lessonId,
      courseId: id,
      title: text(lesson.title, 160, `Leçon ${index + 1}`),
      order: index + 1,
      durationMinutes: clampNumber(lesson.durationMinutes, 1, 240, 10),
      xpReward: clampNumber(lesson.xpReward, 0, 300, 50),
      blocks: normalizeBlocks(lesson.blocks),
      ...(quizId ? { quizId } : {}),
      completed: false,
    };
  });
  if (!lessons.length) throw new Error("Le cours doit contenir au moins une leçon.");

  return {
    id,
    slug: publishedSlug(title, id),
    title,
    description: text(source.description, 600, "Cours publié par l’équipe CyberPingo."),
    level: levels.find((level) => level === source.level) ?? "debutant",
    category: text(source.category, 60, "Cybersécurité"),
    durationMinutes: clampNumber(source.durationMinutes, 5, 1200, lessons.reduce((total, lesson) => total + lesson.durationMinutes, 0)),
    icon: text(source.icon, 60, "courses"),
    locked: false,
    lessons,
    quizzes,
    publishedAt: isoDate(source.publishedAt, now),
    sourceFileName: text(source.sourceFileName, 200, "document"),
    aiAnalysis: text(source.aiAnalysis, 2000),
  };
}

/** Cleans a challenge draft. The expected answer is kept for the admin; the database strips it on publish. */
export function normalizePublishedChallenge(input: unknown, options: { now?: Date; makeId?: () => string } = {}): PublishedChallenge {
  const now = options.now ?? new Date();
  const source = record(input);
  const id = publishedId(source.id, options.makeId ?? (() => newPublishedId(now.getTime())));
  const title = text(source.title, 160, "Challenge publié");
  return {
    id,
    slug: publishedSlug(title, id),
    title,
    description: text(source.description, 2000, "Challenge pratique publié par l’équipe CyberPingo."),
    category: categories.find((category) => category === source.category) ?? "securite",
    difficulty: levels.find((level) => level === source.difficulty) ?? "debutant",
    xpReward: clampNumber(source.xpReward, 0, 1000, 100),
    status: "disponible",
    objectives: strings(source.objectives, 12, 500),
    hints: strings(source.hints, 12, 500),
    terminalLines: strings(source.terminalLines, 60, 500),
    flagPlaceholder: text(source.flagPlaceholder, 120, "Ta réponse"),
    expectedAnswer: text(source.expectedAnswer, 200),
    publishedAt: isoDate(source.publishedAt, now),
    sourceFileName: text(source.sourceFileName, 200, "document"),
  };
}
