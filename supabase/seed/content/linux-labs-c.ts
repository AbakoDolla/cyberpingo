import type { PathLab } from "./reseaux-path";

export type LinuxLab = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsC {
  incident: {
    assetNames: {
      authFile: string;
      accessFile: string;
      historyFile: string;
      psFile: string;
      portsFile: string;
      cronFile: string;
      modifiedFile: string;
      passwdFile: string;
      hashesFile: string;
      guideFile: string;
      timelineFile: string;
    };
    bruteForceIp: string;
    bruteForceFailureCount: number;
    webshellIp: string;
    firstWebshellTime: string;
    uploadedFilePath: string;
    webUser: string;
    sshServiceAccount: string;
    firstSshSuccessTime: string;
    sshSourceIp: string;
    hiddenAccount: string;
    cronScriptPath: string;
    outboundTarget: string;
    modifiedSiteFile: string;
    compromiseDurationMinutes: number;
    containmentLetter: string;
    actionOrderLetter: string;
    publicIpCount: number;
  };
  projet: {
    auditDate: string;
    assetNames: {
      systemFile: string;
      accessFile: string;
      servicesFile: string;
      risksFile: string;
      gridFile: string;
      reportFile: string;
      guideFile: string;
    };
    statusLetters: {
      AC1: string;
      AC2: string;
      AC3: string;
      SY1: string;
      SY3: string;
      JO3: string;
      JO4: string;
      SA1: string;
      SE2: string;
    };
    securityUpdatesCount: number;
    permitRootLogin: string;
    openAllInterfacesCount: number;
    lastBackupSuccessDate: string;
    lastBackupAgeDays: number;
    domainScoreTarget: string;
    domainScorePercent: number;
    globalScorePercent: number;
    weakestDomainLetter: string;
    topPriorityAction: string;
    quickWinCount: number;
    highestRisk: number;
    maturityLetter: string;
    maturityLabel: string;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase())));
const timeAnswers = (value: string) => compact([value, value.replace(/^0/, "")]);
const percentAnswers = (value: number) => compact([value, `${value}%`, `${value} %`]);
const letterAnswers = (value: string) => compact([value]);
const yesNo = (value: boolean) => (value ? compact(["oui", "yes"]) : compact(["non", "no"]));

const asset = (kind: LinuxLab["assets"][number]["kind"], title: string, description: string, name: string) => ({
  kind,
  title,
  description,
  url: `/labs/${name}`,
});

