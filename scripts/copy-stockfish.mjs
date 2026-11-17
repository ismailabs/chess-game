// Copies the real Stockfish.js lite single-threaded WASM build from node_modules into public/engine
// and writes a manifest listing only what is actually bundled.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const pkgDir = join("node_modules", "stockfish");
if (!existsSync(pkgDir)) {
  console.error("The 'stockfish' package is not installed. Run: npm install");
  process.exit(1);
}
const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));

let found = null;
for (const dir of ["bin", "src", "."].map((d) => join(pkgDir, d)).filter(existsSync)) {
  const files = readdirSync(dir);
  const js = files
    .filter((f) => /lite-single.*\.js$/.test(f) && files.includes(f.replace(/\.js$/, ".wasm")))
    .sort()[0];
  if (js) { found = { dir, js }; break; }
}
if (!found) {
  console.error("No lite-single JS+WASM pair found in node_modules/stockfish (looked in bin/, src/, root).");
  process.exit(1);
}

const out = join("public", "engine");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const wasm = found.js.replace(/\.js$/, ".wasm");
cpSync(join(found.dir, found.js), join(out, found.js));
cpSync(join(found.dir, wasm), join(out, wasm));
for (const name of ["COPYING.txt", "Copying.txt", "COPYING", "LICENSE", "LICENSE.txt"]) {
  if (existsSync(join(pkgDir, name))) { cpSync(join(pkgDir, name), join(out, "COPYING.txt")); break; }
}

const fromName = /stockfish[a-z-]*?-?(\d+(?:\.\d+)?)/i.exec(found.js)?.[1];
const version = fromName ?? pkg.version;
writeFileSync(
  join(out, "manifest.json"),
  JSON.stringify([{
    id: "stockfish-lite",
    name: `Stockfish ${version} Lite (single-threaded WASM)`,
    version, js: found.js, wasm, license: "GPL-3.0-or-later",
    source: "https://github.com/official-stockfish/Stockfish",
    build: "https://github.com/nmrugg/stockfish.js",
  }], null, 2),
);
console.log(`Bundled ${found.js} (+ .wasm) -> public/engine`);
