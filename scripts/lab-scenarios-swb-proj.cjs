"use strict";

const esc = (value) => String(value ?? "").replace(/\r?\n/g, "\n");
const text = (value) => Buffer.from(esc(value), "utf8");
const lower = (value) => String(value).toLowerCase();
const compact = (values) => Array.from(new Set(values.map((value) => lower(value).trim())));

function csv(headers, rows) {
  const quote = (value) => {
    const stringValue = String(value ?? "");
    return /[;"\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, "\"\"")}"` : stringValue;
  };
  return `${headers.join(";")}\n${rows.map((row) => headers.map((header) => quote(row[header])).join(";")).join("\n")}\n`;
}

const METRICS = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  UI: { N: 0.85, R: 0.62 },
  S: { U: "U", C: "C" },
  CIA: { H: 0.56, L: 0.22, N: 0 },
  PR: {
    U: { N: 0.85, L: 0.62, H: 0.27 },
    C: { N: 0.85, L: 0.68, H: 0.5 },
  },
};

function roundup(value) {
  const scaled = Math.round(value * 100000);
  if (scaled % 10000 === 0) return scaled / 100000;
  return (Math.floor(scaled / 10000) + 1) / 10;
}

function cvssFromVector(vector) {
  const pairs = Object.fromEntries(vector.split("/").slice(1).map((part) => part.split(":")));
  const scope = pairs.S;
  const impactSubScore = 1 - (1 - METRICS.CIA[pairs.C]) * (1 - METRICS.CIA[pairs.I]) * (1 - METRICS.CIA[pairs.A]);
  const impact = scope === "U"
    ? 6.42 * impactSubScore
    : 7.52 * (impactSubScore - 0.029) - 3.25 * (impactSubScore - 0.02) ** 15;
  const exploitability = 8.22 * METRICS.AV[pairs.AV] * METRICS.AC[pairs.AC] * METRICS.PR[scope][pairs.PR] * METRICS.UI[pairs.UI];
  if (impact <= 0) return 0;
  const raw = scope === "U" ? Math.min(impact + exploitability, 10) : Math.min(1.08 * (impact + exploitability), 10);
  return roundup(raw);
}

function scoreLabel(score) {
  if (score === 0) return "aucune";
  if (score < 4) return "faible";
  if (score < 7) return "moyenne";
  if (score < 9) return "élevée";
  return "critique";
}

function versionParts(version) {
  return String(version).split(".").map((part) => Number(part));
}

function compareVersion(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  const size = Math.max(a.length, b.length);
  for (let index = 0; index < size; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return delta < 0 ? -1 : 1;
  }
  return 0;
}

function between(version, min, maxExclusive) {
  return compareVersion(version, min) >= 0 && compareVersion(version, maxExclusive) < 0;
}

