import type { SVGProps } from "react";

interface CoinIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  glow?: boolean;
}

export default function CoinIcon({ size = 20, className = "", glow = false, ...props }: CoinIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`cb-coin-icon ${glow ? "cb-coin-icon--glow" : ""} ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <defs>
        <linearGradient id="cb-coin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d5ff" />
          <stop offset="50%" stopColor="#1765f5" />
          <stop offset="100%" stopColor="#9a64ff" />
        </linearGradient>
        <linearGradient id="cb-coin-rim" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#75ddff" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      {/* Outer Coin Disc */}
      <circle cx="12" cy="12" r="10" fill="#040f24" stroke="url(#cb-coin-grad)" strokeWidth="1.8" />
      {/* Inner Rim */}
      <circle cx="12" cy="12" r="8" fill="none" stroke="url(#cb-coin-rim)" strokeWidth="0.75" strokeDasharray="1.5 1" opacity="0.8" />
      {/* CyberBits Icon mark: C & B merged circuit */}
      <path
        d="M9.5 8h2a2 2 0 0 1 1.8 1.1M9.5 12h3a2 2 0 0 1 0 4h-3V8z"
        fill="none"
        stroke="#e0f7ff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="12" r="1" fill="#00d5ff" />
      <circle cx="15.5" cy="10" r="0.75" fill="#3efa95" />
    </svg>
  );
}
