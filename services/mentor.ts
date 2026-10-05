import { MentorMessage } from "@/types";
import {
  analyzeTPLocally,
  analyzeLogsLocally,
  generateQuizFlashLocally,
  type AgentMode,
  type AgentDomain,
  type TPGradeResult,
  type LogAnalysisResult,
  type QuizFlashResult,
} from "@/lib/ai-agent/engine";

export interface AgentCallOptions {
  mode?: AgentMode;
  domain?: AgentDomain;
  context?: string;
}

export interface MentorResponse extends MentorMessage {
  remaining?: number;
  limit?: number;
  rateLimited?: boolean;
  tpData?: TPGradeResult;
  logData?: LogAnalysisResult;
  quizData?: QuizFlashResult;
}
const knowledgeBase: { keywords: string[]; response: string }[] = [
  {
    keywords: ["dns", "domain name"],
    response:
      "Le DNS traduit les noms de domaine en adresses IP. Une attaque DNS spoofing peut rediriger tes requêtes vers un serveur malveillant. Essaie `dig cyberpingo.com +short` pour voir la résolution en action.",
  },
  {
    keywords: ["port", "nmap", "scan"],
    response:
      "Les ports identifient des services : 22→SSH, 80→HTTP, 443→HTTPS, 3306→MySQL. `nmap -sV <IP>` découvre les ports ouverts. Un port inattendu est souvent signe d'intrusion.",
  },
  {
    keywords: ["linux", "terminal", "shell", "bash"],
    response:
      "Linux est indispensable en cybersécurité. Commence par `ls`, `cd`, `cat`, `grep`, `chmod`, `find`. Le module Linux de Cyberpingo t'accompagne étape par étape.",
  },
  {
    keywords: ["permission", "chmod", "chown", "suid"],
    response:
      "Les permissions Linux : rwxrwxrwx (propriétaire, groupe, autres). `chmod 750 fichier` → rwxr-x---. Les fichiers SUID s'exécutent avec les droits du propriétaire — vecteur classique d'élévation de privilèges.",
  },
  {
    keywords: ["phishing", "hameçonnage", "spear phishing"],
    response:
      "Le phishing imite une entité de confiance par email. Indices : expéditeur douteux, URL suspecte, urgence artificielle. Le spear phishing cible précisément une personne avec des infos personnelles.",
  },
  {
    keywords: ["sql", "injection", "sqli"],
    response:
      "L'injection SQL exploite des formulaires non filtrés. La charge `' OR '1'='1` peut contourner une auth vulnérable. Défense : requêtes paramétrées (prepared statements).",
  },
  {
    keywords: ["xss", "cross-site scripting"],
    response:
      "Le XSS injecte du JavaScript malveillant dans une page web. Défense : encoder les sorties HTML et utiliser une Content Security Policy (CSP).",
  },
  {
    keywords: ["owasp", "top 10"],
    response:
      "L'OWASP Top 10 : injection, auth défaillante, exposition de données, XXE, mauvais contrôle d'accès, mauvaise config, XSS, désérialisation non sécurisée, composants vulnérables, logging insuffisant.",
  },
  {
    keywords: ["chiffrement", "cryptographie", "aes", "rsa", "hash"],
    response:
      "AES = chiffrement symétrique, RSA = asymétrique. Le hachage (bcrypt, SHA-256) est unidirectionnel. Ne jamais stocker des mots de passe en clair — utilise toujours bcrypt ou Argon2.",
  },
  {
    keywords: ["césar", "rot13", "chiffre de césar"],
    response:
      "Le chiffrement de César décale chaque lettre. ROT13 = décalage de 13. Pour décoder un décalage N : applique (26-N). En Python : `''.join(chr((ord(c)-65+13)%26+65) if c.isupper() else c for c in message)`.",
  },
  {
    keywords: ["vpn", "réseau privé", "tunnel"],
    response:
      "Un VPN chiffre ton trafic et masque ton IP. Protocoles courants : OpenVPN, WireGuard, IPSec. Utilisé pour l'accès distant sécurisé en entreprise et l'anonymisation lors d'audits.",
  },
  {
    keywords: ["pare-feu", "firewall", "iptables"],
    response:
      "Un pare-feu filtre le trafic réseau. `iptables -L` liste les règles sous Linux. Règle fondamentale : tout bloquer par défaut, n'ouvrir que les ports nécessaires.",
  },
  {
    keywords: ["wireshark", "tcpdump", "capture réseau", "sniffing"],
    response:
      "Wireshark et tcpdump capturent les paquets réseau. Filtre utile : `http.request.method == \"POST\"`. N'utilise ces outils que sur des réseaux que tu es autorisé à analyser.",
  },
  {
    keywords: ["osint", "reconnaissance", "recon"],
    response:
      "L'OSINT collecte des informations publiques. Outils : Shodan, theHarvester, Maltego, Google Dorks (`site:example.com filetype:pdf`). Toujours dans un cadre légal et éthique.",
  },
  {
    keywords: ["cve", "vulnérabilité", "patch", "mise à jour"],
    response:
      "Un CVE identifie une vulnérabilité connue. Le score CVSS mesure sa sévérité de 0 à 10. La majorité des attaques exploitent des failles patchées — mets toujours tes systèmes à jour.",
  },
  {
    keywords: ["mot de passe", "password", "2fa", "mfa"],
    response:
      "Mot de passe fort : 12+ caractères, unique par service, gestionnaire (Bitwarden). Active le MFA partout — même si ton mot de passe est volé, l'attaquant est bloqué.",
  },
  {
    keywords: ["ransomware", "rançongiciel"],
    response:
      "Un ransomware chiffre tes fichiers et demande une rançon. Défenses : sauvegardes offline (règle 3-2-1), mises à jour, segmentation réseau. Ne jamais payer la rançon.",
  },
  {
    keywords: ["pentest", "test d'intrusion", "ethical hacking"],
    response:
      "Un pentest est une attaque simulée et autorisée. Méthodologie : Reconnaissance → Scan → Exploitation → Post-exploitation → Reporting. Outils : Metasploit, Burp Suite, Nmap, Kali Linux.",
  },
  {
    keywords: ["prochaine étape", "que faire", "recommandation", "roadmap"],
    response:
      "Parcours recommandé : Fondamentaux → Réseaux → Linux → Sécurité Web → Pentest. Fais les challenges en parallèle — ça ancre vraiment les connaissances.",
  },
  {
    keywords: ["erreur", "problème", "ne fonctionne pas"],
    response:
      "Pour t'aider, dis-moi : 1) quelle action tu faisais, 2) le message d'erreur exact, 3) le système utilisé. La plupart des erreurs viennent de permissions, d'un service arrêté, ou d'une mauvaise config réseau.",
  },
];

