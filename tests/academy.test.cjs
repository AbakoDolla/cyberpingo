// Database tests for the academy engine: task labs, skills, ranks, badges rarity, mascot lines and the Réseaux seed.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { contentId } = require("../scripts/generate-content-seed.cjs");
const { build: buildReseauxSeed, OUTPUT: RESEAUX_SEED } = require("../scripts/generate-reseaux-seed.cjs");
const { build: buildSocSeed, OUTPUT: SOC_SEED } = require("../scripts/generate-soc-seed.cjs");
const { build: buildProgrammeSeed, OUTPUT: PROGRAMME_SEED } = require("../scripts/generate-reseaux-programme-seed.cjs");
const { build: buildFondamentauxSeed, OUTPUT: FONDAMENTAUX_SEED } = require("../scripts/generate-fondamentaux-seed.cjs");
const { build: buildLinuxSeed, OUTPUT: LINUX_SEED } = require("../scripts/generate-linux-seed.cjs");
const { buildLabAssets, OUTPUT_DIR: LAB_DIR } = require("../scripts/generate-lab-assets.cjs");
const { createSupabaseDatabase } = require("../scripts/pglite-supabase.cjs");

let db;
const ids = {};
const course = (key) => contentId("course", key);
const lesson = (key) => contentId("lesson", key);
const quiz = (key) => contentId("quiz", key);
const lab = (key) => contentId("lab", key);
const skill = (key) => contentId("skill", key);
const SOC_SKILLS = ["lecture-journaux-linux", "audit-droits-linux", "detection-bruteforce-ssh", "analyse-logs-web", "reconstitution-incident"];
const PROGRAMME_SKILLS = ["modeles-reseau", "plan-vlsm", "adressage-ipv6", "services-dhcp", "nat-pat", "commutation-vlan", "routage-statique", "filtrage-acl", "diagnostic-reseau", "documentation-reseau"];
const FONDAMENTAUX_SKILLS = ["principes-securite", "ingenierie-sociale", "authentification-forte", "hygiene-numerique", "bases-cryptographie", "analyse-risques", "protection-donnees", "reponse-incident"];
const LINUX_SKILLS = ["ligne-de-commande", "droits-et-comptes", "processus-services", "logiciels-correctifs", "reseau-ssh-pare-feu", "sauvegarde-chiffrement-linux", "scripts-shell", "durcissement-linux"];
const LOGS_SKILLS = ["formats-horodatage", "outils-analyse-logs", "journaux-windows", "journaux-reseau", "correlation-sources", "regles-detection", "triage-alertes", "rapport-investigation"];
const SWB_SKILLS = ["lire-http-securite", "reperer-injections", "prevenir-xss-csp", "securiser-sessions-jetons", "controler-acces-api", "durcir-configuration", "noter-prioriser-vulnerabilites", "auditer-application-web"];
const PT_SKILLS = ["lire-cadrage-perimetre", "reconnaissance-passive", "lire-scan-reseau", "trier-vulnerabilites", "analyser-test-web", "relire-mission-nettoyage", "noter-prioriser-risques", "rediger-rapport-pentest"];

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
async function studyLessonId(uid, id) {
  await rpc(uid, "start_lesson", { p_lesson_id: id });
  await sql("update public.lesson_progress set started_at = now() - interval '60 seconds' where user_id = $1 and lesson_id = $2", [uid, id]);
  return rpc(uid, "complete_lesson", { p_lesson_id: id });
}
const studyLesson = (uid, key) => studyLessonId(uid, lesson(key));
async function answerKey(quizId) {
  const rows = await sql(`
    select q.id as question, (array_agg(a.id order by a.position) filter (where a.is_correct))[1] as answer
    from public.quiz_questions q join public.quiz_answers a on a.question_id = q.id
    where q.quiz_id = $1 group by q.id, q.position order by q.position`, [quizId]);
  return Object.fromEntries(rows.map((row) => [row.question, [row.answer]]));
}
const passQuiz = async (uid, key) => rpc(uid, "submit_quiz", { p_quiz_id: quiz(key), p_answers: await answerKey(quiz(key)) });
const labTasks = (slug) => sql(`
  select t.id, t.position, k.accepted from public.lab_tasks t join private.lab_task_keys k on k.task_id = t.id
  where t.lab_id = $1 order by t.position`, [lab(slug)]);
