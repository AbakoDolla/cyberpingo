// Shared SQL builder for the pedagogical learning paths (modules, lessons, quizzes, labs with checked tasks,
// skills, badges, mascot lines). Each path has its own authoring file and a thin generator that calls
// buildPathSql(); the expected lab answers are derived from the real files produced by
// scripts/generate-lab-assets.cjs, so they can never drift.
//
// A descriptor can also reorganise content that is already published, without ever deleting it:
//   - a module with `existing: { fromTitle }` is renamed (only while it still carries its seed title) and repositioned;
//   - a lesson `{ key, existing: true }` is only moved to the module and position given by the path;
//   - a lesson with `upgrade: true` replaces a starter lesson's text, but only while the stored content is
//     still byte for byte the starter content, so nothing an administrator edited is ever overwritten;
//   - `appendResources` adds blocks (the references, and an example when one is missing) to a lesson that has no reference yet;
//   - `quizExtension` on an upgraded lesson completes the starter quiz it keeps: short explanations are replaced (only while
//     they still carry the starter text) and questions are appended after the existing ones.
// Learner progress is keyed by lesson and quiz ids, which never change, so it is preserved.
const { load } = require("./ts-loader.cjs");
const { contentId } = require("./generate-content-seed.cjs");

const QUIZ_XP = 30;
const QUIZ_PASS_PERCENTAGE = 70;
const EXTRA_QUESTION_XP = 20;

const literal = (value) => (value === null || value === undefined ? "null" : `'${String(value).replace(/'/g, "''")}'`);
const json = (value) => `${literal(JSON.stringify(value))}::jsonb`;
const textArray = (values) => (values.length ? `array[${values.map(literal).join(", ")}]::text[]` : "'{}'::text[]");
const rows = (items) => items.map((item) => `  (${item.join(", ")})`).join(",\n");
const normalise = (value) => String(value).toLowerCase().replace(/\s+/g, " ").trim();

const insertInto = (table, columns, items, conflict) => (items.length
  ? `insert into ${table} (${columns}) values\n${rows(items)}\non conflict ${conflict} do nothing;`
  : "");

const blockJson = (block) => ({
  type: block.type,
  content: block.content,
  ...(block.language ? { language: block.language } : {}),
  ...(block.url ? { url: block.url } : {}),
});
// Must stay identical to the mapping of scripts/generate-content-seed.cjs: it is the guard of the upgrades.
const starterBlockJson = (block) => ({ type: block.type, content: block.content, ...(block.language ? { language: block.language } : {}) });

