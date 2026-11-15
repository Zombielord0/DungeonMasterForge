// In-game calendar and weather (Campaign Tracker -> Calendar). Run with:  npm run test:calendar
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
  await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof renderTracker === "function");
  await p.click("#newCamp"); await p.waitForTimeout(200);

  const r = await p.evaluate(() => {
    const out = {};
    out.t1 = calTime(8 * 60); out.t2 = calTime(22 * 60 + 5); out.t3 = calTime(13 * 60 + 30);
    const c = curCamp(); calEnsure(c);
    out.start = [c.cal.day, c.cal.min];
    calAdvance(c, 60 * 20, "Marched"); out.after = [c.cal.day, c.cal.min, c.cal.log[0].text];
    out.weatherSet = !!c.cal.weather && c.cal.weather.day === 2;
    const w1 = calWeather(c.id, 5, "temperate", "spring"), w2 = calWeather(c.id, 5, "temperate", "spring");
    out.same = JSON.stringify(w1) === JSON.stringify(w2);
    const avg = (cl, se) => { let t = 0; for (let d = 1; d <= 120; d++) t += calWeather("x", d, cl, se).f; return t / 120; };
    out.cold = avg("cold", "winter"); out.hot = avg("hot", "summer");
    let eff = 0; for (let d = 1; d <= 300; d++) eff += calWeather("y", d, "temperate", "autumn").effects.length ? 1 : 0; out.someEffects = eff;
    const seasons = [1, 92, 183, 274].map(d => calSeason({ day: d, season: "spring" })); out.seasons = seasons.join();
    return out;
  });
  check("time of day reads plainly", r.t1 === "Morning, 8:00" && r.t2 === "Night, 22:05" && r.t3 === "Midday, 13:30", [r.t1, r.t2, r.t3].join(" | "));
  check("a new calendar starts on day 1 in the morning", r.start.join() === "1,480");
  check("passing 20 hours moves to the next day", r.after[0] === 2 && r.after[1] === 4 * 60 && r.after[2] === "Marched", r.after.join());
  check("a new day brings new weather", r.weatherSet);
  check("weather for a day is the same every time", r.same);
  check("cold winters are colder than hot summers", r.cold < r.hot - 40, `${r.cold} vs ${r.hot}`);
  check("some days have weather that matters in play", r.someEffects > 10 && r.someEffects < 200, r.someEffects);
  check("seasons turn every 91 days", r.seasons === "spring,summer,autumn,winter", r.seasons);

  // the tab
  await p.evaluate(() => { subTab = "calendar"; renderTracker(); });
  check("the Calendar tab shows the day and weather", /Day 2/.test(await p.textContent("#calNow")));
  await p.click('[data-cal="long"]');
  check("Long rest moves the clock 8 hours and logs it", await p.evaluate(() => { const c = curCamp().cal; return c.min === 12 * 60 && /Long rest/.test(c.log[0].text); }));
  await p.fill("#calTravel", "3"); await p.click('[data-cal="travel"]');
  check("Travel moves on the days and logs the trip", await p.evaluate(() => { const c = curCamp().cal; return c.day === 5 && /Travelled 3 days/.test(c.log[0].text); }));
  await p.fill("#calNote", "Met the ferryman"); await p.click('[data-cal="note"]');
  check("notes go into the log", await p.evaluate(() => curCamp().cal.log[0].text === "Met the ferryman"));
  await p.selectOption("#calClimate", "cold");
  check("the climate can be changed", await p.evaluate(() => curCamp().cal.climate === "cold"));
  await p.waitForTimeout(1500);
  check("the calendar is saved with the campaign", await p.evaluate(() => JSON.parse(localStorage.getItem("dmforge.campaigns.v1")).some(c => c.cal && c.cal.day === 5)));
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll calendar checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
