import { Fragment, type CSSProperties } from "react";
import { inlineParts, type Tone } from "@/lib/figure-spec";

const TONE_RGB: Record<Tone, string> = {
  cyan: "0 213 255",
  blue: "86 150 255",
  violet: "172 126 255",
  green: "62 250 149",
  amber: "255 184 107",
  red: "255 107 125",
  neutral: "150 172 204",
};

/** The default colour walk of a sequence: cool tones first, so a plain figure already looks designed. */
export const WALK: readonly Tone[] = ["cyan", "blue", "violet", "green", "amber"];

export const walkTone = (index: number): Tone => WALK[index % WALK.length];

export function toneStyle(tone: Tone | undefined, fallback: Tone = "cyan", index?: number): CSSProperties {
  const chosen = tone ?? (index === undefined ? fallback : walkTone(index));
  const style: Record<string, string | number> = { "--t": TONE_RGB[chosen] };
  if (index !== undefined) style["--i"] = index;
  return style as CSSProperties;
}

/** A long unbroken name (a domain, a path) may break after its separators instead of in the middle of a word. */
function Breakable({ value }: { value: string }) {
  if (!/[^\s./_:@-]{6}/.test(value) || value.length < 16) return <>{value}</>;
  const pieces = value.split(/(?<=[./_:@-])(?=[A-Za-z0-9])/);
  if (pieces.length < 2) return <>{value}</>;
  return <>{pieces.map((piece, index) => <Fragment key={index}>{index > 0 && <wbr />}{piece}</Fragment>)}</>;
}

/** Renders a figure string: **bold** and `code` are the only marks. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((part, index) =>
        part.kind === "bold" ? <strong key={index}><Breakable value={part.value} /></strong> : part.kind === "code" ? <code key={index}>{part.value}</code> : <Fragment key={index}><Breakable value={part.value} /></Fragment>,
      )}
    </>
  );
}

export function ArrowGlyph({ className = "" }: { className?: string }) {
  return (
    <svg className={`fg-arrow-glyph ${className}`.trim()} viewBox="0 0 36 16" aria-hidden="true" focusable="false">
      <path d="M2 8h28M23 2l8 6-8 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="m4.5 10.5 3.6 3.6 7.4-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CrossGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <path d="m5.5 5.5 9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function DotGlyph() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="3.6" fill="currentColor" />
    </svg>
  );
}
