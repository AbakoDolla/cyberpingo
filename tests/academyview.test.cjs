const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("../scripts/ts-loader.cjs");

const view = load("lib/academy-view");

test("skill states map to the four steps of the meter", () => {
  assert.equal(view.skillStateStep("not_studied"), 0);
  assert.equal(view.skillStateStep("learning"), 1);
  assert.equal(view.skillStateStep("consolidating"), 2);
  assert.equal(view.skillStateStep("exercises_mastered"), 3);
  assert.equal(view.skillStateStep("validated"), view.SKILL_STATE_STEP_COUNT);
});

test("every skill state has a French label and a tone", () => {
  for (const state of ["not_studied", "learning", "consolidating", "exercises_mastered", "validated"]) {
    assert.ok(view.SKILL_STATE_LABELS[state].length > 3);
    assert.ok(["neutral", "blue", "purple", "green"].includes(view.skillStateTone(state)));
  }
  assert.equal(view.skillStateTone("validated"), "green");
});

test("requirement labels pluralise and fall back to the raw key", () => {
  assert.equal(view.requirementLabel("labs_solved", 1), "Résoudre 1 lab");
  assert.equal(view.requirementLabel("labs_solved", 3), "Résoudre 3 labs");
  assert.equal(view.requirementLabel("min_level", 8), "Atteindre le niveau 8");
  assert.equal(view.requirementLabel("courses_completed", 2), "Terminer 2 parcours");
  assert.equal(view.requirementLabel("something_new", 4), "something_new : 4");
});

test("rankProgress averages capped requirement ratios", () => {
  assert.equal(view.rankProgress([]), 100);
  assert.equal(view.rankProgress([{ key: "a", required: 4, current: 2 }]), 50);
  assert.equal(view.rankProgress([{ key: "a", required: 4, current: 9 }, { key: "b", required: 2, current: 0 }]), 50);
  assert.equal(view.rankProgress([{ key: "a", required: 0, current: 0 }]), 100);
});

test("linkHref routes lessons and quizzes by id and labs by slug", () => {
  assert.equal(view.linkHref({ kind: "lesson", id: "L1", title: "x", done: false }), "/lessons/L1");
  assert.equal(view.linkHref({ kind: "quiz", id: "Q1", title: "x", done: false }), "/quiz/Q1");
  assert.equal(view.linkHref({ kind: "practice", id: "B1", slug: "reseau-instable", title: "x", done: true }), "/challenges/reseau-instable");
  assert.equal(view.linkHref({ kind: "validation", id: "B2", title: "x", done: false }), null);
});

test("groupSkillsByDomain drops empty domains and keeps order", () => {
  const domains = [{ id: "d1" }, { id: "d2" }, { id: "d3" }];
  const skills = [{ id: "s1", domain_id: "d3" }, { id: "s2", domain_id: "d1" }, { id: "s3", domain_id: "d1" }];
  const groups = view.groupSkillsByDomain(domains, skills);
  assert.deepEqual(groups.map((g) => g.domain.id), ["d1", "d3"]);
  assert.deepEqual(groups[0].skills.map((s) => s.id), ["s2", "s3"]);
});

test("badgeCondition spells out the unlock rule", () => {
  assert.equal(view.badgeCondition({ criteria_type: "labs_solved", criteria_value: 1 }), "Résous 1 lab.");
  assert.equal(view.badgeCondition({ criteria_type: "lessons_completed", criteria_value: 5 }), "Termine 5 leçons.");
  assert.equal(view.badgeCondition({ criteria_type: "lab_completed", criteria_value: 1 }, { labTitle: "Réseau instable" }), "Réussis le laboratoire « Réseau instable ».");
  assert.equal(view.badgeCondition({ criteria_type: "lab_completed", criteria_value: 1 }), "Réussis le laboratoire associé.");
  assert.match(view.badgeCondition({ criteria_type: "skill_validated", criteria_value: 1 }, { skillName: "Adressage IPv4" }), /« Adressage IPv4 »/);
  assert.equal(view.badgeCondition({ criteria_type: "mystery", criteria_value: 1 }), "Continue ta progression pour le débloquer.");
});

test("rarities have French labels", () => {
  assert.deepEqual(Object.keys(view.RARITY_LABELS), ["common", "rare", "epic", "legendary"]);
  assert.equal(view.RARITY_LABELS.legendary, "Légendaire");
});

test("pendingVideoTitle recognises the video placeholder callout", () => {
  const lesson = load("lib/lesson-content");
  assert.equal(lesson.pendingVideoTitle("Vidéo à venir : Le modèle OSI en 5 minutes"), "Le modèle OSI en 5 minutes");
  assert.equal(lesson.pendingVideoTitle("Vidéo à venir :"), null);
  assert.equal(lesson.pendingVideoTitle("À retenir : une adresse IP identifie une interface."), null);
});
test("parseCallout labels a callout from its first words and keeps the rest as the body", () => {
  const { parseCallout } = load("lib/lesson-content");
  assert.deepEqual(parseCallout("Objectifs : lire une adresse, calculer un masque."), { kind: "objectives", label: "Objectifs d’apprentissage", body: "Lire une adresse, calculer un masque." });
  assert.equal(parseCallout("Prérequis : aucun.").kind, "prerequisites");
  assert.equal(parseCallout("Mise en situation : Awa ouvre un atelier.").kind, "scenario");
  assert.equal(parseCallout("Erreurs fréquentes : confondre LAN et WAN.").kind, "mistakes");
  assert.equal(parseCallout("Sécurité : change le mot de passe par défaut.").label, "Sécurité et limites");
  assert.equal(parseCallout("Pour pratiquer : ouvre le TP 1.").kind, "practice");
  assert.deepEqual(parseCallout("À retenir : un masque sépare réseau et hôte."), { kind: "takeaway", label: "À retenir", body: "Un masque sépare réseau et hôte." });
  assert.deepEqual(parseCallout("Packet Tracer s’exécute sur ton ordinateur."), { kind: "note", label: "À retenir", body: "Packet Tracer s’exécute sur ton ordinateur." });
  assert.equal(parseCallout("Objectifs :").body, "Objectifs :");
});
