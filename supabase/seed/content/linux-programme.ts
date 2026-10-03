// Administration Linux, programme complet : assemblage des neuf modules, des huit laboratoires, des compétences et des badges.
// Les leçons sont écrites dans linux-programme-a à d, les laboratoires dans linux-labs-a à c. Les réponses attendues des
// laboratoires viennent des faits calculés par scripts/lab-scenarios-linux-a.cjs à c à partir des fichiers
// que les apprenants téléchargent, donc elles ne peuvent pas s’en écarter.
// Lu par scripts/generate-linux-seed.cjs, qui produit supabase/seed/08_linux_programme.sql.
import { modules as modulesA } from "./linux-programme-a";
import { modules as modulesB } from "./linux-programme-b";
import { modules as modulesC } from "./linux-programme-c";
import { modules as modulesD, references } from "./linux-programme-d";
import { buildLabsA, type FactsA } from "./linux-labs-a";
import { buildLabsB, type FactsB } from "./linux-labs-b";
import { buildLabsC, type FactsC } from "./linux-labs-c";
import type { PathModuleEntry } from "./path-kit";
import type { PathBadge, PathSkill } from "./reseaux-path";

export type LinuxFacts = FactsA & FactsB & FactsC;

// Le parcours impose l’ordre des laboratoires, quel que soit l’agent qui les écrit.
const LAB_ORDER = [
  "tp-linux-arborescence", "tp-linux-comptes-droits", "tp-linux-processus-services", "tp-linux-reseau-ssh",
  "tp-linux-maj-sauvegardes", "tp-linux-scripts", "incident-serveur-linux", "projet-audit-linux",
];

