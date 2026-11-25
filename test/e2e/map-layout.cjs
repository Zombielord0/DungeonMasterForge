// The Dungeon Map tab's layout (2026-11-25): Your maps, Build and a full-screen Run.
// Run with:  npm run test:maplayout
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
const shown = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; }, sel);
const mode = p => p.evaluate(() => ["map-list", "map-build", "map-run"].find(c => document.querySelector("#view-map").classList.contains(c)));

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 }, serviceWorkers: "block" });
    await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    const p = await ctx.newPage(), errs = []; p.on("pageerror", e => errs.push(e.message));

    // no saved maps: the tab opens straight into Build, without the Player Screen
    await p.goto(URL + "#map"); await p.waitForFunction(() => typeof mapMode === "function"); await p.waitForTimeout(600);
    check("with no saved maps the tab opens in Build", await mode(p) === "map-build");
    check("Build shows the generator and the map", await shown(p, "#mapForm") && await shown(p, "#mapCanvas"));
    check("Build has no Player Screen", !(await shown(p, "#hostCard")));
    check("Build has the Room key", await shown(p, "#roomKeyCard"));

    // save it to a campaign, and put a map on a World place
    await p.evaluate(() => {
      const k = blankCampaign("Ashfall"); Store.save(k); renderCampList();
      document.querySelector("#mapCampaign").innerHTML = `<option value="${k.id}">Ashfall</option>`; document.querySelector("#mapCampaign").value = k.id;
      document.querySelector("#mapSave").click();
      if (!W.loaded) worldLoad();
      W.places.push({ id: "wp1", name: "Dreadport Cove", type: "dungeon", parent: null, map: { name: "Cove Caves", theme: "cavern", size: "small", rooms: 6, level: 2, party: 4, seed: "COVE1", style: "parchment", id: "mw1", saved: Date.now() } });
      worldSave();
    });
    await p.waitForTimeout(700);

    // Run from Build
    await p.click("#mapToRun"); await p.waitForTimeout(500);
    check("▶ Run for players opens Run", await mode(p) === "map-run");
    const full = await p.evaluate(() => { const r = document.querySelector("#mapWrap").getBoundingClientRect(); return { w: r.width, h: r.height, side: getComputedStyle(document.querySelector("#fside")).zIndex }; });
    check("Run's map is big (most of the screen)", full.w > 800 && full.h > 500, JSON.stringify(full));
    check("Run covers the side menu and header", await p.evaluate(() => { const el = document.elementFromPoint(20, 20); return !!el && !!el.closest("#view-map"); }));
    check("Run shows the Player Screen tools and hides the generator", await shown(p, "#hostStart") && await shown(p, "#fogTools") && !(await shown(p, "#mapForm")));
    await p.click('#mapRTabs [data-rtab="tok"]'); await p.waitForTimeout(150);
    check("the Tokens tab shows the tokens and not the fog tools", await shown(p, "#tokField") && !(await shown(p, "#fogAll")));
    await p.click('#mapRTabs [data-rtab="hand"]'); await p.waitForTimeout(150);
    check("the Handout tab shows the handout", await shown(p, "#handoutField") && !(await shown(p, "#tokField")));
    await p.click('#mapRTabs [data-rtab="fog"]'); await p.waitForTimeout(150);
    check("the Room key shows under the tools, beside the map", await shown(p, "#roomKeyCard") && await p.evaluate(() => { const k = document.querySelector("#roomKeyCard").getBoundingClientRect(), h = document.querySelector("#hostCard").getBoundingClientRect(), m = document.querySelector("#mapWrap").getBoundingClientRect(); return k.top >= h.bottom - 1 && k.left >= m.right - 1 && k.top < innerHeight; }));
    await p.keyboard.press("Escape"); await p.waitForTimeout(300);
    check("Esc leaves Run, back to Build", await mode(p) === "map-build");

    // Your maps
    await p.click("#mapToList"); await p.waitForTimeout(500);
    check("← Your maps shows the list", await mode(p) === "map-list" && await shown(p, "#mapLib") && !(await shown(p, "#mapCanvas")));
    const cards = await p.evaluate(() => [...document.querySelectorAll("#mapLibGrid .map-card:not(.map-card-new)")].map(c => c.querySelector("h3").textContent.trim()));
    check("the list has the campaign's map and the World place's map", cards.includes("The Forgotten Halls") && cards.includes("Cove Caves"), cards.join(" | "));
    check("cards have thumbnails", await p.evaluate(() => [...document.querySelectorAll("#mapLibGrid .map-card:not(.map-card-new) .map-thumb")].every(t => t.querySelector("canvas, img"))));
    await p.selectOption("#mapLibFrom", "world"); await p.waitForTimeout(200);
    check("the picker narrows to World places", await p.evaluate(() => [...document.querySelectorAll("#mapLibGrid .map-card:not(.map-card-new) h3")].map(h => h.textContent.trim()).join()) === "Cove Caves");
    await p.selectOption("#mapLibFrom", "");
    await p.evaluate(() => [...document.querySelectorAll("#mapLibGrid .map-card:not(.map-card-new)")].find(c => /Cove Caves/.test(c.textContent)).querySelector("[data-maprun]").click());
    await p.waitForTimeout(600);
    check("▶ Run on a card opens that map in Run", await mode(p) === "map-run" && await p.evaluate(() => currentMap && currentMap.params.name === "Cove Caves"));
    check("Run's bar names the map", /Cove Caves/.test(await p.evaluate(() => document.querySelector("#mapRunName").textContent)));
    await p.click("#mapRunDone"); await p.waitForTimeout(400);
    check("✕ Done goes back to Your maps (where Run was opened from)", await mode(p) === "map-list");
    await p.evaluate(() => [...document.querySelectorAll("#mapLibGrid .map-card:not(.map-card-new)")].find(c => /Forgotten Halls/.test(c.textContent)).querySelector("[data-mapedit]").click());
    await p.waitForTimeout(600);
    check("✏ Edit on a card opens it in Build", await mode(p) === "map-build" && await p.evaluate(() => currentMap && currentMap.params.name === "The Forgotten Halls"));
    await p.click("#mapToList"); await p.click("#mapLibNew"); await p.waitForTimeout(400);
    check("+ New map opens Build", await mode(p) === "map-build" && await shown(p, "#mapForm"));

    // leaving the tab from Run
    await p.click("#mapToRun"); await p.waitForTimeout(300);
    await p.evaluate(() => { location.hash = "spells"; }); await p.waitForTimeout(400);
    check("leaving the tab leaves Run", await p.evaluate(() => !document.querySelector("#view-map").classList.contains("map-run")) && await shown(p, "#fside"));
    await p.evaluate(() => { location.hash = "map"; }); await p.waitForTimeout(400);
    check("coming back to the tab with saved maps shows Build where you left it", await mode(p) === "map-build");
    await p.reload(); await p.waitForFunction(() => typeof mapMode === "function"); await p.waitForTimeout(800);
    check("after a refresh, with saved maps, the tab opens on Your maps", await mode(p) === "map-list");
    check("no page errors", !errs.length, errs.join(" | "));
    await ctx.close();

    // phone: Run puts the panel under the map
    const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", isMobile: true, hasTouch: true });
    await ph.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    const q = await ph.newPage(); await q.goto(URL + "#map"); await q.waitForFunction(() => typeof mapMode === "function"); await q.waitForTimeout(600);
    await q.evaluate(() => mapMode("run")); await q.waitForTimeout(400);
    const lay = await q.evaluate(() => { const m = document.querySelector("#mapWrap").getBoundingClientRect(), h = document.querySelector("#hostCard").getBoundingClientRect(); return { mw: Math.round(m.width), below: h.top >= m.bottom - 1, sw: document.documentElement.scrollWidth }; });
    check("phone: Run's map is full width with the panel under it", lay.mw >= 360 && lay.below && lay.sw <= 391, JSON.stringify(lay));
    await ph.close();
  } catch (e) { console.error(e); fails++; }
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll map layout checks passed");
  process.exit(fails ? 1 : 0);
})();
