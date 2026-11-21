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
  const encounterId = await p.evaluate(() => {
    const c = curCamp();
    const fight = c.encounters.find(e => e.status === "Planned");
    fight.status = "Active";
    fight.round = 2;
    c.maps.push({ ...readMapForm(), id: "session-map", name: "The Ford" });
    c.npcs.push({ id: "session-npc", name: "Old Tam", notes: "Knows the crossing." });
    c.lore.push({ id: "session-lore", name: "The Bell", desc: "Beneath the ford." });
    Store.save(c);
    renderTracker();
    return fight.id;
  });
  await p.click('[data-sub="session"]');
  const dashboard = p.locator(".session-dashboard");
  await dashboard.getByText("Session 2", { exact: true }).click();
  check("dashboard shows the latest recap", (await dashboard.getByText(/Find the bell/).isVisible()));
  await dashboard.locator('[data-session-pin="maps"]').selectOption("session-map");
  await dashboard.locator('[data-session-pin="npcs"]').selectOption("session-npc");
  await dashboard.locator('[data-session-pin="lore"]').selectOption("session-lore");
  await p.waitForFunction(() => Store.lsRead().some(c => c.sessionPins?.lore === "session-lore"));
  await p.reload();
  await p.locator('[data-sub="session"]').dispatchEvent("click");
  check("dashboard remembers its pins", await dashboard.locator('[data-openmap="session-map"]').isVisible()
    && await dashboard.locator('[data-session-pin="npcs"]').inputValue() === "session-npc"
    && await dashboard.locator('[data-session-pin="lore"]').inputValue() === "session-lore");
  await dashboard.getByRole("button", { name: "Open map" }).dispatchEvent("click");
  check("dashboard opens the pinned map", await p.locator("#mapName").inputValue() === "The Ford");
  await p.evaluate(() => { location.hash = "tracker"; });
  await dashboard.getByRole("button", { name: "Resume encounter" }).dispatchEvent("click");
  check("dashboard resumes the existing fight", await p.locator(`#enc-${encounterId}`).isVisible()
    && await p.evaluate(id => curCamp().encounters.find(e => e.id === id).round, encounterId) === 2);
  await p.evaluate(id => {
    const c = curCamp(), e = c.encounters.find(x => x.id === id);
    e.mapId = "session-map";
    e.enemies[0].hp = 1;
    e.enemies[0].init = 17;
    e.enemies[0].cond = "Prone";
    renderTracker();
  }, encounterId);
  await p.locator(`#enc-${encounterId} [data-ea="saveTemplate"]`).dispatchEvent("click");
  await p.locator('[data-ea="startTemplate"]').dispatchEvent("click");
  const template = await p.evaluate(() => {
    const c = curCamp(), fresh = c.encounters.at(-1), first = c.encounters.find(e => e.name === fresh.name);
    const m = fresh.enemies[0];
    return fresh.id !== first.id && fresh.round === 0 && fresh.mapId === "session-map"
      && m.id !== first.enemies[0].id && m.hp === m.max && m.init === 17 && m.cond === "" && first.enemies[0].hp === 1;
  });
  check("templates start an independent fight with its map and initiative", template);

  await p.evaluate(async () => {
    const c = curCamp(), canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const image = await canvasBlob(canvas);
    await MAPIMG.put("template-test-image", image);
    await MAPIMG.put("unrelated-test-image", image);
    c.npcs[0].img = "template-test-image";
    c.maps.push({ id: "imported-map", kind: "image", imgId: "template-test-image", name: "Uploaded map" });
  });
  const downloadPromise = p.waitForEvent("download");
  await p.locator("#exportCamp").dispatchEvent("click");
  const exported = fs.readFileSync(await (await downloadPromise).path());
  const payload = JSON.parse(exported);
  check("export includes only pictures referenced by the campaign", Object.keys(payload.pictures).join() === "template-test-image");
  await p.locator("#importFile").setInputFiles({ name: "campaign.json", mimeType: "application/json", buffer: exported });
  await p.waitForFunction(() => Store.list().length === 2 && !!curCamp().npcs[0].img);
  const picturesRestored = await p.evaluate(async () => {
    const c = curCamp(), img = c.npcs[0].img;
    return img !== "template-test-image" && c.maps.find(m => m.id === "imported-map").imgId === img
      && !!await MAPIMG.get(img) && !!await MAPIMG.get("template-test-image");
  });
  check("campaign import restores its map and portrait without overwriting originals", picturesRestored);
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll recap checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
