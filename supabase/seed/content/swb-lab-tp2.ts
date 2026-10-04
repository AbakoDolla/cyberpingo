import type { PathLab } from "./reseaux-path";

export type SwbLabTp2 = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsTp2 {
  swbTp2: {
    assetNames: { access: string; sql: string; code: string; guide: string };
    vulnerableSearchRoute: string;
    injectionRequestCount: number;
    topAttackerIp: string;
    firstAttemptUtc: string;
    injection500Count: number;
    maxAttemptBytes: number;
    maxAttemptIp: string;
    maxAttemptRows: number;
    unionTable: string;
    commandInjectionRoute: string;
    bypassLoginCount: number;
    bypassAccount: string;
    dbUser: string;
    leastPrivilegeLetter: string;
    searchFixLetter: string;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const timeAnswers = (value: string) => compact([value, value.replace(/^0/, "")]);
const asset = (kind: SwbLabTp2["assets"][number]["kind"], title: string, description: string, name: string) => ({ kind, title, description, url: `/labs/${name}` });

export function buildSwbLabTp2(facts: FactsTp2): SwbLabTp2[] {
  const tp2 = facts.swbTp2;

  return [{
    slug: "tp-web-injection",
    title: "TP 2 : injections : reconnaître, comprendre et corriger",
    description: "Tu relies un journal d’accès web, un journal SQL et un extrait de code Express pour distinguer une recherche légitime d’une injection, retrouver la route fautive et choisir une correction défendable.",
    difficulty: "intermediaire",
    xp: 140,
    format: "logs",
    minutes: 55,
    requiresComputer: false,
    isAssessment: false,
    category: "securite",
    briefing: "Le mardi 5 mai 2026, Kader Sow voit passer un trafic inhabituel sur l’application de réservation de l’Hôtel Palmier d’Or. Il exporte le journal d’accès nginx, le journal SQL de l’application et un extrait du code des routes Express. Ton rôle est de distinguer le bruit normal, les recherches légitimes et les vraies tentatives d’injection, puis de juger ce que le code permet encore. Les horodatages des fichiers sont en UTC. Tu analyses uniquement ces fichiers fournis ; ne teste jamais un vrai site sans autorisation écrite.",
    constraints: [
      "Tu travailles uniquement sur des fichiers fournis et fictifs.",
      "Les exemples d’injection visibles dans les journaux sont des cas d’école défensifs ; ne les réutilise jamais contre un site réel.",
      "Tous les horodatages des fichiers sont en UTC : ne change pas de fuseau avant de comparer.",
    ],
    tools: [
      "Visionneuse du site",
      "Git Bash, WSL ou Termux pour grep, sort et uniq",
      "PowerShell 5.1 avec Get-Content -Encoding UTF8 sur Windows",
    ],
    objectives: [
      "Reconnaître un motif d’injection une fois la chaîne de requête décodée",
      "Relier une ligne d’accès web à son appel SQL par identifiant de suivi",
      "Lire du code Express pour distinguer concaténation, paramétrage et appel shell",
      "Choisir une correction qui traite la cause et pas seulement le symptôme",
    ],
    hints: [
      "Le guide donne la liste exacte des motifs à compter ; n’invente pas une définition plus large.",
      "Une apostrophe légitime dans un nom propre ne suffit pas à classer une ligne comme injection.",
      "Le journal SQL montre soit des paramètres liés, soit le SQL tel qu’il arrive à la base.",
      "Pour un maximum, vérifie qu’il n’y a pas d’ex æquo avant de conclure.",
    ],
    tasks: [
      {
        prompt: `Dans « ${tp2.assetNames.code} », quel est le chemin exact de la route de recherche de chambres qui construit son SQL par concaténation ?`,
        hint: "Cherche la route GET qui lit un paramètre de recherche puis fabrique une chaîne SQL avec des guillemets autour de la donnée.",
        answerFormat: "Un chemin web exact qui commence par /",
        accepted: compact([tp2.vulnerableSearchRoute]),
        explanation: `La bonne méthode consiste à lire la route de recherche, à repérer les variables issues de l’appel puis à contrôler si elles sont concaténées dans la chaîne SQL. Ici, la route attendue est ${tp2.vulnerableSearchRoute} car la valeur cherchée est insérée directement dans l’appel SQL au lieu de passer comme paramètre lié.`,
      },
      {
        prompt: `Dans « ${tp2.assetNames.access} », combien d’appels ont une chaîne de requête décodée (la partie de l’URL après le « ? », sur toutes les routes) qui contient l’un des motifs d’injection listés par le guide ?`,
        hint: "Extrais d’abord l’URL, décode la chaîne de requête (pourcentages et signes « + »), passe en minuscules puis teste seulement la liste de motifs donnée par le guide.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp2.injectionRequestCount]),
        explanation: `Le comptage correct commence par le décodage de la chaîne de requête, sinon « %27 » masque les apostrophes et les motifs restent invisibles. En appliquant strictement la liste du guide et rien d’autre, on trouve ${tp2.injectionRequestCount} tentative(s). Cette règle évite de compter les villes ou noms légitimes qui contiennent une apostrophe sans signaler une attaque.`,
      },
      {
        prompt: `Quelle adresse IP envoie le plus d’appels classés comme tentative d’injection dans « ${tp2.assetNames.access} », sans ex æquo ?`,
        hint: "Une fois les tentatives isolées, groupe-les par colonne source du journal nginx puis garde le seul maximum.",
        answerFormat: "Une adresse IPv4",
        accepted: compact([tp2.topAttackerIp]),
        explanation: `Une fois les seules tentatives d’injection isolées, il faut compter les lignes par adresse source. Le maximum unique revient à ${tp2.topAttackerIp}. Ce regroupement permet de séparer un bruit dispersé d’une source qui insiste davantage que les autres.`,
      },
      {
        prompt: `Quelle est l’heure UTC la plus ancienne d’une tentative d’injection dans « ${tp2.assetNames.access} » ?`,
        hint: "Trie mentalement ou avec un outil les tentatives par horodatage nginx, puis garde celle qui arrive le plus tôt à la seconde près.",
        answerFormat: "Une heure UTC au format HH:MM:SS",
        accepted: timeAnswers(tp2.firstAttemptUtc),
        explanation: `Comme les horodatages du journal web sont tous en UTC, il suffit d’ordonner les tentatives retenues et de garder la plus ancienne. L’heure obtenue est ${tp2.firstAttemptUtc}. La précision à la seconde compte ici, car plusieurs essais rapprochés n’arrivent pas dans un ordre identique.`,
      },
      {
        prompt: `Parmi ces tentatives d’injection, combien reçoivent un code HTTP 500 dans « ${tp2.assetNames.access} » ?`,
        hint: "Reste sur le sous-ensemble isolé à la question précédente, puis lis seulement la zone du code HTTP.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp2.injection500Count]),
        explanation: `Le code 500 s’observe directement dans le journal nginx, sans relire le corps du retour. Parmi les tentatives retenues, ${tp2.injection500Count} reçoivent ce code. Cette mesure aide à voir si l’application casse bruyamment ou si elle renvoie parfois un retour exploitable.`,
      },
      {
        prompt: `Quelle est la taille en octets du plus gros retour parmi les tentatives d’injection de « ${tp2.assetNames.access} » ?`,
        hint: "Isole les tentatives, puis compare la taille envoyée en fin de ligne. Vérifie qu’un seul retour occupe le maximum.",
        answerFormat: "Un nombre entier d’octets",
        accepted: compact([tp2.maxAttemptBytes]),
        explanation: `Le format nginx combined donne la taille du retour dans la colonne numérique qui suit le code HTTP. En comparant ce champ sur les seules tentatives, le plus gros retour vaut ${tp2.maxAttemptBytes} octets. Un volume beaucoup plus grand que les autres signale souvent un contenu anormalement riche ou une fuite d’infos.`,
      },
      {
        prompt: `Quelle adresse IP a reçu ce plus gros retour d’injection dans « ${tp2.assetNames.access} » ?`,
        hint: "Pars de la ligne qui porte la taille maximale, puis relis seulement la colonne source de cette ligne.",
        answerFormat: "Une adresse IPv4",
        accepted: compact([tp2.maxAttemptIp]),
        explanation: `La ligne qui porte la taille maximale garde aussi l’adresse source au commencement de la ligne. Cette adresse est ${tp2.maxAttemptIp}. Associer le volume du retour à son émetteur aide à prioriser la source qui a obtenu le plus d’informations.`,
      },
      {
        prompt: `En reliant cette ligne à « ${tp2.assetNames.sql} » par l’identifiant de suivi, combien de lignes la base renvoie-t-elle ?`,
        hint: "Recopie l’identifiant de suivi de la ligne d’accès retenue, retrouve-le dans le journal SQL puis lis le champ « rows ».",
        answerFormat: "Un nombre entier",
        accepted: compact([tp2.maxAttemptRows]),
        explanation: `Le journal d’accès montre l’identifiant de suivi dans l’URL, et le journal SQL le reprend sur la ligne correspondante. Une fois la jointure faite proprement, le champ « rows » indique ${tp2.maxAttemptRows}. Cette lecture prouve qu’il faut croiser les deux fichiers, pas seulement observer le volume HTTP.`,
      },
      {
        prompt: `Dans « ${tp2.assetNames.sql} », quel nom de table apparaît dans la tentative qui emploie « UNION SELECT » ?`,
        hint: "Repère la tentative « UNION SELECT », puis lis le nom de table juste derrière le mot « FROM » dans la partie injectée.",
        answerFormat: "Un nom de table en minuscules",
        accepted: compact([tp2.unionTable]),
        explanation: `Une tentative « UNION SELECT » ajoute un second jeu de lignes à l’appel SQL d’origine. Dans la ligne correspondante du journal SQL, la table injectée derrière « FROM » est ${tp2.unionTable}. Identifier cette table permet d’estimer quelles infos l’attaquant cherchait à lire.`,
      },
      {
        prompt: `Dans « ${tp2.assetNames.code} », quel est le chemin exact de la route qui appelle un shell avec une valeur reçue concaténée ?`,
        hint: "Cherche l’appel à « exec », puis remonte à la déclaration de route qui lui passe une valeur issue de l’appel HTTP.",
        answerFormat: "Un chemin web exact qui commence par /",
        accepted: compact([tp2.commandInjectionRoute]),
        explanation: `La route à relever est celle qui appelle un shell avec une chaîne construite à partir d’une valeur reçue. Ici, ${tp2.commandInjectionRoute} concatène directement cette valeur avant l’appel à « exec ». Ce schéma expose une injection de commandes car la donnée n’est ni validée par liste autorisée ni passée comme argument séparé.`,
      },
      {
        prompt: `Dans « ${tp2.assetNames.sql} », combien d’appels de la route « /connexion » montrent un contournement d’authentification, c’est-à-dire un SQL journalisé qui contient la condition toujours vraie « OR '1'='1' » ou « OR 1=1 » (majuscules ou minuscules) ?`,
        hint: "Garde seulement les lignes de la route « /connexion », puis compte celles dont le SQL contient « OR '1'='1' » ou « OR 1=1 ».",
        answerFormat: "Un nombre entier",
        accepted: compact([tp2.bypassLoginCount]),
        explanation: `Le journal SQL permet ici de voir le texte exact de l’appel SQL envoyé à la base. En restant sur les lignes de connexion et en comptant celles qui introduisent un contournement logique, on obtient ${tp2.bypassLoginCount}. Cette lecture est plus fiable qu’un simple comptage des codes 302, car tous les 302 ne viennent pas forcément d’une injection.`,
      },
      {
        prompt: `Quel compte est ainsi ouvert par ces contournements de connexion dans « ${tp2.assetNames.sql} » ?`,
        hint: "Sur ces lignes de connexion, lis le champ qui indique quel utilisateur est renvoyé par l’appel SQL.",
        answerFormat: "Un identifiant de compte en minuscules",
        accepted: compact([tp2.bypassAccount]),
        explanation: `Le journal SQL conserve ici le compte retourné quand l’appel de connexion réussit. Les lignes de contournement ouvrent le compte ${tp2.bypassAccount}. C’est un bon rappel qu’une injection d’authentification ne crée pas un compte : elle réutilise souvent le premier enregistrement que la base accepte de renvoyer.`,
      },
      {
        prompt: `Dans « ${tp2.assetNames.code} » et « ${tp2.assetNames.sql} », quel utilisateur de base SQL emploie l’application ?`,
        hint: "Le nom apparaît dans la configuration du code et il est confirmé par chaque ligne du journal SQL.",
        answerFormat: "Un identifiant SQL en minuscules",
        accepted: compact([tp2.dbUser]),
        explanation: `Le nom de l’utilisateur SQL se lit dans la configuration du code et dans le champ dédié du journal SQL. Ici, l’application utilise ${tp2.dbUser}. Relever ce compte permet ensuite de juger si ses droits sont trop larges pour une application web qui devrait se limiter à ce dont elle a vraiment besoin.`,
      },
      {
        prompt: "Pourquoi ce compte SQL n’est-il pas un bon exemple de moindre privilège ? Réponds par une lettre. a) Parce qu’un compte de lecture seule ne doit jamais apparaître dans les journaux. b) Parce qu’un compte trop large peut lire ou modifier plus d’infos qu’une route vulnérable ne devrait atteindre. c) Parce que le moindre privilège impose de changer d’utilisateur SQL à chaque appel. d) Parce qu’un compte SQL ne doit jamais se trouver dans le code.",
        hint: "Le principe du moindre privilège parle de droits minimaux nécessaires, pas d’invisibilité, ni de rotation à chaque requête.",
        answerFormat: "Une seule lettre",
        accepted: compact([tp2.leastPrivilegeLetter]),
        explanation: "La bonne réponse est la lettre b. Le moindre privilège consiste à limiter les droits accordés à chaque composant pour réduire l’impact d’une faille restante. Si une route injectable utilise un compte trop puissant, l’attaquant peut lire ou modifier bien plus que ce que la fonctionnalité légitime exige.",
      },
      {
        prompt: "Quelle correction traite correctement la recherche vulnérable ? Réponds par une lettre. a) Supprimer toutes les apostrophes des saisies. b) Refuser tout appel qui contient le mot « select ». c) Utiliser une instruction SQL paramétrée et valider les valeurs non paramétrables par liste autorisée. d) Garder la concaténation mais placer un WAF devant l’application.",
        hint: "Cherche la mesure qui sépare vraiment code et infos au lieu de seulement filtrer quelques signes ou mots.",
        answerFormat: "Une seule lettre",
        accepted: compact([tp2.searchFixLetter]),
        explanation: "La bonne réponse est la lettre c. Une instruction SQL paramétrée sépare le code SQL des infos et bloque le mécanisme lui-même de l’injection. Les autres choix restent fragiles : retirer des apostrophes casse des cas légitimes, filtrer un mot se contourne et un WAF peut renforcer la défense sans corriger la cause.",
      },
    ],
    assets: [
      asset("log", "Journal d’accès nginx", "Journal web au format combined, en UTC, avec trafic légitime, robots, supervision et tentatives d’injection.", tp2.assetNames.access),
      asset("log", "Journal SQL de l’application", "Une ligne par requête SQL exécutée avec identifiant de requête, route, utilisateur SQL, texte final, nombre de lignes et durée.", tp2.assetNames.sql),
      asset("log", "Extrait du code Express", "Routes Express syntaxiquement valides, dont une recherche, une connexion, une réservation et un export.", tp2.assetNames.code),
      asset("guide", "Guide du TP 2", "Méthode pour décoder une chaîne de requête, compter les motifs retenus et relier un accès à son SQL.", tp2.assetNames.guide),
    ],
  }];
}
