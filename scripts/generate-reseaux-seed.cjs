#!/usr/bin/env node
// Builds supabase/seed/02_reseaux_path.sql: the complete "Réseaux" learning path
// (modules, lessons, quizzes, labs with checked tasks, skills, badges, mascot lines).
// Authoring content lives in supabase/seed/content/reseaux-path.ts; the expected answers are derived
// from the real lab files produced by scripts/generate-lab-assets.cjs, so they can never drift.
// Run `node scripts/generate-reseaux-seed.cjs` after editing either of them.
const fs = require("node:fs");
const path = require("node:path");
const { load, root } = require("./ts-loader.cjs");
const { contentId } = require("./generate-content-seed.cjs");
const { buildLabAssets } = require("./generate-lab-assets.cjs");

const OUTPUT = path.join(root, "supabase", "seed", "02_reseaux_path.sql");

const QUIZ_XP = 30;
const QUIZ_PASS_PERCENTAGE = 70;
const LAB_POSITION_START = 100;
const COURSE_ID = "c2";

const literal = (value) => (value === null || value === undefined ? "null" : `'${String(value).replace(/'/g, "''")}'`);
const json = (value) => `${literal(JSON.stringify(value))}::jsonb`;
const textArray = (values) => (values.length ? `array[${values.map(literal).join(", ")}]::text[]` : "'{}'::text[]");
const rows = (items) => items.map((item) => `  (${item.join(", ")})`).join(",\n");
const normalise = (value) => String(value).toLowerCase().replace(/\s+/g, " ").trim();

function check(condition, message) {
  if (!condition) throw new Error(`reseaux-path : ${message}`);
}

