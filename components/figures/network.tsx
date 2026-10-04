import { useId } from "react";
import type { NetworkFigure, NetworkLink, NetworkNode, Tone } from "@/lib/figure-spec";
import { FigureGlyph } from "./icons";
import { toneStyle } from "./parts";

const NW = 140;
const NH = 104;
const PAD = 14;
const ROW = 148;
const MAX_GAP = 330;

interface Point { x: number; y: number }

/** The columns of a figure: where their centres are, so that a link carrying a label gets the room its label needs. */
interface Layout {
  width: number;
  height: number;
  /** x of a column (half columns such as 1.5 are in between). */
  x: (col: number) => number;
  /** x of the left edge of column `col` (0 to cols): the edges of the tinted zones. */
  edge: (col: number) => number;
}

const pillWidth = (label: string) => Math.max(40, label.length * 6.9 + 20);

function layoutFor(figure: NetworkFigure): Layout {
  const base = Math.max(176, Math.min(252, Math.floor(840 / figure.cols)));
  const gaps = Array.from({ length: Math.max(0, figure.cols - 1) }, () => base);
  const centres = () => gaps.reduce<number[]>((all, gap) => [...all, all[all.length - 1] + gap], [base / 2]);
  const at = (list: number[], col: number) => {
    const i = Math.min(Math.floor(col), list.length - 1);
    const next = list[i + 1] ?? list[i];
    return list[i] + (col - i) * (next - list[i]);
  };
  const byId = new Map(figure.nodes.map((node) => [node.id, node] as const));
  for (const link of figure.links) {
    const a = byId.get(link.from);
    const b = byId.get(link.to);
    if (!link.label || !a || !b || a.col === b.col) continue;
    const lo = Math.min(a.col, b.col);
    const hi = Math.max(a.col, b.col);
    const need = pillWidth(link.label) + 30 + NW;
    const list = centres();
    const have = at(list, hi) - at(list, lo);
    if (have >= need) continue;
    const first = Math.floor(lo);
    const last = Math.ceil(hi);
    const extra = (need - have) / (last - first);
    for (let g = first; g < last; g += 1) gaps[g] = Math.min(MAX_GAP, gaps[g] + extra);
  }
  const list = centres();
  const edges = [list[0] - base / 2, ...list.slice(1).map((value, i) => (list[i] + value) / 2), list[list.length - 1] + base / 2];
  return {
    width: edges[edges.length - 1],
    height: figure.rows * ROW,
    x: (col) => at(list, col),
    edge: (col) => edges[Math.max(0, Math.min(edges.length - 1, col))],
  };
}

const centerOf = (node: NetworkNode, layout: Layout): Point => ({ x: layout.x(node.col), y: node.row * ROW + ROW / 2 });

/** Where the line from `from` to `to` leaves the card around `from`. */
function edgeOf(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const halfW = NW / 2 + 4;
  const halfH = NH / 2 + 4;
  const t = Math.min(dx === 0 ? Infinity : halfW / Math.abs(dx), dy === 0 ? Infinity : halfH / Math.abs(dy));
  return { x: from.x + dx * t, y: from.y + dy * t };
}

/** Breaks a label on spaces so each line fits the card. */
export function wrapLabel(text: string, limit: number, maxLines: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && `${current} ${word}`.length > limit) { lines.push(current); current = word; } else current = current ? `${current} ${word}` : word;
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) { const rest = lines.splice(maxLines - 1).join(" "); lines.push(rest); }
  return lines;
}

function Arrowhead({ at, from, tone, size }: { at: Point; from: Point; tone: Tone; size: number }) {
  const length = Math.hypot(at.x - from.x, at.y - from.y) || 1;
  const ux = (at.x - from.x) / length;
  const uy = (at.y - from.y) / length;
  const points = [
    [at.x, at.y],
    [at.x - size * ux + size * 0.55 * uy, at.y - size * uy - size * 0.55 * ux],
    [at.x - size * ux - size * 0.55 * uy, at.y - size * uy + size * 0.55 * ux],
  ].map((p) => p.join(",")).join(" ");
  return <polygon className="fg-net__head" points={points} style={toneStyle(tone)} />;
}

