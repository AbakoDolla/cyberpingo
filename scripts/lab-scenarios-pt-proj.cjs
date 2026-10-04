"use strict";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const text = (value) => Buffer.from(String(value).replace(/\r?\n/g, "\n"), "utf8");

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, values) {
  return values[Math.floor(rng() * values.length)];
}

function sourceLabel(source) {
  if (source === "capture_entete") return "capture entête";
  return source.replace(/_/g, " ");
}

function pad(number) {
  return String(number).padStart(2, "0");
}

function isoAt(day, hour, minute, second) {
  return `2026-06-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}Z`;
}

function xmlDate(dateText) {
  const date = new Date(dateText);
  return `${WEEKDAYS[date.getUTCDay()]} ${MONTHS[date.getUTCMonth()]} ${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} ${date.getUTCFullYear()}`;
}

function xmlServiceDetails(serviceName) {
  if (serviceName.startsWith("ssl|")) {
    return { name: serviceName.slice(4), tunnel: "ssl" };
  }
  return { name: serviceName, tunnel: "" };
}

function csv(headers, rows) {
  const quote = (value) => {
    const stringValue = String(value ?? "");
    return /[;"\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, "\"\"")}"` : stringValue;
  };
  return `${headers.join(";")}\n${rows.map((row) => headers.map((header) => quote(row[header])).join(";")).join("\n")}\n`;
}

const CVSS = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  UI: { N: 0.85, R: 0.62 },
  CIA: { H: 0.56, L: 0.22, N: 0 },
  PR: {
    U: { N: 0.85, L: 0.62, H: 0.27 },
    C: { N: 0.85, L: 0.68, H: 0.5 },
  },
};

const PRIORITY_FACTORS = {
  surface: { internet: 1.6, vpn: 1.3, interne: 1.0 },
  criticite: { critique: 1.7, elevee: 1.4, moyenne: 1.1 },
  preuve: { suffisante: 1.3, partielle: 1.1, insuffisante: 0.8 },
  kev: { oui: 1.3, non: 1.0 },
};

function epssFactor(value) {
  if (value >= 0.7) return 1.4;
  if (value >= 0.3) return 1.2;
  return 1.0;
}

function roundupCvss(value) {
  const scaled = Math.round(value * 100000);
  if (scaled % 10000 === 0) return scaled / 100000;
  return (Math.floor(scaled / 10000) + 1) / 10;
}

function cvssScore(vector) {
  const values = Object.fromEntries(vector.split("/").slice(1).map((part) => part.split(":")));
  const scope = values.S;
  const iss = 1 - (1 - CVSS.CIA[values.C]) * (1 - CVSS.CIA[values.I]) * (1 - CVSS.CIA[values.A]);
  const impact = scope === "U"
    ? 6.42 * iss
    : 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15;
  const exploitability = 8.22 * CVSS.AV[values.AV] * CVSS.AC[values.AC] * CVSS.PR[scope][values.PR] * CVSS.UI[values.UI];
  if (impact <= 0) return 0;
  const raw = scope === "U" ? Math.min(impact + exploitability, 10) : Math.min(1.08 * (impact + exploitability), 10);
  return roundupCvss(raw);
}

function priorityScore(finding) {
  const base = cvssScore(finding.vecteur_cvss);
  const factor = PRIORITY_FACTORS.surface[finding.surface]
    * PRIORITY_FACTORS.criticite[finding.criticite_metier]
    * PRIORITY_FACTORS.preuve[finding.preuve]
    * PRIORITY_FACTORS.kev[finding.kev]
    * epssFactor(Number(finding.epss_30j));
  return Number((base * factor).toFixed(1));
}

const ASSET_NAMES = {
  cadrage: "pt-proj-cadrage.md",
  osint: "pt-proj-osint.csv",
  nmap: "pt-proj-nmap.xml",
  vulns: "pt-proj-vulns.csv",
  web: "pt-proj-web-history.jsonl",
  mission: "pt-proj-journal-mission.log",
  grille: "pt-proj-grille-risque.md",
  report: "pt-proj-modele-rapport.md",
  guide: "pt-proj-guide.md",
};

const PROJECT_NMAP_PORTS = [22, 25, 80, 443, 465, 587, 993, 995, 1194, 3306, 6514, 8080, 8443];

