const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildLinuxAssetsC } = require("../scripts/lab-scenarios-linux-c.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");
const { load } = require("../scripts/ts-loader.cjs");

const AUDIT_DATE = "2026-04-27";
const BASH_PATH = "C:\\Program Files\\Git\\bin\\bash.exe";

const normalize = (value) => String(value).toLowerCase().trim().replace(/\s+/g, " ");
const accept = (task, value) => task.accepted.includes(normalize(value));
const publicIp = /^(?:192\.0\.2|198\.51\.100|203\.0\.113)\.\d{1,3}$/;

function dayDiff(fromDate, toDate) {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86400000);
}

function minuteDiff(fromIso, toIso) {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60000);
}

function parseTsv(content) {
  const lines = content.trim().split("\n");
  const headers = lines.shift().split("\t");
  return lines.map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function parseGuideBlocks(markdown, language) {
  const blocks = [];
  const regex = new RegExp(`\`\`\`${language}\\n([\\s\\S]*?)\`\`\``, "g");
  let match;
  while ((match = regex.exec(markdown)) !== null) blocks.push(match[1].trim());
  return blocks;
}

function parseGridRows(markdown) {
  return markdown.split("\n")
    .filter((line) => /^\|/.test(line))
    .slice(2)
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 5)
    .map(([id, domaine, poids, statut, critere]) => ({ id, domaine, poids: Number(poids), statut, critere }));
}

function extractSection(content, title) {
  const marker = `# ${title}\n`;
  const start = content.indexOf(marker);
  if (start === -1) return "";
  const rest = content.slice(start + marker.length);
  const next = rest.indexOf("\n# ");
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function parseAuthLog(content) {
  return content.trim().split("\n").map((line) => {
    const failed = /Failed password for (?:invalid user )?(\S+) from (\S+)/.exec(line);
    if (failed) return { type: "failed", user: failed[1], ip: failed[2], time: line.slice(7, 15), line };
    const acceptedPassword = /Accepted password for (\S+) from (\S+)/.exec(line);
    if (acceptedPassword) return { type: "accepted-password", user: acceptedPassword[1], ip: acceptedPassword[2], time: line.slice(7, 15), line };
    const acceptedKey = /Accepted publickey for (\S+) from (\S+)/.exec(line);
    if (acceptedKey) return { type: "accepted-key", user: acceptedKey[1], ip: acceptedKey[2], time: line.slice(7, 15), line };
    const useradd = /new user: name=(\w+), UID=/.exec(line);
    if (useradd) return { type: "useradd", user: useradd[1], time: line.slice(7, 15), line };
    return { type: "other", time: line.slice(7, 15), line };
  });
}

function parseAccessLog(content) {
  return content.trim().split("\n").map((line) => {
    const match = /^(\S+) - - \[(\d{2}\/\w+\/\d{4}:\d{2}:\d{2}:\d{2} \+0000)\] "(\S+) (\S+) HTTP\/1\.1" (\d{3}) (\d+)/.exec(line);
    assert.ok(match, `ligne nginx reconnue: ${line}`);
    return {
      ip: match[1],
      timestamp: match[2],
      method: match[3],
      requestPath: match[4],
      status: Number(match[5]),
      bytes: Number(match[6]),
      line,
    };
  });
}

function parsePs(content) {
  return content.trim().split("\n").slice(1).map((line) => {
    const parts = line.trim().split(/\s+/);
    return { user: parts[0], pid: Number(parts[1]), command: parts.slice(10).join(" "), line };
  });
}

function parsePorts(content) {
  return content.trim().split("\n").slice(1).map((line) => {
    const parts = line.trim().split(/\s+/);
    return { state: parts[1], local: parts[4], peer: parts[5], process: parts.slice(6).join(" "), line };
  });
}

function parseModified(content) {
  return content.trim().split("\n").map((line) => {
    const match = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}) (\/.+)$/.exec(line);
    assert.ok(match, `ligne find -ls reconnue: ${line}`);
    return { date: match[1], filePath: match[2], line };
  });
}

function parseHashManifests(content) {
  const [referencePart, currentPart] = content.trim().split(/\n\n/);
  const parsePart = (part) => Object.fromEntries(part.split("\n").slice(1).map((line) => {
    const [hash, filePath] = line.split(/\s{2,}/);
    return [filePath, hash];
  }));
  return { reference: parsePart(referencePart), current: parsePart(currentPart) };
}

