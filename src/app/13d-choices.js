/* 13d-choices.js: My Characters: choices inside features and feats (CHOICES: maneuvers, invocations, metamagic…) and the equipped-items list. */

/* ---- choices inside features and feats: maneuvers, invocations, metamagic, Hunter options, tools, Magic Initiate spells ---- */
const MANEUVERS = [
  ["ambush", "Ambush", "Add the die to a Stealth check or initiative roll.", "2024"], ["bait", "Bait and Switch", "Swap places with an ally within 5 ft; one of you adds the die to AC until your next turn.", "2024"],
  ["commander", "Commander's Strike", "Give up an attack so an ally can attack with its reaction, adding the die to damage."], ["presence", "Commanding Presence", "Add the die to an Intimidation, Performance or Persuasion check.", "2024"],
  ["disarm", "Disarming Attack", "Add the die to damage; the target makes a STR save or drops an item."], ["distract", "Distracting Strike", "Add the die to damage; the next attack on the target by someone else has advantage."],
  ["evasive", "Evasive Footwork", "When you move, add the die to your AC until you stop."], ["feint", "Feinting Attack", "Bonus action: advantage on your next attack against a creature, adding the die to damage."],
  ["goad", "Goading Attack", "Add the die to damage; the target makes a WIS save or has disadvantage attacking anyone but you."], ["grapple", "Grappling Strike", "After you hit, grapple as a bonus action and add the die to the check.", "2024"],
  ["lunge", "Lunging Attack", "Your reach grows by 5 ft for one attack (2024: move 5 ft first); add the die to damage."], ["maneuver", "Maneuvering Attack", "Add the die to damage; an ally can move half its speed without provoking."],
  ["menace", "Menacing Attack", "Add the die to damage; the target makes a WIS save or is frightened until your next turn ends."], ["parry", "Parry", "Reaction: reduce melee damage by the die + DEX (2024: + STR or DEX)."],
  ["precision", "Precision Attack", "Add the die to an attack roll."], ["push", "Pushing Attack", "Add the die to damage; a Large or smaller target makes a STR save or is pushed 15 ft."],
  ["rally", "Rally", "Bonus action: an ally gains temporary hit points equal to the die + your CHA (2024: + half your fighter level)."], ["riposte", "Riposte", "Reaction when a creature misses you: attack it and add the die to damage."],
  ["sweep", "Sweeping Attack", "After a hit, deal the die's damage to another creature within 5 ft of you and the target."], ["tactical", "Tactical Assessment", "Add the die to a History, Investigation or Insight check.", "2024"],
  ["trip", "Trip Attack", "Add the die to damage; a Large or smaller target makes a STR save or falls prone."]
];
const INVOCATIONS = [
  ["depths","Gift of the Depths","Breathe underwater, gain a Swim Speed equal to your Speed, and cast Water Breathing without a slot once per Long Rest.",5,"2024"],
  ["investment","Investment of the Chain Master","When casting Find Familiar, choose Fly or Swim Speed 40 feet for the familiar. Command its Attack action as a Bonus Action; choose Necrotic or Radiant instead of its physical damage; its saves use your spell save DC; react to grant it Resistance to incoming damage.",5,"2024"],
  ["mind","Eldritch Mind","Advantage on Constitution saves to maintain Concentration.",1,"2024"],
  ["smite","Eldritch Smite","On a pact weapon hit, once per turn expend a Pact Magic slot for 1d8 plus 1d8 per slot level Force damage. May knock a Huge or smaller target Prone.",5,"2024"],
  ["agonizing", "Agonizing Blast", "Add your Charisma modifier to the damage of each Eldritch Blast beam (applied when you cast it).", 1], ["armor", "Armor of Shadows", "Cast Mage Armor on yourself at will (use the Mage Armor toggle).", 1],
  ["beast", "Beast Speech", "Cast Speak with Animals at will.", 1, "2014"], ["beguile", "Beguiling Influence", "Proficiency in Deception and Persuasion.", 1, "2014"],
  ["devil", "Devil's Sight", "See normally in darkness, magical or not, to 120 ft.", 1], ["sight", "Eldritch Sight", "Cast Detect Magic at will.", 1],
  ["spear", "Eldritch Spear", "Eldritch Blast's range becomes 300 ft (2024: 30 ft × warlock level).", 1], ["rune", "Eyes of the Rune Keeper", "Read all writing.", 1],
  ["vigor", "Fiendish Vigor", "Cast False Life on yourself at will.", 1], ["twominds", "Gaze of Two Minds", "Perceive through a willing creature's senses.", 1],
  ["mask", "Mask of Many Faces", "Cast Disguise Self at will.", 1], ["misty", "Misty Visions", "Cast Silent Image at will.", 1],
  ["repel", "Repelling Blast", "Push a creature hit by Eldritch Blast up to 10 ft away.", 1], ["thief", "Thief of Five Fates", "Cast Bane once per long rest using a warlock spell slot.", 1, "2014"],
  ["chain", "Pact of the Chain", "Find Familiar, with a special familiar form.", 1, "2024"], ["blade", "Pact of the Blade", "Conjure a pact weapon and attack with Charisma.", 1, "2024"], ["tome", "Pact of the Tome", "A Book of Shadows with three cantrips and two rituals.", 1, "2024"],
  ["shadows", "One with Shadows", "In dim light or darkness, become invisible until you move or act.", 5], ["mire", "Mire the Mind", "Cast Slow once per long rest using a warlock spell slot.", 5, "2014"],
  ["omen", "Sign of Ill Omen", "Cast Bestow Curse once per long rest using a warlock spell slot.", 5, "2014"], ["thirst", "Thirsting Blade", "Attack twice with your pact weapon when you take the Attack action.", 5],
  ["whispers", "Bewitching Whispers", "Cast Compulsion once per long rest using a warlock spell slot.", 7, "2014"], ["dread", "Dreadful Word", "Cast Confusion once per long rest using a warlock spell slot.", 7, "2014"],
  ["sculptor", "Sculptor of Flesh", "Cast Polymorph once per long rest using a warlock spell slot.", 7, "2014"], ["ascend", "Ascendant Step", "Cast Levitate on yourself at will.", 9],
  ["leap", "Otherworldly Leap", "Cast Jump on yourself at will.", 9], ["grave", "Whispers of the Grave", "Cast Speak with Dead at will.", 9],
  ["lifedrinker", "Lifedrinker", "Your pact weapon deals extra necrotic damage equal to your CHA modifier (2024: 1d6, and you can heal).", 12],
  ["chains", "Chains of Carceri", "Cast Hold Monster at will on celestials, fiends or elementals.", 15, "2014"], ["myriad", "Master of Myriad Forms", "Cast Alter Self at will.", 15],
  ["visions", "Visions of Distant Realms", "Cast Arcane Eye at will.", 15], ["witch", "Witch Sight", "See the true form of shapechangers and illusions within 30 ft.", 15],
  ["devouring", "Devouring Blade", "Thirsting Blade gives three attacks.", 12, "2024"], ["gift", "Gift of the Protectors", "Allies whose names are in your Book of Shadows drop to 1 hit point instead of 0, once per long rest.", 9, "2024"]
];
const METAMAGIC = [["careful", "Careful Spell"], ["distant", "Distant Spell"], ["empowered", "Empowered Spell"], ["extended", "Extended Spell"], ["heightened", "Heightened Spell"], ["quickened", "Quickened Spell"], ["seeking", "Seeking Spell", "2024"], ["subtle", "Subtle Spell"], ["transmuted", "Transmuted Spell", "2024"], ["twinned", "Twinned Spell"]];
const DRAGONS = ["Black", "Blue", "Brass", "Bronze", "Copper", "Gold", "Green", "Red", "Silver", "White"];
const ARTISAN = ["Alchemist's supplies", "Brewer's supplies", "Calligrapher's supplies", "Carpenter's tools", "Cartographer's tools", "Cobbler's tools", "Cook's utensils", "Glassblower's tools", "Jeweler's tools", "Leatherworker's tools", "Mason's tools", "Painter's supplies", "Potter's tools", "Smith's tools", "Tinker's tools", "Weaver's tools", "Woodcarver's tools"];
const INSTRUMENTS = ["Bagpipes", "Drum", "Dulcimer", "Flute", "Horn", "Lute", "Lyre", "Pan flute", "Shawm", "Viol"];
const byEd = (c, L) => L.filter(x => !x[3] || typeof x[3] !== "string" || x[3] === edOf(c));
const opt3 = L => L.map(x => typeof x === "string" ? [x, x, ""] : [x[0], x[1], x[2] || ""]);
// Use the owning class level, including when the subclass belongs to a multiclass.
function expansionSubclassLevel(c, cls, subclass, ed) {
  if(ed&&edOf(c)!==ed&&!(ed==="2014"&&edOf(c)==="2024"&&subclassEntry("2024",cls,subclass)?.compatibility))return 0;
  if (c.cls === cls && c.subclass === subclass) return +c.level;
  return +(c.multi || []).find(entry => entry.cls === cls && entry.subclass === subclass)?.lv || 0;
}
function expansionChoice(cls, subclass, label, options, limit = () => 1, ed = "2014") {
  return {
    label,
    n: c => {
      const level = expansionSubclassLevel(c, cls, subclass, ed);
      return level >= subclassLevel(edOf(c), cls) ? limit(level) : 0;
    },
    opts: c => opt3(typeof options === "function" ? options(expansionSubclassLevel(c, cls, subclass, ed), c) : options),
  };
}
/* key: the feature (or "Feat: X") the choice belongs to. n(c): how many to choose. opts(c): [[id, label, description]] */
// SRD 5.2.1 weapon mastery selections are separate for each owning class.
const MASTERY_CLASSES=["Barbarian","Fighter","Paladin","Ranger","Rogue"];
function masteryLimit(ed,cls,level){
  if(ed!=="2024"||level<1||!MASTERY_CLASSES.includes(cls))return 0;
  if(cls==="Fighter")return level>=16?6:level>=10?5:level>=4?4:3;
  if(cls==="Barbarian")return level>=10?4:level>=4?3:2;
  return 2;
}
const masteryKey=cls=>"Weapon Mastery: "+cls;
function masteryOptions(c,cls){
  if(!masteryLimit(edOf(c),cls,clsLv(c,cls)))return [];
  itLoad();
  return (IT.data["2024"]||[]).filter(w=>w.kind==="gear"&&/^(Simple|Martial) (Melee|Ranged) Weapon/.test(w.cat)&&w.st?.some(([k,v])=>k==="Mastery"&&v)&&
    (cls!=="Barbarian"||/Melee/.test(w.cat))&&eqProficient(c,w))
    .map(w=>[w.n,w.n+" · "+w.st.find(([k])=>k==="Mastery")[1],w.d||""]);
}
function activeMastery(c,w){
  if(edOf(c)!=="2024"||!w||!eqProficient(c,w))return "";
  const property=w.st?.find(([k])=>k==="Mastery")?.[1];
  if(!property)return "";
  for(const cls of MASTERY_CLASSES){
    const limit=masteryLimit(edOf(c),cls,clsLv(c,cls));
    if(!limit||cls==="Barbarian"&&!/Melee/.test(w.cat))continue;
    const valid=[...new Set(choiceOf(c,masteryKey(cls)))].filter(n=>masteryOptions(c,cls).some(([id])=>id===n)).slice(0,limit);
    if(valid.includes(w.n))return property;
  }
  return "";
}
const CHOICES = {
  Scholar:{label:"Scholar Expertise",n:c=>edOf(c)==="2024"&&clsLv(c,"Wizard")>=2?1:0,opts:c=>opt3((c.skills||[]).filter(s=>s.p&&(!s.x||s.scholarGranted)&&["Arcana","History","Investigation","Medicine","Nature","Religion"].includes(s.s)).map(s=>s.s))},
  "Primal Knowledge":{label:"Additional Barbarian proficiency",n:c=>edOf(c)==="2024"&&clsLv(c,"Barbarian")>=3?1:0,opts:c=>opt3((c.skills||[]).filter(s=>(!s.p||s.primalGranted)&&CLASS_DATA.Barbarian.skills[0].includes(s.s)).map(s=>s.s))},
  "Divine Order":{label:"Divine Order",n:c=>edOf(c)==="2024"&&clsLv(c,"Cleric")>=1?1:0,opts:()=>opt3(["Protector","Thaumaturge"])},
  "Primal Order":{label:"Primal Order",n:c=>edOf(c)==="2024"&&clsLv(c,"Druid")>=1?1:0,opts:()=>opt3(["Magician","Warden"])},
  "Blessed Strikes":{label:"Blessed Strikes",n:c=>edOf(c)==="2024"&&clsLv(c,"Cleric")>=7?1:0,opts:()=>opt3(["Divine Strike","Potent Spellcasting"])},
  "Elemental Fury":{label:"Elemental Fury",n:c=>edOf(c)==="2024"&&clsLv(c,"Druid")>=7?1:0,opts:()=>opt3(["Primal Strike","Potent Spellcasting"])},
  "Armor Model": expansionChoice("Artificer", "Armorer", "Armor model", (_, c) =>
    edOf(c) === "2024" ? ["Dreadnaught", "Guardian", "Infiltrator"] : ["Guardian", "Infiltrator"], () => 1, null),
  "Eldritch Cannon": expansionChoice("Artificer", "Artillerist", "Cannon type", ["Flamethrower", "Force Ballista", "Protector"], () => 1, null),
  "Vestige Companion": expansionChoice("Warlock", "Vestige Patron", "Companion type", ["Celestial", "Fiend", "Undead"], () => 1, "2024"),
  "Vestige Spells": expansionChoice("Warlock", "Vestige Patron", "Vestige domain", ["Life", "Light", "Trickery", "War"], () => 1, "2024"),
  "Arcane Archer Lore": expansionChoice("Fighter", "Arcane Archer", "Cantrip", ["Druidcraft", "Prestidigitation"], () => 1, "2024"),
  "Runeforging": {
    label: "Weapon rune",
    n: c => Math.max(expansionSubclassLevel(c, "Death Knight", "Oath of the Ebon Blade", "2024"),
      expansionSubclassLevel(c, "Paladin", "Oath of the Ebon Blade", "2024")) >= 3 ? 1 : 0,
    opts: () => opt3(["Blood", "Frost", "Unholy"]),
  },
  "Demon Hunter specialization": expansionChoice("Demon Hunter", "Demon Hunter", "Specialization", ["Devourer", "Havoc", "Vengeance"], () => 1, "2024"),
  "Evoker specialization": expansionChoice("Evoker", "Draconic Sorcery", "Specialization", ["Augmentation", "Devastation", "Preservation"], () => 1, "2024"),
  "Storm Aura": expansionChoice("Barbarian", "Path of the Storm Herald", "Storm environment", ["Desert", "Sea", "Tundra"]),
  "Divine Fury": expansionChoice("Barbarian", "Path of the Zealot", "Divine Fury damage", ["Radiant", "Necrotic"]),
  "Form of the Beast": expansionChoice("Barbarian", "Path of the Beast", "Natural weapon for this rage", ["Bite", "Claws", "Tail"]),
  "Bestial Soul": expansionChoice("Barbarian", "Path of the Beast", "Bestial adaptation", ["Swimming", "Climbing", "Jumping"], level => level >= 6 ? 1 : 0),
  "Fighting Style": expansionChoice("Bard", "College of Swords", "College of Swords fighting style", ["Dueling", "Two-Weapon Fighting"]),
  "Implement of Peace": expansionChoice("Cleric", "Peace Domain", "Skill proficiency", ["Insight", "Performance", "Persuasion"]),
  "Rune Carver": expansionChoice("Fighter", "Rune Knight", "Runes", level => ["Cloud", "Fire", "Frost", "Stone", ...(level >= 7 ? ["Hill", "Storm"] : [])],
    level => level >= 15 ? 5 : level >= 10 ? 4 : level >= 7 ? 3 : 2),
  "Arcane Shot Options": expansionChoice("Fighter", "Arcane Archer", "Arcane Shot options", ["Banishing Arrow", "Beguiling Arrow", "Bursting Arrow", "Enfeebling Arrow", "Grasping Arrow", "Piercing Arrow", "Seeking Arrow", "Shadow Arrow"],
    level => level >= 18 ? 6 : level >= 15 ? 5 : level >= 10 ? 4 : level >= 7 ? 3 : 2),
  "Otherworldly Glamour": expansionChoice("Ranger", "Fey Wanderer", "Skill proficiency", ["Deception", "Performance", "Persuasion"]),
  "Divine Magic": expansionChoice("Sorcerer", "Divine Soul", "Divine affinity", [["Good", "Good", "Cure Wounds"], ["Evil", "Evil", "Inflict Wounds"], ["Law", "Law", "Bless"], ["Chaos", "Chaos", "Bane"], ["Neutrality", "Neutrality", "Protection from Evil and Good"]]),
  "Genie's Vessel": expansionChoice("Warlock", "The Genie", "Genie patron", [["Dao", "Dao", "Bludgeoning"], ["Djinni", "Djinni", "Thunder"], ["Efreeti", "Efreeti", "Fire"], ["Marid", "Marid", "Cold"]]),
  "Combat Superiority": { label: "Maneuvers", n: c => { const l = characterSubclassLevel(c,"Fighter","Battle Master"); return l >= 15 ? 9 : l >= 10 ? 7 : l >= 7 ? 5 : l >= 3 ? 3 : 0; }, opts: c => MANEUVERS.filter(m => !m[3] || m[3] === edOf(c)).map(m => [m[0], m[1], m[2]]) },
  "Eldritch Invocations": { label: "Invocations", n: c => { const l = clsLv(c, "Warlock"); return edOf(c) === "2024" ? [0, 1, 3, 3, 3, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10][l] : [0, 0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8][l]; }, opts: c => invocationOptions(c) },
  Metamagic: { label: "Metamagic options", n: c => { const l = clsLv(c, "Sorcerer"); return edOf(c)==="2024"?(l>=17?6:l>=10?4:l>=2?2:0):(l>=17?4:l>=10?3:l>=3?2:0); }, opts: c => METAMAGIC.filter(m => !m[2] || m[2] === edOf(c)).map(m => [m[0], m[1], ""]) },
  "Hunter's Prey": { label: "Hunter's Prey", n: () => 1, opts: c => opt3(edOf(c) === "2024" ? [["colossus", "Colossus Slayer", "+1d8 once per turn against a creature missing hit points."], ["horde", "Horde Breaker", "One extra attack against another creature within 5 ft of the first."]] : [["colossus", "Colossus Slayer", "+1d8 once per turn against a creature below its maximum."], ["giant", "Giant Killer", "Reaction attack against a Large or larger creature that attacks you."], ["horde", "Horde Breaker", "One extra attack against another creature within 5 ft of the first."]]) },
  "Defensive Tactics": { label: "Defensive Tactics", n: () => 1, opts: c => opt3(edOf(c) === "2024" ? [["escape", "Escape the Horde", "Opportunity attacks against you have disadvantage."], ["multi", "Multiattack Defense", "After a creature hits you, its other attacks this turn have disadvantage."]] : [["escape", "Escape the Horde", "Opportunity attacks against you have disadvantage."], ["multi", "Multiattack Defense", "+4 AC against a creature's later attacks this turn after it hits you."], ["steel", "Steel Will", "Advantage on saves against being frightened."]]) },
  Multiattack: { label: "Multiattack", n: c => edOf(c) === "2014" ? 1 : 0, opts: () => opt3([["volley", "Volley", "Ranged attack against every creature within 10 ft of a point."], ["whirl", "Whirlwind Attack", "Melee attack against every creature within 5 ft of you."]]) },
  "Superior Hunter's Defense": { label: "Superior Hunter's Defense", n: c => edOf(c) === "2014" ? 1 : 0, opts: () => opt3([["evasion", "Evasion", "No damage on a successful DEX save for half, half on a failure."], ["tide", "Stand Against the Tide", "Redirect a missed melee attack to another creature."], ["uncanny", "Uncanny Dodge", "Reaction: halve an attack's damage."]]) },
  "Favored Enemy": { label: "Favored enemies", n: c => { if (edOf(c) === "2024") return 0; const l = clsLv(c, "Ranger"); return l >= 14 ? 3 : l >= 6 ? 2 : 1; }, opts: () => opt3(["Aberrations", "Beasts", "Celestials", "Constructs", "Dragons", "Elementals", "Fey", "Fiends", "Giants", "Monstrosities", "Oozes", "Plants", "Undead", "Two humanoid races"]) },
  "Natural Explorer": { label: "Favored terrains", n: c => { if (edOf(c) === "2024") return 0; const l = clsLv(c, "Ranger"); return l >= 10 ? 3 : l >= 6 ? 2 : 1; }, opts: () => opt3(["Arctic", "Coast", "Desert", "Forest", "Grassland", "Mountain", "Swamp", "Underdark"]) },
  "Circle Spells": { label: "Your land", n: c => c.subclass === "Circle of the Land" || (c.multi || []).some(x => x.subclass === "Circle of the Land") ? 1 : 0, opts: () => opt3(["Arctic", "Coast", "Desert", "Forest", "Grassland", "Mountain", "Swamp", "Underdark"]) },
  "Circle of the Land Spells": { label: "Your land (change after a long rest)", n: () => 1, opts: () => opt3(["Arid", "Polar", "Temperate", "Tropical"]) },
  "Dragon Ancestor": { label: "Dragon ancestor", n: () => 1, opts: () => DRAGONS.map(d => [d, `${d} (${DRAGON_ANCESTRY[d] ? DRAGON_ANCESTRY[d].type : ""})`, ""]) },
  "Pact Boon": { label: "Pact boon", n: c => edOf(c) === "2014" && clsLv(c,"Warlock")>=3 ? 1 : 0, opts: () => opt3([["chain", "Pact of the Chain", "Find Familiar with special forms."], ["blade", "Pact of the Blade", "Conjure a pact weapon."], ["tome", "Pact of the Tome", "A Book of Shadows with three cantrips."]]) },
  "Feat: Crafter": { label: "Artisan's tools", n: () => 3, opts: () => opt3(ARTISAN) },
  "Feat: Musician": { label: "Instruments", n: () => 3, opts: () => opt3(INSTRUMENTS) }
};
const choiceOf = (c, k) => ((c.choices || {})[k]) || [];
function revisedOrder(c,cls){
  if(edOf(c)!=="2024"||clsLv(c,cls)<1)return "";
  const key=cls==="Cleric"?"Divine Order":cls==="Druid"?"Primal Order":"";
  if(!key)return "";
  const picked=choiceOf(c,key)[0];
  return (cls==="Cleric"?["Protector","Thaumaturge"]:["Magician","Warden"]).includes(picked)?picked:"";
}
function orderCheckBonus(c,skill){
  const cleric=revisedOrder(c,"Cleric")==="Thaumaturge"&&["Arcana","Religion"].includes(skill);
  const druid=revisedOrder(c,"Druid")==="Magician"&&["Arcana","Nature"].includes(skill);
  // Distinct class features are distinct bonuses; apply both if the multiclass qualifies.
  return (Number(cleric)+Number(druid))*Math.max(1,c.mods.wis);
}
const SPELL_INVOCATIONS=new Set(["agonizing","spear","repel"]);
function knownWarlockCantrips(c){
  if(!clsLv(c,"Warlock"))return [];
  const ed=edOf(c),names=new Set();
  for(const p of c.prepared||[]){
    if(p.ed!==ed||p.l!==0)continue;
    // Automatic grants count only when the owning feature supplies a Warlock spell.
    if(p.bookGrant&&!p.sources?.some(g=>g.cls==="Warlock"))continue;
    if(!p.bookGrant&&p.src)continue;
    const s=spellOf(ed,p.n);
    if(s&&!s.hb&&!s.pend&&!s.ref&&!s.referenceOnly&&!s.rulesSummary&&!s.shadow&&((s.c||[]).includes("Warlock")||p.sources?.some(g=>g.cls==="Warlock"&&g.feature==="Pact of the Tome"))&&(!s.ed||s.ed===ed))names.add(s.n);
  }
  return [...names].sort();
}
function invocationCantripEligible(c,id,name){
  if(!knownWarlockCantrips(c).includes(name))return false;
  const s=spellOf(edOf(c),name);
  // True Strike and weapon-attack cantrips need manual damage adjudication.
  const damage=!!s.dt||/\b\d+d\d+\b[^.]*\bdamage\b/i.test(s.d||"")||s.n==="True Strike";
  if(!damage)return false;
  if(id==="repel")return !!s.at||/\b(?:spell|weapon) attack\b/i.test(s.d||"");
  if(id==="spear")return +(String(s.r||"").match(/^(\d+)\s*(?:feet|foot|ft)/i)||[])[1]>=10;
  return true;
}
function invocationOptions(c){
  const ed=edOf(c),out=[];
  for(const v of INVOCATIONS){
    const [id,label,description]=v;
    if(ed==="2024"&&SPELL_INVOCATIONS.has(id)){
      for(const name of knownWarlockCantrips(c)){
        const key=id+":"+name;
        if(invocationEligible(c,key))out.push([key,label+" · "+name,id==="agonizing"?"Add Charisma modifier to this cantrip's damage rolls.":id==="spear"?"Increase range by 30 feet per Warlock level.":"On a hit, optionally push a Large or smaller target 10 feet away."]);
      }
    }else if(invocationEligible(c,id))out.push([id,label+(invocationMinLevel(ed,v)>1?" (lv "+invocationMinLevel(ed,v)+")":""),description]);
  }
  return out;
}
function invocationAffects(c,id,name){
  return edOf(c)==="2024"?hasChoice(c,"Eldritch Invocations",id+":"+name):name==="Eldritch Blast"&&hasChoice(c,"Eldritch Invocations",id);
}
const INVOCATION_REVISED_LEVEL={agonizing:2,devil:2,spear:2,vigor:2,mask:2,misty:2,repel:2,leap:2,ascend:5,twominds:5,myriad:5,lifedrinker:9,visions:9,grave:7};
function invocationMinLevel(ed,row){return ed==="2024"?(INVOCATION_REVISED_LEVEL[row[0]]??row[3]):Math.max(2,row[3]);}
function invocationEligible(c,id,seen=new Set()){
  const ed=edOf(c),[base,...target]=String(id).split(":"),row=INVOCATIONS.find(v=>v[0]===base),level=clsLv(c,"Warlock");
  if(ed==="2024"&&SPELL_INVOCATIONS.has(base)){if(!target.length||!invocationCantripEligible(c,base,target.join(":")))return false;}
  else if(target.length)return false;
  if(ed==="2014"&&SPELL_INVOCATIONS.has(base)&&!knownWarlockCantrips(c).includes("Eldritch Blast"))return false;
  if(!row||!level||(row[4]&&row[4]!==ed)||level<invocationMinLevel(ed,row)||seen.has(id))return false;
  // These legacy invocations are not revised SRD entries.
  if(ed==="2024"&&["sight","rune"].includes(id))return false;
  const selected=choiceOf(c,"Eldritch Invocations");
  if(ed==="2024"){
    const need={thirst:"blade",lifedrinker:"blade",devouring:"thirst",gift:"tome",smite:"blade",investment:"chain"}[base];
    if(need&&(!selected.includes(need)||!invocationEligible(c,need,new Set([...seen,id]))))return false;
  }else{
    const boon=choiceOf(c,"Pact Boon")[0];
    if(["thirst","lifedrinker"].includes(id)&&boon!=="blade")return false;
    if(id==="chains"&&boon!=="chain")return false;
  }
  return true;
}
const hasChoice = (c,k,id)=>choiceOf(c,k).includes(id)&&(k!=="Eldritch Invocations"||invocationEligible(c,id));
function warlockPact(c,id){
  const lv=clsLv(c,"Warlock");
  return edOf(c)==="2024"?lv>=1&&hasChoice(c,"Eldritch Invocations",id):lv>=3&&choiceOf(c,"Pact Boon")[0]===id;
}
function pactWeaponEligible(c,i,w=eqWeaponOf(i,edOf(c))){
  if(!warlockPact(c,"blade")||!i||!(+i.qty>0)||!w)return false;
  const ref=inventoryCatalogItem(i,edOf(c));
  return /^(Simple|Martial) Melee Weapon/.test(w.cat)||!!(ref&&ref.kind==="magic");
}
function pactWeaponOptions(c){
  return (c.inv||[]).filter(i=>pactWeaponEligible(c,i)).map(i=>[i.id,i.n,"Record the bonded weapon; resolve conjuration, distance, attunement by other creatures and bond ending manually."]);
}
function isPactWeapon(c,i,w){
  return choiceOf(c,"Pact Weapon")[0]===i?.id&&pactWeaponEligible(c,i,w);
}
function pactTomeOptions(c,level){
  if(!warlockPact(c,"tome"))return [];
  const ed=edOf(c);
  return choiceSpellOptions(c,s=>s.l===level&&(level===0||s.ri)&&!s.ref&&!s.referenceOnly&&!s.pend&&!s.rulesSummary&&!s.shadow&&!s.hb&&
    (s.c||[]).length>0&&!(c.prepared||[]).some(p=>p.n===s.n&&p.ed===ed&&(!p.bookGrant||p.sources?.some(g=>g.feature!=="Pact of the Tome"))));
}
function pactTomeSelections(c,level){
  const key=level===0?"Pact Tome Cantrips":"Pact Tome Rituals",allowed=new Set(pactTomeOptions(c,level).map(x=>x[0]));
  return [...new Set(choiceOf(c,key))].filter(n=>allowed.has(n)).slice(0,level===0?3:2);
}

