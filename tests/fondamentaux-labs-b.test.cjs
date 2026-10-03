const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { buildSecuriteAssetsB } = require("../scripts/lab-scenarios-securite-b.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");
const { load } = require("../scripts/ts-loader.cjs");

const AUDIT_HYGIENE = "2026-03-12";
const AUDIT_PROJECT = "2026-03-31";
const dayMs = 24 * 60 * 60 * 1000;

const normalize = (value) => String(value).toLowerCase().trim().replace(/\s+/g, " ");
const accept = (task, value) => task.accepted.includes(normalize(value));
const parseDateOnly = (value) => Date.parse(`${value}T00:00:00Z`);
const dayDiff = (from, to) => Math.round((parseDateOnly(to) - parseDateOnly(from)) / dayMs);
const minuteDiff = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 60000);
const monthIndex = { janvier: "01", février: "02", fevrier: "02", mars: "03", avril: "04", mai: "05", juin: "06", juillet: "07", août: "08", aout: "08", septembre: "09", octobre: "10", novembre: "11", décembre: "12", decembre: "12" };
const weakestDomainLetter = {
  "authentification": "a",
  "postes": "b",
  "sauvegardes": "c",
  "réseau et wi-fi": "d",
  "données personnelles": "e",
  "gestion des incidents": "f",
};

