// Introduction au Pentest, programme complet : assemblage des dix modules, des sept nouveaux laboratoires, des compétences et des badges.
// Les leçons sont écrites dans pt-programme-a à e, les laboratoires dans pt-lab-tp1 à tp6 et pt-lab-proj. Les réponses attendues des
// laboratoires viennent des faits calculés par scripts/lab-scenarios-pt-tp1.cjs à proj à partir des fichiers
// que les apprenants téléchargent, donc elles ne peuvent pas s’en écarter.
// Lu par scripts/generate-pt-seed.cjs, qui produit supabase/seed/11_pentest_programme.sql.
import { modules as modulesA } from "./pt-programme-a";
import { modules as modulesB } from "./pt-programme-b";
import { modules as modulesC } from "./pt-programme-c";
import { modules as modulesD } from "./pt-programme-d";
import { modules as modulesE } from "./pt-programme-e";
import { buildPtLabTp1, type FactsPtTp1 } from "./pt-lab-tp1";
import { buildPtLabTp2, type FactsPtTp2 } from "./pt-lab-tp2";
import { buildPtLabTp3, type FactsPtTp3 } from "./pt-lab-tp3";
import { buildPtLabTp4, type FactsPtTp4 } from "./pt-lab-tp4";
import { buildPtLabTp5, type FactsPtTp5 } from "./pt-lab-tp5";
import { buildPtLabTp6, type FactsPtTp6 } from "./pt-lab-tp6";
import { buildPtLabProj, type FactsPtProj } from "./pt-lab-proj";
import type { PathModuleEntry } from "./path-kit";
import type { PathBadge, PathSkill } from "./reseaux-path";

export type PtFacts = FactsPtTp1 & FactsPtTp2 & FactsPtTp3 & FactsPtTp4 & FactsPtTp5 & FactsPtTp6 & FactsPtProj;

// Le parcours impose l’ordre des laboratoires, quel que soit l’agent qui les écrit.
const LAB_ORDER = [
  "tp-pt-cadrage", "tp-pt-osint", "tp-pt-nmap", "tp-pt-vulns", "tp-pt-web", "tp-pt-mission", "projet-pt-rapport",
];

