// Pingo must be a mentor, not noise: one voice at a time, important events win, and the line choice
// is weighted but never repeats. These rules are pure so they are tested without a browser.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("../scripts/ts-loader.cjs");

const { EVENT_PRIORITY, MASCOT_EVENTS, MASCOT_EXPRESSIONS, EXPRESSION_STATE, mascotEventsFromRewards, strongestEvent } = load("lib/mascot/events");
const { COOLDOWN_MS, IDLE_STATE, decide, pickLine, displayDuration } = load("lib/mascot/scheduler");
const { DEFAULT_PREFS, parsePrefs } = load("lib/mascot/prefs");

const line = (id, event, priority = 5) => ({ id, event, expression: "happy", text_fr: "x", audio_url: null, voice_credit: null, priority });
const rewards = (extra = {}) => ({ xp_gained: 10, leveled_up: false, new_badges: [], completed_challenges: [], course_completed: null, new_rank: null, new_skills: [], ...extra });

test("every event has a priority and every expression a mascot pose", () => {
  assert.equal(MASCOT_EVENTS.length, 13);
  for (const event of MASCOT_EVENTS) assert.ok(EVENT_PRIORITY[event] >= 1);
  assert.equal(MASCOT_EXPRESSIONS.length, 11);
  for (const expression of MASCOT_EXPRESSIONS) assert.ok(EXPRESSION_STATE[expression]);
});

test("a reward summary maps to milestone events, strongest first", () => {
  assert.deepEqual(mascotEventsFromRewards(rewards()), []);
  const all = mascotEventsFromRewards(rewards({
    new_rank: { slug: "r" }, course_completed: { title: "c" }, leveled_up: true,
    new_skills: [{ id: "s" }], new_badges: [{ id: "b" }], completed_challenges: [{ id: "d" }],
  }));
  assert.deepEqual(all, ["rank_up", "path_complete", "level_up", "new_skill", "badge", "challenge"]);
  assert.equal(strongestEvent(["badge", "level_up", "challenge"]), "level_up");
  assert.equal(strongestEvent([]), null);
});

test("an important event replaces the current one, a lesser one is dropped", () => {
  const talking = { activePriority: EVENT_PRIORITY.badge, activeUntil: 10_000, lastEnd: 0 };
  assert.equal(decide(talking, "level_up", 5_000), "replace");
  assert.equal(decide(talking, "exercise_success", 5_000), "drop");
  assert.equal(decide(talking, "badge", 5_000), "drop");
});

test("ordinary events respect the cooldown but milestones always get through", () => {
  const justEnded = { ...IDLE_STATE, lastEnd: 100_000 };
  assert.equal(decide(justEnded, "exercise_success", 100_000 + COOLDOWN_MS - 1), "drop");
  assert.equal(decide(justEnded, "exercise_success", 100_000 + COOLDOWN_MS), "show");
  assert.equal(decide(justEnded, "level_up", 100_001), "show");
  assert.equal(decide(IDLE_STATE, "welcome", 1_000_000), "show");
});

test("pickLine only returns lines of the event, never the previous one when another exists", () => {
  const lines = [line("a", "badge"), line("b", "badge"), line("c", "welcome")];
  assert.equal(pickLine(lines, "level_up", null), null);
  assert.equal(pickLine(lines, "welcome", null).id, "c");
  assert.equal(pickLine(lines, "welcome", "c").id, "c");
  for (let step = 0; step < 20; step += 1) assert.equal(pickLine(lines, "badge", "a", () => step / 20).id, "b");
});

test("pickLine is weighted by priority", () => {
  const lines = [line("low", "badge", 1), line("high", "badge", 9)];
  assert.equal(pickLine(lines, "badge", null, () => 0.05).id, "low");
  assert.equal(pickLine(lines, "badge", null, () => 0.5).id, "high");
  assert.equal(pickLine(lines, "badge", null, () => 0.999).id, "high");
});

test("display time scales with the text but stays bounded", () => {
  assert.equal(displayDuration("ok"), 4500);
  assert.equal(displayDuration("x".repeat(60)), 4500);
  assert.ok(displayDuration("x".repeat(100)) > 4500);
  assert.equal(displayDuration("x".repeat(500)), 9000);
});

test("preferences fall back to safe defaults on broken storage", () => {
  assert.deepEqual(parsePrefs(null), DEFAULT_PREFS);
  assert.deepEqual(parsePrefs("not json"), DEFAULT_PREFS);
  assert.equal(parsePrefs(JSON.stringify({ volume: 7 })).volume, 1);
  assert.equal(parsePrefs(JSON.stringify({ volume: -3 })).volume, 0);
  assert.equal(parsePrefs(JSON.stringify({ volume: "loud" })).volume, DEFAULT_PREFS.volume);
  assert.equal(parsePrefs(JSON.stringify({ auto: false })).auto, false);
  assert.equal(parsePrefs(JSON.stringify({ auto: "no" })).auto, true);
  assert.equal(DEFAULT_PREFS.auto && DEFAULT_PREFS.subtitles, true);
});