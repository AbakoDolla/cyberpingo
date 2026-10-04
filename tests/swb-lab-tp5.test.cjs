const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildSwbAssetsTp5 } = require("../scripts/lab-scenarios-swb-tp5.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);
const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

function scenario() {
  const generated = buildSwbAssetsTp5();
  const { buildSwbLabTp5 } = load("supabase/seed/content/swb-lab-tp5");
  const labs = buildSwbLabTp5(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function assetName(url) {
  return path.posix.basename(url);
}

function parseApi(raw) {
  return raw.trim().split("\n").map((line) => JSON.parse(line));
}

function parseRights(raw) {
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(";");
  return lines.slice(1).map((line) => {
    const values = line.split(";");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function parseOutgoing(raw) {
  return raw.trim().split("\n").map((line) => {
    const match = /^(?<ts>\S+) user=(?<user>\S+) route=(?<route>\S+) url=(?<url>\S+) status=(?<status>\d+) bytes=(?<bytes>\d+)$/u.exec(line);
    assert.ok(match, `ligne sortante illisible: ${line}`);
    return { ts: match.groups.ts, user: match.groups.user, route: match.groups.route, url: match.groups.url, status: Number(match.groups.status), bytes: Number(match.groups.bytes) };
  });
}

function routeKey(method, rawPath) {
  const bare = rawPath.split("?")[0];
  if (method === "GET" && /^\/api\/reservations\/\d+$/u.test(bare)) return "/api/reservations/{id}";
  if (method === "GET" && /^\/api\/factures\/\d+$/u.test(bare)) return "/api/factures/{id}";
  if (method === "GET" && bare === "/api/apercu") return "/api/apercu";
  return bare;
}

function hostFromUrl(raw) {
  return new URL(raw).hostname;
}

function isPrivateOrLocal(host) {
  if (/^127\./u.test(host)) return true;
  if (/^10\./u.test(host)) return true;
  if (/^169\.254\./u.test(host)) return true;
  if (/^192\.168\./u.test(host)) return true;
  const match = /^172\.(\d{1,3})\./u.exec(host);
  return match ? Number(match[1]) >= 16 && Number(match[1]) <= 31 : false;
}

function counts(entries, getter) {
  return entries.reduce((map, entry) => {
    const key = getter(entry);
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map());
}

function uniqueTop(map, label) {
  const ordered = [...map.entries()].sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])));
  assert.ok(ordered.length > 0, `${label}: aucun élément`);
  if (ordered.length > 1) assert.notEqual(ordered[0][1], ordered[1][1], `${label}: ex æquo interdit`);
  return ordered[0][0];
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

function extractCodeBlocks(markdown) {
  return [...markdown.matchAll(/```(bash|powershell)\n([\s\S]*?)```/gu)].map((match) => ({ language: match[1], code: match[2].trim() }));
}

function prepareLabTempDir(lab, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `swb-tp5-${lab.slug}-`));
  for (const asset of lab.assets) fs.writeFileSync(path.join(dir, asset.url.replace("/labs/", "")), files.get(asset.url.replace("/labs/", "")));
  return dir;
}

function runBashBlock(dir, code) {
  const scriptPath = path.join(dir, "guide-block.sh");
  fs.writeFileSync(scriptPath, `set -euo pipefail\ncd "${dir.replace(/\\/gu, "/")}"\n${code}\n`);
  return spawnSync(bashPath, [scriptPath], { cwd: dir, encoding: "utf8" });
}

function runPowerShellBlock(dir, code) {
  const scriptPath = path.join(dir, "guide-block.ps1");
  fs.writeFileSync(scriptPath, `Set-StrictMode -Version Latest\n$ErrorActionPreference = "Stop"\nSet-Location "${dir.replace(/\\/gu, "\\\\")}"\n${code}\n`);
  return spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], { cwd: dir, encoding: "utf8" });
}

function countMaskedSecrets(text) {
  return (text.match(/\*{6}/gu) || []).length;
}

function choiceLetter(task, snippet) {
  const escaped = snippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`([a-d])\\) ${escaped}`, "u").exec(task.prompt);
  assert.ok(match, `option introuvable: ${snippet}`);
  return match[1];
}

