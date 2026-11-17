// The World tab: nested places, Lore links, NPCs by place, the Tracker's place tabs. Run with:  npm run test:world
// Starts its own static server for public/ on a free port; uses the "Use without an account" mode.
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
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
  const open = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: "block", acceptDownloads: true });
    await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept());
    await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof renderWorld === "function" && $("#storeBadge").textContent !== "Connecting…", null, { timeout: 15000 });
    return p;
  };
  const p = await open();
  const ids = await p.evaluate(() => {
    const a = blankCampaign("Alpha"), b = blankCampaign("Beta");
    a.lore.push({ id: "lo1", name: "Ashford", type: "place", tags: ["Location"], desc: "A river town.", sections: [{ t: "Secrets", x: "Smugglers.", dm: true }] });
    a.npcs.push({ id: "n1", name: "Garrick", role: "Innkeeper", attitude: "Friendly", place: "Ashford", notes: "" }, { id: "n2", name: "Mara", role: "Guard", attitude: "Neutral", place: "Ashford", notes: "" }, { id: "n3", name: "Tobin", role: "Farmer", attitude: "Unknown", notes: "" });
    Store.save(a); Store.save(b); return { a: a.id, b: b.id };
  });
  await p.goto(URL + "#world"); await p.waitForTimeout(300);
  let st = await p.evaluate(ids => { const w = W.places.find(x => x.name === "Ashford"), a = Store.get(ids.a); return { n: W.places.length, type: w && w.type, desc: w && w.desc, secs: w && (w.sections || []).length, link: a.lore[0].wpId === (w && w.id), npc: a.npcs.filter(n => n.placeId === (w && w.id)).length }; }, ids);
  check("a Lore place becomes a World place, typed from its text", st.n === 1 && st.type === "town" && st.desc === "A river town." && st.secs === 1 && st.link, JSON.stringify(st));
  check("NPCs whose place names it are linked to it", st.npc === 2, JSON.stringify(st));
  const ash = await p.evaluate(() => W.places[0].id);
  await p.click(`#worldTree [data-w="sel"][data-id="${ash}"]`); await p.waitForTimeout(150);
  check("its page lists its NPCs", (await p.locator("#worldMain .wnpc").allTextContents()).join("|").includes("Garrick"));
  check("Alpha is ticked on its page", await p.locator(`#worldMain [data-wc="${ids.a}"]`).isChecked());

  // a place inside it
  await p.click('#worldMain [data-w="child"]'); await p.waitForTimeout(150);
  await p.locator("#worldMain .title-input").fill("The Gilded Goose"); await p.keyboard.press("Tab"); await p.waitForTimeout(100);
  await p.selectOption('#worldMain [data-wf="type"]', "tavern"); await p.waitForTimeout(100);
  const goose = await p.evaluate(() => W.sel);
  st = await p.evaluate(g => { const x = wp(g); return { name: x.name, type: x.type, parent: wp(x.parent) && wp(x.parent).name }; }, goose);
  check("+ Add a place inside makes a child place", st.name === "The Gilded Goose" && st.type === "tavern" && st.parent === "Ashford", JSON.stringify(st));
  await p.selectOption("#worldMain [data-w-move]", { label: "Garrick (now in Ashford)" }); await p.waitForTimeout(150);
  check("Move an NPC here files Garrick in the tavern", await p.evaluate(g => Store.list().find(c => c.name === "Alpha").npcs.find(n => n.name === "Garrick").placeId === g, goose));
  await p.click(`#worldMain .wcrumb[data-id="${ash}"]`); await p.waitForTimeout(150);
  const page = await p.locator("#worldMain").textContent();
  check("the town's page shows NPCs inside its places too", /In The Gilded Goose/.test(page) && page.includes("Garrick") && page.includes("Mara"), page.slice(0, 300));
  check("the tree counts NPCs inside", (await p.locator(`#worldTree [data-id="${ash}"] .wcount`).textContent()).trim() === "2");

  // tick Beta, edit the description: both campaigns' Lore follow
  await p.locator(`#worldMain label:has([data-wc="${ids.b}"])`).click(); await p.waitForTimeout(150);
  await p.locator('#worldMain [data-wf="desc"]').fill("A busy river town."); await p.locator('#worldMain [data-wf="desc"]').blur(); await p.waitForTimeout(150);
  st = await p.evaluate(ids => [ids.a, ids.b].map(id => (Store.get(id).lore.find(l => l.name === "Ashford") || {}).desc), ids);
  check("ticking Beta adds it to Beta's Lore, and edits reach both", st[0] === "A busy river town." && st[1] === "A busy river town.", JSON.stringify(st));
  // edit in a campaign's Lore: the World and the other campaign follow
  await p.goto(URL + "#tracker"); await p.waitForTimeout(150);
  await p.evaluate(id => { activeId = id; subTab = "lore"; renderTracker(); }, ids.a); await p.waitForTimeout(150);
  await p.locator('.lore-card:has-text("Ashford") [data-lore="edit"]').click(); await p.waitForTimeout(100);
  await p.locator('[data-lf="desc"]').fill("Ashford, rebuilt."); await p.click('[data-lore="save"]'); await p.waitForTimeout(150);
  st = await p.evaluate(ids => ({ w: W.places.find(x => x.name === "Ashford").desc, b: Store.get(ids.b).lore.find(l => l.name === "Ashford").desc }), ids);
  check("a Lore edit updates the World place and the other campaign", st.w === "Ashford, rebuilt." && st.b === "Ashford, rebuilt.", JSON.stringify(st));

  // the Tracker's NPCs tab has the same place tabs, and a place picker
  await p.evaluate(() => { subTab = "npcs"; renderTracker(); }); await p.waitForTimeout(150);
  check("Tracker NPCs has place tabs", await p.locator(`#campMain [data-tntab="${ash}"]`).count() === 1 && await p.locator(`#campMain [data-tntab="-"]`).count() === 1);
  await p.click(`#campMain [data-tntab="${goose}"]`); await p.waitForTimeout(150);
  let names = await p.locator('#campMain [data-list="npcs"][data-key="name"]').evaluateAll(els => els.map(e => e.value));
  check("the tavern's tab shows only Garrick", names.join() === "Garrick", names.join());
  await p.click(`#campMain [data-tntab="${ash}"]`); await p.waitForTimeout(150);
  names = await p.locator('#campMain [data-list="npcs"][data-key="name"]').evaluateAll(els => els.map(e => e.value));
  check("the town's tab includes the tavern's NPCs", names.sort().join() === "Garrick,Mara", names.join());
  await p.click('#campMain [data-add="npcs"]'); await p.waitForTimeout(150);
  check("+ Add NPC on a place tab files the new NPC there", await p.evaluate(a => Store.get(a).npcs.filter(n => n.placeId === wp(TN.tab).id).length === 2, ids.a));
  await p.click('#campMain [data-tntab="-"]'); await p.waitForTimeout(150);
  await p.locator('#campMain [data-npcplace]').first().selectOption(goose); await p.waitForTimeout(150);
  check("the place picker on a Tracker NPC moves it", await p.evaluate(([a, g]) => Store.get(a).npcs.find(n => n.name === "Tobin").placeId === g, [ids.a, goose]));

  // rename: NPC place names follow
  await p.goto(URL + "#world"); await p.waitForTimeout(150);
  await p.click(`#worldTree [data-w="sel"][data-id="${ash}"]`); await p.waitForTimeout(100);
  await p.locator("#worldMain .title-input").fill("Ashford-on-Lune"); await p.keyboard.press("Tab"); await p.waitForTimeout(150);
  st = await p.evaluate(ids => ({ npc: Store.get(ids.a).npcs.find(n => n.name === "Mara").place, lore: Store.get(ids.b).lore[0].name }), ids);
  check("renaming a place renames it in NPCs and Lore", st.npc === "Ashford-on-Lune" && st.lore === "Ashford-on-Lune", JSON.stringify(st));

  // Forge campaign file carries the places and their nesting
  const file = path.join(os.tmpdir(), "dmforge-world-camp.json");
  fs.writeFileSync(file, await p.evaluate(a => JSON.stringify({ ...Store.get(a), extras: campExtras(Store.get(a)) }), ids.a));
  const q = await open();
  await q.setInputFiles("#importFile", file); await q.waitForTimeout(700);
  st = await q.evaluate(() => W.places.map(x => x.name + "<" + (wp(x.parent) ? wp(x.parent).name : "")).sort());
  check("a campaign file brings its World places and nesting", st.join() === "Ashford-on-Lune<,The Gilded Goose<Ashford-on-Lune", JSON.stringify(st));

  // delete the town: the tavern moves up, its NPCs lose the place, Lore entries go
  await p.click('#worldMain [data-w="del"]'); await p.click("#modalYes"); await p.waitForTimeout(200);
  st = await p.evaluate(ids => ({ places: W.places.map(x => x.name + "<" + (x.parent || "")), mara: Store.get(ids.a).npcs.find(n => n.name === "Mara").placeId || "", lore: [ids.a, ids.b].map(id => Store.get(id).lore.length) }), ids);
  check("deleting a place moves what's inside up and clears it from NPCs and Lore", st.places.join() === "The Gilded Goose<" && !st.mara && st.lore.join() === "0,0", JSON.stringify(st));
  check("World is in the backup keys", await p.evaluate(() => BACKUP_KEYS.includes("dmforge.world.v1")));

  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll World checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
