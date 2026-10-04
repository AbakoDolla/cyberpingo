// The publication checklist applied to everything the seeds publish (scripts/content-quality.cjs).
// A course listed in ENFORCED_COURSES must have no issue at all. For the others, the lessons that still fall
// short are listed by title in KNOWN_DEBT: the list can only shrink, so the debt never grows unnoticed and
// the day a lesson is brought up to standard, this test asks for it to leave the list.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("../scripts/ts-loader.cjs");
const { createSupabaseDatabase } = require("../scripts/pglite-supabase.cjs");
const { contentId } = require("../scripts/generate-content-seed.cjs");
const { lessonIssues, labIssues, moduleIssues, textHygiene, allowedReferenceUrls, ENFORCED_COURSES, PLAN } = require("../scripts/content-quality.cjs");
const { readLessons, templateLessonIds } = require("../scripts/content-snapshot.cjs");

// Lessons published before the quality gate existed, per course. Remove a title as soon as its lesson passes.
const KNOWN_DEBT = {
  "pentest-intro": ["Autorisation et périmètre d’un audit", "Une méthode de test responsable", "Rédiger une recommandation utile"],
};

let db;
before(async () => { db = await createSupabaseDatabase({ seed: true }); });
after(async () => { await db?.close(); });
const rows = async (text, params = []) => (await db.query(text, params)).rows;

test("a secret masked on screen and pasted back as asterisks is caught, in prose and in code", () => {
  assert.equal(textHygiene(["Un jeton ****** n’est pas envoyé"], "x").length, 1);
  assert.deepEqual(textHygiene(["Un jeton Bearer n’est pas envoyé"], "x"), []);
  const blocks = [
    { type: "callout", content: "Objectifs : lire un en-tête Authorization et comprendre pourquoi un jeton ne part pas tout seul, comme un cookie." },
    { type: "code", content: "Authorization: ******" },
  ];
  assert.ok(lessonIssues({ key: "x", title: "x", blocks }).some((issue) => issue.includes("suite d’astérisques")));
});

test("the lessons of a finished course meet the whole checklist, and the debt of the others only shrinks", async () => {
  const { REFERENCES } = load("supabase/seed/content/path-kit");
  const allowedUrls = allowedReferenceUrls(REFERENCES);
  const template = templateLessonIds();
  const lessons = await readLessons(db);
  const failing = new Map();
  const status = new Map();
  for (const lesson of lessons) {
    const level = template.has(lesson.id) ? "template" : "base";
    // An upgraded starter lesson may keep its original quiz, which predates the checklist.
    const quizInherited = level === "template" && lesson.id === contentId("lesson", "l1");
    const issues = lessonIssues({ key: lesson.title, title: lesson.title, blocks: lesson.blocks, quiz: lesson.quiz }, { level, allowedUrls, quizInherited });
    const tally = status.get(lesson.course) ?? { total: 0, conforming: 0 };
    tally.total += 1;
    if (!issues.length) tally.conforming += 1;
    status.set(lesson.course, tally);
    if (issues.length) failing.set(lesson.course, [...(failing.get(lesson.course) ?? []), { title: lesson.title, issues }]);
  }
  for (const [course, tally] of status) console.log(`  qualité ${course} : ${tally.conforming}/${tally.total} leçons conformes`);

  for (const course of ENFORCED_COURSES) {
    const list = failing.get(course) ?? [];
    assert.deepEqual(list, [], `Le cours ${course} doit être sans écart :\n${list.map((entry) => `- ${entry.title}\n    ${entry.issues.join("\n    ")}`).join("\n")}`);
  }
  for (const [course, debt] of Object.entries(KNOWN_DEBT)) {
    const actual = (failing.get(course) ?? []).map((entry) => entry.title).sort();
    assert.deepEqual(actual, [...debt].sort(), `La dette de qualité de ${course} a changé : ${course === "" ? "" : "mets KNOWN_DEBT à jour"}.`);
  }
  const unknown = [...failing.keys()].filter((course) => !ENFORCED_COURSES.includes(course) && !(course in KNOWN_DEBT));
  assert.deepEqual(unknown, [], "un cours avec des écarts doit figurer dans KNOWN_DEBT");
});

