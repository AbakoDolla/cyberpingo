const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const { buildSwbAssetsTp4 } = require("../scripts/lab-scenarios-swb-tp4.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);
const masked = "*".repeat(6);
const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

function scenario() {
  const generated = buildSwbAssetsTp4();
  const { buildSwbLabTp4 } = load("supabase/seed/content/swb-lab-tp4");
  const labs = buildSwbLabTp4(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function parseTable(raw, sep = ";") {
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(sep);
  return lines.slice(1).map((line) => Object.fromEntries(headers.map((header, index) => [header, line.split(sep)[index] ?? ""])));
}

function base64urlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function parseTokens(raw) {
  return parseTable(raw).map((row) => {
    const [header, payload, signature = ""] = row.jwt.split(".");
    return {
      id: row.jeton_id,
      jwt: row.jwt,
      header: JSON.parse(base64urlDecode(header)),
      payload: JSON.parse(base64urlDecode(payload)),
      signature,
      signed: `${header}.${payload}`,
    };
  });
}

function parseSessions(raw) {
  return parseTable(raw).map((row) => ({
    ts: row.timestamp_utc,
    sessionId: row.session_id,
    event: row.event,
    user: row.user,
    sourceIp: row.source_ip,
    path: row.path,
    decision: row.decision,
    rotatedTo: row.rotated_to,
  }));
}

function detectAlgorithm(value) {
  if (value.startsWith("$argon2id$")) return "argon2id";
  if (value.startsWith("$2b$")) return "bcrypt";
  if (value.startsWith("pbkdf2-sha256$")) return "pbkdf2-sha256";
  if (value.startsWith("md5$")) return "md5";
  if (value.startsWith("sha1$")) return "sha-1";
  if (value.startsWith("sha256$")) return "sha-256 sans sel";
  return "inconnu";
}

function hashScore(value) {
  if (value.startsWith("md5$")) return 1;
  if (value.startsWith("sha1$")) return 2;
  if (value.startsWith("sha256$")) return 3;
  if (value.startsWith("pbkdf2-sha256$")) return Number(value.split("$")[1]) >= 600000 ? 6 : 4;
  if (value.startsWith("$2b$")) return Number(value.slice(4, 6)) >= 12 ? 7 : 5;
  if (value.startsWith("$argon2id$")) return 8;
  return 0;
}

function hmacSignature(signed, secret) {
  return crypto.createHmac("sha256", secret).update(signed).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
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

function extractCodeBlocks(markdown) {
  return [...markdown.matchAll(/```(bash|powershell)\n([\s\S]*?)```/gu)].map((match) => ({ language: match[1], code: match[2].trim() }));
}

function prepareLabTempDir(lab, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `swb-tp4-${lab.slug}-`));
  for (const asset of lab.assets) fs.writeFileSync(path.join(dir, asset.url.replace("/labs/", "")), files.get(asset.url.replace("/labs/", "")));
  return dir;
}

function runPowerShellBlock(dir, code) {
  const scriptPath = path.join(dir, "guide-block.ps1");
  fs.writeFileSync(scriptPath, `Set-StrictMode -Version Latest\n$ErrorActionPreference = "Stop"\nSet-Location "${dir.replace(/\\/gu, "\\\\")}"\n${code}\n`);
  return spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], { cwd: dir, encoding: "utf8" });
}

function runBashBlock(dir, code) {
  const scriptPath = path.join(dir, "guide-block.sh");
  fs.writeFileSync(scriptPath, `set -euo pipefail\ncd "${dir.replace(/\\/gu, "/")}"\n${code}\n`);
  return spawnSync(bashPath, [scriptPath], { cwd: dir, encoding: "utf8" });
}

