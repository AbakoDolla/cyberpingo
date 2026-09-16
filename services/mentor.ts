import { MentorMessage } from "@/types";

/**
 * Base de connaissances locale — utilisée comme fallback si l'API Gemini
 * est indisponible ou si la clé n'est pas configurée.
 */
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
export async function sendMessageToMentor(
  message: string,
  history: { role: "user" | "mentor"; content: string }[] = []
): Promise<MentorMessage> {
  let content: string;

  try {
    const res = await fetch("/api/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    content = data.content ?? localFallback(message);
  } catch {
    // Fallback sur la base locale si l'API est indisponible
    content = localFallback(message);
  }

  return {
    id: `m-${Date.now()}`,
    role: "mentor",
    content,
    createdAt: new Date().toISOString(),
  };
}
