import type { PathLab } from "./reseaux-path";

export type PtLabTp4 = PathLab & {
  category?: "linux" | "securite" | "reseau";
};

export interface FactsPtTp4 {
  ptTp4: {
    assetNames: {
      scanner: string;
      notes: string;
      advisories: string;
      epss: string;
      assets: string;
      guide: string;
    };
    totalConstats: number;
    falsePositiveId: string;
    insufficientProofId: string;
    topConfirmedHost: string;
    cvssTaskId: string;
    cvssTaskScore: string;
    cvssTaskQualification: string;
    maxConfirmedEpssId: string;
    confirmedKevCount: number;
    topCriticalAsset: { host: string; service: string };
    topCriticalProduct: string;
    fixedVersionProduct: string;
    fixedVersion: string;
    keptVectorCount: number;
    contextPair: string[];
    contextWinner: string;
    priority1Id: string;
    priority1Epss: string;
    falseKevDecisionLetter: string;
    confirmedCount: number;
  };
}

const compact = (values: Array<string | number>) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const scoreAnswers = (value: string) => compact([value, value.replace(".", ","), value.endsWith(".0") ? value.slice(0, -2) : value]);
const epssAnswers = (value: string) => {
  const percent = (Number(value) * 100).toFixed(1);
  return compact([value, value.replace(".", ","), `${percent}%`, `${percent.replace(".", ",")}%`, percent, percent.replace(".", ",")]);
};
const asset = (kind: PtLabTp4["assets"][number]["kind"], title: string, description: string, name: string) => ({ kind, title, description, url: `/labs/${name}` });

