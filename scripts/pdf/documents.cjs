"use strict";
// Documents de laboratoire publiés en PDF. La source reste le fichier Markdown de public/labs (écrit par
// scripts/generate-lab-assets.cjs) ; le PDF est ce que l’apprenant télécharge.
//
//   kind       guide | template | brief | grid  (template = modèle à remplir : lignes d’écriture, champs)
//   course     reseaux | fondamentaux | linux | logs | web | pentest  (couleur et bandeau)
//   equipment  identifiants de data/equipment.json montrés dans le bandeau « matériel » : seulement ce
//              dont le document parle réellement
//   direct     le document est publié en PDF dès le seed de son parcours (scripts/generate-<parcours>-seed.cjs) : le
//              seed 07 de conversion .md vers .pdf, déjà appliqué en production, ne le concerne pas
module.exports = [
  // Réseaux informatiques
  { file: "tp1-guide", kind: "guide", docLabel: "Guide pas à pas", course: "reseaux", lab: "TP 1 · Réseau d’une maison", equipment: ["routeur", "switch", "poste-fixe", "portable", "imprimante-perso"] },
  { file: "tp2-guide", kind: "guide", docLabel: "Guide pas à pas", course: "reseaux", lab: "TP 2 · VLAN d’une PME", equipment: ["routeur", "switch", "poste-fixe", "point-acces-wifi"] },
  { file: "tp3-guide", kind: "guide", docLabel: "Guide pas à pas", course: "reseaux", lab: "TP 3 · Réseau multi-sites", equipment: ["routeur", "poste-fixe"] },
  { file: "packet-tracer-guide", kind: "guide", docLabel: "Guide Packet Tracer", course: "reseaux", lab: "Plan d’adressage de l’atelier Kora", equipment: ["routeur", "switch", "poste-fixe"] },
  { file: "modele-rapport-reseau", kind: "template", docLabel: "Modèle de rapport", course: "reseaux", lab: "Plan d’adressage de l’atelier Kora" },
  { file: "projet-kora-cahier-des-charges", kind: "brief", docLabel: "Cahier des charges", course: "reseaux", lab: "Projet final · Réseau de Kora", equipment: ["routeur", "switch", "point-acces-wifi", "serveur"] },
  { file: "projet-kora-inventaire-a-verifier", kind: "brief", docLabel: "Inventaire à vérifier", course: "reseaux", lab: "Projet final · Réseau de Kora", equipment: ["routeur", "switch", "nas", "serveur", "point-acces-wifi", "poste-fixe"] },
  { file: "projet-kora-modele-documentation", kind: "template", docLabel: "Modèle de documentation", course: "reseaux", lab: "Projet final · Réseau de Kora" },
  { file: "guide-wireshark", kind: "guide", docLabel: "Aide-mémoire", course: "reseaux", lab: "Analyse de captures réseau" },

  // Fondamentaux de la cybersécurité
  { file: "fond-tp1-guide", kind: "guide", docLabel: "Guide pas à pas", course: "fondamentaux", lab: "TP 1 · Analyser un courriel d’hameçonnage", equipment: ["portable", "smartphone"] },
  { file: "fond-tp2-guide", kind: "guide", docLabel: "Guide pas à pas", course: "fondamentaux", lab: "TP 2 · Auditer des mots de passe", equipment: ["cle-securite", "smartphone", "portable"] },
  { file: "fond-tp3-guide", kind: "guide", docLabel: "Guide pas à pas", course: "fondamentaux", lab: "TP 3 · Hygiène des postes et sauvegardes", equipment: ["poste-fixe", "portable", "disque-externe", "nas"] },
  { file: "fond-tp4-guide", kind: "guide", docLabel: "Guide pas à pas", course: "fondamentaux", lab: "TP 4 · Intégrité et chiffrement", equipment: ["portable", "cle-usb", "disque-externe"] },
  { file: "fond-tp5-guide", kind: "guide", docLabel: "Guide pas à pas", course: "fondamentaux", lab: "TP 5 · Registre des risques", equipment: ["poste-fixe", "box-internet", "nas"] },
  { file: "fond-incident-guide", kind: "guide", docLabel: "Guide d’incident", course: "fondamentaux", lab: "Évaluation · Compte compromis", equipment: ["portable", "smartphone", "cle-securite"] },
  { file: "fond-incident-chronologie", kind: "template", docLabel: "Modèle de chronologie", course: "fondamentaux", lab: "Évaluation · Compte compromis" },
  { file: "fond-projet-guide", kind: "guide", docLabel: "Guide du projet final", course: "fondamentaux", lab: "Projet final · Audit du Centre Soleil", equipment: ["poste-fixe", "portable", "nas", "box-internet", "point-acces-wifi"] },
  { file: "fond-projet-grille-audit", kind: "grid", docLabel: "Grille d’audit", course: "fondamentaux", lab: "Projet final · Audit du Centre Soleil" },
  { file: "fond-projet-modele-rapport", kind: "template", docLabel: "Modèle de rapport", course: "fondamentaux", lab: "Projet final · Audit du Centre Soleil" },

  // Linux, journaux et investigation
  { file: "guide-audit-linux", kind: "guide", docLabel: "Guide d’audit", course: "linux", lab: "Audit des droits Linux", equipment: ["serveur"] },
  { file: "guide-lecture-journaux", kind: "guide", docLabel: "Aide-mémoire", course: "logs", lab: "Lire et recouper des journaux", equipment: ["serveur", "pare-feu"] },
  { file: "modele-rapport-incident", kind: "template", docLabel: "Modèle de rapport", course: "logs", lab: "Investigation d’incident" },

  // Administration Linux : publiés en PDF dès leur seed (08_linux_programme.sql), donc « direct » : pas de conversion dans le seed 07
  { file: "lnx-tp1-guide", kind: "guide", docLabel: "Guide pas à pas", course: "linux", lab: "TP 1 · Explorer l’arborescence", equipment: ["serveur", "portable"], direct: true },
  { file: "lnx-tp2-guide", kind: "guide", docLabel: "Guide pas à pas", course: "linux", lab: "TP 2 · Droits, comptes et sudo", equipment: ["serveur"], direct: true },
  { file: "lnx-tp3-guide", kind: "guide", docLabel: "Guide pas à pas", course: "linux", lab: "TP 3 · Processus et services", equipment: ["serveur"], direct: true },
  { file: "lnx-tp4-guide", kind: "guide", docLabel: "Guide pas à pas", course: "linux", lab: "TP 4 · Réseau, SSH et pare-feu", equipment: ["serveur", "pare-feu", "routeur"], direct: true },
  { file: "lnx-tp5-guide", kind: "guide", docLabel: "Guide pas à pas", course: "linux", lab: "TP 5 · Mises à jour et sauvegardes", equipment: ["serveur", "disque-externe", "nas"], direct: true },
  { file: "lnx-tp6-guide", kind: "guide", docLabel: "Guide pas à pas", course: "linux", lab: "TP 6 · Scripts shell", equipment: ["portable", "raspberry-pi"], direct: true },
  { file: "lnx-inc-guide", kind: "guide", docLabel: "Guide d’incident", course: "linux", lab: "Évaluation · Serveur web compromis", equipment: ["serveur", "pare-feu"], direct: true },
  { file: "lnx-inc-chronologie", kind: "template", docLabel: "Modèle de chronologie", course: "linux", lab: "Évaluation · Serveur web compromis", direct: true },
  { file: "lnx-proj-guide", kind: "guide", docLabel: "Guide du projet final", course: "linux", lab: "Projet final · Audit d’un serveur Linux", equipment: ["serveur", "nas", "pare-feu"], direct: true },
  { file: "lnx-proj-grille-audit", kind: "grid", docLabel: "Grille d’audit", course: "linux", lab: "Projet final · Audit d’un serveur Linux", direct: true },
  { file: "lnx-proj-modele-rapport", kind: "template", docLabel: "Modèle de rapport", course: "linux", lab: "Projet final · Audit d’un serveur Linux", direct: true },

  // Analyse de logs : publiés en PDF dès leur seed (09_logs_programme.sql), donc « direct »
  { file: "slg-tp1-guide", kind: "guide", docLabel: "Guide pas à pas", course: "logs", lab: "TP 1 · Lire, normaliser et dater", equipment: ["serveur", "portable"], direct: true },
  { file: "slg-tp2-guide", kind: "guide", docLabel: "Guide pas à pas", course: "logs", lab: "TP 2 · Journaux Windows", equipment: ["poste-fixe", "portable", "serveur"], direct: true },
  { file: "slg-tp3-guide", kind: "guide", docLabel: "Guide pas à pas", course: "logs", lab: "TP 3 · Pare-feu, DNS et proxy", equipment: ["pare-feu", "routeur", "serveur"], direct: true },
  { file: "slg-tp4-guide", kind: "guide", docLabel: "Guide pas à pas", course: "logs", lab: "TP 4 · Corréler et dater", equipment: ["serveur", "pare-feu", "poste-fixe"], direct: true },
  { file: "slg-tp4-modele-chronologie", kind: "template", docLabel: "Modèle de chronologie", course: "logs", lab: "TP 4 · Corréler et dater", direct: true },
  { file: "slg-tp5-guide", kind: "guide", docLabel: "Guide pas à pas", course: "logs", lab: "TP 5 · Règles de détection", equipment: ["serveur", "pare-feu"], direct: true },
  { file: "slg-tp5-regles", kind: "brief", docLabel: "Règles à évaluer", course: "logs", lab: "TP 5 · Règles de détection", direct: true },
  { file: "slg-proj-guide", kind: "guide", docLabel: "Guide du projet final", course: "logs", lab: "Projet final · Trier une semaine d’alertes", equipment: ["serveur", "pare-feu", "poste-fixe"], direct: true },
  { file: "slg-proj-grille-triage", kind: "grid", docLabel: "Grille de triage", course: "logs", lab: "Projet final · Trier une semaine d’alertes", direct: true },
  { file: "slg-proj-modele-rapport", kind: "template", docLabel: "Modèle de rapport", course: "logs", lab: "Projet final · Trier une semaine d’alertes", direct: true },

  // Sécurité Web : publiés en PDF dès leur seed (10_securite_web_programme.sql), donc « direct »
  { file: "swb-tp1-guide", kind: "guide", docLabel: "Guide pas à pas", course: "web", lab: "TP 1 · HTTP, cookies et en-têtes", equipment: ["portable", "serveur"], direct: true },
  { file: "swb-tp2-guide", kind: "guide", docLabel: "Guide pas à pas", course: "web", lab: "TP 2 · Les injections", equipment: ["serveur", "poste-fixe"], direct: true },
  { file: "swb-tp3-guide", kind: "guide", docLabel: "Guide pas à pas", course: "web", lab: "TP 3 · XSS, CSP et en-têtes", equipment: ["portable", "smartphone", "serveur"], direct: true },
  { file: "swb-tp4-guide", kind: "guide", docLabel: "Guide pas à pas", course: "web", lab: "TP 4 · Sessions, jetons et mots de passe", equipment: ["serveur", "smartphone", "cle-securite"], direct: true },
  { file: "swb-tp4-politique", kind: "brief", docLabel: "Politique à appliquer", course: "web", lab: "TP 4 · Sessions, jetons et mots de passe", direct: true },
  { file: "swb-tp5-guide", kind: "guide", docLabel: "Guide pas à pas", course: "web", lab: "TP 5 · Contrôle d’accès, API et SSRF", equipment: ["serveur", "pare-feu"], direct: true },
  { file: "swb-tp6-guide", kind: "guide", docLabel: "Guide pas à pas", course: "web", lab: "TP 6 · Configuration, dépendances et CVSS", equipment: ["serveur", "raspberry-pi"], direct: true },
  { file: "swb-proj-guide", kind: "guide", docLabel: "Guide du projet final", course: "web", lab: "Projet final · Auditer l’application de réservation", equipment: ["serveur", "pare-feu", "portable"], direct: true },
  { file: "swb-proj-mission", kind: "brief", docLabel: "Lettre de mission", course: "web", lab: "Projet final · Auditer l’application de réservation", direct: true },
  { file: "swb-proj-grille", kind: "grid", docLabel: "Grille d’évaluation", course: "web", lab: "Projet final · Auditer l’application de réservation", direct: true },
  { file: "swb-proj-modele-rapport", kind: "template", docLabel: "Modèle de rapport", course: "web", lab: "Projet final · Auditer l’application de réservation", direct: true },
];
