"use strict";

const DNS_FILE = "pt-tp2-dns-public.csv";
const CT_FILE = "pt-tp2-cert-transparency.jsonl";
const WHOIS_FILE = "pt-tp2-whois.txt";
const PAGES_FILE = "pt-tp2-pages-publiques.jsonl";
const JOBS_FILE = "pt-tp2-annonces-emploi.txt";
const GUIDE_FILE = "pt-tp2-guide.md";

const text = (value) => Buffer.from(String(value).replace(/\r?\n/g, "\n"), "utf8");
const compact = (values) => Array.from(new Set(values.map((value) => String(value).toLowerCase().trim().replace(/\s+/g, " "))));
const jsonl = (rows) => rows.map((row) => JSON.stringify(row)).join("\n");
const csv = (rows) => rows.map((row) => row.join(",")).join("\n");

function buildDnsRecords() {
  return [
    ["name", "type", "value", "ttl", "observation"],
    ["sahel-vert.example", "A", "198.51.100.10", "3600", "site racine"],
    ["sahel-vert.example", "AAAA", "2001:db8:51:100::10", "3600", "site racine v6"],
    ["sahel-vert.example", "MX", "10 mail.sahel-vert.example", "3600", "mx principal"],
    ["sahel-vert.example", "MX", "30 smtp.sahel-vert.example", "3600", "mx secours"],
    ["sahel-vert.example", "TXT", "v=spf1 include:mail.sahel-vert.example -all", "3600", "spf"],
    ["sahel-vert.example", "TXT", "site-verification=sv-demo-public-2026", "3600", "vérification"],
    ["www.sahel-vert.example", "A", "198.51.100.11", "1800", "vitrine"],
    ["www.sahel-vert.example", "AAAA", "2001:db8:51:100::11", "1800", "vitrine v6"],
    ["www.sahel-vert.example", "TXT", "cache-tag=front-public", "1800", "cache"],
    ["portail.sahel-vert.example", "A", "198.51.100.12", "900", "portail public"],
    ["portail.sahel-vert.example", "TXT", "expose=portail-partenaires", "900", "note"],
    ["mail.sahel-vert.example", "A", "203.0.113.25", "3600", "courriel"],
    ["mail.sahel-vert.example", "AAAA", "2001:db8:203:113::25", "3600", "courriel v6"],
    ["mail.sahel-vert.example", "TXT", "policy=mail-public", "3600", "note"],
    ["vpn.sahel-vert.example", "A", "198.51.100.13", "600", "accès distant"],
    ["vpn.sahel-vert.example", "TXT", "portal=auth", "600", "note"],
    ["paie.sahel-vert.example", "A", "198.51.100.14", "1200", "portail métier"],
    ["paie.sahel-vert.example", "TXT", "owner=finance", "1200", "note"],
    ["stock.sahel-vert.example", "A", "198.51.100.15", "1200", "portail métier"],
    ["stock.sahel-vert.example", "TXT", "owner=logistique", "1200", "note"],
    ["api.sahel-vert.example", "A", "198.51.100.16", "900", "api publique"],
    ["api.sahel-vert.example", "AAAA", "2001:db8:51:100::16", "900", "api publique v6"],
    ["api.sahel-vert.example", "TXT", "docs=public", "900", "note"],
    ["docs.sahel-vert.example", "A", "203.0.113.80", "1800", "documentation"],
    ["docs.sahel-vert.example", "TXT", "robots=allow", "1800", "note"],
    ["cdn.sahel-vert.example", "CNAME", "www.sahel-vert.example", "900", "réutilise le front"],
    ["status.sahel-vert.example", "A", "198.51.100.17", "300", "état des services"],
    ["status.sahel-vert.example", "TXT", "page=status", "300", "note"],
    ["support.sahel-vert.example", "CNAME", "portail.sahel-vert.example", "900", "renvoi support"],
    ["autodiscover.sahel-vert.example", "CNAME", "mail.sahel-vert.example", "3600", "autodiscover"],
    ["mta-sts.sahel-vert.example", "CNAME", "mail.sahel-vert.example", "3600", "politique mail"],
    ["smtp.sahel-vert.example", "A", "203.0.113.26", "3600", "relais smtp"],
    ["imap.sahel-vert.example", "A", "203.0.113.27", "3600", "lecture mail"],
    ["_dmarc.sahel-vert.example", "TXT", "v=DMARC1; p=quarantine; rua=mailto:contact@sahel-vert.example", "3600", "dmarc"],
    ["selector1._domainkey.sahel-vert.example", "TXT", "v=DKIM1; k=rsa; p=demo-cle-selector1", "3600", "dkim"],
    ["selector2._domainkey.sahel-vert.example", "TXT", "v=DKIM1; k=rsa; p=demo-cle-selector2", "3600", "dkim"],
    ["media.sahel-vert.example", "A", "203.0.113.90", "1200", "médias"],
    ["media.sahel-vert.example", "TXT", "cache=media", "1200", "note"],
    ["carte.sahel-vert.example", "A", "203.0.113.91", "1200", "cartographie"],
    ["carte.sahel-vert.example", "TXT", "tile=public", "1200", "note"],
    ["jobs.sahel-vert.example", "CNAME", "www.sahel-vert.example", "1800", "carrière"],
    ["www.sahel-vert.example", "TXT", "favicons=ok", "1800", "note"],
    ["docs.sahel-vert.example", "TXT", "search=enabled", "1800", "note"],
    ["status.sahel-vert.example", "TXT", "lang=fr", "300", "note"],
    ["mail.sahel-vert.example", "TXT", "tls-report=contact@sahel-vert.example", "3600", "rapport"],
    ["vpn.sahel-vert.example", "TXT", "captcha=enabled", "600", "note"],
    ["api.sahel-vert.example", "TXT", "version=public-v2", "900", "note"],
    ["media.sahel-vert.example", "TXT", "format=webp", "1200", "note"],
    ["carte.sahel-vert.example", "TXT", "tiles=public", "1200", "note"],
  ];
}

