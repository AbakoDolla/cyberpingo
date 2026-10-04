"use strict";

const SCANNER_FILE = "pt-tp4-scanner-export.csv";
const NOTES_FILE = "pt-tp4-notes-validation.txt";
const ADVISORIES_FILE = "pt-tp4-avis-techniques.jsonl";
const EPSS_FILE = "pt-tp4-epss-kev.csv";
const ASSETS_FILE = "pt-tp4-actifs.txt";
const GUIDE_FILE = "pt-tp4-guide.md";

const text = (value) => Buffer.from(String(value).replace(/\r?\n/g, "\n"), "utf8");

const METRIC_WEIGHTS = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  UI: { N: 0.85, R: 0.62 },
  CIA: { H: 0.56, L: 0.22, N: 0 },
  PR: {
    U: { N: 0.85, L: 0.62, H: 0.27 },
    C: { N: 0.85, L: 0.68, H: 0.5 },
  },
};

function parseVector(vector) {
  return Object.fromEntries(vector.split("/").slice(1).map((part) => part.split(":")));
}

function roundUpCvss(value) {
  const scaled = Math.round(value * 100000);
  if (scaled % 10000 === 0) return (scaled / 100000).toFixed(1);
  return ((Math.floor(scaled / 10000) + 1) / 10).toFixed(1);
}

function cvssBaseScore(vector) {
  const metrics = parseVector(vector);
  const c = METRIC_WEIGHTS.CIA[metrics.C];
  const i = METRIC_WEIGHTS.CIA[metrics.I];
  const a = METRIC_WEIGHTS.CIA[metrics.A];
  const iss = 1 - (1 - c) * (1 - i) * (1 - a);
  const impact = metrics.S === "U"
    ? 6.42 * iss
    : 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
  const exploitability = 8.22
    * METRIC_WEIGHTS.AV[metrics.AV]
    * METRIC_WEIGHTS.AC[metrics.AC]
    * METRIC_WEIGHTS.PR[metrics.S][metrics.PR]
    * METRIC_WEIGHTS.UI[metrics.UI];
  if (impact <= 0) return "0.0";
  const total = metrics.S === "U"
    ? Math.min(impact + exploitability, 10)
    : Math.min(1.08 * (impact + exploitability), 10);
  return roundUpCvss(total);
}

function cvssQualification(scoreText) {
  const score = Number(scoreText);
  if (score === 0) return "aucune";
  if (score <= 3.9) return "faible";
  if (score <= 6.9) return "moyenne";
  if (score <= 8.9) return "élevée";
  return "critique";
}

function epssBand(value) {
  if (value >= 0.85) return 4;
  if (value >= 0.6) return 3;
  if (value >= 0.3) return 2;
  return 1;
}

function csvLine(values) {
  return values.join(",");
}

const advisories = [
  { produit: "Baobab Portal", version_touchee: "<=5.4.1", version_corrigee: "5.4.2", contexte: "jeton signé insuffisamment isolé sur portail public" },
  { produit: "Canopee API", version_touchee: "<=3.2.0", version_corrigee: "3.2.1", contexte: "en-tête debug actif sur API exposée" },
  { produit: "Sirocco Gateway", version_touchee: "<4.2.4", version_corrigee: "4.2.4", contexte: "console legacy encore référencée dans les modèles de scan" },
  { produit: "Atlas Vault", version_touchee: "<=6.2.1", version_corrigee: "6.2.4", contexte: "coffre de secrets publié via reverse proxy" },
  { produit: "Nimbus Queue", version_touchee: "<=4.4.1", version_corrigee: "4.4.3", contexte: "files d’attente exposées sans durcissement strict" },
  { produit: "Savane Reports", version_touchee: "<=2.8.0", version_corrigee: "2.8.2", contexte: "moteur de rapports à headers verbeux" },
  { produit: "Monsoon VPN", version_touchee: "<=7.1.0", version_corrigee: "7.1.4", contexte: "portail VPN avec politique TLS incomplète" },
  { produit: "Delta Mail Hub", version_touchee: "<=5.1.2", version_corrigee: "5.1.5", contexte: "service de courrier avec page de diagnostic résiduelle" },
  { produit: "Kora Upload", version_touchee: "<=1.9.2", version_corrigee: "1.9.3", contexte: "passerelle de dépôt de fichiers détectée par signature" },
  { produit: "EpiStore", version_touchee: "<=3.6.4", version_corrigee: "3.6.6", contexte: "stockage de catalogue avec répertoire de santé exposé" },
  { produit: "Harmattan Sync", version_touchee: "<=2.1.3", version_corrigee: "2.1.5", contexte: "synchronisation inter-sites au durcissement incomplet" },
  { produit: "Brousse Admin", version_touchee: "<=8.0.0", version_corrigee: "8.0.2", contexte: "console d’administration laissée en frontal" },
  { produit: "Palmeraie SSO", version_touchee: "<=4.7.0", version_corrigee: "4.7.2", contexte: "fédération interne avec assertion trop bavarde" },
  { produit: "Sahel Queue", version_touchee: "<=1.2.0", version_corrigee: "1.2.3", contexte: "agent de file embarqué dans le portail" },
  { produit: "Coton Cache", version_touchee: "<=6.6.1", version_corrigee: "6.6.4", contexte: "cache applicatif avec endpoint de purge annoncé" },
  { produit: "Moringa Mail Gateway", version_touchee: "<=9.1.1", version_corrigee: "9.1.3", contexte: "passerelle mail avec réponse SMTP trop bavarde" },
  { produit: "Oasis Files", version_touchee: "<=5.0.0", version_corrigee: "5.0.2", contexte: "transfert de fichiers interne réutilisé en frontal" },
  { produit: "Khepri Console", version_touchee: "<=3.0.5", version_corrigee: "3.0.7", contexte: "console de supervision encore visible" },
  { produit: "Sable CDN", version_touchee: "<=2.4.0", version_corrigee: "2.4.3", contexte: "cache web avec règles d’administration résiduelles" },
  { produit: "Lagune Bridge", version_touchee: "<=7.8.2", version_corrigee: "7.8.4", contexte: "pont d’intégration interne référencé par signature" },
  { produit: "Tamarin Search", version_touchee: "<=1.4.9", version_corrigee: "1.5.1", contexte: "moteur de recherche embarqué, état debug non désactivé" },
  { produit: "Dune Metrics", version_touchee: "<=2.2.4", version_corrigee: "2.2.6", contexte: "module de métriques avec endpoint détaillé" },
];

