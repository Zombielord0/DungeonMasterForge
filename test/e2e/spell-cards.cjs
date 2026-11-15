// Printable spell cards from My Characters. Run with:  npm run test:cards
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
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
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 950 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL); await p.waitForFunction(() => typeof generateCharacter === "function");
  await p.evaluate(() => { currentPC = pcEnsure(generateCharacter({ seed: "CARDS1", name: "Ilsa", ed: "2024", cls: "Wizard", level: 3 })); keepPC(); });
  await p.goto(URL + "#roster"); await p.waitForTimeout(500);
  // no prepared spells yet -> a friendly message
  await p.evaluate(() => { PCS.roster[0].prepared = []; pcPersist(); renderRosterMain(); });
  await p.click('[data-ra="cards"]');
  check("with no prepared spells it says so", /No prepared spells/.test(await p.textContent("#toast")));
  await p.evaluate(() => { PCS.roster[0].prepared = [{ n: "Magic Missile", l: 1, ed: "2024" }, { n: "Fire Bolt", l: 0, ed: "2024" }, { n: "Shield", l: 1, ed: "2024" }]; pcPersist(); renderRosterMain(); });
  await p.click('[data-ra="cards"]');
  await p.waitForSelector("#sheetOverlay.open");
  const cards = await p.$$eval("#sheetBody .icard", els => els.map(e => e.textContent));
  check("one card per prepared spell", cards.length === 3, cards.length);
  check("cards are in level order, cantrips first", /Fire Bolt/.test(cards[0]) && /Magic Missile/.test(cards[1]) && /Shield/.test(cards[2]));
  check("a card shows casting time, range, components and duration", ["Casting time", "Range", "Components", "Duration"].every(k => cards[1].includes(k)));
  check("a card shows the spell's text", /dart/i.test(cards[1]));
  check("card text uses the card's full width (not squeezed by the death-save dot style)", await p.evaluate(() => document.querySelector("#sheetBody .icard .ds").getBoundingClientRect().width > 150));
  check("the window is titled Spell cards", (await p.getAttribute("#sheetOverlay", "aria-label")) === "Spell cards");
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll spell card checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
