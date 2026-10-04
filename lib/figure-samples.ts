import type { FigureInput } from "./figure-spec";

/** One example of every kind of figure, taken from real lessons. They feed the gallery (app/dev/figures) and the tests. */
export const FIGURE_SAMPLES: { id: string; figure: FigureInput }[] = [
  {
    id: "network-lan-wan",
    figure: {
      kind: "network", title: "Un réseau local relié à Internet par l’opérateur", cols: 5, rows: 3,
      zones: [{ label: "Atelier d’Awa (LAN)", col: 0, row: 0, w: 4, h: 3, tone: "blue" }, { label: "Opérateur (WAN)", col: 4, row: 1, w: 1, h: 2, tone: "violet" }],
      nodes: [
        { id: "pc1", label: "PC 1", icon: "pc", col: 0, row: 0 }, { id: "pc2", label: "PC 2", icon: "pc", col: 1, row: 0 }, { id: "pc3", label: "PC 3", icon: "laptop", col: 2, row: 0 },
        { id: "imp", label: "Imprimante", icon: "printer", col: 3, row: 0, tone: "amber" },
        { id: "sw", label: "Commutateur", sub: "relie les postes entre eux", icon: "switch", col: 1.5, row: 1, tone: "green" },
        { id: "box", label: "Box", sub: "passerelle vers Internet", icon: "router", col: 1.5, row: 2, tone: "violet" },
        { id: "net", label: "Internet", icon: "internet", col: 4, row: 2, tone: "violet" },
      ],
      links: [
        { from: "pc1", to: "sw" }, { from: "pc2", to: "sw" }, { from: "pc3", to: "sw" }, { from: "imp", to: "sw" },
        { from: "sw", to: "box" }, { from: "box", to: "net", label: "liaison de l’opérateur", style: "thick", arrow: "both", tone: "violet" },
      ],
      caption: "Le commutateur forme le LAN, la box fait le lien avec le WAN.",
    },
  },
  {
    id: "table-topologies",
    figure: {
      kind: "table", title: "Quatre façons de relier des machines", columns: ["Topologie", "Principe", "Avantage"],
      rows: [
        ["Étoile", "tout passe par un équipement central", "une panne de poste reste isolée"],
        ["Bus", "un câble partagé par toutes les machines", "peu de câble"],
        ["Anneau", "chaque machine relie la suivante", "accès organisé"],
        ["Maillée", "plusieurs chemins entre les équipements", "résiste aux pannes"],
      ],
      highlight: 2,
    },
  },
  {
    id: "packet-encapsulation",
    figure: {
      kind: "packet", title: "Le voyage d’un paquet : chaque couche ajoute son en-tête",
      rows: [
        { label: "Trame Ethernet", fields: [{ name: "MAC destination", size: "6 octets", weight: 3, tone: "blue" }, { name: "MAC source", size: "6 octets", weight: 3, tone: "blue" }, { name: "Type", size: "2 octets", weight: 1, tone: "blue" }, { name: "Charge utile", weight: 5, tone: "cyan" }] },
        { label: "Paquet IPv4", fields: [{ name: "Adresse source", weight: 3, tone: "violet" }, { name: "Adresse destination", weight: 3, tone: "violet" }, { name: "TTL", weight: 1, tone: "violet" }, { name: "Protocole", weight: 2, tone: "violet" }, { name: "Segment TCP", weight: 4, tone: "cyan" }] },
        { label: "Segment TCP", fields: [{ name: "Port source", weight: 2, tone: "green" }, { name: "Port destination", weight: 2, tone: "green" }, { name: "Numéros seq. et ack", weight: 3, tone: "green" }, { name: "Drapeaux", weight: 2, tone: "green" }, { name: "Données", note: "GET /intranet HTTP/1.1", weight: 5, tone: "amber" }] },
      ],
    },
  },
  {
    id: "table-cidr",
    figure: {
      kind: "table", title: "Préfixes CIDR courants", columns: ["Préfixe", "Masque", "Adresses", "Utilisables"],
      rows: [["/24", "255.255.255.0", "256", "254"], ["/25", "255.255.255.128", "128", "126"], ["/26", "255.255.255.192", "64", "62"], ["/27", "255.255.255.224", "32", "30"], ["/28", "255.255.255.240", "16", "14"], ["/30", "255.255.255.252", "4", "2"]],
      mono: [0, 1], highlight: 3,
    },
  },
  {
    id: "layers-defense",
    figure: {
      kind: "layers", nested: true, title: "Défense en profondeur : plusieurs couches, pas une seule barrière",
      layers: [{ label: "Humain", text: "sensibilisation, bons réflexes", icon: "users" }, { label: "Données", text: "chiffrement, sauvegardes", icon: "database" }, { label: "Application", text: "mises à jour, droits", icon: "code" }, { label: "Appareil", text: "antivirus, correctifs", icon: "laptop" }, { label: "Réseau", text: "pare-feu, segmentation", icon: "network" }, { label: "Physique", text: "accès aux locaux", icon: "lock" }],
    },
  },
  {
    id: "layers-tcpip",
    figure: {
      kind: "layers", title: "Le modèle TCP/IP en quatre couches", side: "du message au câble",
      layers: [{ label: "Application", text: "HTTP, DNS, SMTP : ce que l’utilisateur demande", icon: "message", tone: "cyan" }, { label: "Transport", text: "TCP ou UDP : ports et fiabilité", icon: "package", tone: "blue" }, { label: "Internet", text: "IP : adresses et routage", icon: "route", tone: "violet" }, { label: "Accès réseau", text: "Ethernet, Wi-Fi : trames et signal", icon: "cable", tone: "green" }],
    },
  },
  {
    id: "cycle-incident",
    figure: {
      kind: "cycle", title: "Répondre à un incident : le cycle en six étapes", center: "Chaque incident fait progresser la suite",
      nodes: [{ label: "Préparation", text: "règles, contacts, outils" }, { label: "Identification", text: "est-ce un incident ?" }, { label: "Confinement", text: "limiter l’étendue" }, { label: "Éradication", text: "supprimer la cause" }, { label: "Récupération", text: "remettre en service" }, { label: "Retour d’expérience", text: "ce qu’on change" }],
    },
  },
  {
    id: "flow-trust",
    figure: {
      kind: "flow", title: "La chaîne de confiance d’un certificat",
      nodes: [{ label: "Autorité racine", text: "connue du navigateur", icon: "shield-check", tone: "green" }, { label: "Autorité intermédiaire", text: "signée par la racine", icon: "building", tone: "blue" }, { label: "Certificat du serveur", text: "example.com", icon: "server", tone: "cyan" }],
      caption: "Le navigateur vérifie le nom, la date, la signature et toute la chaîne.",
    },
  },
  {
    id: "flow-loop",
    figure: {
      kind: "flow", title: "Le cycle d’une bonne habitude de sécurité",
      nodes: [{ label: "Règle claire", icon: "document" }, { label: "Habitude", icon: "check" }, { label: "Signalement rapide", icon: "bell" }, { label: "Retour d’expérience", icon: "bulb" }],
      loop: "amélioration continue : on ajuste la règle",
    },
  },
  {
    id: "steps-social",
    figure: {
      kind: "steps", title: "Anatomie d’une attaque d’ingénierie sociale",
      items: [{ title: "Reconnaissance", text: "collecte d’infos publiques", icon: "search" }, { title: "Prétexte", text: "histoire crédible et rôle joué", icon: "mask" }, { title: "Contact", text: "mail, SMS, appel, QR code, visite", icon: "message" }, { title: "Action", text: "obtenir un clic, un code, un accès ou de l’argent", icon: "zap", tone: "amber" }, { title: "Exploitation", text: "réutiliser ce qui a été obtenu", icon: "skull", tone: "red" }],
    },
  },
  {
    id: "compare-https",
    figure: {
      kind: "compare", title: "Ce que HTTPS garantit, et ce qu’il ne garantit pas",
      sides: [
        { title: "HTTPS garantit", tone: "green", icon: "lock", items: ["la confidentialité du trajet", "l’intégrité du trajet", "l’identité du serveur si le certificat est valide"] },
        { title: "HTTPS ne garantit pas", tone: "red", icon: "alert", items: ["que le site est bienveillant", "que son contenu est vrai", "que l’utilisateur ne se trompe pas d’adresse"] },
      ],
      verdict: "Le cadenas prouve le canal, pas l’honnêteté du site.",
    },
  },
  {
    id: "formula-entropy",
    figure: {
      kind: "formula", title: "Force d’un mot de passe",
      items: [
        { label: "Entropie approximative", formula: "bits = longueur × log2(taille de l’alphabet)", example: "62 caractères possibles : a-z A-Z 0-9\n8 caractères  : 8 × log2(62) ≈ 47,6 bits\n12 caractères : 12 × log2(62) ≈ 71,5 bits", result: "12 caractères ≈ 71,5 bits", tone: "cyan" },
        { label: "Phrase de passe Diceware", formula: "bits = mots × log2(7776)", example: "5 mots ≈ 64,6 bits\n6 mots ≈ 77,5 bits", result: "6 mots ≈ 77,5 bits", tone: "green" },
      ],
    },
  },
  {
    id: "anatomy-url",
    figure: {
      kind: "anatomy", title: "Lire une adresse web de gauche à droite",
      lines: [[{ text: "https://", label: "protocole", tone: "green" }, { text: "banque-secure.example.net", label: "domaine réel", tone: "red" }, { text: ":443", label: "port", tone: "neutral" }, { text: "/connexion", label: "chemin", tone: "blue" }, { text: "?next=compte", label: "paramètre", tone: "violet" }]],
      caption: "Le domaine se lit juste avant le premier « / » : c’est lui qui compte.",
    },
  },
  {
    id: "anatomy-mail",
    figure: {
      kind: "anatomy", title: "Nom affiché et adresse réelle",
      lines: [
        [{ text: "Affiché :", tone: "neutral" }, { text: "Comptabilité Atlas", label: "ce que tu vois", tone: "green" }],
        [{ text: "From :", tone: "neutral" }, { text: "facturation@atlas-service.example.org", label: "expéditeur réel", tone: "amber" }],
        [{ text: "Reply-To :", tone: "neutral" }, { text: "recouvrement@example.net", label: "où partira ta réponse", tone: "red" }],
      ],
      caption: "Signal d’alerte : la réponse part vers example.net, pas vers le domaine affiché.",
    },
  },
  {
    id: "terminal-linux",
    figure: {
      kind: "terminal", title: "Créer, copier, déplacer",
      lines: [
        { kind: "cmd", text: "mkdir -p dossiers/archives" }, { kind: "note", text: "crée le dossier et ses parents" },
        { kind: "cmd", text: "cp -i rapport.txt rapport.txt.bak" }, { kind: "out", text: "cp: remplacer 'rapport.txt.bak' ? n" },
        { kind: "cmd", text: "ls -l" }, { kind: "out", text: "-rw-r--r-- 1 awa awa 1204 oct.  4 10:12 rapport.txt" },
      ],
    },
  },
  {
    id: "timeline-logs",
    figure: {
      kind: "timeline", title: "Reconstituer une attaque dans les journaux",
      events: [
        { at: "08:14:02", title: "Premier échec de connexion", text: "compte admin, depuis 192.0.2.44", icon: "lock" },
        { at: "08:14:09", title: "Dix échecs en sept secondes", text: "le seuil de la règle est dépassé", icon: "alert", tone: "amber" },
        { at: "08:15:31", title: "Connexion réussie", text: "même adresse, mot de passe trouvé", icon: "key", tone: "red" },
        { at: "08:17:44", title: "Création d’un compte", text: "persistance de l’attaquant", icon: "user", tone: "red" },
      ],
    },
  },
  {
    id: "matrix-risk",
    figure: {
      kind: "matrix", title: "Matrice de risque", xLabel: "Impact", yLabel: "Probabilité", xs: ["Faible", "Moyen", "Fort"], ys: ["Forte", "Moyenne", "Faible"],
      cells: [
        [{ text: "Moyen", tone: "amber" }, { text: "Élevé", tone: "red" }, { text: "Critique", tone: "red" }],
        [{ text: "Faible", tone: "green" }, { text: "Moyen", tone: "amber" }, { text: "Élevé", tone: "red" }],
        [{ text: "Faible", tone: "green" }, { text: "Faible", tone: "green" }, { text: "Moyen", tone: "amber" }],
      ],
    },
  },
  {
    id: "relations-actors",
    figure: {
      kind: "relations", title: "Qui fait quoi autour d’un incident",
      pairs: [
        { from: "Utilisateur", icon: "user", label: "signale", to: "un problème au SOC ou au support" },
        { from: "SOC / blue team", icon: "radar", label: "analyse", to: "contient et escalade", tone: "blue" },
        { from: "CERT ou CSIRT", icon: "siren", label: "coordonne", to: "la réponse à l’incident", tone: "violet" },
        { from: "RSSI", icon: "briefcase", label: "décide", to: "des priorités de sécurité", tone: "amber" },
        { from: "DPO", icon: "scale", label: "suit", to: "l’angle données personnelles", tone: "green" },
      ],
    },
  },
  {
    id: "cards-vocabulary",
    figure: {
      kind: "cards", title: "Le vocabulaire du risque",
      items: [
        { term: "Actif", text: "ce qui a de la valeur", icon: "database", tone: "green" }, { term: "Menace", text: "ce qui peut causer un dommage", icon: "flame", tone: "red" },
        { term: "Vulnérabilité", text: "faiblesse exploitable", icon: "bug", tone: "amber" }, { term: "Risque", text: "dommage plausible et impact estimé", icon: "target", tone: "violet" },
        { term: "Attaque", text: "action malveillante", icon: "skull", tone: "red" }, { term: "Incident", text: "événement qui perturbe ou compromet", icon: "siren", tone: "amber", tag: "à signaler" },
      ],
    },
  },
];
