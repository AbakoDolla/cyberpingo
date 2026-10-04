// Analyse de logs, programme complet : assemblage des dix modules, des six nouveaux laboratoires, des compétences et des badges.
// Les leçons sont écrites dans logs-programme-a à e, les laboratoires dans logs-labs-a à c. Les réponses attendues des
// laboratoires viennent des faits calculés par scripts/lab-scenarios-logs-a.cjs à c à partir des fichiers
// que les apprenants téléchargent, donc elles ne peuvent pas s’en écarter.
// Lu par scripts/generate-logs-seed.cjs, qui produit supabase/seed/09_logs_programme.sql.
import { modules as modulesA } from "./logs-programme-a";
import { modules as modulesB } from "./logs-programme-b";
import { modules as modulesC } from "./logs-programme-c";
import { modules as modulesD } from "./logs-programme-d";
import { modules as modulesE, references } from "./logs-programme-e";
import { buildLogsLabsA, type FactsA } from "./logs-labs-a";
import { buildLogsLabsB, type FactsB } from "./logs-labs-b";
import { buildLogsLabsC, type FactsC } from "./logs-labs-c";
import type { PathModuleEntry } from "./path-kit";
import type { PathBadge, PathSkill } from "./reseaux-path";

export type LogsFacts = FactsA & FactsB & FactsC;

// Le parcours impose l’ordre des laboratoires, quel que soit l’agent qui les écrit.
const LAB_ORDER = [
  "tp-logs-formats-temps", "tp-logs-windows", "tp-logs-reseau", "tp-logs-correlation", "tp-logs-detection", "projet-soc-pme",
];

