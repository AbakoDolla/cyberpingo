import type { PathLab } from "./reseaux-path";

export type PtLabTp2 = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsPtTp2 {
  ptTp2: {
    assetNames: { dns: string; ct: string; whois: string; pages: string; jobs: string; guide: string };
    unionFqdnCount: number;
    ctOnlyFqdn: string;
    mxPrimary: string;
    txtMailSecurityCount: number;
    publicBlock: string;
    registrar: string;
    topTechnology: string;
    sensitiveUrl: string;
    confirmedVisibleDbJobCount: number;
    jobsOnlyTech: string;
    remoteAccessFqdn: string;
    stagingEvidenceLetter: string;
    count198Names: number;
    vpnFirstObservedDate: string;
    passiveOnlyLetter: string;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const asset = (kind: PtLabTp2["assets"][number]["kind"], title: string, description: string, name: string) => ({ kind, title, description, url: `/labs/${name}` });

export function buildPtLabTp2(facts: FactsPtTp2): PtLabTp2[] {
  const tp2 = facts.ptTp2;

  return [{
    slug: "tp-pt-osint",
    title: "TP 2 : reconnaissance passive sur des sources publiques fictives",
    description: "Tu inventories la surface exposée de la Coopérative Sahel-Vert à partir du DNS public, de la transparence des certificats, d’un export WHOIS, de pages publiques et d’annonces d’emploi, sans jamais toucher la cible.",
    difficulty: "intermediaire",
    xp: 150,
    format: "logs",
    minutes: 45,
    requiresComputer: false,
    isAssessment: false,
    category: "securite",
    briefing: "Le 4 juin 2026, Yao Kouassi rassemble des extraits publics sur la Coopérative Sahel-Vert pour préparer une mission du Cabinet Harmattan. Tu dois cartographier la surface exposée sans interaction active : DNS public, journal de transparence des certificats, WHOIS, pages web publiques et annonces d’emploi. Chaque réponse doit se justifier par une source du dossier. Tu analyses uniquement les fichiers fournis ; ne tente jamais une connexion ni une collecte active sur un système réel.",
    constraints: [
      "Reste en reconnaissance passive : lecture, comptage et recoupement uniquement.",
      "Quand une question parle d’union, de différence ou de première date, applique exactement cette règle de calcul.",
      "Les exemples du guide sont inventés et n’appartiennent pas au scénario.",
    ],
    tools: [
      "Visionneuse du site",
      "Git Bash, WSL ou Termux pour grep, sort, uniq et awk",
      "PowerShell 5.1 avec Get-Content -Encoding UTF8 et Import-Csv -Encoding UTF8",
    ],
    objectives: [
      "Recouper DNS, CT et WHOIS sans confondre les rôles de chaque source",
      "Distinguer un indice public direct d’une simple hypothèse",
      "Lire une page publique ou une annonce sans surinterpréter le bruit textuel",
      "Documenter une surface exposée passive avant toute étape suivante",
    ],
    hints: [
      "Le guide rappelle ce que signifient A, AAAA, MX, TXT, CNAME et TTL.",
      "Une observation CT prouve qu’un nom a été vu dans un certificat public, pas qu’il répond encore aujourd’hui.",
      "Pour les pages publiques, la colonne de technologie compte ; une citation en prose ne compte pas.",
      "Pour les annonces, lis d’abord les lignes structurées avant les notes narratives.",
    ],
    tasks: [
      {
        prompt: `Entre « ${tp2.assetNames.dns} » et « ${tp2.assetNames.ct} », combien de FQDN distincts vois-tu au total si tu fais l’union des noms DNS, des commonName et des SAN, en comptant chaque nom une seule fois ?`,
        hint: "Compte un nom une seule fois même s’il apparaît dans plusieurs lignes ou dans les deux sources.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp2.unionFqdnCount]),
        explanation: `La bonne méthode consiste à réunir les noms du DNS public, les commonName et les SAN, puis à dédoublonner l’ensemble. On obtient ${tp2.unionFqdnCount} FQDN distincts. Cette règle d’union évite de gonfler artificiellement le total quand un même nom revient dans plusieurs certificats.`,
      },
      {
        prompt: `Quel FQDN apparaît dans « ${tp2.assetNames.ct} » mais n’apparaît dans aucun nom de « ${tp2.assetNames.dns} » ?`,
        hint: "Fais une différence d’ensembles : CT moins DNS public.",
        answerFormat: "Un FQDN complet",
        accepted: compact([tp2.ctOnlyFqdn]),
        explanation: `Il faut comparer les noms de la CT avec les noms DNS publics et garder le seul nom qui reste dans la différence. Ce FQDN est ${tp2.ctOnlyFqdn}. C’est un bon exemple de nom à noter dans l’inventaire tout en le signalant comme absent du DNS public actuel.`,
      },
      {
        prompt: `Dans « ${tp2.assetNames.dns} », quel est le serveur MX principal, c’est à dire celui dont la priorité numérique est la plus basse ?`,
        hint: "Lis seulement les lignes MX et compare la priorité au début de la valeur.",
        answerFormat: "Un FQDN complet",
        accepted: compact([tp2.mxPrimary]),
        explanation: `Pour un MX, la priorité la plus basse passe en premier. En lisant uniquement les lignes MX du fichier DNS, le serveur principal est ${tp2.mxPrimary}. La réponse ne dépend donc pas de l’ordre des lignes mais de la valeur numérique de priorité.`,
      },
      {
        prompt: `Dans « ${tp2.assetNames.dns} », combien de lignes TXT correspondent à SPF, DMARC ou DKIM ? Compte une ligne une seule fois et ignore les autres TXT non liés à ces mécanismes.`,
        hint: "Un TXT compte s’il commence par SPF ou s’il porte un nom ou une valeur caractéristique de DMARC ou DKIM.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp2.txtMailSecurityCount]),
        explanation: `Le bon comptage filtre les TXT de sécurité mail et ignore les TXT de vérification ou de cache. Ici, ${tp2.txtMailSecurityCount} ligne(s) correspondent à SPF, DMARC ou DKIM. Cette distinction est utile pour séparer les indices de sécurité mail du bruit applicatif.`,
      },
      {
        prompt: `Quel bloc public est attribué à la coopérative dans « ${tp2.assetNames.whois} » ?`,
        hint: "Lis le champ CIDR du bloc rattaché à l’organisation du client, pas les commentaires ni le registrar.",
        answerFormat: "Un bloc CIDR, par exemple 198.51.100.0/24",
        accepted: compact([tp2.publicBlock]),
        explanation: `La réponse vient du champ CIDR de l’objet réseau attribué à l’organisation cliente. Le bloc public attendu est ${tp2.publicBlock}. Il faut bien le distinguer d’un commentaire ou d’une adresse de contact qui ne définissent pas le périmètre d’adresse.`,
      },
      {
        prompt: `Quel est le nom exact du registrar dans « ${tp2.assetNames.whois} » ?`,
        hint: "Ne confonds pas le registrar avec le client, l’admin ou le contact technique.",
        answerFormat: "Le nom exact du registrar",
        accepted: compact([tp2.registrar]),
        explanation: `Le registrar est l’organisme qui enregistre le domaine, pas le titulaire du service. Dans cet export, son nom exact est ${tp2.registrar}. La confusion entre registrar et client est un piège classique quand on lit un WHOIS trop vite.`,
      },
      {
        prompt: `Dans « ${tp2.assetNames.pages} », quelle technologie est la plus citée dans le champ technology, sans ex æquo ?`,
        hint: "Compte seulement le champ technology de chaque objet. Ignore les témoignages ou citations dans le texte libre.",
        answerFormat: "Un nom court en minuscules",
        accepted: compact([tp2.topTechnology]),
        explanation: `La méthode correcte consiste à compter le champ technology sur toutes les pages, puis à vérifier qu’un seul maximum se détache. La technologie la plus citée est ${tp2.topTechnology}. Une citation en prose ne doit pas entrer dans ce décompte.`,
      },
      {
        prompt: `Dans « ${tp2.assetNames.pages} », quelle URL publique révèle un portail métier sensible parce que la mention métier parle d’un espace fournisseurs lié aux bons de livraison ou aux commandes ?`,
        hint: "Cherche le contexte métier dans le champ de description fonctionnelle, pas un simple lien de contact.",
        answerFormat: "Une URL complète",
        accepted: compact([tp2.sensitiveUrl]),
        explanation: `Il faut relever l’URL dont la mention métier décrit explicitement un portail fournisseurs et des flux de livraison ou de commande. Cette URL est ${tp2.sensitiveUrl}. C’est un indice sensible car il relie un nom public à un processus métier précis.`,
      },
      {
        prompt: `Dans « ${tp2.assetNames.jobs} » et « ${tp2.assetNames.pages} », combien d’annonces d’emploi confirment une base de données déjà visible publiquement ? Compte une annonce une seule fois et regarde la ligne structurée « Base de données ».`,
        hint: "Commence par identifier la ou les bases visibles publiquement dans le champ technology des pages, puis croise chaque annonce une seule fois.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp2.confirmedVisibleDbJobCount]),
        explanation: `La règle est de croiser les bases de données visibles publiquement avec la ligne structurée « Base de données » de chaque annonce, sans compter deux fois la même annonce. On obtient ${tp2.confirmedVisibleDbJobCount} annonce(s) confirmant une base déjà visible. Ce croisement évite de confondre une pile supposée avec une pile effectivement recoupée.`,
      },
      {
        prompt: `Dans « ${tp2.assetNames.jobs} », parmi les technologies citées sur les lignes « Technologies » et « Outil interne mentionné » (ignore les valeurs « aucun » et « non précisée »), laquelle n’apparaît ni dans le champ technology de « ${tp2.assetNames.pages} » ni nulle part dans le DNS public « ${tp2.assetNames.dns} » ?`,
        hint: "Dresse la liste des technologies des lignes « Technologies » et « Outil interne mentionné », retire celles du champ technology des pages, puis celles dont le nom figure quelque part dans le DNS public.",
        answerFormat: "Un nom court en minuscules",
        accepted: compact([tp2.jobsOnlyTech]),
        explanation: `Il faut lister les technologies citées dans les annonces, retirer celles déjà vues dans les pages publiques, puis vérifier qu’aucune occurrence n’apparaît dans les noms DNS publics du dossier. La seule technologie restante est ${tp2.jobsOnlyTech}. Elle mérite une note car elle suggère un outillage interne non directement exposé.`,
      },
      {
        prompt: `Quel FQDN croise simultanément ces trois indices : présent dans « ${tp2.assetNames.dns} », présent dans « ${tp2.assetNames.ct} » et cité par une page publique dont le titre ou la mention métier parle d’accès distant ?`,
        hint: "Commence par les pages publiques, récupère le nom d’hôte, puis vérifie sa présence dans les deux autres sources.",
        answerFormat: "Un FQDN complet",
        accepted: compact([tp2.remoteAccessFqdn]),
        explanation: `Le bon raisonnement part de la page publique d’accès distant, récupère son nom d’hôte puis vérifie que ce même nom existe dans le DNS et dans la CT. Le FQDN obtenu est ${tp2.remoteAccessFqdn}. Ce croisement donne un signal plus solide qu’un seul indice pris isolément.`,
      },
      {
        prompt: `Pour justifier qu’il faut garder le nom absent du DNS public dans tes notes, quelle source donne la preuve directe la plus solide ? Réponds par une lettre. a) Une ligne A active du DNS public. b) Une observation dans le journal de transparence des certificats. c) Le nom du registrar dans le WHOIS. d) Une annonce d’emploi générique.`,
        hint: "Choisis la source qui prouve directement qu’un nom a été inscrit dans un certificat public, même sans réponse DNS actuelle.",
        answerFormat: "Une seule lettre",
        accepted: compact([tp2.stagingEvidenceLetter]),
        explanation: "La bonne réponse est la lettre b. Une observation dans un journal de transparence des certificats prouve directement qu’un nom a été inscrit dans un certificat public. Les autres sources ne prouvent pas ce fait précis.",
      },
      {
        prompt: `Dans « ${tp2.assetNames.dns} », combien de noms publics pointent vers le bloc public attribué à la coopérative ? Compte seulement les enregistrements A et compte chaque nom une seule fois.`,
        hint: "Ignore les CNAME et les AAAA. Un nom ne compte qu’une fois même s’il a plusieurs commentaires.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp2.count198Names]),
        explanation: `Le comptage ne retient que les lignes A dont l’IPv4 tombe dans ${tp2.publicBlock}, puis dédoublonne les noms. On trouve ${tp2.count198Names} nom(s) publics pointant vers ce bloc. Cette règle évite de compter deux fois un même nom ou de mélanger les alias et l’IPv6.`,
      },
      {
        prompt: `Dans « ${tp2.assetNames.ct} », quelle est la première date d’observation du certificat lié au nom d’accès distant ? Filtre les lignes où le commonName ou un SAN contient ce nom et réponds au format AAAA-MM-JJ.`,
        hint: "Trie par date UTC à la journée près et garde la plus ancienne observation du nom d’accès distant.",
        answerFormat: "Une date au format AAAA-MM-JJ",
        accepted: compact([tp2.vpnFirstObservedDate]),
        explanation: `La méthode consiste à filtrer les lignes CT liées au nom d’accès distant puis à garder la date la plus ancienne. La première date d’observation est ${tp2.vpnFirstObservedDate}. L’ordre du fichier ne suffit pas à lui seul : il faut vraiment comparer les dates.`,
      },
      {
        prompt: "Pour rester strictement en passif, quel élément ne faut-il pas collecter dans ce dossier ? Réponds par une lettre. a) Le TTL d’un enregistrement A public. b) L’émetteur d’un certificat visible en CT. c) La bannière SSH d’un hôte public en ouvrant une connexion. d) Le nom du registrar dans le WHOIS.",
        hint: "Cherche l’option qui suppose une interaction active avec la cible, pas une simple lecture de source publique déjà fournie.",
        answerFormat: "Une seule lettre",
        accepted: compact([tp2.passiveOnlyLetter]),
        explanation: "La bonne réponse est la lettre c. Ouvrir une connexion pour lire une bannière SSH est une interaction active avec la cible. Les autres éléments se lisent passivement dans des sources déjà publiques ou déjà collectées.",
      },
    ],
    assets: [
      asset("log", "DNS public", "Export CSV fictif d’enregistrements publics avec A, AAAA, MX, TXT, CNAME et TTL.", tp2.assetNames.dns),
      asset("log", "Transparence des certificats", "Journal JSONL fictif d’observations de certificats publics avec commonName, SAN, émetteur et date.", tp2.assetNames.ct),
      asset("log", "WHOIS et bloc public", "Export texte fictif de domaine et de bloc réseau avec titulaire, registrar, contacts et CIDR.", tp2.assetNames.whois),
      asset("log", "Pages publiques", "Pages JSONL fictives avec URL, titre, technologie visible, contact et mention métier.", tp2.assetNames.pages),
      asset("log", "Annonces d’emploi", "Trois annonces texte structurées, avec technologies, base de données, outil interne et contraintes.", tp2.assetNames.jobs),
      asset("guide", "Guide du TP 2", "Méthode de reconnaissance passive et de recoupement entre DNS, CT, WHOIS, pages et annonces.", tp2.assetNames.guide),
    ],
  }];
}
