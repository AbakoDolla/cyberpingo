#!/usr/bin/env node
// Static preview of figures, to review the drawings without starting the site.
//   node scripts/figures-preview.cjs --samples            -> the samples of lib/figure-samples.ts
//   node scripts/figures-preview.cjs <seed content file>  -> every figure of the file, with its lesson title
// Output: .shots/preview.html (open it in a browser). Options: --out <file>, --width <px> (default 900), --kinds network,packet (only those kinds).
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load, root } = require("./ts-loader.cjs");

const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const out = path.resolve(root, option("--out", ".shots/preview.html"));
const width = Number(option("--width", 900));
const kinds = option("--kinds", "").split(",").filter(Boolean);
const files = args.filter((arg, i) => !arg.startsWith("--") && !["--out", "--width", "--kinds"].includes(args[i - 1]));

const spec = load("lib/figure-spec");
const FigureView = load("components/figures/Figure").default;

const { lessons, exportedContent } = require("./check-figures.cjs");

function* walk(content) {
  for (const lesson of lessons(content)) {
    lesson.blocks.forEach((block, index) => { if (block.type === "schema" && typeof block.content === "string") { /* one entry per schema block */ } });
    for (const [index, block] of lesson.blocks.entries()) if (block.type === "schema" && typeof block.content === "string") yield { owner: `${lesson.key} · bloc ${index}`, content: block.content };
  }
}

const items = [];
if (args.includes("--samples") || !files.length) {
  const { FIGURE_SAMPLES } = load("lib/figure-samples");
  for (const sample of FIGURE_SAMPLES) items.push({ label: sample.id, text: spec.serializeFigure(sample.figure) });
}
for (const file of files) {
  const relative = path.relative(root, path.resolve(root, file)).replace(/\\/g, "/").replace(/\.ts$/, "");
  for (const block of walk(exportedContent(relative))) items.push({ label: block.owner, text: block.content });
}

if (kinds.length) {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const figure = spec.parseFigure(items[i].text);
    if (!figure || !kinds.includes(figure.kind)) items.splice(i, 1);
  }
}

const css = fs.readFileSync(path.join(root, "app", "figures.css"), "utf8");
const fontBase = path.relative(path.dirname(out), path.join(root, "public", "fonts")).replace(/\\/g, "/");
const sections = items.map((item, index) => {
  const figure = spec.parseFigure(item.text);
  const body = figure
    ? renderToStaticMarkup(React.createElement(FigureView, { figure }))
    : `<pre style="color:#ffb86b;white-space:pre-wrap;border:1px dashed #ffb86b;padding:12px;border-radius:12px">${item.text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`;
  return `<section><p class="lab">${String(index + 1).padStart(3, "0")} · ${String(item.label).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>${body}</section>`;
});

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Figures</title>
<style>
@font-face{font-family:"Space Grotesk";src:url("${fontBase}/space-grotesk-latin.woff2") format("woff2");font-weight:300 700}
@font-face{font-family:"Inter";src:url("${fontBase}/inter-latin.woff2") format("woff2");font-weight:100 900}
@font-face{font-family:"JetBrains Mono";src:url("${fontBase}/jetbrains-mono-latin.woff2") format("woff2");font-weight:100 800}
:root{--font-space-grotesk:"Space Grotesk";--font-inter:"Inter";--font-jetbrains-mono:"JetBrains Mono"}
body{margin:0;background:#050816;color:#E6EAF2;font-family:Inter,sans-serif}
main{max-width:${width}px;margin:0 auto;padding:24px 16px 80px;display:grid;gap:22px}
section{min-width:0}.lab{margin:0 0 4px;color:#8ea3c0;font:600 12px "JetBrains Mono",monospace}
${css}
</style></head><body><main>${sections.join("\n")}</main></body></html>`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`${items.length} figure(s) -> ${path.relative(root, out)}`);
