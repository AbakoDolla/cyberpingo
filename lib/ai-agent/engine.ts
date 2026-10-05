/**
 * Moteur d'Intelligence Artificielle Pédagogique - Professeur Pingo
 * Gère les modes : Tuteur Socratique, Correcteur de TP & Auditeur,
 * Analyseur de Logs SOC, et Générateur de Défis Flash.
 */

export type AgentMode = "mentor" | "tp_grader" | "log_analyzer" | "quiz_gen";

export type AgentDomain =
  | "general"
  | "reseau"
  | "linux"
  | "web"
  | "pentest"
  | "crypto"
  | "soc";

export interface ThinkingStep {
  id: string;
  label: string;
  detail: string;
  durationMs: number;
}

export interface TPGradeResult {
  score: number; // Note sur 20
  percentage: number; // 0-100%
  gradeLabel: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  standardsCompliance: {
    standard: string;
    status: "conforme" | "partiel" | "non_conforme";
    notes: string;
  }[];
  remediationSteps: string[];
  pingoAdvice: string;
}

export interface LogAnalysisResult {
  attackType: string;
  severity: "Faible" | "Moyen" | "Élevé" | "Critique";
  confidenceScore: number; // 0 - 100
  summary: string;
  iocs: { type: "ip" | "path" | "user_agent" | "payload" | "account"; value: string; description: string }[];
  timeline: { step: number; event: string; isAnomaly: boolean }[];
  detectionRules: { type: "sigma" | "iptables" | "snort"; rule: string }[];
  recommendations: string[];
}

export interface QuizFlashResult {
  title: string;
  domain: AgentDomain;
  difficulty: "debutant" | "intermediaire" | "avance";
  scenario: string;
  question: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  explanation: string;
  keyTakeaway: string;
}

/** Étapes de réflexion simulées pour donner un tempo d'analyse réaliste et soigné */
export function getThinkingStepsForMode(mode: AgentMode): ThinkingStep[] {
  switch (mode) {
    case "tp_grader":
      return [
        {
          id: "parse",
          label: "Examen des éléments fournis",
          detail: "Analyse syntaxique des commandes, scripts et livrables...",
          durationMs: 800,
        },
        {
          id: "methodology",
          label: "Évaluation méthodologique",
          detail: "Vérification des étapes de résolution et des hypothèses...",
          durationMs: 900,
        },
        {
          id: "standards",
          label: "Confrontation aux référentiels",
          detail: "Contrôle selon les guides ANSSI, OWASP et MITRE ATT&CK...",
          durationMs: 700,
        },
        {
          id: "grading",
          label: "Formulation du barème & conseils",
          detail: "Calcul du score pédagogique et axes de remédiation...",
          durationMs: 600,
        },
      ];
    case "log_analyzer":
      return [
        {
          id: "ingest",
          label: "Ingestion des traces brutes",
          detail: "Extraction des adresses IP, timestamps et requêtes...",
          durationMs: 700,
        },
        {
          id: "ioc",
          label: "Corrélation des IOCs",
          detail: "Identification des motifs d'attaque et des signatures...",
          durationMs: 850,
        },
        {
          id: "severity",
          label: "Calcul de criticité",
          detail: "Évaluation de l'impact opérationnel et du risque cyber...",
          durationMs: 750,
        },
        {
          id: "countermeasures",
          label: "Génération des contre-mesures",
          detail: "Élaboration des règles de détection et de blocage...",
          durationMs: 600,
        },
      ];
    case "quiz_gen":
      return [
        {
          id: "context",
          label: "Ciblage pédagogique",
          detail: "Sélection d'un scénario adapté au niveau de l'apprenant...",
          durationMs: 650,
        },
        {
          id: "challenge",
          label: "Conception de l'incident",
          detail: "Construction d'une épreuve réaliste de réflexion...",
          durationMs: 800,
        },
        {
          id: "formulate",
          label: "Finalisation du défi",
          detail: "Mise en place des choix et de l'explication experte...",
          durationMs: 550,
        },
      ];
    case "mentor":
    default:
      return [
        {
          id: "listen",
          label: "Analyse de la demande",
          detail: "Compréhension du besoin et du niveau de contexte...",
          durationMs: 600,
        },
        {
          id: "pedagogy",
          label: "Sélection de la démarche socratique",
          detail: "Recherche d'indices progressifs sans dévoiler la solution...",
          durationMs: 750,
        },
        {
          id: "synthesize",
          label: "Rédaction professorale",
          detail: "Formulation claire, structurée et bienveillante...",
          durationMs: 650,
        },
      ];
  }
}

