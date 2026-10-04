import { FIGURE_ICONS, isFigureIcon, type FigureIcon } from "./figure-icons";

/**
 * A figure is a diagram written as data: the lesson stores it as the content of a `schema` block (JSON text)
 * and the page draws it (components/figures). Plain text in a schema block is still shown, as preformatted text.
 */
export const FIGURE_VERSION = 1 as const;

export const TONES = ["cyan", "blue", "violet", "green", "amber", "red", "neutral"] as const;
export type Tone = (typeof TONES)[number];

export type { FigureIcon };

interface Base { v: typeof FIGURE_VERSION; title?: string; caption?: string }

export interface FlowNode { label: string; text?: string; icon?: FigureIcon; tone?: Tone }
export interface FlowFigure extends Base { kind: "flow"; nodes: FlowNode[]; loop?: string }
export interface CycleFigure extends Base { kind: "cycle"; nodes: FlowNode[]; center?: string }

export interface StepItem { title: string; text?: string; icon?: FigureIcon; tone?: Tone }
export interface StepsFigure extends Base { kind: "steps"; items: StepItem[]; numbered?: boolean }

export interface TableFigure extends Base { kind: "table"; columns: string[]; rows: string[][]; mono?: number[]; highlight?: number; rowTones?: (Tone | null)[] }

export interface CardItem { term: string; text: string; icon?: FigureIcon; tone?: Tone; tag?: string }
export interface CardsFigure extends Base { kind: "cards"; items: CardItem[]; columns?: 2 | 3 }

export interface CompareSide { title: string; items: string[]; tone?: Tone; icon?: FigureIcon; mark?: "check" | "cross" | "dot" }
export interface CompareFigure extends Base { kind: "compare"; sides: CompareSide[]; verdict?: string }

export interface LayerItem { label: string; text?: string; icon?: FigureIcon; tone?: Tone }
export interface LayersFigure extends Base { kind: "layers"; layers: LayerItem[]; nested?: boolean; side?: string }

export interface NetworkZone { label: string; col: number; row: number; w: number; h: number; tone?: Tone }
export interface NetworkNode { id: string; label: string; sub?: string; icon: FigureIcon; col: number; row: number; tone?: Tone }
export interface NetworkLink { from: string; to: string; label?: string; style?: "solid" | "dashed" | "wireless" | "thick"; arrow?: "none" | "to" | "both"; tone?: Tone }
export interface NetworkFigure extends Base { kind: "network"; cols: number; rows: number; zones?: NetworkZone[]; nodes: NetworkNode[]; links: NetworkLink[] }

export interface PacketField { name: string; size?: string; weight?: number; tone?: Tone; note?: string }
export interface PacketRow { label?: string; fields: PacketField[] }
export interface PacketFigure extends Base { kind: "packet"; rows: PacketRow[] }

export interface AnatomySegment { text: string; label?: string; tone?: Tone }
export interface AnatomyFigure extends Base { kind: "anatomy"; lines: AnatomySegment[][] }

export interface FormulaItem { label: string; formula: string; example?: string; result?: string; tone?: Tone }
export interface FormulaFigure extends Base { kind: "formula"; items: FormulaItem[] }

export interface TimelineEvent { at: string; title: string; text?: string; icon?: FigureIcon; tone?: Tone }
export interface TimelineFigure extends Base { kind: "timeline"; events: TimelineEvent[] }

export interface MatrixCell { text?: string; tone: Tone }
export interface MatrixFigure extends Base { kind: "matrix"; xLabel: string; yLabel: string; xs: string[]; ys: string[]; cells: MatrixCell[][] }

export interface TerminalLine { kind: "cmd" | "out" | "note"; text: string }
export interface TerminalFigure extends Base { kind: "terminal"; prompt?: string; lines: TerminalLine[] }

export interface RelationPair { from: string; to: string; label?: string; tone?: Tone; icon?: FigureIcon }
export interface RelationsFigure extends Base { kind: "relations"; pairs: RelationPair[] }

export type Figure =
  | FlowFigure | CycleFigure | StepsFigure | TableFigure | CardsFigure | CompareFigure | LayersFigure | NetworkFigure
  | PacketFigure | AnatomyFigure | FormulaFigure | TimelineFigure | MatrixFigure | TerminalFigure | RelationsFigure;

