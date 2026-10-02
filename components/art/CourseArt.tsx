import PhotoCover from "@/components/art/PhotoCover";
import { ArtCanvas, createPalette, hashArtKey, normalizeArtKey, pointString } from "@/components/art/shared";
import { cn } from "@/lib/utils";

interface CourseArtProps {
  slug?: string | null;
  category?: string | null;
  className?: string;
  photo?: boolean;
  sizes?: string;
  priority?: boolean;
}

type CourseSceneKey =
  | "fondamentaux"
  | "reseaux"
  | "linux"
  | "securite-web"
  | "pentest"
  | "detection"
  | "cryptographie"
  | "cloud"
  | "malware"
  | "forensique"
  | "gouvernance"
  | "mobile"
  | "ia"
  | "windows"
  | "abstract";

function matches(candidate: string[], ...needles: string[]) {
  return candidate.some((entry) => needles.some((needle) => entry.includes(needle)));
}

function sceneKey(slug: string | null | undefined, category: string | null | undefined): CourseSceneKey {
  const candidates = [normalizeArtKey(slug), normalizeArtKey(category)].filter(Boolean);
  if (matches(candidates, "fondamentaux", "fondamentaux-cyber", "fondamental", "bases", "base")) return "fondamentaux";
  if (matches(candidates, "reseaux", "reseau", "network", "tcp-ip")) return "reseaux";
  if (matches(candidates, "linux", "bash", "shell")) return "linux";
  if (matches(candidates, "securite-web", "web", "owasp", "appsec", "application")) return "securite-web";
  if (matches(candidates, "pentest", "red-team", "attaque", "offensif")) return "pentest";
  if (matches(candidates, "analyse-logs", "detection", "soc", "siem", "logs", "journal")) return "detection";
  if (matches(candidates, "cryptographie", "crypto", "cipher", "chiffrement")) return "cryptographie";
  if (matches(candidates, "cloud", "azure", "aws", "gcp", "saas")) return "cloud";
  if (matches(candidates, "malware", "threat-intel", "cti", "virus")) return "malware";
  if (matches(candidates, "forensique", "dfir", "forensic", "incident-response")) return "forensique";
  if (matches(candidates, "gouvernance", "grc", "conformite", "risque", "audit")) return "gouvernance";
  if (matches(candidates, "mobile", "iot", "android", "ios", "objets-connectes")) return "mobile";
  if (matches(candidates, "ia", "ai", "intelligence-artificielle", "llm", "machine-learning")) return "ia";
  if (matches(candidates, "windows", "active-directory", "active-directory", "ad", "powershell")) return "windows";
  return "abstract";
}

