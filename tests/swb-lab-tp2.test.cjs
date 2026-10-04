const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildSwbAssetsTp2 } = require("../scripts/lab-scenarios-swb-tp2.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR
  ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const patterns = ["' or '1'='1", "union select", "sleep(", "'--", "or 1=1"];
const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);

function scenario() {
  const generated = buildSwbAssetsTp2();
  const { buildSwbLabTp2 } = load("supabase/seed/content/swb-lab-tp2");
  const labs = buildSwbLabTp2(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function parseAccess(raw) {
  return raw.trim().split("\n").map((line) => {
    const match = /^(?<ip>\S+) - - \[(?<stamp>[^\]]+)\] "(?<method>\S+) (?<target>\S+) HTTP\/1\.1" (?<status>\d{3}) (?<bytes>\d+) "(?<referer>[^"]*)" "(?<agent>.*)"$/u.exec(line);
    assert.ok(match, `ligne nginx illisible: ${line}`);
    return {
      ip: match.groups.ip,
      stamp: match.groups.stamp,
      method: match.groups.method,
      target: match.groups.target,
      status: Number(match.groups.status),
      bytes: Number(match.groups.bytes),
      referer: match.groups.referer,
      agent: match.groups.agent,
    };
  });
}

function parseSql(raw) {
  return raw.trim().split("\n").map((line) => {
    const match = /^(?<ts>[^|]+) \| req=(?<reqId>[^|]+) \| route=(?<route>[^|]+) \| db_user=(?<dbUser>[^|]+) \| rows=(?<rows>\d+) \| duration_ms=(?<durationMs>\d+) \| result_user=(?<resultUser>[^|]+) \| sql=(?<sql>.+) \| params=(?<params>.+)$/u.exec(line);
    assert.ok(match, `ligne SQL illisible: ${line}`);
    return {
      ts: match.groups.ts.trim(),
      reqId: match.groups.reqId.trim(),
      route: match.groups.route.trim(),
      dbUser: match.groups.dbUser.trim(),
      rows: Number(match.groups.rows),
      durationMs: Number(match.groups.durationMs),
      resultUser: match.groups.resultUser.trim(),
      sql: match.groups.sql.trim(),
      params: match.groups.params.trim(),
    };
  });
}

function decodeTarget(target) {
  const query = target.includes("?") ? target.slice(target.indexOf("?") + 1) : "";
  return decodeURIComponent(query.replace(/\+/g, "%20")).toLowerCase();
}

function hasPattern(target) {
  const decoded = decodeTarget(target);
  return patterns.some((pattern) => decoded.includes(pattern));
}

function reqIdOf(target) {
  const match = /(?:\?|&)rid=([^&]+)/u.exec(target);
  assert.ok(match, `identifiant rid manquant: ${target}`);
  return match[1];
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

test("TP2 generator and lab definition stay coherent", () => {
  const current = scenario();
  const { labs, files, text } = current;
  assert.equal(labs.length, 1);
  const lab = labs[0];
  assert.equal(lab.slug, "tp-web-injection");
  assert.equal(lab.tasks.length, 15);
  assert.deepEqual([...files.keys()].sort(), [
    "swb-tp2-acces.log",
    "swb-tp2-appli.js",
    "swb-tp2-guide.md",
    "swb-tp2-requetes-sql.log",
  ]);
  assert.deepEqual(labIssues(lab), []);
  for (const asset of lab.assets) assert.ok(files.has(path.posix.basename(asset.url)), `asset declare manquant: ${asset.url}`);
  assert.equal(text("swb-tp2-acces.log").split("\n").length >= 400, true);
  assert.equal(text("swb-tp2-acces.log").split("\n").length <= 700, true);
  assert.equal(text("swb-tp2-appli.js").split("\n").length >= 80, true);
  assert.equal(text("swb-tp2-appli.js").split("\n").length <= 140, true);
});

test("TP2 files are deterministic and clean", () => {
  const first = buildSwbAssetsTp2();
  const second = buildSwbAssetsTp2();
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
    path.join(process.cwd(), "scripts", "lab-scenarios-swb-tp2.cjs"),
    path.join(process.cwd(), "supabase", "seed", "content", "swb-lab-tp2.ts"),
    path.join(process.cwd(), "tests", "swb-lab-tp2.test.cjs"),
  ]) {
    const data = fs.readFileSync(source, "utf8");
    assert.equal((data.match(/\*{6}/g) || []).length, 0, `${path.basename(source)} contient une sequence masquee`);
  }
});

