"use strict";
// Mise en page des documents PDF CyberPingo : page de garde, titres illustrés, encadrés, tableaux,
// blocs de code, modèles à remplir et bandeau « matériel ».
const { inline, esc } = require("./markdown.cjs");
const { icon, iconFor } = require("./icons.cjs");
const { highlight, detectLanguage, LABELS } = require("./highlight.cjs");

const THEMES = {
  reseaux: { name: "Réseaux informatiques", accent: "#0ea5e9", soft: "#e0f2fe", ink: "#075985", glow: "0,168,255" },
  fondamentaux: { name: "Fondamentaux de la cybersécurité", accent: "#10b981", soft: "#d1fae5", ink: "#065f46", glow: "16,224,138" },
  linux: { name: "Administration Linux", accent: "#f59e0b", soft: "#fef3c7", ink: "#92400e", glow: "245,158,11" },
  logs: { name: "Analyse de logs et investigation", accent: "#8b5cf6", soft: "#ede9fe", ink: "#5b21b6", glow: "139,92,246" },
  web: { name: "Sécurité des applications web", accent: "#f43f5e", soft: "#ffe4e6", ink: "#9f1239", glow: "244,63,94" },
  pentest: { name: "Introduction au test d’intrusion", accent: "#84cc16", soft: "#ecfccb", ink: "#3f6212", glow: "132,204,22" },
};

const SITE = "https://cyberpingo.vercel.app";

