// Load a TypeScript module from src/ in plain Node, without a bundler.
// Relative imports are resolved and loaded the same way; anything else is
// looked up in `stubs` (for example a fake "phaser").
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import vm from "node:vm";
import ts from "typescript";

export function loadTs(file, stubs = {}, cache = new Map()) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path);
  const exports = {};
  cache.set(path, exports);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const require = (name) => {
    if (name in stubs) return stubs[name];
    if (name.startsWith(".")) return loadTs(resolve(dirname(path), name.replace(/\.js$/, ".ts")), stubs, cache);
    throw new Error(`No stub for ${name}`);
  };
  vm.runInNewContext(code, { exports, require, URLSearchParams, setTimeout });
  return exports;
}