function paletteForScene(scene: CourseSceneKey, seed: number) {
  switch (scene) {
    case "fondamentaux":
      return createPalette({ accent: "#00d5ff", accentSoft: "#8ef0ff", accentAlt: "#9a64ff", glow: "#3efa95", glowAlt: "#00d5ff", surface: "#132949", surfaceAlt: "#0d1c33", line: "#83dfff", warm: "#3efa95" });
    case "reseaux":
      return createPalette({ accent: "#2de6ff", accentSoft: "#a3f7ff", accentAlt: "#1765f5", glow: "#00d5ff", glowAlt: "#3efa95", surface: "#0d2745", surfaceAlt: "#12365f", line: "#9adfff", warm: "#ffb86b" });
    case "linux":
      return createPalette({ accent: "#3efa95", accentSoft: "#bcffe0", accentAlt: "#00d5ff", glow: "#3efa95", glowAlt: "#9a64ff", surface: "#0f2336", surfaceAlt: "#173649", line: "#9dffd4", warm: "#ffb86b" });
    case "securite-web":
      return createPalette({ accent: "#00d5ff", accentSoft: "#c4f7ff", accentAlt: "#9a64ff", glow: "#00d5ff", glowAlt: "#ff6b7d", surface: "#13213d", surfaceAlt: "#1b3159", line: "#b5d6ff", warm: "#ff6b7d" });
    case "pentest":
      return createPalette({ accent: "#ff6b7d", accentSoft: "#ffd0d8", accentAlt: "#9a64ff", glow: "#ff6b7d", glowAlt: "#ffb86b", surface: "#24152a", surfaceAlt: "#392246", line: "#ffc2cb", warm: "#ffb86b" });
    case "detection":
      return createPalette({ accent: "#3efa95", accentSoft: "#d0ffe6", accentAlt: "#00d5ff", glow: "#3efa95", glowAlt: "#ffb86b", surface: "#11273d", surfaceAlt: "#173652", line: "#a5ffd7", warm: "#ffb86b" });
    case "cryptographie":
      return createPalette({ accent: "#9a64ff", accentSoft: "#e3d8ff", accentAlt: "#00d5ff", glow: "#9a64ff", glowAlt: "#3efa95", surface: "#1c2144", surfaceAlt: "#2a2f5d", line: "#d4c4ff", warm: "#ffb86b" });
    case "cloud":
      return createPalette({ accent: "#00d5ff", accentSoft: "#d8f8ff", accentAlt: "#3efa95", glow: "#00d5ff", glowAlt: "#9a64ff", surface: "#102744", surfaceAlt: "#193a61", line: "#b1e7ff", warm: "#3efa95" });
    case "malware":
      return createPalette({ accent: "#ff6b7d", accentSoft: "#ffe0e5", accentAlt: "#9a64ff", glow: "#ff6b7d", glowAlt: "#00d5ff", surface: "#23192f", surfaceAlt: "#311f45", line: "#ffc5cd", warm: "#ffb86b" });
    case "forensique":
      return createPalette({ accent: "#ffb86b", accentSoft: "#ffe5c2", accentAlt: "#00d5ff", glow: "#00d5ff", glowAlt: "#ffb86b", surface: "#1e273d", surfaceAlt: "#28385a", line: "#ffe1b7", warm: "#ffb86b" });
    case "gouvernance":
      return createPalette({ accent: "#00d5ff", accentSoft: "#d5f8ff", accentAlt: "#ffb86b", glow: "#3efa95", glowAlt: "#00d5ff", surface: "#15253f", surfaceAlt: "#223a60", line: "#bfe8ff", warm: "#ffb86b" });
    case "mobile":
      return createPalette({ accent: "#00d5ff", accentSoft: "#d6f9ff", accentAlt: "#3efa95", glow: "#9a64ff", glowAlt: "#00d5ff", surface: "#15243d", surfaceAlt: "#223d63", line: "#bae6ff", warm: "#3efa95" });
    case "ia":
      return createPalette({ accent: "#9a64ff", accentSoft: "#e2d8ff", accentAlt: "#00d5ff", glow: "#00d5ff", glowAlt: "#9a64ff", surface: "#192347", surfaceAlt: "#24335f", line: "#c4d2ff", warm: "#3efa95" });
    case "windows":
      return createPalette({ accent: "#00d5ff", accentSoft: "#d6f9ff", accentAlt: "#1765f5", glow: "#00d5ff", glowAlt: "#3efa95", surface: "#12233f", surfaceAlt: "#1b355e", line: "#b5d9ff", warm: "#9a64ff" });
    case "abstract":
    default: {
      const abstractPalettes = [
        createPalette({ accent: "#00d5ff", accentSoft: "#d2f6ff", accentAlt: "#9a64ff", glow: "#3efa95", glowAlt: "#00d5ff" }),
        createPalette({ accent: "#3efa95", accentSoft: "#d1ffe9", accentAlt: "#00d5ff", glow: "#9a64ff", glowAlt: "#3efa95" }),
        createPalette({ accent: "#9a64ff", accentSoft: "#e4d9ff", accentAlt: "#ff6b7d", glow: "#00d5ff", glowAlt: "#9a64ff" }),
      ];
      return abstractPalettes[seed % abstractPalettes.length];
    }
  }
}

function commonFrame(scene: CourseSceneKey) {
  return (
    <>
      <rect x="26" y="24" width="428" height="222" rx="28" fill="none" stroke="#dff8ff" strokeOpacity="0.06" />
      {scene !== "abstract" && <path d="M38 64H442" stroke="#dff8ff" strokeOpacity="0.08" strokeDasharray="6 8" />}
      <path d="M44 222H188" stroke="#dff8ff" strokeOpacity="0.07" strokeDasharray="8 10" />
    </>
  );
}

