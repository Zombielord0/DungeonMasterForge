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

  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll world map checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
