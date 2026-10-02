#!/usr/bin/env node
/*
 * Génère les visuels raster de CyberPingo (bannières, couvertures de cours et
 * de labs, fond d'authentification, image de partage) à partir de scènes SVG
 * composées localement avec Pingo. Aucune image externe, aucun texte rendu.
 *
 *   node scripts/generate-images.cjs            # tout régénérer
 *   node scripts/generate-images.cjs covers     # un seul groupe
 *
 * Sortie : public/images/{banners,covers,scenes} + og-cyberpingo.jpg
 */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "images");

const PAL = {
  cyan: { a: "#00d5ff", b: "#9a64ff", c: "#3efa95", warm: "#ffb86b", s1: "#071a33", s2: "#1b4478" },
  green: { a: "#3efa95", b: "#00d5ff", c: "#9a64ff", warm: "#ffb86b", s1: "#061c24", s2: "#16504a" },
  violet: { a: "#9a64ff", b: "#00d5ff", c: "#3efa95", warm: "#ffb86b", s1: "#0e0f31", s2: "#3b2f7c" },
  red: { a: "#ff6b7d", b: "#9a64ff", c: "#ffb86b", warm: "#ffb86b", s1: "#1d0c26", s2: "#53254f" },
  amber: { a: "#ffb86b", b: "#00d5ff", c: "#3efa95", warm: "#ffb86b", s1: "#101c33", s2: "#43405f" },
  blue: { a: "#3b8bff", b: "#00d5ff", c: "#9a64ff", warm: "#ffb86b", s1: "#071836", s2: "#1a4a98" },
};

function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (v) => Number(v.toFixed(2));
const rrp = (x, y, w, h, r) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const glass = (d, extra = "") =>
  `<path d="${d}" fill="url(#panel)" stroke="url(#edge)" stroke-width="3.5" ${extra}/><path d="${d}" fill="url(#sheen)"/>`;
const led = (x, y, c, r = 5) =>
  `<circle cx="${x}" cy="${y}" r="${r * 2.8}" fill="${c}" opacity=".4" filter="url(#soft)"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const bar = (x1, y1, x2, y2, c, w = 8, o = 1) =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;
const white = "#e9f8ff";

function defs(P) {
  return `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.s1}"/><stop offset="1" stop-color="#030816"/></linearGradient>
  <radialGradient id="gA"><stop offset="0" stop-color="${P.a}" stop-opacity=".6"/><stop offset="1" stop-color="${P.a}" stop-opacity="0"/></radialGradient>
  <radialGradient id="gB"><stop offset="0" stop-color="${P.b}" stop-opacity=".55"/><stop offset="1" stop-color="${P.b}" stop-opacity="0"/></radialGradient>
  <radialGradient id="gC"><stop offset="0" stop-color="${P.c}" stop-opacity=".5"/><stop offset="1" stop-color="${P.c}" stop-opacity="0"/></radialGradient>
  <radialGradient id="vignette" cx=".6" cy=".5" r=".85"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
  <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.s2}"/><stop offset="1" stop-color="${P.s1}"/></linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".5" stop-color="${P.a}" stop-opacity=".9"/><stop offset="1" stop-color="${P.b}" stop-opacity=".85"/></linearGradient>
  <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.a}"/><stop offset="1" stop-color="${P.b}"/></linearGradient>
  <linearGradient id="warm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.warm}"/><stop offset="1" stop-color="#ff6b7d"/></linearGradient>
  <linearGradient id="green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${P.c}"/><stop offset="1" stop-color="#00d5ff"/></linearGradient>
  <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1fbff"/><stop offset=".5" stop-color="${P.a}"/><stop offset="1" stop-color="${P.b}"/></linearGradient>
  <linearGradient id="fadeUp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff"/></linearGradient>
  <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${P.a}" stop-opacity="0"/><stop offset="1" stop-color="${P.a}" stop-opacity=".7"/></linearGradient>
  <radialGradient id="pgIris" cx="42%" cy="34%" r="72%"><stop offset="0" stop-color="#5cb2ff"/><stop offset=".5" stop-color="#1849c2"/><stop offset="1" stop-color="#061233"/></radialGradient>
  <linearGradient id="pgCloth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2748"/><stop offset="1" stop-color="#060a16"/></linearGradient>
  <linearGradient id="pgFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dbe7f7"/></linearGradient>
  <filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.5"/></filter>
  <filter id="blur30" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
  <filter id="blur6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
  <mask id="floorMask"><rect width="100%" height="100%" fill="url(#fadeUp)"/></mask>
