"use strict";

const LETTER_FILE = "pt-tp1-lettre-mission.md";
const ROE_FILE = "pt-tp1-regles-engagement.md";
const TARGETS_FILE = "pt-tp1-cibles-decouvertes.csv";
const ACTIONS_FILE = "pt-tp1-actions-proposees.csv";
const GUIDE_FILE = "pt-tp1-guide.md";

const RULES = {
  client: "Coopérative Sahel-Vert",
  provider: "Cabinet Harmattan",
  legalContact: "Rokia Bamba",
  techContact: "Ibrahim Sanou",
  missionStart: "2026-06-03",
  missionEnd: "2026-06-19",
  dailyWindowStart: "08:30",
  dailyWindowEnd: "18:00",
  allowedDomains: [
    "sahel-vert.example",
    "www.sahel-vert.example",
    "portail.sahel-vert.example",
    "mail.sahel-vert.example",
    "vpn.sahel-vert.example",
    "paie.sahel-vert.example",
    "stock.sahel-vert.example",
  ],
  lightScanBlock: "198.51.100.0/24",
  activeRanges: ["198.51.100.0/24"],
  neverFamilies: ["ingenierie_sociale", "force_brute", "modification_metier", "dos"],
  intensityOrder: { basse: 1, moyenne: 2, forte: 3 },
  maxIntensity: "moyenne",
  credentialTypes: ["application_auth", "vpn"],
  providedAccounts: {
    "portail.sahel-vert.example": "portail-audit",
    "stock.sahel-vert.example": "stock-audit",
  },
};

const text = (value) => Buffer.from(String(value).replace(/\r?\n/g, "\n"), "utf8");
const compact = (values) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const accentReplacements = [
  [/\bCooperative\b/g, "Coopérative"],
  [/\bRegles\b/g, "Règles"],
  [/\bregles\b/g, "règles"],
  [/\blegal\b/g, "légal"],
  [/\bdeontologie\b/g, "déontologie"],
  [/\bdecouvertes\b/g, "découvertes"],
  [/\bproposees\b/g, "proposées"],
  [/\bfrancais\b/g, "français"],
  [/\bdeja\b/g, "déjà"],
  [/\bperimetre\b/g, "périmètre"],
  [/\bPerimetre\b/g, "Périmètre"],
  [/\bactivites\b/g, "activités"],
  [/\bautorisees\b/g, "autorisées"],
  [/\bautorisee\b/g, "autorisée"],
  [/\bautorises\b/g, "autorisés"],
  [/\bautorise\b/g, "autorisé"],
  [/\bnecessaire\b/g, "nécessaire"],
  [/\breseau\b/g, "réseau"],
  [/\breseaux\b/g, "réseaux"],
  [/\bconfie\b/g, "confié"],
  [/\bconfiee\b/g, "confiée"],
  [/\bconfiees\b/g, "confiées"],
  [/\bconfies\b/g, "confiés"],
  [/\bcite\b/g, "cité"],
  [/\bcitee\b/g, "citée"],
  [/\bcites\b/g, "cités"],
  [/\becrit\b/g, "écrit"],
  [/\becrite\b/g, "écrite"],
  [/\becrites\b/g, "écrites"],
  [/\bmeme\b/g, "même"],
  [/\bdebut\b/g, "début"],
  [/\bdepart\b/g, "départ"],
  [/\barret\b/g, "arrêt"],
  [/\bfenetre\b/g, "fenêtre"],
  [/\brole\b/g, "rôle"],
  [/\bmetier\b/g, "métier"],
  [/\bintensite\b/g, "intensité"],
  [/\bdonnees\b/g, "données"],
  [/\bDonnees\b/g, "Données"],
  [/\bechantillon\b/g, "échantillon"],
  [/\blegere\b/g, "légère"],
  [/\blegeres\b/g, "légères"],
  [/\blegers\b/g, "légers"],
  [/\blegerement\b/g, "légèrement"],
  [/\bcomplementaire\b/g, "complémentaire"],
  [/\bvolumetrie\b/g, "volumétrie"],
  [/\bminimisee\b/g, "minimisée"],
  [/\bescalation\b/g, "escalade"],
  [/\blegitimite\b/g, "légitimité"],
  [/\bambiguite\b/g, "ambiguïté"],
  [/\bproximite\b/g, "proximité"],
  [/\bcompletent\b/g, "complètent"],
  [/\bajoutee\b/g, "ajoutée"],
  [/\bau dela\b/g, "au-delà"],
  [/\bpre cadrage\b/g, "pré-cadrage"],
  [/\bcote\b/g, "côté"],
  [/\bsignee\b/g, "signée"],
  [/\bsignees\b/g, "signées"],
  [/\bsignes\b/g, "signés"],
  [/\bgenérique\b/g, "générique"],
  [/\bscenario\b/g, "scénario"],
  [/\bmethode\b/g, "méthode"],
  [/\bdetail\b/g, "détail"],
  [/\bevite\b/g, "évite"],
  [/\bverifier\b/g, "vérifier"],
  [/\bdecision\b/g, "décision"],
  [/\bcloture\b/g, "clôture"],
  [/\bequipe\b/g, "équipe"],
  [/\breleve\b/g, "relève"],
  [/\bclarifie\b/g, "clarifié"],
];

