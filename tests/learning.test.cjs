const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Compile the TypeScript modules in memory with the project's compiler.
const root = path.resolve(__dirname, "..");
const cache = new Map();
function load(file) {
  const filename = path.resolve(root, `${file}.ts`);
  if (cache.has(filename)) return cache.get(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const localRequire = (specifier) => {
    if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
    const target = specifier.startsWith("@/") ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
    return load(path.relative(root, target));
  };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

const { courses } = load("data/courses");
const { lessons } = load("data/lessons");
const { quizzes } = load("data/quizzes");
const { currentUser } = load("data/users");
const { resetUserProgress, computeSkills, computeLevel, safeReturnPath, dailyGoals } = load("lib/learning-progress");
const { buildUser, effectiveStreak, friendlyError } = load("lib/learner-mapping");
const { normalizePublishedCourse, normalizePublishedChallenge, slugify } = load("lib/publishing");
const { passwordProblem } = load("lib/auth-client");
const { sessionStatus } = load("types/realtime");
const { pageLabel, courseTitle } = load("lib/page-labels");

test("six complete courses, seventeen lessons and twelve linked quizzes", () => {
  assert.equal(courses.length, 6);
  assert.equal(lessons.length, 17);
  assert.equal(quizzes.length, 12);
  for (const collection of [courses, lessons, quizzes]) assert.equal(new Set(collection.map((item) => item.id)).size, collection.length);
  for (const course of courses) {
    assert.equal(course.locked, false);
    assert.equal(course.lessonCount, course.lessons.length);
    assert.equal(course.durationMinutes, course.lessons.reduce((sum, lesson) => sum + lesson.durationMinutes, 0));
    assert.deepEqual(course.lessons.map((lesson) => lesson.order).sort((a, b) => a - b), course.lessons.map((_, index) => index + 1));
  }
  for (const lesson of lessons) {
    assert.ok(courses.some((course) => course.id === lesson.courseId && course.lessons.includes(lesson)));
    if (lesson.quizId) assert.ok(quizzes.some((quiz) => quiz.id === lesson.quizId && quiz.lessonId === lesson.id));
  }
  for (const quiz of quizzes) {
    assert.ok(lessons.some((lesson) => lesson.id === quiz.lessonId && lesson.quizId === quiz.id));
    assert.ok(quiz.questions.length >= 2);
    for (const question of quiz.questions) assert.ok(question.options.includes(question.correctAnswer) && question.explanation);
  }
});

test("reset retains identity and preferences without administrative escalation", () => {
  const user = { ...currentUser, id: "learner", name: "Pingo", email: "pingo@example.test", isAdmin: false, dailyMinutes: 30, xp: 990, completedLessons: ["web-https"] };
  const reset = resetUserProgress(user);
  for (const field of ["id", "name", "email", "isAdmin", "dailyMinutes", "goal"]) assert.equal(reset[field], user[field]);
  assert.equal(reset.xp, 0);
  assert.deepEqual(reset.quizResults, {});
  assert.deepEqual(reset.completedLessons, []);
  assert.ok(reset.badges.every((badge) => !badge.earned));
});

test("level thresholds and skills reflect actual curriculum", () => {
  assert.deepEqual(computeLevel(0), { level: 1, xpToNextLevel: 800, levelXp: 0 });
  assert.deepEqual(computeLevel(800), { level: 2, xpToNextLevel: 960, levelXp: 0 });
  assert.equal(computeLevel(1760).level, 3);
  const skills = computeSkills(courses.find((course) => course.id === "c6").lessons.map((lesson) => lesson.id));
  assert.equal(skills.find((skill) => skill.name === "Détection").percent, 100);
  assert.equal(skills.find((skill) => skill.name === "Réseaux").percent, 0);
});

test("return paths stay in the learner app and respect admin restrictions", () => {
  for (const next of ["https://example.test", "//example.test", "/\\example.test", "javascript:alert(1)", "/dashboard", "/courses/../../dashboard", "/login", ""]) assert.equal(safeReturnPath(next, false), "/courses");
  assert.equal(safeReturnPath(null, true), "/dashboard");
  assert.equal(safeReturnPath("/quiz/quiz-web-https", false), "/quiz/quiz-web-https");
  assert.equal(safeReturnPath("/parametres", false), "/parametres");
  assert.equal(safeReturnPath("/onboarding", false), "/onboarding");
  assert.equal(safeReturnPath("/dashboard", true), "/dashboard");
  assert.ok([10, 20, 30, 60, 90].every((minutes) => dailyGoals.includes(minutes)));
});

test("streaks survive until the end of the next UTC day only", () => {
  const now = new Date("2026-09-10T08:00:00Z");
  assert.equal(effectiveStreak(4, "2026-09-10", now), 4);
  assert.equal(effectiveStreak(4, "2026-09-09", now), 4);
  assert.equal(effectiveStreak(4, "2026-09-08", now), 0);
  assert.equal(effectiveStreak(4, null, now), 0);
});

test("database snapshots map to the learner model used by the interface", () => {
  const snapshot = {
    profile: {
      id: "11111111-1111-1111-1111-111111111111", email: "pingo@example.test", display_name: "Pingo", username: "pingo",
      role: "admin", goal: "professionnel", skill_level: "intermediaire", daily_minutes: 30, known_areas: ["reseau"],
      onboarding_completed: true, xp: 900, streak: 3, last_activity_date: "2026-09-10", created_at: "2026-09-01T10:00:00Z", updated_at: "2026-09-10T10:00:00Z",
    },
    lessons: [{ lesson_id: "l1", course_id: "c1", xp_earned: 50, completed_at: "2026-09-10T09:00:00Z" }],
    quizzes: [
      { quiz_id: "q-pass", best_score: 3, total_questions: 3, earned_xp: 80, passed: true, attempts: 1, best_at: "2026-09-10T09:00:00Z", last_attempt_at: "2026-09-10T09:00:00Z" },
      { quiz_id: "q-fail", best_score: 1, total_questions: 3, earned_xp: 20, passed: false, attempts: 2, best_at: "2026-09-10T09:00:00Z", last_attempt_at: "2026-09-10T09:00:00Z" },
    ],
    challenges: [{ challenge_id: "ch1", xp_earned: 100, completed_at: "2026-09-10T09:00:00Z" }],
    badges: [{ badge_id: "b1", earned_at: "2026-09-10T09:00:00Z" }],
  };
  const user = buildUser(snapshot, new Date("2026-09-11T12:00:00Z"));
  assert.equal(user.isAdmin, true);
  assert.equal(user.level, 2);
  assert.equal(user.streak, 3);
  assert.equal(user.joinedAt, "2026-09-01");
  assert.deepEqual(user.completedLessons, ["l1"]);
  assert.deepEqual(user.completedChallenges, ["ch1"]);
  assert.equal(user.completedQuizzes, 1);
  assert.equal(user.quizResults["q-fail"].passed, false);
  assert.equal(user.badges.find((badge) => badge.id === "b1").earnedAt, "2026-09-10");
  assert.equal(buildUser({ ...snapshot, profile: { ...snapshot.profile, role: "learner" } }, new Date("2026-09-20T00:00:00Z")).streak, 0);
});

test("errors are translated without leaking database internals", () => {
  assert.equal(friendlyError({ message: "Trop de messages envoyés.", hint: "cyberpingo" }), "Trop de messages envoyés.");
  assert.equal(friendlyError({ message: "Invalid login credentials" }), "Adresse e-mail ou mot de passe incorrect.");
  assert.match(friendlyError({ message: "Email rate limit exceeded" }), /Trop de tentatives/);
  assert.match(friendlyError(new TypeError("Failed to fetch")), /Connexion au serveur impossible/);
  assert.equal(friendlyError({ message: "relation \"private.content_challenges\" does not exist" }, "Oups"), "Oups");
  assert.equal(friendlyError(null, "Oups"), "Oups");
});

test("passwords need eight characters with letters and digits", () => {
  assert.match(passwordProblem("court1"), /8 caractères/);
  assert.match(passwordProblem("seulementdeslettres"), /lettre et un chiffre/);
  assert.match(passwordProblem("12345678"), /lettre et un chiffre/);
  assert.equal(passwordProblem("pingouin42"), null);
});

test("published courses are namespaced, linked and idempotent", () => {
  const draft = {
    id: "c1",
    title: "Sécurité des réseaux Wi-Fi",
    level: "expert",
    lessons: [
      { id: "draft-a", title: "WPA3", blocks: [{ type: "text", content: "Contenu" }, { type: "script", content: "alert(1)" }], quizId: "quiz-a" },
      { id: "draft-b", title: "", blocks: [] },
    ],
    quizzes: [
      { id: "quiz-a", lessonId: "draft-a", questions: [
        { prompt: "WPA3 remplace ?", options: ["WPA2", "WEP"], correctAnswer: "WPA2", explanation: "Oui" },
        { prompt: "Invalide", options: ["A"], correctAnswer: "A" },
      ] },
      { id: "quiz-orphan", lessonId: "missing", questions: [{ prompt: "?", options: ["A", "B"], correctAnswer: "A" }] },
    ],
  };
  const course = normalizePublishedCourse(draft, { now: new Date("2026-09-10T00:00:00Z"), makeId: () => "pub-abc-1234" });
  assert.equal(course.id, "pub-abc-1234");
  assert.equal(course.slug, "securite-des-reseaux-wi-fi-abc-1234");
  assert.equal(course.level, "debutant");
  assert.deepEqual(course.lessons.map((lesson) => lesson.id), ["pub-abc-1234-l1", "pub-abc-1234-l2"]);
  assert.equal(course.lessons[0].blocks.length, 1);
  assert.equal(course.lessons[0].quizId, "pub-abc-1234-q1");
  assert.equal(course.lessons[1].title, "Leçon 2");
  assert.equal(course.quizzes.length, 1);
  assert.equal(course.quizzes[0].questions.length, 1);
  assert.deepEqual(normalizePublishedCourse(course, { makeId: () => "pub-other-0000" }), course);
  assert.throws(() => normalizePublishedCourse({ title: "Vide", lessons: [] }), /au moins une leçon/);
  assert.equal(slugify("Élévation de privilèges !"), "elevation-de-privileges");
});

test("published challenges fall back to safe values", () => {
  const challenge = normalizePublishedChallenge({ title: "  Trouve le port  ", category: "magie", xpReward: 99999, expectedAnswer: "  flag{22}  ", objectives: ["Scanner", "", 4] }, { makeId: () => "pub-chal-0001" });
  assert.equal(challenge.id, "pub-chal-0001");
  assert.equal(challenge.title, "Trouve le port");
  assert.equal(challenge.category, "securite");
  assert.equal(challenge.xpReward, 1000);
  assert.equal(challenge.expectedAnswer, "flag{22}");
  assert.deepEqual(challenge.objectives, ["Scanner"]);
  assert.equal(challenge.status, "disponible");
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
  assert.equal(pageLabel(`/courses/${courses[1].slug}`), `Cours · ${courses[1].title}`);
  assert.equal(pageLabel(`/lessons/${lessons[0].id}`), `Leçon · ${lessons[0].title}`);
  assert.equal(pageLabel(null), "Page inconnue");
  assert.equal(courseTitle("c1"), courses[0].title);
  assert.equal(courseTitle("pub-inconnu"), "pub-inconnu");
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