export function buildLogsProgramme(facts: LogsFacts) {
  const modules = [...modulesA, ...modulesB, ...modulesC, ...modulesD, ...modulesE].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
  const labs = [...buildLogsLabsA(facts), ...buildLogsLabsB(facts), ...buildLogsLabsC(facts)].sort((left, right) => LAB_ORDER.indexOf(left.slug) - LAB_ORDER.indexOf(right.slug));

  const skills: PathSkill[] = [
    { slug: "formats-horodatage", name: "Formats de journaux et horodatage", description: "Reconnaître le format d’un journal, en extraire les champs et ramener tous les horodatages en UTC avant de les comparer.", lessonKey: "logs-temps", practiceLab: "tp-logs-formats-temps", validationLab: "projet-soc-pme" },
    { slug: "outils-analyse-logs", name: "Outils d’analyse en ligne de commande", description: "Extraire, compter et trier des journaux avec grep, awk, sort, uniq ou PowerShell, de façon reproductible.", lessonKey: "logs-grep-awk", practiceLab: "tp-logs-formats-temps", validationLab: "projet-soc-pme" },
    { slug: "journaux-windows", name: "Journaux Windows et Sysmon", description: "Lire les événements de session, de compte et de processus de Windows et repérer une exécution suspecte.", lessonKey: "logs-windows-sessions", practiceLab: "tp-logs-windows", validationLab: "projet-soc-pme" },
    { slug: "journaux-reseau", name: "Pare-feu, DNS et mandataire", description: "Repérer un balayage de ports, un appel régulier ou un volume sortant anormal dans des journaux réseau.", lessonKey: "logs-dns-proxy", practiceLab: "tp-logs-reseau", validationLab: "projet-soc-pme" },
    { slug: "correlation-sources", name: "Corrélation de plusieurs sources", description: "Relier des journaux par des clés communes et dresser une chronologie en UTC sans conclure trop vite.", lessonKey: "logs-correlation-sources", practiceLab: "tp-logs-correlation", validationLab: "projet-soc-pme" },
    { slug: "regles-detection", name: "Règles de détection et réglage", description: "Écrire une règle à seuil et à fenêtre, mesurer ses vrais et faux positifs, puis la régler.", lessonKey: "logs-detection-regles", practiceLab: "tp-logs-detection", validationLab: "projet-soc-pme" },
    { slug: "triage-alertes", name: "Triage et priorisation des alertes", description: "Qualifier une alerte, la prioriser avec une grille et documenter les faits séparément des hypothèses.", lessonKey: "logs-triage", practiceLab: "tp-logs-detection", validationLab: "projet-soc-pme" },
    { slug: "rapport-investigation", name: "Investigation et rapport", description: "Préserver les preuves, reconstituer un incident et rédiger un rapport que l’on peut défendre.", lessonKey: "logs-rapport-preuves", practiceLab: "investigation-soc", validationLab: "projet-soc-pme" },
  ];

  const badges: PathBadge[] = [
    { slug: "decodeur-de-journaux", name: "Décodeur de journaux", description: "Valider la compétence Formats de journaux et horodatage par le projet final d’analyse.", icon: "terminal", rarity: "rare", xp: 40, position: 420, skill: "formats-horodatage" },
    { slug: "observateur-windows", name: "Observateur Windows", description: "Valider la compétence Journaux Windows et Sysmon par le projet final d’analyse.", icon: "eye", rarity: "rare", xp: 40, position: 430, skill: "journaux-windows" },
    { slug: "chasseur-de-balises", name: "Chasseur de balises", description: "Valider la compétence Pare-feu, DNS et mandataire par le projet final d’analyse.", icon: "target", rarity: "rare", xp: 40, position: 440, skill: "journaux-reseau" },
    { slug: "tisseur-de-chronologie", name: "Tisseur de chronologie", description: "Valider la compétence Corrélation de plusieurs sources par le projet final d’analyse.", icon: "clock", rarity: "rare", xp: 40, position: 450, skill: "correlation-sources" },
    { slug: "ecrivain-de-regles", name: "Écrivain de règles", description: "Valider la compétence Règles de détection et réglage par le projet final d’analyse.", icon: "zap", rarity: "rare", xp: 40, position: 460, skill: "regles-detection" },
    { slug: "plume-de-l-analyste", name: "Plume de l’analyste", description: "Valider la compétence Investigation et rapport par le projet final d’analyse.", icon: "check-circle", rarity: "rare", xp: 40, position: 470, skill: "rapport-investigation" },
    { slug: "analyste-palmier", name: "Analyste du Palmier d’Or", description: "Réussir le projet final : trier une semaine d’alertes de l’Hôtel Palmier d’Or et rédiger le rapport d’analyse.", icon: "trophy", rarity: "epic", xp: 60, position: 480, lab: "projet-soc-pme" },
  ];

  return {
    modules: modules as PathModuleEntry[],
    labs,
    skills,
    badges,
    appendResources: references,
    durationSync: ["analyse-logs"],
    // Labs published by an earlier seed that skills of this programme point to.
    externalLabs: [{ slug: "investigation-soc", isAssessment: true }],
    courseTexts: [
      {
        slug: "analyse-logs",
        fromShort: "Lire les événements, relier les indices et qualifier une alerte sans conclure trop vite.",
        fromDescription: "Lire un journal, corréler des événements et qualifier une alerte sans conclure trop vite : les bases du travail en SOC.",
        short: "Des journaux Linux, Windows, web et réseau à l’investigation : lire, dater, relier, détecter, qualifier une alerte et rédiger un rapport, avec des outils gratuits.",
        description: "Ce parcours t’apprend à lire des journaux de toute origine, à les relier entre eux, à écrire des détections simples, à qualifier une alerte et à conduire une investigation jusqu’au rapport, comme le fait un analyste dans un centre des opérations de sécurité (SOC), mais avec des outils gratuits et des fichiers que tu peux ouvrir sur un ordinateur modeste. Dix modules progressifs couvrent la lecture des journaux et le temps, les journaux Linux et serveurs, les journaux Windows, les journaux web et applicatifs, le réseau, le pare-feu, le DNS et le mandataire, les outils d’analyse, la corrélation et la détection, la qualification d’une alerte, la centralisation et la conservation des journaux, et l’investigation d’un incident.\n\nChaque leçon propose un cours détaillé, des extraits de journaux commentés, des exemples corrigés et un quiz avec correction. Cinq travaux pratiques guidés, trois laboratoires déjà publiés (force brute SSH, intrusion web, investigation SOC) et un projet final te font manipuler de vrais formats de journaux sur des exports réalistes : syslog, événements Windows, accès web, pare-feu, DNS et mandataire, avec des critères de réussite vérifiés par la plateforme.\n\nCompétences visées : identifier un format et ramener les horodatages en UTC, extraire et compter avec grep, awk, sort, uniq ou PowerShell, lire les sessions et les processus Windows, repérer un balayage ou un appel régulier dans les journaux réseau, relier plusieurs sources en une chronologie, régler une règle de détection, trier et prioriser des alertes, puis rédiger un rapport défendable.\n\nAucun prérequis autre que la curiosité : un ordinateur Windows avec PowerShell ou Git Bash, ou un téléphone avec Termux, suffit pour rejouer les commandes, et les travaux pratiques se font à partir de fichiers fournis, sans serveur ni SIEM. Les vidéos sont en préparation : chaque leçon indique clairement quand la sienne n’est pas encore disponible, et le cours écrit couvre déjà l’essentiel.",
      },
    ],
  };
}
