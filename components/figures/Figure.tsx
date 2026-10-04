"use client";

import { useEffect, useRef, useState } from "react";
import { figureKindLabel, figureSummary, type Figure } from "@/lib/figure-spec";
import { Cards, Compare, Formula, Layers, Matrix } from "./blocks";
import { Anatomy, Packet, Table, Terminal } from "./data";
import { FigureGlyph } from "./icons";
import { Network } from "./network";
import { Inline } from "./parts";
import { Cycle, Flow, Relations, Steps, Timeline } from "./sequences";
import type { FigureIcon } from "@/lib/figure-icons";

const KIND_ICON: Record<Figure["kind"], FigureIcon> = {
  flow: "route", cycle: "refresh", steps: "list", table: "layers", cards: "bookmark", compare: "scale", layers: "layers", network: "network", packet: "package",
  anatomy: "scan", formula: "binary", timeline: "clock", matrix: "target", terminal: "terminal", relations: "link",
};

function Body({ figure }: { figure: Figure }) {
  switch (figure.kind) {
    case "flow": return <Flow figure={figure} />;
    case "cycle": return <Cycle figure={figure} />;
    case "steps": return <Steps figure={figure} />;
    case "table": return <Table figure={figure} />;
    case "cards": return <Cards figure={figure} />;
    case "compare": return <Compare figure={figure} />;
    case "layers": return <Layers figure={figure} />;
    case "network": return <Network figure={figure} />;
    case "packet": return <Packet figure={figure} />;
    case "anatomy": return <Anatomy figure={figure} />;
    case "formula": return <Formula figure={figure} />;
    case "timeline": return <Timeline figure={figure} />;
    case "matrix": return <Matrix figure={figure} />;
    case "terminal": return <Terminal figure={figure} />;
    case "relations": return <Relations figure={figure} />;
  }
}

/**
 * One diagram of a lesson. It is plain HTML and SVG, so it is crisp on every screen, readable by a screen reader and
 * printable; the elements rise into place the first time the figure scrolls into view (never when motion is reduced).
 */
export default function FigureView({ figure }: { figure: Figure }) {
  const frame = useRef<HTMLElement | null>(null);
  const [phase, setPhase] = useState<"idle" | "waiting" | "shown">("idle");

  useEffect(() => {
    const element = frame.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    if (element.getBoundingClientRect().top < window.innerHeight * 0.9) { setPhase("shown"); return undefined; }
    setPhase("waiting");
    const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) { setPhase("shown"); observer.disconnect(); } }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <figure ref={frame} className={`fg fg--${figure.kind}`} data-phase={phase} data-figure={figure.kind} aria-label={figure.kind === "network" ? undefined : figureSummary(figure)}>
      <header className="fg__head">
        <span className="fg__badge"><FigureGlyph name={KIND_ICON[figure.kind]} size={15} /><span>{figureKindLabel(figure.kind)}</span></span>
        {figure.title && <h3 className="fg__title"><Inline text={figure.title} /></h3>}
      </header>
      <div className="fg__body"><Body figure={figure} /></div>
      {figure.caption && <figcaption className="fg__caption"><Inline text={figure.caption} /></figcaption>}
    </figure>
  );
}