</defs>`;
}

function backdrop(W, H, P, seed, horizon = 0.64) {
  const r = rng(seed);
  const hy = H * horizon;
  const vx = W * 0.7;
  let s = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
  s += `<circle cx="${n(W * 0.8)}" cy="${n(H * 0.38)}" r="${n(H * 1.15)}" fill="url(#gA)"/>`;
  s += `<circle cx="${n(W * 0.52)}" cy="${n(H * 0.95)}" r="${n(H * 0.95)}" fill="url(#gB)" opacity=".7"/>`;
  s += `<circle cx="${n(W * 0.96)}" cy="${n(H * 1.02)}" r="${n(H * 0.7)}" fill="url(#gC)" opacity=".45"/>`;

  s += `<g mask="url(#floorMask)" stroke="${P.a}" stroke-width="1.6" opacity=".34" fill="none">`;
  for (let i = -16; i <= 16; i += 1) s += `<path d="M${n(vx)} ${n(hy)}L${n(vx + i * W * 0.12)} ${H}"/>`;
  for (let t = 1; t <= 9; t += 1) {
    const y = hy + (H - hy) * (t / 9) ** 2;
    s += `<path d="M0 ${n(y)}H${W}"/>`;
  }
  s += `</g>`;

  s += `<g fill="none" stroke="${P.a}" stroke-width="2" opacity=".22" stroke-linecap="round" stroke-linejoin="round">`;
  for (let k = 0; k < 9; k += 1) {
    let x = r() * W * 0.62;
    let y = r() * H;
    let d = `M${n(x)} ${n(y)}`;
    for (let seg = 0; seg < 4; seg += 1) {
      if (seg % 2 === 0) x += (r() - 0.35) * 220;
      else y += (r() - 0.5) * 160;
      d += `L${n(x)} ${n(y)}`;
    }
    s += `<path d="${d}"/><circle cx="${n(x)}" cy="${n(y)}" r="4.5" fill="${k % 2 ? P.c : P.a}" stroke="none"/>`;
  }
  s += `</g>`;

  const count = Math.round((W * H) / 11000);
  for (let k = 0; k < count; k += 1) {
    const x = r() * W;
    const y = r() * H;
    const size = 0.8 + r() * 2.2;
    const colour = [white, P.a, P.c, P.b][Math.floor(r() * 4)];
    const blur = r() > 0.82 ? ` filter="url(#soft)"` : "";
    s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(size)}" fill="${colour}" opacity="${n(0.2 + r() * 0.6)}"${blur}/>`;
  }
  return s;
}

