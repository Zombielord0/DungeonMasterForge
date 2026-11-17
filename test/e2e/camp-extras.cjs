// Campaign export/import carries custom items, homebrew and custom monsters. Run with:  npm run test:campextras
// Starts its own static server for public/ on a free port; uses the "Use without an account" mode.
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json" };

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
  const errs = [];
  const open = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true, serviceWorkers: "block" });
    await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
    await p.goto(URL + "#tracker");
    await p.waitForFunction(() => typeof campExtras === "function" && $("#storeBadge").textContent !== "Connecting…", null, { timeout: 15000 });
    return { ctx, p };
  };

  // --- the DM's browser: a custom item, a homebrew feat, a custom monster and a campaign with the item as loot
  const A = await open();
  await A.p.evaluate(async () => {
    const d = ciNew(); d.n = "Blade of Test Fire"; IT.draft = d; ciSave();
    const h = hbItemOf(Object.assign(hbNew("feat"), { name: "Testers Grit" })); await hbPut(h);
    const m = mbBlank(); m.name = "Test Gremlin"; MB.lib.push(m); mbSaveLib();
  });
  await A.p.click("#newCamp"); await A.p.waitForTimeout(400);
  await A.p.evaluate(() => { const c = curCamp(); c.name = "Extras Camp"; c.loot.unshift({ id: uid("l"), item: "Blade of Test Fire", holder: "", value: "", notes: "" }); Store.save(c); renderTracker(); });
  await A.p.waitForTimeout(300);
  const [dl] = await Promise.all([A.p.waitForEvent("download"), A.p.click("#exportCamp")]);
  const file = path.join(require("os").tmpdir(), "dmforge-camp-extras.json");
  await dl.saveAs(file);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  check("export carries the custom item", (json.extras?.items || []).some(x => x.n === "Blade of Test Fire"));
  check("export carries homebrew", (json.extras?.homebrew || []).some(x => x.name === "Testers Grit"));
  check("export carries custom monsters", (json.extras?.monsters || []).some(x => x.name === "Test Gremlin"));

  // --- a fresh browser: import the file
  const B = await open();
  await B.p.evaluate(() => { currentPC = pcEnsure(generateCharacter({ seed: "CX1", name: "Hero One", ed: "2024" })); keepPC(); });
  await B.p.setInputFiles("#importFile", file); await B.p.waitForTimeout(800);
  let st = await B.p.evaluate(() => ({ items: IT.custom.map(x => x.n), hb: HB.list.map(x => x.name), mons: MB.lib.map(x => x.name), camps: Store.list().map(c => ({ name: c.name, extras: "extras" in c })), toast: $("#toast") ? $("#toast").textContent : "" }));
  check("custom item added to Items", st.items.includes("Blade of Test Fire"), JSON.stringify(st.items));
  check("homebrew added", st.hb.includes("Testers Grit"), JSON.stringify(st.hb));
  check("custom monster added", st.mons.includes("Test Gremlin"), JSON.stringify(st.mons));
  check("campaign imported without the extras field", st.camps.some(c => c.name === "Extras Camp" && !c.extras), JSON.stringify(st.camps));
  check("toast says what came along", /custom item/.test(st.toast), st.toast);

  // importing again doesn't add duplicates
  await B.p.setInputFiles("#importFile", file); await B.p.waitForTimeout(800);
  st = await B.p.evaluate(() => ({ items: IT.custom.length, hb: HB.list.length, mons: MB.lib.length }));
  check("second import adds no duplicates", st.items === 1 && st.hb === 1 && st.mons === 1, JSON.stringify(st));

  // the item can be given to a character from the Items tab
  await B.p.goto(URL + "#items"); await B.p.waitForFunction(() => typeof itGive === "function");
  const given = await B.p.evaluate(() => { const x = IT.custom.find(y => y.n === "Blade of Test Fire"); const c = PCS.roster[0]; $("#itTarget").value = c.id; itGive(x, true); const inv = PCS.roster[0].inv.find(i => i.n === "Blade of Test Fire"); return inv && inv.ref === x.id; });
  check("custom item given to a character with a link to the item", given);

  // and the loot row's Give to… links to the custom item too
  const lootRef = await B.p.evaluate(() => {
    const camp = Store.list().find(c => c.name === "Extras Camp"); activeId = camp.id; const it = camp.loot[0];
    const p = PCS.roster[0]; p.inv = p.inv.filter(i => i.n !== "Blade of Test Fire");
    const sel = document.createElement("select"); sel.dataset.lootgive = it.id; sel.innerHTML = `<option value="${p.id}">x</option>`; document.body.append(sel); sel.value = p.id;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    const inv = PCS.roster[0].inv.find(i => i.n === "Blade of Test Fire"); return inv && /^ci/.test(inv.ref || "");
  });
  check("loot Give to… links the custom item", lootRef);

  // --- MythWeaver: items and spells come into Items → Custom and Homebrew
  const mw = { format: "mythweaver-account-export", account: { email: "x@example.com" }, campaigns: [{ id: 9, name: "MW Camp", lore: [
      { id: 1, name: "Sunshard Blade", type: "item", description: "A rare longsword that glows. Requires attunement.", tags: ["Magic Item"], sections: [{ title: "Secret", text: "It is cursed.", dmOnly: true }] },
      { id: 2, name: "Bag of Holding", type: "item", description: "Built in already.", tags: [] },
      { id: 3, name: "Frostlance", type: "generic", description: "<p>2nd-level evocation</p><p>Casting Time: 1 action</p><p>Range: 90 feet</p><p>Components: V, S</p><p>Duration: Instantaneous</p><p>A lance of ice.</p>", tags: ["Spell", "Wizard"] },
      { id: 4, name: "Fireball", type: "generic", description: "Built in already.", tags: ["Spell"] },
      { id: 5, name: "The Old Mill", type: "location", description: "A mill." }], sessions: [] }], otherLore: [], characters: [], images: [] };
  const mwFile = path.join(require("os").tmpdir(), "dmforge-mw-extras.json"); fs.writeFileSync(mwFile, JSON.stringify(mw));
  const C = await open();
  await C.p.setInputFiles("#importFile", mwFile); await C.p.waitForTimeout(500);
  const offer = await C.p.evaluate(() => { const b = document.querySelector("[data-mwextras]"); return b ? b.closest("label").textContent : ""; });
  check("MythWeaver window offers 1 item and 1 spell", /1 item to Items → Custom/.test(offer) && /1 spell to Homebrew/.test(offer), offer);
  await C.p.click("#impCampGo"); await C.p.waitForTimeout(900);
  st = await C.p.evaluate(() => { const it = IT.custom.find(x => x.n === "Sunshard Blade"), sp = HB.list.find(x => x.name === "Frostlance");
    return { items: IT.custom.map(x => x.n), it: it && { cat: it.cat, r: it.r, att: it.att, d: it.d }, sp: sp && { l: sp.l, s: sp.s, r: sp.r, cp: sp.cp, c: sp.c }, hb: HB.list.map(x => x.name), lore: (Store.list().find(c => c.name === "MW Camp") || { lore: [] }).lore.map(x => x.name), toast: $("#toast").textContent }; });
  check("MythWeaver item added to Items → Custom", st.items.length === 1 && st.it && st.it.cat === "Weapon" && st.it.r === "Rare" && st.it.att === "Required", JSON.stringify(st));
  check("DM-only text left off the item", st.it && !/cursed/.test(st.it.d), st.it && st.it.d);
  check("MythWeaver spell added to Homebrew", st.hb.length === 1 && st.sp && st.sp.l === 2 && st.sp.s === "Evocation" && st.sp.r === "90 feet" && st.sp.cp === "VS" && st.sp.c.includes("Wizard"), JSON.stringify(st));
  check("they stay in Lore too", st.lore.includes("Sunshard Blade") && st.lore.includes("Frostlance"), JSON.stringify(st.lore));
  check("toast mentions them", /custom item/.test(st.toast) && /homebrew/.test(st.toast), st.toast);
  await C.p.setInputFiles("#importFile", mwFile); await C.p.waitForTimeout(500); await C.p.click("#impCampGo"); await C.p.waitForTimeout(900);
  st = await C.p.evaluate(() => ({ items: IT.custom.length, hb: HB.list.length }));
  check("importing MythWeaver again adds no duplicates", st.items === 1 && st.hb === 1, JSON.stringify(st));
  // untick the box and nothing is added
  const D = await open();
  await D.p.setInputFiles("#importFile", mwFile); await D.p.waitForTimeout(500);
  await D.p.uncheck("[data-mwextras]"); await D.p.click("#impCampGo"); await D.p.waitForTimeout(900);
  st = await D.p.evaluate(() => ({ items: IT.custom.length, hb: HB.list.length }));
  check("unticked: no items or spells added", st.items === 0 && st.hb === 0, JSON.stringify(st));

  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