test("TP2 answers are recalculated independently from the generated files", () => {
  const current = scenario();
  const lab = current.labs[0];
  const access = parseAccess(current.text("swb-tp2-acces.log"));
  const sql = parseSql(current.text("swb-tp2-requetes-sql.log"));
  const code = current.text("swb-tp2-appli.js");

  const attempts = access.filter((entry) => hasPattern(entry.target));
  const topCounts = attempts.reduce((map, entry) => map.set(entry.ip, (map.get(entry.ip) || 0) + 1), new Map());
  const orderedIps = [...topCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  assert.ok(orderedIps.length >= 2);
  assert.notEqual(orderedIps[0][1], orderedIps[1][1], "IP en tete ex aequo");

  const biggest = attempts.slice().sort((a, b) => b.bytes - a.bytes || a.stamp.localeCompare(b.stamp))[0];
  assert.notEqual(biggest.bytes, attempts.slice().sort((a, b) => b.bytes - a.bytes)[1].bytes, "taille maximale ex aequo");
  const joined = sql.find((entry) => entry.reqId === reqIdOf(biggest.target));
  assert.ok(joined, "ligne SQL liee introuvable");

  const searchRoute = /app\.get\("(?<route>[^"]+)", async \(req, res\) => \{\n(?:.*\n){0,8}\s*const sql = "SELECT id, code, ville, tarif FROM chambres WHERE ville = '" \+ ville \+ "' AND statut = '" \+ statut \+ "' ORDER BY tarif ASC";/u.exec(code);
  const exportRoute = /app\.get\("(?<route>[^"]+)", \(req, res\) => \{[\s\S]*?exec\("\/usr\/local\/bin\/export-reservations " \+ cible/u.exec(code);
  const dbUser = /const dbConfig = \{ user: "(?<user>[^"]+)"/u.exec(code);
  assert.ok(searchRoute && exportRoute && dbUser, "routes ou compte SQL introuvables");

  const bypass = sql.filter((entry) => entry.route === "/connexion" && /or '1'='1|or 1=1/iu.test(entry.sql));
  const bypassUsers = [...new Set(bypass.map((entry) => entry.resultUser))];
  assert.deepEqual(bypassUsers.length, 1, "compte de contournement non unique");

  const expected = [
    searchRoute.groups.route,
    String(attempts.length),
    orderedIps[0][0],
    attempts[0].stamp.slice(12, 20),
    String(attempts.filter((entry) => entry.status === 500).length),
    String(biggest.bytes),
    biggest.ip,
    String(joined.rows),
    /union select .* from (?<table>[a-z_]+)/iu.exec(joined.sql).groups.table,
    exportRoute.groups.route,
    String(bypass.length),
    bypassUsers[0],
    dbUser.groups.user,
    "b",
    "c",
  ];

  expected.forEach((answer, index) => {
    assert.ok(lab.tasks[index].accepted.includes(normalize(answer)), `reponse absente pour la tache ${index + 1}: ${answer}`);
  });
});

test("TP2 guide, support text and tasks do not leak answers", () => {
  const current = scenario();
  const lab = current.labs[0];
  const guideText = normalize(current.text("swb-tp2-guide.md"));
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

test("TP2 app excerpt stays syntactically valid", () => {
  const current = scenario();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "swb-tp2-app-"));
  try {
    const target = path.join(dir, "swb-tp2-appli.js");
    fs.writeFileSync(target, current.files.get("swb-tp2-appli.js"));
    const result = spawnSync("node", ["--check", target], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("TP2 guide commands run and print something", {
  skip: !fs.existsSync(bashPath) || !fs.existsSync(powershellPath) ? "Git Bash ou PowerShell absent" : false,
}, () => {
  const current = scenario();
  const blocks = codeBlocks(current.text("swb-tp2-guide.md"));
  assert.ok(blocks.length >= 4, "blocs de guide manquants");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "swb-tp2-guide-"));
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