function buildCode() {
  const lines = [];
  const push = (...values) => lines.push(...values);
  push(
    "\"use strict\";",
    "",
    "const express = require(\"express\");",
    "const path = require(\"node:path\");",
    "const fs = require(\"node:fs/promises\");",
    "const multer = require(\"multer\");",
    "const fetch = require(\"node-fetch\");",
    "",
    "const app = express();",
    "app.use(express.urlencoded({ extended: true }));",
    "app.use(express.json());",
    "",
    "const sessionSecret = \"CLE_EXEMPLE_RESA_2026\";",
    "const db = {",
    "  query(sql, params = []) {",
    "    return { sql, params, rows: [] };",
    "  },",
    "};",
    "",
    "const upload = multer({ dest: path.join(__dirname, \"public\", \"uploads\") });",
    "const roomCatalog = [",
    "  { slug: \"lagune\", city: \"Abidjan\", capacity: 2, tags: [\"wifi\", \"petit-déjeuner\"] },",
    "  { slug: \"baobab\", city: \"Bamako\", capacity: 3, tags: [\"balcon\", \"wifi\"] },",
    "  { slug: \"sahel\", city: \"Niamey\", capacity: 2, tags: [\"parking\", \"climatisation\"] },",
    "  { slug: \"savanes\", city: \"Bobo\", capacity: 4, tags: [\"famille\", \"balcon\"] },",
    "  { slug: \"ocean\", city: \"Lomé\", capacity: 2, tags: [\"mer\", \"wifi\"] },",
    "];",
    "const comments = [",
    "  { roomId: 1001, author: \"Awa\", body: \"Accueil très calme.\" },",
    "  { roomId: 1002, author: \"Moussa\", body: \"Petit-déjeuner servi tôt.\" },",
    "];",
    "const bookings = [",
    "  { id: 1042, ownerId: 1001, nights: 3, total: 225000, status: \"paid\" },",
    "  { id: 1043, ownerId: 1002, nights: 2, total: 140000, status: \"pending\" },",
    "  { id: 1044, ownerId: 1003, nights: 5, total: 410000, status: \"paid\" },",
    "];",
    "const settings = { publicBaseUrl: \"https://reservation.palmier-or.example\" };",
    "",
    "function loadUser(req) {",
    "  return req.user ?? { id: 1001, role: \"client\", email: \"client1001@example.test\" };",
    "}",
    "",
    "function audit(message, meta = {}) {",
    "  return { message, meta, at: new Date().toISOString() };",
    "}",
    "",
    "function allowRole(user, expectedRole) {",
    "  return user && user.role === expectedRole;",
    "}",
    "",
    "function summarizeRoom(room) {",
    "  return { slug: room.slug, city: room.city, capacity: room.capacity, amenities: room.tags.join(\", \") };",
    "}",
    "",
    "function listPublicRooms() {",
    "  return roomCatalog.map((room) => summarizeRoom(room));",
    "}",
    "",
    "function collectDashboardWidgets(user) {",
    "  const widgets = [",
    "    { key: \"arrivals\", title: \"Arrivées du jour\" },",
    "    { key: \"departures\", title: \"Départs du jour\" },",
    "    { key: \"late-payments\", title: \"Paiements en attente\" },",
    "  ];",
    "  return allowRole(user, \"staff\") ? widgets : widgets.filter((item) => item.key !== \"late-payments\");",
    "}",
    "",
    "async function persistComment(author, roomId, body) {",
    "  comments.push({ author, roomId, body });",
    "  return comments[comments.length - 1];",
    "}",
    "",
    "function normalizeRoomName(value) {",
    "  return String(value || \"\").trim().toLowerCase();",
    "}",
    "",
    "app.get(\"/\", (_req, res) => {",
    "  res.json({ rooms: listPublicRooms(), generatedBy: audit(\"home\") });",
    "});",
    "",
    "app.get(\"/connexion\", (_req, res) => {",
    "  res.setHeader(\"Cache-Control\", \"no-store\");",
    "  res.send(\"<form method=\\\"post\\\" action=\\\"/connexion\\\"><input name=\\\"email\\\"><input name=\\\"password\\\" type=\\\"password\\\"></form>\");",
    "});",
    "",
    "app.post(\"/connexion\", (req, res) => {",
    "  const email = String(req.body.email || \"\").trim().toLowerCase();",
    "  const user = { id: 1001, role: email.endsWith(\"@staff.example\") ? \"staff\" : \"client\", email };",
    "  res.cookie(\"resa.sid\", `${user.id}.${Date.now()}`, { secure: true, path: \"/\" });",
    "  res.json({ ok: true, user });",
    "});",
    "",
    "app.get(\"/api/chambres\", (_req, res) => {",
    "  res.json(roomCatalog.map((room) => ({ slug: room.slug, city: room.city, capacity: room.capacity })));",
    "});",
    "",
    "app.get(\"/api/chambres/recherche\", (req, res) => {",
    "  const city = String(req.query.city || \"\");",
    "  const sql = \"select id, room_name, city, price from rooms where city = '\" + city + \"' order by price asc\";",
    "  const result = db.query(sql);",
    "  res.json({ query: result.sql, rows: result.rows });",
    "});",
    "",
    "app.get(\"/api/chambres/disponibilites\", (req, res) => {",
    "  const from = String(req.query.from || \"\");",
    "  const to = String(req.query.to || \"\");",
    "  const sql = \"select id, room_name from rooms where from_date <= $1 and to_date >= $2\";",
    "  res.json(db.query(sql, [from, to]));",
    "});",
    "",
    "app.get(\"/api/reservations/:id\", (req, res) => {",
    "  const user = loadUser(req);",
    "  const booking = bookings.find((entry) => entry.id === Number(req.params.id));",
    "  if (!user) return res.status(401).json({ error: \"auth required\" });",
    "  if (!booking) return res.status(404).json({ error: \"not found\" });",
    "  return res.json({ booking });",
    "});",
    "",
    "app.get(\"/api/mes-reservations\", (req, res) => {",
    "  const user = loadUser(req);",
    "  res.json(bookings.filter((entry) => entry.ownerId === user.id));",
    "});",
    "",
    "app.get(\"/commentaires\", (_req, res) => {",
    "  const html = comments.map((entry) => `<li><strong>${entry.author}</strong> : ${entry.body}</li>`).join(\"\");",
    "  res.send(`<h1>Commentaires</h1><ul>${html}</ul>`);",
    "});",
    "",
    "app.post(\"/commentaires\", async (req, res) => {",
    "  const saved = await persistComment(String(req.body.author || \"Client\"), Number(req.body.roomId || 0), String(req.body.body || \"\"));",
    "  res.status(201).json(saved);",
    "});",
    "",
    "app.get(\"/api/apercu\", async (req, res) => {",
    "  const target = String(req.query.url || \"\");",
    "  const response = await fetch(target);",
    "  const body = await response.text();",
    "  res.json({ status: response.status, body: body.slice(0, 500) });",
    "});",
    "",
    "app.post(\"/espace-partenaires/upload\", upload.single(\"document\"), async (req, res) => {",
    "  const file = req.file;",
    "  if (!file) return res.status(400).json({ error: \"document missing\" });",
    "  const targetName = path.join(__dirname, \"public\", \"uploads\", req.body.filename || file.originalname);",
    "  await fs.rename(file.path, targetName);",
    "  res.status(201).json({ ok: true, publicUrl: `/uploads/${path.basename(targetName)}` });",
    "});",
    "",
    "app.get(\"/admin/dashboard\", (req, res) => {",
    "  const user = loadUser(req);",
    "  if (!allowRole(user, \"staff\") && !allowRole(user, \"admin\")) return res.status(403).json({ error: \"forbidden\" });",
    "  return res.json({ widgets: collectDashboardWidgets(user), settings });",
    "});",
    ""
  );
  for (let index = 1; index <= 5; index += 1) {
    push(
      `function formatAuditRow${index}(value) {`,
      "  return {",
      `    key: \"metric-${index}\",`,
      "    value,",
      "    visible: true,",
      "  };",
      "}",
      "",
      `app.get(\"/api/widgets/${index}\", (req, res) => {`,
      "  const user = loadUser(req);",
      `  res.json({ user: user.email, widget: formatAuditRow${index}(req.query.value || \"stable\") });`,
      "});",
      ""
    );
  }
  push(
    "app.post(\"/api/reservations\", (req, res) => {",
    "  const user = loadUser(req);",
    "  const booking = {",
    "    id: 2000 + bookings.length,",
    "    ownerId: user.id,",
    "    nights: Number(req.body.nights || 1),",
    "    total: Number(req.body.total || 0),",
    "    status: \"pending\",",
    "  };",
    "  bookings.push(booking);",
    "  res.status(201).json(booking);",
    "});",
    "",
    "module.exports = { app, roomCatalog, comments, bookings, settings, audit, listPublicRooms };",
    ""
  );
  return {
    content: lines.join("\n"),
    lineNumbers: {
      hardcodedSecret: lines.findIndex((line) => line.includes("CLE_EXEMPLE_RESA_2026")) + 1,
    },
  };
}