function fundamentalsScene(panel: string, scan: string, accent: string, accentAlt: string) {
  return (
    <>
      <path d="M240 54L323 94V150C323 196 289 232 240 246C191 232 157 196 157 150V94L240 54Z" fill={panel} stroke={accent} strokeOpacity="0.9" strokeWidth="2.4" />
      <path d="M240 85C219 85 202 102 202 123V132H191C184 132 178 138 178 145V186C178 193 184 199 191 199H289C296 199 302 193 302 186V145C302 138 296 132 289 132H278V123C278 102 261 85 240 85ZM221 123C221 112 229 104 240 104C251 104 259 112 259 123V132H221V123Z" fill={accentAlt} fillOpacity="0.2" stroke={accentAlt} strokeWidth="2" />
      <rect x="208" y="145" width="64" height="42" rx="12" fill={accentAlt} fillOpacity="0.18" stroke={accentAlt} strokeWidth="2" />
      <path d="M240 158V176" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <circle className="cp-art__pulse" cx="118" cy="98" r="8" fill={accent} />
      <circle className="cp-art__pulse cp-art__pulse--alt" cx="90" cy="164" r="8" fill="#3efa95" />
      <circle className="cp-art__pulse" cx="362" cy="84" r="8" fill={accentAlt} />
      <circle className="cp-art__pulse cp-art__pulse--alt" cx="389" cy="176" r="8" fill={accent} />
      <circle className="cp-art__pulse" cx="133" cy="206" r="8" fill="#3efa95" />
      <circle className="cp-art__pulse" cx="338" cy="213" r="8" fill={accentAlt} />
      <path d="M126 98H157" stroke={accent} strokeWidth="2" strokeDasharray="6 7" />
      <path d="M98 164H157" stroke="#3efa95" strokeWidth="2" strokeDasharray="6 7" />
      <path d="M323 96H354" stroke={accentAlt} strokeWidth="2" strokeDasharray="6 7" />
      <path d="M323 180H383" stroke={accent} strokeWidth="2" strokeDasharray="6 7" />
      <path d="M145 206H190" stroke="#3efa95" strokeWidth="2" strokeDasharray="6 7" />
      <path d="M290 213H330" stroke={accentAlt} strokeWidth="2" strokeDasharray="6 7" />
      <path className="cp-art__scan" d="M199 82H281" stroke={`url(#${scan})`} strokeWidth="5" />
    </>
  );
}

function networkScene(panel: string, scan: string, accent: string, accentAlt: string) {
  return (
    <>
      <circle cx="298" cy="136" r="72" fill={panel} stroke={accent} strokeOpacity="0.92" strokeWidth="2.6" />
      <path d="M226 136H370M298 64V208M245 90C277 118 319 154 351 182M245 182C277 154 319 118 351 90" stroke={accent} strokeOpacity="0.45" strokeWidth="1.6" />
      <ellipse cx="298" cy="136" rx="48" ry="72" fill="none" stroke={accentAlt} strokeOpacity="0.35" strokeWidth="1.6" />
      <ellipse cx="298" cy="136" rx="72" ry="28" fill="none" stroke="#dff8ff" strokeOpacity="0.18" strokeWidth="1.4" />
      <rect x="102" y="92" width="44" height="30" rx="10" fill={panel} stroke={accent} strokeWidth="1.8" />
      <rect x="86" y="160" width="54" height="34" rx="12" fill={panel} stroke="#3efa95" strokeWidth="1.8" />
      <rect x="376" y="86" width="44" height="30" rx="10" fill={panel} stroke={accentAlt} strokeWidth="1.8" />
      <rect x="348" y="167" width="54" height="34" rx="12" fill={panel} stroke={accent} strokeWidth="1.8" />
      <path d="M146 108H214M140 177H226M370 101H376M336 184H348" stroke="#dff8ff" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="6 7" />
      <circle className="cp-art__pulse" cx="185" cy="108" r="5.5" fill={accent} />
      <circle className="cp-art__pulse cp-art__pulse--alt" cx="201" cy="177" r="5.5" fill="#3efa95" />
      <circle className="cp-art__pulse" cx="356" cy="101" r="5.5" fill={accentAlt} />
      <circle className="cp-art__pulse cp-art__pulse--alt" cx="342" cy="184" r="5.5" fill={accent} />
      <path className="cp-art__scan" d="M257 78C299 66 341 80 364 108" stroke={`url(#${scan})`} strokeWidth="5" />
    </>
  );
}