function buildCtEntries() {
  const entry = (observedAt, commonName, san, issuer, observation) => ({ observedAt, commonName, san, issuer, observation });
  return [
    entry("2026-06-12T08:14:21Z", "www.sahel-vert.example", ["www.sahel-vert.example", "sahel-vert.example"], "Harmattan Public TLS R3", "renewal"),
    entry("2026-06-02T07:02:11Z", "vpn.sahel-vert.example", ["vpn.sahel-vert.example"], "Harmattan Public TLS R3", "issuance"),
    entry("2026-06-15T09:45:07Z", "portail.sahel-vert.example", ["portail.sahel-vert.example", "support.sahel-vert.example"], "Harmattan Public TLS R3", "renewal"),
    entry("2026-06-04T11:12:02Z", "mail.sahel-vert.example", ["mail.sahel-vert.example", "smtp.sahel-vert.example", "imap.sahel-vert.example", "autodiscover.sahel-vert.example"], "Savanna Trust Services DV", "issuance"),
    entry("2026-06-18T06:55:44Z", "status.sahel-vert.example", ["status.sahel-vert.example"], "Harmattan Public TLS R3", "issuance"),
    entry("2026-06-08T10:14:19Z", "docs.sahel-vert.example", ["docs.sahel-vert.example"], "Harmattan Public TLS R3", "issuance"),
    entry("2026-06-01T06:48:02Z", "vpn.sahel-vert.example", ["vpn.sahel-vert.example", "portail.sahel-vert.example"], "Harmattan Public TLS R3", "precertificate"),
    entry("2026-06-19T13:27:56Z", "jobs.sahel-vert.example", ["jobs.sahel-vert.example", "www.sahel-vert.example"], "Harmattan Public TLS R3", "issuance"),
    entry("2026-06-05T09:01:40Z", "api.sahel-vert.example", ["api.sahel-vert.example"], "Harmattan Public TLS R3", "issuance"),
    entry("2026-06-11T16:34:12Z", "portail.sahel-vert.example", ["portail.sahel-vert.example", "support.sahel-vert.example"], "Harmattan Public TLS R3", "precertificate"),
    entry("2026-06-03T08:31:18Z", "www.sahel-vert.example", ["www.sahel-vert.example", "jobs.sahel-vert.example"], "Harmattan Public TLS R3", "precertificate"),
    entry("2026-06-21T14:43:35Z", "cdn.sahel-vert.example", ["cdn.sahel-vert.example", "media.sahel-vert.example", "carte.sahel-vert.example"], "Harmattan Public TLS R3", "issuance"),
    entry("2026-06-06T07:54:20Z", "stock.sahel-vert.example", ["stock.sahel-vert.example"], "Harmattan Public TLS R3", "issuance"),
    entry("2026-06-10T08:17:06Z", "paie.sahel-vert.example", ["paie.sahel-vert.example"], "Harmattan Public TLS R3", "issuance"),
    entry("2026-06-24T15:30:59Z", "docs.sahel-vert.example", ["docs.sahel-vert.example", "api.sahel-vert.example"], "Harmattan Public TLS R3", "renewal"),
    entry("2026-06-07T12:06:42Z", "mail.sahel-vert.example", ["mail.sahel-vert.example", "smtp.sahel-vert.example"], "Savanna Trust Services DV", "precertificate"),
    entry("2026-06-09T13:59:44Z", "www.sahel-vert.example", ["www.sahel-vert.example", "sahel-vert.example"], "Harmattan Public TLS R3", "issuance"),
    entry("2026-06-13T09:47:16Z", "support.sahel-vert.example", ["support.sahel-vert.example"], "Harmattan Public TLS R3", "issuance"),
    entry("2026-06-16T10:15:33Z", "api.sahel-vert.example", ["api.sahel-vert.example"], "Harmattan Public TLS R3", "renewal"),
    entry("2026-06-22T11:44:52Z", "staging.sahel-vert.example", ["staging.sahel-vert.example"], "Harmattan Public TLS R3", "observed on public log"),
    entry("2026-06-26T08:08:08Z", "jobs.sahel-vert.example", ["jobs.sahel-vert.example", "www.sahel-vert.example"], "Harmattan Public TLS R3", "renewal"),
    entry("2026-06-14T15:21:38Z", "vpn.sahel-vert.example", ["vpn.sahel-vert.example"], "Harmattan Public TLS R3", "renewal"),
    entry("2026-06-17T07:07:07Z", "media.sahel-vert.example", ["media.sahel-vert.example", "carte.sahel-vert.example"], "Harmattan Public TLS R3", "issuance"),
    entry("2026-06-23T10:40:17Z", "status.sahel-vert.example", ["status.sahel-vert.example"], "Harmattan Public TLS R3", "renewal"),
    entry("2026-06-20T09:35:45Z", "stock.sahel-vert.example", ["stock.sahel-vert.example"], "Harmattan Public TLS R3", "renewal"),
    entry("2026-06-25T16:26:54Z", "paie.sahel-vert.example", ["paie.sahel-vert.example"], "Harmattan Public TLS R3", "renewal"),
    entry("2026-06-27T08:48:31Z", "mail.sahel-vert.example", ["mail.sahel-vert.example", "smtp.sahel-vert.example", "imap.sahel-vert.example"], "Savanna Trust Services DV", "renewal"),
    entry("2026-06-28T09:14:42Z", "portail.sahel-vert.example", ["portail.sahel-vert.example", "support.sahel-vert.example"], "Harmattan Public TLS R3", "renewal"),
    entry("2026-06-29T11:57:13Z", "www.sahel-vert.example", ["www.sahel-vert.example"], "Harmattan Public TLS R3", "renewal"),
    entry("2026-06-30T12:45:50Z", "cdn.sahel-vert.example", ["cdn.sahel-vert.example", "media.sahel-vert.example"], "Harmattan Public TLS R3", "renewal"),
    entry("2026-06-18T14:19:11Z", "jobs.sahel-vert.example", ["jobs.sahel-vert.example"], "Harmattan Public TLS R3", "precertificate"),
    entry("2026-06-04T06:12:58Z", "docs.sahel-vert.example", ["docs.sahel-vert.example"], "Harmattan Public TLS R3", "precertificate"),
    entry("2026-06-05T15:55:12Z", "api.sahel-vert.example", ["api.sahel-vert.example", "docs.sahel-vert.example"], "Harmattan Public TLS R3", "precertificate"),
    entry("2026-06-03T11:25:46Z", "stock.sahel-vert.example", ["stock.sahel-vert.example"], "Harmattan Public TLS R3", "precertificate"),
    entry("2026-06-09T07:41:10Z", "paie.sahel-vert.example", ["paie.sahel-vert.example"], "Harmattan Public TLS R3", "precertificate"),
    entry("2026-06-12T13:32:20Z", "media.sahel-vert.example", ["media.sahel-vert.example"], "Harmattan Public TLS R3", "precertificate"),
    entry("2026-06-02T15:26:14Z", "support.sahel-vert.example", ["support.sahel-vert.example"], "Harmattan Public TLS R3", "precertificate"),
    entry("2026-06-08T17:11:38Z", "status.sahel-vert.example", ["status.sahel-vert.example"], "Harmattan Public TLS R3", "precertificate"),
    entry("2026-06-07T08:10:03Z", "cdn.sahel-vert.example", ["cdn.sahel-vert.example"], "Harmattan Public TLS R3", "precertificate"),
    entry("2026-06-11T12:02:44Z", "jobs.sahel-vert.example", ["jobs.sahel-vert.example"], "Harmattan Public TLS R3", "observed on public log"),
  ];
}

