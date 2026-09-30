const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { load, root } = require("../scripts/ts-loader.cjs");
const { buildContentSeed, OUTPUT } = require("../scripts/generate-content-seed.cjs");

const migrationsDir = path.join(root, "supabase", "migrations");
const { quizzes } = load("data/quizzes");
const { challenges } = load("data/challenges");
const { challengeAnswers } = load("data/challenge-answers");
const { courses } = load("data/courses");

// Minimal stand-ins for what Supabase provides before project migrations run.
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth, public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

let db;
const ids = {};

async function as(uid, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false); set role ${uid ? "authenticated" : "anon"};`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}
const one = async (uid, sql, params) => (await as(uid, sql, params))[0];
async function rejects(uid, sql, params, pattern) {
  await assert.rejects(() => as(uid, sql, params), pattern);
}
async function createUser(email, meta = {}) {
  const { rows } = await db.query("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [email, meta]);
  return rows[0].id;
}

before(async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  for (const file of fs.readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  }
  ids.alice = await createUser("alice.martin@example.test", { display_name: "Alice" });
  ids.bob = await createUser("bob@example.test");
  ids.admin = await createUser("admin@example.test", { display_name: "Admin" });
  await db.query("update public.profiles set role = 'admin' where id = $1", [ids.admin]);
});

after(async () => { await db?.close(); });

test("the generated catalogue migration matches data/*.ts", () => {
  assert.equal(fs.readFileSync(OUTPUT, "utf8"), buildContentSeed(), "Run node scripts/generate-content-seed.cjs");
});

test("signup creates a unique learner profile with a readable name", async () => {
  const alice = await one(ids.alice, "select display_name, username, role, xp, onboarding_completed from public.profiles where id = $1", [ids.alice]);
  assert.deepEqual(alice, { display_name: "Alice", username: "alice_martin", role: "learner", xp: 0, onboarding_completed: false });
  const bob = await one(ids.bob, "select display_name, username from public.profiles where id = $1", [ids.bob]);
  assert.deepEqual(bob, { display_name: "Bob", username: "bob" });
  const twin = await createUser("bob@other.test");
  const { rows } = await db.query("select username from public.profiles where id = $1", [twin]);
  assert.match(rows[0].username, /^bob_[0-9a-f]{6}$/);
});

test("lessons award XP once and advance the streak", async () => {
  const first = await one(ids.alice, "select public.complete_lesson('l1') as r");
  assert.equal(first.r.awarded, 50);
  assert.equal(first.r.streak, 1);
  const again = await one(ids.alice, "select public.complete_lesson('l1') as r");
  assert.deepEqual([again.r.awarded, again.r.alreadyCompleted, again.r.xp], [0, true, 50]);
  const badges = await as(ids.alice, "select badge_id from public.user_badges where user_id = $1", [ids.alice]);
  assert.deepEqual(badges.map((row) => row.badge_id), ["b1"]);
  await rejects(ids.alice, "select public.complete_lesson('does-not-exist')", [], /Leçon inconnue/);
});

test("quizzes are graded on the server and only improvements earn XP", async () => {
  const quiz = quizzes.find((item) => item.id === "quiz-web-https");
  const correct = quiz.questions.map((question) => question.correctAnswer);
  const wrong = quiz.questions.map((question) => question.options.find((option) => option !== question.correctAnswer));
  const half = [correct[0], ...wrong.slice(1)];

  let result = (await one(ids.alice, "select public.submit_quiz($1, $2) as r", [quiz.id, half])).r;
  assert.deepEqual([result.score, result.passed, result.awarded], [1, false, 30]);
  result = (await one(ids.alice, "select public.submit_quiz($1, $2) as r", [quiz.id, half])).r;
  assert.deepEqual([result.awarded, result.improved], [0, false]);
  result = (await one(ids.alice, "select public.submit_quiz($1, $2) as r", [quiz.id, correct])).r;
  assert.deepEqual([result.score, result.passed, result.awarded, result.xp], [2, true, 30, 110]);
  result = (await one(ids.alice, "select public.submit_quiz($1, $2) as r", [quiz.id, wrong])).r;
  assert.equal(result.awarded, 0);
  const row = await one(ids.alice, "select best_score, attempts, passed, earned_xp from public.quiz_results where user_id = $1", [ids.alice]);
  assert.deepEqual(row, { best_score: 2, attempts: 4, passed: true, earned_xp: 60 });
  await rejects(ids.alice, "select public.submit_quiz($1, $2)", [quiz.id, [correct[0]]], /Réponds à toutes les questions/);
});

test("challenges accept the flag case-insensitively and only once", async () => {
  const challenge = challenges[0];
  const flag = challengeAnswers[challenge.id];
  const wrong = (await one(ids.bob, "select public.submit_challenge($1, 'nope') as r", [challenge.id])).r;
  assert.deepEqual(wrong, { correct: false, awarded: 0 });
  const right = (await one(ids.bob, "select public.submit_challenge($1, $2) as r", [challenge.id, `  ${flag.toUpperCase()} `])).r;
  assert.deepEqual([right.correct, right.awarded], [true, challenge.xpReward]);
  const again = (await one(ids.bob, "select public.submit_challenge($1, $2) as r", [challenge.id, flag])).r;
  assert.deepEqual([again.awarded, again.alreadyCompleted], [0, true]);
});

test("learners read only their own data and cannot write progress directly", async () => {
  assert.equal((await as(ids.bob, "select * from public.lesson_completions")).length, 0);
  assert.equal((await as(ids.bob, "select * from public.profiles")).length, 1);
  assert.equal((await as(ids.admin, "select * from public.profiles")).length, 4);
  await rejects(ids.alice, "insert into public.lesson_completions (user_id, lesson_id, course_id) values ($1, 'l2', 'c2')", [ids.alice], /permission denied/);
  await rejects(ids.alice, "update public.profiles set xp = 99999 where id = $1", [ids.alice], /permission denied/);
  await rejects(ids.alice, "update public.profiles set role = 'admin' where id = $1", [ids.alice], /permission denied/);
  await as(ids.alice, "update public.profiles set display_name = 'Alice M.', daily_minutes = 30 where id = $1", [ids.alice]);
  await as(ids.alice, "update public.profiles set display_name = 'Hacked' where id = $1", [ids.bob]);
  assert.equal((await db.query("select display_name from public.profiles where id = $1", [ids.bob])).rows[0].display_name, "Bob");
  await rejects(ids.alice, "select * from private.content_quizzes", [], /permission denied/);
  await rejects(null, "select * from public.profiles", [], /permission denied/);
  await rejects(null, "select public.complete_lesson('l1')", [], /permission denied/);
});

test("onboarding, heartbeat, mentor quota and reset work for the signed-in learner", async () => {
  await as(ids.bob, "select public.complete_onboarding('intermediaire', 'emploi', 45, array['linux'])");
  const profile = await one(ids.bob, "select skill_level, goal, daily_minutes, known_areas, onboarding_completed from public.profiles where id = $1", [ids.bob]);
  assert.deepEqual(profile, { skill_level: "intermediaire", goal: "emploi", daily_minutes: 45, known_areas: ["linux"], onboarding_completed: true });
  await rejects(ids.bob, "select public.complete_onboarding('expert', 'emploi', 45, array['linux'])", [], /check constraint/);

  await as(ids.bob, "select public.record_login()");
  await as(ids.bob, "select public.heartbeat('/courses', true)");
  await as(ids.bob, "select public.heartbeat('https://evil.test', false)");
  assert.equal((await one(ids.bob, "select current_page from public.learner_sessions where user_id = $1", [ids.bob])).current_page, "/");

  const quota = (await one(ids.bob, "select public.consume_mentor_quota() as r")).r;
  assert.deepEqual([quota.allowed, quota.remaining], [true, 39]);

  await as(ids.bob, "select public.reset_my_progress()");
  const reset = await one(ids.bob, "select xp, streak, onboarding_completed from public.profiles where id = $1", [ids.bob]);
  assert.deepEqual(reset, { xp: 0, streak: 0, onboarding_completed: true });
  assert.equal((await as(ids.bob, "select * from public.challenge_completions where user_id = $1", [ids.bob])).length, 0);
});

test("contact messages are accepted from visitors, rate limited and visible only to admins", async () => {
  for (let index = 0; index < 5; index += 1) {
    await as(null, "select public.submit_contact_message('Autre', 'visiteur@example.test', $1)", [`Message de test numéro ${index} assez long.`]);
  }
  await rejects(null, "select public.submit_contact_message('Autre', null, 'Encore un message suffisamment long.')", [], /Trop de messages/);
  await rejects(ids.alice, "select public.submit_contact_message('Spam', null, 'Sujet invalide mais message assez long.')", [], /check constraint/);
  assert.equal((await as(ids.alice, "select * from public.contact_messages")).length, 0);
  const inbox = await as(ids.admin, "select id, status from public.contact_messages");
  assert.equal(inbox.length, 5);
  await as(ids.admin, "update public.contact_messages set status = 'traite' where id = $1", [inbox[0].id]);
  await rejects(ids.admin, "update public.contact_messages set message = 'x' where id = $1", [inbox[0].id], /permission denied/);
});

test("admin publishing feeds server scoring without hijacking catalogue IDs", async () => {
  const payload = {
    lessons: [{ id: "pub-course-l1", title: "Leçon publiée", xpReward: 25 }],
    quizzes: [{ id: "pub-course-q1", lessonId: "pub-course-l1", title: "Quiz publié", xpReward: 40, questions: [{ correctAnswer: "A" }, { correctAnswer: "B" }] }],
  };
  await rejects(ids.alice, "insert into public.published_courses (id, slug, title, payload, published_by) values ('pub-course', 'pub-course', 'Cours publié', $1, $2)", [payload, ids.alice], /row-level security/);
  await as(ids.admin, "insert into public.published_courses (id, slug, title, payload, published_by) values ('pub-course', 'pub-course', 'Cours publié', $1, $2)", [payload, ids.admin]);
  const graded = (await one(ids.alice, "select public.submit_quiz('pub-course-q1', array['A','B']) as r")).r;
  assert.deepEqual([graded.score, graded.awarded], [2, 40]);
  assert.equal((await one(ids.alice, "select public.complete_lesson('pub-course-l1') as r")).r.awarded, 25);

  const hijack = { ...payload, lessons: [{ id: "l-c1-1", title: "Remplacement", xpReward: 1000 }], quizzes: [] };
  await rejects(ids.admin, "insert into public.published_courses (id, slug, title, payload, published_by) values ('evil', 'evil', 'Cours pirate', $1, $2)", [hijack, ids.admin], /existe déjà/);

  await rejects(ids.admin, "insert into public.published_challenges (id, slug, title, payload, published_by) values ('pub-empty', 'pub-empty', 'Sans flag', $1, $2)", [{ xpReward: 10 }, ids.admin], /réponse attendue/);
  await as(ids.admin, "insert into public.published_challenges (id, slug, title, payload, published_by) values ('pub-flag', 'pub-flag', 'Flag publié', $1, $2)", [{ expectedAnswer: "CPG{ok}", xpReward: 70 }, ids.admin]);
  const visible = await one(ids.bob, "select payload from public.published_challenges where id = 'pub-flag'");
  assert.deepEqual(visible.payload, { xpReward: 70 }, "the flag must never reach learners");
  await as(ids.admin, "update public.published_challenges set title = 'Flag publié v2', payload = $1 where id = 'pub-flag'", [{ xpReward: 70, hints: ["Regarde bien"] }]);
  assert.equal((await one(ids.bob, "select public.submit_challenge('pub-flag', 'cpg{ok}') as r")).r.awarded, 70);
  await rejects(ids.bob, "insert into public.published_challenges (id, slug, title, payload, published_by) values ('pub-x', 'pub-x', 'Pirate', $1, $2)", [{ expectedAnswer: "x" }, ids.bob], /row-level security/);
  await as(ids.admin, "delete from public.published_challenges where id = 'pub-flag'");
  await rejects(ids.bob, "select public.submit_challenge('pub-flag', 'cpg{ok}')", [], /Challenge inconnu/);
  await as(ids.admin, "delete from public.published_courses where id = 'pub-course'");
  assert.equal((await as(ids.alice, "select * from public.quiz_results where quiz_id = 'pub-course-q1'")).length, 0);
});

test("admin tools require the admin role and protect the last administrator", async () => {
  await rejects(ids.alice, "select public.admin_overview()", [], /réservé aux administrateurs/);
  const overview = (await one(ids.admin, "select public.admin_overview() as r")).r;
  assert.equal(overview.learners, 3);
  assert.equal(overview.signupsByDay.length, 7);
  assert.ok(overview.lessonsCompleted >= 1);
  const learners = await as(ids.admin, "select * from public.admin_learners(10)");
  assert.equal(learners[0].id, ids.alice);
  await rejects(ids.admin, "select public.admin_set_role($1, 'learner')", [ids.admin], /propre accès/);
  await rejects(ids.admin, "select public.delete_my_account()", [], /autre administrateur/);
  await as(ids.admin, "select public.admin_set_role($1, 'admin')", [ids.bob]);
  assert.equal((await db.query("select role from public.profiles where id = $1", [ids.bob])).rows[0].role, "admin");
});

test("learners can delete their account and all their data", async () => {
  await as(ids.alice, "select public.delete_my_account()");
  assert.equal((await db.query("select count(*)::int as n from auth.users where id = $1", [ids.alice])).rows[0].n, 0);
  assert.equal((await db.query("select count(*)::int as n from public.lesson_completions where user_id = $1", [ids.alice])).rows[0].n, 0);
});

test("the c2 network course unlocks the network badge", async () => {
  const learner = await createUser("reseau@example.test");
  for (const lesson of courses.find((course) => course.id === "c2").lessons) await as(learner, "select public.complete_lesson($1)", [lesson.id]);
  const badges = await as(learner, "select badge_id from public.user_badges where user_id = $1 order by badge_id", [learner]);
  assert.deepEqual(badges.map((row) => row.badge_id), ["b1", "b5"]);
});
