import { Fragment } from "react";
import type { AnatomyFigure, PacketFigure, TableFigure, TerminalFigure } from "@/lib/figure-spec";
import { FigureGlyph } from "./icons";
import { Inline, toneStyle } from "./parts";

/** Few columns and sentences in the cells read better as cards on a phone; many short cells (a capture, a list of ports) stay a table. */
export function tableLayout(figure: TableFigure): "stack" | "scroll" {
  const cells = figure.rows.flat();
  const average = cells.reduce((sum, cell) => sum + cell.length, 0) / Math.max(1, cells.length);
  return figure.rows.length <= 8 && (figure.columns.length <= 3 || average > 30) ? "stack" : "scroll";
}

export function Table({ figure }: { figure: TableFigure }) {
  return (
    <div className="fg-table-wrap" data-layout={tableLayout(figure)}>
      <table className="fg-table">
        <thead>
          <tr>{figure.columns.map((column, index) => <th key={index} scope="col" data-highlight={figure.highlight === index || undefined}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {figure.rows.map((row, r) => (
            <tr key={r} className="fg-reveal" style={toneStyle(figure.rowTones?.[r] ?? undefined, "neutral", r)} data-tone={figure.rowTones?.[r] ?? undefined}>
              {row.map((cell, c) => {
                const Tag = c === 0 ? "th" : "td";
                return (
                  <Tag key={c} scope={c === 0 ? "row" : undefined} data-label={figure.columns[c]} data-mono={figure.mono?.includes(c) || undefined} data-highlight={figure.highlight === c || undefined}>
                    {figure.mono?.includes(c) ? <code>{cell}</code> : <Inline text={cell} />}
                  </Tag>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Terminal({ figure }: { figure: TerminalFigure }) {
  const prompt = figure.prompt ?? "$";
  return (
    <div className="fg-term">
      <div className="fg-term__bar" aria-hidden="true"><i /><i /><i /><span>terminal</span></div>
      <pre className="fg-term__body"><code>
        {figure.lines.map((line, index) => (
          <Fragment key={index}>
            {line.kind === "cmd" && <span className="fg-term__line fg-term__line--cmd"><span className="fg-term__prompt">{prompt}</span> {line.text}{"\n"}</span>}
            {line.kind === "out" && <span className="fg-term__line fg-term__line--out">{line.text}{"\n"}</span>}
            {line.kind === "note" && <span className="fg-term__line fg-term__line--note">↳ {line.text}{"\n"}</span>}
          </Fragment>
        ))}
      </code></pre>
    </div>
  );
}

export function Anatomy({ figure }: { figure: AnatomyFigure }) {
  return (
    <div className="fg-anatomy">
      {figure.lines.map((line, row) => (
        <div key={row} className="fg-anatomy__line" role="group">
          {line.map((segment, index) => (
            <span key={index} className="fg-seg fg-reveal" style={toneStyle(segment.tone, "cyan", row * 4 + index)} data-plain={!segment.label || undefined}>
              <code>{segment.text}</code>
              {segment.label && (<><i aria-hidden="true" /><small>{segment.label}</small></>)}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Packet({ figure }: { figure: PacketFigure }) {
  return (
    <div className="fg-packets">
      {figure.rows.map((row, r) => (
        <Fragment key={r}>
          <div className="fg-packet fg-reveal" style={{ ["--i" as string]: r }}>
            {row.label && <p className="fg-packet__label"><FigureGlyph name="package" size={14} /><span>{row.label}</span></p>}
            <div className="fg-packet__bar">
              {row.fields.map((field, index) => (
                <div key={index} className="fg-field" style={{ ...toneStyle(field.tone, "cyan", r + index), flexGrow: field.weight ?? 1 }}>
                  <strong>{field.name}</strong>
                  {field.size && <code>{field.size}</code>}
                  {field.note && <small>{field.note}</small>}
                </div>
              ))}
            </div>
          </div>
          {r < figure.rows.length - 1 && <p className="fg-packet__into" aria-hidden="true"><span>contient</span></p>}
        </Fragment>
      ))}
    </div>
  );
}