function buildScopeDocument() {
  return [
    "# Synthèse de cadrage",
    "",
    "## Contexte de mission",
    "",
    "Client : Coopérative Sahel-Vert.",
    "Prestataire : Cabinet Harmattan.",
    "Période de mission : du 2 au 19 juin 2026.",
    "Cheffe de mission : Mariam Diallo.",
    "Testeur référent : Yao Kouassi.",
    "Contact client technique : Ibrahim Sanou.",
    "Contact client juridique : Rokia Bamba.",
    "Tous les horodatages du dossier sont en UTC.",
    "",
    "## Objectifs validés avant démarrage",
    "",
    "- confirmer le périmètre public utile à la mission ;",
    "- relever les écarts de surface d’exposition par rapport aux services attendus ;",
    "- qualifier les constats du scanner et des notes web ;",
    "- préparer un rapport factuel, sans extrapolation ni accusation.",
    "",
    "## Périmètre applicatif et technique",
    "",
    "| FQDN | Rôle | Type de vérification autorisé | Statut |",
    "|---|---|---|---|",
    "| www.sahel-vert.example | site vitrine | lecture OSINT, en-têtes, disponibilité | en périmètre informatif |",
    "| portail.sahel-vert.example | portail adhérents et exports métiers | tests web avec comptes de démonstration, revue de code, lecture des journaux | en périmètre applicatif |",
    "| vpn.sahel-vert.example | portail VPN du personnel | lecture des bannières et des journaux, sans tentative de connexion supplémentaire | en périmètre technique |",
    "| stock.sahel-vert.example | extranet logistique | lecture des en-têtes, cartographie réseau, revue des journaux de mission | en périmètre technique |",
    "| mail.sahel-vert.example | messagerie coopérative | relevé d’exposition des ports, sans collecte de boîtes | en périmètre technique |",
    "| paie.sahel-vert.example | application de paie d’un tiers | simple présence au DNS ; aucune interaction applicative | hors périmètre applicatif |",
    "",
    "## Services attendus selon le client",
    "",
    "| Hôte | Services attendus | Commentaire |",
    "|---|---|---|",
    "| www.sahel-vert.example | 80, 443 | vitrine publique simple |",
    "| portail.sahel-vert.example | 443 | accès web via HTTPS uniquement |",
    "| vpn.sahel-vert.example | 443, 1194 | portail et tunnel VPN |",
    "| mail.sahel-vert.example | 25, 465, 587, 993 | service de messagerie public |",
    "| stock.sahel-vert.example | 22, 443 | extranet logistique et maintenance distante contrôlée |",
    "| paie.sahel-vert.example | 443 | application tiers, exclue des validations actives |",
    "| api.sahel-vert.example | 443 | API publique de consolidation pour le portail |",
    "| srv-relai.sahel-vert.example | 22 | relais technique interne supervisé |",
    "| srv-journal.sahel-vert.example | 22, 6514 | nœud interne de collecte de journaux |",
    "",
    "## Fenêtres autorisées",
    "",
    "- reconnaissance passive : 2 au 19 juin 2026, 08:00 à 18:00 UTC ;",
    "- scans modérés et validations web : 09:00 à 17:00 UTC ;",
    "- toute activité hors fenêtre doit être journalisée comme écart, même si elle reste bénigne ;",
    "- aucune action n’est menée les dimanches sans accord écrit supplémentaire.",
    "",
    "## Règles d’engagement",
    "",
    "| Identifiant | Action | Clause |",
    "|---|---|---|",
    "| R01 | Consolider des sources OSINT publiques | autorisé |",
    "| R02 | Lancer un scan TCP modéré sur les FQDN publics listés | autorisé pendant la fenêtre prévue |",
    "| R03 | Vérifier un contrôle d’accès avec des comptes de démonstration et une preuve minimale | autorisé si la donnée affichée reste anonymisée |",
    "| R04 | Télécharger un extrait de preuve déjà exposé dans le portail pour le joindre au rapport | autorisé si le volume reste minimal |",
    "| R05 | Saturer un service, forcer des authentifications ou déposer un fichier exécutable | jamais |",
    "| R06 | Copier des données de paie ou d’un tiers hors des captures minimales convenues | jamais |",
    "",
    "## Exclusions explicites",
    "",
    "- aucune simulation de déni de service ;",
    "- aucune modification métier volontaire ;",
    "- aucune réutilisation d’un compte réel hors des comptes de démonstration fournis ;",
    "- aucune validation sur des actifs découverts en dehors des FQDN listés ;",
    "- aucune exportation de données de paie en dehors d’une preuve anonymisée.",
    "",
    "## Gestion des preuves",
    "",
    "- conserver la preuve minimale ;",
    "- noter pour chaque preuve le fichier source, l’heure UTC et le lien avec le constat ;",
    "- distinguer constat, faux positif et hypothèse ;",
    "- journaliser tout nettoyage à prévoir avant clôture.",
    "",
    "## Comptes de démonstration et données",
    "",
    "- les validations applicatives autorisées utilisent uniquement des comptes de démonstration ;",
    "- toute preuve téléchargée doit rester minimale et anonymisée ;",
    "- aucun export de paie réelle n’est autorisé ;",
    "- les captures destinées au rapport sont chiffrées pendant la mission ;",
    "- les comptes de démonstration du stock et du portail doivent être désactivés avant clôture ;",
    "",
    "## Conditions d’arrêt immédiat",
    "",
    "- arrêt si une action menace la disponibilité d’un service ;",
    "- arrêt si une donnée non prévue apparaît hors anonymisation convenue ;",
    "- arrêt si un actif non listé semble exposé et nécessite une autorisation supplémentaire ;",
    "- arrêt si le client demande un gel de production exceptionnel.",
    "",
    "## Livrables attendus",
    "",
    "1. une synthèse des constats confirmés ;",
    "2. une priorisation défendable à partir de la grille de risque ;",
    "3. un résumé exécutif factuel ;",
    "4. un modèle de rapport complété sans inventer de preuve.",
    "",
    "## Communication et escalade",
    "",
    "- les écarts au cadrage doivent être signalés le jour même à Ibrahim Sanou ;",
    "- tout doute sur une preuve sensible remonte aussi à Rokia Bamba avant intégration au rapport ;",
    "- Mariam Diallo valide la formulation finale des constats confirmés ;",
    "- Yao Kouassi garde une piste de vérification reproductible pour chaque pièce citée.",
    "",
    "## Lecture des pièces du dossier",
    "",
    "- le scan réseau XML consolide un relevé ciblé sur les ports les plus utiles à la mission ;",
    "- le tableau de constats mélange faux positif, constat confirmé et hypothèse ;",
    "- l’historique web contient du bruit de navigation légitime autour de quelques preuves utiles ;",
    "- le journal de mission sert aussi à vérifier l’horaire des écarts et l’état du nettoyage.",
    "",
    "## Rappels de langage",
    "",
    "- un constat est un fait démontré par une preuve suffisante ;",
    "- une hypothèse reste à confirmer par une deuxième preuve indépendante ;",
    "- un faux positif est un signal infirmé par les pièces du dossier.",
    "",
    "## Clôture attendue",
    "",
    "La mission se termine par une restitution factuelle, la liste des nettoyages restants et la préparation d’un re-test. Toute ambiguïté doit être signalée comme telle dans le rapport.",
    "",
  ].join("\n");
}

function buildOsintRows() {
  const rows = [];
  let index = 1;
  const push = (row) => rows.push({ ligne: `O${pad(index++)}`, ...row });

  const primary = [
    { fqdn: "www.sahel-vert.example", source: "dns_zone", dns_statut: "actif", technologie: "nginx", observation: "A public vu dans la zone publique." },
    { fqdn: "www.sahel-vert.example", source: "archive_page", dns_statut: "actif", technologie: "nginx", observation: "Bannière Server reprise dans une page archivée." },
    { fqdn: "www.sahel-vert.example", source: "capture_entete", dns_statut: "actif", technologie: "nginx", observation: "En-tête Server observé sur la page d’accueil." },
    { fqdn: "www.sahel-vert.example", source: "robots_txt", dns_statut: "actif", technologie: "nginx", observation: "Fichier robots encore servi par le frontal public." },
    { fqdn: "www.sahel-vert.example", source: "guide_api", dns_statut: "actif", technologie: "nginx", observation: "Exemple d’URL publique documenté dans une note interne." },
    { fqdn: "www.sahel-vert.example", source: "ct_log", dns_statut: "actif", technologie: "nginx", observation: "Certificat public du frontal web." },
    { fqdn: "portail.sahel-vert.example", source: "dns_zone", dns_statut: "actif", technologie: "laravel", observation: "Portail listé dans la zone publique." },
    { fqdn: "portail.sahel-vert.example", source: "ct_log", dns_statut: "actif", technologie: "laravel", observation: "Certificat public réémis pour le portail." },
    { fqdn: "portail.sahel-vert.example", source: "archive_page", dns_statut: "actif", technologie: "vuejs", observation: "Archive d’un tableau de bord rendu côté client." },
    { fqdn: "portail.sahel-vert.example", source: "capture_entete", dns_statut: "actif", technologie: "vuejs", observation: "Chargement du bundle principal côté navigateur." },
    { fqdn: "portail.sahel-vert.example", source: "guide_api", dns_statut: "actif", technologie: "laravel", observation: "Documentation de l’API partenaire." },
    { fqdn: "vpn.sahel-vert.example", source: "dns_zone", dns_statut: "actif", technologie: "openvpn", observation: "Nom VPN listé dans la zone publique." },
    { fqdn: "vpn.sahel-vert.example", source: "ct_log", dns_statut: "actif", technologie: "openvpn", observation: "Certificat dédié au portail VPN." },
    { fqdn: "mail.sahel-vert.example", source: "dns_zone", dns_statut: "actif", technologie: "postfix", observation: "MX public principal." },
    { fqdn: "mail.sahel-vert.example", source: "ct_log", dns_statut: "actif", technologie: "dovecot", observation: "Certificat de messagerie avec SAN IMAPS." },
    { fqdn: "stock.sahel-vert.example", source: "dns_zone", dns_statut: "actif", technologie: "nginx", observation: "Entrée publique pour l’extranet logistique." },
    { fqdn: "stock.sahel-vert.example", source: "capture_entete", dns_statut: "actif", technologie: "nginx", observation: "En-tête Server observé sur l’extranet." },
    { fqdn: "stock.sahel-vert.example", source: "annonce_recrutement", dns_statut: "actif", technologie: "nextcloud", observation: "Référence à un extranet documenté dans une fiche de poste." },
    { fqdn: "extranet.sahel-vert.example", source: "ct_log", dns_statut: "absent", technologie: "apache", observation: "Ancien certificat encore visible dans les journaux CT." },
    { fqdn: "extranet.sahel-vert.example", source: "archive_page", dns_statut: "absent", technologie: "apache", observation: "Page historique archivée en 2025." },
    { fqdn: "extranet.sahel-vert.example", source: "ticket_support", dns_statut: "absent", technologie: "apache", observation: "Nom cité dans un ticket de migration fermé." },
    { fqdn: "docs.sahel-vert.example", source: "archive_page", dns_statut: "absent", technologie: "mkdocs", observation: "Documentation retirée de la production." },
    { fqdn: "mobile.sahel-vert.example", source: "annonce_recrutement", dns_statut: "absent", technologie: "flutter", observation: "Ancienne piste mobile non active." },
  ];
  primary.forEach(push);

  const rng = mulberry32(6022026);
  const fqdnPool = [
    "www.sahel-vert.example",
    "portail.sahel-vert.example",
    "mail.sahel-vert.example",
    "vpn.sahel-vert.example",
    "stock.sahel-vert.example",
    "api.sahel-vert.example",
    "docs.sahel-vert.example",
    "mobile.sahel-vert.example",
  ];
  const sourcePool = ["dns_zone", "ct_log", "archive_page", "capture_entete", "guide_api", "annonce_recrutement", "ticket_support"];
  const technoPool = ["nginx", "laravel", "vuejs", "postfix", "dovecot", "nextcloud", "apache", "mkdocs"];

  while (rows.length < 72) {
    const fqdn = pick(rng, fqdnPool);
    const source = pick(rng, sourcePool);
    const technologie = pick(rng, technoPool);
    const actif = !fqdn.startsWith("docs.") && !fqdn.startsWith("mobile.") ? "actif" : "absent";
    push({
      fqdn,
      source,
      dns_statut: actif,
      technologie,
      observation: `Recoupement passif issu de ${sourceLabel(source)}.`,
    });
  }

  return rows;
}

