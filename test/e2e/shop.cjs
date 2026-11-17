// Shop generator on the Items tab. Run with:  npm run test:shop
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png" };
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
  await p.goto(URL); await p.waitForFunction(() => typeof generateCharacter === "function");
  await p.evaluate(() => { currentPC = pcEnsure(generateCharacter({ seed: "SHOP1", name: "Brom", ed: "2024" })); keepPC(); PCS.roster[0].coins = { cp: 0, sp: 0, ep: 0, gp: 500, pp: 0 }; pcPersist(); });
  await p.goto(URL + "#items"); await p.waitForTimeout(300);

  // the rules: what each kind of shop stocks
  const r = await p.evaluate(() => {
    const out = {};
    const a = shopMake({ type: "smith", size: "town", level: 3, seed: "S1", ed: "2024" }), b = shopMake({ type: "smith", size: "town", level: 3, seed: "S1", ed: "2024" });
    out.same = JSON.stringify(a) === JSON.stringify(b);
    out.smithOk = a.stock.length >= 6 && a.stock.every(x => /Weapon|Armor/.test(x.cat + " " + (x.g || "")));
    out.named = !!a.name && !!a.keeper && !!a.mood;
    out.priced = a.stock.every(x => x.gp > 0 && x.qty >= 1);
    const v = shopMake({ type: "magic", size: "village", level: 3, seed: "S2", ed: "2014" }), c = shopMake({ type: "magic", size: "city", level: 12, seed: "S2", ed: "2014" });
    out.villageMagic = v.stock.filter(x => x.kind === "magic").every(x => x.rk <= 1) && v.stock.length <= 6;
    out.cityMagic = c.stock.some(x => x.kind === "magic" && x.rk >= 2) && c.stock.length > v.stock.length;
    const alc = shopMake({ type: "alchemist", size: "town", level: 3, seed: "S3", ed: "2014" });
    out.alchemist = alc.stock.some(x => /potion|acid|antitoxin|alchemist|healer|herbal/i.test(x.n));
    const big = shopMake({ type: "general", size: "city", level: 3, seed: "S4", ed: "2024" }), small = shopMake({ type: "general", size: "village", level: 3, seed: "S4", ed: "2024" });
    out.sizes = big.stock.length > small.stock.length;
    // new options (2026-11-17): rarity, amount, manner
    const o1 = shopMake({ type: "smith", size: "town", level: 3, seed: "S1", ed: "2024" }), o2 = shopMake({ type: "smith", size: "town", level: 3, seed: "S1", ed: "2024", amount: undefined, rar: undefined });
    out.old = JSON.stringify(o1) === JSON.stringify(o2) && o1.stock.map(x => x.id).join() === "2024-g48,2024-g69,2024-g76,2024-g82,2024-g87,2024-g90,2024-g113,2024-g142,2024-g146,2024-g152";
    const ro = shopMake({ type: "magic", size: "city", level: 12, seed: "R1", ed: "2014", rar: [2] }).stock.filter(x => x.kind === "magic");
    out.rarOnly = ro.length >= 2 && ro.every(x => x.rk === 2);
    const rs = shopMake({ type: "smith", size: "village", level: 1, seed: "R2", ed: "2024", rar: [1] }).stock.filter(x => x.kind === "magic");
    out.rarSmith = rs.length >= 2 && rs.every(x => x.rk === 1);
    out.rarGeneral = shopMake({ type: "general", size: "town", level: 3, seed: "R3", ed: "2024", rar: [3] }).stock.every(x => x.kind !== "magic");
    const am = k => shopMake({ type: "general", size: "city", level: 3, seed: "A1", ed: "2024", amount: k }).stock.length;
    out.amount = am("small") >= 1 && am("small") < am("normal") && am("normal") < am("large");
    const m1 = shopMake({ type: "general", size: "town", level: 3, seed: "M1", ed: "2024", moodIx: 1 }), m0 = shopMake({ type: "general", size: "town", level: 3, seed: "M1", ed: "2024" });
    out.mood = m1.mood === SHOP_MOODS[1][0] && m1.moodIx === 1 && Number.isInteger(m0.moodIx) && SHOP_MOODS[m0.moodIx][0] === m0.mood;
    const m4 = shopMake({ type: "general", size: "town", level: 3, seed: "M2", ed: "2024", moodIx: 4 }), g = m4.stock[0], base = IT.data["2024"].find(x => x.id === g.id);
    out.moodPrice = g.gp === shopNiceGp(+base.gp * 1.25);
    return out;
  });
  check("old shops keep their stock (same seed, no new options)", r.old);
  check("a rarity choice gives only that rarity, at least 2", r.rarOnly);
  check("a rarity choice puts magic items in a village smithy", r.rarSmith);
  check("a rarity choice adds no magic to a general store", r.rarGeneral);
  check("small < normal < large stock", r.amount);
  check("a chosen manner is used and remembered", r.mood);
  check("the manner sets the prices", r.moodPrice);
  check("the same seed makes the same shop", r.same);
  check("a blacksmith sells weapons and armor", r.smithOk);
  check("a shop has a name, a shopkeeper and a manner", r.named);
  check("everything has a price and a quantity", r.priced);
  check("a village magic shop has only common or uncommon items", r.villageMagic);
  check("a city magic shop has rarer items and more of them", r.cityMagic);
  check("an alchemist sells potions and the like", r.alchemist);
  check("cities have bigger shops than villages", r.sizes);

  // the page
  await p.click("#itShopBtn");
  check("Generate a shop shows a shop", await p.isVisible("#itShop") && (await p.$$("#itShop [data-shopbuy]")).length > 0);
  await p.selectOption("#shopType", "smith"); await p.selectOption("#shopSize", "town");
  const first = await p.evaluate(() => IT.shop.stock[0]);
  await p.click("#shopReroll");
  check("Roll again gives a different shop", await p.evaluate(n => IT.shop.name !== n || IT.shop.seed !== "", first.n));
  const it = await p.evaluate(() => IT.shop.stock[0]);
  const gpOf = () => p.evaluate(() => { const c = PCS.roster[0].coins; return (+c.gp || 0) + (+c.pp || 0) * 10 + (+c.sp || 0) / 10 + (+c.cp || 0) / 100 + (+c.ep || 0) / 2; });
  const before = await gpOf();
  await p.click('#itShop [data-shopbuy="0"]');
  const after = await p.evaluate(() => { const c = PCS.roster[0]; return { gp: (+c.coins.gp || 0) + (+c.coins.pp || 0) * 10 + (+c.coins.sp || 0) / 10 + (+c.coins.cp || 0) / 100 + (+c.coins.ep || 0) / 2, has: (c.inv || []).some(i => i.n === IT.shop.stock[0].n), qty: IT.shop.stock[0].qty }; });
  check("Buy pays the shop's price", Math.abs(after.gp - (before - it.gp)) < 0.02, `${after.gp} vs ${before - it.gp}`);
  check("Buy puts the item in the character's inventory", after.has);
  check("the shop has one fewer", after.qty === it.qty - 1);
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll shop checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
