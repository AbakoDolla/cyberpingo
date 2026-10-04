import type { PathLab } from "./reseaux-path";

export type SwbProjLab = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsProj {
  swbProj: {
    assetNames: {
      missionFile: string;
      headersFile: string;
      codeFile: string;
      depsFile: string;
      advisoriesFile: string;
      tlsFile: string;
      journalFile: string;
      findingsFile: string;
      gridFile: string;
      reportFile: string;
      guideFile: string;
    };
    findings: {
      owaspById: Record<string, string>;
      scoreById: Record<string, number>;
      priorityById: Record<string, number>;
    };
    answers: {
      topPriorityFinding: string;
      falsePositiveFinding: string;
      exploitedFinding: string;
      firstExploitTuple: string;
      tlsLetter: string;
      recommendationLetter: string;
      hardcodedSecretLine: string;
      touchedDependenciesCount: string;
    };
    lineNumbers: {
      hardcodedSecret: number;
    };
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim())));
const scoreAnswers = (value: number) => compact([value.toFixed(1), value.toFixed(1).replace(".", ",")]);
const numberAnswers = (value: string | number) => compact([value, String(value).replace(/^0+/, "") || "0"]);
const tupleAnswers = (value: string) => compact([value, value.replace(", ", ","), value.replace(",", ", ")]);

const asset = (kind: SwbProjLab["assets"][number]["kind"], title: string, description: string, name: string) => ({
  kind,
  title,
  description,
  url: `/labs/${name}`,
});