function deriveAnswers(current) {
  const lab = current.labs[0];
  const tokens = parseTokens(current.text("swb-tp4-jetons.txt"));
  const sessions = parseSessions(current.text("swb-tp4-sessions.log"));
  const hashes = parseTable(current.text("swb-tp4-empreintes.csv"));
  const policy = current.text("swb-tp4-politique.md");
  assert.match(lab.briefing, /7 mai 2026 à 09:00:00 UTC/u);
  const nowText = "2026-05-07T09:00:00Z";
  const apiAudience = /Audience attendue.*?:\s*([a-z0-9-]+)/u.exec(policy)[1];
  const tokenMaxMinutes = Number(/ne doit jamais dépasser\s+(\d+)\s+minutes/iu.exec(policy)[1]);
  const idleMaxMinutes = Number(/plus de\s+(\d+)\s+minutes d’inactivité/iu.exec(policy)[1]);
  const requestedTokenId = /jeton\s+(J\d{2})/iu.exec(lab.tasks[0].prompt)[1].toUpperCase();
  const requestedHashAccount = /compte «\s*([^»]+)\s*»/u.exec(lab.tasks[10].prompt)[1].trim().toLowerCase();
  const requestedHashRow = hashes.find((row) => normalize(row.compte) === requestedHashAccount);
  assert.ok(requestedHashRow, "compte d’empreinte introuvable");
  const expiredCount = tokens.filter((token) => token.payload.exp <= Date.parse(nowText) / 1000).length;
  const wrongAudienceCount = tokens.filter((token) => token.payload.aud !== apiAudience).length;
  const overlongTokenCount = tokens.filter((token) => token.payload.exp - token.payload.iat > tokenMaxMinutes * 60).length;
  const invalidSignatureHs256Count = tokens.filter((token) => token.header.alg === "HS256" && hmacSignature(token.signed, "secret-d-exemple") !== token.signature).length;
  const logoutAt = new Map();
  const postLogout = new Set();
  const lastBySession = new Map();
  let fixationCount = 0;
  let idleAcceptedCount = 0;
  for (const row of sessions) {
    if (row.event === "logout") logoutAt.set(row.sessionId, row.ts);
    if (row.event === "login" && row.sessionId === row.rotatedTo) fixationCount += 1;
    const prev = lastBySession.get(row.sessionId);
    if (row.event === "request" && row.decision === "accepted" && prev) {
      if ((Date.parse(row.ts) - Date.parse(prev.ts)) / 1000 > idleMaxMinutes * 60) idleAcceptedCount += 1;
      if (logoutAt.has(row.sessionId) && Date.parse(row.ts) > Date.parse(logoutAt.get(row.sessionId))) postLogout.add(row.sessionId);
    }
    lastBySession.set(row.sessionId, row);
  }
  const weakest = hashes.slice().sort((left, right) => hashScore(left.empreinte) - hashScore(right.empreinte) || left.compte.localeCompare(right.compte))[0].compte;
  return [
    tokens.find((token) => token.id === requestedTokenId).payload.sub,
    tokens.find((token) => token.header.alg === "none").id,
    String(expiredCount),
    tokens.find((token) => token.payload.role === "admin").id,
    String(wrongAudienceCount),
    String(overlongTokenCount),
    String(invalidSignatureHs256Count),
    String(postLogout.size),
    String(fixationCount),
    String(idleAcceptedCount),
    detectAlgorithm(requestedHashRow.empreinte),
    String(hashes.filter((row) => hashScore(row.empreinte) < 6).length),
    weakest,
    "c",
    "b",
  ];
}

test("le laboratoire TP4 est déterministe, propre et complet", () => {
  const first = buildSwbAssetsTp4();
  const second = buildSwbAssetsTp4();
  assert.deepEqual(first.facts, second.facts);
  assert.equal(first.files.length, 5);
  assert.deepEqual(Object.keys(first.facts), ["swbTp4"]);
  first.files.forEach((file, index) => {
    assert.equal(file.name, second.files[index].name);
    assert.equal(Buffer.compare(file.data, second.files[index].data), 0, `${file.name} doit être identique`);
    assert.equal(file.data.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false, `${file.name} ne doit pas avoir de BOM`);
    assert.equal(file.data.includes(Buffer.from("\r\n")), false, `${file.name} doit rester en LF`);
    assert.ok(file.data.length < 150 * 1024, `${file.name} doit rester sous 150 Ko`);
  });
  const current = scenario();
  assert.equal(current.labs.length, 1);
  assert.equal(current.labs[0].slug, "tp-web-sessions-jwt");
  assert.equal(current.labs[0].tasks.length, 15);
  assert.deepEqual(labIssues(current.labs[0]), []);
});

test("les réponses du TP4 se recalculent depuis les fichiers", () => {
  const current = scenario();
  const answers = deriveAnswers(current);
  answers.forEach((answer, index) => assert.ok(current.labs[0].tasks[index].accepted.includes(normalize(answer)), `tâche ${index + 1}`));
});