function buildWhois() {
  return [
    "% WHOIS/RDAP-like text export rendered as plain text for training",
    "Domain Name: SAHEL-VERT.EXAMPLE",
    "Object Class Name: domain",
    "Registry Domain ID: D2026-OSINT-SAHEL-VERT",
    "Registrar WHOIS Server: whois.savanna-names.example",
    "Registrar URL: https://savanna-names.example/registry",
    "Updated Date: 2026-06-03T08:10:00Z",
    "Creation Date: 2024-02-17T10:22:00Z",
    "Registry Expiry Date: 2027-02-17T10:22:00Z",
    "Registrar: Savanna Names Registry",
    "Registrar IANA ID: 42424",
    "Registrar Abuse Contact Email: abuse@savanna-names.example",
    "Registrar Abuse Contact Phone: REDACTED",
    "Registrant Organization: Coopérative Sahel-Vert",
    "Registrant Street: REDACTED",
    "Registrant City: REDACTED",
    "Registrant Country: BF",
    "Registrant Email: contact@sahel-vert.example",
    "Registrant Phone: REDACTED",
    "Admin Name: Ibrahim Sanou",
    "Admin Organization: Coopérative Sahel-Vert",
    "Admin Email: contact@sahel-vert.example",
    "Tech Name: Mariam Diallo",
    "Tech Organization: Cabinet Harmattan",
    "Tech Email: mission@harmattan.example",
    "Tech Phone: REDACTED",
    "Name Server: ns1.sahel-vert.example",
    "Name Server: ns2.sahel-vert.example",
    "Name Server: ns3.sahel-vert.example",
    "DNSSEC: unsigned",
    "Status: active",
    "Remarks: This training export is fictional and safe to share.",
    "Object: org-sv-001",
    "Object Class Name: entity",
    "Handle: ORG-SAHEL-VERT-EXAMPLE",
    "Role: registrant",
    "Entity Name: Coopérative Sahel-Vert",
    "Entity Email: contact@sahel-vert.example",
    "Entity Address: REDACTED",
    "Entity Country: BF",
    "Entity Remark: Agricultural cooperative of the fictional world",
    "Object: registrar-42424",
    "Object Class Name: entity",
    "Handle: REG-SAVANNA-42424",
    "Role: registrar of record",
    "Entity Name: Savanna Names Registry",
    "Entity Email: registry@savanna-names.example",
    "Entity Country: BF",
    "Entity Remark: Registrar and not the client",
    "Network Name: SV-PUBLIC-BLOCK",
    "Object Class Name: ip network",
    "CIDR: 198.51.100.0/24",
    "Start Address: 198.51.100.0",
    "End Address: 198.51.100.255",
    "Type: ALLOCATED PORTABLE",
    "Parent Handle: UPSTREAM-198-51-100",
    "Country: BF",
    "Org Name: Coopérative Sahel-Vert",
    "NetName: SAHEL-VERT-PUBLIC",
    "Comment: Public services published by the cooperative",
    "Comment: Training data only",
    "Event: registration 2024-02-17T10:22:00Z",
    "Event: last changed 2026-06-03T08:10:00Z",
    "Event: nameserver check 2026-06-04T07:00:00Z",
    "Abuse Email: abuse@savanna-names.example",
    "Abuse Mailbox Status: monitored",
    "RDAP Conformance: rdap_level_0",
    "Link: https://rdap.savanna-names.example/domain/sahel-vert.example",
    "Link: https://rdap.savanna-names.example/ip/198.51.100.0/24",
    "Notice: Personal data is redacted in this fictional export.",
    "Notice: Reproduction outside the lab is not needed.",
    "Notice: Use only for passive inventory in the mission window.",
    "Footer: end of fictional export",
  ].join("\n");
}