// descriptor: { label, generator, contentFile, path_, defaults: { category, domain, course, labPositionStart, skillPositionStart?, mascotPositionStart? } }
function buildPathSql(descriptor) {
  const check = (condition, message) => {
    if (!condition) throw new Error(`${descriptor.label} : ${message}`);
  };
  const { courses } = load("supabase/seed/content/courses");
  const { quizzes: starterQuizzes } = load("supabase/seed/content/quizzes");
  const starterLessons = new Map(courses.flatMap((course) => course.lessons).map((lesson) => [lesson.id, lesson]));
  const { domains, modules, labs, skills, badges, existingBadgeRarity, mascot, courseUpdates, courseTexts, appendResources, durationSync, externalLabs } = descriptor.path_;
  const defaults = descriptor.defaults;
  const courseIds = new Set(courses.map((item) => item.id));
  const assertCourse = (id, where) => check(courseIds.has(id), `${where} : cours inconnu ${id}`);
  const updates = (courseUpdates ? (Array.isArray(courseUpdates) ? courseUpdates : [courseUpdates]) : []).map((update) => {
    const course = courses.find((item) => item.slug === update.slug);
    check(Boolean(course), `cours inconnu ${update.slug}`);
    return { id: contentId("course", course.id), minutes: course.durationMinutes + update.lessonMinutes };
  });
  const courseBySlug = (slug) => {
    const course = courses.find((item) => item.slug === slug);
    check(Boolean(course), `cours inconnu ${slug}`);
    return course;
  };

  // Domains and their courses.
  const domainRows = (domains ?? []).map((domain, index) => [
    literal(contentId("domain", domain.slug)), literal(domain.slug), literal(domain.name), literal(domain.description), literal(domain.icon), (index + 1) * 10,
  ]);
  const domainLinks = (domains ?? []).map((domain) => `update public.courses set domain_id = ${literal(contentId("domain", domain.slug))}
where domain_id is null and category in (${domain.categories.map(literal).join(", ")});`);

  // Modules, lessons, quizzes.
  const moduleRows = [];
  const moduleUpdates = [];
  const lessonRows = [];
  const lessonUpgrades = [];
  const lessonPlacements = [];
  const quizRows = [];
  const questionRows = [];
  const answerRows = [];
  const lessonIds = new Map();
  const quizIds = new Map();
  const positionsByCourse = new Map();

  const pushQuestion = ({ lesson, quizId, question, label, idKey, position, xp }) => {
    const correct = Array.isArray(question.correct) ? question.correct : [question.correct];
    check(correct.length > 0 && new Set(correct).size === correct.length && correct.every((value) => Number.isInteger(value) && value >= 0 && value < question.options.length), `${lesson.key} : index de bonne réponse invalide (${label})`);
    if (question.type === "true_false") check(question.options.length === 2 && correct.length === 1, `${lesson.key} : vrai/faux attend 2 options et une réponse (${label})`);
    if (question.type === "single_choice") check(correct.length === 1, `${lesson.key} : choix unique attend une seule réponse (${label})`);
    if (question.type === "multiple_choice") check(correct.length >= 2 && correct.length < question.options.length, `${lesson.key} : choix multiples attend au moins deux bonnes réponses et une mauvaise (${label})`);
    const questionId = contentId("question", idKey);
    questionRows.push([
      literal(questionId), literal(quizId), position, literal(question.type), literal(question.prompt),
      literal(question.explanation), literal(question.difficulty), xp,
    ]);
    question.options.forEach((option, optionIndex) => {
      answerRows.push([literal(contentId("answer", `${idKey}:${optionIndex}`)), literal(questionId), optionIndex + 1, literal(option), correct.includes(optionIndex)]);
    });
  };

  const addQuiz = (lesson, courseId, moduleId, lessonId, lessonPosition) => {
    const quizId = contentId("quiz", lesson.key);
    quizIds.set(lesson.key, quizId);
    quizRows.push([literal(quizId), literal(courseId), literal(moduleId), literal(lessonId), literal(lesson.quiz.title), QUIZ_PASS_PERCENTAGE, lessonPosition]);
    const count = lesson.quiz.questions.length;
    const base = Math.floor(QUIZ_XP / count);
    const remainder = QUIZ_XP - base * count;
    lesson.quiz.questions.forEach((question, index) => {
      pushQuestion({ lesson, quizId, question, label: index + 1, idKey: `${lesson.key}:${index + 1}`, position: index + 1, xp: base + (index < remainder ? 1 : 0) });
    });
  };

  // A starter quiz is kept, because attempts point at its questions. It can still be completed: the short
  // explanations are replaced while they carry the starter text, and questions are appended after the existing ones.
  const quizExplanationUpdates = [];
  const extendStarterQuiz = (lesson, starterQuiz) => {
    const { improve = [], add = [] } = lesson.quizExtension;
    const quizId = contentId("quiz", starterQuiz.id);
    check(improve.length <= starterQuiz.questions.length, `${lesson.key} : plus de corrections que de questions de départ`);
    improve.forEach((explanation, index) => {
      const starter = starterQuiz.questions[index];
      quizExplanationUpdates.push(`update public.quiz_questions set explanation = ${literal(explanation)}
where id = ${literal(contentId("question", `${starterQuiz.id}:${starter.id}`))} and explanation = ${literal(starter.explanation)};`);
    });
    add.forEach((question, offset) => {
      pushQuestion({ lesson, quizId, question, label: `ajout ${offset + 1}`, idKey: `${lesson.key}:extra:${offset + 1}`, position: starterQuiz.questions.length + offset + 1, xp: EXTRA_QUESTION_XP });
    });
  };

  modules.forEach((module) => {
    const [moduleCourse, keyNumber] = module.key.split(":");
    const position = module.position ?? Number(keyNumber);
    assertCourse(moduleCourse, `module ${module.key}`);
    check(Number.isInteger(position) && position >= 0, `module ${module.key} : position invalide`);
    const taken = positionsByCourse.get(moduleCourse) ?? new Set();
    check(!taken.has(position), `module ${module.key} : la position ${position} est déjà prise dans ${moduleCourse}`);
    taken.add(position);
    positionsByCourse.set(moduleCourse, taken);
    const courseId = contentId("course", moduleCourse);
    const moduleId = contentId("module", module.key);
    if (module.existing) {
      check(Boolean(module.existing.fromTitle), `module ${module.key} : titre d’origine requis pour le renommer`);
      moduleUpdates.push(`update public.course_modules set title = ${literal(module.title)}, description = ${literal(module.description)}
where id = ${literal(moduleId)} and title = ${literal(module.existing.fromTitle)};`);
      moduleUpdates.push(`update public.course_modules set position = ${position} where id = ${literal(moduleId)};`);
    } else {
      moduleRows.push([literal(moduleId), literal(courseId), literal(module.title), literal(module.description), position]);
    }

    module.lessons.forEach((lesson, lessonIndex) => {
      const lessonPosition = lessonIndex + 1;
      const lessonId = contentId("lesson", lesson.key);
      check(!lessonIds.has(lesson.key), `leçon ${lesson.key} : clé en double`);
      lessonIds.set(lesson.key, lessonId);
      const place = () => {
        lessonPlacements.push(`update public.lessons set module_id = ${literal(moduleId)}, position = ${lessonPosition} where id = ${literal(lessonId)};`);
        lessonPlacements.push(`update public.quizzes set position = ${lessonPosition} where lesson_id = ${literal(lessonId)};`);
      };
      if (lesson.existing) {
        place();
        // A deep lesson published without a quiz can get one; a lesson that already has one keeps it.
        if (lesson.quiz) addQuiz(lesson, courseId, moduleId, lessonId, lessonPosition);
        return;
      }
      const blocks = lesson.blocks.map(blockJson);
      blocks.forEach((block, blockIndex) => {
        if (["video", "image", "resource"].includes(block.type)) check(/^https:\/\/\S{4,}$/.test(block.url ?? "") && block.url.length <= 508, `${lesson.key} : bloc ${blockIndex + 1} sans adresse https valide`);
      });

      if (lesson.upgrade) {
        const starter = starterLessons.get(lesson.key);
        check(Boolean(starter), `${lesson.key} : leçon de départ introuvable`);
        check(starter.courseId === moduleCourse, `${lesson.key} : une leçon ne peut pas changer de cours`);
        const original = json({ blocks: starter.blocks.map(starterBlockJson) });
        lessonUpgrades.push(`update public.lessons set title = ${literal(lesson.title)}, summary = ${literal(lesson.summary)}, content = ${json({ blocks })}, duration_minutes = ${lesson.minutes}, xp_reward = ${lesson.xp}
where id = ${literal(lessonId)} and content = ${original};`);
        place();
        const starterQuiz = starterQuizzes.find((item) => item.lessonId === lesson.key);
        if (starterQuiz) {
          check(!lesson.quiz, `${lesson.key} : la leçon de départ a déjà un quiz, il est conservé`);
          quizIds.set(lesson.key, contentId("quiz", starterQuiz.id));
          if (lesson.quizExtension) extendStarterQuiz(lesson, starterQuiz);
        } else {
          check(!lesson.quizExtension, `${lesson.key} : pas de quiz de départ à compléter`);
          if (lesson.quiz) addQuiz(lesson, courseId, moduleId, lessonId, lessonPosition);
        }
        return;
      }

      lessonRows.push([
        literal(lessonId), literal(courseId), literal(moduleId), literal(lesson.title), literal(lesson.summary),
        json({ blocks }), lesson.minutes, lesson.xp, lessonPosition,
      ]);
      if (lesson.quiz) addQuiz(lesson, courseId, moduleId, lessonId, lessonPosition);
    });
  });

  // Blocks added at the end of lessons published earlier (a missing example, then the references). They are added
  // only while the lesson has no reference yet, so running the seed twice, or after an edit in the console, changes nothing.
  const resourceUpdates = (appendResources ?? []).map((entry) => {
    const resources = entry.blocks.filter((block) => block.type === "resource");
    check(resources.length > 0 && resources.every((block) => /^https:\/\/\S{4,}$/.test(block.url ?? "")), `${entry.key} : références invalides`);
    check(entry.blocks.slice(entry.blocks.findIndex((block) => block.type === "resource")).every((block) => block.type === "resource"), `${entry.key} : les références ferment la leçon`);
    return `update public.lessons set content = jsonb_set(content, '{blocks}', (content -> 'blocks') || ${json(entry.blocks.map(blockJson))})
where id = ${literal(contentId("lesson", entry.key))} and not exists (select 1 from jsonb_array_elements(content -> 'blocks') b where b ->> 'type' = 'resource');`;
  });

  // The course page texts: only replaced while they still carry the starter wording.
  const textUpdates = (courseTexts ?? []).map((entry) => {
    const course = courseBySlug(entry.slug);
    return `update public.courses set short_description = ${literal(entry.short)}, description = ${literal(entry.description)}
where id = ${literal(contentId("course", course.id))} and short_description = ${literal(entry.fromShort)} and description = ${literal(entry.fromDescription)};`;
  });

  // Keeps the displayed duration equal to the sum of the lessons; it only ever grows, like the seeds before it.
  const syncUpdates = (durationSync ?? []).map((slug) => {
    const course = courseBySlug(slug);
    const id = literal(contentId("course", course.id));
    return `update public.courses c set estimated_duration = least(10000, s.total)
from (select course_id, sum(duration_minutes)::integer as total from public.lessons group by course_id) s
where c.id = ${id} and s.course_id = c.id and c.estimated_duration < s.total;`;
  });

  // Labs, tasks, hidden answer keys, downloadable assets.
  const labIds = new Map();
  // Every lab a skill or a badge may point to: the labs of this path and the ones published by an earlier seed.
  const knownLabs = new Map((externalLabs ?? []).map((lab) => [lab.slug, { id: contentId("lab", lab.slug), isAssessment: Boolean(lab.isAssessment) }]));
  const labRows = [];
  const taskRows = [];
  const keyRows = [];
  const assetRows = [];
  (labs ?? []).forEach((lab, index) => {
    const labId = contentId("lab", lab.slug);
    check(!knownLabs.has(lab.slug), `lab ${lab.slug} : slug en double`);
    labIds.set(lab.slug, labId);
    knownLabs.set(lab.slug, { id: labId, isAssessment: Boolean(lab.isAssessment) });
    check(lab.tasks.length > 0, `${lab.slug} : aucune tâche`);
    const labCourse = lab.course ?? defaults.course;
    assertCourse(labCourse, `lab ${lab.slug}`);
    labRows.push([
      literal(labId), literal(lab.slug), literal(lab.title), literal(lab.description), literal(lab.category ?? defaults.category), literal(lab.difficulty), lab.xp,
      textArray(lab.objectives), textArray(lab.hints), "'{}'::text[]", defaults.labPositionStart + index * 10, literal(contentId("course", labCourse)), literal(lab.format),
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
  const assessments = Array.from(knownLabs.entries()).filter(([, lab]) => lab.isAssessment).map(([slug]) => slug);
  check(assessments.length >= 1, "au moins une évaluation pratique est attendue");
  check((skills ?? []).every((skill) => skill.validationLab || assessments.length === 1), "plusieurs évaluations : chaque compétence doit préciser validationLab");
  const skillRows = [];
  const linkRows = [];
  (skills ?? []).forEach((skill, index) => {
    const skillId = contentId("skill", skill.slug);
    skillRows.push([literal(skillId), literal(contentId("domain", skill.domain ?? defaults.domain)), literal(skill.slug), literal(skill.name), literal(skill.description), (defaults.skillPositionStart ?? 0) + (index + 1) * 10]);
    check(lessonIds.has(skill.lessonKey), `${skill.slug} : leçon inconnue ${skill.lessonKey}`);
    check(quizIds.has(skill.lessonKey), `${skill.slug} : la leçon ${skill.lessonKey} n’a pas de quiz`);
    check(knownLabs.has(skill.practiceLab), `${skill.slug} : lab inconnu ${skill.practiceLab}`);
    const link = (kind, target) => linkRows.push([literal(contentId("skilllink", `${skill.slug}:${kind}`)), literal(skillId), literal(kind), ...target]);
    link("lesson", [literal(lessonIds.get(skill.lessonKey)), "null", "null"]);
    link("quiz", ["null", literal(quizIds.get(skill.lessonKey)), "null"]);
    link("practice", ["null", "null", literal(knownLabs.get(skill.practiceLab).id)]);
    const validationLab = skill.validationLab ?? assessments[0];
    check(assessments.includes(validationLab), `${skill.slug} : évaluation inconnue ${validationLab}`);
    link("validation", ["null", "null", literal(knownLabs.get(validationLab).id)]);
  });

  // Badges: the target lab or skill is referenced by id, so the condition stays explicit and verifiable.
  const badgeRows = (badges ?? []).map((badge) => {
    check(Boolean(badge.lab) !== Boolean(badge.skill), `${badge.slug} : un badge cible un lab ou une compétence`);
    if (badge.lab) check(knownLabs.has(badge.lab), `${badge.slug} : lab inconnu ${badge.lab}`);
    if (badge.skill) check((skills ?? []).some((skill) => skill.slug === badge.skill), `${badge.slug} : compétence inconnue ${badge.skill}`);
    return [
      literal(badge.slug), literal(badge.name), literal(badge.description), literal(badge.icon),
      literal(badge.lab ? "lab_completed" : "skill_validated"), 1,
      badge.lab ? literal(knownLabs.get(badge.lab).id) : "null", badge.skill ? literal(contentId("skill", badge.skill)) : "null",
      literal(badge.rarity), badge.xp, badge.position,
    ];
  });

  const rarityRows = Object.entries(existingBadgeRarity ?? {}).filter(([, rarity]) => rarity !== "common").map(([slug, rarity]) => [literal(slug), literal(rarity)]);

  const mascotRows = (mascot ?? []).map((line, index) => {
    check(line.text.length <= 280, `mascotte ${line.key} : texte trop long`);
    return [literal(contentId("mascot", line.key)), literal(line.event), literal(line.expression), literal(line.text), line.priority, (defaults.mascotPositionStart ?? 0) + (index + 1) * 10];
  });

  const lessonCount = lessonRows.length;
  const taskCount = taskRows.length;
  const domainsBlock = domainRows.length
    ? `insert into public.domains (id, slug, name, description, icon, position) values
${rows(domainRows)}
on conflict (id) do nothing;

${domainLinks.join("\n")}`
    : "";
  const rarityBlock = rarityRows.length
    ? `-- Existing badges keep the default rarity unless an admin already changed it.
update public.badges set rarity = v.rarity
from (values
${rows(rarityRows)}
) as v (slug, rarity)
where public.badges.slug = v.slug and public.badges.rarity = 'common';`
    : "";
  const durationBlock = updates
    .map((update) => `update public.courses set estimated_duration = ${update.minutes}
where id = ${literal(update.id)} and estimated_duration < ${update.minutes};`)
    .join("\n");
  const publishBlock = labIds.size
    ? `-- Publishing runs the same checks as the admin console: tasks and answer keys must exist first.
update public.labs set status = 'published'
where status = 'draft' and id in (${Array.from(labIds.values()).map(literal).join(", ")});`
    : "";
  const reorganised = moduleUpdates.length / 2 + lessonUpgrades.length + resourceUpdates.length;
  const quizNote = quizExplanationUpdates.length ? ` ${quizExplanationUpdates.length} short starter quiz explanations completed (guarded).` : "";
  const reorganisedNote = reorganised
    ? `\n-- Reorganisation of published content, all guarded and never destructive: ${moduleUpdates.length / 2} modules renamed or repositioned, ${lessonUpgrades.length} starter lessons upgraded, ${lessonPlacements.length / 2} lessons placed, ${resourceUpdates.length} lessons given references.${quizNote}`
    : "";

  const sections = [
    domainsBlock,
    insertInto("public.course_modules", "id, course_id, title, description, position", moduleRows, "(id)"),
    moduleUpdates.join("\n"),
    insertInto("public.lessons", "id, course_id, module_id, title, summary, content, duration_minutes, xp_reward, position", lessonRows, "(id)"),
    lessonUpgrades.join("\n"),
    lessonPlacements.join("\n"),
    resourceUpdates.join("\n"),
    insertInto("public.quizzes", "id, course_id, module_id, lesson_id, title, pass_percentage, position", quizRows, "(id)"),
    insertInto("public.quiz_questions", "id, quiz_id, position, question_type, prompt, explanation, difficulty, xp_reward", questionRows, "(id)"),
    insertInto("public.quiz_answers", "id, question_id, position, label, is_correct", answerRows, "(id)"),
    quizExplanationUpdates.join("\n"),
    syncUpdates.join("\n"),
    textUpdates.join("\n"),
    durationBlock,
    insertInto("public.labs", "id, slug, title, description, category, difficulty, xp_reward, objectives, hints, terminal_lines, position, course_id, format, briefing, constraints, tools, requires_computer, is_assessment, estimated_minutes", labRows, "(id)"),
    insertInto("public.lab_tasks", "id, lab_id, position, prompt, hint, answer_format", taskRows, "(id)"),
    insertInto("private.lab_task_keys", "task_id, accepted, explanation", keyRows, "(task_id)"),
    insertInto("public.lab_assets", "id, lab_id, kind, title, description, url, position", assetRows, "(id)"),
    publishBlock,
    insertInto("public.skills", "id, domain_id, slug, name, description, position", skillRows, "(id)"),
    insertInto("public.skill_links", "id, skill_id, kind, lesson_id, quiz_id, lab_id", linkRows, "(id)"),
    insertInto("public.badges", "slug, name, description, icon, criteria_type, criteria_value, criteria_lab_id, criteria_skill_id, rarity, xp_reward, position", badgeRows, "(slug)"),
    rarityBlock,
    insertInto("public.mascot_lines", "id, event, expression, text_fr, priority, position", mascotRows, "(id)"),
  ].filter(Boolean);

  return `-- Generated by ${descriptor.generator} from ${descriptor.contentFile}. Do not edit by hand.
-- CyberPingo ${descriptor.label} path: ${moduleRows.length} modules, ${lessonCount} lessons, ${quizRows.length} quizzes, ${labRows.length} labs (${taskCount} checked tasks), ${skillRows.length} skills.${reorganisedNote}
-- Pedagogical content only — no accounts, no progress, no statistics. Safe to run more than once.
-- Videos, human voice recordings and the real Packet Tracer file are supplied by the team (see docs/ARCHITECTURE.md).

begin;

${sections.join("\n\n")}

commit;
`;
}

module.exports = { buildPathSql };
