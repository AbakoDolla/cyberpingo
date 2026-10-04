const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { URL } = require("node:url");
const { spawnSync } = require("node:child_process");

const { buildPtAssetsTp2 } = require("../scripts/lab-scenarios-pt-tp2.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR
  ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);

function scenario() {
  const generated = buildPtAssetsTp2();
  const { buildPtLabTp2 } = load("supabase/seed/content/pt-lab-tp2");
  const labs = buildPtLabTp2(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function parseCsv(raw) {
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((header, index) => { row[header] = values[index]; });
    return row;
  });
}

const parseJsonl = (raw) => raw.trim().split("\n").map((line) => JSON.parse(line));

function parseJobs(raw) {
  return raw.trim().split(/\n\s*\n/u).map((block) => {
    const lines = block.split("\n").filter(Boolean);
    const valueOf = (label) => {
      const line = lines.find((entry) => entry.startsWith(label));
      return line ? line.slice(label.length).trim() : "";
    };
    return {
      id: valueOf("=== Annonce "),
      technologies: valueOf("Technologies:").split(";").map((value) => value.trim().toLowerCase()).filter(Boolean),
      database: valueOf("Base de données:").toLowerCase(),
      internalTool: valueOf("Outil interne mentionné:").toLowerCase(),
    };
  });
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
  const lab = current.labs[0];
  assert.equal(current.labs.length, 1);
  assert.equal(lab.slug, "tp-pt-osint");
  assert.equal(lab.tasks.length, 15);
  assert.deepEqual([...current.files.keys()].sort(), [
    "pt-tp2-annonces-emploi.txt",
    "pt-tp2-cert-transparency.jsonl",
    "pt-tp2-dns-public.csv",
    "pt-tp2-guide.md",
    "pt-tp2-pages-publiques.jsonl",
    "pt-tp2-whois.txt",
  ]);
  assert.deepEqual(labIssues(lab), []);
  const lineCounts = Object.fromEntries([...current.files.entries()].map(([name, buffer]) => [name, buffer.toString("utf8").split("\n").length]));
  assert.ok(lineCounts["pt-tp2-dns-public.csv"] >= 45 && lineCounts["pt-tp2-dns-public.csv"] <= 70);
  assert.ok(lineCounts["pt-tp2-cert-transparency.jsonl"] >= 35 && lineCounts["pt-tp2-cert-transparency.jsonl"] <= 55);
  assert.ok(lineCounts["pt-tp2-whois.txt"] >= 60 && lineCounts["pt-tp2-whois.txt"] <= 90);
  assert.ok(lineCounts["pt-tp2-pages-publiques.jsonl"] >= 30 && lineCounts["pt-tp2-pages-publiques.jsonl"] <= 50);
  assert.ok(lineCounts["pt-tp2-annonces-emploi.txt"] >= 70 && lineCounts["pt-tp2-annonces-emploi.txt"] <= 110);
  assert.ok(lineCounts["pt-tp2-guide.md"] >= 70 && lineCounts["pt-tp2-guide.md"] <= 100);
});

test("TP2 files are deterministic and clean", () => {
  const first = buildPtAssetsTp2();
  const second = buildPtAssetsTp2();
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
    path.join(process.cwd(), "scripts", "lab-scenarios-pt-tp2.cjs"),
    path.join(process.cwd(), "supabase", "seed", "content", "pt-lab-tp2.ts"),
    path.join(process.cwd(), "tests", "pt-lab-tp2.test.cjs"),
  ]) {
    const data = fs.readFileSync(source, "utf8");
    assert.equal((data.match(/\*{6}/g) || []).length, 0, `${path.basename(source)} contient une sequence masquee`);
  }
});

