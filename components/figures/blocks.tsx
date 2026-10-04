import type { ReactElement } from "react";
import type { CardsFigure, CompareFigure, FormulaFigure, LayersFigure, MatrixFigure } from "@/lib/figure-spec";
import { FigureGlyph } from "./icons";
import { CheckGlyph, CrossGlyph, DotGlyph, Inline, toneStyle } from "./parts";

export function Cards({ figure }: { figure: CardsFigure }) {
  return (
    <div className="fg-cards" data-columns={figure.columns ?? (figure.items.length === 4 ? 2 : 3)}>
      {figure.items.map((item, index) => (
        <article key={index} className="fg-card fg-reveal" style={toneStyle(item.tone, "cyan", index)}>
          <header>
            {item.icon && <span className="fg-chip"><FigureGlyph name={item.icon} size={20} /></span>}
            <strong><Inline text={item.term} /></strong>
            {item.tag && <span className="fg-tag">{item.tag}</span>}
          </header>
          <p><Inline text={item.text} /></p>
        </article>
      ))}
    </div>
  );
}

const MARKS = { check: CheckGlyph, cross: CrossGlyph, dot: DotGlyph };

export function Compare({ figure }: { figure: CompareFigure }) {
  return (
    <>
      <div className="fg-compare" data-count={figure.sides.length}>
        {figure.sides.map((side, index) => {
          const tone = side.tone ?? (index === 0 ? "green" : index === 1 ? "red" : "blue");
          const Mark = MARKS[side.mark ?? (tone === "green" ? "check" : tone === "red" ? "cross" : "dot")];
          return (
            <section key={index} className="fg-side fg-reveal" style={toneStyle(tone, "cyan", index)}>
              <h4>{side.icon && <FigureGlyph name={side.icon} size={18} />}<span><Inline text={side.title} /></span></h4>
              <ul>
                {side.items.map((item, itemIndex) => (
                  <li key={itemIndex}><span className="fg-mark"><Mark /></span><span><Inline text={item} /></span></li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      {figure.verdict && <p className="fg-verdict fg-reveal" style={toneStyle("cyan")}><FigureGlyph name="bulb" size={18} /><span><Inline text={figure.verdict} /></span></p>}
    </>
  );
}

export function Layers({ figure }: { figure: LayersFigure }) {
  if (figure.nested) {
    const render = (index: number): ReactElement => {
      const layer = figure.layers[index];
      return (
        <div className="fg-ring" style={toneStyle(layer.tone, "cyan", index)}>
          <div className="fg-ring__head">
            {layer.icon && <FigureGlyph name={layer.icon} size={16} />}
            <strong><Inline text={layer.label} /></strong>
            {layer.text && <small><Inline text={layer.text} /></small>}
          </div>
          {index < figure.layers.length - 1 && render(index + 1)}
        </div>
      );
    };
    return <div className="fg-rings fg-reveal">{render(0)}</div>;
  }
  return (
    <div className="fg-layers">
      <ol className="fg-layers__stack">
        {figure.layers.map((layer, index) => (
          <li key={index} className="fg-layer fg-reveal" style={toneStyle(layer.tone, "cyan", index)}>
            {layer.icon && <span className="fg-chip"><FigureGlyph name={layer.icon} size={20} /></span>}
            <strong><Inline text={layer.label} /></strong>
            {layer.text && <small><Inline text={layer.text} /></small>}
          </li>
        ))}
      </ol>
      {figure.side && <p className="fg-layers__side" aria-hidden="true"><span>{figure.side}</span></p>}
    </div>
  );
}

export function Formula({ figure }: { figure: FormulaFigure }) {
  return (
    <div className="fg-formulas">
      {figure.items.map((item, index) => (
        <article key={index} className="fg-formula fg-reveal" style={toneStyle(item.tone, "cyan", index)}>
          <p className="fg-formula__label"><Inline text={item.label} /></p>
          <p className="fg-formula__expr">{item.formula}</p>
          {item.example && <pre className="fg-formula__example">{item.example}</pre>}
          {item.result && <p className="fg-formula__result">{item.result}</p>}
        </article>
      ))}
    </div>
  );
}

export function Matrix({ figure }: { figure: MatrixFigure }) {
  return (
    <div className="fg-matrix-wrap">
      <div className="fg-matrix" style={{ ["--cols" as string]: figure.xs.length }}>
        <p className="fg-matrix__y-title" aria-hidden="true"><span>{figure.yLabel}</span></p>
        <div className="fg-matrix__grid">
          {figure.ys.map((y, row) => (
            <div key={y} className="fg-matrix__row" role="row">
              <span className="fg-matrix__y" role="rowheader">{y}</span>
              {figure.cells[row].map((cell, col) => (
                <span key={col} className="fg-matrix__cell fg-reveal" role="cell" style={toneStyle(cell.tone, "neutral", row + col)}>{cell.text}</span>
              ))}
            </div>
          ))}
          <div className="fg-matrix__row fg-matrix__row--x" role="row">
            <span className="fg-matrix__y" aria-hidden="true" />
            {figure.xs.map((x) => <span key={x} className="fg-matrix__x" role="columnheader">{x}</span>)}
          </div>
        </div>
        <p className="fg-matrix__x-title"><span>{figure.xLabel}</span></p>
      </div>
    </div>
  );
}
