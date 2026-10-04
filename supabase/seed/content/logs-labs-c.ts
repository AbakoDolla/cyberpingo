import type { PathLab } from "./reseaux-path";

export type LogsLab = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface LogsFactsC {
  projetSocPme: {
    assetNames: {
      alertsFile: string;
      inventoryFile: string;
      authFile: string;
      windowsFile: string;
      webFile: string;
      networkFile: string;
      dnsFile: string;
      proxyFile: string;
      gridFile: string;
      reportFile: string;
      guideFile: string;
    };
    qualificationByAlert: Record<string, string>;
    priorityByAlert: Record<string, number>;
    topAlert: string;
    entryMachine: string;
    compromisedAccount: string;
    firstIncidentTime: string;
    attackerIp: string;
    outboundDestination: string;
    attackTechniqueLetter: string;
    containmentLetter: string;
    indicatorDisarmed: string;
    conclusionLetter: string;
    certitudeValues: Record<string, number>;
    criticalityByMachine: Record<string, number>;
    lineCounts: Record<string, number>;
    priorityBounds: {
      basseMax: number;
      moyenneMax: number;
      hauteMax: number;
      critiqueMax: number;
    };
    roundHalfUpExample: number;
  };
}

export interface FactsC extends LogsFactsC {}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase())));
const timeAnswers = (value: string) => compact([value, value.replace(/^0/, "")]);
const letterAnswers = (value: string) => compact([value]);
const numberAnswers = (value: number) => compact([value]);

const asset = (kind: LogsLab["assets"][number]["kind"], title: string, description: string, name: string) => ({
  kind,
  title,
  description,
  url: `/labs/${name}`,
});

