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

test("buildLessonVideoSpec and buildLabVideoSpec generate multi-chapter Cisco NetAcad video specs", () => {
  const video = load("lib/academy-video");
  const lessonSpec = video.buildLessonVideoSpec({
    lessonTitle: "Les 7 couches OSI et le modèle TCP/IP",
    videoTitle: "Le modèle OSI en 5 minutes",
    courseTitle: "Introduction aux Réseaux",
    moduleTitle: "Modèles de communication",
    level: "beginner",
    blocks: [
      { type: "callout", content: "Objectifs : nommer les 7 couches OSI ; associer une unité de données (PDU) à chaque couche." },
      { type: "callout", content: "Mise en situation : le PC d'Awa affiche cable branché mais pas d'accès internet." },
      {
        type: "schema",
        content: JSON.stringify({
          v: 1,
          kind: "layers",
          title: "Les 7 couches OSI",
          layers: [
            { label: "7. Application", text: "HTTP, DNS, TLS" },
            { label: "1. Physique", text: "Bits sur câble ou fibre" }
          ]
        })
      },
      { type: "text", content: "Chaque couche ajoute son en-tête avant d'envoyer les données vers la couche inférieure." },
      { type: "code", content: "$ ip addr\n2: eth0: <BROADCAST,MULTICAST,UP> state UP\n    inet 192.168.1.42/24" },
      { type: "callout", content: "Erreurs fréquentes : tester le DNS avant de vérifier le câble et l'adresse IP." },
      { type: "callout", content: "Sécurité : ne jamais exposer un équipement non chiffré sur le WAN." },
      { type: "callout", content: "À retenir : diagnostiquer de la couche 1 vers la couche 7 évite les fausses pistes." }
    ]
  });

  assert.equal(lessonSpec.mode, "lesson");
  assert.equal(lessonSpec.title, "Le modèle OSI en 5 minutes");
  assert.equal(lessonSpec.domain, "osi");
  assert.equal(lessonSpec.chapters.length, 6);
  assert.ok(lessonSpec.totalDurationSeconds >= 60);
  assert.equal(lessonSpec.chapters[1].figure.kind, "layers");
  assert.equal(lessonSpec.chapters[1].figure.title, "Les 7 couches OSI");
  assert.ok(lessonSpec.chapters[3].terminalSteps.length >= 1);

  const labSpec = video.buildLabVideoSpec({
    lab: {
      id: "lab-arp-1",
      title: "Inspection d'une capture ARP",
      category: "Network",
      difficulty: "easy",
      points: 100,
      estimatedMinutes: 15,
      summary: "Analyse une capture ARP pour repérer une passerelle usurpée.",
      briefing: "Un poste du réseau signale des coupures intermittentes vers la passerelle.",
      objectives: ["Identifier l'adresse IP de la passerelle", "Repérer deux adresses MAC différentes pour la même IP"],
      tools: ["Journal ARP fourni", "Table des hôtes"],
      constraints: ["Lecture seule des journaux fournis"],
      hints: [{ id: "h1", order: 1, costXp: 0, text: "Compare les annonces gratuites ARP." }]
    },
    assets: [{ id: "a1", title: "capture-arp.log", kind: "log", content: "192.168.1.1 is-at aa:bb:cc:dd:ee:01" }],
    tasks: [
      { id: "t1", order: 1, title: "IP passerelle", prompt: "Quelle est l'adresse IP de la passerelle ?", placeholder: "192.168.x.x", formatHint: "IPv4", points: 50 }
    ]
  });

  assert.equal(labSpec.mode, "lab");
  assert.equal(labSpec.chapters.length, 5);
  assert.ok(labSpec.chapters.every((ch) => ch.narration.length > 20));
});

