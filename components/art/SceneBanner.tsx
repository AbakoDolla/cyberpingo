import type { ReactNode } from "react";
import { ArtCanvas, createPalette } from "@/components/art/shared";
import { cn } from "@/lib/utils";

type SceneBannerVariant =
  | "dashboard"
  | "courses"
  | "challenges"
  | "progression"
  | "profile"
  | "settings"
  | "notifications"
  | "admin"
  | "library"
  | "certificate";

interface SceneBannerProps {
  variant: SceneBannerVariant;
  className?: string;
  anchor?: "center" | "end";
  children: ReactNode;
}

function paletteForVariant(variant: SceneBannerVariant) {
  switch (variant) {
    case "dashboard":
      return createPalette({ accent: "#00d5ff", accentSoft: "#d5f9ff", accentAlt: "#3efa95", glow: "#00d5ff", glowAlt: "#9a64ff", surface: "#112847", surfaceAlt: "#183759", line: "#b9e8ff" });
    case "courses":
      return createPalette({ accent: "#00d5ff", accentSoft: "#d9f8ff", accentAlt: "#9a64ff", glow: "#3efa95", glowAlt: "#00d5ff", surface: "#112644", surfaceAlt: "#18355a", line: "#bae3ff" });
    case "challenges":
      return createPalette({ accent: "#ff6b7d", accentSoft: "#ffe0e5", accentAlt: "#9a64ff", glow: "#ff6b7d", glowAlt: "#00d5ff", surface: "#25172f", surfaceAlt: "#32204b", line: "#ffc8cf", warm: "#ffb86b" });
    case "progression":
      return createPalette({ accent: "#3efa95", accentSoft: "#d4ffea", accentAlt: "#00d5ff", glow: "#3efa95", glowAlt: "#9a64ff", surface: "#10273c", surfaceAlt: "#173852", line: "#b7ffdd" });
    case "profile":
      return createPalette({ accent: "#00d5ff", accentSoft: "#dbf8ff", accentAlt: "#9a64ff", glow: "#00d5ff", glowAlt: "#3efa95", surface: "#132949", surfaceAlt: "#19365b", line: "#bfe7ff" });
    case "settings":
      return createPalette({ accent: "#00d5ff", accentSoft: "#d8f9ff", accentAlt: "#ffb86b", glow: "#00d5ff", glowAlt: "#9a64ff", surface: "#12243f", surfaceAlt: "#1b3356", line: "#bee4ff", warm: "#ffb86b" });
    case "notifications":
      return createPalette({ accent: "#9a64ff", accentSoft: "#eadfff", accentAlt: "#00d5ff", glow: "#9a64ff", glowAlt: "#3efa95", surface: "#192447", surfaceAlt: "#273562", line: "#cfcbff" });
    case "admin":
      return createPalette({ accent: "#00d5ff", accentSoft: "#d5f8ff", accentAlt: "#3efa95", glow: "#00d5ff", glowAlt: "#9a64ff", surface: "#10263f", surfaceAlt: "#17395f", line: "#c1e7ff" });
    case "library":
      return createPalette({ accent: "#00d5ff", accentSoft: "#dcf8ff", accentAlt: "#ffb86b", glow: "#00d5ff", glowAlt: "#9a64ff", surface: "#12233c", surfaceAlt: "#1d3559", line: "#c0e7ff", warm: "#ffb86b" });
    case "certificate":
    default:
      return createPalette({ accent: "#ffb86b", accentSoft: "#ffe8bf", accentAlt: "#00d5ff", glow: "#3efa95", glowAlt: "#ffb86b", surface: "#1f263c", surfaceAlt: "#2b3858", line: "#ffe1b5", warm: "#ffb86b" });
  }
}