test("les assets déclarés correspondent exactement aux fichiers générés", () => {
  const current = scenario();
  const assetNames = new Set(current.labs[0].assets.map((asset) => path.posix.basename(asset.url)));
  const fileNames = new Set(current.generated.files.map((file) => file.name));
  assert.deepEqual([...assetNames].sort(), [...fileNames].sort());
});

test("le guide et le support ne divulguent aucune réponse significative", () => {
  const current = scenario();
  const lab = current.labs[0];
  const guideText = normalize(current.text("swb-tp4-guide.md"));
  const supportText = normalize([lab.briefing, ...lab.constraints, ...lab.objectives, ...lab.hints].join("\n"));
  const markdown = current.text("swb-tp4-guide.md");
  let open = false;
  for (const line of markdown.split("\n")) if (line.trim().startsWith("```")) open = !open;
  assert.equal(open, false, "bloc de code non fermé");
  for (let taskIndex = 0; taskIndex < lab.tasks.length; taskIndex += 1) {
    const task = lab.tasks[taskIndex];
    for (const answer of significantAnswers(task)) {
      assert.equal(containsAnswer(guideText, answer), false, `tâche ${taskIndex + 1} fuit dans le guide`);
      assert.equal(containsAnswer(normalize(`${task.prompt}\n${task.hint}`), answer), false, `tâche ${taskIndex + 1} fuit dans son énoncé`);
      assert.equal(containsAnswer(supportText, answer), false, `tâche ${taskIndex + 1} fuit dans le support`);
      for (let otherIndex = 0; otherIndex < lab.tasks.length; otherIndex += 1) {
        if (otherIndex === taskIndex) continue;
        assert.equal(containsAnswer(normalize(`${lab.tasks[otherIndex].prompt}\n${lab.tasks[otherIndex].hint}`), answer), false, `tâche ${taskIndex + 1} fuit dans la tâche ${otherIndex + 1}`);
      }
    }
  }
});

test("aucun fichier source ou généré ne contient six astérisques masquées", () => {
  const current = scenario();
  const filesToCheck = [
    path.join(process.cwd(), "scripts", "lab-scenarios-swb-tp4.cjs"),
    path.join(process.cwd(), "supabase", "seed", "content", "swb-lab-tp4.ts"),
    path.join(process.cwd(), "tests", "swb-lab-tp4.test.cjs"),
  ];
  for (const filePath of filesToCheck) {
    const source = fs.readFileSync(filePath, "utf8");
    assert.equal((source.match(/\*{6}/g) || []).length, 0, `${path.basename(filePath)} contient ${masked}`);
  }
  for (const [name, data] of current.files) assert.equal((data.toString("utf8").match(/\*{6}/g) || []).length, 0, `${name} contient ${masked}`);
});

test("les blocs bash du guide s’exécutent dans Git Bash", {
  skip: process.platform !== "win32" ? "test réservé à Windows" : !fs.existsSync(bashPath) ? "Git Bash absent" : false,
}, () => {
  const current = scenario();
  const dir = prepareLabTempDir(current.labs[0], current.files);
  try {
    for (const block of extractCodeBlocks(current.text("swb-tp4-guide.md")).filter((entry) => entry.language === "bash")) {
      const result = runBashBlock(dir, block.code);
      assert.equal(result.status, 0, result.stderr);
      assert.equal((result.stderr ?? "").trim(), "", "stderr bash inattendu");
      assert.notEqual((result.stdout ?? "").trim(), "", "sortie bash vide");
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("les blocs PowerShell du guide s’exécutent sous powershell.exe", {
  skip: process.platform !== "win32" ? "test réservé à Windows" : !fs.existsSync(powershellPath) ? "powershell.exe absent" : false,
}, () => {
  const current = scenario();
  const dir = prepareLabTempDir(current.labs[0], current.files);
  try {
    for (const block of extractCodeBlocks(current.text("swb-tp4-guide.md")).filter((entry) => entry.language === "powershell")) {
      const result = runPowerShellBlock(dir, block.code);
      assert.equal(result.status, 0, result.stderr);
      assert.equal((result.stderr ?? "").trim(), "", "stderr powershell inattendu");
      assert.notEqual((result.stdout ?? "").trim(), "", "sortie powershell vide");
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
