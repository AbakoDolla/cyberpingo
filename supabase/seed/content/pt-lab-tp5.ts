import type { PathLab } from "./reseaux-path";

export type PtLabTp5 = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsPtTp5 {
  ptTp5: {
    assetNames: { proxy: string; notes: string; owasp: string; guide: string };
    authRoute: string;
    uploadRoute: string;
    businessWinnerPath: string;
    authPostCount: number;
    confirmedAccessNote: string;
    accessOwasp: string;
    errorOwasp: string;
    horizontalReadCount: number;
    unprovenUploadNote: string;
    maxDocumentBytes: number;
    rejectedManipulationCount: number;
    confirmedSessionNote: string;
    sessionOwasp: string;
    defendableLetter: string;
    confirmedNotesCount: number;
    firstPriorityNote: string;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const asset = (kind: PtLabTp5["assets"][number]["kind"], title: string, description: string, name: string) => ({
  kind,
  title,
  description,
  url: `/labs/${name}`,
});

export function buildPtLabTp5(facts: FactsPtTp5): PtLabTp5[] {
  const tp5 = facts.ptTp5;

  return [{
    slug: "tp-pt-web",
    title: "TP 5 : analyser l’historique d’un test d’application web",
    description: "Tu relis un historique de proxy, des notes de test et un mémo OWASP pour séparer un vrai défaut de contrôle d’accès des pistes réfutées ou incomplètes.",
    difficulty: "intermediaire",
    xp: 150,
    format: "logs",
    minutes: 55,
    requiresComputer: false,
    isAssessment: false,
    briefing: "Le 12 juin 2026, Yao Kouassi exporte l’historique d’un proxy d’interception utilisé sur le portail de la Coopérative Sahel-Vert, avec ses notes de tri. Le fichier du proxy mélange beaucoup d’assets statiques, de réponses 304, de redirections et quelques échanges métier vraiment utiles. Ton rôle est de retrouver les constats défendables, de séparer les preuves des hypothèses et de rattacher les faiblesses au bon code OWASP Top 10:2025. Tous les horodatages du proxy sont en UTC et se terminent par Z. Tu analyses uniquement ces fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
    constraints: [
      "Tu travailles uniquement sur des fichiers fournis et fictifs.",
      "Ne convertis jamais les horodatages UTC du proxy en heure locale avant de comparer.",
      "Un téléversement refusé ou un 403 cohérent ne constitue pas un constat confirmé.",
    ],
    tools: [
      "Visionneuse CyberPingo pour filtrer le JSONL et les notes",
      "Git Bash, WSL ou Termux pour grep, sort, uniq et cut",
      "PowerShell 5.1 avec Get-Content -Encoding UTF8 et ConvertFrom-Json",
    ],
    objectives: [
      "Compter proprement les requêtes utiles dans un historique de proxy bruité",
      "Relire des notes de test en distinguant confirmé, hypothèse et réfuté",
      "Identifier un contrôle d’accès horizontal cassé à partir de preuves minimales",
      "Rattacher un constat au bon code OWASP Top 10:2025 sans connaissance externe",
    ],
    hints: [
      "Pour une route, garde seulement le champ path et ignore la query string.",
      "La différence entre actorAccount et resourceOwner aide à trancher une lecture inter-comptes.",
      "Un 403 ou un 404 cohérent sur un identifiant manipulé compte comme rejet correct, pas comme défaut confirmé.",
      "Le mémo OWASP suffit à distinguer contrôle d’accès, session et simple configuration bavarde.",
    ],
    tasks: [
      {
        prompt: `Dans « ${tp5.assetNames.proxy} », combien de lignes cumulent la méthode POST et le chemin exact « ${tp5.authRoute} » ?`,
        hint: "Filtre d’abord method, puis path, sans te laisser distraire par les requêtes GET d’initialisation de session.",
        answerFormat: "Un entier",
        accepted: compact([tp5.authPostCount]),
        explanation: `La bonne méthode consiste à compter seulement les lignes où method vaut POST et path vaut ${tp5.authRoute}. On ne garde ni les GET préparatoires ni les autres chemins d’authentification. Ce filtre donne ${tp5.authPostCount} appels.`,
      },
      {
        prompt: `Dans « ${tp5.assetNames.proxy} », quelle ressource métier est la plus explorée si tu ne comptes que les lignes dont resourceType vaut dossier, document ou beneficiaire, puis que tu regroupes par path sans la query string ?`,
        hint: "Ignore les assets, les pages d’aide et les redirections, puis cherche le seul maximum parmi les chemins métier.",
        answerFormat: "Un chemin qui commence par /",
        accepted: compact([tp5.businessWinnerPath]),
        explanation: `La question demande de regrouper uniquement les ressources métier utiles, puis de comparer les chemins normalisés. Le maximum unique revient à ${tp5.businessWinnerPath}, ce qui en fait la ressource la plus explorée dans ce jeu de preuves.`,
      },
      {
        prompt: `Dans « ${tp5.assetNames.notes} », quel identifiant Nxx porte le vrai défaut de contrôle d’accès confirmé, appuyé par plusieurs réponses 200 sur des ressources d’un autre compte ?`,
        hint: "Cherche le bloc dont le type parle de contrôle d’accès horizontal et dont le statut est confirmé.",
        answerFormat: "Un identifiant comme N04",
        accepted: compact([tp5.confirmedAccessNote]),
        explanation: `Le bon bloc de notes cumule trois éléments : statut confirmé, type contrôle d’accès horizontal et preuves proxy montrant un succès sur l’objet d’un autre compte. L’identifiant attendu est ${tp5.confirmedAccessNote}.`,
      },
      {
        prompt: "Selon le document « Mémo OWASP Top 10:2025 », quel code OWASP de la forme a0x correspond à ce défaut confirmé de contrôle d’accès ?",
        hint: "Le mémo précise la catégorie qui couvre l’accès à l’objet d’un autre compte, y compris l’IDOR ou la BOLA.",
        answerFormat: "Un code OWASP de la forme a0x, par exemple a09",
        accepted: compact([tp5.accessOwasp]),
        explanation: `Le mémo associe l’accès à l’objet d’un autre utilisateur à Broken Access Control. Le code attendu est donc ${tp5.accessOwasp}, car c’est la catégorie qui couvre un contrôle horizontal cassé déjà prouvé par des réponses 200.`,
      },
      {
        prompt: `Dans « ${tp5.assetNames.proxy} », combien de réponses 200 montrent un compte qui lit la ressource d’un autre, c’est-à-dire une ligne où manipulatedIdentifier vaut true, status vaut 200 et actorAccount diffère de resourceOwner ?`,
        hint: "Croise bien les trois critères de la question avant de compter.",
        answerFormat: "Un entier",
        accepted: compact([tp5.horizontalReadCount]),
        explanation: `On ne compte que les succès inter-comptes déjà prouvés par trois indices simultanés : manipulatedIdentifier à true, status à 200 et différence entre actorAccount et resourceOwner. Ce décompte donne ${tp5.horizontalReadCount} lectures indues.`,
      },
      {
        prompt: `Dans « ${tp5.assetNames.notes} », quelle note reste au statut hypothèse faute de preuve d’acceptation ou de restitution d’un téléversement ?`,
        hint: "Cherche la note dont le type parle de téléversement et relis sa décision finale.",
        answerFormat: "Un identifiant comme N07",
        accepted: compact([tp5.unprovenUploadNote]),
        explanation: `La note attendue rappelle qu’un téléversement refusé ou sans restitution observable ne suffit pas à conclure. L’identifiant conservé au statut hypothèse est ${tp5.unprovenUploadNote}.`,
      },
      {
        prompt: `Dans « ${tp5.assetNames.proxy} », quel est le chemin exact de la route de téléversement testée ?`,
        hint: "Repère les lignes dont resourceType vaut upload et relève le champ path commun.",
        answerFormat: "Un chemin qui commence par /",
        accepted: compact([tp5.uploadRoute]),
        explanation: `Les essais de téléversement partagent tous le même chemin. Le relever directement dans le champ path permet d’éviter toute confusion avec une page de formulaire ou une route de prévisualisation. Le chemin exact est ${tp5.uploadRoute}.`,
      },
      {
        prompt: `Dans « ${tp5.assetNames.proxy} », quelle est la plus grande valeur de responseBytes parmi les réponses 200 dont resourceType vaut document ?`,
        hint: "Reste sur les documents métier réellement renvoyés, puis prends le maximum unique.",
        answerFormat: "Un entier",
        accepted: compact([tp5.maxDocumentBytes]),
        explanation: `Il faut filtrer les réponses documentaires réellement servies, puis comparer leur taille. Le maximum unique vaut ${tp5.maxDocumentBytes} octets, ce qui correspond au document le plus volumineux du dossier.`,
      },
      {
        prompt: "Toujours selon le document « Mémo OWASP Top 10:2025 », quel code OWASP de la forme a0x correspond à une application qui renvoie une erreur bavarde, c’est-à-dire une exception qui affiche des détails internes ?",
        hint: "Cherche, dans les repères du mémo, la catégorie qui parle d’exception bavarde.",
        answerFormat: "Un code OWASP de la forme a0x, par exemple a09",
        accepted: compact([tp5.errorOwasp]),
        explanation: `Le mémo range les exceptions bavardes, c’est-à-dire les erreurs qui exposent des détails internes de l’application, dans Mishandling of Exceptional Conditions. Le code demandé est donc ${tp5.errorOwasp}.`,
      },
      {
        prompt: `Dans « ${tp5.assetNames.proxy} », combien de requêtes portent manipulatedIdentifier à true tout en étant correctement rejetées par un status 403 ou 404 ?`,
        hint: "Compte les essais d’identifiant manipulé qui n’aboutissent pas à un succès.",
        answerFormat: "Un entier",
        accepted: compact([tp5.rejectedManipulationCount]),
        explanation: `Les rejets corrects correspondent ici aux essais sur identifiant manipulé qui reviennent en 403 ou en 404. Ce filtre produit ${tp5.rejectedManipulationCount} rejets cohérents, utiles pour ne pas sur-interpréter le dossier.`,
      },
      {
        prompt: `Dans « ${tp5.assetNames.notes} », quelle note décrit la faiblesse de session confirmée par un identifiant de session non régénéré après la connexion ?`,
        hint: "Cherche la note confirmée dont le type parle explicitement de faiblesse de session.",
        answerFormat: "Un identifiant comme N05",
        accepted: compact([tp5.confirmedSessionNote]),
        explanation: `La note attendue cite plusieurs preuves proxy autour d’une même session et conclut à une rotation absente après login. L’identifiant correct est ${tp5.confirmedSessionNote}.`,
      },
      {
        prompt: "Selon le document « Mémo OWASP Top 10:2025 », quel code OWASP de la forme a0x couvre cette faiblesse de session confirmée ?",
        hint: "Le mémo cite la fixation de session et la rotation absente dans la catégorie d’authentification.",
        answerFormat: "Un code OWASP de la forme a0x, par exemple a09",
        accepted: compact([tp5.sessionOwasp]),
        explanation: `Le mémo rattache la fixation de session et la rotation absente à Authentication Failures. Le code attendu est donc ${tp5.sessionOwasp}.`,
      },
      {
        prompt: "Quelle formulation est la plus défendable pour un constat confirmé non critique ? Réponds par une lettre. a) Le portail est totalement compromis parce qu’il affiche un en-tête technique. b) L’en-tête prouve à lui seul une exfiltration de données. c) Une réponse 200 expose le framework Express dans X-Powered-By ; c’est une information technique à corriger, sans preuve de compromission. d) L’en-tête suffit pour conclure à une faille critique de chiffrement.",
        hint: "Choisis la phrase la plus factuelle, la plus proportionnée et la moins spéculative.",
        answerFormat: "Une lettre parmi a, b, c ou d",
        accepted: compact([tp5.defendableLetter]),
        explanation: "La bonne réponse est la lettre c. Elle décrit précisément la preuve observée, la qualifie comme information technique à corriger et évite d’inventer une compromission non démontrée par le dossier.",
      },
      {
        prompt: `Dans « ${tp5.assetNames.notes} », combien de notes sont au statut confirmé ?`,
        hint: "Relis tous les blocs Nxx et compte seulement ceux dont la ligne Statut vaut confirmé.",
        answerFormat: "Un entier",
        accepted: compact([tp5.confirmedNotesCount]),
        explanation: `Le comptage se fait directement sur les statuts des notes, sans interpréter les priorités. On trouve ${tp5.confirmedNotesCount} notes confirmées dans ce dossier.`,
      },
      {
        prompt: `Dans « ${tp5.assetNames.notes} », quelle note faut-il présenter en premier pour réduire l’exposition de données, en suivant sa justification de décision ?`,
        hint: "Cherche la note dont la décision parle d’une exposition immédiate déjà prouvée.",
        answerFormat: "Un identifiant comme N04",
        accepted: compact([tp5.firstPriorityNote]),
        explanation: `La note à présenter en premier est celle dont la décision souligne une exposition de données déjà démontrée et immédiate. L’identifiant attendu est ${tp5.firstPriorityNote}.`,
      },
    ],
    assets: [
      asset("log", "Historique du proxy", "Journal JSONL des requêtes et réponses du proxy d’interception, avec bruit statique, routes métier et métadonnées de session.", tp5.assetNames.proxy),
      asset("log", "Notes du testeur", "Notes de tri du testeur, au format texte, avec statut, type, preuves et décision de restitution.", tp5.assetNames.notes),
      asset("guide", "Mémo OWASP Top 10:2025", "Document formel qui rappelle les codes a01 à a10 et une description courte de chaque catégorie.", tp5.assetNames.owasp),
      asset("guide", "Guide du TP 5", "Méthode de lecture du proxy, de tri des notes et de rattachement OWASP sur des données inventées.", tp5.assetNames.guide),
    ],
  }];
}
