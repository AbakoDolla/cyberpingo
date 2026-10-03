const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { buildContentSeed, contentId, OUTPUT } = require("../scripts/generate-content-seed.cjs");
const { createSupabaseDatabase } = require("../scripts/pglite-supabase.cjs");

let db;
const ids = {};
const course = (key) => contentId("course", key);
const lesson = (key) => contentId("lesson", key);
const quiz = (key) => contentId("quiz", key);
const lab = (key) => contentId("lab", key);

async function as(uid, sql, params = [], headers = null) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.headers', $2, false)", [uid ?? "", headers ? JSON.stringify(headers) : ""]);
  await db.exec(`set role ${uid ? "authenticated" : "anon"}`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false), set_config('request.headers', '', false)");
  }
}
const one = async (uid, sql, params, headers) => (await as(uid, sql, params, headers))[0];
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
async function backdateLesson(uid, lessonId, seconds = 60) {
  await sql("update public.lesson_progress set started_at = now() - make_interval(secs => $3) where user_id = $1 and lesson_id = $2", [uid, lessonId, seconds]);
}
async function studyLesson(uid, key) {
  await rpc(uid, "start_lesson", { p_lesson_id: lesson(key) });
  await backdateLesson(uid, lesson(key));
  return rpc(uid, "complete_lesson", { p_lesson_id: lesson(key) });
}
async function answerKey(quizId, { correct = true } = {}) {
  const rows = await sql(`
    select q.id as question, (array_agg(a.id order by a.position) filter (where a.is_correct = $2))[1] as answer
    from public.quiz_questions q join public.quiz_answers a on a.question_id = q.id
    where q.quiz_id = $1 group by q.id, q.position order by q.position`, [quizId, correct]);
  return Object.fromEntries(rows.map((row) => [row.question, [row.answer]]));
}
const ledgerTotal = async (uid) => Number((await sql("select coalesce(sum(amount), 0) as total from public.xp_transactions where user_id = $1", [uid]))[0].total);
const profile = async (uid) => (await sql("select * from public.profiles where id = $1", [uid]))[0];

before(async () => {
  db = await createSupabaseDatabase({ seed: true });
  for (const [name, email, meta] of [
    ["alice", "alice.martin@example.test", { display_name: "Alice", timezone: "America/Montreal" }],
    ["bob", "bob@example.test", {}],
    ["carol", "carol@example.test", { display_name: "Carol" }],
    ["dave", "dave@example.test", { display_name: "Dave" }],
    ["erin", "erin@example.test", { display_name: "Erin" }],
    ["frank", "frank@example.test", { display_name: "Frank", timezone: "Pacific/Kiritimati" }],
    ["gina", "gina@example.test", { display_name: "Gina" }],
    ["admin", "admin@example.test", { display_name: "Admin" }],
    ["root", "root@example.test", { display_name: "Root" }],
  ]) ids[name] = await createUser(email, meta);
  await sql("update public.profiles set role = 'admin' where id = $1", [ids.admin]);
  await sql("update public.profiles set role = 'superadmin' where id = $1", [ids.root]);
});

after(async () => { await db?.close(); });

test("the starter content seed matches data/*.ts", () => {
  assert.equal(fs.readFileSync(OUTPUT, "utf8"), buildContentSeed(), "Run node scripts/generate-content-seed.cjs");
});

test("signup creates a profile and settings with a safe username and timezone", async () => {
  const alice = await one(ids.alice, "select display_name, username, role, xp, level, onboarding_completed from public.profiles where id = $1", [ids.alice]);
  assert.deepEqual(alice, { display_name: "Alice", username: "alice_martin", role: "user", xp: 0, level: 1, onboarding_completed: false });
  assert.equal((await one(ids.alice, "select timezone from public.user_settings")).timezone, "America/Montreal");
  assert.deepEqual(await one(ids.bob, "select display_name, username from public.profiles where id = $1", [ids.bob]), { display_name: "Bob", username: "bob" });

  const twin = await createUser("bob@other.test", { timezone: "Mars/Olympus" });
  const [row] = await sql("select p.username, s.timezone from public.profiles p join public.user_settings s on s.user_id = p.id where p.id = $1", [twin]);
  assert.match(row.username, /^bob_[0-9a-f]{6}$/);
  assert.equal(row.timezone, "Europe/Paris");
  await rejects(as(ids.alice, "update public.user_settings set timezone = 'Nowhere/Land'"), /Fuseau horaire inconnu/);
});

