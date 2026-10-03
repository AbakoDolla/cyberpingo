"use strict";
// Mosaïque de la page « Matériel » : huit photos du catalogue sur fond sombre, écrite dans public/images/equipment/hero.webp.
//   node scripts/build-equipment-hero.cjs
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");
const DIR = path.join(root, "public", "images", "equipment");
const PICKS = ["switch", "serveur", "portable", "cle-securite", "nas", "pare-feu"];
const WIDTH = 1600;
const HEIGHT = 600;
const TILE = { w: 260, h: 195, gap: 12, radius: 18 };
const COLUMNS = 3;

async function buildHero() {
  const gridW = COLUMNS * TILE.w + (COLUMNS - 1) * TILE.gap;
  const left = WIDTH - gridW - 30;
  const top = Math.round((HEIGHT - (2 * TILE.h + TILE.gap)) / 2);
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${TILE.w}" height="${TILE.h}"><rect width="${TILE.w}" height="${TILE.h}" rx="${TILE.radius}" fill="#fff"/></svg>`);
  const layers = [];
  for (const [index, id] of PICKS.entries()) {
    const tile = await sharp(path.join(DIR, `${id}.webp`)).resize(TILE.w, TILE.h, { fit: "cover" }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
    layers.push({ input: tile, left: left + (index % COLUMNS) * (TILE.w + TILE.gap), top: top + Math.floor(index / COLUMNS) * (TILE.h + TILE.gap) });
  }
  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <defs>
      <radialGradient id="a" cx="82%" cy="20%" r="55%"><stop offset="0" stop-color="#00a8ff" stop-opacity=".34"/><stop offset="1" stop-color="#020817" stop-opacity="0"/></radialGradient>
      <radialGradient id="b" cx="30%" cy="105%" r="60%"><stop offset="0" stop-color="#8b5cf6" stop-opacity=".4"/><stop offset="1" stop-color="#020817" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="#020817"/><rect width="100%" height="100%" fill="url(#a)"/><rect width="100%" height="100%" fill="url(#b)"/>
  </svg>`);
  await sharp(background).composite(layers).webp({ quality: 82, effort: 5 }).toFile(path.join(DIR, "hero.webp"));
  return fs.statSync(path.join(DIR, "hero.webp")).size;
}

module.exports = { buildHero };

if (require.main === module) {
  buildHero().then((bytes) => console.log(`hero.webp : ${(bytes / 1024).toFixed(0)} Ko`)).catch((error) => { console.error(error.message); process.exit(1); });
}
