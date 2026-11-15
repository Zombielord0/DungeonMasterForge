// Player screen + fog checks. Run with:  npm run test:map
// Starts its own static server for public/ on a free port, so no database or sign-in is needed.
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css" };
const SEED = "FOG5"; // crypt / medium / 10 rooms: has a trap room and a secret door

let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});

// in-page helpers: draw the current map into a scale-1 canvas and read a cell's centre pixel
const PAGE_HELPERS = () => {
  window.__cellPx = (o, x, y) => {
    const cv = document.createElement("canvas"); drawDungeon(cv, currentMap, false, { scale: 1, ...o });
    const p = cv.getContext("2d").getImageData(x * CS + CS / 2, TOP + y * CS + CS / 2, 1, 1).data; return [p[0], p[1], p[2]];
  };
  window.__isFog = px => Math.abs(px[0] - 0x0b) <= 8 && Math.abs(px[1] - 0x0a) <= 8 && Math.abs(px[2] - 0x09) <= 8;
};

async function setMap(page, seed, theme = "crypt") {
  await page.evaluate(([s, t]) => { $("#mapTheme").value = t; $("#mapSize").value = "medium"; $("#mapRooms").value = 10; $("#mapSeed").value = s; renderMap(); }, [seed, theme]);
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const dm = await ctx.newPage(); dm.on("pageerror", e => errs.push("dm: " + e.message));
  await dm.goto(URL + "#map"); await dm.waitForFunction(() => typeof generateDungeon === "function");
  await dm.evaluate(PAGE_HELPERS);
  await setMap(dm, SEED);

  // ---------- Task 1: fog model + player rendering ----------
  const t1 = await dm.evaluate(() => {
    const d = currentMap, n = d.W * d.H, out = {};
    const u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = Math.random() < .4 ? 1 : 0;
    const back = fogDecode(fogEncode(u), n); out.rle = back.length === n && back.every((v, i) => v === u[i]);
    const ridOf = o => d.rid[o.cy * d.W + o.cx];
    const cellsOf = r => { const a = []; for (let i = 0; i < n; i++) if (d.rid[i] === r) a.push(i); return a; };
    const ent = d.rooms[0], boss = d.rooms.find(o => o.marks.includes("boss"));
    const f0 = fogNew(d);
    out.entrance = cellsOf(ridOf(ent)).every(i => f0[i] === 1);
    out.bossHidden = cellsOf(ridOf(boss)).every(i => f0[i] === 0);
    const f1 = new Uint8Array(n);
    out.revealRet = fogRevealRoom(d, f1, boss.cx, boss.cy);
    out.bossAll = cellsOf(ridOf(boss)).every(i => f1[i] === 1);
    out.ring = [[boss.x - 1, boss.y - 1], [boss.x + boss.w, boss.y + boss.h]].every(([x, y]) => f1[y * d.W + x] === 1);
    out.rockRet = fogRevealRoom(d, new Uint8Array(n), 0, 0);
    const all = new Uint8Array(n).fill(1);
    const tr = d.rooms.flatMap(o => o.icons).find(c => c.m === "trap");
    const red = p => p[0] > 120 && p[1] < 80;
    out.trapDM = red(__cellPx({}, tr.x, tr.y));
    out.trapPlayer = red(__cellPx({ player: true, fog: all }, tr.x, tr.y));
    out.bossFog = __isFog(__cellPx({ player: true, fog: f0 }, boss.cx, boss.cy));
    out.entClear = !__isFog(__cellPx({ player: true, fog: f0 }, ent.cx, ent.cy));
    out.key = fogKey(d.params) === `gen|${d.params.seed}|crypt|medium|10`;
    return out;
  });
  check("fog run-length encoding round-trips", t1.rle);
  check("new fog reveals the entrance room", t1.entrance);
  check("new fog hides the boss room", t1.bossHidden);
  check("reveal room returns true on a room cell", t1.revealRet === true);
  check("reveal room reveals all of the room's cells", t1.bossAll);
  check("reveal room reveals a 1-cell ring for walls", t1.ring);
  check("reveal room on rock returns false", t1.rockRet === false);
  check("DM view draws the trap icon", t1.trapDM);
  check("player view never draws traps", !t1.trapPlayer);
  check("player view covers fogged rooms in solid fog", t1.bossFog);
  check("player view shows revealed rooms", t1.entClear);
  check("fogKey format", t1.key);

  // ---------- Task 2: player screen window ----------
  // an observer page on the same site records everything sent to the TV
  const obs = await ctx.newPage(); await obs.goto(URL + "observer-404");
  await obs.evaluate(() => { window.__msgs = []; new BroadcastChannel("dmforge.map").onmessage = e => window.__msgs.push(e.data); });
  // fraction position of a room centre inside the whole map picture
  const frac = (o) => dm.evaluate(([cx, cy]) => ({ fx: (cx * CS + CS / 2) / (currentMap.W * CS), fy: (TOP + cy * CS + CS / 2) / (currentMap.H * CS + TOP) }), [o.cx, o.cy]);
  const rooms = await dm.evaluate(() => ({ ent: currentMap.rooms[0], boss: currentMap.rooms.find(o => o.marks.includes("boss")) }));
  const [tv] = await Promise.all([ctx.waitForEvent("page"), dm.click("#hostStart")]);
  tv.on("pageerror", e => errs.push("tv: " + e.message));
  await tv.waitForSelector("#tv");
  const frameIn = (p, ms = 3000) => p.waitForFunction(() => window.tvRect, null, { timeout: ms }).then(() => true, () => false);
  check("TV receives a picture", await frameIn(tv, 8000));
  await tv.waitForTimeout(300);
  const tvPx = async (o) => { const f = await frac(o); return tv.evaluate(({ fx, fy }) => { const R = window.tvRect, c = document.getElementById("tv"); const p = c.getContext("2d").getImageData(Math.round(R.x + fx * R.w), Math.round(R.y + fy * R.h), 1, 1).data; return [p[0], p[1], p[2]]; }, f); };
  const isFog = px => Math.abs(px[0] - 0x0b) <= 8 && Math.abs(px[1] - 0x0a) <= 8 && Math.abs(px[2] - 0x09) <= 8;
  check("TV shows the entrance", !isFog(await tvPx(rooms.ent)));
  check("TV hides the boss room", isFog(await tvPx(rooms.boss)));
  const msgsOk = await obs.evaluate(() => window.__msgs.length > 0) && await obs.evaluate(() => window.__msgs.every(m => Object.keys(m).every(k => ["t", "blob", "x", "y"].includes(k)) && ["frame", "ping", "bye"].includes(m.t) && (m.t !== "frame" || m.blob instanceof Blob)));
  check("TV only ever receives pictures, pings and bye", msgsOk);
  check("DM sees 'TV connected'", /TV connected/.test(await dm.textContent("#hostStatus")));
  await tv.reload(); await tv.waitForSelector("#tv");
  check("reloaded TV gets the picture again", await frameIn(tv, 8000));

  // ---------- Task 3: fog tools, ping, saving ----------
  await dm.bringToFront(); // the DM's window is the one in front during play
  const geo = await dm.evaluate(() => ({ W: currentMap.W, H: currentMap.H }));
  const cellPt = async (x, y) => { await dm.evaluate(() => $("#mapCanvas").scrollIntoView({ block: "end" })); const b = await dm.locator("#mapCanvas").boundingBox(); return [b.x + (x * 20 + 10) * b.width / (geo.W * 20), b.y + (46 + y * 20 + 10) * b.height / (geo.H * 20 + 46)]; };
  const clickCell = async (x, y, mods = []) => { const [px, py] = await cellPt(x, y); for (const k of mods) await dm.keyboard.down(k); await dm.mouse.click(px, py); for (const k of mods) await dm.keyboard.up(k); };
  const dragCells = async (a, b) => { const [x1, y1] = await cellPt(...a), [x2, y2] = await cellPt(...b); await dm.mouse.move(x1, y1); await dm.mouse.down(); await dm.mouse.move((x1 + x2) / 2, (y1 + y2) / 2, { steps: 4 }); await dm.mouse.move(x2, y2, { steps: 4 }); await dm.mouse.up(); };
  const tool = v => dm.click(`label.opt:has(input[name=fogTool][value=${v}])`);
  const mode = v => dm.click(`label.opt:has(input[name=fogVal][value=${v}])`);
  // run a DM action, then wait for the TV to draw the next picture (or a short pause if the action sends none)
  const settle = async () => { await dm.waitForTimeout(150); };
  const act = async fn => { const n = await tv.evaluate(() => window.tvFrames); await fn(); await tv.waitForFunction(n => window.tvFrames > n, n, { timeout: 8000 }).catch(() => {}); await tv.waitForTimeout(50); };
  const fogAt = (x, y) => dm.evaluate(([x, y]) => HOST.fog[y * currentMap.W + x], [x, y]);

  await tool("room"); await mode("reveal");
  await act(() => clickCell(rooms.boss.cx, rooms.boss.cy));
  check("Room tool reveals the clicked room on the TV", !isFog(await tvPx(rooms.boss)));
  await act(() => dm.click("#fogUndo"));
  check("Undo hides it again", isFog(await tvPx(rooms.boss)));

  const corr = await dm.evaluate(() => { const d = currentMap; for (let i = 0; i < d.W * d.H; i++) if (d.grid[i] === 2 && !HOST.fog[i]) { const x = i % d.W; return [x, (i - x) / d.W]; } });
  await tool("brush"); await dm.selectOption("#fogSize", "3");
  await dragCells(corr, corr); await settle();
  check("Brush reveals the painted squares", (await fogAt(...corr)) === 1 && (await fogAt(corr[0] + 1, corr[1] + 1)) === 1);

  await tool("box"); await mode("hide");
  const e = rooms.ent; await act(() => dragCells([e.x - 1, e.y - 1], [e.x + e.w, e.y + e.h]));
  check("Box tool hides the dragged area", await dm.evaluate(o => { for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (HOST.fog[y * currentMap.W + x]) return false; return true; }, e));
  check("TV shows the box-hidden entrance as fog", isFog(await tvPx(rooms.ent)));

  await dm.click("#fogAll"); check("Reveal all", await dm.evaluate(() => HOST.fog.every(v => v === 1)));
  await dm.click("#fogNone"); check("Hide all", await dm.evaluate(() => HOST.fog.every(v => v === 0)));

  await tool("room"); await mode("reveal");
  const before = await dm.evaluate(() => fogEncode(HOST.fog));
  await dm.evaluate(() => $("#mapCanvas").scrollIntoView({ block: "end" })); const cb = await dm.locator("#mapCanvas").boundingBox(); await dm.mouse.click(cb.x + 5, cb.y + 5);
  check("clicking the header changes nothing", before === await dm.evaluate(() => fogEncode(HOST.fog)));

  const sd = await dm.evaluate(() => { const s = currentMap.doors.find(d => d.secret); return [s.x, s.y]; });
  await tool("secret"); await clickCell(...sd);
  check("Secret door mode marks the door found", await dm.evaluate(k => HOST.found.has(k), sd.join(",")));

  const nPing = await obs.evaluate(() => window.__msgs.filter(m => m.t === "ping").length);
  await clickCell(rooms.ent.cx, rooms.ent.cy, ["Shift"]); await settle();
  check("Shift+click pings the TV", await obs.evaluate(n => window.__msgs.filter(m => m.t === "ping").length > n, nPing));
  check("TV still only receives pictures, pings and bye", await obs.evaluate(() => window.__msgs.every(m => Object.keys(m).every(k => ["t", "blob", "x", "y"].includes(k)) && ["frame", "ping", "bye"].includes(m.t))));

  // found secret doors look different to the DM (green S), and Undo covers secret-door clicks
  const greenNear = () => dm.evaluate(([x, y]) => {
    const cv = document.createElement("canvas"); drawDungeon(cv, currentMap, false, { scale: 1, fog: HOST.fog, found: HOST.found }); // as drawMapDM does
    const D = currentMap.doors.find(o => o.x === x && o.y === y), ex = D.dx > 0 ? (x + 1) * CS : D.dx < 0 ? x * CS : x * CS + CS / 2, ey = TOP + (D.dy > 0 ? (y + 1) * CS : D.dy < 0 ? y * CS : y * CS + CS / 2);
    const px = cv.getContext("2d").getImageData(ex - 8, ey - 8, 16, 16).data;
    for (let i = 0; i < px.length; i += 4) if (px[i + 1] > px[i] + 25 && px[i + 1] > px[i + 2] + 25) return true; return false;
  }, sd);
  check("DM view shows a found secret door in green", await greenNear());
  await dm.click("#fogUndo");
  check("Undo un-finds the secret door", await dm.evaluate(k => !HOST.found.has(k), sd.join(",")));
  check("DM view shows an unfound secret door without green", !(await greenNear()));
  await tool("secret"); await clickCell(...sd); // found again, for the reload check below

  // keyboard-friendly reveal buttons in the Room Key
  const bossN = rooms.boss.num;
  const keyBtn = `#roomKey [data-fogroom="${bossN}"]`;
  check("Room Key has a Reveal on TV button per room", (await dm.$$eval("#roomKey [data-fogroom]", b => b.length)) === (await dm.evaluate(() => currentMap.rooms.length)));
  await dm.click(keyBtn, { force: false });
  check("Room Key button reveals the room", (await fogAt(rooms.boss.cx, rooms.boss.cy)) === 1);
  check("Room Key button then offers Hide on TV", /Hide on TV/.test(await dm.textContent(keyBtn)));
  await dm.click(keyBtn);
  check("Room Key button hides it again", (await fogAt(rooms.boss.cx, rooms.boss.cy)) === 0);

  // persistence: reveal the boss room, reload, same seed -> fog comes back
  await tool("room"); await clickCell(rooms.boss.cx, rooms.boss.cy); await settle();
  await dm.reload(); await dm.waitForFunction(() => typeof generateDungeon === "function"); await dm.evaluate(PAGE_HELPERS);
  await setMap(dm, SEED);
  check("fog survives a page reload", (await fogAt(rooms.boss.cx, rooms.boss.cy)) === 1 && (await dm.evaluate(sd => HOST.found.has(sd), sd.join(","))));

  // saving to a campaign keeps the fog, even after the local copy is gone
  await dm.goto(URL + "#tracker"); await dm.click("#newCamp"); await dm.goto(URL + "#map"); await dm.waitForFunction(() => typeof generateDungeon === "function");
  await setMap(dm, SEED); await dm.click("#mapSave");
  const saved = await dm.evaluate(() => [...Store.cache.values()].flatMap(c => c.maps || [])[0]);
  check("saved map entry carries the fog", !!(saved && saved.fog && saved.found && saved.found.length));
  await setMap(dm, "OTHER1");
  await dm.evaluate(m => { localStorage.removeItem("dmforge.fog.v1"); mapOpenSaved(m); }, saved);
  check("opening a saved map restores its fog", (await fogAt(rooms.boss.cx, rooms.boss.cy)) === 1);

  // caverns have no doors and ragged rooms
  await setMap(dm, "CAVE1", "cavern");
  check("cavern: Room reveal uncovers the whole ragged room", await dm.evaluate(() => { const d = currentMap, f = new Uint8Array(d.W * d.H), o = d.rooms[2]; fogRevealRoom(d, f, o.cx, o.cy); const r = d.rid[o.cy * d.W + o.cx]; for (let i = 0; i < f.length; i++) if (d.rid[i] === r && !f[i]) return false; return true; }));

  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll map checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
