import type { Lesson, Question, Quiz } from "./types";

interface LearningModule {
  id: string;
  courseId: string;
  order: number;
  title: string;
  minutes: number;
  paragraphs: string[];
  example: string;
  questions: Question[];
}

function question(id: string, prompt: string, options: string[], answer: number, explanation: string): Question {
  return { id, type: "qcm", prompt, options, correctAnswer: options[answer], explanation };
}

const modules: LearningModule[] = [
  {
    id: "web-https", courseId: "c4", order: 1, title: "HTTPS : ce que le cadenas protège vraiment", minutes: 10,
    paragraphs: [
      "HTTPS chiffre les échanges entre ton navigateur et le serveur. Un observateur du réseau ne peut pas lire directement le contenu de cette connexion. Le certificat sert également à vérifier le nom du serveur auquel tu te connectes.",
      "Un site frauduleux peut lui aussi utiliser HTTPS. Le cadenas ne prouve ni l’honnêteté du vendeur, ni l’absence d’arnaque. Vérifie le nom de domaine exact, la provenance du lien et la cohérence de la demande avant de communiquer des informations.",
    ],
    example: "Tu reçois un message qui te demande de te connecter à banque-exemple.test. N’utilise pas ce lien : ouvre toi-même l’application ou l’adresse habituelle de ta banque. Les adresses en .test sont réservées aux exemples.",
    questions: [
      question("https-1", "Que protège principalement HTTPS ?", ["Le contenu de la connexion", "La fiabilité commerciale du site", "Tous les fichiers de ton appareil"], 0, "HTTPS protège le transport des données, pas les intentions de celui qui exploite le site."),
      question("https-2", "Un site avec un cadenas peut-il être frauduleux ?", ["Non, jamais", "Oui", "Seulement sur mobile"], 1, "Les sites frauduleux peuvent obtenir des certificats valides. Le domaine et le contexte restent essentiels."),
    ],
  },
  {
    id: "web-comptes", courseId: "c4", order: 2, title: "Protéger ses comptes avec un gestionnaire et la MFA", minutes: 12,
    paragraphs: [
      "Utilise un mot de passe long et unique pour chaque compte. Un gestionnaire de mots de passe peut générer et enregistrer ces secrets. Protège son coffre avec une phrase de passe unique, longue et difficile à deviner.",
      "La double authentification ajoute une seconde preuve. Les clés de sécurité et les passkeys peuvent résister au phishing ; une application d’authentification reste utile si ces options ne sont pas proposées. Conserve les codes de récupération hors de ton appareil principal.",
    ],
    example: "Plan pratique : sécurise d’abord ta messagerie principale, car elle sert souvent à réinitialiser tes autres comptes. Active la MFA, vérifie les sessions ouvertes et range tes codes de secours.",
    questions: [
      question("comptes-1", "Quelle stratégie limite les conséquences d’une fuite ?", ["Un mot de passe identique partout", "Un mot de passe unique par service", "Changer uniquement la dernière lettre"], 1, "La réutilisation permet à une fuite sur un service de compromettre les autres."),
      question("comptes-2", "Où conserver les codes de récupération ?", ["Dans un endroit sûr distinct de l’appareil principal", "Dans un commentaire public", "Les transmettre à un inconnu du support"], 0, "Ces codes doivent rester secrets et accessibles si ton appareil principal est perdu."),
    ],
  },
  {
    id: "web-phishing", courseId: "c4", order: 3, title: "Déjouer un message de phishing", minutes: 10,
    paragraphs: [
      "Un message de phishing cherche à provoquer une action : saisir un secret, payer, ouvrir une pièce jointe ou valider une connexion. L’urgence, la peur et les offres inattendues sont des leviers fréquents, mais un message très bien écrit peut aussi être frauduleux.",
      "Vérifie la demande par un canal indépendant que tu connais déjà. Ne réponds pas au message pour demander une confirmation. Dans une organisation, utilise la procédure de signalement et préserve le message sans diffuser ses pièces jointes.",
    ],
    example: "« Ton compte sera fermé dans 10 minutes, communique ton code de connexion. » Ne transmets pas de code. Ouvre le service directement et consulte ses notifications officielles.",
    questions: [
      question("phishing-1", "Quel est le meilleur moyen de vérifier une demande suspecte ?", ["Répondre au message", "Utiliser un canal officiel indépendant", "Faire confiance au logo"], 1, "L’auteur du message peut répondre lui-même et copier un logo. Un canal connu limite ce risque."),
      question("phishing-2", "Un code de connexion demandé par un inconnu doit être…", ["Partagé si le ton est poli", "Publié dans le chat", "Gardé secret"], 2, "Un code de connexion est un secret, même s’il n’est valable que quelques secondes."),
    ],
  },
  {
    id: "pentest-cadre", courseId: "c5", order: 1, title: "Autorisation et périmètre d’un audit", minutes: 12,
    paragraphs: [
      "Un test d’intrusion doit reposer sur une autorisation explicite du responsable habilité du système. Le périmètre précise les adresses, applications, comptes, horaires et méthodes autorisés. Un système accessible sur Internet n’est pas automatiquement autorisé à être testé.",
      "Les règles d’engagement prévoient un contact d’urgence, des conditions d’arrêt, la gestion des données et les actions interdites. Demande une clarification écrite dès qu’un doute apparaît. CyberPingo n’autorise pas à tester des systèmes tiers.",
    ],
    example: "Une application est autorisée, mais son prestataire de paiement ne figure pas au périmètre. N’effectue aucun test chez ce prestataire sans une autorisation distincte.",
    questions: [
      question("cadre-1", "Avant tout test, il faut…", ["Une autorisation explicite et un périmètre", "Seulement une connexion Internet", "Un outil payant"], 0, "L’autorisation et le périmètre établissent les limites du travail."),
      question("cadre-2", "Une cible inconnue apparaît pendant l’audit. Que faire ?", ["La tester immédiatement", "Clarifier le périmètre avant toute action", "La publier"], 1, "Ne déduis pas une autorisation à partir d’une découverte technique."),
    ],
  },
  {
    id: "pentest-methode", courseId: "c5", order: 2, title: "Une méthode de test responsable", minutes: 14,
    paragraphs: [
      "Un audit suit des étapes : cadrage, compréhension de l’application, identification des risques, vérifications contrôlées et restitution. L’objectif n’est pas de provoquer un incident, mais d’identifier des améliorations de sécurité reproductibles.",
      "Choisis la preuve la moins intrusive. Note l’heure, les préconditions et le résultat. Arrête-toi si une action menace la disponibilité ou expose des données sensibles hors du périmètre prévu. Travaille dans un laboratoire local pour apprendre les gestes techniques.",
    ],
    example: "Pour documenter une autorisation mal configurée, utilise deux comptes de test fournis par le propriétaire, jamais le compte d’un client réel.",
    questions: [
      question("methode-1", "Quelle preuve est préférable ?", ["La plus destructrice", "La moins intrusive qui démontre le problème", "Une affirmation sans contexte"], 1, "Une preuve contrôlée permet de comprendre le risque sans causer de dommages inutiles."),
      question("methode-2", "Si le service devient instable pendant un test…", ["Poursuivre plus vite", "Arrêter et prévenir le contact prévu", "Effacer les traces"], 1, "La sécurité opérationnelle et les conditions d’arrêt priment."),
    ],
  },
  {
    id: "pentest-rapport", courseId: "c5", order: 3, title: "Rédiger une recommandation utile", minutes: 12,
    paragraphs: [
      "Un résultat d’audit doit expliquer le problème, les éléments affectés, les préconditions, l’impact et une correction concrète. La criticité dépend du contexte métier et de la facilité d’exploitation ; elle ne se résume pas au nom d’un outil.",
      "Le rapport doit être transmis aux destinataires autorisés par un canal adapté. Masque les données personnelles inutiles, limite les secrets dans les captures et définis leur durée de conservation. Un retest vérifie ensuite l’efficacité de la correction.",
    ],
    example: "Titre : « Contrôle d’accès manquant sur une ressource de test ». Recommandation : vérifier côté serveur que l’utilisateur possède les droits nécessaires à chaque requête, puis ajouter des tests de non-régression.",
    questions: [
      question("rapport-1", "Une recommandation utile contient…", ["Seulement le nom d’un scanner", "Une correction concrète et un contexte", "Des données personnelles complètes"], 1, "Le destinataire doit pouvoir comprendre, prioriser et corriger le problème."),
      question("rapport-2", "À quoi sert un retest ?", ["Vérifier la correction", "Publier tous les secrets", "Remplacer l’autorisation"], 0, "Le retest confirme que le problème est corrigé et recherche les régressions liées."),
    ],
  },
  {
    id: "logs-lire", courseId: "c6", order: 1, title: "Lire un événement dans un journal", minutes: 10,
    paragraphs: [
      "Un journal enregistre des événements produits par un système ou une application. Pour interpréter une ligne, repère l’horodatage, la source, l’action, son résultat et les identifiants utiles. Un message d’erreur isolé ne suffit pas à conclure à une attaque.",
      "Vérifie le fuseau horaire, la synchronisation des horloges et le format des champs. Des heures incohérentes rendent les rapprochements difficiles. Les journaux peuvent contenir des données personnelles : n’y enregistre jamais de mot de passe ou de jeton complet.",
    ],
    example: "Événement fictif : 2026-09-01T08:15:00Z source=portail action=connexion utilisateur=test resultat=echec. Le suffixe Z indique UTC. La ligne ne dit pas, à elle seule, pourquoi la connexion a échoué.",
    questions: [
      question("logs-1", "Quel champ aide à ordonner les événements ?", ["La couleur de l’écran", "L’horodatage", "Le fond d’écran"], 1, "L’horodatage donne une référence temporelle, à condition de vérifier le fuseau et l’horloge."),
      question("logs-2", "Un seul échec de connexion prouve-t-il une attaque ?", ["Oui, toujours", "Non, il faut du contexte"], 1, "Une faute de frappe ou un problème technique peuvent aussi produire un échec."),
    ],
  },
  {
    id: "logs-correler", courseId: "c6", order: 2, title: "Relier les événements sans conclure trop vite", minutes: 12,
    paragraphs: [
      "La corrélation rapproche des événements sur une période, une source ou un compte. Plusieurs échecs suivis d’une réussite peuvent justifier une vérification. Compare cette séquence à l’activité habituelle et aux informations d’autres systèmes.",
      "Une adresse IP ne représente pas forcément une seule personne. Un réseau d’entreprise, un VPN ou un opérateur mobile peut partager une adresse entre plusieurs utilisateurs. Formule une hypothèse et cherche des éléments qui pourraient aussi la contredire.",
    ],
    example: "Exercice fictif : 08:15 échec, 08:16 échec, 08:17 réussite, 08:18 changement de MFA. Cette séquence mérite un examen du compte, sans être automatiquement une compromission.",
    questions: [
      question("correlation-1", "Pourquoi consulter plusieurs sources ?", ["Pour confirmer ou nuancer une hypothèse", "Pour ignorer les horaires", "Pour supprimer les événements"], 0, "Le contexte évite de transformer une coïncidence en certitude."),
      question("correlation-2", "Une même adresse IP signifie…", ["Toujours une même personne", "Pas nécessairement une même personne"], 1, "Des infrastructures partagées peuvent utiliser une même adresse publique."),
    ],
  },
  {
    id: "logs-triage", courseId: "c6", order: 3, title: "Qualifier une alerte et documenter la suite", minutes: 12,
    paragraphs: [
      "Le triage consiste à comprendre une alerte, sa fiabilité et son impact potentiel. Identifie le système concerné, sa criticité, l’étendue observée et les éléments manquants. Préserve les traces et suis le processus d’escalade de ton organisation.",
      "Documente les faits séparément des hypothèses. Une action de confinement peut interrompre un service : elle doit suivre les autorisations et procédures prévues. Après traitement, note les enseignements pour améliorer la détection et réduire les faux positifs.",
    ],
    example: "Note de triage : « Fait : cinq échecs puis une réussite sur le compte de test. Hypothèse : tentative de connexion non autorisée. À vérifier : appareil utilisé, contexte utilisateur et changement de MFA. »",
    questions: [
      question("triage-1", "Une note de triage doit distinguer…", ["Faits et hypothèses", "Couleurs et polices", "Les noms des outils seulement"], 0, "Cette distinction aide un autre analyste à reprendre l’enquête sans confondre supposition et preuve."),
      question("triage-2", "Avant un confinement susceptible d’interrompre un service…", ["Suivre la procédure et les autorisations prévues", "Agir sur tous les comptes sans vérifier", "Supprimer les journaux"], 0, "La réponse doit être proportionnée, autorisée et documentée."),
    ],
  },
];

