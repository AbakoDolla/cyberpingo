import type { PathLab } from "./reseaux-path";

type LogsLab = PathLab & {
  category?: "securite";
};

export interface FactsB {
  correlation: {
    assetNames: {
      authFile: string;
      accessFile: string;
      proxyFile: string;
      leasesFile: string;
      timelineFile: string;
      guideFile: string;
    };
    answers: {
      suspiciousIp: string;
      suspiciousPrefix: string;
      modificationPath: string;
      hostAtSsh: string;
      macAtSsh: string;
      firstAdminTime: string;
      modificationTime: string;
      adminToModificationMinutes: number;
      sshAccount: string;
      sshTime: string;
      driftMinutes: number;
      consultationSources: number;
      previousHolder: string;
      lastActivityTime: string;
      modificationToLastMinutes: number;
    };
  };
  detection: {
    assetNames: {
      eventsFile: string;
      rulesFile: string;
      guideFile: string;
    };
    answers: {
      r1Alerts: number;
      r1Vp: number;
      r1Fp: number;
      r1Fn: number;
      r1Precision: number;
      r1Recall: number;
      r3Alerts: number;
      bestPrecisionRule: number;
      bestRecallRule: number;
      thresholdNoFp: number;
      noisiestAccount: string;
      r2RecallAfterExclusion: number;
      unseenAttackIp: string;
      deploymentChoice: number;
      bestF1Rule: number;
      bestF1Score: number;
    };
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const timeAnswers = (value: string) => compact([value, value.replace(/^0/, "")]);
const percentAnswers = (value: number) => compact([value, `${value}%`, `${value} %`]);
const letter = (value: string) => compact([value]);
const asset = (kind: LogsLab["assets"][number]["kind"], title: string, description: string, name: string) => ({
  kind,
  title,
  description,
  url: `/labs/${name}`,
});

export function buildLogsLabsB(facts: FactsB): LogsLab[] {
  const tp4 = facts.correlation;
  const tp5 = facts.detection;

  return [
    {
      slug: "tp-logs-correlation",
      title: "TP 4 : corréler trois sources et dresser la chronologie",
      description: "Tu relies le journal d’authentification, le journal web, le proxy et les baux DHCP pour attribuer une adresse à une machine, corriger un décalage d’horloge et reconstituer une modification frauduleuse.",
      difficulty: "intermediaire",
      xp: 145,
      format: "logs",
      minutes: 55,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      briefing: "Le samedi 23 mai 2026, une réservation a été modifiée alors qu’aucun client n’avait demandé ce changement. Kader Sow a exporté les journaux de srv-reservation01, le proxy des bureaux, les baux DHCP et un modèle de chronologie. Tu dois convertir les heures en UTC, mesurer le décalage du proxy, rattacher l’adresse source à la bonne machine au bon instant puis reconstituer la suite web puis SSH. Le bruit est volontaire : plusieurs postes consultent l’application, des scans SSH publics existent déjà, et une adresse interne a changé de machine en cours de matinée. Chaque réponse doit s’appuyer sur les fichiers fournis et sur les règles du guide, pas sur une intuition.",
      constraints: [
        "Tu travailles uniquement sur des exports fictifs fournis par le labo, sans SIEM et sans accès à un vrai serveur.",
        "Pour les baux DHCP, applique la règle écrite dans le guide : début inclus et fin exclue.",
      ],
      tools: [
        "Visionneuse CyberPingo pour filtrer les lignes",
        "Git Bash, WSL ou Termux pour grep, awk et sort",
        "Windows PowerShell 5.1 si tu préfères Select-String et Import-Csv",
      ],
      objectives: [
        "Attribuer une adresse IP à la bonne machine au bon instant",
        "Corriger un décalage d’horloge en comparant deux traces du même fait",
        "Relier une action web, une modification et une connexion SSH en une seule chronologie UTC",
        "Justifier une conclusion sans te laisser tromper par un ancien bail ou par le bruit normal",
      ],
      hints: [
        "Choisis d’abord un événement rare visible dans deux journaux pour mesurer le décalage du proxy.",
        "Un ancien détenteur d’adresse n’est pas une preuve si le bail a déjà expiré au moment du fait.",
        "La chronologie doit être triée en UTC avant toute comparaison entre accès, proxy et auth.",
        "La dernière preuve d’activité n’est pas forcément dans le même journal que la première.",
      ],
      tasks: [
        {
          prompt: `Selon la règle du guide, quelle machine détenait l’adresse ${tp4.answers.suspiciousIp} à 2026-05-23T10:19:31Z dans « ${tp4.assetNames.leasesFile} » ?`,
          hint: "Cherche le bail dont l’heure de début couvre ce fait et dont l’heure de fin n’est pas encore atteinte.",
          answerFormat: "Nom exact de machine",
          accepted: compact([tp4.answers.hostAtSsh]),
          explanation: `Le bon bail est celui qui commence avant 10:19:31Z et finit après cet instant. En appliquant strictement début inclus et fin exclue, la machine qui porte cette adresse est ${tp4.answers.hostAtSsh}.`,
        },
        {
          prompt: `Toujours à 2026-05-23T10:19:31Z, quelle adresse MAC est associée à ${tp4.answers.suspiciousIp} dans « ${tp4.assetNames.leasesFile} » ?`,
          hint: "Reste sur le même bail que pour la question précédente et relève seulement la colonne de l’adresse matérielle.",
          answerFormat: "Adresse MAC en minuscules",
          accepted: compact([tp4.answers.macAtSsh]),
          explanation: `Une fois le bon bail identifié, il suffit de reprendre sa colonne MAC. L’adresse matérielle associée à ${tp4.answers.suspiciousIp} à cet instant est ${tp4.answers.macAtSsh}.`,
        },
        {
          prompt: `Dans « ${tp4.assetNames.accessFile} », à quelle heure UTC la source ${tp4.answers.suspiciousIp} demande-t-elle pour la première fois un chemin commençant par « ${tp4.answers.suspiciousPrefix} » ?`,
          hint: "Filtre par adresse source puis par préfixe de chemin, et garde la première occurrence chronologique.",
          answerFormat: "Heure UTC au format HH:MM:SS",
          accepted: timeAnswers(tp4.answers.firstAdminTime),
          explanation: `La première consultation de ce préfixe par cette source apparaît à ${tp4.answers.firstAdminTime} UTC. C’est le premier jalon utile pour la chronologie de la séquence malveillante.`,
        },
        {
          prompt: `Dans « ${tp4.assetNames.accessFile} », à quelle heure UTC la même source envoie-t-elle le POST vers « ${tp4.answers.modificationPath} » ?`,
          hint: "Isole d’abord la source, puis la méthode POST et enfin le chemin exact de modification.",
          answerFormat: "Heure UTC au format HH:MM:SS",
          accepted: timeAnswers(tp4.answers.modificationTime),
          explanation: `La ligne de POST sur le chemin de modification apparaît à ${tp4.answers.modificationTime} UTC. C’est la preuve directe de l’écriture sur la réservation.`,
        },
        {
          prompt: `Combien de minutes s’écoulent entre la première requête sur « ${tp4.answers.suspiciousPrefix} » et le POST sur « ${tp4.answers.modificationPath} » ?`,
          hint: "Convertis d’abord les deux preuves dans le même fuseau, puis soustrais-les sans arrondir au hasard.",
          answerFormat: "Un nombre entier de minutes",
          accepted: compact([tp4.answers.adminToModificationMinutes]),
          explanation: `En partant de la première consultation puis du POST de modification, on mesure ${tp4.answers.adminToModificationMinutes} minute(s). Cette durée montre une action courte et volontaire, pas une simple navigation lente.`,
        },
        {
          prompt: `En croisant « ${tp4.assetNames.accessFile} » et « ${tp4.assetNames.authFile} », quel compte ouvre une session SSH réussie depuis ${tp4.answers.suspiciousIp} après le POST de modification ?`,
          hint: "Repère d’abord l’adresse dans auth.log, puis garde le premier succès qui suit la modification web.",
          answerFormat: "Nom de compte en minuscules",
          accepted: compact([tp4.answers.sshAccount]),
          explanation: `La connexion SSH réussie qui suit la modification vient du compte ${tp4.answers.sshAccount}. Le lien temporel entre le POST et ce succès renforce la cohérence de la séquence.`,
        },
        {
          prompt: `Toujours dans « ${tp4.assetNames.authFile} », à quelle heure UTC se produit le premier succès SSH depuis ${tp4.answers.suspiciousIp} ?`,
          hint: "N’oublie pas que ce journal est en UTC+01:00 et qu’il faut donc revenir en UTC avant de répondre.",
          answerFormat: "Heure UTC au format HH:MM:SS",
          accepted: timeAnswers(tp4.answers.sshTime),
          explanation: `Après conversion du syslog local en UTC, le premier succès SSH depuis cette source tombe à ${tp4.answers.sshTime}. Cette conversion est indispensable pour relier correctement les trois sources.`,
        },
        {
          prompt: `Quel est l’écart d’horloge du proxy, en minutes (valeur positive, sans signe), si tu compares le POST « ${tp4.answers.modificationPath} » visible dans « ${tp4.assetNames.accessFile} » et dans « ${tp4.assetNames.proxyFile} » ?`,
          hint: "Utilise exactement le même fait dans les deux journaux, pas deux requêtes seulement semblables, puis donne l’écart sans te soucier du sens.",
          answerFormat: "Un nombre entier de minutes, sans signe",
          accepted: compact([tp4.answers.driftMinutes]),
          explanation: `Le même POST apparaît dans les deux journaux avec ${tp4.answers.driftMinutes} minute(s) d’écart. Cet événement partagé permet de corriger la chronologie du proxy sans deviner.`,
        },
        {
          prompt: `Combien de sources parmi « ${tp4.assetNames.accessFile} », « ${tp4.assetNames.proxyFile} » et « ${tp4.assetNames.authFile} » confirment la consultation « /reservation/admin/booking/8842?view=full » par ${tp4.answers.suspiciousIp} ?`,
          hint: "Compte une source seulement si tu retrouves ce fait dans cette source précise, pas seulement la même adresse.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp4.answers.consultationSources]),
          explanation: `La consultation précise est confirmée par ${tp4.answers.consultationSources} source(s). Ce comptage distingue une preuve unique d’un fait recoupé.`,
        },
        {
          prompt: "Une fois les heures corrigées en UTC, quel ordre est le bon ?\n" +
            "a) POST de modification, première consultation de la fiche, succès SSH, consultation des notes externes\n" +
            "b) Première consultation de la fiche, succès SSH, POST de modification, consultation des notes externes\n" +
            "c) Première consultation de la fiche, POST de modification, succès SSH, consultation des notes externes\n" +
            "d) Consultation des notes externes, première consultation de la fiche, POST de modification, succès SSH",
          hint: "Ne réponds qu’après avoir corrigé le décalage du proxy et le UTC+01:00 du syslog.",
          answerFormat: "Une lettre parmi a, b, c ou d",
          accepted: letter("c"),
          explanation: "Une fois tous les horodatages ramenés en UTC, la séquence correcte est bien la consultation initiale, puis la modification, puis le succès SSH et enfin la consultation externe de notes. La bonne lettre est donc c.",
        },
        {
          prompt: `Quelle piste dois-tu écarter parce que le bail DHCP la contredit au moment des faits ?\n` +
            `a) Attribuer ${tp4.answers.suspiciousIp} à ${tp4.answers.previousHolder} à 2026-05-23T10:19:31Z\n` +
            `b) Attribuer ${tp4.answers.suspiciousIp} au poste dont le bail est actif à 2026-05-23T10:19:31Z\n` +
            "c) Attribuer 172.20.10.44 à pc-reception01 à 2026-05-23T09:58:00Z\n" +
            "d) Attribuer 172.20.10.61 à pc-direction01 à 2026-05-23T10:05:00Z",
          hint: "La mauvaise piste est celle qui ignore une réattribution déjà effective avant l’événement.",
          answerFormat: "Une lettre parmi a, b, c ou d",
          accepted: letter("a"),
          explanation: `Le bail de ${tp4.answers.previousHolder} est déjà terminé à 10:19:31Z. L’option a est donc la seule piste à écarter pour contradiction avec le DHCP.`,
        },
        {
          prompt: `Dans « ${tp4.assetNames.timelineFile} », combien de lignes de travail ne peuvent pas être confirmées avec le seul « ${tp4.assetNames.accessFile} », qui est le journal le plus fiable pour l’heure ?`,
          hint: "Relis chaque intitulé du modèle et demande-toi si le journal web peut, à lui seul, en apporter la preuve.",
          answerFormat: "Un nombre entier",
          accepted: compact([3]),
          explanation: "Le modèle contient cinq lignes fixes et seules deux d’entre elles sont directement confirmables par le journal web. Il en reste donc trois qui exigent une autre source.",
        },
        {
          prompt: "À quelle heure UTC l’adresse de l’attaquant apparaît-elle pour la dernière fois dans « slg-tp4-acces.log », « slg-tp4-proxy.log » ou « slg-tp4-auth.log » ? Corrige d’abord les décalages d’horloge, puis ne retiens que les lignes qui contiennent cette adresse, où qu’elle se trouve dans la ligne (la ligne « session closed » du PAM ne la contient pas : elle ne compte donc pas).",
          hint: "Après correction des décalages, compare la fin de la séquence dans access, proxy et auth, en cherchant l’adresse elle-même, dans toute la ligne, et non le compte.",
          answerFormat: "Heure UTC au format HH:MM:SS",
          accepted: timeAnswers(tp4.answers.lastActivityTime),
          explanation: `La dernière ligne qui porte l’adresse de l’attaquant apparaît à ${tp4.answers.lastActivityTime} UTC. C’est le dernier jalon utile pour borner l’incident dans le temps ; la ligne « session closed » du PAM qui suit ne cite plus l’adresse et n’est donc pas retenue.`,
        },
        {
          prompt: `Combien de minutes séparent le POST « ${tp4.answers.modificationPath} » et cette dernière apparition de l’adresse ?`,
          hint: "Pars de l’heure exacte du POST puis soustrais-la de l’heure de la dernière apparition déjà corrigée.",
          answerFormat: "Un nombre entier de minutes",
          accepted: compact([tp4.answers.modificationToLastMinutes]),
          explanation: `Entre la modification et la dernière apparition de l’adresse, il s’écoule ${tp4.answers.modificationToLastMinutes} minute(s). Cette borne aide à resserrer la fenêtre d’investigation.`,
        },
        {
          prompt: `Quelle conclusion est la plus défendable avec les fichiers fournis ?\n` +
            `a) ${tp4.answers.previousHolder} reste le meilleur suspect parce qu’il a porté l’adresse plus tôt dans la matinée\n` +
            "b) Le décalage du proxy suffit à lui seul à expliquer la réservation modifiée, sans autre incident\n" +
            "c) Une origine interne rend la modification automatiquement légitime\n" +
            `d) Le poste qui porte ${tp4.answers.suspiciousIp} au moment des faits d’après le DHCP est aussi la source qui enchaîne une consultation web, une modification puis un succès SSH`,
          hint: "La bonne synthèse est celle qui respecte à la fois le DHCP, le web, le proxy et auth.",
          answerFormat: "Une lettre parmi a, b, c ou d",
          accepted: letter("d"),
          explanation: `Les quatre sources convergent vers ${tp4.answers.hostAtSsh} au bon moment, puis vers une séquence cohérente web puis SSH. La conclusion défendable est donc d.`,
        },
      ],
      assets: [
        asset("log", "Journal d’authentification", "Le syslog d’authentification de srv-reservation01, en heure locale UTC+01:00.", tp4.assetNames.authFile),
        asset("log", "Journal d’accès web", "Le journal nginx de l’application de réservation, déjà en UTC.", tp4.assetNames.accessFile),
        asset("log", "Journal du proxy", "Le journal natif du proxy des bureaux, en epoch.", tp4.assetNames.proxyFile),
        asset("log", "Baux DHCP", "Les baux qui permettent de rattacher une adresse à une machine et à une adresse MAC.", tp4.assetNames.leasesFile),
        asset("report_template", "Modèle de chronologie", "Le tableau de travail à remplir en UTC pour ne rien oublier.", tp4.assetNames.timelineFile),
        asset("guide", "Guide du TP 4", "La méthode de corrélation, la règle de jointure DHCP et la conversion des horodatages.", tp4.assetNames.guideFile),
      ],
    },
    {
      slug: "tp-logs-detection",
      title: "TP 5 : règles de détection : seuils, fenêtres et faux positifs",
      description: "Tu appliques trois règles de détection à un journal d’authentification applicative, comptes VP, FP et FN, ajustes un seuil et mesures l’effet d’une exclusion.",
      difficulty: "intermediaire",
      xp: 145,
      format: "logs",
      minutes: 55,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      briefing: "Le lundi 25 mai 2026, Kader Sow veut automatiser la détection de la force brute sur la page de connexion de l’application de réservation. Il fournit un journal CSV des événements d’authentification, déjà horodatés en UTC, avec une étiquette de vérité sur chaque ligne, ainsi qu’un document de règles candidates. Tu dois appliquer exactement la fenêtre, le regroupement et les exclusions écrits dans les fichiers, puis mesurer la précision, le rappel et le compromis obtenu. Le jeu de données contient du bruit utile : utilisateurs distraits, comptes de service bruyants, vérification connue et attaques de rythmes différents. Tu ne dois rien deviner hors des fichiers : toutes les formules et conventions d’arrondi sont données.",
      constraints: [
        "Tu calcules VP, FP, FN, précision, rappel et F1 uniquement avec les définitions écrites dans les fichiers du labo.",
        "Les règles ne regardent que les lignes dont la colonne Result vaut failure.",
      ],
      tools: [
        "Visionneuse CyberPingo pour filtrer le CSV et les règles",
        "Git Bash, WSL ou Termux pour awk, sort et de petits comptages",
        "Windows PowerShell 5.1 si tu préfères Import-Csv et Group-Object",
      ],
      objectives: [
        "Appliquer une fenêtre glissante définie sans ambiguïté",
        "Mesurer VP, FP et FN sur la ligne déclencheuse de chaque alerte",
        "Comparer trois règles par précision, rappel et score F1",
        "Vérifier l’effet d’un seuil ou d’une exclusion avant de la recommander",
      ],
      hints: [
        "Une alerte est attachée à la ligne d’échec qui fait franchir le seuil, pas à toute la série.",
        "Lis bien le regroupement de chaque règle avant de compter sa fenêtre.",
        "Un faux négatif est ici une ligne d’attaque non alertée, pas une adresse entière.",
        "Une exclusion peut baisser le bruit, mais elle peut aussi enlever de vrais positifs.",
      ],
      tasks: [
        {
          prompt: "D’après « slg-tp5-regles.md », combien d’alertes lève la règle 1 sur « slg-tp5-evenements.csv » ?",
          hint: "Applique exactement la fenêtre glissante de la règle 1 et compte chaque ligne d’échec qui atteint ou dépasse le seuil.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp5.answers.r1Alerts]),
          explanation: `En appliquant strictement la règle 1 sur les seules lignes en échec, on obtient ${tp5.answers.r1Alerts} alerte(s). Chaque alerte correspond à une ligne déclencheuse, pas à une adresse comptée une seule fois.`,
        },
        {
          prompt: "Toujours pour la règle 1, combien d’alertes sont des vrais positifs ?",
          hint: "Une alerte est un vrai positif si la ligne qui la déclenche porte Truth=attaque.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp5.answers.r1Vp]),
          explanation: `La règle 1 déclenche ${tp5.answers.r1Vp} vrai(s) positif(s). Il faut vérifier la vérité de chaque ligne déclencheuse, pas seulement celle du groupe entier.`,
        },
        {
          prompt: "Toujours pour la règle 1, combien d’alertes sont des faux positifs ?",
          hint: "Isole les alertes de la règle 1 dont la ligne déclencheuse est étiquetée normal.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp5.answers.r1Fp]),
          explanation: `La règle 1 produit ${tp5.answers.r1Fp} faux positif(s). Ce bruit vient d’échecs légitimes qui ressemblent superficiellement à une force brute.`,
        },
        {
          prompt: "Toujours pour la règle 1, combien de faux négatifs restants comptes-tu avec la définition du TP ?",
          hint: "Relis la définition du faux négatif dans le guide puis compte les lignes attaque non alertées par la règle 1.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp5.answers.r1Fn]),
          explanation: `Avec la définition du TP, la règle 1 laisse ${tp5.answers.r1Fn} faux négatif(s). Il s’agit de lignes attaque qui ne déclenchent aucune alerte de cette règle.`,
        },
        {
          prompt: "Quelle est la précision de la règle 1, en pourcentage entier arrondi selon le guide ?",
          hint: "Calcule d’abord VP et FP, puis applique la formule et l’arrondi écrit dans les fichiers.",
          answerFormat: "Un pourcentage entier, avec ou sans signe %",
          accepted: percentAnswers(tp5.answers.r1Precision),
          explanation: `La précision de la règle 1 vaut ${tp5.answers.r1Precision} %. Elle mesure la part d’alertes justifiées parmi toutes les alertes de cette règle.`,
        },
        {
          prompt: "Quel est le rappel de la règle 1, en pourcentage entier arrondi selon le guide ?",
          hint: "Utilise VP et FN, pas le nombre total d’alertes.",
          answerFormat: "Un pourcentage entier, avec ou sans signe %",
          accepted: percentAnswers(tp5.answers.r1Recall),
          explanation: `Le rappel de la règle 1 vaut ${tp5.answers.r1Recall} %. Il mesure la part des lignes d’attaque que la règle 1 parvient effectivement à alerter.`,
        },
        {
          prompt: "Combien d’alertes lève la règle 3 sur « slg-tp5-evenements.csv » ?",
          hint: "N’oublie pas ses exclusions avant d’appliquer son regroupement par source et compte.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp5.answers.r3Alerts]),
          explanation: `Une fois ses exclusions appliquées, la règle 3 lève ${tp5.answers.r3Alerts} alerte(s). Son regroupement plus strict réduit fortement le volume d’alertes.`,
        },
        {
          prompt: "Quelle règle a la meilleure précision, sans ex aequo ? Réponds par 1, 2 ou 3.",
          hint: "Calcule la précision des trois règles, puis garde la plus élevée.",
          answerFormat: "Le numéro de règle",
          accepted: compact([tp5.answers.bestPrecisionRule]),
          explanation: `La meilleure précision appartient à la règle ${tp5.answers.bestPrecisionRule}. C’est celle qui laisse le moins de bruit relatif.`,
        },
        {
          prompt: "Quelle règle a le meilleur rappel, sans ex aequo ? Réponds par 1, 2 ou 3.",
          hint: "Compare les rappels et garde la règle qui voit le plus d’attaque utile.",
          answerFormat: "Le numéro de règle",
          accepted: compact([tp5.answers.bestRecallRule]),
          explanation: `Le meilleur rappel appartient à la règle ${tp5.answers.bestRecallRule}. Elle couvre la plus grande part des lignes d’attaque alertées.`,
        },
        {
          prompt: "Si tu conserves la fenêtre de 5 minutes et le regroupement par SourceIp de la règle 1, quel est le seuil minimal qui supprime tous ses faux positifs ?",
          hint: "Monte le seuil pas à pas jusqu’à faire disparaître le dernier faux positif, sans changer le reste de la règle.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp5.answers.thresholdNoFp]),
          explanation: `Le premier seuil qui fait disparaître tous les faux positifs de la règle 1 est ${tp5.answers.thresholdNoFp}. Il faut le trouver expérimentalement sur la même fenêtre et le même regroupement.`,
        },
        {
          prompt: "Pour la règle 2, quel compte est responsable de la plupart des faux positifs ?",
          hint: "Filtre d’abord les alertes FP de la règle 2, puis groupe-les par compte.",
          answerFormat: "Nom de compte en minuscules",
          accepted: compact([tp5.answers.noisiestAccount]),
          explanation: `Sous la règle 2, le compte qui concentre le plus de faux positifs est ${tp5.answers.noisiestAccount}. C’est donc le premier candidat à examiner avant de proposer une exclusion.`,
        },
        {
          prompt: "Si tu ajoutes à la règle 2 une exclusion explicite du compte trouvé à la question précédente, quel rappel obtiens-tu alors ?",
          hint: "Rejoue la règle 2 avec cette seule exclusion supplémentaire puis recalcule VP et FN. Une ligne exclue ne déclenche plus d’alerte, mais elle reste dans le jeu de données : si elle porte Truth=attaque, c’est un faux négatif.",
          answerFormat: "Un pourcentage entier, avec ou sans signe %",
          accepted: percentAnswers(tp5.answers.r2RecallAfterExclusion),
          explanation: `Avec cette exclusion supplémentaire, le rappel vaut ${tp5.answers.r2RecallAfterExclusion} %. Les lignes du compte exclu ne déclenchent plus d’alerte, donc leurs faux positifs disparaissent, mais elles restent dans le jeu de données : une ligne d’attaque visant ce compte compte comme faux négatif. Une exclusion réduit le bruit, mais elle crée un angle mort sur ce compte.`,
        },
        {
          prompt: "Quelle adresse source mène l’attaque lente (au moins cinq échecs étiquetés « attaque », chacun espacé du précédent de plus de dix minutes) qu’aucune des trois règles ne détecte ?",
          hint: "Cherche, parmi les lignes Truth=attaque, une source dont les échecs se suivent à plus de dix minutes d’intervalle : aucune fenêtre n’en voit plusieurs à la fois.",
          answerFormat: "Adresse IPv4",
          accepted: compact([tp5.answers.unseenAttackIp]),
          explanation: `Aucune des trois règles ne détecte l’attaque lente issue de ${tp5.answers.unseenAttackIp}. Son rythme reste sous tous les seuils dans toutes les fenêtres définies.`,
        },
        {
          prompt: "L’équipe veut une précision d’au moins 60 % et choisit ensuite, parmi les règles qui respectent ce plancher, celle qui a le meilleur rappel. Laquelle faut-il retenir ?\n" +
            "a) Règle 1\n" +
            "b) Règle 2\n" +
            "c) Règle 3\n" +
            "d) Aucune",
          hint: "Calcule d’abord la précision de chaque règle, puis compare le rappel seulement entre celles qui passent le plancher.",
          answerFormat: "Une lettre parmi a, b, c ou d",
          accepted: letter(tp5.answers.deploymentChoice === 1 ? "a" : tp5.answers.deploymentChoice === 2 ? "b" : tp5.answers.deploymentChoice === 3 ? "c" : "d"),
          explanation: `Avec le plancher de précision donné, la meilleure candidate restante est la règle ${tp5.answers.deploymentChoice}. La lettre correcte est donc ${tp5.answers.deploymentChoice === 1 ? "a" : tp5.answers.deploymentChoice === 2 ? "b" : tp5.answers.deploymentChoice === 3 ? "c" : "d"}.`,
        },
        {
          prompt: "Selon la définition du guide, quelle règle a le meilleur score F1, sans ex aequo ? Réponds par 1, 2 ou 3, puis garde en tête ce résultat pour la synthèse.",
          hint: "Calcule F1 après précision et rappel, puis applique la règle de départage écrite dans les fichiers si besoin.",
          answerFormat: "Le numéro de règle",
          accepted: compact([tp5.answers.bestF1Rule]),
          explanation: `Le meilleur score F1 appartient à la règle ${tp5.answers.bestF1Rule}. Ce score sert ici de compromis objectif entre précision et rappel.`,
        },
      ],
      assets: [
        asset("log", "Événements d’authentification", "Le CSV chronologique des succès et échecs, avec une étiquette de vérité sur chaque ligne.", tp5.assetNames.eventsFile),
        asset("guide", "Règles candidates", "Les trois règles, leurs seuils, leurs fenêtres, leurs exclusions et les formules de mesure.", tp5.assetNames.rulesFile),
        asset("guide", "Guide du TP 5", "La méthode de fenêtre glissante, le calcul de VP, FP, FN et des pourcentages.", tp5.assetNames.guideFile),
      ],
    },
  ];
}
