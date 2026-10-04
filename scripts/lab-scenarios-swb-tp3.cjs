"use strict";

const crypto = require("node:crypto");

const text = (value) => Buffer.from(value.replace(/\r?\n/g, "\n"), "utf8");

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTemplates() {
  const entries = [
    ["G01", "corps HTML échappé", "<h2><%= room.name %></h2>"],
    ["G02", "corps HTML brut", "<div class=\"flash\"><%- flashMessage %></div>"],
    ["G03", "attribut entre guillemets", "<img alt=\"<%= guest.displayName %>\" src=\"/img/logo.png\">"],
    ["G04", "attribut sans guillemets", "<input value=<%- query.term %> data-kind=\"search\">"],
    ["G05", "bloc script", "<script>window.currentGuest = '<%- guest.username %>';</script>"],
    ["G06", "url encodée par le code", "<a href=\"/rooms/<%= room.id %>\">Voir</a>"],
    ["G07", "corps HTML échappé", "<p><%= booking.note %></p>"],
    ["G08", "attribut entre guillemets", "<div data-city=\"<%= booking.city %>\"></div>"],
    ["G09", "url brute", "<a href=\"<%- returnUrl %>\">Retour</a>"],
    ["G10", "corps HTML brut", "<section><%- marketingSnippet %></section>"],
    ["G11", "bloc script avec JSON", "<script>const opts = <%- JSON.stringify(options) %>;</script>"],
    ["G12", "corps HTML échappé", "<span><%= room.statusLabel %></span>"],
  ];
  return `${entries.map(([id, context, snippet]) => `${id} | ${context} | ${snippet}`).join("\n")}\n`;
}

