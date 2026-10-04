import type { PathLab } from "./reseaux-path";

export type SwbLabTp5 = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsTp5 {
  swbTp5: {
    assetNames: {
      apiFile: string;
      rightsFile: string;
      outgoingFile: string;
      guideFile: string;
    };
    ownerViolation200Count: number;
    topCrossOwnerUser: string;
    topCrossOwnerDistinctReservations: number;
    firstEnumeratedReservationId: string;
    lastEnumeratedReservationId: string;
    clientToStaffAdmin200Count: number;
    forbidden200Count: number;
    privateOrLocalEgressCount: number;
    firstInternalUserDestination: string;
    metadata200Count: number;
    metadata200Bytes: number;
    peakTokenRate: number;
    peakTokenMinuteUtc: string;
    bolaFixLetter: string;
    ssrfFixLetter: string;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const minuteAnswers = (value: string) => compact([value, value.replace(/^0/, "")]);
const pairAnswers = (value: string) => compact([value, value.replace(",", ", ")]);
const asset = (kind: SwbLabTp5["assets"][number]["kind"], title: string, description: string, name: string) => ({ kind, title, description, url: `/labs/${name}` });

export function buildSwbLabTp5(facts: FactsTp5): SwbLabTp5[] {
  const tp5 = facts.swbTp5;

  return [
    {
      slug: "tp-web-acces-api",
      title: "TP 5 : contrôle d’accès, API et SSRF dans les journaux",
      description: "Tu relies un journal d’API, une matrice de droits et un journal de sorties réseau pour repérer des lectures d’objets d’un autre compte, des appels de fonctions interdites, un jeton trop bavard et des aperçus qui partent vers l’intérieur du réseau.",
      difficulty: "intermediaire",
      xp: 145,
      format: "logs",
      minutes: 55,
      requiresComputer: false,
      isAssessment: false,
      category: "securite",
      briefing: "Le vendredi 8 mai 2026, l’Hôtel Palmier d’Or vient d’ouvrir son API de réservation à une application mobile. Kader Sow veut vérifier que la passerelle applique bien les droits prévus avant l’audit de la semaine suivante. Il t’envoie le journal JSON de l’API, la matrice des droits et le journal des requêtes sortantes déclenchées par la fonction d’aperçu d’URL. Ton rôle est de comparer ce que la matrice autorise avec ce qui a réellement réussi, puis de repérer si la fonction d’aperçu ouvre la voie à du SSRF. Tout se résout sur les fichiers fournis : tu n’attaques aucun système réel.",
      constraints: [
        "Tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
        "Les horodatages sont déjà en UTC et les réponses attendues se déduisent des fichiers, pas d’une connaissance externe.",
      ],
      tools: [
        "Visionneuse du site",
        "Git Bash, WSL ou Termux pour grep, awk, sort, uniq et wc",
        "PowerShell 5.1 avec Get-Content -Encoding UTF8, Import-Csv, Group-Object et Measure-Object",
      ],
      objectives: [
        "Comparer une requête réelle à la route logique définie dans une matrice de droits",
        "Distinguer un contrôle de propriété absent d’un simple problème d’identifiant prévisible",
        "Mesurer un débit par minute pour repérer un jeton qui martèle l’API",
        "Reconnaître dans un journal sortant les adresses privées, locales et de lien local utiles au SSRF",
      ],
      hints: [
        "Commence par ramener chaque chemin à sa route logique, sinon tu mélangeras les objets et la règle générale.",
        "Quand la matrice dit « propriétaire requis », compare toujours l’utilisateur du jeton au propriétaire de l’objet avant de conclure.",
        "Pour une série séquentielle, trie les identifiants et vérifie d’abord s’ils se suivent sans trou.",
        "Pour le SSRF, lis la destination demandée, pas seulement la route appelante de l’aperçu.",
      ],
      tasks: [
        {
          prompt: "Dans « swb-tp5-api.jsonl », combien de requêtes ont réussi avec le code 200 alors que la matrice de « swb-tp5-droits.csv » exige le propriétaire de l’objet et que l’utilisateur du jeton n’est pas ce propriétaire ?",
          hint: "Applique d’abord la matrice par route logique, puis compare seulement les lignes où « propriétaire requis » vaut oui.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp5.ownerViolation200Count]),
          explanation: `Il faut d’abord ramener chaque chemin à sa route logique, lire la ligne correspondante dans la matrice, puis garder uniquement les succès 200 où la propriété est requise. En comparant ensuite l’utilisateur du jeton au propriétaire de l’objet, on trouve ${tp5.ownerViolation200Count} requête(s) réussie(s) alors qu’elles n’auraient pas dû l’être. Cette méthode isole un vrai défaut de contrôle d’accès objet.`,
        },
        {
          prompt: "Quel utilisateur cumule le plus de succès 200 sur des objets qui ne lui appartiennent pas, parmi les routes où la matrice exige le propriétaire ?",
          hint: "Compte les violations de propriété par utilisateur après avoir appliqué la matrice, puis vérifie qu’il n’y a pas d’ex æquo.",
          answerFormat: "Un identifiant utilisateur",
          accepted: compact([tp5.topCrossOwnerUser]),
          explanation: `Une fois les violations de propriété isolées, il faut les regrouper par utilisateur et comparer les totaux. Le maximum revient à ${tp5.topCrossOwnerUser}, sans égalité. Repérer l’utilisateur qui concentre ces lectures aide à séparer un défaut diffus d’une exploration méthodique d’objets voisins.`,
        },
        {
          prompt: "Pour l’utilisateur trouvé à la question 2, combien d’identifiants de réservation distincts lit-il avec succès dans la série « GET /api/reservations/{id} » qui ne lui appartient pas ?",
          hint: "Reste sur les lectures de réservations de cet utilisateur, garde seulement les succès 200 hors propriété, puis compte les identifiants distincts.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp5.topCrossOwnerDistinctReservations]),
          explanation: `Ici, on ne garde que les lectures de réservation du même utilisateur, toujours sur des objets qui ne lui appartiennent pas. En supprimant les doublons, on obtient ${tp5.topCrossOwnerDistinctReservations} identifiant(s) distinct(s). Ce comptage permet de mesurer l’ampleur de l’énumération et pas seulement son existence.`,
        },
        {
          prompt: "Pour cette même série de réservations lues avec succès hors propriété, quel est le premier identifiant de réservation de la séquence croissante ?",
          hint: "Trie les identifiants de réservation de la série, puis lis la borne basse après avoir vérifié qu’ils se suivent.",
          answerFormat: "Un identifiant numérique",
          accepted: compact([tp5.firstEnumeratedReservationId]),
          explanation: `Après tri des identifiants de réservation lus hors propriété par cet utilisateur, la borne basse de la série séquentielle est ${tp5.firstEnumeratedReservationId}. Lire la première borne d’une énumération aide à reconstituer la fenêtre d’exploration choisie par le client ou son script.`,
        },
        {
          prompt: "Pour cette même série de réservations lues avec succès hors propriété, quel est le dernier identifiant de réservation de la séquence croissante ?",
          hint: "Utilise exactement le même ensemble que pour la question précédente, puis lis cette fois la borne haute.",
          answerFormat: "Un identifiant numérique",
          accepted: compact([tp5.lastEnumeratedReservationId]),
          explanation: `La borne haute de la même série croissante vaut ${tp5.lastEnumeratedReservationId}. Associer première et dernière borne permet ensuite d’estimer l’étendue d’une exploration séquentielle sans deviner un motif invisible dans la matrice.`,
        },
        {
          prompt: "Combien de requêtes avec le rôle « client » atteignent pourtant un code 200 sur des routes réservées au personnel dans « swb-tp5-api.jsonl » selon « swb-tp5-droits.csv » ?",
          hint: "Cherche les lignes où le rôle réel vaut « client », où la matrice n’autorise que le personnel, puis recompte seulement les succès 200.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp5.clientToStaffAdmin200Count]),
          explanation: `Il faut croiser le rôle vu dans le journal avec les rôles autorisés par la matrice. En gardant uniquement les requêtes de rôle « client » qui reçoivent malgré tout un 200 sur une route réservée au personnel, on en trouve ${tp5.clientToStaffAdmin200Count}. Cette lecture révèle un défaut d’autorisation fonctionnelle, pas seulement un défaut sur l’objet.`,
        },
        {
          prompt: "Toutes causes confondues, combien de requêtes interdites par la matrice ont pourtant réussi avec le code 200 dans « swb-tp5-api.jsonl » ?",
          hint: "Additionne les succès 200 interdits par le rôle et ceux interdits par la propriété, mais compte chaque requête une seule fois.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp5.forbidden200Count]),
          explanation: `Pour cette question, il faut réunir deux familles : les routes interdites au rôle courant et les routes où la propriété est requise mais absente. En comptant chaque requête une seule fois, on obtient ${tp5.forbidden200Count} succès 200 contraires à la matrice. C’est une bonne mesure synthétique de l’écart entre la politique écrite et le comportement observé.`,
        },
        {
          prompt: "Dans « swb-tp5-sortant.log », combien de requêtes sortantes visent une adresse privée, locale ou de lien local ?",
          hint: "Repère la destination réelle demandée par l’aperçu, puis applique les plages privées ou locales rappelées dans le guide.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp5.privateOrLocalEgressCount]),
          explanation: `Le journal sortant donne la destination réellement contactée par la fonction d’aperçu. En gardant seulement les adresses privées, locales ou de lien local, on compte ${tp5.privateOrLocalEgressCount} requête(s). Ce filtrage sert à mesurer un risque SSRF sans confondre trafic externe banal et appel vers l’intérieur du réseau.`,
        },
        {
          prompt: "Quel couple correspond à la première destination privée, locale ou de lien local appelée par la fonction d’aperçu dans « swb-tp5-sortant.log » ? Écris la réponse au format utilisateur,hôte, sans espace, avec l’adresse ou le nom d’hôte de la destination (sans schéma ni chemin).",
          hint: "Trie les lignes par heure, trouve la première destination sensible, puis relève ensemble l’identifiant de l’utilisateur à l’origine et l’hôte de cette destination.",
          answerFormat: "Un identifiant utilisateur, une virgule, puis l’adresse ou le nom d’hôte de la destination, sans espace",
          accepted: pairAnswers(tp5.firstInternalUserDestination),
          explanation: `Il faut lire le journal sortant dans l’ordre chronologique, puis s’arrêter sur la première destination qui tombe dans une plage privée, locale ou de lien local. Le couple attendu est ${tp5.firstInternalUserDestination}. Associer utilisateur et destination évite de perdre le contexte d’origine d’un appel SSRF.`,
        },
        {
          prompt: "Combien de requêtes sortantes vers le service de métadonnées « 169.254.169.254 » reçoivent le code 200 dans « swb-tp5-sortant.log » ?",
          hint: "Filtre d’abord sur l’adresse du service de métadonnées, puis garde seulement les réponses 200.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp5.metadata200Count]),
          explanation: `Le service de métadonnées est identifiable directement par son adresse. En gardant uniquement les lignes vers 169.254.169.254 qui reçoivent un 200, on en trouve ${tp5.metadata200Count}. Cette mesure aide à distinguer une tentative bloquée d’un appel effectivement servi.`,
        },
        {
          prompt: "Combien d’octets reviennent au total des réponses 200 du service de métadonnées dans « swb-tp5-sortant.log » ?",
          hint: "Reste sur le même sous-ensemble que pour la question précédente, puis additionne la colonne des octets.",
          answerFormat: "Un nombre entier d’octets",
          accepted: compact([tp5.metadata200Bytes]),
          explanation: `Une fois les réponses 200 du service de métadonnées isolées, il suffit d’additionner les octets renvoyés. Le total vaut ${tp5.metadata200Bytes}. Le volume donne un indice utile sur ce qui a réellement été récupéré, pas seulement sur le fait qu’un accès a réussi.`,
        },
        {
          prompt: "Quel est le débit maximal observé pour un même jeton dans « swb-tp5-api.jsonl », en requêtes par minute ?",
          hint: "Coupe l’horodatage à la minute UTC, groupe par jeton et par minute, puis compare les totaux.",
          answerFormat: "Un nombre entier",
          accepted: compact([tp5.peakTokenRate]),
          explanation: `Pour mesurer un martèlement, on coupe l’horodatage à la minute puis on compte les requêtes de chaque jeton dans chaque minute. Le maximum observé est ${tp5.peakTokenRate} requête(s) par minute. Cette méthode met en évidence un abus de rythme sans avoir besoin d’un seuil externe arbitraire.`,
        },
        {
          prompt: "À quelle minute UTC ce débit maximal est-il atteint ? Réponds au format HH:MM.",
          hint: "Garde exactement le même regroupement que pour la question précédente, puis lis la minute associée au maximum unique.",
          answerFormat: "Une heure UTC au format HH:MM",
          accepted: minuteAnswers(tp5.peakTokenMinuteUtc),
          explanation: `Le pic de débit est atteint à ${tp5.peakTokenMinuteUtc} UTC. Retrouver la minute du maximum permet ensuite de zoomer sur la fenêtre utile et de voir si ce jeton martèle plusieurs routes ou toujours la même.`,
        },
        {
          prompt: "Quelle correction traite correctement l’accès à l’objet d’un autre ? Réponds par une lettre. a) cacher l’identifiant dans le code JavaScript du client b) vérifier côté serveur que l’objet appartient à l’utilisateur avant de répondre c) remplacer les identifiants numériques par des UUID sans autre contrôle d) limiter l’affichage à l’application mobile",
          hint: "La bonne réponse renforce le contrôle d’accès côté serveur sur chaque requête, pas seulement la forme de l’identifiant.",
          answerFormat: "Une seule lettre",
          accepted: compact([tp5.bolaFixLetter]),
          explanation: "La bonne correction consiste à vérifier côté serveur, pour chaque requête, que l’objet demandé appartient bien à l’utilisateur ou qu’un droit explicite l’autorise. Ici, la bonne lettre est b. Changer l’identifiant ou le client ne suffit jamais à remplacer un vrai contrôle d’accès objet.",
        },
        {
          prompt: "Quelle correction traite correctement le SSRF observé dans la fonction d’aperçu ? Réponds par une lettre. a) imposer une liste autorisée de destinations et refuser les adresses privées ou locales après résolution b) encoder l’URL en Base64 avant de l’appeler c) valider l’URL seulement dans le navigateur d) bloquer uniquement le mot « localhost » dans la chaîne",
          hint: "La bonne réponse contrôle la destination réelle côté serveur après résolution, pas seulement l’apparence du texte envoyé.",
          answerFormat: "Une seule lettre",
          accepted: compact([tp5.ssrfFixLetter]),
          explanation: "La bonne correction combine une liste autorisée de destinations, un refus des adresses privées ou locales et une vérification côté serveur après résolution. La bonne lettre est a. Les filtres textuels simples se contournent facilement et ne remplacent pas une vraie politique de sortie.",
        },
      ],
      assets: [
        asset("log", "Journal de la passerelle d’API", "Export JSON lignes des requêtes API avec jeton, utilisateur, rôle, route, propriétaire de l’objet, statut et volume.", tp5.assetNames.apiFile),
        asset("log", "Matrice des droits", "Table CSV qui décrit les routes logiques, les rôles autorisés et l’obligation éventuelle de propriété.", tp5.assetNames.rightsFile),
        asset("log", "Journal des requêtes sortantes", "Journal texte des appels sortants déclenchés par la fonction d’aperçu d’URL, avec destination réelle, statut et octets.", tp5.assetNames.outgoingFile),
        asset("guide", "Guide du TP 5", "Méthode pour comparer la matrice, reconnaître une énumération, mesurer un débit et repérer un SSRF.", tp5.assetNames.guideFile),
      ],
    },
  ];
}
