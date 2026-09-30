#!/usr/bin/env node
// Builds supabase/seed/01_starter_content.sql from supabase/seed/content/*.ts.
// Run `node scripts/generate-content-seed.cjs` after editing the starter lessons, quizzes or labs.
// The output is starter pedagogical content (no users, no statistics). It is loaded by
// `supabase db reset` locally and can be run once in the SQL editor of a new project.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { load, root } = require("./ts-loader.cjs");

const OUTPUT = path.join(root, "supabase", "seed", "01_starter_content.sql");

// Two learning modules per starter course, in teaching order.
const MODULES = {
  c1: [
    { title: "Comprendre la cybersécurité", description: "Ce que l’on protège, et contre quoi.", lessons: ["l-c1-1", "l-c1-2"] },
    { title: "L’écosystème de la sécurité", description: "Qui défend, qui attaque, et avec quels réflexes.", lessons: ["l-c1-3"] },
  ],
  c2: [
    { title: "Les services du réseau", description: "DNS, ports et protocoles : ce qui circule vraiment.", lessons: ["l1", "l2"] },
    { title: "Les couches du réseau", description: "Lire un échange réseau couche par couche.", lessons: ["l-c2-3"] },
  ],
  c3: [
    { title: "Prendre en main Linux", description: "Se repérer et se déplacer dans le système de fichiers.", lessons: ["l-c3-1"] },
    { title: "Droits et utilisateurs", description: "Qui peut lire, écrire, exécuter — et pourquoi c’est crucial.", lessons: ["l-c3-2"] },
  ],
  c4: [
    { title: "Naviguer en sécurité", description: "Ce que HTTPS garantit, et ce qu’il ne garantit pas.", lessons: ["web-https"] },
    { title: "Protéger ses comptes", description: "Mots de passe, MFA et messages piégés.", lessons: ["web-comptes", "web-phishing"] },
  ],
  c5: [
    { title: "Cadre et méthode", description: "Tester légalement, avec une méthode reproductible.", lessons: ["pentest-cadre", "pentest-methode"] },
    { title: "Restitution", description: "Transformer une découverte en correction utile.", lessons: ["pentest-rapport"] },
  ],
  c6: [
    { title: "Lire les journaux", description: "Comprendre un événement et relier les indices.", lessons: ["logs-lire", "logs-correler"] },
    { title: "Qualifier une alerte", description: "Décider, documenter et transmettre.", lessons: ["logs-triage"] },
  ],
};

const COURSE_SUMMARIES = {
  c1: "Ce que la cybersécurité protège, les grandes familles de menaces et les acteurs qui défendent nos systèmes. Le point de départ idéal, sans prérequis.",
  c2: "DNS, ports, protocoles et modèle OSI : comprendre comment circulent les données pour repérer ce qui cloche et mieux les protéger.",
  c3: "Le terminal, l’arborescence et les permissions : les gestes Linux qu’utilise chaque jour un analyste ou un administrateur.",
  c4: "HTTPS, gestionnaire de mots de passe, MFA et détection du phishing : les réflexes qui protègent tes comptes et ceux de ton équipe.",
  c5: "Autorisation, périmètre, méthode et rapport : la démarche d’un test d’intrusion éthique, de la lettre de mission à la recommandation.",
  c6: "Lire un journal, corréler des événements et qualifier une alerte sans conclure trop vite : les bases du travail en SOC.",
};

/** Deterministic UUID so re-running the seed (and the tests) always targets the same rows. */
function contentId(kind, key) {
  const hex = crypto.createHash("md5").update(`cyberpingo:${kind}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const literal = (value) => (value === null || value === undefined ? "null" : `'${String(value).replace(/'/g, "''")}'`);
const json = (value) => `${literal(JSON.stringify(value))}::jsonb`;
const textArray = (values) => (values.length ? `array[${values.map(literal).join(", ")}]::text[]` : "'{}'::text[]");

function summaryOf(lesson) {
  const text = lesson.blocks.find((block) => block.type === "text")?.content ?? "";
  const sentence = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s/)[0] ?? "";
  return sentence.length > 240 ? `${sentence.slice(0, 237).trimEnd()}…` : sentence;
}

