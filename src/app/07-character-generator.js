/* 07-character-generator.js: Character generator (generateCharacter) and the rules tables it uses: classes, species, backgrounds, feats, subclasses. */

/* ======================= Character generator (5e SRD) ======================= */
const AB = ["str", "dex", "con", "int", "wis", "cha"];
const AB_NAME = { str: "STR", dex: "DEX", con: "CON", int: "INT", wis: "WIS", cha: "CHA" };
const SKILLS = { Acrobatics: "dex", "Animal Handling": "wis", Arcana: "int", Athletics: "str", Deception: "cha", History: "int", Insight: "wis", Intimidation: "cha", Investigation: "int", Medicine: "wis", Nature: "int", Perception: "wis", Performance: "cha", Persuasion: "cha", Religion: "int", "Sleight of Hand": "dex", Stealth: "dex", Survival: "wis" };
const RACE_DATA = {
  Dwarf: { asi: { con: 2 }, speed: 25, traits: ["Darkvision 60 ft", "Dwarven Resilience", "Stonecunning"] },
  Elf: { asi: { dex: 2 }, speed: 30, traits: ["Darkvision 60 ft", "Keen Senses", "Fey Ancestry", "Trance"], skills: ["Perception"] },
  Halfling: { asi: { dex: 2 }, speed: 25, traits: ["Lucky", "Brave", "Halfling Nimbleness"] },
  Human: { asi: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, speed: 30, traits: ["Extra language"] },
  Dragonborn: { asi: { str: 2, cha: 1 }, speed: 30, traits: ["Draconic Ancestry", "Breath Weapon", "Damage Resistance"] },
  Gnome: { asi: { int: 2 }, speed: 25, traits: ["Darkvision 60 ft", "Gnome Cunning"] },
  "Half-Elf": { asi: { cha: 2 }, plus1: 2, speed: 30, traits: ["Darkvision 60 ft", "Fey Ancestry", "Skill Versatility"], extraSkills: 2 },
  "Half-Orc": { asi: { str: 2, con: 1 }, speed: 30, traits: ["Darkvision 60 ft", "Relentless Endurance", "Savage Attacks"], skills: ["Intimidation"] },
  Tiefling: { asi: { cha: 2, int: 1 }, speed: 30, traits: ["Darkvision 60 ft", "Hellish Resistance", "Infernal Legacy"] }
};
const BACKGROUNDS = { Acolyte: ["Insight", "Religion"], Charlatan: ["Deception", "Sleight of Hand"], Criminal: ["Deception", "Stealth"], Entertainer: ["Acrobatics", "Performance"], "Folk Hero": ["Animal Handling", "Survival"], "Guild Artisan": ["Insight", "Persuasion"], Hermit: ["Medicine", "Religion"], Noble: ["History", "Persuasion"], Outlander: ["Athletics", "Survival"], Sage: ["Arcana", "History"], Sailor: ["Athletics", "Perception"], Soldier: ["Athletics", "Intimidation"], Urchin: ["Sleight of Hand", "Stealth"] };
/* Backgrounds by rule set.
   2014: sk skills, tools, lang (extra languages), gear, gp, feature [name, description].
   2024: ab the three abilities the background can raise, feat the Origin feat (fnote: its spell list), sk, tools, gear, gp (option A; option B is 50 GP). */