const objects = {
  shield: (P) => {
    const d = "M200 22L332 72V190C332 282 276 346 200 380C124 346 68 282 68 190V72Z";
    return `${glass(d)}<path d="M200 56L304 94V190C304 262 262 316 200 346C138 316 96 262 96 190V94Z" fill="url(#accent)" opacity=".2"/>
<path d="M146 198L186 238L260 150" fill="none" stroke="${P.c}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" opacity=".7"/>
<path d="M146 198L186 238L260 150" fill="none" stroke="${P.c}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`;
  },
  padlock: (P) => `<path d="M122 190V132C122 86 154 58 200 58C246 58 278 86 278 132V190" fill="none" stroke="url(#metal)" stroke-width="34" stroke-linecap="round"/>
${glass(rrp(70, 172, 260, 200, 42))}
<circle cx="200" cy="262" r="30" fill="${P.a}" filter="url(#glow)" opacity=".7"/>
<circle cx="200" cy="258" r="26" fill="url(#accent)"/>${bar(200, 262, 200, 332, "url(#accent)", 20)}`,
  server: (P) =>
    [60, 152, 244]
      .map(
        (y, i) => `${glass(rrp(44, y, 312, 78, 22))}
${bar(80, y + 39, 190, y + 39, white, 7, 0.28)}${bar(80, y + 22, 150, y + 22, white, 5, 0.16)}${bar(80, y + 56, 130, y + 56, white, 5, 0.16)}
${led(300, y + 39, i === 1 ? P.warm : P.c, 6)}${led(326, y + 39, P.a, 6)}`,
      )
      .join(""),
  network: (P) => {
    const nodes = [[78, 96, 28, P.c], [326, 84, 30, P.b], [70, 306, 26, P.warm], [334, 312, 32, P.a], [200, 40, 20, P.a], [200, 362, 20, P.c]];
    let s = "";
    nodes.forEach(([x, y]) => (s += `<path d="M200 200L${x} ${y}" stroke="${P.a}" stroke-width="4" opacity=".5" stroke-dasharray="2 12" stroke-linecap="round"/>`));
    s += `<path d="M78 96L70 306M326 84L334 312" stroke="${P.b}" stroke-width="3" opacity=".3"/>`;
    nodes.forEach(([x, y, r, c]) => {
      s += `<circle cx="${x}" cy="${y}" r="${r * 2}" fill="${c}" opacity=".28" filter="url(#glow)"/>`;
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#panel)" stroke="${c}" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${r * 0.36}" fill="${c}"/>`;
    });
    s += `<circle cx="200" cy="200" r="104" fill="${P.a}" opacity=".18" filter="url(#glow)"/><circle cx="200" cy="200" r="66" fill="url(#panel)" stroke="url(#edge)" stroke-width="4"/>`;
    s += `<circle cx="200" cy="200" r="92" fill="none" stroke="${P.a}" stroke-width="2" opacity=".5" stroke-dasharray="4 10"/>`;
    s += `<path d="M168 200H232M200 168V232M176 176L224 224M224 176L176 224" stroke="${white}" stroke-width="4" stroke-linecap="round" opacity=".6"/>`;
    return s + `<circle cx="200" cy="200" r="12" fill="${P.a}"/>`;
  },
  terminal: (P) => `${glass(rrp(26, 66, 348, 268, 28))}
<path d="M54 66H346A28 28 0 0 1 374 94V118H26V94A28 28 0 0 1 54 66Z" fill="#000" opacity=".3"/>
<circle cx="60" cy="92" r="7" fill="#ff6b7d"/><circle cx="84" cy="92" r="7" fill="#ffb86b"/><circle cx="108" cy="92" r="7" fill="#3efa95"/>
<path d="M62 168L94 196L62 224" fill="none" stroke="${P.a}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
${bar(116, 224, 250, 224, P.a, 11)}${bar(62, 266, 220, 266, P.c, 9, 0.8)}${bar(62, 296, 160, 296, white, 9, 0.3)}
<rect x="266" y="204" width="22" height="30" rx="4" fill="${P.c}"/><rect x="266" y="204" width="22" height="30" rx="4" fill="${P.c}" filter="url(#soft)"/>`,
  browser: (P) => `${glass(rrp(22, 58, 356, 284, 28))}
<path d="M50 58H350A28 28 0 0 1 378 86V120H22V86A28 28 0 0 1 50 58Z" fill="#000" opacity=".3"/>
<circle cx="56" cy="90" r="7" fill="#ff6b7d"/><circle cx="80" cy="90" r="7" fill="#ffb86b"/><circle cx="104" cy="90" r="7" fill="#3efa95"/>
<path d="${rrp(132, 76, 216, 28, 14)}" fill="#fff" opacity=".14"/>
<path d="M130 196L90 236L130 276M270 196L310 236L270 276" fill="none" stroke="${P.a}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
${bar(226, 188, 182, 286, P.c, 12)}<circle cx="338" cy="300" r="26" fill="#ff6b7d" filter="url(#glow)" opacity=".6"/><path d="M338 286V304" stroke="#fff" stroke-width="8" stroke-linecap="round"/><circle cx="338" cy="316" r="4.5" fill="#fff"/>`,
  radar: (P) => {
    const arc = (deg) => `${n(200 + 170 * Math.cos((deg * Math.PI) / 180))} ${n(200 + 170 * Math.sin((deg * Math.PI) / 180))}`;
    return `<circle cx="200" cy="200" r="176" fill="url(#panel)" stroke="url(#edge)" stroke-width="4"/>
<circle cx="200" cy="200" r="176" fill="url(#sheen)"/>
<g fill="none" stroke="${P.a}" opacity=".45" stroke-width="2.4"><circle cx="200" cy="200" r="124"/><circle cx="200" cy="200" r="74"/><circle cx="200" cy="200" r="26"/><path d="M200 24V376M24 200H376"/></g>
<path d="M200 200L${arc(-100)}A170 170 0 0 1 ${arc(-35)}Z" fill="url(#sweep)" transform="rotate(8 200 200)" opacity=".9"/>
${led(274, 120, "#ff6b7d", 9)}${led(130, 262, "#ff6b7d", 7)}${led(294, 262, P.warm, 8)}
<circle cx="200" cy="200" r="9" fill="${white}"/>`;
  },
  magnifier: (P) => `${glass(rrp(34, 46, 236, 296, 28))}
${bar(70, 96, 190, 96, white, 10, 0.3)}${bar(70, 132, 232, 132, white, 10, 0.18)}${bar(70, 168, 160, 168, P.warm, 10, 0.9)}${bar(70, 204, 220, 204, white, 10, 0.18)}${bar(70, 240, 188, 240, "#ff6b7d", 10, 0.9)}${bar(70, 276, 134, 276, white, 10, 0.2)}
<circle cx="256" cy="226" r="96" fill="${P.a}" opacity=".16"/>
<circle cx="256" cy="226" r="96" fill="url(#sheen)" opacity=".7"/>
<circle cx="256" cy="226" r="96" fill="none" stroke="url(#metal)" stroke-width="18"/>
${bar(326, 296, 372, 346, "url(#metal)", 30)}`,
  bug: (P) => `<g stroke="${P.warm}" stroke-width="10" stroke-linecap="round" fill="none" opacity=".9"><path d="M138 182Q86 170 56 128M134 234Q74 238 38 270M142 280Q96 312 90 352M262 182Q314 170 344 128M266 234Q326 238 362 270M258 280Q304 312 310 352M172 92Q150 56 124 46M228 92Q250 56 276 46"/></g>
<ellipse cx="200" cy="244" rx="82" ry="108" fill="url(#panel)" stroke="url(#edge)" stroke-width="4"/>
<ellipse cx="200" cy="244" rx="82" ry="108" fill="url(#sheen)"/>
<path d="M200 138V350M122 214Q200 232 278 214M120 274Q200 292 280 274" stroke="${P.a}" stroke-width="5" opacity=".5" fill="none"/>
<circle cx="200" cy="112" r="44" fill="url(#panel)" stroke="url(#edge)" stroke-width="4"/>
<circle cx="182" cy="108" r="10" fill="#ff6b7d" filter="url(#soft)"/><circle cx="218" cy="108" r="10" fill="#ff6b7d" filter="url(#soft)"/><circle cx="182" cy="108" r="6" fill="#fff"/><circle cx="218" cy="108" r="6" fill="#fff"/>
<circle cx="160" cy="240" r="12" fill="${P.a}" opacity=".6"/><circle cx="242" cy="270" r="14" fill="${P.a}" opacity=".6"/><circle cx="214" cy="212" r="9" fill="#ff6b7d"/>`,
  cloud: (P) => {
    const d = "M112 304C58 304 34 264 52 228C66 198 100 190 120 200C126 150 172 110 226 120C272 128 298 160 302 196C350 192 374 238 352 272C340 294 318 304 296 304Z";
    return `${glass(d)}<path d="M200 274V190M162 226L200 186L238 226" fill="none" stroke="${P.c}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)" opacity=".6"/>
<path d="M200 274V190M162 226L200 186L238 226" fill="none" stroke="${P.c}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
${led(88, 346, P.a, 6)}${led(200, 352, P.c, 6)}${led(312, 346, P.b, 6)}<path d="M88 346V304M200 352V304M312 346V304" stroke="${P.a}" stroke-width="3" opacity=".5" stroke-dasharray="3 8"/>`;
  },
  phone: (P) => `${glass(rrp(108, 18, 184, 364, 42))}
<path d="${rrp(124, 54, 152, 292, 28)}" fill="#040c1d" stroke="${P.a}" stroke-opacity=".5" stroke-width="2"/>
<path d="${rrp(168, 32, 64, 12, 6)}" fill="#000" opacity=".6"/>
<circle cx="200" cy="168" r="62" fill="${P.a}" opacity=".16" filter="url(#glow)"/>
<path d="M170 168V150C170 134 183 122 200 122C217 122 230 134 230 150V168" fill="none" stroke="url(#metal)" stroke-width="12" stroke-linecap="round"/>
<path d="${rrp(160, 164, 80, 62, 14)}" fill="url(#accent)"/><circle cx="200" cy="194" r="9" fill="#040c1d"/>
${bar(152, 270, 248, 270, white, 9, 0.28)}${bar(166, 300, 234, 300, white, 8, 0.16)}`,
  chip: (P) => {
    let pins = "";
    for (let i = 0; i < 5; i += 1) {
      const p = 118 + i * 41;
      pins += `<path d="M${p} 84V50M${p} 316V350M84 ${p}H50M316 ${p}H350" stroke="url(#metal)" stroke-width="9" stroke-linecap="round" opacity=".9"/>`;
    }
    return `${pins}${glass(rrp(84, 84, 232, 232, 38))}
<path d="${rrp(126, 126, 148, 148, 22)}" fill="${P.a}" opacity=".14" stroke="${P.a}" stroke-width="2.5"/>
<g stroke="${P.a}" stroke-width="3.5" opacity=".7"><path d="M156 156L200 200L244 156M156 244L200 200L244 244M156 200H244"/></g>
<circle cx="200" cy="200" r="34" fill="${P.b}" opacity=".5" filter="url(#glow)"/><circle cx="200" cy="200" r="16" fill="url(#accent)"/>
${led(156, 156, P.c, 7)}${led(244, 156, P.a, 7)}${led(156, 244, P.warm, 7)}${led(244, 244, P.c, 7)}`;
  },
  windows: (P) => `<g transform="rotate(-5 200 200)">
${[[56, 56, "accent"], [210, 56, "green"], [56, 210, "warm"], [210, 210, "accent"]]
  .map(([x, y, g]) => `<path d="${rrp(x, y, 134, 134, 22)}" fill="url(#${g})" opacity=".92"/><path d="${rrp(x, y, 134, 134, 22)}" fill="url(#sheen)"/><path d="${rrp(x, y, 134, 134, 22)}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`)
  .join("")}</g>`,
  certificate: (P) => `${glass(rrp(26, 56, 348, 252, 28))}
