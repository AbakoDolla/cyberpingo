"use strict";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ASSET_NAMES = {
  normal: "pt-tp3-nmap-normal.txt",
  grep: "pt-tp3-nmap-grep.gnmap",
  xml: "pt-tp3-nmap-xml.xml",
  memo: "pt-tp3-services-attendus.txt",
  guide: "pt-tp3-guide.md",
};
const SCAN_START_UTC = "2026-06-08T08:14:37Z";
const SCAN_END_UTC = "2026-06-08T08:19:05Z";

const HOSTS = [
  {
    ip: "198.51.100.18",
    state: "down",
  },
  {
    ip: "198.51.100.5",
    hostname: "sahel-vert.example",
    logicalName: "site institutionnel",
    state: "up",
    latency: "0.012",
    closedCount: 9,
    ports: [
      { port: 80, state: "open", service: "http", grepService: "http", product: "nginx", version: "1.24.0", extrainfo: "", reason: "syn-ack" },
      { port: 443, state: "open", service: "ssl/http", grepService: "ssl|http", product: "nginx", version: "1.24.0", extrainfo: "", reason: "syn-ack" },
      { port: 22, state: "closed", service: "ssh", grepService: "ssh", product: "", version: "", extrainfo: "", reason: "reset" },
    ],
    hostScripts: [
      "http-title: Coopérative Sahel-Vert",
      "http-server-header: nginx/1.24.0",
      "ssl-cert: Subject: commonName=sahel-vert.example",
      "ssl-cert: Subject Alternative Name: DNS:sahel-vert.example",
      "ssl-cert: Not valid before: 2026-05-20T00:00:00",
      "ssl-cert: Not valid after:  2027-05-20T23:59:59",
    ],
  },
  {
    ip: "198.51.100.10",
    hostname: "www.sahel-vert.example",
    logicalName: "site web public",
    state: "up",
    latency: "0.018",
    closedCount: 8,
    ports: [
      { port: 22, state: "open", service: "ssh", grepService: "ssh", product: "OpenSSH", version: "9.7p1", extrainfo: "Ubuntu 24.04", reason: "syn-ack" },
      { port: 80, state: "open", service: "http", grepService: "http", product: "nginx", version: "1.24.0", extrainfo: "", reason: "syn-ack" },
      { port: 443, state: "open", service: "ssl/http", grepService: "ssl|http", product: "nginx", version: "1.24.0", extrainfo: "", reason: "syn-ack" },
      { port: 8080, state: "open", service: "http-proxy", grepService: "http-proxy", product: "Jetty", version: "12.0.9", extrainfo: "", reason: "syn-ack" },
    ],
    hostScripts: [
      "http-title: Vitrine Sahel-Vert",
      "http-server-header: nginx/1.24.0",
      "ssl-cert: Subject: commonName=www.sahel-vert.example",
      "ssl-cert: Subject Alternative Name: DNS:www.sahel-vert.example",
      "ssl-cert: Not valid before: 2026-05-18T00:00:00",
      "ssl-cert: Not valid after:  2027-05-18T23:59:59",
    ],
  },
  {
    ip: "198.51.100.22",
    hostname: "vpn.sahel-vert.example",
    logicalName: "passerelle VPN",
    state: "up",
    latency: "0.024",
    closedCount: 8,
    ports: [
      { port: 443, state: "open", service: "ssl/http", grepService: "ssl|http", product: "OpenResty", version: "1.25.3.1", extrainfo: "", reason: "syn-ack" },
      { port: 8443, state: "open", service: "ssl/http", grepService: "ssl|http", product: "Jetty", version: "10.0.20", extrainfo: "", reason: "syn-ack" },
      { port: 22, state: "filtered", service: "ssh", grepService: "ssh", product: "", version: "", extrainfo: "", reason: "no-response" },
    ],
    hostScripts: [
      "http-title: Portail VPN Sahel-Vert",
      "http-server-header: openresty/1.25.3.1",
      "banner: Ancienne page d’accueil Ubuntu conservée pendant une maintenance",
      "ssl-cert: Subject: commonName=vpn.sahel-vert.example",
      "ssl-cert: Subject Alternative Name: DNS:vpn.sahel-vert.example",
      "ssl-cert: Not valid before: 2026-05-25T00:00:00",
    ],
  },
  {
    ip: "198.51.100.30",
    hostname: "mail.sahel-vert.example",
    logicalName: "messagerie",
    state: "up",
    latency: "0.021",
    closedCount: 7,
    ports: [
      { port: 25, state: "open", service: "smtp", grepService: "smtp", product: "Postfix smtpd", version: "3.8.6", extrainfo: "", reason: "syn-ack" },
      { port: 110, state: "closed", service: "pop3", grepService: "pop3", product: "", version: "", extrainfo: "", reason: "reset" },
      { port: 143, state: "open", service: "imap", grepService: "imap", product: "Dovecot imapd", version: "2.3.21", extrainfo: "", reason: "syn-ack" },
      { port: 587, state: "filtered", service: "submission", grepService: "submission", product: "", version: "", extrainfo: "", reason: "no-response" },
      { port: 993, state: "open", service: "ssl/imap", grepService: "ssl|imap", product: "Dovecot imapd", version: "2.3.21", extrainfo: "", reason: "syn-ack" },
    ],
    hostScripts: [
      "smtp-commands: sahel-vert.example, PIPELINING, SIZE 52428800, VRFY, ETRN, STARTTLS",
      "ssl-cert: Subject: commonName=mail.sahel-vert.example",
      "ssl-cert: Subject Alternative Name: DNS:mail.sahel-vert.example",
      "imap-capabilities: IMAP4rev1 SASL-IR AUTH=PLAIN IDLE MOVE",
      "banner: Hôte de messagerie Coopérative Sahel-Vert",
      "tls-nextproto: mail only",
    ],
  },
  {
    ip: "198.51.100.44",
    hostname: "portail.sahel-vert.example",
    logicalName: "portail adhérents",
    state: "up",
    latency: "0.017",
    closedCount: 8,
    ports: [
      { port: 443, state: "open", service: "ssl/http", grepService: "ssl|http", product: "nginx", version: "1.24.0", extrainfo: "", reason: "syn-ack" },
      { port: 22, state: "closed", service: "ssh", grepService: "ssh", product: "", version: "", extrainfo: "", reason: "reset" },
      { port: 8443, state: "filtered", service: "ssl/http", grepService: "ssl|http", product: "", version: "", extrainfo: "", reason: "no-response" },
    ],
    hostScripts: [
      "http-title: Espace adhérents",
      "http-server-header: nginx/1.24.0",
      "ssl-cert: Subject: commonName=portail.sahel-vert.example",
      "ssl-cert: Subject Alternative Name: DNS:portail.sahel-vert.example",
      "ssl-cert: Not valid before: 2026-05-22T00:00:00",
      "ssl-cert: Not valid after:  2027-05-22T23:59:59",
    ],
  },
  {
    ip: "203.0.113.60",
    hostname: "paie.sahel-vert.example",
    logicalName: "application paie",
    state: "up",
    latency: "0.026",
    closedCount: 7,
    ports: [
      { port: 443, state: "open", service: "ssl/http", grepService: "ssl|http", product: "Apache httpd", version: "2.4.58", extrainfo: "", reason: "syn-ack" },
      { port: 22, state: "filtered", service: "ssh", grepService: "ssh", product: "", version: "", extrainfo: "", reason: "no-response" },
      { port: 3389, state: "filtered", service: "ms-wbt-server", grepService: "ms-wbt-server", product: "", version: "", extrainfo: "", reason: "no-response" },
      { port: 8443, state: "closed", service: "ssl/http", grepService: "ssl|http", product: "", version: "", extrainfo: "", reason: "reset" },
    ],
    hostScripts: [
      "http-title: Portail paie",
      "http-server-header: Apache/2.4.58 (Unix)",
      "ssl-cert: Subject: commonName=paie.sahel-vert.example",
      "ssl-cert: Subject Alternative Name: DNS:paie.sahel-vert.example",
      "ssl-cert: Not valid before: 2026-05-21T00:00:00",
      "ssl-cert: Not valid after:  2027-05-21T23:59:59",
      "banner: Aucun bureau distant public attendu",
    ],
  },
  {
    ip: "203.0.113.75",
    hostname: "stock.sahel-vert.example",
    logicalName: "gestion de stock",
    state: "up",
    latency: "0.030",
    closedCount: 8,
    ports: [
      { port: 80, state: "open", service: "http", grepService: "http", product: "nginx", version: "1.22.1", extrainfo: "", reason: "syn-ack" },
      { port: 5432, state: "open", service: "postgresql", grepService: "postgresql", product: "PostgreSQL DB", version: "15.6", extrainfo: "", reason: "syn-ack" },
      { port: 22, state: "filtered", service: "ssh", grepService: "ssh", product: "", version: "", extrainfo: "", reason: "no-response" },
    ],
    hostScripts: [
      "clock-skew: 0s",
      "http-title: Gestion de stock",
      "http-server-header: nginx/1.22.1",
      "pgsql-info: PostgreSQL 15.6",
      "pgsql-info: Base visible depuis l’adresse publique de l’hôte",
      "banner: Accès public limité au frontal web attendu",
      "ssl-cert: absent",
    ],
  },
  {
    ip: "203.0.113.77",
    state: "down",
  },
  {
    ip: "198.51.100.250",
    state: "down",
  },
];

