const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildLogsAssetsA } = require("../scripts/lab-scenarios-logs-a.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);
const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

function scenario() {
  const generated = buildLogsAssetsA();
  const { buildLogsLabsA } = load("supabase/seed/content/logs-labs-a");
  const labs = buildLogsLabsA(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function assetName(url) {
  return path.posix.basename(url);
}

function parseSyslog(raw) {
  return raw.trim().split("\n").map((line) => {
    const match = /^(?<month>[A-Z][a-z]{2})\s+(?<day>\d{1,2})\s+(?<time>\d{2}:\d{2}:\d{2})\s+(?<host>\S+)\s+(?<program>[A-Za-z0-9_-]+)(?:\[(?<pid>\d+)\])?: (?<message>.*)$/u.exec(line);
    assert.ok(match, `syslog illisible: ${line}`);
    return { program: match.groups.program, message: match.groups.message, time: match.groups.time };
  });
}

function parseApp(raw) {
  return raw.trim().split("\n").map((line) => JSON.parse(line));
}

function parseProxyCsv(raw) {
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(";");
  return lines.slice(1).map((line) => {
    const values = line.split(";");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

function parseAccess(raw) {
  return raw.trim().split("\n").map((line) => {
    const match = /^(?<ip>\S+) - - \[(?<stamp>[^\]]+)\] "(?<method>\S+) (?<path>\S+) HTTP\/1\.1" (?<status>\d{3}) (?<bytes>\d+) "[^"]*" "(?<agent>.*)"$/u.exec(line);
    assert.ok(match, `ligne nginx illisible: ${line}`);
    return {
      ip: match.groups.ip,
      stamp: match.groups.stamp,
      method: match.groups.method,
      path: match.groups.path,
      status: Number(match.groups.status),
      bytes: Number(match.groups.bytes),
      agent: match.groups.agent,
    };
  });
}

function parseRfc(raw) {
  return raw.trim().split("\n").map((line) => {
    const match = /^<(?<pri>\d+)>1\s+(?<ts>\S+)\s+(?<host>\S+)\s+(?<app>\S+)\s+(?<proc>\S+)\s+(?<msgid>\S+)\s+-\s+(?<message>.+)$/u.exec(line);
    assert.ok(match, `ligne RFC5424 illisible: ${line}`);
    return { pri: Number(match.groups.pri), msgid: match.groups.msgid, message: match.groups.message };
  });
}

function parseNginxUtc(stamp) {
  const match = /^(?<day>\d{2})\/(?<month>[A-Za-z]{3})\/(?<year>\d{4}):(?<time>\d{2}:\d{2}:\d{2}) \+0000$/u.exec(stamp);
  assert.ok(match, `horodatage nginx inattendu: ${stamp}`);
  const months = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  return Date.parse(`${match.groups.year}-${months[match.groups.month]}-${match.groups.day}T${match.groups.time}Z`);
}

function parseSecurityCsv(raw) {
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(";");
  return lines.slice(1).map((line) => {
    const values = line.split(";");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function parseJsonLines(raw) {
  return raw.trim().split("\n").map((line) => JSON.parse(line));
}

function parseFirewall(raw) {
  return raw.trim().split("\n").map((line) => {
    const match = /\[UFW (?<action>ALLOW|BLOCK)\].*SRC=(?<src>\S+) DST=(?<dst>\S+).*PROTO=(?<proto>\S+) SPT=(?<spt>\d+) DPT=(?<dpt>\d+)/u.exec(line);
    assert.ok(match, `ligne pare-feu illisible: ${line}`);
    const stamp = line.slice(0, 15);
    return { stamp, action: match.groups.action, src: match.groups.src, dst: match.groups.dst, proto: match.groups.proto, spt: Number(match.groups.spt), dpt: Number(match.groups.dpt), line };
  });
}

function parseDns(raw) {
  return raw.trim().split("\n").map((line) => {
    const query = /query\[(?<type>[A-Z]+)\] (?<domain>\S+) from (?<client>\S+)/u.exec(line);
    if (query) return { kind: "query", type: query.groups.type, domain: query.groups.domain, client: query.groups.client, line };
    const reply = /reply (?<domain>\S+) is (?<answer>\S+)/u.exec(line);
    assert.ok(reply, `ligne dns illisible: ${line}`);
    return { kind: "reply", domain: reply.groups.domain, answer: reply.groups.answer, line };
  });
}

function parseSquid(raw) {
  return raw.trim().split("\n").map((line) => {
    const match = /^(?<epoch>\d+\.\d+)\s+(?<duration>\d+)\s+(?<client>\S+)\s+(?<result>\S+)\s+(?<bytes>\d+)\s+(?<method>\S+)\s+(?<url>\S+)\s+-\s+(?<hier>\S+)\s+(?<mime>\S+)$/u.exec(line.trim());
    assert.ok(match, `ligne squid illisible: ${line}`);
    return {
      epoch: Number(match.groups.epoch),
      duration: Number(match.groups.duration),
      client: match.groups.client,
      result: match.groups.result,
      bytes: Number(match.groups.bytes),
      method: match.groups.method,
      url: match.groups.url,
      hier: match.groups.hier,
      mime: match.groups.mime,
    };
  });
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
  assert.ok(ordered.length > 0, `${label}: aucun element`);
  if (ordered.length > 1) assert.notEqual(ordered[0][1], ordered[1][1], `${label}: ex æquo interdit`);
  return ordered[0][0];
}

function firstTime(isoValue) {
  return isoValue.slice(11, 19);
}

function syslogSeconds(line) {
  return Date.parse(`${line.slice(0, 15)} 2026 UTC`) / 1000;
}

// Paires (clé) d'au moins cinq événements dont tous les écarts successifs sont identiques à la seconde près.
function perfectlyRegularKeys(entries, keyOf, secondsOf) {
  const groups = new Map();
  for (const entry of entries) {
    const key = keyOf(entry);
    groups.set(key, [...(groups.get(key) ?? []), secondsOf(entry)]);
  }
  return [...groups.entries()]
    .filter(([, times]) => times.length >= 5 && new Set(times.slice(1).map((time, index) => Math.round(time - times[index]))).size === 1)
    .map(([key]) => key)
    .sort();
}

function decodePowerShellEncoded(raw) {
  const match = /-EncodedCommand\s+([A-Za-z0-9+/=]+)/u.exec(raw);
  assert.ok(match, "commande encodée introuvable");
  return Buffer.from(match[1], "base64").toString("utf16le");
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `logs-labs-a-${lab.slug}-`));
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

function deriveTp1(current) {
  const syslog = parseSyslog(current.text("slg-tp1-syslog.log"));
  const app = parseApp(current.text("slg-tp1-application.jsonl"));
  const proxy = parseProxyCsv(current.text("slg-tp1-export-proxy.csv"));
  const access = parseAccess(current.text("slg-tp1-acces.log"));
  const rfc = parseRfc(current.text("slg-tp1-rfc5424.log"));

  const sshdCount = syslog.filter((entry) => entry.program === "sshd").length;
  const sshFailures = syslog.filter((entry) => entry.program === "sshd" && entry.message.startsWith("Failed password"));
  const firstSshFailure = sshFailures[0].time;
  assert.equal(firstSshFailure, "08:12:14", "premier echec local inattendu");

  const pri34 = rfc.find((entry) => entry.pri === 34);
  assert.ok(pri34, "ligne RFC <34>1 manquante");
  const gravityLetter = pri34.pri % 8 === 2 ? "c" : "";

  const appErrorCount = app.filter((entry) => entry.level === "error").length;
  const topFailedUser = uniqueTop(counts(app.filter((entry) => entry.action === "auth.login.failed"), (entry) => entry.user), "TP1 user failed");
  const deniedBytes = proxy.filter((row) => row.Decision === "TCP_DENIED/403").reduce((sum, row) => sum + Number(row.Octets), 0);
  const topAccessIp = uniqueTop(counts(access, (entry) => entry.ip), "TP1 top access ip");
  const status5xxCount = access.filter((entry) => entry.status >= 500 && entry.status < 600).length;
  const top404Path = uniqueTop(counts(access.filter((entry) => entry.status === 404), (entry) => entry.path), "TP1 top 404");
  const peakMinute = uniqueTop(counts(access, (entry) => entry.stamp.slice(12, 17)), "TP1 peak minute");
  const reqApp = app.find((entry) => entry.requestId === "req-2042");
  const reqWeb = access.find((entry) => entry.path.includes("req-2042"));
  assert.ok(reqApp && reqWeb, "requete req-2042 manquante");
  const driftMinutes = Math.round((parseNginxUtc(reqWeb.stamp) - Date.parse(reqApp.ts)) / 60000);
  const distinctSshSourceIps = new Set(sshFailures.map((entry) => / from (\S+)/u.exec(entry.message)[1])).size;
  const pythonRequestsCount = access.filter((entry) => entry.agent.toLowerCase().includes("python-requests")).length;
  const priSourceLetter = "d";
  const topProxyDeniedClient = uniqueTop(counts(proxy.filter((row) => row.Decision === "TCP_DENIED/403"), (row) => row.ClientIp), "TP1 top denied client");

  return [
    String(sshdCount),
    "07:12:14",
    gravityLetter,
    String(appErrorCount),
    topFailedUser,
    String(deniedBytes),
    topAccessIp,
    String(status5xxCount),
    top404Path,
    peakMinute,
    String(driftMinutes),
    String(distinctSshSourceIps),
    String(pythonRequestsCount),
    priSourceLetter,
    topProxyDeniedClient,
  ];
}

function deriveTp2(current) {
  const security = parseSecurityCsv(current.text("slg-tp2-securite.csv"));
  const sysmon = parseJsonLines(current.text("slg-tp2-sysmon.jsonl"));
  const powershell = parseJsonLines(current.text("slg-tp2-powershell.jsonl"));

  const top4625Account = uniqueTop(counts(security.filter((row) => row.EventId === "4625"), (row) => row.TargetUserName), "TP2 top 4625");
  const subStatusLetter = security.some((row) => row.EventId === "4625" && row.SubStatus === "0xC000006A") ? "b" : "";
  const sprayRows = security.filter((row) => row.EventId === "4625" && row.Computer === "pc-compta01" && row.LogonType === "10" && ["adiop", "msylla", "jbouedraogo", "svc-sauvegarde"].includes(row.TargetUserName));
  const spraySourceCount = new Set(sprayRows.map((row) => row.IpAddress)).size;
  const firstSuccessfulRdp = security.find((row) => row.EventId === "4624" && row.Computer === "pc-compta01" && row.TargetUserName === "adiop" && row.LogonType === "10");
  assert.ok(firstSuccessfulRdp, "premiere reussite type 10 manquante");
  const createdAccount = security.find((row) => row.EventId === "4720").TargetUserName;
  const createdGroup = security.find((row) => row.EventId === "4732" && row.TargetUserName === createdAccount).GroupName.toLowerCase();
  const lockedAccountsCount = new Set(security.filter((row) => row.EventId === "4740").map((row) => row.TargetUserName)).size;
  const clearLogTime = firstTime(security.find((row) => row.EventId === "1102").TimeCreatedUtc);
  const suspiciousProcess = sysmon.find((row) => row.EventId === 1 && /powershell\.exe$/iu.test(row.Image) && row.Computer === "pc-compta01" && /WINWORD\.EXE$/u.test(row.ParentImage));
  assert.ok(suspiciousProcess, "processus PowerShell suspect manquant");
  const suspiciousConnection = sysmon.find((row) => row.EventId === 3 && row.ProcessGuid === suspiciousProcess.ProcessGuid);
  const suspiciousDns = sysmon.find((row) => row.EventId === 22 && row.ProcessGuid === suspiciousProcess.ProcessGuid);
  assert.ok(suspiciousConnection && suspiciousDns, "liaison Sysmon incomplète");
  const encodedEntry = powershell.find((row) => row.ScriptBlockText.includes("-EncodedCommand"));
  assert.ok(encodedEntry, "commande encodée introuvable");
  const decoded = decodePowerShellEncoded(encodedEntry.ScriptBlockText);
  const decodedDomain = /https:\/\/([^/]+)/u.exec(decoded)[1];
  const svcSauvegardeTopLogonType = uniqueTop(counts(security.filter((row) => row.EventId === "4624" && row.TargetUserName === "svc-sauvegarde"), (row) => row.LogonType), "TP2 logon type");
  const svcResaType3Computers = new Set(security.filter((row) => row.EventId === "4624" && row.TargetUserName === "svc-resa" && row.LogonType === "3").map((row) => row.Computer)).size;
  const chronologyTimes = {
    failed: Date.parse(sprayRows[0].TimeCreatedUtc),
    success: Date.parse(firstSuccessfulRdp.TimeCreatedUtc),
    powershell: Date.parse(suspiciousProcess.TimeCreatedUtc),
    clear: Date.parse(security.find((row) => row.EventId === "1102").TimeCreatedUtc),
  };
  const chronologyLetter = chronologyTimes.failed < chronologyTimes.success && chronologyTimes.success < chronologyTimes.powershell && chronologyTimes.powershell < chronologyTimes.clear ? "c" : "";

  return [
    top4625Account,
    subStatusLetter,
    String(spraySourceCount),
    firstTime(firstSuccessfulRdp.TimeCreatedUtc),
    createdAccount,
    createdGroup,
    String(lockedAccountsCount),
    clearLogTime,
    suspiciousProcess.ParentImage.toLowerCase(),
    `${suspiciousConnection.DestinationIp}:${suspiciousConnection.DestinationPort}`,
    suspiciousDns.QueryName,
    decodedDomain,
    svcSauvegardeTopLogonType,
    String(svcResaType3Computers),
    chronologyLetter,
  ];
}

function deriveTp3(current) {
  const firewall = parseFirewall(current.text("slg-tp3-pare-feu.log"));
  const dns = parseDns(current.text("slg-tp3-dns.log"));
  const proxy = parseSquid(current.text("slg-tp3-proxy.log"));

  const scanRows = firewall.filter((row) => row.src === "203.0.113.77");
  const topScannerIp = uniqueTop(counts(firewall.filter((row) => /^[0-9]/u.test(row.src) && row.src.startsWith("203.0.113.")), (row) => row.src), "TP3 top scanner");
  const scannerPortCount = new Set(scanRows.map((row) => row.dpt)).size;
  const scannerTopPort = uniqueTop(counts(scanRows, (row) => String(row.dpt)), "TP3 top scan port");
  const firstUnexpectedAllow = firewall.find((row) => row.action === "ALLOW" && row.src.startsWith("172.20.10.") && row.dpt === 8443);
  assert.ok(firstUnexpectedAllow, "premier allow inattendu manquant");

  const proxyBeaconRows = proxy.filter((row) => row.client === "172.20.10.23" && row.url.includes("cdn-rendezvous.sync-check.example"));
  const beaconClient = uniqueTop(counts(proxy.filter((row) => row.url.includes("cdn-rendezvous.sync-check.example")), (row) => row.client), "TP3 beacon client");
  const beaconIntervals = proxyBeaconRows.slice(1).map((row, index) => Math.round(row.epoch - proxyBeaconRows[index].epoch));
  const sortedIntervals = beaconIntervals.slice().sort((left, right) => left - right);
  const beaconMedian = sortedIntervals[Math.floor(sortedIntervals.length / 2)];

  // Le DNS raconte le même rythme que le proxy, et seul le client du balisage interroge ce domaine.
  const dnsBeaconQueries = dns.filter((row) => row.kind === "query" && row.domain === "cdn-rendezvous.sync-check.example");
  assert.ok(dnsBeaconQueries.length >= 5 && dnsBeaconQueries.every((row) => row.client === beaconClient), "seul le client du balisage interroge le domaine du balisage");
  const dnsBeaconIntervals = dnsBeaconQueries.slice(1).map((row, index) => Math.round(syslogSeconds(row.line) - syslogSeconds(dnsBeaconQueries[index].line)));
  assert.deepEqual([...new Set(dnsBeaconIntervals)], [beaconMedian], "le DNS et le proxy doivent donner le même intervalle de balisage");

  // Pas d'ambiguïté : le bruit est irrégulier, seuls le balisage et la mise à jour légitime ont un écart strictement constant.
  const expectedRegularPairs = ["172.20.10.23|cdn-rendezvous.sync-check.example", "172.20.10.25|cdn-miseajour-legitime.example"];
  assert.deepEqual(
    perfectlyRegularKeys(dns.filter((row) => row.kind === "query"), (row) => `${row.client}|${row.domain}`, (row) => syslogSeconds(row.line)),
    expectedRegularPairs,
    "DNS : seules deux paires client/domaine doivent être parfaitement régulières",
  );
  assert.deepEqual(
    perfectlyRegularKeys(proxy, (row) => `${row.client}|${row.url.replace(/\?.*$/u, "")}`, (row) => row.epoch),
    ["172.20.10.23|http://cdn-rendezvous.sync-check.example/pixel.gif", "172.20.10.25|http://cdn-miseajour-legitime.example/pack-win32.bin"],
    "proxy : seules deux paires client/URL doivent être parfaitement régulières",
  );
  const nxMap = counts(dns.filter((row) => row.kind === "reply" && row.answer === "NXDOMAIN"), (row) => row.domain);
  const topNxDomain = uniqueTop(nxMap, "TP3 NXDOMAIN");
  const longestQueryLength = dns.filter((row) => row.kind === "query").reduce((max, row) => Math.max(max, row.domain.length), 0);
  const beaconBytes = proxyBeaconRows.reduce((sum, row) => sum + row.bytes, 0);
  const topTxtClient = uniqueTop(counts(dns.filter((row) => row.kind === "query" && row.type === "TXT"), (row) => row.client), "TP3 TXT client");
  const deniedByClient = counts(proxy.filter((row) => row.result === "TCP_DENIED/403"), (row) => row.client);
  const topDeniedClient = uniqueTop(deniedByClient, "TP3 denied client");
  const topDeniedClientCount = deniedByClient.get(topDeniedClient);

  return [
    topScannerIp,
    String(scannerPortCount),
    scannerTopPort,
    firstUnexpectedAllow.dst,
    String(firstUnexpectedAllow.dpt),
    beaconClient,
    String(beaconMedian),
    topNxDomain,
    String(longestQueryLength),
    String(beaconBytes),
    topTxtClient,
    topDeniedClient,
    String(topDeniedClientCount),
    "b",
    "d",
  ];
}

test("les laboratoires Analyse de logs A sont déterministes et propres", () => {
  const first = buildLogsAssetsA();
  const second = buildLogsAssetsA();
  assert.deepEqual(first.facts, second.facts);
  assert.equal(first.files.length, second.files.length);
  first.files.forEach((file, index) => {
    assert.equal(file.name, second.files[index].name);
    assert.equal(Buffer.compare(file.data, second.files[index].data), 0, `${file.name} doit être identique`);
    assert.equal(file.data.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false, `${file.name} ne doit pas avoir de BOM`);
    assert.equal(file.data.includes(Buffer.from("\r\n")), false, `${file.name} doit rester en LF`);
    assert.ok(file.data.length < 150 * 1024, `${file.name} doit rester sous 150 Ko`);
  });
});

test("les labs Analyse de logs A déclarent exactement leurs fichiers et passent labIssues", () => {
  const { labs, generated } = scenario();
  assert.deepEqual(labs.map((lab) => lab.slug), ["tp-logs-formats-temps", "tp-logs-windows", "tp-logs-reseau"]);
  for (const lab of labs) assert.deepEqual(labIssues(lab), [], `${lab.slug} doit avoir zéro problème`);
  const assetNames = new Set(labs.flatMap((lab) => lab.assets.map((asset) => assetName(asset.url))));
  const fileNames = new Set(generated.files.map((file) => file.name));
  assert.deepEqual([...assetNames].sort(), [...fileNames].sort());
  for (const lab of labs) assert.equal(lab.tasks.length, 15, `${lab.slug} doit avoir 15 tâches`);
});

test("les réponses du TP 1 se recalculent depuis les fichiers", () => {
  const current = scenario();
  const answers = deriveTp1(current);
  assert.equal(answers.length, current.labs[0].tasks.length);
  answers.forEach((answer, index) => assert.ok(current.labs[0].tasks[index].accepted.includes(normalize(answer)), `TP1 tâche ${index + 1}`));
});

test("les réponses du TP 2 se recalculent depuis les fichiers", () => {
  const current = scenario();
  const answers = deriveTp2(current);
  assert.equal(answers.length, current.labs[1].tasks.length);
  answers.forEach((answer, index) => assert.ok(current.labs[1].tasks[index].accepted.includes(normalize(answer)), `TP2 tâche ${index + 1}`));
});

test("les réponses du TP 3 se recalculent depuis les fichiers", () => {
  const current = scenario();
  const answers = deriveTp3(current);
  assert.equal(answers.length, current.labs[2].tasks.length);
  answers.forEach((answer, index) => assert.ok(current.labs[2].tasks[index].accepted.includes(normalize(answer)), `TP3 tâche ${index + 1}`));
});

test("les guides ne divulguent aucune réponse significative et gardent des blocs fermés", () => {
  const { labs, files } = scenario();
  for (const lab of labs) {
    const guides = lab.assets.filter((asset) => asset.kind === "guide").map((asset) => files.get(asset.url.replace("/labs/", "")).toString("utf8"));
    const guideText = normalize(guides.join("\n"));
    const supportText = normalize([lab.briefing, ...lab.constraints, ...lab.objectives, ...lab.hints].join("\n"));
    for (const markdown of guides) {
      let open = false;
      for (const line of markdown.split("\n")) if (line.trim().startsWith("```")) open = !open;
      assert.equal(open, false, `${lab.slug} : bloc de code non fermé`);
    }
    for (let taskIndex = 0; taskIndex < lab.tasks.length; taskIndex += 1) {
      const task = lab.tasks[taskIndex];
      for (const answer of significantAnswers(task)) {
        assert.equal(containsAnswer(guideText, answer), false, `${lab.slug} tâche ${taskIndex + 1} fuit dans le guide`);
        assert.equal(containsAnswer(normalize(`${task.prompt}\n${task.hint}`), answer), false, `${lab.slug} tâche ${taskIndex + 1} fuit dans son propre énoncé`);
        assert.equal(containsAnswer(supportText, answer), false, `${lab.slug} tâche ${taskIndex + 1} fuit dans le support`);
        for (let otherIndex = 0; otherIndex < lab.tasks.length; otherIndex += 1) {
          if (otherIndex === taskIndex) continue;
          const other = normalize(`${lab.tasks[otherIndex].prompt}\n${lab.tasks[otherIndex].hint}`);
          assert.equal(containsAnswer(other, answer), false, `${lab.slug} tâche ${taskIndex + 1} fuit dans la tâche ${otherIndex + 1}`);
        }
      }
    }
  }
});

test("les blocs bash des guides s’exécutent dans Git Bash sous Windows", {
  skip: process.platform !== "win32" ? "test réservé à Windows" : !fs.existsSync(bashPath) ? "Git Bash absent" : false,
}, () => {
  const current = scenario();
  for (const lab of current.labs) {
    const dir = prepareLabTempDir(lab, current.files);
    try {
      const markdown = current.files.get(lab.assets.find((asset) => asset.kind === "guide").url.replace("/labs/", "")).toString("utf8");
      for (const block of extractCodeBlocks(markdown).filter((entry) => entry.language === "bash")) {
        const result = runBashBlock(dir, block.code);
        assert.equal(result.status, 0, `${lab.slug} bash: ${result.stderr}`);
        assert.equal((result.stderr ?? "").trim(), "", `${lab.slug} bash stderr`);
        assert.notEqual((result.stdout ?? "").trim(), "", `${lab.slug} bash sortie vide`);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("les blocs powershell des guides s’exécutent sous powershell.exe 5.1", {
  skip: process.platform !== "win32" ? "test réservé à Windows" : !fs.existsSync(powershellPath) ? "powershell.exe absent" : false,
}, () => {
  const current = scenario();
  for (const lab of current.labs) {
    const dir = prepareLabTempDir(lab, current.files);
    try {
      const markdown = current.files.get(lab.assets.find((asset) => asset.kind === "guide").url.replace("/labs/", "")).toString("utf8");
      for (const block of extractCodeBlocks(markdown).filter((entry) => entry.language === "powershell")) {
        const result = runPowerShellBlock(dir, block.code);
        assert.equal(result.status, 0, `${lab.slug} powershell: ${result.stderr}`);
        assert.equal((result.stderr ?? "").trim(), "", `${lab.slug} powershell stderr`);
        assert.notEqual((result.stdout ?? "").trim(), "", `${lab.slug} powershell sortie vide`);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});
