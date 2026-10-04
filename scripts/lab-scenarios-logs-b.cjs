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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isoToSyslogUtcPlusOne(iso, host, program, message) {
  const local = new Date(Date.parse(iso) + 3600000);
  const month = MONTHS[local.getUTCMonth()];
  const day = String(local.getUTCDate()).padStart(2, " ");
  const hh = String(local.getUTCHours()).padStart(2, "0");
  const mm = String(local.getUTCMinutes()).padStart(2, "0");
  const ss = String(local.getUTCSeconds()).padStart(2, "0");
  return `${month} ${day} ${hh}:${mm}:${ss} ${host} ${program}: ${message}`;
}

function isoToNginxStamp(iso) {
  const date = new Date(iso);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${day}/${month}/${year}:${hh}:${mm}:${ss} +0000`;
}

function formatAccessLine(event) {
  return `${event.ip} - - [${isoToNginxStamp(event.iso)}] "${event.method} ${event.path} HTTP/1.1" ${event.status} ${event.bytes} "${event.referer}" "${event.userAgent}"`;
}

function formatProxyLine(event) {
  const epoch = (Date.parse(event.iso) / 1000).toFixed(3);
  return `${epoch}    ${String(event.duration).padStart(3)} ${event.clientIp} ${event.cacheCode}/${event.status} ${event.bytes} ${event.method} ${event.url} - ${event.peer} ${event.mime}`;
}

function normalize(value) {
  return String(value).toLowerCase().trim().replace(/\s+/g, " ");
}

function roundHalfUp(value) {
  return Math.floor(value + 0.5);
}

function minutesBetween(isoA, isoB) {
  return Math.round((Date.parse(isoB) - Date.parse(isoA)) / 60000);
}

function parseAccessLine(line) {
  const match = /^(?<ip>\S+) - - \[(?<stamp>[^\]]+)\] "(?<method>\S+) (?<path>\S+) HTTP\/1\.1" (?<status>\d{3}) (?<bytes>\d+) "(?<referer>[^"]*)" "(?<ua>[^"]*)"$/u.exec(line);
  if (!match) throw new Error(`ligne d'accès illisible: ${line}`);
  return {
    ip: match.groups.ip,
    method: match.groups.method,
    path: match.groups.path,
    status: Number(match.groups.status),
    bytes: Number(match.groups.bytes),
    referer: match.groups.referer,
    userAgent: match.groups.ua,
    iso: `${match.groups.stamp.slice(7, 11)}-${String(MONTHS.indexOf(match.groups.stamp.slice(3, 6)) + 1).padStart(2, "0")}-${match.groups.stamp.slice(0, 2)}T${match.groups.stamp.slice(12, 20)}Z`,
  };
}

