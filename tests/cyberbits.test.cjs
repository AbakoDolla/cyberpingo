// Database tests for CyberBits: the ledger, the rewards derived from real progress, the shop, the lab gate and the admin tools.
// They run with the economy closed (economy: "real"), exactly as in production; the other database tests keep it open.
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
const balance = async (uid) => Number((await sql("select coalesce((select balance from public.cb_wallets where user_id = $1), 0) as balance", [uid]))[0].balance);
const ledger = (uid) => sql("select reason, amount, reference_id, source from public.cb_transactions where user_id = $1 order by id", [uid]);
const byReason = async (uid) => {
  const rows = await sql("select reason, sum(amount)::int as total, count(*)::int as n from public.cb_transactions where user_id = $1 group by reason", [uid]);
  return Object.fromEntries(rows.map((row) => [row.reason, row]));
};
const grant = (uid, amount) => rpc(ids.admin, "admin_adjust_cb", { p_user: uid, p_amount: amount, p_reason: "Crédit de test pour la boutique" });
const courseId = async (slug) => (await sql("select id from public.courses where slug = $1", [slug]))[0].id;
const firstLessonOf = async (slug) => (await sql(`select l.id from public.lessons l join public.course_modules m on m.id = l.module_id
  join public.courses c on c.id = l.course_id where c.slug = $1 order by m.position, l.position limit 1`, [slug]))[0].id;

// A tiny free course made by the test itself, so the rewards do not depend on the size of the real programmes.
async function createMiniCourse() {
  const courseKey = course("eclair");
  const moduleId = contentId("module", "eclair:1");
  await sql(`insert into public.courses (id, slug, title, short_description, description, level, category, icon, estimated_duration, position)
    values ($1, 'parcours-eclair', 'Parcours éclair', 'Trois leçons et un quiz.', 'Parcours de test.', 'debutant', 'Fondamentaux', 'fondamentaux', 30, 99)`, [courseKey]);
  await sql("insert into public.course_modules (id, course_id, title, description, position) values ($1, $2, 'Module éclair', 'Un seul module.', 1)", [moduleId, courseKey]);
  for (const [index, key] of ["eclair-1", "eclair-2", "eclair-3"].entries()) {
    await sql(`insert into public.lessons (id, course_id, module_id, title, summary, content, duration_minutes, xp_reward, position)
      values ($1, $2, $3, $4, 'Une leçon de test.', $5, 10, $6, $7)`,
    [lesson(key), courseKey, moduleId, `Leçon éclair ${index + 1}`, { blocks: [{ type: "text", content: "Contenu." }] }, [40, 45, 40][index], index + 1]);
  }
  await sql("insert into public.quizzes (id, course_id, module_id, lesson_id, title, pass_percentage, position) values ($1, $2, $3, $4, 'Quiz éclair', 70, 3)",
    [quiz("eclair-quiz"), courseKey, moduleId, lesson("eclair-3")]);
  for (const number of [1, 2]) {
    const questionId = contentId("question", `eclair:${number}`);
    await sql(`insert into public.quiz_questions (id, quiz_id, position, question_type, prompt, explanation, difficulty, xp_reward)
      values ($1, $2, $3, 'single_choice', $4, 'Explication.', 'facile', 30)`, [questionId, quiz("eclair-quiz"), number, `Question ${number} ?`]);
    for (const [position, label] of ["Bonne réponse", "Mauvaise réponse"].entries()) {
      await sql("insert into public.quiz_answers (id, question_id, position, label, is_correct) values ($1, $2, $3, $4, $5)",
        [contentId("answer", `eclair:${number}:${position}`), questionId, position + 1, label, position === 0]);
    }
  }
  await sql("update public.courses set status = 'published' where id = $1", [courseKey]);
}

// A published lab solved task by task (most labs) or by one flag (the oldest ones).
const taskLab = async () => (await sql(`select l.id, l.slug, l.difficulty from public.labs l
  where l.status = 'published' and l.difficulty = 'intermediaire' and not l.is_assessment and exists (select 1 from public.lab_tasks t where t.lab_id = l.id)
  order by l.position limit 1`))[0];
const flagLab = async () => (await sql(`select l.id, l.slug, l.difficulty, f.flag from public.labs l join private.lab_flags f on f.lab_id = l.id
  where l.status = 'published' and l.difficulty = 'debutant' order by l.position limit 1`))[0];
async function solveTaskLab(uid, labId) {
  const tasks = await sql(`select t.id, k.accepted from public.lab_tasks t join private.lab_task_keys k on k.task_id = t.id where t.lab_id = $1 order by t.position`, [labId]);
  let result;
  for (const task of tasks) result = await rpc(uid, "submit_lab_task", { p_task_id: task.id, p_answer: task.accepted[0] });
  return result;
}

