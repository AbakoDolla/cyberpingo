import { Fragment } from "react";
import type { CycleFigure, FlowFigure, RelationsFigure, StepsFigure, TimelineFigure } from "@/lib/figure-spec";
import { FigureGlyph } from "./icons";
import { ArrowGlyph, Inline, toneStyle } from "./parts";

export function Flow({ figure }: { figure: FlowFigure }) {
  const last = figure.nodes.length - 1;
  return (
    <>
      <div className="fg-flow" role="list" data-count={figure.nodes.length}>
        {figure.nodes.map((node, index) => (
          <Fragment key={index}>
            <div className="fg-node fg-reveal" role="listitem" style={toneStyle(node.tone, "cyan", index)}>
              {node.icon && <span className="fg-chip"><FigureGlyph name={node.icon} size={22} /></span>}
              <strong><Inline text={node.label} /></strong>
              {node.text && <small><Inline text={node.text} /></small>}
            </div>
            {index < last && <span className="fg-link fg-reveal" style={toneStyle(figure.nodes[index + 1].tone, "cyan", index + 1)} aria-hidden="true"><ArrowGlyph /></span>}
          </Fragment>
        ))}
      </div>
      {figure.loop && (
        <p className="fg-loop fg-reveal" style={{ ...toneStyle("violet"), ["--i" as string]: figure.nodes.length }}>
          <FigureGlyph name="refresh" size={16} />
          <span><Inline text={figure.loop} /></span>
        </p>
      )}
    </>
  );
}

const RING = 36;

/** A cycle drawn on a ring; below 560 px the same nodes become a list with a loop mark. */
export function Cycle({ figure }: { figure: CycleFigure }) {
  const count = figure.nodes.length;
  const angle = (index: number) => (-90 + (index * 360) / count) * (Math.PI / 180);
  const point = (index: number, radius = RING) => ({ x: 50 + radius * Math.cos(angle(index)), y: 50 + radius * Math.sin(angle(index)) });
  const gap = count > 6 ? 17 : 21;
  const arcs = figure.nodes.map((_, index) => {
    const start = angle(index) + (gap * Math.PI) / 180;
    const end = angle(index + 1) - (gap * Math.PI) / 180;
    const from = { x: 50 + RING * Math.cos(start), y: 50 + RING * Math.sin(start) };
    const to = { x: 50 + RING * Math.cos(end), y: 50 + RING * Math.sin(end) };
    const tangent = end + Math.PI / 2;
    const head = [
      [to.x, to.y],
      [to.x - 2.8 * Math.cos(tangent) + 1.7 * Math.cos(end), to.y - 2.8 * Math.sin(tangent) + 1.7 * Math.sin(end)],
      [to.x - 2.8 * Math.cos(tangent) - 1.7 * Math.cos(end), to.y - 2.8 * Math.sin(tangent) - 1.7 * Math.sin(end)],
    ];
    return { from, to, head: head.map((p) => p.join(",")).join(" "), index };
  });
  return (
    <>
      <div className="fg-cycle" data-count={count}>
        <svg className="fg-cycle__ring" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <circle cx="50" cy="50" r={RING} className="fg-cycle__track" />
          {arcs.map((arc) => (
            <g key={arc.index} style={toneStyle(figure.nodes[arc.index].tone, "cyan", arc.index)}>
              <path className="fg-cycle__arc" d={`M${arc.from.x} ${arc.from.y} A${RING} ${RING} 0 0 1 ${arc.to.x} ${arc.to.y}`} />
              <polygon className="fg-cycle__head" points={arc.head} />
            </g>
          ))}
        </svg>
        {figure.center && <p className="fg-cycle__center"><Inline text={figure.center} /></p>}
        {figure.nodes.map((node, index) => {
          const position = point(index);
          return (
            <div key={index} className="fg-cycle__node fg-reveal" style={{ ...toneStyle(node.tone, "cyan", index), left: `${position.x}%`, top: `${position.y}%` }}>
              <span className="fg-cycle__num">{index + 1}</span>
              <strong><Inline text={node.label} /></strong>
              {node.text && <small><Inline text={node.text} /></small>}
            </div>
          );
        })}
      </div>
      <ol className="fg-cycle-list">
        {figure.nodes.map((node, index) => (
          <li key={index} className="fg-reveal" style={toneStyle(node.tone, "cyan", index)}>
            <span className="fg-cycle__num">{index + 1}</span>
            <div><strong><Inline text={node.label} /></strong>{node.text && <small><Inline text={node.text} /></small>}</div>
          </li>
        ))}
        <li className="fg-cycle-list__back" aria-hidden="true"><FigureGlyph name="refresh" size={16} /><span>Puis on recommence à l’étape 1</span></li>
      </ol>
    </>
  );
}

export function Steps({ figure }: { figure: StepsFigure }) {
  const numbered = figure.numbered !== false;
  return (
    <ol className="fg-steps">
      {figure.items.map((item, index) => (
        <li key={index} className="fg-step fg-reveal" style={toneStyle(item.tone, "cyan", index)}>
          <span className="fg-step__badge">{numbered || !item.icon ? index + 1 : <FigureGlyph name={item.icon} size={18} />}</span>
          <div className="fg-step__body">
            <strong>{numbered && item.icon && <FigureGlyph name={item.icon} size={16} />}<span><Inline text={item.title} /></span></strong>
            {item.text && <p><Inline text={item.text} /></p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Timeline({ figure }: { figure: TimelineFigure }) {
  return (
    <ol className="fg-timeline">
      {figure.events.map((event, index) => (
        <li key={index} className="fg-event fg-reveal" style={toneStyle(event.tone, "cyan", index)}>
          <time className="fg-event__at">{event.at}</time>
          <span className="fg-event__dot" aria-hidden="true">{event.icon && <FigureGlyph name={event.icon} size={14} />}</span>
          <div className="fg-event__body">
            <strong><Inline text={event.title} /></strong>
            {event.text && <p><Inline text={event.text} /></p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Relations({ figure }: { figure: RelationsFigure }) {
  return (
    <ul className="fg-rel">
      {figure.pairs.map((pair, index) => (
        <li key={index} className="fg-rel__row fg-reveal" style={toneStyle(pair.tone, "cyan", index)}>
          <span className="fg-rel__from">
            {pair.icon && <FigureGlyph name={pair.icon} size={18} />}
            <Inline text={pair.from} />
          </span>
          <span className="fg-rel__via" aria-hidden="true">
            {pair.label && <small>{pair.label}</small>}
            <ArrowGlyph />
          </span>
          <span className="fg-rel__to"><Inline text={pair.to} /></span>
        </li>
      ))}
    </ul>
  );
}