function writeAssets(tempDir, built) {
  for (const file of built.files) fs.writeFileSync(path.join(tempDir, file.name), file.data);
}

function runBashCommand(tempDir, command) {
  const scriptPath = path.join(tempDir, "guide-check.sh");
  fs.writeFileSync(scriptPath, `#!/usr/bin/env bash\nset -euo pipefail\n${command}\n`, "utf8");
  return spawnSync(BASH_PATH, [scriptPath], { cwd: tempDir, encoding: "utf8" });
}

function runPowerShellCommand(tempDir, command) {
  const scriptPath = path.join(tempDir, "guide-check.ps1");
  fs.writeFileSync(scriptPath, `$ErrorActionPreference = "Stop"\n${command}\n`, "utf8");
  return spawnSync("powershell.exe", ["-NoProfile", "-File", scriptPath], { cwd: tempDir, encoding: "utf8" });
}

function validateGuideOutput(block, output) {
  const text = output.replace(/\r/g, "").trim();
  assert.notEqual(text, "", `bloc non vide: ${block.slice(0, 80)}`);
  if (block.includes("date -u -d") || block.includes("New-TimeSpan")) {
    assert.match(text, /^110(?:\.0+)?$/);
  } else if (block.includes("print int((p / w) * 100 + 0.5)") || block.includes("[math]::Floor(((13.5 / 20) * 100) + 0.5)")) {
    assert.match(text, /^68$/);
  } else {
    const demoLines = text.split("\n").filter((line) => / : \d+ ligne\(s\)\.$/.test(line.trim()));
    assert.equal(demoLines.length, 2, `le bloc de démonstration affiche ses deux lignes de résultat : ${text}`);
  }
}

