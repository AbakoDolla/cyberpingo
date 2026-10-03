"use strict";
// Génère supabase/functions/generate-certificate/brand.ts : le logo, l'emblème et les polices du certificat de réussite,
// en base64, pour que la fonction Edge n'ait besoin d'aucun fichier ni d'aucun appel réseau.
//   node scripts/build-certificate-brand.cjs
//
// Polices : Space Grotesk, Inter et JetBrains Mono, sous licence SIL OFL, un fichier statique par graisse (sous-ensemble latin),
// téléchargées depuis le paquet Fontsource en WOFF puis converties en sfnt non compressé (voir woffToSfnt).
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const OUTPUT = path.join(root, "supabase", "functions", "generate-certificate", "brand.ts");
const CDN = "https://cdn.jsdelivr.net/npm/@fontsource";
const FONTS = {
  groteskBold: "space-grotesk/files/space-grotesk-latin-700-normal.woff",
  groteskMedium: "space-grotesk/files/space-grotesk-latin-500-normal.woff",
  interRegular: "inter/files/inter-latin-400-normal.woff",
  interSemiBold: "inter/files/inter-latin-600-normal.woff",
  monoMedium: "jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff",
};

/**
 * WOFF 1.0 keeps the tables of an OpenType font zlib-compressed. The Edge Function would inflate them in pure JavaScript at
 * every certificate (about 90 ms per font), so the compression is undone here: the result is the same font as a plain sfnt.
 */
function woffToSfnt(woff) {
  if (woff.toString("latin1", 0, 4) !== "wOFF") throw new Error("Pas un fichier WOFF.");
  const flavor = woff.readUInt32BE(4);
  const count = woff.readUInt16BE(12);
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    const at = 44 + i * 20;
    const [offset, compLength, origLength, checksum] = [woff.readUInt32BE(at + 4), woff.readUInt32BE(at + 8), woff.readUInt32BE(at + 12), woff.readUInt32BE(at + 16)];
    const raw = woff.subarray(offset, offset + compLength);
    const data = compLength < origLength ? zlib.inflateSync(raw) : raw;
    if (data.length !== origLength) throw new Error(`Table ${woff.toString("latin1", at, at + 4)} : taille inattendue.`);
    entries.push({ tag: woff.subarray(at, at + 4), checksum, data });
  }
  entries.sort((a, b) => Buffer.compare(a.tag, b.tag));
  const entrySelector = Math.floor(Math.log2(count));
  const searchRange = 16 * 2 ** entrySelector;
  const header = Buffer.alloc(12 + count * 16);
  header.writeUInt32BE(flavor, 0);
  header.writeUInt16BE(count, 4);
  header.writeUInt16BE(searchRange, 6);
  header.writeUInt16BE(entrySelector, 8);
  header.writeUInt16BE(count * 16 - searchRange, 10);
  let offset = header.length;
  const parts = [header];
  entries.forEach((entry, index) => {
    const at = 12 + index * 16;
    entry.tag.copy(header, at);
    header.writeUInt32BE(entry.checksum, at + 4);
    header.writeUInt32BE(offset, at + 8);
    header.writeUInt32BE(entry.data.length, at + 12);
    const padded = Buffer.concat([entry.data, Buffer.alloc((4 - (entry.data.length % 4)) % 4)]);
    parts.push(padded);
    offset += padded.length;
  });
  return Buffer.concat(parts);
}

async function font(file) {
  const cache = path.join(os.tmpdir(), `cyberpingo-font-${path.basename(file)}`);
  const woff = fs.existsSync(cache) ? fs.readFileSync(cache) : await (async () => {
    const response = await fetch(`${CDN}/${file}`);
    if (!response.ok) throw new Error(`${file} : HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(cache, bytes);
    return bytes;
  })();
  return woffToSfnt(woff);
}

async function crop(file, area, width) {
  const cut = await sharp(file).extract(area).png().toBuffer();
  return sharp(cut).trim({ threshold: 8 }).resize({ width }).png({ compressionLevel: 9, palette: true, quality: 92 }).toBuffer();
}

async function main() {
  const logo = path.join(root, "public", "images", "cyberpingo-transparent.png");
  const wordmark = await crop(logo, { left: 100, top: 954, width: 1340, height: 214 }, 640);
  const emblem = await crop(logo, { left: 360, top: 160, width: 840, height: 788 }, 340);
  const entries = [
    ["WORDMARK_PNG", wordmark],
    ["EMBLEM_PNG", emblem],
    ...(await Promise.all(Object.entries(FONTS).map(async ([name, file]) => [`FONT_${name.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`, await font(file)]))),
  ];
  const lines = entries.map(([name, bytes]) => `export const ${name} = "${Buffer.from(bytes).toString("base64")}";`);
  const source = `// Généré par scripts/build-certificate-brand.cjs : ne pas modifier à la main.
// Logo et emblème CyberPingo (PNG), polices Space Grotesk, Inter et JetBrains Mono (SIL OFL, WOFF statique), en base64.
${lines.join("\n")}
`;
  fs.writeFileSync(OUTPUT, source, "utf8");
  console.log(`${path.relative(root, OUTPUT)} : ${(source.length / 1024).toFixed(0)} Ko (${entries.map(([name, bytes]) => `${name} ${(bytes.length / 1024).toFixed(0)} Ko`).join(", ")})`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