function buildHeaders() {
  return [
    "### Réponse 1 : /connexion",
    "HTTP/1.1 200 OK",
    "Content-Type: text/html; charset=utf-8",
    "Cache-Control: no-store",
    "Strict-Transport-Security: max-age=31536000; includeSubDomains",
    "Content-Security-Policy: default-src 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'",
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "Set-Cookie: resa.sid=faux-session-1001; Path=/; Secure",
    "",
    "### Réponse 2 : /commentaires",
    "HTTP/1.1 200 OK",
    "Content-Type: text/html; charset=utf-8",
    "Cache-Control: public, max-age=120",
    "Strict-Transport-Security: max-age=31536000; includeSubDomains",
    "X-Content-Type-Options: nosniff",
    "Permissions-Policy: geolocation=(), microphone=(), camera=()",
    "",
    "### Réponse 3 : /api/reservations/1042",
    "HTTP/1.1 200 OK",
    "Content-Type: application/json; charset=utf-8",
    "Cache-Control: no-store",
    "Strict-Transport-Security: max-age=31536000; includeSubDomains",
    "X-Content-Type-Options: nosniff",
    "Content-Security-Policy: default-src 'none'; frame-ancestors 'none'",
    "",
    "### Réponse 4 : /api/apercu",
    "HTTP/1.1 200 OK",
    "Content-Type: application/json; charset=utf-8",
    "Strict-Transport-Security: max-age=31536000; includeSubDomains",
    "X-Content-Type-Options: nosniff",
    "",
    "### Réponse 5 : /espace-partenaires/upload",
    "HTTP/1.1 201 Created",
    "Content-Type: application/json; charset=utf-8",
    "Strict-Transport-Security: max-age=31536000; includeSubDomains",
    "Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'",
    "X-Content-Type-Options: nosniff",
    "",
    "### Réponse 6 : /admin/dashboard",
    "HTTP/1.1 200 OK",
    "Content-Type: text/html; charset=utf-8",
    "Cache-Control: no-store",
    "Strict-Transport-Security: max-age=31536000; includeSubDomains",
    "Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'",
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "",
  ].join("\n");
}

