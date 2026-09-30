// Unit tests for the pure client modules (no network, no database). The database behaviour
// itself (RLS, RPCs, anti-cheat) is covered by tests/database.test.cjs.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { load, root } = require("../scripts/ts-loader.cjs");

const { computeLevelInfo, dateInZone, effectiveStreak } = load("lib/levels");
const { safeReturnPath, DAILY_GOALS } = load("lib/navigation");
const { asRole, isStaff, isSuperadmin } = load("lib/roles");
const { AppError, toAppError, errorMessage, unwrap } = load("lib/errors");
const { normalizeCourseImport, parseCourseImportJson, slugifyCourse, validateAdminQuizQuestions } = load("lib/course-import");
const { parseLessonBlocks, videoEmbed } = load("lib/lesson-content");
const { pageLabel } = load("lib/page-labels");
const { sessionStatus } = load("types/realtime");
const { passwordProblem } = load("services/auth.service");

const LEVELS = [
  { level: 3, required_xp: 300, title: "Analyste" },
  { level: 1, required_xp: 0, title: "Recrue" },
  { level: 2, required_xp: 100, title: "Veilleur" },
];

test("level info mirrors private.level_info() thresholds and rounding", () => {
  assert.deepEqual(computeLevelInfo(0, LEVELS), {
    xp: 0, level: 1, title: "Recrue", current_level_xp: 0,
    next_level: 2, next_level_xp: 100, next_title: "Veilleur", progress_percentage: 0,
  });
  assert.equal(computeLevelInfo(99, LEVELS).level, 1);
  assert.equal(computeLevelInfo(99, LEVELS).progress_percentage, 99);
  assert.equal(computeLevelInfo(100, LEVELS).level, 2);
  assert.equal(computeLevelInfo(299, LEVELS).progress_percentage, 99);
  const top = computeLevelInfo(5000, LEVELS);
  assert.equal(top.level, 3);
  assert.equal(top.next_level, null);
  assert.equal(top.progress_percentage, 100);
  assert.equal(computeLevelInfo(-50, LEVELS).level, 1);
});

test("streaks survive until the end of the next day in the learner's timezone", () => {
  const now = new Date("2026-09-10T02:00:00Z");
  assert.equal(dateInZone(now, "Europe/Paris"), "2026-09-10");
  assert.equal(dateInZone(now, "America/New_York"), "2026-09-09");
  assert.equal(dateInZone(now, "Not/AZone"), "2026-09-10");
  assert.equal(effectiveStreak(4, "2026-09-09", "Europe/Paris", now), 4);
  assert.equal(effectiveStreak(4, "2026-09-08", "Europe/Paris", now), 0);
  assert.equal(effectiveStreak(4, "2026-09-08", "America/New_York", now), 4);
  assert.equal(effectiveStreak(4, null, "Europe/Paris", now), 0);
});

test("return paths stay inside the app and keep learners out of the admin area", () => {
  for (const next of ["https://example.test", "//example.test", "/\\example.test", "javascript:alert(1)", "/courses/../../admin", "/login", "", null]) {
    assert.equal(safeReturnPath(next, "user"), "/dashboard");
  }
  assert.equal(safeReturnPath(null, "admin"), "/admin");
  assert.equal(safeReturnPath("/admin/cours", "user"), "/dashboard");
  assert.equal(safeReturnPath("/admin/cours", "superadmin"), "/admin/cours");
  assert.equal(safeReturnPath("/quiz/2b1f-quiz", "user"), "/quiz/2b1f-quiz");
  assert.equal(safeReturnPath("/parametres", "user"), "/parametres");
  assert.deepEqual([...DAILY_GOALS], [10, 20, 30, 45, 60, 90]);
});

test("unknown roles fall back to the least privileged one", () => {
  assert.equal(asRole("superadmin"), "superadmin");
  assert.equal(asRole("root"), "user");
  assert.equal(asRole(null), "user");
  assert.equal(isStaff("admin"), true);
  assert.equal(isStaff("user"), false);
  assert.equal(isSuperadmin("admin"), false);
});

