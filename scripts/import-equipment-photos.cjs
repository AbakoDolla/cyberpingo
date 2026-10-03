"use strict";
// Importe un lot de photos du matériel : node scripts/import-equipment-photos.cjs <dossier>
//
// Le dossier contient <id>.webp (1200x900) pour chaque appareil de data/equipment.json et un credits.json
// { "<id>": { title, pageUrl, author, license, licenseUrl, changes, altFr, creditShort } } établi d'après les
// métadonnées de Wikimedia Commons. Le script vérifie tout, copie les images dans public/images/equipment/ et
// écrit data/equipment-credits.json, que le site affiche (légendes, page « Matériel », PDF).
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const catalogue = JSON.parse(fs.readFileSync(path.join(root, "data", "equipment.json"), "utf8")).devices;
const LICENSE = /^(CC0|Public domain|domaine public|CC BY(?:-SA)? [0-9.]+)$/i;

const CP1252 = new Map([
  [0x20AC, 0x80], [0x201A, 0x82], [0x0192, 0x83], [0x201E, 0x84], [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02C6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8A], [0x2039, 0x8B], [0x0152, 0x8C], [0x017D, 0x8E], [0x2018, 0x91], [0x2019, 0x92], [0x201C, 0x93],
  [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97], [0x02DC, 0x98], [0x2122, 0x99], [0x0161, 0x9A], [0x203A, 0x9B],
  [0x0153, 0x9C], [0x017E, 0x9E], [0x0178, 0x9F],
]);

/** Répare un texte dont l'UTF-8 a été relu en Windows-1252 (« recadrÃ©e » devient « recadrée », « dâ€™un » devient « d’un »). */
function fixMojibake(text) {
  if (typeof text !== "string" || !/[ÃÂâ]/.test(text)) return text;
  const bytes = [];
  for (const char of text) {
    const code = char.codePointAt(0);
    if (code < 0x100) bytes.push(code);
    else if (CP1252.has(code)) bytes.push(CP1252.get(code));
    else return text;
  }
  const repaired = Buffer.from(bytes).toString("utf8");
  return repaired.includes("\uFFFD") ? text : repaired;
}

function clean(value) {
  return typeof value === "string" ? fixMojibake(value).replace(/\s+/g, " ").trim() : value;
}

/** Typographic apostrophes in the French texts shown to learners. */
const typographic = (text) => text.replace(/(\p{L})'(\p{L})/gu, "$1’$2");
const secure = (url) => (url ?? "").replace(/^http:\/\//, "https://");

/** « Tony Webster from Minneapolis, Minnesota, United States » devient « Tony Webster ». */
const shortAuthor = (author) => author.replace(/\s+from\s+.+$/i, "").trim();

async function main() {
  const source = process.argv[2];
  if (!source) throw new Error("Usage : node scripts/import-equipment-photos.cjs <dossier>");
  const raw = JSON.parse(fs.readFileSync(path.join(source, "credits.json"), "utf8").replace(/^\uFEFF/, ""));
  const out = path.join(root, "public", "images", "equipment");
  fs.mkdirSync(out, { recursive: true });

  const credits = {};
  const problems = [];
  for (const device of catalogue) {
    const entry = raw[device.id];
    const file = path.join(source, `${device.id}.webp`);
    if (!entry) { problems.push(`${device.id} : absent de credits.json`); continue; }
    if (!fs.existsSync(file)) { problems.push(`${device.id} : ${device.id}.webp manquant`); continue; }
    const meta = await sharp(file).metadata();
    if (meta.format !== "webp" || meta.width !== 1200 || meta.height !== 900) problems.push(`${device.id} : ${meta.format} ${meta.width}x${meta.height}, 1200x900 webp attendu`);
    const license = clean(entry.license);
    if (!LICENSE.test(license)) problems.push(`${device.id} : licence refusée « ${license} »`);
    const author = clean(entry.author);
    if (!author) problems.push(`${device.id} : auteur manquant`);
    if (!/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(entry.pageUrl ?? "")) problems.push(`${device.id} : pageUrl invalide`);
    if (!clean(entry.altFr) || clean(entry.altFr).length < 12) problems.push(`${device.id} : altFr trop court`);
    const creditShort = clean(entry.creditShort) || `${shortAuthor(author)}, ${license}`;
    if (creditShort.length > 70) problems.push(`${device.id} : creditShort trop long (${creditShort.length})`);
    credits[device.id] = {
      title: clean(entry.title), pageUrl: entry.pageUrl, author, license,
      licenseUrl: secure(clean(entry.licenseUrl)), altFr: typographic(clean(entry.altFr)), creditShort,
      changes: clean(entry.changes) || "recadrée et convertie en WebP",
    };
  }
  if (problems.length) { console.error(problems.map((line) => `  - ${line}`).join("\n")); process.exit(1); }

  for (const device of catalogue) fs.copyFileSync(path.join(source, `${device.id}.webp`), path.join(out, `${device.id}.webp`));
  fs.writeFileSync(path.join(root, "data", "equipment-credits.json"), `${JSON.stringify(credits, null, 2)}\n`);
  const bytes = catalogue.reduce((sum, device) => sum + fs.statSync(path.join(out, `${device.id}.webp`)).size, 0);
  const hero = await require("./build-equipment-hero.cjs").buildHero();
  console.log(`${catalogue.length} photos importées (${(bytes / 1024).toFixed(0)} Ko), mosaïque ${(hero / 1024).toFixed(0)} Ko et crédits écrits dans data/equipment-credits.json.`);
}

module.exports = { fixMojibake };

if (require.main === module) main().catch((error) => { console.error(error.message); process.exit(1); });