export type FigureKind = Figure["kind"];
export const FIGURE_KINDS: readonly FigureKind[] = [
  "flow", "cycle", "steps", "table", "cards", "compare", "layers", "network", "packet", "anatomy", "formula", "timeline", "matrix", "terminal", "relations",
];

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
/** What an author writes: a figure without its version. */
export type FigureInput = DistributiveOmit<Figure, "v">;

/** The text stored in a lesson block. Compact JSON: the block stays small and the database sees an ordinary string. */
export function serializeFigure(input: FigureInput): string {
  return JSON.stringify({ v: FIGURE_VERSION, ...input });
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Reads a schema block: a figure when it is our JSON, null for the older plain-text schemas. */
export function parseFigure(content: string): Figure | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const value: unknown = JSON.parse(trimmed);
    if (!isRecord(value) || value.v !== FIGURE_VERSION || typeof value.kind !== "string" || !(FIGURE_KINDS as readonly string[]).includes(value.kind)) return null;
    return validateFigure(value as unknown as Figure).length === 0 ? (value as unknown as Figure) : null;
  } catch {
    return null;
  }
}

// --- Validation -----------------------------------------------------------------------------

const MAX = {
  title: 80, caption: 240, label: 36, text: 160, tag: 18, cell: 120, side: 44, item: 130, formula: 100, example: 200, result: 70,
  at: 26, line: 110, segment: 46, segmentLabel: 26, field: 24, size: 18, note: 46, zone: 36, nodeLabel: 24, nodeSub: 34, linkLabel: 26,
  axis: 34, cellText: 22, relFrom: 44, relTo: 80, relLabel: 28, loop: 56, center: 44, verdict: 200, side2: 40,
};

const COUNT: Record<FigureKind, [number, number]> = {
  flow: [2, 5], cycle: [3, 8], steps: [2, 10], table: [2, 14], cards: [2, 9], compare: [2, 3], layers: [2, 8], network: [2, 14],
  packet: [1, 5], anatomy: [1, 4], formula: [1, 4], timeline: [2, 10], matrix: [2, 5], terminal: [1, 14], relations: [2, 9],
};

class Checker {
  readonly issues: string[] = [];
  constructor(private readonly kind: string) {}
  add(message: string) { this.issues.push(`${this.kind} : ${message}`); }
  str(value: unknown, max: number, where: string, required = true): value is string {
    if (value === undefined || value === null || value === "") {
      if (required) this.add(`${where} manquant`);
      return false;
    }
    if (typeof value !== "string") { this.add(`${where} doit être un texte`); return false; }
    if (value.length > max) this.add(`${where} trop long (${value.length} caractères, ${max} maximum) : « ${value.slice(0, 40)}… »`);
    if (value.trim() !== value) this.add(`${where} : espaces en début ou fin de texte`);
    return true;
  }
  tone(value: unknown, where: string) {
    if (value !== undefined && !(TONES as readonly string[]).includes(value as string)) this.add(`${where} : teinte inconnue « ${String(value)} » (${TONES.join(", ")})`);
  }
  icon(value: unknown, where: string) {
    if (value !== undefined && !isFigureIcon(value)) this.add(`${where} : icône inconnue « ${String(value)} »`);
  }
  count(list: unknown, [min, max]: [number, number], where: string): list is unknown[] {
    if (!Array.isArray(list)) { this.add(`${where} doit être une liste`); return false; }
    if (list.length < min || list.length > max) this.add(`${where} : entre ${min} et ${max} éléments (${list.length} trouvés)`);
    return true;
  }
}