function build() {
  const { buildReseauxPath } = load("supabase/seed/content/reseaux-path");
  const { courses } = load("supabase/seed/content/courses");
  const path_ = buildReseauxPath(buildLabAssets().facts);
  const { domains, modules, labs, skills, badges, existingBadgeRarity, mascot, courseUpdates } = path_;

  const course = courses.find((item) => item.slug === courseUpdates.slug);
  check(course && course.id === COURSE_ID, "le cours « reseaux » doit être c2");
  const courseId = contentId("course", COURSE_ID);

  // Domains and their courses.
  const domainRows = domains.map((domain, index) => [
    literal(contentId("domain", domain.slug)), literal(domain.slug), literal(domain.name), literal(domain.description), literal(domain.icon), (index + 1) * 10,
  ]);
  const domainLinks = domains.map((domain) => `update public.courses set domain_id = ${literal(contentId("domain", domain.slug))}
where domain_id is null and category in (${domain.categories.map(literal).join(", ")});`);

  // Modules, lessons, quizzes.
  const moduleRows = [];
  const lessonRows = [];
  const quizRows = [];
  const questionRows = [];
  const answerRows = [];
  const lessonIds = new Map();
  const quizIds = new Map();

  modules.forEach((module) => {
    const position = Number(module.key.split(":")[1]);
    const moduleId = contentId("module", module.key);
    moduleRows.push([literal(moduleId), literal(courseId), literal(module.title), literal(module.description), position]);

    module.lessons.forEach((lesson, lessonIndex) => {
      const lessonId = contentId("lesson", lesson.key);
      lessonIds.set(lesson.key, lessonId);
      const blocks = lesson.blocks.map((block) => ({ type: block.type, content: block.content, ...(block.language ? { language: block.language } : {}) }));
      lessonRows.push([
        literal(lessonId), literal(courseId), literal(moduleId), literal(lesson.title), literal(lesson.summary),
        json({ blocks }), lesson.minutes, lesson.xp, lessonIndex + 1,
      ]);
      if (!lesson.quiz) return;

      const quizId = contentId("quiz", lesson.key);
      quizIds.set(lesson.key, quizId);
      quizRows.push([literal(quizId), literal(courseId), literal(moduleId), literal(lessonId), literal(lesson.quiz.title), QUIZ_PASS_PERCENTAGE, lessonIndex + 1]);
      const count = lesson.quiz.questions.length;
      const base = Math.floor(QUIZ_XP / count);
      const remainder = QUIZ_XP - base * count;
      lesson.quiz.questions.forEach((question, index) => {
        check(question.correct >= 0 && question.correct < question.options.length, `${lesson.key} : index de bonne réponse invalide (${index + 1})`);
        if (question.type === "true_false") check(question.options.length === 2, `${lesson.key} : vrai/faux attend 2 options`);
        const questionId = contentId("question", `${lesson.key}:${index + 1}`);
        questionRows.push([
          literal(questionId), literal(quizId), index + 1, literal(question.type), literal(question.prompt),
          literal(question.explanation), literal(question.difficulty), base + (index < remainder ? 1 : 0),
        ]);
        question.options.forEach((option, optionIndex) => {
          answerRows.push([literal(contentId("answer", `${lesson.key}:${index + 1}:${optionIndex}`)), literal(questionId), optionIndex + 1, literal(option), optionIndex === question.correct]);
        });
      });
    });
  });

  // Labs, tasks, hidden answer keys, downloadable assets.
  const labIds = new Map();
  const labRows = [];
  const taskRows = [];
  const keyRows = [];
  const assetRows = [];
  labs.forEach((lab, index) => {
    const labId = contentId("lab", lab.slug);
    labIds.set(lab.slug, labId);
    check(lab.tasks.length > 0, `${lab.slug} : aucune tâche`);
    labRows.push([
      literal(labId), literal(lab.slug), literal(lab.title), literal(lab.description), literal("reseau"), literal(lab.difficulty), lab.xp,
      textArray(lab.objectives), textArray(lab.hints), "'{}'::text[]", LAB_POSITION_START + index * 10, literal(courseId), literal(lab.format),
      literal(lab.briefing), textArray(lab.constraints), textArray(lab.tools), lab.requiresComputer, lab.isAssessment, lab.minutes,
    ]);
    lab.tasks.forEach((task, taskIndex) => {
      const taskId = contentId("labtask", `${lab.slug}:${taskIndex + 1}`);
      const accepted = Array.from(new Set(task.accepted.map(normalise)));
      check(accepted.length >= 1 && accepted.length <= 8, `${lab.slug}/${taskIndex + 1} : 1 à 8 réponses acceptées`);
      taskRows.push([literal(taskId), literal(labId), taskIndex + 1, literal(task.prompt), literal(task.hint), literal(task.answerFormat)]);
      keyRows.push([literal(taskId), textArray(accepted), literal(task.explanation)]);
    });
    lab.assets.forEach((asset, assetIndex) => {
      assetRows.push([literal(contentId("labasset", `${lab.slug}:${assetIndex + 1}`)), literal(labId), literal(asset.kind), literal(asset.title), literal(asset.description), literal(asset.url), assetIndex + 1]);
    });
  });

  // Skills and the evidence each one needs.
  const assessments = labs.filter((lab) => lab.isAssessment);
  check(assessments.length === 1, "une seule évaluation pratique est attendue");
  const skillRows = [];
  const linkRows = [];
  skills.forEach((skill, index) => {
    const skillId = contentId("skill", skill.slug);
    skillRows.push([literal(skillId), literal(contentId("domain", "reseaux")), literal(skill.slug), literal(skill.name), literal(skill.description), (index + 1) * 10]);
    check(lessonIds.has(skill.lessonKey), `${skill.slug} : leçon inconnue ${skill.lessonKey}`);
    check(quizIds.has(skill.lessonKey), `${skill.slug} : la leçon ${skill.lessonKey} n’a pas de quiz`);
    check(labIds.has(skill.practiceLab), `${skill.slug} : lab inconnu ${skill.practiceLab}`);
    const link = (kind, target) => linkRows.push([literal(contentId("skilllink", `${skill.slug}:${kind}`)), literal(skillId), literal(kind), ...target]);
    link("lesson", [literal(lessonIds.get(skill.lessonKey)), "null", "null"]);
    link("quiz", ["null", literal(quizIds.get(skill.lessonKey)), "null"]);
    link("practice", ["null", "null", literal(labIds.get(skill.practiceLab))]);
    link("validation", ["null", "null", literal(labIds.get(assessments[0].slug))]);
  });

  // Badges: the target lab or skill is referenced by id, so the condition stays explicit and verifiable.
  const badgeRows = badges.map((badge) => {
    check(Boolean(badge.lab) !== Boolean(badge.skill), `${badge.slug} : un badge cible un lab ou une compétence`);
    if (badge.lab) check(labIds.has(badge.lab), `${badge.slug} : lab inconnu ${badge.lab}`);
    if (badge.skill) check(skills.some((skill) => skill.slug === badge.skill), `${badge.slug} : compétence inconnue ${badge.skill}`);
    return [
      literal(badge.slug), literal(badge.name), literal(badge.description), literal(badge.icon),
      literal(badge.lab ? "lab_completed" : "skill_validated"), 1,
      badge.lab ? literal(labIds.get(badge.lab)) : "null", badge.skill ? literal(contentId("skill", badge.skill)) : "null",
      literal(badge.rarity), badge.xp, badge.position,
    ];
  });

  const rarityRows = Object.entries(existingBadgeRarity).filter(([, rarity]) => rarity !== "common").map(([slug, rarity]) => [literal(slug), literal(rarity)]);

  const mascotRows = mascot.map((line, index) => {
    check(line.text.length <= 280, `mascotte ${line.key} : texte trop long`);
    return [literal(contentId("mascot", line.key)), literal(line.event), literal(line.expression), literal(line.text), line.priority, (index + 1) * 10];
  });

  const lessonCount = lessonRows.length;
  const taskCount = taskRows.length;
  return `-- Generated by scripts/generate-reseaux-seed.cjs from supabase/seed/content/reseaux-path.ts. Do not edit by hand.
-- CyberPingo Réseaux path: ${moduleRows.length} modules, ${lessonCount} lessons, ${quizRows.length} quizzes, ${labRows.length} labs (${taskCount} checked tasks), ${skillRows.length} skills.
-- Pedagogical content only — no accounts, no progress, no statistics. Safe to run more than once.
-- Videos, human voice recordings and the real Packet Tracer file are supplied by the team (see docs/ARCHITECTURE.md).

begin;

insert into public.domains (id, slug, name, description, icon, position) values
${rows(domainRows)}
on conflict (id) do nothing;

${domainLinks.join("\n")}

insert into public.course_modules (id, course_id, title, description, position) values
${rows(moduleRows)}
on conflict (id) do nothing;

insert into public.lessons (id, course_id, module_id, title, summary, content, duration_minutes, xp_reward, position) values
${rows(lessonRows)}
on conflict (id) do nothing;

insert into public.quizzes (id, course_id, module_id, lesson_id, title, pass_percentage, position) values
${rows(quizRows)}
on conflict (id) do nothing;

insert into public.quiz_questions (id, quiz_id, position, question_type, prompt, explanation, difficulty, xp_reward) values
${rows(questionRows)}
on conflict (id) do nothing;

insert into public.quiz_answers (id, question_id, position, label, is_correct) values
${rows(answerRows)}
on conflict (id) do nothing;

update public.courses set estimated_duration = ${course.durationMinutes + courseUpdates.lessonMinutes}
where id = ${literal(courseId)} and estimated_duration < ${course.durationMinutes + courseUpdates.lessonMinutes};

insert into public.labs (id, slug, title, description, category, difficulty, xp_reward, objectives, hints, terminal_lines, position, course_id, format, briefing, constraints, tools, requires_computer, is_assessment, estimated_minutes) values
${rows(labRows)}
on conflict (id) do nothing;

insert into public.lab_tasks (id, lab_id, position, prompt, hint, answer_format) values
${rows(taskRows)}
on conflict (id) do nothing;

insert into private.lab_task_keys (task_id, accepted, explanation) values
${rows(keyRows)}
on conflict (task_id) do nothing;

insert into public.lab_assets (id, lab_id, kind, title, description, url, position) values
${rows(assetRows)}
on conflict (id) do nothing;

-- Publishing runs the same checks as the admin console: tasks and answer keys must exist first.
update public.labs set status = 'published'
where status = 'draft' and id in (${Array.from(labIds.values()).map(literal).join(", ")});

insert into public.skills (id, domain_id, slug, name, description, position) values
${rows(skillRows)}
on conflict (id) do nothing;

insert into public.skill_links (id, skill_id, kind, lesson_id, quiz_id, lab_id) values
${rows(linkRows)}
on conflict (id) do nothing;

insert into public.badges (slug, name, description, icon, criteria_type, criteria_value, criteria_lab_id, criteria_skill_id, rarity, xp_reward, position) values
${rows(badgeRows)}
on conflict (slug) do nothing;

-- Existing badges keep the default rarity unless an admin already changed it.
update public.badges set rarity = v.rarity
from (values
${rows(rarityRows)}
) as v (slug, rarity)
where public.badges.slug = v.slug and public.badges.rarity = 'common';

insert into public.mascot_lines (id, event, expression, text_fr, priority, position) values
${rows(mascotRows)}
on conflict (id) do nothing;

commit;
`;
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, build());
  console.log(`Parcours Réseaux écrit dans ${path.relative(root, OUTPUT)}`);
}

module.exports = { build, OUTPUT };
