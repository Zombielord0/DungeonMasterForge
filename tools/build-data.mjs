// Turns the built-in rules data (data/spells.json, data/monsters.json, data/items.json) into the files the app loads:
//   public/data/<name>.<fingerprint>.js   e.g. public/data/spells.3f2a9c1e04.js
// and points public/index.html and public/sw.js at them. Run it after changing anything in data/:  npm run build:data
// (npm run build runs it too, so Netlify always publishes matching files.)
//
// Why script files with a fingerprint in the name: the page itself is always fetched fresh so updates show at once,
// but this data is about 2 MB and rarely changes. As separate files that never change under the same name, the browser
// keeps them for a year and only downloads them again when the data really changes (the name changes with it).
// Each file stores the JSON as text (DMDATA.spellData = "..."), so the app still turns it into objects only when a tab needs it.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const at = p => new URL(p, root);
const SETS = [["spells", "spellData"], ["monsters", "monsterData"], ["items", "itemData"]];

mkdirSync(at("public/data/"), { recursive: true });
const urls = [];
let html = readFileSync(at("public/index.html"), "utf8");
for (const [name, key] of SETS) {
  const text = JSON.stringify(JSON.parse(readFileSync(at(`data/${name}.json`), "utf8"))); // checks it's valid and strips spacing
  const lit = JSON.stringify(text).split(String.fromCharCode(0x2028)).join("\\u2028").split(String.fromCharCode(0x2029)).join("\\u2029");
  const js = `/* Built by tools/build-data.mjs from data/${name}.json. Don't edit; change data/${name}.json and run npm run build:data. */\n(window.DMDATA = window.DMDATA || {}).${key} = ${lit};\n`;
  const file = `${name}.${createHash("sha256").update(js).digest("hex").slice(0, 10)}.js`;
  for (const f of readdirSync(at("public/data/"))) if (f.startsWith(name + ".") && f !== file) unlinkSync(at(`public/data/${f}`));
  writeFileSync(at(`public/data/${file}`), js);
  const tag = `<script src="/data/${file}"></script>`;
  const re = new RegExp(`<script src="/data/${name}\\.[0-9a-f]+\\.js"></script>`);
  if (!re.test(html)) throw new Error(`public/index.html has no <script src="/data/${name}.….js"> tag`);
  html = html.replace(re, tag);
  urls.push(`/data/${file}`);
  console.log(`${file}  ${(js.length / 1024).toFixed(0)} KB`);
}
writeFileSync(at("public/index.html"), html);

// The service worker keeps these files for offline use; its cache name changes with them so old copies are cleared.
let sw = readFileSync(at("public/sw.js"), "utf8");
const tag = createHash("sha256").update(urls.join()).digest("hex").slice(0, 8);
const swNew = sw.replace(/^const DATA = .*$/m, `const DATA = ${JSON.stringify(urls)}; // written by tools/build-data.mjs`)
  .replace(/^const CACHE = "dmforge-v(\d+)(-[0-9a-f]+)?";/m, (_, v) => `const CACHE = "dmforge-v${v}-${tag}";`);
if (!/^const DATA = /m.test(swNew)) throw new Error("public/sw.js has no `const DATA = ` line");
writeFileSync(at("public/sw.js"), swNew);