const MEMO_ROWS = [
  ["sahel-vert.example", "80/http, 443/https", "aucun", "Accueil public institutionnel."],
  ["www.sahel-vert.example", "22/ssh, 80/http, 443/https, 8080/http-alt", "aucun", "Site vitrine avec console technique assumée pendant la migration de juin."],
  ["vpn.sahel-vert.example", "443/https", "aucun", "Une seule interface publique doit rester visible ; tout autre port repéré doit être traité comme inattendu."],
  ["mail.sahel-vert.example", "25/smtp, 143/imap, 993/imap-tls-implicite", "aucun", "La relève POP3 historique n’est plus publiée."],
  ["portail.sahel-vert.example", "443/https", "aucun", "Portail adhérents exposé uniquement en HTTPS."],
  ["paie.sahel-vert.example", "443/https", "22/ssh, 3389/rdp", "Administration interne uniquement ; aucun accès distant public hors HTTPS."],
  ["stock.sahel-vert.example", "80/http", "5432/postgresql", "Le frontal web est public ; la base PostgreSQL doit rester strictement interne."],
];

const text = (value) => Buffer.from(value.replace(/\r?\n/g, "\n"), "utf8");

function monthName(date) {
  return MONTHS[date.getUTCMonth()];
}

function weekdayName(date) {
  return WEEKDAYS[date.getUTCDay()];
}

