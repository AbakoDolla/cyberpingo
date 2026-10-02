import { ArtCanvas, createPalette } from "@/components/art/shared";

type EmptyArtKind = "courses" | "labs" | "badges" | "notifications" | "search" | "activity";

interface EmptyArtProps {
  kind: EmptyArtKind;
}

function paletteForKind(kind: EmptyArtKind) {
  switch (kind) {
    case "courses":
      return createPalette({ accent: "#00d5ff", accentAlt: "#9a64ff", glow: "#3efa95", surface: "#112640", surfaceAlt: "#18385d" });
    case "labs":
      return createPalette({ accent: "#3efa95", accentAlt: "#00d5ff", glow: "#9a64ff", surface: "#11243b", surfaceAlt: "#1a3652" });
    case "badges":
      return createPalette({ accent: "#ffb86b", accentAlt: "#9a64ff", glow: "#00d5ff", surface: "#231b32", surfaceAlt: "#34254b", warm: "#ffb86b" });
    case "notifications":
      return createPalette({ accent: "#9a64ff", accentAlt: "#00d5ff", glow: "#3efa95", surface: "#1c2345", surfaceAlt: "#26345f" });
    case "search":
      return createPalette({ accent: "#00d5ff", accentAlt: "#ffb86b", glow: "#9a64ff", surface: "#11243d", surfaceAlt: "#1b3355", warm: "#ffb86b" });
    case "activity":
    default:
      return createPalette({ accent: "#3efa95", accentAlt: "#00d5ff", glow: "#9a64ff", surface: "#10273a", surfaceAlt: "#193953" });
  }
}

function artForKind(kind: EmptyArtKind, panel: string, scan: string, accent: string, accentAlt: string, warm: string) {
  switch (kind) {
    case "courses":
      return (
        <>
          <rect x="30" y="34" width="54" height="76" rx="14" fill={panel} stroke={accent} strokeWidth="2" />
          <rect x="74" y="46" width="58" height="76" rx="14" fill={panel} stroke={accentAlt} strokeWidth="2" />
          <path d="M48 62H70M48 78H66M92 74H114M92 90H110" stroke="#dff8ff" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="5 5" />
        </>
      );
    case "labs":
      return (
        <>
          <rect x="22" y="36" width="116" height="76" rx="16" fill={panel} stroke={accent} strokeWidth="2" />
          <rect x="22" y="36" width="116" height="16" rx="16" fill="#08142a" />
          <circle cx="34" cy="44" r="2.5" fill="#ff6b7d" />
          <circle cx="42" cy="44" r="2.5" fill="#ffb86b" />
          <circle cx="50" cy="44" r="2.5" fill="#3efa95" />
          <path d="M42 70L50 78L42 86" stroke={accent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M56 88H96" stroke={accent} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M56 72H82" stroke="#3efa95" strokeWidth="2.6" strokeLinecap="round" />
        </>
      );
    case "badges":
      return (
        <>
          <path d="M80 22L118 42V86L80 118L42 86V42L80 22Z" fill={panel} stroke={warm} strokeWidth="2.2" />
          <path d="M80 36L104 48V78L80 98L56 78V48L80 36Z" fill="none" stroke={accentAlt} strokeWidth="2" />
          <circle cx="80" cy="62" r="12" fill={accent} fillOpacity="0.16" stroke={accent} strokeWidth="1.8" />
          <path className="cp-art__scan" d="M54 96H106" stroke={`url(#${scan})`} strokeWidth="4" />
        </>
      );
    case "notifications":
      return (
        <>
          <path d="M56 44C56 30 67 20 80 20C93 20 104 30 104 44C104 72 116 82 116 82H44S56 72 56 44Z" fill={panel} stroke={accentAlt} strokeWidth="2" />
          <path d="M72 96C74 102 77 106 80 106C83 106 86 102 88 96" fill="none" stroke={accentAlt} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="80" cy="52" r="30" fill="none" stroke={accent} strokeOpacity="0.24" strokeWidth="2" />
          <circle cx="80" cy="52" r="44" fill="none" stroke={accent} strokeOpacity="0.16" strokeWidth="2" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="70" cy="68" r="24" fill="none" stroke={accent} strokeWidth="2.2" />
          <path d="M86 84L110 108" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          <circle className="cp-art__pulse" cx="62" cy="60" r="4.5" fill={warm} />
          <path d="M34 118C54 102 80 100 102 112" fill="none" stroke={accentAlt} strokeWidth="4" strokeLinecap="round" strokeOpacity="0.4" />
        </>
      );
    case "activity":
    default:
      return (
        <>
          <path d="M34 110H126" stroke="#dff8ff" strokeOpacity="0.16" strokeWidth="8" strokeLinecap="round" />
          <rect x="42" y="84" width="14" height="26" rx="6" fill={accent} fillOpacity="0.22" stroke={accent} strokeWidth="1.6" />
          <rect x="64" y="70" width="14" height="40" rx="6" fill="#3efa95" fillOpacity="0.22" stroke="#3efa95" strokeWidth="1.6" />
          <rect x="86" y="56" width="14" height="54" rx="6" fill={accentAlt} fillOpacity="0.22" stroke={accentAlt} strokeWidth="1.6" />
          <path d="M38 52L64 76L94 48L120 68" fill="none" stroke={warm} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
  }
}

export default function EmptyArt({ kind }: EmptyArtProps) {
  const palette = paletteForKind(kind);
  return (
    <div className="cp-empty-art" aria-hidden="true">
      <ArtCanvas className="cp-empty-art__canvas" palette={palette} viewBox="0 0 160 160" preserveAspectRatio="xMidYMid meet">
        {(ids) => artForKind(kind, `url(#${ids.panel})`, ids.scan, palette.accent, palette.accentAlt, palette.warm)}
      </ArtCanvas>
    </div>
  );
}
