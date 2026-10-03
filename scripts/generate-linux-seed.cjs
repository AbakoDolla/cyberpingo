#!/usr/bin/env node
// Builds supabase/seed/08_linux_programme.sql: the complete "Administration Linux" programme (nine modules, eight new labs,
// eight skills, seven badges). It also reorganises the Linux content published earlier, without deleting anything: upgraded
// starter lessons under a content guard, a completed starter quiz, renamed and repositioned modules, references added to two lessons.
// Authoring content lives in supabase/seed/content/linux-programme*.ts and linux-labs-*.ts; the expected answers are derived
// from the lab files produced by scripts/generate-lab-assets.cjs, so they can never drift.
// The guides and templates of the labs are published as PDF (scripts/pdf/documents.cjs): the seed points to the PDF directly.
// Run `node scripts/generate-linux-seed.cjs` after editing any of them.
const fs = require("node:fs");
const path = require("node:path");
const { load, root } = require("./ts-loader.cjs");
const { buildLabAssets } = require("./generate-lab-assets.cjs");
const { buildPathSql } = require("./seed-path-builder.cjs");
const DOCUMENTS = require("./pdf/documents.cjs");

const OUTPUT = path.join(root, "supabase", "seed", "08_linux_programme.sql");
const DOCUMENT_KINDS = new Set(["guide", "report_template"]);

/** The Markdown source of a guide or template is what the authors write; what the learner downloads is the PDF made from it. */
function publishDocumentsAsPdf(labs) {
  const pdf = new Map(DOCUMENTS.filter((doc) => doc.direct).map((doc) => [`/labs/${doc.file}.md`, `/labs/${doc.file}.pdf`]));
  const unmapped = [];
  const published = labs.map((lab) => ({
    ...lab,
    assets: lab.assets.map((asset) => {
      if (!DOCUMENT_KINDS.has(asset.kind) || !asset.url.endsWith(".md")) return asset;
      if (!pdf.has(asset.url)) unmapped.push(asset.url);
      return { ...asset, url: pdf.get(asset.url) ?? asset.url };
    }),
  }));
  if (unmapped.length) throw new Error(`Guides sans PDF (ajoute-les à scripts/pdf/documents.cjs avec direct: true) : ${unmapped.join(", ")}`);
  return published;
}

function build() {
  const { buildLinuxProgramme } = load("supabase/seed/content/linux-programme");
  const programme = buildLinuxProgramme(buildLabAssets().facts.linux);
  return buildPathSql({
    label: "Linux (programme complet)",
    generator: "scripts/generate-linux-seed.cjs",
    contentFile: "supabase/seed/content/linux-programme.ts",
    path_: { ...programme, labs: publishDocumentsAsPdf(programme.labs) },
    defaults: { category: "linux", domain: "linux", course: "c3", labPositionStart: 600, skillPositionStart: 500 },
  });
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, build());
  console.log(`Programme Linux écrit dans ${path.relative(root, OUTPUT)}`);
}

module.exports = { build, OUTPUT, publishDocumentsAsPdf };