const DRAGON_FEATURE_ELEMENTS = ["Acid", "Cold", "Fire", "Lightning", "Poison"];
const FEATURE_CHOICE_LANGUAGES = ["Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin", "Halfling", "Orc", "Abyssal", "Celestial", "Draconic", "Deep Speech", "Infernal", "Primordial", "Sylvan", "Undercommon"];
const choiceList = (label, options, n = 1) => ({ label, n: () => n, opts: () => opt3(options) });
const choiceSpellOptions = (c, filter) => {
  spLoad();
  return opt3([...new Set((SP.data[edOf(c)] || []).filter(s => !s.pend && filter(s)).map(s => s.n))].sort());
};
Object.assign(CHOICES, {
 "Lore Bonus Proficiencies":{label:"College of Lore skills",n:c=>characterSubclassLevel(c,"Bard","College of Lore")>=3?3:0,opts:c=>opt3((c.skills||[]).filter(s=>!s.p||s.loreGranted).map(s=>s.s))},
 "Magical Discoveries":{label:"Two additional prepared spells",n:c=>edOf(c)==="2024"&&characterSubclassLevel(c,"Bard","College of Lore")>=6?2:0,opts:c=>choiceSpellOptions(c,s=>s.l<=(FULL_SLOTS[clsLv(c,"Bard")]||[]).length&&["Cleric","Druid","Wizard"].some(k=>s.c.includes(k))&&!s.hb&&!s.ref&&!s.referenceOnly&&!s.rulesSummary&&!s.shadow)},
 "Elemental Affinity":{label:"Draconic damage affinity",n:c=>edOf(c)==="2024"&&characterSubclassLevel(c,"Sorcerer","Draconic Sorcery")>=6?1:0,opts:()=>opt3(["acid","cold","fire","lightning","poison"].map(x=>[x,x.charAt(0).toUpperCase()+x.slice(1)]))},
  "Chain Master Movement":{label:"Familiar movement",n:c=>edOf(c)==="2024"&&hasChoice(c,"Eldritch Invocations","investment")?1:0,opts:()=>opt3(["Fly 40 feet","Swim 40 feet"])},
 "Replicate Magic Item":{label:"Known catalog-backed plans (named plans only)",n:c=>edOf(c)==="2024"?artificerPlanLimits("2024",clsLv(c,"Artificer")).known:0,opts:artificerPlanOptions},
 "Infuse Item":{label:"Known legacy infusions (manual effects)",n:c=>edOf(c)==="2014"?artificerPlanLimits("2014",clsLv(c,"Artificer")).known:0,opts:c=>opt3(Object.entries(ARTIFICER_INFUSIONS).filter(([min])=>clsLv(c,"Artificer")>=+min).flatMap(([,names])=>names).concat("Replicate Magic Item (DM-recorded variant)"))},
  "Spell-Storing Item Object":{label:"Qualifying weapon or spellcasting focus (confirm eligibility)",n:c=>clsLv(c,"Artificer")>=11?1:0,opts:artificerStoreItemOptions},
  "Pact Weapon":{label:"Bonded inventory weapon",n:c=>warlockPact(c,"blade")?1:0,opts:pactWeaponOptions},
  "Pact Weapon Ability":{label:"Pact weapon attack ability",n:c=>edOf(c)==="2024"&&warlockPact(c,"blade")?1:0,opts:()=>opt3(["Charisma","Normal weapon ability"])},
  "Pact Weapon Damage":{label:"Pact weapon damage type",n:c=>edOf(c)==="2024"&&warlockPact(c,"blade")?1:0,opts:()=>opt3(["Normal","Necrotic","Psychic","Radiant"])},
  "Pact Tome Cantrips":{label:"Book of Shadows cantrips",n:c=>warlockPact(c,"tome")?3:0,opts:c=>pactTomeOptions(c,0)},
  "Pact Tome Rituals":{label:"Book of Shadows rituals",n:c=>edOf(c)==="2024"&&warlockPact(c,"tome")?2:0,opts:c=>pactTomeOptions(c,1)},
  "Divine Order Cantrip":{label:"Extra Cleric cantrip",n:c=>revisedOrder(c,"Cleric")==="Thaumaturge"?1:0,opts:c=>choiceSpellOptions(c,s=>s.l===0&&s.c.includes("Cleric")&&!s.referenceOnly&&!s.rulesSummary)},
  "Primal Order Cantrip":{label:"Extra Druid cantrip",n:c=>revisedOrder(c,"Druid")==="Magician"?1:0,opts:c=>choiceSpellOptions(c,s=>s.l===0&&s.c.includes("Druid")&&!s.referenceOnly&&!s.rulesSummary)},
  "Giant Power":{label:"Giant Power cantrip",n:c=>characterSubclassLevel(c,"Barbarian","Path of the Giant")>=3?1:0,opts:()=>opt3(["Thaumaturgy","Druidcraft"])},
  "Giant Power language": choiceList("Language", FEATURE_CHOICE_LANGUAGES),
  "Draconic Gift": choiceList("Language", FEATURE_CHOICE_LANGUAGES),
  "Draconic Disciple": choiceList("Language", FEATURE_CHOICE_LANGUAGES),
  "Drake Companion": choiceList("Drake essence (choose each summon)", DRAGON_FEATURE_ELEMENTS),
  "Drake's Breath": choiceList("Breath damage (choose each use)", DRAGON_FEATURE_ELEMENTS),
  "Breath of the Dragon": choiceList("Breath damage (choose each use)", DRAGON_FEATURE_ELEMENTS),
  "Elemental Cleaver": choiceList("Weapon damage (choose each rage)", DRAGON_FEATURE_ELEMENTS.concat("Thunder").filter(x => x !== "Poison")),
  "Aspect of the Wyrm": choiceList("Aura (choose each use)", ["Frightful Presence", ...DRAGON_FEATURE_ELEMENTS.map(x => x + " resistance")]),
  "Order Bonus Proficiency":{label:"Order Domain skill",n:c=>characterSubclassLevel(c,"Cleric","Order Domain")?1:0,opts:()=>opt3(["Intimidation","Persuasion"])},
  "Royal Envoy":{label:"Additional Royal Envoy proficiency",n:c=>characterSubclassLevel(c,"Fighter","Purple Dragon Knight (Banneret)")>=7&&(c.skills||[]).some(s=>s.s==="Persuasion"&&s.p&&!s.envoyGranted)?1:0,opts:c=>opt3((c.skills||[]).filter(s=>["Animal Handling","Insight","Intimidation","Performance"].includes(s.s)&&(!s.p||s.envoyGranted)).map(s=>s.s))},
  "Arcane Initiate": { label: "Wizard cantrips", n: () => 2, opts: c => choiceSpellOptions(c, s => s.l === 0 && s.c.includes("Wizard")) },
  "Spirit Session": { label: "Session spell", n: () => 1, opts: c => choiceSpellOptions(c, s => s.l > 0 && s.l <= Math.min(c.prof, Math.ceil(clsLv(c, "Bard") / 2)) && ["Divination", "Necromancy"].includes(s.s)) },
  "Training in War and Song (Bladesinging)": choiceList("One-handed melee weapon proficiency", ["Club", "Dagger", "Handaxe", "Javelin", "Light Hammer", "Mace", "Sickle", "Spear", "Battleaxe", "Flail", "Longsword", "Morningstar", "Rapier", "Scimitar", "Shortsword", "Trident", "War Pick", "Warhammer", "Whip"]),
  Eladrin: choiceList("Season", [
    ["Autumn", "Autumn", "Your Fey Step can charm up to two nearby creatures."],
    ["Winter", "Winter", "Your Fey Step can frighten a creature near your starting point."],
    ["Spring", "Spring", "You can teleport a willing creature instead of yourself."],
    ["Summer", "Summer", "Your Fey Step deals fire damage to chosen creatures near your destination."]]),
});
for (const lineage of ["Air Genasi", "Earth Genasi", "Fire Genasi", "Water Genasi"]) {
  CHOICES[lineage] = choiceList("Innate spellcasting ability", ["Intelligence", "Wisdom", "Charisma"]);
}
for (const level of [6, 7, 8, 9]) {
  CHOICES["Arcane Mastery " + level] = { label: "Level " + level + " wizard spell", n: () => 1, opts: c => choiceSpellOptions(c, s => s.l === level && s.c.includes("Wizard")) };
}
CHOICES["Species Spellcasting"] = choiceList("Species spellcasting ability", ["Intelligence", "Wisdom", "Charisma"]);
CHOICES["Elven Lineage Cantrip"] = { label: "High Elf cantrip (change after a long rest)", n: () => 1,
  opts: c => choiceSpellOptions(c, s => s.l === 0 && s.c.includes("Wizard")) };

