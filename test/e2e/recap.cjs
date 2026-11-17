// Session recaps (Campaign Tracker -> Sessions). Run with:  npm run test:recap
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
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof renderTracker === "function");
  await p.click("#newCamp"); await p.waitForTimeout(200);
  await p.evaluate(() => {
    const c = curCamp();
    const e = newEncounter(null, "Ambush at the ford", 3, [{ name: "Goblin", stat: "Goblin", cr: monCR("Goblin"), count: 4, boss: false }]); e.status = "Done"; e.xpAwarded = true; c.encounters.push(e);
    const e2 = newEncounter(null, "Not fought yet", 3, [{ name: "Ogre", stat: "Ogre", cr: 2, count: 1, boss: false }]); c.encounters.push(e2);
    c.quests.push({ id: "q1", title: "Rescue the miller", status: "Completed", giver: "Old Tam", notes: "" }, { id: "q2", title: "Find the bell", status: "Active", giver: "", notes: "" });
    c.loot.push({ id: "l1", item: "Potion of Healing", holder: "Brom", value: "50 gp", notes: "", givenTo: "Brom" });
    c.chapters.push({ id: "ch1", title: "Chapter 1: The ford", done: true, note: "" });
    calEnsure(c); calAdvance(c, 2 * 1440, null); calLog(c.cal, "Travelled 2 days (light rain)"); calLog(c.cal, "Met the ferryman");
    subTab = "sessions"; Store.save(c); renderTracker();
  });
  const preview = await p.evaluate(() => recapMake(curCamp()).text);
  check("the recap lists the fight that was finished", /Ambush at the ford/.test(preview) && /4 × Goblin/.test(preview));
  check("the recap leaves out fights not yet fought", !/Not fought yet/.test(preview));
  check("the recap lists completed quests and leaves active ones out", /Rescue the miller/.test(preview) && !/Find the bell/.test(preview));
  check("the recap lists loot handed out", /Potion of Healing/.test(preview) && /Brom/.test(preview));
  check("the recap lists chapters finished", /The ford/.test(preview));
  check("the recap includes the calendar's log", /Travelled 2 days/.test(preview) && /Met the ferryman/.test(preview));
  check("the recap says how much time passed", /Day 1 to Day 3|Days 1.3/.test(preview), preview.split("\n")[0]);
  await p.click("#recapBtn"); await p.waitForTimeout(200);
  const s = await p.evaluate(() => curCamp().sessions[0]);
  check("Write a recap logs a new session with the recap", !!s && s.num === 1 && /Ambush at the ford/.test(s.summary), JSON.stringify(s).slice(0, 120));
  await p.click("#recapBtn"); await p.waitForTimeout(200);
  check("a second recap with nothing new says so instead of logging an empty session", (await p.evaluate(() => curCamp().sessions.length)) === 1 && /Nothing new/.test(await p.textContent("#toast")));
  await p.evaluate(() => { const c = curCamp(); c.quests[1].status = "Failed"; Store.save(c); renderTracker(); });
  await p.click("#recapBtn"); await p.waitForTimeout(200);
  const s2 = await p.evaluate(() => curCamp().sessions);
  check("the next recap only has what's new", s2.length === 2 && /Find the bell/.test(s2[0].summary + s2[1].summary) && !(/Ambush/.test(s2.find(x => x.num === 2).summary)));
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll recap checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
