"use client";

import React from "react";
import { getPlatformLevel, getTierColor, localizeRankTitle } from "@/lib/levels";
import { useTranslation } from "@/lib/i18n";

interface RankBadgeProps {
  level: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  showTierBadge?: boolean;
  className?: string;
  lang?: "fr" | "en";
}

export function RankBadge({
  level,
  size = "md",
  showLabel = false,
  showTierBadge = false,
  className = "",
  lang: forcedLang,
}: RankBadgeProps) {
  const { lang } = useTranslation();
  const currentLang = forcedLang || lang;
  const levelData = getPlatformLevel(level);
  const tierColor = getTierColor(levelData.tier);
  const localizedTitle = localizeRankTitle(levelData.level, currentLang);

  const sizeDimensions = {
    xs: { width: 24, height: 24, text: "text-[10px]", pad: "p-0.5", iconSize: 14 },
    sm: { width: 36, height: 36, text: "text-xs", pad: "p-1", iconSize: 20 },
    md: { width: 56, height: 56, text: "text-sm", pad: "p-1.5", iconSize: 32 },
    lg: { width: 84, height: 84, text: "text-base", pad: "p-2", iconSize: 48 },
    xl: { width: 120, height: 120, text: "text-lg", pad: "p-3", iconSize: 68 },
  }[size];

  // SVG Insignia based on Tier
  const renderInsigniaSvg = () => {
    const s = sizeDimensions.width;
    const center = s / 2;

    switch (levelData.tier) {
      case "scout":
        // Neon Emerald Cadet Shield
        return (
          <svg width={s} height={s} viewBox="0 0 100 100" className="overflow-visible">
            <defs>
              <linearGradient id={`grad-scout-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
              <filter id={`glow-scout-${level}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Outer Hexagon Shield */}
            <polygon
              points="50,6 88,24 88,72 50,94 12,72 12,24"
              fill="rgba(16, 185, 129, 0.12)"
              stroke={`url(#grad-scout-${level})`}
              strokeWidth="3"
              strokeDasharray="6 3"
              className="animate-pulse"
            />
            {/* Inner Shield */}
            <polygon
              points="50,14 80,29 80,68 50,86 20,68 20,29"
              fill={`url(#grad-scout-${level})`}
              fillOpacity="0.2"
              stroke="#10b981"
              strokeWidth="2"
            />
            {/* Sprout / Digital Seedling */}
            <path
              d="M50,70 L50,42 M50,42 C50,30 38,32 36,44 C42,46 48,46 50,42 Z M50,48 C50,36 62,38 64,50 C58,52 52,52 50,48 Z"
              fill="#34d399"
              stroke="#6ee7b7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#glow-scout-${level})`}
            />
            {/* Level Rank Number */}
            <circle cx="50" cy="74" r="9" fill="#064e3b" stroke="#34d399" strokeWidth="1.5" />
            <text x="50" y="78" textAnchor="middle" fill="#a7f3d0" fontSize="10" fontWeight="900" fontFamily="monospace">
              {level}
            </text>
          </svg>
        );

      case "watcher":
        // Cyan Cyber-Shield with Digital Sentinel Eye (Veilleur / Apprenti)
        return (
          <svg width={s} height={s} viewBox="0 0 100 100" className="overflow-visible">
            <defs>
              <linearGradient id={`grad-watcher-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <filter id={`glow-watcher-${level}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Aegis Crest */}
            <path
              d="M50,4 L88,18 C88,60 50,92 50,96 C50,92 12,60 12,18 Z"
              fill="rgba(14, 165, 233, 0.15)"
              stroke={`url(#grad-watcher-${level})`}
              strokeWidth="3.5"
            />
            {/* Inner Cyber Matrix */}
            <path
              d="M50,14 L78,25 C78,56 50,80 50,83 C50,80 22,56 22,25 Z"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            {/* All-Seeing Sentinel Cyber Eye */}
            <path
              d="M28,46 C36,34 64,34 72,46 C64,58 36,58 28,46 Z"
              fill="rgba(56, 189, 248, 0.3)"
              stroke="#38bdf8"
              strokeWidth="2.5"
              filter={`url(#glow-watcher-${level})`}
            />
            <circle cx="50" cy="46" r="6" fill="#0369a1" stroke="#bae6fd" strokeWidth="2" />
            <circle cx="50" cy="46" r="2.5" fill="#f0f9ff" />
            {/* Badge level indicator */}
            <circle cx="50" cy="74" r="9" fill="#082f49" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="50" y="78" textAnchor="middle" fill="#bae6fd" fontSize="10" fontWeight="900" fontFamily="monospace">
              {level}
            </text>
          </svg>
        );

      case "guardian":
        // Indigo Bastion Shield & Firewall Grid
        return (
          <svg width={s} height={s} viewBox="0 0 100 100" className="overflow-visible">
            <defs>
              <linearGradient id={`grad-guardian-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
            </defs>
            <polygon
              points="50,4 88,18 88,64 50,96 12,64 12,18"
              fill="rgba(99, 102, 241, 0.15)"
              stroke={`url(#grad-guardian-${level})`}
              strokeWidth="3.5"
            />
            <rect x="36" y="38" width="28" height="24" rx="3" fill="#312e81" stroke="#a5b4fc" strokeWidth="2" />
            <path d="M42,38 L42,30 C42,25 58,25 58,30 L58,38" fill="none" stroke="#a5b4fc" strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="50" r="3" fill="#e0e7ff" />
            <circle cx="50" cy="76" r="9" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
            <text x="50" y="80" textAnchor="middle" fill="#c7d2fe" fontSize="10" fontWeight="900" fontFamily="monospace">
              {level}
            </text>
          </svg>
        );

      case "defender":
        // Purple Quantum Bastion Core
        return (
          <svg width={s} height={s} viewBox="0 0 100 100" className="overflow-visible">
            <defs>
              <linearGradient id={`grad-defender-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="100%" stopColor="#7e22ce" />
              </linearGradient>
            </defs>
            <polygon
              points="50,4 94,50 50,96 6,50"
              fill="rgba(147, 51, 234, 0.2)"
              stroke="#a855f7"
              strokeWidth="3.5"
            />
            <polygon
              points="50,20 78,35 78,65 50,80 22,65 22,35"
              fill="none"
              stroke="#c084fc"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            <polygon points="50,30 65,45 50,70 35,45" fill="#581c87" stroke="#e9d5ff" strokeWidth="2" />
            <circle cx="50" cy="78" r="9" fill="#3b0764" stroke="#c084fc" strokeWidth="1.5" />
            <text x="50" y="82" textAnchor="middle" fill="#f3e8ff" fontSize="10" fontWeight="900" fontFamily="monospace">
              {level}
            </text>
          </svg>
        );

      case "hunter":
        // Ruby Crimson Threat Hunter Crosshair
        return (
          <svg width={s} height={s} viewBox="0 0 100 100" className="overflow-visible">
            <defs>
              <linearGradient id={`grad-hunter-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
            </defs>
            <polygon
              points="30,8 70,8 92,30 92,70 70,92 30,92 8,70 8,30"
              fill="rgba(244, 63, 94, 0.15)"
              stroke={`url(#grad-hunter-${level})`}
              strokeWidth="3"
            />
            <circle cx="50" cy="50" r="30" fill="none" stroke="#fb7185" strokeWidth="1.5" strokeDasharray="3 3" />
            <line x1="50" y1="14" x2="50" y2="28" stroke="#ffe4e6" strokeWidth="2.5" />
            <line x1="50" y1="72" x2="50" y2="86" stroke="#ffe4e6" strokeWidth="2.5" />
            <line x1="14" y1="50" x2="28" y2="50" stroke="#ffe4e6" strokeWidth="2.5" />
            <line x1="72" y1="50" x2="86" y2="50" stroke="#ffe4e6" strokeWidth="2.5" />
            <polygon points="50,34 58,46 52,46 54,62 44,52 48,52" fill="#fb7185" stroke="#fff" strokeWidth="1" />
            <circle cx="50" cy="78" r="9" fill="#4c0519" stroke="#fb7185" strokeWidth="1.5" />
            <text x="50" y="82" textAnchor="middle" fill="#ffe4e6" fontSize="10" fontWeight="900" fontFamily="monospace">
              {level}
            </text>
          </svg>
        );

      case "architect":
        // Solar Amber Winged Architect Crest
        return (
          <svg width={s} height={s} viewBox="0 0 100 100" className="overflow-visible">
            <defs>
              <linearGradient id={`grad-architect-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
            <path
              d="M10,34 Q30,22 50,30 Q70,22 90,34 Q80,62 50,86 Q20,62 10,34 Z"
              fill="rgba(245, 158, 11, 0.2)"
              stroke={`url(#grad-architect-${level})`}
              strokeWidth="3.5"
            />
            <polygon points="50,16 58,28 70,22 64,36 76,44 60,48 62,60 50,52 38,60 40,48 24,44 36,36 30,22 42,28" fill="#d97706" stroke="#fef08a" strokeWidth="2" />
            <polygon points="50,36 54,43 60,46 54,49 50,56 46,49 40,46 46,43" fill="#fff" />
            <circle cx="50" cy="74" r="10" fill="#78350f" stroke="#fef08a" strokeWidth="2" />
            <text x="50" y="78" textAnchor="middle" fill="#fef08a" fontSize="11" fontWeight="900" fontFamily="monospace">
              {level}
            </text>
          </svg>
        );

      case "mythic":
      default:
        // Cosmic Iridescent Titan Nebula Crown (Titan & Grand Maître)
        return (
          <svg width={s} height={s} viewBox="0 0 100 100" className="overflow-visible">
            <defs>
              <linearGradient id={`grad-mythic-${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="33%" stopColor="#8b5cf6" />
                <stop offset="66%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            {/* Outer Quantum Astral Ring */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={`url(#grad-mythic-${level})`}
              strokeWidth="2.5"
              strokeDasharray="8 4 2 4"
              className="animate-spin"
              style={{ animationDuration: "12s" }}
            />
            {/* Grand Astral Octagram */}
            <polygon
              points="50,4 63,22 84,16 78,37 96,50 78,63 84,84 63,78 50,96 37,78 16,84 22,63 4,50 22,37 16,16 37,22"
              fill="rgba(139, 92, 246, 0.25)"
              stroke={`url(#grad-mythic-${level})`}
              strokeWidth="3"
            />
            {/* Royal Cyber Crown */}
            <path
              d="M32,60 L28,34 L40,44 L50,24 L60,44 L72,34 L68,60 Z"
              fill={`url(#grad-mythic-${level})`}
              stroke="#fff"
              strokeWidth="2"
            />
            {/* Radiant Core Star */}
            <polygon points="50,38 53,46 61,50 53,54 50,62 47,54 39,50 47,46" fill="#fff" />
            {/* Level */}
            <circle cx="50" cy="74" r="10" fill="#1e1b4b" stroke="#38bdf8" strokeWidth="2" />
            <text x="50" y="78" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="900" fontFamily="monospace">
              {level}
            </text>
          </svg>
        );
    }
  };

  return (
    <div className={`inline-flex flex-col items-center justify-center gap-1.5 ${className}`}>
      {/* Insignia Illustration */}
      <div
        className={`relative flex items-center justify-center rounded-2xl transition-all duration-300 group hover:scale-105 ${sizeDimensions.pad}`}
        style={{
          boxShadow: `0 0 20px -6px ${tierColor.accent}40`,
        }}
        title={`${localizedTitle} (Niv. ${level}) • ${levelData.required_xp.toLocaleString()} XP`}
      >
        {renderInsigniaSvg()}
      </div>

      {/* Optional Title Label */}
      {showLabel && (
        <div className="flex flex-col items-center text-center">
          <span className={`font-black tracking-wide ${sizeDimensions.text}`} style={{ color: tierColor.accent }}>
            {localizedTitle}
          </span>
          {showTierBadge && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5 tracking-wider uppercase"
              style={{
                backgroundColor: `${tierColor.accent}20`,
                color: tierColor.accent,
                border: `1px solid ${tierColor.accent}40`,
              }}
            >
              {currentLang === "en" ? levelData.tier.toUpperCase() : tierColor.labelFr}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
export default RankBadge;
