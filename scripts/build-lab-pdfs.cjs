"use strict";
// Génère les PDF des documents de laboratoire (public/labs/*.pdf) à partir des fichiers Markdown.
//
//   node scripts/build-lab-pdfs.cjs            régénère les PDF dont la source ou la mise en page a changé
//   node scripts/build-lab-pdfs.cjs --force    régénère tout
//   node scripts/build-lab-pdfs.cjs --only tp1-guide,fond-tp1-guide
//   node scripts/build-lab-pdfs.cjs --check    n’imprime rien : échoue si un PDF manque ou est périmé
//
// Il faut Chrome ou Edge (variable CHROME_PATH pour un chemin particulier).
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const sharp = require("sharp");

const { parseBlocks } = require("./pdf/markdown.cjs");
const { renderDocument } = require("./pdf/design.cjs");
const { brandAssets, fontFaces, dataUri, ROOT } = require("./pdf/assets.cjs");
const DOCUMENTS = require("./pdf/documents.cjs");

const LABS = path.join(ROOT, "public", "labs");
const MANIFEST = path.join(__dirname, "pdf", "manifest.json");
// The list of documents (documents.cjs) is not an input of the whole engine: what a document needs from it is hashed with that document.
const ENGINE_FILES = ["markdown.cjs", "design.cjs", "icons.cjs", "highlight.cjs", "assets.cjs"].map((name) => path.join(__dirname, "pdf", name));
const SHARED_INPUTS = [
  ...ENGINE_FILES,
  path.join(ROOT, "public", "images", "cyberpingo-transparent.png"),
  path.join(ROOT, "public", "images", "hero-mascot.png"),
  path.join(ROOT, "public", "fonts", "space-grotesk-latin.woff2"),
  path.join(ROOT, "public", "fonts", "inter-latin.woff2"),
  path.join(ROOT, "public", "fonts", "jetbrains-mono-latin.woff2"),
];

const sha = (...parts) => crypto.createHash("sha256").update(parts.map((part) => (Buffer.isBuffer(part) ? part : String(part)))
  .reduce((all, part) => Buffer.concat([all, Buffer.isBuffer(part) ? part : Buffer.from(part), Buffer.from("\u0000")]), Buffer.alloc(0))).digest("hex").slice(0, 16);

/** Text files are hashed with LF line endings, so that a checkout with CRLF (Windows) gives the same fingerprint. */
function readIfExists(file) {
  if (!fs.existsSync(file)) return Buffer.alloc(0);
  const bytes = fs.readFileSync(file);
  return /\.(cjs|js|json|md)$/i.test(file) ? Buffer.from(bytes.toString("utf8").replace(/\r\n/g, "\n")) : bytes;
}

function loadCatalogue() {
  const read = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", name), "utf8"));
  const devices = fs.existsSync(path.join(ROOT, "data", "equipment.json")) ? read("equipment.json").devices : [];
  const credits = fs.existsSync(path.join(ROOT, "data", "equipment-credits.json")) ? read("equipment-credits.json") : {};
  return { items: new Map(devices.map((item) => [item.id, item])), credits };
}