async function solveLab(uid, slug) {
  let result;
  for (const task of await labTasks(slug)) result = await rpc(uid, "submit_lab_task", { p_task_id: task.id, p_answer: task.accepted[0] });
  return result;
}
const skillStates = async (uid) => Object.fromEntries((await rpc(uid, "get_my_academy")).skills.map((entry) => [entry.slug, entry.state]));
const ledgerTotal = async (uid) => Number((await sql("select coalesce(sum(amount), 0) as total from public.xp_transactions where user_id = $1 and reason <> 'challenge_completed'", [uid]))[0].total);

before(async () => {
  db = await createSupabaseDatabase({ seed: true });
  for (const [name, email] of [["ana", "ana@example.test"], ["ben", "ben@example.test"], ["cleo", "cleo@example.test"], ["dan", "dan@example.test"], ["admin", "admin@example.test"]]) {
    ids[name] = await createUser(email, { display_name: name });
  }
  await sql("update public.profiles set role = 'admin' where id = $1", [ids.admin]);
});

after(async () => { await db?.close(); });

test("the Réseaux seed and the lab files match their generators", () => {
  assert.equal(fs.readFileSync(RESEAUX_SEED, "utf8"), buildReseauxSeed(), "Run node scripts/generate-reseaux-seed.cjs");
  assert.equal(fs.readFileSync(SOC_SEED, "utf8"), buildSocSeed(), "Run node scripts/generate-soc-seed.cjs");
  assert.equal(fs.readFileSync(PROGRAMME_SEED, "utf8"), buildProgrammeSeed(), "Run node scripts/generate-reseaux-programme-seed.cjs");
  assert.equal(fs.readFileSync(FONDAMENTAUX_SEED, "utf8"), buildFondamentauxSeed(), "Run node scripts/generate-fondamentaux-seed.cjs");
  assert.equal(fs.readFileSync(LINUX_SEED, "utf8"), buildLinuxSeed(), "Run node scripts/generate-linux-seed.cjs");
  for (const file of buildLabAssets().files) {
    assert.deepEqual(fs.readFileSync(path.join(LAB_DIR, file.name)), file.data, `${file.name} is stale: run node scripts/generate-lab-assets.cjs`);
  }
});

test("the Réseaux path seeds a complete, published, end-to-end learning path", async () => {
  const labs = await sql("select slug, format, status, is_assessment, requires_computer from public.labs where course_id = $1 order by position", [course("c2")]);
  assert.deepEqual(labs.map((row) => row.slug), ["reseau-instable", "incident-pare-feu", "packet-tracer-sous-reseaux", "evaluation-reseaux", "tp-reseau-domestique", "tp-vlan-pme", "tp-multi-sites", "incident-reseau-kora", "projet-reseau-kora"]);
  assert.ok(labs.every((row) => row.status === "published"));
  assert.deepEqual(labs.map((row) => row.format), ["pcap", "logs", "packet_tracer", "pcap", "packet_tracer", "packet_tracer", "packet_tracer", "logs", "packet_tracer"]);
  assert.deepEqual(labs.filter((row) => row.is_assessment).map((row) => row.slug), ["evaluation-reseaux", "incident-reseau-kora", "projet-reseau-kora"]);
  assert.equal(labs.find((row) => row.format === "packet_tracer").requires_computer, true);

  const [counts] = await sql(`select
    (select count(*) from public.lab_tasks where lab_id = any($1)) as tasks,
    (select count(*) from private.lab_task_keys k join public.lab_tasks t on t.id = k.task_id where t.lab_id = any($1)) as keys,
    (select count(*) from public.skills) as skills,
    (select count(*) from public.skill_links) as links,
    (select count(*) from public.courses where domain_id is null) as orphan_courses,
    (select count(*) from public.domains) as domains`, [labs.length ? (await sql("select array_agg(id) as ids from public.labs where course_id = $1", [course("c2")]))[0].ids : []]);
  assert.deepEqual(Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, Number(value)])), {
    tasks: 91, keys: 91, skills: 61, links: 244, orphan_courses: 0, domains: 6,
  });

  const assets = await sql("select kind, url from public.lab_assets");
  assert.equal(assets.length, 248);
  assert.ok(assets.every((row) => row.url.startsWith("/labs/") && fs.existsSync(path.join(LAB_DIR, path.basename(row.url)))), "every asset points to a real file");

  const events = await sql("select distinct event from public.mascot_lines where is_active");
  assert.equal(events.length, 13);
  const voiced = await sql("select audio_url, voice_credit, is_active from public.mascot_lines");
  assert.equal(voiced.length, 30);
  assert.ok(voiced.every((row) => /^\/audio\/mascot\/[0-9a-f-]{36}\.mp3$/.test(row.audio_url)), "every line is voiced by the generated library");
  assert.ok(voiced.every((row) => /synthèse/.test(row.voice_credit)), "a synthetic voice is never presented as a human recording");
  const rarities = await sql("select slug, rarity from public.badges where slug in ('serie-30', 'premier-pas', 'expert-reseau') order by slug");
  assert.deepEqual(rarities, [{ slug: "expert-reseau", rarity: "epic" }, { slug: "premier-pas", rarity: "common" }, { slug: "serie-30", rarity: "epic" }]);
});

