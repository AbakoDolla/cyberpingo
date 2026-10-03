const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const path = require("node:path");

const { buildSecuriteAssetsA } = require("../scripts/lab-scenarios-securite-a.cjs");
const { load } = require("../scripts/ts-loader.cjs");
const { labIssues } = require("../scripts/content-quality.cjs");

const normalize = (value) => String(value).toLowerCase().trim().replace(/\s+/g, " ");
const sha256Hex = (value) => crypto.createHash("sha256").update(value).digest("hex");
const registrableDomain = (host) => {
  const labels = host.toLowerCase().split(".").filter(Boolean);
  return labels.length <= 2 ? host.toLowerCase() : labels.slice(-2).join(".");
};
const daysBetween = (fromIso, toIso) => Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86400000);
const entropyBits = (words, listSize) => Math.round(words * Math.log2(listSize));
const bruteForceHours = (charset, length, speed) => Math.round((charset ** length) / speed / 3600);
const monthNumber = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

function scenario() {
  const generated = buildSecuriteAssetsA();
  const { buildLabsA } = load("supabase/seed/content/fondamentaux-labs-a");
  const labs = buildLabsA(generated.facts);
  const files = new Map(generated.files.map((file) => [file.name, file.data]));
  const text = (name) => files.get(name).toString("utf8");
  return { generated, labs, files, text };
}

function assetName(url) {
  return path.posix.basename(url);
}

function parsePipeTable(text, expectedColumns) {
  return text.split("\n")
    .filter((line) => line.includes(" | "))
    .map((line) => line.split(" | ").map((part) => part.trim()))
    .filter((cells) => cells.length === expectedColumns);
}

function derivePhishing(text, taskPrompt) {
  const email = text("fond-tp1-courriel.log");
  const mobile = text("fond-tp1-mobile.log");
  const fromDomain = /From:.*<[^@\s]+@([^>\s]+)>/i.exec(email)[1];
  const returnPathDomain = /Return-Path:\s*<[^@\s]+@([^>\s]+)>/i.exec(email)[1];
  const receivedIps = [...email.matchAll(/^Received:[\s\S]*?\[(\d+\.\d+\.\d+\.\d+)\]/gim)].map((match) => match[1]);
  const originIp = [...receivedIps].reverse().find((ip) => !ip.startsWith("192.168.77."));
  const spf = /spf=(\w+)/i.exec(email)[1];
  const host = /https:\/\/([^\/\s">]+)\/session\/confirm/i.exec(email)[1];
  const attachment = /filename="([^"]+)"/i.exec(email)[1];
  const extension = attachment.split(".").pop().toLowerCase();
  const deadlineHours = /sous (\d+) heures/i.exec(email)[1];
  const neverShareLetter = /Donnez-moi ensuite le (.+?) reçu/i.test(mobile) ? "a" : "";
  const firstActionLetter = / b\) changer le mot de passe depuis le vrai site puis activer la double authentification/i.test(taskPrompt) ? "b" : "";
  const gridChecks = [
    fromDomain !== "banque-horizon.example",
    /Reply-To:.*<[^@\s]+@([^>\s]+)>/i.exec(email)[1] !== fromDomain || returnPathDomain !== fromDomain,
    /spf=fail/i.test(email),
    /dkim=(?:none|fail)/i.test(email),
    /dmarc=fail/i.test(email),
    /<a href="https:\/\/[^"]+">https:\/\/www\.banque-horizon\.example\/securite<\/a>/i.test(email),
    /\.(?:pdf)\.exe/i.test(attachment),
    /sous 24 heures/i.test(email) && /(suspension|blocage)/i.test(email),
    /@(gmail|yahoo|outlook)\./i.test(email),
    /(coordonnées bancaires complètes|rib complet)/i.test(email),
  ];
  return [fromDomain, returnPathDomain, originIp, spf, registrableDomain(host), extension, deadlineHours, neverShareLetter, firstActionLetter, String(gridChecks.filter(Boolean).length)];
}

