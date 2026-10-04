const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildSwbAssetsProj } = require("../scripts/lab-scenarios-swb-proj.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");
const { load } = require("../scripts/ts-loader.cjs");

const BASH_PATH = "C:\\Program Files\\Git\\bin\\bash.exe";
const POWERSHELL_PATH = "powershell.exe";
const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const accept = (task, value) => task.accepted.includes(normalize(value));
const controlChars = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u;

function parseCsv(content) {
  const lines = content.trim().split("\n");
  const headers = lines.shift().split(";");
  return lines.map((line) => {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else quoted = !quoted;
      } else if (char === ";" && !quoted) {
        cells.push(current);
        current = "";
      } else current += char;
    }
    cells.push(current);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function parseHeaders(content) {
  return content.trim().split("\n\n").map((block) => {
    const lines = block.split("\n");
    const title = lines.shift().replace("### Réponse ", "");
    const headers = {};
    for (const line of lines.slice(1)) {
      const split = line.indexOf(":");
      if (split < 0) continue;
      headers[line.slice(0, split).toLowerCase()] = line.slice(split + 1).trim();
    }
    return { title, headers };
  });
}

function parseJournal(content) {
  return content.trim().split("\n").map((line) => {
    const match = /^(\S+) - - \[(\d{2})\/\w+\/\d{4}:(\d{2}:\d{2}:\d{2}) \+0000\] "(\S+) (\S+) HTTP\/1\.1" (\d{3}) (\d+)/.exec(line);
    assert.ok(match, `ligne journal reconnue: ${line}`);
    return { ip: match[1], day: match[2], time: match[3], method: match[4], requestPath: match[5], status: Number(match[6]), bytes: Number(match[7]), line };
  });
}

function parseTls(content) {
  return Object.fromEntries(content.trim().split("\n").filter((line) => line.includes(":")).map((line) => {
    const split = line.indexOf(":");
    return [line.slice(0, split).trim(), line.slice(split + 1).trim()];
  }));
}

function parseGuideBlocks(markdown, language) {
  const regex = new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\`\`\``, "g");
  const blocks = [];
  let match;
  while ((match = regex.exec(markdown)) !== null) blocks.push(match[1].trim());
  return blocks;
}

function runBash(directory, code) {
  const scriptPath = path.join(directory, "guide-check.sh");
  fs.writeFileSync(scriptPath, `#!/usr/bin/env bash\nset -euo pipefail\n${code}\n`, "utf8");
  return spawnSync(BASH_PATH, [scriptPath], { cwd: directory, encoding: "utf8" });
}

function runPowerShell(directory, code) {
  const scriptPath = path.join(directory, "guide-check.ps1");
  fs.writeFileSync(scriptPath, `$ErrorActionPreference = "Stop"\n${code}\n`, "utf8");
  return spawnSync(POWERSHELL_PATH, ["-NoProfile", "-File", scriptPath], { cwd: directory, encoding: "utf8" });
}

function writeAssets(directory, files) {
  for (const file of files) fs.writeFileSync(path.join(directory, file.name), file.data);
}

function roundup(value) {
  const scaled = Math.round(value * 100000);
  if (scaled % 10000 === 0) return scaled / 100000;
  return (Math.floor(scaled / 10000) + 1) / 10;
}

function cvssScore(vector) {
  const values = Object.fromEntries(vector.split("/").slice(1).map((part) => part.split(":")));
  const metric = {
    AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
    AC: { L: 0.77, H: 0.44 },
    UI: { N: 0.85, R: 0.62 },
    CIA: { H: 0.56, L: 0.22, N: 0 },
    PR: {
      U: { N: 0.85, L: 0.62, H: 0.27 },
      C: { N: 0.85, L: 0.68, H: 0.5 },
    },
  };
  const scope = values.S;
  const iss = 1 - (1 - metric.CIA[values.C]) * (1 - metric.CIA[values.I]) * (1 - metric.CIA[values.A]);
  const impact = scope === "U" ? 6.42 * iss : 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15;
  const exploitability = 8.22 * metric.AV[values.AV] * metric.AC[values.AC] * metric.PR[scope][values.PR] * metric.UI[values.UI];
  if (impact <= 0) return 0;
  const raw = scope === "U" ? Math.min(impact + exploitability, 10) : Math.min(1.08 * (impact + exploitability), 10);
  return roundup(raw);
}

