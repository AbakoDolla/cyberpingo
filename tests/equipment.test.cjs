// Photos of real equipment: the catalogue (data/equipment.json), the credits that the licences ask for, and the places
// where a photo is shown (labs, lessons). A wrong id, a missing file or a paragraph that moved would only show up in
// production as a missing picture, so everything is checked here against the seeded database.
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const { createSupabaseDatabase } = require("../scripts/pglite-supabase.cjs");
const { load, root } = require("../scripts/ts-loader.cjs");

const { equipment, equipmentById, equipmentForLab, equipmentFromPhoto, photoCredit } = load("data/equipment");
const { equipmentBoxes, lessonEquipmentAnchors, anchorTextOf, TEXTUAL_BLOCKS } = load("lib/lesson-equipment");
const catalogue = JSON.parse(fs.readFileSync(path.join(root, "data", "equipment.json"), "utf8"));
const publicFile = (url) => path.join(root, "public", ...url.split("/").filter(Boolean));
const COURSES = new Set(["reseaux", "fondamentaux", "linux"]);
const FREE_LICENSE = /^(CC0|Public domain|domaine public|CC BY(?:-SA)? [0-9.]+)$/i;

let dbPromise;
const database = () => (dbPromise ??= createSupabaseDatabase({ seed: true }));
after(async () => { if (dbPromise) await (await dbPromise).close(); });

test("the catalogue describes every device with a name, a sentence, the risk and the good habit", () => {
  assert.ok(equipment.length >= 28, `${equipment.length} devices`);
  assert.equal(new Set(equipment.map((device) => device.id)).size, equipment.length, "ids are unique");
  for (const device of equipment) {
    assert.match(device.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, device.id);
    assert.ok(["entreprise", "personnel"].includes(device.category), `${device.id}: category`);
    assert.equal(device.photo, `/images/equipment/${device.id}.webp`);
    assert.ok(device.name.length >= 4 && device.group.length >= 4, `${device.id}: name and group`);
    assert.ok(device.summary.length >= 60, `${device.id}: summary`);
    assert.ok(device.caption.length >= 60, `${device.id}: caption`);
    assert.ok(device.pdfSummary.length >= 20 && device.pdfSummary.length <= 70, `${device.id}: pdfSummary`);
    assert.ok(device.risk.length >= 40 && device.habit.length >= 40, `${device.id}: risk and habit`);
    assert.ok(device.courses.length >= 1 && device.courses.every((slug) => COURSES.has(slug)), `${device.id}: courses`);
    assert.equal(equipmentById(device.id), device);
    assert.equal(equipmentFromPhoto(device.photo), device);
  }
});