function parseTsv(content) {
  const lines = content.trim().split("\n");
  const headers = lines.shift().split("\t");
  return lines.map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function parsePipeFile(content) {
  const lines = content.trim().split("\n");
  const headers = lines.shift().split(" | ").map((cell) => cell.trim());
  return lines.map((line) => {
    const cells = line.split(" | ").map((cell) => cell.trim());
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function parseMarkdownTable(content) {
  return content.split("\n")
    .filter((line) => /^\|/.test(line))
    .slice(2)
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 5)
    .map(([id, domaine, poids, statut, controle]) => ({ id, domaine, poids, statut, controle }));
}

function mode(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0][0];
}

function projectScoreValue(status) {
  if (status === "conforme") return 1;
  if (status === "partiel") return 0.5;
  return 0;
}

function frenchDateToIso(value) {
  const match = /(\d{1,2}) ([a-zéû]+) (\d{4})/iu.exec(value);
  assert.ok(match, `date française reconnue: ${value}`);
  return `${match[3]}-${monthIndex[normalize(match[2])]}-${match[1].padStart(2, "0")}`;
}

test("les labs B restent déterministes, cohérents et sans problème de qualité", () => {
  const first = buildSecuriteAssetsB();
  const second = buildSecuriteAssetsB();
  assert.deepEqual(Object.keys(first.facts), ["hygiene", "risks", "incident", "project"]);
  assert.equal(first.files.length, second.files.length);
  assert.equal(JSON.stringify(first.facts), JSON.stringify(second.facts));
  for (let index = 0; index < first.files.length; index += 1) {
    assert.equal(first.files[index].name, second.files[index].name);
    assert.ok(first.files[index].data.equals(second.files[index].data), `octets identiques pour ${first.files[index].name}`);
    assert.ok(first.files[index].name.startsWith("fond-"), `préfixe fond- pour ${first.files[index].name}`);
    assert.notEqual(first.files[index].data[0], 0xef, `pas de BOM dans ${first.files[index].name}`);
    assert.equal(first.files[index].data.includes(Buffer.from("\r\n")), false, `pas de CRLF dans ${first.files[index].name}`);
    assert.ok(first.files[index].data.length < 150 * 1024, `taille acceptable pour ${first.files[index].name}`);
  }
});

test("les définitions TypeScript B déclarent exactement les quatre labs attendus", () => {
  const { facts, files } = buildSecuriteAssetsB();
  const { buildLabsB } = load("supabase/seed/content/fondamentaux-labs-b");
  const labs = buildLabsB(facts);
  assert.deepEqual(labs.map((lab) => lab.slug), [
    "tp-hygiene-postes",
    "tp-registre-risques",
    "incident-compte-compromis",
    "projet-audit-soleil",
  ]);
  for (const lab of labs) {
    assert.deepEqual(labIssues(lab), [], `aucun problème de qualité pour ${lab.slug}`);
    assert.ok(lab.tasks.length >= (lab.isAssessment ? 12 : 9), `nombre minimal de tâches pour ${lab.slug}`);
    for (const task of lab.tasks) {
      assert.ok(task.accepted.length >= 1 && task.accepted.length <= 8, `réponses bornées pour ${lab.slug}`);
      for (const answer of task.accepted) assert.equal(answer, normalize(answer), `réponse normalisée pour ${lab.slug}`);
    }
  }
  const declared = new Set(labs.flatMap((lab) => lab.assets.map((asset) => asset.url.replace("/labs/", ""))));
  const generated = new Set(files.map((file) => file.name));
  assert.deepEqual([...declared].sort(), [...generated].sort(), "chaque fichier est déclaré et aucun asset ne pointe ailleurs");
});

test("les réponses du TP 3 sont recalculées depuis les fichiers", () => {
  const built = buildSecuriteAssetsB();
  const fileMap = new Map(built.files.map((file) => [file.name, file.data.toString("utf8")]));
  const { buildLabsB } = load("supabase/seed/content/fondamentaux-labs-b");
  const lab = buildLabsB(built.facts)[0];
  const inventory = parseTsv(fileMap.get("fond-tp3-inventaire-postes.tsv"));
  const support = new Map(parseTsv(fileMap.get("fond-tp3-support-systemes.tsv")).map((row) => [row.systeme, row.fin_support]));
  const backupLines = fileMap.get("fond-tp3-sauvegarde-30j.log").trim().split("\n").map((line) => {
    const [horodatage, status, message] = line.split(" | ");
    return { horodatage, status, message };
  });
  const copies = fileMap.get("fond-tp3-copies-321.txt");

  const unsupported = inventory.filter((row) => support.get(row.systeme) < AUDIT_HYGIENE).length;
  assert.ok(accept(lab.tasks[0], unsupported));

  const maxLag = Math.max(...inventory.map((row) => dayDiff(row.derniere_maj, AUDIT_HYGIENE)));
  assert.ok(accept(lab.tasks[1], maxLag));

  const unencryptedPortable = inventory.filter((row) => row.type === "portable" && row.disque_chiffre === "non").length;
  assert.ok(accept(lab.tasks[2], unencryptedPortable));

  const staleAntivirus = inventory.filter((row) => dayDiff(row.date_signatures, AUDIT_HYGIENE) > 7).length;
  assert.ok(accept(lab.tasks[3], staleAntivirus));

  const perDay = new Map();
  for (const row of backupLines) {
    const day = row.horodatage.slice(0, 10);
    const bucket = perDay.get(day) ?? [];
    bucket.push(row.status);
    perDay.set(day, bucket);
  }
  const orderedDays = [...perDay.keys()].sort();
  let longestGap = 0;
  let currentGap = 0;
  for (const day of orderedDays) {
    const statuses = perDay.get(day);
    if (statuses.includes("SUCCESS")) {
      longestGap = Math.max(longestGap, currentGap);
      currentGap = 0;
    } else if (statuses.includes("FAIL")) currentGap += 1;
  }
  longestGap = Math.max(longestGap, currentGap);
  assert.ok(accept(lab.tasks[4], longestGap));

  assert.ok(accept(lab.tasks[5], "non"));
  assert.ok(accept(lab.tasks[6], "c"));

  const restoreLine = backupLines.find((row) => row.status === "RESTORE_OK");
  const restoreDate = restoreLine.horodatage.slice(0, 10);
  assert.ok(accept(lab.tasks[7], restoreDate));
  assert.ok(accept(lab.tasks[8], dayDiff(restoreDate, AUDIT_HYGIENE)));

  const scores = inventory.map((row) => ({
    poste: row.poste,
    score: (support.get(row.systeme) < AUDIT_HYGIENE ? 3 : 0)
      + (dayDiff(row.derniere_maj, AUDIT_HYGIENE) > 30 ? 2 : 0)
      + (dayDiff(row.date_signatures, AUDIT_HYGIENE) > 7 ? 2 : 0)
      + (row.disque_chiffre === "non" ? 2 : 0)
      + Math.max(Number(row.admins_locaux) - 1, 0)
      + (dayDiff(row.derniere_sauvegarde, AUDIT_HYGIENE) > 7 ? 2 : 0),
  })).sort((left, right) => right.score - left.score || left.poste.localeCompare(right.poste));
  assert.ok(accept(lab.tasks[9], scores[0].poste));

  const passed = inventory.reduce((sum, row) => sum + [
    support.get(row.systeme) >= AUDIT_HYGIENE,
    dayDiff(row.derniere_maj, AUDIT_HYGIENE) <= 30,
    dayDiff(row.date_signatures, AUDIT_HYGIENE) <= 7,
    row.disque_chiffre === "oui",
    Number(row.admins_locaux) <= 1,
    dayDiff(row.derniere_sauvegarde, AUDIT_HYGIENE) <= 7,
  ].filter(Boolean).length, 0);
  const compliance = Math.round((passed / (inventory.length * 6)) * 100);
  assert.ok(accept(lab.tasks[10], compliance));

  const multiAdmin = inventory.filter((row) => Number(row.admins_locaux) > 1).length;
  assert.ok(accept(lab.tasks[11], multiAdmin));
  assert.match(copies, /nom \| support \| lieu/u);
});

test("les réponses du TP 5 sont recalculées depuis les fichiers", () => {
  const built = buildSecuriteAssetsB();
  const fileMap = new Map(built.files.map((file) => [file.name, file.data.toString("utf8")]));
  const { buildLabsB } = load("supabase/seed/content/fondamentaux-labs-b");
  const lab = buildLabsB(built.facts)[1];
  const assets = parseTsv(fileMap.get("fond-tp5-actifs.tsv"));
  const scenarios = parseTsv(fileMap.get("fond-tp5-scenarios.tsv")).map((row) => ({ ...row, score: Number(row.vraisemblance) * Number(row.impact) }));
  const incidents = Object.fromEntries(fileMap.get("fond-tp5-incidents.txt").trim().split("\n").map((line) => {
    const [id, description] = line.split(" | ");
    return [id, description];
  }));
  const access = parseTsv(fileMap.get("fond-tp5-acces-compta.tsv"));

  const classify = (text) => {
    if (/lit|photo|circule/u.test(text)) return "c";
    if (/remplace|mauvais horaire/u.test(text)) return "i";
    return "d";
  };
  assert.ok(accept(lab.tasks[0], classify(incidents["INC-01"])));
  assert.ok(accept(lab.tasks[1], classify(incidents["INC-02"])));
  assert.ok(accept(lab.tasks[2], classify(incidents["INC-03"])));
  assert.ok(accept(lab.tasks[3], scenarios.find((row) => row.id === "SC-07").score));
  assert.ok(accept(lab.tasks[4], scenarios.slice().sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))[0].id));
  assert.ok(accept(lab.tasks[5], scenarios.filter((row) => row.score >= 12).length));
  assert.ok(accept(lab.tasks[6], Number(scenarios.find((row) => row.id === "SC-10").impact)));

  const topAsset = assets.map((asset) => ({
    id: asset.id,
    total: scenarios.filter((row) => row.actif === asset.id).reduce((sum, row) => sum + row.score, 0),
  })).sort((left, right) => right.total - left.total || left.id.localeCompare(right.id))[0];
  assert.ok(accept(lab.tasks[7], topAsset.id));
  assert.ok(accept(lab.tasks[8], assets.filter((row) => row.donnees_personnelles === "oui").length));
  assert.ok(accept(lab.tasks[9], "d"));

  const overPrivileged = access.find((row) => row.role !== "comptable" && (row.ecriture === "oui" || row.suppression === "oui"));
  assert.ok(accept(lab.tasks[10], overPrivileged.compte));
});

