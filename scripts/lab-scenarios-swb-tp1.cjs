const text = (value) => Buffer.from(value.replace(/\r?\n/g, "\n"), "utf8");

function minutesToSeconds(value) {
  return value * 60;
}

function daysBetween(startIsoDate, endIsoDate) {
  const start = Date.parse(`${startIsoDate}T00:00:00Z`);
  const end = Date.parse(`${endIsoDate}T00:00:00Z`);
  return Math.round((end - start) / 86400000);
}

function parseSanLine(line) {
  return line
    .replace(/^X509v3 Subject Alternative Name:\s*/u, "")
    .split(",")
    .map((item) => item.trim().replace(/^DNS:/, ""))
    .filter(Boolean);
}

function buildGuide() {
  return [
    "# Guide du TP 1 : lire HTTP, les cookies et un certificat sans se tromper",
    "",
    "> Cadre et limites",
    ">",
    "> Les exemples de ce guide utilisent des valeurs inventées, pas celles du labo.",
    "> Tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
    "> Ne colle jamais un jeton ou un mot de passe réel dans un navigateur, un terminal ou un outil en ligne.",
    "",
    "## Lire un échange HTTP",
    "",
    "- Une requête HTTP/1.1 contient une ligne de requête, des en-têtes puis un corps éventuel.",
    "- Une réponse HTTP/1.1 contient une ligne d’état, des en-têtes puis un corps éventuel.",
    "- Le champ « Location » sert à suivre une redirection. « Set-Cookie » annonce un cookie. « Server » et « X-Powered-By » peuvent divulguer une technologie ou une version.",
    "",
    "## Lire un cookie",
    "",
    "- « Secure » limite le cookie à HTTPS.",
    "- « HttpOnly » empêche sa lecture par JavaScript dans le navigateur.",
    "- « SameSite=None » exige aussi « Secure ».",
    "- « Max-Age » s’exprime en secondes. Pour des minutes, divise par 60. Pour des jours, divise par 86400.",
    "",
    "## Lire un certificat",
    "",
    "- Le champ SAN liste les noms d’hôtes couverts.",
    "- « notAfter » donne la date de fin de validité.",
    "- Pour compter des jours restants, compare deux dates en UTC puis retiens un nombre entier de jours.",
    "",
    "## Bash ou Git Bash",
    "",
    "```bash",
    "cat > demo-http.txt <<'EOF'",
    "HTTP/1.1 302 Found",
    "Location: https://boutique-exemple.example/accueil",
    "Set-Cookie: session_demo=abc123; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Lax",
    "Set-Cookie: theme_demo=sombre; Path=/; Max-Age=86400; SameSite=Lax",
    "EOF",
    "redir_demo=$(grep -c '^HTTP/1.1 3' demo-http.txt)",
    "cookie_demo=$(grep '^Set-Cookie:' demo-http.txt | cut -d: -f2- | cut -d= -f1 | tr -d ' ' | head -n 1)",
    "minutes_demo=$(grep '^Set-Cookie:' demo-http.txt | head -n 1 | sed -E 's/.*Max-Age=([0-9]+).*/\\1/' | awk '{print int($1/60)}')",
    "jours_demo=$(( ( $(date -u -d '2026-03-20T00:00:00Z' +%s) - $(date -u -d '2026-03-10T00:00:00Z' +%s) ) / 86400 ))",
    "printf 'Redirections demo : %s\\nPremier cookie demo : %s\\nDuree demo en minutes : %s\\nJours demo : %s\\n' \"$redir_demo\" \"$cookie_demo\" \"$minutes_demo\" \"$jours_demo\"",
    "```",
    "",
    "## PowerShell 5.1",
    "",
    "Les fichiers du labo sont en UTF-8 : avec Windows PowerShell 5.1, garde l’option -Encoding UTF8 de Get-Content quand tu lis un fichier.",
    "",
    "```powershell",
    "@'",
    "HTTP/1.1 302 Found",
    "Location: https://boutique-exemple.example/accueil",
    "Set-Cookie: session_demo=abc123; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Lax",
    "Set-Cookie: theme_demo=sombre; Path=/; Max-Age=86400; SameSite=Lax",
    "'@ | Set-Content -Encoding UTF8 demo-http.txt",
    "$demo = Get-Content -Encoding UTF8 demo-http.txt",
    "$redirDemo = @($demo | Where-Object { $_ -match '^HTTP/1\\.1 3' }).Count",
    "$firstCookie = (($demo | Where-Object { $_ -like 'Set-Cookie:*' })[0] -split ': ',2)[1] -split '=',2 | Select-Object -First 1",
    "$maxAge = [int](($demo | Where-Object { $_ -like 'Set-Cookie:*' })[0] -replace '.*Max-Age=([0-9]+).*','$1')",
    "$minutesDemo = [int]($maxAge / 60)",
    "$daysDemo = ([datetime]'2026-03-20T00:00:00Z' - [datetime]'2026-03-10T00:00:00Z').Days",
    "\"Redirections demo : $redirDemo\"",
    "\"Premier cookie demo : $firstCookie\"",
    "\"Duree demo en minutes : $minutesDemo\"",
    "\"Jours demo : $daysDemo\"",
    "```",
    "",
    "## Visionneuse du site",
    "",
    "Dans la visionneuse, cherche d’abord des mots génériques comme « Location », « Set-Cookie », « Strict-Transport-Security », « Content-Security-Policy » ou « DNS: ». Ensuite, relis la ligne complète et garde son contexte immédiat.",
  ].join("\n");
}

