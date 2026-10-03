const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { buildLinuxAssetsB } = require("../scripts/lab-scenarios-linux-b.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");
const { load } = require("../scripts/ts-loader.cjs");

const BASH_PATH = "C:\\Program Files\\Git\\bin\\bash.exe";
const POWERSHELL_EXE = "powershell.exe";
const DAY_MS = 24 * 60 * 60 * 1000;

const normalize = (value) => String(value).toLowerCase().trim().replace(/\s+/g, " ");
const accept = (task, value) => task.accepted.includes(normalize(value));
const parseDateOnly = (value) => Date.parse(`${value}T00:00:00Z`);
const dayDiff = (from, to) => Math.round((parseDateOnly(to) - parseDateOnly(from)) / DAY_MS);

function writeAssets(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "linux-labs-b-"));
  for (const file of files) fs.writeFileSync(path.join(dir, file.name), file.data);
  return dir;
}

function cleanupDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function fileMap(files) {
  return new Map(files.map((file) => [file.name, file.data.toString("utf8")]));
}

function extractBlocks(markdown, language) {
  const pattern = new RegExp(`\\\`\\\`\\\`${language}\\n([\\s\\S]*?)\\n\\\`\\\`\\\``, "g");
  const blocks = [];
  let match;
  while ((match = pattern.exec(markdown))) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

function runBashCommand(dir, command) {
  const scriptPath = path.join(dir, "__guide-check.sh");
  fs.writeFileSync(scriptPath, `#!/usr/bin/env bash\nset -euo pipefail\n${command}\n`, "utf8");
  const result = spawnSync(BASH_PATH, [scriptPath], { cwd: dir, encoding: "utf8" });
  assert.equal(result.status, 0, `commande bash en échec: ${command}\n${result.stderr}`);
  return result.stdout.replace(/\r\n/g, "\n").trim();
}

function runPowerShellCommand(dir, command) {
  const scriptPath = path.join(dir, "__guide-check.ps1");
  fs.writeFileSync(scriptPath, `$ErrorActionPreference = 'Stop'\n${command}\n`, "utf8");
  const result = spawnSync(POWERSHELL_EXE, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], { cwd: dir, encoding: "utf8" });
  assert.equal(result.status, 0, `commande PowerShell en échec: ${command}\n${result.stderr}`);
  return result.stdout.replace(/\r\n/g, "\n").trim();
}

