// Fondamentaux de la cybersécurité, programme complet : assemblage des huit modules, des sept laboratoires, des compétences et des badges.
// Les leçons sont écrites dans fondamentaux-programme-a à d, les laboratoires dans fondamentaux-labs-a et b. Les réponses attendues des
// laboratoires viennent des faits calculés par scripts/lab-scenarios-securite-a.cjs et lab-scenarios-securite-b.cjs à partir des fichiers
// que les apprenants téléchargent, donc elles ne peuvent pas s’en écarter.
// Lu par scripts/generate-fondamentaux-seed.cjs, qui produit supabase/seed/06_fondamentaux_programme.sql.
import { modules as modulesA } from "./fondamentaux-programme-a";
import { modules as modulesB } from "./fondamentaux-programme-b";
import { modules as modulesC } from "./fondamentaux-programme-c";
import { modules as modulesD } from "./fondamentaux-programme-d";
import { buildLabsA, type FactsA } from "./fondamentaux-labs-a";
import { buildLabsB, type FactsB } from "./fondamentaux-labs-b";
import type { PathModuleEntry } from "./path-kit";
import type { PathBadge, PathSkill } from "./reseaux-path";

export type FondamentauxFacts = FactsA & FactsB;

// Le parcours impose l’ordre des laboratoires, quel que soit l’agent qui les écrit.
const LAB_ORDER = [
  "tp-analyse-phishing", "tp-audit-mots-de-passe", "tp-hygiene-postes", "tp-integrite-chiffrement",
  "tp-registre-risques", "incident-compte-compromis", "projet-audit-soleil",
];

