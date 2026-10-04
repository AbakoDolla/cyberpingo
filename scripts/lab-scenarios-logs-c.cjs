const minuteMs = 60 * 1000;
const dayMs = 24 * 60 * 60 * 1000;

const text = (value) => Buffer.from(value.replace(/\r?\n/g, "\n"), "utf8");

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

function iso(value) {
  return new Date(value).toISOString().replace(".000Z", "Z");
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

function squidStamp(isoValue) {
  return (Date.parse(isoValue) / 1000).toFixed(3);
}

function csv(headers, rows) {
  const esc = (value) => {
    const textValue = String(value ?? "");
    return /[;"\n]/.test(textValue) ? `"${textValue.replace(/"/g, "\"\"")}"` : textValue;
  };
  return `${headers.join(";")}\n${rows.map((row) => headers.map((header) => esc(row[header])).join(";")).join("\n")}\n`;
}

function authLine(isoValue, host, service, pid, message) {
  return { iso: isoValue, line: `${syslogStamp(isoValue)} ${host} ${service}[${pid}]: ${message}` };
}

function dnsLine(isoValue, host, pid, message) {
  return { iso: isoValue, line: `${syslogStamp(isoValue)} ${host} dnsmasq[${pid}]: ${message}` };
}

function accessLine(ip, isoValue, method, requestPath, status, bytes, referer, agent) {
  return {
    iso: isoValue,
    line: `${ip} - - [${nginxStamp(isoValue)}] "${method} ${requestPath} HTTP/1.1" ${status} ${bytes} "${referer}" "${agent}"`,
  };
}

function proxyLine(isoValue, clientIp, result, bytes, method, target, hierarchy) {
  return {
    iso: isoValue,
    line: `${squidStamp(isoValue)} ${String(200 + (Date.parse(isoValue) % 300)).padStart(5, " ")} ${clientIp} ${result} ${bytes} ${method} ${target} - ${hierarchy} -`,
  };
}

function asset(kind, title, description, name) {
  return { kind, title, description, url: `/labs/${name}` };
}

function roundHalfUp(value) {
  return Math.floor(value + 0.5);
}

function buildLogsAssetsC() {
  const rng = mulberry32(0x51c0ffee);
  const alertHost = "srv-reservation01";
  const serverIp = "172.20.20.10";
  const attackerIp = "198.51.100.77";
  const bruteForceIp = "203.0.113.25";
  const scan404Ip = "203.0.113.61";
  const c2Ip = "198.51.100.200";
  const c2Domain = "cache-sync.palmier-or.example";
  const inventoryDomain = "inventaire.palmier-or.example";
  const compromisedAccount = "svc-resa";
  const webshellPath = "/uploads/bon-commande.php";
  const uploadPath = "/espace-partenaires/upload.php";
  const firstIncidentIso = "2026-05-21T09:11:43Z";
  const firstWebshellIso = "2026-05-21T09:12:44Z";
  const sshSuccessIso = "2026-05-21T09:18:31Z";
  const dnsQueryIso = "2026-05-21T09:23:51Z";
  const proxyConnectIso = "2026-05-21T09:24:06Z";
  const egressIso = "2026-05-21T09:24:14Z";

  const files = [];

  const inventoryRows = [
    { Machine: "srv-reservation01", Role: "Application de réservation", Criticite: "4", Proprietaire: "Kader Sow" },
    { Machine: "fw-palmier01", Role: "Pare-feu et routeur", Criticite: "4", Proprietaire: "Kader Sow" },
    { Machine: "pc-compta01", Role: "Poste comptabilité", Criticite: "4", Proprietaire: "Aissatou Diop" },
    { Machine: "pc-reception01", Role: "Poste réception", Criticite: "3", Proprietaire: "Mariam Sylla" },
    { Machine: "pc-direction01", Role: "Poste direction", Criticite: "3", Proprietaire: "Jean-Baptiste Ouédraogo" },
    { Machine: "adm-pc02", Role: "Portable du prestataire", Criticite: "2", Proprietaire: "Kader Sow" },
    { Machine: "dns01", Role: "Résolveur DNS interne", Criticite: "2", Proprietaire: "Kader Sow" },
    { Machine: "proxy01", Role: "Mandataire web", Criticite: "2", Proprietaire: "Kader Sow" },
  ];

  const alertsRows = [
    { AlertId: "ALT-01", HorodatageUtc: "2026-05-18T07:12:41Z", Regle: "WIN-4625-repetition", Machine: "pc-compta01", GraviteAnnoncee: "2" },
    { AlertId: "ALT-02", HorodatageUtc: "2026-05-18T18:40:12Z", Regle: "PROXY-volume-maj", Machine: "pc-direction01", GraviteAnnoncee: "1" },
    { AlertId: "ALT-03", HorodatageUtc: "2026-05-19T02:15:03Z", Regle: "LNX-ssh-echec-repetition", Machine: "srv-reservation01", GraviteAnnoncee: "2" },
    { AlertId: "ALT-04", HorodatageUtc: firstWebshellIso, Regle: "WEB-upload-execution", Machine: "srv-reservation01", GraviteAnnoncee: "3" },
    { AlertId: "ALT-05", HorodatageUtc: sshSuccessIso, Regle: "LNX-ssh-succes-externe", Machine: "srv-reservation01", GraviteAnnoncee: "2" },
    { AlertId: "ALT-06", HorodatageUtc: egressIso, Regle: "FW-sortie-vers-destination-neuve", Machine: "srv-reservation01", GraviteAnnoncee: "4" },
    { AlertId: "ALT-07", HorodatageUtc: "2026-05-22T10:02:18Z", Regle: "DNS-burst-txt", Machine: "pc-reception01", GraviteAnnoncee: "2" },
    { AlertId: "ALT-08", HorodatageUtc: "2026-05-22T22:10:05Z", Regle: "WIN-powershell-encoded", Machine: "adm-pc02", GraviteAnnoncee: "2" },
    { AlertId: "ALT-09", HorodatageUtc: "2026-05-23T06:20:45Z", Regle: "PROXY-admin-download", Machine: "adm-pc02", GraviteAnnoncee: "1" },
    { AlertId: "ALT-10", HorodatageUtc: dnsQueryIso, Regle: "DNS-nouveau-domaine-critique", Machine: "srv-reservation01", GraviteAnnoncee: "3" },
    { AlertId: "ALT-11", HorodatageUtc: "2026-05-24T08:10:14Z", Regle: "WIN-connexion-reseau-hors-horaire", Machine: "pc-reception01", GraviteAnnoncee: "2" },
    { AlertId: "ALT-12", HorodatageUtc: "2026-05-24T12:45:39Z", Regle: "WEB-404-scan", Machine: "srv-reservation01", GraviteAnnoncee: "2" },
  ];

  files.push({ name: "slg-proj-alertes.csv", data: text(csv(["AlertId", "HorodatageUtc", "Regle", "Machine", "GraviteAnnoncee"], alertsRows)) });
  files.push({ name: "slg-proj-inventaire.csv", data: text(csv(["Machine", "Role", "Criticite", "Proprietaire"], inventoryRows)) });

  const authEvents = [];
  let pid = 900;
  for (let time = Date.parse("2026-05-18T00:00:00Z"); time <= Date.parse("2026-05-24T23:40:00Z"); time += 2 * 60 * minuteMs) {
    authEvents.push(authLine(iso(time), alertHost, "CRON", pid, "pam_unix(cron:session): session opened for user root(uid=0) by (uid=0)"));
    authEvents.push(authLine(iso(time + 4000), alertHost, "CRON", pid, "pam_unix(cron:session): session closed for user root"));
    pid += 1;
  }
  const legitSessions = [
    { user: "ksow", ip: "172.20.10.90", fingerprint: "ED25519 SHA256:4Yd1vKqP8n2M", times: ["2026-05-18T08:03:12Z", "2026-05-20T18:44:51Z", "2026-05-22T09:04:13Z", "2026-05-24T18:07:44Z"] },
    { user: "msylla", ip: "172.20.10.21", fingerprint: "ED25519 SHA256:7Qm3oLxP4r2N", times: ["2026-05-18T10:11:04Z", "2026-05-20T15:19:02Z", "2026-05-23T08:40:15Z"] },
    { user: "jbouedraogo", ip: "172.20.10.11", fingerprint: "RSA SHA256:P5j3mN0qL8xR", times: ["2026-05-19T06:55:21Z", "2026-05-22T06:52:08Z"] },
  ];
  let sshPid = 1400;
  for (const session of legitSessions) {
    for (const opened of session.times) {
      const openTime = Date.parse(opened);
      const port = 43000 + Math.floor(rng() * 7000);
      authEvents.push(authLine(opened, alertHost, "sshd", sshPid, `Accepted publickey for ${session.user} from ${session.ip} port ${port} ssh2: ${session.fingerprint}`));
      authEvents.push(authLine(iso(openTime + 1000), alertHost, "sshd", sshPid, `pam_unix(sshd:session): session opened for user ${session.user}(uid=${1000 + (sshPid % 17)}) by (uid=0)`));
      authEvents.push(authLine(iso(openTime + (20 + Math.floor(rng() * 15)) * minuteMs), alertHost, "sshd", sshPid, `pam_unix(sshd:session): session closed for user ${session.user}`));
      sshPid += 3;
    }
  }
  const bruteUsers = ["invalid user admin", "invalid user guest", "root", "invalid user support", "svc-resa", "invalid user backup", "root", "invalid user audit", "svc-resa"];
  let brutePid = 2100;
  let bruteTime = Date.parse("2026-05-19T02:15:03Z");
  for (const user of bruteUsers) {
    const port = 51000 + Math.floor(rng() * 3000);
    authEvents.push(authLine(iso(bruteTime), alertHost, "sshd", brutePid, `Failed password for ${user} from ${bruteForceIp} port ${port} ssh2`));
    if (user.startsWith("invalid user")) authEvents.push(authLine(iso(bruteTime + 1000), alertHost, "sshd", brutePid, `Invalid user ${user.replace("invalid user ", "")} from ${bruteForceIp} port ${port}`));
    bruteTime += 42 * 1000;
    brutePid += 1;
  }
  authEvents.push(authLine(sshSuccessIso, alertHost, "sshd", 3001, `Accepted password for ${compromisedAccount} from ${attackerIp} port 54412 ssh2`));
  authEvents.push(authLine("2026-05-21T09:18:34Z", alertHost, "sshd", 3001, `pam_unix(sshd:session): session opened for user ${compromisedAccount}(uid=995) by (uid=0)`));
  authEvents.push(authLine("2026-05-21T09:19:41Z", alertHost, "sudo", 3020, `${compromisedAccount} : TTY=pts/1 ; PWD=/var/www/resa ; USER=root ; COMMAND=/usr/bin/tee /etc/cron.d/resa-cache`));
  authEvents.push(authLine("2026-05-21T09:21:09Z", alertHost, "sudo", 3021, `${compromisedAccount} : TTY=pts/1 ; PWD=/var/www/resa ; USER=root ; COMMAND=/usr/sbin/useradd -m -s /bin/bash svc-planning`));
  authEvents.push(authLine("2026-05-21T09:21:10Z", alertHost, "useradd", 3022, "new user: name=svc-planning, UID=1008, GID=1008, home=/home/svc-planning, shell=/bin/bash"));
  authEvents.push(authLine("2026-05-21T09:21:44Z", alertHost, "sudo", 3025, `${compromisedAccount} : TTY=pts/1 ; PWD=/var/www/resa ; USER=root ; COMMAND=/usr/bin/chmod 755 /usr/local/bin/resa-cache-refresh.sh`));
  authEvents.push(authLine("2026-05-21T09:26:11Z", alertHost, "sshd", 3001, `pam_unix(sshd:session): session closed for user ${compromisedAccount}`));
  const authContent = authEvents.sort((left, right) => left.iso.localeCompare(right.iso)).map((entry) => entry.line).join("\n") + "\n";
  files.push({ name: "slg-proj-preuves-auth.log", data: text(authContent) });

  const windowsRows = [];
  const serviceAccounts = ["SYSTEM", "LOCAL SERVICE", "NETWORK SERVICE"];
  for (let day = 18; day <= 24; day += 1) {
    for (let index = 0; index < 18; index += 1) {
      const base = Date.parse(`2026-05-${String(day).padStart(2, "0")}T0${index % 9}:1${index % 6}:0${index % 5}Z`);
      windowsRows.push({
        TimeCreatedUtc: iso(base),
        Computer: pick(rng, ["pc-reception01", "pc-direction01", "pc-compta01"]),
        EventId: "4624",
        TargetUserName: pick(rng, ["msylla", "jbouedraogo", "adiop"]),
        LogonType: pick(rng, ["2", "3"]),
        IpAddress: pick(rng, ["172.20.10.21", "172.20.10.11", "172.20.10.31"]),
        Status: "0x0",
        SubStatus: "0x0",
        SubjectUserName: pick(rng, serviceAccounts),
        NewProcessName: "",
        ParentProcessName: "",
        CommandLine: "",
        GroupName: "",
      });
      windowsRows.push({
        TimeCreatedUtc: iso(base + 22000),
        Computer: pick(rng, ["pc-reception01", "pc-direction01", "pc-compta01"]),
        EventId: "4634",
        TargetUserName: pick(rng, ["msylla", "jbouedraogo", "adiop"]),
        LogonType: pick(rng, ["2", "3"]),
        IpAddress: "-",
        Status: "0x0",
        SubStatus: "0x0",
        SubjectUserName: pick(rng, serviceAccounts),
        NewProcessName: "",
        ParentProcessName: "",
        CommandLine: "",
        GroupName: "",
      });
    }
  }
  const mistypeBase = Date.parse("2026-05-18T07:12:41Z");
  for (let offset = 0; offset < 3; offset += 1) {
    windowsRows.push({
      TimeCreatedUtc: iso(mistypeBase + offset * 18000),
      Computer: "pc-compta01",
      EventId: "4625",
      TargetUserName: "adiop",
      LogonType: "3",
      IpAddress: "172.20.10.31",
      Status: "0xC000006A",
      SubStatus: "0xC000006A",
      SubjectUserName: "-",
      NewProcessName: "",
      ParentProcessName: "",
      CommandLine: "",
      GroupName: "",
    });
  }
  windowsRows.push({
    TimeCreatedUtc: "2026-05-18T07:13:29Z",
    Computer: "pc-compta01",
    EventId: "4624",
    TargetUserName: "adiop",
    LogonType: "3",
    IpAddress: "172.20.10.31",
    Status: "0x0",
    SubStatus: "0x0",
    SubjectUserName: "-",
    NewProcessName: "",
    ParentProcessName: "",
    CommandLine: "",
    GroupName: "",
  });
  windowsRows.push({
    TimeCreatedUtc: "2026-05-22T22:10:05Z",
    Computer: "adm-pc02",
    EventId: "4688",
    TargetUserName: "ksow",
    LogonType: "",
    IpAddress: "",
    Status: "",
    SubStatus: "",
    SubjectUserName: "ksow",
    NewProcessName: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    ParentProcessName: "C:\\Windows\\System32\\taskeng.exe",
    CommandLine: "powershell.exe -NoProfile -EncodedCommand UwBlAHQALQBJAHQAZQBtACAAQwA6AFwAQQBkAG0AaQBuAFwAaQBuAHYAZQBuAHQAbwByAHkALQBzAHkAbgBjAC4AcABzADEA",
    GroupName: "",
  });
  windowsRows.push({
    TimeCreatedUtc: "2026-05-22T22:10:12Z",
    Computer: "adm-pc02",
    EventId: "4688",
    TargetUserName: "ksow",
    LogonType: "",
    IpAddress: "",
    Status: "",
    SubStatus: "",
    SubjectUserName: "ksow",
    NewProcessName: "C:\\Windows\\System32\\curl.exe",
    ParentProcessName: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    CommandLine: "curl.exe https://inventaire.palmier-or.example/api/pull",
    GroupName: "",
  });
  windowsRows.push({
    TimeCreatedUtc: "2026-05-24T08:10:14Z",
    Computer: "pc-reception01",
    EventId: "4624",
    TargetUserName: "msylla",
    LogonType: "3",
    IpAddress: "172.20.10.60",
    Status: "0x0",
    SubStatus: "0x0",
    SubjectUserName: "-",
    NewProcessName: "",
    ParentProcessName: "",
    CommandLine: "",
    GroupName: "",
  });
  const windowsContent = csv(
    ["TimeCreatedUtc", "Computer", "EventId", "TargetUserName", "LogonType", "IpAddress", "Status", "SubStatus", "SubjectUserName", "NewProcessName", "ParentProcessName", "CommandLine", "GroupName"],
    windowsRows.sort((left, right) => left.TimeCreatedUtc.localeCompare(right.TimeCreatedUtc)),
  );
  files.push({ name: "slg-proj-preuves-windows.csv", data: text(windowsContent) });

  const webAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/136.0",
    "Mozilla/5.0 (X11; Linux x86_64) Firefox/138.0",
    "Mozilla/5.0 (Linux; Android 14) Chrome/135.0 Mobile",
  ];
  const webPages = [
    { method: "GET", path: "/", status: 301, bytes: 178, referer: "-", asset: false },
    { method: "GET", path: "/index.php", status: 200, bytes: 5402, referer: "-", asset: false },
    { method: "GET", path: "/espace-client/login.php", status: 200, bytes: 5114, referer: "https://www.palmier-or.example/", asset: false },
    { method: "POST", path: "/espace-client/login.php", status: 302, bytes: 186, referer: "https://www.palmier-or.example/espace-client/login.php", asset: false },
    { method: "GET", path: "/assets/site.css", status: 200, bytes: 4892, referer: "https://www.palmier-or.example/index.php", asset: true },
    { method: "GET", path: "/assets/app.js", status: 200, bytes: 11024, referer: "https://www.palmier-or.example/index.php", asset: true },
    { method: "GET", path: "/api/disponibilites", status: 200, bytes: 924, referer: "https://www.palmier-or.example/espace-client/login.php", asset: false },
    { method: "GET", path: "/mentions-legales.php", status: 200, bytes: 3611, referer: "https://www.palmier-or.example/", asset: false },
  ];
  const webVisitors = ["198.51.100.11", "198.51.100.19", "203.0.113.12", "203.0.113.16", "203.0.113.27", "172.20.10.21"];
  const webEvents = [];
  let webCursor = Date.parse("2026-05-18T00:00:00Z");
  while (webCursor <= Date.parse("2026-05-24T23:30:00Z")) {
    const page = pick(rng, webPages);
    webEvents.push(accessLine(pick(rng, webVisitors), iso(webCursor), page.method, page.path, page.status, page.bytes, page.referer, pick(rng, webAgents)));
    if (rng() > 0.83) {
      webEvents.push(accessLine(pick(rng, ["203.0.113.88", "198.51.100.44"]), iso(webCursor + 2000), "GET", pick(rng, ["/wp-login.php", "/.env", "/admin.php", "/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php"]), 404, 512, "-", "Mozilla/5.0 zgrab/0.x"));
    }
    webCursor += (35 + Math.floor(rng() * 16)) * minuteMs;
  }
  webEvents.push(accessLine(attackerIp, firstIncidentIso, "POST", uploadPath, 200, 342, "https://www.palmier-or.example/espace-partenaires/", "Mozilla/5.0 (X11; Linux x86_64) Firefox/138.0"));
  webEvents.push(accessLine(attackerIp, firstWebshellIso, "GET", `${webshellPath}?cmd=id`, 200, 82, "-", "Mozilla/5.0 (X11; Linux x86_64) Firefox/138.0"));
  webEvents.push(accessLine(attackerIp, "2026-05-21T09:13:05Z", "GET", `${webshellPath}?cmd=cat+/var/www/resa/.env`, 200, 412, "-", "Mozilla/5.0 (X11; Linux x86_64) Firefox/138.0"));
  webEvents.push(accessLine(attackerIp, "2026-05-21T09:13:46Z", "GET", `${webshellPath}?cmd=grep+DB_PASSWORD+/var/www/resa/.env`, 200, 98, "-", "Mozilla/5.0 (X11; Linux x86_64) Firefox/138.0"));
  for (const [offset, pathValue] of [[0, "/.env"], [22, "/wp-login.php"], [44, "/admin"], [66, "/backup.zip"], [88, "/server-status"], [110, "/boaform/admin/formLogin"]]) {
    webEvents.push(accessLine(scan404Ip, iso(Date.parse("2026-05-24T12:45:39Z") + offset * 1000), "GET", pathValue, 404, 512, "-", "Mozilla/5.0 zgrab/0.x"));
  }
  const webContent = webEvents.sort((left, right) => left.iso.localeCompare(right.iso)).map((entry) => entry.line).join("\n") + "\n";
  files.push({ name: "slg-proj-preuves-web.log", data: text(webContent) });

  const networkEvents = [];
  const networkTargets = ["22", "80", "443", "53"];
  let networkCursor = Date.parse("2026-05-18T00:04:00Z");
  while (networkCursor <= Date.parse("2026-05-24T23:50:00Z")) {
    const source = pick(rng, ["198.51.100.33", "203.0.113.99", "172.20.10.21", "172.20.10.11"]);
    const destination = source.startsWith("172.") ? pick(rng, ["198.51.100.10", "203.0.113.10"]) : serverIp;
    const direction = source.startsWith("172.") ? "OUT" : "IN";
    const action = source.startsWith("172.") ? (rng() > 0.15 ? "ALLOW" : "BLOCK") : "BLOCK";
    const dpt = source.startsWith("172.") ? pick(rng, ["53", "80", "443", "25"]) : pick(rng, networkTargets);
    networkEvents.push({
      iso: iso(networkCursor),
      line: `${iso(networkCursor)} fw-palmier01 ${action} ${direction}=edge SRC=${source} DST=${destination} PROTO=TCP SPT=${40000 + Math.floor(rng() * 1200)} DPT=${dpt}`,
    });
    networkCursor += (17 + Math.floor(rng() * 11)) * minuteMs;
  }
  networkEvents.push({ iso: egressIso, line: `${egressIso} fw-palmier01 ALLOW OUT=edge SRC=${serverIp} DST=${c2Ip} PROTO=TCP SPT=49882 DPT=8443` });
  networkEvents.push({ iso: "2026-05-21T09:24:49Z", line: `2026-05-21T09:24:49Z fw-palmier01 ALLOW OUT=edge SRC=${serverIp} DST=${c2Ip} PROTO=TCP SPT=49884 DPT=8443` });
  networkEvents.push({ iso: "2026-05-21T09:27:10Z", line: `2026-05-21T09:27:10Z fw-palmier01 ALLOW OUT=edge SRC=${serverIp} DST=${c2Ip} PROTO=TCP SPT=49901 DPT=8443` });
  const networkContent = networkEvents.sort((left, right) => left.iso.localeCompare(right.iso)).map((entry) => entry.line).join("\n") + "\n";
  files.push({ name: "slg-proj-preuves-reseau.log", data: text(networkContent) });

  const dnsEvents = [];
  let dnsPid = 2000;
  let dnsCursor = Date.parse("2026-05-18T00:01:00Z");
  const normalDomains = [
    "www.palmier-or.example",
    "smtp.palmier-or.example",
    "download.windowsupdate.example",
    "cdn.office.example",
    "maj-antivirus.example",
    "api.billetterie.example",
  ];
  const normalClients = ["172.20.10.21", "172.20.10.11", "172.20.10.31", serverIp];
  while (dnsCursor <= Date.parse("2026-05-24T23:55:00Z")) {
    const domain = pick(rng, normalDomains);
    const client = pick(rng, normalClients);
    const replyIp = client === serverIp && domain === "www.palmier-or.example" ? "172.20.20.10" : pick(rng, ["198.51.100.10", "198.51.100.20", "203.0.113.20"]);
    dnsEvents.push(dnsLine(iso(dnsCursor), "dns01", dnsPid, `query[A] ${domain} from ${client}`));
    dnsEvents.push(dnsLine(iso(dnsCursor + 1000), "dns01", dnsPid, `reply ${domain} is ${replyIp}`));
    dnsCursor += (90 + Math.floor(rng() * 21)) * minuteMs;
    dnsPid += 1;
  }
  dnsEvents.push(dnsLine(dnsQueryIso, "dns01", 2877, `query[A] ${c2Domain} from ${serverIp}`));
  dnsEvents.push(dnsLine("2026-05-21T09:23:52Z", "dns01", 2877, `reply ${c2Domain} is ${c2Ip}`));
  const dnsContent = dnsEvents.sort((left, right) => left.iso.localeCompare(right.iso)).map((entry) => entry.line).join("\n") + "\n";
  files.push({ name: "slg-proj-preuves-dns.log", data: text(dnsContent) });

  const proxyEvents = [];
  let proxyCursor = Date.parse("2026-05-18T00:02:00Z");
  const proxyClients = ["172.20.10.21", "172.20.10.11", "172.20.10.31", "172.20.10.90", serverIp];
  const proxyTargets = [
    "http://www.palmier-or.example/",
    "http://cdn.office.example/style.css",
    "https://download.windowsupdate.example/catalog.cab",
    "http://api.billetterie.example/status",
    "https://maj-antivirus.example/signatures.bin",
  ];
  while (proxyCursor <= Date.parse("2026-05-24T23:58:00Z")) {
    const target = pick(rng, proxyTargets);
    const client = pick(rng, proxyClients);
    const method = target.startsWith("https://") ? "CONNECT" : "GET";
    const result = method === "CONNECT" ? "TCP_TUNNEL/200" : pick(rng, ["TCP_MISS/200", "TCP_HIT/200", "TCP_MISS/304"]);
    const hierarchyTarget = target.startsWith("https://download.windowsupdate.example") ? "HIER_DIRECT/198.51.100.40" : "HIER_DIRECT/203.0.113.40";
    proxyEvents.push(proxyLine(iso(proxyCursor), client, result, 4000 + Math.floor(rng() * 14000), method, target.replace(/^https?:\/\//, method === "CONNECT" ? "" : "http://"), hierarchyTarget));
    proxyCursor += (22 + Math.floor(rng() * 13)) * minuteMs;
  }
  proxyEvents.push(proxyLine(proxyConnectIso, serverIp, "TCP_TUNNEL/200", 10240, "CONNECT", `${c2Domain}:8443`, `HIER_DIRECT/${c2Ip}`));
  proxyEvents.push(proxyLine("2026-05-21T09:24:48Z", serverIp, "TCP_TUNNEL/200", 8844, "CONNECT", `${c2Domain}:8443`, `HIER_DIRECT/${c2Ip}`));
  proxyEvents.push(proxyLine("2026-05-22T22:10:12Z", "172.20.10.90", "TCP_TUNNEL/200", 6422, "CONNECT", `${inventoryDomain}:443`, "HIER_DIRECT/198.51.100.55"));
  proxyEvents.push(proxyLine("2026-05-22T22:10:18Z", "172.20.10.90", "TCP_MISS/200", 811, "GET", `http://${inventoryDomain}/api/pull`, "HIER_DIRECT/198.51.100.55"));
  const proxyContent = proxyEvents.sort((left, right) => left.iso.localeCompare(right.iso)).map((entry) => entry.line).join("\n") + "\n";
  files.push({ name: "slg-proj-preuves-proxy.log", data: text(proxyContent) });

  const gridText = [
    "# Grille de triage SOC de la PME",
    "",
    "## Qualification",
    "",
    "- `vp` : vrai positif. L’alerte est confirmée par un fait direct dans une source, puis corroborée par au moins un deuxième fait dans une autre source.",
    "- `fp` : faux positif. L’alerte correspond à une activité explicitement attendue ci-dessous et aucune deuxième source ne montre un effet malveillant.",
    "- `sv` : à surveiller. Un fait suspect existe, mais le corpus ne montre ni action malveillante aboutie ni deuxième source de confirmation.",
    "",
    "## Fait, hypothèse, certitude",
    "",
    "- Un fait est une ligne horodatée directement observable dans un fichier fourni.",
    "- Une hypothèse est une explication plausible qui n’est pas encore soutenue par deux faits convergents.",
    "- Valeur de certitude : `vp = 4`, `sv = 2`, `fp = 1`.",
    "",
    "## Priorité",
    "",
    "- Formule : `priorité = gravité annoncée × criticité machine × certitude`.",
    "- Bornes : `1 à 7 = basse`, `8 à 23 = moyenne`, `24 à 39 = haute`, `40 à 64 = critique`.",
    "- On traite d’abord la priorité la plus haute. Si deux alertes avaient exactement la même priorité, il faudrait une information supplémentaire, mais le corpus de cette évaluation n’en a pas besoin.",
    "",
    "## Repères bénins autorisés",
    "",
    "- `adm-pc02` exécute chaque jeudi vers 22:10 UTC une synchronisation d’inventaire avec `inventaire.palmier-or.example`. Les indices attendus sont : parent `taskeng.exe`, utilisateur `ksow`, puis trafic mandataire vers ce domaine.",
    "- Une série de `4625` suivie, en moins de 120 secondes, d’un `4624` sur le même poste, pour le même compte et la même adresse interne, sans événement privilégié associé, correspond à un oubli de mot de passe.",
    "",
    "## Liste ATT&CK utile pour ce sujet",
    "",
    "- `T1110` : force brute.",
    "- `T1078` : comptes valides.",
    "- `T1505.003` : shell web.",
    "- `T1071.001` : canal web sortant.",
    "",
    "## Rapport",
    "",
    "- Le résumé exécutif ne contient que des faits déjà démontrés.",
    "- Un indicateur partagé à l’extérieur s’écrit sous forme désarmée, par exemple `exemple[.]org`.",
  ].join("\n") + "\n";
  files.push({ name: "slg-proj-grille-triage.md", data: text(gridText) });

  const reportTemplate = [
    "# Modèle de rapport d’analyse",
    "",
    "## 1. Contexte",
    "- Semaine analysée :",
    "- Source du signal :",
    "- Périmètre retenu :",
    "",
    "## 2. Alertes triées",
    "- Vrais positifs :",
    "- Faux positifs :",
    "- À surveiller :",
    "",
    "## 3. Chronologie UTC",
    "| Horodatage UTC | Fait | Source |",
    "|---|---|---|",
    "|  |  |  |",
    "",
    "## 4. Impact et priorités",
    "- Machine d’entrée :",
    "- Compte compromis :",
    "- Priorité immédiate :",
    "",
    "## 5. Recommandations",
    "- Confinement immédiat :",
    "- Secrets à faire tourner :",
    "- Pistes de vérification :",
  ].join("\n") + "\n";
  files.push({ name: "slg-proj-modele-rapport.md", data: text(reportTemplate) });

  const guideText = [
    "# Guide de l’évaluation",
    "",
    "> Cadre et limites",
    ">",
    "> Toutes les données de ce projet sont fictives.",
    "> Tu analyses des exports figés et tu ne te connectes à aucune machine du scénario.",
    "> Ne rejoue jamais une commande vue dans un journal sur un système réel qui ne t’appartient pas.",
    "",
    "## Méthode",
    "",
    "1. Lis d’abord la grille de triage. Elle fixe les trois qualifications, la valeur de certitude, la formule de priorité et les bornes.",
    "2. Pour chaque alerte, cherche au moins un fait direct, puis une corroboration dans une autre source si tu veux conclure à un vrai positif.",
    "3. Quand deux formats utilisent des horodatages différents, convertis-les d’abord en UTC avant de trier la chronologie.",
    "4. Distingue toujours les faits, les hypothèses et les décisions de confinement dans ton rapport.",
    "",
    "## Variante visionneuse du site",
    "",
    "Tape des mots génériques comme `failed`, `accepted`, `connect`, `query`, `post`, `404` ou `encoded` pour réduire le bruit, puis relis les lignes voisines dans la même source.",
    "",
    "## Commandes utiles avec Git Bash",
    "",
    "```bash",
    "cat > demo-alertes.csv <<'EOF'",
    "AlertId;Source;Value",
    "A-01;dns;demo-sync.example",
    "A-02;proxy;demo-sync.example:8443",
    "A-03;web;POST /upload.php",
    "EOF",
    "cat > demo-web.log <<'EOF'",
    "198.51.100.10 - - [01/Jun/2026:08:00:00 +0000] \"POST /upload.php HTTP/1.1\" 200 210 \"-\" \"Demo/1.0\"",
    "198.51.100.10 - - [01/Jun/2026:08:01:00 +0000] \"GET /upload.php?cmd=id HTTP/1.1\" 200 81 \"-\" \"Demo/1.0\"",
    "EOF",
    "cross_demo=$(grep -c 'demo-sync.example' demo-alertes.csv)",
    "web_demo=$(grep -c 'cmd=' demo-web.log)",
    "printf 'Demo recoupement pret : %s fait(s).\\nDemo execution web preparee : %s ligne(s).\\n' \"$cross_demo\" \"$web_demo\"",
    "```",
    "",
    "```powershell",
    "@'",
    "AlertId;Source;Value",
    "A-01;dns;demo-sync.example",
    "A-02;proxy;demo-sync.example:8443",
    "A-03;web;POST /upload.php",
    "'@ | Set-Content -Encoding UTF8 demo-alertes.csv",
    "@'",
    "198.51.100.10 - - [01/Jun/2026:08:00:00 +0000] \"POST /upload.php HTTP/1.1\" 200 210 \"-\" \"Demo/1.0\"",
    "198.51.100.10 - - [01/Jun/2026:08:01:00 +0000] \"GET /upload.php?cmd=id HTTP/1.1\" 200 81 \"-\" \"Demo/1.0\"",
    "'@ | Set-Content -Encoding UTF8 demo-web.log",
    "$crossDemo = (Get-Content -Encoding UTF8 demo-alertes.csv | Select-String 'demo-sync.example').Count",
    "$webDemo = (Get-Content -Encoding UTF8 demo-web.log | Select-String 'cmd=').Count",
    "\"Demo recoupement pret : $crossDemo fait(s).\"",
    "\"Demo execution web preparee : $webDemo ligne(s).\"",
    "```",
    "",
    "## Calculer une priorité sur des données inventées",
    "",
    "```bash",
    "awk 'BEGIN { gravite=3; criticite=4; certitude=2; print gravite * criticite * certitude }'",
    "```",
    "",
    "```powershell",
    "$gravite = 3",
    "$criticite = 4",
    "$certitude = 2",
    "$gravite * $criticite * $certitude",
    "```",
    "",
    "## Repère",
    "",
    "Une alerte peut être bruyante sans être confirmée. L’objectif du triage est de prouver ce qui est arrivé, pas d’empiler les soupçons.",
  ].join("\n") + "\n";
  files.push({ name: "slg-proj-guide.md", data: text(guideText) });

  const certitude = { vp: 4, sv: 2, fp: 1 };
  const criticalityByMachine = Object.fromEntries(inventoryRows.map((row) => [row.Machine, Number(row.Criticite)]));
  const qualificationByAlert = {
    "ALT-01": "fp",
    "ALT-03": "sv",
    "ALT-04": "vp",
    "ALT-05": "vp",
    "ALT-06": "vp",
    "ALT-08": "fp",
    "ALT-12": "sv",
  };
  const priorityByAlert = Object.fromEntries(["ALT-04", "ALT-05", "ALT-06"].map((id) => {
    const alert = alertsRows.find((row) => row.AlertId === id);
    return [id, Number(alert.GraviteAnnoncee) * criticalityByMachine[alert.Machine] * certitude[qualificationByAlert[id]]];
  }));
  const topAlert = Object.entries(priorityByAlert).sort((left, right) => right[1] - left[1])[0][0];

  const facts = {
    projetSocPme: {
      assetNames: {
        alertsFile: "slg-proj-alertes.csv",
        inventoryFile: "slg-proj-inventaire.csv",
        authFile: "slg-proj-preuves-auth.log",
        windowsFile: "slg-proj-preuves-windows.csv",
        webFile: "slg-proj-preuves-web.log",
        networkFile: "slg-proj-preuves-reseau.log",
        dnsFile: "slg-proj-preuves-dns.log",
        proxyFile: "slg-proj-preuves-proxy.log",
        gridFile: "slg-proj-grille-triage.md",
        reportFile: "slg-proj-modele-rapport.md",
        guideFile: "slg-proj-guide.md",
      },
      qualificationByAlert,
      priorityByAlert,
      topAlert,
      entryMachine: alertHost,
      compromisedAccount,
      firstIncidentTime: firstIncidentIso.slice(11, 19),
      attackerIp,
      outboundDestination: `${c2Domain}:8443`,
      attackTechniqueLetter: "b",
      containmentLetter: "c",
      indicatorDisarmed: "cache-sync[.]palmier-or[.]example",
      conclusionLetter: "b",
      certitudeValues: certitude,
      criticalityByMachine,
      lineCounts: Object.fromEntries(files.map((file) => [file.name, file.data.toString("utf8").trimEnd().split("\n").length])),
      priorityBounds: {
        basseMax: 7,
        moyenneMax: 23,
        hauteMax: 39,
        critiqueMax: 64,
      },
      roundHalfUpExample: roundHalfUp((3 / 8) * 100),
    },
  };

  return { files, facts };
}

module.exports = { buildLogsAssetsC };