/** Structural and size rules. An empty list means the figure can be drawn. */
export function validateFigure(figure: Figure): string[] {
  const kind = (figure as { kind?: unknown })?.kind;
  if (typeof kind !== "string" || !(FIGURE_KINDS as readonly string[]).includes(kind)) return [`kind inconnu « ${String(kind)} » (${FIGURE_KINDS.join(", ")})`];
  const c = new Checker(kind);
  const f = figure as unknown as Record<string, unknown> & { kind: FigureKind };
  if (f.v !== FIGURE_VERSION) c.add(`version ${String(f.v)} non gérée`);
  if (f.title !== undefined) c.str(f.title, MAX.title, "title", false);
  if (f.caption !== undefined) c.str(f.caption, MAX.caption, "caption", false);
  const extra = Object.keys(f).filter((key) => !["v", "kind", "title", "caption"].includes(key));
  const allowed: Record<FigureKind, string[]> = {
    flow: ["nodes", "loop"], cycle: ["nodes", "center"], steps: ["items", "numbered"], table: ["columns", "rows", "mono", "highlight", "rowTones"],
    cards: ["items", "columns"], compare: ["sides", "verdict"], layers: ["layers", "nested", "side"], network: ["cols", "rows", "zones", "nodes", "links"],
    packet: ["rows"], anatomy: ["lines"], formula: ["items"], timeline: ["events"], matrix: ["xLabel", "yLabel", "xs", "ys", "cells"],
    terminal: ["prompt", "lines"], relations: ["pairs"],
  };
  for (const key of extra) if (!allowed[f.kind].includes(key)) c.add(`champ inconnu « ${key} »`);

  const node = (item: unknown, where: string, labelMax: number, textMax: number) => {
    if (!isRecord(item)) { c.add(`${where} doit être un objet`); return; }
    c.str(item.label, labelMax, `${where}.label`);
    c.str(item.text, textMax, `${where}.text`, false);
    c.icon(item.icon, where);
    c.tone(item.tone, where);
  };

  switch (f.kind) {
    case "flow": {
      if (c.count(f.nodes, COUNT.flow, "nodes")) (f.nodes as unknown[]).forEach((n, i) => node(n, `nodes[${i}]`, MAX.label, 90));
      if (f.loop !== undefined) c.str(f.loop, MAX.loop, "loop", false);
      break;
    }
    case "cycle": {
      if (c.count(f.nodes, COUNT.cycle, "nodes")) (f.nodes as unknown[]).forEach((n, i) => node(n, `nodes[${i}]`, 26, 70));
      if (f.center !== undefined) c.str(f.center, MAX.center, "center", false);
      break;
    }
    case "steps": {
      if (c.count(f.items, COUNT.steps, "items")) (f.items as unknown[]).forEach((n, i) => {
        if (!isRecord(n)) { c.add(`items[${i}] doit être un objet`); return; }
        c.str(n.title, 80, `items[${i}].title`); c.str(n.text, MAX.text, `items[${i}].text`, false); c.icon(n.icon, `items[${i}]`); c.tone(n.tone, `items[${i}]`);
      });
      break;
    }
    case "table": {
      const cols = f.columns as unknown;
      const rows = f.rows as unknown;
      const colCount = Array.isArray(cols) ? cols.length : 0;
      if (c.count(cols, [2, 6], "columns")) (cols as unknown[]).forEach((h, i) => c.str(h, 40, `columns[${i}]`));
      if (c.count(rows, COUNT.table, "rows")) (rows as unknown[]).forEach((row, r) => {
        if (!Array.isArray(row) || row.length !== colCount) { c.add(`rows[${r}] doit avoir ${colCount} cellules`); return; }
        row.forEach((cell, i) => c.str(cell, MAX.cell, `rows[${r}][${i}]`));
      });
      for (const key of ["mono"] as const) {
        const list = f[key];
        if (list !== undefined && (!Array.isArray(list) || list.some((i) => !Number.isInteger(i) || (i as number) < 0 || (i as number) >= colCount))) c.add("mono : indices de colonnes invalides");
      }
      if (f.highlight !== undefined && (!Number.isInteger(f.highlight) || (f.highlight as number) < 0 || (f.highlight as number) >= colCount)) c.add("highlight : indice de colonne invalide");
      if (f.rowTones !== undefined) {
        if (!Array.isArray(f.rowTones) || f.rowTones.length !== (Array.isArray(rows) ? rows.length : -1)) c.add("rowTones : une teinte (ou null) par ligne");
        else (f.rowTones as unknown[]).forEach((t) => { if (t !== null) c.tone(t, "rowTones"); });
      }
      break;
    }
    case "cards": {
      if (c.count(f.items, COUNT.cards, "items")) (f.items as unknown[]).forEach((n, i) => {
        if (!isRecord(n)) { c.add(`items[${i}] doit être un objet`); return; }
        c.str(n.term, 44, `items[${i}].term`); c.str(n.text, MAX.text, `items[${i}].text`); c.str(n.tag, MAX.tag, `items[${i}].tag`, false); c.icon(n.icon, `items[${i}]`); c.tone(n.tone, `items[${i}]`);
      });
      if (f.columns !== undefined && f.columns !== 2 && f.columns !== 3) c.add("columns : 2 ou 3");
      break;
    }
    case "compare": {
      if (c.count(f.sides, COUNT.compare, "sides")) (f.sides as unknown[]).forEach((s, i) => {
        if (!isRecord(s)) { c.add(`sides[${i}] doit être un objet`); return; }
        c.str(s.title, MAX.side2, `sides[${i}].title`); c.icon(s.icon, `sides[${i}]`); c.tone(s.tone, `sides[${i}]`);
        if (s.mark !== undefined && !["check", "cross", "dot"].includes(s.mark as string)) c.add(`sides[${i}].mark : check, cross ou dot`);
        if (c.count(s.items, [1, 7], `sides[${i}].items`)) (s.items as unknown[]).forEach((t, j) => c.str(t, MAX.item, `sides[${i}].items[${j}]`));
      });
      if (f.verdict !== undefined) c.str(f.verdict, MAX.verdict, "verdict", false);
      break;
    }
    case "layers": {
      if (c.count(f.layers, COUNT.layers, "layers")) (f.layers as unknown[]).forEach((n, i) => node(n, `layers[${i}]`, MAX.label, 110));
      if (f.side !== undefined) c.str(f.side, 60, "side", false);
      break;
    }
    case "network": {
      const cols = f.cols as number;
      const rowsN = f.rows as number;
      if (!Number.isInteger(cols) || cols < 2 || cols > 6) c.add("cols : entier entre 2 et 6");
      if (!Number.isInteger(rowsN) || rowsN < 1 || rowsN > 5) c.add("rows : entier entre 1 et 5");
      const ids = new Set<string>();
      const used = new Set<string>();
      if (c.count(f.nodes, COUNT.network, "nodes")) (f.nodes as unknown[]).forEach((n, i) => {
        if (!isRecord(n)) { c.add(`nodes[${i}] doit être un objet`); return; }
        c.str(n.id, 20, `nodes[${i}].id`); c.str(n.label, MAX.nodeLabel, `nodes[${i}].label`); c.str(n.sub, MAX.nodeSub, `nodes[${i}].sub`, false);
        if (!isFigureIcon(n.icon)) c.add(`nodes[${i}].icon : icône inconnue « ${String(n.icon)} »`);
        c.tone(n.tone, `nodes[${i}]`);
        if (typeof n.id === "string") { if (ids.has(n.id)) c.add(`nodes[${i}].id en double « ${n.id} »`); ids.add(n.id); }
        const col = n.col as number; const row = n.row as number;
        const half = (v: unknown) => typeof v === "number" && Number.isFinite(v) && Number.isInteger(v * 2);
        if (!half(col) || !half(row) || col < 0 || row < 0 || col > cols - 1 || row > rowsN - 1) c.add(`nodes[${i}] : case (${String(n.col)}, ${String(n.row)}) hors de la grille ${cols}x${rowsN} (les demi-cases comme 1.5 sont permises)`);
        else { const key = `${col},${row}`; if (used.has(key)) c.add(`nodes[${i}] : la case (${col}, ${row}) est déjà prise`); used.add(key); }
      });
      if (f.zones !== undefined) {
        if (!Array.isArray(f.zones) || f.zones.length > 4) c.add("zones : 4 maximum");
        else (f.zones as unknown[]).forEach((z, i) => {
          if (!isRecord(z)) { c.add(`zones[${i}] doit être un objet`); return; }
          c.str(z.label, MAX.zone, `zones[${i}].label`); c.tone(z.tone, `zones[${i}]`);
          const ok = [z.col, z.row, z.w, z.h].every((v) => Number.isInteger(v)) && (z.col as number) >= 0 && (z.row as number) >= 0 && (z.w as number) >= 1 && (z.h as number) >= 1 && (z.col as number) + (z.w as number) <= cols && (z.row as number) + (z.h as number) <= rowsN;
          if (!ok) c.add(`zones[${i}] : rectangle hors de la grille`);
        });
      }
      if (c.count(f.links, [1, 24], "links")) (f.links as unknown[]).forEach((l, i) => {
        if (!isRecord(l)) { c.add(`links[${i}] doit être un objet`); return; }
        if (typeof l.from !== "string" || !ids.has(l.from)) c.add(`links[${i}].from : nœud inconnu « ${String(l.from)} »`);
        if (typeof l.to !== "string" || !ids.has(l.to)) c.add(`links[${i}].to : nœud inconnu « ${String(l.to)} »`);
        if (l.from === l.to) c.add(`links[${i}] : un lien ne relie pas un nœud à lui-même`);
        c.str(l.label, MAX.linkLabel, `links[${i}].label`, false); c.tone(l.tone, `links[${i}]`);
        if (l.style !== undefined && !["solid", "dashed", "wireless", "thick"].includes(l.style as string)) c.add(`links[${i}].style : solid, dashed, wireless ou thick`);
        if (l.arrow !== undefined && !["none", "to", "both"].includes(l.arrow as string)) c.add(`links[${i}].arrow : none, to ou both`);
      });
      break;
    }
    case "packet": {
      if (c.count(f.rows, COUNT.packet, "rows")) (f.rows as unknown[]).forEach((row, r) => {
        if (!isRecord(row)) { c.add(`rows[${r}] doit être un objet`); return; }
        c.str(row.label, 40, `rows[${r}].label`, false);
        if (c.count(row.fields, [2, 10], `rows[${r}].fields`)) (row.fields as unknown[]).forEach((fd, i) => {
          if (!isRecord(fd)) { c.add(`rows[${r}].fields[${i}] doit être un objet`); return; }
          c.str(fd.name, MAX.field, `rows[${r}].fields[${i}].name`); c.str(fd.size, MAX.size, `rows[${r}].fields[${i}].size`, false); c.str(fd.note, MAX.note, `rows[${r}].fields[${i}].note`, false); c.tone(fd.tone, `rows[${r}].fields[${i}]`);
          if (fd.weight !== undefined && (typeof fd.weight !== "number" || fd.weight < 1 || fd.weight > 20)) c.add(`rows[${r}].fields[${i}].weight : nombre entre 1 et 20`);
        });
      });
      break;
    }
    case "anatomy": {
      if (c.count(f.lines, COUNT.anatomy, "lines")) (f.lines as unknown[]).forEach((line, r) => {
        if (c.count(line, [1, 10], `lines[${r}]`)) (line as unknown[]).forEach((seg, i) => {
          if (!isRecord(seg)) { c.add(`lines[${r}][${i}] doit être un objet`); return; }
          c.str(seg.text, MAX.segment, `lines[${r}][${i}].text`); c.str(seg.label, MAX.segmentLabel, `lines[${r}][${i}].label`, false); c.tone(seg.tone, `lines[${r}][${i}]`);
        });
      });
      break;
    }
    case "formula": {
      if (c.count(f.items, COUNT.formula, "items")) (f.items as unknown[]).forEach((n, i) => {
        if (!isRecord(n)) { c.add(`items[${i}] doit être un objet`); return; }
        c.str(n.label, 60, `items[${i}].label`); c.str(n.formula, MAX.formula, `items[${i}].formula`); c.str(n.example, MAX.example, `items[${i}].example`, false); c.str(n.result, MAX.result, `items[${i}].result`, false); c.tone(n.tone, `items[${i}]`);
      });
      break;
    }
    case "timeline": {
      if (c.count(f.events, COUNT.timeline, "events")) (f.events as unknown[]).forEach((n, i) => {
        if (!isRecord(n)) { c.add(`events[${i}] doit être un objet`); return; }
        c.str(n.at, MAX.at, `events[${i}].at`); c.str(n.title, 80, `events[${i}].title`); c.str(n.text, MAX.text, `events[${i}].text`, false); c.icon(n.icon, `events[${i}]`); c.tone(n.tone, `events[${i}]`);
      });
      break;
    }
    case "matrix": {
      c.str(f.xLabel, MAX.axis, "xLabel"); c.str(f.yLabel, MAX.axis, "yLabel");
      const xs = f.xs as unknown; const ys = f.ys as unknown;
      if (c.count(xs, COUNT.matrix, "xs")) (xs as unknown[]).forEach((x, i) => c.str(x, 24, `xs[${i}]`));
      if (c.count(ys, COUNT.matrix, "ys")) (ys as unknown[]).forEach((y, i) => c.str(y, 24, `ys[${i}]`));
      const cells = f.cells as unknown;
      if (!Array.isArray(cells) || !Array.isArray(ys) || cells.length !== ys.length) c.add("cells : une ligne par valeur de ys");
      else cells.forEach((row, r) => {
        if (!Array.isArray(row) || !Array.isArray(xs) || row.length !== xs.length) { c.add(`cells[${r}] : une cellule par valeur de xs`); return; }
        row.forEach((cell, i) => {
          if (!isRecord(cell)) { c.add(`cells[${r}][${i}] doit être un objet`); return; }
          c.str(cell.text, MAX.cellText, `cells[${r}][${i}].text`, false);
          if (!(TONES as readonly string[]).includes(cell.tone as string)) c.add(`cells[${r}][${i}].tone : teinte obligatoire`);
        });
      });
      break;
    }
    case "terminal": {
      if (f.prompt !== undefined) c.str(f.prompt, 24, "prompt", false);
      if (c.count(f.lines, COUNT.terminal, "lines")) (f.lines as unknown[]).forEach((l, i) => {
        if (!isRecord(l)) { c.add(`lines[${i}] doit être un objet`); return; }
        if (!["cmd", "out", "note"].includes(l.kind as string)) c.add(`lines[${i}].kind : cmd, out ou note`);
        c.str(l.text, MAX.line, `lines[${i}].text`);
      });
      break;
    }
    case "relations": {
      if (c.count(f.pairs, COUNT.relations, "pairs")) (f.pairs as unknown[]).forEach((p, i) => {
        if (!isRecord(p)) { c.add(`pairs[${i}] doit être un objet`); return; }
        c.str(p.from, MAX.relFrom, `pairs[${i}].from`); c.str(p.to, MAX.relTo, `pairs[${i}].to`); c.str(p.label, MAX.relLabel, `pairs[${i}].label`, false); c.icon(p.icon, `pairs[${i}]`); c.tone(p.tone, `pairs[${i}]`);
      });
      break;
    }
  }
  return c.issues;
}

