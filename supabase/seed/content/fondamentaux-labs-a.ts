import type { PathLab } from "./reseaux-path";

export type SecurityLab = PathLab & {
  category?: "securite" | "cryptographie" | "osint" | "web" | "linux" | "reseau";
};

export interface FactsA {
  phishing: {
    emailFile: string;
    mobileFile: string;
    guideFile: string;
    senderDomain: string;
    returnPathDomain: string;
    replyToDomain: string;
    originIp: string;
    spfResult: string;
    dkimResult: string;
    dmarcResult: string;
    linkHost: string;
    linkDomain: string;
    attachmentName: string;
    attachmentExtension: string;
    attachmentBytes: number;
    threatenedDelayHours: number;
    lever: string;
    neverShare: string;
    firstAction: string;
    redFlagCount: number;
  };
  passwords: {
    auditDate: string;
    inventoryFile: string;
    hashesFile: string;
    dictionaryFile: string;
    guideFile: string;
    crackedAccounts: Record<string, string>;
    sharedHashCount: number;
    strongHumanAccount: string;
    adminWithoutMfaCount: number;
    oldestPasswordAgeDays: number;
    mfaRoundedPercent: number;
    entropyWords: number;
    entropyBitsRounded: number;
    bruteForceHoursRounded: number;
    sha256HexLength: number;
    oldestNoMfaLastLoginTime: string;
    disableFirstAccount: string;
  };
  integrity: {
    toolFiles: { a: string; b: string; c: string };
    manifestFile: string;
    messagesFile: string;
    certificatesFile: string;
    guideFile: string;
    alteredLetter: string;
    alteredHashPrefix12: string;
    alteredBytes: number;
    base64Text: string;
    hexText: string;
    caesarShift: number;
    caesarText: string;
    shortHashAlgorithm: string;
    sha256HexLength: number;
    sha256ReferenceText: string;
    sha256MatchesReference: boolean;
    certificateEndDate: string;
    certificateDaysRemaining: number;
    coversApex: boolean;
    keySizeBits: number;
    secondCertificateValid: boolean;
    signatureAlgorithm: string;
    md5Sample: string;
    sha256Sample: string;
  };
}

