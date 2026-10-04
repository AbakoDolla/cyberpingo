const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildPtAssetsTp3 } = require("../scripts/lab-scenarios-pt-tp3.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR
  ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe")
  : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const MONTHS = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);

function scenario() {
  const generated = buildPtAssetsTp3();
  const { buildPtLabTp3 } = load("supabase/seed/content/pt-lab-tp3");
  const labs = buildPtLabTp3(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function lineCount(text) {
  return text.split("\n").length;
}

function parseNormal(raw) {
  const lines = raw.trim().split("\n");
  const startLine = lines[0];
  const startMatch = /^Starting Nmap [0-9.]+ \(\s*https:\/\/nmap\.org\s*\) at (?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2}) (?<time>\d{2}:\d{2}:\d{2}) UTC$/u.exec(startLine);
  assert.ok(startMatch, "en-tete Nmap normal introuvable");
  const startUtc = `${startMatch.groups.year}-${startMatch.groups.month}-${startMatch.groups.day} ${startMatch.groups.time}`;

  const hosts = new Map();
  const blocks = raw.split(/\n\n+/u).filter((block) => block.startsWith("Nmap scan report for "));
  for (const block of blocks) {
    const blockLines = block.split("\n");
    const header = /^Nmap scan report for (?:(?<host>[a-z0-9.-]+) \()?(?<ip>\d+\.\d+\.\d+\.\d+)\)?$/iu.exec(blockLines[0]);
    assert.ok(header, `bloc Nmap illisible: ${blockLines[0]}`);
    const status = /Host is (?<state>up|down)/iu.exec(blockLines[1]);
    assert.ok(status, `etat d’hote introuvable: ${blockLines[1]}`);
    const key = header.groups.host || header.groups.ip;
    const entry = { ip: header.groups.ip, hostname: header.groups.host || null, state: status.groups.state.toLowerCase(), ports: [] };
    if (entry.state === "up") {
      const serviceInfoIndex = blockLines.findIndex((line) => line.startsWith("Service Info:"));
      assert.notEqual(serviceInfoIndex, -1, "ligne Service Info absente");
      const portLines = blockLines.slice(3, serviceInfoIndex);
      for (const line of portLines) {
        const match = /^(?<port>\d+)\/tcp\s+(?<state>\S+)\s+(?<service>\S+)\s*(?<version>.*)$/u.exec(line);
        assert.ok(match, `ligne de port Nmap normal illisible: ${line}`);
        entry.ports.push({
          port: Number(match.groups.port),
          state: match.groups.state,
          service: match.groups.service,
          version: match.groups.version.trim(),
        });
      }
    }
    hosts.set(key, entry);
  }
  return { startUtc, hosts };
}

function parseGrep(raw) {
  const statusOrder = [];
  const hosts = new Map();
  for (const line of raw.trim().split("\n")) {
    let match = /^Host:\s+(?<ip>\d+\.\d+\.\d+\.\d+)\s+\((?<host>[^)]*)\)\tStatus:\s+(?<status>Up|Down)$/u.exec(line);
    if (match) {
      statusOrder.push({ ip: match.groups.ip, host: match.groups.host || null, status: match.groups.status.toLowerCase() });
      const key = match.groups.host || match.groups.ip;
      hosts.set(key, { ip: match.groups.ip, hostname: match.groups.host || null, status: match.groups.status.toLowerCase(), ports: [] });
      continue;
    }
    match = /^Host:\s+(?<ip>\d+\.\d+\.\d+\.\d+)\s+\((?<host>[^)]*)\)\tPorts:\s+(?<ports>.+?)\tIgnored State:\s+(?<ignoredState>[^ ]+) \((?<ignoredCount>\d+)\)$/u.exec(line);
    if (match) {
      const key = match.groups.host || match.groups.ip;
      const target = hosts.get(key);
      assert.ok(target, `ligne Ports sans ligne Status: ${line}`);
      target.ports = match.groups.ports.split(/,\s*/u).map((item) => {
        const portMatch = /^(?<port>\d+)\/(?<state>[^/]+)\/(?<proto>[^/]+)\/\/(?<service>[^/]*)\/(?<rpc>[^/]*)\/(?<version>[^/]*)\/$/u.exec(item);
        assert.ok(portMatch, `port gnmap illisible: ${item}`);
        return {
          port: Number(portMatch.groups.port),
          state: portMatch.groups.state,
          service: portMatch.groups.service,
          version: portMatch.groups.version,
        };
      });
      target.ignoredState = match.groups.ignoredState;
      target.ignoredCount = Number(match.groups.ignoredCount);
    }
  }
  return { statusOrder, hosts };
}

