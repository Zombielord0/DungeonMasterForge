// The monster builder's Senses, languages & defenses box (2026-11-25): every field has a drop-down.
// Run with:  npm run test:mbuild
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
let fails = 0;
const CRS = [0, 0.125, 0.25, 0.5, ...Array.from({ length: 30 }, (_, i) => i + 1)], crSteps = cr => CRS.indexOf(cr);
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
    /* recommended CR (2026-11-25): how close it gets to the SRD monsters' real CRs (the Guide's table measured 0.76 / 0.74) */
    const acc = await p.evaluate(() => { bsLoad(); return ["2014", "2024"].map(ed => { const L = BS.data[ed].filter(m => !m.src && m.cr >= 0.125); return L.filter(m => Math.abs(crIdx(crRecommend(m).cr) - crIdx(m.cr)) <= 1).length / L.length; }); });
    check("recommended CR is within 1 of the real CR for at least 70% of SRD monsters (2014, 2024)", acc.every(a => a >= 0.7), acc.map(a => a.toFixed(2)).join(", "));
    const owl = await p.evaluate(() => { bsLoad(); const m = BS.data["2014"].find(x => x.n === "Owlbear"); return crRecommend(m).cr; });
    check("an Owlbear (CR 3) comes out within 1 CR", [2, 3, 4].includes(owl), String(owl));
    /* the builder shows it, and features move it */
    await p.evaluate(() => {
      const f = mbBlank(); Object.assign(f, { name: "Test Brute", cr: 1, ac: 15, hdN: 15, hdD: 10, scores: [18, 12, 16, 6, 10, 8] });
      f.actions = [{ n: "Multiattack", t: "The brute makes two Slam attacks." }, { n: "Slam", t: "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage." }];
      mbOpen(f);
    });
    await p.waitForTimeout(500);
    const rec0 = await p.evaluate(() => ({ text: document.querySelector("#mbCRRec").textContent, cr: MB.rec && MB.rec.cr }));
    check("the builder shows a recommended CR with defense and offense", /Recommended: CR \d/.test(rec0.text) && /defense/i.test(rec0.text) && /offense/i.test(rec0.text), rec0.text);
    await p.evaluate(() => { MB.f.legend = [{ n: "Slam", t: "The brute makes one Slam attack." }, { n: "Stomp (Costs 2 Actions)", t: "Melee Weapon Attack: +6 to hit, reach 5 ft. Hit: 20 (3d10 + 4) bludgeoning damage." }]; MB.f.traits = [{ n: "Legendary Resistance (3/Day)", t: "If the brute fails a saving throw, it can choose to succeed instead." }]; mbFillForm(); });
    await p.waitForTimeout(500);
    const rec1 = await p.evaluate(() => ({ text: document.querySelector("#mbCRRec").textContent, cr: MB.rec && MB.rec.cr }));
    check("legendary actions and resistance raise it by at least 2 CR", crSteps(rec1.cr) - crSteps(rec0.cr) >= 2 && /Legendary actions/.test(rec1.text) && /Legendary Resistance/.test(rec1.text), `${rec0.cr} -> ${rec1.cr}: ${rec1.text}`);
    await p.click("[data-mbcruse]"); await p.waitForTimeout(300);
    check("Use CR sets the challenge rating", await p.evaluate(cr => +document.querySelector("#mbCR").value === cr && +MB.f.cr === cr, rec1.cr));
    check("…and the button goes once they match", await p.evaluate(() => !document.querySelector("[data-mbcruse]")));
    check("no page errors", !errs.length, errs.join(" | "));
    await ctx.close();
  } catch (e) { console.error(e); fails++; }
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll monster builder checks passed");
  process.exit(fails ? 1 : 0);
})();
