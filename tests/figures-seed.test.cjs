// The figures seed (supabase/seed/12_figures.sql) brings the redrawn schemas to a database seeded before the conversion.
// It must be up to date, guarded (an edited lesson keeps its text) and idempotent.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { root } = require("../scripts/ts-loader.cjs");
const { createSupabaseDatabase } = require("../scripts/pglite-supabase.cjs");
const { build, OUTPUT } = require("../scripts/generate-figures-seed.cjs");

const legacy = JSON.parse(fs.readFileSync(path.join(root, "supabase", "seed", "content", "figures-legacy.json"), "utf8"));
const seed = () => fs.readFileSync(OUTPUT, "utf8");

let db;
let converted;
before(async () => {
  db = await createSupabaseDatabase({ seed: true, seedFilter: (name) => !name.startsWith("12_") });
  converted = await blocks();
});
after(async () => { await db?.close(); });

async function blocks() {
  const { rows } = await db.query("select id, content from public.lessons order by id");
  return new Map(rows.map((row) => [row.id, row.content.blocks.map((block) => (block.type === "schema" ? block.content : null))]));
}

/** Puts the lessons back in the state production had before the conversion. */
async function regress() {
  for (const [id, byIndex] of Object.entries(legacy)) {
    for (const [index, old] of Object.entries(byIndex)) {
      await db.query("update public.lessons set content = jsonb_set(content, $2::text[], to_jsonb($3::text)) where id = $1", [id, `{blocks,${index},content}`, old]);
    }
  }
}

test("the seed file is up to date with the figures of the content files", async () => {
  assert.equal(seed(), await build(), "relance « node scripts/generate-figures-seed.cjs »");
});

test("every schema of the lessons is a figure, and the legacy map matches the lessons one to one", () => {
  let total = 0;
  for (const [id, byIndex] of Object.entries(legacy)) {
    assert.ok(converted.has(id), `leçon ${id} introuvable`);
    const stored = converted.get(id);
    const schemaIndexes = stored.flatMap((content, index) => (content === null ? [] : [index]));
    assert.deepEqual(schemaIndexes, Object.keys(byIndex).map(Number), `leçon ${id} : positions des schémas`);
    for (const index of schemaIndexes) {
      assert.ok(stored[index].trim().startsWith("{"), `leçon ${id} bloc ${index} : figure attendue`);
      total += 1;
    }
  }
  const all = [...converted.values()].flat().filter((content) => content !== null).length;
  assert.equal(all, total, "aucun schéma hors de la table de correspondance");
});

test("applied to a database seeded before the conversion, the seed redraws every schema, and a second run changes nothing", async () => {
  await regress();
  const before = await blocks();
  for (const [id, byIndex] of Object.entries(legacy)) for (const [index, old] of Object.entries(byIndex)) assert.equal(before.get(id)[index], old, "retour à l’état d’avant");

  await db.exec(seed());
  assert.deepEqual([...(await blocks())], [...converted], "les figures sont en place, aux bons blocs");

  const stamp = (await db.query("select max(updated_at) as t, count(*)::int as n from public.lessons")).rows[0];
  await db.exec(seed());
  assert.deepEqual([...(await blocks())], [...converted]);
  const again = (await db.query("select max(updated_at) as t, count(*)::int as n from public.lessons")).rows[0];
  assert.deepEqual(again, stamp, "le second passage ne touche aucune leçon");
});

test("a lesson an administrator edited keeps its text, the others are redrawn", async () => {
  await regress();
  const [editedId, byIndex] = Object.entries(legacy)[0];
  const index = Object.keys(byIndex)[0];
  const edited = `${byIndex[index]}\nligne ajoutée par un administrateur`;
  await db.query("update public.lessons set content = jsonb_set(content, $2::text[], to_jsonb($3::text)) where id = $1", [editedId, `{blocks,${index},content}`, edited]);
  await db.exec(seed());
  const after = await blocks();
  assert.equal(after.get(editedId)[index], edited, "le bloc modifié n’est pas écrasé");
  let redrawn = 0;
  for (const [id, stored] of after) {
    stored.forEach((content, i) => {
      if (content === null || (id === editedId && String(i) === index)) return;
      assert.equal(content, converted.get(id)[i], `leçon ${id} bloc ${i}`);
      redrawn += 1;
    });
  }
  assert.ok(redrawn > 300, `les autres schémas sont redessinés (${redrawn})`);
});
