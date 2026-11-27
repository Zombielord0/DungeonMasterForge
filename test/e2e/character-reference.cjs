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
    assert.deepEqual(remainingCoreAudit.druid,["Recovered one Wild Shape use.",1,2,"Recovered one level 1 slot.",1]);
    assert.deepEqual(remainingCoreAudit.incarnate,[2,true]);
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