test("answer keys never reach the browser", async () => {
  await rejects(as(ids.ana, "select * from private.lab_task_keys"), /permission denied/);
  await rejects(as(null, "select * from private.lab_task_keys"), /permission denied/);
  const tasks = await as(null, "select * from public.lab_tasks limit 1");
  assert.deepEqual(Object.keys(tasks[0]).sort(), ["answer_format", "created_at", "hint", "id", "lab_id", "position", "prompt", "updated_at"]);
  await rejects(as(ids.ana, "select public.admin_get_lab_tasks($1)", [lab("reseau-instable")]), /réservé|administrat|droits|accès/i);
  const [{ n }] = await as(ids.admin, "select jsonb_array_length(public.admin_get_lab_tasks($1)) as n", [lab("reseau-instable")]);
  assert.equal(n, 6);
});

test("progress, skills and ranks cannot be forged from the browser", async () => {
  const [task] = await labTasks("reseau-instable");
  await rejects(as(ids.ben, "insert into public.lab_task_completions (user_id, task_id, lab_id) values ($1, $2, $3)", [ids.ben, task.id, lab("reseau-instable")]), /permission denied/);
  await rejects(as(ids.ben, "insert into public.lab_completions (user_id, lab_id, xp_awarded) values ($1, $2, 500)", [ids.ben, lab("reseau-instable")]), /permission denied/);
  await rejects(as(ids.ben, "insert into public.user_skills (user_id, skill_id, state) values ($1, $2, 'validated')", [ids.ben, skill("detection-scan")]), /permission denied/);
  await rejects(as(ids.ben, "insert into public.user_ranks (user_id, rank_id) select $1, id from public.ranks", [ids.ben]), /permission denied/);
  await rejects(as(ids.ben, "update public.lab_tasks set prompt = 'x'"), /permission denied/);
  assert.deepEqual(await as(ids.ben, "update public.ranks set criteria = '{}' returning id"), [], "learners cannot edit ranks");
  assert.equal(await ledgerTotal(ids.ben), 0);
});

test("a lab task is checked on the server, with a budget of wrong answers", async () => {
  const [first, second] = await labTasks("reseau-instable");
  await rejects(rpc(null, "submit_lab_task", { p_task_id: first.id, p_answer: "x" }).catch((error) => { throw error; }), /permission denied|connect|Connecte/i);
  await rejects(rpc(ids.cleo, "submit_lab_task", { p_task_id: first.id, p_answer: "   " }), /Saisis une réponse/);
  await rejects(rpc(ids.cleo, "submit_lab_task", { p_task_id: first.id, p_answer: "a".repeat(301) }), /300 caractères/);
  await rejects(rpc(ids.cleo, "submit_lab_task", { p_task_id: "00000000-0000-0000-0000-000000000000", p_answer: "x" }), /pas disponible/);

  const wrong = await rpc(ids.cleo, "submit_lab_task", { p_task_id: first.id, p_answer: "pas la bonne réponse" });
  assert.deepEqual(wrong, { correct: false, remaining_attempts: 9 });

  const spoiled = `  ${first.accepted[0].toUpperCase()}   `;
  const right = await rpc(ids.cleo, "submit_lab_task", { p_task_id: first.id, p_answer: spoiled });
  assert.equal(right.correct, true);
  assert.equal(right.already_solved, false);
  assert.equal(right.tasks_done, 1);
  assert.equal(right.tasks_total, 6);
  assert.equal(right.lab_completed, false);
  assert.equal(right.xp_awarded, 0);
  assert.ok(right.explanation.length > 10);
  assert.equal((await rpc(ids.cleo, "submit_lab_task", { p_task_id: first.id, p_answer: first.accepted[0] })).already_solved, true);

  for (let attempt = 0; attempt < 10; attempt += 1) await rpc(ids.cleo, "submit_lab_task", { p_task_id: second.id, p_answer: `essai ${attempt}` });
  await rejects(rpc(ids.cleo, "submit_lab_task", { p_task_id: second.id, p_answer: second.accepted[0] }), /Trop de tentatives/);
  assert.equal((await rpc(ids.cleo, "submit_lab_task", { p_task_id: first.id, p_answer: first.accepted[0] })).correct, true, "the budget is per task");
});