function buildMission() {
  return [
    "# Lettre de mission",
    "",
    "Date : mardi 12 mai 2026, 08:30 UTC.",
    "Commanditaire : Kader Sow, prestataire informatique de l’Hôtel Palmier d’Or.",
    "Périmètre autorisé : reservation.palmier-or.example, les routes applicatives listées dans les fichiers fournis, la configuration TLS exportée et les dépendances déclarées.",
    "Hors périmètre : la passerelle de paiement tierce, la messagerie, le réseau clients de l’hôtel, toute attaque active sur un système réel.",
    "Règles d’engagement : tu lis seulement des exports fournis, tu ne lances aucun test sur Internet, tu ne modifies aucun système, tu notes clairement ce qui est un fait et ce qui reste une hypothèse.",
    "Contact d’urgence : ksow@palmier-or.example.",
    "Livrables attendus : une liste de constats qualifiés, une priorisation défendable, un résumé de direction et trois recommandations immédiates.",
    "",
  ].join("\n");
}

function buildTls() {
  return [
    "Analyse TLS de reservation.palmier-or.example",
    "Date du test : 2026-05-12T07:40:00Z",
    "Protocoles acceptés : TLSv1.0, TLSv1.1, TLSv1.2, TLSv1.3",
    "Suites fortes observées : TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256",
    "Suite héritée observée : TLS_RSA_WITH_AES_128_CBC_SHA",
    "Redirection HTTP vers HTTPS : oui, 301 permanente",
    "Certificat serveur : CN=reservation.palmier-or.example",
    "SAN : reservation.palmier-or.example, palmier-or.example",
    "Émetteur : R11 Example Trust",
    "Validité : notBefore=2026-04-18T00:00:00Z ; notAfter=2026-07-17T23:59:59Z",
    "HSTS global : présent sur les réponses exportées",
    "",
  ].join("\n");
}