function variantScene(variant: SceneBannerVariant, panel: string, scan: string, accent: string, accentAlt: string, warm: string) {
  switch (variant) {
    case "dashboard":
      return (
        <>
          <path d="M660 52H908" stroke={accent} strokeOpacity="0.16" strokeWidth="2" strokeDasharray="8 10" />
          <path d="M640 188H890" stroke={accentAlt} strokeOpacity="0.16" strokeWidth="2" strokeDasharray="8 10" />
          <rect x="628" y="78" width="96" height="60" rx="18" fill={panel} stroke={accent} strokeWidth="2.2" />
          <rect x="744" y="62" width="150" height="88" rx="22" fill={panel} stroke={accentAlt} strokeWidth="2.2" />
          <rect x="708" y="160" width="120" height="50" rx="18" fill={panel} stroke="#3efa95" strokeWidth="2.2" />
          <path d="M658 110H694M776 96H848M776 120H824M742 188H792" stroke="#dff8ff" strokeOpacity="0.38" strokeWidth="2.2" strokeDasharray="7 8" />
          <circle className="cp-art__pulse" cx="672" cy="110" r="6" fill={accent} />
          <circle className="cp-art__pulse cp-art__pulse--alt" cx="810" cy="82" r="6" fill={accentAlt} />
          <circle className="cp-art__pulse" cx="790" cy="184" r="6" fill="#3efa95" />
        </>
      );
    case "courses":
      return (
        <>
          <rect x="620" y="54" width="114" height="146" rx="22" fill={panel} stroke={accent} strokeWidth="2.2" transform="rotate(-8 620 54)" />
          <rect x="706" y="64" width="126" height="154" rx="24" fill={panel} stroke={accentAlt} strokeWidth="2.2" transform="rotate(3 706 64)" />
          <rect x="806" y="86" width="108" height="134" rx="22" fill={panel} stroke="#3efa95" strokeWidth="2.2" transform="rotate(10 806 86)" />
          <path d="M648 126H704M648 148H692M738 108H806M738 132H782M830 130H876M830 154H864" stroke="#dff8ff" strokeOpacity="0.34" strokeWidth="2.2" strokeDasharray="8 8" />
          <circle className="cp-art__pulse" cx="846" cy="118" r="7" fill={accentAlt} />
          <circle className="cp-art__pulse" cx="760" cy="168" r="7" fill={accent} />
        </>
      );
    case "challenges":
      return (
        <>
          <rect x="616" y="70" width="228" height="124" rx="22" fill={panel} stroke={accentAlt} strokeWidth="2.2" />
          <rect x="634" y="88" width="192" height="88" rx="16" fill="#071223" stroke={accent} strokeOpacity="0.42" />
          <path d="M658 116L676 132L658 148" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M688 150H782" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          <path d="M690 122H750" stroke="#3efa95" strokeOpacity="0.78" strokeWidth="4" strokeLinecap="round" />
          <path d="M850 76L908 98V152C908 184 886 210 850 224C814 210 792 184 792 152V98L850 76Z" fill="none" stroke={warm} strokeOpacity="0.8" strokeWidth="2.4" />
          <path d="M850 102V194M804 148H896" stroke={warm} strokeOpacity="0.4" strokeWidth="2" strokeDasharray="6 8" />
          <path className="cp-art__scan" d="M850 148L896 116A58 58 0 0 1 908 148Z" fill={`url(#${scan})`} />
          <circle className="cp-art__pulse" cx="874" cy="126" r="6" fill={warm} />
        </>
      );
    case "progression":
      return (
        <>
          <path d="M600 182C670 170 726 138 772 102C816 68 860 54 914 56" fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round" strokeOpacity="0.24" />
          <path d="M608 182C678 170 736 138 780 102C824 68 866 54 914 56" fill="none" stroke={accentAlt} strokeWidth="4" strokeLinecap="round" strokeDasharray="7 10" strokeOpacity="0.38" />
          {[636, 710, 778, 846, 902].map((x, index) => {
            const y = [174, 150, 118, 88, 60][index];
            return <circle key={`${x}-${y}`} className="cp-art__pulse" cx={x} cy={y} r={index === 4 ? 10 : 8} fill={index % 2 === 0 ? accent : accentAlt} />;
          })}
          <path d="M894 44L902 24L910 44L930 52L910 60L902 80L894 60L874 52Z" fill={warm} fillOpacity="0.2" stroke={warm} strokeWidth="2" />
        </>
      );
    case "profile":
      return (
        <>
          <path d="M812 48L886 80V122C886 158 860 188 812 204C764 188 738 158 738 122V80L812 48Z" fill={panel} stroke={accent} strokeWidth="2.4" />
          <circle cx="812" cy="110" r="22" fill={accentAlt} fillOpacity="0.18" stroke={accentAlt} strokeWidth="2" />
          <path d="M776 166C788 146 804 138 812 138C820 138 836 146 848 166" fill="none" stroke="#dff8ff" strokeOpacity="0.36" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M650 72H724M648 98H706M894 86H944M894 112H926" stroke={accent} strokeOpacity="0.2" strokeWidth="2.2" strokeDasharray="7 8" />
          <circle className="cp-art__pulse" cx="702" cy="74" r="6" fill={accent} />
          <circle className="cp-art__pulse cp-art__pulse--alt" cx="930" cy="112" r="6" fill={accentAlt} />
        </>
      );
    case "settings":
      return (
        <>
          <circle cx="816" cy="122" r="34" fill={panel} stroke={accent} strokeWidth="2.4" />
          <circle cx="816" cy="122" r="12" fill={accentAlt} fillOpacity="0.18" stroke={accentAlt} strokeWidth="2" />
          {[
            "M816 66V84",
            "M816 160V178",
            "M760 122H778",
            "M854 122H872",
            "M776 82L788 94",
            "M844 150L856 162",
            "M776 162L788 150",
            "M844 94L856 82",
          ].map((d) => <path key={d} d={d} stroke={accent} strokeWidth="4" strokeLinecap="round" />)}
          <path d="M648 86H760M682 122H742M662 160H786" stroke="#dff8ff" strokeOpacity="0.24" strokeWidth="10" strokeLinecap="round" />
          <circle className="cp-art__pulse" cx="706" cy="86" r="10" fill={warm} />
          <circle className="cp-art__pulse cp-art__pulse--alt" cx="732" cy="122" r="10" fill={accentAlt} />
          <circle className="cp-art__pulse" cx="708" cy="160" r="10" fill={accent} />
        </>
      );
    case "notifications":
      return (
        <>
          <path d="M802 70C802 42 824 20 852 20C880 20 902 42 902 70C902 124 926 144 926 144H778S802 124 802 70Z" fill={panel} stroke={accentAlt} strokeWidth="2.2" />
          <path d="M832 166C836 178 844 184 852 184C860 184 868 178 872 166" fill="none" stroke={accentAlt} strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="852" cy="92" r="44" fill="none" stroke={accent} strokeOpacity="0.26" strokeWidth="2" />
          <circle cx="852" cy="92" r="70" fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="2" />
          <circle cx="852" cy="92" r="96" fill="none" stroke={accent} strokeOpacity="0.12" strokeWidth="2" />
          <circle className="cp-art__pulse" cx="916" cy="54" r="7" fill="#3efa95" />
        </>
      );
    case "admin":
      return (
        <>
          <rect x="620" y="56" width="144" height="150" rx="24" fill={panel} stroke={accent} strokeWidth="2.2" />
          <rect x="784" y="56" width="144" height="150" rx="24" fill={panel} stroke={accentAlt} strokeWidth="2.2" />
          <path d="M650 176V114M682 176V96M714 176V130" stroke="#3efa95" strokeWidth="18" strokeLinecap="round" />
          <path d="M806 156L840 120L868 138L906 90" fill="none" stroke={accentAlt} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <circle className="cp-art__pulse" cx="840" cy="120" r="6" fill={accent} />
          <circle className="cp-art__pulse cp-art__pulse--alt" cx="868" cy="138" r="6" fill="#3efa95" />
          <circle className="cp-art__pulse" cx="906" cy="90" r="6" fill={accentAlt} />
          <path d="M644 88H742M804 84H908" stroke="#dff8ff" strokeOpacity="0.18" strokeWidth="2" strokeDasharray="7 8" />
        </>
      );
    case "library":
      return (
        <>
          <rect x="642" y="60" width="70" height="146" rx="16" fill={panel} stroke={accent} strokeWidth="2.2" />
          <rect x="706" y="72" width="72" height="134" rx="16" fill={panel} stroke="#3efa95" strokeWidth="2.2" />
          <rect x="776" y="52" width="74" height="154" rx="16" fill={panel} stroke={accentAlt} strokeWidth="2.2" />
          <rect x="848" y="84" width="68" height="122" rx="16" fill={panel} stroke={warm} strokeWidth="2.2" />
          <path d="M662 92H692M724 104H760M796 86H830M866 116H894" stroke="#dff8ff" strokeOpacity="0.34" strokeWidth="2.2" />
          <circle className="cp-art__pulse" cx="888" cy="160" r="6" fill={accentAlt} />
        </>
      );
    case "certificate":
    default:
      return (
        <>
          <rect x="642" y="56" width="220" height="152" rx="26" fill={panel} stroke={accent} strokeWidth="2.2" />
          <path d="M678 94H826M678 122H804M678 150H794" stroke="#dff8ff" strokeOpacity="0.3" strokeWidth="2.2" strokeDasharray="8 8" />
          <circle cx="826" cy="160" r="24" fill={warm} fillOpacity="0.18" stroke={warm} strokeWidth="2" />
          <path d="M816 160L824 168L838 150" fill="none" stroke={warm} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M812 182L804 216L826 202L846 216L840 182" fill={warm} fillOpacity="0.16" stroke={warm} strokeWidth="2" strokeLinejoin="round" />
        </>
      );
  }
}

export default function SceneBanner({ variant, className, anchor = "center", children }: SceneBannerProps) {
  const palette = paletteForVariant(variant);

  return (
    <div className={cn("cp-scene-banner", `cp-scene-banner--${variant}`, className)}>
      <div className="cp-scene-banner__visual" aria-hidden="true">
        <ArtCanvas className="cp-scene-banner__art" palette={palette} viewBox="0 0 960 240" preserveAspectRatio={anchor === "end" ? "xMaxYMid slice" : undefined}>
          {(ids) => variantScene(variant, `url(#${ids.panel})`, ids.scan, palette.accent, palette.accentAlt, palette.warm)}
        </ArtCanvas>
      </div>
      <div className="cp-scene-banner__veil" />
      {children}
    </div>
  );
}
