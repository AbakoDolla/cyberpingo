const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildSwbAssetsTp6 } = require("../scripts/lab-scenarios-swb-tp6.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);

function scenario() {
  const built = buildSwbAssetsTp6();
  const { buildSwbLabTp6 } = load("supabase/seed/content/swb-lab-tp6");
  const labs = buildSwbLabTp6(built.facts);
  const files = new Map(built.files.map((file) => [file.name, file.data]));
  return { built, labs, files, text: (name) => files.get(name).toString("utf8") };
}

function parseCsv(raw) {
  const [header, ...rows] = raw.trim().split("\n");
  const columns = header.split(";");
  return rows.map((row) => {
    const values = row.split(";");
    return Object.fromEntries(columns.map((column, index) => [column, values[index] ?? ""]));
  });
}

function parseVersion(value) {
  return value.split(".").map((part) => Number(part));
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function inRange(version, range) {
  return range.split(/\s+/u).filter(Boolean).every((clause) => {
    const match = /^(<=|>=|<|>|=)?(\d+\.\d+\.\d+)$/u.exec(clause);
    assert.ok(match, `plage inattendue: ${range}`);
    const operator = match[1] || "=";
    const boundary = match[2];
    const delta = compareVersions(version, boundary);
    if (operator === "<") return delta < 0;
    if (operator === "<=") return delta <= 0;
    if (operator === ">") return delta > 0;
    if (operator === ">=") return delta >= 0;
    return delta === 0;
  });
}

function roundup(value) {
  const scaled = Math.round(value * 100000);
  if (scaled % 10000 === 0) return scaled / 100000;
  return (Math.floor(scaled / 10000) + 1) / 10;
}

function cvss(vector) {
  const metrics = Object.fromEntries(vector.split("/").slice(1).map((part) => part.split(":")));
  const av = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }[metrics.AV];
  const ac = { L: 0.77, H: 0.44 }[metrics.AC];
  const prTable = metrics.S === "C" ? { N: 0.85, L: 0.68, H: 0.5 } : { N: 0.85, L: 0.62, H: 0.27 };
  const ui = { N: 0.85, R: 0.62 }[metrics.UI];
  const c = { N: 0, L: 0.22, H: 0.56 }[metrics.C];
  const i = { N: 0, L: 0.22, H: 0.56 }[metrics.I];
  const a = { N: 0, L: 0.22, H: 0.56 }[metrics.A];
  const iss = 1 - ((1 - c) * (1 - i) * (1 - a));
  const impact = metrics.S === "C" ? 7.52 * (iss - 0.029) - 3.25 * ((iss - 0.02) ** 15) : 6.42 * iss;
  const exploitability = 8.22 * av * ac * prTable[metrics.PR] * ui;
  if (impact <= 0) return 0;
  const raw = metrics.S === "C" ? Math.min(1.08 * (impact + exploitability), 10) : Math.min(impact + exploitability, 10);
  return roundup(raw);
}

function severityLetter(score) {
  if (score < 4) return "a";
  if (score < 7) return "b";
  if (score < 9) return "c";
  return "d";
}

function lineOf(lines, pattern) {
  const index = lines.findIndex((line) => pattern.test(line));
  assert.notEqual(index, -1, `ligne introuvable: ${pattern}`);
  return String(index + 1);
}

function accepted(task, value) {
  return task.accepted.includes(normalize(value));
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

function extractBlocks(markdown) {
  return [...markdown.matchAll(/```(bash|powershell)\n([\s\S]*?)```/gu)].map((match) => ({ language: match[1], code: match[2].trim() }));
}

function runGuideBlock(directory, block) {
  if (block.language === "bash") {
    const script = path.join(directory, "guide-block.sh");
    fs.writeFileSync(script, `${block.code}\n`, "utf8");
    return spawnSync(bashPath, [script], { cwd: directory, encoding: "utf8", timeout: 60000 });
  }
  const script = path.join(directory, "guide-block.ps1");
  fs.writeFileSync(script, `$ErrorActionPreference = 'Stop'\n${block.code}\n`, "utf8");
  return spawnSync(powershellPath, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], { cwd: directory, encoding: "utf8", timeout: 60000 });
}

test("TP6 generator remains deterministic and clean", () => {
  const first = buildSwbAssetsTp6();
  const second = buildSwbAssetsTp6();
  assert.deepEqual(Object.keys(first.facts), ["swbTp6"]);
  assert.equal(first.files.length, 5);
  assert.equal(JSON.stringify(first.facts), JSON.stringify(second.facts));
  first.files.forEach((file, index) => {
    assert.equal(file.name, second.files[index].name);
    assert.ok(file.data.equals(second.files[index].data), `octets identiques pour ${file.name}`);
    assert.ok(file.name.startsWith("swb-tp6-"), `prefixe attendu pour ${file.name}`);
    assert.notEqual(file.data[0], 0xef, `pas de BOM pour ${file.name}`);
    assert.equal(file.data.includes(Buffer.from("\r\n")), false, `pas de CRLF pour ${file.name}`);
    assert.equal((file.data.toString("utf8").match(/\*{6}/g) || []).length, 0, `pas de masque de secret recopie dans ${file.name}`);
  });
  ["scripts\\lab-scenarios-swb-tp6.cjs", "supabase\\seed\\content\\swb-lab-tp6.ts", "tests\\swb-lab-tp6.test.cjs"].forEach((relative) => {
    const content = fs.readFileSync(path.join(process.cwd(), relative), "utf8");
    assert.equal((content.match(/\*{6}/g) || []).length, 0, `pas de masque de secret recopie dans ${relative}`);
  });
});

test("TP6 definitions expose exactly one lab with matching assets", () => {
  const current = scenario();
  assert.equal(current.labs.length, 1);
  const [lab] = current.labs;
  assert.equal(lab.slug, "tp-web-config-cvss");
  assert.equal(lab.tasks.length, 15);
  assert.deepEqual(labIssues(lab), [], "aucun probleme de qualite");
  const declared = new Set(lab.assets.map((asset) => asset.url.replace("/labs/", "")));
  const generated = new Set(current.built.files.map((file) => file.name));
  assert.deepEqual([...declared].sort(), [...generated].sort());
});

test("TP6 answers are recomputed independently from generated files", () => {
  const current = scenario();
  const [lab] = current.labs;
  const configLines = current.text("swb-tp6-nginx.conf").trimEnd().split("\n");
  const root = parseCsv(current.text("swb-tp6-racine-site.txt"));
  const dependencies = new Map(parseCsv(current.text("swb-tp6-dependances.csv")).map((row) => [row.paquet, row.version]));
  const advisories = parseCsv(current.text("swb-tp6-avis.csv")).map((row) => {
    const installed = dependencies.get(row.paquet);
    const applies = installed ? inRange(installed, row.plage_touchee) : false;
    const score = cvss(row.vecteur_cvss31);
    return { ...row, installed, applies, score };
  });

  const defectCount = [
    configLines.some((line) => /^server_tokens on;$/u.test(line.trim())),
    configLines.some((line) => /^ssl_protocols [^;]*\bTLSv1(?:\.1)?(?=\s|;)/u.test(line.trim())),
    !configLines.some((line) => /Strict-Transport-Security/u.test(line)),
    !configLines.some((line) => /Content-Security-Policy/u.test(line)),
    !configLines.some((line) => /X-Content-Type-Options/u.test(line)),
    configLines.some((line) => /^autoindex on;$/u.test(line.trim())),
    configLines.some((line) => /Cache-Control "public, max-age=600"/u.test(line)),
  ].filter(Boolean).length;
  assert.ok(accepted(lab.tasks[0], defectCount));
  assert.ok(accepted(lab.tasks[1], lineOf(configLines, /^\s*autoindex on;$/u)));
  assert.ok(accepted(lab.tasks[2], lineOf(configLines, /^\s*ssl_protocols /u)));

  const affectedPackages = new Set(advisories.filter((row) => row.applies).map((row) => row.paquet));
  assert.ok(accepted(lab.tasks[3], affectedPackages.size));

  const highest = advisories.filter((row) => row.applies).sort((a, b) => b.score - a.score || a.identifiant.localeCompare(b.identifiant))[0];
  assert.ok(accepted(lab.tasks[4], highest.identifiant));

  const adv006 = advisories.find((row) => row.identifiant === "swb-adv-2026-006");
  assert.ok(accepted(lab.tasks[5], adv006.score.toFixed(1)));
  assert.ok(accepted(lab.tasks[5], adv006.score.toFixed(1).replace(".", ",")));

  const adv009 = advisories.find((row) => row.identifiant === "swb-adv-2026-009");
  assert.ok(accepted(lab.tasks[6], severityLetter(adv009.score)));

  const criticalAffectedCount = advisories.filter((row) => row.applies && row.score >= 9).length;
  assert.ok(accepted(lab.tasks[7], criticalAffectedCount));

  const majorUpgrade = advisories.find((row) => row.applies && parseVersion(row.version_corrigee)[0] > parseVersion(row.installed)[0]).paquet;
  assert.ok(accepted(lab.tasks[8], majorUpgrade));

  const resafetchSafe = advisories.filter((row) => row.paquet === "resafetch").map((row) => row.version_corrigee).sort(compareVersions).slice(-1)[0];
  assert.ok(accepted(lab.tasks[9], resafetchSafe));

  const fixedAlready = advisories.filter((row) => row.installed && !row.applies && compareVersions(row.installed, row.version_corrigee) >= 0).length;
  assert.ok(accepted(lab.tasks[10], fixedAlready));

  assert.ok(root.some((row) => row.chemin === "/.env" && row.statut === "200"));
  assert.ok(accepted(lab.tasks[11], "c"));

  const neverPublic = root.filter((row) => row.statut === "200" && ["/.env", "/.git/HEAD", "/phpinfo.php", "/sauvegarde.zip"].includes(row.chemin)).length;
  assert.ok(accepted(lab.tasks[12], neverPublic));

  assert.ok(advisories.some((row) => row.applies && row.exploitation_connue === "oui" && row.exposition === "internet"));
  assert.ok(accepted(lab.tasks[13], "c"));
  assert.ok(accepted(lab.tasks[14], "d"));
});

test("TP6 guide blocks run and the guide does not leak another answer", {
  skip: !fs.existsSync(bashPath) || !fs.existsSync(powershellPath) ? "Git Bash ou PowerShell absent" : false,
}, () => {
  const current = scenario();
  const [lab] = current.labs;
  const guideText = current.text("swb-tp6-guide.md");
  const guideNorm = normalize(guideText);
  const generalText = normalize([lab.briefing, ...lab.constraints, ...lab.objectives, ...lab.hints].join("\n"));

  lab.tasks.forEach((task, taskIndex) => {
    for (const answer of significantAnswers(task)) {
      assert.equal(containsAnswer(guideNorm, answer), false, `guide divulgue ${answer}`);
      assert.equal(containsAnswer(generalText, answer), false, `texte general divulgue ${answer}`);
      lab.tasks.forEach((other, otherIndex) => {
        if (otherIndex === taskIndex) return;
        assert.equal(containsAnswer(normalize(`${other.prompt}\n${other.hint}`), answer), false, `autre tache divulgue ${answer}`);
      });
    }
  });

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "swb-tp6-guide-"));
  try {
    for (const block of extractBlocks(guideText)) {
      const result = runGuideBlock(directory, block);
      assert.equal(result.status, 0, `${block.language} en echec: ${result.stderr}`);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
