const path = require("node:path");

const text = (value) => Buffer.from(value.replace(/\r?\n/g, "\n"), "utf8");

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY_MS = 86400000;

function isoDateToShadowDay(isoDate) {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS);
}

function shadowDayToIso(day) {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

function fakeShadow(prefix, seed) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./";
  const rng = mulberry32(seed);
  const saltLength = prefix === "$1$" ? 8 : prefix === "$6$" ? 16 : 24;
  const hashLength = prefix === "$1$" ? 22 : prefix === "$6$" ? 86 : 43;
  const salt = Array.from({ length: saltLength }, () => alphabet[Math.floor(rng() * alphabet.length)]).join("");
  const hash = Array.from({ length: hashLength }, () => alphabet[Math.floor(rng() * alphabet.length)]).join("");
  return `${prefix}${salt}$${hash}`;
}

function lsLine(entry) {
  const name = entry.type === "symlink" ? `${entry.name} -> ${entry.target}` : entry.name;
  return `${entry.mode}  ${String(entry.links ?? 1).padStart(1)} ${entry.owner.padEnd(8)} ${entry.group.padEnd(8)} ${String(entry.size).padStart(6)} ${entry.mtime} ${name}`;
}

function blocksFor(entry) {
  if (entry.type === "dir") return 4;
  if (entry.type === "symlink") return 0;
  return Math.max(1, Math.ceil(entry.size / 1024));
}

