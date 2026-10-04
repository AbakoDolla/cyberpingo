import type { PathLab } from "./reseaux-path";

export type PtLabProj = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsPtProj {
  ptProj: {
    assetNames: {
      cadrage: string;
      osint: string;
      nmap: string;
      vulns: string;
      web: string;
      mission: string;
      grille: string;
      report: string;
      guide: string;
    };
    answers: {
      scopeFqdn: string;
      forbiddenActionId: string;
      osintMissingFqdn: string;
      osintTopTechnology: string;
      nmapUpHostCount: string;
      nmapUnexpectedOpen: string;
      falsePositiveId: string;
      confirmedFindingId: string;
      webAccessControlId: string;
      webAccessControlOwasp: string;
      firstRoeTime: string;
      cleanupRemainingId: string;
      focusFindingId: string;
      focusFindingCvss: string;
      focusFindingPriority: string;
      topPriorityId: string;
      executiveSummaryLetter: string;
      recommendationLetter: string;
      firstActionsLetter: string;
      evidenceStatus: string;
    };
    scoresById: Record<string, number>;
    prioritiesById: Record<string, number>;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const timeAnswers = (value: string) => compact([value, value.replace(/^0/, "")]);
const scoreAnswers = (value: string) => compact([value, value.replace(".", ",")]);

const asset = (kind: PtLabProj["assets"][number]["kind"], title: string, description: string, name: string) => ({
  kind,
  title,
  description,
  url: `/labs/${name}`,
});

export function buildPtLabProj(facts: FactsPtProj): PtLabProj[] {
  const projet = facts.ptProj;

  return [{
    slug: "projet-pt-rapport",
    title: "Projet final : conduire un test d’intrusion sur dossier et rédiger le rapport",
    description: "Tu relies cadrage, OSINT, scan réseau, constats scanner, historique web, journal de mission et grille de risque pour qualifier, prioriser et restituer un dossier de pentest défensif.",
    difficulty: "avance",
    xp: 220,
    format: "logs",
    minutes: 85,
    requiresComputer: false,
    isAssessment: true,
    category: "securite",
    briefing: "Du 2 au 19 juin 2026, le Cabinet Harmattan mène une mission de pentest défensif pour la Coopérative Sahel-Vert. Mariam Diallo et Yao Kouassi ont réuni une synthèse de cadrage, un inventaire OSINT, un scan Nmap consolidé, un tableau de constats scanner, un historique web retenu, un journal de mission, une grille de risque et un modèle de rapport. Tu ne touches à aucun système réel : tu lis, compares, qualifies, notes et rédiges à partir de ces pièces seulement. Le dossier mélange des constats confirmés, un faux positif, au moins une hypothèse et un nettoyage encore ouvert. Tous les horodatages du dossier sont en UTC.",
    constraints: [
      "Tu analyses uniquement les fichiers fournis et tu ne lances aucune action contre un système réel.",
      "Quand tu réponds, applique seulement les règles écrites dans la Synthèse de cadrage, la Grille de risque ou le Guide de méthode.",
      "Une hypothèse reste une hypothèse tant qu’une deuxième preuve indépendante ne la confirme pas.",
      "Les choix par lettres demandent l’option la plus factuelle et la plus défendable, pas la plus alarmiste.",
    ],
    tools: [
      "Visionneuse du site pour relire les documents et les exports ligne par ligne",
      "Git Bash, WSL ou Termux pour filtrer CSV, JSONL et XML avec grep, cut, sort ou wc",
      "PowerShell 5.1 avec Get-Content -Encoding UTF8, Import-Csv et Select-String",
      "Tableur local si tu préfères recompter ou ordonner certaines colonnes",
    ],
    objectives: [
      "Valider le périmètre et les règles d’engagement avant d’interpréter les constats",
      "Croiser plusieurs pièces pour distinguer un signal, un constat confirmé et un faux positif",
      "Recalculer une note CVSS 3.1 puis une priorité numérique défendable",
      "Rédiger un résumé exécutif prudent et des recommandations vérifiables",
    ],
    hints: [
      "Commence par la Synthèse de cadrage puis la Grille de risque avant d’ouvrir les exports techniques.",
      "Quand une question parle d’un ensemble, reprends les colonnes exactes citées dans l’énoncé et rien d’autre.",
      "Un port inattendu se définit par comparaison avec la liste des services attendus, pas par intuition métier.",
      "Le journal de mission sert aussi à distinguer un écart aux règles d’engagement d’un nettoyage encore ouvert.",
      "Pour le résumé exécutif, garde seulement ce que le dossier prouve déjà sans surestimer l’impact.",
    ],
    tasks: [
      {
        prompt: "Dans la « Synthèse de cadrage », quel FQDN est explicitement marqué « en périmètre applicatif » et autorisé pour des tests web avec comptes de démonstration ?",
        hint: "Lis le tableau du périmètre et relève la seule ligne qui mentionne à la fois le portail et les validations applicatives autorisées.",
        answerFormat: "Un FQDN complet, par exemple portail.exemple.test",
        accepted: compact([projet.answers.scopeFqdn]),
        explanation: "La bonne méthode consiste à lire le tableau du périmètre et à retenir la ligne qui cumule rôle applicatif et validation web autorisée. Le FQDN attendu est celui du portail explicitement testé avec comptes de démonstration.",
      },
      {
        prompt: "Dans la « Synthèse de cadrage », quel identifiant d’action reste interdit même si l’actif est en périmètre, parce que la clause vaut « jamais » pour saturation, forçage d’authentification ou dépôt d’un exécutable ?",
        hint: "Va dans le tableau des règles d’engagement et cherche la ligne dont la colonne « Clause » indique clairement « jamais ».",
        answerFormat: "Un identifiant comme r05",
        accepted: compact([projet.answers.forbiddenActionId]),
        explanation: "Il faut lire la table des règles d’engagement et cibler la seule ligne qui interdit toujours l’action décrite. L’identifiant retenu rappelle qu’une cible en périmètre n’autorise jamais une action explicitement bannie.",
      },
      {
        prompt: `Dans « ${projet.assetNames.osint} », parmi les lignes dont la colonne « source » n’est pas « dns_zone » et dont la colonne « dns_statut » vaut « absent », quel FQDN apparaît dans le plus grand nombre de lignes ?`,
        hint: "Isole les lignes absentes du DNS actif, ignore celles issues directement de la zone DNS, puis compte les lignes par FQDN et garde le maximum.",
        answerFormat: "Un FQDN complet, par exemple vieux-portail.exemple.test",
        accepted: compact([projet.answers.osintMissingFqdn]),
        explanation: "Le bon raisonnement compare les sources passives non DNS au statut DNS actif. Le FQDN attendu est celui qui totalise le plus de traces OSINT alors qu’il n’est plus actif dans le DNS courant.",
      },
      {
        prompt: `Dans « ${projet.assetNames.osint} », pour chaque valeur de la colonne « technologie », compte les valeurs distinctes de la colonne « source » où elle apparaît : quelle technologie en a le plus (maximum strict) ?`,
        hint: "Pour chaque technologie, dresse la liste des sources différentes qui la mentionnent, compte-les, puis garde celle qui en a le plus, sans compter deux fois la même source.",
        answerFormat: "Un nom court de technologie en minuscules, par exemple tomcat",
        accepted: compact([projet.answers.osintTopTechnology]),
        explanation: "La question ne porte pas sur le nombre brut de lignes mais sur le nombre de sources distinctes qui corroborent une même technologie. La bonne réponse est donc la technologie qui revient avec le plus grand nombre de sources différentes, sans ex æquo.",
      },
      {
        prompt: `Dans « ${projet.assetNames.nmap} », combien d’hôtes ont l’état « up » ? Compte un hôte une seule fois par adresse IPv4 et ignore tous les états autres que « up ».`,
        hint: "Travaille sur les éléments hôte du XML, lis leur état, puis recompte seulement ceux qui sont marqués « up ».",
        answerFormat: "Un entier",
        accepted: compact([projet.answers.nmapUpHostCount]),
        explanation: "Le fichier XML distingue clairement l’état de chaque hôte. En comptant uniquement les hôtes « up » et en gardant une seule occurrence par adresse, on obtient le total attendu sans se laisser distraire par les hôtes down.",
      },
      {
        prompt: `Dans « ${projet.assetNames.nmap} » et la « Synthèse de cadrage », quel couple hôte:port est inattendu si seuls les ports « open » comptent et si la comparaison se fait avec la liste des services attendus ?`,
        hint: "Liste les ports ouverts par hôte, puis compare-les à la table « Services attendus » pour repérer l’unique ouverture qui n’y figure pas.",
        answerFormat: "Un couple hôte:port, par exemple portail.exemple.test:8443",
        accepted: compact([projet.answers.nmapUnexpectedOpen]),
        explanation: "Le cadrage fournit la liste des services attendus, et le scan XML liste les ports réellement ouverts. Le couple retenu est le seul port ouvert qui ne figure pas dans la liste autorisée pour son hôte.",
      },
      {
        prompt: `Dans « ${projet.assetNames.vulns} », quel identifiant Fxx est confirmé comme faux positif si tu relies le signal scanner à la colonne « validation_humaine » et à la justification du relecteur ?`,
        hint: "Cherche la ligne où la validation humaine ne confirme pas le signal mais l’infirme explicitement après vérification d’une preuve plus fiable.",
        answerFormat: "Un identifiant comme f03",
        accepted: compact([projet.answers.falsePositiveId]),
        explanation: "Un faux positif reste un signal initial du scanner, mais il est contredit par une pièce plus fiable du dossier. L’identifiant attendu est celui de la ligne dont la validation humaine écarte formellement le constat.",
      },
      {
        prompt: `Dans « ${projet.assetNames.vulns} », quel identifiant Fxx a « validation_humaine = constat », « preuve = suffisante » et « surface = vpn » ?`,
        hint: "Filtre d’abord sur le statut confirmé et la preuve suffisante, puis garde la seule ligne qui porte la surface VPN.",
        answerFormat: "Un identifiant comme f04",
        accepted: compact([projet.answers.confirmedFindingId]),
        explanation: "La ligne demandée se trouve en appliquant exactement les trois critères écrits dans l’énoncé. Ce filtrage montre comment isoler un constat confirmé précis sans confondre les statuts du tableau.",
      },
      {
        prompt: `Dans « ${projet.assetNames.web} », quelle note Wxx est un constat web confirmé de contrôle d’accès si le thème vaut « controle_acces », le verdict vaut « constat » et une preuve de type « objet_etranger_recu » ou « export_etranger_confirme » existe pour le même identifiant ?`,
        hint: "Commence par les lignes de note, puis vérifie qu’au moins une ligne de preuve du même identifiant confirme réellement l’accès à un objet d’un autre compte.",
        answerFormat: "Un identifiant comme w04",
        accepted: compact([projet.answers.webAccessControlId]),
        explanation: "La bonne réponse ne vient pas d’une note isolée : il faut la relier à une preuve concrète du même identifiant dans l’historique web. Le Wxx retenu cumule donc thème, verdict et preuve d’accès non autorisé à un objet tiers.",
      },
      {
        prompt: "Quel code OWASP Top 10 2025 correspond à ce constat web confirmé de contrôle d’accès selon la « Grille de risque » ?",
        hint: "Relis la ligne du tableau OWASP qui décrit l’accès non autorisé à un objet ou à une fonction.",
        answerFormat: "Un code de a01 à a10, par exemple a09",
        accepted: compact([projet.answers.webAccessControlOwasp]),
        explanation: "Une fois le constat de contrôle d’accès identifié, il faut le rattacher à la catégorie OWASP décrite dans la grille. Le bon code est celui qui couvre l’accès à un objet d’un autre compte sans autorisation suffisante.",
      },
      {
        prompt: `Dans « ${projet.assetNames.mission} », quelle est l’heure UTC la plus ancienne d’un écart aux règles d’engagement ? Filtre uniquement les lignes dont « event = roe_ecart », puis garde la première heure à la seconde près.`,
        hint: "Repère toutes les lignes d’écart, compare leurs horodatages ISO en UTC, puis ne conserve que l’heure la plus ancienne.",
        answerFormat: "Une heure UTC au format HH:MM:SS",
        accepted: timeAnswers(projet.answers.firstRoeTime),
        explanation: "Le journal de mission est horodaté en ISO UTC, ce qui permet de comparer proprement les écarts aux règles d’engagement. La bonne réponse est l’heure la plus ancienne parmi ces seules lignes, pas l’heure d’un autre événement de mission.",
      },
      {
        prompt: `Dans « ${projet.assetNames.mission} », quel identifiant reste à traiter si tu croises les lignes de nettoyage et que tu gardes seulement l’artefact dont « statut = ouvert » ?`,
        hint: "Va aux lignes de type nettoyage, élimine celles déjà fermées, puis relève l’unique identifiant encore ouvert.",
        answerFormat: "Un identifiant comme n04",
        accepted: compact([projet.answers.cleanupRemainingId]),
        explanation: "Le nettoyage restant à traiter se lit dans la partie fin de mission du journal. En filtrant les événements de nettoyage encore ouverts, on obtient l’identifiant du seul élément qui doit encore être confirmé côté client.",
      },
      {
        prompt: `Dans « ${projet.assetNames.vulns} », calcule la note CVSS 3.1 du constat ${projet.answers.focusFindingId.toUpperCase()} avec la formule exacte de la « Grille de risque ».`,
        hint: "Recopie le vecteur, calcule ISS, impact et exploitabilité, puis applique l’arrondi supérieur officiel au dixième.",
        answerFormat: "Une note à une décimale, avec point ou virgule",
        accepted: scoreAnswers(projet.answers.focusFindingCvss),
        explanation: "La note CVSS se recalcule entièrement à partir du vecteur présent dans le tableau des constats et de la formule de la grille. L’important est de refaire toutes les étapes, car un détail comme la portée modifiée change le résultat final.",
      },
      {
        prompt: `Dans « ${projet.assetNames.vulns} » et la « Grille de risque », quelle est la priorité numérique du constat ${projet.answers.focusFindingId.toUpperCase()} si tu appliques la formule note CVSS × surface × criticité métier × preuve × KEV × EPSS ?`,
        hint: "Après la note CVSS, relève les facteurs catégoriels et la tranche EPSS du constat, puis multiplie avant d’arrondir au dixième.",
        answerFormat: "Un nombre à une décimale, avec point ou virgule",
        accepted: scoreAnswers(projet.answers.focusFindingPriority),
        explanation: "La priorité numérique vient de la note CVSS puis des facteurs de contexte donnés par la grille. Refaire ce calcul montre pourquoi deux constats proches techniquement ne finissent pas forcément au même rang métier.",
      },
      {
        prompt: `Dans « ${projet.assetNames.vulns} » et la « Grille de risque », quel identifiant Fxx dois-tu traiter en premier si tu compares toutes les lignes dont « validation_humaine = constat » selon la priorité numérique, sans ex æquo ?`,
        hint: "Calcule ou relis la priorité de chaque constat confirmé, puis garde le maximum strict avant tout départage éventuel.",
        answerFormat: "Un identifiant comme f09",
        accepted: compact([projet.answers.topPriorityId]),
        explanation: "La question demande le premier constat confirmé à traiter selon la priorité numérique, pas selon l’impression générale. Il faut donc comparer toutes les lignes concernées et choisir celle dont la valeur finale est strictement la plus haute.",
      },
      {
        prompt: "Pour le résumé exécutif du « Modèle de rapport », quelle phrase reste la plus défendable au vu du dossier ? Réponds par la lettre. a) Le portail et la paie sont déjà compromis et une fuite générale de données est certaine. b) Plusieurs constats confirmés touchent des services exposés ; une correction prioritaire est justifiée. c) Aucun risque sérieux n’est établi, puisque le scanner peut toujours se tromper sur ses propres résultats. d) Il faut couper toute activité Internet de la coopérative en attendant un audit complet du système.",
        hint: "Choisis la phrase qui reste factuelle, proportionnée aux preuves et utile pour une direction non technique.",
        answerFormat: "Une seule lettre parmi a, b, c ou d",
        accepted: compact([projet.answers.executiveSummaryLetter]),
        explanation: "Un bon résumé exécutif nomme les constats démontrés et la priorité de correction sans annoncer une compromission totale non prouvée. La bonne option reste donc celle qui reflète exactement le niveau de preuve disponible.",
      },
      {
        prompt: "Quelle recommandation est la plus adaptée au constat web confirmé de contrôle d’accès ? Réponds par la lettre. a) Demander aux utilisateurs de choisir des mots de passe plus longs et plus variés pour leur compte. b) Désactiver le pare-feu applicatif pendant les tests pour simplifier les vérifications de l’équipe projet. c) Masquer seulement le message d’erreur affiché dans le navigateur quand un accès est refusé par le serveur. d) Vérifier côté serveur que chaque bon de commande appartient au compte connecté, puis journaliser les refus.",
        hint: "Prends l’option qui corrige la cause du défaut d’autorisation et laisse une preuve utile pour le re-test.",
        answerFormat: "Une seule lettre parmi a, b, c ou d",
        accepted: compact([projet.answers.recommendationLetter]),
        explanation: "Une recommandation utile traite la cause, pas seulement le symptôme. Ici, il faut restaurer la vérification d’appartenance côté serveur puis tracer les refus afin que le correctif soit vérifiable et durable.",
      },
      {
        prompt: "Quel ordre des trois premières actions de correction est le plus cohérent avec le dossier ? Réponds par la lettre. a) Reprendre le faux positif HSTS, réécrire le modèle de rapport, puis vérifier une hypothèse interne isolée. b) Traiter d’abord l’hypothèse sur le VPN, puis l’ancienne archive OSINT, puis le nettoyage encore ouvert. c) Corriger le contrôle d’accès du portail, fermer le port inattendu de stock, puis traiter le composant tiers. d) Recalculer toutes les notes CVSS, puis lister les sources OSINT, puis actualiser le résumé exécutif final.",
        hint: "Choisis la séquence qui commence par les constats confirmés exposés et qui laisse les sujets secondaires ou administratifs après eux.",
        answerFormat: "Une seule lettre parmi a, b, c ou d",
        accepted: compact([projet.answers.firstActionsLetter]),
        explanation: "Les trois premières actions doivent suivre la hiérarchie du risque démontré et rester opérationnelles. La meilleure séquence traite d’abord les expositions confirmées sur des services exposés avant les tâches administratives ou les hypothèses encore fragiles.",
      },
      {
        prompt: `Dans « ${projet.assetNames.mission} », l’élément H02 n’est appuyé que par une capture unique et la colonne de corroboration vaut « absente ». Selon la définition de la « Grille de risque », son statut correct est-il « constat » ou « hypothese » ? Écris exactement l’un des deux mots proposés.`,
        hint: "Relis la définition des statuts de preuve : une preuve unique non corroborée ne suffit pas pour un fait confirmé.",
        answerFormat: "Le mot exact constat ou hypothese",
        accepted: compact([projet.answers.evidenceStatus]),
        explanation: "La grille distingue clairement un constat confirmé d’une hypothèse. Avec une preuve unique et aucune corroboration, l’élément H02 ne peut pas être élevé au rang de fait confirmé et doit garder le statut plus prudent.",
      },
    ],
    assets: [
      asset("guide", "Synthèse de cadrage", "Le cadrage, le périmètre, les services attendus et les règles d’engagement de la mission.", projet.assetNames.cadrage),
      asset("log", "Consolidation OSINT", "Les recoupements passifs sur DNS, CT, archives et documents publics.", projet.assetNames.osint),
      asset("log", "Scan réseau consolidé", "La sortie XML Nmap relue pendant la mission.", projet.assetNames.nmap),
      asset("log", "Constats scanner et validation humaine", "Le tableau des constats Fxx avec vecteurs, statuts et commentaires de relecture.", projet.assetNames.vulns),
      asset("log", "Historique web retenu", "Les notes web Wxx et les preuves minimales extraites pendant la mission.", projet.assetNames.web),
      asset("log", "Journal de mission", "La chronologie horodatée, les écarts au cadrage et les opérations de nettoyage.", projet.assetNames.mission),
      asset("guide", "Grille de risque", "Les catégories OWASP 2025, la formule CVSS 3.1, les facteurs de priorité et les statuts de preuve.", projet.assetNames.grille),
      asset("report_template", "Modèle de rapport", "Le squelette à utiliser pour la synthèse, les constats et le plan de re-test.", projet.assetNames.report),
      asset("guide", "Guide de méthode", "Une méthode générique pour comparer, noter, prioriser et rédiger sans toucher à un système réel.", projet.assetNames.guide),
    ],
  }];
}