<path d="${rrp(46, 76, 308, 212, 18)}" fill="none" stroke="${P.warm}" stroke-opacity=".5" stroke-width="2.5" stroke-dasharray="6 8"/>
${bar(78, 118, 236, 118, white, 13, 0.6)}${bar(78, 156, 214, 156, white, 9, 0.28)}${bar(78, 186, 196, 186, white, 9, 0.28)}${bar(78, 216, 160, 216, white, 9, 0.2)}
<path d="M278 296L262 366L300 346L336 366L322 296Z" fill="url(#warm)" opacity=".92"/>
<circle cx="300" cy="256" r="52" fill="${P.warm}" opacity=".5" filter="url(#glow)"/><circle cx="300" cy="256" r="46" fill="url(#warm)" stroke="#fff" stroke-opacity=".65" stroke-width="3.5"/>
<path d="M300 228L308 248L330 250L313 264L318 286L300 274L282 286L287 264L270 250L292 248Z" fill="#fff" opacity=".92"/>`,
  trophy: (P) => `${[[56, 250, 78, 96, "accent"], [160, 190, 78, 156, "green"], [264, 118, 78, 228, "warm"]]
  .map(([x, y, w, h, g]) => `<path d="${rrp(x, y, w, h, 18)}" fill="url(#${g})"/><path d="${rrp(x, y, w, h, 18)}" fill="url(#sheen)"/><path d="${rrp(x, y, w, h, 18)}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`)
  .join("")}