/** Génère un prompt système Gemini spécifique selon le rôle de l'agent */
export function getSystemPromptForMode(mode: AgentMode, domain: AgentDomain = "general", labContext?: string): string {
  const baseIdentity = `Tu es le Professeur Pingo, mascotte et super-mentor de la plateforme CyberPingo.
Tu t'exprimes avec calme, rigueur, articulation parfaite et bienveillance pédagogique (comme un enseignant d'école d'ingénieur ou d'institut cyber réputé).
Ton ton est mesuré, jamais expéditif. Tu ne fais pas de réponses bâclées : tu structures chaque retour avec méthode.`;

  const contextNote = labContext ? `\nCONTEXTE SPÉCIFIQUE DU LAB/ATELIER :\n${labContext}\n` : "";

  switch (mode) {
    case "tp_grader":
      return `${baseIdentity}
RÔLE ACTIF : AUDITEUR & CORRECTEUR DE TRAVAUX PRATIQUES (TP).
${contextNote}
Tu dois corriger et auditer les travaux pratiques, comptes-rendus, scripts (Bash, Python), configurations et réponses soumis par l'apprenant.

STRUCTURE DE RÉPONSE OBLIGATOIRE (en Markdown soigné) :
### 📊 1. Évaluation Globale & Note Indicative
- Note sur 20 argumentée (ex: 16/20 - Niveau Opérationnel Maîtrisé).
- Bref résumé du travail fourni (qualité de la démarche, rigueur).

### ✅ 2. Points Forts & Notions Maîtrisées
- Ce que l'apprenant a particulièrement bien réussi.
- Les bonnes pratiques observées (commandes appropriées, syntaxe, respect du périmètre).

### ⚠️ 3. Faiblesses, Erreurs ou Manques Constatés
- Les erreurs de syntaxe, de logique ou de méthodologie.
- Les angles morts (sécurité défensive omise, permissions trop permissives, absence de validation d'entrée).

### 🛡️ 4. Conformité aux Standards (ANSSI / OWASP / MITRE ATT&CK)
- Indique si la démarche respecte les guides d'hygiène informatique (ex: principe du moindre privilège, requêtes paramétrées, segmentation réseau).

### 🎯 5. Recommandations Pas-à-Pas & Plan d'Amélioration
- 3 à 5 actions concrètes pour perfectionner son livrable ou sécuriser la solution.

Termine toujours par un mot d'encouragement personnalisé du Professeur Pingo.`;

    case "log_analyzer":
      return `${baseIdentity}
RÔLE ACTIF : ANALYSTE SOC & FORENSIQUE (BLUE TEAM).
${contextNote}
Tu dois analyser les journaux d'événements (logs Apache, Nginx, auth.log, syslog, Windows Event, captures réseau) soumis par l'apprenant.

STRUCTURE DE RÉPONSE OBLIGATOIRE :
### 🚨 1. Diagnostic de Menace & Niveau de Sévérité
- Type d'attaque identifié (ex: Injection SQL, Brute-force SSH, Directory Traversal, Scan de ports, Énumération).
- Niveau de criticité : Faible, Moyen, Élevé, ou Critique (avec justification).

### 🔍 2. Indicateurs de Compromission (IOCs) Extraits
- Adresses IP suspectes, User-Agents douteux, URLs d'attaque, comptes ciblés.

### ⏱️ 3. Chronologie de l'Incident (Timeline)
- Déroulé étape par étape de l'activité anormale détectée dans les logs.

### 🛡️ 4. Règles de Détection & Blocage Immédiat
- Fournis une règle concrète (iptables pour bannir l'IP, règle Sigma ou regex de détection).

### 💡 5. Recommandations Pédagogiques & Démarche d'Investigation
- Quelles autres commandes ou logs l'apprenant doit-il consulter pour compléter l'investigation.`;

    case "quiz_gen":
      return `${baseIdentity}
RÔLE ACTIF : MAÎTRE DU JEU CYBER & CONCEPTEUR D'ÉPREUVES.
Domaine cible : ${domain}.
${contextNote}
Génère une mise en situation cyber immersive et courte (10-15 lignes), suivie d'une question de réflexion tactique et de 4 options de réponse (A, B, C, D) dont une seule est la plus rigoureuse.
Fournis ensuite l'analyse détaillée de chaque option et la règle d'or à retenir.`;

    case "mentor":
    default:
      return `${baseIdentity}
RÔLE ACTIF : MENTOR PÉDAGOGIQUE SOCRATIQUE.
Domaine : ${domain}.
${contextNote}
OBJECTIF : Accompagner l'apprenant en lui faisant développer ses propres réflexes de réflexion.
DIRECTIVES :
- Ne donne JAMAIS la réponse brute immédiatement si l'apprenant te demande la solution d'un exercice ou d'un lab.
- Guide-le par des questions progressives (méthode socratique).
- Découpe ta réponse en 3 temps :
  1. Le principe fondamental (l'analogie ou la règle de base).
  2. La piste de réflexion (l'outil, la commande ou le fichier à inspecter).
  3. La question de relance pour vérifier sa compréhension.
- Reste toujours mesuré, courtois, précis techniquement et stimulant.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTEUR D'ÉVALUATION ET D'ANALYSE LOCAL (HAUTE DISPONIBILITÉ / OFFLINE)
// ─────────────────────────────────────────────────────────────────────────────

/** Analyse locale experte d'un TP pour produire un rapport structuré */
export function analyzeTPLocally(content: string, domain: AgentDomain = "general", labTitle?: string): TPGradeResult {
  const text = content.toLowerCase();
  const wordCount = content.trim().split(/\s+/).length;

  let score = 10; // Base médiane
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const remediation: string[] = [];
  const standards: TPGradeResult["standardsCompliance"] = [];

  // Critère 1 : Longueur et profondeur d'analyse
  if (wordCount < 25) {
    score -= 3;
    weaknesses.push("Description très succincte : manque de justification technique et de contexte opérationnel.");
  } else if (wordCount >= 60) {
    score += 2;
    strengths.push("Compte-rendu détaillé démontrant une démarche d'investigation structurée.");
  }

  // Critère 2 : Commandes et outils spécifiques identifiés
  const toolMatches: string[] = [];
  const tools = [
    { name: "nmap", cat: "Scanner réseau", points: 1.5 },
    { name: "wireshark", cat: "Analyseur de trames", points: 1.5 },
    { name: "tcpdump", cat: "Capture paquet", points: 1.5 },
    { name: "curl", cat: "Requêtes HTTP", points: 1 },
    { name: "burp", cat: "Proxy d'interception", points: 2 },
    { name: "sqlmap", cat: "Test d'injection", points: 1.5 },
    { name: "gobuster", cat: "Fuzzing de répertoires", points: 1.5 },
    { name: "hydra", cat: "Audit d'authentification", points: 1.5 },
    { name: "chmod", cat: "Gestion des permissions", points: 1 },
    { name: "chown", cat: "Attribution de propriété", points: 1 },
    { name: "iptables", cat: "Filtrage pare-feu", points: 2 },
    { name: "dig", cat: "Résolution DNS", points: 1 },
    { name: "traceroute", cat: "Diagnostic de routage", points: 1 },
    { name: "grep", cat: "Filtrage de logs", points: 1 },
    { name: "netcat", cat: "Connexion socket", points: 1.5 },
    { name: "john", cat: "Audit de hachage", points: 1.5 },
  ];

  for (const t of tools) {
    if (text.includes(t.name)) {
      toolMatches.push(t.name);
      score += Math.min(2, t.points * 0.5);
    }
  }

  if (toolMatches.length > 0) {
    strengths.push(`Utilisation appropriée de l'outillage cyber standard : ${toolMatches.slice(0, 4).join(", ")}.`);
  } else {
    weaknesses.push("Aucune commande ou outil spécialisé n'est explicitement mentionné dans la démarche.");
    remediation.push("Documente systématiquement les commandes exactes avec leurs arguments (ex: `nmap -sV -sC -p- <cible>`).");
  }

  // Critère 3 : Méthodologie et rigueur
  const hasIp = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/.test(content);
  if (hasIp) {
    score += 1.5;
    strengths.push("Précision des cibles d'adressage IP et des flux réseau tracés.");
  }

  const hasMitigation = /sécuris|correct|patch|paramétr|chiffr|hash|bcrypt|firewall|filtr|recommand|remédiat|mitig|droits/i.test(content);
  if (hasMitigation) {
    score += 2;
    strengths.push("Prise en compte de la sécurité défensive et des mesures de remédiation.");
  } else {
    score -= 1.5;
    weaknesses.push("Focalisation sur l'exploitation sans détailler la contre-mesure défensive pour l'administrateur.");
    remediation.push("Chaque vulnérabilité identifiée doit obligatoirement être accompagnée de sa solution de colmatage (patch, durcissement).");
  }

  // Standards compliance
  standards.push({
    standard: "Guide d'hygiène ANSSI - Moindre privilège",
    status: /sudo|chmod 777|root/i.test(content) && !/moindre privilège|restreint|750/i.test(content) ? "partiel" : "conforme",
    notes: "Veiller à ne jamais attribuer de permissions excessives (éviter les `chmod 777`).",
  });

  standards.push({
    standard: "OWASP Top 10 - Traitement des entrées",
    status: /injection|xss|sql|payload|formulaire/i.test(content) ? "conforme" : "partiel",
    notes: "Validation stricte en liste blanche et requêtes préparées systématiques.",
  });

  // Clamp score
  score = Math.max(8, Math.min(19.5, Math.round(score * 2) / 2));
  const percentage = Math.round((score / 20) * 100);

  let gradeLabel = "Acceptable - En cours d'acquisition";
  if (score >= 17) gradeLabel = "Excellent - Rigueur Professionnelle";
  else if (score >= 14) gradeLabel = "Bien - Compétences Solides";
  else if (score >= 11) gradeLabel = "Satisfaisant - Des axes à consolider";

  if (remediation.length === 0) {
    remediation.push("Ajoute des captures ou hashes SHA-256 comme preuve d'intégrité de ton livrable.");
    remediation.push("Formalise une section 'Impact Métier' pour expliquer le risque au responsable de la sécurité.");
  }

  return {
    score,
    percentage,
    gradeLabel,
    summary: `Le rapport analysé${labTitle ? ` pour le lab "${labTitle}"` : ""} démontre ${score >= 14 ? "une très bonne compréhension technique des mécanismes étudiés" : "les bases du sujet mais nécessite davantage de rigueur méthodologique"}.`,
    strengths,
    weaknesses: weaknesses.length > 0 ? weaknesses : ["Pense à standardiser la mise en forme de tes comptes-rendus avec un tableau récapitulatif des risques."],
    standardsCompliance: standards,
    remediationSteps: remediation,
    pingoAdvice:
      score >= 14
        ? "Excellent travail ! Continue de documenter chaque action avec précision horodatée. Tu approches du niveau d'un auditeur junior qualifié."
        : "Ne te décourage pas : en cybersécurité, la rigueur d'observation compte autant que l'outil. Relis la documentation associée et reprends point par point.",
  };
}

