// The treasure hoard generator (2026-11-19): Items tab and the Campaign Tracker's Loot tab.
// Run with:  npm run test:hoard
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webp": "image/webp" };
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
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#items"); await p.waitForFunction(() => typeof hoardRoll === "function" && $("#storeBadge").textContent !== "Connecting…", null, { timeout: 15000 });

  // the rolls themselves
  const stats = await p.evaluate(() => {
    const out = [];
    for (let t = 0; t < 4; t++) {
      let gp = 0, minRk = 9, maxRk = -1, n = 0, items = 0, dup = false;
      for (let i = 0; i < 200; i++) {
        const H = hoardRoll(t, "S" + i, i % 2 ? "2014" : "2024"); gp += hoardTotalGp(H); n++; items += H.items.length;
        H.items.forEach(x => { minRk = Math.min(minRk, x.rk); maxRk = Math.max(maxRk, x.rk); });
        if (new Set(H.items.map(x => x.n)).size !== H.items.length) dup = true;
      }
      out.push({ avg: Math.round(gp / n), minRk, maxRk, items: items / n, dup });
    }
    return out;
  });
  check("bigger challenges give bigger hoards", stats.every((s, i) => !i || s.avg > stats[i - 1].avg * 2), JSON.stringify(stats.map(s => s.avg)));
  check("low-challenge hoards hold no very rare or legendary items", stats[0].maxRk <= 2, JSON.stringify(stats[0]));
  check("the top band holds nothing below rare, and some legendary", stats[3].minRk >= 2 && stats[3].maxRk === 4, JSON.stringify(stats[3]));
  check("a hoard never holds the same magic item twice", stats.every(s => !s.dup));
  check("the same seed gives the same hoard", await p.evaluate(() => JSON.stringify(hoardRoll(2, "SAME", "2024")) === JSON.stringify(hoardRoll(2, "SAME", "2024"))));
  check("2014 hoards use 2014 items", await p.evaluate(() => { itLoad(); const names = new Set(IT.data["2014"].filter(x => x.kind === "magic").map(x => x.n)); return [...Array(40)].every((_, i) => hoardRoll(1, "E" + i, "2014").items.every(x => names.has(x.n))); }));

  // the Items tab panel
  await p.evaluate(() => { const c = blankCampaign("Ashes of Velmor"); Store.save(c); });
  await p.click("#itHoardBtn"); await p.waitForTimeout(200);
  check("Treasure hoard opens a hoard on the Items tab", await p.evaluate(() => !document.querySelector("#itHoard").hidden && /Coins/.test(document.querySelector("#itHoard").textContent) && /Magic items/.test(document.querySelector("#itHoard").textContent)));
  await p.selectOption('#itHoard [data-hoard="tier"]', "3"); await p.waitForTimeout(200);
  check("choosing a challenge band rolls a hoard for it", await p.evaluate(() => HOARD.H.tier === 3 && /Challenge 17\+/.test(document.querySelector('#itHoard [data-hoard="tier"] option:checked').textContent)));
  const before = await p.evaluate(() => JSON.stringify(HOARD.H));
  await p.click('#itHoard [data-hoard="roll"]'); await p.waitForTimeout(150);
  check("Roll again gives a new hoard of the same band", await p.evaluate(b => JSON.stringify(HOARD.H) !== b && HOARD.H.tier === 3, before));
  const expect = await p.evaluate(() => 1 + HOARD.H.groups.length + HOARD.H.items.length);
  await p.click('#itHoard [data-hoard="loot"]'); await p.waitForTimeout(300);
  const loot = await p.evaluate(() => Store.list()[0].loot);
  check("Add to campaign Loot puts the coins, each gem or art group and each item on the Loot list", loot.length === expect && /^Coins: /.test(loot[0].item) && loot.every(l => l.id && l.item), JSON.stringify(loot.slice(0, 3)));
  await p.click('#itHoard [data-hoard="close"]'); await p.waitForTimeout(100);
  check("✕ closes the hoard", await p.evaluate(() => document.querySelector("#itHoard").hidden));

  // the Campaign Tracker's Loot tab
  await p.goto(URL + "#tracker"); await p.waitForTimeout(300);
  await p.evaluate(() => { const c = Store.list()[0]; c.currentLevel = 12; Store.save(c); activeId = c.id; subTab = "loot"; renderTracker(); }); await p.waitForTimeout(200);
  await p.click("[data-hoardopen]"); await p.waitForTimeout(200);
  check("the Loot tab rolls a hoard for the campaign's level", await p.evaluate(() => !!document.querySelector("#campMain .hoard") && HOARD.T.tier === 2));
  const n0 = await p.evaluate(() => curCamp().loot.length), add = await p.evaluate(() => 1 + HOARD.T.groups.length + HOARD.T.items.length);
  await p.click('#campMain .hoard [data-hoard="loot"]'); await p.waitForTimeout(300);
  check("…and adds it to this campaign's Loot, which shows it", await p.evaluate(([n0, add]) => curCamp().loot.length === n0 + add && !document.querySelector("#campMain .hoard") && document.querySelectorAll('#campMain [data-del="loot"]').length === n0 + add, [n0, add]));
  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
