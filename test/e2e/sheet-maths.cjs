// Character sheet maths checked against the rules, across both rule sets, all 12 classes and many levels. Run with:  npm run test:sheet
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..", "..", "public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png" };
let fails = 0;
const check = (name, bad) => { const ok = !bad.length; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  -> ${bad.length} sheet(s), e.g. ${bad.slice(0, 3).join(" | ")}`)); if (!ok) fails++; };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), f = path.join(ROOT, u.pathname === "/" ? "index.html" : decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(b); });
});
(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const p = await browser.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  await p.goto(URL); await p.waitForFunction(() => typeof generateCharacter === "function");

  const R = await p.evaluate(() => {
    const bad = { prof: [], mods: [], range: [], saves: [], hp: [], skills: [], init: [], passive: [], spell: [], slots: [], level: [], errors: [] };
    // the rules, written out independently of the app
    const FULL = [null, [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
    const HD = { Barbarian: 12, Bard: 8, Cleric: 8, Druid: 8, Fighter: 10, Monk: 8, Paladin: 10, Ranger: 10, Rogue: 8, Sorcerer: 6, Warlock: 8, Wizard: 6 };
    const SAVES = { Barbarian: "con,str", Bard: "cha,dex", Cleric: "cha,wis", Druid: "int,wis", Fighter: "con,str", Monk: "dex,str", Paladin: "cha,wis", Ranger: "dex,str", Rogue: "dex,int", Sorcerer: "cha,con", Warlock: "cha,wis", Wizard: "int,wis" };
    const FULLC = ["Bard", "Cleric", "Druid", "Sorcerer", "Wizard"], HALF = ["Paladin", "Ranger"];
    const has = (c, re) => re.test(JSON.stringify([c.feats, c.extras, c.traits, c.bonusFeats, c.asiPicks, c.subclass, c.race, c.sub]));
    let n = 0;
    for (const ed of ["2014", "2024"]) for (const cls of Object.keys(HD)) for (const lv of [1, 2, 3, 4, 5, 8, 11, 17, 20]) for (const seed of ["A", "B"]) {
      let c; const tag = `${ed} ${cls} L${lv} ${seed}`;
      try { c = generateCharacter({ seed: "MATH" + seed + cls + lv, name: "T", ed, cls, level: lv }); } catch (e) { bad.errors.push(tag + ": " + e.message); continue; }
      n++;
      const pb = 2 + Math.floor((lv - 1) / 4);
      if (c.prof !== pb) bad.prof.push(`${tag}: ${c.prof} not ${pb}`);
      for (const k of ["str", "dex", "con", "int", "wis", "cha"]) {
        if (c.mods[k] !== Math.floor((c.scores[k] - 10) / 2)) bad.mods.push(`${tag} ${k}`);
        if (c.scores[k] < 3 || (c.scores[k] > 20 && lv < 19)) bad.range.push(`${tag} ${k}=${c.scores[k]}`);
      }
      // extra save proficiencies that are allowed: Gloom Stalker's Iron Mind, Monk's Diamond Soul (14), Rogue's Slippery Mind (15), Resilient
      const extraOk = /Gloom Stalker/.test(c.subclass || "") || (cls === "Monk" && lv >= 14) || (cls === "Rogue" && lv >= 15) || has(c, /Resilient/);
      if (!SAVES[cls].split(",").every(k => c.saves.includes(k)) || (!extraOk && c.saves.slice().sort().join() !== SAVES[cls])) bad.saves.push(`${tag}: ${c.saves}`);
      // HP: max at level 1, then the fixed average; leave out anything that adds HP on purpose
      if (!has(c, /Tough|Fortitude|Draconic|Dwarf|Hill/)) { // these add HP on purpose
        const hd = HD[cls], con = c.mods.con, want = Math.max(1, hd + con) + (lv - 1) * Math.max(1, hd / 2 + 1 + con);
        if (c.hp !== want) bad.hp.push(`${tag}: ${c.hp} not ${want}`);
      }
      // skills: ability mod, + proficiency, + proficiency again for expertise; Jack of All Trades (bard 2+) adds half when not proficient
      const jack = cls === "Bard" && lv >= 2, ra = cls === "Fighter" && c.subclass === "Champion" && lv >= 7 && ed === "2014";
      c.skills.forEach(s => {
        let want = c.mods[s.ab] + (s.p ? c.prof : 0) + (s.x ? c.prof : 0);
        if (!s.p && jack) want += Math.floor(c.prof / 2);
        if (!s.p && ra && ["str", "dex", "con"].includes(s.ab)) want += Math.ceil(c.prof / 2);
        if (s.v !== want) bad.skills.push(`${tag} ${s.s}: ${s.v} not ${want}`);
      });
      // initiative: Dex, plus Alert (2014: +5, 2024: + proficiency), plus homebrew; Jack of All Trades also counts in 2024? no.
      if (!/Gloom Stalker/.test(c.subclass || "")) {
        let want = c.mods.dex + (c.initBonus || 0); // initBonus already holds Alert and homebrew
        if (c.feats.some(f => f.f === "Feat: Alert") && c.initBonus < (ed === "2014" ? 5 : c.prof)) bad.init.push(`${tag}: Alert missing from initiative`);
        if (jack && ed === "2014") want += Math.floor(c.prof / 2); // initiative is a Dexterity check in 2014
        if (ra) want += Math.ceil(c.prof / 2);
        if (c.init !== want) bad.init.push(`${tag}: ${c.init} not ${want}`);
      }
      const per = c.skills.find(s => s.s === "Perception");
      if (!has(c, /Observant/) && c.passive !== 10 + per.v) bad.passive.push(`${tag}: ${c.passive} not ${10 + per.v}`);
      if (c.spell && !c.spell.pact) {
        const m = c.mods[c.spell.ab], b = c.spell.bonus || 0;
        if (c.spell.dc !== 8 + c.prof + m + b || c.spell.atk !== c.prof + m + b) bad.spell.push(`${tag}: DC ${c.spell.dc} atk ${c.spell.atk}`);
      }
      // spell slots
      const slots = c.spell && c.spell.slots ? c.spell.slots.join() : "";
      if (FULLC.includes(cls) && slots !== FULL[lv].join()) bad.slots.push(`${tag}: [${slots}] not [${FULL[lv]}]`);
      if (HALF.includes(cls)) {
        const want = ed === "2024" ? FULL[Math.ceil(lv / 2)] : lv >= 2 ? FULL[Math.ceil(lv / 2)] : [];
        if (slots !== want.join()) bad.slots.push(`${tag}: [${slots}] not [${want}]`);
      }
      if (cls === "Warlock") {
        const k = lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 2 ? 2 : 1, sl = Math.min(5, Math.ceil(lv / 2));
        if (!new RegExp(`${k} pact slots? of level ${sl}`).test(c.spell.note || "")) bad.slots.push(`${tag}: "${c.spell.note}"`);
      }
      // levelling up keeps the character's own scores and skills
      if (lv < 20 && seed === "A") {
        const before = JSON.stringify(c.base), skills = c.skills.filter(s => s.p).map(s => s.s);
        const c2 = JSON.parse(JSON.stringify(c)); pcLevelTo(c2, lv + 1);
        if (JSON.stringify(c2.base) !== before) bad.level.push(`${tag}: base scores changed`);
        const lost = skills.filter(s => !c2.skills.find(x => x.s === s && x.p)); if (lost.length) bad.level.push(`${tag}: lost ${lost}`);
        if (c2.level !== lv + 1) bad.level.push(`${tag}: level ${c2.level}`);
      }
    }
    // Draconic sorcerers: +1 HP per sorcerer level from Draconic Resilience (2014 from level 1, 2024 from level 3), counted once
    for (const [ed, sub, lv] of [["2014", "Draconic Bloodline", 5], ["2024", "Draconic Sorcery", 5]]) {
      const c = generateCharacter({ seed: "DRAC" + ed, name: "T", ed, cls: "Sorcerer", level: lv, subclass: sub });
      const base = Math.max(1, 6 + c.mods.con) + (lv - 1) * Math.max(1, 4 + c.mods.con);
      if (c.subclass !== sub) bad.hp.push(`${ed} draconic: got subclass ${c.subclass}`);
      else if (!has(c, /Tough|Fortitude|Dwarf|Hill/) && c.hp !== base + lv) bad.hp.push(`${ed} ${sub}: ${c.hp} not ${base + lv}`);
    }
    return { n, bad };
  });
  console.log(`(checked ${R.n} generated sheets)`);
  check("the sheets build without errors", R.bad.errors);
  check("proficiency bonus matches the level", R.bad.prof);
  check("ability modifiers match the scores", R.bad.mods);
  check("ability scores stay between 3 and 20 (before epic boons)", R.bad.range);
  check("saving throws are the class's", R.bad.saves);
  check("hit points: max at level 1, then the fixed average", R.bad.hp);
  check("skill bonuses (proficiency, expertise, Jack of All Trades)", R.bad.skills);
  check("initiative (Dex, Alert)", R.bad.init);
  check("passive Perception is 10 + Perception", R.bad.passive);
  check("spell save DC and attack bonus", R.bad.spell);
  check("spell slots for full, half and pact casters", R.bad.slots);
  check("levelling up keeps scores and skills", R.bad.level);
  check("no page errors", errs);
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll sheet maths checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
