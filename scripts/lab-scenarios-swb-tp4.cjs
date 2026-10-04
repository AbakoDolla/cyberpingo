const crypto = require("node:crypto");

const NOW = Date.parse("2026-05-07T09:00:00Z") / 1000;
const API_AUD = "partenaire-resa-api";
const TOKEN_MAX = 20 * 60;
const IDLE_MAX = 15 * 60;
const text = (v) => Buffer.from(v.replace(/\r?\n/g, "\n"), "utf8");
const pad = (v) => String(v).padStart(2, "0");
const iso = (s) => new Date(s * 1000).toISOString();
const b64u = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v), "utf8").toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const sha = (label) => crypto.createHash("sha256").update(label).digest("hex");
const hmac = (body, secret) => crypto.createHmac("sha256", secret).update(body).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
const fakeHex = (label, len) => sha(`swb-tp4:${label}`).slice(0, len);
const fakeB64 = (label, size) => crypto.createHash("sha256").update(`swb-tp4:${label}`).digest("base64").replace(/=+/g, "").replace(/\+/g, "A").replace(/\//g, "B").slice(0, size);
const fakeBcrypt = (label, cost) => `$2b$${String(cost).padStart(2, "0")}$${fakeB64(`${label}:salt`, 22)}${fakeB64(`${label}:hash`, 31)}`;
const makeJwt = (header, payload, secret) => {
  const head = b64u(header);
  const body = b64u(payload);
  return `${head}.${body}.${hmac(`${head}.${body}`, secret)}`;
};

function buildTokens() {
  const defs = [
    ["J01", { sub: "client-1042", role: "client", aud: API_AUD, iat: NOW - 600, exp: NOW + 300 }],
    ["J02", { sub: "client-1067", role: "client", aud: API_AUD, iat: NOW - 1800, exp: NOW - 600 }],
    ["J03", { sub: "staff-ops-02", role: "admin", aud: API_AUD, iat: NOW - 660, exp: NOW + 240 }],
    ["J04", { sub: "client-1104", role: "client", aud: API_AUD, iat: NOW - 120, exp: NOW + 1080 }, "none"],
    ["J05", { sub: "client-1112", role: "client", aud: "backoffice-resa-api", iat: NOW - 540, exp: NOW + 360 }],
    ["J06", { sub: "client-1150", role: "client", aud: API_AUD, iat: NOW - 2400, exp: NOW + 1200 }],
    ["J07", { sub: "client-1188", role: "client", aud: API_AUD, iat: NOW - 240, exp: NOW + 360 }, "tampered"],
    ["J08", { sub: "client-1206", role: "client", aud: API_AUD, iat: NOW - 60, exp: NOW + 1140 }],
    ["J09", { sub: "client-1231", role: "staff", aud: API_AUD, iat: NOW - 5400, exp: NOW - 1200 }],
    ["J10", { sub: "client-1284", role: "client", aud: "statistiques-partenaires", iat: NOW - 420, exp: NOW + 480 }],
    ["J11", { sub: "client-1315", role: "client", aud: API_AUD, iat: NOW - 1800, exp: NOW + 900 }],
    ["J12", { sub: "client-1340", role: "client", aud: API_AUD, iat: NOW - 900, exp: NOW }, "other"],
  ];
  const lines = ["jeton_id;jwt"];
  const rows = defs.map(([id, payload, mode]) => {
    const header = mode === "none" ? { alg: "none", typ: "JWT" } : { alg: "HS256", typ: "JWT" };
    let jwt;
    if (mode === "none") jwt = `${b64u(header)}.${b64u(payload)}.`;
    else if (mode === "tampered") {
      const signed = makeJwt(header, { ...payload, role: "client" }, "secret-d-exemple");
      const [head, , sig] = signed.split(".");
      jwt = `${head}.${b64u(payload)}.${sig}`;
    } else jwt = makeJwt(header, payload, mode === "other" ? "secret-secondaire-factice" : "secret-d-exemple");
    lines.push(`${id};${jwt}`);
    return { id, jwt };
  });
  return { rows, file: text(`${lines.join("\n")}\n`) };
}

function buildSessionLog() {
  const users = ["msylla", "adiop", "jbouedraogo", "ksow", "svc-resa", "staff-hall", "staff-night", "client-1222"];
  const ips = ["172.20.10.14", "172.20.10.18", "172.20.10.21", "172.20.10.44", "198.51.100.30", "198.51.100.44", "203.0.113.11", "203.0.113.41"];
  const rows = [];
  const push = (s, id, ev, user, ip, path, decision, next = "") => rows.push({ ts: iso(s), sessionId: id, event: ev, user, sourceIp: ip, path, decision, rotatedTo: next });
  for (let i = 0; i < 30; i += 1) {
    const base = NOW - 10800 + i * 150;
    const user = users[i % users.length];
    const ip = ips[i % ips.length];
    const pre = `sid-pre-${pad(i + 1)}-${fakeHex(`pre-${i}`, 6)}`;
    const auth = `sid-auth-${pad(i + 1)}-${fakeHex(`auth-${i}`, 6)}`;
    const sticky = new Set([3, 11, 24]).has(i);
    const postLogout = new Set([5, 19]).has(i);
    const idleBug = new Set([7, 15, 22, 28]).has(i);
    const live = sticky ? pre : auth;
    push(base, pre, "request", "anonymous", ip, "/connexion", "accepted");
    push(base + 50, pre, "request", "anonymous", ip, "/assets/app.css", "accepted");
    push(base + 110, pre, "login", user, ip, "/auth/login", "success", live);
    push(base + 170, live, "request", user, ip, "/api/me", "accepted");
    push(base + 250, live, "request", user, ip, "/api/reservations", "accepted");
    push(base + 340, live, "request", user, ip, `/api/reservations/${2000 + i}`, "accepted");
    push(base + 430, live, "request", user, ip, "/api/profil", "accepted");
    push(base + 520, live, "request", user, ip, "/api/tableau-de-bord", "accepted");
    if (idleBug) {
      push(base + 1700, live, "request", user, ip, "/api/messages", "accepted");
      push(base + 1760, live, "logout", user, ip, "/auth/logout", "ok");
    } else {
      push(base + 610, live, "request", user, ip, "/api/messages", "accepted");
      push(base + 700, live, "logout", user, ip, "/auth/logout", "ok");
    }
    if (postLogout) {
      push(base + 780, live, "request", user, ip, "/api/factures", "accepted");
      push(base + 860, live, "timeout", user, ip, "/session/check", "expired");
    }
  }
  for (let j = 0; j < 4; j += 1) {
    const base = NOW - 5400 + j * 870;
    const sid = `sid-timeout-${j + 1}-${fakeHex(`timeout-${j}`, 5)}`;
    const ip = `203.0.113.${60 + j}`;
    push(base, sid, "request", "anonymous", ip, "/connexion", "accepted");
    push(base + 40, sid, "login", `client-${1400 + j}`, ip, "/auth/login", "success", sid.replace("timeout", "active"));
    push(base + 100, sid.replace("timeout", "active"), "request", `client-${1400 + j}`, ip, "/api/me", "accepted");
    push(base + 1300, sid.replace("timeout", "active"), "timeout", `client-${1400 + j}`, ip, "/session/check", "expired");
    push(base + 1340, sid.replace("timeout", "active"), "request", `client-${1400 + j}`, ip, "/api/me", "denied");
  }
  rows.sort((a, b) => a.ts.localeCompare(b.ts) || a.sessionId.localeCompare(b.sessionId) || a.event.localeCompare(b.event));
  const lines = ["timestamp_utc;session_id;event;user;source_ip;path;decision;rotated_to"];
  for (const r of rows) lines.push([r.ts, r.sessionId, r.event, r.user, r.sourceIp, r.path, r.decision, r.rotatedTo].join(";"));
  return { rows, file: text(`${lines.join("\n")}\n`) };
}

function buildHashes() {
  const compliant = [
    ["jbouedraogo", "staff", `$argon2id$v=19$m=19456,t=2,p=1$${fakeB64("jb-s", 22)}$${fakeB64("jb-h", 43)}`],
    ["msylla", "staff", `$argon2id$v=19$m=19456,t=2,p=1$${fakeB64("ms-s", 22)}$${fakeB64("ms-h", 43)}`],
    ["adiop", "staff", fakeBcrypt("adiop", 12)],
    ["ksow", "staff", "pbkdf2-sha256$650000$" + fakeHex("ksow-s", 24) + "$" + fakeHex("ksow-h", 64)],
    ["svc-resa", "service", fakeBcrypt("svc-resa", 13)],
    ["svc-sauvegarde", "service", `$argon2id$v=19$m=19456,t=2,p=1$${fakeB64("svcs-s", 22)}$${fakeB64("svcs-h", 43)}`],
    ["staff-frontdesk", "staff", fakeBcrypt("frontdesk", 12)],
    ["staff-night", "staff", "pbkdf2-sha256$700000$" + fakeHex("night-s", 24) + "$" + fakeHex("night-h", 64)],
    ["admin-resa", "staff", `$argon2id$v=19$m=19456,t=2,p=1$${fakeB64("admin-s", 22)}$${fakeB64("admin-h", 43)}`],
    ["audit-local", "staff", fakeBcrypt("audit", 14)],
  ];
  for (let i = 0; i < 20; i += 1) compliant.push([`client-${1001 + i}`, "client", i % 3 === 0 ? fakeBcrypt(`c${i}`, 12) : i % 3 === 1 ? `$argon2id$v=19$m=19456,t=2,p=1$${fakeB64(`ca${i}-s`, 22)}$${fakeB64(`ca${i}-h`, 43)}` : "pbkdf2-sha256$600000$" + fakeHex(`cp${i}-s`, 24) + "$" + fakeHex(`cp${i}-h`, 64)]);
  const weak = [
    ["legacy-mobile", "client", "md5$" + fakeHex("legacy-mobile", 32)],
    ["client-1028", "client", "sha1$" + fakeHex("client-1028", 40)],
    ["client-1041", "client", "sha1$" + fakeHex("client-1041", 40)],
    ["client-1053", "client", "sha256$" + fakeHex("client-1053", 64)],
    ["client-1064", "client", "sha256$" + fakeHex("client-1064", 64)],
    ["client-1076", "client", "sha256$" + fakeHex("client-1076", 64)],
    ["client-1089", "client", "sha256$" + fakeHex("client-1089", 64)],
    ["client-1108", "client", "pbkdf2-sha256$120000$" + fakeHex("client-1108-s", 24) + "$" + fakeHex("client-1108-h", 64)],
    ["client-1127", "client", "pbkdf2-sha256$200000$" + fakeHex("client-1127-s", 24) + "$" + fakeHex("client-1127-h", 64)],
    ["legacy-sync", "service", fakeBcrypt("legacy-sync", 10)],
    ["old-exporter", "service", fakeBcrypt("old-exporter", 11)],
  ];
  const rows = [...compliant, ...weak];
  const lines = ["compte;profil;empreinte", ...rows.map((r) => r.join(";"))];
  return { rows, file: text(`${lines.join("\n")}\n`) };
}

function buildPolicy() {
  const lines = [
    "# Politique de sessions et de jetons de l’Hôtel Palmier d’Or",
    "",
    "Référence temporelle pour ce TP : jeudi 7 mai 2026 à 09:00:00 UTC.",
    "Audience attendue pour l’API partenaire : partenaire-resa-api.",
    "",
    "## Jetons JWT",
    "",
    "- Les jetons d’accès de l’API partenaire utilisent HS256 et le secret d’essai « secret-d-exemple » sert seulement à vérifier la signature.",
    "- Tout jeton qui annonce un autre algorithme ou qui ne valide pas sa signature est rejeté.",
    "- La durée de validité d’un jeton d’accès ne doit jamais dépasser 20 minutes. Une durée égale à 20 minutes reste conforme.",
    "",
    "## Sessions",
    "",
    "- Après une connexion réussie, l’identifiant de session doit être régénéré avant les requêtes authentifiées.",
    "- Une déconnexion invalide immédiatement la session côté serveur.",
    "- Après plus de 15 minutes d’inactivité, la requête suivante doit être refusée et l’utilisateur doit se reconnecter.",
    "",
    "## Mots de passe",
    "",
    "- Sont conformes : Argon2id, bcrypt avec un coût au moins égal à 12, PBKDF2-SHA256 avec au moins 600000 itérations.",
    "- Ne sont pas conformes : MD5, SHA-1, SHA-256 sans sel, bcrypt avec un coût de 10 ou 11, PBKDF2-SHA256 sous 600000 itérations.",
    "- Ordre du plus faible au plus robuste pour ce TP : MD5, SHA-1, SHA-256 sans sel, PBKDF2-SHA256 sous 600000, bcrypt coût 10 ou 11, PBKDF2-SHA256 conforme, bcrypt coût 12 ou plus, Argon2id.",
    "- Longueur minimale d’un mot de passe : 12 caractères.",
  ];
  return text(`${lines.join("\n")}\n`);
}

function buildGuide() {
  const lines = [
    "# Guide du TP 4 : sessions, jetons JWT et mots de passe",
    "",
    "> Cadre et limites",
    ">",
    "> Toutes les données de ce laboratoire sont fictives et figées.",
    "> Tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
    "> Les exemples ci-dessous utilisent des valeurs inventées, pas celles du labo.",
    "",
    "## Lire un JWT sans le confondre avec un secret",
    "",
    "Un JWT signé en JWS contient trois parties séparées par des points : en-tête, charge utile, signature. Les deux premières parties sont simplement encodées en base64url. Elles sont lisibles ; elles ne chiffrent rien.",
    "",
    "## Calculer une signature HMAC sur un exemple inventé",
    "",
    "```bash",
    "cat > demo-jwt.txt <<'EOF'",
    "X-01;eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJhdWQiOiJkZW1vLWFwaSIsImlhdCI6MTc2MjQxNjQwMCwiZXhwIjoxNzYyNDE3MDAwfQ.n9lbSXI8fNfn73uQYxCyeK7Q5jpcFviwoTq1yRCLqbA",
    "EOF",
    "header=$(cut -d';' -f2 demo-jwt.txt | cut -d'.' -f1 | tr '_-' '/+' | awk '{ pad=(4-length($0)%4)%4; printf \"%s\", $0; for(i=0;i<pad;i++) printf \"=\" }' | base64 -d)",
    "body=$(cut -d';' -f2 demo-jwt.txt | cut -d'.' -f1-2)",
    "sig=$(printf '%s' \"$body\" | openssl dgst -sha256 -binary -hmac 'secret-guide-demo' | openssl base64 -A | tr '+/' '-_' | tr -d '=')",
    "printf 'Démo JWT prête : %s partie(s), signature calculée sur un exemple inventé.\\n' \"$(printf '%s' \"$body.$sig\" | awk -F'.' '{print NF}')\"",
    "printf 'En-tête décodé : %s\\n' \"$header\"",
    "```",
    "",
    "```powershell",
    "@'",
    "X-01;eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJhdWQiOiJkZW1vLWFwaSIsImlhdCI6MTc2MjQxNjQwMCwiZXhwIjoxNzYyNDE3MDAwfQ.n9lbSXI8fNfn73uQYxCyeK7Q5jpcFviwoTq1yRCLqbA",
    "'@ | Set-Content -Encoding UTF8 demo-jwt.txt",
    "$jwt = (Get-Content -Encoding UTF8 demo-jwt.txt).Split(';')[1]",
    "$parts = $jwt.Split('.')",
    "$padded = $parts[0].Replace('-', '+').Replace('_', '/')",
    "while (($padded.Length % 4) -ne 0) { $padded += '=' }",
    "$header = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($padded))",
    "$body = \"$($parts[0]).$($parts[1])\"",
    "$hmac = New-Object System.Security.Cryptography.HMACSHA256",
    "$hmac.Key = [Text.Encoding]::UTF8.GetBytes('secret-guide-demo')",
    "$sigBytes = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body))",
    "$sig = [Convert]::ToBase64String($sigBytes).TrimEnd('=').Replace('+','-').Replace('/','_')",
    "\"Démo JWT prête : $($parts.Count) partie(s), signature calculée sur un exemple inventé.\"",
    "\"En-tête décodé : $header\"",
    "```",
    "",
    "## Lire un journal de sessions",
    "",
    "Quand tu relis « sessions.log », trie les événements par identifiant de session puis regarde trois points : l’identifiant change-t-il à la connexion, y a-t-il encore des requêtes acceptées après « logout », et un trou de plus de 15 minutes est-il pourtant accepté ?",
    "",
    "## Lire un stockage de mots de passe",
    "",
    "Repère d’abord les préfixes et les paramètres numériques. Un format qui paraît moderne peut pourtant devenir non conforme si son coût ou son nombre d’itérations est trop faible.",
    "",
    "## Visionneuse du site",
    "",
    "Filtre d’abord sur des mots génériques comme « logout », « login », « alg », « aud », « exp » ou « pbkdf2 », puis relis la ligne entière avant de conclure.",
  ];
  return text(`${lines.join("\n")}\n`);
}

function deriveFacts(tokens, sessions, hashes) {
  const decode = (jwt) => {
    const [h, p, s = ""] = jwt.split(".");
    return {
      header: JSON.parse(Buffer.from(h.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((h.length + 3) % 4), "base64").toString("utf8")),
      payload: JSON.parse(Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((p.length + 3) % 4), "base64").toString("utf8")),
      signature: s,
      signed: `${h}.${p}`,
    };
  };
  const decoded = tokens.rows.map((r) => ({ id: r.id, ...decode(r.jwt) }));
  const expiredCount = decoded.filter((r) => r.payload.exp <= NOW).length;
  const adminId = decoded.find((r) => r.payload.role === "admin").id;
  const algNoneId = decoded.find((r) => r.header.alg === "none").id;
  const wrongAudienceCount = decoded.filter((r) => r.payload.aud !== API_AUD).length;
  const overlongTokenCount = decoded.filter((r) => r.payload.exp - r.payload.iat > TOKEN_MAX).length;
  const invalidSignatureHs256Count = decoded.filter((r) => r.header.alg === "HS256" && hmac(r.signed, "secret-d-exemple") !== r.signature).length;
  const logoutAt = new Map();
  let postLogoutSessionCount = 0;
  let fixationCount = 0;
  let idleAcceptedCount = 0;
  const seenPost = new Set();
  const lastBySession = new Map();
  for (const row of sessions.rows) {
    if (row.event === "logout") logoutAt.set(row.sessionId, row.ts);
    if (row.event === "login" && row.sessionId === row.rotatedTo) fixationCount += 1;
    const prev = lastBySession.get(row.sessionId);
    if (row.event === "request" && row.decision === "accepted" && prev) {
      if ((Date.parse(row.ts) - Date.parse(prev.ts)) / 1000 > IDLE_MAX) idleAcceptedCount += 1;
      if (logoutAt.has(row.sessionId) && Date.parse(row.ts) > Date.parse(logoutAt.get(row.sessionId)) && !seenPost.has(row.sessionId)) {
        seenPost.add(row.sessionId);
        postLogoutSessionCount += 1;
      }
    }
    lastBySession.set(row.sessionId, row);
  }
  const detectAlgo = (value) => {
    if (value.startsWith("$argon2id$")) return "argon2id";
    if (value.startsWith("$2b$")) return "bcrypt";
    if (value.startsWith("pbkdf2-sha256$")) return "pbkdf2-sha256";
    if (value.startsWith("md5$")) return "md5";
    if (value.startsWith("sha1$")) return "sha-1";
    if (value.startsWith("sha256$")) return "sha-256 sans sel";
    return "inconnu";
  };
  const score = (value) => {
    if (value.startsWith("md5$")) return 1;
    if (value.startsWith("sha1$")) return 2;
    if (value.startsWith("sha256$")) return 3;
    if (value.startsWith("pbkdf2-sha256$")) return Number(value.split("$")[1]) >= 600000 ? 6 : 4;
    if (value.startsWith("$2b$")) return Number(value.slice(4, 6)) >= 12 ? 7 : 5;
    if (value.startsWith("$argon2id$")) return 8;
    return 0;
  };
  const nonCompliantHashCount = hashes.rows.filter(([, , value]) => score(value) < 6).length;
  const weakestHashAccount = hashes.rows.slice().sort((a, b) => score(a[2]) - score(b[2]) || a[0].localeCompare(b[0]))[0][0];
  return {
    assetNames: {
      tokensFile: "swb-tp4-jetons.txt",
      sessionsFile: "swb-tp4-sessions.log",
      hashesFile: "swb-tp4-empreintes.csv",
      policyFile: "swb-tp4-politique.md",
      guideFile: "swb-tp4-guide.md",
    },
    policy: { nowUtc: "2026-05-07T09:00:00Z", apiAudience: API_AUD, tokenMaxSeconds: TOKEN_MAX, inactivitySeconds: IDLE_MAX },
    answers: {
      tokenSubId: "J07",
      tokenSub: decoded.find((r) => r.id === "J07").payload.sub,
      algNoneId,
      expiredCount,
      adminId,
      wrongAudienceCount,
      overlongTokenCount,
      invalidSignatureHs256Count,
      postLogoutSessionCount,
      fixationCount,
      idleAcceptedCount,
      hashAccount: "msylla",
      hashAlgorithm: detectAlgo(hashes.rows.find((r) => r[0] === "msylla")[2]),
      nonCompliantHashCount,
      weakestHashAccount,
      fixationLetter: "c",
      revocationLetter: "b",
    },
  };
}

function buildSwbAssetsTp4() {
  const tokens = buildTokens();
  const sessions = buildSessionLog();
  const hashes = buildHashes();
  const facts = { swbTp4: deriveFacts(tokens, sessions, hashes) };
  return {
    files: [
      { name: "swb-tp4-jetons.txt", data: tokens.file },
      { name: "swb-tp4-sessions.log", data: sessions.file },
      { name: "swb-tp4-empreintes.csv", data: hashes.file },
      { name: "swb-tp4-politique.md", data: buildPolicy() },
      { name: "swb-tp4-guide.md", data: buildGuide() },
    ],
    facts,
  };
}

module.exports = { buildSwbAssetsTp4 };