function normalDate(dateText) {
  const date = new Date(dateText);
  return `${monthName(date)} ${String(date.getUTCDate()).padStart(2, " ")} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} ${date.getUTCFullYear()}`;
}

function xmlDate(dateText) {
  const date = new Date(dateText);
  return `${weekdayName(date)} ${monthName(date)} ${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} ${date.getUTCFullYear()}`;
}

function startBannerDate(dateText) {
  return dateText.replace("T", " ").replace("Z", " UTC");
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function versionText(port) {
  return [port.product, port.version, port.extrainfo].filter(Boolean).join(" ").trim();
}

function renderNormalPort(port) {
  const left = `${port.port}/tcp`.padEnd(9);
  const state = port.state.padEnd(9);
  const service = port.service.padEnd(12);
  return `${left}${state}${service}${versionText(port)}`.trimEnd();
}

function renderGrepPort(port) {
  return `${port.port}/${port.state}/tcp//${port.grepService}//${versionText(port)}/`;
}

function xmlServiceDetails(port) {
  if (port.grepService.startsWith("ssl|")) {
    return { name: port.grepService.slice(4), tunnel: "ssl" };
  }
  return { name: port.grepService, tunnel: "" };
}

function buildNormal() {
  const lines = [
    `Starting Nmap 7.94 ( https://nmap.org ) at ${startBannerDate(SCAN_START_UTC)}`,
    "",
  ];
  for (const host of HOSTS) {
    if (host.state === "down") {
      lines.push(`Nmap scan report for ${host.ip}`);
      lines.push("Host is down.");
      lines.push("");
      continue;
    }
    lines.push(`Nmap scan report for ${host.hostname} (${host.ip})`);
    lines.push(`Host is up (${host.latency}s latency).`);
    lines.push("PORT     STATE     SERVICE      VERSION");
    for (const port of host.ports) lines.push(renderNormalPort(port));
    lines.push(`Service Info: Host: ${host.hostname}; OS: Linux; CPE: cpe:/o:linux:linux_kernel`);
    lines.push("Host script results:");
    for (const line of host.hostScripts) lines.push(`| ${line}`);
    lines.push("");
  }
  lines.push("Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .");
  lines.push(`Nmap done: 10 IP addresses (7 hosts up) scanned in 268.40 seconds`);
  return lines.join("\n");
}

function buildGrep() {
  const lines = [
    `# Nmap 7.94 scan initiated ${normalDate(SCAN_START_UTC)} as: nmap -Pn -sS -sV -p 22,25,80,110,143,443,587,993,3389,5432,8080,8443 -oG ${ASSET_NAMES.grep} 198.51.100.0/24 203.0.113.0/24`,
    "# Host order matters for the analysts who only have this grepable view.",
    "# Status and Ports lines describe the same host.",
    "# Down hosts stay listed to preserve read order.",
    "# Service names follow the grepable output conventions.",
    "# Version fragments are abbreviated in this view.",
    "# Reviewers compare this file with the memo and the XML.",
  ];
  for (const host of HOSTS) {
    const hostName = host.hostname || "";
    lines.push(`Host: ${host.ip} (${hostName})\tStatus: ${host.state === "up" ? "Up" : "Down"}`);
    if (host.state === "up") {
      lines.push(`Host: ${host.ip} (${hostName})\tPorts: ${host.ports.map(renderGrepPort).join(", ")}\tIgnored State: closed (${host.closedCount})`);
    }
  }
  lines.push("# Nmap done: 10 IP addresses (7 hosts up) scanned in 268.40 seconds");
  return lines.join("\n");
}

function xmlPort(port) {
  const service = xmlServiceDetails(port);
  const versionBits = [
    `name="${xmlEscape(service.name)}"`,
    service.tunnel ? `tunnel="${service.tunnel}"` : "",
    port.product ? `product="${xmlEscape(port.product)}"` : "",
    port.version ? `version="${xmlEscape(port.version)}"` : "",
    port.extrainfo ? `extrainfo="${xmlEscape(port.extrainfo)}"` : "",
    'method="probed"',
    'conf="10"',
  ].filter(Boolean).join(" ");
  return [
    `    <port protocol="tcp" portid="${port.port}">`,
    `      <state state="${port.state}" reason="${port.reason}" reason_ttl="0"/>`,
    `      <service ${versionBits}/>`,
    "    </port>",
  ];
}

function buildXml() {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE nmaprun SYSTEM "https://svn.nmap.org/nmap/docs/nmap.dtd">',
    `<nmaprun scanner="nmap" args="nmap -Pn -sS -sV -p 22,25,80,110,143,443,587,993,3389,5432,8080,8443 -oX ${ASSET_NAMES.xml} 198.51.100.0/24 203.0.113.0/24" start="1780906477" startstr="${xmlDate(SCAN_START_UTC)}" version="7.94" xmloutputversion="1.05">`,
    '  <scaninfo type="syn" protocol="tcp" numservices="12" services="22,25,80,110,143,443,587,993,3389,5432,8080,8443"/>',
    '  <verbose level="0"/>',
    '  <debugging level="0"/>',
  ];
  for (const host of HOSTS) {
    lines.push("  <host>");
    lines.push(`    <status state="${host.state}" reason="${host.state === "up" ? "syn-ack" : "no-response"}" reason_ttl="0"/>`);
    lines.push(`    <address addr="${host.ip}" addrtype="ipv4"/>`);
    if (host.hostname) {
      lines.push("    <hostnames>");
      lines.push(`      <hostname name="${host.hostname}" type="user"/>`);
      lines.push("    </hostnames>");
    }
    if (host.state === "up") {
      lines.push("    <ports>");
      for (const port of host.ports) lines.push(...xmlPort(port));
      lines.push("    </ports>");
      lines.push("    <hostscript>");
      host.hostScripts.forEach((script, index) => {
        lines.push(`      <script id="note-${index + 1}" output="${xmlEscape(script)}"/>`);
      });
      lines.push("    </hostscript>");
      lines.push(`    <times srtt="${Math.round(Number(host.latency) * 1000000)}" rttvar="1200" to="100000"/>`);
    }
    lines.push("  </host>");
  }
  lines.push('  <runstats>');
  lines.push(`    <finished time="1780906745" timestr="${xmlDate(SCAN_END_UTC)}" elapsed="268.40" summary="Nmap done at ${startBannerDate(SCAN_END_UTC)}; 10 IP addresses (7 hosts up) scanned in 268.40 seconds" exit="success"/>`);
  lines.push('    <hosts up="7" down="3" total="10"/>');
  lines.push("  </runstats>");
  lines.push("</nmaprun>");
  return lines.join("\n");
}

