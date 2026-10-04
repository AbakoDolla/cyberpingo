const DAY_MS = 86400000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

function pad(value) {
  return String(value).padStart(2, "0");
}

function iso(date) {
  return new Date(date).toISOString();
}

function datePart(date) {
  const value = new Date(date);
  return `${pad(value.getUTCDate())}/${pad(value.getUTCMonth() + 1)}/${value.getUTCFullYear()} ${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`;
}

function syslogStamp(date) {
  const value = new Date(date + 3600000);
  return `${MONTHS[value.getUTCMonth()]} ${String(value.getUTCDate()).padStart(2, " ")} ${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`;
}

function nginxStamp(date) {
  const value = new Date(date);
  return `${pad(value.getUTCDate())}/${MONTHS[value.getUTCMonth()]}/${value.getUTCFullYear()}:${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())} +0000`;
}

function squidStamp(date) {
  return (date / 1000).toFixed(3);
}

function median(values) {
  const sorted = values.slice().sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function encodePowerShell(script) {
  return Buffer.from(script, "utf16le").toString("base64");
}

function buildTp1() {
  const rng = mulberry32(0x510a0001);
  const base = Date.parse("2026-05-19T07:00:00Z");

  const syslogEvents = [];
  const appEvents = [];
  const proxyRows = [];
  const accessRows = [];
  const rfcRows = [];

  const sshFailIps = ["203.0.113.40", "203.0.113.54", "203.0.113.77", "198.51.100.12", "198.51.100.88"];
  const syslogPrograms = ["systemd", "CRON", "sshd", "sudo", "kernel", "nginx"];
  const syslogMessages = {
    systemd: [
      "Started Daily apt download activities.",
      "Reached target Paths.",
      "Started Session c3 of user svc-resa.",
      "Listening on OpenSSH Server Socket.",
    ],
    CRON: [
      "(root) CMD (run-parts /etc/cron.hourly)",
      "(svc-sauvegarde) CMD (/usr/local/bin/export-reservations.sh)",
      "(www-data) CMD (/usr/local/bin/nettoyer-miniatures.sh)",
    ],
    sshd: [
      "Accepted publickey for ksow from 172.20.10.44 port 41128 ssh2: ED25519 SHA256:demo",
      "Accepted publickey for svc-resa from 172.20.20.15 port 42201 ssh2: ED25519 SHA256:sync",
      "Connection closed by authenticating user root 203.0.113.77 port 55218 [preauth]",
      "Connection closed by authenticating user root 203.0.113.77 port 55218 [preauth]",
    ],
    sudo: [
      "ksow : TTY=pts/0 ; PWD=/home/ksow ; USER=root ; COMMAND=/usr/bin/systemctl reload nginx",
      "ksow : TTY=pts/0 ; PWD=/home/ksow ; USER=root ; COMMAND=/usr/bin/journalctl -u nginx",
    ],
    kernel: [
      "audit: type=1400 apparmor=\"STATUS\" operation=\"profile_load\" profile=\"unconfined\"",
      "nf_conntrack: default automatic helper assignment has been turned off for security reasons",
    ],
    nginx: [
      "2026/05/19 08:31:11 [warn] 1432#1432: an upstream response is buffered to a temporary file",
      "2026/05/19 08:44:09 [error] 1432#1432: *418 upstream prematurely closed connection while reading response header from upstream",
    ],
  };

  for (let index = 0; index < 185; index += 1) {
    const program = syslogPrograms[Math.floor(rng() * syslogPrograms.length)];
    const messages = syslogMessages[program];
    const minuteOffset = index * 23 + Math.floor(rng() * 11);
    const stamp = base + minuteOffset * 1000;
    let message = messages[Math.floor(rng() * messages.length)];
    if (program === "sshd" && index % 7 === 0 && stamp >= Date.parse("2026-05-19T07:20:00Z")) {
      const ip = sshFailIps[index % sshFailIps.length];
      const user = ["admin", "support", "audit", "root", "demo"][index % 5];
      message = `Failed password for invalid user ${user} from ${ip} port ${52000 + index} ssh2`;
    }
    syslogEvents.push({ date: stamp, program, message });
  }

  const notableSyslog = [
    { date: Date.parse("2026-05-19T07:12:14Z"), program: "sshd", message: "Failed password for invalid user audit from 203.0.113.54 port 51214 ssh2" },
    { date: Date.parse("2026-05-19T07:12:40Z"), program: "sshd", message: "Failed password for invalid user admin from 198.51.100.12 port 51280 ssh2" },
    { date: Date.parse("2026-05-19T07:18:04Z"), program: "sshd", message: "Failed password for invalid user root from 203.0.113.77 port 51311 ssh2" },
    { date: Date.parse("2026-05-19T07:44:55Z"), program: "sshd", message: "Accepted publickey for ksow from 172.20.10.44 port 42218 ssh2: ED25519 SHA256:Kader" },
    { date: Date.parse("2026-05-19T08:08:11Z"), program: "sudo", message: "ksow : TTY=pts/0 ; PWD=/home/ksow ; USER=root ; COMMAND=/usr/bin/systemctl restart php8.3-fpm" },
  ];
  syslogEvents.push(...notableSyslog);
  syslogEvents.sort((left, right) => left.date - right.date);

  const appUsers = ["msylla", "adiop", "jbouedraogo", "svc-resa", "svc-sauvegarde"];
  const appActions = ["reservation.search", "auth.login.failed", "auth.login.success", "booking.preview", "booking.sync"];
  for (let index = 0; index < 190; index += 1) {
    const date = base + index * 58000;
    const action = appActions[Math.floor(rng() * appActions.length)];
    const user = appUsers[Math.floor(rng() * appUsers.length)];
    const level = action === "auth.login.failed" && index % 5 === 0 ? "error" : ["info", "info", "warn", "error"][Math.floor(rng() * 4)];
    appEvents.push({
      ts: iso(date),
      level,
      requestId: `req-${String(3000 + index).padStart(4, "0")}`,
      action,
      user,
      sourceIp: ["172.20.10.14", "172.20.10.18", "203.0.113.54", "198.51.100.12"][index % 4],
      message: action === "auth.login.failed" ? "authentification refusée" : "événement normal",
    });
  }
  const notableApp = [
    { ts: "2026-05-19T07:40:33Z", level: "error", requestId: "req-2042", action: "booking.preview", user: "msylla", sourceIp: "172.20.10.14", message: "erreur de prévisualisation sur une chambre" },
    { ts: "2026-05-19T07:12:16Z", level: "error", requestId: "req-ssh-01", action: "auth.login.failed", user: "msylla", sourceIp: "203.0.113.54", message: "mot de passe incorrect" },
    { ts: "2026-05-19T07:13:20Z", level: "error", requestId: "req-ssh-02", action: "auth.login.failed", user: "msylla", sourceIp: "198.51.100.12", message: "mot de passe incorrect" },
    { ts: "2026-05-19T07:15:09Z", level: "error", requestId: "req-ssh-03", action: "auth.login.failed", user: "msylla", sourceIp: "203.0.113.77", message: "mot de passe incorrect" },
    { ts: "2026-05-19T07:16:02Z", level: "error", requestId: "req-ssh-04", action: "auth.login.failed", user: "msylla", sourceIp: "203.0.113.40", message: "mot de passe incorrect" },
    { ts: "2026-05-19T07:18:33Z", level: "error", requestId: "req-ssh-05", action: "auth.login.failed", user: "adiop", sourceIp: "203.0.113.77", message: "mot de passe incorrect" },
  ];
  appEvents.push(...notableApp);
  appEvents.sort((left, right) => left.ts.localeCompare(right.ts));

  const proxyClients = ["172.20.10.14", "172.20.10.18", "172.20.10.23", "172.20.10.31", "172.20.10.44"];
  for (let index = 0; index < 175; index += 1) {
    const date = base + index * 47000;
    const clientIp = proxyClients[index % proxyClients.length];
    const result = index % 13 === 0 ? "TCP_DENIED/403" : index % 11 === 0 ? "TCP_MISS/500" : "TCP_MISS/200";
    const url = result === "TCP_DENIED/403"
      ? `http://portail-interne.example/secret-${(index % 4) + 1}.pdf`
      : result === "TCP_MISS/500"
        ? "http://api.palmier-or.example/etat"
        : ["http://www.palmier-or.example/", "http://www.palmier-or.example/chambres", "http://partenaire.example/tarifs"][index % 3];
    proxyRows.push({
      date: datePart(date),
      clientIp,
      method: result === "TCP_DENIED/403" ? "CONNECT" : ["GET", "GET", "POST"][index % 3],
      url,
      result,
      status: result === "TCP_MISS/500" ? 500 : result === "TCP_DENIED/403" ? 403 : 200,
      bytes: result === "TCP_DENIED/403" ? 310 + (index % 7) * 21 : 1800 + (index % 9) * 330,
      user: ["-", "-", "msylla", "adiop"][index % 4],
    });
  }
  const notableProxy = [
    { date: "19/05/2026 07:27:11", clientIp: "172.20.10.31", method: "CONNECT", url: "http://coffre.example/interdit", result: "TCP_DENIED/403", status: 403, bytes: 512, user: "-" },
    { date: "19/05/2026 07:28:22", clientIp: "172.20.10.31", method: "CONNECT", url: "http://coffre.example/interdit", result: "TCP_DENIED/403", status: 403, bytes: 498, user: "-" },
    { date: "19/05/2026 07:29:16", clientIp: "172.20.10.31", method: "CONNECT", url: "http://coffre.example/interdit", result: "TCP_DENIED/403", status: 403, bytes: 504, user: "-" },
    { date: "19/05/2026 07:30:05", clientIp: "172.20.10.31", method: "CONNECT", url: "http://coffre.example/interdit", result: "TCP_DENIED/403", status: 403, bytes: 509, user: "-" },
    { date: "19/05/2026 07:31:18", clientIp: "172.20.10.31", method: "CONNECT", url: "http://coffre.example/interdit", result: "TCP_DENIED/403", status: 403, bytes: 495, user: "-" },
    { date: "19/05/2026 07:32:27", clientIp: "172.20.10.31", method: "CONNECT", url: "http://coffre.example/interdit", result: "TCP_DENIED/403", status: 403, bytes: 521, user: "-" },
  ];
  proxyRows.push(...notableProxy);
  proxyRows.sort((left, right) => `${left.date}|${left.clientIp}`.localeCompare(`${right.date}|${right.clientIp}`));

  const accessIps = ["203.0.113.77", "203.0.113.45", "198.51.100.12", "198.51.100.20", "172.20.20.10"];
  const accessAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0",
    "Mozilla/5.0 (X11; Linux x86_64) Firefox/126.0",
    "python-requests/2.31.0",
    "curl/8.7.1",
    "Mozilla/5.0 (Linux; Android 14) Mobile Safari/537.36",
  ];
  const accessPaths = [
    "/",
    "/chambres",
    "/reservation",
    "/api/disponibilites",
    "/espace-client",
    "/favicon.ico",
    "/images/logo.png",
  ];
  for (let index = 0; index < 245; index += 1) {
    const date = base + index * 19000;
    const ip = accessIps[index % accessIps.length];
    let path = accessPaths[Math.floor(rng() * accessPaths.length)];
    let status = 200;
    let method = "GET";
    let bytes = 1200 + (index % 17) * 111;
    let agent = accessAgents[index % accessAgents.length];
    if (index % 15 === 0) {
      status = 404;
      path = ["/admin/backup.sql", "/admin/login.php", "/uploads/test.php"][index % 3];
      bytes = 712;
      agent = accessAgents[2];
    } else if (index % 18 === 0) {
      status = 500;
      path = "/api/disponibilites";
      bytes = 321;
    } else if (index % 22 === 0) {
      status = 502;
      path = "/api/disponibilites";
      bytes = 415;
    } else if (index % 11 === 0) {
      method = "POST";
      path = "/reservation";
      bytes = 214;
    }
    accessRows.push({ date, ip, method, path, status, bytes, agent, referer: "-" });
  }
  const peakStart = Date.parse("2026-05-19T08:37:00Z");
  for (let index = 0; index < 12; index += 1) {
    accessRows.push({
      date: peakStart + index * 3200,
      ip: index % 2 === 0 ? "203.0.113.77" : "198.51.100.20",
      method: "GET",
      path: index < 4 ? "/admin/backup.sql" : "/chambres",
      status: index < 4 ? 404 : 200,
      bytes: index < 4 ? 702 : 2210 + index * 10,
      agent: index < 5 ? "python-requests/2.31.0" : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0",
      referer: "-",
    });
  }
  accessRows.push({
    date: Date.parse("2026-05-19T07:42:33Z"),
    ip: "172.20.20.10",
    method: "GET",
    path: "/api/disponibilites?rid=req-2042",
    status: 500,
    bytes: 302,
    agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0",
    referer: "https://www.palmier-or.example/reservation",
  });
  accessRows.push({
    date: Date.parse("2026-05-19T08:11:11Z"),
    ip: "203.0.113.77",
    method: "GET",
    path: "/chambres",
    status: 200,
    bytes: 2480,
    agent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/126.0",
    referer: "-",
  });
  accessRows.push({
    date: Date.parse("2026-05-19T08:11:19Z"),
    ip: "203.0.113.77",
    method: "GET",
    path: "/reservation",
    status: 200,
    bytes: 2520,
    agent: "Mozilla/5.0 (X11; Linux x86_64) Firefox/126.0",
    referer: "https://www.palmier-or.example/chambres",
  });
  accessRows.sort((left, right) => left.date - right.date);

  rfcRows.push(
    "<34>1 2026-05-19T07:02:11Z srv-reservation01 sshd 2140 auth-crit - password database unavailable",
    "<30>1 2026-05-19T07:06:15Z srv-reservation01 app-api 881 auth-warn - login latency higher than baseline",
    "<46>1 2026-05-19T07:10:05Z proxy01 squid 1104 proxy-info - connect cache warmup complete",
    "<13>1 2026-05-19T07:14:44Z dns01 dnsmasq 612 dns-notice - upstream switched to resolver-b",
    "<23>1 2026-05-19T07:19:30Z srv-reservation01 booking-api 1408 app-error - room lock retry failed",
    "<38>1 2026-05-19T07:24:55Z srv-reservation01 scheduler 220 cron-info - import run finished",
    "<11>1 2026-05-19T07:29:01Z srv-reservation01 kernel 0 kernel-error - nf_conntrack table close to limit",
    "<26>1 2026-05-19T07:33:40Z srv-reservation01 php-fpm 1601 app-critical - payment bridge unavailable",
    "<45>1 2026-05-19T07:38:09Z proxy01 squid 1104 proxy-notice - acl maintenance window closed",
    "<54>1 2026-05-19T07:42:10Z srv-reservation01 booking-api 1408 local0-critical - drift marker for correlation",
    "<22>1 2026-05-19T07:46:17Z srv-reservation01 sshd 2455 auth-critical - repeated password failure threshold reached",
    "<31>1 2026-05-19T07:51:51Z srv-reservation01 booking-api 1408 local3-error - seat map backend timeout"
  );

  const syslogText = `${syslogEvents.map((entry) => `${syslogStamp(entry.date)} srv-reservation01 ${entry.program}${entry.program === "sshd" ? `[${2100 + (entry.date % 97)}]` : entry.program === "CRON" ? `[${300 + (entry.date % 51)}]` : ""}: ${entry.message}`).join("\n")}\n`;
  const appText = `${appEvents.map((entry) => JSON.stringify(entry)).join("\n")}\n`;
  const proxyText = `HorodatageUtc;ClientIp;Methode;Url;Decision;CodeHttp;Octets;Utilisateur\n${proxyRows.map((row) => [row.date, row.clientIp, row.method, row.url, row.result, row.status, row.bytes, row.user].join(";")).join("\n")}\n`;
  const accessText = `${accessRows.map((row) => `${row.ip} - - [${nginxStamp(row.date)}] "${row.method} ${row.path} HTTP/1.1" ${row.status} ${row.bytes} "${row.referer}" "${row.agent}"`).join("\n")}\n`;
  const rfcText = `${rfcRows.join("\n")}\n`;

  const syslogSshdCount = syslogEvents.filter((entry) => entry.program === "sshd").length;
  const firstSshFailureUtc = "07:12:14";
  const appErrorCount = appEvents.filter((entry) => entry.level === "error").length;
  const failedByUser = new Map();
  for (const entry of appEvents.filter((item) => item.action === "auth.login.failed")) failedByUser.set(entry.user, (failedByUser.get(entry.user) ?? 0) + 1);
  const topFailedUser = [...failedByUser.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
  const proxyDeniedBytes = proxyRows.filter((row) => row.result === "TCP_DENIED/403").reduce((sum, row) => sum + row.bytes, 0);
  const topProxyDeniedClient = [...proxyRows.filter((row) => row.result === "TCP_DENIED/403").reduce((map, row) => map.set(row.clientIp, (map.get(row.clientIp) ?? 0) + 1), new Map()).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
  const topAccessIp = [...accessRows.reduce((map, row) => map.set(row.ip, (map.get(row.ip) ?? 0) + 1), new Map()).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
  const status5xxCount = accessRows.filter((row) => row.status >= 500 && row.status < 600).length;
  const top404Path = [...accessRows.filter((row) => row.status === 404).reduce((map, row) => map.set(row.path, (map.get(row.path) ?? 0) + 1), new Map()).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
  const peakMinute = [...accessRows.reduce((map, row) => {
    const value = new Date(row.date);
    const key = `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`;
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map()).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
  const distinctSshSourceIps = new Set(syslogEvents.filter((entry) => entry.program === "sshd" && /^Failed password/u.test(entry.message)).map((entry) => / from ([^ ]+)/u.exec(entry.message)[1])).size;
  const pythonRequestsCount = accessRows.filter((row) => row.agent.toLowerCase().includes("python-requests")).length;

  const guideLines = [
    "# Guide du TP 1 : lire, normaliser et dater des journaux de formats différents",
    "",
    "> Cadre et limites",
    ">",
    "> Toutes les données de ce laboratoire sont fictives et figées.",
    "> Tu travailles sur des exports en lecture seule.",
    "> Ne lance jamais une commande de démonstration sur un système qui ne t’appartient pas.",
    "",
    "## Reconnaître un format",
    "",
    "- Un syslog traditionnel ressemble à « Mar 10 08:15:00 hôte programme: message » : il n’a ni année ni fuseau.",
    "- Un fichier JSON lignes contient un objet JSON par ligne.",
    "- Un journal web nginx combined met la requête entre guillemets et le code juste après.",
    "- Un journal RFC 5424 commence par « <PRI>1 » et porte un horodatage complet en UTC.",
    "",
    "## Aligner les heures en UTC",
    "",
    "Quand l’énoncé dit qu’un syslog est écrit en UTC+01:00, retranche une heure pour le comparer à un journal déjà en UTC. Fais toujours ce calcul avant de compter ou d’ordonner des événements.",
    "",
    "## Bash ou Git Bash",
    "",
    "```bash",
    "cat > demo-syslog.log <<'EOF'",
    "Nov 02 09:01:05 demo-host sshd[101]: Failed password for invalid user test from 198.51.100.9 port 51011 ssh2",
    "Nov 02 09:02:15 demo-host sshd[102]: Failed password for invalid user test from 198.51.100.9 port 51021 ssh2",
    "Nov 02 09:03:55 demo-host cron[201]: (root) CMD (run-parts /etc/cron.hourly)",
    "EOF",
    "sshd_demo=$(grep -c ' sshd' demo-syslog.log)",
    "cat > demo-app.jsonl <<'EOF'",
    "{\"ts\":\"2025-11-02T08:01:00Z\",\"level\":\"error\",\"user\":\"awa\",\"action\":\"auth.login.failed\"}",
    "{\"ts\":\"2025-11-02T08:02:00Z\",\"level\":\"info\",\"user\":\"awa\",\"action\":\"booking.view\"}",
    "EOF",
    "errors_demo=$(grep -c '\"level\":\"error\"' demo-app.jsonl)",
    "printf 'Démo syslog prête pour compter un programme : %s ligne(s).\\nDémo JSON prête pour compter un niveau : %s ligne(s).\\n' \"$sshd_demo\" \"$errors_demo\"",
    "```",
    "",
    "## PowerShell 5.1",
    "",
    "Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.",
    "",
    "```powershell",
    "@'",
    "Nov 02 09:01:05 demo-host sshd[101]: Failed password for invalid user test from 198.51.100.9 port 51011 ssh2",
    "Nov 02 09:02:15 demo-host sshd[102]: Failed password for invalid user test from 198.51.100.9 port 51021 ssh2",
    "Nov 02 09:03:55 demo-host cron[201]: (root) CMD (run-parts /etc/cron.hourly)",
    "'@ | Set-Content -Encoding UTF8 demo-syslog.log",
    "$syslogDemo = Get-Content -Encoding UTF8 \"demo-syslog.log\"",
    "$sshdDemo = @($syslogDemo | Where-Object { $_ -match ' sshd\\[' }).Count",
    "@'",
    "{\"ts\":\"2025-11-02T08:01:00Z\",\"level\":\"error\",\"user\":\"awa\",\"action\":\"auth.login.failed\"}",
    "{\"ts\":\"2025-11-02T08:02:00Z\",\"level\":\"info\",\"user\":\"awa\",\"action\":\"booking.view\"}",
    "'@ | Set-Content -Encoding UTF8 demo-app.jsonl",
    "$errorDemo = @(Get-Content -Encoding UTF8 \"demo-app.jsonl\" | Where-Object { $_ -match '\"level\":\"error\"' }).Count",
    "\"Démo syslog prête pour compter un programme : $sshdDemo ligne(s).\"",
    "\"Démo JSON prête pour compter un niveau : $errorDemo ligne(s).\"",
    "```",
    "",
    "## Visionneuse du site",
    "",
    "Dans la visionneuse, filtre d’abord sur des mots génériques comme « error », « failed », « accepted » ou « 404 », puis relis les colonnes utiles sans sauter l’horodatage ni le fuseau.",
  ];

  return {
    files: [
      { name: "slg-tp1-syslog.log", data: text(syslogText) },
      { name: "slg-tp1-application.jsonl", data: text(appText) },
      { name: "slg-tp1-export-proxy.csv", data: text(proxyText) },
      { name: "slg-tp1-acces.log", data: text(accessText) },
      { name: "slg-tp1-rfc5424.log", data: text(rfcText) },
      { name: "slg-tp1-guide.md", data: text(guideLines.join("\n")) },
    ],
    facts: {
      assetNames: {
        syslogFile: "slg-tp1-syslog.log",
        appFile: "slg-tp1-application.jsonl",
        proxyFile: "slg-tp1-export-proxy.csv",
        accessFile: "slg-tp1-acces.log",
        rfcFile: "slg-tp1-rfc5424.log",
        guideFile: "slg-tp1-guide.md",
      },
      syslogSshdCount,
      firstSshFailureUtc,
      priGravityLetter: "c",
      appErrorCount,
      topFailedUser,
      proxyDeniedBytes,
      topAccessIp,
      status5xxCount,
      top404Path,
      peakMinute,
      residualDriftMinutes: 2,
      distinctSshSourceIps,
      pythonRequestsCount,
      priSourceLetter: "d",
      topProxyDeniedClient,
    },
  };
}

function buildTp2() {
  const rng = mulberry32(0x510a0002);
  const base = Date.parse("2026-05-21T06:30:00Z");

  const security = [];
  const sysmon = [];
  const powershell = [];

  const headers = [
    "TimeCreatedUtc",
    "EventId",
    "Computer",
    "TargetUserName",
    "TargetDomainName",
    "LogonType",
    "IpAddress",
    "Status",
    "SubStatus",
    "SubjectUserName",
    "GroupName",
    "NewProcessName",
    "ParentProcessName",
  ];

  const addSecurity = (row) => security.push(row);

  const normalUsers = ["msylla", "adiop", "jbouedraogo", "ksow"];
  for (let index = 0; index < 420; index += 1) {
    const date = base + index * 51000;
    const eventId = [4624, 4624, 4634, 4672, 4688, 4625, 4624, 4624, 4648, 4624][index % 10];
    const computer = index % 3 === 0 ? "pc-compta01" : index % 3 === 1 ? "pc-reception01" : "pc-direction01";
    const user = normalUsers[index % normalUsers.length];
    const logonType = eventId === 4625 || eventId === 4624 ? [2, 3, 5, 10][index % 4] : "";
    addSecurity({
      TimeCreatedUtc: iso(date),
      EventId: String(eventId),
      Computer: computer,
      TargetUserName: user,
      TargetDomainName: "PALMIER-OR",
      LogonType: logonType === "" ? "" : String(logonType),
      IpAddress: logonType === 10 ? `203.0.113.${20 + (index % 9)}` : logonType === 3 ? `172.20.20.${10 + (index % 4)}` : "-",
      Status: eventId === 4625 ? "0xC000006D" : "",
      SubStatus: eventId === 4625 ? (index % 5 === 0 ? "0xC000006A" : "0xC0000064") : "",
      SubjectUserName: eventId === 4732 ? "Administrateur" : eventId === 4720 ? "ksow" : eventId === 4688 ? user : eventId === 4672 ? user : "-",
      GroupName: "",
      NewProcessName: eventId === 4688 ? ["C:\\Windows\\System32\\cmd.exe", "C:\\Windows\\System32\\conhost.exe", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"][index % 3] : "",
      ParentProcessName: eventId === 4688 ? ["C:\\Windows\\explorer.exe", "C:\\Windows\\System32\\services.exe"][index % 2] : "",
    });
  }

  const sprayIps = ["203.0.113.61", "203.0.113.62", "198.51.100.44"];
  const sprayUsers = ["adiop", "msylla", "jbouedraogo", "svc-sauvegarde"];
  let cursor = Date.parse("2026-05-21T07:04:00Z");
  for (const ip of sprayIps) {
    for (const user of sprayUsers) {
      addSecurity({
        TimeCreatedUtc: iso(cursor),
        EventId: "4625",
        Computer: "pc-compta01",
        TargetUserName: user,
        TargetDomainName: "PALMIER-OR",
        LogonType: "10",
        IpAddress: ip,
        Status: "0xC000006D",
        SubStatus: "0xC000006A",
        SubjectUserName: "-",
        GroupName: "",
        NewProcessName: "",
        ParentProcessName: "",
      });
      cursor += 17000;
    }
  }

  addSecurity({
    TimeCreatedUtc: "2026-05-21T07:21:43Z",
    EventId: "4624",
    Computer: "pc-compta01",
    TargetUserName: "adiop",
    TargetDomainName: "PALMIER-OR",
    LogonType: "10",
    IpAddress: "203.0.113.62",
    Status: "",
    SubStatus: "",
    SubjectUserName: "-",
    GroupName: "",
    NewProcessName: "",
    ParentProcessName: "",
  });
  addSecurity({
    TimeCreatedUtc: "2026-05-21T07:21:44Z",
    EventId: "4672",
    Computer: "pc-compta01",
    TargetUserName: "adiop",
    TargetDomainName: "PALMIER-OR",
    LogonType: "",
    IpAddress: "-",
    Status: "",
    SubStatus: "",
    SubjectUserName: "adiop",
    GroupName: "",
    NewProcessName: "",
    ParentProcessName: "",
  });
  addSecurity({
    TimeCreatedUtc: "2026-05-21T07:22:02Z",
    EventId: "4688",
    Computer: "pc-compta01",
    TargetUserName: "adiop",
    TargetDomainName: "PALMIER-OR",
    LogonType: "",
    IpAddress: "-",
    Status: "",
    SubStatus: "",
    SubjectUserName: "adiop",
    GroupName: "",
    NewProcessName: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    ParentProcessName: "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
  });
  addSecurity({
    TimeCreatedUtc: "2026-05-21T07:24:18Z",
    EventId: "4720",
    Computer: "pc-compta01",
    TargetUserName: "audit-temp",
    TargetDomainName: "PALMIER-OR",
    LogonType: "",
    IpAddress: "-",
    Status: "",
    SubStatus: "",
    SubjectUserName: "ksow",
    GroupName: "",
    NewProcessName: "",
    ParentProcessName: "",
  });
  addSecurity({
    TimeCreatedUtc: "2026-05-21T07:24:51Z",
    EventId: "4732",
    Computer: "pc-compta01",
    TargetUserName: "audit-temp",
    TargetDomainName: "PALMIER-OR",
    LogonType: "",
    IpAddress: "-",
    Status: "",
    SubStatus: "",
    SubjectUserName: "ksow",
    GroupName: "Backup Operators",
    NewProcessName: "",
    ParentProcessName: "",
  });
  addSecurity({
    TimeCreatedUtc: "2026-05-21T07:25:10Z",
    EventId: "4740",
    Computer: "pc-reception01",
    TargetUserName: "msylla",
    TargetDomainName: "PALMIER-OR",
    LogonType: "",
    IpAddress: "203.0.113.61",
    Status: "",
    SubStatus: "",
    SubjectUserName: "-",
    GroupName: "",
    NewProcessName: "",
    ParentProcessName: "",
  });
  addSecurity({
    TimeCreatedUtc: "2026-05-21T07:25:41Z",
    EventId: "4740",
    Computer: "pc-compta01",
    TargetUserName: "adiop",
    TargetDomainName: "PALMIER-OR",
    LogonType: "",
    IpAddress: "203.0.113.62",
    Status: "",
    SubStatus: "",
    SubjectUserName: "-",
    GroupName: "",
    NewProcessName: "",
    ParentProcessName: "",
  });
  addSecurity({
    TimeCreatedUtc: "2026-05-21T07:38:11Z",
    EventId: "1102",
    Computer: "pc-compta01",
    TargetUserName: "",
    TargetDomainName: "PALMIER-OR",
    LogonType: "",
    IpAddress: "-",
    Status: "",
    SubStatus: "",
    SubjectUserName: "adiop",
    GroupName: "",
    NewProcessName: "",
    ParentProcessName: "",
  });

  for (let index = 0; index < 8; index += 1) {
    addSecurity({
      TimeCreatedUtc: iso(Date.parse("2026-05-21T06:50:00Z") + index * 600000),
      EventId: "4624",
      Computer: index % 2 === 0 ? "pc-reception01" : "pc-compta01",
      TargetUserName: "svc-sauvegarde",
      TargetDomainName: "PALMIER-OR",
      LogonType: index < 5 ? "4" : "5",
      IpAddress: "-",
      Status: "",
      SubStatus: "",
      SubjectUserName: "-",
      GroupName: "",
      NewProcessName: "",
      ParentProcessName: "",
    });
  }

  ["pc-reception01", "pc-direction01", "pc-compta01"].forEach((computer, index) => {
    for (let turn = 0; turn < 3; turn += 1) {
      addSecurity({
        TimeCreatedUtc: iso(Date.parse("2026-05-21T06:42:00Z") + index * 360000 + turn * 45000),
        EventId: "4624",
        Computer: computer,
        TargetUserName: "svc-resa",
        TargetDomainName: "PALMIER-OR",
        LogonType: "3",
        IpAddress: `172.20.20.${21 + index}`,
        Status: "",
        SubStatus: "",
        SubjectUserName: "-",
        GroupName: "",
        NewProcessName: "",
        ParentProcessName: "",
      });
    }
  });

  security.sort((left, right) => left.TimeCreatedUtc.localeCompare(right.TimeCreatedUtc) || Number(left.EventId) - Number(right.EventId));

  const addSysmon = (entry) => sysmon.push(entry);
  for (let index = 0; index < 210; index += 1) {
    const date = base + index * 62000;
    const eventId = [1, 3, 22, 11][index % 4];
    if (eventId === 1) {
      addSysmon({
        EventId: 1,
        TimeCreatedUtc: iso(date),
        Computer: index % 2 === 0 ? "pc-reception01" : "pc-compta01",
        User: index % 2 === 0 ? "PALMIER-OR\\msylla" : "PALMIER-OR\\adiop",
        Image: ["C:\\Windows\\System32\\cmd.exe", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"][index % 3],
        CommandLine: ["cmd.exe /c whoami", "\"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe\" --type=utility", "powershell.exe -nop -w hidden"][index % 3],
        ParentImage: ["C:\\Windows\\explorer.exe", "C:\\Windows\\System32\\services.exe"][index % 2],
        ParentCommandLine: "",
        ProcessGuid: `{11111111-0000-0000-0000-${String(1000 + index).padStart(12, "0")}}`,
      });
    } else if (eventId === 3) {
      addSysmon({
        EventId: 3,
        TimeCreatedUtc: iso(date),
        Computer: index % 2 === 0 ? "pc-reception01" : "pc-compta01",
        User: index % 2 === 0 ? "PALMIER-OR\\msylla" : "PALMIER-OR\\adiop",
        Image: ["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", "C:\\Windows\\System32\\svchost.exe", "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe"][index % 3],
        DestinationIp: `198.51.100.${20 + (index % 7)}`,
        DestinationPort: index % 3 === 0 ? 443 : 80,
        ProcessGuid: `{22222222-0000-0000-0000-${String(1000 + index).padStart(12, "0")}}`,
      });
    } else if (eventId === 22) {
      addSysmon({
        EventId: 22,
        TimeCreatedUtc: iso(date),
        Computer: index % 2 === 0 ? "pc-reception01" : "pc-compta01",
        User: index % 2 === 0 ? "PALMIER-OR\\msylla" : "PALMIER-OR\\adiop",
        Image: "C:\\Windows\\System32\\svchost.exe",
        QueryName: ["updates.vendor.example", "cdn.office-cache.example", "telemetrie-portail.example"][index % 3],
        QueryStatus: "0",
        ProcessGuid: `{33333333-0000-0000-0000-${String(1000 + index).padStart(12, "0")}}`,
      });
    } else {
      addSysmon({
        EventId: 11,
        TimeCreatedUtc: iso(date),
        Computer: "pc-compta01",
        User: "PALMIER-OR\\adiop",
        Image: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
        TargetFilename: `C:\\Users\\adiop\\AppData\\Local\\Temp\\rapport-${index}.tmp`,
        ProcessGuid: `{44444444-0000-0000-0000-${String(1000 + index).padStart(12, "0")}}`,
      });
    }
  }

  addSysmon({
    EventId: 1,
    TimeCreatedUtc: "2026-05-21T07:22:03Z",
    Computer: "pc-compta01",
    User: "PALMIER-OR\\adiop",
    Image: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    CommandLine: "powershell.exe -nop -w hidden -enc SQBuAHYAbwBrAGUALQBXAGUAYgBSAGUAcQB1AGUAcwB0AA==",
    ParentImage: "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
    ParentCommandLine: "\"C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE\" C:\\Users\\adiop\\Downloads\\facture.docm",
    ProcessGuid: "{AAAAAAA1-0000-0000-0000-000000000111}",
  });
  addSysmon({
    EventId: 22,
    TimeCreatedUtc: "2026-05-21T07:22:05Z",
    Computer: "pc-compta01",
    User: "PALMIER-OR\\adiop",
    Image: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    QueryName: "cdn-miseajour-cache.example",
    QueryStatus: "0",
    ProcessGuid: "{AAAAAAA1-0000-0000-0000-000000000111}",
  });
  addSysmon({
    EventId: 3,
    TimeCreatedUtc: "2026-05-21T07:22:08Z",
    Computer: "pc-compta01",
    User: "PALMIER-OR\\adiop",
    Image: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    DestinationIp: "203.0.113.88",
    DestinationPort: 443,
    ProcessGuid: "{AAAAAAA1-0000-0000-0000-000000000111}",
  });
  addSysmon({
    EventId: 11,
    TimeCreatedUtc: "2026-05-21T07:22:09Z",
    Computer: "pc-compta01",
    User: "PALMIER-OR\\adiop",
    Image: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    TargetFilename: "C:\\Users\\adiop\\AppData\\Local\\Temp\\maj-sync.txt",
    ProcessGuid: "{AAAAAAA1-0000-0000-0000-000000000111}",
  });

  sysmon.sort((left, right) => left.TimeCreatedUtc.localeCompare(right.TimeCreatedUtc) || left.EventId - right.EventId);

  const encodedDomain = "telemetrie-catalogue.example";
  const encodedScript = `Invoke-WebRequest -UseBasicParsing -Uri "https://${encodedDomain}/ping.txt" -OutFile "$env:TEMP\\ping.txt"`;
  const encodedCommand = encodePowerShell(encodedScript);
  for (let index = 0; index < 60; index += 1) {
    const date = base + index * 66000;
    powershell.push({
      EventId: 4104,
      TimeCreatedUtc: iso(date),
      Computer: index % 2 === 0 ? "pc-reception01" : "pc-compta01",
      User: index % 2 === 0 ? "PALMIER-OR\\msylla" : "PALMIER-OR\\adiop",
      ScriptBlockText: [
        'Get-ChildItem "C:\\Users\\Public"',
        'Get-Date | Out-File "$env:TEMP\\horloge.txt"',
        'Get-Service | Where-Object { $_.Status -eq "Running" }',
      ][index % 3],
    });
  }
  powershell.push({
    EventId: 4104,
    TimeCreatedUtc: "2026-05-21T07:22:04Z",
    Computer: "pc-compta01",
    User: "PALMIER-OR\\adiop",
    ScriptBlockText: `powershell.exe -NoProfile -WindowStyle Hidden -EncodedCommand ${encodedCommand}`,
  });
  powershell.sort((left, right) => left.TimeCreatedUtc.localeCompare(right.TimeCreatedUtc));

  const securityText = `${headers.join(";")}\n${security.map((row) => headers.map((key) => row[key] ?? "").join(";")).join("\n")}\n`;
  const sysmonText = `${sysmon.map((entry) => JSON.stringify(entry)).join("\n")}\n`;
  const powershellText = `${powershell.map((entry) => JSON.stringify(entry)).join("\n")}\n`;

  const top4625Account = [...security.filter((row) => row.EventId === "4625").reduce((map, row) => map.set(row.TargetUserName, (map.get(row.TargetUserName) ?? 0) + 1), new Map()).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
  const lockedAccountsCount = new Set(security.filter((row) => row.EventId === "4740").map((row) => row.TargetUserName)).size;
  const svcSauvegardeType = [...security.filter((row) => row.TargetUserName === "svc-sauvegarde" && row.EventId === "4624").reduce((map, row) => map.set(row.LogonType, (map.get(row.LogonType) ?? 0) + 1), new Map()).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
  const svcResaType3Computers = new Set(security.filter((row) => row.TargetUserName === "svc-resa" && row.EventId === "4624" && row.LogonType === "3").map((row) => row.Computer)).size;

  const guideLines = [
    "# Guide du TP 2 : journaux Windows : sessions, comptes et PowerShell",
    "",
    "> Cadre et limites",
    ">",
    "> Toutes les données de ce laboratoire sont fictives et figées.",
    "> Tu analyses des exports en lecture seule.",
    "> Ne lance jamais une commande PowerShell venue d’un journal sans l’avoir comprise et sans autorisation.",
    "",
    "## Repères utiles",
    "",
    "- 4624 = ouverture de session réussie, 4625 = échec, 4720 = compte créé, 4732 = membre ajouté à un groupe, 4740 = compte verrouillé, 1102 = journal effacé.",
    "- Types de session utiles : 2 interactive locale, 3 réseau, 4 batch, 5 service, 10 session distante.",
    "- SousStatus fréquents pour 4625 : 0xC0000064 nom d’utilisateur inexistant, 0xC000006A bon identifiant mais mot de passe incorrect, 0xC0000234 compte verrouillé.",
    "- Une commande après « -EncodedCommand » est en Base64 UTF-16LE.",
    "",
    "## Bash ou Git Bash",
    "",
    "```bash",
    "cat > demo-securite.csv <<'EOF'",
    "TimeCreatedUtc;EventId;Computer;TargetUserName;LogonType;IpAddress;SubStatus",
    "2025-11-03T08:01:00Z;4625;pc-demo01;awa;10;198.51.100.9;0xC000006A",
    "2025-11-03T08:02:00Z;4624;pc-demo01;awa;10;198.51.100.9;",
    "EOF",
    "fail_demo=$(awk -F';' 'NR>1 && $2==4625 {n++} END{print n+0}' demo-securite.csv)",
    "cat > demo-powershell.jsonl <<'EOF'",
    "{\"EventId\":4104,\"ScriptBlockText\":\"powershell.exe -EncodedCommand QQB3AGEA\"}",
    "EOF",
    "ps_demo=$(grep -c 'EncodedCommand' demo-powershell.jsonl)",
    "printf 'Démo sécurité prête pour compter un type d’événement : %s ligne(s).\\nDémo PowerShell prête pour repérer une commande encodée : %s ligne(s).\\n' \"$fail_demo\" \"$ps_demo\"",
    "```",
    "",
    "## PowerShell 5.1",
    "",
    "Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.",
    "",
    "```powershell",
    "@'",
    "TimeCreatedUtc;EventId;Computer;TargetUserName;LogonType;IpAddress;SubStatus",
    "2025-11-03T08:01:00Z;4625;pc-demo01;awa;10;198.51.100.9;0xC000006A",
    "2025-11-03T08:02:00Z;4624;pc-demo01;awa;10;198.51.100.9;",
    "'@ | Set-Content -Encoding UTF8 demo-securite.csv",
    "$demoRows = Import-Csv \"demo-securite.csv\" -Delimiter ';'",
    "$failDemo = @($demoRows | Where-Object { $_.EventId -eq '4625' }).Count",
    "@'",
    "{\"EventId\":4104,\"ScriptBlockText\":\"powershell.exe -EncodedCommand QQB3AGEA\"}",
    "'@ | Set-Content -Encoding UTF8 demo-powershell.jsonl",
    "$encodedDemo = @(Get-Content -Encoding UTF8 \"demo-powershell.jsonl\" | Where-Object { $_ -match 'EncodedCommand' }).Count",
    "\"Démo sécurité prête pour compter un type d’événement : $failDemo ligne(s).\"",
    "\"Démo PowerShell prête pour repérer une commande encodée : $encodedDemo ligne(s).\"",
    "```",
    "",
    "## Visionneuse du site",
    "",
    "Dans la visionneuse, filtre d’abord sur des mots génériques comme « 4625 », « powershell », « dns » ou « 1102 », puis relis le contexte complet de chaque ligne retenue.",
  ];

  return {
    files: [
      { name: "slg-tp2-securite.csv", data: text(securityText) },
      { name: "slg-tp2-sysmon.jsonl", data: text(sysmonText) },
      { name: "slg-tp2-powershell.jsonl", data: text(powershellText) },
      { name: "slg-tp2-guide.md", data: text(guideLines.join("\n")) },
    ],
    facts: {
      assetNames: {
        securityFile: "slg-tp2-securite.csv",
        sysmonFile: "slg-tp2-sysmon.jsonl",
        powershellFile: "slg-tp2-powershell.jsonl",
        guideFile: "slg-tp2-guide.md",
      },
      top4625Account,
      subStatusLetter: "b",
      spraySourceCount: sprayIps.length,
      firstSuccessfulRdpUtc: "07:21:43",
      createdAccount: "audit-temp",
      createdGroup: "backup operators",
      lockedAccountsCount,
      clearLogTimeUtc: "07:38:11",
      suspiciousParentImage: "c:\\program files\\microsoft office\\root\\office16\\winword.exe",
      suspiciousDestination: "203.0.113.88:443",
      suspiciousQueryDomain: "cdn-miseajour-cache.example",
      decodedDomain: encodedDomain,
      svcSauvegardeTopLogonType: svcSauvegardeType,
      svcResaType3Computers,
      chronologyLetter: "c",
    },
  };
}

function buildTp3() {
  const rng = mulberry32(0x510a0003);
  const base = Date.parse("2026-05-22T12:00:00Z");

  const firewall = [];
  const dns = [];
  const proxy = [];

  const internalHosts = ["172.20.10.14", "172.20.10.18", "172.20.10.23", "172.20.10.25", "172.20.10.44"];
  const externalHosts = ["203.0.113.45", "203.0.113.77", "198.51.100.31", "198.51.100.44", "203.0.113.88"];
  const servicePorts = [22, 80, 443, 8443, 3306, 3389, 8080, 25];

  for (let index = 0; index < 680; index += 1) {
    const date = base + index * 9000;
    const src = index % 8 === 0 ? "203.0.113.77" : index % 13 === 0 ? "172.20.10.44" : internalHosts[index % internalHosts.length];
    const dst = src === "203.0.113.77" ? "198.51.100.24" : externalHosts[index % externalHosts.length];
    const dpt = src === "203.0.113.77" ? servicePorts[index % servicePorts.length] : (index % 10 === 0 ? 8443 : [80, 443, 53, 443, 80][index % 5]);
    const proto = dpt === 53 ? "UDP" : "TCP";
    const action = src === "203.0.113.77" ? "BLOCK" : index % 19 === 0 ? "ALLOW" : index % 3 === 0 ? "ALLOW" : "BLOCK";
    firewall.push({
      date,
      action,
      src,
      dst,
      proto,
      spt: 40000 + (index % 2000),
      dpt,
      flags: proto === "TCP" ? (action === "ALLOW" ? "ACK" : "SYN") : "",
    });
  }

  const scannerPorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995, 1433, 1521, 3306, 3389, 8080];
  scannerPorts.forEach((port, index) => {
    firewall.push({
      date: Date.parse("2026-05-22T12:11:00Z") + index * 4000,
      action: "BLOCK",
      src: "203.0.113.77",
      dst: "198.51.100.24",
      proto: "TCP",
      spt: 50000 + index,
      dpt: port,
      flags: "SYN",
    });
  });
  firewall.push({
    date: Date.parse("2026-05-22T13:05:10Z"),
    action: "ALLOW",
    src: "172.20.10.23",
    dst: "203.0.113.45",
    proto: "TCP",
    spt: 51110,
    dpt: 8443,
    flags: "SYN",
  });
  firewall.sort((left, right) => left.date - right.date);

  // Le bruit est irrégulier (décalage aléatoire par ligne) et ne touche jamais le domaine du balisage :
  // seul le balisage garde exactement le même écart entre deux requêtes.
  const dnsDomains = [
    "portail.palmier-or.example",
    "maj-inventaire.example",
    "planning.palmier-or.example",
    "pool-check.sync-anchor.example",
    "cdn-miseajour-legitime.example",
  ];
  for (let index = 0; index < 430; index += 1) {
    const date = base + index * 14000 + Math.floor(rng() * 36) * 1000;
    const client = internalHosts[index % internalHosts.length];
    const type = index % 17 === 0 ? "TXT" : "A";
    const domain = dnsDomains[index % dnsDomains.length];
    dns.push({ date, kind: "query", type, domain, client });
    dns.push({
      date: date + 600,
      kind: "reply",
      type,
      domain,
      client,
      answer: domain === "pool-check.sync-anchor.example" && index % 5 !== 0 ? "NXDOMAIN" : `203.0.113.${30 + (index % 7)}`,
    });
  }

  const beaconTimes = [];
  let beaconCursor = Date.parse("2026-05-22T13:05:12Z");
  for (let index = 0; index < 9; index += 1) {
    beaconTimes.push(beaconCursor);
    dns.push({ date: beaconCursor, kind: "query", type: index % 3 === 0 ? "TXT" : "A", domain: "cdn-rendezvous.sync-check.example", client: "172.20.10.23" });
    dns.push({ date: beaconCursor + 500, kind: "reply", type: index % 3 === 0 ? "TXT" : "A", domain: "cdn-rendezvous.sync-check.example", client: "172.20.10.23", answer: "203.0.113.45" });
    beaconCursor += 420000;
  }
  const legitCursorStart = Date.parse("2026-05-22T12:20:00Z");
  for (let index = 0; index < 7; index += 1) {
    const date = legitCursorStart + index * 900000;
    dns.push({ date, kind: "query", type: "A", domain: "cdn-miseajour-legitime.example", client: "172.20.10.25" });
    dns.push({ date: date + 400, kind: "reply", type: "A", domain: "cdn-miseajour-legitime.example", client: "172.20.10.25", answer: "198.51.100.31" });
  }
  dns.sort((left, right) => left.date - right.date || left.kind.localeCompare(right.kind));

  for (let index = 0; index < 560; index += 1) {
    const date = base + index * 11000 + Math.floor(rng() * 30) * 1000;
    const client = internalHosts[index % internalHosts.length];
    const method = index % 7 === 0 ? "CONNECT" : "GET";
    const url = method === "CONNECT"
      ? ["https://portail.palmier-or.example:443", "https://cdn-miseajour-legitime.example:443", "https://telemetrie-edr.example:443"][index % 3]
      : ["http://portail.palmier-or.example/", "http://partenaire-tarifs.example/planning.csv", "http://maj-inventaire.example/ping"][index % 3];
    const result = index % 16 === 0 ? "TCP_DENIED/403" : index % 9 === 0 ? "TCP_REFRESH_UNMODIFIED/304" : "TCP_MISS/200";
    proxy.push({
      date,
      duration: 110 + (index % 15) * 17,
      client,
      result,
      status: result.includes("/403") ? 403 : result.includes("/304") ? 304 : 200,
      bytes: result.includes("/403") ? 420 : 2800 + (index % 19) * 260,
      method,
      url,
      hierarchy: result.includes("/403") ? "NONE/-" : `HIER_DIRECT/${externalHosts[index % externalHosts.length]}`,
      mime: method === "CONNECT" ? "-" : ["text/html", "application/json", "application/octet-stream"][index % 3],
    });
  }
  let proxyBeacon = Date.parse("2026-05-22T13:05:13Z");
  for (let index = 0; index < 9; index += 1) {
    proxy.push({
      date: proxyBeacon,
      duration: 188,
      client: "172.20.10.23",
      result: "TCP_MISS/200",
      status: 200,
      bytes: 4820 + index * 35,
      method: "GET",
      url: `http://cdn-rendezvous.sync-check.example/pixel.gif?step=${index + 1}`,
      hierarchy: "HIER_DIRECT/203.0.113.45",
      mime: "image/gif",
    });
    proxyBeacon += 420000;
  }
  let proxyLegit = Date.parse("2026-05-22T12:20:05Z");
  for (let index = 0; index < 7; index += 1) {
    proxy.push({
      date: proxyLegit,
      duration: 520,
      client: "172.20.10.25",
      result: "TCP_MISS/200",
      status: 200,
      bytes: 812000 + index * 2500,
      method: "GET",
      url: "http://cdn-miseajour-legitime.example/pack-win32.bin",
      hierarchy: "HIER_DIRECT/198.51.100.31",
      mime: "application/octet-stream",
    });
    proxyLegit += 900000;
  }
  proxy.push({
    date: Date.parse("2026-05-22T13:18:41Z"),
    duration: 140,
    client: "172.20.10.25",
    result: "TCP_DENIED/403",
    status: 403,
    bytes: 420,
    method: "CONNECT",
    url: "https://console-interdit.example:443",
    hierarchy: "NONE/-",
    mime: "-",
  });
  proxy.push({
    date: Date.parse("2026-05-22T13:19:12Z"),
    duration: 145,
    client: "172.20.10.25",
    result: "TCP_DENIED/403",
    status: 403,
    bytes: 420,
    method: "CONNECT",
    url: "https://console-interdit.example:443",
    hierarchy: "NONE/-",
    mime: "-",
  });
  proxy.sort((left, right) => left.date - right.date);

  const firewallText = `${firewall.map((entry) => `${MONTHS[new Date(entry.date).getUTCMonth()]} ${String(new Date(entry.date).getUTCDate()).padStart(2, " ")} ${pad(new Date(entry.date).getUTCHours())}:${pad(new Date(entry.date).getUTCMinutes())}:${pad(new Date(entry.date).getUTCSeconds())} fw-palmier01 kernel: [UFW ${entry.action}] IN=eth0 OUT= MAC=00:16:3e:00:10:${pad(entry.dpt % 99)} SRC=${entry.src} DST=${entry.dst} LEN=60 TOS=0x00 PREC=0x00 TTL=51 ID=${40000 + (entry.date % 1000)} PROTO=${entry.proto} SPT=${entry.spt} DPT=${entry.dpt}${entry.flags ? ` ${entry.flags}` : ""}`).join("\n")}\n`;
  const dnsText = `${dns.map((entry) => {
    const stamp = `${MONTHS[new Date(entry.date).getUTCMonth()]} ${String(new Date(entry.date).getUTCDate()).padStart(2, " ")} ${pad(new Date(entry.date).getUTCHours())}:${pad(new Date(entry.date).getUTCMinutes())}:${pad(new Date(entry.date).getUTCSeconds())}`;
    if (entry.kind === "query") return `${stamp} dns01 dnsmasq[612]: query[${entry.type}] ${entry.domain} from ${entry.client}`;
    return `${stamp} dns01 dnsmasq[612]: reply ${entry.domain} is ${entry.answer}`;
  }).join("\n")}\n`;
  const proxyText = `${proxy.map((entry) => `${squidStamp(entry.date)} ${String(entry.duration).padStart(6, " ")} ${entry.client} ${entry.result} ${entry.bytes} ${entry.method} ${entry.url} - ${entry.hierarchy} ${entry.mime}`).join("\n")}\n`;

  const topScannerIp = "203.0.113.77";
  const topScannerPortCount = scannerPorts.length;
  const topScannerPort = "22";
  const topNxDomain = [...dns.filter((entry) => entry.kind === "reply" && entry.answer === "NXDOMAIN").reduce((map, entry) => map.set(entry.domain, (map.get(entry.domain) ?? 0) + 1), new Map()).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
  const longestQueryLength = dns.filter((entry) => entry.kind === "query").reduce((max, entry) => Math.max(max, entry.domain.length), 0);
  const beaconIntervals = beaconTimes.slice(1).map((value, index) => Math.round((value - beaconTimes[index]) / 1000));
  const beaconBytes = proxy.filter((entry) => entry.client === "172.20.10.23" && entry.url.includes("cdn-rendezvous.sync-check.example")).reduce((sum, entry) => sum + entry.bytes, 0);
  const topTxtClient = [...dns.filter((entry) => entry.kind === "query" && entry.type === "TXT").reduce((map, entry) => map.set(entry.client, (map.get(entry.client) ?? 0) + 1), new Map()).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
  const deniedCounts = [...proxy.filter((entry) => entry.result === "TCP_DENIED/403").reduce((map, entry) => map.set(entry.client, (map.get(entry.client) ?? 0) + 1), new Map()).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));

  const guideLines = [
    "# Guide du TP 3 : pare-feu, DNS et proxy : trouver la machine qui balise",
    "",
    "> Cadre et limites",
    ">",
    "> Toutes les données de ce laboratoire sont fictives et figées.",
    "> Tu analyses des exports en lecture seule.",
    "> Ne lance jamais un test réseau actif contre un système réel sans autorisation explicite.",
    "",
    "## Lire les trois sources",
    "",
    "- Le pare-feu raconte qui parle à qui et sur quel port.",
    "- Le DNS montre quels noms sont cherchés et si la réponse existe.",
    "- Le proxy mesure qui sort, vers quelle URL et avec combien d’octets.",
    "",
    "## Indices généraux",
    "",
    "- Un balayage de ports combine une même source et beaucoup de ports de destination différents sur un temps court.",
    "- Un balisage se voit par des intervalles très réguliers vers le même domaine ou la même URL.",
    "- Un service légitime périodique n’est pas automatiquement suspect : compare sa régularité et son volume à ceux des autres sources.",
    "",
    "## Bash ou Git Bash",
    "",
    "```bash",
    "cat > demo-dns.log <<'EOF'",
    "Nov 04 09:00:01 dns-demo dnsmasq[612]: query[A] demo-sync.example from 172.16.5.10",
    "Nov 04 09:00:01 dns-demo dnsmasq[612]: reply demo-sync.example is 198.51.100.7",
    "Nov 04 09:07:01 dns-demo dnsmasq[612]: query[A] demo-sync.example from 172.16.5.10",
    "Nov 04 09:07:01 dns-demo dnsmasq[612]: reply demo-sync.example is 198.51.100.7",
    "EOF",
    "queries_demo=$(grep -c 'query\\[A\\]' demo-dns.log)",
    "cat > demo-proxy.log <<'EOF'",
    "1762246800.000    188 172.16.5.10 TCP_MISS/200 4200 GET http://demo-sync.example/pixel.gif - HIER_DIRECT/198.51.100.7 image/gif",
    "1762247220.000    190 172.16.5.10 TCP_MISS/200 4300 GET http://demo-sync.example/pixel.gif - HIER_DIRECT/198.51.100.7 image/gif",
    "EOF",
    "bytes_demo=$(awk '$7 ~ /demo-sync.example/ {sum += $5} END {print sum+0}' demo-proxy.log)",
    "printf 'Démo DNS prête pour compter des requêtes : %s ligne(s).\\nDémo proxy prête pour sommer des octets : %s octets.\\n' \"$queries_demo\" \"$bytes_demo\"",
    "```",
    "",
    "## PowerShell 5.1",
    "",
    "Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.",
    "",
    "```powershell",
    "@'",
    "Nov 04 09:00:01 dns-demo dnsmasq[612]: query[A] demo-sync.example from 172.16.5.10",
    "Nov 04 09:00:01 dns-demo dnsmasq[612]: reply demo-sync.example is 198.51.100.7",
    "Nov 04 09:07:01 dns-demo dnsmasq[612]: query[A] demo-sync.example from 172.16.5.10",
    "Nov 04 09:07:01 dns-demo dnsmasq[612]: reply demo-sync.example is 198.51.100.7",
    "'@ | Set-Content -Encoding UTF8 demo-dns.log",
    "$dnsDemo = Get-Content -Encoding UTF8 \"demo-dns.log\"",
    "$queryDemo = ($dnsDemo | Where-Object { $_ -match 'query\\[A\\]' }).Count",
    "@'",
    "1762246800.000    188 172.16.5.10 TCP_MISS/200 4200 GET http://demo-sync.example/pixel.gif - HIER_DIRECT/198.51.100.7 image/gif",
    "1762247220.000    190 172.16.5.10 TCP_MISS/200 4300 GET http://demo-sync.example/pixel.gif - HIER_DIRECT/198.51.100.7 image/gif",
    "'@ | Set-Content -Encoding UTF8 demo-proxy.log",
    "$sumDemo = 0",
    "Get-Content -Encoding UTF8 \"demo-proxy.log\" | ForEach-Object {",
    "  $parts = $_ -split '\\s+'",
    "  if ($parts[6] -match 'demo-sync\\.example') { $sumDemo += [int]$parts[4] }",
    "}",
    "\"Démo DNS prête pour compter des requêtes : $queryDemo ligne(s).\"",
    "\"Démo proxy prête pour sommer des octets : $sumDemo octets.\"",
    "```",
    "",
    "## Visionneuse du site",
    "",
    "Dans la visionneuse, filtre d’abord sur des mots génériques comme « query », « NXDOMAIN », « TCP_DENIED » ou « UFW BLOCK », puis relis la ligne entière pour garder l’adresse, le port et le domaine ensemble.",
  ];

  return {
    files: [
      { name: "slg-tp3-pare-feu.log", data: text(firewallText) },
      { name: "slg-tp3-dns.log", data: text(dnsText) },
      { name: "slg-tp3-proxy.log", data: text(proxyText) },
      { name: "slg-tp3-guide.md", data: text(guideLines.join("\n")) },
    ],
    facts: {
      assetNames: {
        firewallFile: "slg-tp3-pare-feu.log",
        dnsFile: "slg-tp3-dns.log",
        proxyFile: "slg-tp3-proxy.log",
        guideFile: "slg-tp3-guide.md",
      },
      topScannerIp,
      topScannerPortCount,
      topScannerPort,
      firstUnexpectedAllowDestination: "203.0.113.45",
      firstUnexpectedAllowPort: "8443",
      beaconClient: "172.20.10.23",
      beaconMedianSeconds: median(beaconIntervals),
      topNxDomain,
      longestQueryLength,
      beaconBytes,
      topTxtClient,
      topDeniedClient: deniedCounts[0][0],
      topDeniedClientCount: deniedCounts[0][1],
      legitVsBeaconLetter: "b",
      isolateLetter: "d",
    },
  };
}

function buildLogsAssetsA() {
  const tp1 = buildTp1();
  const tp2 = buildTp2();
  const tp3 = buildTp3();
  return {
    files: [...tp1.files, ...tp2.files, ...tp3.files],
    facts: {
      formatsTemps: tp1.facts,
      windows: tp2.facts,
      reseau: tp3.facts,
    },
  };
}

module.exports = { buildLogsAssetsA };
