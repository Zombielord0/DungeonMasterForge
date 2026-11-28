const assert = require("node:assert/strict");
const http = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

(async () => {
  const root = path.join(__dirname, "../../public");
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const file = path.join(root, url.pathname === "/" ? "index.html" : url.pathname);
    try {
      const body = await readFile(file);
      const type = { ".css": "text/css", ".js": "text/javascript", ".html": "text/html" }[path.extname(file)];
      if (type) res.setHeader("Content-Type", type);
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  let browser;
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("dmforge.offline", "1"));
    page.setDefaultTimeout(8000);
    await page.goto(`http://127.0.0.1:${server.address().port}/#roster`);
    await page.locator("#forgeBox > summary").click();
    await page.selectOption("#pcClass", "Fighter");
    const dialog = page.locator("#characterReference");
    const rows = dialog.locator("tbody tr");
    const next = dialog.getByRole("button", { name: /^Next/ });
    assert.equal(await rows.count(), 20);
    assert.match(await rows.nth(1).textContent(), /Tactical Mind/);
    await dialog.locator("select").selectOption("Champion");
    assert.match(await rows.nth(2).textContent(), /Improved Critical/);
    assert.match(await rows.nth(19).textContent(), /Three Extra Attacks/);
    await page.keyboard.press("Escape");
    assert.equal(await dialog.isVisible(), false);
    await page.selectOption("#pcClass", "Ranger");
    assert.match(await rows.nth(19).textContent(), /Hunter’s Mark uses a d10/);
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.locator('label.opt:has(input[name="pcEd"][value="2014"])').click();
    await page.selectOption("#pcClass", "Fighter");
    assert.doesNotMatch(await rows.nth(1).textContent(), /Tactical Mind/);
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.selectOption("#pcRace", "Elf");
    await dialog.locator("select").selectOption("Drow");
    assert.equal(await page.locator("#pcAnc").inputValue(), "Drow");
    assert.match(await rows.nth(2).textContent(), /Faerie Fire/);
    await next.click();
    assert.equal(await page.evaluate(() => document.activeElement.id), "pcClass");

    await page.evaluate(() => hbSet([
      ...HB.list,
      { id: "ref-sub", kind: "subclass", name: "Circle of Lanterns", cls: "Druid", ed: "both", features: [{ l: 3, n: "Lantern Light", d: "Guide lost travelers." }] },
      { id: "ref-species", kind: "species", name: "Lanternkin", ed: "both", traits: [{ n: "Lantern Glow", d: "You glow at dawn." }] },
      { id: "ref-bg", kind: "background", name: "Lantern Keeper", ed: "both", desc: "You tend the village beacon.", skills: ["Insight"], gear: "Signal lantern" },
    ]));
    await page.selectOption("#pcClass", "Druid");
    await dialog.locator("select").selectOption("Circle of Bees");
    assert.match(await dialog.textContent(), /Bee Bond/);
    await dialog.locator("select").selectOption("Circle of Lanterns");
    assert.match(await rows.nth(2).textContent(), /Lantern Light.*Guide lost travelers/);
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.selectOption("#pcRace", "Lanternkin");
    assert.match(await rows.first().textContent(), /Lantern Glow.*You glow at dawn/);
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.selectOption("#pcBg", "Lantern Keeper");
    assert.match(await dialog.textContent(), /You tend the village beacon.*Insight/s);
    await dialog.getByRole("button", { name: "Close" }).click();

    assert.equal(await page.evaluate(() => {
      const c = generateCharacter({ seed: "REF", ed: "2024", cls: "Fighter", bg: "Lantern Keeper", bgGold50: true });
      return c.kit.includes("Signal lantern") && c.startGold === 0;
    }), true);

    await page.evaluate(() => { CB.ed = "2014"; cbStart(); });
    assert.equal(await page.evaluate(() => {
      const pickerSearch = getComputedStyle(document.querySelector("[data-choice-query]"));
      const spellSearch = getComputedStyle(document.querySelector("#spQ"));
      return ["backgroundImage", "borderRadius", "boxShadow"].every(key => pickerSearch[key] === spellSearch[key]) &&
        pickerSearch.backgroundImage !== "none";
    }), true);
    await page.getByLabel("Search races").fill("no such species");
    assert.equal(await page.getByText("No matching choices.").isVisible(), true);
    await page.getByLabel("Search races").fill("alseid tome");
    assert.equal(await page.locator("[data-cbrace]:visible").count(), 1);
    await page.locator('[data-cbrace="Alseid"]').click();
    assert.match(await dialog.textContent(), /Alseid.*Tome of Heroes/s);
    await next.click();
    await page.getByLabel("Search classes").fill("druid");
    assert.equal(await page.locator("[data-cbcls]:visible").count(), 1);
    await page.locator('[data-cbcls="Druid"]').click();
    await dialog.locator("select").selectOption("Circle of Bees");
    assert.match(await rows.nth(1).textContent(), /Bee Bond/);
    await next.click();
    await page.getByLabel("Search backgrounds").fill("court servant");
    assert.equal(await page.locator("[data-cbbg]:visible").count(), 1);
    await page.locator('[data-cbbg="Court Servant"]').click();
    assert.match(await dialog.textContent(), /Court Servant.*Tome of Heroes.*Insight/s);
    await next.click();
    assert.match(await page.locator("#pcOut [aria-current=step]").textContent(), /Abilities/);
    await page.locator("[data-cbquit]").click();

    await page.evaluate(() => {
      const c = pcEnsure(generateCharacter({ seed: "REF", name: "Ash", ed: "2024", cls: "Fighter", level: 1 }));
      PCS.roster = [c];
      RC.id = c.id;
      pcInvUpgrade(c);
      itLoad();
      for (const ed of ["2014", "2024"]) {
        const flameTongue = IT.data[ed].find(item => item.n === "Flame Tongue");
        const choices = inventoryWeaponChoices(flameTongue, ed);
        if (!choices.some(item => item.n === "Longsword") ||
            choices.some(item => item.n === "Longbow") ||
            choices.some(item => item.n === "Dagger") !== (ed === "2024")) {
          throw new Error("Unexpected Flame Tongue base weapons for " + ed);
        }
        const adamantine = IT.data[ed].find(item => item.n === "Adamantine Armor");
        const armor = inventoryArmorChoices(adamantine, ed).map(item => item.n);
        if (!armor.includes("Plate Armor") || armor.includes("Hide Armor") || armor.includes("Leather Armor")) {
          throw new Error("Unexpected Adamantine Armor bases for " + ed);
        }
        const savedArmor = { ref: adamantine.id, n: adamantine.n, baseArmor: "Hide Armor" };
        if (eqArmorOf(savedArmor, ed) !== null) throw new Error("Saved invalid armor base should be ignored");
        savedArmor.baseArmor = "Plate Armor";
        if (eqArmorOf(savedArmor, ed)?.n !== "Plate Armor") throw new Error("Saved valid armor base should be used");
      }
      const arrows = IT.data["2014"].find(item => item.type?.startsWith("Weapon (any ammunition)"));
      if (inventoryWeaponChoices(arrows, "2014").length) throw new Error("Ammunition should not offer a base weapon");
      for (const [id, pattern] of [["test-sword", /^Weapon \+1$/], ["test-ring", /^Ring of Free Action$/]]) {
        const x = IT.data["2024"].find(item => pattern.test(item.n));
        c.inv.push({ id, ref: x.id, n: x.n, qty: 1, att: !!x.att });
      }
      c.inv.push({
        id: "test-custom", n: "Custom charm", qty: 1, eq: true,
        itemRules: { kind: "custom", cat: "Wondrous Item", d: "<strong>Shared rules</strong>" },
      });
      renderRosterTab();
    });
    await page.locator('#rosterMain [data-progression="class"]').click();
    await dialog.locator("select").selectOption("Champion");
    assert.match(await rows.nth(2).textContent(), /Improved Critical/);
    assert.equal(await page.evaluate(() => rosterCur().subclass), null);
    assert.equal(await next.isVisible(), false);
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.locator('#sec-gear [data-item-details="test-sword"]').click();
    assert.match(await dialog.textContent(), /bonus to attack rolls and damage rolls/);
    await dialog.locator("[data-item-base]").selectOption("Longsword");
    assert.match(await dialog.textContent(), /1d8/i);
    assert.equal(await page.evaluate(() => rosterCur().inv.find(i => i.id === "test-sword").baseWeapon), "Longsword");
    await dialog.getByRole("button", { name: "Close" }).click();
    await page.locator('[data-rinv="eq"][data-iid="test-sword"]').check();
    assert.equal(await page.evaluate(() => rosterCur().attacks.find(a => a.iid === "test-sword").magic), 1);
    await page.locator('[data-rinv="eq"][data-iid="test-ring"]').check();
    assert.doesNotMatch(await page.locator("#rcSpeedLine").textContent(), /Difficult terrain/);
    await page.locator('[data-rinv="attuned"][data-iid="test-ring"]').check();
    assert.match(await page.locator("#rcSpeedLine").textContent(), /Difficult terrain/);
    await page.locator("#rcItemFeatures").getByText("Ring of Free Action", { exact: true }).click();
    assert.match(await page.locator("#rcItemFeatures").textContent(), /Difficult Terrain doesn.t cost/i);
    await page.locator('[data-rdel="test-ring"]').click();
    assert.doesNotMatch(await page.locator("#rcSpeedLine").textContent(), /Difficult terrain/);
    assert.doesNotMatch(await page.locator("#rcItemFeatures").textContent(), /Ring of Free Action/);
    await page.locator('[data-ra="addInv"]').click();
    const manual = page.locator('.rc-inv tbody tr').last();
    await manual.locator('[data-rinv="n"]').fill("Ring of Free Action");
    assert.equal(await manual.locator('[data-rinv="attuned"]').isVisible(), true);
    await manual.locator('[data-rinv="attuned"]').check();
    assert.match(await page.locator("#rcAttunementCount").textContent(), /1 \/ 3/);
    await manual.locator('[data-rinv="n"]').fill("Plain ring");
    assert.equal(await manual.locator('[data-rinv="attuned"]').count(), 0);
    assert.match(await page.locator("#rcAttunementCount").textContent(), /0 \/ 3/);
    await manual.locator('[data-rinv="n"]').press("Tab");
    assert.equal(await page.evaluate(() => rosterCur().inv.at(-1).attuned), false);
    await page.evaluate(() => {
      rosterCur().inv.at(-1).attuned = true; // An older save with a stale flag.
      renderRosterMain();
    });
    assert.equal(await page.evaluate(() => rosterCur().inv.at(-1).attuned), false);
    assert.match(await page.locator("#rcAttunementCount").textContent(), /0 \/ 3/);
    await page.evaluate(() => {
      const c=rosterCur(), wand=IT.data["2024"].find(x=>x.n==="Wand of Magic Missiles"&&!x.src);
      c.inv.push({id:"test-charges",ref:wand.id,n:wand.n,qty:1,eq:true});
      renderRosterMain();
    });
    await page.locator('#sec-gear [data-item-details="test-charges"]').click();
    await dialog.locator("[data-item-charge-start]").fill("3");
    await dialog.locator("[data-item-init]").click();
    assert.match(await dialog.textContent(), /Charges: 3 \/ 7/);
    await dialog.locator("[data-item-use]").first().click();
    await page.locator("#modalNo").click();
    assert.match(await dialog.textContent(), /Charges: 3 \/ 7/);
    await dialog.locator("[data-item-use]").first().click();
    await page.locator("#modalYes").click();
    assert.match(await dialog.textContent(), /Charges: 2 \/ 7/);
    await dialog.getByRole("button",{name:"Close"}).click();
    await page.locator('#sec-gear [data-item-details="test-custom"]').click();
    assert.match(await dialog.textContent(), /<strong>Shared rules<\/strong>/);
    assert.equal(await dialog.locator("strong").count(), 0);
    await dialog.getByRole("button", { name: "Close" }).click();
    const originAudit = await page.evaluate(() => {
      const backgrounds = ["Acolyte", "Criminal", "Sage", "Soldier"].map(name => {
        const b=bgInfo("2024", name);
        return [name,b.ab,b.feat,b.fnote||"",b.sk,b.gp,b.gear];
      });
      const common={seed:"KEEN",ed:"2024",race:"Elf",sub:"High Elf",cls:"Fighter",bg:"Criminal",level:1,subclass:"none"};
      const choices=["Insight","Perception","Survival"].map(speciesSkill=>{
        const c=generateCharacter({...common,custom:{skills:["Athletics","History"],speciesSkill}});
        return [c.speciesSkill,c.skills.filter(x=>x.p).map(x=>x.s).sort()];
      });
      const legacy=generateCharacter({...common,ed:"2014",bg:"Soldier",custom:{skills:["Athletics","History"],speciesSkill:"Insight"}});
      const barbarian=generateCharacter({seed:"RAGES",ed:"2024",race:"Human",cls:"Barbarian",bg:"Soldier",level:20,subclass:"none"});
      return {backgrounds,choices,legacy:legacy.skills.find(x=>x.s==="Perception").p,extra:barbarian.extras.find(x=>x.startsWith("Rages per day:"))};
    });
    assert.deepEqual(originAudit.backgrounds.map(b=>b.slice(0,6)),[
      ["Acolyte",["int","wis","cha"],"Magic Initiate","Cleric",["Insight","Religion"],8],
      ["Criminal",["dex","con","int"],"Alert","",["Sleight of Hand","Stealth"],16],
      ["Sage",["con","int","wis"],"Magic Initiate","Wizard",["Arcana","History"],8],
      ["Soldier",["str","dex","con"],"Savage Attacker","",["Athletics","Intimidation"],14]
    ]);
    assert.deepEqual(originAudit.choices.map(([chosen,skills])=>[chosen,skills.includes(chosen),skills.length]),[["Insight",true,5],["Perception",true,5],["Survival",true,5]]);
    assert.equal(originAudit.legacy,true);
    assert.match(originAudit.extra,/Rages per day: 6,/);
    const progressionAudit=await page.evaluate(()=>{
      const make=(ed,cls,level)=>generateCharacter({seed:"CORE-PROGRESSION",ed,cls,level,race:"Human",bg:"Soldier",subclass:"none"});
      const expert=(ed,level)=>make(ed,"Bard",level).skills.filter(s=>s.x).length;
      const feature=(ed,cls,level,name)=>make(ed,cls,level).feats.some(f=>f.f===name);
      const cap=(ed,cls,score)=>{const sc={str:score,con:score,dex:score,wis:score};coreCapstoneScores(ed,cls,20,sc);return sc;};
      const b=pcEnsure(make("2024","Bard",20));syncGrantedSpells(b);
      const words=["Power Word Heal","Power Word Kill"].map(name=>spellPreparationSources(b,name).some(x=>x.feature==="Words of Creation"));
      pcLevelTo(b,19);
      const wordsRemoved=["Power Word Heal","Power Word Kill"].every(name=>!spellPreparationSources(b,name).some(x=>x.feature==="Words of Creation"));
      const rogue=(ed,level,kind,skill,raw)=>skillCheckD20Floor({ed,cls:"Rogue",level,skills:[{s:"Stealth",p:true},{s:"History",p:false}]},kind,skill,raw);
      const c=pcEnsure(make("2024","Barbarian",19)), before={...c.scores};
      pcLevelTo(c,20);const up={...c.scores};pcLevelTo(c,19);const down={...c.scores};pcLevelTo(c,20);const again={...c.scores};
      return {expertise:[expert("2014",2),expert("2024",2),expert("2014",9),expert("2024",9)],
        features:[feature("2024","Bard",6,"Countercharm"),feature("2024","Bard",7,"Countercharm"),feature("2024","Rogue",6,"Reliable Talent"),feature("2024","Rogue",7,"Reliable Talent"),feature("2014","Rogue",10,"Reliable Talent"),feature("2014","Rogue",11,"Reliable Talent"),feature("2024","Monk",20,"Body and Mind")],
        caps:[cap("2014","Barbarian",21),cap("2024","Barbarian",21),cap("2024","Monk",21),cap("2014","Monk",21)],
        floor:[rogue("2024",6,"check","Stealth",2),rogue("2024",7,"check","Stealth",2),rogue("2014",10,"check","Stealth",2),rogue("2014",11,"check","Stealth",2),rogue("2024",7,"check","History",2),rogue("2024",7,"save","Stealth",2),rogue("2024",7,"check","Stealth",17)],
        words,wordsRemoved,before,up,down,again};
    });
    assert.deepEqual(progressionAudit.expertise,[0,2,2,4]);
    assert.deepEqual(progressionAudit.features,[false,true,false,true,false,true,true]);
    assert.deepEqual(progressionAudit.caps,[{str:24,con:24,dex:21,wis:21},{str:25,con:25,dex:21,wis:21},{str:21,con:21,dex:25,wis:25},{str:21,con:21,dex:21,wis:21}]);
    assert.deepEqual(progressionAudit.floor,[2,10,2,10,2,2,17]);
    assert.deepEqual(progressionAudit.words,[true,true]);assert.equal(progressionAudit.wordsRemoved,true);
    assert.equal(progressionAudit.up.str,Math.min(25,progressionAudit.before.str+4));
    assert.equal(progressionAudit.up.con,Math.min(25,progressionAudit.before.con+4));
    assert.deepEqual(progressionAudit.down,progressionAudit.before);assert.deepEqual(progressionAudit.again,progressionAudit.up);
    const revisedMartial=await page.evaluate(()=>{
      const make=(ed,cls,level)=>pcEnsure(generateCharacter({seed:"REVISED-MARTIAL",ed,cls,level,race:"Human",bg:"Soldier",subclass:"none"}));
      const feats=(ed,cls,lv)=>make(ed,cls,lv).feats.map(f=>f.f);
      const r1=make("2024","Ranger",1),r2=make("2024","Ranger",2),r9=make("2024","Ranger",9),r14=make("2024","Ranger",14);
      const old=make("2014","Ranger",14),p=make("2024","Paladin",11);
      const resource=c=>pcResources(c).filter(x=>x.key.startsWith("ranger")).map(x=>[x.key,x.max,x.recharge]);
      const check=(ed,level,spell,hp=10)=>{const c={ed,cls:"Ranger",level,hpCur:hp,name:"Test Ranger",conc:{spell},death:{s:0,f:0}};const notes=pcDamaged(c,24,false);return [c.concCheck||0,!!c.conc,notes.join(" ")];};
      const fighter=classData("2024","Fighter");
      return {expertise:[r1,r2,r9].map(c=>c.skills.filter(x=>x.x).length),oldExpertise:old.skills.filter(x=>x.x).length,
        revisedSkills:fighter.skills[0].includes("Persuasion"),legacySkills:classData("2014","Fighter").skills[0].includes("Persuasion"),
        fighter:feats("2024","Fighter",13),legacyFighter:feats("2014","Fighter",13),
        paladin:feats("2024","Paladin",11),legacyPaladin:feats("2014","Paladin",11),oldSmite:pcAbilities(p).some(x=>x.name==="Divine Smite"),
        resources:resource(r14),legacyResources:resource(old),wis:r14.mods.wis,
        concentration:[check("2024",12,"Hunter's Mark"),check("2024",13,"Hunter’s Mark"),check("2014",13,"Hunter's Mark"),check("2024",13,"Bless"),check("2024",13,"Hunter's Mark",0)]};
    });
    assert.deepEqual(revisedMartial.expertise,[0,1,3]);assert.equal(revisedMartial.oldExpertise,0);
    assert.equal(revisedMartial.revisedSkills,true);assert.equal(revisedMartial.legacySkills,false);
    for(const f of ["Tactical Mind","Tactical Shift","Tactical Master","Studied Attacks","Extra Attack (2)"])assert.ok(revisedMartial.fighter.includes(f),f);
    assert.ok(!revisedMartial.legacyFighter.includes("Tactical Mind"));
    assert.ok(revisedMartial.paladin.includes("Radiant Strikes")&&!revisedMartial.paladin.includes("Divine Health")&&revisedMartial.legacyPaladin.includes("Improved Divine Smite"));
    assert.equal(revisedMartial.oldSmite,false);
    assert.deepEqual(revisedMartial.resources,[["rangerTireless",Math.max(1,revisedMartial.wis),"long"],["rangerVeil",Math.max(1,revisedMartial.wis),"long"]]);assert.deepEqual(revisedMartial.legacyResources,[]);
    assert.deepEqual(revisedMartial.concentration.map(x=>x.slice(0,2)),[[12,true],[0,true],[12,true],[12,true],[0,false]]);
    const revisedCasters=await page.evaluate(()=>{
      const make=(ed,cls,level)=>pcEnsure(generateCharacter({seed:"REVISED-CASTERS",ed,cls,level,race:"Human",bg:"Soldier",subclass:"none"}));
      const feature=(ed,cls,lv,name)=>make(ed,cls,lv).feats.some(f=>f.f===name);
      const cl=make("2024","Cleric",7);cl.choices={"Divine Order":["Protector"]};
      const heavy=armorTraining(cl).has("heavy"),martial=eqProficient(cl,{cat:"Martial Melee Weapons",n:"Longsword",st:[]});
      cl.choices={"Divine Order":["Thaumaturge"],"Divine Order Cantrip":["Sacred Flame"]};syncGrantedSpells(cl);
      const bonus=orderCheckBonus(cl,"Religion"),grant=spellPreparationSources(cl,"Sacred Flame").some(x=>x.feature==="Divine Order");
      const noHeavy=!armorTraining(cl).has("heavy");cl.choices["Divine Order"]=["Protector"];syncGrantedSpells(cl);
      const removed=!spellPreparationSources(cl,"Sacred Flame").some(x=>x.feature==="Divine Order");
      const dr=make("2024","Druid",7);dr.choices={"Primal Order":["Warden"]};const medium=armorTraining(dr).has("medium");
      const sor=make("2024","Sorcerer",10);const sp=spellOf("2024","Fire Bolt"),base=spellCaster(sor,sp).dc;
      actRun(sor,"Innate Sorcery");const active=spellCaster(sor,sp);actRun(sor,"Innate Sorcery");
      const ended=spellCaster(sor,sp).dc;
      sor.used.sorc=9;const restore=[sorcerousRestoration(sor),sor.used.sorc,sorcerousRestoration(sor)];
      const w=make("2024","Warlock",11);syncGrantedSpells(w);w.used={pact:3};const pact=[magicalCunningRecovery(w),w.used.pact,magicalCunningRecovery(w)];
      const master=make("2024","Warlock",20);master.used={pact:4};const all=[magicalCunningRecovery(master),master.used.pact];
      const contact=spellPreparationSources(w,"Contact Other Plane").some(x=>x.feature==="Contact Patron");
      const old=make("2014","Cleric",7);old.choices={"Divine Order":["Protector"]};
      return {heavy,martial,bonus,wis:cl.mods.wis,grant,noHeavy,removed,medium,base,active,ended,restore,pact,all,contact,legacyOrder:revisedOrder(old,"Cleric"),
        meta:["2014","2024"].map(ed=>[1,2,3,10,17].map(l=>CHOICES.Metamagic.n(make(ed,"Sorcerer",l)))),
        features:[feature("2024","Cleric",5,"Sear Undead"),feature("2024","Cleric",5,"Destroy Undead"),feature("2024","Druid",2,"Wild Companion"),feature("2024","Wizard",2,"Scholar"),feature("2024","Wizard",5,"Memorize Spell"),feature("2014","Wizard",5,"Memorize Spell")]};
    });
    assert.ok(revisedCasters.heavy&&revisedCasters.martial&&revisedCasters.grant&&revisedCasters.noHeavy&&revisedCasters.removed&&revisedCasters.medium&&revisedCasters.contact);
    assert.equal(revisedCasters.bonus,Math.max(1,revisedCasters.wis));assert.equal(revisedCasters.legacyOrder,"");
    assert.equal(revisedCasters.active.dc,revisedCasters.base+1);assert.equal(revisedCasters.active.innateSorcery,true);assert.equal(revisedCasters.ended,revisedCasters.base);
    assert.deepEqual(revisedCasters.restore,[5,4,0]);assert.deepEqual(revisedCasters.pact,[2,1,0]);assert.deepEqual(revisedCasters.all,[4,0]);
    assert.deepEqual(revisedCasters.meta,[[0,0,2,3,4],[0,2,2,4,6]]);
    assert.deepEqual(revisedCasters.features,[true,false,true,true,true,false]);
    const remainingCoreAudit=await page.evaluate(()=>{
      const make=(ed,cls,level)=>pcEnsure(generateCharacter({seed:"REMAINING-CORE",ed,cls,level,race:"Human",bg:"Sage",subclass:"none"}));
      const m=make("2024","Monk",15);m.used={ki:14};const before=pcResources(m).find(r=>r.key==="ki").max;actRun(m,"Perfect Focus");const after=resLeft(m,pcResources(m).find(r=>r.key==="ki"));
      m.used.ki=15;actRun(m,"Monk's Focus","freeDash");const free=m.used.ki;
      const legacy=make("2014","Monk",14),b=make("2024","Barbarian",15);b.used={rage:4};actRun(b,"Persistent Rage recovery");
      const d=make("2024","Druid",5);d.used={wild:2,slot1:1};const a=wildResurgence(d,"slot1"),wild=d.used.wild,slots=d.used.slot1;const second=wildResurgence(d,"create"),daily=d.used.wildResurgence;
      const sor=make("2024","Sorcerer",7);sor.used={innateSorcery:2,sorc:0};actRun(sor,"Sorcery Incarnate");
      return {before,after,free,monkSaves:m.saves.length,legacySaves:legacy.saves.length,rogueSaves:make("2024","Rogue",15).saves,barbarian:[b.used.rage,b.used.persistentRage],druid:[a,wild,slots,second,daily],incarnate:[sor.used.sorc,isActive(sor,"Innate Sorcery")]};
    });
    assert.deepEqual([remainingCoreAudit.before,remainingCoreAudit.after,remainingCoreAudit.free,remainingCoreAudit.monkSaves,remainingCoreAudit.legacySaves],[15,4,15,6,6]);
    assert.ok(remainingCoreAudit.rogueSaves.includes("wis")&&remainingCoreAudit.rogueSaves.includes("cha"));
    assert.deepEqual(remainingCoreAudit.barbarian,[0,1]);
    assert.deepEqual(remainingCoreAudit.druid,["Recovered one Wild Shape use.",1,2,"Created one level 1 slot.",1]);
    assert.deepEqual(remainingCoreAudit.incarnate,[2,true]);
    const classChoiceAudit=await page.evaluate(()=>{
      const make=(ed,cls,level)=>pcEnsure(generateCharacter({seed:"CLASS-CHOICE-AUDIT",ed,cls,level,race:"Human",bg:"Sage",subclass:"none"}));
      const wizard=make("2024","Wizard",2),skill=wizard.skills.find(s=>s.s==="Arcana");skill.p=true;skill.x=false;wizard.choices={Scholar:["Arcana"]};pcRecompute(wizard);
      const scholar=skill.x&&skill.scholarGranted,kept=pcKeep(wizard).keepExpert.includes("Arcana");wizard.choices={};pcRecompute(wizard);
      const b=make("2024","Barbarian",3),primal=b.skills.find(s=>s.s==="Survival");primal.p=false;primal.x=false;b.choices={"Primal Knowledge":["Survival"]};pcRecompute(b);
      const granted=primal.p&&primal.primalGranted,keptPrimal=pcKeep(b).keepSkills.includes("Survival");b.choices={};pcRecompute(b);
      const warlock=make("2024","Warlock",17);warlock.choices={"Mystic Arcanum 6":["True Seeing"],"Mystic Arcanum 9":["Foresight"]};syncGrantedSpells(warlock);
      const arcanum=pcResources(warlock).filter(r=>/^arcanum/.test(r.key)).map(r=>[r.key,r.max,r.recharge]).sort();
      const casts=castOpts(warlock,spellOf("2024","Foresight")).map(x=>x[0]);warlock.level=16;syncGrantedSpells(warlock);const removed=!pcResources(warlock).some(r=>r.key==="arcanum9");
      const cleric=make("2024","Cleric",10),di=divineInterventionChoices(cleric),eligible=di.every(([name])=>{const s=spellOf("2024",name);return s&&s.l>=1&&s.l<=5&&!/reaction/i.test(s.t)&&s.c.includes("Cleric");});
      return {scholar,kept,scholarRemoved:!skill.x,granted,keptPrimal,primalRemoved:!primal.p,arcanum,casts,removed,eligible,diCount:di.length};
    });
    assert.deepEqual([classChoiceAudit.scholar,classChoiceAudit.kept,classChoiceAudit.scholarRemoved,classChoiceAudit.granted,classChoiceAudit.keptPrimal,classChoiceAudit.primalRemoved],[true,false,true,true,false,true]);
    assert.deepEqual(classChoiceAudit.arcanum,[["arcanum6",1,"long"],["arcanum9",1,"long"]]);
    assert.deepEqual(classChoiceAudit.casts,["arcanum9"]);assert.ok(classChoiceAudit.removed);
    assert.ok(classChoiceAudit.eligible&&classChoiceAudit.diCount>0);
    const fullClassMatrix=await page.evaluate(()=>{
      const core=["Barbarian","Bard","Cleric","Druid","Fighter","Monk","Paladin","Ranger","Rogue","Sorcerer","Warlock","Wizard"],errors=[];
      let builds=0;for(const ed of ["2014","2024"])for(const cls of [...core,"Artificer"])for(let level=1;level<=20;level++){
        const c=generateCharacter({seed:"MATRIX-"+cls,ed,cls,level,race:"Human",bg:"Sage",subclass:"none"});builds++;
        const key=ed+" "+cls+" "+level;
        if(c.cls!==cls||c.ed!==ed||c.level!==level||c.prof!==2+Math.floor((level-1)/4)||!Number.isFinite(c.hp)||c.hp<1||!Array.isArray(c.feats)||c.feats.some(f=>f.l>level))errors.push(key+": invalid character contract");
        if(!AB.every(a=>Number.isFinite(c.scores[a])&&Number.isFinite(c.mods[a])))errors.push(key+": invalid ability scores");
        const expected=classData(ed,cls);
        for(const [l,names] of Object.entries(expected.f||{}))if(+l<=level)for(const name of names)if(!c.feats.some(f=>f.f===name))errors.push(key+": missing "+name);
      }
      const make=(cls,level)=>pcEnsure(generateCharacter({seed:"CORE-EXTRAS",ed:"2024",cls,level,race:"Human",bg:"Sage",subclass:"none"}));
      const cleric=make("Cleric",20);cleric.used={divineIntervention:1};cleric.divineInterventionCooldown=2;pcRest(cleric,"long");const rest1=[cleric.divineInterventionCooldown,cleric.used.divineIntervention];pcRest(cleric,"long");const rest2=[cleric.divineInterventionCooldown||0,cleric.used.divineIntervention];
      const d=make("Druid",2);d.used={wild:0};const companion=castWildCompanion(d,"wild"),spent=d.used.wild,active=d.wildCompanionActive;pcRest(d,"long");
      return {builds,errors,rest1,rest2,companion,spent,active,ended:!d.wildCompanionActive};
    });
    assert.equal(fullClassMatrix.builds,520);
    assert.deepEqual(fullClassMatrix.errors,[]);
    assert.deepEqual(fullClassMatrix.rest1,[1,1]);assert.deepEqual(fullClassMatrix.rest2,[0,0]);
    assert.ok(fullClassMatrix.companion.startsWith("Wild Companion:")&&fullClassMatrix.active&&fullClassMatrix.ended);
    assert.equal(fullClassMatrix.spent,1);
    const supplementalClassAudit=await page.evaluate(()=>{
      const classes=["Death Knight","Demon Hunter","Evoker","Hunter","Mage","Priest","Shaman","Warrior"],errors=[];
      let builds=0;
      for(const cls of classes)for(let level=1;level<=20;level++){
        const c=generateCharacter({seed:"WOW-MATRIX-"+cls,ed:"2024",cls,level,race:"Human",bg:"Sage",subclass:"none"});builds++;
        const key=cls+" "+level,expected=classData("2024",cls);
        if(!expected||c.cls!==cls||c.ed!=="2024"||c.level!==level||c.prof!==2+Math.floor((level-1)/4)||!Number.isFinite(c.hp)||c.hp<1||!AB.every(a=>Number.isFinite(c.mods[a])))errors.push(key+": invalid character contract");
        if(expected)for(const [l,names] of Object.entries(expected.f||{}))if(+l<=level)for(const n of names)if(!c.feats.some(f=>f.f===n))errors.push(key+": missing "+n);
      }
      const s=pcEnsure(generateCharacter({seed:"TOTEM-AUDIT",ed:"2024",cls:"Shaman",level:3,race:"Human",bg:"Sage",subclass:"none"}));s.used={};
      const replaced=s.feats.some(f=>f.f==="Totems")&&!s.feats.some(f=>f.f==="Primal Knowledge");
      shamanTotemCreate(s,"Primal Knowledge Totem");const spent=s.used.totemPrimal,blocked=!shamanTotemOptions(s).some(x=>x[0]==="Primal Knowledge Totem");
      shamanTotemRestore(s);const rage=s.used.rage,restored=s.used.totemPrimal;
      shamanTotemCreate(s,"Earthbind Totem");const earth=s.shamanTotem.name;
      pcRest(s,"short");const expired=!s.shamanTotem;
      const warrior=pcEnsure(generateCharacter({seed:"WARRIOR-AUDIT",ed:"2024",cls:"Warrior",level:20,race:"Human",bg:"Sage",subclass:"none"}));const extra=pcAbilities(warrior).find(a=>a.name==="Extra Attack")?.text;
      const knight=pcEnsure(generateCharacter({seed:"DEATH-COIL",ed:"2024",cls:"Death Knight",level:14,race:"Human",bg:"Sage",subclass:"none"}));
      knight.mods.cha=3;knight.used={};knight.inv=[];
      const attack=pcAttacks(knight).find(a=>a.unarmed).extra;
      const random=Math.random;
      let damage,healing;
      try{Math.random=()=>0.25;damage=actRun(knight,"Death Coil","damage:2");healing=actRun(knight,"Death Coil","heal:2");}finally{Math.random=random;}
      const blockedCoil=actRun(knight,"Death Coil","heal:1"),spentDice=knight.used.deathCoil;
      pcRest(knight,"short");const short=knight.used.deathCoil;
      pcRest(knight,"long");const long=knight.used.deathCoil;
      return {builds,errors,replaced,spent,blocked,rage,restored,earth,expired,extra,attack,damage,healing,blockedCoil,spentDice,short,long};
    });
    assert.equal(supplementalClassAudit.builds,160);assert.deepEqual(supplementalClassAudit.errors,[]);
    assert.deepEqual([supplementalClassAudit.replaced,supplementalClassAudit.spent,supplementalClassAudit.blocked,supplementalClassAudit.rage,supplementalClassAudit.restored,supplementalClassAudit.earth,supplementalClassAudit.expired],[true,1,true,1,0,"Earthbind Totem",true]);assert.match(supplementalClassAudit.extra,/4 attacks/);
    assert.deepEqual(supplementalClassAudit.attack,["1d8 necrotic (Runic Strikes)"]);
    assert.deepEqual([supplementalClassAudit.damage.amount,supplementalClassAudit.damage.halfAmount,supplementalClassAudit.healing.amount],[9,6,20]);
    assert.match(supplementalClassAudit.blockedCoil,/eligible/);
    assert.deepEqual([supplementalClassAudit.spentDice,supplementalClassAudit.short,supplementalClassAudit.long],[4,4,0]);
    const inheritedClassAudit=await page.evaluate(()=>{
      const make=(cls,level)=>pcEnsure(generateCharacter({seed:"VARIANT-MECHANICS",ed:"2024",cls,level,race:"Human",bg:"Sage",subclass:"none"}));
      const shaman=make("Shaman",17);shaman.used={rage:2};
      const danger=rollState(shaman,"save","dex").adv.includes("Danger Sense");
      const twoBlows=brutalStrikeOptions(shaman).some(([key])=>key==="Forceful Blow+Hamstring Blow");
      actRun(shaman,"Persistent Rage recovery");const rage=[shaman.used.rage,shaman.used.persistentRage];
      const evoker=make("Evoker",10);evoker.used={sorc:5};
      const spell=spellOf("2024","Fireball"),before=spellCaster(evoker,spell).dc;
      actRun(evoker,"Innate Sorcery");const evokerDc=spellCaster(evoker,spell).dc-before;
      const recovered=sorcerousRestoration(evoker),metamagic=CHOICES.Metamagic.n(evoker);
      const priest=make("Priest",10);priest.used={};priest.choices={"Divine Order":["Thaumaturge"],"Divine Order Cantrip":["Guidance"]};syncGrantedSpells(priest);
      const granted=priest.prepared.some(p=>p.n==="Guidance"&&p.sources?.some(s=>s.cls==="Priest"&&s.feature==="Divine Order"));
      const channel=pcResources(priest).find(r=>r.key==="channel").max;
      actRun(priest,"Channel Divinity","spark");const usedChannel=priest.used.channel;
      const intervention=divineInterventionChoices(priest).some(([id])=>id==="Cure Wounds");
      const mage=make("Mage",18);mage.choices={"Spell Mastery (1st level)":["Magic Missile"]};wizardBookStart(mage);syncGrantedSpells(mage);
      const mastery=spells=>spells.some(p=>p.n==="Magic Missile"&&p.sources?.some(s=>s.cls==="Mage"&&s.feature==="Spell Mastery"));
      const hunter=make("Hunter",14);hunter.exh=2;hunter.hpCur=hunter.hp;hunter.conc={spell:"Hunter's Mark"};
      pcDamaged(hunter,12,false);const protectedMark=!hunter.concCheck;
      pcRest(hunter,"short");const shortExhaustion=hunter.exh;
      return {danger,twoBlows,rage,evokerDc,recovered,metamagic,granted,channel,usedChannel,intervention,book:wizardBookContains(mage,"Magic Missile"),mastery:mastery(mage.prepared),cantrips:[spellLimits(priest).cantrips,spellLimits(mage).cantrips],protectedMark,shortExhaustion};
    });
    assert.deepEqual([inheritedClassAudit.danger,inheritedClassAudit.twoBlows,inheritedClassAudit.rage],[true,true,[0,1]]);
    assert.deepEqual([inheritedClassAudit.evokerDc,inheritedClassAudit.recovered,inheritedClassAudit.metamagic],[1,5,4]);
    assert.deepEqual([inheritedClassAudit.granted,inheritedClassAudit.channel,inheritedClassAudit.usedChannel,inheritedClassAudit.intervention],[true,3,1,true]);
    assert.deepEqual([inheritedClassAudit.book,inheritedClassAudit.mastery,inheritedClassAudit.cantrips,inheritedClassAudit.protectedMark,inheritedClassAudit.shortExhaustion],[true,true,[5,5],true,1]);
    const multiclassMatrix=await page.evaluate(()=>{
      const classes=["Artificer","Barbarian","Bard","Cleric","Druid","Fighter","Monk","Paladin","Ranger","Rogue","Sorcerer","Warlock","Wizard"];
      let builds=0;const errors=[];
      for(const ed of ["2014","2024"])for(const cls of classes)for(const second of classes){
        if(cls===second)continue;
        const c=pcEnsure(generateCharacter({seed:"MC-"+cls+"-"+second,ed,cls,level:5,race:"Human",bg:"Sage",subclass:"none",multi:[{cls:second,lv:3,subclass:"none"}]}));builds++;
        const label=ed+" "+cls+"/"+second;
        if(c.totalLevel!==8||c.prof!==3||!Number.isFinite(c.hp)||c.hp<=0||clsLv(c,second)!==3)errors.push(label+": level/proficiency/HP");
        if(c.spell){
          c.scores.int=20;c.scores.wis=16;c.scores.cha=18;pcRecompute(c);
          for(const s of [c.spell,...(c.spell.others||[])]){
            if(s.dc!==8+c.prof+c.mods[s.ab]+(c.spell.bonus||0)||s.atk!==c.prof+c.mods[s.ab]+(c.spell.bonus||0))errors.push(label+": stale spellcasting statistics");
          }
        }
      }
      const defenses=[];
      for(const ed of ["2014","2024"])for(const cls of ["Barbarian","Monk"]){
        const c=pcEnsure(generateCharacter({seed:"MC-AC",ed,cls,level:5,race:"Human",bg:"Sage",subclass:"none",multi:[{cls:cls==="Monk"?"Barbarian":"Monk",lv:3,subclass:"none"}]}));
        c.inv=[];c.fx={};c.acBonus=0;c.hbAc=0;c.mods={...c.mods,dex:2,con:1,wis:4};defenses.push(pcAC(c).ac);
      }
      return {builds,errors,defenses};
    });
    assert.equal(multiclassMatrix.builds,312);
    assert.deepEqual(multiclassMatrix.errors,[]);
    assert.deepEqual(multiclassMatrix.defenses,[13,16,16,16]);
    const masteryAudit=await page.evaluate(()=>{
      const make=(ed,cls,level)=>pcEnsure(generateCharacter({seed:"MASTERY",ed,cls,level,race:"Human",bg:"Sage",subclass:"none"}));
      const f=make("2024","Fighter",9);f.choices={[masteryKey("Fighter")]:["Longsword","Dagger"]};
      const b=make("2024","Barbarian",10),r=make("2024","Rogue",1),old=make("2014","Fighter",20);
      itLoad();const w=IT.data["2024"].find(x=>x.n==="Longsword"&&x.kind==="gear");
      const warlock=make("2024","Warlock",12);warlock.choices={"Eldritch Invocations":["blade","thirst","devouring"]};
      const before=hasChoice(warlock,"Eldritch Invocations","devouring");warlock.choices["Eldritch Invocations"]=["thirst","devouring"];const after=hasChoice(warlock,"Eldritch Invocations","devouring");
      const lv1=make("2024","Warlock",1);
      return {counts:[1,4,10,16,20].map(l=>masteryLimit("2024","Fighter",l)),barb:[1,4,10,20].map(l=>masteryLimit("2024","Barbarian",l)),legacy:masteryOptions(old,"Fighter").length,mastery:activeMastery(f,w),unselected:activeMastery(b,w),bow:masteryOptions(b,"Barbarian").some(([n])=>n==="Shortbow"),rogueSword:masteryOptions(r,"Rogue").some(([n])=>n==="Longsword"),before,after,devil:invocationEligible(lv1,"devil"),armor:invocationEligible(lv1,"armor")};
    });
    assert.deepEqual(masteryAudit.counts,[3,4,5,6,6]);assert.deepEqual(masteryAudit.barb,[2,3,4,4]);
    assert.equal(masteryAudit.legacy,0);assert.equal(masteryAudit.mastery,"Sap");assert.equal(masteryAudit.unselected,"");
    assert.deepEqual([masteryAudit.bow,masteryAudit.rogueSword,masteryAudit.before,masteryAudit.after,masteryAudit.devil,masteryAudit.armor],[false,false,true,false,false,true]);
    const slotAudit=await page.evaluate(()=>{
      const make=(ed,level)=>pcEnsure(generateCharacter({seed:"SLOT-CREATE",ed,cls:"Sorcerer",level,race:"Human",bg:"Sage",subclass:"none"}));
      const c=make("2024",5);c.used={sorc:0};const original=pcResources(c).find(r=>r.key==="slot1").max;
      const result=convertFontOfMagic(c,"make1"),created=pcResources(c).find(r=>r.key==="slot1").max;
      const points=c.used.sorc;const rejected=convertFontOfMagic(c,"make4");
      pcRest(c,"short");const afterShort=pcResources(c).find(r=>r.key==="slot1").max;
      pcRest(c,"long");const afterLong=pcResources(c).find(r=>r.key==="slot1").max;
      const s=make("2014",3);s.used={sorc:3};const burn=convertFontOfMagic(s,"burn2"),pointsLeft=pcResources(s).find(r=>r.key==="sorc").max-s.used.sorc;
      return {original,result,created,points,rejected,afterShort,afterLong,burn,pointsLeft};
    });
    assert.equal(slotAudit.created,slotAudit.original+1);assert.equal(slotAudit.points,2);
    assert.match(slotAudit.rejected,/Insufficient/);assert.equal(slotAudit.afterShort,slotAudit.created);assert.equal(slotAudit.afterLong,slotAudit.original);
    assert.equal(slotAudit.pointsLeft,2);
    const invocationAudit=await page.evaluate(()=>{
      const make=(ed,cls,level)=>pcEnsure(generateCharacter({seed:"INVOCATION-FINAL",ed,cls,level,race:"Human",bg:"Sage",subclass:"none"}));
      const w=make("2024","Warlock",9);w.prepared.push({n:"Eldritch Blast",l:0,ed:"2024"},{n:"Chill Touch",l:0,ed:"2024"});
      w.choices={"Eldritch Invocations":["agonizing:Eldritch Blast","agonizing:Chill Touch","mask","mind","grave"]};
      const eligible=invocationOptions(w).map(x=>x[0]),affects=invocationAffects(w,"agonizing","Eldritch Blast");
      const p=spellTweak(w,spellOf("2024","Eldritch Blast"),{dice:"1d10",flat:0});syncGrantedSpells(w);
      const free=castOpts(w,spellOf("2024","Disguise Self")).map(x=>x[0]);
      const mind=hasChoice(w,"Eldritch Invocations","mind");w.prepared=w.prepared.filter(p=>p.n!=="Eldritch Blast");
      const removed=!invocationAffects(w,"agonizing","Eldritch Blast");
      const art=make("2024","Artificer",14),legacy=make("2014","Artificer",14);
      const r=pcResources(art).find(r=>r.key==="flashGenius"),old=pcResources(legacy).find(r=>r.key==="flashGenius");
      return {eligible,affects,flat:p.flat,cha:w.mods.cha,free,mind,removed,flash:[r.max,r.recharge,old.recharge],int:art.mods.int,limits:[9,10,14,18].map(l=>artificerAttunementLimit(make("2024","Artificer",l)))};
    });
    assert.ok(invocationAudit.eligible.includes("agonizing:Eldritch Blast")&&invocationAudit.eligible.includes("agonizing:Chill Touch")&&!invocationAudit.eligible.includes("agonizing"));
    assert.ok(invocationAudit.affects&&invocationAudit.removed&&invocationAudit.mind);
    assert.equal(invocationAudit.flat,invocationAudit.cha);assert.deepEqual(invocationAudit.free,["invocation:mask"]);
    assert.deepEqual(invocationAudit.flash,[Math.max(1,invocationAudit.int),"short1","long"]);assert.deepEqual(invocationAudit.limits,[3,4,5,6]);
    const wizardBookAudit=await page.evaluate(()=>{
      const c=pcEnsure(generateCharacter({seed:"WIZ-BOOK",ed:"2024",cls:"Wizard",level:20,race:"Human",bg:"Sage",subclass:"none"}));
      c.prepared.push({n:"Magic Missile",l:1,ed:"2024"});
      const start=wizardBookStart(c),seeded=wizardBookContains(c,"Magic Missile"),rejected=wizardBookAdd(c,"Cure Wounds");
      const ritual=spellOf("2024","Detect Magic"),added=wizardBookAdd(c,"Detect Magic"),options=castOpts(c,ritual).map(x=>x[0]);
      const notRecorded=castOpts(c,spellOf("2024","Fireball")).length===0;
      const blockedRemoval=!wizardBookRemove(c,"Magic Missile");
      const candidates=CHOICES["Signature Spells"].opts(c).map(x=>x[0]);wizardBookAdd(c,"Fireball");
      const enabled=CHOICES["Signature Spells"].opts(c).some(x=>x[0]==="Fireball");
      return {start,seeded,rejected,added,options,notRecorded,blockedRemoval,candidates,enabled};
    });
    assert.deepEqual([wizardBookAudit.start,wizardBookAudit.seeded,wizardBookAudit.rejected,wizardBookAudit.added,wizardBookAudit.notRecorded,wizardBookAudit.blockedRemoval,wizardBookAudit.enabled],[true,true,false,true,true,true,true]);
    assert.deepEqual(wizardBookAudit.options,["ritual"]);assert.ok(!wizardBookAudit.candidates.includes("Fireball"));
    const conditionalAudit=await page.evaluate(()=>{
      const plan=(l,ids,kit=true,crit=false)=>cunningStrikePlan(l,ids,kit,crit);
      const c=pcEnsure(generateCharacter({seed:"APOTHEOSIS",ed:"2024",cls:"Sorcerer",level:20,race:"Human",bg:"Sage",subclass:"none"}));
      c.choices={Metamagic:["twinned","quickened"]};c.used={sorc:20};c.active={"Innate Sorcery":true};
      const before=metamagicOptions(c).map(x=>x[0]),paid=metamagicCost(c,"twinned");actRun(c,"Metamagic","free:quickened");
      const after=metamagicOptions(c).map(x=>x[0]),spent=c.used.sorc;delete c.apotheosisUsedThisTurn;
      return {plans:[plan(5,["trip"]),plan(11,["trip","withdraw"]),plan(14,["knockout","daze"]),plan(14,["knockout"]),plan(5,["poison"],false),plan(5,["daze"]),plan(5,["trip"],true,true)].map(p=>p?[p.dice,p.cost]:null),before,after,spent,paid,reset:metamagicOptions(c).some(x=>x[0]==="free:quickened")};
    });
    assert.deepEqual(conditionalAudit.plans,[[2,1],[4,2],null,[1,6],null,null,[4,1]]);
    assert.ok(conditionalAudit.before.includes("free:quickened")&&!conditionalAudit.after.includes("free:quickened")&&conditionalAudit.reset);
    assert.equal(conditionalAudit.spent,20);assert.equal(conditionalAudit.paid,1);
    const spellPactAudit=await page.evaluate(()=>{
      const make=(ed,cls,level)=>pcEnsure(generateCharacter({seed:"SPELL-PACT",ed,cls,level,race:"Human",bg:"Sage",subclass:"none"}));
      const limits=["Bard","Cleric","Druid","Paladin","Ranger","Sorcerer","Warlock","Wizard"].map(cls=>[1,2,5,10,15,20].map(l=>spellLimits(make("2024",cls,l)).n));
      const old=make("2014","Cleric",5);old.mods.wis=3;
      const w=make("2024","Warlock",12);w.inv=[{id:"pact-test",n:"Longsword",qty:1,eq:true},{id:"ordinary",n:"Dagger",qty:1,eq:true}];
      w.choices={"Eldritch Invocations":["blade","thirst","devouring","lifedrinker","chain","tome"],"Pact Weapon":["pact-test"],"Pact Weapon Ability":["Charisma"],"Pact Weapon Damage":["Psychic"],"Pact Tome Cantrips":["Light"],"Pact Tome Rituals":["Detect Magic"]};
      w.prepared=[];syncGrantedSpells(w);
      const attacks=pcAttacks(w),pact=attacks.find(a=>a.iid==="pact-test"),other=attacks.find(a=>a.iid==="ordinary");
      const chain=castOpts(w,spellOf("2024","Find Familiar")).map(x=>x[0]),tome=["Light","Detect Magic"].map(n=>spellPreparationSources(w,n).some(s=>s.feature==="Pact of the Tome"));
      w.choices["Eldritch Invocations"]=[];syncGrantedSpells(w);
      const removed=pcAttacks(w).find(a=>a.iid==="pact-test");
      const legacy=make("2014","Warlock",3);legacy.choices={"Pact Boon":["chain"]};legacy.prepared=[];syncGrantedSpells(legacy);
      return {limits,old:spellLimits(old).n,pact:[pact.ab,pact.type,pact.prof,pact.hit,pact.tags],cha:w.mods.cha,prof:w.prof,other:!!other.pact,chain,tome,removed:!!removed.pact,legacyChain:castOpts(legacy,spellOf("2014","Find Familiar")).map(x=>x[0])};
    });
    assert.deepEqual(spellPactAudit.limits,[[4,5,9,15,18,22],[4,5,9,15,18,22],[4,5,9,15,18,22],[2,3,6,9,12,15],[2,3,6,9,12,15],[2,4,9,15,18,22],[2,3,6,10,13,15],[4,5,9,15,19,25]]);
    assert.equal(spellPactAudit.old,8);
    assert.deepEqual(spellPactAudit.pact.slice(0,4),["cha","psychic",true,spellPactAudit.cha+spellPactAudit.prof]);assert.ok(spellPactAudit.pact[4].some(t=>t.startsWith("3 pact weapon attacks")));
    assert.deepEqual([spellPactAudit.other,spellPactAudit.removed],[false,false]);
    assert.deepEqual(spellPactAudit.chain,["pactChainFamiliar"]);assert.deepEqual(spellPactAudit.tome,[true,true]);assert.deepEqual(spellPactAudit.legacyChain,["ritual"]);
    const storedItemAudit=await page.evaluate(()=>{
      const make=(ed,level)=>pcEnsure(generateCharacter({seed:"ARTIFICER-STORED",ed,cls:"Artificer",level,race:"Human",bg:"Sage",subclass:"none"}));
      const c=make("2024",11);c.inv=[{id:"stored-tool",n:"Tinker's Tools",qty:1}];c.choices={"Spell-Storing Item Object":["stored-tool"]};
      const candidates=artificerStoreOptions(c).map(x=>x[0]),created=artificerStore(c,"Cure Wounds"),max=pcResources(c).find(r=>r.key==="artificerStored").max;
      const cast=actRun(c,"Spell-Storing Item");const after=c.used.artificerStored;
      const blocked=actRun(c,"Spell-Storing Item"),afterBlocked=c.used.artificerStored;
      actRun(c,"Reset Spell-Storing Item turn","next");const unlocked=actChoices(c,ACT["Spell-Storing Item"]).length;
      pcRest(c,"short");pcRest(c,"long");const rested=c.used.artificerStored;
      artificerStore(c,"Cure Wounds");const reset=c.used.artificerStored;c.inv=[];const removed=!pcResources(c).some(r=>r.key==="artificerStored");
      const old=make("2014",11),oldOptions=artificerStoreOptions(old).map(x=>x[0]);
      return {candidates,created,max,int:c.mods.int,cast,after,blocked,afterBlocked,unlocked,rested,reset,removed,oldOptions,below:artificerStoreOptions(make("2024",10)).length,
        rules:[artificerStoreSpellEligible("2014",11,{l:2,c:["Artificer"],t:"1 action",m:"which the spell consumes"}),artificerStoreSpellEligible("2024",11,{l:3,c:["Artificer"],t:"Action",m:"which the spell consumes"}),artificerStoreSpellEligible("2024",11,{l:3,c:["Artificer"],t:"Action"}),artificerStoreSpellEligible("2014",11,{l:3,c:["Artificer"],t:"Action"})]};
    });
    assert.ok(storedItemAudit.candidates.includes("Cure Wounds")&&storedItemAudit.oldOptions.includes("Cure Wounds"));
    assert.ok(storedItemAudit.created.startsWith("Stored")&&storedItemAudit.cast.includes("Cure Wounds"));
    assert.equal(storedItemAudit.max,Math.max(2,2*storedItemAudit.int));assert.deepEqual([storedItemAudit.after,storedItemAudit.rested,storedItemAudit.reset,storedItemAudit.removed,storedItemAudit.below],[1,1,0,true,0]);
    assert.match(storedItemAudit.blocked,/eligible/);assert.deepEqual([storedItemAudit.afterBlocked,storedItemAudit.unlocked],[1,1]);
    assert.deepEqual(storedItemAudit.rules,[true,false,true,false]);
    const artificerCompletionAudit=await page.evaluate(()=>{
      const make=ed=>pcEnsure(generateCharacter({seed:"ARTIFICER-CAPSTONE",ed,cls:"Artificer",level:20,race:"Human",bg:"Sage",subclass:"none"}));
      const c=make("2014");itLoad();c.kitMoved=true;c.inv=[];c.used={};
      c.choices={"Infuse Item":["Enhanced Defense","Enhanced Weapon","Returning Weapon","Enhanced Arcane Focus"]};
      const shield=eqGear("2014","Shield"),dagger=eqGear("2014","Dagger");
      const inv=(id,x)=>({id,ref:x.id,n:x.n,qty:1,eq:true,attuned:false});
      c.inv=[inv("shield",shield),inv("dagger",dagger)];
      const before=pcAttacks(c).find(a=>a.iid==="dagger")?.hit;
      const a=artificerInfusionOptions(c).find(x=>x[1]==="Enhanced Weapon · "+dagger.n);
      artificerApplyInfusion(c,a[0]);const after=pcAttacks(c).find(x=>x.iid==="dagger")?.hit;
      const b=artificerInfusionOptions(c).find(x=>x[1]==="Enhanced Defense · "+shield.n);
      artificerApplyInfusion(c,b[0]);const armorBonus=artificerInfusionBonus(c,c.inv[0],"armor");
      c.hpCur=0;c.death={s:0,f:0};const legacy=artificerLegacyDeath(c,"dagger");
      const legacyHP=c.hpCur,legacyEnded=!c.inv[1].artificerInfusion;
      c.choices["Infuse Item"]=[];pcRecompute(c);const removed=!c.inv[0].artificerInfusion;
      const now=make("2024");now.inv=[];now.used={};const bag=artificerPlanOptions(now).find(x=>x[1].startsWith("Bag of Holding ("))[0];
      now.choices={"Replicate Magic Item":[bag]};artificerCreateReplica(now,bag);
      now.hpCur=0;now.death={s:0,f:0};const options=artificerCheatDeathOptions(now),recovery=artificerCheatDeath(now,options[0][0]),revisedHP=now.hpCur,replicas=artificerReplicas(now).length;
      const generic=[
        artificerGenericPlanEligible(2,{n:"Example",r:"Common",type:"Wondrous item",d:"Harmless magical effect"}),
        artificerGenericPlanEligible(2,{n:"Potion",r:"Common",type:"Potion",d:"Harmless magical effect"}),
        artificerGenericPlanEligible(9,{n:"Example",r:"Uncommon",type:"Wondrous item"}),
        artificerGenericPlanEligible(10,{n:"Example",r:"Uncommon",type:"Wondrous item"}),
        artificerGenericPlanEligible(14,{n:"Example",r:"Rare",type:"Wondrous item",d:"This item is cursed."}),
        artificerGenericPlanEligible(14,{n:"Example",r:"Rare",type:"Ring"}),
        artificerGenericPlanEligible(14,{n:"Example",r:"Rare",type:"Wondrous item"})
      ];
      now.inv=[{id:"tools",n:"Tinker's Tools",qty:1},{id:"junk",n:"Unremarkable Pebble",qty:1}];now.choices["Spell-Storing Item Object"]=["tools"];
      const validObjects=artificerStoreItemOptions(now).map(x=>x[0]),first=artificerStore(now,"Cure Wounds"),repeat=artificerStore(now,"Cure Wounds");
      return {before,after,armorBonus,legacy,legacyHP,legacyEnded,removed,recovery,revisedHP,max:now.hp,replicas,generic,validObjects,first,repeat};
    });
    assert.equal(artificerCompletionAudit.after-artificerCompletionAudit.before,2);
    assert.equal(artificerCompletionAudit.armorBonus,2);
    assert.deepEqual([artificerCompletionAudit.legacyHP,artificerCompletionAudit.legacyEnded,artificerCompletionAudit.removed],[1,true,true]);
    assert.equal(artificerCompletionAudit.revisedHP,Math.min(20,artificerCompletionAudit.max));assert.equal(artificerCompletionAudit.replicas,0);
    assert.deepEqual(artificerCompletionAudit.generic,[true,false,false,true,false,false,true]);
    assert.deepEqual(artificerCompletionAudit.validObjects,["tools"]);assert.match(artificerCompletionAudit.first,/^Stored/);assert.match(artificerCompletionAudit.repeat,/already stored/);
    const infusionAudit=await page.evaluate(()=>{
      const make=(ed,level)=>pcEnsure(generateCharacter({seed:"ARTIFICER-INFUSIONS",ed,cls:"Artificer",level,race:"Human",bg:"Sage",subclass:"none"}));
      const c=make("2014",20);c.kitMoved=true;c.used={};
      const item=(id,n)=>{const ref=eqGear("2014",n);return {id,ref:ref?.id,n:ref?.n||n,qty:1,eq:true};};
      const shield=item("shield","Shield"),armor=item("armor","Chain Shirt"),helmet=item("helmet","Steel helmet"),dagger=item("dagger","Dagger");
      c.inv=[shield,armor,helmet,dagger];
      c.choices={"Infuse Item":["Repulsion Shield","Resistant Armor","Helm of Awareness","Radiant Weapon","Arcane Propulsion Armor","Mind Sharpener"]};
      const apply=(n,i,type)=>actRun(c,"Apply Infusion",JSON.stringify(type?[n,i.id,type]:[n,i.id]));
      const speedBase=pcSpeed(c).speed,attackBase=pcAttacks(c).find(a=>a.iid===dagger.id).hit,baseAc=pcAC(c).ac;
      const invalid=apply("Resistant Armor",shield,"fire");
      apply("Repulsion Shield",shield);const chargeRef=artificerInfusionChargeItem(c,shield),start=itemChargeState(shield,chargeRef).left;
      const unattuned=itemChargeUse(shield,chargeRef,0,()=>1);
      shield.attuned=true;const afterUse=itemChargeUse(shield,chargeRef,0,()=>1).left,extraAc=pcAC(c).ac-baseAc;
      pcRest(c,"long");const afterRest=itemChargeState(shield,chargeRef).left,afterDawn=itemChargeDawn(shield,chargeRef,()=>2).left;
      apply("Resistant Armor",armor,"fire");armor.attuned=true;const resistant=pcFx(c).res.has("fire");
      apply("Helm of Awareness",helmet);helmet.attuned=true;const initiative=rollState(c,"init","dex").adv.includes("Helm of Awareness");
      apply("Radiant Weapon",dagger);dagger.attuned=true;const extraHit=pcAttacks(c).find(a=>a.iid===dagger.id).hit-attackBase;
      artificerEndInfusion(c,armor);apply("Arcane Propulsion Armor",armor);armor.attuned=true;
      const extraSpeed=pcSpeed(c).speed-speedBase,force=pcAttacks(c).some(a=>a.name==="Arcane Propulsion gauntlet"&&a.type==="force"&&a.die==="1d8"),removedResistance=!pcFx(c).res.has("fire");
      c.hpCur=0;c.death={dead:true,f:0};c.mods.int=2;
      const survival=artificerLegacyDeathOptions(c).length;
      artificerRecordDeath(c);artificerAdvanceDeathExpiry(c);const legacyDays=shield.artificerInfusion.deathDays;
      artificerRecordDeath(c);artificerAdvanceDeathExpiry(c);const legacyExpired=c.inv.length===4&&!shield.artificerInfusion&&!shield.attuned&&!shield.itemCharge;
      const revised=make("2024",20);revised.inv=[];const bag=artificerPlanOptions(revised).find(([,name])=>name.startsWith("Bag of Holding ("))[0];
      revised.choices={"Replicate Magic Item":[bag]};artificerCreateReplica(revised,bag);
      revised.hpCur=0;revised.death={dead:true,f:0};const revisedSurvival=artificerCheatDeathOptions(revised).length;
      artificerRecordDeath(revised);const startDays=revised.inv[0].artificerOrigin.deathDays;
      for(let day=0;day<startDays;day++)artificerAdvanceDeathExpiry(revised);
      const learner=make("2014",2),bagPlan=artificerLegacyInfusionOptions(learner).find(([,name])=>name==="Replicate Magic Item · Bag of Holding")[0];
      const backpack=item("bag","Backpack"),heart={id:"heart",n:"Amethyst",value:"100 gp",qty:1},cheap={...heart,id:"cheap",value:"99 gp"};
      learner.inv=[backpack,heart,cheap];learner.choices={"Infuse Item":[bagPlan,"Homunculus Servant"]};learner.used={};
      const overTier=artificerLegacyInfusionOptions(learner).some(([,name])=>name==="Replicate Magic Item · Ring of Protection");
      const lowQuiver=artificerLegacyInfusionOptions(make("2014",9)).some(([,name])=>name.includes("Quiver of Ehlonna"));
      const quiverPlan=artificerLegacyInfusionOptions(make("2014",10)).find(([,name])=>name.includes("Quiver of Ehlonna"));
      const quiver=quiverPlan?legacyReplicaRef(quiverPlan[0]).n:null;
      const cheapEligible=artificerInfusionOptions(learner).some(([key])=>key===JSON.stringify(["Homunculus Servant",cheap.id]));
      actRun(learner,"Apply Infusion",JSON.stringify([bagPlan,backpack.id]));
      actRun(learner,"Apply Infusion",JSON.stringify(["Homunculus Servant",heart.id]));
      const replicated=inventoryCatalogItem(backpack,"2014").n,servant=companionState(learner,"homunculus");
      companionSetHP(learner,"homunculus",0);const vanished=!companionState(learner,"homunculus")&&learner.inv.some(i=>i.id===heart.id);
      actRun(learner,"End Infusion",backpack.id);const restoredBase=inventoryCatalogItem(backpack,"2014").n;
      return {invalid,start,unattuned,afterUse,afterRest,afterDawn,extraAc,resistant,initiative,extraHit,extraSpeed,force,removedResistance,survival,legacyDays,legacyExpired,revisedSurvival,startDays,revisedExpired:revised.inv.length===0,overTier,lowQuiver,quiver,cheapEligible,replicated,servant: [servant.ac,servant.hp,servant.type],expectedHp:Math.max(1,3+learner.mods.int),vanished,restoredBase};
    });
    assert.match(infusionAudit.invalid,/unavailable/);
    assert.deepEqual([infusionAudit.start,infusionAudit.unattuned,infusionAudit.afterUse,infusionAudit.afterRest,infusionAudit.afterDawn,infusionAudit.extraAc],[4,null,3,3,4,1]);
    assert.deepEqual([infusionAudit.resistant,infusionAudit.initiative,infusionAudit.extraHit,infusionAudit.extraSpeed,infusionAudit.force,infusionAudit.removedResistance],[true,true,1,5,true,true]);
    assert.deepEqual([infusionAudit.survival,infusionAudit.legacyDays,infusionAudit.legacyExpired,infusionAudit.revisedSurvival,infusionAudit.revisedExpired],[0,1,true,0,true]);
    assert.ok(infusionAudit.startDays>=1&&infusionAudit.startDays<=4);
    assert.deepEqual([infusionAudit.overTier,infusionAudit.cheapEligible,infusionAudit.replicated,infusionAudit.vanished,infusionAudit.restoredBase],[false,false,"Bag of Holding",true,"Backpack"]);
    assert.deepEqual([infusionAudit.lowQuiver,infusionAudit.quiver],[false,"Efficient Quiver"]);
    assert.deepEqual(infusionAudit.servant,[13,infusionAudit.expectedHp,"force"]);
    const channelAudit=await page.evaluate(()=>{
      const make=ed=>pcEnsure(generateCharacter({seed:"CHANNEL-MULTI",ed,cls:"Cleric",level:6,race:"Human",bg:"Sage",subclass:"none",multi:[{cls:"Paladin",lv:4,subclass:"none"}]}));
      const old=make("2014"),now=make("2024");
      // Explicitly verify the test fixture contains both classes before exercising resources.
      const levels=[clsLv(old,"Cleric"),clsLv(old,"Paladin"),clsLv(now,"Cleric"),clsLv(now,"Paladin")];
      const pools=c=>pcResources(c).filter(r=>r.key.startsWith("channel")).map(r=>[r.key,r.max,r.recharge]);
      now.used={channel:1};const revised=pools(now),migrated=[now.used.channelCleric,now.used.channelPaladin];
      const names=pcAbilities(now).filter(x=>x.name.startsWith("Channel Divinity (")).map(x=>[x.name,x.res]);
      actRun(now,"Channel Divinity (Cleric)","turn");const spent=[now.used.channelCleric,now.used.channelPaladin];pcRest(now,"short");const rested=[now.used.channelCleric,now.used.channelPaladin];
      return {levels,legacy:pools(old),revised,migrated,names,spent,rested};
    });
    assert.deepEqual(channelAudit.levels,[6,4,6,4]);
    assert.deepEqual(channelAudit.legacy,[["channel",2,"short"]]);
    assert.deepEqual(channelAudit.revised,[["channelCleric",3,"short1"],["channelPaladin",2,"short1"]]);
    assert.deepEqual(channelAudit.migrated,[1,1]);assert.deepEqual(channelAudit.spent,[2,1]);assert.deepEqual(channelAudit.rested,[1,0]);
    assert.deepEqual(channelAudit.names,[["Channel Divinity (Cleric)","channelCleric"],["Channel Divinity (Paladin)","channelPaladin"]]);
    const artificerCraftAudit=await page.evaluate(()=>{
      const c=pcEnsure(generateCharacter({seed:"ART-CRAFT",ed:"2024",cls:"Artificer",level:6,race:"Human",bg:"Sage",subclass:"none"}));
      c.inv=[];c.used={};itLoad();
      const plan=artificerPlanOptions(c).find(x=>x[1].startsWith("Bag of Holding ("))[0];
      const wand=artificerPlanOptions(c).find(x=>x[1].startsWith("Wand of Magic Missiles ("))[0];
      c.choices={"Replicate Magic Item":[plan,wand]};
      const gear=artificerTinkerOptions(c).find(x=>x[1]==="Rope")[0];actRun(c,"Tinker's Magic",gear);
      actRun(c,"Replicate Magic Item",plan);
      const count=artificerReplicas(c).length,duplicate=artificerCreateOptions(c).some(x=>x[0]===plan);
      const transform=artificerTransmuteOptions(c)[0][0];actRun(c,"Transmute Magic Item",transform);
      const transformed=artificerReplicas(c)[0].ref===wand;
      const i=artificerReplicas(c)[0],ref=itFind(i.ref);itemChargeInitialize(i,ref,1);
      const charge=artificerChargeOptions(c).find(x=>JSON.parse(x[0])[1]==="slot1");
      actRun(c,"Charge Magic Item",charge[0]);const charged=i.itemCharge.left,spent=c.used.slot1;
      actRun(c,"Drain Magic Item",i.id);const created=temporarySlotCount(c,2),remaining=artificerReplicas(c).length;
      pcRest(c,"short");const short=temporarySlotCount(c,2),ropeShort=c.inv.some(i=>i.n==="Rope");
      pcRest(c,"long");const long=temporarySlotCount(c,2),ropeLong=c.inv.some(i=>i.n==="Rope");
      return {count,duplicate,transformed,charged,spent,created,remaining,short,long,ropeShort,ropeLong,limits:["2014","2024"].map(ed=>[1,2,6,10,14,18].map(l=>artificerPlanLimits(ed,l)))};
    });
    assert.deepEqual([artificerCraftAudit.count,artificerCraftAudit.duplicate,artificerCraftAudit.transformed,artificerCraftAudit.charged,artificerCraftAudit.spent,artificerCraftAudit.created,artificerCraftAudit.remaining,artificerCraftAudit.short,artificerCraftAudit.long,artificerCraftAudit.ropeShort,artificerCraftAudit.ropeLong],[1,false,true,2,1,1,0,1,0,true,false]);
    assert.deepEqual(artificerCraftAudit.limits.map(x=>x.map(y=>y.known)),[[0,4,6,8,10,12],[0,4,5,6,7,8]]);
    const invocationLifecycleAudit=await page.evaluate(()=>{
      const w=pcEnsure(generateCharacter({seed:"WAR-REMAIN",ed:"2024",cls:"Warlock",level:9,race:"Human",bg:"Sage",subclass:"none"}));
      w.choices={"Eldritch Invocations":["chain","investment","depths","vigor","armor","shadows","leap"],"Chain Master Movement":["Fly 40 feet"]};syncGrantedSpells(w);
      const resources=pcResources(w),keys=resources.filter(x=>x.key.startsWith("invocation:")).map(x=>x.key);
      const depth=resources.find(x=>x.key==="invocation:depths"),max=depth.max;
      const moves=pcSpeed(w).other.join(" ");
      const valid=invocationEligible(w,"investment");
      w.choices["Eldritch Invocations"]=w.choices["Eldritch Invocations"].filter(x=>x!=="chain");syncGrantedSpells(w);
      const removed=!invocationEligible(w,"investment"),noFamiliar=!pcResources(w).some(x=>x.key==="pactChainFamiliar");
      const old=pcEnsure(generateCharacter({seed:"WAR-OLD",ed:"2014",cls:"Warlock",level:9,race:"Human",bg:"Sage",subclass:"none"}));old.choices={"Eldritch Invocations":["shadows","depths","vigor"]};syncGrantedSpells(old);
      return {keys,max,moves,valid,removed,noFamiliar,oldKeys:pcResources(old).map(x=>x.key)};
    });
    assert.ok(["invocation:depths","invocation:vigor","invocation:armor","invocation:shadows","invocation:leap"].every(k=>invocationLifecycleAudit.keys.includes(k)));
    assert.equal(invocationLifecycleAudit.max,1);assert.match(invocationLifecycleAudit.moves,/Breathe underwater/);
    assert.deepEqual([invocationLifecycleAudit.valid,invocationLifecycleAudit.removed,invocationLifecycleAudit.noFamiliar],[true,true,true]);
    assert.ok(!invocationLifecycleAudit.oldKeys.includes("invocation:depths")&&!invocationLifecycleAudit.oldKeys.includes("invocation:shadows"));
    const subclassOwnerAudit=await page.evaluate(()=>{
      const make=(ed,cls,level,subclass,multi=[])=>pcEnsure(generateCharacter({seed:"SUBOWNER",ed,cls,level,subclass,race:"Human",bg:"Sage",multi}));
      const c=make("2024","Wizard",10,"Evoker",[{cls:"Fighter",lv:3,subclass:"Battle Master"}]);
      const before=c.feats.filter(f=>f.mcsub==="Battle Master").map(f=>f.f),pool=pcResources(c).find(r=>r.key===subAblKey("Combat Superiority"));
      const selection=CHOICES["Combat Superiority"].n(c),desc=featDesc("Combat Superiority",c,c.feats.find(f=>f.mcsub==="Battle Master"&&f.f==="Combat Superiority"));
      pcSubSync(c);const synced=c.feats.filter(f=>f.mcsub==="Battle Master").map(f=>f.f);
      c.multi[0].subclass="Champion";pcSubSync(c);
      const stale=c.feats.some(f=>f.mcsub==="Battle Master"),crit=subBonusOf(c).crit;
      const p=make("2024","Cleric",1,"Life Domain");
      const premature=p.feats.filter(f=>f.subOwner).length;
      const m=make("2024","Fighter",5,"Champion",[{cls:"Sorcerer",lv:3,subclass:"Draconic Sorcery"}]);
      const hp=m.subHp;const i=make("2024","Wizard",2,"none",[{cls:"Ranger",lv:7,subclass:"Gloom Stalker"}]);
      const saves=[...i.saves];pcSubNumbers(i);pcSubNumbers(i);
      return {before,synced,pool:pool?.max,selection,desc,stale,crit,premature,hp,saves,after:i.saves};
    });
    assert.deepEqual(subclassOwnerAudit.synced,subclassOwnerAudit.before);assert.equal(subclassOwnerAudit.pool,4);assert.equal(subclassOwnerAudit.selection,3);
    assert.ok(subclassOwnerAudit.desc.length>20);assert.equal(subclassOwnerAudit.stale,false);assert.equal(subclassOwnerAudit.crit,19);assert.equal(subclassOwnerAudit.premature,0);assert.equal(subclassOwnerAudit.hp,3);assert.deepEqual(subclassOwnerAudit.saves,subclassOwnerAudit.after);
    const subclassSpellAudit=await page.evaluate(()=>{
      const make=(ed,cls,level,subclass)=>pcEnsure(generateCharacter({seed:"SUBSPELL",ed,cls,level,subclass,race:"Human",bg:"Sage"}));
      const f=make("2014","Warlock",5,"The Fiend"),r=make("2024","Warlock",5,"Fiend Patron");
      const options=pcSpellPool(f,"2014").map(s=>s.n),legacyAuto=isPrep(f,"Fireball","2014"),revisedAuto=isPrep(r,"Fireball","2024");
      const soul=make("2014","Sorcerer",5,"Divine Soul"),soulOptions=pcSpellPool(soul,"2014").map(s=>s.n);
      const ranger=make("2014","Ranger",5,"Gloom Stalker"),rangerSpells=ranger.prepared.filter(p=>p.sources?.some(x=>x.name==="Gloom Stalker")).map(p=>p.n);
      const gen=make("2014","Warlock",17,"The Genie");gen.choices={"Genie's Vessel":["Efreeti"]};syncGrantedSpells(gen);
      const genieFire=legacySubclassOption(gen,"2014","Warlock",spellOf("2014","Fireball")),wish=CHOICES["Mystic Arcanum 9"].opts(gen).some(x=>x[0]==="Wish");
      const compatibility=subclassList("2024","Cleric").map(x=>x[0]),tempest=make("2024","Cleric",3,"Tempest Domain");
      const hasEarly=tempest.feats.some(x=>x.subOwner&&x.l<3),thunder=isPrep(tempest,"Thunderwave","2024");
      const legacyReplaced=subclassList("2024","Sorcerer").some(x=>x[0]==="Aberrant Mind");
      return {fire:options.includes("Fireball"),legacyAuto,revisedAuto,cleric:soulOptions.includes("Bless"),rangerSpells,genieFire,wish,compatibility,hasEarly,thunder,legacyReplaced};
    });
    assert.deepEqual([subclassSpellAudit.fire,subclassSpellAudit.legacyAuto,subclassSpellAudit.revisedAuto,subclassSpellAudit.cleric,subclassSpellAudit.genieFire,subclassSpellAudit.wish],[true,false,true,true,true,true]);
    assert.deepEqual(subclassSpellAudit.rangerSpells.sort(),["Disguise Self","Rope Trick"]);
    assert.ok(subclassSpellAudit.compatibility.includes("Tempest Domain"));assert.deepEqual([subclassSpellAudit.hasEarly,subclassSpellAudit.thunder,subclassSpellAudit.legacyReplaced],[false,true,false]);
    const srdSubclassAudit=await page.evaluate(()=>{
      const names=["Path of the Berserker","College of Lore","Life Domain","Circle of the Land","Champion","Warrior of the Open Hand","Oath of Devotion","Hunter","Thief","Draconic Sorcery","Fiend Patron","Evoker"];
      const owners=["Barbarian","Bard","Cleric","Druid","Fighter","Monk","Paladin","Ranger","Rogue","Sorcerer","Warlock","Wizard"];
      let builds=0,rows=0;const errors=[];
      for(let k=0;k<names.length;k++){
        const feats=subclassFeatureRows("2024",owners[k],names[k]);rows+=feats.length;
        if(!feats.every(f=>f.source==="srd52"&&f.sourceId&&f.page&&f.d.length>20))errors.push(names[k]+": source");
        for(let lv=1;lv<=20;lv++){
          const c=pcEnsure(generateCharacter({seed:"SRD-SUB",ed:"2024",cls:owners[k],level:lv,subclass:names[k],race:"Human",bg:"Sage"}));builds++;
          const expected=feats.filter(f=>lv>=3&&f.l<=lv).map(f=>f.n).sort(),actual=c.feats.filter(f=>f.subOwner===owners[k]).map(f=>f.f).sort();
          if(JSON.stringify(expected)!==JSON.stringify(actual))errors.push(names[k]+" "+lv+": progression");
        }
      }
      const make=(cls,lv,sub)=>pcEnsure(generateCharacter({seed:"SRD-SUB-OPS",ed:"2024",cls,level:lv,subclass:sub,race:"Human",bg:"Sage"}));
      const bard=make("Bard",6,"College of Lore");bard.choices={"Lore Bonus Proficiencies":CHOICES["Lore Bonus Proficiencies"].opts(bard).slice(0,3).map(x=>x[0]),"Magical Discoveries":["Bless","Fireball"]};syncGrantedSpells(bard);pcRecompute(bard);
      const keepLeak=bard.skills.filter(s=>s.loreGranted&&pcKeep(bard).keepSkills.includes(s.s)).length;const skills=bard.skills.filter(s=>s.loreGranted).length,spells=bard.prepared.filter(p=>p.sources?.some(x=>x.feature==="Magical Discoveries")).map(p=>p.n).sort();
      const land=make("Druid",10,"Circle of the Land");land.choices={"Circle of the Land Spells":["Arid"]};syncGrantedSpells(land);const pool=pcResources(land).filter(r=>r.key==="landFreeCast").map(r=>r.max);
      const sorc=make("Sorcerer",18,"Draconic Sorcery");sorc.choices={"Elemental Affinity":["fire"]};syncGrantedSpells(sorc);
      const dragon=pcResources(sorc).some(r=>r.key==="dragonCompanion"&&r.max===1),affinity=pcFx(sorc).res.has("fire");
      const thief=make("Rogue",13,"Thief"),fiend=make("Warlock",10,"Fiend Patron");
      return {builds,rows,errors,skills,keepLeak,spells,pool,ward:pcFx(land).res.has("fire"),dragon,affinity,limit:artificerAttunementLimit(thief),force:ACT["Fiendish Resilience"].choices(fiend).some(x=>x[0]==="force")};
    });
    assert.equal(srdSubclassAudit.builds,240);assert.equal(srdSubclassAudit.rows,58);assert.deepEqual(srdSubclassAudit.errors,[]);
    assert.equal(srdSubclassAudit.skills,3);assert.equal(srdSubclassAudit.keepLeak,0);assert.deepEqual(srdSubclassAudit.spells,["Bless","Fireball"]);assert.deepEqual(srdSubclassAudit.pool,[1]);assert.deepEqual([srdSubclassAudit.ward,srdSubclassAudit.dragon,srdSubclassAudit.affinity,srdSubclassAudit.limit,srdSubclassAudit.force],[true,true,true,4,false]);
    const subclassResourceAudit=await page.evaluate(()=>{
      const make=(ed,cls,level,subclass)=>pcEnsure(generateCharacter({seed:"SUB-RESOURCE",ed,cls,level,subclass,race:"Human",bg:"Sage"}));
      const cases=[["Barbarian",14,"Path of the Berserker","Intimidating Presence","Restore Intimidating Presence","berserkerPresence","rage",1],["Sorcerer",14,"Draconic Sorcery","Dragon Wings","Restore Dragon Wings","draconicWings","sorc",3],["Paladin",20,"Oath of Devotion","Holy Nimbus","Restore Holy Nimbus",subAblKey("Holy Nimbus"),"slot5",1],["Warlock",14,"Fiend Patron","Hurl Through Hell","Restore Hurl Through Hell",subAblKey("Hurl Through Hell"),"pact",1]];
      const recovery=cases.map(([cls,lv,sub,action,restore,target,pay,cost])=>{
        const c=make("2024",cls,lv,sub);c.used={};const untouched=restoreSubclassUse(c,restore);actRun(c,action);const used=c.used[target];const result=restoreSubclassUse(c,restore);return [untouched.includes("already"),used,c.used[target],c.used[pay],cost,result.includes("recovered")];
      });
      const monk=make("2024","Monk",17,"Warrior of the Open Hand");monk.used={};actRun(monk,"Quivering Palm","set");const set=monk.used.ki;const q=actRun(monk,"Quivering Palm","release");const released=monk.used.ki;const noMark=!monk.quiveringPalm;
      const druid=make("2024","Druid",14,"Circle of the Land");druid.choices={"Circle of the Land Spells":["Arid"]};druid.used={};actRun(druid,"Nature's Sanctuary");const wild=druid.used.wild;
      const life=make("2024","Cleric",17,"Life Domain"),P={heal:true,dice:"2d8"},L=revisedLifeHealing(life,P,3,"slot3"),F=revisedLifeHealing(life,P,3,"free");return {recovery,set,released,noMark,q:q?.kind,wild,L,F,max:rollLifeHealing("2d8+3",L).total};
    });
    assert.ok(subclassResourceAudit.recovery.every(x=>x[0]&&x[1]===1&&x[2]===0&&x[3]===x[4]&&x[5]));
    assert.deepEqual([subclassResourceAudit.set,subclassResourceAudit.released,subclassResourceAudit.noMark,subclassResourceAudit.q,subclassResourceAudit.wild],[4,4,true,"damage",1]);
    assert.deepEqual(subclassResourceAudit.L,{bonus:5,maximum:true,blessed:5});assert.deepEqual(subclassResourceAudit.F,{bonus:0,maximum:true,blessed:0});assert.equal(subclassResourceAudit.max,24);
    const recoveredSubclassAudit=await page.evaluate(()=>{
      const cases=[["Barbarian","Path of the Giant","bgg",5],["Barbarian","Path of the Battlerager","scag",5],["Fighter","Purple Dragon Knight (Banneret)","scag",6],["Monk","Way of the Long Death","scag",4]];
      const rows=cases.map(([cls,name,src,n])=>{const x=subclassEntry("2014",cls,name);return [x.src,x.features.length,x.features.every(f=>f.d&&!/^See /.test(f.d)),x.featureSourceReview?.primaryVerified===false,n];});
      const make=(cls,level,subclass)=>pcEnsure(generateCharacter({seed:"LEGACY-RECOVERY",ed:"2014",cls,level,subclass,race:"Human",bg:"Sage"}));
      const monk=make("Monk",17,"Way of the Long Death");monk.used={};monk.hpTemp=0;actRun(monk,"Touch of Death");const temp=monk.hpTemp,expected=17+monk.mods.wis;monk.hpCur=0;actRun(monk,"Mastery of Death");const hp=monk.hpCur;const r=actRun(monk,"Touch of the Long Death","4");const used=monk.used.ki;
      const giant=make("Barbarian",6,"Path of the Giant");giant.choices={"Giant Power":["Druidcraft"]};syncGrantedSpells(giant);const spell=spellOf("2014","Druidcraft"),grant=spellPreparationSources(giant,"Druidcraft","2014").some(s=>s.feature==="Giant Power"),ab=spellCaster(giant,spell,"free","2014").ab;
      return {rows,temp,expected,hp,used,damage:r?.kind,grant,ab};
    });
    assert.ok(recoveredSubclassAudit.rows.every(x=>x[1]===x[4]&&x[2]&&x[3]));
    assert.equal(recoveredSubclassAudit.temp,Math.max(1,recoveredSubclassAudit.expected));assert.deepEqual([recoveredSubclassAudit.hp,recoveredSubclassAudit.used,recoveredSubclassAudit.damage,recoveredSubclassAudit.grant,recoveredSubclassAudit.ab],[1,5,"damage",true,"wis"]);
    const battleMasterAudit=await page.evaluate(()=>{
      const make=ed=>pcEnsure(generateCharacter({seed:"MANEUVER-AUDIT",ed,cls:"Wizard",level:2,race:"Human",bg:"Sage",subclass:"none",multi:[{cls:"Fighter",lv:10,subclass:"Battle Master"}]}));
      const run=ed=>{
        const c=make(ed),key=subAblKey("Combat Superiority");c.choices={"Combat Superiority":[]};c.used={};
        const empty=actChoices(c,ACT["Combat Superiority"]).length,blocked=actRun(c,"Combat Superiority","trip"),before=c.used[key]||0;
        c.choices["Combat Superiority"]=["trip","parry","rally","precision","ambush","riposte"];
        const choices=actChoices(c,ACT["Combat Superiority"]).map(x=>x[0]);
        const unselected=actRun(c,"Combat Superiority","disarm"),afterBlocked=c.used[key]||0;
        const parry=actRun(c,"Combat Superiority","parry"),rally=actRun(c,"Combat Superiority","rally"),precision=actRun(c,"Combat Superiority","precision"),trip=actRun(c,"Combat Superiority","trip"),riposte=actRun(c,"Combat Superiority","riposte");
        return {empty,blocked,before,choices,unselected,afterBlocked,parry:typeof parry,rally:rally.kind,precision:typeof precision,trip:trip.kind,riposte:typeof riposte,used:c.used[key]};
      };
      return {legacy:run("2014"),revised:run("2024")};
    });
    for(const result of Object.values(battleMasterAudit)){
      assert.equal(result.empty,0);assert.match(result.blocked,/No eligible/);assert.equal(result.before,0);
      assert.match(result.unselected,/unavailable/);assert.equal(result.afterBlocked,0);
      assert.deepEqual([result.parry,result.rally,result.precision,result.trip,result.riposte,result.used],["string","temp","string","damage","string",5]);
    }
    assert.equal(battleMasterAudit.legacy.choices.includes("ambush"),false);assert.equal(battleMasterAudit.revised.choices.includes("ambush"),true);
    const psiAudit=await page.evaluate(()=>{
      const make=(ed,cls,level,subclass,multi=[])=>pcEnsure(generateCharacter({seed:"PSIONIC-AUDIT",ed,cls,level,subclass,race:"Human",bg:"Sage",multi}));
      const dual=ed=>make(ed,"Fighter",11,"Psi Warrior",[{cls:"Rogue",lv:9,subclass:"Soulknife"}]);
      const run=ed=>{
        const c=dual(ed);c.used={"sub:psionic-power":2};
        const resources=pcResources(c),F=resources.find(x=>x.key==="psiFighter"),R=resources.find(x=>x.key==="psiRogue"),migration=[c.used.psiFighter,c.used.psiRogue];
        c.used={};c.active={};
        const field=actRun(c,"Protective Field"),strike=actRun(c,"Psionic Strike"),separate=[c.used.psiFighter,c.used.psiRogue||0];
        actRun(c,"Psi-Bolstered Knack","roll");actRun(c,"Psi-Bolstered Knack","failure");const failed=c.used.psiRogue||0;
        actRun(c,"Homing Strikes","roll");actRun(c,"Homing Strikes","success");const success=c.used.psiRogue;
        actRun(c,"Psychic Whispers");const free=[c.used.psiWhispers,c.used.psiRogue];actRun(c,"Psychic Whispers");const paid=c.used.psiRogue;
        actRun(c,"Telekinetic Movement");const freeMove=c.used.psiFighter;actRun(c,"Restore Telekinetic Movement");const restore=[c.used.psiFighter,c.used.psiMovement];
        actRun(c,"Psi-Bolstered Knack","roll");pcRest(c,"short");const afterShort=[c.used.psiFighter,c.used.psiRogue,!!c.psiPending];
        if(ed==="2014"){actRun(c,"Psi Warrior: Recover die");actRun(c,"Psi Warrior: Recover die");}
        const afterRecovery=[c.used.psiFighter,c.used.psiRogue];
        pcRest(c,"long");const afterLong=[c.used.psiFighter||0,c.used.psiRogue||0,c.used.psiWhispers||0];
        return {pools:[F.max,R.max],dice:[psiDie(c,"Fighter"),psiDie(c,"Rogue")],migration,separate,failed,success,free,paid,freeMove,restore,afterShort,afterRecovery,afterLong,field:typeof field,strike:strike.kind,resistance:pcFx(c).res.has("psychic")};
      };
      const r=make("2024","Rogue",17,"Soulknife");r.used={};actRun(r,"Rend Mind");actRun(r,"Restore Rend Mind");const rend=[r.used.psiRogue,r.used.psiRend];
      actRun(r,"Psychic Veil");const veil=!!r.active["Psychic Veil"];actRun(r,"Psychic Veil");actRun(r,"Restore Psychic Veil");const veilRestore=[r.used.psiRogue,r.used.psiVeil];
      r.subclass="Thief";pcSubSync(r);const removed=!pcResources(r).some(x=>x.key==="psiRogue")&&!pcAbilities(r).some(x=>x.name==="Psychic Whispers");
      return {legacy:run("2014"),revised:run("2024"),rend,veil,veilRestore,removed};
    });
    for(const result of [psiAudit.legacy,psiAudit.revised]){
      assert.deepEqual(result.dice,[10,8]);assert.deepEqual(result.migration,[2,2]);assert.deepEqual(result.separate,[2,0]);
      assert.equal(result.failed,0);assert.equal(result.success,1);assert.deepEqual(result.free,[1,1]);assert.equal(result.paid,2);assert.equal(result.freeMove,2);
      assert.deepEqual(result.restore,[3,0]);assert.deepEqual(result.afterLong,[0,0,0]);assert.equal(result.field,"string");assert.equal(result.strike,"damage");assert.equal(result.resistance,true);
    }
    assert.deepEqual(psiAudit.revised.pools,[8,8]);assert.deepEqual(psiAudit.legacy.pools,[12,12]);
    assert.deepEqual(psiAudit.revised.afterShort,[2,1,false]);assert.deepEqual(psiAudit.legacy.afterShort,[3,2,false]);assert.deepEqual(psiAudit.legacy.afterRecovery,[2,2]);
    assert.deepEqual(psiAudit.rend,[3,0]);assert.equal(psiAudit.veil,true);assert.deepEqual(psiAudit.veilRestore,[4,0]);assert.equal(psiAudit.removed,true);
    const telekineticMasterAudit=await page.evaluate(()=>{
      const c=pcEnsure(generateCharacter({seed:"PSI-MASTER",ed:"2024",cls:"Fighter",level:18,subclass:"Psi Warrior",race:"Human",bg:"Sage"}));
      syncGrantedSpells(c);const sp=spellOf("2024","Telekinesis"),sources=spellPreparationSources(c,"Telekinesis","2024");
      const resources=pcResources(c).filter(r=>r.key==="psiMaster");const options=castOpts(c,sp,"2024").map(x=>x[0]);const caster=spellCaster(c,sp,"psiMaster","2024");
      c.used={psiMaster:1};const before=castOpts(c,sp,"2024").find(x=>x[0]==="psiMaster")?.[3];
      actRun(c,"Restore Telekinetic Master");const restored=castOpts(c,sp,"2024").find(x=>x[0]==="psiMaster")?.[3];
      return {sources:sources.some(g=>g.feature==="Telekinetic Master"&&g.ab==="int"),resources:resources.length,options,caster:caster.ab,before,restored,spent:c.used.psiFighter};
    });
    assert.deepEqual(telekineticMasterAudit,{sources:true,resources:1,options:["psiMaster"],caster:"int",before:true,restored:false,spent:1});
    const companionAudit=await page.evaluate(()=>{
      const make=(ed,cls,level,subclass,multi=[])=>pcEnsure(generateCharacter({seed:"COMPANION-AUDIT",ed,cls,level,subclass,race:"Human",bg:"Sage",multi}));
      const r=make("2024","Fighter",2,"none",[{cls:"Ranger",lv:11,subclass:"Beast Master"}]);r.used={};
      const stat=companionStats(r,"primal","sky"),before=companionState(r,"primal");
      companionSummon(r,"primal","sky","free");companionSetHP(r,"primal",0);const blocked=companionSetHP(r,"primal",5),replace=companionSummon(r,"primal","land","free");
      const slot=companionSlots(r)[0].key;companionRevive(r,"primal",slot,true);const pending=companionState(r,"primal").pending;companionFinishRevive(r,"primal");const revived=companionState(r,"primal").current;
      pcRest(r,"long");companionSummon(r,"primal","sea","free");const sea=companionState(r,"primal");
      const d=make("2014","Ranger",15,"Drakewarden");d.used={};companionSummon(d,"drake","cold","free");const drake=companionState(d,"drake"),noFree=companionSummon(d,"drake","fire","free");const pay=companionSlots(d)[0].key;companionSummon(d,"drake","fire",pay);const paid=d.used[pay];
      const a=make("2014","Artificer",15,"Battle Smith");a.used={};companionSummon(a,"steel","steel","free");const steel=companionState(a,"steel");companionSetHP(a,"steel",1);for(let j=0;j<4;j++)companionRoll(a,"steel","repair");const repair=a.used.steelRepair;
      const w=make("2014","Druid",6,"Circle of Wildfire");w.used={};companionSummon(w,"wildfire","fire","wild");const fire=companionState(w,"wildfire"),wild=w.used.wild;pcRest(w,"long");const expired=!companionState(w,"wildfire");
      const rogue=make("2024","Fighter",2,"none",[{cls:"Rogue",lv:3,subclass:"Soulknife"}]);pcRecompute(rogue);const blades=rogue.attacks.filter(x=>x.name.startsWith("Psychic Blade")).length;
      return {stat:[stat.hp,stat.ac,stat.attacks,stat.hit],expected:[48,13+r.mods.wis,2,r.prof+r.mods.wis],before,blocked,replace,pending,revived,spent:r.used[slot]||0,sea:sea.hp,drake:[drake.hp,drake.size,drake.ac],drakeAC:14+d.prof,noFree,paid,steel:[steel.hp,steel.ac],steelHP:Math.max(1,77+a.mods.int),repair,fire:fire.hp,wild,expired,blades,editionGuard:companionStats(d,"primal","land")===null,grant:d.prepared.some(x=>x.n==="Thaumaturgy")};
    });
    assert.deepEqual(companionAudit.stat,companionAudit.expected);assert.equal(companionAudit.before,null);assert.equal(companionAudit.blocked,false);assert.match(companionAudit.replace,/Long Rest/);assert.equal(companionAudit.pending,true);assert.equal(companionAudit.revived,48);assert.equal(companionAudit.spent,0);assert.equal(companionAudit.sea,60);
    assert.deepEqual(companionAudit.drake,[80,"Large",companionAudit.drakeAC]);assert.match(companionAudit.noFree,/already used/);assert.equal(companionAudit.paid,1);
    assert.deepEqual(companionAudit.steel,[companionAudit.steelHP,17]);assert.equal(companionAudit.repair,3);assert.deepEqual([companionAudit.fire,companionAudit.wild,companionAudit.expired,companionAudit.blades,companionAudit.editionGuard,companionAudit.grant],[35,1,true,2,true,true]);
    const extendedCompanionAudit=await page.evaluate(()=>{
      const make=(ed,cls,level,subclass)=>pcEnsure(generateCharacter({seed:"EXT-COMPANION",ed,cls,level,subclass,race:"Human",bg:"Sage"}));
      const r=make("2014","Ranger",11,"Beast Master");r.used={};const beasts=legacyBeastOptions(),b=beasts.find(m=>m.n==="Wolf")||beasts.find(m=>m.n==="Panther")||beasts.find(m=>beastForm(m.id)?.attacks.length);
      if(!b)throw Error("No eligible legacy beast fixture");
      const base=beastForm(b.id),summoned=companionSummon(r,"beast14",b.id,"bond"),s=companionState(r,"beast14"),a=s.attackOptions[0],original=base.attacks[0];
      const live=companionSummon(r,"beast14",b.id,"bond");companionSetHP(r,"beast14",0);const blockedRevive=companionRevive(r,"beast14","slot1"),replaced=companionSummon(r,"beast14",b.id,"bond");
      const now=make("2024","Artificer",15,"Battle Smith");now.used={};companionSummon(now,"steel24","steel","free");const steel=companionState(now,"steel24");
      companionSetHP(now,"steel24",0);const slot=companionSlots(now)[0].key;companionRevive(now,"steel24",slot,true);const pending=companionState(now,"steel24").pending;companionFinishRevive(now,"steel24");
      const jolt=actRun(now,"Arcane Jolt","damage"),spent=now.used.arcaneJolt,blockedJolt=actRun(now,"Arcane Jolt","heal");
      actRun(now,"Arcane Jolt — next turn");const heal=actRun(now,"Arcane Jolt","heal");pcRest(now,"long");
      return {eligible:beasts.every(x=>x.cr<=.25&&/^(tiny|small|medium)$/i.test(x.size)),summoned,hp:s.hp,expectedHP:Math.max(b.hp,44),ac:s.ac,expectedAC:b.ac+r.prof,hit:a.hit,expectedHit:original.hit+r.prof,attacks:s.attacks,live,blockedRevive,replaced,steel:[steel.hp,steel.ac,steel.hit,steel.damage],expectedSteel:[80,12+now.mods.int,now.prof+now.mods.int,"1d8"+sgn(2+now.mods.int)],pending,revived:companionState(now,"steel24").current,wrongEdition:companionStats(now,"steel","steel")===null,jolt:jolt?.amount,spent,blockedJolt,heal:heal?.amount||0,joltReset:now.used.arcaneJolt||0,turnReset:!now.arcaneJoltThisTurn};
    });
    assert.ok(extendedCompanionAudit.eligible);
    assert.deepEqual([extendedCompanionAudit.hp,extendedCompanionAudit.ac,extendedCompanionAudit.hit,extendedCompanionAudit.attacks],[extendedCompanionAudit.expectedHP,extendedCompanionAudit.expectedAC,extendedCompanionAudit.expectedHit,2]);
    assert.match(extendedCompanionAudit.live,/living companion/);assert.match(extendedCompanionAudit.blockedRevive,/No eligible/);assert.match(extendedCompanionAudit.replaced,/created/);
    assert.deepEqual(extendedCompanionAudit.steel,extendedCompanionAudit.expectedSteel);assert.deepEqual([extendedCompanionAudit.pending,extendedCompanionAudit.revived,extendedCompanionAudit.wrongEdition],[true,80,true]);
    assert.ok(extendedCompanionAudit.jolt>=4&&extendedCompanionAudit.jolt<=24);assert.equal(extendedCompanionAudit.spent,1);assert.match(extendedCompanionAudit.blockedJolt,/eligible|unavailable/i);assert.ok(extendedCompanionAudit.heal>=4&&extendedCompanionAudit.heal<=24);assert.deepEqual([extendedCompanionAudit.joltReset,extendedCompanionAudit.turnReset],[0,true]);
    const lifecycle=await page.evaluate(()=>{
      const make=(ed,cls,level,subclass)=>pcEnsure(generateCharacter({seed:"COMPANION-LIFECYCLE",ed,cls,level,subclass,race:"Human",bg:"Sage"}));
      const r=make("2014","Ranger",11,"Beast Master");r.beastCompanionVariant="primal";
      const choices=[companionLevel(r,"beast14"),companionLevel(r,"primal14"),companionLevel(r,"primal")];
      companionSummon(r,"primal14","land","free");const legacy=companionState(r,"primal14");
      companionSetHP(r,"primal14",0);const slot=companionSlots(r)[0].key;
      const w=r.used[slot]||0;const needsConfirm=companionRevive(r,"primal14",slot);const unstaged=(r.used[slot]||0)===w;
      pcRest(r,"short");const expired=companionRevive(r,"primal14",slot,true);
      pcRest(r,"long");companionSummon(r,"primal14","sky","free");companionSetHP(r,"primal14",0);companionRevive(r,"primal14",slot,true);
      const restored=pcEnsure(JSON.parse(JSON.stringify(r)));pcRest(restored,"short");const alive=companionState(restored,"primal14").current;
      restored.hpCur=0;restored.death={f:2};pcDamaged(restored,1,true);const deadGone=!restored.subCompanions.primal14;
      const d=make("2024","Ranger",15,"Drakewarden");companionSummon(d,"drake","cold","free");
      const resist=pcFx(d).res.has("cold");const breath=actRun(d,"Drake’s Breath","Drake:acid:free");
      const low=actRun(d,"Drake’s Breath","Ranger:acid:slot1"),paid=actRun(d,"Drake’s Breath","Ranger:acid:slot3");
      companionSetHP(d,"drake",0);const drakeGone=!companionState(d,"drake")&&!pcFx(d).res.has("cold");
      const fire=make("2014","Druid",14,"Circle of Wildfire");companionSummon(fire,"wildfire","fire","wild");
      const teleport=companionRoll(fire,"wildfire","teleport");pcRest(fire,"short");const flameExp=!companionState(fire,"wildfire");
      companionSummon(fire,"wildfire","fire","wild");fire.hpCur=0;fire.conds={unconscious:true};fire.condAuto=true;
      actRun(fire,"Blazing Revival","confirmed");const recovery=[fire.hpCur,Math.floor(fire.hp/2),fire.used.blazingRevival,!fire.conds.unconscious,!companionState(fire,"wildfire")];
      return {choices,legacy:[legacy.ac,13+r.prof,legacy.damage,"1d8"+sgn(2+r.prof)],needsConfirm,unstaged,expired,alive,deadGone,resist,
        breath:[breath.expr,breath.dtype,breath.includeSelf,d.used.drakeBreath],low,paid:[paid.expr,d.used.slot3],drakeGone,flameExp,recovery,teleport:teleport.noneOnSave};
    });
    assert.deepEqual(lifecycle.choices,[0,11,0]);
    assert.equal(lifecycle.legacy[0],lifecycle.legacy[1]);assert.equal(lifecycle.legacy[2],lifecycle.legacy[3]);
    assert.match(lifecycle.needsConfirm,/last hour/);assert.equal(lifecycle.unstaged,true);assert.match(lifecycle.expired,/No eligible/);
    assert.deepEqual([lifecycle.alive,lifecycle.deadGone,lifecycle.resist,lifecycle.drakeGone,lifecycle.flameExp,lifecycle.teleport],[48,true,true,true,true,true]);
    assert.deepEqual(lifecycle.breath,["10d6","acid",true,1]);assert.match(lifecycle.low,/unavailable/);assert.deepEqual(lifecycle.paid,["10d6",1]);
    assert.deepEqual(lifecycle.recovery,[lifecycle.recovery[1],lifecycle.recovery[1],1,true,true]);
    const arcaneAudit=await page.evaluate(()=>{
      const make=(ed,level)=>pcEnsure(generateCharacter({seed:"REVISED-ARCANE",ed,cls:"Fighter",level,subclass:"Arcane Archer",race:"Human",bg:"Sage"}));
      const a=make("2024",10);a.scores.int=16;const [arcana,nature,athletics]=["Arcana","Nature","Athletics"].map(n=>a.skills.find(s=>s.s===n));
      arcana.p=true;nature.p=false;athletics.p=false;
      a.choices={"Arcane Archer Skill":["Athletics"],"Arcane Archer Lore":["Druidcraft"],"Arcane Shot Options":["Shadow Shot","Bursting Arrow","Seeking Arrow"]};
      const bow=eqGear("2024","Longbow");a.kitMoved=true;a.inv=[{id:"bow",ref:bow.id,n:bow.n,qty:1,eq:true}];syncGrantedSpells(a);pcRecompute(a);
      const skill=[arcana.p,!arcana.archerGranted,nature.archerGranted,athletics.archerGranted,CHOICES["Arcane Archer Skill"].n(a)];
      const magic=spellCaster(a,spellOf("2024","Druidcraft")).ab,shots=CHOICES["Arcane Shot Options"].n(a);
      const uses=pcResources(a).find(r=>r.key==="arcaneShot").max;
      const pick=n=>JSON.stringify([n,"bow"]),shadow=actRun(a,"Arcane Shot",pick("Shadow Arrow"));
      const blocked=actRun(a,"Arcane Shot",pick("Bursting Arrow"));actRun(a,"Begin Arcane Archer turn","next");
      const bursting=actRun(a,"Arcane Shot",pick("Bursting Arrow"));const regained=arcaneArcherInitiative(a),afterInit=a.used.arcaneShot;
      const ammo=actRun(a,"Magical Ammunition",pick("Vine"));const same=actRun(a,"Magical Ammunition",pick("Vine"));
      actRun(a,"Restore Magical Ammunition");const recovery=[a.used.wind,a.used.magicalAmmunition];
      pcRest(a,"short");const afterRest=[a.used.arcaneShot,!!a.arcaneShotUsedThisTurn];
      a.subclass="Champion";pcSubSync(a);syncGrantedSpells(a);pcRecompute(a);
      const cleanup=arcana.p&&!nature.p&&!athletics.p&&!a.prepared.some(p=>p.n==="Druidcraft")&&!pcResources(a).some(r=>r.key==="arcaneShot");
      const old=make("2014",10);return {skill,magic,shots,uses,shadow,blocked,bursting,regained,afterInit,ammo,same,recovery,afterRest,cleanup,legacy:revisedArcaneArcher(old)};
    });
    assert.deepEqual(arcaneAudit.skill,[true,true,true,true,1]);assert.deepEqual([arcaneAudit.magic,arcaneAudit.shots,arcaneAudit.uses],["int",4,3]);
    assert.ok(arcaneAudit.shadow.amount>=1&&arcaneAudit.shadow.amount<=8);assert.match(arcaneAudit.blocked,/eligible/);
    assert.deepEqual([arcaneAudit.bursting.aoe,arcaneAudit.bursting.expr,arcaneAudit.bursting.chooseTargets,arcaneAudit.regained,arcaneAudit.afterInit],[true,"2d8",true,true,1]);
    assert.match(arcaneAudit.ammo,/120-foot vine/);assert.match(arcaneAudit.same,/Not enough/);
    assert.deepEqual([arcaneAudit.recovery,arcaneAudit.afterRest,arcaneAudit.cleanup,arcaneAudit.legacy],[[1,0],[0,false],true,false]);
    const legacyArcher=await page.evaluate(()=>{
      const make=(level,options)=> {
        const c=pcEnsure(generateCharacter({seed:"XGE-ARCANE-SHOT",ed:"2014",cls:"Fighter",level,subclass:"Arcane Archer",race:"Human",bg:"Sage"}));
        c.kitMoved=true;
        c.inv=["Longbow","Shortbow","Crossbow, light","Dart"].map(name=>{
          const gear=eqGear("2014",name);
          return {id:name,ref:gear?.id,n:gear?.n||name,qty:1,eq:true};
        });
        c.choices={"Arcane Shot Options":options};
        c.scores.int=18;pcRecompute(c);
        return c;
      };
      const pick=(id,bow="Longbow")=>JSON.stringify([id,bow]);
      const a=make(3,["Banishing Arrow","Shadow Arrow","Bursting Arrow"]);
      const source=subclassEntry("2014","Fighter","Arcane Archer");
      const max=pcResources(a).find(r=>r.key==="arcaneShot").max;
      const options=arcaneShotChoices(a).map(([id])=>JSON.parse(id));
      const bad=actRun(a,"Arcane Shot",pick("Shadow Arrow","Crossbow, light"));
      const absent=actRun(a,"Arcane Shot",pick("Bursting Arrow"));
      const banish=actRun(a,"Arcane Shot",pick("Banishing Arrow"));
      const blocked=actRun(a,"Arcane Shot",pick("Shadow Arrow"));
      actRun(a,"Begin Arcane Archer turn","next");
      const shadow=actRun(a,"Arcane Shot",pick("Shadow Arrow"));
      const lowInitiative=arcaneArcherInitiative(a);
      actRun(a,"Begin Arcane Archer turn","next");
      const empty=actRun(a,"Arcane Shot",pick("Shadow Arrow"));
      pcRest(a,"short");
      const refreshed=[a.used.arcaneShot,!!a.arcaneShotUsedThisTurn];
      const b=make(18,["Banishing Arrow","Grasping Arrow","Piercing Arrow","Seeking Arrow","Bursting Arrow","Enfeebling Arrow"]);
      b.used={arcaneShot:1};
      const whenOne=arcaneArcherInitiative(b);
      b.used.arcaneShot=2;
      const whenEmpty=arcaneArcherInitiative(b),oneLeft=b.used.arcaneShot;
      const cast=(id)=>{pcRest(b,"short");return actRun(b,"Arcane Shot",pick(id));};
      const improved=cast("Banishing Arrow"),grasp=cast("Grasping Arrow"),pierce=cast("Piercing Arrow"),seek=cast("Seeking Arrow");
      const burst=cast("Bursting Arrow"),enfeeble=cast("Enfeebling Arrow");
      const names=pcAbilities(b).map(s=>s.name),curving=actChoices(b,ACT["Curving Shot"]).map(([id])=>id);
      const abilities=[names.includes("Magic Arrow"),names.includes("Ever-Ready Shot"),!names.includes("Magical Ammunition"),!names.includes("Masterful Shots")];
      const c=make(7,["Beguiling Arrow"]);
      const beguile=actRun(c,"Arcane Shot",pick("Beguiling Arrow","Shortbow"));
      return {primary:source.featureSourceReview.primaryVerified,max,options,bad,absent,banish,blocked,shadow,lowInitiative,empty,refreshed,
        whenOne,whenEmpty,oneLeft,improved,grasp,pierce,seek,burst,enfeeble,abilities,curving,beguile};
    });
    assert.deepEqual([legacyArcher.primary,legacyArcher.max,legacyArcher.options.length],[true,2,4]);
    assert.ok(legacyArcher.options.every(([,bow])=>["Shortbow","Longbow"].includes(bow)));
    assert.match(legacyArcher.bad,/unavailable/);assert.match(legacyArcher.absent,/unavailable/);
    assert.match(legacyArcher.banish,/Feywild.*Save DC 14/);assert.match(legacyArcher.blocked,/eligible/);
    assert.ok(legacyArcher.shadow.amount>=2&&legacyArcher.shadow.amount<=12);
    assert.match(legacyArcher.shadow.msg,/5 feet/);assert.match(legacyArcher.empty,/Not enough/);
    assert.deepEqual([legacyArcher.lowInitiative,legacyArcher.refreshed,legacyArcher.whenOne,legacyArcher.whenEmpty,legacyArcher.oneLeft],[false,[0,false],false,true,1]);
    assert.match(legacyArcher.improved.msg,/force damage/);assert.match(legacyArcher.grasp.msg,/4d6 slashing.*Athletics DC 18/);
    assert.match(legacyArcher.pierce,/DC 18.*30 feet long and 1 foot wide/);
    assert.match(legacyArcher.seek,/DC 18.*range.*path.*location/);
    assert.deepEqual([legacyArcher.burst.expr,legacyArcher.burst.save,legacyArcher.burst.dtype],["4d6",null,"force"]);
    assert.match(legacyArcher.enfeeble.msg,/halve.*weapon attacks/);
    assert.deepEqual(legacyArcher.abilities,[true,true,true,true]);
    assert.deepEqual(legacyArcher.curving,["Longbow","Shortbow"]);
    assert.match(legacyArcher.beguile.msg,/ally within 30 feet/);
    const openSubclassAudit=await page.evaluate(()=>{
      const make=(ed,cls,subclass,level)=>pcEnsure(generateCharacter({seed:"OPEN-SUBCLASS-SPELLS",ed,cls,subclass,level,race:"Human",bg:"Sage"}));
      const wind=make("2014","Druid","Circle of Wind",3),windBelow=make("2014","Druid","Circle of Wind",2);
      const revised=make("2024","Druid","Circle of Wind",3);
      const level=(c,name)=>c.prepared.find(p=>p.n===name)?.l;
      const original=revised.feats.find(f=>f.f.startsWith("Circle Spells"));
      const source=subclassEntry("2024","Druid","Circle of Wind");
      const serpent=make("2014","Cleric","Serpent Domain",1);
      const restrict=spellPreparationSources(serpent,"Find Familiar")[0]?.restriction;
      const warden=make("2014","Ranger","Grove Warden",5);
      const known=spellPreparationSources(warden,"Branding Smite").some(s=>s.known);
      const drake=make("2014","Warlock","Ancient Dragons",3);
      const dragonOption=legacySubclassOption(drake,"2014","Warlock",spellOf("2014","Scorching Ray"));
      const dragonPrepared=drake.prepared.some(p=>p.n==="Scorching Ray");
      const animal=make("2024","Warlock","Animal Lords",3);
      const aOpt=name=>legacySubclassOption(animal,"2024","Warlock",spellOf("2024",name));
      const before=[aOpt("Speak with Animals"),aOpt("Thunderwave"),aOpt("Fog Cloud")];
      animal.choices={"Animal Lord Affinity":["Air"]};
      const after=[aOpt("Thunderwave"),aOpt("Fog Cloud"),animal.prepared.some(p=>p.n==="Druidcraft")];
      const hunt=make("2014","Cleric","Hunt Domain",1);
      const huntList=hunt.prepared.map(x=>[x.n,x.l]);
      return {status:source.featureSourceReview.status,sourceEdition:original.subEdition,compatible:source.compatibility,
        wind:[level(wind,"Blur"),level(windBelow,"Blur")??null,level(revised,"Blur"),level(windBelow,"Message")],restrict,known,dragonOption,dragonPrepared,before,after,huntList};
    });
    assert.deepEqual([openSubclassAudit.status,openSubclassAudit.sourceEdition,openSubclassAudit.compatible],["provider_snapshot_matched","2014",true]);
    assert.deepEqual(openSubclassAudit.wind,[2,null,2,0]);
    assert.deepEqual([openSubclassAudit.restrict,openSubclassAudit.known,openSubclassAudit.dragonOption,openSubclassAudit.dragonPrepared],["snakes only",true,true,false]);
    assert.deepEqual([openSubclassAudit.before,openSubclassAudit.after],[[true,false,false],[true,false,true]]);
    assert.ok(openSubclassAudit.huntList.some(([name,lv])=>/bloodbound/i.test(name)&&lv===1));
    const sporesSpawn=await page.evaluate(()=>{
      const c=pcEnsure(generateCharacter({seed:"SPORES-CORPSES",ed:"2014",cls:"Druid",level:6,subclass:"Circle of Spores",race:"Human",bg:"Sage"}));
      c.scores.wis=16;pcRecompute(c);PCS.roster.push(c);RC.id=c.id;renderRosterMain();
      const camp=blankCampaign("Spores encounter");
      camp.party=[{id:"druid",pcId:c.id,name:"Druid"},{id:"ally",name:"Ally"}];
      const e=newEncounter(null,"A fallen wolf",5,[
        {name:"Wolf",stat:"Wolf",cr:0.25,count:1},{name:"Zombie",stat:"Zombie",cr:0.25,count:1},
      ],{status:"Active",turn:"druid",round:1,pcInit:{druid:15,ally:15}});
      e.enemies.forEach(row=>Object.assign(row,{hp:0,init:10,statEdition:"2014"}));
      camp.encounters=[e];Store.save(camp);
      const options=fungalCorpseChoices(c),xp=encMath(camp,e).raw;
      renderRosterMain();
      return {campId:camp.id,encId:e.id,choice:options[1][0],available:options.map(x=>x[1]),xp};
    });
    assert.equal(sporesSpawn.available.length,2);assert.match(sporesSpawn.available[1],/Wolf/);
    await page.locator('[data-actsel="Fungal Infestation"]').selectOption(sporesSpawn.choice);
    await page.locator('[data-act="Fungal Infestation"]').click();
    const animated=await page.evaluate(({campId,encId,choice})=>{
      const camp=Store.get(campId),e=findEnc(camp,encId),z=e.enemies.find(row=>row.fungal),c=rosterCur();
      const order=encOrder(camp,e),down=actRun(c,"Fungal Infestation",choice);
      const targets=actTargets(c).foes.filter(t=>t.ally),ref=fightMonster(z);
      const first=[z.hp,z.max,ref.ed,order[1].key===z.id,order[1].ally,e.enemies[0].hp,targets.length,encMath(camp,e).raw,down];
      e.round=z.fungal.endRound;
      const end=!encOrder(camp,e).some(row=>row.key===z.id)&&!actTargets(c).foes.some(t=>t.ally);
      return {first,end,counter:c.used.fungalInfestation};
    },sporesSpawn);
    assert.deepEqual(animated.first,[1,22,"2014",true,true,0,1,sporesSpawn.xp,"That option is unavailable."]);
    assert.deepEqual([animated.end,animated.counter],[true,1]);
    await page.locator('[data-actsel="Fungal Infestation"]').selectOption("sheet");
    await page.locator('[data-act="Fungal Infestation"]').click();
    assert.equal(await page.locator("[data-fungal-hp]").inputValue(),"1");
    await page.locator('[data-fungal-action="hit"]').click();
    assert.match(await page.locator("#toast").textContent(),/Fungal Zombie.*Slam/);
    await page.locator('[data-fungal-action="expire"]').click();
    assert.equal(await page.locator("[data-fungal-hp]").count(),0);
    const fighterAudit=await page.evaluate(()=>{
      const make=(name,level,ed="2014")=>{
        const c=pcEnsure(generateCharacter({seed:"XGE-FIGHTER-ARCHETYPE",ed,cls:"Fighter",level,subclass:name,race:"Human",bg:"Sage"}));
        c.kitMoved=true;c.inv=["Longsword","Longbow"].map(name=>({id:name,n:name,eq:true,qty:1}));
        Object.assign(c.scores,{str:8,con:16,wis:16});
        const training=name==="Cavalier"?"Animal Handling":"Persuasion",skill=c.skills.find(s=>s.s===training);
        skill.p=false;skill.x=false;
        c.choices={"Cavalier or Samurai Training":[training]};
        pcSubNumbers(c);pcRecompute(c);return c;
      };
      const max=(c,key)=>pcResources(c).find(r=>r.key===key)?.max;
      const a=make("Cavalier",15);
      const training=a.skills.find(s=>s.s==="Animal Handling").xgeTrainingGranted;
      const pools=[max(a,"unwaveringMark"),max(a,"wardingManeuver")];
      const ward=actRun(a,"Warding Maneuver","hit");
      const markOptions=actChoices(a,ACT["Unwavering Mark"]).map(([id])=>id);
      const originalRandom=Math.random;
      let mark;
      try{Math.random=()=>0.5;mark=actRun(a,"Unwavering Mark","Longsword");}finally{Math.random=originalRandom;}
      const markRoll=a.rollLog[0];
      pcRest(a,"short");const short=[a.used.wardingManeuver,a.used.unwaveringMark];
      pcRest(a,"long");const long=[a.used.wardingManeuver,a.used.unwaveringMark];
      a.inv[0].eq=false;pcRecompute(a);
      const noWard=actRun(a,"Warding Maneuver","hit");
      a.inv.push({id:"shield",n:"Shield",eq:true,qty:1});pcRecompute(a);
      const shieldWard=actRun(a,"Warding Maneuver","hit");
      a.choices["Cavalier or Samurai Training"]=["language:Undercommon"];pcRecompute(a);
      const language=[profInfo(a).langs.includes("Undercommon"),!a.skills.find(s=>s.s==="Animal Handling").p];
      const charger=pcAbilities(a).find(x=>x.name==="Ferocious Charger").text;
      const b=make("Samurai",15,"2024"),persuasion=b.skills.find(x=>x.s==="Persuasion");
      const court=[b.saves.includes("wis"),persuasion.xgeTrainingGranted,persuasion.v-b.mods.cha-b.prof];
      const fighting=actRun(b,"Fighting Spirit","turn");pcRecompute(b);
      const advantage=b.attacks.every(at=>rollState(b,"attack",at.ab,{tags:at.tags}).adv.includes("Fighting Spirit"));
      actRun(b,"Fighting Spirit");pcRecompute(b);
      const ended=[b.hpTemp,!b.attacks.some(at=>at.tags?.some(t=>t.includes("Fighting Spirit")))];
      b.used.fightingSpirit=2;const partial=samuraiInitiative(b);
      b.used.fightingSpirit=3;const exhausted=samuraiInitiative(b),remaining=b.used.fightingSpirit;
      const e=make("Samurai",7);e.saves.push("wis");delete e.samuraiSaveGrant;e.saves=[...new Set(e.saves)];
      e.choices["Elegant Courtier"]=["cha"];pcSubNumbers(e);
      const alternate=[e.saves.includes("wis"),e.saves.includes("cha"),e.samuraiSaveGrant];
      e.subclass="Champion";pcSubSync(e);pcSubNumbers(e);pcRecompute(e);
      const removed=[e.saves.includes("wis"),!e.saves.includes("cha"),!e.skills.find(s=>s.s==="Persuasion").xgeTrainingGranted];
      const low=make("Samurai",3);actRun(low,"Fighting Spirit","turn");
      const middle=make("Samurai",10);actRun(middle,"Fighting Spirit","turn");
      return {training,pools,ward,markOptions,mark,markRoll,short,long,noWard,shieldWard,language,charger,court,fighting,advantage,ended,partial,exhausted,remaining,alternate,removed,temp:[low.hpTemp,middle.hpTemp]};
    });
    assert.deepEqual([fighterAudit.training,fighterAudit.pools,fighterAudit.markOptions],[true,[1,3],["Longsword"]]);
    assert.match(fighterAudit.ward,/resistance/);assert.match(fighterAudit.mark,/add 7 damage/);assert.equal(fighterAudit.markRoll.mode,"adv");
    assert.deepEqual([fighterAudit.short,fighterAudit.long],[[1,1],[0,0]]);
    assert.match(fighterAudit.noWard,/No eligible/);assert.match(fighterAudit.shieldWard,/resistance/);
    assert.deepEqual(fighterAudit.language,[true,true]);assert.match(fighterAudit.charger,/DC 12/);
    assert.deepEqual(fighterAudit.court,[true,true,3]);assert.match(fighterAudit.fighting,/15 temporary HP/);
    assert.deepEqual([fighterAudit.advantage,fighterAudit.ended,fighterAudit.partial,fighterAudit.exhausted,fighterAudit.remaining],[true,[15,true],false,true,2]);
    assert.deepEqual([fighterAudit.alternate,fighterAudit.removed,fighterAudit.temp],[[true,true,"cha"],[true,true,true],[5,10]]);
    const samuraiDeathAudit=await page.evaluate(()=>{
      const create=()=>{
        const c=pcEnsure(generateCharacter({seed:"SAMURAI-REACTION",ed:"2014",cls:"Fighter",subclass:"Samurai",level:18,race:"Human",bg:"Sage"}));
        c.hp=90;c.hpCur=4;
        PCS.roster.push(c);pcPersist();return c;
      };
      const damage=(c,n)=>actApply("pc:"+c.id,n,"damage");
      const state=c=>[c.hpCur,c.samuraiDeathTurn||null,condOn(c,"unconscious"),+c.used?.strengthBeforeDeath||0,+c.death?.f||0,!!c.death?.dead];
      const c=create();concStart(c,"A test spell");
      const early=actRun(c,"Strength before Death","reaction");
      damage(c,4);const pending=state(c),concPending=[!!c.conc,c.concCheck];
      actRun(c,"Strength before Death","reaction");const active=state(c);
      damage(c,1);const hurt=state(c);
      actRun(c,"End Strength before Death turn");const ended=state(c),concEnded=!!c.conc;
      pcRest(c,"long");const recovered=c.used.strengthBeforeDeath;
      const b=create();damage(b,3);const safe=state(b);
      damage(b,1);actRun(b,"Decline Strength before Death");const declined=state(b);
      const d=create();const fatal=damage(d,94),massive=state(d);
      const e=create();damage(e,4);actRun(e,"Strength before Death","reaction");damage(e,1);damage(e,1);damage(e,1);const dead=state(e);
      const f=create();damage(f,4);actRun(f,"Strength before Death","reaction");actApply("pc:"+f.id,5,"heal");
      actRun(f,"End Strength before Death turn");const healed=state(f);
      return {early,pending,concPending,active,hurt,ended,concEnded,recovered,safe,declined,fatal,massive,dead,healed};
    });
    assert.match(samuraiDeathAudit.early,/No eligible/);
    assert.deepEqual(samuraiDeathAudit.pending,[0,"pending",false,0,0,false]);
    assert.deepEqual(samuraiDeathAudit.concPending,[true,10]);
    assert.deepEqual(samuraiDeathAudit.active,[0,"active",false,1,0,false]);
    assert.deepEqual(samuraiDeathAudit.hurt,[0,"active",false,1,1,false]);
    assert.deepEqual(samuraiDeathAudit.ended,[0,null,true,1,1,false]);
    assert.deepEqual([samuraiDeathAudit.concEnded,samuraiDeathAudit.recovered],[false,0]);
    assert.deepEqual([samuraiDeathAudit.safe,samuraiDeathAudit.declined],[[1,null,false,0,0,false],[0,null,true,0,0,false]]);
    assert.match(samuraiDeathAudit.fatal,/massive damage/);
    assert.deepEqual([samuraiDeathAudit.massive,samuraiDeathAudit.dead,samuraiDeathAudit.healed],[[0,null,false,0,0,true],[0,null,false,1,3,true],[5,null,false,1,0,false]]);
    const warcraftSubclassAudit=await page.evaluate(()=>{
      const make=(cls,name,level)=>{
        const c=pcEnsure(generateCharacter({seed:"AZEROTH-SUBCLASS",ed:"2024",cls,subclass:name,level,race:"Human",bg:"Sage"}));
        c.scores.wis=16;pcRecompute(c);syncGrantedSpells(c);return c;
      };
      const fragments=["Ranger","Demon Hunter"].map(cls=>{
        const c=make(cls,"Demon Hunter",17),owner=demonHunterOwner(c);
        c.choices={"Demon Hunter specialization":["Havoc"]};syncGrantedSpells(c);
        const cap=pcResources(c).find(r=>r.key==="soulFragments").max;
        const f=c.feats.find(f=>f.f==="Illidari Knowledge"),sights=c.feats.filter(f=>f.f.includes("Spectral Sight")).map(f=>f.f);
        const a=actRun(c,"Soul Cleave","attack"),again=actRun(c,"Soul Cleave","attack");
        actRun(c,"Begin Demon Hunter turn","turn");
        const restored=actRun(c,"Regain Soul Fragment","kill");
        c.used.soulFragments=cap;const initiative=demonHunterInitiative(c);
        const jump=castOpts(c,spellOf("2024","Jump"),"2024").find(x=>x[0]==="soulFragment");
        const counter=castOpts(c,spellOf("2024","Counterspell"),"2024").find(x=>x[0]==="soulFragment");
        return {owner,cap,l:f.l,sights,dc:a.dc,expectedDC:8+c.prof+c.mods.wis,
          cleave:[a.expr,a.dtype,a.healPerFailedTarget,a.noneOnSave],again,restored,initiative,remaining:c.used.soulFragments,
          fragmentCast:[jump[3],counter[3]],havoc:c.prepared.some(p=>p.n==="Fel Rush")};
      });
      const aura=["Paladin","Death Knight"].map(cls=>{
        const c=make(cls,"Oath of the Ebon Blade",7);c.choices={Runeforging:["Frost"]};syncGrantedSpells(c);
        const f=pcFx(c),spells=["Death Grip","Chains of Ice","Frostscythe"].every(name=>c.prepared.some(p=>p.n===name));
        c.conds={stunned:true};
        return [[...f.res],spells,pcFx(c).res.has("cold")];
      });
      const guardian=["Barbarian","Shaman"].map(cls=>{
        const c=make(cls,"Path of the Spiritual Guardian",10);c.active={Rage:true};pcRecompute(c);
        const shield=actRun(c,"Spirit Shield (Spiritual Guardian)","confirm");
        const element=actRun(c,"Spiritual Protectors","cold");
        const consult=pcResources(c).find(r=>r.key==="consultSpirits");
        return [shield,element,consult.max,consult.recharge,c.prepared.some(p=>p.n==="Augury")];
      });
      const castActor=make("Ranger","Demon Hunter",11);PCS.roster.push(castActor);RC.id=castActor.id;renderRoster();renderRosterMain();
      return {fragments,aura,guardian,actor:castActor.id};
    });
    for(const [i,d] of warcraftSubclassAudit.fragments.entries()){
      assert.deepEqual([d.owner.cls,d.cap,d.l,d.sights],[i===0?"Ranger":"Demon Hunter",5,11,["Spectral Sight"]]);
      assert.deepEqual(d.cleave,["2d12+3","psychic",3,true]);assert.equal(d.dc,d.expectedDC);
      assert.match(d.again,/eligible/);assert.match(d.restored,/Recovered/);
      assert.deepEqual([d.initiative,d.remaining,d.fragmentCast,d.havoc],[true,4,[false,true],true]);
    }
    for(const a of warcraftSubclassAudit.aura)assert.deepEqual(a,[["cold","necrotic","psychic"],true,false]);
    for(const [shield,element,max,recharge,augury] of warcraftSubclassAudit.guardian){
      assert.match(shield,/3d6/);assert.match(element,/1d4.*Cold/);assert.deepEqual([max,recharge,augury],[1,"short",true]);
    }
    await page.evaluate(id=>castDialog(PCS.roster.find(c=>c.id===id),"2024","Counterspell",{prefer:"soulFragment"}),warcraftSubclassAudit.actor);
    assert.equal(await page.locator("#castSlot").inputValue(),"soulFragment");
    await page.locator("#actModal [data-castgo]").click();
    const fragmentCost=await page.evaluate(id=>{
      const c=PCS.roster.find(x=>x.id===id);return [c.used.soulFragments,c.used.slot3||0,c.rollLog.some(r=>r.label==="Cast Counterspell")];
    },warcraftSubclassAudit.actor);
    assert.deepEqual(fragmentCost,[2,0,true]);
    assert.equal(await page.locator("#actModal.open").count(),0);
    assert.match(await page.locator("#toast").textContent(),/Disrupt/);
    const starsAudit=await page.evaluate(()=>{
      const make=(ed,level,other={})=>{
        const name=ed==="2014"?"Circle of Stars":"Circle of the Stars";
        const c=pcEnsure(generateCharacter({seed:"STAR-DRUID-GRANTS",ed,cls:"Druid",level,subclass:name,race:"Human",bg:"Sage",...other}));
        c.scores.wis=14;pcInvUpgrade(c);pcRecompute(c);syncGrantedSpells(c);return c;
      };
      const pool=(c,key)=>pcResources(c).find(r=>r.key===key);
      const omenKey=subAblKey("Cosmic Omen"),mapKey="starMapGuidingBolt";
      const caps=["2014","2024"].map(ed=>{
        const c=make(ed,14);
        const grant=c.prepared.find(p=>p.n==="Guiding Bolt").sources.find(s=>s.feature==="Star Map");
        return [pool(c,mapKey).max,pool(c,omenKey).max,!!pool(c,"sub:star-map"),grant.ab,
          c.prepared.some(p=>p.n==="Guidance"&&p.sources?.some(s=>s.feature==="Star Map"))];
      });
      const source=subclassEntry("2014","Druid","Circle of Stars");
      const c=make("2014",14),early=actRun(c,"Cosmic Omen","omen"),random=Math.random;
      let omens,floor,life;
      try {
        Math.random=()=>0;
        const first=actRun(c,"Consult Star Map","consult"),forbidden=actRun(c,"Consult Star Map","consult");
        const use=actRun(c,"Cosmic Omen","omen"),spent=c.used[omenKey];
        pcRest(c,"short");const afterShort=[c.starsOmen,c.used[omenKey]];
        pcRest(c,"long");const afterLong=[c.starsOmen??null,c.used[omenKey]];
        Math.random=()=>0.2;
        const second=actRun(c,"Consult Star Map","consult"),weal=actRun(c,"Cosmic Omen","omen");
        omens={first,forbidden,use,spent,afterShort,afterLong,second,weal};
        Math.random=()=>0;
        actRun(c,"Starry Form","dragon");pcRecompute(c);
        floor=[rollD20(c,"INT",0,"check","int").keep,rollD20(c,"WIS",0,"check","wis").keep,
          rollD20(c,"concentration",0,"save","con",{conc:true}).keep,rollD20(c,"CON",0,"save","con").keep,
          rollD20(c,"WIS save",0,"save","wis").keep];
        const fx=pcFx(c),when=c.starryFormUntil,wild=c.used.wild;
        actRun(c,"Change constellation","chalice");pcRecompute(c);
        const heal=actRun(c,"Chalice healing","heal");
        const same=[c.starryFormUntil===when,c.used.wild===wild];
        actRun(c,"Change constellation","archer");pcRecompute(c);
        const arrow=c.attacks.find(a=>a.name==="Luminous Arrow");
        c.starryFormUntil=Date.now()-1;
        const expired=starryForm(c);
        pcRecompute(c);
        const cleared=!c.active["Starry Form"];
        pcRest(c,"long");actRun(c,"Starry Form","dragon");
        c.conds={stunned:true};pcRecompute(c);c.conds={};
        const stunned=!starryForm(c);
        life={fly:fx.fly,res:[...fx.res],same,heal:heal.amount,kind:heal.kind,arrow:[arrow.die,arrow.hit,c.prof+c.mods.wis],expired,cleared,stunned};
      }finally{Math.random=random;}
      c.used={starMapGuidingBolt:2,"sub:star-map":1};pcRecompute(c);pcRecompute(c);
      const migrated=[c.used.starMapGuidingBolt,!!c.used["sub:star-map"]];
      const canCast=castOpts(c,spellOf("2014","Guiding Bolt"),"2014").some(([id,,,disabled])=>id===mapKey&&!disabled);
      c.subclass="Circle of the Land";pcSubSync(c);pcRecompute(c);syncGrantedSpells(c);
      const cleared=!pool(c,mapKey)&&!pool(c,omenKey)&&!c.starsOmen;
      const ready=[starDruidLevel(make("2014",1)),starDruidLevel(make("2024",2)),starDruidLevel(make("2024",3))];
      return {caps,source:source.featureSourceReview.primaryVerified,early,omens,floor,life,migrated,canCast,cleared,ready};
    });
    assert.deepEqual(starsAudit.caps,[[5,5,false,"wis",true],[2,2,false,"wis",true]]);
    assert.equal(starsAudit.source,true);assert.match(starsAudit.early,/No eligible/);
    assert.match(starsAudit.omens.first,/Woe/);assert.equal(starsAudit.omens.forbidden,"");
    assert.match(starsAudit.omens.use,/Subtract/);assert.match(starsAudit.omens.second,/Weal/);assert.match(starsAudit.omens.weal,/Add/);
    assert.deepEqual([starsAudit.omens.spent,starsAudit.omens.afterShort,starsAudit.omens.afterLong],[1,["woe",1],[null,0]]);
    assert.deepEqual(starsAudit.floor,[10,10,10,1,1]);
    assert.deepEqual([starsAudit.life.fly,starsAudit.life.res,starsAudit.life.same,starsAudit.life.heal,starsAudit.life.kind],[20,["bludgeoning","piercing","slashing"],[true,true],4,"heal"]);
    assert.equal(starsAudit.life.arrow[0],"2d8");assert.equal(starsAudit.life.arrow[1],starsAudit.life.arrow[2]);
    assert.deepEqual([starsAudit.life.expired,starsAudit.life.cleared,starsAudit.life.stunned,starsAudit.migrated,starsAudit.canCast,starsAudit.cleared,starsAudit.ready],["",true,true,[3,false],true,true,[0,0,3]]);
    const starMapActor=await page.evaluate(()=>{
      const c=pcEnsure(generateCharacter({seed:"STAR-MAP-CAST",ed:"2024",cls:"Druid",level:3,subclass:"Circle of the Stars",race:"Human",bg:"Sage"}));
      PCS.roster.push(c);RC.id=c.id;renderRoster();renderRosterMain();
      return c.id;
    });
    await page.locator('[data-act="Star Map"]').click();
    assert.equal(await page.locator("#castSlot").inputValue(),"starMapGuidingBolt");
    await page.locator("#actModal [data-castgo]").click();
    const castFromMap=await page.evaluate(id=>{
      const c=PCS.roster.find(x=>x.id===id);
      return [c.used.starMapGuidingBolt,c.used.slot1||0,c.rollLog.some(r=>r.label==="Cast Guiding Bolt")];
    },starMapActor);
    assert.deepEqual(castFromMap,[1,0,true]);
    await page.locator("#actModal [data-actclose]").last().click();
    const printingChoices=await page.evaluate(()=>{
      const id="reference-ggr-druid-circle-of-spores",name="Circle of Spores";
      const opts={seed:"SOURCE-CHOICE",ed:"2014",cls:"Druid",level:6,subclass:name,race:"Human",bg:"Sage"};
      const base=pcEnsure(generateCharacter(opts));
      const defaults=base.feats.find(f=>f.f==="Symbiotic Entity").subSource;
      const source=()=>rosterCur().feats.find(f=>f.f==="Symbiotic Entity").subSource;
      PCS.roster.push(base);RC.id=base.id;renderRoster();renderRosterMain();
      const imported={report:{matched:[],differ:[]},opts:{},homebrew:[]};
      impSubclass("2014","Druid","Circle of Spores [GGR]",null,imported);
      const exact=generateCharacter({...opts,subclassPrints:imported.opts.subclassPrints});
      const guard=generateCharacter({...opts,ed:"2024",subclassPrints:{Druid:id}});
      const multiclass=pcEnsure(generateCharacter({...opts,cls:"Fighter",subclass:"none",level:1,multi:[{cls:"Druid",lv:6,subclass:name}],subclassPrints:{Druid:id}}));
      const multiFeature=multiclass.feats.find(f=>f.f==="Symbiotic Entity");
      const invalid=generateCharacter({...opts,subclassPrints:{Druid:"reference-ggr-cleric-order-domain"}});
      return {id,defaults,current:source(),exact:exact.feats.find(f=>f.f==="Symbiotic Entity").subSource,
        selection:imported.opts.subclassPrints?.Druid,wrongEdition:guard.subclassPrints?.Druid??null,
        multi:[multiFeature.mc,multiFeature.subSource],invalid:invalid.subclassPrints?.Druid??null};
    });
    assert.deepEqual([printingChoices.defaults,printingChoices.current,printingChoices.exact,printingChoices.selection,printingChoices.wrongEdition,printingChoices.multi,printingChoices.invalid],
      ["tce","tce","ggr",printingChoices.id,null,["Druid","ggr"],null]);
    const printingPicker=page.locator('[data-subclass-print="Druid"]');
    await printingPicker.selectOption(printingChoices.id);
    const printingSaved=await page.evaluate(()=>{
      const current=rosterCur(),sym=current.feats.find(f=>f.f==="Symbiotic Entity");
      const stored=JSON.parse(localStorage.getItem(PC_KEY)).roster.find(c=>c.id===current.id);
      pcLevelTo(current,8);pcSubSync(current);
      return [sym.subSource,featDesc(sym.f,current,sym),stored.subclassPrints.Druid,current.feats.find(f=>f.f===sym.f).subSource];
    });
    assert.equal(printingSaved[0],"ggr");assert.match(printingSaved[1],/Poison damage/i);assert.equal(printingSaved[2],printingChoices.id);assert.equal(printingSaved[3],"ggr");
    await printingPicker.selectOption("");
    assert.equal(await page.evaluate(()=>rosterCur().feats.find(f=>f.f==="Symbiotic Entity").subSource),"tce");
    const sporesAudit=await page.evaluate(()=>{
      const c=rosterCur(),d=eqGear("2014","Dagger");c.inv=[{id:"spore-dagger",ref:d.id,n:d.n,qty:1,eq:true}];
      pcLevelTo(c,10);pcRecompute(c);const ordinary=actRun(c,"Halo of Spores").expr;
      actRun(c,"Symbiotic Entity","take");const tasha=[c.hpTemp,pcAttacks(c)[0].extra[0],actRun(c,"Halo of Spores").expr];
      actRun(c,"Spreading Spores");const spread=actRun(c,"Spreading Spores damage").expr,haloBlocked=actRun(c,"Halo of Spores")==="";
      setSubclassPrinting(c,"Druid","reference-ggr-druid-circle-of-spores");const cleared=!sporesActive(c)&&!c.active["Spreading Spores"];
      actRun(c,"Symbiotic Entity","take");const ravnica=pcAttacks(c)[0].extra[0];
      actApply("pc:"+c.id,40,"damage");const ended=!sporesActive(c)&&!c.active["Symbiotic Entity"];
      return {ordinary,tasha,spread,haloBlocked,cleared,ravnica,ended,spent:c.used.wild};
    });
    assert.deepEqual(sporesAudit,{ordinary:"1d8",tasha:[40,"1d6 necrotic (Symbiotic Entity)","2d8"],spread:"2d8",haloBlocked:true,cleared:true,ravnica:"1d6 poison (Symbiotic Entity)",ended:true,spent:2});
    const monkSubclassAudit=await page.evaluate(()=>{
      const make=(subclass)=>pcEnsure(generateCharacter({seed:"MONK-SUBCLASS",ed:"2014",cls:"Monk",level:17,subclass,race:"Human",bg:"Sage"}));
      const d=make("Way of the Ascendant Dragon"); d.used={};d.active={};
      const pools=legacyMonkPools(d).map(r=>[r.key,r.max]);
      actRun(d,"Breath of the Dragon","fire:cone:normal");const first=[d.used.dragonBreath||0,d.used.ki||0];
      d.used.dragonBreath=d.prof;actRun(d,"Breath of the Dragon","fire:cone:augmented");const paid=d.used.ki||0;
      actRun(d,"Aspect of the Wyrm","fire");const aura=!!d.active["Aspect of the Wyrm"];
      actRun(d,"Explosive Fury (Wyrm)","fire");const pending=!!d.dragonFuryPending;const again=actRun(d,"Explosive Fury (Wyrm)","fire");
      actRun(d,"Aspect of the Wyrm");actRun(d,"Aspect of the Wyrm","fear");const auraPaid=d.used.ki||0;
      actRun(d,"Draconic Presence","persuasion");actRun(d,"Draconic Presence","failure");const failed=d.used.dragonPresence||0;
      actRun(d,"Draconic Presence","persuasion");actRun(d,"Draconic Presence","success");const succeeded=d.used.dragonPresence||0;
      pcRest(d,"long");const restored=[d.used.ki||0,d.used.dragonBreath||0,d.used.dragonAura||0,d.used.dragonPresence||0];
      const sun=make("Way of the Sun Soul");sun.used={};actRun(sun,"Searing Arc Strike","2");actRun(sun,"Searing Sunburst","3");const sunPaid=sun.used.ki||0;
      return {pools,prof:d.prof,first,paid,aura,pending,again,auraPaid,failed,succeeded,restored,sunPaid};
    });
    assert.deepEqual(monkSubclassAudit.pools,[["dragonPresence",1],["dragonBreath",monkSubclassAudit.prof],["dragonWings",monkSubclassAudit.prof],["dragonAura",1]]);
    assert.deepEqual(monkSubclassAudit.first,[1,0]);assert.equal(monkSubclassAudit.paid,3);assert.equal(monkSubclassAudit.aura,true);assert.equal(monkSubclassAudit.pending,false);assert.match(monkSubclassAudit.again,/eligible|unavailable/i);
    assert.equal(monkSubclassAudit.auraPaid,6);assert.deepEqual([monkSubclassAudit.failed,monkSubclassAudit.succeeded],[0,1]);assert.deepEqual(monkSubclassAudit.restored,[0,0,0,0]);assert.equal(monkSubclassAudit.sunPaid,5);
    const subclassPassiveAudit=await page.evaluate(()=>{
      const make=(ed,cls,level,subclass)=>pcEnsure(generateCharacter({seed:"PASSIVE-SUB",ed,cls,level,subclass,race:"Human",bg:"Sage"}));
      const old=make("2014","Druid",14,"Circle of the Land");old.active={};old.used={};actRun(old,"Nature's Sanctuary");const passive=!old.active["Nature's Sanctuary"]&&!old.used.wild;
      const cleric=make("2014","Cleric",1,"Order Domain");cleric.choices={"Order Bonus Proficiency":["Persuasion"]};cleric.skills.find(s=>s.s==="Persuasion").p=false;pcRecompute(cleric);const granted=cleric.skills.find(s=>s.s==="Persuasion").orderGranted;cleric.subclass="Life Domain";pcSubSync(cleric);pcRecompute(cleric);const removed=!cleric.skills.find(s=>s.s==="Persuasion").p;
      const fighter=make("2014","Fighter",7,"Purple Dragon Knight (Banneret)");const persuasion=fighter.skills.find(s=>s.s==="Persuasion");persuasion.p=false;persuasion.x=false;pcRecompute(fighter);const newSkill=[persuasion.p,persuasion.x,persuasion.envoyGranted];pcRecompute(fighter);
      fighter.subclass="Champion";pcSubSync(fighter);pcRecompute(fighter);
      return {passive,granted,removed,newSkill,removedEnvoy:[persuasion.p,persuasion.x]};
    });
    assert.deepEqual([subclassPassiveAudit.passive,subclassPassiveAudit.granted,subclassPassiveAudit.removed],[true,true,true]);
    assert.deepEqual(subclassPassiveAudit.newSkill,[true,true,true]);assert.deepEqual(subclassPassiveAudit.removedEnvoy,[false,false]);
    const choiceGrantAudit=await page.evaluate(()=>{
      const make=(ed,cls,level,subclass)=>pcEnsure(generateCharacter({seed:"CHOICE-GRANTS",ed,cls,level,subclass,race:"Human",bg:"Sage"}));
      const peace=make("2014","Cleric",1,"Peace Domain"),p=peace.skills.find(s=>s.s==="Insight");p.p=false;p.x=false;peace.choices={"Implement of Peace":["Insight"]};pcRecompute(peace);const peaceGranted=p.p&&p.peaceGranted;peace.subclass="Life Domain";pcSubSync(peace);pcRecompute(peace);const peaceRemoved=!p.p&&!p.peaceGranted;
      const fey=[];
      for(const ed of ["2014","2024"]){const c=make(ed,"Ranger",3,"Fey Wanderer"),p=c.skills.find(s=>s.s==="Persuasion");p.p=false;p.x=false;c.scores.wis=8;c.choices={"Otherworldly Glamour":["Persuasion"]};pcRecompute(c);fey.push([p.p,!!p.glamourGranted,p.v-c.mods.cha-c.prof]);c.subclass="Hunter";pcSubSync(c);pcRecompute(c);fey.push([p.p,!!p.glamourGranted]);}
      const archer=make("2014","Fighter",3,"Arcane Archer"),skill=archer.skills.find(s=>s.s==="Nature");skill.p=false;skill.x=false;archer.choices={"Arcane Archer Lore":["Druidcraft"],"Arcane Archer Skill":["Nature"]};syncGrantedSpells(archer);pcRecompute(archer);const arch=[skill.p,!!skill.archerGranted,archer.prepared.some(p=>p.n==="Druidcraft"&&p.sources?.some(s=>s.feature==="Arcane Archer Lore"))];archer.subclass="Champion";pcSubSync(archer);syncGrantedSpells(archer);pcRecompute(archer);
      const arcana=make("2014","Cleric",17,"Arcana Domain");arcana.choices={};const keys=[6,7,8,9].map(n=>"Arcane Mastery "+n);for(const key of keys)arcana.choices[key]=[CHOICES[key].opts(arcana)[0][0]];syncGrantedSpells(arcana);const mastery=arcana.prepared.filter(p=>p.sources?.some(s=>s.feature==="Arcane Mastery")).map(p=>p.l).sort((a,b)=>a-b);arcana.level=16;syncGrantedSpells(arcana);const masteryRemoved=!arcana.prepared.some(p=>p.sources?.some(s=>s.feature==="Arcane Mastery"));
      return {peaceGranted,peaceRemoved,fey,arch,archRemoved:!skill.p&&!archer.prepared.some(p=>p.sources?.some(s=>s.feature==="Arcane Archer Lore")),mastery,masteryRemoved};
    });
    assert.deepEqual(choiceGrantAudit,{peaceGranted:true,peaceRemoved:true,fey:[[true,true,1],[false,false],[true,true,1],[false,false]],arch:[true,true,true],archRemoved:true,mastery:[6,7,8,9],masteryRemoved:true});
    const feyCastAudit=await page.evaluate(()=>{
      const make=(ed,cls,level,subclass)=>pcEnsure(generateCharacter({seed:"FEY-CAST",ed,cls,level,subclass,race:"Human",bg:"Sage"}));
      const out=[];
      for(const ed of ["2014","2024"]){
        const c=make(ed,"Ranger",15,"Fey Wanderer");c.scores.wis=8;pcRecompute(c);syncGrantedSpells(c);
        const key=subAblKey("Misty Wanderer"),summon=subAblKey("Fey Reinforcements"),sp=spellOf(ed,"Misty Step");
        const resources=pcResources(c);out.push([resources.filter(r=>r.key===key).length,resources.find(r=>r.key===key)?.max,resources.find(r=>r.key===summon)?.max,castOpts(c,sp,ed).some(o=>o[0]===key&&!o[3]),feySummonOption(c,{n:"Summon Fey"},ed)]);
        c.used={...c.used,[key]:1};out.push(castOpts(c,sp,ed).some(o=>o[0]===key&&o[3]));
        c.scores.wis=18;pcRecompute(c);out.push(pcResources(c).find(r=>r.key===key)?.max);
        c.subclass="Hunter";pcSubSync(c);syncGrantedSpells(c);out.push(!pcResources(c).some(r=>r.key===key||r.key===summon));
      }
      const a=make("2024","Warlock",6,"Archfey Patron");a.scores.cha=18;pcRecompute(a);syncGrantedSpells(a);const key=subAblKey("Steps of the Fey"),r=pcResources(a).filter(r=>r.key===key);
      const celestial=make("2024","Warlock",6,"Celestial Patron");celestial.scores.cha=16;pcRecompute(celestial);celestial.used={};const hk=subAblKey("Healing Light");const opts=actChoices(celestial,ACT["Healing Light"]).map(x=>x[0]);const result=actRun(celestial,"Healing Light","3");const blocked=actRun(celestial,"Healing Light","4");return {out,arch:[r.length,r[0]?.max,feyTeleportOptions(a,{n:"Misty Step"}).length],heal:[opts,celestial.used[hk],result?.amount>=3&&result?.amount<=18,typeof blocked==="string"]};
    });
    assert.deepEqual(feyCastAudit.out,[[1,1,1,true,true],true,4,true,[1,1,1,true,true],true,4,true]);assert.deepEqual(feyCastAudit.arch,[1,4,1]);assert.deepEqual(feyCastAudit.heal,[["1","2","3"],3,true,true]);
    const glamourAudit=await page.evaluate(()=>{
      const make=(ed,cls,level,subclass)=>pcEnsure(generateCharacter({seed:"GLAMOUR",ed,cls,level,subclass,race:"Human",bg:"Sage"}));
      const c=make("2024","Bard",8,"College of Glamour");syncGrantedSpells(c);
      const grants=c.prepared.filter(p=>p.sources?.some(s=>["Beguiling Magic","Mantle of Majesty"].includes(s.feature))).map(p=>p.n).sort();
      const beg=subAblKey("Beguiling Magic"),majesty=subAblKey("Mantle of Majesty");c.used={ [beg]:1,[majesty]:1 };
      const recover=actRun(c,"Restore Beguiling Magic"),already=actRun(c,"Restore Beguiling Magic");
      const invalid=restoreSubclassUse(c,"Restore Mantle of Majesty","slot2");const legal=subclassRecoverySlots(c,"Restore Mantle of Majesty").map(x=>x[0]);
      const restored=actRun(c,"Restore Mantle of Majesty","slot4");
      const w=make("2024","Wizard",10,"Abjurer");syncGrantedSpells(w);const abj=w.prepared.filter(p=>p.sources?.some(s=>s.feature==="Spell Breaker")).map(p=>p.n).sort();w.level=9;syncGrantedSpells(w);
      return {grants,beg:c.used[beg],bardic:c.used.bardic,already,invalid,legal,majesty:c.used[majesty],slot4:c.used.slot4,abj,removed:!w.prepared.some(p=>p.sources?.some(s=>s.feature==="Spell Breaker"))};
    });
    assert.deepEqual(glamourAudit.grants,["Charm Person","Command","Mirror Image"]);assert.deepEqual([glamourAudit.beg,glamourAudit.bardic,glamourAudit.majesty,glamourAudit.slot4],[0,1,0,1]);assert.match(glamourAudit.already,/already available/);assert.match(glamourAudit.invalid,/Not enough/);assert.deepEqual(glamourAudit.legal,["slot3","slot4"]);assert.deepEqual(glamourAudit.abj,["Counterspell","Dispel Magic"]);assert.equal(glamourAudit.removed,true);
    const wizardSubclassAudit=await page.evaluate(()=>{
      const make=(ed,cls,level,subclass)=>pcEnsure(generateCharacter({seed:"WIZSUB",ed,cls,level,subclass,race:"Human",bg:"Sage"}));
      const out=[];
      for(const ed of ["2014","2024"]){
        const c=make(ed,"Wizard",14,ed==="2014"?"School of Divination":"Diviner");
        pcRest(c,"long");const dice=portentDice(c).map(d=>d.value);const first=usePortent(c,"0");const blocked=usePortent(c,"1");
        usePortent(c,"next");usePortent(c,"1");const spent=portentDice(c).filter(d=>d.spent).length;
        pcRest(c,"short");const kept=portentDice(c).filter(d=>d.spent).length;pcRest(c,"long");out.push([dice.length,dice.every(d=>d>=1&&d<=20),spent,kept,portentDice(c).filter(d=>d.spent).length,blocked.includes("unavailable")]);
        const w=make(ed,"Wizard",10,ed==="2014"?"School of Abjuration":"Abjurer");w.scores.int=16;pcRecompute(w);
        const sp={l:1,s:"Abjuration"};arcaneWardOnCast(w,sp,"slot1",1);const max=arcaneWardHP(w);const hit=arcaneWardAbsorb(w,8);
        arcaneWardOnCast(w,sp,"slot2",2);const hp=arcaneWardHP(w);const proj=projectedWardUse(w,"2");
        const options=arcaneWardRechargeOptions(w);const free=arcaneWardOnCast(w,sp,"ritual",1);pcRest(w,"long");
        out.push([max,hit.absorbed,hit.left,hp,!!proj,options.length>0,!!free,!arcaneWardExists(w)]);
      }
      const g=make("2024","Bard",6,"College of Glamour");const key=subAblKey("Mantle of Majesty");g.used={};g.conc={spell:"Bless"};const start=majestyCast(g,"majestyStart");const repeat=majestyCast(g,"majestyRepeat");const spent=g.used[key];delete g.conc;const unavailable=majestyCast(g,"majestyStart")===null;pcRest(g,"long");
      return {out,majesty:[!!start,!!repeat,spent,unavailable,majestyCastOptions(g,{n:"Command"})[0]?.[0]]};
    });
    assert.deepEqual(wizardSubclassAudit.out,[[3,true,2,2,0,true],[23,8,0,19,true,false,true,true],[3,true,2,2,0,true],[23,8,0,19,true,true,false,true]]);
    assert.deepEqual(wizardSubclassAudit.majesty,[true,true,1,true,"majestyStart"]);
    const wizardRecoveryAudit=await page.evaluate(()=>{
      const make=(ed,cls,level,subclass)=>pcEnsure(generateCharacter({seed:"WIZREC",ed,cls,level,subclass,race:"Human",bg:"Sage"}));
      const result=[];
      for(const ed of ["2014","2024"]){
        const d=make(ed,"Wizard",13,ed==="2014"?"School of Divination":"Diviner");d.used={slot1:1,slot3:1,slot5:1,slot6:1};const sp={s:"Divination",l:3};
        const keys=expertDivinationOptions(d,sp,"slot6",6).map(x=>x[0]);const invalid=expertDivinationRecover(d,sp,"slot6",6,"slot6");const good=expertDivinationRecover(d,sp,"slot6",6,"slot5");
        result.push([keys,invalid,!!good,d.used.slot5,d.used.slot6,expertDivinationOptions(d,sp,"ritual",3).length]);
      }
      const w=make("2024","Wizard",10,"Abjurer");w.used={slot3:1};const sp={n:"Counterspell"};const record=spellBreakerRecord(w,sp,"slot3");const refund=spellBreakerResolve(w,"failed");const repeat=spellBreakerResolve(w,"failed");w.used.slot3=1;spellBreakerRecord(w,sp,"slot3");const stopped=spellBreakerResolve(w,"stopped");return {result,refund:[record,!!refund,repeat,!!stopped,w.used.slot3]};
    });
    assert.deepEqual(wizardRecoveryAudit.result,[[["slot1","slot3","slot5"],"",true,0,1,0],[["slot1","slot3","slot5"],"",true,0,1,0]]);
    assert.deepEqual(wizardRecoveryAudit.refund,[true,true,"No eligible Spell Breaker casting.",true,1]);
    const coreSpeciesAudit=await page.evaluate(()=>{
      const make=(race,sub,level=5,ed="2024")=>pcEnsure(generateCharacter({seed:"SPECIES-P3",ed,cls:"Fighter",level,race,sub,bg:"Sage"}));
      const orc=make("Orc",null),adren=pcResources(orc).find(r=>r.key==="adren");orc.used={adren:1};pcRest(orc,"short");const orcRest=orc.used.adren;
      orc.hpCur=orc.hp;const rejected=actRun(orc,"Relentless Endurance","confirm");const spentBefore=orc.used.relent||0;orc.hpCur=0;orc.death={s:0,f:0};orc.conds={unconscious:true};orc.condAuto=true;actRun(orc,"Relentless Endurance","confirm");
      const dwarf=make("Dwarf",null);dwarf.used={};actRun(dwarf,"Stonecunning","stone");const stone=[dwarf.used.stonecunning,!!dwarf.active.Stonecunning];pcRest(dwarf,"short");stone.push(dwarf.used.stonecunning,!dwarf.active.Stonecunning);pcRest(dwarf,"long");stone.push(dwarf.used.stonecunning);
      const giants=Object.keys(GIANT_BOONS).map(sub=>{const c=make("Goliath",sub);c.used={};const b=giantBoon(c);const result=actRun(c,"Giant Ancestry");return [b?.name,c.used.giant,typeof result==="object"?result.kind:!!result];});
      const human=make("Human",null);pcRest(human,"long");const h1=human.heroicInspiration;actRun(human,"Heroic Inspiration");const h2=!!human.heroicInspiration;pcRest(human,"short");const h3=!!human.heroicInspiration;pcRest(human,"long");
      return {adren:[adren?.max,adren?.recharge,orcRest],relent:[!!rejected,spentBefore,orc.hpCur,orc.used.relent,!orc.conds.unconscious],stone,giants,human:[h1,h2,h3,human.heroicInspiration]};
    });
    assert.deepEqual(coreSpeciesAudit.adren,[3,"short",0]);assert.deepEqual(coreSpeciesAudit.relent,[true,0,1,1,true]);assert.deepEqual(coreSpeciesAudit.stone,[1,true,1,true,0]);assert.deepEqual(coreSpeciesAudit.giants,[["Cloud's Jaunt",1,true],["Fire's Burn",1,"damage"],["Frost's Chill",1,"damage"],["Hill's Tumble",1,true],["Stone's Endurance",1,true],["Storm's Thunder",1,"damage"]]);assert.deepEqual(coreSpeciesAudit.human,[true,false,false,true]);
    const expansion = await page.evaluate(() => {
      const subclasses = hbBook("subclass").filter(x => ["tce", "xge"].includes(x.src));
      const armorer = generateCharacter({ seed: "ARMOR", ed: "2014", cls: "Artificer", subclass: "Armorer", level: 5 });
      const fighter = generateCharacter({ seed: "RUNES", ed: "2014", cls: "Fighter", subclass: "Rune Knight", level: 7 });
      const rogue = generateCharacter({ seed: "SCOUT", ed: "2014", cls: "Fighter", level: 5,
        multi: [{ cls: "Rogue", lv: 3, subclass: "Scout" }] });
      const hasSources = (sub, books) => subclassList("2014", "Rogue", src => !src || books.includes(src))
        .some(([name]) => name === sub);
      return {
        counts: ["tce", "xge"].map(src => subclasses.filter(x => x.src === src).length),
        allDescribed: subclasses.every(x => x.features.length && x.features.every(f => f.d && !f.d.includes("See the source book"))),
        armorerSlots: armorer.spell.slots,
        artificerCanPrepare: pcSpellPool(armorer, "2014").some(s => s.n === "Cure Wounds"),
        armorerSummary: progressionRows("2014", "subclass", "Artificer", "Armorer")[2].find(([name]) => name === "Armor Model")[1],
        runeOptions: CHOICES["Rune Carver"].opts(fighter).map(([id]) => id),
        runeLimit: CHOICES["Rune Carver"].n(fighter),
        scoutFeature: rogue.feats.some(f => f.mcsub === "Scout" && f.f === "Skirmisher"),
        reprintSources: [hasSources("Swashbuckler", ["scag"]), hasSources("Swashbuckler", ["xge"])],
        revisedArtificer: classList("2024").includes("Artificer"),
        revisedFeature: classData("2024", "Artificer").f[2][0],
        legacyFeature: classData("2014", "Artificer").f[2][0],
      };
    });
    assert.deepEqual(expansion, {
      counts: [30, 31],
      allDescribed: true,
      armorerSlots: [4, 2],
      artificerCanPrepare: true,
      armorerSummary: "Choose Guardian or Infiltrator and switch after a short or long rest with smith’s tools.",
      runeOptions: ["Cloud", "Fire", "Frost", "Stone", "Hill", "Storm"],
      runeLimit: 3,
      scoutFeature: true,
      reprintSources: [true, true],
      revisedArtificer: true,
      revisedFeature: "Replicate Magic Item",
      legacyFeature: "Infuse Item",
    });
    const runeKnight=await page.evaluate(()=>{
      const c=pcEnsure(generateCharacter({seed:"INSCRIBED",ed:"2014",cls:"Fighter",subclass:"Rune Knight",level:18}));
      c.inv=["helm","sword","shield","ring","cloak"].map(id=>({id,n:id,qty:1,eq:true}));
      c.choices={"Rune Carver":["Cloud","Fire","Frost","Hill","Storm"]};
      c.used={};
      const inscribe=(name,item)=>actRun(c,"Rune Carver inscriptions",JSON.stringify([name,item]));
      inscribe("Cloud","cloak");
      const occupied=inscribe("Fire","cloak");
      inscribe("Fire","sword");inscribe("Frost","helm");inscribe("Hill","shield");inscribe("Storm","ring");
      const proficiencies=profInfo(c);
      const limit=pcResources(c).find(r=>r.key==="runeKnightFire").max;
      const cloud=rollState(c,"check","cha",{skill:"Deception"}).adv.includes("Cloud Rune");
      const fire=actRun(c,"Invoke Fire Rune","critical");
      actRun(c,"Invoke Frost Rune","invoke");actRun(c,"Invoke Hill Rune","invoke");actRun(c,"Invoke Storm Rune","invoke");
      c.conds={stunned:true};pcRecompute(c);delete c.conds.stunned;
      const stormEnded=!pcAbilities(c).some(a=>a.name==="Storm Rune foresight");
      actRun(c,"Giant's Might","huge");
      const huge=rcActiveHTML(c).includes("Huge, with 5 feet of extra reach");
      const strength=rollState(c,"save","str"),constitution=rollState(c,"check","con");
      const resistance=[...pcFx(c).res];
      const hit=actRun(c,"Giant’s Might damage","hit");
      const sameTurn=actRun(c,"Giant’s Might damage","hit");
      actRun(c,"Begin Giant’s Might turn","next");
      const crit=actRun(c,"Giant’s Might damage","critical");
      actRun(c,"Runic Shield","hit");
      const shield=c.rollLog[0].label;
      c.inv.find(i=>i.id==="cloak").eq=false;
      const unequipped=!rollState(c,"check","cha",{skill:"Deception"}).adv.includes("Cloud Rune");
      const stored=JSON.parse(JSON.stringify(c));pcRecompute(stored);
      const persisted=stored.runeKnightInscriptions.Fire==="sword"&&runeKnightEffect(stored,"might")?.size==="huge";
      pcRest(c,"short");
      const short=[c.used.runeKnightFire,c.used.runeKnightMight,c.used.runeKnightShield,!!c.runeKnightInscriptions,!runeKnightEffect(c,"might")];
      pcRest(c,"long");
      const long=[c.used.runeKnightMight,c.used.runeKnightShield,!!c.runeKnightInscriptions];
      const low=pcEnsure(generateCharacter({seed:"LOW-RUNE",ed:"2024",cls:"Wizard",level:7,multi:[{cls:"Fighter",lv:3,subclass:"Rune Knight"}]}));
      const multiclass=[runeKnightLevel(low),runeKnightDie(low),CHOICES["Rune Carver"].opts(low).length,pcResources(low).find(r=>r.key==="runeKnightMight")?.max];
      low.multi[0].subclass="Champion";pcRecompute(low);
      return {occupied,limit,cloud,fire:fire.msg,huge,strength,constitution,resistance,hit:hit.msg,sameTurn,crit:crit.msg,shield,unequipped,stormEnded,persisted,short,long,multiclass,
        training:proficiencies.langs.includes("Giant")&&proficiencies.tools.some(tool=>/smith/i.test(tool)),removed:!pcResources(low).some(r=>r.key.startsWith("runeKnight"))};
    });
    assert.match(runeKnight.occupied,/unavailable/);assert.equal(runeKnight.limit,2);assert.match(runeKnight.fire,/4d6/);
    assert.deepEqual([runeKnight.cloud,runeKnight.huge,runeKnight.unequipped,runeKnight.stormEnded,runeKnight.persisted,runeKnight.training,runeKnight.removed],Array(7).fill(true));
    assert.deepEqual(runeKnight.strength.adv,["Giant’s Might"]);assert.equal(runeKnight.strength.pen,2);assert.equal(runeKnight.constitution.pen,2);
    assert.deepEqual(runeKnight.resistance,["bludgeoning","piercing","slashing","poison"]);assert.equal(runeKnight.shield,"Runic Shield reroll");
    assert.match(runeKnight.hit,/1d10/);assert.equal(runeKnight.sameTurn,"");assert.match(runeKnight.crit,/2d10/);
    assert.deepEqual(runeKnight.short,[0,1,1,true,true]);assert.deepEqual(runeKnight.long,[0,0,false]);assert.deepEqual(runeKnight.multiclass,[3,6,4,4]);
    const evoker=await page.evaluate(()=>{
      const c=pcEnsure(generateCharacter({seed:"AUGMENT",ed:"2024",cls:"Evoker",subclass:"Draconic Sorcery",level:18}));
      c.choices={"Evoker specialization":["Augmentation"],"Elemental Affinity":["fire"]};syncGrantedSpells(c);
      const grants=()=>c.prepared.filter(p=>p.sources?.some(s=>s.kind==="subclass"&&s.cls==="Evoker")).map(p=>p.n);
      const before=grants(),source=spellPreparationSources(c,"Eruption")[0];
      const features=subclassEntry("2024","Evoker","Draconic Sorcery").features.map(f=>f.n);
      const resistance=pcFx(c).res.has("fire");
      c.used={};actRun(c,"Dragon Wings");const wings=[c.used.draconicWings,pcFx(c).fly];
      actRun(c,"Restore Dragon Wings");const restored=[c.used.draconicWings,c.used.sorc];
      const dragon=spellOf("2024","Summon Dragon"),free=castOpts(c,dragon,"2024").some(x=>x[0]==="dragonCompanion"&&!x[3]);
      c.conc={spell:"Fly"};castDialog(c,"2024","Summon Dragon",{prefer:"dragonCompanion"});
      document.querySelector("#dragonNoConcentration").checked=true;castGo();actClose();
      const cast=[c.conc?.spell,c.used.dragonCompanion,c.used.slot5||0];
      c.choices["Evoker specialization"]=["Preservation"];syncGrantedSpells(c);
      return {before,source:source?.cls,features,resistance,wings,restored,free,cast,after:grants()};
    });
    assert.deepEqual(evoker.before.sort(),["Chromatic Orb","Dragon's Breath","Fly","Arcane Eye","Summon Dragon","Ebon Might","Eruption","Blistering Scales","Upheaval","Breath of Eons"].sort());
    assert.deepEqual(evoker.after.sort(),["Chromatic Orb","Dragon's Breath","Fly","Arcane Eye","Summon Dragon","Dream Breath","Living Flame","Emerald Blossom","Time Dilation","Dream Flight"].sort());
    assert.deepEqual(evoker.features.sort(),["Draconic Resilience","Evoker Spells","Elemental Affinity","Dragon Wings","Dragon Companion"].sort());
    assert.equal(evoker.source,"Evoker");assert.equal(evoker.resistance,true);assert.deepEqual(evoker.wings,[1,60]);assert.deepEqual(evoker.restored,[0,3]);
    assert.equal(evoker.free,true);assert.deepEqual(evoker.cast,["Fly",1,0]);
    const revised = await page.evaluate(() => {
      const c = pcEnsure(generateCharacter({ seed: "EBERRON", ed: "2024", cls: "Artificer",
        race: "Warforged", bg: "House Lyrandar Heir", subclass: "Armorer", level: 5 }));
      const spells = pcSpellPool(c, "2024");
      const rows = progressionRows("2024", "subclass", "Artificer", "Cartographer");
      itLoad();
      bsLoad();
      return {
        slots: c.spell.slots,
        prepared: spellLimits(c).n,
        options: CHOICES["Armor Model"].opts(c).map(([name]) => name),
        cartographer: rows[4].some(([name]) => name === "Guided Precision"),
        speciesBonus: c.hbAc,
        origin: c.feats.some(f => f.f === "Feat: Mark of Storm"),
        arcaneVigor: spells.some(s => s.n === "Arcane Vigor" && s.src === "phb-2024"),
        mindFlayer: BS.data["2024"].find(m => m.n === "Mind Flayer").hp,
        energyBow: inventoryWeaponChoices(IT.data["2024"].find(i => i.n === "Energy Bow"), "2024").map(i => i.n).sort(),
        pathChoices: Object.keys(PC_RACES["2024"].Shifter.subs).length,
      };
    });
    assert.deepEqual(revised, {
      slots: [4, 2],
      prepared: 6,
      options: ["Dreadnaught", "Guardian", "Infiltrator"],
      cartographer: true,
      speciesBonus: 1,
      origin: true,
      arcaneVigor: true,
      mindFlayer: 99,
      energyBow: ["Longbow", "Shortbow"],
      pathChoices: 4,
    });
    await page.evaluate(() => {
      const c = pcEnsure(generateCharacter({ seed: "MODEL", ed: "2014", name: "Model Tester", cls: "Artificer", subclass: "Armorer", level: 3 }));
      PCS.roster.push(c);
      RC.id = c.id;
      pcPersist();
      renderRosterTab();
    });
    const model = page.getByRole("combobox", { name: "Choose Armor model" });
    await model.selectOption("Infiltrator");
    assert.deepEqual(await page.evaluate(() => choiceOf(rosterCur(), "Armor Model")), ["Infiltrator"]);
    await page.reload();
    await page.waitForFunction(() => PCS.roster.some(c => c.name === "Model Tester"));
    assert.deepEqual(await page.evaluate(() => choiceOf(PCS.roster.find(c => c.name === "Model Tester"), "Armor Model")), ["Infiltrator"]);
    const dragonAudit=await page.evaluate(()=>{
      const sp=spellOf("2024","Summon Dragon");
      const rows=[5,6,7,8,9].map(l=>summonSpiritStats(sp,"2024",l,"Dragon"));
      const html=summonSpiritHTML(sp,"2024",7,{atk:8,dc:16});
      const legacy=summonSpiritHTML(sp,"2014",7,{atk:8,dc:16});
      const foreign=summonSpiritHTML({...sp,src:"third-party"},"2024",7);
      const homebrew=summonSpiritHTML({...sp,hb:true},"2024",7);
      const invalid=[4,10,6.5].map(l=>summonSpiritStats(sp,"2024",l,"Dragon"));
      return {rows,html,legacy,foreign,homebrew,invalid,higher:summonHigherRules(sp,"2024")};
    });
    assert.deepEqual(dragonAudit.rows.map(x=>[x.ac,x.hp,x.attacks,x.rendDamage,x.breathUses,x.breathDamage]),[
      [19,50,2,"1d6+9",1,"2d6"],[20,60,3,"1d6+10",1,"2d6"],[21,70,3,"1d6+11",1,"2d6"],[22,80,4,"1d6+12",1,"2d6"],[23,90,4,"1d6+13",1,"2d6"]
    ]);
    assert.match(dragonAudit.html,/Draconic Spirit/);assert.match(dragonAudit.html,/AC 21 · HP 70/);
    assert.match(dragonAudit.html,/Spell attack \+8 · Save DC 16/);
    assert.match(dragonAudit.html,/Acid, Cold, Fire, Lightning, Poison/);
    assert.match(dragonAudit.html,/30-foot cone/);assert.match(dragonAudit.html,/SRD 5\.2\.1, p\. 166/);
    assert.deepEqual(dragonAudit.invalid,[null,null,null]);
    assert.equal(dragonAudit.legacy+dragonAudit.foreign+dragonAudit.homebrew,"");
    assert.doesNotMatch(dragonAudit.higher,/MOD SAVE/);
    const summon = await page.evaluate(() => {
      const spell = spellOf("2024", "Summon Celestial");
      return summonSpiritHTML(spell, "2024", 7, { atk: 8, dc: 16 });
    });
    assert.match(summon, /Avenger<\/b> · AC 18 · HP 60/);
    assert.match(summon, /Defender<\/b> · AC 20 · HP 60/);
    assert.match(summon, /Spell attack \+8 · Save DC 16/);
    await page.evaluate(() => {
      const caster = pcEnsure(generateCharacter({seed: "SUMMON", ed: "2024", cls: "Wizard", level: 13}));
      castDialog(caster, "2024", "Summon Construct");
    });
    await page.locator('[data-castlv="slot7"]').click();
    await page.locator('[data-castgo]').click();
    assert.match(await page.locator("#actBox").textContent(), /Construct Spirit · slot level 7/);
    assert.match(await page.locator("#actBox").textContent(), /Clay · AC 20 · HP 85/);
    assert.equal(await page.evaluate(() => ACTX.c.used.slot7), 1);
    assert.equal(await page.evaluate(() => ACTX.c.conc?.spell), "Summon Construct");
    const monsters = await page.evaluate(() => {
      bsLoad();
      return ["Primeval Owlbear", "Arch-hag", "Blob of Annihilation"].map(name => {
        const monster = BS.data["2024"].find(m => m.n === name);
        const entry = bsEntry(monster, "2024", name);
        return { hp: entry.stat[1], source: entry.src, text: entry.text };
      });
    });
    assert.deepEqual(monsters.map(m => m.hp), [126, 333, 448]);
    assert.ok(monsters.every(m => m.source === "mm-2025" && m.text.includes("Source: Monster Manual (2025)")));
    assert.match(monsters[1].text, /Condition Immunities charmed, exhaustion, frightened/);
    const catalog = await page.evaluate(() => {
      const spell = spellOf("2024", "Melf's Acid Arrow");
      const bg = bgInfo("2024", "Chondathan Freebooter");
      const armor = IT.data["2024"].find(item => item.n === "+1 Rod of the Pact Keeper");
      const variants = ["Armor of Fire Resistance", "Armor of Vulnerability (Piercing)", "Enspelled Weapon (Level 7)"]
        .map(name => IT.data["2024"].find(item => item.n === name));
      const rival = { name: "Death Knight", src: "mm-2025", ed: "2024" };
      return {
        alias: spell?.n,
        variants: variants.map(item => [item.src, item.rk, item.att]),
        enspelledWeapons: inventoryWeaponChoices(variants[2], "2024").length,
        manualCast: castPreview(generateCharacter({ seed: "REF", ed: "2024", cls: "Wizard", level: 3 }),
          spellOf("2024", "Bonestorm"), "free"),
        fromBook: armor?.src,
        backgroundSkills: bg?.sk.length,
        azerothDwarf: raceList("2024").includes("Dwarf (Azeroth)"),
        homonym: bsName({ bestiary: [rival] }, { n: "Death Knight", src: "tob" }, "2024"),
      };
    });
    assert.equal(catalog.alias, "Acid Arrow");
    assert.deepEqual(catalog.variants, [[ "dmg-2024", 2, "Required" ], [ "dmg-2024", 2, "Required" ], [ "dmg-2024", 4, "Required" ]]);
    assert.ok(catalog.enspelledWeapons > 1);
    assert.match(catalog.manualCast, /Resolve all rolls and effects manually using the complete spell rules/);
    assert.doesNotMatch(catalog.manualCast, /(?:deals|heals)\s+\d+d\d+/i);
    assert.equal(catalog.fromBook, "dmg-2024");
    assert.equal(catalog.backgroundSkills, 2);
    assert.equal(catalog.azerothDwarf, true);
    assert.match(catalog.homonym, /^Death Knight \(.*\)$/);
    await page.locator("#actModal [data-actclose]").click();
    await page.evaluate(() => lvOpen(generateCharacter({ seed: "REF", ed: "2024", cls: "Fighter", level: 2 })));
    await page.getByLabel("Search subclasses").fill("champion");
    assert.equal(await page.locator('[data-lvsub="Battle Master"]').isVisible(), false);
    await page.locator('[data-lvsub="Champion"]').click();
    assert.equal(await page.locator('[data-lvsub="Champion"]').getAttribute("aria-pressed"), "true");
    await page.locator("[data-lvno]").click();

    await page.goto(`http://127.0.0.1:${server.address().port}/#items`);
    await page.locator("#itQ").fill("enspelled weapon level 7");
    await page.locator('#itList [data-it="toggle"]').filter({ hasText: "Enspelled Weapon (Level 7)" }).click();
    assert.match(await page.locator("#itList").textContent(), /Spell save DC 18/);
    await page.locator('#itList [data-it="give"]').click();
    assert.equal(await page.evaluate(() => PCS.roster.some(c => c.inv?.some(i => i.n === "Enspelled Weapon (Level 7)" && i.att))), true);
    const warcraft = await page.evaluate(() => {
      const classes = hbBook("class").filter(x => x.src === "wow").map(x => {
        const sub = subclassList("2024", x.name)[0][0];
        const c = pcEnsure(generateCharacter({ seed: "AZEROTH", ed: "2024", cls: x.name, subclass: sub, level: 17 }));
        return { name: c.cls, subclass: sub, hitDie: c.hd, feats: c.feats.filter(f => f.bookSub).length,
          available: classList("2024").includes(x.name) && !classList("2014").includes(x.name) };
      });
      const dk = pcEnsure(generateCharacter({ seed: "DK", ed: "2024", cls: "Death Knight", subclass: "Oath of the Ebon Blade", level: 17 }));
      dk.choices = { Runeforging: ["Blood"] };
      syncGrantedSpells(dk);
      const blood = dk.prepared.some(x => x.n === "Bonestorm" && x.bookGrant);
      dk.choices.Runeforging = ["Frost"];
      syncGrantedSpells(dk);
      const frost = dk.prepared.some(x => x.n === "Chains of Ice") && !dk.prepared.some(x => x.n === "Bonestorm");
      const dh = pcEnsure(generateCharacter({ seed: "DH", ed: "2024", cls: "Demon Hunter", subclass: "Demon Hunter", level: 5 }));
      dh.choices = { "Demon Hunter specialization": ["Havoc"] };
      syncGrantedSpells(dh);
      const pool = pcSpellPool(dh, "2024");
      const eye = spellPlan(spellOf("2024", "Eye Beam"));
      castDialog(dk, "2024", "Rune Strike");
      castPick("freeRuneStrike");
      castGo();
      return { classes, blood, frost, frees: dk.used.freeRuneStrike, slots: dk.used.slot1 || 0,
        eye: [eye.dice, eye.save, eye.half, eye.manual],
        prepared: dh.prepared.map(x => x.n), demonHunterPool: pool.map(x => x.n),
        assigned: SP.data["2024"].filter(s => s.src === "wow").every(s => s.c.length > 0 && !s.rulesSummary) };
    });
    assert.equal(warcraft.classes.length, 8);
    assert.ok(warcraft.classes.every(row => row.available && row.hitDie >= 6 && row.feats > 0), JSON.stringify(warcraft.classes));
    assert.equal(warcraft.blood && warcraft.frost && warcraft.assigned, true);
    assert.equal(warcraft.frees, 1);
    assert.equal(warcraft.slots, 0);
    assert.deepEqual(warcraft.eye, ["", "", false, true]); // recurring cone; no unsafe automatic effect
    assert.ok(warcraft.prepared.includes("Eye Beam") && warcraft.demonHunterPool.includes("Eye Beam"));
    assert.match(await page.locator("#actModal").textContent(), /2d8 Necrotic/);
    await page.getByRole("button", { name: "Roll 2d8", exact: true }).click();
    assert.match(await page.locator("[data-spell-roll]").textContent(), /=/);
    await page.evaluate(() => actClose());
    await page.goto(`http://127.0.0.1:${server.address().port}/#roster`);
    await page.waitForSelector("#view-roster.active");
    await page.evaluate(() => {
      const c = pcEnsure(generateCharacter({ seed: "NEXT", ed: "2024", cls: "Fighter", level: 2 }));
      PCS.roster = [c];
      RC.id = c.id;
      renderRosterTab();
    });
    await page.locator("#rosterMain [data-lvup]").click();
    await page.locator('#lvModal [data-progression-option="Champion"]').click();
    await next.click();
    assert.equal(await page.evaluate(() => rosterCur().subclass), "Champion");
    assert.equal(await page.evaluate(() => rosterCur().level), 3);
    const granted = await page.evaluate(() => {
      const c = pcEnsure(generateCharacter({ seed: "GRANTS", ed: "2024", cls: "Druid", level: 1, race: "Gnome", sub: "Forest Gnome" }));
      c.prepared.push({ n: "Speak with Animals", ed: "2024", l: 1 });
      syncGrantedSpells(c);
      const speak = spellOf("2024", "Speak with Animals");
      const sources = spellPreparationSources(c, speak.n);
      const resource = freeSpellResources(c, speak, "2024", pcResources(c)).find(r => r.key.startsWith("speciesSpell:"));
      c.choices = { "Species Spellcasting": ["Charisma"] };
      const caster = spellCaster(c, speak, resource.key);
      const manualLimit = manualPreparedSpells(c).length;
      togglePrep(c, speak, "2024");
      const old = pcEnsure(generateCharacter({ seed: "GRANTS14", ed: "2014", cls: "Cleric", level: 1, subclass: "Life Domain" }));
      const sub = pcEnsure(generateCharacter({ seed: "GRANTSUB", ed: "2024", cls: "Cleric", level: 3, subclass: "Life Domain" }));
      const subclassGrant = spellPreparationSources(sub, "Bless")[0]?.name;
      pcLevelTo(sub, 2);
      pcEnsure(sub);

      PCS.roster = [c];
      RC.id = c.id;
      renderRosterTab();
      return { sources, uses: resource.max, ab: caster.ab, manualLimit, staysPrepared: isPrep(c, speak.n, "2024"),
        old: spellPreparationSources(old, "Cure Wounds")[0]?.name,
        subclassGrant, losesGrant: !isPrep(sub, "Bless", "2024") };
    });
    assert.deepEqual(granted.sources.map(s => s.kind), ["class", "species"]);
    assert.equal(granted.uses, 2);
    assert.equal(granted.ab, "cha");
    assert.equal(granted.manualLimit, 0);
    assert.equal(granted.staysPrepared, true);
    assert.equal(granted.old, "Life Domain");
    assert.equal(granted.subclassGrant, "Life Domain");
    assert.equal(granted.losesGrant, true);
    const speakChip = page.locator('#rcPrepared .prep-chip:has([data-spell="2024|Speak with Animals"])');
    assert.equal(await speakChip.count(), 1);
    assert.match(await speakChip.textContent(), /Always prepared.*Druidic.*Forest Gnome/s);
    assert.equal(await speakChip.locator("[data-unprep]").count(), 0);
    await speakChip.getByRole("button", { name: /^Speak with Animals/ }).click();
    assert.match(await page.locator("#actModal").textContent(), /Always prepared.*Forest Gnome/s);
    await page.locator('#actModal [data-castlv^="speciesSpell:"]').click();
    await page.locator("#actModal [data-castgo]").click();
    assert.equal(await page.evaluate(() => Object.entries(rosterCur().used).find(([key]) => key.startsWith("speciesSpell:"))?.[1]), 1);
    const example = await page.evaluate(() => {
      actClose();
      const legacy = pcEnsure(generateCharacter({ seed: "LEGACY", ed: "2014", cls: "Cleric", level: 3, subclass: "Light Domain", race: "Tiefling" }));
      const rebuke = spellOf("2014", "Hellish Rebuke");
      const use = castOpts(legacy, rebuke);
      const c = pcEnsure(generateCharacter({ seed: "LIGHT", ed: "2024", cls: "Cleric", level: 5, subclass: "Light Domain", race: "Tiefling", sub: "Infernal" }));
      PCS.roster = [c]; RC.id = c.id;
      renderRosterTab();
      c.inv.push({ id: "untrained-plate", n: "Plate Armor", qty: 1, eq: true });
      renderRosterTab();
      return {
        light: spellPreparationSources(legacy, "Burning Hands")[0]?.name,
        innate: spellPreparationSources(legacy, rebuke.n)[0]?.innate,
        innateOnly: use.length === 1 && use[0][0].startsWith("speciesSpell:2014:"),
        castLevel: castSlotLevel(legacy, rebuke, use[0][0]),
      };
    });
    assert.deepEqual(example, { light: "Light Domain", innate: true, innateOnly: true, castLevel: 2 });
    const spellChip = name => page.locator(`#rcPrepared .prep-chip:has([data-spell="2024|${name}"])`);
    for (const name of ["Burning Hands", "Faerie Fire", "Scorching Ray", "See Invisibility", "Daylight", "Fireball"]) {
      assert.match(await spellChip(name).textContent(), /Always prepared.*Subclass · Light Domain/s);
    }
    for (const name of ["Hellish Rebuke", "Darkness"]) {
      assert.match(await spellChip(name).textContent(), /Always prepared.*Species · Tiefling \(Infernal\)/s);
    }
    assert.match(await spellChip("Fire Bolt").textContent(), /Granted cantrip.*Tiefling/);
    const armorWarning = page.locator("#rcArmorCastingWarning");
    const rollMarks = page.locator('#rosterMain [data-roll] .dis[title*="armor you aren"]');
    assert.equal(await armorWarning.isVisible(), true);
    assert.ok(await rollMarks.count() > 0);
    await spellChip("Hellish Rebuke").getByRole("button").click();
    assert.match(await page.locator("#actModal.open").textContent(), /can't cast spells while wearing armor/);
    assert.equal(await page.locator("#actModal [data-castgo]").count(), 0);
    await page.locator("#actModal.open [data-actclose]").click();

    const quantity = page.locator('[data-iid="untrained-plate"][data-rinv="qty"]');
    const equip = page.locator('[data-iid="untrained-plate"][data-rinv="eq"]');
    await quantity.fill("0");
    assert.equal(await armorWarning.isVisible(), false);
    assert.equal(await rollMarks.count(), 0);
    await quantity.fill("1");
    assert.equal(await armorWarning.isVisible(), true);
    await equip.uncheck();
    assert.equal(await armorWarning.isVisible(), false);
    assert.equal(await rollMarks.count(), 0);
    await equip.check();
    await page.locator('[data-rdel="untrained-plate"]').click();
    assert.equal(await armorWarning.isVisible(), false);
    assert.equal(await rollMarks.count(), 0);

    await spellChip("Hellish Rebuke").getByRole("button").click();
    assert.match(await page.locator('#actModal [data-castlv^="speciesSpell:"]').textContent(), /Infernal.*1 left per long rest/s);
    assert.equal(await page.locator("#actModal [data-castgo]").isEnabled(), true);
    const expandedGrants = await page.evaluate(() => {
      actClose();
      const make = (ed, cls, subclass, level, race = "Human", sub = "", choices = {}) => {
        const c = pcEnsure(generateCharacter({ seed: "SPELL-AUDIT", ed, cls, subclass, level, race, sub }));
        c.choices = choices;
        syncGrantedSpells(c);
        return c;
      };
      const spellsFrom = (c, kind) => c.prepared.filter(p => p.sources?.some(s => s.kind === kind)).map(p => p.n);
      const land = make("2014", "Druid", "Circle of the Land", 5, "Elf", "Drow", { "Circle Spells": ["Forest"] });
      const drow = spellOf("2014", "Faerie Fire");
      const drowResource = freeSpellResources(land, drow, "2014", pcResources(land))[0];
      const grantBeforeSwap = spellsFrom(land, "subclass");
      land.choices["Circle Spells"] = ["Arctic"];
      syncGrantedSpells(land);
      const gnome = make("2014", "Fighter", "Champion", 1, "Gnome", "Forest Gnome");
      const highElf = make("2014", "Fighter", "", 1, "Elf", "High Elf", { "High Elf Cantrip": ["Mage Hand"] });
      const rimekin = make("2024", "Fighter", "", 5, "Rimekin");
      const draenei = make("2024", "Fighter", "", 5, "Draenei", "Lightforged");
      const reanimator = make("2024", "Artificer", "Reanimator", 5);
      const death = make("2014", "Cleric", "Death Domain", 5);
      const oathbreaker = make("2014", "Paladin", "Oathbreaker", 3);
      const ranger = make("2014", "Ranger", "Gloom Stalker", 5);
      const wizard = make("2024", "Wizard", "", 20, "Human", "", {
        "Spell Mastery (1st level)": ["Magic Missile"], "Spell Mastery (2nd level)": ["Misty Step"],
        "Signature Spells": ["Fireball", "Fly"],
      });
      const mastery = freeSpellResources(wizard, spellOf("2024", "Magic Missile"), "2024", pcResources(wizard))[0];
      const signature = freeSpellResources(wizard, spellOf("2024", "Fireball"), "2024", pcResources(wizard))[0];
      wizard.used = { [signature.key]: 1 };
      pcRest(wizard, "short");
      const legacy = spellOf("2014", "Grasping Vine");
      PCS.roster = [wizard]; RC.id = wizard.id;
      renderRosterTab();
      return {
        grantBeforeSwap, grantAfterSwap: spellsFrom(land, "subclass"), drowUses: drowResource.max,
        drowAbility: spellCaster(land, drow, drowResource.key).ab,
        gnome: spellsFrom(gnome, "species"), highElf: spellsFrom(highElf, "species"),
        rimekin: spellsFrom(rimekin, "species"), draenei: spellsFrom(draenei, "species"),
        reanimator: spellsFrom(reanimator, "subclass"), artificer: spellsFrom(reanimator, "class"),
        death: spellsFrom(death, "subclass"), oathbreaker: spellsFrom(oathbreaker, "subclass"),
        ranger: spellPreparationSources(ranger, "Rope Trick")[0]?.known,
        mastery: mastery.max === Infinity, signature: resLeft(wizard, signature),
        invalidMastery: isPrep(wizard, "Misty Step", "2024"), legacy: [legacy.src, legacy.sv]
      };
    });
    assert.deepEqual(expandedGrants.grantBeforeSwap, ["Barkskin", "Spider Climb", "Call Lightning", "Plant Growth"]);
    assert.deepEqual(expandedGrants.grantAfterSwap, ["Hold Person", "Spike Growth", "Sleet Storm", "Slow"]);
    assert.equal(expandedGrants.drowUses, 1);
    assert.equal(expandedGrants.drowAbility, "cha");
    assert.deepEqual(expandedGrants.gnome, ["Minor Illusion"]);
    assert.deepEqual(expandedGrants.highElf, ["Mage Hand"]);
    assert.deepEqual(expandedGrants.rimekin, ["Ray of Frost", "Ice Knife", "Flame Blade"]);
    assert.deepEqual(expandedGrants.draenei, ["Sacred Flame", "Guiding Bolt", "Aid"]);
    assert.ok(expandedGrants.reanimator.includes("Enhance Ability"));
    assert.deepEqual(expandedGrants.artificer, ["Mending"]);
    assert.ok(expandedGrants.death.includes("Vampiric Touch"));
    assert.deepEqual(expandedGrants.oathbreaker, ["Hellish Rebuke", "Inflict Wounds"]);
    assert.equal(expandedGrants.ranger, true);
    assert.equal(expandedGrants.mastery, true);
    assert.equal(expandedGrants.signature, 1);
    assert.equal(expandedGrants.invalidMastery, false);
    assert.deepEqual(expandedGrants.legacy, ["phb-2014", "DEX"]);
    await page.locator('[data-choice="Spell Mastery (2nd level)"]').selectOption("Scorching Ray");
    assert.match(await spellChip("Scorching Ray").textContent(), /Always prepared.*Spell Mastery/s);
    assert.deepEqual(errors, []);
    console.log("PASS edition-aware progression, expansion subclass choices, item stats and attunement");
  } finally {
    await browser?.close();
    server.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
