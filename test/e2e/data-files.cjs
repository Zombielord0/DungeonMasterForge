// The built-in spells, monsters and items load from their own files. Run with:  npm run test:data
// Checks: the files match data/*.json (npm run build:data was run), each tab can read them, the monster list is read once
// and shared, a second visit doesn't download the data again, and the app still has the data with no connection.
// Starts its own static server for public/ that sends the same cache headers as netlify.toml.
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public"), DATA = path.join(__dirname, "..", "..", "data");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/manifest+json" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const hits = {};
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  hits[u.pathname] = (hits[u.pathname] || 0) + 1;
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); return res.end(); }
    const h = { "content-type": TYPES[path.extname(f)] || "application/octet-stream" };
    if (u.pathname.startsWith("/data/")) h["cache-control"] = "public, max-age=31536000, immutable";
    if (u.pathname === "/sw.js") h["cache-control"] = "no-cache";
    res.writeHead(200, h); res.end(b);
  });
});

(async () => {
  // the files are up to date with data/*.json
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const files = [...html.matchAll(/<script src="(\/data\/[\w.]+\.js)"><\/script>/g)].map(m => m[1]);
  check("the page loads three data files", files.length === 3, files.join(", "));
  for (const [name, key] of [["spells", "spellData"], ["monsters", "monsterData"], ["items", "itemData"]]) {
    const f = files.find(x => x.startsWith(`/data/${name}.`)), js = f && fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), "utf8") : "";
    const w = {}; try { new Function("window", js)(w); } catch { }
    const same = w.DMDATA && JSON.stringify(JSON.parse(w.DMDATA[key])) === JSON.stringify(JSON.parse(fs.readFileSync(path.join(DATA, name + ".json"), "utf8")));
    check(`${name}: public${f} matches data/${name}.json (else run npm run build:data)`, !!same);
    check(`${name}: the file name's fingerprint matches its contents`, !!f && f.includes("." + crypto.createHash("sha256").update(js).digest("hex").slice(0, 10) + "."));
    check(`${name}: the service worker keeps it for offline use`, !!f && sw.includes(`"${f}"`));
  }

  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL); await p.waitForFunction(() => typeof generateCharacter === "function");

  // every reader works and the monster list is shared
  const r = await p.evaluate(() => {
    const raw = !!window.DMDATA.spellData && !!window.DMDATA.monsterData && !!window.DMDATA.itemData;
    spLoad(); bsLoad(); itLoad();
    const rand = randMonsters(), idx = mwMonsterIndex([]);
    return {
      raw, spells: SP.data["2014"].length + SP.data["2024"].length, monsters: BS.data["2014"].length + BS.data["2024"].length,
      items: IT.data["2014"].length + IT.data["2024"].length, rand: rand.length, idx: idx.length,
      shared: rand[0] === BS.data["2014"].find(m => m.n === rand[0].n), dropped: !window.DMDATA.spellData && !window.DMDATA.monsterData && !window.DMDATA.itemData,
    };
  });
  check("the data is there before the app starts", r.raw);
  check("spells, monsters and items all load", r.spells > 600 && r.monsters > 600 && r.items > 600, JSON.stringify(r));
  check("random encounters and imports use the same monster list as the Monster Manual", r.shared && r.rand > 100 && r.idx > 300, JSON.stringify(r));
  check("the text copies are dropped once read", r.dropped);
  await p.goto(URL + "#spells"); await p.waitForFunction(() => document.querySelectorAll("#view-spells .sp-row, #view-spells [data-sp], #spList > *").length > 5, null, { timeout: 10000 }).then(() => check("Spells tab lists spells", true), () => check("Spells tab lists spells", false));

  // a second visit doesn't download the data again
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload(); await p.waitForFunction(() => !!navigator.serviceWorker.controller);
  for (const k of Object.keys(hits)) delete hits[k];
  await p.reload(); await p.waitForFunction(() => typeof generateCharacter === "function");
  check("a second visit doesn't download the data files", files.every(f => !hits[f]), JSON.stringify(hits));
  check("…but does fetch the page fresh, so updates show", hits["/"] >= 1, JSON.stringify(hits));

  // with no connection the app still has its data
  await ctx.setOffline(true);
  await p.goto(URL + "#spells").catch(() => {});
  const off = await p.waitForFunction(() => typeof spLoad === "function", null, { timeout: 10000 }).then(() => p.evaluate(() => { spLoad(); bsLoad(); itLoad(); return SP.data["2024"].length > 100 && BS.data["2024"].length > 100 && IT.data["2024"].length > 100; })).catch(e => String(e));
  check("offline: spells, monsters and items still load", off === true, String(off));
  await ctx.setOffline(false);

  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll data file checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
