"use strict";
// Convertisseur Markdown minimal, limité à ce que les guides de laboratoire utilisent :
// titres, paragraphes, listes (puces, numéros, cases), tableaux, blocs de code, citations et filets.

const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const NBSP = "\u00A0";
const NNBSP = "\u202F";

/** Typographie française : espace insécable avant « : ; ! ? » et à l’intérieur des guillemets. */
function typography(text) {
  return text
    .replace(/[ \t]+:(?=\s|$|<)/g, `${NBSP}:`)
    .replace(/[ \t]+([;!?])(?=\s|$|<)/g, `${NNBSP}$1`)
    .replace(/«[ \t]+/g, `«${NNBSP}`)
    .replace(/[ \t]+»/g, `${NNBSP}»`);
}

function inline(source) {
  const codes = [];
  let text = String(source).replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });
  text = esc(text);
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, "$1<em>$2</em>");
  text = typography(text);
  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => `<code>${esc(codes[Number(index)])}</code>`);
}

const FENCE = /^```\s*([\w+-]*)\s*$/;
const HEADING = /^(#{1,4})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s*(-{3,}|\*{3,})\s*$/;
const LIST_ITEM = /^( {0,3})([-*]|\d+[.)])\s+(.*)$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line) {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map((cell) => cell.trim());
}

function startsBlock(line, next) {
  return FENCE.test(line) || HEADING.test(line) || RULE.test(line) || /^>/.test(line) || LIST_ITEM.test(line)
    || (line.trim().startsWith("|") && next !== undefined && TABLE_SEPARATOR.test(next));
}

function parseBlocks(markdown) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i += 1; continue; }

    const fence = line.match(FENCE);
    if (fence) {
      const code = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { code.push(lines[i]); i += 1; }
      i += 1;
      blocks.push({ type: "code", lang: fence[1].toLowerCase(), text: code.join("\n") });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) { blocks.push({ type: "heading", level: heading[1].length, text: heading[2] }); i += 1; continue; }

    if (RULE.test(line)) { blocks.push({ type: "rule" }); i += 1; continue; }

    if (line.trim().startsWith("|") && lines[i + 1] !== undefined && TABLE_SEPARATOR.test(lines[i + 1])) {
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map((cell) => (cell.startsWith(":") && cell.endsWith(":") ? "center" : cell.endsWith(":") ? "right" : "left"));
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(splitRow(lines[i])); i += 1; }
      blocks.push({ type: "table", header, align, rows });
      continue;
    }

    if (/^>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>/.test(lines[i])) { quote.push(lines[i].replace(/^>\s?/, "")); i += 1; }
      blocks.push({ type: "quote", lines: quote.filter((entry) => entry.trim() !== "") });
      continue;
    }

    const item = line.match(LIST_ITEM);
    if (item) {
      const ordered = /\d/.test(item[2]);
      const items = [];
      const start = ordered ? Number.parseInt(item[2], 10) : 1;
      while (i < lines.length) {
        const current = lines[i].match(LIST_ITEM);
        if (current && /\d/.test(current[2]) === ordered) {
          let content = current[3];
          let checked = null;
          const box = content.match(/^\[( |x|X)\]\s+(.*)$/);
          if (box) { checked = box[1] !== " "; content = box[2]; }
          items.push({ text: content, checked });
          i += 1;
        } else if (current) {
          break;
        } else if (/^ {2,}\S/.test(lines[i]) && items.length > 0) {
          items[items.length - 1].text += `\n${lines[i].trim()}`;
          i += 1;
        } else {
          break;
        }
      }
      blocks.push({ type: "list", ordered, start, items });
      continue;
    }

    const paragraph = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && (paragraph.length === 0 || !startsBlock(lines[i], lines[i + 1]))) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", lines: paragraph });
  }
  return blocks;
}

module.exports = { parseBlocks, inline, esc, typography };