const lower = (value: string) => value.toLowerCase();
const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const yesNo = (value: boolean) => (value ? compact(["oui", "yes"]) : compact(["non", "no"]));
const letter = (value: string) => compact([value]);
const withSpaces = (value: number) => compact([String(value), String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ")]);

export function buildLabsA(facts: FactsA): SecurityLab[] {
  const { phishing, passwords, integrity } = facts;

  return [
    {
      slug: "tp-analyse-phishing",
      title: "TP 1 : disséquer un courriel d’hameçonnage",
      description: "Tu examines un faux message bancaire, un SMS de livraison et une conversation de paiement mobile pour repérer les signaux d’alerte et choisir le bon premier réflexe si quelqu’un a cliqué.",
      difficulty: "debutant",
      xp: 130,
      format: "logs",
      minutes: 35,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      briefing: "Le mardi 3 mars 2026, Aïssatou Ndiaye reçoit un courriel qui prétend venir de Banque Horizon. Le message annonce une suspension rapide, pousse vers un lien de vérification et joint une prétendue facture. En parallèle, un SMS de livraison puis un faux agent de paiement mobile réclament un code temporaire. Ta mission est de lire les en-têtes, les adresses de retour, la vraie destination du lien et la conversation mobile pour distinguer le vrai du faux, puis d’indiquer le bon premier réflexe si le mot de passe a déjà été saisi sur la fausse page.",
      constraints: [
        "Travaille uniquement sur les fichiers fictifs fournis ici.",
        "N’ouvre aucun lien ni pièce jointe ailleurs que dans le labo.",
      ],
      tools: [
        "Visionneuse de journaux CyberPingo",
        "Guide pas à pas du TP 1",
        "Un éditeur de texte ou un simple navigateur si tu préfères lire les fichiers hors ligne",
      ],
      objectives: [
        "Distinguer domaine affiché, domaine réel et adresses de retour",
        "Compter des signaux d’alerte précis sans te laisser distraire par le bruit",
        "Choisir le bon premier réflexe après une saisie de mot de passe sur un faux site",
      ],
      hints: [
        "Lis les en-têtes du haut vers le bas puis les Received du bas vers le haut.",
        "Pour un lien trompeur, regarde le domaine de droite à gauche.",
        "Dans l’arnaque mobile, l’élément critique est demandé après l’arrivée d’un SMS.",
      ],
      tasks: [
        {
          prompt: "Dans le champ From du courriel brut, quel est le domaine réel de l’expéditeur qui se cache derrière le nom affiché « Banque Horizon, Service Sécurité » ?",
          hint: "Ne retiens pas le nom affiché : isole l’adresse entre chevrons puis lis sa partie après le signe @.",
          answerFormat: "Nom de domaine",
          accepted: compact([phishing.senderDomain]),
          explanation: `Le nom affiché essaie d’inspirer confiance, mais l’adresse réelle révèle le piège. Le domaine ${phishing.senderDomain} imite la banque légitime avec une légère faute, ce qui est un classique de l’hameçonnage. La bonne méthode consiste toujours à extraire l’adresse complète avant de juger le message.`,
        },
        {
          prompt: "Quel domaine apparaît dans le Return-Path, donc dans l’adresse de rebond utilisée si le message est refusé ?",
          hint: "Cherche la première ligne du fichier : elle commence par Return-Path.",
          answerFormat: "Nom de domaine",
          accepted: compact([phishing.returnPathDomain]),
          explanation: `Le Return-Path est le domaine technique qui sert au rebond. Ici, ${phishing.returnPathDomain} ne correspond ni au nom affiché ni au domaine légitime attendu, ce qui renforce fortement le soupçon. Comparer From, Reply-To et Return-Path aide à voir les incohérences cachées derrière une belle mise en forme.`,
        },
        {
          prompt: "Quelle est l’adresse IPv4 du premier saut externe à l’origine du message, avant son arrivée sur l’infrastructure de Soleil ?",
          hint: "Dans les lignes Received, pars du plus ancien saut et ignore le réseau local 192.168.77.0/24.",
          answerFormat: "Adresse IPv4",
          accepted: compact([phishing.originIp]),
          explanation: `Les lignes Received se lisent du bas vers le haut pour reconstruire le trajet. L’adresse ${phishing.originIp} est la première source externe visible avant les relais de Soleil. Cette lecture permet de distinguer le point de départ d’un message des serveurs qui ne font que le transmettre.`,
        },
        {
          prompt: "Quel est le résultat SPF annoncé dans Authentication-Results pour ce message ?",
          hint: "Repère la portion spf=... dans le bloc Authentication-Results.",
          answerFormat: "Un mot",
          accepted: compact([phishing.spfResult]),
          explanation: `Le résultat SPF vaut ${phishing.spfResult}. Cela signifie que le serveur expéditeur observé n’est pas autorisé à envoyer du courrier pour ce domaine. Un SPF en échec ne suffit pas à lui seul pour conclure, mais combiné au reste il devient un signal d’alerte solide.`,
        },
        {
          prompt: "Si tu lis la vraie destination du lien de droite à gauche, quel est son domaine enregistrable réel ?",
          hint: "Trouve d’abord l’hôte complet de la destination réelle, puis garde seulement le domaine réellement possédé tout à droite.",
          answerFormat: "Nom de domaine",
          accepted: compact([phishing.linkDomain]),
          explanation: `Le texte visible imite la banque, mais l’hôte réel se termine par ${phishing.linkDomain}. C’est donc ce domaine qui contrôle réellement la page visée. Lire un domaine de droite à gauche évite de se faire piéger par des sous-domaines trompeurs placés au début.`,
        },
        {
          prompt: "Quelle est la vraie extension finale de la pièce jointe annoncée dans le courriel brut ?",
          hint: "Ne t’arrête pas au milieu du nom : regarde ce qui vient après le dernier point.",
          answerFormat: "Extension seule, sans point",
          accepted: compact([phishing.attachmentExtension]),
          explanation: `La dernière extension décide du type de fichier réellement lancé. Ici, ${phishing.attachmentExtension} montre qu’il s’agit d’un exécutable déguisé derrière un mot rassurant. Les doubles extensions servent précisément à faire croire à un document banal alors que le système verra tout autre chose.`,
        },
        {
          prompt: "Quel délai maximum le message laisse-t-il avant la suspension annoncée du compte de l’association ?",
          hint: "Cherche la contrainte de temps écrite dans le corps du courriel, juste avant la conséquence annoncée.",
          answerFormat: "Un nombre d’heures",
          accepted: compact([phishing.threatenedDelayHours, `${phishing.threatenedDelayHours} heures`, `${phishing.threatenedDelayHours}h`]),
          explanation: `Le message impose un délai de ${phishing.threatenedDelayHours} heures avant la suspension annoncée. Relever ce délai est utile, car c’est un signe classique de pression artificielle : l’attaquant veut faire agir vite avant que la victime n’ait le temps de vérifier.`,
        },
        {
          prompt: "Dans le SMS et la conversation mobile, quel élément précis ne faut-il jamais transmettre à un tiers, même s’il prétend « vérifier » l’opération ? Réponds par une lettre. a) le code reçu par SMS b) le prénom complet c) l’heure de réception du message d) le nom du service affiché",
          hint: "Repère la demande du faux agent, puis choisis l’option qui correspond à un secret temporaire destiné à valider une opération.",
          answerFormat: "Une seule lettre",
          accepted: compact(["a"]),
          explanation: `L’élément à ne jamais transmettre est le ${phishing.neverShare}. Ce code sert justement à prouver que tu es la bonne personne ou à valider une opération. Le donner à quelqu’un, même s’il se présente comme un agent d’aide, revient souvent à lui remettre le contrôle.`,
        },
        {
          prompt: "Après avoir saisi ton mot de passe sur la fausse page, quelle première action est correcte ? Réponds par une lettre. a) attendre un rappel bancaire b) changer le mot de passe depuis le vrai site puis activer la double authentification c) répondre au courriel pour demander si le message est légitime d) transférer le message à tous les collègues",
          hint: "Agis d’abord sur le vrai service pour reprendre le contrôle du compte, pas sur le message reçu.",
          answerFormat: "Une seule lettre",
          accepted: letter(phishing.firstAction.slice(-1)),
          explanation: `La bonne réponse est ${phishing.firstAction}. Quand un mot de passe a été saisi sur un faux site, il faut agir tout de suite sur le vrai service, changer le secret compromis puis activer la double authentification si elle existe. Attendre, discuter avec l’attaquant ou diffuser le message ne protège pas le compte.`,
        },
        {
          prompt: "D’après la grille de 10 signaux du guide, combien de signaux sont réellement présents dans ce courriel ?",
          hint: "La grille mélange des signaux présents et absents. Vérifie les 10 points un par un au lieu de compter au jugé.",
          answerFormat: "Un nombre entier",
          accepted: compact([phishing.redFlagCount]),
          explanation: `Le guide propose dix signaux possibles, mais le courriel n’en présente que ${phishing.redFlagCount}. Les deux autres servent de faux amis pour t’obliger à vérifier chaque point au lieu de supposer que toute liste du guide s’applique automatiquement au message étudié.`,
        },
      ],
      assets: [
        { kind: "log", title: `Courriel brut reçu par Aïssatou (${phishing.emailFile})`, description: "En-têtes complets, corps texte, corps HTML et métadonnées de la pièce jointe.", url: `/labs/${phishing.emailFile}` },
        { kind: "log", title: `SMS et conversation mobile (${phishing.mobileFile})`, description: "Un faux SMS de livraison et le dialogue d’un prétendu agent de paiement mobile.", url: `/labs/${phishing.mobileFile}` },
        { kind: "guide", title: "Guide pas à pas du TP 1", description: "Méthode, commandes et grille de dix signaux à vérifier un par un.", url: `/labs/${phishing.guideFile}` },
      ],
    },
    {
      slug: "tp-audit-mots-de-passe",
      title: "TP 2 : auditer des mots de passe et des comptes",
      description: "Tu recoupes un inventaire de comptes et un extrait d’empreintes SHA-256 sans sel pour retrouver quelques mots de passe faibles, mesurer le risque et prioriser la première mesure de réduction d’exposition.",
      difficulty: "intermediaire",
      xp: 160,
      format: "logs",
      minutes: 50,
      requiresComputer: true,
      isAssessment: false,
      category: "securite",
      briefing: "Le lundi 9 mars 2026, Jean-Marc Tchoumi récupère un extrait d’un ancien outil interne qui stockait des empreintes SHA-256 sans sel, ainsi qu’un inventaire des comptes de la messagerie de Soleil. Tu dois comparer ces empreintes à un petit dictionnaire fictif, repérer les réutilisations, mesurer l’ancienneté des mots de passe et déterminer quel compte doit être traité en premier. Le but n’est pas d’attaquer un vrai service, mais de comprendre pourquoi un mot de passe faible, réutilisé et sans double authentification devient immédiatement dangereux.",
      constraints: [
        "N’utilise que le dictionnaire fictif fourni avec ce labo.",
        "Ne colle jamais de vrai mot de passe dans un service externe.",
      ],
      tools: [
        "Visionneuse de journaux CyberPingo",
        "Guide pas à pas du TP 2",
        "Node.js, PowerShell ou un shell Unix pour recalculer des empreintes",
      ],
      objectives: [
        "Comparer un dictionnaire à des empreintes SHA-256 sans sel",
        "Lire un inventaire de comptes pour prioriser les risques réels",
        "Relier mot de passe faible, privilèges et absence de double authentification",
      ],
      hints: [
        "Une empreinte identique sur deux lignes signifie le même mot de passe.",
        "Pour le compte humain résistant au dictionnaire, regarde d’abord les identifiants de personnes, pas les comptes techniques.",
        "La règle de priorité du guide ne dépend pas d’une intuition mais d’un croisement précis de trois critères.",
      ],
      tasks: [
        {
          prompt: "Quel mot de passe en clair retrouves-tu pour le compte jm.tchoumi en comparant le dictionnaire et l’empreinte SHA-256 fournie ?",
          hint: "Hache les mots du dictionnaire un par un, puis compare exactement les 64 caractères hexadécimaux.",
          answerFormat: "Le mot de passe fictif complet",
          accepted: compact([passwords.crackedAccounts["jm.tchoumi"]]),
          explanation: `L’empreinte de jm.tchoumi correspond au mot de passe fictif ${passwords.crackedAccounts["jm.tchoumi"]}. Comme le stockage est sans sel, le même calcul sur le dictionnaire suffit à retrouver la valeur. Cet exercice montre pourquoi un hachage rapide et sans sel protège mal contre une attaque par dictionnaire.`,
        },
        {
          prompt: "Quel mot de passe en clair retrouves-tu pour le compte yao.kouassi ?",
          hint: "Le procédé est exactement le même : dictionnaire, SHA-256, comparaison caractère par caractère.",
          answerFormat: "Le mot de passe fictif complet",
          accepted: compact([passwords.crackedAccounts["yao.kouassi"]]),
          explanation: `Le mot de passe trouvé pour yao.kouassi est ${passwords.crackedAccounts["yao.kouassi"]}. Ici encore, la faiblesse ne vient pas d’une faille du calcul SHA-256 lui-même, mais du fait qu’un secret prévisible et non salé se retrouve vite dans un dictionnaire réaliste.`,
        },
        {
          prompt: "Quel mot de passe en clair retrouves-tu pour le compte salle-03 ?",
          hint: "Si deux comptes partagent le même condensat, un seul calcul permet de retrouver les deux secrets.",
          answerFormat: "Le mot de passe fictif complet",
          accepted: compact([passwords.crackedAccounts["salle-03"]]),
          explanation: `Le compte salle-03 utilise ${passwords.crackedAccounts["salle-03"]}. Cette valeur réapparaît ailleurs dans l’extrait, ce qui prouve une réutilisation. Dès qu’un mot de passe est craqué une fois, tous les comptes qui partagent la même empreinte tombent en même temps.`,
        },
        {
          prompt: "Combien de comptes du fichier d’empreintes partagent exactement la même empreinte SHA-256, signe d’une réutilisation du même mot de passe ?",
          hint: "Cherche les doublons dans la colonne des empreintes, puis compte les comptes concernés, pas seulement le nombre de doublons.",
          answerFormat: "Un nombre entier",
          accepted: compact([passwords.sharedHashCount]),
          explanation: `Deux comptes partagent exactement la même empreinte, donc le même mot de passe. La bonne réponse est ${passwords.sharedHashCount}. Une réutilisation augmente fortement l’impact d’une compromission, car un seul craquage ouvre plusieurs accès.`,
        },
        {
          prompt: "Quel compte humain du fichier d’empreintes résiste au dictionnaire fourni et correspond donc à la phrase de passe forte absente de cette liste ?",
          hint: "Commence par repérer quelles empreintes ne trouvent aucun candidat dans le dictionnaire, puis concentre-toi sur les comptes de personnes.",
          answerFormat: "Identifiant de compte",
          accepted: compact([passwords.strongHumanAccount]),
          explanation: `Le compte humain qui résiste au dictionnaire est ${passwords.strongHumanAccount}. Les autres comptes non retrouvés sont techniques ou locaux, alors que celui-ci appartient à une personne et conserve une empreinte non corrélée à la liste fournie. C’est le bon exemple d’un secret plus robuste face à une attaque simple.`,
        },
        {
          prompt: "Combien d’administrateurs de l’inventaire n’ont pas la double authentification activée ?",
          hint: "Filtre d’abord les lignes au privilège administrateur, puis regarde seulement la colonne de double authentification.",
          answerFormat: "Un nombre entier",
          accepted: compact([passwords.adminWithoutMfaCount]),
          explanation: `L’inventaire montre ${passwords.adminWithoutMfaCount} administrateur sans double authentification. C’est critique, car un mot de passe seul ne suffit alors plus à bloquer une réutilisation ou un vol d’identifiants. Les privilèges élevés doivent être protégés en priorité.`,
        },
        {
          prompt: `À la date d’audit du ${passwords.auditDate}, quel est l’âge en jours du mot de passe le plus ancien de l’inventaire ?`,
          hint: "Repère la date de changement la plus ancienne puis calcule la différence jusqu’au 9 mars 2026.",
          answerFormat: "Un nombre entier de jours",
          accepted: compact([passwords.oldestPasswordAgeDays]),
          explanation: `Le mot de passe le plus ancien a ${passwords.oldestPasswordAgeDays} jours. Mesurer cette ancienneté aide à voir les comptes oubliés, souvent moins suivis et donc plus exposés. Un secret très ancien n’est pas forcément compromis, mais il mérite une attention immédiate.`,
        },
        {
          prompt: "Quelle part des comptes de l’inventaire a la double authentification, arrondie à l’entier le plus proche ?",
          hint: "Compte les comptes avec « oui », divise par le total puis arrondis au pourcentage entier.",
          answerFormat: "Un pourcentage entier, sans signe",
          accepted: compact([passwords.mfaRoundedPercent]),
          explanation: `La couverture de la double authentification est de ${passwords.mfaRoundedPercent} pour cent après arrondi. Ce calcul transforme une impression vague en indicateur utile pour piloter une amélioration. Plus ce taux monte, moins un mot de passe volé suffit à compromettre un compte.`,
        },
        {
          prompt: `Calcul de méthode : une phrase de passe de ${passwords.entropyWords} mots tirés dans une liste de 7776 mots donne environ combien de bits d’entropie, après arrondi ?`,
          hint: "Le guide donne la formule : nombre de mots multiplié par log2 de la taille de la liste.",
          answerFormat: "Un nombre entier",
          accepted: compact([passwords.entropyBitsRounded]),
          explanation: `Avec ${passwords.entropyWords} mots et une liste de 7776 possibilités par mot, on obtient environ ${passwords.entropyBitsRounded} bits après arrondi. Cette estimation rappelle qu’une phrase de passe longue et bien choisie résiste mieux qu’un mot court, même si elle reste mémorisable.`,
        },
        {
          prompt: "Calcul de méthode : à un million d’essais par seconde, combien d’heures faut-il environ pour parcourir toutes les combinaisons possibles de 8 caractères pris parmi 62 caractères ?",
          hint: "Utilise la formule du guide : charset puissance longueur, puis conversion en heures avec un arrondi final.",
          answerFormat: "Un nombre d’heures, sans signe",
          accepted: withSpaces(passwords.bruteForceHoursRounded),
          explanation: `Le bon ordre de grandeur est ${passwords.bruteForceHoursRounded} heures. Ce chiffre montre que le brute force pur devient vite coûteux, mais qu’il reste bien plus rapide quand les attaquants disposent d’un dictionnaire ciblé ou d’un mot de passe déjà réutilisé ailleurs.`,
        },
        {
          prompt: "Quelle heure UTC de dernière connexion apparaît pour le compte sans double authentification dont le mot de passe est le plus ancien dans l’inventaire ?",
          hint: "Filtre d’abord les comptes sans double authentification, puis garde celui dont la date de changement de mot de passe est la plus ancienne avant de lire sa dernière connexion.",
          answerFormat: "HH:MM:SS",
          accepted: compact([passwords.oldestNoMfaLastLoginTime]),
          explanation: `Le compte sans double authentification au mot de passe le plus ancien est celui qui cumule l’âge maximal dans cette sous-population. Sa dernière connexion UTC vaut ${passwords.oldestNoMfaLastLoginTime}, ce qui oblige à croiser deux colonnes de l’inventaire avant de relever l’heure.`,
        },
        {
          prompt: "Selon la règle du guide, quel compte faut-il désactiver ou isoler en premier parce qu’il cumule privilèges d’administration, absence de double authentification et mot de passe retrouvé ? Réponds par une lettre. a) archives-bot b) jm.tchoumi c) salle-03 d) pc-direction-local",
          hint: "Croise l’inventaire et l’extrait d’empreintes au lieu de te fier à une seule colonne.",
          answerFormat: "Une seule lettre",
          accepted: compact(["b"]),
          explanation: `Le compte à traiter en premier est ${passwords.disableFirstAccount}. Il cumule trois facteurs de risque : privilèges élevés, absence de double authentification et secret récupérable dans le dictionnaire. C’est exactement le type de compte qu’un attaquant réutiliserait aussitôt.`,
        },
      ],
      assets: [
        { kind: "log", title: `Inventaire des comptes de messagerie (${passwords.inventoryFile})`, description: "Quatorze comptes avec rôles, privilèges, ancienneté du mot de passe, double authentification et dernière connexion.", url: `/labs/${passwords.inventoryFile}` },
        { kind: "log", title: `Extrait d’empreintes SHA-256 (${passwords.hashesFile})`, description: "Huit comptes issus d’un ancien outil interne qui stockait des condensats sans sel.", url: `/labs/${passwords.hashesFile}` },
        { kind: "guide", title: `Dictionnaire fictif à télécharger (${passwords.dictionaryFile})`, description: "Une petite liste de chaînes fictives à hacher pour retrouver quelques secrets faibles du labo.", url: `/labs/${passwords.dictionaryFile}` },
        { kind: "guide", title: "Guide pas à pas du TP 2", description: "Méthode d’audit, commandes de hachage et repères d’entropie.", url: `/labs/${passwords.guideFile}` },
      ],
    },
    {
      slug: "tp-integrite-chiffrement",
      title: "TP 4 : intégrité, chiffrement et certificats",
      description: "Tu compares des empreintes SHA-256, décodes trois messages, reconnais des familles de condensats et lis deux certificats X.509 pour vérifier validité, couverture de nom et taille de clé.",
      difficulty: "intermediaire",
      xp: 160,
      format: "logs",
      minutes: 50,
      requiresComputer: true,
      isAssessment: false,
      category: "cryptographie",
      briefing: "Le lundi 16 mars 2026, Idriss Camara télécharge trois petits fichiers pour la salle de formation. L’éditeur publie leurs empreintes SHA-256, mais l’un des fichiers fournis ici a été modifié. En plus de cette vérification d’intégrité, tu dois décoder quelques messages d’exemple et contrôler un certificat du site de Soleil ainsi qu’un second certificat plus ancien. Ta mission est de montrer que tu sais distinguer intégrité, encodage, chiffrement simple et validation d’un certificat, sans jamais confondre longueur de condensat et confiance réelle.",
      constraints: [
        "Vérifie uniquement les fichiers fictifs du labo.",
        "Ne te fie pas à l’apparence d’un fichier ou d’un certificat : lis les champs utiles.",
      ],
      tools: [
        "Visionneuse de journaux CyberPingo",
        "Guide pas à pas du TP 4",
        "Node.js, PowerShell ou un shell Unix pour recalculer et décoder",
      ],
      objectives: [
        "Comparer des empreintes publiées aux octets réellement téléchargés",
        "Distinguer base64, hexadécimal, condensats et chiffrement de César",
        "Lire les dates, les SAN et la taille de clé d’un certificat X.509",
      ],
      hints: [
        "Un seul fichier ne correspond pas au manifeste : compare chaque ligne au lieu de supposer.",
        "La longueur d’un condensat donne déjà un indice fort sur l’algorithme utilisé.",
        "Un certificat ne couvre que son nom commun utile et surtout les SAN listés.",
      ],
      tasks: [
        {
          prompt: "Parmi les fichiers A, B et C, quel fichier est altéré par rapport au manifeste publié ? Réponds par une lettre.",
          hint: "Calcule l’empreinte réelle de chaque fichier puis compare-la au manifeste ligne par ligne.",
          answerFormat: "Une seule lettre",
          accepted: letter(integrity.alteredLetter.slice(-1)),
          explanation: `Le seul fichier dont l’empreinte réelle ne correspond pas au manifeste est ${integrity.alteredLetter}. Une vérification d’intégrité sérieuse part toujours des octets réellement reçus, pas d’une simple apparence ou d’un nom de fichier familier.`,
        },
        {
          prompt: "Quels sont les 12 premiers caractères hexadécimaux de l’empreinte SHA-256 réelle du fichier altéré ?",
          hint: "Recalcule le condensat sur le fichier téléchargé, puis conserve seulement le début demandé.",
          answerFormat: "12 caractères hexadécimaux",
          accepted: compact([integrity.alteredHashPrefix12]),
          explanation: `Le préfixe attendu est ${integrity.alteredHashPrefix12}. Relever seulement les premiers caractères d’une empreinte n’est pas suffisant pour une vraie vérification de sécurité, mais c’est un bon exercice pour montrer que tu sais recalculer la valeur correcte à partir du bon fichier.`,
        },
        {
          prompt: "Combien d’octets contient le fichier altéré fourni dans le labo ?",
          hint: "Compte les octets du fichier tel qu’il est distribué, pas ceux du manifeste publié par l’éditeur.",
          answerFormat: "Un nombre entier",
          accepted: compact([integrity.alteredBytes]),
          explanation: `Le fichier altéré contient ${integrity.alteredBytes} octets. Même une variation minime du contenu, parfois un seul caractère, suffit à produire une nouvelle empreinte SHA-256. C’est exactement ce qu’on exploite pour vérifier l’intégrité d’un téléchargement.`,
        },
        {
          prompt: "Quel texte obtiens-tu en décodant le message Base64 du journal de messages ?",
          hint: "Le Base64 est un encodage : il faut le décoder tel quel, sans modifier les caractères.",
          answerFormat: "Le texte décodé",
          accepted: compact([integrity.base64Text]),
          explanation: `Le message Base64 se décode en « ${integrity.base64Text} ». Ce point est important : le Base64 ne chiffre rien. Il ne fait que représenter des octets en texte ASCII transportable. Toute personne qui voit la chaîne et sait la décoder retrouve immédiatement le message d’origine.`,
        },
        {
          prompt: "Quel texte obtiens-tu en décodant la chaîne hexadécimale du journal de messages ?",
          hint: "Deux caractères hexadécimaux représentent un octet. Convertis-les puis lis le texte en UTF-8.",
          answerFormat: "Le texte décodé",
          accepted: compact([integrity.hexText]),
          explanation: `La chaîne hexadécimale correspond au texte « ${integrity.hexText} ». Comme pour le Base64, il s’agit d’un encodage, pas d’un mécanisme de confidentialité. Reconnaître ce format t’évite de prendre un simple habillage pour une protection cryptographique réelle.`,
        },
        {
          prompt: `Quel texte obtiens-tu si tu déchiffres le message de César du journal avec le décalage ${integrity.caesarShift} ?`,
          hint: "Le décalage est connu : ramène chaque lettre en arrière dans l’alphabet du même nombre de positions.",
          answerFormat: "Le texte déchiffré",
          accepted: compact([integrity.caesarText]),
          explanation: `Le message de César redonne « ${integrity.caesarText} ». Ce type de chiffrement historique se casse facilement dès que le décalage est connu ou qu’on teste les 25 possibilités. L’exercice sert surtout à distinguer un chiffrement jouet d’un vrai chiffrement moderne.`,
        },
        {
          prompt: "Dans le journal de messages, quel est l’algorithme le plus probable pour l’empreinte de 32 caractères hexadécimaux ? Réponds par une lettre. a) md5 b) sha1 c) sha256 d) bcrypt",
          hint: "Reconnais la famille par sa longueur habituelle en hexadécimal.",
          answerFormat: "Une seule lettre",
          accepted: letter("a"),
          explanation: `Une empreinte de 32 caractères hexadécimaux correspond classiquement à ${integrity.shortHashAlgorithm}. Reconnaître cette longueur te permet d’identifier rapidement le type de condensat manipulé et d’éviter de confondre plusieurs familles de hachage.`,
        },
        {
          prompt: `Si tu recalcules SHA-256 sur la chaîne « ${integrity.sha256ReferenceText} », obtiens-tu exactement la valeur indiquée à la ligne empreinte_64 du carnet ?`,
          hint: "Recalcule l’empreinte de la chaîne exacte, sans retour à la ligne final (sous bash : printf ou echo -n), puis compare-la caractère par caractère à la valeur du carnet.",
          answerFormat: "oui ou non",
          accepted: yesNo(integrity.sha256MatchesReference),
          explanation: `La ligne empreinte_64 du carnet correspond bien au SHA-256 de la chaîne « ${integrity.sha256ReferenceText} ». Cette vérification repose sur un recalcul réel puis sur une comparaison complète, pas sur une simple reconnaissance de longueur.`,
        },
        {
          prompt: "Quelle est la date de fin de validité du certificat principal du site, au format AAAA-MM-JJ ?",
          hint: "Lis la ligne Not After du premier certificat puis remets-la au format demandé.",
          answerFormat: "AAAA-MM-JJ",
          accepted: compact([integrity.certificateEndDate]),
          explanation: `La date de fin de validité du certificat principal est ${integrity.certificateEndDate}. Lire ce champ fait partie des vérifications élémentaires d’un site : un certificat peut être bien signé, mais rester inutilisable s’il est hors période de validité.`,
        },
        {
          prompt: "Au 16 mars 2026, combien de jours calendaires entiers reste-t-il avant cette date de fin de validité ?",
          hint: "Calcule l’écart entre les deux dates AAAA-MM-JJ, sans compter l’heure précise du champ Not After.",
          answerFormat: "Un nombre entier de jours",
          accepted: compact([integrity.certificateDaysRemaining]),
          explanation: `En comptant les jours calendaires entiers entre le 16 mars 2026 et la date AAAA-MM-JJ d’expiration, il reste ${integrity.certificateDaysRemaining} jours. Cette précision évite de mélanger un calcul sur des dates et un calcul sur des horodatages complets, puis aide à anticiper un renouvellement avant panne.`,
        },
        {
          prompt: "Le certificat principal couvre-t-il aussi le nom soleil.example sans www ?",
          hint: "Ne te fie pas au seul CN : cherche surtout les noms présents dans la section SAN.",
          answerFormat: "oui ou non",
          accepted: yesNo(integrity.coversApex),
          explanation: `La bonne réponse est ${integrity.coversApex ? "oui" : "non"}. Les SAN listent www.soleil.example et un autre nom, mais pas soleil.example sans préfixe. Un certificat ne couvre donc pas automatiquement la version nue du domaine si elle n’apparaît nulle part dans ces champs.`,
        },
        {
          prompt: "Quelle est la taille de la clé publique RSA du certificat principal, en bits ?",
          hint: "Lis la ligne Public-Key du premier certificat.",
          answerFormat: "Un nombre entier",
          accepted: compact([integrity.keySizeBits]),
          explanation: `La clé publique du certificat principal fait ${integrity.keySizeBits} bits. Lire cette taille permet de vérifier que le certificat respecte encore un niveau de sécurité courant et qu’il n’utilise pas une clé trop courte pour un usage moderne.`,
        },
        {
          prompt: "Le second certificat du fichier est-il encore valide le 16 mars 2026 ?",
          hint: "Compare la date de référence à sa ligne Not After.",
          answerFormat: "oui ou non",
          accepted: yesNo(integrity.secondCertificateValid),
          explanation: `La bonne réponse est ${integrity.secondCertificateValid ? "oui" : "non"}. Le second certificat expire avant le 16 mars 2026, il n’est donc plus valide à cette date. Vérifier la période de validité reste indispensable, même si l’algorithme de signature et la taille de clé semblent corrects.`,
        },
      ],
      assets: [
        { kind: "guide", title: `Fichier A à vérifier (${integrity.toolFiles.a})`, description: "Petit fichier texte de configuration à contrôler par empreinte.", url: `/labs/${integrity.toolFiles.a}` },
        { kind: "guide", title: `Fichier B à vérifier (${integrity.toolFiles.b})`, description: "Petit fichier texte de configuration, dont un caractère a été modifié par rapport au manifeste.", url: `/labs/${integrity.toolFiles.b}` },
        { kind: "guide", title: `Fichier C à vérifier (${integrity.toolFiles.c})`, description: "Petit fichier texte de contrôle à comparer au manifeste publié.", url: `/labs/${integrity.toolFiles.c}` },
        { kind: "log", title: `Manifeste des empreintes publiées (${integrity.manifestFile})`, description: "Trois empreintes SHA-256 annoncées par l’éditeur pour les fichiers A, B et C.", url: `/labs/${integrity.manifestFile}` },
        { kind: "log", title: `Messages à décoder (${integrity.messagesFile})`, description: "Un exemple en Base64, un en hexadécimal, un en César et deux condensats à reconnaître.", url: `/labs/${integrity.messagesFile}` },
        { kind: "log", title: `Sortie texte des certificats (${integrity.certificatesFile})`, description: "Deux certificats X.509 fictifs au style openssl x509 -text.", url: `/labs/${integrity.certificatesFile}` },
        { kind: "guide", title: "Guide pas à pas du TP 4", description: "Vérification d’intégrité, décodage et lecture de certificats.", url: `/labs/${integrity.guideFile}` },
      ],
    },
  ];
}