test("finishing every task completes the lab once: XP, badge, notification, ledger", async () => {
  const before = await ledgerTotal(ids.dan);
  const result = await solveLab(ids.dan, "reseau-instable");
  assert.equal(result.lab_completed, true);
  assert.equal(result.lab_newly_completed, true);
  assert.equal(result.tasks_done, 6);
  const [{ xp_reward }] = await sql("select xp_reward from public.labs where id = $1", [lab("reseau-instable")]);
  assert.equal(result.xp_awarded, xp_reward);
  assert.deepEqual(result.new_badges.map((badge) => badge.slug).sort(), ["premier-flag", "specialiste-paquets"]);
  assert.equal(result.new_badges.find((badge) => badge.slug === "specialiste-paquets").rarity, "rare");

  const [{ done }] = await sql("select count(*) as done from public.lab_completions where user_id = $1 and lab_id = $2", [ids.dan, lab("reseau-instable")]);
  assert.equal(Number(done), 1);
  const badgeXp = Number((await sql("select coalesce(sum(xp_reward), 0) as xp from public.badges where slug in ('specialiste-paquets', 'premier-flag')"))[0].xp);
  const ledgerDump = async () => JSON.stringify(await sql("select reason, amount from public.xp_transactions where user_id = $1 order by created_at", [ids.dan]));
  assert.equal(await ledgerTotal(ids.dan) - before, xp_reward + badgeXp, await ledgerDump());

  const replay = await rpc(ids.dan, "submit_lab_task", { p_task_id: (await labTasks("reseau-instable"))[0].id, p_answer: (await labTasks("reseau-instable"))[0].accepted[0] });
  assert.equal(replay.lab_newly_completed, false);
  assert.equal(replay.xp_awarded, 0);
  assert.equal(await ledgerTotal(ids.dan) - before, xp_reward + badgeXp);
  assert.equal(Number((await sql("select count(*) as n from public.xp_transactions where user_id = $1 and reason = 'lab_completed'", [ids.dan]))[0].n), 1);
  assert.ok((await as(ids.dan, "select id from public.notifications where title like 'Nouveau badge%'")).length >= 1);
});

test("an admin previews an unpublished lab without earning anything, learners cannot reach it", async () => {
  await sql("update public.labs set status = 'review' where id = $1", [lab("incident-pare-feu")]);
  const [task] = await labTasks("incident-pare-feu");
  const preview = await rpc(ids.admin, "submit_lab_task", { p_task_id: task.id, p_answer: task.accepted[0] });
  assert.deepEqual({ correct: preview.correct, preview: preview.preview, xp: preview.xp_awarded }, { correct: true, preview: true, xp: 0 });
  assert.equal(Number((await sql("select count(*) as n from public.lab_task_completions where user_id = $1", [ids.admin]))[0].n), 0);
  await rejects(rpc(ids.ben, "submit_lab_task", { p_task_id: task.id, p_answer: task.accepted[0] }), /pas disponible/);
  assert.equal((await as(ids.ben, "select id from public.lab_tasks where lab_id = $1", [lab("incident-pare-feu")])).length, 0);
  await sql("update public.labs set status = 'published' where id = $1", [lab("incident-pare-feu")]);
  assert.equal((await as(ids.ben, "select id from public.lab_tasks where lab_id = $1", [lab("incident-pare-feu")])).length, 5);
});

