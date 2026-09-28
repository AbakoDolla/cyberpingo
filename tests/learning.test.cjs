const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Compile the pure TypeScript modules in memory with the existing compiler.
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
const { recordQuiz, resetUserProgress, computeSkills, computeLevel, rewardProgress, migrateUser, profileKey, safeReturnPath, isStoredUser, dailyGoals } = load("lib/learning-progress");

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

test("quiz XP only rewards improvements and passing counts distinct quizzes", () => {
  let user = resetUserProgress(currentUser);
  const quiz = quizzes.find((item) => item.id === "quiz-web-https");
  let result = recordQuiz(user, quiz, 1);
  assert.equal(result.awarded, 30);
  assert.equal(result.user.completedQuizzes, 0);
  user = result.user;
  result = recordQuiz(user, quiz, 1);
  assert.equal(result.awarded, 0);
  assert.equal(result.user, user);
  result = recordQuiz(user, quiz, 2);
  assert.equal(result.awarded, 30);
  assert.equal(result.user.xp, 60);
  assert.equal(result.user.completedQuizzes, 1);
  assert.equal(recordQuiz(result.user, quiz, 0).user.quizResults[quiz.id].score, 2);
  assert.equal(recordQuiz(result.user, quiz, 2).awarded, 0);
  assert.throws(() => recordQuiz(user, quiz, -1));
  assert.throws(() => recordQuiz(user, quiz, 3));
  assert.throws(() => recordQuiz(user, { ...quiz, questions: [] }, 0));
});

test("passing threshold is precisely seventy percent", () => {
  const quiz = { ...quizzes[0], questions: Array(10).fill(quizzes[0].questions[0]) };
  const user = resetUserProgress(currentUser);
  assert.equal(recordQuiz(user, quiz, 6).user.completedQuizzes, 0);
  assert.equal(recordQuiz(user, quiz, 7).user.completedQuizzes, 1);
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
  assert.deepEqual(computeLevel(800), { level: 2, xpToNextLevel: 960, levelXp: 0 });
  assert.equal(computeLevel(1760).level, 3);
  const skills = computeSkills(courses.find((course) => course.id === "c6").lessons.map((lesson) => lesson.id));
  assert.equal(skills.find((skill) => skill.name === "Détection").percent, 100);
  assert.equal(skills.find((skill) => skill.name === "Réseaux").percent, 0);
});

test("streak advances once per UTC day and resets after a gap", () => {
  let user = resetUserProgress(currentUser);
  user = rewardProgress(user, 50, new Date("2026-09-01T10:00:00Z"));
  assert.equal(user.streak, 1);
  user = rewardProgress(user, 50, new Date("2026-09-01T11:00:00Z"));
  assert.equal(user.streak, 1);
  user = rewardProgress(user, 50, new Date("2026-09-02T10:00:00Z"));
  assert.equal(user.streak, 2);
  user = rewardProgress(user, 50, new Date("2026-09-04T10:00:00Z"));
  assert.equal(user.streak, 1);
});

test("legacy progress migrates without inventing historical quiz scores", () => {
  const { quizResults, ...legacy } = currentUser;
  const user = migrateUser({ ...legacy, completedQuizzes: 40 });
  assert.deepEqual(user.quizResults, {});
  assert.equal(user.completedQuizzes, 0);
  assert.ok(user.skills.length === 6);
  assert.notEqual(profileKey("user-a%40one.test"), profileKey("user-a%40two.test"));
});

test("return paths stay in the learner app and respect admin restrictions", () => {
  for (const next of ["https://example.test", "//example.test", "/\\example.test", "javascript:alert(1)", "/dashboard", "/courses/../../dashboard", "/login", ""]) assert.equal(safeReturnPath(next, false), "/courses");
  assert.equal(safeReturnPath("/quiz/quiz-web-https", false), "/quiz/quiz-web-https");
  assert.equal(safeReturnPath("/parametres", false), "/parametres");
  assert.equal(safeReturnPath("/dashboard", true), "/dashboard");
});

test("storage writes report failures instead of claiming success", () => {
  const { writeStorage, readStorage } = load("lib/storage");
  const entries = new Map();
  global.window = { localStorage: { setItem: (key, value) => entries.set(key, value), getItem: (key) => entries.get(key) } };
  assert.equal(writeStorage("profile", { id: 1 }), true);
  assert.deepEqual(readStorage("profile", null), { id: 1 });
  const errors = [];
  const originalError = console.error;
  console.error = (...message) => errors.push(message);
  try {
    window.localStorage.setItem = () => { throw new Error("Quota exceeded"); };
    assert.equal(writeStorage("profile", {}), false);
    entries.set("broken", "{");
    let reported = false;
    assert.equal(readStorage("broken", null, () => { reported = true; }), null);
    assert.equal(reported, true);
    assert.equal(errors.length, 2);
  } finally { console.error = originalError; delete global.window; }
});

test("stored profiles are checked before use and all onboarding goals remain editable", () => {
  assert.equal(isStoredUser(currentUser), true);
  assert.equal(isStoredUser({ ...currentUser, completedLessons: "not-an-array" }), false);
  assert.equal(isStoredUser({ ...currentUser, quizResults: { bad: { score: -1 } } }), false);
  assert.equal(isStoredUser(null), false);
  assert.equal(isStoredUser({ ...currentUser, name: 5 }), false);
  assert.ok([10, 20, 30, 60, 90].every((minutes) => dailyGoals.includes(minutes)));
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
