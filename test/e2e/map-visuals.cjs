// Map visuals: themes, styles, furniture, cave walls, hover, zoom and the player download. Run with:  npm run test:mapvis
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});
// fingerprints of generateDungeon() taken before the visuals work: the same seed must keep giving the same dungeon
const FINGERPRINTS = {"crypt|FOG5":550955431,"crypt|CAVE1":-610202048,"crypt|ABC123":-1771811034,"cavern|FOG5":1438868418,"cavern|CAVE1":-1109029316,"cavern|ABC123":1653602656,"keep|FOG5":-669859186,"keep|CAVE1":1216069482,"keep|ABC123":-1832025694,"sewer|FOG5":-1429912272,"sewer|CAVE1":551191197,"sewer|ABC123":-737074946,"temple|FOG5":306647389,"temple|CAVE1":167793713,"temple|ABC123":1255826821,"mine|FOG5":-229150474,"mine|CAVE1":-290526151,"mine|ABC123":412918736};

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1, acceptDownloads: true, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#map"); await p.waitForFunction(() => typeof generateDungeon === "function");

  const fp = await p.evaluate(() => { const out = {}; for (const th of ["crypt", "cavern", "keep", "sewer", "temple", "mine"]) for (const seed of ["FOG5", "CAVE1", "ABC123"]) { const d = generateDungeon({ name: "T", theme: th, size: "medium", rooms: 10, level: 3, party: 4, seed }); const s = JSON.stringify([d.grid, d.rid, d.doors, d.rooms.map(o => [o.x, o.y, o.w, o.h, o.num, o.type, o.feature, o.content, o.icons, o.enc && o.enc.text])]); let h = 0; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; out[th + "|" + seed] = h; } return out; });
  const diff = Object.keys(FINGERPRINTS).filter(k => fp[k] !== FINGERPRINTS[k]);
  check("every seed still gives exactly the same dungeon", diff.length === 0, diff.join(", "));

  // every theme in every style draws without errors, and styles look different
  const looks = await p.evaluate(() => {
    const out = {};
    for (const style of ["parchment", "blue", "dark"]) for (const th of ["crypt", "cavern", "keep", "sewer", "temple", "mine"]) {
      const d = generateDungeon({ name: "T", theme: th, size: "medium", rooms: 10, level: 3, party: 4, seed: "ABC123" }); d.params.style = style;
      const cv = document.createElement("canvas"); drawDungeon(cv, d, true, { scale: 1 });
      // average colour of the floor of room 2's top-left corner square (avoids lines)
      const o = d.rooms[1], px = cv.getContext("2d").getImageData((o.x + 1) * CS + 2, TOP + (o.y + 1) * CS + 2, CS - 4, CS - 4).data;
      const avg = [0, 0, 0]; for (let i = 0; i < px.length; i += 4) { avg[0] += px[i]; avg[1] += px[i + 1]; avg[2] += px[i + 2]; }
      out[style + "|" + th] = avg.map(v => Math.round(v / (px.length / 4)));
    }
    return out;
  });
  const lum = c => c[0] * .3 + c[1] * .59 + c[2] * .11;
  check("all 18 theme and style pairs draw", Object.keys(looks).length === 18 && errs.length === 0, errs.join(" | "));
  check("Dark style floors are darker than Parchment", ["crypt", "keep", "temple"].every(t => lum(looks["dark|" + t]) < lum(looks["parchment|" + t]) - 40), JSON.stringify(looks));
  check("Classic blue is blue on white", ["crypt", "keep"].every(t => looks["blue|" + t][2] >= looks["blue|" + t][0] && lum(looks["blue|" + t]) > 200));
  const floors = new Set(["crypt", "keep", "sewer", "temple", "mine"].map(t => looks["parchment|" + t].join()));
  check("themes have their own floors in Parchment", floors.size >= 4, [...floors].join(" / "));

  // furniture: deterministic, matched to rooms, and out of the way
  const dress = await p.evaluate(() => {
    const d = generateDungeon({ name: "T", theme: "crypt", size: "medium", rooms: 10, level: 3, party: 4, seed: "FOG5" });
    const a = JSON.stringify(mapDress(d)), b = JSON.stringify(mapDress(d)), list = mapDress(d);
    const bad = [];
    list.forEach(pr => pr.cells.forEach(([x, y]) => {
      const k = y * d.W + x, o = d.rooms.find(r => d.rid[k] === d.rid[r.cy * d.W + r.cx]);
      if (d.grid[k] !== 1) bad.push("not on a room floor " + pr.kind);
      if (o && Math.abs(x - o.cx) <= 1 && Math.abs(y - o.cy) <= 1) bad.push("on the room number " + pr.kind);
      if (d.rooms.some(r => (r.icons || []).some(i => i.x === x && i.y === y))) bad.push("on an icon " + pr.kind);
      if (d.doors.some(dr => Math.abs(dr.x + dr.dx - x) + Math.abs(dr.y + dr.dy - y) <= 1)) bad.push("in a doorway " + pr.kind);
    }));
    return { same: a === b, n: list.length, kinds: [...new Set(list.map(x => x.kind))], bad };
  });
  check("room furniture is the same every time for a seed", dress.same);
  check("rooms get furniture", dress.n >= 5, dress.n);
  check("furniture never covers room numbers, icons or doorways", dress.bad.length === 0, dress.bad.slice(0, 4).join(", "));
  check("crypt furniture suits a crypt", dress.kinds.some(k => ["sarcophagus", "bones", "pillar", "altar"].includes(k)), dress.kinds.join());

  // natural cave walls: cavern outlines aren't stair-steps
  const cave = await p.evaluate(() => {
    const d = generateDungeon({ name: "T", theme: "cavern", size: "medium", rooms: 10, level: 3, party: 4, seed: "CAVE1" }); d.params.style = "parchment";
    const cv = document.createElement("canvas"); drawDungeon(cv, d, false, { scale: 1 }); return !!d._caveSmooth;
  });
  check("cavern walls are drawn as natural outlines", cave);

  // the form: style picker is saved with the map
  await p.selectOption("#mapStyle", "dark");
  check("Style choice goes into the map", await p.evaluate(() => currentMap.params.style === "dark"));
  await p.selectOption("#mapStyle", "parchment");

  // hover a room -> its key entry lights up; click -> the key entry scrolls into view; hover a key entry -> the room is highlighted
  const o = await p.evaluate(() => currentMap.rooms[2]);
  await p.evaluate(() => $("#mapCanvas").scrollIntoView({ block: "end" }));
  const box = await p.locator("#mapCanvas").boundingBox(), geo = await p.evaluate(() => [currentMap.W, currentMap.H]);
  const at = [box.x + (o.cx * 20 + 10) * box.width / (geo[0] * 20), box.y + (46 + o.cy * 20 + 10) * box.height / (geo[1] * 20 + 46)];
  await p.mouse.move(...at); await p.waitForTimeout(100);
  check("hovering a room highlights its key entry", await p.evaluate(n => { const el = document.querySelectorAll("#roomKey .key-room")[n - 1]; return !!el && el.classList.contains("hl"); }, o.num));
  await p.mouse.click(...at); await p.waitForTimeout(700);
  check("clicking a room scrolls to its key entry", await p.evaluate(n => { const r = document.querySelectorAll("#roomKey .key-room")[n - 1].getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }, o.num));
  await p.hover("#roomKey .key-room:nth-child(4)");
  check("hovering a key entry highlights the room", await p.evaluate(() => MAPUI.hover === currentMap.rooms[3].num));

  // zoom
  await p.evaluate(() => scrollTo(0, 0));
  const w0 = await p.evaluate(() => $("#mapCanvas").clientWidth);
  await p.click("#mapZoomIn"); await p.waitForTimeout(150);
  const w1 = await p.evaluate(() => $("#mapCanvas").clientWidth);
  check("Zoom in makes the map bigger", w1 > w0 * 1.3, w0 + " -> " + w1);
  check("zoomed map is drawn sharp, not stretched", await p.evaluate(() => $("#mapCanvas").width >= $("#mapCanvas").clientWidth * 0.99));
  await p.click("#mapFit"); await p.waitForTimeout(150);
  check("Fit puts it back", Math.abs((await p.evaluate(() => $("#mapCanvas").clientWidth)) - w0) < 2);

  // player-safe download
  const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }).catch(() => null), p.click("#mapDownloadPlayer")]);
  check("Download player map saves a picture", !!dl && /-players\.png$/.test(dl.suggestedFilename()), dl && dl.suggestedFilename());

  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll map visual checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