test("the texts follow the house style: typographic apostrophes, no long dash", () => {
  for (const device of equipment) {
    for (const [field, text] of Object.entries({ name: device.name, summary: device.summary, caption: device.caption, pdfSummary: device.pdfSummary, risk: device.risk, habit: device.habit, alt: device.alt })) {
      assert.ok(!/[—–]/.test(text), `${device.id}.${field}: no em or en dash`);
      assert.ok(!/\p{L}'\p{L}/u.test(text), `${device.id}.${field}: use the typographic apostrophe`);
    }
  }
});

test("every photo is a 1200x900 WebP of a reasonable weight, and the mosaic of the page exists", async () => {
  for (const device of equipment) {
    const file = publicFile(device.photo);
    assert.ok(fs.existsSync(file), `${device.photo} exists`);
    const meta = await sharp(file).metadata();
    assert.deepEqual([meta.format, meta.width, meta.height], ["webp", 1200, 900], device.photo);
    const kb = fs.statSync(file).size / 1024;
    assert.ok(kb >= 5 && kb <= 400, `${device.photo} weighs ${kb.toFixed(0)} Ko`);
  }
  const hero = await sharp(publicFile("/images/equipment/hero.webp")).metadata();
  assert.deepEqual([hero.format, hero.width, hero.height], ["webp", 1600, 600]);
});

test("every photo is credited with its author, a free licence and the Wikimedia Commons page", () => {
  for (const device of equipment) {
    const credit = device.credit;
    assert.ok(FREE_LICENSE.test(credit.license), `${device.id}: licence « ${credit.license} »`);
    assert.ok(credit.author.length >= 2 && !/[<>]/.test(credit.author), `${device.id}: author`);
    assert.match(credit.pageUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:\S+$/, `${device.id}: page`);
    assert.ok(credit.title.startsWith("File:"), `${device.id}: title`);
    if (/^CC BY/i.test(credit.license)) assert.match(credit.licenseUrl, /^https:\/\/creativecommons\.org\/licenses\/by(-sa)?\/[0-9.]+\/?$/, `${device.id}: licence address`);
    assert.ok(credit.creditShort.includes(credit.license.replace(/^Public domain$/i, "domaine public")) || /domaine public/i.test(credit.creditShort), `${device.id}: short credit names the licence`);
    assert.ok(credit.creditShort.length <= 70, `${device.id}: short credit length`);
    assert.ok(credit.altFr.length >= 20 && credit.altFr.length <= 120, `${device.id}: alt text`);
    assert.equal(photoCredit(device), `Photo : ${credit.creditShort}`);
  }
});

test("each lab shows between one and six devices, and the lab exists", async () => {
  const db = await database();
  const slugs = new Set((await db.query("select slug from public.labs")).rows.map((row) => row.slug));
  const mapped = Object.entries(catalogue.labs);
  assert.ok(mapped.length >= 20);
  for (const [slug, ids] of mapped) {
    assert.ok(slugs.has(slug), `${slug} is a lab of the seed`);
    assert.ok(ids.length >= 1 && ids.length <= 6, `${slug}: ${ids.length} devices`);
    assert.equal(new Set(ids).size, ids.length, `${slug}: no duplicate`);
    assert.deepEqual(equipmentForLab(slug).map((device) => device.id), ids, `${slug}: every id is a device`);
  }
  assert.deepEqual(equipmentForLab("a-lab-without-photos"), []);
});

test("every lesson photo box is anchored on one paragraph of a seeded lesson", async () => {
  const db = await database();
  const anchors = lessonEquipmentAnchors();
  assert.ok(anchors.length >= 25, `${anchors.length} boxes`);
  const seen = new Set();
  for (const anchor of anchors) {
    const [lesson] = (await db.query("select title, content -> 'blocks' as blocks from public.lessons where id = $1", [anchor.lessonId])).rows;
    assert.ok(lesson, `${anchor.title}: the lesson exists`);
    assert.equal(lesson.title, anchor.title, `${anchor.lessonId}: title`);
    const hits = lesson.blocks.filter((block) => TEXTUAL_BLOCKS.has(block.type) && anchorTextOf(block).startsWith(anchor.after));
    assert.equal(hits.length, 1, `${anchor.title} : « ${anchor.after} » matches ${hits.length} paragraphs`);
    assert.ok(anchor.devices.length >= 1 && anchor.devices.length <= 6 && anchor.devices.every((id) => equipmentById(id)), `${anchor.title}: devices`);
    assert.ok(!seen.has(`${anchor.lessonId}|${anchor.after}`), "an anchor is used once");
    seen.add(`${anchor.lessonId}|${anchor.after}`);
  }
});

test("the photo boxes follow their paragraph, and close the lesson if the paragraph was rewritten", async () => {
  const db = await database();
  const anchor = lessonEquipmentAnchors().find((entry) => entry.title === "LAN, WAN, topologies et équipements" && entry.after.startsWith("Quatre"));
  const [lesson] = (await db.query("select content -> 'blocks' as blocks from public.lessons where id = $1", [anchor.lessonId])).rows;
  const at = lesson.blocks.findIndex((block) => TEXTUAL_BLOCKS.has(block.type) && anchorTextOf(block).startsWith(anchor.after));
  const placed = equipmentBoxes(anchor.lessonId, lesson.blocks);
  assert.deepEqual(placed.get(at).map((box) => box.devices.map((device) => device.id)), [anchor.devices]);
  assert.equal(placed.get(at)[0].title, "Routeur, point d’accès, pare-feu et box");

  const rewritten = lesson.blocks.map((block, index) => (index === at ? { ...block, content: "Un texte entièrement réécrit." } : block));
  const fallback = equipmentBoxes(anchor.lessonId, rewritten);
  assert.ok(!fallback.has(at), "no box left behind the rewritten paragraph");
  assert.ok(fallback.get(rewritten.length - 1).some((box) => box.title === placed.get(at)[0].title), "the box closes the lesson");

  assert.equal(equipmentBoxes("00000000-0000-0000-0000-000000000000", lesson.blocks).size, 0, "another lesson has no box");
  assert.equal(equipmentBoxes(anchor.lessonId, []).size, 0, "an empty lesson has no box");
});