function buildSwbAssetsTp1() {
  const exchanges = [
    {
      id: "01",
      url: "http://reservation.palmier-or.example/",
      request: [
        "GET / HTTP/1.1",
        "Host: reservation.palmier-or.example",
        "User-Agent: curl/8.8.0",
        "Accept: */*",
      ],
      response: [
        "HTTP/1.1 301 Moved Permanently",
        "Location: https://reservation.palmier-or.example/",
        "Content-Length: 0",
        "Connection: close",
      ],
    },
    {
      id: "02",
      url: "https://reservation.palmier-or.example/",
      request: [
        "GET / HTTP/1.1",
        "Host: reservation.palmier-or.example",
        "User-Agent: curl/8.8.0",
        "Accept: text/html",
      ],
      response: [
        "HTTP/1.1 200 OK",
        "Content-Type: text/html; charset=utf-8",
        "Content-Length: 6421",
      ],
    },
    {
      id: "03",
      url: "https://reservation.palmier-or.example/connexion",
      request: [
        "POST /connexion HTTP/1.1",
        "Host: reservation.palmier-or.example",
        "User-Agent: curl/8.8.0",
        "Content-Type: application/x-www-form-urlencoded",
        "Content-Length: 46",
        "",
        "identifiant=msylla&motdepasse=secret-factice",
      ],
      response: [
        "HTTP/1.1 303 See Other",
        "Location: /espace-client/tableau-de-bord",
        "Set-Cookie: resa_session=sess_demo_a1b2c3; Path=/; Max-Age=5400; HttpOnly; Secure; SameSite=Lax",
        "Set-Cookie: csrf_token=csrf_demo_4588; Path=/; Max-Age=900; Secure; SameSite=Strict",
        "Content-Length: 0",
      ],
    },
    {
      id: "04",
      url: "https://reservation.palmier-or.example/espace-client/tableau-de-bord",
      request: [
        "GET /espace-client/tableau-de-bord HTTP/1.1",
        "Host: reservation.palmier-or.example",
        "User-Agent: curl/8.8.0",
        "Cookie: resa_session=sess_demo_a1b2c3; csrf_token=csrf_demo_4588",
      ],
      response: [
        "HTTP/1.1 200 OK",
        "Content-Type: text/html; charset=utf-8",
        "Content-Length: 9215",
      ],
    },
    {
      id: "05",
      url: "https://reservation.palmier-or.example/assets/app.css",
      request: [
        "GET /assets/app.css HTTP/1.1",
        "Host: reservation.palmier-or.example",
        "If-Modified-Since: Mon, 04 May 2026 08:20:00 GMT",
      ],
      response: [
        "HTTP/1.1 304 Not Modified",
        "Cache-Control: public, max-age=86400",
        "Content-Length: 0",
      ],
    },
    {
      id: "06",
      url: "http://reservation.palmier-or.example/sante",
      request: [
        "GET /sante HTTP/1.1",
        "Host: reservation.palmier-or.example",
        "User-Agent: curl/8.8.0",
      ],
      response: [
        "HTTP/1.1 301 Moved Permanently",
        "Location: https://reservation.palmier-or.example/sante",
        "Content-Length: 0",
      ],
    },
    {
      id: "07",
      url: "https://reservation.palmier-or.example/forbidden",
      request: [
        "GET /forbidden HTTP/1.1",
        "Host: reservation.palmier-or.example",
        "User-Agent: curl/8.8.0",
      ],
      response: [
        "HTTP/1.1 403 Forbidden",
        "Content-Type: text/plain; charset=utf-8",
        "Content-Length: 25",
      ],
    },
    {
      id: "08",
      url: "https://reservation.palmier-or.example/introuvable",
      request: [
        "GET /introuvable HTTP/1.1",
        "Host: reservation.palmier-or.example",
        "User-Agent: curl/8.8.0",
      ],
      response: [
        "HTTP/1.1 404 Not Found",
        "Content-Type: text/plain; charset=utf-8",
        "Content-Length: 19",
      ],
    },
    {
      id: "09",
      url: "https://reservation.palmier-or.example/api/ping",
      request: [
        "GET /api/ping HTTP/1.1",
        "Host: reservation.palmier-or.example",
        "User-Agent: curl/8.8.0",
      ],
      response: [
        "HTTP/1.1 500 Internal Server Error",
        "Content-Type: application/json; charset=utf-8",
        "Content-Length: 71",
      ],
    },
    {
      id: "10",
      url: "https://assets.palmier-or.example/widget.js",
      request: [
        "GET /widget.js HTTP/1.1",
        "Host: assets.palmier-or.example",
        "User-Agent: curl/8.8.0",
      ],
      response: [
        "HTTP/1.1 200 OK",
        "Content-Type: application/javascript; charset=utf-8",
        "Content-Length: 8420",
      ],
    },
    {
      id: "11",
      url: "http://reservation.palmier-or.example/images/logo.svg",
      request: [
        "GET /images/logo.svg HTTP/1.1",
        "Host: reservation.palmier-or.example",
        "User-Agent: curl/8.8.0",
      ],
      response: [
        "HTTP/1.1 200 OK",
        "Content-Type: image/svg+xml",
        "Content-Length: 1432",
      ],
    },
    {
      id: "12",
      url: "https://reservation.palmier-or.example/mentions-legales",
      request: [
        "GET /mentions-legales HTTP/1.1",
        "Host: reservation.palmier-or.example",
        "User-Agent: curl/8.8.0",
      ],
      response: [
        "HTTP/1.1 200 OK",
        "Content-Type: text/html; charset=utf-8",
        "Content-Length: 5112",
      ],
    },
  ];

  const cookieLines = [
    "Set-Cookie: resa_session=sess_demo_a1b2c3; Path=/; Max-Age=5400; HttpOnly; Secure; SameSite=Lax",
    "Set-Cookie: csrf_token=csrf_demo_4588; Path=/; Max-Age=900; Secure; SameSite=Strict",
    "Set-Cookie: theme_pref=ambre; Path=/; Max-Age=2592000; Secure; SameSite=Lax",
    "Set-Cookie: langue=fr; Path=/; Max-Age=604800; SameSite=Lax",
    "Set-Cookie: promo_guest=oui; Path=/; Max-Age=86400; SameSite=None",
    "Set-Cookie: analytics_id=ana_demo_4421; Path=/; Max-Age=604800; HttpOnly",
    "Set-Cookie: partner_pref=canal_mobile; Domain=.partenaires.example; Path=/; Max-Age=172800; Secure; SameSite=None",
    "Set-Cookie: edge_ab=variante_b; Path=/; Max-Age=1200; Secure; HttpOnly; SameSite=Strict",
    "Set-Cookie: support_seen=1; Path=/support; Max-Age=3600; Secure; HttpOnly; SameSite=Lax",
    "Set-Cookie: banner_closed=1; Path=/; Max-Age=43200; Secure; SameSite=Lax",
  ];

  const certificateBlocks = [
    [
      "=== Certificat principal : reservation.palmier-or.example ===",
      "Requested host: reservation.palmier-or.example",
      "Protocol  : TLSv1.3",
      "Cipher    : TLS_AES_256_GCM_SHA384",
      "subject=CN = reservation.palmier-or.example",
      "issuer=C = FR, O = Example Issuing CA, CN = Example RSA OV CA 2026",
      "notBefore=Apr 04 00:00:00 2026 GMT",
      "notAfter=Jul 03 00:00:00 2026 GMT",
      "X509v3 Subject Alternative Name: DNS:reservation.palmier-or.example, DNS:www.palmier-or.example, DNS:palmier-or.example",
    ].join("\n"),
    [
      "=== Certificat secondaire : api.reservation.palmier-or.example ===",
      "Requested host: api.reservation.palmier-or.example",
      "Protocol  : TLSv1.2",
      "Cipher    : ECDHE-RSA-AES256-GCM-SHA384",
      "subject=CN = api.reservation.palmier-or.example",
      "issuer=C = FR, O = Example Issuing CA, CN = Example RSA OV CA 2026",
      "notBefore=Apr 18 00:00:00 2026 GMT",
      "notAfter=Jul 17 00:00:00 2026 GMT",
      "X509v3 Subject Alternative Name: DNS:api.reservation.palmier-or.example, DNS:api-admin.palmier-or.example",
    ].join("\n"),
    [
      "=== Certificat secondaire : paiement.palmier-or.example ===",
      "Requested host: paiement.palmier-or.example",
      "Protocol  : TLSv1.3",
      "Cipher    : TLS_CHACHA20_POLY1305_SHA256",
      "subject=CN = paiement.palmier-or.example",
      "issuer=C = FR, O = Example Issuing CA, CN = Example RSA OV CA 2026",
      "notBefore=Apr 28 00:00:00 2026 GMT",
      "notAfter=Jul 27 00:00:00 2026 GMT",
      "X509v3 Subject Alternative Name: DNS:paiement.palmier-or.example, DNS:checkout.palmier-or.example",
    ].join("\n"),
  ];

  const headerPages = [
    { page: "/accueil", headers: ["Strict-Transport-Security: max-age=31536000; includeSubDomains", "Content-Security-Policy: default-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'", "X-Content-Type-Options: nosniff", "Referrer-Policy: strict-origin-when-cross-origin", "X-Frame-Options: SAMEORIGIN", "Server: nginx"] },
    { page: "/connexion", headers: ["Strict-Transport-Security: max-age=31536000; includeSubDomains", "Content-Security-Policy: default-src 'self'; form-action 'self'; frame-ancestors 'self'", "X-Content-Type-Options: nosniff", "Referrer-Policy: strict-origin-when-cross-origin", "Server: nginx"] },
    { page: "/espace-client/tableau-de-bord", headers: ["Strict-Transport-Security: max-age=31536000; includeSubDomains", "Content-Security-Policy: default-src 'self'; connect-src 'self' https://api.palmier-or.example; frame-ancestors 'self'", "Cache-Control: no-store", "X-Content-Type-Options: nosniff", "Server: nginx"] },
    { page: "/assets/app.css", headers: ["Cache-Control: public, max-age=86400", "Server: nginx"] },
    { page: "/images/logo.svg", headers: ["Cache-Control: public, max-age=86400", "Server: nginx"] },
    { page: "/api/ping", headers: ["Content-Security-Policy: default-src 'none'", "X-Content-Type-Options: nosniff", "Server: nginx"] },
    { page: "/maintenance", headers: ["Content-Security-Policy: default-src 'self'; frame-ancestors 'none'", "X-Content-Type-Options: nosniff", "Server: nginx/1.24.0"] },
    { page: "/support/aide", headers: ["Content-Security-Policy: default-src 'self'; frame-ancestors 'self'", "Permissions-Policy: geolocation=(), microphone=()", "Server: nginx"] },
    { page: "/recherche", headers: ["Referrer-Policy: strict-origin-when-cross-origin", "X-Content-Type-Options: nosniff", "X-Powered-By: Express 4.19.2", "Server: nginx"] },
    { page: "/partenaires/widget", headers: ["Content-Security-Policy: default-src 'self' https://cdn-exemple.example; frame-ancestors 'self'", "Server: nginx"] },
  ];

  const exchangesHttp = `${exchanges.map((entry) => [`===== Échange ${entry.id} =====`, `URL: ${entry.url}`, "", ...entry.request, "", ...entry.response, ""].join("\n")).join("\n")}\n`;
  const cookiesTxt = `${cookieLines.join("\n")}\n`;
  const certificatTxt = `${certificateBlocks.join("\n\n")}\n`;
  const headersTxt = `${headerPages.map((entry, index) => [`===== Page ${String(index + 1).padStart(2, "0")} =====`, `Page: ${entry.page}`, ...entry.headers, ""].join("\n")).join("\n")}\n`;
  const guideMd = `${buildGuide()}\n`;

  const redirectCount = exchanges.filter((entry) => /^HTTP\/1\.1 3/u.test(entry.response[0])).length;
  const loginLocation = exchanges.find((entry) => entry.request[0] === "POST /connexion HTTP/1.1").response.find((line) => line.startsWith("Location: ")).slice("Location: ".length);
  const clearRequests = exchanges.filter((entry) => entry.url.startsWith("http://")).length;
  const cookieWithoutHttpOnly = cookieLines.filter((line) => !line.includes("HttpOnly"))
    .map((line) => ({ name: line.slice("Set-Cookie: ".length).split("=", 1)[0], maxAge: Number(/Max-Age=(\d+)/u.exec(line)[1]) }))
    .sort((left, right) => right.maxAge - left.maxAge)[0].name;
  const insecureCookieCount = cookieLines.filter((line) => !line.includes("Secure")).length;
  const invalidSameSiteCookie = cookieLines.find((line) => line.includes("SameSite=None") && !line.includes("Secure")).slice("Set-Cookie: ".length).split("=", 1)[0];
  const sessionCookieLine = cookieLines.find((line) => line.startsWith("Set-Cookie: resa_session="));
  const sessionCookieMinutes = Number(/Max-Age=(\d+)/u.exec(sessionCookieLine)[1]) / 60;
  const certificateDaysLeft = daysBetween("2026-05-04", "2026-07-03");
  const principalSans = parseSanLine(certificateBlocks[0].split("\n").find((line) => line.startsWith("X509v3 Subject Alternative Name:")));
  const usedHosts = Array.from(new Set(exchanges.map((entry) => entry.request.find((line) => line.startsWith("Host: ")).slice("Host: ".length))));
  const hostnameMissingSan = usedHosts.find((host) => !principalSans.includes(host));
  const hstsLine = headerPages[0].headers.find((line) => line.startsWith("Strict-Transport-Security:"));
  const hstsDays = Number(/max-age=(\d+)/u.exec(hstsLine)[1]) / minutesToSeconds(24 * 60);
  const hstsIncludesSubdomains = hstsLine.includes("includeSubDomains");
  const pagesWithoutCspCount = headerPages.filter((entry) => !entry.headers.some((line) => line.startsWith("Content-Security-Policy:"))).length;
  const serverVersionPage = headerPages.find((entry) => entry.headers.some((line) => /^Server: .*\/\d/u.test(line))).page;

  return {
    files: [
      { name: "swb-tp1-echanges.http", data: text(exchangesHttp) },
      { name: "swb-tp1-cookies.txt", data: text(cookiesTxt) },
      { name: "swb-tp1-certificat.txt", data: text(certificatTxt) },
      { name: "swb-tp1-en-tetes.txt", data: text(headersTxt) },
      { name: "swb-tp1-guide.md", data: text(guideMd) },
    ],
    facts: {
      swbTp1: {
        assetNames: {
          exchangesFile: "swb-tp1-echanges.http",
          cookiesFile: "swb-tp1-cookies.txt",
          certificateFile: "swb-tp1-certificat.txt",
          headersFile: "swb-tp1-en-tetes.txt",
          guideFile: "swb-tp1-guide.md",
        },
        redirectCount,
        loginLocation,
        clearRequests,
        cookieWithoutHttpOnly,
        insecureCookieCount,
        invalidSameSiteCookie,
        sessionCookieMinutes,
        certificateDaysLeft,
        hostnameMissingSan,
        hstsDays,
        hstsIncludesSubdomains,
        pagesWithoutCspCount,
        serverVersionPage,
        frameHeaderLetter: "c",
        sessionStatementLetter: "b",
      },
    },
  };
}

module.exports = { buildSwbAssetsTp1 };
