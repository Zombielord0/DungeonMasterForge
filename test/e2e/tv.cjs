// TV extras: initiative and handouts on the player screen. Run with:  npm run test:tv
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

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const dm = await ctx.newPage(); dm.on("pageerror", e => errs.push("dm: " + e.message));
  await dm.goto(URL + "#tracker"); await dm.waitForFunction(() => typeof hostStart === "function");
  await dm.click("#newCamp"); await dm.waitForTimeout(300);
  const eid = await dm.evaluate(() => {
    const c = curCamp(); const e = newEncounter(null, "Goblin ambush", 3, [{ name: "Goblin", stat: "Goblin", cr: monCR("Goblin"), count: 3, boss: false }]);
    c.encounters = c.encounters || []; c.encounters.push(e); subTab = "encounters"; Store.save(c); renderTracker(); return e.id;
  });
  const obs = await ctx.newPage(); await obs.goto(URL + "observer-404");
  await obs.evaluate(() => { window.__msgs = []; new BroadcastChannel("dmforge.map").onmessage = e => window.__msgs.push(e.data); });

  // ---------- what the TV may know about a fight ----------
  const rows = await dm.evaluate(id => {
    const c = curCamp(), e = findEnc(c, id); e.enemies.forEach((m, i) => m.init = 20 - i); e.round = 2; e.turn = e.enemies[0].id;
    e.enemies[0].hp = Math.floor(e.enemies[0].max / 2); e.enemies[1].hp = 0;
    return tvInitRows(c, e);
  }, eid);
  check("TV turn order lists everyone with initiative", rows.length === 3);
  check("TV turn order marks whose turn it is", rows[0].cur === true && rows.filter(r => r.cur).length === 1);
  check("a monster at half HP shows as Bloodied", rows[0].state === "Bloodied");
  check("a monster at 0 HP shows as Down", rows[1].state === "Down");
  check("an unhurt monster shows no state", rows[2].state === "");
  check("TV rows carry no HP numbers", rows.every(r => Object.keys(r).sort().join() === "cur,foe,name,state"));

  // ---------- show the fight on the TV ----------
  await dm.evaluate(() => renderTracker());
  const tvBtn = `[data-ea="tv"][data-eid="${eid}"]`;
  const [tv] = await Promise.all([ctx.waitForEvent("page"), dm.click(tvBtn)]);
  tv.on("pageerror", e => errs.push("tv: " + e.message));
  await tv.waitForSelector("#tv");
  const frames = () => tv.evaluate(() => window.tvFrames || 0);
  const waitFrame = async (n, ms = 8000) => tv.waitForFunction(n => (window.tvFrames || 0) > n, n, { timeout: ms }).then(() => true, () => false);
  await dm.bringToFront();
  check("Show on TV starts the player screen and sends the fight", await waitFrame(0));
  check("the encounter is marked as on the TV", await dm.evaluate(id => HOST.enc && HOST.enc.eid === id, eid));
  await dm.waitForTimeout(200);
  check("the button now offers to take it off the TV", /Off TV/.test(await dm.textContent(tvBtn)));
  let n = await frames(); await dm.click(`[data-ea="next"][data-eid="${eid}"]`);
  check("Next turn updates the TV", await waitFrame(n));
  n = await frames(); await dm.click(tvBtn);
  check("Off TV sends a picture without the fight", await waitFrame(n) && await dm.evaluate(() => !HOST.enc));

  // ---------- handouts ----------
  await dm.goto(URL + "#map"); await dm.waitForFunction(() => typeof hostStart === "function");
  await dm.evaluate(() => renderMap());
  // switching tabs doesn't reload the page, so the player screen is still being hosted
  check("hosting carries on when moving to the map tab", await dm.evaluate(() => HOST.on)); await dm.bringToFront();
  const png = path.join(os.tmpdir(), "forge-handout.png");
  fs.writeFileSync(png, Buffer.from(await dm.evaluate(() => { const c = document.createElement("canvas"); c.width = 400; c.height = 800; const g = c.getContext("2d"); g.fillStyle = "#3a6"; g.fillRect(0, 0, 400, 800); return c.toDataURL("image/png").split(",")[1]; }), "base64"));
  n = await frames(); await dm.setInputFiles("#handoutFile", png);
  check("a picture handout goes to the TV", await waitFrame(n));
  const portrait = await tv.waitForFunction(() => {
    const rect = window.tvRect;
    return rect && Math.abs(rect.w / rect.h - 0.5) < 0.02;
  }, null, { timeout: 5000, polling: 50 }).then(() => true, () => false);
  const ar = await tv.evaluate(() => window.tvRect.w / window.tvRect.h);
  check("the TV shows the picture's own shape", portrait, ar);
  check("the DM sees that a handout is showing", await dm.evaluate(() => HOST.show === "handout") && await dm.isVisible("#handoutBack"));
  n = await frames(); await dm.click("#handoutBack");
  check("Back to map returns the TV to the map", await waitFrame(n) && await dm.evaluate(() => HOST.show === "map"));
  await dm.fill("#handoutText", "To whoever finds this: the vault key lies beneath the third statue."); await dm.fill("#handoutTitle", "A torn letter");
  n = await frames(); await dm.click("#handoutTextShow");
  check("a written handout goes to the TV", await waitFrame(n) && await dm.evaluate(() => HOST.show === "handout"));
  n = await frames(); await dm.click("#handoutBack"); await waitFrame(n);

  check("TV still only receives pictures, pings and bye", await obs.evaluate(() => window.__msgs.length > 0 && window.__msgs.every(m => Object.keys(m).every(k => ["t", "blob", "x", "y"].includes(k)) && ["frame", "ping", "bye"].includes(m.t))));
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll TV checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
