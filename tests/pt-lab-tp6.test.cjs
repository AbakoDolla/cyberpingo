const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildPtAssetsTp6 } = require("../scripts/lab-scenarios-pt-tp6.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR
  ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);

function scenario() {
  const generated = buildPtAssetsTp6();
  const { buildPtLabTp6 } = load("supabase/seed/content/pt-lab-tp6");
  const labs = buildPtLabTp6(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function parseJournal(raw) {
  return raw.trim().split("\n").map((line) => {
    const parts = line.split(" | ");
    assert.equal(parts.length, 7, `ligne journal invalide: ${line}`);
    const [id, time, author, action, target, proof, comment] = parts;
    return { id, time, author, action, target, proof, comment };
  });
}

function parseRules(raw) {
  const windowMatch = /08:00:00Z à 18:30:00Z/u.exec(raw);
  assert.ok(windowMatch, "fenetre introuvable");
  const notificationLine = raw.split("\n").find((line) => line.includes("Toute action « creation-compte-test »"));
  const requiredActions = [...notificationLine.matchAll(/« ([^»]+) »/gu)].map((match) => match[1]);
  const forbiddenLine = raw.split("\n").find((line) => line.includes("L’action « export-integral-donnees »"));
  const forbiddenActions = [...forbiddenLine.matchAll(/« ([^»]+) »/gu)].map((match) => match[1]);
  const maxAccounts = Number(/Au plus (\d+) comptes/u.exec(raw)[1]);
  const exceptionId = /exception=(RE-\d+)/u.exec(raw)[1];
  return { start: "08:00:00", end: "18:30:00", requiredActions, forbiddenActions, maxAccounts, exceptionId };
}

function parseArtefacts(raw) {
  const [header, ...rows] = raw.trim().split("\n");
  assert.equal(header, "identifiant;artefact;emplacement;doit_etre_supprime;statut;justification");
  return rows.map((row) => {
    const [identifiant, artefact, emplacement, doitEtreSupprime, statut, justification] = row.split(";");
    return { identifiant, artefact, emplacement, doitEtreSupprime, statut, justification };
  });
}

function parseCommentValue(comment, key) {
  const match = new RegExp(`${key}=([^ ;]+)`, "u").exec(comment);
  return match ? match[1] : null;
}

function significantAnswers(task) {
  return task.accepted.filter((answer) => {
    const normalized = normalize(answer);
    if (normalized.length < 3) return false;
    if (ignoredAnswers.has(normalized)) return false;
    if (/^[a-z]$/u.test(normalized)) return false;
    return true;
  });
}

function containsAnswer(text, answer) {
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "u").test(text);
}

function isInsufficientProof(proof) {
  return !proof.includes("UTC=") || !proof.includes("cible=") || (proof.includes("capture=") && !proof.includes("commande="));
}

function codeBlocks(markdown) {
  return [...markdown.matchAll(/```(bash|powershell)\n([\s\S]*?)```/gu)].map((match) => ({ language: match[1], code: match[2].trim() }));
}

function runGuideBlock(dir, block) {
  if (block.language === "bash") {
    const script = path.join(dir, "guide-block.sh");
    fs.writeFileSync(script, `set -euo pipefail\ncd "${dir.replace(/\\/g, "/")}"\n${block.code}\n`);
    return spawnSync(bashPath, [script], { cwd: dir, encoding: "utf8", timeout: 60000 });
  }
  const script = path.join(dir, "guide-block.ps1");
  fs.writeFileSync(script, `Set-StrictMode -Version Latest\n$ErrorActionPreference = "Stop"\nSet-Location "${dir.replace(/\\/g, "\\\\")}"\n${block.code}\n`);
  return spawnSync(powershellPath, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], { cwd: dir, encoding: "utf8", timeout: 60000 });
}

function maskCount(filePath) {
  const result = spawnSync("node", ["-e", "const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');console.log((s.match(/\\*{6}/g)||[]).length)", filePath], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout.trim(), /^\d+$/u, `sortie non numerique pour ${filePath}`);
  return Number(result.stdout.trim());
}

function pickLetter(prompt, snippet) {
  const tail = prompt.split("Réponds par une lettre. ")[1];
  assert.ok(tail, "options introuvables dans le prompt");
  const options = [...tail.matchAll(/([a-d])\)\s([\s\S]*?)(?=\s[a-d]\)\s|$)/gu)].map((match) => ({ letter: match[1].toLowerCase(), text: match[2].trim() }));
  const found = options.find((option) => option.text.includes(snippet));
  assert.ok(found, `option introuvable: ${snippet}`);
  return found.letter;
}

