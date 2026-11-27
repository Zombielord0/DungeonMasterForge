/* 13b-abilities-rests.js: My Characters: limited-use resources, the Abilities list, activations (ACT), their dialogs, rests, Wild Shape and area effects. */

/* ---- limited-use resources (ki, rages, slots, hit dice…), the Abilities list, and rests ---- */
// recharge: "long" = back on a long rest; "short" = all back on a short rest; "short1" = one back on a short rest (2024 rules)
function channelDivinityPools(ed,cleric,paladin){
  const C=cleric>=2?(ed==="2024"?(cleric>=18?4:cleric>=6?3:2):(cleric>=18?3:cleric>=6?2:1)):0;
  const P=paladin>=3?(ed==="2024"?(paladin>=11?3:2):1):0;
  if(!C&&!P)return [];
  if(ed==="2014"||!C||!P)return [{key:"channel",name:"Channel Divinity",max:Math.max(C,P),recharge:ed==="2024"?"short1":"short"}];
  return [{key:"channelCleric",name:"Cleric Channel Divinity",max:C,recharge:"short1"},{key:"channelPaladin",name:"Paladin Channel Divinity",max:P,recharge:"short1"}];
}
function channelKey(c,cls){
  return edOf(c)==="2024"&&clsLv(c,"Cleric")>=2&&clsLv(c,"Paladin")>=3?(cls==="Paladin"?"channelPaladin":"channelCleric"):"channel";
}
function channelPoolsForCharacter(c){
  const R=channelDivinityPools(edOf(c),clsLv(c,"Cleric"),clsLv(c,"Paladin"));
  // Migrate the ambiguous historical counter conservatively. Never grant free
  // uses by guessing which class spent them; a DM can correct the counters.
  if(R.length===2&&c.used&&Object.hasOwn(c.used,"channel")){
    const spent=Math.max(0,+c.used.channel||0);
    for(const r of R)if(!Object.hasOwn(c.used,r.key))c.used[r.key]=Math.min(spent,r.max);
    delete c.used.channel;
  }else if(R.length===1&&c.used&&R[0].key==="channel"&&(Object.hasOwn(c.used,"channelCleric")||Object.hasOwn(c.used,"channelPaladin"))){
    const spent=edOf(c)==="2024"?clsLv(c,"Cleric")>=2?c.used.channelCleric:c.used.channelPaladin:Math.max(+c.used.channelCleric||0,+c.used.channelPaladin||0);
    if(!Object.hasOwn(c.used,"channel"))c.used.channel=Math.max(0,Math.min(R[0].max,+spent||0));
    delete c.used.channelCleric;delete c.used.channelPaladin;
  }
  return R;
}
function pcResources(c) {
  const ed = edOf(c), lv = c.level, m = c.mods, prof = c.prof, has = n => (c.feats || []).some(f => f.f === n), tr = n => (c.traits || []).includes(n); const CLV = k => classFeatureLevel(c, k), TLV = totalLv(c);
  const R = [], add = (key, name, max, recharge) => R.push({ key, name, max, recharge });
  add("hd", `Hit dice (${[...new Set(c.hdList || [c.hd])].map(d => "d" + d).join(" + ")})`, TLV, "hd");
  if (clsLv(c, "Death Knight")) add("deathCoil", "Death Coil dice", Math.max(1, 1 + c.mods.cha), "long");
  if (has("Runic Smite")) add("freeRuneStrike", "Free Rune Strike", 1, "long");
  if (ed === "2024" && clsLv(c, "Paladin") >= 2) add("freeDivineSmite", "Paladin's Smite", 1, "long");
  if (ed === "2024" && clsLv(c, "Paladin") >= 5) add("freePaladinSteed", "Faithful Steed", 1, "long");
  for (const spell of c.prepared || []) {
    if (!spell.bookGrant) continue;
    for (const source of spell.sources || []) {
      if (source.free && source.uses) {
        const uses = source.uses === "proficiency" ? prof : source.uses === "atWill" ? Infinity : source.uses;
        add(source.free, `${source.feature || source.name} · ${spell.n}`, uses, source.recharge || "long");
      }
    }
  }
  if (clsLv(c, "Death Knight") >= 5) add("freeFindSteed", "Free Find Steed", 1, "long");
  if (has("Soul Fragments")) {
    const level = clsLv(c, "Demon Hunter");
    add("soulFragments", "Soul fragments", Math.max(1, c.mods.wis) + (level >= 13 ? 1 : 0) + (level >= 17 ? 1 : 0), "long");
  }
  if (has("Rage")) add("rage", "Rages", ed === "2014" && CLV("Barbarian") >= 20 ? Infinity : CLV("Barbarian") >= 17 ? 6 : CLV("Barbarian") >= 12 ? 5 : CLV("Barbarian") >= 6 ? 4 : CLV("Barbarian") >= 3 ? 3 : 2, ed === "2024" ? "short1" : "long");
  if (has("Bardic Inspiration")) add("bardic", "Bardic Inspiration", Math.max(1, m.cha), CLV("Bard") >= 5 ? "short" : "long");
  for(const r of channelPoolsForCharacter(c))R.push(r);
  if (has("Wild Shape")) add("wild", "Wild Shape", ed === "2014" && CLV("Druid") >= 20 ? Infinity : ed === "2024" ? (CLV("Druid") >= 17 ? 4 : CLV("Druid") >= 6 ? 3 : 2) : 2, ed === "2024" ? "short1" : "short");
  if (has("Second Wind")) add("wind", "Second Wind", ed === "2024" ? (CLV("Fighter") >= 10 ? 4 : CLV("Fighter") >= 4 ? 3 : 2) : 1, ed === "2024" ? "short1" : "short");
  if (has("Action Surge")) add("surge", "Action Surge", CLV("Fighter") >= 17 ? 2 : 1, "short");
  if (has("Indomitable")) add("indom", "Indomitable", CLV("Fighter") >= 17 ? 3 : CLV("Fighter") >= 13 ? 2 : 1, "long");
  if (has("Ki")||has("Monk's Focus")) add("ki", ed === "2024" ? "Focus points" : "Ki points", CLV("Monk"), "short");
  if(ed==="2024"&&clsLv(c,"Monk")>=2)add("uncannyMetabolism","Uncanny Metabolism",1,"long");
  if(ed==="2024"&&clsLv(c,"Barbarian")>=15)add("persistentRage","Persistent Rage recovery",1,"long");
  if(ed==="2024"&&clsLv(c,"Druid")>=5)add("wildResurgence","Wild Resurgence (create slot)",1,"long");
  if (has("Lay on Hands")) add("loh", "Lay on Hands pool", 5 * CLV("Paladin"), "long");
  if (has("Divine Sense") && ed === "2014") add("dsense", "Divine Sense", 1 + Math.max(0, m.cha), "long");
  if (has("Cleansing Touch")) add("cleanse", "Cleansing Touch", Math.max(1, m.cha), "long");
  if(ed==="2024"&&clsLv(c,"Ranger")>=10)add("rangerTireless","Tireless",Math.max(1,m.wis),"long");
  if(ed==="2024"&&clsLv(c,"Ranger")>=14)add("rangerVeil","Nature’s Veil",Math.max(1,m.wis),"long");
  if(ed==="2024"&&clsLv(c,"Sorcerer")>=1)add("innateSorcery","Innate Sorcery",2,"long");
  if(ed==="2024"&&clsLv(c,"Sorcerer")>=5)add("sorcerousRestore","Sorcerous Restoration",1,"long");
  if(ed==="2024"&&clsLv(c,"Warlock")>=2)add("magicalCunning","Magical Cunning",1,"long");
  if(ed==="2024"&&clsLv(c,"Warlock")>=9)add("freeContactPatron","Contact Patron",1,"long");
  if (has("Font of Magic")) add("sorc", "Sorcery points", CLV("Sorcerer"), "long");
  if (has("Favored Enemy") && ed === "2024") add("hmark", "Free Hunter's Mark", CLV("Ranger") >= 17 ? 6 : CLV("Ranger") >= 13 ? 5 : CLV("Ranger") >= 9 ? 4 : CLV("Ranger") >= 5 ? 3 : 2, "long");
  if(ed==="2024"&&clsLv(c,"Cleric")>=10)add("divineIntervention","Divine Intervention",1,"long");
  if(clsLv(c,"Artificer")>=7)add("flashGenius","Flash of Genius",Math.max(1,m.int),ed==="2024"?(clsLv(c,"Artificer")>=20&&artificerAttunedCount(c)>0?"short":clsLv(c,"Artificer")>=14?"short1":"long"):"long");
  if(ed==="2024"&&clsLv(c,"Artificer")>=1)add("tinkersMagic","Tinker's Magic",Math.max(1,m.int),"long");
  if(ed==="2024"&&clsLv(c,"Artificer")>=2)add("replicateCreation","Replicate Magic Item (rest creation)",artificerPlanLimits("2024",clsLv(c,"Artificer")).active,"long");
  if(ed==="2024"&&clsLv(c,"Artificer")>=6){add("replicateDrain","Drain Magic Item",1,"long");add("replicateTransmute","Transmute Magic Item",1,"long");}
  const stored=artificerStoredSpell(c);if(stored)add("artificerStored","Stored "+stored.spell.n+" · "+stored.item.n,stored.max,"never");
  if (has("Arcane Recovery")) add("arcrec", "Arcane Recovery", 1, "long");
  if (has("Stroke of Luck")) add("luck", "Stroke of Luck", 1, "short");
  if (ed === "2024" && featTaken(c, "Ritual Caster")) add("featQuickRitual", "Quick Ritual", 1, "long");
  if (ed === "2024" && featTaken(c, "Mage Slayer")) add("featGuardedMind", "Guarded Mind", 1, "short");
  if (featTaken(c, "Lucky")) add("luckfeat", "Luck points", ed === "2024" ? prof : 3, "long");
  if (c.race === "Dragonborn") add("breath", "Breath Weapon", ed === "2024" ? prof : 1, ed === "2024" ? "long" : "short");
  if (tr("Healing Hands")) add("hhands", "Healing Hands", 1, "long");
  if (tr("Relentless Endurance")) add("relent", "Relentless Endurance", 1, "long");
  if (tr("Celestial Revelation") && TLV >= 3) add("crev", "Celestial Revelation", 1, "long");
  if (tr("Large Form") && TLV >= 5) add("large", "Large Form", 1, "long");
  if (tr("Draconic Flight") && TLV >= 5) add("dflight", "Draconic Flight", 1, "long");
  if (tr("Adrenaline Rush")) add("adren", "Adrenaline Rush", prof, "long");
  if (tr("Giant Ancestry")) add("giant", "Giant Ancestry", prof, "long");
  const subSeen=new Set();
  for(const f of (c.feats||[]).filter(f=>(f.sub||f.mcsub||f.bookSub)&&SUB_ABL[f.f]?.res)){
    const o=subclassFeatureOwner(c,f),S=SUB_ABL[f.f];
    if(!o.level||+f.l>o.level||f.bookSub&&!S.text&&!ACT[f.f])continue;
    const key=subAblKey(f.f);if(subSeen.has(key))continue;subSeen.add(key);
    const [n,mx,rc]=S.res,ctx={...c,level:o.level,cls:o.cls,subclass:o.name};
    add(key,n,mx(ctx),typeof rc==="function"?rc(ctx):rc);
  }
  if (c.spell) {
    if (c.spell.note) { const mm = c.spell.note.match(/^(\d+) pact slots? of level (\d+)/); if (mm) add("pact", `Pact slots (level ${mm[2]})`, +mm[1], "short"); }
    else for(let L=1;L<=9;L++){const n=+(c.spell.slots?.[L-1]||0)+temporarySlotCount(c,L);if(n>0)add("slot"+L,`Level ${L} slots`,n,"long");}
    if (c.spell.pact) add("pact", `Pact slots (level ${c.spell.pact.lvl})`, c.spell.pact.n, "short");
  }
  return R;
}
const resLeft = (c, r) => r.max === Infinity ? Infinity : Math.max(0, r.max - Math.max(0,Math.min(r.max, +((c.used || {})[r.key]) || 0)));
function resCtr(c, r) {
  if (!r) return "";
  if (r.max === Infinity) return `<span class="ctr"><span class="tag">Unlimited</span></span>`;
  const left = resLeft(c, r);
  return `<span class="ctr" title="${esc(r.name)}: ${left} of ${esc(r.max)} left"><button type="button" class="ctr-b" data-use="${r.key}" data-d="1" aria-label="Use one ${esc(r.name)}" ${left ? "" : "disabled"}>−</button><input type="number" min="0" max="${esc(r.max)}" data-left="${r.key}" value="${left}" aria-label="${esc(r.name)} left"><span class="ctr-max">/ ${esc(r.max)}</span><button type="button" class="ctr-b" data-use="${r.key}" data-d="-1" aria-label="Regain one ${esc(r.name)}" ${left < r.max ? "" : "disabled"}>+</button></span>`;
}
// features you use in play: actions, bonus actions, reactions, on-hit riders and auras, with this character's numbers
function pcAbilities(c) {
  const ed = edOf(c), lv = c.level, m = c.mods, prof = c.prof, has = n => (c.feats || []).some(f => f.f === n), tr = n => (c.traits || []).includes(n); const CLV = k => classFeatureLevel(c, k), TLV = totalLv(c);
  const A = [], add = (name, when, text, res, src) => A.push({ name, when, text, res, src });
  const wisDC = 8 + prof + m.wis, chaB = Math.max(1, m.cha);
  if (has("Rage")) add("Rage", "Bonus action", `+${CLV("Barbarian") >= 16 ? 4 : CLV("Barbarian") >= 9 ? 3 : 2} damage on Strength melee attacks, resistance to bludgeoning, piercing and slashing, advantage on Strength checks and saves. No spellcasting while raging.`, "rage");
  if(ed==="2024"&&clsLv(c,"Barbarian")>=15)add("Persistent Rage recovery","On initiative","Regain all expended Rage uses, once per Long Rest.","persistentRage");
  if(ed==="2024"&&clsLv(c,"Druid")>=2)add("Wild Companion","Magic action","Expend a Wild Shape use or spell slot to cast Find Familiar without Material components. The Fey familiar disappears at your next Long Rest.");
  if(ed==="2024"&&clsLv(c,"Druid")>=5)add("Wild Resurgence","No action","Spend a spell slot to regain Wild Shape when none remain, or spend one Wild Shape use to regain an expended level 1 slot once per Long Rest.");
  if(ed==="2024"&&clsLv(c,"Sorcerer")>=7)add("Sorcery Incarnate","Bonus action","When no Innate Sorcery uses remain, spend 2 Sorcery Points to activate it.","sorc");
  if (has("Reckless Attack")) add("Reckless Attack", "On attack", "Advantage on your Strength attacks this turn; attacks against you have advantage until your next turn.");
  const ea = has("Extra Attack (3)") ? 4 : has("Extra Attack (2)") ? 3 : has("Extra Attack") ? 2 : 0;
  if (ea) add("Extra Attack", "Action", `Make ${ea} attacks when you take the Attack action.`);
  if (has("Bardic Inspiration")) add("Bardic Inspiration", "Bonus action", `Give a creature within 60 ft a d${CLV("Bard") >= 15 ? 12 : CLV("Bard") >= 10 ? 10 : CLV("Bard") >= 5 ? 8 : 6} to add to one attack, check or save.`, "bardic");
  const dualChannel=CLV("Cleric")>=2&&CLV("Paladin")>=3;
  if(CLV("Cleric")>=2)add(dualChannel?"Channel Divinity (Cleric)":"Channel Divinity","Magic action",`Turn Undead: undead within 30 ft make a WIS save (DC ${wisDC}).${ed==="2024"?` Divine Spark: heal or deal radiant/necrotic damage, ${CLV("Cleric")>=18?4:CLV("Cleric")>=13?3:CLV("Cleric")>=7?2:1}d8 + ${m.wis}.`:""} Your domain adds more options.`,channelKey(c,"Cleric"));
  if(CLV("Paladin")>=3)add(dualChannel?"Channel Divinity (Paladin)":"Channel Divinity","Action",`Use an oath option${ed==="2024"?", Divine Sense"+(CLV("Paladin")>=9?" or Abjure Foes":""):""}.`,channelKey(c,"Paladin"));
  if (has("Wild Shape")) add("Wild Shape", ed === "2024" ? "Bonus action" : "Action", (L => `Turn into a beast up to CR ${crText(L.cr)}${L.noFly && L.noSwim ? " (no flying or swimming)" : L.noFly ? " (no flying)" : ""} for ${Math.max(1, Math.floor(CLV("Druid") / 2))} hour${CLV("Druid") >= 4 ? "s" : ""}. Pick the beast, then Activate.`)(wildShapeLimit(c)), "wild");
  if (has("Second Wind")) add("Second Wind", "Bonus action", `Regain 1d10 + ${CLV("Fighter")} hit points.`, "wind");
  if (has("Action Surge")) add("Action Surge", "Free", ed==="2024"?"Take one additional action on your turn, except the Magic action.":"Take one additional action on your turn.", "surge");
  if (has("Indomitable")) add("Indomitable", "On a failed save", `Reroll a saving throw you failed${ed === "2024" ? `, adding +${CLV("Fighter")}` : ""}.`, "indom");
  if (has("Martial Arts")) { const wm = Math.max(m.str, m.dex), d = ed === "2024" ? (CLV("Monk") >= 17 ? 12 : CLV("Monk") >= 11 ? 10 : CLV("Monk") >= 5 ? 8 : 6) : (CLV("Monk") >= 17 ? 10 : CLV("Monk") >= 11 ? 8 : CLV("Monk") >= 5 ? 6 : 4); add("Martial Arts", "Bonus action", `After the Attack action, make an unarmed strike: ${sgn(wm + prof)} to hit, 1d${d}${wm ? sgn(wm) : ""} bludgeoning.`); }
  if(ed==="2014"&&has("Ki"))add("Ki","Bonus action","1 point each: Flurry of Blows, Patient Defense, Step of the Wind.","ki");
  if(ed==="2024"&&clsLv(c,"Monk")>=2){
    add("Monk's Focus","Bonus action","Flurry of Blows, Patient Defense or Step of the Wind; free Dash/Disengage options available.","ki");
    add("Uncanny Metabolism","On initiative","Regain all spent Focus Points and heal Monk level + one Martial Arts die.","uncannyMetabolism");
  }
  if(ed==="2024"&&clsLv(c,"Monk")>=15)add("Perfect Focus","On initiative","If below 4 Focus Points, regain points up to four.");
  if(ed==="2024"&&clsLv(c,"Monk")>=18)add("Superior Defense","Start of turn","Spend 3 Focus Points: Resistance to all damage except Force for 1 minute or until Incapacitated.","ki");
  if(has("Stunning Strike"))add("Stunning Strike","On hit",ed==="2024"?`Once per turn: CON save DC ${wisDC}; stunned until your next turn starts on failure, halved Speed and Advantage on next incoming attack until then on success.`:`Spend 1 point: CON save DC ${wisDC} or stunned until the end of your next turn.`,"ki");
  if (has("Deflect Missiles")||has("Deflect Attacks")) add(ed === "2024" ? "Deflect Attacks" : "Deflect Missiles", "Reaction", `Reduce the damage of an attack that hits you by 1d10 + ${m.dex + CLV("Monk")}.`);
  if (has("Slow Fall")) add("Slow Fall", "Reaction", `Reduce falling damage by ${5 * CLV("Monk")}.`);
  if (has("Sneak Attack")) add("Sneak Attack", "On hit, once per turn", `+${Math.ceil(CLV("Rogue") / 2)}d6 damage with a finesse or ranged weapon, with Advantage or an eligible non-Incapacitated ally within 5 feet of the target and no Disadvantage.`);
  if(ed==="2024"&&clsLv(c,"Rogue")>=5)add("Cunning Strike","On a confirmed Sneak Attack hit","Choose effects and pay their Sneak Attack dice costs before rolling the remaining damage. Target saves, positioning, timing and damage type are adjudicated manually.");
  if(ed==="2024"&&clsLv(c,"Barbarian")>=9)add("Brutal Strike","On a confirmed eligible hit","Before the attack, forgo Advantage on a Strength-based Reckless Attack with no Disadvantage. On a hit, choose effects and roll extra damage. Use once on your turn.");
  if(ed==="2024"&&clsLv(c,"Sorcerer")>=20)add("Arcane Apotheosis","On your turn","While Innate Sorcery is active, one selected Metamagic option each turn can be used without Sorcery Points. Use Begin your turn to reset this allowance.");
  if (has("Cunning Action")) add("Cunning Action", "Bonus action", "Dash, Disengage or Hide.");
  if (has("Uncanny Dodge")) add("Uncanny Dodge", "Reaction", "Halve the damage of an attack that hits you from an attacker you can see.");
  if (has("Evasion")) add("Evasion", "Defense", "On a DEX save for half damage, take none on a success and half on a failure.");
  if (has("Lay on Hands")) add("Lay on Hands", ed === "2024" ? "Bonus action" : "Action", `Touch a creature and restore hit points from your pool of ${5 * CLV("Paladin")}, or spend 5 to ${ed==="2024"?"remove the Poisoned condition":"cure a disease or neutralize a poison"}.`, "loh");
  if (ed==="2014"&&has("Divine Smite")) add("Divine Smite", "On hit", "Spend a spell slot: +2d8 radiant, +1d8 per slot level above 1st (max 5d8), +1d8 more against undead and fiends.");
  if (has("Divine Sense") && ed === "2014") add("Divine Sense", "Action", "Sense celestials, fiends and undead within 60 ft until the end of your next turn.", "dsense");
  if (has("Aura of Protection")) add("Aura of Protection", "Aura", `You and allies within ${CLV("Paladin") >= 18 ? 30 : 10} ft add +${chaB} to saving throws.`);
  if (has("Aura of Courage")) add("Aura of Courage", "Aura", `You and allies within ${CLV("Paladin") >= 18 ? 30 : 10} ft can't be frightened.`);
  if(ed==="2024"&&clsLv(c,"Paladin")>=11)add("Radiant Strikes","On hit","+1d8 radiant damage with a melee weapon or Unarmed Strike.");
  if(ed==="2014"&&has("Improved Divine Smite"))add("Improved Divine Smite","On hit","+1d8 radiant damage on every melee weapon hit.");
  if (ed==="2014"&&has("Cleansing Touch")) add("Cleansing Touch", "Action", "End one spell on yourself or a willing creature you touch.", "cleanse");
  if (has("Favored Enemy") && ed === "2024") add("Hunter's Mark", "Bonus action", `Cast without a spell slot: +1d${has("Foe Slayer") ? 10 : 6} damage to the marked creature, advantage to track it.`, "hmark");
  if(ed==="2024"&&clsLv(c,"Ranger")>=10)add("Tireless","Magic action","Gain temporary HP (1d8 + Wisdom modifier, minimum 1). Short rests also reduce exhaustion by one.","rangerTireless");
  if(ed==="2024"&&clsLv(c,"Ranger")>=14)add("Nature’s Veil","Bonus action","Gain the Invisible condition through the end of your next turn. Track the condition duration manually.","rangerVeil");
  if(ed==="2024"&&clsLv(c,"Sorcerer")>=1)add("Innate Sorcery","Bonus action","For 1 minute: +1 Sorcerer spell save DC and Advantage on Sorcerer spell attacks. End the toggle when it expires.","innateSorcery");
  if(ed==="2024"&&clsLv(c,"Warlock")>=2)add("Magical Cunning","1 minute","Recover expended Pact Magic slots: "+(clsLv(c,"Warlock")>=20?"all":"up to half the maximum, rounded up")+".","magicalCunning");
  if (has("Font of Magic")) add("Font of Magic", "Bonus action", "Turn a spell slot into sorcery points, or spend 2/3/5/6/7 points for a level 1–5 slot.", "sorc");
  if (has("Metamagic")) add("Metamagic", "When casting", ed==="2024"?"Spend Sorcery Points for selected Metamagic. Revised Twinned Spell costs 1 point for a spell whose higher-slot rules add a target; adjudicate spell eligibility and timing.":"Spend Sorcery Points for selected Metamagic, with legacy Twinned Spell costing the spell level (minimum 1).", "sorc");
  if(ed==="2024"&&clsLv(c,"Cleric")>=10)add("Divine Intervention","Magic action","Cast an eligible Cleric spell without a slot or Material components. Select the spell and resolve its rules manually.","divineIntervention");
  if(clsLv(c,"Artificer")>=7)add("Flash of Genius","Reaction",`Add ${sgn(m.int)} to your or a creature’s eligible ability check or saving throw within 30 feet. ${ed==="2024"?"Use after a failed roll.":"Use before success or failure is determined."} Apply the bonus manually.`,"flashGenius");
  if(ed==="2024"&&clsLv(c,"Artificer")>=1)add("Tinker's Magic","Magic action","Create eligible mundane gear using Tinker's Tools; the item vanishes at your next Long Rest.","tinkersMagic");
  if(ed==="2024"&&clsLv(c,"Artificer")>=2)add("Replicate Magic Item","After Long Rest","Create an item from a known eligible plan. At the active limit the oldest replica vanishes. Confirm tool and rest timing.","replicateCreation");
  if(ed==="2024"&&clsLv(c,"Artificer")>=6){
    add("Charge Magic Item","Bonus action","Spend a spell slot to restore that many charges in a nearby replicated item with a tracked charge contract.");
    add("Drain Magic Item","Bonus action","Dismiss a nearby replicated item for an extra level 1 slot (Common) or level 2 slot (Uncommon/Rare).","replicateDrain");
    add("Transmute Magic Item","Magic action","Transform a nearby replicated item into a different known plan.","replicateTransmute");
  }
  if(clsLv(c,"Artificer")>=11){
    add("Store spell in item","After Long Rest","Choose a qualifying weapon or spellcasting focus in Features, then store an eligible Artificer spell. Confirm long-rest timing; replacing the stored spell ends the previous effect.");
    const stored=artificerStoredSpell(c);if(stored)add("Spell-Storing Item","Action",`${stored.item.n}: ${stored.spell.n}. The holder produces its effects using your spellcasting ability; the holder maintains any required Concentration. No spell slot used. Resolve target, spell effects and concentration manually.`,"artificerStored");
  }
  if (has("Arcane Recovery")) add("Arcane Recovery", "Short rest", `Recover spell slots with a combined level up to ${Math.ceil(CLV("Wizard") / 2)} (none above 5th).`, "arcrec");
  for (const feat of activeCharacterFeats(c)) {
    if (feat === "Telekinetic") {
      const dc = 8 + prof + m[featCastingAbility(c, feat)];
      add("Telekinetic Shove", "Bonus action", `Choose a creature you can see within 30 ft. It makes a Strength save (DC ${dc}) or moves 5 ft toward or away from you. It can choose to fail.`, null, "Feat · Telekinetic");
    } else if (feat === "Mage Slayer" && ed === "2024") {
      add("Guarded Mind", "On a failed save", "Turn a failed Intelligence, Wisdom, or Charisma saving throw into a success.", "featGuardedMind", "Feat · Mage Slayer");
    }
    const text = featDesc("Feat: " + feat, c);
    if (text) add(feat === "Lucky" ? "Lucky (feat)" : feat, feat === "Lucky" ? "On a roll" : "Feat", text, feat === "Lucky" ? "luckfeat" : null);
  }
  if (has("Stroke of Luck")) add("Stroke of Luck", "Free", "Turn a missed attack into a hit, or treat a failed ability check's d20 as a 20.", "luck");
  if (c.race === "Dragonborn") { const x = (c.extras || []).find(e => e.startsWith("Breath Weapon")); if (x) add("Breath Weapon", ed === "2024" ? "Replaces an attack" : "Action", x.replace(/^Breath Weapon \([^)]*\):\s*/, "").replace(/, (\d+ uses per long rest|once per short or long rest)$/, ""), "breath"); }
  if (tr("Healing Hands")) add("Healing Hands", "Action", `Touch a creature and heal ${prof}d4 hit points.`, "hhands");
  if (tr("Relentless Endurance")) add("Relentless Endurance", "When reduced to 0 HP", "Drop to 1 hit point instead.", "relent");
  (c.feats || []).filter(f=>(f.sub||f.mcsub||f.bookSub)&&(f.bookSub?!!(SUB_ABL[f.f]?.text||ACT[f.f]):!!(SUB_ABL[f.f]||ACT[f.f]))).forEach(f=>{
    const o=subclassFeatureOwner(c,f);if(!o.level||+f.l>o.level)return;
    const S=SUB_ABL[f.f]||{when:ACT[f.f].kind==="persist"?"Your choice":ACT[f.f].kind==="toggle"?"Activated":"Use"};
    const desc=subFeatDesc(f.f,c,f);if(!desc&&!S.text)return;
    add(f.f,S.when,S.text?S.text({...c,level:o.level}):desc,S.res?subAblKey(f.f):S.uses==="channel"?channelKey(c,o.cls):S.uses,o.name);
  });
  if (tr("Large Form") && TLV >= 5) add("Large Form", "Bonus action", "Become Large for 10 minutes: advantage on Strength checks and +10 ft speed.", "large");
  if (tr("Draconic Flight") && TLV >= 5) add("Draconic Flight", "Bonus action", "Spectral wings for 10 minutes: fly at your walking speed.", "dflight");
  if (tr("Adrenaline Rush")) add("Adrenaline Rush", "Bonus action", `Dash, and gain ${prof} temporary hit points.`, "adren");
  if (tr("Giant Ancestry")) add("Giant Ancestry", "Varies", `Your ${c.sub || "giant"} boon.`, "giant");
  if (tr("Celestial Revelation") && TLV >= 3) add("Celestial Revelation", "Bonus action", `Transform for 1 minute: once per turn add +${prof} radiant or necrotic damage, plus wings, light or fear.`, "crev");
  return A;
}
/* ---- activated abilities: Activate / End for lasting effects, Use for one-off ones; active effects change the sheet ---- */
function rollDice(expr) {
  const mm = String(expr).replace(/\s+/g, "").match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!mm) return { total: +expr || 0, text: String(expr) };
  const n = +(mm[1] || 1), d = +mm[2], k = +(mm[3] || 0), rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * d)), total = rolls.reduce((s, x) => s + x, 0) + k;
  return { total, text: `${n}d${d}${k ? sgn(k) : ""}: ${rolls.join(" + ")}${k ? ` ${k < 0 ? "−" : "+"} ${Math.abs(k)}` : ""} = ${total}` };
}
const healSelf = (c, n) => { const before = +c.hpCur || 0, max = +c.hp || 0; c.hpCur = Math.min(max, before + n); pcHealed(c, before === 0); return c.hpCur - before; };
const giveTemp = (c, n) => { if (n > (+c.hpTemp || 0)) { c.hpTemp = n; return true; } return false; };
const wearingArmor = c => (c.inv || []).some(i => i.eq && (+i.qty || 0) > 0 && (a => a && a.cat !== "Shield")(eqArmorOf(i, edOf(c))));
const isActive = (c, n) => !!(c.active || {})[n];
const maDie = c => { const lv = clsLv(c, "Monk") || c.level; return edOf(c) === "2024" ? (lv >= 17 ? 12 : lv >= 11 ? 10 : lv >= 5 ? 8 : 6) : (lv >= 17 ? 10 : lv >= 11 ? 8 : lv >= 5 ? 6 : 4); };
const rageDmg = c => { const l = classFeatureLevel(c, "Barbarian"); return l >= 16 ? 4 : l >= 9 ? 3 : 2; };
const psiDie = c => c.level >= 17 ? 12 : c.level >= 11 ? 10 : c.level >= 5 ? 8 : 6;
const healMsg = (c, label, r) => { const h = healSelf(c, r.total); return `${label}: ${r.text}. You regain ${h} hit point${h === 1 ? "" : "s"} (${c.hpCur}/${c.hp}).`; };
const rollMsg = (label, expr, tail) => { const r = rollDice(expr); return `${label}: ${r.text}${tail ? ". " + tail : ""}`; };
const DMG_LIST = ["acid", "cold", "fire", "lightning", "necrotic", "poison", "psychic", "radiant", "thunder", "bludgeoning", "piercing", "slashing"];
/* kind: "toggle" (Activate / End, effects while on), "persist" (a standing choice that stays through rests), "instant" (Use).
   choices: [[id, label]] or (c) => [...]. cost: uses spent (default 1). fx(c, choice): effects while on.
   start(c, choice) / use(c, choice): what happens when activated or used; returns the message to show. */
