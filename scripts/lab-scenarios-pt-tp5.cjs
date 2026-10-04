"use strict";

const HOST = "portail.sahel-vert.example";
const PROXY_FILE = "pt-tp5-proxy-history.jsonl";
const NOTES_FILE = "pt-tp5-notes-test.txt";
const OWASP_FILE = "pt-tp5-owasp-top10-2025.md";
const GUIDE_FILE = "pt-tp5-guide.md";
const AUTH_ROUTE = "/auth/login";
const DOSSIER_ROUTE = "/api/dossiers/view";
const DOCUMENT_ROUTE = "/api/documents/download";
const BENEFICIARY_ROUTE = "/api/beneficiaires/search";
const UPLOAD_ROUTE = "/api/documents/upload";

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

const pad = (value, width = 2) => String(value).padStart(width, "0");
const iso = (minute, second = 0) => `2026-06-12T${pad(8 + Math.floor(minute / 60))}:${pad(minute % 60)}:${pad(second)}Z`;

function publicEntry(entry) {
  return Object.fromEntries(Object.entries(entry).filter(([key]) => !key.startsWith("_")));
}

function countBy(items, selector) {
  const map = new Map();
  for (const item of items) {
    const key = selector(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function uniqueMax(map) {
  const ordered = [...map.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  if (ordered.length > 1 && ordered[0][1] === ordered[1][1]) throw new Error("maximum non unique");
  return ordered[0][0];
}

function buildProxyHistory() {
  const rng = mulberry32(0x0a51e105);
  const entries = [];
  const assetEntries = [
    { path: "/assets/app.js", contentType: "application/javascript" },
    { path: "/assets/runtime.js", contentType: "application/javascript" },
    { path: "/assets/vendor.js", contentType: "application/javascript" },
    { path: "/assets/app.css", contentType: "text/css" },
    { path: "/assets/theme.css", contentType: "text/css" },
    { path: "/assets/logo.svg", contentType: "image/svg+xml" },
    { path: "/assets/help.svg", contentType: "image/svg+xml" },
    { path: "/favicon.ico", contentType: "image/x-icon" },
    { path: "/manifest.webmanifest", contentType: "application/manifest+json" },
  ];
  const accounts = ["anonyme", "collecte-est", "finance-littoral", "achats-nord", "qualite-sahel", "juridique-ouest"];

  const add = (entry) => entries.push(entry);

  for (let index = 0; index < 88; index += 1) {
    const asset = assetEntries[index % assetEntries.length];
    add({
      timestamp: iso(index, Math.floor(rng() * 50)),
      method: "GET",
      host: HOST,
      path: asset.path,
      query: "",
      status: index % 4 === 0 ? 304 : 200,
      responseBytes: index % 4 === 0 ? 0 : 1600 + (index % 13) * 137,
      contentType: asset.contentType,
      actorAccount: index % 9 === 0 ? "anonyme" : accounts[index % accounts.length],
      sessionId: `sess-demo-${pad(1000 + (index % 15), 4)}`,
      resourceType: "asset",
      resourceId: "-",
      resourceOwner: "-",
      manipulatedIdentifier: false,
      accessDecision: "not-applicable",
      tags: ["static", index % 4 === 0 ? "cache" : "page"],
    });
  }

  add({
    timestamp: iso(88, 41),
    method: "GET",
    host: HOST,
    path: "/ancienne-aide",
    query: "",
    status: 301,
    responseBytes: 0,
    contentType: "text/html",
    actorAccount: "anonyme",
    sessionId: "sess-demo-1015",
    resourceType: "page",
    resourceId: "ancienne-aide",
    resourceOwner: "-",
    manipulatedIdentifier: false,
    accessDecision: "not-applicable",
    responseHeaders: { location: "/support/faq", "cache-control": "max-age=3600" },
    tags: ["redirect", "legacy"],
  });

  const dossierLegit = [
    ["collecte-est", "collecte-est", "DOS-2201", 200, 12540],
    ["collecte-est", "collecte-est", "DOS-2204", 200, 12388],
    ["finance-littoral", "finance-littoral", "DOS-3301", 200, 12782],
    ["achats-nord", "achats-nord", "DOS-4102", 200, 12414],
    ["qualite-sahel", "qualite-sahel", "DOS-5108", 200, 12890],
    ["collecte-est", "collecte-est", "DOS-2206", 200, 12670],
    ["finance-littoral", "finance-littoral", "DOS-3304", 200, 12612],
    ["achats-nord", "achats-nord", "DOS-4108", 200, 12902],
    ["qualite-sahel", "qualite-sahel", "DOS-5110", 200, 12824],
    ["juridique-ouest", "juridique-ouest", "DOS-6101", 200, 13112],
    ["collecte-est", "collecte-est", "DOS-2210", 200, 12508],
  ];
  dossierLegit.forEach(([actor, owner, resourceId, status, bytes], index) => add({
    timestamp: iso(89 + index, 5 + index),
    method: "GET",
    host: HOST,
    path: DOSSIER_ROUTE,
    query: `dossierId=${resourceId}&section=resume`,
    status,
    responseBytes: bytes,
    contentType: "application/json",
    actorAccount: actor,
    sessionId: `sess-demo-${pad(2000 + index, 4)}`,
    resourceType: "dossier",
    resourceId,
    resourceOwner: owner,
    manipulatedIdentifier: false,
    accessDecision: "granted",
    tags: ["business", "dossier", "legitime"],
  }));

  const beneficiaryQueries = [
    ["collecte-est", "BE-1001", 5120],
    ["collecte-est", "BE-1002", 5202],
    ["finance-littoral", "BE-1010", 5194],
    ["achats-nord", "BE-1022", 5180],
    ["qualite-sahel", "BE-1104", 5216],
    ["finance-littoral", "BE-1113", 5230],
    ["qualite-sahel", "BE-1114", 5172],
  ];
  beneficiaryQueries.forEach(([actor, key, bytes], index) => add({
    timestamp: iso(101 + index, 14 + index),
    method: "GET",
    host: HOST,
    path: BENEFICIARY_ROUTE,
    query: `needle=${key}`,
    status: 200,
    responseBytes: bytes,
    contentType: "application/json",
    actorAccount: actor,
    sessionId: `sess-demo-${pad(2300 + index, 4)}`,
    resourceType: "beneficiaire",
    resourceId: key,
    resourceOwner: actor,
    manipulatedIdentifier: false,
    accessDecision: "granted",
    tags: ["business", "beneficiaire", "legitime"],
  }));

  add({
    timestamp: iso(110, 9),
    method: "GET",
    host: HOST,
    path: "/support/faq",
    query: "",
    status: 200,
    responseBytes: 8341,
    contentType: "text/html",
    actorAccount: "anonyme",
    sessionId: "sess-demo-3001",
    resourceType: "page",
    resourceId: "FAQ",
    resourceOwner: "-",
    manipulatedIdentifier: false,
    accessDecision: "not-applicable",
    responseHeaders: { "x-powered-by": "Express", "cache-control": "no-store" },
    tags: ["support", "header-leak"],
    _tag: "n01-proof",
  });

  add({
    timestamp: iso(111, 3),
    method: "GET",
    host: HOST,
    path: "/auth/session/init",
    query: "flow=web",
    status: 200,
    responseBytes: 1192,
    contentType: "application/json",
    actorAccount: "anonyme",
    sessionId: "sess-demo-5101",
    resourceType: "auth",
    resourceId: "login-seed",
    resourceOwner: "-",
    manipulatedIdentifier: false,
    accessDecision: "not-applicable",
    responseHeaders: { "set-cookie": "sid=sess-demo-5101; Path=/; HttpOnly; Secure" },
    tags: ["auth", "session-seed"],
    _tag: "n05-prelogin",
  });

  const authPosts = [
    ["unknown@sahel-vert.example", "anonyme", 401, "compte inconnu", "sess-demo-5102", "refused", "n10-unknown-1"],
    ["finance-littoral@sahel-vert.example", "finance-littoral", 401, "mot de passe incorrect", "sess-demo-5103", "refused", "n10-password-1"],
    ["unknown2@sahel-vert.example", "anonyme", 401, "compte inconnu", "sess-demo-5104", "refused", "n10-unknown-2"],
    ["collecte-est@sahel-vert.example", "collecte-est", 401, "mot de passe incorrect", "sess-demo-5105", "refused", "n10-password-2"],
    ["achats-nord@sahel-vert.example", "achats-nord", 401, "mot de passe incorrect", "sess-demo-5106", "refused", "auth-extra"],
    ["finance-littoral@sahel-vert.example", "finance-littoral", 302, "connexion ok", "sess-demo-5101", "granted", "n05-login"],
  ];
  authPosts.forEach(([login, actor, status, preview, sessionId, decision, tag], index) => add({
    timestamp: iso(112 + index, 7 + index),
    method: "POST",
    host: HOST,
    path: AUTH_ROUTE,
    query: "channel=web",
    status,
    responseBytes: status === 302 ? 412 : 286,
    contentType: "application/json",
    actorAccount: actor,
    sessionId,
    resourceType: "auth",
    resourceId: login,
    resourceOwner: actor === "anonyme" ? "-" : actor,
    manipulatedIdentifier: false,
    accessDecision: decision,
    responsePreview: preview,
    responseHeaders: status === 302 ? { "set-cookie": "sid=sess-demo-5101; Path=/; HttpOnly; Secure", location: "/tableau-de-bord" } : {},
    tags: ["auth", status === 302 ? "login-success" : "login-failure"],
    _tag: tag,
  }));

  add({
    timestamp: iso(118, 22),
    method: "GET",
    host: HOST,
    path: "/tableau-de-bord",
    query: "",
    status: 200,
    responseBytes: 13750,
    contentType: "text/html",
    actorAccount: "finance-littoral",
    sessionId: "sess-demo-5101",
    resourceType: "page",
    resourceId: "dashboard",
    resourceOwner: "finance-littoral",
    manipulatedIdentifier: false,
    accessDecision: "granted",
    tags: ["auth", "post-login"],
    _tag: "n05-postlogin",
  });

  add({
    timestamp: iso(120, 12),
    method: "GET",
    host: HOST,
    path: "/api/admin/export",
    query: "scope=finance",
    status: 403,
    responseBytes: 188,
    contentType: "application/json",
    actorAccount: "collecte-est",
    sessionId: "sess-demo-5201",
    resourceType: "admin",
    resourceId: "finance",
    resourceOwner: "admin-finance",
    manipulatedIdentifier: false,
    accessDecision: "rejected",
    tags: ["business", "admin", "blocked"],
    _tag: "n02-proof",
  });

  add({
    timestamp: iso(121, 37),
    method: "GET",
    host: HOST,
    path: "/redir",
    query: "next=https://collecte-est.sahel-vert.example",
    status: 400,
    responseBytes: 204,
    contentType: "application/json",
    actorAccount: "anonyme",
    sessionId: "sess-demo-5202",
    resourceType: "redirect",
    resourceId: "next",
    resourceOwner: "-",
    manipulatedIdentifier: false,
    accessDecision: "rejected",
    tags: ["redirect", "blocked"],
    _tag: "n03-proof",
  });

  const idorSuccesses = [
    ["collecte-est", "finance-littoral", DOSSIER_ROUTE, "dossierId=DOS-3307&section=resume", 200, 13244, "application/json", "DOS-3307", "n04-success-1"],
    ["achats-nord", "collecte-est", DOSSIER_ROUTE, "dossierId=DOS-2208&section=resume", 200, 13128, "application/json", "DOS-2208", "n04-success-2"],
    ["collecte-est", "finance-littoral", DOCUMENT_ROUTE, "documentId=DOC-3307-PDF&download=1", 200, 843112, "application/pdf", "DOC-3307-PDF", "n04-success-3"],
    ["qualite-sahel", "achats-nord", DOCUMENT_ROUTE, "documentId=DOC-4109-XLS&download=1", 200, 392004, "application/vnd.ms-excel", "DOC-4109-XLS", "n04-success-4"],
  ];
  idorSuccesses.forEach(([actor, owner, path, query, status, bytes, contentType, resourceId, tag], index) => add({
    timestamp: iso(123 + index, 10 + index),
    method: "GET",
    host: HOST,
    path,
    query,
    status,
    responseBytes: bytes,
    contentType,
    actorAccount: actor,
    sessionId: `sess-demo-${pad(5300 + index, 4)}`,
    resourceType: path === DOSSIER_ROUTE ? "dossier" : "document",
    resourceId,
    resourceOwner: owner,
    manipulatedIdentifier: true,
    accessDecision: "granted",
    tags: ["business", "id-manipulated", "granted"],
    _tag: tag,
  }));

  const idorRejected = [
    ["finance-littoral", "qualite-sahel", DOSSIER_ROUTE, "dossierId=DOS-5112&section=resume", 403, 214, "DOS-5112", "n06-proof"],
    ["achats-nord", "juridique-ouest", DOCUMENT_ROUTE, "documentId=DOC-6104-PDF&download=1", 404, 198, "DOC-6104-PDF", "n09-proof"],
    ["collecte-est", "finance-littoral", DOSSIER_ROUTE, "dossierId=DOS-3312&section=resume", 403, 214, "DOS-3312", "rej-1"],
    ["qualite-sahel", "collecte-est", DOCUMENT_ROUTE, "documentId=DOC-2215-PDF&download=1", 404, 199, "DOC-2215-PDF", "rej-2"],
    ["finance-littoral", "achats-nord", DOCUMENT_ROUTE, "documentId=DOC-4111-XLS&download=1", 403, 216, "DOC-4111-XLS", "rej-3"],
  ];
  idorRejected.forEach(([actor, owner, path, query, status, bytes, resourceId, tag], index) => add({
    timestamp: iso(127 + index, 22 + index),
    method: "GET",
    host: HOST,
    path,
    query,
    status,
    responseBytes: bytes,
    contentType: "application/json",
    actorAccount: actor,
    sessionId: `sess-demo-${pad(5400 + index, 4)}`,
    resourceType: path === DOSSIER_ROUTE ? "dossier" : "document",
    resourceId,
    resourceOwner: owner,
    manipulatedIdentifier: true,
    accessDecision: "rejected",
    tags: ["business", "id-manipulated", "rejected"],
    _tag: tag,
  }));

  const documentLegit = [
    ["finance-littoral", "finance-littoral", "DOC-3301-PDF", 245611],
    ["collecte-est", "collecte-est", "DOC-2204-PDF", 118240],
    ["achats-nord", "achats-nord", "DOC-4102-XLS", 276552],
    ["juridique-ouest", "juridique-ouest", "DOC-6101-PDF", 182440],
  ];
  documentLegit.forEach(([actor, owner, resourceId, bytes], index) => add({
    timestamp: iso(133 + index, 8 + index),
    method: "GET",
    host: HOST,
    path: DOCUMENT_ROUTE,
    query: `documentId=${resourceId}&download=1`,
    status: 200,
    responseBytes: bytes,
    contentType: resourceId.endsWith("XLS") ? "application/vnd.ms-excel" : "application/pdf",
    actorAccount: actor,
    sessionId: `sess-demo-${pad(5500 + index, 4)}`,
    resourceType: "document",
    resourceId,
    resourceOwner: owner,
    manipulatedIdentifier: false,
    accessDecision: "granted",
    tags: ["business", "document", "legitime"],
  }));

  const uploads = [
    ["collecte-est", 415, "application/x-php", "plan.png.php", "n07-1"],
    ["collecte-est", 422, "image/svg+xml", "bon-livraison.svg", "n07-2"],
    ["finance-littoral", 415, "application/octet-stream", "preuve.jpg.exe", "n07-3"],
  ];
  uploads.forEach(([actor, status, type, resourceId, tag], index) => add({
    timestamp: iso(138 + index, 31 + index),
    method: "POST",
    host: HOST,
    path: UPLOAD_ROUTE,
    query: "",
    status,
    responseBytes: 244,
    contentType: "application/json",
    actorAccount: actor,
    sessionId: `sess-demo-${pad(5600 + index, 4)}`,
    resourceType: "upload",
    resourceId,
    resourceOwner: actor,
    manipulatedIdentifier: false,
    accessDecision: "rejected",
    requestContentType: type,
    tags: ["business", "upload", "blocked"],
    _tag: tag,
  }));

  add({
    timestamp: iso(142, 11),
    method: "GET",
    host: HOST,
    path: "/api/export/preview",
    query: "role=finance",
    status: 403,
    responseBytes: 206,
    contentType: "application/json",
    actorAccount: "qualite-sahel",
    sessionId: "sess-demo-5701",
    resourceType: "admin",
    resourceId: "finance",
    resourceOwner: "finance-littoral",
    manipulatedIdentifier: false,
    accessDecision: "rejected",
    tags: ["business", "role-guard"],
    _tag: "n08-proof",
  });

  entries.sort((left, right) => left.timestamp.localeCompare(right.timestamp) || left.path.localeCompare(right.path));
  return entries.map((entry, index) => ({ id: `H${pad(index + 1, 3)}`, ...entry }));
}

function buildOwaspMemo() {
  const rows = [
    ["a01", "Broken Access Control", "Accès à l’objet ou à la fonction d’un autre compte sans contrôle suffisant, y compris une SSRF qui franchit une frontière de confiance.", "Repère : une réponse 200 ou une action autorisée sur un identifiant appartenant à un autre utilisateur, ou une requête côté serveur vers une ressource interne non prévue."],
    ["a02", "Security Misconfiguration", "Configuration trop bavarde, trop permissive ou durcissement absent.", "Repère : en-tête de framework, stockage public, mode debug ou politique absente exposée sans besoin."],
    ["a03", "Software Supply Chain Failures", "Dépendances, composants ou processus d’approvisionnement non vérifiés.", "Repère : bibliothèque compromise, source non fiable ou mise à jour non contrôlée."],
    ["a04", "Cryptographic Failures", "Protection cryptographique absente, obsolète ou mal appliquée.", "Repère : données sensibles sans chiffrement ou algorithme inadapté."],
    ["a05", "Injection", "Donnée utilisateur interprétée comme commande, requête ou expression.", "Repère : SQL, OS, template ou moteur de recherche modifié par une saisie."],
    ["a06", "Insecure Design", "Mécanisme absent du design, même si le code suit la spécification.", "Repère : aucun garde-fou prévu contre un abus métier attendu."],
    ["a07", "Authentication Failures", "Faiblesses d’authentification ou de cycle de session.", "Repère : énumération de comptes, fixation de session, rotation absente, logout incomplet."],
    ["a08", "Software or Data Integrity Failures", "Code, mise à jour ou données modifiés sans vérification d’intégrité.", "Repère : pipeline ou import accepté sans signature ni contrôle d’origine."],
    ["a09", "Security Logging & Alerting Failures", "Journalisation, détection ou alerte insuffisantes.", "Repère : événement critique non tracé, non corrélé ou non remonté."],
    ["a10", "Mishandling of Exceptional Conditions", "Erreurs, états anormaux ou reprises hasardeuses mal gérés.", "Repère : exception bavarde, fail-open, débordement de taille ou reprise dangereuse après erreur."],
  ];
  return [
    "# Mémo OWASP Top 10:2025",
    "",
    "Ce mémo sert à rattacher un constat à une catégorie du Top 10 sans connaissance externe.",
    "Utilise le code et la description ensemble.",
    "",
    ...rows.flatMap(([code, title, meaning, cue]) => [
      `## ${code.toUpperCase()} ${title}`,
      `Code de réponse : ${code}`,
      `Définition courte : ${meaning}`,
      cue,
      "",
    ]),
  ].join("\n");
}

function buildGuide() {
  return [
    "# Guide du TP 5",
    "",
    "> Cadre et limites : tu analyses uniquement des fichiers fournis et fictifs.",
    "> Ne teste jamais un système réel sans autorisation écrite.",
    "> Tous les horodatages du proxy sont en UTC et se terminent par Z : ne les convertis pas en heure locale.",
    "",
    "## 1. Lire le proxy sans te perdre",
    "",
    "Le fichier JSONL contient une ligne JSON par événement du proxy.",
    "Commence par filtrer `path`, `method`, `status` et `resourceType`.",
    "Les lignes `static`, les 304 et les redirections servent surtout de bruit.",
    "Pour compter une ressource métier, garde les chemins fonctionnels et retire la query string.",
    "",
    "## 2. Statuts des notes",
    "",
    "- **Confirmé** : la preuve minimale est visible dans les fichiers, avec un comportement défendable et reproductible sur dossier.",
    "- **Hypothèse** : un indice existe, mais il manque une preuve d’acceptation, d’effet ou de lecture.",
    "- **Réfuté** : la ligne de preuve attendue montre au contraire que le contrôle tient.",
    "",
    "Un téléversement refusé n’est donc pas un constat : il faut une preuve d’acceptation ou de restitution.",
    "Un 403 ou un 404 cohérent sur un identifiant manipulé va dans « réfuté » ou « rejet correct », pas dans « confirmé ».",
    "",
    "## 3. Visionneuse du site",
    "",
    "Dans la visionneuse, cherche d’abord un chemin comme `/auth/login`, puis un `resourceType`, puis un `status`.",
    "Pour une question sur l’heure, copie exactement `HH:MM:SS` depuis l’horodatage UTC.",
    "Pour une question sur un chemin, réponds avec `path` seulement, sans la query string.",
    "",
    "## 4. Exemple Bash sur des données inventées",
    "",
    "```bash",
    "cat > guide-proxy-exemple.jsonl <<'EOF'",
    "{\"timestamp\":\"2026-06-10T08:10:00Z\",\"method\":\"POST\",\"path\":\"/auth/login\",\"status\":401,\"resourceType\":\"auth\"}",
    "{\"timestamp\":\"2026-06-10T08:10:10Z\",\"method\":\"POST\",\"path\":\"/auth/login\",\"status\":302,\"resourceType\":\"auth\"}",
    "{\"timestamp\":\"2026-06-10T08:11:00Z\",\"method\":\"GET\",\"path\":\"/api/contrats/view\",\"status\":200,\"resourceType\":\"dossier\"}",
    "EOF",
    "grep '\"method\":\"POST\"' guide-proxy-exemple.jsonl | grep '\"path\":\"/auth/login\"' | wc -l",
    "```",
    "",
    "```bash",
    "cat > guide-doc-exemple.jsonl <<'EOF'",
    "{\"timestamp\":\"2026-06-10T08:14:00Z\",\"path\":\"/api/rapports/telecharger\",\"status\":200,\"resourceType\":\"document\",\"responseBytes\":4200}",
    "{\"timestamp\":\"2026-06-10T08:14:10Z\",\"path\":\"/api/rapports/telecharger\",\"status\":200,\"resourceType\":\"document\",\"responseBytes\":8300}",
    "{\"timestamp\":\"2026-06-10T08:14:20Z\",\"path\":\"/api/contrats/view\",\"status\":200,\"resourceType\":\"dossier\",\"responseBytes\":900}",
    "EOF",
    "grep '\"resourceType\":\"document\"' guide-doc-exemple.jsonl | grep '\"status\":200' | grep -o '\"responseBytes\":[0-9]*' | cut -d: -f2 | sort -n | tail -n 1",
    "```",
    "",
    "## 5. Exemple PowerShell 5.1 sur des données inventées",
    "",
    "```powershell",
    "@(",
    "  '{\"timestamp\":\"2026-06-10T08:20:00Z\",\"status\":\"confirmé\",\"noteId\":\"N01\"}',",
    "  '{\"timestamp\":\"2026-06-10T08:21:00Z\",\"status\":\"hypothèse\",\"noteId\":\"N02\"}',",
    "  '{\"timestamp\":\"2026-06-10T08:22:00Z\",\"status\":\"confirmé\",\"noteId\":\"N03\"}'",
    ") | Set-Content -Encoding UTF8 guide-notes-exemple.jsonl",
    "$confirmed = Get-Content -Encoding UTF8 guide-notes-exemple.jsonl | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.status -eq 'confirmé' }",
    "$confirmed.Count",
    "```",
    "",
    "```powershell",
    "@(",
    "  '2026-06-10T08:24:00Z N41 Statut=hypothèse Preuve=aucune_acceptation',",
    "  '2026-06-10T08:25:00Z N42 Statut=réfuté Preuve=403_cohérent'",
    ") | Set-Content -Encoding UTF8 guide-statut-exemple.txt",
    "Get-Content -Encoding UTF8 guide-statut-exemple.txt | Select-String 'hypothèse' | ForEach-Object { $_.Line.Split(' ')[1] }",
    "```",
    "",
    "## 6. Repérer un vrai défaut de contrôle d’accès",
    "",
    "Pour un contrôle horizontal cassé, cherche une ligne où `manipulatedIdentifier` vaut `true`,",
    "où `actorAccount` et `resourceOwner` diffèrent,",
    "et où la réponse reste `200` ou un autre succès.",
    "Si le serveur renvoie `403` ou `404` avec ces mêmes conditions, la tentative est rejetée correctement.",
    "",
    "## 7. Repérer une faiblesse de session",
    "",
    "Une faiblesse de session ne se limite pas à un mot de passe faible.",
    "Le mémo classe aussi ici la fixation de session, la rotation absente et le logout incomplet.",
    "Sur dossier, compare les cookies et les `set-cookie` avant et après la connexion réussie.",
    "Si l’identifiant de session ne change pas, la note reste défendable sans avoir besoin d’un test actif.",
    "",
    "## 8. Choisir une formulation défendable",
    "",
    "Une formulation défendable décrit le fait, sa preuve et sa limite.",
    "Évite les phrases absolues du type « le portail est totalement compromis » si le dossier ne le prouve pas.",
    "Préfère une phrase factuelle, précise et proportionnée au comportement observé.",
    "",
    "## 9. À retenir",
    "",
    "- Ne convertis pas le `Z` du proxy en heure locale.",
    "- Un upload refusé reste une hypothèse, pas un constat.",
    "- Une réponse 200 sur l’objet d’un autre compte oriente vers la catégorie Broken Access Control du mémo.",
    "- Une session non régénérée après login oriente vers la catégorie d’authentification du mémo.",
  ].join("\n");
}

function buildNotes(entries) {
  const idByTag = Object.fromEntries(entries.filter((entry) => entry._tag).map((entry) => [entry._tag, entry.id]));
  const notes = [
    ["N01", "confirmé", "divulgation-technique", "faible", [idByTag["n01-proof"]], "a02", "L’en-tête X-Powered-By expose Express sur une réponse 200. C’est une information technique utile à corriger, mais elle ne prouve pas une compromission.", "Conserver comme constat non critique, avec une formulation proportionnée."],
    ["N02", "réfuté", "fonction-admin-bloquee", "nulle", [idByTag["n02-proof"]], "-", "La tentative d’accès à /api/admin/export répond 403 pour un compte non autorisé. Le contrôle vu dans le dossier joue bien son rôle.", "Classer comme rejet légitime, pas comme défaut d’accès."],
    ["N03", "réfuté", "redirection", "nulle", [idByTag["n03-proof"]], "-", "Le paramètre next est refusé avec un 400. Le dossier ne montre pas de redirection ouverte exploitable.", "Classer comme piste invalidée par la réponse serveur."],
    ["N04", "confirmé", "controle-acces-horizontal", "haute", [idByTag["n04-success-1"], idByTag["n04-success-2"], idByTag["n04-success-3"], idByTag["n04-success-4"]], "a01", "Quatre réponses 200 montrent qu’un compte lit un dossier ou un document appartenant à une autre coopérative. La preuve combine identifiant manipulé, propriétaire différent et succès serveur.", "Présenter en premier : l’exposition de données est immédiate et déjà prouvée."],
    ["N05", "confirmé", "faiblesse-session", "moyenne", [idByTag["n05-prelogin"], idByTag["n05-login"], idByTag["n05-postlogin"]], "a07", "La session sess-demo-5101 est semée avant authentification puis conservée telle quelle après le login réussi. Le cycle de session ne régénère pas l’identifiant.", "Conserver comme faiblesse de session défendable sur dossier."],
    ["N06", "réfuté", "role-query-bloquee", "nulle", [idByTag["n06-proof"]], "-", "Le changement d’identifiant vise DOS-5112, mais le serveur renvoie 403. La lecture d’un autre dossier n’est pas obtenue dans cette ligne.", "Classer en rejet correct, même si la ligne ressemble à la vraie faille."],
    ["N07", "hypothèse", "televersement", "a-surveiller", [idByTag["n07-1"], idByTag["n07-2"], idByTag["n07-3"]], "-", "Trois téléversements sont testés sur la route d’upload, mais tous sont refusés avec 415 ou 422. Aucune preuve d’acceptation ni de restitution n’apparaît.", "Laisser au statut hypothèse tant qu’aucune acceptation n’est visible."],
    ["N08", "hypothèse", "previsualisation-export", "faible", [idByTag["n08-proof"]], "-", "Le paramètre role=finance attire l’attention, mais la réponse 403 ne prouve pas une fuite. Il manque un succès ou un contenu lisible.", "Garder en hypothèse faute de preuve d’effet."],
    ["N09", "réfuté", "document-inexistant", "nulle", [idByTag["n09-proof"]], "-", "La demande sur DOC-6104-PDF rend 404, ce qui correspond à un rejet cohérent d’identifiant non accessible.", "Classer comme contrôle correct ou ressource absente, pas comme fuite."],
    ["N10", "confirmé", "enumeration-authentification", "faible", [idByTag["n10-unknown-1"], idByTag["n10-password-1"], idByTag["n10-unknown-2"], idByTag["n10-password-2"]], "a07", "Les réponses d’authentification distinguent « compte inconnu » de « mot de passe incorrect ». Le dossier suffit à prouver une énumération de comptes.", "Conserver comme constat confirmé, mais moins urgent que l’exposition de données."],
  ];

  return notes.map(([id, status, type, priority, proofs, owasp, summary, decision]) => [
    id,
    `Statut : ${status}`,
    `Type : ${type}`,
    `Priorité : ${priority}`,
    `Preuves proxy : ${proofs.join(", ")}`,
    `OWASP pressenti : ${owasp}`,
    `Synthèse : ${summary}`,
    `Décision : ${decision}`,
    "",
  ].join("\n")).join("\n");
}

function buildPtAssetsTp5() {
  const entries = buildProxyHistory();
  const notes = buildNotes(entries);
  const memo = buildOwaspMemo();
  const guide = buildGuide();
  return {
    files: [
      { name: PROXY_FILE, data: text(entries.map((entry) => JSON.stringify(publicEntry(entry))).join("\n")) },
      { name: NOTES_FILE, data: text(notes) },
      { name: OWASP_FILE, data: text(memo) },
      { name: GUIDE_FILE, data: text(guide) },
    ],
    facts: {
      ptTp5: {
        assetNames: { proxy: PROXY_FILE, notes: NOTES_FILE, owasp: OWASP_FILE, guide: GUIDE_FILE },
        authRoute: AUTH_ROUTE,
        uploadRoute: UPLOAD_ROUTE,
        businessWinnerPath: uniqueMax(countBy(entries.filter((entry) => ["dossier", "document", "beneficiaire"].includes(entry.resourceType)), (entry) => entry.path)),
        authPostCount: entries.filter((entry) => entry.method === "POST" && entry.path === AUTH_ROUTE).length,
        confirmedAccessNote: "N04",
        accessOwasp: "a01",
        errorOwasp: "a10",
        horizontalReadCount: entries.filter((entry) => entry.manipulatedIdentifier && entry.status === 200 && entry.actorAccount !== entry.resourceOwner).length,
        unprovenUploadNote: "N07",
        maxDocumentBytes: Math.max(...entries.filter((entry) => entry.resourceType === "document" && entry.status === 200).map((entry) => entry.responseBytes)),
        rejectedManipulationCount: entries.filter((entry) => entry.manipulatedIdentifier && [403, 404].includes(entry.status)).length,
        confirmedSessionNote: "N05",
        sessionOwasp: "a07",
        defendableLetter: "c",
        confirmedNotesCount: 4,
        firstPriorityNote: "N04",
      },
    },
  };
}

module.exports = { buildPtAssetsTp5 };
