// World and region maps (the World tab's atlas). Run with:  npm run test:atlas
// Starts its own static server for public/ on a free port; uses the "Use without an account" mode.
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json" };
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
  const browser = await chromium.launch(), errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: "block", acceptDownloads: true });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept("Renamed Peaks"));
  await p.goto(URL + "#world"); await p.waitForFunction(() => typeof renderWorld === "function" && $("#storeBadge").textContent !== "Connecting…", null, { timeout: 15000 });

  // ---------- Task 1: terrain and drawing ----------
  const t1 = await p.evaluate(() => {
    const cv = () => document.createElement("canvas");
    const m1 = { seed: "S1", shape: "coast", land: "balanced" }, m2 = { seed: "S2", shape: "coast", land: "balanced" };
    const a = cv(), b = cv(), c = cv(); atlasDraw(a, m1, {}); atlasDraw(b, m1, {}); atlasDraw(c, m2, {});
    const isl = atlasTerrain({ seed: "S3", shape: "island", land: "balanced" }), inl = atlasTerrain({ seed: "S3", shape: "inland", land: "balanced" });
    let edgeSea = true; for (let x = 0; x < isl.W; x++) for (const y of [0, isl.H - 1]) if (isl.h[y * isl.W + x] >= 0) edgeSea = false;
    for (let y = 0; y < isl.H; y++) for (const x of [0, isl.W - 1]) if (isl.h[y * isl.W + x] >= 0) edgeSea = false;
    const lakeCells = new Set(); (inl.lakeCells || []).forEach(i => lakeCells.add(i));
    let inlandSea = 0; for (let i = 0; i < inl.h.length; i++) if (inl.h[i] < 0 && !lakeCells.has(i)) inlandSea++;
    const high = m => { const T = atlasTerrain(m); let n = 0; for (const v of T.h) if (v > .45) n++; return n; };
    const mtn = high({ seed: "S4", shape: "coast", land: "mountains" }), pl = high({ seed: "S4", shape: "coast", land: "plains" });
    const rv = ["S1", "S5", "S6", "S7"].map(s => atlasTerrain({ seed: s, shape: "coast", land: "balanced" })), wet = T => (x, y) => T.h[y * T.W + x] < 0;
    const riversOk = rv.every(T => T.rivers.every(r => { const [x, y] = r[r.length - 1]; return wet(T)(x, y); }));
    const anyRiver = rv.some(T => T.rivers.length > 0);
    const names = atlasNames(m1), drawn = atlasDraw(cv(), { ...m1, names }, { names }).labels;
    return { same: a.toDataURL() === b.toDataURL(), diff: a.toDataURL() !== c.toDataURL(), size: [a.width, a.height], edgeSea, inlandSea, mtn, pl, riversOk, anyRiver, names: names.map(n => n.name), drawn };
  });
  check("atlas: the same recipe draws the same picture", t1.same && t1.diff, JSON.stringify([t1.same, t1.diff]));
  check("atlas: maps are drawn at 1600 × 1100", t1.size[0] === 1600 && t1.size[1] === 1100, JSON.stringify(t1.size));
  check("atlas: island has sea on every edge; inland has no sea at all", t1.edgeSea && t1.inlandSea === 0, JSON.stringify([t1.edgeSea, t1.inlandSea]));
  check("atlas: \"mountains\" has more high ground than \"plains\"", t1.mtn > t1.pl * 1.5, JSON.stringify([t1.mtn, t1.pl]));
  check("atlas: rivers end in sea or a lake", t1.riversOk && t1.anyRiver);
  check("atlas: feature names come back and are drawn", t1.names.length >= 2 && t1.names.every(n => t1.drawn.includes(n)), JSON.stringify(t1));

  // ---------- Task 2: map data and pins ----------
  const setup = () => p.evaluate(() => {
    W.places = []; W.atlas = null; W.loaded = true;
    const R = wpNew({ name: "The Ashen Vale", type: "region" }), R2 = wpNew({ name: "Far Isles", type: "region" });
    const mk = (name, type, parent) => wpNew({ name, type, parent }).id;
    const ids = { r: R.id, r2: R2.id, velmor: mk("Velmor", "city", R.id), raven: mk("Ravenhold", "town", R.id), mill: mk("Millbrook", "village", R.id), crypt: mk("Sunken Crypt", "dungeon", R.id),
      bell: mk("Bell Tower", "landmark", R.id), witch: mk("Witchwood", "wilderness", R.id), north: mk("Northmarch", "region", R.id) };
    ids.goose = mk("Gilded Goose", "tavern", ids.velmor); ids.frost = mk("Frostford", "village", ids.north); ids.cellar = mk("Crypt Cellar", "dungeon", ids.crypt);
    worldSave(); return ids;
  });
  let ids = await setup();
  const t2 = await p.evaluate(ids => {
    atlasMake(ids.r, { shape: "coast", land: "balanced" }); atlasPinsFill(ids.r);
    const m = atlasOf(ids.r), T = atlasTerrain(m), pins = m.pins, keys = Object.keys(pins);
    const onLand = keys.every(k => { const q = pins[k]; return T.h[Math.min(T.H - 1, Math.floor(q.y * T.H)) * T.W + Math.min(T.W - 1, Math.floor(q.x * T.W))] >= 0; });
    let minD = 9; keys.forEach((a, i) => keys.slice(i + 1).forEach(b => { minD = Math.min(minD, Math.hypot(pins[a].x - pins[b].x, pins[a].y - pins[b].y)); }));
    const listed = atlasPlaces(ids.r);
    return { keys: keys.sort(), onLand, minD, area: listed.filter(x => x.area).map(x => x.p.name), pinned: listed.filter(x => !x.area).map(x => x.p.name).sort(), drawPins: atlasPins(ids.r, false).length, player: atlasPins(ids.r, true).length };
  }, ids);
  check("atlas: every mappable place inside a region gets a pin on land, at least 0.04 apart", t2.onLand && t2.minD >= .04 && t2.keys.length === 8, JSON.stringify(t2));
  check("atlas: an inn inside a city or a dungeon inside a dungeon isn't pinned; a sub-region is an area", JSON.stringify(t2.area) === '["Northmarch"]' && !t2.pinned.includes("Gilded Goose") && !t2.pinned.includes("Crypt Cellar") && t2.pinned.includes("Frostford"), JSON.stringify(t2));
  check("atlas: nothing is found at first, so the players' version has no pins", t2.player === 0 && t2.drawPins === 8, JSON.stringify(t2));
  const water = await p.evaluate(ids => {
    let city = 0, dun = 0;
    for (const seed of ["W1", "W2", "W3", "W4", "W5"]) {
      const r = wp(ids.r); r.atlas = { v: 1, seed, shape: "coast", land: "balanced", pins: {}, names: [] }; atlasPinsFill(ids.r);
      const T = atlasTerrain(r.atlas), wd = atlasWaterDist(T), at = q => wd[Math.min(T.H - 1, Math.floor(q.y * T.H)) * T.W + Math.min(T.W - 1, Math.floor(q.x * T.W))];
      city += at(r.atlas.pins[ids.velmor]); dun += at(r.atlas.pins[ids.crypt]);
    }
    return { city, dun };
  }, ids);
  check("atlas: a city sits nearer water than a dungeon", water.city < water.dun, JSON.stringify(water));
  const moved = await p.evaluate(ids => {
    atlasMake(ids.r, { shape: "coast", land: "balanced" }); atlasPinsFill(ids.r);
    wp(ids.raven).parent = ids.r2; W.places = W.places.filter(x => x.id !== ids.mill); atlasPinsFill(ids.r);
    return Object.keys(atlasOf(ids.r).pins);
  }, ids);
  check("atlas: a moved or deleted place loses its pin", !moved.includes(ids.raven) && !moved.includes(ids.mill) && moved.includes(ids.velmor), JSON.stringify(moved));
  const rr = await p.evaluate(ids => {
    const m = atlasOf(ids.r); m.pins[ids.velmor] = { x: .31, y: .47, m: 1 }; m.pins[ids.bell] = { x: .01, y: .01, m: 1 };
    atlasReroll(ids.r, { shape: "island", land: "mountains" });
    const n = atlasOf(ids.r), T = atlasTerrain(n), land = q => T.h[Math.min(T.H - 1, Math.floor(q.y * T.H)) * T.W + Math.min(T.W - 1, Math.floor(q.x * T.W))] >= 0;
    return { shape: n.shape, velmor: n.pins[ids.velmor], velmorWasLand: land({ x: .31, y: .47 }), bellLand: land(n.pins[ids.bell]), bellMoved: n.pins[ids.bell].x !== .01, allLand: Object.values(n.pins).every(land) };
  }, ids);
  check("atlas: re-rolling keeps a dragged pin where it's still on land", rr.shape === "island" && rr.velmor.m && (rr.velmorWasLand ? rr.velmor.x === .31 && rr.velmor.y === .47 : true), JSON.stringify(rr));
  check("atlas: …and every pin is on land after a re-roll", rr.allLand && rr.bellLand && rr.bellMoved, JSON.stringify(rr));
  const wm = await p.evaluate(ids => { atlasMake("world", { shape: "island", land: "balanced" }); atlasPinsFill("world"); worldSave(); return { areas: atlasPlaces("world").filter(x => x.area).map(x => x.p.name).sort() }; }, ids);
  check("atlas: the world map shows the top-level regions as areas", JSON.stringify(wm.areas) === '["Far Isles","The Ashen Vale"]', JSON.stringify(wm));
  await p.reload(); await p.waitForFunction(() => typeof renderWorld === "function");
  const kept = await p.evaluate(ids => { worldLoad(); const bk = JSON.parse(backupData()["dmforge.world.v1"]); return { world: !!(W.atlas && W.atlas.seed), region: !!(wp(ids.r).atlas && wp(ids.r).atlas.pins[ids.velmor]), backup: !!(bk.atlas && bk.atlas.seed) }; }, ids);
  check("atlas: the world map and region maps survive a reload and are in a backup", kept.world && kept.region && kept.backup, JSON.stringify(kept));
  const synced = await p.evaluate(() => { const D = CLOUD_LISTS.world, a = D.make([{ id: "x", name: "X" }], { places: [], atlas: { seed: "keep" } }); return a.atlas && a.atlas.seed; });
  check("atlas: merging two devices' World keeps the world map", synced === "keep");
  const cf = await p.evaluate(ids => { const c = blankCampaign("Vale campaign"); c.lore.push({ id: "lx", name: "The Ashen Vale", type: "place", wpId: ids.r, desc: "", sections: [] }); Store.save(c); const ex = campExtras(c); return { worldMap: !!(ex.worldMap && ex.worldMap.seed), region: !!(ex.world.find(x => x.id === ids.r) || {}).atlas }; }, ids);
  check("atlas: a campaign file carries its region's map and the world map", cf.worldMap && cf.region, JSON.stringify(cf));

  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll world map checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