function buildGrid() {
  return [
    "# Grille d’évaluation de l’audit",
    "",
    "## Catégories OWASP Top 10 2025",
    "",
    "Dans l’édition 2025 du Top 10 de l’OWASP, un constat se range dans la catégorie qui décrit sa cause principale.",
    "",
    "- A01 : Broken Access Control (contrôle d’accès défaillant) : accès à l’objet ou à la fonction d’un autre sans droit, y compris la requête émise par le serveur vers une cible choisie par le client (SSRF, rattachée à A01 dans l’édition 2025).",
    "- A02 : Security Misconfiguration (mauvaise configuration de sécurité) : réglage par défaut, protocole ou en-tête faible, fichier ou page de diagnostic exposé.",
    "- A03 : Software Supply Chain Failures (défaillances de la chaîne d’approvisionnement logicielle) : composant tiers vulnérable, compromis ou non mis à jour.",
    "- A04 : Cryptographic Failures (défaillances cryptographiques) : chiffrement absent ou faible, données sensibles mal protégées en transit ou au repos.",
    "- A05 : Injection : une donnée non fiable est interprétée comme du code ou du contenu (SQL, commande, HTML ou script, donc aussi le XSS).",
    "- A06 : Insecure Design (conception non sécurisée) : une règle de sécurité manque dès la conception, ce n’est pas seulement un bogue de code.",
    "- A07 : Authentication Failures (défaillances d’authentification) : identité mal vérifiée, mot de passe, session ou secret de signature mal protégé.",
    "- A08 : Software or Data Integrity Failures (défaillances d’intégrité des logiciels ou des données) : code, mise à jour ou donnée acceptés sans contrôle d’intégrité.",
    "- A09 : Security Logging and Alerting Failures (défaillances de journalisation et d’alerte) : événement de sécurité non journalisé ou sans alerte.",
    "- A10 : Mishandling of Exceptional Conditions (mauvaise gestion des conditions exceptionnelles) : erreur ou cas limite mal géré.",
    "",
    "## Certitude pour la priorité",
    "",
    "- confirmée = 4 : preuve directe et corroboration indépendante",
    "- démontrée = 3 : revue de code ou configuration reproductible",
    "- plausible = 2 : hypothèse étayée par une seule source",
    "- scanner = 1 : signal seul, pas encore confirmé",
    "",
    "## Priorité",
    "",
    "Priorité = note CVSS de base × criticité de l’actif × certitude.",
    "",
    "Criticité des actifs : 1 faible, 2 utile, 3 importante, 4 critique.",
    "",
    "## CVSS v3.1",
    "",
    "| Métrique | Valeurs |",
    "|---|---|",
    "| AV | N 0,85 ; A 0,62 ; L 0,55 ; P 0,2 |",
    "| AC | L 0,77 ; H 0,44 |",
    "| PR | portée inchangée (S:U) : N 0,85 ; L 0,62 ; H 0,27. Portée modifiée (S:C) : N 0,85 ; L 0,68 ; H 0,5 |",
    "| UI | N 0,85 ; R 0,62 |",
    "| C, I, A | H 0,56 ; L 0,22 ; N 0 |",
    "",
    "- ISS = 1 - (1 - C) × (1 - I) × (1 - A)",
    "- Impact si S:U = 6,42 × ISS",
    "- Impact si S:C = 7,52 × (ISS - 0,029) - 3,25 × (ISS - 0,02)^15",
    "- Exploitabilité = 8,22 × AV × AC × PR × UI",
    "- Si Impact <= 0, la note vaut 0",
    "- Si S:U : note = Arrondi_sup(min(Impact + Exploitabilité, 10))",
    "- Si S:C : note = Arrondi_sup(min(1,08 × (Impact + Exploitabilité), 10))",
    "- Arrondi_sup : le plus petit nombre à une décimale supérieur ou égal à la valeur.",
    "",
    "| Qualification | Note |",
    "|---|---|",
    "| Aucune | 0,0 |",
    "| Faible | 0,1 à 3,9 |",
    "| Moyenne | 4,0 à 6,9 |",
    "| Élevée | 7,0 à 8,9 |",
    "| Critique | 9,0 à 10,0 |",
    "",
    "## Fait et hypothèse",
    "",
    "- Un fait est visible dans un fichier, à une heure, un endroit ou une ligne précise.",
    "- Une hypothèse propose une explication possible qui doit être confirmée par une deuxième preuve.",
    "",
  ].join("\n");
}

