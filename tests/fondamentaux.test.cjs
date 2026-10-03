// Tests of the Fondamentaux programme seed (supabase/seed/06_fondamentaux_programme.sql): the reorganisation of the
// published course never deletes or overwrites anything, the lab files and answer keys are consistent with what the database
// stores, and a learner can complete the whole programme and earn every skill and badge.
// (The answer keys are recomputed from the lab files, independently of the generators, in tests/fondamentaux-labs-a|b.test.cjs.)
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { contentId } = require("../scripts/generate-content-seed.cjs");
const { createSupabaseDatabase } = require("../scripts/pglite-supabase.cjs");
const { root } = require("../scripts/ts-loader.cjs");

const SEED_DIR = path.join(root, "supabase", "seed");
const seed = (name) => fs.readFileSync(path.join(SEED_DIR, name), "utf8");
const course = (key) => contentId("course", key);
const module_ = (key) => contentId("module", key);
const lesson = (key) => contentId("lesson", key);
const lab = (key) => contentId("lab", key);

const opened = [];
async function open({ upTo }) {
  const db = await createSupabaseDatabase({ seed: false });
  opened.push(db);
  for (const file of fs.readdirSync(SEED_DIR).filter((name) => name.endsWith(".sql")).sort()) {
    if (file < upTo || file === upTo) await db.exec(seed(file));
  }
  return db;
}
after(async () => { for (const db of opened) await db.close(); });