function buildNmapHosts() {
  return [
    {
      ip: "203.0.113.10",
      hostname: "www.sahel-vert.example",
      state: "up",
      ports: [
        { id: 80, service: "http", product: "nginx", version: "1.24.0", state: "open" },
        { id: 443, service: "ssl|http", product: "nginx", version: "1.24.0", state: "open" },
        { id: 22, service: "ssh", product: "OpenSSH", version: "9.6", state: "closed" },
        { id: 8080, service: "http-proxy", product: "squid", version: "6.7", state: "closed" },
      ],
    },
    {
      ip: "203.0.113.11",
      hostname: "portail.sahel-vert.example",
      state: "up",
      ports: [
        { id: 443, service: "ssl|http", product: "nginx", version: "1.24.0", state: "open" },
        { id: 80, service: "http", product: "nginx", version: "1.24.0", state: "closed" },
        { id: 22, service: "ssh", product: "OpenSSH", version: "9.6", state: "closed" },
        { id: 8443, service: "ssl|http", product: "nginx", version: "1.24.0", state: "closed" },
      ],
    },
    {
      ip: "203.0.113.12",
      hostname: "mail.sahel-vert.example",
      state: "up",
      ports: [
        { id: 25, service: "smtp", product: "Postfix", version: "3.8.2", state: "open" },
        { id: 465, service: "submissions", product: "Postfix", version: "3.8.2", state: "open" },
        { id: 587, service: "submission", product: "Postfix", version: "3.8.2", state: "open" },
        { id: 993, service: "imaps", product: "Dovecot", version: "2.3.21", state: "open" },
        { id: 995, service: "pop3s", product: "Dovecot", version: "2.3.21", state: "closed" },
      ],
    },
    {
      ip: "203.0.113.13",
      hostname: "vpn.sahel-vert.example",
      state: "up",
      ports: [
        { id: 443, service: "ssl|http", product: "nginx", version: "1.22.1", state: "open" },
        { id: 1194, service: "openvpn", product: "OpenVPN", version: "2.6.7", state: "open" },
        { id: 22, service: "ssh", product: "OpenSSH", version: "9.3", state: "closed" },
      ],
    },
    {
      ip: "203.0.113.14",
      hostname: "stock.sahel-vert.example",
      state: "up",
      ports: [
        { id: 22, service: "ssh", product: "OpenSSH", version: "9.2", state: "open" },
        { id: 443, service: "ssl|http", product: "nginx", version: "1.24.0", state: "open" },
        { id: 8080, service: "http-proxy", product: "Jetty", version: "10.0.18", state: "open" },
        { id: 8443, service: "ssl|http", product: "Jetty", version: "10.0.18", state: "closed" },
      ],
    },
    {
      ip: "203.0.113.15",
      hostname: "paie.sahel-vert.example",
      state: "down",
      ports: [
        { id: 443, service: "ssl|http", product: "nginx", version: "1.24.0", state: "closed" },
      ],
    },
    {
      ip: "203.0.113.16",
      hostname: "api.sahel-vert.example",
      state: "up",
      ports: [
        { id: 443, service: "ssl|http", product: "nginx", version: "1.24.0", state: "open" },
        { id: 8443, service: "ssl|http", product: "gunicorn", version: "21.2", state: "closed" },
      ],
    },
    {
      ip: "203.0.113.17",
      hostname: "stats.sahel-vert.example",
      state: "down",
      ports: [
        { id: 443, service: "ssl|http", product: "nginx", version: "1.22.1", state: "closed" },
      ],
    },
    {
      ip: "172.31.20.14",
      hostname: "srv-relai.sahel-vert.example",
      state: "up",
      ports: [
        { id: 22, service: "ssh", product: "OpenSSH", version: "9.2", state: "open" },
        { id: 3306, service: "mysql", product: "MariaDB", version: "10.11", state: "closed" },
      ],
    },
    {
      ip: "10.50.4.23",
      hostname: "srv-journal.sahel-vert.example",
      state: "up",
      ports: [
        { id: 22, service: "ssh", product: "OpenSSH", version: "9.2", state: "open" },
        { id: 6514, service: "syslog-tls", product: "rsyslog", version: "8.2302", state: "open" },
      ],
    },
  ];
}