function Link({ link, nodes, layout }: { link: NetworkLink; nodes: Map<string, NetworkNode>; layout: Layout }) {
  const a = nodes.get(link.from);
  const b = nodes.get(link.to);
  if (!a || !b) return null;
  const ca = centerOf(a, layout);
  const cb = centerOf(b, layout);
  const start = edgeOf(ca, cb);
  const end = edgeOf(cb, ca);
  const style = link.style ?? "solid";
  const tone = link.tone ?? (style === "wireless" ? "violet" : "cyan");
  const arrow = link.arrow ?? "none";
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const labelWidth = link.label ? pillWidth(link.label) : 0;
  return (
    <g style={toneStyle(tone)} className={`fg-net__link fg-net__link--${style}`}>
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
      {(arrow === "to" || arrow === "both") && <Arrowhead at={end} from={start} tone={tone} size={style === "thick" ? 17 : 12} />}
      {arrow === "both" && <Arrowhead at={start} from={end} tone={tone} size={style === "thick" ? 17 : 12} />}
      {link.label ? (
        <g transform={`translate(${mid.x} ${mid.y})`}>
          <rect className="fg-net__pill" x={-labelWidth / 2} y={-11} width={labelWidth} height={22} rx={11} />
          <text className="fg-net__pill-text" textAnchor="middle" dy="4">{link.label}</text>
        </g>
      ) : style === "wireless" ? (
        <g transform={`translate(${mid.x} ${mid.y})`}>
          <circle className="fg-net__pill" r={13} />
          <path className="fg-net__wifi" d="M-7 -1.5a10 10 0 0 1 14 0M-4.2 1.8a6 6 0 0 1 8.4 0" />
          <circle className="fg-net__wifi-dot" cy={6} r={1.4} />
        </g>
      ) : null}
    </g>
  );
}

export function Network({ figure }: { figure: NetworkFigure }) {
  const uid = useId();
  const layout = layoutFor(figure);
  const nodes = new Map(figure.nodes.map((node) => [node.id, node] as const));
  return (
    <>
      <div className="fg-net-wrap" tabIndex={0} role="group" aria-label="Schéma réseau, défile pour voir la suite">
        <svg className="fg-net" viewBox={`0 -${PAD} ${layout.width} ${layout.height + PAD}`} width={layout.width} role="img" aria-labelledby={`${uid}-t`}>
          <title id={`${uid}-t`}>{figure.title ?? "Schéma réseau"}</title>
          {figure.zones?.map((zone, index) => {
            const left = layout.edge(zone.col);
            const right = layout.edge(zone.col + zone.w);
            return (
              <g key={index} style={toneStyle(zone.tone, "blue", index)} className="fg-net__zone">
                <rect className="fg-net__zone-box" x={left + 5} y={zone.row * ROW + 5} width={right - left - 10} height={zone.h * ROW - 10} rx={24} />
                <rect className="fg-net__zone-tab" x={left + 20} y={zone.row * ROW - 5} width={zone.label.length * 7.6 + 24} height={22} rx={11} />
                <text x={left + 32} y={zone.row * ROW + 10.5}>{zone.label}</text>
              </g>
            );
          })}
          {figure.links.map((link, index) => <Link key={index} link={link} nodes={nodes} layout={layout} />)}
          {figure.nodes.map((node, index) => {
            const c = centerOf(node, layout);
            const labelLines = wrapLabel(node.label, 17, 2);
            const subLines = node.sub ? wrapLabel(node.sub, 22, 2) : [];
            const labelY = 58;
            const subY = labelY + (labelLines.length - 1) * 15 + 17;
            return (
              <g key={node.id} className="fg-net__node" style={toneStyle(node.tone, "cyan", index)} transform={`translate(${c.x - NW / 2} ${c.y - NH / 2})`}>
                <rect className="fg-net__card" width={NW} height={NH} rx={18} />
                <g className="fg-net__icon" transform={`translate(${NW / 2 - 13} 13)`}><FigureGlyph name={node.icon} size={26} /></g>
                <text className="fg-net__label" x={NW / 2} y={labelY} textAnchor="middle">
                  {labelLines.map((line, i) => <tspan key={i} x={NW / 2} dy={i === 0 ? 0 : 15}>{line}</tspan>)}
                </text>
                {subLines.length > 0 && (
                  <text className="fg-net__sub" x={NW / 2} y={subY} textAnchor="middle">
                    {subLines.map((line, i) => <tspan key={i} x={NW / 2} dy={i === 0 ? 0 : 13}>{line}</tspan>)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="fg-net-hint" aria-hidden="true">Fais glisser le schéma pour le voir en entier</p>
    </>
  );
}
