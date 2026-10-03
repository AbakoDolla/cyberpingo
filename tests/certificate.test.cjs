// The certificate PDF (supabase/functions/generate-certificate): the CyberPingo layout is drawn by render.ts, which runs in
// the Edge Function (Deno) and here in Node with the same libraries. These tests check what a learner downloads: a valid
// one-page A4 landscape PDF with the brand fonts and images, a name that never breaks the layout, and a render that still
// succeeds when the brand fonts cannot be loaded.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const fontkit = require("@pdf-lib/fontkit");
const { PDFDict, PDFDocument, PDFName } = require("pdf-lib");
const { load, root } = require("../scripts/ts-loader.cjs");

const FUNCTION_DIR = path.join(root, "supabase", "functions", "generate-certificate");
const { renderCertificatePdf, PAGE } = load("supabase/functions/generate-certificate/render");
const brand = load("supabase/functions/generate-certificate/brand");

const CERTIFICATE = {
  certificate_number: "CP-2026-000142",
  verification_code: "K7P2M9XQ4TRW8B3N",
  recipient_name: "Amina Koné-Diallo",
  course_title: "Fondamentaux de la cybersécurité",
  issued_at: "2026-10-03T16:20:00Z",
};
const VERIFY_URL = "https://cyberpingo.vercel.app/certificat/K7P2M9XQ4TRW8B3N";

// pdf-lib packs most dictionaries in compressed object streams, so the file is read back through its object tree.
const open = (bytes) => PDFDocument.load(bytes, { updateMetadata: false });
function dictionaries(doc) {
  const text = [];
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    const dict = object instanceof PDFDict ? object : object.dict;
    if (dict) text.push(dict.toString());
  }
  return text.join("\n");
}

test("the certificate is a one-page A4 landscape PDF with its metadata and a light weight", async () => {
  const bytes = await renderCertificatePdf(CERTIFICATE, VERIFY_URL);
  assert.equal(Buffer.from(bytes.subarray(0, 5)).toString("latin1"), "%PDF-");
  assert.ok(bytes.length > 60 * 1024 && bytes.length < 400 * 1024, `${(bytes.length / 1024).toFixed(0)} Ko`);
  const doc = await open(bytes);
  assert.equal(doc.getPageCount(), 1);
  assert.deepEqual([doc.getPage(0).getWidth(), doc.getPage(0).getHeight()], [PAGE.width, PAGE.height]);
  assert.deepEqual([PAGE.width, PAGE.height], [842, 595], "A4 landscape, in points");
  assert.equal(doc.getTitle(), "Certificat CyberPingo · Fondamentaux de la cybersécurité");
  assert.equal(doc.getAuthor(), "CyberPingo");
  assert.equal(doc.getSubject(), "Certificat CP-2026-000142");
  assert.equal(doc.getProducer(), "CyberPingo");
  assert.equal(doc.getCreationDate().toISOString(), "2026-10-03T16:20:00.000Z", "the date of the document is the issue date, not the date of the download");
  assert.equal(doc.catalog.get(PDFName.of("Lang")).decodeText(), "fr-FR");
});

test("the brand fonts and both brand images are embedded, with their text selectable", async () => {
  const doc = await open(await renderCertificatePdf(CERTIFICATE, VERIFY_URL));
  const text = dictionaries(doc);
  assert.equal((text.match(/\/FontFile2/g) ?? []).length, 5, "five TrueType subsets (two Space Grotesk, two Inter, one JetBrains Mono)");
  assert.equal((text.match(/\/ToUnicode/g) ?? []).length, 5, "text can be copied and read aloud");
  for (const family of ["SpaceGrotesk-Bold", "SpaceGrotesk-Medium", "Inter-Regular", "Inter-SemiBold", "JetBrainsMono-Medium"]) assert.match(text, new RegExp(`/BaseFont /${family}`), `${family} is embedded`);
  assert.equal((text.match(/\/Subtype \/Image/g) ?? []).length, 4, "the wordmark and the mascot seal, each with its transparency mask");
  assert.ok(!/Helvetica|Courier|Times/.test(text), "no standard font stands in for the brand fonts");
});

