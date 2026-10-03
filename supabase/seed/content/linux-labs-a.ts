import type { PathLab } from "./reseaux-path";

export type LinuxLab = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsA {
  arborescence: {
    assetNames: { treeFile: string; historyFile: string; accessFile: string; csvFile: string; guideFile: string };
    sectionCount: number;
    biggestApril: string;
    pdfTotal: number;
    recentConfigFile: string;
    hiddenCfallCount: number;
    historyFinalDir: string;
    relativeTargetAbs: string;
    topRequesterIp: string;
    notFoundCount: number;
    top404Path: string;
    postCount: number;
    distinctIpCount: number;
    cityQuery: string;
    cityCount: number;
    topFormula: string;
    bytes200Path: string;
    bytes200Total: number;
  };
  comptes: {
    assetNames: {
      passwdFile: string;
      shadowFile: string;
      groupFile: string;
      sudoersFile: string;
      permissionsFile: string;
      suidFile: string;
      lastlogFile: string;
      guideFile: string;
    };
    uidZeroAlias: string;
    serviceInteractive: string;
    emptyPasswordAccount: string;
    weakAlgoAccount: string;
    weakAlgo: string;
    lockedCount: number;
    changedAccount: string;
    changedDate: string;
    changedDays: number;
    sudoMembers: string[];
    dangerousRule: string;
    octalFile: string;
    octalMode: string;
    worldWritableFile: string;
    worldWritablePath: string;
    abnormalSuidCount: number;
    neverLoggedInteractive: string;
    dormantHumans: number;
  };
  processus: {
    assetNames: {
      psFile: string;
      treeFile: string;
      servicesFile: string;
      portsFile: string;
      cronFile: string;
      timersFile: string;
      unitFile: string;
      guideFile: string;
    };
    topCpuPid: number;
    topCpuUser: string;
    topCpuCommand: string;
    topCpuParent: number;
    wwwDataProcessCount: number;
    wwwDataRssMiB: number;
    portQuery: number;
    serviceForPort: string;
    unexpectedPort: number;
    failedServices: number;
    everyFiveIdentifier: string;
    nextRunAfter: string;
    weakRootScript: string;
    suspiciousUnit: string;
    badTimerCount: number;
    orRuleDate: string;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const yesNo = (value: boolean) => (value ? compact(["oui", "yes"]) : compact(["non", "no"]));
const percent = (value: number) => compact([value, `${value}%`, `${value} %`]);
const timeAnswers = (value: string) => compact([value, value.replace(/^0/, "")]);
const asset = (kind: LinuxLab["assets"][number]["kind"], title: string, description: string, name: string) => ({ kind, title, description, url: `/labs/${name}` });

export function buildLabsA(facts: FactsA): LinuxLab[] {
  const { arborescence, comptes, processus } = facts;

  return [
    {
      slug: "tp-linux-arborescence",
      title: "TP 1 : explorer l’arborescence et chercher dans les fichiers",
      description: "Tu lis un export d’arborescence, un historique de navigation, un journal web et un CSV d’adhérents pour retrouver des chemins, compter, comparer et filtrer des informations utiles.",
      difficulty: "debutant",
      xp: 130,
      format: "logs",
      minutes: 40,
      requiresComputer: false,
      isAssessment: false,
      category: "linux",
      briefing: "Le lundi 6 avril 2026, Cheikh Fall découvre les exports que lui a préparés Ousmane Diallo pour se repérer sur le serveur de fichiers de la Mutuelle Alizé. Il a sous les yeux une partie de l’arborescence de « /srv », « /home » et « /etc/alize », son historique de commandes, un journal d’accès web de la journée et la liste CSV d’adhérents. Tu dois lui montrer comment retrouver un dossier, suivre une suite de « cd », compter des événements dans les journaux et exploiter un CSV sans jamais toucher un vrai serveur.",
      constraints: [
        "Tout se résout à partir des fichiers fournis, dans un cadre fictif et figé.",
        "Ne suppose rien du système de ta machine locale : raisonne seulement sur les exports du labo.",
      ],
      tools: [
        "Visionneuse du site",
        "Git Bash, WSL ou Termux pour grep, awk et sort",
        "PowerShell 5.1 si tu es sur Windows",
      ],
      objectives: [
        "Lire une arborescence au format « ls -lR »",
        "Résoudre des chemins absolus et relatifs sans te tromper",
        "Compter et regrouper des lignes utiles dans un journal web",
        "Filtrer un CSV séparé par des points-virgules",
      ],
      hints: [
        "Une section de l’arborescence décrit seulement le contenu direct du dossier affiché.",
        "Dans l’historique, « cd - » revient au dossier précédent, pas au parent.",
        "Pour le journal web, commence par isoler la méthode, le chemin et le code HTTP.",
        "Dans le CSV, la ville est la troisième colonne et la formule la quatrième.",
      ],
      tasks: [
        {
          prompt: "Dans « lnx-tp1-arborescence.txt », combien d’éléments directs contient le dossier « /srv/partage/communication/site » ?",
          hint: "Va à la section du dossier puis compte seulement les lignes de contenu direct avant la ligne vide suivante.",
          answerFormat: "Un nombre entier",
          accepted: compact([arborescence.sectionCount]),
          explanation: `Dans un export « ls -lR », chaque section correspond à un dossier précis. Il faut ouvrir la section « /srv/partage/communication/site », ignorer « total », puis compter uniquement les lignes de contenu direct. Cette méthode donne ${arborescence.sectionCount} éléments et t’évite de mélanger ce dossier avec ses voisins.`,
        },
        {
          prompt: "Dans le dossier « /srv/partage/compta/2026-04 » de « lnx-tp1-arborescence.txt », quel fichier est le plus volumineux ?",
          hint: "Reste dans une seule section du listing et compare uniquement la colonne de taille en octets.",
          answerFormat: "Nom exact du fichier",
          accepted: compact([arborescence.biggestApril]),
          explanation: `La bonne méthode consiste à rester dans la section du dossier demandé puis à comparer les tailles affichées sur la même colonne. Le fichier le plus volumineux y est ${arborescence.biggestApril}. Relever un nom depuis la plus grande taille évite les confusions liées à l’ordre alphabétique du listing.`,
        },
        {
          prompt: "Quelle est la somme totale des tailles, en octets, de tous les fichiers PDF présents dans « /srv/partage/adhesions/contrats » ?",
          hint: "Filtre les lignes du dossier demandé sur l’extension « .pdf », puis additionne les tailles indiquées.",
          answerFormat: "Un nombre entier d’octets",
          accepted: compact([arborescence.pdfTotal]),
          explanation: `Dans ce type d’export, chaque ligne de fichier porte déjà sa taille en octets. Il faut donc isoler les PDF du dossier indiqué puis additionner leurs tailles. En procédant ainsi, on obtient ${arborescence.pdfTotal} octets, sans rien supposer du système réel.`,
        },
        {
          prompt: "Dans « /etc/alize/conf.d », quel est le fichier le plus récemment modifié d’après « lnx-tp1-arborescence.txt » ?",
          hint: "Compare les horodatages de la section « /etc/alize/conf.d » et garde la date la plus récente.",
          answerFormat: "Nom exact du fichier",
          accepted: compact([arborescence.recentConfigFile]),
          explanation: `Pour un dossier donné, le fichier le plus récent se déduit du plus grand horodatage affiché dans la même section. Ici, ${arborescence.recentConfigFile} porte la date la plus récente. Cette lecture est utile pour trouver rapidement la dernière configuration touchée.`,
        },
        {
          prompt: "Combien de fichiers cachés ou dossiers cachés vois-tu directement dans le répertoire personnel « /home/cfall », sans compter « . » ni « .. » ?",
          hint: "Ne compte que les noms qui commencent par un point dans la section « /home/cfall » elle-même.",
          answerFormat: "Un nombre entier",
          accepted: compact([arborescence.hiddenCfallCount]),
          explanation: `Sous Linux, un nom commençant par un point est caché. Il faut donc lire la section « /home/cfall » puis compter les entrées dont le nom commence par « . », sans descendre dans les sous-dossiers. Ce comptage donne ${arborescence.hiddenCfallCount} éléments cachés.`,
        },
        {
          prompt: "Dans « lnx-tp1-historique.txt », si Cheikh démarre dans « /home/cfall », quel est le répertoire courant après la dernière commande « cd » affichée ?",
          hint: "Rejoue chaque changement de dossier dans l’ordre et traite correctement « cd - » puis « .config ».",
          answerFormat: "Chemin absolu",
          accepted: compact([arborescence.historyFinalDir, `${arborescence.historyFinalDir}/`]),
          explanation: `L’historique se suit pas à pas comme si tu étais dans le shell. En partant de « /home/cfall », il faut appliquer chaque « cd » dans l’ordre, mémoriser le dossier précédent pour « cd - » puis terminer sur la cible finale. On arrive ainsi dans ${arborescence.historyFinalDir}.`,
        },
        {
          prompt: "Dans « lnx-tp1-historique.txt », Cheikh tape « cat ../contrats/contrat-2026-04-07.pdf » alors qu’il se trouve déjà dans un sous-dossier de « /srv/partage/adhesions ». Quel est le chemin absolu du fichier qu’il ouvre ?",
          hint: "Retrouve d’abord le répertoire courant au moment de cette commande, puis résous le chemin relatif sans sauter d’étape.",
          answerFormat: "Chemin absolu",
          accepted: compact([arborescence.relativeTargetAbs]),
          explanation: `Résoudre un chemin relatif consiste à partir du dossier donné, remonter avec chaque « .. », puis suivre les segments restants. Depuis « /srv/partage/adhesions/imports », la cible devient ${arborescence.relativeTargetAbs}. C’est exactement la méthode à employer sans dépendre d’un shell réel.`,
        },
        {
          prompt: "Dans « lnx-tp1-acces.log », quelle adresse IP a envoyé le plus de requêtes sur la journée ?",
          hint: "Compte les lignes par IP source puis garde le total le plus élevé, sans mélanger les codes HTTP.",
          answerFormat: "Adresse IPv4",
          accepted: compact([arborescence.topRequesterIp]),
          explanation: `Le journal web commence par l’adresse IP source. En regroupant toutes les lignes par IP puis en triant les totaux, on trouve un seul maximum : ${arborescence.topRequesterIp}. Cette méthode reste valable même quand les chemins, les méthodes et les statuts changent.`,
        },
        {
          prompt: "Dans « lnx-tp1-acces.log », combien de requêtes ont répondu en code HTTP 404 ?",
          hint: "Isole uniquement les lignes dont le code de réponse vaut 404 puis compte-les toutes.",
          answerFormat: "Un nombre entier",
          accepted: compact([arborescence.notFoundCount]),
          explanation: `Le code HTTP se lit dans le champ juste après la requête. En filtrant uniquement les lignes 404 et en les comptant, on obtient ${arborescence.notFoundCount}. Ce type de total aide à distinguer un simple bruit normal d’un volume inhabituel d’erreurs.`,
        },
        {
          prompt: "Parmi les réponses 404 de « lnx-tp1-acces.log », quel chemin a été demandé le plus souvent ?",
          hint: "Après avoir filtré les 404, groupe les chemins demandés et trie-les par fréquence décroissante.",
          answerFormat: "Chemin web exact",
          accepted: compact([arborescence.top404Path]),
          explanation: `Il faut d’abord isoler les lignes 404, puis ne garder que le chemin demandé afin de compter les répétitions. Le chemin qui revient le plus souvent est ${arborescence.top404Path}. Regrouper les erreurs par URL est une bonne base pour repérer des scans ciblés.`,
        },
        {
          prompt: "Dans « lnx-tp1-acces.log », combien de requêtes utilisent la méthode HTTP POST ?",
          hint: "Lis la méthode au début de la requête entre guillemets, puis compte uniquement les POST.",
          answerFormat: "Un nombre entier",
          accepted: compact([arborescence.postCount]),
          explanation: `La méthode HTTP apparaît au début de la requête, entre les guillemets du journal nginx. En comptant toutes les lignes qui commencent par POST dans ce champ, on trouve ${arborescence.postCount} requêtes. Cette mesure permet de séparer navigation simple et envois de formulaires.`,
        },
        {
          prompt: "Combien d’adresses IP distinctes vois-tu dans « lnx-tp1-acces.log » ?",
          hint: "Ne compte qu’une fois chaque IP source, même si elle apparaît sur plusieurs lignes.",
          answerFormat: "Un nombre entier",
          accepted: compact([arborescence.distinctIpCount]),
          explanation: `La bonne approche consiste à extraire la première colonne du journal, à supprimer les doublons puis à compter les valeurs restantes. On obtient ${arborescence.distinctIpCount} adresses distinctes. Cela donne une vision plus juste de la diversité des clients que le simple volume de requêtes.`,
        },
        {
          prompt: `Dans « lnx-tp1-adherents.csv », combien d’adhérents appartiennent à la ville « ${arborescence.cityQuery} » ?`,
          hint: "Le séparateur est « ; ». Filtre la troisième colonne sur la ville demandée avant de compter.",
          answerFormat: "Un nombre entier",
          accepted: compact([arborescence.cityCount]),
          explanation: `Le fichier est un CSV à points-virgules. Il faut donc lire la troisième colonne, garder les lignes où la ville vaut « ${arborescence.cityQuery} », puis compter ces lignes. Le résultat est ${arborescence.cityCount}, ce qui montre l’importance de choisir la bonne colonne avant d’agréger.`,
        },
        {
          prompt: "Dans « lnx-tp1-adherents.csv », quelle formule d’adhésion apparaît le plus souvent, sans égalité ?",
          hint: "Regroupe la quatrième colonne par valeur, puis trie les totaux pour repérer le seul maximum.",
          answerFormat: "Nom exact de la formule",
          accepted: compact([arborescence.topFormula]),
          explanation: `Après avoir regroupé les lignes sur la quatrième colonne du CSV, une seule formule arrive en tête sans égalité : ${arborescence.topFormula}. Cette méthode est plus sûre que l’inspection visuelle, surtout quand les catégories sont proches en volume.`,
        },
        {
          prompt: `Dans « lnx-tp1-acces.log », combien d’octets ont été envoyés au total pour les réponses 200 du chemin « ${arborescence.bytes200Path} » ?`,
          hint: "Filtre en même temps sur le chemin demandé et sur le code 200, puis additionne la colonne de taille.",
          answerFormat: "Un nombre entier d’octets",
          accepted: compact([arborescence.bytes200Total]),
          explanation: `Le calcul demandé combine deux filtres : le chemin exact et le code HTTP 200. Une fois ces lignes isolées, il suffit d’additionner la taille envoyée en octets. Le total vaut ${arborescence.bytes200Total}, ce qui illustre un vrai croisement de conditions dans un journal web.`,
        },
      ],
      assets: [
        asset("log", "Export d’arborescence", "Arborescence partielle de « /srv », « /home » et « /etc/alize » au format « ls -lR --time-style=long-iso ».", arborescence.assetNames.treeFile),
        asset("log", "Historique de navigation", "Historique daté de commandes « cd » tapées par Cheikh Fall pour se repérer.", arborescence.assetNames.historyFile),
        asset("log", "Journal d’accès web", "Journal nginx de la journée du 6 avril 2026 au format « combined ».", arborescence.assetNames.accessFile),
        asset("log", "Liste CSV des adhérents", "Fichier séparé par des points-virgules avec ville et formule d’adhésion.", arborescence.assetNames.csvFile),
        asset("guide", "Guide du TP 1", "Méthode de lecture de l’arborescence, de l’historique, des journaux web et du CSV.", arborescence.assetNames.guideFile),
      ],
    },
    {
      slug: "tp-linux-comptes-droits",
      title: "TP 2 : auditer les droits, les comptes et sudo",
      description: "Tu recoupes les exports de comptes, de groupes, de sudo, de permissions et de SUID pour repérer des défauts concrets sans toucher à une vraie machine.",
      difficulty: "intermediaire",
      xp: 150,
      format: "logs",
      minutes: 50,
      requiresComputer: false,
      isAssessment: false,
      category: "linux",
      briefing: "Le mardi 7 avril 2026, Ousmane Diallo prépare l’arrivée d’un nouveau prestataire sur « srv-fichiers01 ». Avant d’ouvrir plus d’accès, il exporte « /etc/passwd », « /etc/shadow », « /etc/group », les règles sudo, des permissions sensibles, la liste des binaires SUID et les dernières connexions. Tu dois retrouver les comptes anormaux, lire correctement les empreintes, comparer les shells, évaluer les permissions et signaler les éléments les plus risqués avec des preuves précises.",
      constraints: [
        "Tous les comptes et empreintes de ce lab sont fictifs.",
        "Tu ne modifies rien : tu interprètes uniquement des exports textuels.",
      ],
      tools: [
        "Visionneuse du site",
        "Git Bash ou WSL pour awk, grep et sort",
        "PowerShell 5.1 pour les variantes Windows",
      ],
      objectives: [
        "Lire les champs utiles de passwd, shadow et group",
        "Identifier un compte privilégié ou un shell anormal",
        "Comparer des règles sudo et des permissions à risque",
        "Repérer un binaire SUID inattendu et des comptes dormants",
      ],
      hints: [
        "Le troisième champ de passwd est l’UID ; le septième est le shell.",
        "Dans shadow, un champ vide n’est pas la même chose qu’un compte verrouillé.",
        "Pour sudo, compare le périmètre réel de chaque règle, pas seulement le nom du fichier.",
        "Dans lastlog, « Never logged in » compte comme absence totale de connexion.",
      ],
      tasks: [
        {
          prompt: "Dans « lnx-tp2-passwd.txt », quel compte possède l’UID 0 en plus de « root » ?",
          hint: "Filtre les lignes dont le troisième champ vaut 0, puis ignore « root ».",
          answerFormat: "Nom de compte en minuscules",
          accepted: compact([comptes.uidZeroAlias]),
          explanation: `L’UID 0 correspond au superutilisateur, quel que soit le nom du compte. En lisant la troisième colonne de passwd, on voit que ${comptes.uidZeroAlias} partage ce privilège avec root. C’est exactement le genre d’anomalie à signaler dans un audit.`,
        },
        {
          prompt: "Quel compte de service, dont le nom commence par « svc- », dispose d’un shell interactif alors qu’il devrait rester non connecté ?",
          hint: "Passe en revue les comptes « svc- », puis compare leur shell avec ceux en « nologin ».",
          answerFormat: "Nom de compte en minuscules",
          accepted: compact([comptes.serviceInteractive]),
          explanation: `Un compte de service devrait en général utiliser « nologin » ou un shell non interactif. Ici, ${comptes.serviceInteractive} possède un shell interactif, ce qui ouvre une surface d’usage ou d’abus inutile. Il faut donc lire à la fois la nature du compte et son shell final.`,
        },
        {
          prompt: "Dans « lnx-tp2-shadow.txt », quel compte a un champ de mot de passe complètement vide ?",
          hint: "Dans shadow, le champ sensible est le deuxième, entre le premier et le troisième deux-points.",
          answerFormat: "Nom de compte en minuscules",
          accepted: compact([comptes.emptyPasswordAccount]),
          explanation: `Un champ vide dans shadow n’est pas la même chose qu’un compte verrouillé : il indique l’absence de mot de passe défini. Le compte concerné ici est ${comptes.emptyPasswordAccount}. Vérifier la forme exacte du deuxième champ évite une mauvaise interprétation.`,
        },
        {
          prompt: `Pour le compte « ${comptes.weakAlgoAccount} » dans « lnx-tp2-shadow.txt », quel algorithme est indiqué par le préfixe de l’empreinte ? Réponds par une lettre. a) sha512-crypt b) yescrypt c) md5-crypt d) sha256-crypt`,
          hint: "Le guide donne la table des préfixes : compare seulement le début de la chaîne de hachage.",
          answerFormat: "Une seule lettre",
          accepted: compact(["c"]),
          explanation: `Le préfixe de l’empreinte du compte ${comptes.weakAlgoAccount} correspond à l’option c, donc à ${comptes.weakAlgo}. Lire ce préfixe est la bonne manière d’identifier la famille de hachage sans rien craquer. Cela permet ensuite d’évaluer si l’algorithme est moderne ou trop ancien.`,
        },
        {
          prompt: "Combien de comptes apparaissent comme verrouillés dans « lnx-tp2-shadow.txt » ?",
          hint: "Compte les lignes dont le deuxième champ commence par « ! » ou par « * ».",
          answerFormat: "Un nombre entier",
          accepted: compact([comptes.lockedCount]),
          explanation: `Dans ce lab, un compte verrouillé se reconnaît à un deuxième champ commençant par « ! » ou « * ». En appliquant cette règle sur tout le fichier shadow, on obtient ${comptes.lockedCount} comptes verrouillés. C’est un comptage simple, mais il repose sur une convention précise à respecter.`,
        },
        {
          prompt: `Pour le compte « ${comptes.changedAccount} », quelle est la date du dernier changement de mot de passe au format AAAA-MM-JJ ?`,
          hint: "Le troisième champ de shadow est un nombre de jours depuis 1970-01-01 ; convertis-le en date UTC.",
          answerFormat: "AAAA-MM-JJ",
          accepted: compact([comptes.changedDate]),
          explanation: `Le troisième champ de shadow donne un nombre de jours écoulés depuis le 1 janvier 1970. Une fois converti, le dernier changement du compte ${comptes.changedAccount} tombe le ${comptes.changedDate}. Cette conversion de base est souvent nécessaire dans un audit Linux.`,
        },
        {
          prompt: `Combien de jours se sont écoulés entre ce changement et le mardi 7 avril 2026 ?`,
          hint: "Utilise la date trouvée à la tâche précédente puis calcule l’écart en jours calendaires jusqu’au 2026-04-07.",
          answerFormat: "Un nombre entier de jours",
          accepted: compact([comptes.changedDays]),
          explanation: `À partir de la date de changement extraite depuis shadow, il faut calculer l’écart jusqu’au 7 avril 2026. Le résultat est ${comptes.changedDays} jours. Ce type de mesure sert à vérifier si une politique de renouvellement reste respectée.`,
        },
        {
          prompt: "Combien de membres le groupe « sudo » contient-il dans « lnx-tp2-group.txt » ?",
          hint: "Lis la liste après le quatrième deux-points puis compte les identifiants séparés par des virgules.",
          answerFormat: "Un nombre entier",
          accepted: compact([comptes.sudoMembers.length]),
          explanation: `Le groupe sudo se lit dans le dernier champ de la ligne correspondante du fichier group. En séparant cette liste sur les virgules, on compte ${comptes.sudoMembers.length} membres. C’est une première mesure simple de la surface d’administration locale.`,
        },
        {
          prompt: "Quel fichier sudoers concaténé contient la règle la plus dangereuse, celle qui accorde « NOPASSWD: ALL » ?",
          hint: "Cherche le périmètre le plus large possible et repère dans quel bloc commenté du fichier il apparaît.",
          answerFormat: "Chemin ou identifiant du fichier sudoers.d",
          accepted: compact([comptes.dangerousRule, comptes.dangerousRule.split("/").pop() ?? "", `sudoers.d/${comptes.dangerousRule.split("/").pop() ?? ""}`]),
          explanation: `La règle la plus dangereuse est celle qui permet toutes les commandes sans demande de mot de passe. Dans l’export concaténé, elle se trouve dans ${comptes.dangerousRule}. Il faut donc comparer le contenu réel des règles, pas seulement leur commentaire.`,
        },
        {
          prompt: `Dans « lnx-tp2-permissions.txt », quel est le mode octal du fichier « ${comptes.octalFile} » ?`,
          hint: "Transforme chaque triplet symbolique en somme 4, 2, 1 pour lecture, écriture et exécution.",
          answerFormat: "Mode octal sur 3 chiffres",
          accepted: compact([comptes.octalMode]),
          explanation: `La ligne du fichier ${comptes.octalFile} se convertit en additionnant chaque triplet symbolique. On obtient ${comptes.octalMode}. Savoir faire cette conversion reste indispensable pour juger rapidement si une permission est raisonnable ou trop large.`,
        },
        {
          prompt: "Quel est le premier fichier de la liste des permissions qui est modifiable par tous les utilisateurs ?",
          hint: "Cherche la première ligne de fichier dont le mode donne l’écriture au propriétaire, au groupe et aux autres.",
          answerFormat: "Nom exact du fichier",
          accepted: compact([comptes.worldWritableFile, comptes.worldWritablePath]),
          explanation: `Un fichier modifiable par tout le monde se reconnaît à un mode avec écriture pour les trois catégories. Dans cet export, le premier fichier qui correspond à ce critère est ${comptes.worldWritableFile}. L’ordre de lecture compte donc autant que le motif de permission.`,
        },
        {
          prompt: "Dans « lnx-tp2-suid.txt », combien de binaires SUID n’appartiennent pas à la liste de référence donnée dans le guide ?",
          hint: "Compare chaque chemin de la colonne finale à la liste normale fournie par le guide, puis compte seulement les écarts.",
          answerFormat: "Un nombre entier",
          accepted: compact([comptes.abnormalSuidCount]),
          explanation: `Le guide donne une liste de binaires SUID normaux pour ce lab. En comparant chaque chemin du listing à cette référence, on obtient ${comptes.abnormalSuidCount} écart. Ce comptage est une technique d’audit très concrète pour réduire le bruit et confirmer qu’il ne reste qu’une vraie anomalie à examiner.`,
        },
        {
          prompt: "Quel compte nominatif à shell valide n’a jamais ouvert de session d’après « lnx-tp2-derniere-connexion.txt » ?",
          hint: "Croise lastlog avec passwd : cherche « Never logged in », écarte les comptes de service puis vérifie que le shell n’est pas « nologin ».",
          answerFormat: "Nom de compte en minuscules",
          accepted: compact([comptes.neverLoggedInteractive]),
          explanation: `La tâche demande un croisement entre deux fichiers : un compte jamais connecté d’après lastlog, mais disposant d’un shell valide dans passwd. Le compte qui réunit ces deux critères est ${comptes.neverLoggedInteractive}. Ce type de compte oublié mérite une revue rapide.`,
        },
        {
          prompt: "Combien de comptes de personnes (UID de 1000 ou plus et shell de connexion valide, c’est-à-dire autre que « nologin ») ne se sont pas connectés depuis plus de 90 jours au mardi 7 avril 2026 ?",
          hint: "Garde les comptes dont l’UID est de 1000 ou plus et dont le shell n’est pas « nologin », puis compare leur dernière connexion à la date de référence ; considère « Never logged in » comme plus ancien que 90 jours.",
          answerFormat: "Un nombre entier",
          accepted: compact([comptes.dormantHumans]),
          explanation: `On ne garde que les comptes de personnes : UID de 1000 ou plus et shell différent de « nologin », ce qui écarte par exemple « nobody » malgré son UID élevé. On compare ensuite leur dernière connexion à la date du 7 avril 2026. En comptant « Never logged in » comme plus ancien que 90 jours, on obtient ${comptes.dormantHumans} comptes dormants. Cette lecture combine hygiène des accès et suivi d’activité.`,
        },
      ],
      assets: [
        asset("log", "Export de passwd", "Comptes locaux de « srv-fichiers01 » avec UID, GID, répertoire personnel et shell.", comptes.assetNames.passwdFile),
        asset("log", "Export de shadow", "Empreintes fictives, dates de changement et politique de mot de passe.", comptes.assetNames.shadowFile),
        asset("log", "Export de group", "Groupes locaux et listes de membres utiles pour l’audit.", comptes.assetNames.groupFile),
        asset("log", "Règles sudo concaténées", "Fichier principal sudoers et fichiers de « /etc/sudoers.d » rassemblés dans un seul export.", comptes.assetNames.sudoersFile),
        asset("log", "Permissions sensibles", "Listing « ls -l » de répertoires et fichiers critiques.", comptes.assetNames.permissionsFile),
        asset("log", "Liste des binaires SUID", "Sortie de « find / -xdev -perm -4000 -type f -ls ».", comptes.assetNames.suidFile),
        asset("log", "Dernières connexions", "Export « lastlog » des comptes du serveur.", comptes.assetNames.lastlogFile),
        asset("guide", "Guide du TP 2", "Repères de lecture de passwd, shadow, sudo, permissions et SUID.", comptes.assetNames.guideFile),
      ],
    },
    {
      slug: "tp-linux-processus-services",
      title: "TP 3 : processus, services et tâches planifiées",
      description: "Tu relies des sorties de processus, de services, de ports, de cron et de minuteurs systemd pour comprendre une charge anormale sur un serveur web Linux.",
      difficulty: "intermediaire",
      xp: 150,
      format: "logs",
      minutes: 50,
      requiresComputer: false,
      isAssessment: false,
      category: "linux",
      briefing: "Le mercredi 8 avril 2026, la supervision signale une charge anormale sur « srv-web01 ». Ousmane Diallo exporte la liste des processus, un arbre PID-PPID, les services systemd, les ports à l’écoute, les tâches planifiées, les minuteurs et le contenu d’une unité suspecte. Ton rôle est de relier toutes ces pièces pour retrouver le processus le plus gourmand, le service inhabituel, la tâche planifiée douteuse et les minuteurs qui montrent un problème durable.",
      constraints: [
        "Tu n’analyses que des exports statiques fournis par le labo.",
        "Aucune commande système réelle n’est nécessaire pour résoudre les tâches.",
      ],
      tools: [
        "Visionneuse du site",
        "Git Bash pour awk, sort et cut",
        "PowerShell 5.1 pour les variantes Windows",
      ],
      objectives: [
        "Lire correctement « ps aux » et un arbre PID-PPID",
        "Relier processus, ports et unités systemd",
        "Comprendre un horaire cron et sa prochaine exécution",
        "Repérer les minuteurs dont l’état n’est pas sain",
      ],
      hints: [
        "Dans « ps aux », le RSS est en kilo-octets et la commande commence après la colonne TIME.",
        "Le fichier d’arbre sert uniquement à retrouver les relations de parenté entre PID.",
        "Un service à l’écoute se recoupe avec « ss -tulpn » grâce au nom de processus ou au PID.",
        "Pour cron, lis séparément les cinq champs de temps avant la commande.",
      ],
      tasks: [
        {
          prompt: "Dans « lnx-tp3-ps.txt », quel PID consomme le plus de CPU ?",
          hint: "Trie mentalement ou avec un outil sur la colonne %CPU et garde la plus grande valeur.",
          answerFormat: "Un PID numérique",
          accepted: compact([processus.topCpuPid]),
          explanation: `La colonne %CPU du fichier « ps aux » permet d’identifier immédiatement le processus le plus gourmand. En comparant toutes les valeurs, le maximum revient au PID ${processus.topCpuPid}. Ce réflexe est essentiel quand on cherche l’origine d’une charge anormale.`,
        },
        {
          prompt: "Quel utilisateur lance ce processus très consommateur ? Réponds par une lettre. a) www-data b) mysql c) root d) odiallo",
          hint: "Lis la première colonne de la même ligne que le PID trouvé à la tâche précédente.",
          answerFormat: "Une seule lettre",
          accepted: compact(["c"]),
          explanation: `Une fois la bonne ligne trouvée, la première colonne donne l’utilisateur effectif du processus. Ici, le processus au CPU maximal tourne sous ${processus.topCpuUser}, donc l’option correcte est c. Associer charge et utilisateur aide ensuite à distinguer un service normal d’un processus lancé hors cadre.`,
        },
        {
          prompt: "Quel est le chemin exact de l’exécutable ou de la commande lancé par ce processus très consommateur ?",
          hint: "Sur la ligne ciblée, lis la colonne COMMAND sans la tronquer.",
          answerFormat: "Chemin ou commande exacte",
          accepted: compact([processus.topCpuCommand]),
          explanation: `La colonne COMMAND révèle le chemin ou la ligne de lancement du processus. Pour le PID le plus gourmand, elle vaut ${processus.topCpuCommand}. Lire ce champ en entier est souvent ce qui permet de distinguer un binaire légitime d’un programme rangé dans un emplacement douteux.`,
        },
        {
          prompt: "Dans « lnx-tp3-ps-arbre.txt », quel est le PID du parent direct de ce processus gourmand ?",
          hint: "Cherche la ligne du PID concerné, puis relève sa colonne PPID.",
          answerFormat: "Un PID numérique",
          accepted: compact([processus.topCpuParent]),
          explanation: `Le parent direct se lit dans la colonne PPID de l’export d’arbre. Pour le processus le plus gourmand, cette relation remonte au PID ${processus.topCpuParent}. Retrouver le parent aide à comprendre comment le processus a été lancé et quelle chaîne d’exécution l’a engendré.`,
        },
        {
          prompt: "Combien de processus appartiennent à l’utilisateur « www-data » dans « lnx-tp3-ps.txt » ?",
          hint: "Compte uniquement les lignes dont la première colonne vaut exactement « www-data ».",
          answerFormat: "Un nombre entier",
          accepted: compact([processus.wwwDataProcessCount]),
          explanation: `Pour ce comptage, il suffit d’isoler les lignes de « ps aux » dont l’utilisateur est exactement « www-data ». On en trouve ${processus.wwwDataProcessCount}. C’est une façon simple de mesurer le nombre de workers ou de shells actifs sous le compte du serveur web.`,
        },
        {
          prompt: "Quelle est la mémoire résidente totale de « www-data », en Mio arrondis à l’entier le plus proche ?",
          hint: "Additionne tous les RSS de « www-data », puis convertis de kilo-octets vers Mio en divisant par 1024 avant d’arrondir.",
          answerFormat: "Un nombre entier de Mio",
          accepted: compact([processus.wwwDataRssMiB]),
          explanation: `La mémoire résidente totale se calcule en additionnant les RSS de toutes les lignes « www-data », puis en divisant par 1024 pour passer en Mio et en arrondissant. Le total obtenu est ${processus.wwwDataRssMiB} Mio. Cette somme donne une image plus réaliste que la lecture d’une seule ligne.`,
        },
        {
          prompt: `Quel service écoute sur le port ${processus.portQuery} d’après « lnx-tp3-ports.txt » et « lnx-tp3-services.txt » ?`,
          hint: "Trouve d’abord le nom de processus dans « ss -tulpn », puis rapproche-le du nom d’unité systemd cohérent.",
          answerFormat: "Nom d’unité systemd",
          accepted: compact([processus.serviceForPort]),
          explanation: `Le port ${processus.portQuery} apparaît dans l’export des ports avec un nom de processus explicite. En le rapprochant de la liste des unités, on retrouve le service ${processus.serviceForPort}. Cette mise en relation entre port et service est un geste d’administration courant.`,
        },
        {
          prompt: "Quel numéro de port à l’écoute paraît inattendu sur ce serveur web ?",
          hint: "Repère le port associé au service inhabituel et ouvert sur toutes les interfaces.",
          answerFormat: "Numéro de port",
          accepted: compact([processus.unexpectedPort]),
          explanation: `Le port inattendu est ${processus.unexpectedPort}. Il se distingue par le fait qu’il est ouvert sur toutes les interfaces et lié à un service qui ne fait pas partie des composants web attendus. Savoir relever ce type d’écart permet de prioriser une investigation.`,
        },
        {
          prompt: "Combien de services sont actuellement en échec dans « lnx-tp3-services.txt » ?",
          hint: "Compte les lignes dont les colonnes ACTIVE et SUB indiquent toutes les deux « failed ».",
          answerFormat: "Un nombre entier",
          accepted: compact([processus.failedServices]),
          explanation: `La liste systemd signale les services en échec avec les colonnes ACTIVE et SUB à « failed ». En comptant ces lignes, on obtient ${processus.failedServices} services en échec. C’est une lecture rapide mais très utile pour repérer les problèmes persistants.`,
        },
        {
          prompt: "Quelle ligne cron s’exécute toutes les cinq minutes dans « lnx-tp3-cron.txt » ? Réponds par le chemin du script appelé.",
          hint: "Cherche la ligne dont les cinq premiers champs commencent par « */5 * * * * » puis relève la commande.",
          answerFormat: "Chemin absolu du script",
          accepted: compact([processus.everyFiveIdentifier]),
          explanation: `Dans cron, « */5 * * * * » signifie une exécution toutes les cinq minutes. La ligne correspondante appelle ${processus.everyFiveIdentifier}. Lire l’expression puis extraire seulement le script demandé est la bonne façon d’éviter les erreurs de copie.`,
        },
        {
          prompt: "Si l’on se place au mercredi 8 avril 2026 à 03:05 UTC, à quelle heure la ligne « */20 2-4 * * 1-5 root /usr/local/bin/collecte-charge.sh » se lancera-t-elle ensuite ?",
          hint: "Lis le pas « */20 », la plage d’heures « 2-4 » et les jours ouvrés, puis cherche la prochaine occurrence après 03:05.",
          answerFormat: "HH:MM",
          accepted: timeAnswers(processus.nextRunAfter),
          explanation: `L’expression « */20 2-4 * * 1-5 » déclenche une exécution toutes les 20 minutes entre 02:00 et 04:59 les jours ouvrés. Après 03:05 UTC le mercredi 8 avril 2026, la prochaine occurrence tombe donc à ${processus.nextRunAfter}. Ce calcul montre qu’il faut lire pas, plage d’heures et jour autorisé ensemble.`,
        },
        {
          prompt: "Quelle tâche planifiée exécutée avec les privilèges du superutilisateur appelle un script que n’importe quel utilisateur peut modifier (droit d’écriture pour « autres ») ? Réponds par une lettre. a) « /usr/local/bin/verifier-sessions.sh » b) « /usr/local/bin/purger-miniatures.sh » c) « /usr/local/bin/rotation-longue.sh » d) « /usr/local/bin/rapport-cache.sh »",
          hint: "Pour chaque proposition, retrouve qui lance la tâche, puis lis les droits du script rappelés dans l’export.",
          answerFormat: "Une seule lettre",
          accepted: compact(["d"]),
          explanation: `L’export rappelle les droits des quatre scripts proposés. « purger-miniatures.sh » est lui aussi modifiable par tout le monde, mais il est lancé par le compte svc-web et non par root : le modifier ne donnerait pas les droits du superutilisateur. Les deux autres ne sont modifiables que par leur propriétaire. Le script lancé par root et modifiable par n’importe qui est ${processus.weakRootScript}, donc la bonne réponse est d.`,
        },
        {
          prompt: "Quel est le nom de l’unité systemd qui redémarre toujours et dont « ExecStart » pointe vers un chemin inhabituel ?",
          hint: "Lis « lnx-tp3-unite.service » puis retrouve la même unité dans la liste des services.",
          answerFormat: "Nom d’unité systemd",
          accepted: compact([processus.suspiciousUnit]),
          explanation: `Le fichier d’unité montre explicitement « Restart=always » et un « ExecStart » rangé dans un chemin inhabituel. L’unité correspondante est ${processus.suspiciousUnit}. C’est un bon exemple d’anomalie qui ne se voit qu’en combinant service et contenu d’unité.`,
        },
        {
          prompt: "Combien de minuteurs de « lnx-tp3-minuteurs.txt » n’ont encore jamais tourné, c’est-à-dire ont la colonne LAST à « n/a » ?",
          hint: "Lis uniquement la colonne LAST et compte les lignes où cette colonne vaut exactement « n/a ».",
          answerFormat: "Un nombre entier",
          accepted: compact([processus.badTimerCount]),
          explanation: `L’énoncé donne ici une définition opérationnelle unique : il faut compter seulement les minuteurs dont la colonne LAST vaut « n/a ». En appliquant ce critère direct à l’export, on en trouve ${processus.badTimerCount}. Cela évite de mélanger absence d’exécution et échec de service.`,
        },
        {
          prompt: "À partir du mercredi 8 avril 2026 à 03:00 UTC, quelle est la prochaine date d’exécution de la ligne cron « 0 3 15 * 5 root /usr/local/bin/revue-hebdo.sh » ?",
          hint: "Rappelle-toi la règle de cron : si le jour du mois et le jour de la semaine sont tous les deux restreints, l’exécution a lieu quand l’un OU l’autre correspond.",
          answerFormat: "AAAA-MM-JJ",
          accepted: compact([processus.orRuleDate]),
          explanation: `La ligne « 0 3 15 * 5 » se déclenche à 03:00 quand le jour du mois vaut 15 ou quand le jour de semaine vaut vendredi. À partir du mercredi 8 avril 2026 03:00 UTC, la prochaine date atteinte par cette règle est ${processus.orRuleDate}. Cette tâche vérifie que tu connais bien le piège du OU dans cron.`,
        },
      ],
      assets: [
        asset("log", "Liste des processus", "Sortie « ps aux » exportée depuis « srv-web01 ».", processus.assetNames.psFile),
        asset("log", "Arbre PID-PPID", "Export simplifié pour relier parents et enfants utiles.", processus.assetNames.treeFile),
        asset("log", "Services systemd", "Liste complète « systemctl list-units --type=service --all --no-pager ».", processus.assetNames.servicesFile),
        asset("log", "Ports à l’écoute", "Sortie « ss -tulpn » du serveur.", processus.assetNames.portsFile),
        asset("log", "Tâches planifiées", "Concaténation de crontab et de fichiers « /etc/cron.d » avec commentaires utiles.", processus.assetNames.cronFile),
        asset("log", "Minuteurs systemd", "Sortie « systemctl list-timers --all --no-pager ».", processus.assetNames.timersFile),
        asset("log", "Unité systemd suspecte", "Contenu d’une unité retrouvée dans la liste des services.", processus.assetNames.unitFile),
        asset("guide", "Guide du TP 3", "Méthode de lecture des processus, services, ports, cron et minuteurs.", processus.assetNames.guideFile),
      ],
    },
  ];
}
