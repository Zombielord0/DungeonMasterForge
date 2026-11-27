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
      pcRest(c,"short");pcRest(c,"long");const rested=c.used.artificerStored;
      artificerStore(c,"Cure Wounds");const reset=c.used.artificerStored;c.inv=[];const removed=!pcResources(c).some(r=>r.key==="artificerStored");
      const old=make("2014",11),oldOptions=artificerStoreOptions(old).map(x=>x[0]);
      return {candidates,created,max,int:c.mods.int,cast,after,rested,reset,removed,oldOptions,below:artificerStoreOptions(make("2024",10)).length,
        rules:[artificerStoreSpellEligible("2014",11,{l:2,c:["Artificer"],t:"1 action",m:"which the spell consumes"}),artificerStoreSpellEligible("2024",11,{l:3,c:["Artificer"],t:"Action",m:"which the spell consumes"}),artificerStoreSpellEligible("2024",11,{l:3,c:["Artificer"],t:"Action"}),artificerStoreSpellEligible("2014",11,{l:3,c:["Artificer"],t:"Action"})]};
    });
    assert.ok(storedItemAudit.candidates.includes("Cure Wounds")&&storedItemAudit.oldOptions.includes("Cure Wounds"));
    assert.ok(storedItemAudit.created.startsWith("Stored")&&storedItemAudit.cast.includes("Cure Wounds"));
    assert.equal(storedItemAudit.max,Math.max(2,2*storedItemAudit.int));assert.deepEqual([storedItemAudit.after,storedItemAudit.rested,storedItemAudit.reset,storedItemAudit.removed,storedItemAudit.below],[1,1,0,true,0]);
    assert.deepEqual(storedItemAudit.rules,[true,false,true,false]);
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
