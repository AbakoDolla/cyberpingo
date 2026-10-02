#!/usr/bin/env node
// Builds supabase/seed/02_reseaux_path.sql: the complete "Réseaux" learning path.
// Authoring content lives in supabase/seed/content/reseaux-path.ts; the expected answers are derived
// from the real lab files produced by scripts/generate-lab-assets.cjs, so they can never drift.
// Run `node scripts/generate-reseaux-seed.cjs` after editing either of them.
const fs = require("node:fs");
const path = require("node:path");
const { load, root } = require("./ts-loader.cjs");
const { buildLabAssets } = require("./generate-lab-assets.cjs");
const { buildPathSql } = require("./seed-path-builder.cjs");

const OUTPUT = path.join(root, "supabase", "seed", "02_reseaux_path.sql");

function build() {
  const { buildReseauxPath } = load("supabase/seed/content/reseaux-path");
  return buildPathSql({
    label: "Réseaux",
    generator: "scripts/generate-reseaux-seed.cjs",
    contentFile: "supabase/seed/content/reseaux-path.ts",
    path_: buildReseauxPath(buildLabAssets().facts),
    defaults: { category: "reseau", domain: "reseaux", course: "c2", labPositionStart: 100 },
  });
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, build());
  console.log(`Parcours Réseaux écrit dans ${path.relative(root, OUTPUT)}`);
}

module.exports = { build, OUTPUT };