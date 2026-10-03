const { createHash } = require("node:crypto");

const text = (value) => Buffer.from(value.replace(/\r?\n/g, "\n"), "utf8");
const isoDay = (value) => `${value}T00:00:00Z`;
const dayMs = 24 * 60 * 60 * 1000;
const dayDiff = (from, to) => Math.round((Date.parse(isoDay(to)) - Date.parse(isoDay(from))) / dayMs);
const minuteDiff = (fromIso, toIso) => Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60000);
const round = (value) => Math.round(value);
const lower = (value) => value.toLowerCase();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const tsv = (headers, rows) => `${headers.join("\t")}\n${rows.map((row) => headers.map((header) => row[header]).join("\t")).join("\n")}\n`;

function buildHygiene() {
  const auditDate = "2026-03-12";
  const systems = [
    { system: "Système Alpha 8", supportEnd: "2026-02-15" },
    { system: "Système Alpha 10", supportEnd: "2027-12-31" },
    { system: "Système Bêta 3", supportEnd: "2026-06-30" },
    { system: "Système Gamma 2", supportEnd: "2026-09-30" },
  ];
  const supportBySystem = new Map(systems.map((item) => [item.system, item.supportEnd]));
  const inventory = [
    { poste: "SALLE-01", type: "fixe", system: "Système Alpha 10", lastUpdate: "2026-03-09", avStatus: "actif", avDate: "2026-03-10", encrypted: "oui", admins: "1", lastBackup: "2026-03-11" },
    { poste: "SALLE-02", type: "fixe", system: "Système Alpha 8", lastUpdate: "2026-02-01", avStatus: "actif", avDate: "2026-03-02", encrypted: "oui", admins: "2", lastBackup: "2026-03-10" },
    { poste: "SALLE-03", type: "fixe", system: "Système Alpha 10", lastUpdate: "2026-03-01", avStatus: "actif", avDate: "2026-03-01", encrypted: "oui", admins: "1", lastBackup: "2026-03-10" },
    { poste: "SALLE-04", type: "fixe", system: "Système Bêta 3", lastUpdate: "2026-02-15", avStatus: "actif", avDate: "2026-03-03", encrypted: "oui", admins: "1", lastBackup: "2026-03-09" },
    { poste: "SALLE-05", type: "fixe", system: "Système Alpha 8", lastUpdate: "2026-01-28", avStatus: "actif", avDate: "2026-02-27", encrypted: "non", admins: "2", lastBackup: "2026-03-04" },
    { poste: "SALLE-06", type: "fixe", system: "Système Alpha 8", lastUpdate: "2026-01-09", avStatus: "actif", avDate: "2026-02-25", encrypted: "non", admins: "3", lastBackup: "2026-02-28" },
    { poste: "SALLE-07", type: "fixe", system: "Système Gamma 2", lastUpdate: "2026-03-08", avStatus: "actif", avDate: "2026-03-08", encrypted: "oui", admins: "1", lastBackup: "2026-03-11" },
    { poste: "SALLE-08", type: "fixe", system: "Système Bêta 3", lastUpdate: "2026-02-20", avStatus: "actif", avDate: "2026-03-05", encrypted: "oui", admins: "1", lastBackup: "2026-03-08" },
    { poste: "PC-DIRECTION", type: "portable", system: "Système Alpha 10", lastUpdate: "2026-03-07", avStatus: "actif", avDate: "2026-03-07", encrypted: "oui", admins: "1", lastBackup: "2026-03-11" },
    { poste: "PC-COMPTA", type: "portable", system: "Système Alpha 8", lastUpdate: "2026-01-11", avStatus: "actif", avDate: "2026-02-20", encrypted: "non", admins: "4", lastBackup: "2026-02-27" },
    { poste: "PC-SECRETARIAT", type: "portable", system: "Système Bêta 3", lastUpdate: "2026-03-02", avStatus: "actif", avDate: "2026-03-02", encrypted: "oui", admins: "2", lastBackup: "2026-03-10" },
    { poste: "PC-FORMATION", type: "portable", system: "Système Alpha 10", lastUpdate: "2026-02-10", avStatus: "actif", avDate: "2026-02-28", encrypted: "non", admins: "2", lastBackup: "2026-03-01" },
  ];
  const backupDays = [
    ["2026-02-12", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-02-13", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-02-14", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-02-15", "ko", "Erreur disque USB, aucune copie externe écrite."],
    ["2026-02-16", "ko", "Partage NAS indisponible, reprise manuelle demandée."],
    ["2026-02-17", "ok", "Cycle nocturne terminé, 11 postes sauvegardés, 1 avertissement."],
    ["2026-02-18", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-02-19", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-02-20", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-02-21", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-02-22", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-02-23", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-02-24", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-02-25", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-02-26", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-02-27", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-02-28", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-03-01", "ko", "Alerte réseau, aucune sauvegarde utile n’a été finalisée."],
    ["2026-03-02", "ko", "Service arrêté après deux échecs successifs."],
    ["2026-03-03", "ko", "Fenêtre expirée, aucune sauvegarde utilisable."],
    ["2026-03-04", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-03-05", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-03-06", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-03-07", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-03-08", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-03-09", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-03-10", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-03-11", "ok", "Cycle nocturne terminé, 12 postes sauvegardés."],
    ["2026-03-12", "warning", "Test de restauration réussi sur archive-adhérents-2026-02-28.zip."],
  ];
  const copyPlan = [
    "nom | support | lieu",
    "production-postes | stockage interne des postes | salle de formation",
    "cns-data-nas | nas local sur disques mécaniques | bureau technique",
    "usb-secours | disque usb chiffré | armoire du bureau technique",
  ];
  const restoreDate = "2026-03-05";
  const guide = `# Guide du TP 3 : auditer l’hygiène d’un parc de postes

> Cadre et limites
>
> Toutes les données de ce labo sont fictives.
> Tu travailles hors production, sur des exportations figées.
> N’essaie rien sur un vrai poste, ne modifies aucun vrai antivirus et ne lances jamais de commande de chiffrement sur une machine qui ne t’appartient pas.

# Objectif

Tu dois repérer les retards de mise à jour, les définitions antivirus trop anciennes, les oublis de chiffrement et les trous dans la sauvegarde du parc du Centre Numérique Soleil.

# Méthode

1. Vérifie si un système est encore supporté en comparant la date de fin de support à la date d’audit du labo.
2. Calcule les retards en jours entre la date d’audit et la dernière mise à jour, la date des signatures antivirus et la dernière sauvegarde.
3. Pour le poste le plus à risque, utilise ce score de pénalité :
   - +3 si le système est hors support
   - +2 si le retard de mise à jour dépasse 30 jours
   - +2 si les signatures antivirus ont plus de 7 jours de retard
   - +2 si le disque n’est pas chiffré
   - +1 par compte administrateur local au-delà du premier
   - +2 si la dernière sauvegarde réussie date de plus de 7 jours
4. Pour le pourcentage de conformité global, compte 6 contrôles par poste : système supporté, mise à jour de 30 jours ou moins, antivirus de 7 jours ou moins, disque chiffré, un seul administrateur local, sauvegarde de 7 jours ou moins. Formule : contrôles conformes / 72 × 100, arrondi à l’entier.
5. Pour la règle 3-2-1, l’original compte pour une copie : il faut donc trois copies au total, sur au moins deux supports différents, dont une copie hors site. Si un seul point manque, réponds avec sa lettre.

# Commandes utiles

## Sur les exports du labo avec Windows PowerShell

\`\`\`powershell
Import-Csv -Delimiter ([char]9) -Path "fond-tp3-inventaire-postes.tsv" | Sort-Object derniere_maj | Select-Object -First 5 poste,systeme,derniere_maj
Import-Csv -Delimiter ([char]9) -Path "fond-tp3-support-systemes.tsv" | Sort-Object fin_support | Select-Object systeme,fin_support
Get-Content "fond-tp3-sauvegarde-30j.log" | Select-String 'SUCCESS|FAIL|WARNING|RESTORE_OK'
\`\`\`

## Sur les exports du labo avec Git Bash ou Linux

\`\`\`bash
awk -F'\\t' 'NR==1 || $4 < "2026-02-15"' fond-tp3-inventaire-postes.tsv
grep -E 'SUCCESS|FAIL|WARNING|RESTORE_OK' fond-tp3-sauvegarde-30j.log
\`\`\`

## Sur ton propre poste, hors labo

\`\`\`powershell
# hors-test
Get-MpComputerStatus | Select-Object AntivirusSignatureLastUpdated,AntivirusEnabled
Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 5 Description,HotFixID,InstalledOn
manage-bde -status C:
\`\`\`

# Repères

La plus longue série de jours sans sauvegarde réussie se lit dans le journal, pas dans l’inventaire. Seules les lignes SUCCESS comptent comme sauvegardes nocturnes réussies. Les lignes WARNING et RESTORE_OK servent à l’analyse mais ne ferment pas une série d’échec.
`;

  const unsupported = inventory.filter((item) => supportBySystem.get(item.system) < auditDate);
  const updateLags = inventory.map((item) => dayDiff(item.lastUpdate, auditDate));
  const avLags = inventory.map((item) => dayDiff(item.avDate, auditDate));
  const backupLags = inventory.map((item) => dayDiff(item.lastBackup, auditDate));
  const portableUnencrypted = inventory.filter((item) => item.type === "portable" && item.encrypted === "non");
  const staleAv = inventory.filter((item) => dayDiff(item.avDate, auditDate) > 7);
  const tooManyAdmins = inventory.filter((item) => Number(item.admins) > 1);
  const scores = inventory.map((item) => {
    const systemUnsupported = supportBySystem.get(item.system) < auditDate;
    const score = (systemUnsupported ? 3 : 0)
      + (dayDiff(item.lastUpdate, auditDate) > 30 ? 2 : 0)
      + (dayDiff(item.avDate, auditDate) > 7 ? 2 : 0)
      + (item.encrypted === "non" ? 2 : 0)
      + Math.max(Number(item.admins) - 1, 0)
      + (dayDiff(item.lastBackup, auditDate) > 7 ? 2 : 0);
    return { poste: item.poste, score };
  });
  const riskWinner = scores.slice().sort((left, right) => right.score - left.score || left.poste.localeCompare(right.poste))[0];
  const passedChecks = inventory.reduce((total, item) => total + [
    supportBySystem.get(item.system) >= auditDate,
    dayDiff(item.lastUpdate, auditDate) <= 30,
    dayDiff(item.avDate, auditDate) <= 7,
    item.encrypted === "oui",
    Number(item.admins) <= 1,
    dayDiff(item.lastBackup, auditDate) <= 7,
  ].filter(Boolean).length, 0);
  let longestGap = 0;
  let currentGap = 0;
  for (const [, status] of backupDays) {
    if (status === "ok") {
      longestGap = Math.max(longestGap, currentGap);
      currentGap = 0;
    } else if (status !== "warning") currentGap += 1;
  }
  longestGap = Math.max(longestGap, currentGap);

  const inventoryFile = "fond-tp3-inventaire-postes.tsv";
  const supportFile = "fond-tp3-support-systemes.tsv";
  const backupFile = "fond-tp3-sauvegarde-30j.log";
  const copiesFile = "fond-tp3-copies-321.txt";
  const guideFile = "fond-tp3-guide.md";

  return {
    files: [
      { name: inventoryFile, data: text(tsv(["poste", "type", "systeme", "derniere_maj", "etat_antivirus", "date_signatures", "disque_chiffre", "admins_locaux", "derniere_sauvegarde"], inventory.map((item) => ({
        poste: item.poste, type: item.type, systeme: item.system, derniere_maj: item.lastUpdate, etat_antivirus: item.avStatus, date_signatures: item.avDate,
        disque_chiffre: item.encrypted, admins_locaux: item.admins, derniere_sauvegarde: item.lastBackup,
      })))) },
      { name: supportFile, data: text(tsv(["systeme", "fin_support"], systems.map((item) => ({ systeme: item.system, fin_support: item.supportEnd })))) },
      { name: backupFile, data: text(backupDays.map(([date, status, message]) => `${date}T01:10:00Z | ${status === "ok" ? "SUCCESS" : status === "ko" ? "FAIL" : "WARNING"} | ${message}`).join("\n") + "\n2026-03-05T09:30:00Z | RESTORE_OK | Restauration de test réussie sur archive-adhérents-2026-02-28.zip.\n") },
      { name: copiesFile, data: text(copyPlan.join("\n") + "\n") },
      { name: guideFile, data: text(guide) },
    ],
    facts: {
      auditDate,
      assetNames: { inventoryFile, supportFile, backupFile, copiesFile, guideFile },
      unsupportedCount: unsupported.length,
      maxUpdateLagDays: Math.max(...updateLags),
      unencryptedPortableCount: portableUnencrypted.length,
      staleAntivirusCount: staleAv.length,
      longestBackupGapDays: longestGap,
      threeTwoOneRespected: false,
      threeTwoOneMissingLetter: "c",
      restoreTestDate: restoreDate,
      restoreDelayDays: dayDiff(restoreDate, auditDate),
      riskiestPost: riskWinner.poste,
      compliancePercent: round((passedChecks / (inventory.length * 6)) * 100),
      multiAdminCount: tooManyAdmins.length,
    },
  };
}

function buildRisks() {
  const assets = [
    { id: "ACT-01", nom: "Parc de formation", type: "postes", donnees: "non", c: "2", i: "3", d: "4" },
    { id: "ACT-02", nom: "Boîtes mail du personnel", type: "messagerie", donnees: "oui", c: "4", i: "3", d: "4" },
    { id: "ACT-03", nom: "Dossier comptabilité", type: "partage", donnees: "oui", c: "4", i: "4", d: "3" },
    { id: "ACT-04", nom: "Fiches d’inscription des apprenants", type: "papier", donnees: "oui", c: "4", i: "3", d: "2" },
    { id: "ACT-05", nom: "Liste des donateurs", type: "tableur", donnees: "oui", c: "4", i: "3", d: "2" },
    { id: "ACT-06", nom: "Site web", type: "service", donnees: "non", c: "2", i: "2", d: "3" },
    { id: "ACT-07", nom: "Box internet", type: "equipement", donnees: "non", c: "2", i: "2", d: "4" },
    { id: "ACT-08", nom: "NAS de sauvegarde", type: "equipement", donnees: "oui", c: "3", i: "4", d: "4" },
    { id: "ACT-09", nom: "Dossiers RH papier", type: "papier", donnees: "oui", c: "4", i: "3", d: "2" },
    { id: "ACT-10", nom: "Projecteur de salle", type: "materiel", donnees: "non", c: "1", i: "1", d: "2" },
  ];
  const scenarios = [
    { id: "SC-01", actif: "ACT-02", menace: "hameçonnage", vulnerabilite: "mfa absente", vraisemblance: "3", impact: "4", mesure: "changement de mot de passe trimestriel" },
    { id: "SC-02", actif: "ACT-03", menace: "erreur de saisie", vulnerabilite: "double validation absente", vraisemblance: "2", impact: "3", mesure: "sauvegarde quotidienne" },
    { id: "SC-03", actif: "ACT-04", menace: "consultation non autorisée", vulnerabilite: "armoire non verrouillée", vraisemblance: "2", impact: "4", mesure: "bureau fermé le soir" },
    { id: "SC-04", actif: "ACT-08", menace: "panne matérielle", vulnerabilite: "disque unique", vraisemblance: "2", impact: "4", mesure: "alerte smart hebdomadaire" },
    { id: "SC-05", actif: "ACT-07", menace: "coupure électrique", vulnerabilite: "pas d’onduleur", vraisemblance: "3", impact: "2", mesure: "prise parafoudre" },
    { id: "SC-06", actif: "ACT-01", menace: "malware usb", vulnerabilite: "ports libres", vraisemblance: "2", impact: "3", mesure: "sensibilisation affichée" },
    { id: "SC-07", actif: "ACT-03", menace: "partage de compte", vulnerabilite: "comptes génériques", vraisemblance: "3", impact: "3", mesure: "mot de passe partagé" },
    { id: "SC-08", actif: "ACT-05", menace: "vol de téléphone", vulnerabilite: "codes de validation reçus sur un mobile personnel", vraisemblance: "4", impact: "4", mesure: "aucune" },
    { id: "SC-09", actif: "ACT-06", menace: "certificat expiré", vulnerabilite: "rappel absent", vraisemblance: "2", impact: "2", mesure: "agenda papier" },
    { id: "SC-10", actif: "ACT-08", menace: "suppression accidentelle", vulnerabilite: "droits d’écriture trop larges", vraisemblance: "2", impact: "4", mesure: "corbeille activée" },
    { id: "SC-11", actif: "ACT-04", menace: "conservation inutile", vulnerabilite: "durée de conservation non définie", vraisemblance: "1", impact: "3", mesure: "aucune" },
    { id: "SC-12", actif: "ACT-02", menace: "prise de contrôle d’admin", vulnerabilite: "absence de double authentification", vraisemblance: "3", impact: "4", mesure: "mot de passe complexe seul" },
  ];
  const incidents = [
    "INC-01 | Une bénévole remarque une liste de donateurs oubliée sur l’imprimante du bureau et la lit avant que l’équipe ne la récupère. Une photo est ensuite prise pour signaler l’oubli. La feuille papier reste inchangée et l’imprimante continue de fonctionner normalement.",
    "INC-02 | Une macro remplace plusieurs montants dans le tableau de caisse sans que l’équipe s’en rende compte tout de suite. Le fichier reste accessible pendant toute la matinée et aucune personne extérieure ne le consulte. Le problème principal vient du contenu devenu faux.",
    "INC-03 | La box redémarre et plus personne ne peut envoyer un courriel pendant deux heures. Aucun message n’est modifié et aucune pièce jointe n’est lue par une personne non autorisée. Le service revient ensuite avec les données intactes.",
    "INC-04 | Une photo d’une fiche d’inscription circule dans un groupe de discussion. Le document original reste en place et n’est pas modifié. Les apprenants peuvent toujours s’inscrire pendant l’incident.",
    "INC-05 | Un dossier partagé est effacé par erreur puis restauré le lendemain. Pendant la coupure, l’équipe ne peut plus consulter les pièces jointes. Le contenu réapparaît ensuite sans changement connu.",
    "INC-06 | Une ancienne version du planning public affiche un mauvais horaire. Les visiteurs voient l’information erronée pendant quelques heures. Le site reste joignable et personne n’accède à des données privées.",
  ];
  const accessRows = [
    { compte: "mariam.sow@soleil.example", role: "direction", partage: "comptabilite", lecture: "oui", ecriture: "non", suppression: "non" },
    { compte: "yao.kouassi@soleil.example", role: "comptable", partage: "comptabilite", lecture: "oui", ecriture: "oui", suppression: "oui" },
    { compte: "aissatou.ndiaye@soleil.example", role: "secretariat", partage: "comptabilite", lecture: "oui", ecriture: "non", suppression: "non" },
    { compte: "fatima.bello@soleil.example", role: "animation", partage: "comptabilite", lecture: "oui", ecriture: "oui", suppression: "oui" },
    { compte: "idriss.camara@soleil.example", role: "formation", partage: "comptabilite", lecture: "non", ecriture: "non", suppression: "non" },
    { compte: "jm.tchoumi@soleil.example", role: "technique", partage: "comptabilite", lecture: "oui", ecriture: "non", suppression: "non" },
  ];
  const guide = `# Guide du TP 5 : construire un registre de risques

> Cadre et limites
>
> Toutes les situations décrites ici sont fictives.
> Tu raisonnes sur un atelier pédagogique.
> Ne testes aucun accès réel et n’essaie pas de reproduire un incident sur une vraie boîte mail ou un vrai partage.

# Méthode

1. Pour un scénario, calcule le score avec la formule : vraisemblance × impact.
2. Niveaux : faible de 1 à 3, moyen de 4 à 6, élevé de 8 à 9, critique de 12 à 16.
3. Pour le traitement :
   - score faible : accepter
   - score moyen ou élevé : réduire
   - score critique sur un actif facultatif : éviter
   - score critique sur un actif indispensable : réduire
   - si la mesure existante est un contrat d’assurance ou d’infogérance, tu peux transférer
4. Pour le moindre privilège, garde seulement les droits nécessaires au rôle réel de la personne.

# Commandes utiles

\`\`\`powershell
Import-Csv -Delimiter ([char]9) -Path "fond-tp5-scenarios.tsv" | Select-Object id,actif,vraisemblance,impact
Import-Csv -Delimiter ([char]9) -Path "fond-tp5-actifs.tsv" | Where-Object donnees_personnelles -eq "oui" | Measure-Object
\`\`\`

\`\`\`bash
awk -F'\\t' 'NR>1 {print $1, $5 * $6}' fond-tp5-scenarios.tsv
awk -F'\\t' 'NR>1 && $4 == "oui" {count += 1} END {print count}' fond-tp5-actifs.tsv
\`\`\`

# Repères

Quand plusieurs scénarios touchent le même actif, additionne leurs scores pour savoir où concentrer les efforts. Pour les incidents passés, choisis la propriété la plus directement touchée : confidentialité, intégrité ou disponibilité.
`;

  const scores = scenarios.map((item) => ({ ...item, score: Number(item.vraisemblance) * Number(item.impact) }));
  const highest = scores.slice().sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))[0];
  const criticalCount = scores.filter((item) => item.score >= 12).length;
  const residualScenario = scores.find((item) => item.id === "SC-10");
  const residualScore = 1 * Number(residualScenario.impact);
  const assetTotals = assets.map((asset) => ({
    id: asset.id,
    total: scores.filter((item) => item.actif === asset.id).reduce((sum, item) => sum + item.score, 0),
  }));
  const topAsset = assetTotals.slice().sort((left, right) => right.total - left.total || left.id.localeCompare(right.id))[0];

  const assetsFile = "fond-tp5-actifs.tsv";
  const scenariosFile = "fond-tp5-scenarios.tsv";
  const incidentsFile = "fond-tp5-incidents.txt";
  const accessFile = "fond-tp5-acces-compta.tsv";
  const guideFile = "fond-tp5-guide.md";

  return {
    files: [
      { name: assetsFile, data: text(tsv(["id", "nom", "type", "donnees_personnelles", "c", "i", "d"], assets.map((item) => ({
        id: item.id, nom: item.nom, type: item.type, donnees_personnelles: item.donnees, c: item.c, i: item.i, d: item.d,
      })))) },
      { name: scenariosFile, data: text(tsv(["id", "actif", "menace", "vulnerabilite", "vraisemblance", "impact", "mesure_existante"], scenarios.map((item) => ({
        id: item.id, actif: item.actif, menace: item.menace, vulnerabilite: item.vulnerabilite, vraisemblance: item.vraisemblance, impact: item.impact, mesure_existante: item.mesure,
      })))) },
      { name: incidentsFile, data: text(incidents.join("\n") + "\n") },
      { name: accessFile, data: text(tsv(["compte", "role", "partage", "lecture", "ecriture", "suppression"], accessRows)) },
      { name: guideFile, data: text(guide) },
    ],
    facts: {
      assetNames: { assetsFile, scenariosFile, incidentsFile, accessFile, guideFile },
      incidentClasses: { "INC-01": "confidentialite", "INC-02": "integrite", "INC-03": "disponibilite" },
      targetScenarioScore: scores.find((item) => item.id === "SC-07").score,
      highestScenarioId: highest.id,
      criticalScenarioCount: criticalCount,
      residualScenarioId: "SC-10",
      residualLikelihood: 1,
      residualScore,
      topAssetId: topAsset.id,
      personalDataAssetCount: assets.filter((item) => item.donnees === "oui").length,
      treatmentScenarioId: "SC-11",
      treatmentAnswer: "accepter",
      leastPrivilegeAccount: "fatima.bello@soleil.example",
    },
  };
}

function buildIncident() {
  const phishingHeaders = [
    "Return-Path: <alerte@banque-hor1zon.example>",
    "From: Banque Horizon <securite@banque-hor1zon.example>",
    "Reply-To: urgence@banque-securite.example.net",
    "To: yao.kouassi@soleil.example",
    "Subject: Validation urgente de votre espace association",
    "Date: Tue, 24 Mar 2026 15:52:11 +0000",
    "Authentication-Results: soleil.example; spf=fail; dkim=none; dmarc=fail",
    "",
    "Bonjour,",
    "",
    "Votre accès Banque Horizon sera suspendu dans 24 heures. Merci de confirmer votre identité via",
    "https://banque-horizon.example.com.verify-access.example/login",
    "",
    "Pièce jointe annoncée : Releve_Mars.pdf.exe",
  ];
  const geoRows = [
    { ip: "203.0.113.10", pays: "Solea", fournisseur: "Zéphyr Mobile" },
    { ip: "203.0.113.18", pays: "Solea", fournisseur: "Fibre Soleil" },
    { ip: "203.0.113.24", pays: "Solea", fournisseur: "Fibre Soleil" },
    { ip: "203.0.113.31", pays: "Solea", fournisseur: "Campus Link" },
    { ip: "203.0.113.44", pays: "Solea", fournisseur: "Zéphyr Mobile" },
    { ip: "198.51.100.77", pays: "Noria", fournisseur: "Transit Azurelle" },
    { ip: "198.51.100.88", pays: "Noria", fournisseur: "Transit Azurelle" },
  ];
  const users = [
    { email: "mariam.sow@soleil.example", homeIp: "203.0.113.10", ua: "Thunderbird 128 (Windows)", method: "motdepasse+mfa" },
    { email: "yao.kouassi@soleil.example", homeIp: "203.0.113.18", ua: "Webmail Chrome 135 (Windows)", method: "motdepasse" },
    { email: "aissatou.ndiaye@soleil.example", homeIp: "203.0.113.24", ua: "Webmail Edge 135 (Windows)", method: "motdepasse+mfa" },
    { email: "idriss.camara@soleil.example", homeIp: "203.0.113.31", ua: "Thunderbird 128 (Linux)", method: "motdepasse+mfa" },
    { email: "fatima.bello@soleil.example", homeIp: "203.0.113.44", ua: "MobileMail 6 (Android)", method: "motdepasse+mfa" },
    { email: "jm.tchoumi@soleil.example", homeIp: "203.0.113.24", ua: "Webmail Firefox 138 (Linux)", method: "motdepasse+mfa" },
  ];
  const attackIp = "198.51.100.77";
  const secondAttackIp = "198.51.100.88";
  const firstAttackSuccess = "2026-03-25T06:18:12Z";
  const passwordReset = "2026-03-25T09:47:20Z";
  const ruleDisabled = "2026-03-25T09:49:09Z";
  const reportedAt = "2026-03-25T09:40:00Z";

  const normalLog = [];
  const windowStart = Date.parse("2026-03-24T00:00:00Z");
  const windowEnd = Date.parse("2026-03-25T12:00:00Z");
  for (let time = windowStart; time <= windowEnd; time += 70 * 60 * 1000) {
    for (const user of users) {
      const stamp = new Date(time + users.indexOf(user) * 7 * 60 * 1000).toISOString().replace(".000", "");
      normalLog.push({ timestamp: stamp, utilisateur: user.email, ip: user.homeIp, resultat: "succes", methode: user.method, agent: user.ua });
    }
  }
  const attackerEntries = [
    { timestamp: "2026-03-25T06:11:03Z", utilisateur: "yao.kouassi@soleil.example", ip: attackIp, resultat: "echec", methode: "motdepasse", agent: "Webmail Chrome 134 (Windows)" },
    { timestamp: "2026-03-25T06:13:48Z", utilisateur: "yao.kouassi@soleil.example", ip: attackIp, resultat: "echec", methode: "motdepasse", agent: "Webmail Chrome 134 (Windows)" },
    { timestamp: "2026-03-25T06:16:27Z", utilisateur: "yao.kouassi@soleil.example", ip: attackIp, resultat: "echec", methode: "motdepasse", agent: "Webmail Chrome 134 (Windows)" },
    { timestamp: firstAttackSuccess, utilisateur: "yao.kouassi@soleil.example", ip: attackIp, resultat: "succes", methode: "motdepasse", agent: "Webmail Chrome 134 (Windows)" },
    { timestamp: "2026-03-25T06:20:02Z", utilisateur: "yao.kouassi@soleil.example", ip: attackIp, resultat: "succes", methode: "motdepasse", agent: "Webmail Chrome 134 (Windows)" },
    { timestamp: "2026-03-25T06:43:11Z", utilisateur: "yao.kouassi@soleil.example", ip: attackIp, resultat: "succes", methode: "motdepasse", agent: "Webmail Chrome 134 (Windows)" },
    { timestamp: "2026-03-25T07:15:54Z", utilisateur: "yao.kouassi@soleil.example", ip: secondAttackIp, resultat: "succes", methode: "motdepasse", agent: "Webmail Chrome 134 (Windows)" },
    { timestamp: "2026-03-25T07:46:18Z", utilisateur: "yao.kouassi@soleil.example", ip: secondAttackIp, resultat: "succes", methode: "motdepasse", agent: "Webmail Chrome 134 (Windows)" },
  ];
  const loginRows = normalLog.concat(attackerEntries).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const auditRows = [
    { timestamp: "2026-03-25T06:24:05Z", compte: "yao.kouassi@soleil.example", action: "regle_transfert_creee", detail: "destination=archives-finance@courrier.invalid" },
    { timestamp: "2026-03-25T06:31:44Z", compte: "yao.kouassi@soleil.example", action: "messages_supprimes", detail: "quantite=14" },
    { timestamp: "2026-03-25T06:37:12Z", compte: "yao.kouassi@soleil.example", action: "pieces_jointes_telechargees", detail: "quantite=6" },
    { timestamp: "2026-03-25T06:38:47Z", compte: "yao.kouassi@soleil.example", action: "lecture_dossier_adhesions", detail: "boite=Reçus 2026" },
    { timestamp: passwordReset, compte: "yao.kouassi@soleil.example", action: "motdepasse_reinitialise", detail: "initie_par_utilisateur=oui" },
    { timestamp: ruleDisabled, compte: "jm.tchoumi@soleil.example", action: "regle_transfert_supprimee", detail: "destination=archives-finance@courrier.invalid" },
  ];
  const guide = `# Guide de l’incident : un compte de messagerie compromis

> Cadre et limites
>
> Toutes les données de cet incident sont fictives.
> Tu mènes une analyse documentaire, pas une chasse active.
> Ne te connecte à aucun vrai compte, ne bloques aucune vraie adresse et ne colles jamais de vrai mot de passe dans un site.

# Méthode

1. Reconstitue la séquence dans le journal de connexions : cherche le premier succès anormal du compte touché, puis les opérations dans le journal de boîte.
2. La prise de connaissance officielle est l’heure du signalement indiquée dans le scénario ou dans la main courante.
3. La double authentification est considérée absente si les connexions réussies du compte compromis n’utilisent qu’une méthode basée sur le mot de passe.
4. Une notification devient nécessaire si l’accès a probablement exposé des données personnelles ou des pièces jointes contenant des informations sur des personnes.
5. Pour un confinement initial, privilégie l’action qui coupe l’accès actif de l’attaquant tout de suite tout en conservant les traces utiles à l’enquête.

# Commandes utiles

\`\`\`powershell
Select-String -Path "fond-incident-connexions-messagerie.log" -Pattern 'yao.kouassi@soleil.example'
Select-String -Path "fond-incident-audit-boite-*.log" -Pattern 'regle_transfert|pieces_jointes_telechargees|messages_supprimes'
\`\`\`

\`\`\`bash
grep -n 'yao.kouassi@soleil.example' fond-incident-connexions-messagerie.log
grep -nE 'regle_transfert|pieces_jointes_telechargees|messages_supprimes' fond-incident-audit-boite-*.log
\`\`\`

## Exemples génériques hors labo, avec des valeurs inventées

\`\`\`bash
debut="2026-06-14T08:15:00Z"; fin="2026-06-14T10:05:00Z"
echo $(( ($(date -u -d "$fin" +%s) - $(date -u -d "$debut" +%s)) / 60 ))
\`\`\`

\`\`\`powershell
$signalement = [datetime]'2026-06-14T09:30:00Z'
$signalement.AddHours(72).ToString('yyyy-MM-dd HH:mm:ss')
\`\`\`

# Repères

Quand une règle de transfert externe est créée, la fenêtre d’exposition ne se ferme qu’au moment où cette règle est retirée.
`;
  const deadline = new Date(Date.parse(reportedAt) + 72 * 60 * 60 * 1000).toISOString();
  const exposureMinutes = minuteDiff(firstAttackSuccess, ruleDisabled);
  const exposureHours = Math.floor(exposureMinutes / 60);
  const exposureRemainingMinutes = exposureMinutes % 60;

  const loginsFile = "fond-incident-connexions-messagerie.log";
  const geoFile = "fond-incident-geoloc-ip.tsv";
  const auditFile = "fond-incident-audit-boite-yao.log";
  const phishingFile = "fond-incident-courriel-phishing.eml";
  const timelineFile = "fond-incident-chronologie.md";
  const guideFile = "fond-incident-guide.md";

  return {
    files: [
      { name: loginsFile, data: text("horodatage | utilisateur | adresse_ip | resultat | methode | agent_utilisateur\n" + loginRows.map((row) => `${row.timestamp} | ${row.utilisateur} | ${row.ip} | ${row.resultat} | ${row.methode} | ${row.agent}`).join("\n") + "\n") },
      { name: geoFile, data: text(tsv(["ip", "pays", "fournisseur"], geoRows)) },
      { name: auditFile, data: text("horodatage | compte | action | detail\n" + auditRows.map((row) => `${row.timestamp} | ${row.compte} | ${row.action} | ${row.detail}`).join("\n") + "\n") },
      { name: phishingFile, data: text(phishingHeaders.join("\n") + "\n") },
      { name: timelineFile, data: text("# Chronologie d’incident\n\n| Horodatage UTC | Événement | Source |\n|---|---|---|\n|  |  |  |\n|  |  |  |\n|  |  |  |\n") },
      { name: guideFile, data: text(guide) },
    ],
    facts: {
      assetNames: { loginsFile, geoFile, auditFile, phishingFile, timelineFile, guideFile },
      firstAttackerSuccessTime: firstAttackSuccess.slice(11, 16),
      attackerIp: attackIp,
      attackerCountry: lower(geoRows.find((row) => row.ip === attackIp).pays),
      attackerFailuresBeforeSuccess: 3,
      mfaEnabled: false,
      forwardingAddress: "archives-finance@courrier.invalid",
      deletedMessages: 14,
      attachmentDownloads: 6,
      passwordResetTime: passwordReset.slice(11, 16),
      exposureHours,
      exposureMinutes: exposureRemainingMinutes,
      notificationDeadline: deadline,
      notificationNeeded: true,
      containmentLetter: "a",
      attackerSuccessIpCount: 2,
      evidenceFileName: auditFile,
    },
  };
}

function buildProject() {
  const auditDate = "2026-03-31";
  const postes = [
    { poste: "SALLE-01", systeme: "Système Alpha 10" },
    { poste: "SALLE-02", systeme: "Système Alpha 8" },
    { poste: "SALLE-03", systeme: "Système Alpha 10" },
    { poste: "SALLE-04", systeme: "Système Bêta 3" },
    { poste: "SALLE-05", systeme: "Système Alpha 8" },
    { poste: "SALLE-06", systeme: "Système Alpha 8" },
    { poste: "SALLE-07", systeme: "Système Gamma 2" },
    { poste: "SALLE-08", systeme: "Système Bêta 3" },
    { poste: "PC-DIRECTION", systeme: "Système Alpha 10" },
    { poste: "PC-COMPTA", systeme: "Système Alpha 8" },
    { poste: "PC-SECRETARIAT", systeme: "Système Bêta 3" },
    { poste: "PC-FORMATION", systeme: "Système Alpha 10" },
  ];
  const support = [
    { systeme: "Système Alpha 8", fin_support: "2026-02-15" },
    { systeme: "Système Alpha 10", fin_support: "2027-12-31" },
    { systeme: "Système Bêta 3", fin_support: "2026-06-30" },
    { systeme: "Système Gamma 2", fin_support: "2026-09-30" },
  ];
  const backupIntegrity = [
    { archive: "adhesions-2026-03-22.zip", algorithme: "MD5", empreinte: "8e2d9d5c56dba6d5ce0f3b2c0d6c317a" },
    { archive: "donateurs-2026-03-22.zip", algorithme: "MD5", empreinte: "5d4d0f7f90f10f0b0a61c8bde97ff2f1" },
  ];
  const mfaReport = [
    { personne: "mariam.sow", role: "direction", mfa: "oui" },
    { personne: "yao.kouassi", role: "comptabilite", mfa: "non" },
    { personne: "aissatou.ndiaye", role: "secretariat", mfa: "non" },
    { personne: "idriss.camara", role: "formation", mfa: "non" },
    { personne: "fatima.bello", role: "animation", mfa: "oui" },
    { personne: "jm.tchoumi", role: "support", mfa: "non" },
  ];
  const notes = [
    "C01 | Domaine: authentification | La couverture de la double authentification doit être vérifiée dans le relevé d’accès fourni avec le projet. Preuve: export mfa du panneau d’administration du 31 mars 2026.",
    "C02 | Domaine: authentification | Le mot de passe du compte accueil est connu de 3 personnes. Preuve: entretien avec Aïssatou et Fatima.",
    "C03 | Domaine: authentification | Deux postes partagent encore un compte local « formation ». Preuve: relevé des sessions de SALLE-03 et SALLE-04.",
    "C04 | Domaine: authentification | Aucun registre de révocation des sessions actives n’est documenté. Preuve: entretien avec Jean-Marc.",
    "C05 | Domaine: postes | Plusieurs postes utilisent encore Système Alpha 8. Preuve: recouper l’inventaire des postes et la table de fin de support du projet.",
    "C06 | Domaine: postes | Le retard maximal de mise à jour observé est de 62 jours. Preuve: export de l’inventaire du 31 mars.",
    "C07 | Domaine: postes | 2 portables ne sont pas chiffrés. Preuve: relevé BitLocker et fiche d’inventaire.",
    "C08 | Domaine: postes | 6 postes ont plus d’un administrateur local. Preuve: export des groupes administrateurs.",
    "C09 | Domaine: sauvegardes | La fraîcheur de la dernière sauvegarde réussie doit être relue dans le journal nocturne du projet. Preuve: journal central joint.",
    "C10 | Domaine: sauvegardes | Aucune copie hors site n’est tenue à jour. Preuve: visite de l’armoire technique.",
    "C11 | Domaine: sauvegardes | Le dernier test de restauration réussi remonte au 15 janvier 2026. Preuve: ticket « restore-test-0115 ».",
    "C12 | Domaine: sauvegardes | Le contrôle d’intégrité publié pour les archives repose sur une famille d’algorithmes ancienne. Preuve: journal d’intégrité joint.",
    "C13 | Domaine: réseau et wi-fi | Le mot de passe administrateur de la box est encore celui livré par l’opérateur. Preuve: fiche collée sous la box.",
    "C14 | Domaine: réseau et wi-fi | Le réseau invité n’est pas séparé du réseau interne. Preuve: même plage 192.168.77.0/24 observée des deux côtés.",
    "C15 | Domaine: réseau et wi-fi | L’inventaire des équipements connectés est incomplet de 2 points d’accès. Preuve: comparaison visite et tableau d’actifs.",
    "C16 | Domaine: réseau et wi-fi | Le certificat de www.soleil.example expire le 12 avril 2026. Preuve: sortie texte du certificat archivée.",
    "C17 | Domaine: données personnelles | L’état du registre des traitements doit être vérifié dans l’inventaire documentaire de conformité. Preuve: dossier conformité joint.",
    "C18 | Domaine: données personnelles | Les fiches papier des apprenants sont rangées dans une armoire non verrouillée. Preuve: visite du secrétariat.",
    "C19 | Domaine: données personnelles | Aucune durée de conservation n’est écrite pour les dossiers papier. Preuve: revue documentaire.",
    "C20 | Domaine: données personnelles | Les exportations de donateurs conservent des colonnes inutiles. Preuve: tableur de février 2026.",
    "C21 | Domaine: sensibilisation | La simulation de phishing du 20 mars a été envoyée à 6 personnes. Preuve: rapport du prestataire bénévole.",
    "C22 | Domaine: sensibilisation | Le nombre de personnes ayant cliqué doit être relu dans le relevé détaillé de simulation. Preuve: rapport du prestataire bénévole joint.",
    "C23 | Domaine: sensibilisation | Aucune session de rappel n’a été planifiée après la simulation. Preuve: agenda partagé.",
    "C24 | Domaine: incidents | Il n’existe pas de procédure écrite de réponse à incident. Preuve: revue documentaire.",
    "C25 | Domaine: incidents | Aucun exercice d’escalade n’a été rejoué cette année. Preuve: entretien équipe.",
    "C26 | Domaine: incidents | La liste de contacts d’urgence n’est pas testée. Preuve: feuille imprimée datée de 2024.",
    "C27 | Domaine: gouvernance | Aucun suivi trimestriel des actions sécurité n’est inscrit à l’ordre du jour du comité. Preuve: comptes rendus.",
    "C28 | Domaine: gouvernance | Le contrat de sauvegarde externe n’inclut pas de garantie de restauration. Preuve: lecture du contrat.",
    "C29 | Domaine: données personnelles | 14 fiches d’inscription de 2021 sont encore présentes sans justification. Preuve: comptage physique.",
    "C30 | Domaine: site web | Le renouvellement automatique du certificat n’est pas supervisé. Preuve: absence d’alerte dans l’outil interne.",
    "C31 | Domaine: site web | Le site publie encore une adresse de contact non revue depuis 2024. Preuve: page contact.",
    "C32 | Domaine: postes | Les signatures antivirus de 5 postes ont plus de 7 jours de retard. Preuve: export de l’antivirus.",
  ];
  const controls = [
    { id: "AU1", domaine: "authentification", controle: "Chaque personne a un mot de passe individuel.", poids: "3", statut: "non" },
    { id: "AU2", domaine: "authentification", controle: "La double authentification couvre tous les comptes sensibles.", poids: "3", statut: "non" },
    { id: "AU3", domaine: "authentification", controle: "Les comptes locaux partagés sont supprimés ou revus.", poids: "2", statut: "partiel" },
    { id: "AU4", domaine: "authentification", controle: "Les sessions actives peuvent être révoquées selon une procédure.", poids: "2", statut: "non" },
    { id: "PO1", domaine: "postes", controle: "Les systèmes sont encore supportés.", poids: "3", statut: "non" },
    { id: "PO2", domaine: "postes", controle: "Les mises à jour sont appliquées en moins de 30 jours.", poids: "3", statut: "partiel" },
    { id: "PO3", domaine: "postes", controle: "Les postes mobiles sont chiffrés.", poids: "2", statut: "partiel" },
    { id: "PO4", domaine: "postes", controle: "Les administrateurs locaux sont limités au strict nécessaire.", poids: "2", statut: "non" },
    { id: "SA1", domaine: "sauvegardes", controle: "Les sauvegardes réussissent chaque semaine sans trou important.", poids: "3", statut: "partiel" },
    { id: "SA2", domaine: "sauvegardes", controle: "Une copie hors site est maintenue.", poids: "3", statut: "non" },
    { id: "SA3", domaine: "sauvegardes", controle: "Un test de restauration récent est conservé.", poids: "2", statut: "partiel" },
    { id: "SA4", domaine: "sauvegardes", controle: "Les archives sont contrôlées avec un algorithme robuste.", poids: "2", statut: "non" },
    { id: "RE1", domaine: "réseau et wi-fi", controle: "Le mot de passe d’administration de la box a été changé.", poids: "3", statut: "non" },
    { id: "RE2", domaine: "réseau et wi-fi", controle: "Le réseau invité est isolé du réseau interne.", poids: "3", statut: "non" },
    { id: "RE3", domaine: "réseau et wi-fi", controle: "L’inventaire des équipements connectés est complet.", poids: "2", statut: "partiel" },
    { id: "RE4", domaine: "réseau et wi-fi", controle: "Le suivi du certificat du site est en place.", poids: "2", statut: "partiel" },
    { id: "DP1", domaine: "données personnelles", controle: "Un registre des traitements existe.", poids: "3", statut: "non" },
    { id: "DP2", domaine: "données personnelles", controle: "Les dossiers papier sont verrouillés.", poids: "3", statut: "non" },
    { id: "DP3", domaine: "données personnelles", controle: "Une durée de conservation est définie.", poids: "2", statut: "partiel" },
    { id: "DP4", domaine: "données personnelles", controle: "Les jeux de données sont minimisés.", poids: "2", statut: "partiel" },
    { id: "IN1", domaine: "gestion des incidents", controle: "Une procédure écrite d’incident existe.", poids: "3", statut: "non" },
    { id: "IN2", domaine: "gestion des incidents", controle: "La sensibilisation est rejouée après une simulation.", poids: "2", statut: "partiel" },
    { id: "IN3", domaine: "gestion des incidents", controle: "Un exercice d’escalade a été mené cette année.", poids: "2", statut: "non" },
    { id: "IN4", domaine: "gestion des incidents", controle: "La liste de contacts d’urgence est testée.", poids: "2", statut: "partiel" },
  ];
  const risks = [
    { action: "A01", lie_a: "AU2", mesure: "Activer la double authentification pour direction et comptabilité", vraisemblance: "3", impact: "4", effort: "1" },
    { action: "A02", lie_a: "RE1", mesure: "Changer le mot de passe d’administration de la box", vraisemblance: "4", impact: "4", effort: "1" },
    { action: "A03", lie_a: "RE2", mesure: "Séparer le réseau invité du réseau interne", vraisemblance: "3", impact: "3", effort: "2" },
    { action: "A04", lie_a: "PO3", mesure: "Chiffrer les portables restants", vraisemblance: "3", impact: "4", effort: "2" },
    { action: "A05", lie_a: "DP1", mesure: "Créer un registre des traitements", vraisemblance: "2", impact: "3", effort: "2" },
    { action: "A06", lie_a: "SA4", mesure: "Remplacer MD5 par SHA-256 pour les archives", vraisemblance: "3", impact: "3", effort: "1" },
    { action: "A07", lie_a: "IN1", mesure: "Rédiger une procédure d’incident courte et testable", vraisemblance: "3", impact: "4", effort: "1" },
    { action: "A08", lie_a: "SA3", mesure: "Planifier un test de restauration trimestriel", vraisemblance: "2", impact: "3", effort: "1" },
    { action: "A09", lie_a: "DP2", mesure: "Fermer à clé l’armoire des fiches papier", vraisemblance: "3", impact: "3", effort: "1" },
  ];
  const guide = `# Guide du projet final : auditer la sécurité du Centre Numérique Soleil

> Cadre et limites
>
> Toutes les notes et tous les risques de ce projet sont fictifs.
> Tu rédiges un audit pédagogique.
> N’utilise rien ici pour juger une vraie association sans vérification sur place.

# Grille et calculs

1. Statuts : conforme = 1, partiel = 0,5, non = 0.
2. Score d’un domaine = somme(poids × statut) / somme(poids) × 100.
3. Score global = somme(poids × statut) / somme(poids) × 100, arrondi à l’entier.
4. Action prioritaire : trie d’abord par score de risque décroissant, puis par effort croissant.
5. Gain rapide : effort 1 et score de risque au moins égal à 6.
6. Délai réglementaire de notification d’une violation de données : 72 heures après la prise de connaissance.
7. La sensibilisation prioritaire cible les personnes qui ont cliqué pendant la simulation.

# Commandes utiles

\`\`\`powershell
Select-String -Path "fond-projet-notes-terrain.md" -Pattern '^- C[0-9]+'
Import-Csv -Delimiter ([char]9) -Path "fond-projet-risques.tsv" | Select-Object action,vraisemblance,impact,effort
Import-Csv -Delimiter ([char]9) -Path "fond-projet-postes.tsv" | Select-Object poste,systeme
Import-Csv -Delimiter ([char]9) -Path "fond-projet-support-systemes.tsv" | Select-Object systeme,fin_support
Import-Csv -Delimiter ([char]9) -Path "fond-projet-acces-mfa.tsv" | Select-Object personne,mfa
Import-Csv -Delimiter ([char]9) -Path "fond-projet-conformite-donnees.tsv" | Select-Object document,etat
Import-Csv -Delimiter ([char]9) -Path "fond-projet-simulation-phishing.tsv" | Select-Object personne,a_clique
\`\`\`

\`\`\`bash
grep -E '^- C[0-9]+' fond-projet-notes-terrain.md
awk -F'\\t' 'NR>1 {print $1, $4 * $5, $6}' fond-projet-risques.tsv
awk -F'\\t' 'NR==FNR && NR>1 {support[$1]=$2; next} NR>1 && support[$2] < "2026-03-31" {count += 1} END {print count}' fond-projet-support-systemes.tsv fond-projet-postes.tsv
awk -F'\\t' 'NR>1 {print $1, $3}' fond-projet-acces-mfa.tsv
awk -F'\\t' 'NR>1 {print $1, $2}' fond-projet-conformite-donnees.tsv
awk -F'\\t' 'NR>1 && $2 == "oui" {count += 1} END {print count}' fond-projet-simulation-phishing.tsv
\`\`\`

## Exemples génériques hors labo, avec des valeurs inventées

\`\`\`powershell
$debut = [datetime]'2026-06-14T00:00:00Z'
$fin = [datetime]'2026-06-21T00:00:00Z'
(New-TimeSpan -Start $debut -End $fin).Days
\`\`\`

\`\`\`bash
debut="2026-06-14"; fin="2026-06-21"
echo $(( ($(date -u -d "$fin" +%s) - $(date -u -d "$debut" +%s)) / 86400 ))
\`\`\`

# Repères

Le fichier de notes sert à justifier le constat, la grille sert à noter, et le fichier de risques sert à prioriser. Ne mélange pas les trois niveaux.
`;

  const scoreValue = { conforme: 1, partiel: 0.5, non: 0 };
  const domainGroups = new Map();
  for (const control of controls) {
    const current = domainGroups.get(control.domaine) ?? { weight: 0, points: 0 };
    current.weight += Number(control.poids);
    current.points += Number(control.poids) * scoreValue[control.statut];
    domainGroups.set(control.domaine, current);
  }
  const domainScores = [...domainGroups.entries()].map(([domaine, values]) => ({
    domaine,
    percent: round((values.points / values.weight) * 100),
    raw: values.points / values.weight,
  }));
  const totalWeight = controls.reduce((sum, item) => sum + Number(item.poids), 0);
  const totalPoints = controls.reduce((sum, item) => sum + Number(item.poids) * scoreValue[item.statut], 0);
  const scoredRisks = risks.map((item) => ({ ...item, score: Number(item.vraisemblance) * Number(item.impact) }))
    .sort((left, right) => right.score - left.score || Number(left.effort) - Number(right.effort) || left.action.localeCompare(right.action));
  const projectGuideFile = "fond-projet-guide.md";
  const notesFile = "fond-projet-notes-terrain.md";
  const gridFile = "fond-projet-grille-audit.md";
  const risksFile = "fond-projet-risques.tsv";
  const reportFile = "fond-projet-modele-rapport.md";

  return {
    files: [
      { name: notesFile, data: text("# Notes de terrain\n\n" + notes.map((line) => `- ${line}`).join("\n") + "\n") },
      { name: gridFile, data: text(`# Grille d’audit\n\n## Règles de score\n\n- conforme = 1\n- partiel = 0,5\n- non = 0\n- score d’un domaine = somme(poids × statut) / somme(poids) × 100\n- score global = somme(poids × statut) / somme(poids) × 100\n- pour l’intégrité des sauvegardes, seules les familles SHA-2 ou plus récentes sont acceptables ; les algorithmes plus anciens sont à éviter\n\n| id | domaine | poids | statut | contrôle |\n|---|---|---:|---|---|\n${controls.map((item) => `| ${item.id} | ${item.domaine} | ${item.poids} | ${item.statut} | ${item.controle} |`).join("\n")}\n`) },
      { name: risksFile, data: text(tsv(["action", "lie_a", "mesure", "vraisemblance", "impact", "effort"], risks)) },
      { name: "fond-projet-postes.tsv", data: text(tsv(["poste", "systeme"], postes)) },
      { name: "fond-projet-support-systemes.tsv", data: text(tsv(["systeme", "fin_support"], support)) },
      { name: "fond-projet-integrite-sauvegardes.tsv", data: text(tsv(["archive", "algorithme", "empreinte"], backupIntegrity)) },
      { name: "fond-projet-acces-mfa.tsv", data: text(tsv(["personne", "role", "mfa"], mfaReport)) },
      { name: "fond-projet-sauvegardes.log", data: text([
        "2026-03-20T01:10:00Z | SUCCESS | Cycle nocturne terminé, 12 postes sauvegardés.",
        "2026-03-21T01:10:00Z | SUCCESS | Cycle nocturne terminé, 12 postes sauvegardés.",
        "2026-03-22T01:10:00Z | SUCCESS | Cycle nocturne terminé, 12 postes sauvegardés.",
        "2026-03-23T01:10:00Z | FAIL | Partage indisponible, reprise manuelle demandée.",
        "2026-03-24T01:10:00Z | FAIL | Écriture externe impossible.",
      ].join("\n") + "\n") },
      { name: "fond-projet-conformite-donnees.tsv", data: text(tsv(["document", "etat", "preuve"], [
        { document: "registre_des_traitements", etat: "absent", preuve: "aucun_fichier_dans_le_dossier_conformite" },
        { document: "politique_conservation", etat: "brouillon", preuve: "version_non_validee" },
      ])) },
      { name: "fond-projet-simulation-phishing.tsv", data: text(tsv(["personne", "a_clique", "a_signale"], [
        { personne: "mariam.sow", a_clique: "non", a_signale: "oui" },
        { personne: "yao.kouassi", a_clique: "oui", a_signale: "non" },
        { personne: "aissatou.ndiaye", a_clique: "oui", a_signale: "non" },
        { personne: "idriss.camara", a_clique: "non", a_signale: "oui" },
        { personne: "fatima.bello", a_clique: "oui", a_signale: "non" },
        { personne: "jm.tchoumi", a_clique: "non", a_signale: "oui" },
      ])) },
      { name: reportFile, data: text("# Modèle de rapport\n\n## 1. Résumé exécutif\n\n## 2. Constats principaux\n\n## 3. Priorités\n\n## 4. Plan d’action à 90 jours\n") },
      { name: projectGuideFile, data: text(guide) },
    ],
    facts: {
      auditDate,
      assetNames: {
        notesFile,
        gridFile,
        risksFile,
        reportFile,
        guideFile: projectGuideFile,
        postsFile: "fond-projet-postes.tsv",
        supportFile: "fond-projet-support-systemes.tsv",
        integrityFile: "fond-projet-integrite-sauvegardes.tsv",
        accessFile: "fond-projet-acces-mfa.tsv",
        backupFile: "fond-projet-sauvegardes.log",
        privacyFile: "fond-projet-conformite-donnees.tsv",
        awarenessFile: "fond-projet-simulation-phishing.tsv",
      },
      domainScoreTarget: "sauvegardes",
      domainScorePercent: domainScores.find((item) => item.domaine === "sauvegardes").percent,
      globalScorePercent: round((totalPoints / totalWeight) * 100),
      weakestDomain: domainScores.slice().sort((left, right) => left.raw - right.raw || left.domaine.localeCompare(right.domaine))[0].domaine,
      nonCompliantCount: controls.filter((item) => item.statut === "non").length,
      topPriorityAction: scoredRisks[0].action,
      quickWinCount: scoredRisks.filter((item) => item.score >= 6 && Number(item.effort) === 1).length,
      lastBackupDate: "2026-03-22",
      lastBackupAgeDays: dayDiff("2026-03-22", auditDate),
      mfaCoveragePercent: round((2 / 6) * 100),
      unsupportedPostCount: 4,
      certificateExpiryDate: "2026-04-12",
      certificateDaysRemaining: dayDiff(auditDate, "2026-04-12"),
      backupIntegrityAlgorithm: "md5",
      backupIntegrityAcceptable: false,
      processingRegisterExists: false,
      notificationDelayHours: 72,
      priorityAwarenessCount: 3,
    },
  };
}

function buildSecuriteAssetsB() {
  const hygiene = buildHygiene();
  const risks = buildRisks();
  const incident = buildIncident();
  const project = buildProject();
  return {
    files: [...hygiene.files, ...risks.files, ...incident.files, ...project.files],
    facts: {
      hygiene: hygiene.facts,
      risks: risks.facts,
      incident: incident.facts,
      project: project.facts,
    },
  };
}

module.exports = { buildSecuriteAssetsB, sha256 };
