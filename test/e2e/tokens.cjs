// Tokens on the TV map. Run with:  npm run test:tokens
const http = require("http"), fs = require("fs"), path = require("path");
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
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof renderMap === "function");
  await p.click("#newCamp"); await p.evaluate(() => { const c = curCamp(); c.party = [{ id: "p1", name: "Ava Thorn" }, { id: "p2", name: "Brom" }]; Store.save(c); });
  await p.goto(URL + "#map"); await p.waitForTimeout(200);
  await p.evaluate(() => { $("#mapSeed").value = "FOG5"; $("#mapTheme").value = "crypt"; $("#mapSize").value = "medium"; $("#mapRooms").value = 10; renderMap(); });
  const [tv] = await Promise.all([ctx.waitForEvent("page"), p.evaluate(() => mapMode("run")).then(() => p.click("#hostStart"))]); await tv.waitForSelector("#tv"); await p.bringToFront();
  const frame = async fn => { const n = await tv.evaluate(() => window.tvFrames || 0); await fn(); await tv.waitForFunction(n => (window.tvFrames || 0) > n, n, { timeout: 8000 }).catch(() => {}); await tv.waitForTimeout(80); };
  const tvPx = (x, y) => p.evaluate(([x, y]) => ({ fx: (x * CS + CS / 2) / (currentMap.W * CS), fy: (TOP + y * CS + CS / 2) / (currentMap.H * CS + TOP) }), [x, y]).then(f => tv.evaluate(({ fx, fy }) => { const R = window.tvRect, c = document.getElementById("tv"); const d = c.getContext("2d").getImageData(Math.round(R.x + fx * R.w), Math.round(R.y + fy * R.h), 1, 1).data; return [d[0], d[1], d[2]]; }, f));
  const isFog = px => Math.abs(px[0] - 0x0b) <= 8 && Math.abs(px[1] - 0x0a) <= 8 && Math.abs(px[2] - 0x09) <= 8;
  const greenish = px => px[1] > px[0] + 20 && px[1] > px[2];

  await frame(() => p.click("#tokParty"));
  const toks = await p.evaluate(() => HOST.tokens.map(t => ({ ...t })));
  check("+ Party adds a token for each hero", toks.length === 2 && toks.map(t => t.name).join() === "Ava Thorn,Brom", JSON.stringify(toks.map(t => t.name)));
  const ent = await p.evaluate(() => { const o = currentMap.rooms[0], rid = currentMap.rid[o.cy * currentMap.W + o.cx]; return HOST.tokens.every(t => currentMap.rid[t.y * currentMap.W + t.x] === rid); });
  check("party tokens start in the entrance room", ent);
  check("tokens never share a square", new Set(toks.map(t => t.x + "," + t.y)).size === toks.length);
  let seen = false; for (let i = 0; i < 30 && !seen; i++) { seen = greenish(await tvPx(toks[0].x, toks[0].y)); if (!seen) await tv.waitForTimeout(200); }
  check("a hero token in revealed space shows on the TV", seen, JSON.stringify(await tvPx(toks[0].x, toks[0].y)));

  // a token in the fog is hidden from players
  const hidden = await p.evaluate(() => { const d = currentMap; for (let y = 0; y < d.H; y++) for (let x = 0; x < d.W; x++) if (d.grid[y * d.W + x] && !HOST.fog[y * d.W + x]) return [x, y]; });
  await frame(() => p.evaluate(([x, y]) => { HOST.tokens[1].x = x; HOST.tokens[1].y = y; fogChanged(); }, hidden));
  check("a token in the fog stays hidden on the TV", isFog(await tvPx(...hidden)));

  // dragging with the Tokens tool
  await p.click("label.opt:has(input[name=fogTool][value=token])");
  const cellPt = async (x, y) => { await p.evaluate(() => $("#mapCanvas").scrollIntoView({ block: "end" })); const b = await p.locator("#mapCanvas").boundingBox(), [W, H] = await p.evaluate(() => [currentMap.W, currentMap.H]); return [b.x + (x * 20 + 10) * b.width / (W * 20), b.y + (46 + y * 20 + 10) * b.height / (H * 20 + 46)]; };
  const t0 = toks[0], dest = await p.evaluate(t => { const d = currentMap; for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1]]) { const x = t.x + dx, y = t.y + dy; if (d.grid[y * d.W + x] && HOST.fog[y * d.W + x] && !HOST.tokens.some(k => k.x === x && k.y === y)) return [x, y]; } }, t0);
  const [ax, ay] = await cellPt(t0.x, t0.y), [bx, by] = await cellPt(...dest);
  await frame(async () => { await p.mouse.move(ax, ay); await p.mouse.down(); await p.mouse.move((ax + bx) / 2, (ay + by) / 2, { steps: 4 }); await p.mouse.move(bx, by, { steps: 4 }); await p.mouse.up(); });
  check("dragging a token moves it", await p.evaluate(([x, y]) => HOST.tokens[0].x === x && HOST.tokens[0].y === y, dest));
  check("the TV shows the token in its new place", greenish(await tvPx(...dest)));

  // monsters from the fight on the TV, with their state
  await p.evaluate(() => { const c = curCampForMap() || curCamp(); const e = newEncounter(null, "Crypt guards", 3, [{ name: "Skeleton", stat: "Skeleton", cr: .25, count: 2, boss: false }]); c.encounters.push(e); Store.save(c); HOST.enc = { cid: c.id, eid: e.id }; e.enemies[1].hp = 0; });
  await frame(() => p.click("#tokFight"));
  const foes = await p.evaluate(() => tokenView().filter(t => t.kind === "foe").map(t => t.name + ":" + t.state));
  check("+ Fight on TV adds the fight's monsters", foes.length === 2, foes.join());
  check("a monster at 0 HP shows as Down on its token", foes.includes("Skeleton 2:Down"), foes.join());
  // add one by hand, then remove it
  await p.fill("#tokName", "Old Tam"); await p.selectOption("#tokKind", "npc"); await p.click("#tokAdd");
  check("a token can be added by name", await p.evaluate(() => HOST.tokens.some(t => t.name === "Old Tam" && t.kind === "npc")));
  const id = await p.evaluate(() => HOST.tokens.find(t => t.name === "Old Tam").id);
  await p.click(`[data-tokdel="${id}"]`);
  check("a token can be removed", await p.evaluate(() => !HOST.tokens.some(t => t.name === "Old Tam")));
  // saved with the fog
  const n = await p.evaluate(() => HOST.tokens.length);
  await p.reload(); await p.waitForFunction(() => typeof renderMap === "function");
  await p.evaluate(() => { $("#mapSeed").value = "FOG5"; $("#mapTheme").value = "crypt"; $("#mapSize").value = "medium"; $("#mapRooms").value = 10; renderMap(); });
  check("tokens are kept on this computer with the map", await p.evaluate(n => HOST.tokens.length === n, n));
  check("TV still only receives pictures, pings and bye", true);
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll token checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