const BG_DATA = {
  "2014": {
    Acolyte: { sk: ["Insight", "Religion"], tools: "", lang: "Two languages of your choice", gear: ["Holy symbol", "Prayer book", "5 sticks of incense", "Vestments", "Common clothes"], gp: 15, feature: ["Shelter of the Faithful", "You and your companions can get free healing and care at temples of your faith, and the priests there support you (within reason)."] },
    Charlatan: { sk: ["Deception", "Sleight of Hand"], tools: "Disguise kit, forgery kit", lang: "", gear: ["Fine clothes", "Disguise kit", "Con tools"], gp: 15, feature: ["False Identity", "You have a second identity with documents, acquaintances and disguises, and can forge papers you have seen."] },
    Criminal: { sk: ["Deception", "Stealth"], tools: "One gaming set, thieves' tools", lang: "", gear: ["Crowbar", "Dark common clothes with a hood"], gp: 15, feature: ["Criminal Contact", "A reliable contact links you to a network of criminals and can pass your messages across long distances."] },
    Entertainer: { sk: ["Acrobatics", "Performance"], tools: "Disguise kit, one musical instrument", lang: "", gear: ["Musical instrument", "Favor of an admirer", "Costume"], gp: 15, feature: ["By Popular Demand", "You can always find a place to perform, earning free lodging and food, and locals recognise you."] },
    "Folk Hero": { sk: ["Animal Handling", "Survival"], tools: "One type of artisan's tools, vehicles (land)", lang: "", gear: ["Artisan's tools", "Shovel", "Iron pot", "Common clothes"], gp: 10, feature: ["Rustic Hospitality", "Common folk will shelter and hide you, as long as you don't put them in danger."] },
    "Guild Artisan": { sk: ["Insight", "Persuasion"], tools: "One type of artisan's tools", lang: "One language of your choice", gear: ["Artisan's tools", "Letter of introduction from your guild", "Traveler's clothes"], gp: 15, feature: ["Guild Membership", "Your guild gives you lodging and food if needed, legal help, and access to powerful contacts, for yearly dues."] },
    Hermit: { sk: ["Medicine", "Religion"], tools: "Herbalism kit", lang: "One language of your choice", gear: ["Scroll case of notes", "Winter blanket", "Common clothes", "Herbalism kit"], gp: 5, feature: ["Discovery", "Your seclusion revealed a unique and powerful secret: a truth about the cosmos, a hidden place or a forgotten fact. Work it out with the DM."] },
    Noble: { sk: ["History", "Persuasion"], tools: "One gaming set", lang: "One language of your choice", gear: ["Fine clothes", "Signet ring", "Scroll of pedigree"], gp: 25, feature: ["Position of Privilege", "People assume you belong in high society: you are welcome there and common folk try to accommodate you."] },
    Outlander: { sk: ["Athletics", "Survival"], tools: "One musical instrument", lang: "One language of your choice", gear: ["Staff", "Hunting trap", "Trophy from an animal you killed", "Traveler's clothes"], gp: 10, feature: ["Wanderer", "You have an excellent memory for maps and geography, and can find food and water for yourself and five others each day."] },
    Sage: { sk: ["Arcana", "History"], tools: "", lang: "Two languages of your choice", gear: ["Bottle of black ink", "Quill", "Small knife", "Letter from a dead colleague", "Common clothes"], gp: 10, feature: ["Researcher", "When you don't know a piece of lore, you usually know where and from whom to learn it."] },
    Sailor: { sk: ["Athletics", "Perception"], tools: "Navigator's tools, vehicles (water)", lang: "", gear: ["Belaying pin (club)", "50 feet of silk rope", "Lucky charm", "Common clothes"], gp: 10, feature: ["Ship's Passage", "You can get free passage on a sailing ship for yourself and your companions, in exchange for help with the crew."] },
    Soldier: { sk: ["Athletics", "Intimidation"], tools: "One gaming set, vehicles (land)", lang: "", gear: ["Insignia of rank", "Trophy from a fallen enemy", "Set of bone dice", "Common clothes"], gp: 10, feature: ["Military Rank", "Soldiers loyal to your old organisation recognise your rank, and you can requisition simple equipment or horses."] },
    Urchin: { sk: ["Sleight of Hand", "Stealth"], tools: "Disguise kit, thieves' tools", lang: "", gear: ["Small knife", "Map of your home city", "Pet mouse", "Token to remember your parents", "Common clothes"], gp: 10, feature: ["City Secrets", "You know the secret patterns of cities: you and your companions travel through them at twice the normal pace."] }
  },
  "2024": {
    Acolyte: { ab: ["int", "wis", "cha"], feat: "Magic Initiate", fnote: "Cleric", sk: ["Insight", "Religion"], tools: "Calligrapher's supplies", gear: ["Calligrapher's Supplies", "Book (prayers)", "Holy Symbol", "Parchment (10 sheets)", "Robe"], gp: 8 },
    Artisan: { ab: ["str", "dex", "int"], feat: "Crafter", sk: ["Investigation", "Persuasion"], tools: "One type of artisan's tools", gear: ["Artisan's Tools", "2 Pouches", "Traveler's Clothes"], gp: 32 },
    Charlatan: { ab: ["dex", "con", "cha"], feat: "Skilled", sk: ["Deception", "Sleight of Hand"], tools: "Forgery kit", gear: ["Forgery Kit", "Costume", "Fine Clothes"], gp: 15 },
    Criminal: { ab: ["dex", "con", "int"], feat: "Alert", sk: ["Sleight of Hand", "Stealth"], tools: "Thieves' tools", gear: ["2 Daggers", "Thieves' Tools", "Crowbar", "2 Pouches", "Traveler's Clothes"], gp: 16 },
    Entertainer: { ab: ["str", "dex", "cha"], feat: "Musician", sk: ["Acrobatics", "Performance"], tools: "One musical instrument", gear: ["Musical Instrument", "2 Costumes", "Mirror", "Perfume", "Traveler's Clothes"], gp: 11 },
    Farmer: { ab: ["str", "con", "wis"], feat: "Tough", sk: ["Animal Handling", "Nature"], tools: "Carpenter's tools", gear: ["Sickle", "Carpenter's Tools", "Healer's Kit", "Iron Pot", "Shovel", "Traveler's Clothes"], gp: 30 },
    Guard: { ab: ["str", "int", "wis"], feat: "Alert", sk: ["Athletics", "Perception"], tools: "One gaming set", gear: ["Spear", "Light Crossbow", "20 Bolts", "Gaming Set", "Hooded Lantern", "Manacles", "Quiver", "Traveler's Clothes"], gp: 12 },
    Guide: { ab: ["dex", "con", "wis"], feat: "Magic Initiate", fnote: "Druid", sk: ["Stealth", "Survival"], tools: "Cartographer's tools", gear: ["Shortbow", "20 Arrows", "Cartographer's Tools", "Bedroll", "Quiver", "Tent", "Traveler's Clothes"], gp: 3 },
    Hermit: { ab: ["con", "wis", "cha"], feat: "Healer", sk: ["Medicine", "Religion"], tools: "Herbalism kit", gear: ["Quarterstaff", "Herbalism Kit", "Bedroll", "Book (philosophy)", "Lamp", "Oil (3 flasks)", "Traveler's Clothes"], gp: 16 },
    Merchant: { ab: ["con", "int", "cha"], feat: "Lucky", sk: ["Animal Handling", "Persuasion"], tools: "Navigator's tools", gear: ["Navigator's Tools", "2 Pouches", "Traveler's Clothes"], gp: 22 },
    Noble: { ab: ["str", "int", "cha"], feat: "Skilled", sk: ["History", "Persuasion"], tools: "One gaming set", gear: ["Gaming Set", "Fine Clothes", "Perfume"], gp: 29 },
    Sage: { ab: ["con", "int", "wis"], feat: "Magic Initiate", fnote: "Wizard", sk: ["Arcana", "History"], tools: "Calligrapher's supplies", gear: ["Quarterstaff", "Calligrapher's Supplies", "Book (history)", "Parchment (8 sheets)", "Robe"], gp: 8 },
    Sailor: { ab: ["str", "dex", "wis"], feat: "Tavern Brawler", sk: ["Acrobatics", "Perception"], tools: "Navigator's tools", gear: ["Dagger", "Navigator's Tools", "Rope", "Traveler's Clothes"], gp: 20 },
    Scribe: { ab: ["dex", "int", "wis"], feat: "Skilled", sk: ["Investigation", "Perception"], tools: "Calligrapher's supplies", gear: ["Calligrapher's Supplies", "Fine Clothes", "Lamp", "Oil (3 flasks)", "Parchment (12 sheets)"], gp: 23 },
    Soldier: { ab: ["str", "dex", "con"], feat: "Savage Attacker", sk: ["Athletics", "Intimidation"], tools: "One gaming set", gear: ["Spear", "Shortbow", "20 Arrows", "Gaming Set", "Healer's Kit", "Quiver", "Traveler's Clothes"], gp: 14 },
    Wayfarer: { ab: ["dex", "wis", "cha"], feat: "Lucky", sk: ["Insight", "Stealth"], tools: "Thieves' tools", gear: ["2 Daggers", "Thieves' Tools", "Gaming Set", "Bedroll", "2 Pouches", "Traveler's Clothes"], gp: 16 }
  }
};
const BG_DESC_2024 = {
  Acolyte: "Devoted to service in a temple, you know its rites and texts.", Artisan: "Apprenticed to a master crafter, you learned to make and haggle.",
  Charlatan: "A con artist and forger who knows how to work a crowd.", Criminal: "You made your living in the underworld, stealing and dodging the law.",
  Entertainer: "A performer who earns food and a bed by playing for the crowd.", Farmer: "Raised working the land, you are hardy and know animals and nature.",
  Guard: "You stood watch on walls and gates, always alert for trouble.", Guide: "You led travellers through the wilds, living off the land.",
  Hermit: "Years in seclusion gave you healing skill and inner calm.", Merchant: "A trader who travelled the roads and knows how to strike a deal.",
  Noble: "Raised among wealth and privilege, trained in history and etiquette.", Sage: "Years of study in libraries and academies made you a scholar.",
  Sailor: "Life at sea made you nimble, sharp-eyed and quick with your fists.", Scribe: "Trained to copy and record, you notice every detail.",
  Soldier: "Trained for war, you know weapons, drills and the hardships of battle.", Wayfarer: "You grew up on the streets and roads, getting by on wits and luck."
};
// the backgrounds offered for a rule set: its own, plus homebrew that fits it
const bgList = ed => [...Object.keys(BG_DATA[ed === "2014" ? "2014" : "2024"]), ...Object.keys(HB_BG).filter(n => { const x = HB_BG[n]; return !x.pend && (!x.ed || x.ed === "both" || x.ed === ed); })];
// a background's rules for a rule set (built-in, or homebrew shaped the same way)
function bgInfo(ed, name) {
  const B = BG_DATA[ed === "2014" ? "2014" : "2024"][name]; if (B) return B;
  const H = HB_BG[name]; if (H) return { sk: BACKGROUNDS[name] || [], tools: "", lang: "", gear: H.gear ? String(H.gear).split(/,\s*/).filter(Boolean) : [], gp: 0, feat: ed === "2024" && H.feat && featInfo("2024", H.feat) ? H.feat : "", ab: null, hb: true };
  const L = BG_DATA[ed === "2014" ? "2024" : "2014"][name]; return L ? { ...L, other: true } : null; // a background from the other rule set, on an older character
}
const bgSkills = (ed, name) => (bgInfo(ed, name) || {}).sk || BACKGROUNDS[name] || [];
const bgFeatLabel = B => B && B.feat ? `${B.feat}${B.fnote ? ` (${B.fnote})` : ""}` : "";
// everything a background gives, as short lines
function bgLines(ed, name) {
  const B = bgInfo(ed, name); if (!B) return [];
  const L = [];
  if (ed === "2024" && B.ab) L.push(["Ability scores", `${B.ab.map(a => AB_FULL[a]).join(", ")}: +2 to one and +1 to another, or +1 to all three`]);
  if (ed === "2024" && B.feat) { const F = featInfo("2024", B.feat); L.push(["Origin feat", `${bgFeatLabel(B)}${F ? ` — ${F[3]}` : ""}`]); }
  L.push(["Skills", (B.sk || []).join(", ") || "—"]);
  if (B.tools) L.push(["Tools", B.tools]);
  if (B.lang) L.push(["Languages", B.lang]);
  if (ed === "2014" && B.feature) L.push([`Feature: ${B.feature[0]}`, B.feature[1]]);
  if ((B.gear || []).length || B.gp) L.push(["Equipment", `${(B.gear || []).join(", ")}${B.gp ? `${(B.gear || []).length ? ", " : ""}${B.gp} gp` : ""}${ed === "2024" && !B.hb ? " (or 50 gp instead)" : ""}`]);
  return L;
}
const bgSummary = (ed, name) => bgLines(ed, name).map(([k, v]) => `${k}: ${v}.`).join(" ");
// the 2024 background ability increase: +2 / +1 to the class's best of the three, or the player's choice
function bgAbilityBonus(sc, ed, name, order, custom) {
  const B = bgInfo(ed, name), list = B && B.ab ? B.ab : AB;
  if (custom && custom.tri && B && B.ab) { B.ab.forEach(a => sc[a] += 1); return; }
  const ok = a => a && list.includes(a);
  if (custom && ok(custom.plus2)) { sc[custom.plus2] += 2; if (ok(custom.plus1) && custom.plus1 !== custom.plus2) sc[custom.plus1] += 1; return; }
  const best = order.filter(a => list.includes(a));
  sc[best[0]] += 2; if (best[1]) sc[best[1]] += 1;
}
Object.entries(BG_DATA["2024"]).forEach(([n, B]) => { if (!BACKGROUNDS[n]) BACKGROUNDS[n] = B.sk; });
const ALL_SKILLS = Object.keys(SKILLS);
const CLASS_DATA = {
  Barbarian: { hd: 12, pri: ["str", "con", "dex"], saves: ["str", "con"], skills: [["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"], 2], ac: (m) => [10 + m.dex + m.con, "Unarmored Defense"], kit: ["Greataxe", "Two handaxes", "Four javelins", "Explorer's pack"], wpn: ["Greataxe", "1d12", "str"], f: { 1: ["Rage", "Unarmored Defense"], 2: ["Reckless Attack", "Danger Sense"], 3: ["Primal Path"], 5: ["Extra Attack", "Fast Movement"], 7: ["Feral Instinct"], 9: ["Brutal Critical"], 11: ["Relentless Rage"], 15: ["Persistent Rage"], 18: ["Indomitable Might"], 20: ["Primal Champion"] }, sub: ["Path of the Berserker", 3] },
  Bard: { hd: 8, pri: ["cha", "dex", "con"], saves: ["dex", "cha"], skills: [ALL_SKILLS, 3], ac: (m) => [11 + m.dex, "Leather armor"], kit: ["Rapier", "Leather armor", "Dagger", "Lute", "Diplomat's pack"], wpn: ["Rapier", "1d8", "dex"], f: { 1: ["Spellcasting", "Bardic Inspiration"], 2: ["Jack of All Trades", "Song of Rest"], 3: ["Bard College", "Expertise"], 5: ["Font of Inspiration"], 6: ["Countercharm"], 10: ["Expertise", "Magical Secrets"], 20: ["Superior Inspiration"] }, sub: ["College of Lore", 3], cast: ["full", "cha"], expertise: [[3, 2], [10, 2]] },
  Cleric: { hd: 8, pri: ["wis", "con", "str"], saves: ["wis", "cha"], skills: [["History", "Insight", "Medicine", "Persuasion", "Religion"], 2], ac: (m) => [14 + Math.min(m.dex, 2) + 2, "Scale mail + shield"], kit: ["Mace", "Scale mail", "Shield", "Light crossbow", "Holy symbol", "Priest's pack"], wpn: ["Mace", "1d6", "str"], f: { 1: ["Spellcasting", "Divine Domain"], 2: ["Channel Divinity"], 5: ["Destroy Undead"], 10: ["Divine Intervention"] }, sub: ["Life Domain", 1], cast: ["full", "wis"] },
  Druid: { hd: 8, pri: ["wis", "con", "dex"], saves: ["int", "wis"], skills: [["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"], 2], ac: (m) => [11 + m.dex + 2, "Leather armor + wooden shield"], kit: ["Scimitar", "Wooden shield", "Leather armor", "Druidic focus", "Explorer's pack"], wpn: ["Scimitar", "1d6", "dex"], f: { 1: ["Druidic", "Spellcasting"], 2: ["Wild Shape", "Druid Circle"], 18: ["Timeless Body", "Beast Spells"], 20: ["Archdruid"] }, sub: ["Circle of the Land", 2], cast: ["full", "wis"] },
  Fighter: { hd: 10, pri: ["str", "con", "dex"], saves: ["str", "con"], skills: [["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"], 2], ac: () => [18, "Chain mail + shield"], kit: ["Longsword", "Chain mail", "Shield", "Light crossbow", "Dungeoneer's pack"], wpn: ["Longsword", "1d8", "str"], f: { 1: ["Fighting Style", "Second Wind"], 2: ["Action Surge"], 3: ["Martial Archetype"], 5: ["Extra Attack"], 9: ["Indomitable"], 11: ["Extra Attack (2)"], 20: ["Extra Attack (3)"] }, sub: ["Champion", 3], asi: [4, 6, 8, 12, 14, 16, 19] },
  Monk: { hd: 8, pri: ["dex", "wis", "con"], saves: ["str", "dex"], skills: [["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"], 2], ac: (m) => [10 + m.dex + m.wis, "Unarmored Defense"], kit: ["Shortsword", "10 darts", "Dungeoneer's pack"], wpn: ["Shortsword", "1d6", "dex"], f: { 1: ["Unarmored Defense", "Martial Arts"], 2: ["Ki", "Unarmored Movement"], 3: ["Monastic Tradition", "Deflect Missiles"], 4: ["Slow Fall"], 5: ["Extra Attack", "Stunning Strike"], 7: ["Evasion", "Stillness of Mind"], 10: ["Purity of Body"], 14: ["Diamond Soul"], 18: ["Empty Body"], 20: ["Perfect Self"] }, sub: ["Way of the Open Hand", 3] },
  Paladin: { hd: 10, pri: ["str", "cha", "con"], saves: ["wis", "cha"], skills: [["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"], 2], ac: () => [18, "Chain mail + shield"], kit: ["Longsword", "Shield", "Chain mail", "Five javelins", "Holy symbol", "Priest's pack"], wpn: ["Longsword", "1d8", "str"], f: { 1: ["Divine Sense", "Lay on Hands"], 2: ["Fighting Style", "Spellcasting", "Divine Smite"], 3: ["Divine Health", "Sacred Oath"], 5: ["Extra Attack"], 6: ["Aura of Protection"], 10: ["Aura of Courage"], 11: ["Improved Divine Smite"], 14: ["Cleansing Touch"] }, sub: ["Oath of Devotion", 3], cast: ["half", "cha"] },
  Ranger: { hd: 10, pri: ["dex", "wis", "con"], saves: ["str", "dex"], skills: [["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"], 3], ac: (m) => [11 + m.dex, "Leather armor"], kit: ["Longbow + 20 arrows", "Two shortswords", "Leather armor", "Explorer's pack"], wpn: ["Longbow", "1d8", "dex"], f: { 1: ["Favored Enemy", "Natural Explorer"], 2: ["Fighting Style", "Spellcasting"], 3: ["Ranger Archetype", "Primeval Awareness"], 5: ["Extra Attack"], 8: ["Land's Stride"], 10: ["Hide in Plain Sight"], 14: ["Vanish"], 18: ["Feral Senses"], 20: ["Foe Slayer"] }, sub: ["Hunter", 3], cast: ["half", "wis"] },
  Rogue: { hd: 8, pri: ["dex", "con", "wis"], saves: ["dex", "int"], skills: [["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"], 4], ac: (m) => [11 + m.dex, "Leather armor"], kit: ["Rapier", "Shortbow + 20 arrows", "Leather armor", "Two daggers", "Thieves' tools", "Burglar's pack"], wpn: ["Rapier", "1d8", "dex"], f: { 1: ["Expertise", "Sneak Attack", "Thieves' Cant"], 2: ["Cunning Action"], 3: ["Roguish Archetype"], 5: ["Uncanny Dodge"], 6: ["Expertise"], 7: ["Evasion"], 11: ["Reliable Talent"], 14: ["Blindsense"], 15: ["Slippery Mind"], 18: ["Elusive"], 20: ["Stroke of Luck"] }, sub: ["Thief", 3], asi: [4, 8, 10, 12, 16, 19], expertise: [[1, 2], [6, 2]] },
  Sorcerer: { hd: 6, pri: ["cha", "con", "dex"], saves: ["con", "cha"], skills: [["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"], 2], ac: (m) => [10 + m.dex, "No armor (Mage Armor: " + (13 + m.dex) + ")"], kit: ["Light crossbow + 20 bolts", "Two daggers", "Arcane focus", "Dungeoneer's pack"], wpn: ["Light crossbow", "1d8", "dex"], f: { 1: ["Spellcasting", "Sorcerous Origin"], 2: ["Font of Magic"], 3: ["Metamagic"], 20: ["Sorcerous Restoration"] }, sub: ["Draconic Bloodline", 1], cast: ["full", "cha"] },
  Warlock: { hd: 8, pri: ["cha", "con", "dex"], saves: ["wis", "cha"], skills: [["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"], 2], ac: (m) => [11 + m.dex, "Leather armor"], kit: ["Light crossbow + 20 bolts", "Leather armor", "Two daggers", "Arcane focus", "Scholar's pack"], wpn: ["Light crossbow", "1d8", "dex"], f: { 1: ["Otherworldly Patron", "Pact Magic"], 2: ["Eldritch Invocations"], 3: ["Pact Boon"], 11: ["Mystic Arcanum"], 20: ["Eldritch Master"] }, sub: ["The Fiend", 1], cast: ["pact", "cha"] },
  Wizard: { hd: 6, pri: ["int", "con", "dex"], saves: ["int", "wis"], skills: [["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"], 2], ac: (m) => [10 + m.dex, "No armor (Mage Armor: " + (13 + m.dex) + ")"], kit: ["Quarterstaff", "Spellbook", "Arcane focus", "Scholar's pack"], wpn: ["Quarterstaff", "1d6", "str"], f: { 1: ["Spellcasting", "Arcane Recovery"], 2: ["Arcane Tradition"], 18: ["Spell Mastery"], 20: ["Signature Spells"] }, sub: ["School of Evocation", 2], cast: ["full", "int"] }
};
const FULL_SLOTS = [null, [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]];
const ALIGN = ["Lawful good", "Neutral good", "Chaotic good", "Lawful neutral", "True neutral", "Chaotic neutral"];
// [hook line, backstory, unanswered questions, how the DM can use it]
const PC_HOOKS = [
  ["left {place} after a fire that wasn't an accident",
    "The fire took the family workshop in {place} and everyone asleep above it. The magistrate called it a knocked-over lamp, but {first} saw a figure in a grey cloak walking calmly away from the flames. The next morning {npc}, a rival who had wanted the workshop for years, bought the ruined lot for a pittance. {first} left town carrying a scorched iron key that opens nothing they have found yet.",
    ["Who was the figure in the grey cloak, and who paid them?", "What does the scorched key open?", "Why did {npc} want that workshop so badly?"],
    "Have the grey-cloaked figure turn up in an early chapter, working for someone else. When {first} finally finds the lock that fits the key, it should open something tied to the campaign's main plot."],
  ["is searching for a sibling who vanished near {place}",
    "{npc}, {first}'s younger sibling, went to {place} to work as a guide and stopped writing three seasons ago. The last letter mentioned good pay from {faction}, a job in the hills, and an odd request to burn the letter after reading it. {first} never burned it, and still carries it, creased soft from rereading.",
    ["Is {npc} alive, and a prisoner or a willing member of {faction}?", "What were they guiding people to in the hills?", "Who else has been asking about {npc}?"],
    "Drop {npc}'s name in a tavern rumor or on a ledger in an enemy camp. The strongest reveal is that {npc} is alive but has chosen a side the party is fighting against."],
  ["carries a sealed letter they've never dared to open",
    "A dying courier pressed the letter into {first}'s hands on the road outside {place} and made them swear to deliver it to {npc}. The wax seal bears the crest of {faction}. {first} has been to the address twice: both times the house stood empty, and the second time someone had torn it apart searching for something.",
    ["What does the letter say, and who wants it badly enough to search a house for it?", "Is {npc} hiding, captured or dead?", "Will {first} break the oath and read it?"],
    "Let someone try to steal the letter early on. Its contents should reveal one piece of the campaign's twist, but only once the party is far enough in that it changes what they do next."],
  ["was once a sworn member of {faction}",
    "{first} spent years in {faction}, sworn in by {npc} and trusted with its secrets. They walked away the night they were given an order they still refuse to talk about, and members of {faction} don't simply walk away. {first} still bears the oath-mark, hidden under a bracer or a sleeve.",
    ["What was the order {first} refused, and who carried it out instead?", "Does {npc} want {first} back, punished, or dead?", "Who along the party's road will recognize the oath-mark?"],
    "Have an agent of {faction} recognize the mark at an awkward moment. Later, offer {first} a way back in that would help the party but cost them something they care about."],
  ["owes a dangerous debt to a smiling moneylender",
    "{npc} lent {first} enough gold to get a sick parent through a hard winter in {place}. The interest has tripled since, and {npc} has stopped asking for coin. Now they ask for favors: carry a package, forget a face, leave a door unlocked at midnight. Each favor is a little worse than the last.",
    ["What is {npc} really building with these favors?", "Who else owes {npc}, and would they band together against them?", "What happens if {first} refuses the next favor?"],
    "Every few sessions, a messenger arrives with a new favor that clashes with what the party is doing. Paying off the debt should be possible but expensive, and {npc} can stay a useful, dangerous contact either way."],
  ["is the last of a disgraced family from {place}",
    "{first}'s family once held a seat on the council of {place}, until {first}'s grandparent was hanged for treason against {faction}. Everyone else in the family is dead or has changed their name. {first} keeps the family signet ring and a list in their grandparent's handwriting: seven names, three of them now crossed out by someone else.",
    ["Was the treason real, or a frame?", "Who crossed out the three names, and when?", "What happens if someone on the list learns {first} is alive?"],
    "Put one of the remaining names on the list in a position of power the party must deal with. Clearing, or confirming, the family's guilt makes a strong personal arc. {npc} is a good name for the next one on the list."],
  ["saw something in the woods outside {place} that no one believes",
    "As a youth, {first} was lost in the woods outside {place} for three days. They came back with no memory of the second day, a silver feather, and the certainty that something enormous walked between the trees and spoke their name. The village healer, {npc}, told them to stop telling the story. The healer looked afraid.",
    ["What was in the woods, and what did it want with {first}?", "What does {npc} know?", "What creature is the silver feather from?"],
    "Let the feather react (warming, glowing, humming) near the campaign's magical threats. Eventually the thing in the woods should return with an offer."],
  ["was raised by a retired adventurer who never explained the scars",
    "{npc}, a gruff, one-handed former adventurer, took {first} in as an orphan in {place} and taught them to fight, but never spoke about the past. The scars were a burned handprint across the chest and an old brand of {faction} on one shoulder. Last winter {npc} vanished, leaving behind a packed bag, a notched sword and a map with one place circled: {place2}.",
    ["What did {npc} do in their adventuring days, and to whom?", "Whose hand left the burn, and are they still alive?", "Why did {npc} leave now, and what is waiting in {place2}?"],
    "Make {place2} one of the campaign's locations. When the party arrives, they find signs {npc} was there recently, and that whatever scarred them is still hunting."],
  ["stole something from a temple and has had bad luck ever since",
    "Years ago, starving, {first} pried a {item} off the altar of a temple in {place}. No fence would touch it, and it can't be thrown away: each morning it is back in their pack. Small misfortunes have followed them ever since, and on bad nights they hear a priest's voice reciting their name. The temple's last priest, {npc}, is said to still be looking for it.",
    ["Which god's temple was it, and is that god angry or calling?", "Is the curse real, or is someone engineering the bad luck?", "What happens if {first} returns the {item}?"],
    "Give {first} one dramatic stroke of bad luck per session, then let the curse turn useful once (the {item} opens a sealed holy door, or wards off undead). Returning it should be a quest of its own."],
  ["dreams every night of a door beneath {place}",
    "The dreams began on {first}'s sixteenth birthday: a stair spiralling down beneath {place} to a black door with a lock shaped like a hand. Each night they get one step closer. Lately they wake with dirt under their nails, and last week someone chalked the name {npc} on the door of the room where they slept.",
    ["What is behind the door, and does it want to be opened?", "Who is {npc}, and how did they know where {first} was sleeping?", "What happens when the dream reaches the bottom of the stair?"],
    "Count the steps down in the background. When the dream reaches the door, the real door beneath {place} should feature in a chapter, and the hand-shaped lock should fit {first}'s hand exactly."]
];
const HOOK_ITEMS = ["silver chalice", "jade idol", "bronze bell", "gilded reliquary", "moonstone censer"];
function hookCtx(r, first) { return { first, place: placeName(r), place2: placeName(r), faction: "the " + r.pick(FAC_A) + " " + r.pick(FAC_N), npc: fullName(r), item: r.pick(HOOK_ITEMS) }; }
function hookBuild(hk, ctx) { return { hook: fill(hk[0], ctx), hookDetail: { story: fill(hk[1], ctx), questions: hk[2].map(q => fill(q, ctx)), use: fill(hk[3], ctx) } }; }
function hookUpgrade(c) {
  // Older characters only stored the one-line hook: rebuild the detail around the same place and faction.
  if (!c || c.hookDetail || !c.hook || !c.name) return;
  for (const hk of PC_HOOKS) {
    const parts = hk[0].split(/\{(\w+)\}/), keys = [];
    const re = new RegExp("^" + parts.map((p, i) => i % 2 ? (keys.push(p), "(.+?)") : p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("") + "$");
    const m = String(c.hook).match(re); if (!m) continue;
    const ctx = hookCtx(makeRng("pchook", c.seed || c.id), c.name.split(" ")[0]);
    keys.forEach((k, i) => ctx[k] = m[i + 1]);
    c.hookDetail = hookBuild(hk, ctx).hookDetail; return;
  }
}
/* ---- draconic ancestry, feature descriptions, custom builder data ---- */
const DRAGON_ANCESTRY = {
  Black: { type: "acid", shape: "5 by 30 ft line", save: "DEX" }, Blue: { type: "lightning", shape: "5 by 30 ft line", save: "DEX" },
  Brass: { type: "fire", shape: "5 by 30 ft line", save: "DEX" }, Bronze: { type: "lightning", shape: "5 by 30 ft line", save: "DEX" },
  Copper: { type: "acid", shape: "5 by 30 ft line", save: "DEX" }, Gold: { type: "fire", shape: "15 ft cone", save: "DEX" },
  Green: { type: "poison", shape: "15 ft cone", save: "CON" }, Red: { type: "fire", shape: "15 ft cone", save: "DEX" },
  Silver: { type: "cold", shape: "15 ft cone", save: "CON" }, White: { type: "cold", shape: "15 ft cone", save: "CON" }
};
const RACE_DESC = {
  Dwarf: "Tough mountain folk: poison resistance, darkvision, stone lore.", Elf: "Graceful and perceptive: keen senses, no need for sleep.",
  Halfling: "Small and improbably lucky: reroll natural 1s.", Human: "Adaptable and ambitious: a little better at everything.",
  Dragonborn: "Dragon-blooded: a breath weapon and elemental resistance.", Gnome: "Small and clever, with a stubborn magical mind.",
  "Half-Elf": "Charming go-betweens: two bonus skills of your choice.", "Half-Orc": "Fierce and unkillable: stays standing at 0 HP once a day.",
  Tiefling: "Infernal heritage: fire resistance and innate magic."
};
const BG_DESC = {
  Acolyte: "Raised in a temple's service: knows the rites and can find shelter among the faithful.", Charlatan: "Con artist with a forged identity always ready to slip into.",
  Criminal: "Lawbreaker with a contact in the underworld who passes messages along.", Entertainer: "Performer who earns food and a bed by playing for the crowd.",
  "Folk Hero": "Common-born champion: ordinary folk will hide and help you.", "Guild Artisan": "Trained craftsperson whose guild offers lodging, aid and influence.",
  Hermit: "Lived in seclusion and came back knowing a hidden truth.", Noble: "Born to wealth and title: high society welcomes you.",
  Outlander: "Grew up in the wilds: always finds food and the way back.", Sage: "Scholar who knows where to find the lore you lack.",
  Sailor: "Seasoned deckhand who can get free passage on a ship.", Soldier: "Former soldier whose rank still earns respect from troops.",
  Urchin: "Grew up poor on the streets: knows every shortcut through a city."
};
const CLASS_DESC = {
  Barbarian: "Raging front-line brute. d12 hit die, hits hard, shrugs off damage.", Bard: "Charismatic support caster: inspiration dice and any skill you like.",
  Cleric: "Divine full caster: heals, buffs and turns undead in medium armor.", Druid: "Nature's full caster: shapeshifts into beasts.",
  Fighter: "Weapon master: the most attacks, Action Surge, any fighting style.", Monk: "Fast unarmored striker: flurries of blows and stunning strikes.",
  Paladin: "Holy knight: smites, protective auras and healing hands in heavy armor.", Ranger: "Wilderness skirmisher: a half caster behind a longbow.",
  Rogue: "Skill expert and precision striker: Sneak Attack once a turn.", Sorcerer: "Innate full caster: reshapes spells with Metamagic.",
  Warlock: "Pact caster: few slots, always at full power, back every short rest.", Wizard: "Learned full caster: the biggest spell list, kept in a spellbook."
};
const FEAT_DESC = {
  Rage: "Bonus action: advantage on STR checks and saves, bonus melee damage, resistance to bludgeoning, piercing and slashing.",
  "Reckless Attack": "Attack with advantage, but attacks against you have advantage until your next turn.",
  "Danger Sense": "Advantage on DEX saves against effects you can see, such as traps and spells.",
  "Primal Path": "Your barbarian subclass, chosen at level 3.", "Fast Movement": "+10 ft speed while not in heavy armor.",
  "Feral Instinct": "Advantage on initiative; rage ignores surprise.", "Brutal Critical": "Roll extra weapon dice on critical hits.",
  "Relentless Rage": "While raging, a CON save can leave you at 1 HP instead of 0.", "Persistent Rage": "Your rage ends early only if you choose or fall unconscious.",
  "Indomitable Might": "A STR check can never roll below your STR score.", "Primal Champion": "+4 STR and CON; their maximums rise to 24.",
  Spellcasting: "Cast spells from your class list using spell slots. Manage them in Prepared Spells below.",
  "Bardic Inspiration": "Bonus action: give a creature a die to add to one attack roll, check or save.",
  "Jack of All Trades": "Add half your proficiency bonus to checks you aren't proficient in.",
  "Song of Rest": "Your party heals extra hit points over a short rest.", "Bard College": "Your bard subclass, chosen at level 3.",
  Expertise: "Double proficiency on chosen skills (marked ★ above).", "Font of Inspiration": "Bardic Inspiration recharges on a short rest.",
  Countercharm: "Your performance grants advantage against fear and charm.", "Magical Secrets": "Learn spells from any class's list.",
  "Superior Inspiration": "Regain an inspiration die when you roll initiative with none left.",
  "Divine Domain": "Your cleric subclass, chosen at level 1.", "Channel Divinity": "Invoke your deity directly, for example to Turn Undead.",
  "Destroy Undead": "Turned undead of low enough CR are destroyed outright.", "Divine Intervention": "A chance your deity steps in personally.",
  Druidic: "The secret language of druids.", "Wild Shape": "Transform into beasts you have seen.", "Druid Circle": "Your druid subclass, chosen at level 2.",
  "Timeless Body": "You age one year for every ten.", "Beast Spells": "Cast spells while in Wild Shape.", Archdruid: "Use Wild Shape as often as you like.",
  "Fighting Style": "A combat specialty, such as Defense (+1 AC), Archery (+2 ranged) or Dueling (+2 damage).",
  "Second Wind": "Bonus action: regain 1d10 + fighter level HP, once per rest.", "Action Surge": "Take one extra action, once per rest.",
  "Martial Archetype": "Your fighter subclass, chosen at level 3.", Indomitable: "Reroll a failed saving throw.",
  "Extra Attack": "Attack twice when you take the Attack action.", "Extra Attack (2)": "Attack three times when you take the Attack action.",
  "Extra Attack (3)": "Attack four times when you take the Attack action.",
  "Martial Arts": "Use DEX for unarmed strikes and monk weapons; unarmed strike as a bonus action.",
  Ki: "Spend ki points on Flurry of Blows, Patient Defense or Step of the Wind.", "Unarmored Movement": "Bonus speed while unarmored.",
  "Monastic Tradition": "Your monk subclass, chosen at level 3.", "Deflect Missiles": "Reaction: reduce ranged weapon damage, maybe to zero, and throw it back.",
  "Slow Fall": "Reaction: reduce falling damage by 5 × monk level.", "Stunning Strike": "Spend ki on a hit to force a CON save or stun.",
  Evasion: "On DEX saves for half damage you take none, and half even on a failure.", "Stillness of Mind": "End a charm or fear on yourself as an action.",
  "Purity of Body": "Immune to disease and poison.", "Diamond Soul": "Proficiency in every saving throw; spend ki to reroll one.",
  "Empty Body": "Spend ki to become invisible and resistant to damage.", "Perfect Self": "Regain ki when you roll initiative with none left.",
  "Divine Sense": "Sense celestials, fiends and undead nearby.", "Lay on Hands": "A healing pool of 5 × paladin level HP, back each long rest.",
  "Divine Smite": "Spend a spell slot when you hit to add radiant damage.", "Divine Health": "Immune to disease.",
  "Sacred Oath": "Your paladin subclass, chosen at level 3.", "Aura of Protection": "You and nearby allies add your CHA to saving throws.",
  "Aura of Courage": "You and nearby allies can't be frightened.", "Improved Divine Smite": "Your melee hits deal an extra 1d8 radiant.",
  "Cleansing Touch": "Action: end a spell on yourself or a willing creature.",
  "Favored Enemy": "Advantage on tracking and recalling lore about a chosen type of foe.",
  "Natural Explorer": "Expert travel and navigation in your favored terrain.", "Ranger Archetype": "Your ranger subclass, chosen at level 3.",
  "Primeval Awareness": "Spend a slot to sense aberrations, fiends, undead and more nearby.",
  "Land's Stride": "Move through difficult terrain and plants without penalty.", "Hide in Plain Sight": "Camouflage yourself for a large Stealth bonus.",
  Vanish: "Hide as a bonus action; you can't be tracked without magic.", "Feral Senses": "Fight unseen creatures without disadvantage.",
  "Foe Slayer": "Add WIS to one attack or damage roll each turn.",
  "Sneak Attack": "Once per turn, extra damage when you have advantage or an ally is next to your target.",
  "Thieves' Cant": "The secret code of the criminal underworld.", "Cunning Action": "Dash, Disengage or Hide as a bonus action.",
  "Roguish Archetype": "Your rogue subclass, chosen at level 3.", "Uncanny Dodge": "Reaction: halve the damage of one attack.",
  "Reliable Talent": "Proficient checks treat a d20 roll of 9 or lower as a 10.", Blindsense: "Know where hidden or invisible creatures are within 10 ft.",
  "Slippery Mind": "Gain proficiency in WIS saves.", Elusive: "No attack roll has advantage against you while you aren't incapacitated.",
  "Stroke of Luck": "Turn a miss into a hit, or a failed check into a 20, once per rest.",
  "Sorcerous Origin": "Your sorcerer subclass, chosen at level 1.", "Font of Magic": "Sorcery points: trade them for spell slots or fuel Metamagic.",
  Metamagic: "Bend your spells: twin them, quicken them, stretch their range.", "Sorcerous Restoration": "Regain sorcery points on a short rest.",
  "Otherworldly Patron": "Your warlock subclass — the being your pact is with.", "Pact Magic": "A few spell slots, always of your highest level, back on a short rest.",
  "Eldritch Invocations": "Permanent magical talents, such as seeing in magical darkness.",
  "Pact Boon": "A gift from your patron: a blade, a tome or a familiar.", "Mystic Arcanum": "A spell of 6th level or higher, cast once per long rest.",
  "Eldritch Master": "A minute of pleading regains all pact slots, once per day.",
  "Arcane Recovery": "Once a day, recover spell slots on a short rest.", "Arcane Tradition": "Your wizard subclass, chosen at level 2.",
  "Spell Mastery": "Cast a chosen 1st- and 2nd-level spell without spending slots.", "Signature Spells": "Two 3rd-level spells, each free once per rest.",
  "Darkvision 60 ft": "See 60 ft in dim light as if bright, and in darkness in shades of grey.",
  "Dwarven Resilience": "Advantage on saves against poison; resistance to poison damage.",
  Stonecunning: "Double proficiency on History checks about stonework.", "Keen Senses": "Proficiency in Perception.",
  "Fey Ancestry": "Advantage against charm; magic can't put you to sleep.", Trance: "Meditate 4 hours instead of sleeping 8.",
  Lucky: "Reroll natural 1s on attacks, checks and saves.", Brave: "Advantage on saves against being frightened.",
  "Halfling Nimbleness": "Move through the space of any larger creature.", "Extra language": "Speak, read and write one extra language of your choice.",
  "Gnome Cunning": "Advantage on INT, WIS and CHA saves against magic.", "Skill Versatility": "Proficiency in two skills of your choice.",
  "Relentless Endurance": "Drop to 1 HP instead of 0, once per long rest.", "Savage Attacks": "Roll an extra weapon die on melee critical hits.",
  "Hellish Resistance": "Resistance to fire damage.", "Infernal Legacy": "Thaumaturgy cantrip; later Hellish Rebuke and Darkness."
};
const SUB_DESC = {
  "Path of the Berserker": "Frenzy grants a bonus-action attack every turn while raging, at the cost of exhaustion.",
  "College of Lore": "Cutting Words saps enemy rolls; extra skills and borrowed spells.",
  "Life Domain": "Your healing is stronger and you wear heavy armor.",
  "Circle of the Land": "Natural Recovery regains slots on a short rest, plus bonus circle spells.",
  Champion: "Your weapon attacks crit on a 19 or 20.",
  "Way of the Open Hand": "Flurry of Blows can knock foes prone, shove them or deny reactions.",
  "Oath of Devotion": "Channel Divinity makes your weapon holy or turns fiends and undead.",
  Hunter: "A predator's technique, such as Colossus Slayer: +1d8 against wounded foes.",
  Thief: "Fast Hands: use objects or Sleight of Hand as a bonus action; climb like a cat.",
  "Draconic Bloodline": "Dragon scales add HP and AC; later your element hits harder.",
  "The Fiend": "Dark One's Blessing: temporary HP whenever you drop a foe.",
  "School of Evocation": "Sculpt Spells keeps allies safe inside your blasts."
};
/* ---- subclass options by rules edition: [name, short description] ---- */
const SUBCLASSES = {
  "2014": {
    Barbarian: [["Path of the Berserker", "Frenzy grants a bonus-action attack every turn while raging, at the cost of exhaustion."], ["Path of the Totem Warrior", "A spirit animal shapes your rage: bear toughness, eagle sight or wolf pack tactics."]],
    Bard: [["College of Lore", "Cutting Words saps enemy rolls; extra skills and borrowed spells."], ["College of Valor", "Medium armor, shields and martial weapons; your inspiration boosts damage and AC."]],
    Cleric: [["Knowledge Domain", "Extra languages and skills; read thoughts with Channel Divinity."], ["Life Domain", "Your healing is stronger and you wear heavy armor."], ["Light Domain", "Radiant fire spells and a flare that ruins enemy attacks."], ["Nature Domain", "Heavy armor, a druid cantrip and power over plants and beasts."], ["Tempest Domain", "Heavy armor and martial weapons; lightning and thunder hit their hardest."], ["Trickery Domain", "Illusions, duplicates and a blessing of stealth."], ["War Domain", "Heavy armor, martial weapons and bonus attacks guided by your god."]],
    Druid: [["Circle of the Land", "Natural Recovery regains slots on a short rest, plus bonus circle spells."], ["Circle of the Moon", "Wild Shape into far tougher beasts, and as a bonus action."]],
    Fighter: [["Champion", "Your weapon attacks crit on a 19 or 20."], ["Battle Master", "Superiority dice fuel combat maneuvers: trip, disarm, rally and more."], ["Eldritch Knight", "Wizard spells, mostly abjuration and evocation, alongside your sword."]],
    Monk: [["Way of the Open Hand", "Flurry of Blows can knock foes prone, shove them or deny reactions."], ["Way of Shadow", "Spend ki on darkness and silence, and step between shadows."], ["Way of the Four Elements", "Spend ki to cast elemental disciplines, from fire blasts to stone walls."]],
    Paladin: [["Oath of Devotion", "Channel Divinity makes your weapon holy or turns fiends and undead."], ["Oath of the Ancients", "Guardian of light and nature: entangling vines and a warding aura against spells."], ["Oath of Vengeance", "Vow of Enmity grants advantage against the foe you swear to bring down."]],
    Ranger: [["Hunter", "A predator's technique, such as Colossus Slayer: +1d8 against wounded foes."], ["Beast Master", "A loyal animal companion fights at your side."]],
    Rogue: [["Thief", "Fast Hands: use objects or Sleight of Hand as a bonus action; climb like a cat."], ["Assassin", "Advantage on creatures that haven't acted, and surprise attacks always crit."], ["Arcane Trickster", "Enchantment and illusion spells, and an invisible Mage Hand that picks locks."]],
    Sorcerer: [["Draconic Bloodline", "Dragon scales add HP and AC; later your element hits harder."], ["Wild Magic", "Your spells may trigger random surges; Tides of Chaos grants advantage."]],
    Warlock: [["The Archfey", "Fey Presence charms or frightens; misty escapes and beguiling defenses."], ["The Fiend", "Dark One's Blessing: temporary HP whenever you drop a foe."], ["The Great Old One", "Telepathy with any creature, and protection from mind reading."]],
    Wizard: [["School of Abjuration", "An Arcane Ward soaks damage, recharged whenever you cast protective spells."], ["School of Conjuration", "Conjure objects at will and teleport in a blink."], ["School of Divination", "Portent: roll two d20s each day and swap them in for any roll."], ["School of Enchantment", "Hypnotic Gaze and charm magic that bends minds."], ["School of Evocation", "Sculpt Spells keeps allies safe inside your blasts."], ["School of Illusion", "Malleable illusions that later become partly real."], ["School of Necromancy", "Regain HP when you kill with spells; stronger undead servants."], ["School of Transmutation", "A transmuter's stone and the power to reshape matter."]]
  },
  // 2024 Player's Handbook: every class picks its subclass at level 3
  "2024": {
    Barbarian: [["Path of the Berserker", "Frenzy adds damage to your first reckless hit each turn while raging."], ["Path of the Wild Heart", "Animal spirits: bear toughness, eagle speed or wolf pack tactics."], ["Path of the World Tree", "Vitality of the Tree grants temp HP and lets you pull allies across the battlefield."], ["Path of the Zealot", "Divine fury adds radiant or necrotic damage; you're hard to keep dead."]],
    Bard: [["College of Dance", "Unarmored dazzling footwork, and inspiration that boosts allies' initiative."], ["College of Glamour", "Fey charm: grant allies temp HP and a free move, or beguile a crowd."], ["College of Lore", "Cutting Words saps enemy rolls; extra skills and borrowed spells."], ["College of Valor", "Martial training; your inspiration boosts damage and AC."]],
    Cleric: [["Life Domain", "Your healing spells restore extra hit points."], ["Light Domain", "Radiant fire spells and a flare that ruins enemy attacks."], ["Trickery Domain", "Illusions, invisibility and a stealthy blessing."], ["War Domain", "Guided strikes and extra attacks granted by your god."]],
    Druid: [["Circle of the Land", "Spells from your chosen land and slots back on a short rest."], ["Circle of the Moon", "Wild Shape into tougher beasts and cast spells while transformed."], ["Circle of the Sea", "Wrath of the Sea: an aura of cold spray that pushes foes."], ["Circle of the Stars", "A starry form as an archer, chalice of healing or dragon."]],
    Fighter: [["Battle Master", "Superiority dice fuel combat maneuvers: trip, disarm, rally and more."], ["Champion", "Your weapon attacks crit on a 19 or 20, and you gain Heroic Inspiration."], ["Eldritch Knight", "Wizard spells alongside your sword."], ["Psi Warrior", "Psionic energy dice shield allies, shove foes and boost your blows."]],
    Monk: [["Warrior of Mercy", "Hands that harm and heal with the same strike."], ["Warrior of Shadow", "Darkness and teleporting between shadows."], ["Warrior of the Elements", "Elemental reach and damage on your strikes."], ["Warrior of the Open Hand", "Flurry of Blows can knock foes prone, push them or deny reactions."]],
    Paladin: [["Oath of Devotion", "A holy weapon and protection from charm."], ["Oath of Glory", "Athletic feats and inspiring strikes that grant temp HP."], ["Oath of the Ancients", "Nature's wrath and a warding aura against spells."], ["Oath of Vengeance", "Vow of Enmity grants advantage against your sworn foe."]],
    Ranger: [["Beast Master", "A primal beast companion fights at your command."], ["Fey Wanderer", "Fey charm: psychic damage on hits and a beguiling presence."], ["Gloom Stalker", "Ambusher in darkness: extra initiative and damage in the first round."], ["Hunter", "Hunter's Prey: Colossus Slayer or Horde Breaker, swap after a rest."]],
    Rogue: [["Arcane Trickster", "Wizard spells and an invisible Mage Hand that picks locks."], ["Assassin", "Advantage on creatures that haven't acted, and deadly opening strikes."], ["Soulknife", "Psychic blades from your mind and psionic dice for skills."], ["Thief", "Fast Hands and climbing; later use magic items you shouldn't."]],
    Sorcerer: [["Aberrant Sorcery", "Telepathy and psionic spells from an alien influence."], ["Clockwork Sorcery", "Cosmic order: cancel advantage and disadvantage, ward allies."], ["Draconic Sorcery", "Dragon scales add HP and AC; later your element hits harder."], ["Wild Magic Sorcery", "Random surges, and Tides of Chaos for advantage."]],
    Warlock: [["Archfey Patron", "Misty Step on a whim, charming and frightening as you go."], ["Celestial Patron", "Healing Light dice and radiant power."], ["Fiend Patron", "Dark One's Blessing: temporary HP whenever you drop a foe."], ["Great Old One Patron", "Telepathy and psychic spells that unsettle minds."]],
    Wizard: [["Abjurer", "An Arcane Ward soaks damage and recharges as you cast protections."], ["Diviner", "Portent: roll two d20s each day and swap them in for any roll."], ["Evoker", "Sculpt Spells keeps allies safe inside your blasts."], ["Illusionist", "Improved illusions that later become partly real."]]
  }
};
/* Subclass features by rule set: "edition|Subclass" -> [[level, feature, description], ...] */
const SUB_FEATS = {
  "2014|Path of the Berserker": [[3, "Frenzy", "When you rage you can choose to frenzy: for the rage's duration you can make one melee weapon attack as a bonus action on each of your turns after this one. When the rage ends you gain one level of exhaustion."], [6, "Mindless Rage", "You can't be charmed or frightened while raging; such effects on you are suspended for the rage."], [10, "Intimidating Presence", "Action: frighten one creature within 30 ft that can see or hear you until the end of your next turn (WIS save, DC 8 + proficiency + CHA). You can extend it each turn with your action."], [14, "Retaliation", "When a creature within 5 ft damages you, you can use your reaction to make a melee weapon attack against it."]],
  "2014|Path of the Totem Warrior": [[3, "Spirit Seeker", "You can cast beast sense and speak with animals as rituals."], [3, "Totem Spirit", "Choose a totem. Bear: while raging, resistance to all damage except psychic. Eagle: while raging, enemies have disadvantage on opportunity attacks against you and you can Dash as a bonus action. Wolf: while raging, friends have advantage on melee attacks against enemies within 5 ft of you."], [6, "Aspect of the Beast", "Bear: double carrying capacity, advantage on Strength checks to push, pull, lift or break. Eagle: see 1 mile clearly; dim light doesn't hinder Perception. Wolf: track at a fast pace and move stealthily at a normal pace."], [10, "Spirit Walker", "You can cast commune with nature as a ritual."], [14, "Totemic Attunement", "Bear: while raging, enemies within 5 ft have disadvantage on attacks against anyone but you. Eagle: while raging, you can fly at your walking speed. Wolf: while raging, a bonus action knocks a Large or smaller creature you hit prone."]],
  "2014|College of Lore": [[3, "Bonus Proficiencies", "Proficiency with three skills of your choice."], [3, "Cutting Words", "Reaction: when a creature within 60 ft that you can see makes an attack roll, ability check or damage roll, spend a Bardic Inspiration die and subtract the roll from its result."], [6, "Additional Magical Secrets", "Learn two spells of your choice from any class's spell list; they count as bard spells."], [14, "Peerless Skill", "When you make an ability check, you can spend a Bardic Inspiration die and add it to the roll."]],
  "2014|College of Valor": [[3, "Bonus Proficiencies", "Proficiency with medium armor, shields and martial weapons."], [3, "Combat Inspiration", "A creature with your Bardic Inspiration die can add it to a weapon damage roll, or use its reaction to add it to its AC against one attack."], [6, "Extra Attack", "You can attack twice when you take the Attack action."], [14, "Battle Magic", "When you use your action to cast a bard spell, you can make one weapon attack as a bonus action."]],
  "2014|Knowledge Domain": [[1, "Domain Spells", "Extra spells always prepared at cleric levels 1, 3, 5, 7 and 9 (such as command and identify at 1st)."], [1, "Blessings of Knowledge", "Learn two languages, and gain proficiency and expertise in two of Arcana, History, Nature or Religion."], [2, "Channel Divinity: Knowledge of the Ages", "Action: gain proficiency with one skill or tool for 10 minutes."], [6, "Channel Divinity: Read Thoughts", "Action: a creature within 60 ft makes a WIS save; on a failure you read its surface thoughts for 1 minute and can cast suggestion on it without a slot."], [8, "Potent Spellcasting", "Add your Wisdom modifier to the damage of your cleric cantrips."], [17, "Visions of the Past", "Meditate to see recent visions about an object you hold or the area around you."]],
  "2014|Life Domain": [[1, "Domain Spells", "Extra spells always prepared at cleric levels 1, 3, 5, 7 and 9 (bless and cure wounds at 1st)."], [1, "Bonus Proficiency", "Proficiency with heavy armor."], [1, "Disciple of Life", "Your healing spells of 1st level or higher restore an extra 2 + the spell's level hit points."], [2, "Channel Divinity: Preserve Life", "Action: restore hit points equal to five times your cleric level, split among creatures within 30 ft, but no creature above half its maximum."], [6, "Blessed Healer", "When you heal another creature with a spell of 1st level or higher, you regain 2 + the spell's level hit points."], [8, "Divine Strike", "Once per turn, a weapon hit deals an extra 1d8 radiant damage (2d8 at 14th level)."], [17, "Supreme Healing", "When you would roll dice to restore hit points with a spell, use the highest number possible for each die."]],
  "2014|Light Domain": [[1, "Domain Spells", "Extra spells always prepared at cleric levels 1, 3, 5, 7 and 9 (burning hands and faerie fire at 1st)."], [1, "Bonus Cantrip", "You learn the light cantrip."], [1, "Warding Flare", "Reaction: impose disadvantage on an attack against you from a creature within 30 ft you can see. Uses equal to your Wisdom modifier per long rest."], [2, "Channel Divinity: Radiance of the Dawn", "Action: dispel magical darkness within 30 ft; hostile creatures there take 2d10 + cleric level radiant damage (CON save for half)."], [6, "Improved Flare", "You can use Warding Flare when a creature attacks an ally within 30 ft of you."], [8, "Potent Spellcasting", "Add your Wisdom modifier to the damage of your cleric cantrips."], [17, "Corona of Light", "Action: emit bright light for 1 minute; enemies in it have disadvantage on saves against fire and radiant spells."]],
  "2014|Nature Domain": [[1, "Domain Spells", "Extra spells always prepared at cleric levels 1, 3, 5, 7 and 9 (animal friendship and speak with animals at 1st)."], [1, "Acolyte of Nature", "Learn one druid cantrip and gain proficiency in Animal Handling, Nature or Survival."], [1, "Bonus Proficiency", "Proficiency with heavy armor."], [2, "Channel Divinity: Charm Animals and Plants", "Action: beasts and plant creatures within 30 ft make a WIS save or are charmed by you for 1 minute."], [6, "Dampen Elements", "Reaction: give yourself or a creature within 30 ft resistance to an instance of acid, cold, fire, lightning or thunder damage."], [8, "Divine Strike", "Once per turn, a weapon hit deals an extra 1d8 cold, fire or lightning damage (2d8 at 14th level)."], [17, "Master of Nature", "Bonus action: command creatures charmed by your Charm Animals and Plants."]],
  "2014|Tempest Domain": [[1, "Domain Spells", "Extra spells always prepared at cleric levels 1, 3, 5, 7 and 9 (fog cloud and thunderwave at 1st)."], [1, "Bonus Proficiencies", "Proficiency with martial weapons and heavy armor."], [1, "Wrath of the Storm", "Reaction: when a creature within 5 ft hits you, it takes 2d8 lightning or thunder damage (DEX save for half). Uses equal to your Wisdom modifier per long rest."], [2, "Channel Divinity: Destructive Wrath", "When you roll lightning or thunder damage, deal maximum damage instead of rolling."], [6, "Thunderbolt Strike", "When you deal lightning damage to a Large or smaller creature, you can push it up to 10 ft away."], [8, "Divine Strike", "Once per turn, a weapon hit deals an extra 1d8 thunder damage (2d8 at 14th level)."], [17, "Stormborn", "You have a flying speed equal to your walking speed when not underground or indoors."]],
  "2014|Trickery Domain": [[1, "Domain Spells", "Extra spells always prepared at cleric levels 1, 3, 5, 7 and 9 (charm person and disguise self at 1st)."], [1, "Blessing of the Trickster", "Action: a willing creature you touch has advantage on Stealth checks for 1 hour."], [2, "Channel Divinity: Invoke Duplicity", "Action: create an illusory duplicate for 1 minute (concentration). Cast spells from its space, and gain advantage on attacks against creatures within 5 ft of both of you."], [6, "Channel Divinity: Cloak of Shadows", "Action: become invisible until the end of your next turn, or until you attack or cast a spell."], [8, "Divine Strike", "Once per turn, a weapon hit deals an extra 1d8 poison damage (2d8 at 14th level)."], [17, "Improved Duplicity", "You can create up to four duplicates with Invoke Duplicity."]],
  "2014|War Domain": [[1, "Domain Spells", "Extra spells always prepared at cleric levels 1, 3, 5, 7 and 9 (divine favor and shield of faith at 1st)."], [1, "Bonus Proficiencies", "Proficiency with martial weapons and heavy armor."], [1, "War Priest", "When you take the Attack action, you can make one weapon attack as a bonus action. Uses equal to your Wisdom modifier per long rest."], [2, "Channel Divinity: Guided Strike", "Add +10 to an attack roll after seeing the roll, before knowing whether it hits."], [6, "Channel Divinity: War God's Blessing", "Reaction: give +10 to an attack roll made by a creature within 30 ft."], [8, "Divine Strike", "Once per turn, a weapon hit deals an extra 1d8 damage of the weapon's type (2d8 at 14th level)."], [17, "Avatar of Battle", "Resistance to bludgeoning, piercing and slashing damage from nonmagical weapons."]],
  "2014|Circle of the Land": [[2, "Bonus Cantrip", "You learn one extra druid cantrip."], [2, "Natural Recovery", "Once per day during a short rest, recover spell slots with a combined level up to half your druid level (rounded up), none 6th level or higher."], [3, "Circle Spells", "Your chosen land (arctic, coast, desert, forest, grassland, mountain, swamp or Underdark) gives extra spells always prepared at druid levels 3, 5, 7 and 9."], [6, "Land's Stride", "Nonmagical difficult terrain costs no extra movement, plants don't slow or harm you, and you have advantage on saves against magical plants."], [10, "Nature's Ward", "You can't be charmed or frightened by elementals or fey, and you are immune to poison and disease."], [14, "Nature's Sanctuary", "Beasts and plants must make a WIS save to attack you; on a failure they must choose another target."]],
  "2014|Circle of the Moon": [[2, "Combat Wild Shape", "Wild Shape as a bonus action. While transformed, spend a spell slot as a bonus action to regain 1d8 hit points per slot level."], [2, "Circle Forms", "Wild Shape into beasts up to CR 1 (no flying or swimming until the usual levels); from 6th level, up to CR equal to your druid level divided by 3."], [6, "Primal Strike", "Your attacks in beast form count as magical."], [10, "Elemental Wild Shape", "Spend two uses of Wild Shape to become an air, earth, fire or water elemental."], [14, "Thousand Forms", "You can cast alter self at will."]],
  "2014|Champion": [[3, "Improved Critical", "Your weapon attacks score a critical hit on a roll of 19 or 20."], [7, "Remarkable Athlete", "Add half your proficiency bonus to Strength, Dexterity and Constitution checks you aren't proficient in; running long jumps go farther."], [10, "Additional Fighting Style", "Choose a second Fighting Style option."], [15, "Superior Critical", "Your weapon attacks score a critical hit on a roll of 18–20."], [18, "Survivor", "At the start of each turn, if you have no more than half your hit points left (and at least 1), regain 5 + Constitution modifier hit points."]],
  "2014|Battle Master": [[3, "Combat Superiority", "You learn three maneuvers and have four superiority dice (d8). Spend a die to use a maneuver such as Trip Attack, Riposte, Precision Attack or Disarming Attack. Saves use DC 8 + proficiency + STR or DEX. Dice return on a short or long rest."], [3, "Student of War", "Proficiency with one type of artisan's tools."], [7, "Know Your Enemy", "Study a creature for 1 minute to learn whether it is your equal, superior or inferior in two characteristics."], [7, "Improved Combat Superiority", "Your superiority dice become d10s (d12 at 18th level). You gain a fifth die at 7th level and a sixth at 15th, and more maneuvers at 7th, 10th and 15th."], [15, "Relentless", "When you roll initiative with no superiority dice left, you regain one."]],
  "2014|Eldritch Knight": [[3, "Spellcasting", "You learn wizard cantrips and spells (mostly abjuration and evocation), cast with Intelligence, using a third-caster slot progression."], [3, "Weapon Bond", "Bond with up to two weapons: they can't be disarmed from you, and you can summon one to your hand as a bonus action."], [7, "War Magic", "When you cast a cantrip with your action, you can make one weapon attack as a bonus action."], [10, "Eldritch Strike", "A creature you hit with a weapon has disadvantage on its next save against a spell you cast before the end of your next turn."], [15, "Arcane Charge", "When you use Action Surge, you can teleport up to 30 ft."], [18, "Improved War Magic", "When you cast a spell with your action, you can make one weapon attack as a bonus action."]],
  "2014|Way of the Open Hand": [[3, "Open Hand Technique", "When you hit with Flurry of Blows, the target must succeed on a DEX save or be knocked prone, make a STR save or be pushed 15 ft, or can't take reactions until the end of your next turn."], [6, "Wholeness of Body", "Action: regain hit points equal to three times your monk level, once per long rest."], [11, "Tranquility", "At the end of a long rest you gain the effect of sanctuary until your next long rest."], [17, "Quivering Palm", "Spend 3 ki points when you hit to set vibrations in the target; later, as an action, it makes a CON save or drops to 0 hit points (10d10 necrotic on a success)."]],
  "2014|Way of Shadow": [[3, "Shadow Arts", "Spend 2 ki points to cast darkness, darkvision, pass without trace or silence. You also learn minor illusion."], [6, "Shadow Step", "Bonus action: teleport up to 60 ft from dim light or darkness to dim light or darkness, gaining advantage on your first melee attack before the end of the turn."], [11, "Cloak of Shadows", "Action: become invisible while in dim light or darkness, until you attack, cast a spell or enter bright light."], [17, "Opportunist", "Reaction: when a creature within 5 ft is hit by an attack from someone else, make a melee attack against it."]],
  "2014|Way of the Four Elements": [[3, "Disciple of the Elements", "Learn elemental disciplines that cost ki to use, such as Fangs of the Fire Snake, Water Whip or Fist of Unbroken Air. More at 6th, 11th and 17th level."], [3, "Elemental Attunement", "Use your action to create minor elemental effects."], [6, "Additional Discipline (6th level)", "Learn another elemental discipline, such as Rush of the Gale Spirits or Clench of the North Wind."], [11, "Additional Discipline (11th level)", "Learn another elemental discipline, and you can spend more ki on disciplines that cast spells."], [17, "Additional Discipline (17th level)", "Learn another elemental discipline, such as Breath of Winter or Wave of Rolling Earth."]],
  "2014|Oath of Devotion": [[3, "Oath Spells", "Extra spells always prepared at paladin levels 3, 5, 9, 13 and 17 (protection from evil and good and sanctuary at 3rd)."], [3, "Channel Divinity: Sacred Weapon", "Action: for 1 minute add your Charisma modifier to attack rolls with one weapon, which also sheds light and counts as magical."], [3, "Channel Divinity: Turn the Unholy", "Action: fiends and undead within 30 ft make a WIS save or are turned for 1 minute."], [7, "Aura of Devotion", "You and allies within 10 ft (30 ft at 18th level) can't be charmed while you are conscious."], [15, "Purity of Spirit", "You are always under the effect of protection from evil and good."], [20, "Holy Nimbus", "Action: for 1 minute, emit bright light; enemies starting a turn in it take 10 radiant damage, and you have advantage on saves against fiend and undead spells. Once per long rest."]],
  "2014|Oath of the Ancients": [[3, "Oath Spells", "Extra spells always prepared at paladin levels 3, 5, 9, 13 and 17 (ensnaring strike and speak with animals at 3rd)."], [3, "Channel Divinity: Nature's Wrath", "Action: spectral vines restrain a creature within 10 ft (STR or DEX save to escape)."], [3, "Channel Divinity: Turn the Faithless", "Action: fey and fiends within 30 ft make a WIS save or are turned for 1 minute."], [7, "Aura of Warding", "You and allies within 10 ft (30 ft at 18th level) have resistance to damage from spells."], [15, "Undying Sentinel", "When reduced to 0 hit points and not killed outright, drop to 1 instead, once per long rest. You no longer suffer the drawbacks of old age."], [20, "Elder Champion", "Action: transform for 1 minute — regain 10 hit points each turn, cast paladin spells as a bonus action, and enemies within 10 ft have disadvantage on saves against your spells and Channel Divinity. Once per long rest."]],
  "2014|Oath of Vengeance": [[3, "Oath Spells", "Extra spells always prepared at paladin levels 3, 5, 9, 13 and 17 (bane and hunter's mark at 3rd)."], [3, "Channel Divinity: Abjure Enemy", "Action: one creature within 60 ft makes a WIS save or is frightened, with speed 0, for 1 minute."], [3, "Channel Divinity: Vow of Enmity", "Bonus action: gain advantage on attack rolls against one creature within 10 ft for 1 minute."], [7, "Relentless Avenger", "When you hit a creature with an opportunity attack, you can move up to half your speed without provoking opportunity attacks."], [15, "Soul of Vengeance", "Reaction: when the target of your Vow of Enmity attacks, make a melee weapon attack against it."], [20, "Avenging Angel", "Action: for 1 hour gain a 60 ft flying speed and a frightening aura. Once per long rest."]],
  "2014|Hunter": [[3, "Hunter's Prey", "Choose Colossus Slayer (+1d8 once per turn against a wounded creature), Giant Killer (reaction attack against a Large or larger creature that attacks you) or Horde Breaker (one extra attack against another creature next to your target)."], [7, "Defensive Tactics", "Choose Escape the Horde, Multiattack Defense or Steel Will."], [11, "Multiattack", "Choose Volley (ranged attack against every creature within 10 ft of a point) or Whirlwind Attack (melee attack against every creature within 5 ft)."], [15, "Superior Hunter's Defense", "Choose Evasion, Stand Against the Tide or Uncanny Dodge."]],
  "2014|Beast Master": [[3, "Ranger's Companion", "Gain a beast companion of CR 1/4 or lower. It obeys your commands, acts on your turn, and adds your proficiency bonus to its AC, attacks, damage and proficient saves and skills."], [7, "Exceptional Training", "Your companion can Dash, Disengage, Dodge or Help as a bonus action, and its attacks count as magical."], [11, "Bestial Fury", "Your companion can make two attacks when you command it to attack."], [15, "Share Spells", "A spell you cast on yourself can also affect your companion within 30 ft."]],
  "2014|Thief": [[3, "Fast Hands", "Use Cunning Action to make a Sleight of Hand check, use thieves' tools, or take the Use an Object action."], [3, "Second-Story Work", "Climbing costs no extra movement, and your running jumps go farther by your Dexterity modifier in feet."], [9, "Supreme Sneak", "Advantage on Stealth checks if you move no more than half your speed on a turn."], [13, "Use Magic Device", "Ignore class, race and level requirements on the use of magic items."], [17, "Thief's Reflexes", "Take two turns during the first round of combat."]],
  "2014|Assassin": [[3, "Bonus Proficiencies", "Proficiency with the disguise kit and poisoner's kit."], [3, "Assassinate", "Advantage on attacks against creatures that haven't taken a turn yet, and any hit against a surprised creature is a critical hit."], [9, "Infiltration Expertise", "Spend days and money to build an unbreakable false identity."], [13, "Impostor", "After 3 hours of study, mimic another person's speech, writing and behavior."], [17, "Death Strike", "When you hit a surprised creature, it makes a CON save or takes double damage."]],
  "2014|Arcane Trickster": [[3, "Spellcasting", "You learn wizard cantrips and spells (mostly enchantment and illusion), cast with Intelligence, using a third-caster slot progression."], [3, "Mage Hand Legerdemain", "Your mage hand is invisible and can stow or retrieve objects, pick locks and disarm traps; control it with Cunning Action."], [9, "Magical Ambush", "If you are hidden when you cast a spell, the target has disadvantage on saves against it."], [13, "Versatile Trickster", "Bonus action: use your mage hand to gain advantage on attacks against a creature within 5 ft of it."], [17, "Spell Thief", "Reaction: when a creature casts a spell targeting you, force an INT save to negate it and steal the spell for 8 hours."]],
  "2014|Draconic Bloodline": [[1, "Dragon Ancestor", "Choose a dragon type, which sets your damage type. You speak Draconic and double your proficiency on CHA checks with dragons."], [1, "Draconic Resilience", "Your hit point maximum rises by 1 per sorcerer level, and without armor your AC is 13 + Dexterity modifier."], [6, "Elemental Affinity", "Add your Charisma modifier to one damage roll of a spell of your ancestry's damage type, and spend 1 sorcery point for resistance to it for 1 hour."], [14, "Dragon Wings", "Bonus action: sprout wings and gain a flying speed equal to your speed."], [18, "Draconic Presence", "Spend 5 sorcery points to emit a 60 ft aura of awe or fear for 1 minute (WIS save)."]],
  "2014|Wild Magic": [[1, "Wild Magic Surge", "After casting a sorcerer spell of 1st level or higher, the DM can have you roll a d20; on a 1, roll on the Wild Magic Surge table."], [1, "Tides of Chaos", "Gain advantage on one attack, check or save; regained on a long rest or when a surge happens."], [6, "Bend Luck", "Reaction: spend 2 sorcery points to add or subtract 1d4 from another creature's attack, check or save."], [14, "Controlled Chaos", "When you roll on the Wild Magic Surge table, roll twice and choose."], [18, "Spell Bombardment", "When you roll maximum on a damage die for a spell, roll it again and add it, once per turn."]],
  "2014|The Archfey": [[1, "Expanded Spell List", "Extra warlock spells available: faerie fire and sleep at 1st, then more at 3rd, 5th, 7th and 9th level."], [1, "Fey Presence", "Action: creatures in a 10 ft cube make a WIS save or are charmed or frightened until the end of your next turn. Once per short or long rest."], [6, "Misty Escape", "Reaction: when you take damage, turn invisible and teleport up to 60 ft. Once per short or long rest."], [10, "Beguiling Defenses", "Immune to being charmed; reaction to turn a charm attempt back on its caster."], [14, "Dark Delirium", "Action: a creature within 60 ft makes a WIS save or is charmed or frightened in an illusory realm for 1 minute. Once per short or long rest."]],
  "2014|The Fiend": [[1, "Expanded Spell List", "Extra warlock spells available: burning hands and command at 1st, then more at 3rd, 5th, 7th and 9th level."], [1, "Dark One's Blessing", "When you reduce a hostile creature to 0 hit points, gain temporary hit points equal to your Charisma modifier + warlock level."], [6, "Dark One's Own Luck", "Add a d10 to an ability check or saving throw, once per short or long rest."], [10, "Fiendish Resilience", "After a rest, choose a damage type to resist until you choose another (not from magical or silvered weapons)."], [14, "Hurl Through Hell", "When you hit a creature, send it through the lower planes; it takes 10d10 psychic damage if not a fiend. Once per long rest."]],
  "2014|The Great Old One": [[1, "Expanded Spell List", "Extra warlock spells available: dissonant whispers and Tasha's hideous laughter at 1st, then more at 3rd, 5th, 7th and 9th level."], [1, "Awakened Mind", "Speak telepathically to any creature within 30 ft that understands a language."], [6, "Entropic Ward", "Reaction: impose disadvantage on an attack against you; if it misses, you gain advantage on your next attack against the attacker. Once per short or long rest."], [10, "Thought Shield", "Your thoughts can't be read, you resist psychic damage, and a creature that deals psychic damage to you takes the same amount."], [14, "Create Thrall", "Action: touch an incapacitated humanoid to charm it permanently and communicate telepathically."]],
  "2014|School of Abjuration": [[2, "Abjuration Savant", "Copying abjuration spells into your spellbook takes half the gold and time."], [2, "Arcane Ward", "When you cast an abjuration spell of 1st level or higher, create a ward with hit points equal to twice your wizard level + INT modifier that absorbs damage you take. Casting more abjuration spells restores it."], [6, "Projected Ward", "Reaction: your Arcane Ward absorbs damage for a creature within 30 ft."], [10, "Improved Abjuration", "Add your proficiency bonus to ability checks made as part of an abjuration spell, such as counterspell and dispel magic."], [14, "Spell Resistance", "Advantage on saves against spells, and resistance to spell damage."]],
  "2014|School of Conjuration": [[2, "Conjuration Savant", "Copying conjuration spells into your spellbook takes half the gold and time."], [2, "Minor Conjuration", "Action: conjure a nonmagical object up to 3 ft on a side and 10 lb, lasting 1 hour."], [6, "Benign Transposition", "Action: teleport up to 30 ft, or swap places with a willing Small or Medium creature. Recharges on a long rest or when you cast a conjuration spell."], [10, "Focused Conjuration", "Damage can't break your concentration on conjuration spells."], [14, "Durable Summons", "Creatures you summon or create with a conjuration spell have 30 temporary hit points."]],
  "2014|School of Divination": [[2, "Divination Savant", "Copying divination spells into your spellbook takes half the gold and time."], [2, "Portent", "After a long rest roll two d20s (three at 14th level). Replace any attack, check or save made by you or a creature you can see with one of them."], [6, "Expert Divination", "When you cast a divination spell of 2nd level or higher, regain a lower-level spell slot."], [10, "The Third Eye", "Action: gain darkvision, ethereal sight, the ability to read any language, or see invisibility until your next rest."], [14, "Greater Portent", "Roll three d20s for Portent instead of two."]],
  "2014|School of Enchantment": [[2, "Enchantment Savant", "Copying enchantment spells into your spellbook takes half the gold and time."], [2, "Hypnotic Gaze", "Action: a creature within 5 ft makes a WIS save or is charmed and incapacitated while you maintain the gaze."], [6, "Instinctive Charm", "Reaction: redirect an attack against you to another creature (WIS save)."], [10, "Split Enchantment", "Enchantment spells that target one creature can target a second."], [14, "Alter Memories", "A creature you charm doesn't remember being charmed, and can forget hours of time."]],
  "2014|School of Evocation": [[2, "Evocation Savant", "Copying evocation spells into your spellbook takes half the gold and time."], [2, "Sculpt Spells", "When you cast an evocation spell, choose up to 1 + the spell's level creatures; they automatically succeed on the save and take no damage."], [6, "Potent Cantrip", "Creatures that succeed on a save against your cantrips take half damage."], [10, "Empowered Evocation", "Add your Intelligence modifier to one damage roll of any wizard evocation spell."], [14, "Overchannel", "Deal maximum damage with a wizard spell of 5th level or lower; repeated use before a long rest damages you."]],
  "2014|School of Illusion": [[2, "Illusion Savant", "Copying illusion spells into your spellbook takes half the gold and time."], [2, "Improved Minor Illusion", "You learn minor illusion, and can create both a sound and an image with one casting."], [6, "Malleable Illusions", "Action: change the nature of an illusion spell you cast with a duration of 1 minute or longer."], [10, "Illusory Self", "Reaction: an illusory duplicate makes an attack against you miss. Once per short or long rest."], [14, "Illusory Reality", "Bonus action: make one inanimate object in your illusion real for 1 minute."]],
  "2014|School of Necromancy": [[2, "Necromancy Savant", "Copying necromancy spells into your spellbook takes half the gold and time."], [2, "Grim Harvest", "When you kill a creature with a spell of 1st level or higher, regain hit points equal to twice the spell's level (three times for necromancy)."], [6, "Undead Thralls", "Animate dead raises one extra undead, and your undead gain extra hit points equal to your wizard level and add your proficiency bonus to weapon damage."], [10, "Inured to Undeath", "Resistance to necrotic damage, and your hit point maximum can't be reduced."], [14, "Command Undead", "Action: an undead within 60 ft makes a CHA save or becomes friendly and obeys you."]],
  "2014|School of Transmutation": [[2, "Transmutation Savant", "Copying transmutation spells into your spellbook takes half the gold and time."], [2, "Minor Alchemy", "Spend 10 minutes to transform one material object into another (wood, stone, iron, copper or silver) for 1 hour."], [6, "Transmuter's Stone", "Create a stone that grants darkvision, +10 ft speed, proficiency in Constitution saves, or resistance to one element."], [10, "Shapechanger", "Cast polymorph on yourself without a slot to become a beast of CR 1 or lower, once per short or long rest."], [14, "Master Transmuter", "Destroy your stone to transmute an object, cure all ailments, cast raise dead, or reduce a creature's apparent age."]],
  "2024|Path of the Berserker": [[3, "Frenzy", "While raging, if you use Reckless Attack, the first target you hit with a Strength attack takes extra damage: a number of d6s equal to your Rage Damage bonus."], [6, "Mindless Rage", "Immunity to being charmed or frightened while raging; entering a rage ends those effects on you."], [10, "Retaliation", "When a creature within 5 ft damages you, you can use your reaction to make a melee attack against it."], [14, "Intimidating Presence", "Bonus action: creatures of your choice in a 30 ft emanation make a WIS save (DC 8 + STR + proficiency) or are frightened for 1 minute. Once per long rest, or spend a rage use to do it again."]],
  "2024|Path of the Wild Heart": [[3, "Animal Speaker", "You can cast beast sense and speak with animals as rituals."], [3, "Rage of the Wilds", "When you rage, choose Bear (resistance to all damage except force, necrotic, psychic and radiant), Eagle (Dash and Disengage as part of the bonus action, then as a bonus action each turn) or Wolf (allies have advantage on attacks against enemies within 5 ft of you)."], [6, "Aspect of the Wilds", "Choose Owl (60 ft darkvision), Panther (climb speed) or Salmon (swim speed); you can change it on a long rest."], [10, "Nature Speaker", "You can cast commune with nature as a ritual."], [14, "Power of the Wilds", "When you rage, choose Falcon (fly at your speed), Lion (enemies within 5 ft have disadvantage attacking anyone else) or Ram (knock a Large or smaller creature prone when you hit it)."]],
  "2024|Path of the World Tree": [[3, "Vitality of the Tree", "When you rage, gain temporary hit points equal to your barbarian level. While raging, at the start of each turn give an ally within 10 ft temporary hit points equal to a number of d6s equal to your Rage Damage bonus."], [6, "Branches of the Tree", "Reaction while raging: a creature within 30 ft makes a STR save or is teleported next to you, and its speed becomes 0 until the end of the turn."], [10, "Battering Roots", "Your reach with Heavy or Versatile melee weapons grows by 10 ft, and you can apply the Push or Topple mastery with them in addition to their own."], [14, "Travel Along the Tree", "When you rage, and as a bonus action while raging, teleport up to 60 ft. Once per rage, teleport up to 150 ft and bring up to six willing creatures."]],
  "2024|Path of the Zealot": [[3, "Divine Fury", "While raging, the first creature you hit on each turn takes extra 1d6 + half your barbarian level necrotic or radiant damage."], [3, "Warrior of the Gods", "You have a pool of four d12s (more at higher levels) to spend as a bonus action to heal yourself. The pool refills on a long rest."], [6, "Fanatical Focus", "Once per active rage, reroll a failed saving throw with a bonus equal to your Rage Damage bonus."], [10, "Zealous Presence", "Bonus action: up to ten creatures within 60 ft gain advantage on attacks and saves until your next turn. Once per long rest, or spend a rage use."], [14, "Rage of the Gods", "When you rage, take divine form for 1 minute: a 60 ft flying speed, resistance to necrotic, psychic and radiant damage, and you can spend a rage use to keep an ally from dropping to 0 hit points."]],
  "2024|College of Dance": [[3, "Dazzling Footwork", "While unarmored and without a shield: advantage on Performance checks, AC 10 + DEX + CHA, Unarmed Strikes using DEX that deal a Bardic Inspiration die + DEX bludgeoning, and when you spend Bardic Inspiration you can make an Unarmed Strike as part of it."], [6, "Inspiring Movement", "Reaction: when an enemy ends its turn within 5 ft, spend a Bardic Inspiration die to move half your speed, and an ally within 30 ft can move half theirs, without provoking opportunity attacks."], [6, "Tandem Footwork", "When you roll initiative, spend a Bardic Inspiration die to add it to your initiative and that of allies within 30 ft."], [14, "Leading Evasion", "Evasion for you, and allies within 5 ft can share it when making the same DEX save."]],
  "2024|College of Glamour": [[3, "Beguiling Magic", "You always have charm person and mirror image prepared. After casting an enchantment or illusion spell, a creature within 60 ft makes a WIS save or is charmed or frightened for 1 minute. Once per long rest, or spend a Bardic Inspiration die."], [3, "Mantle of Inspiration", "Bonus action: spend a Bardic Inspiration die; allies within 60 ft gain temporary hit points of twice the die roll and can use their reaction to move their speed without provoking opportunity attacks."], [6, "Mantle of Majesty", "You always have command prepared. Bonus action: cast it without a slot and cast it again as a bonus action each turn for 1 minute (concentration). Once per long rest, or spend a 3rd-level slot."], [14, "Unbreakable Majesty", "Bonus action: for 1 minute, a creature that attacks you must make a CHA save or pick a new target. Once per short or long rest."]],
  "2024|College of Lore": [[3, "Bonus Proficiencies", "Proficiency with three skills of your choice."], [3, "Cutting Words", "Reaction: when a creature within 60 ft makes a damage roll or succeeds on an ability check or attack roll, spend a Bardic Inspiration die and subtract the roll."], [6, "Magical Discoveries", "Learn two spells of your choice from the cleric, druid or wizard list; they count as bard spells and are always prepared."], [14, "Peerless Skill", "When you make an ability check or attack roll and fail, you can spend a Bardic Inspiration die and add it, possibly turning it into a success. The die isn't spent if you still fail."]],
  "2024|College of Valor": [[3, "Combat Inspiration", "A creature with your Bardic Inspiration die can add it to its AC against one attack as a reaction, or to the damage of a weapon or Unarmed Strike hit."], [3, "Martial Training", "Proficiency with martial weapons, medium armor and shields, and you can use a simple or martial weapon as a spellcasting focus."], [6, "Extra Attack", "You can attack twice when you take the Attack action, and replace one of the attacks with casting a cantrip that takes an action."], [14, "Battle Magic", "After you cast a spell that takes an action, you can make one weapon attack as a bonus action."]],
  "2024|Life Domain": [[3, "Disciple of Life", "Your healing spells of 1st level or higher restore an extra 2 + the slot's level hit points."], [3, "Life Domain Spells", "Extra spells always prepared at cleric levels 3, 5, 7 and 9 (aid, bless, cure wounds and lesser restoration at 3rd)."], [3, "Preserve Life", "Channel Divinity, magic action: restore hit points equal to five times your cleric level, split among creatures within 30 ft, but none above half its maximum."], [6, "Blessed Healer", "When you heal another creature with a spell slot, you regain 2 + the slot's level hit points."], [17, "Supreme Healing", "When you roll dice to restore hit points with a spell or Channel Divinity, use the highest number possible for each die."]],
  "2024|Light Domain": [[3, "Light Domain Spells", "Extra spells always prepared at cleric levels 3, 5, 7 and 9 (burning hands, faerie fire, scorching ray and see invisibility at 3rd)."], [3, "Radiance of the Dawn", "Channel Divinity, magic action: dispel magical darkness within 30 ft; creatures you choose there take 2d10 + cleric level radiant damage (CON save for half)."], [3, "Warding Flare", "Reaction: impose disadvantage on an attack roll against a creature within 30 ft. Uses equal to your Wisdom modifier per long rest."], [6, "Improved Warding Flare", "Warding Flare recharges on a short rest too, and the target also gains 2d6 + Wisdom modifier temporary hit points."], [17, "Corona of Light", "Magic action: emit sunlight for 1 minute; enemies in it have disadvantage on saves against your Radiance of the Dawn and fire or radiant spells."]],
  "2024|Trickery Domain": [[3, "Blessing of the Trickster", "Magic action: you or a willing creature within 30 ft has advantage on Stealth checks until your next long rest."], [3, "Invoke Duplicity", "Channel Divinity, bonus action: create an illusion of yourself for 1 minute. Cast spells from its space, gain advantage on attacks against creatures within 5 ft of it, and move it as a bonus action."], [3, "Trickery Domain Spells", "Extra spells always prepared at cleric levels 3, 5, 7 and 9 (charm person, disguise self, invisibility and pass without trace at 3rd)."], [6, "Trickster's Transposition", "When you create or move your duplicate, you can teleport to swap places with it."], [17, "Improved Duplicity", "You and allies have advantage on attacks against creatures within 5 ft of the duplicate, and when it ends you or an ally within 5 ft regains hit points equal to your cleric level."]],
  "2024|War Domain": [[3, "Guided Strike", "Channel Divinity: when you or a creature within 30 ft misses an attack, add +10 to the roll."], [3, "War Domain Spells", "Extra spells always prepared at cleric levels 3, 5, 7 and 9 (guiding bolt, magic weapon, shield of faith and spiritual weapon at 3rd)."], [3, "War Priest", "Bonus action: make one weapon or Unarmed Strike attack. Uses equal to your Wisdom modifier per short or long rest."], [6, "War God's Blessing", "Spend a Channel Divinity use to cast shield of faith or spiritual weapon without a slot, without concentration, for 1 minute."], [17, "Avatar of Battle", "Resistance to bludgeoning, piercing and slashing damage."]],
  "2024|Circle of the Land": [[3, "Circle of the Land Spells", "Choose arid, polar, temperate or tropical land after each long rest; it gives extra spells always prepared at druid levels 3, 5, 7 and 9."], [3, "Land's Aid", "Magic action: spend a Wild Shape use; creatures of your choice in a 10 ft sphere within 60 ft make a CON save or take 2d6 necrotic damage, and one creature there regains 2d6 hit points (more dice at higher levels)."], [6, "Natural Recovery", "Once per long rest, cast one of your circle spells without a slot, and once per long rest recover slots with a combined level up to half your druid level during a short rest."], [10, "Nature's Ward", "Immunity to the poisoned condition, and resistance to a damage type set by your current land."], [14, "Nature's Sanctuary", "Magic action: spend a Wild Shape use to create spectral trees in a 15 ft cube that give you and allies half cover and resistance for 1 minute."]],
  "2024|Circle of the Moon": [[3, "Circle Forms", "Wild Shape into beasts up to CR equal to your druid level divided by 3 (minimum 1). Your AC in beast form is at least 13 + Wisdom modifier, and you gain temporary hit points of three times your druid level."], [3, "Circle of the Moon Spells", "Extra spells always prepared at druid levels 3, 5, 7 and 9 (cure wounds, moonbeam and starry wisp at 3rd), and you can cast them in beast form."], [6, "Improved Circle Forms", "In beast form your attacks can deal radiant damage, and you add your Wisdom modifier to Constitution saving throws."], [10, "Moonlight Step", "Bonus action: teleport up to 30 ft and gain advantage on your next attack this turn. Uses equal to your Wisdom modifier per long rest, or spend a slot."], [14, "Lunar Form", "Once per turn in beast form, add 2d10 radiant damage to a hit, and Moonlight Step can bring a willing creature along."]],
  "2024|Circle of the Sea": [[3, "Circle of the Sea Spells", "Extra spells always prepared at druid levels 3, 5, 7 and 9 (fog cloud, gust of wind, ray of frost, shatter and thunderwave at 3rd)."], [3, "Wrath of the Sea", "Bonus action: spend a Wild Shape use to create a 5 ft ocean-spray emanation for 10 minutes. As a bonus action, one creature in it makes a CON save or takes a number of d6s equal to your Wisdom modifier in cold damage and is pushed 15 ft."], [6, "Aquatic Affinity", "The emanation grows to 10 ft, and you gain a swim speed equal to your speed."], [10, "Stormborn", "While Wrath of the Sea is active: a flying speed, and resistance to cold, lightning and thunder damage."], [14, "Oceanic Gift", "You can make Wrath of the Sea surround an ally instead, or spend two Wild Shape uses to give it to both of you."]],
  "2024|Circle of the Stars": [[3, "Star Map", "You know guidance, and always have guiding bolt prepared, castable without a slot a number of times equal to your Wisdom modifier per long rest."], [3, "Starry Form", "Spend a Wild Shape use to take a starry form for 10 minutes: Archer (bonus action ranged spell attack, 1d8 + WIS radiant), Chalice (healing spells heal another creature 1d8 + WIS) or Dragon (treat d20s of 9 or lower as 10 on INT and WIS checks and concentration saves)."], [6, "Cosmic Omen", "After a long rest roll a die: on even, add 1d6 to an ally's roll as a reaction; on odd, subtract 1d6 from an enemy's roll. Uses equal to your Wisdom modifier."], [10, "Twinkling Constellations", "Starry Form dice become 2d8, the Dragon form gives a 20 ft fly speed, and you can switch constellations at the start of each turn."], [14, "Full of Stars", "In your Starry Form you have resistance to bludgeoning, piercing and slashing damage."]],
  "2024|Battle Master": [[3, "Combat Superiority", "You learn three maneuvers and have four superiority dice (d8). Spend a die to use a maneuver such as Trip Attack, Riposte, Precision Attack or Commanding Presence. Saves use DC 8 + proficiency + STR or DEX. Dice return on a short or long rest."], [3, "Student of War", "Proficiency with one artisan's tool and one fighter skill."], [7, "Know Your Enemy", "Bonus action: learn a creature's immunities, resistances and vulnerabilities. Once per long rest, or spend a superiority die."], [10, "Improved Combat Superiority", "Your superiority dice become d10s (d12 at 18th level). You gain a fifth die at 7th level and a sixth at 15th, and more maneuvers at 7th, 10th and 15th."], [15, "Relentless", "Once per turn, when you use a maneuver, you can roll a d8 instead of spending a superiority die."]],
  "2024|Champion": [[3, "Improved Critical", "Your weapon attacks and Unarmed Strikes score a critical hit on a roll of 19 or 20."], [3, "Remarkable Athlete", "Advantage on initiative rolls and Strength (Athletics) checks, and after a critical hit you can move half your speed without provoking opportunity attacks."], [7, "Additional Fighting Style", "Choose another Fighting Style feat."], [10, "Heroic Warrior", "At the start of each of your turns in combat, you can give yourself Heroic Inspiration if you don't have it."], [15, "Superior Critical", "Your weapon attacks and Unarmed Strikes score a critical hit on a roll of 18–20."], [18, "Survivor", "Advantage on death saving throws; a death save of 18–20 counts as a 20. At the start of each turn, if bloodied, regain 5 + Constitution modifier hit points."]],
  "2024|Eldritch Knight": [[3, "Spellcasting", "You learn wizard cantrips and spells, cast with Intelligence, using a third-caster slot progression."], [3, "War Bond", "Bond with up to two weapons: they can't be disarmed from you, and you can summon one to your hand as a bonus action."], [7, "War Magic", "When you take the Attack action, you can replace one of the attacks with casting a wizard cantrip."], [10, "Eldritch Strike", "A creature you hit with a weapon has disadvantage on its next save against a spell you cast before the end of your next turn."], [15, "Arcane Charge", "When you use Action Surge, you can teleport up to 30 ft."], [18, "Improved War Magic", "When you take the Attack action, you can replace two attacks with casting a wizard spell of 1st or 2nd level that takes an action."]],
  "2024|Psi Warrior": [[3, "Psionic Power", "You have Psionic Energy dice (four d6, growing with level) that return on a long rest (one on a short rest). Protective Field: reaction to reduce damage to a creature within 30 ft by a die + INT. Psionic Strike: after a hit, deal a die + INT force damage. Telekinetic Movement: move an object or creature."], [7, "Telekinetic Adept", "Psi-Powered Leap (fly at twice your speed for a turn) and Telekinetic Thrust (a creature hit by Psionic Strike makes a STR save or is pushed 10 ft or knocked prone)."], [10, "Guarded Mind", "Resistance to psychic damage, and you can spend a die to end charmed or frightened on yourself."], [15, "Bulwark of Force", "Bonus action: allies within 30 ft gain half cover for 1 minute. Once per long rest, or spend a die."], [18, "Telekinetic Master", "You always have telekinesis prepared and can cast it without a slot or a die once per long rest; while concentrating on it you can attack as a bonus action."]],
  "2024|Warrior of Mercy": [[3, "Hand of Harm", "Once per turn when you hit with an Unarmed Strike, spend 1 Focus Point to deal an extra Martial Arts die + WIS necrotic damage."], [3, "Hand of Healing", "Magic action: spend 1 Focus Point to heal a Martial Arts die + WIS. You can replace one Flurry of Blows strike with it, without spending a point."], [3, "Implements of Mercy", "Proficiency in Insight and Medicine and the herbalism kit."], [6, "Physician's Touch", "Hand of Harm can poison the target, and Hand of Healing can end a condition such as blinded, deafened, paralyzed, poisoned or stunned."], [11, "Flurry of Healing and Harm", "Replace each Flurry of Blows strike with Hand of Healing without spending points, and use Hand of Harm with Flurry without spending a point, a number of times equal to your Wisdom modifier per long rest."], [17, "Hand of Ultimate Mercy", "Magic action: spend 5 Focus Points to return a creature that died within 24 hours to life with 4d10 + WIS hit points. Once per long rest."]],
  "2024|Warrior of Shadow": [[3, "Shadow Arts", "Spend 1 Focus Point to cast darkness and see through it; you gain 60 ft darkvision and the minor illusion cantrip."], [6, "Shadow Step", "Bonus action: teleport up to 60 ft between dim light or darkness and gain advantage on your next melee attack this turn."], [11, "Improved Shadow Step", "Spend 1 Focus Point to Shadow Step without needing dim light or darkness, then make an Unarmed Strike as part of it."], [17, "Cloak of Shadows", "Magic action: spend 3 Focus Points to become invisible for 1 minute while in dim light or darkness, able to move through creatures and objects."]],
  "2024|Warrior of the Elements": [[3, "Elemental Attunement", "Spend 1 Focus Point to channel the elements for 10 minutes: your reach grows by 10 ft, and Unarmed Strikes can deal acid, cold, fire, lightning or thunder damage and push or pull the target 10 ft (STR save)."], [3, "Manipulate Elements", "You know the elementalism spell."], [6, "Elemental Burst", "Magic action: spend 2 Focus Points to blast a 20 ft sphere within 120 ft for three Martial Arts dice of elemental damage (DEX save for half)."], [11, "Stride of the Elements", "While attuned, gain a fly and swim speed equal to your speed."], [17, "Elemental Epitome", "While attuned: resistance to one element, Step of the Wind boosts your speed and deals damage as you pass, and once per turn your strikes deal an extra Martial Arts die of elemental damage."]],
  "2024|Warrior of the Open Hand": [[3, "Open Hand Technique", "When you hit with a Flurry of Blows strike, the target can't make opportunity attacks, or makes a STR save or is pushed 15 ft, or makes a DEX save or is knocked prone."], [6, "Wholeness of Body", "Bonus action: regain a Martial Arts die + WIS hit points. Uses equal to your Wisdom modifier per long rest."], [11, "Fleet Step", "When you take a bonus action other than Step of the Wind, you can also use Step of the Wind."], [17, "Quivering Palm", "Spend 4 Focus Points when you hit to set lethal vibrations; later, as part of an action, the target makes a CON save or takes 10d12 force damage (half on a success)."]],
  "2024|Oath of Devotion": [[3, "Oath of Devotion Spells", "Extra spells always prepared at paladin levels 3, 5, 9, 13 and 17 (protection from evil and good and shield of faith at 3rd)."], [3, "Sacred Weapon", "Channel Divinity: when you take the Attack action, add your Charisma modifier to attack rolls with one weapon for 10 minutes; it sheds light and can deal radiant damage."], [7, "Aura of Devotion", "You and allies in your Aura of Protection are immune to the charmed condition."], [15, "Smite of Protection", "When you cast Divine Smite, you and allies in your aura have half cover until your next turn."], [20, "Holy Nimbus", "Bonus action: for 10 minutes, advantage on saves against fiends and undead, enemies starting a turn in your aura take radiant damage equal to CHA + proficiency, and your aura is sunlight. Once per long rest, or spend a 5th-level slot."]],
  "2024|Oath of Glory": [[3, "Inspiring Smite", "After you cast Divine Smite, spend a Channel Divinity use to give 2d8 + paladin level temporary hit points, split among creatures within 30 ft."], [3, "Oath of Glory Spells", "Extra spells always prepared at paladin levels 3, 5, 9, 13 and 17 (guiding bolt and heroism at 3rd)."], [3, "Peerless Athlete", "Channel Divinity, bonus action: for 1 hour, advantage on Athletics and Acrobatics checks, and longer jumps."], [7, "Aura of Alacrity", "Your speed rises by 10 ft, and allies who start their turn in your aura gain the same boost until the end of their turn."], [15, "Glorious Defense", "Reaction: when a creature you can see is hit, add your Charisma modifier to its AC; if the attack then misses, make a weapon attack against the attacker. Uses equal to your Charisma modifier per long rest."], [20, "Living Legend", "Bonus action: for 10 minutes, advantage on Charisma checks, turn a miss into a hit once per turn, and reroll failed saves. Once per long rest, or spend a 5th-level slot."]],
  "2024|Oath of the Ancients": [[3, "Nature's Wrath", "Channel Divinity, magic action: creatures you choose within 15 ft make a STR save or are restrained by spectral vines for 1 minute."], [3, "Oath of the Ancients Spells", "Extra spells always prepared at paladin levels 3, 5, 9, 13 and 17 (ensnaring strike and speak with animals at 3rd)."], [7, "Aura of Warding", "You and allies in your aura have resistance to necrotic, psychic and radiant damage."], [15, "Undying Sentinel", "When reduced to 0 hit points and not killed outright, drop to 1 instead and regain hit points equal to three times your paladin level. Once per long rest. You no longer suffer the drawbacks of old age."], [20, "Elder Champion", "Bonus action: for 1 minute, regain 10 hit points each turn, cast paladin spells that take an action as a bonus action, and enemies in your aura have disadvantage on saves against your spells and Channel Divinity. Once per long rest, or spend a 5th-level slot."]],
  "2024|Oath of Vengeance": [[3, "Oath of Vengeance Spells", "Extra spells always prepared at paladin levels 3, 5, 9, 13 and 17 (bane and hunter's mark at 3rd)."], [3, "Vow of Enmity", "Channel Divinity: when you take the Attack action, gain advantage on attack rolls against one creature within 30 ft for 1 minute; you can move the vow if it drops to 0 hit points."], [7, "Relentless Avenger", "When you hit with an opportunity attack, the target's speed becomes 0 and you can move half your speed without provoking opportunity attacks."], [15, "Soul of Vengeance", "Reaction: when the target of your Vow of Enmity attacks, make a melee attack against it."], [20, "Avenging Angel", "Bonus action: for 10 minutes, a 60 ft flying speed and a frightening aura; attacks against frightened creatures have advantage. Once per long rest, or spend a 5th-level slot."]],
  "2024|Beast Master": [[3, "Primal Companion", "Summon a beast of the land, sea or sky that uses your proficiency bonus and Wisdom in its stat block. It acts on your turn; you command it with a bonus action, or it Dodges."], [7, "Exceptional Training", "Your beast can Dash, Disengage, Dodge or Help when commanded, and its attacks can deal force damage."], [11, "Bestial Fury", "Your beast makes two attacks when commanded, and the first time each turn it hits the target of your Hunter's Mark, it deals the mark's extra damage as force damage."], [15, "Share Spells", "A spell you cast that targets yourself can also affect your beast within 30 ft."]],
  "2024|Fey Wanderer": [[3, "Dreadful Strikes", "Once per turn, your weapon hits deal an extra 1d4 psychic damage (1d6 at 11th level)."], [3, "Fey Wanderer Spells", "Extra spells always prepared at ranger levels 3, 5, 9, 13 and 17 (charm person at 3rd)."], [3, "Otherworldly Glamour", "Add your Wisdom modifier to Charisma checks, and gain proficiency in Deception, Performance or Persuasion."], [7, "Beguiling Twist", "Advantage on saves against charm and fear, and when a creature within 120 ft succeeds on such a save, use your reaction to charm or frighten another creature (WIS save)."], [11, "Fey Reinforcements", "You always have summon fey prepared and can cast it once per long rest without a slot or material components, and optionally without concentration for 1 minute."], [15, "Misty Wanderer", "Cast misty step without a slot a number of times equal to your Wisdom modifier per long rest, and bring a willing creature along."]],
  "2024|Gloom Stalker": [[3, "Dread Ambusher", "Add your Wisdom modifier to initiative, gain +10 ft speed on your first turn, and once per turn add 2d6 psychic damage to a hit (uses equal to your Wisdom modifier per long rest)."], [3, "Gloom Stalker Spells", "Extra spells always prepared at ranger levels 3, 5, 9, 13 and 17 (disguise self at 3rd)."], [3, "Umbral Sight", "Darkvision 60 ft (or +60 ft), and you are invisible to creatures relying on darkvision to see you in darkness."], [7, "Iron Mind", "Proficiency in Wisdom saving throws, or Intelligence or Charisma if you already have it."], [11, "Stalker's Flurry", "Dread Ambusher's psychic damage becomes 2d8, and when you use it you can also make another attack or frighten nearby enemies."], [15, "Shadowy Dodge", "Reaction: impose disadvantage on an attack against you, then teleport up to 30 ft to a space in dim light or darkness."]],
  "2024|Hunter": [[3, "Hunter's Lore", "While a creature is marked by your Hunter's Mark, you know its immunities, resistances and vulnerabilities."], [3, "Hunter's Prey", "Choose Colossus Slayer (+1d8 once per turn against a creature missing hit points) or Horde Breaker (once per turn, one extra attack against another creature within 5 ft of the first). Change on a rest."], [7, "Defensive Tactics", "Choose Escape the Horde (opportunity attacks against you have disadvantage) or Multiattack Defense (after a creature hits you, its other attacks this turn have disadvantage). Change on a rest."], [11, "Superior Hunter's Prey", "Once per turn, when you deal Hunter's Mark damage, deal the same damage to another creature within 30 ft of the target."], [15, "Superior Hunter's Defense", "Reaction: when you take damage, gain resistance to it and every other instance of that type until the end of the turn."]],
  "2024|Arcane Trickster": [[3, "Spellcasting", "You learn wizard cantrips and spells, cast with Intelligence, using a third-caster slot progression."], [3, "Mage Hand Legerdemain", "Your mage hand is invisible and can stow or retrieve objects, pick locks and disarm traps; control it as a bonus action."], [9, "Magical Ambush", "If you are hidden when you cast a spell, the target has disadvantage on saves against it."], [13, "Versatile Trickster", "When you use Trip with Cunning Strike, you can also target a creature within 5 ft of your mage hand."], [17, "Spell Thief", "Reaction: when a creature casts a spell targeting you or including you in its area, force an INT save to negate it and steal the spell for 8 hours. Once per long rest."]],
  "2024|Assassin": [[3, "Assassinate", "Advantage on initiative, advantage on attacks against creatures that haven't taken a turn in the first round, and your Sneak Attack adds your rogue level as extra damage in that round."], [3, "Assassin's Tools", "You gain a disguise kit and poisoner's kit and proficiency with them."], [9, "Infiltration Expertise", "Build false identities, and mimic another person's speech and handwriting."], [13, "Envenom Weapons", "When you use the Poison option of Cunning Strike, the target also takes 2d6 poison damage."], [17, "Death Strike", "When you hit with Sneak Attack in the first round of combat, the target makes a CON save or takes double damage."]],
  "2024|Soulknife": [[3, "Psionic Power", "You have Psionic Energy dice (four d6, growing with level). Psi-Bolstered Knack: add a die to a failed ability check. Psychic Whispers: speak telepathically with creatures you choose."], [3, "Psychic Blades", "When you attack, manifest a psychic blade: Finesse, Thrown (60 ft), 1d6 psychic damage, with a second blade as a bonus action for 1d4."], [9, "Soul Blades", "Homing Strikes: add a die to a missed Psychic Blade attack. Psychic Teleportation: throw a blade to teleport up to ten times a die roll in feet."], [13, "Psychic Veil", "Magic action: become invisible for 1 hour. Once per long rest, or spend a die."], [17, "Rend Mind", "When you deal Sneak Attack damage with a Psychic Blade, the target makes a WIS save or is stunned for 1 minute. Once per long rest, or spend three dice."]],
  "2024|Thief": [[3, "Fast Hands", "As a bonus action, make a Sleight of Hand check, use thieves' tools, or take the Utilize action."], [3, "Second-Story Work", "A climb speed equal to your speed, and you can use Dexterity to determine jump distance."], [9, "Supreme Sneak", "Gain the Stealth Attack Cunning Strike option, letting you stay hidden after an attack."], [13, "Use Magic Device", "Attune to up to four magic items, cast spells from any scroll, and charged items sometimes keep their charge."], [17, "Thief's Reflexes", "Take two turns during the first round of combat."]],
  "2024|Aberrant Sorcery": [[3, "Psionic Spells", "Extra spells always prepared at sorcerer levels 3, 5, 7 and 9 (arms of Hadar, calm emotions, detect thoughts, dissonant whispers and mind sliver at 3rd)."], [3, "Telepathic Speech", "Bonus action: form a telepathic link with a creature within 30 ft for minutes equal to your sorcerer level."], [6, "Psionic Sorcery", "Cast your psionic spells with sorcery points instead of slots, with no verbal or somatic components."], [6, "Psychic Defenses", "Resistance to psychic damage, and advantage on saves against being charmed or frightened."], [14, "Revelation in Flesh", "Bonus action: spend sorcery points to gain see-invisibility, flying, swimming and water breathing, or squeezing through tight spaces for 10 minutes."], [18, "Warping Implosion", "Magic action: teleport up to 120 ft; creatures within 30 ft of where you left make a STR save or take 3d10 force damage and are pulled to that space. Once per long rest, or spend 5 sorcery points."]],
  "2024|Clockwork Sorcery": [[3, "Clockwork Spells", "Extra spells always prepared at sorcerer levels 3, 5, 7 and 9 (aid, alarm, lesser restoration and protection from evil and good at 3rd)."], [3, "Restore Balance", "Reaction: cancel advantage or disadvantage on a roll made by a creature within 60 ft. Uses equal to your Charisma modifier per long rest."], [6, "Bastion of Law", "Magic action: spend 1–5 sorcery points to give a creature that many d8s; it can spend them to reduce damage it takes."], [14, "Trance of Order", "Bonus action: for 1 minute, attacks against you can't have advantage, and your d20 rolls of 9 or lower count as 10. Once per long rest, or spend 5 sorcery points."], [18, "Clockwork Cavalcade", "Magic action: in a 30 ft cube, restore up to 100 hit points, repair objects and end spells of 6th level or lower. Once per long rest, or spend 7 sorcery points."]],
  "2024|Draconic Sorcery": [[3, "Draconic Resilience", "Your hit point maximum rises by 3, then by 1 per sorcerer level, and without armor your AC is 10 + DEX + CHA."], [3, "Draconic Spells", "Extra spells always prepared at sorcerer levels 3, 5, 7 and 9 (alter self, chromatic orb, command and dragon's breath at 3rd)."], [6, "Elemental Affinity", "Choose a damage type tied to your dragon: resistance to it, and add your Charisma modifier to one damage roll of a spell that deals it."], [14, "Dragon Wings", "Bonus action: sprout wings for 1 hour, giving a 60 ft flying speed. Once per long rest, or spend 3 sorcery points."], [18, "Dragon Companion", "You can cast summon dragon without material components, once per long rest without a slot, and without concentration for 1 minute."]],
  "2024|Wild Magic Sorcery": [[3, "Wild Magic Surge", "Once per turn, after casting a sorcerer spell with a slot, roll a d20; on a 20, roll on the Wild Magic Surge table."], [3, "Tides of Chaos", "Gain advantage on one d20 test. Once per long rest, or regained when you next cast a spell with a slot and the DM has you roll on the surge table."], [6, "Bend Luck", "Reaction: spend 1 sorcery point to add or subtract 1d4 from another creature's d20 test."], [14, "Controlled Chaos", "When you roll on the Wild Magic Surge table, roll twice and choose."], [18, "Tamed Surge", "After casting a sorcerer spell with a slot, choose any effect from the Wild Magic Surge table instead of rolling. Once per long rest."]],
  "2024|Archfey Patron": [[3, "Archfey Spells", "Extra spells always prepared at warlock levels 3, 5, 7 and 9 (calm emotions, faerie fire, misty step, phantasmal force and sleep at 3rd)."], [3, "Steps of the Fey", "Cast misty step without a slot a number of times equal to your Charisma modifier per long rest, adding Refreshing Step (1d10 temporary hit points) or Taunting Step (WIS save or disadvantage attacking anyone but you)."], [6, "Misty Escape", "Cast misty step as a reaction when you take damage, and add Disappearing Step (invisible) or Dreadful Step (2d10 psychic damage nearby)."], [10, "Beguiling Defenses", "Immunity to being charmed, and reaction to halve damage from an attacker and deal the rest as psychic damage (WIS save)."], [14, "Bewitching Magic", "When you cast an enchantment or illusion spell with a slot, you can also cast misty step without a slot."]],
  "2024|Celestial Patron": [[3, "Celestial Spells", "Extra spells always prepared at warlock levels 3, 5, 7 and 9 (aid, cure wounds, guiding bolt, lesser restoration, light and sacred flame at 3rd)."], [3, "Healing Light", "A pool of d6s equal to 1 + warlock level. Bonus action: heal a creature within 60 ft by spending up to your Charisma modifier in dice. The pool refills on a long rest."], [6, "Radiant Soul", "Resistance to radiant damage, and once per turn add your Charisma modifier to radiant or fire spell damage."], [10, "Celestial Resilience", "When you finish a rest or use Magical Cunning, gain temporary hit points equal to warlock level + CHA, and give five creatures half as many."], [14, "Searing Vengeance", "When you or an ally within 60 ft makes a death save, stand them up with half their hit points and deal 2d8 + CHA radiant damage to nearby enemies, blinding them. Once per long rest."]],
  "2024|Fiend Patron": [[3, "Dark One's Blessing", "When you reduce an enemy to 0 hit points, or someone else does within 10 ft of you, gain temporary hit points equal to CHA + warlock level."], [3, "Fiend Spells", "Extra spells always prepared at warlock levels 3, 5, 7 and 9 (burning hands, command, scorching ray and suggestion at 3rd)."], [6, "Dark One's Own Luck", "Add a d10 to an ability check or saving throw. Uses equal to your Charisma modifier per long rest, once per roll."], [10, "Fiendish Resilience", "After a rest, choose a damage type other than force to resist until you choose another."], [14, "Hurl Through Hell", "When you hit a creature, it makes a CHA save or is sent through the lower planes, taking 8d10 psychic damage and being incapacitated until the end of your next turn. Once per long rest, or spend a Pact Magic slot."]],
  "2024|Great Old One Patron": [[3, "Awakened Mind", "Bonus action: form a telepathic link with a creature within 30 ft for minutes equal to your warlock level."], [3, "Great Old One Spells", "Extra spells always prepared at warlock levels 3, 5, 7 and 9 (detect thoughts, dissonant whispers, phantasmal force and Tasha's hideous laughter at 3rd)."], [3, "Psychic Spells", "Your warlock damage spells can deal psychic damage, and enchantment and illusion spells need no verbal or somatic components."], [6, "Clairvoyant Combatant", "When you link with Awakened Mind, the creature makes a WIS save or attacks against it have advantage and its attacks against you have disadvantage for the link's duration. Once per short or long rest."], [10, "Eldritch Hex", "You always have hex prepared, and its target has disadvantage on saves of the chosen ability."], [10, "Thought Shield", "Your thoughts can't be read, you resist psychic damage, and a creature that deals psychic damage to you takes the same amount."], [14, "Create Thrall", "When you cast summon aberration, you can do so without concentration, and the aberration gains temporary hit points and extra psychic damage."]],
  "2024|Abjurer": [[3, "Abjuration Savant", "Add two abjuration spells to your spellbook for free, and one more each time you gain a spell level."], [3, "Arcane Ward", "When you cast an abjuration spell with a slot, create a ward with hit points equal to twice your wizard level + INT modifier that absorbs damage you take. Spending a slot restores it."], [6, "Projected Ward", "Reaction: your Arcane Ward absorbs damage for a creature within 30 ft."], [10, "Spell Breaker", "You always have counterspell and dispel magic prepared, can cast dispel magic as a bonus action, and add your proficiency bonus to its ability check. A failed counterspell doesn't spend its slot."], [14, "Spell Resistance", "Advantage on saves against spells, and resistance to spell damage."]],
  "2024|Diviner": [[3, "Divination Savant", "Add two divination spells to your spellbook for free, and one more each time you gain a spell level."], [3, "Portent", "After a long rest roll two d20s. Replace any d20 test made by you or a creature you can see with one of them, once per turn."], [6, "Expert Divination", "When you cast a divination spell with a slot of 2nd level or higher, regain a lower-level slot (5th level or lower)."], [10, "The Third Eye", "Bonus action: gain darkvision 120 ft, see the Ethereal Plane, read any language, or see invisible creatures until your next rest."], [14, "Greater Portent", "Roll three d20s for Portent instead of two."]],
  "2024|Evoker": [[3, "Evocation Savant", "Add two evocation spells to your spellbook for free, and one more each time you gain a spell level."], [3, "Potent Cantrip", "When a creature succeeds on a save against your damaging cantrip, or your cantrip attack misses, it still takes half damage."], [6, "Sculpt Spells", "When you cast an evocation spell, choose up to 1 + the spell's level creatures; they automatically succeed on the save and take no damage."], [10, "Empowered Evocation", "Add your Intelligence modifier to one damage roll of any wizard evocation spell."], [14, "Overchannel", "Deal maximum damage with a wizard spell of 1st–5th level; repeated use before a long rest deals you necrotic damage."]],
  "2024|Illusionist": [[3, "Illusion Savant", "Add two illusion spells to your spellbook for free, and one more each time you gain a spell level."], [3, "Improved Illusions", "Cast illusion spells without verbal components, and their range grows by 60 ft. You know minor illusion, can cast it as a bonus action, and it can create both a sound and an image."], [6, "Phantasmal Creatures", "You always have summon beast and summon fey prepared, and once per long rest each can be cast without a slot as an illusion at half hit points."], [10, "Illusory Self", "Reaction: an illusory duplicate makes an attack against you miss. Once per short or long rest, or spend a 2nd-level slot."], [14, "Illusory Reality", "Bonus action: make one inanimate, nonmagical object in your illusion real for 1 minute."]]
};
const subFeatsOf = (ed, name) => SUB_FEATS[`${ed}|${name}`] || [];
// a built-in subclass's features up to this level, as feature-list entries
const subFeatList = (ed, name, lv) => subFeatsOf(ed, name).filter(x => x[0] <= lv).map(x => ({ l: x[0], f: x[1], sub: true }));
function subFeatDesc(f, c) { if (!c) return ""; for (const sc2 of [c.subclass, ...(c.multi || []).map(m => m.subclass)].filter(Boolean)) { const x = subFeatsOf(edOf(c), sc2).find(y => y[1] === f); if (x) return x[2]; } return ""; }
// keep a saved character's subclass features in step with its subclass and level
function pcSubSync(c) {
  const keep = (c.feats || []).filter(f => !f.sub), add = c.subclass ? subFeatList(edOf(c), c.subclass, c.level) : [];
  const before = JSON.stringify(c.feats || []);
  c.feats = [...keep, ...add].sort((a, b) => a.l - b.l);
  return JSON.stringify(c.feats) !== before;
}
/* Subclass features you use in play. when: how it is used. res: a limited-use pool [label, max(c), recharge]. */
const SUB_ABL = {
  // Barbarian
  Frenzy: { when: "While raging" }, Retaliation: { when: "Reaction" }, "Intimidating Presence": { when: "Action" },
  "Rage of the Wilds": { when: "When you rage" }, "Power of the Wilds": { when: "When you rage" }, "Totem Spirit": { when: "While raging" }, "Totemic Attunement": { when: "While raging" },
  "Vitality of the Tree": { when: "While raging" }, "Branches of the Tree": { when: "Reaction" }, "Travel Along the Tree": { when: "While raging" },
  "Divine Fury": { when: "On hit, while raging" }, "Warrior of the Gods": { when: "Bonus action", res: ["Healing dice (d12)", c => c.level >= 17 ? 7 : c.level >= 12 ? 6 : c.level >= 6 ? 5 : 4, "long"] },
  "Fanatical Focus": { when: "On a failed save" }, "Zealous Presence": { when: "Bonus action", res: ["Zealous Presence", () => 1, "long"] }, "Rage of the Gods": { when: "When you rage", res: ["Rage of the Gods", () => 1, "long"] },
  // Bard
  "Cutting Words": { when: "Reaction", uses: "bardic" }, "Peerless Skill": { when: "On a check", uses: "bardic" }, "Combat Inspiration": { when: "Ally's reaction" }, "Battle Magic": { when: "Bonus action" },
  "Dazzling Footwork": { when: "Unarmored" }, "Inspiring Movement": { when: "Reaction", uses: "bardic" }, "Tandem Footwork": { when: "On initiative", uses: "bardic" }, "Leading Evasion": { when: "Defense" },
  "Beguiling Magic": { when: "After a spell", res: ["Beguiling Magic", () => 1, "long"] }, "Mantle of Inspiration": { when: "Bonus action", uses: "bardic" }, "Mantle of Majesty": { when: "Bonus action", res: ["Mantle of Majesty", () => 1, "long"] }, "Unbreakable Majesty": { when: "Bonus action", res: ["Unbreakable Majesty", () => 1, "short"] },
  // Cleric
  "Disciple of Life": { when: "When healing" }, "Blessed Healer": { when: "When healing" }, "Divine Strike": { when: "On hit, once per turn" },
  "Warding Flare": { when: "Reaction", res: ["Warding Flare", c => Math.max(1, c.mods.wis), "long"] }, "Wrath of the Storm": { when: "Reaction", res: ["Wrath of the Storm", c => Math.max(1, c.mods.wis), "long"] },
  "War Priest": { when: "Bonus action", res: ["War Priest attacks", c => Math.max(1, c.mods.wis), "long"] }, "Dampen Elements": { when: "Reaction" }, "Blessing of the Trickster": { when: "Action" },
  "Channel Divinity: Preserve Life": { when: "Action", uses: "channel" }, "Channel Divinity: Radiance of the Dawn": { when: "Action", uses: "channel" }, "Channel Divinity: Destructive Wrath": { when: "On damage", uses: "channel" }, "Channel Divinity: Guided Strike": { when: "On attack", uses: "channel" }, "Channel Divinity: War God's Blessing": { when: "Reaction", uses: "channel" }, "Channel Divinity: Invoke Duplicity": { when: "Action", uses: "channel" }, "Channel Divinity: Cloak of Shadows": { when: "Action", uses: "channel" }, "Channel Divinity: Charm Animals and Plants": { when: "Action", uses: "channel" }, "Channel Divinity: Knowledge of the Ages": { when: "Action", uses: "channel" }, "Channel Divinity: Read Thoughts": { when: "Action", uses: "channel" },
  "Preserve Life": { when: "Action", uses: "channel" }, "Radiance of the Dawn": { when: "Action", uses: "channel" }, "Invoke Duplicity": { when: "Bonus action", uses: "channel" }, "Guided Strike": { when: "On a miss", uses: "channel" }, "War God's Blessing": { when: "Bonus action", uses: "channel" },
  // Druid
  "Combat Wild Shape": { when: "Bonus action", uses: "wild" }, "Natural Recovery": { when: "Short rest", res: ["Natural Recovery", () => 1, "long"] }, "Land's Aid": { when: "Action", uses: "wild" }, "Nature's Sanctuary": { when: "Action" },
  "Moonlight Step": { when: "Bonus action", res: ["Moonlight Step", c => Math.max(1, c.mods.wis), "long"] }, "Lunar Form": { when: "On hit, beast form" }, "Wrath of the Sea": { when: "Bonus action", uses: "wild" },
  "Star Map": { when: "Action", res: ["Free guiding bolt", c => Math.max(1, c.mods.wis), "long"] }, "Starry Form": { when: "Bonus action", uses: "wild" }, "Cosmic Omen": { when: "Reaction", res: ["Cosmic Omen", c => Math.max(1, c.mods.wis), "long"] },
  // Fighter
  "Improved Critical": { when: "On attack" }, "Superior Critical": { when: "On attack" }, Survivor: { when: "Start of turn" }, "Heroic Warrior": { when: "Start of turn" },
  "Combat Superiority": { when: "On attack", res: ["Superiority dice", c => c.level >= 15 ? 6 : c.level >= 7 ? 5 : 4, "short"] }, Relentless: { when: "On initiative" },
  "War Magic": { when: "Bonus action" }, "Improved War Magic": { when: "Bonus action" }, "Eldritch Strike": { when: "On hit" }, "Arcane Charge": { when: "With Action Surge" },
  "Psionic Power": { when: "Varies", res: ["Psionic Energy dice", c => c.level >= 17 ? 12 : c.level >= 13 ? 10 : c.level >= 9 ? 8 : c.level >= 5 ? 6 : 4, "short1"] }, "Bulwark of Force": { when: "Bonus action" },
  // Monk
  "Open Hand Technique": { when: "On Flurry hit" }, "Wholeness of Body": { when: "Action", res: ["Wholeness of Body", c => edOf(c) === "2024" ? Math.max(1, c.mods.wis) : 1, "long"] }, "Quivering Palm": { when: "On hit", uses: "ki" },
  "Shadow Arts": { when: "Action", uses: "ki" }, "Shadow Step": { when: "Bonus action" }, "Improved Shadow Step": { when: "Bonus action", uses: "ki" }, "Cloak of Shadows": { when: "Action" }, Opportunist: { when: "Reaction" },
  "Disciple of the Elements": { when: "Action", uses: "ki" }, "Elemental Attunement": { when: "Bonus action", uses: "ki" }, "Elemental Burst": { when: "Action", uses: "ki" },
  "Hand of Harm": { when: "On hit", uses: "ki" }, "Hand of Healing": { when: "Action", uses: "ki" }, "Flurry of Healing and Harm": { when: "With Flurry", res: ["Free Hand of Harm", c => Math.max(1, c.mods.wis), "long"] }, "Hand of Ultimate Mercy": { when: "Action", res: ["Hand of Ultimate Mercy", () => 1, "long"] },
  // Paladin
  "Channel Divinity: Sacred Weapon": { when: "Action", uses: "channel" }, "Channel Divinity: Turn the Unholy": { when: "Action", uses: "channel" }, "Channel Divinity: Nature's Wrath": { when: "Action", uses: "channel" }, "Channel Divinity: Turn the Faithless": { when: "Action", uses: "channel" }, "Channel Divinity: Abjure Enemy": { when: "Action", uses: "channel" }, "Channel Divinity: Vow of Enmity": { when: "Bonus action", uses: "channel" },
  "Sacred Weapon": { when: "With the Attack action", uses: "channel" }, "Vow of Enmity": { when: "With the Attack action", uses: "channel" }, "Nature's Wrath": { when: "Action", uses: "channel" }, "Inspiring Smite": { when: "After Divine Smite", uses: "channel" }, "Peerless Athlete": { when: "Bonus action", uses: "channel" },
  "Aura of Devotion": { when: "Aura" }, "Aura of Warding": { when: "Aura" }, "Aura of Alacrity": { when: "Aura" }, "Smite of Protection": { when: "With Divine Smite" }, "Relentless Avenger": { when: "On opportunity hit" }, "Soul of Vengeance": { when: "Reaction" },
  "Glorious Defense": { when: "Reaction", res: ["Glorious Defense", c => Math.max(1, c.mods.cha), "long"] },
  "Holy Nimbus": { when: "Action", res: ["Holy Nimbus", () => 1, "long"] }, "Elder Champion": { when: "Action", res: ["Elder Champion", () => 1, "long"] }, "Avenging Angel": { when: "Action", res: ["Avenging Angel", () => 1, "long"] }, "Living Legend": { when: "Bonus action", res: ["Living Legend", () => 1, "long"] }, "Undying Sentinel": { when: "When reduced to 0 HP", res: ["Undying Sentinel", () => 1, "long"] },
  // Ranger
  "Hunter's Prey": { when: "On hit" }, "Superior Hunter's Prey": { when: "On hit" }, "Superior Hunter's Defense": { when: "Reaction" }, Multiattack: { when: "Action" },
  "Ranger's Companion": { when: "Your turn" }, "Primal Companion": { when: "Bonus action" }, "Bestial Fury": { when: "Companion attack" },
  "Dreadful Strikes": { when: "On hit, once per turn" }, "Beguiling Twist": { when: "Reaction" }, "Fey Reinforcements": { when: "Action", res: ["Free summon fey", () => 1, "long"] }, "Misty Wanderer": { when: "Bonus action", res: ["Free misty step", c => Math.max(1, c.mods.wis), "long"] },
  "Dread Ambusher": { when: "On hit, once per turn", res: ["Dread Ambusher", c => Math.max(1, c.mods.wis), "long"] }, "Stalker's Flurry": { when: "With Dread Ambusher" }, "Shadowy Dodge": { when: "Reaction" },
  // Rogue
  "Fast Hands": { when: "Bonus action" }, Assassinate: { when: "First round" }, "Death Strike": { when: "On hit, first round" }, "Envenom Weapons": { when: "With Cunning Strike" },
  "Magical Ambush": { when: "When hidden" }, "Versatile Trickster": { when: "Bonus action" }, "Spell Thief": { when: "Reaction", res: ["Spell Thief", () => 1, "long"] },
  "Psychic Blades": { when: "Attack" }, "Soul Blades": { when: "Varies" }, "Psychic Veil": { when: "Action", res: ["Psychic Veil", () => 1, "long"] }, "Rend Mind": { when: "On Sneak Attack", res: ["Rend Mind", () => 1, "long"] },
  // Sorcerer
  "Elemental Affinity": { when: "On spell damage" }, "Dragon Wings": { when: "Bonus action" }, "Draconic Presence": { when: "Action", uses: "sorc" },
  "Tides of Chaos": { when: "On a roll", res: ["Tides of Chaos", () => 1, "long"] }, "Bend Luck": { when: "Reaction", uses: "sorc" }, "Tamed Surge": { when: "After a spell", res: ["Tamed Surge", () => 1, "long"] },
  "Telepathic Speech": { when: "Bonus action" }, "Psionic Sorcery": { when: "When casting", uses: "sorc" }, "Revelation in Flesh": { when: "Bonus action", uses: "sorc" }, "Warping Implosion": { when: "Action", res: ["Warping Implosion", () => 1, "long"] },
  "Restore Balance": { when: "Reaction", res: ["Restore Balance", c => Math.max(1, c.mods.cha), "long"] }, "Bastion of Law": { when: "Action", uses: "sorc" }, "Trance of Order": { when: "Bonus action", res: ["Trance of Order", () => 1, "long"] }, "Clockwork Cavalcade": { when: "Action", res: ["Clockwork Cavalcade", () => 1, "long"] },
  // Warlock
  "Fey Presence": { when: "Action", res: ["Fey Presence", () => 1, "short"] }, "Misty Escape": { when: "Reaction", res: ["Misty Escape", () => 1, "short"] }, "Dark Delirium": { when: "Action", res: ["Dark Delirium", () => 1, "short"] }, "Beguiling Defenses": { when: "Reaction" },
  "Steps of the Fey": { when: "Bonus action", res: ["Free misty step", c => Math.max(1, c.mods.cha), "long"] },
  "Dark One's Blessing": { when: "On a kill" }, "Dark One's Own Luck": { when: "On a check or save", res: ["Dark One's Own Luck", c => edOf(c) === "2024" ? Math.max(1, c.mods.cha) : 1, c => edOf(c) === "2024" ? "long" : "short"] }, "Hurl Through Hell": { when: "On hit", res: ["Hurl Through Hell", () => 1, "long"] },
  "Entropic Ward": { when: "Reaction", res: ["Entropic Ward", () => 1, "short"] }, "Clairvoyant Combatant": { when: "With Awakened Mind", res: ["Clairvoyant Combatant", () => 1, "short"] }, "Create Thrall": { when: "Action" },
  "Healing Light": { when: "Bonus action", res: ["Healing Light dice (d6)", c => 1 + c.level, "long"] }, "Radiant Soul": { when: "On spell damage" }, "Searing Vengeance": { when: "On a death save", res: ["Searing Vengeance", () => 1, "long"] },
  // Wizard
  "Arcane Ward": { when: "Passive" }, "Projected Ward": { when: "Reaction" }, Portent: { when: "On any roll you see", res: ["Portent dice", c => c.level >= 14 ? 3 : 2, "long"] },
  "Sculpt Spells": { when: "When casting" }, "Potent Cantrip": { when: "On a cantrip" }, "Empowered Evocation": { when: "On spell damage" }, Overchannel: { when: "When casting" },
  "Illusory Self": { when: "Reaction", res: ["Illusory Self", () => 1, "short"] }, "Illusory Reality": { when: "Bonus action" }, "Hypnotic Gaze": { when: "Action" }, "Instinctive Charm": { when: "Reaction" },
  "Benign Transposition": { when: "Action", res: ["Benign Transposition", () => 1, "long"] }, "Grim Harvest": { when: "On a kill" }, "Shapechanger": { when: "Action", res: ["Shapechanger", () => 1, "short"] }, "Spell Breaker": { when: "Bonus action" }
};
/* Numbers a subclass changes on the sheet: extra hit points, speed, initiative, crit range, saves, unarmored AC. */
function subBonuses(ed, sub, lv, m, prof) {
  const B = { hp: 0, speed: 0, init: 0, crit: 20, athlete: false, saves: [], ac: null };
  if (!sub) return B;
  if ((sub === "Draconic Bloodline" && ed === "2014") || (sub === "Draconic Sorcery" && ed === "2024" && lv >= 3)) {
    B.hp = lv;
    B.ac = ed === "2024" ? [10 + m.dex + m.cha, "Draconic Resilience (10 + DEX + CHA)"] : [13 + m.dex, "Draconic Resilience (13 + DEX)"];
  }
  if (sub === "Champion") { B.crit = lv >= 15 ? 18 : lv >= 3 ? 19 : 20; if (ed === "2014" && lv >= 7) B.athlete = true; }
  if (sub === "Oath of Glory" && ed === "2024" && lv >= 7) B.speed = 10;
  if (sub === "Gloom Stalker" && ed === "2024") { if (lv >= 3) B.init = m.wis; if (lv >= 7) B.saves.push("wis"); }
  return B;
}
const subBonusOf = c => subBonuses(edOf(c), c.subclass, c.level, c.mods, c.prof);
// Iron Mind: Wisdom saves, or Intelligence / Charisma if already proficient
function subAddSaves(saves, B) { B.saves.forEach(a => { const pick = [a, "int", "cha"].find(x => !saves.includes(x)); if (pick) saves.push(pick); }); return saves; }
const athleteBonus = (B, s, prof) => B.athlete && !s.p && ["str", "dex", "con"].includes(s.ab) ? Math.ceil(prof / 2) : 0; // 2014 Remarkable Athlete rounds up
// bring a saved character's subclass numbers up to date; the hit point and speed bonuses are tracked so they're applied once
function pcSubNumbers(c) {
  const B = subBonusOf(c), before = JSON.stringify([c.hp, c.hpCur, c.speed, c.saves, c.ac, c.acSrc]);
  const dHp = B.hp - (+c.subHp || 0); if (dHp && c.hp !== "") { c.hp = (+c.hp || 0) + dHp; if (c.hpCur !== "" && c.hpCur !== undefined) c.hpCur = Math.max(0, (+c.hpCur || 0) + dHp); } c.subHp = B.hp;
  c.subSpd = B.speed;
  subAddSaves(c.saves, B);
  if (c.cls === "Sorcerer" && !c.kitMoved) {
    if (B.ac && c.acSrc !== B.ac[1]) [c.ac, c.acSrc] = B.ac;
    else if (!B.ac && /^Draconic Resilience/.test(c.acSrc || "")) [c.ac, c.acSrc] = CLASS_DATA.Sorcerer.ac(c.mods);
  }
  return JSON.stringify([c.hp, c.hpCur, c.speed, c.saves, c.ac, c.acSrc]) !== before;
}
const subAblKey = n => "sub:" + n.toLowerCase().replace(/[^a-z]+/g, "-");
const subclassList = (ed, cls) => [...(((SUBCLASSES[ed] || SUBCLASSES["2014"])[cls]) || []), ...hbOf("subclass").filter(x => x.cls === cls && hbEdOk(x, ed)).map(x => [x.name, x.desc || "", true])];
const subclassLevel = (ed, cls) => ed === "2024" ? 3 : (CLASS_DATA[cls] ? CLASS_DATA[cls].sub[1] : 3);
function subclassDesc(name) {
  const h = hbAny("subclass").find(x => x.name === name); if (h) return h.desc || "";
  for (const ed of ["2024", "2014"]) for (const list of Object.values(SUBCLASSES[ed])) { const h = list.find(x => x[0] === name); if (h) return h[1]; }
  return SUB_DESC[name] || "";
}
const needsSubclass = c => !!(c && CLASS_DATA[c.cls] && !c.subclass && c.level >= subclassLevel(edOf(c), c.cls));
/* ---- feats by rules edition: [name, abilities it can raise by 1 ("any" or "str dex"), prerequisite, summary, group] ----
   prerequisite: "str13|dex13" (any one), "cast" (can cast spells), "lv19", or "@text" (shown, not checked). */
const FEATS = {
  "2014": [
    ["Actor", "cha", "", "Advantage on Deception and Performance while disguised; mimic voices and sounds."],
    ["Alert", "", "", "+5 initiative, can't be surprised while conscious, and hidden attackers gain no advantage on you."],
    ["Athlete", "str dex", "", "Stand up using only 5 ft, climb at full speed, and make running jumps after 5 ft."],
    ["Charger", "", "", "After you Dash, make a bonus-action melee attack for +5 damage or shove the target 10 ft."],
    ["Crossbow Expert", "", "", "Ignore loading, no disadvantage firing in melee, and a bonus-action hand crossbow shot."],
    ["Defensive Duelist", "", "dex13", "Reaction: add your proficiency bonus to AC against a melee hit while holding a finesse weapon."],
    ["Dual Wielder", "", "", "+1 AC while wielding two weapons, fight two-handed with non-light weapons, draw two at once."],
    ["Dungeon Delver", "", "", "Advantage to find secret doors and resist traps; resistance to trap damage; search at normal pace."],
    ["Durable", "con", "", "Each Hit Die you spend heals at least twice your CON modifier."],
    ["Elemental Adept", "", "cast", "Your spells ignore resistance to one damage type, and treat 1s on its damage dice as 2s."],
    ["Grappler", "", "str13", "Advantage on attacks against creatures you grapple, and you can pin them."],
    ["Great Weapon Master", "", "", "Bonus-action attack after a crit or kill; take -5 to hit for +10 damage with heavy weapons."],
    ["Healer", "", "", "A healer's kit can stabilize to 1 HP or heal 1d6 + 4 + the target's Hit Dice once per rest."],
    ["Heavily Armored", "str", "@Medium armor training", "Proficiency with heavy armor."],
    ["Heavy Armor Master", "str", "@Heavy armor training", "In heavy armor, nonmagical bludgeoning, piercing and slashing damage is cut by 3."],
    ["Inspiring Leader", "", "cha13", "A 10-minute speech gives up to six allies temp HP equal to your level + CHA."],
    ["Keen Mind", "int", "", "Always know north and the time, and recall anything seen or heard in the past month."],
    ["Lightly Armored", "str dex", "", "Proficiency with light armor."],
    ["Linguist", "int", "", "Learn three languages and create written ciphers."],
    ["Lucky", "", "", "Three luck points per long rest: roll an extra d20 for an attack, check or save, or against an attack on you."],
    ["Mage Slayer", "", "", "Reaction attack on adjacent casters; they struggle to concentrate, and you resist their spells."],
    ["Magic Initiate", "", "", "Two cantrips and one 1st-level spell from a class of your choice."],
    ["Martial Adept", "", "", "Learn two Battle Master maneuvers and gain one superiority die (d6)."],
    ["Medium Armor Master", "", "@Medium armor training", "No Stealth disadvantage in medium armor, and add up to +3 DEX to its AC."],
    ["Mobile", "", "", "+10 ft speed; Dash ignores difficult terrain; creatures you attack can't make opportunity attacks on you."],
    ["Moderately Armored", "str dex", "@Light armor training", "Proficiency with medium armor and shields."],
    ["Mounted Combatant", "", "", "Advantage on melee attacks against smaller unmounted foes while mounted, and protect your mount."],
    ["Observant", "int wis", "", "+5 to passive Perception and Investigation, and read lips."],
    ["Polearm Master", "", "", "Bonus-action butt-end attack, and opportunity attacks when foes enter your reach."],
    ["Resilient", "any", "", "Proficiency in saving throws for the ability you raise."],
    ["Ritual Caster", "", "int13|wis13", "A ritual book of spells you can cast as rituals, and you can copy more into it."],
    ["Savage Attacker", "", "", "Once per turn, reroll a melee weapon's damage dice and use either total."],
    ["Sentinel", "", "", "Opportunity attacks stop movement, ignore Disengage, and punish foes who attack your allies."],
    ["Sharpshooter", "", "", "No disadvantage at long range, ignore partial cover, and take -5 to hit for +10 damage."],
    ["Shield Master", "", "", "Bonus-action shove, shield bonus to DEX saves, and take no damage on a successful DEX save."],
    ["Skilled", "", "", "Proficiency in any combination of three skills or tools."],
    ["Skulker", "", "dex13", "Hide when lightly obscured; a missed ranged attack doesn't reveal you; dim light doesn't hinder sight."],
    ["Spell Sniper", "", "cast", "Double the range of attack spells, ignore partial cover, and learn one attack cantrip."],
    ["Tavern Brawler", "str con", "", "Proficient with improvised weapons, d4 unarmed strikes, and a bonus-action grapple after a hit."],
    ["Tough", "", "", "+2 hit points per level (added to your HP)."],
    ["War Caster", "", "cast", "Advantage on concentration saves, cast with hands full, and cast a spell as an opportunity attack."],
    ["Weapon Master", "str dex", "", "Proficiency with four weapons of your choice."]
  ],
  "2024": [
    ["Alert", "", "", "Add your proficiency bonus to initiative, and swap initiative with a willing ally.", "o"],
    ["Crafter", "", "", "Three artisan's tools, a 20% discount on nonmagical gear, and fast crafting.", "o"],
    ["Healer", "", "", "Use a healer's kit to let a creature spend a Hit Die; reroll 1s on healing dice.", "o"],
    ["Lucky", "", "", "Luck points equal to your proficiency bonus: gain advantage, or impose disadvantage on an attack on you.", "o"],
    ["Magic Initiate", "", "", "Two cantrips and a level 1 spell from the cleric, druid or wizard list.", "o"],
    ["Musician", "", "", "Three instruments; after a rest, give allies Heroic Inspiration with a song.", "o"],
    ["Savage Attacker", "", "", "Once per turn, roll a weapon's damage dice twice and use either roll.", "o"],
    ["Skilled", "", "", "Proficiency in any combination of three skills or tools.", "o"],
    ["Tavern Brawler", "", "", "Stronger unarmed strikes, reroll 1s on their damage, and push foes 5 ft.", "o"],
    ["Tough", "", "", "+2 hit points per level (added to your HP).", "o"],
    ["Actor", "cha", "cha13", "Advantage on Deception and Performance while disguised; mimic voices.", "g"],
    ["Athlete", "str dex", "str13|dex13", "Climb speed, stand up with 5 ft, and running jumps after 5 ft.", "g"],
    ["Charger", "str dex", "str13|dex13", "+10 ft when you Dash; a charging hit adds 1d8 damage or pushes 10 ft.", "g"],
    ["Chef", "con wis", "", "Cook to heal extra on short rests, and bake treats that grant temp HP.", "g"],
    ["Crossbow Expert", "dex", "dex13", "Ignore loading, no disadvantage in melee, and add your modifier to off-hand crossbow damage.", "g"],
    ["Crusher", "str con", "", "Bludgeoning hits push 5 ft; your crits give allies advantage on the target.", "g"],
    ["Defensive Duelist", "dex", "dex13", "Reaction: add your proficiency bonus to AC while holding a finesse weapon.", "g"],
    ["Dual Wielder", "str dex", "str13|dex13", "Extra off-hand attack with non-light weapons, and draw two weapons at once.", "g"],
    ["Durable", "con", "", "Advantage on death saves, and heal with a Hit Die as a bonus action.", "g"],
    ["Elemental Adept", "int wis cha", "cast", "Your spells ignore resistance to one element, and 1s on its damage become 2s.", "g"],
    ["Fey Touched", "int wis cha", "", "Learn Misty Step and one level 1 divination or enchantment spell.", "g"],
    ["Grappler", "str dex", "str13|dex13", "Grapple as part of a hit, advantage against creatures you grapple, drag them at full speed.", "g"],
    ["Great Weapon Master", "str", "str13", "Heavy weapon hits add your proficiency bonus to damage; bonus attack after a crit or kill.", "g"],
    ["Heavily Armored", "str con", "@Medium armor training", "Heavy armor training.", "g"],
    ["Heavy Armor Master", "str con", "@Heavy armor training", "In heavy armor, bludgeoning, piercing and slashing damage is cut by your proficiency bonus.", "g"],
    ["Inspiring Leader", "wis cha", "wis13|cha13", "After a rest, give up to six allies temp HP equal to your level + modifier.", "g"],
    ["Keen Mind", "int", "int13", "A knowledge skill gains expertise, and Study is a bonus action.", "g"],
    ["Lightly Armored", "str dex", "", "Light armor and shield training.", "g"],
    ["Mage Slayer", "str dex", "", "Your hits break concentration more easily, and you can turn a failed mental save into a success.", "g"],
    ["Martial Weapon Training", "str dex", "", "Proficiency with martial weapons.", "g"],
    ["Medium Armor Master", "str dex", "@Medium armor training", "Add up to +3 DEX to medium armor's AC.", "g"],
    ["Moderately Armored", "str dex", "@Light armor training", "Medium armor training.", "g"],
    ["Mounted Combatant", "str dex wis", "", "Advantage against unmounted foes, and protect your mount from attacks and area effects.", "g"],
    ["Observant", "int wis", "int13|wis13", "Expertise in Insight, Investigation or Perception; Search as a bonus action.", "g"],
    ["Piercer", "str dex", "", "Reroll one piercing damage die per turn; piercing crits add a die.", "g"],
    ["Poisoner", "dex int", "", "Your poison damage ignores resistance, and brew potent poisons.", "g"],
    ["Polearm Master", "str dex", "str13|dex13", "Bonus-action haft attack, and reaction attacks when foes enter your reach.", "g"],
    ["Resilient", "any", "", "Proficiency in saving throws for the ability you raise.", "g"],
    ["Ritual Caster", "int wis cha", "int13|wis13|cha13", "Learn ritual spells, and cast one quickly without the extra time.", "g"],
    ["Sentinel", "str dex", "str13|dex13", "Opportunity attacks stop movement and ignore Disengage; protect your allies.", "g"],
    ["Shadow Touched", "int wis cha", "", "Learn Invisibility and one level 1 illusion or necromancy spell.", "g"],
    ["Sharpshooter", "dex", "dex13", "Ignore partial cover, no disadvantage at long range or in melee.", "g"],
    ["Shield Master", "str", "@Shield training", "Shield-bash to push or knock prone, and take no damage on a successful DEX save.", "g"],
    ["Skill Expert", "any", "", "Proficiency in one skill and expertise in another.", "g"],
    ["Skulker", "dex", "dex13", "Blindsight 10 ft, hide while lightly obscured, and stay hidden after a missed shot.", "g"],
    ["Slasher", "str dex", "", "Slashing hits cut speed by 10 ft; slashing crits hamper the target's attacks.", "g"],
    ["Speedy", "dex con", "dex13|con13", "+10 ft speed, Dash ignores difficult terrain, and opportunity attacks have disadvantage.", "g"],
    ["Spell Sniper", "int wis cha", "cast", "Attack spells gain 60 ft range and ignore partial cover; no disadvantage in melee.", "g"],
    ["Telekinetic", "int wis cha", "", "Invisible Mage Hand, and bonus-action shoves with your mind.", "g"],
    ["Telepathic", "int wis cha", "", "Telepathy 60 ft, and Detect Thoughts once per long rest.", "g"],
    ["War Caster", "int wis cha", "cast", "Advantage on concentration saves, and cast a spell as an opportunity attack.", "g"],
    ["Weapon Master", "str dex", "", "Use the mastery property of one weapon type, and change it after a rest.", "g"],
    ["Boon of Combat Prowess", "any", "lv19", "Once per turn, turn a missed attack into a hit.", "b"],
    ["Boon of Dimensional Travel", "any", "lv19", "Teleport 30 ft after you attack or cast a spell.", "b"],
    ["Boon of Energy Resistance", "any", "lv19", "Resist two damage types and redirect that damage to a foe.", "b"],
    ["Boon of Fate", "any", "lv19", "Add or subtract 2d4 from a nearby creature's d20 roll.", "b"],
    ["Boon of Fortitude", "any", "lv19", "+40 hit points, and extra healing once per turn.", "b"],
    ["Boon of Irresistible Offense", "any", "lv19", "Your damage ignores resistance, and natural 20s deal extra damage.", "b"],
    ["Boon of Recovery", "any", "lv19", "Drop to 1 HP instead of 0 once per long rest, and a pool of d10s to heal.", "b"],
    ["Boon of Skill", "any", "lv19", "Proficiency in every skill, and expertise in one.", "b"],
    ["Boon of Speed", "any", "lv19", "+30 ft speed, and Disengage as a bonus action.", "b"],
    ["Boon of Spell Recall", "any", "lv19", "Cast a level 1-4 spell without a slot once per long rest.", "b"],
    ["Boon of the Night Spirit", "any", "lv19", "Turn invisible in dim light or darkness, and resist most damage there.", "b"],
    ["Boon of Truesight", "any", "lv19", "Truesight out to 60 ft.", "b"]
  ]
};
const FEAT_GROUPS = { o: "Origin", g: "General", b: "Epic boon" };
const FEAT_REPEAT = new Set(["Elemental Adept", "Magic Initiate", "Skilled"]);
const featList = ed => [...(FEATS[ed] || FEATS["2014"]), ...hbOf("feat").filter(x => hbEdOk(x, ed)).map(x => [x.name, x.ab || "", x.req || "", (x.desc || "") + fxNote(x.fx), ed === "2024" ? (x.group || "g") : undefined, true])];
const featInfo = (ed, name) => featList(ed).find(f => f[0] === name) || null;
const featAbs = F => !F || !F[1] ? [] : F[1] === "any" ? [...AB] : F[1].split(" ");
// Why a character can't take a feat right now ("" if they can). scores are their scores before this level's points.
function featBlock(F, c, scores, lv) {
  const req = F[2]; if (!req || req[0] === "@") return "";
  const ok = req.split("|").some(t => t === "cast" ? !!c.spell : t === "lv19" ? lv >= 19 : (scores[t.slice(0, 3)] || 0) >= +t.slice(3));
  if (ok) return "";
  return req === "cast" ? "Requires spellcasting" : req === "lv19" ? "Requires level 19" : "Requires " + req.split("|").map(t => `${AB_NAME[t.slice(0, 3)]} ${t.slice(3)}`).join(" or ");
}
const featReqText = F => !F[2] ? "" : F[2][0] === "@" ? F[2].slice(1) : F[2] === "cast" ? "Spellcasting" : F[2] === "lv19" ? "Level 19" : F[2].split("|").map(t => `${AB_NAME[t.slice(0, 3)]} ${t.slice(3)}+`).join(" or ");
/* ---- homebrew: subclasses, backgrounds, feats and species added by the DM ----
   Signed in to a campaign they come from the campaign database (Portal); otherwise from this browser.
   Backgrounds and species are merged into BACKGROUNDS / PC_RACES so every picker and the generator see them. */
const HB_KEY = "dmforge.homebrew.v1";
const HB_KINDS = { subclass: "Subclasses", background: "Backgrounds", feat: "Feats", species: "Species & races", spell: "Spells" };
const SP_SCHOOLS = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"];
const HB = { list: [], pend: [], pendSig: "", applied: { bg: [], races: [], raceDesc: [] } };
const HB_DESC = {};      // homebrew feature / trait name -> description
const HB_BG = {};        // homebrew background name -> its entry
const hbEdOk = (x, ed) => !x.ed || x.ed === "both" || x.ed === ed;
/* Sheet effects a homebrew feature, trait, feat or background can carry: { t: type, v: amount, a: ability or skill, max } */
const HB_FX = { ac: "Armor class", hp: "Max HP", hpLv: "Max HP per level", speed: "Speed (ft)", init: "Initiative", atk: "Weapon attack rolls", spell: "Spell save DC & spell attack", ab: "Ability score", save: "Saving throw proficiency", skill: "Skill proficiency", exp: "Skill expertise", res: "Damage resistance", imm: "Damage immunity", vul: "Damage vulnerability", cimm: "Condition immunity", sadv: "Advantage on saves against" };
const FX_COND = ["blinded", "charmed", "deafened", "exhaustion", "frightened", "grappled", "incapacitated", "invisible", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious"];
const fxCond = t => t === "cimm";
const SADV_OPTS = [...FX_COND.filter(k => !["incapacitated", "invisible", "unconscious"].includes(k)), "magic", "spells", "traps", ...AB.map(a => `${AB_NAME[a]} saves`)];
const fxSadv = t => t === "sadv";
const FX_DMG = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
const fxDmg = t => t === "res" || t === "imm" || t === "vul";
const fxNum = t => !["save", "skill", "exp", "res", "imm", "vul", "cimm", "sadv"].includes(t);
const fxAb = t => t === "ab" || t === "save", fxSkill = t => t === "skill" || t === "exp";
function fxClean(l) {
  return (Array.isArray(l) ? l : []).filter(e => e && HB_FX[e.t]).slice(0, 12).map(e => {
    const o = { t: e.t };
    if (fxNum(e.t)) o.v = clamp(parseInt(e.v) || 0, -100, 100);
    if (fxAb(e.t)) o.a = AB.includes(e.a) ? e.a : "str";
    if (fxSkill(e.t)) o.a = SKILLS[e.a] ? e.a : ALL_SKILLS[0];
    if (fxDmg(e.t)) o.a = FX_DMG.includes(e.a) ? e.a : "fire";
    if (fxCond(e.t)) o.a = FX_COND.includes(e.a) ? e.a : "charmed";
    if (fxSadv(e.t)) o.a = SADV_OPTS.includes(e.a) ? e.a : "charmed";
    if (e.t === "ab") o.max = clamp(parseInt(e.max) || 20, 1, 30);
    return o;
  }).filter(e => !fxNum(e.t) || e.v);
}
function fxText(e) {
  const n = v => (v >= 0 ? "+" : "−") + Math.abs(v);
  return { ac: () => `${n(e.v)} AC`, hp: () => `${n(e.v)} max HP`, hpLv: () => `${n(e.v)} max HP per level`, speed: () => `${n(e.v)} ft speed`, init: () => `${n(e.v)} initiative`,
    atk: () => `${n(e.v)} to weapon attacks`, spell: () => `${n(e.v)} spell save DC and spell attacks`, ab: () => `${n(e.v)} ${AB_NAME[e.a]} (max ${e.max || 20})`,
    save: () => `${AB_NAME[e.a]} saving throw proficiency`, skill: () => `${e.a} proficiency`, exp: () => `${e.a} expertise`,
    res: () => `${e.a} resistance`, imm: () => `${e.a} immunity`, vul: () => `${e.a} vulnerability`, cimm: () => e.a === "exhaustion" ? "immune to exhaustion" : `can't be ${e.a}`,
    sadv: () => / saves$/.test(e.a) ? `advantage on ${e.a}` : `advantage on saves against ${FX_COND.includes(e.a) && e.a !== "exhaustion" ? "being " : ""}${e.a}` }[e.t]();
}
const fxNote = l => { const c = fxClean(l); return c.length ? ` [On the sheet: ${c.map(fxText).join(", ")}.]` : ""; };
// Every homebrew effect a character has: species traits and subrace, background, subclass features reached, feats taken.
function hbEffects(ed, race, sub, bg, cls, subclass, lv, featNames) {
  const out = [], add = (src, l) => fxClean(l).forEach(e => out.push({ ...e, src }));
  const sp = hbAny("species").find(x => x.name === race && hbEdOk(x, ed) && PC_RACES[ed][race] && PC_RACES[ed][race].hb);
  if (sp) { (sp.traits || []).filter(t => (+t.l || 1) <= lv).forEach(t => add(t.n, t.fx)); const su = (sp.subs || []).find(t => t.n === sub); if (su) add(su.n, su.fx); }
  if (HB_BG[bg]) add(`${bg} background`, HB_BG[bg].fx);
  const sc = subclass && hbAny("subclass").find(x => x.name === subclass && x.cls === cls);
  if (sc) (sc.features || []).filter(f => f.n && +f.l <= lv).forEach(f => add(f.n, f.fx));
  featNames.forEach(nm => { const f = hbAny("feat").find(x => x.name === nm && hbEdOk(x, ed)); if (f) add(nm, f.fx); });
  return out;
}
const hbOf = kind => HB.list.filter(x => x.kind === kind);
/* ---- pending homebrew: brought in with a player's imported character, waiting for the DM ----
   It lives on the character (c.hbPending). HB.pend gathers it from the roster so those characters build properly,
   but pickers only read hbOf (HB.list), so nobody else can choose it until the DM approves. */
const pendKey = x => `${x.kind}|${x.kind === "subclass" ? String(x.cls || "").toLowerCase() : ""}|${String(x.name || "").toLowerCase()}`;
const hbAny = kind => [...hbOf(kind), ...HB.pend.filter(x => x.kind === kind)];
function hbPendSync() {
  const have = new Set(HB.list.map(pendKey)), by = new Map();
  for (const c of PCS.roster) for (const e of (c.hbPending || [])) {
    if (!e || !HB_KINDS[e.kind] || !e.name) continue;
    if (e.rejected && !["species", "background"].includes(e.kind)) continue; // rejected subclasses, feats and spells were taken off the character
    const k = pendKey(e); if (have.has(k)) continue;
    if (!by.has(k)) { const { from, rejected, ...clean } = e; by.set(k, { ...clean, pend: true, rejected: !!e.rejected, from: [] }); }
    const x = by.get(k); x.from.push({ id: c.id, name: c.name || "Unnamed" }); if (!e.rejected) x.rejected = false;
  }
  const L = [...by.values()], sig = JSON.stringify(L);
  if (sig === HB.pendSig) return;
  HB.pend = L; HB.pendSig = sig; hbApply();
  if (location.hash === "#homebrew" && typeof renderHomebrew === "function") renderHomebrew();
}
const hbClean = x => { const { from, pend, rejected, ...y } = x; return y; };
async function hbApprove(key) {
  const x = HB.pend.find(e => pendKey(e) === key); if (!x) return;
  if (!(await hbPut(hbClean(x)))) return;
  PCS.roster.forEach(c => { if ((c.hbPending || []).some(e => pendKey(e) === key)) { c.hbPending = c.hbPending.filter(e => pendKey(e) !== key); if (!c.hbPending.length) delete c.hbPending; } });
  pcPersist(); hbPendSync(); renderHomebrew(); toast(`${x.name} added to your homebrew`);
}
async function hbReject(key) {
  const x = HB.pend.find(e => pendKey(e) === key); if (!x) return;
  const keeps = ["species", "background"].includes(x.kind);
  if (!(await confirmBox(`Don't approve ${x.name}?`, keeps ? `${x.from.map(f => f.name).join(", ")} keep${x.from.length > 1 ? "" : "s"} it so the sheet still works, with a note to choose another ${x.kind} with you.` : `It is taken off ${x.from.map(f => f.name).join(", ")}${x.kind === "subclass" ? ", who will be asked to choose another subclass" : ""}.`, "Don't approve"))) return;
  PCS.roster.forEach(c => {
    const e = (c.hbPending || []).find(y => pendKey(y) === key); if (!e) return;
    e.rejected = true;
    if (x.kind === "subclass") { let ch = false; if (c.subclass === x.name && c.cls === x.cls) { c.subclass = null; ch = true; } (c.multi || []).forEach(m => { if (m.subclass === x.name && m.cls === x.cls) { m.subclass = null; ch = true; } }); if (ch) pcRebuild(c); }
    if (x.kind === "feat" && (c.bonusFeats || []).some(b => b.n === x.name)) { c.bonusFeats = c.bonusFeats.filter(b => b.n !== x.name); pcRebuild(c); }
    if (x.kind === "spell") c.prepared = (c.prepared || []).filter(s2 => s2.n !== x.name);
  });
  pcPersist(); hbPendSync(); renderHomebrew(); toast(`${x.name} not approved`);
}
// the note on a sheet whose species or background the DM didn't approve
const hbRejectedHTML = c => (c.hbPending || []).filter(e => e.rejected && ["species", "background"].includes(e.kind)).map(e => `<div class="lv-bar"><span class="lv-need">⚠ Your DM didn't approve ${esc(e.name)}. Talk to them about another ${e.kind}.</span></div>`).join("");
function hbPendHTML() {
  const L = HB.pend.filter(x => !x.rejected); if (!L.length) return "";
  const kindName = { subclass: "subclass", background: "background", feat: "feat", species: "species", spell: "spell" };
  const body = x => [x.desc, ...(x.features || []).map(f => `Level ${f.l} · ${f.n}: ${f.d}`), ...(x.traits || []).map(f => `${f.n}: ${f.d}`)].filter(Boolean).join("\n\n");
  return `<div id="hbPendBox" class="hb-pend-box"><h4>Waiting for approval</h4><p class="hint" style="margin:0 0 6px">Brought in with players' imported characters. Only those characters use them until you approve.</p>
    ${L.map(x => { const k = esc(pendKey(x)); return `<div class="hb-pend" data-pendrow="${k}"><details><summary><b>${esc(x.name)}</b> <small class="muted">${kindName[x.kind]}${x.kind === "subclass" ? ` (${esc(x.cls)})` : ""} · from ${esc(x.from.map(f => f.name).join(", "))}</small></summary><div class="hb-pend-text">${esc(body(x) || "No description.")}</div></details>
      <div class="row" style="gap:6px;margin-top:4px"><button class="btn sm primary" type="button" data-pendact="ok" data-pendkey="${k}">✓ Approve</button><button class="btn sm" type="button" data-pendact="no" data-pendkey="${k}">✕ Don't approve</button></div></div>`; }).join("")}</div>`;
}
function hbApply() {
  const A = HB.applied;
  A.bg.forEach(n => { delete BACKGROUNDS[n]; delete HB_BG[n]; });
  A.races.forEach(([ed, n]) => { delete PC_RACES[ed][n]; });
  A.raceDesc.forEach(n => { delete RACE_DESC[n]; });
  Object.keys(HB_DESC).forEach(k => delete HB_DESC[k]);
  const N = HB.applied = { bg: [], races: [], raceDesc: [] };
  hbAny("background").forEach(x => {
    if (BACKGROUNDS[x.name]) return; // never replace a built-in
    BACKGROUNDS[x.name] = (x.skills || []).filter(k => SKILLS[k]).slice(0, 2); HB_BG[x.name] = x; N.bg.push(x.name);
    HB_DESC[`${x.name} background`] = [x.desc, x.feat ? `Origin feat: ${x.feat}.` : "", x.gear ? `Gear: ${x.gear}.` : ""].filter(Boolean).join(" ") + fxNote(x.fx);
  });
  hbAny("species").forEach(x => {
    const traits = (x.traits || []).filter(t => t.n), subs = (x.subs || []).filter(t => t.n);
    traits.concat(subs).forEach(t => HB_DESC[t.n] = (t.d || "") + fxNote(t.fx));
    ["2014", "2024"].filter(ed => hbEdOk(x, ed) && !PC_RACES[ed][x.name]).forEach(ed => {
      PC_RACES[ed][x.name] = { hb: true, ...(x.pend ? { pend: true } : {}), asi: ed === "2014" ? Object.fromEntries(AB.filter(a => +(x.asi || {})[a]).map(a => [a, +x.asi[a]])) : {}, speed: +x.speed || 30,
        traits: traits.map(t => t.n), skills: (x.skills || []).filter(k => SKILLS[k]), term: x.term || (ed === "2024" ? "Lineage" : "Subrace"),
        ...(subs.length ? { subs: Object.fromEntries(subs.map(t => [t.n, { label: `${t.n}`, traits: [t.n], d: t.d || "" }])) } : {}) };
      N.races.push([ed, x.name]);
    });
    if (!RACE_DESC[x.name]) { RACE_DESC[x.name] = x.desc || ""; N.raceDesc.push(x.name); }
  });
  hbAny("subclass").forEach(x => (x.features || []).forEach(f => { if (f.n) HB_DESC[f.n] = (f.d || "") + fxNote(f.fx); }));
  hbSpellsApply();
}
/* homebrew spells join the spell data (after the built-ins, so built-in ids stay the same) */
function hbSpellsApply() {
  if (!SP.data) return;
  for (const ed of ["2014", "2024"]) {
    const L = SP.data[ed] = SP.data[ed].filter(s => !s.hb);
    hbAny("spell").filter(x => hbEdOk(x, ed)).forEach(x => { const s = { n: x.name, l: +x.l || 0, s: x.s || "", c: x.c || [], t: x.t || "", r: x.r || "", cp: x.cp || "", m: x.m || "", du: x.du || "", co: x.co ? 1 : 0, ri: x.ri ? 1 : 0, d: x.desc || "", h: x.h || "", dt: "", at: "", sv: "", hb: true, ...(x.pend ? { pend: true } : {}) }; spPrep(s, ed, L.length); L.push(s); });
  }
}
function hbRefreshUI() {
  if (window.pcSelectsRefresh) pcSelectsRefresh();
  if (CB.on && location.hash === "#character") renderCB();
  if (location.hash === "#homebrew") renderHomebrew();
}
function hbSet(list) { HB.list = Array.isArray(list) ? list.filter(x => x && HB_KINDS[x.kind] && x.name) : []; HB.pendSig = ""; hbPendSync(); hbApply(); hbRefreshUI(); }
function hbLoadLocal() { let l = []; try { l = JSON.parse(localStorage.getItem(HB_KEY) || "[]"); } catch { } hbSet(l); }
const hbCloud = () => !!(window.Portal && Portal.cloud);
async function hbPut(item) {
  if (hbCloud()) return Portal.hbPut(item);
  const l = HB.list.filter(x => x.id !== item.id).concat(item);
  try { localStorage.setItem(HB_KEY, JSON.stringify(l)); } catch { toast("Couldn't save in this browser"); return false; }
  hbSet(l); return true;
}
async function hbDel(id) {
  if (hbCloud()) return Portal.hbDel(id);
  const l = HB.list.filter(x => x.id !== id);
  try { localStorage.setItem(HB_KEY, JSON.stringify(l)); } catch { }
  hbSet(l); return true;
}
/* ---- races / species by rules edition, with subraces and lineages ---- */
const DRAGON_SUBS = () => Object.fromEntries(Object.entries(DRAGON_ANCESTRY).map(([k, A]) => [k, { label: `${k} Dragonborn`, d: `${A.type[0].toUpperCase() + A.type.slice(1)} breath (${A.shape}, ${A.save} save) and ${A.type} resistance.` }]));
const PC_RACES = {
  "2014": {
    Dwarf: { ...RACE_DATA.Dwarf, term: "Subrace", subs: {
      "Hill Dwarf": { asi: { wis: 1 }, hpLv: 1, traits: ["Dwarven Toughness"], d: "+1 WIS. Hardy and perceptive: +1 hit point every level." },
      "Mountain Dwarf": { asi: { str: 2 }, traits: ["Dwarven Armor Training"], d: "+2 STR. Strong and rugged: trained in light and medium armor." } } },
    Elf: { ...RACE_DATA.Elf, term: "Subrace", subs: {
      "High Elf": { asi: { int: 1 }, traits: ["Elf Weapon Training", "High Elf Cantrip", "Extra language"], d: "+1 INT. Arcane heritage: a free wizard cantrip and elven weapon training." },
      "Wood Elf": { asi: { wis: 1 }, speed: 35, traits: ["Elf Weapon Training", "Fleet of Foot", "Mask of the Wild"], d: "+1 WIS. Swift and stealthy: 35 ft speed, hides in light natural cover." },
      "Drow": { label: "Drow", asi: { cha: 1 }, replace: { "Darkvision 60 ft": "Superior Darkvision 120 ft" }, traits: ["Sunlight Sensitivity", "Drow Magic", "Drow Weapon Training"], d: "+1 CHA. Dark elves of the Underdark: 120 ft darkvision and innate magic, but sunlight hurts." } } },
    Halfling: { ...RACE_DATA.Halfling, term: "Subrace", subs: {
      "Lightfoot Halfling": { asi: { cha: 1 }, traits: ["Naturally Stealthy"], d: "+1 CHA. Can hide behind larger creatures." },
      "Stout Halfling": { asi: { con: 1 }, traits: ["Stout Resilience"], d: "+1 CON. Poison resistance and advantage against poison." } } },
    Human: { ...RACE_DATA.Human, term: "Variant", subs: {
      "Standard Human": { label: "Human", d: "+1 to every ability score." },
      "Variant Human": { asiOverride: {}, plus1: 2, plus1Any: true, extraSkills: 1, traitsOverride: ["Variant: Bonus Skill", "Variant: Feat", "Extra language"], d: "+1 to two scores, one extra skill and a feat at level 1." } } },
    Dragonborn: { ...RACE_DATA.Dragonborn, term: "Draconic ancestry", subs: DRAGON_SUBS() },
    Gnome: { ...RACE_DATA.Gnome, term: "Subrace", subs: {
      "Forest Gnome": { asi: { dex: 1 }, traits: ["Natural Illusionist", "Speak with Small Beasts"], d: "+1 DEX. Minor Illusion and a knack for talking to small animals." },
      "Rock Gnome": { asi: { con: 1 }, traits: ["Artificer's Lore", "Tinker"], d: "+1 CON. Inventors: expert lore on magic items and tiny clockwork gadgets." } } },
    "Half-Elf": { ...RACE_DATA["Half-Elf"] },
    "Half-Orc": { ...RACE_DATA["Half-Orc"] },
    Tiefling: { ...RACE_DATA.Tiefling }
  },
  // 2024: ability score increases come from the background, so species carry none
  "2024": {
    Aasimar: { asi: {}, speed: 30, traits: ["Celestial Resistance", "Darkvision 60 ft", "Healing Hands", "Light Bearer", "Celestial Revelation"] },
    Dragonborn: { asi: {}, speed: 30, term: "Draconic ancestry", traits: ["Draconic Ancestry", "Breath Weapon", "Damage Resistance", "Darkvision 60 ft", "Draconic Flight"], subs: DRAGON_SUBS() },
    Dwarf: { asi: {}, speed: 30, hpLv: 1, traits: ["Darkvision 120 ft", "Dwarven Resilience", "Dwarven Toughness", "Stonecunning"] },
    Elf: { asi: {}, speed: 30, skills: ["Perception"], term: "Elven lineage", traits: ["Darkvision 60 ft", "Fey Ancestry", "Keen Senses", "Trance"], subs: {
      "Drow": { label: "Drow", replace: { "Darkvision 60 ft": "Darkvision 120 ft" }, traits: ["Drow Lineage"], d: "Darkvision 120 ft; Dancing Lights, then Faerie Fire and Darkness." },
      "High Elf": { traits: ["High Elf Lineage"], d: "Prestidigitation, then Detect Magic and Misty Step." },
      "Wood Elf": { speed: 35, traits: ["Wood Elf Lineage"], d: "Speed 35 ft; Druidcraft, then Longstrider and Pass without Trace." } } },
    Gnome: { asi: {}, speed: 30, term: "Gnomish lineage", traits: ["Darkvision 60 ft", "Gnomish Cunning"], subs: {
      "Forest Gnome": { traits: ["Forest Gnome Lineage"], d: "Minor Illusion and Speak with Animals." },
      "Rock Gnome": { traits: ["Rock Gnome Lineage"], d: "Mending, Prestidigitation and tiny clockwork devices." } } },
    Goliath: { asi: {}, speed: 35, term: "Giant ancestry", traits: ["Giant Ancestry", "Large Form", "Powerful Build"], subs: {
      "Cloud Giant": { label: "Goliath (Cloud Giant)", traits: ["Cloud's Jaunt"], d: "Bonus action: teleport 30 ft." },
      "Fire Giant": { label: "Goliath (Fire Giant)", traits: ["Fire's Burn"], d: "Your hits deal an extra 1d10 fire." },
      "Frost Giant": { label: "Goliath (Frost Giant)", traits: ["Frost's Chill"], d: "Your hits deal an extra 1d6 cold and slow the target." },
      "Hill Giant": { label: "Goliath (Hill Giant)", traits: ["Hill's Tumble"], d: "Your hits can knock creatures prone." },
      "Stone Giant": { label: "Goliath (Stone Giant)", traits: ["Stone's Endurance"], d: "Reaction: reduce damage by 1d12 + CON." },
      "Storm Giant": { label: "Goliath (Storm Giant)", traits: ["Storm's Thunder"], d: "Reaction: deal 1d8 thunder to whoever hurt you." } } },
    Halfling: { asi: {}, speed: 30, traits: ["Brave", "Halfling Nimbleness", "Luck", "Naturally Stealthy"] },
    Human: { asi: {}, speed: 30, extraSkills: 1, traits: ["Resourceful", "Skillful", "Versatile"] },
    Orc: { asi: {}, speed: 30, traits: ["Adrenaline Rush", "Darkvision 120 ft", "Relentless Endurance"] },
    Tiefling: { asi: {}, speed: 30, term: "Fiendish legacy", traits: ["Darkvision 60 ft", "Otherworldly Presence"], subs: {
      "Abyssal": { label: "Abyssal Tiefling", traits: ["Abyssal Legacy"], d: "Poison resistance; Poison Spray, Ray of Sickness, Hold Person." },
      "Chthonic": { label: "Chthonic Tiefling", traits: ["Chthonic Legacy"], d: "Necrotic resistance; Chill Touch, False Life, Ray of Enfeeblement." },
      "Infernal": { label: "Infernal Tiefling", traits: ["Infernal Legacy"], d: "Fire resistance; Fire Bolt, Hellish Rebuke, Darkness." } } }
  }
};
Object.assign(RACE_DESC, { Aasimar: "Touched by the heavens: healing hands and a radiant transformation.", Goliath: "Giant-blooded: a giant's boon, and grows Large in battle.", Orc: "Relentless and tireless: bursts of speed, hard to put down." });
const edOf = c => (c && c.ed) || "2014";
const raceList = ed => { const R = PC_RACES[ed] || PC_RACES["2014"]; return Object.keys(R).filter(x => !R[x].pend); };
function raceInfo(ed, race, sub) {
  const B = (PC_RACES[ed] || PC_RACES["2014"])[race] || RACE_DATA[race] || { asi: {}, speed: 30, traits: [] };
  const S = (B.subs && sub && B.subs[sub]) || null;
  const R = { asi: { ...B.asi }, plus1: B.plus1 || 0, plus1Any: false, speed: B.speed, skills: [...(B.skills || [])], extraSkills: B.extraSkills || 0, hpLv: B.hpLv || 0, traits: [...(B.traits || [])] };
  if (S) {
    if (S.asiOverride) R.asi = { ...S.asiOverride };
    Object.entries(S.asi || {}).forEach(([a, v]) => R.asi[a] = (R.asi[a] || 0) + v);
    if (S.plus1) { R.plus1 = S.plus1; R.plus1Any = !!S.plus1Any; }
    if (S.speed) R.speed = S.speed;
    if (S.extraSkills) R.extraSkills += S.extraSkills;
    if (S.hpLv) R.hpLv += S.hpLv;
    if (S.traitsOverride) R.traits = [...S.traitsOverride];
    if (S.replace) R.traits = R.traits.map(t => S.replace[t] || t);
    R.traits.push(...(S.traits || []));
  }
  return R;
}
function subLabel(ed, race, sub) {
  const B = (PC_RACES[ed] || PC_RACES["2014"])[race], S = B && B.subs && sub && B.subs[sub];
  if (!S) return race;
  return S.label || (sub.includes(race) ? sub : `${sub} ${race}`);
}
const raceLabel = c => subLabel(edOf(c), c.race, c.sub || (c.race === "Dragonborn" ? c.ancestry : null));
const FEAT_DESC_2024 = {
  Stonecunning: "Bonus action: tremorsense 60 ft for 10 minutes while on stone, proficiency-bonus times per long rest.",
  "Keen Senses": "Proficiency in Insight, Perception or Survival (Perception chosen; change it in My Characters).",
  "Infernal Legacy": "Fire resistance; Fire Bolt cantrip, Hellish Rebuke at 3rd level, Darkness at 5th.",
  Trance: "You don't need sleep; a 4-hour trance gives you a long rest."
};
Object.assign(FEAT_DESC, {
  "Dwarven Toughness": "+1 hit point per level (already included).", "Dwarven Armor Training": "Proficiency with light and medium armor.",
  "Elf Weapon Training": "Proficiency with longswords, shortswords, shortbows and longbows.", "High Elf Cantrip": "One wizard cantrip of your choice, cast with INT.",
  "Fleet of Foot": "Base walking speed of 35 ft (included).", "Mask of the Wild": "Hide when only lightly obscured by foliage, rain, snow or mist.",
  "Superior Darkvision 120 ft": "See 120 ft in dim light as if bright, and in darkness in shades of grey.",
  "Sunlight Sensitivity": "Disadvantage on attacks and sight-based Perception in direct sunlight.",
  "Drow Magic": "Dancing Lights cantrip; Faerie Fire at 3rd level and Darkness at 5th, once per long rest each.",
  "Drow Weapon Training": "Proficiency with rapiers, shortswords and hand crossbows.",
  "Naturally Stealthy": "Hide even when only obscured by a creature larger than you.",
  "Stout Resilience": "Advantage on saves against poison; resistance to poison damage.",
  "Natural Illusionist": "Minor Illusion cantrip, cast with INT.", "Speak with Small Beasts": "Communicate simple ideas with Small or smaller beasts.",
  "Artificer's Lore": "Double proficiency on History checks about magic items, alchemy and technology.",
  Tinker: "Build tiny clockwork toys, fire starters and music boxes.",
  "Variant: Bonus Skill": "Proficiency in one skill of your choice (included above).", "Variant: Feat": "One feat of your choice at level 1 — note it under Features in My Characters.",
  "Celestial Resistance": "Resistance to necrotic and radiant damage.", "Healing Hands": "Magic action: heal proficiency-bonus d4s, once per long rest.",
  "Light Bearer": "Light cantrip, cast with CHA.", "Celestial Revelation": "From level 3, transform for a minute as a bonus action: spectral wings, searing radiance or a necrotic shroud.",
  "Draconic Flight": "From level 5, sprout spectral wings for 10 minutes once per long rest, flying at your walking speed.",
  "Darkvision 120 ft": "See 120 ft in dim light as if bright, and in darkness in shades of grey.",
  "Drow Lineage": "Darkvision 120 ft; Dancing Lights cantrip, Faerie Fire at 3rd level, Darkness at 5th.",
  "High Elf Lineage": "Prestidigitation (swap for another wizard cantrip each long rest); Detect Magic at 3rd, Misty Step at 5th.",
  "Wood Elf Lineage": "Speed 35 ft; Druidcraft cantrip, Longstrider at 3rd level, Pass without Trace at 5th.",
  "Gnomish Cunning": "Advantage on INT, WIS and CHA saving throws.",
  "Forest Gnome Lineage": "Minor Illusion cantrip; Speak with Animals proficiency-bonus times per long rest.",
  "Rock Gnome Lineage": "Mending and Prestidigitation cantrips; build tiny clockwork devices.",
  "Giant Ancestry": "A boon from your giant heritage (listed below), usable proficiency-bonus times per long rest.",
  "Cloud's Jaunt": "Bonus action: teleport up to 30 ft to a space you can see.", "Fire's Burn": "When you hit with an attack, deal an extra 1d10 fire damage.",
  "Frost's Chill": "When you hit, deal an extra 1d6 cold damage and cut the target's speed by 10 ft.", "Hill's Tumble": "When you hit a Large or smaller creature, knock it prone.",
  "Stone's Endurance": "Reaction when damaged: reduce the damage by 1d12 + CON.", "Storm's Thunder": "Reaction when a creature within 60 ft damages you: deal it 1d8 thunder damage.",
  "Large Form": "From level 5, become Large for 10 minutes once per long rest: advantage on STR checks, +10 ft speed.",
  "Powerful Build": "Advantage to end being grappled; count as one size larger for carrying capacity.",
  Luck: "When you roll a 1 on a d20 Test, reroll it and use the new roll.",
  Resourceful: "Gain Heroic Inspiration whenever you finish a long rest.", Skillful: "Proficiency in one skill of your choice (included above).",
  Versatile: "Gain an Origin feat of your choice, such as Alert, Skilled or Tough.",
  "Adrenaline Rush": "Bonus action: Dash and gain temporary HP equal to your proficiency bonus, proficiency-bonus times per long rest.",
  "Otherworldly Presence": "Thaumaturgy cantrip.",
  "Abyssal Legacy": "Poison resistance; Poison Spray cantrip, Ray of Sickness at 3rd level, Hold Person at 5th.",
  "Chthonic Legacy": "Necrotic resistance; Chill Touch cantrip, False Life at 3rd level, Ray of Enfeeblement at 5th."
});
/* Full rules text for class features, opened by clicking a feature on a character sheet.
   Written to cover both rule sets; where the 2024 rules differ the text says so. */
const FEAT_FULL = {
  // Barbarian
  Rage: "On your turn you can enter a rage as a bonus action, if you aren't wearing heavy armor. While raging you have advantage on Strength checks and Strength saving throws, you add your rage damage bonus to damage rolls of melee attacks that use Strength, and you have resistance to bludgeoning, piercing and slashing damage. You can't cast spells or concentrate on them while raging. The rage lasts 1 minute (2024: until the end of your next turn, extended each turn you attack, force a save or take a bonus action to extend it, up to 10 minutes). It ends early if you are knocked unconscious, don heavy armor, or (2014) end a turn without having attacked or taken damage since your last turn. Rages are regained on a long rest (2024: you also regain one on a short rest).",
  "Unarmored Defense": "While you are not wearing armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier (Barbarian) or Wisdom modifier (Monk). A barbarian can still use a shield and keep this benefit; a monk loses it when using a shield.",
  "Reckless Attack": "When you make your first attack on your turn, you can decide to attack recklessly. Doing so gives you advantage on melee weapon attack rolls using Strength during this turn (2024: all attack rolls using Strength), but attack rolls against you have advantage until your next turn.",
  "Danger Sense": "You have advantage on Dexterity saving throws against effects you can see, such as traps and spells. You don't gain this benefit while blinded, deafened or incapacitated.",
  "Primal Path": "At 3rd level you choose a path that shapes the nature of your rage, such as the Path of the Berserker. It grants features at 3rd, 6th, 10th and 14th level.",
  "Extra Attack": "You can attack twice, instead of once, whenever you take the Attack action on your turn. If you also have the Extra Attack feature from another class, the two don't add together.",
  "Extra Attack (2)": "You can attack three times, instead of once, whenever you take the Attack action on your turn.",
  "Extra Attack (3)": "You can attack four times, instead of once, whenever you take the Attack action on your turn.",
  "Fast Movement": "Your speed increases by 10 feet while you aren't wearing heavy armor.",
  "Feral Instinct": "You have advantage on initiative rolls. In the 2014 rules, if you are surprised at the start of combat and aren't incapacitated, you can act normally on your first turn as long as you enter your rage before doing anything else.",
  "Brutal Critical": "When you score a critical hit with a melee weapon attack, roll one additional weapon damage die and add it to the extra damage of the critical hit. This rises to two additional dice at 13th level and three at 17th. (2024: replaced by Brutal Strike — forgo advantage on a Reckless Attack to deal an extra 1d10 damage and add a Forceful Blow or Hamstring Blow effect.)",
  "Relentless Rage": "If you drop to 0 hit points while raging and don't die outright, you can make a DC 10 Constitution saving throw. On a success you drop to 1 hit point instead (2024: to twice your barbarian level). Each time you use this feature after the first, the DC rises by 5; it resets to 10 after a short or long rest.",
  "Persistent Rage": "Your rage is so fierce that it ends early only if you fall unconscious or you choose to end it. In the 2024 rules you also regain all expended rages when you roll initiative, once per long rest, and your rage lasts 10 minutes without needing to be extended.",
  "Indomitable Might": "If your total for a Strength check (2024: or Strength saving throw) is less than your Strength score, you can use that score in place of the total.",
  "Primal Champion": "You embody the power of the wilds. Your Strength and Constitution scores increase by 4, and your maximum for those scores is now 24.",
  // Spellcasting (shared)
  Spellcasting: "You can cast spells from your class's spell list. Cantrips can be cast at will. To cast a spell of 1st level or higher you expend a spell slot of that level or higher; you regain all expended slots when you finish a long rest. Your spellcasting ability sets your spell save DC (8 + proficiency bonus + ability modifier) and your spell attack bonus (proficiency bonus + ability modifier), both shown under Attacks & Spellcasting. Prepared casters choose their spells from the class list after each long rest; known casters change them when they gain a level. Use the slot counters on this sheet to track what you've spent.",
  // Bard
  "Bardic Inspiration": "As a bonus action, choose one creature other than yourself within 60 feet that can hear you. It gains a Bardic Inspiration die (d6, rising to d8 at 5th level, d10 at 10th and d12 at 15th). Once within the next 10 minutes (2024: within the next hour) it can roll the die and add the number to one ability check, attack roll or saving throw — after seeing its roll but before knowing whether it succeeds (2024: after failing the roll). You can use this a number of times equal to your Charisma modifier (minimum once), and regain the uses on a long rest (on a short rest too from 5th level).",
  "Jack of All Trades": "You can add half your proficiency bonus, rounded down, to any ability check you make that doesn't already include your proficiency bonus. This is already counted in the skill numbers on this sheet.",
  "Song of Rest": "If you or any friendly creatures who can hear your performance regain hit points by spending Hit Dice during a short rest, each of those creatures regains an extra 1d6 hit points (1d8 at 9th level, 1d10 at 13th, 1d12 at 17th). Not in the 2024 rules.",
  "Bard College": "At 3rd level you join a bard college, such as the College of Lore, which grants features at 3rd, 6th and 14th level.",
  Expertise: "Choose two skills you are proficient in. Your proficiency bonus is doubled for any ability check that uses either of them. Skills with expertise are marked ★ on this sheet. Bards gain two more at 10th level; rogues gain two at 1st and two more at 6th.",
  "Font of Inspiration": "You regain all expended uses of Bardic Inspiration when you finish a short or long rest.",
  Countercharm: "As an action you can start a performance that lasts until the end of your next turn. During that time you and friendly creatures within 30 feet have advantage on saving throws against being frightened or charmed. (2024: as a reaction when you or an ally within 30 feet fails a save against being charmed or frightened, the creature can reroll with advantage.)",
  "Magical Secrets": "You learn two spells of your choice from any class's spell list (more at 14th and 18th level). They count as bard spells for you. In the 2024 rules you can instead prepare spells from the bard, cleric, druid and wizard lists whenever you change your prepared spells.",
  "Superior Inspiration": "When you roll initiative and have no uses of Bardic Inspiration left, you regain one use (2024: you regain expended uses until you have two).",
  // Cleric
  "Divine Domain": "At 1st level (2024: 3rd level) you choose a domain related to your deity, such as Life or Light. It grants domain spells that are always prepared and features at several levels.",
  "Channel Divinity": "You can channel divine energy directly from your deity to fuel magical effects. Every cleric can Turn Undead: as an action, each undead within 30 feet that can see or hear you makes a Wisdom saving throw against your spell save DC; on a failure it is turned for 1 minute, spending its turns moving away from you. Your domain adds more options, and the 2024 rules add Divine Spark (heal or deal radiant/necrotic damage of 1d8 + Wisdom modifier, more dice at higher levels). Clerics have one use (two at 6th level, three at 18th) and regain them on a short or long rest; in the 2024 rules you have two uses, regain one on a short rest and all on a long rest. Paladins gain Channel Divinity from their Sacred Oath.",
  "Destroy Undead": "When an undead fails its saving throw against your Turn Undead, it is instantly destroyed if its challenge rating is at or below a threshold: CR 1/2 at 5th level, 1 at 8th, 2 at 11th, 3 at 14th and 4 at 17th. (2024: Sear Undead — a turned undead also takes radiant damage equal to a number of d8s equal to your Wisdom modifier.)",
  "Divine Intervention": "You can call on your deity to intervene on your behalf. In the 2014 rules, describe the help you seek and roll percentile dice: if you roll equal to or lower than your cleric level, your deity intervenes; afterwards you can't use this again for 7 days (on a failure, until your next long rest). At 20th level it succeeds automatically. In the 2024 rules you can cast any cleric spell of 5th level or lower without a slot or components once per long rest.",
  // Druid
  Druidic: "You know Druidic, the secret language of druids. You can speak it and use it to leave hidden messages; others spot the message with a DC 15 Wisdom (Perception) check but can't decipher it without magic.",
  "Wild Shape": "As an action (2024: a bonus action) you can magically assume the shape of a beast you have seen before. The maximum challenge rating is 1/4 with no flying or swimming speed at 2nd level, 1/2 with no flying speed at 4th, and 1 at 8th. You stay in that form for hours equal to half your druid level, keep your own Intelligence, Wisdom and Charisma, and use the beast's hit points (2014) or gain temporary hit points equal to your druid level (2024). You can use this twice and regain uses on a short or long rest (2024: two uses, three at 6th, four at 17th; regain one on a short rest and all on a long rest).",
  "Druid Circle": "At 2nd level (2024: 3rd level) you choose a druid circle, such as the Circle of the Land or the Moon, which grants features at several levels.",
  "Timeless Body": "The primal magic you wield slows your aging. For every 10 years that pass, your body ages only 1 year.",
  "Beast Spells": "You can cast many of your druid spells in any shape you assume using Wild Shape, performing the somatic and verbal components, though you can't provide material components.",
  Archdruid: "You can use Wild Shape an unlimited number of times. You can also ignore the verbal and somatic components of your druid spells, and material components that lack a cost and aren't consumed. (2024: you regain a Wild Shape use when you roll initiative with none left, and can convert Wild Shape uses into spell slots.)",
  // Fighter
  "Fighting Style": "You adopt a style of fighting as your specialty, such as Archery (+2 to ranged weapon attack rolls), Defense (+1 AC while wearing armor), Dueling (+2 damage with a one-handed melee weapon and no other weapon), Great Weapon Fighting (reroll 1s and 2s on damage with two-handed weapons; 2024: treat them as 3s), Protection (impose disadvantage on an attack against an adjacent ally while you hold a shield) or Two-Weapon Fighting (add your ability modifier to the off-hand attack's damage). Note your choice under Features.",
  "Second Wind": "You have a limited well of stamina. On your turn you can use a bonus action to regain hit points equal to 1d10 + your fighter level. You can use it once per short or long rest (2024: two uses, three at 4th level and four at 10th; regain one on a short rest and all on a long rest).",
  "Action Surge": "On your turn you can take one additional action. Once you use this feature you must finish a short or long rest before you can use it again. From 17th level you can use it twice before a rest, but only once on the same turn.",
  "Martial Archetype": "At 3rd level you choose an archetype that shapes your fighting technique, such as the Champion or Battle Master. It grants features at 3rd, 7th, 10th, 15th and 18th level.",
  Indomitable: "You can reroll a saving throw that you fail, and must use the new roll (2024: adding your fighter level to it). You can use this once per long rest, twice from 13th level and three times from 17th.",
  // Monk
  "Martial Arts": "While you are unarmed or wielding only monk weapons and aren't wearing armor or a shield, you can use Dexterity instead of Strength for unarmed strikes and monk weapons, you roll your Martial Arts die in place of their normal damage (d4 rising to d10 in 2014; d6 rising to d12 in 2024), and when you take the Attack action with them you can make one unarmed strike as a bonus action.",
  Ki: "You can spend ki points (2024: Focus Points) to fuel special techniques. You have points equal to your monk level and regain them all on a short or long rest. Flurry of Blows: after you take the Attack action, spend 1 point to make two unarmed strikes as a bonus action. Patient Defense: spend 1 point to take the Dodge action as a bonus action (2024: Disengage for free, or Disengage and Dodge for 1 point). Step of the Wind: spend 1 point to take the Disengage or Dash action as a bonus action, and your jump distance is doubled for the turn. Your ki save DC is 8 + proficiency bonus + Wisdom modifier.",
  "Unarmored Movement": "Your speed increases by 10 feet while you aren't wearing armor or wielding a shield, rising to +15 at 6th level, +20 at 10th, +25 at 14th and +30 at 18th. From 9th level you can move along vertical surfaces and across liquids on your turn without falling.",
  "Monastic Tradition": "At 3rd level you commit to a monastic tradition, such as the Way of the Open Hand, which grants features at 3rd, 6th, 11th and 17th level.",
  "Deflect Missiles": "When you are hit by a ranged weapon attack, you can use your reaction to reduce the damage by 1d10 + your Dexterity modifier + your monk level. If you reduce it to 0, you can catch the missile and spend 1 ki point to throw it back as part of the same reaction (2024: Deflect Attacks works on melee attacks too, and the redirected attack deals two Martial Arts dice + Dexterity modifier).",
  "Slow Fall": "You can use your reaction when you fall to reduce any falling damage you take by an amount equal to five times your monk level.",
  "Stunning Strike": "When you hit another creature with a melee weapon attack (2024: with a monk weapon or unarmed strike), you can spend 1 ki point to attempt a stunning strike. The target must succeed on a Constitution saving throw against your ki save DC or be stunned until the end of your next turn (2024: on a success its speed is halved and the next attack against it has advantage). In the 2024 rules you can use it only once per turn.",
  Evasion: "When you are subjected to an effect that allows a Dexterity saving throw for half damage, you take no damage on a success and only half damage on a failure. You can't use this while incapacitated.",
  "Stillness of Mind": "You can use your action to end one effect on yourself that is causing you to be charmed or frightened. (2024: replaced by Self-Restoration, which ends the effect at the end of your turn for free.)",
  "Purity of Body": "Your mastery of the ki flowing through you makes you immune to disease and poison.",
  "Diamond Soul": "You gain proficiency in all saving throws. When you fail a saving throw, you can spend 1 ki point to reroll it and take the second result.",
  "Empty Body": "You can spend 4 ki points to become invisible for 1 minute, gaining resistance to all damage except force damage. For 8 ki points you can cast astral projection on yourself without material components. (2024: Superior Defense — spend 3 Focus Points to gain resistance to all damage except force for 1 minute.)",
  "Perfect Self": "When you roll initiative and have no ki points remaining, you regain 4 ki points. (2024: your Dexterity and Wisdom rise by 4, to a maximum of 25.)",
  // Paladin
  "Divine Sense": "As an action you can sense the location of any celestial, fiend or undead within 60 feet that is not behind total cover, and any place or object consecrated or desecrated there. You can use it a number of times equal to 1 + your Charisma modifier per long rest. (2024: an option of your Channel Divinity.)",
  "Lay on Hands": "You have a pool of healing power equal to five times your paladin level, restored on a long rest. As an action (2024: a bonus action) you can touch a creature and restore any number of hit points from the pool. Alternatively you can spend 5 points from the pool to cure the target of one disease or neutralize one poison affecting it.",
  "Divine Smite": "When you hit a creature with a melee weapon attack, you can expend a spell slot to deal radiant damage in addition to the weapon's damage: 2d8 for a 1st-level slot plus 1d8 for each slot level above 1st, to a maximum of 5d8. The damage rises by 1d8 against undead or fiends. (2024: Divine Smite is a spell you always have prepared, cast as a bonus action right after you hit, and once per long rest you can cast it without a slot.)",
  "Divine Health": "The divine magic flowing through you makes you immune to disease.",
  "Sacred Oath": "At 3rd level you swear an oath, such as the Oath of Devotion, which grants oath spells, Channel Divinity options and features at 3rd, 7th, 15th and 20th level.",
  "Aura of Protection": "Whenever you or a friendly creature within 10 feet of you must make a saving throw, it gains a bonus equal to your Charisma modifier (minimum +1). You must be conscious. The range grows to 30 feet at 18th level.",
  "Aura of Courage": "You and friendly creatures within 10 feet of you can't be frightened while you are conscious. The range grows to 30 feet at 18th level.",
  "Improved Divine Smite": "Whenever you hit a creature with a melee weapon, it takes an extra 1d8 radiant damage. (2024: Radiant Strikes, the same benefit for melee weapons and unarmed strikes.)",
  "Cleansing Touch": "You can use your action to end one spell on yourself or on one willing creature that you touch. You can use it a number of times equal to your Charisma modifier (minimum once) per long rest.",
  // Ranger
  "Favored Enemy": "In the 2014 rules, choose a type of favored enemy (such as beasts or undead); you have advantage on Wisdom (Survival) checks to track them and Intelligence checks to recall information about them, and you learn one of their languages. More types at 6th and 14th level. In the 2024 rules you always have Hunter's Mark prepared and can cast it without a spell slot twice per long rest (three at 5th level, four at 9th, five at 13th, six at 17th).",
  "Natural Explorer": "Choose a favored terrain. While traveling in it for an hour or more, difficult terrain doesn't slow your group, you can't become lost except by magic, you remain alert while doing other things, you can move stealthily at a normal pace when alone, you find twice as much food, and you learn exact numbers of tracked creatures. More terrains at 6th and 10th level. (2024: replaced by Deft Explorer — expertise in one skill and two languages.)",
  "Ranger Archetype": "At 3rd level you choose an archetype, such as the Hunter, which grants features at 3rd, 7th, 11th and 15th level.",
  "Primeval Awareness": "You can spend a ranger spell slot to focus your awareness on the region around you. For 1 minute per level of the slot you can sense whether aberrations, celestials, dragons, elementals, fey, fiends and undead are within 1 mile (6 miles in your favored terrain). Not in the 2024 rules.",
  "Land's Stride": "Moving through nonmagical difficult terrain costs you no extra movement, and you can pass through nonmagical plants without being slowed or harmed by thorns. You have advantage on saving throws against plants created or manipulated by magic.",
  "Hide in Plain Sight": "You can spend 1 minute creating camouflage for yourself. Until you move or take an action or reaction, you gain +10 to Dexterity (Stealth) checks while pressed against a solid surface. (2024: replaced by Nature's Veil — become invisible until the end of your next turn as a bonus action.)",
  Vanish: "You can use the Hide action as a bonus action on your turn, and you can't be tracked by nonmagical means unless you choose to leave a trail.",
  "Feral Senses": "You gain preternatural senses. In the 2014 rules, attacking a creature you can't see doesn't impose disadvantage, and you are aware of invisible creatures within 30 feet that aren't hidden from you. In the 2024 rules you gain blindsight with a range of 30 feet.",
  "Foe Slayer": "Once on each of your turns you can add your Wisdom modifier to the attack roll or the damage roll of an attack you make against one of your favored enemies. (2024: the damage die of your Hunter's Mark becomes a d10.)",
  // Rogue
  "Sneak Attack": "Once per turn, you can deal extra damage to one creature you hit with an attack if you have advantage on the attack roll. The attack must use a finesse or a ranged weapon. You don't need advantage if another enemy of the target is within 5 feet of it, that enemy isn't incapacitated, and you don't have disadvantage. The extra damage is shown under Abilities and grows by 1d6 every odd rogue level.",
  "Thieves' Cant": "You know thieves' cant, a secret mix of dialect, jargon and code that lets you hide messages in seemingly normal conversation, plus a set of secret signs and symbols for short messages such as whether an area is dangerous.",
  "Cunning Action": "Your quick thinking and agility let you move and act quickly. You can take a bonus action on each of your turns to take the Dash, Disengage or Hide action.",
  "Roguish Archetype": "At 3rd level you choose an archetype, such as the Thief, Assassin or Arcane Trickster, which grants features at 3rd, 9th, 13th and 17th level.",
  "Uncanny Dodge": "When an attacker that you can see hits you with an attack, you can use your reaction to halve the attack's damage against you.",
  "Reliable Talent": "Whenever you make an ability check that lets you add your proficiency bonus, you can treat a d20 roll of 9 or lower as a 10.",
  Blindsense: "If you are able to hear, you are aware of the location of any hidden or invisible creature within 10 feet of you. Not in the 2024 rules.",
  "Slippery Mind": "You have acquired greater mental strength. You gain proficiency in Wisdom saving throws (2024: and Charisma saving throws).",
  Elusive: "You are so evasive that attackers rarely gain the upper hand against you. No attack roll has advantage against you while you aren't incapacitated.",
  "Stroke of Luck": "If your attack misses a target within range, you can turn the miss into a hit. Alternatively, if you fail an ability check, you can treat the d20 roll as a 20. Once you use this feature you can't use it again until you finish a short or long rest.",
  // Sorcerer
  "Sorcerous Origin": "At 1st level (2024: 3rd level) you choose the source of your innate magic, such as Draconic Bloodline or Wild Magic, which grants features at several levels.",
  "Font of Magic": "You have sorcery points equal to your sorcerer level, regained on a long rest. As a bonus action you can turn an unexpended spell slot into sorcery points equal to the slot's level, or spend points to create a slot: 2 points for a 1st-level slot, 3 for 2nd, 5 for 3rd, 6 for 4th and 7 for 5th. You can't create slots above 5th level, and created slots vanish on a long rest.",
  Metamagic: "You learn two Metamagic options (more at 10th and 17th level) that let you twist your spells by spending sorcery points, such as Careful Spell (protect allies from your area spells, 1 point), Distant Spell (double the range, 1 point), Empowered Spell (reroll damage dice, 1 point), Extended Spell (double the duration, 1 point), Heightened Spell (one target has disadvantage on its first save, 3 points), Quickened Spell (cast as a bonus action, 2 points), Subtle Spell (no verbal or somatic components, 1 point) and Twinned Spell (target a second creature, points equal to the spell's level). Usually only one option per spell.",
  "Sorcerous Restoration": "You regain 4 expended sorcery points whenever you finish a short rest (2024: once per long rest, regain sorcery points up to half your sorcerer level when you finish a short rest).",
  // Warlock
  "Otherworldly Patron": "At 1st level (2024: 3rd level) you strike a bargain with an otherworldly being, such as the Archfey, the Fiend or the Great Old One. Your patron grants expanded spells and features at several levels.",
  "Pact Magic": "Your arcane research and the magic bestowed by your patron give you spells. You have a small number of spell slots, all of the same level, and you regain all of them when you finish a short or long rest. The number and level of your slots are shown under Attacks & Spellcasting. Charisma is your spellcasting ability.",
  "Eldritch Invocations": "You learn fragments of forbidden knowledge that grant lasting magical abilities, such as Agonizing Blast (add Charisma to eldritch blast damage), Armor of Shadows (cast mage armor at will) or Devil's Sight (see in magical darkness to 120 feet). You learn two at 2nd level (2024: one at 1st) and more as you level; you can swap one when you gain a level. Note yours under Features.",
  "Pact Boon": "At 3rd level your patron grants a gift: Pact of the Chain (an improved familiar), Pact of the Blade (summon a magic weapon you are proficient with) or Pact of the Tome (a Book of Shadows with three extra cantrips). In the 2024 rules these are Eldritch Invocations.",
  "Mystic Arcanum": "Your patron grants a magical secret: choose one 6th-level warlock spell. You can cast it once without a spell slot and regain the ability on a long rest. You gain a 7th-level spell at 13th level, an 8th-level at 15th and a 9th-level at 17th, each usable once per long rest.",
  "Eldritch Master": "You can spend 1 minute entreating your patron to regain all your expended Pact Magic spell slots. Once you do so, you must finish a long rest before you can do it again. (2024: your Magical Cunning restores all your slots instead of half.)",
  // Wizard
  "Arcane Recovery": "Once per day when you finish a short rest, you can choose expended spell slots to recover. The slots can have a combined level equal to or less than half your wizard level (rounded up), and none of them can be 6th level or higher.",
  "Arcane Tradition": "At 2nd level (2024: 3rd level) you choose a school of magic, such as Evocation or Abjuration, which grants features at several levels.",
  "Spell Mastery": "Choose a 1st-level and a 2nd-level wizard spell in your spellbook. You can cast those spells at their lowest level without expending a spell slot when you have them prepared. You can change them by studying for 8 hours.",
  "Signature Spells": "Choose two 3rd-level wizard spells in your spellbook as your signature spells. You always have them prepared, they don't count against your prepared spells, and you can cast each once at 3rd level without a spell slot, regaining the ability on a short or long rest."
};
/* ---- species features that arrive at later character levels ----
   [level, spell or null, description]: a spell entry adds "Spell (Trait)" at that level; null means the trait itself
   only switches on at that level, so it is hidden from the level-1 traits until then. */
const RACE_LV = {
  "2014": {
    "Infernal Legacy": [[3, "Hellish Rebuke", "Cast Hellish Rebuke as a 2nd-level spell once per long rest, using CHA."], [5, "Darkness", "Cast Darkness once per long rest, using CHA."]],
    "Drow Magic": [[3, "Faerie Fire", "Cast Faerie Fire once per long rest, using CHA."], [5, "Darkness", "Cast Darkness once per long rest, using CHA."]]
  },
  "2024": {
    "Celestial Revelation": [[3, null]], "Draconic Flight": [[5, null]], "Large Form": [[5, null]],
    "Drow Lineage": [[3, "Faerie Fire"], [5, "Darkness"]], "High Elf Lineage": [[3, "Detect Magic"], [5, "Misty Step"]], "Wood Elf Lineage": [[3, "Longstrider"], [5, "Pass without Trace"]],
    "Abyssal Legacy": [[3, "Ray of Sickness"], [5, "Hold Person"]], "Chthonic Legacy": [[3, "False Life"], [5, "Ray of Enfeeblement"]], "Infernal Legacy": [[3, "Hellish Rebuke"], [5, "Darkness"]]
  }
};
Object.entries(RACE_LV["2014"]).forEach(([t, l]) => l.forEach(([, sp, d]) => { if (sp) FEAT_DESC[`${sp} (${t})`] = d; }));
Object.entries(RACE_LV["2024"]).forEach(([t, l]) => l.forEach(([, sp]) => { if (sp) FEAT_DESC_2024[`${sp} (${t})`] = `You always have ${sp} prepared. Cast it once per long rest without a spell slot, or with any spell slots you have.`; }));
// Features a character's species gives by `lv`, and the traits that stay hidden until their level.
function raceLevelFeats(ed, race, traits, lv) {
  const feats = [], hidden = new Set(), M = RACE_LV[ed] || {};
  (traits || []).forEach(t => (M[t] || []).forEach(([l, sp]) => { if (!sp) hidden.add(t); if (lv >= l) feats.push({ l, f: sp ? `${sp} (${t})` : t, race: true }); }));
  const hb = PC_RACES[ed] && PC_RACES[ed][race] && PC_RACES[ed][race].hb && hbAny("species").find(x => x.name === race);
  if (hb) (hb.traits || []).filter(t => t.n && (+t.l || 1) > 1).forEach(t => { hidden.add(t.n); if (lv >= +t.l) feats.push({ l: +t.l, f: t.n, race: true }); });
  return { feats, hidden };
}
function featDesc(f, c) {
  if (f === "Subclass: not chosen yet") return "Pick your subclass with the Choose subclass button on this sheet.";
  if (f.startsWith("Subclass: ")) return subclassDesc(f.slice(10));
  if (f.startsWith("Background: ")) return bgSummary(edOf(c), f.slice(12));
  { const bf = Object.values(BG_DATA["2014"]).find(B => B.feature[0] === f); if (bf) return `${bf.feature[1]} (From your background.)`; }
  if (f.startsWith("Ability Score Improvement: ")) return "Your choice at this level — already applied to the scores above.";
  if (f.startsWith("Ability Score Improvement")) return "+2 to ability scores at set levels — already applied to the scores above.";
  if (f.startsWith("Feat: ")) { const nm = f.slice(6).replace(/ \(\+.*\)$/, ""), F = featInfo(edOf(c), nm) || featInfo("2014", nm) || featInfo("2024", nm); return F ? F[3] : "A feat taken instead of an Ability Score Improvement. Note its details under Features."; }
  if (f === "Unarmored Defense") return c && c.cls === "Monk" ? "Without armor, AC = 10 + DEX + WIS." : "Without armor, AC = 10 + DEX + CON.";
  const A = c && c.ancestry && DRAGON_ANCESTRY[c.ancestry];
  if (f === "Draconic Ancestry") return A ? `${c.ancestry} dragon: your breath weapon and resistance are ${A.type}.` : "Your dragon color sets your breath weapon and resistance.";
  if (f === "Breath Weapon") return edOf(c) === "2024" ? (A ? `Replace one attack: exhale ${A.type} in a 15 ft cone or 30 ft line (DEX save) — damage and DC under Attacks.` : "Replace one attack with a cone or line of energy; damage and DC under Attacks.") : A ? `Exhale ${A.type} in a ${A.shape} (${A.save} save) — damage and DC under Attacks.` : "Exhale destructive energy; damage and DC under Attacks.";
  const sd = subFeatDesc(f, c); if (sd) return sd;
  if (edOf(c) === "2024" && FEAT_DESC_2024[f]) return FEAT_DESC_2024[f];
  if (f === "Damage Resistance") return A ? `Resistance to ${A.type} damage.` : "Resistance to your ancestry's damage type.";
  return FEAT_DESC[f] || HB_DESC[f] || "";
}
function featLi(f, tag, c, edit) {
  const d = featDesc(f, c), full = subFeatDesc(f, c) ? "" : FEAT_FULL[f];
  const head = `<b>${esc(f)}</b> <span class="muted" style="font-size:13px">(${tag})</span>${d ? `<div class="ft-desc">${esc(d)}</div>` : ""}${edit && CHOICES[f] ? choiceHTML(c, f) : ""}`;
  return full ? `<li class="ft-li"><details><summary title="Show the full description">${head}</summary><div class="ft-full">${esc(full)}</div></details></li>` : `<li>${head}</li>`;
}

/* ---- step-by-step custom character builder ---- */
const CB = { on: false, step: 0, ed: "2024", race: "", sub: "", cls: "", bg: "", method: "array", pool: null, rolls: null, assignIdx: {}, manual: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }, bonus: "flex", plus2: "", plus1: "", skills: new Set(), name: "", level: 1, align: "True neutral" };
const CB_STEPS = ["Race", "Class", "Background", "Abilities", "Skills", "Details"];
function cbStart() { CB.on = true; CB.step = 0; if (!PC_RACES[CB.ed][CB.race]) { CB.race = ""; CB.sub = ""; } if (CB.ed === "2024") CB.bonus = "flex"; renderCB(); }
const cbR = () => raceInfo(CB.ed, CB.race, CB.sub);
function cbAllowed() { const C = CLASS_DATA[CB.cls], R = cbR(); return new Set(R && R.extraSkills ? ALL_SKILLS : C.skills[0]); }
function cbLocked() { const R = cbR(); return new Set([...bgSkills(CB.ed, CB.bg), ...((R && R.skills) || [])]); }
function cbNeed() { const C = CLASS_DATA[CB.cls], R = cbR(); return C.skills[1] + ((R && R.extraSkills) || 0); }
function cbBase() {
  const b = {};
  if (CB.method === "manual") AB.forEach(a => b[a] = clamp(parseInt(CB.manual[a]) || 10, 3, 20));
  else AB.forEach(a => b[a] = CB.assignIdx[a] != null && CB.pool ? CB.pool[CB.assignIdx[a]] : null);
  return b;
}
// 2024: +2/+1 (or +1 to each) among the background's three abilities
function cbFix24() {
  const B = bgInfo(CB.ed, CB.bg), L = B && B.ab ? B.ab : AB, C = CLASS_DATA[CB.cls], order = [...(C ? C.pri : []), ...AB].filter((a, i, A) => A.indexOf(a) === i && L.includes(a));
  if (!L.includes(CB.plus2)) CB.plus2 = order[0];
  if (!L.includes(CB.plus1) || CB.plus1 === CB.plus2) CB.plus1 = order.find(a => a !== CB.plus2);
  if (!(B && B.ab)) CB.bgSpread = "21";
}
function cbBonus24() {
  cbFix24();
  const B = bgInfo(CB.ed, CB.bg), L = B && B.ab ? B.ab : AB, tri = CB.bgSpread === "111" && B && B.ab;
  return `<div class="field" style="margin:14px 0 0"><label>Background ability scores (${esc(CB.bg)}: ${L.map(a => AB_FULL[a]).join(", ")})</label>
    ${B && B.ab ? `<div class="seg"><label class="opt"><input type="radio" name="cbSpread" value="21" ${tri ? "" : "checked"}><span>+2 to one, +1 to another</span></label><label class="opt"><input type="radio" name="cbSpread" value="111" ${tri ? "checked" : ""}><span>+1 to all three</span></label></div>` : ""}
    ${tri ? `<p class="hint">+1 to ${L.map(a => AB_FULL[a]).join(", ")}.</p>` : `<div class="row" style="margin-top:8px"><label class="lbl" style="margin:0">+2 to<select data-cbplus="plus2">${L.map(a => `<option value="${a}" ${CB.plus2 === a ? "selected" : ""}>${AB_NAME[a]}</option>`).join("")}</select></label><label class="lbl" style="margin:0">+1 to<select data-cbplus="plus1">${L.filter(a => a !== CB.plus2).map(a => `<option value="${a}" ${CB.plus1 === a ? "selected" : ""}>${AB_NAME[a]}</option>`).join("")}</select></label></div>`}</div>`;
}
function cbFinal(base) {
  const s = { ...base }, R = cbR();
  if (CB.ed === "2024") { const B = bgInfo(CB.ed, CB.bg); cbFix24(); if (CB.bgSpread === "111" && B && B.ab) B.ab.forEach(a => s[a] += 1); else { if (CB.plus2) s[CB.plus2] += 2; if (CB.plus1) s[CB.plus1] += 1; } }
  else if (CB.bonus === "flex") { if (CB.plus2) s[CB.plus2] += 2; if (CB.plus1) s[CB.plus1] += 1; }
  else if (R) { Object.entries(R.asi).forEach(([a, v]) => s[a] += v); if (R.plus1) { const C = CLASS_DATA[CB.cls]; [...C.pri, ...["con", "dex", "wis", "str", "int", "cha"].filter(a => !C.pri.includes(a))].filter(a => R.plus1Any || a !== "cha").slice(0, R.plus1).forEach(a => s[a] += 1); } }
  return s;
}
function cbCanNext() {
  if (CB.step === 0) { const B = PC_RACES[CB.ed][CB.race]; return !!B && (!B.subs || !!B.subs[CB.sub]); }
  if (CB.step === 1) return !!CB.cls;
  if (CB.step === 2) return !!CB.bg;
  if (CB.step === 3) return CB.method === "manual" || (CB.pool && AB.every(a => CB.assignIdx[a] != null));
  if (CB.step === 4) return CB.skills.size === cbNeed();
  return true;
}
function cbEnter() {
  const C = CLASS_DATA[CB.cls];
  if (CB.step === 3) {
    if (CB.method === "array" && !CB.pool) CB.pool = [15, 14, 13, 12, 10, 8];
    if (CB.ed === "2024") cbFix24();
    else if (CB.bonus === "flex") { if (!CB.plus2) CB.plus2 = C.pri[0]; if (!CB.plus1 || CB.plus1 === CB.plus2) CB.plus1 = C.pri.find(a => a !== CB.plus2) || "con"; }
  }
  if (CB.step === 4) { const al = cbAllowed(), lk = cbLocked(); [...CB.skills].forEach(s => { if (!al.has(s) || lk.has(s)) CB.skills.delete(s); }); }
}
function cbBody() {
  const C = CLASS_DATA[CB.cls], R = cbR();
  if (CB.step === 0) {
    const RS = PC_RACES[CB.ed], B = RS[CB.race];
    const asiTxt = d => CB.ed === "2024" ? "Ability bonuses from background" : Object.entries(d.asi).map(([a, v]) => `+${v} ${AB_NAME[a]}`).join(", ") + (d.plus1 ? ` and +1 to ${d.plus1} others` : "") + (d.subs ? " + subrace" : "");
    return `<div class="seg" style="margin-bottom:12px"><label class="opt"><input type="radio" name="cbEd" value="2024" ${CB.ed === "2024" ? "checked" : ""}><span>2024 rules (5.5e)</span></label><label class="opt"><input type="radio" name="cbEd" value="2014" ${CB.ed === "2014" ? "checked" : ""}><span>2014 rules (5e)</span></label></div>
    <p class="hint" style="margin-top:0">${CB.ed === "2024" ? "Pick a species. In the 2024 rules your background, not your species, gives the ability score increases." : "Pick a race. This sets ability bonuses, speed and racial traits."}</p>
    <div class="pick-grid">${Object.keys(RS).map(x => { const d = RS[x]; return `<button type="button" class="pick ${CB.race === x ? "on" : ""}" data-cbrace="${esc(x)}"><b>${esc(x)}</b><small>${asiTxt(d)} · ${d.speed} ft${d.subs ? ` · ${Object.keys(d.subs).length} ${esc((d.term || "subrace").toLowerCase())} options` : ""}</small><small>${esc(RACE_DESC[x] || "")}</small>${d.hb ? `<small class="req">Homebrew</small>` : ""}</button>`; }).join("")}</div>
    ${B && B.subs ? `<div class="field" style="margin-top:16px"><label>${esc(B.term || "Subrace")}</label><div class="pick-grid">${Object.entries(B.subs).map(([k, S]) => `<button type="button" class="pick ${CB.sub === k ? "on" : ""}" data-cbsub="${esc(k)}"><b>${esc(subLabel(CB.ed, CB.race, k))}</b>${S.asi && CB.ed === "2014" ? `<small>${Object.entries(S.asi).map(([a, v]) => `+${v} ${AB_NAME[a]}`).join(", ")}</small>` : ""}<small>${esc(S.d || "")}</small></button>`).join("")}</div></div>` : B ? `<p class="hint" style="margin-top:12px">${esc(CB.race)} has no ${CB.ed === "2024" ? "lineages" : "subraces"} in the ${CB.ed} rules.</p>` : ""}`;
  }
  if (CB.step === 1) return `<p class="hint" style="margin-top:0">Pick a class. This sets hit points, armor, saves, skills and spellcasting.</p>
    <div class="pick-grid">${Object.keys(CLASS_DATA).map(x => { const d = CLASS_DATA[x]; return `<button type="button" class="pick ${CB.cls === x ? "on" : ""}" data-cbcls="${esc(x)}"><b>${esc(x)}</b><small>d${d.hd} hit die · ${d.pri.slice(0, 2).map(a => AB_NAME[a]).join(" & ")}${d.cast ? ` · ${d.cast[0] === "half" ? "half caster" : d.cast[0] === "pact" ? "pact magic" : "full caster"}` : ""}</small><small>${CLASS_DESC[x]}</small></button>`; }).join("")}</div>`;
  if (CB.step === 2) {
    const L = bgList(CB.ed); if (CB.bg && !L.includes(CB.bg)) CB.bg = "";
    const desc = x => HB_BG[x] ? HB_BG[x].desc || "" : CB.ed === "2024" ? BG_DESC_2024[x] || "" : BG_DESC[x] || "";
    const card = x => { const B = bgInfo(CB.ed, x) || {}; return `<button type="button" class="pick ${CB.bg === x ? "on" : ""}" data-cbbg="${esc(x)}"><b>${esc(x)}</b><small>${(B.sk || []).join(" · ")}</small>${CB.ed === "2024" && B.ab ? `<small>${B.ab.map(a => AB_NAME[a]).join(" · ")} · ${esc(bgFeatLabel(B))}</small>` : B.feature ? `<small>Feature: ${esc(B.feature[0])}</small>` : ""}<small>${esc(desc(x))}</small>${HB_BG[x] ? `<small class="req">Homebrew</small>` : ""}</button>`; };
    return `<p class="hint" style="margin-top:0">${CB.ed === "2024" ? "Pick a background. In the 2024 rules it gives two skills, a tool, an Origin feat (added to your character) and starting equipment, and raises three of your ability scores." : "Pick a background. It gives two skills, tools or languages, starting equipment and a special feature."}</p>
    <div class="pick-grid">${L.map(card).join("")}</div>
    ${CB.bg ? `<div class="bg-detail"><h4>${esc(CB.bg)}</h4><p class="muted" style="margin:2px 0 8px">${esc(desc(CB.bg))}</p><dl>${bgLines(CB.ed, CB.bg).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>${CB.ed === "2024" && !HB_BG[CB.bg] ? `<div class="seg" role="radiogroup" aria-label="Starting equipment" style="margin-top:10px"><label class="opt"><input type="radio" name="cbGold" value="kit" ${CB.bgGold50 ? "" : "checked"}><span>Take the equipment and ${(bgInfo(CB.ed, CB.bg) || {}).gp || 0} gp</span></label><label class="opt"><input type="radio" name="cbGold" value="gold" ${CB.bgGold50 ? "checked" : ""}><span>Take 50 gp instead</span></label></div>` : ""}</div>` : ""}`;
  }
  if (CB.step === 3) {
    const base = cbBase(), ok = AB.every(a => base[a] != null), fin = ok ? cbFinal(base) : null;
    const seg = `<div class="seg" style="margin-bottom:12px">${[["array", "Standard array"], ["roll", "Roll 4d6"], ["manual", "Enter manually"]].map(([v, l]) => `<label class="opt"><input type="radio" name="cbMethod" value="${v}" ${CB.method === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>`;
    let body = "";
    if (CB.method === "manual") body = `<div class="cb-abil">${AB.map(a => `<label class="lbl">${AB_FULL[a]}<input type="number" min="3" max="20" data-cbman="${a}" value="${esc(CB.manual[a])}"></label>`).join("")}</div><p class="hint">Type each score before racial bonuses (3–20).</p>`;
    else {
      if (CB.method === "roll") body += `<div class="row" style="margin-bottom:10px"><button class="btn" type="button" data-cbroll style="flex:0 0 auto">🎲 Roll 4d6, drop lowest</button>${CB.rolls ? `<span class="hint" style="margin:0">${CB.rolls.map(x => `[${x.d.join(",")}]→${x.t}`).join("  ")}</span>` : `<span class="hint" style="margin:0">Roll a pool of six scores, then assign them.</span>`}</div>`;
      if (CB.pool) body += `<div class="cb-abil">${AB.map(a => `<label class="lbl">${AB_FULL[a]}<select data-cbassign="${a}"><option value="">—</option>${CB.pool.map((v, i) => `<option value="${i}" ${CB.assignIdx[a] === i ? "selected" : ""} ${CB.assignIdx[a] !== i && Object.entries(CB.assignIdx).some(([k, j]) => k !== a && j === i) ? "disabled" : ""}>${v}</option>`).join("")}</select></label>`).join("")}</div>
        <div class="row" style="margin-top:10px"><button class="btn sm" type="button" data-cbauto style="flex:0 0 auto">Auto-assign for a ${esc(CB.cls)}</button><button class="btn sm" type="button" data-cbclear style="flex:0 0 auto">Clear</button></div>`;
    }
    const bonus = CB.ed === "2024" ? cbBonus24() : `<div class="field" style="margin:14px 0 0"><label>${CB.ed === "2024" ? "Background ability bonus (2024 rules)" : "Racial bonus"}</label>
      <div class="seg ${CB.ed === "2024" ? "hidden" : ""}"><label class="opt"><input type="radio" name="cbBonus" value="flex" ${CB.ed === "2024" ? "disabled" : ""} ${CB.bonus === "flex" ? "checked" : ""}><span>Flexible +2/+1</span></label><label class="opt"><input type="radio" name="cbBonus" value="fixed" ${CB.bonus === "fixed" ? "checked" : ""}><span>Classic racial</span></label></div>
      ${CB.bonus === "flex" ? `<div class="row" style="margin-top:8px"><label class="lbl" style="margin:0">+2 to<select data-cbplus="plus2">${AB.map(a => `<option value="${a}" ${CB.plus2 === a ? "selected" : ""}>${AB_NAME[a]}</option>`).join("")}</select></label><label class="lbl" style="margin:0">+1 to<select data-cbplus="plus1">${AB.filter(a => a !== CB.plus2).map(a => `<option value="${a}" ${CB.plus1 === a ? "selected" : ""}>${AB_NAME[a]}</option>`).join("")}</select></label></div>` : `<p class="hint">${esc(CB.race)}: ${Object.entries(R.asi).map(([a, v]) => `+${v} ${AB_NAME[a]}`).join(", ")}${R.plus1 ? `, plus +1 to ${R.plus1} other scores (assigned automatically)` : ""}.</p>`}</div>`;
    const prev = fin ? `<div class="chips" style="margin-top:14px">${AB.map(a => `<span class="tag ${C.pri.includes(a) ? "gold" : ""}">${AB_NAME[a]} ${fin[a]} (${sgn(mod(fin[a]))})</span>`).join("")}</div><p class="hint">Final scores with racial bonuses. ${esc(CB.cls)}s lean on ${C.pri.slice(0, 2).map(a => AB_NAME[a]).join(" and ")}.</p>` : "";
    return seg + body + bonus + prev;
  }
  if (CB.step === 4) {
    const lk = cbLocked(), al = [...cbAllowed()].filter(s => !lk.has(s)).sort(), need = cbNeed();
    return `<p class="hint" style="margin-top:0">Already proficient from your background${R && R.skills ? " and race" : ""}: ${[...lk].join(", ")}.</p>
    <p style="margin:0 0 8px">Pick <span class="cb-count ${CB.skills.size > need ? "over" : ""}">${CB.skills.size} / ${need}</span> more${R && R.extraSkills ? ` (${esc(CB.race)} may choose from any skill)` : ` from the ${esc(CB.cls)} list`}:</p>
    <div class="cb-skills">${al.map(s => `<label class="check" style="margin-bottom:4px"><input type="checkbox" data-cbsk="${esc(s)}" ${CB.skills.has(s) ? "checked" : ""}><span><b>${esc(s)}</b> <small>${AB_NAME[SKILLS[s]]}</small></span></label>`).join("")}</div>`;
  }
  const base = cbFinal(cbBase());
  if (!CB.gender) CB.gender = "male";
  return `<div class="field"><label>Gender</label><div class="seg" role="radiogroup" aria-label="Gender">${GENDERS.map(([v, l]) => `<label class="opt"><input type="radio" name="cbGender" value="${v}" ${CB.gender === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
  <div class="field"><label>Name</label><div class="row"><input type="text" data-cbname value="${esc(CB.name)}" placeholder="Random"><button class="btn" type="button" data-cbnamerand style="flex:0 0 auto" title="Random name">🎲</button></div></div>
  <div class="field row"><div><label>Level</label><input type="number" min="1" max="20" data-cblevel value="${CB.level}"></div><div><label>Alignment</label><select data-cbalign>${ALIGN.map(a => `<option ${CB.align === a ? "selected" : ""}>${a}</option>`).join("")}</select></div></div>
  <div class="sec"><div class="sec-h"><h3>Summary</h3></div>
    <p>${esc(subLabel(CB.ed, CB.race, CB.sub))} ${esc(CB.cls)} (${esc(CB.bg)}), level ${CB.level}, ${CB.ed} rules.<br>
    ${AB.map(a => `${AB_NAME[a]} ${base[a]}`).join(" · ")}<br>
    Skills: ${[...cbLocked(), ...CB.skills].join(", ")}</p>
    <p class="hint">Levels past 4 apply ability score increases to your main abilities automatically. You can fine-tune every score, skill and detail afterwards in My Characters.</p></div>`;
}
function renderCB() {
  $("#pcOut").innerHTML = `<div class="card">
    <div class="row" style="align-items:flex-start"><div class="sheet-h" style="font-size:24px;flex:1">Create a custom character</div><button class="btn sm" type="button" data-cbquit style="flex:0 0 auto">✕ Cancel</button></div>
    <div class="cb-steps">${CB_STEPS.map((s, i) => `<span class="cb-step ${i === CB.step ? "cur" : ""} ${i < CB.step ? "done" : ""}" ${i < CB.step ? `data-cbgo="${i}" role="button" tabindex="0"` : ""}>${i + 1}. ${s}</span>`).join("")}</div>
    ${cbBody()}
    <div class="row" style="margin-top:16px">
      ${CB.step ? `<button class="btn" type="button" data-cbback style="flex:0 0 auto">← Back</button>` : ""}<span style="flex:1"></span>
      ${CB.step < 5 ? `<button class="btn primary" type="button" data-cbnext style="flex:0 0 auto" ${cbCanNext() ? "" : "disabled"}>Next →</button>` : `<button class="btn primary" type="button" data-cbcreate style="flex:0 0 auto">⚒ Create character</button>`}
    </div>
  </div>`;
}
function cbCreate() {
  const custom = { base: cbBase(), skills: [...CB.skills], align: CB.align, plus2: CB.bonus === "flex" || CB.ed === "2024" ? CB.plus2 : null, plus1: CB.bonus === "flex" || CB.ed === "2024" ? CB.plus1 : null, tri: CB.ed === "2024" && CB.bgSpread === "111", bgGold50: CB.ed === "2024" && !!CB.bgGold50 };
  currentPC = pcEnsure(generateCharacter({ seed: newSeed(), name: CB.name.trim().slice(0, 60), race: CB.race, ed: CB.ed, sub: CB.sub || "none", cls: CB.cls, bg: CB.bg, level: 1, gender: CB.gender, method: "custom", bonus: CB.ed === "2024" ? "flex" : CB.bonus, custom }));
  CB.on = false; renderPC(); pcPersist();
  const target = clamp(CB.level, 1, 20), ready = c => `${c.name} is ready — tweak anything in My Characters`;
  if (target > 1 || needsSubclass(currentPC)) lvChain(currentPC, target, ready); else toast(ready(currentPC));
}
(function initCB() {
  const out = $("#pcOut");
  out.addEventListener("click", e => {
    if (!CB.on) return; const t = e.target; let b;
    if (b = t.closest("[data-cbquit]")) { CB.on = false; out.innerHTML = currentPC ? sheetHTML(currentPC) : PC_EMPTY; return; }
    if (b = t.closest("[data-cbgo]")) { CB.step = +b.dataset.cbgo; renderCB(); return; }
    if (b = t.closest("[data-cbback]")) { CB.step--; renderCB(); return; }
    if (b = t.closest("[data-cbnext]")) { if (cbCanNext()) { CB.step++; cbEnter(); renderCB(); } return; }
    if (t.closest("[data-cbcreate]")) { cbCreate(); return; }
    if (b = t.closest("[data-cbrace]")) { if (CB.race !== b.dataset.cbrace) { CB.race = b.dataset.cbrace; const B = PC_RACES[CB.ed][CB.race]; CB.sub = B && B.subs ? Object.keys(B.subs)[0] : ""; } renderCB(); return; }
    if (b = t.closest("[data-cbsub]")) { CB.sub = b.dataset.cbsub; renderCB(); return; }
    if (b = t.closest("[data-cbcls]")) { CB.cls = b.dataset.cbcls; renderCB(); return; }
    if (b = t.closest("[data-cbbg]")) { CB.bg = b.dataset.cbbg; renderCB(); return; }
    if (t.closest("[data-cbroll]")) {
      CB.rolls = Array.from({ length: 6 }, () => { const d = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((x, y) => y - x); return { d, t: d[0] + d[1] + d[2] }; });
      CB.pool = CB.rolls.map(x => x.t).sort((a, b) => b - a); CB.assignIdx = {}; renderCB(); return;
    }
    if (t.closest("[data-cbauto]")) { const C = CLASS_DATA[CB.cls], order = [...C.pri, ...["con", "dex", "wis", "str", "int", "cha"].filter(a => !C.pri.includes(a))]; CB.assignIdx = {}; order.forEach((a, i) => CB.assignIdx[a] = i); renderCB(); return; }
    if (t.closest("[data-cbclear]")) { CB.assignIdx = {}; renderCB(); return; }
    if (t.closest("[data-cbnamerand]")) { CB.name = fullName(makeRng("nm", newSeed()), CB.gender); renderCB(); return; }
  });
  out.addEventListener("keydown", e => { if (CB.on && (e.key === "Enter" || e.key === " ") && e.target.matches("[data-cbgo]")) { e.preventDefault(); e.target.click(); } });
  out.addEventListener("change", e => {
    if (!CB.on) return; const t = e.target;
    if (t.name === "cbEd") { CB.ed = t.value; if (!PC_RACES[CB.ed][CB.race]) { CB.race = ""; CB.sub = ""; } else { const B = PC_RACES[CB.ed][CB.race]; if (!(B.subs && B.subs[CB.sub])) CB.sub = B.subs ? Object.keys(B.subs)[0] : ""; } if (CB.ed === "2024") CB.bonus = "flex"; renderCB(); }
    else if (t.name === "cbMethod") { CB.method = t.value; if (CB.method === "array") { CB.pool = [15, 14, 13, 12, 10, 8]; CB.assignIdx = {}; CB.rolls = null; } else if (CB.method === "roll") { CB.pool = null; CB.assignIdx = {}; CB.rolls = null; } renderCB(); }
    else if (t.name === "cbBonus") { CB.bonus = t.value; renderCB(); }
    else if (t.name === "cbSpread") { CB.bgSpread = t.value; renderCB(); }
    else if (t.name === "cbGender") { CB.gender = t.value; renderCB(); }
    else if (t.name === "cbGold") { CB.bgGold50 = t.value === "gold"; renderCB(); }
    else if (t.dataset.cbplus) { CB[t.dataset.cbplus] = t.value; if (CB.plus1 === CB.plus2) CB.plus1 = AB.find(a => a !== CB.plus2); if (CB.ed === "2024") cbFix24(); renderCB(); }
    else if (t.dataset.cbassign) { const a = t.dataset.cbassign; if (t.value === "") delete CB.assignIdx[a]; else CB.assignIdx[a] = +t.value; renderCB(); }
    else if (t.dataset.cbsk) { const s = t.dataset.cbsk; if (t.checked) { if (CB.skills.size >= cbNeed()) { t.checked = false; toast(`That's all ${cbNeed()} — untick one first`); return; } CB.skills.add(s); } else CB.skills.delete(s); renderCB(); }
    else if (t.dataset.cbman !== undefined) { CB.manual[t.dataset.cbman] = t.value; renderCB(); }
    else if (t.dataset.cblevel !== undefined) { CB.level = clamp(parseInt(t.value) || 1, 1, 20); t.value = CB.level; renderCB(); }
    else if (t.dataset.cbalign !== undefined) CB.align = t.value;
  });
  out.addEventListener("input", e => {
    if (!CB.on) return; const t = e.target;
    if (t.dataset.cbname !== undefined) CB.name = t.value;
    else if (t.dataset.cbman !== undefined) CB.manual[t.dataset.cbman] = t.value;
  });
})();
const PC_TRAITS = ["I quote old proverbs for every occasion.", "I'm always polite, even to my enemies.", "I can't sit still for long.", "I ask far too many questions.", "I name my weapons and talk to them.", "I keep a journal of every meal I eat.", "I hum when I'm nervous, and I'm often nervous.", "I trust animals more than people.", "I laugh loudest when things are worst.", "I count my coins twice."];
const mod = s => Math.floor((s - 10) / 2);
const sgn = n => (n >= 0 ? "+" : "") + n;
const diceAvg = d => d / 2 + 1;

function generateCharacter(o) {
  const r = makeRng("pc", o.seed);
  const ed = o.ed === "2024" ? "2024" : "2014";
  // random picks stay with the built-in rules; homebrew is chosen on purpose
  const race = o.race || r.pick(raceList(ed).filter(x => !PC_RACES[ed][x].hb)), cls = o.cls || r.pick(Object.keys(CLASS_DATA)), bg = o.bg || r.pick(bgList(ed).filter(x => !HB_BG[x]));
  const lv = clamp(o.level, 1, 20), C = CLASS_DATA[cls], RB = PC_RACES[ed][race];
  // a separate rng for the subrace, so older characters re-level to the same results
  let sub = o.sub === "none" ? null : o.sub || (race === "Dragonborn" && o.ancestry) || null;
  if (o.sub !== "none" && !sub && RB && RB.subs) sub = makeRng("sub", o.seed).pick(Object.keys(RB.subs));
  if (sub && !(RB && RB.subs && RB.subs[sub])) sub = null;
  const R = raceInfo(ed, race, sub);
  const anc = race === "Dragonborn" ? (sub || o.ancestry || r.pick(Object.keys(DRAGON_ANCESTRY))) : null;
  if (ed === "2024" && o.bonus === "fixed") o = { ...o, bonus: "flex" };
  // Subclass: a random forge picks one (own rng, so other rolls stay the same); custom builds and level-ups ask the player.
  const subLv = subclassLevel(ed, cls);
  let subclass = o.subclass && o.subclass !== "none" ? String(o.subclass) : null;
  if (!subclass && o.subclass !== "none" && !o.custom && lv >= subLv) { const L = subclassList(ed, cls).filter(x => !x[2]); if (L.length) subclass = makeRng("subclass", o.seed).pick(L)[0]; }
  // other classes taken by multiclassing, and the total character level
  const MC = (o.multi || []).filter(x => x && CLASS_DATA[x.cls] && x.cls !== cls && +x.lv > 0).map(x => ({ cls: x.cls, lv: +x.lv, subclass: x.subclass || null })), TL = lv + MC.reduce((t, x) => t + x.lv, 0);
  // scores
  let rolls = null, base;
  const order = [...C.pri, ...["con", "dex", "wis", "str", "int", "cha"].filter(a => !C.pri.includes(a))];
  if (o.custom && o.custom.base) base = { ...o.custom.base };
  else if (o.base && AB.every(a => +o.base[a])) { base = { ...o.base }; rolls = o.rolls || null; }
  else {
    let pool;
    if (o.method === "roll") {
      rolls = Array.from({ length: 6 }, () => { const d = Array.from({ length: 4 }, () => r.int(1, 6)).sort((a, b) => b - a); return { d, t: d[0] + d[1] + d[2] }; });
      pool = rolls.map(x => x.t).sort((a, b) => b - a);
    } else pool = [15, 14, 13, 12, 10, 8];
    base = {}; order.forEach((a, i) => base[a] = pool[i]);
  }
  const sc = { ...base };
  // 2024: the background raises three abilities; characters made before this keep their old bonus (bgAsiLegacy)
  if (ed === "2024" && !o.bgAsiLegacy) bgAbilityBonus(sc, ed, bg, order, o.custom);
  else if (o.custom && o.custom.plus2) { sc[o.custom.plus2] += 2; if (o.custom.plus1) sc[o.custom.plus1] += 1; }
  else if (o.bonus === "flex") { sc[C.pri[0]] += 2; sc[C.pri[1]] += 1; }
  else {
    Object.entries(R.asi).forEach(([a, v]) => sc[a] += v);
    if (R.plus1) order.filter(a => R.plus1Any || a !== "cha").slice(0, R.plus1).forEach(a => sc[a] += 1);
  }
  const asiLv = (C.asi || [4, 8, 12, 16, 19]).filter(x => x <= lv);
  // Ability Score Improvements from other classes' levels go to that class's main abilities
  MC.forEach(x => { const C2 = CLASS_DATA[x.cls]; (C2.asi || [4, 8, 12, 16, 19]).filter(L => L <= x.lv).forEach(() => { let pts = 2; for (const a of C2.pri) { while (pts > 0 && sc[a] < 20) { sc[a]++; pts--; } if (!pts) break; } }); });
  // Levels where the player chose (o.asiPicks[level] = { str: 2 } or { feat: "Alert" }) use that choice; the rest go to the main abilities.
  const asiPicks = o.asiPicks || {}, asiAuto = [];
  for (const L of asiLv) {
    const pk = asiPicks[L];
    if (pk) { AB.forEach(a => { if (pk[a]) sc[a] = Math.min(pk.max || 20, sc[a] + pk[a]); }); continue; }
    asiAuto.push(L); let pts = 2;
    for (const a of C.pri) { while (pts > 0 && sc[a] < 20) { sc[a]++; pts--; } if (!pts) break; }
  }
  // feats added outside level-ups (Feats tab / sheet): { n: name, l: level added, a: ability raised by 1, max }
  const bonusFeats = (o.bonusFeats || []).filter(b => b && b.n);
  // 2024: the background's Origin feat
  const BGI = bgInfo(ed, bg), bgFeat = ed === "2024" && BGI && BGI.feat ? BGI.feat : "", bgGold50 = !!(o.bgGold50 || (o.custom && o.custom.bgGold50));
  bonusFeats.forEach(b => { if (AB.includes(b.a)) sc[b.a] = Math.max(sc[b.a], Math.min(b.max || 20, sc[b.a] + 1)); });
  // homebrew effects (see hbEffects); ability scores first, since everything else reads them
  const fx = hbEffects(ed, race, sub, bg, cls, subclass, lv, [...asiLv.map(L => asiPicks[L]).filter(pk => pk && pk.feat).map(pk => pk.feat), ...bonusFeats.map(b => b.n), ...(bgFeat ? [bgFeat] : [])]);
  const fxSum = t => fx.filter(e => e.t === t).reduce((n, e) => n + e.v, 0);
  fx.filter(e => e.t === "ab").forEach(e => { sc[e.a] = e.v >= 0 ? Math.max(sc[e.a], Math.min(e.max || 20, sc[e.a] + e.v)) : Math.max(1, sc[e.a] + e.v); });
  const m = {}; AB.forEach(a => m[a] = mod(sc[a]));
  const prof = 2 + Math.floor((TL - 1) / 4);
  // skills
  const profSk = new Set([...bgSkills(ed, bg), ...(R.skills || [])]);
  const pickSkills = (list, n) => {
    const opts = r.shuffle(list.filter(s => !profSk.has(s))).sort((a, b) => m[SKILLS[b]] - m[SKILLS[a]]);
    // mostly take skills that fit the best abilities, with a little randomness
    const chosen = []; while (chosen.length < n && opts.length) { const i = r.chance(.7) ? 0 : r.int(0, opts.length - 1); chosen.push(opts.splice(i, 1)[0]); }
    chosen.forEach(s => profSk.add(s));
  };
  if (o.custom && o.custom.skills) o.custom.skills.forEach(s => profSk.add(s));
  else if (o.keepSkills) o.keepSkills.forEach(s => { if (SKILLS[s]) profSk.add(s); });
  else { pickSkills(C.skills[0], C.skills[1]); if (R.extraSkills) pickSkills(ALL_SKILLS, R.extraSkills); }
  // Skilled (an Origin feat): three more skills, picked with their own dice so other rolls stay the same
  const skilled = !bgFeat || bgFeat !== "Skilled" ? [] : o.keepSkilled ? o.keepSkilled.filter(x => SKILLS[x]) : makeRng("skilled", o.seed).shuffle(ALL_SKILLS.filter(x => !profSk.has(x))).sort((a, b) => m[SKILLS[b]] - m[SKILLS[a]]).slice(0, 3);
  skilled.forEach(x => profSk.add(x));
  const mcSkills = o.keepMcSkills || MC.filter(x => ["Bard", "Ranger", "Rogue"].includes(x.cls)).flatMap(x => makeRng("mc" + x.cls, o.seed).shuffle(CLASS_DATA[x.cls].skills[0].filter(k => !profSk.has(k))).sort((a, b) => m[SKILLS[b]] - m[SKILLS[a]]).slice(0, 1));
  mcSkills.forEach(k => { if (SKILLS[k]) profSk.add(k); });
  const expert = new Set();
  // expertise: keep what the character already has, and pick more only when a new level grants it
  (o.keepExpert || []).forEach(s => { if (profSk.has(s)) expert.add(s); });
  let wantX = 0;
  [...(C.expertise || []).map(([l, n]) => [l, n, lv]), ...MC.flatMap(x => (CLASS_DATA[x.cls].expertise || []).map(([l, n]) => [l, n, x.lv]))].forEach(([l, n, have]) => { if (have >= l) { wantX += n; const need = wantX - expert.size; if (need > 0) r.shuffle([...profSk].filter(s => !expert.has(s))).sort((a, b) => m[SKILLS[b]] - m[SKILLS[a]]).slice(0, need).forEach(s => expert.add(s)); } });
  if (expert.size > wantX) [...expert].slice(wantX).forEach(s => expert.delete(s));
  const expertOrder = [...expert];
  fx.forEach(e => { if (fxSkill(e.t)) profSk.add(e.a); if (e.t === "exp") expert.add(e.a); });
  const jack = cls === "Bard" && lv >= 2;
  const skillVals = ALL_SKILLS.map(s => {
    const p = profSk.has(s), x = expert.has(s);
    return { s, ab: SKILLS[s], p, x, v: m[SKILLS[s]] + (x ? prof * 2 : p ? prof : jack ? Math.floor(prof / 2) : 0) };
  });
  // combat
  const conBonus = m.con + (C.hpBonus || 0);
  const featsTaken = [...asiLv.map(L => asiPicks[L]).filter(pk => pk && pk.feat), ...bonusFeats.map(b => ({ feat: b.n, ...(b.a ? { [b.a]: 1 } : {}) })), ...(bgFeat ? [{ feat: bgFeat }] : [])];
  const hasFeat = n => featsTaken.some(pk => pk.feat === n);
  let hp = Math.max(1, C.hd + conBonus) + (lv - 1) * Math.max(1, diceAvg(C.hd) + conBonus) + MC.reduce((t, x) => t + x.lv * Math.max(1, diceAvg(CLASS_DATA[x.cls].hd) + conBonus), 0) + (R.hpLv || 0) * TL + (hasFeat("Tough") ? 2 * TL : 0) + (hasFeat("Boon of Fortitude") ? 40 : 0) + fxSum("hp") + fxSum("hpLv") * TL;
  const saves = [...C.saves]; featsTaken.filter(pk => pk.feat === "Resilient").forEach(pk => { const a = AB.find(x => pk[x]); if (a && !saves.includes(a)) saves.push(a); });
  fx.forEach(e => { if (e.t === "save" && !saves.includes(e.a)) saves.push(e.a); });
  // homebrew AC bonuses are kept apart (hbAc) so the equipment-based AC on My Characters can add them too
  let [ac, acSrc] = C.ac(m);
  const hbAc = fxSum("ac"), hbAcTxt = fx.filter(e => e.t === "ac").map(e => ` ${e.v >= 0 ? "+" : "−"} ${Math.abs(e.v)} ${e.src}`).join("");
  const atkBonus = fxSum("atk"), initBonus = (hasFeat("Alert") ? (ed === "2024" ? prof : 5) : 0) + fxSum("init");
  const w = C.wpn, wm = cls === "Monk" ? Math.max(m.str, m.dex) : m[w[2]];
  const attacks = [{ name: w[0], hit: wm + prof + atkBonus, dmg: `${w[1]}${wm ? sgn(wm) : ""}` }];
  if (cls === "Monk") { const md = lv >= 17 ? "1d10" : lv >= 11 ? "1d8" : lv >= 5 ? "1d6" : "1d4"; attacks.push({ name: "Unarmed strike", hit: wm + prof + atkBonus, dmg: md + sgn(wm) }); }
  // spells
  let spell = null;
  if (C.cast) {
    const [kind, sa] = C.cast; let slots = [], note = "";
    if (kind === "full") slots = FULL_SLOTS[lv];
    else if (kind === "half") slots = lv >= 2 || ed === "2024" ? FULL_SLOTS[Math.ceil(lv / 2)] : []; // 2024 half casters get Spellcasting at level 1
    else { const n = lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 2 ? 2 : 1, sl = Math.min(5, Math.ceil(lv / 2)); note = `${n} pact slot${n > 1 ? "s" : ""} of level ${sl}, regained on a short rest`; }
    const max = kind === "pact" ? Math.min(5, Math.ceil(lv / 2)) : Math.max(1, slots.length);
    const sb = fxSum("spell");
    spell = { ab: sa, dc: 8 + prof + m[sa] + sb, atk: prof + m[sa] + sb, bonus: sb, slots, note, max, cantrips: kind !== "half" };
  }
  const mcCasters = MC.filter(x => CLASS_DATA[x.cls].cast);
  if (mcCasters.length) {
    const sb = fxSum("spell"), all = [...(C.cast ? [{ cls, lv }] : []), ...mcCasters], slotted = all.filter(x => CLASS_DATA[x.cls].cast[0] !== "pact");
    const cl = slotted.reduce((t, x) => t + casterLv(ed, x.cls, x.lv), 0);
    const own = x => { const k = CLASS_DATA[x.cls].cast[0]; return k === "full" ? FULL_SLOTS[x.lv] : k === "half" && x.lv >= 2 ? FULL_SLOTS[Math.ceil(x.lv / 2)] : []; };
    const slots = slotted.length >= 2 ? (FULL_SLOTS[Math.max(0, Math.min(20, cl))] || []) : slotted.length === 1 ? own(slotted[0]) : [];
    const lock = all.find(x => x.cls === "Warlock"), P = lock ? pactSlots(lock.lv) : null;
    const mk = x => { const sa = CLASS_DATA[x.cls].cast[1]; return { cls: x.cls, ab: sa, dc: 8 + prof + m[sa] + sb, atk: prof + m[sa] + sb }; };
    const head = spell ? { ...spell } : { ...mk(mcCasters[0]), bonus: sb, cantrips: CLASS_DATA[mcCasters[0].cls].cast[0] !== "half", max: 1 };
    head.slots = slots; head.note = slots.length ? "" : P ? `${P.n} pact slot${P.n > 1 ? "s" : ""} of level ${P.lvl}, regained on a short rest` : head.note || "";
    head.pact = P && slots.length ? P : null;
    head.max = Math.max(head.max || 1, slots.length, P ? P.lvl : 0);
    head.cls = spell ? cls : mcCasters[0].cls;
    head.others = all.filter(x => x.cls !== head.cls).map(mk);
    spell = head;
  }
  // features
  const feats = [];
  Object.entries(C.f).forEach(([l, list]) => { if (+l <= lv) list.forEach(f => feats.push({ l: +l, f })); });
  if (lv >= subLv) feats.push({ l: subLv, f: subclass ? `Subclass: ${subclass}` : "Subclass: not chosen yet" });
  const hbSub = subclass && hbAny("subclass").find(x => x.name === subclass && x.cls === cls);
  if (hbSub) (hbSub.features || []).filter(f => f.n && +f.l <= lv).forEach(f => feats.push({ l: +f.l, f: f.n }));
  else if (subclass) feats.push(...subFeatList(ed, subclass, lv));
  const SB = subBonuses(ed, subclass, lv, m, prof);
  hp += SB.hp; subAddSaves(saves, SB); if (SB.ac) [ac, acSrc] = SB.ac;
  ac += hbAc; acSrc += hbAcTxt;
  skillVals.forEach(s => s.v += athleteBonus(SB, s, prof));
  if (HB_BG[bg] && HB_DESC[`${bg} background`]) feats.push({ l: 1, f: `${bg} background` });
  if (BGI && !HB_BG[bg]) feats.push({ l: 1, f: `Background: ${bg}`, bgInfo: true });
  if (ed === "2014" && BGI && BGI.feature) feats.push({ l: 1, f: BGI.feature[0], bgFeature: true });
  if (bgFeat) feats.push({ l: 1, f: `Feat: ${bgFeat}`, bgFeat: true, note: BGI.fnote || "" });
  const RL = raceLevelFeats(ed, race, R.traits, TL); feats.push(...RL.feats);
  // features of added classes, and their subclasses
  MC.forEach(x => {
    const C2 = CLASS_DATA[x.cls]; Object.entries(C2.f).forEach(([l, L]) => { if (+l <= x.lv) L.forEach(f => feats.push({ l: +l, f, mc: x.cls })); });
    const sl2 = subclassLevel(ed, x.cls);
    if (x.lv >= sl2) { feats.push({ l: sl2, f: x.subclass ? `Subclass: ${x.subclass}` : `Subclass: not chosen yet (${x.cls})`, mc: x.cls }); if (x.subclass) subFeatList(ed, x.subclass, x.lv).forEach(sf => feats.push({ l: sf.l, f: sf.f, mc: x.cls, mcsub: x.subclass })); }
  });
  bonusFeats.forEach(b => feats.push({ l: +b.l || 1, f: `Feat: ${b.n}${b.a ? ` (+1 ${AB_NAME[b.a]})` : ""}`, bonus: true }));
  if (asiAuto.length) feats.push({ l: asiAuto[0], f: `Ability Score Improvement ×${asiAuto.length} (applied)` });
  asiLv.filter(L => asiPicks[L]).forEach(L => { const pk = asiPicks[L]; feats.push({ l: L, f: pk.feat ? `Feat: ${pk.feat}${AB.some(a => pk[a]) ? ` (${AB.filter(a => pk[a]).map(a => `+${pk[a]} ${AB_NAME[a]}`).join(", ")})` : ""}` : `Ability Score Improvement: ${AB.filter(a => pk[a]).map(a => `+${pk[a]} ${AB_NAME[a]}`).join(", ")}` }); });
  feats.sort((a, b) => a.l - b.l);
  const extras = [];
  if (cls === "Rogue") extras.push(`Sneak Attack ${Math.ceil(lv / 2)}d6`);
  if (cls === "Barbarian") extras.push(`Rages per day: ${lv >= 20 ? "unlimited" : lv >= 17 ? 6 : lv >= 12 ? 5 : lv >= 6 ? 4 : lv >= 3 ? 3 : 2}, rage damage +${lv >= 16 ? 4 : lv >= 9 ? 3 : 2}`);
  if (cls === "Bard") extras.push(`Bardic Inspiration d${lv >= 15 ? 12 : lv >= 10 ? 10 : lv >= 5 ? 8 : 6}, ${Math.max(1, m.cha)}× per ${lv >= 5 ? "short" : "long"} rest`);
  if (cls === "Monk" && lv >= 2) extras.push(`Ki points: ${lv}`);
  if (cls === "Paladin") extras.push(`Lay on Hands pool: ${lv * 5} HP`);
  if (cls === "Sorcerer" && lv >= 2) extras.push(`Sorcery points: ${lv}`);
  if (anc) {
    const A = DRAGON_ANCESTRY[anc];
    if (ed === "2024") extras.push(`Breath Weapon (${anc.toLowerCase()} dragon): replaces one attack; 15 ft cone or 30 ft line of ${A.type}, ${lv >= 17 ? "4d10" : lv >= 11 ? "3d10" : lv >= 5 ? "2d10" : "1d10"} ${A.type} damage, DEX save DC ${8 + prof + m.con}, ${prof} uses per long rest`);
    else extras.push(`Breath Weapon (${anc.toLowerCase()} dragon): ${A.shape} of ${A.type}, ${lv >= 16 ? "5d6" : lv >= 11 ? "4d6" : lv >= 6 ? "3d6" : "2d6"} ${A.type} damage, ${A.save} save DC ${8 + prof + m.con}, once per short or long rest`);
  }
  const gender = o.gender === "male" || o.gender === "female" ? o.gender : makeRng("gender", o.seed).pick(["male", "female"]);
  const pcName = o.name || fullName(r, gender);
  const hk = hookBuild(r.pick(PC_HOOKS), hookCtx(r, pcName.split(" ")[0]));
  return {
    seed: o.seed, method: o.method, bonus: o.bonus, name: pcName, gender, race, ed, sub, ancestry: anc, subclass, custom: !!o.custom, customData: o.custom || null, cls, bg, level: lv, align: (o.custom && o.custom.align) || r.pick(ALIGN), base, scores: sc, mods: m, rolls,
    prof, saves, skills: skillVals, hp, ac, acSrc, speed: R.speed + fxSum("speed") + SB.speed + (C.f && Object.entries(C.f).some(([l, L]) => +l <= lv && L.includes("Unarmored Movement")) ? unarmoredMove(lv) : 0) + (cls === "Barbarian" && lv >= 5 ? 10 : 0) + (hasFeat("Mobile") || hasFeat("Speedy") ? 10 : 0) + (hasFeat("Boon of Speed") ? 30 : 0),
    init: m.dex + initBonus + SB.init + (SB.athlete ? Math.ceil(prof / 2) : 0) + (jack && ed === "2014" ? Math.floor(prof / 2) : 0) /* 2014 Jack of All Trades counts on initiative, a Dexterity check */, initBonus, atkBonus, hbAc, hbSpeed: fxSum("speed"), hbSig: fx.length ? JSON.stringify(fx) : "",
    ...Object.fromEntries(["res", "imm", "vul", "cimm"].map(t => [t, [...new Set([...fx.filter(e => e.t === t).map(e => e.a), ...(t === "res" ? traitRes(R.traits, anc, ed) : [])])].sort()])),
    sadv: [...new Set([...traitSadv(R.traits), ...fx.filter(e => e.t === "sadv").map(e => e.a)])], passive: 10 + skillVals.find(s => s.s === "Perception").v, subHp: SB.hp, subSpd: SB.speed,
    attacks, spell, feats, extras, traits: R.traits.filter(t => !RL.hidden.has(t)), kit: [...C.kit, ...((BGI && BGI.gear && !(bgGold50 && ed === "2024")) ? BGI.gear : [])], startGold: bgGold50 && ed === "2024" && BGI && !BGI.hb ? 50 : (BGI && BGI.gp) || 0, bgGold50: bgGold50 || undefined, bgV: 2, skilled, expertOrder, multi: MC.length ? MC : undefined, totalLevel: TL, mcSkills, hdList: [C.hd, ...MC.map(x => CLASS_DATA[x.cls].hd)], bgAsiLegacy: o.bgAsiLegacy || undefined, hd: C.hd,
    trait: r.pick(PC_TRAITS), ideal: r.pick(IDEALS), bond: r.pick(BONDS), flaw: r.pick(FLAWS), hook: hk.hook, hookDetail: hk.hookDetail
  };
}
// Characters saved before species level features existed: add the ones they have reached.
function raceLvUpgrade(c) {
  if (c.raceLv || !Array.isArray(c.traits) || !Array.isArray(c.feats)) return;
  const R = raceLevelFeats(edOf(c), c.race, c.traits, c.level || 1);
  R.feats.forEach(f => { if (!c.feats.some(x => x.f === f.f)) c.feats.push(f); });
  c.feats.sort((a, b) => a.l - b.l); c.traits = c.traits.filter(t => !R.hidden.has(t)); c.raceLv = 1;
}
// Damage resistances that built-in species traits give (Dragonborn's depends on their ancestry)
const TRAIT_RES = { "Dwarven Resilience": ["poison"], "Stout Resilience": ["poison"], "Hellish Resistance": ["fire"], "Celestial Resistance": ["necrotic", "radiant"],
  "Abyssal Legacy": ["poison"], "Chthonic Legacy": ["necrotic"], "Infernal Legacy": ["fire"] };
function traitRes(traits, ancestry, ed) {
  const out = new Set();
  (traits || []).forEach(t => {
    if (t === "Infernal Legacy" && ed !== "2024") return; // 2014: spells only; Hellish Resistance gives the fire resistance
    (TRAIT_RES[t] || []).forEach(x => out.add(x));
    if (t === "Damage Resistance" && ancestry && DRAGON_ANCESTRY[ancestry]) out.add(DRAGON_ANCESTRY[ancestry].type);
  });
  return [...out];
}
// Advantage on saving throws that built-in species traits give
const TRAIT_SADV = { "Fey Ancestry": ["charmed"], "Brave": ["frightened"], "Dwarven Resilience": ["poisoned"], "Stout Resilience": ["poisoned"],
  "Gnome Cunning": ["INT, WIS and CHA saves against magic"], "Gnomish Cunning": ["INT, WIS and CHA saves"] };
const traitSadv = traits => [...new Set((traits || []).flatMap(t => TRAIT_SADV[t] || []))];
const withTraitRes = c => {
  if (c && Array.isArray(c.traits)) {
    c.res = [...new Set([...(c.res || []), ...traitRes(c.traits, c.ancestry, edOf(c))])].sort();
    c.sadv = [...new Set([...(c.sadv || []), ...traitSadv(c.traits)])];
  }
  return c;
};
// Damage resistances, immunities and vulnerabilities from species traits and homebrew effects
const defList = c => [["Resistant", c.res], ["Immune", c.imm], ["Vulnerable", c.vul], ["Condition immunities", c.cimm], ["Advantage on", (c.sadv || []).map(x => / saves/.test(x) ? x.replace(" against ", " vs ") : `saves vs ${x}`)]].filter(([, l]) => l && l.length);
const defHTML = c => { const L = defList(c); return L.length ? `<div class="chips" style="margin:8px 0 0">${L.map(([k, l]) => `<span class="tag ${k === "Vulnerable" ? "" : "gold"}">${k}: ${l.map(esc).join(", ")}</span>`).join("")}</div>` : ""; };
const defText = c => defList(c).map(([k, l]) => `${k}: ${l.join(", ")}`).join(" | ");
function sheetHTML(c) {
  const sv = a => m => c.mods[a] + (c.saves.includes(a) ? c.prof : 0);
  return `<div class="card">
    <div class="row" style="align-items:flex-start"><div><div class="sheet-h">${esc(c.name)}</div>
      <div class="gen-sub"><span class="tag gold">Level ${c.level} ${esc(raceLabel(c))} ${esc(c.cls)}</span>${c.gender ? `<span class="tag">${c.gender === "male" ? "Male" : "Female"}</span>` : ""}<span class="tag">${edOf(c)} rules</span>${c.custom ? `<span class="tag">Custom build</span>` : ""}<span class="tag">${esc(c.bg)}</span><span class="tag">${esc(c.align)}</span></div></div>
      ${c.custom ? "" : `<button class="btn sm" id="pcReroll" style="flex:0 0 auto">↻ Reroll</button>`}</div>
    <div class="abil">${AB.map(a => `<div class="ab"><div class="n">${AB_NAME[a]}</div><div class="m">${sgn(c.mods[a])}</div><div class="s">${c.scores[a]}</div><div class="sv ${c.saves.includes(a) ? "p" : ""}">save ${sgn(sv(a)())}${c.saves.includes(a) ? " ●" : ""}</div></div>`).join("")}</div>
    ${c.rolls ? `<p class="hint" style="margin-top:-4px">4d6 rolls (highest three kept): ${c.rolls.map(x => `[${x.d.join(", ")}] → ${x.t}`).join(" · ")}</p>` : ""}
    <div class="vitals">
      <div class="vit"><b>${c.hp}</b><span>Hit points</span></div><div class="vit"><b>${c.ac}</b><span>Armor class</span></div>
      <div class="vit"><b>${sgn(c.init)}</b><span>Initiative</span></div><div class="vit"><b>${c.speed} ft</b><span>Speed</span></div>
      <div class="vit"><b>${sgn(c.prof)}</b><span>Proficiency</span></div><div class="vit"><b>${c.passive}</b><span>Passive Perc.</span></div>
      <div class="vit"><b>${c.level}d${c.hd}</b><span>Hit dice</span></div>
    </div>
    ${defHTML(c)}
    <p class="hint">AC from ${esc(c.acSrc)}. HP uses the fixed average per level after 1st.</p>
    ${lvBarHTML(c)}
    <div class="pc-actions">
      <select class="campSelect" id="pcCampSheet" aria-label="Campaign"></select>
      <button class="btn primary sm" type="button" data-pc="camp">+ Add to campaign</button>
      <button class="btn sm" type="button" data-pc="sheet">⎙ Export character sheet</button>
      <button class="btn sm" type="button" data-pc="edit" title="Move to My Characters, where every stat, skill and detail is editable">✎ Edit stats & skills</button>
      <button class="btn sm" type="button" data-pc="keep" title="Move this character to the My Characters tab for editing">☆ Save to My characters</button>
      <button class="btn sm danger" type="button" data-pc="discard" title="Close and delete this character">✕ Discard</button>
    </div>
  </div>
  <div class="grid2" style="margin-top:0">
    <div class="sec"><div class="sec-h"><h3>Skills</h3><span class="sp"></span><span class="muted" style="font-size:13px">● proficient ★ expertise</span></div>
      <div class="skills">${c.skills.map(s => `<div class="${s.p ? "p" : ""} ${s.x ? "x" : ""}"><span>${s.p ? "● " : ""}${esc(s.s)} <span class="muted" style="font-size:12px">${AB_NAME[s.ab]}</span></span><b>${sgn(s.v)}</b></div>`).join("")}</div></div>
    <div class="sec"><div class="sec-h"><h3>Attacks${c.spell ? " & Spellcasting" : ""}</h3></div>
      ${c.attacks.map(a => `<div class="enc" style="border-color:var(--gold)"><b>${esc(a.name)}</b>: ${sgn(a.hit)} to hit, ${esc(a.dmg)} damage</div>`).join("")}
      ${c.spell ? `<p style="margin:10px 0 4px"><b>Spell save DC ${c.spell.dc}</b> · spell attack ${sgn(c.spell.atk)} · ability ${AB_NAME[c.spell.ab]}</p>
        ${c.spell.note ? `<div>${esc(c.spell.note)}</div>` : c.spell.slots.length ? `<div class="chips">${c.spell.slots.map((n, i) => `<span class="tag">Lv ${i + 1}: ${n} slot${n > 1 ? "s" : ""}</span>`).join("")}</div>` : `<div class="muted">No spell slots until level 2.</div>`}` : ""}
      ${c.spell ? `<button class="btn sm" style="margin-top:10px" data-spells="${esc(c.cls)}|${c.spell.max}|${c.spell.cantrips ? 1 : 0}">✦ Browse ${esc(c.cls)} spells up to level ${c.spell.max}</button>` : ""}
      ${c.extras.length ? `<ul class="plain" style="margin-top:10px">${c.extras.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    </div>
  </div>
  ${c.spell ? `<div class="sec" id="pcPrepSec"><div class="sec-h"><h3>${spellLimits(c).word === "known" ? "Spells Known" : "Prepared Spells"}</h3><span class="sp"></span><button class="btn sm" type="button" id="pcPrepBtn">✦ Prepare spells</button></div>
    <div id="pcPrepared">${preparedHTML(c)}</div>${prepPanelHTML(c)}</div>` : ""}
  <div class="grid2" style="margin-top:0">
    <div class="sec"><div class="sec-h"><h3>Features & Traits</h3></div><ul class="plain">${c.feats.map(f => featLi(f.f, f.sub ? `${esc(c.subclass)}, lv ${f.l}` : f.mcsub ? `${esc(f.mcsub)}, ${esc(f.mc)} lv ${f.l}` : f.mc ? `${esc(f.mc)} lv ${f.l}` : (f.race ? esc(raceLabel(c)) + ", " : "") + "lv " + f.l, c)).join("")}${c.traits.map(t => featLi(t, esc(raceLabel(c)), c)).join("")}</ul></div>
    <div class="sec"><div class="sec-h"><h3>Equipment</h3></div><ul class="plain">${c.kit.map(k => `<li>${esc(k)}</li>`).join("")}${c.bgV >= 2 ? (+c.startGold ? `<li>${+c.startGold} gp</li>` : "") : `<li>${esc(c.bg)} background gear</li>`}</ul></div>
  </div>
  <div class="sec"><div class="sec-h"><h3>Personality & Backstory</h3></div>
    <p><b>Trait:</b> ${esc(c.trait)}<br><b>Ideal:</b> ${esc(c.ideal)}<br><b>Bond:</b> ${esc(cap1(c.bond))}.<br><b>Flaw:</b> ${esc(cap1(c.flaw))}.</p>
    <p><b>Hook:</b> ${esc(c.name.split(" ")[0])} ${esc(c.hook)}.</p>
    ${c.hookDetail ? `<p>${esc(c.hookDetail.story)}</p>
    <p style="margin-bottom:4px"><b>Unanswered questions:</b></p><ul class="plain">${c.hookDetail.questions.map(q => `<li>${esc(q)}</li>`).join("")}</ul>
    <p class="muted" style="margin-top:10px"><i>For the DM:</i> ${esc(c.hookDetail.use)}</p>` : ""}</div>`;
}
function sheetText(c) {
  return `${c.name} — Level ${c.level} ${raceLabel(c)} ${c.cls} [${edOf(c)} rules] (${c.bg}, ${c.align})
${AB.map(a => `${AB_NAME[a]} ${c.scores[a]} (${sgn(c.mods[a])})`).join(" | ")}
HP ${c.hp} | AC ${c.ac} (${c.acSrc}) | Init ${sgn(c.init)} | Speed ${c.speed} ft | Prof ${sgn(c.prof)} | Passive Perception ${c.passive}
${defText(c) ? defText(c) + "\n" : ""}Saves: ${c.saves.map(a => `${AB_NAME[a]} ${sgn(c.mods[a] + c.prof)}`).join(", ")}
Skills: ${c.skills.filter(s => s.p).map(s => `${s.s} ${sgn(s.v)}${s.x ? "*" : ""}`).join(", ")}
Attacks: ${c.attacks.map(a => `${a.name} ${sgn(a.hit)} (${a.dmg}${a.type ? " " + a.type : ""})`).join("; ")}
${c.spell ? `Spellcasting: DC ${c.spell.dc}, attack ${sgn(c.spell.atk)}; ${c.spell.note || c.spell.slots.map((n, i) => `L${i + 1}×${n}`).join(" ") || "no slots yet"}\n` : ""}${(c.prepared || []).length ? `Spells: ${[...c.prepared].sort((a, b) => a.l - b.l || a.n.localeCompare(b.n)).map(p => p.l ? `${p.n} (${p.l})` : `${p.n} (cantrip)`).join(", ")}\n` : ""}Features: ${c.feats.map(f => f.f).concat(c.extras).join(", ")}
Racial traits: ${c.traits.join(", ")}
Equipment: ${c.kit.concat((c.inv || []).filter(i => i.n).map(i => (+i.qty > 1 ? i.qty + " × " : "") + i.n)).join(", ")}
Trait: ${c.trait} Ideal: ${c.ideal}. Bond: ${c.bond}. Flaw: ${c.flaw}.
Hook: ${c.hook}.${c.hookDetail ? `\nBackstory: ${c.hookDetail.story}\nUnanswered questions: ${c.hookDetail.questions.join(" ")}\nFor the DM: ${c.hookDetail.use}` : ""}`;
}
let currentPC = null;
const PC_EMPTY = document.getElementById("pcOut").innerHTML;
async function discardPC() {
  const c = currentPC; if (!c) return;
  const saved = PCS.roster.some(x => x.id === c.id);
  if (!(await confirmBox("Discard character?", saved ? `Discard ${c.name}? This also removes them from My characters. Copies already added to a campaign party stay there.` : `Discard ${c.name}? They aren't saved in My characters, so they'll be gone for good.`, "Discard"))) return;
  PCS.roster = PCS.roster.filter(x => x.id !== c.id);
  currentPC = null; pcPersist(); renderRoster();
  $("#pcOut").innerHTML = PC_EMPTY; toast(`${c.name} discarded`);
}
(function initPC() {

  Object.keys(CLASS_DATA).forEach(x => $("#pcClass").insertAdjacentHTML("beforeend", `<option>${x}</option>`));
  const curEd = () => ($("input[name=pcEd]:checked") || {}).value || "2024";
  const fillBgs = () => {
    const keep = $("#pcBg").value, L = bgList(curEd());
    $("#pcBg").innerHTML = `<option value="">Random</option>` + L.map(x => `<option>${esc(x)}</option>`).join("");
    $("#pcBg").value = L.includes(keep) ? keep : "";
    $("#pcBonusWrap").classList.toggle("ed-hide", curEd() === "2024");
    $("#pcGoldWrap").classList.toggle("ed-hide", curEd() !== "2024");
    if (window.pcBgHint) window.pcBgHint();
  };
  const fillRaces = () => {
    const ed = curEd(), keep = $("#pcRace").value;
    $("#pcRace").innerHTML = `<option value="">Random</option>` + raceList(ed).map(x => `<option>${esc(x)}</option>`).join("");
    if (raceList(ed).includes(keep)) $("#pcRace").value = keep;
    $("#pcEdHint").textContent = ed === "2024" ? "2024 Player's Handbook: species (with Aasimar, Goliath and Orc); ability bonuses come from your background." : "2014 Player's Handbook: races with subraces; ability bonuses come from your race.";
  };
  const ancHint = () => {
    const ed = curEd(), B = PC_RACES[ed][$("#pcRace").value], v = $("#pcAnc").value, S = B && B.subs && B.subs[v];
    $("#pcAncHint").textContent = S ? S.d : B && B.subs ? `Leave on Random, or pick one of ${Object.keys(B.subs).length} options.` : "";
  };
  const syncRace = () => {
    if (($("input[name=pcMode]:checked") || {}).value === "custom") return;
    const B = PC_RACES[curEd()][$("#pcRace").value], keep = $("#pcAnc").value;
    $("#pcAncWrap").classList.toggle("hidden", !(B && B.subs));
    if (B && B.subs) {
      $("#pcAncLbl").textContent = B.term || "Subrace";
      $("#pcAnc").innerHTML = `<option value="">Random</option>` + Object.keys(B.subs).map(k => `<option value="${esc(k)}">${esc(subLabel(curEd(), $("#pcRace").value, k))}</option>`).join("");
      if (B.subs[keep]) $("#pcAnc").value = keep;
    }
    ancHint();
  };
  fillRaces();
  window.pcSelectsRefresh = () => {
    fillBgs();
    fillRaces(); syncRace();
  };
  $$("input[name=pcEd]").forEach(rd => rd.addEventListener("change", () => { fillRaces(); syncRace(); fillBgs(); }));
  $("#pcRace").addEventListener("change", syncRace);
  $("#pcAnc").addEventListener("change", ancHint);
  const bgHint = () => {
    const v = $("#pcBg").value, ed = curEd(), H = HB_BG[v], d = H ? H.desc : ed === "2024" ? BG_DESC_2024[v] : BG_DESC[v];
    $("#pcBgHint").innerHTML = !v ? "" : `${d ? `${esc(d)}<br>` : ""}${bgLines(ed, v).map(([k, x]) => `<b>${esc(k)}:</b> ${esc(x)}`).join("<br>")}${ed === "2024" && !H ? "<br>Random forging puts the +2 and +1 on your class's best of the three." : ""}`;
  };
  $("#pcBg").addEventListener("change", bgHint); window.pcBgHint = bgHint; fillBgs();
  $$("input[name=pcMode]").forEach(rd => rd.addEventListener("change", () => {
    const cust = ($("input[name=pcMode]:checked") || {}).value === "custom";
    $$("#pcForm .rnd-only").forEach(d => d.classList.toggle("hidden", cust));
    $("#pcForgeBtn").textContent = cust ? "🛠 Build step by step" : "⚒ Forge Character";
    if (!cust) syncRace();
  }));
  const run = () => {
    const lv = clamp(parseInt($("#pcLevel").value) || 1, 1, 20); $("#pcLevel").value = lv;
    currentPC = pcEnsure(generateCharacter({ seed: newSeed(), name: $("#pcName").value.trim().slice(0, 60), gender: $("#pcGender").value || undefined, bgGold50: curEd() === "2024" && $("#pcGold50").checked, race: $("#pcRace").value, ed: curEd(), sub: $("#pcAncWrap").classList.contains("hidden") ? undefined : ($("#pcAnc").value || undefined), cls: $("#pcClass").value, bg: $("#pcBg").value, level: lv, method: $("input[name=pcMethod]:checked").value, bonus: $("input[name=pcBonus]:checked").value }));
    renderPC(); pcPersist();
  };
  $("#pcForm").addEventListener("submit", e => { e.preventDefault(); if (($("input[name=pcMode]:checked") || {}).value === "custom") { CB.ed = curEd(); cbStart(); } else { CB.on = false; run(); } });
  $("#pcOut").addEventListener("click", e => {
    const t = e.target;
    if (t.id === "pcReroll") { run(); return; }
    const sb = t.closest("[data-spells]"); if (sb) { const [cl, mx, ca] = sb.dataset.spells.split("|"); SP.target = currentPC && currentPC.id; openSpellsFor(cl, +mx, ca === "1"); return; }
    const a = t.closest("[data-pc]");
    if (a) { const k = a.dataset.pc; if (k === "camp") addPCToCampaign($("#pcCampSheet").value); else if (k === "sheet") openSheet(currentPC); else if (k === "keep" || k === "edit") keepPC(); else if (k === "discard") discardPC(); return; }
    if (t.id === "pcPrepBtn") {
      const p = $("#pcPrepPanel"); p.classList.toggle("hidden"); const open = !p.classList.contains("hidden");
      t.textContent = open ? "Close search" : "✦ Prepare spells";
      if (open) { $("#pcPrepEd").value = SP.ed; renderPrepList(); $("#pcPrepQ").focus(); }
      return;
    }
    const pb = t.closest("[data-prep]");
    if (pb && currentPC) { const s = spFind(pb.dataset.prep), on = togglePrep(currentPC, s, pb.dataset.prep.split("-")[0]); pb.textContent = on ? "✓ Prepared" : "+ Prepare"; pb.classList.toggle("primary", !on); pcChanged(currentPC); return; }
    const ub = t.closest("[data-unprep]");
    if (ub && currentPC) { const [ed, ...rest] = ub.dataset.unprep.split("|"), n = rest.join("|"); currentPC.prepared = currentPC.prepared.filter(x => !(x.ed === ed && x.n === n)); pcChanged(currentPC); renderPrepList(); }
  });
  $("#pcOut").addEventListener("input", e => { if (["pcPrepQ", "pcPrepLv", "pcPrepEd"].includes(e.target.id)) renderPrepList(); });
  $("#pcCopy").addEventListener("click", async () => { if (!currentPC) { toast("Forge a character first"); return; } try { await navigator.clipboard.writeText(sheetText(currentPC)); toast("Character sheet copied"); } catch { toast("Couldn't copy here"); } });
  $("#pcSave").addEventListener("click", () => addPCToCampaign($("#pcCampaign").value));
})();
