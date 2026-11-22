// Builds the app's page from src/ into public/:  npm run build:app   (npm run build does this and bundles the portal too)
//
//   src/index.html     the page: header, tabs and windows      -> public/index.html
//   src/app.css        the styling                              -> public/assets/app.<fingerprint>.css
//   src/app/*.js       the app's code, joined in file order     -> public/assets/app.<fingerprint>.js
//   data/*.json        built-in spells, monsters and items      -> public/assets/<name>.<fingerprint>.js
//                      (extra-*.json: the open-licensed extra books, joined to the lists by dmData in src/app/01-core.js)
//   data/extra-books.json  the extra books' credits             -> public/credits.html (the Open Game License asks for it)
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
import { transformSync } from "esbuild";

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
function emitCatalog(name, key, data, source = name) {
  const text = JSON.stringify(data);
  const literal = JSON.stringify(text).replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
  emit(name, "js", `/* Built from data/${source}.json by tools/build.mjs. */\n(window.DMDATA = window.DMDATA || {}).${key} = ${literal};\n`);
}
mkdirSync(at("public/assets/"), { recursive: true });
const spellGrants = JSON.parse(read("data/spell-grants.json"));
for (const [name, key] of [["spells", "spellData"], ["monsters", "monsterData"], ["items", "itemData"],
  ["extra-spells", "spellExtra"], ["extra-monsters", "monsterExtra"], ["extra-items", "itemExtra"], ["extra-options", "optionExtra"], ["extra-books", "bookData"], ["book-references", "bookReferences"]]) {
  // stored as text, so the app turns it into objects only when a tab needs it (dmData in src/app/01-core.js)
  let data = JSON.parse(read(`data/${name}.json`));
  if (name === "spells") data["2014"].push(...spellGrants.legacySpells);
  if (name === "extra-options") {
    const ids = new Set(data.map(option => option.id));
    for (const id of Object.keys(spellGrants.options)) {
      if (!ids.has(id)) throw new Error(`Unknown spell-grant option: ${id}`);
    }
    data = data.map(option => {
      const grants = spellGrants.options[option.id];
      if (!grants) return option;
      const { lineages, ...fields } = grants;
      const entry = { ...option, ...fields };
      if (lineages) {
        entry.subs = entry.subs.map(lineage => ({ ...lineage, ...lineages[lineage.n] }));
      }
      return entry;
    });
  }
  if (name === "book-references") {
    for (const ed of ["2014", "2024"]) {
      emitCatalog(`book-references-${ed}`, `bookReferences${ed}`, data.filter(row => (row.ed || "2014") === ed), name);
    }
  } else {
    emitCatalog(name, key, data);
  }
  if (name === "extra-monsters") {
    emitCatalog("monster-index", "monsterIndex", data.map(({ n, src }) => [n, src]), name);
  }
}
// the credits page for the extra books (each book's notice and licence, and the Open Game License text)
{
  const { books, ogl } = JSON.parse(read("data/extra-books.json"));
  const h = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const refs = Object.values(books).filter(b => b.lic === "reference");
  const L = Object.values(books).filter(b => b.lic !== "reference"), ogls = L.filter(b => b.lic === "ogl-10a"), ccs = L.filter(b => b.lic === "cc-by-40");
  for (const b of L) if (b.url && !/^https:\/\//.test(b.url)) throw new Error(`data/extra-books.json: ${b.name}'s link isn't https: ${b.url}`);
  const link = b => b.url ? ` <a href="${h(b.url)}" rel="noopener">${h(b.url)}</a>` : "";
  const page = `<!DOCTYPE html>
<!-- Built by tools/build.mjs from data/extra-books.json. -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Credits and licences · Dungeon Master's Forge</title>
<style>body{font:16px/1.55 Georgia,serif;max-width:760px;margin:0 auto;padding:24px 18px;color:#2a2118;background:#f6efe2}h1,h2{font-family:Cinzel,Georgia,serif}li{margin:6px 0}pre{white-space:pre-wrap;font:13px/1.45 Georgia,serif;background:#fffaf0;border:1px solid #d9c9a8;padding:14px}a{color:#7a2e12}</style></head><body>
<h1>Credits and licences</h1>
<p><a href="/">← Back to the Forge</a></p>
<h2>Official rules</h2>
<p>This work includes material from the System Reference Document 5.1 (“SRD 5.1”) and System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at <a href="https://dnd.wizards.com/resources/systems-reference-document">dnd.wizards.com/resources/systems-reference-document</a>, licensed under the <a href="https://creativecommons.org/licenses/by/4.0/legalcode">Creative Commons Attribution 4.0 International License</a>.</p>
<h2>Extra books</h2>
<p>The extra monsters, spells and magic items (marked with their book's name in the lists) come from these books, through the open-source <a href="https://github.com/open5e/open5e-api">Open5e</a> project. They were converted into the Forge's format; the rules text is unchanged. None of these publishers endorse the Forge.</p>
<ul>${L.map(b => `<li><b>${h(b.name)}</b> by ${h(b.authors || b.by)} (${h(b.by)}${b.year ? ", " + h(b.year) : ""}). ${b.lic === "cc-by-40" ? `Licensed under the <a href="https://creativecommons.org/licenses/by/4.0/legalcode">Creative Commons Attribution 4.0 International License</a>.` : "Open Game Content under the Open Game License 1.0a (below)."}${link(b)}</li>`).join("\n")}</ul>
${refs.length ? `<h2>Rules summaries</h2><ul>${refs.map(b => `<li><cite>${h(b.name)}</cite> by ${h(b.by)}. Entry details include printed page references where available.</li>`).join("")}</ul>` : ""}
<h2>Open Game License</h2>
<p><b>Designation of Open Game Content:</b> the rules text of the monsters, spells and magic items from ${ogls.map(b => h(b.name)).join(", ")} shown in the Forge is Open Game Content. <b>Product Identity:</b> none is used; the Forge's own name, code, pictures and other text are not Open Game Content.</p>
<pre>${h(ogl.trim())}

15. COPYRIGHT NOTICE
Open Game License v 1.0a Copyright 2000, Wizards of the Coast, LLC.
System Reference Document 5.1 Copyright 2016, Wizards of the Coast, Inc.; Authors Mike Mearls, Jeremy Crawford, Chris Perkins, Rodney Thompson, Peter Lee, James Wyatt, Robert J. Schwalb, Bruce R. Cordell, Chris Sims, and Steve Townshend, based on original material by E. Gary Gygax and Dave Arneson.
${ogls.map(b => `${h(b.name)}. Copyright ${h(b.year)} ${h(b.by)}; Authors ${h(b.authors)}.`).join("\n")}</pre>
${ccs.length ? `<p>${ccs.map(b => h(b.name)).join(" and ")}: Creative Commons Attribution 4.0, credited above.</p>` : ""}
</body></html>
`;
  writeFileSync(at("public/credits.html"), page);
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
emit("app", "js", transformSync(code, { minifyWhitespace: true, target: "es2022" }).code);

// 3. the page and the service worker point at them
let html = read("src/index.html");
const revision = process.env.COMMIT_REF;
if (/^[0-9a-f]{40}$/.test(revision || "")) {
  html = html.replace("</head>", `<meta name="forge-revision" content="${revision}">\n</head>`);
}
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
const coreFiles = files.filter(f => !/^\/assets\/(extra-monsters|monster-index|book-references-(2014|2024))\./.test(f));
const sw = read("src/sw.js").replace(/^const ASSETS = .*$/m, `const ASSETS = ${JSON.stringify(coreFiles)};`)
  .replace(/^const CACHE = "([\w-]+?)";/m, (_, name) => `const CACHE = "${name}-${fp(files.join())}";`);
writeFileSync(at("public/sw.js"), "/* Built by tools/build.mjs from src/sw.js. */\n" + sw);
if (!quiet) console.log("public/index.html and public/sw.js updated");
