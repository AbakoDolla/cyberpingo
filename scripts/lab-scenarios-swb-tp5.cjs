"use strict";

const text = (value) => Buffer.from(value.replace(/\r?\n/g, "\n"), "utf8");

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (value) => String(value).padStart(2, "0");
const iso = (value) => new Date(value).toISOString();

function topEntry(map) {
  return [...map.entries()].sort((left, right) => right[1] - left[1] || String(left[0]).localeCompare(String(right[0])))[0];
}

function pathKey(method, path) {
  const bare = path.split("?")[0];
  if (method === "GET" && /^\/api\/reservations\/\d+$/u.test(bare)) return "/api/reservations/{id}";
  if (method === "GET" && /^\/api\/factures\/\d+$/u.test(bare)) return "/api/factures/{id}";
  if (method === "GET" && bare === "/api/apercu") return "/api/apercu";
  return bare;
}

function hostFromUrl(raw) {
  return new URL(raw).hostname;
}

function isPrivateOrLocal(host) {
  if (/^127\./u.test(host)) return true;
  if (/^10\./u.test(host)) return true;
  if (/^169\.254\./u.test(host)) return true;
  if (/^192\.168\./u.test(host)) return true;
  const match = /^172\.(\d{1,3})\./u.exec(host);
  return match ? Number(match[1]) >= 16 && Number(match[1]) <= 31 : false;
}