function parseProxyLine(line) {
  const match = /^(?<epoch>\d+\.\d+)\s+(?<duration>\d+)\s+(?<client>\S+)\s+(?<cache>\S+)\/(?<status>\d+)\s+(?<bytes>\d+)\s+(?<method>\S+)\s+(?<url>\S+)\s+-\s+(?<peer>\S+)\s+(?<mime>\S+)$/u.exec(line);
  if (!match) throw new Error(`ligne proxy illisible: ${line}`);
  return {
    iso: new Date(Number(match.groups.epoch) * 1000).toISOString(),
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
}

function parseAuthLine(line) {
  const match = /^(?<month>[A-Z][a-z]{2})\s+(?<day>\d{1,2})\s+(?<time>\d{2}:\d{2}:\d{2})\s+(?<host>\S+)\s+(?<program>[^:]+):\s+(?<message>.+)$/u.exec(line);
  if (!match) throw new Error(`ligne auth illisible: ${line}`);
  const monthIndex = MONTHS.indexOf(match.groups.month);
  const localIso = `2026-${String(monthIndex + 1).padStart(2, "0")}-${String(Number(match.groups.day)).padStart(2, "0")}T${match.groups.time}Z`;
  const utc = new Date(Date.parse(localIso) - 3600000).toISOString();
  return {
    iso: utc,
    host: match.groups.host,
    program: match.groups.program,
    message: match.groups.message,
  };
}

function parseLeaseRows(textValue) {
  return textValue.trim().split("\n").slice(1).map((line) => {
    const [ip, mac, hostname, start, end] = line.split(";");
    return { ip, mac, hostname, start, end };
  });
}

function parseEventRows(textValue) {
  return textValue.trim().split("\n").slice(1).map((line) => {
    const [timeUtc, sourceIp, account, result, truth] = line.split(";");
    return { timeUtc, sourceIp, account, result, truth };
  });
}

function parseRules(rawRules) {
  const textValue = rawRules.replace(/`/gu, "");
  const windowMatch = /Fen(?:e|ê)tre glissante\s*:\s*pour l[’'](?:e|é)v(?:e|é)nement courant [aà] l’instant t, on compte les lignes telles que horodatage > t - N minute\(s\) et horodatage <= t/u.exec(textValue);
  if (!windowMatch) throw new Error("fenêtre commune manquante");
  const commonWindowRule = {
    lowerBoundExclusive: true,
    upperBoundInclusive: true,
  };
  const rules = [];
  for (const block of textValue.split(/^## /mu).slice(1)) {
    const titleMatch = /^R(?:e|è)gle (\d+)/u.exec(block);
    if (!titleMatch) continue;
    const ruleNumber = Number(titleMatch[1]);
    const threshold = Number(/Seuil\s*:\s*au moins (\d+) [ée]chec\(s\)/u.exec(block)[1]);
    const windowMinutes = Number(/Fen(?:e|ê)tre\s*:\s*(\d+) minute\(s\)/u.exec(block)[1]);
    const groupBy = /Regroupement\s*:\s*([^\n]+)/u.exec(block)[1].trim();
    const excludeIpsMatch = /Exclusions SourceIp\s*:\s*([^\n]+)/u.exec(block);
    const excludeAccountsMatch = /Exclusions Account\s*:\s*([^\n]+)/u.exec(block);
    rules.push({
      number: ruleNumber,
      threshold,
      windowMinutes,
      groupBy,
      excludeIps: excludeIpsMatch ? excludeIpsMatch[1].split(",").map((value) => value.trim()).filter(Boolean) : [],
      excludeAccounts: excludeAccountsMatch ? excludeAccountsMatch[1].split(",").map((value) => value.trim()).filter(Boolean) : [],
      ...commonWindowRule,
    });
  }
  return rules.sort((a, b) => a.number - b.number);
}

function eventKey(event, grouping) {
  if (grouping === "SourceIp") return event.sourceIp;
  if (grouping === "Account") return event.account;
  if (grouping === "SourceIp + Account") return `${event.sourceIp}|${event.account}`;
  throw new Error(`regroupement inconnu: ${grouping}`);
}

function isExcluded(event, rule) {
  if (rule.excludeIps.includes(event.sourceIp)) return true;
  if (rule.excludeAccounts.includes(event.account)) return true;
  return false;
}

function evaluateRule(rule, events) {
  const failures = events.filter((event) => event.result === "failure");
  const alerts = [];
  for (const current of failures) {
    if (isExcluded(current, rule)) continue;
    const currentTime = Date.parse(current.timeUtc);
    const relevant = failures.filter((candidate) => {
      if (isExcluded(candidate, rule)) return false;
      if (eventKey(candidate, rule.groupBy) !== eventKey(current, rule.groupBy)) return false;
      const candidateTime = Date.parse(candidate.timeUtc);
      return candidateTime > currentTime - rule.windowMinutes * 60000 && candidateTime <= currentTime;
    });
    if (relevant.length >= rule.threshold) alerts.push(current);
  }
  const vp = alerts.filter((event) => event.truth === "attaque").length;
  const fp = alerts.filter((event) => event.truth === "normal").length;
  const fn = failures.filter((event) => event.truth === "attaque" && !alerts.includes(event)).length;
  const precision = vp + fp === 0 ? 0 : roundHalfUp((vp / (vp + fp)) * 100);
  const recall = vp + fn === 0 ? 0 : roundHalfUp((vp / (vp + fn)) * 100);
  const f1 = precision + recall === 0 ? 0 : roundHalfUp((2 * precision * recall) / (precision + recall));
  return { alerts, vp, fp, fn, precision, recall, f1 };
}

function deriveTp4Facts(files) {
  const access = files.accessText.trim().split("\n").map(parseAccessLine);
  const proxy = files.proxyText.trim().split("\n").map(parseProxyLine);
  const auth = files.authText.trim().split("\n").map(parseAuthLine);
  const leases = parseLeaseRows(files.leaseText);
  const suspiciousIp = "172.20.10.57";
  const suspiciousPrefix = "/reservation/admin/booking/8842";
  const modificationPath = "/reservation/api/bookings/8842/edit";
  const uniqueSharedPath = "/reservation/api/bookings/8842/edit";
  const firstAdmin = access.filter((row) => row.ip === suspiciousIp && row.path.startsWith(suspiciousPrefix)).sort((a, b) => Date.parse(a.iso) - Date.parse(b.iso))[0];
  const modification = access.filter((row) => row.ip === suspiciousIp && row.method === "POST" && row.path === modificationPath).sort((a, b) => Date.parse(a.iso) - Date.parse(b.iso))[0];
  const firstSsh = auth.filter((row) => /Accepted password for (\S+) from 172\.20\.10\.57/u.test(row.message)).sort((a, b) => Date.parse(a.iso) - Date.parse(b.iso))[0];
  const account = /Accepted password for (\S+) from/u.exec(firstSsh.message)[1];
  const leaseAtSsh = leases.find((lease) => lease.ip === suspiciousIp && Date.parse(lease.start) <= Date.parse(firstSsh.iso) && Date.parse(firstSsh.iso) < Date.parse(lease.end));
  const proxyMatch = proxy.find((row) => row.clientIp === suspiciousIp && row.method === "POST" && row.url.endsWith(uniqueSharedPath));
  const driftMinutes = Math.round((Date.parse(modification.iso) - Date.parse(proxyMatch.iso)) / 60000);
  const consultationSources = [
    access.some((row) => row.ip === suspiciousIp && row.path === "/reservation/admin/booking/8842?view=full"),
    proxy.some((row) => row.clientIp === suspiciousIp && row.url.endsWith("/reservation/admin/booking/8842?view=full")),
    auth.some((row) => row.message.includes("booking/8842?view=full")),
  ].filter(Boolean).length;
  const correctedProxy = proxy.map((row) => ({ ...row, correctedIso: new Date(Date.parse(row.iso) + driftMinutes * 60000).toISOString() }));
  const lastActivity = [
    ...access.filter((row) => row.ip === suspiciousIp && Date.parse(row.iso) >= Date.parse(firstAdmin.iso)).map((row) => ({ iso: row.iso })),
    ...correctedProxy.filter((row) => row.clientIp === suspiciousIp && Date.parse(row.correctedIso) >= Date.parse(firstAdmin.iso)).map((row) => ({ iso: row.correctedIso })),
    ...auth.filter((row) => row.message.includes(`from ${suspiciousIp}`) || row.message.includes(` ${suspiciousIp} `)).map((row) => ({ iso: row.iso })),
  ].sort((a, b) => Date.parse(b.iso) - Date.parse(a.iso))[0];
  return {
    suspiciousIp,
    suspiciousPrefix,
    modificationPath,
    hostAtSsh: leaseAtSsh.hostname,
    macAtSsh: leaseAtSsh.mac,
    firstAdminTime: firstAdmin.iso.slice(11, 19),
    modificationTime: modification.iso.slice(11, 19),
    adminToModificationMinutes: minutesBetween(firstAdmin.iso, modification.iso),
    sshAccount: account,
    sshTime: firstSsh.iso.slice(11, 19),
    driftMinutes,
    consultationSources,
    previousHolder: leases.find((lease) => lease.ip === suspiciousIp && lease.hostname !== leaseAtSsh.hostname && Date.parse(lease.end) <= Date.parse(firstSsh.iso)).hostname,
    lastActivityTime: lastActivity.iso.slice(11, 19),
    modificationToLastMinutes: minutesBetween(modification.iso, lastActivity.iso),
  };
}

function deriveTp5Facts(files) {
  const events = parseEventRows(files.eventsText);
  const rules = parseRules(files.rulesText);
  const r1 = evaluateRule(rules[0], events);
  const r2 = evaluateRule(rules[1], events);
  const r3 = evaluateRule(rules[2], events);
  const thresholdNoFp = (() => {
    for (let threshold = rules[0].threshold; threshold <= 12; threshold += 1) {
      const result = evaluateRule({ ...rules[0], threshold }, events);
      if (result.fp === 0) return threshold;
    }
    return rules[0].threshold;
  })();
  const fpAccountCounts = new Map();
  for (const alert of r2.alerts.filter((event) => event.truth === "normal")) {
    fpAccountCounts.set(alert.account, (fpAccountCounts.get(alert.account) ?? 0) + 1);
  }
  const noisiestAccount = [...fpAccountCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const r2WithoutAccount = evaluateRule({ ...rules[1], excludeAccounts: [...rules[1].excludeAccounts, noisiestAccount] }, events);
  const allTriggered = new Set([
    ...r1.alerts.filter((event) => event.truth === "attaque").map((event) => event.sourceIp),
    ...r2.alerts.filter((event) => event.truth === "attaque").map((event) => event.sourceIp),
    ...r3.alerts.filter((event) => event.truth === "attaque").map((event) => event.sourceIp),
  ]);
  // The slow attack: at least five attack failures, each more than ten minutes after the previous one, and no alert at all.
  const isSlowAttack = (ip) => {
    const times = events.filter((event) => event.truth === "attaque" && event.result === "failure" && event.sourceIp === ip).map((event) => Date.parse(event.timeUtc)).sort((a, b) => a - b);
    return times.length >= 5 && times.every((time, index) => index === 0 || time - times[index - 1] > 10 * 60000);
  };
  const slowAttackIps = [...new Set(events.filter((event) => event.truth === "attaque").map((event) => event.sourceIp))].filter((ip) => !allTriggered.has(ip) && isSlowAttack(ip));
  if (slowAttackIps.length !== 1) throw new Error(`TP5 : une seule attaque lente attendue, trouvé ${slowAttackIps.length}`);
  const unseenAttackIp = slowAttackIps[0];
  const bestPrecisionRule = [r1, r2, r3].map((result, index) => ({ number: index + 1, value: result.precision })).sort((a, b) => b.value - a.value || a.number - b.number)[0].number;
  const bestRecallRule = [r1, r2, r3].map((result, index) => ({ number: index + 1, value: result.recall })).sort((a, b) => b.value - a.value || a.number - b.number)[0].number;
  const deploymentChoice = [r1, r2, r3].map((result, index) => ({ number: index + 1, result }))
    .filter((entry) => entry.result.precision >= 60)
    .sort((a, b) => b.result.recall - a.result.recall || b.result.precision - a.result.precision || a.number - b.number)[0].number;
  const bestF1Rule = [r1, r2, r3].map((result, index) => ({ number: index + 1, result })).sort((a, b) => b.result.f1 - a.result.f1 || b.result.precision - a.result.precision || a.number - b.number)[0];
  return {
    r1Alerts: r1.alerts.length,
    r1Vp: r1.vp,
    r1Fp: r1.fp,
    r1Fn: r1.fn,
    r1Precision: r1.precision,
    r1Recall: r1.recall,
    r3Alerts: r3.alerts.length,
    bestPrecisionRule,
    bestRecallRule,
    thresholdNoFp,
    noisiestAccount,
    r2RecallAfterExclusion: r2WithoutAccount.recall,
    unseenAttackIp,
    deploymentChoice,
    bestF1Rule: bestF1Rule.number,
    bestF1Score: bestF1Rule.result.f1,
  };
}

function buildTp4() {
  const rng = mulberry32(41057);
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Gecko/20100101 Firefox/126.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/123.0",
    "curl/8.7.1",
  ];
  const referers = [
    "-",
    "http://srv-reservation01.palmier-or.example/reservation/dashboard",
    "http://srv-reservation01.palmier-or.example/reservation/login",
  ];
  const accessRecords = [];
  const proxyRecords = [];
  const authLines = [];
  const pushAccess = (iso, ip, method, path, status, bytes, referer, userAgent) => {
    accessRecords.push({ iso, ip, method, path, status, bytes, referer, userAgent });
  };
  const pushProxy = (iso, clientIp, method, url, status, bytes, peer, mime, duration, cacheCode = "TCP_MISS") => {
    proxyRecords.push({ iso, clientIp, method, url, status, bytes, peer, mime, duration, cacheCode });
  };

  const internalClients = ["172.20.10.31", "172.20.10.33", "172.20.10.44", "172.20.10.61", "172.20.10.72"];
  const normalPaths = [
    "/reservation/login",
    "/reservation/dashboard",
    "/reservation/search?room=203",
    "/reservation/api/bookings?arrival=2026-05-24",
    "/reservation/help",
    "/reservation/api/guests/445",
    "/reservation/reports/day",
  ];
  const start = Date.parse("2026-05-23T08:00:00Z");
  for (let index = 0; index < 140; index += 1) {
    const iso = new Date(start + index * 180000 + Math.floor(rng() * 50000)).toISOString();
    const ip = internalClients[index % internalClients.length];
    const path = normalPaths[index % normalPaths.length];
    const method = path.includes("/api/") && index % 11 === 0 ? "POST" : "GET";
    const status = path.includes("/help") ? 304 : 200;
    const bytes = 900 + index * 17 + Math.floor(rng() * 90);
    const referer = referers[index % referers.length];
    const userAgent = userAgents[index % 3];
    pushAccess(iso, ip, method, path, status, bytes, referer, userAgent);
    if (index % 4 === 0) {
      const proxyIso = new Date(Date.parse(iso) - 240000).toISOString();
      pushProxy(proxyIso, ip, method, `http://srv-reservation01.palmier-or.example${path}`, status, bytes, "HIER_DIRECT/172.20.20.11", "text/html", 120 + (index % 35));
    }
  }

  const suspiciousSequence = [
    ["2026-05-23T10:14:12Z", "GET", "/reservation/admin/booking/8842?view=full", 200, 1822, "http://srv-reservation01.palmier-or.example/reservation/search?guest=8842", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0"],
    ["2026-05-23T10:15:05Z", "GET", "/reservation/api/guests/8842", 200, 1294, "http://srv-reservation01.palmier-or.example/reservation/admin/booking/8842?view=full", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0"],
    ["2026-05-23T10:17:12Z", "POST", "/reservation/api/bookings/8842/edit", 200, 624, "http://srv-reservation01.palmier-or.example/reservation/admin/booking/8842?view=full", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0"],
    ["2026-05-23T10:18:08Z", "GET", "/reservation/admin/export?guest=8842", 200, 3198, "http://srv-reservation01.palmier-or.example/reservation/admin/booking/8842?view=full", "curl/8.7.1"],
  ];
  for (const [iso, method, path, status, bytes, referer, userAgent] of suspiciousSequence) {
    pushAccess(iso, "172.20.10.57", method, path, status, bytes, referer, userAgent);
    pushProxy(new Date(Date.parse(iso) - 240000).toISOString(), "172.20.10.57", method, `http://srv-reservation01.palmier-or.example${path}`, status, bytes, "HIER_DIRECT/172.20.20.11", method === "POST" ? "application/json" : "text/html", 241);
  }
  pushProxy("2026-05-23T10:20:45Z", "172.20.10.57", "GET", "http://support-resa-update.example/login-notes.txt", 200, 812, "HIER_DIRECT/203.0.113.91", "text/plain", 188);

  const browsingNoise = [
    ["2026-05-23T08:22:11Z", "172.20.10.44", "GET", "http://intranet.palmier-or.example/annonces", 200, 4410, "HIER_DIRECT/172.20.20.5", "text/html", 84],
    ["2026-05-23T09:48:52Z", "172.20.10.61", "CONNECT", "https://www.impots.example:443", 200, 5120, "HIER_DIRECT/203.0.113.140", "application/octet-stream", 156],
    ["2026-05-23T11:02:19Z", "172.20.10.33", "GET", "http://proxy-cache.example/status", 200, 1882, "HIER_DIRECT/198.51.100.41", "text/plain", 67],
    ["2026-05-23T11:34:08Z", "172.20.10.72", "GET", "http://formation.example/faq", 200, 2411, "HIER_DIRECT/203.0.113.177", "text/html", 94],
  ];
  for (const [iso, clientIp, method, url, status, bytes, peer, mime, duration] of browsingNoise) {
    pushProxy(iso, clientIp, method, url, status, bytes, peer, mime, duration);
  }

  const authNoise = [
    ["2026-05-23T08:03:11Z", "sshd[2011]", "Failed password for invalid user admin from 198.51.100.88 port 51221 ssh2"],
    ["2026-05-23T08:03:29Z", "sshd[2014]", "Failed password for invalid user guest from 198.51.100.88 port 51244 ssh2"],
    ["2026-05-23T08:11:52Z", "sshd[2101]", "Accepted publickey for ksow from 172.20.10.44 port 49920 ssh2: ED25519 SHA256:Bt9fFgM0Y6fZ4demo"],
    ["2026-05-23T08:11:53Z", "sshd[2101]", "pam_unix(sshd:session): session opened for user ksow(uid=1004) by (uid=0)"],
    ["2026-05-23T09:05:12Z", "sshd[2788]", "Failed password for root from 203.0.113.66 port 54311 ssh2"],
    ["2026-05-23T09:05:44Z", "sshd[2792]", "Failed password for root from 203.0.113.66 port 54329 ssh2"],
    ["2026-05-23T09:06:08Z", "sshd[2797]", "Failed password for invalid user postgres from 203.0.113.66 port 54344 ssh2"],
    ["2026-05-23T10:19:31Z", "sshd[4012]", "Accepted password for svc-resa from 172.20.10.57 port 55124 ssh2"],
    ["2026-05-23T10:19:31Z", "sshd[4012]", "pam_unix(sshd:session): session opened for user svc-resa(uid=1106) by (uid=0)"],
    ["2026-05-23T10:22:40Z", "sudo[4099]", "svc-resa : TTY=pts/1 ; PWD=/srv/reservation ; USER=root ; COMMAND=/usr/sbin/useradd -m audit-cache"],
    ["2026-05-23T10:28:12Z", "sshd[4012]", "Disconnected from user svc-resa 172.20.10.57 port 55124"],
    ["2026-05-23T10:28:13Z", "sshd[4012]", "pam_unix(sshd:session): session closed for user svc-resa"],
  ];
  for (const [iso, program, message] of authNoise) authLines.push(isoToSyslogUtcPlusOne(iso, "srv-reservation01", program, message));

  const leaseRows = [
    "IpAddress;MacAddress;Hostname;LeaseStartUtc;LeaseEndUtc",
    "172.20.10.44;08:00:27:ab:44:10;pc-reception01;2026-05-23T07:30:00Z;2026-05-23T18:30:00Z",
    "172.20.10.57;f0:2f:74:9a:10:57;pc-compta01;2026-05-23T07:50:00Z;2026-05-23T09:12:00Z",
    "172.20.10.57;9c:b6:d0:11:4a:57;adm-pc02;2026-05-23T09:12:00Z;2026-05-23T18:45:00Z",
    "172.20.10.61;40:a3:6b:22:61:01;pc-direction01;2026-05-23T07:55:00Z;2026-05-23T17:40:00Z",
    "172.20.10.72;18:c0:4d:72:00:01;pc-stock01;2026-05-23T08:10:00Z;2026-05-23T17:50:00Z",
    "172.20.10.33;3c:52:82:33:00:08;poste-audit02;2026-05-23T08:04:00Z;2026-05-23T12:40:00Z",
  ];

  accessRecords.sort((a, b) => Date.parse(a.iso) - Date.parse(b.iso));
  proxyRecords.sort((a, b) => Date.parse(a.iso) - Date.parse(b.iso));
  const accessText = `${accessRecords.map(formatAccessLine).join("\n")}\n`;
  const proxyText = `${proxyRecords.map(formatProxyLine).join("\n")}\n`;
  const authText = `${authLines.join("\n")}\n`;
  const leaseText = `${leaseRows.join("\n")}\n`;

  const guideLines = [
    "# Guide du TP 4 : corréler trois sources et dresser la chronologie",
    "",
    "> Exemple avec des valeurs inventées, pas celles du labo.",
    ">",
    "> Le journal d’authentification de ce TP est en heure locale UTC+01:00. Convertis-le en UTC avant de comparer les sources.",
    "> Pour les baux DHCP, applique la règle du TP : début inclus, fin exclue.",
    "",
    "## Méthode",
    "",
    "- Commence par choisir un événement rare visible dans deux journaux pour mesurer un décalage d’horloge.",
    "- Convertis ensuite tous les horodatages en UTC avant de dresser une chronologie unique.",
    "- Pour relier une adresse IP à une machine, cherche le bail dont l’heure de début est inférieure ou égale au fait et dont l’heure de fin est strictement supérieure au fait.",
    "- Dans une chronologie, note la source, l’heure UTC, le fait et la preuve.",
    "",
    "## Bash ou Git Bash",
    "",
    "```bash",
    "cat > demo-access.log <<'EOF'",
    "10.50.0.21 - - [01/Nov/2025:09:14:00 +0000] \"GET /inventaire HTTP/1.1\" 200 812 \"-\" \"DemoBrowser/1.0\"",
    "EOF",
    "cat > demo-proxy.log <<'EOF'",
    "1761988200.000    141 10.50.0.21 TCP_MISS/200 812 GET http://atelier.example/inventaire - HIER_DIRECT/10.60.0.12 text/html",
    "EOF",
    "cat > demo-baux.csv <<'EOF'",
    "IpAddress;MacAddress;Hostname;LeaseStartUtc;LeaseEndUtc",
    "10.50.0.21;00:aa:bb:cc:dd:21;pc-demo01;2025-11-01T08:00:00Z;2025-11-01T11:00:00Z",
    "EOF",
    "access_time=$(awk -F'[][]' 'NR==1 {print $2}' demo-access.log | cut -d: -f2-4)",
    "proxy_epoch=$(awk 'NR==1 {print $1}' demo-proxy.log)",
    "proxy_time=$(date -u -d @${proxy_epoch%.*} +%H:%M:%S)",
    "host_demo=$(awk -F';' 'NR>1 && $1==\"10.50.0.21\" && $4<=\"2025-11-01T09:14:00Z\" && \"2025-11-01T09:14:00Z\"<$5 {print $3}' demo-baux.csv)",
    "printf 'Heure acces inventee : %s\\nHeure proxy inventee : %s\\nMachine inventee : %s\\n' \"$access_time\" \"$proxy_time\" \"$host_demo\"",
    "```",
    "",
    "## PowerShell 5.1",
    "",
    "```powershell",
    "@'",
    "10.50.0.21 - - [01/Nov/2025:09:14:00 +0000] \"GET /inventaire HTTP/1.1\" 200 812 \"-\" \"DemoBrowser/1.0\"",
    "'@ | Set-Content -Encoding UTF8 demo-access.log",
    "@'",
    "1761988200.000    141 10.50.0.21 TCP_MISS/200 812 GET http://atelier.example/inventaire - HIER_DIRECT/10.60.0.12 text/html",
    "'@ | Set-Content -Encoding UTF8 demo-proxy.log",
    "@'",
    "IpAddress;MacAddress;Hostname;LeaseStartUtc;LeaseEndUtc",
    "10.50.0.21;00:aa:bb:cc:dd:21;pc-demo01;2025-11-01T08:00:00Z;2025-11-01T11:00:00Z",
    "'@ | Set-Content -Encoding UTF8 demo-baux.csv",
    "$accessLine = @(Get-Content -Encoding UTF8 demo-access.log)[0]",
    "$start = $accessLine.IndexOf('[') + 1",
    "$end = $accessLine.IndexOf(']')",
    "$stamp = $accessLine.Substring($start, $end - $start)",
    "$accessTime = $stamp.Substring(12, 8)",
    "$proxyEpoch = [double]((@(Get-Content -Encoding UTF8 demo-proxy.log)[0]).Split(' ')[0])",
    "$proxyTime = [DateTimeOffset]::FromUnixTimeSeconds([int][math]::Floor($proxyEpoch)).UtcDateTime.ToString('HH:mm:ss')",
    "$lease = Import-Csv demo-baux.csv -Delimiter ';' | Where-Object { $_.IpAddress -eq '10.50.0.21' -and $_.LeaseStartUtc -le '2025-11-01T09:14:00Z' -and '2025-11-01T09:14:00Z' -lt $_.LeaseEndUtc } | Select-Object -First 1",
    "\"Heure acces inventee : $accessTime\"",
    "\"Heure proxy inventee : $proxyTime\"",
    "\"Machine inventee : $($lease.Hostname)\"",
    "```",
  ];

  const timelineTemplate = [
    "# Modèle de chronologie UTC",
    "",
    "Remplis ce tableau avec des heures UTC, une preuve et une courte remarque. Les intitulés sont fixes pour t’aider à ne rien oublier.",
    "",
    "| Étape | Heure UTC | Source | Preuve | Remarque |",
    "| --- | --- | --- | --- | --- |",
    "| Attribution DHCP de l’adresse source | | baux-dhcp.log | | |",
    "| Première consultation de la fiche 8842 | | acces.log | | |",
    "| POST de modification de la réservation 8842 | | acces.log | | |",
    "| Connexion SSH réussie qui suit | | auth.log | | |",
    "| Consultation externe de notes de connexion | | proxy.log | | |",
  ];

  const files = {
    accessText,
    proxyText,
    authText,
    leaseText,
    timelineText: `${timelineTemplate.join("\n")}\n`,
    guideText: `${guideLines.join("\n")}\n`,
  };
  const answers = deriveTp4Facts(files);

  return {
    files: [
      { name: "slg-tp4-auth.log", data: text(authText) },
      { name: "slg-tp4-acces.log", data: text(accessText) },
      { name: "slg-tp4-proxy.log", data: text(proxyText) },
      { name: "slg-tp4-baux-dhcp.log", data: text(leaseText) },
      { name: "slg-tp4-modele-chronologie.md", data: text(files.timelineText) },
      { name: "slg-tp4-guide.md", data: text(files.guideText) },
    ],
    facts: {
      assetNames: {
        authFile: "slg-tp4-auth.log",
        accessFile: "slg-tp4-acces.log",
        proxyFile: "slg-tp4-proxy.log",
        leasesFile: "slg-tp4-baux-dhcp.log",
        timelineFile: "slg-tp4-modele-chronologie.md",
        guideFile: "slg-tp4-guide.md",
      },
      answers,
    },
  };
}

function buildTp5() {
  const events = [];
  const accounts = ["msylla", "adiop", "jbouedraogo", "ksow", "svc-resa", "svc-sauvegarde"];
  const internalIps = ["172.20.10.31", "172.20.10.32", "172.20.10.41", "172.20.10.44", "172.20.10.61", "10.30.50.14"];
  const addEvent = (timeUtc, sourceIp, account, result, truth) => events.push({ timeUtc, sourceIp, account, result, truth });

  const base = Date.parse("2026-05-25T08:00:00Z");
  for (let step = 0; step < 120; step += 1) {
    const slot = new Date(base + step * 300000);
    const hh = String(slot.getUTCHours()).padStart(2, "0");
    const mm = String(slot.getUTCMinutes()).padStart(2, "0");
    const baseIso = `2026-05-25T${hh}:${mm}:00Z`;
    addEvent(baseIso, internalIps[step % internalIps.length], accounts[step % 4], "success", "normal");
    addEvent(new Date(Date.parse(baseIso) + 41000).toISOString(), internalIps[(step + 2) % internalIps.length], accounts[(step + 1) % 4], "success", "normal");
    addEvent(new Date(Date.parse(baseIso) + 97000).toISOString(), internalIps[(step + 3) % internalIps.length], accounts[(step + 2) % 4], "success", "normal");
    addEvent(new Date(Date.parse(baseIso) + 161000).toISOString(), internalIps[(step + 4) % internalIps.length], accounts[(step + 3) % 4], "success", "normal");
    if (step % 3 === 0) addEvent(new Date(Date.parse(baseIso) + 211000).toISOString(), internalIps[(step + 1) % internalIps.length], accounts[step % 4], "failure", "normal");
  }

  const normalBursts = [
    ["2026-05-25T09:12:00Z", "10.30.50.14", "svc-resa", [0, 40, 80, 120, 160]],
    ["2026-05-25T14:22:00Z", "10.30.50.14", "svc-resa", [0, 50, 100, 150, 200]],
    ["2026-05-25T11:05:00Z", "172.20.10.31", "msylla", [0, 45, 90, 135]],
    ["2026-05-25T15:16:00Z", "172.20.10.31", "msylla", [0, 40, 80, 120]],
    ["2026-05-25T12:40:00Z", "198.51.100.210", "svc-sauvegarde", [0, 45, 90, 135, 180]],
  ];
  for (const [startIso, ip, account, offsets] of normalBursts) {
    for (const offset of offsets) addEvent(new Date(Date.parse(startIso) + offset * 1000).toISOString(), ip, account, "failure", "normal");
    addEvent(new Date(Date.parse(startIso) + 260000).toISOString(), ip, account, "success", "normal");
  }

  const fastAttack = ["2026-05-25T09:41:00Z", "203.0.113.61", "adiop", [0, 25, 50, 75, 100, 125, 150, 175]];
  for (const offset of fastAttack[3]) addEvent(new Date(Date.parse(fastAttack[0]) + offset * 1000).toISOString(), fastAttack[1], fastAttack[2], "failure", "attaque");

  const sprayOffsets = [0, 30, 60, 90, 120, 150];
  const sprayAccounts = ["msylla", "adiop", "jbouedraogo", "ksow", "svc-resa", "svc-sauvegarde"];
  sprayOffsets.forEach((offset, index) => addEvent(new Date(Date.parse("2026-05-25T10:18:00Z") + offset * 1000).toISOString(), "203.0.113.77", sprayAccounts[index], "failure", "attaque"));

  const distributedAttack = [
    ["2026-05-25T13:02:00Z", "203.0.113.40"],
    ["2026-05-25T13:03:10Z", "203.0.113.41"],
    ["2026-05-25T13:04:20Z", "203.0.113.42"],
  ];
  for (const [startIso, ip] of distributedAttack) {
    addEvent(startIso, ip, "jbouedraogo", "failure", "attaque");
    addEvent(new Date(Date.parse(startIso) + 70000).toISOString(), ip, "jbouedraogo", "failure", "attaque");
  }

  const msyllaAttack = ["2026-05-25T16:11:00Z", "203.0.113.52", "msylla", [0, 60, 120, 180, 240]];
  for (const offset of msyllaAttack[3]) addEvent(new Date(Date.parse(msyllaAttack[0]) + offset * 1000).toISOString(), msyllaAttack[1], msyllaAttack[2], "failure", "attaque");

  const slowAttackOffsets = [0, 660, 1320, 1980, 2640];
  for (const offset of slowAttackOffsets) addEvent(new Date(Date.parse("2026-05-25T08:17:00Z") + offset * 1000).toISOString(), "203.0.113.93", "adiop", "failure", "attaque");

  events.sort((a, b) => Date.parse(a.timeUtc) - Date.parse(b.timeUtc) || a.sourceIp.localeCompare(b.sourceIp));
  const eventsText = `TimeUtc;SourceIp;Account;Result;Truth\n${events.map((row) => [row.timeUtc, row.sourceIp, row.account, row.result, row.truth].join(";")).join("\n")}\n`;

  const rulesText = [
    "# Règles du TP 5",
    "",
    "Toutes les définitions ci-dessous s’appliquent uniquement aux lignes dont la colonne `Result` vaut `failure`.",
    "Fenêtre glissante : pour l’événement courant à l’instant t, on compte les lignes telles que horodatage > t - N minute(s) et horodatage <= t, où N est la valeur « Fenêtre » de la règle.",
    "Pour ce TP, une alerte est émise sur chaque ligne d’échec qui atteint ou dépasse le seuil de sa règle.",
    "Un vrai positif est une alerte dont la ligne déclencheuse porte `Truth=attaque`. Un faux positif est une alerte dont la ligne déclencheuse porte `Truth=normal`.",
    "Un faux négatif est une ligne `failure` avec `Truth=attaque` qui ne déclenche aucune alerte de la règle.",
    "Une exclusion (`Exclusions SourceIp` ou `Exclusions Account`) écarte les lignes concernées pour cette règle : elles ne déclenchent aucune alerte et ne comptent pas dans une fenêtre. Elles restent pourtant dans le jeu de données : une ligne exclue qui porte `Truth=attaque` est un faux négatif.",
    "Précision = VP / (VP + FP). Rappel = VP / (VP + FN). Score F1 = 2 × précision × rappel / (précision + rappel).",
    "Tous les pourcentages et le score F1 sont arrondis à l’entier le plus proche, 0,5 au supérieur.",
    "",
    "## Règle 1",
    "Regroupement : `SourceIp`",
    "Seuil : au moins 5 échec(s)",
    "Fenêtre : 5 minute(s)",
    "`Exclusions SourceIp` :",
    "`Exclusions Account` :",
    "Pseudo-Sigma simple : `selection Result=failure ; group-by SourceIp ; condition count >= 5` sur 5 minutes glissantes.",
    "",
    "## Règle 2",
    "Regroupement : `Account`",
    "Seuil : au moins 4 échec(s)",
    "Fenêtre : 4 minute(s)",
    "`Exclusions SourceIp` :",
    "`Exclusions Account` :",
    "Pseudo-Sigma simple : `selection Result=failure ; group-by Account ; condition count >= 4` sur 4 minutes glissantes.",
    "",
    "## Règle 3",
    "Regroupement : `SourceIp + Account`",
    "Seuil : au moins 6 échec(s)",
    "Fenêtre : 10 minute(s)",
    "`Exclusions SourceIp` : 10.30.50.14, 198.51.100.210",
    "`Exclusions Account` :",
    "Pseudo-Sigma simple : `selection Result=failure ; group-by SourceIp + Account ; condition count >= 6` sur 10 minutes glissantes.",
  ].join("\n") + "\n";

  const guideText = [
    "# Guide du TP 5 : règles de détection, seuils et faux positifs",
    "",
    "> Exemple avec des valeurs inventées, pas celles du labo.",
    "",
    "- Lis d’abord la définition exacte de la fenêtre et du regroupement.",
    "- Ne mélange pas une alerte et un événement brut : ici une alerte est toujours rattachée à la ligne qui fait franchir le seuil.",
    "- Calcule les pourcentages après avoir compté VP, FP et FN.",
    "",
    "## Bash ou Git Bash",
    "",
    "```bash",
    "cat > demo-evenements.csv <<'EOF'",
    "TimeUtc;SourceIp;Account;Result;Truth",
    "2025-11-03T08:00:00Z;10.60.0.8;awa;failure;normal",
    "2025-11-03T08:00:20Z;10.60.0.8;awa;failure;normal",
    "2025-11-03T08:00:40Z;10.60.0.8;awa;failure;attaque",
    "2025-11-03T08:01:00Z;10.60.0.8;awa;failure;attaque",
    "2025-11-03T08:01:20Z;10.60.0.8;awa;failure;attaque",
    "EOF",
    "alertes_demo=$(awk -F';' 'NR>1 {t=$1; n[$2]++} END{for (ip in n) print ip, n[ip]}' demo-evenements.csv | awk '$2>=5 {print $1}' | wc -l)",
    "printf 'Demo detection prete : %s groupe(s) atteignent un seuil invente.\\n' \"$alertes_demo\"",
    "```",
    "",
    "## PowerShell 5.1",
    "",
    "```powershell",
    "@'",
    "TimeUtc;SourceIp;Account;Result;Truth",
    "2025-11-03T08:00:00Z;10.60.0.8;awa;failure;normal",
    "2025-11-03T08:00:20Z;10.60.0.8;awa;failure;normal",
    "2025-11-03T08:00:40Z;10.60.0.8;awa;failure;attaque",
    "2025-11-03T08:01:00Z;10.60.0.8;awa;failure;attaque",
    "2025-11-03T08:01:20Z;10.60.0.8;awa;failure;attaque",
    "'@ | Set-Content -Encoding UTF8 demo-evenements.csv",
    "$rows = Import-Csv demo-evenements.csv -Delimiter ';'",
    "$groupCount = ($rows | Group-Object SourceIp | Where-Object { $_.Count -ge 5 }).Count",
    "\"Demo detection prete : $groupCount groupe(s) atteignent un seuil invente.\"",
    "```",
  ].join("\n") + "\n";

  const files = { eventsText, rulesText, guideText };
  const answers = deriveTp5Facts(files);

  return {
    files: [
      { name: "slg-tp5-evenements.csv", data: text(eventsText) },
      { name: "slg-tp5-regles.md", data: text(rulesText) },
      { name: "slg-tp5-guide.md", data: text(guideText) },
    ],
    facts: {
      assetNames: {
        eventsFile: "slg-tp5-evenements.csv",
        rulesFile: "slg-tp5-regles.md",
        guideFile: "slg-tp5-guide.md",
      },
      answers,
    },
  };
}

function buildLogsAssetsB() {
  const tp4 = buildTp4();
  const tp5 = buildTp5();
  return {
    files: [...tp4.files, ...tp5.files],
    facts: {
      correlation: tp4.facts,
      detection: tp5.facts,
    },
  };
}

module.exports = { buildLogsAssetsB };