test("skills advance from learning to validated, never on a quiz alone", async () => {
  const states = await skillStates(ids.ana);
  assert.equal(Object.keys(states).length, 61);
  assert.ok(Object.values(states).every((state) => state === "not_studied"));

  await rpc(ids.ana, "start_lesson", { p_lesson_id: lesson("reseaux-ipv4") });
  assert.equal((await skillStates(ids.ana))["adressage-ipv4"], "learning");

  await studyLesson(ids.ana, "reseaux-ipv4");
  assert.equal((await skillStates(ids.ana))["adressage-ipv4"], "consolidating");

  const quizResult = await passQuiz(ids.ana, "reseaux-ipv4");
  assert.equal(quizResult.passed, true);
  assert.equal((await skillStates(ids.ana))["adressage-ipv4"], "consolidating", "a quiz alone never masters a skill");

  const practice = await solveLab(ids.ana, "packet-tracer-sous-reseaux");
  assert.deepEqual(practice.new_skills.map((entry) => [entry.slug, entry.state]).sort(), [["adressage-ipv4", "exercises_mastered"], ["plan-vlsm", "learning"], ["sous-reseaux-cidr", "learning"]]);
  assert.equal((await skillStates(ids.ana))["adressage-ipv4"], "exercises_mastered");
  assert.equal((await skillStates(ids.ana))["sous-reseaux-cidr"], "learning", "the lab was practiced but the lesson was not");

  await studyLesson(ids.ana, "reseaux-cidr");
  await passQuiz(ids.ana, "reseaux-cidr");
  const validation = await solveLab(ids.ana, "evaluation-reseaux");
  const states2 = await skillStates(ids.ana);
  const reseauxSkills = Object.keys(states2).filter((slug) => !SOC_SKILLS.includes(slug) && !PROGRAMME_SKILLS.includes(slug) && !FONDAMENTAUX_SKILLS.includes(slug) && !LINUX_SKILLS.includes(slug) && !LOGS_SKILLS.includes(slug) && !SWB_SKILLS.includes(slug) && !PT_SKILLS.includes(slug));
  assert.equal(reseauxSkills.length, 6);
  assert.ok(reseauxSkills.every((slug) => states2[slug] === "validated"), JSON.stringify(states2));
  assert.ok(SOC_SKILLS.every((slug) => states2[slug] === "not_studied"), "the Réseaux path never validates a SOC skill");
  assert.ok(FONDAMENTAUX_SKILLS.every((slug) => states2[slug] === "not_studied"), "the Réseaux path never validates a Fondamentaux skill");
  assert.ok(LINUX_SKILLS.every((slug) => states2[slug] === "not_studied"), "the Réseaux path never validates a Linux skill");
  assert.ok(LOGS_SKILLS.every((slug) => states2[slug] === "not_studied"), "the Réseaux path never validates a log-analysis skill");
  assert.ok(SWB_SKILLS.every((slug) => states2[slug] === "not_studied"), "the Réseaux path never validates a web-security skill");
  assert.ok(PT_SKILLS.every((slug) => states2[slug] === "not_studied"), "the Réseaux path never validates a pentest skill");
  assert.ok(PROGRAMME_SKILLS.every((slug) => states2[slug] !== "validated"), "the first Réseaux assessment never validates a skill of the programme");
  assert.equal(states2["plan-vlsm"], "learning", "its practice lab was solved, its lesson was not");
  assert.equal(validation.new_skills.length, 6);
  assert.ok(validation.new_badges.some((badge) => badge.slug === "architecte-adressage"));
  assert.ok(validation.new_badges.some((badge) => badge.slug === "gardien-reseau"));
  assert.ok((await as(ids.ana, "select id from public.notifications where title = 'Compétence validée'")).length >= 1);
});

