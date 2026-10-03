// Lab documents are published as PDF (guides, cheat sheets, briefs, grids and templates). The Markdown source stays next to
// each PDF as the text version, and the database points to the PDF through supabase/seed/07_lab_documents_pdf.sql.
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createSupabaseDatabase } = require("../scripts/pglite-supabase.cjs");
const { status, DOCUMENTS } = require("../scripts/build-lab-pdfs.cjs");
const { parseBlocks } = require("../scripts/pdf/markdown.cjs");
const { buildSeed } = require("../scripts/generate-documents-seed.cjs");
const { root } = require("../scripts/ts-loader.cjs");

const LABS = path.join(root, "public", "labs");
const SEED_FILE = path.join(root, "supabase", "seed", "07_lab_documents_pdf.sql");
const read = (name) => fs.readFileSync(path.join(LABS, name));

function pdfTitle(buffer) {
  const hex = buffer.toString("latin1").match(/\/Title <([0-9A-F]+)>/)?.[1];
  assert.ok(hex, "the PDF carries a title");
  const bytes = Buffer.from(hex, "hex");
  assert.equal(bytes.readUInt16BE(0), 0xfeff, "title in UTF-16BE");
  return Buffer.from(bytes.subarray(2)).swap16().toString("utf16le");
}

let dbPromise;
const database = () => (dbPromise ??= createSupabaseDatabase({ seed: true }));
after(async () => { if (dbPromise) await (await dbPromise).close(); });

test("the list of documents is consistent: unique files, known kinds and courses, only real equipment", () => {
  const { equipment } = require("../scripts/ts-loader.cjs").load("data/equipment");
  const ids = new Set(equipment.map((device) => device.id));
  assert.ok(DOCUMENTS.length >= 22);
  assert.equal(new Set(DOCUMENTS.map((doc) => doc.file)).size, DOCUMENTS.length);
  for (const doc of DOCUMENTS) {
    assert.ok(["guide", "template", "brief", "grid"].includes(doc.kind), `${doc.file}: kind`);
    assert.ok(["reseaux", "fondamentaux", "linux", "logs"].includes(doc.course), `${doc.file}: course`);
    assert.ok(doc.docLabel.length >= 6 && doc.lab.length >= 6, `${doc.file}: labels`);
    for (const id of doc.equipment ?? []) assert.ok(ids.has(id), `${doc.file}: ${id} is a device of the catalogue`);
    if (doc.kind === "template" || doc.kind === "grid") assert.equal(doc.equipment, undefined, `${doc.file}: a form to fill has no photo strip`);
  }
});

test("every document has its PDF, a valid file whose title is the one of its Markdown source", () => {
  for (const doc of DOCUMENTS) {
    const markdown = read(`${doc.file}.md`).toString("utf8");
    const title = parseBlocks(markdown).find((block) => block.type === "heading" && block.level === 1)?.text;
    assert.ok(title, `${doc.file}.md has a title`);
    const pdf = read(`${doc.file}.pdf`);
    const text = pdf.toString("latin1");
    assert.ok(text.startsWith("%PDF-"), `${doc.file}.pdf: header`);
    assert.ok(text.trimEnd().endsWith("%%EOF"), `${doc.file}.pdf: complete`);
    assert.ok(pdf.length > 150 * 1024 && pdf.length < 3 * 1024 * 1024, `${doc.file}.pdf weighs ${(pdf.length / 1024).toFixed(0)} Ko`);
    const pages = Number(text.match(/\/Type \/Pages[\s\S]{0,80}?\/Count (\d+)/)?.[1]);
    assert.ok(pages >= 1 && pages <= 8, `${doc.file}.pdf: ${pages} pages`);
    assert.match(text, /\/Type \/StructTreeRoot/, `${doc.file}.pdf is tagged for screen readers`);
    assert.equal(pdfTitle(pdf), `${title} · CyberPingo`, `${doc.file}.pdf: title`);
    assert.ok((text.match(/\/ToUnicode/g) ?? []).length > 0, `${doc.file}.pdf: the text can be selected and copied`);
    assert.match(text, /Space ?Grotesk/, `${doc.file}.pdf uses the Space Grotesk titles`);
    assert.match(text, /Inter/, `${doc.file}.pdf uses the Inter text font`);
  }
});

