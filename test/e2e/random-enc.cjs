// Random encounters by environment (Campaign Tracker -> Encounters). Run with:  npm run test:random
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
  await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof newEncounter === "function");

  const r = await p.evaluate(() => {
    const out = { envOk: true, budgetOk: true, bad: [] };
    for (const env of ["forest", "swamp", "urban", "underworld", "arctic"]) for (const [lv, diff] of [[2, "easy"], [5, "medium"], [11, "hard"]]) {
      const e = randomEncounter(makeRng("t", env, lv, diff), env, lv, 4, diff);
      if (!e || !e.groups.length) { out.envOk = false; out.bad.push(env + " none"); continue; }
      const mons = e.groups.map(g => randMonster(g.stat));
      if (!mons.every(m => m && (m.env || []).includes(env))) { out.envOk = false; out.bad.push(env + " wrong place"); }
      const raw = e.groups.reduce((s, g) => s + g.count * xpOf(g.cr), 0), n = e.groups.reduce((s, g) => s + g.count, 0), adj = raw * mult(n), target = partyThr(lv, 4, diff);
      if (adj < target * .4 || adj > target * 1.9) { out.budgetOk = false; out.bad.push(`${env} L${lv} ${diff}: ${Math.round(adj)} vs ${target}`); }
    }
    const a = randomEncounter(makeRng("same"), "forest", 3, 4, "medium"), b = randomEncounter(makeRng("same"), "forest", 3, 4, "medium");
    out.same = JSON.stringify(a) === JSON.stringify(b);
    out.hook = !!a.hook;
    return out;
  });
  check("random monsters come from the chosen environment", r.envOk, r.bad.join("; "));
  check("the fight's difficulty fits the party", r.budgetOk, r.bad.join("; "));
  check("the same roll gives the same fight", r.same);
  check("each fight comes with what the monsters are doing", r.hook);

  // on the page
  await p.click("#newCamp"); await p.waitForTimeout(200);
  await p.evaluate(() => { subTab = "encounters"; renderTracker(); });
  await p.selectOption("#randEnv", "swamp"); await p.selectOption("#randDiff", "hard");
  const n0 = await p.evaluate(() => (curCamp().encounters || []).length);
  await p.click("#randRoll"); await p.waitForTimeout(300);
  const made = await p.evaluate(() => { const c = curCamp(), e = c.encounters[c.encounters.length - 1]; return { n: c.encounters.length, name: e.name, enemies: e.enemies.map(m => [m.stat, m.ac, m.hp]), notes: e.notes }; });
  check("Roll adds an encounter to the campaign", made.n === n0 + 1 && /^Random/.test(made.name), made.name);
  check("its monsters have their real AC and HP", made.enemies.length > 0 && await p.evaluate(en => en.every(([s, ac, hp]) => { const m = randMonster(s); return m && m.ac === ac && m.hp === hp; }), made.enemies));
  check("the encounter notes say what's happening", made.notes.length > 10);
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll random encounter checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
