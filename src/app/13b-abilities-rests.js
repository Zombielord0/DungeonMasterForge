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
  return edOf(c)==="2024"&&classFeatureLevel(c,"Cleric")>=2&&classFeatureLevel(c,"Paladin")>=3?(baseClassOf(cls)==="Paladin"?"channelPaladin":"channelCleric"):"channel";
}
function channelPoolsForCharacter(c){
  const R=channelDivinityPools(edOf(c),classFeatureLevel(c,"Cleric"),classFeatureLevel(c,"Paladin"));
  // Migrate the ambiguous historical counter conservatively. Never grant free
  // uses by guessing which class spent them; a DM can correct the counters.
  if(R.length===2&&c.used&&Object.hasOwn(c.used,"channel")){
    const spent=Math.max(0,+c.used.channel||0);
    for(const r of R)if(!Object.hasOwn(c.used,r.key))c.used[r.key]=Math.min(spent,r.max);
    delete c.used.channel;
  }else if(R.length===1&&c.used&&R[0].key==="channel"&&(Object.hasOwn(c.used,"channelCleric")||Object.hasOwn(c.used,"channelPaladin"))){
    const spent=edOf(c)==="2024"?classFeatureLevel(c,"Cleric")>=2?c.used.channelCleric:c.used.channelPaladin:Math.max(+c.used.channelCleric||0,+c.used.channelPaladin||0);
    if(!Object.hasOwn(c.used,"channel"))c.used.channel=Math.max(0,Math.min(R[0].max,+spent||0));
    delete c.used.channelCleric;delete c.used.channelPaladin;
  }
  return R;
}
// Subclass companions are owned by a specific class and rules edition.
// Numerical mechanics: PHB 2024 Beast Master; FTD Drakewarden; TCE Battle Smith/Wildfire.
const SUB_COMPANIONS={
  primal:{cls:"Ranger",sub:"Beast Master",ed:"2024",lv:3,forms:["land","sea","sky"]},
  primal14:{cls:"Ranger",sub:"Beast Master",ed:"2014",lv:3,forms:["land","sea","sky"]},
  drake:{cls:"Ranger",sub:"Drakewarden",ed:"2014",src:"ftd",lv:3,forms:["acid","cold","fire","lightning","poison"]},
  steel:{cls:"Artificer",sub:"Battle Smith",ed:"2014",src:"tce",lv:3,forms:["steel"]},
  steel24:{cls:"Artificer",sub:"Battle Smith",ed:"2024",src:"efota",lv:3,forms:["steel"]},
  homunculus:{cls:"Artificer",sub:"Homunculus Servant",ed:"2014",lv:2,forms:["heart"]},
  beast14:{cls:"Ranger",sub:"Beast Master",ed:"2014",lv:3,forms:[]},
  wildfire:{cls:"Druid",sub:"Circle of Wildfire",ed:"2014",src:"tce",lv:2,forms:["fire"]}
};
const REST_COMPANIONS=["primal","primal14","steel","steel24"];
const FADING_COMPANIONS=["drake","wildfire","homunculus"];
function companionLevel(c,key){
  if(key==="homunculus")return artificerInfusions(c).some(i=>i.artificerInfusion.name==="Homunculus Servant")?artificerInfusionLevel(c):0;
  const d=SUB_COMPANIONS[key],ed=edOf(c);
  if(!d)return 0;
  const level=characterSubclassLevel(c,d.cls,d.sub);
  if(!level)return 0;
  const entry=subclassEntry(ed,d.cls,d.sub,false);
  if(entry&&!entry.book||d.src&&entry?.src!==d.src)return 0;
  if(ed!==d.ed&&!(d.src&&entry?.compatibility&&entry.ed===d.ed))return 0;
  if(key==="primal14"||key==="beast14"){
    const optional=c.beastCompanionVariant==="primal";
    if(optional!==(key==="primal14"))return 0;
  }
  return level;
}
function legacyBeastOptions(){
  bsLoad();return (BS.data["2014"]||[]).filter(m=>m.type==="beast"&&Number.isFinite(m.cr)&&m.cr<=0.25&&/^(tiny|small|medium)$/i.test(m.size||"")&&!m.referenceOnly&&!m.rulesSummary&&!m.pend&&m.ac>0&&m.hp>0).sort((a,b)=>a.n.localeCompare(b.n));
}
function companionForms(key){return key==="beast14"?legacyBeastOptions().map(m=>[m.id,m.n+" (CR "+m.cr+")"]):SUB_COMPANIONS[key].forms.map(x=>[x,x]);}
function companionStats(c,key,form){
  const d=SUB_COMPANIONS[key],l=companionLevel(c,key);if(!d||l<d.lv||!companionForms(key).some(x=>x[0]===form))return null;
  const p=c.prof,w=c.mods.wis,i=c.mods.int,dc=8+p+w;
  if(key==="homunculus")return {name:"Homunculus Servant",hp:Math.max(1,1+i+l),ac:13,hd:l+"d4",speed:"20 ft; fly 30 ft",size:"Tiny",scores:[4,15,12,10,10,7],hit:p+i,damage:"1d4"+sgn(p),type:"force",attacks:1,notes:[
    "Force Strike has range 30 feet and targets one visible creature. DEX saves "+sgn(2+p)+", Perception "+sgn(2*p)+", Stealth "+sgn(2+p)+". Darkvision 60 feet, passive Perception "+(10+2*p)+". Understands your languages.",
    "Immune to Poison damage and Exhaustion and Poisoned. Evasion gives no damage on successful Dexterity saves for half damage and half on failures, while not Incapacitated.",
    "Acts immediately after your turn. It can move and use its Reaction, and Dodges unless you command a different action as a Bonus Action. It acts independently if you are Incapacitated.",
    "Mending restores 2d6 HP. If either the Artificer or servant dies, the servant vanishes, leaving the heart behind."]};
  if(key==="primal"||key==="primal14"){
    const sky=form==="sky",sea=form==="sea",hp=(sky?4:5)*(1+l);
    if(key==="primal14")return {name:"Primal Beast of the "+cap1(form),hp,ac:13+p,hd:l+"d"+(sky?6:8),speed:sky?"10 ft; fly 60 ft":sea?"5 ft; swim 60 ft":"40 ft; climb 40 ft",size:sky?"Small":"Medium",scores:sky?[6,16,13,8,14,11]:[14,14,15,8,14,11],hit:p+w,damage:"1d"+(sky?4:sea?6:8)+sgn((sky?3:2)+p),type:sea?"piercing or bludgeoning":"slashing",attacks:l>=11?2:1,dc,notes:[
      "Tasha’s optional companion. It acts during your turn. Command it with a Bonus Action or replace an attack to command the Attack action. Otherwise it Dodges, unless you are Incapacitated.",
      "Darkvision 60 feet, passive Perception 12. It understands your languages and adds your proficiency bonus to ability checks and saves.",
      sky?"Flyby prevents opportunity attacks when it flies out of reach.":sea?"Amphibious. A hit grapples the target (escape DC "+dc+"); it cannot use Binding Strike against another target while the grapple lasts.":"Charge: move 20 feet straight toward the target before hitting with Maul on the same turn for another 1d6 slashing. A creature hit must pass a Strength save (DC "+dc+") or fall Prone.",
      l>=7?"Exceptional Training makes its attacks magical for overcoming resistance and immunity.":"",l>=11?"It can make two attacks when commanded to take the Attack action.":"",l>=15?"Self-targeted spells can also affect the beast while it is within 30 feet.":""]};
    return {name:"Beast of the "+form.charAt(0).toUpperCase()+form.slice(1),hp,ac:13+w,hd:l+"d"+(sky?6:8),speed:sky?"10 ft; fly 60 ft":sea?"5 ft; swim 60 ft":"40 ft; climb 40 ft",size:sky?"Small":"Medium",scores:sky?[6,16,13,8,14,11]:[14,14,15,8,14,11],hit:p+w,damage:"1d"+(sky?4:sea?6:8)+sgn((sky?3:2)+w),type:sky?"slashing":sea?"bludgeoning or piercing":"bludgeoning, piercing or slashing",attacks:l>=11?2:1,dc,notes:["Acts during your turn; Dodge unless commanded (Bonus Action or replace one attack for Beast's Strike).","Proficiency bonus applies to all ability checks and saves.",sky?"Flyby.":sea?"Amphibious; hit grapples (escape DC "+dc+").":"Charge: after moving 20 ft straight toward a target before the hit, extra 1d6 damage; Large or smaller target falls Prone.",l>=7?"May choose Force damage; Bonus Action commands can also grant beast Dash, Disengage, Dodge or Help.":"",l>=11?"First hit each turn against your Hunter's Mark target adds the mark damage as Force.":"",l>=15?"Self-targeted spells may also affect beast within 30 ft.":""]};
  }
  if(key==="drake")return {name:"Drake Companion",hp:5+5*l,ac:14+p,hd:l+"d10",speed:l>=7?"40 ft; fly 40 ft":"40 ft",size:l>=15?"Large":l>=7?"Medium":"Small",scores:[16,12,15,8,14,8],hit:3+p,damage:"1d6"+sgn(p),type:"piercing",attacks:1,dc,notes:["Immune to "+form+"; reaction adds 1d6 "+form+" to a qualifying ally weapon hit.","Acts immediately after your turn; Bonus Action command, otherwise Dodge.",l>=7?"Bite adds "+(l>=15?"2d6":"1d6")+" "+form+"; owner has resistance to that type.":"",l>=15?"Can fly while ridden; reaction resistance to one instance of damage, proficiency uses per Long Rest.":l>=7?"May serve as mount; cannot fly while ridden.":""]};
  if(key==="beast14"){
    const B=beastForm(form);if(!B)return null;
    const m=B.m,attacks=B.attacks.map(a=>({...a,hit:a.hit+p,damage:a.die?a.die+sgn(a.mod+p):String(a.mod+p)})),first=attacks[0];
    return {name:m.n,hp:Math.max(m.hp,4*l),ac:m.ac+p,hd:m.hd||"See original stat block",speed:String(m.speed),size:m.size,scores:m.scores||[],hit:first?.hit??0,damage:first?.damage||"—",type:first?.type||"",attacks:l>=11?2:1,attackOptions:attacks,notes:["Acts on your initiative; verbally direct movement freely. Action commands Attack, Dash, Disengage, Dodge or Help.",l>=5?"When commanding Attack you can make one weapon attack yourself.":"",l>=7?"Exceptional Training: Bonus Action Dash, Disengage, Dodge or Help on a turn when beast does not attack; attacks count as magical for overcoming resistance/immunity.":"",l>=11?"Bestial Fury: two attacks or Multiattack when commanded to Attack.":"",l>=15?"Share Spells: self-target spell may also affect beast within 30 ft.":"","Add your PB to proficient saves and skills; use the original stat block for traits, senses and additional effects.",...((m.traits||[]).map(t=>t.join(": "))),...((m.actions||[]).map(t=>t.join(": ")))]};
  }
  if(key==="steel24")return {name:"Steel Defender (2024)",hp:5+5*l,ac:12+i,hd:l+"d8",speed:"40 ft",size:"Medium",scores:[14,12,14,4,10,6],hit:p+i,damage:"1d8"+sgn(2+i),type:"force",attacks:1,notes:["Poison damage immunity; Charmed, Exhaustion and Poisoned immunity. Darkvision 60 ft; passive Perception 10.","Steel Bond: add your PB to every ability check and save. Understands your languages.","Acts during your turn; moves and reacts independently, otherwise Dodge unless commanded with Bonus Action. If you are Incapacitated it acts independently.",l>=5?"May replace one of your Attack-action attacks with a command to Rend.":"","Deflect Attack: visible creature within 5 ft of defender attacks another creature; impose Disadvantage.",l>=15?"Improved Deflection: attacker also takes 1d4 + INT Force.":"","Repair 3/day: 2d8 + INT healing to self or visible Construct/object within 5 ft."]};
  if(key==="steel")return {name:"Steel Defender",hp:Math.max(1,2+i+5*l),ac:l>=15?17:15,hd:l+"d8",speed:"40 ft",size:"Medium",scores:[14,12,14,4,10,6],hit:p+i,damage:"1d8"+sgn(p),type:"force",attacks:1,notes:["Immune to poison damage and Charmed, Exhaustion and Poisoned. Cannot be surprised; Darkvision 60 ft, passive Perception "+(10+2*p)+".","Saves: DEX "+sgn(1+p)+", CON "+sgn(2+p)+"; Athletics "+sgn(2+p)+", Perception "+sgn(2*p)+". Understands your languages.","Acts immediately after your turn; Bonus Action command, otherwise Dodge; independent if you are Incapacitated.","Deflect Attack: impose Disadvantage on attack against another creature by visible attacker within 5 ft of defender.",l>=15?"Deflect Attack also inflicts 1d4 + INT Force damage.":"","Repair 3/day: 2d8 + PB healing to self or adjacent construct/object. Mending restores 2d6 HP."]};
  return {name:"Wildfire Spirit",hp:5+5*l,ac:13,hd:"—",speed:"30 ft; fly 30 ft (hover)",size:"Small",scores:[10,14,14,13,15,11],hit:p+w,damage:"1d6"+sgn(p),type:"fire",attacks:1,dc,notes:["Fire immunity; Charmed, Frightened, Grappled, Prone and Restrained immunity.","Flame Seed range 60 ft; Fiery Teleportation moves willing nearby creatures up to 15 ft, DEX save DC "+dc+" for 1d6 + PB Fire at departure.","Acts immediately after your turn; Bonus Action command, otherwise Dodge.","Duration 1 hour; summoning burst 2d6 Fire, DEX save DC "+dc+" to avoid.",l>=6?"Enhanced Bond: add 1d8 to one fire damage or healing roll; non-self spell may originate at spirit.":""]};
}
function companionState(c,key){
  const x=c.subCompanions?.[key],s=x&&companionStats(c,key,x.form);
  if(!s)return null;
  if(c.death?.dead&&key!=="beast14"&&key!=="steel")return null;
  const hp=c.death?.dead&&key==="steel"?0:Math.max(0,Math.min(s.hp,Number.isFinite(+x.hp)?Math.trunc(+x.hp):s.hp));
  if(!hp&&FADING_COMPANIONS.includes(key))return null;
  return {...s,form:x.form,current:hp,pending:!!x.pending,revivalClosed:!!x.revivalClosed};
}
function companionSlots(c,minimum=1){return pcResources(c).filter(r=>{
  const level=r.key==="pact"?Number(r.name.match(/level (\d+)/i)?.[1]):/^slot[1-9]$/.test(r.key)?Number(r.key.slice(4)):0;
  return level>=minimum&&resLeft(c,r)>0;
});}
function companionSummon(c,key,form,pay){
  if(c.death?.dead)return "The companion’s owner must be alive.";
  if(key==="homunculus")return "Infuse an eligible heart to create the servant.";
  const s=companionStats(c,key,form);if(!s)return "Companion unavailable.";
  c.used=c.used||{};c.subCompanions=c.subCompanions||{};c.companionRest=c.companionRest||{};
  const existing=companionState(c,key);
  if(key==="beast14"){
    if(existing&&existing.current>0)return "An existing living companion is already bonded.";
    if(pay!=="bond")return "Confirm initial choice or eight hours bonding with a nonhostile replacement beast.";
  }else if(REST_COMPANIONS.includes(key)){
    if(existing&& !c.companionRest[key])return "Replacement requires a completed Long Rest (or the applicable revival procedure).";
    if(pay!=="free")return "Choose the free creation option.";
    c.companionRest[key]=false;
  }else if(key==="wildfire"){
    const r=pcResources(c).find(x=>x.key==="wild");if(pay!=="wild"||!r||resLeft(c,r)<1)return "Wild Shape use required.";
    if(r.max!==Infinity)c.used.wild=(+c.used.wild||0)+1;
  }else if(pay==="free"){
    if(c.used.drakeSummon)return "Free summon already used.";
    c.used.drakeSummon=1;
  }else{
    const slot=companionSlots(c).find(r=>r.key===pay);if(!slot)return "Choose an available spell slot.";
    c.used[slot.key]=(+c.used[slot.key]||0)+1;
  }
  c.subCompanions[key]={form,hp:s.hp};return s.name+" created at full HP."+ (key==="wildfire"?" Resolve summoning burst and 1-hour expiry manually.":" Confirm required action and placement.");
}
function companionSetHP(c,key,hp){
  const s=companionState(c,key);if(!s||s.pending||!Number.isFinite(+hp))return false;
  // Never revive a zero-HP summoned creature by editing its counter.
  if(s.current===0&&+hp>0)return false;
  const current=Math.max(0,Math.min(s.hp,Math.trunc(+hp)));
  if(FADING_COMPANIONS.includes(key)&&current===0)delete c.subCompanions[key];
  else c.subCompanions[key].hp=current;
  return true;
}
function companionRevive(c,key,pay,confirmed){
  const s=companionState(c,key);
  if(c.death?.dead||!s||s.current!==0||s.pending||s.revivalClosed||!REST_COMPANIONS.includes(key))return "No eligible dead companion.";
  if(!confirmed)return "Confirm the companion died within the last hour and you can meet the revival requirements.";
  const r=companionSlots(c).find(x=>x.key===pay);if(!r)return "An available spell slot is required.";
  c.used=c.used||{};c.used[r.key]=(+c.used[r.key]||0)+1;c.subCompanions[key].pending=true;return "Revival started. Confirm death within the last hour, touch/tools and required action; finish after 1 minute.";
}
function companionFinishRevive(c,key){
  const s=companionState(c,key);if(!s||!s.pending)return "No pending revival.";
  c.subCompanions[key].hp=s.hp;delete c.subCompanions[key].pending;delete c.subCompanions[key].revivalClosed;return s.name+" restored to full HP.";
}
function companionOnOwnerDeath(c){
  if(!c.subCompanions)return;
  for(const key of [...FADING_COMPANIONS,"primal","primal14","steel24"])delete c.subCompanions[key];
  if(c.subCompanions.steel)Object.assign(c.subCompanions.steel,{hp:0,pending:false});
}
function companionCleanup(c){
  if(c.death?.dead)companionOnOwnerDeath(c);
  for(const key of Object.keys(c.subCompanions||{})){
    if(Object.hasOwn(SUB_COMPANIONS,key)&&!companionLevel(c,key))delete c.subCompanions[key];
  }
}
function companionRoll(c,key,kind){
  const s=companionState(c,key);if(!s||s.current<1||s.pending)return "Companion not active.";
  if(key==="beast14"){
    const match=String(kind).match(/^(attack|damage):(\d+)$/),a=match&&s.attackOptions[+match[2]];
    if(!a)return "Choose a supported beast attack.";
    return match[1]==="attack"?rollMsg(s.name+" · "+a.name,"1d20"+sgn(a.hit),"Confirm command and target."):roll(s.name+" · "+a.name,a.damage,"damage",a.type+"; resolve original attack riders separately.");
  }
  if(kind==="attack")return rollMsg(s.name+" attack","1d20"+sgn(s.hit),"Confirm command, target and hit.");
  if(kind==="damage")return roll(s.name+" damage",s.damage,"damage",s.type+"; resolve extra riders and damage type choice separately.");
  if(key==="drake"&&kind==="infused")return roll("Infused Strikes","1d6","damage",`${s.form} damage. Confirm the drake’s Reaction, a visible creature within 30 feet, and its weapon hit.`);
  if(key==="drake"&&kind==="elemental"&&companionLevel(c,key)>=7)return roll("Drake Bite · elemental damage",companionLevel(c,key)>=15?"2d6":"1d6","damage",`${s.form} damage on a confirmed Bite hit.`);
  if(key==="wildfire"&&kind==="teleport")return area("Fiery Teleportation","1d6"+sgn(c.prof),"dex",s.dc,"fire","Move the spirit and chosen willing creatures within 5 feet to visible unoccupied spaces up to 15 feet away. Resolve the save against the damage for creatures within 5 feet of the departure space.",{noneOnSave:true,chooseTargets:true,includeSelf:true});
  if(["steel","steel24"].includes(key)&&kind==="deflect"){
    const l=companionLevel(c,key);if(l>=15)return roll("Improved Deflection","1d4"+sgn(c.mods.int),"damage","Force; impose Disadvantage on the eligible attack against another creature. Confirm defender's Reaction and attacker within 5 ft.");
    return "Deflect Attack: impose Disadvantage on an attack against another creature by a visible attacker within 5 feet of the defender. Confirm its Reaction.";
  }
  if(["steel","steel24"].includes(key)&&["repair","repairOther"].includes(kind)){
    c.used=c.used||{};if((+c.used.steelRepair||0)>=3)return "No repair uses left.";
    c.used.steelRepair=(+c.used.steelRepair||0)+1;
    const expr="2d8"+sgn(key==="steel24"?c.mods.int:c.prof);
    if(kind==="repairOther")return roll("Steel Defender Repair",expr,"heal","Confirm the selected Construct or object is visible to the defender and within 5 feet.");
    const r=rollDice(expr);companionSetHP(c,key,s.current+Math.max(0,r.total));return "Repair: "+r.text+". Defender now "+companionState(c,key).current+"/"+s.hp+" HP.";
  }
  if(["steel","homunculus"].includes(key)&&kind==="mending"){const r=rollDice("2d6");companionSetHP(c,key,s.current+r.total);return "Mending: "+r.text+". Confirm a completed casting.";}
  if(key==="homunculus"&&kind==="channel")return "Confirm its Reaction and that it is within 120 feet of you. Resolve a Touch-range spell you cast from the servant’s location.";
  return "Unavailable.";
}
function drakeBreathChoices(c){
  if(c.death?.dead||companionLevel(c,"drake")<11)return [];
  const free=resLeft(c,pcResources(c).find(r=>r.key==="drakeBreath"))>0;
  const sources=companionState(c,"drake")?["Ranger","Drake"]:["Ranger"];
  const payments=free?[["free","free use"]]:companionSlots(c,3).map(r=>[r.key,r.name]);
  return sources.flatMap(source=>dragonElements.flatMap(type=>payments.map(([pay,label])=>[`${source}:${type}:${pay}`,`${source} · ${type} · ${label}`])));
}
function drakeBreathUse(c,choice){
  const [source,type,pay]=choice.split(":"),level=companionLevel(c,"drake"),slot=pay==="free"?"drakeBreath":pay;
  c.used[slot]=(+c.used[slot]||0)+1;
  return area("Drake’s Breath",level>=15?"10d6":"8d6","dex",8+c.prof+c.mods.wis,type,`Confirm the ${source.toLowerCase()}’s 30-foot cone and each target. Successful saves take half damage.`,{chooseTargets:true,includeSelf:source==="Drake"});
}
function wildfireRevivalReady(c){
  return companionLevel(c,"wildfire")>=14&&c.hpCur!==""&&c.hpCur!=null&&+c.hpCur===0&&c.conds?.unconscious&&!c.death?.dead&&(+c.death?.f||0)<3&&!!companionState(c,"wildfire");
}
function companionRestUpdate(c,kind){
  if(c.subCompanions)delete c.subCompanions.wildfire;
  c.companionRest=c.companionRest||{};
  for(const key of REST_COMPANIONS){
    if(companionLevel(c,key)<SUB_COMPANIONS[key].lv)continue;
    const state=c.subCompanions?.[key];
    if(state?.pending)companionFinishRevive(c,key);
    else if(state?.hp===0)state.revivalClosed=true;
    if(kind==="long")c.companionRest[key]=true;
  }
}
function rcCompanionsHTML(c){
  const slots=companionSlots(c),slotOptions=slots.map(r=>`<option value="${esc(r.key)}">${esc(r.name)}</option>`).join("");
  const variant=companionLevel(c,"beast14")||companionLevel(c,"primal14")?`<label class="field">Beast Master companion rules<select data-companion-variant>
    <option value="natural">2014 Player’s Handbook companion</option><option value="primal" ${c.beastCompanionVariant==="primal"?"selected":""}>Tasha’s optional Primal Companion</option>
  </select></label>`:"";
  const cards=Object.entries(SUB_COMPANIONS).map(([key,d])=>{
    if(companionLevel(c,key)<d.lv)return "";
    const s=companionState(c,key),steel=key==="steel"||key==="steel24";
    const btn=(op,label)=>`<button type="button" class="btn sm" data-companion-op="${op}" data-companion-key="${key}">${label}</button>`;
    const forms=companionForms(key).map(([f,label])=>`<option value="${esc(f)}" ${s?.form===f?"selected":""}>${esc(label)}</option>`).join("");
    const pay=key==="beast14"?'<option value="bond">Confirm initial bond or 8 hours for replacement</option>':key==="wildfire"?'<option value="wild">Wild Shape</option>':key==="drake"?
      ((c.used?.drakeSummon?"":'<option value="free">Free summon</option>')+slotOptions):'<option value="free">Create / replace</option>';
    let card="<p>No companion recorded.</p>";
    if(s){
      const attacks=key==="beast14"?s.attackOptions.map((a,i)=>btn("attack:"+i,esc(a.name)+" attack")+btn("damage:"+i,esc(a.name)+" damage")).join(""):btn("attack","Roll attack")+btn("damage","Roll damage");
      const actions=steel?btn("repair","Repair self ("+Math.max(0,3-(+c.used?.steelRepair||0))+")")+btn("repairOther","Repair adjacent Construct or object")+btn("deflect","Deflect Attack")+(key==="steel"?btn("mending","Mending"):""):
        key==="homunculus"?btn("mending","Mending")+btn("channel","Channel Magic"):key==="wildfire"?btn("teleport","Fiery Teleportation"):
        key==="drake"?btn("infused","Infused Strikes")+(companionLevel(c,key)>=7?btn("elemental","Roll Bite elemental damage"):""):"";
      const revival=s.pending?btn("finish","Confirm 1 minute elapsed"):REST_COMPANIONS.includes(key)&&!s.revivalClosed&&slots.length?
        `<label class="check"><input type="checkbox" data-companion-recent="${key}"> Confirm death within the last hour and required touch and action</label><select aria-label="Revival spell slot" data-companion-revive="${key}">${slotOptions}</select>${btn("revive","Begin revival")}`:
        s.revivalClosed?"<p>The revival window has closed.</p>":"";
      card=`<p><b>${esc(s.name)}</b> · ${esc(s.size)} · AC ${s.ac} · ${esc(s.speed)} · HD ${esc(s.hd)}</p>
        <label>HP <input type="number" min="0" max="${s.hp}" value="${s.current}" data-companion-hp="${key}" ${s.pending||!s.current?"disabled":""}> / ${s.hp}</label>
        <p>${esc(s.scores.join(" / "))} (STR / DEX / CON / INT / WIS / CHA)</p><p>Attack ${sgn(s.hit)} · ${esc(s.damage+" "+s.type)} · ${s.attacks} attack(s)</p>
        <p>${s.notes.filter(Boolean).map(esc).join("<br>")}</p>${s.current>0?attacks+actions:"<p>At 0 HP</p>"+revival}
        ${key==="wildfire"||key==="drake"?btn("dismiss","End summon"):""}`;
    }
    const creation=key==="homunculus"?(s?"":"<p>The servant has vanished. Its heart remains in the inventory.</p>"):
      `<div class="row" style="flex-wrap:wrap"><select aria-label="Companion form" data-companion-form="${key}">${forms}</select><select aria-label="Creation resource" data-companion-pay="${key}">${pay}</select>${btn("summon","Create / summon")}</div>`;
    return `<div class="abl"><div class="abl-h"><b>${esc(d.sub)} companion</b></div><div class="ft-desc">${card}${creation}<p class="hint">Confirm commands, distances, and combat timing at the table.</p></div></div>`;
  }).join("");
  return variant+cards;
}