test("no PDF is stale: the source, the layout, the logo, the fonts or the photos did not change since it was made", () => {
  const problems = status().filter((entry) => entry.state !== "ok").map((entry) => `${entry.file}.pdf (${entry.state})`);
  assert.deepEqual(problems, [], "run: node scripts/build-lab-pdfs.cjs");
});

test("the seed that points the labs to the PDFs is the generated one", () => {
  assert.equal(fs.readFileSync(SEED_FILE, "utf8"), buildSeed(), "run: node scripts/generate-documents-seed.cjs");
});

test("after the seeds, every guide and template of a lab is a PDF that exists, and nothing else changed", async () => {
  const db = await database();
  const documents = (await db.query("select a.url, a.kind, a.title, l.slug from public.lab_assets a join public.labs l on l.id = a.lab_id where a.kind in ('guide', 'report_template') order by l.slug, a.position")).rows;
  const dataFiles = documents.filter((row) => !row.url.endsWith(".pdf"));
  assert.deepEqual([...new Set(dataFiles.map((row) => path.basename(row.url)))].sort(), [
    "fond-tp2-dictionnaire-fictif.txt", "fond-tp4-outil-a.txt", "fond-tp4-outil-b.txt", "fond-tp4-outil-c.txt",
  ], "only the raw data files that learners hash or search stay as they are");
  const pdfs = documents.filter((row) => row.url.endsWith(".pdf"));
  assert.ok(pdfs.length >= 25, `${pdfs.length} document links`);
  for (const row of pdfs) {
    assert.ok(fs.existsSync(path.join(LABS, path.basename(row.url))), `${row.url} exists`);
    assert.ok(DOCUMENTS.some((doc) => `/labs/${doc.file}.pdf` === row.url), `${row.url} is built by scripts/build-lab-pdfs.cjs`);
  }
  assert.deepEqual([...new Set(pdfs.map((row) => path.basename(row.url, ".pdf")))].sort(), DOCUMENTS.map((doc) => doc.file).sort(), "every PDF is offered by a lab");
  const [{ n }] = (await db.query("select count(*)::int as n from public.lab_assets")).rows;
  assert.equal(n, 73, "no asset was added or removed");
});

test("loading the seed again changes nothing, and an address edited in the console is never overwritten", async () => {
  const db = await database();
  const snapshot = async () => JSON.stringify((await db.query("select id, kind, title, description, url, position from public.lab_assets order by id")).rows);
  const before = await snapshot();
  await db.exec(fs.readFileSync(SEED_FILE, "utf8"));
  assert.equal(await snapshot(), before, "idempotent");

  const [row] = (await db.query("select id from public.lab_assets where url = '/labs/tp1-guide.pdf' limit 1")).rows;
  await db.query("update public.lab_assets set url = 'https://example.org/mon-guide.pdf' where id = $1", [row.id]);
  await db.exec(fs.readFileSync(SEED_FILE, "utf8"));
  const [edited] = (await db.query("select url from public.lab_assets where id = $1", [row.id])).rows;
  assert.equal(edited.url, "https://example.org/mon-guide.pdf");

  const fresh = await createSupabaseDatabase({ seed: false });
  try {
    for (const file of fs.readdirSync(path.join(root, "supabase", "seed")).filter((name) => name.endsWith(".sql")).sort()) {
      if (file < "07_lab_documents_pdf.sql") await fresh.exec(fs.readFileSync(path.join(root, "supabase", "seed", file), "utf8"));
    }
    const mdBefore = (await fresh.query("select count(*)::int as n from public.lab_assets where url like '%.md' and kind in ('guide', 'report_template')")).rows[0].n;
    assert.ok(mdBefore >= 22, `${mdBefore} Markdown links before the migration`);
    await fresh.exec(fs.readFileSync(SEED_FILE, "utf8"));
    const mdAfter = (await fresh.query("select count(*)::int as n from public.lab_assets where url like '%.md' and kind in ('guide', 'report_template')")).rows[0].n;
    assert.equal(mdAfter, 0, "every guide and template moved to its PDF");
  } finally {
    await fresh.close();
  }
});