<path d="M70 120L170 78L226 100L296 44" fill="none" stroke="${P.a}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 14" opacity=".85"/>
<circle cx="303" cy="62" r="46" fill="${P.warm}" opacity=".5" filter="url(#glow)"/>
<path d="M303 22L316 52L348 54L323 74L332 106L303 88L274 106L283 74L258 54L290 52Z" fill="url(#warm)" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>`,
  books: (P) => `${[[44, 292, 312, 62, "accent", -1], [64, 224, 284, 62, "green", 1], [52, 156, 300, 62, "warm", -1]]
  .map(
    ([x, y, w, h, g, tilt]) => `<g transform="rotate(${tilt} ${x + w / 2} ${y + h / 2})">${glass(rrp(x, y, w, h, 14))}<path d="${rrp(x + 14, y + 10, 40, h - 20, 8)}" fill="url(#${g})" opacity=".9"/>${bar(x + 76, y + h / 2, x + w - 30, y + h / 2, white, 7, 0.3)}</g>`,
  )
  .join("")}
<path d="M258 150V70L280 92L302 70V150" fill="url(#warm)" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linejoin="round"/>`,
  gear: (P) => {
    let teeth = "";
    for (let k = 0; k < 8; k += 1) teeth += `<rect x="172" y="30" width="56" height="62" rx="12" fill="url(#panel)" stroke="url(#edge)" stroke-width="3.5" transform="rotate(${k * 45} 200 200)"/>`;
    return `${teeth}<circle cx="200" cy="200" r="132" fill="url(#panel)" stroke="url(#edge)" stroke-width="4"/><circle cx="200" cy="200" r="132" fill="url(#sheen)"/>
<circle cx="200" cy="200" r="62" fill="#04101f" stroke="${P.a}" stroke-width="3.5"/><circle cx="200" cy="200" r="28" fill="${P.a}" opacity=".55" filter="url(#glow)"/><circle cx="200" cy="200" r="18" fill="url(#accent)"/>`;
  },
  bell: (P) => {
    const d = "M200 36C148 36 114 78 114 140V208L80 262H320L286 208V140C286 78 252 36 200 36Z";
    return `${glass(d)}<path d="M162 292A40 40 0 0 0 238 292Z" fill="url(#accent)"/>
<circle cx="288" cy="94" r="44" fill="#ff6b7d" opacity=".55" filter="url(#glow)"/><circle cx="288" cy="94" r="30" fill="#ff6b7d" stroke="#fff" stroke-opacity=".7" stroke-width="4"/>${bar(288, 80, 288, 98, "#fff", 8)}<circle cx="288" cy="109" r="4.5" fill="#fff"/>`;
  },
  profile: (P) => `${glass(rrp(36, 62, 328, 276, 32))}