export function buildLinuxProgramme(facts: LinuxFacts) {
  const modules = [...modulesA, ...modulesB, ...modulesC, ...modulesD].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
  const labs = [...buildLabsA(facts), ...buildLabsB(facts), ...buildLabsC(facts)].sort((left, right) => LAB_ORDER.indexOf(left.slug) - LAB_ORDER.indexOf(right.slug));

  const skills: PathSkill[] = [
    { slug: "ligne-de-commande", name: "Ligne de commande et traitement du texte", description: "Se déplacer dans l’arborescence, manipuler des fichiers, enchaîner des commandes et filtrer du texte avec grep, sort, uniq et awk.", lessonKey: "linux-pipes", practiceLab: "tp-linux-arborescence", validationLab: "incident-serveur-linux" },
    { slug: "droits-et-comptes", name: "Droits, comptes et sudo", description: "Lire des permissions, repérer les comptes et les règles sudo à risque et corriger les droits trop larges.", lessonKey: "linux-utilisateurs", practiceLab: "tp-linux-comptes-droits", validationLab: "projet-audit-linux" },
    { slug: "processus-services", name: "Processus, services et tâches planifiées", description: "Lire les processus, les services systemd, les ports à l’écoute et les tâches cron, et repérer ce qui est anormal.", lessonKey: "linux-systemd", practiceLab: "tp-linux-processus-services", validationLab: "incident-serveur-linux" },
    { slug: "logiciels-correctifs", name: "Logiciels et correctifs", description: "Gérer les paquets, juger les mises à jour en attente et comprendre la fenêtre d’exposition d’un correctif.", lessonKey: "linux-mises-a-jour", practiceLab: "tp-linux-maj-sauvegardes", validationLab: "projet-audit-linux" },
    { slug: "reseau-ssh-pare-feu", name: "Réseau, SSH et pare-feu", description: "Lire une configuration réseau, durcir SSH, appliquer la règle de la première valeur et juger des règles de pare-feu.", lessonKey: "linux-ssh", practiceLab: "tp-linux-reseau-ssh", validationLab: "incident-serveur-linux" },
    { slug: "sauvegarde-chiffrement-linux", name: "Stockage, sauvegardes et chiffrement", description: "Lire l’occupation des disques et le fstab, juger une politique de sauvegarde et chiffrer ou vérifier des fichiers.", lessonKey: "linux-sauvegardes", practiceLab: "tp-linux-maj-sauvegardes", validationLab: "projet-audit-linux" },
    { slug: "scripts-shell", name: "Scripts shell fiables", description: "Prédire la sortie d’un script, repérer les variables non protégées et les entrées non validées, et corriger.", lessonKey: "linux-scripts-robustes", practiceLab: "tp-linux-scripts", validationLab: "projet-audit-linux" },
    { slug: "durcissement-linux", name: "Durcissement et audit d’un serveur Linux", description: "Appliquer une checklist de durcissement, noter un serveur avec une grille, prioriser les actions et rédiger un rapport.", lessonKey: "linux-durcissement", practiceLab: "audit-linux-droits", validationLab: "projet-audit-linux" },
  ];

  const badges: PathBadge[] = [
    { slug: "maitre-du-terminal", name: "Maître du terminal", description: "Valider la compétence Ligne de commande et traitement du texte par l’incident du serveur web compromis.", icon: "terminal", rarity: "rare", xp: 40, position: 350, skill: "ligne-de-commande" },
    { slug: "gardien-des-droits", name: "Gardien des droits", description: "Valider la compétence Droits, comptes et sudo par le projet final d’audit Linux.", icon: "lock", rarity: "rare", xp: 40, position: 360, skill: "droits-et-comptes" },
    { slug: "chasseur-de-processus", name: "Chasseur de processus", description: "Valider la compétence Processus, services et tâches planifiées par l’incident du serveur web compromis.", icon: "eye", rarity: "rare", xp: 40, position: 370, skill: "processus-services" },
    { slug: "forteresse-ssh", name: "Forteresse SSH", description: "Valider la compétence Réseau, SSH et pare-feu par l’incident du serveur web compromis.", icon: "shield", rarity: "rare", xp: 40, position: 380, skill: "reseau-ssh-pare-feu" },
    { slug: "alchimiste-du-shell", name: "Alchimiste du shell", description: "Valider la compétence Scripts shell fiables par le projet final d’audit Linux.", icon: "zap", rarity: "rare", xp: 40, position: 390, skill: "scripts-shell" },
    { slug: "urgentiste-linux", name: "Urgentiste Linux", description: "Réussir l’incident : reconstituer l’intrusion sur un serveur web Linux compromis.", icon: "flame", rarity: "epic", xp: 60, position: 400, lab: "incident-serveur-linux" },
    { slug: "auditeur-alize", name: "Auditeur Alizé", description: "Réussir le projet final : auditer un serveur Linux de la Mutuelle Alizé et rédiger le rapport.", icon: "trophy", rarity: "epic", xp: 60, position: 410, lab: "projet-audit-linux" },
  ];

  return {
    modules: modules as PathModuleEntry[],
    labs,
    skills,
    badges,
    appendResources: references,
    durationSync: ["linux"],
    // Labs published by an earlier seed that skills of this programme point to.
    externalLabs: [{ slug: "audit-linux-droits" }, { slug: "investigation-soc", isAssessment: true }],
    courseTexts: [
      {
        slug: "linux",
        fromShort: "Le terminal, les permissions et les commandes essentielles.",
        fromDescription: "Le terminal, l’arborescence et les permissions : les gestes Linux qu’utilise chaque jour un analyste ou un administrateur.",
        short: "Du terminal aux scripts, en passant par les droits, les services, SSH, les sauvegardes et le durcissement : le parcours pour administrer, surveiller et auditer un serveur Linux.",
        description: "Ce parcours t’apprend à utiliser et à administrer un système Linux avec un regard de défenseur : te repérer dans le terminal, manipuler les fichiers et le texte, gérer les droits et les comptes, surveiller les processus et les services, mettre à jour, sécuriser l’accès à distance, sauvegarder, chiffrer, automatiser avec des scripts, puis auditer un serveur et rédiger un rapport. Neuf modules progressifs couvrent le terminal et l’arborescence, les fichiers et le traitement du texte, les droits et les utilisateurs, les processus, les services et les tâches planifiées, les logiciels et les mises à jour, le réseau, SSH et le pare-feu, le stockage, les sauvegardes et le chiffrement, les scripts shell, et l’audit d’un système Linux.\n\nChaque leçon propose un cours détaillé, des exemples corrigés et un quiz avec correction. Six travaux pratiques guidés, un incident à reconstituer et un projet final d’audit te font manipuler ce que tu apprends sur des exports réalistes de serveur : listings de droits, comptes, processus, journaux SSH et web, configurations, sauvegardes et scripts, avec des critères de réussite vérifiés par la plateforme.\n\nCompétences visées : lire et filtrer des fichiers et des journaux en ligne de commande, auditer les droits et les comptes, repérer un processus ou une tâche planifiée anormale, durcir SSH et le pare-feu, juger une politique de sauvegarde, écrire et relire un script sûr, reconstituer une intrusion et noter un serveur avec une grille d’audit.\n\nAucun prérequis Linux : un ordinateur Windows avec WSL ou Git Bash, une machine virtuelle gratuite, ou un téléphone avec Termux suffit pour rejouer les commandes, et les travaux pratiques se font à partir de fichiers fournis, sans serveur. Les vidéos sont en préparation : chaque leçon indique clairement quand la sienne n’est pas encore disponible, et le cours écrit couvre déjà l’essentiel.",
      },
    ],
  };
}