function buildGuide() {
  return [
    "# Guide de méthode",
    "",
    "> Cadre et limites : tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite. Les exemples de ce guide utilisent des valeurs inventées, pas celles du laboratoire.",
    "",
    "## 1. Qualifier un constat",
    "Relis d’abord la lettre de mission, puis la grille. Quand un constat vient d’un scanner, cherche toujours une preuve qui le confirme ou le contredit dans un autre fichier. Quand un constat vient d’une revue de code, pointe la ligne et nomme le risque sans extrapoler.",
    "",
    "### Exemple bash",
    "```bash",
    "cat > constats-exemple.csv <<'EOF'",
    "id;source;certitude;actif",
    "X01;revue;démontrée;api-resa",
    "X02;scanner;scanner;api-resa",
    "X03;journal+revue;confirmée;front-web",
    "EOF",
    "grep '^X' constats-exemple.csv | cut -d';' -f1,2,3",
    "```",
    "",
    "### Exemple PowerShell",
    "```powershell",
    "@'",
    "id;source;certitude;actif",
    "X01;revue;démontrée;api-resa",
    "X02;scanner;scanner;api-resa",
    "X03;journal+revue;confirmée;front-web",
    "'@ | Set-Content -Encoding UTF8 constats-exemple.csv",
    "Import-Csv -Delimiter ';' -Encoding UTF8 constats-exemple.csv | Select-Object id, source, certitude",
    "```",
    "",
    "## 2. Recalculer une note CVSS 3.1",
    "Travaille avec la table de la grille. Copie le vecteur, reporte chaque valeur, calcule ISS, impact, exploitabilité, puis applique l’arrondi supérieur. Quand tu annonces une note, garde aussi le vecteur comme justification.",
    "",
    "```bash",
    "cat > vecteur-exemple.txt <<'EOF'",
    "CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:N",
    "EOF",
    "grep 'CVSS:3.1' vecteur-exemple.txt",
    "```",
    "",
    "```powershell",
    "@'",
    "CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:N",
    "'@ | Set-Content -Encoding UTF8 vecteur-exemple.txt",
    "Get-Content -Encoding UTF8 vecteur-exemple.txt",
    "```",
    "",
    "## 3. Prioriser sans inventer",
    "La priorité n’est pas un sentiment. Relève la note de base, la criticité de l’actif et la certitude, puis multiplie. Si deux constats semblent proches, vérifie d’abord qu’ils parlent bien du même actif et du même niveau de preuve.",
    "",
    "```bash",
    "cat > priorite-exemple.csv <<'EOF'",
    "id;note;criticite;certitude",
    "X01;6.3;4;3",
    "X02;5.2;2;1",
    "EOF",
    "awk -F';' 'NR>1 { printf \"%s %.1f\\n\", $1, $2*$3*$4 }' priorite-exemple.csv",
    "```",
    "",
    "```powershell",
    "@'",
    "id;note;criticite;certitude",
    "X01;6.3;4;3",
    "X02;5.2;2;1",
    "'@ | Set-Content -Encoding UTF8 priorite-exemple.csv",
    "Import-Csv -Delimiter ';' -Encoding UTF8 priorite-exemple.csv | ForEach-Object { \"{0} {1}\" -f $_.id, ([double]$_.note * [int]$_.criticite * [int]$_.certitude) }",
    "```",
    "",
    "## 4. Rester factuel dans le rapport",
    "Un résumé de direction dit ce qui est prouvé, l’impact probable et la priorité de correction. Il n’annonce ni compromission générale ni exfiltration sans preuve explicite. Une recommandation vaut mieux qu’un slogan si elle est testable et rattachée à une ligne de code, un en-tête ou un composant.",
    "",
  ].join("\n");
}

function buildReportTemplate() {
  return [
    "# Modèle de rapport",
    "",
    "## Résumé de direction",
    "- Contexte :",
    "- Constats les plus prioritaires :",
    "- Risque métier probable :",
    "",
    "## Tableau des constats",
    "| Numéro | Titre | Preuve | Impact | Priorité | Recommandation |",
    "|---|---|---|---|---|---|",
    "| 01 | | | | | |",
    "| 02 | | | | | |",
    "",
    "## Actions immédiates",
    "1. ",
    "2. ",
    "3. ",
    "",
  ].join("\n");
}

