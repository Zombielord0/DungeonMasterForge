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
  check("atlas: re-rolling keeps a dragged pin where it's still on land", rr.shape === "island" && rr.velmor.m && (rr.velmorWasLand ? rr.velmor.x === .31 && rr.velmor.y === .47 : rr.allLand && (rr.velmor.x !== .31 || rr.velmor.y !== .47)), JSON.stringify(rr));
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

  // ---------- Task 3: the map view on the World tab ----------
  const pinAt = id => p.evaluate(id => { const cv = $("#atlasCv"), m = atlasOf(W.atlasId), q = m.pins[id]; let r = cv.getBoundingClientRect(); window.scrollBy(0, r.top + q.y * r.height - innerHeight / 2); r = cv.getBoundingClientRect(); return { x: r.left + q.x * r.width, y: r.top + q.y * r.height }; }, id);
  await p.evaluate(ids => { const r = wp(ids.r); delete r.atlas; worldSave(); W.sel = ids.r; W.mode = "place"; location.hash = "world"; renderWorld(); }, ids);
  await p.waitForSelector('#worldMain [data-at="make"]');
  check("atlas view: a region's page offers Make a map", await p.locator('#worldMain [data-at="make"]').count() === 1);
  await p.click('#worldMain [data-at="make"]'); await p.waitForSelector("#atlasCv");
  const v1 = await p.evaluate(ids => ({ id: W.atlasId, pins: Object.keys(atlasOf(ids.r).pins).length, mode: W.mode }), ids);
  check("atlas view: the map opens with every place pinned", v1.id === ids.r && v1.mode === "atlas" && v1.pins === 6, JSON.stringify(v1));
  // drag Velmor
  await p.evaluate(() => $("#atlasCv").scrollIntoView({ block: "center" }));
  const a0 = await pinAt(ids.velmor);
  await p.mouse.move(a0.x, a0.y); await p.mouse.down(); await p.mouse.move(a0.x + 30, a0.y + 20, { steps: 5 }); await p.mouse.move(a0.x + 60, a0.y + 40, { steps: 5 }); await p.mouse.up();
  const dragged = await p.evaluate(ids => atlasOf(ids.r).pins[ids.velmor], ids);
  check("atlas view: dragging a pin moves it", dragged.m === 1 && Math.abs(dragged.x - .0) > 0, JSON.stringify(dragged));
  await p.waitForTimeout(400); await p.reload(); await p.waitForFunction(() => typeof renderWorld === "function");
  const kept3 = await p.evaluate(ids => { worldLoad(); return wp(ids.r).atlas.pins[ids.velmor]; }, ids);
  check("atlas view: …and it stays after a reload", kept3 && kept3.x === dragged.x && kept3.y === dragged.y, JSON.stringify([kept3, dragged]));
  await p.evaluate(ids => { location.hash = "world"; atlasOpen(ids.r); }, ids); await p.waitForSelector("#atlasCv");
  await p.evaluate(() => $("#atlasCv").scrollIntoView({ block: "center" }));
  const hid = await p.evaluate(ids => ({ labels: ATLAS_VIEW.labels, crypt: atlasPins(ids.r, false).find(x => x.id === ids.crypt) }), ids);
  check("atlas view: places not found yet are shown to the DM, marked hidden", hid.labels.includes("Sunken Crypt") && hid.crypt.hidden, JSON.stringify(hid));
  const pref = await p.evaluate(ids => { const m = atlasOf(ids.r), keep = JSON.stringify(m.pins); m.pins[ids.north] = { ...m.pins[ids.frost] }; m.pins[ids.north].x += .01; const cv = $("#atlasCv"), r = cv.getBoundingClientRect(), q = m.pins[ids.frost]; const h = atlasHit({ clientX: r.left + q.x * r.width, clientY: r.top + q.y * r.height }); m.pins = JSON.parse(keep); return h.pin && h.pin.id; }, ids);
  check("atlas view: a click on a place's pin picks the place, even next to a region's name", pref === ids.frost, String(pref));
  // the pin menu: reveal
  const c0 = await pinAt(ids.crypt); await p.mouse.click(c0.x, c0.y);
  await p.waitForSelector('#atlasMenu:not([hidden]) [data-atp="reveal"]');
  await p.click('#atlasMenu [data-atp="reveal"]');
  check("atlas view: the pin menu reveals a place", await p.evaluate(ids => !!wp(ids.crypt).found, ids));
  const f0 = await pinAt(ids.frost); await p.mouse.click(f0.x, f0.y); await p.waitForSelector('#atlasMenu:not([hidden]) [data-atp="reveal"]'); await p.click('#atlasMenu [data-atp="reveal"]');
  check("atlas view: revealing a place also reveals the regions above it", await p.evaluate(ids => !!(wp(ids.frost).found && wp(ids.north).found && wp(ids.r).found), ids));
  const fits = await p.evaluate(ids => { const m = atlasOf(ids.r); m.pins[ids.bell] = { x: .5, y: .97, m: 1 }; atlasRender(); const pin = atlasPins(ids.r, false).find(x => x.id === ids.bell); atlasMenuShow(pin); const a = $("#atlasMenu").getBoundingClientRect(), w = $(".atlas-wrap").getBoundingClientRect(); atlasMenuHide(); return a.bottom <= w.bottom + 1 && a.top >= w.top - 1; }, ids);
  check("atlas view: a pin near the bottom opens its menu above it, inside the map", fits);
  const offOk = await p.evaluate(ids => { const m = atlasOf(ids.r); delete m.pins[ids.witch]; m.off = [ids.witch]; atlasPinsFill(ids.r); const gone = !m.pins[ids.witch]; m.off = []; atlasPinsFill(ids.r); return gone && !!m.pins[ids.witch]; }, ids);
  check("atlas view: a place taken off the map stays off until it's put back", offOk);
  // roll again with a new shape, rename a feature
  const seed0 = await p.evaluate(ids => atlasOf(ids.r).seed, ids);
  await p.selectOption("[data-at-shape]", "island"); await p.click('[data-at="roll"]');
  const rolled = await p.evaluate(ids => { const m = atlasOf(ids.r); return { shape: m.shape, seed: m.seed }; }, ids);
  check("atlas view: Roll again with a new shape changes the map", rolled.shape === "island" && rolled.seed !== seed0, JSON.stringify(rolled));
  const first = await p.evaluate(ids => atlasOf(ids.r).names[0].id, ids);
  await p.fill(`[data-atname="${first}"]`, "Renamed Peaks"); await p.press(`[data-atname="${first}"]`, "Tab");
  check("atlas view: a feature can be renamed", await p.evaluate(ids => atlasOf(ids.r).names[0].name === "Renamed Peaks" && ATLAS_VIEW.labels.includes("Renamed Peaks"), ids));
  // the place page tick
  await p.evaluate(ids => { W.sel = ids.crypt; W.mode = "place"; renderWorld(); }, ids);
  check("atlas view: the place page's Found tick shows it", await p.isChecked("[data-wfound]"));
  await p.uncheck("[data-wfound]");
  check("atlas view: …and unticking hides it again", await p.evaluate(ids => !wp(ids.crypt).found, ids));
  // the world map
  await p.click('[data-at="world"]'); await p.waitForSelector("#atlasCv");
  const wv = await p.evaluate(() => ({ id: W.atlasId, labels: ATLAS_VIEW.labels }));
  check("atlas view: the World map button shows the regions", wv.id === "world" && wv.labels.includes("The Ashen Vale") && wv.labels.includes("Far Isles"), JSON.stringify(wv));
  await p.evaluate(() => $("#atlasCv").scrollIntoView({ block: "center" }));
  const rv = await pinAt(ids.r); await p.mouse.click(rv.x, rv.y); await p.waitForTimeout(300);
  const openR = await p.$('#atlasMenu:not([hidden]) [data-atp="map"]'); if (openR) await openR.click();
  check("atlas view: clicking a region opens its map", await p.evaluate(ids => W.atlasId === ids.r && !!$("#atlasCv"), ids));
  // phone width
  await p.setViewportSize({ width: 390, height: 760 }); await p.waitForTimeout(300);
  const fit = await p.evaluate(() => ({ cv: $("#atlasCv").getBoundingClientRect().width, page: document.documentElement.scrollWidth }));
  check("atlas view: at 390 px wide the map fits the screen", fit.cv <= 390 && fit.page <= 390, JSON.stringify(fit));
  await p.setViewportSize({ width: 1300, height: 900 });

  // ---------- Task 4: import a map ----------
  const png = await p.evaluate(async () => { const cv = document.createElement("canvas"); cv.width = 1200; cv.height = 900; const g = cv.getContext("2d"); g.fillStyle = "#c33"; g.fillRect(0, 0, 1200, 900); g.fillStyle = "#3c3"; g.fillRect(0, 0, 600, 900); return cv.toDataURL("image/png").split(",")[1]; });
  const tmp = path.join(require("os").tmpdir(), "atlas-import-test.png"); fs.writeFileSync(tmp, Buffer.from(png, "base64"));
  await p.evaluate(ids => { location.hash = "world"; atlasOpen(ids.r); }, ids); await p.waitForSelector("#atlasFile", { state: "attached" });
  const before4 = await p.evaluate(ids => JSON.stringify(atlasOf(ids.r).pins), ids);
  await p.setInputFiles("#atlasFile", tmp);
  await p.waitForFunction(ids => { const m = atlasOf(ids.r); return m && m.img && $("#atlasCv") && $("#atlasCv").width > 0 && ATLAS_VIEW.pic; }, ids, { timeout: 10000 }).catch(() => {});
  const i4 = await p.evaluate(ids => { const m = atlasOf(ids.r), cv = $("#atlasCv"), px = cv.getContext("2d").getImageData(Math.round(cv.width * .75), Math.round(cv.height * .05), 1, 1).data; return { img: m.img, w: m.imgW, h: m.imgH, cv: [cv.width, cv.height], red: px[0] > 150 && px[1] < 100, pins: JSON.stringify(m.pins), roll: !!$('[data-at="roll"]'), names: !!$("[data-atname]") }; }, ids);
  check("import: a picture replaces the terrain", i4.img === "atlas-" + ids.r && i4.red && i4.cv[0] === 1600 && i4.cv[1] === 1200, JSON.stringify(i4));
  check("import: …and keeps the pins", i4.pins === before4);
  check("import: Shape, Land, Roll and feature names are hidden for a picture", !i4.roll && !i4.names);
  const spread = await p.evaluate(ids => { const m = atlasOf(ids.r); m.pins = {}; atlasPinsFill(ids.r); const q = Object.values(m.pins); let minD = 9; q.forEach((a, i) => q.slice(i + 1).forEach(b => { minD = Math.min(minD, Math.hypot(a.x - b.x, a.y - b.y)); })); return { n: q.length, minD }; }, ids);
  check("import: pins are spread out on a picture", spread.n === 6 && spread.minD > .07, JSON.stringify(spread));
  await p.waitForTimeout(400); await p.reload(); await p.waitForFunction(() => typeof atlasOpen === "function");
  await p.evaluate(ids => { location.hash = "world"; worldLoad(); atlasOpen(ids.r); }, ids);
  await p.waitForFunction(() => ATLAS_VIEW.pic, null, { timeout: 10000 }).catch(() => {});
  check("import: it survives a reload", await p.evaluate(() => { const cv = $("#atlasCv"), px = cv.getContext("2d").getImageData(Math.round(cv.width * .75), 40, 1, 1).data; return px[0] > 150 && px[1] < 100; }));
  // the picture isn't on this device
  await p.evaluate(async ids => { await MAPIMG.del("atlas-" + ids.r); ATLAS_PICS.clear(); atlasOpen(ids.r); }, ids);
  await p.waitForSelector("#atlasMissing", { timeout: 10000 }).catch(() => {});
  check("import: without the picture on this device the view says so and offers Import again", /on another device/.test(await p.textContent("#atlasMissing").catch(() => "")) && !!(await p.$("#atlasFile")));
  // back to generated terrain
  await p.setInputFiles("#atlasFile", tmp); await p.waitForFunction(() => ATLAS_VIEW.pic, null, { timeout: 10000 }).catch(() => {});
  await p.click('[data-at="gen"]'); await p.waitForTimeout(400);
  const g4 = await p.evaluate(async ids => ({ img: atlasOf(ids.r).img, stored: !!(await MAPIMG.get("atlas-" + ids.r)), roll: !!$('[data-at="roll"]') }), ids);
  check("import: Use generated terrain switches back and deletes the picture", !g4.img && !g4.stored && g4.roll, JSON.stringify(g4));

  // ---------- Task 5: on the TV ----------
  await p.evaluate(ids => { location.hash = "world"; worldLoad(); [ids.velmor, ids.crypt, ids.bell, ids.witch].forEach(k => { const x = wp(k); if (x) delete x.found; }); worldSave(); atlasOpen(ids.r); }, ids);
  await p.waitForSelector('[data-at="tv"]');
  const [tv] = await Promise.all([ctx.waitForEvent("page"), p.click('[data-at="tv"]')]);
  tv.on("pageerror", e => errs.push("tv: " + e.message));
  await tv.waitForSelector("#tv"); await tv.evaluate(() => { window.__msgs = []; new BroadcastChannel("dmforge.map").onmessage = e => window.__msgs.push(e.data); });
  const waitFrame = async (n, ms = 8000) => tv.waitForFunction(n => (window.tvFrames || 0) > n, n, { timeout: ms }).then(() => true, () => false);
  await p.bringToFront();
  check("tv: Show on TV sends a frame", await waitFrame(0));
  const L1 = await p.evaluate(() => atlasTvLabels());
  /* the map is random each run, so compare with its own feature names rather than a word list */
  const feat1 = await p.evaluate(() => (atlasOf(HOST.atlas.id).names || []).map(f => f.name).filter(Boolean));
  check("tv: the picture shows found places and the land's names", L1.includes("Frostford") && L1.includes("Northmarch") && L1.some(x => feat1.includes(x)), JSON.stringify({ L1, feat1 }));
  check("tv: …and never a hidden place's name", !["Velmor", "Sunken Crypt", "Bell Tower", "Witchwood"].some(x => L1.includes(x)), JSON.stringify(L1));
  check("tv: the button now says Off TV", /Off TV/.test(await p.textContent('[data-at="tv"]')));
  let n = await tv.evaluate(() => window.tvFrames || 0);
  await p.evaluate(() => { $("#atlasCv").scrollIntoView({ block: "center" }); });
  const vp = await pinAt(ids.velmor); await p.mouse.click(vp.x, vp.y); await p.waitForSelector('#atlasMenu:not([hidden]) [data-atp="reveal"]'); await p.click('#atlasMenu [data-atp="reveal"]');
  check("tv: revealing a place re-sends the picture with its name", await waitFrame(n) && await p.waitForFunction(() => atlasTvLabels().includes("Velmor"), null, { timeout: 8000 }).then(() => true, () => false));
  const nPing = await tv.evaluate(() => window.__msgs.filter(m => m.t === "ping").length);
  const box = await p.evaluate(() => { const r = $("#atlasCv").getBoundingClientRect(); return { x: r.left + 8, y: r.top + r.height - 8 }; });
  await p.mouse.click(box.x, box.y); await p.waitForTimeout(300);
  check("tv: a click on the DM's map while showing sends a ping", await tv.evaluate(nn => window.__msgs.filter(m => m.t === "ping").length > nn, nPing));
  check("tv: the TV only gets pictures and pings", await tv.evaluate(() => window.__msgs.every(m => ["frame", "ping", "bye"].includes(m.t) && Object.keys(m).every(k => ["t", "blob", "x", "y"].includes(k)))));
  n = await tv.evaluate(() => window.tvFrames || 0);
  await p.setInputFiles("#atlasFile", tmp); await p.waitForFunction(() => ATLAS_VIEW.pic, null, { timeout: 10000 }).catch(() => {});
  check("tv: an imported map goes to the TV", await waitFrame(n) && await p.evaluate(() => ATLAS_TV.pic));
  n = await tv.evaluate(() => window.tvFrames || 0); await p.click('[data-at="tv"]');
  check("tv: Off TV goes back to the dungeon map screen", await waitFrame(n) && await p.evaluate(() => HOST.show !== "atlas"));
  const del = await p.evaluate(async ids => { atlasTv(ids.r); const p0 = wp(ids.r); confirmBox = async () => true; const hadPic = !!(await MAPIMG.get("atlas-" + ids.r)); await wpDelete(p0); await new Promise(r => setTimeout(r, 300)); return { show: HOST.show, atlas: HOST.atlas, hadPic, picLeft: !!(await MAPIMG.get("atlas-" + ids.r)) }; }, ids);
  check("tv: deleting a region whose map is on the TV takes the map off the TV", del.show !== "atlas" && !del.atlas, JSON.stringify(del));
  check("deleting a region deletes its imported map picture", del.hadPic && !del.picLeft, JSON.stringify(del));
  await tv.close();

  // the Region builder (2026-11-18)
  await p.goto(URL + "#world"); await p.waitForTimeout(300);
  await p.evaluate(() => { W.build = null; W.mode = "place"; renderWorld(); });
  await p.click('#worldSide [data-w="build"]'); await p.waitForTimeout(150);
  await p.click('#worldMain [data-w="wbkind"][data-k="region"]'); await p.waitForTimeout(300);
  check("region builder: shows a map preview", await p.evaluate(() => { const c = $("#wbMapCv"); return !!c && c.width > 0 && wbDraft().atlas.seed === "at-" + W.build.seed; }));
  await p.selectOption('#worldMain [data-wb="shape"]', "island"); await p.waitForTimeout(250);
  check("region builder: Shape changes the map, and an island gets an Isle name", await p.evaluate(() => wbDraft().atlas.shape === "island" && /Isle/.test(wbDraft().name)), await p.evaluate(() => wbDraft().name));
  check("region builder: an island reads \"An island\" and its name starts with The", await p.evaluate(() => { W.build.o.name = ""; const d = wbDraft(); return /^An island/.test(d.desc) && /^The /.test(d.name); }), await p.evaluate(() => wbDraft().desc + " / " + wbDraft().name));
  const rb_fid = await p.evaluate(() => document.querySelector("#worldMain [data-wbname]").dataset.wbname);
  const nbox = `#worldMain [data-wbname="${rb_fid}"]`;
  await p.fill(nbox, "Dragonspine"); await p.waitForTimeout(100);
  check("region builder: your own feature name is used, and the box keeps focus", await p.evaluate(id => W.build.o.names[id] === "Dragonspine" && wbDraft().atlas.names.find(f => f.id === id).name === "Dragonspine" && document.activeElement && document.activeElement.dataset.wbname === id, rb_fid));
  await p.fill(nbox, ""); await p.waitForTimeout(100);
  check("region builder: an emptied name goes back to the made-up one", await p.evaluate(id => { const d = wbDraft().atlas; return d.names.find(f => f.id === id).name === atlasNames(d).find(f => f.id === id).name && !!d.names.find(f => f.id === id).name; }, rb_fid));
  await p.fill(nbox, "Dragonspine"); await p.waitForTimeout(100);
  const rb_seed0 = await p.evaluate(() => W.build.seed);
  await p.click('#worldMain [data-w="wbroll"]'); await p.waitForTimeout(250);
  check("region builder: Roll again makes a new map and clears your names", await p.evaluate(s0 => W.build.seed !== s0 && Object.keys(W.build.o.names || {}).length === 0, rb_seed0));
  const rb_camp = await p.evaluate(() => { const c = blankCampaign("Isles"); Store.save(c); renderWorld(); return c.id; }); await p.waitForTimeout(150);
  await p.selectOption('#worldMain [data-wb="camp"]', rb_camp); await p.waitForTimeout(150);
  await p.fill('#worldMain [data-wb="name"]', "Region One");
  await p.click('#worldMain [data-w="wbadd"]'); await p.waitForTimeout(300);
  const rb_r1 = await p.evaluate(c => { const x = W.places.find(q => q.name === "Region One"); return x && { id: x.id, type: x.type, shape: x.atlas && x.atlas.shape, seed: x.atlas && x.atlas.seed, top: !x.parent, lore: Store.get(c).lore.some(l => l.wpId === x.id) }; }, rb_camp);
  check("region builder: Add to World saves a region with its map, in the campaign", rb_r1 && rb_r1.type === "region" && rb_r1.shape === "island" && rb_r1.top && rb_r1.lore, JSON.stringify(rb_r1));
  await p.click('#worldSide [data-w="build"]'); await p.waitForTimeout(150);
  await p.click('#worldMain [data-w="wbkind"][data-k="region"]'); await p.waitForTimeout(250);
  const rb_empty = await p.evaluate(() => $('#worldMain [data-wb="name"]').value === "");
  await p.selectOption('#worldMain [data-wb="shape"]', "coast"); await p.waitForTimeout(150);
  await p.fill('#worldMain [data-wb="name"]', "Region Two");
  await p.click('#worldMain [data-w="wbadd"]'); await p.waitForTimeout(300);
  const rb_r2 = await p.evaluate(s1 => { const x = W.places.find(q => q.name === "Region Two"); const on = atlasPlaces("world").map(a => a.p.name); return { diff: x && x.atlas && x.atlas.seed !== s1, both: on.includes("Region One") && on.includes("Region Two") }; }, rb_r1 && rb_r1.seed);
  check("region builder: the next region starts with an empty name and gets its own map", rb_empty && rb_r2.diff, JSON.stringify({ rb_empty, ...rb_r2 }));
  check("region builder: both regions are on the world map", rb_r2.both);
  await p.click('#worldSide [data-w="build"]'); await p.waitForTimeout(150);
  await p.click('#worldMain [data-w="wbkind"][data-k="region"]'); await p.waitForTimeout(250);
  await p.selectOption('#worldMain [data-wb="parent"]', rb_r1.id); await p.waitForTimeout(150);
  await p.fill('#worldMain [data-wb="name"]', "Inner");
  await p.click('#worldMain [data-w="wbadd"]'); await p.waitForTimeout(300);
  check("region builder: a region inside another isn't on the world map", await p.evaluate(id => { const x = W.places.find(q => q.name === "Inner"); return x && x.parent === id && !atlasPlaces("world").some(a => a.p.id === x.id); }, rb_r1.id));
  await p.click('#worldSide [data-w="build"]'); await p.waitForTimeout(150);
  await p.click('#worldMain [data-w="wbkind"][data-k="shop"]'); await p.waitForTimeout(150);
  await p.click('#worldMain [data-w="wbkind"][data-k="region"]'); await p.waitForTimeout(250);
  check("region builder: switching kinds and back draws the map again", await p.evaluate(() => { const c = $("#wbMapCv"); return !!c && c.width > 0; }));
  // the Azgaar-style upgrade (2026-11-24): new shapes, climates, lakes, borders, roads, towns and kingdoms
  const OLD_LAND = {"F1|coast|balanced":[1217502259,5,6],"F2|coast|balanced":[1983253885,2,6],"F1|coast|mountains":[234624164,5,8],"F2|coast|mountains":[1870781288,5,5],"F1|inland|balanced":[177756600,5,9],"F2|inland|balanced":[1401242746,5,12],"F1|inland|mountains":[948645878,5,16],"F2|inland|mountains":[1140621581,4,20],"F1|island|balanced":[1425856041,5,4],"F2|island|balanced":[-1133604488,0,0],"F1|island|mountains":[-2052677874,4,3],"F2|island|mountains":[1515042966,1,0]};
  const up = await p.evaluate(() => {
    const o = {}, fp = m => { const T = atlasTerrain(m); let h = 0; for (let i = 0; i < T.h.length; i += 7) h = (h * 31 + Math.round(T.h[i] * 1000)) | 0; return [h, T.rivers.length, T.lakes.length]; };
    o.old = {}; for (const shape of ["coast", "inland", "island"]) for (const land of ["balanced", "mountains"]) for (const seed of ["F1", "F2"]) o.old[`${seed}|${shape}|${land}`] = fp({ seed, shape, land });
    const parts = T => { const seen = new Uint8Array(T.W * T.H); let n = 0; for (let i = 0; i < T.W * T.H; i++) { if (seen[i] || T.h[i] < 0) continue; let size = 0; const st = [i]; seen[i] = 1; while (st.length) { const c = st.pop(), x = c % T.W, y = (c - x) / T.W; size++; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + a, ny = y + b, j = ny * T.W + nx; if (nx < 0 || ny < 0 || nx >= T.W || ny >= T.H || seen[j] || T.h[j] < 0) continue; seen[j] = 1; st.push(j); } } if (size > 60) n++; } return n; };
    const landShare = (T, f) => { let a = 0, n = 0; for (let y = 0; y < T.H; y++) for (let x = 0; x < T.W; x++) if (f(x, y)) { n++; if (T.h[y * T.W + x] >= 0) a++; } return a / n; };
    o.archi = ["A1", "A2", "A3"].map(seed => parts(atlasTerrain({ v: 2, seed, shape: "archipelago", land: "balanced" })));
    o.twin = ["A1", "A2"].map(seed => { const T = atlasTerrain({ v: 2, seed, shape: "twin", land: "balanced" }); return [landShare(T, x => Math.abs(x - T.W / 2) < 6), landShare(T, x => x < T.W * .4), landShare(T, x => x > T.W * .6)]; });
    o.volcano = ["A1", "A2"].map(seed => { const T = atlasTerrain({ v: 2, seed, shape: "volcano", land: "balanced" }); return [T.h[Math.round(T.H / 2) * T.W + Math.round(T.W / 2)], landShare(T, (x, y) => Math.min(x, y, T.W - 1 - x, T.H - 1 - y) < 8)]; });
    o.penin = ["A1", "A2", "A3"].map(seed => { const T = atlasTerrain({ v: 2, seed, shape: "peninsula", land: "balanced" }); return [landShare(T, (x, y) => y < 6), landShare(T, (x, y) => y > T.H - 7), landShare(T, x => x < 6), landShare(T, x => x > T.W - 7)].filter(v => v > .3).length; });
    o.lakes = ["L1", "L2", "L3"].map(seed => [atlasTerrain({ seed, shape: "coast", land: "balanced" }).lakes.length, atlasTerrain({ v: 2, seed, shape: "coast", land: "balanced" }).lakes.length]);
    const feats = clim => atlasTerrain({ v: 2, seed: "C1", shape: "coast", land: "forest", climate: clim }).feats.map(f => f.kind);
    o.desertForest = feats("desert").includes("forest"); o.jungleForest = feats("jungle").includes("forest");
    const pic = (clim, seed = "C1") => { const cv = atlasTerrainCanvas({ v: 2, seed, shape: "inland", land: "balanced", climate: clim }); const d = cv.getContext("2d").getImageData(200, 200, 1200, 700).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 400) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } return [r, g, b]; };
    o.pics = { temperate: pic("temperate"), desert: pic("desert"), tundra: pic("tundra") }; o.picSame = atlasTerrainCanvas({ v: 2, seed: "C2", shape: "coast", land: "balanced", climate: "swamp" }).toDataURL() === (ATLAS_IMG.clear(), atlasTerrainCanvas({ v: 2, seed: "C2", shape: "coast", land: "balanced", climate: "swamp" }).toDataURL());
    // roads and borders from pins: a town the players haven't found has no road on their map; roads stay on land
    const m = { v: 2, seed: "R1", shape: "inland", land: "balanced" }, T = atlasTerrain(m), land = () => { for (;;) { const i = Math.floor(Math.random() * T.W * T.H); if (T.h[i] > .05 && T.h[i] < .25) return { x: (i % T.W + .5) / T.W, y: (Math.floor(i / T.W) + .5) / T.H }; } };
    const towns = [0, 1, 2].map(k => ({ id: "t" + k, type: k ? "village" : "town", area: false, hidden: k === 2, ...land() })), areas = [{ id: "a0", area: true, x: .25, y: .5 }, { id: "a1", area: true, x: .75, y: .5, hidden: true }];
    const dm = atlasLines(m, [...towns, ...areas]), pl = atlasLines(m, [...towns, ...areas].filter(q => !q.hidden));
    o.roads = [dm.roads.length + dm.lanes.length, pl.roads.length + pl.lanes.length, !!dm.own, !!pl.own];
    o.onLand = dm.roads.every(r => r.slice(1, -1).every(([x, y]) => T.h[Math.min(T.H - 1, Math.round(y)) * T.W + Math.min(T.W - 1, Math.round(x))] >= -.02));
    const owners = new Set(dm.own); o.owners = owners.has(0) && owners.has(1);
    return o;
  });
  const oldDiff = Object.keys(OLD_LAND).filter(k => JSON.stringify(up.old[k]) !== JSON.stringify(OLD_LAND[k]));
  check("upgrade: maps made before keep exactly the same land", oldDiff.length === 0, oldDiff.join(", "));
  check("upgrade: an archipelago is many islands", up.archi.every(n => n >= 4), up.archi.join());
  check("upgrade: twin lands have sea down the middle and land on both sides", up.twin.every(([mid, l, r]) => mid < .1 && l > .25 && r > .25), JSON.stringify(up.twin));
  check("upgrade: a volcano island rises to a peak in the middle, with sea all round", up.volcano.every(([top, edge]) => top > .45 && edge < .05), JSON.stringify(up.volcano));
  check("upgrade: a peninsula joins the land on one side only", up.penin.every(n => n <= 1), up.penin.join());
  check("upgrade: newer maps get lakes in their hollows", up.lakes.every(([a, b]) => b >= a) && up.lakes.some(([a, b]) => b > a), JSON.stringify(up.lakes));
  check("upgrade: a desert has no forest, a jungle has one", !up.desertForest && up.jungleForest);
  const tint = c => c[0] - c[2];
  check("upgrade: climates paint the land their own colours", tint(up.pics.desert) > tint(up.pics.temperate) + 5000 && up.pics.tundra.reduce((a, b) => a + b) > up.pics.temperate.reduce((a, b) => a + b), JSON.stringify(up.pics));
  check("upgrade: the same recipe paints the same picture", up.picSame);
  check("upgrade: roads join the towns, and the players' map leaves out roads and borders to places they haven't found", up.roads[0] === 2 && up.roads[1] === 1 && up.roads[2] && !up.roads[3], JSON.stringify(up.roads));
  check("upgrade: roads stay on land", up.onLand);
  check("upgrade: kingdoms split the land between them", up.owners);
  // the region builder's climate, towns and kingdoms
  await p.click('#worldSide [data-w="build"]'); await p.waitForTimeout(150);
  await p.click('#worldMain [data-w="wbkind"][data-k="region"]'); await p.waitForTimeout(250);
  await p.selectOption('#worldMain [data-wb="climate"]', "desert"); await p.waitForTimeout(150);
  await p.selectOption('#worldMain [data-wb="towns"]', "many"); await p.waitForTimeout(150);
  await p.selectOption('#worldMain [data-wb="realms"]', "2"); await p.waitForTimeout(250);
  const rbd = await p.evaluate(() => { const d = wbDraft(), pins = wbRegionPins(d), T = atlasTerrain(d.atlas); return { desc: d.desc, clim: d.atlas.climate, v: d.atlas.v, realms: d.kids.filter(k => k.type === "region").length, towns: d.kids.reduce((n, k) => n + k.kids.length, 0), pins: pins.length, onLand: pins.every(q => T.h[atlasCell(T, q)] >= 0), again: JSON.stringify(wbDraft().atlas.pins) === JSON.stringify(d.atlas.pins) }; });
  check("region builder: Climate, Towns and Kingdoms shape the region", rbd.clim === "desert" && rbd.v === 2 && /desert/.test(rbd.desc) && rbd.realms === 2 && rbd.towns >= 8 && rbd.pins === rbd.realms + rbd.towns, JSON.stringify(rbd));
  check("region builder: its towns and kingdoms sit on land, the same each time", rbd.onLand && rbd.again);
  const rbPins = await p.evaluate(() => { const d = wbDraft(); return wbRegionPins(d).map(q => [q.name, q.x, q.y]).sort(); });
  await p.fill('#worldMain [data-wb="name"]', "Dune Realm");
  await p.click('#worldMain [data-w="wbadd"]'); await p.waitForTimeout(300);
  const rbSaved = await p.evaluate(() => { const r = W.places.find(q => q.name === "Dune Realm"); atlasPinsFill(r.id); return { pins: atlasPlaces(r.id).map(({ p: q }) => [q.name, r.atlas.pins[q.id] && r.atlas.pins[q.id].x, r.atlas.pins[q.id] && r.atlas.pins[q.id].y]).sort(), clim: r.atlas.climate, inRealm: W.places.filter(q => q.type === "town" || q.type === "city" || q.type === "village").some(q => wp(q.parent) && wp(q.parent).parent === r.id) }; });
  check("region builder: Add to World keeps every town and kingdom where the preview showed it", JSON.stringify(rbSaved.pins) === JSON.stringify(rbPins) && rbSaved.clim === "desert" && rbSaved.inRealm, JSON.stringify({ rbPins, rbSaved }));
  const rbView = await p.evaluate(() => { const r = W.places.find(q => q.name === "Dune Realm"); atlasOpen(r.id); return { sel: ($("[data-at-climate]") || {}).value }; });
  await p.click('[data-at="roll"]'); await p.waitForTimeout(250);
  check("map view: Climate is shown and Roll again keeps it", rbView.sel === "desert" && await p.evaluate(() => atlasOf(W.atlasId).climate === "desert" && atlasOf(W.atlasId).v === 2), JSON.stringify(rbView));
  const rb_vp = p.viewportSize(); await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  check("region builder: fits a phone without sideways scrolling", await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await p.setViewportSize(rb_vp);
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll world map checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
