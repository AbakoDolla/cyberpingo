// Tests of the Analyse de logs programme seed (supabase/seed/09_logs_programme.sql): the reorganisation of the published
// course never deletes or overwrites anything, the lab files and answer keys are consistent with what the database stores, and a
// learner can complete the whole programme and earn every skill and badge.
// (The answer keys are recomputed from the lab files, independently of the generators, in tests/logs-labs-a|b|c.test.cjs.)
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { contentId } = require("../scripts/generate-content-seed.cjs");
const { createSupabaseDatabase } = require("../scripts/pglite-supabase.cjs");
const { root } = require("../scripts/ts-loader.cjs");

const SEED_DIR = path.join(root, "supabase", "seed");
const LABS_DIR = path.join(root, "public", "labs");
const seed = (name) => fs.readFileSync(path.join(SEED_DIR, name), "utf8");
const course = (key) => contentId("course", key);
const module_ = (key) => contentId("module", key);
const lesson = (key) => contentId("lesson", key);
const lab = (key) => contentId("lab", key);

const LOGS_LABS = ["tp-logs-formats-temps", "tp-logs-windows", "tp-logs-reseau", "tp-logs-correlation", "tp-logs-detection", "projet-soc-pme"];
const PUBLISHED_LABS = ["brute-force-ssh", "intrusion-web", "investigation-soc"];
const LOGS_SKILLS = ["formats-horodatage", "outils-analyse-logs", "journaux-windows", "journaux-reseau", "correlation-sources", "regles-detection", "triage-alertes", "rapport-investigation"];
const LOGS_BADGES = ["decodeur-de-journaux", "observateur-windows", "chasseur-de-balises", "tisseur-de-chronologie", "ecrivain-de-regles", "plume-de-l-analyste", "analyste-palmier"];
const PUBLISHED_BADGES = ["chasseur-bruteforce", "analyste-web", "analyste-soc"];
const FIRST_LESSONS = [
  "logs-sources-formats", "logs-linux-syslog", "logs-windows-evenements", "logs-web-format", "logs-pare-feu",
  "logs-grep-awk", "logs-correlation-sources", "logs-triage", "logs-centraliser", "soc-ssh-bruteforce",
];
const LESSONS_PER_MODULE = [4, 3, 3, 3, 3, 3, 3, 3, 3, 4];
const LESSON_TOTAL = LESSONS_PER_MODULE.reduce((sum, count) => sum + count, 0);