CHOICES["Fey Gift Cantrip"] = { label: "Fey Gift cantrip (change after a long rest)", n: () => 1,
  opts: c => choiceSpellOptions(c, s => s.l === 0 && ["Cleric", "Druid", "Wizard"].some(cls => s.c.includes(cls))) };
CHOICES["High Elf Cantrip"] = { label: "High Elf wizard cantrip", n: () => 1,
  opts: c => choiceSpellOptions(c, s => s.l === 0 && s.c.includes("Wizard")) };
for (const [index, { choice, feature, level }] of WIZARD_SPELL_CHOICES.entries()) {
  const mastery = feature === "Spell Mastery";
  CHOICES[choice] = {
    label: choice,
    n: c => clsLv(c, "Wizard") >= level && (!mastery || edOf(c) === "2024" || wizardBookActive(c)) ? (mastery ? 1 : 2) : 0,
    opts: c => choiceSpellOptions(c, s => s.l === index + 1 && s.c.includes("Wizard") && (!wizardBookActive(c)||wizardBookContains(c,s.n)) && (!mastery || edOf(c)==="2014" || /^(?:1 )?action$/i.test(s.t))),
  };
}
for(const level of [6,7,8,9])CHOICES["Mystic Arcanum "+level]={
  label:"Mystic Arcanum (level "+level+")",
  n:c=>clsLv(c,"Warlock")>=2*level-1?1:0,
  opts:c=>choiceSpellOptions(c,s=>s.l===level&&(s.c.includes("Warlock")||legacySubclassOption(c,edOf(c),"Warlock",s))&&!s.referenceOnly&&!s.rulesSummary&&!s.hb&&!s.ref&&!s.shadow)
};
function wizardSpellChoicesHTML(c) {
  const choices = WIZARD_SPELL_CHOICES.map(({ choice }) => choiceHTML(c, choice)).join("");
  return wizardBookHTML(c)+(choices ? `<p class="hint">Choose these spells from your spellbook.</p>${choices}`:"");
}

