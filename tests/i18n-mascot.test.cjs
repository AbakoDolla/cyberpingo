const test = require("node:test");
const assert = require("node:assert/strict");

test("i18n dictionary has matching keys for French and English", () => {
  const ts = require("node:fs").readFileSync("lib/i18n.ts", "utf8");
  const frKeys = [];
  const enKeys = [];

  const frMatch = ts.match(/fr:\s*\{([^}]+)\}/s);
  const enMatch = ts.match(/en:\s*\{([^}]+)\}/s);

  assert.ok(frMatch, "fr translations block must exist");
  assert.ok(enMatch, "en translations block must exist");

  const keyPattern = /"([a-z0-9_.]+)":/g;
  let m;
  while ((m = keyPattern.exec(frMatch[1])) !== null) {
    frKeys.push(m[1]);
  }
  while ((m = keyPattern.exec(enMatch[1])) !== null) {
    enKeys.push(m[1]);
  }

  assert.ok(frKeys.length > 10, "should have at least 10 keys");
  assert.deepEqual(frKeys.sort(), enKeys.sort(), "FR and EN should have identical key sets");
});

test("mascot reference images are stored and accessible", () => {
  const fs = require("node:fs");
  assert.ok(fs.existsSync("public/images/mascot/professeur-pingo-face.png"), "face reference cutout must exist");
  assert.ok(fs.existsSync("public/images/mascot/professeur-pingo-34.png"), "3/4 reference cutout must exist");
});
