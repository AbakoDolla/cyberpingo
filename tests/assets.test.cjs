// Images and voices are static files referenced from data and from the database seed: a typo would only
// show up in production as a broken picture or a silent mascot, so every reference is checked on disk.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { load } = require("../scripts/ts-loader.cjs");

const root = path.join(__dirname, "..");
const publicFile = (url) => path.join(root, "public", ...url.split("/").filter(Boolean));
const { articles, articleCover, informationPages } = load("data/public-content");

test("every article has an existing cover, decorative because its title sits next to it", () => {
  assert.ok(articles.length >= 5);
  for (const article of articles) {
    const cover = articleCover(article.slug);
    assert.ok(fs.existsSync(publicFile(cover.src)), `${article.slug}: ${cover.src}`);
    assert.equal(cover.alt, "");
  }
});

test("every image of an information page exists and is described", () => {
  for (const name of ["fonctionnalites", "a-propos"]) {
    const page = informationPages[name];
    assert.ok(page.hero && page.sections.filter((section) => section.image).length >= 5, `${name} should be illustrated`);
  }
  for (const [name, page] of Object.entries(informationPages)) {
    const images = [page.hero, ...page.sections.map((section) => section.image)].filter(Boolean);
    for (const image of images) {
      assert.ok(fs.existsSync(publicFile(image.src)), `${name}: ${image.src}`);
      assert.ok(image.alt.length > 10, `${name}: alt text of ${image.src}`);
    }
  }
});

test("the brand marks used by the navigation exist", () => {
  for (const file of ["cyberpingo-mark.webp", "cyberpingo-mark-square.webp"]) {
    assert.ok(fs.existsSync(path.join(root, "public", "images", "brand", file)), file);
  }
});

test("the introduction of Pingo points to an audio file and says that the voice is synthetic", () => {
  const intro = JSON.parse(fs.readFileSync(path.join(root, "data", "pingo-intro.json"), "utf8"));
  assert.ok(fs.existsSync(publicFile(intro.audio)), intro.audio);
  assert.ok(fs.statSync(publicFile(intro.audio)).size > 10000);
  assert.match(intro.credit, /synthèse/);
  assert.ok(intro.text.length > 80);
});

test("every voice of the seed points to an existing mp3 and is credited as synthetic", () => {
  const sql = fs.readFileSync(path.join(root, "supabase", "seed", "04_mascot_voices.sql"), "utf8");
  assert.match(sql, /Voix de synthèse neuronale/);
  const rows = [...sql.matchAll(/\('([0-9a-f-]{36})', '(\/audio\/mascot\/[A-Za-z0-9._-]+\.mp3)'\)/g)];
  assert.ok(rows.length >= 30, `${rows.length} voiced lines`);
  const seen = new Set();
  for (const [, id, url] of rows) {
    assert.equal(url, `/audio/mascot/${id}.mp3`);
    assert.ok(!seen.has(id), `duplicate ${id}`);
    seen.add(id);
    assert.ok(fs.existsSync(publicFile(url)), url);
    assert.ok(fs.statSync(publicFile(url)).size > 3000, `${url} is too small`);
  }
  assert.match(sql, /where m\.id = v\.id::uuid and m\.audio_url is null/i);
});
