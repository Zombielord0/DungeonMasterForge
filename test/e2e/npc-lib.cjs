// Your NPCs on the NPC tab (campaign tick boxes, shared edits) and MythWeaver monsters. Run with:  npm run test:npclib
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
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  let answer = "https://example.com/hilda.png";
  p.on("dialog", d => d.type() === "prompt" ? d.accept(answer) : d.accept());
  await p.goto(URL + "#tracker");
  await p.waitForFunction(() => typeof renderNpcLib === "function" && $("#storeBadge").textContent !== "Connecting…", null, { timeout: 15000 });

  // two campaigns; Hilda is in Alpha
  const ids = await p.evaluate(() => {
    const a = blankCampaign("Alpha"), b = blankCampaign("Beta");
    a.npcs.push({ id: uid("n"), name: "Hilda", role: "Smith", attitude: "Friendly", notes: "Makes swords." });
    Store.save(a); Store.save(b); return { a: a.id, b: b.id };
  });
  await p.goto(URL + "#npc"); await p.waitForTimeout(300);
  const row = () => p.locator(".npc-lib-row", { hasText: "Hilda" });
  check("Hilda is listed on the NPC tab", await row().count() === 1);
  check("Alpha is ticked, Beta isn't", await row().locator(`[data-nlc="${ids.a}"]`).isChecked() && !(await row().locator(`[data-nlc="${ids.b}"]`).isChecked()));

  // tick Beta: a copy goes into Beta, linked to the same NPC
  await row().locator(`label:has([data-nlc="${ids.b}"])`).click(); await p.waitForTimeout(200);
  let st = await p.evaluate(ids => { const a = Store.get(ids.a).npcs[0], b = Store.get(ids.b).npcs[0]; return { b: b && b.name, same: !!(a && b && a.lib === b.lib && a.id !== b.id) }; }, ids);
  check("ticking Beta puts Hilda in Beta", st.b === "Hilda" && st.same, JSON.stringify(st));
  check("the list still shows one Hilda", await row().count() === 1);

  // edit on the NPC tab: both campaigns change
  await row().locator('[data-nl="open"]').click();
  await row().locator('[data-nlf="role"]').fill("Master smith");
  await row().locator('[data-nlf="attitude"]').selectOption("Hostile"); await p.waitForTimeout(100);
  st = await p.evaluate(ids => [ids.a, ids.b].map(id => Store.get(id).npcs[0]).map(n => n.role + "/" + n.attitude), ids);
  check("edits on the NPC tab reach every campaign", st.every(x => x === "Master smith/Hostile"), JSON.stringify(st));

  // edit in the Tracker: the other copy changes too
  await p.goto(URL + "#tracker"); await p.waitForTimeout(200);
  await p.evaluate(id => { activeId = id; subTab = "npcs"; renderTracker(); }, ids.a); await p.waitForTimeout(200);
  await p.locator('#campMain [data-list="npcs"][data-key="notes"]').fill("Makes the best swords."); await p.waitForTimeout(100);
  st = await p.evaluate(id => Store.get(id).npcs[0].notes, ids.b);
  check("an edit in the Tracker reaches the other campaign", st === "Makes the best swords.", st);
  // a picture link is shared too
  await p.locator('#campMain [data-npcpic="link"]').first().click(); await p.waitForTimeout(200);
  st = await p.evaluate(id => Store.get(id).npcs[0].imgUrl, ids.b);
  check("a picture link reaches the other campaign", st === "https://example.com/hilda.png", st);

  // untick both: Hilda stays in Your NPCs, not in a campaign
  await p.goto(URL + "#npc"); await p.waitForTimeout(200);
  await row().locator(`label:has([data-nlc="${ids.a}"])`).click(); await p.waitForTimeout(150);
  await row().locator(`label:has([data-nlc="${ids.b}"])`).click(); await p.waitForTimeout(150);
  st = await p.evaluate(ids => ({ a: Store.get(ids.a).npcs.length, b: Store.get(ids.b).npcs.length, loose: npcLoose().map(n => n.name + "/" + n.role) }), ids);
  check("unticking every campaign keeps Hilda, in no campaign", st.a === 0 && st.b === 0 && st.loose.join() === "Hilda/Master smith", JSON.stringify(st));
  await p.selectOption("#npcLibCamp", "-"); await p.waitForTimeout(100);
  check("'Not in a campaign' filter shows her", await row().count() === 1);
  // and back into Beta
  await row().locator(`label:has([data-nlc="${ids.b}"])`).click(); await p.waitForTimeout(150);
  st = await p.evaluate(ids => ({ b: Store.get(ids.b).npcs.map(n => n.name), loose: npcLoose().length }), ids);
  check("ticking again moves her back into a campaign", st.b.join() === "Hilda" && st.loose === 0, JSON.stringify(st));
  await p.selectOption("#npcLibCamp", ""); await p.waitForTimeout(100);

  // places: move Hilda to a new place, see the tab, and the place in the Tracker
  answer = "Saltmarsh";
  await row().locator("[data-nlmove]").selectOption("\u0001new"); await p.waitForTimeout(200);
  st = await p.evaluate(ids => [ids.a, ids.b].flatMap(id => Store.get(id).npcs.map(n => n.place)), ids);
  check("Move to → New place files Hilda under it, in every campaign", st.length === 1 && st[0] === "Saltmarsh", JSON.stringify(st));
  const salt = await p.evaluate(() => (W.places.find(x => x.name === "Saltmarsh") || {}).id);
  check("New place makes a World place, and its tab appears", !!salt && await p.locator(`[data-nltab="${salt}"]`).count() === 1);
  await p.click('[data-nl="new"]'); await p.waitForTimeout(150); await p.keyboard.type("Old Tom"); await p.keyboard.press("Tab");
  await p.click(`[data-nltab="${salt}"]`); await p.waitForTimeout(100);
  let names = await p.locator(".npc-lib-row .npc-lib-name b").allTextContents();
  check("the Saltmarsh tab shows only Saltmarsh NPCs", names.join() === "Hilda", names.join());
  await p.click('[data-nltab="-"]'); await p.waitForTimeout(100);
  names = await p.locator(".npc-lib-row .npc-lib-name b").allTextContents();
  check("the No place tab shows the rest", names.join() === "Old Tom", names.join());
  await p.locator(".npc-lib-row", { hasText: "Old Tom" }).locator("[data-nlmove]").selectOption(salt); await p.waitForTimeout(150);
  check("moving to an existing place works", await p.evaluate(salt => { const n = npcLoose().find(n => n.name === "Old Tom"); return n.place === "Saltmarsh" && n.placeId === salt; }, salt));
  await p.click('[data-nltab=""]'); await p.waitForTimeout(100);
  await p.locator(".npc-lib-row", { hasText: "Old Tom" }).locator('[data-nl="del"]').click(); await p.click("#modalYes"); await p.waitForTimeout(150);

  // + New NPC, then delete it everywhere
  await p.click('[data-nl="new"]'); await p.waitForTimeout(150);
  await p.keyboard.type("Brother Oswin"); await p.keyboard.press("Tab"); await p.waitForTimeout(100); /* the new NPC's name box has focus, with its text selected */
  check("+ New NPC adds one with no campaign", await p.evaluate(() => npcLoose().some(n => n.name === "Brother Oswin")));
  await p.locator(".npc-lib-row", { hasText: "Brother Oswin" }).locator('[data-nl="del"]').click();
  await p.click("#modalYes"); await p.waitForTimeout(200);
  check("deleting removes it", await p.evaluate(() => !npcLoose().some(n => n.name === "Brother Oswin")));

  // MythWeaver: NPCs show on the NPC tab ticked for the imported campaign; monsters go to My monsters
  const mw = { format: "mythweaver-account-export", campaigns: [{ id: 7, name: "Ember Reach", lore: [
    { id: 10, name: "Ashford", type: "location", description: "A river town.", tags: ["Location"] },
    { id: 11, name: "Garrick Vane", type: "npc", description: "Innkeeper of the Gilded Goose.", tags: ["NPC", "Ashford"] },
    { id: 14, name: "Ambush on the Ford", type: "encounter", description: "<p>Three goblins and a bugbear leap from the reeds. Cinder Hound x2 follow behind.</p>", tags: ["Encounter"] },
    { id: 15, name: "Quiet Shrine", type: "encounter", description: "Nothing stirs here.", tags: ["Encounter"] },
    { id: 12, name: "Ash Wraith", type: "monster", description: "A drifting shape of soot.", tags: [] },
    { id: 13, name: "Cinder Hound", type: "monster", description: "<p>Medium monstrosity, unaligned</p><p><strong>Armor Class</strong> 14 (natural armor)<br><strong>Hit Points</strong> 33 (6d8 + 6)<br><strong>Speed</strong> 40 ft.</p><p>STR 16 (+3) DEX 14 (+2) CON 13 (+1) INT 3 (−4) WIS 12 (+1) CHA 6 (−2)</p><p><strong>Senses</strong> darkvision 60 ft., passive Perception 13<br><strong>Challenge</strong> 2 (450 XP)</p><p><strong><em>Fire Aura.</em></strong> Creatures that touch it take 1d4 fire damage.</p>", tags: ["Monster"],
      sections: [{ title: "Actions", text: "<p><strong>Bite.</strong> Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage plus 3 (1d6) fire damage.</p>" }] }], sessions: [] }], otherLore: [], characters: [], images: [] };
  const mwFile = path.join(os.tmpdir(), "dmforge-npclib-mw.json"); fs.writeFileSync(mwFile, JSON.stringify(mw));
  await p.goto(URL + "#tracker"); await p.waitForTimeout(200);
  await p.setInputFiles("#importFile", mwFile); await p.waitForTimeout(500);
  const offer = await p.evaluate(() => { const b = document.querySelector("[data-mwextras]"); return b ? b.closest("label").textContent : ""; });
  check("import window offers 2 monsters, 1 needing stats", /2 monsters to My monsters/.test(offer) && /1 monster has no stat block/.test(offer), offer);
  await p.click("#impCampGo"); await p.waitForTimeout(900);
  await p.goto(URL + "#npc"); await p.waitForTimeout(300);
  const ember = await p.evaluate(() => Store.list().find(c => c.name === "Ember Reach").id);
  const g = p.locator(".npc-lib-row", { hasText: "Garrick Vane" });
  check("imported NPC is on the NPC tab, ticked for its campaign", await g.count() === 1 && await g.locator(`[data-nlc="${ember}"]`).isChecked());
  const ash = await p.evaluate(() => { const n = npcGroups().find(g => g.n.name === "Garrick Vane").n, w = W.places.find(x => x.name === "Ashford"); return n.place === "Ashford" && w && n.placeId === w.id ? w.id : ""; });
  check("imported NPC is filed under the World place its tags name", !!ash && await p.locator(`[data-nltab="${ash}"]`).count() === 1);
  const encs = await p.evaluate(() => Store.list().find(c => c.name === "Ember Reach").encounters.map(e => ({ n: e.name, foes: e.enemies.map(m => m.stat + ":" + m.ac + "/" + m.hp), notes: e.notes })));
  const amb = encs.find(e => e.n === "Ambush on the Ford"), quiet = encs.find(e => e.n === "Quiet Shrine");
  const cnt = k => amb ? amb.foes.filter(f => f.startsWith(k + ":")).length : 0;
  check("encounter goes to the Encounters tab with its monsters", amb && cnt("Goblin") === 3 && cnt("Bugbear") === 1 && cnt("Cinder Hound") === 2 && amb.foes.length === 6, JSON.stringify(amb));
  check("monster AC and HP come from the Monster Manual and the import", amb && amb.foes.includes("Goblin:15/7") && amb.foes.includes("Cinder Hound:14/33"), JSON.stringify(amb && amb.foes));
  check("an encounter naming no monsters is still added, with a note", quiet && !quiet.foes.length && /No monsters were found/.test(quiet.notes), JSON.stringify(quiet));
  st = await p.evaluate(() => MB.lib.map(f => ({ n: f.name, needs: !!f.needsStats, ac: f.ac, hp: f.hp, hd: f.hdN + "d" + f.hdD, sc: f.scores.join(","), cr: f.cr, size: f.size, type: f.type, walk: f.speed.walk, dark: f.senses.dark, traits: f.traits.map(t => t.n), actions: f.actions.map(t => t.n) })));
  const ch = st.find(x => x.n === "Cinder Hound"), aw = st.find(x => x.n === "Ash Wraith");
  check("monster with a stat block gets its numbers", ch && !ch.needs && ch.ac === 14 && ch.hp === 33 && ch.hd === "6d8" && ch.sc === "16,14,13,3,12,6" && ch.cr === 2 && ch.size === "medium" && ch.type === "monstrosity" && ch.walk === 40 && ch.dark === 60, JSON.stringify(ch));
  check("its trait and action come across", ch && ch.traits.includes("Fire Aura") && ch.actions.includes("Bite"), JSON.stringify(ch));
  check("monster without stats is marked needs stats", aw && aw.needs, JSON.stringify(aw));
  await p.goto(URL + "#monsters"); await p.waitForTimeout(200);
  await p.click('label.opt:has(input[value="build"])'); await p.waitForTimeout(200);
  check("My monsters shows 'needs stats'", /needs stats/.test(await p.locator("#mbLib").textContent()));
  // import again: no duplicate monsters or NPCs
  await p.goto(URL + "#tracker"); await p.waitForTimeout(200);
  await p.setInputFiles("#importFile", mwFile); await p.waitForTimeout(500); await p.click("#impCampGo"); await p.waitForTimeout(900);
  st = await p.evaluate(() => ({ m: MB.lib.length, n: npcGroups().filter(g => g.n.name === "Garrick Vane").length, e: Store.list().find(c => c.name === "Ember Reach").encounters.length }));
  check("importing again adds no duplicates", st.m === 2 && st.n === 1 && st.e === 2, JSON.stringify(st));

  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll NPC list checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