function derivePasswords(lab, current) {
  const inventoryText = current.text("fond-tp2-inventaire-comptes.log");
  const hashesText = current.text("fond-tp2-empreintes-sha256.log");
  const dictionaryText = current.text("fond-tp2-dictionnaire-fictif.txt");
  const inventory = parsePipeTable(inventoryText, 6)
    .filter(([id]) => id !== "identifiant")
    .map(([id, role, privilege, changed, mfa, last]) => ({ id, role, privilege, changed, mfa, last }));
  const hashes = parsePipeTable(hashesText, 2)
    .filter(([id, digest]) => id !== "identifiant" && /^[0-9a-f]{64}$/i.test(digest))
    .map(([id, digest]) => ({ id, digest }));
  const dictionary = dictionaryText.trim().split("\n").map((entry) => entry.trim()).filter(Boolean);
  assert.equal(dictionary.length, 120, "le dictionnaire doit contenir 120 entrées");
  const reserved = new Set(["123456", "azerty", "motdepasse", "qwerty", "password", "abc123", "admin", "iloveyou"]);
  const formats = new Set(dictionary.map((entry) => entry.split("-").length));
  assert.deepEqual([...formats], [3], "toutes les entrées du dictionnaire doivent suivre le même style à trois segments");
  for (const entry of dictionary) assert.equal(reserved.has(entry), false, `${entry} ne doit pas faire partie des mots interdits`);

  const cracked = new Map();
  const byDigest = new Map(dictionary.map((word) => [sha256Hex(word), word]));
  for (const row of hashes) if (byDigest.has(row.digest)) cracked.set(row.id, byDigest.get(row.digest));

  const digestCounts = new Map();
  for (const row of hashes) digestCounts.set(row.digest, (digestCounts.get(row.digest) ?? 0) + 1);
  const sharedAccounts = hashes.filter((row) => (digestCounts.get(row.digest) ?? 0) > 1).length;
  const strongHuman = hashes.find((row) => !cracked.has(row.id) && /^[a-z]+\.[a-z]+$/.test(row.id)).id;
  const adminsWithoutMfa = inventory.filter((row) => row.privilege === "administrateur" && row.mfa === "non").length;
  const oldest = inventory.reduce((min, row) => (row.changed < min ? row.changed : min), inventory[0].changed);
  const mfaPercent = Math.round((inventory.filter((row) => row.mfa === "oui").length / inventory.length) * 100);

  const entropyPrompt = lab.tasks[8].prompt;
  const entropyMatch = /de (\d+) mots tirés dans une liste de (\d+) mots/i.exec(entropyPrompt);
  const entropy = entropyBits(Number(entropyMatch[1]), Number(entropyMatch[2]));

  const brutePrompt = lab.tasks[9].prompt;
  const bruteMatch = /À (un million|\d+(?: \d+)*) d’essais par seconde.*?de (\d+) caractères pris parmi (\d+) caractères/i.exec(brutePrompt);
  const speed = bruteMatch[1] === "un million" ? 1000000 : Number(bruteMatch[1].replace(/\s+/g, ""));
  const length = Number(bruteMatch[2]);
  const charset = Number(bruteMatch[3]);
  const bruteHours = bruteForceHours(charset, length, speed);

  const disableFirst = inventory.find((row) => row.privilege === "administrateur" && row.mfa === "non" && cracked.has(row.id)).id;
  assert.equal(disableFirst, "jm.tchoumi");
  const oldestNoMfa = inventory.filter((row) => row.mfa === "non").sort((left, right) => left.changed.localeCompare(right.changed))[0];

  return [
    cracked.get("jm.tchoumi"),
    cracked.get("yao.kouassi"),
    cracked.get("salle-03"),
    String(sharedAccounts),
    strongHuman,
    String(adminsWithoutMfa),
    String(daysBetween(oldest, "2026-03-09")),
    String(mfaPercent),
    String(entropy),
    String(bruteHours),
    oldestNoMfa.last.split("T")[1].replace("Z", ""),
    "b",
  ];
}

function deriveIntegrity() {
  const current = scenario();
  const manifest = current.text("fond-tp4-manifeste-sha256.log");
  const messages = current.text("fond-tp4-messages-a-decoder.log");
  const certs = current.text("fond-tp4-certificats.log");
  const published = new Map(parsePipeTable(manifest, 2).filter(([name]) => name !== "fichier"));
  const candidates = ["fond-tp4-outil-a.txt", "fond-tp4-outil-b.txt", "fond-tp4-outil-c.txt"];
  const mismatches = candidates.filter((name) => sha256Hex(current.files.get(name)) !== published.get(name));
  assert.deepEqual(mismatches, ["fond-tp4-outil-b.txt"]);
  const altered = mismatches[0];
  const alteredHash = sha256Hex(current.files.get(altered));
  const base64Text = Buffer.from(/message_base64 = ([A-Za-z0-9+/=]+)/.exec(messages)[1], "base64").toString("utf8");
  const hexText = Buffer.from(/message_hex = ([0-9a-f]+)/i.exec(messages)[1], "hex").toString("utf8");
  const caesarMatch = /message_cesar_decalage_(\d+) = ([a-z ]+)/i.exec(messages);
  const shift = Number(caesarMatch[1]);
  const caesarPlain = caesarMatch[2].toLowerCase().replace(/[a-z]/g, (char) => String.fromCharCode(((char.charCodeAt(0) - 97 - shift + 26) % 26) + 97));
  const shortHash = /empreinte_32 = ([0-9a-f]{32})/i.exec(messages)[1];
  const longHash = /empreinte_64 = ([0-9a-f]{64})/i.exec(messages)[1];
  assert.equal(shortHash.length, 32);
  assert.equal(longHash.length, 64);
  const blocks = certs.split(/\n\s*\n/);
  const first = blocks[0];
  const second = blocks[1];
  const firstEnd = /Not After : ([A-Z][a-z]{2}) (\d{2}) 23:59:59 (\d{4}) GMT/.exec(first);
  const firstEndIso = `${firstEnd[3]}-${monthNumber[firstEnd[1]]}-${firstEnd[2]}`;
  const sanNames = /Subject Alternative Name:\n\s+([^\n]+)/.exec(first)[1].split(",").map((entry) => entry.trim().replace(/^DNS:/, ""));
  const keyBits = Number(/Public-Key: \((\d+) bit\)/.exec(first)[1]);
  const secondEnd = /Not After : ([A-Z][a-z]{2}) (\d{2}) 23:59:59 (\d{4}) GMT/.exec(second);
  const secondEndIso = `${secondEnd[3]}-${monthNumber[secondEnd[1]]}-${secondEnd[2]}`;
  const secondValid = Date.parse(`${secondEndIso}T23:59:59Z`) >= Date.parse("2026-03-16T00:00:00Z");
  return [
    "b",
    alteredHash.slice(0, 12),
    String(current.files.get(altered).length),
    base64Text,
    hexText,
    caesarPlain,
    "a",
    sha256Hex("certificat") === longHash ? "oui" : "non",
    firstEndIso,
    String(daysBetween("2026-03-16", firstEndIso)),
    sanNames.includes("soleil.example") ? "oui" : "non",
    String(keyBits),
    secondValid ? "oui" : "non",
  ];
}

