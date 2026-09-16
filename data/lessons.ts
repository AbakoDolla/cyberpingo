import { Lesson } from "@/types";

export const lessons: Lesson[] = [
  // ── Cours c1 : Fondamentaux de la cybersécurité ──────────────────────────
  {
    id: "l-c1-1",
    courseId: "c1",
    title: "Qu'est-ce que la cybersécurité ?",
    order: 1,
    durationMinutes: 10,
    xpReward: 40,
    completed: false,
    blocks: [
      {
        type: "text",
        content:
          "La cybersécurité désigne l'ensemble des pratiques, technologies et processus conçus pour protéger les systèmes informatiques, les réseaux et les données contre les attaques, les dommages ou les accès non autorisés.",
      },
      {
        type: "schema",
        content:
          "Confidentialité → protéger les données privées\nIntégrité → garantir que les données ne sont pas altérées\nDisponibilité → assurer l'accès aux services quand on en a besoin",
      },
      {
        type: "text",
        content:
          "Ces trois piliers forment la triade CIA (Confidentiality, Integrity, Availability). Toute décision en sécurité informatique se réfère à l'un ou plusieurs de ces principes.",
      },
      {
        type: "example",
        content:
          "Exemple : un ransomware (rançongiciel) viole la disponibilité en chiffrant tes fichiers. Un keylogger viole la confidentialité en capturant tes frappes au clavier.",
      },
    ],
  },
  {
    id: "l-c1-2",
    courseId: "c1",
    title: "Les types de menaces informatiques",
    order: 2,
    durationMinutes: 12,
    xpReward: 45,
    completed: false,
    blocks: [
      {
        type: "text",
        content:
          "Les cybermenaces se classifient en plusieurs catégories : malwares, phishing, attaques par déni de service (DoS/DDoS), ingénierie sociale, et exploitation de vulnérabilités logicielles.",
      },
      {
        type: "schema",
        content:
          "Malware : virus, vers, trojans, ransomware, spyware\nPhishing : email frauduleux imitant une entité de confiance\nDDoS : saturation d'un serveur par des millions de requêtes\nIngénierie sociale : manipulation psychologique d'un utilisateur",
      },
      {
        type: "text",
        content:
          "La majorité des attaques réussies exploitent l'humain, pas la technologie. C'est pourquoi la sensibilisation est aussi importante que les outils techniques.",
      },
      {
        type: "example",
        content:
          "Exemple réel : le phishing représente plus de 80% des cyberattaques réussies en entreprise selon les rapports annuels de l'ANSSI.",
      },
    ],
  },
  {
    id: "l-c1-3",
    courseId: "c1",
    title: "Les acteurs de la cybersécurité",
    order: 3,
    durationMinutes: 10,
    xpReward: 40,
    completed: false,
    blocks: [
      {
        type: "text",
        content:
          "On distingue plusieurs profils dans l'écosystème de la cybersécurité : les attaquants (black hat), les défenseurs (blue team), les auditeurs offensifs (red team / pentesters) et les chercheurs (white hat).",
      },
      {
        type: "schema",
        content:
          "Red Team (offensif) : simule des attaques pour tester les défenses\nBlue Team (défensif) : détecte, analyse et répond aux incidents\nPurple Team : collaboration Red + Blue pour améliorer la posture globale\nSOC : Security Operations Center — surveillance 24h/24",
      },
      {
        type: "text",
        content:
          "En tant qu'apprenant Cyberpingo, tu vas progressivement maîtriser les deux côtés : comprendre les techniques d'attaque pour mieux défendre.",
      },
    ],
  },

  // ── Cours c2 : Réseaux informatiques ─────────────────────────────────────
  {
    id: "l1",
    courseId: "c2",
    title: "Comprendre le fonctionnement du DNS",
    order: 1,
    durationMinutes: 12,
    xpReward: 50,
    completed: false,
    quizId: "q1",
    blocks: [
      {
        type: "text",
        content:
          "Le DNS (Domain Name System) traduit les noms de domaine lisibles par les humains, comme cyberpingo.com, en adresses IP compréhensibles par les machines.",
      },
      {
        type: "schema",
        content:
          "Navigateur → Résolveur DNS → Serveur racine → Serveur TLD → Serveur autoritaire → Adresse IP",
      },
      {
        type: "text",
        content:
          "Chaque requête DNS suit une hiérarchie précise. Comprendre cette chaîne est essentiel pour repérer des attaques comme le DNS spoofing.",
      },
      {
        type: "code",
        language: "bash",
        content: "dig cyberpingo.com +short\n# Retourne l'adresse IP associée au domaine",
      },
      {
        type: "example",
        content:
          "Exemple concret : lorsque tu tapes une URL, ton ordinateur interroge d'abord son cache local avant de contacter un résolveur DNS.",
      },
    ],
  },
  {
    id: "l2",
    courseId: "c2",
    title: "Les ports et protocoles réseau",
    order: 2,
    durationMinutes: 15,
    xpReward: 60,
    completed: false,
    blocks: [
      {
        type: "text",
        content:
          "Un port réseau identifie un service précis sur une machine. Par exemple, le port 443 correspond au HTTPS et le port 22 au SSH.",
      },
      {
        type: "schema",
        content:
          "Port 21 → FTP (transfert de fichiers)\nPort 22 → SSH (accès distant sécurisé)\nPort 80 → HTTP (web non chiffré)\nPort 443 → HTTPS (web chiffré)\nPort 3306 → MySQL (base de données)",
      },
      {
        type: "code",
        language: "bash",
        content: "nmap -sV 192.168.1.10\n# Scanne les ports ouverts et détecte les services",
      },
      {
        type: "text",
        content:
          "Les ports inférieurs à 1024 sont dits \"bien connus\" (well-known ports) et nécessitent des privilèges root pour être ouverts. Un service inattendu sur un port inhabituel est souvent le signe d'une compromission.",
      },
    ],
  },
  {
    id: "l-c2-3",
    courseId: "c2",
    title: "Le modèle OSI en pratique",
    order: 3,
    durationMinutes: 14,
    xpReward: 55,
    completed: false,
    blocks: [
      {
        type: "text",
        content:
          "Le modèle OSI (Open Systems Interconnection) décompose les communications réseau en 7 couches. Chaque couche a une responsabilité précise et communique avec les couches adjacentes.",
      },
      {
        type: "schema",
        content:
          "7. Application  → HTTP, FTP, DNS, SMTP\n6. Présentation → Chiffrement, encodage (TLS)\n5. Session      → Établissement de sessions\n4. Transport    → TCP / UDP, ports\n3. Réseau       → IP, routage\n2. Liaison      → MAC, Ethernet, Wi-Fi\n1. Physique     → Câbles, ondes radio",
      },
      {
        type: "text",
        content:
          "En cybersécurité, les attaques ciblent des couches précises : ARP spoofing vise la couche 2, les attaques IP spoofing visent la couche 3, et les injections SQL visent la couche 7.",
      },
      {
        type: "example",
        content:
          "Astuce mnémotechnique : \"Please Do Not Touch Steve's Pet Alligator\" (Physical, Data, Network, Transport, Session, Presentation, Application).",
      },
    ],
  },

  // ── Cours c3 : Administration Linux ──────────────────────────────────────
  {
    id: "l-c3-1",
    courseId: "c3",
    title: "Naviguer dans le système de fichiers Linux",
    order: 1,
    durationMinutes: 14,
    xpReward: 55,
    completed: false,
    blocks: [
      {
        type: "text",
        content:
          "Linux organise tout son système dans une arborescence de répertoires qui part de la racine /. Contrairement à Windows, il n'existe pas de lettres de lecteur (C:, D:) — tout est monté dans cette arborescence unique.",
      },
      {
        type: "schema",
        content:
          "/          → racine du système\n/home      → dossiers personnels des utilisateurs\n/etc       → fichiers de configuration\n/var/log   → journaux système\n/tmp       → fichiers temporaires\n/bin /usr/bin → exécutables système",
      },
      {
        type: "code",
        language: "bash",
        content:
          "pwd          # Affiche le répertoire courant\nls -la       # Liste tous les fichiers avec permissions\ncd /etc      # Se déplacer dans /etc\nfind / -name '*.conf' 2>/dev/null  # Trouver tous les fichiers .conf",
      },
      {
        type: "text",
        content:
          "La commande `find` est très utilisée en pentest pour localiser des fichiers de configuration sensibles. Le redirection `2>/dev/null` cache les erreurs de permission.",
      },
    ],
  },
  {
    id: "l-c3-2",
    courseId: "c3",
    title: "Permissions et gestion des utilisateurs",
    order: 2,
    durationMinutes: 16,
    xpReward: 65,
    completed: false,
    blocks: [
      {
        type: "text",
        content:
          "Les permissions Linux s'appliquent à trois entités : le propriétaire (user), le groupe (group) et les autres (others). Pour chacun : lecture (r=4), écriture (w=2), exécution (x=1).",
      },
      {
        type: "schema",
        content:
          "-rwxr-xr-- 1 alice devs 4096 fichier.sh\n ^^^→ propriétaire : rwx (7)\n    ^^^→ groupe     : r-x (5)\n       ^^^→ autres   : r-- (4)\nPermission octale : 754",
      },
      {
        type: "code",
        language: "bash",
        content:
          "chmod 750 script.sh     # rwxr-x--- : propriétaire full, groupe lecture+exec\nchown alice:devs fichier # Changer propriétaire et groupe\nsudo su -               # Devenir root\nwhoami                  # Afficher l'utilisateur courant\nid                      # Afficher UID, GID et groupes",
      },
      {
        type: "text",
        content:
          "Un fichier SUID (chmod u+s) s'exécute avec les droits du propriétaire, pas de celui qui le lance. C'est une surface d'attaque classique en privilege escalation.",
      },
      {
        type: "example",
        content:
          "Commande de recherche de binaires SUID : find / -perm -4000 -type f 2>/dev/null — très utilisé lors d'un audit de machine Linux.",
      },
    ],
  },
];
