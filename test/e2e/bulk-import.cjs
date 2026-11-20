// Bulk import (2026-11-20): Homebrew tab → 📥 Bulk import, CSV or JSON files of spells, feats, species, backgrounds,
// subclasses, magic items and monsters. Run with:  npm run test:bulk
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "forge-bulk-"));
const file = (name, text) => { const p = path.join(tmp, name); fs.writeFileSync(p, text); return p; };

// a made-up file with every kind, written the way Excel saves it in Europe (semicolons, quoted cells with line breaks)
const MIXED = [
  "kind;name;level;school;classes;casting_time;range;components;material;duration;concentration;ritual;description;higher_levels;prerequisite;ability_increase;speed;ability_bonuses;skills;trait;trait_text;subrace;class;feature;feature_text;equipment;type;rarity;attunement;stat_block",
  'spell;Frost Lantern;2;evocation;Wizard, Sorcerer, Gunslinger;1 action;60 feet;V,S;;1 minute;yes;no;"A lantern of cold light.\nIt hums.";;;;;;;;;;;;;;;;;',
  "spell;Fireball;3;Evocation;Wizard;1 action;150 feet;VSM;;Instantaneous;no;no;Already in the SRD.;;;;;;;;;;;;;;;;;",
  "feat;Quick Hands;;;;;;;;;;;You are quick.;;Dexterity 13;Dexterity;;;;;;;;;;;;;;",
  "species;Puddlefolk;;;;;;;;;;;Small and damp.;;;;25;dex +2, con +1;Stealth, Survival;;;;;;;;;;;",
  "species;Puddlefolk;;;;;;;;;;;;;;;;;;Splash;You can't drown in a puddle.;;;;;;;;;",
  "species;Puddlefolk;;;;;;;;;;;;;;;;wis +1;;;Deep puddles call to you.;Deep Puddlefolk;;;;;;;;",
  "background;Ferryman;;;;;;;;;;;You carried people across.;;;;;;Athletics, Persuasion;;;;;;;A pole and a lantern;;;;",
  "subclass;Path of the Puddle;;;;;;;;;;;Barbarians who splash.;;;;;;;;;;Barbarian;Splash Rage;When you rage, you splash.;;;;;",
  "subclass;Path of the Puddle;6;;;;;;;;;;;;;;;;;;;;Barbarian;Wet Skin;You resist fire damage.;;;;;",
  "subclass;Order of Nobody;;;;;;;;;;;;;;;;;;;;;Plumber;Wrench;Hits pipes.;;;;;",
  "item;Damp Cloak;;;;;;;;;;;While you wear it you are always slightly damp.;;;;;;;;;;;;;;Wondrous Item;Uncommon;yes;",
  'monster;Puddle Imp;;;;;;;;;;;;;;;;;;;;;;;;;;;;"Small fiend, chaotic evil\nArmor Class 13\nHit Points 10 (3d6)\nSpeed 20 ft., swim 30 ft.\nSTR 6 (-2) DEX 16 (+3) CON 10 (+0) INT 8 (-1) WIS 10 (+0) CHA 8 (-1)\nSenses passive Perception 10\nChallenge 1/4 (50 XP)\nSplash. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) bludgeoning damage."',
  "potion;Not A Kind;;;;;;;;;;;;;;;;;;;;;;;;;;;;",
  "spell;<img src=x onerror=alert(1)>;1;Illusion;Wizard;1 action;Self;V;;1 round;no;no;Escaped?;;;;;;;;;;;;;;;;;"
].join("\r\n");

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: "block", acceptDownloads: true });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => { errs.push("dialog: " + d.message()); d.dismiss(); });
  await p.goto(URL + "#homebrew"); await p.waitForFunction(() => typeof biPlan === "function" && $("#storeBadge").textContent !== "Connecting…", null, { timeout: 15000 });

  // every template reads back as one clean entry
  const tpl = await p.evaluate(() => Object.keys(BI_COLS).map(k => { const R = biRead(biTemplate(k)), P = R.rows ? biPlan(R.rows) : { add: [], probs: [R.error], skip: [] }; return { k, add: P.add.length, kinds: P.add.map(e => e.kind), probs: P.probs, skip: P.skip }; }));
  check("templates: each reads back as one entry with no problems", tpl.every(t => t.add === 1 && t.kinds[0] === t.k && !t.probs.length && !t.skip.length), JSON.stringify(tpl));

  // the window, its template downloads, and a mixed file
  await p.click("#hbBulk"); await p.waitForTimeout(150);
  check("window: opens from the Homebrew tab with a template per kind", await p.evaluate(() => $("#bulkModal").classList.contains("open") && $$("#bulkTpl [data-bitpl]").length === 7));
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click('[data-bitpl="species"]')]);
  const dlText = fs.readFileSync(await dl.path(), "utf8");
  check("window: a template downloads as a CSV with a header row", dl.suggestedFilename() === "forge-species-template.csv" && dlText.startsWith("kind,name,speed,ability_bonuses"), dl.suggestedFilename() + " " + dlText.slice(0, 60));
  await p.setInputFiles("#bulkFile", file("mixed.csv", MIXED)); await p.waitForTimeout(400);
  const pv = await p.evaluate(() => ({ text: $("#bulkOut").textContent, imgs: $$("#bulkOut img").length, go: $("#bulkGo").textContent, dis: $("#bulkGo").disabled, plan: BI.plan && { add: BI.plan.add.map(e => e.kind + ":" + e.name), skip: BI.plan.skip, probs: BI.plan.probs } }));
  check("preview: lists what will be added", pv.plan && pv.plan.add.length === 8 && !pv.dis && pv.go === "Add 8", JSON.stringify(pv.plan));
  check("preview: an SRD spell is skipped", pv.plan.skip.some(s => /^Fireball/.test(s)), JSON.stringify(pv.plan.skip));
  check("preview: an unknown kind and an unknown class are problems", pv.plan.probs.some(s => /Not A Kind|potion/.test(s)) && pv.plan.probs.some(s => /Plumber/.test(s)), JSON.stringify(pv.plan.probs));
  check("preview: a class the Forge doesn't know is left off a spell, with a note", pv.plan.probs.some(s => /Frost Lantern.*Gunslinger/.test(s)), JSON.stringify(pv.plan.probs));
  check("preview: names are shown as text, never as page code", pv.imgs === 0 && pv.text.includes("<img src=x"), String(pv.imgs));
  await p.click("#bulkGo"); await p.waitForTimeout(500);
  const got = await p.evaluate(() => {
    const h = n => HB.list.find(x => x.name === n);
    const sp = h("Frost Lantern"), ft = h("Quick Hands"), pf = h("Puddlefolk"), bg = h("Ferryman"), sc = h("Path of the Puddle");
    const it = IT.custom.find(x => x.n === "Damp Cloak"); mbLoadLib(); const mon = MB.lib.find(x => x.name === "Puddle Imp");
    return { open: $("#bulkModal").classList.contains("open"), stored: JSON.parse(localStorage.getItem("dmforge.homebrew.v1") || "[]").length,
      sp: sp && { l: sp.l, s: sp.s, c: sp.c, co: sp.co, ri: sp.ri, cp: sp.cp, desc: sp.desc }, ft: ft && { req: ft.req, ab: ft.ab },
      pf: pf && { speed: pf.speed, asi: pf.asi, skills: pf.skills, traits: pf.traits.map(t => t.n), subs: pf.subs },
      bg: bg && { skills: bg.skills, gear: bg.gear }, sc: sc && { cls: sc.cls, f: sc.features.map(f => f.l + " " + f.n) },
      it: it && { r: it.r, att: it.att, cat: it.cat }, mon: mon && { ac: mon.ac, needs: !!mon.needsStats, cr: mon.cr },
      races: raceList("2014").includes("Puddlefolk"), r14: JSON.stringify(raceInfo("2014", "Puddlefolk", "Deep Puddlefolk").asi), subs: subclassList("2014", "Barbarian").some(x => x[0] === "Path of the Puddle"),
      side: $$("#hbSide [data-hbsel]").length, img: HB.list.some(x => x.name.startsWith("<img")) };
  });
  check("add: the window closes and the homebrew is saved", !got.open && got.stored === 6, JSON.stringify([got.open, got.stored]));
  check("add: spell fields", got.sp && got.sp.l === 2 && got.sp.s === "Evocation" && got.sp.c.join() === "Wizard,Sorcerer" && got.sp.co && !got.sp.ri && got.sp.cp === "VS" && /\n/.test(got.sp.desc), JSON.stringify(got.sp));
  check("add: feat prerequisite and ability", got.ft && got.ft.req === "dex13" && got.ft.ab === "dex", JSON.stringify(got.ft));
  check("add: species from several rows, with its subrace's bonus", got.pf && got.pf.speed === 25 && JSON.stringify(got.pf.asi) === JSON.stringify({ dex: 2, con: 1 }) && got.pf.traits.join() === "Splash" && got.pf.subs[0].n === "Deep Puddlefolk" && got.pf.subs[0].asi.wis === 1 && got.r14 === JSON.stringify({ dex: 2, con: 1, wis: 1 }), JSON.stringify([got.pf, got.r14]));
  check("add: a species keeps one skill on the sheet", got.pf && got.pf.skills.join() === "Stealth", JSON.stringify(got.pf && got.pf.skills));
  check("add: background", got.bg && got.bg.skills.join() === "Athletics,Persuasion" && got.bg.gear === "A pole and a lantern", JSON.stringify(got.bg));
  check("add: subclass features by level (no level = the class's subclass level)", got.sc && got.sc.cls === "Barbarian" && got.sc.f.join() === "3 Splash Rage,6 Wet Skin", JSON.stringify(got.sc));
  check("add: magic item to Items → Custom", got.it && got.it.r === "Uncommon" && got.it.att === "Required", JSON.stringify(got.it));
  check("add: monster with its stat block to My monsters", got.mon && got.mon.ac === 13 && !got.mon.needs, JSON.stringify(got.mon));
  check("add: characters can choose them", got.races && got.subs);
  check("add: the Homebrew tab lists them", got.side >= 6, String(got.side));

  // the same file again adds nothing
  await p.click("#hbBulk"); await p.setInputFiles("#bulkFile", file("mixed2.csv", MIXED)); await p.waitForTimeout(400);
  const again = await p.evaluate(() => ({ add: BI.plan.add.length, skip: BI.plan.skip.length, dis: $("#bulkGo").disabled }));
  check("again: everything is skipped", again.add === 0 && again.skip >= 8 && again.dis, JSON.stringify(again));

  // the editor keeps a subrace's bonus when the species is saved again
  const ed = await p.evaluate(() => { const x = HB.list.find(y => y.name === "Puddlefolk"); return JSON.stringify(hbItemOf(hbDraftOf(x)).subs); });
  check("editor: saving a species again keeps its subrace's bonus", /"asi":\{"wis":1\}/.test(ed), ed);

  // JSON, and files that can't be read
  await p.setInputFiles("#bulkFile", file("list.json", JSON.stringify([{ kind: "feat", name: "Json Feat", desc: "From JSON.", prerequisite: "None" }, { kind: "spells", name: "Json Spell", level: "cantrip", school: "Divination", classes: ["Cleric"] }])));
  await p.waitForTimeout(300);
  const js = await p.evaluate(() => BI.plan && BI.plan.add.map(e => e.kind + ":" + e.name + ":" + (e.x.l ?? "")).join());
  check("json: a list of entries works, with column names as keys", js === "feat:Json Feat:,spell:Json Spell:0", js);
  const bad = await p.evaluate(() => [biRead("").error, biRead("a,b\n1,2").error, biRead("kind,name\n").error, biRead("[1,").error, biRead(JSON.stringify({ x: 1 })).error, biRead("kind,name\n" + "spell,x\n".repeat(3001)).error]);
  check("errors: empty, no name column, header only, broken JSON, not a list, too many rows", bad.every(Boolean) && /3,000/.test(bad[5]), JSON.stringify(bad));
  await p.click("#bulkCancel");

  // signed in as the campaign's DM: each entry goes to the campaign, one by one
  const cloud = await p.evaluate(async () => {
    const calls = [], keep = window.Portal;
    window.Portal = { cloud: true, isDM: () => true, campName: () => "Test", hbPut: async x => { calls.push(x.name); return x.name !== "Cloud Two"; } };
    const P = biPlan(biRead("kind,name,prerequisite,ability_increase,description\nfeat,Cloud One,,,One\nfeat,Cloud Two,,,Two").rows), steps = [];
    const R = await biCommit(P, (n, t) => steps.push(n + "/" + t)); window.Portal = keep;
    return { calls, R, steps };
  });
  check("signed in: entries go to the campaign one by one, and a failure is counted", cloud.calls.join() === "Cloud One,Cloud Two" && cloud.R.hb === 1 && cloud.R.fail === 1 && cloud.steps.join() === "1/2,2/2", JSON.stringify(cloud));

  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