function buildJournal() {
  const lines = [];
  const push = (line) => lines.push(line);
  const paths = ["/", "/connexion", "/chambres", "/api/chambres", "/api/tarifs", "/commentaires"];
  const agents = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Mozilla/5.0 (Linux; Android 13)", "curl/8.7.1"];
  const internals = ["172.20.10.21", "172.20.10.31", "172.20.10.11", "172.20.10.90"];
  let seed = 17;
  for (let hour = 6; hour <= 21; hour += 1) {
    for (let minute = 0; minute < 60; minute += 3) {
      const ip = internals[(hour + minute) % internals.length];
      const path = paths[(hour + minute + seed) % paths.length];
      const second = (hour * 13 + minute * 7 + seed) % 60;
      const status = path.startsWith("/api") ? 200 : (minute % 5 === 0 ? 304 : 200);
      const bytes = 1200 + ((hour + minute + seed) % 11) * 233;
      const agent = agents[(hour + seed) % agents.length];
      push(`${ip} - - [12/May/2026:${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")} +0000] "GET ${path} HTTP/1.1" ${status} ${bytes} "-" "${agent}"`);
      seed += 1;
    }
  }
  const scannerIp = "203.0.113.44";
  ["/wp-login.php", "/.env", "/admin/phpinfo.php", "/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php", "/debug/default/view"].forEach((path, index) => {
    push(`${scannerIp} - - [12/May/2026:08:${String(10 + index).padStart(2, "0")}:1${index} +0000] "GET ${path} HTTP/1.1" 404 ${620 + index * 31} "-" "Mozilla/5.0 (compatible; audit-bot/1.0)"`);
  });
  const sqlIp = "198.51.100.62";
  push(`${sqlIp} - - [12/May/2026:08:42:11 +0000] "GET /api/chambres/recherche?city=%27%20OR%20%271%27=%271 HTTP/1.1" 500 912 "-" "sqlmap/1.8"`);
  push(`${sqlIp} - - [12/May/2026:08:42:18 +0000] "GET /api/chambres/recherche?city=%27%20UNION%20SELECT%201,2,3,4-- HTTP/1.1" 500 974 "-" "sqlmap/1.8"`);
  const attackerIp = "198.51.100.77";
  push(`${attackerIp} - - [12/May/2026:09:11:43 +0000] "POST /espace-partenaires/upload HTTP/1.1" 201 248 "https://reservation.palmier-or.example/espace-partenaires" "Mozilla/5.0 (X11; Linux x86_64)"`);
  push(`${attackerIp} - - [12/May/2026:09:12:02 +0000] "GET /uploads/brochure.php?cmd=id HTTP/1.1" 200 96 "-" "Mozilla/5.0 (X11; Linux x86_64)"`);
  push(`${attackerIp} - - [12/May/2026:09:12:20 +0000] "GET /uploads/brochure.php?cmd=cat%20.env HTTP/1.1" 200 311 "-" "Mozilla/5.0 (X11; Linux x86_64)"`);
  push(`${attackerIp} - - [12/May/2026:09:14:55 +0000] "GET /uploads/brochure.php?cmd=ls%20-l%20public/uploads HTTP/1.1" 200 188 "-" "Mozilla/5.0 (X11; Linux x86_64)"`);
  return `${lines.join("\n")}\n`;
}

