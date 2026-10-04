import type { PathLab } from "./reseaux-path";

export type SwbLabTp3 = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsTp3 {
  swbTp3: {
    assetNames: {
      templatesFile: string;
      policiesFile: string;
      reportsFile: string;
      headersFile: string;
      scriptFile: string;
      guideFile: string;
    };
    rawOutputCount: number;
    unquotedAttributeTemplate: string;
    scriptBlockTemplate: string;
    unsafeInlinePolicy: string;
    noncePolicy: string;
    missingObjectAndBasePolicy: string;
    topViolatedDirective: string;
    topBlockedOrigin: string;
    distinctInlineSourceFiles: number;
    headerScoreTotal: number;
    weakestPage: string;
    pagesWithoutNosniff: number;
    scriptHashBase64: string;
    adoptPolicyLetter: string;
    deploySafelyLetter: string;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const asset = (kind: SwbLabTp3["assets"][number]["kind"], title: string, description: string, name: string) => ({ kind, title, description, url: `/labs/${name}` });

export function buildSwbLabTp3(facts: FactsTp3): SwbLabTp3[] {
  const tp3 = facts.swbTp3;

  return [
    {
      slug: "tp-web-xss-csp",
      title: "TP 3 : XSS, CSP et en-têtes : évaluer une politique",
      description: "Tu relis des gabarits, des politiques CSP, des rapports de violation et un tableau d’en-têtes pour repérer des sorties fragiles, juger des politiques de défense en profondeur et noter des pages de l’application de réservation.",
      difficulty: "intermediaire",
      xp: 145,
      format: "logs",
      minutes: 55,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      briefing: "Le mercredi 6 mai 2026, l’Hôtel Palmier d’Or veut publier une politique CSP sur « reservation.palmier-or.example ». Kader Sow exporte douze extraits de gabarits, six politiques candidates, un lot de rapports de violation collectés en mode essai, un tableau d’en-têtes HTTP et le texte exact d’un script en ligne encore présent sur une page. Ton rôle est de séparer les sorties dangereuses des sorties correctement encadrées, puis de choisir une politique qui couvre les besoins réels sans ouvrir trop large. Tu dois aussi noter les en-têtes en place sur dix pages et vérifier l’empreinte du script encore autorisé. Tu analyses uniquement des fichiers fournis ; ne teste jamais un site réel sans autorisation écrite.",
      constraints: [
        "Tu travailles uniquement sur les fichiers fournis.",
        "Les politiques et rapports du TP 3 sont fictifs, mais leurs directives et champs gardent une forme réaliste.",
      ],
      tools: [
        "Visionneuse du site",
        "Git Bash, WSL ou Termux pour grep, awk, sort, uniq et openssl",
        "PowerShell 5.1 pour lire UTF-8, filtrer un CSV et calculer une empreinte",
      ],
      objectives: [
        "Distinguer une sortie échappée d’une sortie brute selon le contexte HTML",
        "Lire une CSP et comprendre le repli de default-src",
        "Trier des rapports de violation par directive, origine et fichier source",
        "Évaluer rapidement la couverture des en-têtes de protection",
      ],
      hints: [
        "Commence par classer chaque extrait de gabarit par contexte avant de compter.",
        "Quand une directive manque, vérifie si default-src la remplace avant de conclure.",
        "Pour un maximum, groupe puis vérifie qu’il n’y a pas d’ex æquo.",
        "La meilleure politique est celle qui couvre les besoins révélés par les rapports sans rouvrir inutilement les scripts en ligne.",
      ],
      tasks: [
        {
          prompt: "Dans « swb-tp3-gabarits.txt », combien d’extraits utilisent une sortie brute « <%- ... %> » ?",
          hint: "Compte seulement les extraits qui affichent une sortie brute, quel que soit leur contexte.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp3.rawOutputCount]),
          explanation: `Dans ce fichier, il faut simplement repérer chaque usage de « <%- ... %> », puis les additionner sans tenir compte du contexte. On en compte ${tp3.rawOutputCount}. Ce premier tri sert de base avant de juger quels usages sont vraiment dangereux selon l’endroit où la valeur est insérée.`,
        },
        {
          prompt: "Quel identifiant de gabarit montre une donnée brute dans un attribut HTML sans guillemets ?",
          hint: "Cherche l’unique ligne dans laquelle une valeur brute arrive dans un attribut non entouré de guillemets.",
          answerFormat: "Un identifiant de gabarit, par exemple G01",
          accepted: compact([tp3.unquotedAttributeTemplate]),
          explanation: `L’extrait cherché est celui qui combine deux risques : une sortie brute et un attribut non entouré de guillemets. Dans ce lot, cet extrait est ${tp3.unquotedAttributeTemplate}. Ce cas mérite une attention spéciale, car l’absence de guillemets agrandit encore la surface d’injection.`,
        },
        {
          prompt: "Quel identifiant de gabarit insère directement une donnée dans un bloc « <script> » classique ?",
          hint: "Ne retiens que l’extrait dans lequel la valeur arrive dans du JavaScript brut au sein d’un bloc script.",
          answerFormat: "Un identifiant de gabarit, par exemple G01",
          accepted: compact([tp3.scriptBlockTemplate]),
          explanation: `Ici, il faut trouver la ligne où une donnée est concaténée dans un bloc script ordinaire. L’identifiant correct est ${tp3.scriptBlockTemplate}. Insérer une valeur dans du JavaScript brut change le contexte d’échappement et demande une défense différente de celle du corps HTML.`,
        },
        {
          prompt: "Dans « swb-tp3-politiques.txt », quelle politique laisse encore passer les scripts en ligne car elle contient « unsafe-inline », y compris si cette permission vient du repli sur « default-src » ?",
          hint: "Cherche « unsafe-inline », puis vérifie si la permission vise bien les scripts, même quand script-src manque.",
          answerFormat: "Un identifiant de politique, par exemple P2",
          accepted: compact([tp3.unsafeInlinePolicy]),
          explanation: `Une politique autorise encore les scripts en ligne parce qu’elle contient « unsafe-inline » sur la directive pertinente, y compris via le repli de « default-src ». Ici, cette politique est ${tp3.unsafeInlinePolicy}. Le test ne consiste pas seulement à lire « script-src » : il faut aussi connaître la règle de repli de CSP.`,
        },
        {
          prompt: "Quelle politique candidate utilise un nonce pour autoriser des scripts en ligne choisis ?",
          hint: "Repère la seule politique qui contient une source de la forme « nonce-... » dans sa directive de scripts.",
          answerFormat: "Un identifiant de politique, par exemple P2",
          accepted: compact([tp3.noncePolicy]),
          explanation: `La politique qui emploie un nonce montre un choix moderne de défense en profondeur pour les scripts en ligne. Dans ce lot, c’est ${tp3.noncePolicy}. Un nonce n’ouvre pas tous les scripts en ligne : il autorise seulement ceux qui portent la bonne valeur générée par le serveur.`,
        },
        {
          prompt: "Quelle politique ne contient ni « object-src » ni « base-uri » ?",
          hint: "Relis les six politiques ligne par ligne et cherche celle qui omet ces deux directives en même temps.",
          answerFormat: "Un identifiant de politique, par exemple P2",
          accepted: compact([tp3.missingObjectAndBasePolicy]),
          explanation: `Certaines directives ne bloquent pas une attaque seules, mais elles ferment des surfaces utiles. La seule politique qui omet en même temps « object-src » et « base-uri » est ${tp3.missingObjectAndBasePolicy}. Il faut donc lire la politique en entier, pas seulement la partie sur les scripts.`,
        },
        {
          prompt: "Dans « swb-tp3-rapports.jsonl », quelle « violated-directive » revient le plus souvent, sans ex æquo ?",
          hint: "Groupe les rapports par valeur exacte de « violated-directive », puis trie les totaux.",
          answerFormat: "Le nom exact d’une directive",
          accepted: compact([tp3.topViolatedDirective]),
          explanation: `Les rapports de violation permettent de mesurer ce que la politique bloque le plus souvent. En regroupant par « violated-directive », un seul maximum ressort : ${tp3.topViolatedDirective}. Cette lecture aide à savoir quelle famille de ressources pose encore le plus de problèmes.`,
        },
        {
          prompt: "Quelle origine bloquée revient le plus souvent dans « swb-tp3-rapports.jsonl », sans ex æquo ?",
          hint: "Lis le champ « blocked-uri », puis compte les origines identiques avant de trier.",
          answerFormat: "Une origine ou une URL d’origine exacte",
          accepted: compact([tp3.topBlockedOrigin]),
          explanation: `Le champ « blocked-uri » montre ce que le navigateur a refusé de charger. En regroupant les valeurs identiques, l’origine la plus fréquente est ${tp3.topBlockedOrigin}. Ce résultat sert ensuite à juger si une politique candidate couvre bien les dépendances encore nécessaires.`,
        },
        {
          prompt: "Dans « swb-tp3-rapports.jsonl », une violation de script en ligne est un rapport dont « blocked-uri » vaut « inline » et dont « violated-directive » commence par « script-src ». Combien de valeurs distinctes de « source-file » apparaissent dans ces violations ?",
          hint: "Garde les rapports qui remplissent les deux conditions (« blocked-uri » égal à « inline » et nom de directive violée qui commence par « script-src », quel que soit le suffixe), puis compte les valeurs distinctes de « source-file ».",
          answerFormat: "Un nombre entier",
          accepted: compact([tp3.distinctInlineSourceFiles]),
          explanation: `Pour répondre, il faut isoler les violations qui concernent des scripts en ligne, puis dédoublonner le champ « source-file ». On obtient ${tp3.distinctInlineSourceFiles} fichier(s) distinct(s). Ce comptage aide à mesurer si le problème est concentré ou réparti sur plusieurs vues de l’application.`,
        },
        {
          prompt: "En appliquant la grille du guide sur « swb-tp3-en-tetes.csv », quel est le total de points cumulés par les dix pages ?",
          hint: "Calcule d’abord le score page par page, puis additionne les dix scores sans oublier HSTS et Permissions-Policy.",
          answerFormat: "Un nombre entier de points",
          accepted: compact([tp3.headerScoreTotal]),
          explanation: `La grille du guide attribue des points pour six familles d’en-têtes. En notant les dix pages une par une puis en additionnant, on atteint ${tp3.headerScoreTotal} point(s). Cette méthode impose une relecture de chaque colonne au lieu de se contenter d’une impression générale.`,
        },
        {
          prompt: "Quelle page est la moins bien notée dans « swb-tp3-en-tetes.csv », sans ex æquo ?",
          hint: "Applique la même grille que pour la question précédente et garde la page au score le plus faible.",
          answerFormat: "Un chemin de page exact",
          accepted: compact([tp3.weakestPage]),
          explanation: `Une fois les scores calculés page par page, une seule page arrive en dernier. La page la moins bien notée est ${tp3.weakestPage}. Identifier ce plus mauvais cas aide à cibler la première correction visible et mesurable.`,
        },
        {
          prompt: "Combien de pages du tableau « swb-tp3-en-tetes.csv » n’ont pas « X-Content-Type-Options: nosniff » ?",
          hint: "Parcours seulement la colonne « x_content_type_options », puis compte les cellules vides ou différentes de « nosniff ».",
          answerFormat: "Un nombre entier",
          accepted: compact([tp3.pagesWithoutNosniff]),
          explanation: `La réponse vient d’un simple comptage dans la colonne « x_content_type_options ». ${tp3.pagesWithoutNosniff} page(s) ne portent pas « nosniff ». Ce type de contrôle rapide est utile, car l’absence d’un en-tête simple peut rester invisible si l’on ne compte pas proprement.`,
        },
        {
          prompt: "Quelle est l’empreinte SHA-256, encodée en Base64, du contenu de « swb-tp3-script-en-ligne.txt » ? Ce fichier contient exactement le texte du script en ligne, retour à la ligne final compris.",
          hint: "Calcule l’empreinte du fichier tel quel, sans rien ajouter ni retirer, puis fournis la valeur Base64 avec ou sans le préfixe « sha256- » attendu par la CSP.",
          answerFormat: "Une empreinte Base64, avec ou sans le préfixe sha256-",
          accepted: compact([tp3.scriptHashBase64, `sha256-${tp3.scriptHashBase64}`]),
          explanation: `Pour une source CSP par empreinte, il faut hacher le script exact en SHA-256 puis encoder le résultat en Base64. La valeur attendue est ${tp3.scriptHashBase64}. L’empreinte doit correspondre octet pour octet au script : un seul caractère de différence, retour à la ligne compris, donne une autre empreinte et le navigateur bloque le script. Une politique qui cite l’empreinte d’une ancienne version du script ne l’autorise donc pas.`,
        },
        {
          prompt: "Le script en ligne de « swb-tp3-script-en-ligne.txt » doit continuer à fonctionner sur la page. Quelle politique de « swb-tp3-politiques.txt » prévoit un moyen précis d’autoriser ce script en ligne sans « unsafe-inline », tout en gardant « object-src », « base-uri » et « frame-ancestors » ? Réponds par une lettre. a) P2 b) P3 c) P4 d) P6",
          hint: "Écarte d’abord la politique qui contient « unsafe-inline », puis cherche celle qui prévoit un moyen précis d’autoriser un script en ligne (le nonce doit alors être repris dans la balise du script), et vérifie enfin qu’elle garde les trois directives demandées.",
          answerFormat: "Une seule lettre",
          accepted: compact([tp3.adoptPolicyLetter]),
          explanation: "La politique de la lettre b rouvre tous les scripts en ligne avec « unsafe-inline ». Les lettres a et d gardent les directives de défense mais n’autorisent aucun script en ligne : la page cesserait de fonctionner. La politique de la lettre c autorise le script par un nonce, sans « unsafe-inline », et garde « object-src », « base-uri » et « frame-ancestors ». La bonne lettre est c.",
        },
        {
          prompt: "Quelle première phase de déploiement est la plus sûre pour une nouvelle CSP sur cette application ? Réponds par une lettre. a) activer tout de suite le blocage sur toutes les pages b) commencer en mode Report-Only puis vérifier les rapports c) supprimer d’abord tous les en-têtes existants d) autoriser temporairement toutes les sources externes",
          hint: "Choisis l’étape qui permet de mesurer les effets réels sans casser l’application au premier essai.",
          answerFormat: "Une seule lettre",
          accepted: compact([tp3.deploySafelyLetter]),
          explanation: "La première étape la plus prudente consiste à observer les effets d’une politique en mode essai avant de bloquer. La bonne lettre est b. Ce choix limite le risque de coupure fonctionnelle tout en donnant des preuves concrètes à corriger.",
        },
      ],
      assets: [
        asset("log", "Extraits de gabarits", "Douze extraits numérotés de gabarits côté serveur avec leur contexte de sortie HTML.", tp3.assetNames.templatesFile),
        asset("log", "Politiques CSP candidates", "Six politiques Content-Security-Policy numérotées de P1 à P6.", tp3.assetNames.policiesFile),
        asset("log", "Rapports de violation CSP", "Rapports JSON lignes collectés en mode essai sur l’application de réservation.", tp3.assetNames.reportsFile),
        asset("log", "Tableau des en-têtes HTTP", "Dix pages et leurs principaux en-têtes de protection, au format CSV séparé par des points-virgules.", tp3.assetNames.headersFile),
        asset("log", "Script en ligne autorisé", "Texte exact d’un script en ligne encore présent, utile pour calculer une source CSP par empreinte.", tp3.assetNames.scriptFile),
        asset("guide", "Guide du TP 3", "Méthode pour juger des contextes de sortie, lire une CSP et noter des en-têtes de protection.", tp3.assetNames.guideFile),
      ],
    },
  ];
}
