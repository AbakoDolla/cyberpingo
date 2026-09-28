export interface Article {
  slug: string;
  title: string;
  category: string;
  minutes: number;
  description: string;
  sections: { title: string; text: string; checklist?: string[] }[];
  courseSlug: string;
  source: { label: string; url: string };
}

export const articles: Article[] = [
  {
    slug: "securiser-ses-comptes", title: "Tes comptes méritent mieux qu’un seul mot de passe",
    category: "Vie numérique", minutes: 5, courseSlug: "securite-web",
    description: "Une méthode concrète pour protéger ta messagerie, tes réseaux sociaux et leurs moyens de récupération.",
    sections: [
      { title: "Commence par ta messagerie", text: "Ton adresse e-mail permet souvent de réinitialiser tous tes autres comptes. Protège-la en premier : utilise un mot de passe long et unique, conservé dans un gestionnaire, puis vérifie les sessions ouvertes et les options de récupération." },
      { title: "Ajoute une deuxième preuve", text: "Active l’authentification multifacteur. Une clé de sécurité ou une passkey résiste mieux au phishing qu’un code à recopier. Si ces options ne sont pas disponibles, une application d’authentification reste utile. Ne communique jamais un code reçu à une personne qui te contacte.", checklist: ["Activer le MFA sur la messagerie principale.", "Conserver les codes de secours hors du téléphone.", "Supprimer les appareils et applications que tu ne reconnais pas."] },
      { title: "Prépare la récupération", text: "Vérifie que l’adresse et le numéro de récupération t’appartiennent encore. Garde une copie des codes de secours dans un endroit protégé. Si un compte est compromis, change son mot de passe depuis un appareil fiable, révoque les sessions et préviens les contacts concernés." },
    ],
    source: { label: "ANSSI — recommandations de sécurité", url: "https://cyber.gouv.fr/bonnes-pratiques-protegez-vous" },
  },
  {
    slug: "reperer-phishing", title: "Un message urgent ? Prends trente secondes",
    category: "Prévention", minutes: 4, courseSlug: "securite-web",
    description: "Les vérifications à faire avant d’ouvrir un lien, de payer une facture ou de transmettre un document.",
    sections: [
      { title: "L’urgence n’est pas une preuve", text: "Un message qui annonce la fermeture d’un compte ou exige un paiement immédiat cherche parfois à te faire agir sans réfléchir. Le nom affiché et le logo d’une entreprise sont faciles à copier. Même une conversation connue peut provenir d’un compte compromis." },
      { title: "Vérifie par un autre chemin", text: "Ouvre le service avec ton favori ou son application officielle, sans utiliser le lien du message. Pour une facture inhabituelle, appelle le contact avec un numéro déjà connu. Le cadenas HTTPS chiffre la connexion ; il ne garantit pas que l’organisation est honnête.", checklist: ["Comparer le domaine exact, pas seulement le nom affiché.", "Refuser les demandes de mots de passe ou codes MFA.", "Confirmer tout changement de coordonnées bancaires par un canal indépendant."] },
      { title: "Si tu as déjà cliqué", text: "Un clic ne signifie pas automatiquement une compromission. Note ce que tu as fait. Si tu as saisi un mot de passe, change-le depuis le site officiel et ferme les sessions actives. Si tu as exécuté un fichier, contacte le support de ton organisation et conserve le message pour l’analyse." },
    ],
    source: { label: "Cybermalveillance.gouv.fr — assistance et prévention", url: "https://www.cybermalveillance.gouv.fr/" },
  },
  {
    slug: "premiers-logs", title: "Lire un journal sans tirer de conclusion trop vite",
    category: "Technique", minutes: 6, courseSlug: "analyse-logs",
    description: "Transformer quelques événements en une chronologie utile, en séparant faits et hypothèses.",
    sections: [
      { title: "Comprends la source", text: "Un journal d’application, un pare-feu et un serveur d’authentification ne décrivent pas la même chose. Identifie le système qui produit l’événement, son fuseau horaire et la signification des champs. L’absence d’un événement ne prouve rien si la collecte est incomplète." },
      { title: "Construis une chronologie", text: "Relève l’heure, l’acteur, l’action, la cible et le résultat. Plusieurs échecs de connexion suivis d’un succès peuvent justifier une investigation, mais aussi correspondre à un utilisateur qui a oublié son mot de passe. Compare les appareils, les habitudes et les événements d’autres sources.", checklist: ["Normaliser les heures et noter le fuseau.", "Conserver les journaux originaux, travailler sur une copie.", "Documenter les éléments manquants et le degré d’incertitude."] },
      { title: "Rends ton analyse exploitable", text: "Résume les faits observés, leur impact possible et la prochaine vérification recommandée. Masque les données personnelles inutiles avant de partager un extrait. N’attribue pas une attaque à quelqu’un sur la seule base d’une adresse IP." },
    ],
    source: { label: "OWASP — Logging Cheat Sheet", url: "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html" },
  },
  {
    slug: "laboratoire-ethique", title: "Ton premier labo : apprendre sans toucher aux autres",
    category: "Méthode", minutes: 5, courseSlug: "pentest-intro",
    description: "Définir un périmètre autorisé, isoler son environnement et garder des notes réutilisables.",
    sections: [
      { title: "L’autorisation vient avant l’outil", text: "Un site accessible publiquement n’est pas une invitation à le tester. Travaille uniquement sur tes propres systèmes ou dans un environnement pour lequel tu disposes d’une autorisation explicite. Un programme de bug bounty n’autorise que son périmètre et ses méthodes annoncées." },
      { title: "Isole et prépare", text: "Utilise une machine virtuelle de test, un réseau isolé et des données synthétiques. Prends un instantané avant les manipulations. N’utilise pas de mots de passe personnels, de documents professionnels ou de services exposés sur Internet.", checklist: ["Écrire les cibles et les actions autorisées.", "Définir les conditions d’arrêt et la restauration.", "Noter les versions, observations et limites du test."] },
      { title: "Explique plutôt que collectionner", text: "Un bon compte rendu décrit ce qui a été observé, pourquoi cela importe et comment réduire le risque. Garde uniquement la preuve minimale nécessaire, sans extraire de données supplémentaires. Les défis CyberPingo sont des simulations pédagogiques, pas un terminal connecté à une cible réelle." },
    ],
    source: { label: "OWASP — Web Security Testing Guide", url: "https://owasp.org/www-project-web-security-testing-guide/" },
  },
  {
    slug: "sauvegardes-utiles", title: "Une sauvegarde n’existe vraiment que si tu peux la restaurer",
    category: "Prévention", minutes: 4, courseSlug: "fondamentaux",
    description: "Choisir quoi sauvegarder, séparer les copies et tester la récupération avant l’incident.",
    sections: [
      { title: "Identifie ce qui compte", text: "Commence par les fichiers irremplaçables : documents, photos et informations nécessaires à tes activités. La synchronisation seule n’est pas toujours une sauvegarde : une suppression ou un chiffrement malveillant peut aussi être synchronisé." },
      { title: "Sépare les copies", text: "Conserve plusieurs copies sur des supports distincts, dont une séparée de l’appareil habituel. Protège les sauvegardes sensibles par chiffrement et conserve la clé de récupération en sécurité. Un disque toujours branché peut être affecté par le même incident que ton ordinateur." },
      { title: "Teste avec un petit fichier", text: "Restaure régulièrement un document dans un dossier temporaire et vérifie son contenu. Note la date du test et les étapes nécessaires. CyberPingo propose un export JSON des progrès locaux dans les paramètres : il s’agit d’une copie lisible, sans synchronisation ni réimport automatique.", checklist: ["Planifier une fréquence adaptée aux changements.", "Vérifier l’espace disponible et les erreurs.", "Documenter une restauration que tu sais réellement refaire."] },
    ],
    source: { label: "ANSSI — bonnes pratiques", url: "https://cyber.gouv.fr/bonnes-pratiques-protegez-vous" },
  },
];