function linuxScene(panel: string, accent: string, accentAlt: string) {
  return (
    <>
      <rect x="56" y="72" width="266" height="148" rx="18" fill={panel} stroke={accent} strokeOpacity="0.68" strokeWidth="2" />
      <rect x="56" y="72" width="266" height="26" rx="18" fill="#0a1730" />
      <circle cx="78" cy="85" r="4" fill="#ff6b7d" />
      <circle cx="94" cy="85" r="4" fill="#ffb86b" />
      <circle cx="110" cy="85" r="4" fill="#3efa95" />
      <path d="M86 126L100 138L86 150" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M112 152H208" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <path d="M86 172H162" stroke="#3efa95" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.78" />
      <path d="M86 192H240" stroke={accentAlt} strokeWidth="3" strokeLinecap="round" strokeOpacity="0.74" />
      <ellipse cx="382" cy="164" rx="40" ry="48" fill={panel} stroke={accent} strokeWidth="2" />
      <circle cx="382" cy="116" r="24" fill={accentAlt} fillOpacity="0.16" stroke={accentAlt} strokeWidth="2" />
      <ellipse cx="382" cy="168" rx="20" ry="28" fill="#dff8ff" fillOpacity="0.2" />
      <circle cx="372" cy="112" r="4" fill="#fff" />
      <circle cx="392" cy="112" r="4" fill="#fff" />
      <path d="M382 120L372 126H392L382 120Z" fill="#ffb86b" />
      <path d="M360 211C363 198 370 190 382 188C394 190 401 198 404 211" fill={accentAlt} fillOpacity="0.18" stroke={accentAlt} strokeWidth="2" />
      <path d="M354 208L364 218M410 208L400 218" stroke="#ffb86b" strokeWidth="4" strokeLinecap="round" />
      <circle className="cp-art__pulse" cx="338" cy="78" r="7" fill={accent} />
      <circle className="cp-art__pulse cp-art__pulse--alt" cx="424" cy="86" r="7" fill={accentAlt} />
      <circle className="cp-art__pulse" cx="438" cy="170" r="7" fill="#3efa95" />
      <path d="M346 83H366M398 87H417M420 164H438" stroke="#dff8ff" strokeOpacity="0.38" strokeWidth="2" strokeDasharray="5 6" />
    </>
  );
}

function webScene(panel: string, accent: string, accentAlt: string, warm: string) {
  return (
    <>
      <rect x="66" y="62" width="252" height="150" rx="20" fill={panel} stroke={accent} strokeOpacity="0.7" strokeWidth="2" />
      <rect x="66" y="62" width="252" height="30" rx="20" fill="#0a1730" />
      <circle cx="90" cy="77" r="4" fill="#ff6b7d" />
      <circle cx="106" cy="77" r="4" fill="#ffb86b" />
      <circle cx="122" cy="77" r="4" fill="#3efa95" />
      <rect x="148" y="71" width="128" height="12" rx="6" fill="#122645" stroke={accentAlt} strokeOpacity="0.4" />
      <path d="M110 126H250" stroke={accent} strokeOpacity="0.5" strokeWidth="2.2" strokeDasharray="10 8" />
      <path d="M110 152H206" stroke={accentAlt} strokeOpacity="0.6" strokeWidth="2.2" strokeDasharray="12 8" />
      <path d="M110 178H234" stroke="#3efa95" strokeOpacity="0.6" strokeWidth="2.2" strokeDasharray="7 7" />
      <g transform="translate(336 84)">
        <path d="M50 0L83 14V41C83 62 68 82 50 92C32 82 17 62 17 41V14L50 0Z" fill={panel} stroke={accent} strokeWidth="2.4" />
        <rect x="38" y="34" width="24" height="17" rx="5" fill={accentAlt} fillOpacity="0.2" stroke={accentAlt} strokeWidth="1.8" />
        <path d="M43 34V28C43 24 46 20 50 20C54 20 57 24 57 28V34" fill="none" stroke={accentAlt} strokeWidth="1.8" />
      </g>
      <g transform="translate(332 144)">
        <ellipse cx="34" cy="24" rx="19" ry="15" fill={warm} fillOpacity="0.18" stroke={warm} strokeWidth="1.8" />
        <circle cx="22" cy="13" r="5" fill={warm} fillOpacity="0.22" stroke={warm} strokeWidth="1.8" />
        <circle cx="46" cy="13" r="5" fill={warm} fillOpacity="0.22" stroke={warm} strokeWidth="1.8" />
        <circle cx="24" cy="19" r="2.2" fill="#fff" />
        <circle cx="44" cy="19" r="2.2" fill="#fff" />
        <path d="M34 24V35M19 29L10 35M49 29L58 35M27 38L22 48M41 38L46 48" stroke={warm} strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </>
  );
}

