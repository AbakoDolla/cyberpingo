const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildPtAssetsProj } = require("../scripts/lab-scenarios-pt-proj.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");
const { load } = require("../scripts/ts-loader.cjs");

const BASH_PATH = "C:\\Program Files\\Git\\bin\\bash.exe";
const POWERSHELL_PATH = process.env.WINDIR
  ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const STAR_MASK = "*".repeat(6);

const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const simplify = (value) => normalize(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, "_");
const compact = (values) => Array.from(new Set(values.map((value) => normalize(value))));
const accept = (task, value) => task.accepted.includes(normalize(value));
const controlChars = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u;
const ignoredAnswers = new Set(["oui", "non", "yes", "no", "constat", "hypothese"]);
const leakExceptions = {
  "projet-pt-rapport/pt-proj-cadrage.md": true,
  "projet-pt-rapport/pt-proj-grille-risque.md": true,
};

function parseCsv(content) {
  const lines = content.trim().split("\n");
  const headers = lines.shift().split(";");
  return lines.map((line) => {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      if (char === "\"") {
        if (quoted && line[index + 1] === "\"") {
          current += "\"";
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

function parseNmap(content) {
  const hosts = [];
  for (const block of content.match(/<host>[\s\S]*?<\/host>/g) ?? []) {
    const state = block.match(/<status state="([^"]+)"/)?.[1] ?? "";
    const ip = block.match(/<address addr="([^"]+)"/)?.[1] ?? "";
    const hostname = block.match(/<hostname name="([^"]+)"/)?.[1] ?? "";
    const ports = [...block.matchAll(/<port protocol="tcp" portid="(\d+)">[\s\S]*?<state state="([^"]+)"/g)].map((match) => ({
      port: Number(match[1]),
      state: match[2],
    }));
    hosts.push({ state, ip, hostname, ports });
  }
  return hosts;
}

function parseWebHistory(content) {
  return content.trim().split("\n").map((line) => JSON.parse(line));
}

function parseMission(content) {
  return content.trim().split("\n").map((line) => {
    const entry = { ts: line.slice(0, 20) };
    for (const match of line.matchAll(/([a-z_]+)=(".*?"|\S+)/g)) {
      entry[match[1]] = match[2].startsWith("\"") ? match[2].slice(1, -1) : match[2];
    }
    return entry;
  });
}

function parsePromptOptions(prompt) {
  const matches = [...prompt.matchAll(/([a-d])\) ([\s\S]*?)(?= [a-d]\) |$)/g)];
  return Object.fromEntries(matches.map((match) => [match[1], normalize(match[2])]));
}

function parseGuideBlocks(markdown) {
  return [...markdown.matchAll(/```(bash|powershell)\n([\s\S]*?)```/g)].map((match) => ({ language: match[1], code: match[2].trim() }));
}

function runBlock(directory, block) {
  if (block.language === "bash") {
    const scriptPath = path.join(directory, "guide-check.sh");
    fs.writeFileSync(scriptPath, `#!/usr/bin/env bash\nset -euo pipefail\n${block.code}\n`, "utf8");
    return spawnSync(BASH_PATH, [scriptPath], { cwd: directory, encoding: "utf8", timeout: 60000 });
  }
  const scriptPath = path.join(directory, "guide-check.ps1");
  fs.writeFileSync(scriptPath, `$ErrorActionPreference = "Stop"\n${block.code}\n`, "utf8");
  return spawnSync(POWERSHELL_PATH, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], { cwd: directory, encoding: "utf8", timeout: 60000 });
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