function fr(value) {
  let result = String(value);
  for (const [pattern, replacement] of accentReplacements) result = result.replace(pattern, replacement);
  return result;
}

function ipToInt(value) {
  return String(value).split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function cidrRange(cidr) {
  const [ip, prefixText] = String(cidr).split("/");
  const prefix = Number(prefixText);
  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  const base = ipToInt(ip) & mask;
  const size = 2 ** (32 - prefix);
  return { start: base >>> 0, end: (base + size - 1) >>> 0 };
}

function isIp(value) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/u.test(String(value));
}

function isCidr(value) {
  return /^\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}$/u.test(String(value));
}

function blockContains(block, ip) {
  if (!isIp(ip)) return false;
  const { start, end } = cidrRange(block);
  const numeric = ipToInt(ip);
  return numeric >= start && numeric <= end;
}

function cidrContained(inner, outer) {
  const a = cidrRange(inner);
  const b = cidrRange(outer);
  return a.start >= b.start && a.end <= b.end;
}

function withinActiveRanges(value) {
  return RULES.activeRanges.some((block) => (isCidr(value) ? cidrContained(value, block) : blockContains(block, value)));
}

function targetStatus(target) {
  if (target.doute === "yes") return "clarify";

  if (isIp(target.cible) || isCidr(target.cible)) {
    return withinActiveRanges(target.cible) ? "in" : "out";
  }

  if (RULES.allowedDomains.includes(target.cible)) {
    return withinActiveRanges(target.ip_observee) ? "in" : "out";
  }

  if (target.cible.endsWith(".sahel-vert.example")) return "clarify";
  return "out";
}

function actionStatus(action, targetsById) {
  const target = targetsById.get(action.cible_id);
  const status = targetStatus(target);
  const intensity = RULES.intensityOrder[action.intensite];
  const maxIntensity = RULES.intensityOrder[RULES.maxIntensity];

  if (status === "out") return "forbidden";
  if (RULES.neverFamilies.includes(action.famille)) return "forbidden";
  if (intensity > maxIntensity) return "forbidden";
  if (action.horaire_utc < RULES.dailyWindowStart || action.horaire_utc > RULES.dailyWindowEnd) return "forbidden";
  if (status === "clarify") return "clarify";
  if (action.validation_requise === RULES.legalContact) return "clarify";
  if (RULES.credentialTypes.includes(target.type) && !RULES.providedAccounts[target.cible] && action.famille !== "passive") return "clarify";
  return "allowed";
}