function compareVersion(left, right) {
  const a = String(left).split(".").map(Number);
  const b = String(right).split(".").map(Number);
  const size = Math.max(a.length, b.length);
  for (let index = 0; index < size; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return delta < 0 ? -1 : 1;
  }
  return 0;
}

function deriveExpected(fileMap) {
  const findings = parseCsv(fileMap.get("swb-proj-constats.csv"));
  const dependencies = parseCsv(fileMap.get("swb-proj-dependances.csv"));
  const advisories = parseCsv(fileMap.get("swb-proj-avis.csv"));
  const headers = parseHeaders(fileMap.get("swb-proj-en-tetes.txt"));
  const journal = parseJournal(fileMap.get("swb-proj-journaux.log"));
  const tls = parseTls(fileMap.get("swb-proj-tls.txt"));
  const codeLines = fileMap.get("swb-proj-code.js").split("\n");

  const certainty = { confirmée: 4, démontrée: 3, plausible: 2, scanner: 1 };
  const byId = Object.fromEntries(findings.map((row) => [row.id, row]));
  const scores = {};
  const priorities = {};
  for (const row of findings) {
    if (row.vecteur_cvss) scores[row.id] = cvssScore(row.vecteur_cvss);
    if (scores[row.id] !== undefined) priorities[row.id] = Number((scores[row.id] * Number(row.criticite_actif) * certainty[row.certitude]).toFixed(1));
  }
  const topFinding = Object.entries(priorities).sort((left, right) => right[1] - left[1])[0][0].slice(1);

  const touched = advisories.filter((advisory) => dependencies.some((dep) => dep.package === advisory.package && compareVersion(dep.version, advisory.affected_from) >= 0 && compareVersion(dep.version, advisory.affected_to_excluded) < 0));
  assert.ok(touched.some((row) => row.package === "express-fileupload"));

  const loginHeaders = headers.find((entry) => entry.title.includes("/connexion"));
  assert.ok(loginHeaders.headers["strict-transport-security"]);
  const firstUpload = journal.find((entry) => entry.method === "POST" && entry.requestPath === "/espace-partenaires/upload" && entry.status === 201);
  const webshell = journal.find((entry) => entry.requestPath.includes("/uploads/brochure.php?cmd="));
  assert.ok(firstUpload && webshell);
  const secretLine = codeLines.findIndex((line) => line.includes("CLE_EXEMPLE_RESA_2026")) + 1;
  const protocols = tls["Protocoles acceptés"].split(",").map((part) => part.trim());

  return {
    categories: {
      F01: byId.F01.titre.includes("SQL") ? "a05" : "",
      F02: byId.F02.titre.includes("HTML") ? "a05" : "",
      F03: byId.F03.titre.includes("réservation") ? "a01" : "",
      F04: secretLine > 0 ? "a07" : "",
      F05: byId.F05.titre.includes("internes") ? "a01" : "",
      F07: touched.some((row) => row.package === "express-fileupload") ? "a03" : "",
    },
    scores,
    priorities,
    topFinding,
    falsePositive: !loginHeaders.headers["strict-transport-security"] ? "" : "08",
    exploitedFinding: firstUpload && webshell ? "06" : "",
    firstExploitTuple: `${firstUpload.time}, ${firstUpload.ip}`,
    tlsLetter: protocols.includes("TLSv1.0") || protocols.includes("TLSv1.1") ? "b" : "",
    recommendationLetter: fileMap.get("swb-proj-code.js").includes("const sql = \"select id, room_name, city, price from rooms where city = '\" + city + \"'") ? "c" : "",
    secretLine,
  };
}

