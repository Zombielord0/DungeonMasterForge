// Homebrew classes: made in the Homebrew tab, then used to build, level up and multiclass characters. Run with:  npm run test:hbclass
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png" };
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
  await p.goto(URL + "#homebrew"); await p.waitForFunction(() => typeof renderHomebrew === "function"); await p.waitForTimeout(300);
  // random characters before any homebrew class exists, to compare later
  const before = await p.evaluate(() => Array.from({ length: 40 }, (_, i) => generateCharacter({ seed: "RND" + i, ed: i % 2 ? "2014" : "2024", level: 1 + (i % 20) })).map(c => c.cls + c.hp));

  // 1. make a class in the Homebrew tab
  const newBtn = '#hbSide [data-hbnew="class"]';
  check("the Homebrew tab has a Classes group", await p.$(newBtn) !== null);
  await p.click(newBtn);
  const f = s => `#hbMain [data-hbf="${s}"]`;
  await p.fill(f("name"), "Witch Hunter");
  await p.fill(f("desc"), "Hunts hags by the light of silver lanterns.");
  await p.selectOption(f("hd"), "10");
  await p.selectOption(f("pri.0"), "str"); await p.selectOption(f("pri.1"), "wis");
  await p.selectOption(f("saves.0"), "str"); await p.selectOption(f("saves.1"), "wis");
  await p.fill(f("skN"), "2");
  for (const k of ["Arcana", "Insight", "Perception", "Survival"]) await p.check(`#hbMain [data-hbsk="${k}"]`);
  await p.check('#hbMain [data-hbarm="light"]'); await p.check('#hbMain [data-hbarm="medium"]'); await p.check('#hbMain [data-hbarm="shield"]');
  await p.fill(f("weapons"), "Simple and martial weapons");
  await p.fill(f("kit"), "Longsword, Scale mail, Explorer's pack");
  await p.fill(f("wpnN"), "Longsword"); await p.fill(f("wpnD"), "1d8");
  await p.selectOption(f("cast"), "half");
  await p.selectOption(f("castAb"), "wis"); await p.selectOption(f("spellsFrom"), "Ranger");
  await p.fill(f("subName"), "Lantern Order"); await p.fill(f("subLv"), "3");
  await p.fill('#hbMain [data-hbrow="features"][data-i="0"][data-k="n"]', "Silver Sight");
  await p.fill('#hbMain [data-hbrow="features"][data-i="0"][data-k="d"]', "You see through illusions within 10 feet.");
  await p.click('#hbMain [data-fxadd="features.0"]'); await p.selectOption('#hbMain [data-fx="features.0"][data-j="0"][data-k="t"]', "ac");
  await p.click('#hbMain [data-hbadd="features"]');
  await p.fill('#hbMain [data-hbrow="features"][data-i="1"][data-k="l"]', "6");
  await p.fill('#hbMain [data-hbrow="features"][data-i="1"][data-k="n"]', "Iron Will");
  await p.click('#hbMain [data-hbact="save"]'); await p.waitForTimeout(400);
  const hc = await p.evaluate(() => HB.list.find(x => x.name === "Witch Hunter"));
  check("a homebrew class saves", !!hc && hc.kind === "class" && hc.hd === 10 && JSON.stringify(hc.saves) === '["str","wis"]' && hc.skills.n === 2 && hc.skills.from.length === 4 && hc.cast === "half" && hc.spellsFrom === "Ranger" && hc.features.length === 2, JSON.stringify(hc));

  // 2. it's offered wherever a class is chosen, and never picked at random
  check("the quick forge offers it", await p.evaluate(() => [...document.querySelectorAll("#pcClass option")].some(o => o.value === "Witch Hunter")));
  check("the class list offers it in both rule sets", await p.evaluate(() => classList("2014").includes("Witch Hunter") && classList("2024").includes("Witch Hunter")));
  const after = await p.evaluate(() => Array.from({ length: 40 }, (_, i) => generateCharacter({ seed: "RND" + i, ed: i % 2 ? "2014" : "2024", level: 1 + (i % 20) })).map(c => c.cls + c.hp));
  check("random characters are unchanged (it's only chosen on purpose)", JSON.stringify(before) === JSON.stringify(after));

  // 3. a level 5 character
  const c5 = await p.evaluate(() => { const c = pcEnsure(generateCharacter({ seed: "WH5", name: "Mara", ed: "2024", cls: "Witch Hunter", level: 5, subclass: "none" })); const pool = pcSpellPool(c, "2024"); return { hp: c.hp, con: c.mods.con, saves: c.saves, sk: c.skills.filter(s => s.p).map(s => s.s), feats: c.feats.map(x => x.f), slots: c.spell && c.spell.slots, ab: c.spell && c.spell.ab, pool: pool.length, ranger: pool.every(s => s.c.includes("Ranger") || s.c.includes("Witch Hunter")), hbAc: c.hbAc, kit: c.kit, atk: c.attacks[0] }; });
  check("d10 hit points", c5.hp === 10 + c5.con + 4 * (6 + c5.con), JSON.stringify([c5.hp, c5.con]));
  check("its saving throws", JSON.stringify(c5.saves) === '["str","wis"]');
  check("its class features to level 5, not later ones", c5.feats.includes("Silver Sight") && !c5.feats.includes("Iron Will"), c5.feats.join(" | "));
  check("a subclass is asked for at its own level, in 2024 too", c5.feats.some(t => /Subclass: not chosen yet/.test(t)));
  check("a half caster's spell slots and its spellcasting ability", JSON.stringify(c5.slots) === JSON.stringify([4, 2]) && c5.ab === "wis", JSON.stringify(c5.slots));
  check("spells come from the Ranger list", c5.pool > 10 && c5.ranger, String(c5.pool));
  check("a feature's sheet effect applies (+1 AC)", c5.hbAc === 1);
  check("its starting kit and weapon", c5.kit.includes("Longsword") && c5.atk.name === "Longsword" && /^1d8/.test(c5.atk.dmg), JSON.stringify([c5.kit, c5.atk]));
  const prof = await p.evaluate(() => { const c = pcEnsure(generateCharacter({ seed: "WH5", ed: "2024", cls: "Witch Hunter", level: 5, subclass: "none" })); const P = profInfo(c); return { armor: P.armor, weapons: P.weapons.join(" "), T: [...armorTraining(c)] }; });
  check("its armour and weapon training", JSON.stringify(prof.armor) === '["Light armor","Medium armor","Shields"]' && /martial/i.test(prof.weapons), JSON.stringify(prof));

  // 4. levelling up and multiclassing
  const lv = await p.evaluate(() => { const c = pcEnsure(generateCharacter({ seed: "WH5", name: "Mara", ed: "2024", cls: "Witch Hunter", level: 5 })); PCS.roster.push(c); pcLevelTo(c, 6); return { level: c.level, feats: c.feats.map(x => x.f) }; });
  check("levelling up adds the next feature", lv.level === 6 && lv.feats.includes("Iron Will"), JSON.stringify(lv));
  const mc = await p.evaluate(() => { const c = pcEnsure(generateCharacter({ seed: "FTR", ed: "2024", cls: "Fighter", level: 3, base: { str: 15, dex: 12, con: 14, int: 8, wis: 13, cha: 10 } })); return { meets: mcMeets(c, "Witch Hunter"), text: mcPrereqText("Witch Hunter") }; });
  check("multiclassing into it needs 13 in its main ability", mc.meets === true && mc.text === "STR 13", JSON.stringify(mc));

  // 5. its subclasses
  await p.click('#hbSide [data-hbnew="subclass"]');
  await p.fill(f("name"), "Order of the Ember");
  await p.selectOption(f("cls"), "Witch Hunter");
  check("homebrew subclasses can be made for it, at its own subclass level", /choose a subclass at level 3/.test(await p.textContent("#hbMain")));
  await p.fill('#hbMain [data-hbrow="features"][data-i="0"][data-k="n"]', "Ember Brand");
  await p.click('#hbMain [data-hbact="save"]'); await p.waitForTimeout(400);
  const sub = await p.evaluate(() => { const c = generateCharacter({ seed: "WH3", ed: "2014", cls: "Witch Hunter", level: 3, subclass: "Order of the Ember" }); return { list: subclassList("2014", "Witch Hunter").map(x => x[0]), feats: c.feats.map(x => x.f) }; });
  check("…and they build", sub.list.includes("Order of the Ember") && sub.feats.includes("Ember Brand"), JSON.stringify(sub));

  // 6. checks and deleting
  await p.click(newBtn); await p.fill(f("name"), "Fighter"); await p.click('#hbMain [data-hbact="save"]'); await p.waitForTimeout(300);
  check("a built-in class name is refused", /already a built-in/.test(await p.textContent("#hbMsg")), await p.textContent("#hbMsg"));
  await p.fill(f("name"), "Hexblade Scout"); await p.fill(f("skN"), "3"); await p.click('#hbMain [data-hbact="save"]'); await p.waitForTimeout(300);
  check("choosing more skills than it offers is refused", /Tick at least 3 skills/.test(await p.textContent("#hbMsg")), await p.textContent("#hbMsg"));
  await p.click('#hbMain [data-hbact="close"]'); await p.waitForTimeout(200); const yes = await p.$("#modal.open #modalYes"); if (yes) await yes.click();
  await p.click(`#hbSide [data-hbsel="${hc.id}"]`); await p.waitForTimeout(200);
  await p.click('#hbMain [data-hbact="del"]'); await p.click("#modalYes"); await p.waitForTimeout(400);
  check("a deleted class leaves the class lists", await p.evaluate(() => !classList("2024").includes("Witch Hunter") && !CLASS_DATA["Witch Hunter"] && ![...document.querySelectorAll("#pcClass option")].some(o => o.value === "Witch Hunter")));

  // 7. a character whose class is still waiting for the DM (a player's import) opens on My Characters
  const pend = await p.evaluate(() => {
    const x = { id: "hb-pendcls", kind: "class", name: "Gunslinger", ed: "both", hd: 10, pri: ["dex"], saves: ["dex", "con"], skills: { n: 2, any: true, from: [] }, armor: ["light"], weapons: "Firearms", tools: "", kit: "", wpn: { n: "Pistol", d: "1d10", ab: "dex" }, cast: "none", subName: "Gunslinger Trick", subLv: 3, features: [{ l: 1, n: "Grit", d: "Daring.", fx: [] }] };
    HB.pend = [{ ...x, pend: true, from: [] }]; HB.pendSig = ""; hbApply();
    const c = pcEnsure(generateCharacter({ seed: "GS", name: "Vex", ed: "2014", cls: "Gunslinger", level: 2 })); c.hbPending = [x];
    PCS.roster.push(c); RC.id = c.id; location.hash = "roster"; renderRosterTab();
    return { cls: c.cls, grit: c.feats.some(f => f.f === "Grit"), offered: classList("2014").includes("Gunslinger"), queue: hbPendHTML().includes("Gunslinger") };
  });
  await p.waitForTimeout(300);
  check("a character with a class waiting for the DM builds and opens", pend.cls === "Gunslinger" && pend.grit && /Vex/.test(await p.textContent("#view-roster")), JSON.stringify(pend));
  check("…the waiting class isn't offered to others, and is in the DM's approval queue", !pend.offered && pend.queue, JSON.stringify(pend));

  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll homebrew class checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
