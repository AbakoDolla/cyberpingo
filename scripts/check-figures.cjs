#!/usr/bin/env node
// Checks that every schema block of a seed content file is a valid, well-written figure (lib/figure-spec.ts), that the blocks
// kept their place (the figures seed replaces them by position) and that no fact of the old text was lost on the way.
//   node scripts/check-figures.cjs supabase/seed/content/reseaux-programme-a.ts [...]
// It walks everything the file exports, so it works for the programme parts as well as the older lesson files.
const fs = require("node:fs");
const path = require("node:path");
const { load, root } = require("./ts-loader.cjs");
const { figureIssues } = require("./content-quality.cjs");
const { contentId } = require("./generate-content-seed.cjs");

const LEGACY = JSON.parse(fs.readFileSync(path.join(root, "supabase", "seed", "content", "figures-legacy.json"), "utf8"));

/**
 * Every lesson written in the file: an object with a title and a list of blocks, identified by its key (programme parts, older paths).
 * The reference lists of the programme parts only have a key and blocks: they are skipped. The starter lessons of lessons.ts (identified
 * by an id) are skipped too: every one of them is replaced by its programme version, which carries the figures.
 */
function* lessons(value, seen = new Set()) {
  if (Array.isArray(value)) { for (const item of value) yield* lessons(item, seen); return; }
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  const key = typeof value.key === "string" ? value.key : null;
  if (key && typeof value.title === "string" && Array.isArray(value.blocks)) { yield { key, blocks: value.blocks }; return; }
  for (const child of Object.values(value)) yield* lessons(child, seen);
}

/** The older paths export a builder that needs the lab facts, like the seed generators that call them. */
function exportedContent(relative) {
  const exported = load(relative);
  const { buildLabAssets } = require("./generate-lab-assets.cjs");
  if (typeof exported.buildReseauxPath === "function") return exported.buildReseauxPath(buildLabAssets().facts);
  if (typeof exported.buildSocPath === "function") return exported.buildSocPath(buildLabAssets().facts.soc);
  return exported;
}

/** Tokens with a digit (numbers, addresses, ports, commands with options) that must survive the redrawing. */
function facts(old) {
  const stripped = old.split("\n").map((line) => line.replace(/^\s*\d+[.)]\s+/, "")).join("\n");
  const tokens = stripped.match(/[A-Za-z0-9_.\/:%≈×-]*\d[A-Za-z0-9_.\/:%≈×-]*/g) ?? [];
  return [...new Set(tokens.map((token) => token.replace(/[.,:;]+$/, "")).filter((token) => token.length > 0))];
}

const normalise = (value) => value.normalize("NFC").replace(/\s+/g, " ");

function check(file) {
  const relative = path.relative(root, path.resolve(root, file)).replace(/\\/g, "/").replace(/\.ts$/, "");
  const spec = load("lib/figure-spec");
  const exported = exportedContent(relative);
  const issues = [];
  const warnings = [];
  const kinds = {};
  let figures = 0;
  let text = 0;
  let lessonCount = 0;
  for (const lesson of lessons(exported)) {
    lessonCount += 1;
    const id = contentId("lesson", lesson.key);
    const legacy = LEGACY[id] ?? {};
    const schemaIndexes = lesson.blocks.flatMap((block, index) => (block.type === "schema" ? [index] : []));
    const expected = Object.keys(legacy).map(Number);
    if (JSON.stringify(schemaIndexes) !== JSON.stringify(expected)) {
      issues.push(`${lesson.key} : les blocs schéma doivent rester aux positions ${JSON.stringify(expected)} (trouvés ${JSON.stringify(schemaIndexes)}) : un schéma = une figure, ne déplace ni n’ajoute aucun bloc`);
    }
    for (const index of schemaIndexes) {
      const block = lesson.blocks[index];
      const where = `${lesson.key} bloc ${index}`;
      issues.push(...figureIssues(block.content, where));
      if (!block.content.trim().startsWith("{")) { text += 1; continue; }
      figures += 1;
      let figure;
      try { figure = JSON.parse(block.content); } catch { continue; }
      kinds[figure.kind] = (kinds[figure.kind] ?? 0) + 1;
      const old = legacy[index];
      if (old === undefined) continue;
      const haystack = normalise(JSON.stringify(figure) + " " + spec.figureText(figure).join(" "));
      const lost = facts(old).filter((token) => !haystack.includes(normalise(token)));
      if (lost.length) warnings.push(`${where} : à vérifier, éléments de l’ancien schéma absents de la figure : ${lost.slice(0, 12).map((t) => `« ${t} »`).join(", ")}${lost.length > 12 ? ", …" : ""}`);
    }
  }
  return { lessons: lessonCount, figures, text, kinds, issues, warnings };
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) { console.error("Usage : node scripts/check-figures.cjs <fichier.ts>..."); process.exit(2); }
  let failed = false;
  for (const file of files) {
    const { lessons: count, figures, text, kinds, issues, warnings } = check(file);
    console.log(`${file} : ${count} leçon(s), ${figures} figure(s) (${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(", ") || "aucune"}), ${text} schéma(s) en texte brut, ${issues.length} problème(s), ${warnings.length} point(s) à vérifier`);
    issues.forEach((issue) => console.log(`  - ${issue}`));
    warnings.forEach((warning) => console.log(`  ? ${warning}`));
    if (issues.length) failed = true;
  }
  process.exit(failed ? 1 : 0);
}

module.exports = { check, facts, lessons, exportedContent };
