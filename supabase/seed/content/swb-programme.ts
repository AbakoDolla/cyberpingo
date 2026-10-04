// Sécurité Web, programme complet : assemblage des dix modules, des sept nouveaux laboratoires, des compétences et des badges.
// Les leçons sont écrites dans swb-programme-a à e, les laboratoires dans swb-lab-tp1 à tp6 et swb-lab-proj. Les réponses attendues des
// laboratoires viennent des faits calculés par scripts/lab-scenarios-swb-tp1.cjs à proj à partir des fichiers
// que les apprenants téléchargent, donc elles ne peuvent pas s’en écarter.
// Lu par scripts/generate-swb-seed.cjs, qui produit supabase/seed/10_securite_web_programme.sql.
import { modules as modulesA } from "./swb-programme-a";
import { modules as modulesB } from "./swb-programme-b";
import { modules as modulesC } from "./swb-programme-c";
import { modules as modulesD } from "./swb-programme-d";
import { modules as modulesE } from "./swb-programme-e";
import { buildSwbLabTp1, type FactsTp1 } from "./swb-lab-tp1";
import { buildSwbLabTp2, type FactsTp2 } from "./swb-lab-tp2";
import { buildSwbLabTp3, type FactsTp3 } from "./swb-lab-tp3";
import { buildSwbLabTp4, type FactsTp4 } from "./swb-lab-tp4";
import { buildSwbLabTp5, type FactsTp5 } from "./swb-lab-tp5";
import { buildSwbLabTp6, type FactsTp6 } from "./swb-lab-tp6";
import { buildSwbLabProj, type FactsProj } from "./swb-lab-proj";
import type { PathModuleEntry } from "./path-kit";
import type { PathBadge, PathSkill } from "./reseaux-path";

export type SwbFacts = FactsTp1 & FactsTp2 & FactsTp3 & FactsTp4 & FactsTp5 & FactsTp6 & FactsProj;

// Le parcours impose l’ordre des laboratoires, quel que soit l’agent qui les écrit.
const LAB_ORDER = [
  "tp-web-http", "tp-web-injection", "tp-web-xss-csp", "tp-web-sessions-jwt", "tp-web-acces-api", "tp-web-config-cvss", "projet-web-audit",
];