export const informationPages: Record<string, {
  title: string; introduction: string;
  sections: { title: string; text: string; href?: string; link?: string }[];
}> = {
  fonctionnalites: {
    title: "Comprendre. Essayer. Progresser.",
    introduction: "Un espace d’apprentissage en français qui transforme les notions de sécurité en décisions concrètes, à ton rythme.",
    sections: [
      { title: "Des parcours qui ont un fil conducteur", text: "Pars des fondamentaux, explore les réseaux et Linux, puis apprends à protéger le web, lire les logs et cadrer un test autorisé. Le programme détaillé reste consultable avant de créer un profil.", href: "/parcours", link: "Explorer les programmes" },
      { title: "Des quiz avec une explication", text: "Chaque réponse est expliquée. Tu peux recommencer sans limite pour comprendre tes erreurs. Les XP d’un quiz ne sont attribués qu’à la première tentative et aux améliorations de ton meilleur score : répéter la même note ne rapporte rien de plus." },
      { title: "Des défis, pas de vraies cibles", text: "Les exercices proposent des indices, des traces et une réponse à retrouver. Tout se passe dans une simulation pédagogique : aucune commande n’est exécutée sur un serveur distant.", href: "/challenges", link: "Essayer les défis" },
      { title: "Un suivi personnel", text: "Leçons terminées, meilleurs scores et badges se retrouvent dans ta progression. Le profil et l’objectif quotidien sont modifiables. Les données restent dans ce navigateur ; il n’y a pas encore de synchronisation entre appareils.", href: "/progression", link: "Voir ma progression" },
      { title: "Un mentor optionnel", text: "L’interface du mentor est disponible. Ses réponses nécessitent une clé Gemini configurée côté serveur. N’y saisis ni secret, ni donnée personnelle, ni information professionnelle confidentielle. Les réponses générées doivent toujours être vérifiées.", href: "/mentor", link: "Ouvrir le mentor" },
    ],
  },
  "a-propos": {
    title: "La cybersécurité commence par un réflexe.",
    introduction: "CyberPingo veut rendre les premiers pas plus accessibles, en Afrique et partout dans le monde. Pas besoin de tout savoir pour commencer à mieux se protéger.",
    sections: [
      { title: "Apprendre avec des situations compréhensibles", text: "Un e-mail suspect, une permission trop large, une connexion inhabituelle : nous partons de situations concrètes avant d’introduire le vocabulaire. Les exemples relient chaque concept à une décision et à ses conséquences." },
      { title: "Pratiquer avec responsabilité", text: "Savoir faire implique de savoir où s’arrêter. L’autorisation, la protection des données et la restitution des résultats font partie des parcours au même titre que les outils." },
      { title: "Un projet en construction, sans promesses cachées", text: "Cette version est un prototype fonctionnel. Les contenus intégrés et la progression locale sont utilisables. L’authentification est simulée ; les comptes cloud, le forum et les certificats accrédités ne sont pas disponibles. N’utilise pas de mot de passe réel.", href: "/fonctionnalites", link: "Voir ce qui est disponible" },
    ],
  },
  communaute: {
    title: "Apprendre ensemble, avec respect.",
    introduction: "La communauté commence par des questions claires, des retours utiles et une pratique responsable. L’espace de discussion intégré n’est pas encore ouvert.",
    sections: [
      { title: "Contribue dès maintenant", text: "Une explication manque de clarté ? Un lien est cassé ? Décris la page, le résultat attendu et ce que tu observes. Les retours publics peuvent être déposés sur le dépôt du projet ; un compte GitHub est nécessaire.", href: "https://github.com/AbakoDolla/cyberpingo/issues", link: "Consulter les retours sur GitHub" },
      { title: "Notre cadre d’échange", text: "Respecte les personnes, explique tes hypothèses et cite tes sources. Ne partage aucun identifiant, journal contenant des données personnelles ou accès à un système. Aucun harcèlement, vente d’accès ou test sans autorisation n’a sa place ici." },
      { title: "Partager ce que tu comprends", text: "Après une leçon, essaie de résumer le concept en trois phrases, avec un exemple et une limite. Compare ton explication au guide associé. L’objectif n’est pas d’avoir la réponse le plus vite possible, mais de pouvoir l’expliquer.", href: "/ressources", link: "Choisir un guide à partager" },
    ],
  },
  confidentialite: {
    title: "Tes données dans cette version.",
    introduction: "Cette notice décrit le fonctionnement du prototype, pas une promesse de service cloud.",
    sections: [
      { title: "Profil et progression locale", text: "Le nom, l’adresse de démonstration, les préférences, les leçons, scores et XP sont enregistrés dans le localStorage de ce navigateur. Chaque profil local possède sa sauvegarde. La suppression des données du navigateur les efface. Un export JSON est disponible dans les paramètres." },
      { title: "Cookies et animation", text: "Des cookies de démonstration indiquent l’état connecté et le rôle, pour une durée maximale de trente jours. Ils ne constituent pas une authentification sécurisée. Le sessionStorage retient si l’animation de démarrage a déjà été affichée dans l’onglet." },
      { title: "Services externes optionnels", text: "Si le mentor est configuré, les messages saisis sont transmis au fournisseur Gemini par le serveur. Les liens vers GitHub et les sites de documentation relèvent de leurs propres politiques. Le formulaire de contact prépare uniquement un fichier local et ne transmet pas ton message." },
      { title: "Contrôle et limites", text: "Tu peux modifier ton profil, exporter ou réinitialiser tes progrès dans les paramètres. Pour supprimer toutes les données locales, efface les données de ce site dans le navigateur. Sur un appareil partagé, déconnecte-toi ; la déconnexion ne supprime pas les profils locaux. N’y stocke aucune donnée sensible.", href: "/parametres", link: "Gérer mes données locales" },
    ],
  },
  conditions: {
    title: "Un cadre clair pour apprendre.",
    introduction: "CyberPingo est ici proposé comme prototype pédagogique, sans garantie de disponibilité ni certification professionnelle.",
    sections: [
      { title: "Usage pédagogique uniquement", text: "Les cours, quiz et exercices servent à comprendre les bonnes pratiques. Ils ne remplacent ni un audit, ni un conseil juridique, ni l’intervention d’une équipe de réponse à incident." },
      { title: "Autorisation et responsabilité", text: "N’applique aucune technique sur un système tiers sans autorisation explicite. Respecte le périmètre convenu, les règles de l’organisation et les lois applicables. Les exemples de la plateforme ne donnent aucune autorisation de tester un service réel." },
      { title: "Compte de démonstration et données", text: "La connexion simule un compte ; ce n’est pas un mécanisme d’identité de production. N’utilise pas tes vrais identifiants. Les progrès sont locaux, peuvent être perdus et ne valent pas diplôme. Les badges représentent uniquement une progression pédagogique." },
      { title: "Contenu et signalements", text: "Les contenus évoluent et peuvent comporter des erreurs. Signale un problème avec le contexte nécessaire, sans publier d’information confidentielle. Les illustrations fournies pour ce projet restent soumises aux droits de leurs titulaires.", href: "/contact", link: "Préparer un retour" },
    ],
  },
};