test("the brand assets are generated: PNG logos, and fonts as plain TrueType (no compression to undo in the Function)", () => {
  const png = (value) => Buffer.from(value, "base64");
  for (const key of ["WORDMARK_PNG", "EMBLEM_PNG"]) {
    const bytes = png(brand[key]);
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${key} is a PNG`);
    assert.ok(bytes.length > 5 * 1024 && bytes.length < 80 * 1024, `${key}: ${bytes.length} bytes`);
  }
  for (const key of ["FONT_GROTESK_BOLD", "FONT_GROTESK_MEDIUM", "FONT_INTER_REGULAR", "FONT_INTER_SEMI_BOLD", "FONT_MONO_MEDIUM"]) {
    const bytes = png(brand[key]);
    assert.equal(bytes.readUInt32BE(0), 0x00010000, `${key}: TrueType outlines (not WOFF, not CFF)`);
    const tables = new Set(Array.from({ length: bytes.readUInt16BE(4) }, (_, i) => bytes.toString("latin1", 12 + i * 16, 16 + i * 16)));
    for (const table of ["cmap", "glyf", "head", "hmtx", "loca"]) assert.ok(tables.has(table), `${key}: ${table}`);
    const font = fontkit.create(bytes);
    for (const char of "éèàçôœÉ’«»·°") assert.ok(font.hasGlyphForCodePoint(char.codePointAt(0)), `${key} draws ${char}`);
    assert.ok(font.hasGlyphForCodePoint(0x2019) && font.hasGlyphForCodePoint(0x00b7), `${key}: apostrophe and middle dot`);
  }
});

test("a name or a title that is long, accented or outside the fonts never breaks the layout", async () => {
  const cases = [
    { recipient_name: "李小龍 Léa 🐧 Œuvre", course_title: "Réseaux informatiques" },
    { recipient_name: "Jean-Baptiste Alexandre Tchoumi-Nkemelu Ndongo de la Fontaine", course_title: "Sécurité Web : comprendre les attaques courantes, protéger ses applications et auditer un site en quatre-vingts étapes pratiques" },
    { recipient_name: "李小龍", course_title: "🐧🐧🐧" },
    { recipient_name: "  ", course_title: "" },
    { recipient_name: "A", course_title: "Administration Linux" },
    { recipient_name: "Ñandú O’Brien-Ünal Çelik", course_title: "Analyse de logs" },
  ];
  for (const override of cases) {
    const bytes = await renderCertificatePdf({ ...CERTIFICATE, ...override }, VERIFY_URL);
    const doc = await open(bytes);
    assert.equal(doc.getPageCount(), 1, JSON.stringify(override));
    assert.ok(bytes.length < 400 * 1024);
  }
  const doc = await open(await renderCertificatePdf({ ...CERTIFICATE, recipient_name: "李小龍 Léa 🐧 Œuvre" }, VERIFY_URL));
  assert.equal(doc.getTitle(), "Certificat CyberPingo · Fondamentaux de la cybersécurité", "the document title is not touched by the name");
});

test("the certificate is still produced when the brand fonts cannot be embedded", async () => {
  const original = fontkit.create;
  const errors = [];
  const logged = console.error;
  fontkit.create = () => { throw new Error("police illisible"); };
  console.error = (...args) => errors.push(args.join(" "));
  let bytes;
  try {
    bytes = await renderCertificatePdf(CERTIFICATE, VERIFY_URL);
  } finally {
    fontkit.create = original;
    console.error = logged;
  }
  const doc = await open(bytes);
  assert.equal(doc.getPageCount(), 1);
  assert.match(dictionaries(doc), /\/BaseFont \/Helvetica/, "the standard fonts took over");
  assert.ok(errors.some((line) => line.includes("Polices de marque indisponibles")), "the fallback is logged");
});

test("the Function renders through render.ts and stores the PDF under a versioned name that the database accepts", () => {
  const source = fs.readFileSync(path.join(FUNCTION_DIR, "index.ts"), "utf8");
  assert.match(source, /import \{ renderCertificatePdf \} from "\.\/render\.ts"/);
  assert.match(source, /const DESIGN_SUFFIX = "\.v2\.pdf"/);
  assert.match(source, /endsWith\(DESIGN_SUFFIX\)/, "a certificate stored with the first design is rendered again");
  assert.match(source, /\.remove\(\[certificate\.pdf_path\]\)/, "and the first file is removed");
  assert.ok(!/from "npm:pdf-lib/.test(source), "the drawing code lives in render.ts only");

  const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260928190200_gamification.sql"), "utf8");
  const rule = migration.match(/pdf_path ~ '([^']+)'/)?.[1];
  assert.ok(rule, "the pdf_path rule is in the migration");
  const accepted = new RegExp(rule);
  const userId = "0b5d2c1e-8a4f-4c3b-9e2d-1a2b3c4d5e6f";
  assert.ok(accepted.test(`${userId}/CP-2026-000142.v2.pdf`), "the new path is accepted");
  assert.ok(accepted.test(`${userId}/CP-2026-000142.pdf`), "the old path stays valid for the certificates already issued");
});

test("render.ts has no file or network access: everything it draws comes from brand.ts", () => {
  const source = fs.readFileSync(path.join(FUNCTION_DIR, "render.ts"), "utf8");
  assert.ok(!/Deno\.(readFile|readTextFile|open)|fetch\(|readFileSync/.test(source));
  assert.match(source, /from "\.\/brand\.ts"/);
  assert.match(source, /getCharacterSet/, "characters the font cannot draw are dropped");
});
