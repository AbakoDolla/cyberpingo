import type { PathLab } from "./reseaux-path";

export type LogsLab = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsA {
  formatsTemps: {
    assetNames: { syslogFile: string; appFile: string; proxyFile: string; accessFile: string; rfcFile: string; guideFile: string };
    syslogSshdCount: number;
    firstSshFailureUtc: string;
    priGravityLetter: string;
    appErrorCount: number;
    topFailedUser: string;
    proxyDeniedBytes: number;
    topAccessIp: string;
    status5xxCount: number;
    top404Path: string;
    peakMinute: string;
    residualDriftMinutes: number;
    distinctSshSourceIps: number;
    pythonRequestsCount: number;
    priSourceLetter: string;
    topProxyDeniedClient: string;
  };
  windows: {
    assetNames: { securityFile: string; sysmonFile: string; powershellFile: string; guideFile: string };
    top4625Account: string;
    subStatusLetter: string;
    spraySourceCount: number;
    firstSuccessfulRdpUtc: string;
    createdAccount: string;
    createdGroup: string;
    lockedAccountsCount: number;
    clearLogTimeUtc: string;
    suspiciousParentImage: string;
    suspiciousDestination: string;
    suspiciousQueryDomain: string;
    decodedDomain: string;
    svcSauvegardeTopLogonType: string;
    svcResaType3Computers: number;
    chronologyLetter: string;
  };
  reseau: {
    assetNames: { firewallFile: string; dnsFile: string; proxyFile: string; guideFile: string };
    topScannerIp: string;
    topScannerPortCount: number;
    topScannerPort: string;
    firstUnexpectedAllowDestination: string;
    firstUnexpectedAllowPort: string;
    beaconClient: string;
    beaconMedianSeconds: number;
    topNxDomain: string;
    longestQueryLength: number;
    beaconBytes: number;
    topTxtClient: string;
    topDeniedClient: string;
    topDeniedClientCount: number;
    legitVsBeaconLetter: string;
    isolateLetter: string;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const timeAnswers = (value: string) => compact([value, value.replace(/^0/, "")]);
const asset = (kind: LogsLab["assets"][number]["kind"], title: string, description: string, name: string) => ({ kind, title, description, url: `/labs/${name}` });

export function buildLogsLabsA(facts: FactsA): LogsLab[] {
  const { formatsTemps, windows, reseau } = facts;

  return [
    {
      slug: "tp-logs-formats-temps",
      title: "TP 1 : lire, normaliser et dater des journaux de formats différents",
      description: "Tu lis cinq formats de journaux de la même matinée, tu remets les heures en UTC et tu compares ensuite des comptes, des chemins, des codes et des volumes sans supposer que tous les fichiers racontent les choses de la même façon.",
      difficulty: "debutant",
      xp: 130,
      format: "logs",
      minutes: 40,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      briefing: "Le mardi 19 mai 2026, Kader Sow veut montrer comment des journaux qui parlent de la même matinée peuvent utiliser des horodatages et des structures très différents. Il exporte un syslog traditionnel, un journal applicatif JSON lignes, un export de proxy, un accès web nginx et quelques lignes RFC 5424. Ton rôle est d’aligner les heures en UTC, de reconnaître les champs utiles et de répondre à des questions précises sans te fier à ton intuition. Les événements sont fictifs, mais leurs formats restent réalistes. Tout ce dont tu as besoin est dans les fichiers fournis et dans le guide.",
      constraints: [
        "Tu travailles sur des exports figés et fictifs.",
        "Le syslog traditionnel du TP 1 est écrit en UTC+01:00, alors que les autres sources sont déjà en UTC.",
      ],
      tools: [
        "Visionneuse du site",
        "Git Bash, WSL ou Termux pour grep, awk, sort et uniq",
        "PowerShell 5.1 si tu es sur Windows",
      ],
      objectives: [
        "Reconnaître rapidement plusieurs formats de journaux",
        "Convertir une heure locale en UTC avant de comparer deux sources",
        "Compter, filtrer et regrouper des lignes sans perdre le contexte",
        "Croiser un identifiant de requête ou un indicateur simple entre deux fichiers",
      ],
      hints: [
        "Commence par noter le format d’horodatage et le fuseau de chaque fichier.",
        "Pour un maximum, compte d’abord puis vérifie qu’il n’y a pas d’ex æquo.",
        "Dans nginx, le code HTTP et le chemin se lisent dans la même ligne mais pas dans la même zone.",
        "Un identifiant de requête te permet de comparer deux journaux qui n’utilisent pas le même format.",
      ],
      tasks: [
        {
          prompt: "Dans « slg-tp1-syslog.log », combien de lignes ont été écrites par le programme « sshd » ?",
          hint: "Compte seulement les lignes dont le nom du programme vaut exactement « sshd » dans la partie avant le message.",
          answerFormat: "Un nombre entier",
          accepted: compact([formatsTemps.syslogSshdCount]),
          explanation: `Un syslog traditionnel place le nom du programme juste avant les deux-points. En comptant uniquement les lignes « sshd », on obtient ${formatsTemps.syslogSshdCount}. Cette méthode évite de mélanger des messages sshd avec d’autres lignes qui parleraient de SSH dans leur texte.`,
        },
        {
          prompt: "Dans « slg-tp1-syslog.log », quelle est la première heure UTC d’un échec SSH, au format HH:MM:SS ?",
          hint: "Le syslog du TP 1 est écrit en UTC+01:00 : convertis d’abord l’heure locale avant de chercher la première occurrence utile.",
          answerFormat: "Une heure UTC au format HH:MM:SS",
          accepted: timeAnswers(formatsTemps.firstSshFailureUtc),
          explanation: `L’horodatage du syslog ne porte ni fuseau ni année, donc il faut suivre la règle donnée par l’énoncé puis retrancher une heure. La première ligne d’échec SSH convertie en UTC tombe à ${formatsTemps.firstSshFailureUtc}. Sans cette normalisation, la chronologie serait fausse dès la deuxième ligne comparée.`,
        },
        {
          prompt: "Dans « slg-tp1-rfc5424.log », la ligne qui commence par « <34>1 » est de quelle gravité ? Réponds par une lettre. a) warning b) error c) critical d) notice",
          hint: "Rappelle-toi qu’un PRI se lit par « facilité × 8 + gravité » puis retrouve la valeur finale de gravité.",
          answerFormat: "Une seule lettre",
          accepted: compact([formatsTemps.priGravityLetter]),
          explanation: "Le PRI 34 se décompose en facilité 4 et gravité 2. La gravité 2 correspond à « critical », donc la bonne réponse est la lettre c. Savoir faire ce calcul te permet de lire un RFC 5424 sans table externe quand la gravité suffit.",
        },
        {
          prompt: "Dans « slg-tp1-application.jsonl », combien d’événements ont le niveau « error » ?",
          hint: "Chaque ligne est un objet JSON : filtre uniquement sur la clé « level » avant de compter.",
          answerFormat: "Un nombre entier",
          accepted: compact([formatsTemps.appErrorCount]),
          explanation: `Le journal applicatif est en JSON lignes, donc chaque événement porte son propre champ « level ». En comptant seulement les lignes où ce champ vaut « error », on obtient ${formatsTemps.appErrorCount}. Cette lecture est plus fiable qu’une recherche de texte libre dans le message.`,
        },
        {
          prompt: "Quel utilisateur subit le plus d’échecs « auth.login.failed » dans « slg-tp1-application.jsonl », sans ex æquo ?",
          hint: "Isole l’action demandée puis groupe les lignes par utilisateur avant de trier les totaux.",
          answerFormat: "Un identifiant utilisateur en minuscules",
          accepted: compact([formatsTemps.topFailedUser]),
          explanation: `Il faut garder uniquement les événements « auth.login.failed », puis compter les occurrences par utilisateur. Le total le plus élevé revient à ${formatsTemps.topFailedUser}, sans égalité. Regrouper les échecs de cette façon aide à séparer une mauvaise habitude d’un vrai ciblage.`,
        },
        {
          prompt: "Dans « slg-tp1-export-proxy.csv », combien d’octets ont été refusés au total par les lignes « TCP_DENIED/403 » ?",
          hint: "Le fichier est séparé par des points-virgules : garde les refus puis additionne la colonne des octets.",
          answerFormat: "Un nombre entier d’octets",
          accepted: compact([formatsTemps.proxyDeniedBytes]),
          explanation: `Une fois les lignes « TCP_DENIED/403 » isolées, il suffit d’additionner la colonne « Octets ». Le total vaut ${formatsTemps.proxyDeniedBytes}. Ce calcul montre qu’un simple nombre de refus ne dit pas tout : le volume associé peut aussi compter.`,
        },
        {
          prompt: "Quelle adresse IP a émis le plus de requêtes dans « slg-tp1-acces.log », sans ex æquo ?",
          hint: "Compte la première colonne du journal web puis trie les totaux avant de conclure.",
          answerFormat: "Une adresse IPv4",
          accepted: compact([formatsTemps.topAccessIp]),
          explanation: `Le journal nginx combined commence par l’adresse du client. En regroupant toutes les lignes par IP, une seule arrive en tête : ${formatsTemps.topAccessIp}. Ce comptage sert souvent de premier pivot avant d’examiner les chemins ou les codes associés.`,
        },
        {
          prompt: "Combien de réponses 5xx vois-tu dans « slg-tp1-acces.log » ?",
          hint: "Le code HTTP apparaît juste après la requête entre guillemets. Filtre les codes compris entre 500 et 599.",
          answerFormat: "Un nombre entier",
          accepted: compact([formatsTemps.status5xxCount]),
          explanation: `Les réponses 5xx sont les erreurs serveur. En filtrant les lignes dont le code est compris entre 500 et 599, on en compte ${formatsTemps.status5xxCount}. C’est une bonne mesure de bruit technique ou de panne au moment d’un incident.`,
        },
        {
          prompt: "Quel chemin revient le plus souvent parmi les réponses 404 de « slg-tp1-acces.log » ?",
          hint: "Isole d’abord les 404, puis groupe les chemins demandés pour trouver le seul maximum.",
          answerFormat: "Un chemin web exact",
          accepted: compact([formatsTemps.top404Path]),
          explanation: `Il faut commencer par garder uniquement les lignes 404, puis compter les chemins demandés. Le plus fréquent est ${formatsTemps.top404Path}. Cette méthode permet de distinguer le bruit opportuniste d’un scan qui insiste sur une ressource précise.`,
        },
        {
          prompt: "À quelle minute UTC se situe le pic de requêtes dans « slg-tp1-acces.log » ?",
          hint: "Ignore les secondes : coupe l’horodatage à la minute, puis compte les lignes par minute UTC.",
          answerFormat: "Une heure UTC au format HH:MM",
          accepted: compact([formatsTemps.peakMinute]),
          explanation: `Le pic se cherche par minute, pas par seconde. En regroupant les lignes du journal web sur la minute UTC, le maximum apparaît à ${formatsTemps.peakMinute}. Ce type d’agrégation aide à voir un emballement bref qu’une lecture ligne à ligne ferait manquer.`,
        },
        {
          prompt: "Pour l’identifiant de requête « req-2042 », de combien de minutes l’horloge de l’application retarde-t-elle encore par rapport à l’accès web une fois les fuseaux alignés ?",
          hint: "Repère la même requête dans les deux fichiers (champ « requestId » côté application, paramètre « rid » dans l’URL du journal web), mets d’abord les deux horodatages en UTC, puis calcule l’écart résiduel.",
          answerFormat: "Un nombre entier de minutes",
          accepted: compact([formatsTemps.residualDriftMinutes]),
          explanation: `L’identifiant de requête permet de comparer exactement le même événement dans deux sources. Une fois les fuseaux alignés, il reste un décalage de ${formatsTemps.residualDriftMinutes} minute(s) entre l’application et le journal web. C’est une dérive d’horloge résiduelle, pas une erreur de fuseau.`,
        },
        {
          prompt: "Combien d’adresses IP sources distinctes apparaissent dans les échecs SSH de « slg-tp1-syslog.log » ?",
          hint: "Garde seulement les lignes d’échec SSH, extrais l’adresse après « from », supprime les doublons puis compte.",
          answerFormat: "Un nombre entier",
          accepted: compact([formatsTemps.distinctSshSourceIps]),
          explanation: `Ici, il faut compter les sources distinctes et non le nombre total de lignes. En extrayant l’adresse après « from » sur chaque échec SSH puis en supprimant les doublons, on obtient ${formatsTemps.distinctSshSourceIps} source(s). Cette nuance change souvent l’interprétation d’un bruit de connexion.`,
        },
        {
          prompt: "Combien de requêtes de « slg-tp1-acces.log » portent un agent utilisateur qui contient « python-requests » ?",
          hint: "L’agent utilisateur est le dernier champ entre guillemets dans le format combined.",
          answerFormat: "Un nombre entier",
          accepted: compact([formatsTemps.pythonRequestsCount]),
          explanation: `Le format combined place l’agent utilisateur à la fin de chaque ligne, entre guillemets. En filtrant les lignes qui contiennent « python-requests », on en trouve ${formatsTemps.pythonRequestsCount}. Ce comptage aide à différencier une navigation humaine d’un client automatisé.`,
        },
        {
          prompt: "Quel fichier faut-il consulter en priorité pour décoder proprement une valeur « PRI » complète, avec facilité et gravité ? Réponds par une lettre. a) le syslog traditionnel b) le journal applicatif JSON lignes c) l’export du proxy d) le journal RFC 5424",
          hint: "Cherche la source qui porte explicitement le champ « PRI » au début de la ligne.",
          answerFormat: "Une seule lettre",
          accepted: compact([formatsTemps.priSourceLetter]),
          explanation: "Pour décoder un PRI complet, la source la plus adaptée est le journal RFC 5424, car il affiche ce nombre au début de chaque ligne avec un horodatage déjà normalisé. La bonne lettre est donc d. Les autres fichiers parlent d’événements utiles, mais pas avec cette structure.",
        },
        {
          prompt: "Dans « slg-tp1-export-proxy.csv », quel client interne cumule le plus de refus « TCP_DENIED/403 », sans ex æquo ?",
          hint: "Groupe uniquement les refus par adresse cliente, puis garde le total le plus élevé.",
          answerFormat: "Une adresse IPv4 interne",
          accepted: compact([formatsTemps.topProxyDeniedClient]),
          explanation: `Une fois les lignes de refus isolées, il faut regrouper par client interne. Le seul maximum revient à ${formatsTemps.topProxyDeniedClient}. Cette lecture permet de voir rapidement si les refus restent dispersés ou si une machine insiste davantage que les autres.`,
        },
      ],
      assets: [
        asset("log", "Syslog traditionnel", "Export d’un syslog traditionnel de « srv-reservation01 », écrit en heure locale UTC+01:00 pour ce TP.", formatsTemps.assetNames.syslogFile),
        asset("log", "Journal applicatif JSON lignes", "Événements applicatifs de réservation au format JSON lignes, horodates en UTC.", formatsTemps.assetNames.appFile),
        asset("log", "Export de proxy", "CSV séparé par des points-virgules avec décisions, octets et clients, déjà en UTC.", formatsTemps.assetNames.proxyFile),
        asset("log", "Journal web nginx", "Journal d’accès au format combined, horodaté en UTC avec « +0000 ».", formatsTemps.assetNames.accessFile),
        asset("log", "Extrait RFC 5424", "Quelques lignes RFC 5424 pour lire un PRI complet et comparer le format.", formatsTemps.assetNames.rfcFile),
        asset("guide", "Guide du TP 1", "Méthode de lecture des formats, de normalisation des heures et de comptage simple.", formatsTemps.assetNames.guideFile),
      ],
    },
    {
      slug: "tp-logs-windows",
      title: "TP 2 : journaux Windows : sessions, comptes et PowerShell",
      description: "Tu relies un export de sécurité Windows, des événements Sysmon et des journaux PowerShell pour retrouver un enchaînement de sessions, de comptes et de processus sans confondre activité légitime et activité suspecte.",
      difficulty: "intermediaire",
      xp: 150,
      format: "logs",
      minutes: 50,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      briefing: "Le jeudi 21 mai 2026, la direction de l’Hôtel Palmier d’Or s’inquiète d’ouvertures de session inhabituelles sur « pc-compta01 » et « pc-reception01 ». Kader Sow exporte alors le journal de sécurité au format CSV, des événements Sysmon et le journal PowerShell en JSON lignes. Tu dois reconstruire l’ordre des faits utiles, distinguer les connexions normales des épreuves plus suspectes et vérifier ce qu’une commande encodée essayait de joindre. Les journaux restent fictifs, mais leurs champs suivent de près les formats réels. Toutes les réponses se trouvent dans les fichiers et dans le guide.",
      constraints: [
        "Tu travailles uniquement sur des exports déjà fournis.",
        "La commande encodée du TP 2 ne fait que joindre un domaine fictif en « .example ».",
      ],
      tools: [
        "Visionneuse du site",
        "Git Bash, WSL ou Termux pour trier et compter",
        "PowerShell 5.1 pour les variantes Windows et le décodage Base64 UTF-16LE",
      ],
      objectives: [
        "Lire les champs essentiels d’un export de sécurité Windows",
        "Relier un processus Sysmon à sa résolution DNS et à sa connexion réseau",
        "Identifier un compte créé, un groupe modifié et un verrouillage de compte",
        "Remettre plusieurs événements dans leur ordre chronologique plausible",
      ],
      hints: [
        "Ne commence pas par les messages : regarde d’abord EventId, heure, poste et compte cible.",
        "Pour un type de session, décide si tu dois compter, lister ou seulement prendre le maximum.",
        "Un ProcessGuid aide à suivre le même processus entre plusieurs événements Sysmon.",
        "Une commande encodée en PowerShell se décode avant de s’interpréter.",
      ],
      tasks: [
        {
          prompt: "Quel compte subit le plus d’échecs 4625 dans « slg-tp2-securite.csv », sans ex æquo ?",
          hint: "Filtre l’identifiant d’événement 4625, groupe ensuite les lignes par compte cible puis trie les totaux.",
          answerFormat: "Un identifiant de compte en minuscules",
          accepted: compact([windows.top4625Account]),
          explanation: `Les épreuves 4625 représentent les échecs d’ouverture de session. En les regroupant par compte cible, on voit que ${windows.top4625Account} arrive seul en tête. Ce comptage permet de savoir si un compte est nettement plus ciblé que les autres.`,
        },
        {
          prompt: "Pour les échecs 4625 qui portent le sous-code « 0xC000006A », quelle signification est correcte ? Réponds par une lettre. a) journal d’audit effacé b) bon identifiant, mauvais mot de passe c) compte verrouillé d) utilisateur inexistant",
          hint: "Le guide donne les significations générales des principaux sous-codes 4625.",
          answerFormat: "Une seule lettre",
          accepted: compact([windows.subStatusLetter]),
          explanation: "Le sous-code 0xC000006A signifie que le nom de compte est correct mais que le mot de passe ne l’est pas. La bonne lettre est donc b. Cette distinction aide à séparer un oubli de mot de passe d’un compte totalement inventé.",
        },
        {
          prompt: "Combien d’adresses IP sources distinctes vois-tu dans l’arrosage de mots de passe contre « pc-compta01 » qui vise plusieurs comptes en type 10 ?",
          hint: "Reste sur les 4625 du poste demandé, en type 10, puis compte les adresses sources distinctes de la série concernée. Les adresses d’une même série peuvent appartenir à des plages différentes : retiens toutes celles qui y participent.",
          answerFormat: "Un nombre entier",
          accepted: compact([windows.spraySourceCount]),
          explanation: `Pour cette série d’échecs, il faut compter les adresses sources distinctes et non les lignes. En filtrant « pc-compta01 », le type 10 et la rafale visant plusieurs comptes, on obtient ${windows.spraySourceCount} source(s). Cette mesure aide à reconnaître un arrosage plutôt qu’un simple oubli local.`,
        },
        {
          prompt: "Parmi les comptes visés par l’arrosage de mots de passe contre « pc-compta01 », l’un d’eux finit par ouvrir une session en type 10. À quelle heure UTC cette première réussite a-t-elle lieu ?",
          hint: "Relève d’abord les comptes visés par la rafale d’échecs, puis cherche, sur le même poste et en type 10, la première réussite de l’un d’eux après la rafale.",
          answerFormat: "Une heure UTC au format HH:MM:SS",
          accepted: timeAnswers(windows.firstSuccessfulRdpUtc),
          explanation: `Il faut relier la rafale d’échecs à la première réussite du même compte sur le même poste, avec le type 10. Cette réussite apparaît à ${windows.firstSuccessfulRdpUtc} UTC. Retrouver ce basculement est une étape classique pour dater un accès qui finit par aboutir.`,
        },
        {
          prompt: "Quel compte a été créé par l’événement 4720 dans « slg-tp2-securite.csv » ?",
          hint: "Filtre l’identifiant 4720 puis relève le compte cible créé, pas le compte qui a lancé l’action.",
          answerFormat: "Un identifiant de compte en minuscules",
          accepted: compact([windows.createdAccount]),
          explanation: `L’événement 4720 correspond à la création d’un compte. En lisant le compte cible de cette ligne, on trouve ${windows.createdAccount}. Il faut bien distinguer le compte créé du compte qui a effectué l’action.`,
        },
        {
          prompt: "Quel groupe est ensuite touché par l’événement 4732 pour ce compte nouvellement créé ?",
          hint: "Cherche la ligne 4732 qui suit la création précédente et lis son champ de groupe.",
          answerFormat: "Un nom de groupe exact",
          accepted: compact([windows.createdGroup]),
          explanation: `La ligne 4732 indique dans quel groupe le compte nouvellement créé a été ajouté. Ici, le groupe concerné est ${windows.createdGroup}. Croiser 4720 et 4732 permet de mesurer rapidement l’impact réel de la création de compte.`,
        },
        {
          prompt: "Combien de comptes distincts sont verrouillés par des événements 4740 dans « slg-tp2-securite.csv » ?",
          hint: "Les lignes 4740 peuvent se répéter : compte seulement les comptes ciblés distincts.",
          answerFormat: "Un nombre entier",
          accepted: compact([windows.lockedAccountsCount]),
          explanation: `L’identifiant 4740 signale un verrouillage de compte. Comme un même compte pourrait apparaître plusieurs fois, il faut supprimer les doublons avant de compter. On obtient ${windows.lockedAccountsCount} compte(s) distinct(s) verrouillé(s).`,
        },
        {
          prompt: "À quelle heure UTC le journal de sécurité est-il effacé par l’événement 1102 ?",
          hint: "Il n’y a pas besoin de conversion ici : le champ « TimeCreatedUtc » est déjà en UTC.",
          answerFormat: "Une heure UTC au format HH:MM:SS",
          accepted: timeAnswers(windows.clearLogTimeUtc),
          explanation: `L’identifiant 1102 signale l’effacement du journal d’audit. Comme l’export est déjà en UTC, il suffit de relever l’heure du champ « TimeCreatedUtc ». On lit ${windows.clearLogTimeUtc}, ce qui constitue un signal fort de dissimulation ou de maintenance à vérifier.`,
        },
        {
          prompt: "Dans « slg-tp2-sysmon.jsonl », quel est le processus parent du « powershell.exe » suspect lancé sur « pc-compta01 » ?",
          hint: "Filtre l’événement Sysmon de création de processus sur le binaire cible puis lis le champ « ParentImage ».",
          answerFormat: "Un chemin Windows complet, en minuscules",
          accepted: compact([windows.suspiciousParentImage]),
          explanation: `Pour retrouver le parent d’un processus, Sysmon événement 1 fournit directement le champ « ParentImage ». Ici, le parent du PowerShell suspect est ${windows.suspiciousParentImage}. Le parent raconte souvent mieux le contexte qu’un simple nom de binaire.`,
        },
        {
          prompt: "Quelle destination complète, sous la forme adresse:port, voit-on ensuite pour ce même processus dans « slg-tp2-sysmon.jsonl » ?",
          hint: "Utilise le même ProcessGuid ou la même fenêtre temporelle pour retrouver la connexion réseau associée.",
          answerFormat: "Une destination au format adresse:port",
          accepted: compact([windows.suspiciousDestination]),
          explanation: `Le même processus apparaît ensuite dans l’événement Sysmon 3 de connexion réseau. Sa destination complète est ${windows.suspiciousDestination}. Lier création de processus et connexion sortante aide à passer d’un binaire suspect à une preuve de communication.`,
        },
        {
          prompt: "Quel domaine ce même processus résout-il dans l’événement Sysmon 22 associé ?",
          hint: "Reste sur le même processus et lis le champ « QueryName » de l’événement DNS Sysmon.",
          answerFormat: "Un nom de domaine exact",
          accepted: compact([windows.suspiciousQueryDomain]),
          explanation: `Sysmon événement 22 porte le nom résolu par le processus. Pour la séquence suspecte du TP 2, le domaine résolu est ${windows.suspiciousQueryDomain}. Ce pivot DNS donne souvent un indicateur plus stable qu’une simple adresse IP.`,
        },
        {
          prompt: "Quel domaine apparaît dans la commande encodée de « slg-tp2-powershell.jsonl » une fois la Base64 UTF-16LE décodée ?",
          hint: "Repère « -EncodedCommand », décode la charge UTF-16LE, puis relève seulement le domaine contacté.",
          answerFormat: "Un nom de domaine exact",
          accepted: compact([windows.decodedDomain]),
          explanation: `Une commande PowerShell encodée se lit après décodage Base64 UTF-16LE. Une fois cette étape faite, le domaine contacté apparaît clairement : ${windows.decodedDomain}. Il faut toujours vérifier ce contenu avant de conclure sur l’intention de la commande.`,
        },
        {
          prompt: "Quel numéro de type de session est le plus fréquent pour le compte de service « svc-sauvegarde » dans « slg-tp2-securite.csv », sans ex æquo ?",
          hint: "Filtre les ouvertures de session réussies du compte demandé, puis compare les valeurs de « LogonType ».",
          answerFormat: "Un numéro de type de session",
          accepted: compact([windows.svcSauvegardeTopLogonType]),
          explanation: `Le compte de service doit être analysé à part, car ses sessions peuvent être normales. En regroupant ses ouvertures réussies par type, un seul maximum apparaît : ${windows.svcSauvegardeTopLogonType}. Cette mesure aide à distinguer le comportement attendu d’un service de celui d’un utilisateur humain.`,
        },
        {
          prompt: "Combien de postes distincts apparaissent dans les sessions réseau de type 3 du compte « svc-resa » ?",
          hint: "Garde seulement les 4624 du compte demandé avec « LogonType » égal à 3, puis compte les postes distincts.",
          answerFormat: "Un nombre entier",
          accepted: compact([windows.svcResaType3Computers]),
          explanation: `Pour le compte « svc-resa », il faut isoler les ouvertures réussies de type 3 puis compter les postes distincts. On en voit ${windows.svcResaType3Computers}. Ce type de vue aide à savoir si un compte de service reste cantonné à quelques machines ou circule trop largement.`,
        },
        {
          prompt: "Quelle proposition respecte le mieux l’ordre chronologique plausible de l’activité suspecte sur « pc-compta01 » ? Réponds par une lettre. a) effacement du journal, puis échec distant, puis création de compte, puis PowerShell b) création de compte, puis réussite distante, puis échec de mot de passe, puis effacement du journal c) échec distant, puis réussite distante, puis PowerShell, puis effacement du journal d) PowerShell, puis effacement du journal, puis échec distant, puis création de compte",
          hint: "Trie d’abord les heures UTC des familles d’événements citées, puis compare les quatre ordres proposés.",
          answerFormat: "Une seule lettre",
          accepted: compact([windows.chronologyLetter]),
          explanation: "Les horodatages montrent d’abord les échecs, puis la réussite distante, ensuite le lancement de PowerShell, et enfin l’effacement du journal. L’ordre correct correspond à la lettre c. Reconstituer cette séquence t’aide à passer d’événements isolés à une histoire cohérente.",
        },
      ],
      assets: [
        asset("log", "Journal de sécurité Windows", "Export CSV des événements de sécurité des postes concernés, avec heures déjà en UTC.", windows.assetNames.securityFile),
        asset("log", "Journal Sysmon", "Événements Sysmon au format JSON lignes pour suivre processus, DNS et connexions.", windows.assetNames.sysmonFile),
        asset("log", "Journal PowerShell", "Événements 4104 au format JSON lignes, dont une commande encodée en Base64 UTF-16LE.", windows.assetNames.powershellFile),
        asset("guide", "Guide du TP 2", "Rappels sur les EventId, les types de session, les sous-codes 4625 et le décodage PowerShell.", windows.assetNames.guideFile),
      ],
    },
    {
      slug: "tp-logs-reseau",
      title: "TP 3 : pare-feu, DNS et proxy : trouver la machine qui balise",
      description: "Tu relies un journal de pare-feu, un journal DNS et un journal de proxy pour distinguer un scan externe, une mise à jour légitime et une machine interne qui balise de façon très régulière.",
      difficulty: "intermediaire",
      xp: 150,
      format: "logs",
      minutes: 50,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      briefing: "Le vendredi 22 mai 2026, la supervision remarque un volume sortant inhabituel depuis le réseau des bureaux de l’Hôtel Palmier d’Or. Kader Sow exporte alors le journal du pare-feu, celui du résolveur DNS et l’access log du proxy Squid pour tout l’après-midi. Tu dois identifier la source du scan externe, la machine interne qui balise régulièrement, le domaine qui génère le plus d’erreurs DNS et le client qui accumule les refus du proxy. Les données sont fictives, mais les formats suivent de près des journaux réels. Aucune sonde ni SIEM n’est nécessaire : tout se résout avec les trois fichiers et le guide.",
      constraints: [
        "Tu analyses seulement des exports textuels déjà capturés.",
        "Le TP 3 contient à la fois du bruit légitime et des activités qui se ressemblent : ne conclus pas avant d’avoir compté.",
      ],
      tools: [
        "Visionneuse du site",
        "Git Bash, WSL ou Termux pour grep, awk, sort et uniq",
        "PowerShell 5.1 pour filtrer et sommer sous Windows",
      ],
      objectives: [
        "Lire un journal de pare-feu et reconnaître un balayage de ports",
        "Repérer un balisage en calculant des intervalles",
        "Interpréter des réponses DNS « NXDOMAIN » et des requêtes TXT",
        "Utiliser le proxy pour mesurer un volume ou un nombre de refus",
      ],
      hints: [
        "Une seule source qui essaie beaucoup de ports différents sur peu de temps ressemble à un scan.",
        "Pour un balisage, le rythme compte autant que le domaine ou le client.",
        "Dans le proxy Squid, les octets ne sont pas au même endroit que l’URL ou le code HTTP.",
        "Ne confonds pas une mise à jour lourde mais régulière avec une petite communication répétitive.",
      ],
      tasks: [
        {
          prompt: "Quelle adresse publique balaie le plus de ports différents dans « slg-tp3-pare-feu.log », sans ex æquo ?",
          hint: "Cherche une même source publique, puis compte les ports de destination distincts visés sur un temps court.",
          answerFormat: "Une adresse IPv4 publique",
          accepted: compact([reseau.topScannerIp]),
          explanation: `Un balayage de ports se voit comme une source unique qui tente beaucoup de ports différents. Dans le fichier du pare-feu, cette source est ${reseau.topScannerIp}. Il faut raisonner sur les ports distincts, pas seulement sur le nombre total de lignes.`,
        },
        {
          prompt: "Combien de ports de destination distincts cette même adresse balaie-t-elle ?",
          hint: "Après avoir trouvé la source, dédoublonne les ports de destination qu’elle vise avant de compter.",
          answerFormat: "Un nombre entier",
          accepted: compact([reseau.topScannerPortCount]),
          explanation: `Une fois la source de scan identifiée, il faut compter ses ports de destination distincts. On en trouve ${reseau.topScannerPortCount}. Ce total mesure mieux l’ampleur du balayage qu’une simple suite de tentatives sur un seul service.`,
        },
        {
          prompt: "Quel port de destination revient le plus souvent dans les tentatives de cette adresse de scan ?",
          hint: "Reste sur les lignes de la source déjà identifiée, puis groupe les valeurs de « DPT ».",
          answerFormat: "Un numéro de port",
          accepted: compact([reseau.topScannerPort]),
          explanation: `En regroupant les tentatives de la source de scan par port de destination, un seul port revient le plus souvent : ${reseau.topScannerPort}. Cela permet de voir quel service attire ou focalise davantage les essais.`,
        },
        {
          prompt: "Quelle destination externe apparaît dans le premier « UFW ALLOW » sortant du réseau des bureaux dont le port de destination n’est ni 53, ni 80, ni 443 ?",
          hint: "Ignore le bruit de scan externe et concentre-toi sur les flux autorisés depuis une machine interne vers l’extérieur ; écarte ceux qui visent les ports 53, 80 et 443.",
          answerFormat: "Une adresse IPv4",
          accepted: compact([reseau.firstUnexpectedAllowDestination]),
          explanation: `Pour cette question, il faut repérer le premier flux sortant autorisé dont le port de destination n’est ni 53, ni 80, ni 443, c’est-à-dire qui sort du cadre habituel du réseau des bureaux. La destination externe relevée est ${reseau.firstUnexpectedAllowDestination}. Le mot important ici est « premier », donc l’ordre chronologique compte autant que le motif.`,
        },
        {
          prompt: "Quel est le port de destination de ce même premier « UFW ALLOW » hors ports 53, 80 et 443 ?",
          hint: "Une fois la bonne ligne repérée, lis simplement la valeur « DPT » sur cette même ligne.",
          answerFormat: "Un numéro de port",
          accepted: compact([reseau.firstUnexpectedAllowPort]),
          explanation: `Le même flux sortant autorisé pointe vers le port ${reseau.firstUnexpectedAllowPort}. Associer destination et port permet ensuite de vérifier si ce service paraît attendu ou non pour la machine source.`,
        },
        {
          prompt: "Quelle machine interne contacte un même domaine externe à intervalles parfaitement identiques, avec de petites requêtes et sans télécharger de gros fichiers ?",
          hint: "Croise le DNS et le proxy : calcule, pour chaque client, l’écart entre ses requêtes successives vers un même domaine. Un balisage garde exactement le même écart, alors que le trafic normal varie. N’oublie pas d’écarter la mise à jour lourde.",
          answerFormat: "Une adresse IPv4 interne",
          accepted: compact([reseau.beaconClient]),
          explanation: `Un balisage se reconnaît à un écart identique entre les requêtes, vers un domaine peu fréquent, avec de petits échanges. Ici, la machine interne qui ressort est ${reseau.beaconClient}. Une mise à jour lourde d’un autre poste est régulière elle aussi, mais ce n’est pas un balisage : il faut croiser le rythme, le volume et le domaine, pas un seul des trois.`,
        },
        {
          prompt: "Quel est l’intervalle médian, en secondes, entre deux requêtes successives de cette machine vers ce domaine ?",
          hint: "Trie les heures de ses requêtes vers ce domaine (dans le proxy ou dans le DNS, le résultat est le même), calcule les écarts successifs, puis prends la médiane.",
          answerFormat: "Un nombre entier de secondes",
          accepted: compact([reseau.beaconMedianSeconds]),
          explanation: `La médiane des écarts successifs est plus robuste qu’une simple moyenne. Pour la machine répétant ses contacts, elle vaut ${reseau.beaconMedianSeconds} seconde(s). C’est une façon efficace de distinguer un rythme de balisage d’un trafic plus aléatoire.`,
        },
        {
          prompt: "Quel domaine cumule le plus de réponses « NXDOMAIN » dans « slg-tp3-dns.log », sans ex æquo ?",
          hint: "Garde les lignes de réponse qui disent « NXDOMAIN », puis groupe-les par domaine.",
          answerFormat: "Un nom de domaine exact",
          accepted: compact([reseau.topNxDomain]),
          explanation: `Les réponses « NXDOMAIN » indiquent qu’un nom demandé n’existe pas. En les regroupant par domaine, le seul maximum revient à ${reseau.topNxDomain}. Ce type de vue aide à repérer un domaine mal formé, mal distribué ou artificiellement généré.`,
        },
        {
          prompt: "Quelle est la longueur, en caractères, du plus long nom de domaine demandé dans « slg-tp3-dns.log » ?",
          hint: "Mesure la longueur du nom dans les lignes « query », pas celle de l’adresse IP de réponse.",
          answerFormat: "Un nombre entier",
          accepted: compact([reseau.longestQueryLength]),
          explanation: `Il faut mesurer le texte du nom de domaine sur les lignes « query », puis garder la longueur maximale. Le plus long nom demandé contient ${reseau.longestQueryLength} caractère(s). Cette mesure peut aider à détecter des noms anormalement verbeux ou générés.`,
        },
        {
          prompt: "Combien d’octets le proxy transfère-t-il au total entre cette machine et ce domaine ?",
          hint: "Garde les lignes du proxy dont l’URL vise ce domaine, puis additionne la colonne des octets.",
          answerFormat: "Un nombre entier d’octets",
          accepted: compact([reseau.beaconBytes]),
          explanation: `Une fois les lignes du proxy filtrées sur ce domaine, on additionne simplement les octets. Le total transmis vaut ${reseau.beaconBytes}. Le volume donne un complément utile au simple rythme des requêtes.`,
        },
        {
          prompt: "Quelle machine interne émet le plus de requêtes DNS de type TXT, sans ex æquo ?",
          hint: "Isole les lignes « query[TXT] », puis groupe-les par adresse cliente avant de trier.",
          answerFormat: "Une adresse IPv4 interne",
          accepted: compact([reseau.topTxtClient]),
          explanation: `En filtrant les requêtes DNS de type TXT puis en regroupant les clients, une seule machine ressort : ${reseau.topTxtClient}. Les requêtes TXT ne sont pas suspectes en elles-mêmes, mais leur concentration sur un seul client peut devenir intéressante.`,
        },
        {
          prompt: "Quel client interne accumule le plus de refus « TCP_DENIED/403 » dans « slg-tp3-proxy.log », sans ex æquo ?",
          hint: "Compte uniquement les lignes de refus du proxy puis regroupe-les par client.",
          answerFormat: "Une adresse IPv4 interne",
          accepted: compact([reseau.topDeniedClient]),
          explanation: `Les refus du proxy doivent être regroupés par client pour éviter les impressions visuelles trompeuses. Le client qui en cumule le plus est ${reseau.topDeniedClient}. Cela permet ensuite de vérifier si ces refus suivent un motif régulier ou opportuniste.`,
        },
        {
          prompt: "Combien de refus « TCP_DENIED/403 » ce client cumule-t-il ?",
          hint: "Reste sur le client trouvé juste avant et recompte seulement ses lignes de refus.",
          answerFormat: "Un nombre entier",
          accepted: compact([reseau.topDeniedClientCount]),
          explanation: `Une fois le bon client identifié, il suffit de recompter ses seules lignes « TCP_DENIED/403 ». Le total est de ${reseau.topDeniedClientCount}. Associer un nom ou une adresse à son volume de refus aide à prioriser ce qui mérite un examen humain.`,
        },
        {
          prompt: "Quelle proposition ressemble le plus à un service légitime périodique plutôt qu’à un balisage ? Réponds par une lettre. a) de petites requêtes à intervalle strictement identique vers un même domaine depuis une seule machine b) un téléchargement lourd toutes les 15 minutes depuis un poste connu pour les mises à jour c) une suite de requêtes TXT depuis la même machine vers un domaine rare d) un flux sortant autorisé vers un port inattendu juste avant des requêtes répétitives",
          hint: "Compare à la fois la taille, la régularité et le contexte fonctionnel du client qui émet les requêtes.",
          answerFormat: "Une seule lettre",
          accepted: compact([reseau.legitVsBeaconLetter]),
          explanation: "Le comportement qui ressemble le plus à une mise à jour légitime est le téléchargement lourd et périodique d’un poste attendu pour cette fonction. La bonne réponse est donc b. Le volume et le contexte aident ici à séparer la maintenance du balisage.",
        },
        {
          prompt: "Quelle machine faut-il isoler en premier si tu dois agir immédiatement ? Réponds par une lettre. a) l’adresse publique qui scanne depuis Internet b) le serveur DNS interne c) le client qui accumule le plus de refus proxy d) la machine interne qui balise régulièrement",
          hint: "Priorise la machine interne qui montre à la fois un rythme de communication anormal et une cible répétitive claire.",
          answerFormat: "Une seule lettre",
          accepted: compact([reseau.isolateLetter]),
          explanation: "Le scan externe mérite une mesure de filtrage, mais la priorité d’isolement porte ici sur la machine interne qui semble déjà communiquer de façon répétée et structurée. La bonne réponse est la lettre d. En triage, on isole d’abord l’hôte susceptible d’être compromis dans le réseau interne.",
        },
      ],
      assets: [
        asset("log", "Journal du pare-feu", "Export de décisions UFW « BLOCK » et « ALLOW » sur l’après-midi du 22 mai.", reseau.assetNames.firewallFile),
        asset("log", "Journal DNS", "Export dnsmasq avec requêtes et réponses, y compris des « NXDOMAIN » et des requêtes TXT.", reseau.assetNames.dnsFile),
        asset("log", "Journal du proxy", "Access log Squid au format natif, avec décisions, octets et URL.", reseau.assetNames.proxyFile),
        asset("guide", "Guide du TP 3", "Méthode pour lire un scan, un balisage, des réponses DNS et des refus du proxy.", reseau.assetNames.guideFile),
      ],
    },
  ];
}