export function buildPtLabTp4(facts: FactsPtTp4): PtLabTp4[] {
  const tp4 = facts.ptTp4;

  return [{
    slug: "tp-pt-vulns",
    title: "TP 4 : trier le rapport d’un scanner de vulnérabilités",
    description: "Tu relies un export de scanner, des notes de validation minimale, un tableau EPSS/KEV fictif et une fiche actifs pour distinguer faux positif, preuve insuffisante et priorité défendable.",
    difficulty: "intermediaire",
    xp: 150,
    format: "logs",
    minutes: 55,
    requiresComputer: false,
    isAssessment: false,
    category: "securite",
    briefing: "Le 10 juin 2026, Mariam Diallo te demande de relire un export de scanner transmis par le Cabinet Harmattan pour la Coopérative Sahel-Vert. Le but n’est pas de paniquer devant chaque alerte, mais de trier ce qui est confirmé, ce qui relève d’un faux positif et ce qui manque encore de preuve minimale. Tu disposes d’un export CSV, de notes de validation, d’un tableau EPSS/KEV fictif, d’avis techniques produit et d’une fiche actifs. Toutes les dates et tous les horodatages du dossier sont en UTC. Tu ne touches à aucun système réel : tu analyses uniquement les fichiers fournis.",
    constraints: [
      "Tu analyses uniquement des fichiers fournis et fictifs ; ne teste jamais un service réel sans autorisation écrite.",
      "Les identifiants Vxx n’ont aucune sévérité implicite ; seule la méthode du guide permet de trier le dossier.",
      "Quand la preuve minimale manque, tu dois classer le constat comme non confirmable même si le scanner semblait convaincant.",
      "Le guide donne la formule CVSS 3.1, les seuils de qualification et la règle de priorisation utilisée dans ce dossier.",
    ],
    tools: [
      "Visionneuse du site",
      "Git Bash pour grep, awk, sort et uniq",
      "PowerShell 5.1 avec Get-Content -Encoding UTF8 et Import-Csv -Encoding UTF8",
      "Un tableur si tu préfères compter ou trier les lignes visuellement",
    ],
    objectives: [
      "Distinguer confirmé, faux positif et preuve insuffisante",
      "Recalculer une note CVSS 3.1 sans connaissance cachée",
      "Croiser EPSS, KEV et criticité métier pour justifier une priorité",
      "Retenir une action de remédiation défendable au lieu de suivre aveuglément le scanner",
    ],
    hints: [
      "Commence par lier chaque identifiant Vxx au statut écrit dans les notes de validation.",
      "Le fichier EPSS/KEV ne suffit pas : un constat KEV faux positif doit sortir du classement prioritaire.",
      "La fiche actifs classe le couple hôte + service, pas le seul nom d’hôte.",
      "Pour la note CVSS, relève d’abord le vecteur exact dans le CSV du scanner avant d’ouvrir le guide.",
    ],
    tasks: [
      {
        prompt: `Dans « ${tp4.assetNames.scanner} », combien de constats scanner faut-il compter si tu comptes uniquement les lignes utiles du CSV et pas l’en-tête ?`,
        hint: "Le décompte porte sur les lignes de données du CSV, une ligne utile par constat Vxx.",
        answerFormat: "Un nombre entier",
        accepted: compact([tp4.totalConstats]),
        explanation: `Le bon réflexe est de compter seulement les lignes de données du CSV et d’ignorer l’en-tête. Chaque ligne utile correspond à un identifiant Vxx. On obtient ainsi ${tp4.totalConstats} constats scanner à trier dans ce laboratoire.`,
      },
      {
        prompt: `Quel identifiant de « ${tp4.assetNames.scanner} » devient un faux positif confirmé quand tu croises l’export avec « ${tp4.assetNames.notes} » ?`,
        hint: "Cherche la seule ligne dont le statut est « faux_positif », puis relis la justification de version observée.",
        answerFormat: "Un identifiant au format Vxx, par exemple V03",
        accepted: compact([tp4.falsePositiveId]),
        explanation: `Il faut relire les notes de validation et repérer l’unique ligne classée « faux_positif ». Cette ligne montre que la version réellement observée sort de la plage touchée. L’identifiant attendu est ${tp4.falsePositiveId}, ce qui prouve qu’un scanner peut surclasser une version déjà corrigée.`,
      },
      {
        prompt: `Quel identifiant de « ${tp4.assetNames.notes} » reste non confirmable faute de preuve minimale suffisante ?`,
        hint: "Il n’y en a qu’un seul : cherche le statut « preuve_insuffisante » et relis la raison donnée juste après.",
        answerFormat: "Un identifiant au format Vxx, par exemple V12",
        accepted: compact([tp4.insufficientProofId]),
        explanation: `Le fichier de validation ne retient qu’un seul constat comme non confirmable faute de preuve minimale. On le trouve en cherchant le statut « preuve_insuffisante ». L’identifiant correct est ${tp4.insufficientProofId}, car la signature ne montre ni version exploitable ni comportement assez précis.`,
      },
      {
        prompt: `Quel hôte possède le plus de constats confirmés une fois retirés le faux positif et la preuve insuffisante ? Réponds avec le FQDN exact.`,
        hint: "Filtre d’abord sur le statut « confirme », puis compte par colonne hôte dans le CSV du scanner.",
        answerFormat: "Un FQDN exact",
        accepted: compact([tp4.topConfirmedHost]),
        explanation: `Après retrait du faux positif et de la preuve insuffisante, il faut regrouper les seules lignes confirmées par hôte. Le maximum unique revient à ${tp4.topConfirmedHost}. Cette méthode évite de compter des alertes rejetées ou non confirmables.`,
      },
      {
        prompt: `Calcule la note CVSS 3.1 du constat ${tp4.cvssTaskId} à partir de son vecteur dans « ${tp4.assetNames.scanner} » et de la formule du guide.`,
        hint: "Relève le vecteur exact dans le CSV, applique les poids AV, AC, PR, UI, C, I, A, puis la fonction Roundup du guide.",
        answerFormat: "Une note CVSS avec un chiffre après la virgule, par exemple 6.1",
        accepted: scoreAnswers(tp4.cvssTaskScore),
        explanation: `La note se recalcule entièrement depuis le vecteur du constat ${tp4.cvssTaskId} et la formule CVSS 3.1 donnée par le guide. En appliquant correctement ISS, Impact, Exploitability et Roundup, on obtient ${tp4.cvssTaskScore}. Cette tâche vérifie que tu sais recalculer une note au lieu de recopier un score supposé.`,
      },
      {
        prompt: `Quelle est la qualification de la note CVSS du constat ${tp4.cvssTaskId} selon les seuils du guide ?`,
        hint: "Une fois la note trouvée, compare-la seulement aux bornes de qualification du guide.",
        answerFormat: "Un seul mot en minuscules",
        accepted: compact([tp4.cvssTaskQualification, tp4.cvssTaskQualification.normalize("NFD").replace(/[\u0300-\u036f]/g, "")]),
        explanation: `La qualification se déduit mécaniquement du score CVSS et des seuils du guide. Le score du constat ${tp4.cvssTaskId} tombe dans la tranche ${tp4.cvssTaskQualification}. L’important est de lire la grille et non d’inventer un adjectif de gravité.`,
      },
      {
        prompt: `Quel identifiant confirmé de « ${tp4.assetNames.epss} » a la plus grande valeur EPSS après retrait du faux positif et de la preuve insuffisante ?`,
        hint: "Commence par garder seulement les constats confirmés, puis cherche le plus grand EPSS parmi eux.",
        answerFormat: "Un identifiant au format Vxx",
        accepted: compact([tp4.maxConfirmedEpssId]),
        explanation: `Le plus grand EPSS global n’est pas forcément exploitable si l’alerte est rejetée. Après filtrage sur les seuls constats confirmés, le maximum unique revient à ${tp4.maxConfirmedEpssId}. Cela montre pourquoi il faut croiser EPSS et validation humaine.`,
      },
      {
        prompt: `Combien de constats confirmés de « ${tp4.assetNames.epss} » sont aussi marqués « kev=yes » ?`,
        hint: "Le faux positif KEV ne compte pas : filtre d’abord sur le statut « confirme », puis compte les lignes « kev=yes ».",
        answerFormat: "Un nombre entier",
        accepted: compact([tp4.confirmedKevCount]),
        explanation: `La bonne méthode consiste à éliminer d’abord les constats non confirmés, puis à compter les lignes KEV restantes. On obtient ${tp4.confirmedKevCount} constats confirmés présents dans KEV. Le constat KEV faux positif ne doit pas gonfler ce total.`,
      },
      {
        prompt: `Sur l’actif le plus critique du dossier, quel produit faut-il corriger en premier si tu appliques la règle de priorisation du guide ?`,
        hint: `Repère d’abord dans « ${tp4.assetNames.assets} » l’unique couple hôte + service au rang 5, puis compare seulement les constats confirmés qui pointent vers cet actif.`,
        answerFormat: "Un nom de produit exact",
        accepted: compact([tp4.topCriticalProduct]),
        explanation: `Il faut identifier l’actif le plus critique dans la fiche actifs, puis classer uniquement les constats confirmés qui portent sur ce couple hôte + service. Le produit à traiter en premier est ${tp4.topCriticalProduct}. La décision vient du croisement validation + KEV/EPSS + criticité métier, pas du seul titre du scanner.`,
      },
      {
        prompt: `Dans « ${tp4.assetNames.advisories} », quelle est la version minimale corrigée du produit « ${tp4.fixedVersionProduct} » ?`,
        hint: "Lis la ligne JSONL du produit demandé et relève le champ « version_corrigee ».",
        answerFormat: "Une version sous la forme x.y.z",
        accepted: compact([tp4.fixedVersion]),
        explanation: `Les avis techniques JSONL servent ici de référence produit. En lisant l’entrée consacrée à ${tp4.fixedVersionProduct}, on relève la version minimale corrigée ${tp4.fixedVersion}. Cette vérification apprend à distinguer un produit touché d’un produit réellement remis à niveau.`,
      },
      {
        prompt: `Combien de constats confirmés conservent tel quel le vecteur proposé par le scanner dans « ${tp4.assetNames.notes} » ?`,
        hint: "Compte seulement les lignes « statut=confirme » dont « decision_vecteur=conserve ».",
        answerFormat: "Un nombre entier",
        accepted: compact([tp4.keptVectorCount]),
        explanation: `Le fichier de validation indique explicitement si le vecteur initial est conservé ou ajusté. En ne gardant que les constats confirmés avec « decision_vecteur=conserve », on trouve ${tp4.keptVectorCount}. Cette tâche rappelle qu’un score peut être confirmé sans être accepté aveuglément.`,
      },
      {
        prompt: `Quel identifiant devient prioritaire grâce au contexte métier parmi les deux constats non-KEV de bande EPSS haute qui concernent un cache public, l’un sur le portail principal et l’autre sur le site vitrine ?`,
        hint: "Isole d’abord ces deux constats dans le CSV et le tableau EPSS, puis utilise la fiche actifs pour les départager.",
        answerFormat: "Un identifiant au format Vxx",
        accepted: compact([tp4.contextWinner]),
        explanation: `Une fois KEV écarté et la bande EPSS constatée identique, la règle du guide demande de comparer la criticité de l’actif. Le constat prioritaire devient ${tp4.contextWinner}, car son actif métier passe devant l’autre malgré une valeur EPSS brute légèrement plus basse.`,
      },
      {
        prompt: `Quelle est la valeur EPSS du constat classé priorité 1 quand tu appliques toute la règle du guide au dossier complet ?`,
        hint: "Classe d’abord tous les constats confirmés, puis relève la valeur EPSS de celui qui arrive premier.",
        answerFormat: "Une valeur EPSS au format décimal 0.x ou en pourcentage",
        accepted: epssAnswers(tp4.priority1Epss),
        explanation: `La priorité 1 se déduit du tri complet : validation d’abord, puis KEV, bande EPSS, criticité métier et valeur EPSS brute. Le constat en tête porte une valeur EPSS de ${tp4.priority1Epss}. Répondre juste suppose donc de dérouler toute la règle et pas seulement de lire le plus grand nombre du CSV.`,
      },
      {
        prompt: "Quelle décision est correcte pour un constat présent dans KEV mais documenté comme faux positif ? Réponds par une lettre. a) Le remonter quand même en tête car KEV l’emporte sur tout. b) Le conserver comme confirmé mais le passer en priorité moyenne. c) Le classer faux positif documenté et le sortir du tri prioritaire tant que la preuve de version l’écarte. d) Supprimer toutes les autres lignes du même produit.",
        hint: "KEV renforce une priorité seulement si le constat reste valide après la vérification minimale.",
        answerFormat: "Une seule lettre",
        accepted: compact([tp4.falseKevDecisionLetter]),
        explanation: "La bonne réponse est la lettre c. Un constat présent dans KEV reste une piste importante, mais il sort du classement prioritaire si la validation minimale démontre un faux positif. Le rôle de KEV est d’aider à prioriser des constats valides, pas d’annuler une preuve contraire sur la version observée.",
      },
      {
        prompt: `Combien de constats confirmés restent dans le dossier après retrait du faux positif et de la preuve insuffisante ?`,
        hint: "Le résultat vaut le nombre total du CSV moins les constats classés « faux_positif » et « preuve_insuffisante ».",
        answerFormat: "Un nombre entier",
        accepted: compact([tp4.confirmedCount]),
        explanation: `Le total confirmé se recalcule simplement depuis les statuts du fichier de validation. Après retrait du faux positif et de la preuve insuffisante, il reste ${tp4.confirmedCount} constats confirmés. Ce chiffre sert de base avant tout tri par KEV, EPSS ou criticité métier.`,
      },
    ],
    assets: [
      asset("log", "Export du scanner", "CSV principal du dossier : une ligne par constat Vxx avec hôte, service, produit, preuve et vecteur CVSS proposé.", tp4.assetNames.scanner),
      asset("log", "Notes de validation minimale", "Synthèse textuelle du tri humain : statut, preuve suffisante ou non, décision sur le vecteur et commentaire.", tp4.assetNames.notes),
      asset("log", "Avis techniques produit", "Fichier JSONL avec produit, plage touchée, version corrigée minimale et contexte résumant la famille de constat.", tp4.assetNames.advisories),
      asset("log", "Tableau EPSS et KEV", "CSV de priorisation externe fictive : EPSS distincts, présence ou non dans KEV et fenêtre de trente jours.", tp4.assetNames.epss),
      asset("log", "Fiche actifs", "Liste textuelle des couples hôte + service avec criticité interne et justification métier.", tp4.assetNames.assets),
      asset("guide", "Guide du TP 4", "Méthode pour recalculer CVSS 3.1, classer confirmé ou faux positif et prioriser avec KEV, EPSS et criticité métier.", tp4.assetNames.guide),
    ],
  }];
}
