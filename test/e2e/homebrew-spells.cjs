// Homebrew spells: made in the Homebrew tab, shown in the Spells tab. Run with:  npm run test:hbspell
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png" };
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
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#homebrew"); await p.waitForFunction(() => typeof renderHomebrew === "function");
  await p.waitForTimeout(300);
  const spellRows = () => p.evaluate(() => [...document.querySelectorAll(".sp-row")].map(x => x.textContent));
  const searchSpells = async q => { await p.goto(URL + "#spells"); await p.waitForTimeout(300); await p.evaluate(() => { SP.ed = "2014"; }); await p.fill("#spQ", q); await p.dispatchEvent("#spQ", "input"); await p.waitForTimeout(300); };

  // 1. a Spells group
  const newBtn = '#hbSide [data-hbnew="spell"]';
  check("the Homebrew tab has a Spells group", await p.$(newBtn) !== null);
  // 2. make a cantrip
  await p.click(newBtn);
  await p.fill('#hbMain [data-hbf="name"]', "Cheers");
  await p.selectOption('#hbMain [data-hbf="ed"]', "2014");
  await p.fill('#hbMain [data-hbf="desc"]', "Drinks for all");
  await p.selectOption('#hbMain [data-hbf="l"]', "0");
  await p.selectOption('#hbMain [data-hbf="s"]', "Enchantment");
  await p.check('#hbMain [data-hbcls="Wizard"]');
  await p.click('#hbMain [data-hbact="save"]'); await p.waitForTimeout(400);
  const saved = await p.evaluate(() => HB.list.find(x => x.name === "Cheers"));
  check("a homebrew spell saves", !!saved && saved.kind === "spell" && saved.l === 0 && JSON.stringify(saved.c) === '["Wizard"]', JSON.stringify(saved));
  // 3. it shows in the Spells tab with a Homebrew tag
  await searchSpells("Cheers");
  const rows = await spellRows();
  check("the Spells tab lists the homebrew spell", rows.length === 1 && /Cheers/.test(rows[0]), JSON.stringify(rows));
  check("it carries a Homebrew tag", rows.length === 1 && /Homebrew/.test(rows[0]));
  // 4. lookups find it
  check("spellOf finds it with its text", await p.evaluate(() => (spellOf("2014", "Cheers") || {}).d === "Drinks for all"));
  // 5. a built-in name is refused
  await p.goto(URL + "#homebrew"); await p.waitForTimeout(300);
  await p.click(newBtn);
  await p.fill('#hbMain [data-hbf="name"]', "Fireball");
  await p.click('#hbMain [data-hbact="save"]'); await p.waitForTimeout(300);
  check("a built-in spell name is refused", /already a built-in/.test(await p.textContent("#hbMsg")), await p.textContent("#hbMsg"));
  await p.click('#hbMain [data-hbact="close"]'); await p.waitForTimeout(200);
  const yes = await p.$("#modal.open #modalYes"); if (yes) await yes.click();
  // 6. delete removes it from the Spells tab
  await p.click(`#hbSide [data-hbsel="${saved.id}"]`); await p.waitForTimeout(200);
  await p.click('#hbMain [data-hbact="del"]'); await p.click("#modalYes"); await p.waitForTimeout(400);
  await searchSpells("Cheers");
  check("a deleted homebrew spell leaves the Spells tab", (await spellRows()).length === 0);
  // 7. long feature text survives
  const kept = await p.evaluate(async () => { const d = hbNew("subclass"); d.name = "Long Path"; d.features = [{ l: 3, n: "Long", d: "x".repeat(3000) }]; await hbPut(hbItemOf(d)); return HB.list.find(y => y.name === "Long Path").features[0].d.length; });
  check("feature text up to 4000 characters is kept", kept === 3000, String(kept));

  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll homebrew spell checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
