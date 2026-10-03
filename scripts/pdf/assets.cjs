"use strict";
// Prépare les images de marque et les polices en data URI, légères, pour les PDF.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..", "..");
const IMAGES = path.join(ROOT, "public", "images");
const FONTS = path.join(ROOT, "public", "fonts");

const dataUri = (buffer, mime) => `data:${mime};base64,${buffer.toString("base64")}`;

async function crop(file, area, width) {
  const cut = await sharp(file).extract(area).png().toBuffer();
  return sharp(cut)
    .trim({ threshold: 8 })
    .resize({ width })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toBuffer();
}

async function brandAssets() {
  const logo = path.join(IMAGES, "cyberpingo-transparent.png");
  const wordmark = await crop(logo, { left: 100, top: 954, width: 1340, height: 214 }, 460);
  const emblem = await crop(logo, { left: 360, top: 160, width: 840, height: 788 }, 170);
  const mascot = await sharp(path.join(IMAGES, "hero-mascot.png"))
    .resize({ width: 440 })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  return {
    wordmark: dataUri(wordmark, "image/png"),
    emblem: dataUri(emblem, "image/png"),
    mascot: dataUri(mascot, "image/jpeg"),
    raw: { wordmark, emblem, mascot },
  };
}

function fontFaces() {
  const face = (family, file, weight) => {
    const base64 = fs.readFileSync(path.join(FONTS, file)).toString("base64");
    return `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${base64}) format("woff2")}`;
  };
  return [
    face("Space Grotesk", "space-grotesk-latin.woff2", "300 700"),
    face("Inter", "inter-latin.woff2", "100 900"),
    face("JetBrains Mono", "jetbrains-mono-latin.woff2", "100 800"),
  ].join("\n");
}

module.exports = { brandAssets, fontFaces, dataUri, ROOT };