/** Analyse locale experte de logs d'incidents */
export function analyzeLogsLocally(rawLogs: string): LogAnalysisResult {
  const lines = rawLogs.trim().split("\n");
  const iocs: LogAnalysisResult["iocs"] = [];
  const timeline: LogAnalysisResult["timeline"] = [];
  const recommendations: LogAnalysisResult["recommendations"] = [];
  const detectionRules: LogAnalysisResult["detectionRules"] = [];

  let attackType = "Trafic réseau suspect / Activité anormale";
  let severity: LogAnalysisResult["severity"] = "Moyen";
  let confidenceScore = 75;

  // Extraction d'adresses IP uniques
  const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
  const foundIps = Array.from(new Set(rawLogs.match(ipRegex) || []));
  foundIps.slice(0, 3).forEach((ip) => {
    iocs.push({ type: "ip", value: ip, description: "Adresse IP source impliquée dans la séquence d'événements" });
  });

  // Détections spécifiques
  const lower = rawLogs.toLowerCase();

  if (lower.includes("failed password") || lower.includes("authentication failure") || lower.includes("invalid user")) {
    attackType = "Attaque par force brute SSH / Énumération de comptes (T1110)";
    severity = "Élevé";
    confidenceScore = 95;
    recommendations.push("Activer l'authentification par clé SSH uniquement et désactiver 'PasswordAuthentication'.");
    recommendations.push("Déployer et configurer Fail2ban avec un seuil de bannissement à 3 tentatives.");
    recommendations.push("Changer le port d'écoute SSH par défaut ou restreindre l'accès par VPN/Bastion.");
    detectionRules.push({
      type: "iptables",
      rule: foundIps[0] ? `iptables -I INPUT -s ${foundIps[0]} -p tcp --dport 22 -j DROP` : "iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set",
    });
  } else if (lower.includes("union select") || lower.includes("or 1=1") || lower.includes("information_schema") || lower.includes("sleep(")) {
    attackType = "Injection SQL (SQLi) - Tentative d'exfiltration de base de données (T1190)";
    severity = "Critique";
    confidenceScore = 98;
    iocs.push({ type: "payload", value: "UNION SELECT / OR 1=1", description: "Charge utile d'injection SQL dans les paramètres HTTP" });
    recommendations.push("Migrer immédiatement vers des requêtes préparées (Prepared Statements / ORM).");
    recommendations.push("Mettre en place un WAF (Web Application Firewall) type ModSecurity / Coraza.");
    recommendations.push("Restreindre les privilèges du compte SQL de l'application (pas de DROP ni d'accès à mysql.user).");
    detectionRules.push({
      type: "snort",
      rule: 'alert tcp any any -> any 80 (msg:"SQL Injection Attempt"; content:"UNION"; nocase; sid:1000001; rev:1;)',
    });
  } else if (lower.includes("<script") || lower.includes("onerror=") || lower.includes("javascript:") || lower.includes("alert(")) {
    attackType = "Cross-Site Scripting (XSS) - Injection de script client (T1059.007)";
    severity = "Élevé";
    confidenceScore = 92;
    iocs.push({ type: "payload", value: "<script> / onerror=", description: "Vecteur d'exécution de script arbitraire côté navigateur" });
    recommendations.push("Encoder toutes les sorties HTML avant affichage (HTML Entity Encoding).");
    recommendations.push("Configurer des en-têtes HTTP de sécurité stricts, notamment Content-Security-Policy (CSP).");
    recommendations.push("Placer le drapeau HttpOnly sur tous les cookies de session sensibles.");
  } else if (lower.includes("../") || lower.includes("..\\") || lower.includes("/etc/passwd") || lower.includes("win.ini")) {
    attackType = "Traversée de répertoires (Path Traversal / LFI) (T1083)";
    severity = "Critique";
    confidenceScore = 95;
    iocs.push({ type: "path", value: "/etc/passwd ou ../", description: "Tentative d'accès aux fichiers système sous-jacents" });
    recommendations.push("Valider les noms de fichiers contre une liste blanche stricte de motifs autorisés.");
    recommendations.push("Utiliser des fonctions sécurisées de canonisation des chemins (ex: realpath) et un chroot.");
  } else {
    recommendations.push("Isoler l'adresse IP source sur les équipements de filtrage périmétrique.");
    recommendations.push("Consulter les logs applicatifs corrélés sur la fenêtre temporelle +/- 15 minutes.");
    recommendations.push("Vérifier si un compte de service a été altéré ou utilisé de manière inhabituelle.");
  }

  // Timeline
  lines.slice(0, 4).forEach((line, index) => {
    timeline.push({
      step: index + 1,
      event: line.length > 90 ? `${line.slice(0, 87)}…` : line,
      isAnomaly: index >= 1,
    });
  });

  return {
    attackType,
    severity,
    confidenceScore,
    summary: `Analyse complétée sur ${lines.length} lignes de journaux. Vecteur principal identifié : ${attackType}.`,
    iocs,
    timeline,
    detectionRules,
    recommendations,
  };
}