function buildPages() {
  const page = (url, title, technology, contact, mentionMetier, extrait) => ({ url, title, technology, contact, mentionMetier, extrait });
  return [
    page("https://www.sahel-vert.example/", "Accueil de la coopérative", "next.js", "contact@sahel-vert.example", "présentation coopérative", "Narration publique des services agricoles."),
    page("https://www.sahel-vert.example/actualites", "Actualités de saison", "next.js", "contact@sahel-vert.example", "actualités", "Page d’actualités et de suivi de campagnes."),
    page("https://www.sahel-vert.example/adherer", "Devenir adhérent", "next.js", "contact@sahel-vert.example", "inscription coopérative", "Formulaire d’adhésion et foire aux questions."),
    page("https://www.sahel-vert.example/contact", "Contact public", "next.js", "contact@sahel-vert.example", "contact", "Coordonnées publiques sans portail métier."),
    page("https://jobs.sahel-vert.example/carrieres", "Carrières", "next.js", "recrutement@sahel-vert.example", "recrutement", "Pages de recrutement et de présentation des équipes."),
    page("https://www.sahel-vert.example/nos-points-de-collecte", "Points de collecte", "next.js", "contact@sahel-vert.example", "carte des points de collecte", "Carte publique des points de collecte."),
    page("https://www.sahel-vert.example/blog/trajectoires", "Trajectoires de terrain", "next.js", "contact@sahel-vert.example", "témoignages", "Un témoignage cite un ancien site nginx sans en faire la techno courante."),
    page("https://vpn.sahel-vert.example/connexion", "Accès distant partenaires", "next.js", "support@sahel-vert.example", "authentification distante", "Connexion réservée aux partenaires de terrain."),
    page("https://status.sahel-vert.example/", "État des services", "nginx", "support@sahel-vert.example", "supervision publique", "Résumé public de disponibilité."),
    page("https://status.sahel-vert.example/historique", "Historique de disponibilité", "nginx", "support@sahel-vert.example", "supervision publique", "Historique de disponibilité des services."),
    page("https://docs.sahel-vert.example/", "Documentation publique", "nginx", "support@sahel-vert.example", "documentation", "Index de guides publics."),
    page("https://docs.sahel-vert.example/api", "Guide de l’API catalogue", "nginx", "support@sahel-vert.example", "documentation api", "Explications d’endpoints publics."),
    page("https://media.sahel-vert.example/kit-presse", "Kit presse", "nginx", "contact@sahel-vert.example", "médias", "Ressources publiques pour la presse."),
    page("https://carte.sahel-vert.example/", "Carte des dépôts", "nginx", "contact@sahel-vert.example", "cartographie", "Carte publique des dépôts et relais."),
    page("https://status.sahel-vert.example/composants/base-produits", "Base produits", "postgresql", "support@sahel-vert.example", "composant technique", "Fiche publique du composant base produits."),
    page("https://status.sahel-vert.example/composants/base-prix", "Base prix", "postgresql", "support@sahel-vert.example", "composant technique", "Fiche publique du composant base prix."),
    page("https://docs.sahel-vert.example/architecture/catalogue", "Architecture catalogue", "postgresql", "support@sahel-vert.example", "architecture technique", "Schéma logique public du catalogue."),
    page("https://docs.sahel-vert.example/architecture/portail", "Architecture portail", "postgresql", "support@sahel-vert.example", "architecture technique", "Base transactionnelle mentionnée dans un schéma public."),
    page("https://docs.sahel-vert.example/faq/sauvegardes", "Questions sur les sauvegardes", "postgresql", "support@sahel-vert.example", "faq technique", "Procédure de sauvegarde publique très résumée."),
    page("https://www.sahel-vert.example/mesure-daudience", "Mesure d’audience", "matomo", "contact@sahel-vert.example", "statistiques publiques", "Politique d’audience et traceurs publics."),
    page("https://www.sahel-vert.example/consentement", "Consentement et cookies", "matomo", "contact@sahel-vert.example", "conformité", "Bandeau cookies et documentation publique."),
    page("https://status.sahel-vert.example/composants/mesure", "Composant mesure", "matomo", "support@sahel-vert.example", "supervision publique", "Composant d’audience suivi publiquement."),
    page("https://docs.sahel-vert.example/outils/mesure", "Outil de mesure", "matomo", "support@sahel-vert.example", "outillage public", "Aide publique pour les marqueurs d’audience."),
    page("https://portail.sahel-vert.example/connexion", "Connexion partenaires", "keycloak", "support@sahel-vert.example", "authentification", "Portail d’authentification pour partenaires."),
    page("https://portail.sahel-vert.example/fournisseurs/commandes", "Extranet fournisseurs", "keycloak", "support@sahel-vert.example", "espace fournisseurs pour bons de livraison et validation des commandes", "Accès métier pour flux de livraison."),
    page("https://portail.sahel-vert.example/profil", "Profil partenaire", "keycloak", "support@sahel-vert.example", "profil partenaire", "Gestion du profil et des habilitations."),
    page("https://www.sahel-vert.example/carte-interactive", "Carte interactive", "leaflet", "contact@sahel-vert.example", "carte des points de collecte", "Carte publique des points d’apport."),
    page("https://carte.sahel-vert.example/aide", "Aide carte", "leaflet", "contact@sahel-vert.example", "cartographie", "Aide à la lecture des points de collecte."),
    page("https://status.sahel-vert.example/entrees", "Entrées de trafic", "traefik", "support@sahel-vert.example", "bordure web", "Page publique des entrées de trafic."),
    page("https://docs.sahel-vert.example/architecture/bordure", "Bordure web", "traefik", "support@sahel-vert.example", "architecture technique", "Explication des points d’entrée publics."),
    page("https://docs.sahel-vert.example/cms", "CMS documentaire", "directus", "support@sahel-vert.example", "édition de contenu", "Guide public sur la publication documentaire."),
    page("https://docs.sahel-vert.example/cms/modeles", "Modèles documentaires", "directus", "support@sahel-vert.example", "édition de contenu", "Modèles de contenu documentaires."),
  ];
}