function equipmentFile(item) {
  return path.join(ROOT, "public", item.photo.replace(/^\//, ""));
}

/**
 * What the PDFs show of the equipment catalogue: name, sentence, photo and its credit. The courses and the labs of
 * data/equipment.json change no PDF, so adding a lab or a course there does not make every document stale.
 */
function catalogueFingerprint(catalogue) {
  return JSON.stringify([...catalogue.items.values()].map((item) => [
    item.id, item.name, item.pdfSummary ?? item.summary, item.photo, catalogue.credits[item.id]?.altFr ?? "", catalogue.credits[item.id]?.creditShort ?? "",
  ]));
}

function engineHash(catalogue = loadCatalogue()) {
  return sha(...SHARED_INPUTS.map(readIfExists), catalogueFingerprint(catalogue));
}

function documentHash(doc, engine, catalogue) {
  const source = fs.readFileSync(path.join(LABS, `${doc.file}.md`));
  const photos = (doc.equipment ?? []).map((id) => catalogue.items.get(id)).filter(Boolean).map((item) => readIfExists(equipmentFile(item)));
  return sha(engine, JSON.stringify(doc), source, ...photos);
}

function readManifest() {
  return fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
}

/** État de chaque document : { file, state: "ok" | "absent" | "perime" }. Utilisé par le test et par --check. */
function status() {
  const manifest = readManifest();
  const engine = engineHash();
  const catalogue = loadCatalogue();
  return DOCUMENTS.map((doc) => {
    const pdf = path.join(LABS, `${doc.file}.pdf`);
    if (!fs.existsSync(pdf)) return { file: doc.file, state: "absent" };
    return { file: doc.file, state: manifest[doc.file] === documentHash(doc, engine, catalogue) ? "ok" : "perime" };
  });
}

function shortCredit(credit) {
  return credit ? credit.creditShort : "";
}

async function gearFor(doc, catalogue) {
  const items = [];
  for (const id of doc.equipment ?? []) {
    const item = catalogue.items.get(id);
    if (!item) { console.warn(`  ! matériel inconnu : ${id}`); continue; }
    const file = equipmentFile(item);
    if (!fs.existsSync(file)) { console.warn(`  ! photo absente : ${item.photo}`); continue; }
    const jpeg = await sharp(file).resize(520, 390, { fit: "cover" }).jpeg({ quality: 74, mozjpeg: true }).toBuffer();
    items.push({ name: item.name, summary: item.pdfSummary ?? item.summary, alt: catalogue.credits[id]?.altFr ?? item.name, image: dataUri(jpeg, "image/jpeg"), credit: shortCredit(catalogue.credits[id]) });
  }
  return { title: "Matériel que tu croises dans ce laboratoire", items };
}

async function buildHtml(doc, assets, fonts, catalogue) {
  const markdown = fs.readFileSync(path.join(LABS, `${doc.file}.md`), "utf8");
  const blocks = parseBlocks(markdown);
  const first = blocks.find((block) => block.type === "heading" && block.level === 1);
  if (!first) throw new Error(`${doc.file}.md n’a pas de titre.`);
  const gear = await gearFor(doc, catalogue);
  return renderDocument({
    meta: { title: first.text, kind: doc.kind, docLabel: doc.docLabel, course: doc.course, lab: doc.lab, textUrl: `/labs/${doc.file}.md` },
    blocks, assets, fonts, gear,
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--check")) {
    const problems = status().filter((entry) => entry.state !== "ok");
    if (problems.length) {
      console.error("PDF à régénérer (node scripts/build-lab-pdfs.cjs) :");
      for (const entry of problems) console.error(`  - ${entry.file}.pdf : ${entry.state}`);
      process.exit(1);
    }
    console.log(`${DOCUMENTS.length} PDF à jour.`);
    return;
  }

  const only = args.includes("--only") ? new Set(args[args.indexOf("--only") + 1].split(",")) : null;
  const force = args.includes("--force");
  const manifest = readManifest();
  const engine = engineHash();
  const catalogue = loadCatalogue();
  const todo = DOCUMENTS.filter((doc) => (!only || only.has(doc.file))
    && (force || !fs.existsSync(path.join(LABS, `${doc.file}.pdf`)) || manifest[doc.file] !== documentHash(doc, engine, catalogue)));
  if (!todo.length) { console.log("Tous les PDF sont à jour."); return; }

  const { launchBrowser, printToPdf } = require("./pdf/chrome.cjs");
  const assets = await brandAssets();
  const fonts = fontFaces();
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "cyberpingo-pdf-html-"));
  const browser = await launchBrowser();
  try {
    for (const doc of todo) {
      const html = await buildHtml(doc, assets, fonts, catalogue);
      const htmlFile = path.join(work, `${doc.file}.html`);
      fs.writeFileSync(htmlFile, html);
      const out = path.join(LABS, `${doc.file}.pdf`);
      await printToPdf(browser, pathToFileURL(htmlFile).href, out);
      manifest[doc.file] = documentHash(doc, engine, catalogue);
      console.log(`  ${doc.file}.pdf  ${(fs.statSync(out).size / 1024).toFixed(0)} Ko`);
    }
  } finally {
    await browser.close();
    fs.rmSync(work, { recursive: true, force: true });
  }
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
}

module.exports = { status, DOCUMENTS };

if (require.main === module) {
  main().catch((error) => { console.error(error); process.exit(1); });
}
