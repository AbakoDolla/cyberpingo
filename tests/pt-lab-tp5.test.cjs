const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildPtAssetsTp5 } = require("../scripts/lab-scenarios-pt-tp5.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR
  ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);
const leakExceptions = new Set(["pt-tp5-owasp-top10-2025.md"]);

function scenario() {
  const generated = buildPtAssetsTp5();
  const { buildPtLabTp5 } = load("supabase/seed/content/pt-lab-tp5");
  const labs = buildPtLabTp5(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function parseProxy(raw) {
  return raw.trim().split("\n").map((line) => JSON.parse(line));
}

function parseNotes(raw) {
  return raw.trim().split(/\n\s*\n/u).map((block) => {
    const lines = block.split("\n");
    const note = { id: lines[0].trim() };
    for (const line of lines.slice(1)) {
      const match = /^([^:]+)\s:\s(.+)$/u.exec(line);
      if (match) note[match[1].trim().toLowerCase()] = match[2].trim();
    }
    return note;
  });
}

function parseMemo(raw) {
  return [...raw.matchAll(/^##\s(A\d{2})\s(.+)$/gmu)].map((match) => ({ code: match[1].toLowerCase(), title: match[2] }));
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

function maskedCount(filePath) {
  const result = spawnSync("node", ["-e", "const fs=require('fs'); const s=fs.readFileSync(process.argv[1],'utf8'); console.log((s.match(/\\*{6}/g)||[]).length);", filePath], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return Number(result.stdout.trim());
}

test("TP5 generator and lab definition stay coherent", () => {
  const current = scenario();
  const lab = current.labs[0];
  assert.equal(current.labs.length, 1);
  assert.equal(lab.slug, "tp-pt-web");
  assert.equal(lab.tasks.length, 15);
  assert.deepEqual([...current.files.keys()].sort(), [
    "pt-tp5-guide.md",
    "pt-tp5-notes-test.txt",
    "pt-tp5-owasp-top10-2025.md",
    "pt-tp5-proxy-history.jsonl",
  ]);
  assert.deepEqual(labIssues(lab), []);
  const lineCounts = Object.fromEntries([...current.files.entries()].map(([name, buffer]) => [name, buffer.toString("utf8").split("\n").length]));
  assert.ok(lineCounts["pt-tp5-proxy-history.jsonl"] >= 120 && lineCounts["pt-tp5-proxy-history.jsonl"] <= 220);
  assert.ok(lineCounts["pt-tp5-notes-test.txt"] >= 80 && lineCounts["pt-tp5-notes-test.txt"] <= 120);
  assert.ok(lineCounts["pt-tp5-owasp-top10-2025.md"] >= 45 && lineCounts["pt-tp5-owasp-top10-2025.md"] <= 70);
  assert.ok(lineCounts["pt-tp5-guide.md"] >= 80 && lineCounts["pt-tp5-guide.md"] <= 120);
  const memoCodes = parseMemo(current.text("pt-tp5-owasp-top10-2025.md"));
  assert.deepEqual(memoCodes.map((item) => item.code), ["a01", "a02", "a03", "a04", "a05", "a06", "a07", "a08", "a09", "a10"]);
  assert.deepEqual(memoCodes.map((item) => item.title), [
    "Broken Access Control",
    "Security Misconfiguration",
    "Software Supply Chain Failures",
    "Cryptographic Failures",
    "Injection",
    "Insecure Design",
    "Authentication Failures",
    "Software or Data Integrity Failures",
    "Security Logging & Alerting Failures",
    "Mishandling of Exceptional Conditions",
  ]);
});

test("TP5 files are deterministic and clean", () => {
  const first = buildPtAssetsTp5();
  const second = buildPtAssetsTp5();
  assert.deepEqual(first, second);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pt-tp5-generated-"));
  try {
    for (const file of first.files) {
      const raw = file.data.toString("utf8");
      assert.notEqual(raw.charCodeAt(0), 0xfeff, `${file.name} : pas de BOM`);
      assert.equal(raw.includes("\r"), false, `${file.name} : pas de CRLF`);
      for (let index = 0; index < raw.length; index += 1) {
        const code = raw.charCodeAt(index);
        if (code < 32 && code !== 10) assert.fail(`${file.name} contient un caractère de contrôle interdit U+${code.toString(16).padStart(4, "0")}`);
      }
      const target = path.join(tempDir, file.name);
      fs.writeFileSync(target, file.data);
      assert.equal(maskedCount(target), 0, `${file.name} contient une séquence masquée`);
    }

    for (const source of [
      path.join(process.cwd(), "scripts", "lab-scenarios-pt-tp5.cjs"),
      path.join(process.cwd(), "supabase", "seed", "content", "pt-lab-tp5.ts"),
      path.join(process.cwd(), "tests", "pt-lab-tp5.test.cjs"),
    ]) {
      assert.equal(maskedCount(source), 0, `${path.basename(source)} contient une séquence masquée`);
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("TP5 answers are recalculated independently from the generated files", () => {
  const current = scenario();
  const lab = current.labs[0];
  const proxy = parseProxy(current.text("pt-tp5-proxy-history.jsonl"));
  const notes = parseNotes(current.text("pt-tp5-notes-test.txt"));
  const memo = parseMemo(current.text("pt-tp5-owasp-top10-2025.md"));

  const business = proxy.filter((entry) => ["dossier", "document", "beneficiaire"].includes(entry.resourceType));
  const businessCounts = new Map();
  business.forEach((entry) => businessCounts.set(entry.path, (businessCounts.get(entry.path) || 0) + 1));
  const businessWinner = [...businessCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  assert.notEqual(businessWinner[0][1], businessWinner[1][1], "ressource métier ex æquo");

  const documentSizes = proxy.filter((entry) => entry.resourceType === "document" && entry.status === 200).map((entry) => entry.responseBytes).sort((left, right) => right - left);
  assert.notEqual(documentSizes[0], documentSizes[1], "taille maximale de document ex æquo");

  const confirmed = notes.filter((note) => note["statut"] === "confirmé");
  const accessNote = notes.find((note) => note["statut"] === "confirmé" && note["type"] === "controle-acces-horizontal");
  const uploadHypothesis = notes.find((note) => note["statut"] === "hypothèse" && note["type"] === "televersement");
  const sessionNote = notes.find((note) => note["statut"] === "confirmé" && note["type"] === "faiblesse-session");
  const firstPriority = notes.find((note) => /Présenter en premier/u.test(note["décision"]));
  assert.ok(accessNote && uploadHypothesis && sessionNote && firstPriority);

  const defendableMatch = /a\)\s(.+?)\s+b\)\s(.+?)\s+c\)\s(.+?)\s+d\)\s(.+)$/u.exec(lab.tasks[12].prompt);
  assert.ok(defendableMatch, "choix de formulation introuvable");
  const letters = { a: defendableMatch[1], b: defendableMatch[2], c: defendableMatch[3], d: defendableMatch[4] };
  const defendableLetter = Object.entries(letters).find(([, value]) => /sans preuve de compromission/u.test(value))[0];

  const expected = [
    String(proxy.filter((entry) => entry.method === "POST" && entry.path === "/auth/login").length),
    businessWinner[0][0],
    accessNote.id,
    memo.find((item) => /Broken Access Control/u.test(item.title)).code,
    String(proxy.filter((entry) => entry.manipulatedIdentifier && entry.status === 200 && entry.actorAccount !== entry.resourceOwner).length),
    uploadHypothesis.id,
    uniqueValue(proxy.filter((entry) => entry.resourceType === "upload").map((entry) => entry.path)),
    String(documentSizes[0]),
    memo.find((item) => /Mishandling of Exceptional Conditions/u.test(item.title)).code,
    String(proxy.filter((entry) => entry.manipulatedIdentifier && [403, 404].includes(entry.status)).length),
    sessionNote.id,
    sessionNote["owasp pressenti"],
    defendableLetter,
    String(confirmed.length),
    firstPriority.id,
  ];

  expected.forEach((answer, index) => {
    assert.ok(lab.tasks[index].accepted.includes(normalize(answer)), `réponse absente pour la tâche ${index + 1}: ${answer}`);
  });
});

test("TP5 proxy history stays plausible and defensive", () => {
  const current = scenario();
  const proxy = parseProxy(current.text("pt-tp5-proxy-history.jsonl"));
  const statuses = new Set(proxy.map((entry) => entry.status));
  [200, 301, 302, 304, 403, 404].forEach((status) => assert.ok(statuses.has(status), `code ${status} absent`));
  const rejectedDocuments = proxy.filter((entry) => entry.resourceType === "document" && [403, 404].includes(entry.status));
  assert.ok(rejectedDocuments.length > 0, "aucun rejet de document");
  rejectedDocuments.forEach((entry) => assert.equal(entry.contentType, "application/json"));
  const sessionIds = proxy.map((entry) => entry.sessionId).filter(Boolean);
  sessionIds.forEach((value) => {
    assert.match(value, /^sess-demo-\d{4}$/u);
    assert.equal(value.includes("."), false, "session factice ne doit pas ressembler à un JWT");
  });
});

function uniqueValue(values) {
  const uniques = [...new Set(values)];
  assert.equal(uniques.length, 1, "valeur non unique");
  return uniques[0];
}

test("TP5 guide and support do not leak answers outside the OWASP memo", () => {
  const current = scenario();
  const lab = current.labs[0];
  const support = normalize([lab.briefing, ...lab.constraints, ...lab.objectives, ...lab.hints].join("\n"));
  const guideDocs = lab.assets
    .filter((asset) => asset.kind === "guide" && !leakExceptions.has(path.posix.basename(asset.url)))
    .map((asset) => current.text(path.posix.basename(asset.url)))
    .join("\n");
  const guideText = normalize(guideDocs);

  lab.tasks.forEach((task, index) => {
    for (const answer of significantAnswers(task)) {
      assert.equal(containsAnswer(normalize(`${task.prompt}\n${task.hint}`), answer), false, `fuite directe dans la tâche ${index + 1}`);
      assert.equal(containsAnswer(support, answer), false, `fuite dans le support pour la tâche ${index + 1}`);
      assert.equal(containsAnswer(guideText, answer), false, `fuite dans le guide pour la tâche ${index + 1}`);
      lab.tasks.forEach((other, otherIndex) => {
        if (otherIndex === index) return;
        assert.equal(containsAnswer(normalize(`${other.prompt}\n${other.hint}`), answer), false, `fuite entre tâches ${index + 1} et ${otherIndex + 1}`);
      });
    }
  });
});

test("TP5 guide commands run and print something", {
  skip: !fs.existsSync(bashPath) || !fs.existsSync(powershellPath) ? "Git Bash ou PowerShell absent" : false,
}, () => {
  const current = scenario();
  const blocks = codeBlocks(current.text("pt-tp5-guide.md"));
  assert.ok(blocks.length >= 4, "blocs de guide manquants");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pt-tp5-guide-"));
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