before(async () => {
  db = await createSupabaseDatabase({ seed: true, economy: "real" });
  for (const [name, email] of [["ana", "ana@example.test"], ["ben", "ben@example.test"], ["cleo", "cleo@example.test"], ["dan", "dan@example.test"],
    ["erin", "erin@example.test"], ["frank", "frank@example.test"], ["gina", "gina@example.test"], ["hana", "hana@example.test"], ["admin", "admin@example.test"], ["root", "root@example.test"]]) {
    ids[name] = await createUser(email, { display_name: name });
  }
  await sql("update public.profiles set role = 'admin' where id = $1", [ids.admin]);
  await sql("update public.profiles set role = 'superadmin' where id = $1", [ids.root]);
  await createMiniCourse();
});

after(async () => { await db?.close(); });

test("the rules, the prices and the settings are public, and every learner starts with an empty wallet", async () => {
  const rules = await as(null, "select key, kind, amount, is_active from public.cb_rules order by position");
  assert.deepEqual(Object.fromEntries(rules.filter((rule) => rule.kind === "reward").map((rule) => [rule.key, rule.amount])), {
    lesson_completed: 10, quiz_passed: 5, quiz_perfect: 5, module_completed: 25,
    course_completed_debutant: 100, course_completed_intermediaire: 150, course_completed_avance: 250,
    challenge_daily: 5, challenge_weekly: 40, challenge_one_time: 20, daily_activity: 5, lab_completed: 15,
  });
  assert.deepEqual(Object.fromEntries(rules.filter((rule) => rule.kind === "price").map((rule) => [rule.key, rule.amount])), {
    price_course_debutant: 0, price_course_intermediaire: 120, price_course_avance: 250,
    price_lab_debutant: 30, price_lab_intermediaire: 80, price_lab_avance: 180,
  });
  assert.deepEqual(await as(null, "select rewards_enabled, purchases_enabled, gating_enabled from public.cb_settings"), [{ rewards_enabled: true, purchases_enabled: true, gating_enabled: true }]);
  assert.equal(await balance(ids.ana), 0);
  assert.equal((await rpc(ids.ana, "get_my_wallet")).balance, 0);
});

test("the catalogue shows prices, unlock state and prerequisites, even to a visitor", async () => {
  const visitor = await rpc(null, "get_cb_catalog");
  const bySlug = Object.fromEntries(visitor.courses.map((entry) => [entry.slug, entry]));
  assert.equal(bySlug.fondamentaux.price, 0);
  assert.equal(bySlug.fondamentaux.unlocked, true);
  assert.equal(bySlug.reseaux.unlocked, true);
  for (const slug of ["linux", "securite-web", "analyse-logs"]) {
    assert.equal(bySlug[slug].price, 120, slug);
    assert.equal(bySlug[slug].unlocked, false, slug);
  }
  assert.equal(bySlug["pentest-intro"].price, 250);
  assert.equal(bySlug["pentest-intro"].prerequisite.slug, "fondamentaux");
  assert.equal(bySlug["pentest-intro"].prerequisite.completed, false);
  const tier = { debutant: 30, intermediaire: 80, avance: 180 };
  assert.equal(visitor.labs.length, 54);
  assert.ok(visitor.labs.every((entry) => entry.price === tier[entry.difficulty] && entry.custom_price === false));
  assert.ok(visitor.labs.every((entry) => entry.unlocked === false));
  assert.equal(visitor.balance, 0);
});

test("learning pays CyberBits once per lesson, quiz, module and course, and never twice", async () => {
  const first = await studyLesson(ids.ana, "eclair-1");
  assert.equal(first.cyberbits.gained, 15);
  assert.equal(first.cyberbits.balance, 15);
  assert.deepEqual(first.cyberbits.items.map((item) => [item.reason, item.amount]).sort(), [["daily_activity", 5], ["lesson_completed", 10]]);

  const replay = await rpc(ids.ana, "complete_lesson", { p_lesson_id: lesson("eclair-1") });
  assert.equal(replay.already_completed, true);
  assert.equal(replay.cyberbits.gained, 0);
  assert.equal(await balance(ids.ana), 15);

  await studyLesson(ids.ana, "eclair-2");
  await studyLesson(ids.ana, "eclair-3");
  const passed = await rpc(ids.ana, "submit_quiz", { p_quiz_id: quiz("eclair-quiz"), p_answers: await answerKey(quiz("eclair-quiz")) });
  assert.equal(passed.passed, true);
  assert.ok(passed.cyberbits.items.some((item) => item.reason === "quiz_perfect"));
  assert.ok(passed.cyberbits.items.some((item) => item.reason === "course_completed" && item.amount === 100));

  const totals = await byReason(ids.ana);
  assert.equal(totals.lesson_completed.total, 30);
  assert.equal(totals.quiz_passed.total, 5);
  assert.equal(totals.quiz_perfect.total, 5);
  assert.equal(totals.module_completed.total, 25);
  assert.equal(totals.course_completed.total, 100);
  assert.equal(totals.daily_activity.total, 5);
  assert.ok(totals.challenge_completed.total >= 10 && totals.challenge_completed.total % 5 === 0);

  // A second pass of the quiz, even perfect, pays nothing more.
  const again = await rpc(ids.ana, "submit_quiz", { p_quiz_id: quiz("eclair-quiz"), p_answers: await answerKey(quiz("eclair-quiz")) });
  assert.equal(again.cyberbits.gained, 0);
});