// Arcana Unleashed uses the same saved selection keys as the older Archer.
const REVISED_ARCANE_SHOTS={
  "Banishing Arrow":[1,"psychic","CHA save or banished, Incapacitated and Speed 0 through the end of the target’s next turn. It returns to its previous space or the nearest open space."],
  "Beguiling Arrow":[2,"psychic","WIS save or Charmed by you or one of your allies within 30 feet of the target until your next turn starts. The charm ends if the charmer attacks, damages, or forces a save on it."],
  "Bursting Arrow":[2,"force","The creature hit and every creature within a 10-foot Emanation from it takes the damage."],
  "Enfeebling Arrow":[2,"necrotic","CON save or Poisoned through the end of its next turn. Subtract one Arcane Shot die from its total damage on each attack hit while Poisoned this way."],
  "Grasping Arrow":[1,"slashing","STR save or Restrained for 1 minute or until you use this shot again. The target or a creature in reach can use an Action to remove the brambles with an Athletics check against your DC."],
  "Piercing Arrow":[2,"piercing","No attack roll. A 30-foot by 1-foot Line ignores cover. Each creature makes a DEX save against the weapon damage plus the extra Piercing damage, for half on success."],
  "Seeking Arrow":[2,"force","No attack roll. Choose a creature seen in the last minute. The shot turns corners, ignores Half and Three-Quarters Cover, and disappears if the target is outside long range. In range the target makes a DEX save for half of weapon plus extra damage. On failure you learn its location."],
  "Shadow Arrow":[1,"psychic","WIS save or Blinded through the end of its next turn."]
};
const REVISED_MAGICAL_AMMO={
  Darkening:"Shadows fill a 15-foot Emanation for 1 minute. Extinguish nonmagical flames and apply −5 to Perception checks and passive Perception within it.",
  Unlocking:"A knock audible to 300 feet opens stuck or barred objects and one nonmagical lock per locked object within a 15-foot Emanation.",
  Vine:"A climbable 120-foot vine grows for 10 minutes, then withers."
};
const DEDICATED_SUBCLASS_ACTIONS=new Set([
  "Arcane Shot","Curving Shot","Magical Ammunition","Masterful Shots","Ever-Ready Shot","Indomitable Teleport",
  "Enhanced Bond","Cauterizing Flames","Blazing Revival","Reflexive Resistance","Drake's Breath","Drake’s Breath"
]);
function arcaneArcherPrint(c){
  const entry=subclassEntry(edOf(c),"Fighter","Arcane Archer",false);
  return entry?.book&&["au","xge"].includes(entry.src)?entry.src:"";
}
function arcaneArcherLevel(c){
  const level=characterSubclassLevel(c,"Fighter","Arcane Archer");
  return level&&arcaneArcherPrint(c)?level:0;
}
function revisedArcaneArcher(c){return arcaneArcherLevel(c)>0&&arcaneArcherPrint(c)==="au";}
function arcaneArcherWeapons(c,requireAmmunition=true){
  const ed=edOf(c);
  return (c.inv||[]).filter(i=>i.id&&i.eq&&+i.qty>0).flatMap(item=>{
    const weapon=eqWeaponOf(item,ed);
    const ammunition=weapon?.st?.some(([key,value])=>key==="Properties"&&/\bAmmunition\b/i.test(value));
    const attack=weapon&&(!requireAmmunition||ammunition)&&eqAttack(c,item,weapon);
    return attack&&(!attack.melee||(!requireAmmunition&&attack.thrown))?[{item,attack}]:[];
  });
}
function revisedShotChoices(c){
  if(!revisedArcaneArcher(c)||c.arcaneShotUsedThisTurn||c.death?.dead)return [];
  const selections=[...new Set(choiceOf(c,"Arcane Shot Options").map(name=>String(name).replace(/ Shot$/," Arrow")))];
  const shots=selections.filter(name=>Object.hasOwn(REVISED_ARCANE_SHOTS,name)).slice(0,CHOICES["Arcane Shot Options"].n(c));
  return arcaneArcherWeapons(c).flatMap(({item})=>shots.map(name=>[
    JSON.stringify([name,item.id]),`${name.replace(/ Arrow$/," Shot")} · ${item.n}`
  ]));
}
function revisedShotUse(c,selection){
  const [id,weaponId]=JSON.parse(selection),[dice,type,effect]=REVISED_ARCANE_SHOTS[id];
  const name=id.replace(/ Arrow$/," Shot"),level=arcaneArcherLevel(c),die=level>=18?12:level>=15?10:level>=10?8:6;
  const expr=`${dice}d${die}`,dc=8+c.prof+c.mods.int;
  c.arcaneShotUsedThisTurn=true;
  if(id==="Piercing Arrow"||id==="Seeking Arrow"){
    const equipped=arcaneArcherWeapons(c).find(({item})=>item.id===weaponId);
    const attack=(c.attacks||[]).find(a=>a.iid===weaponId)||equipped.attack;
    const weapon=rollDice(attack.dmg||attack.die+sgn(attack.mod)),extra=rollDice(expr);
    return `${name} · DC ${dc}. ${weapon.total} ${attack.type} weapon damage and ${extra.total} ${type} damage, ${Math.floor((weapon.total+extra.total)/2)} total on a successful save. ${effect} Resolve damage types and defenses separately.`;
  }
  const text=`${type} damage on a confirmed hit. ${effect}${id==="Bursting Arrow"?"":` Save DC ${dc}.`}${id==="Enfeebling Arrow"?` Roll d${die} for the reduction.`:""}`;
  return id==="Bursting Arrow"?area(name,expr,null,0,type,text,{chooseTargets:true}):roll(name,expr,"damage",text);
}
function arcaneArcherInitiative(c){
  if(!revisedArcaneArcher(c)||arcaneArcherLevel(c)<10||!(+c.used?.arcaneShot>0))return false;
  const max=Math.max(1,c.mods.int);
  c.used.arcaneShot=Math.max(0,Math.min(max,+c.used.arcaneShot)-1);
  return true;
}
function archerAttackChoices(c){return arcaneArcherWeapons(c).map(({item})=>[item.id,item.n]);}
function archerReroll(c,id,label,requireAmmunition=true){
  const {item,attack:base}=arcaneArcherWeapons(c,requireAmmunition).find(({item})=>item.id===id);
  const attack=(c.attacks||[]).find(a=>a.iid===item.id)||base;
  rollD20(c,`${label} · ${item.n}`,attack.hit,"attack",attack.ab,{tags:attack.tags,crit:attack.crit});
  return null;
}

// Legacy dragon and sun monk abilities use the owning Monk level, not total level.
const legacyMonkSub=(c,name)=>edOf(c)==="2014"?characterSubclassLevel(c,"Monk",name):0;
const dragonMonk=c=>legacyMonkSub(c,"Way of the Ascendant Dragon");
const sunMonk=c=>legacyMonkSub(c,"Way of the Sun Soul");
const dragonElements=["acid","cold","fire","lightning","poison"];
function legacyMonkPools(c){
 const l=dragonMonk(c),R=[];
 if(l>=3)R.push({key:"dragonPresence",name:"Draconic Presence",max:1,recharge:"long"},{key:"dragonBreath",name:"Breath of the Dragon",max:c.prof,recharge:"long"});
 if(l>=6)R.push({key:"dragonWings",name:"Wings Unfurled",max:c.prof,recharge:"long"});
 if(l>=11)R.push({key:"dragonAura",name:"Aspect of the Wyrm",max:1,recharge:"long"});
 return R;
}
function legacyMonkActions(c){
 const d=dragonMonk(c),s=sunMonk(c),A=[],add=(name,when,text,res,owner)=>A.push({name,when,text,res,owner});
 const dragon="Way of the Ascendant Dragon",sun="Way of the Sun Soul";
 if(d>=3){
  add("Draconic Presence","On failed CHA check","Reroll failed Intimidation or Persuasion using Reaction; spend use only on success.","dragonPresence",dragon);
  add("Breath of the Dragon","Replace attack","Dexterity save against ki DC; "+(d>=11?3:2)+" Martial Arts dice of chosen damage, half on success. Free uses, then 2 ki; at Monk 17 add 1 ki for augmented breath.","dragonBreath",dragon);
 }
 if(d>=6)add("Wings Unfurled","On Step of the Wind","Fly at walking speed until your turn ends; confirm Step of the Wind already used.","dragonWings",dragon);
 if(d>=11){add("Aspect of the Wyrm","Bonus action","10-foot aura for 1 minute: resistance or fear; free once per Long Rest, otherwise 3 ki.","dragonAura",dragon);add("Frightful Presence (Wyrm)","Bonus action","While fear aura active, choose a creature in aura; Wisdom save or Frightened for 1 minute, repeating save at end of its turns.",null,dragon);}
 if(d>=17)add("Explosive Fury (Wyrm)","On aura activation","Chosen visible creatures inside aura save vs ki DC or take 3d10 selected elemental damage.",null,dragon);
 if(s>=3)add("Radiant Sun Bolt","Attack / Bonus action","30-foot ranged spell attack, Dexterity for hit/damage; after using it in Attack action, spend 1 ki for two further bolts as Bonus Action.",null,sun);
 if(s>=6)add("Searing Arc Strike","Bonus action after Attack","Spend 2 ki for Burning Hands at level 1; each extra ki raises spell level by 1, cost at most half Monk level.","ki",sun);
 if(s>=11)add("Searing Sunburst","Action","150-foot range, 20-foot sphere, Constitution save for no damage; 2d6 radiant +2d6 per ki (max 3).",null,sun);
 if(s>=17)add("Sun Shield","Bonus action","Toggle bright 30-foot/dim 30-foot aura; while illuminated, melee hits against you allow Reaction radiant retaliation of 5 + WIS.",null,sun);
 if(s>=17)add("Sun Shield retaliation","Reaction","When hit by a melee attack while light is active, attacker takes 5 + WIS radiant.",null,sun);
 return A;
}
function monkResource(c,key){return pcResources(c).find(r=>r.key===key);}
function monkCanPay(c,key,n){const r=monkResource(c,key);return !!r&&resLeft(c,r)>=n;}
function monkPay(c,key,n){if(!monkCanPay(c,key,n))return false;c.used=c.used||{};c.used[key]=(+c.used[key]||0)+n;return true;}
function dragonBreathChoices(c){
 const l=dragonMonk(c),free=monkCanPay(c,"dragonBreath",1),base=free?0:2,out=[];
 if(l<3)return out;
 for(const type of dragonElements){
  if(base===0||monkCanPay(c,"ki",base))for(const shape of ["cone","line"])out.push([type+":"+shape+":normal",type+" "+shape+" · "+(base?base+" ki":"free use")]);
  if(l>=17&&monkCanPay(c,"ki",base+1))for(const shape of ["cone","line"])out.push([type+":"+shape+":augmented",type+" augmented "+shape+" · "+(base+1)+" ki"+(free?" + free use":"")]);
 }return out;
}
function dragonBreathUse(c,ch){
 const [type,shape,mode]=String(ch).split(":"),free=monkCanPay(c,"dragonBreath",1),aug=mode==="augmented",cost=(free?0:2)+(aug?1:0);
 if(!dragonBreathChoices(c).some(x=>x[0]===ch))return "Unavailable breath option.";
 if(cost&&!monkPay(c,"ki",cost))return "Insufficient ki.";
 if(free)monkPay(c,"dragonBreath",1);
 const range=aug?(shape==="cone"?"60-ft cone":"90-ft by 5-ft line"):(shape==="cone"?"20-ft cone":"30-ft by 5-ft line");
 return roll("Breath of the Dragon",(aug?4:dragonMonk(c)>=11?3:2)+"d"+maDie(c),"damage",type+" damage; "+range+"; DEX save DC "+(8+c.prof+c.mods.wis)+" for half. Replace one Attack-action attack.",true);
}
function dragonAuraChoices(c){
 if(dragonMonk(c)<11||!monkCanPay(c,"dragonAura",1)&&!monkCanPay(c,"ki",3))return [];
 return [["fear","Frightful Presence"],...dragonElements.map(x=>[x,x+" resistance"])];
}
function dragonAuraStart(c,ch){
 const key=monkCanPay(c,"dragonAura",1)?"dragonAura":"ki",cost=key==="ki"?3:1;
 if(!monkPay(c,key,cost)){delete c.active["Aspect of the Wyrm"];return "Insufficient uses.";}
 c.dragonFuryPending=dragonMonk(c)>=17; return "Aspect of the Wyrm active for 1 minute; confirm aura targets and expiry at the table."+(c.dragonFuryPending?" Resolve Explosive Fury now.":"");
}
function dragonPresenceChoices(c){return c.dragonPresencePending?[["success","Reroll succeeded"],["failure","Reroll failed"]]:monkCanPay(c,"dragonPresence",1)?[["intimidation","Reroll Intimidation"],["persuasion","Reroll Persuasion"]]:[];}
function dragonPresenceUse(c,ch){
 if(ch==="success"||ch==="failure"){if(!c.dragonPresencePending)return "No pending reroll.";delete c.dragonPresencePending;if(ch==="success"){if(!monkPay(c,"dragonPresence",1))return "Use unavailable.";return "Success confirmed; use expended.";}return "Failure confirmed; use retained.";}
 if(!monkCanPay(c,"dragonPresence",1)||c.dragonPresencePending)return "Unavailable.";
 const skill=c.skills.find(x=>x.s.toLowerCase()===ch),value=skill?skill.v:c.mods.cha,r=rollDice("1d20"+sgn(value));
 c.dragonPresencePending=true;return "Draconic Presence: "+r.text+". Confirm success or failure.";
}