function buildMemo() {
  return [
    "Mémo interne : services attendus sur les hôtes publics Sahel-Vert",
    "Source : cabinet Harmattan, préparation de la revue du 8 juin 2026.",
    "Usage : comparer les résultats d’un scan déjà réalisé avec la surface publiée attendue.",
    "Rappel : ce document décrit la politique voulue, pas ce que montre le scan.",
    "",
    "Format des lignes de référence :",
    "hote | publics=liste | internes=liste | note=justification",
    "",
    "Catalogue des hôtes :",
    ...MEMO_ROWS.map((row) => `${row[0]} | publics=${row[1]} | internes=${row[2]} | note=${row[3]}`),
    "",
    "Règles de lecture pour ce TP :",
    "- Un port « public attendu » peut apparaître open sans alerte supplémentaire.",
    "- Un port listé dans « internes » ne doit pas apparaître open sur une adresse publique.",
    "- Si un port n’est ni dans « publics » ni dans « internes », traite-le comme inattendu et vérifie la note avant de conclure.",
    "- Les hôtes marqués down dans le scan ne comptent pas comme actifs.",
    "- Une ligne du scan compte une fois par couple hôte:port.",
    "",
    "Repères utiles pour les questions :",
    "- Ports web à regrouper ensemble dans ce dossier : 80, 443, 8443.",
    "- Ports d’administration ou de données à regrouper ensemble dans ce dossier : 22, 3306, 5432.",
    "- Le port 993 correspond à l’IMAP avec chiffrement implicite.",
    "- Un port silencieux derrière un filtrage n’est ni open ni closed.",
    "",
    "Notes d’exploitation :",
    "- La ligne vpn rappelle qu’une interface de secours sur 8443 doit rester non publiée.",
    "- La ligne mail confirme que 25, 143 et 993 sont attendus ensemble.",
    "- La ligne stock sépare le frontal HTTP public de la base PostgreSQL interne.",
    "- La ligne paie interdit toute administration distante publique hors HTTPS.",
    "- La ligne www tolère un port 8080 lié à la migration en cours.",
    "- Le site institutionnel simple n’expose pas de service d’administration.",
    "- Une absence dans « publics » ne suffit pas seule : relis aussi la note de la ligne concernée.",
    "- Les exports Nmap ne prouvent qu’une surface observée à l’instant du scan du 8 juin 2026.",
    "- Les mentions « interne uniquement » priment sur les habitudes supposées du lecteur.",
    "- Le fichier greppable conserve l’ordre des hôtes et sépare ses champs par tabulations.",
    "- Le XML porte explicitement l’état, le service, le produit et les versions détectées.",
    "- Une bannière parlant d’Ubuntu peut venir d’un script ou d’une page d’accueil, pas du service ciblé.",
    "- Un port fermé n’est pas actif, même s’il répond négativement à la sonde.",
    "",
    "Fin du mémo.",
  ].join("\n");
}

