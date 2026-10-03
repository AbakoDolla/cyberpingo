import type { PathLab } from "./reseaux-path";

export type SecurityLab = PathLab & {
  category?: "securite" | "cryptographie" | "osint" | "web" | "linux" | "reseau";
};

export interface FactsB {
  hygiene: {
    auditDate: string;
    assetNames: { inventoryFile: string; supportFile: string; backupFile: string; copiesFile: string; guideFile: string };
    unsupportedCount: number;
    maxUpdateLagDays: number;
    unencryptedPortableCount: number;
    staleAntivirusCount: number;
    longestBackupGapDays: number;
    threeTwoOneRespected: boolean;
    threeTwoOneMissingLetter: string;
    restoreTestDate: string;
    restoreDelayDays: number;
    riskiestPost: string;
    compliancePercent: number;
    multiAdminCount: number;
  };
  risks: {
    assetNames: { assetsFile: string; scenariosFile: string; incidentsFile: string; accessFile: string; guideFile: string };
    incidentClasses: Record<string, string>;
    targetScenarioScore: number;
    highestScenarioId: string;
    criticalScenarioCount: number;
    residualScenarioId: string;
    residualLikelihood: number;
    residualScore: number;
    topAssetId: string;
    personalDataAssetCount: number;
    treatmentScenarioId: string;
    treatmentAnswer: string;
    leastPrivilegeAccount: string;
  };
  incident: {
    assetNames: { loginsFile: string; geoFile: string; auditFile: string; phishingFile: string; timelineFile: string; guideFile: string };
    firstAttackerSuccessTime: string;
    attackerIp: string;
    attackerCountry: string;
    attackerFailuresBeforeSuccess: number;
    mfaEnabled: boolean;
    forwardingAddress: string;
    deletedMessages: number;
    attachmentDownloads: number;
    passwordResetTime: string;
    exposureHours: number;
    exposureMinutes: number;
    notificationDeadline: string;
    notificationNeeded: boolean;
    containmentLetter: string;
    attackerSuccessIpCount: number;
    evidenceFileName: string;
  };
  project: {
    auditDate: string;
    assetNames: {
      notesFile: string;
      gridFile: string;
      risksFile: string;
      reportFile: string;
      guideFile: string;
      postsFile: string;
      supportFile: string;
      integrityFile: string;
      accessFile: string;
      backupFile: string;
      privacyFile: string;
      awarenessFile: string;
    };
    domainScoreTarget: string;
    domainScorePercent: number;
    globalScorePercent: number;
    weakestDomain: string;
    nonCompliantCount: number;
    topPriorityAction: string;
    quickWinCount: number;
    lastBackupDate: string;
    lastBackupAgeDays: number;
    mfaCoveragePercent: number;
    unsupportedPostCount: number;
    certificateExpiryDate: string;
    certificateDaysRemaining: number;
    backupIntegrityAlgorithm: string;
    backupIntegrityAcceptable: boolean;
    processingRegisterExists: boolean;
    notificationDelayHours: number;
    priorityAwarenessCount: number;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase())));
const yesNo = (value: boolean) => (value ? compact(["oui", "yes"]) : compact(["non", "no"]));
const dateAnswers = (iso: string) => compact([iso, iso.split("-").reverse().join("/"), iso.split("-").reverse().join("-")]);
const timeAnswers = (hhmm: string) => compact([hhmm, hhmm.replace(/^0/, "")]);
const percentAnswers = (value: number) => compact([value, `${value}%`, `${value} %`]);
const weakestDomainLetter = (value: string) => ({
  "authentification": "a",
  "postes": "b",
  "sauvegardes": "c",
  "réseau et wi-fi": "d",
  "données personnelles": "e",
  "gestion des incidents": "f",
}[value] ?? "");

const asset = (kind: SecurityLab["assets"][number]["kind"], title: string, description: string, name: string) => ({
  kind,
  title,
  description,
  url: `/labs/${name}`,
});

