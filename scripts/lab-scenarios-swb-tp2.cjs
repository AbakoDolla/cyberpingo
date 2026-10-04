"use strict";

const { URLSearchParams } = require("node:url");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ACCESS_FILE = "swb-tp2-acces.log";
const SQL_FILE = "swb-tp2-requetes-sql.log";
const APP_FILE = "swb-tp2-appli.js";
const GUIDE_FILE = "swb-tp2-guide.md";
const SEARCH_ROUTE = "/api/chambres/recherche";
const LOGIN_ROUTE = "/connexion";
const BOOK_ROUTE = "/api/reservations";
const EXPORT_ROUTE = "/admin/export";
const DB_USER = "resa_app_admin";
const BYPASS_ACCOUNT = "staff_reception";
const UNION_TABLE = "clients_reservations";
const INJECTION_PATTERNS = ["' or '1'='1", "union select", "sleep(", "'--", "or 1=1"];

const text = (value) => Buffer.from(value.replace(/\r?\n/g, "\n"), "utf8");
const pad = (value) => String(value).padStart(2, "0");
const compact = (values) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let tmp = Math.imul(state ^ (state >>> 15), 1 | state);
    tmp = (tmp + Math.imul(tmp ^ (tmp >>> 7), 61 | tmp)) ^ tmp;
    return ((tmp ^ (tmp >>> 14)) >>> 0) / 4294967296;
  };
}

function iso(value) {
  return new Date(value).toISOString();
}

function nginxStamp(value) {
  const date = new Date(value);
  return `${pad(date.getUTCDate())}/${MONTHS[date.getUTCMonth()]}/${date.getUTCFullYear()}:${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} +0000`;
}