export function buildLabsC(facts: FactsC): LinuxLab[] {
  const incident = facts.incident;
  const projet = facts.projet;

  return [
    {
      slug: "incident-serveur-linux",
      title: "Incident : un serveur web Linux compromis",
      description: "Tu reconstitues une intrusion web puis SSH sur srv-web01, recoupes des exports bruyants et choisis un confinement qui préserve les preuves.",
      difficulty: "avance",
      xp: 240,
      format: "logs",
      minutes: 70,
      requiresComputer: false,
      isAssessment: true,
      category: "linux",
      briefing: "Le mardi 21 avril 2026 à 14:30 UTC, la supervision de la Mutuelle Alizé signale une hausse de charge sur srv-web01 et des connexions sortantes qui ne ressemblent pas au trafic habituel du site. Ousmane Diallo a exporté les traces avant toute action destructive. Tu dois reconstituer l’ordre de l’intrusion, comprendre comment un point d’entrée web mène à une session SSH, retrouver la persistance laissée sur la machine et proposer le premier geste de confinement. Les journaux couvrent environ trente heures et mêlent activité légitime, bruit réseau et séquence malveillante. Chaque réponse doit être justifiée par les fichiers fournis et, pour les tâches difficiles, par au moins deux preuves concordantes.",
      constraints: [
        "Tu travailles uniquement sur des exports fictifs et tu ne touches à aucun vrai serveur.",
        "Ne télécharge ni n’exécute aucun fichier vu dans les traces et ne te connecte à aucune adresse observée dans les journaux.",
      ],
      tools: [
        "Visionneuse de journaux CyberPingo pour rechercher dans les exports",
        "Git Bash, WSL ou Termux si tu veux filtrer des lignes avec grep",
        "Windows PowerShell 5.1 si tu préfères Select-String sur ton poste",
      ],
      objectives: [
        "Relier un point d’entrée web à une suite d’actions système",
        "Lire auth.log, le journal nginx, un historique shell, ps et ss",
        "Recouper comptes, cron, fichiers modifiés et empreintes pour confirmer la persistance",
        "Choisir un confinement initial qui coupe l’attaque sans détruire les traces",
      ],
      hints: [
        "Toutes les adresses publiques visibles dans les fichiers ne jouent pas le même rôle dans l’incident.",
        "Le shell web apparaît côté nginx avant la connexion SSH réussie.",
        "La persistance laisse des traces dans plusieurs familles de preuves, pas dans un seul fichier.",
        "Un fichier ajouté et un fichier existant dont l’empreinte change ne répondent pas à la même question.",
      ],
      tasks: [
        {
          prompt: `Dans « ${incident.assetNames.authFile} », quelle adresse IP mène la force brute SSH sans jamais obtenir d’accès ?`,
          hint: "Repère la source publique qui accumule les échecs d’authentification tout en restant absente des succès.",
          answerFormat: "Adresse IPv4",
          accepted: compact([incident.bruteForceIp]),
          explanation: `Il faut filtrer les lignes d’échec dans auth.log puis vérifier qu’aucune ligne de succès ne correspond à cette même source. L’adresse ${incident.bruteForceIp} ne fait que du bruit de force brute et n’obtient jamais de session.`,
        },
        {
          prompt: `Toujours dans « ${incident.assetNames.authFile} », combien d’échecs SSH sont attribués à cette adresse de force brute ?`,
          hint: "Une fois la bonne source trouvée, recompte seulement ses lignes d’échec.",
          answerFormat: "Nombre entier",
          accepted: compact([incident.bruteForceFailureCount]),
          explanation: `Après avoir isolé la source de force brute, il suffit de recompter ses lignes Failed password. On en trouve ${incident.bruteForceFailureCount}, ce qui confirme une séquence distincte du reste de l’attaque.`,
        },
        {
          prompt: `En lisant « ${incident.assetNames.accessFile} », quelle adresse IP publique exploite le téléversement puis appelle le shell web ?`,
          hint: "Cherche la même source sur un envoi de fichier puis sur plusieurs requêtes qui déclenchent des commandes.",
          answerFormat: "Adresse IPv4",
          accepted: compact([incident.webshellIp]),
          explanation: `L’adresse ${incident.webshellIp} apparaît d’abord sur le téléversement malveillant, puis sur plusieurs GET contenant cmd=. Il faut donc croiser l’écriture initiale et les exécutions suivantes pour l’identifier proprement.`,
        },
        {
          prompt: `Dans « ${incident.assetNames.accessFile} », à quelle heure UTC apparaît la première requête malveillante vers le shell web ?`,
          hint: "Ignore le simple téléversement et garde la première requête qui déclenche réellement une commande.",
          answerFormat: "Heure UTC au format HH:MM:SS",
          accepted: timeAnswers(incident.firstWebshellTime),
          explanation: `La première exécution visible du shell web a lieu à ${incident.firstWebshellTime} UTC. La méthode consiste à repérer la première requête contenant cmd= sur le fichier téléversé, et non le POST d’envoi lui-même.`,
        },
        {
          prompt: `En croisant « ${incident.assetNames.accessFile} » et « ${incident.assetNames.modifiedFile} », quel est le chemin absolu du fichier PHP téléversé par l’attaquant ?`,
          hint: "Le journal web donne le nom utilisé ensuite, puis la liste des fichiers modifiés donne son emplacement complet sur le disque.",
          answerFormat: "Chemin absolu Linux",
          accepted: compact([incident.uploadedFilePath]),
          explanation: `Le journal nginx montre le nom du shell web appelé ensuite, puis la sortie de find -ls donne son emplacement exact. En recoupant les deux, on obtient ${incident.uploadedFilePath}.`,
        },
        {
          prompt: `Dans « ${incident.assetNames.psFile} », sous quel compte non privilégié tournent les processus de travail (workers) de nginx et du pool php-fpm ?`,
          hint: "Ignore les processus maîtres lancés par root et relève le compte des processus de travail.",
          answerFormat: "Nom de compte en minuscules",
          accepted: compact([incident.webUser]),
          explanation: `Les processus maîtres tournent sous root pour ouvrir les ports, mais les workers nginx et le pool php-fpm s’exécutent sous ${incident.webUser}. Cette lecture vient directement de ps aux et explique pourquoi le point d’entrée web ne démarre pas avec les privilèges root.`,
        },
        {
          prompt: `En croisant « ${incident.assetNames.authFile} » et « ${incident.assetNames.historyFile} », quel compte de service est réutilisé pour la connexion SSH réussie de l’attaquant ?`,
          hint: "Le compte concerné apparaît dans le succès SSH, puis dans l’historique des commandes ouvertes juste après.",
          answerFormat: "Nom de compte en minuscules",
          accepted: compact([incident.sshServiceAccount]),
          explanation: `Le succès SSH cite ${incident.sshServiceAccount}, et l’historique shell montre les commandes lancées depuis cette session. Le recoupement prouve qu’il s’agit bien du compte de service réutilisé par l’attaquant.`,
        },
        {
          prompt: `Dans « ${incident.assetNames.authFile} », à quelle heure UTC se produit le premier succès SSH de l’attaquant ?`,
          hint: "Concentre-toi sur la première authentification réussie associée à l’adresse d’exploitation, pas sur les sessions légitimes du reste de la journée.",
          answerFormat: "Heure UTC au format HH:MM:SS",
          accepted: timeAnswers(incident.firstSshSuccessTime),
          explanation: `Le premier succès SSH malveillant apparaît à ${incident.firstSshSuccessTime} UTC. Pour le trouver, il faut ignorer les connexions légitimes en clé publique et ne retenir que le premier Accepted password lié à l’attaque.`,
        },
        {
          prompt: `Toujours dans « ${incident.assetNames.authFile} », depuis quelle adresse l’attaquant obtient-il ce premier accès SSH réussi ?`,
          hint: "Relis la même ligne de succès que pour la tâche précédente et compare-la au journal web.",
          answerFormat: "Adresse IPv4",
          accepted: compact([incident.sshSourceIp]),
          explanation: `Le premier accès SSH réussi vient de ${incident.sshSourceIp}. Cette même source apparaît aussi dans le journal nginx, ce qui relie l’exploitation web et la session SSH.`,
        },
        {
          prompt: `En croisant « ${incident.assetNames.authFile} » et « ${incident.assetNames.passwdFile} », quel nom de compte caché l’attaquant ajoute-t-il ensuite ?`,
          hint: "La création laisse une trace explicite dans auth.log, puis le nouveau compte apparaît dans passwd.",
          answerFormat: "Nom de compte en minuscules",
          accepted: compact([incident.hiddenAccount]),
          explanation: `Auth.log contient l’appel à useradd puis passwd confirme la présence du nouveau compte. Le nom ajouté est ${incident.hiddenAccount}, ce qui valide une persistance de type compte local.`,
        },
        {
          prompt: `En croisant « ${incident.assetNames.cronFile} » et « ${incident.assetNames.historyFile} », quel chemin de script est ajouté pour la persistance cron ?`,
          hint: "Le cron montre le fichier lancé régulièrement, et l’historique shell montre sa création quelques minutes plus tôt.",
          answerFormat: "Chemin absolu Linux",
          accepted: compact([incident.cronScriptPath]),
          explanation: `La tâche cron pointe vers ${incident.cronScriptPath}, et l’historique shell montre quand ce script a été écrit. Les deux preuves ensemble établissent la persistance planifiée.`,
        },
        {
          prompt: `En croisant « ${incident.assetNames.psFile} », « ${incident.assetNames.portsFile} » et « ${incident.assetNames.historyFile} », quelle destination complète reçoit la connexion sortante inhabituelle ?`,
          hint: "Cherche d’abord le processus anormal, puis retrouve la même cible côté réseau et dans la ligne de commande qui l’a lancée.",
          answerFormat: "Adresse et port au format ip:port",
          accepted: compact([incident.outboundTarget, incident.outboundTarget.replace(":", " "), `${incident.outboundTarget.split(":")[0]} port ${incident.outboundTarget.split(":")[1]}`]),
          explanation: `Le processus anormal de ps, la connexion ESTAB de ss et l’historique shell pointent tous vers la même cible. La destination complète est ${incident.outboundTarget}.`,
        },
        {
          prompt: `Dans « ${incident.assetNames.hashesFile} », quel fichier du site a une empreinte différente entre le manifeste de référence et l’état actuel ?`,
          hint: "Compare seulement les chemins présents dans les deux sections, puis cherche celui dont le hash change.",
          answerFormat: "Chemin absolu Linux",
          accepted: compact([incident.modifiedSiteFile]),
          explanation: `Le manifeste de référence et l’état actuel ont un chemin commun dont l’empreinte ne correspond plus. Ce fichier modifié est ${incident.modifiedSiteFile}, ce qui documente une altération d’un composant déjà présent sur le site.`,
        },
        {
          prompt: `Entre la première requête malveillante de « ${incident.assetNames.accessFile} » et la création du compte caché visible dans « ${incident.assetNames.authFile} », combien de minutes s’écoulent-elles ?`,
          hint: "Relève d’abord les deux horodatages exacts, puis calcule l’écart en minutes entières.",
          answerFormat: "Nombre entier de minutes, secondes ignorées",
          accepted: compact([incident.compromiseDurationMinutes]),
          explanation: `Il faut partir de la première exécution du shell web, puis s’arrêter à la création du compte local. L’écart obtenu est de ${incident.compromiseDurationMinutes} minutes.`,
        },
        {
          prompt: "Quelle est la première mesure de confinement la plus appropriée ? Réponds par la lettre. a) supprimer le shell web et remettre le site en ligne tout de suite b) isoler la machine du réseau, sans l’éteindre et sans toucher aux journaux c) redémarrer le serveur pour couper les processus de l’attaquant d) changer le mot de passe du compte utilisé et surveiller la suite",
          hint: "Choisis l’action qui coupe les communications malveillantes sans effacer ce que l’enquête devra encore relire.",
          answerFormat: "Une seule lettre",
          accepted: letterAnswers(incident.containmentLetter),
          explanation: `Le bon premier geste doit stopper l’attaque en cours tout en préservant les traces. Ici, la lettre ${incident.containmentLetter} correspond à l’isolement maîtrisé de la machine avant toute remise en état. Supprimer le shell ou redémarrer efface des preuves, et un seul mot de passe changé laisse le compte caché et la tâche cron en place.`,
        },
        {
          prompt: "Quel ordre d’actions suit une gestion propre de cet incident ? Réponds par la lettre. a) redémarrer le serveur, nettoyer les journaux, puis changer les mots de passe b) prévenir les adhérents, analyser les journaux, puis isoler la machine c) supprimer le compte caché et le shell web, remettre le site en ligne, puis chercher l’origine de l’attaque d) isoler la machine, figer les preuves utiles, puis changer les secrets et remettre en état",
          hint: "Cherche la séquence qui commence par casser la capacité de nuisance, puis qui protège l’analyse avant la remédiation.",
          answerFormat: "Une seule lettre",
          accepted: letterAnswers(incident.actionOrderLetter),
          explanation: `La séquence correcte commence par l’isolement, protège ensuite les preuves puis passe à la rotation des secrets et à la remise en état. Dans les choix proposés, cela correspond à la lettre ${incident.actionOrderLetter}.`,
        },
        {
          prompt: "En réunissant les adresses publiques trouvées aux questions 1, 3, 9 et 12 (sans le port), combien d’adresses IP distinctes obtiens-tu ?",
          hint: "Plusieurs questions peuvent désigner la même adresse : compte chaque adresse une seule fois.",
          answerFormat: "Nombre entier",
          accepted: compact([incident.publicIpCount]),
          explanation: `Les adresses des questions 1, 3, 9 et 12 se ramènent à trois acteurs : la source de force brute, la source qui exploite le shell web puis se connecte en SSH (la même adresse aux questions 3 et 9) et la destination de la connexion sortante. Le nombre d’adresses distinctes est ${incident.publicIpCount}.`,
        },
      ],
      assets: [
        asset("log", "Journal SSH et sudo", "Les authentifications, les échecs de force brute, les sessions cron et les actions sudo observées.", incident.assetNames.authFile),
        asset("log", "Journal web nginx", "Le trafic normal du site, les robots, les scanners opportunistes et la séquence d’exploitation.", incident.assetNames.accessFile),
        asset("log", "Historique shell du compte compromis", "Les commandes lancées après la connexion SSH réussie.", incident.assetNames.historyFile),
        asset("log", "Processus actifs", "Une sortie ps aux complète avec les services légitimes et le processus malveillant.", incident.assetNames.psFile),
        asset("log", "Ports et connexions", "Les écoutes, les sessions établies et la connexion sortante inhabituelle.", incident.assetNames.portsFile),
        asset("log", "Tâches planifiées", "Le crontab système, plusieurs tâches légitimes et la persistance ajoutée.", incident.assetNames.cronFile),
        asset("log", "Fichiers modifiés", "La fenêtre find -ls qui mélange bruit normal et traces d’intrusion.", incident.assetNames.modifiedFile),
        asset("log", "Comptes locaux", "L’export de passwd du serveur avec comptes système, humains et de service.", incident.assetNames.passwdFile),
        asset("log", "Empreintes du site", "Le manifeste de référence puis l’état actuel de l’arborescence web.", incident.assetNames.hashesFile),
        asset("guide", "Guide de l’évaluation", "La méthode, les commandes utiles et les repères de confinement.", incident.assetNames.guideFile),
        asset("report_template", "Modèle de chronologie", "Un tableau vide pour reconstituer la séquence complète de l’incident.", incident.assetNames.timelineFile),
      ],
    },
    {
      slug: "projet-audit-linux",
      title: "Projet final : auditer un serveur Linux et rédiger le rapport",
      description: "Tu notes toi-même 24 contrôles à partir des preuves, calcules les scores puis priorises les actions selon le risque et l’effort.",
      difficulty: "intermediaire",
      xp: 280,
      format: "logs",
      minutes: 100,
      requiresComputer: false,
      isAssessment: true,
      category: "linux",
      briefing: "Le lundi 27 avril 2026, tu interviens comme auditeur bénévole sur srv-fichiers01 pour la Mutuelle Alizé. Ousmane Diallo t’a remis une grille de 24 contrôles dont la colonne de statut est volontairement vide, ainsi qu’un dossier de preuves en lecture seule. Ton rôle n’est pas de recopier un verdict déjà donné, mais de noter toi-même chaque contrôle à partir des exports système, accès et services. Une fois les statuts déduits, tu recalcules les scores par domaine, le score global, le niveau de maturité et l’ordre des remédiations à lancer. Le rapport final doit rester factuel, chiffré et justifié par les preuves du dossier, sans ajouter de contrôles extérieurs à la grille.",
      constraints: [
        "Tu t’appuies uniquement sur les fichiers fournis et sur les règles écrites dans la grille.",
        "Chaque statut doit être déduit des preuves, sans toucher au serveur et sans inventer un seuil non documenté.",
      ],
      tools: [
        "Visionneuse de journaux CyberPingo pour relire les exports",
        "Git Bash, WSL ou Termux pour compter, filtrer et trier si tu veux vérifier tes calculs",
        "Windows PowerShell 5.1 pour relire les mêmes preuves avec Select-String ou Import-Csv",
      ],
      objectives: [
        "Déduire un statut de contrôle à partir d’un critère objectif et des preuves techniques",
        "Calculer un score pondéré de domaine puis un score global",
        "Prioriser les actions à partir des seuls contrôles jugés partiels ou non conformes",
        "Transformer des exports bruts en synthèse d’audit défendable",
      ],
      hints: [
        "Lis toujours le critère du contrôle avant d’ouvrir les preuves, sinon tu risques de compter la mauvaise chose.",
        "Le registre de risques ne sert qu’après avoir repéré les contrôles partiels ou non conformes.",
        "Les preuves d’accès couvrent les comptes, sudo, SSH, le pare-feu et les ports ; les preuves de services couvrent aussi les sauvegardes et MariaDB.",
        "Le niveau de maturité se déduit du score global entier et des bornes écrites dans la grille.",
      ],
      tasks: [
        {
          prompt: "Quel est le statut du contrôle AC1 dans « lnx-proj-grille-audit.md » ? Réponds par la lettre c, p ou n.",
          hint: "Lis d’abord le critère du contrôle AC1, puis relève la valeur effective correspondante dans les preuves d’accès.",
          answerFormat: "Une seule lettre : c, p ou n",
          accepted: letterAnswers(projet.statusLetters.AC1),
          explanation: `Le contrôle AC1 se juge sur la valeur effective de PermitRootLogin. Les preuves d’accès montrent la valeur no, ce qui place ce contrôle au statut ${projet.statusLetters.AC1}.`,
        },
        {
          prompt: "Quel est le statut du contrôle AC2 dans « lnx-proj-grille-audit.md » ? Réponds par la lettre c, p ou n.",
          hint: "Le critère combine la valeur de PasswordAuthentication et le périmètre réel d’accès SSH d’administration.",
          answerFormat: "Une seule lettre : c, p ou n",
          accepted: letterAnswers(projet.statusLetters.AC2),
          explanation: `AC2 ne dépend pas seulement de PasswordAuthentication, mais aussi de la restriction de la source d’administration. Comme l’authentification par mot de passe reste active tout en étant cantonnée à une source précise pour l’administration, le statut correct est ${projet.statusLetters.AC2}.`,
        },
        {
          prompt: "Quel est le statut du contrôle AC3 dans « lnx-proj-grille-audit.md » ? Réponds par la lettre c, p ou n.",
          hint: "Compte les comptes de service ayant un shell interactif, puis applique la borne écrite dans la grille.",
          answerFormat: "Une seule lettre : c, p ou n",
          accepted: letterAnswers(projet.statusLetters.AC3),
          explanation: `AC3 se déduit du nombre de comptes de service dotés d’un shell interactif. Les preuves montrent un seul compte de service dans ce cas, ce qui mène au statut ${projet.statusLetters.AC3}.`,
        },
        {
          prompt: "Quel est le statut du contrôle SY1 dans « lnx-proj-grille-audit.md » ? Réponds par la lettre c, p ou n.",
          hint: "Compte uniquement les correctifs du canal de sécurité dans la sortie apt, puis applique le seuil du contrôle.",
          answerFormat: "Une seule lettre : c, p ou n",
          accepted: letterAnswers(projet.statusLetters.SY1),
          explanation: `SY1 repose sur le nombre de correctifs de sécurité encore en attente. Les preuves système en montrent ${projet.securityUpdatesCount}, ce qui place ce contrôle au statut ${projet.statusLetters.SY1}.`,
        },
        {
          prompt: "Quel est le statut du contrôle SY3 dans « lnx-proj-grille-audit.md » ? Réponds par la lettre c, p ou n.",
          hint: "Relis les options de montage de /tmp et vérifie combien des trois options exigées sont présentes.",
          answerFormat: "Une seule lettre : c, p ou n",
          accepted: letterAnswers(projet.statusLetters.SY3),
          explanation: `Le contrôle SY3 vérifie la présence de nodev, nosuid et noexec sur /tmp. Les trois options sont présentes dans les preuves, ce qui donne le statut ${projet.statusLetters.SY3}.`,
        },
        {
          prompt: "Quel est le statut du contrôle JO3 dans « lnx-proj-grille-audit.md » ? Réponds par la lettre c, p ou n.",
          hint: "Cherche le service auditd dans la liste systemd et compare son état à la règle du contrôle.",
          answerFormat: "Une seule lettre : c, p ou n",
          accepted: letterAnswers(projet.statusLetters.JO3),
          explanation: `JO3 se lit dans l’état du service auditd. Les preuves montrent qu’il n’est pas actif, ce qui mène au statut ${projet.statusLetters.JO3}.`,
        },
        {
          prompt: "Quel est le statut du contrôle JO4 dans « lnx-proj-grille-audit.md » ? Réponds par la lettre c, p ou n.",
          hint: "Vérifie si la configuration du collecteur central existe et si elle est réellement active.",
          answerFormat: "Une seule lettre : c, p ou n",
          accepted: letterAnswers(projet.statusLetters.JO4),
          explanation: `JO4 dépend de l’existence d’une configuration de transfert central et de son activation effective. Ici, la configuration existe mais reste commentée, ce qui conduit au statut ${projet.statusLetters.JO4}.`,
        },
        {
          prompt: "Quel est le statut du contrôle SA1 dans « lnx-proj-grille-audit.md » ? Réponds par la lettre c, p ou n.",
          hint: "Pars de la dernière ligne de sauvegarde réussie, calcule son âge au 27 avril 2026, puis applique le seuil.",
          answerFormat: "Une seule lettre : c, p ou n",
          accepted: letterAnswers(projet.statusLetters.SA1),
          explanation: `Le contrôle SA1 se juge sur l’ancienneté de la dernière sauvegarde réussie. Celle-ci date du ${projet.lastBackupSuccessDate}, soit ${projet.lastBackupAgeDays} jours avant l’audit, ce qui donne le statut ${projet.statusLetters.SA1}.`,
        },
        {
          prompt: "Quel est le statut du contrôle SE2 dans « lnx-proj-grille-audit.md » ? Réponds par la lettre c, p ou n.",
          hint: "Regarde si la configuration du dossier d’upload bloque explicitement l’exécution de PHP ou si cette protection manque.",
          answerFormat: "Une seule lettre : c, p ou n",
          accepted: letterAnswers(projet.statusLetters.SE2),
          explanation: `SE2 se déduit de la protection réelle du dossier d’upload. Les preuves de services ne montrent pas de blocage effectif de l’exécution PHP à cet endroit, d’où le statut ${projet.statusLetters.SE2}.`,
        },
        {
          prompt: `Dans « ${projet.assetNames.systemFile} », combien de correctifs de sécurité restent en attente ?`,
          hint: "Ne compte que les lignes du canal security dans la section apt.",
          answerFormat: "Nombre entier",
          accepted: compact([projet.securityUpdatesCount]),
          explanation: `Il faut isoler les paquets du canal security dans la sortie apt list --upgradable. Le total observé est ${projet.securityUpdatesCount} correctifs de sécurité en attente.`,
        },
        {
          prompt: `Quelle est la valeur effective de PermitRootLogin visible dans « ${projet.assetNames.accessFile} » ?`,
          hint: "Lis la section sshd -T, qui donne déjà la valeur effective et non une simple valeur de fichier source.",
          answerFormat: "Valeur exacte, par exemple no",
          accepted: compact([projet.permitRootLogin]),
          explanation: `La sortie sshd -T donne directement la valeur effective du paramètre. Ici, PermitRootLogin vaut ${projet.permitRootLogin}.`,
        },
        {
          prompt: `En relisant « ${projet.assetNames.accessFile} », combien de ports TCP écoutent sur toutes les interfaces (adresse locale 0.0.0.0) ?`,
          hint: "Compte les lignes LISTEN dont l’adresse locale commence par 0.0.0.0:, sans inclure 127.0.0.1.",
          answerFormat: "Nombre entier",
          accepted: compact([projet.openAllInterfacesCount]),
          explanation: `Le comptage se fait dans la sortie ss en ne gardant que les écoutes sur 0.0.0.0. On en trouve ${projet.openAllInterfacesCount}.`,
        },
        {
          prompt: `Quel est l’âge en jours de la dernière sauvegarde réussie à la date d’audit du ${projet.auditDate}, d’après « ${projet.assetNames.servicesFile} » ?`,
          hint: "Repère la dernière ligne SUCCESS dans le journal de sauvegarde, puis calcule l’écart calendaire avec le 27 avril 2026.",
          answerFormat: "Nombre entier de jours",
          accepted: compact([projet.lastBackupAgeDays]),
          explanation: `La dernière sauvegarde réussie visible dans les preuves de services date du ${projet.lastBackupSuccessDate}. Par rapport à la visite du ${projet.auditDate}, elle a ${projet.lastBackupAgeDays} jours.`,
        },
        {
          prompt: `Quel est le score pondéré du domaine « ${projet.domainScoreTarget} » dans « ${projet.assetNames.gridFile} » ?`,
          hint: "Déduis d’abord le statut des quatre contrôles du domaine, puis applique la formule de score pondéré avec leurs poids.",
          answerFormat: "Pourcentage entier",
          accepted: percentAnswers(projet.domainScorePercent),
          explanation: `Après avoir statué sur les contrôles du domaine ${projet.domainScoreTarget}, on applique la formule de la grille et l’arrondi demandé. Le score obtenu est ${projet.domainScorePercent} %.`,
        },
        {
          prompt: `Quel est le score global du serveur après avoir noté l’ensemble de la grille « ${projet.assetNames.gridFile} » ?`,
          hint: "Ne calcule le score global qu’après avoir déduit les 24 statuts, puis additionne tous les poids et toutes les valeurs.",
          answerFormat: "Pourcentage entier",
          accepted: percentAnswers(projet.globalScorePercent),
          explanation: `Le score global se calcule sur l’ensemble des 24 contrôles, avec les poids donnés par la grille et l’arrondi demandé. Le résultat final est ${projet.globalScorePercent} %.`,
        },
        {
          prompt: "Quel domaine obtient le score le plus faible ? Réponds par la lettre. a) accès et comptes b) réseau c) système et correctifs d) journalisation e) sauvegardes f) configuration des services",
          hint: "Calcule ou compare les six scores de domaine, puis convertis le domaine le plus faible en lettre.",
          answerFormat: "Une seule lettre",
          accepted: letterAnswers(projet.weakestDomainLetter),
          explanation: `Une fois les six domaines recalculés, le domaine le plus faible correspond à la lettre ${projet.weakestDomainLetter}. Il s’agit de celui dont le pourcentage pondéré est le plus bas.`,
        },
        {
          prompt: `Dans « ${projet.assetNames.risksFile} », quel identifiant d’action arrive en priorité n°1 une fois les contrôles partiels et non conformes retenus ?`,
          hint: "Garde seulement les actions liées à des contrôles que tu as jugés partiels ou non conformes, puis trie selon la règle écrite dans la grille.",
          answerFormat: "Identifiant d’action",
          accepted: compact([projet.topPriorityAction]),
          explanation: `On ne priorise que les actions liées à des contrôles partiels ou non conformes, puis on trie par risque décroissant et effort croissant. L’action qui arrive en tête est ${projet.topPriorityAction}.`,
        },
        {
          prompt: `Combien de gains rapides restent dans « ${projet.assetNames.risksFile} » après avoir filtré sur les seuls contrôles partiels ou non conformes ?`,
          hint: "Commence par écarter les actions liées à des contrôles conformes, puis applique la définition de gain rapide de la grille.",
          answerFormat: "Nombre entier",
          accepted: compact([projet.quickWinCount]),
          explanation: `Après avoir filtré le registre sur les contrôles réellement à traiter, il faut garder les actions d’effort 1 avec un risque d’au moins 6. On obtient ainsi ${projet.quickWinCount} gains rapides.`,
        },
        {
          prompt: "Quel niveau global de maturité correspond au score final ? Réponds par la lettre. a) initial b) fragile c) maîtrise d) robuste",
          hint: "Calcule d’abord le score global entier, puis reporte-le sur les bornes de maturité de la grille.",
          answerFormat: "Une seule lettre",
          accepted: letterAnswers(projet.maturityLetter),
          explanation: `Le score global du serveur tombe dans la tranche correspondant au niveau ${projet.maturityLabel}. Dans les choix proposés, cela correspond à la lettre ${projet.maturityLetter}.`,
        },
      ],
      assets: [
        asset("log", "Preuves système", "Version du système, correctifs en attente, occupation disque, montage de tmp et paramètres sysctl.", projet.assetNames.systemFile),
        asset("log", "Preuves d’accès", "Comptes, shadow, groupes, sudo, configuration SSH effective, pare-feu et ports ouverts.", projet.assetNames.accessFile),
        asset("log", "Preuves de services", "Services systemd, rotation des journaux, cron, sauvegardes, restauration, MariaDB et configuration web.", projet.assetNames.servicesFile),
        asset("log", "Registre de risques", "Les actions envisagées, chacune liée à un contrôle de la grille, avec vraisemblance, impact et effort.", projet.assetNames.risksFile),
        asset("guide", "Grille d’audit Linux", "Les 24 contrôles, leurs poids, leurs seuils objectifs et les règles de calcul.", projet.assetNames.gridFile),
        asset("report_template", "Modèle de rapport", "Une structure à remplir pour la synthèse, les scores et le plan d’action.", projet.assetNames.reportFile),
        asset("guide", "Guide du projet final", "La méthode, les commandes utiles et les repères de calcul.", projet.assetNames.guideFile),
      ],
    },
  ];
}