test("resetting progress keeps the wallet and cannot be used to farm the same rewards again", async () => {
  const before = { balance: await balance(ids.ana), rows: (await ledger(ids.ana)).length };
  await rpc(ids.ana, "reset_my_progress");
  assert.equal(await balance(ids.ana), before.balance);
  const replay = await studyLesson(ids.ana, "eclair-1");
  assert.equal(replay.cyberbits.gained, 0);
  assert.equal(await balance(ids.ana), before.balance);
  assert.equal((await ledger(ids.ana)).length, before.rows);
});

test("the wallet is always the sum of an append-only ledger", async () => {
  const wallets = await sql(`select w.user_id, w.balance, w.lifetime_earned, w.lifetime_spent,
    coalesce(sum(t.amount), 0)::int as total, coalesce(sum(t.amount) filter (where t.amount > 0), 0)::int as earned,
    coalesce(-sum(t.amount) filter (where t.amount < 0), 0)::int as spent
    from public.cb_wallets w left join public.cb_transactions t on t.user_id = w.user_id group by w.user_id`);
  assert.ok(wallets.length >= 9);
  for (const wallet of wallets) {
    assert.equal(wallet.balance, wallet.total);
    assert.equal(wallet.lifetime_earned, wallet.earned);
    assert.equal(wallet.lifetime_spent, wallet.spent);
  }
  await rejects(sql("update public.cb_transactions set amount = amount + 1 where id = (select min(id) from public.cb_transactions)"), /lecture seule/);
  await rejects(sql("insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id) values ($1, 10, 'lesson_completed', 'lesson', $2)", [ids.ana, lesson("eclair-1")]), /duplicate key/);
  await rejects(sql("insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id) values ($1, -5, 'lesson_completed', 'lesson', 'x')", [ids.ana]), /violates check constraint/);
  await rejects(sql("insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id) values ($1, -500, 'course_unlock', 'course', 'x')", [ids.dan]), /cb_wallets_balance_check/);
});

test("clients read their own CyberBits and can never write them", async () => {
  assert.equal((await as(ids.ben, "select user_id from public.cb_wallets")).length, 1);
  assert.equal((await as(ids.ben, "select id from public.cb_transactions where user_id = $1", [ids.ana])).length, 0);
  assert.ok((await as(ids.admin, "select user_id from public.cb_wallets")).length >= 9);
  assert.ok((await as(ids.admin, "select id from public.cb_transactions where user_id = $1", [ids.ana])).length > 0);
  await rejects(as(ids.ana, "update public.cb_wallets set balance = 999999"), /permission denied/);
  await rejects(as(ids.ana, "insert into public.cb_transactions (user_id, amount, reason, reference_type, reference_id) values ($1, 500, 'lab_completed', 'lab', 'x')", [ids.ana]), /permission denied/);
  await rejects(as(ids.ana, "update public.cb_transactions set amount = 500"), /permission denied/);
  await rejects(as(ids.ana, "delete from public.cb_transactions"), /permission denied/);
  await rejects(as(ids.ana, "insert into public.course_unlocks (user_id, course_id, source) values ($1, $2, 'purchase')", [ids.ana, await courseId("linux")]), /permission denied/);
  await rejects(as(ids.ana, "update public.cb_rules set amount = 9999"), /permission denied/);
  await rejects(as(ids.ana, "update public.cb_settings set gating_enabled = false"), /permission denied/);
  await rejects(as(ids.ana, "update public.courses set cb_price = 0"), /permission denied/);
  await rejects(as(ids.ana, "update public.labs set cb_price = 0"), /permission denied/);
});

test("a course must be bought before it can be followed, and a purchase is atomic", async () => {
  const linux = await courseId("linux");
  const linuxLesson = await firstLessonOf("linux");

  await rejects(rpc(ids.ben, "unlock_course", { p_course_id: linux }), /Il te manque 120 CyberBits/);
  assert.equal((await ledger(ids.ben)).length, 0);
  assert.equal((await sql("select count(*)::int as n from public.course_unlocks where user_id = $1", [ids.ben]))[0].n, 0);
  await rejects(rpc(ids.ben, "start_lesson", { p_lesson_id: linuxLesson }), /Débloque ce parcours avec tes CyberBits/);
  await rejects(rpc(ids.ben, "enroll_in_course", { p_course_id: linux }), /Débloque ce parcours/);

  await grant(ids.ben, 500);
  assert.equal(await balance(ids.ben), 500);
  const bought = await rpc(ids.ben, "unlock_course", { p_course_id: linux });
  assert.deepEqual({ unlocked: bought.unlocked, already: bought.already_unlocked, paid: bought.price_paid, balance: bought.balance }, { unlocked: true, already: false, paid: 120, balance: 380 });
  assert.equal(await balance(ids.ben), 380);
  assert.deepEqual((await ledger(ids.ben)).map((row) => [row.reason, row.amount, row.source]), [["admin_adjustment", 500, "admin"], ["course_unlock", -120, "purchase"]]);
  assert.deepEqual(await sql("select source, price_paid from public.course_unlocks where user_id = $1", [ids.ben]), [{ source: "purchase", price_paid: 120 }]);

  const again = await rpc(ids.ben, "unlock_course", { p_course_id: linux });
  assert.equal(again.already_unlocked, true);
  assert.equal(await balance(ids.ben), 380);
  assert.equal((await ledger(ids.ben)).length, 2);

  assert.equal((await rpc(ids.ben, "start_lesson", { p_lesson_id: linuxLesson })).status, "in_progress");
  const catalog = await rpc(ids.ben, "get_cb_catalog");
  const entry = catalog.courses.find((course) => course.slug === "linux");
  assert.deepEqual({ unlocked: entry.unlocked, source: entry.unlock_source, enrolled: entry.enrolled }, { unlocked: true, source: "purchase", enrolled: true });
  assert.equal(catalog.balance, 380);

  await rejects(rpc(ids.ben, "unlock_course", { p_course_id: contentId("course", "inconnu") }), /n’est pas disponible/);
  await rejects(rpc(null, "unlock_course", { p_course_id: linux }), /permission denied/);
});

