#!/usr/bin/env node
// Builds supabase/seed/10_securite_web_programme.sql: the complete "Sécurité Web" programme (ten modules, seven new labs,
// eight skills, seven badges). It also reorganises the web-security content published earlier, without deleting anything: upgraded
// starter lessons under a content guard, completed starter quizzes, renamed and repositioned modules.
// Authoring content lives in supabase/seed/content/swb-programme*.ts and swb-lab-*.ts; the expected answers are derived
// from the lab files produced by scripts/generate-lab-assets.cjs, so they can never drift.
// The guides and templates of the labs are published as PDF (scripts/pdf/documents.cjs): the seed points to the PDF directly.
// Run `node scripts/generate-swb-seed.cjs` after editing any of them.
const fs = require("node:fs");
const path = require("node:path");
const { load, root } = require("./ts-loader.cjs");
const { buildLabAssets } = require("./generate-lab-assets.cjs");
const { buildPathSql } = require("./seed-path-builder.cjs");
const { publishDocumentsAsPdf } = require("./generate-linux-seed.cjs");

const OUTPUT = path.join(root, "supabase", "seed", "10_securite_web_programme.sql");

function build() {
  const { buildSwbProgramme } = load("supabase/seed/content/swb-programme");
  const programme = buildSwbProgramme(buildLabAssets().facts.swb);
  return buildPathSql({
    label: "Sécurité Web (programme complet)",
    generator: "scripts/generate-swb-seed.cjs",
    contentFile: "supabase/seed/content/swb-programme.ts",
    path_: { ...programme, labs: publishDocumentsAsPdf(programme.labs) },
    defaults: { category: "securite", domain: "securite-web", course: "c4", labPositionStart: 800, skillPositionStart: 700 },
  });
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, build());
  console.log(`Programme Sécurité Web écrit dans ${path.relative(root, OUTPUT)}`);
}

module.exports = { build, OUTPUT };