// Resource recovery is bounded by actual expended uses.
function magicalCunningRecovery(c){
  if(edOf(c)!=="2024"||clsLv(c,"Warlock")<2)return 0;
  const pact=pcResources(c).find(x=>x.key==="pact"),use=pcResources(c).find(x=>x.key==="magicalCunning");
  if(!pact||!use||resLeft(c,use)<1)return 0;
  const n=Math.min(pact.max-resLeft(c,pact),clsLv(c,"Warlock")>=20?pact.max:Math.ceil(pact.max/2));
  if(n<=0)return 0;
  c.used=c.used||{};c.used.pact=Math.max(0,Math.min(pact.max,+c.used.pact||0)-n);c.used.magicalCunning=1;return n;
}
function sorcerousRestoration(c){
  if(edOf(c)!=="2024"||clsLv(c,"Sorcerer")<5)return 0;
  const R=pcResources(c),p=R.find(x=>x.key==="sorc"),u=R.find(x=>x.key==="sorcerousRestore");
  if(!p||!u||resLeft(c,u)<1)return 0;
  const n=Math.min(p.max-resLeft(c,p),Math.floor(clsLv(c,"Sorcerer")/2));
  if(n<=0)return 0;
  c.used=c.used||{};c.used.sorc=Math.max(0,Math.min(p.max,+c.used.sorc||0)-n);c.used.sorcerousRestore=1;return n;
}
function restoreResource(c,key,minimum){
  const r=pcResources(c).find(x=>x.key===key);
  if(!r||!Number.isFinite(r.max))return 0;
  const n=Math.max(0,Math.min(r.max,minimum)-resLeft(c,r));
  if(n){c.used=c.used||{};c.used[key]=Math.max(0,Math.min(r.max,+c.used[key]||0)-n);}
  return n;
}
function wildResurgence(c,choice){
  if(edOf(c)!=="2024"||clsLv(c,"Druid")<5)return "Wild Resurgence unavailable.";
  const R=pcResources(c),wild=R.find(x=>x.key==="wild"),daily=R.find(x=>x.key==="wildResurgence");
  if(!wild||!daily)return "Wild Resurgence unavailable.";
  c.used=c.used||{};
  if(choice==="create"){
    const first=R.find(x=>x.key==="slot1");
    if(resLeft(c,wild)<1||resLeft(c,daily)<1||temporarySlotCount(c,1)>=999)return "Need one Wild Shape use and the daily conversion.";
    c.used.wild=(+c.used.wild||0)+1;c.used.wildResurgence=1;createTemporarySlot(c,1);return "Created one level 1 slot.";
  }
  const slot=R.find(x=>x.key===choice&&/^slot[1-9]$/.test(x.key));
  if(!slot||resLeft(c,slot)<1||resLeft(c,wild)!==0)return "Need an available spell slot and no remaining Wild Shape uses.";
  c.used[slot.key]=(+c.used[slot.key]||0)+1;restoreResource(c,"wild",1);return "Recovered one Wild Shape use.";
}
function divineInterventionChoices(c){
  if(edOf(c)!=="2024"||clsLv(c,"Cleric")<10)return [];
  spLoad();
  const eligible=s=>s&&!s.hb&&!s.pend&&!s.ref&&!s.referenceOnly&&!s.rulesSummary&&!s.shadow;
  const names=[...new Set((SP.data["2024"]||[]).filter(s=>eligible(s)&&s.c.includes("Cleric")&&s.l>=1&&s.l<=5&&!/reaction/i.test(s.t)).map(s=>s.n))].filter(n=>{const s=spellOf("2024",n);return eligible(s)&&s.c.includes("Cleric")&&s.l>=1&&s.l<=5&&!/reaction/i.test(s.t);});
  const out=names.map(n=>[n,n]);if(clsLv(c,"Cleric")>=20&&eligible(spellOf("2024","Wish")))out.push(["Wish","Wish (2d4 Long Rest cooldown)"]);return out;
}
function wildCompanionOptions(c){
  if(edOf(c)!=="2024"||clsLv(c,"Druid")<2)return [];
  return pcResources(c).filter(r=>(r.key==="wild"||r.key==="pact"||/^slot[1-9]$/.test(r.key))&&resLeft(c,r)>0).map(r=>[r.key,"Spend "+r.name]);
}
function castWildCompanion(c,key){
  if(!wildCompanionOptions(c).some(([id])=>id===key)||isActive(c,"Rage")||c.armorUntrained)return "No eligible casting resource.";
  const sp=spellOf("2024","Find Familiar");
  if(!sp||sp.ref||sp.referenceOnly||sp.pend||sp.rulesSummary)return "Complete Find Familiar rules required.";
  c.used=c.used||{};c.used[key]=(+c.used[key]||0)+1;c.wildCompanionActive=true;
  return "Wild Companion: Find Familiar cast. The familiar is Fey and disappears at your next Long Rest; resolve its statistics and presence manually.";
}
// Created spell slots supplement the normal slot table until the next Long Rest.
const SLOT_CREATION_COST=[0,2,3,5,6,7], REVISED_SLOT_MIN_LEVEL=[0,2,3,5,7,9];
function temporarySlotCount(c,L){
  if(!Number.isInteger(L)||L<1||L>5)return 0;
  const level=clsLv(c,"Sorcerer"),druid=edOf(c)==="2024"&&clsLv(c,"Druid")>=5&&L===1;
  const artificer=edOf(c)==="2024"&&clsLv(c,"Artificer")>=6&&L<=2;
  if(level<2&&!druid&&!artificer)return 0;
  return Math.max(0,Math.min(999,Math.trunc(+c.createdSlots?.[L]||0)));
}
function canCreateSorcererSlot(c,L){
  const lv=clsLv(c,"Sorcerer");
  return Number.isInteger(L)&&L>=1&&L<=5&&lv>=2&&(edOf(c)!=="2024"||lv>=REVISED_SLOT_MIN_LEVEL[L]);
}
function createTemporarySlot(c,L){
  c.createdSlots={...(c.createdSlots||{}),[L]:temporarySlotCount(c,L)+1};
}
function convertFontOfMagic(c,ch){
  const lv=clsLv(c,"Sorcerer"),R=pcResources(c),sorc=R.find(r=>r.key==="sorc");
  if(lv<2||!sorc||typeof ch!=="string")return "Font of Magic unavailable.";
  c.used=c.used||{};
  const make=ch.match(/^make([1-5])$/);
  if(make){
    const L=+make[1],cost=SLOT_CREATION_COST[L];
    if(!canCreateSorcererSlot(c,L)||resLeft(c,sorc)<cost||temporarySlotCount(c,L)>=999)return "Insufficient Sorcery Points or class level.";
    c.used.sorc=(+c.used.sorc||0)+cost;createTemporarySlot(c,L);
    return "Created one level "+L+" slot; it expires at your next Long Rest.";
  }
  const burn=ch.match(/^burn([1-9]|pact)$/);
  if(!burn)return "Invalid slot conversion.";
  const key=burn[1]==="pact"?"pact":"slot"+burn[1],slot=R.find(r=>r.key===key);
  if(!slot||resLeft(c,slot)<1)return "No slot available.";
  const L=key==="pact"?+(slot.name.match(/level (\d)/)||[])[1]:+burn[1];
  if(!L)return "Unknown slot level.";
  const gain=Math.min(L,sorc.max-resLeft(c,sorc));if(!gain)return "Sorcery Points already full.";
  c.used[key]=(+c.used[key]||0)+1;c.used.sorc=Math.max(0,(+c.used.sorc||0)-gain);
  return "Converted a level "+L+" slot to "+gain+" Sorcery Points.";
}
function artificerAttunedCount(c){
  return (c.inv||[]).filter(i=>i.attuned&&(+i.qty||0)>0&&inventoryNeedsAttunement(i,inventoryCatalogItem(i,edOf(c)))).length;
}
function artificerAttunementLimit(c){
  const lv=clsLv(c,"Artificer");return lv>=18?6:lv>=14?5:lv>=10?4:3;
}
// These workflows assume the player has confirmed the qualifying attack and timing.
function cunningStrikePlan(level,ids,poisonKit,critical=false){
  if(level<5||!Array.isArray(ids)||!ids.length||ids.length>(level>=11?2:1)||new Set(ids).size!==ids.length)return null;
  const effects={
    poison:[1,"CON save; Poisoned for 1 minute; repeat at end of target’s turns."],
    trip:[1,"Large or smaller target: DEX save or Prone."],
    withdraw:[1,"Move up to half your Speed without Opportunity Attacks."],
    daze:[2,"CON save; on its next turn target may only move, take an action, or take a Bonus Action."],
    knockout:[6,"CON save; Unconscious for 1 minute or until damaged; repeat at end of target’s turns."],
    obscure:[3,"DEX save; Blinded until end of target’s next turn."]
  };
  if(ids.some(id=>!Object.hasOwn(effects,id)||(id==="poison"&&!poisonKit)||(["daze","knockout","obscure"].includes(id)&&level<14)))return null;
  const dice=Math.ceil(level/2)-ids.reduce((sum,id)=>sum+effects[id][0],0);
  if(dice<0)return null;
  return {dice:dice*(critical?2:1),cost:Math.ceil(level/2)-dice,effects:ids.map(id=>effects[id][1])};
}
function hasPoisonersKit(c){return (c.inv||[]).some(i=>+i.qty>0&&/^poisoner['’]s kit$/i.test(i.n||""));}
function cunningStrikeOptions(c){
  if(edOf(c)!=="2024")return [];
  const l=clsLv(c,"Rogue"),ids=["poison","trip","withdraw","daze","knockout","obscure"],out=[];
  const sets=ids.map(x=>[x]);if(l>=11)ids.forEach((x,i)=>ids.slice(i+1).forEach(y=>sets.push([x,y])));
  for(const set of sets)for(const crit of [false,true]){
    const p=cunningStrikePlan(l,set,hasPoisonersKit(c),crit);
    if(p)out.push([set.join("+")+(crit?":crit":""),set.map(x=>x==="knockout"?"Knock Out":cap1(x)).join(" + ")+" ("+p.dice+"d6 remaining"+(crit?", critical":"")+")"]);
  }
  return out;
}
function brutalStrikeOptions(c){
  if(edOf(c)!=="2024"||clsLv(c,"Barbarian")<9)return [];
  const l=clsLv(c,"Barbarian"),ids=["Forceful Blow","Hamstring Blow",...(l>=13?["Staggering Blow","Sundering Blow"]:[])],out=ids.map(x=>[x]);
  if(l>=17)ids.forEach((x,i)=>ids.slice(i+1).forEach(y=>out.push([x,y])));
  return out.flatMap(a=>[false,true].map(crit=>[a.join("+")+(crit?":crit":""),a.join(" + ")+(crit?" (critical hit)":"")]));
}
function metamagicOptions(c){
  const ed=edOf(c),mine=choiceOf(c,"Metamagic");
  const rows=[["quickened","Quickened Spell",2],["subtle","Subtle Spell",1],["careful","Careful Spell",1],["distant","Distant Spell",1],["empowered","Empowered Spell",1],["extended","Extended Spell",1],["heightened","Heightened Spell",ed==="2024"?2:3],...(ed==="2024"?[["seeking","Seeking Spell",1],["transmuted","Transmuted Spell",1],["twinned","Twinned Spell (eligible higher-slot target)",1]]:Array.from({length:9},(_,i)=>["twinned:"+(i+1),"Twinned Spell, level "+(i+1),i+1]))];
  if(ed==="2014")rows.push(["twinned:0","Twinned Spell, cantrip",1]);
  const available=rows.filter(([id])=>mine.includes(id.split(":")[0]));
  return available.flatMap(([id,label,cost])=>[[id,label+" ("+cost+" points)"],...(ed==="2024"&&clsLv(c,"Sorcerer")>=20&&isActive(c,"Innate Sorcery")&&!c.apotheosisUsedThisTurn?[["free:"+id,label+" (Arcane Apotheosis: free)"]]:[])]);
}
function metamagicCost(c,id){
  if(typeof id!=="string")return Infinity;
  if(id.startsWith("free:"))return edOf(c)==="2024"&&clsLv(c,"Sorcerer")>=20&&isActive(c,"Innate Sorcery")&&!c.apotheosisUsedThisTurn?0:Infinity;
  if(id==="quickened")return 2;
  if(id==="heightened")return edOf(c)==="2024"?2:3;
  if(id.startsWith("twinned:"))return Math.max(1,+id.split(":")[1]);
  return 1;
}
// Spell-Storing Item stores a spell, not ordinary prepared casting or spell slots.
function artificerStoreSpellEligible(ed,level,s){
  if(level<11||!s||s.hb||s.ref||s.referenceOnly||s.rulesSummary||s.shadow||s.pend||(s.ed&&s.ed!==ed))return false;
  if(!Number.isInteger(s.l)||s.l<1||s.l>(ed==="2024"?3:2)||!(s.c||[]).includes("Artificer")||!/^(?:1\s+)?action$/i.test(String(s.t||"").trim()))return false;
  if(ed==="2024"&&(s.consumed||s.materialConsumed||/\bconsum(?:e[sd]?|ing|ption)\b/i.test(String(s.m||""))))return false;
  return true;
}
function artificerStoreOptions(c){
  if(clsLv(c,"Artificer")<11)return [];
  const ed=edOf(c);spLoad();
  return [...new Set((SP.data[ed]||[]).filter(s=>artificerStoreSpellEligible(ed,clsLv(c,"Artificer"),s)).map(s=>s.n))]
    .filter(n=>artificerStoreSpellEligible(ed,clsLv(c,"Artificer"),spellOf(ed,n))).sort().map(n=>[n,n]);
}
function artificerStoreItemOptions(c){
  if(clsLv(c,"Artificer")<11)return [];
  return (c.inv||[]).filter(i=>i.id&&i.n&&+i.qty>0).map(i=>[i.id,i.n,"Select only a Simple or Martial weapon or an item you can use as a spellcasting focus. Confirm eligibility with the DM."]);
}
function artificerStoredSpell(c){
  const s=c.artificerStored;
  if(!s||s.ed!==edOf(c)||clsLv(c,"Artificer")<11||!Number.isInteger(s.max)||s.max<2||s.max>100)return null;
  const item=(c.inv||[]).find(i=>i.id===s.iid&&+i.qty>0),spell=spellOf(s.ed,s.name);
  return item&&artificerStoreSpellEligible(s.ed,clsLv(c,"Artificer"),spell)?{item,spell,max:s.max}:null;
}
function artificerStore(c,name){
  if(!artificerStoreOptions(c).some(([n])=>n===name))return "Choose an eligible Artificer spell.";
  const iid=choiceOf(c,"Spell-Storing Item Object")[0];
  if(!artificerStoreItemOptions(c).some(([id])=>id===iid))return "Select a qualifying inventory object in Features first.";
  const max=Math.max(2,2*Math.trunc(+c.mods.int||0));
  c.artificerStored={ed:edOf(c),name,iid,max};c.used=c.used||{};c.used.artificerStored=0;
  return "Stored "+name+" in the selected object with "+max+" uses. Previous storage ends. Confirm the object and Long Rest eligibility.";
}
function channelDivinityAction(owner){
  return {kind:"instant",choices:c=>owner(c)==="Paladin"?[["oath","Oath option"],...(edOf(c)==="2024"?[["sense","Divine Sense"],...(clsLv(c,"Paladin")>=9?[["abjure","Abjure Foes"]]:[])]:[])]:[["turn","Turn Undead"],...(edOf(c)==="2024"?[["spark","Divine Spark"]]:[])],
    use:(c,ch)=>{
      const lv=clsLv(c,"Cleric"),wis=8+c.prof+c.mods.wis,cha=8+c.prof+c.mods.cha;
      if(ch==="spark")return roll("Divine Spark",`${lv>=18?4:lv>=13?3:lv>=7?2:1}d8${sgn(c.mods.wis)}`,"either",`Heal a creature or deal Radiant or Necrotic damage (CON save DC ${wis} for half).`,true);
      if(ch==="turn")return edOf(c)==="2024"?`Turn Undead: visible Undead within 30 feet make a WIS save DC ${wis}. On failure Frightened and Incapacitated for 1 minute; try to move away. Effect ends on damage, your Incapacitation or death.${lv>=5?" Sear Undead: roll "+Math.max(1,c.mods.wis)+"d8 Radiant damage for each failed save; this damage does not end the turning.":""}`:`Turn Undead: undead within 30 ft that can see or hear you make a WIS save DC ${wis} or are turned for 1 minute or until damaged.`;
      if(ch==="sense")return "Divine Sense: sense Celestials, Fiends and Undead within 60 ft for 10 minutes or until Incapacitated.";
      if(ch==="abjure")return `Abjure Foes: choose up to ${Math.max(1,c.mods.cha)} visible creatures within 60 ft. WIS save DC ${cha}; on failure Frightened for 1 minute or until damaged, limited to one of move, action or Bonus Action each turn.`;
      return "Channel Divinity: use your oath's option.";
    }};
}
// Source-reviewed item-plan workflow. Unverified catalog records are not acquirable.
const ARTIFICER_PLAN_TIERS={
  2:["Alchemy Jug","Bag of Holding","Cap of Water Breathing","Goggles of Night","Manifold Tool","Repeating Shot","Returning Weapon","Rope of Climbing","Sending Stones","Shield +1","+1 Shield","Wand of Magic Detection","Wand of Secrets","Wand of the War Mage +1","+1 Wand of the War Mage","Weapon +1","+1 Weapon","Wraps of Unarmed Power +1","+1 Wraps of Unarmed Power"],
  6:["Armor +1","+1 Armor","Boots of Elvenkind","Boots of the Winding Path","Cloak of Elvenkind","Cloak of the Manta Ray","Dazzling Weapon","Eyes of Charming","Eyes of Minute Seeing","Gloves of Thievery","Helm of Awareness","Lantern of Revealing","Mind Sharpener","Necklace of Adaptation","Pipes of Haunting","Repulsion Shield","Ring of Swimming","Ring of Water Walking","Sentinel Shield","Spell-Refueling Ring","Wand of Magic Missiles","Wand of Web","Weapon of Warning"],
  10:["Armor of Resistance","Dagger of Venom","Elven Chain","Ring of Feather Falling","Ring of Jumping","Ring of Mind Shielding","Shield +2","+2 Shield","Wand of the War Mage +2","+2 Wand of the War Mage","Weapon +2","+2 Weapon","Wraps of Unarmed Power +2","+2 Wraps of Unarmed Power"],
  14:["Armor +2","+2 Armor","Arrow-Catching Shield","Flame Tongue","Ring of Free Action","Ring of Protection","Ring of the Ram"]
};
const ARTIFICER_INFUSIONS={2:["Enhanced Arcane Focus","Enhanced Defense","Enhanced Weapon","Homunculus Servant","Mind Sharpener","Repeating Shot","Returning Weapon"],6:["Boots of the Winding Path","Radiant Weapon","Repulsion Shield","Resistant Armor","Spell-Refueling Ring"],10:["Helm of Awareness"],14:["Arcane Propulsion Armor"]};
ARTIFICER_INFUSIONS[2].push("Armor of Magical Strength");
const TINKER_GEAR=["Ball Bearings","Basket","Bedroll","Bell","Blanket","Block and Tackle","Glass Bottle","Bucket","Caltrops","Candle","Crowbar","Flask","Grappling Hook","Hunting Trap","Jug","Lamp","Manacles","Net","Oil","Paper","Parchment","Pole","Pouch","Rope","Sack","Shovel","Iron Spikes","String","Tinderbox","Torch","Vial"];
function artificerPlanLimits(ed,lv){
 if(lv<2)return {known:0,active:0};
 const steps=[6,10,14,18].filter(n=>lv>=n).length;
 return {known:4+(ed==="2024"?steps:2*steps),active:2+steps};
}
function artificerPlanEligible(lv,x){
 if(lv<2||!x||x.kind!=="magic"||x.ed!=="2024"||!x.id?.startsWith("2024-")||!x.d?.trim()||x.referenceOnly||x.rulesSummary||x.pend||itemRulesIncomplete(x))return false;
 // Generic rarity options exclude cursed items; explicit curse metadata is not
 // available for every item. Require a DM-reviewed plan in that case instead.
 return Object.entries(ARTIFICER_PLAN_TIERS).some(([min,names])=>lv>=+min&&names.includes(x.n));
}
function artificerPlanOptions(c){
 if(edOf(c)!=="2024"||clsLv(c,"Artificer")<2)return [];
 itLoad();return IT.data["2024"].filter(x=>artificerPlanEligible(clsLv(c,"Artificer"),x)).map(x=>[x.id,x.n+" ("+x.r+")","Catalog source: "+(x.src||"SRD")]);
}
function artificerKnownPlans(c){
 const allowed=new Set(artificerPlanOptions(c).map(x=>x[0]));
 return [...new Set(choiceOf(c,"Replicate Magic Item"))].filter(id=>allowed.has(id)).slice(0,artificerPlanLimits("2024",clsLv(c,"Artificer")).known);
}
function artificerReplicas(c){return (c.inv||[]).filter(i=>i.artificerOrigin?.kind==="replica"&&i.artificerOrigin.owner===c.id&&+i.qty===1&&i.ref===i.artificerOrigin.plan);}
function artificerInventoryItem(c,x,kind){
 return {id:uid("i"),ref:x.id,n:x.n,qty:1,w:x.w||0,att:!!x.att,attuned:false,value:x.c,note:kind==="replica"?"Artificer replica; not permanent":"Tinker's Magic; vanishes on Long Rest",artificerOrigin:{kind,owner:c.id,plan:x.id}};
}
function artificerRemove(c,i){c.inv=(c.inv||[]).filter(x=>x.id!==i.id);if(c.artificerStored?.iid===i.id){delete c.artificerStored;if(c.used)delete c.used.artificerStored;}}
function artificerForgetPlan(c,id){
 for(const i of artificerReplicas(c).filter(x=>x.ref===id))artificerRemove(c,i);
}
function artificerTinkerOptions(c){
 if(edOf(c)!=="2024"||clsLv(c,"Artificer")<1)return [];
 itLoad();return IT.data["2024"].filter(x=>x.kind==="gear"&&TINKER_GEAR.includes(x.n)&&!itemRulesIncomplete(x)).map(x=>[x.id,x.n]);
}
function artificerCreateTinker(c,id){
 if(!artificerTinkerOptions(c).some(x=>x[0]===id))return "No eligible gear.";
 const x=itFind(id);c.inv=c.inv||[];c.inv.push(artificerInventoryItem(c,x,"tinker"));return "Created "+x.n+" until the next Long Rest.";
}
function artificerCreateOptions(c){
 const active=new Set(artificerReplicas(c).map(i=>i.ref));
 return artificerPlanOptions(c).filter(x=>artificerKnownPlans(c).includes(x[0])&&!active.has(x[0]));
}
function artificerCreateReplica(c,id){
 if(!artificerCreateOptions(c).some(x=>x[0]===id))return "Select a known plan not already active.";
 const x=itFind(id),cap=artificerPlanLimits("2024",clsLv(c,"Artificer")).active;
 c.inv=c.inv||[];const active=artificerReplicas(c);
 while(active.length>=cap)artificerRemove(c,active.shift());
 c.inv.push(artificerInventoryItem(c,x,"replica"));return "Created "+x.n+".";
}
function artificerDrainOptions(c){
 if(edOf(c)!=="2024"||clsLv(c,"Artificer")<6)return [];
 return artificerReplicas(c).filter(i=>["Common","Uncommon","Rare"].includes(itFind(i.ref)?.r)).map(i=>[i.id,i.n]);
}
function artificerDrain(c,id){
 if(!artificerDrainOptions(c).some(x=>x[0]===id))return "No eligible replica.";
 const i=artificerReplicas(c).find(x=>x.id===id),L=itFind(i.ref).r==="Common"?1:2;
 if(temporarySlotCount(c,L)>=999)return "Temporary slot limit reached.";
 artificerRemove(c,i);createTemporarySlot(c,L);return "Replica dismissed; created level "+L+" slot until Long Rest.";
}
function artificerTransmuteOptions(c){
 if(edOf(c)!=="2024"||clsLv(c,"Artificer")<6)return [];
 return artificerReplicas(c).flatMap(i=>artificerCreateOptions(c).map(([id,n])=>[JSON.stringify([i.id,id]),i.n+" → "+n]));
}
function artificerTransmute(c,key){
 if(!artificerTransmuteOptions(c).some(x=>x[0]===key))return "No eligible transformation.";
 const [iid,id]=JSON.parse(key),i=artificerReplicas(c).find(x=>x.id===iid);
 const replacement=artificerInventoryItem(c,itFind(id),"replica");
 c.inv=c.inv.map(x=>x.id===iid?replacement:x);return "Transmuted "+i.n+" into "+replacement.n+".";
}
function artificerChargeOptions(c){
 if(edOf(c)!=="2024"||clsLv(c,"Artificer")<6)return [];
 const slots=pcResources(c).filter(r=>(/^slot[1-9]$/.test(r.key)||r.key==="pact")&&resLeft(c,r)>0);
 return artificerReplicas(c).flatMap(i=>{
  const x=itFind(i.ref),q=itemChargeContract(x),s=itemChargeState(i,x);
  if(!q||!s||s.left>=q.max)return [];
  return slots.map(r=>[JSON.stringify([i.id,r.key]),i.n+" · "+r.name]);
 });
}
function artificerCharge(c,key){
 if(!artificerChargeOptions(c).some(x=>x[0]===key))return "No eligible charged replica or slot.";
 const [iid,slot]=JSON.parse(key),i=artificerReplicas(c).find(x=>x.id===iid),x=itFind(i.ref),q=itemChargeContract(x),s=itemChargeState(i,x),r=pcResources(c).find(x=>x.key===slot);
 const L=slot==="pact"?+(r.name.match(/level (\d)/)||[])[1]:+slot.slice(4);
 if(!L)return "Unknown slot level.";
 const gain=Math.min(L,q.max-s.left);c.used=c.used||{};c.used[slot]=(+c.used[slot]||0)+1;s.left+=gain;
 return "Restored "+gain+" charges to "+i.n+".";
}
function artificerExpire(c){
 const old=(c.inv||[]).length;
 c.inv=(c.inv||[]).filter(i=>!(i.artificerOrigin?.owner===c.id&&i.artificerOrigin.kind==="tinker"));
 return old-c.inv.length;
}
const ACT = {
 "Tinker's Magic":{kind:"instant",choices:artificerTinkerOptions,use:artificerCreateTinker},
 "Replicate Magic Item":{kind:"instant",choices:artificerCreateOptions,use:artificerCreateReplica},
 "Drain Magic Item":{kind:"instant",choices:artificerDrainOptions,use:artificerDrain},
 "Transmute Magic Item":{kind:"instant",choices:artificerTransmuteOptions,use:artificerTransmute},
 "Charge Magic Item":{kind:"instant",choices:artificerChargeOptions,use:artificerCharge},
  "Store spell in item":{kind:"instant",choices:artificerStoreOptions,use:artificerStore},
  "Spell-Storing Item":{kind:"instant",use:c=>{const x=artificerStoredSpell(c);return x?x.item.n+" produces "+x.spell.n+" at its base level (Artificer Intelligence; DC "+(8+c.prof+c.mods.int)+", spell attack "+sgn(c.prof+c.mods.int)+"). The holder maintains Concentration if required. Resolve the effects manually.":"No eligible stored spell.";}},
  "Cunning Strike":{kind:"instant",choices:cunningStrikeOptions,use:(c,ch)=>{if(!ch)return "Choose an eligible effect.";const critical=ch.endsWith(":crit"),ids=ch.replace(/:crit$/,"").split("+"),p=cunningStrikePlan(clsLv(c,"Rogue"),ids,hasPoisonersKit(c),critical);if(!p)return "Invalid Cunning Strike.";const n=p.dice?rollDice(p.dice+"d6").total:0;return "Cunning Strike: "+n+" extra damage (weapon damage type), "+p.cost+" dice forgone; save DC "+(8+c.mods.dex+c.prof)+". "+p.effects.join(" ");}},
  "Brutal Strike":{kind:"instant",choices:brutalStrikeOptions,use:(c,ch)=>{if(!isActive(c,"Reckless Attack")||!brutalStrikeOptions(c).some(([id])=>id===ch))return "Requires an eligible Reckless Attack; forgo Advantage before rolling.";const critical=ch.endsWith(":crit"),n=(clsLv(c,"Barbarian")>=17?2:1)*(critical?2:1);return rollMsg("Brutal Strike",n+"d10",ch.replace(/:crit$/,"").replaceAll("+"," and ")+"; resolve target and movement effects manually.");}},
  "Arcane Apotheosis":{kind:"none"},
  "Flash of Genius":{kind:"instant",use:c=>"Flash of Genius: "+sgn(c.mods.int)+" to the eligible check or save. Apply manually."},
  "Wild Companion":{kind:"instant",choices:wildCompanionOptions,use:castWildCompanion},
  "Divine Intervention":{kind:"instant",choices:divineInterventionChoices,noCost:true,use:(c,ch)=>{const u=pcResources(c).find(r=>r.key==="divineIntervention");if(!u||!resLeft(c,u)||(+c.divineInterventionCooldown||0)>0||!divineInterventionChoices(c).some(([id])=>id===ch)||isActive(c,"Rage")||c.armorUntrained)return "No eligible spell or Divine Intervention use available.";const sp=spellOf("2024",ch);c.used=c.used||{};c.used.divineIntervention=1;const end=sp.co?concStart(c,ch):"";if(ch==="Wish")c.divineInterventionCooldown=rollDice("2d4").total;return {msg:"Divine Intervention: cast "+ch+" without a slot or Material components. Resolve spell effects manually."+(end?" "+end:"")+(ch==="Wish"?" Cooldown: "+c.divineInterventionCooldown+" Long Rests.":"")};}},
  "Uncanny Metabolism":{kind:"instant",use:c=>{const n=restoreResource(c,"ki",clsLv(c,"Monk")),healed=healSelf(c,clsLv(c,"Monk")+rollDice("1d"+maDie(c)).total);return "Uncanny Metabolism: regained "+n+" Focus Points and "+healed+" HP."}},
  "Perfect Focus":{kind:"instant",use:c=>"Perfect Focus: regained "+restoreResource(c,"ki",4)+" Focus Points."},
  "Superior Defense":{kind:"toggle",cost:3,fx:()=>({res:["acid","bludgeoning","cold","fire","lightning","necrotic","piercing","poison","psychic","radiant","slashing","thunder"],notes:["Superior Defense: 1 minute or until Incapacitated; end manually."]})},
  "Persistent Rage recovery":{kind:"instant",noCost:true,use:c=>{const R=pcResources(c),r=R.find(x=>x.key==="rage"),u=R.find(x=>x.key==="persistentRage");if(!r||!u||!resLeft(c,u))return "No recovery use remains.";const n=restoreResource(c,"rage",r.max);c.used.persistentRage=1;return "Recovered "+n+" Rage uses."}},
  "Wild Resurgence":{kind:"instant",choices:c=>[...pcResources(c).filter(r=>/^slot[1-9]$/.test(r.key)&&resLeft(c,r)>0).map(r=>[r.key,"Spend "+r.name+" to regain Wild Shape"]),["create","Spend Wild Shape to recover a level 1 slot"]],use:wildResurgence},
  "Sorcery Incarnate":{kind:"instant",noCost:true,use:c=>{const R=pcResources(c),i=R.find(x=>x.key==="innateSorcery"),s=R.find(x=>x.key==="sorc");if(!i||!s||resLeft(c,i)>0||resLeft(c,s)<2||isActive(c,"Innate Sorcery"))return "Requires no remaining Innate Sorcery uses, an inactive effect and 2 Sorcery Points.";c.used.sorc=(+c.used.sorc||0)+2;c.active={...(c.active||{}),"Innate Sorcery":true};return "Innate Sorcery activated for 1 minute."}},
  "Innate Sorcery":{kind:"toggle",fx:()=>({notes:["Sorcerer spells: +1 save DC and Advantage on spell attacks. End after 1 minute."]})},
  "Magical Cunning":{kind:"instant",noCost:true,use:c=>{const n=magicalCunningRecovery(c);return n?`Magical Cunning: recovered ${n} Pact Magic slot(s).`:"No eligible expended Pact Magic slots or no use remains."}},
  "Tireless":{kind:"instant",use:c=>{const n=Math.max(1,rollDice("1d8").total+c.mods.wis);const applied=giveTemp(c,n);return `Tireless: rolled ${n} temporary HP${applied?"; applied.":"; existing temporary HP is at least as high."}`;}},
  "Nature’s Veil":{kind:"instant",use:c=>{c.conds={...(c.conds||{}),invisible:true};return "Invisible until the end of your next turn; remove the condition then."; }},
  "Telekinetic Shove": { kind: "instant", use: c => `Telekinetic Shove: Strength save DC ${8 + c.prof + c.mods[featCastingAbility(c, "Telekinetic")]}. On a failure, pull or push 5 ft.` },
  // ---------- Barbarian
  Rage: { kind: "toggle", fx: c => ({ atk: [{ f: edOf(c)==="2024"?"strWeapon":"strMelee", dmg: rageDmg(c), label: `Rage +${rageDmg(c)}` }], res: ["bludgeoning", "piercing", "slashing"], notes: ["Advantage on Strength checks and Strength saving throws", "You can't cast spells or concentrate while raging"] }),
    start: c => { const bl=characterSubclassLevel(c,"Barbarian","Path of the World Tree"),tree=bl>=3&&giveTemp(c,bl); if (c.conc) { toast(`Rage ends your concentration on ${c.conc.spell}.`); delete c.conc; } return `${c.name} rages: +${rageDmg(c)} damage on Strength melee attacks, resistance to bludgeoning, piercing and slashing.${tree ? ` Vitality of the Tree: ${bl} temporary hit points.` : ""}`; } },
  "Reckless Attack": { kind: "toggle", fx: () => ({ atk: [{ f: "strMelee", adv: "advantage (Reckless)" }], notes: ["Attacks against you have advantage until your next turn"] }), start: () => "Reckless Attack: advantage on your Strength attacks this turn; attacks against you have advantage until your next turn." },
  Frenzy: { kind: "toggle", needs: "Rage", fx: c => edOf(c) === "2024" ? { notes: [`Frenzy: the first Reckless Strength hit each turn deals +${rageDmg(c)}d6`] } : { notes: ["Frenzy: one melee weapon attack as a bonus action each turn; one level of exhaustion when the rage ends"] } },
  "Totem Spirit": { kind: "persist", choices: [["bear", "Bear"], ["eagle", "Eagle"], ["wolf", "Wolf"]], fx: (c, ch) => !isActive(c, "Rage") ? {} : ch === "bear" ? { res: DMG_LIST.filter(d => d !== "psychic"), notes: ["Bear totem: resistance to all damage except psychic while raging"] } : ch === "eagle" ? { notes: ["Eagle totem: enemies have disadvantage on opportunity attacks against you; Dash as a bonus action"] } : { notes: ["Wolf totem: friends have advantage on melee attacks against enemies within 5 ft of you"] } },
  "Aspect of the Beast": { kind: "persist", choices: [["bear", "Bear"], ["eagle", "Eagle"], ["wolf", "Wolf"]], fx: (c, ch) => ({ notes: [ch === "bear" ? "Aspect of the Bear: double carrying capacity, advantage on Strength checks to push, pull, lift or break" : ch === "eagle" ? "Aspect of the Eagle: see clearly up to 1 mile; dim light doesn't hinder Perception" : "Aspect of the Wolf: track at a fast pace, move stealthily at a normal pace"] }) },
  "Totemic Attunement": { kind: "persist", choices: [["bear", "Bear"], ["eagle", "Eagle"], ["wolf", "Wolf"]], fx: (c, ch) => !isActive(c, "Rage") ? {} : ch === "eagle" ? { fly: "speed", notes: ["Eagle attunement: fly at your walking speed while raging (you fall at the end of your turn if nothing holds you up)"] } : ch === "bear" ? { notes: ["Bear attunement: enemies within 5 ft have disadvantage attacking anyone but you"] } : { notes: ["Wolf attunement: bonus action to knock a Large or smaller creature you hit prone"] } },
  "Rage of the Wilds": { kind: "persist", choices: [["bear", "Bear"], ["eagle", "Eagle"], ["wolf", "Wolf"]], fx: (c, ch) => !isActive(c, "Rage") ? {} : ch === "bear" ? { res: DMG_LIST.filter(d => !["necrotic", "psychic", "radiant"].includes(d)), notes: ["Bear: resistance to every damage type except force, necrotic, psychic and radiant while raging"] } : ch === "eagle" ? { notes: ["Eagle: Dash and Disengage as part of entering the rage, and as a bonus action while raging"] } : { notes: ["Wolf: allies have advantage on attacks against enemies within 5 ft of you"] } },
  "Aspect of the Wilds": { kind: "persist", choices: [["owl", "Owl"], ["panther", "Panther"], ["salmon", "Salmon"]], fx: (c, ch) => ch === "owl" ? { notes: ["Owl: darkvision 60 ft (or +60 ft)"] } : ch === "panther" ? { climb: "speed" } : { swim: "speed" } },
  "Power of the Wilds": { kind: "persist", choices: [["falcon", "Falcon"], ["lion", "Lion"], ["ram", "Ram"]], fx: (c, ch) => !isActive(c, "Rage") ? {} : ch === "falcon" ? (wearingArmor(c) ? { notes: ["Falcon: fly only works while you aren't wearing armor"] } : { fly: "speed" }) : ch === "lion" ? { notes: ["Lion: enemies within 5 ft have disadvantage attacking anyone but you"] } : { notes: ["Ram: knock a Large or smaller creature you hit with a melee attack prone"] } },
  "Warrior of the Gods": { kind: "instant", use: c => healMsg(c, "Warrior of the Gods", rollDice("1d12")) },
  "Rage of the Gods": { kind: "toggle", fx: () => ({ fly: 60, res: ["necrotic", "psychic", "radiant"], notes: ["Rage of the Gods: when an ally within 30 ft would drop to 0 hit points, spend a rage use to set them to hit points equal to your barbarian level"] }) },
  "Zealous Presence": { kind: "instant", use: () => "Zealous Presence: up to ten creatures within 60 ft gain advantage on attacks and saves until your next turn." },
  // ---------- Bard
  "Bardic Inspiration": { kind: "instant", use: c => `Bardic Inspiration: give a creature within 60 ft a d${clsLv(c,"Bard") >= 15 ? 12 : clsLv(c,"Bard") >= 10 ? 10 : clsLv(c,"Bard") >= 5 ? 8 : 6}.` },
  "Cutting Words": { kind: "instant", use: c => rollMsg("Cutting Words", `1d${clsLv(c,"Bard") >= 15 ? 12 : clsLv(c,"Bard") >= 10 ? 10 : clsLv(c,"Bard") >= 5 ? 8 : 6}`, "Subtract it from the creature's roll") },
  "Peerless Skill": { kind: "instant", use: c => rollMsg("Peerless Skill", `1d${clsLv(c,"Bard") >= 15 ? 12 : clsLv(c,"Bard") >= 10 ? 10 : clsLv(c,"Bard") >= 5 ? 8 : 6}`, "Add it to your roll") },
  "Mantle of Inspiration": { kind: "instant", use: c => { const r = rollDice(`1d${clsLv(c,"Bard") >= 15 ? 12 : clsLv(c,"Bard") >= 10 ? 10 : clsLv(c,"Bard") >= 5 ? 8 : 6}`); return { title: "Mantle of Inspiration", msg: `Mantle of Inspiration: ${r.text}. Allies within 60 ft gain ${2 * r.total} temporary hit points and can move without provoking opportunity attacks.`, amount: 2 * r.total, kind: "temp" }; } },
  "Mantle of Majesty": { kind: "toggle", fx: () => ({ notes: ["Mantle of Majesty: cast command as a bonus action each turn (concentration, 1 minute)"] }) },
  "Unbreakable Majesty": { kind: "toggle", fx: () => ({ notes: ["Unbreakable Majesty: a creature that attacks you must make a CHA save or pick a new target"] }) },
  // ---------- Cleric
  "Channel Divinity": channelDivinityAction(c=>clsLv(c,"Cleric")>=2?"Cleric":"Paladin"),
  "Channel Divinity (Cleric)":channelDivinityAction(()=>"Cleric"),
  "Channel Divinity (Paladin)":channelDivinityAction(()=>"Paladin"),
  "Warding Flare": { kind: "instant", use: () => "Warding Flare: impose disadvantage on that attack roll." },
  "Wrath of the Storm": { kind: "instant", use: c => roll("Wrath of the Storm", "2d8", "damage", `Lightning or thunder damage to the attacker (DEX save DC ${8 + c.prof + c.mods.wis} for half)`, true) },
  "War Priest": { kind: "instant", use: () => "War Priest: make one weapon attack as a bonus action." },
  "Channel Divinity: Preserve Life": { kind: "instant", use: c => ({ title: "Preserve Life", msg: `Preserve Life: restore up to ${5 * clsLv(c,"Cleric")} hit points among creatures within 30 ft (none above half their maximum). Apply it to one creature here, or use the target's own sheet to split it.`, amount: 5 * clsLv(c,"Cleric"), kind: "heal" }) },
  "Preserve Life": { kind: "instant", use: c => ({ title: "Preserve Life", msg: `Preserve Life: restore up to ${5 * clsLv(c,"Cleric")} hit points among creatures within 30 ft (none above half their maximum). Apply it to one creature here, or use the target's own sheet to split it.`, amount: 5 * clsLv(c,"Cleric"), kind: "heal" }) },
  "Channel Divinity: Radiance of the Dawn": { kind: "instant", use: c => area("Radiance of the Dawn", `2d10+${clsLv(c,"Cleric")}`, "con", 8 + c.prof + c.mods.wis, "Radiant", "Magical darkness within 30 ft is dispelled. Each hostile creature within 30 ft makes a CON save: radiant damage, half on a success.") },
  "Radiance of the Dawn": { kind: "instant", use: c => area("Radiance of the Dawn", `2d10+${clsLv(c,"Cleric")}`, "con", 8 + c.prof + c.mods.wis, "Radiant", "Magical darkness within 30 ft is dispelled. Each creature you choose within 30 ft makes a CON save: radiant damage, half on a success.") },
  "Channel Divinity: Destructive Wrath": { kind: "instant", use: () => "Destructive Wrath: deal maximum lightning or thunder damage on this roll." },
  "Channel Divinity: Guided Strike": { kind: "instant", use: () => "Guided Strike: +10 to this attack roll." },
  "Guided Strike": { kind: "instant", use: () => "Guided Strike: +10 to the missed attack roll." },
  "Channel Divinity: War God's Blessing": { kind: "instant", use: () => "War God's Blessing: +10 to an ally's attack roll." },
  "War God's Blessing": { kind: "toggle", fx: () => ({ notes: ["War God's Blessing: shield of faith or spiritual weapon without concentration for 1 minute"] }) },
  "Channel Divinity: Invoke Duplicity": { kind: "toggle", fx: () => ({ notes: ["Invoke Duplicity: cast spells from your duplicate's space; advantage on attacks against creatures within 5 ft of both of you"] }) },
  "Invoke Duplicity": { kind: "toggle", fx: () => ({ notes: ["Invoke Duplicity: cast spells from the illusion's space; advantage on attacks against creatures within 5 ft of it"] }) },
  "Channel Divinity: Cloak of Shadows": { kind: "toggle", fx: () => ({ notes: ["Invisible until the end of your next turn, or until you attack or cast a spell"] }) },
  "Channel Divinity: Charm Animals and Plants": { kind: "instant", use: c => `Charm Animals and Plants: beasts and plants within 30 ft make a WIS save (DC ${8 + c.prof + c.mods.wis}) or are charmed for 1 minute.` },
  "Channel Divinity: Knowledge of the Ages": { kind: "toggle", fx: () => ({ notes: ["Knowledge of the Ages: proficiency with one skill or tool for 10 minutes"] }) },
  "Channel Divinity: Read Thoughts": { kind: "instant", use: c => `Read Thoughts: a creature within 60 ft makes a WIS save (DC ${8 + c.prof + c.mods.wis}).` },
  "Blessing of the Trickster": { kind: "instant", use: () => "Blessing of the Trickster: advantage on Stealth checks for the target." },
  // ---------- Druid
  "Wild Shape": { kind: "toggle", choices: c => wildBeasts(c).map(m => [m.id, `${m.n} (CR ${crText(m.cr)})`]),
    fx: (c, ch) => { const B = beastForm(ch), moon = druidSub(c) === "Circle of the Moon", ed = edOf(c); if (!B) return { notes: ["Wild Shape: use the beast's stat block"] };
      const ac = ed === "2024" && moon ? Math.max(B.m.ac, 13 + c.mods.wis) : B.m.ac;
      return { form: { name: B.m.n, ac, acNote: ed === "2024" && moon && ac > B.m.ac ? "Circle Forms" : B.m.acd || "", sp: B.sp, attacks: B.attacks, scores: B.m.scores.slice(0, 3), hp: B.m.hp, traits: (B.m.traits || []).map(t => t[0]), senses: B.m.senses, size: B.m.size, magic: moon && clsLv(c,"Druid") >= 6 },
        notes: [`You keep your INT, WIS and CHA, features, proficiencies and hit points${ed === "2014" ? " (the beast's hit points come first)" : ""}. ${ed === "2014" ? "You can't cast spells in beast form." : "You can't cast spells, but you can keep concentrating on one."}`] }; },
    start: (c, ch) => { const ed = edOf(c), moon = druidSub(c) === "Circle of the Moon", B = beastForm(ch), t = ed === "2024" ? (moon ? 3 * clsLv(c,"Druid") : clsLv(c,"Druid")) : 0, got = t && giveTemp(c, t); if (ed === "2014" && B) c.formHp = B.m.hp; return `${c.name} becomes ${B ? (/^[aeiou]/i.test(B.m.n) ? "an " : "a ") + B.m.n : "a beast"}.${got ? ` ${t} temporary hit points.` : ""}${ed === "2014" && B ? ` Beast hit points: ${B.m.hp}.` : ""}`; } },
  "Combat Wild Shape": { kind: "none" }, "Circle Forms": { kind: "none" },
  "Starry Form": { kind: "toggle", choices: [["archer", "Archer"], ["chalice", "Chalice"], ["dragon", "Dragon"]], fx: (c, ch) => { const d = clsLv(c,"Druid") >= 10 ? "2d8" : "1d8", w = c.mods.wis; return ch === "archer" ? { attacks: [{ name: "Luminous arrow (bonus action)", hit: c.prof + w, die: d, mod: w, type: "radiant", ab: "wis", altNote: "ranged spell attack, 60 ft" }] } : ch === "chalice" ? { notes: [`Chalice: when you heal with a spell slot, another creature within 30 ft regains ${d} + ${w}`] } : { fly: clsLv(c,"Druid") >= 10 ? 20 : null, notes: ["Dragon: treat d20 rolls of 9 or lower as 10 on INT and WIS checks and concentration saves"] }; }, start: () => "Starry Form for 10 minutes." },
  "Wrath of the Sea": { kind: "toggle", fx: c => { const n = Math.max(1, c.mods.wis); return { attacks: [{ name: "Wrath of the Sea (bonus action)", save: `CON save DC ${8 + c.prof + c.mods.wis}`, die: `${n}d6`, mod: 0, type: "cold", altNote: "pushed up to 15 ft" }], ...(clsLv(c,"Druid") >= 10 && (c.feats || []).some(f => f.f === "Stormborn") ? { fly: "speed", res: ["cold", "lightning", "thunder"] } : {}), notes: [`Wrath of the Sea: ${clsLv(c,"Druid") >= 6 ? 10 : 5} ft emanation for 10 minutes`] }; } },
  "Land's Aid": { kind: "instant", use: c => { const n = clsLv(c,"Druid") >= 14 ? 4 : clsLv(c,"Druid") >= 10 ? 3 : 2, h = rollDice(`${n}d6`); return area("Land's Aid", `${n}d6`, "con", 8 + c.prof + c.mods.wis, "Necrotic", "Creatures you choose in a 10 ft sphere make a CON save: necrotic damage, half on a success.", { note: `One creature of your choice in the sphere also regains ${h.text.split(" = ").pop()} hit points (${h.text}).`, heal: h.total }); } },
  "Moonlight Step": { kind: "instant", use: () => "Moonlight Step: teleport up to 30 ft; advantage on your next attack this turn." },
  "Nature's Sanctuary": { kind: "toggle", fx: () => ({ notes: ["Nature's Sanctuary: you and allies in the trees have half cover and resistance to your land's damage type"] }) },
  "Star Map": { kind: "instant", use: () => "Guiding bolt cast without a spell slot." },
  "Cosmic Omen": { kind: "instant", use: () => rollMsg("Cosmic Omen", "1d6", "Add it to an ally's roll (Weal) or subtract it from an enemy's (Woe)") },
  "Natural Recovery": { kind: "instant", dialog: (c, a) => recoveryDialog(c, "Natural Recovery", a.res) },
  // ---------- Fighter
  "Second Wind": { kind: "instant", use: c => healMsg(c, "Second Wind", rollDice(`1d10+${classFeatureLevel(c, "Fighter")}`)) },
  "Action Surge": { kind: "instant", use: () => "Action Surge: take one additional action this turn." },
  Indomitable: { kind: "instant", use: c => `Indomitable: reroll the failed saving throw${edOf(c) === "2024" ? `, adding +${classFeatureLevel(c, "Fighter")}` : ""}.` },
  "Combat Superiority": { kind: "instant", choices: c => { const mine = choiceOf(c, "Combat Superiority").map(id => MANEUVERS.find(m => m[0] === id)).filter(Boolean).map(m => [m[0], m[1]]); return mine.length ? mine : [["trip", "Trip Attack"], ["riposte", "Riposte"], ["precision", "Precision Attack"], ["disarm", "Disarming Attack"], ["push", "Pushing Attack"], ["menace", "Menacing Attack"], ["other", "Other maneuver"]]; },
    use: (c, ch) => { const lv=clsLv(c,"Fighter"),d = lv >= 18 ? 12 : lv >= 10 ? 10 : 8, dc = 8 + c.prof + Math.max(c.mods.str, c.mods.dex), lab = (MANEUVERS.find(m => m[0] === ch) || [, "Maneuver"])[1]; return ch === "precision" ? rollMsg(lab, `1d${d}`, "Add it to the attack roll") : roll(lab, `1d${d}`, "damage", `Extra damage on the hit${["trip", "disarm", "push", "menace"].includes(ch) ? `; the target makes a save against DC ${dc}` : ""}`); } },
  "Psionic Power": { kind: "instant", choices: c => c.subclass === "Soulknife" ? [["knack", "Psi-Bolstered Knack"], ["whisper", "Psychic Whispers"]] : [["field", "Protective Field"], ["strike", "Psionic Strike"], ["move", "Telekinetic Movement"]],
    use: (c, ch) => { const d = `1d${psiDie(c)}`, i = c.mods.int; return ch === "field" ? rollMsg("Protective Field", `${d}${sgn(i)}`, "Reduce the damage by that much") : ch === "strike" ? roll("Psionic Strike", `${d}${sgn(i)}`, "damage", "Force damage to the target") : ch === "knack" ? rollMsg("Psi-Bolstered Knack", d, "Add it to the failed ability check") : ch === "whisper" ? "Psychic Whispers: telepathy with creatures you choose for hours equal to a Psionic Energy die." : "Telekinetic Movement: move a Large or smaller object or willing creature up to 30 ft."; } },
  "Bulwark of Force": { kind: "toggle", fx: () => ({ notes: ["Bulwark of Force: you and chosen allies within 30 ft have half cover"] }) },
  // ---------- Monk
  Ki: { kind: "instant", choices: [["flurry", "Flurry of Blows"], ["patient", "Patient Defense"], ["step", "Step of the Wind"]], use: (c, ch) => ch === "flurry" ? "Flurry of Blows: two unarmed strikes as a bonus action." : ch === "patient" ? "Patient Defense: Dodge as a bonus action." : "Step of the Wind: Dash or Disengage as a bonus action; jump distance doubled." },
  "Monk's Focus":{kind:"instant",choices:[["flurry","Flurry of Blows (1)"],["patient","Patient Defense (1)"],["step","Step of the Wind (1)"],["freeDash","Dash (free)"],["freeDisengage","Disengage (free)"]],cost:(c,ch)=>ch.startsWith("free")?0:1,use:(c,ch)=>{if(ch==="freeDash")return "Dash as a Bonus Action.";if(ch==="freeDisengage")return "Disengage as a Bonus Action.";if(ch==="flurry")return "Flurry of Blows: "+(clsLv(c,"Monk")>=10?3:2)+" Unarmed Strikes.";if(ch==="patient"){const n=clsLv(c,"Monk")>=10?rollDice("2d"+maDie(c)).total:0;if(n)giveTemp(c,n);return "Disengage and Dodge as a Bonus Action."+(n?" Rolled "+n+" temporary HP.":"");}return "Dash and Disengage; double jump distance.";}},
  "Stunning Strike": {kind:"instant",use:c=>edOf(c)==="2024"?`CON save DC ${8+c.prof+c.mods.wis}: on failure Stunned until your next turn starts; on success halved Speed and Advantage on next incoming attack until then.`:`CON save DC ${8+c.prof+c.mods.wis} or Stunned until the end of your next turn.`},
  "Wholeness of Body": { kind: "instant", use: c => healMsg(c, "Wholeness of Body", rollDice(edOf(c) === "2024" ? `1d${maDie(c)}${sgn(c.mods.wis)}` : String(3 * clsLv(c,"Monk")))) },
  "Quivering Palm": { kind: "instant", use: c => edOf(c) === "2024" ? roll("Quivering Palm", "10d12", "damage", `Force damage (CON save DC ${8 + c.prof + c.mods.wis} for half)`, true) : roll("Quivering Palm", "10d10", "damage", `Necrotic damage if the target succeeds on its CON save (DC ${8 + c.prof + c.mods.wis}); on a failure it drops to 0 hit points`) },
  "Shadow Arts": { kind: "instant", use: () => "Shadow Arts: cast darkness (you can see through it)." },
  "Improved Shadow Step": { kind: "instant", use: () => "Improved Shadow Step: teleport up to 60 ft and make an Unarmed Strike." },
  "Cloak of Shadows": { kind: "toggle", fx: () => ({ notes: ["Cloak of Shadows: invisible while in dim light or darkness"] }) },
  "Disciple of the Elements": { kind: "instant", use: () => "Elemental discipline used." },
  "Elemental Attunement": { kind: "toggle", fx: c => ({ atk: [{ f: "unarmed", label: "reach +10 ft, elemental damage" }], ...(clsLv(c,"Monk") >= 11 && (c.feats || []).some(f => f.f === "Stride of the Elements") ? { fly: "speed", swim: "speed" } : {}), notes: ["Elemental Attunement: Unarmed Strikes reach 10 ft farther, can deal acid, cold, fire, lightning or thunder damage, and push or pull 10 ft (STR save)"] }) },
  "Elemental Burst": { kind: "instant", use: c => area("Elemental Burst", `3d${maDie(c)}`, "dex", 8 + c.prof + c.mods.wis, "Elemental", "Each creature in a 20 ft sphere within 120 ft makes a DEX save: acid, cold, fire, lightning or thunder damage (your choice), half on a success.") },
  "Hand of Harm": { kind: "instant", use: c => roll("Hand of Harm", `1d${maDie(c)}${sgn(c.mods.wis)}`, "damage", "Necrotic damage") },
  "Hand of Healing": { kind: "instant", use: c => roll("Hand of Healing", `1d${maDie(c)}${sgn(c.mods.wis)}`, "heal", "Hit points restored to the creature you touch") },
  "Flurry of Healing and Harm": { kind: "instant", use: () => "Hand of Harm used with Flurry of Blows without spending a Focus Point." },
  "Hand of Ultimate Mercy": { kind: "instant", use: c => roll("Hand of Ultimate Mercy", `4d10${sgn(c.mods.wis)}`, "heal", "The creature returns to life with that many hit points") },
  // ---------- Paladin
  "Lay on Hands": { kind: "instant", choices: [["self", "Heal yourself"], ["5", "5 points to another"], ["10", "10 points to another"], ["cure", "Cure a poison (5 points)"]],
    cost: (c, ch) => ch === "self" ? Math.min(resLeft(c, pcResources(c).find(r => r.key === "loh")), Math.max(0, (+c.hp || 0) - (+c.hpCur || 0))) : ch === "10" ? 10 : 5,
    use: (c, ch, spent) => ch === "self" ? `Lay on Hands: you regain ${healSelf(c, spent)} hit points (${c.hpCur}/${c.hp}).` : ch === "cure" ? (edOf(c)==="2024"?"Lay on Hands: remove the Poisoned condition from the touched creature.":"Lay on Hands: one poison or disease ended.") : { title: "Lay on Hands", msg: `Lay on Hands: ${spent} hit points from your pool.`, amount: spent, kind: "heal" } },
  "Divine Smite": { kind: "instant", choices: c => pcResources(c).filter(r => /^slot\d$/.test(r.key) && resLeft(c, r) > 0).map(r => [r.key, `${r.name.replace(" slots", "")} slot`]),
    noCost: true, use: (c, ch) => { if (!ch) return "No spell slots left to smite with."; const L = +ch.slice(4), n = Math.min(5, 1 + L); c.used = c.used || {}; c.used[ch] = (+c.used[ch] || 0) + 1; return roll(`Divine Smite (level ${L} slot)`, `${n}d8`, "damage", "Radiant damage on the hit (roll another 1d8 against undead and fiends)"); } },
  "Divine Sense": { kind: "instant", use: () => "Divine Sense: celestials, fiends and undead within 60 ft revealed." },
  "Cleansing Touch": { kind: "instant", use: () => "Cleansing Touch: one spell ended." },
  "Channel Divinity: Sacred Weapon": { kind: "toggle", fx: c => ({ atk: [{ f: "weapon", hit: Math.max(1, c.mods.cha), label: `Sacred Weapon +${Math.max(1, c.mods.cha)}` }], notes: ["Sacred Weapon: your weapon sheds light and counts as magical"] }) },
  "Sacred Weapon": { kind: "toggle", fx: c => ({ atk: [{ f: "weapon", hit: Math.max(1, c.mods.cha), label: `Sacred Weapon +${Math.max(1, c.mods.cha)}` }], notes: ["Sacred Weapon: your weapon sheds light and can deal radiant damage"] }) },
  "Channel Divinity: Vow of Enmity": { kind: "toggle", fx: () => ({ atk: [{ f: "all", adv: "advantage vs vowed foe" }] }) },
  "Vow of Enmity": { kind: "toggle", fx: () => ({ atk: [{ f: "all", adv: "advantage vs vowed foe" }] }) },
  "Channel Divinity: Abjure Enemy": { kind: "instant", use: c => `Abjure Enemy: a creature within 60 ft makes a WIS save (DC ${8 + c.prof + c.mods.cha}) or is frightened with speed 0.` },
  "Channel Divinity: Turn the Unholy": { kind: "instant", use: c => `Turn the Unholy: fiends and undead within 30 ft make a WIS save (DC ${8 + c.prof + c.mods.cha}).` },
  "Channel Divinity: Turn the Faithless": { kind: "instant", use: c => `Turn the Faithless: fey and fiends within 30 ft make a WIS save (DC ${8 + c.prof + c.mods.cha}).` },
  "Channel Divinity: Nature's Wrath": { kind: "instant", use: () => "Nature's Wrath: spectral vines restrain the target." },
  "Nature's Wrath": { kind: "instant", use: c => `Nature's Wrath: creatures within 15 ft make a STR save (DC ${8 + c.prof + c.mods.cha}) or are restrained.` },
  "Inspiring Smite": { kind: "instant", use: c => roll("Inspiring Smite", `2d8+${clsLv(c,"Paladin")}`, "temp", "Temporary hit points to share among creatures within 30 ft") },
  "Peerless Athlete": { kind: "toggle", fx: () => ({ notes: ["Peerless Athlete: advantage on Athletics and Acrobatics checks; longer jumps"] }) },
  "Glorious Defense": { kind: "instant", use: c => `Glorious Defense: +${Math.max(1, c.mods.cha)} to the ally's AC against that attack.` },
  "Holy Nimbus": { kind: "toggle", fx: () => ({ notes: ["Holy Nimbus: bright light; enemies starting their turn in it take radiant damage; advantage on saves against fiends and undead"] }) },
  "Elder Champion": { kind: "toggle", fx: () => ({ notes: ["Elder Champion: regain 10 hit points at the start of each turn; paladin spells as a bonus action; enemies nearby have disadvantage on saves against your spells"] }) },
  "Avenging Angel": { kind: "toggle", fx: () => ({ fly: 60, notes: ["Avenging Angel: frightening aura; attacks against frightened creatures have advantage"] }) },
  "Living Legend": { kind: "toggle", fx: () => ({ notes: ["Living Legend: advantage on Charisma checks; once per turn turn a miss into a hit; reroll failed saves"] }) },
  "Undying Sentinel": { kind: "instant", use: c => { c.hpCur = edOf(c) === "2024" ? Math.min(+c.hp || 0, 1 + 3 * clsLv(c,"Paladin")) : 1; return `Undying Sentinel: you drop to ${c.hpCur} hit point${c.hpCur === 1 ? "" : "s"} instead of 0.`; } },
  // ---------- Ranger
  "Hunter's Mark": { kind: "toggle", fx: c => ({ atk: [{ f: "weapon", extra: `${(c.feats || []).some(f => f.f === "Foe Slayer") ? "1d10" : "1d6"} force vs marked`, label: "Hunter's Mark" }] }), start: () => "Hunter's Mark cast without a spell slot." },
  "Dread Ambusher": { kind: "instant", use: c => roll("Dread Ambusher", (c.feats || []).some(f => f.f === "Stalker's Flurry") ? "2d8" : "2d6", "damage", "Psychic damage on this hit") },
  "Fey Reinforcements": { kind: "instant", use: () => "Summon fey cast without a spell slot." },
  "Misty Wanderer": { kind: "instant", use: () => "Misty step cast without a spell slot." },
  // ---------- Rogue
  "Psychic Veil": { kind: "toggle", fx: () => ({ notes: ["Psychic Veil: invisible for 1 hour, until you damage a creature or force a save"] }) },
  "Rend Mind": { kind: "instant", use: c => `Rend Mind: the target makes a WIS save (DC ${8 + c.prof + c.mods.dex}) or is stunned for 1 minute.` },
  "Spell Thief": { kind: "instant", use: c => `Spell Thief: the caster makes an INT save against DC ${8 + c.prof + c.mods.int}.` },
  "Stroke of Luck": { kind: "instant", use: () => "Stroke of Luck: the miss becomes a hit, or the check's d20 counts as a 20." },
  // ---------- Sorcerer
  "Font of Magic":{kind:"instant",noCost:true,choices:c=>[...[1,2,3,4,5].filter(L=>canCreateSorcererSlot(c,L)).map(L=>["make"+L,"Create level "+L+" slot ("+SLOT_CREATION_COST[L]+" points)"]),...pcResources(c).filter(r=>(/^slot[1-9]$/.test(r.key)||r.key==="pact")&&resLeft(c,r)>0).map(r=>["burn"+(r.key==="pact"?"pact":r.key.slice(4)),"Convert "+r.name+" to Sorcery Points"])],use:convertFontOfMagic},
  Metamagic:{kind:"instant",choices:metamagicOptions,cost:metamagicCost,use:(c,ch,spent)=>{if(!ch)return "Select a learned Metamagic option.";if(ch.startsWith("free:"))c.apotheosisUsedThisTurn=true;return "Metamagic: "+ch.replace(/^free:/,"")+"; "+spent+" Sorcery Points spent. Resolve casting modifications manually.";}},
  "Dragon Wings": { kind: "toggle", fx: c => ({ fly: edOf(c) === "2024" ? 60 : "speed", notes: ["Dragon Wings: you can't use them while wearing armor not made for them"] }) },
  "Draconic Presence": { kind: "toggle", fx: () => ({ notes: ["Draconic Presence: 60 ft aura of awe or fear (WIS save)"] }) },
  "Revelation in Flesh": { kind: "toggle", choices: [["sight", "See the Invisible"], ["fly", "Glistening Flight"], ["swim", "Aquatic Adaptation"], ["worm", "Wormlike Movement"]], fx: (c, ch) => ch === "fly" ? { fly: "speed" } : ch === "swim" ? { swim: "2speed", notes: ["Aquatic Adaptation: breathe underwater"] } : ch === "sight" ? { notes: ["See invisible creatures within 60 ft"] } : { notes: ["Wormlike Movement: squeeze through 1-inch spaces, escape grapples with 5 ft of movement"] } },
  "Trance of Order": { kind: "toggle", fx: () => ({ notes: ["Trance of Order: attacks against you can't have advantage; your d20 rolls of 9 or lower count as 10"] }) },
  "Tides of Chaos": { kind: "instant", use: () => "Tides of Chaos: advantage on this roll." },
  "Bend Luck": { kind: "instant", cost: c => edOf(c) === "2024" ? 1 : 2, use: () => rollMsg("Bend Luck", "1d4", "Add it to or subtract it from the roll") },
  "Bastion of Law": { kind: "instant", choices: [["1", "1 point"], ["2", "2 points"], ["3", "3 points"], ["4", "4 points"], ["5", "5 points"]], cost: (c, ch) => +ch || 1, use: (c, ch, spent) => `Bastion of Law: the creature gets ${spent}d8 ward dice.` },
  "Psionic Sorcery": { kind: "none" },
  // ---------- Warlock
  "Fiendish Resilience": { kind: "persist", choices: DMG_LIST.concat([]).map(d => [d, d.charAt(0).toUpperCase() + d.slice(1)]), fx: (c, ch) => ({ res: [ch] }) },
  "Dark One's Blessing": { kind: "instant", use: c => { const n = Math.max(1, c.mods.cha + clsLv(c,"Warlock")); giveTemp(c, n); return `Dark One's Blessing: ${n} temporary hit points.`; } },
  "Dark One's Own Luck": { kind: "instant", use: () => rollMsg("Dark One's Own Luck", "1d10", "Add it to the check or save") },
  "Healing Light": { kind: "instant", use: () => roll("Healing Light", "1d6", "heal", "Hit points restored (use it again to spend more dice)") },
  "Searing Vengeance": { kind: "instant", use: c => area("Searing Vengeance", `2d8${sgn(c.mods.cha)}`, null, 0, "Radiant", "The creature stands up with half its hit points. Each creature of your choice within 30 ft takes radiant damage and is blinded until the end of the turn.") },
  "Hurl Through Hell": { kind: "instant", use: c => edOf(c) === "2024" ? roll("Hurl Through Hell", "8d10", "damage", `Psychic damage if the target fails a CHA save (DC ${8 + c.prof + c.mods.cha}); it is incapacitated until the end of your next turn`) : roll("Hurl Through Hell", "10d10", "damage", "Psychic damage when the creature returns (none if it is a fiend)") },
  "Celestial Resilience": { kind: "instant", use: c => { const n = clsLv(c,"Warlock") + c.mods.cha; giveTemp(c, n); return `Celestial Resilience: ${n} temporary hit points.`; } },
  "Warping Implosion": { kind: "instant", use: c => area("Warping Implosion", "3d10", "str", 8 + c.prof + c.mods.cha, "Force", "You teleport up to 120 ft. Each creature within 30 ft of the space you left makes a STR save: force damage and pulled next to that space, half and not pulled on a success.") },
  // ---------- Wizard
  "Arcane Recovery": { kind: "instant", dialog: (c, a) => recoveryDialog(c, "Arcane Recovery", a.res) },
  Portent: { kind: "instant", use: () => "Portent die used: replace the roll with it." },
  "Illusory Self": { kind: "instant", use: () => "Illusory Self: the attack misses." },
  // ---------- species
  "Breath Weapon": { kind: "instant", use: c => { const x = (c.extras || []).find(e => e.startsWith("Breath Weapon")) || "", d = (x.match(/(\d+d\d+)/) || [])[1] || "2d6", dc = +((x.match(/DC (\d+)/) || [])[1] || 8 + c.prof + c.mods.con), A = DRAGON_ANCESTRY[c.ancestry] || {}, sv = edOf(c) === "2024" ? "dex" : String(A.save || "DEX").toLowerCase(); return area("Breath Weapon", d, sv, dc, cap1(A.type || ""), `Each creature in the ${edOf(c) === "2024" ? "15 ft cone or 30 ft line" : A.shape || "area"} makes a ${sv.toUpperCase()} save: ${A.type || ""} damage, half on a success.`); } },
  "Healing Hands": { kind: "instant", use: c => roll("Healing Hands", `${c.prof}d4`, "heal", "Hit points restored to the creature you touch") },
  "Relentless Endurance": { kind: "instant", use: c => { c.hpCur = 1; return "Relentless Endurance: you drop to 1 hit point instead of 0."; } },
  "Celestial Revelation": { kind: "toggle", choices: [["wings", "Heavenly Wings"], ["radiance", "Inner Radiance"], ["shroud", "Necrotic Shroud"]], fx: (c, ch) => ({ atk: [{ f: "all", extra: `${c.prof} ${ch === "shroud" ? "necrotic" : "radiant"} once per turn`, label: "Celestial Revelation" }], ...(ch === "wings" ? { fly: "speed" } : {}), notes: [ch === "radiance" ? "Inner Radiance: bright light; creatures within 10 ft take radiant damage equal to your proficiency bonus at the end of your turns" : ch === "shroud" ? "Necrotic Shroud: creatures within 10 ft make a CHA save or are frightened of you until the end of your next turn" : "Heavenly Wings: flying speed equal to your speed"] }) },
  "Large Form": { kind: "toggle", fx: () => ({ speed: [10, "Large Form"], notes: ["Large Form: you are Large, with advantage on Strength checks, for 10 minutes"] }) },
  "Draconic Flight": { kind: "toggle", fx: () => ({ fly: "speed", notes: ["Draconic Flight: spectral wings for 10 minutes"] }) },
  "Adrenaline Rush": { kind: "instant", use: c => { giveTemp(c, c.prof); return `Adrenaline Rush: Dash as a bonus action and gain ${c.prof} temporary hit points.`; } },
  "Giant Ancestry": { kind: "instant", use: c => `${c.sub || "Giant"} boon used.` }
};
// spend a recovery on the highest spent slots that fit (5th level at most)
function slotRecover(c, budget, label) {
  c.used = c.used || {}; const got = [];
  for (let L = 5; L >= 1; L--) while (budget >= L && (+c.used["slot" + L] || 0) > 0) { c.used["slot" + L] -= 1; budget -= L; got.push(L); }
  return got.length ? `${label}: recovered ${got.map(L => `a level ${L}`).join(", ")} slot${got.length > 1 ? "s" : ""}.` : `${label}: no spent slots that it can recover.`;
}
const actSpec = a => ACT[a.name] || (a.res ? { kind: "instant" } : null);
const actChoices = (c, S) => typeof S.choices === "function" ? S.choices(c) : S.choices || [];
// everything active right now, merged into one set of effects
function pcFx(c) {
  const F = { ac: [], acMin: null, acUnarm: [], speed: [], mult: 1, fly: null, climb: null, swim: null, res: new Set(), atk: [], attacks: [], notes: [], on: [], form: null };
  const act = c.active || {}; if (!Object.keys(act).length) return F;
  const have = new Set(pcAbilities(c).map(a => a.name));
  for (const [name, val] of Object.entries(act)) {
    const S = ACT[name]; if (!val || !S || !S.fx || !have.has(name)) continue;
    if (S.needs && !act[S.needs]) continue;
    const ch = val === true ? null : val, x = S.fx(c, ch) || {};
    F.on.push(name);
    if (x.form) F.form = x.form;
    if (x.ac) F.ac.push(x.ac); if (x.acMin && (!F.acMin || x.acMin[0] > F.acMin[0])) F.acMin = x.acMin; if (x.acUnarm) F.acUnarm.push(x.acUnarm);
    if (x.speed) F.speed.push(x.speed); if (x.mult) F.mult *= x.mult;
    ["fly", "climb", "swim"].forEach(k => { if (x[k] != null) F[k] = x[k]; });
    (x.res || []).forEach(r => F.res.add(r)); F.atk.push(...(x.atk || [])); F.attacks.push(...(x.attacks || [])); F.notes.push(...(x.notes || []));
  }
  return F;
}
function actControls(c, a, R) {
  const S = actSpec(a); if (!S || S.kind === "none") return "";
  const on = (c.active || {})[a.name], ch = actChoices(c, S), k = esc(a.name);
  const sel = cur => ch.length ? `<select class="act-sel" data-actsel="${k}" aria-label="${k} option"${S.kind === "persist" ? ` data-actpersist="${k}"` : ""}>${S.kind === "persist" ? `<option value="">Choose…</option>` : ""}${ch.map(([id, l]) => `<option value="${esc(id)}" ${cur === id ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>` : "";
  if (S.kind === "persist") return `<span class="act">${sel(on || "")}</span>`;
  if (S.kind === "toggle") return on ? `<span class="act">${ch.length ? `<span class="tag">${esc((ch.find(x => x[0] === on) || [, ""])[1])}</span>` : ""}<button type="button" class="btn sm primary" data-act="${k}">■ End</button></span>`
    : `<span class="act">${sel()}<button type="button" class="btn sm" data-act="${k}"${a.res && R[a.res] && resLeft(c, R[a.res]) < 1 ? " disabled" : ""}>▶ Activate</button></span>`;
  if (S.kind === "instant" && (S.use || a.res)) return `<span class="act">${sel()}<button type="button" class="btn sm" data-act="${k}"${a.res && R[a.res] && resLeft(c, R[a.res]) < 1 && !S.noCost && !ch.some(([id])=>typeof S.cost==="function"&&S.cost(c,id)===0) ? " disabled" : ""}>Use</button></span>`;
  return "";
}
function rcActiveHTML(c) {
  const F = pcFx(c), act = c.active || {}, list = Object.entries(act).filter(([n, v]) => v && ACT[n] && pcAbilities(c).some(a => a.name === n));
  if (!list.length) return "";
  const lab = ([n, v]) => { const ch = actChoices(c, ACT[n]).find(x => x[0] === v); return ch ? `${n}: ${ch[1]}` : n; };
  const res = [...F.res], move = pcSpeed(c).other;
  return `<div class="active-fx"><div class="row" style="flex-wrap:wrap;gap:6px;align-items:center"><b style="flex:0 0 auto">Active</b>${list.map(e => `<span class="tag act-on">${esc(lab(e))}${ACT[e[0]].kind === "toggle" ? ` <button type="button" class="icon-btn" data-act="${esc(e[0])}" title="End ${esc(e[0])}" aria-label="End ${esc(e[0])}">✕</button>` : ""}</span>`).join("")}</div>
    ${F.form ? `<div class="beast"><b>${esc(F.form.name)}</b> <span class="muted">${esc(cap1(F.form.size || ""))} beast</span> · AC ${F.form.ac} · STR ${F.form.scores[0]} (${sgn(mod(F.form.scores[0]))}) · DEX ${F.form.scores[1]} (${sgn(mod(F.form.scores[1]))}) · CON ${F.form.scores[2]} (${sgn(mod(F.form.scores[2]))})${F.form.senses ? ` · ${esc(F.form.senses)}` : ""}${F.form.traits.length ? `<br><span class="muted">Traits: ${F.form.traits.map(esc).join(", ")}</span>` : ""}
      ${edOf(c) === "2014" ? `<div class="slot" style="margin-top:6px"><span>Beast hit points</span><span class="ctr"><input type="number" min="0" max="${F.form.hp}" data-formhp="1" value="${esc(c.formHp ?? F.form.hp)}" aria-label="Beast hit points"><span class="ctr-max">/ ${F.form.hp}</span></span>${(c.formHp ?? F.form.hp) <= 0 ? ` <span class="tag">at 0: you revert; extra damage carries over to you</span>` : ""}</div>` : ""}</div>` : ""}
    ${res.length ? `<p style="margin:6px 0 0"><b>Resistances:</b> ${res.map(esc).join(", ")}</p>` : ""}${move.length ? `<p style="margin:4px 0 0"><b>Movement:</b> ${move.map(esc).join(" · ")}</p>` : ""}
    ${F.notes.length ? `<ul class="plain" style="margin:6px 0 0">${F.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}</div>`;
}
/* ---- ability dialogs: results applied to a target, Wild Shape forms, slot recovery, short rests ---- */
const ACTX = {};
function actDialog(html) {
  let m = $("#actModal");
  if (!m) {
    document.body.insertAdjacentHTML("beforeend", `<div id="actModal" role="dialog" aria-modal="true" aria-labelledby="actTitle"><div class="box" id="actBox"></div></div>`);
    m = $("#actModal");
    m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-actclose]")) actClose(); else actDialogClick(e); });
    m.addEventListener("input", e => { if (e.target.matches("[data-recn]")) recoverySum(); });
    m.addEventListener("change", e => { const t = e.target; if (t.name === "mcPick") { ACTX.mc.pick = t.value; ACTX.mc.sub = ""; mcRefresh(); return; } if (t.id === "mcSubSel") { ACTX.mc.sub = t.value; mcRefresh(); return; } if (t.id === "mcOverride") { mcRefresh(); return; } if (t.matches("[data-aoeok]") && ACTX.aoe) { const r = ACTX.aoe[+t.dataset.aoeok]; r.saveOk = t.value === "1"; $(`[data-aoeamt="${t.dataset.aoeok}"]`).textContent = ACTX.aoeAmt(r); } });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && m.classList.contains("open")) actClose(); });
  }
  ACTX.back = document.activeElement;
  const box = $("#actBox"); box.className = "box"; box.innerHTML = html; m.classList.add("open"); /* a dialog may add its own class (spell-box) after this */
  const f = $("#actBox [autofocus]") || $("#actBox select, #actBox input, #actBox button"); if (f) f.focus();
}
function actClose() { const m = $("#actModal"); if (m) m.classList.remove("open"); const c = ACTX.c; if (c && location.hash === "#roster") { renderRosterMain(); } if (ACTX.back && document.contains(ACTX.back)) ACTX.back.focus(); }
const area = (title, expr, save, dc, dtype, desc, extra) => ({ aoe: true, title, expr, save, dc, dtype, desc, msg: desc, ...(extra || {}) });
const roll = (title, expr, kind, tail, half) => { const r = rollDice(expr); return { title, msg: `${title}: ${r.text}${tail ? ". " + tail : ""}`, amount: r.total, kind, half: !!half }; };
// who a heal, temporary hit points or damage can go to: you, your other characters, and monsters in your campaigns' encounters
function actTargets(c) {
  const pcs = PCS.roster.map(p => ({ id: "pc:" + p.id, label: `${p.name}${p.id === c.id ? " (you)" : ""} · ${p.hpCur ?? p.hp}/${p.hp} HP${+p.hpTemp ? ` +${p.hpTemp} temp` : ""}`, self: p.id === c.id }));
  let camps = Store.list().filter(k => (k.party || []).some(x => x.pcId === c.id)); if (!camps.length) camps = Store.list();
  const foes = [];
  camps.forEach(k => (k.encounters || []).filter(e => e.status !== "Done" && e.status !== "Completed").forEach(e => (e.enemies || []).filter(m => m.hp > 0).forEach(m => foes.push({ id: `foe:${k.id}:${e.id}:${m.id}`, label: `${m.name} · ${m.hp}/${m.max} HP`, group: `${k.name} — ${e.name}` }))));
  return { pcs: pcs.sort((a, b) => b.self - a.self), foes };
}
function actApply(targetId, amount, kind) {
  const [t, a, b, d] = targetId.split(":");
  if (t === "pc") {
    const p = PCS.roster.find(x => x.id === a); if (!p) return "That character is gone.";
    const cur = +(p.hpCur ?? p.hp) || 0, max = +p.hp || 0;
    if (kind === "heal") { p.hpCur = Math.min(max, cur + amount); const hn = pcHealed(p, cur === 0); pcPersist(); return `${p.name} regains ${p.hpCur - cur} hit points (${p.hpCur}/${max}).${hn.length ? " " + hn.join(". ") + "." : ""}`; }
    if (kind === "temp") { const was = +p.hpTemp || 0; if (amount > was) p.hpTemp = amount; pcPersist(); return amount > was ? `${p.name} has ${amount} temporary hit points.` : `${p.name} keeps their ${was} temporary hit points (they don't stack).`; }
    let left = amount; const tmp = +p.hpTemp || 0; if (tmp) { const use = Math.min(tmp, left); p.hpTemp = tmp - use || ""; left -= use; }
    p.hpCur = Math.max(0, cur - left); const dn = pcDamaged(p, amount, cur === 0); pcPersist(); return `${p.name} takes ${amount} damage (${p.hpCur}/${max}${+p.hpTemp ? `, ${p.hpTemp} temp left` : ""}).${dn.length ? " " + dn.map(cap1).join(". ") + "." : ""}`;
  }
  const k = Store.get(a), e = k && (k.encounters || []).find(x => x.id === b), m = e && e.enemies.find(x => x.id === d);
  if (!m) return "That creature is gone.";
  if (kind === "damage") m.hp = Math.max(0, m.hp - amount); else m.hp = Math.min(m.max, m.hp + amount);
  Store.save(k);
  return kind === "damage" ? `${m.name} takes ${amount} damage (${m.hp}/${m.max}).${m.hp === 0 ? ` ${m.name} is down.` : ""}` : `${m.name} regains hit points (${m.hp}/${m.max}).`;
}
function actResultDialog(c, R) {
  ACTX.c = c; ACTX.r = R;
  const T = actTargets(c), kind = R.kind === "either" ? "damage" : R.kind, wantFoe = kind === "damage";
  const opt = x => `<option value="${esc(x.id)}">${esc(x.label)}</option>`;
  const groups = [...new Set(T.foes.map(f => f.group))];
  const sel = `<select id="actTarget" aria-label="Target">${wantFoe && T.foes.length ? "" : ""}<optgroup label="Characters">${T.pcs.map(opt).join("")}</optgroup>${groups.map(g => `<optgroup label="${esc(g)}">${T.foes.filter(f => f.group === g).map(opt).join("")}</optgroup>`).join("")}</select>`;
  const kinds = R.kind === "either" ? `<div class="seg" style="margin:10px 0 0"><label class="opt"><input type="radio" name="actKind" value="heal"><span>Heal</span></label><label class="opt"><input type="radio" name="actKind" value="damage" checked><span>Damage</span></label></div>` : "";
  actDialog(`<h3 id="actTitle">${esc(R.title || "Result")}</h3><p style="margin:10px 0">${esc(R.msg)}</p>
    ${R.amount ? `<div class="field" style="margin:0"><label for="actTarget">${kind === "heal" ? "Heal" : kind === "temp" ? "Give temporary hit points to" : "Apply damage to"}</label>${sel}${!T.foes.length && wantFoe ? `<p class="hint" style="margin:6px 0 0">No monsters in an active encounter. Add an encounter in the Campaign Tracker to apply damage to it.</p>` : ""}</div>${kinds}
    <div class="row" style="justify-content:flex-end;margin-top:16px;flex-wrap:wrap"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Don't apply</button>${R.half ? `<button class="btn" type="button" data-actapply="half" style="flex:0 0 auto">Apply half (${Math.floor(R.amount / 2)})</button>` : ""}<button class="btn primary" type="button" data-actapply="full" style="flex:0 0 auto" autofocus>Apply ${R.amount}</button></div>`
    : `<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" type="button" data-actclose style="flex:0 0 auto" autofocus>OK</button></div>`}`);
  const s = $("#actTarget"); if (s) s.value = (wantFoe && T.foes.length ? T.foes[0].id : "pc:" + c.id);
}
function actDialogClick(e) {
  const ap = e.target.closest("[data-actapply]");
  if (ap && ACTX.r) {
    const R = ACTX.r, k = R.kind === "either" ? (($("input[name=actKind]:checked") || {}).value || "damage") : R.kind, n = ap.dataset.actapply === "half" ? Math.floor(R.amount / 2) : R.amount;
    const msg = actApply($("#actTarget").value, n, k); actClose(); toast(msg); return;
  }
  const spellDiceButton = e.target.closest("[data-spell-dice]");
  if (spellDiceButton) {
    const expression = spellDiceButton.dataset.spellDice;
    const roll = rollDice(expression);
    $("[data-spell-roll]").textContent = roll.text;
    if (ACTX.c) rollLog(ACTX.c, { label: `${ACTX.cast.name} · ${expression}`, total: roll.total, note: roll.text });
    return;
  }
  const rc = e.target.closest("[data-recover]"); if (rc) { recoveryConfirm(); return; }
  if (e.target.closest("[data-castgo]")) { castGo(); return; }
  const lvb = e.target.closest("[data-castlv]"); if (lvb && !lvb.disabled) { castPick(lvb.dataset.castlv); return; }
  if (e.target.closest("[data-mcgo]")) { mcGo(); return; }
  if (e.target.closest("[data-aoeroll]")) { aoeRoll(); return; }
  if (e.target.closest("[data-aoeapply]")) { aoeApply(); return; }
  const hd = e.target.closest("[data-hdroll]"); if (hd) { shortRestRoll(); return; }
  const fin = e.target.closest("[data-restfinish]"); if (fin) { shortRestFinish(); return; }
}
/* ---- choose which spent slots Arcane Recovery or Natural Recovery brings back ---- */
function recoveryDialog(c, name, resKey) {
  const budget = Math.ceil((clsLv(c, name === "Arcane Recovery" ? "Wizard" : "Druid") || c.level) / 2), spent = [1, 2, 3, 4, 5].map(L => ({ L, n: Math.min(+((c.used || {})["slot" + L]) || 0, (pcResources(c).find(r => r.key === "slot" + L) || { max: 0 }).max) })).filter(x => x.n > 0);
  ACTX.c = c; ACTX.rec = { name, resKey, budget };
  if (!spent.length) { actDialog(`<h3 id="actTitle">${esc(name)}</h3><p style="margin:10px 0">You have no spent spell slots of 5th level or lower to recover.</p><div class="row" style="justify-content:flex-end"><button class="btn primary" type="button" data-actclose style="flex:0 0 auto">OK</button></div>`); return; }
  actDialog(`<h3 id="actTitle">${esc(name)}</h3><p style="margin:10px 0">Recover spent slots with a combined level of up to <b>${budget}</b>.</p>
    ${spent.map(x => `<div class="slot" style="margin:6px 0"><span style="min-width:120px">Level ${x.L} (${x.n} spent)</span><input type="number" min="0" max="${Math.min(x.n, Math.floor(budget / x.L))}" value="0" data-recn="${x.L}" aria-label="Level ${x.L} slots to recover" style="width:70px"></div>`).join("")}
    <p class="hint" id="recSum">0 of ${budget} levels chosen.</p>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Cancel</button><button class="btn primary" type="button" data-recover style="flex:0 0 auto" disabled>Recover</button></div>`);
}
function recoverySum() {
  const { budget } = ACTX.rec, tot = $$("[data-recn]").reduce((s, i) => s + (+i.value || 0) * +i.dataset.recn, 0);
  $("#recSum").textContent = `${tot} of ${budget} levels chosen.${tot > budget ? " That's too many." : ""}`;
  $("[data-recover]").disabled = !tot || tot > budget;
}
function recoveryConfirm() {
  const c = ACTX.c, { name, resKey, budget } = ACTX.rec, pick = $$("[data-recn]").map(i => [+i.dataset.recn, +i.value || 0]).filter(x => x[1] > 0);
  if (pick.reduce((s, [L, n]) => s + L * n, 0) > budget) return;
  c.used = c.used || {}; const r = pcResources(c).find(x => x.key === resKey);
  if (r && resLeft(c, r) < 1) { actClose(); toast(`No ${name} use left`); return; }
  if (r) c.used[resKey] = (+c.used[resKey] || 0) + 1;
  pick.forEach(([L, n]) => c.used["slot" + L] = Math.max(0, (+c.used["slot" + L] || 0) - n));
  pcPersist(); actClose(); toast(`${name}: recovered ${pick.map(([L, n]) => `${n} level ${L} slot${n > 1 ? "s" : ""}`).join(", ")}`);
}
/* ---- short rest: spend hit dice to heal, then regain short-rest abilities ---- */
function shortRestDialog(c) {
  ACTX.c = c; ACTX.log = [];
  const hd = pcResources(c).find(r => r.key === "hd"), left = resLeft(c, hd);
  actDialog(`<h3 id="actTitle">Short rest</h3><p style="margin:10px 0">An hour of rest. Spend hit dice to heal: each one rolls a d${c.hd} and adds your CON modifier (${sgn(c.mods.con)}).</p>
    <p style="margin:0 0 8px"><b>Hit points:</b> <span id="srHp">${c.hpCur}/${c.hp}</span> · <b>Hit dice left:</b> <span id="srHd">${left}/${hd.max}</span></p>
    <div class="row" style="flex-wrap:wrap;gap:8px"><label style="flex:0 0 auto;display:inline-flex;gap:6px;align-items:center">Spend <input type="number" id="srN" min="1" max="${left}" value="${left ? 1 : 0}" style="width:64px" ${left ? "" : "disabled"}> hit dice</label><button class="btn" type="button" data-hdroll style="flex:0 0 auto" ${left ? "" : "disabled"}>Roll and heal</button></div>
    <div id="srLog" class="hint"></div>
    ${edOf(c)==="2024"&&clsLv(c,"Sorcerer")>=5&&resLeft(c,pcResources(c).find(r=>r.key==="sorcerousRestore"))>0?`<label class="check"><input type="checkbox" id="srSorcerousRestoration"><span>Use Sorcerous Restoration (regain up to ${Math.floor(clsLv(c,"Sorcerer")/2)} Sorcery Points)</span></label>`:""}
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Cancel</button><button class="btn primary" type="button" data-restfinish style="flex:0 0 auto" autofocus>Finish short rest</button></div>`);
}
function shortRestRoll() {
  const c = ACTX.c, hd = pcResources(c).find(r => r.key === "hd"), n = clamp(parseInt($("#srN").value) || 0, 0, resLeft(c, hd)); if (!n) return;
  c.used = c.used || {}; c.used.hd = (+c.used.hd || 0) + n;
  const rolls = Array.from({ length: n }, () => Math.max(0, 1 + Math.floor(Math.random() * c.hd) + c.mods.con)), tot = rolls.reduce((s, x) => s + x, 0), got = healSelf(c, tot);
  ACTX.log.push(`${n}d${c.hd}${c.mods.con ? ` ${sgn(c.mods.con)} each` : ""}: ${rolls.join(" + ")} = ${tot}, healed ${got}`);
  pcPersist();
  const left = resLeft(c, hd);
  $("#srHp").textContent = `${c.hpCur}/${c.hp}`; $("#srHd").textContent = `${left}/${hd.max}`; $("#srLog").innerHTML = ACTX.log.map(esc).join("<br>");
  $("#srN").max = left; $("#srN").value = left ? 1 : 0; $("#srN").disabled = !left; $("[data-hdroll]").disabled = !left;
}
function shortRestFinish() {
  const c = ACTX.c, restoreSorcery=!!$("#srSorcerousRestoration")?.checked, back = pcRest(c, "short"), fxEnded = c.fxEnded; delete c.fxEnded;
  if(restoreSorcery){const n=sorcerousRestoration(c);if(n)back.push(n+" Sorcery Points");}
  if(edOf(c)==="2024"&&clsLv(c,"Ranger")>=10&&exhOf(c)>0&&exhOf(c)<6&&!c.death?.dead){c.exh=exhOf(c)-1;back.push("one Exhaustion level removed");pcRecompute(c);}
  pcPersist();
  const healed = ACTX.log.length ? ` Hit points ${c.hpCur}/${c.hp}.` : "";
  toast(`${c.name} takes a short rest${back.length ? `: ${back.join(", ").toLowerCase()} regained` : ""}.${healed}${fxEnded ? " Active abilities ended." : ""}`);
  // offer slot recovery while resting
  const rec = pcAbilities(c).find(a => (a.name === "Arcane Recovery" || a.name === "Natural Recovery") && a.res && resLeft(c, pcResources(c).find(r => r.key === a.res)) > 0);
  const spentSlots = [1, 2, 3, 4, 5].some(L => +((c.used || {})["slot" + L]) > 0);
  if (rec && spentSlots) recoveryDialog(c, rec.name, rec.res); else actClose();
}
/* ---- Wild Shape: pick a beast; its AC, speeds and attacks replace yours ---- */
const crText = v => v === 0.125 ? "1/8" : v === 0.25 ? "1/4" : v === 0.5 ? "1/2" : String(v);
/* the Druid's subclass, whether Druid is the first class or a multiclass */
function druidSub(c) { return c.cls === "Druid" ? c.subclass : ((c.multi || []).find(x => x.cls === "Druid") || {}).subclass; }
function wildShapeLimit(c) {
  const lv = clsLv(c, "Druid") || c.level, ed = edOf(c), moon = druidSub(c) === "Circle of the Moon";
  let cr = lv >= 8 ? 1 : lv >= 4 ? 0.5 : 0.25;
  if (moon) cr = ed === "2024" ? Math.max(1, Math.floor(lv / 3)) : lv >= 6 ? Math.floor(lv / 3) : 1;
  return { cr, noFly: lv < 8, noSwim: ed === "2014" && lv < 4 };
}
/* the extra books' beasts join the list once their file has loaded (it loads on first need, then the sheet redraws once) */
let wildExtraWait = false;
function wildBeasts(c) {
  if (!extraMonstersReady && !wildExtraWait) { wildExtraWait = true; dmLoadExtraMonsters().then(ok => { wildExtraWait = false; if (ok && location.hash === "#roster" && rosterCur()) renderRosterMain(); }); }
  bsLoad(); const L = wildShapeLimit(c);
  return BS.data[edOf(c) === "2014" ? "2014" : "2024"].filter(m => m.type === "beast" && m.cr <= L.cr && !(L.noFly && /fly/i.test(m.speed)) && !(L.noSwim && /swim/i.test(m.speed))).sort((a, b) => a.cr - b.cr || a.n.localeCompare(b.n));
}
function beastForm(id) {
  bsLoad(); const m = Object.values(BS.data).flat().find(x => x.id === id); if (!m) return null;
  const sp = {}; String(m.speed).split(",").forEach(p => { const mm = p.trim().match(/^(?:(fly|swim|climb|burrow)\s+)?(\d+)\s*ft/i); if (mm) sp[(mm[1] || "walk").toLowerCase()] = +mm[2]; });
  const attacks = (m.actions || []).map(([n, t0]) => {
    const t = String(t0 || "").replace(/[_*]/g, ""); /* Black Flag marks "_Melee Weapon Attack:_" in italics (QA-2, 2026-11-24) */
    const hit = (t.match(/Attack(?: Roll)?:\s*\+(\d+)/) || [])[1], d = t.match(/(\d+)\s*\((\d+d\d+)\s*(?:([+\-−])\s*(\d+))?\)\s*([A-Za-z]+) damage/);
    /* a tiny beast's flat damage, "Hit: 1 piercing damage" or "1 Piercing damage" (QA-4, 2026-11-23) */
    const flat = !d && t.match(/(?:Hit:\s*|ft\.\s+|\.\s+)(\d+)\s+(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)(?: damage|\.|$)/i); /* ToB3 writes "1 piercing." */
    /* book-reference style, "Melee attack +5, reach 5 ft. Damage listed: 1d8 + 3 piercing" (QA-6, 2026-11-24) */
    const ref = !d && !flat && t.match(/\b(?:Melee|Ranged) attack \+(\d+)[^.]*\..*?Damage listed:\s*(\d+d\d+)\s*(?:([+\-−])\s*(\d+))?\s*(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)/i);
    if (ref) return { name: n, hit: +ref[1], die: ref[2], mod: ref[3] ? (ref[3] === "+" ? 1 : -1) * +ref[4] : 0, type: ref[5].toLowerCase(), melee: /Melee/.test(t), prof: true, beast: true, ab: "beast" };
    if (hit === undefined || (!d && !flat)) return null;
    if (flat) return { name: n, hit: +hit, die: "", mod: +flat[1], type: flat[2].toLowerCase(), melee: /Melee/.test(t), prof: true, beast: true, ab: "beast" };
    return { name: n, hit: +hit, die: d[2], mod: d[3] ? (d[3] === "+" ? 1 : -1) * +d[4] : 0, type: d[5].toLowerCase(), melee: /Melee/.test(t), prof: true, beast: true, ab: "beast" };
  }).filter(Boolean);
  return { m, sp, attacks };
}
/* ---- area effects: pick every creature caught in it; each gets its own damage roll and its own saving throw ---- */
const AB_KEY = { str: "Str", dex: "Dex", con: "Con", int: "Int", wis: "Wis", cha: "Cha" };
// a monster's saving throw bonus from its stat block (by its stat name), or null when the app doesn't know it
function foeSaveBonus(m, ab, ed) {
  bsLoad();
  const want = String(m.stat || m.name || "").replace(/\s+\d+$/, "").toLowerCase(), base = String(m.name || "").replace(/\s+\d+$/, "").toLowerCase();
  const find = L => L.find(x => x.n.toLowerCase() === want) || L.find(x => x.n.toLowerCase() === base);
  const sb = find(BS.data[ed === "2014" ? "2014" : "2024"]) || find(BS.data[ed === "2014" ? "2024" : "2014"]); if (!sb) return null;
  const listed = (sb.saves || []).find(x => x.startsWith(AB_KEY[ab] + " "));
  if (listed) return +listed.split(" ")[1];
  return mod(sb.scores[["str", "dex", "con", "int", "wis", "cha"].indexOf(ab)]);
}
function pcSaveBonus(p, ab) { return (p.mods || {})[ab] + ((p.saves || []).includes(ab) ? p.prof : 0) + itemSaveBonus(p); }
// remembered between uses: separate rolls (default) or one shared roll
const aoeShared = () => { try { return localStorage.getItem("dmforge.aoeShared") === "1"; } catch { return false; } };
function aoeTargets(c, ed) {
  const T = actTargets(c), out = [];
  T.foes.forEach(f => { const [, k, e, id] = f.id.split(":"), camp = Store.get(k), enc = camp && camp.encounters.find(x => x.id === e), m = enc && enc.enemies.find(x => x.id === id); if (m) out.push({ id: f.id, label: f.label, group: f.group, foe: m }); });
  T.pcs.filter(x => !x.self).forEach(x => out.push({ id: x.id, label: x.label, group: "Characters", pc: PCS.roster.find(p => "pc:" + p.id === x.id) }));
  return out;
}
function actAoeDialog(c, R) {
  ACTX.c = c; ACTX.r = R; ACTX.aoe = null;
  const L = aoeTargets(c, edOf(c)), groups = [...new Set(L.map(t => t.group))];
  actDialog(`<h3 id="actTitle">${esc(R.title)}</h3><p style="margin:10px 0">${esc(R.desc)}</p>
    ${L.length ? `<p class="hint" style="margin:0 0 6px">${R.singleTarget ? "Select the target" : "Tick every creature in the area"}${R.save ? `. Each one makes its own ${R.save.toUpperCase()} save against DC ${R.dc}` : ""}.</p>
      <div class="aoe-list">${groups.map(g => `<fieldset><legend>${esc(g)}</legend>${L.filter(t => t.group === g).map(t => `<label class="aoe-t"><input type="${R.singleTarget ? "radio" : "checkbox"}" name="aoeTarget" data-aoet="${esc(t.id)}" ${t.foe && !R.singleTarget ? "checked" : ""}> ${esc(t.label)}</label>`).join("")}</fieldset>`).join("")}</div>
      <div class="seg" role="radiogroup" aria-label="Damage rolls" style="margin-top:10px"><label class="opt"><input type="radio" name="aoeShare" value="0" ${aoeShared() ? "" : "checked"}><span>Separate ${esc(R.expr)} roll for each target</span></label><label class="opt"><input type="radio" name="aoeShare" value="1" ${aoeShared() ? "checked" : ""}><span>One shared roll for everyone (rules as written)</span></label></div>
      <div class="row" style="justify-content:flex-end;margin-top:14px;flex-wrap:wrap"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Cancel</button><button class="btn primary" type="button" data-aoeroll style="flex:0 0 auto" autofocus>Roll damage</button></div>`
    : `<p class="hint">No creatures to target. Add an encounter with monsters in the Campaign Tracker, or other characters on the Characters tab.</p><div class="row" style="justify-content:flex-end"><button class="btn primary" type="button" data-actclose style="flex:0 0 auto">OK</button></div>`}`);
}
function aoeRoll() {
  const c = ACTX.c, R = ACTX.r, ed = edOf(c), L = aoeTargets(c, ed), ids = $$("[data-aoet]").filter(i => i.checked).map(i => i.dataset.aoet);
  if (!ids.length) { toast("Tick at least one creature"); return; }
  const shared = (($("input[name=aoeShare]:checked") || {}).value) === "1"; try { localStorage.setItem("dmforge.aoeShared", shared ? "1" : "0"); } catch { }
  const one = shared ? rollDice(R.expr) : null;
  ACTX.aoe = ids.map(id => {
    const t = L.find(x => x.id === id), dmg = one || rollDice(R.expr);
    let save = null;
    if (R.save) {
      const bonus = t.foe ? foeSaveBonus(t.foe, R.save, ed) : pcSaveBonus(t.pc, R.save), d20 = 1 + Math.floor(Math.random() * 20);
      save = bonus === null ? { d20, bonus: null, ok: false, text: `${R.save.toUpperCase()} save: unknown bonus, d20 ${d20}` } : { d20, bonus, ok: d20 + bonus >= R.dc, text: `${R.save.toUpperCase()} save: ${d20} ${bonus < 0 ? "−" : "+"} ${Math.abs(bonus)} = ${d20 + bonus} vs DC ${R.dc}` };
    }
    return { id, name: t.foe ? t.foe.name : t.pc.name, dmg, save };
  });
  const amt = r => !r.save ? r.dmg.total : r.saveOk ? (R.noneOnSave ? 0 : Math.floor(r.dmg.total / 2)) : r.dmg.total;
  ACTX.aoe.forEach(r => r.saveOk = r.save ? r.save.ok : false);
  const row = (r, i) => `<tr><td><b>${esc(r.name)}</b></td><td>${one ? (i ? `<span class="muted">same roll</span>` : esc(r.dmg.text)) : esc(r.dmg.text)}</td><td>${r.save ? `${esc(r.save.text)}<br><select data-aoeok="${i}" aria-label="${esc(r.name)} save result"><option value="0" ${r.saveOk ? "" : "selected"}>Failed: full damage</option><option value="1" ${r.saveOk ? "selected" : ""}>Saved: ${R.noneOnSave ? "no damage" : "half damage"}</option></select>` : "No save"}</td><td class="aoe-amt" data-aoeamt="${i}">${amt(r)}</td></tr>`;
  ACTX.aoeAmt = amt;
  $("#actBox").innerHTML = `<h3 id="actTitle">${esc(R.title)}</h3>${R.note ? `<p class="hint" style="margin:8px 0 0">${esc(R.note)}</p>` : ""}
    ${one ? `<p style="margin:8px 0 0"><b>Shared damage roll:</b> ${esc(one.text)}</p>` : ""}<div style="overflow-x:auto;margin-top:10px"><table class="foes aoe-res"><thead><tr><th>Target</th><th>Damage roll${one ? " (shared)" : ""}</th><th>Saving throw</th><th>${esc(R.dtype || "")} damage</th></tr></thead><tbody>${ACTX.aoe.map(row).join("")}</tbody></table></div>
    <div class="row" style="justify-content:flex-end;margin-top:14px;flex-wrap:wrap"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Don't apply</button><button class="btn primary" type="button" data-aoeapply style="flex:0 0 auto" autofocus>Apply to all</button></div>`;
  const f = $("#actBox [autofocus]"); if (f) f.focus();
}
function aoeApply() {
  const msgs = ACTX.aoe.map(r => { const n = ACTX.aoeAmt(r); return n ? actApply(r.id, n, "damage") : `${r.name} takes no damage.`; });
  const R = ACTX.r, c = ACTX.c; actClose(); toast(msgs.join(" "));
  if (R.heal) actResultDialog(c, { title: `${R.title}: healing`, msg: `One creature of your choice in the area regains ${R.heal} hit points.`, amount: R.heal, kind: "heal" });
}
