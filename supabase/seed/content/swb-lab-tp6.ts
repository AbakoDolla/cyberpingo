import type { PathLab } from "./reseaux-path";

export type WebLabTp6 = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsTp6 {
  swbTp6: {
    assetNames: { configFile: string; rootFile: string; depsFile: string; advisoryFile: string; guideFile: string };
    defectCount: number;
    autoindexLine: number;
    legacyTlsLine: number;
    affectedPackageCount: number;
    highestAffectedAdvisory: string;
    scoreForAdv006: number;
    levelLetterForAdv009: string;
    criticalAffectedCount: number;
    majorUpgradePackage: string;
    minimalSafeVersion: string;
    fixedAlreadyCount: number;
    rootCriticalLetter: string;
    neverPublicCount: number;
    patchOrderLetter: string;
    envReactionLetter: string;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const scoreAnswers = (value: number) => compact([value.toFixed(1), value.toFixed(1).replace(".", ",")]);
const asset = (kind: WebLabTp6["assets"][number]["kind"], title: string, description: string, name: string) => ({ kind, title, description, url: `/labs/${name}` });

export function buildSwbLabTp6(facts: FactsTp6): WebLabTp6[] {
  const tp6 = facts.swbTp6;

  return [
    {
      slug: "tp-web-config-cvss",
      title: "TP 6 : configuration, dépendances et notation CVSS",
      description: "Tu audites la configuration nginx, tu repères ce qui est publiquement exposé à la racine du site, tu compares les versions de dépendances et tu classes les avis avec CVSS 3.1 avant l’audit final.",
      difficulty: "intermediaire",
      xp: 150,
      format: "logs",
      minutes: 55,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      briefing: "Nous sommes le lundi 11 mai 2026. Kader Sow veut un dernier contrôle rapide avant l’audit final de l’application de réservation de l’Hôtel Palmier d’Or. Il te remet la configuration nginx actuelle, la liste de ce qui répond encore à la racine du site, la liste des dépendances Node.js installées et un export d’avis de sécurité fictifs. Ton rôle est de compter les défauts visibles, de voir ce qui ne devrait jamais être public, puis d’identifier les composants vulnérables. Tu termines en calculant et en classant les gravités avec CVSS 3.1, sans toucher un système réel.",
      constraints: [
        "Tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
        "Les horodatages et les versions de ce TP sont figés au 11 mai 2026.",
        "Les réponses sur CVSS 3.1 se calculent avec la formule donnée dans le guide, sans outil externe.",
      ],
      tools: [
        "Visionneuse du site",
        "Git Bash, WSL ou Termux pour grep, sort -V et awk",
        "PowerShell 5.1 pour Select-String, Import-Csv et les comparaisons de versions",
        "Papier, crayon ou tableur pour poser un calcul CVSS",
      ],
      objectives: [
        "Relire une configuration nginx comme une liste de contrôles simples",
        "Distinguer un fichier public normal d’un artefact qui ne doit jamais être exposé",
        "Comparer une version installée à une plage SemVer touchée puis à une version corrigée",
        "Calculer une note CVSS 3.1 et en déduire la qualification utile à la priorisation",
      ],
      hints: [
        "Compte les défauts en suivant la liste de contrôle du guide, sans inventer d’autres critères.",
        "Dans la racine du site, le statut HTTP compte autant que le nom du fichier.",
        "Pour les dépendances, commence par relier chaque avis au paquet installé avant de trier quoi que ce soit.",
        "Pour CVSS 3.1, remplace d’abord chaque métrique par sa valeur numérique, puis arrondis au dixième supérieur.",
      ],
      tasks: [
        {
          prompt: `Dans « ${tp6.assetNames.configFile} », combien de règles de la liste de contrôle du guide la configuration viole-t-elle ? Compte une règle une seule fois, même si plusieurs lignes la concernent, et ignore la règle sur les fichiers servis, qui ne concerne pas ce fichier.`,
          hint: "Passe la liste de contrôle du guide règle par règle, et cherche pour chacune la ligne qui la viole ou l’en-tête qui manque.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp6.defectCount]),
          explanation: `En relisant la configuration avec la liste de contrôle du guide, on retrouve ${tp6.defectCount} règles violées. La méthode consiste à valider chaque règle une par une, pas à juger la configuration à l’intuition : le versionnage du serveur, le listage de répertoires, les protocoles TLS anciens et le cache public comptent chacun une fois, et chacun des trois en-têtes manquants compte aussi une fois.`,
        },
        {
          prompt: `Dans « ${tp6.assetNames.configFile} », quel est le numéro de ligne de la directive qui active le listage de répertoires ?`,
          hint: "Cherche la directive exacte qui ouvre un index de dossier au lieu de renvoyer une erreur ou un fichier précis.",
          answerFormat: "Un numéro de ligne entier",
          accepted: compact([tp6.autoindexLine]),
          explanation: `Le listage de répertoires est porté par une seule directive dédiée. En repérant cette ligne dans le bloc concerné, on obtient ${tp6.autoindexLine}. Relever le bon numéro de ligne facilite ensuite un correctif ciblé et une preuve claire dans un rapport.`,
        },
        {
          prompt: `Dans « ${tp6.assetNames.configFile} », quel est le numéro de ligne de la directive qui autorise encore TLS 1.0 et TLS 1.1 ?`,
          hint: "Les anciennes versions de protocole sont déclarées sur la même ligne que les versions modernes.",
          answerFormat: "Un numéro de ligne entier",
          accepted: compact([tp6.legacyTlsLine]),
          explanation: `La directive qui choisit les protocoles TLS fait apparaître les versions autorisées sur une seule ligne. Cette ligne est la ${tp6.legacyTlsLine}. La trouver permet d’isoler rapidement le réglage à durcir sans confondre protocole, chiffrements et durée de session.`,
        },
        {
          prompt: `En comparant « ${tp6.assetNames.depsFile} » et « ${tp6.assetNames.advisoryFile} », combien de paquets installés sont réellement touchés par au moins un avis ?`,
          hint: "Compte les paquets distincts touchés, pas le nombre total d’avis ni le nombre de versions corrigées.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp6.affectedPackageCount]),
          explanation: `Il faut d’abord associer chaque avis au paquet installé, puis vérifier si la version locale tombe bien dans la plage touchée. En raisonnant par paquets distincts, on obtient ${tp6.affectedPackageCount}. Cette distinction évite de compter deux fois un même paquet touché par plusieurs avis.`,
        },
        {
          prompt: `Dans « ${tp6.assetNames.advisoryFile} », quel est l’identifiant de l’avis qui touche l’application et dont la note de base CVSS 3.1 est la plus élevée, sans ex æquo ?`,
          hint: "Écarte d’abord les avis qui ne touchent pas la version installée, puis calcule ou relis la note de chaque avis restant.",
          answerFormat: "Un identifiant d’avis en minuscules",
          accepted: compact([tp6.highestAffectedAdvisory]),
          explanation: `Après avoir retiré les avis non applicables et calculé les notes de base des avis restants, un seul arrive en tête : ${tp6.highestAffectedAdvisory}. La bonne méthode est de filtrer avant de classer, sinon un avis déjà corrigé pourrait polluer la priorisation.`,
        },
        {
          prompt: `Calcule la note de base CVSS 3.1 de l’avis « swb-adv-2026-006 » à partir du vecteur présent dans « ${tp6.assetNames.advisoryFile} ».`,
          hint: "Remplace chaque métrique par sa valeur, calcule Impact et Exploitabilité, puis applique l’arrondi supérieur au dixième.",
          answerFormat: "Une note CVSS 3.1 avec une décimale, avec virgule ou point",
          accepted: scoreAnswers(tp6.scoreForAdv006),
          explanation: `Le vecteur de cet avis conduit à une note de base de ${tp6.scoreForAdv006.toFixed(1)}. Il faut suivre la formule officielle de CVSS 3.1 du guide, puis appliquer l’arrondi supérieur au dixième, sans arrondir au plus proche comme dans un calcul ordinaire.`,
        },
        {
          prompt: `Quelle qualification correspond à la note de base CVSS 3.1 de l’avis « swb-adv-2026-009 », calculée d’après son vecteur dans « ${tp6.assetNames.advisoryFile} » ? Réponds par une lettre. a) faible b) moyenne c) élevée d) critique`,
          hint: "Calcule la note à partir du vecteur de l’avis, sans te soucier de la version installée, puis place-la dans la bonne tranche de qualification du guide.",
          answerFormat: "Une seule lettre",
          accepted: compact([tp6.levelLetterForAdv009]),
          explanation: "La note de cet avis tombe dans la tranche 4,0 à 6,9. La qualification attendue est donc « moyenne », soit la lettre b. Relier une note à sa tranche est indispensable pour présenter une synthèse exploitable à une personne non technique.",
        },
        {
          prompt: `Combien d’avis critiques qui touchent réellement l’application vois-tu dans « ${tp6.assetNames.advisoryFile} » ?`,
          hint: "Un avis critique a une note comprise entre 9,0 et 10,0, mais il doit aussi toucher une version installée.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp6.criticalAffectedCount]),
          explanation: `On ne compte ici que les avis à la fois critiques et applicables aux versions présentes. Il y en a ${tp6.criticalAffectedCount}. Cette double condition évite de surestimer le risque en mélangeant gravité théorique et exposition réelle du parc installé.`,
        },
        {
          prompt: `Quel paquet installé impose un changement de version majeure pour atteindre la première version corrigée, d’après « ${tp6.assetNames.depsFile} » et « ${tp6.assetNames.advisoryFile} » ?`,
          hint: "Compare le premier nombre de la version installée à celui de la version corrigée pour chaque paquet touché.",
          answerFormat: "Un nom de paquet en minuscules",
          accepted: compact([tp6.majorUpgradePackage]),
          explanation: `Le seul paquet qui doit franchir un changement de version majeure pour atteindre sa première version corrigée est ${tp6.majorUpgradePackage}. Cette lecture sert à anticiper un correctif potentiellement plus risqué qu’un simple patch de maintenance.`,
        },
        {
          prompt: `Pour le paquet « resafetch », quelle est la version minimale sûre à installer si tu veux couvrir tous les avis qui le touchent dans « ${tp6.assetNames.advisoryFile} » ?`,
          hint: "Quand un même paquet a plusieurs avis, garde la version corrigée la plus haute qui couvre tous les cas.",
          answerFormat: "Une version SemVer au format x.y.z",
          accepted: compact([tp6.minimalSafeVersion]),
          explanation: `Comme plusieurs avis touchent le même paquet, il faut choisir la plus petite version qui dépasse toutes les bornes corrigées. Ici, la version minimale sûre est ${tp6.minimalSafeVersion}. Cette comparaison évite d’appliquer une mise à jour incomplète.`,
        },
        {
          prompt: `Combien d’avis de « ${tp6.assetNames.advisoryFile} » ne touchent pas l’application parce que la version installée est déjà corrigée dans « ${tp6.assetNames.depsFile} » ?`,
          hint: "Ne confonds pas « paquet absent » et « paquet présent mais déjà au-delà de la version corrigée ».",
          answerFormat: "Un nombre entier",
          accepted: compact([tp6.fixedAlreadyCount]),
          explanation: `Certains avis concernent bien des paquets installés, mais la version locale est déjà au niveau corrigé ou au-delà. Il y en a ${tp6.fixedAlreadyCount}. Savoir les retirer du lot t’évite de gonfler artificiellement la dette de correction.`,
        },
        {
          prompt: `Quel fichier de « ${tp6.assetNames.rootFile} » est le plus critique à exposer publiquement ? Réponds par une lettre. a) /robots.txt b) /assets/app.js c) /.env d) /security.txt`,
          hint: "Cherche le fichier qui risque de livrer directement des secrets ou des paramètres sensibles, pas seulement un détail de fonctionnement.",
          answerFormat: "Une seule lettre",
          accepted: compact([tp6.rootCriticalLetter]),
          explanation: "Le choix le plus critique est le fichier d’environnement, car il peut révéler des secrets applicatifs et accélérer une compromission. La bonne lettre est donc c. Dans un audit, on priorise ce qui ouvre directement la voie à d’autres actions.",
        },
        {
          prompt: `Dans « ${tp6.assetNames.rootFile} », combien d’entrées répondent encore en 200 alors qu’elles appartiennent à la liste du guide des artefacts qui ne devraient jamais être publics ?`,
          hint: "Applique uniquement la liste du guide, puis filtre les lignes qui répondent encore avec un statut 200.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp6.neverPublicCount]),
          explanation: `La liste du guide vise les fichiers d’environnement, Git, les archives et les pages de diagnostic. En gardant seulement ceux qui répondent encore en 200, on en compte ${tp6.neverPublicCount}. Cette étape permet de distinguer exposition réelle et simple présence d’un nom dans une arborescence.`,
        },
        {
          prompt: `Quel ordre de correction est le plus défendable d’après les informations des fichiers ? Réponds par une lettre. a) trier les paquets par ordre alphabétique b) corriger d’abord les avis déjà sans impact local c) traiter d’abord les avis exploités et exposés sur Internet, puis le reste par gravité d) corriger seulement les avis notés exactement 10,0`,
          hint: "Tiens compte à la fois de l’applicabilité, de l’exposition et de l’exploitation connue, pas d’un seul chiffre isolé.",
          answerFormat: "Une seule lettre",
          accepted: compact([tp6.patchOrderLetter]),
          explanation: "Le choix le plus solide consiste à traiter d’abord ce qui est applicable, exposé sur Internet et déjà exploité, puis à poursuivre par gravité. La bonne lettre est c. Une priorisation utile combine toujours contexte d’exposition et sévérité technique.",
        },
        {
          prompt: `Que faut-il faire du fichier « /.env » encore accessible selon « ${tp6.assetNames.rootFile} » ? Réponds par une lettre. a) le laisser public mais retirer le lien du menu b) le renommer en « .env.old » c) le compresser dans une nouvelle archive d) retirer l’accès, faire tourner les secrets et vérifier les journaux`,
          hint: "Un fichier sensible déjà exposé se traite comme une fuite potentielle, pas comme un simple problème d’ergonomie.",
          answerFormat: "Une seule lettre",
          accepted: compact([tp6.envReactionLetter]),
          explanation: "Un fichier d’environnement accessible doit être traité comme compromis jusqu’à preuve du contraire. La bonne réponse est d : retirer l’accès, faire tourner les secrets et vérifier les journaux. Retirer seulement le lien ou le renommer ne supprime ni l’exposition passée ni le risque résiduel.",
        },
      ],
      assets: [
        asset("log", "Configuration nginx", "Configuration du serveur frontal HTTPS de l’application de réservation.", tp6.assetNames.configFile),
        asset("log", "Racine du site exposée", "Liste des chemins visibles à la racine du site avec leur statut HTTP et leur taille.", tp6.assetNames.rootFile),
        asset("log", "Dépendances Node.js", "Inventaire des paquets installés et de leurs versions exactes.", tp6.assetNames.depsFile),
        asset("log", "Avis de sécurité", "Export d’avis fictifs avec plage touchée, version corrigée et vecteur CVSS 3.1.", tp6.assetNames.advisoryFile),
        asset("guide", "Guide du TP 6", "Méthode de lecture de la configuration, de comparaison des versions et de calcul CVSS 3.1.", tp6.assetNames.guideFile),
      ],
    },
  ];
}