test("les assets du projet web restent deterministes et propres", () => {
  const first = buildSwbAssetsProj();
  const second = buildSwbAssetsProj();
  assert.equal(JSON.stringify(first.facts), JSON.stringify(second.facts));
  assert.equal(first.files.length, 11);
  for (let index = 0; index < first.files.length; index += 1) {
    const left = first.files[index];
    const right = second.files[index];
    assert.equal(left.name, right.name);
    assert.ok(left.data.equals(right.data), `octets identiques pour ${left.name}`);
    const content = left.data.toString("utf8");
    assert.ok(!content.startsWith("\ufeff"), `pas de BOM pour ${left.name}`);
    assert.ok(!content.includes("\r\n"), `pas de CRLF pour ${left.name}`);
    assert.ok(!controlChars.test(content), `pas de caractere de controle pour ${left.name}`);
    assert.equal((content.match(/\*{6}/g) || []).length, 0, `pas de secret masque recopie dans ${left.name}`);
  }
  const lineCounts = Object.fromEntries(first.files.map((file) => [file.name, file.data.toString("utf8").trimEnd().split("\n").length]));
  assert.ok(lineCounts["swb-proj-journaux.log"] >= 300 && lineCounts["swb-proj-journaux.log"] <= 600);
  assert.ok(lineCounts["swb-proj-code.js"] >= 200 && lineCounts["swb-proj-code.js"] <= 300);
  for (const filePath of [
    path.join(__dirname, "..", "scripts", "lab-scenarios-swb-proj.cjs"),
    path.join(__dirname, "..", "supabase", "seed", "content", "swb-lab-proj.ts"),
    path.join(__dirname, "swb-lab-proj.test.cjs"),
  ]) {
    const content = fs.readFileSync(filePath, "utf8");
    assert.equal((content.match(/\*{6}/g) || []).length, 0, `pas de secret masque recopie dans ${path.basename(filePath)}`);
  }
});

test("la definition TypeScript declare exactement le labo final attendu", () => {
  const built = buildSwbAssetsProj();
  const { buildSwbLabProj } = load("supabase/seed/content/swb-lab-proj");
  const labs = buildSwbLabProj(built.facts);
  assert.equal(labs.length, 1);
  const [lab] = labs;
  assert.equal(lab.slug, "projet-web-audit");
  assert.equal(lab.isAssessment, true);
  assert.equal(lab.tasks.length, 19);
  assert.deepEqual(labIssues(lab), []);
  const declared = new Set(lab.assets.map((asset) => asset.url.replace("/labs/", "")));
  const generated = new Set(built.files.map((file) => file.name));
  assert.deepEqual([...declared].sort(), [...generated].sort());
});

test("les reponses du projet web se recalculent depuis les fichiers", () => {
  const built = buildSwbAssetsProj();
  const { buildSwbLabProj } = load("supabase/seed/content/swb-lab-proj");
  const [lab] = buildSwbLabProj(built.facts);
  const fileMap = new Map(built.files.map((file) => [file.name, file.data.toString("utf8")]));
  const expected = deriveExpected(fileMap);

  assert.ok(accept(lab.tasks[0], expected.categories.F01));
  assert.ok(accept(lab.tasks[1], expected.categories.F02));
  assert.ok(accept(lab.tasks[2], expected.categories.F03));
  assert.ok(accept(lab.tasks[3], expected.categories.F04));
  assert.ok(accept(lab.tasks[4], expected.categories.F05));
  assert.ok(accept(lab.tasks[5], expected.categories.F07));

  assert.ok(accept(lab.tasks[6], expected.scores.F01.toFixed(1)));
  assert.ok(accept(lab.tasks[7], expected.scores.F05.toFixed(1)));
  assert.ok(accept(lab.tasks[8], expected.scores.F07.toFixed(1)));

  assert.ok(accept(lab.tasks[9], expected.priorities.F01.toFixed(1)));
  assert.ok(accept(lab.tasks[10], expected.priorities.F05.toFixed(1)));
  assert.ok(accept(lab.tasks[11], expected.priorities.F07.toFixed(1)));

  assert.ok(expected.priorities.F07 > expected.priorities.F01);
  assert.ok(expected.priorities.F01 > expected.priorities.F05);
  assert.ok(accept(lab.tasks[12], expected.topFinding));
  assert.ok(accept(lab.tasks[13], expected.falsePositive));
  assert.ok(accept(lab.tasks[14], expected.exploitedFinding));
  assert.ok(accept(lab.tasks[15], expected.firstExploitTuple));
  assert.ok(accept(lab.tasks[16], expected.tlsLetter));
  assert.ok(accept(lab.tasks[17], expected.recommendationLetter));
  assert.ok(accept(lab.tasks[18], expected.secretLine));
});