test("ranks follow measurable criteria and the next rank shows what is missing", async () => {
  const early = await rpc(ids.ana, "get_my_academy");
  assert.equal(early.metrics.skills_validated, 6);
  assert.equal(early.metrics.lessons_completed, 2);
  assert.equal(early.rank.slug, "novice-numerique", "validated skills alone do not skip the ladder");
  assert.deepEqual(early.next_rank.requirements, [{ key: "lessons_completed", required: 3, current: 2 }]);

  const pending = await sql(`select l.id from public.lessons l
    where not exists (select 1 from public.lesson_progress p where p.user_id = $1 and p.lesson_id = l.id and p.status = 'completed')
    order by l.id limit 6`, [ids.ana]);
  for (const row of pending) await studyLessonId(ids.ana, row.id);

  const academy = await rpc(ids.ana, "get_my_academy");
  assert.equal(academy.ranks.length, 9);
  assert.equal(academy.metrics.lessons_completed, 8);
  assert.equal(academy.rank.slug, "apprenti-analyste");
  assert.equal(academy.next_rank.slug, "technicien-reseau");
  const requirement = Object.fromEntries(academy.next_rank.requirements.map((entry) => [entry.key, entry]));
  assert.equal(requirement.courses_completed.required, 1);
  assert.equal(requirement.labs_solved.current, 2);
  assert.equal(academy.domains.length, 6);
  assert.ok(academy.skills.every((entry) => entry.links.length === 4 && entry.links.every((link) => typeof link.done === "boolean" && link.title)));

  const fresh = await rpc(ids.ben, "get_my_academy");
  assert.equal(fresh.rank.slug, "novice-numerique");
  assert.equal(fresh.next_rank.slug, "explorateur-cyber");
  await rejects(rpc(null, "get_my_academy"), /permission denied|Connecte/i);

  await rejects(sql("insert into public.ranks (slug, name, description, position, criteria) values ('x', 'X', 'x', 99, '{\"magic\": 1}')"), /critère|criteria|inconnu/i);
  await rejects(sql("insert into public.ranks (slug, name, description, position, criteria) values ('y', 'Y', 'y', 98, '{\"min_level\": -1}')"), /critère|criteria|positi|invalide/i);
});

test("a rank is awarded when its criteria are met and announced once", async () => {
  const eve = await createUser("eve@example.test", { display_name: "Eve" });
  let last;
  for (const key of ["reseaux-ipv4", "reseaux-cidr", "reseaux-tcp"]) last = await studyLesson(eve, key);
  assert.equal(last.new_rank?.slug, "explorateur-cyber");
  assert.equal((await rpc(eve, "get_my_academy")).rank.slug, "explorateur-cyber");
  const next = await studyLesson(eve, "reseaux-dns-arp");
  assert.equal(next.new_rank ?? null, null);
  assert.equal((await as(eve, "select id from public.notifications where title = 'Nouveau grade : Explorateur cyber'")).length, 1);
});

test("lab reports: validated input, rate limited, reviewed by staff only", async () => {
  const labId = lab("packet-tracer-sous-reseaux");
  await rejects(rpc(ids.ben, "submit_lab_report", { p_lab_id: labId, p_note: "  " }), /Décris ton travail/);
  await rejects(rpc(ids.ben, "submit_lab_report", { p_lab_id: labId, p_note: "ok", p_link: "http://exemple.test/a" }), /https/);
  await sql("update public.labs set status = 'draft' where id = $1", [lab("incident-pare-feu")]);
  await rejects(rpc(ids.ben, "submit_lab_report", { p_lab_id: lab("incident-pare-feu"), p_note: "ok" }), /pas disponible/);
  await sql("update public.labs set status = 'published' where id = $1", [lab("incident-pare-feu")]);

  await rpc(ids.ben, "submit_lab_report", { p_lab_id: labId, p_note: "Plan d’adressage terminé.", p_link: "https://exemple.test/capture.png" });
  const [submission] = await as(ids.ben, "select id, status, note from public.lab_submissions");
  assert.equal(submission.status, "pending");
  assert.equal((await as(ids.cleo, "select id from public.lab_submissions")).length, 0, "reports are private");
  assert.equal((await as(ids.admin, "select id from public.lab_submissions")).length, 1);

  await rejects(rpc(ids.ben, "admin_review_submission", { p_id: submission.id, p_status: "approved" }), /réservé|administrat|droits|accès/i);
  await rpc(ids.admin, "admin_review_submission", { p_id: submission.id, p_status: "changes_requested", p_feedback: "Précise le masque." });
  assert.equal((await one(ids.ben, "select status, feedback from public.lab_submissions")).feedback, "Précise le masque.");
  await rpc(ids.ben, "submit_lab_report", { p_lab_id: labId, p_note: "Masque ajouté." });
  assert.equal((await one(ids.ben, "select status from public.lab_submissions")).status, "pending", "a new version goes back to review");
  await rpc(ids.admin, "admin_review_submission", { p_id: submission.id, p_status: "approved" });
  await rejects(rpc(ids.ben, "submit_lab_report", { p_lab_id: labId, p_note: "Encore." }), /déjà été validé/);
});