function helpers(db) {
  const sql = async (text, params = []) => (await db.query(text, params)).rows;
  async function as(uid, text, params = []) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.headers', '', false)", [uid ?? ""]);
    await db.exec(`set role ${uid ? "authenticated" : "anon"}`);
    try {
      return (await db.query(text, params)).rows;
    } finally {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub', '', false)");
    }
  }
  const rpc = async (uid, fn, args = {}) => {
    const names = Object.keys(args);
    const call = `select public.${fn}(${names.map((name, index) => `${name} => $${index + 1}`).join(", ")}) as r`;
    return (await as(uid, call, names.map((name) => args[name])))[0].r;
  };
  async function createUser(email) {
    return (await sql("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [email, { display_name: email.split("@")[0] }]))[0].id;
  }
  async function study(uid, id) {
    await rpc(uid, "start_lesson", { p_lesson_id: id });
    await sql("update public.lesson_progress set started_at = now() - interval '60 seconds' where user_id = $1 and lesson_id = $2", [uid, id]);
    return rpc(uid, "complete_lesson", { p_lesson_id: id });
  }
  async function passQuiz(uid, quizId) {
    const rows = await sql(`select q.id as question, (array_agg(a.id order by a.position) filter (where a.is_correct)) as answers
      from public.quiz_questions q join public.quiz_answers a on a.question_id = q.id where q.quiz_id = $1 group by q.id`, [quizId]);
    return rpc(uid, "submit_quiz", { p_quiz_id: quizId, p_answers: Object.fromEntries(rows.map((row) => [row.question, row.answers])) });
  }
  async function solveLab(uid, labId) {
    const tasks = await sql(`select t.id, k.accepted from public.lab_tasks t join private.lab_task_keys k on k.task_id = t.id where t.lab_id = $1 order by t.position`, [labId]);
    let result;
    for (const task of tasks) result = await rpc(uid, "submit_lab_task", { p_task_id: task.id, p_answer: task.accepted[0] });
    return result;
  }
  return { sql, as, rpc, createUser, study, passQuiz, solveLab };
}

test("the programme reorganises the published Fondamentaux course without deleting or overwriting anything", async () => {
  const db = await open({ upTo: "05_reseaux_programme.sql" });
  const { sql, rpc, createUser, study, passQuiz } = helpers(db);

  const before = await sql("select id, title from public.lessons where course_id = $1 order by title", [course("c1")]);
  assert.equal(before.length, 3);
  const acteurs = lesson("l-c1-3");
  const starterQuiz = (await sql("select id from public.quizzes where lesson_id = $1", [acteurs]))[0].id;
  const starterQuestions = await sql("select id, explanation from public.quiz_questions where quiz_id = $1 order by position", [starterQuiz]);
  assert.equal(starterQuestions.length, 2);

  const awa = await createUser("awa@example.test");
  await study(awa, acteurs);
  assert.equal((await passQuiz(awa, starterQuiz)).passed, true, "the starter quiz is passed before the migration");

  // An administrator edited a starter lesson, renamed a module and rewrote one starter explanation: the seed must respect all three.
  await sql("update public.lessons set content = $1 where id = $2", [{ blocks: [{ type: "text", content: "Version éditée par l’équipe." }] }, lesson("l-c1-2")]);
  await sql("update public.course_modules set title = 'Écosystème (édité)' where id = $1", [module_("c1:2")]);
  await sql("update public.quiz_questions set explanation = 'Explication réécrite par l’équipe pédagogique.' where id = $1", [starterQuestions[1].id]);

  await db.exec(seed("06_fondamentaux_programme.sql"));

  const after_ = await sql("select id, title from public.lessons where course_id = $1", [course("c1")]);
  assert.equal(after_.length, 24);
  for (const row of before) assert.ok(after_.some((entry) => entry.id === row.id), `la leçon « ${row.title} » existe toujours avec le même identifiant`);

  const [intro] = await sql("select jsonb_array_length(content -> 'blocks') as blocks from public.lessons where id = $1", [lesson("l-c1-1")]);
  assert.ok(intro.blocks >= 15, "the untouched starter lesson was upgraded");
  const [edited] = await sql("select content -> 'blocks' -> 0 ->> 'content' as first from public.lessons where id = $1", [lesson("l-c1-2")]);
  assert.equal(edited.first, "Version éditée par l’équipe.", "an edited starter lesson is never overwritten");

  const modules = await sql("select id, title, position from public.course_modules where course_id = $1 order by position", [course("c1")]);
  assert.deepEqual(modules.map((entry) => entry.position), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(modules[0].title, "Comprendre la cybersécurité");
  assert.equal(modules.find((entry) => entry.id === module_("c1:2")).title, "Écosystème (édité)", "a module renamed by an administrator keeps its name");
  assert.equal(modules[7].title, "Réagir à un incident");

  assert.equal((await sql("select id from public.quizzes where lesson_id = $1", [acteurs]))[0].id, starterQuiz, "the quiz of the lesson is still the same quiz");
  const questions = await sql("select id, position, explanation from public.quiz_questions where quiz_id = $1 order by position", [starterQuiz]);
  assert.equal(questions.length, 4, "two questions are appended to the starter quiz");
  assert.deepEqual(questions.map((entry) => entry.position), [1, 2, 3, 4]);
  assert.equal(questions[0].id, starterQuestions[0].id);
  assert.notEqual(questions[0].explanation, starterQuestions[0].explanation, "an untouched short explanation is completed");
  assert.equal(questions[1].explanation, "Explication réécrite par l’équipe pédagogique.", "an edited explanation is never overwritten");
  assert.equal((await sql("select count(*)::int as n from public.quiz_attempts where quiz_id = $1 and user_id = $2 and passed", [starterQuiz, awa]))[0].n, 1, "the learner’s attempt is kept");
  assert.equal((await sql("select status from public.lesson_progress where lesson_id = $1 and user_id = $2", [acteurs, awa]))[0].status, "completed");

  const orphans = await sql("select count(*)::int as n from public.quizzes q join public.lessons l on l.id = q.lesson_id where q.module_id <> l.module_id");
  assert.equal(orphans[0].n, 0, "a quiz always follows its lesson");
  const [texts] = await sql("select short_description, description, estimated_duration from public.courses where id = $1", [course("c1")]);
  assert.match(texts.description, /Huit modules progressifs/);
  const [{ total }] = await sql("select sum(duration_minutes)::int as total from public.lessons where course_id = $1", [course("c1")]);
  assert.equal(texts.estimated_duration, total, "the displayed duration is the sum of the lessons");

  // Running the seed again changes nothing.
  const snapshot = async () => JSON.stringify(await sql(`select
    (select count(*) from public.lessons) as lessons, (select count(*) from public.quiz_questions) as questions, (select count(*) from public.quiz_answers) as answers,
    (select count(*) from public.labs) as labs, (select count(*) from public.lab_tasks) as tasks, (select count(*) from public.skills) as skills,
    (select count(*) from public.skill_links) as links, (select count(*) from public.badges) as badges, (select sum(jsonb_array_length(content -> 'blocks')) from public.lessons) as blocks`));
  const first = await snapshot();
  await db.exec(seed("06_fondamentaux_programme.sql"));
  assert.equal(await snapshot(), first);
  assert.equal((await rpc(awa, "get_my_academy")).skills.length, 29);
});

test("the starter lessons are left untouched when the programme is loaded twice in a row from scratch", async () => {
  const db = await open({ upTo: "06_fondamentaux_programme.sql" });
  const { sql } = helpers(db);
  const [{ n }] = await sql("select count(*)::int as n from public.lessons where course_id = $1", [course("c1")]);
  assert.equal(n, 24);
  const slugs = (await sql("select slug from public.labs where course_id = $1 order by position", [course("c1")])).map((row) => row.slug);
  assert.deepEqual(slugs, ["tp-analyse-phishing", "tp-audit-mots-de-passe", "tp-hygiene-postes", "tp-integrite-chiffrement", "tp-registre-risques", "incident-compte-compromis", "projet-audit-soleil"]);
});

test("the lessons keep the order of the programme", async () => {
  const db = await open({ upTo: "06_fondamentaux_programme.sql" });
  const { sql } = helpers(db);
  const lessons = await sql(`select m.position as module, l.position, l.id, l.title from public.lessons l
    join public.course_modules m on m.id = l.module_id where l.course_id = $1 order by m.position, l.position`, [course("c1")]);
  const modules = new Map();
  for (const row of lessons) modules.set(row.module, [...(modules.get(row.module) ?? []), row]);
  assert.deepEqual([...modules.keys()], [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual([...modules.values()].map((rows) => rows.length), [3, 3, 3, 3, 3, 3, 3, 3]);
  assert.deepEqual([...modules.values()].map((rows) => rows[0].id), ["l-c1-1", "l-c1-3", "fond-ingenierie-sociale", "fond-mots-de-passe", "fond-mises-a-jour", "fond-crypto-bases", "fond-risques", "fond-reponse-incident"].map(lesson));
  assert.equal(modules.get(1)[1].id, lesson("l-c1-2"));
  assert.equal(modules.get(2)[0].id, lesson("l-c1-3"));
  for (const [module, rows] of modules) assert.equal(new Set(rows.map((row) => row.title)).size, rows.length, `module ${module} : pas de doublon`);
  const positions = await sql("select position, count(*)::int as n from public.lessons where course_id = $1 group by module_id, position having count(*) > 1", [course("c1")]);
  assert.deepEqual(positions, [], "two lessons never share a position in a module");
});

test("every lab file the database points to is generated, and every generated Fondamentaux file is used", async () => {
  const db = await open({ upTo: "06_fondamentaux_programme.sql" });
  const { sql } = helpers(db);
  const urls = (await sql("select a.url from public.lab_assets a join public.labs l on l.id = a.lab_id where l.course_id = $1", [course("c1")])).map((row) => row.url);
  assert.ok(urls.length >= 20);
  const files = fs.readdirSync(path.join(root, "public", "labs")).filter((name) => name.startsWith("fond-") && !name.endsWith(".pdf"));
  for (const url of urls) assert.ok(files.includes(path.basename(url)), `${url} est généré dans public/labs`);
  for (const file of files) assert.ok(urls.includes(`/labs/${file}`), `${file} est déclaré par un laboratoire`);
});

test("a learner completes the whole programme and earns every skill and badge", async () => {
  const db = await open({ upTo: "06_fondamentaux_programme.sql" });
  const { sql, as, rpc, createUser, study, passQuiz, solveLab } = helpers(db);
  const kofi = await createUser("kofi@example.test");

  const lessons = await sql(`select l.id from public.lessons l join public.course_modules m on m.id = l.module_id where l.course_id = $1 order by m.position, l.position`, [course("c1")]);
  assert.equal(lessons.length, 24);
  for (const row of lessons) await study(kofi, row.id);
  const quizzes = await sql("select id from public.quizzes where course_id = $1", [course("c1")]);
  assert.equal(quizzes.length, 24, "every lesson of the programme has its quiz");
  for (const row of quizzes) {
    await sql("delete from private.rate_events");
    assert.equal((await passQuiz(kofi, row.id)).passed, true);
  }

  const labs = await sql("select id, slug from public.labs where course_id = $1 order by position", [course("c1")]);
  assert.equal(labs.length, 7);
  const last = {};
  for (const row of labs) last[row.slug] = await solveLab(kofi, row.id);
  assert.equal(last["tp-analyse-phishing"].lab_newly_completed, true);
  assert.equal(last["projet-audit-soleil"].lab_newly_completed, true);

  const academy = await rpc(kofi, "get_my_academy");
  const states = Object.fromEntries(academy.skills.map((entry) => [entry.slug, entry.state]));
  const fondamentaux = ["principes-securite", "ingenierie-sociale", "authentification-forte", "hygiene-numerique", "bases-cryptographie", "analyse-risques", "protection-donnees", "reponse-incident"];
  for (const slug of fondamentaux) assert.equal(states[slug], "validated", `${slug} : ${JSON.stringify(states)}`);

  const badges = (await as(kofi, "select b.slug from public.user_badges ub join public.badges b on b.id = ub.badge_id")).map((row) => row.slug);
  for (const slug of ["oeil-de-lynx", "gardien-des-secrets", "cryptographe-en-herbe", "chasseur-de-risques", "premier-repondant", "auditeur-soleil"]) assert.ok(badges.includes(slug), `badge ${slug}`);

  const [enrollment] = await as(kofi, "select status from public.enrollments where course_id = $1", [course("c1")]);
  assert.equal(enrollment.status, "completed");
});

test("the labs cannot be solved with the answers of another lab, and a wrong answer never reveals the key", async () => {
  const db = await open({ upTo: "06_fondamentaux_programme.sql" });
  const { sql, rpc, createUser } = helpers(db);
  const ama = await createUser("ama@example.test");
  const [task] = await sql("select id from public.lab_tasks where lab_id = $1 order by position limit 1", [lab("tp-analyse-phishing")]);
  const result = await rpc(ama, "submit_lab_task", { p_task_id: task.id, p_answer: "réponse certainement fausse" });
  assert.equal(result.correct, false);
  assert.equal(JSON.stringify(result).includes((await sql("select accepted from private.lab_task_keys where task_id = $1", [task.id]))[0].accepted[0]), false);
});