test("le guide et le modele restent methodologiques et ne divulguent pas les reponses longues", () => {
  const built = buildSwbAssetsProj();
  const { buildSwbLabProj } = load("supabase/seed/content/swb-lab-proj");
  const [lab] = buildSwbLabProj(built.facts);
  const guideText = built.files.find((file) => file.name === "swb-proj-guide.md").data.toString("utf8");
  const reportText = built.files.find((file) => file.name === "swb-proj-modele-rapport.md").data.toString("utf8");
  assert.ok(!/swb-proj-/u.test(guideText), "le guide ne travaille pas sur les fichiers du labo");
  const support = normalize([lab.briefing, ...lab.objectives, ...lab.constraints, ...lab.hints].join("\n"));
  const docs = normalize(`${guideText}\n${reportText}`);
  lab.tasks.forEach((task, index) => {
    task.accepted.forEach((answer) => {
      const value = normalize(answer);
      if (value.length < 3 || ["oui", "non"].includes(value) || /^[a-z]$/.test(value) || /^\d{2}$/.test(value)) return;
      assert.equal(normalize(task.prompt).includes(value), false, `pas de fuite dans l'enonce ${index + 1}`);
      assert.equal(normalize(task.hint).includes(value), false, `pas de fuite dans l'indice ${index + 1}`);
      assert.equal(docs.includes(value), false, `pas de fuite dans les documents ${index + 1}`);
      assert.equal(support.includes(value), false, `pas de fuite dans le support ${index + 1}`);
      lab.tasks.forEach((other, otherIndex) => {
        if (otherIndex === index) return;
        assert.equal(normalize(`${other.prompt}\n${other.hint}`).includes(value), false, `pas de fuite croisee ${index + 1} -> ${otherIndex + 1}`);
      });
    });
  });
});

test("le code fourni reste syntaxiquement valide", () => {
  const built = buildSwbAssetsProj();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "swb-proj-code-"));
  try {
    writeAssets(tempDir, built.files);
    const result = spawnSync("node", ["--check", path.join(tempDir, "swb-proj-code.js")], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("les blocs bash et powershell du guide s’executent sur des donnees inventees", { skip: !fs.existsSync(BASH_PATH) }, () => {
  const built = buildSwbAssetsProj();
  const guide = built.files.find((file) => file.name === "swb-proj-guide.md").data.toString("utf8");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "swb-proj-guide-"));
  try {
    writeAssets(tempDir, built.files);
    for (const code of parseGuideBlocks(guide, "bash")) {
      const result = runBash(tempDir, code);
      assert.equal(result.status, 0, result.stderr || code);
      assert.notEqual(result.stdout.trim(), "", "sortie bash non vide");
    }
    for (const code of parseGuideBlocks(guide, "powershell")) {
      const result = runPowerShell(tempDir, code);
      assert.equal(result.status, 0, result.stderr || code);
      assert.notEqual(result.stdout.trim(), "", "sortie powershell non vide");
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
