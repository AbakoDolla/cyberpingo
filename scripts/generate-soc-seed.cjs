const fs = require("node:fs");
const path = require("node:path");
const { load, root } = require("./ts-loader.cjs");
const { buildLabAssets } = require("./generate-lab-assets.cjs");
const { buildPathSql } = require("./seed-path-builder.cjs");

const OUTPUT = path.join(root, "supabase", "seed", "03_soc_path.sql");

function build() {
  const { buildSocPath } = load("supabase/seed/content/soc-path");
  return buildPathSql({
    label: "SOC",
    generator: "scripts/generate-soc-seed.cjs",
    contentFile: "supabase/seed/content/soc-path.ts",
    path_: buildSocPath(buildLabAssets().facts.soc),
    defaults: { category: "securite", domain: "detection", course: "c6", labPositionStart: 200, skillPositionStart: 100, mascotPositionStart: 1000 },
  });
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, build());
  console.log(`Parcours SOC écrit dans ${path.relative(root, OUTPUT)}`);
}

module.exports = { build, OUTPUT };