test("errors are translated without leaking database internals", () => {
  assert.equal(errorMessage({ message: "Leçon verrouillée.", hint: "cyberpingo", code: "P0001" }), "Leçon verrouillée.");
  assert.equal(errorMessage({ message: "Invalid login credentials" }), "Adresse e-mail ou mot de passe incorrect.");
  assert.equal(toAppError({ message: "Email rate limit exceeded" }).kind, "rate_limited");
  assert.equal(toAppError(new TypeError("Failed to fetch")).kind, "network");
  assert.equal(toAppError({ message: "JWT expired" }).kind, "unauthenticated");
  assert.equal(errorMessage({ message: 'relation "private.quiz_answers" does not exist', code: "42P01" }, "Oups"), "Oups");
  assert.doesNotMatch(errorMessage({ message: 'relation "private.quiz_answers" does not exist', code: "42P01" }), /private|relation/);
  assert.equal(toAppError({ message: "new row violates row-level security policy" }).kind, "forbidden");
  assert.equal(toAppError({ message: "duplicate key value", code: "23505" }).message, "Cet élément existe déjà.");
  assert.equal(toAppError({ message: "x", code: "PGRST116" }).kind, "not_found");
  const original = new AppError("conflict", "Déjà terminé.");
  assert.equal(toAppError(original), original);
  assert.equal(unwrap({ data: 42, error: null }), 42);
  assert.throws(() => unwrap({ data: null, error: { message: "boom", code: "XX000" } }, "Échec."), (error) => error instanceof AppError && error.message === "Échec.");
});

test("passwords need eight characters with letters and digits", () => {
  assert.match(passwordProblem("court1"), /8 caractères/);
  assert.match(passwordProblem("seulementdeslettres"), /lettre et un chiffre/);
  assert.match(passwordProblem("12345678"), /lettre et un chiffre/);
  assert.equal(passwordProblem("pingouin42"), null);
});

test("course imports are normalised, sanitised and valid for the admin editor", () => {
  const imported = normalizeCourseImport({
    course: {
      title: "  Sécurité des réseaux Wi-Fi  ",
      level: "expert",
      modules: [
        {
          lessons: [{
            title: "WPA3",
            durationMinutes: 999,
            blocks: [
              { type: "text", content: "Contenu" },
              { type: "script", content: "alert(1)" },
              { type: "image", url: "http://insecure.test/a.png" },
              { type: "video", url: "https://youtu.be/abcdef123" },
            ],
            quiz: { questions: [
              { prompt: "WPA3 est-il plus sûr ?", type: "true_false", answers: [{ label: "Vrai", correct: false }, { label: "Faux", correct: true }] },
              { question: "Quel protocole remplace WPA2 ?", options: ["WPA3", "WEP", "TKIP"] },
              { prompt: "Deux bonnes réponses", type: "single_choice", answers: [{ label: "A", is_correct: true }, { label: "B", is_correct: true }] },
            ] },
          }],
        },
        { title: "Module vide" },
      ],
    },
  });
  assert.equal(imported.title, "Sécurité des réseaux Wi-Fi");
  assert.equal(imported.slug, "securite-des-reseaux-wi-fi");
  assert.equal(imported.level, "debutant");
  assert.equal(imported.modules.length, 2);
  assert.equal(imported.modules[0].title, "Module 1");
  const [lesson] = imported.modules[0].lessons;
  assert.equal(lesson.duration_minutes, 240);
  assert.deepEqual(lesson.blocks.map((block) => block.type), ["text", "video"]);
  const [trueFalse, options, single] = lesson.quiz.questions;
  assert.deepEqual(trueFalse.answers.map((answer) => answer.is_correct), [false, true]);
  assert.equal(options.question_type, "single_choice");
  assert.deepEqual(options.answers.map((answer) => [answer.label, answer.is_correct]), [["WPA3", true], ["WEP", false], ["TKIP", false]]);
  assert.deepEqual(single.answers.map((answer) => answer.is_correct), [true, false]);
  assert.equal(validateAdminQuizQuestions(lesson.quiz.questions), null);
  assert.equal(imported.modules[1].lessons.length, 1);
  assert.throws(() => normalizeCourseImport({ title: "Vide", modules: [] }), /au moins un module/);
  assert.throws(() => normalizeCourseImport("texte"), /objet cours/);
  assert.throws(() => parseCourseImportJson("{pas du json"));
  assert.equal(slugifyCourse("Élévation de privilèges !"), "elevation-de-privileges");
  assert.equal(slugifyCourse("!!!"), "cours");
});

