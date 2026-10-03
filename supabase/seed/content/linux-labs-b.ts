import type { PathLab } from "./reseaux-path";

export type LinuxLab = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsB {
  reseau: {
    assetNames: {
      networkFile: string;
      sshFile: string;
      authFile: string;
      ufwFile: string;
      keysFile: string;
      guideFile: string;
    };
    gateway: string;
    interface: string;
    prefix: number;
    permitRootLogin: string;
    passwordAuthenticationCfall: boolean;
    topFailureIp: string;
    invalidUsersCount: number;
    firstPasswordSuccessTime: string;
    passwordSuccessAccount: string;
    failuresBeforeSuccess: number;
    ufwWideRuleNumber: number;
    decisiveRuleNumber: number;
    rsaWeakCount: number;
    keysWithoutFromCount: number;
    sshPort: number;
  };
  maintenance: {
    assetNames: {
      updatesFile: string;
      disksFile: string;
      fstabFile: string;
      backupLogFile: string;
      snapshotsFile: string;
      copiesFile: string;
      scriptFile: string;
      guideFile: string;
    };
    updateCount: number;
    securityCount: number;
    opensshVersion: string;
    highUsageMount: string;
    inodePressureMount: string;
    noexecRiskMount: string;
    totalAvailableGiB: number;
    successNights: number;
    longestFailureStreak: number;
    lastSuccessDate: string;
    lastSuccessAgeDays: number;
    retainedSnapshots: number;
    restoreSnapshotId: string;
    badScriptLine: number;
    threeTwoOneRespected: boolean;
    missingCopyLetter: string;
  };
  scripts: {
    assetNames: {
      countScriptFile: string;
      cleanScriptFile: string;
      inventoryScriptFile: string;
      backupScriptFile: string;
      logFile: string;
      csvFile: string;
      candidatesFile: string;
      guideFile: string;
    };
    countCandidateBlock: number;
    countFailedLines: number;
    countTopIp: string;
    countOutputLines: number;
    countExitCode: number;
    cleanOldFiles: number;
    cleanUnquotedLine: number;
    emptyVarLetter: string;
    cleanRemainingFiles: number;
    inventoryFlagged: number;
    inventorySvcOutputLines: number;
    backupEvalLine: number;
    shellcheckCode: string;
    fixLetter: string;
    errexitAnswer: string;
    cleanNonOldFile: string;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const yesNo = (value: boolean) => (value ? compact(["oui", "yes"]) : compact(["non", "no"]));
const dateAnswers = (iso: string) => compact([iso, iso.split("-").reverse().join("/"), iso.split("-").reverse().join("-")]);
const timeAnswers = (hhmmss: string) => compact([hhmmss, hhmmss.replace(/^0/, "")]);
const numberWithUnits = (value: number, unit: string) => compact([value, `${value} ${unit}`, `${value}${unit}`]);

const asset = (kind: LinuxLab["assets"][number]["kind"], title: string, description: string, name: string) => ({
  kind,
  title,
  description,
  url: `/labs/${name}`,
});

export function buildLabsB(facts: FactsB): LinuxLab[] {
  const reseau = facts.reseau;
  const maintenance = facts.maintenance;
  const scripts = facts.scripts;

  return [
    {
      slug: "tp-linux-reseau-ssh",
      title: "TP 4 : réseau, SSH et pare-feu",
      description: "Tu relies la configuration réseau, la politique SSH, le journal d’authentification et les règles UFW pour décider ce qui est réellement exposé sur srv-web01.",
      difficulty: "intermediaire",
      xp: 160,
      format: "logs",
      minutes: 50,
      requiresComputer: false,
      isAssessment: false,
      category: "linux",
      briefing: "Le jeudi 9 avril 2026, Ousmane Diallo prépare un durcissement de l’accès distant à srv-web01. Il a exporté les informations réseau, la configuration SSH, un extrait d’auth.log de la nuit, les règles UFW et un relevé des clés autorisées. Dans le fichier SSH, les contenus sont présentés l’un après l’autre : le fichier principal, puis les fragments du dossier .d ; ce n’est pas l’ordre dans lequel sshd les lit réellement. Tu dois reconstituer ce qui est déjà correct, ce qui reste trop large et ce qu’un attaquant a réussi à faire. Le but n’est pas de mémoriser des options par cœur, mais de croiser plusieurs fichiers pour retrouver l’ordre réel des décisions.",
      constraints: [
        "Tu travailles uniquement sur les exports fictifs du labo, sans ouvrir de session SSH réelle.",
        "Les heures du journal sont en UTC et les règles UFW se lisent dans l’ordre affiché.",
      ],
      tools: [
        "Visionneuse du site pour rechercher une directive ou une adresse IP",
        "Git Bash avec grep, awk, sort et uniq si tu veux filtrer rapidement",
        "Windows PowerShell 5.1 avec Get-Content, Select-String et Group-Object",
      ],
      objectives: [
        "Relire une configuration réseau Linux et retrouver passerelle, interface et préfixe",
        "Appliquer correctement la règle « première valeur obtenue » dans sshd_config",
        "Distinguer bruit normal, échecs de mot de passe et succès significatif dans auth.log",
        "Décider le verdict d’un paquet en lisant les règles UFW dans le bon ordre",
        "Repérer une clé SSH faible ou mal documentée dans un relevé d’autorisations",
      ],
      hints: [
        "La valeur globale d’une option SSH ne se lit pas toujours sur la dernière ligne visible.",
        "Pour les échecs de mot de passe, groupe d’abord par adresse IP puis seulement par nom de compte.",
        "Le relevé de clés te donne à la fois des restrictions d’origine, un type, une taille et une empreinte.",
      ],
      tasks: [
        {
          prompt: `Dans ${reseau.assetNames.networkFile}, quelle est l’adresse de la passerelle par défaut de srv-web01 ?`,
          hint: "Lis la ligne qui commence par « default via » dans la partie des routes.",
          answerFormat: "Adresse IPv4",
          accepted: compact([reseau.gateway]),
          explanation: `La route par défaut indique vers quelle passerelle le serveur envoie le trafic qui sort de son réseau local. Ici, la ligne « default via » montre clairement ${reseau.gateway}, ce qui en fait la bonne réponse après une simple lecture de la table de routage.`,
        },
        {
          prompt: `Dans ${reseau.assetNames.networkFile}, quelle interface porte l’adresse du serveur sur le réseau interne 10.20.0.0/${reseau.prefix} ?`,
          hint: "Croise la section « ip -br a » avec la route du réseau interne pour retrouver le bon nom d’interface.",
          answerFormat: "Nom exact d’interface Linux",
          accepted: compact([reseau.interface]),
          explanation: `La section « ip -br a » montre l’adresse du serveur et la route du réseau local confirme quelle interface porte 10.20.0.10/${reseau.prefix}. Le bon nom est ${reseau.interface}. Cette méthode évite de répondre depuis une intuition sur le nom habituel des cartes réseau.`,
        },
        {
          prompt: `Toujours dans ${reseau.assetNames.networkFile}, quel est le préfixe CIDR du réseau local de srv-web01 ?`,
          hint: "Le suffixe après la barre oblique de l’adresse du serveur donne directement le préfixe.",
          answerFormat: "Un nombre entier, sans la barre oblique",
          accepted: compact([reseau.prefix, `/${reseau.prefix}`]),
          explanation: `L’adresse de srv-web01 est écrite avec son masque directement dans la sortie d’interface. Le préfixe visible est ${reseau.prefix}, soit /${reseau.prefix}. Lire le suffixe CIDR est la manière la plus rapide de retrouver la taille du réseau local.`,
        },
        {
          prompt: `En appliquant la règle « première valeur obtenue = valeur effective » au fichier ${reseau.assetNames.sshFile}, quelle est la valeur effective de PermitRootLogin ?`,
          hint: "La directive Include apparaît avant le reste du fichier principal : tiens compte de l’ordre réel de lecture.",
          answerFormat: "Valeur exacte de la directive, en minuscules",
          accepted: compact([reseau.permitRootLogin]),
          explanation: `La première valeur rencontrée pour PermitRootLogin est ${reseau.permitRootLogin}. Les lignes suivantes visibles dans le même fichier concaténé ne remplacent pas cette valeur globale. Il faut donc lire dans l’ordre d’obtention réel, pas seulement prendre la dernière occurrence affichée.`,
        },
        {
          prompt: `Dans ${reseau.assetNames.sshFile}, quelle est la valeur effective de PasswordAuthentication pour l’utilisateur cfall ?`,
          hint: "Commence par la valeur globale, puis vérifie si un bloc Match User s’applique explicitement à ce compte.",
          answerFormat: "oui ou non",
          accepted: yesNo(reseau.passwordAuthenticationCfall),
          explanation: `La valeur globale visible plus haut est complétée par un bloc Match dédié à cfall. Comme ce bloc s’applique à cet utilisateur, PasswordAuthentication devient ${reseau.passwordAuthenticationCfall ? "oui" : "non"} pour ce cas précis. Il faut donc croiser la valeur globale et le contexte du bloc Match concerné.`,
        },
        {
          prompt: `Dans ${reseau.assetNames.authFile}, quelle adresse IP cumule le plus d’échecs de mot de passe ?`,
          hint: "Filtre d’abord les lignes « Failed password », puis groupe-les par adresse IP source.",
          answerFormat: "Adresse IPv4",
          accepted: compact([reseau.topFailureIp]),
          explanation: `Après regroupement des lignes « Failed password », l’adresse ${reseau.topFailureIp} arrive nettement en tête. C’est cette adresse qu’il faut retenir pour caractériser la source la plus insistante du journal.`,
        },
        {
          prompt: `Dans ${reseau.assetNames.authFile}, combien de noms d’utilisateurs inexistants différents ont été tentés au moins une fois ?`,
          hint: "Ne compte que les lignes « invalid user » et retiens les noms distincts, pas le nombre total d’échecs.",
          answerFormat: "Un nombre entier",
          accepted: compact([reseau.invalidUsersCount]),
          explanation: `Le journal distingue les comptes existants des comptes inexistants avec la mention « invalid user ». En comptant les noms distincts de cette seule catégorie, on obtient ${reseau.invalidUsersCount}. Cette différence entre total d’échecs et comptes distincts est importante pour qualifier la nature du bruit observé.`,
        },
        {
          prompt: `Dans ${reseau.assetNames.authFile}, à quelle heure UTC apparaît le premier succès par mot de passe ?`,
          hint: "Cherche « Accepted password », puis garde la première ligne par ordre chronologique.",
          answerFormat: "HH:MM:SS",
          accepted: timeAnswers(reseau.firstPasswordSuccessTime),
          explanation: `Le premier succès par mot de passe apparaît à ${reseau.firstPasswordSuccessTime} UTC. Cette lecture demande de distinguer les succès par clé publique, normaux pour l’administration, des succès par mot de passe, beaucoup plus sensibles dans ce contexte.`,
        },
        {
          prompt: `Toujours dans ${reseau.assetNames.authFile}, quel compte est concerné par ce premier succès par mot de passe ?`,
          hint: "Lis le nom de compte sur la même ligne que le premier « Accepted password ».",
          answerFormat: "Nom de compte Linux, en minuscules",
          accepted: compact([reseau.passwordSuccessAccount]),
          explanation: `La ligne du premier « Accepted password » cite explicitement le compte ${reseau.passwordSuccessAccount}. La bonne méthode consiste à retrouver d’abord l’heure du succès, puis à relire la même ligne pour isoler le compte sans te laisser distraire par les lignes voisines.`,
        },
        {
          prompt: `Dans ${reseau.assetNames.authFile}, combien d’échecs précèdent ce premier succès depuis la même adresse IP ?`,
          hint: "Conserve la même adresse source que la ligne du succès, puis ne compte que les échecs antérieurs.",
          answerFormat: "Un nombre entier",
          accepted: compact([reseau.failuresBeforeSuccess]),
          explanation: `Avant le premier succès par mot de passe depuis cette adresse, le journal montre ${reseau.failuresBeforeSuccess} échecs. Cette chronologie appuie l’idée d’une tentative insistante plutôt que d’une simple erreur ponctuelle d’un utilisateur légitime.`,
        },
        {
          prompt: `Dans ${reseau.assetNames.ufwFile}, quel numéro de règle UFW ouvre inutilement un port à tout Internet alors que le SSH effectif n’écoute pas dessus ?`,
          hint: "Croise le port réellement retenu dans la configuration SSH avec les règles UFW autorisant « Anywhere ».",
          answerFormat: "Un nombre entier",
          accepted: compact([reseau.ufwWideRuleNumber]),
          explanation: `Le port SSH réellement retenu dans la configuration n’est pas celui que cette règle large expose à tout le monde. La règle inutilement permissive est la numéro ${reseau.ufwWideRuleNumber}. Il faut croiser deux fichiers pour le voir : la configuration SSH et les règles UFW.`,
        },
        {
          prompt: `Dans ${reseau.assetNames.ufwFile}, pour un paquet TCP entrant depuis 203.0.113.90 vers le port SSH effectif du serveur, quel numéro de règle UFW décide du sort du paquet ?`,
          hint: "Retrouve d’abord le port SSH effectif dans la configuration, puis lis les règles UFW dans l’ordre numérique jusqu’à la première qui correspond.",
          answerFormat: "Un nombre entier",
          accepted: compact([reseau.decisiveRuleNumber]),
          explanation: `La règle décisive est la numéro ${reseau.decisiveRuleNumber}. Une règle plus générale apparaît plus bas, mais elle ne sera jamais consultée ici, car la première règle compatible avec cette source et ce port tranche déjà le verdict.`,
        },
        {
          prompt: `Dans ${reseau.assetNames.keysFile}, combien de clés RSA autorisées ont une taille strictement inférieure à 3072 bits ?`,
          hint: "Repère les lignes RSA, puis compare leur taille à la borne générale donnée par le guide.",
          answerFormat: "Un nombre entier",
          accepted: compact([reseau.rsaWeakCount]),
          explanation: `Le guide fixe une borne générale de 3072 bits pour les clés RSA d’administration. En croisant type et taille, on trouve ${reseau.rsaWeakCount} clés RSA en dessous de ce seuil, ce qui justifie une revue ou un remplacement.`,
        },
        {
          prompt: `Dans ${reseau.assetNames.keysFile}, combien de clés autorisées n’ont aucune restriction « from= » ?`,
          hint: "Relis seulement la partie des options au début de chaque ligne, sans te laisser distraire par le type ou l’empreinte.",
          answerFormat: "Un nombre entier",
          accepted: compact([reseau.keysWithoutFromCount]),
          explanation: `La restriction « from= » borne les adresses autorisées à utiliser une clé. En relisant les options d’ouverture de ligne, on voit que ${reseau.keysWithoutFromCount} clés n’ont pas cette restriction. Cette absence n’est pas toujours interdite, mais elle mérite une revue pour les usages d’administration.`,
        },
        {
          prompt: `Toujours dans ${reseau.assetNames.sshFile}, quel port SSH est réellement à l’écoute après application de l’ordre de lecture effectif ?`,
          hint: "Cherche toutes les directives Port, mais retiens la première réellement obtenue.",
          answerFormat: "Numéro de port",
          accepted: compact([reseau.sshPort]),
          explanation: `Le port réellement retenu est ${reseau.sshPort}. Ici encore, il faut relire l’ordre d’obtention causé par Include avant de conclure. Une règle UFW sur un autre port peut donc rester présente sans protéger le vrai service.`,
        },
      ],
      assets: [
        asset("log", `Informations réseau (${reseau.assetNames.networkFile})`, "Sorties ip, voisinage ARP, resolv.conf et hosts de srv-web01.", reseau.assetNames.networkFile),
        asset("log", `Configuration SSH concaténée (${reseau.assetNames.sshFile})`, "Fichier principal, fichiers inclus et blocs Match lus dans leur ordre réel.", reseau.assetNames.sshFile),
        asset("log", `Journal d’authentification (${reseau.assetNames.authFile})`, "Bruit normal, connexions légitimes, échecs et un succès par mot de passe à analyser.", reseau.assetNames.authFile),
        asset("log", `Règles et journal UFW (${reseau.assetNames.ufwFile})`, "État numéroté du pare-feu et quelques lignes du journal noyau.", reseau.assetNames.ufwFile),
        asset("log", `Relevé des clés autorisées (${reseau.assetNames.keysFile})`, "Empreintes, tailles, types et commentaires des clés autorisées sur le serveur.", reseau.assetNames.keysFile),
        asset("guide", "Guide du TP 4", "Méthode pas à pas, commandes bash, variantes PowerShell et rappels sur l’ordre des règles.", reseau.assetNames.guideFile),
      ],
    },
    {
      slug: "tp-linux-maj-sauvegardes",
      title: "TP 5 : mises à jour, disques et sauvegardes",
      description: "Tu fais l’état d’un serveur de fichiers avant audit en croisant les mises à jour en attente, la pression sur les disques, fstab, les journaux de sauvegarde, les instantanés et un script restic.",
      difficulty: "intermediaire",
      xp: 150,
      format: "logs",
      minutes: 45,
      requiresComputer: false,
      isAssessment: false,
      category: "linux",
      briefing: "Le lundi 13 avril 2026, Ousmane Diallo prépare l’audit annuel de srv-fichiers01. Il a exporté la liste des paquets à mettre à jour, l’état des systèmes de fichiers, le contenu de fstab, trente nuits de journaux de sauvegarde, la liste des instantanés restic et le script de sauvegarde nocturne. Tu dois produire des constats utiles, pas seulement recopier des lignes. La difficulté principale consiste à séparer ce qui relève des blocs disque, des inodes, de la rétention et des risques de configuration.",
      constraints: [
        "Tu interprètes uniquement les exports fournis, sans lancer de mise à jour ni de vraie sauvegarde.",
        "La date de référence pour les calculs d’ancienneté est le 13 avril 2026 et toutes les heures sont en UTC.",
      ],
      tools: [
        "Visionneuse du site pour repérer rapidement un paquet ou une date",
        "Git Bash avec grep pour filtrer les lignes utiles",
        "Windows PowerShell 5.1 avec Select-String et Import-Csv si tu préfères ce format",
      ],
      objectives: [
        "Compter correctement les mises à jour et distinguer les correctifs de sécurité",
        "Lire la pression sur les disques en blocs et en inodes sans les confondre",
        "Appliquer une règle de durcissement simple aux options de montage",
        "Mesurer la fraîcheur et la fiabilité réelles des sauvegardes",
        "Relire un script de sauvegarde pour trouver une ligne techniquement risquée",
      ],
      hints: [
        "Dans apt, seules les lignes de paquets comptent, pas la ligne « Listing... » ni os-release.",
        "Le système de fichiers le plus plein en blocs n’est pas forcément celui qui manque d’inodes.",
        "La politique de rétention est donnée telle quelle : ne rajoute pas de règle quotidienne ou mensuelle non écrite.",
      ],
      tasks: [
        {
          prompt: `Dans ${maintenance.assetNames.updatesFile}, combien de paquets sont en attente de mise à jour ?`,
          hint: "Compte uniquement les lignes de paquets listées dans la section apt list --upgradable.",
          answerFormat: "Un nombre entier",
          accepted: compact([maintenance.updateCount]),
          explanation: `Le nombre total se calcule en comptant les lignes de paquets réellement proposées par apt. Ici, on en trouve ${maintenance.updateCount}. Cette méthode évite de compter la ligne « Listing... » ou les lignes de /etc/os-release qui ne sont pas des mises à jour.`,
        },
        {
          prompt: `Toujours dans ${maintenance.assetNames.updatesFile}, combien de mises à jour proviennent explicitement du canal de sécurité ?`,
          hint: "Cherche le suffixe « -security » dans la provenance de chaque paquet.",
          answerFormat: "Un nombre entier",
          accepted: compact([maintenance.securityCount]),
          explanation: `Le canal de sécurité apparaît directement dans le nom de provenance du paquet. En ne gardant que ces lignes, on compte ${maintenance.securityCount} mises à jour de sécurité. C’est un bon premier indicateur de l’exposition immédiate du système.`,
        },
        {
          prompt: `Dans ${maintenance.assetNames.updatesFile}, quelle version d’openssh-server est proposée par apt ?`,
          hint: "Lis la ligne du paquet openssh-server et retiens la version située avant l’architecture.",
          answerFormat: "Version complète du paquet",
          accepted: compact([maintenance.opensshVersion]),
          explanation: `La ligne du paquet openssh-server annonce la version ${maintenance.opensshVersion}. Relever la version proposée plutôt que la version précédente permet de savoir ce qu’apt installerait réellement si l’on lançait la mise à jour.`,
        },
        {
          prompt: `Dans ${maintenance.assetNames.disksFile}, quel point de montage dépasse 90 % d’occupation en blocs et est donc le plus critique de ce point de vue ?`,
          hint: "Lis la section df -h et compare uniquement la colonne Use%.",
          answerFormat: "Chemin de point de montage absolu",
          accepted: compact([maintenance.highUsageMount, `${maintenance.highUsageMount}/`]),
          explanation: `Dans la section df -h, le point de montage ${maintenance.highUsageMount} dépasse 90 % et atteint la pression la plus forte. Ici, on raisonne bien sur l’occupation en blocs, pas sur les inodes ni sur la taille totale brute du disque.`,
        },
        {
          prompt: `Dans ${maintenance.assetNames.disksFile}, quel point de montage est presque à court d’inodes ?`,
          hint: "Cette fois, utilise uniquement la section df -i et compare IUse%.",
          answerFormat: "Chemin de point de montage absolu",
          accepted: compact([maintenance.inodePressureMount, `${maintenance.inodePressureMount}/`]),
          explanation: `Le point de montage ${maintenance.inodePressureMount} atteint le pourcentage d’inodes le plus préoccupant. Un système peut manquer d’inodes même quand plusieurs gigaoctets restent libres, d’où l’intérêt de lire les deux tableaux séparément.`,
        },
        {
          prompt: `En croisant ${maintenance.assetNames.disksFile} et ${maintenance.assetNames.fstabFile}, quel point de montage temporaire présente un risque parce qu’il lui manque l’option noexec selon la règle du guide ?`,
          hint: "Cherche le point de montage temporaire cité dans le guide, puis relis ses options dans findmnt et fstab.",
          answerFormat: "Chemin de point de montage absolu",
          accepted: compact([maintenance.noexecRiskMount, `${maintenance.noexecRiskMount}/`]),
          explanation: `Le point de montage concerné est ${maintenance.noexecRiskMount}. Les options visibles montrent déjà nodev et nosuid, mais pas noexec. Pour ce type d’emplacement temporaire, l’absence de cette option reste un signal de risque selon la règle générale du guide.`,
        },
        {
          prompt: `Dans ${maintenance.assetNames.disksFile}, quelle est la somme de la colonne Avail de toutes les lignes de la section df -h (tmpfs compris), exprimée en gibioctets (le « G » de df -h) et arrondie à un chiffre après la virgule ?`,
          hint: "Additionne la colonne Avail de chaque ligne de la section df -h, sans utiliser les autres sections du fichier.",
          answerFormat: "Un nombre décimal avec un chiffre après la virgule",
          accepted: compact([maintenance.totalAvailableGiB, String(maintenance.totalAvailableGiB).replace(".", ","), `${maintenance.totalAvailableGiB} g`, `${String(maintenance.totalAvailableGiB).replace(".", ",")} g`]),
          explanation: `En additionnant l’espace disponible de chaque ligne de la section df -h, tmpfs compris, on obtient ${maintenance.totalAvailableGiB} Gio. Cette addition donne une vue synthétique de la marge totale restante, même si chaque point de montage a ensuite sa propre urgence.`,
        },
        {
          prompt: `Dans ${maintenance.assetNames.backupLogFile}, combien de nuits sur 30 se terminent par un statut SUCCESS ?`,
          hint: "Ne compte que les lignes dont le statut est exactement SUCCESS.",
          answerFormat: "Un nombre entier",
          accepted: compact([maintenance.successNights]),
          explanation: `Le journal compte ${maintenance.successNights} nuits réellement réussies. Les lignes FAIL documentent des tentatives, mais elles ne doivent pas être comptées comme des sauvegardes utilisables.`,
        },
        {
          prompt: `Toujours dans ${maintenance.assetNames.backupLogFile}, quelle est la plus longue série d’échecs consécutifs ?`,
          hint: "Lis le journal dans l’ordre des dates et repère la plus longue suite continue de lignes FAIL.",
          answerFormat: "Un nombre entier",
          accepted: compact([maintenance.longestFailureStreak]),
          explanation: `La plus longue série d’échecs successifs vaut ${maintenance.longestFailureStreak}. Cette mesure décrit mieux la fragilité opérationnelle qu’un simple nombre total d’échecs, car plusieurs nuits ratées d’affilée augmentent fortement le risque de perte.`,
        },
        {
          prompt: `Dans ${maintenance.assetNames.backupLogFile}, quelle est la date de la dernière sauvegarde réussie avant le 13 avril 2026 ?`,
          hint: "Pars de la fin du fichier et remonte jusqu’à la première ligne SUCCESS.",
          answerFormat: "AAAA-MM-JJ",
          accepted: dateAnswers(maintenance.lastSuccessDate),
          explanation: `La dernière ligne SUCCESS avant la date d’audit correspond au ${maintenance.lastSuccessDate}. Les échecs plus récents ne changent pas cette date de dernière sauvegarde effectivement exploitable.`,
        },
        {
          prompt: `Toujours à partir de ${maintenance.assetNames.backupLogFile}, quelle est l’ancienneté de cette dernière sauvegarde réussie au 13 avril 2026 ?`,
          hint: "Prends la date de la dernière réussite puis calcule la différence en jours calendaires jusqu’au 13 avril 2026.",
          answerFormat: "Un nombre entier de jours",
          accepted: compact([maintenance.lastSuccessAgeDays]),
          explanation: `La dernière sauvegarde réussie date du ${maintenance.lastSuccessDate}. Entre cette date et le 13 avril 2026, il s’écoule ${maintenance.lastSuccessAgeDays} jours calendaires. C’est cette ancienneté qui intéresse l’audit, pas la date du dernier essai tout court.`,
        },
        {
          prompt: `En appliquant la politique donnée dans le guide au fichier ${maintenance.assetNames.snapshotsFile}, et en sachant que dans ce labo chaque instantané porte une seule étiquette qui dit à quelle règle de conservation il appartient, combien d’instantanés sont conservés avec la règle « garder au plus 7 daily, 4 weekly et 2 monthly » ?`,
          hint: "Appuie-toi sur la colonne des tags et sur le plafond de chaque catégorie donné dans le guide.",
          answerFormat: "Un nombre entier",
          accepted: compact([maintenance.retainedSnapshots]),
          explanation: `La politique s’applique par catégorie et conserve seulement les plus récents de chaque type. En l’appliquant à la liste fournie, on garde ${maintenance.retainedSnapshots} instantanés. Il ne faut pas inventer de règle supplémentaire ni fusionner daily, weekly et monthly dans un seul compteur.`,
        },
        {
          prompt: `Dans ${maintenance.assetNames.snapshotsFile}, quel identifiant d’instantané faut-il restaurer pour retrouver l’état de la veille d’un incident survenu le 11 avril 2026 à 15:00 UTC ?`,
          hint: "Cherche l’instantané le plus récent dont l’horodatage reste antérieur à la date et à l’heure données.",
          answerFormat: "Identifiant court de snapshot restic",
          accepted: compact([maintenance.restoreSnapshotId]),
          explanation: `Pour revenir à l’état de la veille de l’incident, il faut choisir le dernier instantané antérieur à cette date, soit ${maintenance.restoreSnapshotId}. Le raisonnement consiste à lire les horodatages et non à prendre automatiquement le plus récent tout court.`,
        },
        {
          prompt: `Dans ${maintenance.assetNames.scriptFile}, quelle ligne est défectueuse parce qu’elle envoie un chemin potentiellement contenant des espaces sans le protéger correctement ?`,
          hint: "Cherche la commande restic qui reprend la variable du chemin source telle quelle.",
          answerFormat: "Numéro de ligne",
          accepted: compact([maintenance.badScriptLine]),
          explanation: `La ligne ${maintenance.badScriptLine} réutilise la variable du chemin source sans la protéger correctement. Avec un chemin qui contient des espaces, la commande peut alors recevoir plusieurs arguments au lieu d’un seul, ce qui change complètement son comportement.`,
        },
        {
          prompt: `D’après les informations de ${maintenance.assetNames.backupLogFile}, ${maintenance.assetNames.snapshotsFile}, ${maintenance.assetNames.copiesFile} et ${maintenance.assetNames.scriptFile}, la règle 3-2-1 est-elle respectée ?`,
          hint: "Applique la règle de validité d’une copie du guide à la date d’audit du 13 avril 2026, puis vérifie chaque condition de la règle 3-2-1 sur des preuves positives.",
          answerFormat: "oui ou non",
          accepted: yesNo(maintenance.threeTwoOneRespected),
          explanation: `La réponse correcte est ${maintenance.threeTwoOneRespected ? "oui" : "non"}. Au 13 avril 2026, trois copies comptent (la production, le miroir USB et le dépôt restic local) et elles reposent sur au moins deux supports différents. En revanche, la seule copie hors site est en échec et sa dernière synchronisation date du 30 mars : elle ne compte pas, il n’existe donc aucune copie hors site valide.`,
        },
        {
          prompt: `Parmi les trois critères de la règle 3-2-1, lequel n’est pas satisfait d’après ${maintenance.assetNames.copiesFile}, une fois la règle de validité d’une copie appliquée ? a) avoir trois copies b) avoir deux supports différents c) avoir une copie hors site d) aucun, les trois critères sont satisfaits`,
          hint: "Compte d’abord les copies valides à la date d’audit du 13 avril 2026, puis leurs supports, puis cherche une copie hors site valide.",
          answerFormat: "Une seule lettre",
          accepted: compact([maintenance.missingCopyLetter]),
          explanation: `Le critère qui n’est pas satisfait est la copie hors site valide, donc la lettre attendue est ${maintenance.missingCopyLetter}. Il y a bien trois copies valides et plusieurs supports, mais la copie distante, en échec depuis le 30 mars, ne compte pas.`,
        },
      ],
      assets: [
        asset("log", `Mises à jour et version système (${maintenance.assetNames.updatesFile})`, "Extrait de /etc/os-release et sortie apt list --upgradable.", maintenance.assetNames.updatesFile),
        asset("log", `Disques, inodes et montages (${maintenance.assetNames.disksFile})`, "Sorties df -h, df -i, lsblk -f et findmnt de srv-fichiers01.", maintenance.assetNames.disksFile),
        asset("log", `Table de montage (${maintenance.assetNames.fstabFile})`, "Contenu réaliste de /etc/fstab à relire avec les options de montage.", maintenance.assetNames.fstabFile),
        asset("log", `Journal des sauvegardes (${maintenance.assetNames.backupLogFile})`, "Trente nuits d’exécution avec succès, échecs et panne d’espace disque.", maintenance.assetNames.backupLogFile),
        asset("log", `Liste des instantanés restic (${maintenance.assetNames.snapshotsFile})`, "Instantanés daily, weekly et monthly à relire avec une politique de rétention donnée.", maintenance.assetNames.snapshotsFile),
        asset("log", `Inventaire des copies de sauvegarde (${maintenance.assetNames.copiesFile})`, "Copies locales et distante, avec support, emplacement, date de synchronisation et statut.", maintenance.assetNames.copiesFile),
        asset("log", `Script de sauvegarde nocturne (${maintenance.assetNames.scriptFile})`, "Script shell court qui synchronise un miroir local puis lance restic.", maintenance.assetNames.scriptFile),
        asset("guide", "Guide du TP 5", "Méthode, règles de rétention, variantes de commandes et points de contrôle pour l’audit.", maintenance.assetNames.guideFile),
      ],
    },
    {
      slug: "tp-linux-scripts",
      title: "TP 6 : lire, tester et corriger des scripts shell",
      description: "Tu exécutes réellement quatre petits scripts bash du labo, puis tu relies leurs sorties à des défauts classiques de robustesse comme les variables non protégées, les suppressions trop larges et l’usage de eval.",
      difficulty: "intermediaire",
      xp: 150,
      format: "logs",
      minutes: 45,
      requiresComputer: false,
      isAssessment: false,
      category: "linux",
      briefing: "Le mardi 14 avril 2026, Cheikh Fall a préparé quatre petits scripts pour automatiser quelques contrôles. Ousmane Diallo veut les relire avant de les réutiliser. Les scripts comptent des échecs de connexion, nettoient un dossier de test dans un répertoire temporaire, signalent des comptes non conformes et construisent une commande d’archivage à partir d’un argument. Tu dois donc à la fois prédire le résultat obtenu sur les données fournies et repérer les défauts de sécurité ou de robustesse qui apparaissent dans le code.",
      constraints: [
        "Les scripts opèrent uniquement sur les fichiers du labo ou sur un dossier temporaire qu’ils créent eux-mêmes.",
        "Le but est de comprendre et corriger, pas de lancer des scripts sur un vrai système de production.",
      ],
      tools: [
        "Git Bash pour exécuter les scripts bash du labo tels quels",
        "Windows PowerShell 5.1 pour lire les fichiers et lancer bash.exe si besoin",
        "La visionneuse du site pour relire rapidement une ligne fautive ou un bloc de sortie attendu",
      ],
      objectives: [
        "Exécuter un script simple et comparer sa sortie à ce que font réellement grep, awk et uniq",
        "Repérer une variable de chemin non protégée et comprendre l’effet d’un espace ou d’une valeur vide",
        "Lire un script d’inventaire qui combine règle métier et résumé final",
        "Reconnaître le risque d’une commande construite depuis une entrée utilisateur",
      ],
      hints: [
        "Pour un script bash, commence toujours par la syntaxe, puis relis chaque variable avant l’exécution.",
        "Une variable non protégée devient particulièrement dangereuse dès qu’un chemin contient un espace.",
        "Quand un script affiche un résumé final, n’oublie pas de regarder aussi cette dernière ligne.",
        "Le fichier des sorties candidates aide à reconnaître un bloc, mais ne remplace pas la lecture réelle du script.",
      ],
      tasks: [
        {
          prompt: `Quel bloc numéroté de ${scripts.assetNames.candidatesFile} correspond exactement à la sortie de ${scripts.assetNames.countScriptFile} lorsqu’il lit ${scripts.assetNames.logFile} ?`,
          hint: "Compare le format du résumé et l’ordre réel des trois adresses affichées par le script.",
          answerFormat: "Un nombre entier de bloc",
          accepted: compact([scripts.countCandidateBlock]),
          explanation: `Le bloc correct est le numéro ${scripts.countCandidateBlock}. Pour le retrouver proprement, il faut comprendre que le script affiche d’abord un total, puis les trois adresses IP les plus fréquentes parmi les lignes d’échec du journal.`,
        },
        {
          prompt: `Combien de lignes d’échec le script ${scripts.assetNames.countScriptFile} compte-t-il réellement dans ${scripts.assetNames.logFile} ?`,
          hint: "Relis le motif de recherche du script, puis confronte-le au journal ou à son exécution réelle.",
          answerFormat: "Un nombre entier",
          accepted: compact([scripts.countFailedLines]),
          explanation: `Le script compte ${scripts.countFailedLines} lignes contenant « Failed password ». Cette réponse peut se vérifier de deux façons indépendantes : en exécutant réellement le script ou en comptant les lignes correspondantes dans le journal fourni.`,
        },
        {
          prompt: `Dans la sortie de ${scripts.assetNames.countScriptFile}, quelle adresse IP arrive en tête du classement ?`,
          hint: "Observe le premier élément du classement réellement produit, sans te limiter au premier paquet du journal.",
          answerFormat: "Adresse IPv4",
          accepted: compact([scripts.countTopIp]),
          explanation: `L’adresse ${scripts.countTopIp} arrive en tête, car c’est elle qui apparaît le plus souvent dans les lignes d’échec. La méthode consiste à regrouper les adresses et à comparer leurs fréquences plutôt qu’à parcourir le journal à l’œil.`,
        },
        {
          prompt: `Combien de lignes de sortie standard produit ${scripts.assetNames.countScriptFile} lorsqu’il reçoit ${scripts.assetNames.logFile} comme argument ?`,
          hint: "Regarde la forme complète de la sortie standard, du résumé jusqu’au classement.",
          answerFormat: "Un nombre entier",
          accepted: compact([scripts.countOutputLines]),
          explanation: `Le script produit ${scripts.countOutputLines} lignes sur la sortie standard : une ligne de total, puis trois lignes de classement. Distinguer la structure de sortie aide à reconnaître le bon bloc parmi les propositions du fichier d’attendus.`,
        },
        {
          prompt: `Quel code de retour renvoie ${scripts.assetNames.countScriptFile} lorsqu’il est lancé correctement avec ${scripts.assetNames.logFile} ?`,
          hint: "Un script qui termine sans erreur et sans appel explicite à exit différent de zéro renvoie normalement le code zéro.",
          answerFormat: "Un nombre entier",
          accepted: compact([scripts.countExitCode]),
          explanation: `Le code de retour est ${scripts.countExitCode}. Le script trouve son fichier, compte les lignes et termine sans erreur explicite. Vérifier le code de sortie fait partie d’une lecture complète d’un script, au-delà de l’écran affiché.`,
        },
        {
          prompt: `Lorsqu’on lance ${scripts.assetNames.cleanScriptFile} sans argument, combien de fichiers anciens de plus de 30 jours détecte-t-il dans son dossier temporaire de démonstration ?`,
          hint: "Lis ou exécute le script : il crée quatre fichiers, puis calcule d’abord le nombre de candidats anciens avant toute suppression.",
          answerFormat: "Un nombre entier",
          accepted: compact([scripts.cleanOldFiles]),
          explanation: `Le script détecte ${scripts.cleanOldFiles} fichiers anciens. Cette valeur vient du comptage effectué avant la suppression potentielle. Comprendre l’ordre des opérations évite de confondre les fichiers candidats et les fichiers réellement retirés ensuite.`,
        },
        {
          prompt: `Dans ${scripts.assetNames.cleanScriptFile}, quelle ligne contient la variable de chemin non protégée la plus dangereuse ?`,
          hint: "Cherche la ligne de suppression qui réutilise directement la variable du dossier et un joker.",
          answerFormat: "Numéro de ligne",
          accepted: compact([scripts.cleanUnquotedLine]),
          explanation: `La ligne ${scripts.cleanUnquotedLine} réutilise la variable de chemin sans la protéger. Avec un espace ou une valeur vide, l’expansion du shell change complètement ce qui sera passé à rm. C’est le défaut central du script de nettoyage.`,
        },
        {
          prompt: `Dans ${scripts.assetNames.cleanScriptFile}, même si on protège correctement la variable de chemin, quel fichier non ancien serait quand même visé par le joker de suppression ?`,
          hint: "Compare les fichiers considérés comme anciens avec la portée réelle du motif utilisé dans la ligne rm.",
          answerFormat: "Nom exact du fichier",
          accepted: compact([scripts.cleanNonOldFile]),
          explanation: `Même avec une variable bien protégée, le motif de suppression reste trop large : il vise tous les fichiers du dossier. Le fichier non ancien qui serait donc touché est ${scripts.cleanNonOldFile}. Cela montre que corriger les guillemets ne suffit pas quand la logique de sélection elle-même est trop large.`,
        },
        {
          prompt: `Combien de fichiers restent dans le dossier temporaire à la fin de l’exécution de ${scripts.assetNames.cleanScriptFile} sans argument ?`,
          hint: "Le chemin créé par défaut contient un espace : observe l’effet de ce détail sur la commande rm non protégée.",
          answerFormat: "Un nombre entier",
          accepted: compact([scripts.cleanRemainingFiles]),
          explanation: `À la fin, il reste ${scripts.cleanRemainingFiles} fichiers. Le script annonce bien des candidats anciens, mais la suppression échoue à cause du chemin non protégé contenant un espace. L’exécution réelle confirme donc le défaut théorique du code.`,
        },
        {
          prompt: `Dans ${scripts.assetNames.csvFile}, combien de comptes ${scripts.assetNames.inventoryScriptFile} signale-t-il au total comme non conformes lorsqu’on l’exécute sans filtre supplémentaire ?`,
          hint: "Relis la règle métier du script, puis vérifie quels comptes du CSV y correspondent réellement.",
          answerFormat: "Un nombre entier",
          accepted: compact([scripts.inventoryFlagged]),
          explanation: `Le script signale ${scripts.inventoryFlagged} comptes au total. Cette réponse demande de croiser la règle métier codée dans le script avec les colonnes du CSV, puis de compter seulement les lignes effectivement retenues par awk.`,
        },
        {
          prompt: `Combien de lignes affiche ${scripts.assetNames.inventoryScriptFile} lorsqu’on lui passe ${scripts.assetNames.csvFile} et le préfixe « svc- » ?`,
          hint: "Regarde la sortie complète jusqu’au résumé final, pas seulement les comptes listés avant lui.",
          answerFormat: "Un nombre entier",
          accepted: compact([scripts.inventorySvcOutputLines]),
          explanation: `Avec le préfixe « svc- », le script produit ${scripts.inventorySvcOutputLines} lignes. Il liste d’abord les comptes de service concernés, puis ajoute toujours une ligne de total final. Compter cette dernière fait partie de la lecture exacte de la sortie.`,
        },
        {
          prompt: `Dans ${scripts.assetNames.backupScriptFile}, quelle ligne exécute avec eval le texte assemblé à partir de l’entrée utilisateur ?`,
          hint: "Repère d’abord l’endroit où le script passe d’un simple texte stocké à une exécution réelle par le shell.",
          answerFormat: "Numéro de ligne",
          accepted: compact([scripts.backupEvalLine]),
          explanation: `La ligne ${scripts.backupEvalLine} exécute avec eval le texte préparé juste avant. Même si l’exemple reste inoffensif dans ce labo, cette étape transforme une simple chaîne en commande shell réelle, ce qui ouvre la porte à une injection si l’entrée n’est pas validée.`,
        },
        {
          prompt: `Quel identifiant ShellCheck correspond au défaut de variable non protégée visible dans ${scripts.assetNames.cleanScriptFile} ?`,
          hint: "Colle le script dans ShellCheck, sur le site officiel, ou relis la leçon sur les scripts fiables.",
          answerFormat: "Code ShellCheck, en minuscules",
          accepted: compact([scripts.shellcheckCode]),
          explanation: `Le code attendu est ${scripts.shellcheckCode.toUpperCase()}. Le connaître aide à relier un avertissement d’outil à un défaut concret de robustesse dans un vrai script shell.`,
        },
        {
          prompt: `Quelle correction est correcte pour la ligne dangereuse de ${scripts.assetNames.cleanScriptFile} ? Réponds par une lettre. a) rm -f $cleanup_dir/* b) rm -f -- \"$cleanup_dir\"/* c) rm -f \"$cleanup_dir*\" d) rm -f '$cleanup_dir'/*`,
          hint: "Une seule proposition protège correctement la variable tout en laissant le motif s’appliquer au bon dossier.",
          answerFormat: "Une seule lettre",
          accepted: compact([scripts.fixLetter]),
          explanation: `La bonne réponse est ${scripts.fixLetter}. Cette écriture protège bien la variable de chemin tout en laissant le joker s’appliquer aux fichiers du dossier visé. Les autres variantes cassent soit l’expansion, soit la sécurité de la commande.`,
        },
        {
          prompt: "Quelle option de « set » fait échouer un script au premier code de retour non nul ?",
          hint: "Retrouve dans la leçon sur les scripts fiables l’option qui interrompt un script dès qu’une commande simple échoue.",
          answerFormat: "Réponse courte, par exemple set -x",
          accepted: compact([scripts.errexitAnswer, "-e", "set -o errexit", "-o errexit"]),
          explanation: `La bonne réponse est ${scripts.errexitAnswer}. Cette option demande au shell d’arrêter le script dès qu’une commande simple échoue, ce qui évite souvent de continuer sur un état déjà incohérent.`,
        },
      ],
      assets: [
        asset("log", `Script de comptage (${scripts.assetNames.countScriptFile})`, "Petit script bash qui compte les lignes d’échec et classe les adresses IP.", scripts.assetNames.countScriptFile),
        asset("log", `Script de nettoyage (${scripts.assetNames.cleanScriptFile})`, "Script de démonstration qui crée un dossier temporaire puis tente de supprimer des fichiers anciens.", scripts.assetNames.cleanScriptFile),
        asset("log", `Script d’inventaire (${scripts.assetNames.inventoryScriptFile})`, "Script awk qui filtre un CSV de comptes et affiche un total final.", scripts.assetNames.inventoryScriptFile),
        asset("log", `Script d’archivage (${scripts.assetNames.backupScriptFile})`, "Script minimal qui construit une commande d’affichage à partir d’un argument.", scripts.assetNames.backupScriptFile),
        asset("log", `Journal d’authentification d’exercice (${scripts.assetNames.logFile})`, "Lignes auth.log fictives utilisées par le script de comptage.", scripts.assetNames.logFile),
        asset("log", `Inventaire CSV des comptes (${scripts.assetNames.csvFile})`, "Comptes humains, locaux et de service avec shell et âge de mot de passe.", scripts.assetNames.csvFile),
        asset("log", `Blocs de sortie candidats (${scripts.assetNames.candidatesFile})`, "Plusieurs sorties plausibles pour le script de comptage, dont une seule correspond exactement à l’exécution réelle.", scripts.assetNames.candidatesFile),
        asset("guide", "Guide du TP 6", "Méthode de lecture pas à pas, commandes de test et rappels ShellCheck utiles.", scripts.assetNames.guideFile),
      ],
    },
  ];
}
