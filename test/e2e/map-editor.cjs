// The Dungeon Map editor (2026-11-24): drawn maps, the tools, undo, style, saving, the players' picture. Run with:  npm run test:mapedit
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
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
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1, serviceWorkers: "block" });
  await ctx.addInitScript(() => { if (!sessionStorage.getItem("t")) { sessionStorage.setItem("t", "1"); localStorage.clear(); } localStorage.setItem("dmforge.offline", "1"); });
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#map"); await p.waitForFunction(() => typeof medStart === "function"); await p.waitForTimeout(300);

  // a screen point for a spot on the map, in squares
  const at = (X, Y) => p.evaluate(([X, Y]) => { const r = $("#mapCanvas").getBoundingClientRect(), d = currentMap; return { x: r.left + X / d.W * r.width, y: r.top + (TOP + Y * CS) / (d.H * CS + TOP) * r.height }; }, [X, Y]);
  const settle = async () => { await p.evaluate(async () => { $("#mapWrap").scrollIntoView({ block: "start" }); let last = "", same = 0; for (let k = 0; k < 60 && same < 5; k++) { await new Promise(r => requestAnimationFrame(r)); const t = $("#mapCanvas").getBoundingClientRect().top.toFixed(1); same = t === last ? same + 1 : 0; last = t; } }); };
  const drag = async (a, b) => { const A = await at(...a), B = await at(...b); await p.mouse.move(A.x, A.y); await p.mouse.down(); await p.mouse.move((A.x + B.x) / 2, (A.y + B.y) / 2, { steps: 3 }); await p.mouse.move(B.x, B.y, { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(120); };
  const click = async (X, Y) => { const A = await at(X, Y); await p.mouse.click(A.x, A.y); await p.waitForTimeout(100); };
  const tool = async t => { await p.click(`[data-medtool="${t}"]`); await p.waitForTimeout(60); };
  const rec = () => p.evaluate(() => JSON.parse(JSON.stringify(currentMap.rec)));

  // a blank map, and the drawing tools
  await p.selectOption("#mapSize", "small"); await p.waitForTimeout(200);
  await p.click("#medNew"); await p.waitForTimeout(200); await settle();
  check("New blank map opens the editor on an empty drawn map", await p.evaluate(() => MED.on && currentMap.kind === "drawn" && currentMap.grid.every(v => !v) && !$("#medPanel").hidden));
  await tool("room"); await drag([2, 2], [10, 8]);
  let f = await p.evaluate(() => ({ n: currentMap.grid.reduce((a, b) => a + b, 0), in: currentMap.grid[5 * currentMap.W + 5], out: currentMap.grid[12 * currentMap.W + 5] }));
  check("Room: dragging draws an 8 × 6 room of floor", f.n === 48 && f.in === 1 && f.out === 0, JSON.stringify(f));
  await tool("round"); await drag([14, 2], [22, 10]);
  f = await p.evaluate(() => { const d = currentMap, s = d.rec.shapes[1]; return { t: s.t, centre: d.grid[6 * d.W + 18], corner: d.grid[2 * d.W + 14], walls: drawnContours(d).length }; });
  check("Round room: an ellipse, floor in the middle and not in its corners, with walls traced round it", f.t === "ellipse" && f.centre === 1 && f.corner === 0 && f.walls >= 2, JSON.stringify(f));
  await tool("shape"); for (const q of [[24, 2], [31, 2], [31, 9]]) await click(...q); await click(24, 2);
  f = await p.evaluate(() => { const d = currentMap; return { t: d.rec.shapes[2] && d.rec.shapes[2].t, inside: d.grid[3 * d.W + 29], outside: d.grid[8 * d.W + 25] }; });
  check("Shape: clicking corners and the first one again makes a triangle room", f.t === "poly" && f.inside === 1 && f.outside === 0, JSON.stringify(f));
  await tool("paint"); await drag([10.5, 5.5], [13.5, 5.5]);
  check("Paint: brushes a corridor between rooms", await p.evaluate(() => [10, 11, 12, 13].every(x => currentMap.grid[5 * currentMap.W + x] === 1)));
  await tool("erase"); await drag([4, 4], [6, 6]);
  check("Erase: cuts a hole out of the floor", await p.evaluate(() => currentMap.grid[4 * currentMap.W + 4] === 0 && currentMap.grid[3 * currentMap.W + 3] === 1));
  // placing things
  await tool("door"); await click(10.05, 5.5);
  await tool("number"); await click(7.5, 3.5);
  await tool("text"); await click(6, 9.3); await p.fill('#medSel [data-medf="text"]', "Secret stash"); await p.press('#medSel [data-medf="text"]', "Tab"); await p.waitForTimeout(150);
  await p.check('#medSel [data-medf="dm"]'); await p.waitForTimeout(150);
  await tool("stairs"); await click(8.5, 7.5);
  await tool("prop"); await p.click('[data-medprop="table"]'); await click(3.5, 6.5);
  let r = await rec();
  check("Door, room number, text, stairs and furniture are placed", r.doors.length === 1 && r.rooms.length === 1 && r.labels[0].text === "Secret stash" && r.labels[0].dm && r.icons.length === 1 && r.props.length === 1 && r.props[0].k === "table", JSON.stringify({ d: r.doors, rm: r.rooms.length, lb: r.labels, ic: r.icons, pr: r.props }));
  check("the door sits on the edge between the room and the corridor", r.doors[0] && ((r.doors[0].x === 10 && r.doors[0].dx === -1) || (r.doors[0].x === 9 && r.doors[0].dx === 1)), JSON.stringify(r.doors[0]));
  check("a numbered room gets a Room Key entry with its size", await p.evaluate(() => /Room/.test($("#roomKey").textContent) && currentMap.rooms[0].w === 8 && currentMap.rooms[0].h === 6), await p.evaluate(() => JSON.stringify(currentMap.rooms[0])));
  // select, move, turn, delete, undo and redo
  await tool("select"); await click(3.5, 6.5);
  check("Select picks the furniture and shows its buttons", await p.evaluate(() => MED.sel && MED.sel.type === "prop" && !!$('#medSel [data-meda="turn"]')));
  await p.click('#medSel [data-meda="turn"]'); await p.waitForTimeout(100);
  r = await rec(); check("Turn swaps its width and height", r.props[0].w === 2 && r.props[0].h === 1, JSON.stringify(r.props[0]));
  await drag([3.5, 6.5], [6.5, 3.5]);
  r = await rec(); check("dragging moves it", r.props[0].x === 6 && r.props[0].y === 3, JSON.stringify(r.props[0]));
  await p.keyboard.press("Delete"); await p.waitForTimeout(100);
  check("Delete removes it", (await rec()).props.length === 0);
  await p.keyboard.press("Control+z"); await p.waitForTimeout(100);
  check("Ctrl+Z brings it back", (await rec()).props.length === 1);
  await p.keyboard.press("Control+z"); await p.waitForTimeout(100);
  check("undo again puts it back where it was", (await rec()).props[0].x === 3);
  await p.keyboard.press("Control+y"); await p.keyboard.press("Control+y"); await p.waitForTimeout(150);
  check("Ctrl+Y redoes both", (await rec()).props.length === 0);
  // style
  await p.click(".med-style summary");
  await p.evaluate(() => { const i = $("#medWall"); i.value = "#aa0000"; i.dispatchEvent(new Event("change", { bubbles: true })); });
  await p.selectOption("#medGrid", "dots"); await p.selectOption("#medRough", "0"); await p.waitForTimeout(150);
  r = await rec(); check("Style changes are kept with the map", r.look.wall === "#aa0000" && r.look.grid === "dots" && r.look.rough === 0, JSON.stringify(r.look));
  const red = await p.evaluate(() => { const d = currentMap, cv = document.createElement("canvas"); drawDungeon(cv, d, true, { scale: 1 }); const px = cv.getContext("2d").getImageData(2 * CS - 2, TOP + 5 * CS, 4, 1).data; let n = 0; for (let i = 0; i < px.length; i += 4) if (px[i] > 140 && px[i + 1] < 60) n++; return n; });
  check("the walls are drawn in the chosen colour", red > 0, red);
  // every look draws a drawn map, the same each time
  const looks = await p.evaluate(() => { const d = currentMap, out = {}; for (const st of ["parchment", "blue", "dark", "inked", "atlas", "torch"]) { d.rec.style = st; drawnRefresh(d); const a = document.createElement("canvas"), b = document.createElement("canvas"); drawDungeon(a, d, true, { scale: 1 }); d._base = null; drawDungeon(b, d, true, { scale: 1 }); out[st] = a.toDataURL() === b.toDataURL(); } d.rec.style = "parchment"; drawnRefresh(d); return out; });
  check("all six looks draw a drawn map, the same every time", Object.values(looks).length === 6 && Object.values(looks).every(Boolean), JSON.stringify(looks));
  // the players' picture: no DM-only label
  const lab = await p.evaluate(() => { const d = currentMap, txt = []; const orig = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, ...a) { txt.push(String(t)); return orig.call(this, t, ...a); };
    const out = {}; for (const player of [false, true]) { txt.length = 0; d._base = null; drawDungeon(document.createElement("canvas"), d, true, { scale: 1, player }); out[player ? "player" : "dm"] = txt.includes("Secret stash"); } CanvasRenderingContext2D.prototype.fillText = orig; return out; });
  check("a DM-only label is on the DM's map but not the players'", lab.dm && !lab.player, JSON.stringify(lab));
  // fog, Reveal room and the map's squares
  check("Reveal room uncovers the numbered room on a drawn map", await p.evaluate(() => { const d = currentMap, f2 = new Uint8Array(d.W * d.H); fogRevealRoom(d, f2, 3, 3); return f2[3 * d.W + 3] === 1 && f2[3 * d.W + 9] === 1 && !f2[6 * d.W + 18]; }));
  // saving to a campaign and opening it again
  await p.click('[data-meda="done"]'); await p.waitForTimeout(100);
  check("Done closes the editor and keeps the drawing", await p.evaluate(() => !MED.on && $("#medPanel").hidden && currentMap.kind === "drawn"));
  const cid = await p.evaluate(() => { const c = blankCampaign("Edited maps"); Store.save(c); if (typeof campSelectsFill === "function") campSelectsFill(); return c.id; });
  await p.evaluate(cid => { const sel = $("#mapCampaign"); if (![...sel.options].some(o => o.value === cid)) sel.add(new Option("Edited maps", cid)); sel.value = cid; }, cid);
  await p.click("#mapSave"); await p.waitForTimeout(800);
  const saved = await p.evaluate(cid => { const m = Store.get(cid).maps[0]; return m && { kind: m.kind, shapes: m.shapes.length, labels: m.labels.length, look: m.look.wall }; }, cid);
  check("Save to campaign keeps the drawn map", saved && saved.kind === "drawn" && saved.shapes === 5 && saved.labels === 1 && saved.look === "#aa0000", JSON.stringify(saved));
  await p.evaluate(() => { $("#mapSeed").value = "OTHER1"; renderMap(); });
  check("generating a dungeon replaces it", await p.evaluate(() => currentMap.kind !== "drawn"));
  await p.evaluate(cid => mapOpenSaved(Store.get(cid).maps[0]), cid); await p.waitForTimeout(300);
  check("opening the saved map brings back the drawing", await p.evaluate(() => currentMap.kind === "drawn" && currentMap.rec.shapes.length === 5 && currentMap.grid[3 * currentMap.W + 8] === 1 && currentMap.grid[5 * currentMap.W + 5] === 0));
  const vtt = await p.evaluate(() => { const w = mapVttWalls(currentMap); return { n: w.length, ok: w.every(([a, b]) => [a.x, a.y, b.x, b.y].every(Number.isFinite)), key: fogKey(drawnRecord(currentMap)) }; });
  check("a drawn map exports its traced walls for VTTs, and keeps its own fog", vtt.n > 10 && vtt.ok && /^drawn\|/.test(vtt.key), JSON.stringify(vtt));
  // editing a generated dungeon keeps its rooms and furniture
  await p.evaluate(() => { $("#mapSize").value = "medium"; $("#mapSeed").value = "EDIT42"; renderMap(); });
  const before = await p.evaluate(() => ({ rooms: currentMap.rooms.length, floor: currentMap.grid.filter(v => v).length, props: mapDress(currentMap).length, doors: currentMap.doors.length }));
  await p.click("#medEdit"); await p.waitForTimeout(300);
  const after = await p.evaluate(() => ({ rooms: currentMap.rooms.length, floor: currentMap.grid.filter(v => v).length, props: currentMap.rec.props.length, doors: currentMap.doors.length, kind: currentMap.kind }));
  check("Edit map turns a generated dungeon into a drawn map with the same rooms, floor, doors and furniture", after.kind === "drawn" && after.rooms === before.rooms && after.floor === before.floor && after.props === before.props && after.doors === before.doors, JSON.stringify({ before, after }));
  // the drawing survives a refresh
  await p.reload(); await p.waitForFunction(() => typeof medStart === "function"); await p.waitForTimeout(300);
  check("after a refresh, Continue my last drawing is offered and brings it back", await p.evaluate(() => !$("#medResume").hidden));
  await p.click("#medResume"); await p.waitForTimeout(300);
  check("…and it's the same drawing", await p.evaluate(() => currentMap.kind === "drawn" && MED.on && currentMap.rooms.length > 5));
  check("the drawing in progress is in backups", await p.evaluate(() => BACKUP_KEYS.includes("dmforge.mapdraft.v1")));
  // a picture prop
  await tool("pic");
  const png = path.join(os.tmpdir(), "medpic-" + process.pid + ".png");
  fs.writeFileSync(png, Buffer.from(await p.evaluate(() => { const c = document.createElement("canvas"); c.width = 64; c.height = 64; const g = c.getContext("2d"); g.fillStyle = "#3a7"; g.fillRect(0, 0, 64, 64); return c.toDataURL("image/png").split(",")[1]; }), "base64"));
  await p.setInputFiles("#medPicFile", png); await p.waitForFunction(() => !!MED.pic, null, { timeout: 5000 }).catch(() => {});
  await settle(); await click(2.5, 2.5);
  check("Picture: an uploaded picture is placed on the map", await p.evaluate(() => currentMap.rec.props.some(q => q.k === "img" && q.img === MED.pic)));
  fs.unlinkSync(png);
  // phones: the editor fits without sideways scrolling
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(300);
  check("the editor fits a phone without sideways scrolling", await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll map editor checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
