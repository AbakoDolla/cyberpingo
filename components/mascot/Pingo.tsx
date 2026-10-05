"use client";

import { useId } from "react";

export type PingoState =
  | "welcome"
  | "idle"
  | "thinking"
  | "happy"
  | "sad"
  | "celebrate"
  | "explain"
  | "sleep"
  | "typing"
  | "shy";

type PingoProps = {
  state?: PingoState;
  rank?: number;
  size?: number;
  className?: string;
  title?: string;
};

const CYAN = "#00E5FF";
const ORANGE = "#FF9F1C";

export default function Pingo({ state = "idle", rank = 1, size = 200, className, title }: PingoProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const iris = `pingo-iris-${uid}`;
  const cloth = `pingo-cloth-${uid}`;
  const face = `pingo-face-${uid}`;
  const labelled = Boolean(title);

  return (
    <svg
      className={["pingo", className].filter(Boolean).join(" ")}
      data-state={state}
      width={size}
      height={Math.round(size * 1.2)}
      viewBox="0 0 200 240"
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
    >
      <defs>
        <radialGradient id={iris} cx="42%" cy="34%" r="72%">
          <stop offset="0" stopColor="#5cb2ff" />
          <stop offset=".5" stopColor="#1849c2" />
          <stop offset="1" stopColor="#061233" />
        </radialGradient>
        <linearGradient id={cloth} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#18213b" />
          <stop offset="1" stopColor="#060a16" />
        </linearGradient>
        <linearGradient id={face} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dbe7f7" />
        </linearGradient>
      </defs>

      <ellipse className="pingo__shadow" cx="100" cy="229" rx="50" ry="7" />

      <g className="pingo__rig">
        <g className="pingo__feet">
          <ellipse cx="80" cy="219" rx="16" ry="7" fill={ORANGE} />
          <ellipse cx="120" cy="219" rx="16" ry="7" fill={ORANGE} />
        </g>

        <g className="pingo__body">
          <path
            d="M60 148 C60 132 78 124 100 124 C122 124 140 132 140 148 L145 196 C145 209 127 215 100 215 C73 215 55 209 55 196 Z"
            fill={`url(#${cloth})`}
          />
          <path className="pingo__glow" d="M74 134 L69 205 M126 134 L131 205" stroke={CYAN} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".7" />
          <path className="pingo__glow" d="M58 193 C76 202 124 202 142 193" stroke={CYAN} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity=".55" />
          <g className="pingo__shield">
            <path d="M100 149 L117 155.5 V170 C117 180 109 186.5 100 190.5 C91 186.5 83 180 83 170 V155.5 Z" fill="#071a33" stroke={CYAN} strokeWidth="2" strokeLinejoin="round" />
            <path d="M92.5 169 L98 174.5 L108 163" stroke="#3EFA95" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>

        <g className="pingo__head">
          <g className="pingo__head-bob">
            <path
              d="M100 20 C58 20 38 52 40 90 C41 114 56 130 76 136 L124 136 C144 130 159 114 160 90 C162 52 142 20 100 20 Z"
              fill={`url(#${cloth})`}
            />
            <path className="pingo__glow" d="M50 106 C45 66 68 32 100 32 C132 32 155 66 150 106" stroke={CYAN} strokeWidth="2" strokeLinecap="round" fill="none" opacity=".85" />
            <circle cx="100" cy="86" r="46" fill="#0e1d42" />
            <path d="M95 43 C92 30 99 22 106 26 C101 29 103 34 109 35 C103 38 99 42 95 43 Z" fill="#2b4fb3" />
            <path d="M100 62 C86 46 56 52 56 84 C56 110 77 126 100 126 C123 126 144 110 144 84 C144 52 114 46 100 62 Z" fill={`url(#${face})`} />

            <g className="pingo__brows" stroke="#0a1633" strokeWidth="3.2" strokeLinecap="round" fill="none">
              <path d="M70 72 L91 66" />
              <path d="M130 72 L109 66" />
            </g>

            <g className="pingo__eyes">
              <ellipse cx="82" cy="88" rx="12.5" ry="14.5" fill={`url(#${iris})`} />
              <ellipse cx="118" cy="88" rx="12.5" ry="14.5" fill={`url(#${iris})`} />
              <g className="pingo__pupils">
                <circle cx="82" cy="89" r="6.5" fill="#040a1c" />
                <circle cx="118" cy="89" r="6.5" fill="#040a1c" />
                <circle cx="78" cy="83.5" r="3.6" fill="#fff" />
                <circle cx="114" cy="83.5" r="3.6" fill="#fff" />
                <circle cx="85.5" cy="93" r="1.6" fill="#fff" opacity=".85" />
                <circle cx="121.5" cy="93" r="1.6" fill="#fff" opacity=".85" />
              </g>
            </g>

            {/* Round gold glasses when rank >= 3 */}
            {rank >= 3 && (
              <g className="pingo__glasses" stroke="#e5b95c" strokeWidth="2.2" fill="none">
                <circle cx="82" cy="88" r="16.5" />
                <circle cx="118" cy="88" r="16.5" />
                <path d="M98.5 87 Q100 84.5 101.5 87" />
              </g>
            )}

            <path className="pingo__eyes-happy" d="M70 91 Q82 76 94 91 M106 91 Q118 76 130 91" stroke="#0a1633" strokeWidth="4.2" strokeLinecap="round" fill="none" />
            <path className="pingo__eyes-closed" d="M71 89 Q82 96 93 89 M107 89 Q118 96 129 89" stroke="#0a1633" strokeWidth="3.6" strokeLinecap="round" fill="none" />

            <ellipse cx="66" cy="106" rx="6.5" ry="3.6" fill="#ff7aa8" opacity=".38" />
            <ellipse cx="134" cy="106" rx="6.5" ry="3.6" fill="#ff7aa8" opacity=".38" />
            <path className="pingo__beak" d="M91 104 C95 99.5 105 99.5 109 104 C106 111 103 115 100 116 C97 115 94 111 91 104 Z" fill={ORANGE} />
            <path d="M94 104.5 C97 103 103 103 106 104.5" stroke="#ffd08a" strokeWidth="1.4" strokeLinecap="round" fill="none" />

            {/* Navy bow tie when rank >= 5 */}
            {rank >= 5 && (
              <g className="pingo__bowtie" fill="#0d204d" stroke="#2563eb" strokeWidth="1">
                <circle cx="100" cy="136" r="4.5" />
                <polygon points="100,136 84,129 84,143" />
                <polygon points="100,136 116,129 116,143" />
              </g>
            )}
          </g>
        </g>

        <path
          className="pingo__arm pingo__arm--left"
          d="M64 140 C48 148 41 170 45 194 C52 191 60 177 66 160 Z"
          fill={`url(#${cloth})`}
          stroke={CYAN}
          strokeOpacity=".4"
          strokeWidth="1.2"
        />
        <path
          className="pingo__arm pingo__arm--right"
          d="M136 140 C152 148 159 170 155 194 C148 191 140 177 134 160 Z"
          fill={`url(#${cloth})`}
          stroke={CYAN}
          strokeOpacity=".4"
          strokeWidth="1.2"
        />

        {/* Tweed elbow patches when rank >= 7 */}
        {rank >= 7 && (
          <g className="pingo__patches" fill="#5c4033" opacity="0.9">
            <ellipse cx="48" cy="172" rx="6" ry="10" transform="rotate(-15 48 172)" />
            <ellipse cx="152" cy="172" rx="6" ry="10" transform="rotate(15 152 172)" />
          </g>
        )}
      </g>

      <g className="pingo__fx pingo__fx--stars" fill="#FFD166">
        <path d="M34 54 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" />
        <path d="M168 40 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 Z" fill={CYAN} />
        <path d="M172 112 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2 Z" fill="#3EFA95" />
      </g>
      <text className="pingo__fx pingo__fx--question" x="156" y="46">?</text>
      <g className="pingo__fx pingo__fx--zzz">
        <text x="148" y="50">z</text>
        <text x="160" y="34">z</text>
      </g>
    </svg>
  );
}