test("the labs with checked tasks meet the checklist: briefing, constraints, hints, corrections and files", async () => {
  const labs = await rows(`select l.id, l.slug, l.title, l.description, l.briefing, l.constraints, l.objectives, l.hints, l.tools, l.format,
      l.requires_computer, l.is_assessment, l.estimated_minutes, c.slug as course
    from public.labs l left join public.courses c on c.id = l.course_id
    where exists (select 1 from public.lab_tasks t where t.lab_id = l.id) order by l.position`);
  assert.ok(labs.length >= 13, "the checked labs of the academy");
  const report = [];
  for (const lab of labs) {
    const tasks = await rows(`select t.prompt, t.hint, t.answer_format, k.accepted, k.explanation
      from public.lab_tasks t join private.lab_task_keys k on k.task_id = t.id where t.lab_id = $1 order by t.position`, [lab.id]);
    const assets = await rows("select kind from public.lab_assets where lab_id = $1", [lab.id]);
    const issues = labIssues({
      slug: lab.slug, title: lab.title, description: lab.description, briefing: lab.briefing, constraints: lab.constraints, objectives: lab.objectives,
      hints: lab.hints, tools: lab.tools, format: lab.format, requiresComputer: lab.requires_computer, isAssessment: lab.is_assessment, minutes: lab.estimated_minutes,
      tasks: tasks.map((task) => ({ prompt: task.prompt, hint: task.hint, answerFormat: task.answer_format, accepted: task.accepted, explanation: task.explanation })),
      assets: assets.map((asset) => ({ kind: asset.kind })),
    });
    if (issues.length) report.push(`${lab.slug}\n    ${issues.join("\n    ")}`);
  }
  assert.deepEqual(report, [], report.join("\n"));
});

test("every module of a finished course states its success criteria, and no module is empty", async () => {
  for (const course of ENFORCED_COURSES) {
    const modules = await rows(`select m.title, m.description, m.position, (select count(*)::int from public.lessons l where l.module_id = m.id) as lessons
      from public.course_modules m join public.courses c on c.id = m.course_id where c.slug = $1 order by m.position`, [course]);
    assert.ok(modules.length >= PLAN[course].modules, `${course} : un parcours complet compte au moins ${PLAN[course].modules} modules`);
    assert.deepEqual(modules.map((module) => module.position), modules.map((_, index) => index + 1), `${course} : les modules se suivent sans trou`);
    const report = modules.flatMap((module) => moduleIssues({ title: module.title, description: module.description, lessons: Array(module.lessons).fill(0) }));
    assert.deepEqual(report, [], report.join("\n"));
  }
});

test("every skill of a finished course links a lesson, its quiz, a practice lab and a practical assessment", async () => {
  const skills = await rows(`select s.slug, d.slug as domain,
      (select count(*)::int from public.skill_links k where k.skill_id = s.id and k.kind = 'lesson' and k.lesson_id is not null) as lessons,
      (select count(*)::int from public.skill_links k where k.skill_id = s.id and k.kind = 'quiz' and k.quiz_id is not null) as quizzes,
      (select count(*)::int from public.skill_links k where k.skill_id = s.id and k.kind = 'practice' and k.lab_id is not null) as practice,
      (select count(*)::int from public.skill_links k join public.labs l on l.id = k.lab_id where k.skill_id = s.id and k.kind = 'validation' and l.is_assessment) as validation
    from public.skills s join public.domains d on d.id = s.domain_id order by s.position`);
  assert.ok(skills.length >= 37);
  for (const skill of skills) assert.deepEqual([skill.lessons, skill.quizzes, skill.practice, skill.validation], [1, 1, 1, 1], `${skill.slug} : une compétence se prouve par la leçon, le quiz, la pratique et l’évaluation`);
});