export function buildLogsLabsC(facts: LogsFactsC): LogsLab[] {
  const projet = facts.projetSocPme;

  return [
    {
      slug: "projet-soc-pme",
      title: "Projet final : trier une semaine d’alertes et rédiger le rapport d’analyse",
      description: "Tu qualifies douze alertes d’une PME, calcules leurs priorités à partir d’une grille explicite, relies plusieurs sources et choisis une conclusion défendable.",
      difficulty: "avance",
      xp: 200,
      format: "logs",
      minutes: 95,
      requiresComputer: false,
      isAssessment: true,
      category: "securite",
      briefing: "Le lundi 25 mai 2026, l’Hôtel Palmier d’Or te confie une semaine d’alertes, du 18 au 24 mai 2026, pour vérifier si le petit dispositif de détection local remonte des incidents réels ou du simple bruit. Kader Sow a exporté les alertes, l’inventaire des machines et plusieurs sources de preuve, sans filtrer le trafic légitime. Ton rôle est de qualifier chaque signal comme vrai positif, faux positif ou à surveiller, puis de recalculer une priorité numérique fondée sur la gravité annoncée, la criticité de la machine et la certitude. Tu dois ensuite reconstituer l’incident réel, choisir la première action de confinement et préparer un rapport qui reste factuel. Aucun SIEM ni système réel n’est nécessaire : tout se décide à partir des fichiers fournis.",
      constraints: [
        "Tu travailles uniquement sur des exports fictifs et tu ne te connectes à aucune machine du scénario.",
        "Les seules règles de qualification, de certitude et de priorité autorisées sont celles qui figurent dans la grille fournie.",
      ],
      tools: [
        "Visionneuse de journaux CyberPingo pour rechercher dans les exports",
        "Git Bash, WSL ou Termux pour filtrer des lignes avec grep, awk ou sort",
        "Windows PowerShell 5.1 avec Get-Content -Encoding UTF8 et Select-String",
      ],
      objectives: [
        "Qualifier une alerte en distinguant fait direct, corroboration et simple soupçon",
        "Calculer une priorité numérique à partir d’une formule explicite",
        "Relier les preuves Linux, web, DNS, proxy, réseau et Windows dans une chronologie unique",
        "Rédiger une conclusion défendable, un indicateur partageable et une action de confinement prioritaire",
      ],
      hints: [
        "Commence par la grille de triage, puis seulement après ouvre les preuves.",
        "Une source unique suffit rarement à conclure à un vrai positif dans ce projet.",
        "Le proxy, le DNS et le pare-feu peuvent confirmer ensemble une même communication sortante.",
        "Quand tu hésites entre faux positif et à surveiller, cherche d’abord s’il existe un repère bénin explicitement autorisé par la grille.",
      ],
      tasks: [
        {
          prompt: `Selon « ${projet.assetNames.gridFile} », comment qualifies-tu l’alerte ALT-01 de « ${projet.assetNames.alertsFile} » en recoupant « ${projet.assetNames.windowsFile} » ? Réponds par vp, fp ou sv.`,
          hint: "Vérifie si la série d’échecs correspond exactement à un oubli de mot de passe déjà défini comme bénin.",
          answerFormat: "vp, fp ou sv",
          accepted: compact([projet.qualificationByAlert["ALT-01"]]),
          explanation: "La grille autorise un faux positif quand plusieurs 4625 sont suivis, sous 120 secondes, d’un 4624 pour le même compte, la même source interne et le même poste, sans signe de privilège ni de propagation. ALT-01 suit exactement ce schéma, il faut donc le classer comme un oubli de mot de passe et non comme une compromission.",
        },
        {
          prompt: `Selon « ${projet.assetNames.gridFile} », comment qualifies-tu l’alerte ALT-03 de « ${projet.assetNames.alertsFile} » en recoupant « ${projet.assetNames.authFile} » avec les autres preuves ? Réponds par vp, fp ou sv.`,
          hint: "Cherche s’il existe un succès, une deuxième source ou seulement une suite d’échecs sans effet confirmé.",
          answerFormat: "vp, fp ou sv",
          accepted: compact([projet.qualificationByAlert["ALT-03"]]),
          explanation: "ALT-03 montre une activité suspecte réelle, mais les preuves associées restent limitées à des échecs SSH sans succès ni conséquence confirmée dans une deuxième source. La bonne qualification n’est donc ni un faux positif ni un incident établi, mais une alerte à surveiller.",
        },
        {
          prompt: `Selon « ${projet.assetNames.gridFile} », comment qualifies-tu l’alerte ALT-04 de « ${projet.assetNames.alertsFile} » en croisant « ${projet.assetNames.webFile} » et « ${projet.assetNames.authFile} » ? Réponds par vp, fp ou sv.`,
          hint: "Une exécution de commande côté web puis une suite de traces sur le même serveur valent plus qu’un simple scan.",
          answerFormat: "vp, fp ou sv",
          accepted: compact([projet.qualificationByAlert["ALT-04"]]),
          explanation: "Le journal web contient un téléversement suivi d’appels avec un paramètre de commande, puis une autre source montre la suite de l’incident sur le même serveur. Comme la grille exige un fait direct et une corroboration distincte pour conclure, ALT-04 est un vrai positif établi.",
        },
        {
          prompt: `Selon « ${projet.assetNames.gridFile} », comment qualifies-tu l’alerte ALT-06 de « ${projet.assetNames.alertsFile} » en croisant « ${projet.assetNames.networkFile} », « ${projet.assetNames.dnsFile} » et « ${projet.assetNames.proxyFile} » ? Réponds par vp, fp ou sv.`,
          hint: "Cherche une même sortie vers une destination neuve, puis vérifie si au moins deux autres sources la racontent aussi.",
          answerFormat: "vp, fp ou sv",
          accepted: compact([projet.qualificationByAlert["ALT-06"]]),
          explanation: "Le pare-feu voit la sortie, le DNS montre la résolution juste avant, et le proxy confirme le tunnel vers la même destination. L’alerte repose donc sur plusieurs faits concordants : elle doit être qualifiée comme un vrai positif.",
        },
        {
          prompt: `Selon « ${projet.assetNames.gridFile} », comment qualifies-tu l’alerte ALT-08 de « ${projet.assetNames.alertsFile} » en recoupant « ${projet.assetNames.windowsFile} » et « ${projet.assetNames.proxyFile} » ? Réponds par vp, fp ou sv.`,
          hint: "Compare les indices observés avec le repère bénin précisé pour la synchronisation d’inventaire.",
          answerFormat: "vp, fp ou sv",
          accepted: compact([projet.qualificationByAlert["ALT-08"]]),
          explanation: "La grille de triage décrit explicitement le comportement attendu de la synchronisation d’inventaire de adm-pc02 : parent taskeng.exe, utilisateur ksow et trafic vers le domaine d’inventaire. Les preuves recoupent exactement ce motif, ce qui impose la qualification faux positif.",
        },
        {
          prompt: `Selon « ${projet.assetNames.gridFile} », comment qualifies-tu l’alerte ALT-12 de « ${projet.assetNames.alertsFile} » en recoupant « ${projet.assetNames.webFile} » avec les autres sources ? Réponds par vp, fp ou sv.`,
          hint: "Un scan opportuniste reste à surveiller tant qu’aucune réussite ni aucun effet secondaire n’est confirmé.",
          answerFormat: "vp, fp ou sv",
          accepted: compact([projet.qualificationByAlert["ALT-12"]]),
          explanation: "Le journal web montre une suite de 404 depuis une même source, mais rien n’indique une exécution, une authentification ou une communication sortante associée. D’après la grille, ce type de scan reste dans la catégorie à surveiller.",
        },
        {
          prompt: `Calcule la priorité numérique de l’alerte ALT-04 de « ${projet.assetNames.alertsFile} » avec la formule de « ${projet.assetNames.gridFile} » et la criticité de « ${projet.assetNames.inventoryFile} ».`,
          hint: "Pars de la gravité annoncée, retrouve la criticité de la machine, puis applique la valeur de certitude de ta qualification.",
          answerFormat: "Nombre entier",
          accepted: numberAnswers(projet.priorityByAlert["ALT-04"]),
          explanation: "La priorité ne se lit pas à l’œil : il faut multiplier la gravité annoncée par la criticité de la machine puis par la certitude associée à la qualification retenue. Ce calcul donne la valeur numérique attendue pour ALT-04.",
        },
        {
          prompt: `Calcule la priorité numérique de l’alerte ALT-05 de « ${projet.assetNames.alertsFile} » avec la formule de « ${projet.assetNames.gridFile} » et la criticité de « ${projet.assetNames.inventoryFile} ».`,
          hint: "La machine n’est pas forcément différente de celle d’ALT-04, mais la gravité annoncée peut changer le résultat.",
          answerFormat: "Nombre entier",
          accepted: numberAnswers(projet.priorityByAlert["ALT-05"]),
          explanation: "Il faut réutiliser la même formule, mais avec les valeurs propres à ALT-05. La différence de gravité et de contexte explique pourquoi sa priorité n’est pas la même que celle des autres alertes du serveur.",
        },
        {
          prompt: `Calcule la priorité numérique de l’alerte ALT-06 de « ${projet.assetNames.alertsFile} » avec la formule de « ${projet.assetNames.gridFile} » et la criticité de « ${projet.assetNames.inventoryFile} ».`,
          hint: "Cette alerte porte sur une sortie confirmée depuis une machine critique.",
          answerFormat: "Nombre entier",
          accepted: numberAnswers(projet.priorityByAlert["ALT-06"]),
          explanation: "ALT-06 combine une gravité élevée, une machine critique et une certitude forte. Le calcul complet permet de justifier sa place dans l’ordre de traitement au lieu de s’appuyer sur une impression.",
        },
        {
          prompt: `Quelle alerte dois-tu traiter en premier, d’après les priorités calculées à partir de « ${projet.assetNames.alertsFile} », « ${projet.assetNames.inventoryFile} » et « ${projet.assetNames.gridFile} » ?`,
          hint: "Choisis l’identifiant dont la priorité numérique est la plus haute, sans rien inventer d’autre.",
          answerFormat: "Identifiant d’alerte",
          accepted: compact([projet.topAlert]),
          explanation: "Une fois les priorités calculées, il faut simplement retenir l’alerte dont la valeur est strictement la plus haute. Le corpus a été construit pour qu’il n’y ait pas d’égalité sur cette première place.",
        },
        {
          prompt: `Quelle machine de « ${projet.assetNames.inventoryFile} » sert de point d’entrée à l’incident réel en croisant « ${projet.assetNames.webFile} » et « ${projet.assetNames.authFile} » ?`,
          hint: "La machine d’entrée est celle qui reçoit d’abord l’action malveillante confirmée, pas celle qui observe l’incident.",
          answerFormat: "Nom de machine",
          accepted: compact([projet.entryMachine]),
          explanation: "Le point d’entrée se déduit de la première action malveillante confirmée dans le journal web, puis de la suite de la compromission visible dans le journal Linux. Il faut donc nommer la même machine du début à la fin de la chaîne.",
        },
        {
          prompt: `Quel compte est compromis pendant l’incident réel en croisant « ${projet.assetNames.webFile} » et « ${projet.assetNames.authFile} » ?`,
          hint: "Le journal web suggère la lecture d’un secret applicatif, puis le journal d’authentification montre quel compte sert juste après.",
          answerFormat: "Nom de compte en minuscules",
          accepted: compact([projet.compromisedAccount]),
          explanation: "Le compte compromis n’est pas deviné : il apparaît dans le succès SSH qui suit l’exploitation web. Cette transition de source est justement ce qui rend la conclusion défendable.",
        },
        {
          prompt: `À quelle heure UTC apparaît, dans « ${projet.assetNames.webFile} », la toute première requête de la source externe de l’incident réel, avant la première exécution de commande sur le serveur ?`,
          hint: "Identifie d’abord quelle alerte est le vrai incident et sa source externe, puis remonte dans le journal web jusqu’à la première requête de cette même source.",
          answerFormat: "Heure UTC au format HH:MM:SS",
          accepted: timeAnswers(projet.firstIncidentTime),
          explanation: "Il faut remonter à la toute première trace de la source externe appartenant à la chaîne de l’incident confirmé : elle précède les requêtes qui exécutent des commandes. Cette heure ouvre la chronologie défendable du rapport.",
        },
        {
          prompt: `Quelle adresse externe porte l’accès initial de l’incident réel en reliant « ${projet.assetNames.webFile} » et « ${projet.assetNames.authFile} » ?`,
          hint: "Cherche l’adresse qui apparaît d’abord dans l’exploitation web, puis plus tard dans l’authentification réussie.",
          answerFormat: "Adresse IPv4",
          accepted: compact([projet.attackerIp]),
          explanation: "L’adresse d’accès initial doit être retrouvée dans au moins deux sources de la chaîne réelle. C’est cette répétition qui permet d’éviter de confondre l’attaquant principal avec un simple scanner.",
        },
        {
          prompt: `Quelle destination de communication sortante est confirmée à la fois par « ${projet.assetNames.dnsFile} » et « ${projet.assetNames.proxyFile} » pendant l’incident réel ?`,
          hint: "Le DNS donne le nom et le proxy montre le port. Assemble les deux pour répondre au bon format.",
          answerFormat: "Hôte et port au format nom:port",
          accepted: compact([projet.outboundDestination]),
          explanation: "Le nom du domaine et le port ne sont pas visibles au même endroit. Il faut relier la résolution DNS et le tunnel proxy sur la même fenêtre horaire pour produire une destination complète et défendable.",
        },
        {
          prompt: "Pour l’étape où un fichier PHP téléversé devient une interface de commande distante, quelle technique de la liste ATT&CK de la grille est la plus adaptée ? Réponds par la lettre. a) T1110 b) T1505.003 c) T1078 d) T1071.001",
          hint: "Ne pense pas à la phase réseau ou au compte valide : concentre-toi sur l’outil web lui-même.",
          answerFormat: "Une seule lettre",
          accepted: letterAnswers(projet.attackTechniqueLetter),
          explanation: "L’étape visée n’est ni la force brute, ni le compte valide, ni le canal sortant. Elle correspond à l’usage d’un shell web, ce qui renvoie à la technique précise de la liste ATT&CK fournie.",
        },
        {
          prompt: "Quelle première action de confinement est la plus appropriée ? Réponds par la lettre. a) redémarrer le serveur compromis pour couper toutes les sessions b) supprimer les lignes suspectes des journaux avant le rapport c) isoler le serveur compromis du réseau sans l’éteindre, puis figer les preuves d) attendre la sauvegarde de nuit avant d’agir",
          hint: "Choisis l’action qui coupe la nuisance sans effacer les traces utiles à l’enquête.",
          answerFormat: "Une seule lettre",
          accepted: letterAnswers(projet.containmentLetter),
          explanation: "Le confinement initial doit interrompre la communication malveillante, mais aussi préserver les preuves encore en mémoire et dans les journaux. L’option correcte est donc celle qui isole la machine sans la redémarrer ni modifier les traces.",
        },
        {
          prompt: `Quel indicateur de destination peux-tu partager dans le rapport au format désarmé, en reprenant seulement le domaine confirmé par « ${projet.assetNames.dnsFile} » et « ${projet.assetNames.proxyFile} » ?`,
          hint: "La grille rappelle qu’un indicateur externe se partage sans lien actif, avec des points désarmés.",
          answerFormat: "Nom de domaine désarmé, par exemple exemple[.]org",
          accepted: compact([projet.indicatorDisarmed]),
          explanation: "Le domaine de destination doit être repris tel qu’il est confirmé par les preuves, mais écrit sous forme désarmée pour pouvoir être partagé sans devenir cliquable. C’est une pratique de rapport standard et explicite dans la grille.",
        },
        {
          prompt: "Quelle conclusion est défendable à l’issue du triage ? Réponds par la lettre. a) Les alertes de la semaine montrent seulement des erreurs de mot de passe et aucun incident b) Une exploitation web sur le serveur d’entrée est suivie d’une connexion SSH avec le compte compromis puis d’une sortie vers la même destination externe c) pc-reception01 a subi un chiffrement généralisé du parc d) Le prestataire a vidé les journaux du pare-feu pour masquer l’incident",
          hint: "Choisis seulement l’affirmation qui repose sur les faits effectivement confirmés par au moins deux sources.",
          answerFormat: "Une seule lettre",
          accepted: letterAnswers(projet.conclusionLetter),
          explanation: "Une conclusion défendable reprend uniquement ce que les preuves établissent vraiment. Parmi les propositions, une seule relie correctement l’exploitation web, l’authentification et la communication sortante confirmées par le corpus.",
        },
      ],
      assets: [
        asset("log", "Alertes de la semaine", "Les douze alertes à trier, avec leur heure UTC, la règle déclenchée, la machine et la gravité annoncée.", projet.assetNames.alertsFile),
        asset("log", "Inventaire des machines", "Les rôles, la criticité de 1 à 4 et le propriétaire de chaque machine du petit périmètre.", projet.assetNames.inventoryFile),
        asset("log", "Preuves Linux", "Le journal d’authentification du serveur de réservation, avec bruit normal, échec SSH et activité réussie.", projet.assetNames.authFile),
        asset("log", "Preuves Windows", "Les événements de sécurité et de création de processus exportés en CSV.", projet.assetNames.windowsFile),
        asset("log", "Preuves web", "Le journal d’accès du serveur web, avec trafic légitime, scans opportunistes et incident réel.", projet.assetNames.webFile),
        asset("log", "Preuves réseau", "Le journal du pare-feu et des autorisations ou blocages observés sur la semaine.", projet.assetNames.networkFile),
        asset("log", "Preuves DNS", "Les résolutions internes observées par dns01, avec bruit légitime et domaine inattendu.", projet.assetNames.dnsFile),
        asset("log", "Preuves proxy", "Le journal du mandataire web, utile pour confirmer les sorties et certains faux positifs.", projet.assetNames.proxyFile),
        asset("guide", "Grille de triage", "Les définitions de qualification, les valeurs de certitude, la formule de priorité et la courte liste ATT&CK utile.", projet.assetNames.gridFile),
        asset("report_template", "Modèle de rapport", "Une structure de rapport pour trier les alertes, la chronologie et les recommandations.", projet.assetNames.reportFile),
        asset("guide", "Guide de l’évaluation", "La méthode générale, des exemples inventés et des commandes de démonstration pour t’entraîner sans lire les réponses.", projet.assetNames.guideFile),
      ],
    },
  ];
}
