/* 13a-gear-ac-speed.js: My Characters: inventory and equipped weapons (pcAttacks), fighting styles and armor training, armor class (pcAC) and speed (pcSpeed). */

/* ======================= My Characters (saved characters, editable) ======================= */
const RC = { id: null };
/* the selected character: a saved one, or the newly forged draft (currentPC, not saved yet) */
const pcIsDraft = c => !!c && c === currentPC && !PCS.roster.some(x => x.id === c.id);
/* the character last opened in this browser tab, so a refresh comes back to it (sessionStorage: per tab, gone when it closes) */
const RC_LAST = "dmforge.rcLast";
function rcRemember(id) { try { sessionStorage.setItem(RC_LAST, id); } catch { } }
function rosterCur() {
  if (currentPC && RC.id === currentPC.id) return currentPC;
  let last = null; try { last = sessionStorage.getItem(RC_LAST); } catch { }
  return PCS.roster.find(c => c.id === RC.id) || (last && PCS.roster.find(c => c.id === last)) || PCS.roster[0] || currentPC || null;
}
function applyCoreSkillChoices(c){
  // Remove only proficiency/expertise that this feature itself supplied.
  for(const s of c.skills||[]){
    if(s.scholarGranted){s.x=false;delete s.scholarGranted;}
    if(s.primalGranted){s.p=false;s.x=false;delete s.primalGranted;}
    if(s.loreGranted){s.p=false;s.x=false;delete s.loreGranted;}
    if(s.orderGranted){s.p=false;s.x=false;delete s.orderGranted;}
    if(s.envoyExpert){s.x=false;delete s.envoyExpert;}
    if(s.envoyGranted){s.p=false;s.x=false;delete s.envoyGranted;}
    if(s.peaceGranted){s.p=false;s.x=false;delete s.peaceGranted;}
    if(s.glamourGranted){s.p=false;s.x=false;delete s.glamourGranted;}
    if(s.archerGranted){s.p=false;s.x=false;delete s.archerGranted;}
  }
  if(characterSubclassLevel(c,"Bard","College of Lore")>=3){const options=new Set(CHOICES["Lore Bonus Proficiencies"].opts(c).map(x=>x[0]));for(const name of [...new Set(choiceOf(c,"Lore Bonus Proficiencies"))].filter(n=>options.has(n)).slice(0,3)){const s=c.skills.find(x=>x.s===name);if(s&&!s.p){s.p=true;s.loreGranted=true;}}}
  const skills=c.skills||[],choose=(name,flag)=>{const s=skills.find(x=>x.s===name);if(s&&!s.p){s.p=true;s[flag]=true;}};
  if(characterSubclassLevel(c,"Cleric","Order Domain")){
    const selection=choiceOf(c,"Order Bonus Proficiency")[0]||choiceOf(c,"Bonus Proficiencies")[0];
    if(["Intimidation","Persuasion"].includes(selection))choose(selection,"orderGranted");
  }
  if(characterSubclassLevel(c,"Fighter","Purple Dragon Knight (Banneret)")>=7){
    const p=skills.find(s=>s.s==="Persuasion");
    if(p){
      if(!p.p){p.p=true;p.envoyGranted=true;}
      else{const selected=choiceOf(c,"Royal Envoy")[0];if(["Animal Handling","Insight","Intimidation","Performance"].includes(selected))choose(selected,"envoyGranted");}
      if(!p.x){p.x=true;p.envoyExpert=true;}
    }
  }
  for(const [key,flag] of [["Implement of Peace","peaceGranted"],["Otherworldly Glamour","glamourGranted"],["Arcane Archer Skill","archerGranted"]]){
    const rule=CHOICES[key],selected=choiceOf(c,key)[0];
    if(rule.n(c)>0&&rule.opts(c).some(([id])=>id===selected))choose(selected,flag);
  }
  if(edOf(c)!=="2024")return;
  const apply=(key,flag,attr,cls,level,eligible)=>{
    if((cls==="Wizard"?classFeatureLevel(c,cls):clsLv(c,cls))<level)return;
    const selected=choiceOf(c,key)[0],s=(c.skills||[]).find(x=>x.s===selected&&eligible(x));
    if(s){s[attr]=true;s[flag]=true;}
  };
  apply("Primal Knowledge","primalGranted","p","Barbarian",3,s=>!s.p&&CLASS_DATA.Barbarian.skills[0].includes(s.s));
  apply("Scholar","scholarGranted","x","Wizard",2,s=>s.p&&!s.x&&["Arcana","History","Investigation","Medicine","Nature","Religion"].includes(s.s));
}
function pcRecompute(c) {
  artificerInfusionCleanup(c);
  wizardSubclassCleanup(c);
  const m = {}; AB.forEach(a => m[a] = mod(+c.scores[a] || 10)); c.mods = m; const SB = subBonusOf(c);
  c.init = m.dex + (c.initBonus ?? ((c.feats || []).some(f => f.f === "Feat: Alert") ? (edOf(c) === "2024" ? c.prof : 5) : 0)) + SB.init + (SB.athlete ? Math.ceil(c.prof / 2) : 0) + (clsLv(c,"Bard") >= 2 && edOf(c) === "2014" ? Math.floor(c.prof / 2) : 0);
  const jack = clsLv(c,"Bard")>=2;
  applyCoreSkillChoices(c);
  c.skills.forEach(s => s.v = m[s.ab] + (s.x ? c.prof * 2 : s.p ? c.prof : jack ? Math.floor(c.prof / 2) : 0) + athleteBonus(SB, s, c.prof) + orderCheckBonus(c,s.s) + (s.ab==="cha"&&characterSubclassLevel(c,"Ranger","Fey Wanderer")>=3?Math.max(1,m.wis):0));
  const per = c.skills.find(s => s.s === "Perception"); c.passive = 10 + (per ? per.v : m.wis);
  const C = CLASS_DATA[c.cls];
  if (c.kitMoved) c.attacks = pcAttacks(c);
  else if (C) {
    const w = C.wpn, wm = c.cls === "Monk" ? Math.max(m.str, m.dex) : m[w[2]];
    const ab = c.atkBonus || 0;
    c.attacks = (c.attacks || []).map(a => a.name === w[0] ? { ...a, hit: wm + c.prof + ab, dmg: `${w[1]}${wm ? sgn(wm) : ""}` } : a.name === "Unarmed strike" ? { ...a, hit: wm + c.prof + ab, dmg: ((String(a.dmg).match(/^\d+d\d+/) || ["1d4"])[0]) + sgn(wm) } : a);
  }
  if(!c.kitMoved){
    c.attacks=(c.attacks||[]).filter(a=>!["Psychic Blade","Psychic Blade (bonus action)"].includes(a.name));
    if(characterSubclassLevel(c,"Rogue","Soulknife")>=3){
      const bm=Math.max(m.str,m.dex),ab=m.dex>m.str?"dex":"str";
      for(const [name,die] of [["Psychic Blade","1d6"],["Psychic Blade (bonus action)","1d4"]])c.attacks.push({name,hit:bm+c.prof,die,mod:bm,dmg:die+sgn(bm),type:"psychic",prof:true,melee:true,ab,alt:"thrown 60 ft"+(edOf(c)==="2024"?"; Vex":"")});
    }
  }
  if (c.spell) { const b = c.spell.bonus || 0; for (const s of [c.spell,...(c.spell.others || [])]) { if (!AB.includes(s.ab)) continue; s.dc = 8 + c.prof + m[s.ab] + b; s.atk = c.prof + m[s.ab] + b + artificerFocusAttackBonus(c); } }
  pcACApply(c);
}
function pcLevelTo(c, lv) {
  const n = generateCharacter({ seed: c.seed || c.id, name: c.name, race: c.race, ed: edOf(c), sub: c.sub || (c.race === "Dragonborn" && c.ancestry) || "none", ancestry: c.ancestry || undefined, cls: c.cls, bg: c.bg, level: lv, subclass: c.subclass || "none", asiPicks: c.asiPicks || undefined, bonusFeats: c.bonusFeats || undefined, bgAsiLegacy: c.bgAsiLegacy || undefined, ...pcKeep(c), method: c.method || "array", bonus: c.bonus || "flex", custom: c.customData || undefined });
  ["level", "base", "scores", "mods", "rolls", "prof", "saves", "skills", "hp", "ac", "acSrc", "speed", "init", "passive", "attacks", "spell", "feats", "extras", "hd", "traits", "initBonus", "atkBonus", "hbSig", "res", "imm", "vul", "cimm", "sadv", "subHp", "subSpd", "subSaveGrants", "hbAc", "hbSpeed", "skilled", "expertOrder", "speciesSkill", "totalLevel", "mcSkills", "hdList"].forEach(k => c[k] = n[k]);
  c.hpCur = n.hp;
  if (Array.isArray(c.prepared)) syncGrantedSpells(c);
  if (c.kitMoved) { c.attacks = pcAttacks(c); pcACApply(c); }
}
/* ---- equipment: the starting kit lives in the inventory; equipped weapons make the attack list ---- */
const EQ_COUNT = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, ten: 10, twenty: 20 };
const eqKey = t => String(t || "").toLowerCase().replaceAll("’","'").replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
const eqSing = w => w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w; // "handaxes" -> "handaxe"
const eqSing2 = w => /(ch|sh|x)es$/.test(w) ? w.slice(0, -2) : eqSing(w);         // "torches" -> "torch"
// standard gear of an edition, found by name in any word order and singular or plural ("Two handaxes", "Crossbow, light")
function eqGear(ed, name) {
  itLoad();
  const L = IT.data[ed === "2014" ? "2014" : "2024"].filter(x => x.kind === "gear"), k = eqKey(name), ks = eqKey(k.split(" ").map(eqSing).join(" "));
  const alias = { "shield wooden": "shield", "bolt": "bolt crossbow", "knive small":"knife small", "knife small":"knife small" };
  const ks2 = eqKey(k.split(" ").map(eqSing2).join(" "));
  // Equivalent gear only. Never silently choose an arbitrary focus or equate a unique trinket.
  const equivalent = {"pen":["Ink pen"],"costume":["Costume","Clothes, costume"],"clothes common dark":["Common Clothes","Clothes, common"],"hooded iron lantern wrought":["Lantern, hooded"]};
  return L.find(x => eqKey(x.n) === k) || (equivalent[k]||[]).map(n=>L.find(x=>eqKey(x.n)===eqKey(n))).find(Boolean) || L.find(x => eqKey(x.n) === ks) || L.find(x => eqKey(x.n) === ks2) || L.find(x => eqKey(x.n.split(/\s+/).map(eqSing).join(" ")) === ks)
    || (alias[ks] ? L.find(x => [alias[ks], eqSing(alias[ks])].includes(eqKey(x.n.split(/\s+/).map(eqSing).join(" ")))) : null) || null;
}
const eqIsWeapon = x => !!(x && x.kind === "gear" && (x.st || []).some(([k]) => k === "Damage"));
const eqIsArmor = x => !!(x && x.kind === "gear" && /Armor$|^Shield$/.test(x.cat));
// "Longbow + 20 arrows" -> [{n:"Longbow",qty:1},{n:"Arrows",qty:20}]; "Two daggers" -> Dagger ×2
function eqParseKit(line, ed) {
  return String(line).split(/\s+\+\s+/).map(part => {
    let t = part.trim(), qty = 1;
    const m = t.match(/^(\d+|a|an|one|two|three|four|five|six|ten|twenty)\s+(.+)$/i);
    if (m) { qty = /^\d+$/.test(m[1]) ? +m[1] : EQ_COUNT[m[1].toLowerCase()]; t = m[2]; }
    const g = eqGear(ed, t);
    return { n: g ? g.n : t.charAt(0).toUpperCase() + t.slice(1), qty: !m&&g?.packQty?g.packQty:qty, g };
  });
}
// move an older character's starting-equipment list into its inventory, once
function pcInvUpgrade(c) {
  c.inv = c.inv || [];
  if (c.kitMoved) return false;
  const ed = edOf(c);
  (c.kit || []).forEach(line => eqParseKit(line, ed).forEach(({ n, qty, g }) => {
    const ex = c.inv.find(i => !i.artificerOrigin&&i.n.toLowerCase() === n.toLowerCase()&&(!g?.packQty||i.ammunitionUnits===true));
    if (ex) { ex.qty = (+ex.qty || 0) + qty; return; }
    c.inv.push({ id: uid("i"), ref: g ? g.id : undefined, n, qty, w: g ? (g.w || 0)/(g.packQty||1) : 0, ...(g?.packQty?{ammunitionUnits:true}:{}), att: false, attuned: false, value: g ? g.c+(g.packQty?" per "+g.packQty:"") : undefined, note: "", eq: eqIsWeapon(g) || eqIsArmor(g) });
  }));
  c.kit = []; c.kitMoved = true;
  if (+c.startGold && !c.goldAdded) { c.coins = c.coins || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }; c.coins.gp = (+c.coins.gp || 0) + +c.startGold; c.goldAdded = true; }
  return true;
}
// which standard weapon an inventory item is: its Items-tab entry, else a weapon named in its name, notes or magic type
function eqWeaponOf(i, ed) {
  itLoad();
  const ref = inventoryCatalogItem(i, ed);
  const W = IT.data[ed === "2014" ? "2014" : "2024"].filter(eqIsWeapon);
  const forms = x => { const n = x.n.toLowerCase(), m = n.match(/^(.+), (.+)$/); return m ? [n, `${m[2]} ${m[1]}`] : [n]; };
  const hits = t => { t = String(t || "").toLowerCase(); return W.filter(x => forms(x).some(f => new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(t))); };
  const best = L => L.sort((a, b) => b.n.length - a.n.length)[0];
  const chosen = i.baseWeapon && inventoryWeaponChoices(ref, ed).find(x => x.n === i.baseWeapon);
  if (chosen) return chosen;
  { const L = hits(i.n); if (L.length) return best(L); }
  if (eqIsWeapon(ref)) return ref;
  { const L = hits(i.note); if (L.length) return best(L); }
  if (ref && ref.type) { const L = hits(ref.type); if (L.length === 1) return L[0]; }
  return null;
}
/* subclasses that give martial weapon proficiency (2014 Tempest and War Domains, the College of Valor) (owner's Tempest cleric, 2026-11-26) */
const SUB_MARTIAL = [["Tempest Domain", 1], ["War Domain", 1], ["College of Valor", 3]];
function eqProficient(c, w) {
  if (/^Simple/.test(w.cat) || w.cat === "Arcane Foci") return true;
  if(/Martial/.test(w.cat)&&(revisedOrder(c,"Cleric")==="Protector"||revisedOrder(c,"Druid")==="Warden"))return true;
  if(/Martial/.test(w.cat)&&battleSmithLevel(c)>=3)return true;
  if (/Martial/.test(w.cat) && [{ cls: c.cls, lv: c.level, subclass: c.subclass }, ...(c.multi || [])].some(x => x && SUB_MARTIAL.some(([s, lv]) => s === x.subclass && (+x.lv || 0) >= lv))) return true;
  const props = ((w.st.find(([k]) => k === "Properties") || [])[1] || "");
  if (["Barbarian", "Fighter", "Paladin", "Ranger"].includes(baseClassOf(c.cls)) || (c.multi || []).some(x => MC_MARTIAL.includes(baseClassOf(x.cls)))) return true;
  if (w.n === "Shortsword" && (c.multi || []).some(x => x.cls === "Monk")) return true;
  if (edOf(c)==="2024"&&c.cls==="Rogue")return /Martial/.test(w.cat)&&/Finesse|Light/.test(props);
  if (edOf(c)==="2024"&&c.cls==="Bard")return false;
  if (["Rogue", "Bard"].includes(c.cls)) return /Finesse|Light/.test(props) || /^(Longsword|Crossbow, hand|Hand Crossbow)$/.test(w.n);
  if (c.cls === "Druid") return w.n === "Scimitar";
  if (c.cls === "Monk") return w.n === "Shortsword" || (/Melee/.test(w.cat) && /Light/.test(props));
  return false;
}
function eqAttack(c, i, w) {
  const st = k => ((w.st.find(([x]) => x === k) || [])[1] || ""), dmgTxt = st("Damage"), props = st("Properties");
  const dm = dmgTxt.match(/^(\d+(?:d\d+)?)\s+([a-z]+)/); if (!dm) return null;
  const m = c.mods, ranged = /Ranged/.test(w.cat), monk = c.cls === "Monk" && (/Simple Melee/.test(w.cat) || w.n === "Shortsword" || (/Melee/.test(w.cat) && /Light/.test(props) && edOf(c) === "2024"));
  const pact=isPactWeapon(c,i,w),normalAb=/Finesse/.test(props)||monk?(m.dex>m.str?"dex":"str"):ranged?"dex":"str";
  const ref = inventoryCatalogItem(i, edOf(c));
  const battleReady=battleSmithLevel(c)>=3&&choiceOf(c,"Battle Ready Ability")[0]==="Intelligence"&&!itemRulesIncomplete(ref)&&(ref?.kind==="magic"||artificerInfusions(c).includes(i));
  const ab=pact&&edOf(c)==="2024"&&choiceOf(c,"Pact Weapon Ability")[0]==="Charisma"?"cha":battleReady?"int":normalAb;
  const infusion=artificerInfusionBonus(c,i,"weapon"), magic = inventoryEnhancement(i, ref, "weapon")+infusion, needsAtt = inventoryNeedsAttunement(i, ref) && !i.attuned, bonus = needsAtt ? 0 : magic;
  const prof = pact||eqProficient(c, w), mod = m[ab] + bonus, hit = m[ab] + (prof ? c.prof : 0) + bonus;
  const two = (dmgTxt.match(/two-handed (\d+d\d+)/) || [])[1];
  const chosenType=choiceOf(c,"Pact Weapon Damage")[0],type=pact&&edOf(c)==="2024"&&["Necrotic","Psychic","Radiant"].includes(chosenType)?chosenType.toLowerCase():dm[2];
  return { name: i.n, iid: i.id, hit, type, pact, two, ab, prof, magic, needsAtt, mastery:activeMastery(c,w), melee: !ranged, twoH: /Two-Handed/.test(props), thrown: /Thrown/.test(props), mod, die: dm[1] };
}
/* ---- fighting styles, armor training, protective items and spell effects ---- */
const FIGHT_STYLES = {
  Archery: "+2 to attack rolls with ranged weapons (applied to your attacks).",
  "Blind Fighting": "Blindsight 10 ft.",
  Defense: "+1 AC while wearing armor (applied to your AC).",
  Dueling: "+2 damage with a melee weapon in one hand and no other weapon (applied when one one-handed melee weapon is equipped).",
  "Great Weapon Fighting": "Two-handed or versatile melee weapons held in two hands: reroll 1s and 2s on damage dice (2024: treat them as 3s).",
  Interception: "Reaction: reduce damage to an ally within 5 ft by 1d10 + proficiency bonus, while holding a shield or weapon.",
  Protection: "Reaction: impose disadvantage on an attack against an ally within 5 ft, while holding a shield.",
  "Thrown Weapon Fighting": "Draw a thrown weapon as part of the attack, and +2 damage when you hit with a ranged attack using a thrown weapon (shown as the thrown damage on those attacks).",
  "Two-Weapon Fighting": "Add your ability modifier to the damage of your off-hand attack.",
  "Unarmed Fighting": "Unarmed strikes deal 1d6 + STR (1d8 with both hands free), and 1d4 to a creature you grapple at the start of your turn."
};
function fightStyleOptions(c) {
  if (edOf(c) === "2024") return Object.keys(FIGHT_STYLES);
  return { Fighter: ["Archery", "Defense", "Dueling", "Great Weapon Fighting", "Protection", "Two-Weapon Fighting"], Paladin: ["Defense", "Dueling", "Great Weapon Fighting", "Protection"], Ranger: ["Archery", "Defense", "Dueling", "Two-Weapon Fighting"] }[c.cls] || ["Archery", "Defense", "Dueling", "Great Weapon Fighting", "Protection", "Two-Weapon Fighting"];
}
const fightSlots = c => ((c.feats || []).some(f => f.f === "Fighting Style") ? 1 : 0) + ((c.feats || []).some(f => f.f === "Additional Fighting Style") ? 1 : 0);
const hasStyle = (c, n) => (c.fightStyles || []).slice(0, fightSlots(c)).includes(n);
// armor the character is trained in: class, subclass, species and feats
function armorTraining(c) {
  const ed = edOf(c), T = new Set(({ Barbarian: "light medium shield", Bard: "light", Cleric: "light medium shield", Druid: ed === "2024" ? "light shield" : "light medium shield", Fighter: "light medium heavy shield", Monk: "", Paladin: "light medium heavy shield", Ranger: "light medium shield", Rogue: "light", Sorcerer: "", Warlock: "light", Wizard: "" }[baseClassOf(c.cls)] || (CLASS_DATA[c.cls] && CLASS_DATA[c.cls].armorT) || "").split(" ").filter(Boolean));
  const sub = c.subclass || "", f = n => (c.feats || []).some(x => x.f.replace(/ \(.*$/, "") === "Feat: " + n);
  if (ed === "2014" && ["Life Domain", "Nature Domain", "Tempest Domain", "War Domain"].includes(sub) && c.level >= 1) T.add("heavy");
  if (sub === "College of Valor" && c.level >= 3) { T.add("medium"); T.add("shield"); }
  if ((c.traits || []).includes("Dwarven Armor Training")) { T.add("light"); T.add("medium"); }
  (c.multi || []).forEach(x => (MC_ARMOR[baseClassOf(x.cls)] || "").split(" ").filter(Boolean).forEach(k => T.add(k)));
  if(revisedOrder(c,"Cleric")==="Protector")T.add("heavy");
  if(revisedOrder(c,"Druid")==="Warden")T.add("medium");
  if (f("Lightly Armored")) T.add("light");
  if (f("Moderately Armored")) { T.add("light"); T.add("medium"); T.add("shield"); }
  if (f("Heavily Armored")) { T.add("light"); T.add("medium"); T.add("heavy"); }
  return T;
}
const armorKind = a => a.cat === "Shield" ? "shield" : a.cat.split(" ")[0].toLowerCase();
// protective magic items, counted once equipped (and attuned where needed)
const PROT_ITEMS = [["ring of protection", 1, 1, false], ["cloak of protection", 1, 1, false], ["ioun stone of protection", 1, 0, false], ["ioun stone (protection)", 1, 0, false], ["bracers of defense", 2, 0, true]];
function protItems(c, armored) {
  const out = [];
  (c.inv || []).filter(i => i.eq && (+i.qty || 0) > 0).forEach(i => {
    if(itemRulesIncomplete(inventoryCatalogItem(i,edOf(c))))return;
    const t = i.n.toLowerCase(), P = PROT_ITEMS.find(([k]) => t.includes(k)); if (!P) return;
    const [, ac, save, noArmor] = P, needs = /ioun|ring|cloak|bracers/.test(t) && !i.attuned;
    out.push({ i, ac: needs || (noArmor && armored) ? 0 : ac, save: needs ? 0 : save, why: needs ? "attune to use" : noArmor && armored ? "only without armor or shield" : "" });
  });
  return out;
}
const itemSaveBonus = c => protItems(c, false).reduce((s, p) => s + p.save, 0);
/* ---- armor class from equipped armor and shields ---- */
const ARMOR_MAGIC = { "dwarven plate": 2, "dragon scale mail": 1, "elven chain": 1 };
// the standard armor (or shield) an inventory item is: its Items-tab entry, else armor named in its name, notes or magic type
function eqArmorOf(i, ed) {
  itLoad();
  const ref = inventoryCatalogItem(i, ed);
  const choices = inventoryArmorChoices(ref, ed);
  const L = choices.length ? choices : IT.data[ed].filter(eqIsArmor);
  const forms = x => { const n = x.n.toLowerCase(); return [n, n.replace(/ armor$/, "")]; };
  const hits = t => { t = String(t || "").toLowerCase(); return L.filter(x => forms(x).some(f => new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t))); };
  const chosen = choices.find(x => x.n === i.baseArmor);
  if (chosen) return chosen;
  const best = H => H.sort((a, b) => b.n.length - a.n.length)[0];
  { const H = hits(i.n); if (H.length) return best(H); }
  if (eqIsArmor(ref)) return ref;
  { const H = hits(i.note); if (H.length) return best(H); }
  if (choices.length) return choices.length === 1 ? choices[0] : null;
  if (ref && ref.type) { const H = hits(ref.type.replace(/^armor\s*/i, "")); if (H.length) return best(H); }
  return null;
}
function eqArmorBonus(i, ed) {
  const ref = inventoryCatalogItem(i, ed);
  if (itemRulesIncomplete(ref) || (inventoryNeedsAttunement(i, ref) && !i.attuned)) return 0;
  const t = (i.n + " " + (i.note || "")).toLowerCase(), named = inventoryEnhancement(i, ref, "armor");
  return named || Object.entries(ARMOR_MAGIC).reduce((v, [k, b]) => t.includes(k) ? b : v, 0);
}
function pcAC(c) {
  const ed = edOf(c), m = c.mods, eq = (c.inv || []).filter(i => i.eq && (+i.qty || 0) > 0);
  const worn = eq.map(i => ({ i, a: eqArmorOf(i, ed) })).filter(x => x.a);
  const val = x => { const t = (x.a.st.find(([k]) => k === "Armor Class") || [])[1] || "", mm = t.match(/^\+?(\d+)(\s*\+\s*Dex modifier)?(\s*\(max 2\))?/); if (!mm) return 0; return +mm[1] + (mm[2] ? (mm[3] ? Math.min(m.dex, 2) : m.dex) : 0) + eqArmorBonus(x.i, ed) + artificerInfusionBonus(c,x.i,"armor"); };
  const body = worn.filter(x => x.a.cat !== "Shield").sort((a, b) => val(b) - val(a))[0], shield = worn.filter(x => x.a.cat === "Shield").sort((a, b) => val(b) - val(a))[0];
  const parts = [], warn = [], fx = c.fx || {}, T = armorTraining(c), F = pcFx(c);
  let ac, speedPen = 0, stealthDis = false, untrained = false;
  if (body) {
    ac = val(body); parts.push(`${body.i.n} ${ac}`);
    if (!T.has(armorKind(body.a))) { untrained = true; warn.push(`not trained in ${armorKind(body.a)} armor: disadvantage on STR and DEX checks, saves and attacks, and no spellcasting`); }
    const req = +((body.a.st.find(([k]) => k === "Strength") || [])[1] || 0);
    if (req && (+c.scores.str || 0) < req && c.race !== "Dwarf") { speedPen = 10; warn.push(`STR ${c.scores.str} is below ${body.a.n}'s ${req}: speed −10 ft`); }
    if ((body.a.st.find(([k]) => k === "Stealth") || [])[1] === "Disadvantage") stealthDis = true;
    if (hasStyle(c, "Defense")) { ac += 1; parts.push("Defense +1"); }
  }
  else {
    const opts = [[10 + m.dex, "No armor (10 + DEX)"]];
    if (fx.mageArmor) opts.push([13 + m.dex, "Mage Armor (13 + DEX)"]);
    if (characterSubclassLevel(c,"Bard","College of Dance")>=3 && !shield) opts.push([10 + m.dex + m.cha, "Dazzling Footwork (10 + DEX + CHA)"]);
    F.acUnarm.forEach(o => opts.push(o));
    // 2014 multiclassing retains only the first acquired Unarmored Defense.
    // Revised AC calculations remain alternatives, never cumulative.
    const defenseClasses=[c.cls,...(c.multi||[]).map(x=>x.cls)].map(baseClassOf).filter(k=>k==="Barbarian"||k==="Monk");
    const allowed=ed==="2014"?defenseClasses.slice(0,1):defenseClasses;
    if (allowed.includes("Barbarian")) opts.push([10 + m.dex + m.con, "Unarmored Defense (10 + DEX + CON)"]);
    if (allowed.includes("Monk") && !shield) opts.push([10 + m.dex + m.wis, "Unarmored Defense (10 + DEX + WIS)"]);
    const B = subBonusOf(c); if (B.ac) opts.push(B.ac);
    const best = opts.sort((a, b) => b[0] - a[0])[0]; ac = best[0]; parts.push(`${best[1]} ${best[0]}`);
  }
  if (shield) {
    const sv = val(shield); ac += sv; parts.push(`${shield.i.n} +${sv}`);
    if (!T.has("shield")) { untrained = true; warn.push("not trained with shields: disadvantage on STR and DEX checks, saves and attacks, and no spellcasting"); }
  }
  protItems(c, !!(body || shield)).forEach(p => { if (p.ac) { ac += p.ac; parts.push(`${p.i.n} +${p.ac}`); } else if (p.why) warn.push(`${p.i.n}: ${p.why}`); });
  if (+c.hbAc) { ac += +c.hbAc; parts.push(`homebrew ${sgn(+c.hbAc)}`); }
  if (+c.acBonus) { ac += +c.acBonus; parts.push(`Other ${sgn(+c.acBonus)}`); } /* the player's own extra AC (Other AC bonus on the sheet; imported from a file's misc AC) */
  if (fx.shieldOfFaith) { ac += 2; parts.push("Shield of Faith +2"); }
  if (fx.shield) { ac += 5; parts.push("Shield spell +5"); }
  if (fx.haste) { ac += 2; parts.push("Haste +2"); }
  F.ac.forEach(([v, l]) => { ac += v; parts.push(`${l} +${v}`); });
  if (fx.barkskin) { const min = ed === "2024" ? 17 : 16; if (ac < min) { parts.length = 0; parts.push(`Barkskin (at least ${min})`); ac = min; } }
  if (F.acMin && ac < F.acMin[0]) { parts.length = 0; parts.push(`${F.acMin[1]} (at least ${F.acMin[0]})`); ac = F.acMin[0]; }
  if (F.form) {
    ac = F.form.ac; parts.length = 0; parts.push(`${F.form.name} ${F.form.ac}${F.form.acNote ? ` (${F.form.acNote})` : ""}`); warn.length = 0; untrained = false; speedPen = 0; stealthDis = false;
    if (fx.shieldOfFaith) { ac += 2; parts.push("Shield of Faith +2"); } if (fx.shield) { ac += 5; parts.push("Shield spell +5"); } if (fx.haste) { ac += 2; parts.push("Haste +2"); }
  }
  return { ac, src: parts.join(" + "), warn: [...new Set(warn)], speedPen, stealthDis, untrained, bodyKind: body ? armorKind(body.a) : "", shieldOn: !!shield };
}
/* ---- movement speed: species base, class and subclass features, feats, armor and spells ---- */
const featTaken = (c, n) => (c.feats || []).some(x => x.f.replace(/ \(.*$/, "") === "Feat: " + n);
const unarmoredMove = lv => lv >= 18 ? 30 : lv >= 14 ? 25 : lv >= 10 ? 20 : lv >= 6 ? 15 : lv >= 2 ? 10 : 0;
/* carrying: items × quantity, plus coins (50 to the pound); capacity STR × 15, doubled for Powerful Build */
function pcLoad(c) {
  const items = (c.inv || []).reduce((t, i) => t + (+i.w || 0) * (+i.qty || 0), 0), coins = Object.values(c.coins || {}).reduce((t, n) => t + (+n || 0), 0) / 50;
  const str = +c.scores.str || 10, big = (c.traits || []).includes("Powerful Build") ? 2 : 1;
  return { lb: Math.round((items + coins) * 10) / 10, cap: str * 15 * big, enc: str * 5 * big, heavy: str * 10 * big, variant: !!c.varEnc && edOf(c) === "2014" };
}
function pcSpeed(c, A) {
  A = A || pcAC(c);
  const ed = edOf(c), lv = c.level, fx = c.fx || {}, has = n => (c.feats || []).some(f => f.f === n);
  const freeAction = (c.inv || []).some(i => {
    if (!i.eq || +i.qty <= 0 || !i.attuned) return false;
    const ref=inventoryCatalogItem(i,ed);
    return !itemRulesIncomplete(ref) && /^ring of free action$/i.test(ref?.n || i.n);
  });
  const R = raceInfo(ed, c.race, c.sub), base = R.speed || 30, parts = [`${raceLabel(c)} ${base}`], other = [];
  let sp = base;
  if (freeAction) other.push("Difficult terrain costs no extra movement (Ring of Free Action)");
  const add = (n, v) => { if (v) { sp += v; parts.push(`${n} ${v > 0 ? "+" : "−"}${Math.abs(v)}`); } };
  const FF = pcFx(c);
  if (FF.form) {
    const f = FF.form; sp = f.sp.walk || 0; parts.length = 0; parts.push(`${f.name} ${sp}`);
    if (fx.longstrider) add("Longstrider", 10);
    const k = fx.haste ? 2 : 1; if (k > 1) { sp *= 2; parts.push("Haste ×2"); }
    ["fly", "swim", "climb", "burrow"].forEach(t => { if (f.sp[t]) other.push(`${t.charAt(0).toUpperCase() + t.slice(1)} ${f.sp[t] * k} ft`); });
    return { speed: sp, src: parts.join(" + "), other };
  }
  if (has("Unarmored Movement") && !A.bodyKind && !A.shieldOn) add("Unarmored Movement", unarmoredMove(clsLv(c, "Monk")));
  if (has("Fast Movement") && A.bodyKind !== "heavy") add("Fast Movement", 10);
  const roving=ed==="2024"&&clsLv(c,"Ranger")>=6;
  if(roving&&A.bodyKind!=="heavy")add("Roving",10);
  if (+c.hbSpeed) add("homebrew", +c.hbSpeed);
  if (featTaken(c, "Mobile")) add("Mobile", 10);
  if (featTaken(c, "Speedy")) add("Speedy", 10);
  if (featTaken(c, "Boon of Speed")) add("Boon of Speed", 30);
  add("Aura of Alacrity", subBonusOf(c).speed);
  if (A.speedPen) add("heavy armor without the Strength", -A.speedPen);
  if (fx.longstrider) add("Longstrider", 10);
  const F = pcFx(c);
  F.speed.forEach(([v, l]) => add(l, v));
  if (fx.haste) { sp *= 2; parts.push("Haste ×2"); }
  if (F.mult !== 1) { sp *= F.mult; parts.push(`×${F.mult}`); }
  const LD = pcLoad(c);
  if (LD.variant && LD.lb > LD.heavy) add("heavily encumbered", -20); else if (LD.variant && LD.lb > LD.enc) add("encumbered", -10);
  if (LD.lb > LD.cap && sp > 5) { parts.push(`over carrying capacity: 5 ft`); sp = 5; }
  const xn = exhOf(c);
  if (xn && ed === "2024") add(`exhaustion ${xn}`, -5 * xn);
  if (xn >= 2 && xn < 5 && ed === "2014") { sp = Math.floor(sp / 2); parts.push("exhaustion: halved"); }
  const stop = ["grappled", "restrained", "paralyzed", "petrified", "unconscious"].find(k => condOn(c, k)) || (ed === "2014" && xn >= 5 ? "exhaustion" : "");
  if (stop) { sp = 0; parts.push(`${stop}: speed 0`); }
  sp = Math.max(0, sp);
  const mv = v => v === "speed" ? sp : v === "2speed" ? 2 * sp : v;
  const fly = Math.max(fx.fly ? 60 : 0, F.fly != null ? mv(F.fly) || 0 : 0);
  if (fly) other.push(`Fly ${fly} ft`);
  if (F.climb != null || roving) other.push(`Climb ${Math.max(roving?sp:0,F.climb!=null?mv(F.climb):0)} ft`);
  const depths=hasChoice(c,"Eldritch Invocations","depths");
  if (F.swim != null || roving || depths) other.push(`Swim ${Math.max(roving||depths?sp:0,F.swim!=null?mv(F.swim):0)} ft`);
  if(depths)other.push("Breathe underwater (Gift of the Depths)");
  if (ed === "2024" && characterSubclassLevel(c,"Rogue","Thief")>=3) other.push(`Climb ${sp} ft`);
  if (characterSubclassLevel(c,"Druid","Circle of the Sea")>=6) other.push(`Swim ${sp} ft`);
  if (has("Unarmored Movement") && clsLv(c, "Monk") >= 9 && !A.bodyKind && !A.shieldOn) other.push("Run up walls and across liquids on your turn");
  return { speed: sp, src: parts.join(" + "), other };
}
function pcSpeedApply(c, A) {
  const S = pcSpeed(c, A);
  if (c.speedManual === undefined) { // characters saved before this: their speed counts as typed only if it isn't one the app worked out
    const R = raceInfo(edOf(c), c.race, c.sub), gen = [S.speed, R.speed, R.speed + (+c.subSpd || 0) - (+c.armSpd || 0)];
    c.speedManual = c.speed !== "" && c.speed !== undefined && !gen.includes(+c.speed);
  }
  c.speedAuto = S.speed; c.speedSrc = S.src; c.speedOther = S.other;
  if (!c.speedManual) c.speed = S.speed;
}
function rcSpeedLine(c) {
  if (c.speedAuto === undefined) return "";
  const other = (c.speedOther || []).length ? ` · ${c.speedOther.map(esc).join(" · ")}` : "";
  return c.speedManual
    ? `<p class="hint" style="margin:8px 0 0">Speed is set by hand to <b>${esc(c.speed)} ft</b>. Your features and gear give <b>${c.speedAuto} ft</b> (${esc(c.speedSrc)})${other}. <button class="btn sm" type="button" data-spdauto="1">Use calculated speed</button></p>`
    : `<p class="hint" style="margin:8px 0 0">Speed <b>${c.speedAuto} ft</b>: ${esc(c.speedSrc)}${other}.</p>`;
}
// keep the AC field in step with equipment unless it was typed in by hand
function pcACApply(c) {
  if (!c.kitMoved) return;
  const A = pcAC(c);
  if (c.acManual === undefined) { // characters saved before this: their AC counts as hand-set only if it matches none of the generated values
    const gen = [A.ac, CLASS_DATA[c.cls] ? CLASS_DATA[c.cls].ac(c.mods)[0] : null, c.cls === "Sorcerer" ? 13 + c.mods.dex : null, (subBonusOf(c).ac || [])[0]];
    c.acManual = c.ac !== "" && c.ac !== undefined && !gen.includes(+c.ac);
  }
  c.acAuto = A.ac; c.acAutoSrc = A.src; c.acWarn = A.warn; c.acStealthDis = A.stealthDis; c.armorUntrained = A.untrained;
  pcSpeedApply(c, A);
  if (!c.acManual) { c.ac = A.ac; c.acSrc = A.src; }
}
const disMark = `<span class="dis" title="Disadvantage: armor or shield you aren't trained with">D</span>`;
function rcACLine(c) {
  if (!c.kitMoved || c.acAuto === undefined) return "";
  const fx = c.fx || {};
  const toggles = `<div class="row" style="flex-wrap:wrap;gap:6px 16px;margin-top:10px"><span class="muted" style="flex:0 0 auto;font-size:14px">Spell effects:</span>${[["mageArmor", "Mage Armor (13 + DEX, no armor)"], ["shieldOfFaith", "Shield of Faith (+2 AC)"], ["shield", "Shield (+5 AC)"], ["haste", "Haste (+2 AC, double speed)"], ["barkskin", `Barkskin (AC at least ${edOf(c) === "2024" ? 17 : 16})`], ["longstrider", "Longstrider (+10 ft)"], ["fly", "Fly (60 ft)"]].map(([k, l]) => `<label style="flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;font-size:14px;cursor:pointer"><input type="checkbox" data-fx="${k}" ${fx[k] ? "checked" : ""}>${l}</label>`).join("")}</div>`;
  const warn = (c.acWarn || []).map(w => `<div class="enc" style="margin-top:6px">⚠ ${esc(w.charAt(0).toUpperCase() + w.slice(1))}.</div>`).join("") + (c.acStealthDis ? `<p class="hint" style="margin:6px 0 0">Your armor gives disadvantage on Stealth checks.</p>` : "");
  const other = `<label class="lbl ac-other">Other AC bonus <input type="number" data-acbonus="1" value="${esc(+c.acBonus || 0)}" min="-10" max="20" aria-label="Other AC bonus, for magic items or features the Forge doesn't count"></label>`;
  return toggles + other + warn + (c.acManual
    ? `<p class="hint" style="margin:10px 0 0">Armor class is set by hand to <b>${esc(c.ac)}</b>. Your equipment gives <b>${c.acAuto}</b> (${esc(c.acAutoSrc)}). <button class="btn sm" type="button" data-acauto="1">Use equipment AC</button></p>`
    : `<p class="hint" style="margin:10px 0 0">Armor class <b>${c.acAuto}</b>: ${esc(c.acAutoSrc)}.</p>`);
}
const ATK_F = { strMelee: a => a.melee && a.ab === "str", strWeapon: a=>a.ab==="str"&&(a.iid||a.unarmed), weapon: a => !!a.iid, melee: a => !!a.melee, ranged: a => !a.melee, unarmed: a => !!a.unarmed, all: () => true };
function pcAttacks(c) {
  const ed = edOf(c), out = [], SB = subBonusOf(c), m = c.mods, F = pcFx(c);
  if (F.form) {
    F.form.attacks.forEach(a => out.push({ ...a, altNote: F.form.magic ? "counts as magical" : "" }));
    F.attacks.forEach(a => out.push({ prof: true, ...a }));
    out.forEach(a => { a.tags = ["beast form"]; a.extra = []; a.dmgB = 0; });
    F.atk.forEach(x => out.filter(ATK_F[x.f] || ATK_F.all).forEach(a => { if (x.hit) a.hit += x.hit; if (x.dmg) a.dmgB += x.dmg; if (x.extra) a.extra.push(x.extra); if (x.adv || x.label) a.tags.push(x.adv || x.label); }));
    out.forEach(a => { const t = a.mod + a.dmgB; a.dmg = a.die ? a.die + (t ? sgn(t) : "") : String(Math.max(1, t)); a.alt = a.altNote || ""; });
    return out;
  }
  (c.inv || []).filter(i => i.eq && (+i.qty || 0) > 0).forEach(i => { const w = eqWeaponOf(i, ed), a = w && eqAttack(c, i, w); if (a) out.push(a); });
  const propulsion=artificerInfusionEquipped(c,"Arcane Propulsion Armor");
  if(propulsion){
    const ab=battleSmithLevel(c)>=3&&choiceOf(c,"Battle Ready Ability")[0]==="Intelligence"?"int":"str";
    out.push({name:"Arcane Propulsion gauntlet",iid:propulsion.id,hit:m[ab]+c.prof,die:"1d8",mod:m[ab],type:"force",prof:true,melee:true,thrown:true,ab,altNote:"Requires an empty hand. Thrown 20/60 ft, returns after the attack."});
  }
  if (c.cls === "Monk") { const wm = Math.max(m.str, m.dex); out.push({ name: "Unarmed strike", hit: wm + c.prof, die: "1d" + maDie(c), mod: wm, type: "bludgeoning", prof: true, melee: true, unarmed: true, ab: m.dex > m.str ? "dex" : "str" }); }
  else if (!out.length) out.push({ name: "Unarmed strike", hit: m.str + c.prof, die: "", mod: 1 + m.str, type: "bludgeoning", prof: true, melee: true, unarmed: true, ab: "str" });
  if (characterSubclassLevel(c,"Rogue","Soulknife")>=3) {
    const bm = Math.max(m.str, m.dex), ab = m.dex > m.str ? "dex" : "str";
    out.push({ name: "Psychic Blade", hit: bm + c.prof, die: "1d6", mod: bm, type: "psychic", altNote: "thrown 60 ft"+(ed==="2024"?"; Vex; opportunity attack eligible":""), prof: true, melee: true, ab });
    out.push({ name: "Psychic Blade (bonus action)", hit: bm + c.prof, die: "1d4", mod: bm, type: "psychic", prof: true, melee: true, ab });
  }
  F.attacks.forEach(a => out.push({ prof: true, ...a }));
  out.forEach(a => { a.tags = []; a.extra = []; a.dmgB = 0; if (+c.atkBonus && (a.iid || a.unarmed)) { a.hit += +c.atkBonus; a.tags.push(`homebrew ${sgn(+c.atkBonus)}`); } });
  out.forEach(a=>{if(a.mastery)a.tags.push("Mastery: "+a.mastery+(classFeatureLevel(c,"Fighter")>=9?" (Tactical Master: Push, Sap or Slow may replace)":""));});
  if (SB.crit < 20) out.forEach(a => { if (a.iid || a.unarmed) a.crit = SB.crit; });
  // fighting styles
  const melee = out.filter(a => a.iid && a.melee);
  if (hasStyle(c, "Dueling") && melee.length === 1 && !melee[0].twoH) { melee[0].duel = 2; melee[0].tags.push("Dueling +2"); }
  if (hasStyle(c, "Archery")) out.filter(a => a.iid && !a.melee).forEach(a => { a.hit += 2; a.tags.push("Archery +2"); });
  if (hasStyle(c, "Thrown Weapon Fighting")) out.filter(a => a.thrown).forEach(a => { a.thrownB = 2; a.tags.push("Thrown Weapon Fighting +2"); });
  if (hasChoice(c, "Hunter's Prey", "colossus")) out.filter(a => a.iid).forEach(a => a.extra.push("1d8 vs wounded, once per turn"));
  for(const a of out.filter(a=>a.pact)){
    a.tags.push("Pact weapon");
    if(hasChoice(c,"Eldritch Invocations","thirst"))a.tags.push(hasChoice(c,"Eldritch Invocations","devouring")?"3 pact weapon attacks per Attack action":"2 pact weapon attacks per Attack action");
    if(hasChoice(c,"Eldritch Invocations","lifedrinker")){
      if(ed==="2014")a.extra.push(Math.max(1,m.cha)+" necrotic (Lifedrinker)");
      else a.extra.push("1d6 necrotic, psychic or radiant once per turn (Lifedrinker); optional Hit Die healing");
    }
  }
  // Radiant Strikes is an attack rider, never a separate spell-slot cost.
  if(ed==="2024"&&clsLv(c,"Paladin")>=11)out.filter(a=>a.unarmed||(a.iid&&a.melee)).forEach(a=>a.extra.push("1d8 radiant (Radiant Strikes)"));
  if(ed==="2024"&&clsLv(c,"Death Knight")>=11)out.filter(a=>a.unarmed||(a.iid&&a.melee)).forEach(a=>a.extra.push("1d8 necrotic (Runic Strikes)"));
  // active abilities
  F.atk.forEach(x => out.filter(ATK_F[x.f] || ATK_F.all).forEach(a => { if (x.hit) a.hit += x.hit; if (x.dmg) a.dmgB += x.dmg; if (x.extra) a.extra.push(x.extra); if (x.adv) a.tags.push(x.adv); else if (x.label) a.tags.push(x.label); }));
  const A = pcAC(c);
  if (A.untrained) out.forEach(a => { if (["str", "dex"].includes(a.ab) || !a.ab) a.armorDis = true; });
  // final damage text
  out.forEach(a => {
    if (a.die === undefined) return;
    const t = a.mod + a.dmgB, alts = [];
    a.dmg = a.die ? a.die + (t + (a.duel || 0) ? sgn(t + (a.duel || 0)) : "") : String(Math.max(1, t));
    if (a.two) alts.push(`${a.two}${t ? sgn(t) : ""} two-handed`);
    if (a.thrownB) alts.push(`thrown ${a.die}${sgn(t + a.thrownB)}`);
    if (a.altNote) alts.push(a.altNote);
    a.alt = alts.join(", ");
  });
  return out;
}
const atkLine = a => `<b>${esc(a.name)}</b>: ${a.save ? esc(a.save) : `${sgn(a.hit)} to hit`}, ${esc(a.dmg)}${a.type ? " " + esc(a.type) : ""} damage${(a.extra || []).length ? ` + ${a.extra.map(esc).join(" + ")}` : ""}${a.alt ? ` <span class="muted">(${esc(a.alt)})</span>` : ""}${(a.tags || []).map(t => ` <span class="tag">${esc(t)}</span>`).join("")}${a.crit ? ` <span class="tag">crit ${a.crit}–20</span>` : ""}${a.armorDis ? ` <span class="tag">disadvantage: armor</span>` : ""}${a.prof === false ? ` <span class="tag">not proficient</span>` : ""}${a.needsAtt ? ` <span class="tag">attune for +${a.magic}</span>` : ""}`;