function buildNmapXml(hosts) {
  const lines = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    '<!DOCTYPE nmaprun SYSTEM "https://svn.nmap.org/nmap/docs/nmap.dtd">',
    "<nmaprun scanner=\"nmap\" args=\"nmap -Pn -sS -sV -p 22,25,80,443,465,587,993,995,1194,3306,6514,8080,8443 -oX pt-proj-nmap.xml 203.0.113.10-17 172.31.20.14 10.50.4.23\" start=\"1780362000\" startstr=\"Wed Jun 11 08:20:00 2026\" version=\"7.991\" xmloutputversion=\"1.05\">",
    `  <scaninfo type="syn" protocol="tcp" numservices="${PROJECT_NMAP_PORTS.length}" services="${PROJECT_NMAP_PORTS.join(",")}"/>`,
    '  <verbose level="0"/>',
    '  <debugging level="0"/>',
  ];
  hosts.forEach((host, index) => {
    const openWebPort = host.ports.find((port) => port.state === "open" && [80, 443, 8080].includes(port.id));
    lines.push("  <host>");
    lines.push(`    <status state="${host.state}" reason="${host.state === "up" ? "syn-ack" : "no-response"}" reason_ttl="0"/>`);
    lines.push(`    <address addr="${host.ip}" addrtype="ipv4"/>`);
    lines.push("    <hostnames>");
    lines.push(`      <hostname name="${host.hostname}" type="user"/>`);
    lines.push("    </hostnames>");
    if (host.state === "up") {
    lines.push("    <ports>");
    for (const port of host.ports) {
      const service = xmlServiceDetails(port.service);
      const tunnel = service.tunnel ? ` tunnel="${service.tunnel}"` : "";
      lines.push(`      <port protocol="tcp" portid="${port.id}">`);
      lines.push(`        <state state="${port.state}" reason="${port.state === "open" ? "syn-ack" : "reset"}" reason_ttl="0"/>`);
      lines.push(`        <service name="${service.name}"${tunnel} product="${port.product}" version="${port.version}" method="probed" conf="10"/>`);
      if (port.state === "open" && openWebPort && port.id === openWebPort.id) {
        lines.push(`        <script id="http-title" output="Service ${host.hostname} confirmé par lecture de bannière inoffensive"/>`);
      }
      lines.push("      </port>");
    }
    lines.push("    </ports>");
    if (openWebPort || host.hostname.startsWith("mail.") || host.hostname.startsWith("vpn.")) {
      lines.push("    <hostscript>");
      if (openWebPort) lines.push(`      <script id="http-server-header" output="Produit web observé sur ${host.hostname}"/>`);
      if (host.hostname.startsWith("mail.")) lines.push('      <script id="smtp-commands" output="PIPELINING SIZE STARTTLS AUTH confirmés côté messagerie"/>');
      if (host.hostname.startsWith("vpn.")) lines.push('      <script id="ssl-cert" output="Certificat public cohérent avec le FQDN du portail VPN"/>');
      lines.push("    </hostscript>");
    }
    lines.push(`    <times srtt="${14500 + index * 700}" rttvar="${2200 + index * 110}" to="${100000 + index * 1000}"/>`);
    }
    lines.push("  </host>");
  });
  const upCount = hosts.filter((host) => host.state === "up").length;
  lines.push("  <runstats>");
  lines.push(`    <finished time="1780362900" timestr="${xmlDate("2026-06-11T08:35:00Z")}" elapsed="900.11" summary="Nmap done at 2026-06-11 08:35:00 UTC; ${hosts.length} IP addresses (${upCount} hosts up) scanned in 900.11 seconds" exit="success"/>`);
  lines.push(`    <hosts up="${upCount}" down="${hosts.length - upCount}" total="${hosts.length}"/>`);
  lines.push("  </runstats>");
  lines.push("</nmaprun>");
  return lines.join("\n");
}