function css(theme, fonts, title) {
  const running = title.replace(/"/g, "'");
  return `
${fonts}
:root {
  --accent: ${theme.accent}; --soft: ${theme.soft}; --accent-ink: ${theme.ink}; --glow: ${theme.glow};
  --ink: #0f172a; --ink-2: #334155; --muted: #64748b; --line: #dbe3ee; --paper: #ffffff; --wash: #f6f8fc;
  --night: #060b24; --navy: #0b1740; --blue: #00a8ff; --violet: #8b5cf6; --green: #10e08a;
}
@page {
  size: A4;
  margin: 19mm 0 19mm 0;
  @top-left { content: "${running}"; font: 600 7.2pt "Space Grotesk", sans-serif; color: #94a3b8; letter-spacing: .04em; vertical-align: bottom; padding: 0 0 3.2mm 15mm; }
  @top-right { content: "CYBERPINGO"; font: 700 7.2pt "Space Grotesk", sans-serif; color: var(--accent); letter-spacing: .18em; vertical-align: bottom; padding: 0 15mm 3.2mm 0; }
  @bottom-left { content: "cyberpingo.vercel.app  ·  Apprends. Comprends. Réussis."; font: 500 7.2pt "Inter", sans-serif; color: #94a3b8; vertical-align: top; padding: 4mm 0 0 15mm; }
  @bottom-right { content: "Page " counter(page) " sur " counter(pages); font: 600 7.2pt "Inter", sans-serif; color: #64748b; vertical-align: top; padding: 4mm 15mm 0 0; }
}
@page :first {
  margin-top: 0;
  @top-left { content: none; }
  @top-right { content: none; }
}
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font: 400 9.4pt/1.58 "Inter", "Segoe UI", sans-serif; color: var(--ink-2); font-feature-settings: "cv11", "ss03"; hyphens: manual; }
main, .closing { margin-left: 15mm; margin-right: 15mm; }
strong { color: var(--ink); font-weight: 650; }
a { color: var(--accent-ink); text-decoration: none; border-bottom: .2mm solid var(--accent); }
em { color: var(--ink); }
.ico { display: block; flex: none; }

/* ---------- page de garde ---------- */
.cover { position: relative; height: 74mm; margin: 0 0 6mm; overflow: hidden; color: #fff; break-after: avoid; }
.cover__bg { position: absolute; inset: 0;
  background:
    radial-gradient(62mm 62mm at 90% 6%, rgba(var(--glow), .42), transparent 72%),
    radial-gradient(70mm 70mm at 4% 112%, rgba(139, 92, 246, .46), transparent 70%),
    linear-gradient(135deg, #050a22 0%, #0a1642 52%, #1b1560 100%); }
.cover__grid { position: absolute; inset: 0; opacity: .9;
  background-image: linear-gradient(rgba(255,255,255,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.055) 1px, transparent 1px);
  background-size: 7mm 7mm; -webkit-mask-image: linear-gradient(100deg, #000 0%, rgba(0,0,0,.25) 62%, transparent 85%); mask-image: linear-gradient(100deg, #000 0%, rgba(0,0,0,.25) 62%, transparent 85%); }
.shape { position: absolute; border-radius: 50%; border: .5mm solid rgba(var(--glow), .5); }
.shape--a { width: 46mm; height: 46mm; left: -30mm; bottom: -30mm; }
.shape--b { width: 19mm; height: 19mm; left: 112mm; top: 9mm; border-color: rgba(255,255,255,.18); border-width: .35mm; }
.shape--c { width: 4mm; height: 4mm; left: 139mm; top: 64mm; background: rgba(var(--glow), .9); border: 0; box-shadow: 0 0 5mm rgba(var(--glow), .9); }
.shape--d { display: none; }
.cover__mascot { position: absolute; top: 0; right: 0; width: 66mm; height: 100%; clip-path: polygon(17% 0, 100% 0, 100% 100%, 0 100%); }
.cover__mascot img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 14%; display: block; }
.cover__mascot::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(10,22,66,.9) 0%, rgba(10,22,66,0) 46%), linear-gradient(0deg, rgba(5,10,34,.55), transparent 40%); }
.cover__edge { position: absolute; right: 0; top: 0; width: 66mm; height: 100%; clip-path: polygon(17% 0, 19% 0, 2% 100%, 0 100%); background: linear-gradient(180deg, var(--blue), var(--violet)); opacity: .9; }
.cover__top { position: absolute; left: 15mm; right: 15mm; top: 9mm; display: flex; align-items: center; justify-content: space-between; }
.cover__logo { height: 9.4mm; width: auto; display: block; }
.cover__badge { display: block; margin-right: 55mm; padding: 1.2mm 3.2mm; border-radius: 99mm; border: .3mm solid rgba(var(--glow), .8); background: rgba(var(--glow), .16);
  font: 700 7pt "Space Grotesk", sans-serif; letter-spacing: .16em; text-transform: uppercase; color: #fff; white-space: nowrap; }
.cover__body { position: absolute; left: 15mm; bottom: 12mm; width: 124mm; }
.cover__eyebrow { margin: 0 0 2.4mm; font: 700 7.6pt "Space Grotesk", sans-serif; letter-spacing: .2em; text-transform: uppercase; color: rgb(var(--glow)); }
.cover h1 { margin: 0; font: 700 25pt/1.12 "Space Grotesk", sans-serif; color: #fff; letter-spacing: -.012em; text-wrap: balance; }
.cover h1.is-long { font-size: 21pt; }
.cover h1.is-xlong { font-size: 18pt; }
.cover__chips { list-style: none; margin: 4.2mm 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 2mm; }
.cover__chips li { padding: 1mm 2.8mm; border-radius: 99mm; background: rgba(255,255,255,.1); border: .25mm solid rgba(255,255,255,.22); font: 500 7.6pt "Inter", sans-serif; color: #e2e8f0; }
.cover__rule { position: absolute; left: 0; right: 0; bottom: 0; height: 1.6mm; background: linear-gradient(90deg, var(--blue), var(--violet) 55%, var(--green)); }

/* ---------- corps ---------- */
.lead { font-size: 10.6pt; line-height: 1.55; color: var(--ink); margin: 0 0 5mm; padding-left: 4mm; border-left: 1.1mm solid var(--accent); }
h2, h3, h4 { font-family: "Space Grotesk", sans-serif; color: var(--ink); break-after: avoid; }
h2 { display: flex; align-items: center; gap: 3mm; margin: 7mm 0 3mm; font-size: 14pt; line-height: 1.2; font-weight: 700; letter-spacing: -.005em; }
h2 .badge { width: 8.4mm; height: 8.4mm; border-radius: 2.6mm; display: grid; place-items: center; background: var(--soft); color: var(--accent-ink); border: .25mm solid rgba(var(--glow), .35); }
h2 .badge .ico { width: 4.8mm; height: 4.8mm; }
h2 .badge b { font: 700 10.5pt "Space Grotesk", sans-serif; }
h2 .rule { flex: 1; height: .25mm; background: linear-gradient(90deg, var(--line), transparent); }
h3 { margin: 5mm 0 2mm; font-size: 11pt; font-weight: 700; color: var(--accent-ink); display: flex; align-items: center; gap: 2mm; }
h3::before { content: ""; width: 2.2mm; height: 2.2mm; border-radius: .6mm; background: var(--accent); transform: rotate(45deg); }
h4 { margin: 4mm 0 1.5mm; font-size: 9.6pt; }
p { margin: 0 0 3mm; orphans: 3; widows: 3; }
p.hint { color: var(--muted); font-style: italic; display: flex; gap: 2mm; break-after: avoid; }
p.hint .ico { width: 3.6mm; height: 3.6mm; margin-top: .6mm; color: var(--accent); }
p.cont { margin-left: 8mm; }
hr { border: 0; height: .25mm; background: var(--line); margin: 5mm 0; }
code { font: 500 .88em "JetBrains Mono", Consolas, monospace; background: var(--wash); border: .2mm solid var(--line); border-radius: 1mm; padding: .1mm 1.1mm; color: var(--accent-ink); font-variant-ligatures: none; overflow-wrap: anywhere; }

ul, ol { margin: 0 0 3.6mm; padding: 0; list-style: none; break-inside: avoid; }
li { position: relative; margin: 0 0 1.7mm; padding-left: 6.4mm; break-inside: avoid; }
ul > li::before { content: ""; position: absolute; left: 1.6mm; top: 1.9mm; width: 1.9mm; height: 1.9mm; border-radius: .5mm; background: var(--accent); transform: rotate(45deg); }
ol { counter-reset: step var(--start, 0); }
ol > li { counter-increment: step; padding-left: 8mm; }
ol > li::before { content: counter(step); position: absolute; left: 0; top: -.2mm; width: 5.4mm; height: 5.4mm; border-radius: 50%; background: var(--accent); color: #fff; font: 700 7.6pt/5.4mm "Space Grotesk", sans-serif; text-align: center; }
ul.checks > li::before { width: 3.4mm; height: 3.4mm; border-radius: .8mm; background: #fff; border: .35mm solid var(--accent); transform: none; top: 1mm; left: .8mm; }

/* ---------- encadrés ---------- */
.callout { margin: 0 0 5mm; padding: 3.4mm 4.4mm 3mm; border-radius: 3mm; background: var(--soft); border: .3mm solid rgba(var(--glow), .35); border-left: 1.4mm solid var(--accent); break-inside: avoid; }
.callout__title { display: flex; align-items: center; gap: 2mm; margin-bottom: 1.6mm; font: 700 7.8pt "Space Grotesk", sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--accent-ink); }
.callout__title .ico { width: 4.2mm; height: 4.2mm; }
.callout p, .callout li { margin-bottom: 1.2mm; color: #1e293b; }
.callout ul { margin: 0; }

/* ---------- tableaux ---------- */
table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 2mm 0 5mm; font-size: 8.5pt; line-height: 1.4; border: .3mm solid var(--line); border-radius: 3mm; overflow: hidden; }
thead { display: table-header-group; }
th { background: var(--navy); color: #fff; font: 600 7.8pt "Space Grotesk", sans-serif; letter-spacing: .05em; text-transform: uppercase; text-align: left; padding: 2.4mm 2.8mm; }
td { padding: 2.1mm 2.8mm; border-top: .25mm solid var(--line); vertical-align: top; }
tbody tr:nth-child(even) td { background: var(--wash); }
tr { break-inside: avoid; }
td:first-child { font-weight: 600; color: var(--ink); }
table.fill { break-inside: avoid; }
table.fill td { height: 11mm; }
table.fill td:first-child { height: 11mm; }
.al-right { text-align: right; } .al-center { text-align: center; }

/* ---------- code ---------- */
.code { margin: 0 0 4.5mm; border-radius: 3mm; overflow: hidden; background: #0a1030; border: .3mm solid #1c2a5c; box-shadow: 0 .6mm 0 rgba(15,23,42,.08); }
.code.short { break-inside: avoid; }
.code figcaption { display: flex; align-items: center; gap: 1.6mm; padding: 1.9mm 3.4mm; background: linear-gradient(90deg, #111c4a, #0d1640); border-bottom: .25mm solid #1c2a5c; }
.code .dot { width: 2.2mm; height: 2.2mm; border-radius: 50%; display: block; }
.code .dot:nth-child(1) { background: #ff5f57; } .code .dot:nth-child(2) { background: #febc2e; } .code .dot:nth-child(3) { background: #28c840; }
.code .lang { margin-left: auto; font: 700 6.6pt "Space Grotesk", sans-serif; letter-spacing: .14em; text-transform: uppercase; color: rgb(var(--glow)); }
.code pre { margin: 0; padding: 3.2mm 4mm 3.4mm; font: 400 7.9pt/1.55 "JetBrains Mono", Consolas, monospace; color: #e2e8f0; white-space: pre; font-variant-ligatures: none; tab-size: 4; }
.code pre code { background: none; border: 0; border-radius: 0; padding: 0; color: inherit; font: inherit; overflow-wrap: normal; }
.code pre.wrapped { white-space: pre-wrap; overflow-wrap: anywhere; padding-left: 5.6mm; text-indent: -1.6mm; }
.code .copyhint { display: none; padding: 1.4mm 4mm 1.8mm; border-top: .25mm solid #1c2a5c; font: italic 400 6.8pt "Inter", sans-serif; color: #93a4d4; }
.code.has-wrap .copyhint { display: block; }
.tk-comment { color: #7c8bb8; font-style: italic; } .tk-string { color: #86efac; } .tk-variable { color: #67e8f9; }
.tk-cmdlet { color: #c4b5fd; } .tk-option { color: #fcd34d; } .tk-address { color: #fda4af; }

/* ---------- matériel ---------- */
.gear { margin: 0 0 6mm; break-inside: avoid; }
.gear__title { display: flex; align-items: center; gap: 2mm; margin: 0 0 2.4mm; font: 700 7.8pt "Space Grotesk", sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--accent-ink); }
.gear__title .ico { width: 4.2mm; height: 4.2mm; }
.gear__grid { display: grid; grid-template-columns: repeat(var(--cols, 4), minmax(0, 54mm)); gap: 3mm; justify-content: start; }
.gear figure { margin: 0; border: .3mm solid var(--line); border-radius: 3mm; overflow: hidden; background: #fff; }
.gear img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.gear figcaption { padding: 2mm 2.6mm 2.4mm; border-top: .25mm solid var(--line); }
.gear figcaption strong { display: block; font: 700 8.2pt "Space Grotesk", sans-serif; }
.gear figcaption span { display: block; margin-top: .5mm; font-size: 6.9pt; line-height: 1.32; color: var(--muted); }
.credits { margin: -3mm 0 5mm; font-size: 6.4pt; color: #94a3b8; line-height: 1.35; }

/* ---------- modèles à remplir ---------- */
.fields { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 8mm; margin: 0 0 5mm; }
.field { display: flex; align-items: flex-end; gap: 2mm; font: 600 8.6pt "Space Grotesk", sans-serif; color: var(--ink); }
.field i { flex: 1; border-bottom: .3mm solid #94a3b8; height: 5.4mm; }
.lines { display: flex; flex-direction: column; margin: 0 0 4mm; border-radius: 2.4mm; border: .3mm solid var(--line); overflow: hidden; background: #fff; break-inside: avoid; }
.lines i { display: block; height: 7.6mm; border-bottom: .26mm solid #cfd8e6; }
.lines i:last-child { border-bottom: 0; }

/* ---------- fin de document ---------- */
.closing { display: flex; gap: 4.5mm; align-items: center; margin-top: 5mm; padding: 3mm 4.6mm; border-radius: 3.4mm; color: #e2e8f0; break-inside: avoid;
  background: radial-gradient(40mm 30mm at 100% 0%, rgba(var(--glow), .35), transparent 70%), linear-gradient(135deg, #060b24, #12195a); }
.closing img { width: 14mm; height: auto; flex: none; }
.closing strong { color: #fff; font: 700 10pt "Space Grotesk", sans-serif; display: block; margin-bottom: .8mm; }
.closing p { margin: 0; font-size: 8.4pt; line-height: 1.45; color: #cbd5e1; }
.closing a { color: #fff; border-color: rgb(var(--glow)); }
`;
}

function renderCode(block) {
  const language = detectLanguage(block.lang, block.text);
  const label = LABELS[language] ?? (language ? language.toUpperCase() : "Terminal");
  const lines = block.text.split("\n").length;
  return `<figure class="code ${lines <= 16 ? "short" : ""}"><figcaption><i class="dot"></i><i class="dot"></i><i class="dot"></i><span class="lang">${esc(label)}</span></figcaption><pre><code>${highlight(block.text)}</code></pre><div class="copyhint">Commande longue, coupée par la mise en page : copie-la en une seule ligne ou utilise la version texte indiquée en fin de document.</div></figure>`;
}

function renderTable(block, template) {
  const headerOnly = block.rows.length === 0;
  const empty = block.rows.length > 0 && block.rows.every((row) => row.every((cell) => cell === ""));
  const hasBlank = block.rows.some((row) => row.some((cell) => cell === ""));
  const fill = template && (hasBlank || headerOnly);
  const rows = fill && (empty || headerOnly) ? Array.from({ length: Math.max(block.rows.length, 6) }, () => block.header.map(() => "")) : block.rows;
  const align = (index) => (block.align[index] === "right" ? ' class="al-right"' : block.align[index] === "center" ? ' class="al-center"' : "");
  const head = `<thead><tr>${block.header.map((cell, index) => `<th${align(index)}>${inline(cell)}</th>`).join("")}</tr></thead>`;
  const body = `<tbody>${rows.map((row) => `<tr>${block.header.map((_, index) => `<td${align(index)}>${inline(row[index] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody>`;
  return `<table${fill ? ' class="fill"' : ""}>${head}${body}</table>`;
}

function renderList(block) {
  const checks = block.items.some((item) => item.checked !== null);
  const items = block.items.map((item) => `<li>${inline(item.text).replace(/\n/g, "<br>")}</li>`).join("");
  if (block.ordered) return `<ol style="--start:${block.start - 1}">${items}</ol>`;
  return `<ul${checks ? ' class="checks"' : ""}>${items}</ul>`;
}

function renderQuote(block) {
  const [first, ...rest] = block.lines;
  const hasTitle = block.lines.length > 1 && first.length <= 48 && !/[.!?:;]$/.test(first.trim());
  const items = (hasTitle ? rest : block.lines).map((line) => `<li>${inline(line)}</li>`).join("");
  const title = hasTitle ? first : "À retenir";
  return `<aside class="callout"><div class="callout__title">${icon(hasTitle && /cadre|limite|prudence/i.test(first) ? "shield" : "bulb")}<span>${inline(title)}</span></div><ul>${items}</ul></aside>`;
}

function heading(block, state) {
  const level = state.seenTitle ? Math.max(block.level, 2) : block.level;
  const numbered = block.text.match(/^(\d+)[.)]\s+(.*)$/);
  const text = numbered ? numbered[2] : block.text;
  if (level === 2) {
    const badge = numbered ? `<b>${numbered[1]}</b>` : icon(iconFor(text));
    return `<h2><span class="badge">${badge}</span><span>${inline(text)}</span><span class="rule"></span></h2>`;
  }
  return `<h${level}>${inline(block.text)}</h${level}>`;
}

const FIELD_LINE = /^([^:]{2,40}):\s*$/;

function renderBody(blocks, { template }) {
  const html = [];
  const state = { seenTitle: false };
  let titleSkipped = false;
  let sectionOpen = false;
  let sectionFilled = false;
  let lead = true;

  const closeSection = () => {
    if (template && sectionOpen && !sectionFilled) html.push(`<div class="lines">${"<i></i>".repeat(6)}</div>`);
    sectionOpen = false;
    sectionFilled = false;
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.type === "heading") {
      if (!titleSkipped && block.level === 1) { titleSkipped = true; state.seenTitle = true; continue; }
      closeSection();
      html.push(heading(block, state));
      if (template && Math.max(block.level, 2) === 2) sectionOpen = true;
      lead = false;
      continue;
    }
    if (block.type === "paragraph") {
      const fields = block.lines.every((line) => FIELD_LINE.test(line));
      if (template && fields) {
        html.push(`<div class="fields">${block.lines.map((line) => `<div class="field"><span>${inline(line.match(FIELD_LINE)[1])}</span><i></i></div>`).join("")}</div>`);
        continue;
      }
      const text = block.lines.map((line) => inline(line)).join("<br>");
      if (lead && !template) { html.push(`<p class="lead">${text}</p>`); lead = false; continue; }
      lead = false;
      if (template && sectionOpen) { html.push(`<p class="hint">${icon("pencil", 16)}<span>${text}</span></p>`); continue; }
      html.push(`<p>${text}</p>`);
      continue;
    }
    lead = false;
    if (block.type === "table") { html.push(renderTable(block, template)); sectionFilled = sectionFilled || (template && (block.rows.length === 0 || block.rows.some((row) => row.some((cell) => cell === "")))); continue; }
    if (block.type === "list") {
      html.push(renderList(block));
      if (template && sectionOpen && block.items.some((item) => /:\s*$/.test(item.text))) sectionFilled = false;
      else sectionFilled = sectionFilled || template;
      continue;
    }
    if (block.type === "code") { html.push(renderCode(block)); continue; }
    if (block.type === "quote") { html.push(renderQuote(block)); continue; }
    if (block.type === "rule") { html.push("<hr>"); continue; }
  }
  closeSection();
  return html.join("\n");
}

function renderGear(items, intro) {
  if (!items.length) return "";
  const cols = items.length <= 3 ? items.length : items.length === 5 || items.length === 6 ? 3 : 4;
  const figures = items.map((item) => `<figure><img src="${item.image}" alt="${esc(item.alt)}"><figcaption><strong>${esc(item.name)}</strong><span>${esc(item.summary)}</span></figcaption></figure>`).join("");
  const credits = items.filter((item) => item.credit).map((item) => `${item.name}, ${item.credit}`).join(" · ");
  return `<section class="gear" style="--cols:${cols}"><div class="gear__title">${icon("layers")}<span>${esc(intro)}</span></div><div class="gear__grid">${figures}</div></section>${credits ? `<p class="credits">Photos issues de Wikimedia Commons : ${esc(credits)}.</p>` : ""}`;
}

function closingBlock(meta, assets, hasCode) {
  const tail = meta.kind === "template"
    ? "Complète ce modèle à la main ou dans ton éditeur de texte, puis garde-le dans ton portfolio ou dépose-le dans CyberPingo."
    : "Retourne au laboratoire pour valider tes réponses. Bloqué ? Ouvre d’abord l’indice de la tâche, la correction vient ensuite.";
  const copy = hasCode && meta.textUrl
    ? ` Pour copier les commandes sans coupure de ligne, ouvre la <a href="${SITE}${meta.textUrl}">version texte</a>.`
    : "";
  return `<aside class="closing"><img src="${assets.emblem}" alt="Pingo, la mascotte de CyberPingo"><div><strong>Pingo veille sur ta progression</strong><p>${tail}${copy}</p></div></aside>`;
}

/**
 * meta : { title, kind: "guide" | "template" | ..., docLabel, course, lab, textUrl }
 */
function renderDocument({ meta, blocks, assets, fonts, gear }) {
  const theme = THEMES[meta.course] ?? THEMES.reseaux;
  const template = meta.kind === "template";
  const titleLength = meta.title.length;
  const titleClass = titleLength > 78 ? "is-xlong" : titleLength > 52 ? "is-long" : "";
  const chips = [meta.lab, meta.chip].filter(Boolean).map((chip) => `<li>${esc(chip)}</li>`).join("");
  const hasCode = blocks.some((block) => block.type === "code");
  const gearHtml = gear && gear.items.length ? renderGear(gear.items, gear.title) : "";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${esc(meta.title)} · CyberPingo</title>
<meta name="author" content="CyberPingo">
<meta name="description" content="${esc(meta.docLabel)} du parcours ${esc(theme.name)}">
<style>${css(theme, fonts, meta.title)}</style>
</head>
<body>
<header class="cover">
  <div class="cover__bg"></div><div class="cover__grid"></div>
  <span class="shape shape--a"></span><span class="shape shape--b"></span><span class="shape shape--c"></span><span class="shape shape--d"></span>
  <div class="cover__mascot"><img src="${assets.mascot}" alt=""></div><div class="cover__edge"></div>
  <div class="cover__top"><img class="cover__logo" src="${assets.wordmark}" alt="CyberPingo"><span class="cover__badge">${esc(meta.docLabel)}</span></div>
  <div class="cover__body">
    <p class="cover__eyebrow">${esc(theme.name)}</p>
    <h1 class="${titleClass}">${inline(meta.title)}</h1>
    ${chips ? `<ul class="cover__chips">${chips}</ul>` : ""}
  </div>
  <div class="cover__rule"></div>
</header>
<main>
${gearHtml}
${renderBody(blocks, { template })}
</main>
${closingBlock(meta, assets, hasCode)}
<script>
window.__prepare = function () {
  document.querySelectorAll(".code pre").forEach(function (pre) {
    var size = 7.9;
    while (pre.scrollWidth > pre.clientWidth + 1 && size > 6.6) { size -= 0.2; pre.style.fontSize = size + "pt"; }
    if (pre.scrollWidth > pre.clientWidth + 1) { pre.classList.add("wrapped"); pre.parentElement.classList.add("has-wrap"); }
  });
  return true;
};
</script>
</body>
</html>`;
}

module.exports = { renderDocument, THEMES };
