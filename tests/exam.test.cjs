// Database tests for final certification exams and certificate issuance condition (70%).
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { contentId } = require("../scripts/generate-content-seed.cjs");
const { createSupabaseDatabase } = require("../scripts/pglite-supabase.cjs");

let db;
const ids = {};
const course = (key) => contentId("course", key);
const lesson = (key) => contentId("lesson", key);
const quiz = (key) => contentId("quiz", key);

async function as(uid, sql, params = []) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.headers', '', false)", [uid ?? ""]);
  await db.exec(`set role ${uid ? "authenticated" : "anon"}`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}
const one = async (uid, sql, params) => (await as(uid, sql, params))[0];
const rpc = async (uid, fn, args = {}) => {
  const names = Object.keys(args);
  const call = `select public.${fn}(${names.map((name, index) => `${name} => $${index + 1}`).join(", ")}) as r`;
  return (await one(uid, call, names.map((name) => args[name]))).r;
};
const rejects = (promise, pattern) => assert.rejects(promise, pattern);
const sql = async (text, params = []) => (await db.query(text, params)).rows;

async function createUser(email, meta = {}) {
  const [row] = await sql("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [email, meta]);
  return row.id;
}

async function studyLesson(uid, key) {
  await rpc(uid, "start_lesson", { p_lesson_id: lesson(key) });
  await sql("update public.lesson_progress set started_at = now() - interval '60 seconds' where user_id = $1 and lesson_id = $2", [uid, lesson(key)]);
  return rpc(uid, "complete_lesson", { p_lesson_id: lesson(key) });
}

async function answerKey(quizId) {
  const rows = await sql(`
    select q.id as question, (array_agg(a.id order by a.position) filter (where a.is_correct))[1] as answer
    from public.quiz_questions q join public.quiz_answers a on a.question_id = q.id
    where q.quiz_id = $1 group by q.id, q.position order by q.position`, [quizId]);
  return Object.fromEntries(rows.map((row) => [row.question, [row.answer]]));
}

async function createMiniCourse() {
  const courseKey = course("mini-exam");
  const moduleId = contentId("module", "mini-exam:1");
  await sql(`insert into public.courses (id, slug, title, short_description, description, level, category, icon, estimated_duration, position, exam_pass_percentage, exam_question_count)
    values ($1, 'parcours-exam-test', 'Parcours Exam Test', 'Deux leçons et quiz.', 'Test examen.', 'debutant', 'Fondamentaux', 'fondamentaux', 30, 99, 70, 4)`, [courseKey]);
  await sql("insert into public.course_modules (id, course_id, title, description, position) values ($1, $2, 'Module Examen', 'Module unique.', 1)", [moduleId, courseKey]);

  for (const [index, key] of ["exam-l1", "exam-l2"].entries()) {
    await sql(`insert into public.lessons (id, course_id, module_id, title, summary, content, duration_minutes, xp_reward, position)
      values ($1, $2, $3, $4, 'Leçon test.', $5, 10, 50, $6)`,
    [lesson(key), courseKey, moduleId, `Leçon Examen ${index + 1}`, { blocks: [{ type: "text", content: "Contenu." }] }, index + 1]);
  }

  const quizId = quiz("exam-q1");
  await sql("insert into public.quizzes (id, course_id, module_id, lesson_id, title, pass_percentage, position) values ($1, $2, $3, $4, 'Quiz Examen', 70, 2)",
    [quizId, courseKey, moduleId, lesson("exam-l2")]);

  for (let i = 1; i <= 6; i++) {
    const questionId = contentId("question", `exam-q:${i}`);
    await sql(`insert into public.quiz_questions (id, quiz_id, position, question_type, prompt, explanation, difficulty, xp_reward)
      values ($1, $2, $3, 'single_choice', $4, 'Explication ${i}', 'facile', 10)`, [questionId, quizId, i, `Question d'examen ${i} ?`]);
    await sql("insert into public.quiz_answers (id, question_id, position, label, is_correct) values ($1, $2, 1, 'Bonne', true)",
      [contentId("answer", `exam-q:${i}:1`), questionId]);
    await sql("insert into public.quiz_answers (id, question_id, position, label, is_correct) values ($1, $2, 2, 'Mauvaise', false)",
      [contentId("answer", `exam-q:${i}:2`), questionId]);
  }

  await sql("update public.courses set status = 'published' where id = $1", [courseKey]);
}

before(async () => {
  db = await createSupabaseDatabase({ seed: true, economy: "open" });
  ids.student = await createUser("student.exam@example.test", { display_name: "Élève Examen" });
  ids.admin = await createUser("admin.exam@example.test", { display_name: "Admin Examen" });
  await sql("update public.profiles set role = 'admin' where id = $1", [ids.admin]);
  await createMiniCourse();
});

after(async () => { await db?.close(); });

test("exam cannot be started until course lessons and quizzes are completed", async () => {
  const courseId = course("mini-exam");
  const status = await rpc(ids.student, "get_course_exam_status", { p_course_id: courseId });
  assert.equal(status.course_completed, false);
  assert.equal(status.can_take_exam, false);
  assert.equal(status.pass_percentage, 70);

  await rejects(rpc(ids.student, "start_course_exam", { p_course_id: courseId }), /Termine toutes les leçons/);
});

test("admin can preview and start exam even if not enrolled", async () => {
  const courseId = course("mini-exam");
  const status = await rpc(ids.admin, "get_course_exam_status", { p_course_id: courseId });
  assert.equal(status.can_take_exam, true);

  const exam = await rpc(ids.admin, "start_course_exam", { p_course_id: courseId });
  assert.equal(exam.total_questions, 4);
  assert.equal(exam.questions.length, 4);
  assert.ok(exam.attempt_id);
});

test("completing the course unlocks the final exam without automatically creating a certificate", async () => {
  const courseId = course("mini-exam");
  await studyLesson(ids.student, "exam-l1");
  await studyLesson(ids.student, "exam-l2");
  await rpc(ids.student, "submit_quiz", { p_quiz_id: quiz("exam-q1"), p_answers: await answerKey(quiz("exam-q1")) });

  const status = await rpc(ids.student, "get_course_exam_status", { p_course_id: courseId });
  assert.equal(status.course_completed, true);
  assert.equal(status.can_take_exam, true);
  assert.equal(status.certificate, null, "certificate must NOT be issued on course completion alone");

  const [cert] = await sql("select * from public.certificates where user_id = $1 and course_id = $2", [ids.student, courseId]);
  assert.equal(cert, undefined);
});

test("failing the exam (< 70%) records the attempt but does not grant certificate", async () => {
  const courseId = course("mini-exam");
  const exam = await rpc(ids.student, "start_course_exam", { p_course_id: courseId });

  // Answer all wrong
  const answers = {};
  for (const q of exam.questions) {
    const wrongOpt = q.options.find(opt => opt.label === "Mauvaise");
    answers[q.id] = [wrongOpt.id];
  }

  const result = await rpc(ids.student, "submit_course_exam", { p_attempt_id: exam.attempt_id, p_answers: answers });
  assert.equal(result.score, 0);
  assert.equal(result.passed, false);
  assert.equal(result.percentage, 0);
  assert.equal(result.certificate, null);

  const status = await rpc(ids.student, "get_course_exam_status", { p_course_id: courseId });
  assert.equal(status.attempts_count, 1);
  assert.equal(status.certificate, null);
});

test("passing the exam (>= 70%) grants the certificate with percentage", async () => {
  const courseId = course("mini-exam");
  const exam = await rpc(ids.student, "start_course_exam", { p_course_id: courseId });

  // Answer all right
  const answers = {};
  for (const q of exam.questions) {
    const rightOpt = q.options.find(opt => opt.label === "Bonne");
    answers[q.id] = [rightOpt.id];
  }

  const result = await rpc(ids.student, "submit_course_exam", { p_attempt_id: exam.attempt_id, p_answers: answers });
  assert.equal(result.score, 4);
  assert.equal(result.passed, true);
  assert.equal(result.percentage, 100);
  assert.ok(result.certificate);
  assert.equal(result.certificate.exam_percentage, 100);

  const status = await rpc(ids.student, "get_course_exam_status", { p_course_id: courseId });
  assert.ok(status.certificate);
  assert.equal(status.certificate.exam_percentage, 100);

  // Check public verification includes exam percentage
  const verification = await rpc(null, "verify_certificate", { p_code: status.certificate.verification_code });
  assert.equal(verification.found, true);
  assert.equal(verification.valid, true);
  assert.equal(verification.exam_percentage, 100);
});
