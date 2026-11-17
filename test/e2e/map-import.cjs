// Map import and export: your own images, Universal VTT files, Forge map files, Foundry/Roll20 exports. Run with:  npm run test:mapio
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
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
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "forge-io-"));

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1, acceptDownloads: true, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#map"); await p.waitForFunction(() => typeof generateDungeon === "function");
  const download = async (sel) => { const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 15000 }).catch(() => null), p.click(sel)]); return dl; };
  const cellClick = async (x, y) => { await p.evaluate(() => $("#mapCanvas").scrollIntoView({ block: "end" })); const b = await p.locator("#mapCanvas").boundingBox(), [W, H] = await p.evaluate(() => [currentMap.W, currentMap.H]); await p.mouse.click(b.x + (x * 20 + 10) * b.width / (W * 20), b.y + (46 + y * 20 + 10) * b.height / (H * 20 + 46)); };

  // ---------- a picture from the DM's computer ----------
  const png = path.join(TMP, "my-dungeon.png");
  fs.writeFileSync(png, Buffer.from(await p.evaluate(() => { const c = document.createElement("canvas"); c.width = 1000; c.height = 700; const g = c.getContext("2d"); g.fillStyle = "#ddd"; g.fillRect(0, 0, 1000, 700); g.strokeStyle = "#444"; for (let x = 0; x <= 1000; x += 50) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 700); g.stroke(); } return c.toDataURL("image/png").split(",")[1]; }), "base64"));
  await p.setInputFiles("#mapImportImage", png); await p.waitForFunction(() => currentMap && currentMap.kind === "image", null, { timeout: 8000 });
  check("an imported picture becomes the current map", await p.evaluate(() => currentMap.kind === "image" && currentMap.params.name === "my-dungeon"));
  check("the imported-map panel shows", await p.isVisible("#impPanel"));
  await p.fill("#impAcross", "20"); await p.dispatchEvent("#impAcross", "change");
  check("Squares across sets the grid", await p.evaluate(() => currentMap.W === 20 && currentMap.H === 14), await p.evaluate(() => [currentMap.W, currentMap.H]));
  await p.fill("#impOffX", "10"); await p.dispatchEvent("#impOffX", "input");
  check("nudging the grid moves it", await p.evaluate(() => currentMap.ox === 10 && currentMap.W === 19));
  await p.fill("#impOffX", "0"); await p.dispatchEvent("#impOffX", "input");

  // placing rooms
  await p.check("#impPlace");
  await cellClick(2, 2); await cellClick(8, 5); await cellClick(15, 10);
  check("clicking the map in Place rooms mode numbers rooms", await p.evaluate(() => currentMap.rooms.map(r => r.num + "@" + r.cx + "," + r.cy).join()) === "1@2,2,2@8,5,3@15,10");
  check("each placed room gets a key entry", (await p.$$("#roomKey .key-room")).length === 3);
  await p.fill('[data-imf="name"][data-i="1"]', "Guard room"); await p.dispatchEvent('[data-imf="name"][data-i="1"]', "change");
  await p.fill('[data-imf="notes"][data-i="1"]', "Two bored guards play dice."); await p.dispatchEvent('[data-imf="notes"][data-i="1"]', "change");
  check("room names and notes are kept", await p.evaluate(() => currentMap.rooms[1].name === "Guard room" && currentMap.rooms[1].notes === "Two bored guards play dice."));
  await p.click('[data-ima="roll"][data-i="0"]');
  check("Roll contents fills a room from the generator", await p.evaluate(() => { const r = currentMap.rooms[0]; return r.content.length > 0 || !!r.enc; }));
  await p.click('[data-ima="del"][data-i="2"]');
  check("removing a room renumbers the rest", await p.evaluate(() => currentMap.rooms.length === 2 && currentMap.rooms.map(r => r.num).join() === "1,2"));
  await p.uncheck("#impPlace");

  // fog works on imported maps
  const rev = await p.evaluate(() => { const d = currentMap, f = new Uint8Array(d.W * d.H); const ok = fogRevealRoom(d, f, 8, 8); return [ok, f[8 * d.W + 8], f[8 * d.W + 10], f[8 * d.W + 14]]; });
  check("Room reveal on a plain picture uncovers the area around the click", rev[0] === true && rev[1] === 1 && rev[2] === 1 && rev[3] === 0, JSON.stringify(rev));

  // map file round trip
  const dlMap = await download("#mapExportFile");
  check("Export map file downloads a .forgemap.json", !!dl(dlMap) && /\.forgemap\.json$/.test(dlMap.suggestedFilename()), dlMap && dlMap.suggestedFilename());
  const mapFile = path.join(TMP, "saved.forgemap.json"); if (dlMap) await dlMap.saveAs(mapFile);
  const mf = dlMap ? JSON.parse(fs.readFileSync(mapFile, "utf8")) : {};
  check("the map file carries the picture and the rooms", mf.app === "dmforge-map" && /^data:image\//.test(mf.image || "") && mf.map && mf.map.markers.length === 2);
  await p.evaluate(() => { $("#mapSeed").value = "ABC123"; renderMap(); });
  check("generating a dungeon replaces the imported map", await p.evaluate(() => !currentMap.kind && !$("#impPanel").offsetParent));
  await p.setInputFiles("#mapImportFile", mapFile); await p.waitForFunction(() => currentMap && currentMap.kind === "image", null, { timeout: 8000 });
  check("loading the map file brings it all back", await p.evaluate(() => currentMap.W === 20 && currentMap.rooms.length === 2 && currentMap.rooms[1].name === "Guard room"));

  // saving to a campaign keeps the picture on this computer
  await p.goto(URL + "#tracker"); await p.click("#newCamp"); await p.goto(URL + "#map"); await p.waitForTimeout(300);
  await p.click("#mapSave"); await p.waitForTimeout(300);
  const saved = await p.evaluate(() => [...Store.cache.values()].flatMap(c => c.maps || [])[0]);
  check("an imported map saves to a campaign without the picture inside", !!saved && saved.kind === "image" && !!saved.imgId && !JSON.stringify(saved).includes("data:image"));
  await p.evaluate(() => { $("#mapSeed").value = "ABC123"; renderMap(); });
  await p.evaluate(m => mapOpenSaved(m), saved); await p.waitForFunction(() => currentMap && currentMap.kind === "image", null, { timeout: 8000 });
  check("opening it from the campaign reloads the picture", await p.evaluate(() => currentMap.rooms.length === 2 && currentMap.img.width === 1000));

  // ---------- Universal VTT (Dungeondraft) ----------
  const vtt = await p.evaluate(() => {
    const c = document.createElement("canvas"); c.width = 400; c.height = 300; const g = c.getContext("2d"); g.fillStyle = "#cba"; g.fillRect(0, 0, 400, 300);
    return { format: 0.3, resolution: { map_origin: { x: 0, y: 0 }, map_size: { x: 8, y: 6 }, pixels_per_grid: 50 },
      line_of_sight: [[{ x: 4, y: 0 }, { x: 4, y: 6 }]], portals: [], lights: [], environment: {}, image: c.toDataURL("image/png").split(",")[1] };
  });
  const vttFile = path.join(TMP, "cellar.dd2vtt"); fs.writeFileSync(vttFile, JSON.stringify(vtt));
  await p.setInputFiles("#mapImportVtt", vttFile); await p.waitForFunction(() => currentMap && currentMap.kind === "image" && currentMap.params.name === "cellar", null, { timeout: 8000 });
  check("a .dd2vtt file imports with its grid", await p.evaluate(() => currentMap.W === 8 && currentMap.H === 6 && currentMap.walls.length === 1));
  const vr = await p.evaluate(() => { const d = currentMap, f = new Uint8Array(d.W * d.H); fogRevealRoom(d, f, 1, 2); return [f[2 * d.W + 2], f[2 * d.W + 3], f[2 * d.W + 5]]; });
  check("Room reveal stops at the file's walls", vr[0] === 1 && vr[1] === 1 && vr[2] === 0, JSON.stringify(vr));

  // ---------- exports for VTTs ----------
  await p.evaluate(() => { $("#mapSeed").value = "FOG5"; $("#mapSize").value = "small"; renderMap(); });
  const dlV = await download("#mapExportVtt");
  const vf = path.join(TMP, "out.dd2vtt"); if (dlV) await dlV.saveAs(vf);
  const ex = dlV ? JSON.parse(fs.readFileSync(vf, "utf8")) : {};
  const geo = await p.evaluate(() => ({ W: currentMap.W, H: currentMap.H, doors: currentMap.doors.filter(x => !x.secret).length }));
  check("Foundry export is a .dd2vtt file", !!dlV && /\.dd2vtt$/.test(dlV.suggestedFilename()));
  check("the export has the grid at 100 pixels per square", ex.resolution && ex.resolution.pixels_per_grid === 100 && ex.resolution.map_size.x === geo.W && ex.resolution.map_size.y === geo.H);
  check("the export has walls and doors", Array.isArray(ex.line_of_sight) && ex.line_of_sight.length > 4 && Array.isArray(ex.portals) && ex.portals.length === geo.doors, ex.portals && ex.portals.length + " vs " + geo.doors);
  const imgSize = ex.image ? await p.evaluate(async b64 => { const bm = await createImageBitmap(await (await fetch("data:image/png;base64," + b64)).blob()); return [bm.width, bm.height]; }, ex.image) : [0, 0];
  check("the export's picture is the map at 100 pixels per square", imgSize[0] === geo.W * 100 && imgSize[1] === geo.H * 100, imgSize.join("x"));
  const dlR = await download("#mapExportRoll20");
  check("Roll20 export is a PNG", !!dlR && /-roll20\.png$/.test(dlR.suggestedFilename()));

  // a generated map's file keeps its seed, style and fog
  await p.evaluate(() => { $("#mapStyle").value = "dark"; renderMap(); HOST.fog = fogNew(currentMap); HOST.fog.fill(1, 0, 50); fogSaveLocal(); });
  const dlG = await download("#mapExportFile"); const gf = path.join(TMP, "gen.forgemap.json"); if (dlG) await dlG.saveAs(gf);
  await p.evaluate(() => { localStorage.removeItem("dmforge.fog.v1"); $("#mapSeed").value = "ZZZ999"; $("#mapStyle").value = "parchment"; renderMap(); });
  await p.setInputFiles("#mapImportFile", gf); await p.waitForTimeout(500);
  check("a generated map's file restores seed, style and fog", await p.evaluate(() => currentMap.params.seed === "FOG5" && currentMap.params.style === "dark" && HOST.fog[10] === 1));

  check("a file that isn't a map is refused politely", await (async () => { const bad = path.join(TMP, "bad.json"); fs.writeFileSync(bad, "{\"hello\":1}"); await p.setInputFiles("#mapImportFile", bad); await p.waitForTimeout(300); return /isn't a Forge map/.test(await p.textContent("#toast")); })());
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll map import/export checks passed");
  process.exit(fails ? 1 : 0);
  function dl(x) { return x; }
})().catch(e => { console.error(e); process.exit(1); });