for(const cls of MASTERY_CLASSES)CHOICES[masteryKey(cls)]={label:cls+" weapon mastery",n:c=>masteryLimit(edOf(c),cls,clsLv(c,cls)),opts:c=>masteryOptions(c,cls)};
const additionalFeatureChoices = {
  "Bonus Proficiencies":["Lore Bonus Proficiencies","Order Bonus Proficiency"],
  "Spell-Storing Item":["Spell-Storing Item Object"],
  "Pact Boon":["Pact Weapon","Pact Tome Cantrips"],
  "Eldritch Invocations":["Pact Weapon","Pact Weapon Ability","Pact Weapon Damage","Pact Tome Cantrips","Pact Tome Rituals","Chain Master Movement"],
  "Weapon Mastery":MASTERY_CLASSES.map(masteryKey),
  "Mystic Arcanum":[6,7,8,9].map(l=>"Mystic Arcanum "+l),
  "Divine Order":["Divine Order Cantrip"],
  "Primal Order":["Primal Order Cantrip"],
  "Demon Hunter Spells": ["Demon Hunter specialization"],
  "Evoker Spells": ["Evoker specialization"],
  "Giant Power": ["Giant Power language"],
  "Arcane Mastery": [6, 7, 8, 9].map(level => "Arcane Mastery " + level)
};
function featureChoiceHTML(c, k) {
  const keys = CHOICES[k] ? [k] : [];
  return keys.concat(additionalFeatureChoices[k] || []).map(key => choiceHTML(c, key)).join("");
}
function choiceHTML(c, k) {
  const S = CHOICES[k]; if (!S) return "";
  const n = S.n(c); if (!n) return "";
  const O = S.opts(c), have = [...new Set(choiceOf(c, k))].filter(id => O.some(o => o[0] === id)), left = n - have.length, kk = esc(k);
  const invalid=choiceOf(c,k).filter(id=>!O.some(o=>o[0]===id));
  return `<div class="choice"><span class="lbl" style="margin:0">${esc(S.label)} <span class="muted">${have.length}/${n}</span></span>
    ${invalid.map(id=>`<span class="tag">Unavailable: ${esc(id)} <button type="button" class="icon-btn" data-choicerm="${kk}|${esc(id)}" aria-label="Remove unavailable ${esc(id)}">✕</button></span>`).join("")}
    ${have.map(id => { const o = O.find(x => x[0] === id); return `<span class="tag gold" title="${esc(o[2])}">${esc(o[1])}<button type="button" class="icon-btn" data-choicerm="${kk}|${esc(id)}" aria-label="Remove ${esc(o[1])}">✕</button></span>`; }).join("")}
    ${left > 0 ? `<select data-choice="${kk}" aria-label="Choose ${esc(S.label)}"><option value="">${have.length ? "Add another…" : "Choose…"}</option>${O.filter(o => !have.includes(o[0])).map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join("")}</select>` : ""}
    ${have.length ? `<ul class="plain choice-notes">${have.map(id => { const o = O.find(x => x[0] === id); return o[2] ? `<li><b>${esc(o[1])}:</b> ${esc(o[2])}</li>` : ""; }).join("")}</ul>` : ""}</div>`;
}
/* Magic Initiate: a spell list, two cantrips and a 1st-level spell, added to the character's spells */
function miState(c) {
  const choices = choiceOf(c, "Feat: Magic Initiate");
  const lists = miLists(c), selected = (choices.find(x => x.startsWith("list:")) || "").slice(5);
  const list = lists.length === 1 ? lists[0] : lists.includes(selected) ? selected : "";
  const picked = (prefix, level) => {
    if (!list) return [];
    const options = new Set(miSpellOptions(c, list, level).map(spell => spell.n));
    return [...new Set(choices.filter(x => x.startsWith(prefix)).map(x => x.slice(2)))].filter(name => options.has(name));
  };
  return { list, can: picked("c:", 0), one: picked("s:", 1) };
}
const LEGACY_FEAT_LISTS = ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"];
const featListAbility = list => ["Cleric", "Druid"].includes(list) ? "wis" : list === "Wizard" ? "int" : "cha";
function miLists(c) {
  const bg = (c.feats || []).find(f => f.bgFeat && f.f === "Feat: Magic Initiate");
  if (bg?.note) return [bg.note];
  return edOf(c) === "2024" ? ["Cleric", "Druid", "Wizard"] : LEGACY_FEAT_LISTS;
}
function miCastingAbility(c, list) {
  const selected = choiceOf(c, "Feat casting ability: Magic Initiate")[0];
  return edOf(c) === "2024" && ["int", "wis", "cha"].includes(selected) ? selected : featListAbility(list);
}
function miSpellOptions(c, list, level) {
  spLoad();
  return (SP.data[edOf(c)] || []).filter(s => !s.pend && s.l === level && s.c.includes(list));
}
for (const name of ["Magic Initiate", ...Object.keys(FEAT_SPELLS)]) {
  CHOICES["Feat casting ability: " + name] = choiceList("Spellcasting ability", ["int", "wis", "cha"].map(ab => [ab, AB_FULL[ab], ""]));
}
for (const [name, { schools }] of Object.entries(FEAT_SPELLS)) {
  if (!schools) continue;
  CHOICES["Feat spells: " + name] = { label: "1st-level " + schools.join(" or ") + " spell", n: () => 1,
    opts: c => choiceSpellOptions(c, s => s.l === 1 && schools.includes(s.s)) };
}
for (const name of ["Ritual Caster", "Spell Sniper"]) {
  CHOICES["Feat spell list: " + name] = choiceList("Spell list", LEGACY_FEAT_LISTS);
}
CHOICES["Feat spells: Ritual Caster"] = {
  label: "1st-level ritual spells", n: c => edOf(c) === "2014" ? 2 : c.prof,
  opts: c => choiceSpellOptions(c, s => s.l === 1 && s.ri && (edOf(c) === "2024" || s.c.includes(choiceOf(c, "Feat spell list: Ritual Caster")[0]))),
};
CHOICES["Feat spells: Spell Sniper"] = {
  label: "Attack cantrip", n: c => edOf(c) === "2014" ? 1 : 0,
  opts: c => choiceSpellOptions(c, s => s.l === 0 && s.at && s.c.includes(choiceOf(c, "Feat spell list: Spell Sniper")[0])),
};
function featSpellChoiceKeys(c, name) {
  const key = featSpellKey(name);
  if (!Object.hasOwn(FEAT_SPELLS, key)) return [];
  const listKey = "Feat spell list: " + key;
  if (edOf(c) === "2014" && CHOICES[listKey]) {
    return [listKey, ...(choiceOf(c, listKey).length ? ["Feat spells: " + key] : [])];
  }
  const selected = (c.bonusFeats || []).some(f => f.n === name && f.a)
    || Object.entries(c.asiPicks || {}).some(([level, f]) => +level <= c.level && f?.feat === name && ["int", "wis", "cha"].some(a => f[a]));
  return [...(selected || key === "Spell Sniper" ? [] : ["Feat casting ability: " + key]), "Feat spells: " + key];
}
function featSpellChoicesHTML(c, name) {
  return name === "Magic Initiate" ? miHTML(c) : featSpellChoiceKeys(c, name).map(key => choiceHTML(c, key)).join("");
}
// Only reviewed legacy backgrounds expose these structured controls. Choice storage is
// namespaced to source, edition, record identity and choice ID, not the displayed name.
function backgroundSelectionRules(c) {
  const ed=edOf(c), bg=HB_BG[c.bg];
  if(!bg?.book||!bg.recoveryId||bg.pend||bg.ed!==ed||ed!=="2014") return [];
  const own=(bg.choices||[]).filter(q=>q.selection).map(q=>({...q,...q.selection,coverChoice:q.id===bg.coverGuildChoice,key:JSON.stringify(["background",ed,bg.src,bg.recoveryId,q.id])}));
  const selected=own.find(q=>q.coverChoice), cover=selected&&backgroundCoverGuild(c,bg,backgroundSelectionValues(c,selected)[0]);
  if(!cover)return own;
  // The secondary guild supplies equipment only, not its tool/language proficiencies or spell list.
  const inherited=(cover.choices||[]).filter(q=>q.selection?.equipment).map(q=>({...q,...q.selection,effect:"detail",label:cover.name+" equipment: "+q.label,inherited:true,key:JSON.stringify(["background",ed,bg.src,bg.recoveryId,"cover",cover.recoveryId,q.id])}));
  return [...own,...inherited];
}
function backgroundCoverGuild(c,bg,name) {
  const declared=(bg.coverGuilds||[]).find(g=>g.name===name),cover=declared&&HB_BG[declared.name];
  return cover?.book&&!cover.pend&&cover.recoveryId&&cover.ed===edOf(c)&&cover.src===declared.src&&cover!==bg&&!cover.coverGuilds?cover:null;
}
function backgroundSelectionValue(q,v) {
  if(typeof v!=="string")return "";
  const x=v.trim().replace(/\s+/g," ");
  const option=q.options.find(o=>o.toLowerCase()===x.toLowerCase());
  if(option)return option;
  // Open language choices are campaign-specific; preserve names but not markup or arbitrary long data.
  return q.open===true&&q.effect==="language"&&x.length<=80&&/^[\p{L}][\p{L}\p{M}0-9 .’'()\-]*$/u.test(x)?x:"";
}
function backgroundSelectionValues(c,q) {
  const raw=c.choices?.[q.key], values=[],seen=new Set();
  if(Array.isArray(raw))for(const v of raw){const x=backgroundSelectionValue(q,v),k=x.toLowerCase();if(x&&!seen.has(k)){seen.add(k);values.push(x);}}
  return values.slice(0,q.count);
}
function backgroundSelectionChange(c,key,value,remove=false) {
  const q=backgroundSelectionRules(c).find(x=>x.key===key);
  if(!q)return false;
  if((q.equipment||q.coverChoice)&&c.backgroundEquipmentClaimed)return false;
  value=backgroundSelectionValue(q,value);if(!value)return false;
  const have=backgroundSelectionValues(c,q), same=x=>x.toLowerCase()===value.toLowerCase();
  if(!remove&&(have.some(same)||have.length>=q.count))return false;
  if(remove&&!have.some(same))return false;
  c.choices={...(c.choices||{}),[key]:remove?have.filter(x=>!same(x)):[...have,value]};
  return true;
}
function backgroundSelectionEffects(c) {
  const result={language:[],tool:[],detail:[]};
  for(const q of backgroundSelectionRules(c))result[q.effect].push(...backgroundSelectionValues(c,q));
  return result;
}
// A newly forged character gets a single source-bound starting-equipment entitlement.
// Never grant retroactively to imported or preexisting characters; never regrant on level changes.
function backgroundEquipmentPlan(c) {
  const bg=HB_BG[c.bg],ed=edOf(c);
  if(!bg?.book||bg.pend||bg.ed!==ed||!bg.recoveryId||!bg.deferStartingEquipment)return null;
  const origin=JSON.stringify([ed,bg.src,bg.recoveryId]);
  if(c.backgroundEquipmentOrigin!==origin||c.importedFrom||c.backgroundEquipmentClaimed)return null;
  const gear=bg.gearItems.slice(),coins={cp:0,sp:0,ep:0,gp:0,pp:0};
  const addCoins=b=>{for(const k of Object.keys(coins))coins[k]+=b.startingCoins?.[k]??(k==="gp"?(+b.gp||0):0);};
  addCoins(bg);
  const all=backgroundSelectionRules(c);
  if(bg.coverGuilds){
    const selected=all.find(q=>q.coverChoice),cover=selected&&backgroundCoverGuild(c,bg,backgroundSelectionValues(c,selected)[0]);
    if(!cover)return {ready:false};
    gear.push(...cover.gearItems);addCoins(cover);
  }
  for(const q of all.filter(q=>q.equipment)){const have=backgroundSelectionValues(c,q);if(have.length!==q.count)return {ready:false};for(const v of have)gear.push(q.equipment[v]);}
  return {ready:true,gear,coins,origin};
}
function backgroundEquipmentClaim(c) {
  const plan=backgroundEquipmentPlan(c);
  if(!plan?.ready||!c.kitMoved||!Array.isArray(c.inv))return false;
  const ed=edOf(c), additions=plan.gear.flatMap(line=>eqParseKit(line,ed)).map(({n,qty,g})=>({id:uid("i"),ref:g?g.id:undefined,n,qty,w:g?(g.w||0)/(g.packQty||1):0,...(g?.packQty?{ammunitionUnits:true}:{}),att:false,attuned:false,value:g?g.c+(g.packQty?" per "+g.packQty:""):undefined,note:g?"Background starting equipment":"Background starting equipment; source-specific item, confirm weight and value with the DM",eq:false}));
  // Prepare the complete batch before changing the character. No generic placeholder items.
  c.inv.push(...additions);
  c.coins={...(c.coins||{}),...Object.fromEntries(Object.entries(plan.coins).map(([k,v])=>[k,(+c.coins?.[k]||0)+v]))};
  c.backgroundEquipmentClaimed=plan.origin;
  return true;
}
function backgroundEquipmentHTML(c) {
  const plan=backgroundEquipmentPlan(c);
  if(!plan)return "";
  return plan.ready?'<button type="button" class="btn sm" data-bgkit>Claim background starting equipment (once)</button>':'<p class="hint">Finish the equipment choices before claiming the background starting kit.</p>';
}

function backgroundSelectionsHTML(c) {
  const rules=backgroundSelectionRules(c),claim=backgroundEquipmentHTML(c);if(!rules.length&&!claim)return "";
  return '<div class="sec"><div class="sec-h"><h3>Background choices</h3></div>'+rules.map(q=>{
    const have=backgroundSelectionValues(c,q), key=esc(q.key),locked=!!((q.equipment||q.coverChoice)&&c.backgroundEquipmentClaimed);
    return '<div class="choice"><span class="lbl">'+esc(q.label)+' ('+have.length+'/'+q.count+')</span><p class="hint">'+esc(q.rules)+'</p>'+
      have.map(v=>'<span class="tag gold">'+esc(v)+(locked?'':'<button type="button" class="icon-btn" data-bgchoice-remove="'+key+'" data-bgchoice-value="'+esc(v)+'" aria-label="Remove '+esc(v)+'">✕</button>')+'</span>').join("")+
      (!locked&&have.length<q.count?(q.open?'<input type="text" maxlength="80" data-bgchoice="'+key+'" aria-label="'+esc(q.label)+'" placeholder="Enter a campaign-approved language">':'<select data-bgchoice="'+key+'" aria-label="'+esc(q.label)+'"><option value="">Choose…</option>'+q.options.filter(v=>!have.includes(v)).map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join("")+'</select>'):'')+'</div>';
  }).join("")+claim+'</div>';
}

function characterReadiness(c) {
  const checks = [];
  const addChoice = (feat, key) => {
    const rule = CHOICES[key], options = rule?.opts(c) || [];
    if (options.length && new Set(choiceOf(c, key).filter(id => options.some(([value]) => id === value))).size < rule.n(c)) {
      checks.push([feat + " · " + rule.label, `[data-choice="${CSS.escape(key)}"]`]);
    }
  };
  for(const q of backgroundSelectionRules(c)) if(backgroundSelectionValues(c,q).length<q.count)
    checks.push(["Background · "+q.label,'[data-bgchoice="'+CSS.escape(q.key)+'"]']);
  if (needsSubclass(c)) checks.push(["Choose a subclass", "[data-subpick]"]);
  const styles = fightStyleOptions(c);
  for (let index = 0; index < fightSlots(c); index++) {
    if (!styles.includes(c.fightStyles?.[index])) checks.push(["Choose fighting style " + (index + 1), `[data-fstyle="${index}"]`]);
  }
  for (const feat of activeCharacterFeats(c)) {
    if (feat === "Magic Initiate") {
      const { list, can, one } = miState(c);
      if (!list) checks.push(["Magic Initiate · Choose a spell list", '[data-mi="list"]']);
      else {
        if (edOf(c) === "2024") addChoice(feat, "Feat casting ability: Magic Initiate");
        if (can.length < 2) checks.push(["Magic Initiate · Choose cantrips", '[data-mi="c"]']);
        if (!one.length) checks.push(["Magic Initiate · Choose a 1st-level spell", '[data-mi="s"]']);
      }
    } else for (const key of featSpellChoiceKeys(c, feat)) addChoice(feat, key);
  }
  return checks;
}
function readinessFollowUp(c) {
  const checks = characterReadiness(c);
  return checks.length ? `<details class="readiness-follow-up"><summary>Choices to finish on the character sheet</summary><ul class="plain">${checks.map(([label]) => `<li>${esc(label)}</li>`).join("")}</ul></details>` : "";
}
function readinessHTML(c) {
  const checks = characterReadiness(c);
  const imported = Array.isArray(c.importReview) ? c.importReview.filter(value => typeof value === "string") : [];
  if (!checks.length && !imported.length) return "";
  return `<section class="sec"><div class="sec-h"><h3>Character readiness</h3></div>
    ${checks.length ? `<ul class="plain">${checks.map(([label, selector]) => `<li><button class="btn sm" type="button" data-readiness="${esc(selector)}">${esc(label)}</button></li>`).join("")}</ul>` : ""}
    ${imported.length ? `<details><summary>Review import differences</summary><ul>${imported.map(value => `<li>${esc(value)}</li>`).join("")}</ul><button class="btn sm" type="button" data-readiness-reviewed>Mark import reviewed</button></details>` : ""}</section>`;
}
function miHTML(c) {
  const M = miState(c), lists = miLists(c);
  const pick = (kind, l, n, have) => `${have.map(x => `<span class="tag gold">${esc(x)}<button type="button" class="icon-btn" data-mirm="${kind}:${esc(x)}" aria-label="Remove ${esc(x)}">✕</button></span>`).join("")}${have.length < n ? `<select data-mi="${kind}" aria-label="${l ? "1st-level spell" : "Cantrip"}"><option value="">${l ? "Choose a 1st-level spell…" : "Choose a cantrip…"}</option>${miSpellOptions(c, M.list, l).map(s => s.n).filter(x => !have.includes(x)).sort().map(x => `<option>${esc(x)}</option>`).join("")}</select>` : ""}`;
  return `<div class="choice"><span class="lbl" style="margin:0">Spell list</span>${lists.length > 1 ? `<select data-mi="list" aria-label="Spell list"><option value="">Choose…</option>${lists.map(l => `<option ${M.list === l ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>` : `<span class="tag">${esc(M.list)}</span>`}
    ${M.list ? `${edOf(c) === "2024" ? choiceHTML(c, "Feat casting ability: Magic Initiate") : ""}
    <span class="lbl" style="margin:0">Cantrips ${M.can.length}/2</span>${pick("c", 0, 2, M.can)}<span class="lbl" style="margin:0">1st level ${M.one.length}/1</span>${pick("s", 1, 1, M.one)}
    <p class="hint">Cast the 1st-level spell once per long rest without spending a slot.</p>` : ""}</div>`;
}
function actRun(c, name, choice) {
  const a = pcAbilities(c).find(x => x.name === name), S = a && actSpec(a); if (!S) return "";
  c.active = c.active || {}; c.used = c.used || {};
  if (S.kind === "toggle" && c.active[name]) { delete c.active[name]; if (name === "Wild Shape") delete c.formHp; if (name === "Aspect of the Wyrm") delete c.dragonFuryPending; return `${name} ended.`; }
  if (S.dialog) { S.dialog(c, a); return null; }
  const options=actChoices(c,S);
  if(S.choices&&!options.length)return "No eligible options available.";
  if(choice&&!options.some(x=>x[0]===choice))return "That option is unavailable.";
  const ch=options.length?(choice||options[0][0]):null;
  const r = a.res ? pcResources(c).find(x => x.key === a.res) : null;
  let spent = 0;
  if (r && !S.noCost) {
    const cost = typeof S.cost === "function" ? S.cost(c, ch) : S.cost != null ? S.cost : 1;
    if (r.max !== Infinity) { if (resLeft(c, r) < cost) return `Not enough ${r.name.toLowerCase()} left (needs ${cost}).`; c.used[r.key] = (+c.used[r.key] || 0) + cost; }
    spent = cost;
  }
  if (S.kind === "toggle") { c.active[name] = ch || true; return S.start ? S.start(c, ch) : `${name} active${ch ? `: ${(actChoices(c, S).find(x => x[0] === ch) || [, ""])[1]}` : ""}.`; }
  return S.use ? S.use(c, ch, spent) || "" : `${name} used.`;
}
function rcAbilitiesHTML(c) {
  const R = Object.fromEntries(pcResources(c).map(r => [r.key, r])), A = pcAbilities(c), shown = new Set();
  const rows = A.map(a => {
    const r = a.res && !shown.has(a.res) ? R[a.res] : null; if (r) shown.add(a.res);
    const ref = a.res && !r && R[a.res] ? ` <span class="muted" style="font-size:13px">uses ${esc(R[a.res].name.toLowerCase())}</span>` : "";
    return `<div class="abl${(c.active || {})[a.name] && actSpec(a) && actSpec(a).kind === "toggle" ? " on" : ""}"><div class="abl-h"><b>${esc(a.name)}</b><span class="tag">${esc(a.when)}</span>${a.src ? `<span class="muted" style="font-size:13px">${esc(a.src)}</span>` : ""}${ref}<span class="sp"></span>${r ? `<span class="muted" style="font-size:13px">${esc(r.name)}</span>${resCtr(c, r)}` : ""}${actControls(c, a, R)}</div><div class="ft-desc">${esc(a.text)}</div></div>`;
  });
  return rcActiveHTML(c) + rcCompanionsHTML(c) + (rows.length ? rows.join("") : `<p class="muted">No active class abilities at this level yet.</p>`);
}
function rcSlotsHTML(c) {
  const R = pcResources(c).filter(r => r.key === "pact" || r.key.startsWith("slot"));
  if (!R.length) return c.spell && c.spell.note ? `<div>${esc(c.spell.note)}</div>` : `<div class="muted">No spell slots until level 2.</div>`;
  return `<div class="slots">${R.map(r => `<div class="slot"><span>${esc(r.name)}</span>${resCtr(c, r)}</div>`).join("")}</div>${c.spell.note ? `<p class="hint" style="margin:4px 0 0">${esc(c.spell.note)}.</p>` : ""}`;
}
function pcRest(c, kind) {
  c.used = c.used || {};
  delete c.dragonPresencePending; delete c.dragonFuryPending;
  const back = [];
  pcResources(c).forEach(r => {
    if(r.recharge==="never")return; // Stored item uses do not refill automatically.
    const u = Math.min(r.max, +c.used[r.key] || 0); if (!u) return;
    let nu = u;
    if (kind === "long") nu = r.key === "hd" ? (edOf(c) === "2024" ? 0 : Math.max(0, u - Math.max(1, Math.floor(totalLv(c) / 2)))) : 0;
    else if (r.recharge === "short") nu = 0;
    else if (r.recharge === "short1") nu = u - 1;
    if (nu !== u) { c.used[r.key] = nu; back.push(r.name); }
  });
  if (kind === "long") { const z = +c.hpCur === 0; c.hpCur = c.hp; c.hpTemp = ""; pcHealed(c, z); c.death = { s: 0, f: 0 }; if (c.conc) { delete c.conc; delete c.concCheck; c.fxEnded = true; } if (exhOf(c)) { c.exh = exhOf(c) - 1; back.push("Exhaustion level"); } if (c.fx && Object.values(c.fx).some(Boolean)) { c.fx = {}; c.fxEnded = true; } }
  delete c.apotheosisUsedThisTurn;
  delete c.psiPending; // an unresolved check or attack cannot carry across a rest
  companionRestUpdate(c,kind);
  if(kind==="long"){
    if(c.createdSlots){delete c.createdSlots;back.push("Temporary spell slots expired");}
    if(artificerExpire(c))back.push("Tinker's Magic gear expired");
    if(c.wildCompanionActive){delete c.wildCompanionActive;back.push("Wild Companion ended");}
    if((+c.divineInterventionCooldown||0)>0){c.divineInterventionCooldown=Math.max(0,Math.trunc(+c.divineInterventionCooldown)-1);if(c.divineInterventionCooldown>0){c.used.divineIntervention=1;const i=back.indexOf("Divine Intervention");if(i>=0)back.splice(i,1);}else{delete c.divineInterventionCooldown;c.used.divineIntervention=0;}}
  }
  Object.keys(c.active || {}).forEach(n => { if (!ACT[n] || ACT[n].kind !== "persist") { delete c.active[n]; c.fxEnded = true; } });
  delete c.formHp;
  pcACApply(c);
  return back;
}
function rcAttacksHTML(c) { return (c.attacks || []).map((a, i) => `<div class="enc atk-row" style="border-color:var(--gold)"><div>${atkLine(a)}</div><div class="atk-btns">${a.save ? "" : `<button type="button" class="btn sm" data-roll="atk:${i}" title="Roll to hit">🎲 ${sgn(a.hit)}${rollMark(c, "attack", a.ab, { tags: a.tags })}</button>`}<button type="button" class="btn sm" data-roll="dmg:${i}" title="Roll damage">🎲 ${esc(a.dmg)}</button></div></div>`).join(""); }
function rcEquippedHTML(c) {
  const ed = edOf(c), L = (c.inv || []).filter(i => i.eq && (+i.qty || 0) > 0);
  if (!L.length) return `<p class="muted">Nothing equipped. Tick <b>Equip</b> next to an item in the inventory.</p>`;
  return `<ul class="plain">${L.map(i => {
    const ref = inventoryCatalogItem(i, ed), w = eqWeaponOf(i, ed), a = (c.attacks || []).find(x => x.iid === i.id), ar = eqArmorOf(i, ed);
    const ac = ar ? ((ar.st.find(([k]) => k === "Armor Class") || [])[1] || "") + (eqArmorBonus(i, ed) ? ` +${eqArmorBonus(i, ed)}` : i.att && !i.attuned && /\+[1-3]/.test(i.n) ? " (attune for its bonus)" : "") : null;
    const what = a ? `${sgn(a.hit)} to hit, ${esc(a.dmg)} ${esc(a.type)}` : ac ? `AC ${esc(ac)}` : w ? "" : ref && /Weapon/.test(ref.cat + (ref.type || "")) ? `<span class="hint">Add its weapon to the name, e.g. “Longsword +1”, to get an attack</span>` : esc(i.note || "");
    return `<li>${inventoryDetailsButton(i, i.n || "Item details")}${+i.qty > 1 ? ` <span class="muted">×${esc(i.qty)}</span>` : ""}${what ? ` <span class="muted">· ${what}</span>` : ""}</li>`;
  }).join("")}</ul>`;
}