test("every table is protected by RLS and only intended functions are callable anonymously", async () => {
  const unprotected = await sql(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private') and c.relkind = 'r' and not c.relrowsecurity`);
  assert.deepEqual(unprotected, []);
  const anonCallable = await sql(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`);
  assert.deepEqual(anonCallable.map((row) => row.proname), ["is_admin", "is_superadmin", "submit_contact_message", "verify_certificate"]);
  const privateUsage = await sql("select has_schema_privilege('authenticated', 'private', 'usage') as auth, has_schema_privilege('anon', 'private', 'usage') as anon");
  assert.deepEqual(privateUsage[0], { auth: false, anon: false });
});

test("learners only see their own private data", async () => {
  assert.equal((await as(ids.bob, "select id from public.profiles")).length, 1);
  await rejects(as(null, "select id from public.profiles"), /permission denied/);
  assert.equal((await as(ids.admin, "select id from public.profiles")).length >= 9, true);
  await as(ids.bob, "update public.profiles set display_name = 'Bobby', bio = 'Curieux' where id = $1", [ids.bob]);
  assert.equal((await profile(ids.bob)).display_name, "Bobby");
  await as(ids.bob, "update public.profiles set display_name = 'Pirate' where id = $1", [ids.alice]);
  assert.equal((await profile(ids.alice)).display_name, "Alice");
});

test("rewards, roles and certificates cannot be forged from the browser", async () => {
  await rejects(as(ids.bob, "update public.profiles set xp = 100000 where id = $1", [ids.bob]), /permission denied/);
  await rejects(as(ids.bob, "update public.profiles set role = 'superadmin' where id = $1", [ids.bob]), /permission denied/);
  await rejects(as(ids.bob, "update public.profiles set current_streak = 99 where id = $1", [ids.bob]), /permission denied/);
  await rejects(as(ids.bob, "insert into public.xp_transactions (user_id, amount, reason) values ($1, 500, 'achievement')", [ids.bob]), /permission denied/);
  await rejects(as(ids.bob, "insert into public.lesson_progress (user_id, lesson_id, course_id, status, completed_at, progress_percentage) values ($1, $2, $3, 'completed', now(), 100)",
    [ids.bob, lesson("l1"), course("c2")]), /permission denied/);
  await rejects(as(ids.bob, "insert into public.user_badges (user_id, badge_id) select $1, id from public.badges limit 1", [ids.bob]), /permission denied/);
  await rejects(as(ids.bob, "insert into public.certificates (user_id, recipient_name, course_title) values ($1, 'Bob', 'Faux')", [ids.bob]), /permission denied/);
  await rejects(as(ids.bob, "select private.award_xp($1, 1000, 'achievement', 'badge', 'x', 'triche')", [ids.bob]), /permission denied/);
  assert.equal((await profile(ids.bob)).xp, 0);
});

test("the catalogue exposes published outlines publicly and hides answers from everyone", async () => {
  assert.equal((await as(null, "select id from public.courses")).length, 6);
  assert.equal((await as(null, "select id, title from public.lessons")).length, 50);
  await rejects(as(null, "select content from public.lessons"), /permission denied/);
  await rejects(as(null, "select prompt from public.quiz_questions"), /permission denied/);
  assert.equal((await as(ids.bob, "select content from public.lessons where id = $1", [lesson("l1")]))[0].content.blocks.length > 0, true);
  assert.equal((await as(ids.bob, "select id, prompt from public.quiz_questions")).length, 154);
  await rejects(as(ids.bob, "select explanation from public.quiz_questions"), /permission denied/);
  await rejects(as(ids.bob, "select is_correct from public.quiz_answers"), /permission denied/);
  await rejects(as(ids.bob, "select flag from private.lab_flags"), /permission denied/);
  assert.equal((await as(null, "select slug from public.labs")).length, 19);
  const [{ modules }] = await as(null, "select count(*)::int as modules from public.course_modules");
  assert.equal(modules, 22);
});

test("a lesson must be opened and read before it pays XP, and pays only once", async () => {
  await rejects(rpc(ids.carol, "complete_lesson", { p_lesson_id: lesson("l-c1-1") }), /Ouvre la leçon/);
  const started = await rpc(ids.carol, "start_lesson", { p_lesson_id: lesson("l-c1-1") });
  assert.equal(started.status, "in_progress");
  await rejects(rpc(ids.carol, "complete_lesson", { p_lesson_id: lesson("l-c1-1") }), /Prends le temps/);
  await rpc(ids.carol, "save_lesson_progress", { p_lesson_id: lesson("l-c1-1"), p_percentage: 100 });
  assert.equal((await sql("select progress_percentage from public.lesson_progress where user_id = $1", [ids.carol]))[0].progress_percentage, 99);

  await backdateLesson(ids.carol, lesson("l-c1-1"));
  const first = await rpc(ids.carol, "complete_lesson", { p_lesson_id: lesson("l-c1-1") });
  assert.equal(first.xp_awarded, 40);
  assert.equal(first.xp_gained, 50, "40 XP for the lesson + 10 XP for the « Premier pas » badge");
  assert.deepEqual(first.new_badges.map((badge) => badge.slug), ["premier-pas"]);
  assert.equal(first.current_streak, 1);
  assert.equal(first.next_lesson_id, lesson("l-c1-2"));

  const again = await rpc(ids.carol, "complete_lesson", { p_lesson_id: lesson("l-c1-1") });
  assert.equal(again.already_completed, true);
  assert.equal(again.xp_gained, 0);
  assert.equal((await profile(ids.carol)).xp, 50);
  assert.equal(await ledgerTotal(ids.carol), 50);
  assert.equal((await sql("select count(*)::int as n from public.enrollments where user_id = $1 and course_id = $2", [ids.carol, course("c1")]))[0].n, 1);
});

test("XP, levels, daily challenges and notifications stay consistent", async () => {
  const second = await studyLesson(ids.carol, "l-c1-2");
  assert.equal(second.xp_awarded, 45);
  assert.deepEqual(second.completed_challenges.map((challenge) => challenge.title), ["Terminer 2 leçons aujourd’hui"]);
  assert.equal(second.xp_gained, 75);
  assert.equal(second.leveled_up, true);
  assert.equal(second.level_info.level, 2);
  const carol = await profile(ids.carol);
  assert.equal(carol.xp, 125);
  assert.equal(carol.xp, await ledgerTotal(ids.carol));
  assert.equal(carol.level, (await sql("select private.level_for_xp($1) as level", [carol.xp]))[0].level);

  const [progress] = await sql("select progress from public.user_challenges uc join public.challenges c on c.id = uc.challenge_id where uc.user_id = $1 and c.slug = 'cent-xp-du-jour'", [ids.carol]);
  assert.equal(progress.progress, 95, "challenge rewards do not feed XP challenges");

  const notifications = await as(ids.carol, "select type, read_at from public.notifications order by created_at");
  assert.deepEqual([...new Set(notifications.map((row) => row.type))].sort(), ["achievement", "challenge", "level"]);
  assert.equal((await as(ids.bob, "select id from public.notifications")).length, 0);
  assert.equal(await rpc(ids.carol, "mark_all_notifications_read"), notifications.length);
  await rejects(as(ids.carol, "update public.notifications set title = 'x'"), /permission denied/);
});

test("quizzes are graded server-side and only the improvement pays", async () => {
  const quizId = quiz("q1");
  const wrong = await rpc(ids.erin, "submit_quiz", { p_quiz_id: quizId, p_answers: await answerKey(quizId, { correct: false }) });
  assert.equal(wrong.passed, false);
  assert.equal(wrong.score, 0);
  assert.equal(wrong.xp_awarded, 0);
  assert.equal(wrong.results.every((result) => result.correct === false && result.correct_answer_ids.length === 1 && result.explanation), true);

  const right = await answerKey(quizId);
  const partial = { ...right, [Object.keys(right)[0]]: (await answerKey(quizId, { correct: false }))[Object.keys(right)[0]] };
  const almost = await rpc(ids.erin, "submit_quiz", { p_quiz_id: quizId, p_answers: partial });
  assert.deepEqual([almost.score, almost.percentage, almost.passed, almost.xp_awarded], [2, 66, false, 0]);

  const passed = await rpc(ids.erin, "submit_quiz", { p_quiz_id: quizId, p_answers: right });
  assert.deepEqual([passed.score, passed.passed, passed.xp_awarded], [3, true, 80]);
  assert.deepEqual(passed.new_badges.map((badge) => badge.slug), ["premier-quiz"]);
  const replay = await rpc(ids.erin, "submit_quiz", { p_quiz_id: quizId, p_answers: right });
  assert.equal(replay.xp_awarded, 0);
  const forged = await rpc(ids.erin, "submit_quiz", { p_quiz_id: quizId, p_answers: { [Object.keys(right)[0]]: ["00000000-0000-0000-0000-000000000000"] } });
  assert.equal(forged.score, 0);
  assert.equal((await profile(ids.erin)).xp, await ledgerTotal(ids.erin));
  assert.equal((await as(ids.erin, "select count(*)::int as n from public.quiz_attempts"))[0].n, 5);
});

test("finishing a course issues a verifiable certificate", async () => {
  for (const key of ["l-c1-1", "l-c1-2", "l-c1-3"]) await studyLesson(ids.dave, key);
  assert.equal((await as(ids.dave, "select status from public.enrollments"))[0].status, "active");
  const result = await rpc(ids.dave, "submit_quiz", { p_quiz_id: quiz("review-fundamentaux"), p_answers: await answerKey(quiz("review-fundamentaux")) });
  assert.equal(result.course_completed.slug, "fondamentaux");
  assert.match(result.certificate.certificate_number, /^CP-\d{4}-\d{6}$/);
  assert.match(result.certificate.verification_code, /^[A-Z0-9]{16}$/);
  assert.deepEqual(result.new_badges.map((badge) => badge.slug).sort(), ["premier-cours", "premier-quiz", "premiere-certification"]);

  const verified = await rpc(null, "verify_certificate", { p_code: result.certificate.verification_code.toLowerCase() });
  assert.deepEqual([verified.found, verified.valid, verified.recipient_name, verified.course_slug], [true, true, "Dave", "fondamentaux"]);
  assert.deepEqual(await rpc(null, "verify_certificate", { p_code: "AAAAAAAAAAAAAAAA" }), { found: false, valid: false });
  assert.equal((await as(ids.bob, "select id from public.certificates")).length, 0);

  const dashboard = await rpc(ids.dave, "get_my_dashboard");
  assert.equal(dashboard.stats.courses_completed, 1);
  assert.equal(dashboard.stats.certificates, 1);
  assert.equal(dashboard.challenges.length, 4);
  assert.equal(dashboard.recommendations.some((item) => item.slug === "fondamentaux"), false);
  assert.equal(dashboard.week.length, 7);
  const [progress] = await as(ids.dave, "select progress_percentage, status from public.course_progress");
  assert.deepEqual(progress, { progress_percentage: 100, status: "completed" });
});

test("streaks follow the learner’s own calendar day", async () => {
  const [{ today, expected }] = await sql("select private.user_today($1) as today, (now() at time zone 'Pacific/Kiritimati')::date as expected", [ids.frank]);
  assert.equal(String(today), String(expected));
  await sql("update public.profiles set last_activity_date = private.user_today(id) - 1, current_streak = 4, longest_streak = 4 where id = $1", [ids.frank]);
  await sql("select private.record_activity($1, 0, 0, 0, 0)", [ids.frank]);
  await sql("select private.record_activity($1, 0, 0, 0, 0)", [ids.frank]);
  assert.deepEqual([(await profile(ids.frank)).current_streak, (await profile(ids.frank)).longest_streak], [5, 5]);
  await sql("update public.profiles set last_activity_date = private.user_today(id) - 3 where id = $1", [ids.frank]);
  await sql("select private.record_activity($1, 0, 0, 0, 0)", [ids.frank]);
  assert.deepEqual([(await profile(ids.frank)).current_streak, (await profile(ids.frank)).longest_streak], [1, 5]);
  await sql("update public.profiles set last_activity_date = private.user_today(id) - 2, current_streak = 3 where id = $1", [ids.frank]);
  assert.equal((await rpc(ids.frank, "get_my_dashboard")).streak.current, 0, "a missed day breaks the displayed streak");
});

test("labs compare flags server-side with a wrong-answer budget", async () => {
  const wrong = await rpc(ids.gina, "submit_lab", { p_lab_id: lab("ch4"), p_answer: "mauvaise réponse" });
  assert.deepEqual(wrong, { correct: false, remaining_attempts: 9 });
  const [{ flag }] = await sql("select flag from private.lab_flags where lab_id = $1", [lab("ch4")]);
  const solved = await rpc(ids.gina, "submit_lab", { p_lab_id: lab("ch4"), p_answer: `  ${flag.toUpperCase()} ` });
  assert.deepEqual([solved.correct, solved.xp_awarded], [true, 70]);
  assert.deepEqual(solved.new_badges.map((badge) => badge.slug), ["premier-flag"]);
  assert.equal((await rpc(ids.gina, "submit_lab", { p_lab_id: lab("ch4"), p_answer: flag })).already_solved, true);

  for (let attempt = 0; attempt < 10; attempt += 1) await rpc(ids.gina, "submit_lab", { p_lab_id: lab("ch1"), p_answer: `essai ${attempt}` });
  const [{ flag: portFlag }] = await sql("select flag from private.lab_flags where lab_id = $1", [lab("ch1")]);
  await rejects(rpc(ids.gina, "submit_lab", { p_lab_id: lab("ch1"), p_answer: portFlag }), /Trop de tentatives/);
});

test("roles are enforced by the database, not by the interface", async () => {
  await rejects(rpc(ids.bob, "admin_overview"), /administrateurs/);
  const overview = await rpc(ids.admin, "admin_overview");
  assert.equal(overview.courses.published, 6);
  assert.equal(overview.signups_by_day.length, 14);
  const listing = await rpc(ids.admin, "admin_users", { p_search: "carol" });
  assert.deepEqual([listing.total, listing.users[0].lessons_completed], [1, 2]);

  await rejects(rpc(ids.admin, "admin_set_role", { p_user: ids.bob, p_role: "admin" }), /super-administrateurs/);
  await rpc(ids.root, "admin_set_role", { p_user: ids.bob, p_role: "admin" });
  assert.equal((await one(ids.bob, "select public.is_admin() as ok")).ok, true);
  await rejects(rpc(ids.root, "admin_set_role", { p_user: ids.root, p_role: "user" }), /propre rôle/);
  await rpc(ids.root, "admin_set_role", { p_user: ids.bob, p_role: "user" });
  const logs = await as(ids.root, "select action, details from public.admin_logs where action = 'set_role' order by id");
  assert.deepEqual(logs.map((log) => log.details.to), ["admin", "user"]);
  assert.equal((await as(ids.admin, "select id from public.admin_logs")).length, 0, "the audit log is reserved to super-administrators");
  assert.equal((await as(ids.bob, "select id from public.admin_logs")).length, 0);
  await rejects(as(ids.bob, "insert into public.admin_logs (action, target_type) values ('forge', 'x')"), /permission denied/);
  await rejects(rpc(ids.root, "delete_my_account"), /autre super-administrateur/);
});

test("admins adjust XP only through the audited ledger", async () => {
  await rejects(rpc(ids.admin, "admin_adjust_xp", { p_user: ids.admin, p_amount: 500, p_reason: "Je me fais plaisir" }), /propre XP/);
  await rejects(rpc(ids.admin, "admin_adjust_xp", { p_user: ids.bob, p_amount: -10, p_reason: "Correction d’erreur" }), /négatif/);
  const info = await rpc(ids.admin, "admin_adjust_xp", { p_user: ids.bob, p_amount: 150, p_reason: "Atelier présentiel validé" });
  assert.deepEqual([info.xp, info.level], [150, 2]);
  assert.equal(await ledgerTotal(ids.bob), 150);
  assert.equal((await as(ids.root, "select count(*)::int as n from public.admin_logs where action = 'adjust_xp'"))[0].n, 1);
});

test("drafts stay private and cannot be published incomplete", async () => {
  await rejects(as(ids.bob, "insert into public.courses (slug, title) values ('pirate', 'Cours pirate')"), /row-level security/);
  const [draft] = await as(ids.admin, "insert into public.courses (slug, title) values ('brouillon-test', 'Cours brouillon') returning id, created_by, status");
  assert.deepEqual([draft.created_by, draft.status], [ids.admin, "draft"]);
  assert.equal((await as(ids.bob, "select id from public.courses where id = $1", [draft.id])).length, 0);
  await rejects(as(ids.admin, "update public.courses set status = 'published' where id = $1", [draft.id]), /au moins un module/);
  const audit = await as(ids.root, "select action from public.admin_logs where target_id = $1", [draft.id]);
  assert.deepEqual(audit.map((row) => row.action), ["insert_courses"]);

  const imported = await rpc(ids.admin, "admin_import_course", { p_course: {
    title: "Sécurité du Wi-Fi",
    short_description: "Protéger son réseau sans fil.",
    level: "debutant",
    modules: [{
      title: "Configurer son routeur",
      lessons: [{
        title: "Choisir le bon chiffrement", duration_minutes: 8, xp_reward: 30,
        blocks: [{ type: "text", content: "WPA3 est aujourd’hui le protocole recommandé." }],
        quiz: { questions: [{ prompt: "Quel protocole privilégier ?", explanation: "WPA3 corrige les faiblesses de WPA2.",
          answers: [{ label: "WEP", is_correct: false }, { label: "WPA3", is_correct: true }] }] },
      }],
    }],
  } });
  assert.deepEqual([imported.slug, imported.modules, imported.lessons, imported.quizzes], ["securite-du-wi-fi", 1, 1, 1]);
  assert.equal((await as(null, "select id from public.courses where slug = 'securite-du-wi-fi'")).length, 0);

  const [{ id: quizId }] = await sql("select id from public.quizzes where course_id = $1", [imported.id]);
  await rejects(rpc(ids.admin, "admin_save_quiz", { p_quiz_id: quizId, p_questions: [{ prompt: "Question sans réponse ?", answers: [{ label: "A" }, { label: "B" }] }] }), /bonne réponse/);
  const editor = await rpc(ids.admin, "admin_get_quiz", { p_quiz_id: quizId });
  assert.equal(editor.questions[0].answers.find((answer) => answer.is_correct).label, "WPA3");
  await rejects(rpc(ids.bob, "admin_get_quiz", { p_quiz_id: quizId }), /administrateurs/);

  await as(ids.admin, "update public.courses set status = 'published' where id = $1", [imported.id]);
  assert.equal((await as(null, "select id from public.courses where slug = 'securite-du-wi-fi'")).length, 1);
  assert.equal((await as(ids.carol, "select count(*)::int as n from public.notifications where type = 'course'"))[0].n, 0);
});

test("certificates can be revoked and restored by staff", async () => {
  const [cert] = await sql("select id, verification_code from public.certificates where user_id = $1", [ids.dave]);
  await rejects(rpc(ids.dave, "admin_revoke_certificate", { p_certificate_id: cert.id, p_reason: "Tentative de triche" }), /administrateurs/);
  await rpc(ids.admin, "admin_revoke_certificate", { p_certificate_id: cert.id, p_reason: "Fraude avérée à l’examen" });
  const revoked = await rpc(null, "verify_certificate", { p_code: cert.verification_code });
  assert.deepEqual([revoked.found, revoked.valid, revoked.revoked_reason], [true, false, "Fraude avérée à l’examen"]);
  await rpc(ids.admin, "admin_restore_certificate", { p_certificate_id: cert.id });
  assert.equal((await rpc(null, "verify_certificate", { p_code: cert.verification_code })).valid, true);
});

test("broadcasts reach the chosen audience", async () => {
  const sent = await rpc(ids.admin, "admin_broadcast_notification", { p_title: "Nouveau parcours Wi-Fi", p_body: "Découvre-le dès maintenant.", p_link: "/courses/securite-du-wi-fi", p_audience: "learners" });
  const [{ learners }] = await sql("select count(*)::int as learners from public.profiles where role = 'user'");
  assert.equal(sent, learners);
  assert.equal((await as(ids.admin, "select id from public.notifications where title = 'Nouveau parcours Wi-Fi'")).length, 0);
  await rejects(rpc(ids.admin, "admin_broadcast_notification", { p_title: "Lien externe", p_body: "", p_link: "https://evil.test", p_audience: "all" }), /chemin interne/);
});

test("storage folders are isolated per user and content media is staff-only", async () => {
  await as(ids.carol, "insert into storage.objects (bucket_id, name) values ('avatars', $1)", [`${ids.carol}/avatar.webp`]);
  await rejects(as(ids.carol, "insert into storage.objects (bucket_id, name) values ('avatars', $1)", [`${ids.bob}/avatar.webp`]), /row-level security/);
  await rejects(as(ids.carol, "insert into storage.objects (bucket_id, name) values ('course-images', 'wifi.png')"), /row-level security/);
  await as(ids.admin, "insert into storage.objects (bucket_id, name) values ('course-images', 'wifi.png')");
  await rejects(as(ids.carol, "insert into storage.objects (bucket_id, name) values ('certificates', $1)", [`${ids.carol}/faux.pdf`]), /row-level security/);
  await rejects(as(ids.carol, "insert into storage.objects (bucket_id, name) values ('mascot-voice', 'faux.webm')"), /row-level security/);
  await as(ids.admin, "insert into storage.objects (bucket_id, name) values ('mascot-voice', 'bienvenue.webm')");
  const buckets = await sql("select id, public from storage.buckets order by id");
  assert.deepEqual(buckets.map((bucket) => `${bucket.id}:${bucket.public}`), ["avatars:true", "certificates:false", "course-images:true", "lesson-assets:true", "mascot-voice:true"]);
  const voice = (await sql("select file_size_limit, allowed_mime_types from storage.buckets where id = 'mascot-voice'"))[0];
  assert.equal(voice.file_size_limit, 5242880);
  assert.ok(voice.allowed_mime_types.every((type) => type.startsWith("audio/")), "the voice bucket only accepts audio");
  await as(ids.carol, "update public.profiles set avatar_path = $2 where id = $1", [ids.carol, `${ids.carol}/avatar.webp`]);
  await rejects(as(ids.carol, "update public.profiles set avatar_path = $2 where id = $1", [ids.carol, `${ids.bob}/avatar.webp`]), /check constraint/);
});

test("the contact form is rate limited per client", async () => {
  const headers = { "x-forwarded-for": "203.0.113.9, 10.0.0.1" };
  const message = "Bonjour, une explication de la leçon DNS mériterait un schéma.";
  for (let index = 0; index < 5; index += 1) {
    await one(null, "select public.submit_contact_message('Améliorer une explication', 'visiteur@example.test', $1)", [message], headers);
  }
  await rejects(one(null, "select public.submit_contact_message('Autre', null, $1)", [message], headers), /Trop de messages/);
  await one(null, "select public.submit_contact_message('Autre', null, $1)", [message], { "x-forwarded-for": "198.51.100.4" });
  assert.equal((await as(ids.bob, "select id from public.contact_messages")).length, 0);
  assert.equal((await as(ids.admin, "select id from public.contact_messages")).length, 6);
});

test("resetting progress keeps certificates but clears the ledger", async () => {
  await rpc(ids.dave, "reset_my_progress");
  const dave = await profile(ids.dave);
  assert.deepEqual([dave.xp, dave.level, dave.current_streak], [0, 1, 0]);
  assert.equal(await ledgerTotal(ids.dave), 0);
  assert.equal((await as(ids.dave, "select lesson_id from public.lesson_progress")).length, 0);
  assert.equal((await as(ids.dave, "select id from public.certificates")).length, 1);
  const stats = await rpc(ids.dave, "get_my_stats");
  assert.deepEqual([stats.xp, stats.lessons_completed, stats.certificates], [0, 0, 1]);
});