const assetCatalog = [
  { host: "paie.sahel-vert.example", service: "https", criticite: "critique", rang: 5, justification: "portail de paie des coopérateurs et des salariés" },
  { host: "paie.sahel-vert.example", service: "api", criticite: "élevée", rang: 4, justification: "api de bulletins et de virements internes" },
  { host: "paie.sahel-vert.example", service: "admin", criticite: "élevée", rang: 4, justification: "console RH réservée à l’équipe finance" },
  { host: "paie.sahel-vert.example", service: "sso", criticite: "élevée", rang: 4, justification: "entrée unique des agents paie" },
  { host: "paie.sahel-vert.example", service: "backup", criticite: "moyenne", rang: 3, justification: "export nocturne des journaux de paie" },
  { host: "portail.sahel-vert.example", service: "https", criticite: "élevée", rang: 4, justification: "portail principal des adhérents et des coopérateurs" },
  { host: "portail.sahel-vert.example", service: "api", criticite: "élevée", rang: 4, justification: "api métier du portail public" },
  { host: "portail.sahel-vert.example", service: "sso", criticite: "moyenne", rang: 3, justification: "fédération des comptes du portail" },
  { host: "portail.sahel-vert.example", service: "search", criticite: "moyenne", rang: 3, justification: "moteur interne de recherche de contenus" },
  { host: "portail.sahel-vert.example", service: "metrics", criticite: "limitée", rang: 2, justification: "métriques exposées pour la supervision" },
  { host: "stock.sahel-vert.example", service: "https", criticite: "élevée", rang: 4, justification: "extranet de stock et de mouvements coopératifs" },
  { host: "stock.sahel-vert.example", service: "api", criticite: "élevée", rang: 4, justification: "api de mouvements de stock et commandes" },
  { host: "stock.sahel-vert.example", service: "sftp", criticite: "moyenne", rang: 3, justification: "dépôt de fichiers avec partenaires logistiques" },
  { host: "stock.sahel-vert.example", service: "admin", criticite: "moyenne", rang: 3, justification: "console de paramétrage d’inventaire" },
  { host: "stock.sahel-vert.example", service: "sync", criticite: "moyenne", rang: 3, justification: "synchronisation quotidienne des catalogues" },
  { host: "vpn.sahel-vert.example", service: "vpn", criticite: "élevée", rang: 4, justification: "accès distant des prestataires et techniciens" },
  { host: "vpn.sahel-vert.example", service: "https", criticite: "moyenne", rang: 3, justification: "portail web d’entrée du VPN" },
  { host: "vpn.sahel-vert.example", service: "admin", criticite: "moyenne", rang: 3, justification: "diagnostic réservé aux administrateurs réseau" },
  { host: "vpn.sahel-vert.example", service: "sso", criticite: "moyenne", rang: 3, justification: "relais des jetons d’accès distants" },
  { host: "vpn.sahel-vert.example", service: "metrics", criticite: "limitée", rang: 2, justification: "indicateurs techniques sans données métier" },
  { host: "mail.sahel-vert.example", service: "smtp", criticite: "moyenne", rang: 3, justification: "passerelle d’envoi pour messagerie interne" },
  { host: "mail.sahel-vert.example", service: "imaps", criticite: "moyenne", rang: 3, justification: "lecture sécurisée de la messagerie" },
  { host: "mail.sahel-vert.example", service: "admin", criticite: "moyenne", rang: 3, justification: "console d’administration mail réservée" },
  { host: "mail.sahel-vert.example", service: "webmail", criticite: "moyenne", rang: 3, justification: "webmail des agents terrain" },
  { host: "mail.sahel-vert.example", service: "sync", criticite: "limitée", rang: 2, justification: "synchronisation de carnets d’adresses" },
  { host: "www.sahel-vert.example", service: "https", criticite: "limitée", rang: 2, justification: "site vitrine sans action métier critique" },
  { host: "www.sahel-vert.example", service: "admin", criticite: "limitée", rang: 2, justification: "back office de publication" },
  { host: "www.sahel-vert.example", service: "cdn", criticite: "limitée", rang: 2, justification: "cache de contenus publics" },
  { host: "www.sahel-vert.example", service: "search", criticite: "limitée", rang: 2, justification: "recherche de pages publiques" },
  { host: "www.sahel-vert.example", service: "metrics", criticite: "limitée", rang: 2, justification: "métriques web destinées à la supervision" },
];

