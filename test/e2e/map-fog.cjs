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
  check("TV receives a picture", await frameIn(tv));
  await tv.waitForTimeout(300);
  const tvPx = async (o) => { const f = await frac(o); return tv.evaluate(({ fx, fy }) => { const R = window.tvRect, c = document.getElementById("tv"); const p = c.getContext("2d").getImageData(Math.round(R.x + fx * R.w), Math.round(R.y + fy * R.h), 1, 1).data; return [p[0], p[1], p[2]]; }, f); };
  const isFog = px => Math.abs(px[0] - 0x0b) <= 8 && Math.abs(px[1] - 0x0a) <= 8 && Math.abs(px[2] - 0x09) <= 8;
  check("TV shows the entrance", !isFog(await tvPx(rooms.ent)));
  check("TV hides the boss room", isFog(await tvPx(rooms.boss)));
  const msgsOk = await obs.evaluate(() => window.__msgs.length > 0) && await obs.evaluate(() => window.__msgs.every(m => Object.keys(m).every(k => ["t", "blob", "x", "y"].includes(k)) && ["frame", "ping", "bye"].includes(m.t) && (m.t !== "frame" || m.blob instanceof Blob)));
  check("TV only ever receives pictures, pings and bye", msgsOk);
  check("DM sees 'TV connected'", /TV connected/.test(await dm.textContent("#hostStatus")));
  await tv.reload(); await tv.waitForSelector("#tv");
  check("reloaded TV gets the picture again within 2 s", await frameIn(tv, 2000));

  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll map checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
