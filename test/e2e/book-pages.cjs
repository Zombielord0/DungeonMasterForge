// Book pages (2026-11-23): spells, items, the Monster Manual, the character sheet and the Journal are set on paper,
// with ink dark enough to read, while side panels and buttons stay stone. Run with:  npm run test:book
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});
/* in the page: is `el` on paper, and which text inside the pages is too light to read on it (contrast under 4.5:1) */
const PAGES = "#spList>.sec,#itList>.sec,#bsList>.sec,#rosterMain>.card:not(.empty):not(.mobile-sheet-quick),#rosterMain>.sec,#rosterMain>.grid2>.sec,#journalMain";
const probe = pages => {
  const lum = c => { const m = c.match(/[\d.]+/g); const [r, g, b] = m.slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * r + .7152 * g + .0722 * b; };
  const paper = lum("rgb(236,214,164)"), roots = [...document.querySelectorAll(pages)], faint = [];
  for (const root of roots) for (const el of root.querySelectorAll("*")) {
    if (el.closest(".btn,button,.sec-h,select,input,textarea") || !el.getClientRects().length) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const st = getComputedStyle(el); if (+st.opacity < 1 || st.visibility === "hidden") continue;
    const ratio = (paper + .05) / (lum(st.color) + .05);
    if (ratio < 4.5) faint.push(`${el.className || el.tagName} «${el.textContent.trim().slice(0, 24)}» ${st.color}`);
  }
  const onPaper = roots.filter(r => /baseFrequency='\.012'/.test(getComputedStyle(r).backgroundImage)).length;
  return { roots: roots.length, onPaper, faint: [...new Set(faint)].slice(0, 8) };
};

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  for (const [w, h, size] of [[1400, 1000, "laptop"], [390, 844, "phone"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: "block" });
    await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    const p = await ctx.newPage(), errs = []; p.on("pageerror", e => errs.push(e.message));
    const wide = () => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);

    await p.goto(URL + "#spells"); await p.waitForFunction(() => document.querySelector("#spList .sp-row"));
    await p.fill("#spQ", "fireball"); await p.waitForTimeout(500);
    await p.evaluate(() => [...document.querySelectorAll("#spList .sp-head")].find(x => /Fireball/.test(x.textContent)).click());
    let r = await p.evaluate(probe, PAGES);
    check(`${size}: spell groups are book pages`, r.roots > 0 && r.onPaper === r.roots, JSON.stringify(r));
    check(`${size}: an open spell's text is dark enough to read on the paper`, !r.faint.length, r.faint.join(" | "));
    const stone = await p.evaluate(() => ({ side: getComputedStyle(document.querySelector("#spForm")).backgroundImage, btn: getComputedStyle(document.querySelector("#spList .sp-detail .btn")).backgroundImage }));
    check(`${size}: the search panel and the buttons on the page stay stone`, !/feTurbulence\.\d|baseFrequency='\.012'/.test(stone.side) && !/baseFrequency='\.012'/.test(stone.btn) && /gradient/.test(stone.btn), JSON.stringify(stone).slice(0, 200));

    await p.goto(URL + "#items"); await p.waitForFunction(() => document.querySelector("#itList .sp-row"));
    await p.fill("#itQ", "bag of holding"); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector("#itList .sp-head").click());
    r = await p.evaluate(probe, PAGES);
    check(`${size}: items are book pages, readable (rarity colours too)`, r.roots > 0 && r.onPaper === r.roots && !r.faint.length, JSON.stringify(r));

    await p.goto(URL + "#monsters"); await p.click('label.opt:has(input[value="srd"])');
    await p.waitForFunction(() => document.querySelector("#bsList .sp-row"));
    await p.fill("#bsQ", "goblin"); await p.waitForTimeout(600);
    await p.evaluate(() => document.querySelector("#bsList .sp-head").click());
    r = await p.evaluate(probe, PAGES);
    check(`${size}: Monster Manual entries are book pages, with readable stat blocks`, r.roots > 0 && r.onPaper === r.roots && !r.faint.length, JSON.stringify(r));

    await p.goto(URL + "#roster"); await p.waitForFunction(() => typeof generateCharacter === "function");
    await p.evaluate(() => { for (const cls of ["Wizard", "Paladin"]) { const c = generateCharacter({ cls, level: 5, ed: "2014", seed: "book-" + cls }); c.id = "pc-book-" + cls; PCS.roster.unshift(c); } RC.id = "pc-book-Wizard"; renderRosterTab(); });
    await p.waitForTimeout(500);
    r = await p.evaluate(probe, PAGES);
    check(`${size}: every part of the character sheet is a book page, readable`, r.roots >= 8 && r.onPaper === r.roots && !r.faint.length, JSON.stringify(r));
    check(`${size}: the sheet isn't wider than the screen`, await wide() <= 1, String(await wide()));

    check(`${size}: no page errors`, !errs.length, errs.join(" | "));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll book page checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