test("staff edit lab tasks without breaking learner progress, and cannot publish an empty lab", async () => {
  const readTasks = () => rpc(ids.admin, "admin_get_lab_tasks", { p_lab_id: lab("incident-pare-feu") });
  const tasks = await readTasks();
  assert.equal(tasks.length, 5);
  await rejects(rpc(ids.ben, "admin_set_lab_tasks", { p_lab_id: lab("incident-pare-feu"), p_tasks: tasks }), /réservé|administrat|droits|accès/i);

  const edited = tasks.map((task, index) => (index === 0 ? { ...task, hint: "Nouvel indice" } : task));
  await rpc(ids.admin, "admin_set_lab_tasks", { p_lab_id: lab("incident-pare-feu"), p_tasks: edited });
  const after = await readTasks();
  assert.deepEqual(after.map((task) => task.id), tasks.map((task) => task.id), "ids are kept");
  assert.equal(after[0].hint, "Nouvel indice");

  await rejects(rpc(ids.admin, "admin_set_lab_tasks", { p_lab_id: lab("incident-pare-feu"), p_tasks: [{ prompt: "Sans réponse", accepted: [] }] }), /entre 1 et 8 réponses/);
  await rejects(rpc(ids.admin, "admin_set_lab_tasks", { p_lab_id: lab("incident-pare-feu"), p_tasks: [{ prompt: "Sans clé" }] }), /réponses acceptées/);
  await rejects(rpc(ids.admin, "admin_set_lab_tasks", { p_lab_id: lab("incident-pare-feu"), p_tasks: [] }), /publié a besoin/);
  assert.equal((await readTasks()).length, 5, "a rejected edit changes nothing");

  const [draft] = await sql("insert into public.labs (slug, title, description, category, difficulty, xp_reward) values ('brouillon', 'Brouillon', 'd', 'reseau', 'debutant', 10) returning id");
  await rejects(sql("update public.labs set status = 'published' where id = $1", [draft.id]), /Définis la réponse attendue ou les tâches/);
  await rpc(ids.admin, "admin_set_lab_tasks", { p_lab_id: draft.id, p_tasks: [{ prompt: "Combien ?", accepted: ["42"], explanation: "Parce que." }] });
  await sql("update public.labs set status = 'published' where id = $1", [draft.id]);
  assert.ok(Number((await sql("select count(*) as n from public.admin_logs where action = 'set_lab_tasks'"))[0].n) >= 2);
});

test("the competence tables follow the publication rules", async () => {
  await rejects(sql("insert into public.skill_links (skill_id, kind, lab_id) values ($1, 'validation', $2)", [skill("tcp-handshake"), lab("reseau-instable")]), /évaluation|assessment/i);
  await rejects(sql("insert into public.mascot_lines (event, expression, text_fr, audio_url) values ('welcome', 'happy', 'Salut', '/audio/salut.mp3')"), /voice_credit|crédit|violates check/i);
  await sql("insert into public.mascot_lines (event, expression, text_fr, audio_url, voice_credit) values ('welcome', 'happy', 'Salut', '/audio/salut.mp3', 'Voix : Awa K.')");
  await sql("insert into public.mascot_lines (event, expression, text_fr, is_active) values ('welcome', 'happy', 'Brouillon', false)");
  assert.equal((await as(null, "select id from public.mascot_lines where text_fr = 'Brouillon'")).length, 0);
  assert.equal((await as(ids.admin, "select id from public.mascot_lines where text_fr = 'Brouillon'")).length, 1);
  await rejects(as(ids.ben, "insert into public.mascot_lines (event, expression, text_fr) values ('welcome', 'happy', 'Pirate')"), /row-level security|permission denied/);
  assert.equal((await as(null, "select id from public.ranks")).length, 9);
});