function buildFindings() {
  const findings = [
    { id: "F01", famille: "scanner", actif: "www.sahel-vert.example", surface: "internet", criticite_metier: "moyenne", preuve: "partielle", epss_30j: "0.18", kev: "non", validation_humaine: "hypothese", vecteur_cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N", intitule: "Indexation d’un répertoire de médias historiques", commentaire: "Signal vu dans une archive, pas confirmé dans le frontal actuel." },
    { id: "F02", famille: "scanner", actif: "mail.sahel-vert.example", surface: "internet", criticite_metier: "moyenne", preuve: "partielle", epss_30j: "0.21", kev: "non", validation_humaine: "hypothese", vecteur_cvss: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N", intitule: "Bannière IMAPS trop bavarde", commentaire: "Version de service lisible, impact limité." },
    { id: "F03", famille: "scanner", actif: "portail.sahel-vert.example", surface: "internet", criticite_metier: "critique", preuve: "suffisante", epss_30j: "0.05", kev: "non", validation_humaine: "faux_positif", vecteur_cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L", intitule: "Absence supposée de HSTS", commentaire: "Les en-têtes exportés montrent HSTS présent sur la page visée." },
    { id: "F04", famille: "scanner", actif: "vpn.sahel-vert.example", surface: "vpn", criticite_metier: "elevee", preuve: "suffisante", epss_30j: "0.44", kev: "non", validation_humaine: "constat", vecteur_cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:H/A:N", intitule: "Verrouillage de compte absent sur le portail VPN", commentaire: "Trois tentatives invalides successives n’entraînent aucun délai ni verrouillage." },
    { id: "F05", famille: "scanner", actif: "srv-relai.sahel-vert.example", surface: "interne", criticite_metier: "moyenne", preuve: "insuffisante", epss_30j: "0.11", kev: "non", validation_humaine: "hypothese", vecteur_cvss: "CVSS:3.1/AV:A/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:L", intitule: "SMB signing annoncé comme désactivé sur un relais interne", commentaire: "Aucune deuxième preuve dans le dossier." },
    { id: "F06", famille: "scanner", actif: "stock.sahel-vert.example", surface: "internet", criticite_metier: "elevee", preuve: "suffisante", epss_30j: "0.32", kev: "non", validation_humaine: "constat", vecteur_cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:L/A:N", intitule: "Prévisualisation de document côté stock permettant une SSRF", commentaire: "Le service de prévisualisation accepte une URL externe et peut atteindre une ressource interne." },
    { id: "F07", famille: "scanner", actif: "www.sahel-vert.example", surface: "internet", criticite_metier: "moyenne", preuve: "partielle", epss_30j: "0.27", kev: "non", validation_humaine: "hypothese", vecteur_cvss: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N", intitule: "Ancienne route d’administration signalée dans un sitemap", commentaire: "Aucune réponse exploitable dans les exports récents." },
    { id: "F08", famille: "scanner", actif: "portail.sahel-vert.example", surface: "internet", criticite_metier: "critique", preuve: "partielle", epss_30j: "0.58", kev: "non", validation_humaine: "hypothese", vecteur_cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:L/A:N", intitule: "Jeton de session soupçonné réutilisable", commentaire: "Signal issu d’un extrait unique, sans deuxième preuve côté journal." },
    { id: "F09", famille: "scanner", actif: "portail.sahel-vert.example", surface: "internet", criticite_metier: "critique", preuve: "suffisante", epss_30j: "0.82", kev: "oui", validation_humaine: "constat", vecteur_cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N", intitule: "Export d’objet métier accessible hors du compte autorisé", commentaire: "Le portail renvoie un bon de commande d’un autre compte avec une preuve minimale." },
    { id: "F10", famille: "scanner", actif: "stock.sahel-vert.example", surface: "internet", criticite_metier: "elevee", preuve: "suffisante", epss_30j: "0.24", kev: "non", validation_humaine: "constat", vecteur_cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L", intitule: "Console Jetty exposée sur un port inattendu", commentaire: "Le port 8080 de l’extranet stock répond alors qu’il n’est pas attendu dans le cadrage." },
    { id: "F11", famille: "scanner", actif: "vpn.sahel-vert.example", surface: "vpn", criticite_metier: "elevee", preuve: "insuffisante", epss_30j: "0.16", kev: "non", validation_humaine: "hypothese", vecteur_cvss: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N", intitule: "Bannière d’ancienne version de portail VPN", commentaire: "Aucune confirmation indépendante." },
    { id: "F12", famille: "scanner", actif: "mail.sahel-vert.example", surface: "internet", criticite_metier: "moyenne", preuve: "partielle", epss_30j: "0.22", kev: "non", validation_humaine: "hypothese", vecteur_cvss: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:L", intitule: "Fallback TLS hérité sur IMAPS", commentaire: "Le risque existe mais l’exposition métier reste modérée." },
  ];
  for (let number = 13; number <= 29; number += 1) {
    findings.push({
      id: `F${pad(number)}`,
      famille: "scanner",
      actif: number % 2 === 0 ? "www.sahel-vert.example" : "mail.sahel-vert.example",
      surface: number % 3 === 0 ? "interne" : "internet",
      criticite_metier: number % 4 === 0 ? "moyenne" : "elevee",
      preuve: number % 5 === 0 ? "insuffisante" : "partielle",
      epss_30j: (0.03 + (number % 7) * 0.04).toFixed(2),
      kev: "non",
      validation_humaine: number % 5 === 0 ? "hypothese" : "constat",
      vecteur_cvss: number % 2 === 0
        ? "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N"
        : "CVSS:3.1/AV:A/AC:H/PR:L/UI:R/S:U/C:L/I:N/A:N",
      intitule: `Signal secondaire ${number}`,
      commentaire: "Constat secondaire conservé dans le dossier pour le tri, sans priorité dominante.",
    });
  }
  return findings;
}

function buildVulnCsv(findings) {
  return csv(
    ["id", "famille", "actif", "surface", "criticite_metier", "preuve", "epss_30j", "kev", "validation_humaine", "vecteur_cvss", "intitule", "commentaire"],
    findings
  );
}

function buildWebHistory() {
  const entries = [];
  const rng = mulberry32(6192026);
  const sessions = ["sess-demo-0001", "sess-demo-0002", "sess-demo-0003", "sess-demo-0004"];
  const users = ["compte-demo-a", "compte-demo-b", "compte-demo-c", "compte-demo-d"];
  const paths = ["/accueil", "/api/bon-commandes", "/api/profil", "/exports/recu", "/api/notifications"];

  for (let index = 0; index < 146; index += 1) {
    const minute = Math.floor(index / 6);
    const second = (index * 11) % 60;
    entries.push({
      kind: "request",
      ts: isoAt(9, 9 + Math.floor(minute / 60), minute % 60, second),
      session: sessions[index % sessions.length],
      user: users[index % users.length],
      method: index % 5 === 0 ? "POST" : "GET",
      path: pick(rng, paths),
      status: index % 11 === 0 ? 302 : 200,
      bytes: 900 + Math.floor(rng() * 400),
      note_id: "",
      theme: "",
      verdict: "",
      observation: "navigation_legitime",
    });
  }

  entries.push(
    { kind: "note", ts: isoAt(9, 12, 14, 8), session: "", user: "Yao Kouassi", method: "", path: "", status: "", bytes: "", note_id: "W01", theme: "authentification", verdict: "hypothese", observation: "Motif de connexion inhabituel sans deuxième preuve." },
    { kind: "note", ts: isoAt(9, 12, 20, 11), session: "", user: "Yao Kouassi", method: "", path: "", status: "", bytes: "", note_id: "W02", theme: "configuration", verdict: "a_reformuler", observation: "Titre trop affirmatif pour un en-tête observé une seule fois." },
    { kind: "note", ts: isoAt(9, 12, 26, 4), session: "", user: "Yao Kouassi", method: "", path: "", status: "", bytes: "", note_id: "W03", theme: "televersement", verdict: "constat", observation: "Preuve de dépôt non exécutable confirmée." },
    { kind: "note", ts: isoAt(9, 12, 31, 45), session: "", user: "Yao Kouassi", method: "", path: "", status: "", bytes: "", note_id: "W04", theme: "controle_acces", verdict: "constat", observation: "Objet étranger obtenu avec un compte de démonstration et une preuve minimale." },
    { kind: "request", ts: isoAt(9, 12, 31, 52), session: "sess-demo-0002", user: "compte-demo-b", method: "GET", path: "/api/bon-commande/BC-1043?vue=detail", status: 200, bytes: 1638, note_id: "W04", theme: "controle_acces", verdict: "", observation: "objet_etranger_recu" },
    { kind: "request", ts: isoAt(9, 12, 31, 59), session: "sess-demo-0002", user: "compte-demo-b", method: "GET", path: "/api/bon-commande/BC-1043/export.pdf", status: 200, bytes: 8421, note_id: "W04", theme: "controle_acces", verdict: "", observation: "export_etranger_confirme" },
    { kind: "note", ts: isoAt(9, 12, 44, 13), session: "", user: "Yao Kouassi", method: "", path: "", status: "", bytes: "", note_id: "W05", theme: "journalisation", verdict: "hypothese", observation: "Signal isolé sans impact direct établi." },
    { kind: "note", ts: isoAt(9, 13, 2, 24), session: "", user: "Yao Kouassi", method: "", path: "", status: "", bytes: "", note_id: "W06", theme: "resume", verdict: "a_reformuler", observation: "Le brouillon parle de compromission générale alors que la preuve est plus limitée." }
  );

  return entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n";
}

function buildMissionJournal() {
  const lines = [];
  const rng = mulberry32(6142026);
  const normalEvents = ["briefing", "osint", "scan", "validation_web", "relecture", "capture", "note"];
  const actors = ["Mariam Diallo", "Yao Kouassi"];
  for (let index = 0; index < 158; index += 1) {
    const minute = (index * 7) % 60;
    const second = (index * 13) % 60;
    const hour = 8 + Math.floor(index / 18);
    lines.push(`${isoAt(10 + Math.floor(index / 70), hour % 24, minute, second)} level=INFO event=${pick(rng, normalEvents)} actor="${pick(rng, actors)}" item=J${pad(index + 1)} statut=normal note="activité de mission conforme au cadrage"`);
  }
  lines.push(
    `${isoAt(11, 17, 42, 16)} level=WARN event=roe_ecart actor="Yao Kouassi" item=E01 qualification=ecart type=hors_fenetre note="lecture d’un export cinq minutes après la fenêtre sans requête supplémentaire"`,
    `${isoAt(13, 16, 8, 3)} level=WARN event=roe_ecart actor="Yao Kouassi" item=E02 qualification=ecart type=piece_jointe_non_utile note="capture supprimée ensuite car hors besoin de preuve"`,
    `${isoAt(15, 9, 14, 28)} level=WARN event=roe_ecart actor="Mariam Diallo" item=E03 qualification=ecart type=suivi_tardif note="validation notée avant le contact client puis régularisée"`,
    `${isoAt(18, 14, 6, 21)} level=INFO event=nettoyage actor="Yao Kouassi" item=N01 statut=ferme artefact="capture-headers-w04.json" note="capture temporaire supprimée du poste de mission"`,
    `${isoAt(18, 14, 18, 4)} level=INFO event=nettoyage actor="Yao Kouassi" item=N02 statut=ferme artefact="tableau-comparatif-osint.csv" note="fichier de travail archivé dans le dossier client"`,
    `${isoAt(18, 14, 34, 12)} level=INFO event=nettoyage actor="Mariam Diallo" item=N03 statut=ferme artefact="capture-export-bc1043.pdf" note="copie de preuve anonymisée et version locale supprimée"`,
    `${isoAt(19, 8, 51, 40)} level=WARN event=nettoyage actor="Mariam Diallo" item=N04 statut=ouvert artefact="compte-demo-stock-02" note="désactivation du compte de démonstration stock encore à confirmer côté client"`,
    `${isoAt(17, 11, 27, 9)} level=INFO event=qualification actor="Yao Kouassi" item=H02 source=journal note="un appel unique vers un sous-domaine interne a été vu depuis le composant stock" preuve=unique_capture corroboration=absente`
  );
  return `${lines.join("\n")}\n`;
}

function buildRiskGrid() {
  return [
    "# Grille de risque",
    "",
    "## Usage",
    "",
    "Cette grille sert à classer, noter et prioriser les constats du dossier. Les exemples ci-dessous utilisent des valeurs inventées qui ne correspondent à aucune réponse du laboratoire.",
    "",
    "## Statuts de preuve",
    "",
    "- `constat` : au moins deux preuves convergentes, ou une preuve directement démonstrative et relue.",
    "- `hypothese` : signal plausible mais preuve unique, partielle ou non corroborée.",
    "- `faux_positif` : signal infirmé par un export plus fiable du dossier.",
    "",
    "## OWASP Top 10 2025",
    "",
    "| Code | Intitulé | Quand l’utiliser dans ce parcours |",
    "|---|---|---|",
    "| a01 | Broken Access Control | Accès à un objet, une fonction ou une cible serveur sans droit, y compris une SSRF pilotée par le client. |",
    "| a02 | Security Misconfiguration | En-tête absent, service inattendu, protocole faible, console exposée. |",
    "| a03 | Software Supply Chain Failures | Composant tiers vulnérable ou non mis à jour. |",
    "| a04 | Cryptographic Failures | Secret, protocole ou protection cryptographique insuffisante. |",
    "| a05 | Injection | Donnée interprétée comme requête, code ou contenu actif. |",
    "| a06 | Insecure Design | Règle de sécurité absente dès la conception. |",
    "| a07 | Authentication Failures | Secret de session, mot de passe ou vérification d’identité insuffisants. |",
    "| a08 | Software or Data Integrity Failures | Donnée ou logiciel acceptés sans contrôle d’intégrité. |",
    "| a09 | Security Logging and Alerting Failures | Trace utile manquante ou alerte absente. |",
    "| a10 | Mishandling of Exceptional Conditions | Erreur ou condition exceptionnelle mal traitée. |",
    "",
    "Les intitulés sont repris tels quels depuis OWASP Top 10:2025. Dans ce parcours, une SSRF pilotée par l’utilisateur reste rattachée à `a01` quand elle contourne un contrôle d’accès serveur.",
    "",
    "## Formule CVSS 3.1",
    "",
    "- AV : N 0,85 ; A 0,62 ; L 0,55 ; P 0,20",
    "- AC : L 0,77 ; H 0,44",
    "- PR si S:U : N 0,85 ; L 0,62 ; H 0,27",
    "- PR si S:C : N 0,85 ; L 0,68 ; H 0,50",
    "- UI : N 0,85 ; R 0,62",
    "- C, I, A : H 0,56 ; L 0,22 ; N 0",
    "- ISS = 1 - (1 - C) × (1 - I) × (1 - A)",
    "- Impact si S:U = 6,42 × ISS",
    "- Impact si S:C = 7,52 × (ISS - 0,029) - 3,25 × (ISS - 0,02)^15",
    "- Exploitabilité = 8,22 × AV × AC × PR × UI",
    "- Si l’impact est nul, la note vaut 0,0",
    "- Sinon la note est l’arrondi supérieur au dixième de la formule officielle FIRST 3.1",
    "",
    "## Qualification CVSS 3.1",
    "",
    "| Note | Qualification |",
    "|---:|---|",
    "| 0,0 | None |",
    "| 0,1 à 3,9 | Low |",
    "| 4,0 à 6,9 | Medium |",
    "| 7,0 à 8,9 | High |",
    "| 9,0 à 10,0 | Critical |",
    "",
    "## Arrondi Roundup",
    "",
    "- multiplie d’abord l’entrée par 100000 ;",
    "- arrondis au plus proche entier avant tout autre calcul ;",
    "- si les quatre derniers chiffres valent 0000, garde la valeur telle quelle ;",
    "- sinon passe au dixième supérieur en restant en arithmétique entière jusqu’à la dernière division.",
    "",
    "## EPSS et KEV",
    "",
    "- EPSS estime la probabilité d’exploitation dans la nature sur les 30 prochains jours, sur une échelle de 0 à 1 ;",
    "- KEV recense les vulnérabilités déjà exploitées dans la nature et sert de signal fort de priorisation ;",
    "- ni EPSS ni KEV ne remplacent la preuve locale, le périmètre ou l’impact métier.",
    "",
    "## Facteurs de priorité",
    "",
    "| Dimension | Valeur | Facteur |",
    "|---|---|---:|",
    "| surface | internet | 1,6 |",
    "| surface | vpn | 1,3 |",
    "| surface | interne | 1,0 |",
    "| criticite_metier | critique | 1,7 |",
    "| criticite_metier | elevee | 1,4 |",
    "| criticite_metier | moyenne | 1,1 |",
    "| preuve | suffisante | 1,3 |",
    "| preuve | partielle | 1,1 |",
    "| preuve | insuffisante | 0,8 |",
    "| kev | oui | 1,3 |",
    "| kev | non | 1,0 |",
    "| epss_30j | inférieur à 0,30 | 1,0 |",
    "| epss_30j | de 0,30 à 0,69 | 1,2 |",
    "| epss_30j | supérieur ou égal à 0,70 | 1,4 |",
    "",
    "Priorité numérique = note CVSS × facteur surface × facteur criticité métier × facteur preuve × facteur KEV × facteur EPSS.",
    "",
    "La priorité est arrondie au dixième le plus proche. En cas d’égalité, on départage par la note CVSS la plus haute, puis par l’identifiant le plus petit.",
    "",
    "## Exemple inventé",
    "",
    "Vecteur d’exemple : `CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:N`. Avec la formule ci-dessus, ISS = 0,3916, impact = 2,514, exploitabilité = 1,1818, donc une note CVSS 3.1 de 3,7.",
    "Supposons que ce constat ait une surface `vpn`, une criticité `elevee`, une preuve `partielle`, `kev = non` et `epss_30j = 0,34`.",
    "La priorité devient 3,7 × 1,3 × 1,4 × 1,1 × 1,0 × 1,2 = 8,9 après arrondi au dixième.",
    "",
    "## Bon usage dans le rapport",
    "",
    "- le résumé exécutif reste factuel et ne transforme pas une hypothèse en compromission ;",
    "- une recommandation décrit une action vérifiable ;",
    "- un ordre d’actions suit la priorité numérique, puis la faisabilité immédiate ;",
    "- un écart au cadrage ou un nettoyage restant à traiter doit être nommé explicitement.",
    "- une hypothèse ne devient pas un constat sans deuxième preuve indépendante ou preuve directement démonstrative.",
    "",
  ].join("\n");
}

function buildReportTemplate() {
  const lines = [
    "# Modèle de rapport",
    "",
    "## Page de garde",
    "- Client :",
    "- Prestataire :",
    "- Période :",
    "- Version du rapport :",
    "",
    "## Résumé exécutif",
    "- Contexte :",
    "- Périmètre effectivement relu :",
    "- Ce qui est confirmé :",
    "- Ce qui reste une hypothèse :",
    "- Ce qui a été écarté comme faux positif :",
    "- Trois priorités immédiates :",
    "- Risque métier expliqué sans dramatisation :",
    "",
    "## Périmètre et limites",
    "- Périmètre validé :",
    "- Exclusions :",
    "- Règles d’engagement rappelées :",
    "- Actifs vus mais non testés :",
    "- Limites de preuve ou de temps :",
    "",
    "## Méthode",
    "- Sources OSINT relues :",
    "- Exports réseau relus :",
    "- Constats scanner triés :",
    "- Notes web relues :",
    "- Journal de mission contrôlé :",
    "- Référentiels utilisés (CVSS, OWASP, EPSS, KEV) :",
    "",
    "## Tableau de synthèse",
    "| Identifiant | Titre court | Statut | Priorité | Action immédiate |",
    "|---|---|---|---|---|",
  ];
  for (let index = 1; index <= 12; index += 1) lines.push(`| C${pad(index)} | | | | |`);
  lines.push(
    "",
    "## Constats détaillés",
    "### Constat 1",
    "- Actif :",
    "- Preuve :",
    "- Impact :",
    "- Recommandation :",
    "",
    "### Constat 2",
    "- Actif :",
    "- Preuve :",
    "- Impact :",
    "- Recommandation :",
    "",
    "### Constat 3",
    "- Actif :",
    "- Preuve :",
    "- Impact :",
    "- Recommandation :",
    "",
    "### Constat 4",
    "- Actif :",
    "- Preuve :",
    "- Impact :",
    "- Recommandation :",
    "- Référence du re-test :",
    "",
    "## Hypothèses à confirmer",
    "- Élément :",
    "- Preuve manquante :",
    "- Action de re-test :",
    "- Décision si la preuve manque encore :",
    "",
    "## Faux positifs écartés",
    "- Identifiant :",
    "- Justification :",
    "- Pièce plus fiable utilisée :",
    "",
    "## Écarts au cadrage",
    "- Heure UTC :",
    "- Description :",
    "- Mesure corrective :",
    "- Contact notifié :",
    "",
    "## Nettoyage de fin de mission",
    "- Artefacts retirés :",
    "- Artefacts restant à traiter :",
    "- Responsable de fermeture :",
    "",
    "## Plan de re-test",
    "1. ",
    "2. ",
    "3. ",
    "4. ",
    "",
    "## Annexes",
    "- Exports cités :",
    "- Chronologie :",
    "- Calculs CVSS détaillés :",
    "- Priorités numériques recalculées :",
    "- Notes de version du rapport :",
    ""
  );
  return lines.join("\n");
}

function buildMethodGuide() {
  return [
    "# Guide de méthode",
    "",
    "> Cadre et limites : tu analyses uniquement des fichiers fournis. Ne teste jamais un système réel sans autorisation écrite. Les exemples ci-dessous utilisent des valeurs inventées, pas celles du dossier.",
    "",
    "## 1. Commencer par le cadrage",
    "",
    "Lis d’abord la synthèse de cadrage pour relever le périmètre, la fenêtre horaire, les exclusions et la liste des services attendus. Une réponse n’est valable que si elle respecte ces bornes.",
    "",
    "## 2. Croiser des ensembles OSINT",
    "",
    "Quand une question oppose présence dans les sources passives et absence dans le DNS actif, isole les lignes par colonnes, puis compare les ensembles. Une technologie se compte une seule fois par source distincte.",
    "",
    "```bash",
    "cat > osint-exemple.csv <<'EOF'",
    "ligne;fqdn;source;dns_statut;technologie",
    "O01;demo.example;ct_log;absent;apache",
    "O02;demo.example;archive_page;absent;apache",
    "O03;portail.demo.example;dns_zone;actif;caddy",
    "O04;portail.demo.example;capture_entete;actif;caddy",
    "EOF",
    "grep ';absent;' osint-exemple.csv | cut -d';' -f2 | sort | uniq",
    "```",
    "",
    "```powershell",
    "@'",
    "ligne;fqdn;source;dns_statut;technologie",
    "O01;demo.example;ct_log;absent;apache",
    "O02;demo.example;archive_page;absent;apache",
    "O03;portail.demo.example;dns_zone;actif;caddy",
    "O04;portail.demo.example;capture_entete;actif;caddy",
    "'@ | Set-Content -Encoding UTF8 osint-exemple.csv",
    "Import-Csv -Delimiter ';' -Encoding UTF8 osint-exemple.csv | Where-Object { $_.dns_statut -eq 'absent' } | Group-Object fqdn | Select-Object Name, Count",
    "```",
    "",
    "## 3. Lire un XML Nmap",
    "",
    "Dans ce parcours, un hôte ne compte que si son état est `up`. Pour repérer un couple inattendu, il faut lister les ports `open`, puis comparer au tableau des services attendus du cadrage. En XML Nmap, un service HTTPS peut apparaître comme `name=\"http\" tunnel=\"ssl\"` plutôt que comme une chaîne unique.",
    "",
    "```bash",
    "cat > nmap-exemple.xml <<'EOF'",
    "<nmaprun>",
    "  <host><status state=\"up\"/><address addr=\"198.51.100.10\"/><hostnames><hostname name=\"demo.example\"/></hostnames><ports><port protocol=\"tcp\" portid=\"443\"><state state=\"open\"/></port></ports></host>",
    "  <host><status state=\"down\"/><address addr=\"198.51.100.11\"/><hostnames><hostname name=\"old.demo.example\"/></hostnames><ports><port protocol=\"tcp\" portid=\"443\"><state state=\"closed\"/></port></ports></host>",
    "</nmaprun>",
    "EOF",
    "grep '<status state=\"up\"' nmap-exemple.xml | wc -l",
    "```",
    "",
    "```powershell",
    "@'",
    "<nmaprun>",
    "  <host><status state=\"\"up\"\"/><address addr=\"\"198.51.100.10\"\"/><hostnames><hostname name=\"\"demo.example\"\"/></hostnames><ports><port protocol=\"\"tcp\"\" portid=\"\"443\"\"><state state=\"\"open\"\"/></port></ports></host>",
    "  <host><status state=\"\"down\"\"/><address addr=\"\"198.51.100.11\"\"/><hostnames><hostname name=\"\"old.demo.example\"\"/></hostnames><ports><port protocol=\"\"tcp\"\" portid=\"\"443\"\"><state state=\"\"closed\"\"/></port></ports></host>",
    "</nmaprun>",
    "'@ | Set-Content -Encoding UTF8 nmap-exemple.xml",
    "(Get-Content -Encoding UTF8 nmap-exemple.xml) -match '<status state=\"\"up\"\"' | Measure-Object | Select-Object -ExpandProperty Count",
    "```",
    "",
    "## 4. Recalculer une note CVSS puis une priorité",
    "",
    "Recopie le vecteur, calcule la note CVSS avec la formule de la grille, puis applique les facteurs de surface, criticité, preuve, KEV et EPSS. Garde chaque étape, sinon tu ne pourras pas justifier la priorité dans le rapport.",
    "",
    "```bash",
    "cat > priorite-exemple.csv <<'EOF'",
    "id;note;surface;criticite;preuve;kev;epss",
    "X01;4.6;vpn;elevee;partielle;non;0.34",
    "X02;6.1;internet;critique;suffisante;oui;0.82",
    "EOF",
    "awk -F';' 'NR>1 { print $1, $2, $3, $4, $5, $6, $7 }' priorite-exemple.csv",
    "```",
    "",
    "```powershell",
    "@'",
    "id;note;surface;criticite;preuve;kev;epss",
    "X01;4.6;vpn;elevee;partielle;non;0.34",
    "X02;6.1;internet;critique;suffisante;oui;0.82",
    "'@ | Set-Content -Encoding UTF8 priorite-exemple.csv",
    "Import-Csv -Delimiter ';' -Encoding UTF8 priorite-exemple.csv | Select-Object id, note, surface, criticite, preuve, kev, epss",
    "```",
    "",
    "## 5. Rédiger sans surinterpréter",
    "",
    "Dans un résumé exécutif, écris ce qui est démontré, ce qui reste une hypothèse et l’action vérifiable qui réduit le risque. Une phrase prudente vaut mieux qu’une formule spectaculaire impossible à justifier.",
    "",
    "## 6. Statuts et rattachements",
    "",
    "- `constat` = preuve suffisante et corroborée ;",
    "- `hypothese` = signal plausible, mais encore incomplet ;",
    "- `faux_positif` = alerte infirmée par une pièce plus fiable ;",
    "- un contrôle d’accès cassé ou une SSRF pilotée depuis l’application se rattachent à la catégorie d’accès non autorisé décrite dans la grille.",
    "",
    "## 7. Variante visionneuse",
    "",
    "Dans la visionneuse du site, commence par le document de cadrage ou de grille, puis utilise la recherche pour un identifiant, une colonne, un code OWASP, une heure UTC ou un état `open`. Note toujours le fichier source avant de répondre.",
    "",
  ].join("\n");
}

function buildFacts(osintRows, hosts, findings, webHistory, missionJournal) {
  const missingOsint = (() => {
    const counts = new Map();
    for (const row of osintRows) {
      if (row.source === "dns_zone") continue;
      if (row.dns_statut !== "absent") continue;
      counts.set(row.fqdn, (counts.get(row.fqdn) || 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0][0];
  })();

  const topTechnology = (() => {
    const byTech = new Map();
    for (const row of osintRows) {
      if (!row.technologie) continue;
      if (!byTech.has(row.technologie)) byTech.set(row.technologie, new Set());
      byTech.get(row.technologie).add(row.source);
    }
    return [...byTech.entries()].sort((left, right) => right[1].size - left[1].size)[0][0];
  })();

  const unexpectedHostPort = "stock.sahel-vert.example:8080";
  const upHostCount = hosts.filter((host) => host.state === "up").length;
  const findingScores = Object.fromEntries(findings.map((finding) => [finding.id, cvssScore(finding.vecteur_cvss)]));
  const findingPriorities = Object.fromEntries(findings.map((finding) => [finding.id, priorityScore(finding)]));
  const priorityRanking = [...findings]
    .filter((finding) => finding.validation_humaine === "constat")
    .sort((left, right) => {
      const delta = findingPriorities[right.id] - findingPriorities[left.id];
      if (delta !== 0) return delta;
      const scoreDelta = findingScores[right.id] - findingScores[left.id];
      if (scoreDelta !== 0) return scoreDelta;
      return left.id.localeCompare(right.id);
    });

  const missionLines = missionJournal.trim().split("\n");
  const firstRoeTime = missionLines.find((line) => line.includes("event=roe_ecart")).slice(11, 19);
  const cleanupRemaining = missionLines.find((line) => line.includes("event=nettoyage") && line.includes("statut=ouvert")).match(/item=(N\d{2})/)[1];

  return {
    ptProj: {
      assetNames: { ...ASSET_NAMES },
      answers: {
        scopeFqdn: "portail.sahel-vert.example",
        forbiddenActionId: "r05",
        osintMissingFqdn: missingOsint,
        osintTopTechnology: topTechnology,
        nmapUpHostCount: String(upHostCount),
        nmapUnexpectedOpen: unexpectedHostPort,
        falsePositiveId: "f03",
        confirmedFindingId: "f04",
        webAccessControlId: "w04",
        webAccessControlOwasp: "a01",
        firstRoeTime: firstRoeTime.toLowerCase(),
        cleanupRemainingId: cleanupRemaining.toLowerCase(),
        focusFindingId: "f06",
        focusFindingCvss: String(findingScores.F06.toFixed(1)),
        focusFindingPriority: String(findingPriorities.F06.toFixed(1)),
        topPriorityId: priorityRanking[0].id.toLowerCase(),
        executiveSummaryLetter: "b",
        recommendationLetter: "d",
        firstActionsLetter: "c",
        evidenceStatus: "hypothese",
      },
      scoresById: findingScores,
      prioritiesById: findingPriorities,
    },
  };
}

function buildPtAssetsProj() {
  const osintRows = buildOsintRows();
  const hosts = buildNmapHosts();
  const findings = buildFindings();
  const webHistory = buildWebHistory();
  const missionJournal = buildMissionJournal();
  const facts = buildFacts(osintRows, hosts, findings, webHistory, missionJournal);

  return {
    files: [
      { name: ASSET_NAMES.cadrage, data: text(buildScopeDocument()) },
      { name: ASSET_NAMES.osint, data: text(csv(["ligne", "fqdn", "source", "dns_statut", "technologie", "observation"], osintRows)) },
      { name: ASSET_NAMES.nmap, data: text(buildNmapXml(hosts)) },
      { name: ASSET_NAMES.vulns, data: text(buildVulnCsv(findings)) },
      { name: ASSET_NAMES.web, data: text(webHistory) },
      { name: ASSET_NAMES.mission, data: text(missionJournal) },
      { name: ASSET_NAMES.grille, data: text(buildRiskGrid()) },
      { name: ASSET_NAMES.report, data: text(buildReportTemplate()) },
      { name: ASSET_NAMES.guide, data: text(buildMethodGuide()) },
    ],
    facts,
  };
}

module.exports = { buildPtAssetsProj };
