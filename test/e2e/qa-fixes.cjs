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

  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll QA fix checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