<circle cx="128" cy="170" r="62" fill="${P.a}" opacity=".5" filter="url(#glow)"/><circle cx="128" cy="170" r="54" fill="url(#accent)"/>
<circle cx="128" cy="152" r="21" fill="#04101f" opacity=".7"/><path d="M84 214C90 186 108 176 128 176C148 176 166 186 172 214" fill="#04101f" opacity=".7"/>
${bar(216, 124, 332, 124, white, 13, 0.6)}${bar(216, 160, 306, 160, white, 9, 0.28)}${bar(216, 190, 288, 190, white, 9, 0.2)}
${led(228, 268, P.c, 11)}${led(272, 268, P.warm, 11)}${led(316, 268, P.b, 11)}
<circle cx="168" cy="214" r="20" fill="url(#green)" stroke="#fff" stroke-opacity=".7" stroke-width="3"/><path d="M159 214L166 221L178 207" fill="none" stroke="#04101f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  cube: (P) => `<path d="M200 44L330 120L200 196L70 120Z" fill="url(#accent)" opacity=".92"/><path d="M200 44L330 120L200 196L70 120Z" fill="url(#sheen)"/>
<path d="M70 120L200 196V350L70 274Z" fill="url(#panel)" stroke="url(#edge)" stroke-width="3.5"/><path d="M330 120L200 196V350L330 274Z" fill="${P.s1}" stroke="url(#edge)" stroke-width="3.5"/>
<path d="M200 44L330 120L200 196L70 120Z" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="3"/>
<path d="M200 196V350" stroke="${P.a}" stroke-width="4"/>${led(135, 235, P.c, 8)}${led(265, 235, P.warm, 8)}`,
  key: (P) => `<g transform="rotate(-24 200 200)"><circle cx="106" cy="200" r="72" fill="none" stroke="url(#metal)" stroke-width="32"/><circle cx="106" cy="200" r="30" fill="${P.a}" opacity=".6" filter="url(#glow)"/>
<path d="M170 200H352" stroke="url(#metal)" stroke-width="30" stroke-linecap="round"/><path d="M304 200V246M340 200V236" stroke="url(#metal)" stroke-width="26" stroke-linecap="round"/></g>`,
  globe: (P) => `<circle cx="200" cy="200" r="168" fill="url(#panel)" stroke="url(#edge)" stroke-width="4"/><circle cx="200" cy="200" r="168" fill="url(#sheen)"/>
<g fill="none" stroke="${P.a}" opacity=".5" stroke-width="2.5"><ellipse cx="200" cy="200" rx="72" ry="168"/><ellipse cx="200" cy="200" rx="128" ry="168"/><path d="M32 200H368M52 130H348M52 270H348"/></g>
<path d="M120 120C150 100 176 130 168 160C160 190 120 180 114 150Z" fill="${P.c}" opacity=".5"/><path d="M236 214C270 196 308 224 296 262C286 290 240 286 228 256Z" fill="${P.c}" opacity=".5"/>
${led(150, 150, "#ff6b7d", 9)}${led(268, 244, P.warm, 9)}${led(250, 120, P.a, 8)}`,
  drive: (P) => `${glass(rrp(36, 90, 328, 220, 34))}
<circle cx="150" cy="200" r="76" fill="#04101f" stroke="${P.a}" stroke-width="3.5"/><circle cx="150" cy="200" r="52" fill="none" stroke="${P.a}" stroke-width="2" opacity=".5"/><circle cx="150" cy="200" r="22" fill="url(#accent)"/>
<path d="M150 200L286 140" stroke="url(#metal)" stroke-width="12" stroke-linecap="round"/><circle cx="292" cy="138" r="14" fill="url(#metal)"/>
${led(326, 266, P.c, 7)}${bar(220, 266, 290, 266, white, 8, 0.25)}`,
};

function pingo(pose = "idle") {
  const cloth = `fill="url(#pgCloth)"`;
  const cyan = "#00E5FF";
  const eyes = ["happy", "celebrate", "wave"].includes(pose)
    ? `<path d="M70 91Q82 76 94 91M106 91Q118 76 130 91" stroke="#0a1633" stroke-width="4.2" stroke-linecap="round" fill="none"/>`
    : `<ellipse cx="82" cy="88" rx="12.5" ry="14.5" fill="url(#pgIris)"/><ellipse cx="118" cy="88" rx="12.5" ry="14.5" fill="url(#pgIris)"/>
<circle cx="82" cy="89" r="6.5" fill="#040a1c"/><circle cx="118" cy="89" r="6.5" fill="#040a1c"/><circle cx="78" cy="83.5" r="3.6" fill="#fff"/><circle cx="114" cy="83.5" r="3.6" fill="#fff"/><circle cx="85.5" cy="93" r="1.6" fill="#fff" opacity=".85"/><circle cx="121.5" cy="93" r="1.6" fill="#fff" opacity=".85"/>`;
  const raiseLeft = pose === "celebrate" ? ` transform="rotate(62 64 142)"` : "";
  const raiseRight = pose === "celebrate" || pose === "wave" ? ` transform="rotate(-62 136 142)"` : "";
  const arm = (side, extra) =>
    side === "l"
      ? `<path d="M64 140C48 148 41 170 45 194C52 191 60 177 66 160Z" ${cloth} stroke="${cyan}" stroke-opacity=".4" stroke-width="1.2"${extra}/>`
      : `<path d="M136 140C152 148 159 170 155 194C148 191 140 177 134 160Z" ${cloth} stroke="${cyan}" stroke-opacity=".4" stroke-width="1.2"${extra}/>`;
  return `<ellipse cx="100" cy="229" rx="52" ry="7" fill="#000" opacity=".45" filter="url(#soft)"/>
<ellipse cx="80" cy="219" rx="16" ry="7" fill="#FF9F1C"/><ellipse cx="120" cy="219" rx="16" ry="7" fill="#FF9F1C"/>
<path d="M60 148C60 132 78 124 100 124C122 124 140 132 140 148L145 196C145 209 127 215 100 215C73 215 55 209 55 196Z" ${cloth}/>
<path d="M74 134L69 205M126 134L131 205" stroke="${cyan}" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".7"/>
<path d="M58 193C76 202 124 202 142 193" stroke="${cyan}" stroke-width="1.4" stroke-linecap="round" fill="none" opacity=".55"/>
<path d="M100 149L117 155.5V170C117 180 109 186.5 100 190.5C91 186.5 83 180 83 170V155.5Z" fill="#071a33" stroke="${cyan}" stroke-width="2" stroke-linejoin="round"/>
<path d="M92.5 169L98 174.5L108 163" stroke="#3EFA95" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M100 20C58 20 38 52 40 90C41 114 56 130 76 136L124 136C144 130 159 114 160 90C162 52 142 20 100 20Z" ${cloth}/>
<path d="M50 106C45 66 68 32 100 32C132 32 155 66 150 106" stroke="${cyan}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".85"/>
<circle cx="100" cy="86" r="46" fill="#0e1d42"/><path d="M95 43C92 30 99 22 106 26C101 29 103 34 109 35C103 38 99 42 95 43Z" fill="#2b4fb3"/>
<path d="M100 62C86 46 56 52 56 84C56 110 77 126 100 126C123 126 144 110 144 84C144 52 114 46 100 62Z" fill="url(#pgFace)"/>
<g stroke="#0a1633" stroke-width="3.2" stroke-linecap="round" fill="none"><path d="M70 72L91 66"/><path d="M130 72L109 66"/></g>
${eyes}
<ellipse cx="66" cy="106" rx="6.5" ry="3.6" fill="#ff7aa8" opacity=".38"/><ellipse cx="134" cy="106" rx="6.5" ry="3.6" fill="#ff7aa8" opacity=".38"/>
<path d="M91 104C95 99.5 105 99.5 109 104C106 111 103 115 100 116C97 115 94 111 91 104Z" fill="#FF9F1C"/><path d="M94 104.5C97 103 103 103 106 104.5" stroke="#ffd08a" stroke-width="1.4" stroke-linecap="round" fill="none"/>
${arm("l", raiseLeft)}${arm("r", raiseRight)}`;
}

function placeObject(name, P, { x, y, s = 1, rot = 0, op = 1, glowOp = 0.55, blur = 0 }) {
  const inner = objects[name](P);
  const filter = blur ? ` filter="url(#blur${blur})"` : "";
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${rot}) scale(${s}) translate(-200 -200)" opacity="${op}"${filter}>
<circle cx="200" cy="210" r="250" fill="url(#gA)" opacity="${glowOp}"/>
<ellipse cx="200" cy="396" rx="120" ry="16" fill="#000" opacity=".4" filter="url(#soft)"/>${inner}</g>`;
}