export function buildFondamentauxProgramme(facts: FondamentauxFacts) {
  const modules = [...modulesA, ...modulesB, ...modulesC, ...modulesD].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
  const labs = [...buildLabsA(facts), ...buildLabsB(facts)].sort((left, right) => LAB_ORDER.indexOf(left.slug) - LAB_ORDER.indexOf(right.slug));

  const skills: PathSkill[] = [
    { slug: "principes-securite", name: "Principes de sécurité", description: "Classer un incident selon la confidentialité, l’intégrité et la disponibilité, et appliquer le moindre privilège et la défense en profondeur.", lessonKey: "fond-principes", practiceLab: "tp-registre-risques", validationLab: "projet-audit-soleil" },
    { slug: "ingenierie-sociale", name: "Ingénierie sociale et hameçonnage", description: "Repérer les leviers d’une manipulation et les signes d’un courriel, d’un SMS ou d’un appel frauduleux, puis réagir.", lessonKey: "fond-hameconnage", practiceLab: "tp-analyse-phishing", validationLab: "incident-compte-compromis" },
    { slug: "authentification-forte", name: "Authentification forte", description: "Évaluer des mots de passe, comprendre le hachage et choisir une double authentification adaptée.", lessonKey: "fond-mfa", practiceLab: "tp-audit-mots-de-passe", validationLab: "incident-compte-compromis" },
    { slug: "hygiene-numerique", name: "Hygiène numérique", description: "Contrôler les mises à jour, l’antivirus, le chiffrement des disques et les sauvegardes d’un parc de postes.", lessonKey: "fond-sauvegardes", practiceLab: "tp-hygiene-postes", validationLab: "projet-audit-soleil" },
    { slug: "bases-cryptographie", name: "Bases de la cryptographie", description: "Distinguer encoder, chiffrer et hacher, vérifier l’intégrité d’un fichier et lire un certificat.", lessonKey: "fond-crypto-bases", practiceLab: "tp-integrite-chiffrement", validationLab: "projet-audit-soleil" },
    { slug: "analyse-risques", name: "Analyse de risques", description: "Noter des scénarios par vraisemblance et impact, prioriser et choisir un traitement.", lessonKey: "fond-risques", practiceLab: "tp-registre-risques", validationLab: "projet-audit-soleil" },
    { slug: "protection-donnees", name: "Protection des données personnelles", description: "Repérer les données personnelles, appliquer les principes de protection et calculer le délai de notification d’une violation.", lessonKey: "fond-donnees-personnelles", practiceLab: "tp-registre-risques", validationLab: "incident-compte-compromis" },
    { slug: "reponse-incident", name: "Réponse à incident", description: "Reconstituer une chronologie, confiner une compromission et préserver les preuves.", lessonKey: "fond-reponse-incident", practiceLab: "tp-analyse-phishing", validationLab: "incident-compte-compromis" },
  ];

  const badges: PathBadge[] = [
    { slug: "oeil-de-lynx", name: "Œil de lynx", description: "Valider la compétence Ingénierie sociale et hameçonnage par l’incident du compte compromis.", icon: "eye", rarity: "rare", xp: 40, position: 290, skill: "ingenierie-sociale" },
    { slug: "gardien-des-secrets", name: "Gardien des secrets", description: "Valider la compétence Authentification forte par l’incident du compte compromis.", icon: "lock", rarity: "rare", xp: 40, position: 300, skill: "authentification-forte" },
    { slug: "cryptographe-en-herbe", name: "Cryptographe en herbe", description: "Valider la compétence Bases de la cryptographie par le projet final.", icon: "brain", rarity: "rare", xp: 40, position: 310, skill: "bases-cryptographie" },
    { slug: "chasseur-de-risques", name: "Chasseur de risques", description: "Valider la compétence Analyse de risques par le projet final.", icon: "target", rarity: "rare", xp: 40, position: 320, skill: "analyse-risques" },
    { slug: "premier-repondant", name: "Premier répondant", description: "Réussir l’incident : reconstituer la compromission d’un compte de messagerie.", icon: "shield", rarity: "epic", xp: 60, position: 330, lab: "incident-compte-compromis" },
    { slug: "auditeur-soleil", name: "Auditeur du Centre Soleil", description: "Réussir le projet final : auditer la sécurité du Centre Numérique Soleil.", icon: "trophy", rarity: "epic", xp: 60, position: 340, lab: "projet-audit-soleil" },
  ];

  return {
    modules: modules as PathModuleEntry[],
    labs,
    skills,
    badges,
    durationSync: ["fondamentaux"],
    courseTexts: [
      {
        slug: "fondamentaux",
        fromShort: "Les bases indispensables avant de plonger dans la sécurité informatique.",
        fromDescription: "Ce que la cybersécurité protège, les grandes familles de menaces et les acteurs qui défendent nos systèmes. Le point de départ idéal, sans prérequis.",
        short: "Menaces, hameçonnage, mots de passe, sauvegardes, cryptographie, risques et réponse à incident : le parcours d’entrée pour acquérir les bons réflexes et réaliser un premier audit d’hygiène.",
        description: "Ce parcours t’apprend à comprendre les menaces qui visent les personnes et les petites structures, à te protéger au quotidien et à réagir quand un incident survient. Huit modules progressifs couvrent les principes de la sécurité, l’écosystème des acteurs et des référentiels, l’ingénierie sociale et l’hameçonnage, les mots de passe et la double authentification, les mises à jour, les sauvegardes et le chiffrement des appareils, la cryptographie pour débutants, l’analyse de risques et la protection des données personnelles, puis la réponse à incident.\n\nChaque leçon propose un cours détaillé, des exemples corrigés et un quiz avec correction. Cinq travaux pratiques guidés, un incident à reconstituer et un projet final d’audit te font manipuler ce que tu apprends sur des fichiers réalistes, avec des critères de réussite vérifiés par la plateforme.\n\nCompétences visées : reconnaître un message frauduleux, auditer des mots de passe et des comptes, contrôler l’hygiène d’un parc de postes, vérifier l’intégrité d’un fichier, noter et prioriser des risques, reconstituer une compromission et rédiger les recommandations d’un audit.\n\nAucun prérequis : un téléphone ou un ordinateur suffit, et tous les outils utilisés sont gratuits. Les vidéos sont en préparation : chaque leçon indique clairement quand la sienne n’est pas encore disponible, et le cours écrit couvre déjà l’essentiel.",
      },
    ],
  };
}