function sqlQuote(value) {
  return String(value).replace(/'/g, "''");
}

function renderAccess(entry) {
  return `${entry.ip} - - [${nginxStamp(entry.time)}] "${entry.method} ${entry.target} HTTP/1.1" ${entry.status} ${entry.bytes} "${entry.referer}" "${entry.agent}"`;
}

function renderSql(entry) {
  return `${entry.ts} | req=${entry.reqId} | route=${entry.route} | db_user=${entry.dbUser} | rows=${entry.rows} | duration_ms=${entry.durationMs} | result_user=${entry.resultUser || "-"} | sql=${entry.sql} | params=${entry.params}`;
}

function decodeTarget(target) {
  const query = target.includes("?") ? target.slice(target.indexOf("?") + 1) : "";
  return decodeURIComponent(query.replace(/\+/g, "%20")).toLowerCase();
}

function hasInjectionPattern(target) {
  const decoded = decodeTarget(target);
  return INJECTION_PATTERNS.some((pattern) => decoded.includes(pattern));
}

function buildGuide() {
  return [
    "# TP 2 : repérer une injection sans deviner",
    "",
    "> Cadre et limites : tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
    "> Les exemples ci-dessous utilisent des valeurs inventées, pas celles du labo. Ils servent à apprendre la méthode.",
    "",
    "## 1. Ce qu’il faut chercher",
    "",
    "Le labo compte une requête comme tentative si sa chaîne de requête, une fois décodée, contient l’un des motifs suivants : « ' OR '1'='1 », « UNION SELECT », « sleep( », « '-- » ou « OR 1=1 ».",
    "Une apostrophe légitime dans un nom de ville ou de client ne suffit donc pas. Commence toujours par décoder la chaîne de requête avant de compter : « %27 » donne une apostrophe, « %20 » donne une espace, et le signe « + » vaut lui aussi une espace dans une chaîne de requête.",
    "",
    "## 2. Visionneuse du site",
    "",
    "Dans la visionneuse, cherche d’abord « %27 », puis « union », puis « sleep ». Ouvre ensuite la ligne correspondante dans le journal SQL avec l’identifiant de requête, par exemple « rid » ou « req ».",
    "",
    "## 3. Exemple Bash sur des données inventées",
    "",
    "```bash",
    "cat > guide-acces-exemple.log <<'EOF'",
    "198.51.100.30 - - [05/May/2026:08:10:00 +0000] \"GET /api/recherche?ville=Dakar&rid=demo-01 HTTP/1.1\" 200 812 \"-\" \"Mozilla/5.0\"",
    "203.0.113.200 - - [05/May/2026:08:11:00 +0000] \"GET /api/recherche?ville=%27+OR+%271%27%3D%271&rid=demo-02 HTTP/1.1\" 500 240 \"-\" \"curl/8.7.1\"",
    "EOF",
    "grep -o '\"GET [^\"]*\"' guide-acces-exemple.log | sed 's/^\"GET //; s/ HTTP\\/1.1\"$//' | while read -r url; do",
    "  q=\"${url#*?}\"",
    "  q=\"${q//+/ }\"",
    "  d=$(printf '%b' \"${q//%/\\\\x}\" | tr '[:upper:]' '[:lower:]')",
    "  case \"$d\" in",
    "    *\"' or '1'='1\"*|*\"union select\"*|*\"sleep(\"*|*\"'--\"*|*\"or 1=1\"*) echo \"$d\" ;;",
    "  esac",
    "done | wc -l",
    "```",
    "",
    "## 4. Exemple PowerShell 5.1 sur des données inventées",
    "",
    "```powershell",
    "@(",
    "  '198.51.100.30 - - [05/May/2026:08:10:00 +0000] \"GET /api/recherche?ville=Dakar&rid=demo-01 HTTP/1.1\" 200 812 \"-\" \"Mozilla/5.0\"',",
    "  '203.0.113.200 - - [05/May/2026:08:11:00 +0000] \"GET /api/recherche?ville=%27+OR+%271%27%3D%271&rid=demo-02 HTTP/1.1\" 500 240 \"-\" \"curl/8.7.1\"'",
    ") | Set-Content -Encoding UTF8 guide-acces-exemple.log",
    "$motifs = @(\"' or '1'='1\", 'union select', 'sleep(', \"'--\", 'or 1=1')",
    "$total = 0",
    "Get-Content -Encoding UTF8 guide-acces-exemple.log | ForEach-Object {",
    "  if ($_ -match '\"GET (?<u>[^ ]+) HTTP/1.1\"') {",
    "    $decoded = [System.Uri]::UnescapeDataString($Matches.u.Replace('+', ' ')).ToLowerInvariant()",
    "    if ($motifs | Where-Object { $decoded.Contains($_) }) { $total++ }",
    "  }",
    "}",
    "$total",
    "```",
    "",
    "## 5. Relier un accès et son SQL",
    "",
    "```bash",
    "cat > guide-sql-exemple.log <<'EOF'",
    "2026-05-05T08:11:00.000Z | req=demo-02 | route=/api/recherche | db_user=demo_reader | rows=0 | duration_ms=41 | result_user=- | sql=SELECT id FROM chambres WHERE ville = '' OR '1'='1' | params=[]",
    "EOF",
    "req=$(grep -o 'rid=demo-02' guide-acces-exemple.log | head -n 1 | cut -d= -f2)",
    "grep \"req=$req\" guide-sql-exemple.log",
    "```",
    "",
    "```powershell",
    "@('2026-05-05T08:11:00.000Z | req=demo-02 | route=/api/recherche | db_user=demo_reader | rows=0 | duration_ms=41 | result_user=- | sql=SELECT id FROM chambres WHERE ville = '''' OR ''1''=''1'' | params=[]') | Set-Content -Encoding UTF8 guide-sql-exemple.log",
    "$req = Select-String -Path guide-acces-exemple.log -Pattern 'rid=demo-02' | Select-Object -First 1",
    "Get-Content -Encoding UTF8 guide-sql-exemple.log | Select-String -Pattern 'req=demo-02'",
    "```",
    "",
    "## 6. Lire le code",
    "",
    "Quand une route construit son SQL avec la donnée de l’utilisateur dans une chaîne, elle reste vulnérable même si elle retire quelques caractères. La correction correcte consiste à paramétrer la requête et à limiter les droits du compte SQL.",
  ].join("\n");
}

function buildAppSource() {
  return [
    "const express = require(\"express\");",
    "const { exec } = require(\"node:child_process\");",
    "const app = express();",
    "",
    "app.use(express.json());",
    "app.use(express.urlencoded({ extended: false }));",
    "",
    `const dbConfig = { user: "${DB_USER}", host: "127.0.0.1", database: "palmier_or" };`,
    "const db = {",
    "  query(sql, params) {",
    "    return Promise.resolve({ sql, params, rows: [] });",
    "  },",
    "};",
    "",
    "function currentReqId(req) {",
    "  return req.query.rid || req.headers[\"x-request-id\"] || \"sans-rid\";",
    "}",
    "",
    "function parsePositiveInt(value, fallback) {",
    "  const parsed = Number(value);",
    "  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;",
    "}",
    "",
    "function mapRoom(row) {",
    "  return { id: row.id, code: row.code, ville: row.ville, tarif: row.tarif };",
    "}",
    "",
    "function audit(req, routeName) {",
    "  return { routeName, reqId: currentReqId(req) };",
    "}",
    "",
    "app.get(\"/sante\", async (_req, res) => {",
    "  res.json({ ok: true });",
    "});",
    "",
    `app.get("${SEARCH_ROUTE}", async (req, res) => {`,
    "  const auditInfo = audit(req, \"search\");",
    "  const ville = String(req.query.ville || \"\").trim();",
    "  const statut = String(req.query.statut || \"libre\").trim();",
    "  const limite = parsePositiveInt(req.query.limite || 20, 20);",
    "  const sql = \"SELECT id, code, ville, tarif FROM chambres WHERE ville = '\" + ville + \"' AND statut = '\" + statut + \"' ORDER BY tarif ASC\";",
    "  const result = await db.query(sql, []);",
    "  res.json({ reqId: auditInfo.reqId, rows: result.rows.slice(0, limite).map(mapRoom).length });",
    "});",
    "",
    `app.post("${LOGIN_ROUTE}", async (req, res) => {`,
    "  const email = String(req.body.email || \"\").trim().toLowerCase();",
    "  const motdepasse = String(req.body.motdepasse || \"\");",
    "  const sql = \"SELECT id, role FROM comptes WHERE email = '\" + email + \"' AND motdepasse = '\" + motdepasse + \"' LIMIT 1\";",
    "  const result = await db.query(sql, []);",
    "  if (!result.rows.length) return res.status(401).json({ ok: false });",
    "  return res.json({ ok: true, role: result.rows[0].role });",
    "});",
    "",
    `app.post("${BOOK_ROUTE}", async (req, res) => {`,
    "  const { clientId, chambreId, arrivee, depart } = req.body;",
    "  const sql = \"INSERT INTO reservations (client_id, chambre_id, arrivee, depart) VALUES ($1, $2, $3, $4) RETURNING id\";",
    "  const result = await db.query(sql, [clientId, chambreId, arrivee, depart]);",
    "  res.status(201).json({ id: result.rows[0]?.id || null });",
    "});",
    "",
    "app.get(\"/api/clients/:id\", async (req, res) => {",
    "  const sql = \"SELECT id, nom, email FROM clients WHERE id = $1\";",
    "  const result = await db.query(sql, [req.params.id]);",
    "  res.json(result.rows[0] || null);",
    "});",
    "",
    "app.get(\"/api/chambres/:id\", async (req, res) => {",
    "  const sql = \"SELECT id, code, ville, tarif FROM chambres WHERE id = $1\";",
    "  const result = await db.query(sql, [req.params.id]);",
    "  res.json(mapRoom(result.rows[0] || { id: null, code: null, ville: null, tarif: null }));",
    "});",
    "",
    "app.get(\"/api/admin/roles\", async (_req, res) => {",
    "  const sql = \"SELECT role, description FROM roles ORDER BY role ASC\";",
    "  const result = await db.query(sql, []);",
    "  res.json(result.rows);",
    "});",
    "",
    `app.get("${EXPORT_ROUTE}", (req, res) => {`,
    "  const cible = String(req.query.cible || \"liste.csv\");",
    "  exec(\"/usr/local/bin/export-reservations \" + cible, (error, stdout) => {",
    "    if (error) return res.status(500).json({ ok: false });",
    "    return res.type(\"text/plain\").send(stdout);",
    "  });",
    "});",
    "",
    "app.use((err, _req, res, _next) => {",
    "  res.status(500).json({ erreur: err.message });",
    "});",
    "",
    "module.exports = { app, dbConfig };",
  ].join("\n");
}

function buildScenario() {
  const rng = mulberry32(0x5ab22002);
  const base = Date.parse("2026-05-05T08:00:00Z");
  const access = [];
  const sql = [];
  let reqSeq = 6000;
  const legitCities = ["Dakar", "Abidjan", "Lome", "N'Djamena", "Porto-Novo", "Cotonou", "Saint-Louis"];
  const legitNames = ["O'Neil", "Kone", "Toure", "Faye"];
  const normalIps = ["172.20.10.21", "172.20.10.22", "172.20.10.24", "10.30.50.14", "10.30.50.19", "198.51.100.8"];
  const agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0",
    "Mozilla/5.0 (X11; Linux x86_64) Firefox/126.0",
    "Mozilla/5.0 (Linux; Android 14) Mobile Safari/537.36",
    "Pingdom-Health/2.0",
  ];

  function nextReqId() {
    reqSeq += 1;
    return `req-${reqSeq}`;
  }

  function pushAccess(entry) {
    access.push(Object.assign({ referer: "-", agent: agents[0] }, entry));
  }

  function pushSql(entry) {
    sql.push(Object.assign({ dbUser: DB_USER, resultUser: "-", params: "[]" }, entry));
  }

  for (let index = 0; index < 430; index += 1) {
    const time = base + index * 17000 + Math.floor(rng() * 5000);
    const reqId = nextReqId();
    const roll = rng();
    if (roll < 0.1) {
      pushAccess({ time, ip: "198.51.100.8", method: "GET", target: "/sante", status: 200, bytes: 148, agent: agents[3] });
      continue;
    }
    if (roll < 0.22) {
      pushAccess({ time, ip: normalIps[index % normalIps.length], method: "GET", target: ["/robots.txt", "/wp-login.php", "/admin.php"][index % 3], status: 404, bytes: 612, agent: agents[1] });
      continue;
    }
    if (roll < 0.55) {
      const city = legitCities[index % legitCities.length];
      const qs = new URLSearchParams({ ville: city, statut: "libre", rid: reqId }).toString();
      pushAccess({ time, ip: normalIps[index % normalIps.length], method: "GET", target: `${SEARCH_ROUTE}?${qs}`, status: 200, bytes: 1300 + (index % 9) * 91, agent: agents[index % 3] });
      pushSql({
        ts: iso(time),
        reqId,
        route: SEARCH_ROUTE,
        rows: 1 + (index % 4),
        durationMs: 10 + (index % 9) * 3,
        sql: `SELECT id, code, ville, tarif FROM chambres WHERE ville = '${sqlQuote(city)}' AND statut = 'libre' ORDER BY tarif ASC`,
      });
      continue;
    }
    if (roll < 0.72) {
      const client = legitNames[index % legitNames.length];
      const qs = new URLSearchParams({ client, rid: reqId }).toString();
      pushAccess({ time, ip: normalIps[index % normalIps.length], method: "GET", target: `/reservation?${qs}`, status: 200, bytes: 2140 + (index % 7) * 73, agent: agents[index % 3] });
      continue;
    }
    if (roll < 0.88) {
      pushAccess({ time, ip: normalIps[index % normalIps.length], method: "GET", target: ["/", "/chambres", "/contact", "/espace-client"][index % 4], status: 200, bytes: 980 + (index % 11) * 120, agent: agents[index % 3] });
      continue;
    }
    const reqIdBook = nextReqId();
    pushAccess({ time, ip: "172.20.10.22", method: "POST", target: `${BOOK_ROUTE}?rid=${reqIdBook}`, status: 201, bytes: 296, agent: agents[0], referer: "https://reservation.palmier-or.example/chambres" });
    pushSql({
      ts: iso(time),
      reqId: reqIdBook,
      route: BOOK_ROUTE,
      rows: 1,
      durationMs: 18 + (index % 5),
      sql: "INSERT INTO reservations (client_id, chambre_id, arrivee, depart) VALUES ($1, $2, $3, $4) RETURNING id",
      params: "[1042, 212, \"2026-05-18\", \"2026-05-20\"]",
    });
  }

  const injectedSearches = [
    ["203.0.113.45", "2026-05-05T08:17:04Z", "' OR '1'='1", 500, 248, 0, "SELECT id, code, ville, tarif FROM chambres WHERE ville = '' OR '1'='1' AND statut = 'libre' ORDER BY tarif ASC"],
    ["203.0.113.45", "2026-05-05T08:19:12Z", "Lome'--", 500, 250, 0, "SELECT id, code, ville, tarif FROM chambres WHERE ville = 'Lome'--' AND statut = 'libre' ORDER BY tarif ASC"],
    ["198.51.100.77", "2026-05-05T08:26:09Z", "' UNION SELECT client_id, nom, email, 0 FROM clients_reservations --", 200, 19421, 37, "SELECT id, code, ville, tarif FROM chambres WHERE ville = '' UNION SELECT client_id, nom, email, 0 FROM clients_reservations --' AND statut = 'libre' ORDER BY tarif ASC"],
    ["203.0.113.45", "2026-05-05T08:33:41Z", "' UNION SELECT client_id, nom, email, 0 FROM clients_reservations --", 200, 18462, 29, "SELECT id, code, ville, tarif FROM chambres WHERE ville = '' UNION SELECT client_id, nom, email, 0 FROM clients_reservations --' AND statut = 'libre' ORDER BY tarif ASC"],
    ["203.0.113.91", "2026-05-05T08:44:23Z", "' OR 1=1", 500, 246, 0, "SELECT id, code, ville, tarif FROM chambres WHERE ville = '' OR 1=1' AND statut = 'libre' ORDER BY tarif ASC"],
    ["203.0.113.45", "2026-05-05T08:58:11Z", "' UNION SELECT client_id, nom, email, 0 FROM clients_reservations --", 200, 17754, 24, "SELECT id, code, ville, tarif FROM chambres WHERE ville = '' UNION SELECT client_id, nom, email, 0 FROM clients_reservations --' AND statut = 'libre' ORDER BY tarif ASC"],
    ["198.51.100.77", "2026-05-05T09:03:36Z", "' OR '1'='1", 500, 245, 0, "SELECT id, code, ville, tarif FROM chambres WHERE ville = '' OR '1'='1' AND statut = 'libre' ORDER BY tarif ASC"],
    ["203.0.113.45", "2026-05-05T09:12:17Z", "' UNION SELECT client_id, nom, email, 0 FROM clients_reservations --", 200, 18112, 26, "SELECT id, code, ville, tarif FROM chambres WHERE ville = '' UNION SELECT client_id, nom, email, 0 FROM clients_reservations --' AND statut = 'libre' ORDER BY tarif ASC"],
    ["203.0.113.45", "2026-05-05T09:28:02Z", "' OR '1'='1", 500, 247, 0, "SELECT id, code, ville, tarif FROM chambres WHERE ville = '' OR '1'='1' AND statut = 'libre' ORDER BY tarif ASC"],
    ["198.51.100.77", "2026-05-05T09:35:47Z", "' UNION SELECT client_id, nom, email, 0 FROM clients_reservations --", 200, 17310, 21, "SELECT id, code, ville, tarif FROM chambres WHERE ville = '' UNION SELECT client_id, nom, email, 0 FROM clients_reservations --' AND statut = 'libre' ORDER BY tarif ASC"],
  ];

  const bypassLogins = [
    ["203.0.113.45", "2026-05-05T10:05:14Z", "' OR '1'='1", 302, 412, 1],
    ["203.0.113.45", "2026-05-05T10:08:33Z", "' OR 1=1", 302, 409, 1],
    ["198.51.100.77", "2026-05-05T10:19:20Z", "' OR '1'='1", 302, 415, 1],
  ];

  injectedSearches.forEach(([ip, ts, payload, status, bytes, rows, sqlText]) => {
    const reqId = nextReqId();
    const query = new URLSearchParams({ ville: payload, statut: "libre", rid: reqId }).toString();
    pushAccess({ time: Date.parse(ts), ip, method: "GET", target: `${SEARCH_ROUTE}?${query}`, status, bytes, agent: "curl/8.7.1" });
    pushSql({ ts, reqId, route: SEARCH_ROUTE, rows, durationMs: status === 500 ? 41 : 96, sql: sqlText });
  });

  bypassLogins.forEach(([ip, ts, payload, status, bytes, rows]) => {
    const reqId = nextReqId();
    const query = new URLSearchParams({ email: "reception@palmier-or.example", motdepasse: payload, rid: reqId }).toString();
    pushAccess({ time: Date.parse(ts), ip, method: "POST", target: `${LOGIN_ROUTE}?${query}`, status, bytes, agent: "curl/8.7.1", referer: "https://reservation.palmier-or.example/connexion" });
    pushSql({
      ts,
      reqId,
      route: LOGIN_ROUTE,
      rows,
      durationMs: 33,
      resultUser: BYPASS_ACCOUNT,
      sql: "SELECT id, role FROM comptes WHERE email = 'reception@palmier-or.example' AND motdepasse = '' OR '1'='1' LIMIT 1",
    });
  });

  access.sort((left, right) => left.time - right.time || left.target.localeCompare(right.target));
  sql.sort((left, right) => left.ts.localeCompare(right.ts) || left.reqId.localeCompare(right.reqId));

  const attempts = access.filter((entry) => hasInjectionPattern(entry.target));
  const counts = attempts.reduce((map, entry) => map.set(entry.ip, (map.get(entry.ip) || 0) + 1), new Map());
  const topAttacker = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const largestAttempt = attempts.slice().sort((a, b) => b.bytes - a.bytes)[0];
  const linkedSql = sql.find((entry) => entry.reqId === /rid=([^&]+)/.exec(largestAttempt.target)[1]);
  const bypassRows = sql.filter((entry) => entry.route === LOGIN_ROUTE && entry.resultUser === BYPASS_ACCOUNT);

  return {
    access,
    sql,
    appSource: buildAppSource(),
    guide: buildGuide(),
    facts: {
      assetNames: { access: ACCESS_FILE, sql: SQL_FILE, code: APP_FILE, guide: GUIDE_FILE },
      vulnerableSearchRoute: SEARCH_ROUTE,
      injectionRequestCount: attempts.length,
      topAttackerIp: topAttacker,
      firstAttemptUtc: iso(attempts[0].time).slice(11, 19),
      injection500Count: attempts.filter((entry) => entry.status === 500).length,
      maxAttemptBytes: largestAttempt.bytes,
      maxAttemptIp: largestAttempt.ip,
      maxAttemptRows: linkedSql.rows,
      unionTable: UNION_TABLE,
      commandInjectionRoute: EXPORT_ROUTE,
      bypassLoginCount: bypassRows.length,
      bypassAccount: BYPASS_ACCOUNT,
      dbUser: DB_USER,
      leastPrivilegeLetter: "b",
      searchFixLetter: "c",
    },
  };
}

function buildSwbAssetsTp2() {
  const scenario = buildScenario();
  return {
    files: [
      { name: ACCESS_FILE, data: text(scenario.access.map(renderAccess).join("\n")) },
      { name: SQL_FILE, data: text(scenario.sql.map(renderSql).join("\n")) },
      { name: APP_FILE, data: text(scenario.appSource) },
      { name: GUIDE_FILE, data: text(scenario.guide) },
    ],
    facts: { swbTp2: scenario.facts },
  };
}

module.exports = { buildSwbAssetsTp2 };
