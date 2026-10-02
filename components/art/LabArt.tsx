import { ArtCanvas, createPalette, normalizeArtKey } from "@/components/art/shared";
import { cn } from "@/lib/utils";
import type { LabCategory } from "@/types/api";

interface LabArtProps {
  category: LabCategory;
  className?: string;
}

function paletteForLab(category: LabCategory) {
  switch (category) {
    case "reseau":
      return createPalette({ accent: "#00d5ff", accentSoft: "#d7f9ff", accentAlt: "#1765f5", glow: "#00d5ff", glowAlt: "#3efa95", surface: "#0f2642", surfaceAlt: "#18375e", line: "#b0e6ff" });
    case "linux":
      return createPalette({ accent: "#3efa95", accentSoft: "#d1ffe9", accentAlt: "#00d5ff", glow: "#3efa95", glowAlt: "#9a64ff", surface: "#102235", surfaceAlt: "#173548", line: "#a5ffd7" });
    case "web":
      return createPalette({ accent: "#00d5ff", accentSoft: "#d9f8ff", accentAlt: "#9a64ff", glow: "#00d5ff", glowAlt: "#ff6b7d", surface: "#12223d", surfaceAlt: "#1d3458", line: "#b9dcff", warm: "#ff6b7d" });
    case "cryptographie":
      return createPalette({ accent: "#9a64ff", accentSoft: "#e6dcff", accentAlt: "#00d5ff", glow: "#9a64ff", glowAlt: "#3efa95", surface: "#1d2144", surfaceAlt: "#2c3263", line: "#d8cbff" });
    case "osint":
      return createPalette({ accent: "#ffb86b", accentSoft: "#ffe6c8", accentAlt: "#00d5ff", glow: "#00d5ff", glowAlt: "#ffb86b", surface: "#1e273d", surfaceAlt: "#2a3a59", line: "#ffe2bc", warm: "#ffb86b" });
    case "securite":
    default:
      return createPalette({ accent: "#ff6b7d", accentSoft: "#ffe0e5", accentAlt: "#9a64ff", glow: "#ff6b7d", glowAlt: "#00d5ff", surface: "#24172e", surfaceAlt: "#34244b", line: "#ffc5cd", warm: "#ffb86b" });
  }
}

