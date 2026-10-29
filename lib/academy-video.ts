import { parseCallout, pendingVideoTitle } from "@/lib/lesson-content";
import { parseFigure, type Figure } from "@/lib/figure-spec";
import type { Lab, LabAsset, LabTask, LessonBlock } from "@/types/api";

export type VideoDomain =
  | "network"
  | "osi"
  | "linux"
  | "logs"
  | "web"
  | "pentest"
  | "crypto"
  | "fundamentals";

export type VideoChapterKind =
  | "briefing"
  | "diagram"
  | "mechanism"
  | "terminal"
  | "pitfalls"
  | "summary";

export interface VideoCaption {
  startRatio: number;
  endRatio: number;
  text: string;
}

export interface VideoTerminalStep {
  command?: string;
  output?: string;
  note?: string;
}

export interface VideoNodeVisual {
  id: string;
  label: string;
  sub: string;
  tone: "cyan" | "blue" | "violet" | "green" | "amber" | "red";
}

export interface AcademyVideoChapter {
  id: string;
  index: number;
  kind: VideoChapterKind;
  badge: string;
  title: string;
  durationSeconds: number;
  narration: string;
  captions: VideoCaption[];
  bullets: string[];
  highlightTitle?: string;
  highlightBody?: string;
  figure?: Figure | null;
  terminalSteps?: VideoTerminalStep[];
  terminalPrompt?: string;
  pitfalls?: string[];
  safeguards?: string[];
  nodes?: VideoNodeVisual[];
  flowLabels?: string[];
}

export interface AcademyVideoSpec {
  id: string;
  mode: "lesson" | "lab";
  domain: VideoDomain;
  domainLabel: string;
  seriesLabel: string;
  title: string;
  subtitle: string;
  totalDurationSeconds: number;
  chapters: AcademyVideoChapter[];
}

export interface LessonVideoInput {
  id?: string;
  videoTitle?: string;
  lessonTitle?: string;
  summary?: string;
  moduleTitle?: string;
  courseTitle?: string;
  courseSlug?: string;
  durationMinutes?: number;
  blocks?: LessonBlock[];
}

export interface LabVideoInput {
  lab: Pick<
    Lab,
    | "id"
    | "slug"
    | "title"
    | "description"
    | "category"
    | "difficulty"
    | "format"
    | "briefing"
    | "objectives"
    | "constraints"
    | "tools"
    | "hints"
    | "estimated_minutes"
  >;
  tasks?: Pick<LabTask, "position" | "prompt" | "answer_format">[];
  assets?: Pick<LabAsset, "kind" | "title" | "description">[];
}