test("a prerequisite course must be completed first", async () => {
  const pentest = await courseId("pentest-intro");
  await grant(ids.cleo, 1000);
  await rejects(rpc(ids.cleo, "unlock_course", { p_course_id: pentest }), /Termine d’abord « .+ » pour débloquer ce parcours/);
  assert.equal(await balance(ids.cleo), 1000);
  await sql("insert into public.enrollments (user_id, course_id, status, completed_at) values ($1, $2, 'completed', now())", [ids.cleo, await courseId("fondamentaux")]);
  const bought = await rpc(ids.cleo, "unlock_course", { p_course_id: pentest });
  assert.equal(bought.price_paid, 250);
  assert.equal(await balance(ids.cleo), 750);
  assert.equal((await rpc(ids.cleo, "get_cb_catalog")).courses.find((entry) => entry.slug === "pentest-intro").prerequisite.completed, true);
});

test("a locked lab refuses answers before comparing them, so it reveals nothing", async () => {
  const lab = await taskLab();
  const [task] = await sql("select t.id, k.accepted from public.lab_tasks t join private.lab_task_keys k on k.task_id = t.id where t.lab_id = $1 order by t.position limit 1", [lab.id]);
  const events = () => sql("select count(*)::int as n from private.rate_events where key like 'labtask:%'").then((rows) => rows[0].n);
  const before = await events();

  await rejects(rpc(ids.dan, "submit_lab_task", { p_task_id: task.id, p_answer: "une mauvaise réponse" }), /Débloque ce lab avec tes CyberBits/);
  await rejects(rpc(ids.dan, "submit_lab_task", { p_task_id: task.id, p_answer: task.accepted[0] }), /Débloque ce lab avec tes CyberBits/);
  await rejects(rpc(ids.dan, "submit_lab_report", { p_lab_id: lab.id, p_note: "Mon compte rendu" }), /Débloque ce lab/);
  assert.equal(await events(), before, "a refused attempt must not even count against the wrong-answer budget");
  assert.equal((await sql("select count(*)::int as n from public.lab_task_completions where user_id = $1", [ids.dan]))[0].n, 0);

  await rejects(rpc(ids.dan, "unlock_lab", { p_lab_id: lab.id }), /Il te manque 80 CyberBits/);
  await grant(ids.dan, 200);
  const bought = await rpc(ids.dan, "unlock_lab", { p_lab_id: lab.id });
  assert.deepEqual({ paid: bought.price_paid, balance: bought.balance, already: bought.already_unlocked }, { paid: 80, balance: 120, already: false });
  assert.equal((await rpc(ids.dan, "unlock_lab", { p_lab_id: lab.id })).already_unlocked, true);
  assert.equal(await balance(ids.dan), 120);

  assert.equal((await rpc(ids.dan, "submit_lab_task", { p_task_id: task.id, p_answer: "une mauvaise réponse" })).correct, false);
  const done = await solveTaskLab(ids.dan, lab.id);
  assert.equal(done.lab_completed, true);
  assert.ok(done.cyberbits.items.some((item) => item.reason === "lab_completed" && item.amount === 15));
  assert.equal((await byReason(ids.dan)).lab_completed.total, 15);
});

