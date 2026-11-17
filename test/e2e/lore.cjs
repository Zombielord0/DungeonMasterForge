// The Lore tab in the Campaign Tracker. Run with:  npm run test:lore
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png" };
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
  await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof renderTracker === "function");
  await p.evaluate(() => {
    const c = blankCampaign("Lore Test");
    c.lore = [
      { id: "l1", name: "Sewer Outpost", type: "place", tags: ["Dungeon", "Cult"], desc: "A hidden cult base <script>alert(1)</script>.", sections: [{ t: "Overview", x: "A **bold** claim.\n\n- first\n- second", dm: false }, { t: "Secret", x: "The cult leader hides here.", dm: true }] },
      { id: "l2", name: "Aegis of Veritas", type: "item", tags: ["Magic Item"], imgUrl: "https://example.invalid/aegis.png", desc: "A silver shield.", sections: [] },
      { id: "l3", name: "The Missing Shepherds", type: "other", tags: [], desc: "Plot thread.", sections: [] }];
    Store.save(c); activeId = c.id; subTab = "overview"; renderTracker();
  });
  await p.waitForTimeout(300);
  const tabTxt = await p.evaluate(() => { const b = document.querySelector('[data-sub="lore"]'); return b ? b.textContent.replace(/\s+/g, " ").trim() : ""; });
  check("the Tracker has a Lore sub-tab with a count", /^Lore\s*3$/.test(tabTxt), tabTxt);
  if (!tabTxt) { await browser.close(); server.close(); process.exit(1); }
  await p.click('[data-sub="lore"]'); await p.waitForTimeout(200);
  const names = () => p.evaluate(() => [...document.querySelectorAll(".lore-card .lore-name")].map(e => e.textContent.trim()));
  const chips = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-lt]")].map(e => [e.dataset.lt, e.textContent.replace(/\s+/g, " ").trim()])));
  check("type chips show counts", /Places\s*1/.test(chips.place) && /Items\s*1/.test(chips.item) && /Other\s*1/.test(chips.other) && /All\s*3/.test(chips[""]), JSON.stringify(chips));
  await p.click('[data-lt="item"]'); await p.waitForTimeout(150);
  check("a type chip filters the list", JSON.stringify(await names()) === '["Aegis of Veritas"]', JSON.stringify(await names()));
  await p.click('[data-lt=""]'); await p.fill("#loreQ", "bold"); await p.waitForTimeout(250);
  check("search looks inside section text", JSON.stringify(await names()) === '["Sewer Outpost"]', JSON.stringify(await names()));
  await p.fill("#loreQ", "(["); await p.waitForTimeout(250);
  check("search with odd characters is safe", (await names()).length === 0 && !errs.length);
  await p.fill("#loreQ", ""); await p.waitForTimeout(250);
  // open an entry
  await p.click('[data-lore="open"][data-id="l1"]'); await p.waitForTimeout(200);
  const body = await p.evaluate(() => document.querySelector('.lore-card[data-id="l1"]').innerHTML);
  check("markdown shows as formatting", /<strong>bold<\/strong>/.test(body) && /<li>first<\/li>/.test(body), body.slice(0, 300));
  check("DM-only sections are marked", /DM only/.test(body));
  check("HTML in the text is shown as text, not run", /&lt;script&gt;/.test(body) && !/<script>alert/.test(body));
  // add an entry
  await p.click('[data-lore="add"]'); await p.waitForTimeout(200);
  await p.fill('[data-lf="name"]', "Ruined Tower"); await p.selectOption('[data-lf="type"]', "place"); await p.fill('[data-lf="tags"]', "ruin, north");
  await p.fill('[data-lf="desc"]', "Crumbling.");
  await p.click('[data-lore="secadd"]'); await p.waitForTimeout(150);
  await p.fill('[data-ls="t"][data-i="0"]', "Inside"); await p.fill('[data-ls="x"][data-i="0"]', "Bats.");
  await p.click('[data-lore="save"]'); await p.waitForTimeout(300);
  const added = await p.evaluate(() => curCamp().lore.find(x => x.name === "Ruined Tower"));
  check("a new entry saves", added && added.type === "place" && JSON.stringify(added.tags) === '["ruin","north"]' && added.sections[0].t === "Inside" && added.sections[0].x === "Bats.", JSON.stringify(added));
  check("it's in the list", (await names()).includes("Ruined Tower"));
  // edit
  await p.click(`[data-lore="edit"][data-id="${added.id}"]`); await p.waitForTimeout(200);
  await p.fill('[data-lf="name"]', "Ruined Watchtower"); await p.click('[data-lore="save"]'); await p.waitForTimeout(300);
  check("editing saves", await p.evaluate(id => curCamp().lore.find(x => x.id === id).name === "Ruined Watchtower", added.id));
  // a bad picture link
  await p.click(`[data-lore="edit"][data-id="${added.id}"]`); await p.waitForTimeout(200);
  await p.fill('[data-lf="imgUrl"]', "http://example.com/a.png"); await p.click('[data-lore="save"]'); await p.waitForTimeout(300);
  check("a non-https picture link is refused", /https/.test(await p.textContent("#toast")) && !(await p.evaluate(id => curCamp().lore.find(x => x.id === id).imgUrl, added.id)), await p.textContent("#toast"));
  await p.click('[data-lore="cancel"]').catch(() => { }); await p.waitForTimeout(150);
  // TV
  const [tv] = await Promise.all([ctx.waitForEvent("page", { timeout: 4000 }).catch(() => null), p.click('[data-lore="tv"][data-id="l2"]')]);
  check("📺 TV opens the player screen for a lore picture", !!tv);
  if (tv) { await p.bringToFront(); await tv.close(); }
  // delete
  await p.click(`[data-lore="del"][data-id="${added.id}"]`); await p.click("#modalYes"); await p.waitForTimeout(300);
  check("delete removes an entry", !(await p.evaluate(id => curCamp().lore.some(x => x.id === id), added.id)));
  // reload keeps them
  await p.waitForTimeout(900); await p.reload(); await p.waitForFunction(() => typeof renderTracker === "function");
  check("lore is kept after a reload", await p.evaluate(() => (Store.list()[0].lore || []).length === 3));
  // older campaigns get an empty lore list
  check("campaigns without lore still open", await p.evaluate(() => { const c = blankCampaign("Old"); delete c.lore; Store.save(c); activeId = c.id; subTab = "lore"; renderTracker(); return Array.isArray(curCamp().lore); }));
  // phone
  const ph = await browser.newContext({ viewport: { width: 390, height: 640 }, serviceWorkers: "block", hasTouch: true, isMobile: true });
  await ph.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const q = await ph.newPage(); await q.goto(URL + "#tracker"); await q.waitForFunction(() => typeof renderTracker === "function");
  await q.evaluate(() => { const c = blankCampaign("Phone Lore"); c.lore = [{ id: "p1", name: "A very long place name that keeps going and going past the edge", type: "place", tags: ["one", "two", "three", "four", "five", "six"], imgUrl: "https://example.invalid/x.png", desc: "x", sections: [] }]; Store.save(c); activeId = c.id; subTab = "lore"; renderTracker(); }); await q.waitForTimeout(300);
  check("phone: the Lore tab doesn't scroll sideways", await q.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll lore checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
