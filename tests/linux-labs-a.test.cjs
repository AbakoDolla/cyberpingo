const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildLinuxAssetsA } = require("../scripts/lab-scenarios-linux-a.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const normalize = (value) => String(value).toLowerCase().replace(/\r/g, "").trim().replace(/\s+/g, " ");
const ignoredAnswers = new Set(["oui", "non", "yes", "no"]);
const bashPath = "C:\\Program Files\\Git\\bin\\bash.exe";
const powershellPath = process.env.WINDIR ? path.join(process.env.WINDIR, "System32", "WindowsPowerShell", "v1.0", "powershell.exe") : "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";

function scenario() {
  const generated = buildLinuxAssetsA();
  const { buildLabsA } = load("supabase/seed/content/linux-labs-a");
  const labs = buildLabsA(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function assetName(url) {
  return path.posix.basename(url);
}

function parseLsSections(raw) {
  const sections = new Map();
  const chunks = raw.trim().split(/\n\n+/);
  for (const chunk of chunks) {
    const lines = chunk.split("\n");
    const header = lines[0].slice(0, -1);
    const entries = lines.slice(2).filter(Boolean).map((line) => {
      const match = /^(?<mode>[dl-][rwxst-]{9})\s+\d+\s+(?<owner>\S+)\s+(?<group>\S+)\s+(?<size>\d+)\s+(?<date>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(?<name>.+)$/u.exec(line);
      assert.ok(match, `ligne ls illisible: ${line}`);
      const rawName = match.groups.name;
      const [name] = rawName.split(" -> ");
      return {
        mode: match.groups.mode,
        owner: match.groups.owner,
        group: match.groups.group,
        size: Number(match.groups.size),
        date: match.groups.date,
        rawName,
        name,
      };
    });
    sections.set(header, entries);
  }
  return sections;
}

function resolveCdHistory(commands, startDir) {
  let current = startDir;
  let previous = startDir;
  for (const command of commands) {
    if (command === "pwd") continue;
    if (command === "cd -") {
      const next = previous;
      previous = current;
      current = next;
      continue;
    }
    if (!command.startsWith("cd ")) continue;
    const target = command.slice(3);
    let next;
    if (target === "~") next = "/home/cfall";
    else if (target.startsWith("/")) next = path.posix.normalize(target);
    else next = path.posix.normalize(path.posix.join(current, target));
    previous = current;
    current = next;
  }
  return current;
}

function parseAccessLog(raw) {
  return raw.trim().split("\n").map((line) => {
    const match = /^(\S+) - - \[(?<stamp>[^\]]+)\] "(?<method>\S+) (?<requestPath>\S+) HTTP\/1\.1" (?<status>\d{3}) (?<bytes>\d+) /u.exec(line);
    assert.ok(match, `ligne nginx illisible: ${line}`);
    return {
      ip: match[1],
      stamp: match.groups.stamp,
      method: match.groups.method,
      requestPath: match.groups.requestPath,
      status: Number(match.groups.status),
      bytes: Number(match.groups.bytes),
    };
  });
}

function nextWeeklyRangeRun(fromIso, minutes, hours, weekdays) {
  const start = new Date(fromIso);
  for (let step = 1; step <= 14 * 24 * 60; step += 1) {
    const candidate = new Date(start.getTime() + step * 60000);
    const minute = candidate.getUTCHours() * 60 + candidate.getUTCMinutes();
    const dow = candidate.getUTCDay();
    const cronDow = dow === 0 ? 7 : dow;
    if (weekdays.includes(cronDow) && hours.includes(candidate.getUTCHours()) && minutes.includes(candidate.getUTCMinutes())) {
      return `${String(candidate.getUTCHours()).padStart(2, "0")}:${String(candidate.getUTCMinutes()).padStart(2, "0")}`;
    }
  }
  throw new Error("aucune prochaine exécution trouvée");
}

function nextCronOrDate(fromIso, dayOfMonth, dayOfWeek, hour, minute) {
  const start = new Date(fromIso);
  for (let step = 1; step <= 40; step += 1) {
    const candidate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + step, hour, minute, 0));
    const dow = candidate.getUTCDay();
    const cronDow = dow === 0 ? 7 : dow;
    if (candidate.getUTCDate() === dayOfMonth || cronDow === dayOfWeek) return candidate.toISOString().slice(0, 10);
  }
  throw new Error("aucune date cron OR trouvée");
}

function parseCsv(raw) {
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(";");
  return lines.slice(1).map((line) => {
    const cells = line.split(";");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  });
}

function deriveTp1(current) {
  const sections = parseLsSections(current.text("lnx-tp1-arborescence.txt"));
  const historyLines = current.text("lnx-tp1-historique.txt").trim().split("\n");
  const commands = historyLines.map((line) => line.replace(/^.+?\d{2}:\d{2}:\d{2}\s+/u, ""));
  const access = parseAccessLog(current.text("lnx-tp1-acces.log"));
  const csv = parseCsv(current.text("lnx-tp1-adherents.csv"));

  const siteCount = sections.get("/srv/partage/communication/site").length;
  const biggestApril = sections.get("/srv/partage/compta/2026-04").slice().sort((a, b) => b.size - a.size)[0].name;
  const pdfTotal = sections.get("/srv/partage/adhesions/contrats").filter((entry) => entry.name.endsWith(".pdf")).reduce((sum, entry) => sum + entry.size, 0);
  const recentConfigFile = sections.get("/etc/alize/conf.d").slice().sort((a, b) => b.date.localeCompare(a.date))[0].name;
  const hiddenCfallCount = sections.get("/home/cfall").filter((entry) => entry.name.startsWith(".")).length;
  const finalDir = resolveCdHistory(commands, "/home/cfall");
  const relativeAbs = path.posix.normalize(path.posix.join("/srv/partage/adhesions/imports", "../contrats/contrat-2026-04-07.pdf"));

  const ipCounts = new Map();
  const status404 = [];
  let postCount = 0;
  let bytes200Total = 0;
  for (const row of access) {
    ipCounts.set(row.ip, (ipCounts.get(row.ip) ?? 0) + 1);
    if (row.status === 404) status404.push(row.requestPath);
    if (row.method === "POST") postCount += 1;
    if (row.requestPath === "/membres/tableau-de-bord.php" && row.status === 200) bytes200Total += row.bytes;
  }
  const topIp = [...ipCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const top404 = [...status404.reduce((map, requestPath) => map.set(requestPath, (map.get(requestPath) ?? 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];

  const cityCount = csv.filter((row) => row.ville === "Lagune-Est").length;
  const topFormula = [...csv.reduce((map, row) => map.set(row.formule, (map.get(row.formule) ?? 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];

  return [
    String(siteCount),
    biggestApril,
    String(pdfTotal),
    recentConfigFile,
    String(hiddenCfallCount),
    finalDir,
    relativeAbs,
    topIp,
    String(status404.length),
    top404,
    String(postCount),
    String(new Set(access.map((row) => row.ip)).size),
    String(cityCount),
    topFormula,
    String(bytes200Total),
  ];
}

function parsePasswd(raw) {
  return raw.trim().split("\n").map((line) => {
    const parts = line.split(":");
    return { name: parts[0], uid: Number(parts[2]), gid: Number(parts[3]), home: parts[5], shell: parts[6] };
  });
}

function parseShadow(raw) {
  return raw.trim().split("\n").map((line) => {
    const parts = line.split(":");
    return { name: parts[0], hash: parts[1], changed: Number(parts[2]) };
  });
}

function shadowDayToIso(day) {
  return new Date(day * 86400000).toISOString().slice(0, 10);
}

function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86400000);
}

function parseGroups(raw) {
  return raw.trim().split("\n").map((line) => {
    const parts = line.split(":");
    return { name: parts[0], members: parts[3] ? parts[3].split(",").filter(Boolean) : [] };
  });
}

function parsePermissions(raw) {
  return raw.split("\n").filter((line) => /^[dl-][rwxst-]{9}/u.test(line)).map((line) => {
    const match = /^(?<mode>[dl-][rwxst-]{9})\s+\d+\s+(?<owner>\S+)\s+(?<group>\S+)\s+(?<size>\d+)\s+(?<date>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(?<name>.+)$/u.exec(line);
    assert.ok(match, `permission illisible: ${line}`);
    return { mode: match.groups.mode, name: match.groups.name, size: Number(match.groups.size) };
  });
}

function parseModeToOctal(symbolic) {
  return [symbolic.slice(1, 4), symbolic.slice(4, 7), symbolic.slice(7, 10)].map((triplet) => {
    let value = 0;
    if (triplet[0] === "r") value += 4;
    if (triplet[1] === "w") value += 2;
    if (triplet[2] === "x" || triplet[2] === "s" || triplet[2] === "t") value += 1;
    return value;
  }).join("");
}

function parseLastlog(raw) {
  return raw.trim().split("\n").slice(1).map((line) => {
    const name = line.slice(0, 16).trim();
    const rest = line.slice(16).trim();
    if (rest === "**Never logged in**") return { name, never: true, latest: null };
    const from = rest.slice(9, 27).trim();
    const latest = rest.slice(27).trim();
    return { name, never: false, from, latest };
  });
}

function deriveTp2(current) {
  const passwd = parsePasswd(current.text("lnx-tp2-passwd.txt"));
  const shadow = parseShadow(current.text("lnx-tp2-shadow.txt"));
  const groups = parseGroups(current.text("lnx-tp2-group.txt"));
  const sudoers = current.text("lnx-tp2-sudoers.txt");
  const permissions = parsePermissions(current.text("lnx-tp2-permissions.txt"));
  const suidLines = current.text("lnx-tp2-suid.txt").trim().split("\n");
  const lastlog = parseLastlog(current.text("lnx-tp2-derniere-connexion.txt"));

  const uidZeroAlias = passwd.find((row) => row.uid === 0 && row.name !== "root").name;
  const serviceInteractive = passwd.find((row) => row.name.startsWith("svc-") && !/nologin|sync$/u.test(row.shell)).name;
  const emptyPasswordAccount = shadow.find((row) => row.hash === "").name;
  const weakAlgo = shadow.find((row) => row.name === "nkamga").hash.startsWith("$1$") ? "c" : "";
  const lockedCount = shadow.filter((row) => row.hash.startsWith("!") || row.hash.startsWith("*")).length;
  const changedDate = shadowDayToIso(shadow.find((row) => row.name === "straore").changed);
  const changedDays = daysBetween(changedDate, "2026-04-07");
  const sudoMemberCount = groups.find((row) => row.name === "sudo").members.length;
  const dangerousRule = /# \/etc\/sudoers\.d\/99-web-maint[\s\S]*?NOPASSWD: ALL/u.test(sudoers) ? "/etc/sudoers.d/99-web-maint" : "";
  const octalMode = parseModeToOctal(permissions.find((row) => row.name === "export-adhesions.sh").mode);
  const worldWritableFile = permissions.find((row) => row.mode[2] === "w" && row.mode[5] === "w" && row.mode[8] === "w").name;
  const allowed = new Set([
    "/usr/bin/passwd",
    "/usr/bin/su",
    "/usr/bin/chfn",
    "/usr/bin/chsh",
    "/usr/bin/gpasswd",
    "/usr/bin/mount",
    "/usr/bin/umount",
    "/usr/bin/newgrp",
    "/usr/bin/sudo",
    "/usr/lib/dbus-1.0/dbus-daemon-launch-helper",
    "/usr/lib/polkit-1/polkit-agent-helper-1",
    "/usr/lib/openssh/ssh-keysign",
  ]);
  const abnormalSuidCount = suidLines.map((line) => line.trim().split(/\s+/u).pop()).filter((file) => !allowed.has(file)).length;
  const passwdByName = new Map(passwd.map((row) => [row.name, row]));
  const validShells = new Set(passwd.filter((row) => !/nologin|sync$/u.test(row.shell)).map((row) => row.name));
  const neverLoggedInteractive = lastlog.find((row) => {
    const account = passwdByName.get(row.name);
    return row.never && validShells.has(row.name) && account && account.uid >= 1000 && !row.name.startsWith("svc-");
  }).name;
  const dormantHumans = lastlog.filter((row) => {
    const account = passwdByName.get(row.name);
    if (!account || account.uid < 1000 || !validShells.has(row.name)) return false;
    if (row.never) return true;
    const match = /\w{3} (\w{3})\s+(\d{1,2}) \d{2}:\d{2}:\d{2} \+0000 (\d{4})/u.exec(row.latest);
    assert.ok(match, `lastlog inattendu: ${row.latest}`);
    const months = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
    const iso = `${match[3]}-${months[match[1]]}-${String(match[2]).padStart(2, "0")}`;
    return daysBetween(iso, "2026-04-07") > 90;
  }).length;

  return [
    uidZeroAlias,
    serviceInteractive,
    emptyPasswordAccount,
    weakAlgo,
    String(lockedCount),
    changedDate,
    String(changedDays),
    String(sudoMemberCount),
    dangerousRule,
    octalMode,
    worldWritableFile,
    String(abnormalSuidCount),
    neverLoggedInteractive,
    String(dormantHumans),
  ];
}

function parsePs(raw) {
  return raw.trim().split("\n").slice(1).map((line) => {
    const parts = line.trim().split(/\s+/u, 11);
    return {
      user: parts[0],
      pid: Number(parts[1]),
      cpu: Number(parts[2]),
      mem: Number(parts[3]),
      vsz: Number(parts[4]),
      rss: Number(parts[5]),
      tty: parts[6],
      stat: parts[7],
      start: parts[8],
      time: parts[9],
      command: parts[10],
    };
  });
}

function deriveTp3(current) {
  const ps = parsePs(current.text("lnx-tp3-ps.txt"));
  const tree = current.text("lnx-tp3-ps-arbre.txt").trim().split("\n").slice(1).map((line) => {
    const parts = line.trim().split(/\s+/u, 4);
    return { pid: Number(parts[0]), ppid: Number(parts[1]), user: parts[2], cmd: parts[3] };
  });
  const services = current.text("lnx-tp3-services.txt").trim().split("\n").slice(1).map((line) => line.trim().split(/\s+/u));
  const ports = current.text("lnx-tp3-ports.txt").trim().split("\n").slice(1);
  const cron = current.text("lnx-tp3-cron.txt").trim().split("\n");
  const timers = current.text("lnx-tp3-minuteurs.txt").trim().split("\n").slice(1);
  const unit = current.text("lnx-tp3-unite.service");

  const top = ps.slice().sort((a, b) => b.cpu - a.cpu)[0];
  const parentPid = tree.find((row) => row.pid === top.pid).ppid;
  const wwwDataRows = ps.filter((row) => row.user === "www-data");
  const rssMiB = Math.round(wwwDataRows.reduce((sum, row) => sum + row.rss, 0) / 1024);
  const serviceForPort = ports.find((line) => line.includes(":3306")).includes("mariadbd") ? "mariadb.service" : "";
  const unexpectedPort = ports.find((line) => line.includes("telemetry-relay")).match(/:(\d+)\s+/u)[1];
  const failedServices = services.filter((cells) => cells[1] === "loaded" && cells[2] === "failed" && cells[3] === "failed").length;
  const everyFive = cron.find((line) => line.startsWith("*/5 ")).split(/\s+/u).slice(6).join(" ");
  const nextLine = cron.find((line) => line.includes("/usr/local/bin/collecte-charge.sh")).trim();
  const nextParts = nextLine.split(/\s+/u);
  const minuteValues = [0, 20, 40];
  const hourValues = [2, 3, 4];
  const weekDays = [1, 2, 3, 4, 5];
  const nextRun = nextWeeklyRangeRun("2026-04-08T03:05:00Z", minuteValues, hourValues, weekDays);
  const weakRootScript = cron.find((line) => line.includes("rapport-cache.sh")).trim().split(/\s+/u).slice(6).join(" ");
  const runners = new Map();
  let cronSection = "";
  for (const line of cron) {
    if (line.startsWith("# /")) { cronSection = line.slice(2).trim(); continue; }
    if (!line.trim() || line.startsWith("#") || /^[A-Z]+=/u.test(line)) continue;
    const fields = line.trim().split(/\s+/u);
    const userCrontab = cronSection.startsWith("/var/spool/cron/crontabs/");
    const script = /\/usr\/local\/bin\/[\w.-]+\.sh/u.exec(fields.slice(userCrontab ? 5 : 6).join(" "));
    if (script) runners.set(script[0], userCrontab ? cronSection.split("/").pop() : fields[5]);
  }
  const scriptModes = new Map(cron.filter((line) => line.startsWith("# permissions ")).map((line) => {
    const match = /=> (\S+)\s+\d+\s+\S+\s+\S+\s+\d+\s+\S+\s+\S+\s+(\S+)$/u.exec(line);
    return [match[2], match[1]];
  }));
  const cronOptions = { a: "/usr/local/bin/verifier-sessions.sh", b: "/usr/local/bin/purger-miniatures.sh", c: "/usr/local/bin/rotation-longue.sh", d: "/usr/local/bin/rapport-cache.sh" };
  const weakRootLetters = Object.entries(cronOptions)
    .filter(([, scriptPath]) => runners.get(scriptPath) === "root" && scriptModes.get(scriptPath)?.[8] === "w")
    .map(([letter]) => letter);
  assert.deepEqual(weakRootLetters, ["d"], "exactement une proposition est lancée par root et modifiable par tous");
  assert.equal(scriptModes.size, 4, "chaque script proposé a ses droits rappelés");
  assert.ok(scriptModes.get(cronOptions.b)?.[8] === "w" && runners.get(cronOptions.b) === "svc-web", "le leurre b est modifiable par tous mais lancé par svc-web");
  const suspiciousUnit = /ExecStart=\/tmp\/\.cache\/telemetry-relay/u.test(unit) && /Restart=always/u.test(unit) ? "telemetry-relay.service" : "";
  assert.equal(nextParts[0], "*/20");
  assert.equal(nextParts[1], "2-4");
  assert.equal(nextParts[4], "1-5");
  const badTimers = timers.filter((line) => / n\/a\s+n\/a\s+[a-z0-9-]+\.timer /u.test(line)).length;
  const orDate = nextCronOrDate("2026-04-08T03:00:00Z", 15, 5, 3, 0);

  return [
    String(top.pid),
    "c",
    top.command,
    String(parentPid),
    String(wwwDataRows.length),
    String(rssMiB),
    serviceForPort,
    String(unexpectedPort),
    String(failedServices),
    everyFive,
    nextRun,
    weakRootLetters[0],
    suspiciousUnit,
    String(badTimers),
    orDate,
  ];
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
  const blocks = [];
  const regex = /```(bash|powershell)\n([\s\S]*?)```/gu;
  let match;
  while ((match = regex.exec(markdown)) !== null) blocks.push({ language: match[1], code: match[2].trim() });
  return blocks;
}

function prepareLabTempDir(lab, files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `linux-labs-a-${lab.slug}-`));
  for (const asset of lab.assets) {
    const name = asset.url.replace("/labs/", "");
    fs.writeFileSync(path.join(dir, name), files.get(name));
  }
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

function outputMap(stdout) {
  return new Map(stdout.trim().split(/\r?\n/u).filter(Boolean).map((line) => {
    const index = line.indexOf("=");
    return [line.slice(0, index), line.slice(index + 1)];
  }));
}

test("les laboratoires Linux A sont déterministes et chaque fichier est propre", () => {
  const first = buildLinuxAssetsA();
  const second = buildLinuxAssetsA();
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

test("les labs Linux A déclarent exactement leurs fichiers et passent labIssues", () => {
  const { labs, generated } = scenario();
  assert.deepEqual(labs.map((lab) => lab.slug), ["tp-linux-arborescence", "tp-linux-comptes-droits", "tp-linux-processus-services"]);
  for (const lab of labs) assert.deepEqual(labIssues(lab), [], `${lab.slug} doit avoir zéro problème`);
  const assetNames = new Set(labs.flatMap((lab) => lab.assets.map((asset) => assetName(asset.url))));
  const fileNames = new Set(generated.files.map((file) => file.name));
  assert.deepEqual([...assetNames].sort(), [...fileNames].sort());
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

test("les dates explicites restent cohérentes avec les jours de semaine annoncés", () => {
  const { text } = scenario();
  const history = text("lnx-tp1-historique.txt");
  assert.match(history, /2026-04-06/u);
  const lastlog = text("lnx-tp2-derniere-connexion.txt");
  assert.match(lastlog, /Tue Apr  7/u);
  const ps = text("lnx-tp3-ps.txt");
  assert.match(ps, /Apr08/u);
  assert.equal(new Date(Date.UTC(2026, 3, 6)).getUTCDay(), 1);
  assert.equal(new Date(Date.UTC(2026, 3, 7)).getUTCDay(), 2);
  assert.equal(new Date(Date.UTC(2026, 3, 8)).getUTCDay(), 3);
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
