// Loads the project's pure TypeScript modules in Node without a build step.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const cache = new Map();

function load(file) {
  const filename = path.resolve(root, `${file}.ts`);
  if (cache.has(filename)) return cache.get(filename);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const localRequire = (specifier) => {
    if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return require(specifier);
    const target = specifier.startsWith("@/") ? path.join(root, specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
    // `import data from "./file.json"` : the JSON is the default export, as with resolveJsonModule.
    if (target.endsWith(".json")) return { __esModule: true, default: JSON.parse(fs.readFileSync(target, "utf8")) };
    return load(path.relative(root, target));
  };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}

module.exports = { load, root };