function buildRecursiveLs(entries, sectionOrder) {
  const children = new Map();
  for (const entry of entries) {
    const parent = path.posix.dirname(entry.path);
    const list = children.get(parent) ?? [];
    list.push(entry);
    children.set(parent, list);
  }
  const lines = [];
  for (const section of sectionOrder) {
    lines.push(`${section}:`);
    const list = (children.get(section) ?? []).slice().sort((left, right) => left.name.localeCompare(right.name));
    const total = list.reduce((sum, entry) => sum + blocksFor(entry), 0);
    lines.push(`total ${total}`);
    for (const entry of list) lines.push(lsLine(entry));
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function addDir(entries, directorySet, sections, dirPath, owner, group, mtime, mode = "drwxr-xr-x") {
  directorySet.add(dirPath);
  sections.push(dirPath);
  if (dirPath === "/") return;
  entries.push({
    path: dirPath,
    name: path.posix.basename(dirPath),
    type: "dir",
    owner,
    group,
    size: 4096,
    mtime,
    mode,
    links: 2,
  });
}

function addFile(entries, filePath, owner, group, size, mtime, mode = "-rw-r--r--") {
  entries.push({
    path: filePath,
    name: path.posix.basename(filePath),
    type: "file",
    owner,
    group,
    size,
    mtime,
    mode,
    links: 1,
  });
}

function addLink(entries, linkPath, owner, group, target, mtime) {
  entries.push({
    path: linkPath,
    name: path.posix.basename(linkPath),
    type: "symlink",
    owner,
    group,
    size: target.length,
    mtime,
    mode: "lrwxrwxrwx",
    target,
    links: 1,
  });
}

function formatAccessLine(ip, timestamp, method, requestPath, status, bytes, referer, userAgent) {
  return `${ip} - - [${timestamp}] "${method} ${requestPath} HTTP/1.1" ${status} ${bytes} "${referer}" "${userAgent}"`;
}

function formatPsLine(row) {
  const command = row.command;
  return `${row.user.padEnd(10)} ${String(row.pid).padStart(5)} ${row.cpu.toFixed(1).padStart(4)} ${row.mem.toFixed(1).padStart(4)} ${String(row.vsz).padStart(7)} ${String(row.rss).padStart(6)} ${row.tty.padEnd(8)} ${row.stat.padEnd(4)} ${String(row.start).padEnd(7)} ${String(row.time).padStart(7)} ${command}`;
}

function parseModeToOctal(symbolic) {
  const triplets = [symbolic.slice(1, 4), symbolic.slice(4, 7), symbolic.slice(7, 10)];
  return triplets.map((triplet) => {
    let value = 0;
    if (triplet[0] === "r") value += 4;
    if (triplet[1] === "w") value += 2;
    if (triplet[2] === "x" || triplet[2] === "s" || triplet[2] === "t") value += 1;
    return value;
  }).join("");
}

function buildTp1() {
  const entries = [];
  const sections = [];
  const dirs = new Set();

  addDir(entries, dirs, sections, "/srv", "root", "root", "2026-04-06 07:10");
  addDir(entries, dirs, sections, "/srv/partage", "root", "root", "2026-04-06 07:11");
  addDir(entries, dirs, sections, "/srv/partage/compta", "straore", "compta", "2026-04-06 07:12");
  addDir(entries, dirs, sections, "/srv/partage/compta/2026-03", "straore", "compta", "2026-03-31 17:40");
  addDir(entries, dirs, sections, "/srv/partage/compta/2026-04", "straore", "compta", "2026-04-06 09:32");
  addDir(entries, dirs, sections, "/srv/partage/compta/archive", "straore", "compta", "2026-04-01 08:20");
  addDir(entries, dirs, sections, "/srv/partage/compta/modeles", "straore", "compta", "2026-03-18 12:18");
  addDir(entries, dirs, sections, "/srv/partage/adhesions", "emballa", "adherents", "2026-04-06 07:13");
  addDir(entries, dirs, sections, "/srv/partage/adhesions/contrats", "emballa", "adherents", "2026-04-06 10:22");
  addDir(entries, dirs, sections, "/srv/partage/adhesions/imports", "emballa", "adherents", "2026-04-06 08:34");
  addDir(entries, dirs, sections, "/srv/partage/adhesions/listes", "emballa", "adherents", "2026-04-05 15:42");
  addDir(entries, dirs, sections, "/srv/partage/communication", "adjovi", "webdev", "2026-04-06 07:15");
  addDir(entries, dirs, sections, "/srv/partage/communication/site", "svc-web", "webdev", "2026-04-06 09:12");
  addDir(entries, dirs, sections, "/srv/partage/communication/campagnes", "adjovi", "webdev", "2026-04-02 10:10");
  addDir(entries, dirs, sections, "/srv/scripts", "odiallo", "admins", "2026-04-06 06:50");
  addDir(entries, dirs, sections, "/home", "root", "root", "2026-04-06 07:10");
  addDir(entries, dirs, sections, "/home/cfall", "cfall", "cfall", "2026-04-06 08:40", "drwxr-x---");
  addDir(entries, dirs, sections, "/home/cfall/.config", "cfall", "cfall", "2026-04-06 08:54", "drwxr-x---");
  addDir(entries, dirs, sections, "/home/cfall/Documents", "cfall", "cfall", "2026-04-06 08:41", "drwxr-x---");
  addDir(entries, dirs, sections, "/home/straore", "straore", "compta", "2026-04-05 18:02", "drwxr-x---");
  addDir(entries, dirs, sections, "/home/odiallo", "odiallo", "admins", "2026-04-06 06:40", "drwx------");
  addDir(entries, dirs, sections, "/etc", "root", "root", "2026-04-06 07:09");
  addDir(entries, dirs, sections, "/etc/alize", "root", "root", "2026-04-06 09:05");
  addDir(entries, dirs, sections, "/etc/alize/conf.d", "root", "root", "2026-04-06 09:14");

  addLink(entries, "/srv/partage/compta/courant", "root", "root", "2026-04", "2026-04-06 07:12");
  addLink(entries, "/srv/partage/adhesions/derniere-liste", "root", "root", "listes/adhesions-2026-04-06.csv", "2026-04-06 08:20");

  const marchFiles = [
    ["journal-banque-2026-03.xlsx", 48213, "2026-03-30 16:42"],
    ["journal-caisse-2026-03.xlsx", 39102, "2026-03-30 16:48"],
    ["grand-livre-2026-03.ods", 91324, "2026-03-31 17:22"],
    ["balance-2026-03.pdf", 249442, "2026-03-31 17:28"],
    ["factures-fournisseurs-2026-03.csv", 18424, "2026-03-29 14:04"],
    ["justificatifs-2026-03.zip", 603218, "2026-03-31 16:58"],
    ["note-verification.txt", 2231, "2026-03-27 11:02"],
    ["releve-mobile-money-2026-03.csv", 8122, "2026-03-29 15:10"],
    ["synthese-2026-03.docx", 19288, "2026-03-31 17:40"],
    ["tva-2026-03.ods", 27428, "2026-03-31 17:32"],
    ["versements-2026-03.csv", 9441, "2026-03-29 15:16"],
    ["virements-2026-03.pdf", 143118, "2026-03-31 17:35"],
  ];
  for (const [name, size, mtime] of marchFiles) addFile(entries, `/srv/partage/compta/2026-03/${name}`, "straore", "compta", size, mtime);

  const aprilFiles = [
    ["journal-banque-2026-04.xlsx", 52188, "2026-04-06 09:11"],
    ["journal-caisse-2026-04.xlsx", 43810, "2026-04-06 09:15"],
    ["grand-livre-2026-04.ods", 98412, "2026-04-06 09:18"],
    ["balance-2026-04.pdf", 267904, "2026-04-06 09:22"],
    ["factures-fournisseurs-2026-04.csv", 19221, "2026-04-06 09:08"],
    ["justificatifs-2026-04.zip", 734112, "2026-04-06 09:32"],
    ["memo-controle.txt", 2914, "2026-04-06 08:57"],
    ["releve-mobile-money-2026-04.csv", 9018, "2026-04-06 09:14"],
    ["synthese-2026-04.docx", 20112, "2026-04-06 09:29"],
    ["tva-2026-04.ods", 28144, "2026-04-06 09:26"],
    ["versements-2026-04.csv", 10018, "2026-04-06 09:16"],
    ["virements-2026-04.pdf", 151002, "2026-04-06 09:24"],
  ];
  for (const [name, size, mtime] of aprilFiles) addFile(entries, `/srv/partage/compta/2026-04/${name}`, "straore", "compta", size, mtime);

  for (const [name, size, mtime] of [
    ["compta-2025-11.tar.gz", 190112, "2025-12-01 08:05"],
    ["compta-2025-12.tar.gz", 194208, "2026-01-03 08:05"],
    ["compta-2026-01.tar.gz", 198144, "2026-02-01 08:06"],
    ["compta-2026-02.tar.gz", 201744, "2026-03-01 08:06"],
    ["compta-2026-03.tar.gz", 205312, "2026-04-01 08:07"],
    ["inventaires-2025.tar.gz", 119552, "2026-01-07 07:58"],
    ["pieces-justificatives-2025.tar.gz", 398112, "2026-01-07 07:59"],
    ["rapports-2025.tar.gz", 149002, "2026-01-07 08:01"],
    ["archives-audit.tar.gz", 162004, "2026-03-22 10:44"],
    ["banques-2025.tar.gz", 97012, "2026-01-07 08:02"],
  ]) addFile(entries, `/srv/partage/compta/archive/${name}`, "straore", "compta", size, mtime);

  for (const [name, size, mtime] of [
    ["modele-facture.ods", 18244, "2026-03-18 12:18"],
    ["modele-note-frais.ods", 17441, "2026-03-18 12:18"],
    ["modele-releve.ods", 16920, "2026-03-18 12:19"],
    ["modele-virement.csv", 1944, "2026-03-18 12:20"],
    ["procedure-cloture.txt", 2830, "2026-03-18 12:21"],
    ["lire-moi.txt", 842, "2026-03-18 12:21"],
  ]) addFile(entries, `/srv/partage/compta/modeles/${name}`, "straore", "compta", size, mtime);

  for (let index = 1; index <= 16; index += 1) {
    const size = 120442 + index * 1841 + (index % 3) * 240;
    const date = `2026-04-${String(index % 6 === 0 ? 6 : index % 6).padStart(2, "0")} ${String(8 + (index % 5)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`;
    addFile(entries, `/srv/partage/adhesions/contrats/contrat-2026-04-${String(index).padStart(2, "0")}.pdf`, "emballa", "adherents", size, date);
  }

  for (const [name, size, mtime] of [
    ["adherents-avril.csv", 8421, "2026-04-06 08:08"],
    ["adherents-avril.log", 3180, "2026-04-06 08:14"],
    ["adherents-v2.csv", 8610, "2026-04-06 08:34"],
    ["cartes-a-verifier.csv", 1442, "2026-04-06 08:21"],
    ["import-adhesions.sh", 1188, "2026-04-06 08:05"],
    ["imports-2026-04-06.tar.gz", 42118, "2026-04-06 08:32"],
    ["retours-erreurs.txt", 1680, "2026-04-06 08:31"],
    ["ville-reference.csv", 924, "2026-04-05 17:42"],
  ]) addFile(entries, `/srv/partage/adhesions/imports/${name}`, "emballa", "adherents", size, mtime);

  for (const [name, size, mtime] of [
    ["adhesions-2026-04-02.csv", 6210, "2026-04-02 17:02"],
    ["adhesions-2026-04-03.csv", 6288, "2026-04-03 17:05"],
    ["adhesions-2026-04-04.csv", 6332, "2026-04-04 17:10"],
    ["adhesions-2026-04-05.csv", 6404, "2026-04-05 17:18"],
    ["adhesions-2026-04-06.csv", 6532, "2026-04-06 10:12"],
    ["doublons-2026-04-06.txt", 784, "2026-04-06 10:15"],
  ]) addFile(entries, `/srv/partage/adhesions/listes/${name}`, "emballa", "adherents", size, mtime);

  for (const [name, size, mtime] of [
    ["accueil.html", 3481, "2026-04-06 08:50"],
    ["espace-adherents.php", 8124, "2026-04-06 09:02"],
    ["faq.html", 2824, "2026-04-05 18:02"],
    ["hero.jpg", 184220, "2026-04-04 11:10"],
    ["logo-alize.svg", 2941, "2026-04-01 09:20"],
    ["mentions-legales.html", 5160, "2026-04-05 16:50"],
    ["style.css", 7482, "2026-04-06 09:12"],
    ["televersement-formulaire.php", 6021, "2026-04-05 14:11"],
  ]) addFile(entries, `/srv/partage/communication/site/${name}`, "svc-web", "webdev", size, mtime);

  for (const [name, size, mtime] of [
    ["affiche-mutuelle-avril.pdf", 402281, "2026-04-02 10:10"],
    ["campagne-radio-avril.txt", 1911, "2026-04-02 11:05"],
    ["depliant-famille.pdf", 240118, "2026-04-01 15:44"],
    ["flyer-bourse-sante.pdf", 221402, "2026-04-01 15:48"],
    ["kit-reseaux-sociaux.zip", 88112, "2026-04-02 09:52"],
    ["newsletter-avril.html", 9602, "2026-04-02 09:45"],
    ["photo-stand.jpg", 174121, "2026-04-02 09:47"],
    ["visuels-avril.png", 208844, "2026-04-02 10:02"],
  ]) addFile(entries, `/srv/partage/communication/campagnes/${name}`, "adjovi", "webdev", size, mtime);

  for (const [name, size, mtime] of [
    ["archiver-compta.sh", 1310, "2026-04-06 06:40"],
    ["controle-espace.sh", 1102, "2026-04-06 06:42"],
    ["import-adhesions.sh", 1488, "2026-04-06 06:46"],
    ["nettoyer-cache.sh", 980, "2026-04-06 06:48"],
    ["publier-site.sh", 1722, "2026-04-06 06:50"],
    ["ranger-exports.sh", 1248, "2026-04-06 06:38"],
    ["sauvegarder-rapports.sh", 1608, "2026-04-06 06:44"],
    ["verifier-droits.sh", 1190, "2026-04-06 06:36"],
  ]) addFile(entries, `/srv/scripts/${name}`, "odiallo", "admins", size, mtime, "-rwxr-xr-x");

  for (const [name, size, mtime, mode] of [
    [".bash_history", 2240, "2026-04-06 08:40", "-rw-------"],
    [".bashrc", 3771, "2026-03-08 09:01", "-rw-r--r--"],
    [".config.json", 812, "2026-04-06 08:54", "-rw-r--r--"],
    [".profile", 807, "2026-03-08 09:01", "-rw-r--r--"],
    ["notes-premier-jour.txt", 1290, "2026-04-06 08:44", "-rw-r--r--"],
    ["repere-chemins.txt", 601, "2026-04-06 08:45", "-rw-r--r--"],
    ["todo-labo.txt", 418, "2026-04-06 08:46", "-rw-r--r--"],
  ]) addFile(entries, `/home/cfall/${name}`, "cfall", "cfall", size, mtime, mode);

  for (const [name, size, mtime] of [
    ["marque-pages.json", 384, "2026-04-06 08:54"],
    ["preferences.ini", 222, "2026-04-06 08:55"],
  ]) addFile(entries, `/home/cfall/.config/${name}`, "cfall", "cfall", size, mtime, "-rw-r--r--");

  for (const [name, size, mtime] of [
    ["raccourcis.txt", 284, "2026-04-06 08:41"],
    ["schema-dossiers.txt", 840, "2026-04-06 08:42"],
  ]) addFile(entries, `/home/cfall/Documents/${name}`, "cfall", "cfall", size, mtime, "-rw-r--r--");

  for (const [name, size, mtime, mode] of [
    [".bashrc", 3771, "2026-02-10 10:00", "-rw-r--r--"],
    [".vimrc", 522, "2026-02-10 10:00", "-rw-r--r--"],
    ["budget-avril.ods", 32110, "2026-04-05 18:02", "-rw-r-----"],
    ["rappel-echeances.txt", 810, "2026-04-05 17:51", "-rw-r-----"],
    ["signature-email.txt", 188, "2026-04-02 11:04", "-rw-r--r--"],
  ]) addFile(entries, `/home/straore/${name}`, "straore", "compta", size, mtime, mode);

  for (const [name, size, mtime, mode] of [
    [".bash_history", 3182, "2026-04-06 06:40", "-rw-------"],
    [".ssh-config", 240, "2026-03-11 08:10", "-rw-------"],
    ["diagnostic.txt", 1422, "2026-04-06 06:42", "-rw-------"],
    ["liste-ports.txt", 620, "2026-04-06 06:43", "-rw-------"],
    ["notes-maintenance.txt", 980, "2026-04-06 06:44", "-rw-------"],
    ["ports-prevus.txt", 311, "2026-04-06 06:45", "-rw-------"],
  ]) addFile(entries, `/home/odiallo/${name}`, "odiallo", "admins", size, mtime, mode);

  for (const [name, size, mtime, mode] of [
    ["alize.conf", 1940, "2026-04-05 18:40", "-rw-r-----"],
    ["imports.conf", 888, "2026-04-06 08:58", "-rw-r-----"],
    ["journal.conf", 640, "2026-04-06 08:57", "-rw-r-----"],
    ["membres.conf", 1292, "2026-04-06 09:05", "-rw-r-----"],
    ["notifications.conf", 712, "2026-04-06 08:54", "-rw-r-----"],
    ["secrets.example", 344, "2026-04-01 09:10", "-rw-r-----"],
    ["televersement.conf", 1008, "2026-04-06 09:07", "-rw-r-----"],
    ["version.txt", 12, "2026-04-04 15:10", "-rw-r--r--"],
  ]) addFile(entries, `/etc/alize/${name}`, "root", "root", size, mtime, mode);

  for (const [name, size, mtime] of [
    ["10-base.conf", 402, "2026-04-05 18:31"],
    ["20-web.conf", 508, "2026-04-06 08:59"],
    ["30-exports.conf", 621, "2026-04-06 09:10"],
    ["40-adhesions.conf", 487, "2026-04-06 09:14"],
    ["50-alertes.conf", 418, "2026-04-06 09:13"],
  ]) addFile(entries, `/etc/alize/conf.d/${name}`, "root", "root", size, mtime, "-rw-r-----");

  const treeText = buildRecursiveLs(entries, sections);

  const historyCommands = [
    "pwd",
    "ls",
    "cd /srv/partage",
    "ls compta",
    "cd communication",
    "pwd",
    "cd site",
    "less accueil.html",
    "grep -n \"adh\" espace-adherents.php",
    "cd ..",
    "history | tail -n 5",
    "cd ../adhesions/imports",
    "ls -lh",
    "cat ../contrats/contrat-2026-04-07.pdf",
    "cat retours-erreurs.txt",
    "cd ../contrats",
    "mkdir -p /tmp/verif-chemins",
    "ls | head",
    "cd ../../compta/2026-04",
    "pwd",
    "ls -1 *.csv",
    "cd -",
    "cd /home/cfall",
    "less notes-premier-jour.txt",
    "cd .config",
  ];
  const historyLines = historyCommands.map((command, index) => {
    const minute = 12 + index;
    return `  ${String(401 + index).padStart(3)}  2026-04-06 08:${String(minute).padStart(2, "0")}:${String((20 + index * 3) % 60).padStart(2, "0")} ${command}`;
  });
  const historyText = `${historyLines.join("\n")}\n`;

  const cityNames = ["Bako-ville", "Colline-Nord", "Lagune-Est", "Savane-Centre", "Rivage-Sud", "Plateau-Vert"];
  const formulas = ["essentiel", "famille-plus", "solidarite", "premium", "jeune"];
  const csvRows = ["identifiant;nom;ville;formule;date_adhesion"];
  for (let index = 1; index <= 60; index += 1) {
    const city = cityNames[(index * 5 + 2) % cityNames.length];
    const formula = formulas[(index * 3 + 1) % formulas.length];
    const overrideCity = index === 6 || index === 12 || index === 18 || index === 24 || index === 30 || index === 36 ? "Lagune-Est" : city;
    const overrideFormula = index % 7 === 0 || index % 11 === 0 ? "famille-plus" : formula;
    csvRows.push(`ADH-${String(index).padStart(3, "0")};Adherent ${String(index).padStart(2, "0")};${overrideCity};${overrideFormula};2026-0${(index % 3) + 1}-${String((index % 27) + 1).padStart(2, "0")}`);
  }
  const csvText = `${csvRows.join("\n")}\n`;

  const accessLines = [];
  const rng = mulberry32(0x1a2b3c4d);
  const ipWeights = [
    ["10.20.0.100", 118],
    ["10.20.0.118", 82],
    ["10.20.0.121", 74],
    ["10.20.0.135", 51],
    ["10.20.0.146", 43],
    ["10.20.0.151", 39],
    ["10.20.0.160", 35],
    ["198.51.100.44", 41],
    ["198.51.100.81", 37],
    ["203.0.113.9", 63],
    ["203.0.113.22", 28],
    ["203.0.113.57", 24],
    ["192.0.2.33", 18],
    ["192.0.2.90", 14],
  ];
  const ipPlan = [];
  for (const [ip, weight] of ipWeights) for (let count = 0; count < weight; count += 1) ipPlan.push(ip);
  const commonPaths = [
    "/",
    "/accueil.html",
    "/membres/login.php",
    "/membres/tableau-de-bord.php",
    "/membres/profil.php",
    "/cotisations.php",
    "/faq.html",
    "/contact.html",
    "/styles/site.css",
    "/assets/logo.svg",
  ];
  const postPaths = ["/membres/login.php", "/api/connexion", "/membres/rechercher.php", "/contact.php"];
  const notFoundPaths = ["/admin/", "/admin/index.php", "/admin/backup.php", "/private/.env", "/wp-login.php"];
  const agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/124.0",
    "Mozilla/5.0 (X11; Linux x86_64) Firefox/115.0",
    "Mozilla/5.0 (Linux; Android 13) Chrome/122.0 Mobile",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0",
  ];
  for (let index = 0; index < ipPlan.length; index += 1) {
    const ip = ipPlan[index];
    const minute = 8 * 60 + Math.floor(index / 4);
    const second = (index * 17) % 60;
    const hour = Math.floor(minute / 60);
    const minutes = minute % 60;
    const stamp = `06/Apr/2026:${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(second).padStart(2, "0")} +0000`;
    let method = "GET";
    let requestPath = commonPaths[Math.floor(rng() * commonPaths.length)];
    let status = 200;
    let bytes = 1000 + Math.floor(rng() * 6000);
    const roll = rng();
    if (roll < 0.13) {
      status = 404;
      requestPath = notFoundPaths[Math.floor(rng() * notFoundPaths.length)];
      bytes = 512 + Math.floor(rng() * 1600);
    } else if (roll < 0.17) {
      status = 500;
      requestPath = "/membres/login.php";
      bytes = 618 + Math.floor(rng() * 600);
    } else if (roll < 0.32) {
      method = "POST";
      requestPath = postPaths[Math.floor(rng() * postPaths.length)];
      status = rng() < 0.85 ? 200 : 403;
      bytes = status === 200 ? 812 + Math.floor(rng() * 1400) : 421;
    } else if (roll < 0.42) {
      status = 301;
      requestPath = "/";
      bytes = 178;
    } else if (roll < 0.50) {
      status = 304;
      requestPath = "/styles/site.css";
      bytes = 0;
    }
    if (index % 19 === 0) {
      status = 404;
      method = "GET";
      requestPath = "/admin/backup.php";
      bytes = 734;
    }
    if (index % 27 === 0) {
      method = "POST";
      requestPath = "/membres/login.php";
      status = 200;
      bytes = 1184;
    }
    if (index % 31 === 0) {
      method = "GET";
      requestPath = "/membres/tableau-de-bord.php";
      status = 200;
      bytes = 4820 + (index % 7) * 90;
    }
    accessLines.push(formatAccessLine(ip, stamp, method, requestPath, status, bytes, "-", agents[index % agents.length]));
  }
  const accessText = `${accessLines.join("\n")}\n`;

  const sectionCount = entries.filter((entry) => path.posix.dirname(entry.path) === "/srv/partage/communication/site").length;
  const biggestApril = aprilFiles.slice().sort((left, right) => right[1] - left[1])[0][0];
  const pdfTotal = entries.filter((entry) => entry.path.startsWith("/srv/partage/adhesions/contrats/") && entry.path.endsWith(".pdf")).reduce((sum, entry) => sum + entry.size, 0);
  const recentConfigFile = entries
    .filter((entry) => path.posix.dirname(entry.path) === "/etc/alize/conf.d")
    .slice()
    .sort((left, right) => right.mtime.localeCompare(left.mtime))[0].name;
  const hiddenCfallCount = entries.filter((entry) => path.posix.dirname(entry.path) === "/home/cfall" && entry.name.startsWith(".")).length;

  const historyFinalDir = "/home/cfall/.config";
  const relativeTargetAbs = "/srv/partage/adhesions/contrats/contrat-2026-04-07.pdf";

  const accessRecords = accessLines.map((line) => {
    const match = /^(\S+) - - \[[^\]]+\] "(\S+) (\S+) HTTP\/1\.1" (\d{3}) (\d+)/u.exec(line);
    return { ip: match[1], method: match[2], requestPath: match[3], status: Number(match[4]), bytes: Number(match[5]) };
  });
  const topRequesterIp = [...accessRecords.reduce((map, row) => map.set(row.ip, (map.get(row.ip) ?? 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const notFoundCount = accessRecords.filter((row) => row.status === 404).length;
  const top404Path = [...accessRecords.filter((row) => row.status === 404).reduce((map, row) => map.set(row.requestPath, (map.get(row.requestPath) ?? 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const postCount = accessRecords.filter((row) => row.method === "POST").length;
  const distinctIpCount = new Set(accessRecords.map((row) => row.ip)).size;
  const cityQuery = "Lagune-Est";
  const cityCount = csvRows.slice(1).filter((line) => line.split(";")[2] === cityQuery).length;
  const topFormula = [...csvRows.slice(1).reduce((map, line) => {
    const formula = line.split(";")[3];
    map.set(formula, (map.get(formula) ?? 0) + 1);
    return map;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const bytes200Path = "/membres/tableau-de-bord.php";
  const bytes200Total = accessRecords.filter((row) => row.requestPath === bytes200Path && row.status === 200).reduce((sum, row) => sum + row.bytes, 0);

  const guideLines = [
    "# Guide du TP 1 : explorer l’arborescence et chercher dans les fichiers",
    "",
    "> Cadre et limites",
    ">",
    "> Toutes les données de ce laboratoire sont fictives et figées.",
    "> Tu travailles sur des exports fournis, pas sur un vrai serveur.",
    "> Ne lance jamais un script téléchargé sans l’avoir lu, et ne teste rien sur un système important.",
    "",
    "## Lire l’export d’arborescence",
    "",
    "L’export reprend le style de « ls -lR --time-style=long-iso ». Chaque section commence par un chemin, puis « total », puis les lignes du contenu direct de ce dossier. Les dates sont en UTC.",
    "",
    "## Suivre un historique de « cd »",
    "",
    "Pour retrouver un répertoire final, pars du répertoire de départ donné dans l’énoncé puis rejoue chaque « cd » dans l’ordre. Pense aux cas particuliers : « .. », « ~ » et « cd - ».",
    "",
    "## Bash ou Git Bash",
    "",
    "```bash",
    "cat > demo-arbo.txt <<'EOF'",
    "/home/demo:",
    "total 12",
    "-rw-r--r--  1 demo demo  120 2025-11-02 09:00 rapport.txt",
    "-rw-r--r--  1 demo demo   88 2025-11-02 09:01 .token",
    "drwxr-xr-x  2 demo demo 4096 2025-11-02 09:02 .config",
    "EOF",
    "hidden_demo=$(awk 'BEGIN{n=0; insec=0} /^\\/home\\/demo:$/ {insec=1; next} insec && /^$/ {print n; exit} insec && $0 ~ / \\.[^[:space:]]+$/ {n++}' demo-arbo.txt)",
    "cat > demo-adh.csv <<'EOF'",
    "identifiant;nom;ville;formule",
    "X-001;Ada;Atelier-Bleu;alpha",
    "X-002;Benoit;Atelier-Bleu;beta",
    "EOF",
    "city_demo=$(awk -F';' 'NR>1 && $3==\"Atelier-Bleu\" {n++} END{print n+0}' demo-adh.csv)",
    "printf 'Démo arborescence prête pour compter les entrées cachées : %s résultat(s).\\nDémo CSV prête pour filtrer une ville inventée : %s ligne(s).\\n' \"$hidden_demo\" \"$city_demo\"",
    "```",
    "",
    "## PowerShell 5.1",
    "",
    "Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.",
    "",
    "```powershell",
    "@'",
    "/home/demo:",
    "total 12",
    "-rw-r--r--  1 demo demo  120 2025-11-02 09:00 rapport.txt",
    "-rw-r--r--  1 demo demo   88 2025-11-02 09:01 .token",
    "drwxr-xr-x  2 demo demo 4096 2025-11-02 09:02 .config",
    "'@ | Set-Content -Encoding UTF8 demo-arbo.txt",
    "$tree = Get-Content -Encoding UTF8 \"demo-arbo.txt\"",
    "$homeStart = [Array]::IndexOf($tree, '/home/demo:')",
    "$hiddenCount = 0",
    "for ($i = $homeStart + 2; $i -lt $tree.Length -and $tree[$i] -ne ''; $i++) { if ($tree[$i] -match '^[dl-].*\\s\\.[^\\s]+$') { $hiddenCount++ } }",
    "@'",
    "identifiant;nom;ville;formule",
    "X-001;Ada;Atelier-Bleu;alpha",
    "X-002;Benoit;Atelier-Bleu;beta",
    "'@ | Set-Content -Encoding UTF8 demo-adh.csv",
    "$cityCount = (Import-Csv \"demo-adh.csv\" -Delimiter ';' | Where-Object { $_.ville -eq 'Atelier-Bleu' }).Count",
    "\"Démo arborescence prête pour compter les entrées cachées : $hiddenCount résultat(s).\"",
    "\"Démo CSV prête pour filtrer une ville inventée : $cityCount ligne(s).\"",
    "```",
    "",
    "## Visionneuse du site",
    "",
    "Dans la visionneuse, tape un mot ou un nombre pour ne garder que les lignes qui le contiennent. Tu peux tester avec des exemples génériques comme « error », « sudo » ou « accepted », puis relire calmement la structure des lignes visibles.",
    "",
    "## Méthode utile",
    "",
    "- Pour un plus gros fichier, compare la colonne de taille d’un même dossier.",
    "- Pour un chemin absolu, résous chaque segment du chemin relatif depuis le dossier de départ.",
    "- Pour un CSV, compte après avoir choisi la bonne colonne et le bon séparateur « ; ».",
  ];

  return {
    files: [
      { name: "lnx-tp1-arborescence.txt", data: text(treeText) },
      { name: "lnx-tp1-historique.txt", data: text(historyText) },
      { name: "lnx-tp1-acces.log", data: text(accessText) },
      { name: "lnx-tp1-adherents.csv", data: text(csvText) },
      { name: "lnx-tp1-guide.md", data: text(guideLines.join("\n")) },
    ],
    facts: {
      assetNames: {
        treeFile: "lnx-tp1-arborescence.txt",
        historyFile: "lnx-tp1-historique.txt",
        accessFile: "lnx-tp1-acces.log",
        csvFile: "lnx-tp1-adherents.csv",
        guideFile: "lnx-tp1-guide.md",
      },
      sectionCount,
      biggestApril,
      pdfTotal,
      recentConfigFile,
      hiddenCfallCount,
      historyFinalDir,
      relativeTargetAbs,
      topRequesterIp,
      notFoundCount,
      top404Path,
      postCount,
      distinctIpCount,
      cityQuery,
      cityCount,
      topFormula,
      bytes200Path,
      bytes200Total,
    },
  };
}

function buildTp2() {
  const passwdRows = [
    ["root", "x", 0, 0, "root", "/root", "/bin/bash"],
    ["daemon", "x", 1, 1, "daemon", "/usr/sbin", "/usr/sbin/nologin"],
    ["bin", "x", 2, 2, "bin", "/bin", "/usr/sbin/nologin"],
    ["sys", "x", 3, 3, "sys", "/dev", "/usr/sbin/nologin"],
    ["sync", "x", 4, 65534, "sync", "/bin", "/bin/sync"],
    ["games", "x", 5, 60, "games", "/usr/games", "/usr/sbin/nologin"],
    ["man", "x", 6, 12, "man", "/var/cache/man", "/usr/sbin/nologin"],
    ["lp", "x", 7, 7, "lp", "/var/spool/lpd", "/usr/sbin/nologin"],
    ["mail", "x", 8, 8, "mail", "/var/mail", "/usr/sbin/nologin"],
    ["news", "x", 9, 9, "news", "/var/spool/news", "/usr/sbin/nologin"],
    ["uucp", "x", 10, 10, "uucp", "/var/spool/uucp", "/usr/sbin/nologin"],
    ["proxy", "x", 13, 13, "proxy", "/bin", "/usr/sbin/nologin"],
    ["www-data", "x", 33, 33, "www-data", "/var/www", "/usr/sbin/nologin"],
    ["backup", "x", 34, 34, "backup", "/var/backups", "/usr/sbin/nologin"],
    ["list", "x", 38, 38, "Mailing List Manager", "/var/list", "/usr/sbin/nologin"],
    ["irc", "x", 39, 39, "ircd", "/run/ircd", "/usr/sbin/nologin"],
    ["_apt", "x", 42, 65534, "", "/nonexistent", "/usr/sbin/nologin"],
    ["nobody", "x", 65534, 65534, "nobody", "/nonexistent", "/usr/sbin/nologin"],
    ["systemd-network", "x", 998, 998, "systemd Network Management", "/", "/usr/sbin/nologin"],
    ["systemd-timesync", "x", 997, 997, "systemd Time Synchronization", "/", "/usr/sbin/nologin"],
    ["messagebus", "x", 100, 102, "", "/nonexistent", "/usr/sbin/nologin"],
    ["polkitd", "x", 996, 996, "polkit", "/nonexistent", "/usr/sbin/nologin"],
    ["redis", "x", 101, 103, "", "/var/lib/redis", "/usr/sbin/nologin"],
    ["mysql", "x", 102, 105, "MySQL Server", "/nonexistent", "/usr/sbin/nologin"],
    ["sshd", "x", 103, 65534, "", "/run/sshd", "/usr/sbin/nologin"],
    ["svc-web", "x", 210, 300, "service web", "/srv/web", "/usr/sbin/nologin"],
    ["svc-backup", "x", 211, 301, "service sauvegarde", "/var/lib/backup", "/bin/bash"],
    ["adjovi", "x", 1101, 1101, "Brice Adjovi", "/home/adjovi", "/bin/bash"],
    ["straore", "x", 1102, 1201, "Salimata Traore", "/home/straore", "/bin/bash"],
    ["odiallo", "x", 1103, 1202, "Ousmane Diallo", "/home/odiallo", "/bin/bash"],
    ["emballa", "x", 1104, 1203, "Estelle Mballa", "/home/emballa", "/bin/bash"],
    ["cfall", "x", 1105, 1105, "Cheikh Fall", "/home/cfall", "/bin/bash"],
    ["nkamga", "x", 1106, 1204, "Nadege Kamga", "/home/nkamga", "/bin/bash"],
    ["pkamga", "x", 1107, 1204, "Paul Kamga", "/home/pkamga", "/bin/bash"],
    ["sysmaint", "x", 0, 0, "maintenance locale", "/root", "/bin/bash"],
  ];
  const passwdText = `${passwdRows.map((row) => row.join(":")).join("\n")}\n`;

  const shadowRows = [
    ["root", fakeShadow("$y$j9T$", 1), isoDateToShadowDay("2026-03-11"), 0, 99999, 7, "", "", ""],
    ["daemon", "*", 19700, 0, 99999, 7, "", "", ""],
    ["bin", "*", 19700, 0, 99999, 7, "", "", ""],
    ["sys", "*", 19700, 0, 99999, 7, "", "", ""],
    ["sync", "*", 19700, 0, 99999, 7, "", "", ""],
    ["games", "*", 19700, 0, 99999, 7, "", "", ""],
    ["man", "*", 19700, 0, 99999, 7, "", "", ""],
    ["lp", "*", 19700, 0, 99999, 7, "", "", ""],
    ["mail", "*", 19700, 0, 99999, 7, "", "", ""],
    ["news", "*", 19700, 0, 99999, 7, "", "", ""],
    ["uucp", "*", 19700, 0, 99999, 7, "", "", ""],
    ["proxy", "*", 19700, 0, 99999, 7, "", "", ""],
    ["www-data", "*", 19700, 0, 99999, 7, "", "", ""],
    ["backup", "*", 19700, 0, 99999, 7, "", "", ""],
    ["list", "*", 19700, 0, 99999, 7, "", "", ""],
    ["irc", "*", 19700, 0, 99999, 7, "", "", ""],
    ["_apt", "*", 19700, 0, 99999, 7, "", "", ""],
    ["nobody", "*", 19700, 0, 99999, 7, "", "", ""],
    ["systemd-network", "!", 19700, 0, 99999, 7, "", "", ""],
    ["systemd-timesync", "!", 19700, 0, 99999, 7, "", "", ""],
    ["messagebus", "!", 19700, 0, 99999, 7, "", "", ""],
    ["polkitd", "!", 19700, 0, 99999, 7, "", "", ""],
    ["redis", "!", 19700, 0, 99999, 7, "", "", ""],
    ["mysql", "!", 19700, 0, 99999, 7, "", "", ""],
    ["sshd", "!", 19700, 0, 99999, 7, "", "", ""],
    ["svc-web", fakeShadow("$6$", 2), isoDateToShadowDay("2026-02-16"), 0, 120, 7, "", "", ""],
    ["svc-backup", fakeShadow("$6$", 3), isoDateToShadowDay("2026-03-05"), 0, 120, 7, "", "", ""],
    ["adjovi", fakeShadow("$y$j9T$", 4), isoDateToShadowDay("2026-03-28"), 0, 90, 7, "", "", ""],
    ["straore", fakeShadow("$y$j9T$", 5), isoDateToShadowDay("2026-03-14"), 0, 90, 7, "", "", ""],
    ["odiallo", fakeShadow("$y$j9T$", 6), isoDateToShadowDay("2026-03-02"), 0, 90, 7, "", "", ""],
    ["emballa", fakeShadow("$6$", 7), isoDateToShadowDay("2026-02-26"), 0, 90, 7, "", "", ""],
    ["cfall", "", isoDateToShadowDay("2026-04-05"), 0, 90, 7, "", "", ""],
    ["nkamga", fakeShadow("$1$", 8), isoDateToShadowDay("2026-01-19"), 0, 120, 7, "", "", ""],
    ["pkamga", fakeShadow("$6$", 9), isoDateToShadowDay("2025-12-01"), 0, 120, 7, "", "", ""],
    ["sysmaint", fakeShadow("$y$j9T$", 10), isoDateToShadowDay("2026-02-08"), 0, 99999, 7, "", "", ""],
  ];
  const shadowText = `${shadowRows.map((row) => row.join(":")).join("\n")}\n`;

  const groupRows = [
    "root:x:0:",
    "daemon:x:1:",
    "bin:x:2:",
    "sys:x:3:",
    "adm:x:4:odiallo,adjovi",
    "tty:x:5:",
    "disk:x:6:",
    "lp:x:7:",
    "mail:x:8:",
    "news:x:9:",
    "uucp:x:10:",
    "admin:x:118:odiallo",
    "sudo:x:27:adjovi,odiallo,nkamga",
    "www-data:x:33:",
    "backup:x:34:",
    "compta:x:1201:straore,adjovi",
    "admins:x:1202:odiallo,adjovi",
    "adherents:x:1203:emballa,cfall",
    "webdev:x:1204:nkamga,svc-web,pkamga",
    "svc-web:x:300:",
    "svc-backup:x:301:",
  ];
  const groupText = `${groupRows.join("\n")}\n`;

  const sudoersText = [
    "# /etc/sudoers",
    "# Fichier généré pour audit de configuration",
    "",
    "Defaults        env_reset",
    "Defaults        mail_badpass",
    "Defaults        secure_path=\"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\"",
    "Defaults        use_pty",
    "Defaults        logfile=\"/var/log/sudo.log\"",
    "",
    "# Spécification des privilèges utilisateur",
    "root            ALL=(ALL:ALL) ALL",
    "",
    "# Membres du groupe admin",
    "%admin          ALL=(ALL) ALL",
    "",
    "# Membres du groupe sudo",
    "%sudo           ALL=(ALL:ALL) ALL",
    "",
    "# Autorise les administrateurs à vérifier l’état des services",
    "%admins         ALL=(root) /usr/bin/systemctl status nginx, /usr/bin/systemctl status ssh, /usr/bin/systemctl status mariadb",
    "",
    "# Inclus les règles locales de l’organisation",
    "@includedir /etc/sudoers.d",
    "",
    "# /etc/sudoers.d/20-backup-maint",
    "# Besoin métier : lancer les sauvegardes nocturnes sans accès shell complet",
    "svc-backup ALL=(root) NOPASSWD: /usr/bin/rsync --archive --delete /srv/partage/ /srv/sauvegarde/",
    "svc-backup ALL=(root) NOPASSWD: /usr/bin/tar -C /srv -czf /var/backups/partage.tgz partage",
    "svc-backup ALL=(root) /usr/bin/systemctl status backup-nuit",
    "",
    "# /etc/sudoers.d/50-helpdesk",
    "# Règle limitée et nominative pour le stagiaire",
    "cfall ALL=(root) /usr/bin/systemctl status nginx, /usr/bin/systemctl status ssh",
    "cfall ALL=(root) /usr/bin/journalctl -u nginx --since today",
    "",
    "# /etc/sudoers.d/99-web-maint",
    "# Règle temporaire laissée par le prestataire web",
    "nkamga ALL=(ALL) NOPASSWD: ALL",
    "",
    "# Fin des extraits sudoers.d",
  ].join("\n");

  const permissionsText = [
    "/etc/alize:",
    "total 20",
    "-rw-r-----  1 root    root      1940 2026-04-05 18:40 alize.conf",
    "-rw-rw-rw-  1 root    root       888 2026-04-06 08:58 imports.conf",
    "-rw-r-----  1 root    root       640 2026-04-06 08:57 journal.conf",
    "-rw-r-----  1 root    root      1292 2026-04-06 09:05 membres.conf",
    "",
    "/home/odiallo/.ssh:",
    "total 8",
    "-rw-------  1 odiallo admins     411 2026-03-11 08:10 authorized_keys",
    "-rw-r--r--  1 odiallo admins     399 2026-03-11 08:10 id_ed25519",
    "",
    "/srv/partage/public-depot:",
    "total 12",
    "drwxrwxrwx  2 emballa adherents 4096 2026-04-06 07:45 depot",
    "-rw-rw-r--  1 emballa adherents 1820 2026-04-06 07:48 avis.txt",
    "",
    "/var/backups:",
    "total 16",
    "-rwxr-xr--  1 root    root      1220 2026-04-04 22:10 export-adhesions.sh",
    "-rw-r-----  1 root    root     18220 2026-04-06 02:31 last-backup.log",
    "",
    "/usr/local/bin:",
    "total 16",
    "-rwxr-xr-x  1 nkamga  webdev    1540 2026-04-06 06:15 backup-night.sh",
    "-rwxr-xr-x  1 root    root      1211 2026-04-02 05:30 rotate-adhesions.sh",
  ].join("\n");

  const suidText = [
    "124013    144 -rwsr-xr-x   1 root     root        72712 2025-11-04 10:20 /usr/bin/passwd",
    "124014    120 -rwsr-xr-x   1 root     root        59704 2025-11-04 10:20 /usr/bin/su",
    "124015     84 -rwsr-xr-x   1 root     root        48896 2025-11-04 10:20 /usr/bin/chfn",
    "124016     76 -rwsr-xr-x   1 root     root        52880 2025-11-04 10:20 /usr/bin/chsh",
    "124017     52 -rwsr-xr-x   1 root     root        30952 2025-11-04 10:20 /usr/bin/gpasswd",
    "124018     44 -rwsr-xr-x   1 root     root        43384 2025-11-04 10:20 /usr/bin/mount",
    "124019     36 -rwsr-xr-x   1 root     root        35128 2025-11-04 10:20 /usr/bin/umount",
    "124020     28 -rwsr-xr-x   1 root     root        22984 2025-11-04 10:20 /usr/bin/newgrp",
    "124021     52 -rwsr-xr--   1 root     messagebus 51272 2025-11-04 10:20 /usr/lib/dbus-1.0/dbus-daemon-launch-helper",
    "124022     20 -rwsr-xr-x   1 root     root        18736 2025-11-04 10:20 /usr/lib/polkit-1/polkit-agent-helper-1",
    "124023     12 -rwsr-xr-x   1 root     root        14688 2025-11-04 10:20 /usr/lib/openssh/ssh-keysign",
    "124024     16 -rwsr-xr-x   1 root     root        21944 2025-11-04 10:20 /usr/bin/sudo",
    "124025      8 -rwsr-xr-x   1 root     root        11280 2026-04-05 06:12 /usr/local/bin/diag-root",
  ].join("\n");

  const lastlogMap = new Map([
    ["root", ["pts/0", "10.20.0.100", "Tue Apr  7 07:44:10 +0000 2026"]],
    ["adjovi", ["pts/1", "10.20.0.101", "Tue Apr  7 08:12:44 +0000 2026"]],
    ["straore", ["pts/2", "10.20.0.102", "Tue Apr  7 08:22:03 +0000 2026"]],
    ["odiallo", ["pts/0", "10.20.0.100", "Tue Apr  7 09:01:55 +0000 2026"]],
    ["emballa", ["pts/3", "10.20.0.118", "Mon Mar 30 13:14:02 +0000 2026"]],
    ["cfall", ["pts/4", "10.20.0.135", "Tue Apr  7 08:59:11 +0000 2026"]],
    ["nkamga", ["pts/5", "198.51.100.44", "Fri Jan  2 16:18:20 +0000 2026"]],
    ["sysmaint", ["pts/7", "10.20.0.100", "Wed Feb 18 05:12:08 +0000 2026"]],
  ]);
  const lastlogRows = [["Username", "Port", "From", "Latest"]];
  for (const row of passwdRows) {
    const name = row[0];
    if (lastlogMap.has(name)) lastlogRows.push([name, ...lastlogMap.get(name)]);
    else lastlogRows.push([name, "**Never logged in**", "", ""]);
  }
  const lastlogText = `${lastlogRows.map((row, index) => {
    if (index === 0) return `${row[0].padEnd(16)}${row[1].padEnd(9)}${row[2].padEnd(18)}${row[3]}`;
    if (row[1] === "**Never logged in**") return `${row[0].padEnd(16)}**Never logged in**`;
    return `${row[0].padEnd(16)}${row[1].padEnd(9)}${row[2].padEnd(18)}${row[3]}`;
  }).join("\n")}\n`;

  const lockedCount = shadowRows.filter((row) => String(row[1]).startsWith("!") || String(row[1]).startsWith("*")).length;
  const dateChanged = shadowDayToIso(shadowRows.find((row) => row[0] === "straore")[2]);
  const daysChanged = daysBetween(dateChanged, "2026-04-07");
  const sudoMembers = groupRows.find((row) => row.startsWith("sudo:")).split(":")[3].split(",").sort();
  const octalMode = parseModeToOctal("-rwxr-xr--");
  const dormantHumans = [
    ["adjovi", "2026-04-07"],
    ["straore", "2026-04-07"],
    ["odiallo", "2026-04-07"],
    ["emballa", "2026-03-30"],
    ["cfall", "2026-04-07"],
    ["nkamga", "2026-01-02"],
    ["pkamga", "never"],
    ["sysmaint", "2026-02-18"],
  ].filter((row) => row[1] === "never" || daysBetween(row[1], "2026-04-07") > 90).length;

  const guideLines = [
    "# Guide du TP 2 : auditer les droits, les comptes et sudo",
    "",
    "> Cadre et limites",
    ">",
    "> Les comptes et empreintes fournis ici sont fictifs.",
    "> Tu audites des exports en lecture seule et tu ne modifies aucun vrai compte.",
    "> N’essaie jamais un mot de passe ou une commande sudo sur une machine qui n’est pas la tienne.",
    "",
    "## Repères utiles",
    "",
    "- Dans « /etc/passwd », le troisième champ est l’UID et le septième le shell. Par convention, les comptes de personnes ont un UID de 1000 ou plus et un vrai shell de connexion ; les comptes système ont un UID plus bas ou le shell « nologin ».",
    "- Dans « /etc/shadow », un champ vide signifie aucun mot de passe, « ! » ou « * » signifient un compte verrouillé.",
    "- Préfixes utiles des empreintes : « $1$ » pour md5-crypt, « $5$ » pour sha256-crypt, « $6$ » pour sha512-crypt, « $y$ » pour yescrypt.",
    "- Pour convertir un mode symbolique en octal, additionne 4 pour lecture, 2 pour écriture et 1 pour exécution dans chaque triplet.",
    "- Liste de référence des SUID normaux de ce labo : /usr/bin/passwd, /usr/bin/su, /usr/bin/chfn, /usr/bin/chsh, /usr/bin/gpasswd, /usr/bin/mount, /usr/bin/umount, /usr/bin/newgrp, /usr/bin/sudo, /usr/lib/dbus-1.0/dbus-daemon-launch-helper, /usr/lib/polkit-1/polkit-agent-helper-1, /usr/lib/openssh/ssh-keysign.",
    "",
    "## Bash ou Git Bash",
    "",
    "```bash",
    "cat > demo-shadow.txt <<'EOF'",
    "demoapp::19810:0:90:7:::",
    "svc-queue:!:19800:0:99999:7:::",
    "analyste:$6$demo$abcdef:19811:0:90:7:::",
    "EOF",
    "empty_demo=$(awk -F: '$2==\"\" {print $1}' demo-shadow.txt | paste -sd ',' -)",
    "cat > demo-perms.txt <<'EOF'",
    "-rw-r--r-- 1 root root 1200 2025-11-10 09:00 appli.conf",
    "-rw-rw-rw- 1 root root  320 2025-11-10 09:02 notes.tmp",
    "EOF",
    "world_demo=$(awk '/^-.*w..w..w./ {print $NF; exit}' demo-perms.txt)",
    "printf 'Démo shadow prête pour un compte sans mot de passe : %s.\\nDémo permissions prête pour un fichier modifiable par tous : %s.\\n' \"$empty_demo\" \"$world_demo\"",
    "```",
    "",
    "## PowerShell 5.1",
    "",
    "Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.",
    "",
    "```powershell",
    "@'",
    "demoapp::19810:0:90:7:::",
    "svc-queue:!:19800:0:99999:7:::",
    "analyste:$6$demo$abcdef:19811:0:90:7:::",
    "'@ | Set-Content -Encoding UTF8 demo-shadow.txt",
    "$empty = Get-Content -Encoding UTF8 \"demo-shadow.txt\" | ForEach-Object { $p = $_ -split ':'; if ($p[1] -eq '') { $p[0] } }",
    "@'",
    "-rw-r--r-- 1 root root 1200 2025-11-10 09:00 appli.conf",
    "-rw-rw-rw- 1 root root  320 2025-11-10 09:02 notes.tmp",
    "'@ | Set-Content -Encoding UTF8 demo-perms.txt",
    "$worldWritable = Get-Content -Encoding UTF8 \"demo-perms.txt\" | Where-Object {",
    "  if ($_ -match '^[dl-][rwxst-]{9}') {",
    "    $mode = ($_ -split '\\s+')[0]",
    "    $mode[2] -eq 'w' -and $mode[5] -eq 'w' -and $mode[8] -eq 'w'",
    "  } else {",
    "    $false",
    "  }",
    "} | Select-Object -First 1",
    "$worldWritableName = if ($worldWritable) { ($worldWritable -split '\\s+')[-1] } else { '' }",
    "\"Démo shadow prête pour un compte sans mot de passe : $($empty -join ',').\"",
    "\"Démo permissions prête pour un fichier modifiable par tous : $worldWritableName.\"",
    "```",
    "",
    "## Visionneuse du site",
    "",
    "Dans la visionneuse, tape une chaîne simple pour ne garder que les lignes qui la contiennent, par exemple « sudo », « bin/bash » ou « error ». Relis ensuite les colonnes utiles sans supposer que le premier résultat est le bon.",
  ];

  return {
    files: [
      { name: "lnx-tp2-passwd.txt", data: text(passwdText) },
      { name: "lnx-tp2-shadow.txt", data: text(shadowText) },
      { name: "lnx-tp2-group.txt", data: text(groupText) },
      { name: "lnx-tp2-sudoers.txt", data: text(`${sudoersText}\n`) },
      { name: "lnx-tp2-permissions.txt", data: text(`${permissionsText}\n`) },
      { name: "lnx-tp2-suid.txt", data: text(`${suidText}\n`) },
      { name: "lnx-tp2-derniere-connexion.txt", data: text(lastlogText) },
      { name: "lnx-tp2-guide.md", data: text(guideLines.join("\n")) },
    ],
    facts: {
      assetNames: {
        passwdFile: "lnx-tp2-passwd.txt",
        shadowFile: "lnx-tp2-shadow.txt",
        groupFile: "lnx-tp2-group.txt",
        sudoersFile: "lnx-tp2-sudoers.txt",
        permissionsFile: "lnx-tp2-permissions.txt",
        suidFile: "lnx-tp2-suid.txt",
        lastlogFile: "lnx-tp2-derniere-connexion.txt",
        guideFile: "lnx-tp2-guide.md",
      },
      uidZeroAlias: "sysmaint",
      serviceInteractive: "svc-backup",
      emptyPasswordAccount: "cfall",
      weakAlgoAccount: "nkamga",
      weakAlgo: "md5-crypt",
      lockedCount,
      changedAccount: "straore",
      changedDate: dateChanged,
      changedDays: daysChanged,
      sudoMembers,
      dangerousRule: "/etc/sudoers.d/99-web-maint",
      octalFile: "/var/backups/export-adhesions.sh",
      octalMode,
      worldWritableFile: "imports.conf",
      worldWritablePath: "/etc/alize/imports.conf",
      abnormalSuidCount: 1,
      neverLoggedInteractive: "pkamga",
      dormantHumans,
    },
  };
}

function buildTp3() {
  const rows = [
    { user: "root", pid: 1, cpu: 0.0, mem: 0.3, vsz: 168936, rss: 13092, tty: "?", stat: "Ss", start: "Apr08", time: "0:04", command: "/sbin/init" },
    { user: "root", pid: 412, cpu: 0.0, mem: 0.2, vsz: 47244, rss: 9220, tty: "?", stat: "Ss", start: "Apr08", time: "0:01", command: "/lib/systemd/systemd-journald" },
    { user: "root", pid: 455, cpu: 0.0, mem: 0.1, vsz: 28412, rss: 5360, tty: "?", stat: "Ss", start: "Apr08", time: "0:00", command: "/lib/systemd/systemd-udevd" },
    { user: "systemd-r", pid: 640, cpu: 0.0, mem: 0.1, vsz: 28164, rss: 4220, tty: "?", stat: "Ss", start: "Apr08", time: "0:00", command: "/lib/systemd/systemd-resolved" },
    { user: "root", pid: 702, cpu: 0.0, mem: 0.2, vsz: 33784, rss: 8412, tty: "?", stat: "Ss", start: "Apr08", time: "0:00", command: "/usr/sbin/cron -f" },
    { user: "root", pid: 744, cpu: 0.0, mem: 0.3, vsz: 55980, rss: 11428, tty: "?", stat: "Ss", start: "Apr08", time: "0:02", command: "/usr/sbin/rsyslogd -n -iNONE" },
    { user: "root", pid: 812, cpu: 0.0, mem: 0.2, vsz: 154120, rss: 9824, tty: "?", stat: "Ss", start: "Apr08", time: "0:01", command: "/usr/sbin/sshd -D" },
    { user: "mysql", pid: 1021, cpu: 0.1, mem: 1.4, vsz: 1349024, rss: 56420, tty: "?", stat: "Ssl", start: "Apr08", time: "0:11", command: "/usr/sbin/mariadbd" },
    { user: "root", pid: 1180, cpu: 0.0, mem: 0.2, vsz: 34124, rss: 8172, tty: "?", stat: "Ss", start: "Apr08", time: "0:01", command: "php-fpm: master process (/etc/php/8.3/fpm/php-fpm.conf)" },
    { user: "root", pid: 1310, cpu: 0.0, mem: 0.2, vsz: 112340, rss: 8128, tty: "?", stat: "Ss", start: "Apr08", time: "0:00", command: "nginx: master process /usr/sbin/nginx -g daemon off;" },
    { user: "www-data", pid: 1312, cpu: 0.1, mem: 0.4, vsz: 114228, rss: 16840, tty: "?", stat: "S", start: "08:01", time: "0:02", command: "nginx: worker process" },
    { user: "www-data", pid: 1313, cpu: 0.1, mem: 0.4, vsz: 114228, rss: 16720, tty: "?", stat: "S", start: "08:01", time: "0:02", command: "nginx: worker process" },
    { user: "www-data", pid: 1432, cpu: 0.4, mem: 1.2, vsz: 289412, rss: 49624, tty: "?", stat: "S", start: "08:01", time: "0:11", command: "php-fpm: pool www" },
    { user: "www-data", pid: 1434, cpu: 0.3, mem: 1.1, vsz: 287184, rss: 44120, tty: "?", stat: "S", start: "08:02", time: "0:09", command: "php-fpm: pool www" },
    { user: "www-data", pid: 1439, cpu: 0.5, mem: 1.0, vsz: 287920, rss: 42812, tty: "?", stat: "S", start: "08:03", time: "0:12", command: "php-fpm: pool www" },
    { user: "www-data", pid: 1444, cpu: 0.2, mem: 0.9, vsz: 286944, rss: 40120, tty: "?", stat: "S", start: "08:03", time: "0:07", command: "php-fpm: pool www" },
    { user: "www-data", pid: 3140, cpu: 0.1, mem: 0.1, vsz: 4260, rss: 2480, tty: "?", stat: "S", start: "10:01", time: "0:00", command: "/bin/sh -c /var/www/html/uploads/.cache-thumb.sh" },
    { user: "root", pid: 4680, cpu: 0.0, mem: 0.1, vsz: 6140, rss: 1812, tty: "?", stat: "S", start: "10:12", time: "0:00", command: "/bin/bash /tmp/.cache/.bootstrap.sh" },
    { user: "root", pid: 4819, cpu: 1.2, mem: 0.5, vsz: 18240, rss: 18632, tty: "?", stat: "Sl", start: "10:12", time: "0:24", command: "/tmp/.cache/telemetry-relay --listen 0.0.0.0:4545" },
    { user: "root", pid: 4821, cpu: 87.3, mem: 0.9, vsz: 14320, rss: 36012, tty: "?", stat: "R", start: "10:15", time: "12:40", command: "/tmp/.cache/kworker" },
    { user: "root", pid: 4890, cpu: 0.2, mem: 0.2, vsz: 12680, rss: 8044, tty: "?", stat: "S", start: "10:16", time: "0:03", command: "/usr/bin/systemd-helperd --session" },
    { user: "root", pid: 5220, cpu: 0.0, mem: 0.1, vsz: 8724, rss: 3316, tty: "pts/0", stat: "Ss", start: "10:21", time: "0:00", command: "-bash" },
    { user: "root", pid: 5236, cpu: 0.0, mem: 0.1, vsz: 10248, rss: 3560, tty: "pts/0", stat: "R+", start: "10:21", time: "0:00", command: "ps aux" },
  ];
  const extraUsers = ["root", "root", "root", "daemon", "daemon", "systemd-r", "messagebu", "redis", "www-data", "root"];
  for (let index = 0; index < 58; index += 1) {
    rows.push({
      user: extraUsers[index % extraUsers.length],
      pid: 5300 + index,
      cpu: Number((index % 7 === 0 ? 0.1 : 0.0).toFixed(1)),
      mem: Number((0.1 + (index % 4) * 0.1).toFixed(1)),
      vsz: 5200 + index * 112,
      rss: 1800 + (index % 9) * 420,
      tty: "?",
      stat: index % 11 === 0 ? "S" : "Ss",
      start: index % 3 === 0 ? "Apr08" : "09:14",
      time: `0:0${index % 6}`,
      command: index % 5 === 0 ? `[kworker/${index % 8}:1-events]` : `/usr/lib/systemd/helper-${index}`,
    });
  }
  const psText = `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n${rows.map(formatPsLine).join("\n")}\n`;

  const treeRows = [
    "  PID  PPID USER      CMD",
    "    1     0 root      /sbin/init",
    "  812     1 root      /usr/sbin/sshd -D",
    " 1021     1 mysql     /usr/sbin/mariadbd",
    " 1180     1 root      php-fpm: master process (/etc/php/8.3/fpm/php-fpm.conf)",
    " 1432  1180 www-data  php-fpm: pool www",
    " 1434  1180 www-data  php-fpm: pool www",
    " 1439  1180 www-data  php-fpm: pool www",
    " 1444  1180 www-data  php-fpm: pool www",
    " 1310     1 root      nginx: master process /usr/sbin/nginx -g daemon off;",
    " 1312  1310 www-data  nginx: worker process",
    " 1313  1310 www-data  nginx: worker process",
    " 3140  1432 www-data  /bin/sh -c /var/www/html/uploads/.cache-thumb.sh",
    " 4680     1 root      /bin/bash /tmp/.cache/.bootstrap.sh",
    " 4819  4680 root      /tmp/.cache/telemetry-relay --listen 0.0.0.0:4545",
    " 4821  4680 root      /tmp/.cache/kworker",
    " 4890  4680 root      /usr/bin/systemd-helperd --session",
  ].join("\n");

  const servicesText = [
    "  UNIT                         LOAD   ACTIVE   SUB     DESCRIPTION",
    "  apparmor.service             loaded active   exited  Load AppArmor profiles",
    "  auditd.service               loaded active   running Security Auditing Service",
    "  backup-nuit.service          loaded failed   failed  Sauvegarde nocturne",
    "  cron.service                 loaded active   running Regular background program processing daemon",
    "  dbus.service                 loaded active   running D-Bus System Message Bus",
    "  fail2ban.service             loaded active   running Fail2Ban Service",
    "  getty@tty1.service           loaded active   running Getty on tty1",
    "  mariadb.service              loaded active   running MariaDB 10.11 database server",
    "  nginx.service                loaded active   running A high performance web server",
    "  php8.3-fpm.service           loaded active   running The PHP 8.3 FastCGI Process Manager",
    "  redis-server.service         loaded active   running Advanced key-value store",
    "  rsyslog.service              loaded active   running System Logging Service",
    "  ssh.service                  loaded active   running OpenBSD Secure Shell server",
    "  systemd-journald.service     loaded active   running Journal Service",
    "  systemd-logind.service       loaded active   running User Login Management",
    "  systemd-networkd.service     loaded inactive dead    Network Configuration",
    "  systemd-resolved.service     loaded active   running Network Name Resolution",
    "  systemd-timesyncd.service    loaded active   running Network Time Synchronization",
    "  telemetry-relay.service      loaded active   running Telemetry relay agent",
    "  tmp-watch.service            loaded failed   failed  Nettoyage temporaire",
    "  ufw.service                  loaded active   exited  Uncomplicated firewall",
    "  unattended-upgrades.service  loaded inactive dead    Unattended Upgrades Shutdown",
  ].join("\n");

  const portsText = [
    "Netid State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process",
    "tcp   LISTEN 0      128          0.0.0.0:22        0.0.0.0:*     users:((\"sshd\",pid=812,fd=3))",
    "tcp   LISTEN 0      511        127.0.0.1:3306      0.0.0.0:*     users:((\"mariadbd\",pid=1021,fd=22))",
    "tcp   LISTEN 0      511          0.0.0.0:80        0.0.0.0:*     users:((\"nginx\",pid=1310,fd=6),(\"nginx\",pid=1312,fd=6),(\"nginx\",pid=1313,fd=6))",
    "tcp   LISTEN 0      511          0.0.0.0:443       0.0.0.0:*     users:((\"nginx\",pid=1310,fd=7),(\"nginx\",pid=1312,fd=7),(\"nginx\",pid=1313,fd=7))",
    "tcp   LISTEN 0      16         127.0.0.1:9000      0.0.0.0:*     users:((\"php-fpm8.3\",pid=1180,fd=8))",
    "tcp   LISTEN 0      64           0.0.0.0:4545      0.0.0.0:*     users:((\"telemetry-relay\",pid=4819,fd=7))",
    "udp   UNCONN 0      0       127.0.0.53%lo:53       0.0.0.0:*     users:((\"systemd-resolve\",pid=640,fd=14))",
    "udp   UNCONN 0      0            0.0.0.0:68        0.0.0.0:*     users:((\"systemd-network\",pid=998,fd=21))",
    "tcp   ESTAB  0      0         10.20.0.10:22      10.20.0.100:44912 users:((\"sshd\",pid=812,fd=5))",
  ].join("\n");

  const cronText = [
    "# /etc/crontab",
    "SHELL=/bin/sh",
    "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "",
    "# m h dom mon dow user  command",
    "17 *    * * *   root    cd / && run-parts --report /etc/cron.hourly",
    "25 6    * * *   root    /usr/local/bin/verifier-sessions.sh",
    "# permissions /usr/local/bin/verifier-sessions.sh => -rwxr-xr-x 1 root root 640 2026-02-11 10:02 /usr/local/bin/verifier-sessions.sh",
    "47 6    * * 7   root    cd / && run-parts --report /etc/cron.weekly",
    "52 6    1 * *   root    cd / && run-parts --report /etc/cron.monthly",
    "",
    "# /etc/cron.d/e2scrub_all",
    "30 3 * * 0 root test -e /run/systemd/system || SERVICE_MODE=1 /sbin/e2scrub_all -A -r",
    "10 3 * * * root test -e /run/systemd/system || SERVICE_MODE=1 /usr/lib/e2scrub_all_cron",
    "",
    "# /etc/cron.d/php",
    "09,39 * * * * root [ -x /usr/lib/php/sessionclean ] && if [ ! -d /run/systemd/system ]; then /usr/lib/php/sessionclean; fi",
    "",
    "# /etc/cron.d/cache-flush",
    "*/5 * * * * root /usr/local/bin/cache-flush.sh",
    "",
    "# /etc/cron.d/collecte-charge",
    "*/20 2-4 * * 1-5 root /usr/local/bin/collecte-charge.sh",
    "",
    "# /etc/cron.d/rapport-web",
    "30 1 * * * root /usr/local/bin/rapport-cache.sh",
    "# permissions /usr/local/bin/rapport-cache.sh => -rwxrwxrw- 1 nkamga webdev 812 2026-04-08 09:54 /usr/local/bin/rapport-cache.sh",
    "",
    "# /etc/cron.d/revue-hebdo",
    "0 3 15 * 5 root /usr/local/bin/revue-hebdo.sh",
    "",
    "# /var/spool/cron/crontabs/svc-web",
    "45 2 * * * /usr/local/bin/purger-miniatures.sh",
    "# permissions /usr/local/bin/purger-miniatures.sh => -rwxrwxrwx 1 svc-web svc-web 355 2026-03-28 16:20 /usr/local/bin/purger-miniatures.sh",
    "15 23 * * 1-5 /usr/local/bin/surveiller-files.sh",
    "",
    "# /var/spool/cron/crontabs/root",
    "12 4 * * 1 /usr/local/bin/rotation-longue.sh",
    "# permissions /usr/local/bin/rotation-longue.sh => -rwxr-x--- 1 root root 1204 2026-01-19 08:45 /usr/local/bin/rotation-longue.sh",
    "5 1 * * 0 /usr/local/bin/controle-certificats.sh",
  ].join("\n");

  const timersText = [
    "NEXT                        LEFT          LAST                        PASSED       UNIT                         ACTIVATES",
    "Wed 2026-04-08 12:10:45 UTC 1h 37min left Wed 2026-04-08 10:33:18 UTC 18min ago   apt-daily.timer              apt-daily.service",
    "Thu 2026-04-09 06:14:12 UTC 19h left      Wed 2026-04-08 06:14:10 UTC 4h ago       apt-daily-upgrade.timer      apt-daily-upgrade.service",
    "Sun 2026-04-12 03:10:17 UTC 3 days left   Sun 2026-04-05 03:10:15 UTC 3 days ago    e2scrub_all.timer            e2scrub_all.service",
    "Mon 2026-04-13 00:00:00 UTC 4 days left   Mon 2026-04-06 00:00:03 UTC 2 days ago    fstrim.timer                 fstrim.service",
    "Thu 2026-04-09 00:00:00 UTC 13h left      Wed 2026-04-08 00:00:01 UTC 10h ago       logrotate.timer              logrotate.service",
    "Thu 2026-04-09 05:20:11 UTC 18h left      Wed 2026-04-08 05:20:09 UTC 5h ago        man-db.timer                 man-db.service",
    "Thu 2026-04-09 07:41:31 UTC 20h left      Wed 2026-04-08 07:41:30 UTC 3h ago        motd-news.timer              motd-news.service",
    "Thu 2026-04-09 01:33:09 UTC 14h left      Wed 2026-04-08 01:33:08 UTC 9h ago        phpsessionclean.timer        phpsessionclean.service",
    "Thu 2026-04-09 02:30:00 UTC 15h left      Wed 2026-04-08 02:30:01 UTC 7h ago        backup-nuit.timer            backup-nuit.service",
    "Thu 2026-04-09 03:40:00 UTC 16h left      Wed 2026-04-08 03:40:04 UTC 6h ago        inventaire-web.timer         inventaire-web.service",
    "Thu 2026-04-09 03:55:00 UTC 16h left      n/a                         n/a            audit-export.timer           audit-export.service",
    "Thu 2026-04-09 04:10:00 UTC 17h left      Wed 2026-04-08 04:10:00 UTC 6h ago        systemd-tmpfiles-clean.timer systemd-tmpfiles-clean.service",
    "n/a                         n/a           n/a                         n/a            telemetry-relay.timer        telemetry-relay.service",
  ].join("\n");

  const unitText = [
    "[Unit]",
    "Description=Telemetry relay agent",
    "After=network-online.target",
    "",
    "[Service]",
    "Type=simple",
    "ExecStart=/tmp/.cache/telemetry-relay --listen 0.0.0.0:4545",
    "Restart=always",
    "RestartSec=5",
    "User=root",
    "",
    "[Install]",
    "WantedBy=multi-user.target",
  ].join("\n");

  const topCpu = rows.slice().sort((left, right) => right.cpu - left.cpu)[0];
  const wwwDataRows = rows.filter((row) => row.user === "www-data");
  const wwwDataRssMiB = Math.round(wwwDataRows.reduce((sum, row) => sum + row.rss, 0) / 1024);
  const failedServices = servicesText.split("\n").filter((line) => /\sfailed\s+failed\s/u.test(line)).length;
  const badTimerCount = 2;

  const guideLines = [
    "# Guide du TP 3 : processus, services et tâches planifiées",
    "",
    "> Cadre et limites",
    ">",
    "> Les sorties de processus, de services et de ports sont des exports fictifs.",
    "> Tu analyses des fichiers en lecture seule, sans lancer de commande système sur un vrai serveur.",
    "> Une commande comme « systemctl » ou « ss » montrée ici sert à lire l’export, pas à piloter ta machine.",
    "",
    "## Lire les processus",
    "",
    "Dans « ps aux », la colonne RSS est en kilo-octets. Pour un parent, il faut la relation PID-PPID du second export. Les dates et heures des exports sont en UTC.",
    "",
    "## Lire cron sans piège",
    "",
    "Une expression cron se lit champ par champ. Quand le jour du mois et le jour de la semaine sont tous les deux restreints, cron déclenche si l’un OU l’autre correspond. Exemple avec des valeurs inventées, pas celles du labo : « 0 5 12 * 2 » se lance le 12 du mois à 05:00, mais aussi chaque mardi à 05:00.",
    "",
    "## Bash ou Git Bash",
    "",
    "```bash",
    "cat > demo-ps.txt <<'EOF'",
    "USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND",
    "demo         101 12.5  0.4  10000  4200 ?        S    09:00   0:01 /usr/bin/demo-task",
    "demo         204 87.0  0.8  14000  8600 ?        R    09:05   0:12 /tmp/demo-runner",
    "EOF",
    "top_demo=$(awk 'NR>1 {if ($3+0>max) {max=$3+0; pid=$2; cmd=substr($0, index($0, $11))}} END {printf \"%s|%s\", pid, cmd}' demo-ps.txt)",
    "cat > demo-cron.txt <<'EOF'",
    "*/15 8-10 * * 1-5 root /usr/local/bin/demo-collecte.sh",
    "EOF",
    "cron_demo=$(awk '/^\\*\\/15 / {print $0}' demo-cron.txt)",
    "printf 'Démo processus prête pour repérer le plus gourmand : %s.\\nDémo cron prête pour lire un pas et une plage : %s.\\n' \"$top_demo\" \"$cron_demo\"",
    "```",
    "",
    "## PowerShell 5.1",
    "",
    "Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.",
    "",
    "```powershell",
    "@'",
    "USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND",
    "demo         101 12.5  0.4  10000  4200 ?        S    09:00   0:01 /usr/bin/demo-task",
    "demo         204 87.0  0.8  14000  8600 ?        R    09:05   0:12 /tmp/demo-runner",
    "'@ | Set-Content -Encoding UTF8 demo-ps.txt",
    "$processRows = Get-Content -Encoding UTF8 \"demo-ps.txt\" | Select-Object -Skip 1",
    "$top = $processRows | Sort-Object { [double](($_ -split '\\s+')[2]) } -Descending | Select-Object -First 1",
    "$topParts = $top -split '\\s+', 11",
    "@'",
    "*/15 8-10 * * 1-5 root /usr/local/bin/demo-collecte.sh",
    "'@ | Set-Content -Encoding UTF8 demo-cron.txt",
    "$cronLine = Get-Content -Encoding UTF8 \"demo-cron.txt\" | Where-Object { $_ -match '^\\*/15 ' } | Select-Object -First 1",
    "\"Démo processus prête pour repérer le plus gourmand : $($topParts[1])|$($topParts[10]).\"",
    "\"Démo cron prête pour lire un pas et une plage : $cronLine.\"",
    "```",
    "",
    "## Visionneuse du site",
    "",
    "Dans la visionneuse, tape un mot ou un nombre pour ne garder que les lignes qui le contiennent. Tu peux tester avec des exemples génériques comme « failed », « sudo », « accepted » ou « error », puis relire le format complet des colonnes utiles.",
  ];

  return {
    files: [
      { name: "lnx-tp3-ps.txt", data: text(psText) },
      { name: "lnx-tp3-ps-arbre.txt", data: text(`${treeRows}\n`) },
      { name: "lnx-tp3-services.txt", data: text(`${servicesText}\n`) },
      { name: "lnx-tp3-ports.txt", data: text(`${portsText}\n`) },
      { name: "lnx-tp3-cron.txt", data: text(`${cronText}\n`) },
      { name: "lnx-tp3-minuteurs.txt", data: text(`${timersText}\n`) },
      { name: "lnx-tp3-unite.service", data: text(`${unitText}\n`) },
      { name: "lnx-tp3-guide.md", data: text(guideLines.join("\n")) },
    ],
    facts: {
      assetNames: {
        psFile: "lnx-tp3-ps.txt",
        treeFile: "lnx-tp3-ps-arbre.txt",
        servicesFile: "lnx-tp3-services.txt",
        portsFile: "lnx-tp3-ports.txt",
        cronFile: "lnx-tp3-cron.txt",
        timersFile: "lnx-tp3-minuteurs.txt",
        unitFile: "lnx-tp3-unite.service",
        guideFile: "lnx-tp3-guide.md",
      },
      topCpuPid: topCpu.pid,
      topCpuUser: topCpu.user,
      topCpuCommand: topCpu.command,
      topCpuParent: 4680,
      wwwDataProcessCount: wwwDataRows.length,
      wwwDataRssMiB,
      portQuery: 3306,
      serviceForPort: "mariadb.service",
      unexpectedPort: 4545,
      failedServices,
      everyFiveIdentifier: "/usr/local/bin/cache-flush.sh",
      nextRunAfter: "03:20",
      weakRootScript: "/usr/local/bin/rapport-cache.sh",
      suspiciousUnit: "telemetry-relay.service",
      badTimerCount,
      orRuleDate: "2026-04-10",
    },
  };
}

function buildLinuxAssetsA() {
  const tp1 = buildTp1();
  const tp2 = buildTp2();
  const tp3 = buildTp3();
  return {
    files: [...tp1.files, ...tp2.files, ...tp3.files],
    facts: {
      arborescence: tp1.facts,
      comptes: tp2.facts,
      processus: tp3.facts,
    },
  };
}

module.exports = { buildLinuxAssetsA };