function deriveAnswers(current) {
  const api = parseApi(current.text("swb-tp5-api.jsonl"));
  const rights = parseRights(current.text("swb-tp5-droits.csv"));
  const outgoing = parseOutgoing(current.text("swb-tp5-sortant.log"));
  const rightsMap = new Map(rights.map((row) => [`${row.methode} ${row.route}`, row]));

  const ownerViolations = api.filter((row) => {
    const rule = rightsMap.get(`${row.method} ${routeKey(row.method, row.path)}`);
    return row.status === 200 && rule && rule.proprietaire_requis === "oui" && row.userId !== row.ownerId;
  });
  const topUser = uniqueTop(counts(ownerViolations, (row) => row.userId), "top utilisateur hors propriété");
  const topReservationIds = ownerViolations
    .filter((row) => row.userId === topUser && /^\/api\/reservations\/\d+$/u.test(row.path))
    .map((row) => Number(/(\d+)$/u.exec(row.path)[1]))
    .sort((left, right) => left - right);
  assert.equal(topReservationIds.length, new Set(topReservationIds).size, "la série de réservations doit être sans doublon");
  for (let index = 1; index < topReservationIds.length; index += 1) assert.equal(topReservationIds[index] - topReservationIds[index - 1], 1, "la série doit être séquentielle");

  const roleViolations = api.filter((row) => {
    const rule = rightsMap.get(`${row.method} ${routeKey(row.method, row.path)}`);
    return row.status === 200 && rule && !rule.roles_autorises.split("|").includes(row.role);
  });
  const forbidden = api.filter((row) => {
    const rule = rightsMap.get(`${row.method} ${routeKey(row.method, row.path)}`);
    if (!rule || row.status !== 200) return false;
    if (!rule.roles_autorises.split("|").includes(row.role)) return true;
    return rule.proprietaire_requis === "oui" && row.userId !== row.ownerId;
  });

  const privateRows = outgoing.filter((row) => isPrivateOrLocal(hostFromUrl(row.url)));
  const metadataRows = outgoing.filter((row) => hostFromUrl(row.url) === "169.254.169.254" && row.status === 200);
  const tokenMinuteCounts = counts(api, (row) => `${row.tokenId}|${row.ts.slice(0, 16)}`);
  const peakKey = uniqueTop(tokenMinuteCounts, "pic de débit");
  const peakMinute = peakKey.split("|")[1].slice(11);

  const bolaTask = current.labs[0].tasks[13];
  const ssrfTask = current.labs[0].tasks[14];

  return [
    String(ownerViolations.length),
    topUser,
    String(new Set(topReservationIds).size),
    String(topReservationIds[0]),
    String(topReservationIds[topReservationIds.length - 1]),
    String(roleViolations.length),
    String(forbidden.length),
    String(privateRows.length),
    `${privateRows[0].user},${hostFromUrl(privateRows[0].url)}`,
    String(metadataRows.length),
    String(metadataRows.reduce((sum, row) => sum + row.bytes, 0)),
    String(tokenMinuteCounts.get(peakKey)),
    peakMinute,
    choiceLetter(bolaTask, "vérifier côté serveur que l’objet appartient à l’utilisateur avant de répondre"),
    choiceLetter(ssrfTask, "imposer une liste autorisée de destinations et refuser les adresses privées ou locales après résolution"),
  ];
}

test("le laboratoire TP5 est déterministe et ses fichiers restent propres", () => {
  const first = buildSwbAssetsTp5();
  const second = buildSwbAssetsTp5();
  assert.deepEqual(first.facts, second.facts);
  assert.equal(first.files.length, second.files.length);
  first.files.forEach((file, index) => {
    assert.equal(file.name, second.files[index].name);
    assert.equal(Buffer.compare(file.data, second.files[index].data), 0, `${file.name} doit être identique`);
    assert.equal(file.data.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false, `${file.name} ne doit pas avoir de BOM`);
    assert.equal(file.data.includes(Buffer.from("\r\n")), false, `${file.name} doit rester en LF`);
    assert.ok(file.data.length < 150 * 1024, `${file.name} doit rester sous 150 Ko`);
    assert.equal(countMaskedSecrets(file.data.toString("utf8")), 0, `${file.name} ne doit pas contenir six astérisques de masquage`);
  });
});