const targets = [
  { id: "T01", cible: "sahel-vert.example", type: "site_vitrine", source: "registre-dns", ip_observee: "198.51.100.10", justification: "apex public annonce par le client", doute: "no" },
  { id: "T02", cible: "www.sahel-vert.example", type: "site_vitrine", source: "registre-dns", ip_observee: "198.51.100.10", justification: "alias public du site vitrine", doute: "no" },
  { id: "T03", cible: "portail.sahel-vert.example", type: "application_auth", source: "registre-dns", ip_observee: "198.51.100.21", justification: "portail adhérents explicitement confié", doute: "no" },
  { id: "T04", cible: "mail.sahel-vert.example", type: "messagerie", source: "registre-dns", ip_observee: "198.51.100.25", justification: "webmail cité dans la lettre", doute: "no" },
  { id: "T05", cible: "vpn.sahel-vert.example", type: "vpn", source: "registre-dns", ip_observee: "198.51.100.30", justification: "passerelle VPN du client", doute: "no" },
  { id: "T06", cible: "paie.sahel-vert.example", type: "application_auth", source: "registre-dns", ip_observee: "198.51.100.41", justification: "application paie explicitement citée", doute: "no" },
  { id: "T07", cible: "stock.sahel-vert.example", type: "application_auth", source: "registre-dns", ip_observee: "198.51.100.42", justification: "gestion de stock confiée au test", doute: "no" },
  { id: "T08", cible: "198.51.100.0/28", type: "plage_publique", source: "inventaire-yao", ip_observee: "198.51.100.0/28", justification: "petite DMZ publique confirmée", doute: "no" },
  { id: "T09", cible: "198.51.100.21", type: "hote_public", source: "inventaire-yao", ip_observee: "198.51.100.21", justification: "hôte du portail relevé par Yao", doute: "no" },
  { id: "T10", cible: "198.51.100.42", type: "hote_public", source: "inventaire-yao", ip_observee: "198.51.100.42", justification: "hôte du stock relevé par Yao", doute: "no" },
  { id: "T11", cible: "198.51.100.48/29", type: "plage_publique", source: "inventaire-yao", ip_observee: "198.51.100.48/29", justification: "segment public à faible volumétrie", doute: "no" },
  { id: "T12", cible: "api.sahel-vert.example", type: "api", source: "journal-ct", ip_observee: "198.51.100.60", justification: "sous-domaine non cité dans la lettre", doute: "yes" },
  { id: "T13", cible: "cdn-partenaire.example", type: "proxy", source: "en-tete-http", ip_observee: "203.0.113.60", justification: "nom tiers hors de la liste du client", doute: "no" },
  { id: "T14", cible: "stock.sahel-vert.example", type: "application_auth", source: "tableur-client", ip_observee: "198.51.101.44", justification: "nom correct mais bloc voisin non autorisé", doute: "no" },
  { id: "T15", cible: "sahelvert.example", type: "site_vitrine", source: "note-ancienne", ip_observee: "198.51.100.200", justification: "faute de frappe sans tiret", doute: "no" },
  { id: "T16", cible: "rh-externe.example", type: "tiers_rh", source: "mail-client", ip_observee: "203.0.113.88", justification: "prestataire RH hors mission", doute: "no" },
  { id: "T17", cible: "fournisseur-sahel.example", type: "partenaire", source: "whois", ip_observee: "203.0.113.77", justification: "portail partenaire non confié", doute: "no" },
  { id: "T18", cible: "203.0.113.0/24", type: "plage_tierce", source: "inventaire-yao", ip_observee: "203.0.113.0/24", justification: "bloc tiers réservé à la messagerie gérée", doute: "no" },
  { id: "T19", cible: "172.31.20.0/24", type: "reseau_interne", source: "inventaire-client", ip_observee: "172.31.20.0/24", justification: "réseau interne explicitement exclu", doute: "no" },
  { id: "T20", cible: "10.50.8.0/24", type: "reseau_interne", source: "inventaire-client", ip_observee: "10.50.8.0/24", justification: "segment paie interne exclu", doute: "no" },
  { id: "T21", cible: "mailsahel-vert.example", type: "site_vitrine", source: "tableur-client", ip_observee: "198.51.100.125", justification: "nom incohérent sans point", doute: "no" },
  { id: "T22", cible: "198.51.99.44", type: "hote_public", source: "inventaire-yao", ip_observee: "198.51.99.44", justification: "bloc voisin non cité", doute: "no" },
  { id: "T23", cible: "paie-rh.example", type: "tiers_rh", source: "whois", ip_observee: "203.0.113.91", justification: "prestataire tiers distinct du client", doute: "no" },
  { id: "T24", cible: "203.0.113.54", type: "hote_tiers", source: "note-yao", ip_observee: "203.0.113.54", justification: "hébergement tiers hors mission", doute: "no" },
  { id: "T25", cible: "10.50.99.10", type: "hote_interne", source: "note-yao", ip_observee: "10.50.99.10", justification: "hôte interne du client hors test externe", doute: "no" },
  { id: "T26", cible: "extranet-harmattan.example", type: "prestataire", source: "mail-client", ip_observee: "198.51.100.170", justification: "outil du prestataire pas cible du client", doute: "no" },
  { id: "T27", cible: "paie-support.example", type: "tiers_support", source: "whois", ip_observee: "203.0.113.41", justification: "support externe non signé", doute: "no" },
  { id: "T28", cible: "198.51.101.0/28", type: "plage_publique", source: "inventaire-yao", ip_observee: "198.51.101.0/28", justification: "plage voisine hors du bloc autorisé", doute: "no" },
  { id: "T29", cible: "partenaire-coop.example", type: "partenaire", source: "mail-client", ip_observee: "203.0.113.142", justification: "partenaire commercial hors signature", doute: "no" },
  { id: "T30", cible: "old-sahel-vert.net", type: "site_archive", source: "archive-web", ip_observee: "203.0.113.151", justification: "ancien domaine non confié", doute: "no" },
];