function placePingo(pose, { cx, bottom, s, flip = false }) {
  const x = cx - 100 * s;
  const y = bottom - 232 * s;
  const flipT = flip ? ` translate(200 0) scale(-1 1)` : "";
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${s})">
<circle cx="100" cy="140" r="150" fill="url(#gA)" opacity=".9"/>
<g${flip ? ` transform="${flipT.trim()}"` : ""}>${pingo(pose)}</g></g>`;
}

function compose({ W, H, tone, seed, horizon, items = [], mascot, extra = "" }) {
  const P = PAL[tone];
  let body = backdrop(W, H, P, seed, horizon);
  items.forEach(([name, opts]) => (body += placeObject(name, P, opts)));
  if (mascot) body += placePingo(mascot.pose, mascot);
  body += extra;
  body += `<rect width="${W}" height="${H}" fill="url(#vignette)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs(P)}${body}</svg>`;
}

const banners = {
  dashboard: { tone: "cyan", pose: "happy", items: [["trophy", { x: 1320, y: 250, s: 0.82 }], ["shield", { x: 1020, y: 330, s: 0.36, rot: -8, op: 0.95 }], ["terminal", { x: 1560, y: 110, s: 0.3, rot: 8, op: 0.9 }]] },
  courses: { tone: "blue", pose: "idle", items: [["books", { x: 1320, y: 250, s: 0.82 }], ["terminal", { x: 1000, y: 330, s: 0.38, rot: -6 }], ["key", { x: 1560, y: 100, s: 0.32, rot: 10 }]] },
  challenges: { tone: "red", pose: "wave", items: [["radar", { x: 1320, y: 250, s: 0.8 }], ["terminal", { x: 1010, y: 330, s: 0.38, rot: -6 }], ["bug", { x: 1560, y: 100, s: 0.3, rot: 12 }]] },
  progression: { tone: "green", pose: "celebrate", items: [["trophy", { x: 1330, y: 250, s: 0.84 }], ["gear", { x: 1010, y: 330, s: 0.34, rot: 12 }], ["shield", { x: 1560, y: 100, s: 0.3, rot: -8 }]] },
  profile: { tone: "violet", pose: "happy", items: [["profile", { x: 1320, y: 250, s: 0.82 }], ["shield", { x: 1010, y: 330, s: 0.34, rot: -8 }], ["trophy", { x: 1560, y: 100, s: 0.3, rot: 8 }]] },
  settings: { tone: "blue", pose: "idle", items: [["gear", { x: 1320, y: 250, s: 0.82 }], ["padlock", { x: 1010, y: 330, s: 0.36, rot: -6 }], ["chip", { x: 1560, y: 100, s: 0.3, rot: 10 }]] },
  notifications: { tone: "violet", pose: "wave", items: [["bell", { x: 1320, y: 250, s: 0.82 }], ["globe", { x: 1010, y: 330, s: 0.32 }], ["shield", { x: 1560, y: 100, s: 0.3, rot: 8 }]] },
  admin: { tone: "cyan", pose: "idle", items: [["server", { x: 1320, y: 250, s: 0.82 }], ["trophy", { x: 1010, y: 330, s: 0.34, rot: -6 }], ["gear", { x: 1560, y: 100, s: 0.3, rot: 12 }]] },
  library: { tone: "blue", pose: "happy", items: [["books", { x: 1320, y: 250, s: 0.82 }], ["magnifier", { x: 1010, y: 330, s: 0.36, rot: -8 }], ["globe", { x: 1560, y: 100, s: 0.3 }]] },
  certificate: { tone: "amber", pose: "celebrate", items: [["certificate", { x: 1320, y: 250, s: 0.84 }], ["shield", { x: 1010, y: 330, s: 0.34, rot: -8 }], ["trophy", { x: 1560, y: 100, s: 0.3, rot: 8 }]] },
};

