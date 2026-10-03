#!/usr/bin/env node
// Builds supabase/seed/06_fondamentaux_programme.sql: the complete "Fondamentaux de la cybersécurité" programme (eight modules,
// seven labs, eight skills, six badges). It also reorganises the three starter lessons published earlier, without deleting
// anything: upgraded lessons under a content guard, a completed starter quiz, renamed modules.
// Authoring content lives in supabase/seed/content/fondamentaux-programme*.ts and fondamentaux-labs-*.ts; the expected answers are
// derived from the lab files produced by scripts/generate-lab-assets.cjs, so they can never drift.
// Run `node scripts/generate-fondamentaux-seed.cjs` after editing either of them.
const fs = require("node:fs");
const path = require("node:path");
const { load, root } = require("./ts-loader.cjs");
const { buildLabAssets } = require("./generate-lab-assets.cjs");
const { buildPathSql } = require("./seed-path-builder.cjs");

const OUTPUT = path.join(root, "supabase", "seed", "06_fondamentaux_programme.sql");

function build() {
  const { buildFondamentauxProgramme } = load("supabase/seed/content/fondamentaux-programme");
  return buildPathSql({
    label: "Fondamentaux (programme complet)",
    generator: "scripts/generate-fondamentaux-seed.cjs",
    contentFile: "supabase/seed/content/fondamentaux-programme.ts",
    path_: buildFondamentauxProgramme(buildLabAssets().facts.fondamentaux),
    defaults: { category: "securite", domain: "fondamentaux", course: "c1", labPositionStart: 500, skillPositionStart: 400 },
  });
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, build());
  console.log(`Programme Fondamentaux écrit dans ${path.relative(root, OUTPUT)}`);
}

module.exports = { build, OUTPUT };