test("resetting progress also clears academy data, keeps the catalogue", async () => {
  await rpc(ids.dan, "reset_my_progress");
  for (const table of ["lab_task_completions", "lab_completions", "lab_submissions", "user_skills", "user_ranks", "user_badges"]) {
    assert.equal(Number((await sql(`select count(*) as n from public.${table} where user_id = $1`, [ids.dan]))[0].n), 0, table);
  }
  assert.equal((await rpc(ids.dan, "get_my_academy")).rank.slug, "novice-numerique");
  assert.ok(Number((await sql("select count(*) as n from public.lab_tasks"))[0].n) >= 28);
});
test("the SOC path seeds four published log labs whose answer keys come from the generated logs", async () => {
  const { facts } = buildLabAssets();
  const slugs = ["audit-linux-droits", "brute-force-ssh", "intrusion-web", "investigation-soc"];
  const labs = await sql("select slug, format, status, category, course_id, is_assessment from public.labs where slug = any($1) order by position", [slugs]);
  assert.deepEqual(labs.map((row) => row.slug), slugs);
  assert.ok(labs.every((row) => row.status === "published" && row.format === "logs"));
  assert.deepEqual(labs.map((row) => row.course_id), [course("c3"), course("c6"), course("c6"), course("c6")]);
  assert.deepEqual(labs.map((row) => row.category), ["linux", "securite", "securite", "securite"]);
  assert.deepEqual(labs.filter((row) => row.is_assessment).map((row) => row.slug), ["investigation-soc"]);

  const answers = async (slug) => (await labTasks(slug)).flatMap((task) => task.accepted.map((value) => value.toLowerCase()));
  const { audit, ssh, web, incident } = facts.soc;
  assert.equal((await labTasks("investigation-soc")).length, 11);
  for (const [slug, expected] of [
    ["audit-linux-droits", [audit.worldWritableScript, audit.extraRootAccount, String(audit.suidCount)]],
    ["brute-force-ssh", [ssh.attackerIp, String(ssh.attackerFailures), ssh.targetedUser, ssh.newUser]],
    ["intrusion-web", [web.attackerIp, web.firstTool, web.vulnerablePage, web.webshellPath]],
    ["investigation-soc", [incident.attackerIp, incident.compromisedWebAccount, incident.webshellPath, incident.pivotAccount, incident.persistenceFile, String(incident.exfilPort)]],
  ]) {
    const known = await answers(slug);
    for (const value of expected) assert.ok(known.includes(value.toLowerCase()), `${slug} accepts ${value}`);
  }

  const files = await sql("select a.url from public.lab_assets a join public.labs l on l.id = a.lab_id where l.slug = any($1)", [slugs]);
  assert.equal(files.length, 9);
  assert.ok(files.every((row) => fs.existsSync(path.join(LAB_DIR, path.basename(row.url)))), "every SOC asset points to a real file");

  const skills = await sql("select s.slug, d.slug as domain, (select count(*) from public.skill_links k where k.skill_id = s.id) as links from public.skills s join public.domains d on d.id = s.domain_id where s.slug = any($1) order by s.position", [SOC_SKILLS]);
  assert.deepEqual(skills.map((row) => [row.slug, row.domain, Number(row.links)]), [
    ["lecture-journaux-linux", "linux", 4], ["audit-droits-linux", "linux", 4], ["detection-bruteforce-ssh", "detection", 4], ["analyse-logs-web", "detection", 4], ["reconstitution-incident", "detection", 4],
  ]);
});

test("a learner completes the SOC path end to end: lessons, quizzes, labs, five skills and the SOC badges", async () => {
  const uid = await createUser("eve@example.test", { display_name: "eve" });
  const lessons = ["linux-journaux", "linux-audit-droits", "soc-ssh-bruteforce", "soc-web-logs", "soc-chronologie"];
  for (const key of lessons) { await studyLesson(uid, key); assert.equal((await passQuiz(uid, key)).passed, true, key); }
  for (const slug of ["audit-linux-droits", "brute-force-ssh", "intrusion-web"]) {
    const result = await solveLab(uid, slug);
    assert.equal(result.lab_completed, true, slug);
  }
  const states = await skillStates(uid);
  assert.ok(SOC_SKILLS.every((slug) => states[slug] === "exercises_mastered" || states[slug] === "consolidating" || states[slug] === "learning"), JSON.stringify(states));
  assert.ok(SOC_SKILLS.every((slug) => states[slug] !== "validated"), "no skill is validated before the assessment");

  const validation = await solveLab(uid, "investigation-soc");
  assert.equal(validation.lab_completed, true);
  // The log-analysis programme practises its last skill on this very assessment, so that skill moves too.
  assert.deepEqual(validation.new_skills.map((entry) => entry.slug).sort(), [...SOC_SKILLS, "rapport-investigation"].sort());
  const earned = (await sql("select b.slug from public.user_badges ub join public.badges b on b.id = ub.badge_id where ub.user_id = $1", [uid])).map((row) => row.slug);
  for (const slug of ["auditeur-linux", "chasseur-bruteforce", "analyste-web", "analyste-soc", "reconstitueur-incident"]) assert.ok(earned.includes(slug), slug);
  const final = await skillStates(uid);
  assert.ok(SOC_SKILLS.every((slug) => final[slug] === "validated"), JSON.stringify(final));
});