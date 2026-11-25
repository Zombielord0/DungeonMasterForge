// The fight window (2026-11-25): conditions for foes and heroes, save reminders, concentration.
// Run with:  npm run test:fight
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});
const W = "#fightWin";

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 }, serviceWorkers: "block" });
    await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    const p = await ctx.newPage(), errs = []; p.on("pageerror", e => errs.push(e.message));
    await p.goto(URL + "#tracker"); await p.waitForFunction(() => typeof renderTracker === "function");
    const ids = await p.evaluate(() => {
      const pc = generateCharacter({ seed: "fight1", name: "Mira", cls: "Cleric", level: 5, ed: "2014" }); pcEnsure(pc); PCS.roster = [pc]; pcPersist();
      const c = blankCampaign("Ashfall"); c.party = [{ id: "pt1", name: "Mira", pcId: pc.id }];
      const e = newEncounter(null, "Goblin ambush", 3, [{ name: "Goblin", stat: "Goblin", cr: monCR("Goblin"), count: 2, boss: false }]);
      c.encounters = [e]; Store.save(c); activeId = c.id; subTab = "encounters"; renderTracker();
      return { eid: e.id, g1: e.enemies[0].id, g2: e.enemies[1].id, pcId: pc.id, dc: pc.spell && pc.spell.dc };
    });
    const foe = n => `foe:${n === 1 ? ids.g1 : ids.g2}`;
    const st = fn => p.evaluate(fn, ids);
    const enc = () => p.evaluate(i => { const e = findEnc(curCamp(), i.eid); return JSON.parse(JSON.stringify(e)); }, ids);

    await p.click(`[data-fopen="${ids.eid}"]`); await p.waitForTimeout(300);
    check("▶ Run fight opens the fight window full screen", await p.evaluate(s => { const w = document.querySelector(s); if (!w) return false; const r = w.getBoundingClientRect(); return r.width > 1200 && r.height > 700; }, W));
    await p.evaluate(i => { const e = findEnc(curCamp(), i.eid); e.pcInit = { pt1: 12 }; Store.save(curCamp()); }, ids);
    await p.click(`${W} [data-ea="roll"]`); await p.waitForTimeout(300);
    const order = await p.evaluate(s => [...document.querySelectorAll(`${s} [data-fsel]`)].map(r => r.dataset.fsel), W);
    check("the turn order lists the goblins and Mira", order.length === 3 && order.includes("pc:pt1"), order.join());

    // quick conditions
    await p.selectOption(`${W} select[data-fqk="${foe(2)}"]`, "prone"); await p.waitForTimeout(250);
    check("+ Condition puts Prone on Goblin 2", (await enc()).enemies[1].conds.some(x => x.k === "prone") && await p.evaluate(s => /Prone/.test(document.querySelector(s).textContent), W));
    await p.selectOption(`${W} select[data-fqk="pc:pt1"]`, "stunned"); await p.waitForTimeout(250);
    check("+ Condition puts Stunned on Mira's sheet", await st(i => !!PCS.roster.find(x => x.id === i.pcId).conds.stunned));
    await p.click(`${W} [data-frm][data-fwho="pc:pt1"]`); await p.waitForTimeout(250);
    check("✕ takes it off her sheet", await st(i => !PCS.roster.find(x => x.id === i.pcId).conds.stunned));

    // Hold Person from Mira on Goblin 1: filled in for you
    await p.click(`${W} [data-fsel="${foe(1)}"]`); await p.waitForTimeout(200);
    await p.selectOption("#fcCaster", "pc:pt1");
    await p.fill("#fcSpell", "Hold Person"); await p.dispatchEvent("#fcSpell", "change"); await p.waitForTimeout(200);
    const form = await p.evaluate(() => ({ ab: $("#fcAb").value, dc: +$("#fcDC").value, cond: $("#fcCond").value, ends: $("#fcEnds").value, conc: $("#fcConc").checked }));
    check("Hold Person fills in WIS, Mira's spell save DC, Paralyzed, a save at the end of each turn and concentration",
      form.ab === "wis" && form.dc === ids.dc && form.cond === "paralyzed" && form.ends === "saveEnd" && form.conc, JSON.stringify(form) + " dc " + ids.dc);
    await p.click("#fcAdd"); await p.waitForTimeout(300);
    let e = await enc();
    const hp = e.enemies[0].conds.find(x => x.k === "paralyzed");
    check("Goblin 1 is Paralyzed by Hold Person (Mira), linked to her casting", !!hp && hp.castId && e.casts[hp.castId] && e.casts[hp.castId].spell === "Hold Person");
    check("Mira is concentrating on Hold Person (on her sheet)", await st(i => (PCS.roster.find(x => x.id === i.pcId).conc || {}).spell === "Hold Person"));
    check("the chip says the save", await p.evaluate(s => /Paralyzed[^]*WIS\s*\d+/.test(document.querySelector(s).textContent), W));

    // the end-of-turn save reminder
    await p.evaluate(i => { const e = findEnc(curCamp(), i.eid); e.turn = i.g1; Store.save(curCamp()); fightRender(); }, ids);
    await p.click(`${W} [data-ea="next"]`); await p.waitForTimeout(400);
    const rem = await p.evaluate(s => (document.querySelector(`${s} .fight-rem`) || {}).textContent || "", W);
    check("Next turn after Goblin 1's turn asks for its WIS save to end Paralyzed", /Goblin 1/.test(rem) && /WIS/i.test(rem) && /Paralyzed/.test(rem) && new RegExp("DC\\s*" + ids.dc).test(rem), rem);
    await p.click(`${W} [data-fp="fail"]`); await p.waitForTimeout(250);
    check("Failed keeps it", (await enc()).enemies[0].conds.some(x => x.k === "paralyzed"));
    await p.evaluate(i => { const e = findEnc(curCamp(), i.eid); e.turn = i.g1; Store.save(curCamp()); fightRender(); }, ids);
    await p.click(`${W} [data-ea="next"]`); await p.waitForTimeout(300);
    await p.click(`${W} [data-fp="ok"]`); await p.waitForTimeout(250);
    check("Saved removes it", !(await enc()).enemies[0].conds.some(x => x.k === "paralyzed"));

    // a hero's concentration ending elsewhere frees the target
    await p.click(`${W} [data-fsel="${foe(1)}"]`);
    await p.selectOption("#fcCaster", "pc:pt1"); await p.fill("#fcSpell", "Hold Person"); await p.dispatchEvent("#fcSpell", "change"); await p.click("#fcAdd"); await p.waitForTimeout(250);
    await st(i => { const pc = PCS.roster.find(x => x.id === i.pcId); delete pc.conc; pcPersist(); fightRender(); });
    await p.waitForTimeout(250);
    check("when Mira's concentration ends on her sheet, Goblin 1 is freed", !(await enc()).enemies[0].conds.some(x => x.k === "paralyzed"));

    // a foe concentrating: damage asks for a save, Lost ends its spell on Mira
    await p.click(`${W} [data-fsel="pc:pt1"]`);
    await p.selectOption("#fcCaster", foe(2)); await p.fill("#fcSpell", "Hold Person"); await p.dispatchEvent("#fcSpell", "change");
    await p.fill("#fcDC", "13"); await p.click("#fcAdd"); await p.waitForTimeout(250);
    check("Goblin 2 concentrates, Mira is Paralyzed on her sheet", (await enc()).enemies[1].conc && await st(i => !!PCS.roster.find(x => x.id === i.pcId).conds.paralyzed));
    await p.fill(`${W} [data-amt="${ids.g2}"]`, "3"); await p.click(`${W} [data-ea="dmg"][data-mid="${ids.g2}"]`); await p.waitForTimeout(400);
    const crem = await p.evaluate(s => (document.querySelector(`${s} .fight-rem`) || {}).textContent || "", W);
    check("damage to a concentrating foe asks for a CON save DC 10", /Goblin 2/.test(crem) && /Concentration/i.test(crem) && /DC\s*10/.test(crem), crem);
    await p.click(`${W} [data-fp="fail"]`); await p.waitForTimeout(300);
    check("Lost ends Hold Person: Mira is free and Goblin 2 stops concentrating", !(await enc()).enemies[1].conc && await st(i => !PCS.roster.find(x => x.id === i.pcId).conds.paralyzed));

    // rounds run out
    await p.click(`${W} [data-fsel="${foe(1)}"]`);
    await p.selectOption("#fcCond", "blinded"); await p.selectOption("#fcEnds", "rounds"); await p.fill("#fcRounds", "1"); await p.selectOption("#fcCaster", ""); await p.fill("#fcSpell", "");
    await p.click("#fcAdd"); await p.waitForTimeout(250);
    for (let k = 0; k < 4; k++) { await p.click(`${W} [data-ea="next"]`); await p.waitForTimeout(150); for (let j = 0; j < 3 && await p.$(`${W} [data-fp]`); j++) { await p.click(`${W} [data-fp="fail"]`); await p.waitForTimeout(100); } }
    check("Blinded for 1 round ends by itself", !(await enc()).enemies[0].conds.some(x => x.k === "blinded"));

    // Undo
    await p.selectOption(`${W} select[data-fqk="${foe(1)}"]`, "grappled"); await p.waitForTimeout(200);
    await p.click(`${W} [data-ea="undo"]`); await p.waitForTimeout(250);
    check("Undo takes back a foe's condition", !(await enc()).enemies[0].conds.some(x => x.k === "grappled"));

    // names as text
    await p.evaluate(i => { const e = findEnc(curCamp(), i.eid); e.enemies[0].name = "<img src=x onerror=window.__x=1>Gob"; Store.save(curCamp()); fightRender(); }, ids);
    await p.waitForTimeout(200);
    check("names show as text, never as HTML", await p.evaluate(s => window.__x === undefined && !document.querySelector(`${s} img[src="x"]`), W));
    await p.click(`${W} [data-fclose]`); await p.waitForTimeout(200);
    check("✕ Close goes back to the Tracker", await p.evaluate(s => !document.querySelector(s), W));
    check("no page errors", !errs.length, errs.join(" | "));
    await ctx.close();

    // phone: the columns stack, turn order first
    const ph = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
    await ph.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    const q = await ph.newPage(); await q.goto(URL + "#tracker"); await q.waitForFunction(() => typeof renderTracker === "function");
    const eid = await q.evaluate(() => { const c = blankCampaign("P"); const e = newEncounter(null, "Fight", 2, [{ name: "Goblin", stat: "Goblin", cr: monCR("Goblin"), count: 2, boss: false }]); c.encounters = [e]; Store.save(c); activeId = c.id; subTab = "encounters"; renderTracker(); return e.id; });
    await q.click(`[data-fopen="${eid}"]`); await q.waitForTimeout(300);
    const lay = await q.evaluate(() => { const a = document.querySelector("#fightWin .fight-order").getBoundingClientRect(), b = document.querySelector("#fightWin .fight-now").getBoundingClientRect(); return { stacked: b.top >= a.bottom - 1, sw: document.documentElement.scrollWidth, w: Math.round(a.width) }; });
    check("phone: turn order first, the rest under it, nothing wider than the screen", lay.stacked && lay.sw <= 391 && lay.w >= 340, JSON.stringify(lay));
    await ph.close();
  } catch (e) { console.error(e); fails++; }
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll fight window checks passed");
  process.exit(fails ? 1 : 0);
})();
