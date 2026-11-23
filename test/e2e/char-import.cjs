// Character import: 5e Companion App files and fillable PDF sheets. Run with:  npm run test:import
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public"), FIX = path.join(__dirname, "fixtures");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".pdf": "application/pdf" };
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok || !extra ? "" : "  -> " + extra)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});
// Use a fictional spell to exercise homebrew import even as the catalog grows.
const ZOOK = fs.readFileSync(path.join(FIX, "companion-zook.json"), "utf8").replaceAll("Blade Ward", "Glimmershell Aegis");

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#roster"); await p.waitForFunction(() => typeof renderHomebrew === "function");

  // ---------- reading the Companion App file ----------
  const r = await p.evaluate(txt => {
    const d = compImport(JSON.parse(txt), "2014"); if (d.error) return { error: d.error };
    const { c, report } = importBuild(d);
    return { opts: d.opts, final: d.final, homebrew: d.homebrew, extras: d.extras, report, c: { name: c.name, cls: c.cls, level: c.level, ed: c.ed, bg: c.bg, race: c.race, subclass: c.subclass, scores: c.scores, base: c.base, skills: c.skills.filter(s => s.p).map(s => s.s), inv: c.inv, coins: c.coins, xp: c.xp, align: c.align, bond: c.bond, notes: c.notes, prepared: c.prepared, feats: c.feats.map(f => f.f), hpCur: c.hpCur, hp: c.hp, kitMoved: c.kitMoved, importedFrom: c.importedFrom } };
  }, ZOOK);
  check("the Companion App file reads without error", !r.error, r.error);
  if (r.error) { await browser.close(); server.close(); process.exit(1); }
  const c = r.c;
  check("name, class, level, rules and background", c.name === "Zook Hornraven" && c.cls === "Ranger" && c.level === 7 && c.ed === "2014" && c.bg === "Folk Hero", JSON.stringify([c.name, c.cls, c.level, c.ed, c.bg]));
  check("final scores equal the file's", JSON.stringify(c.scores) === JSON.stringify({ str: 5, dex: 12, con: 13, int: 14, wis: 15, cha: 9 }), JSON.stringify(c.scores));
  check("proficient skills come across", ["Animal Handling", "Athletics", "Insight", "Survival"].every(s => c.skills.includes(s)), c.skills.join(","));
  const sub = r.homebrew.find(x => x.kind === "subclass"), sp = r.homebrew.find(x => x.kind === "species");
  check("the UA subclass becomes homebrew for the Ranger", sub && sub.name === "Swarmkeeper [UA]" && sub.cls === "Ranger", JSON.stringify(sub && [sub.name, sub.cls]));
  check("its features keep their levels and text", sub && JSON.stringify(sub.features.map(f => f.l)) === "[3,7,11,15]" && /^You magically attract a swarm/.test(sub.features[0].d) && sub.features[0].n === "Gathered Swarm", JSON.stringify(sub && sub.features.map(f => [f.l, f.n])));
  check("the species becomes homebrew with its bonus and speed", sp && sp.name === "Mark of Sentinel Human" && JSON.stringify(sp.asi) === '{"str":1,"wis":1}' && sp.speed === 30 && sp.traits.length >= 2, JSON.stringify(sp && [sp.name, sp.asi, sp.speed, sp.traits.map(t => t.n)]));
  check("homebrew entries carry who made them and the rules set", r.homebrew.every(x => x.src === "5e Companion App" && x.ed === "2014" && x.id));
  check("known spells match the built-ins", ["Shield", "Mage Hand", "Faerie Fire", "Web"].every(n => c.prepared.some(s => s.n === n && !r.homebrew.some(x => x.name === n))), JSON.stringify(c.prepared.map(s => s.n)));
  const bw = r.homebrew.find(x => x.kind === "spell" && x.name === "Glimmershell Aegis");
  check("a spell the Forge lacks becomes a homebrew spell with its details", bw && bw.l === 0 && /resistance against bludgeoning/i.test(bw.desc) && bw.cp === "VS" && bw.c.includes("Wizard") && c.prepared.some(s => s.n === "Glimmershell Aegis"), JSON.stringify(bw));
  const inv = n => c.inv.find(i => i.n === n);
  check("armour is matched to the Items list", inv("Scale Mail") && inv("Scale Mail").ref && inv("Scale Mail").qty === 1, JSON.stringify(c.inv.map(i => [i.n, i.qty, !!i.ref])));
  check("counts come across", inv("Shortsword") && inv("Shortsword").qty === 2 && c.inv.some(i => /^Arrows?$/i.test(i.n) && i.qty === 20), JSON.stringify(c.inv.map(i => [i.n, i.qty])));
  check("unknown gear is kept by name", c.inv.some(i => /artisan.s tools Of Your Choice/i.test(i.n)));
  check("the generator's own kit isn't added", c.kitMoved === true && c.inv.length === 10, JSON.stringify(c.inv.map(i => i.n)));
  check("coins, XP, alignment and story", c.coins.gp === 10 && c.xp === 23000 && c.align === "Lawful Evil" && /ship is most important/.test(c.bond), JSON.stringify([c.coins, c.xp, c.align, c.bond]));
  check("feature picks the Forge can't hold are listed and kept in notes", r.report.dropped.some(t => /Favored Enem/.test(t)) && r.report.dropped.some(t => /Favored Terrain/.test(t)) && /Aberrations/.test(c.notes) && /Arctic/.test(c.notes), JSON.stringify(r.report.dropped));
  check("the built sheet has the homebrew subclass features", c.feats.includes("Gathered Swarm") && c.feats.includes("Writhing Tide") && !c.feats.includes("Scuttling Eyes"), c.feats.join(" | "));
  check("current HP comes across, capped at max", c.hpCur === Math.min(14, c.hp), `${c.hpCur}/${c.hp}`);
  check("the import is marked", c.importedFrom && c.importedFrom.app === "5e Companion App");
  check("the report names what matched", r.report.matched.some(t => /Folk Hero/.test(t)) && r.report.made.some(t => /Swarmkeeper/.test(t)), JSON.stringify(r.report));

  // levelling up keeps the imported scores
  const lv = await p.evaluate(txt => { const d = compImport(JSON.parse(txt), "2014"); const { c } = importBuild(d); c.hbPending = d.homebrew; PCS.roster.push(c); hbPendSync(); pcLevelTo(c, 8); const sc = c.scores; PCS.roster.pop(); hbPendSync(); return sc; }, ZOOK);
  check("levelling up keeps the imported scores (the ASI goes on top)", lv.str === 5 && lv.con === 13 && lv.int === 14 && lv.cha === 9 && lv.dex + lv.wis === 12 + 15 + 2, JSON.stringify(lv));

  // 2024 rules: scores still match
  const s24 = await p.evaluate(txt => { const d = compImport(JSON.parse(txt), "2024"); return d.error || importBuild(d).c.scores; }, ZOOK);
  check("importing as 2024 rules keeps the scores too", JSON.stringify(s24) === JSON.stringify({ str: 5, dex: 12, con: 13, int: 14, wis: 15, cha: 9 }), JSON.stringify(s24));

  // gender: a field in the file, else the pronouns in the character's own story; rules text and "he or she" don't count
  const g = await p.evaluate(txt => {
    const base = JSON.parse(txt), build = j => { const d = compImport(j, "2014"); return { g: importBuild(d).c.gender, rep: d.report }; };
    return {
      field: build({ ...base, gender: "Female", about: "He is a he, his, him." }),
      story: build({ ...base, about: "She left her village when she was young. Her brother still writes to her.", notes: [] }),
      storyM: build({ ...base, about: "He sailed with his father until he lost him at sea.", notes: [] }),
      none: build({ ...base, about: "A ranger who keeps to the woods. Each player may choose; he or she decides.", notes: [], personalityTraits: "", ideals: "", bonds: "", flaws: "" }),
      unit: [impGender({ pronouns: "they/them" }, ["She she she"]).g, impGender({ x: { sex: "M" } }, []).g, impGender({}, ["his or her choice, he/she may"]).g],
    };
  }, ZOOK);
  check("a gender field in the file is used", g.field.g === "female" && g.field.rep.matched.some(t => /Gender: female \(from the file\)/.test(t)), JSON.stringify(g.field));
  check("otherwise the backstory's pronouns are used", g.story.g === "female" && g.storyM.g === "male" && g.story.rep.matched.some(t => /from the backstory/.test(t)), JSON.stringify([g.story.g, g.storyM.g]));
  check("with nothing to go on, the report says it was picked", ["male", "female"].includes(g.none.g) && g.none.rep.differ.some(t => /doesn't say the character's gender/.test(t)), JSON.stringify(g.none.rep.differ));
  check("pronouns a field gives that the Forge has no names for, a nested 'sex', and 'he or she' text", JSON.stringify(g.unit) === JSON.stringify(["", "male", ""]), JSON.stringify(g.unit));

  // refusals
  // a class the Forge doesn't have becomes a homebrew class, built from the app's own rules text
  const bh = await p.evaluate(txt => {
    const j = JSON.parse(txt), ft = (level, name, text) => ({ level, feat: { name, descriptionModels: [{ description: text }] } });
    j.jobs = [{ jobId: "blood_hunter", level: 5, archetypeId: "bh_lycan" }];
    j.allRequiredClasses = { jobs: [JSON.stringify({ id: "blood_hunter", name: "Blood Hunter", hitDie: "D10", savingThrows: { str: false, dex: true, con: false, intelligence: true, wis: false, cha: false },
      classSkills: [{ amountOfChoice: 3, skillsModels: [{ name: "Athletics" }, { name: "Acrobatics" }, { name: "Arcana" }, { name: "History" }, { name: "Insight" }, { name: "Investigation" }, { name: "Religion" }, { name: "Survival" }] }],
      armorProficiencies: [{ proficiency: "Light Armor" }, { proficiency: "Medium Armor" }, { proficiency: "Shields" }], weaponProficiencies: [{ proficiency: "all_simple" }, { proficiency: "all_martial" }],
      toolProficiencies: [{ proficiency: "Alchemist's Supplies" }], classEquipment: [{ amountOfChoice: 1, equipmentsModels: [{ name: "Scale Mail", number: 1 }] }],
      classWeapon: { abilityName: "Strength", diceAmount: 1, diceTypeName: "D8", name: "Longsword" }, effectiveCasterLevel: "NONE", archetypeSelectionLevel: 3,
      features: [ft(1, "Hunter's Bane", "You have survived the Hunter's Bane."), ft(1, "Blood Maledict", "You can invoke a blood curse."), ft(2, "Crimson Rite", "Your weapon burns with your blood."), ft(5, "Extra Attack", "Attack twice."), ft(7, "Brand of Castigation", "Later.")],
      archetypes: [{ id: "bh_lycan", name: "Order of the Lycan", features: [ft(3, "Heightened Senses", "Advantage on Perception checks that use hearing or smell.")] }] })] };
    const D = compImport(j, "2014"); if (D.error) return { error: D.error };
    const { c } = importBuild(D), hc = D.homebrew.find(x => x.kind === "class");
    return { cls: c.cls, sub: c.subclass, hp: c.hp, con: c.mods.con, saves: c.saves, feats: c.feats.map(f => f.f), made: D.report.made, hc,
      sub2: D.homebrew.find(x => x.kind === "subclass"), stillThere: !!CLASS_DATA["Blood Hunter"] };
  }, ZOOK);
  check("an unknown class is imported as a homebrew class", !bh.error && bh.cls === "Blood Hunter" && bh.made.some(t => /Blood Hunter \(class\)/.test(t)), JSON.stringify(bh.error || bh.made));
  const H = bh.hc || {};
  check("…with the app's hit die, saves, skills and proficiencies", H.hd === 10 && JSON.stringify(H.saves) === '["dex","int"]' && H.skills && H.skills.n === 3 && H.skills.from.length === 8 && JSON.stringify(H.armor) === '["light","medium","shield"]' && /Martial weapons/.test(H.weapons) && /Alchemist/.test(H.tools) && H.kit === "Scale Mail", JSON.stringify(H));
  check("…its features keep their levels and text", (H.features || []).length === 5 && H.features[2].n === "Crimson Rite" && H.features[2].l === 2 && /burns with your blood/.test(H.features[2].d));
  check("the character is built with it: d10 hit points, its saves and features to level 5", bh.hp === 10 + bh.con + 4 * (6 + bh.con) && JSON.stringify(bh.saves) === '["dex","int"]' && ["Hunter's Bane", "Crimson Rite", "Extra Attack"].every(f => bh.feats.includes(f)) && !bh.feats.includes("Brand of Castigation"), JSON.stringify([bh.hp, bh.saves, bh.feats]));
  check("its subclass becomes homebrew for that class", bh.sub === "Order of the Lycan" && bh.sub2 && bh.sub2.cls === "Blood Hunter" && bh.feats.includes("Heightened Senses"));
  check("the class is only there for the build until it's saved", !bh.stillThere);
  const junk = await p.evaluate(() => compImport({ foo: 1 }, "2014"));
  check("a file that isn't a character is refused", /isn't a 5e Companion App character/.test(junk.error || ""), JSON.stringify(junk.error));

  // spelling mistakes, subclass names the Forge spells differently, book subclasses, and older imported homebrew (2026-11-23)
  const sp2 = await p.evaluate(txt => {
    const base = JSON.parse(txt);
    const mk = (cls, archId, archName, extra = {}) => { const j = JSON.parse(JSON.stringify(base)); j.jobs = [{ ...j.jobs[0], jobId: "paladin", archetypeId: archId, subtypeId: null, level: 5 }];
      j.allRequiredClasses = { jobs: [JSON.stringify({ id: "paladin", name: cls, archetypes: archName ? [{ id: archId, name: archName, features: [{ level: 3, feat: { name: "Old App Text" } }] }] : [] })] }; return Object.assign(j, extra); };
    const run = (j, ed) => { const d = compImport(j, ed); if (d.error) return { error: d.error }; const { c, report } = importBuild(d);
      return { cls: c.cls, sub: c.subclass, race: c.race, bg: c.bg, feats: c.feats.map(f => f.f), hb: d.homebrew.map(x => `${x.kind}:${x.name}`), matched: report.matched, differ: report.differ }; };
    const out = {
      ob14: run(mk("Paladin", "paladin_oathbreaker", "Oathbreaker"), "2014"),
      ob24: run(mk("Paladin", "paladin_oathbreaker", "Oathbreaker"), "2024"),
      idOnly: run(mk("Paladin", "paladin_oathbreaker", ""), "2014"),
      typo: run(mk("Paladn", "paladin_devotion", "Oath of Devoton"), "2014"),
      short: run(mk("Paladin", "paladin_devotion", "Devotion"), "2014"),
      other: run(mk("Paladin", "paladin_ashes", "Oath of Ashes"), "2014"),
      spelt: run(mk("Paladin", "paladin_devotion", "Oath of Devotion", { requiredRace: JSON.stringify({ name: "Tieflng" }), requiredBackground: JSON.stringify({ name: "Folk Heroo" }), feats: [{ feat: { name: "Grapler" } }] }), "2014"),
    };
    // homebrew an earlier import made (before the Forge had the book version, or a copy of a built-in) never hides the real one
    const old = [{ id: "hbT1", kind: "subclass", src: "5e Companion App", ed: "2014", cls: "Paladin", name: "Oathbreaker", desc: "", features: [{ l: 3, n: "Old App Text", d: "" }] },
      { id: "hbT2", kind: "subclass", src: "5e Companion App", ed: "2014", cls: "Paladin", name: "Oath of Devotion", desc: "", features: [{ l: 3, n: "Old Devotion Text", d: "" }] }];
    HB.list.push(...old); hbApply();
    out.hadOb = run(mk("Paladin", "paladin_oathbreaker", "Oathbreaker"), "2014");
    out.hadDev = run(mk("Paladin", "paladin_devotion", "Oath of Devotion"), "2014");
    HB.list = HB.list.filter(x => !old.includes(x));
    // a DM's own homebrew of the same name still wins, as before
    const mine = { id: "hbT3", kind: "subclass", src: "", ed: "2014", cls: "Paladin", name: "Oath of Devotion", desc: "", features: [{ l: 3, n: "My Devotion Rule", d: "" }] };
    HB.list.push(mine); hbApply();
    out.dm = run(mk("Paladin", "paladin_devotion", "Oath of Devotion"), "2014");
    HB.list = HB.list.filter(x => x !== mine); hbApply();
    return out;
  }, ZOOK);
  const S = sp2;
  check("Oathbreaker (2014) applies its book features without new homebrew", S.ob14.sub === "Oathbreaker" && S.ob14.feats.includes("Channel Divinity: Dreadful Aspect") && !S.ob14.hb.some(h => /^subclass/.test(h)), JSON.stringify(S.ob14));
  check("Oathbreaker with 2024 rules still applies its features", S.ob24.sub === "Oathbreaker" && S.ob24.feats.includes("Channel Divinity: Dreadful Aspect") && !S.ob24.hb.some(h => /^subclass/.test(h)) && !S.ob24.matched.some(t => /Oathbreaker \(homebrew\)/.test(t)), JSON.stringify(S.ob24));
  check("a subclass named only by its id loses the class prefix (paladin_oathbreaker)", S.idOnly.sub === "Oathbreaker" && S.idOnly.feats.includes("Channel Divinity: Dreadful Aspect") && !S.idOnly.hb.some(h => /^subclass/.test(h)), JSON.stringify(S.idOnly));
  check("misspelled class and subclass are matched (Paladn, Oath of Devoton)", S.typo.cls === "Paladin" && S.typo.sub === "Oath of Devotion" && S.typo.feats.includes("Channel Divinity: Sacred Weapon") && !S.typo.hb.some(h => /^(class|subclass)/.test(h)) && S.typo.differ.some(t => /Paladn/.test(t) && /Paladin/.test(t)), JSON.stringify(S.typo));
  const near = await p.evaluate(() => [impFuzzy([["Gearforged"]], "Warforged"), impFuzzy([["Child of the Sea"]], "Child of the Sun"), impFuzzy([["Gnome"]], "Gnoll"), impFuzzy([["Oath of Devotion"]], "Oath of Devotoin"), impFuzzy([["Paladin"]], "Paladn")].map(m => m && m.name));
  check("a different real name is never swapped in (Warforged, Child of the Sun, Gnoll); typos and swapped letters still match", JSON.stringify(near) === '[null,null,null,"Oath of Devotion","Paladin"]', JSON.stringify(near));
  const mwT = await p.evaluate(() => { const d = mwChar({ name: "Typo", mwId: "t1", sheet: { level: 2, abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, selectionsBySlot: { class: "wizzard", species: "tieflng", background: "acolite" } } }, "2014");
    return d.error ? { error: d.error } : { cls: d.opts.cls, race: d.opts.race, bg: d.opts.bg, made: d.report.made }; });
  check("MythWeaver: misspelled class, species and background are matched", mwT.cls === "Wizard" && mwT.race === "Tiefling" && mwT.bg === "Acolyte" && !mwT.made.length, JSON.stringify(mwT));
  check("a short subclass name is matched (Devotion -> Oath of Devotion)", S.short.sub === "Oath of Devotion" && !S.short.hb.some(h => /^subclass/.test(h)), JSON.stringify(S.short));
  check("a subclass the Forge really lacks still becomes homebrew", S.other.sub === "Oath of Ashes" && S.other.hb.includes("subclass:Oath of Ashes"), JSON.stringify(S.other));
  check("misspelled species, background and feat are matched", S.spelt.race === "Tiefling" && S.spelt.bg === "Folk Hero" && S.spelt.feats.some(f => /Feat: Grappler/.test(f)) && !S.spelt.hb.some(h => !/^spell:/.test(h)), JSON.stringify(S.spelt));
  check("older imported homebrew doesn't hide the book subclass", S.hadOb.sub === "Oathbreaker" && S.hadOb.feats.includes("Channel Divinity: Dreadful Aspect") && !S.hadOb.feats.includes("Old App Text"), JSON.stringify(S.hadOb));
  check("older imported homebrew doesn't hide the built-in subclass", S.hadDev.sub === "Oath of Devotion" && S.hadDev.feats.includes("Channel Divinity: Sacred Weapon") && !S.hadDev.feats.includes("Old Devotion Text"), JSON.stringify(S.hadDev));
  check("a DM's own homebrew of the same name still wins", S.dm.feats.includes("My Devotion Rule"), JSON.stringify(S.dm));

  // the Fifth Edition Character Sheet app's XML (2026-11-18); the fixture is an invented character
  const FECS = fs.readFileSync(path.join(FIX, "fecs-sample.xml"), "utf8");
  const fe = await p.evaluate(txt => {
    if (typeof fecsImport !== "function") return { error: "no fecsImport" };
    const d = fecsImport(txt, "2014"); if (d.error) return { error: d.error };
    const { c } = importBuild(d), inv = d.extras.inv || [], q = n => (inv.find(i => new RegExp(n, "i").test(i.n)) || {}).qty;
    return { name: c.name, cls: c.cls, lv: c.level, sub: c.subclass, multi: (c.multi || []).map(m => m.cls + " " + m.lv).join(), race: c.race, bg: c.bg || "", custom: JSON.stringify(d.report).includes("Custom"),
      scores: AB.map(a => c.scores[a]).join(), skills: c.skills.filter(s => s.p).map(s => s.s), expert: d.opts.keepExpert, prep: d.extras.prepared.map(x => x.n), notes: d.extras.notes, dropped: d.report.dropped.join(" | "),
      hbSpells: d.homebrew.filter(x => x.kind === "spell").length, gp: d.extras.coins.gp, water: q("holy water"), kegs: q("keg"), styles: d.extras.fightStyles, align: d.extras.align, src: d.src, hbBg: d.homebrew.some(x => x.kind === "background") };
  }, FECS);
  check("5e Character Sheet: reads the name, classes and levels", fe.name === "Wren Ashdown" && fe.cls === "Paladin" && fe.lv === 5 && fe.multi === "Bard 2", JSON.stringify(fe));
  check("5e Character Sheet: matches the subclass and species", /Devotion/.test(fe.sub || "") && fe.race === "Tiefling", `${fe.sub} / ${fe.race}`);
  check("5e Character Sheet: a Custom background stays a plain name (no rolled background, no homebrew), and says so", fe.bg === "Custom" && fe.custom && !fe.hbBg, fe.bg);
  check("5e Character Sheet: keeps the file's scores", fe.scores === "16,10,14,8,12,16", fe.scores);
  check("5e Character Sheet: skills, and expertise read from the file", ["Athletics", "Performance", "Persuasion"].every(s => (fe.skills || []).includes(s)) && (fe.expert || []).includes("Athletics"), JSON.stringify([fe.skills, fe.expert]));
  check("5e Character Sheet: a misspelled spell is matched", (fe.prep || []).includes("Cure Wounds") && (fe.prep || []).includes("Bless") && !(fe.prep || []).includes("Thunderwave"), JSON.stringify(fe.prep));
  check("5e Character Sheet: a non-spell goes to notes and the report, not homebrew", /Plus 1 To Smiting/.test(fe.notes || "") && /Plus 1 To Smiting/.test(fe.dropped || "") && fe.hbSpells === 0, JSON.stringify([fe.dropped, fe.hbSpells]));
  check("5e Character Sheet: coins and counted gear (x5, 3x)", fe.gp === 120 && fe.water === 5 && fe.kegs === 3, JSON.stringify([fe.gp, fe.water, fe.kegs]));
  check("5e Character Sheet: fighting style and alignment", (fe.styles || []).includes("Defense") && fe.align === "Chaotic Good", JSON.stringify([fe.styles, fe.align]));
  const fe2 = await p.evaluate(txt => {
    const bare = txt.replace(/<spellList>[\s\S]*?<\/spellList>/, "<spellList></spellList>").replace(/(<noteList>)([\s\S]*?)(<\/noteList>)/, (m, a, b, z) => { const P = b.split("⊠"); P[5] = ""; for (let i = 17; i < 22; i++) P[i] = ""; return a + P.join("⊠") + z; });
    const d = fecsImport(bare, "2014"); if (d.error) return { error: d.error };
    const bold = fecsImport(txt.replace("Wren Ashdown", "<b>Bold</b>".replace(/</g, "&lt;").replace(/>/g, "&gt;")), "2014"), built = importBuild(bold);
    return { ok: !!importBuild(d).c, html: impSummaryHTML(bold, built) };
  }, FECS);
  check("5e Character Sheet: a file without spells, gear or coins still imports", fe2.ok, JSON.stringify(fe2.error));
  check("5e Character Sheet: text from the file is shown as text", /&lt;b&gt;/.test(fe2.html || "") && !/<b>Bold/.test(fe2.html || ""));
  const fe3 = await p.evaluate(async () => {
    const read = async t => impCharRead(new File([t], "x.xml"), "2014");
    const a = await read('<?xml version="1.0"?><notes/>'), b = await read("<character><classData>Paladin");
    return [a.error || "", b.error || ""];
  });
  check("5e Character Sheet: an XML file that isn't a character is refused kindly", /Fifth Edition Character Sheet/.test(fe3[0]) && /Fifth Edition Character Sheet/.test(fe3[1]), JSON.stringify(fe3));
  check("5e Character Sheet: the report names the app", fe.src === "Fifth Edition Character Sheet");
  // reviewer fixes (2026-11-18)
  const fx = await p.evaluate(txt => {
    const X = "\u22a0", D = "\u22a1", M = "\u229f";
    const qty = ["Wax 2", "Sphinx 1", "holy water x5", "3x kegs", "pogs 100x", "Box"].map(fecsQty);
    /* two classes, each with a fighting style; the second written with the mojibake form of the separator */
    const moj = "\u00e2\u008a\u00a1";
    const two = txt.replace(`fighting style${D}Defense`, `fighting style${D}Defense${M}fighting style${moj}Dueling`);
    const d2 = fecsImport(two, "2014");
    /* a monk-like file: the app's speed is lower than the Forge's -> no "Speed" line; higher -> a line */
    const slow = importBuild(fecsImport(txt.replace("<baseSpeed>30</baseSpeed>", "<baseSpeed>25</baseSpeed>"), "2014")).report.differ.join(" | ");
    const fast = importBuild(fecsImport(txt.replace("<speedMiscMod>0</speedMiscMod>", "<speedMiscMod>10</speedMiscMod>"), "2014")).report.differ.join(" | ");
    /* the summary's homebrew hint for a file whose subclass is new */
    const hbF = fecsImport(txt.replace("Oath of Devotion", "Oath of the Quiet Tide"), "2014"), hint = impSummaryHTML(hbF, importBuild(hbF));
    return { qty, styles: d2.extras.fightStyles, slow, fast, hint };
  }, FECS);
  check("5e Character Sheet: counts don't eat a name ending in x", JSON.stringify(fx.qty) === JSON.stringify(["Wax 2", "Sphinx 1", "5 holy water", "3 kegs", "100 pogs", "Box"]), JSON.stringify(fx.qty));
  check("5e Character Sheet: every fighting style is read, with either form of the separator", JSON.stringify(fx.styles) === '["Defense","Dueling"]', JSON.stringify(fx.styles));
  check("5e Character Sheet: a lower speed in the app isn't flagged (class speed bonuses)", !/Speed is/.test(fx.slow), fx.slow);
  check("5e Character Sheet: a higher speed in the app is flagged (feats and items)", /Speed is 30 in the Forge \(the sheet says 40\)/.test(fx.fast), fx.fast);
  check("5e Character Sheet: the homebrew hint fits this app's files", /names only/.test(fx.hint) && !/A PDF/.test(fx.hint), fx.hint.slice(0, 200));

  const UI = path.join(__dirname, "char-import-ui.cjs"); // the dialog checks (added with the dialog)
  if (fs.existsSync(UI)) await require(UI)(p, { URL, check, zook: { name: "companion-zook.json", mimeType: "application/json", buffer: Buffer.from(ZOOK) } });
  await require("./char-import-pdf.cjs")(p, { URL, check, FIX, errs, ctx });
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll character import checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
