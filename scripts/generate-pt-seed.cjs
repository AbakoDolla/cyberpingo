#!/usr/bin/env node
// Builds supabase/seed/11_pentest_programme.sql: the complete "Introduction au Pentest" programme (ten modules, seven new labs,
// eight skills, seven badges). It also reorganises the pentest content published earlier, without deleting anything: upgraded
// starter lessons under a content guard, completed starter quizzes, renamed and repositioned modules.
// Authoring content lives in supabase/seed/content/pt-programme*.ts and pt-lab-*.ts; the expected answers are derived
// from the lab files produced by scripts/generate-lab-assets.cjs, so they can never drift.
// The guides and templates of the labs are published as PDF (scripts/pdf/documents.cjs): the seed points to the PDF directly.
// Run `node scripts/generate-pt-seed.cjs` after editing any of them.
const fs = require("node:fs");
const path = require("node:path");
const { load, root } = require("./ts-loader.cjs");
const { buildLabAssets } = require("./generate-lab-assets.cjs");
const { buildPathSql } = require("./seed-path-builder.cjs");
const { publishDocumentsAsPdf } = require("./generate-linux-seed.cjs");

const OUTPUT = path.join(root, "supabase", "seed", "11_pentest_programme.sql");

function build() {
  const { buildPtProgramme } = load("supabase/seed/content/pt-programme");
  const programme = buildPtProgramme(buildLabAssets().facts.pt);
  return buildPathSql({
    label: "Introduction au Pentest (programme complet)",
    generator: "scripts/generate-pt-seed.cjs",
    contentFile: "supabase/seed/content/pt-programme.ts",
    path_: { ...programme, labs: publishDocumentsAsPdf(programme.labs) },
    defaults: { category: "securite", domain: "pentest", course: "c5", labPositionStart: 900, skillPositionStart: 800 },
  });
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, build());
  console.log(`Programme Introduction au Pentest écrit dans ${path.relative(root, OUTPUT)}`);
}

module.exports = { build, OUTPUT };