function sixStarsCount(filePath) {
  const result = spawnSync(process.execPath, ["-e", "const fs=require('fs');const s=fs.readFileSync(process.argv[1],'utf8');console.log((s.match(/\\*{6}/g)||[]).length);", filePath], {
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `compteur ${STAR_MASK} exécutable pour ${filePath}`);
  assert.match(result.stdout.trim(), /^\d+$/u, `sortie numérique pour ${filePath}`);
  return Number(result.stdout.trim());
}

function cvssScore(vector) {
  const metrics = {
    AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
    AC: { L: 0.77, H: 0.44 },
    UI: { N: 0.85, R: 0.62 },
    CIA: { H: 0.56, L: 0.22, N: 0 },
    PR: {
      U: { N: 0.85, L: 0.62, H: 0.27 },
      C: { N: 0.85, L: 0.68, H: 0.5 },
    },
  };
  const values = Object.fromEntries(vector.split("/").slice(1).map((part) => part.split(":")));
  const scope = values.S;
  const iss = 1 - (1 - metrics.CIA[values.C]) * (1 - metrics.CIA[values.I]) * (1 - metrics.CIA[values.A]);
  const impact = scope === "U" ? 6.42 * iss : 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15;
  const exploitability = 8.22 * metrics.AV[values.AV] * metrics.AC[values.AC] * metrics.PR[scope][values.PR] * metrics.UI[values.UI];
  if (impact <= 0) return 0;
  const raw = scope === "U" ? Math.min(impact + exploitability, 10) : Math.min(1.08 * (impact + exploitability), 10);
  const scaled = Math.round(raw * 100000);
  if (scaled % 10000 === 0) return scaled / 100000;
  return (Math.floor(scaled / 10000) + 1) / 10;
}

function gridFactorTables(grid) {
  const factors = {};
  for (const match of grid.matchAll(/\|\s*(surface|criticite_metier|preuve|kev|epss_30j)\s*\|\s*([^|]+)\|\s*([0-9,]+)\s*\|/g)) {
    if (!factors[match[1]]) factors[match[1]] = {};
    factors[match[1]][simplify(match[2])] = Number(match[3].replace(",", "."));
  }
  return factors;
}

function epssFactor(value, table) {
  if (value >= 0.7) return table["superieur_ou_egal_a_0,70"];
  if (value >= 0.3) return table["de_0,30_a_0,69"];
  return table["inferieur_a_0,30"];
}

function deriveExpected(fileMap, lab) {
  const cadrage = fileMap.get("pt-proj-cadrage.md");
  const osint = parseCsv(fileMap.get("pt-proj-osint.csv"));
  const nmapHosts = parseNmap(fileMap.get("pt-proj-nmap.xml"));
  const findings = parseCsv(fileMap.get("pt-proj-vulns.csv"));
  const web = parseWebHistory(fileMap.get("pt-proj-web-history.jsonl"));
  const mission = parseMission(fileMap.get("pt-proj-journal-mission.log"));
  const grid = fileMap.get("pt-proj-grille-risque.md");
  const factors = gridFactorTables(grid);

  const appScopeFqdn = [...cadrage.matchAll(/\|\s*([a-z0-9.-]+)\s*\|[^|]+\|[^|]+\|\s*en périmètre applicatif\s*\|/giu)][0][1];
  const forbiddenActionId = [...cadrage.matchAll(/\|\s*(R\d{2})\s*\|\s*([^|]+)\|\s*jamais\s*\|/giu)].find((match) => /saturation|forçage|exécutable/u.test(match[2]))[1].toLowerCase();

  const absentOsint = new Map();
  for (const row of osint) {
    if (row.source === "dns_zone") continue;
    if (row.dns_statut !== "absent") continue;
    absentOsint.set(row.fqdn, (absentOsint.get(row.fqdn) || 0) + 1);
  }
  const osintMissingRanking = [...absentOsint.entries()].sort((left, right) => right[1] - left[1]);
  assert.ok(osintMissingRanking[0][1] > osintMissingRanking[1][1], "maximum de lignes OSINT absentes du DNS non strict");
  const osintMissingFqdn = osintMissingRanking[0][0];

  const techCounts = new Map();
  for (const row of osint) {
    if (!techCounts.has(row.technologie)) techCounts.set(row.technologie, new Set());
    techCounts.get(row.technologie).add(row.source);
  }
  const techRanking = [...techCounts.entries()].sort((left, right) => right[1].size - left[1].size);
  assert.ok(techRanking[0][1].size > techRanking[1][1].size, "technologie la plus corroborée non strictement maximale");
  const osintTopTechnology = techRanking[0][0];

  const nmapUpHostCount = String(new Set(nmapHosts.filter((host) => host.state === "up").map((host) => host.ip)).size);
  const expectedServices = Object.fromEntries([...cadrage.matchAll(/\|\s*([a-z0-9.-]+)\s*\|\s*([0-9, ]+)\s*\|/giu)].map((match) => [match[1], match[2].split(",").map((part) => Number(part.trim()))]));
  let nmapUnexpectedOpen = "";
  for (const host of nmapHosts.filter((entry) => entry.state === "up")) {
    for (const port of host.ports.filter((entry) => entry.state === "open")) {
      const allowed = expectedServices[host.hostname] ?? [];
      if (!allowed.includes(port.port)) nmapUnexpectedOpen = `${host.hostname}:${port.port}`;
    }
  }

  const falsePositiveId = findings.find((row) => row.validation_humaine === "faux_positif").id.toLowerCase();
  const confirmedFindingId = findings.find((row) => row.validation_humaine === "constat" && row.preuve === "suffisante" && row.surface === "vpn").id.toLowerCase();

  const noteIds = new Set(web.filter((entry) => entry.kind === "request" && ["objet_etranger_recu", "export_etranger_confirme"].includes(entry.observation)).map((entry) => entry.note_id));
  const webAccessControlId = web.find((entry) => entry.kind === "note" && entry.theme === "controle_acces" && entry.verdict === "constat" && noteIds.has(entry.note_id)).note_id.toLowerCase();
  const webAccessControlOwasp = (grid.match(/\|\s*(a01)\s*\|\s*Broken Access Control/iu) ?? [])[1].toLowerCase();

  const firstRoeTime = mission.find((entry) => entry.event === "roe_ecart").ts.slice(11, 19).toLowerCase();
  const cleanupRemainingId = mission.find((entry) => entry.event === "nettoyage" && entry.statut === "ouvert").item.toLowerCase();

  const focusTaskMatch = lab.tasks[12].prompt.match(/constat (F\d{2})/u);
  const focusId = focusTaskMatch[1];
  const focusFinding = findings.find((row) => row.id === focusId);
  const focusFindingCvss = cvssScore(focusFinding.vecteur_cvss).toFixed(1);
  const focusFindingPriority = Number((
    cvssScore(focusFinding.vecteur_cvss)
    * factors.surface[focusFinding.surface]
    * factors.criticite_metier[focusFinding.criticite_metier]
    * factors.preuve[focusFinding.preuve]
    * factors.kev[focusFinding.kev]
    * epssFactor(Number(focusFinding.epss_30j), factors.epss_30j)
  ).toFixed(1)).toFixed(1);

  const confirmedRows = findings.filter((row) => row.validation_humaine === "constat").map((row) => ({
    id: row.id.toLowerCase(),
    score: cvssScore(row.vecteur_cvss),
    priority: Number((
      cvssScore(row.vecteur_cvss)
      * factors.surface[row.surface]
      * factors.criticite_metier[row.criticite_metier]
      * factors.preuve[row.preuve]
      * factors.kev[row.kev]
      * epssFactor(Number(row.epss_30j), factors.epss_30j)
    ).toFixed(1)),
  })).sort((left, right) => right.priority - left.priority || right.score - left.score || left.id.localeCompare(right.id));
  const topPriorityId = confirmedRows[0].id;

  const options16 = parsePromptOptions(lab.tasks[15].prompt);
  const executiveSummaryLetter = Object.entries(options16).find(([, text]) => text.includes("constats confirmés") && text.includes("correction prioritaire"))[0];
  const options17 = parsePromptOptions(lab.tasks[16].prompt);
  const recommendationLetter = Object.entries(options17).find(([, text]) => text.includes("chaque bon de commande appartient") && text.includes("journaliser les refus"))[0];
  const options18 = parsePromptOptions(lab.tasks[17].prompt);
  const firstActionsLetter = Object.entries(options18).find(([, text]) => text.includes("contrôle d’accès du portail") && text.includes("port inattendu de stock") && text.includes("composant tiers"))[0];

  const evidenceStatus = mission.find((entry) => entry.item === "H02").corroboration === "absente" ? "hypothese" : "constat";

  return {
    appScopeFqdn,
    forbiddenActionId,
    osintMissingFqdn,
    osintTopTechnology,
    nmapUpHostCount,
    nmapUnexpectedOpen,
    falsePositiveId,
    confirmedFindingId,
    webAccessControlId,
    webAccessControlOwasp,
    firstRoeTime,
    cleanupRemainingId,
    focusFindingCvss,
    focusFindingPriority,
    topPriorityId,
    executiveSummaryLetter,
    recommendationLetter,
    firstActionsLetter,
    evidenceStatus,
  };
}

test("les assets du projet pentest sont déterministes et restent dans les volumes attendus", () => {
  const first = buildPtAssetsProj();
  const second = buildPtAssetsProj();
  assert.equal(JSON.stringify(first.facts), JSON.stringify(second.facts));
  assert.equal(first.files.length, 9);

  const ranges = {
    "pt-proj-cadrage.md": [100, 140],
    "pt-proj-osint.csv": [60, 90],
    "pt-proj-nmap.xml": [220, 320],
    "pt-proj-vulns.csv": [30, 50],
    "pt-proj-web-history.jsonl": [140, 240],
    "pt-proj-journal-mission.log": [160, 240],
    "pt-proj-grille-risque.md": [70, 110],
    "pt-proj-modele-rapport.md": [80, 120],
    "pt-proj-guide.md": [80, 110],
  };

  for (let index = 0; index < first.files.length; index += 1) {
    const left = first.files[index];
    const right = second.files[index];
    assert.equal(left.name, right.name);
    assert.ok(left.data.equals(right.data), `octets identiques pour ${left.name}`);
    const content = left.data.toString("utf8");
    assert.ok(!content.startsWith("\ufeff"), `pas de BOM pour ${left.name}`);
    assert.ok(!content.includes("\r\n"), `pas de CRLF pour ${left.name}`);
    assert.ok(!controlChars.test(content), `pas de caractère de contrôle pour ${left.name}`);
    const lineCount = content.trimEnd().split("\n").length;
    assert.ok(lineCount >= ranges[left.name][0] && lineCount <= ranges[left.name][1], `${left.name} dans la plage attendue`);
  }
});

test("la définition TypeScript déclare exactement le laboratoire final attendu", () => {
  const built = buildPtAssetsProj();
  const { buildPtLabProj } = load("supabase/seed/content/pt-lab-proj");
  const labs = buildPtLabProj(built.facts);
  assert.equal(labs.length, 1);
  const [lab] = labs;
  assert.equal(lab.slug, "projet-pt-rapport");
  assert.equal(lab.isAssessment, true);
  assert.equal(lab.tasks.length, 19);
  assert.deepEqual(labIssues(lab), []);
  const declared = new Set(lab.assets.map((asset) => asset.url.replace("/labs/", "")));
  const generated = new Set(built.files.map((file) => file.name));
  assert.deepEqual([...declared].sort(), [...generated].sort());
});

test("les réponses du projet pentest se recalculent depuis les fichiers et les énoncés", () => {
  const built = buildPtAssetsProj();
  const { buildPtLabProj } = load("supabase/seed/content/pt-lab-proj");
  const [lab] = buildPtLabProj(built.facts);
  const fileMap = new Map(built.files.map((file) => [file.name, file.data.toString("utf8")]));
  const nmapXml = fileMap.get("pt-proj-nmap.xml");
  const riskGrid = fileMap.get("pt-proj-grille-risque.md");
  assert.match(nmapXml, /<verbose level="0"\/>/u);
  assert.match(nmapXml, /<debugging level="0"\/>/u);
  assert.match(nmapXml, /<service name="http" tunnel="ssl"/u);
  assert.match(nmapXml, /<times srtt="/u);
  assert.match(riskGrid, /\| 0,0 \| None \|/u);
  assert.match(riskGrid, /EPSS estime la probabilité d’exploitation dans la nature sur les 30 prochains jours/u);
  assert.match(riskGrid, /KEV recense les vulnérabilités déjà exploitées dans la nature/u);
  const expected = deriveExpected(fileMap, lab);

  assert.ok(accept(lab.tasks[0], expected.appScopeFqdn));
  assert.ok(accept(lab.tasks[1], expected.forbiddenActionId));
  assert.ok(accept(lab.tasks[2], expected.osintMissingFqdn));
  assert.ok(accept(lab.tasks[3], expected.osintTopTechnology));
  assert.ok(accept(lab.tasks[4], expected.nmapUpHostCount));
  assert.ok(accept(lab.tasks[5], expected.nmapUnexpectedOpen));
  assert.ok(accept(lab.tasks[6], expected.falsePositiveId));
  assert.ok(accept(lab.tasks[7], expected.confirmedFindingId));
  assert.ok(accept(lab.tasks[8], expected.webAccessControlId));
  assert.ok(accept(lab.tasks[9], expected.webAccessControlOwasp));
  assert.ok(accept(lab.tasks[10], expected.firstRoeTime));
  assert.ok(accept(lab.tasks[11], expected.cleanupRemainingId));
  assert.ok(accept(lab.tasks[12], expected.focusFindingCvss));
  assert.ok(accept(lab.tasks[13], expected.focusFindingPriority));
  assert.ok(accept(lab.tasks[14], expected.topPriorityId));
  assert.ok(accept(lab.tasks[15], expected.executiveSummaryLetter));
  assert.ok(accept(lab.tasks[16], expected.recommendationLetter));
  assert.ok(accept(lab.tasks[17], expected.firstActionsLetter));
  assert.ok(accept(lab.tasks[18], expected.evidenceStatus));
});

test("les guides, documents formels et modèles ne divulguent pas les réponses hors exceptions prévues", () => {
  const built = buildPtAssetsProj();
  const { buildPtLabProj } = load("supabase/seed/content/pt-lab-proj");
  const [lab] = buildPtLabProj(built.facts);
  const files = new Map(built.files.map((file) => [file.name, file.data.toString("utf8")]));
  const documents = lab.assets
    .filter((asset) => asset.kind === "guide" || asset.kind === "report_template")
    .map((asset) => ({ name: asset.url.replace("/labs/", ""), text: files.get(asset.url.replace("/labs/", "")) }));
  const support = normalize([lab.briefing, ...lab.objectives, ...lab.constraints, ...lab.hints].join("\n"));
  const guideText = normalize(documents.filter((document) => !leakExceptions[`${lab.slug}/${document.name}`]).map((document) => document.text).join("\n"));

  for (const task of lab.tasks) {
    for (const answer of significantAnswers(task)) {
      assert.equal(containsAnswer(guideText, answer), false, `réponse « ${answer} » divulguée dans un guide ou un modèle`);
      assert.equal(containsAnswer(support, answer), false, `réponse « ${answer} » divulguée dans le support général`);
    }
  }
});

test("les blocs bash et powershell du guide tournent avec une sortie non vide", {
  skip: !fs.existsSync(BASH_PATH) || !fs.existsSync(POWERSHELL_PATH) ? "Git Bash ou PowerShell absent" : false,
}, () => {
  const built = buildPtAssetsProj();
  const guide = built.files.find((file) => file.name === "pt-proj-guide.md").data.toString("utf8");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pt-proj-guide-"));
  try {
    for (const file of built.files) fs.writeFileSync(path.join(directory, file.name), file.data);
    for (const block of parseGuideBlocks(guide)) {
      const result = runBlock(directory, block);
      assert.equal(result.status, 0, `${block.language} sort avec le code 0`);
      assert.notEqual(normalize(`${result.stdout}\n${result.stderr}`), "", `${block.language} produit une sortie non vide`);
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("aucune suite de six astérisques n’est recopiée dans les sources ni dans les fichiers générés", () => {
  const built = buildPtAssetsProj();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pt-proj-stars-"));
  try {
    for (const file of built.files) {
      const target = path.join(directory, file.name);
      fs.writeFileSync(target, file.data);
      assert.equal(sixStarsCount(target), 0, `pas de ${STAR_MASK} dans ${file.name}`);
    }
    for (const source of [
      path.join(__dirname, "..", "scripts", "lab-scenarios-pt-proj.cjs"),
      path.join(__dirname, "..", "supabase", "seed", "content", "pt-lab-proj.ts"),
      path.join(__dirname, "pt-lab-proj.test.cjs"),
    ]) assert.equal(sixStarsCount(source), 0, `pas de ${STAR_MASK} dans ${path.basename(source)}`);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
