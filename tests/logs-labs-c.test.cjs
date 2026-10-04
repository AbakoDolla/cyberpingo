const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildLogsAssetsC } = require("../scripts/lab-scenarios-logs-c.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");
const { load } = require("../scripts/ts-loader.cjs");

const BASH_PATH = "C:\\Program Files\\Git\\bin\\bash.exe";
const POWERSHELL_PATH = "powershell.exe";
const normalize = (value) => String(value).toLowerCase().trim().replace(/\s+/g, " ");
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

function parseAuth(content) {
  return content.trim().split("\n").map((line) => {
    const failed = /Failed password for (?:invalid user )?(\S+) from (\S+)/.exec(line);
    if (failed) return { type: "failed", user: failed[1], ip: failed[2], time: line.slice(7, 15), line };
    const accepted = /Accepted password for (\S+) from (\S+)/.exec(line);
    if (accepted) return { type: "accepted", user: accepted[1], ip: accepted[2], time: line.slice(7, 15), line };
    return { type: "other", time: line.slice(7, 15), line };
  });
}

function parseWeb(content) {
  return content.trim().split("\n").map((line) => {
    const match = /^(\S+) - - \[(\d{2}\/\w+\/\d{4}:\d{2}:\d{2}:\d{2} \+0000)\] "(\S+) (\S+) HTTP\/1\.1" (\d{3}) (\d+)/.exec(line);
    assert.ok(match, `ligne web reconnue: ${line}`);
    return { ip: match[1], stamp: match[2], method: match[3], requestPath: match[4], status: Number(match[5]), bytes: Number(match[6]), line };
  });
}

function parseDns(content) {
  return content.trim().split("\n").map((line) => {
    const query = /query\[A\] (\S+) from (\S+)/.exec(line);
    if (query) return { type: "query", domain: query[1], source: query[2], time: line.slice(7, 15), line };
    const reply = /reply (\S+) is (\S+)/.exec(line);
    if (reply) return { type: "reply", domain: reply[1], value: reply[2], time: line.slice(7, 15), line };
    return { type: "other", time: line.slice(7, 15), line };
  });
}

function parseNetwork(content) {
  return content.trim().split("\n").map((line) => {
    const match = /^(?<iso>\S+) fw-palmier01 (?<action>ALLOW|BLOCK) (?<direction>IN|OUT)=\S+ SRC=(?<src>\S+) DST=(?<dst>\S+) PROTO=(?<proto>\S+) SPT=(?<spt>\d+) DPT=(?<dpt>\d+)/.exec(line);
    assert.ok(match, `ligne reseau reconnue: ${line}`);
    return match.groups;
  });
}

