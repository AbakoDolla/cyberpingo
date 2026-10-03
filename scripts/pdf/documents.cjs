"use strict";
// Documents de laboratoire publiés en PDF. La source reste le fichier Markdown de public/labs (écrit par
// scripts/generate-lab-assets.cjs) ; le PDF est ce que l’apprenant télécharge.
//
//   kind       guide | template | brief | grid  (template = modèle à remplir : lignes d’écriture, champs)
//   course     reseaux | fondamentaux | linux | logs  (couleur et bandeau)
//   equipment  identifiants de data/equipment.json montrés dans le bandeau « matériel » : seulement ce
//              dont le document parle réellement
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
];