function buildSwbAssetsProj() {
  const assetNames = {
    missionFile: "swb-proj-mission.md",
    headersFile: "swb-proj-en-tetes.txt",
    codeFile: "swb-proj-code.js",
    depsFile: "swb-proj-dependances.csv",
    advisoriesFile: "swb-proj-avis.csv",
    tlsFile: "swb-proj-tls.txt",
    journalFile: "swb-proj-journaux.log",
    findingsFile: "swb-proj-constats.csv",
    gridFile: "swb-proj-grille.md",
    reportFile: "swb-proj-modele-rapport.md",
    guideFile: "swb-proj-guide.md",
  };
  const code = buildCode();
  const dependencies = [
    { package: "express", version: "4.19.2" },
    { package: "multer", version: "1.4.5" },
    { package: "express-fileupload", version: "1.4.0" },
    { package: "node-fetch", version: "2.6.9" },
    { package: "helmet", version: "7.1.0" },
    { package: "jsonwebtoken", version: "9.0.2" },
    { package: "mysql2", version: "3.11.0" },
    { package: "cookie-parser", version: "1.4.7" },
  ];
  const advisories = [
    { id: "AV-2026-001", package: "express-fileupload", affected_from: "1.3.0", affected_to_excluded: "1.5.0", fixed_version: "1.5.0", cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H" },
    { id: "AV-2026-002", package: "node-fetch", affected_from: "2.6.0", affected_to_excluded: "2.6.10", fixed_version: "2.6.10", cvss_vector: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N" },
    { id: "AV-2026-003", package: "multer", affected_from: "1.3.0", affected_to_excluded: "1.4.6", fixed_version: "1.4.6", cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:L" },
  ];
  const findings = [
    { id: "F01", title: "Recherche de chambres concaténée dans une requête SQL", location: "/api/chambres/recherche", source: "revue", asset: "application", criticality: 4, certainty: "démontrée", vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L", category: "a05" },
    { id: "F02", title: "Commentaires stockés réinjectés sans échappement HTML", location: "/commentaires", source: "revue", asset: "front-web", criticality: 3, certainty: "démontrée", vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N", category: "a05" },
    { id: "F03", title: "Détails de réservation exposés à tout client authentifié", location: "/api/reservations/:id", source: "revue", asset: "application", criticality: 4, certainty: "démontrée", vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N", category: "a01" },
    { id: "F04", title: "Secret de signature de session codé en dur", location: `${assetNames.codeFile}:${code.lineNumbers.hardcodedSecret}`, source: "revue", asset: "application", criticality: 4, certainty: "démontrée", vector: "CVSS:3.1/AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N", category: "a07" },
    { id: "F05", title: "Aperçu d’URL capable de joindre des destinations internes", location: "/api/apercu", source: "revue", asset: "application", criticality: 4, certainty: "démontrée", vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:L/I:L/A:L", category: "a01" },
    { id: "F06", title: "Téléversement d’un script exécuté sous la racine web", location: "/espace-partenaires/upload", source: "journal+revue", asset: "front-web", criticality: 4, certainty: "confirmée", vector: "CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:C/C:H/I:H/A:H", category: "a08" },
    { id: "F07", title: "Dépendance express-fileupload 1.4.0 touchée par un avis critique", location: "express-fileupload@1.4.0", source: "scanner+revue", asset: "application", criticality: 4, certainty: "confirmée", vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:H", category: "a03" },
    { id: "F08", title: "HSTS absent sur la page de connexion", location: "/connexion", source: "scanner", asset: "front-web", criticality: 3, certainty: "scanner", vector: "", category: "a02" },
    { id: "F09", title: "Le serveur TLS accepte encore TLS 1.0 et TLS 1.1", location: "reservation.palmier-or.example:443", source: "analyse-tls", asset: "front-web", criticality: 4, certainty: "démontrée", vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N", category: "a02" },
  ];
  const certaintyValues = { confirmée: 4, démontrée: 3, plausible: 2, scanner: 1 };
  for (const finding of findings) {
    if (!finding.vector) continue;
    finding.score = cvssFromVector(finding.vector);
    finding.priority = Number((finding.score * finding.criticality * certaintyValues[finding.certainty]).toFixed(1));
    finding.severity = scoreLabel(finding.score);
  }
  const touchedPackages = advisories.filter((advisory) => dependencies.some((dep) => dep.package === advisory.package && between(dep.version, advisory.affected_from, advisory.affected_to_excluded)));
  const findingsCsv = csv(
    ["id", "titre", "emplacement", "source", "actif", "criticite_actif", "certitude", "vecteur_cvss", "qualification_cvss"],
    findings.map((finding) => ({
      id: finding.id,
      titre: finding.title,
      emplacement: finding.location,
      source: finding.source,
      actif: finding.asset,
      criticite_actif: finding.criticality,
      certitude: finding.certainty,
      vecteur_cvss: finding.vector,
      qualification_cvss: finding.severity ?? "",
    }))
  );
  const topFinding = findings.filter((finding) => finding.priority).sort((left, right) => right.priority - left.priority)[0];
  const files = [
    { name: assetNames.missionFile, data: text(buildMission()) },
    { name: assetNames.headersFile, data: text(buildHeaders()) },
    { name: assetNames.codeFile, data: text(code.content) },
    { name: assetNames.depsFile, data: text(csv(["package", "version"], dependencies)) },
    { name: assetNames.advisoriesFile, data: text(csv(["id", "package", "affected_from", "affected_to_excluded", "fixed_version", "cvss_vector"], advisories)) },
    { name: assetNames.tlsFile, data: text(buildTls()) },
    { name: assetNames.journalFile, data: text(buildJournal()) },
    { name: assetNames.findingsFile, data: text(findingsCsv) },
    { name: assetNames.gridFile, data: text(buildGrid()) },
    { name: assetNames.reportFile, data: text(buildReportTemplate()) },
    { name: assetNames.guideFile, data: text(buildGuide()) },
  ];
  return {
    files,
    facts: {
      swbProj: {
        assetNames,
        findings: {
          owaspById: Object.fromEntries(findings.map((finding) => [finding.id, finding.category])),
          scoreById: Object.fromEntries(findings.filter((finding) => finding.score).map((finding) => [finding.id, finding.score])),
          priorityById: Object.fromEntries(findings.filter((finding) => finding.priority).map((finding) => [finding.id, finding.priority])),
        },
        answers: {
          topPriorityFinding: topFinding.id.slice(1),
          falsePositiveFinding: "08",
          exploitedFinding: "06",
          firstExploitTuple: "09:11:43, 198.51.100.77",
          tlsLetter: "b",
          recommendationLetter: "c",
          hardcodedSecretLine: String(code.lineNumbers.hardcodedSecret),
          touchedDependenciesCount: String(touchedPackages.length),
        },
        lineNumbers: code.lineNumbers,
      },
    },
  };
}

module.exports = {
  buildSwbAssetsProj,
};