function pentestScene(panel: string, scan: string, accent: string, accentAlt: string, warm: string) {
  return (
    <>
      <circle cx="318" cy="136" r="82" fill={panel} stroke={accent} strokeOpacity="0.82" strokeWidth="2.4" />
      <circle cx="318" cy="136" r="56" fill="none" stroke={accentAlt} strokeOpacity="0.42" strokeWidth="2" />
      <circle cx="318" cy="136" r="28" fill="none" stroke={accent} strokeOpacity="0.45" strokeWidth="2" />
      <path d="M236 136H400M318 54V218" stroke="#ffdfe4" strokeOpacity="0.3" strokeWidth="1.6" strokeDasharray="6 8" />
      <path d="M318 136L384 84A82 82 0 0 1 400 136Z" fill={`url(#${scan})`} className="cp-art__scan" />
      <circle className="cp-art__pulse" cx="352" cy="112" r="6" fill={warm} />
      <circle className="cp-art__pulse cp-art__pulse--alt" cx="286" cy="168" r="6" fill={accentAlt} />
      <circle className="cp-art__pulse" cx="336" cy="174" r="6" fill={accent} />
      <g transform="translate(78 92)">
        <path d="M0 34H112M56 0V112" stroke={accent} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="56" cy="56" r="34" fill="none" stroke={accentAlt} strokeWidth="2.4" />
        <circle cx="56" cy="56" r="11" fill={warm} fillOpacity="0.18" stroke={warm} strokeWidth="2" />
      </g>
      <path d="M88 206H196" stroke={warm} strokeOpacity="0.7" strokeWidth="2.2" strokeDasharray="8 8" />
    </>
  );
}

function detectionScene(panel: string, accent: string, accentAlt: string, warm: string) {
  return (
    <>
      <rect x="68" y="70" width="164" height="136" rx="20" fill={panel} stroke={accent} strokeWidth="2" />
      <path d="M94 102H202M94 126H186M94 150H204M94 174H170" stroke={accent} strokeOpacity="0.65" strokeWidth="2.4" strokeDasharray="10 8" />
      <path d="M252 190H394" stroke="#dff8ff" strokeOpacity="0.12" strokeWidth="36" strokeLinecap="round" />
      <rect x="262" y="154" width="22" height="36" rx="10" fill={accent} fillOpacity="0.26" stroke={accent} strokeWidth="1.8" />
      <rect x="296" y="136" width="22" height="54" rx="10" fill="#3efa95" fillOpacity="0.24" stroke="#3efa95" strokeWidth="1.8" />
      <rect x="330" y="118" width="22" height="72" rx="10" fill={accentAlt} fillOpacity="0.24" stroke={accentAlt} strokeWidth="1.8" />
      <rect x="364" y="98" width="22" height="92" rx="10" fill={warm} fillOpacity="0.24" stroke={warm} strokeWidth="1.8" />
      <path d="M260 130L300 112L338 128L378 86" fill="none" stroke="#dff8ff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(324 68)">
        <circle cx="40" cy="42" r="28" fill="none" stroke={accent} strokeWidth="2.6" />
        <path d="M60 62L82 84" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <circle className="cp-art__pulse" cx="28" cy="32" r="5" fill={warm} />
      </g>
      <path d="M394 64L412 98H376Z" fill={warm} fillOpacity="0.18" stroke={warm} strokeWidth="2" />
      <path d="M394 80V89" stroke={warm} strokeWidth="3" strokeLinecap="round" />
      <circle cx="394" cy="95" r="2.2" fill={warm} />
    </>
  );
}

function cryptographyScene(panel: string, accent: string, accentAlt: string, warm: string) {
  return (
    <>
      <circle cx="314" cy="136" r="72" fill={panel} stroke={accentAlt} strokeWidth="2.4" />
      <circle cx="314" cy="136" r="46" fill="none" stroke={accent} strokeOpacity="0.62" strokeWidth="2" />
      <path d="M314 78V194M256 136H372M276 98L352 174M276 174L352 98" stroke="#dff8ff" strokeOpacity="0.2" strokeWidth="1.6" strokeDasharray="6 7" />
      <path d="M92 154H178C196 154 210 140 210 122C210 104 196 90 178 90C161 90 146 104 146 122V136H170" fill="none" stroke={accent} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="214" cy="154" r="18" fill={panel} stroke={warm} strokeWidth="4" />
      <path d="M214 172V196" stroke={warm} strokeWidth="4" strokeLinecap="round" />
      <path d="M108 204H208" stroke={accentAlt} strokeOpacity="0.6" strokeWidth="2.2" strokeDasharray="5 7" />
      <path d="M252 48H372M252 58H372M252 68H372" stroke={accent} strokeOpacity="0.18" strokeWidth="2" strokeDasharray="4 10" />
    </>
  );
}

