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
const ZOOK = fs.readFileSync(path.join(FIX, "companion-zook.json"), "utf8");

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
  const bw = r.homebrew.find(x => x.kind === "spell" && x.name === "Blade Ward");
  check("a spell the Forge lacks becomes a homebrew spell with its details", bw && bw.l === 0 && /resistance against bludgeoning/i.test(bw.desc) && bw.cp === "VS" && bw.c.includes("Wizard") && c.prepared.some(s => s.n === "Blade Ward"), JSON.stringify(bw));
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
  const bh = await p.evaluate(txt => { const j = JSON.parse(txt); j.jobs = [{ jobId: "blood_hunter", level: 3 }]; j.allRequiredClasses = { jobs: [JSON.stringify({ id: "blood_hunter", name: "Blood Hunter", archetypes: [] })] }; return compImport(j, "2014"); }, ZOOK);
  check("an unknown class is refused by name", /doesn't support the Blood Hunter class/.test(bh.error || ""), JSON.stringify(bh.error));
  const junk = await p.evaluate(() => compImport({ foo: 1 }, "2014"));
  check("a file that isn't a character is refused", /isn't a 5e Companion App character/.test(junk.error || ""), JSON.stringify(junk.error));

  const UI = path.join(__dirname, "char-import-ui.cjs"); // the dialog checks (added with the dialog)
  if (fs.existsSync(UI)) await require(UI)(p, { URL, check, FIX, errs, ctx });
  await require("./char-import-pdf.cjs")(p, { URL, check, FIX, errs, ctx });
  check("no page errors", errs.length === 0, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll character import checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