test("flag labs follow the same gate, and a free lab needs no unlock", async () => {
  const lab = await flagLab();
  await rejects(rpc(ids.erin, "submit_lab", { p_lab_id: lab.id, p_answer: "mauvais" }), /Débloque ce lab avec tes CyberBits/);
  await rejects(rpc(ids.erin, "submit_lab", { p_lab_id: lab.id, p_answer: lab.flag }), /Débloque ce lab avec tes CyberBits/);

  await rpc(ids.admin, "admin_set_cb_price", { p_kind: "lab", p_id: lab.id, p_price: 0, p_reason: "Lab offert pour le test" });
  assert.equal((await rpc(ids.erin, "submit_lab", { p_lab_id: lab.id, p_answer: "mauvais" })).correct, false);
  const solved = await rpc(ids.erin, "submit_lab", { p_lab_id: lab.id, p_answer: lab.flag });
  assert.equal(solved.correct, true);
  assert.equal((await byReason(ids.erin)).lab_completed.total, 15);
  assert.equal((await sql("select count(*)::int as n from public.lab_unlocks where user_id = $1", [ids.erin]))[0].n, 0);

  await rpc(ids.admin, "admin_set_cb_price", { p_kind: "lab", p_id: lab.id, p_price: null, p_reason: "Retour au prix du niveau" });
  const catalogLab = (await rpc(ids.erin, "get_cb_catalog")).labs.find((entry) => entry.id === lab.id);
  assert.deepEqual({ price: catalogLab.price, custom: catalogLab.custom_price, unlocked: catalogLab.unlocked, completed: catalogLab.completed }, { price: 30, custom: false, unlocked: true, completed: true });
});

test("staff can open a lab for one learner, and admins preview without paying", async () => {
  const lab = await flagLab();
  await rejects(rpc(ids.gina, "submit_lab", { p_lab_id: lab.id, p_answer: lab.flag }), /Débloque ce lab/);
  await rpc(ids.admin, "admin_grant_unlock", { p_kind: "lab", p_id: lab.id, p_user: ids.gina, p_reason: "Accès offert par le support" });
  assert.equal((await rpc(ids.gina, "submit_lab", { p_lab_id: lab.id, p_answer: lab.flag })).correct, true);
  assert.deepEqual(await sql("select source, price_paid from public.lab_unlocks where user_id = $1", [ids.gina]), [{ source: "admin", price_paid: 0 }]);
  assert.equal((await sql("select count(*)::int as n from public.notifications where user_id = $1 and title = 'Accès débloqué'", [ids.gina]))[0].n, 1);

  const linuxLesson = await firstLessonOf("linux");
  assert.equal((await rpc(ids.admin, "start_lesson", { p_lesson_id: linuxLesson })).status, "in_progress");
  assert.equal((await rpc(ids.admin, "get_cb_catalog")).courses.find((entry) => entry.slug === "linux").unlocked, true);
});

test("learners who were already inside keep their access", async () => {
  const linux = await courseId("linux");
  const lab = await taskLab();
  await sql("insert into public.enrollments (user_id, course_id) values ($1, $2)", [ids.frank, linux]);
  await sql("insert into public.lab_task_completions (user_id, task_id, lab_id) select $1, t.id, t.lab_id from public.lab_tasks t where t.lab_id = $2 order by t.position limit 1", [ids.frank, lab.id]);
  await sql("select private.cb_grandfather()");
  assert.deepEqual(await sql("select source from public.course_unlocks where user_id = $1", [ids.frank]), [{ source: "grandfathered" }]);
  assert.deepEqual(await sql("select source from public.lab_unlocks where user_id = $1", [ids.frank]), [{ source: "grandfathered" }]);
  await sql("select private.cb_grandfather()");
  assert.equal((await sql("select count(*)::int as n from public.course_unlocks where user_id = $1", [ids.frank]))[0].n, 1);
  assert.equal((await rpc(ids.frank, "start_lesson", { p_lesson_id: await firstLessonOf("linux") })).status, "in_progress");
  assert.equal((await rpc(ids.frank, "get_cb_catalog")).courses.find((entry) => entry.slug === "linux").unlock_source, "grandfathered");
});

test("the past progress of a learner is rewarded once, with the same result however often it runs", async () => {
  for (const key of ["eclair-1", "eclair-2", "eclair-3"]) await studyLesson(ids.hana, key);
  await rpc(ids.hana, "submit_quiz", { p_quiz_id: quiz("eclair-quiz"), p_answers: await answerKey(quiz("eclair-quiz")) });
  const key = (row) => `${row.reason}|${row.reference_id}|${row.amount}`;
  const snapshot = (await ledger(ids.hana)).map(key).sort();
  const total = await balance(ids.hana);
  assert.ok(total >= 180);
  await sql("delete from public.cb_transactions where user_id = $1", [ids.hana]);
  const [{ rewarded }] = await sql("select private.sync_cb_rewards($1, 'backfill') as rewarded", [ids.hana]);
  assert.equal(rewarded, snapshot.length);
  assert.deepEqual((await ledger(ids.hana)).map(key).sort(), snapshot);
  assert.ok((await ledger(ids.hana)).every((row) => row.source === "backfill"));
  assert.equal(await balance(ids.hana), total);
  assert.equal((await sql("select private.sync_cb_rewards($1, 'backfill') as rewarded", [ids.hana]))[0].rewarded, 0);
});

