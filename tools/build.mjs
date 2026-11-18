// Builds the app's page from src/ into public/:  npm run build:app   (npm run build does this and bundles the portal too)
//
//   src/index.html     the page: header, tabs and windows      -> public/index.html
//   src/app.css        the styling                              -> public/assets/app.<fingerprint>.css
//   src/app/*.js       the app's code, joined in file order     -> public/assets/app.<fingerprint>.js
//   data/*.json        built-in spells, monsters and items      -> public/assets/<name>.<fingerprint>.js
//   src/backdrop/corridor-<name>.webp  the background pictures  -> public/assets/backdrop-<name>.<fingerprint>.webp,
//                      named in the styling as /assets/backdrop-<name>.webp (left out of the offline install list, so a
//                      phone only downloads the picture it shows; the service worker keeps it once it's been seen)
//   src/sw.js          the offline helper (service worker)      -> public/sw.js, with the list of files above
//
// Why: the page is always fetched fresh so updates show at once, but the code and the rules data are large and change far
// less often. With a fingerprint (a short code made from the contents) in each file name, browsers keep those files for a
// year and only download one again when it really changed. public/index.html, public/sw.js and public/assets/ are build
// output (not in git); edit the files in src/ and data/.
//
// The joined code is checked for syntax errors before anything is written, so a typo can't blank the page.
// The app/*.js files are plain scripts that share one global scope, as when they were one <script>: functions and
// top-level consts in one file can be used from any other. Order matters only for code that runs at start-up.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync } from "node:fs";
import vm from "node:vm";

if (process.env.DMFORGE_BUILT === "1") process.exit(0); // npm run test:all builds once, then skips this in each check

const root = new URL("../", import.meta.url);
const at = p => new URL(p, root);
const read = p => readFileSync(at(p), "utf8");
const fp = text => createHash("sha256").update(text).digest("hex").slice(0, 10);
const quiet = process.argv.includes("--quiet");

// 1. the code: join src/app/*.js in order and check it parses
const parts = readdirSync(at("src/app/")).filter(f => f.endsWith(".js")).sort();
let code = '"use strict";\n', where = [];
for (const f of parts) {
  const text = read(`src/app/${f}`), start = code.split("\n").length;
  where.push([start, f]);
  code += `\n/* ======== src/app/${f} ======== */\n` + text;
}
try { new vm.Script(code, { filename: "app.js" }); } catch (e) {
  const line = +((e.stack || "").match(/app\.js:(\d+)/) || [])[1];
  const [start, f] = where.filter(([s]) => s <= line).pop() || [0, "?"];
  console.error(`\nThe app's code has a syntax error, so nothing was built:\n  ${e.message}\n  in src/app/${f}, near line ${line - start - 1}\n`);
  process.exit(1);
}

// 2. the files with fingerprints
const out = {}; // source name in src/index.html -> built name
function emit(name, ext, text) { // text: a string, or a Buffer for pictures
  const file = `${name}.${fp(text)}.${ext}`;
  out[`/assets/${name}.${ext}`] = `/assets/${file}`;
  for (const f of readdirSync(at("public/assets/"))) if (f.startsWith(name + ".") && f.endsWith("." + ext) && f !== file) unlinkSync(at(`public/assets/${f}`));
  writeFileSync(at(`public/assets/${file}`), text);
  if (!quiet) console.log(`public/assets/${file}  ${(Buffer.byteLength(text) / 1024).toFixed(0)} KB`);
}
mkdirSync(at("public/assets/"), { recursive: true });
for (const [name, key] of [["spells", "spellData"], ["monsters", "monsterData"], ["items", "itemData"]]) {
  // stored as text, so the app turns it into objects only when a tab needs it (dmData in src/app/01-core.js)
  const text = JSON.stringify(JSON.parse(read(`data/${name}.json`)));
  const lit = JSON.stringify(text).split(String.fromCharCode(0x2028)).join("\\u2028").split(String.fromCharCode(0x2029)).join("\\u2029");
  emit(name, "js", `/* Built from data/${name}.json by tools/build.mjs. */\n(window.DMDATA = window.DMDATA || {}).${key} = ${lit};\n`);
}
// the background pictures first, so the styling can name them
const pics = {};
for (const f of readdirSync(at("src/backdrop/")).filter(f => /^corridor-[\w-]+\.webp$/.test(f)).sort()) {
  const name = "backdrop-" + f.slice("corridor-".length, -".webp".length);
  emit(name, "webp", readFileSync(at(`src/backdrop/${f}`)));
  pics[`/assets/${name}.webp`] = out[`/assets/${name}.webp`];
}
let css = read("src/app.css");
for (const [src, built] of Object.entries(pics)) css = css.split(src).join(built);
const unknown = css.match(/\/assets\/backdrop-[\w-]+\.webp/);
if (unknown) throw new Error(`src/app.css names ${unknown[0]}, but there's no src/backdrop/${unknown[0].slice(8).replace("backdrop-", "corridor-")}`);
emit("app", "css", css);
emit("app", "js", code);

// 3. the page and the service worker point at them
let html = read("src/index.html");
for (const [src, built] of Object.entries(out)) {
  if (src in pics) continue; // named in the styling, not the page
  if (!html.includes(`"${src}"`)) throw new Error(`src/index.html doesn't load ${src}`);
  html = html.split(`"${src}"`).join(`"${built}"`);
}
// the note goes after <!DOCTYPE html>: anything before it puts browsers in quirks mode, which changes the layout
html = html.replace(/^(<!DOCTYPE html>\n?)/i, "$1<!-- Built by tools/build.mjs from src/index.html. Edit the files in src/, then run npm run build:app. -->\n");
if (!/^<!DOCTYPE html>/i.test(html)) throw new Error("src/index.html must start with <!DOCTYPE html>");
writeFileSync(at("public/index.html"), html);
const files = Object.values(out).filter(f => !f.endsWith(".webp"));
const sw = read("src/sw.js").replace(/^const ASSETS = .*$/m, `const ASSETS = ${JSON.stringify(files)};`)
  .replace(/^const CACHE = "([\w-]+?)";/m, (_, name) => `const CACHE = "${name}-${fp(files.join())}";`);
writeFileSync(at("public/sw.js"), "/* Built by tools/build.mjs from src/sw.js. */\n" + sw);
if (!quiet) console.log("public/index.html and public/sw.js updated");