function buildJobs() {
  return [
    "=== Annonce J01 ===",
    "Titre: Ingénieur plateforme front et contenu",
    "Équipe: Communication numérique",
    "Lieu: Ouagadougou",
    "Contrat: CDD de 12 mois",
    "Contexte: La coopérative publie des actualités de campagne et des cartes de points de collecte.",
    "Mission: Maintenir le front public et la mise en ligne des contenus institutionnels.",
    "Mission: Relire les intégrations publiques avant mise en production.",
    "Mission: Coordonner les évolutions visibles avec les équipes terrain.",
    "Technologies: next.js; nginx; directus",
    "Base de données: postgresql",
    "Outil interne mentionné: aucun",
    "Contrainte: Écrire une documentation claire pour les équipes non techniques.",
    "Contrainte: Accepter une relecture juridique des pages publiques.",
    "Contrainte: Travailler en horaires de bureau.",
    "Profil: Bonne maîtrise de JavaScript et de la publication headless.",
    "Profil: Sens de la vulgarisation technique.",
    "Profil: Expérience en cache HTTP souhaitée.",
    "Livrable: Front public stable et simple à maintenir.",
    "Livrable: Mode opératoire pour les mises en ligne.",
    "Note: Une partie du trafic passe par des cartes et des contenus publics.",
    "Note: Les contacts publics restent centralisés.",
    "Note: Les journaux publics doivent rester lisibles.",
    "Clôture: Candidatures ouvertes jusqu’au 22 juin 2026.",
    "",
    "=== Annonce J02 ===",
    "Titre: Administrateur données et observabilité",
    "Équipe: Données et opérations",
    "Lieu: Bobo-Dioulasso",
    "Contrat: CDI",
    "Contexte: La coopérative suit ses services visibles et ses flux de prix.",
    "Mission: Surveiller la base de données des services publics et fiabiliser les tableaux de bord.",
    "Mission: Améliorer les exports de supervision destinés aux équipes métier.",
    "Mission: Tenir à jour les tableaux de bord partagés avec les responsables de campagne.",
    "Technologies: postgresql; matomo; nginx",
    "Base de données: postgresql",
    "Outil interne mentionné: grafana",
    "Contrainte: Fournir des tableaux lisibles par les équipes métier.",
    "Contrainte: Rester sobre sur les accès de démonstration.",
    "Contrainte: Documenter les changements d’indicateurs.",
    "Profil: Bonne maîtrise SQL et culture de supervision.",
    "Profil: Aisance sur la qualité de données et la restitution.",
    "Profil: Capacité à expliquer une métrique à un non spécialiste.",
    "Livrable: Tableaux de bord de pilotage et fiches de composants.",
    "Livrable: Documentation de sauvegarde et de restauration.",
    "Note: L’outil interne sert au suivi opérationnel et n’est pas annoncé publiquement.",
    "Note: Les exports partagés restent limités au strict besoin.",
    "Note: Les valeurs publiées doivent être anonymisées.",
    "Clôture: Candidatures ouvertes jusqu’au 24 juin 2026.",
    "",
    "=== Annonce J03 ===",
    "Titre: Coordinateur support partenaires",
    "Équipe: Services partenaires",
    "Lieu: Koudougou",
    "Contrat: CDD de 9 mois",
    "Contexte: Les partenaires terrain utilisent un accès distant et un extranet de commandes.",
    "Mission: Accompagner les partenaires sur les parcours de connexion et les commandes.",
    "Mission: Centraliser les questions liées aux habilitations et aux retours terrain.",
    "Mission: Remonter les irritants de navigation à l’équipe produit.",
    "Technologies: keycloak; next.js; matomo",
    "Base de données: non précisée",
    "Outil interne mentionné: aucun",
    "Contrainte: Rédiger des réponses en français simple.",
    "Contrainte: Ne pas exposer d’information client au support public.",
    "Contrainte: Organiser une permanence pendant les campagnes.",
    "Profil: Expérience d’accompagnement utilisateurs.",
    "Profil: Bonne expression écrite et orale.",
    "Profil: Habitude des parcours d’authentification fédérés.",
    "Livrable: Réponses types et base de connaissance support.",
    "Livrable: Synthèse mensuelle des points de blocage.",
    "Note: Le poste travaille avec les retours de commandes et les habilitations.",
    "Note: Les captures d’écran restent anonymisées.",
    "Note: Le poste n’administre pas les briques internes.",
    "Clôture: Candidatures ouvertes jusqu’au 26 juin 2026.",
  ].join("\n");
}