function cleanText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function splitSentences(text: string): string[] {
  const cleaned = cleanText(text);
  if (!cleaned) return [];
  const parts = cleaned
    .split(/(?<=[.!?])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [cleaned];
}

function splitListItems(text: string): string[] {
  const cleaned = cleanText(text);
  if (!cleaned) return [];
  const bySemicolon = cleaned
    .split(/\s*;\s*/u)
    .map((item) => item.replace(/^[•\-–]\s*/, "").trim())
    .filter((item) => item.length > 3);
  if (bySemicolon.length >= 2) {
    return bySemicolon.map((item) => {
      const cap = item.charAt(0).toUpperCase() + item.slice(1);
      return /[.!?]$/.test(cap) ? cap : `${cap}.`;
    });
  }
  const bySentence = splitSentences(cleaned);
  if (bySentence.length >= 2) return bySentence;
  const byComma = cleaned
    .split(/,\s+(?=[a-zàâçéèêëîïôûùüÿñæœ])/iu)
    .map((item) => item.trim())
    .filter((item) => item.length > 10);
  if (byComma.length >= 2) {
    return byComma.map((item) => {
      const cap = item.charAt(0).toUpperCase() + item.slice(1);
      return /[.!?]$/.test(cap) ? cap : `${cap}.`;
    });
  }
  return [cleaned];
}

export function buildCaptions(narration: string): VideoCaption[] {
  const sentences = splitSentences(narration);
  if (!sentences.length) {
    return [{ startRatio: 0, endRatio: 1, text: narration }];
  }
  const totalChars = Math.max(
    1,
    sentences.reduce((sum, sentence) => sum + sentence.length, 0)
  );
  let cursor = 0;
  return sentences.map((sentence, idx) => {
    const startRatio = cursor / totalChars;
    cursor += sentence.length;
    const endRatio = idx === sentences.length - 1 ? 1 : cursor / totalChars;
    return {
      startRatio: Number(startRatio.toFixed(3)),
      endRatio: Number(endRatio.toFixed(3)),
      text: sentence,
    };
  });
}

export function detectVideoDomain(textCorpus: string): VideoDomain {
  const lower = textCorpus.toLowerCase();
  if (/\b(osi|couche\s*[1-7]|encapsulation|pdu|tcp\/ip|modèle osi)\b/u.test(lower)) {
    return "osi";
  }
  if (/\b(pentest|nmap|reconnaissance|exploitation|cve|owasp|burp|metasploit|intrusion|énumération)\b/u.test(lower)) {
    return "pentest";
  }
  if (/\b(xss|sql|csrf|cookie|http|https|cors|injection|session|api|owasp|sécurité web|securite-web|web)\b/u.test(lower)) {
    return "web";
  }
  if (/\b(log|logs|journal|journaux|siem|syslog|auth\.log|corrélation|correlation|soc|événement|evenement|alerte)\b/u.test(lower)) {
    return "logs";
  }
  if (/\b(linux|bash|chmod|chown|sudo|systemd|processus|fichiers|ssh|grep|awk|permissions| shell)\b/u.test(lower)) {
    return "linux";
  }
  if (/\b(chiffrement|cryptographie|aes|rsa|sha|hash|hachage|tls|certificat|clé publique|signature)\b/u.test(lower)) {
    return "crypto";
  }
  if (/\b(réseau|reseau|lan|wan|switch|commutateur|routeur|vlan|ipv4|ipv6|cidr| sous-réseau|arp|dns|dhcp|nat|ospf|ping|traceroute|pcap|wireshark|packet tracer)\b/u.test(lower)) {
    return "network";
  }
  return "fundamentals";
}

function domainMetadata(domain: VideoDomain, isEn: boolean): {
  label: string;
  series: string;
  nodes: VideoNodeVisual[];
  flowLabels: string[];
  defaultTerminalPrompt: string;
  defaultSteps: VideoTerminalStep[];
} {
  switch (domain) {
    case "osi":
      return {
        label: isEn ? "OSI & TCP/IP Architecture" : "Architecture OSI & TCP/IP",
        series: "Cisco NetAcad · Packet & Layer Trace",
        nodes: [
          { id: "l7", label: isEn ? "L7 Application" : "Couche 7 · Application", sub: "HTTP / DNS / TLS", tone: "cyan" },
          { id: "l4", label: isEn ? "L4 Transport" : "Couche 4 · Transport", sub: "TCP / UDP · Ports", tone: "green" },
          { id: "l3", label: isEn ? "L3 Network" : "Couche 3 · Réseau", sub: "IPv4 / IPv6 · Routage", tone: "violet" },
          { id: "l2", label: isEn ? "L2 Data Link" : "Couche 2 · Liaison", sub: "Ethernet / Wi-Fi · MAC", tone: "amber" },
          { id: "l1", label: isEn ? "L1 Physical" : "Couche 1 · Physique", sub: "Câble / Fibre / Radio", tone: "blue" },
        ],
        flowLabels: ["Message (L7)", "Segment (L4)", "Paquet IP (L3)", "Trame MAC (L2)", "Bits (L1)"],
        defaultTerminalPrompt: "analyst@netacad-osi:~$",
        defaultSteps: [
          { command: "ip -br addr show", output: "eth0  UP  192.168.10.25/24", note: "Couches 1 à 3 : lien actif (UP) et adresse IPv4 configurée." },
          { command: "ip neigh show", output: "192.168.10.1 dev eth0 lladdr 00:1a:2b:3c:4d:5e REACHABLE", note: "Couche 2 : résolution ARP entre l’IP de la passerelle et son adresse MAC." },
          { command: "ss -tulpn | head -n 3", output: "tcp  LISTEN 0 128 0.0.0.0:443  users:((\"nginx\",pid=842))", note: "Couche 4 : port TCP 443 ouvert en écoute pour le service HTTPS." },
          { command: "curl -I https://intranet.local", output: "HTTP/2 200 OK\ncontent-type: text/html; charset=utf-8", note: "Couche 7 : réponse applicative HTTP validée de bout en bout." },
        ],
      };
    case "network":
      return {
        label: isEn ? "Network Infrastructure" : "Infrastructure Réseau",
        series: "Cisco NetAcad · Topology & Switching",
        nodes: [
          { id: "host", label: isEn ? "Workstation" : "Poste Client", sub: "192.168.1.10/24", tone: "cyan" },
          { id: "sw", label: isEn ? "LAN Switch" : "Commutateur LAN", sub: "Table MAC · VLAN", tone: "green" },
          { id: "rtr", label: isEn ? "Edge Router" : "Routeur / Passerelle", sub: "192.168.1.1 · NAT", tone: "violet" },
          { id: "fw", label: isEn ? "Firewall" : "Pare-feu Périmétrique", sub: "ACL & Filtrage", tone: "amber" },
          { id: "wan", label: isEn ? "WAN / Server" : "WAN / Serveur Distant", sub: "DNS & Services", tone: "blue" },
        ],
        flowLabels: ["Requête ARP / Trame", "Commutation MAC", "Routage IP", "Filtrage ACL", "Réponse WAN"],
        defaultTerminalPrompt: "cisco-lab@router-gw:~$",
        defaultSteps: [
          { command: "ip route show default", output: "default via 192.168.1.1 dev eth0 proto dhcp", note: "Identifie la passerelle par défaut qui relie le LAN au WAN." },
          { command: "ping -c 3 192.168.1.1", output: "64 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=1.12 ms", note: "Vérifie la connectivité locale (LAN) jusqu’au routeur." },
          { command: "traceroute -n 1.1.1.1", output: " 1  192.168.1.1  1.10 ms\n 2  10.24.0.1    8.45 ms\n 3  1.1.1.1     14.20 ms", note: "Observe chaque saut (hop) entre le réseau local et l’opérateur." },
        ],
      };
    case "linux":
      return {
        label: isEn ? "Linux System Administration" : "Administration & Sécurité Linux",
        series: "Cisco NetAcad · Linux Unhatched",
        nodes: [
          { id: "user", label: isEn ? "Operator Shell" : "Session Utilisateur", sub: "UID / GID · bash", tone: "cyan" },
          { id: "perm", label: isEn ? "Permissions & ACL" : "Droits rwx & Sudo", sub: "Moindre privilège", tone: "amber" },
          { id: "proc", label: isEn ? "Services & Processes" : "Processus & Systemd", sub: "PID · Daemons", tone: "green" },
          { id: "fs", label: isEn ? "Filesystem" : "Arborescence Linux", sub: "/etc · /var/log · /home", tone: "violet" },
          { id: "audit", label: isEn ? "Hardening Check" : "Contrôle d’Intégrité", sub: "Audit & Journalisation", tone: "blue" },
        ],
        flowLabels: ["Commande Shell", "Vérification UID/rwx", "Appel Système", "Accès Fichier/Service", "Trace d’Audit"],
        defaultTerminalPrompt: "admin@srv-linux:~$",
        defaultSteps: [
          { command: "id && pwd", output: "uid=1001(analyste) gid=1001(analyste) groups=1001(analyste),27(sudo)\n/home/analyste", note: "Toujours vérifier l’identité active et le répertoire courant avant d’agir." },
          { command: "ls -la /etc/ssh/sshd_config", output: "-rw------- 1 root root 3284 mars 12 09:15 /etc/ssh/sshd_config", note: "Lecture des permissions : seul root peut lire et modifier ce fichier sensible." },
          { command: "systemctl status ssh --no-pager", output: "Active: active (running) since Mon 08:00:12 UTC; main PID 712 (sshd)", note: "Contrôle de l’état du service et de son identifiant de processus (PID)." },
        ],
      };
    case "logs":
      return {
        label: isEn ? "SOC & Log Analysis" : "SOC & Analyse de Journaux",
        series: "Cisco NetAcad · CyberOps Associate",
        nodes: [
          { id: "src", label: isEn ? "Event Sources" : "Sources d’Événements", sub: "SSH · Web · Pare-feu", tone: "cyan" },
          { id: "col", label: isEn ? "Log Collector" : "Collecte & Horodatage", sub: "Syslog · UTC", tone: "blue" },
          { id: "par", label: isEn ? "Parsing & Filter" : "Filtrage & Extraction", sub: "IP · Code · Compte", tone: "violet" },
          { id: "cor", label: isEn ? "Correlation" : "Corrélation Temporelle", sub: "Tentatives -> Succès", tone: "amber" },
          { id: "ir", label: isEn ? "Incident Report" : "Preuve & Remédiation", sub: "IOC · Chronologie", tone: "green" },
        ],
        flowLabels: ["Émission du log", "Normalisation UTC", "Filtrage par motif", "Recoupement d’indices", "Qualification SOC"],
        defaultTerminalPrompt: "soc-analyst@siem-node:~$",
        defaultSteps: [
          { command: "grep \"Failed password\" auth-sample.log | wc -l", output: "42", note: "Mesure le volume d’échecs d’authentification pour repérer un bruit anormal." },
          { command: "grep \"Accepted password\" auth-sample.log", output: "2026-03-15T08:14:22Z srv-01 sshd[2190]: Accepted password for backup from 198.51.100.44 port 51322 ssh2", note: "Distingue une simple tentative bloquée d’une connexion réellement réussie." },
          { command: "awk '{print $1, $9, $11}' auth-sample.log | head -n 3", output: "2026-03-15T08:12:01Z invalid 198.51.100.44\n2026-03-15T08:12:04Z invalid 198.51.100.44\n2026-03-15T08:14:22Z backup 198.51.100.44", note: "Construit la chronologie exacte : Qui, Quoi, Quand et D’où." },
        ],
      };
    case "web":
      return {
        label: isEn ? "Web Application Security" : "Sécurité des Applications Web",
        series: "Cisco NetAcad · Application Security",
        nodes: [
          { id: "cli", label: isEn ? "Browser Client" : "Navigateur Client", sub: "DOM · Cookies · Origin", tone: "cyan" },
          { id: "req", label: isEn ? "HTTP/TLS Request" : "Requête HTTP / TLS", sub: "Headers · Paramètres", tone: "blue" },
          { id: "waf", label: isEn ? "Input Validation" : "Validation & Contrôle", sub: "Schéma · Autorisation", tone: "amber" },
          { id: "app", label: isEn ? "Backend Logic" : "Serveur Applicatif", sub: "Session · Requêtes préparées", tone: "violet" },
          { id: "db", label: isEn ? "Data Store" : "Base de Données", sub: "Intégrité & Journalisation", tone: "green" },
        ],
        flowLabels: ["Saisie utilisateur", "Transport HTTPS", "Validation serveur", "Requête paramétrée", "Réponse durcie"],
        defaultTerminalPrompt: "appsec@web-audit:~$",
        defaultSteps: [
          { command: "curl -i https://app.exemple.local/login", output: "HTTP/2 200 OK\nStrict-Transport-Security: max-age=63072000\nContent-Security-Policy: default-src 'self'\nSet-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax", note: "Inspection des en-têtes de sécurité et des attributs de protection du cookie de session." },
          { command: "# Requête SQL paramétrée côté serveur\nSELECT id, role FROM users WHERE email = $1;", output: "Paramètre $1 traité comme une donnée pure, jamais comme une commande SQL.", note: "Séparation stricte entre le code de la requête et la saisie de l’utilisateur." },
        ],
      };
    case "pentest":
      return {
        label: isEn ? "Authorized Penetration Testing" : "Pentest & Audit Autorisé",
        series: "Cisco NetAcad · Ethical Hacker",
        nodes: [
          { id: "roe", label: isEn ? "Scope & RoE" : "Cadrage & Autorisation", sub: "Périmètre légal signé", tone: "green" },
          { id: "rec", label: isEn ? "Reconnaissance" : "Cartographie & Surface", sub: "Hôtes · Ports · Services", tone: "cyan" },
          { id: "val", label: isEn ? "Vulnerability Analysis" : "Analyse des Faiblesses", sub: "Versions · Mauvais réglages", tone: "amber" },
          { id: "poc", label: isEn ? "Controlled Proof" : "Preuve Maîtrisée (PoC)", sub: "Impact minimal prouvé", tone: "violet" },
          { id: "rep", label: isEn ? "Remediation Report" : "Rapport & Correctifs", sub: "Priorité · Vérification", tone: "blue" },
        ],
        flowLabels: ["1. Lettre de mission", "2. Énumération", "3. Qualification", "4. Preuve sans dommage", "5. Plan de remédiation"],
        defaultTerminalPrompt: "auditor@pentest-box:~$",
        defaultSteps: [
          { command: "cat perimetre-autorise.txt", output: "Cible autorisée : 10.10.20.0/24 (Environnement de test isolé)\nFenêtre : 09h00 - 17h00 UTC", note: "Étape 0 obligatoire : vérifier le périmètre et les règles d’engagement avant tout paquet envoyé." },
          { command: "nmap -sV -Pn 10.10.20.15", output: "PORT     STATE SERVICE VERSION\n22/tcp   open  ssh     OpenSSH 9.2p1\n8080/tcp open  http    Apache httpd 2.4.58", note: "Identification méthodique des services exposés et de leurs versions." },
        ],
      };
    case "crypto":
      return {
        label: isEn ? "Applied Cryptography" : "Cryptographie Appliquée",
        series: "Cisco NetAcad · Data Protection",
        nodes: [
          { id: "plain", label: isEn ? "Plaintext Asset" : "Donnée en Clair", sub: "Message ou Fichier", tone: "cyan" },
          { id: "hash", label: isEn ? "Integrity Hash" : "Empreinte SHA-256", sub: "Vérification d’intégrité", tone: "green" },
          { id: "enc", label: isEn ? "Encryption Engine" : "Chiffrement AES / TLS", sub: "Clé secrète ou publique", tone: "violet" },
          { id: "cipher", label: isEn ? "Protected Transit" : "Flux Chiffré", sub: "Illisible en cas d’écoute", tone: "amber" },
          { id: "ver", label: isEn ? "Verified Receiver" : "Destinataire Authentifié", sub: "Déchiffrement & Contrôle", tone: "blue" },
        ],
        flowLabels: ["Donnée source", "Calcul d’empreinte", "Chiffrement fort", "Transport protégé", "Validation de signature"],
        defaultTerminalPrompt: "crypto@sec-lab:~$",
        defaultSteps: [
          { command: "sha256sum archive-officielle.tar.gz", output: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  archive-officielle.tar.gz", note: "Une modification d’un seul bit change complètement l’empreinte SHA-256." },
          { command: "openssl s_client -connect cyberpingo.tech:443 -brief", output: "CONNECTION ESTABLISHED\nProtocol version: TLSv1.3\nCiphersuite: TLS_AES_256_GCM_SHA384", note: "Vérification du protocole TLS 1.3 et de la suite cryptographique négociée." },
        ],
      };
    case "fundamentals":
    default:
      return {
        label: isEn ? "Cybersecurity Fundamentals" : "Fondamentaux de la Cybersécurité",
        series: "Cisco NetAcad · Cybersecurity Essentials",
        nodes: [
          { id: "asset", label: isEn ? "Critical Assets" : "Actifs à Protéger", sub: "Données · Comptes · Postes", tone: "cyan" },
          { id: "threat", label: isEn ? "Threat Vector" : "Menace & Vecteur", sub: "Hameçonnage · Malware", tone: "red" },
          { id: "cia", label: isEn ? "CIA Triad" : "Triade C · I · D", sub: "Confidentialité · Intégrité · Dispo", tone: "violet" },
          { id: "ctrl", label: isEn ? "Defense Controls" : "Parades & Défense", sub: "MFA · Mises à jour · Sauvegardes", tone: "green" },
          { id: "res", label: isEn ? "Resilience" : "Continuité & Réponse", sub: "Détection & Reprise", tone: "blue" },
        ],
        flowLabels: ["Inventaire des actifs", "Identification du risque", "Évaluation C·I·D", "Application des parades", "Vérification continue"],
        defaultTerminalPrompt: "defender@cyberpingo:~$",
        defaultSteps: [
          { command: "# 1. Identifier l'actif critique et sa valeur métier\nActif : Messagerie & Dossiers clients", output: "Impact en cas d'arrêt : blocage des opérations et risque de fuite.", note: "Toujours partir de ce que l’on protège avant de choisir l’outil." },
          { command: "# 2. Appliquer les trois parades prioritaires\n[x] Authentification multifacteur (MFA)\n[x] Mises à jour automatiques\n[x] Sauvegarde hors ligne testée", output: "Réduction immédiate de la surface d’exposition sur les vecteurs courants.", note: "Personnes, processus et technologie agissent ensemble." },
        ],
      };
  }
}

function parseCodeToTerminalSteps(codeContent: string, fallbackNote: string): VideoTerminalStep[] {
  const lines = codeContent
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (!lines.length) return [];

  const steps: VideoTerminalStep[] = [];
  let currentNote = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      const comment = trimmed.replace(/^#+\s*/, "").trim();
      if (comment) {
        currentNote = currentNote ? `${currentNote} · ${comment}` : comment;
      }
      continue;
    }

    // Inline comment on a command
    const inlineMatch = /^([^#]+?)\s+#\s+(.+)$/.exec(trimmed);
    if (inlineMatch) {
      steps.push({
        command: inlineMatch[1].trim(),
        note: inlineMatch[2].trim(),
      });
      currentNote = "";
      continue;
    }

    if (steps.length > 0 && !steps[steps.length - 1].output && (/^(default via|HTTP\/|tcp|udp|uid=|Active:|-rw|\d+\s+bytes|\d{4}-\d{2}-\d{2})/i.test(trimmed) || (!/^[a-z0-9_.-]+\s+/i.test(trimmed) && steps[steps.length - 1].command))) {
      steps[steps.length - 1].output = trimmed;
      continue;
    }

    steps.push({
      command: trimmed,
      note: currentNote || undefined,
    });
    currentNote = "";
  }

  if (!steps.length && currentNote) {
    steps.push({ command: lines[0], note: currentNote });
  }

  return steps.slice(0, 6).map((step, idx) => ({
    ...step,
    note: step.note || (idx === 0 ? fallbackNote : undefined),
  }));
}

/**
 * Generates a complete, multi-chapter Cisco Networking Academy style video specification
 * tailored to a specific lesson and its pedagogical blocks.
 */
export function buildLessonVideoSpec(input: LessonVideoInput, lang: "fr" | "en" = "fr"): AcademyVideoSpec {
  const isEn = lang === "en";
  const blocks = input.blocks ?? [];

  let extractedVideoTitle = input.videoTitle ?? "";
  let objectivesText = "";
  let prerequisitesText = "";
  let scenarioText = "";
  let mistakesText = "";
  let safetyText = "";
  let takeawayText = "";
  let practiceText = "";
  const figures: Figure[] = [];
  const textParagraphs: string[] = [];
  const codeBlocks: { content: string; language?: string }[] = [];
  const examples: string[] = [];

  for (const block of blocks) {
    if (block.type === "callout") {
      const pending = pendingVideoTitle(block.content);
      if (pending) {
        if (!extractedVideoTitle) extractedVideoTitle = pending;
        continue;
      }
      const parsed = parseCallout(block.content);
      switch (parsed.kind) {
        case "objectives":
          objectivesText = parsed.body;
          break;
        case "prerequisites":
          prerequisitesText = parsed.body;
          break;
        case "scenario":
          scenarioText = parsed.body;
          break;
        case "mistakes":
          mistakesText = parsed.body;
          break;
        case "safety":
          safetyText = parsed.body;
          break;
        case "takeaway":
          takeawayText = parsed.body;
          break;
        case "practice":
          practiceText = parsed.body;
          break;
      }
    } else if (block.type === "schema") {
      const fig = parseFigure(block.content);
      if (fig) figures.push(fig);
    } else if (block.type === "text") {
      textParagraphs.push(cleanText(block.content));
    } else if (block.type === "code") {
      codeBlocks.push({ content: block.content, language: block.language });
    } else if (block.type === "example") {
      examples.push(cleanText(block.content));
    }
  }

  const mainTitle = extractedVideoTitle || input.lessonTitle || (isEn ? "Interactive Technical Capsule" : "Capsule vidéo du cours");
  const lessonTitle = input.lessonTitle || mainTitle;
  const corpus = [
    mainTitle,
    lessonTitle,
    input.summary ?? "",
    input.courseSlug ?? "",
    input.courseTitle ?? "",
    input.moduleTitle ?? "",
    objectivesText,
    scenarioText,
    textParagraphs.slice(0, 2).join(" "),
  ].join(" ");

  const domain = detectVideoDomain(corpus);
  const meta = domainMetadata(domain, isEn);

  // Extract structured bullets
  const objectiveBullets = splitListItems(objectivesText || input.summary || "").slice(0, 4);
  if (!objectiveBullets.length) {
    objectiveBullets.push(
      isEn
        ? `Master the core concepts of "${lessonTitle}" and apply them in real troubleshooting scenarios.`
        : `Maîtriser les mécanismes essentiels de « ${lessonTitle} » et savoir les appliquer en situation réelle.`,
      isEn
        ? "Identify key components, data flows, and diagnostic commands."
        : "Repérer les composants clés, le trajet des données et les commandes de vérification.",
      isEn
        ? "Avoid common operational mistakes and apply security best practices."
        : "Éviter les erreurs de diagnostic fréquentes et appliquer les bons réflexes de sécurité."
    );
  }

  const theoryPara1 =
    textParagraphs[0] ||
    input.summary ||
    (isEn
      ? `In this lesson on ${lessonTitle}, we break down the architecture so you can diagnose and secure systems methodically.`
      : `Dans cette leçon consacrée à « ${lessonTitle} », nous décomposons l’architecture pour observer, diagnostiquer et sécuriser méthodiquement chaque maillon.`);

  const theoryPara2 =
    textParagraphs[1] ||
    textParagraphs[0] ||
    (isEn
      ? "Every layer and component plays a precise role: understanding how data moves from one point to the next prevents guesswork during incidents."
      : "Chaque composant joue un rôle précis : comprendre comment l’information circule d’un point à un autre évite de remplacer du matériel ou de modifier des règles au hasard.");

  const guidedDemoPara =
    textParagraphs.find((p) => /démonstration guidée/iu.test(p)) ||
    textParagraphs[2] ||
    (isEn
      ? "Let's verify the system state step by step in the terminal and inspect the key indicators."
      : "Passons à la démonstration guidée : vérifions chaque maillon étape par étape et observons les preuves renvoyées par les commandes.");

  const primaryFigure = figures[0] ?? null;
  const secondaryFigure = figures[1] ?? figures[0] ?? null;

  const terminalSteps =
    codeBlocks.length > 0
      ? parseCodeToTerminalSteps(
          codeBlocks[0].content,
          isEn ? "Guided verification step" : "Étape de vérification guidée"
        )
      : meta.defaultSteps;

  const pitfallsList = splitListItems(mistakesText).slice(0, 4);
  if (!pitfallsList.length) {
    pitfallsList.push(
      isEn ? "Modifying configurations randomly without isolating the faulty layer first." : "Modifier la configuration au hasard sans isoler d’abord le maillon en cause.",
      isEn ? "Relying on assumptions instead of verifying with a concrete command or log line." : "Se fier à une supposition au lieu de vérifier avec une commande ou une trace concrète."
    );
  }

  const safeguardsList = splitListItems(safetyText).slice(0, 3);
  if (!safeguardsList.length) {
    safeguardsList.push(
      isEn ? "Always work on authorized environments and document every change." : "Agis toujours dans un cadre autorisé, applique le moindre privilège et vérifie chaque modification."
    );
  }

  const takeawayBullets = splitListItems(takeawayText).slice(0, 4);
  if (!takeawayBullets.length) {
    takeawayBullets.push(...objectiveBullets.slice(0, 3));
  }

  // Chapter 1: Contexte & Objectifs
  const ch1Narration = [
    isEn
      ? `Welcome to this CyberPingo Academy technical briefing: ${mainTitle}.`
      : `Bienvenue dans cette capsule technique CyberPingo Academy : ${mainTitle}.`,
    scenarioText
      ? scenarioText
      : isEn
        ? `Our goal in ${lessonTitle} is to move from theory to concrete operational reflexes.`
        : `Dans cette leçon sur ${lessonTitle}, nous partons d’une situation réelle pour construire une méthode fiable.`,
    objectivesText
      ? isEn
        ? `By the end of this capsule, your objectives are clear: ${objectivesText}`
        : `À la fin de cette vidéo, voici ce que tu sauras faire concrètement : ${objectivesText}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Chapter 2: Architecture & Schéma interactif
  const ch2Narration = [
    primaryFigure?.title
      ? isEn
        ? `Let's examine the architecture diagram: ${primaryFigure.title}.`
        : `Observons maintenant le schéma d’architecture : ${primaryFigure.title}.`
      : isEn
        ? `Let's examine the core architecture and components in action.`
        : `Observons maintenant l’architecture et le rôle exact de chaque élément.`,
    theoryPara1,
    primaryFigure?.caption ? primaryFigure.caption : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Chapter 3: Mécanisme & Circulation des données
  const ch3Narration = [
    secondaryFigure && secondaryFigure !== primaryFigure && secondaryFigure.title
      ? isEn
        ? `Now let's trace how the mechanism operates step by step with ${secondaryFigure.title}.`
        : `Suivons maintenant le fonctionnement détaillé avec le schéma : ${secondaryFigure.title}.`
      : isEn
        ? `Let's trace the mechanism step by step to see how each element interacts.`
        : `Décortiquons le mécanisme étape par étape pour comprendre comment les éléments interagissent.`,
    theoryPara2,
  ]
    .filter(Boolean)
    .join(" ");

  // Chapter 4: Démonstration guidée & Commandes
  const ch4Narration = [
    guidedDemoPara.replace(/^Démonstration guidée\s*:\s*/iu, isEn ? "Guided demonstration: " : "En démonstration guidée : "),
    examples[0]
      ? examples[0].replace(/^Exemple(\s+corrigé)?\s*:\s*/iu, isEn ? "Concrete example: " : "Dans notre cas concret : ")
      : isEn
        ? "Each command gives us an objective proof before moving to the next check."
        : "Chaque commande nous apporte une preuve précise avant de passer au test suivant.",
  ]
    .filter(Boolean)
    .join(" ");

  // Chapter 5: Erreurs fréquentes & Sécurité
  const ch5Narration = [
    mistakesText
      ? isEn
        ? `Watch out for these frequent pitfalls: ${mistakesText}`
        : `Attention aux erreurs fréquentes sur le terrain : ${mistakesText}`
      : isEn
        ? "In the field, avoid jumping to conclusions without checking each indicator."
        : "Sur le terrain, évite de tirer une conclusion hâtive sans contrôler chaque indicateur.",
    safetyText
      ? isEn
        ? `Security reminder: ${safetyText}`
        : `Réflexe sécurité indispensable : ${safetyText}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Chapter 6: À retenir & Passage au Lab
  const ch6Narration = [
    takeawayText
      ? isEn
        ? `Key takeaways to remember: ${takeawayText}`
        : `Ce qu’il faut absolument retenir : ${takeawayText}`
      : isEn
        ? `Remember the core methodology of ${lessonTitle} and test every hypothesis.`
        : `Retiens la logique de ${lessonTitle} : observer, vérifier chaque couche et prouver ton diagnostic.`,
    practiceText
      ? isEn
        ? `Next step: ${practiceText}`
        : `Pour passer à la pratique : ${practiceText}`
      : isEn
        ? "You are now ready to validate the lesson and test your skills in the quiz and laboratory!"
        : "Tu es maintenant prêt à parcourir les détails écrits, pratiquer en laboratoire et valider le quiz de la leçon !",
  ]
    .filter(Boolean)
    .join(" ");

  const estimateDuration = (narration: string, minSec = 20, maxSec = 38) => {
    const words = narration.split(/\s+/).filter(Boolean).length;
    return Math.max(minSec, Math.min(maxSec, Math.round(words / 2.4)));
  };

  const chapters: AcademyVideoChapter[] = [
    {
      id: "ch-briefing",
      index: 0,
      kind: "briefing",
      badge: isEn ? "01 · CONTEXT & GOALS" : "01 · SITUATION & OBJECTIFS",
      title: isEn ? "Operational Scenario & Learning Goals" : "Mise en situation & Objectifs",
      durationSeconds: estimateDuration(ch1Narration, 22, 34),
      narration: ch1Narration,
      captions: buildCaptions(ch1Narration),
      bullets: objectiveBullets,
      highlightTitle: scenarioText
        ? isEn
          ? "Field Scenario"
          : "Mise en situation réelle"
        : isEn
          ? "Why This Matters"
          : "Pourquoi ce sujet est essentiel",
      highlightBody:
        scenarioText ||
        input.summary ||
        (isEn
          ? `Understanding ${lessonTitle} is essential to diagnose and protect real-world systems.`
          : `Comprendre « ${lessonTitle} » permet de diagnostiquer proprement une panne ou un incident sans agir à l’aveugle.`),
      nodes: meta.nodes,
      flowLabels: meta.flowLabels,
    },
    {
      id: "ch-architecture",
      index: 1,
      kind: "diagram",
      badge: isEn ? "02 · ARCHITECTURE & SCHEMA" : "02 · ARCHITECTURE & SCHÉMA",
      title: primaryFigure?.title || (isEn ? "System Topology & Key Components" : "Vue d’ensemble & Schéma animé"),
      durationSeconds: estimateDuration(ch2Narration, 24, 38),
      narration: ch2Narration,
      captions: buildCaptions(ch2Narration),
      bullets: splitSentences(theoryPara1).slice(0, 4),
      figure: primaryFigure,
      highlightTitle: primaryFigure?.title || meta.label,
      highlightBody: primaryFigure?.caption || theoryPara1,
      nodes: meta.nodes,
      flowLabels: meta.flowLabels,
    },
    {
      id: "ch-mechanism",
      index: 2,
      kind: "mechanism",
      badge: isEn ? "03 · STEP-BY-STEP MECHANISM" : "03 · MÉCANISME PAS À PAS",
      title:
        secondaryFigure && secondaryFigure !== primaryFigure && secondaryFigure.title
          ? secondaryFigure.title
          : isEn
            ? "How Data & Controls Flow in Practice"
            : "Fonctionnement détaillé & Flux",
      durationSeconds: estimateDuration(ch3Narration, 22, 36),
      narration: ch3Narration,
      captions: buildCaptions(ch3Narration),
      bullets: splitSentences(theoryPara2).slice(0, 4),
      figure: secondaryFigure !== primaryFigure ? secondaryFigure : null,
      highlightTitle: isEn ? "Key Analytical Mechanism" : "Mécanisme technique à maîtriser",
      highlightBody: theoryPara2,
      nodes: meta.nodes,
      flowLabels: meta.flowLabels,
    },
    {
      id: "ch-terminal",
      index: 3,
      kind: "terminal",
      badge: isEn ? "04 · GUIDED DEMONSTRATION" : "04 · DÉMONSTRATION GUIDÉE",
      title: isEn ? "Live Verification & Diagnostic Walkthrough" : "Vérification en direct & Commandes",
      durationSeconds: estimateDuration(ch4Narration, 24, 38),
      narration: ch4Narration,
      captions: buildCaptions(ch4Narration),
      bullets: splitSentences(guidedDemoPara).slice(0, 3),
      terminalPrompt: meta.defaultTerminalPrompt,
      terminalSteps,
      highlightTitle: isEn ? "Worked Case Analysis" : "Exemple corrigé sur le terrain",
      highlightBody:
        examples[0] ||
        (isEn
          ? "Test from the closest component to the farthest so you isolate the exact point of failure."
          : "Teste toujours du maillon le plus proche au plus lointain pour isoler l’origine exacte du problème."),
    },
    {
      id: "ch-pitfalls",
      index: 4,
      kind: "pitfalls",
      badge: isEn ? "05 · PITFALLS & SECURITY" : "05 · ERREURS & SÉCURITÉ",
      title: isEn ? "Common Mistakes vs. Security Reflexes" : "Pièges fréquents & Réflexes sécurité",
      durationSeconds: estimateDuration(ch5Narration, 20, 34),
      narration: ch5Narration,
      captions: buildCaptions(ch5Narration),
      bullets: pitfallsList,
      pitfalls: pitfallsList,
      safeguards: safeguardsList,
      highlightTitle: isEn ? "Operational Safety" : "Sécurité et limites opérationnelles",
      highlightBody:
        safetyText ||
        prerequisitesText ||
        (isEn
          ? "Always verify permissions and protect administration interfaces."
          : "Protège systématiquement les accès d’administration et vérifie l’autorisation avant tout test."),
    },
    {
      id: "ch-summary",
      index: 5,
      kind: "summary",
      badge: isEn ? "06 · KEY TAKEAWAYS & LAB" : "06 · À RETENIR & PRATIQUE",
      title: isEn ? "Summary & Hands-On Lab Transition" : "Synthèse du cours & Mise en pratique",
      durationSeconds: estimateDuration(ch6Narration, 20, 32),
      narration: ch6Narration,
      captions: buildCaptions(ch6Narration),
      bullets: takeawayBullets,
      highlightTitle: isEn ? "Next Step: Hands-on Practice" : "Prochaine étape : passer à l’action",
      highlightBody:
        practiceText ||
        (isEn
          ? "Apply these concepts right now in the associated laboratory and validate the lesson quiz."
          : "Mets immédiatement ces réflexes en pratique dans le laboratoire associé, puis valide le quiz de la leçon."),
      nodes: meta.nodes,
      flowLabels: meta.flowLabels,
    },
  ];

  const totalDurationSeconds = chapters.reduce((sum, ch) => sum + ch.durationSeconds, 0);

  return {
    id: input.id || `lesson-video-${mainTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    mode: "lesson",
    domain,
    domainLabel: meta.label,
    seriesLabel: input.courseTitle
      ? `${input.courseTitle}${input.moduleTitle ? ` · ${input.moduleTitle}` : ""}`
      : meta.series,
    title: mainTitle,
    subtitle: lessonTitle !== mainTitle ? lessonTitle : meta.label,
    totalDurationSeconds,
    chapters,
  };
}

/**
 * Generates a Cisco Networking Academy style Lab Briefing & Methodology video specification
 * tailored to a specific laboratory without ever leaking task answers or flags.
 */
export function buildLabVideoSpec(input: LabVideoInput, lang: "fr" | "en" = "fr"): AcademyVideoSpec {
  const isEn = lang === "en";
  const { lab, tasks = [], assets = [] } = input;

  const corpus = [
    lab.title,
    lab.slug,
    lab.category,
    lab.format,
    lab.description,
    lab.briefing,
    lab.tools.join(" "),
  ].join(" ");

  const domain = detectVideoDomain(corpus);
  const meta = domainMetadata(domain, isEn);

  const formatName =
    lab.format === "packet_tracer"
      ? "Cisco Packet Tracer (.pkt)"
      : lab.format === "pcap"
        ? isEn
          ? "Packet Capture Analysis (PCAP)"
          : "Analyse de capture réseau (PCAP)"
        : lab.format === "logs"
          ? isEn
            ? "Security Log Investigation"
            : "Investigation de journaux (Logs)"
          : isEn
            ? "Interactive Terminal Investigation"
            : "Investigation Terminal & Commandes";

  // Build generic educational terminal demo from the lab's tools (never running against secret lab answers)
  const toolSteps: VideoTerminalStep[] =
    lab.tools.length > 0
      ? lab.tools.slice(0, 4).map((tool, index) => {
          const lowerTool = tool.toLowerCase();
          if (lowerTool.includes("packet tracer")) {
            return {
              command: "Packet Tracer > Mode Simulation / Inspecter la topologie (.pkt)",
              output: "Observation des trames ARP, ICMP et tables MAC/routage en temps réel",
              note: "Utilise l’outil d’inspection et le terminal des équipements pour relever les preuves.",
            };
          }
          if (lowerTool.includes("wireshark") || lowerTool.includes("pcap") || lowerTool.includes("tcpdump")) {
            return {
              command: "Filtre d’affichage : dns || http || tcp.flags.syn == 1",
              output: "Isoler les flux pertinents par protocole, adresse IP ou port avant de lire le détail.",
              note: "Repère le numéro de trame, l’horodatage et les adresses source/destination.",
            };
          }
          if (lowerTool.includes("grep") || lowerTool.includes("awk") || lowerTool.includes("sort")) {
            return {
              command: `${tool} — filtrer et compter les occurrences sur un fichier d’exemple`,
              output: "Extraction rapide des adresses IP, codes de statut et horodatages UTC.",
              note: "Recoupe toujours une tentative avec sa ligne de résultat (succès ou échec).",
            };
          }
          return {
            command: `${tool}`,
            output: isEn
              ? `Step ${index + 1}: Inspect the evidence and record the exact value requested.`
              : `Outil ${index + 1} : inspecter les preuves et relever la valeur exacte au format attendu.`,
            note: isEn
              ? "Compare the output against the mission constraints."
              : "Compare systématiquement le résultat obtenu avec l’énoncé de la tâche.",
          };
        })
      : meta.defaultSteps;

  const ch1Narration = [
    isEn
      ? `Welcome to the operational briefing for laboratory: ${lab.title}.`
      : `Bienvenue dans le briefing vidéo du laboratoire : ${lab.title}.`,
    lab.briefing || lab.description,
    isEn
      ? `This hands-on scenario uses the ${formatName} format and is estimated at ${lab.estimated_minutes || 25} minutes.`
      : `Ce scénario pratique se déroule au format ${formatName}, pour une durée estimée de ${lab.estimated_minutes || 25} minutes.`,
  ]
    .filter(Boolean)
    .join(" ");

  const ch2Narration = [
    isEn
      ? `Here are the operational objectives you need to accomplish in this mission:`
      : `Voici les objectifs opérationnels que tu dois accomplir durant cette mission :`,
    lab.objectives.join(". "),
    assets.length > 0
      ? isEn
        ? `You have ${assets.length} lab files and resources available right below to conduct your investigation.`
        : `Tu disposes de ${assets.length} ${assets.length > 1 ? "fichiers et supports" : "support"} de laboratoire juste en dessous pour mener ton investigation.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const ch3Narration = [
    isEn
      ? `To solve this lab methodically without guessing, rely on the recommended tools: ${lab.tools.join(", ") || "analysis tools"}.`
      : `Pour résoudre ce laboratoire avec méthode et sans jamais deviner au hasard, appuie-toi sur les outils prévus : ${lab.tools.join(", ") || "les outils d’analyse fournis"}.`,
    isEn
      ? "Observe the evidence first, formulate a hypothesis, and verify the exact format requested for each step."
      : "La méthode Cisco NetAcad tient en trois temps : observer les preuves dans les fichiers ou la visionneuse, formuler une hypothèse, puis vérifier le format attendu avant de valider.",
  ]
    .filter(Boolean)
    .join(" ");

  const ch4Narration = [
    lab.constraints.length > 0
      ? isEn
        ? `Respect these operational constraints: ${lab.constraints.join(". ")}.`
        : `Respecte scrupuleusement le cadre et les contraintes de la mission : ${lab.constraints.join(". ")}.`
      : "",
    lab.hints.length > 0
      ? isEn
        ? `Analyst guidance to stay on track: ${lab.hints.slice(0, 2).join(" ")}`
        : `Conseils d’analyste pour éviter les fausses pistes : ${lab.hints.slice(0, 2).join(" ")}`
      : isEn
        ? "Every accepted answer comes directly from an observable fact in the scenario."
        : "Chaque réponse attendue provient d’un fait vérifiable dans les pièces du scénario.",
  ]
    .filter(Boolean)
    .join(" ");

  const taskOverview =
    tasks.length > 0
      ? tasks.slice(0, 4).map((t) =>
          isEn
            ? `Step ${t.position}: ${t.prompt}${t.answer_format ? ` (Format: ${t.answer_format})` : ""}`
            : `Étape ${t.position} : ${t.prompt}${t.answer_format ? ` (Format : ${t.answer_format})` : ""}`
        )
      : lab.objectives.slice(0, 4);

  const ch5Narration = [
    tasks.length > 0
      ? isEn
        ? `Your investigation is structured into ${tasks.length} progressive validation steps. Solving step 1 unlocks the rest of the investigation trail.`
        : `Ton investigation est découpée en ${tasks.length} étapes progressives. Valide la première étape à partir de tes observations pour débloquer la suite de l’enquête.`
      : isEn
        ? "Complete the analysis and submit your final answer below."
        : "Mène l’analyse jusqu’au bout et soumets ta preuve ci-dessous.",
    isEn
      ? "Open the lab files below and start your investigation now!"
      : "Ouvre maintenant les supports du laboratoire ci-dessous et lance ton investigation !",
  ]
    .filter(Boolean)
    .join(" ");

  const chapters: AcademyVideoChapter[] = [
    {
      id: "lab-briefing",
      index: 0,
      kind: "briefing",
      badge: isEn ? "01 · MISSION BRIEFING" : "01 · MISE EN SITUATION",
      title: isEn ? "Scenario Context & Incident Scope" : "Contexte du scénario & Périmètre",
      durationSeconds: 24,
      narration: ch1Narration,
      captions: buildCaptions(ch1Narration),
      bullets: [
        `${isEn ? "Format" : "Format"} : ${formatName}`,
        `${isEn ? "Objectives" : "Objectifs"} : ${lab.objectives.length} ${isEn ? "key checks" : "points de contrôle"}`,
        `${isEn ? "Estimated time" : "Durée estimée"} : ${lab.estimated_minutes || 25} min`,
      ],
      highlightTitle: isEn ? "Operational Briefing" : "Briefing de mission",
      highlightBody: lab.briefing || lab.description,
      nodes: meta.nodes,
      flowLabels: meta.flowLabels,
    },
    {
      id: "lab-objectives",
      index: 1,
      kind: "diagram",
      badge: isEn ? "02 · OBJECTIVES & ASSETS" : "02 · OBJECTIFS & SUPPORTS",
      title: isEn ? "What You Need to Identify & Prove" : "Objectifs d’investigation & Pièces fournies",
      durationSeconds: 26,
      narration: ch2Narration,
      captions: buildCaptions(ch2Narration),
      bullets: lab.objectives.slice(0, 5),
      highlightTitle:
        assets.length > 0
          ? isEn
            ? `${assets.length} Lab Files & Viewers Ready`
            : `${assets.length} support${assets.length > 1 ? "s" : ""} et visionneuse${assets.length > 1 ? "s" : ""} à analyser`
          : meta.label,
      highlightBody:
        assets.length > 0
          ? assets.map((a) => `${a.title} (${a.kind.toUpperCase()})`).join(" · ")
          : lab.description,
      nodes: meta.nodes,
      flowLabels: meta.flowLabels,
    },
    {
      id: "lab-tools",
      index: 2,
      kind: "terminal",
      badge: isEn ? "03 · TOOLS & METHODOLOGY" : "03 · OUTILS & MÉTHODE",
      title: isEn ? "Recommended Tools & Analytical Workflow" : "Outils recommandés & Méthode d’analyse",
      durationSeconds: 26,
      narration: ch3Narration,
      captions: buildCaptions(ch3Narration),
      bullets:
        lab.tools.length > 0
          ? lab.tools.map((tool) => `${isEn ? "Tool" : "Outil"} : ${tool}`)
          : [isEn ? "Inspect the provided evidence methodically." : "Inspecter méthodiquement les preuves fournies."],
      terminalPrompt: meta.defaultTerminalPrompt,
      terminalSteps: toolSteps,
      highlightTitle: isEn ? "Analyst Methodology" : "Méthode d’investigation NetAcad",
      highlightBody: isEn
        ? "Never guess a value: extract it from the packet capture, log viewer, or topology file."
        : "Ne devine jamais une réponse : relève-la dans la capture, le journal ou la topologie.",
    },
    {
      id: "lab-constraints",
      index: 3,
      kind: "pitfalls",
      badge: isEn ? "04 · CONSTRAINTS & HINTS" : "04 · CONTRAINTES & PISTES",
      title: isEn ? "Operational Boundaries & Investigation Tips" : "Cadre, contraintes & Conseils d’analyste",
      durationSeconds: 22,
      narration: ch4Narration,
      captions: buildCaptions(ch4Narration),
      bullets: lab.constraints.length > 0 ? lab.constraints : [isEn ? "Work strictly on the lab files." : "Travailler uniquement sur les fichiers du laboratoire."],
      pitfalls:
        lab.constraints.length > 0
          ? lab.constraints
          : [isEn ? "Check answer formatting carefully before validating." : "Vérifier le format attendu (IP, port, commande, horodatage) avant de valider."],
      safeguards:
        lab.hints.length > 0
          ? lab.hints.slice(0, 3)
          : [isEn ? "Cross-check timestamps and identifiers across files." : "Recouper les horodatages et les identifiants entre les fichiers."],
      highlightTitle: isEn ? "Rules of Engagement" : "Règles d’engagement du laboratoire",
      highlightBody:
        lab.constraints[0] ||
        (isEn
          ? "Every finding must be backed by observable evidence in the lab."
          : "Chaque réponse validée doit reposer sur une preuve observable dans le laboratoire."),
    },
    {
      id: "lab-action",
      index: 4,
      kind: "summary",
      badge: isEn ? "05 · ACTION PLAN" : "05 · PLAN D’ACTION",
      title:
        tasks.length > 0
          ? isEn
            ? `Ready to Solve: ${tasks.length} Investigation Steps`
            : `Prêt à résoudre : ${tasks.length} étapes guidées`
          : isEn
            ? "Ready to Launch the Lab"
            : "Prêt à lancer le laboratoire",
      durationSeconds: 22,
      narration: ch5Narration,
      captions: buildCaptions(ch5Narration),
      bullets: taskOverview,
      highlightTitle: isEn ? "Start Below" : "À toi de jouer ci-dessous",
      highlightBody: isEn
        ? "Download or open the interactive viewer below, solve step 1 to unlock the next steps, and validate your skill!"
        : "Utilise la visionneuse ou les fichiers téléchargeables ci-dessous, valide l’étape 1 pour débloquer la suite et gagne tes XP !",
      nodes: meta.nodes,
      flowLabels: meta.flowLabels,
    },
  ];

  const totalDurationSeconds = chapters.reduce((sum, ch) => sum + ch.durationSeconds, 0);

  return {
    id: `lab-video-${lab.slug || lab.id}`,
    mode: "lab",
    domain,
    domainLabel: meta.label,
    seriesLabel: `CyberPingo Lab · ${formatName}`,
    title: isEn ? `Lab Briefing: ${lab.title}` : `Démonstration & Briefing : ${lab.title}`,
    subtitle: `${meta.label} · ${formatName}`,
    totalDurationSeconds,
    chapters,
  };
}
