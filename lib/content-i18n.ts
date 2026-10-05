import type { Language } from "./i18n";
import type { CourseDetail, CourseSummary, Lab, LabCategory, SkillLevel } from "@/types/api";

export interface CourseTranslation {
  title: string;
  short_description: string;
  description: string;
  category: string;
  modules?: Record<string, { title: string; description: string }>;
  lessons?: Record<string, { title: string; summary: string }>;
}

export interface LabTranslation {
  title: string;
  description: string;
  objectives?: string[];
  flag_placeholder?: string;
}

export const COURSE_TRANSLATIONS: Record<string, CourseTranslation> = {
  fondamentaux: {
    title: "Cybersecurity Foundations",
    short_description: "The essential foundations before diving into computer security.",
    description: "What cybersecurity protects, the major families of threats, and the defenders guarding our systems. The ideal starting point with zero prerequisites.",
    category: "Foundations",
    modules: {
      "Comprendre la cybersécurité": {
        title: "Understanding Cybersecurity",
        description: "What we protect, and what we protect against.",
      },
      "L’écosystème de la sécurité": {
        title: "The Security Ecosystem",
        description: "Who defends, who attacks, and with what reflexes.",
      },
    },
    lessons: {
      "Qu'est-ce que la cybersécurité ?": {
        title: "What is Cybersecurity?",
        summary: "Cybersecurity refers to the practices, technologies, and processes designed to protect computer systems, networks, and data from attacks, damage, or unauthorized access.",
      },
      "Les types de menaces informatiques": {
        title: "Types of Cyber Threats",
        summary: "Cyber threats are categorized into malware, phishing, denial-of-service (DoS/DDoS) attacks, social engineering, and software vulnerability exploitation.",
      },
      "Les acteurs de la cybersécurité": {
        title: "Cybersecurity Stakeholders",
        summary: "Several key profiles in the security ecosystem: attackers (black hats), defenders (blue team), offensive auditors (red team / pentesters), and researchers (white hats).",
      },
    },
  },
  reseaux: {
    title: "Computer Networks",
    short_description: "Understand data in transit to spot anomalies and defend systems.",
    description: "DNS, ports, protocols, and the OSI model: understand how data flows to spot anomalies and better protect infrastructure.",
    category: "Networking",
    modules: {
      "Les services du réseau": {
        title: "Network Services",
        description: "DNS, ports, and protocols: what really traverses the wire.",
      },
      "Les couches du réseau": {
        title: "Network Layers",
        description: "Inspecting network communications layer by layer.",
      },
    },
    lessons: {
      "Comprendre le fonctionnement du DNS": {
        title: "Understanding How DNS Works",
        summary: "DNS (Domain Name System) translates human-readable domain names like cyberpingo.com into machine-readable IP addresses.",
      },
      "Les ports et protocoles réseau": {
        title: "Network Ports and Protocols",
        summary: "A network port identifies a specific service on a host, such as port 443 for HTTPS or port 22 for SSH.",
      },
      "Le modèle OSI en pratique": {
        title: "The OSI Model in Practice",
        summary: "The OSI model breaks down network communications into 7 layers, each with specific roles and protocol boundaries.",
      },
    },
  },
  linux: {
    title: "Linux Administration",
    short_description: "Terminal commands, filesystem navigation, and essential permissions.",
    description: "The shell terminal, directory hierarchy, and permissions: daily essential Linux skills for analysts and system administrators.",
    category: "Linux",
    modules: {
      "Prendre en main Linux": {
        title: "Getting Started with Linux",
        description: "Navigating and finding files across the filesystem.",
      },
      "Droits et utilisateurs": {
        title: "Permissions and Users",
        description: "Who can read, write, and execute — and why permissions are crucial.",
      },
    },
    lessons: {
      "Naviguer dans le système de fichiers Linux": {
        title: "Navigating the Linux Filesystem",
        summary: "Linux organizes everything into a hierarchical directory tree starting from the root (/)." ,
      },
      "Permissions et gestion des utilisateurs": {
        title: "Permissions and User Management",
        summary: "Linux permissions apply to owner (user), group, and others with read, write, and execute modes.",
      },
    },
  },
  "securite-web": {
    title: "Web Security",
    short_description: "HTTPS, password vaults, and phishing detection: essential web habits.",
    description: "HTTPS, password managers, MFA, and phishing detection: the daily security habits that safeguard accounts and teams.",
    category: "Web Security",
    modules: {
      "Naviguer en sécurité": {
        title: "Browsing Securely",
        description: "What HTTPS guarantees, and what it does not.",
      },
      "Protéger ses comptes": {
        title: "Protecting Your Accounts",
        description: "Passwords, MFA, and deceptive messages.",
      },
    },
    lessons: {
      "HTTPS : ce que le cadenas protège vraiment": {
        title: "HTTPS: What the Padlock Really Protects",
        summary: "HTTPS encrypts communications between your browser and the server, verifying server identity via certificates.",
      },
      "Protéger ses comptes avec un gestionnaire et la MFA": {
        title: "Securing Accounts with a Password Manager and MFA",
        summary: "Use a long and unique password for each account, protected by a vault and two-factor authentication.",
      },
      "Déjouer un message de phishing": {
        title: "Thwarting Phishing Attacks",
        summary: "A phishing message aims to provoke an urgent reaction: verify requests via trusted out-of-band channels.",
      },
    },
  },
  "pentest-intro": {
    title: "Ethical Hacking & Pentest",
    short_description: "Discover the professional methodology of ethical intrusion testing.",
    description: "Authorization, scoping, testing methodology, and debrief: the full ethical penetration testing process.",
    category: "Ethical Hacking",
    modules: {
      "Cadre et méthode": {
        title: "Framework & Methodology",
        description: "Testing legally with an authorized and reproducible approach.",
      },
      "Restitution": {
        title: "Debrief & Reporting",
        description: "Transforming vulnerabilities into actionable remediation.",
      },
    },
    lessons: {
      "Autorisation et périmètre d’un audit": {
        title: "Audit Authorization and Scoping",
        summary: "A penetration test must be strictly backed by explicit written authorization from the system owner.",
      },
      "Une méthode de test responsable": {
        title: "Responsible Testing Methodology",
        summary: "Follow structured phases: scoping, recon, vulnerability discovery, controlled verification, and debrief.",
      },
      "Rédiger une recommandation utile": {
        title: "Writing Actionable Remediation",
        summary: "An audit report must clearly explain the vulnerability, conditions, impact, and concrete remediation steps.",
      },
    },
  },
  "analyse-logs": {
    title: "SOC Log Analysis",
    short_description: "Parse log events, correlate forensic clues, and qualify triage alerts.",
    description: "Reading log files, correlating events over time, and qualifying security alerts: fundamental skills for SOC operations.",
    category: "Detection & SOC",
    modules: {
      "Lire les journaux": {
        title: "Reading Log Records",
        description: "Understanding events and identifying key forensic clues.",
      },
      "Qualifier une alerte": {
        title: "Alert Qualification & Triage",
        description: "Decide, document, and escalate security incidents.",
      },
    },
    lessons: {
      "Lire un événement dans un journal": {
        title: "Reading an Event in a Log",
        summary: "Logs record system and application events with timestamps, source, action, result, and identifiers.",
      },
      "Relier les événements sans conclure trop vite": {
        title: "Correlating Events Without Rushing to Conclusions",
        summary: "Correlation links events across time, IP, or account to validate or nuance security hypotheses.",
      },
      "Qualifier une alerte et documenter la suite": {
        title: "Qualifying Alerts and Documenting Next Steps",
        summary: "Triage evaluates alert context, scope, and impact to determine appropriate escalation.",
      },
    },
  },
};