function parseUfwRules(content) {
  return content.split("\n")
    .filter((line) => /^\[\s*\d+\]/.test(line))
    .map((line) => {
      const match = /^\[\s*(\d+)\]\s+(\d+)\/tcp\s+(ALLOW|DENY)\s+IN\s+(.+?)(?:\s+#.*)?$/.exec(line.trim());
      assert.ok(match, `règle UFW reconnue: ${line}`);
      return { number: Number(match[1]), port: Number(match[2]), action: match[3], from: match[4].trim() };
    });
}

function ipInCidr(ip, cidr) {
  if (cidr === "Anywhere") return true;
  if (!cidr.includes("/")) return ip === cidr;
  const [base, bitsText] = cidr.split("/");
  const bits = Number(bitsText);
  const ipParts = ip.split(".").map(Number);
  const baseParts = base.split(".").map(Number);
  const bytes = Math.floor(bits / 8);
  for (let index = 0; index < bytes; index += 1) {
    if (ipParts[index] !== baseParts[index]) return false;
  }
  const rem = bits % 8;
  if (rem === 0) return true;
  const mask = 0xff << (8 - rem);
  return (ipParts[bytes] & mask) === (baseParts[bytes] & mask);
}

function parseSnapshots(content) {
  return content.split("\n")
    .filter((line) => /^[a-z0-9]{8}\s+20/u.test(line))
    .map((line) => {
      const match = /^([a-z0-9]{8})\s+([0-9-]+\s+[0-9:]+)\s+(\S+)\s+(\S+)\s+(\S+)$/.exec(line.trim());
      assert.ok(match, `snapshot reconnu: ${line}`);
      return { id: match[1], time: match[2], host: match[3], tag: match[4], target: match[5] };
    });
}

function sizeToGiB(text) {
  if (text.endsWith("G")) return Number(text.slice(0, -1));
  if (text.endsWith("M")) return Number(text.slice(0, -1)) / 1024;
  if (text.endsWith("T")) return Number(text.slice(0, -1)) * 1024;
  return Number(text);
}

function parseBlocks(markdown) {
  const blocks = {};
  let current = null;
  for (const line of markdown.split("\n")) {
    const header = /^Bloc (\d+)/.exec(line);
    if (header) {
      current = header[1];
      blocks[current] = [];
    } else if (current) {
      if (line.trim() === "") current = null;
      else blocks[current].push(line);
    }
  }
  return blocks;
}

function runBashScript(dir, scriptName, args = []) {
  const result = spawnSync(BASH_PATH, [scriptName, ...args], { cwd: dir, encoding: "utf8" });
  return {
    status: result.status,
    stdout: result.stdout.replace(/\r\n/g, "\n").trim(),
    stderr: result.stderr.replace(/\r\n/g, "\n").trim(),
  };
}

test("les labs Linux B restent déterministes, cohérents et sans problème de qualité", () => {
  const first = buildLinuxAssetsB();
  const second = buildLinuxAssetsB();
  assert.deepEqual(Object.keys(first.facts), ["reseau", "maintenance", "scripts"]);
  assert.equal(first.files.length, second.files.length);
  assert.equal(JSON.stringify(first.facts), JSON.stringify(second.facts));
  for (let index = 0; index < first.files.length; index += 1) {
    assert.equal(first.files[index].name, second.files[index].name);
    assert.ok(first.files[index].data.equals(second.files[index].data), `octets identiques pour ${first.files[index].name}`);
    assert.ok(first.files[index].name.startsWith("lnx-"), `préfixe lnx- pour ${first.files[index].name}`);
    assert.notEqual(first.files[index].data[0], 0xef, `pas de BOM dans ${first.files[index].name}`);
    assert.equal(first.files[index].data.includes(Buffer.from("\r\n")), false, `pas de CRLF dans ${first.files[index].name}`);
    assert.ok(first.files[index].data.length < 150 * 1024, `taille acceptable pour ${first.files[index].name}`);
  }
});

test("les définitions TypeScript Linux B déclarent exactement les trois labs attendus", () => {
  const built = buildLinuxAssetsB();
  const { buildLabsB } = load("supabase/seed/content/linux-labs-b");
  const labs = buildLabsB(built.facts);
  assert.deepEqual(labs.map((lab) => lab.slug), [
    "tp-linux-reseau-ssh",
    "tp-linux-maj-sauvegardes",
    "tp-linux-scripts",
  ]);
  for (const lab of labs) {
    assert.deepEqual(labIssues(lab), [], `aucun problème de qualité pour ${lab.slug}`);
    assert.ok(lab.tasks.length >= 10, `nombre minimal de tâches pour ${lab.slug}`);
    for (const task of lab.tasks) {
      assert.ok(task.accepted.length >= 1 && task.accepted.length <= 8, `réponses bornées pour ${lab.slug}`);
      for (const answer of task.accepted) assert.equal(answer, normalize(answer), `réponse normalisée pour ${lab.slug}`);
    }
  }
  const declared = new Set(labs.flatMap((lab) => lab.assets.map((entry) => entry.url.replace("/labs/", ""))));
  const generated = new Set(built.files.map((file) => file.name));
  assert.deepEqual([...declared].sort(), [...generated].sort(), "chaque fichier est déclaré et aucun asset ne manque");
});

test("les réponses du TP 4 sont recalculées depuis les fichiers", () => {
  const built = buildLinuxAssetsB();
  const files = fileMap(built.files);
  const { buildLabsB } = load("supabase/seed/content/linux-labs-b");
  const lab = buildLabsB(built.facts)[0];

  const network = files.get("lnx-tp4-reseau.txt");
  const ssh = files.get("lnx-tp4-sshd_config.txt");
  const auth = files.get("lnx-tp4-auth.log");
  const ufw = files.get("lnx-tp4-ufw.txt");
  const keys = files.get("lnx-tp4-cles.txt");

  const gateway = /^default via (\S+)/m.exec(network)[1];
  assert.ok(accept(lab.tasks[0], gateway));

  const iface = /^(\S+)\s+UP\s+10\.20\.0\.10\/(\d+)/m.exec(network);
  assert.ok(accept(lab.tasks[1], iface[1]));
  assert.ok(accept(lab.tasks[2], iface[2]));

  const rawLines = ssh.split("\n");
  const mainSection = [];
  const includedSection = [];
  let inIncluded = false;
  for (const raw of rawLines) {
    if (/^# ===== \/etc\/ssh\/sshd_config\.d\//.test(raw)) inIncluded = true;
    if (inIncluded) includedSection.push(raw);
    else mainSection.push(raw);
  }
  const orderedLines = [...includedSection, ...mainSection.filter((line) => !/^# \/etc\/ssh\/sshd_config$/.test(line) && !/^Include /.test(line))];
  const global = {};
  const blocks = [];
  let current = null;
  for (const raw of orderedLines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("Match ")) {
      const parts = line.split(/\s+/).slice(1);
      const conditions = {};
      for (let index = 0; index < parts.length; index += 2) conditions[parts[index]] = parts[index + 1];
      current = { conditions, settings: [] };
      blocks.push(current);
      continue;
    }
    const spaceIndex = line.indexOf(" ");
    const key = line.slice(0, spaceIndex);
    const value = line.slice(spaceIndex + 1).trim();
    if (current) current.settings.push([key, value]);
    else if (!Object.prototype.hasOwnProperty.call(global, key)) global[key] = value;
  }
  assert.ok(accept(lab.tasks[3], global.PermitRootLogin));

  const passwordForCfall = (() => {
    for (const block of blocks) {
      const userMatch = !block.conditions.User || block.conditions.User === "cfall";
      const addressMatch = !block.conditions.Address || block.conditions.Address === "10.20.0.111";
      if (userMatch && addressMatch) {
        for (const [key, value] of block.settings) if (key === "PasswordAuthentication") return value;
      }
    }
    return global.PasswordAuthentication;
  })();
  assert.ok(accept(lab.tasks[4], passwordForCfall === "yes" ? "oui" : "non"));

  const failedMatches = [...auth.matchAll(/Failed password for (?:invalid user )?(\S+) from (\d+\.\d+\.\d+\.\d+)/g)];
  const counts = new Map();
  const invalidNames = new Set();
  for (const match of failedMatches) {
    counts.set(match[2], (counts.get(match[2]) ?? 0) + 1);
    if (/invalid user/.test(match[0])) invalidNames.add(match[1]);
  }
  const topIp = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
  assert.ok(accept(lab.tasks[5], topIp));
  assert.ok(accept(lab.tasks[6], invalidNames.size));

  const acceptedPassword = [...auth.matchAll(/^Apr\s+\d+\s+(\d{2}:\d{2}:\d{2}) .* Accepted password for (\S+) from (\d+\.\d+\.\d+\.\d+)/gm)][0];
  assert.ok(accept(lab.tasks[7], acceptedPassword[1]));
  assert.ok(accept(lab.tasks[8], acceptedPassword[2]));
  const priorFailures = failedMatches.filter((match) => match[2] === acceptedPassword[3] && match.index < acceptedPassword.index).length;
  assert.ok(accept(lab.tasks[9], priorFailures));

  const rules = parseUfwRules(ufw);
  const wideRule = rules.find((rule) => rule.action === "ALLOW" && rule.from === "Anywhere" && rule.port === 22 && Number(global.Port) !== 22);
  assert.ok(accept(lab.tasks[10], wideRule.number));
  const decisiveRule = rules.find((rule) => rule.port === 2202 && ipInCidr("203.0.113.90", rule.from));
  assert.ok(accept(lab.tasks[11], decisiveRule.number));

  const keyLines = keys.trim().split("\n");
  const rsaWeakCount = keyLines.filter((line) => /ssh-rsa/.test(line) && /bits=(\d+)/.exec(line) && Number(/bits=(\d+)/.exec(line)[1]) < 3072).length;
  assert.ok(accept(lab.tasks[12], rsaWeakCount));
  const withoutFromCount = keyLines.filter((line) => !/from="/.test(line)).length;
  assert.ok(accept(lab.tasks[13], withoutFromCount));
  assert.ok(accept(lab.tasks[14], global.Port));
});

test("les réponses du TP 5 sont recalculées depuis les fichiers", () => {
  const built = buildLinuxAssetsB();
  const files = fileMap(built.files);
  const { buildLabsB } = load("supabase/seed/content/linux-labs-b");
  const lab = buildLabsB(built.facts)[1];

  const updates = files.get("lnx-tp5-maj.txt");
  const disks = files.get("lnx-tp5-disques.txt");
  const fstab = files.get("lnx-tp5-fstab.txt");
  const backupLog = files.get("lnx-tp5-sauvegarde.log");
  const snapshots = files.get("lnx-tp5-instantanes.txt");
  const copies = files.get("lnx-tp5-copies.txt");
  const script = files.get("lnx-tp5-sauvegarde.sh");

  const packages = updates.split("\n").filter((line) => /^[a-z0-9][^ ]*\/[a-z]/i.test(line));
  assert.ok(accept(lab.tasks[0], packages.length));
  assert.ok(accept(lab.tasks[1], packages.filter((line) => line.includes("-security")).length));
  assert.ok(accept(lab.tasks[2], /^openssh-server\/\S+\s+(\S+)/m.exec(updates)[1]));

  const dfh = disks.split("\n").filter((line) => /^\/dev|^tmpfs/.test(line)).slice(0, 5).map((line) => {
    const parts = line.trim().split(/\s+/);
    return { avail: parts[3], use: Number(parts[4].replace("%", "")), mount: parts[5] };
  });
  const highUsage = dfh.slice().sort((left, right) => right.use - left.use)[0];
  assert.ok(accept(lab.tasks[3], highUsage.mount));

  const dfi = disks.split("\n").filter((line) => /^\/dev|^tmpfs/.test(line)).slice(5).map((line) => {
    const parts = line.trim().split(/\s+/);
    return { iuse: Number(parts[4].replace("%", "")), mount: parts[5] };
  });
  const inodePressure = dfi.slice().sort((left, right) => right.iuse - left.iuse)[0];
  assert.ok(accept(lab.tasks[4], inodePressure.mount));

  const tmpOptions = /^tmpfs\s+\/tmp\s+tmpfs\s+(.+)$/m.exec(fstab)[1];
  assert.ok(accept(lab.tasks[5], tmpOptions.includes("noexec") ? "/aucun" : "/tmp"));

  const totalAvail = dfh.reduce((sum, row) => sum + sizeToGiB(row.avail), 0);
  const rounded = Math.round(totalAvail * 10) / 10;
  assert.ok(accept(lab.tasks[6], rounded));

  const backupRows = backupLog.trim().split("\n").map((line) => {
    const [timestamp, status] = line.split(" | ");
    return { timestamp, status };
  });
  assert.ok(accept(lab.tasks[7], backupRows.filter((row) => row.status === "SUCCESS").length));

  let longest = 0;
  let current = 0;
  for (const row of backupRows) {
    if (row.status === "FAIL") {
      current += 1;
      if (current > longest) longest = current;
    } else current = 0;
  }
  assert.ok(accept(lab.tasks[8], longest));

  const lastSuccess = backupRows.filter((row) => row.status === "SUCCESS").slice(-1)[0].timestamp.slice(0, 10);
  assert.ok(accept(lab.tasks[9], lastSuccess));
  assert.ok(accept(lab.tasks[10], dayDiff(lastSuccess, "2026-04-13")));

  const parsedSnapshots = parseSnapshots(snapshots);
  const retained = Math.min(parsedSnapshots.filter((row) => row.tag === "daily").length, 7)
    + Math.min(parsedSnapshots.filter((row) => row.tag === "weekly").length, 4)
    + Math.min(parsedSnapshots.filter((row) => row.tag === "monthly").length, 2);
  assert.ok(accept(lab.tasks[11], retained));

  const restoreId = parsedSnapshots
    .filter((row) => Date.parse(`${row.time.replace(" ", "T")}Z`) < Date.parse("2026-04-11T15:00:00Z"))
    .sort((left, right) => Date.parse(`${right.time.replace(" ", "T")}Z`) - Date.parse(`${left.time.replace(" ", "T")}Z`))[0].id;
  assert.ok(accept(lab.tasks[12], restoreId));

  const badLine = script.split("\n").findIndex((line) => line.includes("backup $SOURCE_DIR")) + 1;
  assert.ok(accept(lab.tasks[13], badLine));
  const copyRows = copies.trim().split("\n").slice(1).map((line) => {
    const [name, support, location, sync, status] = line.split(" | ");
    return { name, support, location, sync, status };
  });
  const auditDay = "2026-04-13";
  const validCopies = copyRows.filter((row) => row.status === "actif" && dayDiff(row.sync.slice(0, 10), auditDay) < 8);
  const criteria = {
    a: validCopies.length >= 3,
    b: new Set(validCopies.map((row) => row.support)).size >= 2,
    c: validCopies.some((row) => !/srv-fichiers01|armoire-technique/.test(row.location)),
  };
  const respected321 = criteria.a && criteria.b && criteria.c;
  assert.ok(accept(lab.tasks[14], respected321 ? "oui" : "non"));
  const failing = Object.entries(criteria).filter(([, satisfied]) => !satisfied).map(([letter]) => letter);
  assert.deepEqual(failing, ["c"], "un seul critère manque quand la règle de validité est appliquée");
  assert.ok(accept(lab.tasks[15], failing.length === 1 ? failing[0] : "d"));
  assert.equal(copyRows.length, 4, "quatre copies listées dont trois valides");
  assert.equal(validCopies.length, 3);
});

test("les réponses du TP 6 sont recalculées depuis les fichiers et par exécution réelle des scripts", () => {
  const built = buildLinuxAssetsB();
  const files = fileMap(built.files);
  const { buildLabsB } = load("supabase/seed/content/linux-labs-b");
  const lab = buildLabsB(built.facts)[2];

  const journal = files.get("lnx-tp6-journal.log");
  const csv = files.get("lnx-tp6-comptes.csv");
  const candidates = parseBlocks(files.get("lnx-tp6-attendus.txt"));

  const dir = writeAssets(built.files);
  try {
    const countRun = runBashScript(dir, "lnx-tp6-compter.sh", ["lnx-tp6-journal.log"]);
    assert.equal(countRun.status, 0);
    const countOutputLines = countRun.stdout.split("\n");
    const matchingBlock = Object.entries(candidates).find(([, block]) => block.join("\n").trim() === countRun.stdout.trim());
    assert.ok(matchingBlock, "un bloc candidat correspond à la sortie réelle");
    assert.ok(accept(lab.tasks[0], Number(matchingBlock[0])));

    const failedLines = journal.split("\n").filter((line) => line.includes("Failed password")).length;
    assert.ok(accept(lab.tasks[1], failedLines));
    assert.ok(accept(lab.tasks[2], countOutputLines[1].split(" ")[0]));
    assert.ok(accept(lab.tasks[3], countOutputLines.length));
    assert.ok(accept(lab.tasks[4], countRun.status));

    const cleanRun = runBashScript(dir, "lnx-tp6-nettoyer.sh");
    assert.equal(cleanRun.status, 0);
    const oldCount = /ANCIENS=(\d+)/.exec(cleanRun.stdout)[1];
    const remaining = /RESTANTS=(\d+)/.exec(cleanRun.stdout)[1];
    assert.ok(accept(lab.tasks[5], oldCount));
    const cleanLines = files.get("lnx-tp6-nettoyer.sh").split("\n");
    const dangerousLine = cleanLines.findIndex((line) => line.includes("rm -f $cleanup_dir/*")) + 1;
    assert.ok(accept(lab.tasks[6], dangerousLine));
    assert.ok(accept(lab.tasks[7], "recent.txt"));
    assert.ok(accept(lab.tasks[8], remaining));

    const rows = csv.trim().split("\n").slice(1).map((line) => line.split(";"));
    const flagged = rows.filter((row) => (row[1] === "service" && row[3] !== "/usr/sbin/nologin") || Number(row[4]) > 90);
    assert.ok(accept(lab.tasks[9], flagged.length));
    const inventoryRun = runBashScript(dir, "lnx-tp6-inventaire.sh", ["lnx-tp6-comptes.csv", "svc-"]);
    assert.equal(inventoryRun.status, 0);
    assert.ok(accept(lab.tasks[10], inventoryRun.stdout.split("\n").length));

    const backupLine = files.get("lnx-tp6-sauvegarde.sh").split("\n").findIndex((line) => line.startsWith("eval ")) + 1;
    assert.ok(accept(lab.tasks[11], backupLine));
    assert.ok(accept(lab.tasks[12], "sc2086"));
    assert.ok(accept(lab.tasks[13], "b"));
    assert.ok(accept(lab.tasks[14], "set -e"));
  } finally {
    cleanupDir(dir);
  }
});

test("aucune réponse longue ne fuit dans son énoncé, son indice ou son guide Linux B", () => {
  const built = buildLinuxAssetsB();
  const files = fileMap(built.files);
  const { buildLabsB } = load("supabase/seed/content/linux-labs-b");
  const labs = buildLabsB(built.facts);
  for (const lab of labs) {
    const guide = files.get(lab.assets.find((asset) => asset.kind === "guide").url.replace("/labs/", ""));
    for (const task of lab.tasks) {
      for (const answer of task.accepted) {
        if (answer.length < 3) continue;
        if (["oui", "non"].includes(answer)) continue;
        assert.equal(normalize(task.prompt).includes(answer), false, `pas de fuite dans l’énoncé ${lab.slug}`);
        assert.equal(normalize(task.hint).includes(answer), false, `pas de fuite dans l’indice ${lab.slug}`);
        assert.equal(normalize(guide).includes(answer), false, `pas de fuite dans le guide ${lab.slug}`);
      }
    }
  }
});

test("toutes les commandes des guides Linux B fonctionnent sur les fichiers réellement générés", { skip: !fs.existsSync(BASH_PATH) }, () => {
  const built = buildLinuxAssetsB();
  const files = fileMap(built.files);
  const guides = [
    "lnx-tp4-guide.md",
    "lnx-tp5-guide.md",
    "lnx-tp6-guide.md",
  ];
  const dir = writeAssets(built.files);
  try {
    for (const guideName of guides) {
      const markdown = files.get(guideName);
      const bashBlocks = extractBlocks(markdown, "bash").filter((block) => !block.includes("hors-test"));
      const psBlocks = extractBlocks(markdown, "powershell");
      assert.ok(bashBlocks.length >= 1, `au moins un bloc bash pour ${guideName}`);
      assert.ok(psBlocks.length >= 1, `au moins un bloc PowerShell pour ${guideName}`);

      bashBlocks.forEach((block) => {
        const stdout = runBashCommand(dir, block);
        assert.notEqual(stdout.trim(), "", `sortie bash non vide pour ${guideName}`);
      });

      psBlocks.forEach((block) => {
        const stdout = runPowerShellCommand(dir, block);
        assert.notEqual(stdout.trim(), "", `sortie powershell non vide pour ${guideName}`);
      });
    }
  } finally {
    cleanupDir(dir);
  }
});
