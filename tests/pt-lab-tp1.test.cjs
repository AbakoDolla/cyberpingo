const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildPtAssetsTp1 } = require("../scripts/lab-scenarios-pt-tp1.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR
  ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const compact = (values) => Array.from(new Set(values.map(normalize)));
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);

function scenario() {
  const generated = buildPtAssetsTp1();
  const { buildPtLabTp1 } = load("supabase/seed/content/pt-lab-tp1");
  const labs = buildPtLabTp1(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function parseCsv(raw) {
  const [header, ...rows] = raw.trim().split("\n");
  const columns = header.split(",");
  return rows.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(columns.map((column, index) => [column, values[index]]));
  });
}

function section(text, title, nextTitle) {
  const headings = [...text.matchAll(/^## (.+)$/gmu)];
  const fold = (value) => String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[’']/gu, " ")
    .replace(/[^a-z0-9]+/gu, " ")
    .toLowerCase()
    .trim();
  const start = headings.findIndex((match) => fold(match[1]) === fold(title));
  assert.ok(start >= 0, `section introuvable: ${title}`);
  const end = headings.findIndex((match, index) => index > start && fold(match[1]) === fold(nextTitle));
  assert.ok(end >= 0, `section suivante introuvable: ${nextTitle}`);
  const bodyStart = headings[start].index + headings[start][0].length;
  const bodyEnd = headings[end].index;
  return text.slice(bodyStart, bodyEnd).trim();
}

function ipToInt(value) {
  return String(value).split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function cidrRange(cidr) {
  const [ip, prefixText] = String(cidr).split("/");
  const prefix = Number(prefixText);
  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  const start = (ipToInt(ip) & mask) >>> 0;
  return { start, end: (start + 2 ** (32 - prefix) - 1) >>> 0 };
}

function isIp(value) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(String(value));
}

function isCidr(value) {
  return /^\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}$/u.test(String(value));
}

function blockContains(block, ip) {
  if (!isIp(ip)) return false;
  const { start, end } = cidrRange(block);
  const numeric = ipToInt(ip);
  return numeric >= start && numeric <= end;
}

function cidrContained(inner, outer) {
  const a = cidrRange(inner);
  const b = cidrRange(outer);
  return a.start >= b.start && a.end <= b.end;
}

function significantAnswers(task) {
  return task.accepted.filter((answer) => {
    const value = normalize(answer);
    if (value.length < 3) return false;
    if (ignoredAnswers.has(value)) return false;
    if (/^[a-z]$/u.test(value)) return false;
    return true;
  });
}

function containsAnswer(text, answer) {
  const escaped = answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "u").test(text);
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

function parsePolicy(letter, roe) {
  const perimeter = section(letter, "4. Périmètre explicitement confié", "5. Cibles hors périmètre par principe");
  const accounts = section(letter, "6. Comptes de test fournis au départ", "7. Données sensibles et preuves");
  const contacts = section(roe, "7. Contacts et escalade", "8. Conditions d’arrêt");
  const never = section(roe, "3. Actions jamais autorisées", "4. Actions autorisées dans la limite du périmètre");
  const auth = section(roe, "5. Comptes de test et actions authentifiées", "6. Clarifications juridiques et métier");

  const allowedDomains = [...perimeter.matchAll(/^  - ([a-z0-9.-]+)$/gmu)].map((match) => match[1]);
  const lightScanBlock = /Bloc public autorisé pour les scans l[eé]gers : ([0-9./]+)/u.exec(perimeter)[1];
  const missionStart = /D[eé]but des activit[eé]s autorisées : (\d{4}-\d{2}-\d{2})/u.exec(letter)[1];
  const stopTime = /Heure limite d[’' ]?arr[eê]t quotidien : (\d{2}:\d{2})Z/u.exec(roe)[1];
  const maxIntensity = /L[’' ]?intensité maximale autorisée pour un scan l[eé]ger est ([a-z]+)/u.exec(roe)[1];
  const providedAccounts = Object.fromEntries([...accounts.matchAll(/^  - ([a-z0-9.-]+) -> ([a-z0-9-]+)$/gmu)].map((match) => [match[1], match[2]]));
  const neverFamilies = [...never.matchAll(/^- ([a-z_]+)$/gmu)].map((match) => match[1]);
  const emergencyContact = /Contact technique d[’' ]?urgence : ([^\n]+)/u.exec(contacts)[1];
  const legalContact = /Contact juridique : ([^\n]+?) -/u.exec(contacts)[1];
  const credentialTypes = compact(["application_auth", "vpn"]);
  const intensityOrder = { basse: 1, moyenne: 2, forte: 3 };

  return { allowedDomains, lightScanBlock, missionStart, stopTime, maxIntensity, providedAccounts, neverFamilies, emergencyContact, legalContact, credentialTypes, intensityOrder };
}

function targetStatus(target, policy) {
  if (target.doute === "yes") return "clarify";
  if (isIp(target.cible) || isCidr(target.cible)) {
    if (isIp(target.cible)) return blockContains(policy.lightScanBlock, target.cible) ? "in" : "out";
    return cidrContained(target.cible, policy.lightScanBlock) ? "in" : "out";
  }
  if (policy.allowedDomains.includes(target.cible)) return blockContains(policy.lightScanBlock, target.ip_observee) ? "in" : "out";
  if (target.cible.endsWith(".sahel-vert.example")) return "clarify";
  return "out";
}

function actionStatus(action, targetsById, policy) {
  const target = targetsById.get(action.cible_id);
  const status = targetStatus(target, policy);
  if (status === "out") return "forbidden";
  if (policy.neverFamilies.includes(action.famille)) return "forbidden";
  if (policy.intensityOrder[action.intensite] > policy.intensityOrder[policy.maxIntensity]) return "forbidden";
  if (action.horaire_utc < "08:30" || action.horaire_utc > policy.stopTime) return "forbidden";
  if (status === "clarify") return "clarify";
  if (action.validation_requise === policy.legalContact) return "clarify";
  if (policy.credentialTypes.includes(normalize(target.type)) && !policy.providedAccounts[target.cible] && action.famille !== "passive") return "clarify";
  return "allowed";
}

test("TP1 generator and lab definition stay coherent", () => {
  const current = scenario();
  const { labs, files, text } = current;
  assert.equal(labs.length, 1);
  const lab = labs[0];
  assert.equal(lab.slug, "tp-pt-cadrage");
  assert.equal(lab.tasks.length, 15);
  assert.deepEqual([...files.keys()].sort(), [
    "pt-tp1-actions-proposees.csv",
    "pt-tp1-cibles-decouvertes.csv",
    "pt-tp1-guide.md",
    "pt-tp1-lettre-mission.md",
    "pt-tp1-regles-engagement.md",
  ]);
  assert.deepEqual(labIssues(lab), []);
  for (const asset of lab.assets) assert.ok(files.has(path.posix.basename(asset.url)), `asset declare manquant: ${asset.url}`);
  assert.equal(text("pt-tp1-lettre-mission.md").split("\n").length >= 90, true);
  assert.equal(text("pt-tp1-lettre-mission.md").split("\n").length <= 130, true);
  assert.equal(text("pt-tp1-regles-engagement.md").split("\n").length >= 80, true);
  assert.equal(text("pt-tp1-regles-engagement.md").split("\n").length <= 110, true);
  assert.equal(text("pt-tp1-cibles-decouvertes.csv").split("\n").length >= 28, true);
  assert.equal(text("pt-tp1-cibles-decouvertes.csv").split("\n").length <= 40, true);
  assert.equal(text("pt-tp1-actions-proposees.csv").split("\n").length >= 30, true);
  assert.equal(text("pt-tp1-actions-proposees.csv").split("\n").length <= 45, true);
  assert.equal(text("pt-tp1-guide.md").split("\n").length >= 70, true);
  assert.equal(text("pt-tp1-guide.md").split("\n").length <= 100, true);
  const legalCorpus = `${text("pt-tp1-lettre-mission.md")}\n${text("pt-tp1-regles-engagement.md")}`;
  assert.equal(/article\s+[0-9a-z.-]+/iu.test(legalCorpus), false, "pas de citation d'article de loi réel");
  assert.equal(/\b(?:amende|emprisonnement|peine)\b/iu.test(legalCorpus), false, "pas de quantum de peine réel");
});

test("TP1 files are deterministic and clean", () => {
  const first = buildPtAssetsTp1();
  const second = buildPtAssetsTp1();
  assert.deepEqual(first, second);
  for (const file of first.files.map((entry) => ({ name: entry.name, data: entry.data.toString("utf8") }))) {
    assert.equal((file.data.match(/\*{6}/g) || []).length, 0, `${file.name} contient une sequence masquee`);
    assert.notEqual(file.data.charCodeAt(0), 0xfeff, `${file.name} : pas de BOM`);
    assert.equal(file.data.includes("\r"), false, `${file.name} : pas de CRLF`);
    for (let index = 0; index < file.data.length; index += 1) {
      const code = file.data.charCodeAt(index);
      if (code < 32 && code !== 10) assert.fail(`${file.name} contient un caractere de controle interdit U+${code.toString(16).padStart(4, "0")}`);
    }
  }
  for (const source of [
    path.join(process.cwd(), "scripts", "lab-scenarios-pt-tp1.cjs"),
    path.join(process.cwd(), "supabase", "seed", "content", "pt-lab-tp1.ts"),
    path.join(process.cwd(), "tests", "pt-lab-tp1.test.cjs"),
  ]) {
    const data = fs.readFileSync(source, "utf8");
    assert.equal((data.match(/\*{6}/g) || []).length, 0, `${path.basename(source)} contient une sequence masquee`);
  }
});

test("TP1 answers are recalculated independently from the generated files", () => {
  const current = scenario();
  const lab = current.labs[0];
  const targets = parseCsv(current.text("pt-tp1-cibles-decouvertes.csv"));
  const actions = parseCsv(current.text("pt-tp1-actions-proposees.csv"));
  const policy = parsePolicy(current.text("pt-tp1-lettre-mission.md"), current.text("pt-tp1-regles-engagement.md"));
  const targetsById = new Map(targets.map((target) => [target.id, target]));
  const statuses = targets.map((target) => ({ target, status: targetStatus(target, policy) }));
  const actionStatuses = actions.map((action) => ({ action, status: actionStatus(action, targetsById, policy) }));

  const q1 = /a\) (?<a>.+?) b\) (?<b>.+?) c\) (?<c>.+?) d\) (?<d>.+)$/u.exec(lab.tasks[0].prompt).groups;
  const q1Answer = Object.entries(q1).find(([, value]) => {
    const asTarget = targets.find((target) => target.cible === value);
    return asTarget ? targetStatus(asTarget, policy) === "in" : blockContains(policy.lightScanBlock, value);
  })[0];
  assert.equal(statuses.filter((entry) => entry.status === "clarify").length, 1, "clarification cible non unique");
  assert.equal(statuses.filter((entry) => entry.status === "out" && policy.allowedDomains.includes(entry.target.cible)).length, 1, "sortie reseau non unique");
  assert.equal(actionStatuses.filter((entry) => entry.action.validation_requise === policy.legalContact).length, 1, "clarification juridique non unique");
  assert.equal(actionStatuses.filter((entry) => entry.action.intensite === "forte").length, 1, "depassement de charge non unique");
  assert.equal(actionStatuses.filter((entry) => entry.action.famille === "ingenierie_sociale" && targetStatus(targetsById.get(entry.action.cible_id), policy) === "in").length, 1, "ingenierie sociale en perimetre non unique");

  const q14 = /a\) (?<a>.+?) b\) (?<b>.+?) c\) (?<c>.+?) d\) (?<d>.+)$/u.exec(lab.tasks[13].prompt).groups;
  const q14Answer = Object.entries(q14).find(([, value]) => normalize(value).includes("aucun compte"))[0];

  const expected = [
    q1Answer,
    String(statuses.filter((entry) => entry.status === "in").length),
    statuses.find((entry) => entry.status === "clarify").target.cible,
    String(actionStatuses.filter((entry) => entry.status === "forbidden").length),
    policy.missionStart,
    policy.stopTime,
    policy.emergencyContact,
    actionStatuses.find((entry) => entry.action.validation_requise === policy.legalContact).action.id,
    String(actionStatuses.filter((entry) => entry.status === "allowed" && entry.action.famille === "passive").length),
    policy.lightScanBlock,
    statuses.find((entry) => entry.status === "out" && policy.allowedDomains.includes(entry.target.cible)).target.id,
    actionStatuses.find((entry) => entry.action.famille === "ingenierie_sociale" && targetStatus(targetsById.get(entry.action.cible_id), policy) === "in").action.id,
    String(statuses.filter((entry) => entry.status === "in" && compact([entry.target.type]).some((type) => policy.credentialTypes.includes(type)) && !policy.providedAccounts[entry.target.cible]).length),
    q14Answer,
    actionStatuses.find((entry) => entry.action.intensite === "forte").action.id,
  ];

  expected.forEach((answer, index) => {
    assert.ok(lab.tasks[index].accepted.includes(normalize(answer)), `reponse absente pour la tache ${index + 1}: ${answer}`);
  });
});