const actions = [
  { id: "A01", action: "consulter les DNS publics de l apex", cible_id: "T01", cible: "sahel-vert.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "09:00", justification: "lecture documentaire sans authentification" },
  { id: "A02", action: "lire les en-têtes HTTP du site vitrine", cible_id: "T02", cible: "www.sahel-vert.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "09:05", justification: "contrôle léger de la surface exposée" },
  { id: "A03", action: "relever le certificat TLS du portail", cible_id: "T03", cible: "portail.sahel-vert.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "09:10", justification: "preuve minimale sur un service public" },
  { id: "A04", action: "relever la bannière SMTP visible", cible_id: "T04", cible: "mail.sahel-vert.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "09:12", justification: "lecture légère du service de messagerie" },
  { id: "A05", action: "ouvrir la page d’accueil du site", cible_id: "T01", cible: "sahel-vert.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "09:14", justification: "vérifier la publication publique" },
  { id: "A06", action: "lire robots txt du site vitrine", cible_id: "T02", cible: "www.sahel-vert.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "09:16", justification: "collecte passive du plan visible" },
  { id: "A07", action: "ouvrir le portail avec le compte de test fourni", cible_id: "T03", cible: "portail.sahel-vert.example", famille: "authentifie", validation_requise: "aucune", intensite: "basse", horaire_utc: "09:30", justification: "compte de test déjà livré" },
  { id: "A08", action: "parcourir l’inventaire du stock avec le compte fourni", cible_id: "T07", cible: "stock.sahel-vert.example", famille: "authentifie", validation_requise: "aucune", intensite: "basse", horaire_utc: "09:40", justification: "compte de test déjà livré" },
  { id: "A09", action: "scanner légèrement les ports 80 et 443 de l’hôte du portail", cible_id: "T09", cible: "198.51.100.21", famille: "scan_leger", validation_requise: "aucune", intensite: "moyenne", horaire_utc: "10:00", justification: "deux ports publics dans la plage autorisée" },
  { id: "A10", action: "scanner légèrement le segment public à faible volume", cible_id: "T11", cible: "198.51.100.48/29", famille: "scan_leger", validation_requise: "aucune", intensite: "moyenne", horaire_utc: "10:20", justification: "segment compris dans le bloc public autorisé" },
  { id: "A11", action: "consulter l’API découverte dans le journal CT", cible_id: "T12", cible: "api.sahel-vert.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "10:30", justification: "sous-domaine non confirmé par la lettre" },
  { id: "A12", action: "exporter un échantillon de fiches de paie de démonstration", cible_id: "T06", cible: "paie.sahel-vert.example", famille: "preuve_minimale", validation_requise: "Rokia Bamba", intensite: "basse", horaire_utc: "11:00", justification: "preuve à valider par la responsable juridique" },
  { id: "A13", action: "se connecter à la paie avec un compte à fournir", cible_id: "T06", cible: "paie.sahel-vert.example", famille: "authentifie", validation_requise: "Ibrahim Sanou", intensite: "basse", horaire_utc: "11:20", justification: "aucun compte de test encore livré" },
  { id: "A14", action: "ouvrir une session VPN avec un compte à fournir", cible_id: "T05", cible: "vpn.sahel-vert.example", famille: "authentifie", validation_requise: "Ibrahim Sanou", intensite: "basse", horaire_utc: "11:40", justification: "aucun compte de test encore livré" },
  { id: "A15", action: "lancer une campagne de phishing MFA", cible_id: "T03", cible: "portail.sahel-vert.example", famille: "ingenierie_sociale", validation_requise: "aucune", intensite: "basse", horaire_utc: "13:00", justification: "action explicitement jamais autorisée" },
  { id: "A16", action: "forcer une série de mots de passe sur le VPN", cible_id: "T05", cible: "vpn.sahel-vert.example", famille: "force_brute", validation_requise: "aucune", intensite: "moyenne", horaire_utc: "13:10", justification: "action explicitement jamais autorisée" },
  { id: "A17", action: "supprimer une commande de test dans le stock", cible_id: "T07", cible: "stock.sahel-vert.example", famille: "modification_metier", validation_requise: "aucune", intensite: "basse", horaire_utc: "13:20", justification: "modification métier interdite" },
  { id: "A18", action: "scanner tous les ports de l’hôte du stock", cible_id: "T10", cible: "198.51.100.42", famille: "scan_leger", validation_requise: "aucune", intensite: "forte", horaire_utc: "13:30", justification: "intensité supérieure au plafond autorisé" },
  { id: "A19", action: "consulter le site RH externe", cible_id: "T16", cible: "rh-externe.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "13:40", justification: "cible explicitement hors mission" },
  { id: "A20", action: "consulter le WHOIS du partenaire fournisseur", cible_id: "T17", cible: "fournisseur-sahel.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "13:45", justification: "partenaire tiers hors mission" },
  { id: "A21", action: "relever le certificat du CDN tiers", cible_id: "T13", cible: "cdn-partenaire.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "13:50", justification: "nom tiers non confie par le client" },
  { id: "A22", action: "scanner légèrement l’hôte tiers 203 0 113 54", cible_id: "T24", cible: "203.0.113.54", famille: "scan_leger", validation_requise: "aucune", intensite: "moyenne", horaire_utc: "14:00", justification: "hébergement tiers hors mission" },
  { id: "A23", action: "scanner légèrement le réseau interne 172 31 20 0 24", cible_id: "T19", cible: "172.31.20.0/24", famille: "scan_leger", validation_requise: "aucune", intensite: "moyenne", horaire_utc: "14:05", justification: "réseau interne exclu du test externe" },
  { id: "A24", action: "relever le WHOIS du domaine sahelvert sans tiret", cible_id: "T15", cible: "sahelvert.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "14:10", justification: "nom fautif hors liste de mission" },
  { id: "A25", action: "lire les en-têtes HTTP de 198 51 99 44", cible_id: "T22", cible: "198.51.99.44", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "14:20", justification: "bloc voisin non confié" },
  { id: "A26", action: "scanner légèrement l’hôte du portail avant la fenêtre", cible_id: "T09", cible: "198.51.100.21", famille: "scan_leger", validation_requise: "aucune", intensite: "basse", horaire_utc: "06:45", justification: "horaire en dehors de la fenêtre quotidienne" },
  { id: "A27", action: "consulter le certificat du partenaire commercial", cible_id: "T29", cible: "partenaire-coop.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "14:25", justification: "partenaire hors mission signée" },
  { id: "A28", action: "lire la page du stock résolu hors bloc", cible_id: "T14", cible: "stock.sahel-vert.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "14:30", justification: "nom correct mais IP hors de la plage autorisée" },
  { id: "A29", action: "consulter le fichier MX publié pour la messagerie", cible_id: "T04", cible: "mail.sahel-vert.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "14:40", justification: "lecture passive du service mail" },
  { id: "A30", action: "ouvrir la page d’accueil du VPN sans se connecter", cible_id: "T05", cible: "vpn.sahel-vert.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "14:50", justification: "vérification passive de la présence du service" },
  { id: "A31", action: "consulter les mentions légales du site vitrine", cible_id: "T02", cible: "www.sahel-vert.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "15:00", justification: "lecture passive d’une page publique" },
  { id: "A32", action: "relever le certificat TLS du webmail", cible_id: "T04", cible: "mail.sahel-vert.example", famille: "passive", validation_requise: "aucune", intensite: "basse", horaire_utc: "15:10", justification: "preuve minimale sur un service public" },
];

function csvLine(values) {
  return values.map((value) => String(value)).join(",");
}

function buildTargetsCsv() {
  return [
    csvLine(["id", "cible", "type", "source", "ip_observee", "justification", "doute"]),
    ...targets.map((target) => csvLine([target.id, target.cible, target.type, target.source, target.ip_observee, fr(target.justification), target.doute])),
  ].join("\n");
}

function buildActionsCsv() {
  return [
    csvLine(["id", "action", "cible_id", "cible", "famille", "validation_requise", "intensite", "horaire_utc", "justification"]),
    ...actions.map((action) => csvLine([action.id, fr(action.action), action.cible_id, action.cible, action.famille, action.validation_requise, action.intensite, action.horaire_utc, fr(action.justification)])),
  ].join("\n");
}

function buildLetter() {
  return [
    "# Lettre de mission",
    "",
    "## 1. Identification de la mission",
    "",
    `- Client : ${RULES.client}`,
    `- Prestataire : ${RULES.provider}`,
    "- Objet : cadrage d’un test externe à faible impact",
    `- Début des activités autorisées : ${RULES.missionStart}`,
    `- Fin des activités autorisées : ${RULES.missionEnd}`,
    "- Langue de travail : français",
    "- Livrables attendus : journal de mission et note de cadrage",
    "",
    "## 2. Cadre légal et déontologie",
    "",
    "- Toute action doit rester dans le périmètre explicitement écrit ci-dessous.",
    "- Aucun acte ne vaut accord implicite pour un partenaire ou un sous-traitant.",
    "- La mission vise à vérifier l’exposition et à prioriser des suites défensives.",
    "- Les preuves doivent rester minimales et liées à l’objectif de cadrage.",
    "- Toute donnée sensible observée doit être signalée comme sensible et minimisée.",
    "- Aucune loi réelle n’est citée dans ce document ; les règles viennent du présent mandat fictif.",
    "",
    "## 3. Objectifs assignés",
    "",
    "- Vérifier que l’équipe lit correctement la lettre avant toute action.",
    "- Distinguer les cibles nettement confiées des cibles voisines ou tierces.",
    "- Distinguer les actions directement autorisées des actions bloquées ou à clarifier.",
    "- Confirmer la fenêtre quotidienne et les contacts d’escalade.",
    "- Identifier les actifs qui exigent un compte de test avant toute action authentifiée.",
    "",
    "## 4. Périmètre explicitement confié",
    "",
    "- Noms de domaine et services confiés :",
    ...RULES.allowedDomains.map((domain) => `  - ${domain}`),
    `- Bloc public autorisé pour les scans légers : ${RULES.lightScanBlock}`,
    "- Segment public complémentaire autorisé seulement en revue documentaire : aucun",
    "- Les cibles internes ne font pas partie de ce cadrage externe.",
    "",
    "## 5. Cibles hors périmètre par principe",
    "",
    "- Toute cible partenaire ou fournisseur non signée par le client.",
    "- Toute cible RH externe ou portail social distinct du client.",
    "- Toute plage interne du client non exposée publiquement.",
    "- Tout domaine comportant une faute de frappe ou un ancien suffixe.",
    "- Tout sous-domaine non cité dans la présente lettre reste à confirmer avant action.",
    "",
    "## 6. Comptes de test fournis au départ",
    "",
    "- Le client a livré uniquement les comptes suivants :",
    `  - portail.sahel-vert.example -> ${RULES.providedAccounts["portail.sahel-vert.example"]}`,
    `  - stock.sahel-vert.example -> ${RULES.providedAccounts["stock.sahel-vert.example"]}`,
    "- Aucun compte n’est livré au départ pour le VPN.",
    "- Aucun compte n’est livré au départ pour l’application de paie.",
    "- Sans compte livré, le testeur s’arrête à la lecture passive et à la demande formelle.",
    "",
    "## 7. Données sensibles et preuves",
    "",
    "- Les preuves sur la paie restent minimales et doivent être validées avant extraction.",
    "- Les données personnelles ne sortent pas du cadre convenu sans validation écrite.",
    "- Une preuve minimale vaut mieux qu’une copie complète d’écran ou de table.",
    "- Les identifiants observés sont traités comme des données sensibles de mission.",
    "",
    "## 8. Contacts autorisés",
    "",
    "- Cheffe de mission côté prestataire : Mariam Diallo",
    "- Testeur en charge du pré-cadrage : Yao Kouassi",
    "- Contact technique d’urgence : Ibrahim Sanou - directeur informatique du client",
    "- Contact juridique pour toute question de légitimité ou de données : Rokia Bamba - responsable juridique du client",
    "",
    "## 9. Règles de décision à appliquer",
    "",
    "- Un nom exactement listé et porté par le bon bloc public entre en périmètre.",
    "- Un nom exact résolu hors des blocs autorisés sort du périmètre pour raison réseau.",
    "- Un sous-domaine de sahel-vert.example non écrit ici ne devient pas autorisé par simple proximité.",
    "- Une action passive sur une cible hors périmètre reste hors périmètre.",
    "- Une action sur une bonne cible peut rester interdite par les règles d’engagement.",
    "",
    "## 10. Livrables et clôture",
    "",
    "- Le cadrage attendu tient sur une note claire avant toute action technique.",
    "- Les propositions doivent être classées en périmètre, interdit ou à clarifier.",
    "- Toute ambiguïté doit citer la phrase de la lettre ou des règles qui manque.",
    "- La mission se termine par un rappel des conditions d’arrêt et des comptes manquants.",
    "",
    "## 11. Rappel final",
    "",
    "- Sans accord écrit explicite, une cible ou une action n’est pas ajoutée par déduction.",
    "- Lis cette lettre avant de lire la liste des cibles et des actions proposées.",
    "- Les règles d’engagement complètent cette lettre et peuvent interdire une action autrement plausible.",
  ].join("\n");
}

function buildRoe() {
  return [
    "# Règles d’engagement",
    "",
    "## 1. Fenêtre et rythme",
    "",
    `- Fenêtre quotidienne autorisée : ${RULES.dailyWindowStart}Z à ${RULES.dailyWindowEnd}Z`,
    `- Heure limite d’arrêt quotidien : ${RULES.dailyWindowEnd}Z`,
    "- Aucun test actif avant l’ouverture quotidienne.",
    "- Aucun test actif après l’heure limite d’arrêt.",
    "- Toute action hors fenêtre est interdite même si la cible est bonne.",
    "",
    "## 2. Intensité maximale",
    "",
    "- L’intensité maximale autorisée pour un scan léger est moyenne.",
    "- Une action marquée forte dépasse le plafond de charge.",
    "- Une action marquée basse reste privilégiée pour les lectures et sondes simples.",
    "- Les scans portent au plus sur un nombre réduit de ports publics convenus.",
    "",
    "## 3. Actions jamais autorisées",
    "",
    "- ingenierie_sociale",
    "- force_brute",
    "- modification_metier",
    "- dos",
    "- Toute destruction de données ou tout contournement de validation métier.",
    "",
    "## 4. Actions autorisées dans la limite du périmètre",
    "",
    "- Lecture passive des DNS publics.",
    "- Lecture des en-têtes HTTP et des certificats publics.",
    "- Scan léger des ports 80 et 443 sur le bloc public autorisé.",
    "- Connexion avec un compte de test explicitement livré par le client.",
    "",
    "## 5. Comptes de test et actions authentifiées",
    "",
    "- Toute action authentifiée sur un portail applicatif ou sur le VPN suppose un compte de test déjà livré.",
    "- Portail et stock disposent d’un compte livré au départ.",
    "- Paie et VPN restent bloqués tant qu’Ibrahim Sanou n’a pas livré le compte promis.",
    "- Sans compte livré, la bonne décision consiste à demander le compte et à suspendre l’action.",
    "",
    "## 6. Clarifications juridiques et métier",
    "",
    "- Toute preuve touchant la paie ou des données personnelles sensibles requiert une validation explicite de Rokia Bamba.",
    "- Une action demandant cette validation entre dans la colonne à clarifier et non dans la colonne autorisée.",
    "- Une preuve minimale approuvée vaut mieux qu’un export volumineux.",
    "",
    "## 7. Contacts et escalade",
    "",
    "- Contact technique d’urgence : Ibrahim Sanou - directeur informatique du client",
    "- Contact juridique : Rokia Bamba - responsable juridique du client",
    "- Cheffe de mission côté prestataire : Mariam Diallo",
    "- Testeur côté prestataire : Yao Kouassi",
    "- Canal d’urgence : appel puis confirmation écrite dans le journal de mission",
    "",
    "## 8. Conditions d’arrêt",
    "",
    "- Arrêt immédiat si la disponibilité semble menacée.",
    "- Arrêt immédiat si une action touche une cible non confiée.",
    "- Arrêt immédiat si une donnée sensible apparaît au-delà de la preuve minimale convenue.",
    "- Arrêt immédiat si une charge forte était envisagée par erreur.",
    "",
    "## 9. Rappels de classification",
    "",
    "- Une bonne cible avec une famille jamais autorisée devient interdite.",
    "- Une bonne cible sans compte livré pour une action authentifiée devient à clarifier.",
    "- Une cible hors périmètre reste interdite même pour une action passive.",
    "- Un sous-domaine non écrit dans la lettre doit être clarifié avant toute action.",
    "- Une action passive n’est jamais une excuse pour toucher un actif tiers.",
    "- Une clarification obtenue oralement doit être relayée par écrit avant exécution.",
    "",
    "## 10. Exemples de bonne lecture",
    "",
    "- Un scan léger à 10:00Z sur 198.51.100.21 peut entrer dans le cadre.",
    "- Un scan fort sur la même cible reste interdit par la charge.",
    "- Une collecte sur paie peut entrer en périmètre tout en restant bloquée par l’absence de compte ou de validation juridique.",
    "- Une lecture sur un partenaire reste hors mission même si elle semble inoffensive.",
    "",
    "## 11. Règle finale",
    "",
    "- Avant toute action, croise la cible, la famille, l’intensité, l’horaire et les comptes fournis.",
    "- Si un seul de ces points manque ou contredit les ROE, classe l’action hors autorisation immédiate.",
  ].join("\n");
}

function buildGuide() {
  return [
    "# Guide du TP 1",
    "",
    "> Cadre et limites : tu analyses uniquement des fichiers fournis ; ne teste jamais un système réel sans autorisation écrite.",
    "> Les exemples ci-dessous utilisent des valeurs inventées hors du scénario ; ils montrent une méthode et jamais une réponse du labo.",
    "",
    "## 1. Classer une cible",
    "",
    "Lis d’abord la liste exacte des noms et des blocs autorisés dans la lettre de mission.",
    "Ensuite, classe chaque ligne de cibles découvertes avec trois questions simples : le nom est-il exactement listé ; l’adresse observée appartient-elle au bon bloc ; un doute explicite reste-t-il écrit dans la ligne ?",
    "Si le nom est exact et le bloc correct, tu ranges en périmètre.",
    "Si le nom est bon mais que le bloc sort de la plage autorisée, tu ranges hors périmètre pour raison réseau.",
    "Si le nom ressemble au client mais n’apparaît pas dans la liste exacte, tu ranges à clarifier tant que la lettre ne le confirme pas.",
    "",
    "## 2. Classer une action",
    "",
    "Une action se lit en croisant la cible, la famille, l’intensité, l’horaire et les comptes de test.",
    "Une action passive sur une cible hors périmètre reste interdite.",
    "Une bonne cible n’autorise pas tout : la famille peut être dans la liste jamais autorisée, l’intensité peut dépasser le plafond, ou l’action peut tomber hors fenêtre.",
    "Si une action authentifiée vise un portail sans compte livré, elle ne devient pas autorisée par optimisme : elle reste à clarifier.",
    "Si une preuve touche des données sensibles, cherche si un contact juridique doit valider avant exécution.",
    "",
    "## 3. Visionneuse du site",
    "",
    "Dans la visionneuse, commence par rechercher les mots « autorisé », « jamais », « compte » et « doute ». Note ensuite un tableau à trois colonnes : en périmètre, interdit, à clarifier.",
    "",
    "## 4. Exemple Bash sur des cibles inventées",
    "",
    "```bash",
    "cat > guide-cibles.csv <<'EOF'",
    "id,cible,type,source,ip_observee,justification,doute",
    "X01,atelier-baobab.example,site,registre-dns,192.0.2.10,nom exact,no",
    "X02,api.atelier-baobab.example,api,journal-ct,192.0.2.11,sous-domaine non cité,yes",
    "X03,atelier-baobab.example,site,note,192.0.3.10,bloc voisin,no",
    "EOF",
    "awk -F, 'NR>1 {",
    "  if ($7==\"yes\") print $1 \": clarifier\";",
    "  else if ($2==\"atelier-baobab.example\" && $5 ~ /^192\\.0\\.2\\./) print $1 \": en-périmètre\";",
    "  else print $1 \": interdit\";",
    "}' guide-cibles.csv",
    "```",
    "",
    "## 5. Exemple PowerShell 5.1 sur des cibles inventées",
    "",
    "```powershell",
    "@(",
    "  'id,cible,type,source,ip_observee,justification,doute',",
    "  'X01,atelier-baobab.example,site,registre-dns,192.0.2.10,nom exact,no',",
    "  'X02,api.atelier-baobab.example,api,journal-ct,192.0.2.11,sous-domaine non cité,yes',",
    "  'X03,atelier-baobab.example,site,note,192.0.3.10,bloc voisin,no'",
    ") | Set-Content -Encoding UTF8 guide-cibles.csv",
    "Import-Csv -Encoding UTF8 guide-cibles.csv | ForEach-Object {",
    "  if ($_.doute -eq 'yes') { \"$($_.id): clarifier\" }",
    "  elseif ($_.cible -eq 'atelier-baobab.example' -and $_.ip_observee -like '192.0.2.*') { \"$($_.id): en-périmètre\" }",
    "  else { \"$($_.id): interdit\" }",
    "}",
    "```",
    "",
    "## 6. Exemple Bash sur des actions inventées",
    "",
    "```bash",
    "cat > guide-actions.csv <<'EOF'",
    "id,action,cible,famille,validation_requise,intensite,horaire_utc",
    "B01,lire les DNS,atelier-baobab.example,passive,aucune,basse,09:00",
    "B02,ouvrir le portail sans compte,espace-client.example,authentifie,aucune,basse,09:10",
    "B03,phishing MFA,atelier-baobab.example,ingenierie_sociale,aucune,basse,09:20",
    "EOF",
    "awk -F, 'NR>1 {",
    "  if ($4==\"ingenierie_sociale\") print $1 \": interdit\";",
    "  else if ($4==\"authentifie\") print $1 \": clarifier\";",
    "  else print $1 \": autorisé\";",
    "}' guide-actions.csv",
    "```",
    "",
    "## 7. Exemple PowerShell 5.1 sur des actions inventées",
    "",
    "```powershell",
    "@(",
    "  'id,action,cible,famille,validation_requise,intensite,horaire_utc',",
    "  'B01,lire les DNS,atelier-baobab.example,passive,aucune,basse,09:00',",
    "  'B02,ouvrir le portail sans compte,espace-client.example,authentifie,aucune,basse,09:10',",
    "  'B03,phishing MFA,atelier-baobab.example,ingenierie_sociale,aucune,basse,09:20'",
    ") | Set-Content -Encoding UTF8 guide-actions.csv",
    "Import-Csv -Encoding UTF8 guide-actions.csv | ForEach-Object {",
    "  if ($_.famille -eq 'ingenierie_sociale') { \"$($_.id): interdit\" }",
    "  elseif ($_.famille -eq 'authentifie') { \"$($_.id): clarifier\" }",
    "  else { \"$($_.id): autorisé\" }",
    "}",
    "```",
    "",
    "## 8. Check-list avant de répondre",
    "",
    "- Pour une cible : nom exact, bon bloc, doute éventuel.",
    "- Pour une action : cible, famille, intensité, horaire, compte de test, validation juridique.",
    "- Pour un comptage : écris d’abord la règle de ce qui compte avant de sommer.",
  ].join("\n");
}

function buildPtAssetsTp1() {
  const targetsById = new Map(targets.map((target) => [target.id, target]));
  const targetStatuses = targets.map((target) => ({ target, status: targetStatus(target) }));
  const actionStatuses = actions.map((action) => ({ action, status: actionStatus(action, targetsById) }));
  const inScopeTargets = targetStatuses.filter((entry) => entry.status === "in");
  const forbiddenActions = actionStatuses.filter((entry) => entry.status === "forbidden");
  const passiveAllowed = actionStatuses.filter((entry) => entry.status === "allowed" && entry.action.famille === "passive");
  const noAccountTargets = targetStatuses.filter((entry) => entry.status === "in" && RULES.credentialTypes.includes(entry.target.type) && !RULES.providedAccounts[entry.target.cible]);

  return {
    files: [
      { name: LETTER_FILE, data: text(buildLetter()) },
      { name: ROE_FILE, data: text(buildRoe()) },
      { name: TARGETS_FILE, data: text(buildTargetsCsv()) },
      { name: ACTIONS_FILE, data: text(buildActionsCsv()) },
      { name: GUIDE_FILE, data: text(buildGuide()) },
    ],
    facts: {
      ptTp1: {
        assetNames: {
          lettre: LETTER_FILE,
          regles: ROE_FILE,
          cibles: TARGETS_FILE,
          actions: ACTIONS_FILE,
          guide: GUIDE_FILE,
        },
        exactInScopeLetter: "c",
        inScopeCount: inScopeTargets.length,
        clarificationTarget: "api.sahel-vert.example",
        forbiddenActionCount: forbiddenActions.length,
        missionStart: RULES.missionStart,
        dailyStopTime: RULES.dailyWindowEnd,
        emergencyContact: "Ibrahim Sanou - directeur informatique du client",
        legalClarificationActionId: "A12",
        passiveAllowedCount: passiveAllowed.length,
        lightScanBlock: RULES.lightScanBlock,
        networkOnlyOutTargetId: "T14",
        neverActionId: "A15",
        noAccountInScopeCount: noAccountTargets.length,
        paieDecisionLetter: "b",
        maxLoadActionId: "A18",
      },
    },
  };
}

module.exports = { buildPtAssetsTp1, compact };