test("les réponses de l’incident sont recalculées depuis les fichiers", () => {
  const built = buildSecuriteAssetsB();
  const fileMap = new Map(built.files.map((file) => [file.name, file.data.toString("utf8")]));
  const { buildLabsB } = load("supabase/seed/content/fondamentaux-labs-b");
  const lab = buildLabsB(built.facts)[2];
  const logins = parsePipeFile(fileMap.get("fond-incident-connexions-messagerie.log"));
  const geo = new Map(parseTsv(fileMap.get("fond-incident-geoloc-ip.tsv")).map((row) => [row.ip, row]));
  const audit = parsePipeFile(fileMap.get("fond-incident-audit-boite-yao.log"));
  const yaoRows = logins.filter((row) => row.utilisateur === "yao.kouassi@soleil.example");
  const usualIp = mode(yaoRows.filter((row) => row.resultat === "succes").map((row) => row.adresse_ip));
  const suspiciousSuccess = yaoRows.filter((row) => row.resultat === "succes" && row.adresse_ip !== usualIp)
    .sort((left, right) => left.horodatage.localeCompare(right.horodatage))[0];
  const priorFailures = yaoRows.filter((row) => row.adresse_ip === suspiciousSuccess.adresse_ip && row.resultat === "echec" && row.horodatage < suspiciousSuccess.horodatage).length;
  const createdRule = audit.find((row) => row.action === "regle_transfert_creee");
  const deleted = audit.find((row) => row.action === "messages_supprimes");
  const downloads = audit.find((row) => row.action === "pieces_jointes_telechargees");
  const reset = audit.find((row) => row.action === "motdepasse_reinitialise");
  const removedRule = audit.find((row) => row.action === "regle_transfert_supprimee");
  const deadline = new Date(Date.parse("2026-03-25T09:40:00Z") + 72 * 60 * 60 * 1000).toISOString();

  assert.ok(accept(lab.tasks[0], suspiciousSuccess.horodatage.slice(11, 16)));
  assert.ok(accept(lab.tasks[1], suspiciousSuccess.adresse_ip));
  assert.ok(accept(lab.tasks[2], geo.get(suspiciousSuccess.adresse_ip).pays));
  assert.ok(accept(lab.tasks[3], priorFailures));
  assert.ok(accept(lab.tasks[4], suspiciousSuccess.methode.includes("mfa") ? "oui" : "non"));
  assert.ok(accept(lab.tasks[5], createdRule.detail.split("destination=")[1]));
  assert.ok(accept(lab.tasks[6], Number(deleted.detail.split("=")[1])));
  assert.ok(accept(lab.tasks[7], Number(downloads.detail.split("=")[1])));
  assert.ok(accept(lab.tasks[8], reset.horodatage.slice(11, 16)));

  const exposureMinutes = minuteDiff(suspiciousSuccess.horodatage, removedRule.horodatage);
  const exposureHours = Math.floor(exposureMinutes / 60);
  const exposureAnswer = `${exposureHours}h${String(exposureMinutes % 60).padStart(2, "0")}`;
  assert.ok(accept(lab.tasks[9], exposureMinutes));
  assert.ok(accept(lab.tasks[9], exposureAnswer));
  assert.ok(accept(lab.tasks[10], `${deadline.slice(0, 10)} ${deadline.slice(11, 16)}`));
  assert.ok(accept(lab.tasks[11], "oui"));
  assert.ok(accept(lab.tasks[12], "a"));
  const attackerSuccessIps = new Set(yaoRows.filter((row) => row.resultat === "succes" && row.adresse_ip !== usualIp).map((row) => row.adresse_ip));
  assert.ok(accept(lab.tasks[13], attackerSuccessIps.size));
  assert.ok(accept(lab.tasks[14], path.basename("fond-incident-audit-boite-yao.log")));
});