function cloudScene(panel: string, accent: string, accentAlt: string) {
  return (
    <>
      <path d="M112 150H314C336 150 354 132 354 110C354 88 337 71 315 70C308 49 289 34 267 34C238 34 214 57 214 86C214 88 214 90 215 92C207 82 194 76 179 76C154 76 134 96 134 121C134 123 134 125 135 127C122 131 112 140 112 150Z" fill={panel} stroke={accent} strokeWidth="2.2" />
      <rect x="118" y="158" width="84" height="60" rx="16" fill={panel} stroke={accentAlt} strokeWidth="2" />
      <rect x="214" y="158" width="84" height="60" rx="16" fill={panel} stroke={accent} strokeWidth="2" />
      <rect x="310" y="158" width="60" height="60" rx="16" fill={panel} stroke="#3efa95" strokeWidth="2" />
      <path d="M140 178H180M140 194H180M236 178H276M236 194H276M326 178H354M326 194H354" stroke="#dff8ff" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
      <path d="M394 76L427 90V120C427 138 414 154 394 164C374 154 361 138 361 120V90L394 76Z" fill={panel} stroke="#3efa95" strokeWidth="2.2" />
      <rect x="382" y="113" width="24" height="18" rx="5" fill="#3efa95" fillOpacity="0.16" stroke="#3efa95" strokeWidth="1.8" />
      <path d="M387 113V107C387 103 390 100 394 100C398 100 401 103 401 107V113" fill="none" stroke="#3efa95" strokeWidth="1.8" />
    </>
  );
}