function labInterior(category: LabCategory, panel: string, scan: string, accent: string, accentAlt: string, warm: string) {
  switch (category) {
    case "reseau":
      return (
        <>
          <circle cx="256" cy="136" r="42" fill="none" stroke={accent} strokeWidth="2.2" />
          <path d="M214 136H298M256 94V178M228 110L284 162M228 162L284 110" stroke="#dff8ff" strokeOpacity="0.34" strokeWidth="1.8" />
          <rect x="148" y="102" width="34" height="22" rx="8" fill={panel} stroke={accent} strokeWidth="1.8" />
          <rect x="148" y="148" width="42" height="24" rx="9" fill={panel} stroke="#3efa95" strokeWidth="1.8" />
          <rect x="326" y="98" width="34" height="22" rx="8" fill={panel} stroke={accentAlt} strokeWidth="1.8" />
          <rect x="314" y="150" width="42" height="24" rx="9" fill={panel} stroke={accent} strokeWidth="1.8" />
          <path d="M182 113H214M190 160H214M298 112H326M298 160H314" stroke="#dff8ff" strokeOpacity="0.36" strokeWidth="1.8" strokeDasharray="5 6" />
          <circle className="cp-art__pulse" cx="236" cy="118" r="5" fill={accent} />
          <circle className="cp-art__pulse cp-art__pulse--alt" cx="278" cy="154" r="5" fill={accentAlt} />
        </>
      );
    case "linux":
      return (
        <>
          <path d="M154 114L166 126L154 138" stroke={accent} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M176 140H284" stroke={accent} strokeWidth="2.8" strokeLinecap="round" />
          <path d="M154 160H238" stroke="#3efa95" strokeWidth="2.8" strokeLinecap="round" strokeOpacity="0.78" />
          <ellipse cx="326" cy="152" rx="24" ry="30" fill={panel} stroke={accent} strokeWidth="1.8" />
          <circle cx="326" cy="122" r="15" fill={accentAlt} fillOpacity="0.18" stroke={accentAlt} strokeWidth="1.8" />
          <ellipse cx="326" cy="156" rx="12" ry="18" fill="#dff8ff" fillOpacity="0.18" />
          <path d="M312 182C316 172 321 168 326 166C331 168 336 172 340 182" fill={accentAlt} fillOpacity="0.16" stroke={accentAlt} strokeWidth="1.8" />
          <path d="M312 178L318 186M340 178L334 186" stroke="#ffb86b" strokeWidth="3.2" strokeLinecap="round" />
          <circle className="cp-art__pulse" cx="294" cy="106" r="5" fill={accent} />
          <circle className="cp-art__pulse" cx="356" cy="110" r="5" fill={accentAlt} />
        </>
      );
    case "web":
      return (
        <>
          <rect x="146" y="102" width="168" height="78" rx="14" fill="#061325" stroke={accentAlt} strokeOpacity="0.48" />
          <rect x="146" y="102" width="168" height="16" rx="14" fill="#0a1730" />
          <circle cx="162" cy="110" r="2.8" fill="#ff6b7d" />
          <circle cx="173" cy="110" r="2.8" fill="#ffb86b" />
          <circle cx="184" cy="110" r="2.8" fill="#3efa95" />
          <path d="M170 138H276M170 156H254" stroke={accent} strokeOpacity="0.58" strokeWidth="2.2" strokeDasharray="8 6" />
          <g transform="translate(312 112)">
            <path d="M20 0L42 10V26C42 39 32 50 20 56C8 50 -2 39 -2 26V10L20 0Z" fill={panel} stroke={accent} strokeWidth="1.8" />
            <rect x="12" y="20" width="16" height="11" rx="4" fill={accentAlt} fillOpacity="0.18" stroke={accentAlt} strokeWidth="1.4" />
            <path d="M15 20V16C15 13 17 11 20 11C23 11 25 13 25 16V20" fill="none" stroke={accentAlt} strokeWidth="1.4" />
          </g>
          <g transform="translate(300 150)">
            <ellipse cx="18" cy="14" rx="14" ry="11" fill={warm} fillOpacity="0.16" stroke={warm} strokeWidth="1.5" />
            <circle cx="10" cy="6" r="4" fill={warm} fillOpacity="0.18" stroke={warm} strokeWidth="1.4" />
            <circle cx="26" cy="6" r="4" fill={warm} fillOpacity="0.18" stroke={warm} strokeWidth="1.4" />
          </g>
        </>
      );
    case "cryptographie":
      return (
        <>
          <circle cx="314" cy="140" r="34" fill="none" stroke={accentAlt} strokeWidth="2" />
          <circle cx="314" cy="140" r="20" fill="none" stroke={accent} strokeOpacity="0.6" strokeWidth="1.8" />
          <path d="M314 106V174M280 140H348M292 118L336 162M292 162L336 118" stroke="#dff8ff" strokeOpacity="0.22" strokeWidth="1.4" />
          <path d="M154 150H214C226 150 236 140 236 128C236 116 226 106 214 106C202 106 192 116 192 128V136H212" fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="240" cy="150" r="13" fill={panel} stroke={warm} strokeWidth="3" />
          <path d="M240 163V178" stroke={warm} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case "osint":
      return (
        <>
          <path d="M164 114C188 90 218 88 242 112C264 134 292 142 320 128C340 118 356 102 372 84" fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeOpacity="0.26" />
          <circle cx="216" cy="132" r="26" fill="none" stroke={accentAlt} strokeWidth="2" />
          <path d="M234 150L256 172" stroke={accentAlt} strokeWidth="3" strokeLinecap="round" />
          <circle className="cp-art__pulse" cx="198" cy="124" r="4.5" fill={warm} />
          <circle className="cp-art__pulse cp-art__pulse--alt" cx="250" cy="114" r="4.5" fill={accent} />
          <circle className="cp-art__pulse" cx="286" cy="134" r="4.5" fill={accentAlt} />
          <path d="M302 102H362M302 124H344M302 146H372" stroke="#dff8ff" strokeOpacity="0.32" strokeWidth="2.2" strokeDasharray="6 6" />
        </>
      );
    case "securite":
    default:
      return (
        <>
          <path d="M262 92L308 112V142C308 166 291 184 262 196C233 184 216 166 216 142V112L262 92Z" fill={panel} stroke={accent} strokeWidth="2.2" />
          <rect x="248" y="130" width="28" height="18" rx="6" fill={accentAlt} fillOpacity="0.16" stroke={accentAlt} strokeWidth="1.6" />
          <path d="M252 130V124C252 118 256 114 262 114C268 114 272 118 272 124V130" fill="none" stroke={accentAlt} strokeWidth="1.6" />
          <path d="M140 174L176 138L208 170" fill="none" stroke={warm} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="176" cy="138" r="30" fill="none" stroke={warm} strokeOpacity="0.4" strokeWidth="2" />
          <path className="cp-art__scan" d="M320 110L356 126L320 142Z" fill={`url(#${scan})`} />
          <circle className="cp-art__pulse" cx="348" cy="126" r="5" fill={warm} />
        </>
      );
  }
}

function screenShell(panel: string, accent: string, highlight: string) {
  return (
    <>
      <rect x="56" y="54" width="368" height="178" rx="26" fill={panel} stroke={accent} strokeOpacity="0.72" strokeWidth="2.2" />
      <rect x="56" y="54" width="368" height="28" rx="26" fill="#08142a" />
      <circle cx="82" cy="68" r="4" fill="#ff6b7d" />
      <circle cx="98" cy="68" r="4" fill="#ffb86b" />
      <circle cx="114" cy="68" r="4" fill="#3efa95" />
      <rect x="180" y="62" width="120" height="10" rx="5" fill={highlight} fillOpacity="0.12" />
      <path d="M128 232H352" stroke={accent} strokeOpacity="0.22" strokeWidth="6" strokeLinecap="round" />
      <path d="M206 232V250H274V232" fill="none" stroke={accent} strokeOpacity="0.44" strokeWidth="4" strokeLinecap="round" />
    </>
  );
}

export default function LabArt({ category, className }: LabArtProps) {
  const palette = paletteForLab(category);
  const normalizedCategory = normalizeArtKey(category) as LabCategory;

  return (
    <ArtCanvas className={cn("cp-lab-art", className)} palette={palette}>
      {(ids) => (
        <>
          {screenShell(`url(#${ids.panel})`, palette.accent, palette.highlight)}
          {labInterior(normalizedCategory, `url(#${ids.panel})`, ids.scan, palette.accent, palette.accentAlt, palette.warm)}
        </>
      )}
    </ArtCanvas>
  );
}