export const LAB_TRANSLATIONS: Record<string, LabTranslation> = {
  "decouvrir-les-ports-reseau": {
    title: "Discovering Network Ports",
    description: "Analyze a simulated target machine and identify open ports using a simulated terminal.",
    objectives: [
      "Launch a port scan against the target machine",
      "Identify the service listening on port 22",
      "Submit the service name as the answer",
    ],
    flag_placeholder: "Service name on port 22",
  },
  "premiers-pas-en-osint": {
    title: "First Steps in OSINT",
    description: "Retrieve public intelligence from simulated metadata without ever targeting real persons.",
    objectives: [
      "Inspect metadata of a simulated document",
      "Identify the software used to create it",
    ],
    flag_placeholder: "Software used to author the file",
  },
  "permissions-linux": {
    title: "Understanding Linux Permissions",
    description: "Adjust file permissions on a simulated file to secure a training server.",
    objectives: [
      "List existing file permissions",
      "Revoke write permissions for other users",
    ],
    flag_placeholder: "chmod command to use",
  },
  "chiffrement-cesar": {
    title: "Cracking a Caesar Cipher",
    description: "Decode a message encrypted with a simple character shift to understand cryptography basics.",
    objectives: [
      "Determine the shift offset used",
      "Decipher the hidden plaintext message",
    ],
    flag_placeholder: "Decrypted message",
  },
  "injection-sql-basique": {
    title: "Spotting a SQL Injection",
    description: "Analyze a vulnerable simulated login form to understand the mechanics of SQL injection.",
    objectives: [
      "Identify the vulnerable input field",
      "Submit an input string that bypasses authentication",
    ],
    flag_placeholder: "Exploitation payload",
  },
  "hygiene-mots-de-passe": {
    title: "Auditing Password Hygiene",
    description: "Evaluate a list of sample passwords and identify the most vulnerable ones.",
    objectives: [
      "Spot overly short or common dictionary passwords",
    ],
    flag_placeholder: "The weakest password in the list",
  },
};