const opened = [];
async function open({ upTo }) {
  const db = await createSupabaseDatabase({ seed: false });
  opened.push(db);
  for (const file of fs.readdirSync(SEED_DIR).filter((name) => name.endsWith(".sql")).sort()) {
    if (file <= upTo) await db.exec(seed(file));
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

test("the programme reorganises the published log-analysis course without deleting or overwriting anything", async () => {
  const db = await open({ upTo: "08_linux_programme.sql" });
  const { sql, rpc, createUser, study, passQuiz } = helpers(db);

  const before = await sql("select id, title from public.lessons where course_id = $1 order by title", [course("c6")]);
  assert.equal(before.length, 6, "the course had its six published lessons");
  const reading = lesson("logs-lire");
  const starterQuiz = (await sql("select id from public.quizzes where lesson_id = $1", [reading]))[0].id;
  const starterQuestions = await sql("select id, explanation from public.quiz_questions where quiz_id = $1 order by position", [starterQuiz]);
  assert.equal(starterQuestions.length, 2);

  const awa = await createUser("awa@example.test");
  await study(awa, reading);
  assert.equal((await passQuiz(awa, starterQuiz)).passed, true, "the starter quiz is passed before the migration");

  // An administrator edited a starter lesson, renamed a module, rewrote one starter explanation and added a reference of their own
  // to a lesson that had none: the seed must respect all four.
  await sql("update public.lessons set content = $1 where id = $2", [{ blocks: [{ type: "text", content: "Version éditée par l’équipe." }] }, lesson("logs-correler")]);
  await sql("update public.course_modules set title = 'Qualification (édité)' where id = $1", [module_("c6:2")]);
  await sql("update public.quiz_questions set explanation = 'Explication réécrite par l’équipe pédagogique.' where id = $1", [starterQuestions[1].id]);
  const [web] = await sql("select content -> 'blocks' as blocks from public.lessons where id = $1", [lesson("soc-web-logs")]);
  assert.equal(web.blocks.filter((block) => block.type === "resource").length, 0, "the published lesson had no reference");
  const ownBlocks = [...web.blocks, { type: "resource", content: "Ma référence", url: "https://example.org/ma-reference" }];
  await sql("update public.lessons set content = $1 where id = $2", [{ blocks: ownBlocks }, lesson("soc-web-logs")]);
  const [chronologieBefore] = await sql("select jsonb_array_length(content -> 'blocks') as n from public.lessons where id = $1", [lesson("soc-chronologie")]);

  await db.exec(seed("09_logs_programme.sql"));

  const after_ = await sql("select id, title from public.lessons where course_id = $1", [course("c6")]);
  assert.equal(after_.length, LESSON_TOTAL);
  for (const row of before) assert.ok(after_.some((entry) => entry.id === row.id), `la leçon « ${row.title} » existe toujours avec le même identifiant`);

  const [edited] = await sql("select content -> 'blocks' -> 0 ->> 'content' as first from public.lessons where id = $1", [lesson("logs-correler")]);
  assert.equal(edited.first, "Version éditée par l’équipe.", "an edited starter lesson is never overwritten");
  const [upgraded] = await sql("select jsonb_array_length(content -> 'blocks') as blocks from public.lessons where id = $1", [reading]);
  assert.ok(upgraded.blocks >= 12, "the untouched starter lesson was upgraded");

  const [webAfter] = await sql("select content -> 'blocks' as blocks from public.lessons where id = $1", [lesson("soc-web-logs")]);
  assert.deepEqual(webAfter.blocks, ownBlocks, "a lesson an administrator already gave a reference to is left as it is");
  const [chronologieAfter] = await sql("select content -> 'blocks' as blocks from public.lessons where id = $1", [lesson("soc-chronologie")]);
  assert.ok(chronologieAfter.blocks.length > chronologieBefore.n, "a published lesson without reference receives its references");
  assert.ok(chronologieAfter.blocks.slice(chronologieBefore.n).every((block) => block.type === "resource" && /^https:\/\//.test(block.url)), "only references are appended, at the end");

  const modules = await sql("select id, title, position from public.course_modules where course_id = $1 order by position", [course("c6")]);
  assert.deepEqual(modules.map((entry) => entry.position), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(modules[0].title, "Lire les journaux");
  assert.equal(modules.find((entry) => entry.id === module_("c6:2")).title, "Qualification (édité)", "a module renamed by an administrator keeps its name");
  assert.equal(modules[7].id, module_("c6:2"), "the alert module moves to the eighth place");
  assert.equal(modules[9].id, module_("c6:3"), "the incident module closes the programme");
  assert.equal(modules[9].title, "Investiguer un incident");

  assert.equal((await sql("select id from public.quizzes where lesson_id = $1", [reading]))[0].id, starterQuiz, "the quiz of the lesson is still the same quiz");
  const questions = await sql("select id, position, explanation from public.quiz_questions where quiz_id = $1 order by position", [starterQuiz]);
  assert.equal(questions.length, 4, "two questions are appended to the starter quiz");
  assert.deepEqual(questions.map((entry) => entry.position), [1, 2, 3, 4]);
  assert.equal(questions[0].id, starterQuestions[0].id);
  assert.notEqual(questions[0].explanation, starterQuestions[0].explanation, "an untouched short explanation is completed");
  assert.equal(questions[1].explanation, "Explication réécrite par l’équipe pédagogique.", "an edited explanation is never overwritten");
  assert.equal((await sql("select count(*)::int as n from public.quiz_attempts where quiz_id = $1 and user_id = $2 and passed", [starterQuiz, awa]))[0].n, 1, "the learner’s attempt is kept");
  assert.equal((await sql("select status from public.lesson_progress where lesson_id = $1 and user_id = $2", [reading, awa]))[0].status, "completed");

  const orphans = await sql("select count(*)::int as n from public.quizzes q join public.lessons l on l.id = q.lesson_id where q.module_id <> l.module_id");
  assert.equal(orphans[0].n, 0, "a quiz always follows its lesson");
  const [texts] = await sql("select short_description, description, estimated_duration from public.courses where id = $1", [course("c6")]);
  assert.match(texts.description, /Dix modules progressifs/);
  assert.notEqual(texts.short_description, "Lire les événements, relier les indices et qualifier une alerte sans conclure trop vite.", "the short description is rewritten");
  const [{ total }] = await sql("select sum(duration_minutes)::int as total from public.lessons where course_id = $1", [course("c6")]);
  assert.equal(texts.estimated_duration, total, "the displayed duration is the sum of the lessons");

  // Running the seed again changes nothing.
  const snapshot = async () => JSON.stringify(await sql(`select
    (select count(*) from public.lessons) as lessons, (select count(*) from public.quiz_questions) as questions, (select count(*) from public.quiz_answers) as answers,
    (select count(*) from public.labs) as labs, (select count(*) from public.lab_tasks) as tasks, (select count(*) from public.lab_assets) as assets, (select count(*) from public.skills) as skills,
    (select count(*) from public.skill_links) as links, (select count(*) from public.badges) as badges, (select sum(jsonb_array_length(content -> 'blocks')) from public.lessons) as blocks`));
  const first = await snapshot();
  await db.exec(seed("09_logs_programme.sql"));
  assert.equal(await snapshot(), first);
  assert.equal((await rpc(awa, "get_my_academy")).skills.length, 37 + LOGS_SKILLS.length);
});

test("the lessons keep the order of the programme", async () => {
  const db = await open({ upTo: "09_logs_programme.sql" });
  const { sql } = helpers(db);
  const lessons = await sql(`select m.position as module, l.position, l.id, l.title from public.lessons l
    join public.course_modules m on m.id = l.module_id where l.course_id = $1 order by m.position, l.position`, [course("c6")]);
  const modules = new Map();
  for (const row of lessons) modules.set(row.module, [...(modules.get(row.module) ?? []), row]);
  assert.deepEqual([...modules.keys()], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual([...modules.values()].map((rows) => rows.length), LESSONS_PER_MODULE);
  assert.deepEqual([...modules.values()].map((rows) => rows[0].id), FIRST_LESSONS.map(lesson));
  assert.deepEqual(modules.get(1).map((row) => row.id), ["logs-sources-formats", "logs-lire", "logs-temps", "logs-correler"].map(lesson), "the two starter lessons keep their place among the new ones");
  assert.deepEqual(modules.get(10).map((row) => row.id), ["soc-ssh-bruteforce", "soc-web-logs", "soc-chronologie", "logs-rapport-preuves"].map(lesson), "the three published investigation lessons keep their place");
  for (const [module, rows] of modules) assert.equal(new Set(rows.map((row) => row.title)).size, rows.length, `module ${module} : pas de doublon`);
  const positions = await sql("select position, count(*)::int as n from public.lessons where course_id = $1 group by module_id, position having count(*) > 1", [course("c6")]);
  assert.deepEqual(positions, [], "two lessons never share a position in a module");
  const slugs = (await sql("select slug from public.labs where course_id = $1 order by position", [course("c6")])).map((row) => row.slug);
  assert.deepEqual(slugs, [...PUBLISHED_LABS, ...LOGS_LABS], "the three published labs come first, then the six labs of the programme in order");
  const assessments = (await sql("select slug from public.labs where course_id = $1 and is_assessment order by position", [course("c6")])).map((row) => row.slug);
  assert.deepEqual(assessments, ["investigation-soc", "projet-soc-pme"]);
});

test("every lab file the database points to exists, every generated log file is used, and the guides are published as PDF", async () => {
  const db = await open({ upTo: "09_logs_programme.sql" });
  const { sql } = helpers(db);
  const rows = await sql("select a.url, a.kind from public.lab_assets a join public.labs l on l.id = a.lab_id where l.course_id = $1 and l.slug = any($2)", [course("c6"), LOGS_LABS]);
  assert.ok(rows.length >= 34, `${rows.length} files declared`);
  for (const row of rows) assert.ok(fs.existsSync(path.join(LABS_DIR, path.basename(row.url))), `${row.url} existe dans public/labs`);
  for (const row of rows.filter((entry) => entry.kind === "guide" || entry.kind === "report_template")) {
    assert.ok(row.url.endsWith(".pdf") || !row.url.endsWith(".md"), `${row.url} : un guide ou un modèle est publié en PDF`);
  }
  const used = new Set(rows.map((row) => path.basename(row.url)));
  const generated = fs.readdirSync(LABS_DIR).filter((name) => name.startsWith("slg-") && !name.endsWith(".pdf"));
  assert.ok(generated.length >= 34);
  for (const file of generated) {
    const published = file.endsWith(".md") ? file.replace(/\.md$/, ".pdf") : file;
    assert.ok(used.has(published), `${file} est publié par un laboratoire (${published})`);
  }
});

test("a learner completes the whole programme and earns every skill and badge", async () => {
  const db = await open({ upTo: "09_logs_programme.sql" });
  const { sql, as, rpc, createUser, study, passQuiz, solveLab } = helpers(db);
  const kofi = await createUser("kofi@example.test");

  const lessons = await sql(`select l.id from public.lessons l join public.course_modules m on m.id = l.module_id where l.course_id = $1 order by m.position, l.position`, [course("c6")]);
  assert.equal(lessons.length, LESSON_TOTAL);
  for (const row of lessons) await study(kofi, row.id);
  const quizzes = await sql("select id from public.quizzes where course_id = $1", [course("c6")]);
  assert.equal(quizzes.length, LESSON_TOTAL, "every lesson of the programme has its quiz");
  for (const row of quizzes) {
    await sql("delete from private.rate_events");
    assert.equal((await passQuiz(kofi, row.id)).passed, true);
  }

  const labs = await sql("select id, slug from public.labs where course_id = $1 order by position", [course("c6")]);
  assert.equal(labs.length, PUBLISHED_LABS.length + LOGS_LABS.length);
  const last = {};
  for (const row of labs) last[row.slug] = await solveLab(kofi, row.id);
  assert.equal(last["tp-logs-formats-temps"].lab_newly_completed, true);
  assert.equal(last["projet-soc-pme"].lab_newly_completed, true);

  const academy = await rpc(kofi, "get_my_academy");
  const states = Object.fromEntries(academy.skills.map((entry) => [entry.slug, entry.state]));
  for (const slug of LOGS_SKILLS) assert.equal(states[slug], "validated", `${slug} : ${JSON.stringify(states)}`);

  const badges = (await as(kofi, "select b.slug from public.user_badges ub join public.badges b on b.id = ub.badge_id")).map((row) => row.slug);
  for (const slug of [...LOGS_BADGES, ...PUBLISHED_BADGES]) assert.ok(badges.includes(slug), `badge ${slug}`);

  const [enrollment] = await as(kofi, "select status from public.enrollments where course_id = $1", [course("c6")]);
  assert.equal(enrollment.status, "completed");
});

test("the labs a lesson sends the learner to exist under their exact titles, and every lab is practised by a lesson", async () => {
  const db = await open({ upTo: "09_logs_programme.sql" });
  const { sql } = helpers(db);
  const titles = new Set((await sql("select title from public.labs where course_id = $1", [course("c6")])).map((row) => row.title));
  assert.equal(titles.size, PUBLISHED_LABS.length + LOGS_LABS.length);
  const lessons = await sql("select l.title, l.content -> 'blocks' as blocks from public.lessons l where l.course_id = $1", [course("c6")]);
  const cited = new Set();
  for (const lesson of lessons) {
    const practice = lesson.blocks.filter((block) => block.type === "callout" && block.content.startsWith("Pour pratiquer"));
    const quoted = practice.flatMap((block) => [...block.content.matchAll(/« ([^»]+) »/g)].map((match) => match[1]));
    const labTitles = quoted.filter((text) => /^(TP \d|Projet final|Force brute|Intrusion web|Investigation SOC)/.test(text));
    for (const text of labTitles) {
      assert.ok(titles.has(text), `« ${lesson.title} » cite un laboratoire qui n’existe pas : « ${text} »`);
      cited.add(text);
    }
    const existing = ["Force brute", "Intrusion web", "Investigation SOC"];
    const isPublishedDeep = existing.some((prefix) => lesson.title.startsWith(prefix)) || ["Reconnaître une attaque SSH par force brute", "Lire les journaux d’un serveur web", "Reconstituer la chronologie d’un incident"].includes(lesson.title);
    if (!isPublishedDeep) assert.ok(practice.length === 1 && labTitles.length >= 1, `« ${lesson.title} » renvoie vers un laboratoire par un bloc « Pour pratiquer »`);
  }
  for (const title of titles) assert.ok(cited.has(title), `le laboratoire « ${title} » est cité par au moins une leçon`);
});

test("the labs cannot be solved with the answers of another lab, and a wrong answer never reveals the key", async () => {
  const db = await open({ upTo: "09_logs_programme.sql" });
  const { sql, rpc, createUser } = helpers(db);
  const ama = await createUser("ama@example.test");
  const [task] = await sql("select id from public.lab_tasks where lab_id = $1 order by position limit 1", [lab("tp-logs-formats-temps")]);
  const result = await rpc(ama, "submit_lab_task", { p_task_id: task.id, p_answer: "réponse certainement fausse" });
  assert.equal(result.correct, false);
  assert.equal(JSON.stringify(result).includes((await sql("select accepted from private.lab_task_keys where task_id = $1", [task.id]))[0].accepted[0]), false);
  const [other] = await sql("select k.accepted from public.lab_tasks t join private.lab_task_keys k on k.task_id = t.id where t.lab_id = $1 order by t.position limit 1", [lab("tp-logs-windows")]);
  const wrong = await rpc(ama, "submit_lab_task", { p_task_id: task.id, p_answer: other.accepted[0] });
  assert.equal(wrong.correct, false, "the first answer of another lab is not accepted here");
});
