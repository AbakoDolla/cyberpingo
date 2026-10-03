#!/usr/bin/env node
// Builds supabase/seed/05_reseaux_programme.sql: the complete "Réseaux informatiques" programme (ten modules,
// five labs, ten skills, six badges). It also reorganises the Réseaux lessons published earlier, without
// deleting anything: renamed modules, upgraded starter lessons, references for lessons that had none.
// Authoring content lives in supabase/seed/content/reseaux-programme*.ts; the expected answers are derived from
// the lab files produced by scripts/generate-lab-assets.cjs, so they can never drift.
// Run `node scripts/generate-reseaux-programme-seed.cjs` after editing either of them.
const fs = require("node:fs");
const path = require("node:path");
const { load, root } = require("./ts-loader.cjs");
const { buildLabAssets } = require("./generate-lab-assets.cjs");
const { buildPathSql } = require("./seed-path-builder.cjs");

const OUTPUT = path.join(root, "supabase", "seed", "05_reseaux_programme.sql");

function build() {
  const { buildReseauxProgramme } = load("supabase/seed/content/reseaux-programme");
  return buildPathSql({
    label: "Réseaux (programme complet)",
    generator: "scripts/generate-reseaux-programme-seed.cjs",
    contentFile: "supabase/seed/content/reseaux-programme.ts",
    path_: buildReseauxProgramme(buildLabAssets().facts.programme),
    defaults: { category: "reseau", domain: "reseaux", course: "c2", labPositionStart: 300, skillPositionStart: 200 },
  });
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, build());
  console.log(`Programme Réseaux écrit dans ${path.relative(root, OUTPUT)}`);
}

module.exports = { build, OUTPUT };