export const CATEGORY_TRANSLATIONS: Record<string, string> = {
  Fondamentaux: "Foundations",
  Réseaux: "Networking",
  Linux: "Linux",
  "Sécurité Web": "Web Security",
  Pentest: "Ethical Hacking",
  Détection: "Detection & SOC",
  reseau: "Networking",
  web: "Web Security",
  cryptographie: "Cryptography",
  osint: "OSINT",
  securite: "Security",
};

export const LEVEL_TRANSLATIONS: Record<string, string> = {
  debutant: "Beginner",
  intermediaire: "Intermediate",
  avance: "Advanced",
};

export function localizeCategory(category: string, lang: Language): string {
  if (lang !== "en") return category;
  return CATEGORY_TRANSLATIONS[category] ?? category;
}

export function localizeLevel(level: SkillLevel | string, lang: Language): string {
  if (lang !== "en") {
    switch (level) {
      case "avance": return "Avancé";
      case "intermediaire": return "Intermédiaire";
      case "debutant":
      default: return "Débutant";
    }
  }
  return LEVEL_TRANSLATIONS[level] ?? level;
}

export function localizeCourseSummary(course: CourseSummary, lang: Language): CourseSummary {
  if (lang !== "en") return course;
  const translation = COURSE_TRANSLATIONS[course.slug];
  if (!translation) return course;

  return {
    ...course,
    title: translation.title || course.title,
    short_description: translation.short_description || course.short_description,
    description: translation.description || course.description,
    category: translation.category || course.category,
  };
}

export function localizeCourseDetail(course: CourseDetail, lang: Language): CourseDetail {
  if (lang !== "en") return course;
  const translation = COURSE_TRANSLATIONS[course.slug];
  if (!translation) return course;

  const translatedModules = course.modules.map((mod) => {
    const modTrans = translation.modules?.[mod.title];
    const translatedLessons = mod.lessons.map((lesson) => {
      const lessonTrans = translation.lessons?.[lesson.title];
      return {
        ...lesson,
        title: lessonTrans?.title || lesson.title,
        summary: lessonTrans?.summary || lesson.summary,
      };
    });

    return {
      ...mod,
      title: modTrans?.title || mod.title,
      description: modTrans?.description || mod.description,
      lessons: translatedLessons,
    };
  });

  return {
    ...course,
    title: translation.title || course.title,
    short_description: translation.short_description || course.short_description,
    description: translation.description || course.description,
    category: translation.category || course.category,
    modules: translatedModules,
  };
}

export function localizeLab(lab: Lab, lang: Language): Lab {
  if (lang !== "en") return lab;
  const translation = LAB_TRANSLATIONS[lab.slug];
  if (!translation) return lab;

  return {
    ...lab,
    title: translation.title || lab.title,
    description: translation.description || lab.description,
    objectives: translation.objectives || lab.objectives,
    flag_placeholder: translation.flag_placeholder || lab.flag_placeholder,
  };
}

export function localizeLesson<T extends { title: string; summary?: string; course?: { slug?: string } }>(lesson: T, lang: Language): T {
  if (lang !== "en") return lesson;
  const courseSlug = lesson.course?.slug;
  if (!courseSlug) return lesson;
  const courseTrans = COURSE_TRANSLATIONS[courseSlug];
  if (!courseTrans || !courseTrans.lessons) return lesson;
  const lessonTrans = courseTrans.lessons[lesson.title];
  if (!lessonTrans) return lesson;
  return {
    ...lesson,
    title: lessonTrans.title || lesson.title,
    summary: lessonTrans.summary || lesson.summary,
  };
}
