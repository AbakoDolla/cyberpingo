import type { PathLab } from "./reseaux-path";

export type PtLabTp1 = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsPtTp1 {
  ptTp1: {
    assetNames: {
      lettre: string;
      regles: string;
      cibles: string;
      actions: string;
      guide: string;
    };
    exactInScopeLetter: string;
    inScopeCount: number;
    clarificationTarget: string;
    forbiddenActionCount: number;
    missionStart: string;
    dailyStopTime: string;
    emergencyContact: string;
    legalClarificationActionId: string;
    passiveAllowedCount: number;
    lightScanBlock: string;
    networkOnlyOutTargetId: string;
    neverActionId: string;
    noAccountInScopeCount: number;
    paieDecisionLetter: string;
    maxLoadActionId: string;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const timeAnswers = (value: string) => compact([value, value.replace(/^0/, "")]);
const asset = (kind: PtLabTp1["assets"][number]["kind"], title: string, description: string, name: string) => ({ kind, title, description, url: `/labs/${name}` });

export function buildPtLabTp1(facts: FactsPtTp1): PtLabTp1[] {
  const tp1 = facts.ptTp1;

  return [{
    slug: "tp-pt-cadrage",
    title: "TP 1 : lire une lettre de mission et fixer le périmètre",
    description: "Tu lis la lettre de mission, les règles d’engagement, les cibles découvertes et les actions proposées pour distinguer ce qui est en périmètre, interdit ou à clarifier avant toute action technique.",
    difficulty: "debutant",
    xp: 130,
    format: "logs",
    minutes: 40,
    requiresComputer: false,
    isAssessment: false,
    category: "securite",
    briefing: "Le 2 juin 2026, Mariam Diallo ouvre une mission de cadrage pour la Coopérative Sahel-Vert. Yao Kouassi a déjà dressé une liste de cibles découvertes et d’actions envisagées, mais rien ne doit partir tant que la lettre de mission et les règles d’engagement n’ont pas été lues ligne par ligne. Tu dois donc fixer le périmètre, relever les blocages immédiats et noter les clarifications à obtenir avant toute activité. Tous les documents sont fictifs et défensifs. Tu analyses uniquement ces fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
    constraints: [
      "Tu travailles uniquement sur des fichiers fournis et fictifs.",
      "Les décisions se prennent à partir des documents du client et du cabinet ; aucune connaissance externe n’est nécessaire.",
      "Une cible ou une action tombe dans une seule colonne : en périmètre, interdit ou à clarifier.",
    ],
    tools: [
      "Visionneuse du site",
      "Git Bash, WSL ou Termux pour filtrer le CSV si tu veux compter plus vite",
      "PowerShell 5.1 avec Get-Content -Encoding UTF8 et Import-Csv -Encoding UTF8 sur Windows",
    ],
    objectives: [
      "Lire une lettre de mission et des règles d’engagement sans projeter des habitudes perso",
      "Classer une cible à partir du nom exact, du bloc réseau et du doute écrit",
      "Classer une action à partir de la cible, de la famille, de l’intensité, de l’horaire et des comptes fournis",
      "Justifier pourquoi une bonne cible peut quand même rendre une action interdite ou à clarifier",
    ],
    hints: [
      "Commence par recopier la liste exacte des noms autorisés et du bloc public autorisé.",
      "Le fait qu’un nom ressemble au client ne suffit jamais s’il n’apparaît pas dans la lettre.",
      "Pour les actions, contrôle toujours la famille, l’intensité et l’horaire avant de conclure.",
      "Une action authentifiée sans compte livré ne devient pas autorisée par supposition.",
    ],
    tasks: [
      {
        prompt: "Parmi ces quatre propositions, laquelle est exactement en périmètre dès maintenant ? Réponds par une lettre. a) rh-externe.example b) 198.51.101.44 c) 198.51.100.21 d) sahelvert.example",
        hint: "Croise le nom ou l’adresse avec la liste exacte de la lettre ; une ressemblance ou un doute écrit ne suffisent pas.",
        answerFormat: "Une seule lettre",
        accepted: compact([tp1.exactInScopeLetter]),
        explanation: "Pour répondre proprement, il faut comparer chaque proposition à la liste exacte des noms ou blocs autorisés. Ici, une seule proposition correspond à une cible explicitement confiée sans doute ni bloc voisin. Les autres sont soit hors mission, soit à clarifier. La bonne réponse est donc la lettre attendue par les faits du labo.",
      },
      {
        prompt: `Dans « ${tp1.assetNames.cibles} », combien de lignes ont une cible en périmètre sans ambiguïté, c’est-à-dire un nom exactement présent dans la liste des noms autorisés de la lettre de mission, ou une adresse (ou une plage CIDR entièrement incluse) comprise dans le bloc autorisé ? Compte une ligne une seule fois ; les lignes douteuses, les noms mal orthographiés et les blocs voisins ne comptent pas.`,
        hint: "Pour chaque ligne, vérifie si la cible est exactement l’un des noms autorisés ou une adresse du bloc autorisé, et écarte les lignes douteuses, les fautes de frappe et les blocs voisins.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp1.inScopeCount]),
        explanation: `Le bon comptage consiste à garder uniquement les cibles explicitement confiées et raccordées au bon bloc. En appliquant cette règle à toutes les lignes du CSV, on obtient ${tp1.inScopeCount}. Ce résultat vient du croisement nom plus réseau, pas d’une simple impression visuelle.`,
      },
      {
        prompt: `Quel FQDN de « ${tp1.assetNames.cibles} » doit être clarifié avant toute action parce qu’il porte « doute=yes » et n’apparaît pas dans la liste exacte des noms autorisés ?`,
        hint: "Cherche d’abord la ligne marquée doute=yes, puis vérifie qu’elle ne figure pas dans la liste des noms confiés par la lettre.",
        answerFormat: "Un FQDN exact",
        accepted: compact([tp1.clarificationTarget]),
        explanation: `Une cible à clarifier n’est ni autorisée par simple ressemblance ni interdite par réflexe ; elle attend une confirmation écrite. Ici, ${tp1.clarificationTarget} cumule le doute explicite du CSV et l’absence de mention dans la liste stricte des noms autorisés. C’est donc la bonne cible à suspendre avant toute action.`,
      },
      {
        prompt: `Dans « ${tp1.assetNames.actions} », combien d’actions sont immédiatement interdites ? Compte une action si sa cible est hors périmètre (nom étranger au client, adresse hors du bloc autorisé, ou nom autorisé dont l’IP observée sort du bloc ; une cible simplement douteuse reste à clarifier et ne compte pas), OU si sa famille figure parmi les « jamais » des règles d’engagement, OU si son intensité dépasse le plafond, OU si son horaire UTC sort de la fenêtre quotidienne.`,
        hint: "Lis chaque ligne avec quatre filtres : cible hors périmètre (pas seulement douteuse), famille jamais autorisée, intensité trop forte, horaire hors fenêtre. Une action ne compte qu’une fois même si plusieurs filtres la touchent.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp1.forbiddenActionCount]),
        explanation: `Le total ne vient pas d’une seule cause : certaines actions sont interdites par la cible, d’autres par la famille, l’intensité ou l’horaire. En appliquant toutes les règles écrites dans les ROE au CSV des actions, on compte ${tp1.forbiddenActionCount} interdiction(s) immédiate(s). C’est un bon exercice de lecture croisée plutôt qu’une simple lecture ligne à ligne.`,
      },
      {
        prompt: "Selon « la lettre de mission », quelle est la date autorisée de début des activités ?",
        hint: "Ne prends pas la date d’ouverture du dossier ; cherche la ligne qui fixe le début des activités autorisées.",
        answerFormat: "Une date au format AAAA-MM-JJ",
        accepted: compact([tp1.missionStart]),
        explanation: `La lettre distingue l’ouverture administrative de la mission et le début des activités autorisées. La date à retenir est ${tp1.missionStart}. Lire ce détail évite de commencer trop tôt alors même que la mission existe déjà sur le papier.`,
      },
      {
        prompt: "Selon « les règles d’engagement », quelle est l’heure limite d’arrêt quotidien ?",
        hint: "Lis la fenêtre quotidienne puis garde sa borne de fin sans convertir le fuseau.",
        answerFormat: "Une heure au format HH:MM",
        accepted: timeAnswers(tp1.dailyStopTime),
        explanation: `Les ROE écrivent noir sur blanc la fenêtre quotidienne et l’heure limite d’arrêt. La borne de fin est ${tp1.dailyStopTime}. Ce point compte autant que le périmètre car une bonne cible hors fenêtre reste une mauvaise action.`,
      },
      {
        prompt: "Selon « les règles d’engagement », quel est le contact d’urgence technique ? Écris le nom complet puis la fonction.",
        hint: "Cherche la section des contacts et ne confonds pas le technique avec le juridique.",
        answerFormat: "Nom complet puis fonction",
        accepted: compact([tp1.emergencyContact, "ibrahim sanou directeur informatique du client"]),
        explanation: `La section des contacts se lit avant toute action car elle sert en cas d’arrêt ou d’incident. Le contact technique d’urgence est ${tp1.emergencyContact}. Citer à la fois le nom et la fonction évite toute confusion avec le contact juridique ou la cheffe de mission.`,
      },
      {
        prompt: `Quel identifiant d’action de « ${tp1.assetNames.actions} » demande une clarification juridique explicite par Rokia Bamba avant exécution ?`,
        hint: "Cherche la ligne dont la colonne de validation requise cite Rokia Bamba, puis relève seulement l’identifiant.",
        answerFormat: "Un identifiant comme A08",
        accepted: compact([tp1.legalClarificationActionId]),
        explanation: `La clarification juridique ne se devine pas ; elle est écrite dans la colonne de validation requise et reliée au rôle de Rokia Bamba dans les documents. L’identifiant attendu est ${tp1.legalClarificationActionId}. Cette lecture évite de confondre un blocage juridique avec un simple manque de compte.`,
      },
      {
        prompt: `Combien d’actions de famille « passive » sont autorisées telles quelles dans « ${tp1.assetNames.actions} » ?`,
        hint: "Garde seulement la famille passive puis élimine les cibles hors périmètre, les cibles à clarifier et les horaires interdits.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp1.passiveAllowedCount]),
        explanation: `Toutes les actions passives ne passent pas automatiquement : la cible et l’horaire comptent encore. En gardant seulement les passives qui visent une cible nette et respectent les ROE, on trouve ${tp1.passiveAllowedCount} action(s) autorisée(s) telle(s) quelle(s). Cette nuance rappelle qu’une passivité apparente ne remplace pas le cadrage.`,
      },
      {
        prompt: "Selon « les règles d’engagement », quel bloc public est autorisé pour les scans légers ?",
        hint: "Lis la plage réseau écrite pour les scans légers et ne prends pas les blocs voisins ou tiers.",
        answerFormat: "Un bloc CIDR exact",
        accepted: compact([tp1.lightScanBlock]),
        explanation: `Le bloc autorisé pour les scans légers est écrit tel quel dans les ROE. Ici, il s’agit de ${tp1.lightScanBlock}. Relever le CIDR exact est essentiel car un bloc voisin ou un bloc tiers peut sembler proche sans être testable.`,
      },
      {
        prompt: `Quel identifiant de « ${tp1.assetNames.cibles} » est hors périmètre uniquement parce que son nom est correct mais que l’adresse observée sort des blocs autorisés ?`,
        hint: "Cherche un nom exact de la liste autorisée puis vérifie si son IP observée tombe dans un bloc voisin.",
        answerFormat: "Un identifiant comme T14",
        accepted: compact([tp1.networkOnlyOutTargetId]),
        explanation: `Le piège ici est volontaire : le nom semble bon, mais l’adresse observée ne tombe pas dans les blocs retenus par la mission. L’identifiant attendu est ${tp1.networkOnlyOutTargetId}. Cela montre qu’un FQDN conforme n’efface jamais une incohérence réseau.`,
      },
      {
        prompt: `Quel identifiant d’action de « ${tp1.assetNames.actions} » correspond à une campagne d’ingénierie sociale interdite même si la cible visée est bien dans le périmètre ?`,
        hint: "Cherche la famille d’action interdite par la clause « jamais autorisée », pas une cible hors mission.",
        answerFormat: "Un identifiant comme A08",
        accepted: compact([tp1.neverActionId]),
        explanation: `Les ROE interdisent certaines familles même contre une bonne cible. Ici, l’action visée reste interdite parce qu’elle relève de l’ingénierie sociale, pas parce que la cible serait mauvaise. L’identifiant correct est ${tp1.neverActionId}. Cette distinction est fondamentale pour lire un périmètre sans extrapolation.`,
      },
      {
        prompt: "Combien de cibles déjà en périmètre exigent un compte de test avant toute action authentifiée alors qu’aucun compte n’est livré pour elles dans les documents ?",
        hint: "Repère d’abord les cibles en périmètre dont le type impose une authentification, puis compare avec la liste des comptes effectivement fournis.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp1.noAccountInScopeCount]),
        explanation: `Il faut croiser trois infos : statut en périmètre, type qui exige un compte, puis liste des comptes fournis au départ. Ce calcul donne ${tp1.noAccountInScopeCount} cible(s) encore bloquée(s) faute de compte livré. La bonne lecture distingue donc très bien le périmètre de l’autorisation immédiate d’agir.`,
      },
      {
        prompt: "Pour « paie.sahel-vert.example » sans compte de test livré, quelle décision est correcte ? Réponds par une lettre. a) la cible est hors périmètre b) la cible est en périmètre mais l’action authentifiée reste bloquée tant qu’aucun compte n’est livré c) une force brute discrète devient acceptable d) un scan fort est autorisé si la fenêtre est ouverte",
        hint: "Sépare bien le statut de la cible et l’autorisation de l’action ; ce ne sont pas les mêmes colonnes.",
        answerFormat: "Une seule lettre",
        accepted: compact([tp1.paieDecisionLetter]),
        explanation: "La cible paie fait bien partie du mandat, mais les ROE exigent un compte de test livré avant toute action authentifiée. La bonne décision est donc la lettre b : en périmètre, oui ; autorisation immédiate d’agir, non. C’est un cas classique où le cadrage et l’exécution ne se confondent pas.",
      },
      {
        prompt: `Quel identifiant d’action de « ${tp1.assetNames.actions} » dépasse la charge maximale autorisée parce que son intensité vaut « forte » alors que les règles plafonnent à « moyenne » ?`,
        hint: "Lis d’abord le plafond d’intensité dans les ROE puis cherche la seule ligne du CSV qui le dépasse.",
        answerFormat: "Un identifiant comme A08",
        accepted: compact([tp1.maxLoadActionId]),
        explanation: `La comparaison à faire est simple mais stricte : le plafond écrit vaut « moyenne » et toute action marquée « forte » doit être exclue. Dans le CSV, cette règle désigne ${tp1.maxLoadActionId}. L’exercice apprend à lire la charge comme une règle dure et non comme un conseil vague.`,
      },
    ],
    assets: [
      asset("guide", "La lettre de mission", "Document formel du client et du cabinet : objectifs, cibles confiées, exclusions, comptes de test et contacts.", tp1.assetNames.lettre),
      asset("guide", "Les règles d’engagement", "Document formel : fenêtre, charge maximale, actions jamais autorisées, comptes requis et conditions d’arrêt.", tp1.assetNames.regles),
      asset("log", "Cibles découvertes", "CSV des noms, adresses, justifications et doutes déjà relevés avant la mission.", tp1.assetNames.cibles),
      asset("log", "Actions proposées", "CSV des actions envisagées avec cible, famille, validation requise, intensité et horaire proposé.", tp1.assetNames.actions),
      asset("guide", "Guide du TP 1", "Méthode générique pour classer une cible ou une action sans lire la réponse dans le scénario.", tp1.assetNames.guide),
    ],
  }];
}