function parseXml(raw) {
  const hosts = [];
  for (const match of raw.matchAll(/<host>([\s\S]*?)<\/host>/gu)) {
    const block = match[1];
    const ip = /<address addr="(?<ip>\d+\.\d+\.\d+\.\d+)" addrtype="ipv4"\/>/u.exec(block)?.groups.ip;
    const state = /<status state="(?<state>[^"]+)"/u.exec(block)?.groups.state;
    const hostname = /<hostname name="(?<host>[^"]+)"/u.exec(block)?.groups.host || null;
    assert.ok(ip && state, "bloc XML incomplet");
    const ports = [];
    for (const portMatch of block.matchAll(/<port protocol="tcp" portid="(?<port>\d+)">([\s\S]*?)<\/port>/gu)) {
      const portBlock = portMatch[2];
      const serviceMatch = /<service (?<attrs>[^>]+)\/>/u.exec(portBlock);
      const serviceName = /name="(?<name>[^"]+)"/u.exec(serviceMatch?.groups.attrs || "")?.groups.name || "";
      const product = /product="(?<product>[^"]+)"/u.exec(serviceMatch?.groups.attrs || "")?.groups.product || "";
      const version = /version="(?<version>[^"]+)"/u.exec(serviceMatch?.groups.attrs || "")?.groups.version || "";
      const extrainfo = /extrainfo="(?<extra>[^"]+)"/u.exec(serviceMatch?.groups.attrs || "")?.groups.extra || "";
      const portState = /<state state="(?<state>[^"]+)"/u.exec(portBlock)?.groups.state;
      assert.ok(portState, `etat de port XML introuvable pour ${ip}`);
      ports.push({
        port: Number(portMatch.groups.port),
        state: portState,
        service: serviceName,
        product,
        version,
        extrainfo,
      });
    }
    hosts.push({ ip, hostname, state, ports });
  }
  return hosts;
}

function parseMemo(raw) {
  const rows = new Map();
  for (const line of raw.trim().split("\n")) {
    const match = /^(?<host>[a-z0-9.-]+) \| publics=(?<publics>[^|]+) \| internes=(?<internes>[^|]+) \| note=(?<note>.+)$/iu.exec(line);
    if (!match) continue;
    const parseList = (value) => value.trim() === "aucun"
      ? []
      : value.split(/,\s*/u).map((item) => {
          const [port, label] = item.split("/");
          return { port: Number(port), label: label || "" };
        });
    rows.set(match.groups.host, {
      publics: parseList(match.groups.publics),
      internes: parseList(match.groups.internes),
      note: match.groups.note.trim(),
    });
  }
  return rows;
}