export function buildPtProgramme(facts: PtFacts) {
  const modules = [...modulesA, ...modulesB, ...modulesC, ...modulesD, ...modulesE].sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
  const labs = [
    ...buildPtLabTp1(facts), ...buildPtLabTp2(facts), ...buildPtLabTp3(facts), ...buildPtLabTp4(facts),
    ...buildPtLabTp5(facts), ...buildPtLabTp6(facts), ...buildPtLabProj(facts),
  ].sort((left, right) => LAB_ORDER.indexOf(left.slug) - LAB_ORDER.indexOf(right.slug));

  const skills: PathSkill[] = [
    { slug: "lire-cadrage-perimetre", name: "Lire un cadrage et un périmètre", description: "Lire une lettre de mission et des règles d’engagement, puis classer cibles et actions en périmètre, interdites ou à clarifier.", lessonKey: "pt-contrat-roe", practiceLab: "tp-pt-cadrage", validationLab: "projet-pt-rapport" },
    { slug: "reconnaissance-passive", name: "Reconnaître passivement la surface exposée", description: "Exploiter des sources publiques (DNS, certificats, WHOIS, pages) pour dresser la liste des noms et des services visibles sans rien toucher.", lessonKey: "pt-osint-sources", practiceLab: "tp-pt-osint", validationLab: "projet-pt-rapport" },
    { slug: "lire-scan-reseau", name: "Lire un scan réseau", description: "Lire une sortie Nmap normale, greppable ou XML, distinguer les états de ports et repérer ce qui n’est pas attendu.", lessonKey: "pt-scan-ports", practiceLab: "tp-pt-nmap", validationLab: "projet-pt-rapport" },
    { slug: "trier-vulnerabilites", name: "Trier un rapport de vulnérabilités", description: "Distinguer les vrais constats, les faux positifs et les preuves insuffisantes dans l’export d’un scanner.", lessonKey: "pt-scanners-vulns", practiceLab: "tp-pt-vulns", validationLab: "projet-pt-rapport" },
    { slug: "analyser-test-web", name: "Analyser un test d’application web", description: "Relire l’historique d’un proxy d’interception, juger les preuves et classer les faiblesses selon l’OWASP Top 10:2025.", lessonKey: "pt-web-cartographie", practiceLab: "tp-pt-web", validationLab: "projet-pt-rapport" },
    { slug: "relire-mission-nettoyage", name: "Relire une mission et son nettoyage", description: "Vérifier le respect des règles d’engagement, la qualité des preuves et la clôture propre d’une mission.", lessonKey: "pt-nettoyage-remise", practiceLab: "tp-pt-mission", validationLab: "projet-pt-rapport" },
    { slug: "noter-prioriser-risques", name: "Noter et prioriser les risques", description: "Calculer une note CVSS 3.1 et ordonner les corrections avec l’EPSS, le catalogue KEV et la criticité de l’actif.", lessonKey: "pt-priorisation-risque", practiceLab: "tp-pt-vulns", validationLab: "projet-pt-rapport" },
    { slug: "rediger-rapport-pentest", name: "Rédiger un rapport de test d’intrusion défendable", description: "Écrire un résumé exécutif et des recommandations proportionnés à la preuve, sans rien inventer.", lessonKey: "pt-rapport-technique", practiceLab: "tp-pt-mission", validationLab: "projet-pt-rapport" },
  ];

  const badges: PathBadge[] = [
    { slug: "lecteur-de-mission", name: "Lecteur de mission", description: "Valider la compétence Lire un cadrage et un périmètre par le projet final de test d’intrusion.", icon: "flag", rarity: "rare", xp: 40, position: 560, skill: "lire-cadrage-perimetre" },
    { slug: "observateur-discret", name: "Observateur discret", description: "Valider la compétence Reconnaître passivement la surface exposée par le projet final de test d’intrusion.", icon: "eye", rarity: "rare", xp: 40, position: 570, skill: "reconnaissance-passive" },
    { slug: "lecteur-de-scans", name: "Lecteur de scans", description: "Valider la compétence Lire un scan réseau par le projet final de test d’intrusion.", icon: "target", rarity: "rare", xp: 40, position: 580, skill: "lire-scan-reseau" },
    { slug: "trieur-de-constats", name: "Trieur de constats", description: "Valider la compétence Trier un rapport de vulnérabilités par le projet final de test d’intrusion.", icon: "check-circle", rarity: "rare", xp: 40, position: 590, skill: "trier-vulnerabilites" },
    { slug: "analyste-de-proxy", name: "Analyste de proxy", description: "Valider la compétence Analyser un test d’application web par le projet final de test d’intrusion.", icon: "terminal", rarity: "rare", xp: 40, position: 600, skill: "analyser-test-web" },
    { slug: "evaluateur-de-priorites", name: "Évaluateur de priorités", description: "Valider la compétence Noter et prioriser les risques par le projet final de test d’intrusion.", icon: "brain", rarity: "rare", xp: 40, position: 610, skill: "noter-prioriser-risques" },
    { slug: "equipier-harmattan", name: "Équipier du Cabinet Harmattan", description: "Réussir le projet final : conduire sur dossier la mission de la Coopérative Sahel-Vert et rédiger le rapport.", icon: "trophy", rarity: "epic", xp: 60, position: 620, lab: "projet-pt-rapport" },
  ];

  return {
    modules: modules as PathModuleEntry[],
    labs,
    skills,
    badges,
    durationSync: ["pentest-intro"],
    courseTexts: [
      {
        slug: "pentest-intro",
        fromShort: "Découvre la méthodologie des tests d'intrusion éthiques.",
        fromDescription: "Autorisation, périmètre, méthode et rapport : la démarche d’un test d’intrusion éthique, de la lettre de mission à la recommandation.",
        short: "Cadrer, préparer, conduire et restituer un test d’intrusion éthique : autorisation, reconnaissance, scans, vulnérabilités, preuves minimales, nettoyage et rapport.",
        description: "Ce parcours t’apprend la démarche complète d’un test d’intrusion éthique, du côté de ceux qui protègent : obtenir une autorisation écrite et un périmètre clair, préparer un laboratoire légal à petit budget, reconnaître une surface exposée sans la toucher, lire des scans, trier des vulnérabilités, tester une application web avec des preuves minimales, relire une mission et son nettoyage, puis rédiger un rapport qui permet vraiment de corriger. Dix modules progressifs s’appuient sur des référentiels reconnus : PTES, NIST SP 800-115, le guide de test OWASP, l’OWASP Top 10 dans son édition 2025, MITRE ATT&CK, CVSS 3.1, EPSS et le catalogue KEV de la CISA.\n\nChaque leçon propose un cours détaillé, des exemples commentés, des démonstrations guidées que tu rejoues sur ton ordinateur, les erreurs fréquentes à éviter et un quiz avec correction. Six travaux pratiques et un projet final t’entraînent sur des dossiers fournis : lire une lettre de mission et fixer un périmètre, exploiter des sources publiques fictives, lire un scan réseau, trier le rapport d’un scanner, analyser l’historique d’un test web, relire le journal d’une mission, puis conduire une mission complète sur dossier et rédiger le rapport. La plateforme vérifie tes réponses et tu télécharges les guides et les modèles en PDF.\n\nTout est défensif et légal : les laboratoires sont des fichiers fictifs, aucune machine n’est attaquée, et chaque leçon rappelle qu’un test ne se fait jamais sans l’autorisation écrite d’une personne habilitée. Les leçons de droit ne remplacent pas un conseil juridique : la loi dépend de ton pays et un juriste doit valider les cas réels. Pour t’entraîner en vrai, tu apprends à monter ton propre laboratoire et à choisir des plateformes d’entraînement légales.\n\nAucun prérequis autre que la curiosité et les bases des cours Fondamentaux et Réseaux : un ordinateur Windows avec Node.js, PowerShell ou Git Bash suffit pour rejouer les démonstrations. Les vidéos sont en préparation : chaque leçon indique clairement quand la sienne n’est pas encore disponible, et le cours écrit couvre déjà l’essentiel.",
      },
    ],
  };
}