function buildGuide() {
  return [
    "# TP 3 : lire des résultats Nmap sans deviner",
    "",
    "> Cadre et limites : tu analyses uniquement des fichiers fournis ; ne lance jamais un scan sur un système réel sans autorisation écrite.",
    "> Les exemples ci-dessous utilisent des données inventées, hors juin 2026, et ne reprennent aucun hôte du labo.",
    "",
    "## 1. Ce que signifient les états",
    "",
    "- `open` : un service répond sur le port.",
    "- `closed` : l’hôte répond, mais aucun service n’écoute sur ce port.",
    "- `filtered` : le port reste silencieux ou bloqué ; Nmap ne peut pas confirmer le service.",
    "- Dans ce TP, un comptage de ports ne garde que l’état écrit dans la question.",
    "",
    "## 2. Repères utiles avant de comparer",
    "",
    "- `25` : SMTP.",
    "- `143` : IMAP.",
    "- `993` : IMAP avec chiffrement implicite.",
    "- `5432` : PostgreSQL.",
    "- `80` et `443` : surface web ; les ports de la plage 8000 à 8999 sont souvent des interfaces web alternatives.",
    "- Pour ce dossier, le mémo classe `22`, `3306` et `5432` dans « administration ou données ».",
    "",
    "## 3. Visionneuse du site",
    "",
    "Dans la visionneuse, cherche d’abord « Host: », puis « Ports: », puis le nom d’hôte voulu. Dans le fichier greppable, les champs `Host:`, `Status:` et `Ports:` sont séparés par des tabulations. Pour la version XML, cherche `state=\"filtered\"`, `tunnel=\"ssl\"` ou `portid=\"5432\"`. Pour l’heure de départ, cherche `Starting Nmap` dans la sortie normale ou `startstr=` dans le XML.",
    "",
    "## 4. Exemple Bash : comparer un mémo et une sortie greppable inventés",
    "",
    "```bash",
    "cat > guide-services.txt <<'EOF'",
    "demo-vpn.example | publics=443/https | internes=9443/https-alt | note=admin de secours",
    "demo-mail.example | publics=25/smtp, 143/imap, 993/imap-tls-implicite | internes=aucun | note=messagerie",
    "EOF",
    "cat > guide-scan.gnmap <<'EOF'",
    "Host: 192.0.2.10 (demo-vpn.example)  Status: Up",
    "Host: 192.0.2.10 (demo-vpn.example)  Ports: 443/open/tcp//ssl|http/ExampleProxy 1.0/, 9443/open/tcp//ssl|http/Jetty 9.4/",
    "EOF",
    "grep '^demo-vpn.example ' guide-services.txt | grep 'internes=' | sed 's/.*internes=//; s/ | note=.*//' | tr ',' '\\n' | sed 's/^ *//; s#/.*##' | while read -r p; do",
    "  grep 'demo-vpn.example' guide-scan.gnmap | grep '/open/' | grep -q \"${p}/open\" && echo \"demo-vpn.example:${p}\"",
    "done",
    "```",
    "",
    "## 5. Exemple PowerShell 5.1 : comparer le même cas inventé",
    "",
    "```powershell",
    "@(",
    "  'demo-vpn.example | publics=443/https | internes=9443/https-alt | note=admin de secours',",
    "  'demo-mail.example | publics=25/smtp, 143/imap, 993/imap-tls-implicite | internes=aucun | note=messagerie'",
    ") | Set-Content -Encoding UTF8 guide-services.txt",
    "@(",
    "  'Host: 192.0.2.10 (demo-vpn.example)  Status: Up',",
    "  'Host: 192.0.2.10 (demo-vpn.example)  Ports: 443/open/tcp//ssl|http/ExampleProxy 1.0/, 9443/open/tcp//ssl|http/Jetty 9.4/'",
    ") | Set-Content -Encoding UTF8 guide-scan.gnmap",
    "$line = Get-Content -Encoding UTF8 guide-services.txt | Select-String '^demo-vpn\\.example ' | Select-Object -First 1",
    "$internes = ($line.Line -split 'internes=')[1] -split ' \\| note=' | Select-Object -First 1",
    "$ports = $internes -split ',' | ForEach-Object { ($_ -split '/')[0].Trim() }",
    "$scan = Get-Content -Encoding UTF8 guide-scan.gnmap",
    "$ports | ForEach-Object { if ($scan -match (\"{0}/open\" -f $_)) { \"demo-vpn.example:{0}\" -f $_ } }",
    "```",
    "",
    "## 6. Exemple Bash : compter les ports filtered dans un XML inventé",
    "",
    "```bash",
    "cat > guide-scan.xml <<'EOF'",
    "<nmaprun startstr=\"Sat Oct 11 06:12:00 2025\"><host><status state=\"up\"/><address addr=\"192.0.2.44\" addrtype=\"ipv4\"/><ports><port protocol=\"tcp\" portid=\"22\"><state state=\"filtered\"/></port><port protocol=\"tcp\" portid=\"443\"><state state=\"open\"/></port><port protocol=\"tcp\" portid=\"9443\"><state state=\"filtered\"/></port><port protocol=\"tcp\" portid=\"3389\"><state state=\"filtered\"/></port></ports></host></nmaprun>",
    "EOF",
    "grep -o 'state=\"filtered\"' guide-scan.xml | wc -l",
    "```",
    "",
    "## 7. Exemple PowerShell 5.1 : compter les ports filtered dans le même XML inventé",
    "",
    "```powershell",
    "'<nmaprun startstr=\"Sat Oct 11 06:12:00 2025\"><host><status state=\"up\"/><address addr=\"192.0.2.44\" addrtype=\"ipv4\"/><ports><port protocol=\"tcp\" portid=\"22\"><state state=\"filtered\"/></port><port protocol=\"tcp\" portid=\"443\"><state state=\"open\"/></port><port protocol=\"tcp\" portid=\"9443\"><state state=\"filtered\"/></port><port protocol=\"tcp\" portid=\"3389\"><state state=\"filtered\"/></port></ports></host></nmaprun>' | Set-Content -Encoding UTF8 guide-scan.xml",
    "((Get-Content -Encoding UTF8 guide-scan.xml -Raw) | Select-String 'state=\"filtered\"' -AllMatches).Matches.Count",
    "```",
    "",
    "## 8. Exemple Bash : remettre l’heure de départ au format AAAA-MM-JJ HH:MM:SS",
    "",
    "```bash",
    "cat > guide-normal.txt <<'EOF'",
    "# Nmap 7.94 scan initiated Sat Oct 11 06:12:00 2025 as: nmap -sV demo.example",
    "EOF",
    "grep 'scan initiated' guide-normal.txt | sed 's/^# Nmap [0-9.]* scan initiated //' | sed 's/ as:.*$//'",
    "```",
    "",
    "## 9. Exemple PowerShell 5.1 : relever cette même heure",
    "",
    "```powershell",
    "'# Nmap 7.94 scan initiated Sat Oct 11 06:12:00 2025 as: nmap -sV demo.example' | Set-Content -Encoding UTF8 guide-normal.txt",
    "$line = Get-Content -Encoding UTF8 guide-normal.txt | Select-String 'scan initiated' | Select-Object -First 1",
    "($line.Line -replace '^# Nmap [0-9.]+ scan initiated ', '') -replace ' as:.*$', ''",
    "```",
    "",
    "## 10. Méthode à retenir",
    "",
    "Commence par identifier les hôtes actifs, puis lis les ports open, closed et filtered sans les mélanger. Croise ensuite le mémo et le scan pour distinguer « attendu », « inattendu » et « interne uniquement ». Quand plusieurs formats existent, le XML reste le plus robuste pour recompter proprement les états et les services grâce à ses balises explicites. La sortie greppable aide à recompter vite, mais seulement si tu respectes ses champs tabulés et ses sous-champs séparés par des slashs.",
  ].join("\n");
}