test("admin quiz validation explains the first problem", () => {
  const question = (overrides) => ({ question_type: "single_choice", prompt: "Q", image_url: null, explanation: "", difficulty: "facile", xp_reward: 10, answers: [{ label: "A", is_correct: true }, { label: "B", is_correct: false }], ...overrides });
  assert.match(validateAdminQuizQuestions([]), /au moins une question/);
  assert.match(validateAdminQuizQuestions([question({ prompt: " " })]), /Question 1 : renseigne/);
  assert.match(validateAdminQuizQuestions([question(), question({ answers: [{ label: "A", is_correct: false }, { label: "B", is_correct: false }] })]), /Question 2 : coche/);
  assert.match(validateAdminQuizQuestions([question({ answers: [{ label: "A", is_correct: true }, { label: "B", is_correct: true }] })]), /une seule bonne réponse/);
  assert.equal(validateAdminQuizQuestions([question({ question_type: "multiple_choice", answers: [{ label: "A", is_correct: true }, { label: "B", is_correct: true }] })]), null);
});

test("lesson content skips unknown blocks and non-https media", () => {
  const blocks = parseLessonBlocks({ blocks: [
    { type: "heading", content: "Titre" },
    { type: "code", content: "nmap -sV 10.0.0.1", language: "bash" },
    { type: "image", url: "javascript:alert(1)" },
    { type: "resource", url: "https://example.test/guide.pdf", content: "Guide" },
    { type: "iframe", content: "<script>" },
    "texte brut",
  ] });
  assert.deepEqual(blocks.map((block) => block.type), ["heading", "code", "resource"]);
  assert.equal(blocks[1].language, "bash");
  assert.deepEqual(parseLessonBlocks(null), []);
  assert.deepEqual(parseLessonBlocks({ blocks: "x" }), []);
  assert.deepEqual(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), { kind: "iframe", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" });
  assert.deepEqual(videoEmbed("https://vimeo.com/123456"), { kind: "iframe", src: "https://player.vimeo.com/video/123456" });
  assert.deepEqual(videoEmbed("https://cdn.example.test/cours.mp4"), { kind: "file", src: "https://cdn.example.test/cours.mp4" });
});

test("supervision statuses and page labels are derived from heartbeats", () => {
  const now = Date.parse("2026-09-10T10:00:00Z");
  const at = (seconds) => new Date(now - seconds * 1000).toISOString();
  assert.equal(sessionStatus({ visible: true, lastSeenAt: at(30), endedAt: null }, now), "online");
  assert.equal(sessionStatus({ visible: false, lastSeenAt: at(30), endedAt: null }, now), "idle");
  assert.equal(sessionStatus({ visible: true, lastSeenAt: at(600), endedAt: null }, now), "idle");
  assert.equal(sessionStatus({ visible: true, lastSeenAt: at(3600), endedAt: null }, now), "offline");
  assert.equal(sessionStatus({ visible: true, lastSeenAt: at(5), endedAt: at(1) }, now), "offline");
  assert.equal(pageLabel("/mentor"), "Mentor IA");
  assert.equal(pageLabel("/courses/bases-cyber", new Map([["bases-cyber", "Les bases de la cybersécurité"]])), "Cours · Les bases de la cybersécurité");
  assert.equal(pageLabel("/lessons/abc"), "Leçon · abc");
  assert.equal(pageLabel("/inconnu/abc"), "/inconnu/abc");
  assert.equal(pageLabel(null), "Page inconnue");
});

test("startup animation re-registers dismissal during Strict Mode effect replay", () => {
  const filename = path.join(root, "components", "layout", "StartupAnimation.tsx");
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const effects = [];
  const visibility = [];
  const timers = new Map();
  const storage = new Map();
  const media = { matches: false, addEventListener() {}, removeEventListener() {} };
  const react = { useEffect: (effect) => effects.push(effect), useRef: (value) => ({ current: value }), useState: (value) => [value, (next) => visibility.push(next)] };
  const module = { exports: {} };
  const localRequire = (name) => name === "react" ? react : name === "react/jsx-runtime" ? { jsx() {}, jsxs() {} } : {};
  global.window = { matchMedia: () => media, setTimeout: (callback) => { const id = Symbol(); timers.set(id, callback); return id; }, clearTimeout: (id) => timers.delete(id), addEventListener() {}, removeEventListener() {} };
  global.sessionStorage = { getItem: (key) => storage.get(key), setItem: (key, value) => storage.set(key, value) };
  try {
    vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(localRequire, module, module.exports);
    module.exports.default();
    const cleanup = effects[0]();
    assert.equal(timers.size, 1);
    cleanup();
    assert.equal(timers.size, 0);
    const replayCleanup = effects[0]();
    assert.equal(timers.size, 1);
    [...timers.values()][0]();
    assert.deepEqual(visibility, [true, true, false]);
    replayCleanup();
  } finally { delete global.window; delete global.sessionStorage; }
});
