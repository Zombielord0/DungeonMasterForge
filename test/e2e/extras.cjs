// The open-licensed extra books (2026-11-20): Kobold Press monsters, spells and magic items, and Spells That Don't Suck,
// joined to the SRD lists (data/extra-*.json, dmData in src/app/01-core.js). Run with:  npm run test:extras
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
const data = n => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "data", n + ".json"), "utf8"));
const SRD = { sp: data("spells"), mon: data("monsters"), it: data("items") };
const X = { sp: data("extra-spells"), mon: data("extra-monsters"), it: data("extra-items"), books: data("extra-books").books };

(async () => {
  // the data files themselves
  const lc = s => s.toLowerCase();
  const srdNames = (o, f) => new Set(["2014", "2024"].flatMap(ed => f(o[ed]).map(x => lc(x.n))));
  check("no extra spell has an SRD spell's name", !X.sp.some(s => srdNames(SRD.sp, l => l).has(lc(s.n))));
  check("no extra monster has an SRD monster's name", !X.mon.some(m => srdNames(SRD.mon, l => l).has(lc(m.n))));
  check("no extra magic item has an SRD item's name", !X.it.some(m => srdNames(SRD.it, l => l.mi).has(lc(m.n))));
  check("no name appears twice in an extras list", [X.sp, X.mon, X.it].every(L => new Set(L.map(x => lc(x.n))).size === L.length));
  check("every extra entry names a known book", [...X.sp, ...X.mon, ...X.it].every(x => X.books[x.src]));
  check("every book is OGL 1.0a or CC BY 4.0", Object.values(X.books).every(b => b.lic === "ogl-10a" || b.lic === "cc-by-40"));
  check("every extra monster has a habitat", X.mon.every(m => (m.env || []).length));
  check("no extra monster lives everywhere", X.mon.every(m => m.env.length <= 8), JSON.stringify(X.mon.filter(m => m.env.length > 8).map(m => m.n).slice(0, 5)));
  check("extra magic items have fixed keys", X.it.every(m => /^[a-z0-9-]+_[a-z0-9-]+$/.test(m.k)) && new Set(X.it.map(m => m.k)).size === X.it.length);
  check("lots of each kind", X.sp.length > 800 && X.mon.length > 1500 && X.it.length > 1000, `${X.sp.length} spells, ${X.mon.length} monsters, ${X.it.length} items`);

  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#spells"); await p.waitForFunction(() => typeof spLoad === "function" && $("#storeBadge").textContent !== "Connecting…", null, { timeout: 15000 });

  // ---- spells ----
  const sp = await p.evaluate(() => {
    spLoad();
    const ex = ed => SP.data[ed].filter(s => s.src);
    const a = SP.data["2014"].find(s => s.n === "Abhorrent Apparition"), b = SP.data["2024"].find(s => s.n === "Abhorrent Apparition");
    return { n14: SP.data["2014"].length, n24: SP.data["2024"].length, x14: ex("2014").length, x24: ex("2024").length,
      first: spFind("2014-0").n, a: a && { id: a.id, t: a.t, src: a.src, save: a.save }, b: b && { t: b.t },
      sameObj: a === b, books: [...$("#spBook").options].map(o => o.value) };
  });
  check("spells: every extra spell is in both editions", sp.x14 === X.sp.length && sp.x24 === X.sp.length, JSON.stringify(sp));
  check("spells: the SRD spells keep their places", sp.first === SRD.sp["2014"][0].n && sp.n14 === SRD.sp["2014"].length + X.sp.length);
  check("spells: each edition has its own copy", sp.a && sp.b && !sp.sameObj);
  check("spells: 2014 and 2024 wording for casting time", sp.a.t === "1 action" && sp.b.t === "Action", JSON.stringify([sp.a, sp.b]));
  check("spells: saving throw is read", sp.a.save === "Wisdom", sp.a.save);
  check("spells: Book filter lists SRD and Deep Magic", sp.books.includes("srd") && sp.books.includes("deepm"), sp.books.join());
  await p.click("#spFiltersBtn").catch(() => { });
  await p.selectOption("#spBook", "deepm"); await p.waitForTimeout(300);
  const spList = await p.evaluate(() => ({ shown: spFiltered().length, all: spFiltered().every(s => s.src === "deepm"), badge: $("#spFiltersBtn").textContent }));
  check("spells: Book filter shows only that book", spList.all && spList.shown === X.sp.filter(s => s.src === "deepm").length, JSON.stringify(spList));
  await p.selectOption("#spBook", "srd"); await p.waitForTimeout(300);
  check("spells: Official rules shows only SRD spells", await p.evaluate(() => spFiltered().every(s => !s.src) && spFiltered().length === SP.data[SP.ed].filter(s => !s.src && !s.pend).length));
  await p.selectOption("#spBook", ""); await p.fill("#spQ", "abhorrent apparition"); await p.waitForTimeout(400);
  await p.click(".sp-head[data-sp=toggle]"); await p.waitForTimeout(150);
  const det = await p.evaluate(() => ({ tag: ($(".sp-row .tag.book") || {}).textContent, line: ($(".sp-row .book-line") || {}).textContent || "", href: ($(".sp-row .book-line a") || {}).href }));
  check("spells: the row shows its book", det.tag === "Deep Magic", JSON.stringify(det));
  check("spells: the details name the book and link the credits", /Deep Magic for 5th Edition/.test(det.line) && /credits\.html$/.test(det.href || ""), JSON.stringify(det));
  await p.click("#spReset");
  check("spells: Clear filters clears Book", await p.evaluate(() => $("#spBook").value === ""));
  const pool = await p.evaluate(() => { const c = pcEnsure(generateCharacter({ seed: "XW", name: "W", cls: "Wizard", level: 9, ed: "2014" })), L = pcSpellPool(c, "2014"); return { n: L.length, x: L.filter(s => s.src).length }; });
  check("spells: a wizard's spell choices include the extra books", pool.x > 100, JSON.stringify(pool));

  // ---- monsters ----
  await p.goto(URL + "#monsters"); await p.waitForTimeout(400);
  await p.evaluate(() => { const r = $('input[name="monMode"][value="srd"]'); if (r) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); } });
  await p.waitForTimeout(300);
  const mon = await p.evaluate(() => {
    bsLoad();
    const f = BS.data["2014"].find(m => m.src === "tob2");
    return { n14: BS.data["2014"].length, n24: BS.data["2024"].length, first: bsFind("2014-0").n, first24: bsFind("2024-0").n,
      books: [...$("#bsBook").options].map(o => o.value), tob2: f && f.n, envs: [...$("#bsEnv").options].length };
  });
  check("monsters: extras join both editions", mon.n14 === SRD.mon["2014"].length + X.mon.length && mon.n24 === SRD.mon["2024"].length + X.mon.length, JSON.stringify(mon));
  check("monsters: the SRD monsters keep their ids", mon.first === SRD.mon["2014"][0].n && mon.first24 === SRD.mon["2024"][0].n);
  check("monsters: Book filter lists the Tomes of Beasts", ["tob-2023", "tob2", "tob3", "ccdx", "bfrd", "srd"].every(b => mon.books.includes(b)), mon.books.join());
  await p.selectOption("#bsBook", "tob3"); await p.waitForTimeout(400);
  const mf = await p.evaluate(() => ({ n: bsFiltered().length, all: bsFiltered().every(m => m.src === "tob3"), rows: $$("#bsList .sp-row").length, tags: $$("#bsList .tag.book").length }));
  check("monsters: Book filter shows only that book", mf.all && mf.n === X.mon.filter(m => m.src === "tob3").length && mf.rows === mf.n, JSON.stringify(mf));
  const tob3 = X.mon.find(m => m.src === "tob3").n;
  await p.fill("#bsQ", tob3); await p.waitForTimeout(400);
  await p.click("#bsList .sp-head[data-bs=toggle]"); await p.waitForTimeout(200);
  const sb = await p.evaluate(() => ({ name: ($("#bsList .sb-name") || {}).textContent, line: ($("#bsList .book-line") || {}).textContent || "" }));
  check("monsters: an extra monster's stat block opens with its book", !!sb.name && /Tome of Beasts 3/.test(sb.line), JSON.stringify(sb));
  await p.click("#bsReset"); await p.waitForTimeout(200);
  check("monsters: Clear filters clears Book", await p.evaluate(() => $("#bsBook").value === ""));

  // ---- random encounters use them ----
  const rnd = await p.evaluate(() => {
    RAND_MON = null; const L = randMonsters(), per = {};
    RAND_ENVS.forEach(([k]) => per[k] = L.filter(m => m.env.includes(k)).length);
    let extra = 0, n = 0;
    RAND_ENVS.forEach(([k]) => { for (let i = 0; i < 20; i++) { const r = randomEncounter(makeRng("t", k, i), k, 1 + (i % 15), 4, "medium"); if (r) { n++; if ((randMonster(r.groups[0].stat) || {}).src) extra++; } } });
    return { total: L.length, x: L.filter(m => m.src).length, per, extra, n };
  });
  check("random encounters: the extra monsters can be rolled", rnd.x > 1500 && rnd.extra > rnd.n / 3, JSON.stringify({ x: rnd.x, extra: rnd.extra, n: rnd.n }));
  check("random encounters: every place has at least 25 monsters", Object.values(rnd.per).every(v => v >= 25), JSON.stringify(rnd.per));

  // ---- items ----
  await p.goto(URL + "#items"); await p.waitForTimeout(400);
  const it = await p.evaluate(() => {
    itLoad();
    const a = itFind("2014-vom_aberrant-agreement"), b = itFind("2024-vom_aberrant-agreement");
    return { a: a && { n: a.n, src: a.src, r: a.r, c: a.c }, b: b && b.n, m0: itFind("2014-m0").n, books: [...$("#itBook").options].map(o => o.value),
      hoard: (() => { let x = 0, n = 0; for (let i = 0; i < 100; i++) hoardRoll(2, "S" + i, "2024").items.forEach(y => { n++; if (y.src || /vom_/.test(y.ref || y.id || "")) x++; }); return { x, n }; })(),
      shop: (() => { let x = 0, n = 0; for (let i = 0; i < 30; i++) { const S = shopMake({ type: "magic", size: "city", level: 8, seed: "S" + i, ed: "2014" }); (S.stock || S.items || []).forEach(y => { n++; const r = itFind(y.ref || y.id || ""); if (r && r.src) x++; }); } return { x, n }; })() };
  });
  check("items: Vault of Magic items have fixed ids in both editions", it.a && it.a.n === "Aberrant Agreement" && it.a.src === "vom" && it.b === "Aberrant Agreement", JSON.stringify(it.a));
  check("items: the SRD items keep their ids", it.m0 === SRD.it["2014"].mi[0].n);
  check("items: extra items are priced by rarity", /gp/.test(it.a.c), it.a.c);
  check("items: Book filter lists Vault of Magic", it.books.includes("vom") && it.books.includes("srd"), it.books.join());
  check("hoards: can hold Vault of Magic items", it.hoard.x > 0 && it.hoard.x < it.hoard.n, JSON.stringify(it.hoard));
  check("shops: magic shops can stock Vault of Magic items", it.shop.x > 0, JSON.stringify(it.shop));
  // a shop made from a seed before the extra books keeps its name, keeper, manner, gear and prices; only magic items can change
  const old = await p.evaluate(() => {
    const S = shopMake({ type: "magic", size: "city", level: 12, seed: "OLD1", ed: "2014" }), srd = IT.data["2014"].filter(x => !x.src);
    const keep = IT.data["2014"]; IT.data["2014"] = srd; const T = shopMake({ type: "magic", size: "city", level: 12, seed: "OLD1", ed: "2014" }); IT.data["2014"] = keep;
    const sig = x => [x.name, x.keeper, x.mood, x.stock.filter(y => y.kind === "gear").map(y => y.id + ":" + y.gp + ":" + y.qty).join()].join("|");
    return { same: sig(S) === sig(T), n: S.stock.filter(y => y.kind === "magic").length === T.stock.filter(y => y.kind === "magic").length, a: sig(S).slice(0, 120), b: sig(T).slice(0, 120) };
  });
  check("shops: an old seed keeps its name, keeper, manner, gear and prices", old.same && old.n, JSON.stringify(old));
  await p.click("#itFiltersBtn").catch(() => { });
  await p.selectOption("#itBook", "vom"); await p.waitForTimeout(300);
  const itf = await p.evaluate(() => ({ n: itFiltered().length, all: itFiltered().every(x => x.src === "vom"), badge: $("#itFiltersBtn").textContent }));
  check("items: Book filter shows only that book", itf.all && itf.n === X.it.length, JSON.stringify(itf));
  check("items: the filter count includes Book", /1 on/.test(itf.badge), itf.badge);

  // ---- credits page ----
  await p.goto(URL + "credits.html");
  const cr = await p.evaluate(() => ({ items: document.querySelectorAll("li").length, text: document.body.textContent }));
  check("credits: every book is listed", cr.items === Object.keys(X.books).length, String(cr.items));
  check("credits: the OGL and its copyright notices are there", /OPEN GAME LICENSE|Open Game License/.test(cr.text) && /15\. COPYRIGHT NOTICE/.test(cr.text) && /Tome of Beasts 2\. Copyright 2020/.test(cr.text));
  check("credits: Creative Commons books are credited", /Black Flag SRD[\s\S]*Creative Commons Attribution 4\.0/.test(cr.text) && /Spells That Don't Suck/.test(cr.text));

  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