const defaultFallback =
  "Bonne question ! Pour une réponse précise, précise le sujet (DNS, Linux, permissions, phishing, SQL injection…). Je suis là pour t'accompagner sur tous les aspects de la cybersécurité. 🛡️";

function localFallback(message: string): string {
  const normalized = message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  let bestMatch: { response: string } | null = null;
  let bestScore = 0;

  for (const entry of knowledgeBase) {
    const score = entry.keywords.reduce((acc, kw) => {
      const nkw = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return normalized.includes(nkw) ? acc + 1 : acc;
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch ? bestMatch.response : defaultFallback;
}

/**
 * Envoie un message au Mentor IA via l'API Route Next.js (/api/mentor),
 * qui appelle Gemini côté serveur. L'historique de conversation est transmis
 * pour que Gemini garde le contexte. Si l'appel échoue, utilise la base
 * de connaissances locale comme fallback.
 */
export interface MentorResponse extends MentorMessage { remaining?: number; limit?: number; rateLimited?: boolean }

export async function sendMessageToMentor(
  message: string,
  history: { role: "user" | "mentor"; content: string }[] = [],
  options?: AgentCallOptions
): Promise<MentorResponse> {
  let content: string;
  let remaining: number | undefined;
  let limit: number | undefined;
  let rateLimited = false;
  let tpData: TPGradeResult | undefined;
  let logData: LogAnalysisResult | undefined;
  let quizData: QuizFlashResult | undefined;

  const mode = options?.mode ?? "mentor";
  const domain = options?.domain ?? "general";
  const context = options?.context;

  try {
    const res = await fetch("/api/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, mode, domain, context }),
    });

    const data = await res.json().catch(() => ({}));
    if (typeof data.remaining === "number") remaining = data.remaining;
    if (typeof data.limit === "number") limit = data.limit;
    if (data.tpData) tpData = data.tpData;
    if (data.logData) logData = data.logData;
    if (data.quizData) quizData = data.quizData;

    if (res.status === 429 || res.status === 401 || res.status === 400) {
      rateLimited = res.status === 429;
      if (mode === "tp_grader") {
        tpData = analyzeTPLocally(message, domain, context);
        content = typeof data.error === "string" ? `${data.error}\n\n${formatTPAsMarkdown(tpData)}` : formatTPAsMarkdown(tpData);
      } else if (mode === "log_analyzer") {
        logData = analyzeLogsLocally(message);
        content = typeof data.error === "string" ? `${data.error}\n\n${formatLogsAsMarkdown(logData)}` : formatLogsAsMarkdown(logData);
      } else if (mode === "quiz_gen") {
        quizData = generateQuizFlashLocally(domain);
        content = formatQuizAsMarkdown(quizData);
      } else {
        content = typeof data.error === "string" ? data.error : localFallback(message);
      }
    } else if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    } else {
      content = data.content ?? localFallback(message);
    }
  } catch {
    // Fallback intelligent sur le moteur local selon le mode
    if (mode === "tp_grader") {
      tpData = analyzeTPLocally(message, domain, context);
      content = formatTPAsMarkdown(tpData);
    } else if (mode === "log_analyzer") {
      logData = analyzeLogsLocally(message);
      content = formatLogsAsMarkdown(logData);
    } else if (mode === "quiz_gen") {
      quizData = generateQuizFlashLocally(domain);
      content = formatQuizAsMarkdown(quizData);
    } else {
      content = localFallback(message);
    }
  }

  return {
    id: `m-${Date.now()}`,
    role: "mentor",
    content,
    createdAt: new Date().toISOString(),
    remaining,
    limit,
    rateLimited,
    tpData,
    logData,
    quizData,
  };
}

function formatTPAsMarkdown(tp: TPGradeResult): string {
  return `### 📊 Évaluation Globale : **${tp.score}/20** (${tp.gradeLabel})
${tp.summary}

### ✅ Points Forts & Notions Maîtrisées
${tp.strengths.map((s) => `- ${s}`).join("\n")}

### ⚠️ Axes d'Amélioration & Faiblesses
${tp.weaknesses.map((w) => `- ${w}`).join("\n")}

### 🛡️ Conformité aux Référentiels (ANSSI / OWASP)
${tp.standardsCompliance.map((sc) => `- **${sc.standard}** [${sc.status.toUpperCase()}] : ${sc.notes}`).join("\n")}

### 🎯 Recommandations Pas-à-Pas
${tp.remediationSteps.map((r) => `1. ${r}`).join("\n")}

> 💬 **Conseil du Professeur Pingo** : ${tp.pingoAdvice}`;
}

function formatLogsAsMarkdown(l: LogAnalysisResult): string {
  return `### 🚨 Menace Détectée : **${l.attackType}** (Criticité : **${l.severity.toUpperCase()}**)
${l.summary}

### 🔍 Indicateurs de Compromission (IOCs)
${l.iocs.map((ioc) => `- **[${ioc.type.toUpperCase()}]** \`${ioc.value}\` : ${ioc.description}`).join("\n")}

