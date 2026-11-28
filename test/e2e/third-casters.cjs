// Eldritch Knight and Arcane Trickster spellcasting (2026-11-19): third casters with the wizard list and Intelligence.
// Run with:  npm run test:third
const http = require("http"), fs = require("fs"), path = require("path");
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

(async () => {
  await new Promise(r => server.listen(0, r));
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, serviceWorkers: "block" });
  await ctx.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
  const errs = [];
  const p = await ctx.newPage(); p.on("pageerror", e => errs.push(e.message));
  await p.goto(URL + "#roster"); await p.waitForFunction(() => typeof generateCharacter === "function" && $("#storeBadge").textContent !== "Connecting…", null, { timeout: 15000 });

  const info = (o) => p.evaluate(o => { const c = pcEnsure(generateCharacter({ seed: "T3", ...o })); const L = spellLimits(c); return { spell: c.spell && { ab: c.spell.ab, slots: c.spell.slots, max: c.spell.max, cantrips: c.spell.cantrips, list: c.spell.list }, L, sub: c.subclass, mageHand: isPrep(c, "Mage Hand", o.ed) }; }, o);
  for (const ed of ["2014", "2024"]) {
    const ek3 = await info({ cls: "Fighter", level: 3, ed, subclass: "Eldritch Knight" });
    check(`${ed} Eldritch Knight 3: Intelligence, the wizard list, two 1st-level slots`, ek3.spell && ek3.spell.ab === "int" && JSON.stringify(ek3.spell.slots) === "[2]" && ek3.spell.max === 1 && ek3.spell.cantrips && ek3.spell.list === "Wizard", JSON.stringify(ek3));
    check(`${ed} Eldritch Knight 3: 3 spells and 2 cantrips`, ek3.L && ek3.L.n === 3 && ek3.L.cantrips === 2 && ek3.L.word === (ed === "2014" ? "known" : "prepared"), JSON.stringify(ek3.L));
    const ek7 = await info({ cls: "Fighter", level: 7, ed, subclass: "Eldritch Knight" });
    check(`${ed} Eldritch Knight 7: slots 4 and 2`, ek7.spell && JSON.stringify(ek7.spell.slots) === "[4,2]" && ek7.spell.max === 2, JSON.stringify(ek7.spell));
    const ek19 = await info({ cls: "Fighter", level: 19, ed, subclass: "Eldritch Knight" });
    check(`${ed} Eldritch Knight 19: slots 4, 3, 3 and 1`, ek19.spell && JSON.stringify(ek19.spell.slots) === "[4,3,3,1]", JSON.stringify(ek19.spell));
    const ek20 = await info({ cls: "Fighter", level: 20, ed, subclass: "Eldritch Knight" });
    check(`${ed} Eldritch Knight 20: 13 spells and 3 cantrips`, ek20.L && ek20.L.n === 13 && ek20.L.cantrips === 3, JSON.stringify(ek20.L));
    const at3 = await info({ cls: "Rogue", level: 3, ed, subclass: "Arcane Trickster" });
    check(`${ed} Arcane Trickster 3: Intelligence, wizard list, 3 spells, Mage Hand and 2 cantrip choices`, at3.spell && at3.spell.ab === "int" && at3.spell.list === "Wizard" && at3.L.n === 3 && at3.L.cantrips === 2 && at3.mageHand, JSON.stringify(at3));
    const at10 = await info({ cls: "Rogue", level: 10, ed, subclass: "Arcane Trickster" });
    check(`${ed} Arcane Trickster 10: 7 spells, Mage Hand and 3 cantrip choices, slots 4 and 3`, at10.L.n === 7 && at10.L.cantrips === 3 && at10.mageHand && JSON.stringify(at10.spell.slots) === "[4,3]", JSON.stringify(at10));
    const champ = await info({ cls: "Fighter", level: 7, ed, subclass: "Champion" });
    check(`${ed} a Champion still has no spellcasting`, !champ.spell, JSON.stringify(champ.spell));
    const f2 = await info({ cls: "Fighter", level: 2, ed });
    check(`${ed} a Fighter 2 (no subclass yet) has no spellcasting`, !f2.spell);
  }
  // multiclass: Wizard 5 + Eldritch Knight 3 counts a third of the fighter levels (caster level 6)
  const mc = await p.evaluate(() => { const c = pcEnsure(generateCharacter({ seed: "MC3", cls: "Wizard", level: 5, ed: "2014", multi: [{ cls: "Fighter", lv: 3, subclass: "Eldritch Knight" }] })); return { slots: c.spell.slots, others: (c.spell.others || []).map(o => o.cls) }; });
  check("Wizard 5 / Eldritch Knight 3 uses caster level 6 for slots", JSON.stringify(mc.slots) === JSON.stringify([4, 3, 3]) && mc.others.includes("Fighter"), JSON.stringify(mc));
  // the spells it can prepare come from the wizard list
  const pool = await p.evaluate(() => { const c = pcEnsure(generateCharacter({ seed: "EKP", cls: "Fighter", level: 5, ed: "2014", subclass: "Eldritch Knight" })); const names = pcSpellPool(c, "2014").map(s => s.n); return { shield: names.includes("Shield"), cure: names.includes("Cure Wounds"), fireball: names.includes("Fireball"), firebolt: names.includes("Fire Bolt"), n: names.length }; });
  check("an Eldritch Knight prepares from the wizard list, up to the levels its slots reach", pool.shield && !pool.cure && !pool.fireball && pool.firebolt, JSON.stringify(pool));
  // levelling a Fighter 2 to 3 as an Eldritch Knight brings spellcasting with it
  const lv = await p.evaluate(() => { const c = pcEnsure(generateCharacter({ seed: "LV3", cls: "Fighter", level: 2, ed: "2024" })); c.subclass = "Eldritch Knight"; pcLevelTo(c, 3); return { spell: !!c.spell, slots: c.spell && c.spell.slots }; });
  check("levelling to 3 as an Eldritch Knight gives spell slots", lv.spell && JSON.stringify(lv.slots) === "[2]", JSON.stringify(lv));
  // the sheet shows a Spells box with the wizard list's Browse button
  await p.evaluate(() => { currentPC = pcEnsure(generateCharacter({ seed: "EKS", name: "Sir Vex", cls: "Fighter", level: 5, ed: "2014", subclass: "Eldritch Knight" })); keepPC(); });
  await p.waitForTimeout(300);
  check("the sheet shows the Spells box with spell save DC and slots", await p.evaluate(() => { const s = document.querySelector("#sec-spells"); return !!s && /Spell save DC/.test(s.textContent) && !!document.querySelector('#rosterMain [data-use="slot1"]'); }));
  check("its Browse button opens the wizard list", await p.evaluate(() => /^Wizard\|/.test((document.querySelector("#rosterMain [data-spells]") || {}).dataset?.spells || "")));
  // characters saved before this change (no spell block) get it when their sheet opens, keeping current HP
  for (const lv of [5, 20]) {
    const up = await p.evaluate(lv => {
      const c = pcEnsure(generateCharacter({ seed: "OLD" + lv, name: "Old Knight " + lv, cls: "Fighter", level: lv, ed: "2014", subclass: "Eldritch Knight" }));
      c.spell = null; c.hpCur = 7; c.id = "old" + lv; PCS.roster.push(c); pcPersist(); RC.id = c.id; renderRosterTab();
      const k = PCS.roster.find(x => x.id === "old" + lv); return { slots: k.spell && k.spell.slots, hpCur: k.hpCur, box: !!document.querySelector("#sec-spells") };
    }, lv);
    check(`an Eldritch Knight ${lv} saved before spellcasting gets it when the sheet opens`, up.slots && up.slots.length > 0 && up.box && up.hpCur === 7, JSON.stringify(up));
  }
  // the level-up window at 3 says what spellcasting the subclass brings
  const gains = await p.evaluate(() => { const c = pcEnsure(generateCharacter({ seed: "G3", cls: "Fighter", level: 2, ed: "2024" })); LV.c = c; LV.pick = "Eldritch Knight"; const g = lvGains(c, 3).join(" | "); LV.c = null; LV.pick = ""; return g; });
  check("levelling to 3 as an Eldritch Knight lists the new spellcasting", /Spellcasting/.test(gains) && /slot/i.test(gains) && /3 spells/.test(gains), gains);
  const open=await p.evaluate(()=>{
    const make=(cls,subclass,level,ed="2014",race="Human",multi)=>pcEnsure(generateCharacter({
      seed:"OPEN-THIRD",ed,cls,subclass,level,race,bg:"Sage",multi,
    }));
    const config=[
      ["Fighter","Arcane Warrior","Human","int","Wizard",null],
      ["Rogue","Eldritch Trickster","Human","int","Wizard","Mage Hand"],
      ["Rogue","Soulspy","Human","wis","Cleric",null],
      ["Rogue","Underfoot","Erina","wis","Druid","Shillelagh"],
    ];
    const levels=[];
    for(const [cls,name,race,ab,list,fixed] of config)for(const ed of ["2014","2024"]){
      const low=make(cls,name,3,ed,race),at10=make(cls,name,10,ed,race),high=make(cls,name,20,ed,race);
      const keys=openThirdChoiceKeys(name),limits=c=>keys.map(key=>CHOICES[key].n(c));
      const expectedHigh=name==="Arcane Warrior"||name==="Eldritch Trickster"?[3,4,9]:[name==="Soulspy"?4:3,9,4];
      const actual={
        slots:low.spell?.slots,ab:low.spell?.ab,list:low.spell?.list,fixed:!fixed||low.prepared.some(p=>p.n===fixed),
        at3:limits(low),at10:limits(at10),at20:limits(high),expectedHigh,
        ok:low.spell?.ab===ab&&low.spell?.list===list,
      };
      levels.push({name,ed,...actual});
    }
    const c=make("Fighter","Arcane Warrior",3),[cantrips,school,any]=openThirdChoiceKeys(c.subclass);
    const opts=(key,name)=>CHOICES[key].opts(c).some(([id])=>id===name);
    const schoolOptions=[opts(school,"Shield"),opts(school,"Mage Armor"),opts(school,"Disguise Self"),opts(any,"Disguise Self"),opts(any,"Fireball")];
    c.choices={[cantrips]:["Fire Bolt"],[school]:["Shield","Mage Armor","Disguise Self"],[any]:["Disguise Self","Protection from Evil and Good"]};
    syncGrantedSpells(c);
    const learned=c.prepared.map(s=>s.n).sort();
    const caster=spellCaster(c,spellOf("2014","Disguise Self"));
    const directCantrip=togglePrep(c,spellOf("2014","Prestidigitation"),"2014");
    const multi=make("Wizard","School of Divination",5,"2014","Human",[{cls:"Rogue",lv:3,subclass:"Soulspy"}]);
    const ineligible=make("Rogue","Underfoot",3);
    const old=make("Rogue","Eldritch Trickster",5);old.spell=null;old.hpCur=7;PCS.roster.push(old);RC.id=old.id;renderRosterMain();
    const migration=[old.hpCur,old.spell.slots];
    const ui=make("Rogue","Soulspy",3);PCS.roster.push(ui);RC.id=ui.id;renderRoster();renderRosterMain();
    return {levels,schoolOptions,learned,castingAbility:caster.ab,directCantrip,multi:multi.spell.slots,ineligible:!ineligible.spell,migration,ui:ui.id};
  });
  check("licensed subclass spells follow the printed lists, levels, and choices in both editions",
    open.levels.every(x=>x.ok&&x.fixed&&JSON.stringify(x.slots)==="[2]"&&x.at3[1]===2&&x.at3[2]===1
      &&x.at10[0]===x.at3[0]+1&&JSON.stringify(x.at20)===JSON.stringify(x.expectedHigh)),JSON.stringify(open.levels));
  check("Arcane Warrior enforces school restrictions and one unrestricted spell at 3rd level",
    JSON.stringify(open.schoolOptions)==="[true,true,false,true,false]"&&!open.directCantrip,JSON.stringify(open));
  check("valid school and cantrip choices reach the cast sheet with their owning class ability",
    JSON.stringify(open.learned)==='["Disguise Self","Fire Bolt","Mage Armor","Shield"]'&&open.castingAbility==="int",JSON.stringify(open.learned));
  check("licensed third casters combine slots, upgrade old saves, and honor the Underfoot prerequisite",
    JSON.stringify(open.multi)==="[4,3,3]"&&open.ineligible&&JSON.stringify(open.migration)==="[7,[3]]",JSON.stringify(open));
  await p.locator('[data-choice="School spells (Soulspy)"]').selectOption("Inflict Wounds");
  const live=await p.evaluate(id=>{
    const c=PCS.roster.find(r=>r.id===id);
    return c.prepared.some(s=>s.n==="Inflict Wounds"&&s.sources.some(g=>g.feature==="Spellcasting (Soulspy)"));
  },open.ui);
  check("a Soulspy can learn a school spell through the actual feature picker",live);
  check("no page errors", !errs.length, errs.join(" | "));
  await browser.close(); server.close();
  console.log(fails ? `\n${fails} check(s) failed` : "\nAll checks passed");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