function deriveProjectMetrics(fileMap) {
  const systemText = fileMap.get("lnx-proj-preuves-systeme.txt");
  const accessText = fileMap.get("lnx-proj-preuves-acces.txt");
  const servicesText = fileMap.get("lnx-proj-preuves-services.txt");
  const gridRows = parseGridRows(fileMap.get("lnx-proj-grille-audit.md"));

  const securityUpdates = (systemText.match(/bookworm-security/g) ?? []).length;
  const rootUse = Number(/\/dev\/vda1\s+\d+G\s+\d+G\s+\d+G\s+(\d+)% \//.exec(systemText)[1]);
  const rootIUse = Number(/\/dev\/vda1\s+\d+\s+\d+\s+\d+\s+(\d+)% \//.exec(systemText.split("# df -i")[1])[1]);
  const tmpOptions = /\/tmp\s+tmpfs\s+tmpfs\s+([^\n]+)/.exec(systemText)[1];
  const ipForward = /net\.ipv4\.ip_forward = (\d+)/.exec(systemText)[1];
  const rpFilter = /net\.ipv4\.conf\.all\.rp_filter = (\d+)/.exec(systemText)[1];
  const standardSupportEnd = /support_standard_jusqu_au=(\d{4}-\d{2}-\d{2})/.exec(systemText)[1];
  const extendedSupportEnd = /support_etendu_jusqu_au=(\d{4}-\d{2}-\d{2})/.exec(systemText)[1];

  const passwdRows = extractSection(accessText, "/etc/passwd").split("\n").filter(Boolean);
  const sudoRules = extractSection(accessText, "/etc/sudoers.d/web-maintenance").split("\n").filter(Boolean);
  const passwordAuthentication = /passwordauthentication (\w+)/.exec(accessText)[1];
  const permitRootLogin = /permitrootlogin (\S+)/.exec(accessText)[1];
  const openAllInterfaces = [...accessText.matchAll(/^\s*tcp\s+LISTEN\s+\d+\s+\d+\s+0\.0\.0\.0:\d+\s+/mg)].length;
  const sshRestricted = /\[ 1\] 22\/tcp\s+ALLOW IN\s+10\.20\.0\.100/.test(accessText);
  const defaultIncomingDeny = /Default: deny \(incoming\)/.test(accessText);
  const serviceInteractiveCount = passwdRows.filter((row) => /^svc-/.test(row) && /:\/bin\/bash$/.test(row)).length;
  const riskySudoCount = sudoRules.filter((line) => /NOPASSWD/.test(line)).length;

  const auditdActive = /auditd\.service\s+loaded active\s+running/.test(servicesText);
  const auditdInactive = /auditd\.service\s+loaded inactive dead/.test(servicesText);
  const auditdFailed = /auditd\.service\s+loaded failed\s+failed/.test(servicesText);
  const rsyslogActive = /rsyslog\.service\s+loaded active\s+running/.test(servicesText);
  const logrotateGood = /weekly/.test(servicesText) && /rotate 8/.test(servicesText) && /compress/.test(servicesText);
  const centralForwardingActive = /^action\(type="omfwd"/m.test(servicesText);
  const centralForwardingCommented = /^# action\(type="omfwd"/m.test(servicesText);
  const failedUnexpectedServices = [...servicesText.matchAll(/^\s+(\S+)\s+loaded failed\s+failed/mg)].map((match) => match[1]).filter((name) => name === "legacy-sync.service").length;
  const successDates = [...servicesText.matchAll(/(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}Z \| SUCCESS/g)].map((match) => match[1]).sort();
  const lastSuccess = successDates.at(-1);
  const backupAgeDays = dayDiff(lastSuccess, AUDIT_DATE);
  const offsiteSuccessDates = [...servicesText.matchAll(/(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}Z \| SUCCESS \| destination=srv-sauvegarde01/g)].map((match) => match[1]).sort();
  const offsiteAgeDays = dayDiff(offsiteSuccessDates.at(-1), AUDIT_DATE);
  const restoreDate = /(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}Z \| RESTORE_OK/.exec(servicesText)[1];
  const restoreAgeDays = dayDiff(restoreDate, AUDIT_DATE);
  const integritySha = /integrity=sha256/.test(servicesText);
  const encryptionPresent = /encryption=/.test(servicesText);
  const bindLocal = /bind-address = 127\.0\.0\.1/.test(servicesText);
  const uploadsProtected = /php_admin_flag engine off|deny all;|php_flag engine off/i.test(servicesText);
  const cronSafe = /-rwxr-x--- 1 root root .* \/usr\/local\/bin\/backup-nightly\.sh/.test(servicesText) && /-rwxr-x--- 1 root root .* \/usr\/local\/bin\/cache-prime\.sh/.test(servicesText);

  const statuses = {
    AC1: permitRootLogin === "no" ? "c" : permitRootLogin === "prohibit-password" ? "p" : "n",
    AC2: passwordAuthentication === "no" ? "c" : passwordAuthentication === "yes" && sshRestricted ? "p" : "n",
    AC3: serviceInteractiveCount === 0 ? "c" : serviceInteractiveCount === 1 ? "p" : "n",
    AC4: riskySudoCount === 0 ? "c" : riskySudoCount === 1 ? "p" : "n",
    RE1: defaultIncomingDeny ? "c" : "n",
    RE2: sshRestricted ? "c" : "n",
    RE3: openAllInterfaces <= 3 ? "c" : openAllInterfaces <= 5 ? "p" : "n",
    RE4: ipForward === "0" && rpFilter === "1" ? "c" : (ipForward === "0" || rpFilter === "1") ? "p" : "n",
    SY1: securityUpdates === 0 ? "c" : securityUpdates <= 2 ? "p" : "n",
    SY2: rootUse < 85 && rootIUse < 80 ? "c" : (rootUse < 95 && rootIUse < 95) ? "p" : "n",
    SY3: [/nodev/.test(tmpOptions), /nosuid/.test(tmpOptions), /noexec/.test(tmpOptions)].filter(Boolean).length === 3 ? "c" : [/nodev/.test(tmpOptions), /nosuid/.test(tmpOptions), /noexec/.test(tmpOptions)].filter(Boolean).length === 2 ? "p" : "n",
    SY4: AUDIT_DATE <= standardSupportEnd ? "c" : AUDIT_DATE <= extendedSupportEnd ? "p" : "n",
    JO1: rsyslogActive ? "c" : "n",
    JO2: logrotateGood ? "c" : "p",
    JO3: auditdActive ? "c" : auditdInactive ? "p" : auditdFailed ? "n" : "n",
    JO4: centralForwardingActive ? "c" : centralForwardingCommented ? "p" : "n",
    SA1: backupAgeDays < 1 ? "c" : backupAgeDays <= 3 ? "p" : "n",
    SA2: offsiteAgeDays <= 7 ? "c" : offsiteAgeDays <= 14 ? "p" : "n",
    SA3: restoreAgeDays <= 90 ? "c" : restoreAgeDays <= 180 ? "p" : "n",
    SA4: integritySha && encryptionPresent ? "c" : (integritySha || encryptionPresent) ? "p" : "n",
    SE1: bindLocal ? "c" : "n",
    SE2: uploadsProtected ? "c" : "n",
    SE3: failedUnexpectedServices === 0 ? "c" : failedUnexpectedServices === 1 ? "p" : "n",
    SE4: cronSafe ? "c" : "n",
  };

  const scoreValue = { c: 1, p: 0.5, n: 0 };
  const domainScores = [...new Set(gridRows.map((row) => row.domaine))].map((domaine) => {
    const rows = gridRows.filter((row) => row.domaine === domaine);
    const weight = rows.reduce((sum, row) => sum + row.poids, 0);
    const points = rows.reduce((sum, row) => sum + row.poids * scoreValue[statuses[row.id]], 0);
    return { domaine, percent: Math.floor((points / weight) * 100 + 0.5), ratio: points / weight };
  }).sort((left, right) => left.ratio - right.ratio || left.domaine.localeCompare(right.domaine));
  const totalWeight = gridRows.reduce((sum, row) => sum + row.poids, 0);
  const totalPoints = gridRows.reduce((sum, row) => sum + row.poids * scoreValue[statuses[row.id]], 0);
  const globalPercent = Math.floor((totalPoints / totalWeight) * 100 + 0.5);

  return {
    statuses,
    securityUpdates,
    permitRootLogin,
    openAllInterfaces,
    lastSuccess,
    backupAgeDays,
    domainScores,
    globalPercent,
  };
}

test("les assets Linux C restent déterministes, cohérents et assez riches", () => {
  const first = buildLinuxAssetsC();
  const second = buildLinuxAssetsC();
  assert.deepEqual(Object.keys(first.facts), ["incident", "projet"]);
  assert.equal(first.files.length, second.files.length);
  assert.equal(JSON.stringify(first.facts), JSON.stringify(second.facts));

  const minimumLines = {
    "lnx-inc-auth.log": 350,
    "lnx-inc-acces.log": 700,
    "lnx-inc-historique.txt": 25,
    "lnx-inc-ps.txt": 60,
    "lnx-inc-ports.txt": 14,
    "lnx-inc-cron.txt": 25,
    "lnx-inc-fichiers-modifies.txt": 40,
    "lnx-inc-passwd.txt": 32,
    "lnx-inc-empreintes.txt": 84,
  };

  for (let index = 0; index < first.files.length; index += 1) {
    const left = first.files[index];
    const right = second.files[index];
    assert.equal(left.name, right.name);
    assert.ok(left.data.equals(right.data), `octets identiques pour ${left.name}`);
    assert.ok(left.name.startsWith("lnx-"), `préfixe lnx- pour ${left.name}`);
    assert.notEqual(left.data[0], 0xef, `pas de BOM dans ${left.name}`);
    assert.equal(left.data.includes(Buffer.from("\r\n")), false, `pas de CRLF dans ${left.name}`);
    assert.ok(left.data.length < 150 * 1024, `taille acceptable pour ${left.name}`);
    if (minimumLines[left.name]) {
      const lineCount = left.data.toString("utf8").trimEnd().split("\n").length;
      assert.ok(lineCount >= minimumLines[left.name], `taille réaliste pour ${left.name}`);
    }
  }
});

test("les définitions TypeScript Linux C déclarent exactement les deux labs attendus", () => {
  const built = buildLinuxAssetsC();
  const { buildLabsC } = load("supabase/seed/content/linux-labs-c");
  const labs = buildLabsC(built.facts);
  assert.deepEqual(labs.map((lab) => lab.slug), ["incident-serveur-linux", "projet-audit-linux"]);
  for (const lab of labs) {
    assert.deepEqual(labIssues(lab), [], `aucun problème de qualité pour ${lab.slug}`);
    assert.ok(lab.tasks.length >= 16, `volume d’évaluation suffisant pour ${lab.slug}`);
    for (const task of lab.tasks) {
      assert.ok(task.accepted.length >= 1 && task.accepted.length <= 8, `réponses bornées pour ${lab.slug}`);
      for (const answer of task.accepted) assert.equal(answer, normalize(answer), `réponse normalisée pour ${lab.slug}`);
    }
  }
  const declared = new Set(labs.flatMap((lab) => lab.assets.map((entry) => entry.url.replace("/labs/", ""))));
  const generated = new Set(built.files.map((file) => file.name));
  assert.deepEqual([...declared].sort(), [...generated].sort(), "chaque fichier généré est déclaré et inversement");
});

test("les réponses de l’incident Linux se recalculent depuis les fichiers générés", () => {
  const built = buildLinuxAssetsC();
  const fileMap = new Map(built.files.map((file) => [file.name, file.data.toString("utf8")]));
  const { buildLabsC } = load("supabase/seed/content/linux-labs-c");
  const lab = buildLabsC(built.facts)[0];

  const authRows = parseAuthLog(fileMap.get("lnx-inc-auth.log"));
  const accessRows = parseAccessLog(fileMap.get("lnx-inc-acces.log"));
  const psRows = parsePs(fileMap.get("lnx-inc-ps.txt"));
  const portsRows = parsePorts(fileMap.get("lnx-inc-ports.txt"));
  const modifiedRows = parseModified(fileMap.get("lnx-inc-fichiers-modifies.txt"));
  const passwdRows = fileMap.get("lnx-inc-passwd.txt").trim().split("\n");
  const hashManifests = parseHashManifests(fileMap.get("lnx-inc-empreintes.txt"));
  const historyText = fileMap.get("lnx-inc-historique.txt");
  const cronText = fileMap.get("lnx-inc-cron.txt");

  const failedByIp = new Map();
  const successByIp = new Map();
  for (const row of authRows) {
    if (row.type === "failed") failedByIp.set(row.ip, (failedByIp.get(row.ip) ?? 0) + 1);
    if (row.type === "accepted-password" || row.type === "accepted-key") successByIp.set(row.ip, (successByIp.get(row.ip) ?? 0) + 1);
  }
  const bruteForceIp = [...failedByIp.entries()]
    .filter(([ip]) => publicIp.test(ip) && !successByIp.has(ip))
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
  assert.ok(accept(lab.tasks[0], bruteForceIp));
  assert.ok(accept(lab.tasks[1], failedByIp.get(bruteForceIp)));

  const attackerIp = [...new Set(accessRows
    .filter((row) => row.method === "POST" && row.requestPath === "/espace-adherents/upload.php")
    .map((row) => row.ip))]
    .find((ip) => accessRows.some((row) => row.ip === ip && /cmd=/.test(row.requestPath)));
  assert.ok(accept(lab.tasks[2], attackerIp));

  const firstCmd = accessRows.filter((row) => row.ip === attackerIp && /cmd=/.test(row.requestPath))
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp))[0];
  const firstCmdTime = firstCmd.timestamp.split(":").slice(1).join(":").split(" +")[0];
  assert.ok(accept(lab.tasks[3], firstCmdTime));

  const shellBasename = firstCmd.requestPath.split("?")[0].split("/").at(-1);
  const uploadedPath = modifiedRows.find((row) => row.filePath.endsWith(`/${shellBasename}`)).filePath;
  assert.ok(accept(lab.tasks[4], uploadedPath));

  const webUser = psRows.find((row) => /nginx: worker process/.test(row.command)).user;
  assert.ok(accept(lab.tasks[5], webUser));

  const firstAccepted = authRows.find((row) => row.type === "accepted-password" && row.ip === attackerIp);
  assert.ok(accept(lab.tasks[6], firstAccepted.user));
  assert.ok(accept(lab.tasks[7], firstAccepted.time));
  assert.ok(accept(lab.tasks[8], firstAccepted.ip));

  const hiddenAccount = /new user: name=(\w+), UID=/.exec(fileMap.get("lnx-inc-auth.log"))[1];
  assert.ok(passwdRows.some((row) => row.startsWith(`${hiddenAccount}:`)));
  assert.ok(accept(lab.tasks[9], hiddenAccount));

  const cronScript = /root (\/usr\/local\/bin\/system-cache-refresh\.sh)/.exec(cronText)[1];
  assert.ok(historyText.includes(cronScript));
  assert.ok(accept(lab.tasks[10], cronScript));

  const outbound = portsRows.find((row) => row.state === "ESTAB" && /system-check/.test(row.process) && row.peer.startsWith("192.0.2."));
  const outboundPid = Number(/pid=(\d+)/.exec(outbound.process)[1]);
  assert.ok(psRows.some((row) => row.pid === outboundPid && /system-check/.test(row.command)));
  assert.ok(historyText.includes(outbound.peer));
  assert.ok(accept(lab.tasks[11], outbound.peer));

  const modifiedFile = Object.keys(hashManifests.reference).find((filePath) => hashManifests.current[filePath] && hashManifests.current[filePath] !== hashManifests.reference[filePath]);
  assert.ok(accept(lab.tasks[12], modifiedFile));

  const useraddTime = authRows.find((row) => row.type === "useradd").time;
  const durationMinutes = minuteDiff(`2026-04-21T${firstCmdTime}Z`, `2026-04-21T${useraddTime}Z`);
  assert.ok(accept(lab.tasks[13], durationMinutes));

  assert.ok(accept(lab.tasks[14], "b"));
  assert.ok(accept(lab.tasks[15], "d"));

  const publicIps = new Set([bruteForceIp, attackerIp, firstAccepted.ip, outbound.peer.split(":")[0]]);
  assert.ok(accept(lab.tasks[16], publicIps.size));
});

test("les réponses du projet Linux se recalculent depuis les preuves et les seuils de la grille", () => {
  const built = buildLinuxAssetsC();
  const fileMap = new Map(built.files.map((file) => [file.name, file.data.toString("utf8")]));
  const { buildLabsC } = load("supabase/seed/content/linux-labs-c");
  const lab = buildLabsC(built.facts)[1];
  const gridRows = parseGridRows(fileMap.get("lnx-proj-grille-audit.md"));
  const riskRows = parseTsv(fileMap.get("lnx-proj-risques.txt"));
  const metrics = deriveProjectMetrics(fileMap);

  assert.equal(gridRows.length, 24, "24 contrôles dans la grille");
  for (const row of gridRows) {
    assert.equal(row.statut, "", `statut vide dans la grille pour ${row.id}`);
  }
  assert.match(gridRows.find((row) => row.id === "SY1").critere, /partiel s’il y en a un ou deux ; non s’il y en a trois ou plus/u);
  assert.match(gridRows.find((row) => row.id === "SA1").critere, /moins de 24 heures ; partiel si elle date de 24 à 72 heures ; non au-delà/u);
  assert.match(gridRows.find((row) => row.id === "AC1").critere, /no ; partiel si elle est prohibit-password ; non sinon/u);

  const weightValue = { c: 1, p: 0.5, n: 0 };
  const weakestDomainLetter = metrics.domainScores[0].domaine === "accès et comptes"
    ? "a"
    : metrics.domainScores[0].domaine === "réseau"
      ? "b"
      : metrics.domainScores[0].domaine === "système et correctifs"
        ? "c"
        : metrics.domainScores[0].domaine === "journalisation"
          ? "d"
          : metrics.domainScores[0].domaine === "sauvegardes"
            ? "e"
            : "f";
  const scoredRisks = riskRows.map((row) => ({ ...row, risk: Number(row.vraisemblance) * Number(row.impact) }))
    .filter((row) => metrics.statuses[row.controle] !== "c")
    .sort((left, right) => right.risk - left.risk || Number(left.effort) - Number(right.effort) || left.id.localeCompare(right.id));
  const quickWins = scoredRisks.filter((row) => row.risk >= 6 && Number(row.effort) === 1);

  assert.ok(accept(lab.tasks[0], metrics.statuses.AC1));
  assert.ok(accept(lab.tasks[1], metrics.statuses.AC2));
  assert.ok(accept(lab.tasks[2], metrics.statuses.AC3));
  assert.ok(accept(lab.tasks[3], metrics.statuses.SY1));
  assert.ok(accept(lab.tasks[4], metrics.statuses.SY3));
  assert.ok(accept(lab.tasks[5], metrics.statuses.JO3));
  assert.ok(accept(lab.tasks[6], metrics.statuses.JO4));
  assert.ok(accept(lab.tasks[7], metrics.statuses.SA1));
  assert.ok(accept(lab.tasks[8], metrics.statuses.SE2));
  assert.ok(accept(lab.tasks[9], metrics.securityUpdates));
  assert.ok(accept(lab.tasks[10], metrics.permitRootLogin));
  assert.ok(accept(lab.tasks[11], metrics.openAllInterfaces));
  assert.ok(accept(lab.tasks[12], metrics.backupAgeDays));
  assert.ok(accept(lab.tasks[13], metrics.domainScores.find((row) => row.domaine === "journalisation").percent));
  assert.ok(accept(lab.tasks[14], metrics.globalPercent));
  assert.ok(metrics.domainScores[0].ratio < metrics.domainScores[1].ratio, "le domaine le plus faible est unique");
  assert.ok(accept(lab.tasks[15], weakestDomainLetter));
  assert.ok(scoredRisks[0].risk > scoredRisks[1].risk || Number(scoredRisks[0].effort) < Number(scoredRisks[1].effort), "la première action prioritaire est départagée sans identifiant");
  assert.ok(accept(lab.tasks[16], scoredRisks[0].id));
  assert.ok(accept(lab.tasks[17], quickWins.length));

  const maturityLetter = metrics.globalPercent <= 39 ? "a" : metrics.globalPercent <= 59 ? "b" : metrics.globalPercent <= 79 ? "c" : "d";
  assert.ok(accept(lab.tasks[18], maturityLetter));
});

test("les guides Linux C ne divulguent pas les réponses et les dates citées sont correctes", () => {
  const built = buildLinuxAssetsC();
  const fileMap = new Map(built.files.map((file) => [file.name, file.data.toString("utf8")]));
  const { buildLabsC } = load("supabase/seed/content/linux-labs-c");
  const labs = buildLabsC(built.facts);
  for (const lab of labs) {
    const guideText = fileMap.get(lab.assets.filter((entry) => entry.kind === "guide").map((entry) => entry.url.replace("/labs/", ""))[0]);
    for (const task of lab.tasks) {
      for (const answer of task.accepted) {
        const normalized = normalize(answer);
        if (normalized.length <= 3 || ["oui", "non", "yes", "no", "a", "b", "c", "d", "e", "f", "p", "n"].includes(normalized)) continue;
        assert.equal(normalize(task.prompt).includes(normalized), false, `pas de fuite dans l’énoncé pour ${lab.slug}`);
        assert.equal(normalize(task.hint).includes(normalized), false, `pas de fuite dans l’indice pour ${lab.slug}`);
        assert.equal(normalize(guideText).includes(normalized), false, `pas de fuite dans le guide pour ${lab.slug}`);
      }
    }
  }
  assert.equal(new Date(Date.UTC(2026, 3, 21)).getUTCDay(), 2, "21 avril 2026 est bien un mardi");
  assert.equal(new Date(Date.UTC(2026, 3, 27)).getUTCDay(), 1, "27 avril 2026 est bien un lundi");
});

test("chaque commande des guides Linux C fonctionne réellement sur les fichiers générés", { skip: !fs.existsSync(BASH_PATH) }, () => {
  const built = buildLinuxAssetsC();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "linux-labs-c-"));
  try {
    writeAssets(tempDir, built);
    for (const guideName of ["lnx-inc-guide.md", "lnx-proj-guide.md"]) {
      const content = fs.readFileSync(path.join(tempDir, guideName), "utf8");
      for (const command of parseGuideBlocks(content, "bash")) {
        const result = runBashCommand(tempDir, command);
        assert.equal(result.status, 0, `bash réussit pour ${command}\n${result.stderr}`);
        validateGuideOutput(command, result.stdout);
      }
      for (const command of parseGuideBlocks(content, "powershell")) {
        const result = runPowerShellCommand(tempDir, command);
        assert.equal(result.status, 0, `PowerShell réussit pour ${command}\n${result.stderr}`);
        validateGuideOutput(command, result.stdout);
      }
    }
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