test("TP1 support text and guide do not leak answers", () => {
  const current = scenario();
  const lab = current.labs[0];
  const guideText = normalize(current.text("pt-tp1-guide.md"));
  const support = normalize([lab.briefing, ...lab.objectives, ...lab.constraints, ...lab.hints].join("\n"));
  lab.tasks.forEach((task, index) => {
    for (const answer of significantAnswers(task)) {
      assert.equal(containsAnswer(normalize(`${task.prompt}\n${task.hint}`), answer), false, `fuite directe dans la tache ${index + 1}`);
      assert.equal(containsAnswer(guideText, answer), false, `fuite dans le guide pour la tache ${index + 1}`);
      assert.equal(containsAnswer(support, answer), false, `fuite dans le support pour la tache ${index + 1}`);
      lab.tasks.forEach((other, otherIndex) => {
        if (otherIndex === index) return;
        assert.equal(containsAnswer(normalize(`${other.prompt}\n${other.hint}`), answer), false, `fuite entre taches ${index + 1} et ${otherIndex + 1}`);
      });
    }
  });
});

test("TP1 guide commands run and print something", {
  skip: !fs.existsSync(bashPath) || !fs.existsSync(powershellPath) ? "Git Bash ou PowerShell absent" : false,
}, () => {
  const current = scenario();
  const blocks = codeBlocks(current.text("pt-tp1-guide.md"));
  assert.ok(blocks.length >= 4, "blocs de guide manquants");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pt-tp1-guide-"));
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