function significantAnswers(task) {
  return task.accepted.filter((answer) => {
    const normalized = normalize(answer);
    if (normalized.length < 3) return false;
    if (ignoredAnswers.has(normalized)) return false;
    if (/^[a-z]$/u.test(normalized)) return false;
    if (/^\d+$/u.test(normalized)) return false;
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

function printsAnswer(output, answer) {
  const normalized = normalize(answer);
  if (!normalized || ignoredAnswers.has(normalized) || /^[a-z]$/u.test(normalized)) return false;
  if (/^\d+$/u.test(normalized)) return false;
  return containsAnswer(normalize(output), normalized);
}

test("TP3 generator and lab definition stay coherent", () => {
  const current = scenario();
  const { labs, files, text } = current;
  assert.equal(labs.length, 1);
  const lab = labs[0];
  assert.equal(lab.slug, "tp-pt-nmap");
  assert.equal(lab.tasks.length, 15);
  assert.deepEqual([...files.keys()].sort(), [
    "pt-tp3-guide.md",
    "pt-tp3-nmap-grep.gnmap",
    "pt-tp3-nmap-normal.txt",
    "pt-tp3-nmap-xml.xml",
    "pt-tp3-services-attendus.txt",
  ]);
  assert.deepEqual(labIssues(lab), []);
  for (const asset of lab.assets) assert.ok(files.has(path.posix.basename(asset.url)), `asset declare manquant: ${asset.url}`);
  assert.equal(lineCount(text("pt-tp3-nmap-normal.txt")) >= 120, true);
  assert.equal(lineCount(text("pt-tp3-nmap-normal.txt")) <= 180, true);
  assert.equal(lineCount(text("pt-tp3-nmap-grep.gnmap")) >= 25, true);
  assert.equal(lineCount(text("pt-tp3-nmap-grep.gnmap")) <= 40, true);
  assert.equal(lineCount(text("pt-tp3-nmap-xml.xml")) >= 180, true);
  assert.equal(lineCount(text("pt-tp3-nmap-xml.xml")) <= 260, true);
  assert.equal(lineCount(text("pt-tp3-services-attendus.txt")) >= 40, true);
  assert.equal(lineCount(text("pt-tp3-services-attendus.txt")) <= 65, true);
  assert.equal(lineCount(text("pt-tp3-guide.md")) >= 70, true);
  assert.equal(lineCount(text("pt-tp3-guide.md")) <= 100, true);
});

test("TP3 files are deterministic and clean", () => {
  const first = buildPtAssetsTp3();
  const second = buildPtAssetsTp3();
  assert.deepEqual(first, second);
  for (const file of first.files.map((entry) => ({ name: entry.name, data: entry.data.toString("utf8") }))) {
    assert.equal((file.data.match(/\*{6}/g) || []).length, 0, `${file.name} contient une sequence masquee`);
    assert.notEqual(file.data.charCodeAt(0), 0xfeff, `${file.name} : pas de BOM`);
    assert.equal(file.data.includes("\r"), false, `${file.name} : pas de CRLF`);
    for (let index = 0; index < file.data.length; index += 1) {
      const code = file.data.charCodeAt(index);
      if (code < 32 && code !== 9 && code !== 10) assert.fail(`${file.name} contient un caractere de controle interdit U+${code.toString(16).padStart(4, "0")}`);
    }
  }
  for (const source of [
    path.join(process.cwd(), "scripts", "lab-scenarios-pt-tp3.cjs"),
    path.join(process.cwd(), "supabase", "seed", "content", "pt-lab-tp3.ts"),
    path.join(process.cwd(), "tests", "pt-lab-tp3.test.cjs"),
  ]) {
    const data = fs.readFileSync(source, "utf8");
    assert.equal((data.match(/\*{6}/g) || []).length, 0, `${path.basename(source)} contient une sequence masquee`);
  }
});

test("TP3 answers are recalculated independently from the generated files", () => {
  const current = scenario();
  const lab = current.labs[0];
  const normal = parseNormal(current.text("pt-tp3-nmap-normal.txt"));
  const grep = parseGrep(current.text("pt-tp3-nmap-grep.gnmap"));
  const xml = parseXml(current.text("pt-tp3-nmap-xml.xml"));
  const memo = parseMemo(current.text("pt-tp3-services-attendus.txt"));
  assert.match(current.text("pt-tp3-nmap-normal.txt"), /^Starting Nmap [0-9.]+ \(\s*https:\/\/nmap\.org\s*\) at .+ UTC$/mu);
  assert.match(current.text("pt-tp3-nmap-normal.txt"), /^Nmap done: 10 IP addresses \(7 hosts up\) scanned in 268\.40 seconds$/mu);
  assert.match(current.text("pt-tp3-nmap-xml.xml"), /<verbose level="0"\/>/u);
  assert.match(current.text("pt-tp3-nmap-xml.xml"), /<debugging level="0"\/>/u);
  assert.match(current.text("pt-tp3-nmap-xml.xml"), /<service name="http" tunnel="ssl"/u);
  assert.match(current.text("pt-tp3-nmap-xml.xml"), /<times srtt="/u);

  const upHosts = grep.statusOrder.filter((entry) => entry.status === "up");
  assert.ok(upHosts.every((entry) => grep.hosts.get(entry.host || entry.ip)?.ignoredState === "closed"));
  const openCounts = xml
    .filter((host) => host.state === "up")
    .map((host) => ({ hostname: host.hostname, count: host.ports.filter((port) => port.state === "open").length }))
    .sort((left, right) => right.count - left.count || left.hostname.localeCompare(right.hostname));
  assert.notEqual(openCounts[0].count, openCounts[1].count, "maximum de ports open non unique");

  const mailHost = normal.hosts.get("mail.sahel-vert.example");
  assert.ok(mailHost, "hote mail absent de la sortie normale");
  const mail993 = mailHost.ports.find((port) => port.port === 993);
  assert.ok(mail993, "port 993 absent pour mail");
  const wwwHost = normal.hosts.get("www.sahel-vert.example");
  assert.ok(wwwHost, "hote www absent de la sortie normale");
  const wwwWebVersion = wwwHost.ports.find((port) => port.port === 80)?.version || wwwHost.ports.find((port) => port.port === 443)?.version;
  assert.ok(wwwWebVersion, "version web de www introuvable");

  const vpnXml = xml.find((host) => host.hostname === "vpn.sahel-vert.example");
  assert.ok(vpnXml, "hote vpn absent du XML");
  const vpnExpected = new Set((memo.get("vpn.sahel-vert.example")?.publics || []).map((entry) => entry.port));
  const unexpectedVpnPort = vpnXml.ports.find((port) => port.state === "open" && !vpnExpected.has(port.port));
  assert.ok(unexpectedVpnPort, "port inattendu du VPN introuvable");

  const dbHosts = xml.filter((host) => host.ports.some((port) => port.state === "open" && [5432, 3306].includes(port.port)));
  assert.equal(dbHosts.length, 1, "exposition de base de donnees non unique");

  const firstDown = grep.statusOrder.find((entry) => entry.status === "down");
  assert.ok(firstDown, "aucun hote down");
  const mailXml = xml.find((host) => host.hostname === "mail.sahel-vert.example");
  assert.ok(mailXml, "hote mail absent du XML");
  const mail25 = mailXml.ports.find((port) => port.port === 25);
  assert.ok(mail25, "port 25 mail absent");

  const forbiddenPairs = [];
  for (const host of xml.filter((entry) => entry.state === "up")) {
    const memoRow = memo.get(host.hostname);
    if (!memoRow) continue;
    for (const internal of memoRow.internes) {
      if (host.ports.some((port) => port.port === internal.port && port.state === "open")) forbiddenPairs.push(`${host.hostname}:${internal.port}`);
    }
  }
  assert.equal(forbiddenPairs.length, 1, "couple interne publie non unique");

  const mixedHosts = xml.filter((host) => {
    if (host.state !== "up") return false;
    const normalPorts = normal.hosts.get(host.hostname)?.ports ?? [];
    const hasWeb = normalPorts.some((port) => port.state === "open" && ["http", "ssl/http"].includes(port.service));
    const hasAdminOrData = normalPorts.some((port) => port.state === "open" && [22, 3306, 5432].includes(port.port));
    return hasWeb && hasAdminOrData;
  });

  const filteredLetter = /a\)\s*open b\)\s*closed c\)\s*filtered d\)\s*up/iu.test(lab.tasks[12].prompt) ? "c" : null;
  const xmlLetter = /a\)\s*la sortie normale b\)\s*la sortie xml c\)\s*la sortie greppable d\)\s*le mémo/iu.test(lab.tasks[13].prompt) ? "b" : null;
  assert.ok(filteredLetter && xmlLetter, "options des questions a choix inattendues");

  const expected = [
    String(upHosts.length),
    openCounts[0].hostname,
    String(xml.flatMap((host) => host.ports.filter((port) => port.state === "open")).length),
    mail993.service,
    wwwWebVersion,
    String(unexpectedVpnPort.port),
    dbHosts[0].hostname,
    String(xml.flatMap((host) => host.ports.filter((port) => port.state === "filtered")).length),
    firstDown.ip,
    mail25.product,
    forbiddenPairs[0],
    String(mixedHosts.length),
    filteredLetter,
    xmlLetter,
    normal.startUtc,
  ];

  expected.forEach((answer, index) => {
    assert.ok(lab.tasks[index].accepted.includes(normalize(answer)), `reponse absente pour la tache ${index + 1}: ${answer}`);
  });
});

test("TP3 guide, support text and tasks do not leak answers", () => {
  const current = scenario();
  const lab = current.labs[0];
  const guideText = normalize(current.text("pt-tp3-guide.md"));
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

test("TP3 guide commands run, print something and never show a lab answer", {
  skip: !fs.existsSync(bashPath) || !fs.existsSync(powershellPath) ? "Git Bash ou PowerShell absent" : false,
}, () => {
  const current = scenario();
  const lab = current.labs[0];
  const blocks = codeBlocks(current.text("pt-tp3-guide.md"));
  assert.ok(blocks.length >= 6, "blocs de guide manquants");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pt-tp3-guide-"));
  try {
    for (const block of blocks) {
      const result = runGuideBlock(dir, block);
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      assert.equal(result.status, 0, `${block.language}\n${output}`);
      assert.notEqual(normalize(output), "", `sortie vide pour ${block.language}`);
      for (const task of lab.tasks) {
        for (const answer of task.accepted) {
          assert.equal(printsAnswer(output, answer), false, `un bloc ${block.language} affiche la reponse ${answer}`);
        }
      }
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
