"use strict";

const text = (value) => Buffer.from(value.replace(/\r?\n/g, "\n"), "utf8");

function parseVersion(value) {
  return value.split(".").map((part) => Number(part));
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function versionInRange(version, range) {
  return range.split(/\s+/u).filter(Boolean).every((clause) => {
    const match = /^(<=|>=|<|>|=)?(\d+\.\d+\.\d+)$/u.exec(clause);
    if (!match) throw new Error(`Plage SemVer non prise en charge: ${range}`);
    const [, operator = "=", boundary] = match;
    const comparison = compareVersions(version, boundary);
    if (operator === "<") return comparison < 0;
    if (operator === "<=") return comparison <= 0;
    if (operator === ">") return comparison > 0;
    if (operator === ">=") return comparison >= 0;
    return comparison === 0;
  });
}

function roundup(value) {
  const scaled = Math.round(value * 100000);
  if (scaled % 10000 === 0) return scaled / 100000;
  return (Math.floor(scaled / 10000) + 1) / 10;
}

function cvssScore(vector) {
  const parts = Object.fromEntries(vector.split("/").slice(1).map((part) => part.split(":")));
  const weights = {
    AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
    AC: { L: 0.77, H: 0.44 },
    UI: { N: 0.85, R: 0.62 },
    CIA: { N: 0, L: 0.22, H: 0.56 },
  };
  const pr = parts.S === "C"
    ? { N: 0.85, L: 0.68, H: 0.5 }
    : { N: 0.85, L: 0.62, H: 0.27 };
  const iss = 1 - ((1 - weights.CIA[parts.C]) * (1 - weights.CIA[parts.I]) * (1 - weights.CIA[parts.A]));
  const impact = parts.S === "C"
    ? 7.52 * (iss - 0.029) - 3.25 * ((iss - 0.02) ** 15)
    : 6.42 * iss;
  const exploitability = 8.22 * weights.AV[parts.AV] * weights.AC[parts.AC] * pr[parts.PR] * weights.UI[parts.UI];
  if (impact <= 0) return 0;
  const base = parts.S === "C" ? Math.min(1.08 * (impact + exploitability), 10) : Math.min(impact + exploitability, 10);
  return roundup(base);
}

function cvssLevel(score) {
  if (score === 0) return "aucune";
  if (score < 4) return "faible";
  if (score < 7) return "moyenne";
  if (score < 9) return "élevée";
  return "critique";
}

function lineNumber(lines, matcher) {
  const index = lines.findIndex((line) => matcher.test(line));
  if (index === -1) throw new Error(`Ligne introuvable: ${matcher}`);
  return index + 1;
}

function normal(value) {
  return String(value).toLowerCase().trim().replace(/\s+/g, " ");
}

function scoreAnswers(value) {
  const fixed = Number(value).toFixed(1);
  return Array.from(new Set([fixed, fixed.replace(".", ",")].map(normal)));
}

function buildGuide() {
  return [
    "# Guide du TP 6 : configuration, dépendances et notation CVSS",
    "",
    "> Cadre et limites",
    ">",
    "> Tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
    "> Les exemples ci-dessous utilisent des données inventées, pas celles du laboratoire.",
    "",
    "## Méthode générale",
    "",
    "1. Lis d’abord la configuration comme une liste de contrôles simples : protocoles, en-têtes, cache et exposition involontaire.",
    "2. Dans la racine du site, distingue les fichiers attendus des artefacts qui ne doivent jamais être publics : fichiers d’environnement, répertoires Git, archives et pages de diagnostic.",
    "3. Pour les dépendances, compare toujours la version installée à la plage touchée, puis à la version corrigée.",
    "4. Pour CVSS 3.1, applique la formule de FIRST telle quelle et arrondis toujours au dixième supérieur.",
    "",
    "## Liste de contrôle utilisée dans ce TP",
    "",
    "- `server_tokens` ne doit pas exposer la version.",
    "- `autoindex` doit rester désactivé sur un site public.",
    "- TLS 1.0 et TLS 1.1 ne doivent pas être autorisés.",
    "- Une page sensible ne doit pas être explicitement mise en cache en `public`.",
    "- Les réponses HTML doivent envoyer l’en-tête HSTS (`Strict-Transport-Security`).",
    "- Les réponses HTML doivent envoyer une politique `Content-Security-Policy`.",
    "- Les réponses HTML doivent envoyer `X-Content-Type-Options: nosniff`.",
    "- Les fichiers `.env`, les répertoires `.git/` (par exemple `.git/HEAD`), les archives de sauvegarde et les pages de diagnostic ne doivent pas être servis au public. Cette règle porte sur les fichiers réellement servis, pas sur le fichier de configuration.",
    "",
    "Une règle violée compte pour un seul défaut, même si plusieurs lignes ou plusieurs protocoles la concernent.",
    "",
    "## Exemple bash : repérer des directives fragiles",
    "",
    "```bash",
    "cat > exemple-nginx.conf <<'EOF'",
    "server_tokens on;",
    "ssl_protocols TLSv1.2 TLSv1.3;",
    "location /telechargements/ {",
    "  autoindex off;",
    "}",
    "EOF",
    "printf 'server_tokens actifs: '; grep -c '^server_tokens on;' exemple-nginx.conf",
    "printf 'directives autoindex: '; grep -c 'autoindex' exemple-nginx.conf",
    "```",
    "",
    "## Exemple PowerShell : compter les artefacts jamais publics",
    "",
    "```powershell",
    "@(",
    "  'Path;Status;Size'",
    "  '/.env;200;512'",
    "  '/robots.txt;200;81'",
    "  '/phpinfo.php;404;0'",
    ") | Set-Content -Encoding UTF8 exemple-racine.csv",
    "$rows = Import-Csv -Delimiter ';' -Encoding UTF8 exemple-racine.csv",
    "$neverPublic = $rows | Where-Object { $_.Path -in '/.env', '/phpinfo.php' -and $_.Status -eq '200' }",
    "Write-Output $neverPublic.Count",
    "```",
    "",
    "## Exemple bash : comparer des versions SemVer",
    "",
    "```bash",
    "cat > exemple-dependances.csv <<'EOF'",
    "package;version",
    "api-kit;1.4.2",
    "ui-kit;2.0.0",
    "EOF",
    "printf 'plus ancien que 1.4.4: '; awk -F';' 'NR==2 { print ($2 < \"1.4.4\") ? \"à vérifier\" : \"ok\" }' exemple-dependances.csv",
    "printf 'ordre naturel: '; printf '%s\n' 1.4.2 1.4.4 2.0.0 | sort -V | tail -n 1",
    "```",
    "",
    "## Exemple PowerShell : comparer des versions",
    "",
    "```powershell",
    "$installed = [version]'2.3.4'",
    "$fixed = [version]'2.3.7'",
    "if ($installed -lt $fixed) { Write-Output 'mise à jour requise' } else { Write-Output 'version déjà corrigée' }",
    "```",
    "",
    "## CVSS 3.1 : formule à utiliser",
    "",
    "- `ISS = 1 - (1 - C) × (1 - I) × (1 - A)`",
    "- Portée inchangée : `Impact = 6,42 × ISS`",
    "- Portée modifiée : `Impact = 7,52 × (ISS - 0,029) - 3,25 × (ISS - 0,02)^15`",
    "- `Exploitabilité = 8,22 × AV × AC × PR × UI`",
    "- Si `Impact <= 0`, la note vaut `0,0`.",
    "- Portée inchangée : `Arrondi_sup(min(Impact + Exploitabilité, 10))`",
    "- Portée modifiée : `Arrondi_sup(min(1,08 × (Impact + Exploitabilité), 10))`",
    "- `Arrondi_sup` signifie : le plus petit nombre à une décimale supérieur ou égal à la valeur.",
    "",
    "| Métrique | Valeurs utiles |",
    "|---|---|",
    "| AV | N 0,85 ; A 0,62 ; L 0,55 ; P 0,2 |",
    "| AC | L 0,77 ; H 0,44 |",
    "| PR | N 0,85 ; L 0,62 ou 0,68 ; H 0,27 ou 0,5 selon la portée |",
    "| UI | N 0,85 ; R 0,62 |",
    "| C, I, A | H 0,56 ; L 0,22 ; N 0 |",
    "",
    "Qualification de la note de base :",
    "",
    "| Qualification | Note |",
    "|---|---|",
    "| Aucune | 0,0 |",
    "| Faible | 0,1 à 3,9 |",
    "| Moyenne | 4,0 à 6,9 |",
    "| Élevée | 7,0 à 8,9 |",
    "| Critique | 9,0 à 10,0 |",
    "",
    "## Exemple de calcul manuel",
    "",
    "Prends le vecteur fictif `CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:U/C:H/I:L/A:N`.",
    "",
    "1. Remplace chaque lettre par sa valeur.",
    "2. Calcule `ISS`, puis `Impact`, puis `Exploitabilité`.",
    "3. Additionne, applique `min(..., 10)`, puis l’arrondi supérieur au dixième.",
    "4. Convertis enfin la note en qualification : faible, moyenne, élevée ou critique.",
    "",
    "## Dans la visionneuse du site",
    "",
    "- Ouvre d’abord `swb-tp6-nginx.conf` pour relever les directives évidentes.",
    "- Ouvre ensuite `swb-tp6-racine-site.txt` pour lister ce qui répond encore en `200`.",
    "- Termine par `swb-tp6-dependances.csv` et `swb-tp6-avis.csv` pour faire la comparaison paquet par paquet.",
    "",
  ].join("\n");
}

function buildSwbAssetsTp6() {
  const assetNames = {
    configFile: "swb-tp6-nginx.conf",
    rootFile: "swb-tp6-racine-site.txt",
    depsFile: "swb-tp6-dependances.csv",
    advisoryFile: "swb-tp6-avis.csv",
    guideFile: "swb-tp6-guide.md",
  };

  const nginxLines = [
    "user www-data;",
    "worker_processes auto;",
    "pid /run/nginx.pid;",
    "error_log /var/log/nginx/error.log warn;",
    "include /etc/nginx/modules-enabled/*.conf;",
    "",
    "events {",
    "  worker_connections 2048;",
    "}",
    "",
    "http {",
    "  include /etc/nginx/mime.types;",
    "  default_type application/octet-stream;",
    "  log_format main '$remote_addr - $remote_user [$time_local] \"$request\" '",
    "                  '$status $body_bytes_sent \"$http_referer\" '",
    "                  '\"$http_user_agent\" \"$http_x_forwarded_for\"';",
    "  access_log /var/log/nginx/access.log main;",
    "  sendfile on;",
    "  tcp_nopush on;",
    "  keepalive_timeout 65;",
    "  types_hash_max_size 4096;",
    "  server_tokens on;",
    "  client_max_body_size 8m;",
    "",
    "  upstream resa_app {",
    "    server 172.20.20.45:8080;",
    "    keepalive 16;",
    "  }",
    "",
    "  server {",
    "    listen 80;",
    "    server_name reservation.palmier-or.example palmier-or.example;",
    "    return 301 https://reservation.palmier-or.example$request_uri;",
    "  }",
    "",
    "  server {",
    "    listen 443 ssl http2;",
    "    server_name reservation.palmier-or.example;",
    "    root /srv/reservation/current/public;",
    "    index index.html;",
    "",
    "    ssl_certificate /etc/letsencrypt/live/reservation/fullchain.pem;",
    "    ssl_certificate_key /etc/letsencrypt/live/reservation/privkey.pem;",
    "    ssl_session_cache shared:SSL:20m;",
    "    ssl_session_timeout 1d;",
    "    ssl_protocols TLSv1 TLSv1.1 TLSv1.2 TLSv1.3;",
    "    ssl_ciphers HIGH:!aNULL:!MD5;",
    "    ssl_prefer_server_ciphers on;",
    "",
    "    add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;",
    "    add_header Permissions-Policy \"camera=(), microphone=(), geolocation=()\" always;",
    "    add_header X-Frame-Options \"SAMEORIGIN\" always;",
    "",
    "    location = /healthz {",
    "      access_log off;",
    "      return 200 \"ok\";",
    "    }",
    "",
    "    location /assets/ {",
    "      try_files $uri =404;",
    "      expires 7d;",
    "    }",
    "",
    "    location /exports/ {",
    "      autoindex on;",
    "      alias /srv/reservation/exports/;",
    "    }",
    "",
    "    location /espace-client/ {",
    "      add_header Cache-Control \"public, max-age=600\" always;",
    "      try_files $uri $uri/ /espace-client/index.html;",
    "    }",
    "",
    "    location /api-preview/ {",
    "      proxy_pass http://172.20.20.45:8080;",
    "      proxy_set_header Host $host;",
    "      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "      proxy_set_header X-Forwarded-Proto $scheme;",
    "    }",
    "",
    "    location /api/ {",
    "      proxy_pass http://resa_app;",
    "      proxy_http_version 1.1;",
    "      proxy_set_header Connection \"\";",
    "      proxy_set_header Host $host;",
    "      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
    "      proxy_set_header X-Forwarded-Proto $scheme;",
    "    }",
    "",
    "    location / {",
    "      try_files $uri $uri/ /index.html;",
    "    }",
    "  }",
    "}",
  ];

  const rootRows = [
    ["/", 200, 2410, "page d’accueil"],
    ["/index.html", 200, 2410, "page publique normale"],
    ["/robots.txt", 200, 91, "indexation"],
    ["/.env", 200, 512, "fichier d’environnement"],
    ["/.git/HEAD", 200, 23, "métadonnées Git"],
    ["/phpinfo.php", 200, 1834, "page de diagnostic"],
    ["/sauvegarde.zip", 200, 2481190, "archive de sauvegarde"],
    ["/security.txt", 404, 0, "politique de divulgation absente"],
    ["/assets/app.js", 200, 84112, "script public"],
    ["/uploads/", 403, 0, "listage désactivé"],
    ["/exports/", 200, 362, "listage visible"],
    ["/favicon.ico", 200, 1150, "icône"],
  ];

  const dependencies = [
    ["express-lite", "4.18.1"],
    ["template-fast", "2.9.4"],
    ["resafetch", "2.4.1"],
    ["session-kit", "1.7.0"],
    ["multer-lite", "1.3.0"],
    ["jwt-helper", "0.9.8"],
    ["yaml-mini", "3.1.0"],
    ["cache-layer", "5.0.2"],
    ["audit-trail", "2.0.0"],
    ["image-thumb", "4.2.0"],
    ["ws-lite", "3.2.2"],
    ["helmet", "8.1.0"],
  ];
  for (let index = 1; index <= 48; index += 1) {
    const name = `module-${String(index).padStart(2, "0")}`;
    const major = 1 + (index % 4);
    const minor = (index * 3) % 9;
    const patch = (index * 7) % 10;
    dependencies.push([name, `${major}.${minor}.${patch}`]);
  }

  const advisories = [
    ["swb-adv-2026-001", "express-lite", "<4.18.3", "4.18.3", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N", "non", "internet"],
    ["swb-adv-2026-002", "template-fast", "<3.0.2", "3.0.2", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:L", "oui", "internet"],
    ["swb-adv-2026-003", "resafetch", "<2.4.3", "2.4.3", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N", "non", "internet"],
    ["swb-adv-2026-004", "session-kit", "<1.7.4", "1.7.4", "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:L", "non", "internet"],
    ["swb-adv-2026-005", "multer-lite", "<1.3.2", "1.3.2", "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:N/A:N", "non", "internet"],
    ["swb-adv-2026-006", "jwt-helper", "<0.9.9", "0.9.9", "CVSS:3.1/AV:N/AC:H/PR:L/UI:N/S:U/C:H/I:H/A:H", "oui", "internet"],
    ["swb-adv-2026-007", "yaml-mini", "<3.0.9", "3.0.9", "CVSS:3.1/AV:L/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N", "non", "interne"],
    ["swb-adv-2026-008", "cache-layer", "<5.0.5", "5.0.5", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L", "non", "interne"],
    ["swb-adv-2026-009", "audit-trail", "<1.9.8", "1.9.8", "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", "non", "interne"],
    ["swb-adv-2026-010", "image-thumb", "<4.2.1", "4.2.1", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", "oui", "internet"],
    ["swb-adv-2026-011", "resafetch", ">=2.4.0 <2.4.5", "2.4.5", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:L", "non", "internet"],
    ["swb-adv-2026-012", "ws-lite", "<3.2.0", "3.2.0", "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N", "non", "interne"],
  ].map(([id, pkg, range, fixed, vector, known, exposure]) => ({
    id, packageName: pkg, affectedRange: range, fixedVersion: fixed, vector, knownExploitation: known, exposure,
  }));

  const configText = `${nginxLines.join("\n")}\n`;
  const rootText = `chemin;statut;taille_octets;observation\n${rootRows.map((row) => row.join(";")).join("\n")}\n`;
  const depsText = `paquet;version\n${dependencies.map((row) => row.join(";")).join("\n")}\n`;
  const advisoryText = `identifiant;paquet;plage_touchee;version_corrigee;vecteur_cvss31;exploitation_connue;exposition\n${advisories.map((row) => [
    row.id, row.packageName, row.affectedRange, row.fixedVersion, row.vector, row.knownExploitation, row.exposure,
  ].join(";")).join("\n")}\n`;
  const guideText = `${buildGuide()}\n`;

  const dependencyMap = new Map(dependencies.map(([name, version]) => [name, version]));
  const scoredAdvisories = advisories.map((row) => {
    const installed = dependencyMap.get(row.packageName);
    const affected = installed ? versionInRange(installed, row.affectedRange) : false;
    const score = cvssScore(row.vector);
    return { ...row, installedVersion: installed, affected, score, level: cvssLevel(score) };
  });
  const affectedPackages = new Set(scoredAdvisories.filter((row) => row.affected).map((row) => row.packageName));
  const criticalAffected = scoredAdvisories.filter((row) => row.affected && row.level === "critique");
  const highestAffected = scoredAdvisories.filter((row) => row.affected).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))[0];
  const fixedAlreadyCount = scoredAdvisories.filter((row) => row.installedVersion && !row.affected && compareVersions(row.installedVersion, row.fixedVersion) >= 0).length;
  const majorUpgradePackage = scoredAdvisories.find((row) => row.affected && parseVersion(row.fixedVersion)[0] > parseVersion(row.installedVersion)[0]).packageName;
  const resafetchSafe = scoredAdvisories.filter((row) => row.packageName === "resafetch").map((row) => row.fixedVersion).sort(compareVersions).slice(-1)[0];
  const neverPublicCount = rootRows.filter(([pathName, status]) => status === 200 && ["/.env", "/.git/HEAD", "/phpinfo.php", "/sauvegarde.zip"].includes(pathName)).length;
  const defectCount = [
    /server_tokens on;/u.test(configText),
    /ssl_protocols [^;]*\bTLSv1(?:\.1)?(?=\s|;)/u.test(configText),
    !/Strict-Transport-Security/u.test(configText),
    !/Content-Security-Policy/u.test(configText),
    !/X-Content-Type-Options/u.test(configText),
    /autoindex on;/u.test(configText),
    /Cache-Control "public, max-age=600"/u.test(configText),
  ].filter(Boolean).length;

  const facts = {
    swbTp6: {
      assetNames,
      defectCount,
      autoindexLine: lineNumber(nginxLines, /^\s*autoindex on;/u),
      legacyTlsLine: lineNumber(nginxLines, /^\s*ssl_protocols /u),
      affectedPackageCount: affectedPackages.size,
      highestAffectedAdvisory: highestAffected.id,
      scoreForAdv006: Number(scoredAdvisories.find((row) => row.id === "swb-adv-2026-006").score.toFixed(1)),
      levelLetterForAdv009: { faible: "a", moyenne: "b", "élevée": "c", critique: "d" }[scoredAdvisories.find((row) => row.id === "swb-adv-2026-009").level],
      criticalAffectedCount: criticalAffected.length,
      majorUpgradePackage,
      minimalSafeVersion: resafetchSafe,
      fixedAlreadyCount,
      rootCriticalLetter: "c",
      neverPublicCount,
      patchOrderLetter: "c",
      envReactionLetter: "d",
    },
  };

  return {
    files: [
      { name: assetNames.configFile, data: text(configText) },
      { name: assetNames.rootFile, data: text(rootText) },
      { name: assetNames.depsFile, data: text(depsText) },
      { name: assetNames.advisoryFile, data: text(advisoryText) },
      { name: assetNames.guideFile, data: text(guideText) },
    ],
    facts,
  };
}

module.exports = { buildSwbAssetsTp6 };