// --- Text and summaries ---------------------------------------------------------------------

const stripMarkup = (value: string) => value.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");

/** Every visible string of a figure, in reading order (markup removed). */
export function figureText(figure: Figure): string[] {
  const out: string[] = [];
  const add = (...values: (string | undefined)[]) => { for (const value of values) if (value) out.push(stripMarkup(value)); };
  add(figure.title);
  switch (figure.kind) {
    case "flow": figure.nodes.forEach((n) => add(n.label, n.text)); add(figure.loop); break;
    case "cycle": figure.nodes.forEach((n) => add(n.label, n.text)); add(figure.center); break;
    case "steps": figure.items.forEach((n) => add(n.title, n.text)); break;
    case "table": add(...figure.columns); figure.rows.forEach((row) => add(...row)); break;
    case "cards": figure.items.forEach((n) => add(n.term, n.text, n.tag)); break;
    case "compare": figure.sides.forEach((s) => { add(s.title); s.items.forEach((t) => add(t)); }); add(figure.verdict); break;
    case "layers": figure.layers.forEach((n) => add(n.label, n.text)); add(figure.side); break;
    case "network": figure.zones?.forEach((z) => add(z.label)); figure.nodes.forEach((n) => add(n.label, n.sub)); figure.links.forEach((l) => add(l.label)); break;
    case "packet": figure.rows.forEach((r) => { add(r.label); r.fields.forEach((fd) => add(fd.name, fd.size, fd.note)); }); break;
    case "anatomy": figure.lines.forEach((line) => line.forEach((s) => add(s.text, s.label))); break;
    case "formula": figure.items.forEach((n) => add(n.label, n.formula, n.example, n.result)); break;
    case "timeline": figure.events.forEach((n) => add(n.at, n.title, n.text)); break;
    case "matrix": add(figure.xLabel, figure.yLabel, ...figure.xs, ...figure.ys); figure.cells.forEach((row) => row.forEach((c) => add(c.text))); break;
    case "terminal": figure.lines.forEach((l) => add(l.text)); break;
    case "relations": figure.pairs.forEach((p) => add(p.from, p.label, p.to)); break;
  }
  add(figure.caption);
  return out;
}