test("the history lists the movements with the balance after each one", async () => {
  const wallet = await rpc(ids.ben, "get_my_wallet");
  assert.deepEqual({ balance: wallet.balance, earned: wallet.lifetime_earned, spent: wallet.lifetime_spent, courses: wallet.unlocked_courses }, { balance: 380, earned: 500, spent: 120, courses: 1 });
  const page = await rpc(ids.ben, "get_my_cb_history", { p_limit: 1 });
  assert.equal(page.transactions.length, 1);
  assert.deepEqual({ reason: page.transactions[0].reason, amount: page.transactions[0].amount, after: page.transactions[0].balance_after }, { reason: "course_unlock", amount: -120, after: 380 });
  const next = await rpc(ids.ben, "get_my_cb_history", { p_limit: 5, p_before: page.transactions[0].id });
  assert.deepEqual(next.transactions.map((row) => [row.reason, row.balance_after]), [["admin_adjustment", 500]]);
  assert.equal((await rpc(ids.ben, "get_my_cb_history", { p_limit: 500 })).transactions.length, 2);
});

test("only staff run the economy, with a written reason, and every change is audited", async () => {
  const forbidden = /Accès réservé aux administrateurs/;
  const lab = await flagLab();
  const calls = [
    ["admin_cb_overview", {}], ["admin_cb_wallets", {}], ["admin_cb_transactions", {}],
    ["admin_set_cb_rule", { p_key: "lesson_completed", p_amount: 99, p_active: true, p_reason: "Tentative d’un apprenant" }],
    ["admin_set_cb_price", { p_kind: "lab", p_id: lab.id, p_price: 0, p_reason: "Tentative d’un apprenant" }],
    ["admin_set_cb_prerequisite", { p_course_id: await courseId("linux"), p_prerequisite_id: null, p_reason: "Tentative d’un apprenant" }],
    ["admin_set_cb_settings", { p_rewards: false, p_purchases: false, p_gating: false, p_paused_reason: null, p_reason: "Tentative d’un apprenant" }],
    ["admin_adjust_cb", { p_user: ids.ana, p_amount: 100, p_reason: "Tentative d’un apprenant" }],
    ["admin_grant_unlock", { p_kind: "lab", p_id: lab.id, p_user: ids.ana, p_reason: "Tentative d’un apprenant" }],
  ];
  for (const [fn, args] of calls) await rejects(rpc(ids.ana, fn, args), forbidden, fn);
  assert.equal((await rpc(null, "get_cb_catalog")).labs.length, 54);
  await rejects(rpc(null, "admin_cb_overview"), /permission denied/);

  await rejects(rpc(ids.admin, "admin_set_cb_rule", { p_key: "lesson_completed", p_amount: 20, p_active: true, p_reason: "ok" }), /Explique le changement/);
  await rejects(rpc(ids.admin, "admin_set_cb_rule", { p_key: "lesson_completed", p_amount: -1, p_active: true, p_reason: "Montant négatif refusé" }), /entre 0 et 10 000/);
  await rejects(rpc(ids.admin, "admin_set_cb_rule", { p_key: "inconnue", p_amount: 5, p_active: true, p_reason: "Règle qui n’existe pas" }), /Règle inconnue/);
  await rpc(ids.admin, "admin_set_cb_rule", { p_key: "lesson_completed", p_amount: 20, p_active: true, p_reason: "Semaine de lancement : leçons doublées" });
  await rpc(ids.admin, "admin_set_cb_rule", { p_key: "price_course_intermediaire", p_amount: 100, p_active: true, p_reason: "Prix de lancement" });
  const log = await sql("select actor_id, details from public.admin_logs where action = 'set_cb_rule' order by id");
  assert.equal(log.length, 2);
  assert.equal(log[0].actor_id, ids.admin);
  assert.deepEqual(log[0].details.from, { amount: 10, active: true });
  assert.equal(log[0].details.reason, "Semaine de lancement : leçons doublées");
  assert.equal((await rpc(null, "get_cb_catalog")).courses.find((entry) => entry.slug === "linux").price, 100);

  // The new amounts apply to what is earned next; past rewards are never rewritten, not even by a new synchronisation.
  const gain = await studyLesson(ids.gina, "eclair-1");
  assert.equal(gain.cyberbits.items.find((item) => item.reason === "lesson_completed").amount, 20);
  assert.equal((await byReason(ids.hana)).lesson_completed.total, 30);
  await sql("select private.sync_cb_rewards($1, 'backfill')", [ids.hana]);
  assert.equal((await byReason(ids.hana)).lesson_completed.total, 30);
  await rpc(ids.admin, "admin_set_cb_rule", { p_key: "lesson_completed", p_amount: 10, p_active: true, p_reason: "Fin de la semaine de lancement" });
  await rpc(ids.admin, "admin_set_cb_rule", { p_key: "price_course_intermediaire", p_amount: 120, p_active: true, p_reason: "Retour au prix normal" });
});