test("les réponses du projet final sont recalculées depuis les fichiers", () => {
  const built = buildSecuriteAssetsB();
  const fileMap = new Map(built.files.map((file) => [file.name, file.data.toString("utf8")]));
  const { buildLabsB } = load("supabase/seed/content/fondamentaux-labs-b");
  const lab = buildLabsB(built.facts)[3];
  const notes = fileMap.get("fond-projet-notes-terrain.md");
  const controls = parseMarkdownTable(fileMap.get("fond-projet-grille-audit.md"));
  const risks = parseTsv(fileMap.get("fond-projet-risques.tsv")).map((row) => ({ ...row, score: Number(row.vraisemblance) * Number(row.impact) }));
  const postes = parseTsv(fileMap.get("fond-projet-postes.tsv"));
  const support = new Map(parseTsv(fileMap.get("fond-projet-support-systemes.tsv")).map((row) => [row.systeme, row.fin_support]));
  const integrity = parseTsv(fileMap.get("fond-projet-integrite-sauvegardes.tsv"));
  const accessMfa = parseTsv(fileMap.get("fond-projet-acces-mfa.tsv"));
  const backupLog = fileMap.get("fond-projet-sauvegardes.log").trim().split("\n").map((line) => {
    const [horodatage, status, message] = line.split(" | ");
    return { horodatage, status, message };
  });
  const privacyDocs = parseTsv(fileMap.get("fond-projet-conformite-donnees.tsv"));
  const simulation = parseTsv(fileMap.get("fond-projet-simulation-phishing.tsv"));
  const guide = fileMap.get("fond-projet-guide.md");

  const domainRows = controls.filter((row) => row.domaine === "sauvegardes");
  const domainWeight = domainRows.reduce((sum, row) => sum + Number(row.poids), 0);
  const domainPoints = domainRows.reduce((sum, row) => sum + Number(row.poids) * projectScoreValue(row.statut), 0);
  assert.ok(accept(lab.tasks[0], Math.round((domainPoints / domainWeight) * 100)));

  const totalWeight = controls.reduce((sum, row) => sum + Number(row.poids), 0);
  const totalPoints = controls.reduce((sum, row) => sum + Number(row.poids) * projectScoreValue(row.statut), 0);
  assert.ok(accept(lab.tasks[1], Math.round((totalPoints / totalWeight) * 100)));

  const weakest = [...new Set(controls.map((row) => row.domaine))].map((domaine) => {
    const rows = controls.filter((row) => row.domaine === domaine);
    const weight = rows.reduce((sum, row) => sum + Number(row.poids), 0);
    const points = rows.reduce((sum, row) => sum + Number(row.poids) * projectScoreValue(row.statut), 0);
    return { domaine, ratio: points / weight };
  }).sort((left, right) => left.ratio - right.ratio || left.domaine.localeCompare(right.domaine))[0];
  assert.ok(accept(lab.tasks[2], weakestDomainLetter[weakest.domaine]));
  assert.ok(accept(lab.tasks[3], controls.filter((row) => row.statut === "non").length));

  const sortedRisks = risks.slice().sort((left, right) => right.score - left.score || Number(left.effort) - Number(right.effort) || left.action.localeCompare(right.action));
  assert.ok(accept(lab.tasks[4], sortedRisks[0].action));
  assert.ok(accept(lab.tasks[5], sortedRisks.filter((row) => row.score >= 6 && Number(row.effort) === 1).length));

  const lastBackup = backupLog.filter((row) => row.status === "SUCCESS").sort((left, right) => right.horodatage.localeCompare(left.horodatage))[0].horodatage.slice(0, 10);
  assert.ok(accept(lab.tasks[6], dayDiff(lastBackup, AUDIT_PROJECT)));

  const mfaPercent = Math.round((accessMfa.filter((row) => row.mfa === "oui").length / accessMfa.length) * 100);
  assert.ok(accept(lab.tasks[7], mfaPercent));

  const unsupportedCount = postes.filter((row) => support.get(row.systeme) < AUDIT_PROJECT).length;
  assert.ok(accept(lab.tasks[8], unsupportedCount));

  const expiry = frenchDateToIso(/expire le ([^.]+)/u.exec(notes)[1]);
  assert.ok(accept(lab.tasks[9], dayDiff(AUDIT_PROJECT, expiry)));

  const algorithm = integrity[0].algorithme.toLowerCase();
  const avoidRule = /SHA-2 ou plus récentes sont acceptables/u.test(fileMap.get("fond-projet-grille-audit.md"));
  assert.ok(accept(lab.tasks[10], avoidRule && !algorithm.startsWith("sha-2") && !algorithm.startsWith("sha-256") && !algorithm.startsWith("sha-384") && !algorithm.startsWith("sha-512") ? "non" : "oui"));
  assert.ok(accept(lab.tasks[11], algorithm));

  assert.ok(accept(lab.tasks[12], privacyDocs.find((row) => row.document === "registre_des_traitements").etat === "absent" ? "non" : "oui"));
  assert.ok(accept(lab.tasks[13], /72 heures/u.test(guide) ? 72 : 0));

  const clicked = simulation.filter((row) => row.a_clique === "oui").length;
  assert.ok(accept(lab.tasks[14], clicked));
});