### ⏱️ Déroulé Chronologique
${l.timeline.map((t) => `${t.step}. ${t.isAnomaly ? "⚠️" : "ℹ️"} ${t.event}`).join("\n")}

### 🛡️ Règle de Contre-Mesure
\`\`\`${l.detectionRules[0]?.type || "bash"}
${l.detectionRules[0]?.rule || "# Aucune règle générée"}
\`\`\`

### 💡 Recommandations SOC
${l.recommendations.map((r) => `- ${r}`).join("\n")}`;
}

function formatQuizAsMarkdown(q: QuizFlashResult): string {
  return `### ⚡ Défi Flash : ${q.title} (${q.difficulty.toUpperCase()})

**Mise en situation :**
${q.scenario}

**Question :**
**${q.question}**

${q.options.map((opt) => `- **${opt.id.toUpperCase()}**) ${opt.text}`).join("\n")}`;
}

export async function gradeTPWithAgent(submission: string, labTitle?: string, domain?: AgentDomain): Promise<MentorResponse> {
  return sendMessageToMentor(submission, [], { mode: "tp_grader", domain, context: labTitle });
}

export async function analyzeLogsWithAgent(rawLogs: string): Promise<MentorResponse> {
  return sendMessageToMentor(rawLogs, [], { mode: "log_analyzer", domain: "soc" });
}

export async function generateQuizWithAgent(domain: AgentDomain = "general"): Promise<MentorResponse> {
  return sendMessageToMentor("Génère un défi flash", [], { mode: "quiz_gen", domain });
}