const findings = [
  { id: "V01", host: "portail.sahel-vert.example", service: "https", produit: "Baobab Portal", version: "5.4.1", titre: "Jeton signé d’ancienne génération encore accepté", preuve: "banner=Baobab Portal/5.4.1; endpoint=/auth/status", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", epss: 0.512, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", validation: "version observée et endpoint concordants", commentaire: "preuve minimale suffisante via bannière et endpoint d’authentification" },
  { id: "V02", host: "portail.sahel-vert.example", service: "api", produit: "Canopee API", version: "3.2.0", titre: "En-tête debug hérité encore actif", preuve: "header=X-Canopee-Debug:on; path=/api/v2/health", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N", epss: 0.467, kev: "no", statut: "confirme", decision: "ajuste", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N", validation: "en-tête debug vu en production mais sans voie de modification", commentaire: "confirmé mais impact intégrité revu à la baisse après lecture de la réponse" },
  { id: "V03", host: "portail.sahel-vert.example", service: "api", produit: "Sahel Queue", version: "1.2.0", titre: "Console de file d’attente référencée dans l’api", preuve: "body=queue monitor enabled; path=/api/v2/queues/status", vecteur: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:N", epss: 0.421, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:L/A:N", validation: "preuve textuelle suffisante et version touchée", commentaire: "le compte lecture queue existe encore sur l’actif public" },
  { id: "V04", host: "portail.sahel-vert.example", service: "sso", produit: "Palmeraie SSO", version: "4.7.0", titre: "Assertion de fédération trop bavarde sur erreur", preuve: "body=stack marker palmeraie-sso; path=/sso/callback", vecteur: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N", epss: 0.388, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N", validation: "page d’erreur et marqueur de version visibles", commentaire: "la fuite d’information reste exploitable sans ambiguïté fonctionnelle" },
  { id: "V05", host: "portail.sahel-vert.example", service: "search", produit: "Tamarin Search", version: "1.4.9", titre: "État debug du moteur de recherche exposé", preuve: "header=X-Tamarin-Debug:search; path=/recherche/debug", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:L/I:L/A:N", epss: 0.355, kev: "no", statut: "confirme", decision: "ajuste", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", validation: "la page existe mais exige un clic explicite de l’opérateur", commentaire: "impact confirmé mais interaction utilisateur nécessaire pour afficher le détail" },
  { id: "V06", host: "portail.sahel-vert.example", service: "metrics", produit: "Dune Metrics", version: "2.2.4", titre: "Endpoint de métriques détaillées sans filtrage de rôle", preuve: "path=/metrics/details; body=collector dune-metrics 2.2.4", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N", epss: 0.331, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N", validation: "endpoint et version observés en clair", commentaire: "la métrique révèle trop de détail sur les composants exposés" },
  { id: "V07", host: "paie.sahel-vert.example", service: "https", produit: "Sirocco Gateway", version: "4.2.6", titre: "Console legacy référencée par signature ancienne", preuve: "header=X-App-Version:4.2.6; path=/legacy/login", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N", epss: 0.979, kev: "yes", statut: "faux_positif", decision: "rejete", vecteurFinal: "-", validation: "version observée 4.2.6 hors plage touchée <4.2.4", commentaire: "signature du scanner trop large pour les versions déjà corrigées" },
  { id: "V08", host: "paie.sahel-vert.example", service: "https", produit: "Baobab Portal", version: "5.4.1", titre: "Jeton signé d’ancienne génération sur portail paie", preuve: "banner=Baobab Portal/5.4.1; endpoint=/session/info", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N", epss: 0.861, kev: "yes", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N", validation: "jeton legacy confirmé sur service de paie", commentaire: "actif sensible avec version encore touchée et preuve directe" },
  { id: "V09", host: "paie.sahel-vert.example", service: "api", produit: "Nimbus Queue", version: "4.4.1", titre: "Attente de traitement lisible depuis l’api de paie", preuve: "path=/api/jobs/peek; body=nimbus queue 4.4.1", vecteur: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N", epss: 0.702, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N", validation: "preuve de version et sortie d’exemple suffisantes", commentaire: "révèle une file de traitement sur un actif financier" },
  { id: "V10", host: "paie.sahel-vert.example", service: "api", produit: "Savane Reports", version: "2.8.0", titre: "Génération de rapports avec trace métier trop verbeuse", preuve: "header=X-Savane-Trace:on; path=/api/report/export", vecteur: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N", epss: 0.584, kev: "no", statut: "confirme", decision: "ajuste", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N", validation: "preuve valide mais aucune interruption de service constatée", commentaire: "le scanner surévaluait la composante disponibilité sans preuve de panne" },
  { id: "V11", host: "paie.sahel-vert.example", service: "https", produit: "Atlas Vault", version: "6.2.1", titre: "Coffre de secrets publié via reverse proxy sans isolation", preuve: "path=/vault/status; body=atlas vault 6.2.1", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H", epss: 0.941, kev: "yes", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H", validation: "version et endpoint critiques confirmés", commentaire: "constat le plus fort sur l’actif le plus critique du dossier" },
  { id: "V12", host: "portail.sahel-vert.example", service: "https", produit: "Kora Upload", version: "inconnue", titre: "Passerelle de dépôt détectée sans version exploitable", preuve: "header=X-Kora-Upload:present; path=/upload/status", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L", epss: 0.298, kev: "no", statut: "preuve_insuffisante", decision: "non_evaluable", vecteurFinal: "-", validation: "signature générique sans version ni action observable", commentaire: "preuve minimale absente, donc aucun classement défendable" },
  { id: "V13", host: "stock.sahel-vert.example", service: "https", produit: "EpiStore", version: "3.6.4", titre: "Dossier de santé du stockage encore exposé", preuve: "path=/health/storage; body=epistore 3.6.4", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", epss: 0.611, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", validation: "version et endpoint visibles sans ambiguïté", commentaire: "service logistique sensible avec exposition confirmée" },
  { id: "V14", host: "stock.sahel-vert.example", service: "api", produit: "Harmattan Sync", version: "2.1.3", titre: "Synchronisation inter-sites encore verbeuse", preuve: "path=/api/sync/ping; body=harmattan sync 2.1.3", vecteur: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:L", epss: 0.577, kev: "no", statut: "confirme", decision: "ajuste", vecteurFinal: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:L", validation: "exposition réelle mais aucune capacité d’écriture démontrée", commentaire: "impact intégrité retiré après validation minimale" },
  { id: "V15", host: "stock.sahel-vert.example", service: "sftp", produit: "Oasis Files", version: "5.0.0", titre: "Dépôt de fichiers encore annoncé par bannière ancienne", preuve: "banner=Oasis Files/5.0.0; port=22/tcp", vecteur: "CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", epss: 0.544, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", validation: "bannière et port concordants", commentaire: "service partenaire encore à jour imparfaitement" },
  { id: "V16", host: "stock.sahel-vert.example", service: "admin", produit: "Brousse Admin", version: "8.0.0", titre: "Console d’inventaire en frontal sans durcissement", preuve: "path=/admin/diag; body=brousse admin 8.0.0", vecteur: "CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:C/C:L/I:L/A:N", epss: 0.487, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:C/C:L/I:L/A:N", validation: "page de diagnostic observée après redirection interne", commentaire: "preuve suffisante mais nécessite une interaction utilisateur" },
  { id: "V17", host: "stock.sahel-vert.example", service: "sync", produit: "Lagune Bridge", version: "7.8.2", titre: "Pont d’intégration de catalogue mal isolé", preuve: "path=/sync/diag; body=lagune bridge 7.8.2", vecteur: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N", epss: 0.265, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N", validation: "diagnostic exposé et version affichée", commentaire: "faible priorité car signal externe bas et actif moins sensible" },
  { id: "V18", host: "portail.sahel-vert.example", service: "https", produit: "Coton Cache", version: "6.6.1", titre: "Endpoint de purge annoncé sur le portail principal", preuve: "header=X-Coton-Cache:6.6.1; path=/cache/status", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", epss: 0.641, kev: "no", statut: "confirme", decision: "ajuste", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:N/A:N", validation: "fonction visible mais aucune purge réalisée pendant la validation", commentaire: "priorité rehaussée par le contexte métier du portail principal" },
  { id: "V19", host: "www.sahel-vert.example", service: "https", produit: "Sable CDN", version: "2.4.0", titre: "Règles d’administration du cache encore visibles", preuve: "header=X-Sable-CDN:2.4.0; path=/cdn/diag", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", epss: 0.648, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", validation: "endpoint confirmé sur site vitrine uniquement", commentaire: "epss légèrement plus haut mais actif moins critique que le portail adhérents" },
  { id: "V20", host: "paie.sahel-vert.example", service: "api", produit: "Palmeraie SSO", version: "4.7.0", titre: "Assertion d’identité trop bavarde sur l’api de paie", preuve: "path=/api/sso/debug; body=palmeraie sso 4.7.0", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N", epss: 0.903, kev: "yes", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N", validation: "exposition réelle et impact métier élevé", commentaire: "kev sur actif financier même sans coffre de secrets" },
  { id: "V21", host: "paie.sahel-vert.example", service: "admin", produit: "Khepri Console", version: "3.0.5", titre: "Console de supervision RH encore joignable", preuve: "path=/admin/console/status; body=khepri console 3.0.5", vecteur: "CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:C/C:L/I:L/A:N", epss: 0.459, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:C/C:L/I:L/A:N", validation: "preuve minimale suffisante et version exacte", commentaire: "service réservé mais encore visible depuis le frontal interne" },
  { id: "V22", host: "vpn.sahel-vert.example", service: "vpn", produit: "Monsoon VPN", version: "7.1.0", titre: "Portail VPN avec politique TLS incomplète", preuve: "banner=Monsoon VPN/7.1.0; tls=legacy-policy", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", epss: 0.603, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", validation: "configuration observée directement sur le portail", commentaire: "exposition internet claire sur service d’accès distant" },
  { id: "V23", host: "vpn.sahel-vert.example", service: "admin", produit: "Brousse Admin", version: "8.0.0", titre: "Diagnostic d’administration VPN encore publié", preuve: "path=/diag/admin; body=brousse admin 8.0.0", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:L", epss: 0.792, kev: "yes", statut: "confirme", decision: "ajuste", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:L", validation: "aucune modification observée lors de la validation minimale", commentaire: "kev confirmé mais impact intégrité réduit faute de preuve de changement" },
  { id: "V24", host: "vpn.sahel-vert.example", service: "https", produit: "Lagune Bridge", version: "7.8.2", titre: "Pont d’intégration encore visible depuis la mire VPN", preuve: "path=/bridge/status; body=lagune bridge 7.8.2", vecteur: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N", epss: 0.521, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N", validation: "version et page de statut visibles", commentaire: "reste à corriger mais passe derrière les constats kev" },
  { id: "V25", host: "vpn.sahel-vert.example", service: "metrics", produit: "Dune Metrics", version: "2.2.4", titre: "Endpoint de métriques du VPN trop descriptif", preuve: "path=/metrics/full; body=dune metrics 2.2.4", vecteur: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N", epss: 0.214, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N", validation: "métriques confirmées sans impact écriture", commentaire: "signal externe faible et actif non métier" },
  { id: "V26", host: "mail.sahel-vert.example", service: "smtp", produit: "Delta Mail Hub", version: "5.1.2", titre: "Bannière SMTP trop bavarde sur versions internes", preuve: "banner=Delta Mail Hub/5.1.2; port=25/tcp", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N", epss: 0.495, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N", validation: "version et rôle observés via bannière", commentaire: "information utile à corriger mais sans effet direct sur l’intégrité" },
  { id: "V27", host: "mail.sahel-vert.example", service: "imaps", produit: "Moringa Mail Gateway", version: "9.1.1", titre: "Passerelle mail avec panneau de diagnostic IMAPS", preuve: "path=/imaps/diag; body=moringa mail gateway 9.1.1", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N", epss: 0.734, kev: "yes", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N", validation: "page de diagnostic observée et version touchée", commentaire: "kev confirmé mais actif métier moins critique que la paie" },
  { id: "V28", host: "mail.sahel-vert.example", service: "admin", produit: "Khepri Console", version: "3.0.5", titre: "Console d’administration mail trop verbeuse", preuve: "path=/admin/mail/status; body=khepri console 3.0.5", vecteur: "CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:C/C:L/I:L/A:N", epss: 0.364, kev: "no", statut: "confirme", decision: "ajuste", vecteurFinal: "CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:C/C:L/I:N/A:N", validation: "le détail observé ne prouve pas une modification à distance", commentaire: "constat retenu avec impact intégrité retiré" },
  { id: "V29", host: "mail.sahel-vert.example", service: "webmail", produit: "Baobab Portal", version: "5.4.1", titre: "Moteur webmail encore sur génération de jeton legacy", preuve: "banner=Baobab Portal/5.4.1; path=/webmail/status", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", epss: 0.281, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N", validation: "version visible mais contexte moins critique", commentaire: "même famille que le portail mais actif de criticité moyenne" },
  { id: "V30", host: "www.sahel-vert.example", service: "admin", produit: "Savane Reports", version: "2.8.0", titre: "Back office de publication avec traces de rapports", preuve: "path=/admin/reports/diag; body=savane reports 2.8.0", vecteur: "CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:C/C:L/I:L/A:N", epss: 0.417, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:H/PR:L/UI:R/S:C/C:L/I:L/A:N", validation: "trace visible sans preuve d’écriture", commentaire: "site vitrine donc priorité plus basse malgré le même produit" },
  { id: "V31", host: "www.sahel-vert.example", service: "cdn", produit: "Sable CDN", version: "2.4.0", titre: "Cache public encore avec règles d’administration actives", preuve: "path=/cdn/rules; body=sable cdn 2.4.0", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N", epss: 0.884, kev: "yes", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N", validation: "règles d’administration exposées en lecture", commentaire: "kev confirmé mais actif limité à la vitrine publique" },
  { id: "V32", host: "www.sahel-vert.example", service: "search", produit: "Tamarin Search", version: "1.4.9", titre: "Recherche publique avec endpoint debug conservé", preuve: "path=/search/diag; body=tamarin search 1.4.9", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", epss: 0.349, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", validation: "page debug visible sans autre privilège", commentaire: "utile à corriger mais très en dessous des services métier" },
  { id: "V33", host: "www.sahel-vert.example", service: "https", produit: "Coton Cache", version: "6.6.1", titre: "Purge de cache annoncée sur le site vitrine", preuve: "header=X-Coton-Cache:6.6.1; path=/cache/info", vecteur: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N", epss: 0.307, kev: "no", statut: "confirme", decision: "ajuste", vecteurFinal: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:C/C:L/I:L/A:N", validation: "la purge exige une action non observée pendant la validation", commentaire: "le scanner surestimait la facilité d’exploitation" },
  { id: "V34", host: "www.sahel-vert.example", service: "metrics", produit: "Dune Metrics", version: "2.2.4", titre: "Détails de supervision du site vitrine exposés", preuve: "path=/metrics/site; body=dune metrics 2.2.4", vecteur: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N", epss: 0.192, kev: "no", statut: "confirme", decision: "conserve", vecteurFinal: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:N/A:N", validation: "sortie de supervision publique encore présente", commentaire: "plus faible priorité du lot confirmé" },
];

function buildScannerCsv() {
  const lines = [csvLine(["id", "hote", "service", "produit", "version_observee", "titre", "preuve", "vecteur_cvss"])];
  for (const finding of findings) {
    lines.push(csvLine([finding.id, finding.host, finding.service, finding.produit, finding.version, finding.titre, finding.preuve, finding.vecteur]));
  }
  return lines.join("\n");
}

function buildNotesTxt() {
  const lines = [
    "Dossier de validation minimale du Cabinet Harmattan",
    "Mission : Coopérative Sahel-Vert - tri du rapport du 10 juin 2026",
    "Rappel : statut confirme = preuve minimale suffisante ; faux_positif = produit ou version non touchés ; preuve_insuffisante = signature sans preuve minimale exploitable",
    "Rappel : decision_vecteur=conserve garde le vecteur du scanner ; decision_vecteur=ajuste le révise ; decision_vecteur=rejete ou non_evaluable sort le constat du tri prioritaire",
  ];
  for (const finding of findings) {
    lines.push(`[${finding.id}] statut=${finding.statut} preuve=${finding.statut === "preuve_insuffisante" ? "insuffisante" : "suffisante"} decision_vecteur=${finding.decision} vecteur_final=${finding.vecteurFinal}`);
    lines.push(`[${finding.id}] version_reelle=${finding.version} produit=${finding.produit} validation=${finding.validation}`);
    lines.push(`[${finding.id}] commentaire=${finding.commentaire}`);
  }
  return lines.join("\n");
}

function buildAdvisoriesJsonl() {
  return advisories.map((entry, index) => JSON.stringify({
    avis: `PT-AVIS-${String(index + 1).padStart(2, "0")}`,
    produit: entry.produit,
    version_touchee: entry.version_touchee,
    version_corrigee: entry.version_corrigee,
    contexte: entry.contexte,
  })).join("\n");
}

function buildEpssCsv() {
  const lines = [csvLine(["id", "epss", "kev", "fenetre_jours"])];
  for (const finding of findings) {
    lines.push(csvLine([finding.id, finding.epss.toFixed(3), finding.kev, "30"]));
  }
  return lines.join("\n");
}

function buildAssetsTxt() {
  const lines = [
    "Fiche actifs de la Coopérative Sahel-Vert",
    "Lecture : un actif est le couple hôte + service ; rang 5 = plus critique ; les rangs ne servent qu’à la priorisation interne du dossier",
    "Format : ACTIF|hote=...|service=...|criticite=...|rang=...|justification=...",
    "Note : un même hôte peut porter plusieurs services de criticité différente",
  ];
  for (const asset of assetCatalog) {
    lines.push(`ACTIF|hote=${asset.host}|service=${asset.service}|criticite=${asset.criticite}|rang=${asset.rang}|justification=${asset.justification}`);
  }
  lines.push("Synthèse : le portail de paie en https est le seul actif noté rang 5 dans ce dossier.");
  lines.push("Synthèse : le portail adhérents et l’extranet de stock portent des données métier mais restent derrière la paie.");
  lines.push("Synthèse : le site www sert surtout de vitrine publique et ne doit pas passer devant un actif métier à bande EPSS équivalente.");
  lines.push("Synthèse : les actifs de supervision n’emportent jamais la priorité face à un service métier de même bande EPSS.");
  lines.push("Synthèse : les justifications de criticité sont internes au client et n’expriment pas une sévérité CVSS.");
  lines.push("Synthèse : un actif KEV faux positif ne remonte pas dans le tri tant que le faux positif est documenté.");
  return lines.join("\n");
}

function buildGuideMd() {
  return [
    "# Guide du TP 4 : trier un rapport de scanner sans sur-réagir",
    "",
    "> Cadre et limites : tu analyses uniquement des fichiers fournis et fictifs. Ne lance aucun scan sur un système réel et ne teste rien sans autorisation écrite.",
    "> Les exemples de ce guide utilisent des valeurs inventées et un mini jeu de données local créé dans les blocs. Ils n’utilisent jamais les fichiers du labo.",
    "",
    "## 1. Ce que tu dois décider",
    "",
    "Alerte scanner ne veut pas dire constat confirmé. Tu dois d’abord déterminer si le constat est confirmé, faux positif ou non confirmable faute de preuve minimale.",
    "",
    "- **confirme** : la preuve minimale relie clairement le produit, la version ou le comportement observé à l’alerte ;",
    "- **faux positif** : la version réellement observée n’est pas touchée ou la signature matche un cas déjà corrigé ;",
    "- **preuve insuffisante** : le scanner donne une piste, mais la preuve minimale ne montre ni version utile, ni comportement exploitable, ni configuration assez précise.",
    "",
    "## 2. Les poids CVSS 3.1 à utiliser",
    "",
    "- AV : `N=0.85`, `A=0.62`, `L=0.55`, `P=0.20`",
    "- AC : `L=0.77`, `H=0.44`",
    "- PR si `S:U` : `N=0.85`, `L=0.62`, `H=0.27`",
    "- PR si `S:C` : `N=0.85`, `L=0.68`, `H=0.50`",
    "- UI : `N=0.85`, `R=0.62`",
    "- C, I, A : `H=0.56`, `L=0.22`, `N=0.00`",
    "",
    "## 3. Formule CVSS 3.1",
    "",
    "1. Calcule `ISS = 1 - (1-C) × (1-I) × (1-A)`.",
    "2. Si `S:U`, `Impact = 6.42 × ISS`.",
    "3. Si `S:C`, `Impact = 7.52 × (ISS - 0.029) - 3.25 × (ISS - 0.02)^15`.",
    "4. `Exploitability = 8.22 × AV × AC × PR × UI`.",
    "5. Si `Impact <= 0`, la note vaut `0.0`.",
    "6. Sinon :",
    "   - `S:U` : `Roundup(min(Impact + Exploitability, 10))`",
    "   - `S:C` : `Roundup(min(1.08 × (Impact + Exploitability), 10))`",
    "",
    "La fonction **Roundup** arrondit au dixième supérieur. Si le résultat tombe déjà exactement sur un dixième, il reste tel quel. Sinon, on monte au dixième suivant.",
    "",
    "## 4. Qualification d’une note",
    "",
    "- `0.0` : aucune",
    "- `0.1` à `3.9` : faible",
    "- `4.0` à `6.9` : moyenne",
    "- `7.0` à `8.9` : élevée",
    "- `9.0` à `10.0` : critique",
    "",
    "## 5. EPSS, KEV et règle de priorisation du dossier",
    "EPSS est une probabilité entre 0 et 1 d’exploitation observée dans les 30 jours, publiée par FIRST. KEV est le catalogue CISA des vulnérabilités exploitées connues ; ce n’est pas une mesure de gravité.",
    "Pour ce TP, trie dans cet ordre :",
    "",
    "1. exclus d’abord les lignes `faux_positif` et `preuve_insuffisante` ;",
    "2. parmi les constats confirmés, `kev=yes` passe avant `kev=no` ;",
    "3. ensuite compare la **bande EPSS** : `>=0.85` très haute, `0.60-0.849` haute, `0.30-0.599` moyenne, `<0.30` faible ;",
    "4. à bande EPSS identique, compare la criticité de l’actif : rang `5` avant `4`, puis `3`, puis `2` ;",
    "5. si le rang d’actif est identique, compare la valeur EPSS brute la plus haute ;",
    "6. s’il reste un ex æquo, garde l’identifiant le plus petit.",
    "",
    "Cette règle permet à un constat sur un actif métier critique de passer devant un constat presque équivalent sur un site vitrine, même si sa valeur EPSS brute est légèrement plus basse.",
    "",
    "## 6. Visionneuse du site",
    "",
    "Dans la visionneuse, ouvre d’abord le CSV du scanner pour repérer les identifiants `Vxx`, puis le fichier de validation pour voir le `statut` et la `decision_vecteur`, puis le CSV EPSS/KEV et enfin la fiche des actifs.",
    "",
    "## 7. Exemple Bash : filtrer les constats confirmés et compter les KEV",
    "",
    "```bash",
    "cat > demo-scanner.csv <<'EOF'",
    "id,produit",
    "V01,Exemple Portal",
    "V02,Exemple Queue",
    "V03,Exemple Cache",
    "EOF",
    "cat > demo-notes.txt <<'EOF'",
    "[V01] statut=confirme preuve=suffisante decision_vecteur=conserve vecteur_final=CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N",
    "[V02] statut=faux_positif preuve=suffisante decision_vecteur=rejete vecteur_final=-",
    "[V03] statut=confirme preuve=suffisante decision_vecteur=ajuste vecteur_final=CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N",
    "EOF",
    "cat > demo-epss.csv <<'EOF'",
    "id,epss,kev,fenetre_jours",
    "V01,0.812,yes,30",
    "V02,0.955,yes,30",
    "V03,0.421,no,30",
    "EOF",
    "grep 'statut=confirme' demo-notes.txt | cut -d']' -f1 | tr -d '[' | while read -r ident; do",
    "  awk -F, -v id=\"$ident\" 'NR>1 && $1==id && $3==\"yes\" { print $1 \" \" $2 }' demo-epss.csv",
    "done",
    "```",
    "",
    "## 8. Exemple PowerShell 5.1 : même tri sur des données inventées",
    "",
    "```powershell",
    "@(",
    "  'id,epss,kev,fenetre_jours',",
    "  'V01,0.812,yes,30',",
    "  'V02,0.955,yes,30',",
    "  'V03,0.421,no,30'",
    ") | Set-Content -Encoding UTF8 demo-epss.csv",
    "@(",
    "  '[V01] statut=confirme preuve=suffisante decision_vecteur=conserve vecteur_final=CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N',",
    "  '[V02] statut=faux_positif preuve=suffisante decision_vecteur=rejete vecteur_final=-',",
    "  '[V03] statut=confirme preuve=suffisante decision_vecteur=ajuste vecteur_final=CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N'",
    ") | Set-Content -Encoding UTF8 demo-notes.txt",
    "$confirmes = Get-Content -Encoding UTF8 demo-notes.txt | Where-Object { $_ -match 'statut=confirme' } | ForEach-Object {",
    "  if ($_ -match '^\\[(V\\d{2})\\]') { $Matches[1] }",
    "}",
    "Import-Csv -Encoding UTF8 demo-epss.csv | Where-Object { $_.kev -eq 'yes' -and $confirmes -contains $_.id } | ForEach-Object {",
    "  '{0} {1}' -f $_.id, $_.epss",
    "}",
    "```",
    "",
    "## 9. Exemple Bash : calculer une note CVSS sur un vecteur inventé",
    "",
    "Exemple avec des valeurs inventées, pas celles du labo : `CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N` donne `6.1` et la qualification `moyenne`.",
    "",
    "```bash",
    "awk 'BEGIN {",
    "  AV=0.85; AC=0.77; PR=0.85; UI=0.62; C=0.22; I=0.22; A=0.00;",
    "  ISS = 1 - ((1-C) * (1-I) * (1-A));",
    "  Impact = 7.52 * (ISS - 0.029) - 3.25 * ((ISS - 0.02)^15);",
    "  Exploitability = 8.22 * AV * AC * PR * UI;",
    "  Total = 1.08 * (Impact + Exploitability);",
    "  if (Total > 10) Total = 10;",
    "  scaled = int((Total * 100000) + 0.5);",
    "  if (scaled % 10000 == 0) score = scaled / 100000; else score = (int(scaled / 10000) + 1) / 10;",
    "  printf \"score=%.1f\\n\", score;",
    "}'",
    "```",
    "",
    "## 10. Exemple PowerShell 5.1 : même calcul sur un vecteur inventé",
    "",
    "```powershell",
    "$AV = 0.85; $AC = 0.77; $PR = 0.85; $UI = 0.62; $C = 0.22; $I = 0.22; $A = 0.00",
    "$ISS = 1 - ((1 - $C) * (1 - $I) * (1 - $A))",
    "$Impact = 7.52 * ($ISS - 0.029) - 3.25 * [Math]::Pow($ISS - 0.02, 15)",
    "$Exploitability = 8.22 * $AV * $AC * $PR * $UI",
    "$Total = 1.08 * ($Impact + $Exploitability)",
    "if ($Total -gt 10) { $Total = 10 }",
    "$scaled = [int][Math]::Round($Total * 100000, 0, [MidpointRounding]::AwayFromZero)",
    "if ($scaled % 10000 -eq 0) { $score = $scaled / 100000 } else { $score = ([Math]::Floor($scaled / 10000) + 1) / 10 }",
    "'score={0:N1}' -f $score",
    "```",
    "",
    "## 11. Ce qu’il faut vérifier avant de répondre",
    "",
    "- une seule ligne `faux_positif` et une seule ligne `preuve_insuffisante` doivent émerger du fichier de validation ;",
    "- les identifiants `Vxx` n’ont aucune sévérité implicite ;",
    "- tous les EPSS sont distincts ;",
    "- un `kev=yes` faux positif sort du classement prioritaire tant que le faux positif est documenté ;",
    "- la fiche actifs sert à départager les constats de même bande EPSS, pas à ignorer KEV.",
  ].join("\n")
    .replace(/\n\n##/g, "\n##")
    .replace(/\n\n>/g, "\n>")
    .replace(/\n\n```/g, "\n```");
}

function buildPtAssetsTp4() {
  const assetByKey = new Map(assetCatalog.map((entry) => [`${entry.host}|${entry.service}`, entry]));
  const scannerLines = findings.length;
  const falsePositiveId = findings.find((entry) => entry.statut === "faux_positif").id;
  const insufficientProofId = findings.find((entry) => entry.statut === "preuve_insuffisante").id;
  const confirmed = findings.filter((entry) => entry.statut === "confirme");
  const confirmedByHost = confirmed.reduce((map, entry) => map.set(entry.host, (map.get(entry.host) || 0) + 1), new Map());
  const topHost = [...confirmedByHost.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const cvssTaskId = "V10";
  const cvssTask = findings.find((entry) => entry.id === cvssTaskId);
  const cvssScore = cvssBaseScore(cvssTask.vecteur);
  const confirmedMaxEpss = confirmed.slice().sort((a, b) => b.epss - a.epss)[0];
  const confirmedKevCount = confirmed.filter((entry) => entry.kev === "yes").length;
  const topCriticalAsset = assetCatalog.slice().sort((a, b) => b.rang - a.rang || a.host.localeCompare(b.host) || a.service.localeCompare(b.service))[0];
  const confirmedOnTopCritical = confirmed
    .filter((entry) => entry.host === topCriticalAsset.host && entry.service === topCriticalAsset.service)
    .sort((a, b) => {
      const assetA = assetByKey.get(`${a.host}|${a.service}`);
      const assetB = assetByKey.get(`${b.host}|${b.service}`);
      const orderA = [a.kev === "yes" ? 1 : 0, epssBand(a.epss), assetA.rang, a.epss];
      const orderB = [b.kev === "yes" ? 1 : 0, epssBand(b.epss), assetB.rang, b.epss];
      return orderB.join("|").localeCompare(orderA.join("|")) || a.id.localeCompare(b.id);
    })[0];
  const fixedVersionProduct = "Nimbus Queue";
  const fixedVersion = advisories.find((entry) => entry.produit === fixedVersionProduct).version_corrigee;
  const keptVectorCount = confirmed.filter((entry) => entry.decision === "conserve").length;
  const contextPair = ["V18", "V19"];
  const contextWinner = "V18";
  const priorityRanking = confirmed.slice().sort((a, b) => {
    const assetA = assetByKey.get(`${a.host}|${a.service}`);
    const assetB = assetByKey.get(`${b.host}|${b.service}`);
    if ((b.kev === "yes") - (a.kev === "yes")) return (b.kev === "yes") - (a.kev === "yes");
    if (epssBand(b.epss) !== epssBand(a.epss)) return epssBand(b.epss) - epssBand(a.epss);
    if (assetB.rang !== assetA.rang) return assetB.rang - assetA.rang;
    if (b.epss !== a.epss) return b.epss - a.epss;
    return a.id.localeCompare(b.id);
  });
  const priority1 = priorityRanking[0];

  return {
    files: [
      { name: SCANNER_FILE, data: text(buildScannerCsv()) },
      { name: NOTES_FILE, data: text(buildNotesTxt()) },
      { name: ADVISORIES_FILE, data: text(buildAdvisoriesJsonl()) },
      { name: EPSS_FILE, data: text(buildEpssCsv()) },
      { name: ASSETS_FILE, data: text(buildAssetsTxt()) },
      { name: GUIDE_FILE, data: text(buildGuideMd()) },
    ],
    facts: {
      ptTp4: {
        assetNames: {
          scanner: SCANNER_FILE,
          notes: NOTES_FILE,
          advisories: ADVISORIES_FILE,
          epss: EPSS_FILE,
          assets: ASSETS_FILE,
          guide: GUIDE_FILE,
        },
        totalConstats: scannerLines,
        falsePositiveId,
        insufficientProofId,
        topConfirmedHost: topHost,
        cvssTaskId,
        cvssTaskScore: cvssScore,
        cvssTaskQualification: cvssQualification(cvssScore),
        maxConfirmedEpssId: confirmedMaxEpss.id,
        confirmedKevCount,
        topCriticalAsset: { host: topCriticalAsset.host, service: topCriticalAsset.service },
        topCriticalProduct: confirmedOnTopCritical.produit,
        fixedVersionProduct,
        fixedVersion,
        keptVectorCount,
        contextPair,
        contextWinner,
        priority1Id: priority1.id,
        priority1Epss: priority1.epss.toFixed(3),
        falseKevDecisionLetter: "c",
        confirmedCount: confirmed.length,
      },
    },
  };
}

module.exports = { buildPtAssetsTp4 };