export function buildLabsB(facts: FactsB): SecurityLab[] {
  const hygiene = facts.hygiene;
  const risks = facts.risks;
  const incident = facts.incident;
  const project = facts.project;
  const deadline = incident.notificationDeadline;
  const deadlineShort = `${deadline.slice(0, 10)} ${deadline.slice(11, 16)}`;
  const exposureCompact = `${incident.exposureHours}h${String(incident.exposureMinutes).padStart(2, "0")}`;
  const exposureSpaced = `${incident.exposureHours} h ${incident.exposureMinutes}`;

  return [
    {
      slug: "tp-hygiene-postes",
      title: "TP 3 : auditer l’hygiène d’un parc de postes",
      description: "Lis un inventaire de parc, repère les retards de maintenance et transforme des constats bruts en priorités d’action claires pour la directrice.",
      difficulty: "debutant",
      xp: 140,
      format: "logs",
      minutes: 45,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      briefing: "Le jeudi 12 mars 2026, Jean-Marc Tchoumi t’apporte l’inventaire exporté des 12 postes du Centre Numérique Soleil, le tableau des fins de support, le journal des sauvegardes nocturnes et la note sur les copies 3-2-1. La directrice veut une lecture simple : quels retards sont réellement dangereux, quel poste cumule le plus de points faibles, et où faut-il corriger en premier.",
      constraints: [
        "Tu travailles uniquement sur les exports fournis, dans un cadre pédagogique entièrement fictif.",
        "Ne lances aucune commande sur un vrai poste et ne modifies aucune vraie configuration de sauvegarde ou de chiffrement.",
      ],
      tools: [
        "Visionneuse de journaux CyberPingo",
        "Un terminal pour faire des écarts de dates si tu veux les recalculer",
        "Le guide du labo, qui donne la grille de score et la formule de conformité",
      ],
      objectives: [
        "Comparer un inventaire à une table de fin de support",
        "Mesurer des retards de mises à jour, d’antivirus et de sauvegarde en jours",
        "Appliquer une grille de risque simple pour désigner le poste le plus exposé",
        "Vérifier la règle 3-2-1 et calculer un taux de conformité global",
      ],
      hints: [
        "Commence par relever toutes les dates du même type dans le même fichier.",
        "Le guide distingue bien le journal des sauvegardes et le test de restauration.",
        "Pour la conformité, chaque poste compte pour six contrôles exactement.",
      ],
      tasks: [
        {
          prompt: "Combien de postes utilisent encore un système déjà hors support au jeudi 12 mars 2026 ?",
          hint: "Compare chaque système du parc avec sa date de fin de support officielle.",
          answerFormat: "Un nombre entier",
          accepted: compact([hygiene.unsupportedCount]),
          explanation: `Un système compte comme hors support si sa date de fin de support est antérieure au 12 mars 2026. En recoupant les 12 lignes de l’inventaire avec le tableau des versions, on en trouve ${hygiene.unsupportedCount}.`,
        },
        {
          prompt: "Quel est le retard maximal de mise à jour observé dans le parc, en jours ?",
          hint: "Cherche la date de mise à jour la plus ancienne puis calcule l’écart.",
          answerFormat: "Un nombre entier de jours",
          accepted: compact([hygiene.maxUpdateLagDays]),
          explanation: `Le retard maximal correspond à la plus vieille date de dernière mise à jour visible dans l’inventaire. Une fois comparée à la date d’audit, elle donne ${hygiene.maxUpdateLagDays} jours de retard.`,
        },
        {
          prompt: "Combien de portables ne sont pas chiffrés au moment de l’audit ?",
          hint: "Ne compte que les lignes dont le type est portable et dont le chiffrement est absent.",
          answerFormat: "Un nombre entier",
          accepted: compact([hygiene.unencryptedPortableCount]),
          explanation: `Le critère demandé ne porte que sur les portables. En filtrant ces lignes puis en regardant l’état du disque, on obtient ${hygiene.unencryptedPortableCount} portables sans chiffrement.`,
        },
        {
          prompt: "Combien de postes ont des signatures antivirus âgées de plus de 7 jours ?",
          hint: "Calcule l’écart entre le 12 mars 2026 et la date des signatures.",
          answerFormat: "Un nombre entier",
          accepted: compact([hygiene.staleAntivirusCount]),
          explanation: `Le guide fixe un seuil simple : au-delà de 7 jours, le retard devient non conforme. En recalculant cet écart poste par poste, on arrive à ${hygiene.staleAntivirusCount} postes trop anciens.`,
        },
        {
          prompt: "Quelle est la plus longue série de jours consécutifs sans sauvegarde nocturne réussie ?",
          hint: "Lis le journal par date et repère la plus grande suite de lignes sans statut OK.",
          answerFormat: "Un nombre entier de jours",
          accepted: compact([hygiene.longestBackupGapDays]),
          explanation: `Le journal contient des jours réussis, des échecs et un test de restauration séparé. En ne comptant que les nuits sans succès et en gardant la série la plus longue, on trouve ${hygiene.longestBackupGapDays} jours.`,
        },
        {
          prompt: "La règle 3-2-1 est-elle entièrement respectée d’après le tableau des copies fourni ?",
          hint: "Compte les copies, vérifie les supports différents puis cherche si un lieu est réellement hors site.",
          answerFormat: "Réponse binaire : oui ou non",
          accepted: yesNo(hygiene.threeTwoOneRespected),
          explanation: "La note confirme qu’il existe bien trois copies et deux supports différents, mais aucune copie hors site. Comme une seule condition manque, la règle 3-2-1 n’est pas entièrement respectée.",
        },
        {
          prompt: "Quelle condition manque pour respecter la règle 3-2-1 ? Réponds par une lettre. a) avoir trois copies b) avoir deux supports différents c) avoir une copie hors site",
          hint: "Le tableau des copies donne les supports et les lieux, à toi d’évaluer laquelle des trois conditions n’est pas remplie.",
          answerFormat: "Une seule lettre",
          accepted: compact([hygiene.threeTwoOneMissingLetter]),
          explanation: "La condition manquante est la copie hors site. Le document la repère par une lettre unique dans la liste des trois critères, ce qui permet de répondre sans ambiguïté.",
        },
        {
          prompt: "À quelle date le dernier test de restauration réussi a-t-il eu lieu ?",
          hint: "Cherche la ligne RESTORE_OK du journal et relève sa date.",
          answerFormat: "Date au format AAAA-MM-JJ",
          accepted: dateAnswers(hygiene.restoreTestDate),
          explanation: `Le test de restauration réussi n’est mentionné qu’une fois dans le journal. Cette ligne porte la date ${hygiene.restoreTestDate}, preuve que l’équipe a vérifié au moins une lecture d’archive.`,
        },
        {
          prompt: "Combien de jours se sont écoulés entre ce test de restauration et la date d’audit ?",
          hint: "Utilise la date du test puis compare-la au jeudi 12 mars 2026.",
          answerFormat: "Un nombre entier de jours",
          accepted: compact([hygiene.restoreDelayDays]),
          explanation: `Le test date du ${hygiene.restoreTestDate}. Entre cette date et le 12 mars 2026, il s’est écoulé ${hygiene.restoreDelayDays} jours, ce qui mesure la fraîcheur du dernier essai réel.`,
        },
        {
          prompt: "Quel poste obtient le score de pénalité le plus élevé avec la grille du guide ?",
          hint: "Additionne les pénalités pour chaque poste puis garde le total le plus grand.",
          answerFormat: "Nom exact du poste",
          accepted: compact([hygiene.riskiestPost]),
          explanation: `La grille du guide additionne six types de pénalités. Après calcul sur chaque ligne de l’inventaire, ${hygiene.riskiestPost} cumule le total le plus élevé et devient la priorité de correction.`,
        },
        {
          prompt: "Quel est le pourcentage de conformité global du parc avec la formule du guide ?",
          hint: "Compte les contrôles conformes sur l’ensemble des 72 contrôles attendus.",
          answerFormat: "Pourcentage entier",
          accepted: percentAnswers(hygiene.compliancePercent),
          explanation: `Le guide fixe 6 contrôles par poste, donc 72 contrôles pour 12 machines. En comptant seulement ceux qui passent puis en arrondissant, on obtient ${hygiene.compliancePercent} % de conformité globale.`,
        },
        {
          prompt: "Combien de postes ont plus d’un administrateur local ?",
          hint: "Relève les lignes dont le nombre d’administrateurs dépasse un seul compte.",
          answerFormat: "Un nombre entier",
          accepted: compact([hygiene.multiAdminCount]),
          explanation: `Le principe de moindre privilège recommande de limiter les droits d’administration. En relisant la colonne des administrateurs locaux, ${hygiene.multiAdminCount} postes dépassent ce seuil.`,
        },
      ],
      assets: [
        asset("log", "Inventaire du parc (fond-tp3-inventaire-postes.tsv)", "Les 12 postes, leur système, leurs dates et leurs protections locales.", hygiene.assetNames.inventoryFile),
        asset("log", "Fins de support (fond-tp3-support-systemes.tsv)", "Le tableau des versions présentes et de leur date de fin de support.", hygiene.assetNames.supportFile),
        asset("log", "Journal des sauvegardes (fond-tp3-sauvegarde-30j.log)", "Trente jours d’activité de sauvegarde, avec un test de restauration.", hygiene.assetNames.backupFile),
        asset("log", "Tableau des copies 3-2-1 (fond-tp3-copies-321.txt)", "Les copies observées, leur support et leur lieu de stockage.", hygiene.assetNames.copiesFile),
        asset("guide", "Guide du TP 3", "Méthode, grille de score, formule de conformité et commandes de vérification.", hygiene.assetNames.guideFile),
      ],
    },
    {
      slug: "tp-registre-risques",
      title: "TP 5 : construire un registre de risques",
      description: "Transforme un atelier de risques en réponses exploitables : classification C I D, calcul des scores, choix de traitement et moindre privilège.",
      difficulty: "debutant",
      xp: 150,
      format: "logs",
      minutes: 45,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      briefing: "Le mercredi 18 mars 2026, Mariam Sow réunit l’équipe du Centre Numérique Soleil pour un atelier de risques. Tu disposes de l’inventaire des actifs, d’une liste de scénarios cotés, de six incidents passés résumés en une phrase et d’une table de droits sur le dossier de comptabilité. Ton rôle est de transformer ces éléments en registre lisible et cohérent.",
      constraints: [
        "Tu raisonnes sur des actifs fictifs et des cotations déjà posées pendant l’atelier.",
        "Ne fais aucune hypothèse supplémentaire sur les droits ou sur la gravité : tout doit venir des fichiers fournis.",
      ],
      tools: [
        "Visionneuse de journaux CyberPingo",
        "Une calculatrice ou Node.js pour multiplier vraisemblance et impact",
        "Le guide du labo, qui rappelle les niveaux et les traitements",
      ],
      objectives: [
        "Classer un incident selon la propriété principalement touchée",
        "Calculer et comparer des scores de risques",
        "Repérer l’actif qui concentre le plus de risque",
        "Appliquer le moindre privilège sur une table d’accès simple",
      ],
      hints: [
        "Pour les incidents passés, ne retiens qu’une propriété principale par phrase.",
        "Le scénario le plus élevé ne dépend pas du ressenti mais du produit vraisemblance fois impact.",
        "Additionne les scores par actif pour voir où se concentre le risque cumulé.",
      ],
      tasks: [
        {
          prompt: "Pour INC-01, quelle propriété principale est touchée en premier ?",
          hint: "Applique la règle du guide : cherche d’abord ce qui est atteint directement avant les effets secondaires.",
          answerFormat: "Une lettre : c, i ou d",
          accepted: compact(["c"]),
          explanation: "Dans INC-01, quelqu’un lit une information qu’il ne devait pas consulter. La donnée n’est ni modifiée ni rendue indisponible : c’est donc d’abord une atteinte à la confidentialité.",
        },
        {
          prompt: "Pour INC-02, quelle propriété principale est touchée en premier ?",
          hint: "Applique la règle du guide : cherche d’abord ce qui est atteint directement avant les effets secondaires.",
          answerFormat: "Une lettre : c, i ou d",
          accepted: compact(["i"]),
          explanation: "La phrase décrit un contenu altéré, puisque des montants ont été remplacés sans validation. La propriété attaquée est donc l’intégrité des données comptables.",
        },
        {
          prompt: "Pour INC-03, quelle propriété principale est touchée en premier ?",
          hint: "Applique la règle du guide : cherche d’abord ce qui est atteint directement avant les effets secondaires.",
          answerFormat: "Une lettre : c, i ou d",
          accepted: compact(["d"]),
          explanation: "Quand la box redémarre, les personnes ne peuvent plus utiliser le service pendant un temps donné. Le dommage principal concerne donc la disponibilité.",
        },
        {
          prompt: "Quel score obtient le scénario SC-07 avec la formule du guide ?",
          hint: "Multiplie simplement la vraisemblance par l’impact indiqués dans la ligne.",
          answerFormat: "Un nombre entier",
          accepted: compact([risks.targetScenarioScore]),
          explanation: `Le guide demande un produit simple. Pour SC-07, la vraisemblance et l’impact mènent à un score de ${risks.targetScenarioScore}, sans autre pondération cachée.`,
        },
        {
          prompt: "Quel identifiant porte le scénario au score le plus élevé du registre ?",
          hint: "Calcule les scores puis cherche le maximum unique.",
          answerFormat: "Identifiant de scénario",
          accepted: compact([risks.highestScenarioId]),
          explanation: `Une fois tous les produits calculés, un seul scénario reste au-dessus des autres. Son identifiant est ${risks.highestScenarioId}, ce qui en fait la priorité brute du registre.`,
        },
        {
          prompt: "Combien de scénarios sont de niveau critique selon les seuils du guide ?",
          hint: "Le niveau critique couvre les scores de 12 à 16 inclus.",
          answerFormat: "Un nombre entier",
          accepted: compact([risks.criticalScenarioCount]),
          explanation: `Le guide borne clairement le niveau critique. En ne gardant que les scénarios dont le score tombe dans cette tranche, on en compte ${risks.criticalScenarioCount}.`,
        },
        {
          prompt: "Quel est le score résiduel de SC-10 si la nouvelle mesure fait passer la vraisemblance à 1 ?",
          hint: "L’impact ne change pas, seule la vraisemblance est remplacée.",
          answerFormat: "Un nombre entier",
          accepted: compact([risks.residualScore]),
          explanation: `Le score résiduel se recalcule avec la même formule, mais la nouvelle vraisemblance vaut 1. Le produit redescend alors à ${risks.residualScore}, ce qui montre l’effet attendu de la mesure.`,
        },
        {
          prompt: "Quel actif cumule la somme de scores la plus élevée quand on additionne ses scénarios ?",
          hint: "Additionne les scores par identifiant d’actif avant de comparer les totaux.",
          answerFormat: "Identifiant d’actif",
          accepted: compact([risks.topAssetId]),
          explanation: `Certains actifs portent plusieurs scénarios à la fois. Après addition des scores par actif, ${risks.topAssetId} ressort avec le total le plus élevé et concentre donc le plus de risque cumulé.`,
        },
        {
          prompt: "Combien d’actifs contiennent des données personnelles dans l’inventaire ?",
          hint: "Compte uniquement les lignes marquées oui dans la colonne dédiée.",
          answerFormat: "Un nombre entier",
          accepted: compact([risks.personalDataAssetCount]),
          explanation: `La colonne « données personnelles » permet de compter sans interprétation libre. En recensant uniquement les « oui », on obtient ${risks.personalDataAssetCount} actifs concernés.`,
        },
        {
          prompt: "Quel traitement convient à SC-11 en appliquant strictement la règle du guide ? Réponds par une lettre. a) réduire b) éviter c) transférer d) accepter",
          hint: "Commence par déterminer son niveau avant de choisir le traitement associé.",
          answerFormat: "Une seule lettre",
          accepted: compact(["d"]),
          explanation: `SC-11 se situe dans le niveau faible après calcul. Le guide associe ce niveau au traitement « ${risks.treatmentAnswer} », car le coût d’une action lourde dépasserait ici le bénéfice attendu.`,
        },
        {
          prompt: "Quel compte détient sur le dossier de comptabilité des droits d’écriture ou de suppression que son rôle n’exige pas ? Une seule personne est concernée.",
          hint: "Compare le rôle métier de chaque personne avec ses droits réels d’écriture et de suppression.",
          answerFormat: "Adresse de messagerie complète",
          accepted: compact([risks.leastPrivilegeAccount]),
          explanation: `Le principe du moindre privilège veut que chaque personne ne garde que les droits strictement nécessaires à son rôle. Ici, ${risks.leastPrivilegeAccount} possède des droits de modification qui ne correspondent pas à sa mission.`,
        },
      ],
      assets: [
        asset("log", "Inventaire des actifs (fond-tp5-actifs.tsv)", "Les actifs à protéger, leur type et leurs besoins C I D.", risks.assetNames.assetsFile),
        asset("log", "Scénarios de risques (fond-tp5-scenarios.tsv)", "Les menaces, vulnérabilités et cotations de l’atelier.", risks.assetNames.scenariosFile),
        asset("log", "Incidents passés (fond-tp5-incidents.txt)", "Six incidents résumés en une phrase chacun.", risks.assetNames.incidentsFile),
        asset("log", "Droits sur la comptabilité (fond-tp5-acces-compta.tsv)", "La table de lecture, d’écriture et de suppression sur le partage comptable.", risks.assetNames.accessFile),
        asset("guide", "Guide du TP 5", "Méthode de cotation, niveaux, traitements et rappel du moindre privilège.", risks.assetNames.guideFile),
      ],
    },
    {
      slug: "incident-compte-compromis",
      title: "Incident : un compte de messagerie compromis",
      description: "Reconstitue un incident de messagerie de bout en bout, mesure la fenêtre d’exposition et choisis les premières actions de confinement adaptées.",
      difficulty: "intermediaire",
      xp: 220,
      format: "logs",
      minutes: 60,
      requiresComputer: false,
      isAssessment: true,
      category: "securite",
      briefing: "Le mercredi 25 mars 2026 à 09:40 UTC, Yao Kouassi signale que des collègues reçoivent de lui des messages étranges. Mariam Sow te demande de reconstituer l’incident à partir du journal de connexions, de la table de géolocalisation, du journal d’audit de la boîte et du courriel d’hameçonnage signalé. Tu dois retrouver la chronologie, la cause racine, la durée d’exposition et les actions immédiates à prendre.",
      constraints: [
        "Tu analyses des traces figées dans un cadre purement pédagogique, sans te connecter à aucun vrai service.",
        "Toutes les heures du journal sont en UTC et doivent rester en UTC dans tes réponses.",
      ],
      tools: [
        "Visionneuse de journaux CyberPingo",
        "Un terminal pour filtrer et recalculer des écarts de temps",
        "Le guide de l’incident, qui rappelle la règle des 72 heures et le premier confinement attendu",
      ],
      objectives: [
        "Retrouver la première connexion malveillante et ses indices techniques",
        "Lire un journal d’audit de boîte mail pour confirmer l’accès réel au contenu",
        "Calculer une fenêtre d’exposition et une échéance réglementaire",
        "Choisir une mesure de confinement adaptée et justifier la notification",
      ],
      hints: [
        "Cherche d’abord le premier succès anormal du compte ciblé, pas le premier échec.",
        "La création puis la suppression de la règle de transfert encadrent la fenêtre d’exposition.",
        "Le fichier qui prouve l’accès à la boîte n’est pas celui des authentifications.",
      ],
      tasks: [
        {
          prompt: "À quelle heure UTC apparaît la première connexion réussie de l’attaquant sur le compte touché ?",
          hint: "Isole les lignes du compte concerné puis garde le premier succès depuis l’adresse inhabituelle.",
          answerFormat: "Heure UTC au format HH:MM",
          accepted: timeAnswers(incident.firstAttackerSuccessTime),
          explanation: `Les trois premières tentatives anormales échouent, puis un succès apparaît à ${incident.firstAttackerSuccessTime} UTC. Cette heure marque l’entrée effective de l’attaquant sur le compte compromis.`,
        },
        {
          prompt: "Quelle adresse IP correspond à cette première connexion réussie anormale ?",
          hint: "Relève l’adresse de la même ligne que le premier succès identifié.",
          answerFormat: "Adresse IPv4",
          accepted: compact([incident.attackerIp]),
          explanation: `L’adresse IP de la première authentification malveillante réussie est ${incident.attackerIp}. C’est elle qu’il faut suivre ensuite dans le reste des traces et bloquer en priorité.`,
        },
        {
          prompt: "Dans quel pays fictif cette adresse est-elle géolocalisée selon la table fournie ?",
          hint: "Croise l’adresse IP avec la table de géolocalisation, sans interprétation supplémentaire.",
          answerFormat: "Nom du pays",
          accepted: compact([incident.attackerCountry]),
          explanation: `La table de géolocalisation associe ${incident.attackerIp} au pays fictif ${incident.attackerCountry}. Le journal de connexions et la table suffisent donc à documenter l’origine déclarée.`,
        },
        {
          prompt: "Combien d’échecs précèdent ce premier succès de l’attaquant ?",
          hint: "Compte seulement les lignes d’échec du même compte et de la même adresse avant le succès.",
          answerFormat: "Un nombre entier",
          accepted: compact([incident.attackerFailuresBeforeSuccess]),
          explanation: `Avant le premier succès, on observe ${incident.attackerFailuresBeforeSuccess} tentatives ratées depuis la même adresse. Ce motif montre une phase d’essais avant l’accès effectif.`,
        },
        {
          prompt: "La double authentification était-elle active sur ce compte au moment de l’incident ?",
          hint: "Regarde la méthode utilisée par les connexions réussies du compte concerné.",
          answerFormat: "Réponse binaire : oui ou non",
          accepted: yesNo(incident.mfaEnabled),
          explanation: "Le guide indique que la double authentification est absente si la méthode affichée reste simplement « motdepasse ». C’est bien le cas ici, ce qui explique que le mot de passe volé ait suffi.",
        },
        {
          prompt: "Quelle adresse externe reçoit le transfert automatique créé dans la boîte compromise ?",
          hint: "Lis le détail de l’événement de création de règle dans le journal d’audit.",
          answerFormat: "Adresse de messagerie complète",
          accepted: compact([incident.forwardingAddress]),
          explanation: `Le journal d’audit mentionne explicitement la destination de la règle de transfert. Cette destination est ${incident.forwardingAddress}, preuve d’une exfiltration automatisée des messages entrants.`,
        },
        {
          prompt: "Combien de messages l’attaquant a-t-il supprimés selon le journal d’audit ?",
          hint: "Cherche l’action de suppression puis relève la quantité indiquée.",
          answerFormat: "Un nombre entier",
          accepted: compact([incident.deletedMessages]),
          explanation: `Le journal d’audit de la boîte porte une action « messages_supprimes » accompagnée d’une quantité. Cette quantité vaut ${incident.deletedMessages}, ce qui documente la volonté de masquer des traces.`,
        },
        {
          prompt: "Combien de téléchargements de pièces jointes sont enregistrés pour l’attaquant ?",
          hint: "Cherche l’action qui mentionne explicitement les pièces jointes.",
          answerFormat: "Un nombre entier",
          accepted: compact([incident.attachmentDownloads]),
          explanation: `Une ligne du journal d’audit mentionne des téléchargements de pièces jointes avec une quantité chiffrée. Cette quantité est ${incident.attachmentDownloads}, ce qui renforce le risque pour les données personnelles.`,
        },
        {
          prompt: "À quelle heure UTC Yao réinitialise-t-il son mot de passe après le signalement ?",
          hint: "Repère l’événement de réinitialisation du mot de passe dans la boîte.",
          answerFormat: "Heure UTC au format HH:MM",
          accepted: timeAnswers(incident.passwordResetTime),
          explanation: `Le journal d’audit conserve l’horodatage de la réinitialisation de mot de passe initiée par l’utilisateur. Cette action intervient à ${incident.passwordResetTime} UTC.`,
        },
        {
          prompt: "Quelle est la durée d’exposition entre la première connexion réussie de l’attaquant et la suppression de la règle de transfert, en minutes entières arrondies à la minute la plus proche ?",
          hint: "Calcule l’écart entre ces deux horodatages complets, puis convertis-le en minutes avant d’arrondir.",
          answerFormat: "Un nombre entier de minutes",
          accepted: compact(["211", "211 minutes", "211 min", exposureCompact, exposureSpaced]),
          explanation: `La fenêtre d’exposition s’ouvre au premier succès de l’attaquant et se ferme quand la règle de transfert est supprimée. L’écart vaut environ ${incident.exposureHours} heures et ${incident.exposureMinutes} minutes, soit 211 minutes après arrondi à la minute la plus proche.`,
        },
        {
          prompt: "Quelle est la date et l’heure limites de notification à l’autorité, calculées 72 heures après la prise de connaissance ?",
          hint: "La prise de connaissance officielle est le signalement de 09:40 UTC le 25 mars.",
          answerFormat: "AAAA-MM-JJ HH:MM UTC",
          accepted: compact([deadlineShort, `${deadlineShort} utc`, deadline.toLowerCase()]),
          explanation: `Le guide fixe la prise de connaissance au 25 mars 2026 à 09:40 UTC. En ajoutant 72 heures exactes, on obtient l’échéance ${deadlineShort} UTC.`,
        },
        {
          prompt: "Une notification est-elle requise au vu des pièces jointes d’adhérents présentes dans la boîte ?",
          hint: "Applique la règle du guide sur l’exposition de données personnelles.",
          answerFormat: "Réponse binaire : oui ou non",
          accepted: yesNo(incident.notificationNeeded),
          explanation: "Le guide rappelle qu’une notification est nécessaire lorsqu’une violation expose des données personnelles. Comme la boîte contenait des pièces jointes d’adhérents, la réponse correcte est affirmative.",
        },
        {
          prompt: "Quelle est la première mesure de confinement correcte ? Réponds par une lettre. a) révoquer les sessions actives puis réinitialiser le mot de passe b) supprimer le compte immédiatement c) éteindre le serveur de messagerie d) attendre un nouveau message de l’attaquant",
          hint: "Choisis l’action qui coupe l’accès de l’attaquant tout de suite sans détruire les preuves utiles.",
          answerFormat: "Une seule lettre",
          accepted: compact([incident.containmentLetter]),
          explanation: "Le confinement immédiat doit couper l’accès de l’attaquant sans détruire les preuves. La bonne réponse est la lettre a, car révoquer les sessions actives puis réinitialiser le mot de passe bloque l’usage du compte compromis tout en préservant le reste de l’environnement pour l’analyse.",
        },
        {
          prompt: "Combien d’adresses IP distinctes l’attaquant utilise-t-il avec succès dans cette chronologie ?",
          hint: "Compte uniquement les adresses qui apparaissent sur des succès anormaux du compte compromis.",
          answerFormat: "Un nombre entier",
          accepted: compact([incident.attackerSuccessIpCount]),
          explanation: `L’attaquant n’utilise pas une seule adresse sur toute la chronologie. En regroupant les authentifications réussies anormales par IP, on en trouve ${incident.attackerSuccessIpCount}, ce qui montre une activité répartie sur plusieurs points d’accès.`,
        },
        {
          prompt: "Quel nom de fichier parmi les pièces fournies prouve l’accès à la boîte elle-même ?",
          hint: "Cherche la pièce qui journalise les actions internes à la boîte, comme les règles et les téléchargements, plutôt que les seules authentifications.",
          answerFormat: "Nom exact du fichier",
          accepted: compact([incident.evidenceFileName]),
          explanation: `Le fichier qui prouve l’accès au contenu n’est pas le journal de connexions mais celui de la boîte. Ici, ${incident.evidenceFileName} montre la règle de transfert, les suppressions et les téléchargements.`,
        },
      ],
      assets: [
        asset("log", "Journal des connexions (fond-incident-connexions-messagerie.log)", "Les authentifications sur environ trente-six heures, avec les succès et échecs du personnel.", incident.assetNames.loginsFile),
        asset("log", "Table de géolocalisation (fond-incident-geoloc-ip.tsv)", "Le pays fictif et le fournisseur associés à chaque adresse IP observée.", incident.assetNames.geoFile),
        asset("log", "Journal d’audit de la boîte de Yao (fond-incident-audit-boite-yao.log)", "Les opérations internes à la boîte compromise.", incident.assetNames.auditFile),
        asset("log", "Courriel d’hameçonnage signalé (fond-incident-courriel-phishing.eml)", "Le message reçu la veille par Yao, avec ses en-têtes courts.", incident.assetNames.phishingFile),
        asset("report_template", "Modèle de chronologie d’incident", "Un tableau vide pour reconstruire les étapes de l’incident.", incident.assetNames.timelineFile),
        asset("guide", "Guide de l’incident", "Méthode d’analyse, règle des 72 heures et rappel du bon confinement.", incident.assetNames.guideFile),
      ],
    },
    {
      slug: "projet-audit-soleil",
      title: "Projet final : auditer la sécurité du Centre Numérique Soleil",
      description: "Synthétise des constats de terrain, calcule des scores d’audit, priorise les actions et transforme des notes brutes en décisions défendables.",
      difficulty: "intermediaire",
      xp: 260,
      format: "logs",
      minutes: 90,
      requiresComputer: false,
      isAssessment: true,
      category: "securite",
      briefing: "Le mardi 31 mars 2026, tu interviens comme auditeur bénévole au Centre Numérique Soleil. Tu repars avec des notes de terrain numérotées, une grille d’audit pondérée, un fichier de risques associés aux constats et un modèle de rapport. Ton objectif est de noter l’association, d’identifier le domaine le plus faible, de classer les priorités d’action et de vérifier les points réglementaires de base.",
      constraints: [
        "Tu t’appuies uniquement sur les constats, la grille et le fichier de risques fournis dans le projet.",
        "Toutes les réponses doivent être déduites des pièces, sans inventer de contrôle ni de risque supplémentaire.",
      ],
      tools: [
        "Visionneuse de journaux CyberPingo",
        "Un terminal pour refaire les calculs de dates et de pourcentages",
        "Le guide du projet, qui donne la formule de score et la règle de priorité",
      ],
      objectives: [
        "Calculer un score pondéré par domaine et un score global",
        "Compter les non-conformités et repérer le domaine le plus faible",
        "Trier un plan d’action par risque et effort",
        "Relier des constats concrets à des obligations simples de protection des données",
      ],
      hints: [
        "La grille note, les notes justifient et le fichier de risques priorise.",
        "Les gains rapides combinent un effort faible et un risque déjà significatif.",
        "Le guide précise exactement comment compter les personnes à sensibiliser en priorité.",
      ],
      tasks: [
        {
          prompt: "Quel est le score pondéré du domaine sauvegardes dans la grille d’audit, arrondi à l’entier le plus proche (0,5 vers le haut) ?",
          hint: "Applique la formule du guide uniquement aux lignes du domaine demandé.",
          answerFormat: "Pourcentage entier",
          accepted: percentAnswers(project.domainScorePercent),
          explanation: `Le score de domaine se calcule avec la somme des poids multipliés par les statuts, divisée par la somme des poids du domaine. Pour les sauvegardes, ce calcul donne ${project.domainScorePercent} %.`,
        },
        {
          prompt: "Quel est le score global du Centre Numérique Soleil, arrondi à l’entier le plus proche (0,5 vers le haut) ?",
          hint: "Additionne tous les points pondérés puis divise par la somme de tous les poids.",
          answerFormat: "Pourcentage entier",
          accepted: percentAnswers(project.globalScorePercent),
          explanation: `Le score global reprend exactement la même formule que les domaines, mais sur toute la grille. Une fois l’arrondi appliqué, le résultat global atteint ${project.globalScorePercent} %.`,
        },
        {
          prompt: "Quel domaine obtient le score le plus faible dans cette grille ? Réponds par une lettre. a) authentification b) postes c) sauvegardes d) réseau et wi-fi e) données personnelles f) gestion des incidents",
          hint: "Compare les scores pondérés domaine par domaine après calcul.",
          answerFormat: "Une seule lettre",
          accepted: compact([weakestDomainLetter(project.weakestDomain)]),
          explanation: `Le domaine le plus faible est celui dont la part de points obtenus est la plus basse. Après calcul, ${project.weakestDomain} ressort en dernière position et mérite une attention immédiate.`,
        },
        {
          prompt: "Combien de contrôles sont totalement non conformes dans la grille ?",
          hint: "Compte uniquement les lignes marquées non, sans inclure les statuts partiels.",
          answerFormat: "Un nombre entier",
          accepted: compact([project.nonCompliantCount]),
          explanation: `Le statut « non » vaut zéro point et représente la non-conformité totale. En comptant uniquement ces lignes, on en trouve ${project.nonCompliantCount}.`,
        },
        {
          prompt: "Quel identifiant d’action arrive en priorité n°1 dans le fichier de risques ?",
          hint: "Trie d’abord par score de risque décroissant, puis par effort croissant.",
          answerFormat: "Identifiant d’action",
          accepted: compact([project.topPriorityAction]),
          explanation: `Le guide impose un tri déterministe sur les actions. Après calcul du risque puis comparaison des efforts, ${project.topPriorityAction} arrive en tête du plan d’action.`,
        },
        {
          prompt: "Combien de gains rapides le projet contient-il ?",
          hint: "Un gain rapide combine un effort de 1 et un risque au moins égal à 6.",
          answerFormat: "Un nombre entier",
          accepted: compact([project.quickWinCount]),
          explanation: `Le guide définit précisément un gain rapide. En filtrant le fichier de risques sur effort 1 puis sur un score d’au moins 6, on obtient ${project.quickWinCount} actions.`,
        },
        {
          prompt: "Quel âge en jours a la dernière sauvegarde réussie à la date d’audit du 31 mars 2026 ? Compte en jours calendaires : l’écart entre les deux dates, sans tenir compte de l’heure.",
          hint: "Lis le journal des sauvegardes du projet, garde la dernière ligne SUCCESS puis compare sa date au 31 mars 2026.",
          answerFormat: "Un nombre entier de jours",
          accepted: compact([project.lastBackupAgeDays]),
          explanation: `Dans le journal des sauvegardes du projet, la dernière ligne SUCCESS date du ${project.lastBackupDate}. Les échecs qui suivent ne comptent pas. Entre cette date et le 31 mars 2026, il s’est écoulé ${project.lastBackupAgeDays} jours calendaires.`,
        },
        {
          prompt: "Quel est le taux de couverture de la double authentification parmi les 6 salariés, arrondi à l’entier le plus proche (0,5 vers le haut) ?",
          hint: "Compte dans le relevé d’accès MFA les salariés marqués « oui », puis divise par le total des 6 lignes.",
          answerFormat: "Pourcentage entier",
          accepted: percentAnswers(project.mfaCoveragePercent),
          explanation: `Dans le relevé d’accès, 2 salariés sur 6 sont marqués « oui ». Le calcul donne ${project.mfaCoveragePercent} % après arrondi, ce qui mesure la couverture réelle de la double authentification.`,
        },
        {
          prompt: "En recoupant l’inventaire des postes du projet et la table de fin de support fournie dans ce même projet, combien de postes sont encore sur un système hors support lors de la visite d’audit ?",
          hint: "Compare la version de chaque poste à sa date de fin de support au 31 mars 2026.",
          answerFormat: "Un nombre entier",
          accepted: compact([project.unsupportedPostCount]),
          explanation: `Le nombre attendu ne se lit plus dans une seule note. Il faut recouper la version de chaque poste avec la table de support du projet, puis compter ceux dont la fin de support est antérieure au 31 mars 2026. On en trouve ${project.unsupportedPostCount}.`,
        },
        {
          prompt: "Combien de jours restent-ils avant l’expiration du certificat du site web à la date du 31 mars 2026 ?",
          hint: "Lis la date d’expiration du certificat dans les notes puis calcule l’écart.",
          answerFormat: "Un nombre entier de jours",
          accepted: compact([project.certificateDaysRemaining]),
          explanation: `Le certificat de www.soleil.example expire le ${project.certificateExpiryDate}. À partir du 31 mars 2026, il reste ${project.certificateDaysRemaining} jours avant l’échéance.`,
        },
        {
          prompt: "L’algorithme d’intégrité utilisé pour les sauvegardes est-il acceptable pour un audit actuel ?",
          hint: "Croise le journal d’intégrité des sauvegardes avec la règle indiquée dans la grille d’audit.",
          answerFormat: "Réponse binaire : oui ou non",
          accepted: yesNo(project.backupIntegrityAcceptable),
          explanation: `Le journal d’intégrité montre que les archives sont vérifiées avec ${project.backupIntegrityAlgorithm.toUpperCase()}. La grille ne retient que les algorithmes de la famille SHA-2 ou plus récents : celui-ci est trop ancien pour un contrôle d’intégrité actuel, donc la réponse est négative.`,
        },
        {
          prompt: "Quel algorithme apparaît dans le journal d’intégrité des sauvegardes du projet ?",
          hint: "Lis la colonne de l’algorithme dans le fichier d’intégrité des sauvegardes.",
          answerFormat: "Nom d’algorithme en minuscules",
          accepted: compact([project.backupIntegrityAlgorithm]),
          explanation: `Le journal d’intégrité des sauvegardes annonce l’algorithme ${project.backupIntegrityAlgorithm.toUpperCase()} pour les archives du projet. C’est cette valeur qu’il faut ensuite confronter à la règle d’acceptabilité donnée dans la grille.`,
        },
        {
          prompt: "Un registre des traitements existe-t-il au moment de la visite ?",
          hint: "Vérifie l’inventaire documentaire de conformité et lis l’état indiqué pour le registre des traitements.",
          answerFormat: "Réponse binaire : oui ou non",
          accepted: yesNo(project.processingRegisterExists),
          explanation: "L’inventaire documentaire de conformité indique l’état du registre des traitements. Ici, il est absent, donc la réponse correcte est négative. La méthode consiste à vérifier la pièce documentaire dédiée plutôt qu’à supposer depuis un simple commentaire.",
        },
        {
          prompt: "Quel est le délai réglementaire de notification d’une violation de données, en heures ?",
          hint: "Le guide rappelle ce délai comme une règle fixe, pas comme un calcul variable.",
          answerFormat: "Un nombre entier d’heures",
          accepted: compact([project.notificationDelayHours]),
          explanation: `Le guide rappelle la règle de base issue du cadre de protection des données : une violation doit être notifiée dans un délai de ${project.notificationDelayHours} heures après la prise de connaissance.`,
        },
        {
          prompt: "Combien de personnes dois-tu sensibiliser en priorité après la simulation de phishing ?",
          hint: "Compte dans le relevé de simulation les personnes marquées comme ayant cliqué.",
          answerFormat: "Un nombre entier",
          accepted: compact([project.priorityAwarenessCount]),
          explanation: `Le relevé détaillé de simulation permet de compter les personnes marquées comme ayant cliqué. Comme le guide cible d’abord ces personnes, le nombre à sensibiliser en priorité est ${project.priorityAwarenessCount}.`,
        },
      ],
      assets: [
        asset("log", "Notes de terrain (fond-projet-notes-terrain.md)", "Les constats factuels relevés pendant la visite d’audit du 31 mars.", project.assetNames.notesFile),
        asset("guide", "Grille d’audit (fond-projet-grille-audit.md)", "Les 24 contrôles pondérés et leur statut de conformité.", project.assetNames.gridFile),
        asset("log", "Risques associés (fond-projet-risques.tsv)", "Le fichier de priorisation par vraisemblance, impact et effort.", project.assetNames.risksFile),
        asset("log", "Inventaire des postes du projet", "Les postes utilisés pour le recoupement avec la table de support.", project.assetNames.postsFile),
        asset("log", "Table de support du projet", "Les dates de fin de support des systèmes présents dans l’audit final.", project.assetNames.supportFile),
        asset("log", "Journal d’intégrité des sauvegardes", "Les archives de sauvegarde et l’algorithme de contrôle annoncé.", project.assetNames.integrityFile),
        asset("log", "Relevé d’accès et MFA", "Les six salariés et l’état de la double authentification au moment de l’audit.", project.assetNames.accessFile),
        asset("log", "Journal des sauvegardes du projet", "Les dernières exécutions de sauvegarde utilisées pour recalculer l’ancienneté.", project.assetNames.backupFile),
        asset("log", "Inventaire documentaire de conformité", "Les documents de protection des données disponibles ou absents.", project.assetNames.privacyFile),
        asset("log", "Relevé détaillé de simulation de phishing", "Le détail personne par personne du dernier exercice de sensibilisation.", project.assetNames.awarenessFile),
        asset("report_template", "Modèle de rapport final", "Une structure simple pour rédiger le rapport d’audit bénévole.", project.assetNames.reportFile),
        asset("guide", "Guide du projet final", "Formules de score, règle de priorité et repères pour le rendu d’audit.", project.assetNames.guideFile),
      ],
    },
  ];
}
