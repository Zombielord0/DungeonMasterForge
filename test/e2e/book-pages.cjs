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
/* Every control on the paper is checked (only the stone .btn buttons and the header bands are left out). Each
   element's background is the first one behind it that isn't see-through, else the paper with any tints laid on it. */
const probe = pages => {
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const lumOf = ([r, g, b]) => [r, g, b].map(v => v / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const PAPER = [205, 175, 122] /* the paper with a crease or stain on it, darker than its middle */, roots = [...document.querySelectorAll(pages)], faint = [];
  const behind = (el, root) => {
    let col = PAPER; const tints = [];
    for (let a = el; a && a !== root; a = a.parentElement) {
      const st = getComputedStyle(a), [r, g, b, al = 1] = rgb(st.backgroundColor);
      if (st.backgroundImage !== "none" && /gradient/.test(st.backgroundImage) && !/baseFrequency='\.007'/.test(st.backgroundImage)) return null; /* its own picture: can't tell */
      if (al >= .9) { col = [r, g, b]; break; }
      if (al > 0) tints.unshift([r, g, b, al]);
    }
    for (const [r, g, b, al] of tints) col = [r * al + col[0] * (1 - al), g * al + col[1] * (1 - al), b * al + col[2] * (1 - al)];
    return col;
  };
  for (const root of roots) for (const el of root.querySelectorAll("*")) {
    if (el.closest(".btn,.sec-h,select,input,textarea,.mobile-sheet-quick") || !el.getClientRects().length) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const st = getComputedStyle(el); if (+st.opacity < 1 || st.visibility === "hidden") continue;
    const bg = behind(el, root); if (!bg) continue;
    const [r, g, b, al = 1] = rgb(st.color), fg = [r * al + bg[0] * (1 - al), g * al + bg[1] * (1 - al), b * al + bg[2] * (1 - al)];
    const L1 = lumOf(fg), L2 = lumOf(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    if (ratio < 4.5) faint.push(`${el.className || el.tagName} «${el.textContent.trim().slice(0, 24)}» ${st.color} ${ratio.toFixed(1)}`);
  }
  const onPaper = roots.filter(r => /baseFrequency='\.007'/.test(getComputedStyle(r).backgroundImage)).length;
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
    check(`${size}: the search panel and the buttons on the page stay stone`, !/feTurbulence\.\d|baseFrequency='\.007'/.test(stone.side) && !/baseFrequency='\.007'/.test(stone.btn) && /gradient/.test(stone.btn), JSON.stringify(stone).slice(0, 200));

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
    // states: a condition switched on, the "no subclass" warning, the prepare-spells panel, hover on small buttons
    await p.evaluate(() => { const c = generateCharacter({ cls: "Cleric", level: 5, ed: "2014", seed: "book-states", subclass: "none" }); c.id = "pc-book-states"; c.conds = { blinded: true }; PCS.roster.unshift(c); RC.id = c.id; renderRosterTab();
      document.querySelectorAll("#rosterMain .prep-panel.hidden").forEach(x => x.classList.remove("hidden")); });
    await p.waitForTimeout(400);
    const seen = await p.evaluate(() => ({ cond: !!document.querySelector("#rosterMain .cond.on"), need: !!document.querySelector("#rosterMain .lv-need"), prep: !!document.querySelector("#rosterMain .prep-panel:not(.hidden)") }));
    r = await p.evaluate(probe, PAGES);
    check(`${size}: a condition that's on, the subclass warning and the prepare panel are readable`, seen.cond && seen.need && seen.prep && !r.faint.length, JSON.stringify({ seen, faint: r.faint }));
    const hovered = [];
    for (const sel of ["#rosterMain .prep-b", "#rosterMain .ctr-b:not(:disabled)", "#rosterMain .cast-b", "#rosterMain .cond:not(.on)"]) {
      const el = await p.$(sel); if (!el) continue; await el.scrollIntoViewIfNeeded(); await el.hover(); await p.waitForTimeout(150);
      const f = (await p.evaluate(probe, PAGES)).faint; if (f.length) hovered.push(sel + ": " + f.join(" | "));
    }
    check(`${size}: small buttons on the sheet stay readable when hovered`, !hovered.length, hovered.join(" || "));

    // the Journal (shown to signed-in players): the markup renderJournal in src/portal.js writes
    await p.goto(URL + "#journal"); await p.waitForTimeout(300);
    await p.evaluate(() => { document.querySelector("#view-journal").classList.add("active"); document.querySelector("#journalMain").innerHTML = `<div class="sec-h"><h3>Journal: Greywater</h3></div>
      <p class="j-cal">📅 Day 12 · Autumn · Rain</p><h4 class="j-h">Quests</h4><ul class="j-list"><li><b>Find the bell</b> <span class="tag">On hold</span><span class="muted"> · from the ferryman</span></li></ul>
      <details class="j-done" open><summary>Finished (1)</summary><ul class="j-list"><li><b>Clear the cellar</b> <span class="tag">Completed</span></li></ul></details>
      <h4 class="j-h">Sessions</h4><details class="lore-card j-sess" open><summary class="lore-head"><span class="lore-name">Session 3</span><small class="muted">2026-11-20</small></summary><div class="lore-body"><p>The party crossed the river.</p></div></details>
      <h4 class="j-h">Lore</h4><details class="lore-card" open><summary class="lore-head"><span class="lore-name">The Drowned Abbey</span><small class="muted">Place · ruins</small></summary><div class="lore-body"><div class="lore-desc"><p>Old stones under the water.</p></div><div class="lore-sec"><h4>Rumours</h4><p>Bells ring at low tide.</p></div></div></details>`; });
    r = await p.evaluate(probe, "#journalMain");
    check(`${size}: the Journal is a book page and its quests, sessions and lore are readable`, r.roots === 1 && r.onPaper === 1 && !r.faint.length, JSON.stringify(r));

    check(`${size}: no page errors`, !errs.length, errs.join(" | "));
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll book page checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
