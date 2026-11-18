// Lore entries saved as an Item, Monster or Encounter also land on their tabs; list groups and sheet sections fold.
// Run with:  npm run test:lorelink
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webp": "image/webp" };
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
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof renderTracker === "function");
  await p.evaluate(() => {
    const c = blankCampaign("Link Test");
    IT.custom.push({ ...ciRecord({ ...ciNew(), n: "Old Lantern" }) }); itPersist();
    Store.save(c); activeId = c.id; subTab = "lore"; renderTracker();
  });
  await p.waitForTimeout(300);
  const add = async (name, type, desc, secs = []) => {
    await p.click('[data-lore="add"]'); await p.waitForTimeout(150);
    await p.fill('[data-lf="name"]', name); await p.selectOption('[data-lf="type"]', type); await p.fill('[data-lf="desc"]', desc);
    for (let i = 0; i < secs.length; i++) {
      await p.click('[data-lore="secadd"]'); await p.waitForTimeout(100);
      await p.fill(`[data-ls="t"][data-i="${i}"]`, secs[i][0]); await p.fill(`[data-ls="x"][data-i="${i}"]`, secs[i][1]);
      if (secs[i][2]) await p.check(`[data-ls="dm"][data-i="${i}"]`);
    }
    await p.click('[data-lore="save"]'); await p.waitForTimeout(300);
  };
  // an item
  await add("Ring of Ember Ward", "item", "A rare ring. Requires attunement.", [["Secret", "Forged by the lich.", true]]);
  let it = await p.evaluate(() => IT.custom.find(x => x.n === "Ring of Ember Ward"));
  check("a Lore item is added to Items → Custom", it && it.cat === "Ring" && it.r === "Rare" && it.att === "Required", JSON.stringify(it));
  check("DM-only sections stay out of the item's text", it && /rare ring/i.test(it.d) && !/lich/.test(it.d), it && it.d);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("dmforge.items.v1")).list.some(x => x.n === "Ring of Ember Ward"));
  check("the item is saved in the browser", saved);
  // editing the entry updates the same item, not a second one
  const lid = await p.evaluate(() => curCamp().lore.find(x => x.name === "Ring of Ember Ward").id);
  await p.click(`[data-lore="edit"][data-id="${lid}"]`); await p.waitForTimeout(150);
  await p.fill('[data-lf="name"]', "Ring of Ember Guard"); await p.click('[data-lore="save"]'); await p.waitForTimeout(300);
  const rings = await p.evaluate(() => IT.custom.filter(x => /^Ring of Ember/.test(x.n)).map(x => x.n));
  check("editing the Lore entry renames the same item", JSON.stringify(rings) === '["Ring of Ember Guard"]', JSON.stringify(rings));
  // a name that's already a custom item, or a built-in one, isn't added twice
  await add("Old Lantern", "item", "Dusty.");
  await add("Bag of Holding", "item", "The party's bag.");
  const dupes = await p.evaluate(() => [IT.custom.filter(x => x.n === "Old Lantern").length, IT.custom.filter(x => x.n === "Bag of Holding").length]);
  check("same-named custom or built-in items aren't duplicated", JSON.stringify(dupes) === "[1,0]", JSON.stringify(dupes));
  // once edited in the Items builder, the Lore leaves the item alone
  await p.evaluate(() => { const x = IT.custom.find(y => y.n === "Ring of Ember Guard"); IT.draft = { ...JSON.parse(JSON.stringify(x.draft)), n: "My Ring" }; ciSave(); });
  await p.click(`[data-lore="edit"][data-id="${lid}"]`); await p.waitForTimeout(150);
  await p.fill('[data-lf="desc"]', "Changed."); await p.click('[data-lore="save"]'); await p.waitForTimeout(300);
  const after = await p.evaluate(() => IT.custom.filter(x => /Ring/.test(x.n)).map(x => x.n));
  check("an item changed in the Items builder isn't touched again", JSON.stringify(after) === '["My Ring"]', JSON.stringify(after));
  // a monster, with a stat block
  await add("Ash Wight", "monster", "Medium undead, neutral evil\nArmor Class 14 (studded leather)\nHit Points 45 (6d8 + 18)\nSpeed 30 ft.\nSTR 15 DEX 14 CON 16 INT 10 WIS 13 CHA 15\nChallenge 3");
  const mon = await p.evaluate(() => MB.lib.find(x => x.name === "Ash Wight"));
  check("a Lore monster is added to My monsters with its numbers", mon && mon.ac === 14 && mon.hp === 45 && !mon.needsStats && mon.cr === 3, JSON.stringify(mon && { ac: mon.ac, hp: mon.hp, cr: mon.cr, n: mon.needsStats }));
  const inMM = await p.evaluate(() => JSON.parse(localStorage.getItem("dmforge.mymonsters.v1")).some(x => x.name === "Ash Wight"));
  check("the monster is saved in the browser", inMM);
  await add("Fog Thing", "monster", "Nobody knows.");
  const fog = await p.evaluate(() => MB.lib.find(x => x.name === "Fog Thing"));
  check("a monster without a stat block is marked as needing stats", fog && fog.needsStats);
  // an encounter
  await add("Ambush at the Ford", "encounter", "Three goblins and an Ash Wight wait in the reeds.");
  const enc = await p.evaluate(() => curCamp().encounters.find(e => e.name === "Ambush at the Ford"));
  const names = enc ? enc.enemies.map(m => m.stat || m.name) : [];
  check("a Lore encounter is added to the Encounters tab with the monsters it names", enc && names.filter(n => /goblin/i.test(n)).length === 3 && names.some(n => /Ash Wight/.test(n)), JSON.stringify(names));
  const eid = await p.evaluate(() => curCamp().lore.find(x => x.name === "Ambush at the Ford").id);
  await p.click(`[data-lore="edit"][data-id="${eid}"]`); await p.waitForTimeout(150);
  await p.fill('[data-lf="name"]', "Ambush at the Old Ford"); await p.click('[data-lore="save"]'); await p.waitForTimeout(300);
  const encs = await p.evaluate(() => curCamp().encounters.map(e => e.name));
  check("editing the encounter entry renames the same encounter", JSON.stringify(encs) === '["Ambush at the Old Ford"]', JSON.stringify(encs));
  // other types don't make anything
  const before = await p.evaluate(() => [IT.custom.length, MB.lib.length, curCamp().encounters.length]);
  await add("Prophecy", "other", "A rare ring of goblins.");
  const after2 = await p.evaluate(() => [IT.custom.length, MB.lib.length, curCamp().encounters.length]);
  check("an Other entry adds nothing elsewhere", JSON.stringify(before) === JSON.stringify(after2));

  // ---- folding ----
  await p.goto(URL + "#items"); await p.waitForFunction(() => document.querySelector("#itList .sec.foldable"));
  const grp = '#itList .sec.foldable[data-foldk="it|Your custom items"]';
  check("item groups get a fold button", await p.locator(grp + " > .sec-h > .fold-btn").count() === 1);
  check("lists with several groups get Fold all", await p.locator("#itList > .sec.foldable:first-child > .sec-h > .fold-all").count() === 1);
  check("list groups start folded", await p.evaluate(() => [...document.querySelectorAll("#itList > .sec.foldable")].every(s => s.classList.contains("folded"))));
  await p.click(grp + " > .sec-h > .fold-btn");
  check("the fold button opens a group", await p.evaluate(g => !document.querySelector(g).classList.contains("folded") && document.querySelector(g).children[1].offsetHeight > 0, grp));
  await p.reload(); await p.waitForFunction(() => document.querySelector("#itList .sec.foldable"));
  check("an opened group stays open after a reload", await p.evaluate(g => !document.querySelector(g).classList.contains("folded"), grp));
  await p.click(grp + " > .sec-h > .fold-btn");
  check("the fold button hides the group's rows", await p.evaluate(g => { const s = document.querySelector(g); return s.classList.contains("folded") && [...s.children].slice(1).every(e => !e.offsetHeight); }, grp));
  check("the fold button says it's folded", await p.getAttribute(grp + " > .sec-h > .fold-btn", "aria-expanded") === "false");
  await p.selectOption("#itSort", "name").catch(() => {}); await p.evaluate(() => renderItems()); await p.waitForTimeout(150);
  check("folding survives a redraw", await p.evaluate(g => document.querySelector(g).classList.contains("folded"), grp));
  await p.reload(); await p.waitForFunction(() => document.querySelector("#itList .sec.foldable"));
  check("folding is remembered after a reload", await p.evaluate(g => document.querySelector(g).classList.contains("folded"), grp));
  await p.click(grp + " > .sec-h h3");
  check("clicking the header bar unfolds it", await p.evaluate(g => !document.querySelector(g).classList.contains("folded"), grp));
  await p.click('#itList .fold-all[data-foldall="1"]');
  check("the switch now says Unfold all", (await p.getAttribute("#itList .fold-all", "aria-label")) === "Unfold all");
  check("Fold all folds every group", await p.evaluate(() => [...document.querySelectorAll("#itList > .sec.foldable")].every(s => s.classList.contains("folded"))));
  await p.click('#itList .fold-all[data-foldall="0"]');
  check("Unfold all opens them again", await p.evaluate(() => [...document.querySelectorAll("#itList > .sec.foldable")].every(s => !s.classList.contains("folded"))));
  await p.goto(URL + "#spells"); await p.waitForFunction(() => document.querySelector("#spList .sec.foldable"));
  check("spell levels fold too, and start folded", await p.locator("#spList .sec.foldable .fold-btn").count() >= 9 && await p.evaluate(() => [...document.querySelectorAll("#spList > .sec.foldable")].every(s => s.classList.contains("folded"))));
  await p.fill("#spQ", "fireball"); await p.waitForTimeout(400);
  check("searching shows the matching groups open", await p.evaluate(() => { const g = [...document.querySelectorAll("#spList > .sec.foldable")]; return g.length > 0 && g.every(s => !s.classList.contains("folded")) && !!document.querySelector('#spList .sp-row'); }));
  await p.fill("#spQ", ""); await p.waitForTimeout(400);
  check("clearing the search folds them again", await p.evaluate(() => [...document.querySelectorAll("#spList > .sec.foldable")].every(s => s.classList.contains("folded"))));
  await p.goto(URL + "#monsters"); await p.waitForTimeout(300); await p.evaluate(() => { const r = document.querySelector('input[name="monMode"][value="manual"]') || document.querySelector('input[name="monMode"]:not([value="build"])'); if (r) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); } if (typeof renderBestiary === "function") renderBestiary(); }); await p.waitForTimeout(300);
  check("Monster Manual challenge groups fold too", await p.locator("#bsList .sec.foldable .fold-btn").count() > 5);
  // My Characters: a header button keeps its job, and the jump bar opens a folded section
  await p.goto(URL + "#character"); await p.waitForFunction(() => typeof generateCharacter === "function" && $("#storeBadge").textContent !== "Connecting…", null, { timeout: 15000 });
  await p.evaluate(() => { currentPC = pcEnsure(generateCharacter({ seed: "FOLD1", name: "Folda", ed: "2024", level: 3 })); keepPC(); });
  await p.goto(URL + "#roster"); await p.waitForFunction(() => document.querySelector("#rosterMain .sec.foldable"));
  check("character sheet sections fold, and start open", await p.locator('#rosterMain .sec.foldable[data-foldk="sheet|Skills"]').count() === 1 && await p.evaluate(() => ![...document.querySelectorAll("#rosterMain .sec.foldable")].some(s => s.classList.contains("folded"))));
  await p.click("#sec-gear > .sec-h > .fold-btn");
  check("the Inventory section folds", await p.evaluate(() => document.getElementById("sec-gear").classList.contains("folded")));
  await p.evaluate(() => sheetJump("gear")); await p.waitForTimeout(200);
  check("jumping to a folded section opens it", await p.evaluate(() => !document.getElementById("sec-gear").classList.contains("folded")));
  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