/** The strings written in sentences and labels: these follow the typography rules of the prose. Code, formulas and data are left out. */
export function figureProse(figure: Figure): string[] {
  const out: string[] = [];
  const add = (...values: (string | undefined)[]) => { for (const value of values) if (value) out.push(value.replace(/`[^`]*`/g, "")); };
  add(figure.title, figure.caption);
  switch (figure.kind) {
    case "flow": figure.nodes.forEach((n) => add(n.label, n.text)); add(figure.loop); break;
    case "cycle": figure.nodes.forEach((n) => add(n.label, n.text)); add(figure.center); break;
    case "steps": figure.items.forEach((n) => add(n.title, n.text)); break;
    case "table": add(...figure.columns); figure.rows.forEach((row) => row.forEach((cell, i) => { if (!figure.mono?.includes(i)) add(cell); })); break;
    case "cards": figure.items.forEach((n) => add(n.term, n.text, n.tag)); break;
    case "compare": figure.sides.forEach((s) => { add(s.title); s.items.forEach((t) => add(t)); }); add(figure.verdict); break;
    case "layers": figure.layers.forEach((n) => add(n.label, n.text)); add(figure.side); break;
    case "network": figure.zones?.forEach((z) => add(z.label)); figure.nodes.forEach((n) => add(n.label, n.sub)); figure.links.forEach((l) => add(l.label)); break;
    case "packet": figure.rows.forEach((r) => { add(r.label); r.fields.forEach((fd) => add(fd.note)); }); break;
    case "anatomy": figure.lines.forEach((line) => line.forEach((s) => add(s.label))); break;
    case "formula": figure.items.forEach((n) => add(n.label)); break;
    case "timeline": figure.events.forEach((n) => add(n.title, n.text)); break;
    case "matrix": add(figure.xLabel, figure.yLabel, ...figure.xs, ...figure.ys); break;
    case "terminal": figure.lines.forEach((l) => { if (l.kind === "note") add(l.text); }); break;
    case "relations": figure.pairs.forEach((p) => add(p.from, p.label, p.to)); break;
  }
  return out;
}

const KIND_LABELS: Record<FigureKind, string> = {
  flow: "Enchaînement", cycle: "Cycle", steps: "Étapes", table: "Tableau", cards: "Fiches", compare: "Comparaison", layers: "Couches", network: "Schéma réseau",
  packet: "Structure d’un paquet", anatomy: "Anatomie", formula: "Calcul", timeline: "Chronologie", matrix: "Matrice", terminal: "Terminal", relations: "Relations",
};
export const figureKindLabel = (kind: FigureKind) => KIND_LABELS[kind];

/** A sentence for screen readers: what the figure is and what it contains. */
export function figureSummary(figure: Figure): string {
  const parts = figureText(figure);
  const head = figure.title ? `${KIND_LABELS[figure.kind]} : ${stripMarkup(figure.title)}` : KIND_LABELS[figure.kind];
  const body = parts.filter((part) => part !== (figure.title ? stripMarkup(figure.title) : "")).join(", ");
  return body ? `${head}. ${body.length > 420 ? `${body.slice(0, 417)}…` : body}` : head;
}

// --- Inline markup --------------------------------------------------------------------------

export interface InlinePart { kind: "text" | "bold" | "code"; value: string }

/** Splits a figure string on **bold** and `code`; the two marks are the only markup. */
export function inlineParts(value: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let cursor = 0;
  for (let match = pattern.exec(value); match; match = pattern.exec(value)) {
    if (match.index > cursor) parts.push({ kind: "text", value: value.slice(cursor, match.index) });
    parts.push(match[1] !== undefined ? { kind: "bold", value: match[1] } : { kind: "code", value: match[2] });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) parts.push({ kind: "text", value: value.slice(cursor) });
  return parts;
}

export { FIGURE_ICONS };