function questionRows(quiz, courseLevel) {
  const base = Math.floor(quiz.xpReward / quiz.questions.length);
  const remainder = quiz.xpReward - base * quiz.questions.length;
  return quiz.questions.map((question, index) => {
    const matches = question.options.filter((option) => option === question.correctAnswer);
    if (matches.length !== 1) throw new Error(`${quiz.id}/${question.id} : la bonne réponse doit apparaître exactement une fois.`);
    const type = question.type === "vrai_faux" ? "true_false" : "single_choice";
    if (type === "true_false" && question.options.length !== 2) throw new Error(`${quiz.id}/${question.id} : vrai/faux attend 2 options.`);
    return {
      id: contentId("question", `${quiz.id}:${question.id}`),
      position: index + 1,
      type,
      prompt: question.prompt,
      explanation: question.explanation,
      difficulty: courseLevel === "debutant" ? "facile" : courseLevel === "intermediaire" ? "moyen" : "difficile",
      xp: base + (index < remainder ? 1 : 0),
      answers: question.options.map((option, answerIndex) => ({
        id: contentId("answer", `${quiz.id}:${question.id}:${answerIndex}`),
        position: answerIndex + 1,
        label: option,
        correct: option === question.correctAnswer,
      })),
    };
  });
}

function buildContentSeed() {
  const { courses } = load("supabase/seed/content/courses");
  const { quizzes } = load("supabase/seed/content/quizzes");
  const { challenges } = load("supabase/seed/content/challenges");
  const { challengeAnswers } = load("supabase/seed/content/challenge-answers");

  const missingFlags = challenges.filter((challenge) => !challengeAnswers[challenge.id]?.trim());
  if (missingFlags.length) throw new Error(`Flag manquant dans supabase/seed/content/challenge-answers.ts : ${missingFlags.map((c) => c.id).join(", ")}`);

  const courseRows = [];
  const moduleRows = [];
  const lessonRows = [];
  const quizRows = [];
  const questionSql = [];
  const answerSql = [];
  const courseIds = [];

  courses.forEach((course, courseIndex) => {
    const modules = MODULES[course.id];
    if (!modules) throw new Error(`Modules non définis pour ${course.id}`);
    const grouped = modules.flatMap((module) => module.lessons).sort();
    const actual = course.lessons.map((lesson) => lesson.id).sort();
    if (JSON.stringify(grouped) !== JSON.stringify(actual)) throw new Error(`Les modules de ${course.id} ne couvrent pas exactement ses leçons.`);

    const courseId = contentId("course", course.id);
    courseIds.push(courseId);
    courseRows.push(`  (${[
      literal(courseId), literal(course.slug), literal(course.title), literal(course.description),
      literal(COURSE_SUMMARIES[course.id] ?? course.description), literal(course.level), literal(course.category),
      literal(course.icon), course.durationMinutes, (courseIndex + 1) * 10,
    ].join(", ")})`);

    modules.forEach((module, moduleIndex) => {
      const moduleId = contentId("module", `${course.id}:${moduleIndex + 1}`);
      moduleRows.push(`  (${[literal(moduleId), literal(courseId), literal(module.title), literal(module.description), moduleIndex + 1].join(", ")})`);

      module.lessons.forEach((lessonKey, lessonIndex) => {
        const lesson = course.lessons.find((item) => item.id === lessonKey);
        const lessonId = contentId("lesson", lesson.id);
        const blocks = lesson.blocks.map((block) => ({ type: block.type, content: block.content, ...(block.language ? { language: block.language } : {}) }));
        lessonRows.push(`  (${[
          literal(lessonId), literal(courseId), literal(moduleId), literal(lesson.title), literal(summaryOf(lesson)),
          json({ blocks }), lesson.durationMinutes, lesson.xpReward, lessonIndex + 1,
        ].join(", ")})`);

        const quiz = quizzes.find((item) => item.lessonId === lesson.id);
        if (!quiz) return;
        const quizId = contentId("quiz", quiz.id);
        quizRows.push(`  (${[literal(quizId), literal(courseId), literal(moduleId), literal(lessonId), literal(quiz.title), 70, lessonIndex + 1].join(", ")})`);
        for (const question of questionRows(quiz, course.level)) {
          questionSql.push(`  (${[literal(question.id), literal(quizId), question.position, literal(question.type), literal(question.prompt),
            literal(question.explanation), literal(question.difficulty), question.xp].join(", ")})`);
          for (const answer of question.answers) {
            answerSql.push(`  (${[literal(answer.id), literal(question.id), answer.position, literal(answer.label), answer.correct].join(", ")})`);
          }
        }
      });
    });
  });

  const orphanQuizzes = quizzes.filter((quiz) => !courses.some((course) => course.lessons.some((lesson) => lesson.id === quiz.lessonId)));
  if (orphanQuizzes.length) throw new Error(`Quiz sans leçon : ${orphanQuizzes.map((quiz) => quiz.id).join(", ")}`);

  const labIds = [];
  const labRows = challenges.map((challenge, index) => {
    const labId = contentId("lab", challenge.id);
    labIds.push(labId);
    return `  (${[
      literal(labId), literal(challenge.slug), literal(challenge.title), literal(challenge.description), literal(challenge.category),
      literal(challenge.difficulty), challenge.xpReward, textArray(challenge.objectives), textArray(challenge.hints),
      textArray(challenge.terminalLines), literal(challenge.flagPlaceholder), (index + 1) * 10,
    ].join(", ")})`;
  });
  const flagRows = challenges.map((challenge) => `  (${literal(contentId("lab", challenge.id))}, ${literal(challengeAnswers[challenge.id].trim())})`);
  const networkCourse = courses.find((course) => course.slug === "reseaux");

  return `-- Generated by scripts/generate-content-seed.cjs from supabase/seed/content/*.ts. Do not edit by hand.
-- CyberPingo starter content: ${courses.length} courses, ${lessonRows.length} lessons, ${quizRows.length} quizzes, ${labRows.length} labs.
-- Pedagogical content only — no accounts, no progress, no statistics. Safe to run more than once.

begin;

insert into public.courses (id, slug, title, short_description, description, level, category, icon, estimated_duration, position) values
${courseRows.join(",\n")}
on conflict (id) do nothing;

insert into public.course_modules (id, course_id, title, description, position) values
${moduleRows.join(",\n")}
on conflict (id) do nothing;

insert into public.lessons (id, course_id, module_id, title, summary, content, duration_minutes, xp_reward, position) values
${lessonRows.join(",\n")}
on conflict (id) do nothing;

insert into public.quizzes (id, course_id, module_id, lesson_id, title, pass_percentage, position) values
${quizRows.join(",\n")}
on conflict (id) do nothing;

insert into public.quiz_questions (id, quiz_id, position, question_type, prompt, explanation, difficulty, xp_reward) values
${questionSql.join(",\n")}
on conflict (id) do nothing;

insert into public.quiz_answers (id, question_id, position, label, is_correct) values
${answerSql.join(",\n")}
on conflict (id) do nothing;

-- Publishing runs the same structural checks as the admin console.
update public.courses set status = 'published'
where status = 'draft' and id in (${courseIds.map(literal).join(", ")});

insert into public.labs (id, slug, title, description, category, difficulty, xp_reward, objectives, hints, terminal_lines, flag_placeholder, position) values
${labRows.join(",\n")}
on conflict (id) do nothing;

insert into private.lab_flags (lab_id, flag) values
${flagRows.join(",\n")}
on conflict (lab_id) do nothing;

update public.labs set status = 'published'
where status = 'draft' and id in (${labIds.map(literal).join(", ")});

insert into public.badges (slug, name, description, icon, criteria_type, criteria_value, criteria_course_id, xp_reward, position) values
  ('expert-reseau', 'Expert réseau', 'Terminer entièrement le parcours Réseaux informatiques.', 'network', 'course_completed', 1, ${literal(contentId("course", networkCourse.id))}, 50, 110)
on conflict (slug) do nothing;

commit;
`;
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, buildContentSeed());
  console.log(`Contenu de démarrage écrit dans ${path.relative(root, OUTPUT)}`);
}

module.exports = { buildContentSeed, contentId, OUTPUT };
