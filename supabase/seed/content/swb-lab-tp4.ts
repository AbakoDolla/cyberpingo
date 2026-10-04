import type { PathLab } from "./reseaux-path";

export type SwbLabTp4 = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsTp4 {
  swbTp4: {
    assetNames: {
      tokensFile: string;
      sessionsFile: string;
      hashesFile: string;
      policyFile: string;
      guideFile: string;
    };
    policy: {
      nowUtc: string;
      apiAudience: string;
      tokenMaxSeconds: number;
      inactivitySeconds: number;
    };
    answers: {
      tokenSubId: string;
      tokenSub: string;
      algNoneId: string;
      expiredCount: number;
      adminId: string;
      wrongAudienceCount: number;
      overlongTokenCount: number;
      invalidSignatureHs256Count: number;
      postLogoutSessionCount: number;
      fixationCount: number;
      idleAcceptedCount: number;
      hashAccount: string;
      hashAlgorithm: string;
      nonCompliantHashCount: number;
      weakestHashAccount: string;
      fixationLetter: string;
      revocationLetter: string;
    };
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const timeAnswers = (value: string) => compact([value, value.replace(/^0/, "")]);
const asset = (kind: SwbLabTp4["assets"][number]["kind"], title: string, description: string, name: string) => ({ kind, title, description, url: `/labs/${name}` });

export function buildSwbLabTp4(facts: FactsTp4): SwbLabTp4[] {
  const { assetNames, answers } = facts.swbTp4;

  return [
    {
      slug: "tp-web-sessions-jwt",
      title: "TP 4 : sessions, jetons JWT et mots de passe",
      description: "Tu contrôles des jetons JWT, un journal de sessions et un export d’empreintes de mots de passe pour vérifier si l’API partenaire et le portail de réservation appliquent bien la politique de l’Hôtel Palmier d’Or.",
      difficulty: "intermediaire",
      xp: 145,
      format: "logs",
      minutes: 55,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      briefing: "Le jeudi 7 mai 2026, juste avant d’ouvrir une API aux partenaires, Kader Sow demande un contrôle ciblé des jetons émis, des sessions web et du stockage des mots de passe. Tu travailles sur cinq fichiers exportés en lecture seule : des jetons JWT, un journal de cycle de vie de session, un export d’empreintes stockées, la politique interne et un guide de méthode. Pour ce TP, la référence temporelle pour la validité des jetons est le jeudi 7 mai 2026 à 09:00:00 UTC. Le secret d’essai « secret-d-exemple » sert uniquement à vérifier les signatures de cet exercice. Tout est fictif ; tu analyses seulement les fichiers fournis.",
      constraints: [
        "Tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
        "Quand une question parle de validité, utilise seulement la référence temporelle donnée dans le briefing et la politique du fichier fourni.",
      ],
      tools: [
        "Visionneuse du site",
        "Git Bash, WSL ou Termux pour couper, compter et trier",
        "PowerShell 5.1 pour filtrer et relire les fichiers UTF-8 sous Windows",
        "OpenSSL ou l’HMAC de PowerShell pour vérifier une signature d’exemple",
      ],
      objectives: [
        "Relire la structure d’un JWT et contrôler ses champs utiles avant d’en tirer une conclusion",
        "Détecter une mauvaise gestion de session dans un journal chronologique",
        "Comparer des formats d’empreintes de mots de passe à une politique écrite",
        "Proposer un correctif qui réduit vraiment le risque au lieu de déplacer le problème",
      ],
      hints: [
        "Pour un JWT, relis séparément l’algorithme annoncé, la charge utile, la durée de validité et l’audience.",
        "Pour une session, groupe d’abord les lignes par identifiant, puis regarde l’ordre connexion, requêtes, déconnexion et expiration.",
        "Pour les empreintes, un préfixe ou un paramètre numérique change complètement le verdict de conformité.",
        "Quand la politique définit un ordre de faiblesse, applique-le avant de chercher un seul compte gagnant.",
      ],
      tasks: [
        {
          prompt: `Dans « ${assetNames.tokensFile} », quel est le champ « sub » du jeton ${answers.tokenSubId} ?`,
          hint: "Découpe le JWT en trois parties, décode seulement la charge utile en base64url et lis le champ demandé.",
          answerFormat: "Un identifiant exact en minuscules",
          accepted: compact([answers.tokenSub]),
          explanation: `Le champ « sub » se trouve dans la charge utile du JWT, pas dans sa signature. Une fois la partie centrale décodée, le jeton ${answers.tokenSubId} désigne ${answers.tokenSub}. Cette méthode évite de confondre le contenu lisible du jeton avec sa preuve d’intégrité.`,
        },
        {
          prompt: `Dans « ${assetNames.tokensFile} », quel jeton annonce l’algorithme « none » ? Écris seulement son identifiant, par exemple « J01 ».`,
          hint: "Lis l’en-tête de chaque JWT ; l’algorithme annoncé est dans le champ « alg ».",
          answerFormat: "Un identifiant de jeton au format JNN",
          accepted: compact([answers.algNoneId]),
          explanation: `L’en-tête d’un JWT est la première partie encodée. En lisant le champ « alg » sur chaque jeton, un seul annonce « none » : ${answers.algNoneId}. Un tel jeton doit être rejeté pour cette API.`,
        },
        {
          prompt: `En prenant comme « maintenant » le ${facts.swbTp4.policy.nowUtc}, combien de jetons de « ${assetNames.tokensFile} » sont expirés ? Un jeton est expiré dès que son « exp » est antérieur ou égal à cet instant.`,
          hint: "Compare la valeur « exp » de chaque charge utile à l’instant de référence : « exp » est un nombre de secondes depuis le 1er janvier 1970 UTC, et un jeton expiré ne doit plus être accepté.",
          answerFormat: "Un nombre entier",
          accepted: compact([answers.expiredCount]),
          explanation: `La politique impose un instant de référence unique pour tout le TP. En comparant « exp » à ${facts.swbTp4.policy.nowUtc}, on trouve ${answers.expiredCount} jeton(s) expiré(s). Ce calcul doit se faire sur chaque charge utile et non à l’œil.`,
        },
        {
          prompt: `Dans « ${assetNames.tokensFile} », quel jeton porte le rôle « admin » ? Écris seulement son identifiant.`,
          hint: "Le rôle est dans la charge utile ; groupe d’abord les champs importants de chaque jeton avant de conclure.",
          answerFormat: "Un identifiant de jeton au format JNN",
          accepted: compact([answers.adminId]),
          explanation: `Le rôle est lisible dans la charge utile du JWT. En relisant ce champ pour chaque jeton, un seul porte « admin » : ${answers.adminId}. Même sans casser une signature, ce champ suffit déjà à mesurer la sensibilité d’un jeton.`,
        },
        {
          prompt: `Combien de jetons de « ${assetNames.tokensFile} » n’ont pas pour audience attendue « ${facts.swbTp4.policy.apiAudience} » ?`,
          hint: "L’audience se lit dans le champ « aud » ; compare-la exactement à celle annoncée par la politique.",
          answerFormat: "Un nombre entier",
          accepted: compact([answers.wrongAudienceCount]),
          explanation: `La politique fixe une seule audience attendue pour l’API partenaire. En comparant tous les champs « aud » à cette valeur, ${answers.wrongAudienceCount} jeton(s) ne correspondent pas. Vérifier l’audience empêche de recycler un jeton émis pour un autre service.`,
        },
        {
          prompt: `Selon la politique interne, combien de jetons de « ${assetNames.tokensFile} » dépassent la durée maximale autorisée ?`,
          hint: "Calcule la durée de chaque jeton avec « exp - iat », puis compare-la à la limite écrite dans la politique.",
          answerFormat: "Un nombre entier",
          accepted: compact([answers.overlongTokenCount]),
          explanation: `La politique borne la durée d’un jeton d’accès. En calculant « exp - iat » sur chaque charge utile et en comparant à cette limite, ${answers.overlongTokenCount} jeton(s) dépassent la durée autorisée. Une durée trop longue augmente l’impact d’un vol de jeton.`,
        },
        {
          prompt: `Combien de jetons HS256 de « ${assetNames.tokensFile} » ne valident pas leur signature HMAC avec le secret d’essai du TP ?`,
          hint: "Recalcule la signature sur « en-tête.charge » seulement pour les jetons annoncés en HS256, puis compare-la à la troisième partie.",
          answerFormat: "Un nombre entier",
          accepted: compact([answers.invalidSignatureHs256Count]),
          explanation: `Pour un JWT HS256, la signature se recalcule sur les deux premières parties, séparées par un point. En refaisant ce calcul avec le secret d’essai, ${answers.invalidSignatureHs256Count} jeton(s) HS256 ne valident pas. Cela révèle soit une altération de charge utile, soit une signature faite avec un autre secret.`,
        },
        {
          prompt: `Dans « ${assetNames.sessionsFile} », combien de sessions distinctes servent encore une requête acceptée après un événement « logout » ?`,
          hint: "Groupe les lignes par identifiant de session, repère « logout », puis cherche s’il existe une requête « accepted » plus tard sur le même identifiant.",
          answerFormat: "Un nombre entier",
          accepted: compact([answers.postLogoutSessionCount]),
          explanation: `Une déconnexion correcte doit invalider la session côté serveur. En regroupant les événements par identifiant et en cherchant une requête acceptée après « logout », on trouve ${answers.postLogoutSessionCount} session(s) distincte(s) encore actives. C’est un vrai défaut de révocation côté serveur.`,
        },
        {
          prompt: `Dans « ${assetNames.sessionsFile} », combien de connexions gardent le même identifiant de session avant et après « login » ?`,
          hint: "Lis les événements « login » et compare « session_id » à « rotated_to » ; la politique dit que l’identifiant doit changer.",
          answerFormat: "Un nombre entier",
          accepted: compact([answers.fixationCount]),
          explanation: `Une régénération d’identifiant après la connexion évite la fixation de session. En lisant chaque événement « login » et en comparant « session_id » à « rotated_to », ${answers.fixationCount} connexion(s) gardent pourtant le même identifiant. Le journal montre donc directement le défaut sans avoir besoin d’un navigateur.`,
        },
        {
          prompt: `Selon la politique interne, combien de requêtes acceptées de « ${assetNames.sessionsFile} » arrivent après une inactivité strictement supérieure à la limite autorisée ?`,
          hint: "Trie les événements par session puis mesure l’écart entre deux lignes successives d’un même identifiant avant de regarder la décision.",
          answerFormat: "Un nombre entier",
          accepted: compact([answers.idleAcceptedCount]),
          explanation: `La politique fixe une limite d’inactivité, donc il faut mesurer les écarts entre deux événements d’une même session. En ne gardant ensuite que les requêtes encore acceptées après un écart strictement supérieur à la limite, on en compte ${answers.idleAcceptedCount}. Cela signale une expiration d’inactivité mal appliquée.`,
        },
        {
          prompt: `Dans « ${assetNames.hashesFile} », quel algorithme protège le compte « ${answers.hashAccount} » ?`,
          hint: "Repère le préfixe de l’empreinte du compte demandé avant de lire le reste de la ligne.",
          answerFormat: "L’un des formats attendus par la politique, en minuscules",
          accepted: compact([answers.hashAlgorithm]),
          explanation: `Le format d’empreinte se reconnaît d’abord à son préfixe. Pour le compte ${answers.hashAccount}, ce préfixe correspond à ${answers.hashAlgorithm}. Lire le bon algorithme est la première étape avant de parler de conformité ou de robustesse.`,
        },
        {
          prompt: `Selon la politique interne, combien de comptes de « ${assetNames.hashesFile} » ont un stockage de mot de passe non conforme ?`,
          hint: "Commence par classer chaque ligne en « conforme » ou « non conforme » selon le format et ses paramètres, puis compte seulement les non conformes.",
          answerFormat: "Un nombre entier",
          accepted: compact([answers.nonCompliantHashCount]),
          explanation: `La politique ne juge pas seulement le nom de l’algorithme : elle tient aussi compte de certains paramètres. En relisant chaque empreinte avec cette règle, ${answers.nonCompliantHashCount} compte(s) sont non conformes. Cette vérification transforme un simple inventaire en vrai contrôle de politique.`,
        },
        {
          prompt: `Selon l’ordre de faiblesse écrit dans la politique interne, quel compte de « ${assetNames.hashesFile} » a le stockage le plus faible, sans ex æquo ?`,
          hint: "Applique l’ordre du plus faible au plus robuste de la politique avant de chercher un seul gagnant.",
          answerFormat: "Un identifiant de compte en minuscules",
          accepted: compact([answers.weakestHashAccount]),
          explanation: `La politique donne un ordre explicite de faiblesse entre les formats. En l’appliquant à tout l’export, un seul compte arrive en dernier du point de vue de la robustesse : ${answers.weakestHashAccount}. Cette méthode évite un jugement subjectif sur les empreintes.`,
        },
        {
          prompt: "Quel correctif réduit le mieux la fixation de session ? Réponds par une lettre. a) allonger la durée du cookie de session b) recopier l’identifiant de session dans l’URL c) régénérer l’identifiant de session après la connexion et lors d’un changement de privilège d) garder le même identifiant si l’adresse source ne change pas",
          hint: "Cherche la mesure qui casse le lien entre la session anonyme reçue avant connexion et la session authentifiée.",
          answerFormat: "Une seule lettre",
          accepted: compact([answers.fixationLetter]),
          explanation: "La meilleure réponse est c, car régénérer l’identifiant après la connexion et après un changement de privilège coupe la fixation de session. Les autres propositions conservent ou aggravent le défaut au lieu de le corriger réellement.",
        },
        {
          prompt: "Quel choix limite le mieux l’impact d’un JWT volé avant sa date d’expiration ? Réponds par une lettre. a) prolonger encore sa durée de validité b) utiliser des jetons courts avec une révocation ou une version de session côté serveur c) supprimer le champ « exp » pour éviter les rejets d’horloge d) stocker le jeton dans un paramètre d’URL",
          hint: "Cherche la mesure qui réduit la fenêtre d’abus et qui permet de couper un jeton compromis avant son échéance naturelle.",
          answerFormat: "Une seule lettre",
          accepted: compact([answers.revocationLetter]),
          explanation: "La bonne réponse est b. Des jetons courts réduisent la fenêtre d’abus, et une révocation ou une version de session côté serveur permet encore d’invalider un jeton compromis avant son expiration naturelle.",
        },
      ],
      assets: [
        asset("log", "Liste des jetons JWT", "Douze jetons d’accès fictifs fournis un par un avec leur identifiant interne.", assetNames.tokensFile),
        asset("log", "Journal des sessions", "Cycle de vie des sessions de réservation : connexion, requêtes, déconnexion et expiration.", assetNames.sessionsFile),
        asset("log", "Export des empreintes", "Inventaire fictif des formats d’empreintes stockées pour des comptes clients, staff et service.", assetNames.hashesFile),
        asset("guide", "Politique interne", "Règles de l’hôtel pour la durée des jetons, l’expiration des sessions et les formats d’empreintes admis.", assetNames.policyFile),
        asset("guide", "Guide de méthode", "Méthode pour décoder un JWT, relire un journal de sessions et classer des empreintes sans divulguer les réponses.", assetNames.guideFile),
      ],
    },
  ];
}