test("TP2 answers are recalculated independently from the generated files", () => {
  const current = scenario();
  const lab = current.labs[0];
  const dns = parseCsv(current.text("pt-tp2-dns-public.csv"));
  const ct = parseJsonl(current.text("pt-tp2-cert-transparency.jsonl"));
  const pages = parseJsonl(current.text("pt-tp2-pages-publiques.jsonl"));
  const jobs = parseJobs(current.text("pt-tp2-annonces-emploi.txt"));
  const whois = current.text("pt-tp2-whois.txt");

  const dnsNames = new Set(dns.map((row) => row.name.toLowerCase()));
  const ctNames = new Set();
  for (const row of ct) {
    ctNames.add(row.commonName.toLowerCase());
    for (const value of row.san) ctNames.add(String(value).toLowerCase());
  }
  const typesByName = dns.reduce((map, row) => {
    if (!map.has(row.name)) map.set(row.name, new Set());
    map.get(row.name).add(row.type);
    return map;
  }, new Map());
  for (const [name, types] of typesByName) {
    if (types.has("CNAME")) assert.deepEqual([...types], ["CNAME"], `un CNAME ne doit pas coexister avec d'autres types pour ${name}`);
  }
  const unionCount = new Set([...dnsNames, ...ctNames]).size;
  const ctOnly = [...ctNames].filter((name) => !dnsNames.has(name)).sort();
  assert.deepEqual(ctOnly.length, 1, "difference CT moins DNS non unique");

  const mx = dns.filter((row) => row.type === "MX").map((row) => ({ priority: Number(row.value.split(" ")[0]), host: row.value.split(" ").slice(1).join(" ") }));
  const orderedMx = mx.slice().sort((a, b) => a.priority - b.priority);
  assert.notEqual(orderedMx[0].priority, orderedMx[1].priority, "priorite MX non unique");

  const txtSecurityCount = dns.filter((row) => row.type === "TXT" && (row.value.startsWith("v=spf1") || row.value.startsWith("v=DMARC1") || row.value.startsWith("v=DKIM1"))).length;
  const publicBlock = /CIDR:\s*([0-9./]+)/u.exec(whois)[1];
  const registrar = /Registrar:\s*(.+)/u.exec(whois)[1].trim();

  const techCounts = pages.reduce((map, page) => map.set(page.technology, (map.get(page.technology) || 0) + 1), new Map());
  const orderedTechs = [...techCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  assert.notEqual(orderedTechs[0][1], orderedTechs[1][1], "technologie la plus citée ex aequo");
  const sensitive = pages.filter((page) => /bons de livraison|commandes/u.test(page.mentionMetier));
  assert.deepEqual(sensitive.length, 1, "URL métier sensible non unique");

  const visibleDatabases = new Set(pages.filter((page) => page.technology === "postgresql").map((page) => page.technology));
  const confirmedVisibleDbJobCount = jobs.filter((job) => visibleDatabases.has(job.database)).length;
  const pageTechnologies = new Set(pages.map((page) => page.technology));
  const dnsBlob = current.text("pt-tp2-dns-public.csv").toLowerCase();
  const jobOnlyTechs = jobs.flatMap((job) => [...job.technologies, job.internalTool])
    .filter((value, index, array) => array.indexOf(value) === index)
    .filter((value) => value && value !== "aucun" && value !== "non precisee")
    .filter((value) => !pageTechnologies.has(value) && !dnsBlob.includes(value));
  assert.deepEqual(jobOnlyTechs.length, 1, "techno annoncee absente des autres sources non unique");

  const remoteCandidates = pages.map((page) => {
    const host = new URL(page.url).hostname.toLowerCase();
    const matchesPage = /accès distant|authentification distante/u.test(`${page.title} ${page.mentionMetier}`.toLowerCase());
    return host && matchesPage && dnsNames.has(host) && ctNames.has(host) ? host : null;
  }).filter(Boolean);
  assert.deepEqual([...new Set(remoteCandidates)].length, 1, "FQDN d accès distant non unique");

  const count198Names = new Set(dns.filter((row) => row.type === "A" && /^198\.51\.100\./u.test(row.value)).map((row) => row.name.toLowerCase())).size;
  const vpnDates = ct
    .filter((row) => row.commonName.toLowerCase().includes("vpn.") || row.san.some((value) => String(value).toLowerCase().includes("vpn.")))
    .map((row) => row.observedAt.slice(0, 10))
    .sort();
  assert.ok(vpnDates.length >= 2, "observations VPN insuffisantes");

  const expected = [
    String(unionCount),
    ctOnly[0],
    orderedMx[0].host,
    String(txtSecurityCount),
    publicBlock,
    registrar,
    orderedTechs[0][0],
    sensitive[0].url,
    String(confirmedVisibleDbJobCount),
    jobOnlyTechs[0],
    remoteCandidates[0],
    "b",
    String(count198Names),
    vpnDates[0],
    "c",
  ];

  expected.forEach((answer, index) => {
    assert.ok(lab.tasks[index].accepted.includes(normalize(answer)), `reponse absente pour la tache ${index + 1}: ${answer}`);
  });

  const shuffledDns = dns.slice().reverse();
  const shuffledCt = ct.slice().reverse();
  assert.equal(new Set(shuffledDns.map((row) => row.name.toLowerCase()).concat([...ctNames])).size, unionCount, "union sensible a l ordre");
  assert.equal(shuffledCt.filter((row) => row.commonName.toLowerCase().includes("vpn.") || row.san.some((value) => String(value).toLowerCase().includes("vpn."))).map((row) => row.observedAt.slice(0, 10)).sort()[0], vpnDates[0], "date minimale sensible a l ordre");
});

test("TP2 guide, support text and tasks do not leak answers", () => {
  const current = scenario();
  const lab = current.labs[0];
  const guideText = normalize(current.text("pt-tp2-guide.md"));
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

test("TP2 guide commands run and print something", {
  skip: !fs.existsSync(bashPath) || !fs.existsSync(powershellPath) ? "Git Bash ou PowerShell absent" : false,
}, () => {
  const current = scenario();
  const blocks = codeBlocks(current.text("pt-tp2-guide.md"));
  assert.ok(blocks.length >= 4, "blocs de guide manquants");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pt-tp2-guide-"));
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