function buildGuide() {
  return [
    "# TP 2 : méthode de reconnaissance passive",
    "",
    "> Cadre et limites : tu analyses uniquement des sources publiques fournies par le labo. Ne touche jamais un système réel sans autorisation écrite.",
    "> Les exemples ci-dessous utilisent des valeurs inventées, pas celles du scénario.",
    "",
    "## 1. Lire les sources sans les mélanger",
    "",
    "Le DNS public montre des noms et des types d’enregistrements. Un journal de transparence des certificats montre des noms observés dans des certificats publics. Un export WHOIS ou RDAP renseigne le titulaire et le registrar. Des pages publiques et des annonces d’emploi montrent parfois des indices de pile technique.",
    "",
    "## 2. Rappel utile sur les types DNS",
    "",
    "- A : nom vers IPv4.",
    "- AAAA : nom vers IPv6.",
    "- MX : serveur de courrier avec une priorité numérique ; la plus basse passe en premier.",
    "- TXT : texte libre. SPF, DKIM et DMARC y apparaissent souvent.",
    "- CNAME : alias vers un autre nom.",
    "- TTL : durée de mise en cache en secondes.",
    "- Un nom qui porte un CNAME ne doit pas porter d’autre donnée au même owner name ; on l’interprète donc comme un alias et non comme un ensemble d’enregistrements cumulables.",
    "",
    "Un nom peut apparaître dans plusieurs sources. Quand une question parle d’union d’ensembles, tu comptes ce nom une seule fois même s’il revient plusieurs fois.",
    "",
    "## 3. Ce qu’apporte la transparence des certificats",
    "",
    "Une observation CT est une preuve directe qu’un nom a été inscrit dans un certificat public. Cela ne garantit pas que le nom répond aujourd’hui, mais cela suffit pour le noter dans un inventaire passif.",
    "",
    "## 4. Visionneuse du site",
    "",
    "Dans la visionneuse, commence par chercher un nom, un type DNS ou un mot métier. Garde un bloc-notes avec quatre colonnes simples : source, nom, indice, commentaire. Évite de conclure trop vite à partir d’une seule source.",
    "",
    "## 5. Exemple Bash sur des données inventées",
    "",
    "```bash",
    "cat > guide-dns-exemple.csv <<'EOF'",
    "name,type,value,ttl",
    "www.violette.example,A,192.0.2.10,3600",
    "mail.violette.example,MX,10 smtp.violette.example,3600",
    "violette.example,TXT,v=spf1 include:smtp.violette.example -all,3600",
    "EOF",
    "cat > guide-ct-exemple.jsonl <<'EOF'",
    "{\"commonName\":\"www.violette.example\",\"san\":[\"www.violette.example\",\"teletravail.violette.example\"]}",
    "{\"commonName\":\"docs.violette.example\",\"san\":[\"docs.violette.example\"]}",
    "EOF",
    "{",
    "  tail -n +2 guide-dns-exemple.csv | cut -d, -f1",
    "  grep -o '\"[a-z0-9.-]*\\.violette\\.example\"' guide-ct-exemple.jsonl | tr -d '\"'",
    "} | sort -u | wc -l",
    "```",
    "",
    "## 6. Exemple PowerShell 5.1 sur des données inventées",
    "",
    "```powershell",
    "@'",
    "name,type,value,ttl",
    "www.violette.example,A,192.0.2.10,3600",
    "mail.violette.example,MX,10 smtp.violette.example,3600",
    "violette.example,TXT,v=spf1 include:smtp.violette.example -all,3600",
    "'@ | Set-Content -Encoding UTF8 guide-dns-exemple.csv",
    "@'",
    "{\"commonName\":\"www.violette.example\",\"san\":[\"www.violette.example\",\"teletravail.violette.example\"]}",
    "{\"commonName\":\"docs.violette.example\",\"san\":[\"docs.violette.example\"]}",
    "'@ | Set-Content -Encoding UTF8 guide-ct-exemple.jsonl",
    "$dnsNames = Import-Csv -Path guide-dns-exemple.csv | ForEach-Object { $_.name }",
    "$ctNames = Get-Content -Encoding UTF8 guide-ct-exemple.jsonl | ForEach-Object { $o = $_ | ConvertFrom-Json; @($o.commonName) + $o.san }",
    "($dnsNames + $ctNames | Sort-Object -Unique).Count",
    "```",
    "",
    "## 7. Repérer SPF, DKIM et DMARC",
    "",
    "```bash",
    "cat > guide-txt-exemple.csv <<'EOF'",
    "name,type,value",
    "violette.example,TXT,v=spf1 include:smtp.violette.example -all",
    "_dmarc.violette.example,TXT,v=DMARC1; p=quarantine",
    "selector1._domainkey.violette.example,TXT,v=DKIM1; k=rsa; p=demo",
    "www.violette.example,TXT,site-verification=ok",
    "EOF",
    "tail -n +2 guide-txt-exemple.csv | awk -F, '$2 == \"TXT\" && ($1 ~ /_dmarc/ || $1 ~ /_domainkey/ || $3 ~ /^v=spf1/) { count++ } END { print count }'",
    "```",
    "",
    "## 8. Croiser pages et annonces",
    "",
    "Pour les pages publiques, compte seulement la colonne de technologie ou le champ dédié. Un témoignage ou une citation de migration dans un paragraphe n’est pas une preuve de technologie en production. Pour les annonces, lis les lignes structurées avant les notes en prose.",
    "",
    "## 9. Exemple PowerShell 5.1 pour la techno la plus citée",
    "",
    "```powershell",
    "@'",
    "{\"url\":\"https://www.violette.example/\",\"technology\":\"astro\"}",
    "{\"url\":\"https://docs.violette.example/\",\"technology\":\"astro\"}",
    "{\"url\":\"https://status.violette.example/\",\"technology\":\"haproxy\"}",
    "'@ | Set-Content -Encoding UTF8 guide-pages-exemple.jsonl",
    "Get-Content -Encoding UTF8 guide-pages-exemple.jsonl | ForEach-Object { ($_ | ConvertFrom-Json).technology } |",
    "  Group-Object | Sort-Object Count -Descending | Select-Object -First 1 | ForEach-Object { $_.Name }",
    "```",
    "",
    "## 10. À retenir",
    "",
    "Une bonne reconnaissance passive collecte peu mais relit bien. Tu distingues les sources, tu expliques ta règle de comptage, tu gardes les preuves directes et tu t’arrêtes avant toute interaction active.",
  ].join("\n");
}

