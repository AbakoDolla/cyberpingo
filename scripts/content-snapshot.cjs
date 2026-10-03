// Reads what the seeds publish, in the shape the publication checklist (scripts/content-quality.cjs) expects.
// Shared by tests/content-quality.test.cjs and scripts/content-report.cjs.

const { load } = require("./ts-loader.cjs");
const { contentId } = require("./generate-content-seed.cjs");

const rows = async (db, text, params = []) => (await db.query(text, params)).rows;

/** The authoring files of every finished programme: each one is split in parts "a" to "d" (see docs/CONTENU.md). */
const PROGRAMMES = ["reseaux-programme", "fondamentaux-programme", "linux-programme"];

/** Lessons written with the full lesson template (the programme parts), found by their id. */
function templateLessonIds() {
  const ids = new Set();
  for (const programme of PROGRAMMES) {
    for (const part of ["a", "b", "c", "d"]) {
      const { modules } = load(`supabase/seed/content/${programme}-${part}`);
      for (const entry of modules) for (const lesson of entry.lessons) if (!lesson.existing) ids.add(contentId("lesson", lesson.key));
    }
  }
  return ids;
}

/** Every lesson with its blocks and its quiz, in teaching order. */
async function readLessons(db) {
  const lessons = await rows(db, `select l.id, l.title, l.content, c.slug as course
    from public.lessons l join public.courses c on c.id = l.course_id join public.course_modules m on m.id = l.module_id
    order by c.position, m.position, l.position`);
  const questions = await rows(db, `select q.id, z.lesson_id, q.question_type, q.prompt, q.explanation, q.difficulty
    from public.quiz_questions q join public.quizzes z on z.id = q.quiz_id order by z.id, q.position`);
  const answers = await rows(db, "select question_id, label, is_correct from public.quiz_answers order by question_id, position");
  const byQuestion = new Map();
  for (const answer of answers) byQuestion.set(answer.question_id, [...(byQuestion.get(answer.question_id) ?? []), answer]);
  const byLesson = new Map();
  for (const question of questions) {
    const list = byQuestion.get(question.id);
    const correct = list.flatMap((answer, index) => (answer.is_correct ? [index] : []));
    const entry = {
      type: question.question_type, prompt: question.prompt, options: list.map((answer) => answer.label),
      correct: question.question_type === "multiple_choice" ? correct : correct[0], explanation: question.explanation, difficulty: question.difficulty,
    };
    byLesson.set(question.lesson_id, [...(byLesson.get(question.lesson_id) ?? []), entry]);
  }
  return lessons.map((lesson) => ({
    id: lesson.id, title: lesson.title, course: lesson.course, blocks: lesson.content.blocks,
    quiz: byLesson.has(lesson.id) ? { questions: byLesson.get(lesson.id) } : undefined,
  }));
}

/** One line of figures per published course, for the status report. */
async function readCourseStats(db) {
  return rows(db, `select c.slug, c.title, c.estimated_duration,
      (select count(*)::int from public.course_modules m where m.course_id = c.id) as modules,
      (select count(*)::int from public.lessons l where l.course_id = c.id) as lessons,
      (select count(*)::int from public.quizzes q where q.course_id = c.id) as quizzes,
      (select count(*)::int from public.labs b where b.course_id = c.id and b.status = 'published'
         and exists (select 1 from public.lab_tasks t where t.lab_id = b.id)) as labs,
      (select count(*)::int from public.labs b where b.course_id = c.id and b.status = 'published' and b.is_assessment) as assessments,
      (select count(*)::int from public.lab_tasks t join public.labs b on b.id = t.lab_id where b.course_id = c.id) as tasks,
      (select count(distinct k.skill_id)::int from public.skill_links k
         where k.lesson_id in (select id from public.lessons where course_id = c.id)) as skills
    from public.courses c where c.status = 'published' order by c.position`);
}

module.exports = { readLessons, readCourseStats, templateLessonIds, PROGRAMMES };