const courses = {
  fondamentaux: { tone: "cyan", main: "shield", side: ["padlock", "network"], pose: "happy" },
  reseaux: { tone: "blue", main: "network", side: ["server", "globe"], pose: "idle" },
  linux: { tone: "green", main: "terminal", side: ["key", "chip"], pose: "idle" },
  "securite-web": { tone: "cyan", main: "browser", side: ["bug", "shield"], pose: "idle" },
  pentest: { tone: "red", main: "radar", side: ["terminal", "bug"], pose: "wave" },
  detection: { tone: "green", main: "magnifier", side: ["bell", "server"], pose: "idle" },
  cryptographie: { tone: "violet", main: "padlock", side: ["key", "chip"], pose: "happy" },
  cloud: { tone: "cyan", main: "cloud", side: ["server", "shield"], pose: "idle" },
  malware: { tone: "red", main: "bug", side: ["shield", "terminal"], pose: "wave" },
  forensique: { tone: "amber", main: "drive", side: ["magnifier", "key"], pose: "idle" },
  gouvernance: { tone: "cyan", main: "certificate", side: ["shield", "books"], pose: "happy" },
  mobile: { tone: "cyan", main: "phone", side: ["padlock", "cloud"], pose: "idle" },
  ia: { tone: "violet", main: "chip", side: ["network", "shield"], pose: "happy" },
  windows: { tone: "blue", main: "windows", side: ["server", "key"], pose: "idle" },
  abstract: { tone: "violet", main: "cube", side: ["shield", "network"], pose: "idle" },
};

const labs = {
  reseau: { tone: "blue", main: "network", side: ["server", "terminal"] },
  linux: { tone: "green", main: "terminal", side: ["key", "chip"] },
  web: { tone: "cyan", main: "browser", side: ["bug", "padlock"] },
  cryptographie: { tone: "violet", main: "padlock", side: ["key", "chip"] },
  osint: { tone: "amber", main: "globe", side: ["magnifier", "network"] },
  securite: { tone: "red", main: "shield", side: ["radar", "bug"] },
};

function coverSvg(def, seed, withPingo) {
  return compose({
    W: 960,
    H: 540,
    tone: def.tone,
    seed,
    horizon: 0.66,
    items: [
      [def.side[0], { x: 150, y: 400, s: 0.34, rot: -8, op: 0.92 }],
      [def.side[1], { x: 800, y: 120, s: 0.3, rot: 10, op: 0.9 }],
      [def.main, { x: withPingo ? 440 : 480, y: 268, s: 0.98 }],
    ],
    mascot: withPingo ? { pose: def.pose, cx: 836, bottom: 520, s: 0.98 } : undefined,
  });
}

async function writeWebp(svg, file, quality = 80) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality, effort: 5 }).toFile(file);
  const size = fs.statSync(file).size;
  console.log(`${path.relative(ROOT, file)}  ${(size / 1024).toFixed(0)} KB`);
}

const groups = {
  async banners() {
    let seed = 11;
    for (const [name, def] of Object.entries(banners)) {
      const svg = compose({
        W: 1920,
        H: 480,
        tone: def.tone,
        seed: (seed += 7),
        horizon: 0.7,
        items: def.items,
        mascot: { pose: def.pose, cx: 1745, bottom: 450, s: 1.5 },
      });
      await writeWebp(svg, path.join(OUT, "banners", `banner-${name}.webp`), 78);
    }
  },
  async covers() {
    let seed = 101;
    for (const [name, def] of Object.entries(courses)) {
      await writeWebp(coverSvg(def, (seed += 13), true), path.join(OUT, "covers", `course-${name}.webp`), 80);
    }
    for (const [name, def] of Object.entries(labs)) {
      await writeWebp(coverSvg(def, (seed += 13), false), path.join(OUT, "covers", `lab-${name}.webp`), 80);
    }
  },
  async scenes() {
    const svg = compose({
      W: 1600,
      H: 1000,
      tone: "cyan",
      seed: 777,
      horizon: 0.6,
      items: [
        ["shield", { x: 1210, y: 330, s: 1.05, op: 0.9 }],
        ["terminal", { x: 330, y: 700, s: 0.78, rot: -8, op: 0.55, blur: 6 }],
        ["padlock", { x: 1400, y: 760, s: 0.52, rot: 10, op: 0.7 }],
        ["network", { x: 220, y: 200, s: 0.5, op: 0.5, blur: 6 }],
      ],
    });
    await writeWebp(svg, path.join(OUT, "scenes", "auth-backdrop.webp"), 74);
  },
  async og() {
    const svg = compose({
      W: 1200,
      H: 630,
      tone: "cyan",
      seed: 4242,
      horizon: 0.7,
      items: [
        ["shield", { x: 700, y: 300, s: 0.78, op: 0.95 }],
        ["terminal", { x: 1010, y: 130, s: 0.34, rot: 8, op: 0.9 }],
        ["padlock", { x: 1118, y: 520, s: 0.3, rot: -8, op: 0.9 }],
      ],
      mascot: { pose: "happy", cx: 940, bottom: 600, s: 2.05 },
    });
    const base = await sharp(Buffer.from(svg)).png().toBuffer();
    const logo = await sharp(path.join(OUT, "cyberpingo-transparent.png"))
      .trim()
      .resize({ width: 560 })
      .toBuffer();
    const meta = await sharp(logo).metadata();
    const file = path.join(OUT, "og-cyberpingo.jpg");
    await sharp(base)
      .composite([{ input: logo, left: 56, top: Math.round((630 - (meta.height || 0)) / 2) }])
      .jpeg({ quality: 86, mozjpeg: true })
      .toFile(file);
    console.log(`${path.relative(ROOT, file)}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
  },
};

async function main() {
  const wanted = process.argv.slice(2);
  const run = wanted.length ? wanted : Object.keys(groups);
  for (const name of run) {
    if (!groups[name]) throw new Error(`Groupe inconnu : ${name} (${Object.keys(groups).join(", ")})`);
    await groups[name]();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