function buildFacts(dnsRows, ctRows, pages, jobsText, whoisText) {
  const dnsRecords = dnsRows.slice(1).map(([name, type, value]) => ({ name, type, value }));
  const dnsNames = new Set(dnsRecords.map((record) => record.name.toLowerCase()));
  const ctNames = new Set();
  for (const row of ctRows) {
    ctNames.add(row.commonName.toLowerCase());
    for (const value of row.san) ctNames.add(String(value).toLowerCase());
  }
  const union = new Set([...dnsNames, ...ctNames]);
  const ctOnly = [...ctNames].filter((name) => !dnsNames.has(name)).sort();
  const mxPrimary = dnsRecords
    .filter((record) => record.type === "MX")
    .map((record) => ({ priority: Number(record.value.split(" ")[0]), host: record.value.split(" ").slice(1).join(" ") }))
    .sort((left, right) => left.priority - right.priority)[0].host;
  const txtMailSecurityCount = dnsRecords.filter((record) => record.type === "TXT" && (record.value.startsWith("v=spf1") || record.value.startsWith("v=DMARC1") || record.value.startsWith("v=DKIM1"))).length;
  const publicBlock = /CIDR:\s*([0-9./]+)/u.exec(whoisText)[1];
  const registrar = /Registrar:\s*(.+)/u.exec(whoisText)[1].trim();
  const techCounts = pages.reduce((map, page) => map.set(page.technology, (map.get(page.technology) || 0) + 1), new Map());
  const topTechnology = [...techCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  const sensitiveUrl = pages.find((page) => /bons de livraison|commandes/u.test(page.mentionMetier)).url;
  const visibleDatabases = new Set(pages.filter((page) => page.technology === "postgresql").map((page) => page.technology));
  const jobs = jobsText.split(/\n{2,}/u).map((block) => block.split("\n"));
  const confirmedVisibleDbJobCount = jobs.filter((lines) => {
    const value = (lines.find((line) => line.startsWith("Base de données:")) || "").split(":").slice(1).join(":").trim().toLowerCase();
    return visibleDatabases.has(value);
  }).length;
  const pageTechnologies = new Set(pages.map((page) => page.technology));
  const dnsBlob = dnsRows.slice(1).map((row) => row.join(" ").toLowerCase()).join("\n");
  const jobOnlyTech = jobs
    .flatMap((lines) => {
      const techLine = (lines.find((line) => line.startsWith("Technologies:")) || "").split(":").slice(1).join(":");
      const toolLine = (lines.find((line) => line.startsWith("Outil interne mentionné:")) || "").split(":").slice(1).join(":");
      return `${techLine};${toolLine}`.split(";").map((value) => value.trim().toLowerCase()).filter(Boolean).filter((value) => value !== "aucun" && value !== "non precisee");
    })
    .filter((value, index, array) => array.indexOf(value) === index)
    .filter((value) => !pageTechnologies.has(value) && !dnsBlob.includes(value))
    .sort()[0];
  const remoteAccessFqdn = pages
    .map((page) => {
      const host = new URL(page.url).hostname.toLowerCase();
      const matchesPage = /accès distant|authentification distante/u.test(page.title.toLowerCase()) || /accès distant|authentification distante/u.test(page.mentionMetier.toLowerCase());
      const presentEverywhere = dnsNames.has(host) && ctNames.has(host);
      return { host, score: Number(matchesPage && presentEverywhere) };
    })
    .filter((row) => row.score === 1)[0].host;
  const count198Names = new Set(dnsRecords.filter((record) => record.type === "A" && /^198\.51\.100\./u.test(record.value)).map((record) => record.name.toLowerCase())).size;
  const vpnFirstObservedDate = ctRows
    .filter((row) => row.commonName.toLowerCase().includes("vpn.") || row.san.some((value) => String(value).toLowerCase().includes("vpn.")))
    .map((row) => row.observedAt.slice(0, 10))
    .sort()[0];

  return {
    assetNames: { dns: DNS_FILE, ct: CT_FILE, whois: WHOIS_FILE, pages: PAGES_FILE, jobs: JOBS_FILE, guide: GUIDE_FILE },
    unionFqdnCount: union.size,
    ctOnlyFqdn: ctOnly[0],
    mxPrimary,
    txtMailSecurityCount,
    publicBlock,
    registrar,
    topTechnology,
    sensitiveUrl,
    confirmedVisibleDbJobCount,
    jobsOnlyTech: jobOnlyTech,
    remoteAccessFqdn,
    stagingEvidenceLetter: "b",
    count198Names,
    vpnFirstObservedDate,
    passiveOnlyLetter: "c",
  };
}

function buildPtAssetsTp2() {
  const dnsRows = buildDnsRecords();
  const ctRows = buildCtEntries();
  const whoisText = buildWhois();
  const pages = buildPages();
  const jobsText = buildJobs();
  const guide = buildGuide();
  const facts = buildFacts(dnsRows, ctRows, pages, jobsText, whoisText);

  return {
    files: [
      { name: DNS_FILE, data: text(csv(dnsRows)) },
      { name: CT_FILE, data: text(jsonl(ctRows)) },
      { name: WHOIS_FILE, data: text(whoisText) },
      { name: PAGES_FILE, data: text(jsonl(pages)) },
      { name: JOBS_FILE, data: text(jobsText) },
      { name: GUIDE_FILE, data: text(guide) },
    ],
    facts: { ptTp2: facts },
  };
}

module.exports = { buildPtAssetsTp2 };
