const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildLogsAssetsB } = require("../scripts/lab-scenarios-logs-b.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
// The prompts and the guides carry their accents; the parsers below read them without.
const plain = (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);
const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
const MONTHS = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

function scenario() {
  const generated = buildLogsAssetsB();
  const { buildLogsLabsB } = load("supabase/seed/content/logs-labs-b");
  const labs = buildLogsLabsB(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function assetName(url) {
  return path.posix.basename(url);
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
  return [...markdown.matchAll(/```(bash|powershell)\n([\s\S]*?)```/g)].map((match) => ({ language: match[1], code: match[2].trim() }));
}

function runBashBlock(dir, code) {
  const scriptPath = path.join(dir, "guide-block.sh");
  fs.writeFileSync(scriptPath, `set -euo pipefail\ncd "${dir.replace(/\\/g, "/")}"\n${code}\n`);
  return spawnSync(bashPath, [scriptPath], { cwd: dir, encoding: "utf8" });
}

function runPowerShellBlock(dir, code) {
  const scriptPath = path.join(dir, "guide-block.ps1");
  fs.writeFileSync(scriptPath, `Set-StrictMode -Version Latest\n$ErrorActionPreference = "Stop"\nSet-Location "${dir.replace(/\\/g, "\\\\")}"\n${code}\n`);
  return spawnSync(powershellPath, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], { cwd: dir, encoding: "utf8" });
}

function parseAccessLog(raw) {
  return raw.trim().split("\n").map((line) => {
    const match = /^(?<ip>\S+) - - \[(?<stamp>[^\]]+)\] "(?<method>\S+) (?<requestPath>\S+) HTTP\/1\.1" (?<status>\d{3}) (?<bytes>\d+) "(?<referer>[^"]*)" "(?<ua>[^"]*)"$/u.exec(line);
    assert.ok(match, `ligne acces illisible: ${line}`);
    const stamp = match.groups.stamp;
    const iso = `${stamp.slice(7, 11)}-${MONTHS[stamp.slice(3, 6)]}-${stamp.slice(0, 2)}T${stamp.slice(12, 20)}Z`;
    return {
      ip: match.groups.ip,
      method: match.groups.method,
      requestPath: match.groups.requestPath,
      status: Number(match.groups.status),
      bytes: Number(match.groups.bytes),
      referer: match.groups.referer,
      userAgent: match.groups.ua,
      timeUtc: iso,
    };
  });
}

function parseProxyLog(raw) {
  return raw.trim().split("\n").map((line) => {
    const match = /^(?<epoch>\d+\.\d+)\s+(?<duration>\d+)\s+(?<client>\S+)\s+(?<cache>\S+)\/(?<status>\d+)\s+(?<bytes>\d+)\s+(?<method>\S+)\s+(?<url>\S+)\s+-\s+(?<peer>\S+)\s+(?<mime>\S+)$/u.exec(line);
    assert.ok(match, `ligne proxy illisible: ${line}`);
    return {
      timeUtc: new Date(Number(match.groups.epoch) * 1000).toISOString(),
      duration: Number(match.groups.duration),
      clientIp: match.groups.client,
      cacheCode: match.groups.cache,
      status: Number(match.groups.status),
      bytes: Number(match.groups.bytes),
      method: match.groups.method,
      url: match.groups.url,
      peer: match.groups.peer,
      mime: match.groups.mime,
    };
  });
}

function parseAuthLog(raw) {
  return raw.trim().split("\n").map((line) => {
    const match = /^(?<month>[A-Z][a-z]{2})\s+(?<day>\d{1,2})\s+(?<clock>\d{2}:\d{2}:\d{2})\s+(?<host>\S+)\s+(?<program>[^:]+):\s+(?<message>.+)$/u.exec(line);
    assert.ok(match, `ligne auth illisible: ${line}`);
    const isoLocal = `2026-${MONTHS[match.groups.month]}-${String(Number(match.groups.day)).padStart(2, "0")}T${match.groups.clock}Z`;
    return {
      timeUtc: new Date(Date.parse(isoLocal) - 3600000).toISOString(),
      host: match.groups.host,
      program: match.groups.program,
      message: match.groups.message,
    };
  });
}

function parseLeases(raw) {
  return raw.trim().split("\n").slice(1).map((line) => {
    const [ip, mac, hostname, start, end] = line.split(";");
    return { ip, mac, hostname, start, end };
  });
}

function parseTimelineTemplate(raw) {
  return raw.trim().split("\n")
    .filter((line) => /^\| /.test(line))
    .slice(2)
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .map(([step, timeUtc, source, proof, note]) => ({ step, timeUtc, source, proof, note }));
}

function parseRules(rawText) {
  const raw = plain(rawText).replace(/`/gu, "");
  const lines = raw.trim().split("\n");
  assert.ok(lines.some((line) => line.includes("horodatage > t - N minute(s) et horodatage <= t")), "la definition de la fenetre glissante doit etre presente");
  return raw.split(/^## /mu).slice(1).map((block) => {
    const number = Number(/^Regle (\d+)/u.exec(block)[1]);
    const groupBy = /Regroupement\s*:\s*([^\n]+)/u.exec(block)[1].trim();
    const threshold = Number(/Seuil\s*:\s*au moins (\d+) echec\(s\)/u.exec(block)[1]);
    const windowMinutes = Number(/Fenetre\s*:\s*(\d+) minute\(s\)/u.exec(block)[1]);
    const excludeIps = /Exclusions SourceIp\s*:\s*([^\n]*)/u.exec(block)[1].split(",").map((value) => value.trim()).filter(Boolean);
    const excludeAccounts = /Exclusions Account\s*:\s*([^\n]*)/u.exec(block)[1].split(",").map((value) => value.trim()).filter(Boolean);
    return { number, groupBy, threshold, windowMinutes, excludeIps, excludeAccounts };
  }).sort((a, b) => a.number - b.number);
}

function parseEvents(raw) {
  return raw.trim().split("\n").slice(1).map((line) => {
    const [timeUtc, sourceIp, account, result, truth] = line.split(";");
    return { timeUtc, sourceIp, account, result, truth };
  });
}

function eventKey(event, grouping) {
  if (grouping === "SourceIp") return event.sourceIp;
  if (grouping === "Account") return event.account;
  if (grouping === "SourceIp + Account") return `${event.sourceIp}|${event.account}`;
  throw new Error(`groupement inconnu: ${grouping}`);
}

function isExcluded(event, rule) {
  if (rule.excludeIps.includes(event.sourceIp)) return true;
  if (rule.excludeAccounts.includes(event.account)) return true;
  return false;
}

function roundHalfUp(value) {
  return Math.floor(value + 0.5);
}

function evaluateRule(events, rule) {
  const failures = events.filter((event) => event.result === "failure");
  const alerts = [];
  for (const current of failures) {
    if (isExcluded(current, rule)) continue;
    const currentTime = Date.parse(current.timeUtc);
    const inWindow = failures.filter((candidate) => {
      if (isExcluded(candidate, rule)) return false;
      if (eventKey(candidate, rule.groupBy) !== eventKey(current, rule.groupBy)) return false;
      const candidateTime = Date.parse(candidate.timeUtc);
      return candidateTime > currentTime - rule.windowMinutes * 60000 && candidateTime <= currentTime;
    });
    if (inWindow.length >= rule.threshold) alerts.push(current);
  }
  const vp = alerts.filter((event) => event.truth === "attaque").length;
  const fp = alerts.filter((event) => event.truth === "normal").length;
  const fn = failures.filter((event) => event.truth === "attaque" && !alerts.includes(event)).length;
  const precision = vp + fp === 0 ? 0 : roundHalfUp((vp / (vp + fp)) * 100);
  const recall = vp + fn === 0 ? 0 : roundHalfUp((vp / (vp + fn)) * 100);
  const f1 = precision + recall === 0 ? 0 : roundHalfUp((2 * precision * recall) / (precision + recall));
  return { alerts, vp, fp, fn, precision, recall, f1 };
}

function deriveTp4(current) {
  const lab = current.labs[0];
  const access = parseAccessLog(current.text("slg-tp4-acces.log"));
  const proxy = parseProxyLog(current.text("slg-tp4-proxy.log"));
  const auth = parseAuthLog(current.text("slg-tp4-auth.log"));
  const leases = parseLeases(current.text("slg-tp4-baux-dhcp.log"));
  const timeline = parseTimelineTemplate(current.text("slg-tp4-modele-chronologie.md"));

  const incidentIp = /adresse ([0-9.]+) a 2026-05-23T10:19:31Z/u.exec(plain(lab.tasks[0].prompt))[1];
  const leaseAtSsh = leases.find((lease) => lease.ip === incidentIp && Date.parse(lease.start) <= Date.parse("2026-05-23T10:19:31Z") && Date.parse("2026-05-23T10:19:31Z") < Date.parse(lease.end));

  const prefix = /commencant par « ([^»]+) »/u.exec(plain(lab.tasks[2].prompt))[1];
  const firstPrefix = access.filter((row) => row.ip === incidentIp && row.requestPath.startsWith(prefix)).sort((a, b) => Date.parse(a.timeUtc) - Date.parse(b.timeUtc))[0];

  const exactPath = /POST vers « ([^»]+) »/u.exec(plain(lab.tasks[3].prompt))[1];
  const postEdit = access.filter((row) => row.ip === incidentIp && row.method === "POST" && row.requestPath === exactPath).sort((a, b) => Date.parse(a.timeUtc) - Date.parse(b.timeUtc))[0];

  const firstSsh = auth.filter((row) => row.message.includes(`from ${incidentIp}`) && row.message.startsWith("Accepted password")).sort((a, b) => Date.parse(a.timeUtc) - Date.parse(b.timeUtc))[0];
  const sshAccount = /Accepted password for (\S+) from/u.exec(firstSsh.message)[1];

  const proxyPost = proxy.find((row) => row.clientIp === incidentIp && row.method === "POST" && row.url.endsWith(exactPath));
  const driftMinutes = Math.round((Date.parse(postEdit.timeUtc) - Date.parse(proxyPost.timeUtc)) / 60000);

  const consultationPath = /consultation « ([^»]+) »/u.exec(plain(lab.tasks[8].prompt))[1];
  const consultationSources = [
    access.some((row) => row.ip === incidentIp && row.requestPath === consultationPath),
    proxy.some((row) => row.clientIp === incidentIp && row.url.endsWith(consultationPath)),
    auth.some((row) => row.message.includes(consultationPath)),
  ].filter(Boolean).length;

  const correctedProxy = proxy.map((row) => ({ ...row, correctedUtc: new Date(Date.parse(row.timeUtc) + driftMinutes * 60000).toISOString() }));
  const notesProxy = correctedProxy.find((row) => row.clientIp === incidentIp && row.url.includes("login-notes.txt"));
  const order = [
    { key: "premiere consultation de la fiche", iso: firstPrefix.timeUtc },
    { key: "post de modification", iso: postEdit.timeUtc },
    { key: "succes ssh", iso: firstSsh.timeUtc },
    { key: "consultation des notes externes", iso: notesProxy.correctedUtc },
  ].sort((a, b) => Date.parse(a.iso) - Date.parse(b.iso)).map((entry) => entry.key);

  const optionOrderLetter = parseChoices(plain(lab.tasks[9].prompt)).find((option) => {
    const sequence = option.text.split(",").map((part) => part.trim().toLowerCase());
    return sequence.length === order.length && sequence.every((entry, index) => entry === order[index]);
  }).letter;

  const falseLeadOptions = parseChoices(plain(lab.tasks[10].prompt));
  const falseLeadLetter = falseLeadOptions.find((option) => {
    const match = /Attribuer ([0-9.]+) a (\S+) a ([0-9TZ:-]+)/u.exec(option.text);
    if (!match) return false;
    const [ip, host, time] = [match[1], match[2], match[3]];
    const lease = leases.find((entry) => entry.ip === ip && Date.parse(entry.start) <= Date.parse(time) && Date.parse(time) < Date.parse(entry.end));
    return !lease || lease.hostname !== host;
  }).letter;

  const timelineRowsNotFromAccess = timeline.filter((row) => row.source !== "acces.log").length;
  const lastActivityCandidates = [
    ...access.filter((row) => row.ip === incidentIp && Date.parse(row.timeUtc) >= Date.parse(firstPrefix.timeUtc)).map((row) => row.timeUtc),
    ...correctedProxy.filter((row) => row.clientIp === incidentIp && Date.parse(row.correctedUtc) >= Date.parse(firstPrefix.timeUtc)).map((row) => row.correctedUtc),
    ...auth.filter((row) => row.message.includes(`from ${incidentIp}`) || row.message.includes(` ${incidentIp} `)).map((row) => row.timeUtc),
  ].sort((a, b) => Date.parse(a) - Date.parse(b));
  const lastActivityTime = lastActivityCandidates[lastActivityCandidates.length - 1].slice(11, 19);

  const conclusionOptions = parseChoices(plain(lab.tasks[14].prompt));
  const sequenceOptions = conclusionOptions.filter((option) => option.text.includes(incidentIp) && /consultation web, une modification puis un succes SSH/u.test(option.text));
  assert.equal(sequenceOptions.length, 1, "une seule conclusion cite l'adresse et la séquence web puis SSH");
  const conclusionLetter = sequenceOptions[0].letter;

  return [
    leaseAtSsh.hostname,
    leaseAtSsh.mac,
    firstPrefix.timeUtc.slice(11, 19),
    postEdit.timeUtc.slice(11, 19),
    String(Math.round((Date.parse(postEdit.timeUtc) - Date.parse(firstPrefix.timeUtc)) / 60000)),
    sshAccount,
    firstSsh.timeUtc.slice(11, 19),
    String(driftMinutes),
    String(consultationSources),
    optionOrderLetter,
    falseLeadLetter,
    String(timelineRowsNotFromAccess),
    lastActivityTime,
    String(Math.round((Date.parse(`2026-05-25T${lastActivityTime}Z`) - Date.parse(`2026-05-25T${postEdit.timeUtc.slice(11, 19)}Z`)) / 60000)),
    conclusionLetter,
  ];
}

function parseChoices(prompt) {
  return prompt.split("\n").slice(1).map((line) => {
    const match = /^([a-d])\)\s+(.+)$/u.exec(line.trim());
    return match ? { letter: match[1], text: match[2] } : null;
  }).filter(Boolean);
}

function deriveTp5(current) {
  const lab = current.labs[1];
  const rules = parseRules(current.text("slg-tp5-regles.md"));
  const events = parseEvents(current.text("slg-tp5-evenements.csv"));
  const r1 = evaluateRule(events, rules[0]);
  const r2 = evaluateRule(events, rules[1]);
  const r3 = evaluateRule(events, rules[2]);

  let noFpThreshold = rules[0].threshold;
  for (let threshold = rules[0].threshold; threshold <= 12; threshold += 1) {
    const result = evaluateRule(events, { ...rules[0], threshold });
    if (result.fp === 0) {
      noFpThreshold = threshold;
      break;
    }
  }

  const fpByAccount = new Map();
  for (const alert of r2.alerts.filter((event) => event.truth === "normal")) fpByAccount.set(alert.account, (fpByAccount.get(alert.account) ?? 0) + 1);
  const noisyAccount = [...fpByAccount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const r2WithExclusion = evaluateRule(events, { ...rules[1], excludeAccounts: [...rules[1].excludeAccounts, noisyAccount] });

  const attackIps = [...new Set(events.filter((event) => event.truth === "attaque").map((event) => event.sourceIp))];
  const triggeredIps = new Set([
    ...r1.alerts.filter((event) => event.truth === "attaque").map((event) => event.sourceIp),
    ...r2.alerts.filter((event) => event.truth === "attaque").map((event) => event.sourceIp),
    ...r3.alerts.filter((event) => event.truth === "attaque").map((event) => event.sourceIp),
  ]);
  const isSlow = (ip) => {
    const times = events.filter((event) => event.truth === "attaque" && event.result === "failure" && event.sourceIp === ip).map((event) => Date.parse(event.timeUtc)).sort((a, b) => a - b);
    return times.length >= 5 && times.every((time, index) => index === 0 || time - times[index - 1] > 10 * 60000);
  };
  const slowIps = attackIps.filter((ip) => !triggeredIps.has(ip) && isSlow(ip));
  assert.equal(slowIps.length, 1, "une seule attaque lente (au moins cinq échecs espacés de plus de dix minutes, aucune alerte)");
  const unseenAttackIp = slowIps[0];

  const byPrecision = [r1, r2, r3].map((result, index) => ({ rule: index + 1, value: result.precision })).sort((a, b) => b.value - a.value || a.rule - b.rule)[0].rule;
  const byRecall = [r1, r2, r3].map((result, index) => ({ rule: index + 1, value: result.recall })).sort((a, b) => b.value - a.value || a.rule - b.rule)[0].rule;
  const deployment = [r1, r2, r3].map((result, index) => ({ rule: index + 1, result }))
    .filter((entry) => entry.result.precision >= 60)
    .sort((a, b) => b.result.recall - a.result.recall || b.result.precision - a.result.precision || a.rule - b.rule)[0];
  const bestF1 = [r1, r2, r3].map((result, index) => ({ rule: index + 1, result })).sort((a, b) => b.result.f1 - a.result.f1 || b.result.precision - a.result.precision || a.rule - b.rule)[0];
  const deploymentLetter = parseChoices(plain(lab.tasks[13].prompt)).find((option) => option.text.toLowerCase().endsWith(String(deployment.rule))).letter;

  return [
    String(r1.alerts.length),
    String(r1.vp),
    String(r1.fp),
    String(r1.fn),
    String(r1.precision),
    String(r1.recall),
    String(r3.alerts.length),
    String(byPrecision),
    String(byRecall),
    String(noFpThreshold),
    noisyAccount,
    String(r2WithExclusion.recall),
    unseenAttackIp,
    deploymentLetter,
    String(bestF1.rule),
  ];
}

test("les laboratoires logs B restent deterministes et chaque fichier est propre", () => {
  const first = buildLogsAssetsB();
  const second = buildLogsAssetsB();
  assert.deepEqual(first.facts, second.facts);
  assert.equal(first.files.length, second.files.length);
  first.files.forEach((file, index) => {
    assert.equal(file.name, second.files[index].name);
    assert.equal(Buffer.compare(file.data, second.files[index].data), 0, `${file.name} doit etre identique`);
    assert.equal(file.data.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false, `${file.name} ne doit pas avoir de BOM`);
    assert.equal(file.data.includes(Buffer.from("\r\n")), false, `${file.name} doit rester en LF`);
    assert.ok(file.data.length < 150 * 1024, `${file.name} doit rester sous 150 Ko`);
    const text = file.data.toString("utf8");
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      if (code < 32 && code !== 10) assert.fail(`${file.name} contient un caractere de controle interdit U+${code.toString(16).padStart(4, "0")}`);
    }
  });
});

test("les labs logs B declarent exactement leurs fichiers et passent labIssues", () => {
  const { labs, generated } = scenario();
  assert.deepEqual(labs.map((lab) => lab.slug), ["tp-logs-correlation", "tp-logs-detection"]);
  for (const lab of labs) assert.deepEqual(labIssues(lab), [], `${lab.slug} doit avoir zero probleme`);
  const assetNames = new Set(labs.flatMap((lab) => lab.assets.map((asset) => assetName(asset.url))));
  const fileNames = new Set(generated.files.map((file) => file.name));
  assert.deepEqual([...assetNames].sort(), [...fileNames].sort());
  for (const lab of labs) for (const task of lab.tasks) {
    assert.ok(task.accepted.length >= 1 && task.accepted.length <= 8, `${lab.slug} : nombre de reponses accepte invalide`);
    for (const answer of task.accepted) assert.equal(answer, normalize(answer), `${lab.slug} : reponse non normalisee`);
  }
});

test("les reponses du TP 4 se recalculent depuis les fichiers et le texte des questions", () => {
  const current = scenario();
  const derived = deriveTp4(current);
  const lab = current.labs[0];
  assert.equal(derived.length, lab.tasks.length);
  derived.forEach((answer, index) => assert.ok(lab.tasks[index].accepted.includes(normalize(answer)), `TP4 question ${index + 1}`));
});

test("les reponses du TP 5 se recalculent depuis evenements.csv et regles.md", () => {
  const current = scenario();
  const derived = deriveTp5(current);
  const lab = current.labs[1];
  assert.equal(derived.length, lab.tasks.length);
  derived.forEach((answer, index) => assert.ok(lab.tasks[index].accepted.includes(normalize(answer)), `TP5 question ${index + 1}`));
});

test("les guides et le support des labs logs B ne divulguent aucune reponse significative", () => {
  const { labs, files } = scenario();
  for (const lab of labs) {
    const guideAssets = lab.assets.filter((asset) => asset.kind === "guide" || asset.kind === "report_template");
    const guideText = normalize(guideAssets.map((asset) => files.get(asset.url.replace("/labs/", "")).toString("utf8")).join("\n"));
    const supportText = normalize([lab.briefing, ...lab.constraints, ...lab.objectives, ...lab.hints].join("\n"));
    for (const task of lab.tasks) for (const answer of significantAnswers(task)) {
      assert.equal(containsAnswer(guideText, answer), false, `${lab.slug} fuit la reponse « ${answer} » dans un guide ou modele`);
      assert.equal(containsAnswer(supportText, answer), false, `${lab.slug} fuit la reponse « ${answer} » dans le support`);
    }
    guideAssets.forEach((asset) => {
      const markdown = files.get(asset.url.replace("/labs/", "")).toString("utf8");
      let open = false;
      for (const line of markdown.split("\n")) if (line.trim().startsWith("```")) open = !open;
      assert.equal(open, false, `${lab.slug} : bloc de code non ferme dans ${asset.url}`);
    });
  }
});

