// The monster builder's Senses, languages & defenses box (2026-11-25): every field has a drop-down.
// Run with:  npm run test:mbuild
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
    await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    const p = await ctx.newPage(), errs = []; p.on("pageerror", e => errs.push(e.message));
    await p.goto(URL + "#monsters"); await p.waitForFunction(() => typeof mbCompile === "function");
    await p.click('label.opt:has(input[name="monMode"][value="build"])'); await p.waitForTimeout(300);

    // senses: each is a drop-down of distances
    const senses = await p.evaluate(() => ["dark", "blind", "tremor", "true"].map(k => { const el = document.querySelector(`#mbForm [data-mb="senses.${k}"]`); return el && el.tagName === "SELECT" && [...el.options].some(o => o.value === "60") && [...el.options].some(o => o.value === ""); }));
    check("each sense is a drop-down of distances, with none", senses.every(Boolean), JSON.stringify(senses));
    await p.selectOption('#mbForm [data-mb="senses.blind"]', "30"); await p.waitForTimeout(400);
    check("picking blindsight 30 ft. shows in the stat block", await p.evaluate(() => /blindsight 30 ft\./.test(document.querySelector("#mbPreview").textContent)));

    // languages and defences: a drop-down beside each that adds to the list
    const picks = await p.evaluate(() => ["lang", "res", "imm", "vul", "ci"].map(k => { const s = document.querySelector(`#mbForm select[data-mbpick="${k}"]`); return s ? s.options.length : 0; }));
    check("languages, resistances, immunities, vulnerabilities and condition immunities each have a drop-down", picks.every(n => n > 5), JSON.stringify(picks));
    await p.selectOption('#mbForm select[data-mbpick="lang"]', "Common");
    await p.selectOption('#mbForm select[data-mbpick="lang"]', "Draconic");
    await p.selectOption('#mbForm select[data-mbpick="lang"]', "telepathy 60 ft.");
    check("languages add up, replacing the dash", await p.evaluate(() => document.querySelector("#mbLang").value === "Common, Draconic, telepathy 60 ft." && MB.f.lang === "Common, Draconic, telepathy 60 ft."), await p.evaluate(() => document.querySelector("#mbLang").value));
    await p.selectOption('#mbForm select[data-mbpick="lang"]', "Common");
    check("picking one already there doesn't add it twice", await p.evaluate(() => document.querySelector("#mbLang").value === "Common, Draconic, telepathy 60 ft."));
    check("the drop-down goes back to its prompt", await p.evaluate(() => document.querySelector('#mbForm select[data-mbpick="lang"]').value === ""));
    await p.selectOption('#mbForm select[data-mbpick="res"]', "cold");
    await p.selectOption('#mbForm select[data-mbpick="res"]', "bludgeoning, piercing, and slashing from nonmagical attacks");
    check("a resistance with commas joins with a semicolon", await p.evaluate(() => document.querySelector("#mbRes").value === "cold; bludgeoning, piercing, and slashing from nonmagical attacks"), await p.evaluate(() => document.querySelector("#mbRes").value));
    await p.selectOption('#mbForm select[data-mbpick="imm"]', "poison");
    await p.selectOption('#mbForm select[data-mbpick="vul"]', "radiant");
    await p.selectOption('#mbForm select[data-mbpick="ci"]', "poisoned");
    await p.selectOption('#mbForm select[data-mbpick="ci"]', "exhaustion");
    await p.waitForTimeout(400);
    const prev = await p.evaluate(() => document.querySelector("#mbPreview").textContent);
    check("the stat block shows them all", /Common, Draconic, telepathy 60 ft\./.test(prev) && /poisoned, exhaustion/.test(prev) && /radiant/.test(prev), prev.slice(0, 400));
    check("the text boxes can still be typed in", await p.evaluate(() => ["#mbLang", "#mbRes", "#mbImm", "#mbVul", "#mbCI"].every(s => document.querySelector(s).tagName === "INPUT")));

    // editing a copy of a monster with an unusual distance keeps it
    await p.evaluate(() => { const m = Object.assign(mbCompile(mbBlank()), { senses: "darkvision 45 ft., passive Perception 10", n: "Odd" }); mbOpen(mbFromMonster(m)); });
    check("an unusual distance from a copied monster stays picked", await p.evaluate(() => document.querySelector('#mbForm [data-mb="senses.dark"]').value === "45"));
    check("no page errors", !errs.length, errs.join(" | "));
    await ctx.close();
  } catch (e) { console.error(e); fails++; }
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll monster builder checks passed");
  process.exit(fails ? 1 : 0);
})();