// Portent stores actual foretelling rolls, not just a generic use counter.
function portentCount(c){
 const l=characterSubclassLevel(c,"Wizard",edOf(c)==="2024"?"Diviner":"School of Divination");
 return l>=14?3:l>0?2:0;
}
function portentDice(c){
 const n=portentCount(c),p=c.portent;
 return n&&p?.edition===edOf(c)&&Array.isArray(p.dice)?p.dice.slice(0,n):[];
}
function rollPortents(c,rest=false){
 const n=portentCount(c);if(!n)return "Portent is unavailable.";
 if(!rest&&c.portent?.edition===edOf(c)&&Array.isArray(c.portent.dice))return "Foretelling dice have already been recorded; finish a Long Rest.";
 const spent=rest?0:Math.min(n,Math.max(0,Math.trunc(+(c.used||{})[subAblKey("Portent")]||0)));
 c.portent={edition:edOf(c),dice:Array.from({length:n},(_,i)=>({value:rollDice("1d20").total,spent:i<spent})),turnUsed:false};
 return "Portent: "+c.portent.dice.map(d=>d.value+(d.spent?" (spent)":"")).join(", ")+".";
}
function portentChoices(c){
 if(!portentCount(c))return [];
 if(!portentDice(c).length)return [["init","Record foretelling dice (confirm no previous rolls)"]];
 if(c.portent.turnUsed)return [["next","Confirm a new creature turn"]];
 return portentDice(c).flatMap((d,i)=>!d.spent&&Number.isInteger(d.value)&&d.value>=1&&d.value<=20?[[String(i),"Die "+(i+1)+": "+d.value]]:[]);
}
function usePortent(c,ch){
 if(!portentChoices(c).some(([id])=>id===ch))return "Portent option unavailable.";
 if(ch==="init")return rollPortents(c);
 if(ch==="next"){c.portent.turnUsed=false;return "Portent turn limit reset; confirm a different creature turn.";}
 const d=c.portent.dice[+ch];d.spent=true;c.portent.turnUsed=true;
 return "Portent: replace the chosen visible creature's attack, ability check or saving throw d20 with "+d.value+". Choose before the roll; apply modifiers and target manually.";
}
// Ward HP is separate from character HP and temporary HP.
function arcaneWardLevel(c){return characterSubclassLevel(c,"Wizard",edOf(c)==="2024"?"Abjurer":"School of Abjuration");}
function arcaneWardMax(c){const l=arcaneWardLevel(c);return l?Math.max(0,2*l+(+c.mods?.int||0)):0;}
function arcaneWardHP(c){return arcaneWardLevel(c)&&c.arcaneWard?.edition===edOf(c)?Math.max(0,Math.min(arcaneWardMax(c),Math.trunc(+c.arcaneWard.hp||0))):0;}
function arcaneWardExists(c){return !!(arcaneWardLevel(c)&&c.arcaneWard?.edition===edOf(c));}
function arcaneWardCastEligible(c,sp,how,slot,ed=edOf(c)){
 return ed===edOf(c)&&arcaneWardLevel(c)>0&&+sp?.l>0&&String(sp.s).toLowerCase()==="abjuration"&&+slot>=1&&(ed==="2014"||/^slot[1-9]$|^pact$/.test(how));
}
function arcaneWardOnCast(c,sp,how,slot,create=true,ed=edOf(c)){
 if(!arcaneWardCastEligible(c,sp,how,slot,ed))return "";
 const before=arcaneWardHP(c);
 if(!arcaneWardExists(c)){if(!create)return "";c.arcaneWard={edition:ed,hp:arcaneWardMax(c)};return "Arcane Ward created: "+arcaneWardHP(c)+" HP.";}
 c.arcaneWard.hp=Math.min(arcaneWardMax(c),before+2*slot);
 return "Arcane Ward: "+arcaneWardHP(c)+"/"+arcaneWardMax(c)+" HP ("+(arcaneWardHP(c)-before)+" restored).";
}
function arcaneWardAbsorb(c,damage){
 const n=Math.max(0,Math.trunc(+damage||0)),absorbed=Math.min(n,arcaneWardHP(c));
 if(absorbed)c.arcaneWard.hp=arcaneWardHP(c)-absorbed;
 return {absorbed,left:n-absorbed};
}
function arcaneWardRechargeOptions(c){
 if(edOf(c)!=="2024"||!arcaneWardExists(c)||arcaneWardHP(c)>=arcaneWardMax(c))return [];
 return pcResources(c).filter(r=>(/^slot[1-9]$/.test(r.key)||r.key==="pact")&&resLeft(c,r)>0).map(r=>[r.key,r.name]);
}
function arcaneWardRecharge(c,key){
 if(!arcaneWardRechargeOptions(c).some(([id])=>id===key))return "No eligible ward recovery.";
 const r=pcResources(c).find(r=>r.key===key),l=key==="pact"?+(r.name.match(/level (\d)/)||[])[1]:+key.slice(4);
 if(!l)return "Invalid spell slot.";
 c.used=c.used||{};c.used[key]=(+c.used[key]||0)+1;
 c.arcaneWard.hp=Math.min(arcaneWardMax(c),arcaneWardHP(c)+2*l);
 return "Arcane Ward: "+arcaneWardHP(c)+"/"+arcaneWardMax(c)+" HP.";
}
function projectedWardOptions(c){
 return arcaneWardLevel(c)>=6?Array.from({length:arcaneWardHP(c)},(_,i)=>[String(i+1),"Absorb "+(i+1)+" damage"]):[];
}
function projectedWardUse(c,ch){
 if(!projectedWardOptions(c).some(([id])=>id===ch))return "Projected Ward unavailable.";
 const a=arcaneWardAbsorb(c,+ch);
 return "Projected Ward absorbs "+a.absorbed+" damage. Confirm Reaction, visible creature within 30 ft and its remaining damage; apply that remainder manually.";
}
function expertDivinationOptions(c,sp,how,slot,ed=edOf(c)){
 if(ed!==edOf(c)||portentCount(c)===0||clsLv(c,"Wizard")<6||String(sp?.s).toLowerCase()!=="divination"||!/^slot[2-9]$|^pact$/.test(how)||slot<2)return [];
 return pcResources(c).flatMap(r=>{
  const l=/^slot[1-9]$/.test(r.key)?+r.key.slice(4):r.key==="pact"?+(r.name.match(/level (\d)/)||[])[1]:0;
  return l>=1&&l<=5&&l<slot&&r.key!==how&&resLeft(c,r)<r.max?[[r.key,r.name]]:[];
 });
}
function expertDivinationRecover(c,sp,how,slot,key,ed=edOf(c)){
 if(!expertDivinationOptions(c,sp,how,slot,ed).some(([id])=>id===key))return "";
 c.used[key]=Math.max(0,(+c.used[key]||0)-1);
 return "Expert Divination restored one "+key.replace("slot","level ")+" slot.";
}
function spellBreakerEligible(c,sp,how,ed=edOf(c)){
 return ed==="2024"&&ed===edOf(c)&&arcaneWardLevel(c)>=10&&["Counterspell","Dispel Magic"].includes(sp?.n)&&/^slot[1-9]$|^pact$/.test(how);
}
function spellBreakerRecord(c,sp,how,ed=edOf(c)){
 delete c.spellBreakerPending;
 if(!spellBreakerEligible(c,sp,how,ed))return false;
 const n=+(c.used||{})[how]||0;if(n<=0)return false;
 c.spellBreakerPending={edition:ed,name:sp.n,key:how,used:n};return true;
}
function spellBreakerResolve(c,ch){
 const p=c.spellBreakerPending;
 if(!p||!spellBreakerEligible(c,{n:p.name},p.key,p.edition)||!["failed","stopped"].includes(ch))return "No eligible Spell Breaker casting.";
 delete c.spellBreakerPending;
 if(ch==="stopped")return "Spell stopped; slot remains spent.";
 if((+c.used?.[p.key]||0)!==p.used)return "Slot counter changed; reconcile this casting manually.";
 c.used[p.key]=Math.max(0,p.used-1);
 return "Spell Breaker: restored the slot spent on "+p.name+".";
}
function wizardSubclassCleanup(c){
 if(!portentCount(c)){delete c.portent; if(c.used)delete c.used[subAblKey("Portent")];}
 if(!arcaneWardLevel(c)){delete c.arcaneWard;}
 if(edOf(c)!=="2024"||arcaneWardLevel(c)<10)delete c.spellBreakerPending;
 else if(arcaneWardExists(c))c.arcaneWard.hp=arcaneWardHP(c);
 if(c.conc?.spell==="Mantle of Majesty"&&!majestyLevel(c)) {delete c.conc;delete c.concCheck;}
}
// Revised Goliath traits are mutually exclusive by chosen ancestry.
const GIANT_BOONS={
 "Cloud Giant":{name:"Cloud's Jaunt",when:"Bonus action",text:"Teleport up to 30 ft to a visible unoccupied space."},
 "Fire Giant":{name:"Fire's Burn",when:"After a damaging attack hit",text:"Deal 1d10 additional fire damage to the target."},
 "Frost Giant":{name:"Frost's Chill",when:"After a damaging attack hit",text:"Deal 1d6 additional cold damage and reduce the target’s Speed by 10 ft until your next turn begins."},
 "Hill Giant":{name:"Hill's Tumble",when:"After a damaging attack hit",text:"Give a Large or smaller target the Prone condition."},
 "Stone Giant":{name:"Stone's Endurance",when:"Reaction when damaged",text:"Reduce incoming damage by 1d12 plus your Constitution modifier."},
 "Storm Giant":{name:"Storm's Thunder",when:"Reaction when damaged",text:"Deal 1d8 thunder damage to the creature that damaged you, if it is within 60 ft."}
};
function giantBoon(c){return edOf(c)==="2024"&&c.race==="Goliath"&&Object.hasOwn(GIANT_BOONS,c.sub)?GIANT_BOONS[c.sub]:null;}
function giantBoonUse(c){
 const b=giantBoon(c);if(!b)return "Choose a valid Giant ancestry.";
 if(c.sub==="Fire Giant")return roll(b.name,"1d10","damage","Confirm damaging attack hit; apply to that target.");
 if(c.sub==="Frost Giant")return roll(b.name,"1d6","damage","Confirm damaging attack hit; apply the speed reduction manually until your next turn starts.");
 if(c.sub==="Storm Giant")return roll(b.name,"1d8","damage","Confirm Reaction and creature within 60 ft that damaged you.");
 if(c.sub==="Stone Giant"){const die=rollDice("1d12"),n=Math.max(0,die.total+c.mods.con);return b.name+": reduce damage by "+n+" ("+die.total+" + CON "+c.mods.con+"). Confirm Reaction; apply the remaining damage manually.";}
 return b.name+": "+b.text+" Confirm the trigger and target manually.";
}
// World of Warcraft, Death Knight base class: Death Coil and Improved Death Coil.
function deathCoilChoices(c){
 const pool=pcResources(c).find(r=>r.key==="deathCoil");
 if(!pool)return [];
 const limit=Math.min(resLeft(c,pool),Math.max(1,c.mods.cha));
 return Array.from({length:limit},(_,i)=>i+1).flatMap(n=>[["damage:"+n,n+"d8 Necrotic"],["heal:"+n,n+"d8 healing for an Undead"]]);
}
function deathCoilUse(c,choice,cost){
 const kind=choice.startsWith("heal:")?"heal":"damage",dice=rollDice(cost+"d8"),level=clsLv(c,"Death Knight");
 const extra=level>=14?(kind==="heal"?level:Math.max(1,c.mods.cha)):0,amount=dice.total+extra;
 const target=kind==="heal"?"Confirm a visible Undead target within 60 feet.":"Confirm a visible target within 60 feet. Constitution save DC "+(8+c.prof+c.mods.cha)+".";
 return {title:"Death Coil",kind,amount,half:kind==="damage",halfAmount:Math.floor(dice.total/2)+extra,
  msg:"Death Coil: "+dice.text+(extra?" + "+extra+" from Improved Death Coil ("+amount+" total). ":". ")+target};
}
function pcResources(c) {
  const ed = edOf(c), lv = c.level, m = c.mods, prof = c.prof, has = n => (c.feats || []).some(f => f.f === n), tr = n => (c.traits || []).includes(n); const CLV = k => classFeatureLevel(c, k), TLV = totalLv(c);
  const R = [], add = (key, name, max, recharge) => R.push({ key, name, max, recharge });
  add("hd", `Hit dice (${[...new Set(c.hdList || [c.hd])].map(d => "d" + d).join(" + ")})`, TLV, "hd");
  if (ed==="2024"&&clsLv(c,"Death Knight")) add("deathCoil", "Death Coil dice", Math.max(1,1+m.cha), "long");
  if (has("Runic Smite")) add("freeRuneStrike", "Free Rune Strike", 1, "long");
  if (ed === "2024" && clsLv(c, "Paladin") >= 2) add("freeDivineSmite", "Paladin's Smite", 1, "long");
  if (ed === "2024" && clsLv(c, "Paladin") >= 5) add("freePaladinSteed", "Faithful Steed", 1, "long");
  for (const spell of c.prepared || []) {
    if (!spell.bookGrant) continue;
    for (const source of spell.sources || []) {
      if (source.free && source.uses) {
        const uses = source.uses === "proficiency" ? prof : source.uses === "atWill" ? Infinity : source.uses === "wisdom" ? Math.max(1,m.wis) : source.uses === "charisma" ? Math.max(1,m.cha) : source.uses;
        if(!R.some(r=>r.key===source.free))add(source.free, source.sharedResource||`${source.feature || source.name} · ${spell.n}`, uses, source.recharge || "long");
      }
    }
  }
  if (clsLv(c, "Death Knight") >= 5) add("freeFindSteed", "Free Find Steed", 1, "long");
  if (has("Soul Fragments")) {
    const level = clsLv(c, "Demon Hunter");
    add("soulFragments", "Soul fragments", Math.max(1, c.mods.wis) + (level >= 13 ? 1 : 0) + (level >= 17 ? 1 : 0), "long");
  }
  if(ed==="2024"&&clsLv(c,"Shaman")>=3)add("totemPrimal","Primal Knowledge Totem",1,"long");
  if (has("Rage")) add("rage", "Rages", ed === "2014" && CLV("Barbarian") >= 20 ? Infinity : CLV("Barbarian") >= 17 ? 6 : CLV("Barbarian") >= 12 ? 5 : CLV("Barbarian") >= 6 ? 4 : CLV("Barbarian") >= 3 ? 3 : 2, ed === "2024" ? "short1" : "long");
  if (has("Bardic Inspiration")) add("bardic", "Bardic Inspiration", Math.max(1, m.cha), CLV("Bard") >= 5 ? "short" : "long");
  for(const r of channelPoolsForCharacter(c))R.push(r);
  if (has("Wild Shape")) add("wild", "Wild Shape", ed === "2014" && CLV("Druid") >= 20 ? Infinity : ed === "2024" ? (CLV("Druid") >= 17 ? 4 : CLV("Druid") >= 6 ? 3 : 2) : 2, ed === "2024" ? "short1" : "short");
  if (has("Second Wind")) add("wind", "Second Wind", ed === "2024" ? (CLV("Fighter") >= 10 ? 4 : CLV("Fighter") >= 4 ? 3 : 2) : 1, ed === "2024" ? "short1" : "short");
  if (has("Action Surge")) add("surge", "Action Surge", CLV("Fighter") >= 17 ? 2 : 1, "short");
  if (has("Indomitable")) add("indom", "Indomitable", CLV("Fighter") >= 17 ? 3 : CLV("Fighter") >= 13 ? 2 : 1, "long");
  if (has("Ki")||has("Monk's Focus")) add("ki", ed === "2024" ? "Focus points" : "Ki points", CLV("Monk"), "short");
  if(ed==="2024"&&clsLv(c,"Monk")>=2)add("uncannyMetabolism","Uncanny Metabolism",1,"long");
  if(ed==="2024"&&classFeatureLevel(c,"Barbarian")>=15)add("persistentRage","Persistent Rage recovery",1,"long");
  if(ed==="2024"&&clsLv(c,"Druid")>=5)add("wildResurgence","Wild Resurgence (create slot)",1,"long");
  if (has("Lay on Hands")) add("loh", "Lay on Hands pool", 5 * CLV("Paladin"), "long");
  if (has("Divine Sense") && ed === "2014") add("dsense", "Divine Sense", 1 + Math.max(0, m.cha), "long");
  if (has("Cleansing Touch")) add("cleanse", "Cleansing Touch", Math.max(1, m.cha), "long");
  if(ed==="2024"&&classFeatureLevel(c,"Ranger")>=10)add("rangerTireless","Tireless",Math.max(1,m.wis),"long");
  if(ed==="2024"&&classFeatureLevel(c,"Ranger")>=14)add("rangerVeil","Nature’s Veil",Math.max(1,m.wis),"long");
  if(ed==="2024"&&classFeatureLevel(c,"Sorcerer")>=1)add("innateSorcery","Innate Sorcery",2,"long");
  if(ed==="2024"&&classFeatureLevel(c,"Sorcerer")>=5)add("sorcerousRestore","Sorcerous Restoration",1,"long");
  if(ed==="2024"&&clsLv(c,"Warlock")>=2)add("magicalCunning","Magical Cunning",1,"long");
  if(ed==="2024"&&clsLv(c,"Warlock")>=9)add("freeContactPatron","Contact Patron",1,"long");
  if (has("Font of Magic")) add("sorc", "Sorcery points", CLV("Sorcerer"), "long");
  if (has("Favored Enemy") && ed === "2024") add("hmark", "Free Hunter's Mark", CLV("Ranger") >= 17 ? 6 : CLV("Ranger") >= 13 ? 5 : CLV("Ranger") >= 9 ? 4 : CLV("Ranger") >= 5 ? 3 : 2, "long");
  if(ed==="2024"&&classFeatureLevel(c,"Cleric")>=10)add("divineIntervention","Divine Intervention",1,"long");
  if(clsLv(c,"Artificer")>=7)add("flashGenius","Flash of Genius",Math.max(1,m.int),ed==="2024"?(clsLv(c,"Artificer")>=20&&artificerAttunedCount(c)>0?"short":clsLv(c,"Artificer")>=14?"short1":"long"):"long");
  if(ed==="2024"&&clsLv(c,"Artificer")>=1)add("tinkersMagic","Tinker's Magic",Math.max(1,m.int),"long");
  if(ed==="2024"&&clsLv(c,"Artificer")>=2)add("replicateCreation","Replicate Magic Item (rest creation)",artificerPlanLimits("2024",clsLv(c,"Artificer")).active,"long");
  if(artificerInfusionLevel(c)>=2)add("infusionCreation","Infuse Item (rest creation)",artificerPlanLimits("2014",artificerInfusionLevel(c)).active,"long");
  if(ed==="2024"&&clsLv(c,"Artificer")>=6){add("replicateDrain","Drain Magic Item",1,"long");add("replicateTransmute","Transmute Magic Item",1,"long");}
  if(clsLv(c,"Artificer")>=11)add("artificerStoreSetup","Spell-Storing Item setup",1,"long");
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
  if (tr("Adrenaline Rush")) add("adren", "Adrenaline Rush", prof, ed==="2024"&&c.race==="Orc"?"short":"long");
  if (giantBoon(c)) add("giant", "Giant Ancestry", prof, "long");
  if(ed==="2024"&&c.race==="Dwarf"&&tr("Stonecunning"))add("stonecunning","Stonecunning",prof,"long");
  if(ed==="2024"&&characterSubclassLevel(c,"Barbarian","Path of the Berserker")>=14)add("berserkerPresence","Intimidating Presence",1,"long");
  if(ed==="2024"&&characterSubclassLevel(c,"Sorcerer","Draconic Sorcery")>=14)add("draconicWings","Dragon Wings",1,"long");
  for(const r of psionicPools(c))if(!R.some(x=>x.key===r.key))add(r.key,r.name,r.max,r.recharge);
  for(const r of legacyMonkPools(c))add(r.key,r.name,r.max,r.recharge);
  if(companionLevel(c,"drake")>=3)add("drakeSummon","Drake summon",1,"long");
  if(companionLevel(c,"drake")>=11)add("drakeBreath","Drake’s Breath",1,"long");
  if(companionLevel(c,"drake")>=15)add("drakeResistance","Reflexive Resistance",prof,"long");
  if(companionLevel(c,"wildfire")>=10)add("cauterizingFlames","Cauterizing Flames",prof,"long");
  if(companionLevel(c,"wildfire")>=14)add("blazingRevival","Blazing Revival",1,"long");
  if(revisedArcaneArcher(c)){
    add("arcaneShot","Arcane Shot",Math.max(1,m.int),"short");
    if(arcaneArcherLevel(c)>=7)add("magicalAmmunition","Magical Ammunition",1,"short");
  }
  if(companionLevel(c,"steel")>=3||companionLevel(c,"steel24")>=3)add("steelRepair","Steel Defender repair",3,"long");
  if(battleSmithLevel(c)>=9)add("arcaneJolt","Arcane Jolt",Math.max(1,c.mods.int),"long");
  const subSeen=new Set();
  for(const f of (c.feats||[]).filter(f=>(f.sub||f.mcsub||f.bookSub)&&SUB_ABL[f.f]?.res)){
    const o=subclassFeatureOwner(c,f),S=SUB_ABL[f.f];
    if(!o.level||+f.l>o.level||f.bookSub&&!S.text&&!ACT[f.f])continue;
    if(isPsionicOwner(o)&&PSIONIC_FEATURES.has(f.f))continue;
    const key=subAblKey(f.f);if(subSeen.has(key)||R.some(r=>r.key===key))continue;subSeen.add(key);
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
  if(companionLevel(c,"drake")>=11)add("Drake’s Breath","Action","Choose a 30-foot cone from you or your summoned drake. Free once per Long Rest, then spend a level 3 or higher spell slot.","drakeBreath","Drakewarden");
  if(companionLevel(c,"drake")>=15&&companionState(c,"drake"))add("Reflexive Resistance","Reaction","When you or your drake takes damage while within 30 feet of each other, give the creature taking damage resistance to that instance.","drakeResistance","Drakewarden");
  if(companionLevel(c,"wildfire")>=6&&companionState(c,"wildfire"))add("Enhanced Bond","When casting","Roll 1d8 for one fire damage or healing roll of your spell. A non-Self spell can also originate from the spirit.",null,"Circle of Wildfire");
  if(companionLevel(c,"wildfire")>=10)add("Cauterizing Flames","Reaction","A Small or larger creature dying within 30 feet of you or your spirit leaves a flame for 1 minute. When a visible creature enters its space, extinguish the flame to heal or deal fire damage to that creature.","cauterizingFlames","Circle of Wildfire");
  if(wildfireRevivalReady(c))add("Blazing Revival","When reduced to 0 HP","Your spirit within 120 feet drops to 0 HP. You regain half your maximum hit points and stand up.","blazingRevival","Circle of Wildfire");
  if(revisedArcaneArcher(c)){
    const level=arcaneArcherLevel(c),owner="Arcane Archer";
    add("Arcane Shot","On a qualifying ranged attack","Use a learned shot once per turn with a ranged Ammunition weapon. Confirm the hit unless the shot replaces the attack roll.","arcaneShot",owner);
    if(c.arcaneShotUsedThisTurn)add("Begin Arcane Archer turn","New turn","Reset the once-per-turn shot limit after the current creature’s turn ends.",null,owner);
    if(level>=7){
      add("Curving Shot","Bonus action after a miss","Immediately roll with the same Ammunition weapon against a visible new target within its range and within 60 feet of the original target.",null,owner);
      add("Magical Ammunition","Magic action","Use nonmagical ammunition and fire at a visible solid surface within range. The effect starts on impact. Removing it takes a Magic action and ends the effect. The ammunition is destroyed when the effect ends.","magicalAmmunition",owner);
      if(+c.used?.magicalAmmunition>0)add("Restore Magical Ammunition","No action","Spend one use of Second Wind to recover the feature.","wind",owner);
    }
    if(level>=10)add("Ever-Ready Shot","On initiative","Rolling initiative on the character sheet restores one spent Arcane Shot use.",null,owner);
    if(level>=15)add("Indomitable Teleport","After a successful Indomitable save","Teleport up to 60 feet to a visible, unoccupied space.",null,owner);
    if(level>=18)add("Masterful Shots","Reaction when an attacker misses","Move up to half your Speed away from the visible attacker without provoking Opportunity Attacks. Then you may make a ranged attack against that attacker within weapon range.",null,owner);
  }
  const wisDC = 8 + prof + m.wis, chaB = Math.max(1, m.cha);
  if(arcaneWardLevel(c)){
    add("Arcane Ward status","Passive",arcaneWardExists(c)?"Ward HP "+arcaneWardHP(c)+"/"+arcaneWardMax(c)+". Apply Damage depletes the ward before temporary HP. "+(ed==="2024"?"Enter damage after resistance or vulnerability.":"Enter damage before resistance; manually reconcile resistance on overflow.")+" Direct HP edits are final values.":"Cast a qualifying Abjuration spell to create the ward.",null,"Wizard");
    if(ed==="2024"&&arcaneWardExists(c))add("Recharge Arcane Ward","Bonus action","Expend a spell slot to recover twice its level in ward HP.",null,"Abjurer");
    if(ed==="2024"&&arcaneWardLevel(c)>=10&&c.spellBreakerPending)add("Resolve Spell Breaker","After casting",c.spellBreakerPending.name+": confirm whether this casting stopped a spell before casting again.",null,"Abjurer");
  }
  if(portentCount(c))add("Portent record","Long Rest",portentDice(c).length?portentDice(c).map(d=>d.value+(d.spent?" (spent)":"")).join(" · "):"No foretelling dice recorded; use Portent to initialize at the table.",null,"Wizard");
  if (has("Rage")) add("Rage", "Bonus action", `+${CLV("Barbarian") >= 16 ? 4 : CLV("Barbarian") >= 9 ? 3 : 2} damage on Strength melee attacks, resistance to bludgeoning, piercing and slashing, advantage on Strength checks and saves. No spellcasting while raging.`, "rage");
  if(ed==="2024"&&classFeatureLevel(c,"Barbarian")>=15)add("Persistent Rage recovery","On initiative","Regain all expended Rage uses, once per Long Rest.","persistentRage");
  if(ed==="2024"&&clsLv(c,"Druid")>=2)add("Wild Companion","Magic action","Expend a Wild Shape use or spell slot to cast Find Familiar without Material components. The Fey familiar disappears at your next Long Rest.");
  if(ed==="2024"&&clsLv(c,"Druid")>=5)add("Wild Resurgence","No action","Spend a spell slot to regain Wild Shape when none remain, or spend one Wild Shape use to regain an expended level 1 slot once per Long Rest.");
  if(ed==="2024"&&classFeatureLevel(c,"Sorcerer")>=7)add("Sorcery Incarnate","Bonus action","When no Innate Sorcery uses remain, spend 2 Sorcery Points to activate it.","sorc");
  if(ed==="2024"&&clsLv(c,"Shaman")>=3){
    add("Totems","Bonus action","Place one Small totem (AC 10; HP 1) within 10 ft for 1 minute, replacing a previous totem. Pulses at the end of your turns."+ (c.shamanTotem?" Active: "+c.shamanTotem.name+". "+TOTEM_EFFECTS[c.shamanTotem.name]:""));
    add("Restore Primal Knowledge Totem","No action","Spend one Rage use to restore the limited totem use.");
    if(c.shamanTotem)add("End Totem","When destroyed or expired","Remove the current totem.");
  }
  if (has("Reckless Attack")) add("Reckless Attack", "On attack", "Advantage on your Strength attacks this turn; attacks against you have advantage until your next turn.");
  const ea = has("Extra Attack (3)")||has("Three Extra Attacks") ? 4 : has("Extra Attack (2)")||has("Two Extra Attacks") ? 3 : has("Extra Attack") ? 2 : 0;
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
  if(ed==="2024"&&classFeatureLevel(c,"Barbarian")>=9)add("Brutal Strike","On a confirmed eligible hit","Before the attack, forgo Advantage on a Strength-based Reckless Attack with no Disadvantage. On a hit, choose effects and roll extra damage. Use once on your turn.");
  if(ed==="2024"&&classFeatureLevel(c,"Sorcerer")>=20)add("Arcane Apotheosis","On your turn","While Innate Sorcery is active, one selected Metamagic option each turn can be used without Sorcery Points. Use Begin your turn to reset this allowance.");
  if (has("Cunning Action")) add("Cunning Action", "Bonus action", "Dash, Disengage or Hide.");
  if (has("Uncanny Dodge")) add("Uncanny Dodge", "Reaction", "Halve the damage of an attack that hits you from an attacker you can see.");
  if (has("Evasion")) add("Evasion", "Defense", "On a DEX save for half damage, take none on a success and half on a failure.");
  if (has("Lay on Hands")) add("Lay on Hands", ed === "2024" ? "Bonus action" : "Action", `Touch a creature and restore hit points from your pool of ${5 * CLV("Paladin")}, or spend 5 to ${ed==="2024"?"remove the Poisoned condition":"cure a disease or neutralize a poison"}.`, "loh");
  if(ed==="2024"&&clsLv(c,"Death Knight")){
    add("Death Coil","Bonus action","Your creature type is Undead. Spend dice to damage a visible creature within 60 feet, or heal it if it is Undead.","deathCoil","Death Knight");
    if(clsLv(c,"Death Knight")>=11)add("Runic Strikes","On hit","Deal 1d8 additional Necrotic damage when you hit with a melee weapon or Unarmed Strike.",null,"Death Knight");
  }
  if (ed==="2014"&&has("Divine Smite")) add("Divine Smite", "On hit", "Spend a spell slot: +2d8 radiant, +1d8 per slot level above 1st (max 5d8), +1d8 more against undead and fiends.");
  if (has("Divine Sense") && ed === "2014") add("Divine Sense", "Action", "Sense celestials, fiends and undead within 60 ft until the end of your next turn.", "dsense");
  if (has("Aura of Protection")) add("Aura of Protection", "Aura", `You and allies within ${CLV("Paladin") >= 18 ? 30 : 10} ft add +${chaB} to saving throws.`);
  if (has("Aura of Courage")) add("Aura of Courage", "Aura", `You and allies within ${CLV("Paladin") >= 18 ? 30 : 10} ft can't be frightened.`);
  if(ed==="2024"&&clsLv(c,"Paladin")>=11)add("Radiant Strikes","On hit","+1d8 radiant damage with a melee weapon or Unarmed Strike.");
  if(ed==="2014"&&has("Improved Divine Smite"))add("Improved Divine Smite","On hit","+1d8 radiant damage on every melee weapon hit.");
  if (ed==="2014"&&has("Cleansing Touch")) add("Cleansing Touch", "Action", "End one spell on yourself or a willing creature you touch.", "cleanse");
  if (has("Favored Enemy") && ed === "2024") add("Hunter's Mark", "Bonus action", `Cast without a spell slot: +1d${has("Foe Slayer") ? 10 : 6} damage to the marked creature, advantage to track it.`, "hmark");
  if(ed==="2024"&&classFeatureLevel(c,"Ranger")>=10)add("Tireless","Magic action","Gain temporary HP (1d8 + Wisdom modifier, minimum 1). Short rests also reduce exhaustion by one.","rangerTireless");
  if(ed==="2024"&&classFeatureLevel(c,"Ranger")>=14)add("Nature’s Veil","Bonus action","Gain the Invisible condition through the end of your next turn. Track the condition duration manually.","rangerVeil");
  if(ed==="2024"&&classFeatureLevel(c,"Sorcerer")>=1)add("Innate Sorcery","Bonus action","For 1 minute: +1 Sorcerer spell save DC and Advantage on Sorcerer spell attacks. End the toggle when it expires.","innateSorcery");
  if(ed==="2024"&&clsLv(c,"Warlock")>=2)add("Magical Cunning","1 minute","Recover expended Pact Magic slots: "+(clsLv(c,"Warlock")>=20?"all":"up to half the maximum, rounded up")+".","magicalCunning");
  if (has("Font of Magic")) add("Font of Magic", "Bonus action", "Turn a spell slot into sorcery points, or spend 2/3/5/6/7 points for a level 1–5 slot.", "sorc");
  if (has("Metamagic")) add("Metamagic", "When casting", ed==="2024"?"Spend Sorcery Points for selected Metamagic. Revised Twinned Spell costs 1 point for a spell whose higher-slot rules add a target; adjudicate spell eligibility and timing.":"Spend Sorcery Points for selected Metamagic, with legacy Twinned Spell costing the spell level (minimum 1).", "sorc");
  if(ed==="2024"&&classFeatureLevel(c,"Cleric")>=10)add("Divine Intervention","Magic action","Cast an eligible Cleric spell without a slot or Material components. Select the spell and resolve its rules manually.","divineIntervention");
  if(clsLv(c,"Artificer")>=7)add("Flash of Genius","Reaction",`Add ${sgn(ed==="2024"?Math.max(1,m.int):m.int)} to your or a creature’s eligible ability check or saving throw within 30 feet. ${ed==="2024"?"Use after a failed roll.":"Use before success or failure is determined."} Apply the bonus manually.`,"flashGenius");
  if(ed==="2024"&&clsLv(c,"Artificer")>=1)add("Tinker's Magic","Magic action","Create eligible mundane gear using Tinker's Tools; the item vanishes at your next Long Rest.","tinkersMagic");
  if(ed==="2024"&&clsLv(c,"Artificer")>=2)add("Replicate Magic Item","After Long Rest","Create an item from a known eligible plan. At the active limit the oldest replica vanishes. Confirm tool and rest timing.","replicateCreation");
  if(ed==="2024"&&clsLv(c,"Artificer")>=6){
    add("Charge Magic Item","Bonus action","Spend a spell slot to restore that many charges in a nearby replicated item with a tracked charge contract.");
    add("Drain Magic Item","Bonus action","Dismiss a nearby replicated item for an extra level 1 slot (Common) or level 2 slot (Uncommon/Rare).","replicateDrain");
    add("Transmute Magic Item","Magic action","Transform a nearby replicated item into a different known plan.","replicateTransmute");
  }
  if(artificerInfusionLevel(c)>=1){
    add("Magical Tinkering","Action","Choose a Tiny nonmagical object and one persistent property; oldest ends at Intelligence-modifier limit (minimum one). Confirm size, touch and tool.");
    if((c.inv||[]).some(i=>i.artificerTinkering?.owner===c.id))add("End Magical Tinkering","Action","Touch object and end its property.");
  }
  if(artificerInfusionLevel(c)>=3)add("The Right Tool for the Job","1 hour","Create one set of nonmagical Artisan's Tools; the previous created set vanishes. Confirm uninterrupted hour and tools.");
  if(artificerInfusionLevel(c)>=6)add("Tool Expertise","Ability check","Double proficiency bonus on any check that uses a tool proficiency. Confirm proficiency and selected ability.");
  if(artificerInfusionLevel(c)>=2){
    add("Apply Infusion","After Long Rest","Infuse a single mundane item. Confirm that it is nonmagical and that you finished a Long Rest. The oldest infusion ends at the active limit.","infusionCreation");
    if(artificerInfusions(c).length)add("End Infusion","When an infusion expires","Record the end of an infusion under its rules.");
  }
  if(artificerInfusionLevel(c)>=20)add("Soul of Artifice survival","Reaction","At 0 HP without outright death, end an active infusion to drop to 1 HP instead.");
  if(ed==="2024"&&clsLv(c,"Artificer")>=20)add("Cheat Death","At 0 HP","Disintegrate selected Uncommon or Rare replicas to regain 20 HP each. Confirm no outright death.");
  if(artificerDeathItems(c).some(([,origin])=>!origin.deathDays))add("Record Artificer death","At death","Start the expiry of active infusions and replicas when their creator dies.");
  if(artificerDeathItems(c).some(([,origin])=>origin.deathDays>0))add("Advance Artificer item expiry","After an in-game day","Advance the expiry of the Artificer’s affected items by one campaign day.");
  if(battleSmithLevel(c)>=9){add("Arcane Jolt","On qualifying hit","Once per turn: "+(battleSmithLevel(c)>=15?"4d6":"2d6")+" extra Force damage or healing within 30 feet of target.","arcaneJolt","Battle Smith");if(c.arcaneJoltThisTurn)add("Arcane Jolt — next turn","New creature turn","Reset the once-per-turn restriction only after the current creature turn ends.");}
  if(clsLv(c,"Artificer")>=11){
    add("Store spell in item","After Long Rest","Choose a qualifying weapon or spellcasting focus in Features, then store an eligible Artificer spell. Confirm long-rest timing; replacing the stored spell ends the previous effect.","artificerStoreSetup");
    const stored=artificerStoredSpell(c);
    if(stored){
      add("Spell-Storing Item",ed==="2024"?"Magic action":"Action",`${stored.item.n}: ${stored.spell.n}. The holder uses your spellcasting ability and maintains any required Concentration. Resolve targets and spell effects at the table.`,"artificerStored");
      if(ed==="2024"&&c.artificerStored.usedThisTurn)add("Reset Spell-Storing Item turn","Start of previous user’s next turn","Confirm that the creature that last used the item has started its next turn.");
    }
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
  const monkActions=legacyMonkActions(c),monkActionNames=new Set(monkActions.map(a=>a.name));
  (c.feats || []).filter(f=>(f.sub||f.mcsub||f.bookSub)&&(f.bookSub?!!(SUB_ABL[f.f]?.text||ACT[f.f]):!!(SUB_ABL[f.f]||ACT[f.f]))).forEach(f=>{
    if(monkActionNames.has(f.f)||DEDICATED_SUBCLASS_ACTIONS.has(f.f)||f.f==="Arcane Jolt"&&battleSmithLevel(c)>=9)return;
    const o=subclassFeatureOwner(c,f);if(!o.level||+f.l>o.level)return;
    if(isPsionicOwner(o)&&PSIONIC_FEATURES.has(f.f))return;
    const S=SUB_ABL[f.f]||{when:ACT[f.f].kind==="persist"?"Your choice":ACT[f.f].kind==="toggle"?"Activated":"Use"};
    const desc=subFeatDesc(f.f,c,f);if(!desc&&!S.text)return;
    const revised=ed==="2024"&&f.subEdition!=="2014";
    // Legacy Nature’s Sanctuary is passive and never consumes Wild Shape.
    if(f.f==="Nature's Sanctuary"&&!revised)return;
    const special=revised&&f.f==="Intimidating Presence"?"berserkerPresence":revised&&f.f==="Dragon Wings"?"draconicWings":null;
    const when=revised&&["Intimidating Presence","Wholeness of Body","Holy Nimbus"].includes(f.f)?"Bonus action":S.when;
    add(f.f,when,S.text?S.text({...c,level:o.level}):desc,special||(S.res?subAblKey(f.f):S.uses==="channel"?channelKey(c,o.cls):S.uses),o.name);
  });
  if (tr("Large Form") && TLV >= 5) add("Large Form", "Bonus action", "Become Large for 10 minutes: advantage on Strength checks and +10 ft speed.", "large");
  if (tr("Draconic Flight") && TLV >= 5) add("Draconic Flight", "Bonus action", "Spectral wings for 10 minutes: fly at your walking speed.", "dflight");
  if (tr("Adrenaline Rush")) add("Adrenaline Rush", "Bonus action", `Dash, and gain ${prof} temporary hit points.`, "adren");
  const boon=giantBoon(c);if(boon)add("Giant Ancestry",boon.when,boon.name+": "+boon.text,"giant","Goliath");
  if(ed==="2024"&&c.race==="Dwarf"&&tr("Stonecunning"))add("Stonecunning","Bonus action","60 ft Tremorsense while touching stone for 10 minutes. Confirm surface and expiry manually.","stonecunning","Dwarf");
  if(c.heroicInspiration)add("Heroic Inspiration","After a die roll","Reroll one die immediately and use the new result; confirm the reroll at the table.",null,"2024 rules");
  if (tr("Celestial Revelation") && TLV >= 3) add("Celestial Revelation", "Bonus action", `Transform for 1 minute: once per turn add +${prof} radiant or necrotic damage, plus wings, light or fear.`, "crev");
  for(const spec of psionicActions(c))add(spec.name,spec.when,spec.text,spec.res,spec.owner);
  for(const spec of monkActions)add(spec.name,spec.when,spec.text,spec.res,spec.owner);
  for(const spec of subclassRecoverySpecs(c))add(spec.name,"No action",spec.text,null,spec.owner);
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
const PSIONIC_FEATURES=new Set(["Psionic Power","Protective Field","Psionic Strike","Telekinetic Movement","Psi-Powered Leap","Telekinetic Thrust","Telekinetic Adept","Guarded Mind","Bulwark of Force","Telekinetic Master","Psi-Bolstered Knack","Psychic Whispers","Soul Blades","Homing Strikes","Psychic Teleportation","Psychic Veil","Rend Mind"]);
const isPsionicOwner=o=>o&&(o.cls==="Fighter"&&o.name==="Psi Warrior"||o.cls==="Rogue"&&o.name==="Soulknife");
const psiLevel=(c,cls)=>characterSubclassLevel(c,cls,cls==="Fighter"?"Psi Warrior":"Soulknife");
const psiDie=(c,cls)=>{const l=psiLevel(c,cls);return l>=17?12:l>=11?10:l>=5?8:6;};
const psiKey=cls=>cls==="Fighter"?"psiFighter":"psiRogue";
function psionicPools(c){
  const R=[],legacy=edOf(c)==="2014",add=(key,name,max,recharge)=>R.push({key,name,max,recharge});
  for(const cls of ["Fighter","Rogue"]){
    const l=psiLevel(c,cls);if(l<3)continue;
    const key=psiKey(cls),owner=cls==="Fighter"?"Psi Warrior":"Soulknife";
    add(key,owner+" dice (d"+psiDie(c,cls)+")",legacy?2*c.prof:l>=17?12:l>=13?10:l>=9?8:l>=5?6:4,legacy?"long":"short1");
    if(legacy)add(key+"Recover",owner+" die recovery",1,"short");
    if(cls==="Fighter"){
      add("psiMovement","Telekinetic Movement",1,"short");
      if(l>=7)add("psiLeap","Psi-Powered Leap",1,"short");
      if(l>=15)add("psiBulwark","Bulwark of Force",1,"long");
      if(l>=18)add("psiMaster","Telekinetic Master",1,"long");
    }else{
      add("psiWhispers","Psychic Whispers free use",1,"long");
      if(l>=13)add("psiVeil","Psychic Veil",1,"long");
      if(l>=17)add("psiRend","Rend Mind",1,"long");
    }
  }
  // Old shared counter cannot identify which subclass spent dice. Preserve
  // expenditure conservatively in each eligible pool; counters are DM-editable.
  const old="sub:psionic-power";
  if(R.length&&c.used&&Object.hasOwn(c.used,old)){
    for(const r of R.filter(r=>["psiFighter","psiRogue"].includes(r.key)))if(!Object.hasOwn(c.used,r.key))c.used[r.key]=Math.min(r.max,Math.max(0,+c.used[old]||0));
    delete c.used[old];
  }
  for(const [oldKey,newKey] of [["sub:psychic-veil","psiVeil"],["sub:rend-mind","psiRend"]]){
    if(c.used&&R.some(r=>r.key===newKey)&&Object.hasOwn(c.used,oldKey)){if(!Object.hasOwn(c.used,newKey))c.used[newKey]=Math.min(1,Math.max(0,+c.used[oldKey]||0));delete c.used[oldKey];}
  }
  return R;
}
function psionicActions(c){
  const a=[],f=psiLevel(c,"Fighter"),r=psiLevel(c,"Rogue"),legacy=edOf(c)==="2014";
  const add=(name,when,text,res,cls)=>a.push({name,when,text,res,owner:cls==="Fighter"?"Psi Warrior":"Soulknife"});
  const restore=(name,key,cls,cost=1)=>add("Restore "+name,"No action","Expend "+cost+" psionic die/dice to restore the expended use.",null,cls);
  if(f>=3){
    add("Protective Field","Reaction","Reduce damage to yourself or a visible creature within 30 feet by d"+psiDie(c,"Fighter")+" + INT (minimum 1).","psiFighter","Fighter");
    add("Psionic Strike","On a qualifying hit","Once on your turn after weapon damage within 30 feet, add Force damage from a psionic die + INT.","psiFighter","Fighter");
    add("Telekinetic Movement",legacy?"Action":"Magic action","Move a visible loose Large-or-smaller object or willing other creature within 30 feet up to 30 feet; Tiny objects may move to/from your hand.","psiMovement","Fighter");restore("Telekinetic Movement","psiMovement","Fighter");
    if(f>=7){add("Psi-Powered Leap","Bonus action","Fly at twice your Speed until the end of this turn.","psiLeap","Fighter");restore("Psi-Powered Leap","psiLeap","Fighter");}
    if(f>=10)add("Psi Warrior: Guarded Mind","Start of turn","Spend one die to end effects causing Charmed or Frightened on you; confirm conditions at the table.","psiFighter","Fighter");
    if(f>=15){add("Bulwark of Force","Bonus action","Choose up to "+Math.max(1,c.mods.int)+" creatures within 30 feet including yourself; Half Cover for 1 minute or until Incapacitated.","psiBulwark","Fighter");restore("Bulwark of Force","psiBulwark","Fighter");}
    if(f>=18){add("Telekinetic Master",legacy?"Action":"Magic action","Cast Telekinesis using INT without a slot or components. While concentrating on it, one weapon attack as a Bonus Action on your turns.","psiMaster","Fighter");restore("Telekinetic Master","psiMaster","Fighter");}
    if(legacy)add("Psi Warrior: Recover die","Bonus action","Regain one expended Psi Warrior die once per Short or Long Rest.","psiFighterRecover","Fighter");
  }
  if(r>=3){
    add("Psi-Bolstered Knack","On a failed proficient check","Roll a psionic die, then confirm if the modified check succeeds; spend only on success.","psiRogue","Rogue");
    add("Psychic Whispers",legacy?"Action":"Magic action","Choose up to "+c.prof+" visible creatures. Telepathy for rolled hours within 1 mile; first use per Long Rest is free.","psiRogue","Rogue");
    if(r>=9){
      add("Homing Strikes","On a missed Psychic Blade attack","Roll a psionic die; spend only if the modified attack hits.","psiRogue","Rogue");
      add("Psychic Teleportation","Bonus action","Spend a die; teleport to a visible unoccupied space up to 10 feet times the roll.","psiRogue","Rogue");
    }
    if(r>=13){add("Psychic Veil",legacy?"Action":"Magic action","Invisible for up to 1 hour; ends early on damage dealt or forcing a save.","psiVeil","Rogue");restore("Psychic Veil","psiVeil","Rogue");}
    if(r>=17){add("Rend Mind","On Psychic Blade Sneak Attack","WIS save DC "+(8+c.prof+c.mods.dex)+" or Stunned for 1 minute; repeat at the end of each target turn.","psiRend","Rogue");restore("Rend Mind","psiRend","Rogue",3);}
    if(legacy)add("Soulknife: Recover die","Bonus action","Regain one expended Soulknife die once per Short or Long Rest.","psiRogueRecover","Rogue");
  }
  return a;
}
function psiRestore(c,cls,target,cost=1){
  const R=pcResources(c),pool=R.find(r=>r.key===psiKey(cls)),use=R.find(r=>r.key===target);
  if(!pool||!use)return "Unavailable.";
  if(resLeft(c,use)>0)return "Use is already available.";
  if(resLeft(c,pool)<cost)return "Not enough psionic dice.";
  c.used[pool.key]=(+c.used[pool.key]||0)+cost;c.used[target]=0;return "Use restored.";
}
function psiLegacyRecover(c,cls){
  const R=pcResources(c),pool=R.find(r=>r.key===psiKey(cls)),use=R.find(r=>r.key===psiKey(cls)+"Recover");
  if(!pool||!use||resLeft(c,use)<1)return "Recovery unavailable.";
  if(resLeft(c,pool)>=pool.max)return "No expended dice.";
  c.used[pool.key]=Math.max(0,(+c.used[pool.key]||0)-1);c.used[use.key]=1;return "Regained one psionic die.";
}
function psiConditionalChoices(c,name){
  const pending=c.psiPending?.name===name;
  return pending?[["success","Confirmed success — spend die"],["failure","Still failed — keep die"]]:[["roll","Roll bonus"]];
}
function psiConditional(c,name,ch){
  const R=pcResources(c).find(r=>r.key==="psiRogue");
  if(ch==="failure"){delete c.psiPending;return "No die expended.";}
  if(!R||resLeft(c,R)<1)return "No Soulknife dice available.";
  if(ch==="success"){
    if(c.psiPending?.name!==name)return "No pending roll.";
    c.used[R.key]=(+c.used[R.key]||0)+1;delete c.psiPending;return "Confirmed success; one die expended.";
  }
  if(c.psiPending)return "Resolve the pending "+c.psiPending.name+" roll first.";
  const roll=rollDice("1d"+psiDie(c,"Rogue"));c.psiPending={name,roll:roll.total};
  return name+": "+roll.text+". Add to the triggering roll, then confirm success or failure.";
}
function psiWhispers(c){
  const R=pcResources(c),free=R.find(r=>r.key==="psiWhispers"),pool=R.find(r=>r.key==="psiRogue");
  if(!free||!pool)return "Unavailable.";
  if(resLeft(c,free)>0)c.used[free.key]=1;
  else if(resLeft(c,pool)>0)c.used[pool.key]=(+c.used[pool.key]||0)+1;
  else return "No Soulknife dice available.";
  return rollMsg("Psychic Whispers","1d"+psiDie(c,"Rogue"),"Hours of telepathy with up to "+c.prof+" eligible creatures; range 1 mile.");
}
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
  if(edOf(c)!=="2024"||classFeatureLevel(c,"Sorcerer")<5)return 0;
  const R=pcResources(c),p=R.find(x=>x.key==="sorc"),u=R.find(x=>x.key==="sorcerousRestore");
  if(!p||!u||resLeft(c,u)<1)return 0;
  const n=Math.min(p.max-resLeft(c,p),Math.floor(classFeatureLevel(c,"Sorcerer")/2));
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
  if(edOf(c)!=="2024"||classFeatureLevel(c,"Cleric")<10)return [];
  spLoad();
  const eligible=s=>s&&!s.hb&&!s.pend&&!s.ref&&!s.referenceOnly&&!s.rulesSummary&&!s.shadow;
  const names=[...new Set((SP.data["2024"]||[]).filter(s=>eligible(s)&&s.c.includes("Cleric")&&s.l>=1&&s.l<=5&&!/reaction/i.test(s.t)).map(s=>s.n))].filter(n=>{const s=spellOf("2024",n);return eligible(s)&&s.c.includes("Cleric")&&s.l>=1&&s.l<=5&&!/reaction/i.test(s.t);});
  const out=names.map(n=>[n,n]);if(classFeatureLevel(c,"Cleric")>=20&&eligible(spellOf("2024","Wish")))out.push(["Wish","Wish (2d4 Long Rest cooldown)"]);return out;
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
  const level=classFeatureLevel(c,"Sorcerer"),druid=edOf(c)==="2024"&&clsLv(c,"Druid")>=5&&L===1;
  const artificer=edOf(c)==="2024"&&clsLv(c,"Artificer")>=6&&L<=2;
  if(level<2&&!druid&&!artificer)return 0;
  return Math.max(0,Math.min(999,Math.trunc(+c.createdSlots?.[L]||0)));
}
function canCreateSorcererSlot(c,L){
  const lv=classFeatureLevel(c,"Sorcerer");
  return Number.isInteger(L)&&L>=1&&L<=5&&lv>=2&&(edOf(c)!=="2024"||lv>=REVISED_SLOT_MIN_LEVEL[L]);
}
function createTemporarySlot(c,L){
  c.createdSlots={...(c.createdSlots||{}),[L]:temporarySlotCount(c,L)+1};
}
function convertFontOfMagic(c,ch){
  const lv=classFeatureLevel(c,"Sorcerer"),R=pcResources(c),sorc=R.find(r=>r.key==="sorc");
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
  const lv=clsLv(c,"Artificer"),art=lv>=18?6:lv>=14?5:lv>=10?4:3;
  return Math.max(art,edOf(c)==="2024"&&characterSubclassLevel(c,"Rogue","Thief")>=13?4:3);
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
  if(edOf(c)!=="2024"||classFeatureLevel(c,"Barbarian")<9)return [];
  const l=classFeatureLevel(c,"Barbarian"),ids=["Forceful Blow","Hamstring Blow",...(l>=13?["Staggering Blow","Sundering Blow"]:[])],out=ids.map(x=>[x]);
  if(l>=17)ids.forEach((x,i)=>ids.slice(i+1).forEach(y=>out.push([x,y])));
  return out.flatMap(a=>[false,true].map(crit=>[a.join("+")+(crit?":crit":""),a.join(" + ")+(crit?" (critical hit)":"")]));
}
function metamagicOptions(c){
  const ed=edOf(c),mine=choiceOf(c,"Metamagic");
  const rows=[["quickened","Quickened Spell",2],["subtle","Subtle Spell",1],["careful","Careful Spell",1],["distant","Distant Spell",1],["empowered","Empowered Spell",1],["extended","Extended Spell",1],["heightened","Heightened Spell",ed==="2024"?2:3],...(ed==="2024"?[["seeking","Seeking Spell",1],["transmuted","Transmuted Spell",1],["twinned","Twinned Spell (eligible higher-slot target)",1]]:Array.from({length:9},(_,i)=>["twinned:"+(i+1),"Twinned Spell, level "+(i+1),i+1]))];
  if(ed==="2014")rows.push(["twinned:0","Twinned Spell, cantrip",1]);
  const available=rows.filter(([id])=>mine.includes(id.split(":")[0]));
  return available.flatMap(([id,label,cost])=>[[id,label+" ("+cost+" points)"],...(ed==="2024"&&classFeatureLevel(c,"Sorcerer")>=20&&isActive(c,"Innate Sorcery")&&!c.apotheosisUsedThisTurn?[["free:"+id,label+" (Arcane Apotheosis: free)"]]:[])]);
}
function metamagicCost(c,id){
  if(typeof id!=="string")return Infinity;
  if(id.startsWith("free:"))return edOf(c)==="2024"&&classFeatureLevel(c,"Sorcerer")>=20&&isActive(c,"Innate Sorcery")&&!c.apotheosisUsedThisTurn?0:Infinity;
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
  return (c.inv||[]).filter(i=>{
    if(!i.id||!i.n||+i.qty!==1)return false;
    const w=eqWeaponOf(i,edOf(c));if(w&&/Simple|Martial/.test(w.cat||""))return true;
    if(/^(?:Tinker['’]s Tools|Thieves['’] Tools)$/i.test(i.n))return true;
    const ref=inventoryCatalogItem(i,edOf(c));
    if(i.artificerInfusion?.owner===c.id&&edOf(c)==="2014"&&artificerInfusionKnown(c,i.artificerInfusion.name))return true;
    if(i.artificerOrigin?.kind==="replica"&&i.artificerOrigin.owner===c.id&&edOf(c)==="2024"&&/wand|weapon/i.test(ref?.type||i.n))return true;
    return /artisan/i.test(ref?.cat||ref?.type||"")||/\b(?:smith|alchemist|woodcarver|brewer|carpenter|cartographer|cobbler|glassblower|jeweler|leatherworker|mason|painter|potter|weaver|calligrapher|cook)['’]s (?:tools|supplies|utensils)\b/i.test(i.n);
  }).map(i=>[i.id,i.n,"Confirm tool proficiency or valid focus eligibility with the DM."]);
}
function artificerStoredSpell(c){
  const s=c.artificerStored;
  if(!s||s.ed!==edOf(c)||clsLv(c,"Artificer")<11||!Number.isInteger(s.max)||s.max<2||s.max>100)return null;
  const item=(c.inv||[]).find(i=>i.id===s.iid&&+i.qty===1),spell=spellOf(s.ed,s.name);
  return item&&artificerStoreSpellEligible(s.ed,clsLv(c,"Artificer"),spell)?{item,spell,max:s.max}:null;
}
function artificerStore(c,name){
  if(+c.used?.artificerStoreSetup>=1)return "You already stored a spell since the last Long Rest.";
  if(!artificerStoreOptions(c).some(([n])=>n===name))return "Choose an eligible Artificer spell.";
  const iid=choiceOf(c,"Spell-Storing Item Object")[0];
  if(!artificerStoreItemOptions(c).some(([id])=>id===iid))return "Select a qualifying inventory object in Features first.";
  const max=Math.max(2,2*Math.trunc(+c.mods.int||0));
  c.artificerStored={ed:edOf(c),name,iid,max};c.used=c.used||{};c.used.artificerStored=0;c.used.artificerStoreSetup=1;
  return "Stored "+name+" in the selected object with "+max+" uses. Previous storage ends. Confirm the object and Long Rest eligibility.";
}
function channelDivinityAction(owner){
  return {kind:"instant",choices:c=>owner(c)==="Paladin"?[["oath","Oath option"],...(edOf(c)==="2024"?[["sense","Divine Sense"],...(clsLv(c,"Paladin")>=9?[["abjure","Abjure Foes"]]:[])]:[])]:[["turn","Turn Undead"],...(edOf(c)==="2024"?[["spark","Divine Spark"]]:[])],
    use:(c,ch)=>{
      const lv=classFeatureLevel(c,"Cleric"),wis=8+c.prof+c.mods.wis,cha=8+c.prof+c.mods.cha;
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
const LEGACY_REPLICA_TIERS={
 2:["Alchemy Jug","Bag of Holding","Cap of Water Breathing","Goggles of Night","Rope of Climbing","Sending Stones","Wand of Magic Detection","Wand of Secrets"],
 6:["Boots of Elvenkind","Cloak of Elvenkind","Cloak of the Manta Ray","Eyes of Charming","Gloves of Thievery","Lantern of Revealing","Pipes of Haunting","Ring of Water Walking"],
 10:["Boots of Striding and Springing","Boots of the Winterlands","Bracers of Archery","Brooch of Shielding","Cloak of Protection","Eyes of the Eagle","Gauntlets of Ogre Power","Gloves of Missile Snaring","Gloves of Swimming and Climbing","Hat of Disguise","Headband of Intellect","Helm of Telepathy","Medallion of Thoughts","Necklace of Adaptation","Periapt of Wound Closure","Pipes of the Sewers","Quiver of Ehlonna","Ring of Jumping","Ring of Mind Shielding","Slippers of Spider Climbing","Winged Boots"],
 14:["Amulet of Health","Belt of Hill Giant Strength","Boots of Levitation","Boots of Speed","Bracers of Defense","Cloak of the Bat","Dimensional Shackles","Gem of Seeing","Horn of Blasting","Ring of Free Action","Ring of Protection","Ring of the Ram"]
};
const TINKER_GEAR=["Ball Bearings","Basket","Bedroll","Bell","Blanket","Block and Tackle","Glass Bottle","Bucket","Caltrops","Candle","Crowbar","Flask","Grappling Hook","Hunting Trap","Jug","Lamp","Manacles","Net","Oil","Paper","Parchment","Pole","Pouch","Rope","Sack","Shovel","Iron Spikes","String","Tinderbox","Torch","Vial"];
function artificerPlanLimits(ed,lv){
 if(lv<2)return {known:0,active:0};
 const steps=[6,10,14,18].filter(n=>lv>=n).length;
 return {known:4+(ed==="2024"?steps:2*steps),active:2+steps};
}
// Source: Forge of the Artificer (2024), magic item plans and Soul of Artifice.
function artificerGenericPlanEligible(lv,x){
 if(!x||x.cursed===true||x.curse||/\bcurs(?:e|ed|es|ing)\b/i.test(x.d||""))return false;
 const type=String(x.type||x.cat||"").toLowerCase(),rarity=String(x.r||"").toLowerCase();
 if(rarity==="common"&&lv>=2&&!/potion|scroll/.test(type+" "+x.n.toLowerCase()))return true;
 return /wondrous/.test(type)&&((rarity==="uncommon"&&lv>=10)||(rarity==="rare"&&lv>=14));
}
function artificerCanAvoidZero(c){
 return c.hpCur!==""&&c.hpCur!=null&&+c.hpCur===0&&!c.death?.dead&&(+c.death?.f||0)<3;
}
function artificerCheatDeathOptions(c){
 if(edOf(c)!=="2024"||clsLv(c,"Artificer")<20||!artificerCanAvoidZero(c))return [];
 const items=artificerReplicas(c).filter(i=>["uncommon","rare"].includes(String(itFind(i.ref)?.r||"").toLowerCase())).slice(0,6),out=[];
 for(let mask=1;mask<(1<<items.length);mask++){
  const picked=items.filter((_,i)=>mask&(1<<i));
  out.push([JSON.stringify(picked.map(i=>i.id)),picked.map(i=>i.n).join(" + ")+" → "+(20*picked.length)+" HP"]);
 }return out;
}
function artificerCheatDeath(c,key){
 const option=artificerCheatDeathOptions(c).find(x=>x[0]===key);if(!option)return "No eligible replica selection; requires 0 HP without outright death.";
 const ids=JSON.parse(key),items=artificerReplicas(c).filter(i=>ids.includes(i.id));
 if(items.length!==ids.length)return "One or more replicas no longer exist.";
 items.forEach(i=>artificerRemove(c,i));c.hpCur=Math.min(c.hp,20*items.length);pcHealed(c,true);
 return "Cheat Death: disintegrated "+items.map(i=>i.n).join(", ")+"; HP now "+c.hpCur+". Confirm you were not killed outright.";
}
// Tasha's Cauldron of Everything, pp. 20–23. Item charges recover at dawn.
const INFUSION_RESISTANCES=["acid","cold","fire","force","lightning","necrotic","poison","psychic","radiant","thunder"];
const LEGACY_INFUSION_CONTRACTS={
 "Enhanced Defense":{kind:"armor",armor:lv=>lv>=10?2:1},
 "Enhanced Weapon":{kind:"weapon",weapon:lv=>lv>=10?2:1},
 "Enhanced Arcane Focus":{kind:"focus",att:true,focus:lv=>lv>=10?2:1,text:"Ignore half cover on spell attacks while holding the focus."},
 "Returning Weapon":{kind:"thrown",weapon:()=>1,text:"After a ranged attack with this weapon, it returns to the wielder’s hand."},
 "Repeating Shot":{kind:"ammunition",att:true,weapon:()=>1,text:"The bonus applies to ranged attacks. Ignore Loading, and when unloaded the weapon produces a shot that disappears after the attack."},
 "Homunculus Servant":{kind:"heart",text:"The gem or crystal forms the servant’s heart. Confirm its value of at least 100 gp. Use the Homunculus Servant card for its rules and hit points."},
 "Armor of Magical Strength":{kind:"suit",att:true,charges:6,dice:6,actions:["Add Intelligence to a Strength roll","Avoid being knocked prone"],text:"Spend one charge to add the wearer’s Intelligence modifier to their Strength check or saving throw, or spend one charge as a Reaction to avoid being knocked prone. Regain 1d6 charges at dawn."},
 "Mind Sharpener":{kind:"armor-or-robes",charges:4,dice:4,actions:["Succeed on failed Concentration save"],text:"After failing a Constitution save to maintain Concentration, the wearer can spend one charge as a Reaction to succeed instead. Regain 1d4 charges at dawn."},
 "Boots of the Winding Path":{kind:"boots",att:true,text:"As a Bonus Action, teleport up to 15 feet to a visible, unoccupied space you occupied earlier this turn."},
 "Radiant Weapon":{kind:"weapon",att:true,weapon:()=>1,charges:4,dice:4,actions:["Blind the attacker"],text:"While holding the weapon, use a Bonus Action to toggle bright light for 30 feet and dim light for 30 feet beyond. Immediately after being hit, use a Reaction and one charge. The attacker must pass a Constitution save against the creator’s spell save DC or be Blinded through the end of its next turn. Regain 1d4 charges at dawn."},
 "Repulsion Shield":{kind:"shield",att:true,armor:()=>1,charges:4,dice:4,actions:["Push the attacker"],text:"Immediately after a melee attack hits you, use a Reaction and one charge while holding the shield to push the attacker up to 15 feet away. Regain 1d4 charges at dawn."},
 "Resistant Armor":{kind:"suit",att:true,text:"While worn, the suit grants resistance to the damage type chosen when infused."},
 "Spell-Refueling Ring":{kind:"ring",att:true,charges:1,dice:0,actions:["Recover an expended spell slot"],text:"While wearing the ring, take an Action to recover one expended spell slot of level 3 or lower. It can be used again after dawn."},
 "Helm of Awareness":{kind:"helmet",att:true,text:"While worn, gain Advantage on Initiative and immunity to surprise while you aren’t Incapacitated."},
 "Arcane Propulsion Armor":{kind:"suit",att:true,text:"While worn, walking speed increases by 5 feet. Each empty-handed gauntlet is a proficient melee weapon dealing 1d8 Force with thrown range 20/60 feet. It returns and reattaches after throwing. The suit cannot be removed against the wearer’s will and its replacements for missing limbs work like the original limbs."}
};
function artificerInfusionLevel(c){return edOf(c)==="2014"?clsLv(c,"Artificer"):0;}
// The 2014 DMG reference links Quiver of Ehlonna to its SRD equivalent.
const legacyReplicaPlanName=ref=>ref.n==="Efficient Quiver"?"Quiver of Ehlonna":ref.n;
function legacyReplicaEligible(lv,ref){
 if(lv<2||ref?.ed!=="2014"||ref.kind!=="magic"||!ref.d?.trim()||itemRulesIncomplete(ref))return false;
 const name=legacyReplicaPlanName(ref).toLowerCase();
 return ref.r==="Common"&&!/\b(?:potion|scroll)\b/i.test(ref.type||ref.cat)
  ||Object.entries(LEGACY_REPLICA_TIERS).some(([min,names])=>lv>=+min&&names.some(entry=>entry.toLowerCase()===name));
}
function legacyReplicaRef(choice){return typeof choice==="string"&&choice.startsWith("replica:2014-")?itFind(choice.slice(8)):null;}
function artificerLegacyInfusionOptions(c){
 const lv=artificerInfusionLevel(c);
 if(lv<2)return [];
 itLoad();
 const known=Object.entries(ARTIFICER_INFUSIONS).filter(([min])=>lv>=+min).flatMap(([,names])=>names.map(name=>[name,name]));
 if(choiceOf(c,"Infuse Item").includes("Replicate Magic Item (DM-recorded variant)"))known.push(["Replicate Magic Item (DM-recorded variant)","Replicate Magic Item (DM-recorded variant)"]);
 const replicas=IT.data["2014"].filter(ref=>legacyReplicaEligible(lv,ref)).map(ref=>{
   const name=legacyReplicaPlanName(ref),label=name===ref.n?name:name+" ("+ref.n+")";
   return ["replica:"+ref.id,"Replicate Magic Item · "+label,ref.rulesSource||ref.src||"2014 catalog"];
 });
 return known.concat(replicas);
}
function artificerInfusionKnown(c,name){
 const lv=artificerInfusionLevel(c);
 if(lv<2||!choiceOf(c,"Infuse Item").slice(0,artificerPlanLimits("2014",lv).known).includes(name))return false;
 return Object.entries(ARTIFICER_INFUSIONS).some(([l,names])=>lv>=+l&&names.includes(name))||legacyReplicaEligible(lv,legacyReplicaRef(name));
}
function artificerInfusionObject(c,i,name){
 const ref=inventoryCatalogItem(i,"2014");
 if(!i.id||+i.qty!==1||i.artificerOrigin||i.artificerInfusion||(ref&&ref.kind!=="gear")||i.att||i.attuned)return false;
 const baseName=String(ref?.n||i.n).toLowerCase();
 const replica=legacyReplicaRef(name);
 if(replica){
   if(/^Wand\b/i.test(replica.type||replica.cat))return /\bwand\b/.test(baseName);
   if(/^Ring\b/i.test(replica.type||replica.cat))return /\bring\b/.test(baseName);
   if(/^Weapon\b/i.test(replica.type||replica.cat))return !!eqWeaponOf(i,"2014");
   if(/^Armor\b/i.test(replica.type||replica.cat))return !!eqArmorOf(i,"2014");
   return true; // The table confirms the form of a specific Wondrous Item.
 }
 const spec=LEGACY_INFUSION_CONTRACTS[name];if(!spec)return false;
 if(spec.kind==="heart"){
   const gem=/\b(?:gem(?:stone)?|crystal|agate|amethyst|diamond|emerald|garnet|jade|opal|quartz|ruby|sapphire|topaz)\b/.test(baseName);
   const value=Number(ref?.gp??String(i.value||"").match(/^\s*(\d+(?:\.\d+)?)\s*gp\s*$/i)?.[1]);
   return gem&&value>=100;
 }
 if(spec.kind==="boots")return /^(?:pair of |leather )?boots$/.test(baseName);
 if(spec.kind==="helmet")return /^(?:(?:iron|steel|leather) )?(?:helmet|helm)$/.test(baseName);
 if(spec.kind==="ring")return /^(?:(?:signet|gold|silver|platinum|copper) )?ring$/.test(baseName);
 if(spec.kind==="focus")return /\b(rod|staff|wand)\b/.test(baseName);
 const armor=eqArmorOf(i,"2014"),suit=armor&&armor.cat!=="Shield";
 if(spec.kind==="armor")return !!armor;
 if(spec.kind==="armor-or-robes")return !!suit||/^(?:plain )?robes?$/.test(baseName);
 if(spec.kind==="suit")return !!suit;
 if(spec.kind==="shield")return armor?.cat==="Shield";
 if(ref?.kind!=="gear")return false;
 const w=eqWeaponOf(i,"2014"),props=w?.st?.find(x=>x[0]==="Properties")?.[1]||"";
 if(!w||!/^(?:Simple|Martial)\b/.test(w.cat||""))return false;
 if(spec.kind==="thrown")return /Thrown/i.test(props);
 if(spec.kind==="ammunition")return /Ammunition/i.test(props);
 return true;
}
function artificerInfusions(c){return (c.inv||[]).filter(i=>i.artificerInfusion?.owner===c.id&&artificerInfusionKnown(c,i.artificerInfusion.name));}
function artificerInfusionEquipped(c,name){
 return artificerInfusions(c).find(i=>i.artificerInfusion.name===name&&i.eq&&+i.qty===1&&(!LEGACY_INFUSION_CONTRACTS[name].att||i.attuned));
}
function artificerInfusionOptions(c){
 const identity=n=>{const ref=legacyReplicaRef(n);return ref?legacyReplicaPlanName(ref).toLowerCase():n;};
 const active=new Set(artificerInfusions(c).map(i=>identity(i.artificerInfusion.name)));
 return [...new Set(choiceOf(c,"Infuse Item"))].filter(n=>artificerInfusionKnown(c,n)&&!active.has(identity(n))).flatMap(n=>(c.inv||[]).filter(i=>artificerInfusionObject(c,i,n)).flatMap(i=>{
   const label=(legacyReplicaRef(n)?.n||n)+" · "+i.n;
   return n==="Resistant Armor"?INFUSION_RESISTANCES.map(type=>[JSON.stringify([n,i.id,type]),label+" · "+type]):[[JSON.stringify([n,i.id]),label]];
 }));
}
function artificerEndInfusion(c,i){
 if(i?.artificerInfusion?.owner!==c.id)return false;
 const {name,original}=i.artificerInfusion,spec=LEGACY_INFUSION_CONTRACTS[name];
 delete i.artificerInfusion;
 if(name==="Homunculus Servant"&&c.subCompanions)delete c.subCompanions.homunculus;
 if(original){Object.assign(i,original);delete i.itemCharge;i.attuned=false;}
 if(spec?.charges)delete i.itemCharge;
 if(spec?.att&&!inventoryNeedsAttunement(i,inventoryCatalogItem(i,edOf(c))))i.attuned=false;
 return true;
}
function artificerApplyInfusion(c,key){
 if(!artificerInfusionOptions(c).some(x=>x[0]===key))return "Select a known infusion and eligible nonmagical individual item.";
 const [name,id,damageType]=JSON.parse(key),i=c.inv.find(x=>x.id===id),active=artificerInfusions(c),cap=artificerPlanLimits("2014",artificerInfusionLevel(c)).active;
 active.sort((a,b)=>(+a.artificerInfusion.created||0)-(+b.artificerInfusion.created||0));
 while(active.length>=cap)artificerEndInfusion(c,active.shift());
 c.artificerInfusionSeq=(+c.artificerInfusionSeq||0)+1;
 i.artificerInfusion={owner:c.id,name,created:c.artificerInfusionSeq,damageType};
 const replica=legacyReplicaRef(name);
 if(replica){
   i.artificerInfusion.original={ref:i.ref||"",n:i.n,att:!!i.att};
   Object.assign(i,{ref:replica.id,n:replica.n,att:!!replica.att});
   return "Replicated "+replica.n+". Confirm the form of the source object and completed Long Rest.";
 }
 const ref=artificerInfusionChargeItem(c,i);
 if(ref)itemChargeInitialize(i,ref,ref.maxCharges);
 if(name==="Homunculus Servant"){
   c.subCompanions=c.subCompanions||{};
   c.subCompanions.homunculus={form:"heart",hp:companionStats(c,"homunculus","heart").hp};
 }
 return "Infused "+i.n+" with "+name+". Confirm completion of Long Rest and any required attunement.";
}
function artificerInfusionBonus(c,i,kind){
 const n=i?.artificerInfusion?.name,s=LEGACY_INFUSION_CONTRACTS[n];
 if(!s||i.artificerInfusion.owner!==c.id||!artificerInfusionKnown(c,n)||s.att&&!i.attuned)return 0;
 return s[kind]?.(artificerInfusionLevel(c))||0;
}
function artificerInfusionChargeItem(c,i){
 const inf=i.artificerInfusion,spec=LEGACY_INFUSION_CONTRACTS[inf?.name];
 if(!spec?.charges||inf.owner!==c.id||!artificerInfusionKnown(c,inf.name))return null;
 return {id:i.id+":"+inf.created,ed:"2014",src:"TCE",n:inf.name,att:spec.att,
  maxCharges:spec.charges,chargeRecharge:{at:"dawn",dice:spec.dice,add:spec.dice?0:1},
  chargeActions:Object.fromEntries(spec.actions.map(action=>[action,1]))};
}
function artificerLegacyDeathOptions(c){
 return artificerInfusionLevel(c)>=20&&artificerCanAvoidZero(c)?artificerInfusions(c).map(i=>[i.id,i.artificerInfusion.original?i.n:i.n+" · "+i.artificerInfusion.name]):[];
}
function artificerLegacyDeath(c,id){
 if(!artificerLegacyDeathOptions(c).some(x=>x[0]===id))return "Requires 0 HP without outright death and an active infusion.";
 const i=c.inv.find(x=>x.id===id);artificerEndInfusion(c,i);c.hpCur=1;pcHealed(c,true);return "Soul of Artifice: ended infusion on "+i.n+"; restored to 1 HP. Confirm Reaction and no outright death.";
}
function artificerInfusionCleanup(c){
 for(const i of c.inv||[])if(i.artificerInfusion?.owner===c.id&&(!artificerInfusionKnown(c,i.artificerInfusion.name)||+i.qty!==1))artificerEndInfusion(c,i);
 const active=artificerInfusions(c).sort((a,b)=>a.artificerInfusion.created-b.artificerInfusion.created);
 const cap=artificerPlanLimits("2014",artificerInfusionLevel(c)).active;
 for(const i of active.slice(0,Math.max(0,active.length-cap)))artificerEndInfusion(c,i);
}
function artificerFocusAttackBonus(c){return Math.max(0,...(c.inv||[]).filter(i=>i.eq&&+i.qty===1).map(i=>artificerInfusionBonus(c,i,"focus")));}

const ARTIFICER_TINKER_PROPERTIES={
 light:"Bright light 5 ft, dim light 5 additional ft.",
 message:"When tapped, plays recorded speech (max 6 seconds) audible within 10 ft. Record message in item notes.",
 sensory:"Continuous chosen odor or nonverbal sound perceptible within 10 ft. Record choice in item notes.",
 image:"Static picture, lines/shapes and/or up to 25 words on one surface. Record design in item notes."
};
function legacyTinkeringOptions(c){
 if(artificerInfusionLevel(c)<1)return [];
 return (c.inv||[]).filter(i=>i.id&&+i.qty===1&&!i.artificerInfusion&&!i.artificerOrigin&&inventoryCatalogItem(i,"2014")?.kind==="gear")
   .flatMap(i=>Object.entries(ARTIFICER_TINKER_PROPERTIES).map(([k,d])=>[JSON.stringify([i.id,k]),i.n+" · "+k+" (confirm Tiny)",d]));
}
function legacyTinkeringEnd(c,id){const i=(c.inv||[]).find(i=>i.id===id&&i.artificerTinkering?.owner===c.id);if(!i)return "No active property.";delete i.artificerTinkering;return "Magical Tinkering ended on "+i.n+".";}
function legacyTinkeringApply(c,ch){
 if(!legacyTinkeringOptions(c).some(x=>x[0]===ch))return "Choose an eligible Tiny nonmagical object.";
 const [id,kind]=JSON.parse(ch),i=c.inv.find(x=>x.id===id),cap=Math.max(1,c.mods.int),active=c.inv.filter(x=>x!==i&&x.artificerTinkering?.owner===c.id).sort((a,b)=>a.artificerTinkering.seq-b.artificerTinkering.seq);
 while(active.length>=cap)legacyTinkeringEnd(c,active.shift().id);
 c.artificerTinkeringSeq=(+c.artificerTinkeringSeq||0)+1;i.artificerTinkering={owner:c.id,kind,seq:c.artificerTinkeringSeq};
 return "Magical Tinkering on "+i.n+": "+ARTIFICER_TINKER_PROPERTIES[kind]+" Confirm object size, tools and action.";
}
function legacyRightToolOptions(c){
 if(artificerInfusionLevel(c)<3)return [];itLoad();
 return IT.data["2014"].filter(x=>x.kind==="gear"&&/artisan/i.test(x.cat||"")).map(x=>[x.id,x.n]);
}
function legacyRightTool(c,id){
 if(!legacyRightToolOptions(c).some(x=>x[0]===id))return "Choose an eligible Artisan's Tools set.";
 const x=itFind(id);for(const i of [...(c.inv||[])])if(i.artificerOrigin?.owner===c.id&&i.artificerOrigin.kind==="rightTool")artificerRemove(c,i);
 c.inv=c.inv||[];const i=artificerInventoryItem(c,x,"rightTool");i.note="Nonmagical Right Tool for the Job; vanishes when replaced.";c.inv.push(i);
 return "Created "+x.n+"; previous set vanished. Confirm an uninterrupted hour and required tools.";
}

function artificerPlanEligible(lv,x){
 if(lv<2||!x||x.kind!=="magic"||x.ed!=="2024"||!x.id?.startsWith("2024-")||!x.d?.trim()||x.referenceOnly||x.rulesSummary||x.pend||itemRulesIncomplete(x))return false;
 // Generic plans are filtered by catalog rarity/category and obvious curse metadata/text.
 // A DM must confirm remaining eligibility; absence of a curse field is not proof.
 return Object.entries(ARTIFICER_PLAN_TIERS).some(([min,names])=>lv>=+min&&names.includes(x.n))||artificerGenericPlanEligible(lv,x);
}
function artificerPlanOptions(c){
 if(edOf(c)!=="2024"||clsLv(c,"Artificer")<2)return [];
 itLoad();return IT.data["2024"].filter(x=>artificerPlanEligible(clsLv(c,"Artificer"),x)).map(x=>[x.id,x.n+" ("+x.r+")","Catalog source: "+(x.src||"SRD")+(artificerGenericPlanEligible(clsLv(c,"Artificer"),x)?" · Confirm generic plan rarity/type and absence of curse with DM.":"")]);
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
function artificerDeathItems(c){
 return [...artificerInfusions(c).map(i=>[i,i.artificerInfusion]),...artificerReplicas(c).map(i=>[i,i.artificerOrigin])];
}
function artificerRecordDeath(c){
 if(c.subCompanions)delete c.subCompanions.homunculus;
 let started=0;
 for(const [i,origin] of artificerDeathItems(c)){
  if(origin.deathDays>0)continue;
  origin.deathDays=i.artificerInfusion?Math.max(1,c.mods.int):rollDice("1d4").total;
  started++;
 }
 return started;
}
function artificerAdvanceDeathExpiry(c){
 const expired=[];
 for(const [i,origin] of artificerDeathItems(c)){
  if(!(origin.deathDays>0)||--origin.deathDays>0)continue;
  expired.push(i.n);
  if(i.artificerInfusion)artificerEndInfusion(c,i);else artificerRemove(c,i);
 }
 return expired.length?"Expired: "+expired.join(", ")+". Place any container contents in or around its space.":"Advanced the expiry timers by one campaign day.";
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
 if(+i.artificerOrigin.deathDays>0)replacement.artificerOrigin.deathDays=i.artificerOrigin.deathDays;
 const at=c.inv.indexOf(i);artificerRemove(c,i);c.inv.splice(at,0,replacement);
 return "Transmuted "+i.n+" into "+replacement.n+".";
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
// Alternate-cost recovery restores a use; it does not itself activate the feature.
function subclassRecoverySpecs(c){
 if(edOf(c)!=="2024")return [];
 return [
  {name:"Restore Intimidating Presence",owner:"Path of the Berserker",cls:"Barbarian",lv:14,target:"berserkerPresence",pay:"rage",cost:1,text:"Spend one Rage use to recover Intimidating Presence."},
  {name:"Restore Dragon Wings",owner:"Draconic Sorcery",cls:"Sorcerer",lv:14,target:"draconicWings",pay:"sorc",cost:3,text:"Spend three Sorcery Points to recover Dragon Wings."},
  {name:"Restore Holy Nimbus",owner:"Oath of Devotion",cls:"Paladin",lv:20,target:subAblKey("Holy Nimbus"),pay:"slot5",cost:1,text:"Spend one level 5 spell slot to recover Holy Nimbus."},
  {name:"Restore Hurl Through Hell",owner:"Fiend Patron",cls:"Warlock",lv:14,target:subAblKey("Hurl Through Hell"),pay:"pact",cost:1,text:"Spend one Pact Magic spell slot to recover Hurl Through Hell."},
  {name:"Restore Beguiling Magic",owner:"College of Glamour",cls:"Bard",lv:3,target:subAblKey("Beguiling Magic"),pay:"bardic",cost:1,text:"Spend one Bardic Inspiration use to recover Beguiling Magic."},
  {name:"Restore Mantle of Majesty",owner:"College of Glamour",cls:"Bard",lv:6,target:subAblKey("Mantle of Majesty"),pay:"slot3+",cost:1,text:"Spend one available level 3 or higher spell slot to recover Mantle of Majesty."}
 ].filter(s=>characterSubclassLevel(c,s.cls,s.owner)>=s.lv);
}
function subclassRecoverySlots(c,name){
 const spec=subclassRecoverySpecs(c).find(s=>s.name===name&&s.pay==="slot3+");
 if(!spec)return [];
 return pcResources(c).filter(r=>resLeft(c,r)>0&&(/^slot[3-9]$/.test(r.key)||r.key==="pact"&&+(r.name.match(/level (\d)/)||[])[1]>=3)).map(r=>[r.key,r.name]);
}
function restoreSubclassUse(c,name,choice){
 const spec=subclassRecoverySpecs(c).find(s=>s.name===name);
 if(!spec)return "Feature not available.";
 const R=pcResources(c),target=R.find(x=>x.key===spec.target),pay=R.find(x=>x.key===(spec.pay==="slot3+"?subclassRecoverySlots(c,name).find(([id])=>id===choice)?.[0]:spec.pay));
 if(!target||resLeft(c,target)>=target.max)return "The feature is already available.";
 if(!pay||resLeft(c,pay)<spec.cost)return "Not enough resources to restore this feature.";
 c.used=c.used||{};c.used[pay.key]=(+c.used[pay.key]||0)+spec.cost;
 c.used[target.key]=Math.max(0,(+c.used[target.key]||0)-1);
 return spec.name.replace("Restore ","")+" recovered.";
}
function quiveringPalmOptions(c){
 const pending=c.quiveringPalm?.edition===edOf(c)&&clsLv(c,"Monk")>=17;
 return [["set","Set vibrations on a confirmed Unarmed Strike hit"],...(pending?[["release","End vibrations offensively (same plane)"],["dismiss","End harmlessly"]]:[])];
}
function quiveringPalmUse(c,ch){
 if(ch==="set"){c.quiveringPalm={edition:edOf(c),days:clsLv(c,"Monk")};return "Vibrations set on one target for up to "+c.quiveringPalm.days+" days. Record the target and expiry with the DM; any previous target is replaced.";}
 if(!c.quiveringPalm||c.quiveringPalm.edition!==edOf(c))return "No vibrations are recorded.";
 delete c.quiveringPalm;
 if(ch==="dismiss")return "Vibrations ended harmlessly.";
 const dc=8+c.prof+c.mods.wis;
 if(edOf(c)==="2024")return roll("Quivering Palm","10d12","damage","Force damage (CON save DC "+dc+" for half). Confirm the marked target and same plane.",true);
 const rr=rollDice("10d10");return "Quivering Palm: CON save DC "+dc+". Failure reduces the marked target to 0 HP; success takes "+rr.total+" Necrotic damage ("+rr.text+"). Apply the appropriate result manually.";
}
// Warcraft Shaman (Barbarian variant): the source replaces Primal Knowledge with these totems.
const TOTEM_EFFECTS={
 "Earthbind Totem":"Enemies within 30 ft lose 10 ft Speed until your next turn ends.",
 "Primal Knowledge Totem":"Allies within 30 ft can use Strength for Acrobatics, Intimidation, Perception, Stealth or Survival until your next turn ends.",
 "Tremor Totem":"Allies within 30 ft have Charmed/Frightened immunity until your next turn ends; existing instances suppressed until their next turn ends.",
 "Wind Rush Totem":"Allies within 30 ft gain 10 ft Speed until your next turn ends."
};
function shamanTotemOptions(c){
 if(edOf(c)!=="2024"||clsLv(c,"Shaman")<3)return [];
 return Object.entries(TOTEM_EFFECTS).filter(([n])=>n!=="Primal Knowledge Totem"||monkCanPay(c,"totemPrimal",1)).map(([n,d])=>[n,n,d]);
}
function shamanTotemCreate(c,ch){
 if(!shamanTotemOptions(c).some(x=>x[0]===ch))return "Choose an available totem.";
 if(ch==="Primal Knowledge Totem"&&!monkPay(c,"totemPrimal",1))return "Restore the use first.";
 c.shamanTotem={name:ch,hp:1,ac:10};return ch+" placed. "+TOTEM_EFFECTS[ch]+" Resolve each pulse, placement and expiry with the DM.";
}
function shamanTotemRestore(c){
 if(edOf(c)!=="2024"||clsLv(c,"Shaman")<3||!(+c.used?.totemPrimal))return "No expended totem use.";
 if(!monkPay(c,"rage",1))return "No Rage use available.";
 c.used.totemPrimal=0;return "Primal Knowledge Totem use restored.";
}

function battleSmithLevel(c){return Math.max(companionLevel(c,"steel"),companionLevel(c,"steel24"));}
function arcaneJoltChoices(c){return battleSmithLevel(c)>=9&&!c.arcaneJoltThisTurn?[["damage","Extra Force damage (confirm hit)"],["heal","Heal creature/object within 30 ft of hit target"]]:[];}
function arcaneJoltUse(c,ch){
 if(!arcaneJoltChoices(c).some(x=>x[0]===ch)||!monkPay(c,"arcaneJolt",1))return "No eligible Arcane Jolt use.";
 c.arcaneJoltThisTurn=true;
 return roll("Arcane Jolt",(battleSmithLevel(c)>=15?4:2)+"d6",ch==="heal"?"heal":"damage",ch==="heal"?"Confirm qualifying hit and recipient within 30 feet.":"Extra Force damage on confirmed magic weapon or defender hit.");
}
const ACT = {
 "Arcane Shot":{kind:"instant",choices:revisedShotChoices,use:revisedShotUse},
 "Begin Arcane Archer turn":{kind:"instant",choices:[["next","Confirm a new creature turn"]],use:c=>{delete c.arcaneShotUsedThisTurn;return "Arcane Shot turn limit reset.";}},
 "Curving Shot":{kind:"instant",choices:archerAttackChoices,use:(c,id)=>archerReroll(c,id,"Curving Shot")},
 "Magical Ammunition":{kind:"instant",choices:c=>arcaneArcherWeapons(c).flatMap(({item})=>Object.keys(REVISED_MAGICAL_AMMO).map(name=>[JSON.stringify([name,item.id]),`${name} · ${item.n}`])),use:(c,key)=>{
   const [name]=JSON.parse(key);return REVISED_MAGICAL_AMMO[name]+" Confirm the selected weapon, ammunition, and surface at the table.";
 }},
 "Restore Magical Ammunition":{kind:"instant",use:c=>{c.used.magicalAmmunition=0;return "Recovered Magical Ammunition.";}},
 "Masterful Shots":{kind:"instant",choices:c=>[["move","Resolve movement only"],...arcaneArcherWeapons(c,false).map(({item})=>[item.id,item.n])],use:(c,id)=>id==="move"?"Move up to half your Speed away from the attacker without provoking Opportunity Attacks.":archerReroll(c,id,"Masterful Shots",false)},
 "Drake’s Breath":{kind:"instant",noCost:true,choices:drakeBreathChoices,use:drakeBreathUse},
 "Reflexive Resistance":{kind:"instant",choices:[["ranger","Confirm Ranger took damage within 30 feet of the drake"],["drake","Confirm drake took damage within 30 feet of the Ranger"]],use:(c,target)=>`Apply resistance to this instance of damage to the ${target}.`},
 "Enhanced Bond":{kind:"instant",use:()=>rollMsg("Enhanced Bond","1d8","Add the result to one fire damage or healing roll of the qualifying spell.")},
 "Cauterizing Flames":{kind:"instant",choices:[["heal","Heal the entering creature"],["damage","Deal fire damage to the entering creature"]],use:(c,kind)=>roll("Cauterizing Flames","2d10"+sgn(c.mods.wis),kind,"Confirm the qualifying flame, visible creature entering its space, and Reaction. Extinguish that flame.")},
 "Blazing Revival":{kind:"instant",choices:[["confirmed","Confirm spirit within 120 feet and eligible drop to 0 HP"]],use:c=>{
   companionSetHP(c,"wildfire",0);
   return `Blazing Revival: ${healSelf(c,Math.floor(c.hp/2))} HP regained. The spirit has vanished.`;
 }},
 "Arcane Jolt":{kind:"instant",noCost:true,choices:arcaneJoltChoices,use:arcaneJoltUse},
 "Arcane Jolt — next turn":{kind:"instant",use:c=>{delete c.arcaneJoltThisTurn;return "Arcane Jolt turn limit reset; confirm a different creature turn.";}},
 "Totems":{kind:"instant",choices:shamanTotemOptions,use:shamanTotemCreate},
 "Restore Primal Knowledge Totem":{kind:"instant",use:shamanTotemRestore},
 "End Totem":{kind:"instant",use:c=>{delete c.shamanTotem;return "Totem ended.";}},
 "Magical Tinkering":{kind:"instant",choices:legacyTinkeringOptions,use:legacyTinkeringApply},
 "End Magical Tinkering":{kind:"instant",choices:c=>(c.inv||[]).filter(i=>i.artificerTinkering?.owner===c.id).map(i=>[i.id,i.n+" · "+i.artificerTinkering.kind]),use:legacyTinkeringEnd},
 "The Right Tool for the Job":{kind:"instant",choices:legacyRightToolOptions,use:legacyRightTool},

 "Apply Infusion":{kind:"instant",choices:artificerInfusionOptions,use:artificerApplyInfusion},
 "Death Coil":{kind:"instant",choices:deathCoilChoices,cost:(c,choice)=>+choice.split(":")[1],use:deathCoilUse},
 "End Infusion":{kind:"instant",choices:c=>artificerInfusions(c).map(i=>[i.id,i.artificerInfusion.original?i.n:i.n+" · "+i.artificerInfusion.name]),use:(c,id)=>artificerEndInfusion(c,c.inv.find(i=>i.id===id))?"Infusion ended.":"No active infusion."},
 "Soul of Artifice survival":{kind:"instant",choices:artificerLegacyDeathOptions,use:artificerLegacyDeath},
 "Cheat Death":{kind:"instant",choices:artificerCheatDeathOptions,use:artificerCheatDeath},

 "Breath of the Dragon":{kind:"instant",noCost:true,choices:dragonBreathChoices,use:dragonBreathUse},
 "Wings Unfurled":{kind:"instant",use:()=> "Fly at walking speed until end of your turn; confirm Step of the Wind and resolve movement."},
 "Aspect of the Wyrm":{kind:"toggle",noCost:true,choices:dragonAuraChoices,start:dragonAuraStart,fx:(c,ch)=>ch==="fear"?{notes:["Frightful Presence: 10-ft aura; resolve Wisdom save and fear manually."]}:{res:[ch],notes:["Allies within 10 ft also resist "+ch+"; 1 minute."]}},
 "Frightful Presence (Wyrm)":{kind:"instant",use:c=>c.active?.["Aspect of the Wyrm"]==="fear"?"Choose a creature within aura: WIS save DC "+(8+c.prof+c.mods.wis)+" or Frightened for 1 minute; repeat at end of target turns.":"Fear aura must be active."},
 "Explosive Fury (Wyrm)":{kind:"instant",choices:c=>c.dragonFuryPending&&c.active?.["Aspect of the Wyrm"]?dragonElements.map(x=>[x,x]):[],use:(c,ch)=>{if(!c.dragonFuryPending||!c.active?.["Aspect of the Wyrm"]||!dragonElements.includes(ch))return "Available only once on aura activation.";delete c.dragonFuryPending;return roll("Explosive Fury","3d10","damage",ch+"; DEX save DC "+(8+c.prof+c.mods.wis)+" for no damage; only on activation.");}},
 "Radiant Sun Bolt":{kind:"instant",choices:[["one","One Attack-action bolt"],["two","Two bonus-action bolts · 1 ki"]],use:(c,ch)=>{if(ch==="two"&&!monkPay(c,"ki",1))return "Insufficient ki.";const r=rollDice("1d20"+sgn(c.mods.dex+c.prof));const d=rollDice("1d"+maDie(c)+sgn(c.mods.dex));return "Radiant Sun Bolt: "+r.text+" attack; "+d.text+" radiant on hit."+(ch==="two"?" Second bolt: "+rollDice("1d20"+sgn(c.mods.dex+c.prof)).text+" attack; "+rollDice("1d"+maDie(c)+sgn(c.mods.dex)).text+" radiant on hit.":"");}},
 "Searing Arc Strike":{kind:"instant",choices:c=>Array.from({length:Math.max(0,Math.min(Math.floor(sunMonk(c)/2),resLeft(c,monkResource(c,"ki")||{key:"ki",max:0}))-1)},(_,i)=>[String(i+2),(i+2)+" ki · level "+(i+1)]),cost:(c,ch)=>+ch,use:(c,ch)=>roll("Searing Arc Strike",(+ch+1)+"d6","damage","Fire in 15-ft cone; DEX save DC "+(8+c.prof+c.mods.wis)+" for half. Confirm Attack action.",true)},
 "Searing Sunburst":{kind:"instant",choices:c=>Array.from({length:1+Math.min(3,resLeft(c,monkResource(c,"ki")||{key:"ki",max:0}))},(_,i)=>[String(i),i+" ki · "+(2+2*i)+"d6"]),use:(c,ch)=>{if(+ch&&!monkPay(c,"ki",+ch))return "Insufficient ki.";return roll("Searing Sunburst",(2+2*(+ch))+"d6","damage","Radiant; 20-ft sphere within 150 ft; CON save DC "+(8+c.prof+c.mods.wis)+" for no damage; opaque total cover exempt.");}},
 "Sun Shield":{kind:"toggle",fx:()=>({notes:["Bright light 30 feet; dim light 30 additional feet."]})},
 "Sun Shield retaliation":{kind:"instant",use:c=>c.active?.["Sun Shield"]?roll("Sun Shield",String(5+c.mods.wis),"damage","Radiant; confirm melee hit."): "Sun Shield must be active."},

 "Touch of Death":{kind:"instant",use:c=>{const n=Math.max(1,clsLv(c,"Monk")+c.mods.wis);giveTemp(c,n);return "Touch of Death: "+n+" temporary HP offered. Confirm you reduced a creature within 5 feet to 0 HP."}},
 "Hour of Reaping":{kind:"instant",use:c=>"Every creature within 30 feet that sees you makes a Wisdom save (DC "+(8+c.prof+c.mods.wis)+") or becomes Frightened of you until the end of your next turn."},
 "Mastery of Death":{kind:"instant",noCost:true,use:c=>{
  if(+c.hpCur!==0||c.hpCur==="")return "Use only when reduced to 0 HP.";
  const r=pcResources(c).find(x=>x.key==="ki");if(!r||resLeft(c,r)<1)return "Not enough ki or Focus Points.";
  c.used=c.used||{};c.used.ki=(+c.used.ki||0)+1;c.hpCur=1;pcHealed(c,true);return "Mastery of Death: spend 1 point and remain at 1 HP.";
 }},
 "Touch of the Long Death":{kind:"instant",choices:c=>{const r=pcResources(c).find(x=>x.key==="ki");return Array.from({length:Math.min(10,r?resLeft(c,r):0)},(_,i)=>[String(i+1),i+1+" points · "+(2*(i+1))+"d10"]);},cost:(c,ch)=>+ch,use:(c,ch)=>roll("Touch of the Long Death",2*(+ch)+"d10","damage","Necrotic damage; CON save DC "+(8+c.prof+c.mods.wis)+" for half. Confirm target within 5 feet.",true)},
 "Mighty Impel":{kind:"instant",use:c=>{if(!c.active?.Rage)return "Rage must be active.";return "Move one "+(clsLv(c,"Barbarian")>=14?"Large":"Medium")+" or smaller creature within reach to a visible unoccupied space within 30 feet. Unwilling: STR save DC "+(8+c.prof+c.mods.str)+". Resolve movement, falling and prone manually.";}},

 "Restore Intimidating Presence":{kind:"instant",use:c=>restoreSubclassUse(c,"Restore Intimidating Presence")},
 "Restore Dragon Wings":{kind:"instant",use:c=>restoreSubclassUse(c,"Restore Dragon Wings")},
 "Restore Holy Nimbus":{kind:"instant",use:c=>restoreSubclassUse(c,"Restore Holy Nimbus")},
 "Restore Hurl Through Hell":{kind:"instant",use:c=>restoreSubclassUse(c,"Restore Hurl Through Hell")},
 "Restore Beguiling Magic":{kind:"instant",use:c=>restoreSubclassUse(c,"Restore Beguiling Magic")},
 "Restore Mantle of Majesty":{kind:"instant",choices:c=>subclassRecoverySlots(c,"Restore Mantle of Majesty"),use:(c,ch)=>restoreSubclassUse(c,"Restore Mantle of Majesty",ch)},
 "Intimidating Presence":{kind:"instant",use:c=>edOf(c)==="2024"?"Chosen creatures within a 30-foot Emanation: WIS save DC "+(8+c.prof+c.mods.str)+" or Frightened for 1 minute, repeat at end of each turn.":"One creature within 30 feet that can see or hear you: WIS save DC "+(8+c.prof+c.mods.cha)+". Frightened until the end of your next turn; extend with an action. Confirm target eligibility."},
 "Nature's Sanctuary":{kind:"toggle",fx:c=>({notes:["15-foot Cube within 120 ft for 1 minute; you and allies inside have Half Cover. Allies also gain "+({Arid:"fire",Polar:"cold",Temperate:"lightning",Tropical:"poison"}[choiceOf(c,"Circle of the Land Spells")[0]]||"your selected land")+" resistance. Move up to 60 ft as a Bonus Action; adjudicate positions manually."]})},

 "Tinker's Magic":{kind:"instant",choices:artificerTinkerOptions,use:artificerCreateTinker},
 "Replicate Magic Item":{kind:"instant",choices:artificerCreateOptions,use:artificerCreateReplica},
 "Drain Magic Item":{kind:"instant",choices:artificerDrainOptions,use:artificerDrain},
 "Transmute Magic Item":{kind:"instant",choices:artificerTransmuteOptions,use:artificerTransmute},
 "Charge Magic Item":{kind:"instant",choices:artificerChargeOptions,use:artificerCharge},
  "Store spell in item":{kind:"instant",noCost:true,choices:artificerStoreOptions,use:artificerStore},
  "Spell-Storing Item":{kind:"instant",choices:c=>edOf(c)==="2024"&&c.artificerStored?.usedThisTurn?[]:[["use","Confirm eligible holder and timing"]],use:c=>{
    const x=artificerStoredSpell(c);if(!x)return "No eligible stored spell.";
    if(edOf(c)==="2024")c.artificerStored.usedThisTurn=true;
    return x.item.n+" produces "+x.spell.n+" at its base level (Artificer Intelligence; DC "+(8+c.prof+c.mods.int)+", spell attack "+sgn(c.prof+c.mods.int)+"). The holder maintains Concentration if required. Resolve the effects manually.";
  }},
  "Reset Spell-Storing Item turn":{kind:"instant",choices:[["next","Confirm the previous user’s next turn"]],use:c=>{delete c.artificerStored.usedThisTurn;return "Spell-Storing Item can be used again if charges remain.";}},
  "Record Artificer death":{kind:"instant",choices:[["dead","Confirm the Artificer died"]],use:c=>"Started expiry for "+artificerRecordDeath(c)+" Artificer item(s)."},
  "Advance Artificer item expiry":{kind:"instant",choices:[["day","Confirm one campaign day elapsed"]],use:artificerAdvanceDeathExpiry},
  "Cunning Strike":{kind:"instant",choices:cunningStrikeOptions,use:(c,ch)=>{if(!ch)return "Choose an eligible effect.";const critical=ch.endsWith(":crit"),ids=ch.replace(/:crit$/,"").split("+"),p=cunningStrikePlan(clsLv(c,"Rogue"),ids,hasPoisonersKit(c),critical);if(!p)return "Invalid Cunning Strike.";const n=p.dice?rollDice(p.dice+"d6").total:0;return "Cunning Strike: "+n+" extra damage (weapon damage type), "+p.cost+" dice forgone; save DC "+(8+c.mods.dex+c.prof)+". "+p.effects.join(" ");}},
  "Brutal Strike":{kind:"instant",choices:brutalStrikeOptions,use:(c,ch)=>{if(!isActive(c,"Reckless Attack")||!brutalStrikeOptions(c).some(([id])=>id===ch))return "Requires an eligible Reckless Attack; forgo Advantage before rolling.";const critical=ch.endsWith(":crit"),n=(classFeatureLevel(c,"Barbarian")>=17?2:1)*(critical?2:1);return rollMsg("Brutal Strike",n+"d10",ch.replace(/:crit$/,"").replaceAll("+"," and ")+"; resolve target and movement effects manually.");}},
  "Arcane Apotheosis":{kind:"none"},
  "Flash of Genius":{kind:"instant",use:c=>"Flash of Genius: "+sgn(edOf(c)==="2024"?Math.max(1,c.mods.int):c.mods.int)+" to the eligible check or save. Apply manually."},
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
  "Beguiling Magic": {kind:"instant",choices:[["charm","Charmed"],["fear","Frightened"]],use:(c,ch)=>`Confirm you just cast an Enchantment or Illusion spell with a slot. One visible creature within 60 ft makes a WIS save (DC ${8+c.prof+c.mods.cha}); on failure it is ${ch==="fear"?"Frightened":"Charmed"} for 1 minute. Repeat the save at the end of each of its turns. Apply manually.`},
  "Mantle of Inspiration": { kind: "instant", use: c => { const r = rollDice(`1d${clsLv(c,"Bard") >= 15 ? 12 : clsLv(c,"Bard") >= 10 ? 10 : clsLv(c,"Bard") >= 5 ? 8 : 6}`); return { title: "Mantle of Inspiration", msg: `Mantle of Inspiration: ${r.text}. Allies within 60 ft gain ${2 * r.total} temporary hit points and can move without provoking opportunity attacks.`, amount: 2 * r.total, kind: "temp" }; } },
  "Mantle of Majesty": {kind:"instant",noCost:true,dialog:c=>castDialog(c,edOf(c),"Command",{prefer:majestyActive(c)?"majestyRepeat":"majestyStart",featureOnly:"majesty"})},
  "Unbreakable Majesty": { kind: "toggle", fx: () => ({ notes: ["Unbreakable Majesty: a creature that attacks you must make a CHA save or pick a new target"] }) },
  // ---------- Cleric
  "Channel Divinity": channelDivinityAction(c=>classFeatureLevel(c,"Cleric")>=2?"Cleric":"Paladin"),
  "Channel Divinity (Cleric)":channelDivinityAction(()=>"Cleric"),
  "Channel Divinity (Paladin)":channelDivinityAction(()=>"Paladin"),
  "Warding Flare": { kind: "instant", use: () => "Warding Flare: impose disadvantage on that attack roll." },
  "Wrath of the Storm": { kind: "instant", use: c => roll("Wrath of the Storm", "2d8", "damage", `Lightning or thunder damage to the attacker (DEX save DC ${8 + c.prof + c.mods.wis} for half)`, true) },
  "War Priest": { kind: "instant", use: () => "War Priest: make one weapon attack as a bonus action." },
  "Channel Divinity: Preserve Life": { kind: "instant", use: c => ({ title: "Preserve Life", msg: `Preserve Life: restore up to ${5 * clsLv(c,"Cleric")} hit points among creatures within 30 ft (none above half their maximum). Apply it to one creature here, or use the target's own sheet to split it.`, amount: 5 * clsLv(c,"Cleric"), kind: "heal", halfHpCap:true }) },
  "Preserve Life": { kind: "instant", use: c => ({ title: "Preserve Life", msg: `Preserve Life: restore up to ${5 * clsLv(c,"Cleric")} hit points among creatures within 30 ft (none above half their maximum). Apply it to one creature here, or use the target's own sheet to split it.`, amount: 5 * clsLv(c,"Cleric"), kind: "heal", halfHpCap:true }) },
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
  "Combat Superiority": { kind: "instant", choices: c => {
    const selected=new Set(choiceOf(c,"Combat Superiority"));
    return MANEUVERS.filter(m=>selected.has(m[0])&&(!m[3]||m[3]===edOf(c))).map(m=>[m[0],m[1]]);
  },
    use: (c,ch) => {
      const m=MANEUVERS.find(m=>m[0]===ch&&(!m[3]||m[3]===edOf(c)));
      if(!m)return "That maneuver is unavailable.";
      const lv=characterSubclassLevel(c,"Fighter","Battle Master"),revised=edOf(c)==="2024",d=lv>=18?12:lv>=10?10:8;
      const dc=8+c.prof+Math.max(c.mods.str,c.mods.dex),lab=m[1],expr="1d"+d;
      if(ch==="rally"){
        const r=roll(lab,expr+sgn(revised?Math.floor(lv/2):c.mods.cha),"temp","Choose an eligible target; temporary hit points do not stack.");
        r.amount=Math.max(0,r.amount);return r;
      }
      if(ch==="parry")return rollMsg(lab,expr+sgn(revised?Math.max(c.mods.str,c.mods.dex):c.mods.dex),"Reduce the triggering damage by this amount (minimum 0); confirm the reaction and qualifying attack.");
      if(["ambush","presence","tactical","bait","evasive","precision","grapple"].includes(ch))return rollMsg(lab,expr,m[2]+" Confirm the applicable roll or AC bonus manually.");
      if(["commander","riposte","feint","lunge","sweep"].includes(ch))return rollMsg(lab,expr,m[2]+" Confirm any required attack or hit before applying damage.");
      const saves={disarm:"STR",push:"STR",trip:"STR",menace:"WIS",goad:"WIS"};
      return roll(lab,expr,"damage",m[2]+(saves[ch]?" Save: "+saves[ch]+" DC "+dc+".":"")+" Confirm the triggering hit and apply the other effects manually.");
    } },
  "Protective Field":{kind:"instant",use:c=>{const r=rollDice("1d"+psiDie(c,"Fighter")+sgn(c.mods.int));return "Protective Field: "+r.text+". Reduce damage by "+Math.max(1,r.total)+"; confirm reaction and target.";}},
  "Psionic Strike":{kind:"instant",use:c=>{const r=roll("Psionic Strike","1d"+psiDie(c,"Fighter")+sgn(c.mods.int),"damage","Force damage after a qualifying hit."+(psiLevel(c,"Fighter")>=7?" Optional Telekinetic Thrust: STR save DC "+(8+c.prof+c.mods.int)+" or Prone/push 10 feet.":""));r.amount=Math.max(0,r.amount);return r;}},
  "Telekinetic Movement":{kind:"instant",use:()=> "Confirm eligible target and destination within the movement limits."},
  "Psi-Powered Leap":{kind:"instant",use:()=> "Fly at twice your Speed until the end of this turn; resolve movement manually."},
  "Psi Warrior: Guarded Mind":{kind:"instant",use:()=> "End all effects giving you Charmed or Frightened; confirm and remove conditions at the table."},
  "Bulwark of Force":{kind:"instant",use:c=> "Choose up to "+Math.max(1,c.mods.int)+" eligible creatures; Half Cover for 1 minute or until Incapacitated."},
  "Telekinetic Master":{kind:"instant",dialog:c=>castDialog(c,edOf(c),"Telekinesis")},
  "Restore Telekinetic Movement":{kind:"instant",use:c=>psiRestore(c,"Fighter","psiMovement")},
  "Restore Psi-Powered Leap":{kind:"instant",use:c=>psiRestore(c,"Fighter","psiLeap")},
  "Restore Bulwark of Force":{kind:"instant",use:c=>psiRestore(c,"Fighter","psiBulwark")},
  "Restore Telekinetic Master":{kind:"instant",use:c=>psiRestore(c,"Fighter","psiMaster")},
  "Psi Warrior: Recover die":{kind:"instant",noCost:true,use:c=>psiLegacyRecover(c,"Fighter")},
  "Soulknife: Recover die":{kind:"instant",noCost:true,use:c=>psiLegacyRecover(c,"Rogue")},
  "Psi-Bolstered Knack":{kind:"instant",noCost:true,choices:c=>psiConditionalChoices(c,"Psi-Bolstered Knack"),use:(c,ch)=>psiConditional(c,"Psi-Bolstered Knack",ch)},
  "Psychic Whispers":{kind:"instant",noCost:true,use:psiWhispers},
  "Homing Strikes":{kind:"instant",noCost:true,choices:c=>psiConditionalChoices(c,"Homing Strikes"),use:(c,ch)=>psiConditional(c,"Homing Strikes",ch)},
  "Psychic Teleportation":{kind:"instant",use:c=>{const r=rollDice("1d"+psiDie(c,"Rogue"));return "Psychic Teleportation: "+r.text+". Teleport up to "+(10*r.total)+" feet."}},
  "Restore Psychic Veil":{kind:"instant",use:c=>psiRestore(c,"Rogue","psiVeil")},
  "Restore Rend Mind":{kind:"instant",use:c=>psiRestore(c,"Rogue","psiRend",3)},
  // ---------- Monk
  Ki: { kind: "instant", choices: [["flurry", "Flurry of Blows"], ["patient", "Patient Defense"], ["step", "Step of the Wind"]], use: (c, ch) => ch === "flurry" ? "Flurry of Blows: two unarmed strikes as a bonus action." : ch === "patient" ? "Patient Defense: Dodge as a bonus action." : "Step of the Wind: Dash or Disengage as a bonus action; jump distance doubled." },
  "Monk's Focus":{kind:"instant",choices:[["flurry","Flurry of Blows (1)"],["patient","Patient Defense (1)"],["step","Step of the Wind (1)"],["freeDash","Dash (free)"],["freeDisengage","Disengage (free)"]],cost:(c,ch)=>ch.startsWith("free")?0:1,use:(c,ch)=>{if(ch==="freeDash")return "Dash as a Bonus Action.";if(ch==="freeDisengage")return "Disengage as a Bonus Action.";if(ch==="flurry")return "Flurry of Blows: "+(clsLv(c,"Monk")>=10?3:2)+" Unarmed Strikes.";if(ch==="patient"){const n=clsLv(c,"Monk")>=10?rollDice("2d"+maDie(c)).total:0;if(n)giveTemp(c,n);return "Disengage and Dodge as a Bonus Action."+(n?" Rolled "+n+" temporary HP.":"");}return "Dash and Disengage; double jump distance.";}},
  "Stunning Strike": {kind:"instant",use:c=>edOf(c)==="2024"?`CON save DC ${8+c.prof+c.mods.wis}: on failure Stunned until your next turn starts; on success halved Speed and Advantage on next incoming attack until then.`:`CON save DC ${8+c.prof+c.mods.wis} or Stunned until the end of your next turn.`},
  "Wholeness of Body": {kind:"instant",use:c=>{const rr=rollDice(edOf(c)==="2024"?`1d${maDie(c)}${sgn(c.mods.wis)}`:String(3*clsLv(c,"Monk")));if(rr.total<1){rr.total=1;rr.text+=" (minimum 1)";}return healMsg(c,"Wholeness of Body",rr);}},
  "Quivering Palm": {kind:"instant",choices:quiveringPalmOptions,cost:(c,ch)=>ch==="set"?(edOf(c)==="2024"?4:3):0,use:quiveringPalmUse},
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
  "Holy Nimbus": {kind:"toggle",fx:c=>({notes:[edOf(c)==="2024"?`Holy Nimbus: 10 minutes; enemies starting their turns in Aura of Protection take ${c.mods.cha+c.prof} Radiant damage; sunlight; Advantage on saves imposed by Fiends or Undead.`:"Holy Nimbus: 1 minute; enemies starting their turn within 30 feet take 10 radiant damage; advantage on saves against spells cast by fiends and undead."]})},
  "Elder Champion": { kind: "toggle", fx: () => ({ notes: ["Elder Champion: regain 10 hit points at the start of each turn; paladin spells as a bonus action; enemies nearby have disadvantage on saves against your spells"] }) },
  "Avenging Angel": { kind: "toggle", fx: () => ({ fly: 60, notes: ["Avenging Angel: frightening aura; attacks against frightened creatures have advantage"] }) },
  "Living Legend": { kind: "toggle", fx: () => ({ notes: ["Living Legend: advantage on Charisma checks; once per turn turn a miss into a hit; reroll failed saves"] }) },
  "Undying Sentinel": { kind: "instant", use: c => { c.hpCur = edOf(c) === "2024" ? Math.min(+c.hp || 0, 1 + 3 * clsLv(c,"Paladin")) : 1; return `Undying Sentinel: you drop to ${c.hpCur} hit point${c.hpCur === 1 ? "" : "s"} instead of 0.`; } },
  // ---------- Ranger
  "Hunter's Mark": { kind: "toggle", fx: c => ({ atk: [{ f: "weapon", extra: `${(c.feats || []).some(f => f.f === "Foe Slayer") ? "1d10" : "1d6"} force vs marked`, label: "Hunter's Mark" }] }), start: () => "Hunter's Mark cast without a spell slot." },
  "Dread Ambusher": { kind: "instant", use: c => roll("Dread Ambusher", (c.feats || []).some(f => f.f === "Stalker's Flurry") ? "2d8" : "2d6", "damage", "Psychic damage on this hit") },
  "Fey Reinforcements": { kind: "instant", dialog: c => castDialog(c,edOf(c),"Summon Fey") },
  "Misty Wanderer": { kind: "instant", dialog: c => castDialog(c,edOf(c),"Misty Step") },
  "Steps of the Fey": { kind: "instant", dialog: c => castDialog(c,edOf(c),"Misty Step") },
  // ---------- Rogue
  "Psychic Veil": { kind: "toggle", fx: () => ({ notes: ["Psychic Veil: invisible for 1 hour, until you damage a creature or force a save"] }) },
  "Rend Mind": { kind: "instant", use: c => `Rend Mind: the target makes a WIS save (DC ${8 + c.prof + c.mods.dex}) or is stunned for 1 minute; repeat the save at the end of each target turn.` },
  "Spell Thief": { kind: "instant", use: c => `Spell Thief: the caster makes an INT save against DC ${8 + c.prof + c.mods.int}.` },
  "Stroke of Luck": { kind: "instant", use: () => "Stroke of Luck: the miss becomes a hit, or the check's d20 counts as a 20." },
  // ---------- Sorcerer
  "Font of Magic":{kind:"instant",noCost:true,choices:c=>[...[1,2,3,4,5].filter(L=>canCreateSorcererSlot(c,L)).map(L=>["make"+L,"Create level "+L+" slot ("+SLOT_CREATION_COST[L]+" points)"]),...pcResources(c).filter(r=>(/^slot[1-9]$/.test(r.key)||r.key==="pact")&&resLeft(c,r)>0).map(r=>["burn"+(r.key==="pact"?"pact":r.key.slice(4)),"Convert "+r.name+" to Sorcery Points"])],use:convertFontOfMagic},
  Metamagic:{kind:"instant",choices:metamagicOptions,cost:metamagicCost,use:(c,ch,spent)=>{if(!ch)return "Select a learned Metamagic option.";if(ch.startsWith("free:"))c.apotheosisUsedThisTurn=true;return "Metamagic: "+ch.replace(/^free:/,"")+"; "+spent+" Sorcery Points spent. Resolve casting modifications manually.";}},
  "Dragon Wings": {kind:"toggle",fx:c=>({fly:edOf(c)==="2024"?60:"speed",notes:[edOf(c)==="2024"?"Dragon Wings: 60-foot Fly Speed for 1 hour; end manually when duration expires.":"Dragon Wings: fly at walking speed; cannot manifest while wearing armor not made for them."]})},
  "Draconic Presence": { kind: "toggle", fx: () => ({ notes: ["Draconic Presence: 60 ft aura of awe or fear (WIS save)"] }) },
  "Revelation in Flesh": { kind: "toggle", choices: [["sight", "See the Invisible"], ["fly", "Glistening Flight"], ["swim", "Aquatic Adaptation"], ["worm", "Wormlike Movement"]], fx: (c, ch) => ch === "fly" ? { fly: "speed" } : ch === "swim" ? { swim: "2speed", notes: ["Aquatic Adaptation: breathe underwater"] } : ch === "sight" ? { notes: ["See invisible creatures within 60 ft"] } : { notes: ["Wormlike Movement: squeeze through 1-inch spaces, escape grapples with 5 ft of movement"] } },
  "Trance of Order": { kind: "toggle", fx: () => ({ notes: ["Trance of Order: attacks against you can't have advantage; your d20 rolls of 9 or lower count as 10"] }) },
  "Tides of Chaos": { kind: "instant", use: () => "Tides of Chaos: advantage on this roll." },
  "Bend Luck": { kind: "instant", cost: c => edOf(c) === "2024" ? 1 : 2, use: () => rollMsg("Bend Luck", "1d4", "Add it to or subtract it from the roll") },
  "Bastion of Law": { kind: "instant", choices: [["1", "1 point"], ["2", "2 points"], ["3", "3 points"], ["4", "4 points"], ["5", "5 points"]], cost: (c, ch) => +ch || 1, use: (c, ch, spent) => `Bastion of Law: the creature gets ${spent}d8 ward dice.` },
  "Psionic Sorcery": { kind: "none" },
  // ---------- Warlock
  "Fiendish Resilience": { kind: "persist", choices: c=>DMG_LIST.filter(d=>edOf(c)!=="2024"||d!=="force").map(d=>[d,d.charAt(0).toUpperCase()+d.slice(1)]), fx: (c,ch)=>({res:DMG_LIST.includes(ch)&&(edOf(c)!=="2024"||ch!=="force")?[ch]:[]}) },
  "Dark One's Blessing": { kind: "instant", use: c => { const n = Math.max(1, c.mods.cha + clsLv(c,"Warlock")); giveTemp(c, n); return `Dark One's Blessing: ${n} temporary hit points.`; } },
  "Dark One's Own Luck": { kind: "instant", use: () => rollMsg("Dark One's Own Luck", "1d10", "Add it to the check or save") },
  "Healing Light": { kind: "instant", choices: c => {
    const r=pcResources(c).find(r=>r.key===subAblKey("Healing Light"));
    const n=r?Math.min(Math.max(1,c.mods.cha),resLeft(c,r)):0;
    return Array.from({length:n},(_,i)=>[String(i+1),(i+1)+"d6"]);
  }, cost: (c,ch)=>+ch, use: (c,ch,spent)=>roll("Healing Light",spent+"d6","heal","Restore HP to yourself or one visible creature within 60 ft; confirm Bonus Action and recipient.") },
  "Searing Vengeance": { kind: "instant", use: c => area("Searing Vengeance", `2d8${sgn(c.mods.cha)}`, null, 0, "Radiant", "The creature stands up with half its hit points. Each creature of your choice within 30 ft takes radiant damage and is blinded until the end of the turn.") },
  "Hurl Through Hell": { kind: "instant", use: c => edOf(c) === "2024" ? roll("Hurl Through Hell", "8d10", "damage", `Psychic damage if the target fails a CHA save (DC ${8 + c.prof + c.mods.cha}); it is incapacitated until the end of your next turn`) : roll("Hurl Through Hell", "10d10", "damage", "Psychic damage when the creature returns (none if it is a fiend)") },
  "Celestial Resilience": { kind: "instant", use: c => { const n = clsLv(c,"Warlock") + c.mods.cha; giveTemp(c, n); return `Celestial Resilience: ${n} temporary hit points.`; } },
  "Warping Implosion": { kind: "instant", use: c => area("Warping Implosion", "3d10", "str", 8 + c.prof + c.mods.cha, "Force", "You teleport up to 120 ft. Each creature within 30 ft of the space you left makes a STR save: force damage and pulled next to that space, half and not pulled on a success.") },
  // ---------- Wizard
  "Arcane Recovery": { kind: "instant", dialog: (c, a) => recoveryDialog(c, "Arcane Recovery", a.res) },
  Portent:{kind:"instant",noCost:true,choices:portentChoices,use:usePortent},
  "Recharge Arcane Ward":{kind:"instant",choices:arcaneWardRechargeOptions,use:arcaneWardRecharge},
  "Projected Ward":{kind:"instant",choices:projectedWardOptions,use:projectedWardUse},
  "Resolve Spell Breaker":{kind:"instant",choices:[["stopped","Stopped a spell"],["failed","Failed to stop a spell (refund slot)"]],use:spellBreakerResolve},
  "Illusory Self": { kind: "instant", use: () => "Illusory Self: the attack misses." },
  // ---------- species
  "Breath Weapon": { kind: "instant", use: c => { const x = (c.extras || []).find(e => e.startsWith("Breath Weapon")) || "", d = (x.match(/(\d+d\d+)/) || [])[1] || "2d6", dc = +((x.match(/DC (\d+)/) || [])[1] || 8 + c.prof + c.mods.con), A = DRAGON_ANCESTRY[c.ancestry] || {}, sv = edOf(c) === "2024" ? "dex" : String(A.save || "DEX").toLowerCase(); return area("Breath Weapon", d, sv, dc, cap1(A.type || ""), `Each creature in the ${edOf(c) === "2024" ? "15 ft cone or 30 ft line" : A.shape || "area"} makes a ${sv.toUpperCase()} save: ${A.type || ""} damage, half on a success.`); } },
  "Healing Hands": { kind: "instant", use: c => roll("Healing Hands", `${c.prof}d4`, "heal", "Hit points restored to the creature you touch") },
  "Relentless Endurance": {kind:"instant",choices:c=>+c.hpCur===0&&c.hpCur!==""&&!c.death?.dead?[["confirm","Confirm reduced to 0 HP, not killed outright"]]:[],use:c=>{c.hpCur=1;pcHealed(c,true);return "Relentless Endurance: you drop to 1 HP instead of 0.";}},
  "Celestial Revelation": { kind: "toggle", choices: [["wings", "Heavenly Wings"], ["radiance", "Inner Radiance"], ["shroud", "Necrotic Shroud"]], fx: (c, ch) => ({ atk: [{ f: "all", extra: `${c.prof} ${ch === "shroud" ? "necrotic" : "radiant"} once per turn`, label: "Celestial Revelation" }], ...(ch === "wings" ? { fly: "speed" } : {}), notes: [ch === "radiance" ? "Inner Radiance: bright light; creatures within 10 ft take radiant damage equal to your proficiency bonus at the end of your turns" : ch === "shroud" ? "Necrotic Shroud: creatures within 10 ft make a CHA save or are frightened of you until the end of your next turn" : "Heavenly Wings: flying speed equal to your speed"] }) },
  "Large Form": { kind: "toggle", fx: () => ({ speed: [10, "Large Form"], notes: ["Large Form: you are Large, with advantage on Strength checks, for 10 minutes"] }) },
  "Draconic Flight": { kind: "toggle", fx: () => ({ fly: "speed", notes: ["Draconic Flight: spectral wings for 10 minutes"] }) },
  "Adrenaline Rush": { kind: "instant", use: c => { giveTemp(c, c.prof); return `Adrenaline Rush: Dash as a bonus action and gain ${c.prof} temporary hit points.`; } },
  "Giant Ancestry": { kind:"instant",use:giantBoonUse },
  "Stonecunning":{kind:"toggle",choices:()=>[["stone","Confirm contact with stone"]],fx:()=>({notes:["Stonecunning: Tremorsense 60 ft while touching stone, for up to 10 minutes; confirm surface and end manually."]})},
  "Heroic Inspiration":{kind:"instant",use:c=>{if(!c.heroicInspiration)return "No Heroic Inspiration available.";delete c.heroicInspiration;return "Heroic Inspiration spent: immediately reroll the chosen die and use the new result.";}}
};
// spend a recovery on the highest spent slots that fit (5th level at most)
function slotRecover(c, budget, label) {
  c.used = c.used || {}; const got = [];
  for (let L = 5; L >= 1; L--) while (budget >= L && (+c.used["slot" + L] || 0) > 0) { c.used["slot" + L] -= 1; budget -= L; got.push(L); }
  return got.length ? `${label}: recovered ${got.map(L => `a level ${L}`).join(", ")} slot${got.length > 1 ? "s" : ""}.` : `${label}: no spent slots that it can recover.`;
}
const DRACONIC_PRESENCE_REROLL = {kind:"instant",noCost:true,choices:dragonPresenceChoices,use:dragonPresenceUse};
const actSpec = a => a.res === "dragonPresence" ? DRACONIC_PRESENCE_REROLL : ACT[a.name] || (a.res ? { kind: "instant" } : null);
const actChoices = (c, S) => typeof S.choices === "function" ? S.choices(c) : S.choices || [];
// everything active right now, merged into one set of effects
function pcFx(c) {
  const F = { ac: [], acMin: null, acUnarm: [], speed: [], mult: 1, fly: null, climb: null, swim: null, res: new Set(), atk: [], attacks: [], notes: [], on: [], form: null };
  const essence=companionLevel(c,"drake")>=7&&companionState(c,"drake")?.form;
  if(essence)F.res.add(essence);
  const armorResistance=artificerInfusionEquipped(c,"Resistant Armor")?.artificerInfusion.damageType;
  if(INFUSION_RESISTANCES.includes(armorResistance))F.res.add(armorResistance);
  if(artificerInfusionEquipped(c,"Arcane Propulsion Armor"))F.speed.push([5,"Arcane Propulsion Armor"]);
  if(edOf(c)==="2024"){
    const land=choiceOf(c,"Circle of the Land Spells")[0],ward={Arid:"fire",Polar:"cold",Temperate:"lightning",Tropical:"poison"}[land];
    if(characterSubclassLevel(c,"Druid","Circle of the Land")>=10&&ward){F.res.add(ward);F.notes.push("Nature's Ward: immune to Poisoned.");}
    const affinity=choiceOf(c,"Elemental Affinity")[0];
    if(characterSubclassLevel(c,"Sorcerer","Draconic Sorcery")>=6&&["acid","cold","fire","lightning","poison"].includes(affinity)){F.res.add(affinity);F.notes.push("Elemental Affinity: add Charisma modifier to one matching spell damage roll.");}
  }
  if(psiLevel(c,"Fighter")>=10)F.res.add("psychic");
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
    : `<span class="act">${sel()}<button type="button" class="btn sm" data-act="${k}"${a.res && R[a.res] && resLeft(c, R[a.res]) < 1 && !S.noCost ? " disabled" : ""}>▶ Activate</button></span>`;
  if (S.kind === "instant" && (S.use || S.dialog || a.res)) return `<span class="act">${sel()}<button type="button" class="btn sm" data-act="${k}"${a.res && R[a.res] && resLeft(c, R[a.res]) < 1 && !S.noCost && !ch.some(([id])=>typeof S.cost==="function"&&S.cost(c,id)===0) ? " disabled" : ""}>Use</button></span>`;
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
function actApply(targetId, amount, kind, options={}) {
  const [t, a, b, d] = targetId.split(":");
  if (t === "pc") {
    const p = PCS.roster.find(x => x.id === a); if (!p) return "That character is gone.";
    const cur = +(p.hpCur ?? p.hp) || 0, max = +p.hp || 0;
    if (kind === "heal") { p.hpCur = Math.max(cur,Math.min(options.halfHpCap?Math.floor(max/2):max,cur+Math.max(0,amount))); const hn = pcHealed(p, cur === 0&&p.hpCur>0); pcPersist(); return `${p.name} regains ${p.hpCur - cur} hit points (${p.hpCur}/${max}).${hn.length ? " " + hn.join(". ") + "." : ""}`; }
    if (kind === "temp") { const was = +p.hpTemp || 0; if (amount > was) p.hpTemp = amount; pcPersist(); return amount > was ? `${p.name} has ${amount} temporary hit points.` : `${p.name} keeps their ${was} temporary hit points (they don't stack).`; }
    const ward=arcaneWardAbsorb(p,amount); let left = ward.left; const tmp = +p.hpTemp || 0; if (tmp) { const use = Math.min(tmp, left); p.hpTemp = tmp - use || ""; left -= use; }
    p.hpCur = Math.max(0, cur - left); const dn = pcDamaged(p, ward.left, cur === 0); pcPersist(); return `${p.name} takes ${ward.left} damage${ward.absorbed?` (${ward.absorbed} absorbed by Arcane Ward)`:""} (${p.hpCur}/${max}${+p.hpTemp ? `, ${p.hpTemp} temp left` : ""}).${dn.length ? " " + dn.map(cap1).join(". ") + "." : ""}`;
  }
  const k = Store.get(a), e = k && (k.encounters || []).find(x => x.id === b), m = e && e.enemies.find(x => x.id === d);
  if (!m) return "That creature is gone.";
  if (kind === "damage") m.hp = Math.max(0, m.hp - amount); else m.hp=Math.max(m.hp,Math.min(options.halfHpCap?Math.floor(m.max/2):m.max,m.hp+Math.max(0,amount)));
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
  const saveAmount=R.halfAmount??Math.floor(R.amount/2);
  const saveLabel=R.halfAmount===undefined?"Apply half":"Apply on successful save";
  actDialog(`<h3 id="actTitle">${esc(R.title || "Result")}</h3><p style="margin:10px 0">${esc(R.msg)}</p>
    ${R.amount ? `<div class="field" style="margin:0"><label for="actTarget">${kind === "heal" ? "Heal" : kind === "temp" ? "Give temporary hit points to" : "Apply damage to"}</label>${sel}${!T.foes.length && wantFoe ? `<p class="hint" style="margin:6px 0 0">No monsters in an active encounter. Add an encounter in the Campaign Tracker to apply damage to it.</p>` : ""}</div>${kinds}
    <div class="row" style="justify-content:flex-end;margin-top:16px;flex-wrap:wrap"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Don't apply</button>${R.half ? `<button class="btn" type="button" data-actapply="half" style="flex:0 0 auto">${saveLabel} (${saveAmount})</button>` : ""}<button class="btn primary" type="button" data-actapply="full" style="flex:0 0 auto" autofocus>Apply ${R.amount}</button></div>`
    : `<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" type="button" data-actclose style="flex:0 0 auto" autofocus>OK</button></div>`}`);
  const s = $("#actTarget"); if (s) s.value = (wantFoe && T.foes.length ? T.foes[0].id : "pc:" + c.id);
}
function actDialogClick(e) {
  const ap = e.target.closest("[data-actapply]");
  if (ap && ACTX.r) {
    const R = ACTX.r, k = R.kind === "either" ? (($("input[name=actKind]:checked") || {}).value || "damage") : R.kind, n = ap.dataset.actapply === "half" ? (R.halfAmount??Math.floor(R.amount / 2)) : R.amount;
    const msg = actApply($("#actTarget").value,n,k,{halfHpCap:!!R.halfHpCap}); actClose(); toast(msg); return;
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
  const budget = Math.ceil((classFeatureLevel(c, name === "Arcane Recovery" ? "Wizard" : "Druid") || c.level) / 2), spent = [1, 2, 3, 4, 5].map(L => ({ L, n: Math.min(+((c.used || {})["slot" + L]) || 0, (pcResources(c).find(r => r.key === "slot" + L) || { max: 0 }).max) })).filter(x => x.n > 0);
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
    ${edOf(c)==="2024"&&classFeatureLevel(c,"Sorcerer")>=5&&resLeft(c,pcResources(c).find(r=>r.key==="sorcerousRestore"))>0?`<label class="check"><input type="checkbox" id="srSorcerousRestoration"><span>Use Sorcerous Restoration (regain up to ${Math.floor(classFeatureLevel(c,"Sorcerer")/2)} Sorcery Points)</span></label>`:""}
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
function aoeTargets(c, ed, includeSelf=false) {
  const T = actTargets(c), out = [];
  T.foes.forEach(f => { const [, k, e, id] = f.id.split(":"), camp = Store.get(k), enc = camp && camp.encounters.find(x => x.id === e), m = enc && enc.enemies.find(x => x.id === id); if (m) out.push({ id: f.id, label: f.label, group: f.group, foe: m }); });
  T.pcs.filter(x => includeSelf||!x.self).forEach(x => out.push({ id: x.id, label: x.label, group: "Characters", pc: x.self?c:PCS.roster.find(p => "pc:" + p.id === x.id) }));
  return out;
}
function actAoeDialog(c, R) {
  ACTX.c = c; ACTX.r = R; ACTX.aoe = null;
  const L = aoeTargets(c, edOf(c), R.includeSelf), groups = [...new Set(L.map(t => t.group))];
  actDialog(`<h3 id="actTitle">${esc(R.title)}</h3><p style="margin:10px 0">${esc(R.desc)}</p>
    ${L.length ? `<p class="hint" style="margin:0 0 6px">${R.singleTarget ? "Select the target" : "Tick every creature in the area"}${R.save ? `. Each one makes its own ${R.save.toUpperCase()} save against DC ${R.dc}` : ""}.</p>
      <div class="aoe-list">${groups.map(g => `<fieldset><legend>${esc(g)}</legend>${L.filter(t => t.group === g).map(t => `<label class="aoe-t"><input type="${R.singleTarget ? "radio" : "checkbox"}" name="aoeTarget" data-aoet="${esc(t.id)}" ${t.foe && !R.singleTarget && !R.chooseTargets ? "checked" : ""}> ${esc(t.label)}</label>`).join("")}</fieldset>`).join("")}</div>
      <div class="seg" role="radiogroup" aria-label="Damage rolls" style="margin-top:10px"><label class="opt"><input type="radio" name="aoeShare" value="0" ${aoeShared() ? "" : "checked"}><span>Separate ${esc(R.expr)} roll for each target</span></label><label class="opt"><input type="radio" name="aoeShare" value="1" ${aoeShared() ? "checked" : ""}><span>One shared roll for everyone (rules as written)</span></label></div>
      <div class="row" style="justify-content:flex-end;margin-top:14px;flex-wrap:wrap"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Cancel</button><button class="btn primary" type="button" data-aoeroll style="flex:0 0 auto" autofocus>Roll damage</button></div>`
    : `<p class="hint">No creatures to target. Add an encounter with monsters in the Campaign Tracker, or other characters on the Characters tab.</p><div class="row" style="justify-content:flex-end"><button class="btn primary" type="button" data-actclose style="flex:0 0 auto">OK</button></div>`}`);
}
function aoeRoll() {
  const c = ACTX.c, R = ACTX.r, ed = edOf(c), L = aoeTargets(c, ed, R.includeSelf), ids = $$("[data-aoet]").filter(i => i.checked).map(i => i.dataset.aoet);
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