function buildPolicies(scriptHash) {
  const lines = [
    "P1 | default-src 'self'; script-src 'self' https://cdn.palmier-or.example; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'",
    "P2 | default-src 'self'; script-src 'self' https://cdn.palmier-or.example https://widgets.partenaires.example; style-src 'self'; img-src 'self' data:; connect-src 'self' https://api.palmier-or.example; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    "P3 | default-src 'self' 'unsafe-inline' https://cdn.palmier-or.example; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.palmier-or.example",
    "P4 | default-src 'self'; script-src 'self' 'nonce-r4nd0m-mai-2026' https://cdn.palmier-or.example https://widgets.partenaires.example; style-src 'self'; img-src 'self' data:; connect-src 'self' https://api.palmier-or.example; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; report-to csp-endpoint",
    `P5 | default-src 'self'; script-src 'self' 'sha256-${scriptHash}' https://cdn.palmier-or.example; style-src 'self'; img-src 'self' data:; connect-src 'self' https://api.palmier-or.example; object-src 'none'; base-uri 'none'`,
    "P6 | default-src 'self'; script-src 'self' https://cdn.palmier-or.example; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  ];
  return `${lines.join("\n")}\n`;
}

function buildReports() {
  const rng = mulberry32(0x77030031);
  const sourceFiles = [
    "/srv/reservation/views/results.ejs",
    "/srv/reservation/views/checkout.ejs",
    "/srv/reservation/views/profile.ejs",
    "/srv/reservation/views/help.ejs",
  ];
  const rows = [];
  const push = (count, values) => {
    for (let index = 0; index < count; index += 1) {
      const line = values(index);
      rows.push(JSON.stringify({ "csp-report": line }));
    }
  };
  push(96, (index) => ({
    "document-uri": `https://reservation.palmier-or.example/${index % 2 === 0 ? "recherche" : "paiement"}`,
    "violated-directive": "script-src-elem",
    "effective-directive": "script-src-elem",
    "blocked-uri": "https://cdn-legacy.palmier-or.example",
    "source-file": `/static/js/${index % 3 === 0 ? "legacy-search.js" : index % 3 === 1 ? "legacy-cart.js" : "legacy-profile.js"}`,
    "line-number": 40 + (index % 28),
  }));
  push(41, (index) => ({
    "document-uri": "https://reservation.palmier-or.example/profile",
    "violated-directive": "style-src-attr",
    "effective-directive": "style-src-attr",
    "blocked-uri": "inline",
    "source-file": sourceFiles[index % sourceFiles.length],
    "line-number": 10 + index,
  }));
  push(33, (index) => ({
    "document-uri": "https://reservation.palmier-or.example/widgets",
    "violated-directive": "connect-src",
    "effective-directive": "connect-src",
    "blocked-uri": "https://api-chat.partenaires.example",
    "source-file": "/static/js/widget-loader.js",
    "line-number": 80 + (index % 7),
  }));
  push(28, (index) => ({
    "document-uri": "https://reservation.palmier-or.example/offres",
    "violated-directive": "img-src",
    "effective-directive": "img-src",
    "blocked-uri": "https://img-cdn-partenaire.example",
    "source-file": "/static/js/marketing.js",
    "line-number": 15 + (index % 9),
  }));
  push(26, (index) => ({
    "document-uri": "https://reservation.palmier-or.example/admin",
    "violated-directive": "frame-ancestors",
    "effective-directive": "frame-ancestors",
    "blocked-uri": "https://portail-admin.partenaires.example",
    "source-file": "/srv/reservation/views/admin.ejs",
    "line-number": 5 + index,
  }));
  push(24, (index) => ({
    "document-uri": "https://reservation.palmier-or.example/recherche",
    "violated-directive": "script-src",
    "effective-directive": "script-src",
    "blocked-uri": "inline",
    "source-file": sourceFiles[index % sourceFiles.length],
    "line-number": 120 + index,
  }));
  while (rows.length < 262) {
    const page = ["accueil", "recherche", "profil", "paiement"][Math.floor(rng() * 4)];
    const directive = ["style-src", "font-src", "connect-src"][Math.floor(rng() * 3)];
    rows.push(JSON.stringify({
      "csp-report": {
        "document-uri": `https://reservation.palmier-or.example/${page}`,
        "violated-directive": directive,
        "effective-directive": directive,
        "blocked-uri": directive === "font-src" ? "https://fonts-cache.example" : directive === "connect-src" ? "https://api-cache.example" : "https://styles-cache.example",
        "source-file": `/static/js/${page}.js`,
        "line-number": 20 + Math.floor(rng() * 60),
      },
    }));
  }
  return `${rows.join("\n")}\n`;
}

function buildHeaders() {
  const rows = [
    { page: "/", csp: "P4", hsts: "max-age=31536000; includeSubDomains", x_content_type_options: "nosniff", referrer_policy: "strict-origin-when-cross-origin", x_frame_options: "SAMEORIGIN", permissions_policy: "geolocation=(), camera=()" },
    { page: "/recherche", csp: "P4", hsts: "max-age=31536000; includeSubDomains", x_content_type_options: "nosniff", referrer_policy: "strict-origin-when-cross-origin", x_frame_options: "SAMEORIGIN", permissions_policy: "geolocation=(), camera=()" },
    { page: "/reservation", csp: "P2", hsts: "max-age=31536000; includeSubDomains", x_content_type_options: "nosniff", referrer_policy: "strict-origin", x_frame_options: "DENY", permissions_policy: "geolocation=()" },
    { page: "/paiement", csp: "P4", hsts: "max-age=31536000; includeSubDomains", x_content_type_options: "nosniff", referrer_policy: "strict-origin-when-cross-origin", x_frame_options: "DENY", permissions_policy: "payment=()" },
    { page: "/profil", csp: "P5", hsts: "max-age=31536000; includeSubDomains", x_content_type_options: "", referrer_policy: "strict-origin-when-cross-origin", x_frame_options: "SAMEORIGIN", permissions_policy: "camera=()" },
    { page: "/aide", csp: "", hsts: "", x_content_type_options: "nosniff", referrer_policy: "no-referrer", x_frame_options: "", permissions_policy: "" },
    { page: "/admin/dashboard", csp: "P2", hsts: "max-age=31536000; includeSubDomains", x_content_type_options: "nosniff", referrer_policy: "strict-origin", x_frame_options: "DENY", permissions_policy: "geolocation=(), microphone=()" },
    { page: "/admin/import", csp: "", hsts: "", x_content_type_options: "", referrer_policy: "", x_frame_options: "", permissions_policy: "" },
    { page: "/api/search", csp: "P6", hsts: "max-age=31536000; includeSubDomains", x_content_type_options: "", referrer_policy: "strict-origin-when-cross-origin", x_frame_options: "", permissions_policy: "" },
    { page: "/widgets/chat", csp: "P3", hsts: "", x_content_type_options: "nosniff", referrer_policy: "", x_frame_options: "SAMEORIGIN", permissions_policy: "microphone=()" },
  ];
  const quote = (value) => `"${value}"`;
  const textValue = `page;csp;hsts;x_content_type_options;referrer_policy;x_frame_options;permissions_policy\n${rows.map((row) => [
    row.page,
    row.csp,
    quote(row.hsts),
    row.x_content_type_options,
    row.referrer_policy,
    row.x_frame_options,
    quote(row.permissions_policy),
  ].join(";")).join("\n")}\n`;
  return { rows, text: textValue };
}

function buildGuide() {
  const lines = [
    "# Guide du TP 3 : XSS, CSP et en-têtes de protection",
    "",
    "> Cadre et limites",
    ">",
    "> Tu analyses uniquement des fichiers fournis ; ne teste jamais un site réel sans autorisation écrite.",
    "> Les exemples ci-dessous utilisent des valeurs inventées qui ne sont pas celles du labo.",
    "",
    "## Bien distinguer les contextes de sortie",
    "",
    "- Corps HTML : préfère un échappement automatique du moteur de gabarits.",
    "- Attribut HTML : garde des guillemets autour de la valeur et échappe le contenu.",
    "- Bloc script : ne concatène pas une donnée utilisateur dans du JavaScript brut.",
    "- URL : valide le schéma attendu avant d’insérer une valeur.",
    "",
    "## Lire une politique CSP",
    "",
    "- `default-src` sert de repli si une directive spécialisée comme `script-src` manque.",
    "- Un `nonce-...` ou une empreinte `sha256-...` autorisent seulement un script en ligne précis.",
    "- `object-src 'none'` et `base-uri 'none'` ferment deux surfaces utiles en défense en profondeur.",
    "- Une mise en service prudente commence par `Content-Security-Policy-Report-Only` puis passe en blocage une fois la vérification terminée.",
    "",
    "## Grille simple pour les en-têtes du TP",
    "",
    "- CSP non vide : 2 points.",
    "- HSTS avec `max-age` de 31536000 au minimum et `includeSubDomains` : 2 points.",
    "- `X-Content-Type-Options: nosniff` : 1 point.",
    "- `Referrer-Policy` prenant la valeur `strict-origin`, `strict-origin-when-cross-origin` ou `no-referrer` : 1 point.",
    "- `X-Frame-Options` prenant la valeur `DENY` ou `SAMEORIGIN` : 1 point.",
    "- `Permissions-Policy` non vide : 1 point.",
    "",
    "## Bash ou Git Bash",
    "",
    "```bash",
    "cat > demo-templates.txt <<'EOF'",
    "GX1 | corps HTML échappé | <h2><%= room.name %></h2>",
    "GX2 | attribut sans guillemets | <input value=<%- query.term %> data-kind=\"search\">",
    "EOF",
    "raw_demo=$(grep -c '<%-' demo-templates.txt)",
    "cat > demo-headers.csv <<'EOF'",
    "page;csp;hsts;x_content_type_options;referrer_policy;x_frame_options;permissions_policy",
    "/demo;PZ;max-age=31536000; includeSubDomains;nosniff;strict-origin;DENY;camera=()",
    "EOF",
    "rows_demo=$(awk 'END{print NR-1}' demo-headers.csv)",
    "printf 'Exemple de comptage de sorties brutes : %s ligne(s).\\nExemple de lecture du tableau des en-têtes : %s page(s).\\n' \"$raw_demo\" \"$rows_demo\"",
    "```",
    "",
    "## PowerShell 5.1",
    "",
    "Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, ajoute `-Encoding UTF8` dans `Get-Content` et `Import-Csv`.",
    "",
    "```powershell",
    "@'",
    "GX1 | corps HTML échappé | <h2><%= room.name %></h2>",
    "GX2 | attribut sans guillemets | <input value=<%- query.term %> data-kind=\"search\">",
    "'@ | Set-Content -Encoding UTF8 demo-templates.txt",
    "$rawDemo = @(Get-Content -Encoding UTF8 demo-templates.txt | Where-Object { $_ -match '<%-' }).Count",
    "@'",
    "page;csp;hsts;x_content_type_options;referrer_policy;x_frame_options;permissions_policy",
    "/demo;PZ;max-age=31536000; includeSubDomains;nosniff;strict-origin;DENY;camera=()",
    "'@ | Set-Content -Encoding UTF8 demo-headers.csv",
    "$rowsDemo = @(Import-Csv -Delimiter ';' -Path demo-headers.csv).Count",
    "\"Exemple de comptage de sorties brutes : $rawDemo ligne(s).\"",
    "\"Exemple de lecture du tableau des en-têtes : $rowsDemo page(s).\"",
    "```",
    "",
    "## Visionneuse du site",
    "",
    "Dans la visionneuse, commence par filtrer des mots génériques comme `unsafe-inline`, `nonce-`, `violated-directive`, `nosniff` ou `inline`, puis relis la ligne au complet avant de conclure.",
  ];
  return `${lines.join("\n")}\n`;
}

function headerScore(row) {
  let score = 0;
  if (row.csp) score += 2;
  if (/max-age=(\d+)/u.test(row.hsts) && Number(/max-age=(\d+)/u.exec(row.hsts)[1]) >= 31536000 && row.hsts.includes("includeSubDomains")) score += 2;
  if (row.x_content_type_options === "nosniff") score += 1;
  if (["strict-origin", "strict-origin-when-cross-origin", "no-referrer"].includes(row.referrer_policy)) score += 1;
  if (["DENY", "SAMEORIGIN"].includes(row.x_frame_options)) score += 1;
  if (row.permissions_policy) score += 1;
  return score;
}

function buildSwbAssetsTp3() {
  const inlineScript = "document.querySelector('#price-preview').textContent = window.demoPrice + ' F CFA';\n";
  const scriptHash = crypto.createHash("sha256").update(inlineScript, "utf8").digest("base64");
  // P5 cites the hash of an older version of the script (one space fewer): it never gives the answer of the hash question away.
  const olderHash = crypto.createHash("sha256").update(inlineScript.replace(" F CFA", " FCFA"), "utf8").digest("base64");
  if (olderHash === scriptHash) throw new Error("the decoy hash must differ from the hash of the script");
  const headers = buildHeaders();
  const files = [
    { name: "swb-tp3-gabarits.txt", data: text(buildTemplates()) },
    { name: "swb-tp3-politiques.txt", data: text(buildPolicies(olderHash)) },
    { name: "swb-tp3-rapports.jsonl", data: text(buildReports()) },
    { name: "swb-tp3-en-tetes.csv", data: text(headers.text) },
    { name: "swb-tp3-script-en-ligne.txt", data: text(inlineScript) },
    { name: "swb-tp3-guide.md", data: text(buildGuide()) },
  ];

  const scores = headers.rows.map((row) => [row.page, headerScore(row)]);
  scores.sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const weakest = [...scores].sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]))[0][0];

  return {
    files,
    facts: {
      swbTp3: {
        assetNames: {
          templatesFile: "swb-tp3-gabarits.txt",
          policiesFile: "swb-tp3-politiques.txt",
          reportsFile: "swb-tp3-rapports.jsonl",
          headersFile: "swb-tp3-en-tetes.csv",
          scriptFile: "swb-tp3-script-en-ligne.txt",
          guideFile: "swb-tp3-guide.md",
        },
        rawOutputCount: 6,
        unquotedAttributeTemplate: "G04",
        scriptBlockTemplate: "G05",
        unsafeInlinePolicy: "P3",
        noncePolicy: "P4",
        missingObjectAndBasePolicy: "P3",
        topViolatedDirective: "script-src-elem",
        topBlockedOrigin: "https://cdn-legacy.palmier-or.example",
        distinctInlineSourceFiles: 4,
        headerScoreTotal: scores.reduce((sum, [, score]) => sum + score, 0),
        weakestPage: weakest,
        pagesWithoutNosniff: 3,
        scriptHashBase64: scriptHash,
        adoptPolicyLetter: "c",
        deploySafelyLetter: "b",
      },
    },
  };
}

module.exports = { buildSwbAssetsTp3 };