export function buildSwbLabProj(facts: FactsProj): SwbProjLab[] {
  const projet = facts.swbProj;
  return [
    {
      slug: "projet-web-audit",
      title: "Projet final : auditer l’application de réservation et rédiger le rapport",
      description: "Tu relies les exports d’un audit web, qualifies les constats, recalcules les notes CVSS et justifies une priorisation défendable sans toucher à un système réel.",
      difficulty: "avance",
      xp: 200,
      format: "logs",
      minutes: 95,
      requiresComputer: false,
      isAssessment: true,
      category: "securite",
      briefing: "Le mardi 12 mai 2026, l’Hôtel Palmier d’Or te demande une relecture finale de l’application de réservation avant l’ouverture de la haute saison. Kader Sow a déjà exporté la lettre de mission, les en-têtes de plusieurs pages, un extrait du code Express, la liste des dépendances, un extrait d’avis de sécurité, une synthèse TLS et un journal d’accès. Il a aussi préparé une grille interne pour la qualification, le calcul CVSS 3.1 et la priorité des corrections. Ton rôle est de distinguer les constats confirmés des faux positifs, de noter proprement ce qui doit être corrigé et de préparer les premiers éléments du rapport. Tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
      constraints: [
        "Tu travailles seulement sur les exports fournis et tu ne lances aucun scan ni aucune requête vers un service réel.",
        "Quand tu annonces une priorité, tu appliques seulement la formule et les valeurs de la grille d’évaluation.",
      ],
      tools: [
        "Visionneuse CyberPingo pour lire les réponses HTTP, le code et les journaux",
        "Git Bash, WSL ou Termux pour filtrer des lignes avec grep, cut, awk ou sort",
        "Windows PowerShell 5.1 avec Get-Content -Encoding UTF8, Select-String et Import-Csv",
      ],
      objectives: [
        "Rattacher un constat à la bonne famille OWASP 2025 à partir des preuves",
        "Recalculer des notes CVSS 3.1 et une priorité numérique sans approximation",
        "Distinguer un faux positif scanner d’un risque confirmé par le code, TLS ou le journal",
        "Préparer une recommandation immédiate et un début de rapport qui restent strictement factuels",
      ],
      hints: [
        "Commence par la lettre de mission et la grille avant d’ouvrir les constats.",
        "Pour les notes et priorités, recopie d’abord toutes les valeurs intermédiaires au brouillon.",
        "Un signal scanner peut être contredit par un en-tête ou une version déjà corrigée.",
        "Le journal d’accès sert à dater un fait observé, pas à deviner une hypothèse absente des traces.",
      ],
      tasks: [
        {
          prompt: `Selon la grille d’évaluation, quel code OWASP 2025 convient au constat F01 de « ${projet.assetNames.findingsFile} » en relisant « ${projet.assetNames.codeFile} » ?`,
          hint: "Regarde si la donnée fournie par le client est interprétée comme du SQL au lieu d’être liée comme un paramètre.",
          answerFormat: "Un code de a01 à a10, par exemple a09",
          accepted: compact([projet.findings.owaspById.F01]),
          explanation: "Le constat F01 montre une route qui concatène directement une entrée utilisateur dans une requête SQL. La catégorie OWASP 2025 adaptée est donc A05, car la donnée non fiable est interprétée comme une instruction par le moteur SQL.",
        },
        {
          prompt: `Selon la grille d’évaluation, quel code OWASP 2025 convient au constat F02 de « ${projet.assetNames.findingsFile} » en relisant « ${projet.assetNames.codeFile} » ?`,
          hint: "Observe comment le commentaire enregistré est réinjecté dans la page et demande-toi si le navigateur peut l’interpréter.",
          answerFormat: "Un code de a01 à a10, par exemple a09",
          accepted: compact([projet.findings.owaspById.F02]),
          explanation: "Le constat F02 provient d’un affichage HTML qui réinjecte une donnée stockée sans échappement. Cette famille reste rattachée à A05 en 2025, car du contenu non fiable devient une instruction interprétable dans le navigateur.",
        },
        {
          prompt: `Selon la grille d’évaluation, quel code OWASP 2025 convient au constat F03 de « ${projet.assetNames.findingsFile} » en relisant « ${projet.assetNames.codeFile} » ?`,
          hint: "Vérifie si la route confirme la propriété de la réservation avant de renvoyer son détail.",
          answerFormat: "Un code de a01 à a10, par exemple a09",
          accepted: compact([projet.findings.owaspById.F03]),
          explanation: "La route de F03 renvoie le détail d’une réservation dès qu’un utilisateur est authentifié, sans vérifier que l’objet lui appartient. C’est un contrôle d’accès brisé, donc la bonne catégorie OWASP 2025 est A01.",
        },
        {
          prompt: `Selon la grille d’évaluation, quel code OWASP 2025 convient au constat F04 de « ${projet.assetNames.findingsFile} » en relisant « ${projet.assetNames.codeFile} » ?`,
          hint: "Demande-toi quel pilier de l’authentification tombe si le secret qui signe la session est lisible dans le code.",
          answerFormat: "Un code de a01 à a10, par exemple a09",
          accepted: compact([projet.findings.owaspById.F04]),
          explanation: "Un secret de signature de session codé en dur fragilise directement l’authentification et la confiance accordée à la session. Dans la grille fournie, ce constat se rattache à A07 car il compromet le mécanisme d’authentification et d’émission des sessions.",
        },
        {
          prompt: `Selon la grille d’évaluation, quel code OWASP 2025 convient au constat F05 de « ${projet.assetNames.findingsFile} » en relisant « ${projet.assetNames.codeFile} » ?`,
          hint: "La route d’aperçu ouvre une URL choisie par le client : relis dans la grille où l’édition 2025 range ce type de requête émise par le serveur.",
          answerFormat: "Un code de a01 à a10, par exemple a09",
          accepted: compact([projet.findings.owaspById.F05]),
          explanation: "F05 permet au serveur d’aller chercher une ressource choisie par l’utilisateur, y compris des destinations internes. Dans l’édition 2025 du Top 10 OWASP, cette forme de SSRF se rattache à A01, avec les autres ruptures de contrôle d’accès.",
        },
        {
          prompt: `Selon la grille d’évaluation, quel code OWASP 2025 convient au constat F07 de « ${projet.assetNames.findingsFile} » en croisant « ${projet.assetNames.depsFile} » et « ${projet.assetNames.advisoriesFile} » ?`,
          hint: "Ce constat parle d’un composant tiers déjà exposé par un avis, pas d’une erreur de logique métier dans le code de l’hôtel.",
          answerFormat: "Un code de a01 à a10, par exemple a09",
          accepted: compact([projet.findings.owaspById.F07]),
          explanation: "F07 provient d’une dépendance touchée par un avis de sécurité alors qu’elle reste installée dans l’application. Cette situation relève de la chaîne d’approvisionnement logicielle et la grille la range donc dans A03.",
        },
        {
          prompt: `Calcule la note CVSS 3.1 du constat F01 de « ${projet.assetNames.findingsFile} » avec la formule de la grille d’évaluation.`,
          hint: "Relève toutes les métriques du vecteur, calcule impact et exploitabilité, puis applique l’arrondi supérieur officiel.",
          answerFormat: "Note à une décimale, avec point ou virgule",
          accepted: scoreAnswers(projet.findings.scoreById.F01),
          explanation: "Le constat F01 fournit son vecteur CVSS dans le tableau des constats. En appliquant exactement la formule et la règle d’arrondi supérieur de la grille, on obtient la note de base attendue pour cette injection SQL.",
        },
        {
          prompt: `Calcule la note CVSS 3.1 du constat F05 de « ${projet.assetNames.findingsFile} » avec la formule de la grille d’évaluation.`,
          hint: "Fais attention à la portée modifiée : elle change à la fois le poids de PR et l’équation d’impact finale.",
          answerFormat: "Note à une décimale, avec point ou virgule",
          accepted: scoreAnswers(projet.findings.scoreById.F05),
          explanation: "Le vecteur de F05 utilise une portée modifiée, ce qui oblige à reprendre les valeurs PR correspondantes et la formule d’impact pour S:C. Le calcul complet donne une note différente de celle d’un cas à portée inchangée.",
        },
        {
          prompt: `Calcule la note CVSS 3.1 du constat F07 de « ${projet.assetNames.findingsFile} » avec la formule de la grille d’évaluation.`,
          hint: "Le vecteur vient de l’avis associé au paquet ; la note reste une note technique, pas encore la priorité métier.",
          answerFormat: "Note à une décimale, avec point ou virgule",
          accepted: scoreAnswers(projet.findings.scoreById.F07),
          explanation: "Le paquet vulnérable de F07 est décrit avec un vecteur CVSS complet. En appliquant la grille, on retrouve une note critique qui sert ensuite de base au calcul de la priorité mais ne la remplace pas.",
        },
        {
          prompt: `Calcule la priorité numérique du constat F01 de « ${projet.assetNames.findingsFile} » avec la formule et l’échelle de certitude de la grille d’évaluation.`,
          hint: "Multiplie la note de base par la criticité de l’actif, puis par la valeur de certitude associée à « démontrée ».",
          answerFormat: "Nombre à une décimale, avec point ou virgule",
          accepted: scoreAnswers(projet.findings.priorityById.F01),
          explanation: "La priorité de F01 se calcule à partir de sa note CVSS, de la criticité de l’application et de la valeur de certitude « démontrée ». Le résultat chiffré permet de comparer objectivement ce constat aux autres.",
        },
        {
          prompt: `Calcule la priorité numérique du constat F05 de « ${projet.assetNames.findingsFile} » avec la formule et l’échelle de certitude de la grille d’évaluation.`,
          hint: "Ne saute pas la valeur de certitude : le même score CVSS peut produire une priorité différente selon le niveau de preuve.",
          answerFormat: "Nombre à une décimale, avec point ou virgule",
          accepted: scoreAnswers(projet.findings.priorityById.F05),
          explanation: "F05 vise le même actif critique que d’autres constats, mais sa priorité dépend aussi de la certitude de la preuve. La multiplication imposée par la grille donne la valeur numérique attendue.",
        },
        {
          prompt: `Calcule la priorité numérique du constat F07 de « ${projet.assetNames.findingsFile} » avec la formule et l’échelle de certitude de la grille d’évaluation.`,
          hint: "Croise la note issue de l’avis, la criticité de l’actif et la valeur de « confirmée ».",
          answerFormat: "Nombre à une décimale, avec point ou virgule",
          accepted: scoreAnswers(projet.findings.priorityById.F07),
          explanation: "La dépendance touchée par un avis critique ne devient prioritaire qu’après multiplication par la criticité de l’application et la certitude confirmée. C’est ce calcul qui place F07 devant les autres constats techniques.",
        },
        {
          prompt: `Quel numéro de constat dois-tu traiter en premier d’après la priorité numérique (note de base × criticité × certitude) de chaque constat de « ${projet.assetNames.findingsFile} » qui a un vecteur CVSS, selon la grille d’évaluation ?`,
          hint: "Repère la priorité strictement la plus haute une fois tous les calculs terminés.",
          answerFormat: "Numéro à deux chiffres, par exemple 03",
          accepted: numberAnswers(projet.answers.topPriorityFinding),
          explanation: "Le bon numéro est celui du constat dont la priorité numérique est la plus élevée, sans égalité. La grille force une comparaison explicite et évite de traiter d’abord un sujet simplement plus parlant que les autres.",
        },
        {
          prompt: `Quel numéro de constat de « ${projet.assetNames.findingsFile} » est un faux positif scanner quand tu recoupes avec « ${projet.assetNames.headersFile} » ?`,
          hint: "Lis la ligne du scanner, puis retourne vérifier l’en-tête précise sur la page concernée avant de conclure.",
          answerFormat: "Numéro à deux chiffres, par exemple 08",
          accepted: numberAnswers(projet.answers.falsePositiveFinding),
          explanation: "Le faux positif se reconnaît parce que le scanner affirme l’absence d’un en-tête qui est pourtant bien visible dans l’export brut de la page visée. Il faut donc rejeter ce constat plutôt que le prioriser.",
        },
        {
          prompt: `Quel numéro de constat de « ${projet.assetNames.findingsFile} » a déjà été exploité avec succès d’après « ${projet.assetNames.journalFile} » ? Une simple tentative ne suffit pas : cherche des requêtes dont les réponses prouvent que l’attaque a réussi.`,
          hint: "Une tentative bloquée ou en erreur n’est pas un succès : cherche un fait dans le journal qui transforme une faiblesse du code en action observée et réussie sur l’application.",
          answerFormat: "Numéro à deux chiffres, par exemple 06",
          accepted: numberAnswers(projet.answers.exploitedFinding),
          explanation: "Le journal montre un téléversement suivi d’un appel vers un script devenu publiquement accessible. Cela confirme qu’un constat de code a déjà été transformé en exploitation réelle et qu’il ne reste plus théorique.",
        },
        {
          prompt: `Dans « ${projet.assetNames.journalFile} », recopie l’heure UTC de la première requête qui exploite le constat trouvé à la question 15, et l’adresse IPv4 source de cette requête, séparées par une virgule.`,
          hint: "Cherche dans le journal la toute première requête réussie qui met en place la faiblesse de ce constat, avant les appels qui s’en servent ensuite pour vérifier qu’elle fonctionne. Les autres attaques du journal ne concernent pas ce constat.",
          answerFormat: "HH:MM:SS, IPv4",
          accepted: tupleAnswers(projet.answers.firstExploitTuple),
          explanation: "La première tentative exploitée est la toute première requête malveillante qui dépose le fichier dangereux, pas la vérification qui suit. L’heure UTC et l’adresse source se lisent sur la même ligne du journal et ouvrent la chronologie de l’incident.",
        },
        {
          prompt: "Quelle faiblesse TLS est la plus grave dans « swb-proj-tls.txt » ? Réponds par la lettre. a) le certificat finit dans moins de trois mois b) le serveur accepte encore TLS 1.0 et TLS 1.1 c) la redirection HTTP vers HTTPS est permanente d) une suite moderne en TLS 1.3 est visible",
          hint: "Choisis l’option qui maintient une exposition technique réelle, pas une bonne pratique déjà respectée.",
          answerFormat: "Une seule lettre",
          accepted: compact([projet.answers.tlsLetter]),
          explanation: "Les exportations TLS montrent encore l’acceptation de protocoles obsolètes, ce qui affaiblit nettement la surface HTTPS. Les autres options de la question décrivent au contraire un comportement neutre ou positif.",
        },
        {
          prompt: "Quelle recommandation est la plus adaptée au constat F01 ? Réponds par la lettre. a) retirer les apostrophes des recherches b) cacher les messages d’erreur SQL sans toucher à la requête c) remplacer la concaténation par une requête paramétrée et limiter les droits du compte SQL d) conserver la route et compter sur le WAF",
          hint: "La bonne réponse traite la cause et diminue aussi l’impact si une autre injection restait possible.",
          answerFormat: "Une seule lettre",
          accepted: compact([projet.answers.recommendationLetter]),
          explanation: "La correction attendue se concentre sur la séparation entre code SQL et données, puis sur le moindre privilège du compte applicatif. Les autres options masquent le symptôme ou laissent la faille structurelle en place.",
        },
        {
          prompt: `Dans « ${projet.assetNames.codeFile} », quel est le numéro de ligne du secret de signature codé en dur mentionné par le constat F04 ?`,
          hint: "Cherche la constante qui contient une valeur de démonstration lisible et relève son numéro exact dans l’extrait.",
          answerFormat: "Nombre entier",
          accepted: numberAnswers(projet.answers.hardcodedSecretLine),
          explanation: "Le constat F04 n’est pas abstrait : il pointe une ligne précise du code qui stocke en clair le secret de signature. Relever ce numéro de ligne rend la recommandation directement vérifiable pendant la correction.",
        },
      ],
      assets: [
        asset("guide", "Lettre de mission", "Le périmètre, les limites et les livrables attendus pour l’audit.", projet.assetNames.missionFile),
        asset("log", "En-têtes HTTP exportés", "Six réponses HTTP brutes à comparer avec les constats du scanner.", projet.assetNames.headersFile),
        asset("log", "Extrait du code Express", "Le code applicatif à relire pour relier les constats techniques à une ligne précise.", projet.assetNames.codeFile),
        asset("log", "Dépendances installées", "La liste des paquets Node.js et de leurs versions installées.", projet.assetNames.depsFile),
        asset("log", "Avis de sécurité", "Les paquets touchés, leurs versions corrigées et les vecteurs CVSS annoncés.", projet.assetNames.advisoriesFile),
        asset("log", "Analyse TLS", "Les protocoles, les suites et les informations du certificat exportés pour l’audit.", projet.assetNames.tlsFile),
        asset("log", "Journal d’accès web", "Le trafic normal, le bruit et les traces d’exploitation réelle à dater.", projet.assetNames.journalFile),
        asset("log", "Constats préliminaires", "Le tableau des constats F01 à F09 avec source, emplacement et certitude.", projet.assetNames.findingsFile),
        asset("guide", "Grille d’évaluation", "Les catégories OWASP 2025, la formule CVSS 3.1 et l’échelle de priorité.", projet.assetNames.gridFile),
        asset("report_template", "Modèle de rapport", "Un squelette sobre pour le résumé de direction et le tableau final des constats.", projet.assetNames.reportFile),
        asset("guide", "Guide de méthode", "Une méthode générique pour qualifier, noter, prioriser et rédiger sans toucher à un système réel.", projet.assetNames.guideFile),
      ],
    },
  ];
}
