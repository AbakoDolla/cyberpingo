const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildPtAssetsTp4 } = require("../scripts/lab-scenarios-pt-tp4.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR
  ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);

const METRIC_WEIGHTS = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  UI: { N: 0.85, R: 0.62 },
  CIA: { H: 0.56, L: 0.22, N: 0 },
  PR: {
    U: { N: 0.85, L: 0.62, H: 0.27 },
    C: { N: 0.85, L: 0.68, H: 0.5 },
  },
};

function scenario() {
  const generated = buildPtAssetsTp4();
  const { buildPtLabTp4 } = load("supabase/seed/content/pt-lab-tp4");
  const labs = buildPtLabTp4(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function parseSimpleCsv(raw) {
  const [header, ...rows] = raw.trim().split("\n");
  const keys = header.split(",");
  return rows.map((row) => {
    const values = row.split(",");
    return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
  });
}

function parseNotes(raw) {
  const entries = new Map();
  for (const line of raw.trim().split("\n")) {
    const statusMatch = /^\[(V\d{2})\] statut=([a-z_]+) preuve=([a-z_]+) decision_vecteur=([a-z_]+) vecteur_final=(.+)$/u.exec(line);
    if (statusMatch) {
      const [, id, statut, preuve, decisionVecteur, vecteurFinal] = statusMatch;
      entries.set(id, { id, statut, preuve, decisionVecteur, vecteurFinal });
      continue;
    }
    const validationMatch = /^\[(V\d{2})\] version_reelle=([^ ]+) produit=(.+?) validation=(.+)$/u.exec(line);
    if (validationMatch) {
      const [, id, versionReelle, produit, validation] = validationMatch;
      Object.assign(entries.get(id), { versionReelle, produit, validation });
      continue;
    }
    const commentMatch = /^\[(V\d{2})\] commentaire=(.+)$/u.exec(line);
    if (commentMatch) {
      const [, id, commentaire] = commentMatch;
      Object.assign(entries.get(id), { commentaire });
    }
  }
  return [...entries.values()];
}

function parseJsonl(raw) {
  return raw.trim().split("\n").map((line) => JSON.parse(line));
}

function parseAssets(raw) {
  return raw.trim().split("\n").filter((line) => line.startsWith("ACTIF|")).map((line) => {
    const parts = line.split("|").slice(1).map((entry) => entry.split("="));
    return Object.fromEntries(parts.map(([key, value]) => [key, value]));
  }).map((entry) => ({ ...entry, rang: Number(entry.rang) }));
}

function parseVector(vector) {
  return Object.fromEntries(vector.split("/").slice(1).map((part) => part.split(":")));
}

function roundUpCvss(value) {
  const scaled = Math.round(value * 100000);
  if (scaled % 10000 === 0) return (scaled / 100000).toFixed(1);
  return ((Math.floor(scaled / 10000) + 1) / 10).toFixed(1);
}

function cvssBaseScore(vector) {
  const metrics = parseVector(vector);
  const c = METRIC_WEIGHTS.CIA[metrics.C];
  const i = METRIC_WEIGHTS.CIA[metrics.I];
  const a = METRIC_WEIGHTS.CIA[metrics.A];
  const iss = 1 - (1 - c) * (1 - i) * (1 - a);
  const impact = metrics.S === "U"
    ? 6.42 * iss
    : 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  const exploitability = 8.22
    * METRIC_WEIGHTS.AV[metrics.AV]
    * METRIC_WEIGHTS.AC[metrics.AC]
    * METRIC_WEIGHTS.PR[metrics.S][metrics.PR]
    * METRIC_WEIGHTS.UI[metrics.UI];
  if (impact <= 0) return "0.0";
  const total = metrics.S === "U"
    ? Math.min(impact + exploitability, 10)
    : Math.min(1.08 * (impact + exploitability), 10);
  return roundUpCvss(total);
}

function cvssQualification(scoreText) {
  const score = Number(scoreText);
  if (score === 0) return "aucune";
  if (score <= 3.9) return "faible";
  if (score <= 6.9) return "moyenne";
  if (score <= 8.9) return "élevée";
  return "critique";
}

function epssBand(value) {
  if (value >= 0.85) return 4;
  if (value >= 0.6) return 3;
  if (value >= 0.3) return 2;
  return 1;
}

function significantAnswers(task, index) {
  if (index === 5) return [];
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

test("TP4 generator and lab definition stay coherent", () => {
  const current = scenario();
  const { labs, files, text } = current;
  assert.equal(labs.length, 1);
  const lab = labs[0];
  assert.equal(lab.slug, "tp-pt-vulns");
  assert.equal(lab.tasks.length, 15);
  assert.deepEqual([...files.keys()].sort(), [
    "pt-tp4-actifs.txt",
    "pt-tp4-avis-techniques.jsonl",
    "pt-tp4-epss-kev.csv",
    "pt-tp4-guide.md",
    "pt-tp4-notes-validation.txt",
    "pt-tp4-scanner-export.csv",
  ]);
  assert.deepEqual(labIssues(lab), []);
  for (const asset of lab.assets) assert.ok(files.has(path.posix.basename(asset.url)), `asset declare manquant: ${asset.url}`);
  assert.equal(text("pt-tp4-scanner-export.csv").trim().split("\n").length >= 35, true);
  assert.equal(text("pt-tp4-scanner-export.csv").trim().split("\n").length <= 55, true);
  assert.equal(text("pt-tp4-notes-validation.txt").trim().split("\n").length >= 80, true);
  assert.equal(text("pt-tp4-notes-validation.txt").trim().split("\n").length <= 120, true);
  assert.equal(text("pt-tp4-avis-techniques.jsonl").trim().split("\n").length >= 20, true);
  assert.equal(text("pt-tp4-avis-techniques.jsonl").trim().split("\n").length <= 35, true);
  assert.equal(text("pt-tp4-epss-kev.csv").trim().split("\n").length >= 20, true);
  assert.equal(text("pt-tp4-epss-kev.csv").trim().split("\n").length <= 35, true);
  assert.equal(text("pt-tp4-actifs.txt").trim().split("\n").length >= 35, true);
  assert.equal(text("pt-tp4-actifs.txt").trim().split("\n").length <= 50, true);
  assert.equal(text("pt-tp4-guide.md").trim().split("\n").length >= 90, true);
  assert.equal(text("pt-tp4-guide.md").trim().split("\n").length <= 130, true);
  const guide = text("pt-tp4-guide.md");
  assert.match(guide, /probabilité entre 0 et 1/u);
  assert.match(guide, /30 jours/u);
  assert.match(guide, /catalogue CISA/u);
  assert.match(guide, /ce n’est pas une mesure de gravité/u);
});

test("TP4 files are deterministic and clean", () => {
  const first = buildPtAssetsTp4();
  const second = buildPtAssetsTp4();
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
    path.join(process.cwd(), "scripts", "lab-scenarios-pt-tp4.cjs"),
    path.join(process.cwd(), "supabase", "seed", "content", "pt-lab-tp4.ts"),
    path.join(process.cwd(), "tests", "pt-lab-tp4.test.cjs"),
  ]) {
    const data = fs.readFileSync(source, "utf8");
    assert.equal((data.match(/\*{6}/g) || []).length, 0, `${path.basename(source)} contient une sequence masquee`);
  }
});

test("TP4 answers are recalculated independently from the generated files", () => {
  const current = scenario();
  const lab = current.labs[0];
  const scanner = parseSimpleCsv(current.text("pt-tp4-scanner-export.csv"));
  const epss = parseSimpleCsv(current.text("pt-tp4-epss-kev.csv")).map((row) => ({ ...row, epss: Number(row.epss) }));
  const notes = parseNotes(current.text("pt-tp4-notes-validation.txt"));
  const advisories = parseJsonl(current.text("pt-tp4-avis-techniques.jsonl"));
  const assets = parseAssets(current.text("pt-tp4-actifs.txt"));

  const noteById = new Map(notes.map((entry) => [entry.id, entry]));
  const scannerById = new Map(scanner.map((entry) => [entry.id, entry]));
  const epssById = new Map(epss.map((entry) => [entry.id, entry]));
  const assetByKey = new Map(assets.map((entry) => [`${entry.hote}|${entry.service}`, entry]));
  const confirmed = scanner.filter((entry) => noteById.get(entry.id).statut === "confirme");

  const confirmedByHost = confirmed.reduce((map, entry) => map.set(entry.hote, (map.get(entry.hote) || 0) + 1), new Map());
  const topHosts = [...confirmedByHost.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  assert.ok(topHosts.length >= 2);
  assert.notEqual(topHosts[0][1], topHosts[1][1], "hote confirme en tete ex aequo");

  const cvssTaskId = /constat (V\d{2})/u.exec(lab.tasks[4].prompt).at(1);
  const cvssScore = cvssBaseScore(scannerById.get(cvssTaskId).vecteur_cvss);
  const confirmedMaxEpss = confirmed.slice().sort((a, b) => epssById.get(b.id).epss - epssById.get(a.id).epss)[0];
  const topCriticalAssets = assets.slice().sort((a, b) => b.rang - a.rang || a.hote.localeCompare(b.hote) || a.service.localeCompare(b.service));
  assert.ok(topCriticalAssets.length >= 2);
  assert.notEqual(topCriticalAssets[0].rang, topCriticalAssets[1].rang, "actif critique en tete ex aequo");
  const criticalFindings = confirmed.filter((entry) => entry.hote === topCriticalAssets[0].hote && entry.service === topCriticalAssets[0].service);
  const criticalRanked = criticalFindings.slice().sort((a, b) => {
    const epssA = epssById.get(a.id).epss;
    const epssB = epssById.get(b.id).epss;
    if ((epssById.get(b.id).kev === "yes") !== (epssById.get(a.id).kev === "yes")) return (epssById.get(b.id).kev === "yes") - (epssById.get(a.id).kev === "yes");
    if (epssBand(epssB) !== epssBand(epssA)) return epssBand(epssB) - epssBand(epssA);
    const assetA = assetByKey.get(`${a.hote}|${a.service}`);
    const assetB = assetByKey.get(`${b.hote}|${b.service}`);
    if (assetB.rang !== assetA.rang) return assetB.rang - assetA.rang;
    if (epssB !== epssA) return epssB - epssA;
    return a.id.localeCompare(b.id);
  });
  const advisoryProduct = /produit « ([^»]+) »/u.exec(lab.tasks[9].prompt).at(1);
  const advisoryEntry = advisories.find((entry) => entry.produit === advisoryProduct);
  const keptVectorCount = notes.filter((entry) => entry.statut === "confirme" && entry.decisionVecteur === "conserve").length;
  const contextCandidates = confirmed.filter((entry) =>
    epssById.get(entry.id).kev === "no"
    && epssBand(epssById.get(entry.id).epss) === 3
    && (/cache/i.test(entry.produit) || /cdn/i.test(entry.produit))
  );
  assert.equal(contextCandidates.length, 2, "les deux constats de contexte metier doivent etre uniques");
  const contextWinner = contextCandidates.slice().sort((a, b) => {
    const assetA = assetByKey.get(`${a.hote}|${a.service}`);
    const assetB = assetByKey.get(`${b.hote}|${b.service}`);
    if (assetB.rang !== assetA.rang) return assetB.rang - assetA.rang;
    return epssById.get(b.id).epss - epssById.get(a.id).epss;
  })[0];
  const priorityRanking = confirmed.slice().sort((a, b) => {
    const epssA = epssById.get(a.id).epss;
    const epssB = epssById.get(b.id).epss;
    if ((epssById.get(b.id).kev === "yes") !== (epssById.get(a.id).kev === "yes")) return (epssById.get(b.id).kev === "yes") - (epssById.get(a.id).kev === "yes");
    if (epssBand(epssB) !== epssBand(epssA)) return epssBand(epssB) - epssBand(epssA);
    const assetA = assetByKey.get(`${a.hote}|${a.service}`);
    const assetB = assetByKey.get(`${b.hote}|${b.service}`);
    if (assetB.rang !== assetA.rang) return assetB.rang - assetA.rang;
    if (epssB !== epssA) return epssB - epssA;
    return a.id.localeCompare(b.id);
  });
  const priority1 = priorityRanking[0];
  const falseKev = notes.filter((entry) => entry.statut === "faux_positif" && epssById.get(entry.id).kev === "yes");

  const expected = [
    String(scanner.length),
    notes.find((entry) => entry.statut === "faux_positif").id,
    notes.find((entry) => entry.statut === "preuve_insuffisante").id,
    topHosts[0][0],
    cvssScore,
    cvssQualification(cvssScore),
    confirmedMaxEpss.id,
    String(confirmed.filter((entry) => epssById.get(entry.id).kev === "yes").length),
    criticalRanked[0].produit,
    advisoryEntry.version_corrigee,
    String(keptVectorCount),
    contextWinner.id,
    epssById.get(priority1.id).epss.toFixed(3),
    falseKev.length === 1 ? "c" : "?",
    String(confirmed.length),
  ];

  expected.forEach((answer, index) => {
    assert.ok(lab.tasks[index].accepted.includes(normalize(answer)), `reponse absente pour la tache ${index + 1}: ${answer}`);
  });

  const reversedScanner = scanner.slice().reverse();
  const reversedCount = reversedScanner.length;
  const reversedConfirmed = reversedScanner.filter((entry) => noteById.get(entry.id).statut === "confirme");
  const reversedByHost = reversedConfirmed.reduce((map, entry) => map.set(entry.hote, (map.get(entry.hote) || 0) + 1), new Map());
  const reversedTop = [...reversedByHost.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  assert.equal(reversedCount, scanner.length);
  assert.equal(reversedTop, topHosts[0][0]);
  assert.equal(reversedConfirmed.length, confirmed.length);
});

test("TP4 selected CVSS vectors match fixed reference scores", () => {
  const current = scenario();
  const scanner = parseSimpleCsv(current.text("pt-tp4-scanner-export.csv"));
  const scannerById = new Map(scanner.map((entry) => [entry.id, entry]));
  const references = [
    ["V08", "9.1"],
    ["V11", "10.0"],
    ["V18", "6.1"],
  ];
  references.forEach(([id, expected]) => {
    assert.equal(cvssBaseScore(scannerById.get(id).vecteur_cvss), expected, `score CVSS inattendu pour ${id}`);
  });
});

test("TP4 guide, support text and task prompts do not leak answers", () => {
  const current = scenario();
  const lab = current.labs[0];
  const guideText = normalize(current.text("pt-tp4-guide.md"));
  const support = normalize([lab.briefing, ...lab.objectives, ...lab.constraints, ...lab.hints].join("\n"));
  lab.tasks.forEach((task, index) => {
    for (const answer of significantAnswers(task, index)) {
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

test("TP4 guide commands run and print something", {
  skip: !fs.existsSync(bashPath) || !fs.existsSync(powershellPath) ? "Git Bash ou PowerShell absent" : false,
}, () => {
  const current = scenario();
  const blocks = codeBlocks(current.text("pt-tp4-guide.md"));
  assert.ok(blocks.length >= 4, "blocs de guide manquants");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pt-tp4-guide-"));
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