function buildSwbAssetsTp5() {
  const rng = mulberry32(0x57b50005);
  const base = Date.parse("2026-05-08T08:00:00Z");
  const clientIds = Array.from({ length: 28 }, (_, index) => String(1301 + index));
  const reservationOwner = new Map();
  const invoiceOwner = new Map();
  const reservationIdsByOwner = new Map(clientIds.map((id) => [id, []]));
  const invoiceIdsByOwner = new Map(clientIds.map((id) => [id, []]));
  const apiRows = [];
  const outgoingRows = [];

  for (let id = 4700; id <= 4879; id += 1) {
    const owner = clientIds[(id * 5) % clientIds.length];
    reservationOwner.set(id, owner);
  }
  for (let id = 9100; id <= 9179; id += 1) {
    const owner = clientIds[(id * 3) % clientIds.length];
    invoiceOwner.set(id, owner);
  }
  [4820, 4821, 4822, 4823, 4824, 4825, 4826, 4827, 4828, 4829, 4830, 4831].forEach((id, index) => reservationOwner.set(id, clientIds[(index + 4) % clientIds.length]));
  [9141, 9145, 9149].forEach((id, index) => invoiceOwner.set(id, clientIds[(index + 9) % clientIds.length]));
  for (const [id, owner] of reservationOwner.entries()) reservationIdsByOwner.get(owner).push(id);
  for (const [id, owner] of invoiceOwner.entries()) invoiceIdsByOwner.get(owner).push(id);

  const rights = [
    { method: "GET", route: "/api/chambres", roles: ["client", "staff", "admin"], ownerRequired: "non" },
    { method: "GET", route: "/api/me", roles: ["client", "staff", "admin"], ownerRequired: "non" },
    { method: "GET", route: "/api/reservations/{id}", roles: ["client"], ownerRequired: "oui" },
    { method: "GET", route: "/api/factures/{id}", roles: ["client"], ownerRequired: "oui" },
    { method: "GET", route: "/api/staff/arrivees", roles: ["staff", "admin"], ownerRequired: "non" },
    { method: "POST", route: "/api/staff/remises", roles: ["staff", "admin"], ownerRequired: "non" },
    { method: "GET", route: "/api/admin/rapports/journalier", roles: ["admin"], ownerRequired: "non" },
    { method: "GET", route: "/api/apercu", roles: ["client", "staff", "admin"], ownerRequired: "non" },
  ];
  const rightsMap = new Map(rights.map((row) => [`${row.method} ${row.route}`, row]));

  const addApi = (entry) => apiRows.push(entry);
  const addOutgoing = (entry) => outgoingRows.push(entry);

  for (let index = 0; index < 560; index += 1) {
    const userId = clientIds[index % clientIds.length];
    const tokenId = `tok-${userId}-${index % 2 === 0 ? "web" : "mobile"}`;
    const slot = index % 10;
    const stamp = base + index * 43000 + Math.floor(rng() * 12000);
    if (slot <= 2) {
      const ids = reservationIdsByOwner.get(userId);
      const objectId = ids[index % ids.length];
      addApi({ ts: iso(stamp), tokenId, userId, role: "client", method: "GET", path: `/api/reservations/${objectId}`, status: 200, ownerId: userId, bytes: 1800 + (index % 9) * 73 });
    } else if (slot <= 4) {
      const ids = invoiceIdsByOwner.get(userId);
      const objectId = ids[index % ids.length];
      addApi({ ts: iso(stamp), tokenId, userId, role: "client", method: "GET", path: `/api/factures/${objectId}`, status: 200, ownerId: userId, bytes: 1320 + (index % 7) * 61 });
    } else if (slot <= 6) {
      addApi({ ts: iso(stamp), tokenId, userId, role: "client", method: "GET", path: "/api/chambres", status: index % 4 === 0 ? 304 : 200, ownerId: null, bytes: 2100 + (index % 13) * 54 });
    } else if (slot === 7) {
      addApi({ ts: iso(stamp), tokenId, userId, role: "client", method: "GET", path: "/api/me", status: 200, ownerId: null, bytes: 980 + (index % 5) * 41 });
    } else if (slot === 8) {
      const url = encodeURIComponent(`https://cdn-brochures.example/${200 + (index % 5)}.pdf`);
      addApi({ ts: iso(stamp), tokenId, userId, role: "client", method: "GET", path: `/api/apercu?url=${url}`, status: 200, ownerId: null, bytes: 860 + (index % 3) * 44 });
    } else {
      const staffUser = index % 20 === 0 ? "jbouedraogo" : index % 2 === 0 ? "msylla" : "adiop";
      const role = staffUser === "jbouedraogo" ? "admin" : "staff";
      const method = index % 20 === 0 ? "GET" : index % 4 === 0 ? "POST" : "GET";
      const path = method === "POST" ? "/api/staff/remises" : role === "admin" ? "/api/admin/rapports/journalier" : "/api/staff/arrivees";
      addApi({ ts: iso(stamp), tokenId: `tok-${staffUser}-console`, userId: staffUser, role, method, path, status: 200, ownerId: null, bytes: 1480 + (index % 6) * 52 });
    }
  }

  const enumTimes = [
    "2026-05-08T09:12:11Z", "2026-05-08T09:12:26Z", "2026-05-08T09:12:41Z", "2026-05-08T09:12:55Z",
    "2026-05-08T09:13:08Z", "2026-05-08T09:13:22Z", "2026-05-08T09:13:37Z", "2026-05-08T09:13:52Z",
    "2026-05-08T09:14:07Z", "2026-05-08T09:14:22Z", "2026-05-08T09:14:37Z", "2026-05-08T09:14:53Z",
  ];
  enumTimes.forEach((stamp, index) => addApi({ ts: stamp, tokenId: "tok-1318-mobile", userId: "1318", role: "client", method: "GET", path: `/api/reservations/${4820 + index}`, status: 200, ownerId: reservationOwner.get(4820 + index), bytes: 1930 + index * 8 }));
  [9141, 9145, 9149].forEach((id, index) => addApi({ ts: iso(Date.parse("2026-05-08T10:01:11Z") + index * 47000), tokenId: "tok-1318-mobile", userId: "1318", role: "client", method: "GET", path: `/api/factures/${id}`, status: 200, ownerId: invoiceOwner.get(id), bytes: 1460 + index * 20 }));
  [4744, 4745].forEach((id, index) => addApi({ ts: iso(Date.parse("2026-05-08T10:11:00Z") + index * 60000), tokenId: "tok-1312-web", userId: "1312", role: "client", method: "GET", path: `/api/reservations/${id}`, status: 200, ownerId: reservationOwner.get(id), bytes: 1888 + index * 30 }));
  [9152, 9156].forEach((id, index) => addApi({ ts: iso(Date.parse("2026-05-08T10:16:00Z") + index * 45000), tokenId: "tok-1324-mobile", userId: "1324", role: "client", method: "GET", path: `/api/factures/${id}`, status: 200, ownerId: invoiceOwner.get(id), bytes: 1415 + index * 25 }));

  const roleViolations = [
    ["2026-05-08T10:32:10Z", "1318", "tok-1318-mobile", "GET", "/api/staff/arrivees"],
    ["2026-05-08T10:32:42Z", "1318", "tok-1318-mobile", "GET", "/api/staff/arrivees"],
    ["2026-05-08T10:33:17Z", "1318", "tok-1318-mobile", "POST", "/api/staff/remises"],
    ["2026-05-08T10:33:51Z", "1318", "tok-1318-mobile", "POST", "/api/staff/remises"],
    ["2026-05-08T10:34:26Z", "1142", "tok-1142-web", "GET", "/api/admin/rapports/journalier"],
    ["2026-05-08T10:35:01Z", "1142", "tok-1142-web", "GET", "/api/admin/rapports/journalier"],
    ["2026-05-08T10:35:33Z", "1307", "tok-1307-mobile", "GET", "/api/staff/arrivees"],
  ];
  roleViolations.forEach(([ts, userId, tokenId, method, path], index) => addApi({ ts, tokenId, userId, role: "client", method, path, status: 200, ownerId: null, bytes: 1200 + index * 33 }));

  for (let index = 0; index < 29; index += 1) {
    const stamp = Date.parse("2026-05-08T09:47:00Z") + index * 1900;
    addApi({ ts: iso(stamp), tokenId: "tok-1204-mobile", userId: "1204", role: "client", method: "GET", path: "/api/chambres", status: 200, ownerId: null, bytes: 2260 + index });
  }

  for (let index = 0; index < 126; index += 1) {
    const userId = clientIds[index % clientIds.length];
    const stamp = base + index * 52000 + Math.floor(rng() * 8000);
    const url = [
      "https://cdn-brochures.example/tarifs.pdf",
      "https://photos-partenaire.example/chambre-superieure.jpg",
      "https://api-meteo.example/prevision",
      "https://paiement-exemple.example/logo.png",
    ][index % 4];
    addOutgoing({ ts: iso(stamp), userId, route: `/api/apercu?url=${encodeURIComponent(url)}`, url, status: index % 9 === 0 ? 304 : 200, bytes: 1700 + (index % 11) * 97 });
  }
  [
    ["2026-05-08T09:03:11Z", "1318", "http://172.20.20.15:8080/health", 200, 412],
    ["2026-05-08T09:04:20Z", "1318", "http://127.0.0.1:3000/debug", 200, 388],
    ["2026-05-08T09:05:30Z", "1318", "http://169.254.169.254/latest/meta-data/iam/info", 200, 2048],
    ["2026-05-08T09:06:10Z", "1318", "http://169.254.169.254/latest/meta-data/instance-id", 200, 2048],
    ["2026-05-08T09:06:55Z", "1318", "http://10.30.50.25:8081/cache", 502, 150],
    ["2026-05-08T09:07:22Z", "1318", "http://172.20.20.18:9090/metrics", 403, 221],
    ["2026-05-08T09:08:01Z", "1318", "http://169.254.169.254/latest/meta-data/iam/security-credentials/", 200, 3120],
    ["2026-05-08T09:09:10Z", "1324", "http://172.20.20.19:8080/status", 200, 455],
  ].forEach(([ts, userId, url, status, bytes]) => addOutgoing({ ts, userId, route: `/api/apercu?url=${encodeURIComponent(url)}`, url, status, bytes }));

  apiRows.sort((left, right) => left.ts.localeCompare(right.ts) || left.path.localeCompare(right.path));
  outgoingRows.sort((left, right) => left.ts.localeCompare(right.ts) || left.url.localeCompare(right.url));

  const apiText = `${apiRows.map((row) => JSON.stringify(row)).join("\n")}\n`;
  const rightsText = `methode;route;roles_autorises;proprietaire_requis\n${rights.map((row) => `${row.method};${row.route};${row.roles.join("|")};${row.ownerRequired}`).join("\n")}\n`;
  const outgoingText = `${outgoingRows.map((row) => `${row.ts} user=${row.userId} route=${row.route} url=${row.url} status=${row.status} bytes=${row.bytes}`).join("\n")}\n`;
  const guideText = [
    "# Guide du TP 5 : comparer la matrice de droits, les objets et les sorties réseau",
    "",
    "> Cadre et limites",
    ">",
    "> Toutes les données de ce laboratoire sont fictives et figées.",
    "> Tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
    "> Les exemples ci-dessous utilisent des valeurs inventées, pas celles du labo.",
    "",
    "## Méthode",
    "",
    "1. Ramène chaque requête à sa route logique, par exemple « GET /api/reservations/{id} ».",
    "2. Lis la matrice : si « propriétaire requis » vaut oui, compare l’utilisateur du jeton à l’identifiant du propriétaire de l’objet.",
    "3. Pour une route réservée au personnel, vérifie d’abord le rôle autorisé, puis le code HTTP réellement renvoyé.",
    "4. Pour une série séquentielle, trie les identifiants lus et vérifie qu’ils se suivent sans trou.",
    "5. Pour un débit par minute, coupe le texte de l’horodatage à « AAAA-MM-JJTHH:MM » (ses 16 premiers caractères) puis compte par jeton. Ne convertis pas l’horodatage en date locale : le « Z » final veut dire UTC, et une conversion décalerait l’heure.",
    "6. Pour le SSRF, traite comme sensibles les adresses privées, locales et de lien local, par exemple 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.1 et 169.254.0.0/16.",
    "",
    "## Bash ou Git Bash",
    "",
    "```bash",
    "cat > demo-api.jsonl <<'EOF'",
    "{\"ts\":\"2026-03-10T09:00:00Z\",\"tokenId\":\"tok-demo\",\"userId\":\"7101\",\"role\":\"client\",\"method\":\"GET\",\"path\":\"/api/reservations/8801\",\"status\":200,\"ownerId\":\"7109\",\"bytes\":1800}",
    "{\"ts\":\"2026-03-10T09:00:21Z\",\"tokenId\":\"tok-demo\",\"userId\":\"7101\",\"role\":\"client\",\"method\":\"GET\",\"path\":\"/api/reservations/8802\",\"status\":200,\"ownerId\":\"7108\",\"bytes\":1810}",
    "{\"ts\":\"2026-03-10T09:01:01Z\",\"tokenId\":\"tok-demo-2\",\"userId\":\"7200\",\"role\":\"staff\",\"method\":\"GET\",\"path\":\"/api/staff/arrivees\",\"status\":200,\"ownerId\":null,\"bytes\":900}",
    "EOF",
    "mismatch_demo=$(grep -c '\"path\":\"/api/reservations/' demo-api.jsonl)",
    "cat > demo-sortant.log <<'EOF'",
    "2026-03-10T09:02:00Z user=7101 route=/api/apercu?url=http%3A%2F%2F127.0.0.1%2Fdebug url=http://127.0.0.1/debug status=200 bytes=320",
    "2026-03-10T09:03:00Z user=7101 route=/api/apercu?url=https%3A%2F%2Fcdn-demo.example%2Fbrochure.pdf url=https://cdn-demo.example/brochure.pdf status=200 bytes=2400",
    "EOF",
    "local_demo=$(grep -E 'url=http://(127\\.|10\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|192\\.168\\.|169\\.254\\.)' demo-sortant.log | wc -l)",
    "printf 'Démo prête : %s lectures d’objets et %s sortie(s) vers une adresse locale ou privée.\\n' \"$mismatch_demo\" \"$local_demo\"",
    "```",
    "",
    "## PowerShell 5.1",
    "",
    "Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content, sinon les accents s’affichent mal.",
    "",
    "```powershell",
    "@'",
    "{\"ts\":\"2026-03-10T09:00:00Z\",\"tokenId\":\"tok-demo\",\"userId\":\"7101\",\"role\":\"client\",\"method\":\"GET\",\"path\":\"/api/reservations/8801\",\"status\":200,\"ownerId\":\"7109\",\"bytes\":1800}",
    "{\"ts\":\"2026-03-10T09:00:21Z\",\"tokenId\":\"tok-demo\",\"userId\":\"7101\",\"role\":\"client\",\"method\":\"GET\",\"path\":\"/api/reservations/8802\",\"status\":200,\"ownerId\":\"7108\",\"bytes\":1810}",
    "{\"ts\":\"2026-03-10T09:01:01Z\",\"tokenId\":\"tok-demo-2\",\"userId\":\"7200\",\"role\":\"staff\",\"method\":\"GET\",\"path\":\"/api/staff/arrivees\",\"status\":200,\"ownerId\":null,\"bytes\":900}",
    "'@ | Set-Content -Encoding UTF8 demo-api.jsonl",
    "$demoApi = Get-Content -Encoding UTF8 \"demo-api.jsonl\"",
    "$mismatchDemo = @($demoApi | Where-Object { $_ -match '\"path\":\"/api/reservations/' }).Count",
    "@'",
    "2026-03-10T09:02:00Z user=7101 route=/api/apercu?url=http%3A%2F%2F127.0.0.1%2Fdebug url=http://127.0.0.1/debug status=200 bytes=320",
    "2026-03-10T09:03:00Z user=7101 route=/api/apercu?url=https%3A%2F%2Fcdn-demo.example%2Fbrochure.pdf url=https://cdn-demo.example/brochure.pdf status=200 bytes=2400",
    "'@ | Set-Content -Encoding UTF8 demo-sortant.log",
    "$localDemo = @(Get-Content -Encoding UTF8 \"demo-sortant.log\" | Where-Object { $_ -match 'url=http://(127\\.|10\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|192\\.168\\.|169\\.254\\.)' }).Count",
    "\"Démo prête : $mismatchDemo lectures d’objets et $localDemo sortie(s) vers une adresse locale ou privée.\"",
    "```",
    "",
    "## Visionneuse du site",
    "",
    "Dans la visionneuse, filtre d’abord sur des mots génériques comme « /api/reservations/ », « /api/staff/ », « 169.254.169.254 », « 127.0.0.1 » ou « status=200 », puis relis chaque ligne complète avant de conclure.",
  ].join("\n");

  const ownerViolations = apiRows.filter((row) => {
    const rule = rightsMap.get(`${row.method} ${pathKey(row.method, row.path)}`);
    return row.status === 200 && rule && rule.ownerRequired === "oui" && row.ownerId !== row.userId;
  });
  const topUser = topEntry(ownerViolations.reduce((map, row) => map.set(row.userId, (map.get(row.userId) ?? 0) + 1), new Map()))[0];
  const topUserReservations = ownerViolations.filter((row) => row.userId === topUser && /^\/api\/reservations\/\d+$/u.test(row.path)).map((row) => Number(/(\d+)$/u.exec(row.path)[1])).sort((left, right) => left - right);
  const roleViolationsCount = apiRows.filter((row) => {
    const rule = rightsMap.get(`${row.method} ${pathKey(row.method, row.path)}`);
    return row.status === 200 && rule && !rule.roles.includes(row.role);
  }).length;
  const forbiddenCount = apiRows.filter((row) => {
    const rule = rightsMap.get(`${row.method} ${pathKey(row.method, row.path)}`);
    if (!rule || row.status !== 200) return false;
    if (!rule.roles.includes(row.role)) return true;
    return rule.ownerRequired === "oui" && row.ownerId !== row.userId;
  }).length;
  const privateRows = outgoingRows.filter((row) => isPrivateOrLocal(hostFromUrl(row.url)));
  const metadataRows = outgoingRows.filter((row) => hostFromUrl(row.url) === "169.254.169.254" && row.status === 200);
  const tokenMinuteCounts = new Map();
  for (const row of apiRows) {
    const minute = row.ts.slice(0, 16);
    const key = `${row.tokenId}|${minute}`;
    tokenMinuteCounts.set(key, (tokenMinuteCounts.get(key) ?? 0) + 1);
  }
  const peak = topEntry(tokenMinuteCounts);

  return {
    files: [
      { name: "swb-tp5-api.jsonl", data: text(apiText) },
      { name: "swb-tp5-droits.csv", data: text(rightsText) },
      { name: "swb-tp5-sortant.log", data: text(outgoingText) },
      { name: "swb-tp5-guide.md", data: text(guideText) },
    ],
    facts: {
      swbTp5: {
        assetNames: { apiFile: "swb-tp5-api.jsonl", rightsFile: "swb-tp5-droits.csv", outgoingFile: "swb-tp5-sortant.log", guideFile: "swb-tp5-guide.md" },
        ownerViolation200Count: ownerViolations.length,
        topCrossOwnerUser: topUser,
        topCrossOwnerDistinctReservations: new Set(topUserReservations).size,
        firstEnumeratedReservationId: String(topUserReservations[0]),
        lastEnumeratedReservationId: String(topUserReservations[topUserReservations.length - 1]),
        clientToStaffAdmin200Count: roleViolationsCount,
        forbidden200Count: forbiddenCount,
        privateOrLocalEgressCount: privateRows.length,
        firstInternalUserDestination: `${privateRows[0].userId},${hostFromUrl(privateRows[0].url)}`,
        metadata200Count: metadataRows.length,
        metadata200Bytes: metadataRows.reduce((sum, row) => sum + row.bytes, 0),
        peakTokenRate: peak[1],
        peakTokenMinuteUtc: peak[0].split("|")[1].slice(11),
        bolaFixLetter: "b",
        ssrfFixLetter: "a",
      },
    },
  };
}

module.exports = { buildSwbAssetsTp5 };