test("les blocs bash des guides s’executent dans Git Bash sous Windows", {
  skip: process.platform !== "win32" ? "test reserve a Windows" : !fs.existsSync(bashPath) ? "Git Bash absent" : false,
}, () => {
  const current = scenario();
  const guides = ["slg-tp4-guide.md", "slg-tp5-guide.md"];
  for (const guide of guides) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "logs-b-guide-"));
    try {
      const markdown = current.text(guide);
      for (const block of extractCodeBlocks(markdown).filter((entry) => entry.language === "bash")) {
        const result = runBashBlock(dir, block.code);
        assert.equal(result.status, 0, `${guide} bash: ${result.stderr}`);
        assert.notEqual((result.stdout ?? "").trim(), "", `${guide} bash sortie vide`);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("les blocs powershell des guides s’executent sous powershell.exe 5.1", {
  skip: process.platform !== "win32" ? "test reserve a Windows" : !fs.existsSync(powershellPath) ? "powershell.exe absent" : false,
}, () => {
  const current = scenario();
  const guides = ["slg-tp4-guide.md", "slg-tp5-guide.md"];
  for (const guide of guides) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "logs-b-guide-"));
    try {
      const markdown = current.text(guide);
      for (const block of extractCodeBlocks(markdown).filter((entry) => entry.language === "powershell")) {
        const result = runPowerShellBlock(dir, block.code);
        assert.equal(result.status, 0, `${guide} powershell: ${result.stderr}`);
        assert.notEqual((result.stdout ?? "").trim(), "", `${guide} powershell sortie vide`);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});
