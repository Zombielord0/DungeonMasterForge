// QA pass fixes (2026-11-23, QA-1 to QA-5): monster data, import reports, tiny Wild Shape attacks, "an uncommon".
// Run with:  npm run test:qafix
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public"), FIX = path.join(__dirname, "fixtures");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".webp": "image/webp" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});
const ZOOK = fs.readFileSync(path.join(FIX, "companion-zook.json"), "utf8");

(async () => {
  await new Promise(r => server.listen(0, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const p = await ctx.newPage(), errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto(`http://localhost:${server.address().port}/#roster`); await p.waitForFunction(() => typeof compImport === "function");

  // QA-1: animals whose source data had "0" for every save and skill
  const mons = await p.evaluate(() => { const L = JSON.parse(DMDATA.monsterData || "null") || dmData("monsterData"); const M = (L["2014"] || L).reduce((o, m) => (o[m.n] = m, o), {}); return M; }).catch(() => null)
    || await p.evaluate(() => { const L = dmData("monsterData"); return L["2014"].reduce((o, m) => (o[m.n] = m, o), {}); });
  const fake = ["Elephant", "Camel", "Donkey", "Draft Horse", "Mule", "Pony", "Riding Horse", "Warhorse"].filter(n => mons[n] && ((mons[n].saves || []).length || (mons[n].skills || []).length));
  check("QA-1: plain animals have no made-up +0 saves or skills", !fake.length, fake.map(n => `${n}: ${JSON.stringify([mons[n].saves, (mons[n].skills || []).length])}`).join(" | "));
  check("QA-1: a real +0 save is kept (Ogre Zombie, Wis +0)", (mons["Ogre Zombie"].saves || []).includes("Wis +0"), JSON.stringify(mons["Ogre Zombie"].saves));

  // QA-2: three thin 2014 entries
  const D = mons["Donkey"], Dr = mons["Elf, Drow"], G = mons["Gnome, Deep (Svirfneblin)"], tn = m => (m.traits || []).map(t => t[0]).join(", ");
  check("QA-2: the Donkey matches the Mule (hit dice, CR 1/8, Hooves +2 to hit)", D.hd === "2d8+2" && D.cr === mons["Mule"].cr && JSON.stringify(D.actions) === JSON.stringify(mons["Mule"].actions), JSON.stringify([D.cr, D.hd, D.actions]));
  check("QA-2: the Drow is CR 1/4 with Fey Ancestry, innate spells and sunlight sensitivity", Dr.cr === 0.25 && Dr.hd && /Fey Ancestry/.test(tn(Dr)) && /Innate Spellcasting/.test(tn(Dr)) && /Sunlight Sensitivity/.test(tn(Dr)), JSON.stringify([Dr.cr, Dr.hd, tn(Dr)]));
  check("QA-2: the Deep Gnome is CR 1/2 with its traits", G.cr === 0.5 && G.hd && /Stone Camouflage/.test(tn(G)) && /Gnome Cunning/.test(tn(G)) && /Innate Spellcasting/.test(tn(G)), JSON.stringify([G.cr, G.hd, tn(G)]));

  // QA-3: a spelling fix on a spell is reported; an id-only UA subclass keeps its [UA] when the class is misspelled
  const imp = await p.evaluate(txt => {
    const j = JSON.parse(txt); j.spells = j.spells.map(s => s.name === "Shield" ? { ...s, name: "Sheild" } : s);
    const d1 = compImport(j, "2014");
    const k = JSON.parse(txt); k.jobs = [{ ...k.jobs[0], jobId: "rangr" }];
    const d2 = compImport(k, "2014");
    return { differ: d1.report.differ, prep: d1.extras.prepared.map(s => s.n), cls: d2.opts.cls, sub: d2.opts.subclass, made: d2.report.made };
  }, ZOOK);
  check("QA-3: a misspelled spell is matched and listed under Different from the file", imp.prep.includes("Shield") && imp.differ.some(t => /Sheild/.test(t) && /Shield/.test(t)), JSON.stringify(imp.differ));
  check("QA-3: a misspelled class keeps the file's own Unearthed Arcana subclass", imp.cls === "Ranger" && imp.sub === "Swarmkeeper [UA]", JSON.stringify([imp.cls, imp.sub, imp.made]));

  // QA-4: tiny Wild Shape beasts that hit for a flat 1 damage still get their attack
  const wild = await p.evaluate(() => { bsLoad(); const find = (ed, n) => BS.data[ed].find(x => x.n === n);
    return ["2014|Bat", "2014|Cat", "2024|Bat", "2024|Cat"].map(k => { const [ed, n] = k.split("|"), m = find(ed, n), f = m && beastForm(m.id); return { k, atk: f ? f.attacks.map(a => [a.name, a.hit, a.die, a.mod, a.type]) : null }; }); });
  check("QA-4: Bat and Cat forms have their 1-damage attack (both rule sets)", wild.every(w => w.atk && w.atk.length === 1 && w.atk[0][2] === "" && w.atk[0][3] === 1), JSON.stringify(wild));
  const dmg = await p.evaluate(() => { bsLoad(); const m = BS.data["2014"].find(x => x.n === "Bat"); const c = generateCharacter({ cls: "Druid", level: 4, ed: "2014", seed: "qa4" }); pcEnsure(c);
    c.active = { "Wild Shape": m.id }; const A = pcAttacks(c); return A.map(a => [a.name, a.dmg]); });
  check("QA-4: in Wild Shape, the sheet's attack list shows the bat's bite for 1 damage", dmg.length === 1 && dmg[0][0] === "Bite" && dmg[0][1] === "1", JSON.stringify(dmg));

  // QA-5: "an uncommon item"
  const note = await p.evaluate(() => { itLoad(); const x = [...IT.data["2024"], ...IT.data["2014"]].find(i => i.rk === 1); return itPriceNote(x); });
  check("QA-5: the price note says “an uncommon item”", /an uncommon item/.test(note) && !/a uncommon/.test(note), note);

  // QA-6: every spell's "at higher levels" text is on its own line (the h field), not inside the description
  const up = await p.evaluate(() => { const D = dmData("spellData"), bad = [];
    for (const ed of ["2014", "2024"]) for (const x of D[ed] || []) if (!x.h && /(Using a Higher-Level Spell Slot|At Higher Levels)\./.test(x.d || "")) bad.push(`${ed} ${x.n}`);
    const cw = D["2024"].find(x => x.n === "Cure Wounds"); return { bad, cw: cw && [cw.h, /Higher-Level/.test(cw.d)] }; });
  check("QA-6: no spell keeps its higher-level text inside the description", !up.bad.length, up.bad.join(", "));
  check("QA-6: Cure Wounds (2024) has its higher-level line on its own", up.cw && /2d8 for each spell slot level above 1/.test(up.cw[0]) && !up.cw[1], JSON.stringify(up.cw));

  // QA-7: on phones the short header shows the Forge's whole name
  for (const w of [320, 360, 390]) {
    await p.setViewportSize({ width: w, height: 844 }); await p.goto(p.url().replace(/#.*/, "#spells")); await p.waitForTimeout(400);
    const h = await p.evaluate(() => { const l = document.querySelector(".hdr-mini-label"), t = document.querySelector("#hdrToggle"); return { cut: l.scrollWidth > l.clientWidth + 1, shown: l.getClientRects().length > 0, label: t.getAttribute("aria-label") || t.textContent }; });
    check(`QA-7: at ${w} px the header name isn't cut off, and the toolbar button still says what it does`, h.shown && !h.cut && /Show toolbar/.test(h.label), JSON.stringify(h));
  }

  // Book subclass abilities (2026-11-23): an Oathbreaker's Aura of Hate and Channel Divinity options are in the Abilities list
  await p.setViewportSize({ width: 1400, height: 1000 });
  const abl = await p.evaluate(() => { const c = generateCharacter({ cls: "Paladin", level: 8, ed: "2014", seed: "obabl", subclass: "Oathbreaker", method: "array", bonus: "flex" }); pcEnsure(c);
    return pcAbilities(c).map(a => [a.name, a.when, a.text, a.res]); });
  const A = n => abl.find(a => a[0] === n);
  check("Oathbreaker: Aura of Hate is in the Abilities list with the Charisma bonus", A("Aura of Hate") && /melee weapon damage/.test(A("Aura of Hate")[2]) && /\+\d/.test(A("Aura of Hate")[2]), JSON.stringify(abl.map(a => a[0])));
  check("Oathbreaker: Control Undead and Dreadful Aspect are abilities that spend Channel Divinity, with a save DC", ["Channel Divinity: Control Undead", "Channel Divinity: Dreadful Aspect"].every(n => A(n) && A(n)[3] === "channel" && /DC \d+/.test(A(n)[2])), JSON.stringify(abl.filter(a => /Control|Dreadful/.test(a[0]))));

  // Book reference spells (2026-11-23): spells from other books join the list with their stats and page, no rules text
  const refs = await p.evaluate(() => { const D = dmData("spellData"), out = {};
    for (const ed of ["2014", "2024"]) { const L = D[ed].filter(x => x.n === "Silvery Barbs"); out[ed] = L.map(x => ({ l: x.l, s: x.s, t: x.t, r: x.r, src: x.src, ref: x.ref, d: x.d })); out[ed + "fireball"] = D[ed].filter(x => x.n === "Fireball").length; }
    return out; });
  check("reference spells: Silvery Barbs is in the 2014 spell list once, level 1 enchantment from Strixhaven (a 2014 book, so not in 2024)", refs["2014"].length === 1 && refs["2014"][0].l === 1 && refs["2014"][0].s === "Enchantment" && refs["2014"][0].src === "scc" && refs["2014"][0].ref === true && refs["2024"].length === 0, JSON.stringify(refs));
  check("reference spells: its description only points to the book page", refs["2014"][0] && /Strixhaven.*page 38/.test(refs["2014"][0].d) && refs["2014"][0].d.length < 200, JSON.stringify(refs["2014"]));
  check("reference spells: a spell the Forge already has isn't added twice (Fireball)", refs["2014fireball"] === 1 && refs["2024fireball"] === 1, JSON.stringify([refs["2014fireball"], refs["2024fireball"]]));
  const sb = await p.evaluate(txt => { const j = JSON.parse(txt); j.spells = [...j.spells, { name: "Silvery Barbs", level: 1 }]; const D = compImport(j, "2014");
    return { prep: D.extras.prepared.map(s => s.n), hb: D.homebrew.filter(x => x.kind === "spell").map(x => x.name) }; }, ZOOK);
  check("reference spells: importing a character with Silvery Barbs puts it on the sheet, not in homebrew or notes", sb.prep.includes("Silvery Barbs") && !sb.hb.includes("Silvery Barbs"), JSON.stringify(sb));
  await p.goto(p.url().replace(/#.*/, "#spells")); await p.waitForFunction(() => document.querySelector("#spList .sp-row"));
  await p.click('label.opt:has(input[name="spEd"][value="2014"])'); await p.fill("#spQ", "silvery barbs"); await p.waitForTimeout(500);
  const row = await p.evaluate(() => { const r = [...document.querySelectorAll("#spList .sp-row")].find(x => /Silvery Barbs/.test(x.textContent)); return r ? r.textContent.replace(/\s+/g, " ").slice(0, 200) : null; });
  check("reference spells: the Spells tab lists Silvery Barbs with its book", row && /SCC/.test(row), String(row));

  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll QA fix checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
