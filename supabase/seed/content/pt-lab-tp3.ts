import type { PathLab } from "./reseaux-path";

export type PtLabTp3 = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsPtTp3 {
  ptTp3: {
    assetNames: { normal: string; grep: string; xml: string; memo: string; guide: string };
    upCount: number;
    mostOpenHost: string;
    totalOpenPorts: number;
    mailImplicitTlsService: string;
    wwwWebVersion: string;
    vpnUnexpectedPort: string;
    publicDatabaseHost: string;
    filteredCount: number;
    firstDownIp: string;
    mail25Product: string;
    forbiddenPublicPair: string;
    mixedWebAdminDataCount: number;
    filteredStateLetter: string;
    xmlBestFormatLetter: string;
    scanStartUtc: string;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const timeAnswers = (value: string) => compact([value, value.replace(/^0/, "")]);
const asset = (kind: PtLabTp3["assets"][number]["kind"], title: string, description: string, name: string) => ({ kind, title, description, url: `/labs/${name}` });

export function buildPtLabTp3(facts: FactsPtTp3): PtLabTp3[] {
  const tp3 = facts.ptTp3;

  return [{
    slug: "tp-pt-nmap",
    title: "TP 3 : lire les résultats d’un scan réseau",
    description: "Tu confrontes trois exports Nmap cohérents et un mémo de services attendus pour compter les hôtes actifs, lire les états de ports, relever des versions et repérer des expositions anormales.",
    difficulty: "intermediaire",
    xp: 145,
    format: "logs",
    minutes: 50,
    requiresComputer: false,
    isAssessment: false,
    category: "securite",
    briefing: "Le lundi 8 juin 2026, le Cabinet Harmattan remet à la Coopérative Sahel-Vert trois sorties Nmap déjà réalisées sur l’exposition publique du client. Tu ne lances rien toi-même : tu lis les exports fournis, tu confrontes la sortie normale, la version greppable, le XML et le mémo des services attendus. L’objectif n’est pas de deviner, mais de compter correctement, d’interpréter les états et de distinguer ce qui est attendu, inattendu ou interdit. Tous les horodatages du dossier sont à lire en UTC. Tu analyses uniquement ces fichiers fournis ; ne scanne jamais un système réel sans autorisation écrite.",
    constraints: [
      "Tu travailles uniquement sur des fichiers fournis et fictifs.",
      "Les sorties Nmap imitent des formats réels, mais aucune cible réelle n’est impliquée.",
      "Tous les horodatages de ce dossier sont en UTC : ne les convertis pas en heure locale avant de comparer.",
    ],
    tools: [
      "Visionneuse du site",
      "Git Bash, WSL ou Termux pour grep, cut et wc",
      "PowerShell 5.1 avec Get-Content -Encoding UTF8 sur Windows",
    ],
    objectives: [
      "Distinguer les états open, closed et filtered sans les mélanger",
      "Relire les services et versions d’un même scan dans trois formats cohérents",
      "Comparer une surface observée à un mémo de services attendus",
      "Repérer une exposition inattendue ou interdite et la formuler proprement",
    ],
    hints: [
      "Quand une question demande un comptage, suis exactement l’état ou le groupe de ports cité dans l’énoncé.",
      "Le XML est pratique pour recompter proprement les états, car ses balises évitent les ambiguïtés de mise en forme.",
      "Le mémo dit ce qui est attendu publiquement et ce qui doit rester interne.",
      "Un mot aperçu dans une sortie de script n’est pas forcément le produit du service lui-même.",
    ],
    tasks: [
      {
        prompt: `Dans « ${tp3.assetNames.grep} », combien d’hôtes ont l’état « Up » ? Compte uniquement les lignes de statut, pas les lignes « Ports ».`,
        hint: "Reste dans le fichier greppable et ne confonds pas une ligne d’état avec une ligne de détails de ports.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp3.upCount]),
        explanation: `La méthode consiste à ne garder que les lignes « Status: Up » du fichier greppable, puis à les compter une seule fois par hôte. On obtient ${tp3.upCount} hôtes actifs. Lire les lignes « Ports » en plus gonflerait artificiellement le total, car elles décrivent un hôte déjà compté.`,
      },
      {
        prompt: `Quel hôte a le plus de ports « open » dans « ${tp3.assetNames.xml} », sans ex æquo ?`,
        hint: "Compte les ports dont la balise d’état vaut exactement « open », hôte par hôte, puis vérifie qu’un seul maximum existe.",
        answerFormat: "Un FQDN",
        accepted: compact([tp3.mostOpenHost]),
        explanation: `Le XML permet de recompter précisément les balises « state=\"open\" » par hôte. Le maximum est unique pour ${tp3.mostOpenHost}. Vérifier l’absence d’ex æquo est important : un bon décompte doit conclure sur un seul hôte et pas sur une liste à départager autrement.`,
      },
      {
        prompt: `Dans « ${tp3.assetNames.xml} », combien de couples hôte:port sont à l’état « open » au total ? Compte chaque port une seule fois par hôte.`,
        hint: "Additionne les ports open de tous les hôtes actifs, sans jamais compter un même port deux fois pour le même hôte.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp3.totalOpenPorts]),
        explanation: `La sortie XML sépare clairement chaque port et son état. En additionnant seulement les ports marqués « open » pour tous les hôtes actifs, on trouve ${tp3.totalOpenPorts}. Cette somme décrit la surface effectivement visible, sans y mélanger les ports fermés ou filtrés.`,
      },
      {
        prompt: `Sur l’hôte de messagerie, quelle valeur la colonne « SERVICE » affiche-t-elle pour le port 993 dans « ${tp3.assetNames.normal} » ?`,
        hint: "Lis la ligne du port 993 de l’hôte mail et recopie la colonne SERVICE telle qu’elle est écrite, avec son éventuel préfixe, sans le produit de la colonne VERSION.",
        answerFormat: "La valeur exacte de la colonne SERVICE, en minuscules, par exemple http",
        accepted: compact([tp3.mailImplicitTlsService]),
        explanation: `Pour cette question, il faut lire la colonne « SERVICE » de la ligne 993 sur l’hôte mail, et non la colonne « VERSION ». Le service attendu est ${tp3.mailImplicitTlsService}. Cela distingue le type de service du produit logiciel qui le fournit.`,
      },
      {
        prompt: `Pour l’hôte trouvé à la question 2, quelle version de serveur web apparaît dans « ${tp3.assetNames.normal} » ?`,
        hint: "Relève la chaîne de version associée au service HTTP ou HTTPS de cet hôte, sans prendre le produit d’un autre port.",
        answerFormat: "Une chaîne produit version",
        accepted: compact([tp3.wwwWebVersion, "nginx/1.24.0"]),
        explanation: `La bonne lecture consiste à regarder la colonne « VERSION » des lignes web de l’hôte « www.sahel-vert.example ». La version affichée est ${tp3.wwwWebVersion}. Une version relevée sur un autre hôte ou un autre service donnerait une conclusion erronée sur le frontal web public.`,
      },
      {
        prompt: `D’après « ${tp3.assetNames.memo} » et les sorties du scan, quel port public inattendu est ouvert sur « vpn.sahel-vert.example » ?`,
        hint: "Compare les ports open du VPN avec la liste « publics= » du mémo, puis relève le seul port ouvert qui n’y figure pas.",
        answerFormat: "Un numéro de port",
        accepted: compact([tp3.vpnUnexpectedPort]),
        explanation: `Le mémo indique ce qui doit être publié pour le VPN, puis le scan montre ce qui est réellement ouvert. Le seul port ouvert sur le VPN qui n’est pas listé comme public attendu est ${tp3.vpnUnexpectedPort}. Cette comparaison sert à distinguer une surface assumée d’une exposition qui mérite une vérification rapide.`,
      },
      {
        prompt: `Quel hôte expose un service de base de données dans les résultats du scan ?`,
        hint: "Cherche le service de base de données ouvert, puis relève l’hôte auquel il appartient.",
        answerFormat: "Un FQDN",
        accepted: compact([tp3.publicDatabaseHost]),
        explanation: `Il faut repérer l’unique service de base de données visible dans les exports puis lire le FQDN de son hôte. Ici, cet hôte est ${tp3.publicDatabaseHost}. Identifier le bon hôte avant toute conclusion évite de confondre le service de données avec un frontal web ordinaire.`,
      },
      {
        prompt: `Dans « ${tp3.assetNames.xml} », combien de couples hôte:port sont à l’état « filtered » ? Ignore les hôtes down et compte chaque port une seule fois par hôte.`,
        hint: "Parcours les balises d’état et ne garde que la valeur exacte « filtered ».",
        answerFormat: "Un nombre entier",
        accepted: compact([tp3.filteredCount]),
        explanation: `Le XML reste le plus pratique pour ce décompte, car chaque port porte explicitement son état. En ne gardant que « filtered » et en ignorant les hôtes down, on obtient ${tp3.filteredCount}. Ce total montre combien de ports restent silencieux ou bloqués sans être assimilés à des ports fermés.`,
      },
      {
        prompt: `Dans « ${tp3.assetNames.grep} », quelle est la première adresse IPv4 marquée « Down » en respectant l’ordre du fichier ?`,
        hint: "Lis les lignes de haut en bas et arrête-toi au premier statut « Down ».",
        answerFormat: "Une adresse IPv4",
        accepted: compact([tp3.firstDownIp]),
        explanation: `La question porte sur l’ordre du fichier, pas sur un tri numérique des adresses. En lisant simplement la sortie greppable du début à la fin, la première IPv4 marquée « Down » est ${tp3.firstDownIp}. Respecter l’ordre d’apparition évite de réécrire la question en triant autrement.`,
      },
      {
        prompt: `Quel produit est associé au port 25 de « mail.sahel-vert.example » dans « ${tp3.assetNames.xml} » ?`,
        hint: "Lis le champ produit du service sur le port 25 et ne te laisse pas distraire par les sorties de script.",
        answerFormat: "Un nom de produit",
        accepted: compact([tp3.mail25Product, "postfix"]),
        explanation: `Ici, il faut relever le produit déclaré par le service du port 25, et non un mot aperçu dans une sortie de script. Le produit associé est ${tp3.mail25Product}. Cette distinction est utile quand des scripts mentionnent l’OS, un certificat ou un titre de page sans que cela décrive le logiciel du port.`,
      },
      {
        prompt: `D’après « ${tp3.assetNames.memo} », quel seul couple hôte:port est noté « interne uniquement » tout en apparaissant « open » dans le scan public ?`,
        hint: "Croise la colonne « internes= » du mémo avec les ports open observés, puis relève le couple exact.",
        answerFormat: "Un couple hôte:port",
        accepted: compact([tp3.forbiddenPublicPair]),
        explanation: `Le mémo distingue clairement les services publics attendus des services internes. En croisant cette politique avec les ports ouverts du scan, un seul couple ressort comme « interne uniquement » mais malgré tout visible publiquement : ${tp3.forbiddenPublicPair}. Ce croisement permet de formuler un constat précis et défendable.`,
      },
      {
        prompt: `Dans « ${tp3.assetNames.normal} », considère comme « ports web » les ports ouverts dont la colonne SERVICE vaut « http » ou « ssl/http » (ignore « http-proxy »), et comme « ports d’administration ou de données » les ports ouverts 22, 3306 ou 5432. Combien d’hôtes up cumulent au moins un port de chaque groupe ?`,
        hint: "Raisonne hôte par hôte : un même hôte compte une seule fois dès qu’il a au moins un port de chaque groupe.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp3.mixedWebAdminDataCount]),
        explanation: `La règle de la question définit deux groupes de ports à croiser. On compte chaque hôte actif une seule fois s’il possède au moins un port web ouvert et au moins un port d’administration ou de données ouvert. Le total obtenu est ${tp3.mixedWebAdminDataCount}. Ce type de regroupement aide à repérer des surfaces hybrides plus sensibles.`,
      },
      {
        prompt: "Quel état Nmap décrit correctement un port qui reste silencieux parce qu’un filtrage empêche de conclure ? Réponds par une lettre. a) open b) closed c) filtered d) up",
        hint: "Cherche l’état qui signale un blocage ou une absence de réponse, pas un service confirmé ni un hôte actif.",
        answerFormat: "Une seule lettre",
        accepted: compact([tp3.filteredStateLetter]),
        explanation: "La bonne réponse est la lettre c. L’état « filtered » indique que Nmap ne peut pas conclure proprement parce qu’un filtrage ou un silence réseau bloque la réponse. Un port open répond, un port closed répond négativement, et « up » décrit un hôte, pas un port.",
      },
      {
        prompt: "Quel format est le plus robuste pour recompter proprement les états et les services d’un scan sans dépendre de l’alignement visuel ? Réponds par une lettre. a) la sortie normale b) la sortie XML c) la sortie greppable d) le mémo des services attendus",
        hint: "Cherche le format dont les balises portent explicitement l’état, le port et le service.",
        answerFormat: "Une seule lettre",
        accepted: compact([tp3.xmlBestFormatLetter]),
        explanation: "La bonne réponse est la lettre b. Le XML porte explicitement les champs utiles dans des balises stables, ce qui facilite les recomptes et les recoupements. La sortie normale et la sortie greppable restent très utiles à lire, mais elles dépendent davantage de conventions de texte et d’alignement.",
      },
      {
        prompt: `Quel est l’horodatage UTC de début du scan indiqué par l’en-tête de « ${tp3.assetNames.normal} » ?`,
        hint: "Relève la date de démarrage dans l’en-tête, puis recopie-la au format AAAA-MM-JJ HH:MM:SS sans conversion locale.",
        answerFormat: "AAAA-MM-JJ HH:MM:SS",
        accepted: compact([tp3.scanStartUtc]),
        explanation: `La sortie normale donne l’heure de démarrage du scan dans son en-tête. Comme ce dossier impose la lecture en UTC, il faut recopier cet instant sans conversion locale. L’horodatage attendu est ${tp3.scanStartUtc}. Respecter le fuseau et le format demandé évite les décalages introduits par les outils locaux.`,
      },
    ],
    assets: [
      asset("log", "Sortie Nmap normale", "Vue lisible du scan avec états, services, versions et sorties de scripts inoffensives.", tp3.assetNames.normal),
      asset("log", "Sortie Nmap greppable", "Version greppable du même scan, utile pour compter rapidement statuts et ports.", tp3.assetNames.grep),
      asset("log", "Sortie Nmap XML", "Version structurée du même scan, adaptée aux recomptes précis.", tp3.assetNames.xml),
      asset("log", "Mémo des services attendus", "Surface publique attendue par hôte et ports devant rester internes.", tp3.assetNames.memo),
      asset("guide", "Guide du TP 3", "Méthode pour lire les états de ports, comparer le mémo et recompter proprement avec le XML.", tp3.assetNames.guide),
    ],
  }];
}
