import type { PathLab } from "./reseaux-path";

export type PtLabTp6 = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsPtTp6 {
  ptTp6: {
    assetNames: { journal: string; rules: string; artefacts: string; closure: string; guide: string };
    rulesTitle: string;
    closureTitle: string;
    closureSection: string;
    roeCount: number;
    firstRoeTime: string;
    missingNotificationId: string;
    outsideWindowId: string;
    insufficientCount: number;
    firstInsufficientId: string;
    deleteBeforeCloseCount: number;
    forgottenArtifactId: string;
    revokeLocation: string;
    retainActionId: string;
    coveredDays: string;
    defensibleLetter: string;
    retainedLetter: string;
    closurePriorityLetter: string;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const timeAnswers = (value: string) => compact([value, value.replace(/^0/, "")]);
const withAsciiFallback = (value: string) => compact([value, value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")]);
const asset = (kind: PtLabTp6["assets"][number]["kind"], title: string, description: string, name: string) => ({ kind, title, description, url: `/labs/${name}` });

export function buildPtLabTp6(facts: FactsPtTp6): PtLabTp6[] {
  const tp6 = facts.ptTp6;

  return [{
    slug: "tp-pt-mission",
    title: "TP 6 : relire le journal d’une mission : règles d’engagement, preuves et nettoyage",
    description: "Tu relis à froid un journal de mission Pentest pour vérifier les règles d’engagement, juger la qualité des preuves et préparer une clôture propre.",
    difficulty: "intermediaire",
    xp: 170,
    format: "logs",
    minutes: 50,
    requiresComputer: false,
    isAssessment: false,
    category: "securite",
    briefing: "Le 17 juin 2026, Mariam Diallo demande une relecture à froid du journal de mission tenu par Yao Kouassi pour la Coopérative Sahel-Vert. Tu disposes du journal, des règles d’engagement, d’un tableau d’artefacts à nettoyer, d’un modèle de note de clôture et d’un guide de méthode. Ton rôle n’est pas de rejouer la mission, mais de vérifier que chaque action reste défendable, correctement prouvée et proprement refermée. Toutes les heures sont en UTC. Tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
    constraints: [
      "Tu travailles uniquement sur des fichiers fournis et fictifs.",
      "Les heures sont toutes en UTC ; ne convertis pas vers l’heure locale avant de comparer.",
      "Compte un écart aux règles d’engagement une seule fois par ligne de journal.",
    ],
    tools: [
      "Visionneuse du site",
      "Git Bash, WSL ou Termux pour grep, cut, sort et awk",
      "PowerShell 5.1 avec Get-Content -Encoding UTF8 et Import-Csv -Encoding UTF8",
    ],
    objectives: [
      "Relire un journal de mission avec des critères écrits et non supposés",
      "Distinguer une preuve factuelle d’une preuve trop faible pour être défendable",
      "Relier journal, tableau d’artefacts et modèle de clôture sans mélanger les rôles des documents",
      "Préparer une clôture propre, documentée et limitée au minimum nécessaire",
    ],
    hints: [
      "Commence par les clauses qui donnent une règle observable : fenêtre, notification, action interdite, quota.",
      "Pour une « première heure », trie les lignes par horodatage UTC plutôt que par ordre d’affichage.",
      "Une preuve insuffisante ne dépend pas de ton opinion : applique les critères visibles donnés par le guide.",
      "Un artefact laissé pour re-test n’est acceptable que s’il est explicitement couvert par l’exception écrite.",
    ],
    tasks: [
      {
        prompt: `Selon le journal « ${tp6.assetNames.journal} » et le document « ${tp6.rulesTitle} », quelle est la première heure UTC d’un écart aux règles d’engagement, à la seconde près ?`,
        hint: "Isole les lignes qui violent une clause observable, puis trie-les par horodatage UTC avant de garder la plus ancienne.",
        answerFormat: "Une heure UTC au format HH:MM:SS",
        accepted: timeAnswers(tp6.firstRoeTime),
        explanation: `Il faut relire les clauses qui définissent un écart observable, filtrer le journal puis trier les lignes retenues par horodatage UTC. La première heure correcte est ${tp6.firstRoeTime}. Le point important est de raisonner sur les heures écrites dans le fichier, pas sur l’ordre visuel des lignes.`,
      },
      {
        prompt: `Combien de lignes du journal « ${tp6.assetNames.journal} » constituent au total un écart aux règles d’engagement du document « ${tp6.rulesTitle} » ?`,
        hint: "Applique chaque règle observable, mais compte une ligne fautive une seule fois même si son commentaire donne plus de contexte.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp6.roeCount]),
        explanation: `Le bon comptage croise le journal avec les clauses écrites : fenêtre horaire, notification obligatoire, action interdite et quota des comptes de test. Chaque ligne fautive ne compte qu’une fois. On obtient ${tp6.roeCount} écart(s) au total, ce qui montre l’importance d’une définition explicite du périmètre de comptage.`,
      },
      {
        prompt: `Quelle ligne du journal « ${tp6.assetNames.journal} » correspond à un écart causé par une notification manquante, selon « ${tp6.rulesTitle} » ?`,
        hint: "Cherche d’abord les actions qui exigent une notification, puis garde celle dont le commentaire dit explicitement qu’elle est absente.",
        answerFormat: "Un identifiant de ligne comme J07",
        accepted: compact([tp6.missingNotificationId]),
        explanation: `La clause de notification préalable nomme les actions concernées et le commentaire attendu. La ligne correcte est ${tp6.missingNotificationId} parce qu’elle déclenche une action soumise à notification sans fournir la référence exigée. La méthode défendable consiste à comparer l’action et le commentaire à la clause, pas à juger l’action seule.`,
      },
      {
        prompt: `Quelle ligne du journal « ${tp6.assetNames.journal} » est l’unique ligne dont l’heure UTC tombe en dehors de la fenêtre quotidienne définie par « ${tp6.rulesTitle} » ?`,
        hint: "Lis la fenêtre exacte en UTC (bornes comprises), puis compare l’heure de chaque ligne jusqu’à trouver la seule qui tombe avant l’ouverture ou après la fermeture.",
        answerFormat: "Un identifiant de ligne comme J07",
        accepted: compact([tp6.outsideWindowId]),
        explanation: `La fenêtre autorisée est écrite noir sur blanc dans les règles d’engagement. La ligne ${tp6.outsideWindowId} sort de cette fenêtre et constitue donc l’écart recherché. Le point méthodologique est de comparer des heures UTC homogènes, sans interprétation implicite.`,
      },
      {
        prompt: `Selon les critères du guide « Guide du TP 6 », combien de preuves du journal « ${tp6.assetNames.journal} » sont insuffisantes ?`,
        hint: "Le guide donne une règle observable : absence de « UTC= », absence de « cible= », ou « capture= » sans « commande= ».",
        answerFormat: "Un nombre entier",
        accepted: compact([tp6.insufficientCount]),
        explanation: `Le guide fixe ici trois critères observables de preuve insuffisante. En relisant le champ de preuve de chaque ligne du journal, on en trouve ${tp6.insufficientCount}. L’intérêt pédagogique est de classer des preuves sur critères écrits, pas sur une impression générale.`,
      },
      {
        prompt: `Après tri chronologique du journal « ${tp6.assetNames.journal} », quelle est la première ligne dont la preuve est insuffisante selon le guide ?`,
        hint: "Filtre d’abord les preuves insuffisantes, puis trie leurs horodatages UTC et garde la première ligne.",
        answerFormat: "Un identifiant de ligne comme J07",
        accepted: compact([tp6.firstInsufficientId]),
        explanation: `Une fois les preuves insuffisantes isolées avec les critères du guide, il faut les trier par horodatage UTC. La première ligne retenue est ${tp6.firstInsufficientId}. Cette étape montre pourquoi l’ordre du fichier ne suffit pas toujours quand le journal contient une légère gigue.`,
      },
      {
        prompt: `Dans le tableau « ${tp6.assetNames.artefacts} », combien d’artefacts doivent encore être supprimés avant la clôture ?`,
        hint: "Filtre la colonne « doit_etre_supprime » sur la valeur oui, sans tenir compte pour l’instant du statut détaillé.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp6.deleteBeforeCloseCount]),
        explanation: `Le tableau d’artefacts distingue clairement l’obligation de suppression du simple statut courant. En filtrant « doit_etre_supprime=oui », on obtient ${tp6.deleteBeforeCloseCount} artefact(s). Cette méthode sépare l’obligation contractuelle de l’état d’avancement du nettoyage.`,
      },
      {
        prompt: `Dans « ${tp6.assetNames.artefacts} », quel identifiant correspond à l’artefact oublié alors qu’il devait être supprimé ?`,
        hint: "Reste sur les artefacts à supprimer, puis cherche le statut qui signale explicitement un oubli.",
        answerFormat: "Un identifiant de ligne comme A09",
        accepted: compact([tp6.forgottenArtifactId]),
        explanation: `Le bon réflexe consiste à filtrer d’abord les artefacts obligatoirement supprimables, puis à lire leur statut. L’identifiant attendu est ${tp6.forgottenArtifactId}, car son statut indique un oubli malgré l’obligation de retrait. Cette lecture aide à distinguer une simple conservation autorisée d’un nettoyage réellement incomplet.`,
      },
      {
        prompt: `Selon « ${tp6.assetNames.artefacts} » et la ligne de journal qui mentionne « token-demo-0012 », quel emplacement exact doit être révoqué avant clôture ?`,
        hint: "Le journal te donne quel jeton suivre ; le tableau d’artefacts donne l’emplacement exact à révoquer.",
        answerFormat: "Un chemin complet ou un emplacement exact",
        accepted: compact([tp6.revokeLocation]),
        explanation: `Le journal sert ici à identifier le jeton concerné, puis le tableau d’artefacts donne son emplacement précis. L’emplacement à révoquer est ${tp6.revokeLocation}. Cette méthode illustre un croisement classique : un identifiant logique dans le journal, puis un chemin opérable dans l’inventaire.`,
      },
      {
        prompt: `Quelle ligne du journal « ${tp6.assetNames.journal} » justifie de conserver un artefact pour re-test sans en faire un écart, d’après l’exception écrite dans « ${tp6.rulesTitle} » ?`,
        hint: "Cherche la clause d’exception, puis retrouve la seule ligne de journal qui porte à la fois l’exception, la notification et la date de retrait prévue.",
        answerFormat: "Un identifiant de ligne comme J07",
        accepted: compact([tp6.retainActionId]),
        explanation: `L’exception de re-test n’est valable que si plusieurs éléments écrits sont présents ensemble. La ligne ${tp6.retainActionId} réunit précisément l’exception, la notification et la date prévue de retrait. La méthode défendable consiste donc à relire la clause puis à vérifier chaque marqueur attendu dans le commentaire du journal.`,
      },
      {
        prompt: `Dans « ${tp6.closureTitle} », quel est l’intitulé exact, sans son numéro, de la section où lister les artefacts laissés provisoirement en place ?`,
        hint: "Parcours seulement les titres du modèle de clôture et relève celui qui parle explicitement des artefacts maintenus jusqu’au re-test.",
        answerFormat: "Le titre exact de la section, sans son numéro",
        accepted: [...withAsciiFallback(tp6.closureSection), ...withAsciiFallback(`5. ${tp6.closureSection}`)],
        explanation: `Le modèle de clôture organise la restitution par sections nommées. La section exacte est « ${tp6.closureSection} ». Savoir repérer ce titre aide à ranger l’information au bon endroit, au lieu de disperser les exceptions de nettoyage dans une autre partie du document.`,
      },
      {
        prompt: `Combien de jours calendaires inclusifs le journal « ${tp6.assetNames.journal} » couvre-t-il au total en UTC ? Le premier et le dernier jour comptent.`,
        hint: "Relève la plus petite et la plus grande date UTC du journal, puis compte les jours en incluant les deux bornes.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp6.coveredDays]),
        explanation: `Le calcul demandé est calendaire et inclusif : on prend la première date UTC, la dernière, puis on compte les jours en incluant les deux bornes. Le résultat est ${tp6.coveredDays}. Cette précision évite l’erreur classique qui consiste à soustraire les dates sans réintégrer le premier jour.`,
      },
      {
        prompt: "Quelle formulation est la plus défendable pour signaler une preuve insuffisante dans une note de clôture ? Réponds par une lettre. a) « La preuve est mauvaise et inutilisable. » b) « La preuve n’est pas convaincante, donc nous l’écartons sans détail. » c) « La preuve ne contient pas l’horodatage ou la cible exigés par la méthode ; elle doit être complétée avant re-test. » d) « La preuve semble fausse car l’auteur a probablement oublié la procédure. »",
        hint: "Cherche la phrase la plus factuelle, proportionnée et vérifiable, sans accusation personnelle.",
        answerFormat: "Une seule lettre",
        accepted: compact([tp6.defensibleLetter]),
        explanation: "La bonne réponse est la lettre c. Une formulation défendable décrit le critère manquant, reste factuelle et indique l’action de suivi attendue. Les autres réponses sont trop vagues, trop personnelles ou insuffisamment vérifiables pour un document professionnel.",
      },
      {
        prompt: "Quelle classification convient à un artefact laissé volontairement et documenté pour re-test selon « Règles d’engagement de la mission Harmattan x Sahel-Vert » ? Réponds par une lettre. a) Un écart de nettoyage certain. b) Une exception autorisée à suivre jusqu’au retrait prévu. c) Une preuve insuffisante. d) Un hors-périmètre à ignorer.",
        hint: "Relis la clause d’exception : si elle est satisfaite, on ne classe pas automatiquement l’artefact comme un oubli.",
        answerFormat: "Une seule lettre",
        accepted: compact([tp6.retainedLetter]),
        explanation: "La bonne réponse est la lettre b. Un artefact laissé volontairement et correctement documenté relève d’une exception écrite à suivre, pas d’un oubli automatique. La nuance importante est qu’une exception reste traçable et temporaire, avec un retrait prévu et attribué.",
      },
      {
        prompt: `Quel élément faut-il écrire en priorité dans « ${tp6.closureTitle} » quand un artefact est conservé jusqu’au re-test ? Réponds par une lettre. a) Une appréciation générale sur la mission. b) Le rappel intégral de toutes les lignes du journal. c) La liste de tous les noms de domaine vus pendant la mission. d) Le nom de l’artefact, son emplacement, sa justification, son responsable et sa date prévue de retrait.`,
        hint: "Cherche ce qui permet au client de retirer l’artefact sans ambiguïté et de contrôler son suivi.",
        answerFormat: "Une seule lettre",
        accepted: compact([tp6.closurePriorityLetter]),
        explanation: "La bonne réponse est la lettre d. Si un artefact reste en place, la priorité est de documenter immédiatement tout ce qui permet son retrait propre : nom, emplacement, justification, responsable et date prévue. C’est la seule option directement vérifiable et exploitable pour la clôture.",
      },
    ],
    assets: [
      asset("log", "Journal de mission", "Journal horodaté des actions de Yao Kouassi, avec identifiant, cible, preuve et commentaire.", tp6.assetNames.journal),
      asset("guide", tp6.rulesTitle, "Document formel listant fenêtre, notifications, quotas, interdictions et exception de re-test.", tp6.assetNames.rules),
      asset("log", "Inventaire des artefacts à nettoyer", "Tableau CSV des comptes de test, jetons, fichiers temporaires et preuves minimales.", tp6.assetNames.artefacts),
      asset("report_template", tp6.closureTitle, "Modèle formel de note de clôture à compléter puis à publier en PDF.", tp6.assetNames.closure),
      asset("guide", "Guide du TP 6", "Méthode pour relire un journal, classer les preuves et préparer une clôture propre sans fuite.", tp6.assetNames.guide),
    ],
  }];
}
