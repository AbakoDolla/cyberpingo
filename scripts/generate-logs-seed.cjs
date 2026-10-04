#!/usr/bin/env node
// Builds supabase/seed/09_logs_programme.sql: the complete "Analyse de logs" programme (ten modules, six new labs,
// eight skills, seven badges). It also reorganises the log-analysis content published earlier, without deleting anything: upgraded
// starter lessons under a content guard, completed starter quizzes, renamed and repositioned modules, references added to three lessons.
// Authoring content lives in supabase/seed/content/logs-programme*.ts and logs-labs-*.ts; the expected answers are derived
// from the lab files produced by scripts/generate-lab-assets.cjs, so they can never drift.
// The guides and templates of the labs are published as PDF (scripts/pdf/documents.cjs): the seed points to the PDF directly.
// Run `node scripts/generate-logs-seed.cjs` after editing any of them.
const fs = require("node:fs");
const path = require("node:path");
const { load, root } = require("./ts-loader.cjs");
const { buildLabAssets } = require("./generate-lab-assets.cjs");
const { buildPathSql } = require("./seed-path-builder.cjs");
const { publishDocumentsAsPdf } = require("./generate-linux-seed.cjs");

const OUTPUT = path.join(root, "supabase", "seed", "09_logs_programme.sql");

function build() {
  const { buildLogsProgramme } = load("supabase/seed/content/logs-programme");
  const programme = buildLogsProgramme(buildLabAssets().facts.logs);
  return buildPathSql({
    label: "Analyse de logs (programme complet)",
    generator: "scripts/generate-logs-seed.cjs",
    contentFile: "supabase/seed/content/logs-programme.ts",
    path_: { ...programme, labs: publishDocumentsAsPdf(programme.labs) },
    defaults: { category: "securite", domain: "detection", course: "c6", labPositionStart: 700, skillPositionStart: 600 },
  });
}

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, build());
  console.log(`Programme Analyse de logs écrit dans ${path.relative(root, OUTPUT)}`);
}

module.exports = { build, OUTPUT };
