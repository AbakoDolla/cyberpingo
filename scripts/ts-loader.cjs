// Loads the project's pure TypeScript modules in Node without a build step.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const cache = new Map();

const mapNpm = (specifier) => {
  const name = specifier.replace(/^npm:/, "").replace(/@\d[\w.-]*$/, "");
  const loaded = require(name);
  // Deno gives CommonJS packages a default export; mirror it for the packages used by the Edge Functions.
  return loaded && loaded.__esModule ? loaded : { __esModule: true, default: loaded, ...loaded };
};

function load(file) {
  // Pure modules are .ts; the components that tests render on the server are .tsx.
  const plain = path.resolve(root, `${file}.ts`);
  const filename = fs.existsSync(plain) ? plain : path.resolve(root, `${file}.tsx`);
  if (cache.has(filename)) return cache.get(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const localRequire = (specifier) => {
    if (specifier.startsWith("npm:")) return mapNpm(specifier);
    if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
    const target = specifier.startsWith("@/") ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
    // `import data from "./file.json"` : the JSON is the default export, as with resolveJsonModule.
    if (target.endsWith(".json")) return { __esModule: true, default: JSON.parse(fs.readFileSync(target, "utf8")) };
    // Deno wants the extension in a relative import ("./brand.ts"); the loader adds it back itself.
    return load(path.relative(root, target.replace(/\.tsx?$/, "")));
  };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

module.exports = { load, root };