test("les trois laboratoires A restent déterministes et cohérents avec leurs fichiers", () => {
  const first = buildSecuriteAssetsA();
  const second = buildSecuriteAssetsA();
  assert.deepEqual(first.facts, second.facts);
  assert.equal(first.files.length, second.files.length);
  first.files.forEach((file, index) => {
    assert.equal(file.name, second.files[index].name);
    assert.equal(Buffer.compare(file.data, second.files[index].data), 0, `${file.name} doit être identique sur deux générations`);
    assert.ok(!file.data.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), `${file.name} ne doit pas commencer par un BOM`);
    assert.ok(!file.data.includes(Buffer.from("\r\n")), `${file.name} doit utiliser LF uniquement`);
    assert.ok(file.data.length < 150 * 1024, `${file.name} doit rester sous 150 Ko`);
  });
});

test("les laboratoires déclarent exactement les fichiers générés et passent les règles de qualité", () => {
  const { labs, generated } = scenario();
  assert.deepEqual(labs.map((lab) => lab.slug), ["tp-analyse-phishing", "tp-audit-mots-de-passe", "tp-integrite-chiffrement"]);
  for (const lab of labs) assert.deepEqual(labIssues(lab), [], `${lab.slug} doit avoir zéro problème de qualité`);
  const assetNames = new Set(labs.flatMap((lab) => lab.assets.map((asset) => assetName(asset.url))));
  const fileNames = new Set(generated.files.map((file) => file.name));
  assert.deepEqual([...assetNames].sort(), [...fileNames].sort(), "chaque fichier généré doit être déclaré une fois au moins, et inversement");
  for (const lab of labs) for (const task of lab.tasks) {
    assert.ok(task.accepted.length >= 1 && task.accepted.length <= 8, `${lab.slug} : nombre de réponses accepté invalide`);
    for (const answer of task.accepted) assert.equal(answer, normalize(answer), `${lab.slug} : réponse non normalisée`);
  }
});

test("les réponses du TP 1 se recalculent depuis les fichiers", () => {
  const { labs, text } = scenario();
  const lab = labs[0];
  const derived = derivePhishing(text, lab.tasks[8].prompt);
  assert.equal(derived.length, lab.tasks.length);
  derived.forEach((answer, index) => {
    assert.ok(lab.tasks[index].accepted.includes(normalize(answer)), `TP1 tâche ${index + 1}`);
  });
});

test("les réponses du TP 2 se recalculent depuis les fichiers et le dictionnaire reste plausible", () => {
  const current = scenario();
  const lab = current.labs[1];
  const derived = derivePasswords(lab, current);
  assert.equal(derived.length, lab.tasks.length);
  derived.forEach((answer, index) => {
    assert.ok(lab.tasks[index].accepted.includes(normalize(answer)), `TP2 tâche ${index + 1}`);
  });
});

test("les réponses du TP 4 se recalculent depuis les fichiers", () => {
  const { labs } = scenario();
  const lab = labs[2];
  const derived = deriveIntegrity();
  assert.equal(derived.length, lab.tasks.length);
  derived.forEach((answer, index) => {
    assert.ok(lab.tasks[index].accepted.includes(normalize(answer)), `TP4 tâche ${index + 1}`);
  });
});