test("prices and prerequisites can be customised per item, without loops", async () => {
  const linux = await courseId("linux");
  const web = await courseId("securite-web");
  await rejects(rpc(ids.admin, "admin_set_cb_price", { p_kind: "course", p_id: linux, p_price: 20000, p_reason: "Prix absurde refusé" }), /entre 0 et 10 000/);
  await rejects(rpc(ids.admin, "admin_set_cb_price", { p_kind: "badge", p_id: linux, p_price: 10, p_reason: "Type d’élément inconnu" }), /Type d’élément inconnu/);
  await rejects(rpc(ids.admin, "admin_set_cb_price", { p_kind: "course", p_id: contentId("course", "x"), p_price: 10, p_reason: "Parcours qui n’existe pas" }), /Parcours introuvable/);
  await rpc(ids.admin, "admin_set_cb_price", { p_kind: "course", p_id: web, p_price: 200, p_reason: "Parcours premium du semestre" });
  const entry = (await rpc(null, "get_cb_catalog")).courses.find((course) => course.slug === "securite-web");
  assert.deepEqual({ price: entry.price, custom: entry.custom_price }, { price: 200, custom: true });
  await rpc(ids.admin, "admin_set_cb_price", { p_kind: "course", p_id: web, p_price: null, p_reason: "Retour au prix du niveau" });
  assert.equal((await rpc(null, "get_cb_catalog")).courses.find((course) => course.slug === "securite-web").price, 120);

  await rpc(ids.admin, "admin_set_cb_prerequisite", { p_course_id: linux, p_prerequisite_id: await courseId("reseaux"), p_reason: "Linux après les bases réseau" });
  await rejects(rpc(ids.admin, "admin_set_cb_prerequisite", { p_course_id: linux, p_prerequisite_id: linux, p_reason: "Un parcours ne peut pas se précéder" }), /boucle/);
  await rejects(rpc(ids.admin, "admin_set_cb_prerequisite", { p_course_id: await courseId("reseaux"), p_prerequisite_id: linux, p_reason: "Boucle indirecte refusée" }), /boucle/);
  await rpc(ids.admin, "admin_set_cb_prerequisite", { p_course_id: linux, p_prerequisite_id: null, p_reason: "Prérequis retiré" });
  assert.equal((await rpc(null, "get_cb_catalog")).courses.find((course) => course.slug === "linux").prerequisite, null);
});

test("an adjustment needs a reason, a real target, and can never make a balance negative", async () => {
  await rejects(rpc(ids.admin, "admin_adjust_cb", { p_user: ids.admin, p_amount: 100, p_reason: "Pour moi-même" }), /ne peux pas ajuster tes propres/);
  await rejects(rpc(ids.admin, "admin_adjust_cb", { p_user: ids.frank, p_amount: 0, p_reason: "Montant nul refusé" }), /hors zéro/);
  await rejects(rpc(ids.admin, "admin_adjust_cb", { p_user: ids.frank, p_amount: 6000, p_reason: "Montant trop grand" }), /entre -5 000 et 5 000/);
  await rejects(rpc(ids.admin, "admin_adjust_cb", { p_user: ids.frank, p_amount: 10, p_reason: "ok" }), /Explique l’ajustement/);
  await rejects(rpc(ids.admin, "admin_adjust_cb", { p_user: ids.frank, p_amount: -10, p_reason: "Retrait supérieur au solde" }), /ne peut pas devenir négatif/);
  await rejects(rpc(ids.admin, "admin_adjust_cb", { p_user: contentId("user", "inconnu"), p_amount: 10, p_reason: "Utilisateur qui n’existe pas" }), /Profil introuvable/);
  const before = await balance(ids.frank);
  const result = await rpc(ids.root, "admin_adjust_cb", { p_user: ids.frank, p_amount: 40, p_reason: "Geste commercial après une panne" });
  assert.equal(result.balance, before + 40);
  const [row] = await sql("select reason, source, created_by, label from public.cb_transactions where user_id = $1 order by id desc limit 1", [ids.frank]);
  assert.deepEqual(row, { reason: "admin_adjustment", source: "admin", created_by: ids.root, label: "Geste commercial après une panne" });
  assert.equal((await sql("select count(*)::int as n from public.admin_logs where action = 'adjust_cb' and target_id = $1", [ids.frank]))[0].n, 1);
  assert.equal((await sql("select count(*)::int as n from public.notifications where user_id = $1 and title = '+40 CB'", [ids.frank]))[0].n, 1);
  await rpc(ids.root, "admin_adjust_cb", { p_user: ids.frank, p_amount: -40, p_reason: "Correction de l’ajustement" });
  assert.equal(await balance(ids.frank), before);
});

