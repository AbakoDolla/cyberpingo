import type { PathLab } from "./reseaux-path";

export type SwbLab = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsTp1 {
  swbTp1: {
    assetNames: {
      exchangesFile: string;
      cookiesFile: string;
      certificateFile: string;
      headersFile: string;
      guideFile: string;
    };
    redirectCount: number;
    loginLocation: string;
    clearRequests: number;
    cookieWithoutHttpOnly: string;
    insecureCookieCount: number;
    invalidSameSiteCookie: string;
    sessionCookieMinutes: number;
    certificateDaysLeft: number;
    hostnameMissingSan: string;
    hstsDays: number;
    hstsIncludesSubdomains: boolean;
    pagesWithoutCspCount: number;
    serverVersionPage: string;
    frameHeaderLetter: string;
    sessionStatementLetter: string;
  };
}

const compact = (values: Array<string | number>) =>
  Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));

const asset = (kind: SwbLab["assets"][number]["kind"], title: string, description: string, name: string) => ({
  kind,
  title,
  description,
  url: `/labs/${name}`,
});

export function buildSwbLabTp1(facts: FactsTp1): SwbLab[] {
  const { swbTp1 } = facts;

  return [
    {
      slug: "tp-web-http",
      title: "TP 1 : lire HTTP, cookies et en-têtes de sécurité",
      description: "Tu lis des échanges HTTP, des cookies, des en-têtes de réponse et un certificat pour reconnaître les réglages utiles, repérer les écarts évidents et vérifier ce qui reste exposé.",
      difficulty: "debutant",
      xp: 130,
      format: "logs",
      minutes: 45,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      briefing: "Le lundi 4 mai 2026, Kader Sow a capturé plusieurs échanges de l’application de réservation de l’Hôtel Palmier d’Or avec un client HTTP en mode verbeux. Il a aussi exporté une liste de cookies observés, quelques en-têtes de réponse et un extrait de certificat TLS. Tu joues l’apprenti analyste qui doit lire ces preuves sans outil spécialisé, compter ce qui est correct, noter ce qui manque et vérifier qu’un nom d’hôte est bien couvert par le certificat. Les données sont fictives, mais leur forme imite des sorties réelles. Pour le calcul des jours restants du certificat principal, considère que la date du jour est le 4 mai 2026.",
      constraints: [
        "Tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
        "Les réponses doivent venir des fichiers du labo et du guide, pas d’une supposition sur ce que ferait un vrai navigateur.",
      ],
      tools: [
        "Visionneuse du site",
        "Git Bash, WSL ou Termux pour grep, cut, sort et awk",
        "PowerShell 5.1 si tu travailles sur Windows",
      ],
      objectives: [
        "Lire une requête et une réponse HTTP/1.1 sans perdre le contexte",
        "Juger des attributs d’un cookie et convertir un Max-Age en minutes ou en jours",
        "Comparer les noms d’hôtes vus dans les échanges avec les SAN d’un certificat",
        "Reconnaître les en-têtes de sécurité utiles et ceux qui divulguent trop d’information",
      ],
      hints: [
        "Commence par séparer les fichiers selon leur rôle : échanges, cookies, certificat, en-têtes.",
        "Pour les cookies, lis toujours la ligne entière avant de conclure qu’un attribut manque.",
        "Pour le certificat, compare les SAN au nom d’hôte exact utilisé par la requête, pas au chemin.",
        "Pour un maximum ou un comptage, vérifie qu’il n’y a pas d’égalité avant de répondre.",
      ],
      tasks: [
        {
          prompt: "Dans « swb-tp1-echanges.http », combien de réponses HTTP sont de la famille 3xx ?",
          hint: "Lis la ligne d’état de chaque réponse et compte seulement celles qui commencent par un code 3.",
          answerFormat: "Un nombre entier",
          accepted: compact([swbTp1.redirectCount]),
          explanation: `La famille 3xx regroupe les redirections. En parcourant les lignes d’état du fichier, on trouve ${swbTp1.redirectCount} réponse(s) qui commencent par 3. Cette lecture doit se faire sur la ligne d’état entière, pas seulement sur le champ Location qui n’existe pas dans toutes les réponses.`,
        },
        {
          prompt: "Après la connexion dans « swb-tp1-echanges.http », quel chemin exact la réponse renvoie-t-elle dans l’en-tête « Location » ?",
          hint: "Repère la requête POST de connexion, puis lis l’en-tête « Location » de sa réponse.",
          answerFormat: "Un chemin web exact, commençant par /",
          accepted: compact([swbTp1.loginLocation]),
          explanation: `La redirection utile se lit dans la réponse au POST de connexion. L’en-tête « Location » renvoie ici vers ${swbTp1.loginLocation}. Relever ce chemin est une compétence de base pour suivre une navigation ou documenter un flux d’authentification.`,
        },
        {
          prompt: "Combien de requêtes de « swb-tp1-echanges.http » sont encore envoyées en clair sur HTTP et non sur HTTPS ?",
          hint: "Appuie-toi sur la ligne « URL: » de chaque échange et compte celles qui commencent par « http:// ».",
          answerFormat: "Un nombre entier",
          accepted: compact([swbTp1.clearRequests]),
          explanation: `Le fichier indique l’URL complète de chaque échange. En comptant les lignes qui commencent par « http:// », on obtient ${swbTp1.clearRequests} requête(s) envoyée(s) en clair. Cette mesure sert à voir si des clients ou des ressources passent encore par le port 80 avant redirection.`,
        },
        {
          prompt: "Parmi les cookies de « swb-tp1-cookies.txt » qui n’ont pas l’attribut « HttpOnly », quel nom de cookie a la valeur « Max-Age » la plus grande, sans ex æquo ?",
          hint: "Écarte d’abord les cookies dont la ligne contient « HttpOnly », puis compare les « Max-Age » des cookies restants : ce sont des nombres de secondes.",
          answerFormat: "Un nom de cookie exact, en minuscules",
          accepted: compact([swbTp1.cookieWithoutHttpOnly]),
          explanation: `On garde seulement les lignes de cookie qui ne contiennent pas « HttpOnly », puis on compare leur « Max-Age », exprimé en secondes. Le plus grand est celui de ${swbTp1.cookieWithoutHttpOnly}, sans ex æquo. Cette lecture croisée de deux attributs montre qu’il faut toujours lire la ligne entière d’un cookie avant de conclure.`,
        },
        {
          prompt: "Combien de cookies de « swb-tp1-cookies.txt » n’ont pas l’attribut « Secure » ?",
          hint: "Lis chaque ligne « Set-Cookie » et compte celles qui ne contiennent pas le mot « Secure ».",
          answerFormat: "Un nombre entier",
          accepted: compact([swbTp1.insecureCookieCount]),
          explanation: `L’attribut « Secure » se voit directement dans chaque ligne. En comptant les cookies qui ne l’ont pas, on trouve ${swbTp1.insecureCookieCount}. Ce comptage aide à repérer les valeurs qui pourraient encore être envoyées hors HTTPS si un client retombe sur du HTTP.`,
        },
        {
          prompt: "Quel cookie de « swb-tp1-cookies.txt » est invalide parce qu’il annonce « SameSite=None » sans « Secure » ?",
          hint: "Cherche d’abord « SameSite=None », puis vérifie que la même ligne ne contient pas « Secure ».",
          answerFormat: "Un nom de cookie exact, en minuscules",
          accepted: compact([swbTp1.invalidSameSiteCookie]),
          explanation: `La règle utile est simple : « SameSite=None » exige aussi « Secure ». En relisant les lignes, le seul cookie qui viole cette règle est ${swbTp1.invalidSameSiteCookie}. Il faut bien vérifier les deux attributs sur la même ligne avant de conclure.`,
        },
        {
          prompt: "Quelle est, en minutes, la durée de vie du cookie de session dans « swb-tp1-cookies.txt » ?",
          hint: "Repère le cookie de session, lis son « Max-Age » en secondes puis convertis-le en minutes.",
          answerFormat: "Un nombre entier de minutes",
          accepted: compact([swbTp1.sessionCookieMinutes]),
          explanation: `La durée de vie se lit dans « Max-Age », qui s’exprime en secondes. Pour le cookie de session, la conversion donne ${swbTp1.sessionCookieMinutes} minute(s). Cette opération revient souvent quand on veut juger si une session est courte, moyenne ou trop longue pour son usage.`,
        },
        {
          prompt: "Dans « swb-tp1-certificat.txt », combien de jours restent-ils avant la date « notAfter » du certificat principal si l’on se place au 4 mai 2026 ?",
          hint: "Utilise le bloc du certificat principal seulement, lis « notAfter » puis calcule un nombre entier de jours en UTC.",
          answerFormat: "Un nombre entier de jours",
          accepted: compact([swbTp1.certificateDaysLeft]),
          explanation: `Le calcul se fait entre la date de référence donnée par l’énoncé et la date « notAfter » du certificat principal. L’écart est de ${swbTp1.certificateDaysLeft} jour(s). Cette lecture sert à prioriser un renouvellement avant qu’un certificat n’expire en production.`,
        },
        {
          prompt: "Quel nom d’hôte est utilisé dans « swb-tp1-echanges.http » mais n’apparaît pas dans les SAN du certificat principal de « swb-tp1-certificat.txt » ?",
          hint: "Liste les valeurs du champ « Host » vues dans les échanges, puis compare-les exactement à la liste des SAN du certificat principal.",
          answerFormat: "Un nom d’hôte exact",
          accepted: compact([swbTp1.hostnameMissingSan]),
          explanation: `La bonne méthode consiste à comparer les noms d’hôtes complets des requêtes avec les SAN du certificat principal, sans raccourci. Le nom vu dans les échanges mais absent des SAN est ${swbTp1.hostnameMissingSan}. Ce contrôle permet de repérer un risque d’erreur TLS même si le reste du certificat paraît correct.`,
        },
        {
          prompt: "Dans « swb-tp1-en-tetes.txt », combien de jours représente la valeur « max-age » de l’en-tête HSTS ?",
          hint: "Lis la valeur « max-age » en secondes, puis convertis-la en jours avec un diviseur de 86400.",
          answerFormat: "Un nombre entier de jours",
          accepted: compact([swbTp1.hstsDays]),
          explanation: `L’en-tête HSTS exprime « max-age » en secondes. En le convertissant en jours, on obtient ${swbTp1.hstsDays}. Cette conversion évite de juger une durée de validité uniquement à l’œil sur une grande valeur numérique.`,
        },
        {
          prompt: "Toujours dans « swb-tp1-en-tetes.txt », l’en-tête HSTS inclut-il l’option « includeSubDomains » ? Réponds par « oui » ou « non ».",
          hint: "Reste sur la même ligne HSTS et réponds seulement sur la présence ou l’absence littérale de l’option.",
          answerFormat: "Réponds par oui ou non",
          accepted: compact([swbTp1.hstsIncludesSubdomains ? "oui" : "non"]),
          explanation: `Ici, il ne faut pas interpréter : il suffit de lire la ligne HSTS et de vérifier si « includeSubDomains » y figure. C’est bien le cas, donc la réponse attendue est « oui ». Cette vérification compte, car la présence de cette option change la portée de la politique.`,
        },
        {
          prompt: "Combien de pages de « swb-tp1-en-tetes.txt » n’ont pas d’en-tête « Content-Security-Policy » ?",
          hint: "Considère chaque bloc de page comme une unité, puis compte ceux où aucune ligne ne commence par « Content-Security-Policy: ».",
          answerFormat: "Un nombre entier",
          accepted: compact([swbTp1.pagesWithoutCspCount]),
          explanation: `La question porte sur les pages entières, pas sur le nombre total de lignes d’en-têtes. En comptant les blocs qui ne contiennent aucune ligne « Content-Security-Policy: », on arrive à ${swbTp1.pagesWithoutCspCount}. Cette vue montre rapidement où la politique n’est pas encore appliquée.`,
        },
        {
          prompt: "Quelle page de « swb-tp1-en-tetes.txt » divulgue une version précise dans l’en-tête « Server » ?",
          hint: "Repère la seule ligne « Server » qui contient un slash suivi de chiffres, puis relève la page du même bloc.",
          answerFormat: "Un chemin web exact, commençant par /",
          accepted: compact([swbTp1.serverVersionPage]),
          explanation: `Pour cette recherche, il faut viser la ligne « Server » qui révèle une version et non celles qui se contentent du nom du serveur. La page concernée est ${swbTp1.serverVersionPage}. Repérer ce détail aide à inventorier les fuites d’information techniques sans leur accorder un poids qu’elles n’ont pas seules.`,
        },
        {
          prompt: "Quel en-tête sert le mieux à empêcher l’intégration d’une page dans un cadre ? Réponds par une lettre. a) Referrer-Policy b) X-Content-Type-Options c) X-Frame-Options d) Server",
          hint: "Cherche l’en-tête dont le rôle concerne les cadres et l’intégration de page, pas le type MIME ni le référent.",
          answerFormat: "Une seule lettre",
          accepted: compact([swbTp1.frameHeaderLetter]),
          explanation: "Parmi ces quatre propositions, l’en-tête qui sert à empêcher l’intégration d’une page dans un cadre est X-Frame-Options. La bonne lettre est donc c. Ce mécanisme historique reste facile à reconnaître, même si des politiques plus modernes peuvent compléter ou remplacer ce contrôle.",
        },
        {
          prompt: "Quelle affirmation sur le cookie de session est exacte ? Réponds par une lettre. a) il est stocké sans Max-Age et dépend donc de la fermeture du navigateur b) il porte HttpOnly, Secure et SameSite=Lax c) il utilise SameSite=None sans Secure d) il n’a ni Path ni Max-Age",
          hint: "Relis uniquement la ligne du cookie de session et compare-la mot à mot aux quatre propositions.",
          answerFormat: "Une seule lettre",
          accepted: compact([swbTp1.sessionStatementLetter]),
          explanation: "La bonne réponse vient d’une comparaison littérale entre la ligne du cookie de session et les quatre propositions. La seule affirmation exacte est celle de la lettre b. Cette méthode évite d’inventer un comportement navigateur qui n’est pas écrit dans le fichier.",
        },
      ],
      assets: [
        asset("log", "Échanges HTTP bruts", "Douze échanges requête plus réponse HTTP/1.1, numérotés, avec quelques accès en clair et plusieurs codes utiles.", swbTp1.assetNames.exchangesFile),
        asset("log", "Cookies observés", "Liste de cookies « Set-Cookie » avec des attributs variés, dont une combinaison incorrecte de SameSite et Secure.", swbTp1.assetNames.cookiesFile),
        asset("log", "Extrait de certificat", "Sortie abrégée de style OpenSSL pour trois noms d’hôtes, avec sujet, SAN, dates, protocole et suite.", swbTp1.assetNames.certificateFile),
        asset("log", "En-têtes de réponse", "Dix blocs d’en-têtes de réponse HTTP pour comparer HSTS, CSP, nosniff, Server et d’autres réglages.", swbTp1.assetNames.headersFile),
        asset("guide", "Guide du TP 1", "Méthode pour lire un échange HTTP, juger un cookie, convertir un Max-Age et comparer un SAN.", swbTp1.assetNames.guideFile),
      ],
    },
  ];
}