export function buildSwbProgramme(facts: SwbFacts) {
  const modules = [...modulesA, ...modulesB, ...modulesC, ...modulesD, ...modulesE].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
  const labs = [
    ...buildSwbLabTp1(facts), ...buildSwbLabTp2(facts), ...buildSwbLabTp3(facts), ...buildSwbLabTp4(facts),
    ...buildSwbLabTp5(facts), ...buildSwbLabTp6(facts), ...buildSwbLabProj(facts),
  ].sort((left, right) => LAB_ORDER.indexOf(left.slug) - LAB_ORDER.indexOf(right.slug));

  const skills: PathSkill[] = [
    { slug: "lire-http-securite", name: "HTTP, cookies et HTTPS vus par la sécurité", description: "Lire une requête et une réponse HTTP, juger des cookies, d’un certificat et d’en-têtes de sécurité.", lessonKey: "web-http-bases", practiceLab: "tp-web-http", validationLab: "projet-web-audit" },
    { slug: "reperer-injections", name: "Reconnaître et corriger les injections", description: "Repérer une injection dans du code et dans des journaux, et choisir la correction qui sépare le code des données.", lessonKey: "web-injection-sql", practiceLab: "tp-web-injection", validationLab: "projet-web-audit" },
    { slug: "prevenir-xss-csp", name: "Prévenir le XSS et évaluer une CSP", description: "Encoder les sorties selon leur contexte, évaluer une politique de sécurité du contenu et lire ses rapports.", lessonKey: "web-xss", practiceLab: "tp-web-xss-csp", validationLab: "projet-web-audit" },
    { slug: "securiser-sessions-jetons", name: "Sécuriser sessions, jetons et mots de passe", description: "Contrôler des sessions, des jetons JWT et le stockage des mots de passe d’après une politique écrite.", lessonKey: "web-sessions", practiceLab: "tp-web-sessions-jwt", validationLab: "projet-web-audit" },
    { slug: "controler-acces-api", name: "Contrôle d’accès, API et SSRF", description: "Repérer l’accès à l’objet d’un autre, les fonctions interdites et les requêtes sortantes vers l’intérieur dans des journaux.", lessonKey: "web-controle-acces", practiceLab: "tp-web-acces-api", validationLab: "projet-web-audit" },
    { slug: "durcir-configuration", name: "Durcir la configuration et les dépendances", description: "Trouver ce qui est mal réglé dans une configuration et quels composants installés sont touchés par un avis de sécurité.", lessonKey: "web-config-secrets", practiceLab: "tp-web-config-cvss", validationLab: "projet-web-audit" },
    { slug: "noter-prioriser-vulnerabilites", name: "Noter et prioriser les vulnérabilités", description: "Calculer une note CVSS 3.1, la qualifier et ordonner les corrections en tenant compte du contexte.", lessonKey: "web-cwe-cvss", practiceLab: "tp-web-config-cvss", validationLab: "projet-web-audit" },
    { slug: "auditer-application-web", name: "Auditer une application web et rédiger le rapport", description: "Mener un audit dans un cadre autorisé, qualifier les constats, recommander et rédiger un rapport défendable.", lessonKey: "web-rapport-remediation", practiceLab: "tp-web-config-cvss", validationLab: "projet-web-audit" },
  ];

  const badges: PathBadge[] = [
    { slug: "lecteur-de-requetes", name: "Lecteur de requêtes", description: "Valider la compétence HTTP, cookies et HTTPS vus par la sécurité par le projet final d’audit.", icon: "eye", rarity: "rare", xp: 40, position: 490, skill: "lire-http-securite" },
    { slug: "chasseur-d-injections", name: "Chasseur d’injections", description: "Valider la compétence Reconnaître et corriger les injections par le projet final d’audit.", icon: "target", rarity: "rare", xp: 40, position: 500, skill: "reperer-injections" },
    { slug: "gardien-du-navigateur", name: "Gardien du navigateur", description: "Valider la compétence Prévenir le XSS et évaluer une CSP par le projet final d’audit.", icon: "shield", rarity: "rare", xp: 40, position: 510, skill: "prevenir-xss-csp" },
    { slug: "maitre-des-sessions", name: "Maître des sessions", description: "Valider la compétence Sécuriser sessions, jetons et mots de passe par le projet final d’audit.", icon: "lock", rarity: "rare", xp: 40, position: 520, skill: "securiser-sessions-jetons" },
    { slug: "sentinelle-des-acces", name: "Sentinelle des accès", description: "Valider la compétence Contrôle d’accès, API et SSRF par le projet final d’audit.", icon: "flag", rarity: "rare", xp: 40, position: 530, skill: "controler-acces-api" },
    { slug: "evaluateur-de-risques", name: "Évaluateur de risques", description: "Valider la compétence Noter et prioriser les vulnérabilités par le projet final d’audit.", icon: "brain", rarity: "rare", xp: 40, position: 540, skill: "noter-prioriser-vulnerabilites" },
    { slug: "auditeur-palmier", name: "Auditeur du Palmier d’Or", description: "Réussir le projet final : auditer l’application de réservation de l’Hôtel Palmier d’Or et rédiger le rapport.", icon: "trophy", rarity: "epic", xp: 60, position: 550, lab: "projet-web-audit" },
  ];

  return {
    modules: modules as PathModuleEntry[],
    labs,
    skills,
    badges,
    durationSync: ["securite-web"],
    courseTexts: [
      {
        slug: "securite-web",
        fromShort: "HTTPS, comptes sécurisés et détection du phishing : les bons réflexes du web.",
        fromDescription: "HTTPS, gestionnaire de mots de passe, MFA et détection du phishing : les réflexes qui protègent tes comptes et ceux de ton équipe.",
        short: "Comprendre HTTP et HTTPS, reconnaître et corriger les failles des applications web (injections, XSS, sessions, contrôle d’accès, API), puis auditer un site et rédiger le rapport.",
        description: "Ce parcours t’apprend comment fonctionne le web, pourquoi et comment les applications web sont attaquées, comment les défendre et comment auditer un site avec méthode, jusqu’au rapport. Tu pars des réflexes du quotidien (HTTPS, comptes, phishing), tu apprends à lire une requête, un cookie, un certificat et des en-têtes, puis tu étudies les grandes familles de failles : injections, XSS et politique de sécurité du contenu, sessions et jetons, contrôle d’accès, CSRF et CORS, fichiers, SSRF et API, configuration et dépendances. Dix modules progressifs suivent le référentiel OWASP Top 10 dans son édition 2025.\n\nChaque leçon propose un cours détaillé, des extraits de code et de requêtes commentés, des démonstrations guidées que tu rejoues sur ton ordinateur, des exemples corrigés et un quiz avec correction. Six travaux pratiques guidés et un projet final t’apprennent à lire des captures HTTP, des journaux, du code, des configurations et des listes de dépendances, à calculer une note CVSS et à classer des correctifs, avec des critères de réussite vérifiés par la plateforme.\n\nTout est défensif et légal : tu analyses des fichiers fictifs fournis par la plateforme ou ton propre site, tu ne testes jamais un système sans autorisation écrite, et chaque leçon indique où t’entraîner légalement. Compétences visées : lire HTTP, cookies et en-têtes, reconnaître et corriger une injection, encoder et évaluer une politique de sécurité du contenu, contrôler sessions, jetons et mots de passe, repérer un défaut de contrôle d’accès ou un SSRF, durcir une configuration, noter et prioriser des vulnérabilités, puis rédiger un rapport d’audit défendable.\n\nAucun prérequis autre que la curiosité et les bases des cours Réseaux et Fondamentaux : un ordinateur Windows avec Node.js, PowerShell ou Git Bash suffit pour rejouer les démonstrations, et les travaux pratiques se font à partir de fichiers fournis, sans serveur ni outil offensif. Les vidéos sont en préparation : chaque leçon indique clairement quand la sienne n’est pas encore disponible, et le cours écrit couvre déjà l’essentiel.",
      },
    ],
  };
}