test("the overview and the lists tell the truth about the economy", async () => {
  const overview = await rpc(ids.admin, "admin_cb_overview");
  const [sums] = await sql(`select coalesce(sum(balance), 0)::int as circulation, count(*)::int as wallets from public.cb_wallets`);
  assert.equal(overview.circulation.in_circulation, sums.circulation);
  assert.equal(overview.circulation.wallets, sums.wallets);
  const [flows] = await sql(`select coalesce(sum(amount) filter (where amount > 0 and reason <> 'admin_adjustment'), 0)::int as earned,
    coalesce(-sum(amount) filter (where amount < 0 and reason <> 'admin_adjustment'), 0)::int as spent from public.cb_transactions`);
  assert.equal(overview.circulation.earned_total, flows.earned);
  assert.equal(overview.circulation.spent_total, flows.spent);
  assert.equal(overview.circulation.earned_total - overview.circulation.spent_total + overview.circulation.adjusted_total, overview.circulation.in_circulation);
  assert.equal(overview.daily.length, 14);
  assert.ok(overview.unlocks.courses >= 2 && overview.unlocks.labs >= 1);
  assert.ok(overview.top_unlocks.length >= 1 && overview.by_reason.length >= 5 && overview.rules.length === 18);
  assert.ok(overview.top_earners_24h.every((entry) => typeof entry.display_name === "string"));
  assert.equal(typeof overview.avg_hours_to_first_spend, "number");
  assert.equal(overview.settings.gating_enabled, true);

  const wallets = await rpc(ids.admin, "admin_cb_wallets", { p_search: "ben" });
  assert.equal(wallets.total, 1);
  assert.deepEqual({ name: wallets.wallets[0].display_name, balance: wallets.wallets[0].balance }, { name: "ben", balance: 380 });
  const unlocks = await rpc(ids.admin, "admin_cb_transactions", { p_reason: "course_unlock" });
  assert.ok(unlocks.total >= 2 && unlocks.transactions.every((entry) => entry.reason === "course_unlock" && entry.amount < 0));
  const perUser = await rpc(ids.admin, "admin_cb_transactions", { p_user: ids.ben, p_limit: 1 });
  assert.equal(perUser.total, 2);
  assert.equal(perUser.transactions.length, 1);
});

test("rewards can be paused and are caught up on resume, and the shop can be closed", async () => {
  await rpc(ids.admin, "admin_set_cb_settings", { p_rewards: false, p_purchases: null, p_gating: null, p_paused_reason: "Vérification du barème", p_reason: "Pause pour le contrôle du barème" });
  assert.equal((await rpc(ids.ana, "get_my_wallet")).settings.paused_reason, "Vérification du barème");
  const paused = await studyLesson(ids.erin, "eclair-1");
  assert.equal(paused.cyberbits.gained, 0);
  assert.equal((await byReason(ids.erin)).lesson_completed, undefined, "nothing was paid during the pause");
  assert.equal((await byReason(ids.erin)).lab_completed.total, 15);

  await rpc(ids.admin, "admin_set_cb_settings", { p_rewards: true, p_purchases: null, p_gating: null, p_paused_reason: null, p_reason: "Fin de la pause du barème" });
  const resumed = await studyLesson(ids.erin, "eclair-2");
  assert.equal(resumed.cyberbits.items.filter((item) => item.reason === "lesson_completed").length, 2, "the lesson done during the pause is rewarded on resume");

  await grant(ids.erin, 300);
  await rpc(ids.admin, "admin_set_cb_settings", { p_rewards: null, p_purchases: false, p_gating: null, p_paused_reason: "Boutique en maintenance", p_reason: "Fermeture pour maintenance" });
  await rejects(rpc(ids.erin, "unlock_course", { p_course_id: await courseId("securite-web") }), /boutique est fermée/);
  await rejects(rpc(ids.erin, "unlock_lab", { p_lab_id: (await taskLab()).id }), /boutique est fermée/);
  await rpc(ids.admin, "admin_set_cb_settings", { p_rewards: null, p_purchases: true, p_gating: null, p_paused_reason: null, p_reason: "Réouverture de la boutique" });
  assert.equal((await rpc(ids.erin, "unlock_course", { p_course_id: await courseId("securite-web") })).price_paid, 120);
  await rejects(rpc(ids.admin, "admin_set_cb_settings", { p_rewards: null, p_purchases: null, p_gating: null, p_paused_reason: null, p_reason: "ok" }), /Explique le changement/);
});

test("the free mode opens every course and lab without spending anything", async () => {
  const analyse = await courseId("analyse-logs");
  const lesson0 = await firstLessonOf("analyse-logs");
  await rejects(rpc(ids.gina, "start_lesson", { p_lesson_id: lesson0 }), /Débloque ce parcours/);
  await rpc(ids.admin, "admin_set_cb_settings", { p_rewards: null, p_purchases: null, p_gating: false, p_paused_reason: "Semaine portes ouvertes", p_reason: "Semaine portes ouvertes" });
  const catalog = await rpc(ids.gina, "get_cb_catalog");
  assert.ok(catalog.courses.every((entry) => entry.unlocked) && catalog.labs.every((entry) => entry.unlocked));
  assert.equal((await rpc(ids.gina, "start_lesson", { p_lesson_id: lesson0 })).status, "in_progress");
  assert.equal((await rpc(ids.gina, "unlock_course", { p_course_id: analyse })).already_unlocked, true);
  await rpc(ids.admin, "admin_set_cb_settings", { p_rewards: null, p_purchases: null, p_gating: true, p_paused_reason: null, p_reason: "Fin de la semaine portes ouvertes" });
  assert.equal((await rpc(ids.gina, "get_cb_catalog")).courses.find((entry) => entry.id === analyse).unlocked, true, "already enrolled, so still open");
  assert.equal((await rpc(ids.root, "get_cb_catalog")).courses.find((entry) => entry.id === analyse).unlocked, true);
  assert.equal((await rpc(ids.dan, "get_cb_catalog")).courses.find((entry) => entry.id === analyse).unlocked, false);
});