export const expandedLessons: Lesson[] = modules.map((module) => ({
  id: module.id, courseId: module.courseId, order: module.order, title: module.title,
  durationMinutes: module.minutes, xpReward: 50, completed: false, quizId: `quiz-${module.id}`,
  blocks: [...module.paragraphs.map((content) => ({ type: "text" as const, content })), { type: "example", content: module.example }],
}));

export const expandedQuizzes: Quiz[] = modules.map((module) => ({
  id: `quiz-${module.id}`, lessonId: module.id, title: `Quiz — ${module.title}`, xpReward: 60, questions: module.questions,
}));

export const reviewQuizzes: Quiz[] = [
  { id: "review-fundamentaux", lessonId: "l-c1-3", title: "Les bons réflexes fondamentaux", xpReward: 60, questions: [
    question("fond-1", "La confidentialité consiste à…", ["Limiter l’accès aux personnes autorisées", "Rendre toutes les données publiques", "Supprimer toutes les sauvegardes"], 0, "La confidentialité protège l’accès aux informations."),
    question("fond-2", "Une blue team travaille principalement sur…", ["La défense et la détection", "La création de publicités", "La suppression des contrôles"], 0, "Elle protège les systèmes et traite les événements de sécurité."),
  ] },
  { id: "review-linux", lessonId: "l-c3-2", title: "Les permissions Linux", xpReward: 60, questions: [
    question("linux-1", "La permission r permet de…", ["Lire", "Exécuter", "Supprimer tous les comptes"], 0, "r signifie read, donc lecture."),
    question("linux-2", "Pourquoi limiter les permissions ?", ["Appliquer le moindre privilège", "Donner tous les droits à tous", "Cacher les fichiers aux sauvegardes"], 0, "Chaque utilisateur ou processus doit disposer uniquement des droits nécessaires."),
  ] },
];