test("TP6 generator and lab definition stay coherent", () => {
  const current = scenario();
  const { labs, files, text } = current;
  assert.equal(labs.length, 1);
  const lab = labs[0];
  assert.equal(lab.slug, "tp-pt-mission");
  assert.equal(lab.tasks.length, 15);
  assert.deepEqual([...files.keys()].sort(), [
    "pt-tp6-artefacts-a-nettoyer.csv",
    "pt-tp6-guide.md",
    "pt-tp6-journal-mission.log",
    "pt-tp6-modele-cloture.md",
    "pt-tp6-regles-engagement.md",
  ]);
  assert.deepEqual(labIssues(lab), []);
  for (const asset of lab.assets) assert.ok(files.has(path.posix.basename(asset.url)), `asset declare manquant: ${asset.url}`);
  assert.equal(text("pt-tp6-journal-mission.log").split("\n").length >= 140, true);
  assert.equal(text("pt-tp6-journal-mission.log").split("\n").length <= 220, true);
  assert.equal(text("pt-tp6-regles-engagement.md").split("\n").length >= 70, true);
  assert.equal(text("pt-tp6-regles-engagement.md").split("\n").length <= 100, true);
  assert.equal(text("pt-tp6-artefacts-a-nettoyer.csv").split("\n").length >= 20, true);
  assert.equal(text("pt-tp6-artefacts-a-nettoyer.csv").split("\n").length <= 35, true);
  assert.equal(text("pt-tp6-modele-cloture.md").split("\n").length >= 45, true);
  assert.equal(text("pt-tp6-modele-cloture.md").split("\n").length <= 70, true);
  assert.equal(text("pt-tp6-guide.md").split("\n").length >= 80, true);
  assert.equal(text("pt-tp6-guide.md").split("\n").length <= 120, true);
});