function buildFacts() {
  const upHosts = HOSTS.filter((host) => host.state === "up");
  const openPorts = upHosts.flatMap((host) => host.ports.filter((port) => port.state === "open").map((port) => ({ host, port })));
  const filteredPorts = upHosts.flatMap((host) => host.ports.filter((port) => port.state === "filtered").map((port) => ({ host, port })));
  const openCounts = upHosts.map((host) => ({
    hostname: host.hostname,
    count: host.ports.filter((port) => port.state === "open").length,
  })).sort((left, right) => right.count - left.count || left.hostname.localeCompare(right.hostname));
  const mixedGroupCount = upHosts.filter((host) => {
    const open = host.ports.filter((port) => port.state === "open").map((port) => port.port);
    const hasWeb = open.some((port) => [80, 443, 8443].includes(port));
    const hasAdminOrData = open.some((port) => [22, 3306, 5432].includes(port));
    return hasWeb && hasAdminOrData;
  }).length;
  return {
    ptTp3: {
      assetNames: ASSET_NAMES,
      upCount: upHosts.length,
      mostOpenHost: openCounts[0].hostname,
      totalOpenPorts: openPorts.length,
      mailImplicitTlsService: "ssl/imap",
      wwwWebVersion: "nginx 1.24.0",
      vpnUnexpectedPort: "8443",
      publicDatabaseHost: "stock.sahel-vert.example",
      filteredCount: filteredPorts.length,
      firstDownIp: HOSTS.find((host) => host.state === "down").ip,
      mail25Product: "postfix smtpd",
      forbiddenPublicPair: "stock.sahel-vert.example:5432",
      mixedWebAdminDataCount: mixedGroupCount,
      filteredStateLetter: "c",
      xmlBestFormatLetter: "b",
      scanStartUtc: "2026-06-08 08:14:37",
    },
  };
}

function buildPtAssetsTp3() {
  return {
    files: [
      { name: ASSET_NAMES.normal, data: text(buildNormal()) },
      { name: ASSET_NAMES.grep, data: text(buildGrep()) },
      { name: ASSET_NAMES.xml, data: text(buildXml()) },
      { name: ASSET_NAMES.memo, data: text(buildMemo()) },
      { name: ASSET_NAMES.guide, data: text(buildGuide()) },
    ],
    facts: buildFacts(),
  };
}

module.exports = { buildPtAssetsTp3 };