function malwareScene(panel: string, accent: string, accentAlt: string, warm: string) {
  return (
    <>
      <g transform="translate(132 132)">
        <circle cx="0" cy="0" r="42" fill={panel} stroke={warm} strokeWidth="2.4" />
        {pointString([
          [0, -66],
          [0, -46],
          [0, 46],
          [0, 66],
          [-66, 0],
          [-46, 0],
          [46, 0],
          [66, 0],
          [-48, -48],
          [-34, -34],
          [48, -48],
          [34, -34],
          [-48, 48],
          [-34, 34],
          [48, 48],
          [34, 34],
        ]).split(" ").map((segment, index) => {
          const [x, y] = segment.split(",").map(Number);
          return <path key={`${x}-${y}-${index}`} d={`M0 0L${x} ${y}`} stroke={warm} strokeWidth="4" strokeLinecap="round" />;
        })}
        <circle cx="-12" cy="-8" r="6" fill="#fff" />
        <circle cx="14" cy="-8" r="6" fill="#fff" />
        <path d="M-18 18C-8 8 8 8 18 18" fill="none" stroke={accentAlt} strokeWidth="4" strokeLinecap="round" />
      </g>
      <rect x="256" y="84" width="142" height="106" rx="20" fill="none" stroke={accent} strokeWidth="2.4" strokeDasharray="10 8" />
      <rect x="274" y="102" width="106" height="70" rx="16" fill={panel} stroke={accentAlt} strokeWidth="2" />
      <path d="M290 137H364" stroke={accentAlt} strokeOpacity="0.5" strokeWidth="2.2" strokeDasharray="6 8" />
      <path d="M302 120H352M302 154H344" stroke={accent} strokeOpacity="0.42" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

function forensicsScene(panel: string, accent: string, accentAlt: string, warm: string) {
  return (
    <>
      <circle cx="156" cy="136" r="62" fill={panel} stroke={accent} strokeWidth="2.4" />
      <circle cx="156" cy="136" r="22" fill="none" stroke={accentAlt} strokeWidth="2" />
      <path d="M126 106H186M156 74V198" stroke="#dff8ff" strokeOpacity="0.18" strokeWidth="1.5" strokeDasharray="6 7" />
      <path d="M228 86H398" stroke="#dff8ff" strokeOpacity="0.12" strokeWidth="20" strokeLinecap="round" />
      <path d="M228 136H398" stroke="#dff8ff" strokeOpacity="0.12" strokeWidth="20" strokeLinecap="round" />
      <path d="M228 186H398" stroke="#dff8ff" strokeOpacity="0.12" strokeWidth="20" strokeLinecap="round" />
      <path d="M252 186V96" stroke={accentAlt} strokeOpacity="0.4" strokeWidth="2" strokeDasharray="4 8" />
      <circle className="cp-art__pulse" cx="252" cy="132" r="7" fill={warm} />
      <circle className="cp-art__pulse" cx="332" cy="108" r="7" fill={accent} />
      <circle className="cp-art__pulse cp-art__pulse--alt" cx="366" cy="156" r="7" fill={accentAlt} />
      <g transform="translate(284 54)">
        <circle cx="34" cy="34" r="24" fill="none" stroke={accent} strokeWidth="2.4" />
        <path d="M50 50L72 72" stroke={accent} strokeWidth="3.2" strokeLinecap="round" />
      </g>
    </>
  );
}

function governanceScene(panel: string, accent: string, accentAlt: string, warm: string) {
  return (
    <>
      <rect x="86" y="62" width="152" height="160" rx="22" fill={panel} stroke={accent} strokeWidth="2.2" />
      <path d="M128 62C128 50 136 42 148 42H176C188 42 196 50 196 62" fill="none" stroke={accentAlt} strokeWidth="2" />
      <path d="M116 102H206M116 132H206M116 162H186" stroke="#dff8ff" strokeOpacity="0.3" strokeWidth="2.2" />
      <path d="M124 98L132 106L148 90" fill="none" stroke="#3efa95" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M124 128L132 136L148 120" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="164" cy="194" r="18" fill={warm} fillOpacity="0.18" stroke={warm} strokeWidth="2" />
      <path d="M152 194H176M164 182V206" stroke={warm} strokeWidth="2.4" />
      <g transform="translate(290 72)">
        <path d="M0 102H104" stroke={accentAlt} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M52 12V102" stroke={accentAlt} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M14 30H90" stroke={accentAlt} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M18 30L0 62H36L18 30Z" fill={panel} stroke={accent} strokeWidth="2" />
        <path d="M86 30L68 62H104L86 30Z" fill={panel} stroke="#3efa95" strokeWidth="2" />
      </g>
    </>
  );
}

function mobileScene(panel: string, accent: string, accentAlt: string) {
  return (
    <>
      <rect x="148" y="54" width="104" height="170" rx="28" fill={panel} stroke={accent} strokeWidth="2.4" />
      <rect x="162" y="76" width="76" height="110" rx="18" fill="#061325" stroke={accentAlt} strokeOpacity="0.5" />
      <circle cx="200" cy="204" r="7" fill={accent} />
      <circle cx="332" cy="84" r="20" fill={panel} stroke={accentAlt} strokeWidth="2" />
      <circle cx="362" cy="138" r="16" fill={panel} stroke="#3efa95" strokeWidth="2" />
      <circle cx="312" cy="182" r="18" fill={panel} stroke={accent} strokeWidth="2" />
      <path d="M252 124H312M250 154H346M236 190H294" stroke="#dff8ff" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="5 6" />
      <path d="M188 116H212M176 138H224M170 160H218" stroke={accent} strokeOpacity="0.52" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M362 114C374 122 378 136 376 150" fill="none" stroke="#3efa95" strokeWidth="2.2" strokeLinecap="round" />
    </>
  );
}

function aiScene(panel: string, accent: string, accentAlt: string) {
  return (
    <>
      <rect x="190" y="88" width="108" height="94" rx="22" fill={panel} stroke={accentAlt} strokeWidth="2.4" />
      <path d="M214 108H274M214 136H252M214 164H278" stroke={accent} strokeOpacity="0.54" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="108" cy="94" r="9" fill={accent} />
      <circle cx="144" cy="164" r="9" fill="#3efa95" />
      <circle cx="196" cy="68" r="9" fill={accentAlt} />
      <circle cx="336" cy="84" r="9" fill={accent} />
      <circle cx="374" cy="160" r="9" fill="#3efa95" />
      <circle cx="304" cy="206" r="9" fill={accentAlt} />
      <path d="M117 94L188 110M152 164L190 154M204 75L220 88M298 100L327 87M298 166L366 160M280 182L302 198" stroke="#dff8ff" strokeOpacity="0.42" strokeWidth="2.2" />
      <path d="M174 52H314M174 218H314" stroke={accentAlt} strokeOpacity="0.18" strokeWidth="2" strokeDasharray="7 9" />
      <circle className="cp-art__pulse" cx="252" cy="136" r="9" fill={accentAlt} />
    </>
  );
}

function windowsScene(panel: string, accent: string, accentAlt: string) {
  return (
    <>
      <path d="M112 74L228 58V126L112 132V74ZM240 56L368 42V122L240 126V56ZM112 144L228 140V210L112 196V144ZM240 138L368 134V228L240 214V138Z" fill={panel} stroke={accent} strokeWidth="2.2" />
      <circle cx="392" cy="76" r="10" fill={accentAlt} />
      <circle cx="346" cy="126" r="10" fill={accent} />
      <circle cx="418" cy="136" r="10" fill="#3efa95" />
      <circle cx="362" cy="184" r="10" fill={accentAlt} />
      <path d="M392 86V102M392 102H418M418 146V102M346 136V160M346 160H362M362 194V160" stroke="#dff8ff" strokeOpacity="0.4" strokeWidth="2.2" />
      <path d="M332 72H428" stroke={accent} strokeOpacity="0.16" strokeWidth="2" strokeDasharray="5 7" />
      <path d="M326 200H424" stroke={accentAlt} strokeOpacity="0.16" strokeWidth="2" strokeDasharray="5 7" />
    </>
  );
}

function abstractScene(seed: number, panel: string, accent: string, accentAlt: string, warm: string) {
  const variant = seed % 3;
  if (variant === 0) {
    return (
      <>
        <path d="M228 58L316 110V196L228 248L140 196V110Z" fill={panel} stroke={accent} strokeWidth="2.4" />
        <path d="M228 58V248M140 110L316 196M316 110L140 196" stroke="#dff8ff" strokeOpacity="0.2" strokeWidth="1.8" />
        <circle className="cp-art__pulse" cx="228" cy="152" r="18" fill={warm} fillOpacity="0.22" />
      </>
    );
  }
  if (variant === 1) {
    return (
      <>
        <path d="M72 166C118 108 188 86 262 104C320 118 374 108 430 70" fill="none" stroke={accent} strokeWidth="16" strokeLinecap="round" strokeOpacity="0.18" />
        <path d="M72 190C118 132 188 110 262 128C320 142 374 132 430 94" fill="none" stroke={accentAlt} strokeWidth="12" strokeLinecap="round" strokeOpacity="0.22" />
        <path d="M90 212C136 154 206 132 280 150C338 164 392 154 448 116" fill="none" stroke={warm} strokeWidth="8" strokeLinecap="round" strokeOpacity="0.22" />
        <circle className="cp-art__pulse" cx="202" cy="120" r="9" fill={accent} />
        <circle className="cp-art__pulse" cx="304" cy="142" r="9" fill={accentAlt} />
        <circle className="cp-art__pulse" cx="378" cy="122" r="9" fill={warm} />
      </>
    );
  }
  return (
    <>
      <rect x="126" y="66" width="228" height="138" rx="30" fill={panel} stroke={accentAlt} strokeWidth="2.4" />
      <path d="M154 102H326M154 136H308M154 170H276" stroke={accent} strokeOpacity="0.52" strokeWidth="2.4" strokeLinecap="round" />
      <circle className="cp-art__pulse" cx="344" cy="94" r="12" fill={warm} />
      <circle className="cp-art__pulse cp-art__pulse--alt" cx="118" cy="180" r="12" fill="#3efa95" />
    </>
  );
}

function sceneMarkup(scene: CourseSceneKey, seed: number, panel: string, scan: string, accent: string, accentAlt: string, warm: string) {
  switch (scene) {
    case "fondamentaux":
      return fundamentalsScene(panel, scan, accent, accentAlt);
    case "reseaux":
      return networkScene(panel, scan, accent, accentAlt);
    case "linux":
      return linuxScene(panel, accent, accentAlt);
    case "securite-web":
      return webScene(panel, accent, accentAlt, warm);
    case "pentest":
      return pentestScene(panel, scan, accent, accentAlt, warm);
    case "detection":
      return detectionScene(panel, accent, accentAlt, warm);
    case "cryptographie":
      return cryptographyScene(panel, accent, accentAlt, warm);
    case "cloud":
      return cloudScene(panel, accent, accentAlt);
    case "malware":
      return malwareScene(panel, accent, accentAlt, warm);
    case "forensique":
      return forensicsScene(panel, accent, accentAlt, warm);
    case "gouvernance":
      return governanceScene(panel, accent, accentAlt, warm);
    case "mobile":
      return mobileScene(panel, accent, accentAlt);
    case "ia":
      return aiScene(panel, accent, accentAlt);
    case "windows":
      return windowsScene(panel, accent, accentAlt);
    case "abstract":
    default:
      return abstractScene(seed, panel, accent, accentAlt, warm);
  }
}

export default function CourseArt({ slug, category, className, photo = false, sizes, priority }: CourseArtProps) {
  const scene = sceneKey(slug, category);
  if (photo) {
    return <PhotoCover src={`/images/covers/course-${scene}.webp`} className={className} sizes={sizes} priority={priority} />;
  }
  const seedKey = normalizeArtKey(slug) || normalizeArtKey(category) || "course";
  const seed = hashArtKey(seedKey);
  const palette = paletteForScene(scene, seed);

  return (
    <ArtCanvas className={cn("cp-course-art", className)} palette={palette}>
      {(ids) => (
        <>
          {commonFrame(scene)}
          {sceneMarkup(scene, seed, `url(#${ids.panel})`, ids.scan, palette.accent, palette.accentAlt, palette.warm)}
        </>
      )}
    </ArtCanvas>
  );
}