test("TP6 files are deterministic, clean and free of masked-secret placeholders", () => {
  const first = buildPtAssetsTp6();
  const second = buildPtAssetsTp6();
  assert.deepEqual(first, second);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pt-tp6-mask-"));
  try {
    for (const file of first.files.map((entry) => ({ name: entry.name, data: entry.data.toString("utf8") }))) {
      assert.notEqual(file.data.charCodeAt(0), 0xfeff, `${file.name} : pas de BOM`);
      assert.equal(file.data.includes("\r"), false, `${file.name} : pas de CRLF`);
      for (let index = 0; index < file.data.length; index += 1) {
        const code = file.data.charCodeAt(index);
        if (code < 32 && code !== 10) assert.fail(`${file.name} contient un caractere de controle interdit U+${code.toString(16).padStart(4, "0")}`);
      }
      const target = path.join(tempDir, file.name);
      fs.writeFileSync(target, file.data, "utf8");
      assert.equal(maskCount(target), 0, `${file.name} contient une sequence masquee`);
    }
    for (const source of [
      path.join(process.cwd(), "scripts", "lab-scenarios-pt-tp6.cjs"),
      path.join(process.cwd(), "supabase", "seed", "content", "pt-lab-tp6.ts"),
      path.join(process.cwd(), "tests", "pt-lab-tp6.test.cjs"),
    ]) assert.equal(maskCount(source), 0, `${path.basename(source)} contient une sequence masquee`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("TP6 answers are recalculated independently from generated files", () => {
  const current = scenario();
  const lab = current.labs[0];
  const journal = parseJournal(current.text("pt-tp6-journal-mission.log"));
  const rules = parseRules(current.text("pt-tp6-regles-engagement.md"));
  const artefacts = parseArtefacts(current.text("pt-tp6-artefacts-a-nettoyer.csv"));

  const breaches = [];
  const active = new Set();
  const ordered = journal.slice().sort((a, b) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id));
  for (const entry of ordered) {
    let breach = false;
    const hhmmss = entry.time.slice(11, 19);
    if (hhmmss < rules.start || hhmmss > rules.end) breach = true;
    if (rules.forbiddenActions.includes(entry.action)) breach = true;
    if (rules.requiredActions.includes(entry.action)) {
      const notification = parseCommentValue(entry.comment, "notification");
      if (!notification || notification === "absente") breach = true;
    }
    if (entry.action === "creation-compte-test") {
      const account = parseCommentValue(entry.comment, "compte");
      if (account) active.add(account);
      if (active.size > rules.maxAccounts) breach = true;
    }
    if (entry.action === "suppression-compte-test") {
      const account = parseCommentValue(entry.comment, "compte");
      if (account) active.delete(account);
    }
    if (breach) breaches.push(entry);
  }

  const insufficient = ordered.filter((entry) => isInsufficientProof(entry.proof));
  const deleteBeforeClose = artefacts.filter((entry) => entry.doitEtreSupprime === "oui");
  const forgotten = artefacts.find((entry) => entry.statut === "oublie");
  const revoke = artefacts.find((entry) => entry.artefact === "token-demo-0012");
  const retained = ordered.find((entry) => {
    const notification = parseCommentValue(entry.comment, "notification");
    return entry.comment.includes(`exception=${rules.exceptionId}`) && notification && notification !== "absente" && /retrait-prevu=\d{4}-\d{2}-\d{2}/u.test(entry.comment);
  });
  const dates = ordered.map((entry) => entry.time.slice(0, 10)).sort();
  const coveredDays = String(Math.round((Date.parse(`${dates.at(-1)}T00:00:00Z`) - Date.parse(`${dates[0]}T00:00:00Z`)) / 86400000) + 1);

  const task13 = pickLetter(lab.tasks[12].prompt, "La preuve ne contient pas l’horodatage ou la cible exigés");
  const task14 = pickLetter(lab.tasks[13].prompt, "Une exception autorisée à suivre jusqu’au retrait prévu.");
  const task15 = pickLetter(lab.tasks[14].prompt, "Le nom de l’artefact, son emplacement, sa justification, son responsable et sa date prévue de retrait.");

  const expected = [
    breaches[0].time.slice(11, 19),
    String(breaches.length),
    breaches.find((entry) => entry.comment.includes("notification=absente")).id,
    breaches.find((entry) => {
      const hhmmss = entry.time.slice(11, 19);
      return hhmmss < rules.start || hhmmss > rules.end;
    }).id,
    String(insufficient.length),
    insufficient[0].id,
    String(deleteBeforeClose.length),
    forgotten.identifiant,
    revoke.emplacement,
    retained.id,
    "artefacts restants pour re-test",
    coveredDays,
    task13,
    task14,
    task15,
  ];

  expected.forEach((answer, index) => {
    assert.ok(lab.tasks[index].accepted.includes(normalize(answer)), `reponse absente pour la tache ${index + 1}: ${answer}`);
  });
});

test("TP6 support documents and tasks do not leak answers outside the intentional template title", () => {
  const current = scenario();
  const lab = current.labs[0];
  const docs = {
    guide: normalize(current.text("pt-tp6-guide.md")),
    rules: normalize(current.text("pt-tp6-regles-engagement.md")),
    closure: normalize(current.text("pt-tp6-modele-cloture.md")),
  };
  const support = normalize([lab.briefing, ...lab.objectives, ...lab.constraints, ...lab.hints].join("\n"));

  lab.tasks.forEach((task, index) => {
    for (const answer of significantAnswers(task)) {
      assert.equal(containsAnswer(normalize(`${task.prompt}\n${task.hint}`), answer), false, `fuite directe dans la tache ${index + 1}`);
      assert.equal(containsAnswer(docs.guide, answer), false, `fuite dans le guide pour la tache ${index + 1}`);
      assert.equal(containsAnswer(docs.rules, answer), false, `fuite dans les regles pour la tache ${index + 1}`);
      if (index !== 10) assert.equal(containsAnswer(docs.closure, answer), false, `fuite dans le modele de cloture pour la tache ${index + 1}`);
      assert.equal(containsAnswer(support, answer), false, `fuite dans le support pour la tache ${index + 1}`);
      lab.tasks.forEach((other, otherIndex) => {
        if (otherIndex === index) return;
        if (index === 10 && otherIndex === 14) return;
        assert.equal(containsAnswer(normalize(`${other.prompt}\n${other.hint}`), answer), false, `fuite entre taches ${index + 1} et ${otherIndex + 1}`);
      });
    }
  });
});

test("TP6 guide commands run and print something", {
  skip: !fs.existsSync(bashPath) || !fs.existsSync(powershellPath) ? "Git Bash ou PowerShell absent" : false,
}, () => {
  const current = scenario();
  const blocks = codeBlocks(current.text("pt-tp6-guide.md"));
  assert.ok(blocks.length >= 4, "blocs de guide manquants");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pt-tp6-guide-"));
  try {
    for (const block of blocks) {
      const result = runGuideBlock(dir, block);
      assert.equal(result.status, 0, `${block.language}\n${result.stderr}\n${result.stdout}`);
      assert.notEqual(normalize(`${result.stdout}\n${result.stderr}`), "", `sortie vide pour ${block.language}`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