/** Générateur de défis flash cybersécurité locaux */
export function generateQuizFlashLocally(domain: AgentDomain = "general", difficulty: "debutant" | "intermediaire" | "avance" = "intermediaire"): QuizFlashResult {
  const bank: Record<AgentDomain, QuizFlashResult[]> = {
    web: [
      {
        title: "Contournement d'authentification et injection",
        domain: "web",
        difficulty: "intermediaire",
        scenario: "Lors d'un audit de sécurité sur une boutique en ligne, tu observes que la requête de connexion envoie : `POST /api/login` avec `username=admin'-- &password=xxx`. La réponse du serveur renvoie un code HTTP 200 avec un token JWT administrateur.",
        question: "Quelle vulnérabilité critique est présente et quelle est la remédiation la plus robuste ?",
        options: [
          { id: "a", text: "Cross-Site Scripting (XSS) stocké ; il faut échapper les caractères `<` et `>`.", isCorrect: false },
          { id: "b", text: "Injection SQL d'authentification ; il faut employer des requêtes paramétrées (Prepared Statements).", isCorrect: true },
          { id: "c", text: "Défaut de chiffrement TLS ; il faut installer un certificat HTTPS Let's Encrypt.", isCorrect: false },
          { id: "d", text: "CSRF ; il faut ajouter un en-tête SameSite=Strict sur le cookie.", isCorrect: false },
        ],
        explanation: "La charge `'--` commente le reste de la clause WHERE dans la requête SQL (`WHERE user='admin'-- AND pass=...`), ce qui valide la connexion sans vérifier le mot de passe. La seule défense infaillible est la séparation stricte du code et des données grâce aux requêtes préparées.",
        keyTakeaway: "Ne jamais concaténer de données utilisateur dans une requête SQL : toujours utiliser des requêtes préparées.",
      },
    ],
    linux: [
      {
        title: "Droits SUID et élévation de privilèges",
        domain: "linux",
        difficulty: "intermediaire",
        scenario: "En explorant un serveur Linux cible lors d'un test d'intrusion, la commande `find / -perm -4000 -type f 2>/dev/null` révèle la présence du binaire `/usr/bin/find` avec le bit SUID actif appartenant à root.",
        question: "Comment un auditeur éthique peut-il démontrer l'élévation de privilèges via ce binaire ?",
        options: [
          { id: "a", text: "En exécutant `/usr/bin/find . -exec /bin/sh -p \\; -quit`.", isCorrect: true },
          { id: "b", text: "En modifiant `/etc/shadow` avec la commande `cat`.", isCorrect: false },
          { id: "c", text: "En envoyant un paquet SYN sur le port 22 pour recharger sshd.", isCorrect: false },
          { id: "d", text: "Le bit SUID sur `find` ne présente aucun risque de sécurité.", isCorrect: false },
        ],
        explanation: "Le paramètre `-exec` de `find` permet d'exécuter une commande système arbitraire. Si le binaire possède le bit SUID de root, le shell invoqué avec `-p` hérite des privilèges effectifs de root (EUID=0), permettant une prise de contrôle totale.",
        keyTakeaway: "Auditer régulièrement les binaires SUID avec `find / -perm /4000` et retirer les droits superutilisateur des outils disposant d'interpréteurs de commandes.",
      },
    ],
    reseau: [
      {
        title: "Poisoning ARP et écoute clandestine",
        domain: "reseau",
        difficulty: "debutant",
        scenario: "Sur un réseau d'entreprise commuté (switché), une station non autorisée émet continuellement des paquets ARP non sollicités associant l'adresse IP de la passerelle par défaut (192.168.1.1) à sa propre adresse MAC.",
        question: "Quelle est la nature exacte de cette attaque et comment s'en prémunir ?",
        options: [
          { id: "a", text: "Une attaque DoS SYN Flood ; il faut augmenter la taille de la table SYN.", isCorrect: false },
          { id: "b", text: "Un ARP Spoofing / Man-In-The-Middle ; il faut activer Dynamic ARP Inspection (DAI) et DHCP Snooping sur les commutateurs.", isCorrect: true },
          { id: "c", text: "Un piratage du protocole BGP ; il faut signer les annonces avec RPKI.", isCorrect: false },
          { id: "d", text: "Une amplification DNS ; il faut bloquer le port UDP 53.", isCorrect: false },
        ],
        explanation: "L'ARP spoofing corrompt le cache ARP des hôtes du sous-réseau pour détourner le trafic via la machine attaquante. La protection réseau standard au niveau des commutateurs manageables (Cisco, Aruba) repose sur le Dynamic ARP Inspection (DAI) couplé au DHCP Snooping.",
        keyTakeaway: "Le protocole ARP n'est pas authentifié par conception : les switches d'infrastructure doivent contrôler la validité des annonces ARP.",
      },
    ],
    pentest: [
      {
        title: "Reconnaissance passive et empreinte de service",
        domain: "pentest",
        difficulty: "avance",
        scenario: "Dans le cadre d'un test d'intrusion autorisé avec lettre de mission, tu dois cartographier les services exposés d'un serveur sans déclencher d'alarmes bruyantes sur l'IDS.",
        question: "Quelle combinaison d'options Nmap est la plus appropriée pour un scan SYN furtif et précis ?",
        options: [
          { id: "a", text: "nmap -sS -sV --top-ports 1000 -T2 -Pn <cible>", isCorrect: true },
          { id: "b", text: "nmap -A -T5 -p- <cible>", isCorrect: false },
          { id: "c", text: "nmap -sU -T4 --script=all <cible>", isCorrect: false },
          { id: "d", text: "ping -f <cible>", isCorrect: false },
        ],
        explanation: "L'option `-sS` réalise un TCP SYN Stealth scan (la poignée de main TCP n'est pas achevée, ce qui évite d'ouvrir une session complète). Le timing `-T2` (polite) espace les paquets pour éviter les seuils de déclenchement des IDS.",
        keyTakeaway: "Un bon auditeur adapte toujours l'empreinte et le tempo de ses scans à la politique et aux contraintes du client.",
      },
    ],
    crypto: [
      {
        title: "Stockage sécurisé des mots de passe",
        domain: "crypto",
        difficulty: "debutant",
        scenario: "Une startup développe sa plateforme web et souhaite stocker les mots de passe de ses 50 000 utilisateurs dans sa base de données PostgreSQL.",
        question: "Quelle méthode de hachage respecte les recommandations actuelles de l'ANSSI et de l'OWASP ?",
        options: [
          { id: "a", text: "MD5 avec un sel fixe codé en dur dans le code source.", isCorrect: false },
          { id: "b", text: "SHA-256 simple sans sel pour garantir l'unicité.", isCorrect: false },
          { id: "c", text: "Argon2id ou bcrypt avec un facteur de travail adapté et un sel unique par utilisateur.", isCorrect: true },
          { id: "d", text: "Chiffrement symétrique AES-256 avec la clé stockée dans le fichier .env.", isCorrect: false },
        ],
        explanation: "MD5 et SHA-256 sont conçus pour être rapides et sont vulnérables aux attaques par force brute sur GPU. Les fonctions modernes de dérivation de clé (Argon2id, bcrypt, PBKDF2) sont volontairement lentes et coûteuses en mémoire, avec un sel aléatoire par utilisateur.",
        keyTakeaway: "Ne jamais inventer sa propre cryptographie : utiliser Argon2id ou bcrypt pour tous les mots de passe.",
      },
    ],
    soc: [
      {
        title: "Détection d'une persistance Windows par tâche planifiée",
        domain: "soc",
        difficulty: "avance",
        scenario: "En surveillant la console SIEM d'un SOC, tu détectes un événement Windows Security Event ID 4698 : 'A scheduled task was created', initié par le processus `powershell.exe` avec un compte utilisateur standard.",
        question: "Quel ID d'événement et quelle phase de la matrice MITRE ATT&CK cela caractérise-t-il prioritairement ?",
        options: [
          { id: "a", text: "Phase de Reconnaissance (TA0043) / Event 4624.", isCorrect: false },
          { id: "b", text: "Phase de Persistance (TA0003) - Scheduled Task/Job (T1053.005) / Event 4698.", isCorrect: true },
          { id: "c", text: "Phase d'Exfiltration (TA0010) / Event 5140.", isCorrect: false },
          { id: "d", text: "C'est un comportement système normal sans intérêt pour le SOC.", isCorrect: false },
        ],
        explanation: "La création d'une tâche planifiée (Event 4698) par un exécutable de script comme PowerShell est une technique classique de persistance (T1053.005 dans MITRE ATT&CK) utilisée par les attaquants pour survivre aux redémarrages.",
        keyTakeaway: "La création de tâches planifiées hors des fenêtres de déploiement d'administration doit systématiquement déclencher une alerte SOC de niveau 1.",
      },
    ],
    general: [
      {
        title: "Modèle de Défense en Profondeur",
        domain: "general",
        difficulty: "debutant",
        scenario: "Une entreprise protège son infrastructure uniquement par un pare-feu périmétrique puissant, mais ne segmente pas ses réseaux internes et autorise tous les protocoles entre les postes de travail.",
        question: "Quel principe architectural essentiel est violé dans cette configuration ?",
        options: [
          { id: "a", text: "Le modèle d'intégrité de Biba.", isCorrect: false },
          { id: "b", text: "La Défense en Profondeur (Defense in Depth) et le Zero Trust.", isCorrect: true },
          { id: "c", text: "Le protocole de chiffrement TLS 1.3.", isCorrect: false },
          { id: "d", text: "La redondance matérielle RAID 5.", isCorrect: false },
        ],
        explanation: "Le modèle du 'château fort' (périmètre dur, intérieur mou) est obsolète. Dès qu'un attaquant compromet un poste (par phishing par exemple), il peut se déplacer latéralement sans entrave si la segmentation interne et le Zero Trust ne sont pas appliqués.",
        keyTakeaway: "La sécurité ne doit jamais reposer sur une seule ligne de défense : multiplier les couches de contrôle indépendantes.",
      },
    ],
  };

  const domainBank = bank[domain] || bank.general;
  return domainBank[Math.floor(Math.random() * domainBank.length)];
}
