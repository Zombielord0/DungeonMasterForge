// Map rooms -> campaign encounters ("Run this fight"). Run with:  npm run test:mapenc
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
(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof renderMap === "function");
  await p.click("#newCamp"); await p.goto(URL + "#map"); await p.waitForTimeout(300);
  await p.evaluate(() => { $("#mapSeed").value = "FOG5"; renderMap(); });
  const info = await p.evaluate(() => { const i = currentMap.rooms.findIndex(o => o.enc); return { i, n: currentMap.rooms.filter(o => o.enc).length, btns: document.querySelectorAll("#roomKey [data-runenc]").length, room: currentMap.rooms[i] }; });
  check("every room with a fight has a Run this fight button", info.n > 0 && info.btns === info.n, `${info.btns} vs ${info.n}`);
  await p.click(`#roomKey [data-runenc="${info.i}"]`);
  const e = await p.evaluate(() => { const c = curCampForMap(), e = c && c.encounters[c.encounters.length - 1]; return e && { name: e.name, n: e.enemies.length, kind: e.kind }; });
  check("it adds the fight to the campaign's encounters", !!e && e.kind === "map" && e.n > 0 && e.name.includes(info.room.type), JSON.stringify(e));
  // with the TV on: the room is revealed and the turn order goes to the TV
  const [tv] = await Promise.all([ctx.waitForEvent("page"), p.click("#hostStart")]); await tv.waitForSelector("#tv"); await p.bringToFront();
  await p.click(`#roomKey [data-runenc="${info.i}"]`); await p.waitForTimeout(300);
  check("while hosting, the room is revealed on the TV", await p.evaluate(o => HOST.fog[o.cy * currentMap.W + o.cx] === 1, info.room));
  check("while hosting, the fight's turn order goes to the TV", await p.evaluate(() => !!HOST.enc));
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll map encounter checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