function parseProxy(content) {
  return content.trim().split("\n").map((line) => {
    const match = /^(?<epoch>\d+\.\d+)\s+\d+\s+(?<client>\S+)\s+(?<result>\S+)\s+\d+\s+(?<method>\S+)\s+(?<target>\S+)\s+-\s+(?<hierarchy>\S+)\s+-$/.exec(line);
    assert.ok(match, `ligne proxy reconnue: ${line}`);
    return match.groups;
  });
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

function deriveExpected(fileMap) {
  const alerts = parseCsv(fileMap.get("slg-proj-alertes.csv"));
  const inventory = parseCsv(fileMap.get("slg-proj-inventaire.csv"));
  const auth = parseAuth(fileMap.get("slg-proj-preuves-auth.log"));
  const windows = parseCsv(fileMap.get("slg-proj-preuves-windows.csv"));
  const web = parseWeb(fileMap.get("slg-proj-preuves-web.log"));
  const dns = parseDns(fileMap.get("slg-proj-preuves-dns.log"));
  const network = parseNetwork(fileMap.get("slg-proj-preuves-reseau.log"));
  const proxy = parseProxy(fileMap.get("slg-proj-preuves-proxy.log"));

  const criticality = Object.fromEntries(inventory.map((row) => [row.Machine, Number(row.Criticite)]));
  const severity = Object.fromEntries(alerts.map((row) => [row.AlertId, Number(row.GraviteAnnoncee)]));
  const certitudeValues = { vp: 4, sv: 2, fp: 1 };

  const alt01Fails = windows.filter((row) => row.Computer === "pc-compta01" && row.EventId === "4625" && row.TargetUserName === "adiop" && row.IpAddress === "172.20.10.31");
  const alt01Success = windows.find((row) => row.Computer === "pc-compta01" && row.EventId === "4624" && row.TargetUserName === "adiop" && row.IpAddress === "172.20.10.31");
  const alt01 = alt01Fails.length >= 2 && alt01Success && (Date.parse(alt01Success.TimeCreatedUtc) - Date.parse(alt01Fails[0].TimeCreatedUtc)) <= 120000 ? "fp" : "sv";

  const bruteForceIp = [...new Set(auth.filter((row) => row.type === "failed").map((row) => row.ip))]
    .find((ip) => auth.filter((row) => row.type === "failed" && row.ip === ip).length >= 6 && !auth.some((row) => row.type === "accepted" && row.ip === ip));
  const alt03 = bruteForceIp ? "sv" : "fp";

  const attackerIp = [...new Set(web.filter((row) => row.method === "POST" && row.requestPath === "/espace-partenaires/upload.php").map((row) => row.ip))]
    .find((ip) => web.some((row) => row.ip === ip && /cmd=/.test(row.requestPath)) && auth.some((row) => row.type === "accepted" && row.ip === ip));
  const firstIncident = web.find((row) => row.ip === attackerIp && row.method === "POST" && row.requestPath === "/espace-partenaires/upload.php");
  const compromisedAccount = auth.find((row) => row.type === "accepted" && row.ip === attackerIp).user;
  const alt04 = attackerIp && auth.some((row) => row.type === "accepted" && row.ip === attackerIp) ? "vp" : "sv";
  const outboundQuery = dns.find((row) => row.type === "query" && row.source === "172.20.20.10" && row.domain === "cache-sync.palmier-or.example");
  const outboundReply = dns.find((row) => row.type === "reply" && row.domain === "cache-sync.palmier-or.example");
  const outboundProxy = proxy.find((row) => row.client === "172.20.20.10" && row.target === "cache-sync.palmier-or.example:8443");
  const outboundNet = network.find((row) => row.action === "ALLOW" && row.src === "172.20.20.10" && row.dst === "198.51.100.200" && row.dpt === "8443");
  const alt06 = outboundQuery && outboundReply && outboundProxy && outboundNet ? "vp" : "sv";

  const inventoryPowerShell = windows.find((row) => row.Computer === "adm-pc02" && row.EventId === "4688" && /EncodedCommand/.test(row.CommandLine) && /taskeng\.exe/i.test(row.ParentProcessName));
  const inventoryProxy = proxy.find((row) => row.client === "172.20.10.90" && /inventaire\.palmier-or\.example/.test(row.target));
  const alt08 = inventoryPowerShell && inventoryProxy ? "fp" : "sv";

  const scanIp = [...new Set(web.filter((row) => row.status === 404).map((row) => row.ip))]
    .find((ip) => web.filter((row) => row.ip === ip).length >= 5 && web.filter((row) => row.ip === ip).every((row) => row.status === 404));
  const alt12 = scanIp && !auth.some((row) => row.ip === scanIp) && !proxy.some((row) => row.client === scanIp) ? "sv" : "fp";

  const qualificationByAlert = {
    "ALT-01": alt01,
    "ALT-03": alt03,
    "ALT-04": alt04,
    "ALT-05": alt04,
    "ALT-06": alt06,
    "ALT-08": alt08,
    "ALT-12": alt12,
  };
  const priorityByAlert = Object.fromEntries(["ALT-04", "ALT-05", "ALT-06"].map((id) => [id, severity[id] * criticality[alerts.find((row) => row.AlertId === id).Machine] * certitudeValues[qualificationByAlert[id]]]));
  const topAlert = Object.entries(priorityByAlert).sort((left, right) => right[1] - left[1])[0][0];

  return {
    alerts,
    qualificationByAlert,
    priorityByAlert,
    topAlert,
    attackerIp,
    compromisedAccount,
    firstIncidentTime: firstIncident.stamp.split(":").slice(1).join(":").split(" +")[0],
    outboundDestination: outboundProxy.target,
    indicatorDisarmed: outboundQuery.domain.replace(/\./g, "[.]"),
  };
}

test("les assets du projet logs C restent deterministes et propres", () => {
  const first = buildLogsAssetsC();
  const second = buildLogsAssetsC();
  assert.equal(JSON.stringify(first.facts), JSON.stringify(second.facts));
  assert.equal(first.files.length, second.files.length);
  for (let index = 0; index < first.files.length; index += 1) {
    const left = first.files[index];
    const right = second.files[index];
    assert.equal(left.name, right.name);
    assert.ok(left.data.equals(right.data), `octets identiques pour ${left.name}`);
    const content = left.data.toString("utf8");
    assert.ok(!content.startsWith("\ufeff"), `pas de BOM pour ${left.name}`);
    assert.ok(!content.includes("\r\n"), `pas de CRLF pour ${left.name}`);
    assert.ok(!controlChars.test(content), `pas de caractere de controle pour ${left.name}`);
  }
  const lineCounts = Object.fromEntries(first.files.map((file) => [file.name, file.data.toString("utf8").trimEnd().split("\n").length]));
  assert.ok(lineCounts["slg-proj-preuves-auth.log"] >= 150);
  assert.ok(lineCounts["slg-proj-preuves-windows.csv"] >= 150);
  assert.ok(lineCounts["slg-proj-preuves-web.log"] >= 150);
  assert.ok(lineCounts["slg-proj-preuves-reseau.log"] >= 150);
  assert.ok(lineCounts["slg-proj-preuves-dns.log"] >= 150);
  assert.ok(lineCounts["slg-proj-preuves-proxy.log"] >= 150);
});

test("la definition TypeScript declare exactement le labo final attendu", () => {
  const built = buildLogsAssetsC();
  const { buildLogsLabsC } = load("supabase/seed/content/logs-labs-c");
  const labs = buildLogsLabsC(built.facts);
  assert.equal(labs.length, 1);
  const [lab] = labs;
  assert.equal(lab.slug, "projet-soc-pme");
  assert.equal(lab.title, "Projet final : trier une semaine d’alertes et rédiger le rapport d’analyse");
  assert.equal(lab.tasks.length, 19);
  assert.deepEqual(labIssues(lab), []);
  const declared = new Set(lab.assets.map((asset) => asset.url.replace("/labs/", "")));
  const generated = new Set(built.files.map((file) => file.name));
  assert.deepEqual([...declared].sort(), [...generated].sort());
});

test("les reponses du projet logs C se recalculent depuis les fichiers et la grille", () => {
  const built = buildLogsAssetsC();
  const { buildLogsLabsC } = load("supabase/seed/content/logs-labs-c");
  const [lab] = buildLogsLabsC(built.facts);
  const fileMap = new Map(built.files.map((file) => [file.name, file.data.toString("utf8")]));
  const expected = deriveExpected(fileMap);

  assert.ok(accept(lab.tasks[0], expected.qualificationByAlert["ALT-01"]));
  assert.ok(accept(lab.tasks[1], expected.qualificationByAlert["ALT-03"]));
  assert.ok(accept(lab.tasks[2], expected.qualificationByAlert["ALT-04"]));
  assert.ok(accept(lab.tasks[3], expected.qualificationByAlert["ALT-06"]));
  assert.ok(accept(lab.tasks[4], expected.qualificationByAlert["ALT-08"]));
  assert.ok(accept(lab.tasks[5], expected.qualificationByAlert["ALT-12"]));

  assert.ok(accept(lab.tasks[6], expected.priorityByAlert["ALT-04"]));
  assert.ok(accept(lab.tasks[7], expected.priorityByAlert["ALT-05"]));
  assert.ok(accept(lab.tasks[8], expected.priorityByAlert["ALT-06"]));
  assert.ok(expected.priorityByAlert["ALT-06"] > expected.priorityByAlert["ALT-04"]);
  assert.ok(expected.priorityByAlert["ALT-04"] > expected.priorityByAlert["ALT-05"]);
  assert.ok(accept(lab.tasks[9], expected.topAlert));

  assert.ok(accept(lab.tasks[10], "srv-reservation01"));
  assert.ok(accept(lab.tasks[11], expected.compromisedAccount));
  assert.ok(accept(lab.tasks[12], expected.firstIncidentTime));
  assert.ok(accept(lab.tasks[13], expected.attackerIp));
  assert.ok(accept(lab.tasks[14], expected.outboundDestination));
  assert.ok(accept(lab.tasks[15], "b"));
  assert.ok(accept(lab.tasks[16], "c"));
  assert.ok(accept(lab.tasks[17], expected.indicatorDisarmed));
  assert.ok(accept(lab.tasks[18], "b"));
});

test("le guide du projet logs C reste methodologique et ne divulgue pas les reponses longues", () => {
  const built = buildLogsAssetsC();
  const { buildLogsLabsC } = load("supabase/seed/content/logs-labs-c");
  const [lab] = buildLogsLabsC(built.facts);
  const guideText = built.files.find((file) => file.name === "slg-proj-guide.md").data.toString("utf8");
  assert.ok(!/slg-proj-/u.test(guideText), "le guide ne travaille pas sur les fichiers du labo");
  for (const task of lab.tasks) {
    for (const answer of task.accepted) {
      const value = normalize(answer);
      if (value.length < 4 || ["oui", "non"].includes(value) || /^[a-z]{1,2}$/.test(value)) continue;
      assert.equal(normalize(task.prompt).includes(value), false, `pas de fuite dans l'enonce pour ${value}`);
      assert.equal(normalize(task.hint).includes(value), false, `pas de fuite dans l'indice pour ${value}`);
      assert.equal(normalize(guideText).includes(value), false, `pas de fuite dans le guide pour ${value}`);
    }
  }
});

test("les blocs bash et powershell du guide s’executent vraiment sur des donnees inventees", { skip: !fs.existsSync(BASH_PATH) }, () => {
  const built = buildLogsAssetsC();
  const guide = built.files.find((file) => file.name === "slg-proj-guide.md").data.toString("utf8");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "logs-labs-c-"));
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
