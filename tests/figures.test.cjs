// The figure engine: the specification (lib/figure-spec.ts), its samples, the typography rules applied to figure text,
// and a server-side render of every kind so a broken component is caught without a browser.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("../scripts/ts-loader.cjs");
const { textHygiene, figureIssues } = require("../scripts/content-quality.cjs");

const spec = load("lib/figure-spec");
const { FIGURE_SAMPLES } = load("lib/figure-samples");
const { FIGURE_ICONS } = load("lib/figure-icons");

const stored = (input) => spec.serializeFigure(input);
const kinds = spec.FIGURE_KINDS;

test("every kind of figure has a valid sample, and the samples survive a trip through the database text", () => {
  const seen = new Set();
  for (const sample of FIGURE_SAMPLES) {
    const text = stored(sample.figure);
    const figure = spec.parseFigure(text);
    assert.ok(figure, `${sample.id} doit être valide : ${JSON.stringify(spec.validateFigure({ v: 1, ...sample.figure }))}`);
    assert.deepEqual(JSON.parse(text), figure, `${sample.id} : aller-retour`);
    assert.ok(text.length < 6000, `${sample.id} : ${text.length} caractères, la figure doit rester compacte`);
    seen.add(figure.kind);
  }
  assert.deepEqual([...seen].sort(), [...kinds].sort(), "un exemple par type");
});

test("plain-text schemas stay readable: they are not figures", () => {
  assert.equal(spec.parseFigure("Cycle en 6 étapes\nPréparation -> Identification"), null);
  assert.equal(spec.parseFigure(""), null);
  assert.equal(spec.parseFigure("{ pas du json"), null);
  assert.equal(spec.parseFigure(JSON.stringify({ v: 2, kind: "flow" })), null);
});

test("the validator refuses what the page cannot draw well", () => {
  const flow = (nodes) => ({ v: 1, kind: "flow", nodes });
  const ok = [{ label: "A" }, { label: "B" }];
  assert.deepEqual(spec.validateFigure(flow(ok)), []);
  assert.ok(spec.validateFigure(flow([{ label: "A" }])).length, "un seul nœud");
  assert.ok(spec.validateFigure(flow(Array.from({ length: 6 }, (_, i) => ({ label: `N${i}` })))).length, "six nœuds : utiliser des étapes");
  assert.ok(spec.validateFigure(flow([{ label: "x".repeat(60) }, { label: "B" }])).length, "libellé trop long");
  assert.ok(spec.validateFigure(flow([{ label: "A", icon: "nope" }, { label: "B" }])).length, "icône inconnue");
  assert.ok(spec.validateFigure(flow([{ label: "A", tone: "pink" }, { label: "B" }])).length, "teinte inconnue");
  assert.ok(spec.validateFigure({ ...flow(ok), extra: 1 }).length, "champ inconnu");
  assert.ok(spec.validateFigure({ v: 1, kind: "table", columns: ["a", "b"], rows: [["1"], ["2", "3"]] }).length, "ligne trop courte");
  const net = (nodes, links) => ({ v: 1, kind: "network", cols: 3, rows: 2, nodes, links });
  const base = [{ id: "a", label: "A", icon: "pc", col: 0, row: 0 }, { id: "b", label: "B", icon: "server", col: 2, row: 1 }];
  assert.deepEqual(spec.validateFigure(net(base, [{ from: "a", to: "b" }])), []);
  assert.ok(spec.validateFigure(net(base, [{ from: "a", to: "zzz" }])).length, "lien vers un nœud inconnu");
  assert.ok(spec.validateFigure(net([...base, { id: "c", label: "C", icon: "pc", col: 0, row: 0 }], [{ from: "a", to: "b" }])).length, "case déjà prise");
  assert.ok(spec.validateFigure(net([{ ...base[0], col: 3 }, base[1]], [{ from: "a", to: "b" }])).length, "hors de la grille");
  assert.deepEqual(spec.validateFigure(net([{ ...base[0], col: 0.5 }, base[1]], [{ from: "a", to: "b" }])), [], "demi-case permise");
  assert.ok(spec.validateFigure(net([{ ...base[0], col: 0.3 }, base[1]], [{ from: "a", to: "b" }])).length, "pas de case décimale");
});

test("the text of every sample follows the typography of the lessons, and the checklist accepts a figure block", () => {
  for (const sample of FIGURE_SAMPLES) {
    const figure = spec.parseFigure(stored(sample.figure));
    assert.deepEqual(textHygiene(spec.figureProse(figure), sample.id), [], sample.id);
    assert.deepEqual(figureIssues(stored(sample.figure), sample.id), [], sample.id);
  }
  const bad = stored({ kind: "steps", items: [{ title: "L'usage — direct" }, { title: "Deux" }] });
  assert.ok(figureIssues(bad, "x").some((issue) => issue.includes("apostrophe")), "apostrophe droite");
  assert.ok(figureIssues(bad, "x").some((issue) => issue.includes("tiret cadratin")), "tiret cadratin");
  assert.ok(figureIssues(stored({ kind: "steps", items: [{ title: "A -> B" }, { title: "Deux" }] }), "x").some((issue) => issue.includes("flèche")), "flèche en texte");
  assert.ok(figureIssues("Préparation -> Identification", "x").some((issue) => issue.includes("texte brut")), "schéma en texte brut refusé");
});

test("the inline marks are bold and code, nothing else", () => {
  assert.deepEqual(spec.inlineParts("un **mot** et `code` ici"), [
    { kind: "text", value: "un " }, { kind: "bold", value: "mot" }, { kind: "text", value: " et " }, { kind: "code", value: "code" }, { kind: "text", value: " ici" },
  ]);
  assert.deepEqual(spec.inlineParts("rien"), [{ kind: "text", value: "rien" }]);
  assert.deepEqual(spec.figureText(spec.parseFigure(stored({ kind: "flow", nodes: [{ label: "**A**", text: "`b`" }, { label: "C" }] }))), ["A", "b", "C"]);
});

test("every icon name has a drawing, and every kind renders on the server without error", () => {
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { FIGURE_ICON_COMPONENTS } = load("components/figures/icons");
  assert.deepEqual(Object.keys(FIGURE_ICON_COMPONENTS).sort(), [...FIGURE_ICONS].sort(), "une icône pour chaque nom");
  const FigureView = load("components/figures/Figure").default;
  for (const sample of FIGURE_SAMPLES) {
    const figure = spec.parseFigure(stored(sample.figure));
    const html = renderToStaticMarkup(React.createElement(FigureView, { figure }));
    assert.match(html, new RegExp(`fg--${figure.kind}`), `${sample.id} : classe du type`);
    assert.ok(html.length > 400, `${sample.id} : rendu vide`);
    assert.ok(!html.includes("undefined"), `${sample.id} : valeur manquante dans le rendu`);
    for (const line of spec.figureText(figure).slice(0, 6)) {
      const escaped = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
      assert.ok(html.includes(escaped) || html.includes(line), `${sample.id} : le texte « ${line} » doit apparaître dans le rendu`);
    }
  }
});

test("the screen-reader summary names the kind and lists the content", () => {
  const figure = spec.parseFigure(stored(FIGURE_SAMPLES.find((sample) => sample.id === "cycle-incident").figure));
  const summary = spec.figureSummary(figure);
  assert.match(summary, /^Cycle : Répondre à un incident/);
  assert.match(summary, /Préparation/);
  assert.match(summary, /Retour d’expérience/);
});