test("le lab TP5 déclare exactement ses fichiers et passe labIssues", () => {
  const { labs, generated } = scenario();
  assert.equal(labs.length, 1);
  const lab = labs[0];
  assert.equal(lab.slug, "tp-web-acces-api");
  assert.equal(lab.tasks.length, 15);
  assert.deepEqual(labIssues(lab), [], "tp-web-acces-api doit avoir zéro problème");
  const assetNames = new Set(lab.assets.map((asset) => assetName(asset.url)));
  const fileNames = new Set(generated.files.map((file) => file.name));
  assert.deepEqual([...assetNames].sort(), [...fileNames].sort());
});

test("chaque réponse du TP5 se recalcule depuis les fichiers", () => {
  const current = scenario();
  const answers = deriveAnswers(current);
  assert.equal(answers.length, current.labs[0].tasks.length);
  answers.forEach((answer, index) => assert.ok(current.labs[0].tasks[index].accepted.includes(normalize(answer)), `tâche ${index + 1}`));
});

test("le guide du TP5 ne divulgue aucune réponse significative", () => {
  const { labs, files } = scenario();
  const lab = labs[0];
  const guideText = files.get(lab.assets.find((asset) => asset.kind === "guide").url.replace("/labs/", "")).toString("utf8");
  const supportText = normalize([lab.briefing, ...lab.constraints, ...lab.objectives, ...lab.hints].join("\n"));
  let open = false;
  for (const line of guideText.split("\n")) if (line.trim().startsWith("```")) open = !open;
  assert.equal(open, false, "guide : bloc de code non fermé");
  assert.equal(/node -e\b/u.test(guideText), false, "guide : pas de node -e");
  for (const task of lab.tasks) {
    for (const answer of significantAnswers(task)) {
      assert.equal(containsAnswer(normalize(guideText), answer), false, `guide : fuite ${answer}`);
      assert.equal(containsAnswer(supportText, answer), false, `support : fuite ${answer}`);
    }
  }
});

test("les fichiers sources du TP5 et les fichiers générés ne contiennent pas six astérisques de masquage", () => {
  const sources = [
    path.join(__dirname, "..", "scripts", "lab-scenarios-swb-tp5.cjs"),
    path.join(__dirname, "..", "supabase", "seed", "content", "swb-lab-tp5.ts"),
    path.join(__dirname, "swb-lab-tp5.test.cjs"),
  ];
  for (const filePath of sources) assert.equal(countMaskedSecrets(fs.readFileSync(filePath, "utf8")), 0, path.basename(filePath));
  const { files } = scenario();
  for (const [name, buffer] of files) assert.equal(countMaskedSecrets(buffer.toString("utf8")), 0, name);
});

test("les blocs bash du guide s’exécutent dans Git Bash sous Windows", {
  skip: process.platform !== "win32" ? "test réservé à Windows" : !fs.existsSync(bashPath) ? "Git Bash absent" : false,
}, () => {
  const current = scenario();
  const lab = current.labs[0];
  const dir = prepareLabTempDir(lab, current.files);
  try {
    const markdown = current.files.get(lab.assets.find((asset) => asset.kind === "guide").url.replace("/labs/", "")).toString("utf8");
    for (const block of extractCodeBlocks(markdown).filter((entry) => entry.language === "bash")) {
      const result = runBashBlock(dir, block.code);
      assert.equal(result.status, 0, result.stderr);
      assert.notEqual((result.stdout ?? "").trim(), "", "bash : sortie vide");
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("les blocs powershell du guide s’exécutent sous powershell.exe 5.1", {
  skip: process.platform !== "win32" ? "test réservé à Windows" : !fs.existsSync(powershellPath) ? "PowerShell absent" : false,
}, () => {
  const current = scenario();
  const lab = current.labs[0];
  const dir = prepareLabTempDir(lab, current.files);
  try {
    const markdown = current.files.get(lab.assets.find((asset) => asset.kind === "guide").url.replace("/labs/", "")).toString("utf8");
    for (const block of extractCodeBlocks(markdown).filter((entry) => entry.language === "powershell")) {
      const result = runPowerShellBlock(dir, block.code);
      assert.equal(result.status, 0, result.stderr);
      assert.notEqual((result.stdout ?? "").trim(), "", "powershell : sortie vide");
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
