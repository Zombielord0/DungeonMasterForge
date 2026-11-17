/* 07c-species.js: Species and races by rules edition (PC_RACES, raceInfo), their defences, and species features that arrive at later levels. */

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
/* The Features & Traits list, shared by both sheets (the Characters tab and My Characters): each feature with where it
   comes from (subclass, multiclass, species, level), then the species traits. My Characters passes edit (features can
   be opened to make choices) and leaves out "Feat: …" entries, which it lists in its own Feats section. */
const featTagOf = (c, f) => { const l = +f.l || 1; /* a number, never markup: sheets can come from another player */ return f.sub ? `${esc(c.subclass)}, lv ${l}` : f.mcsub ? `${esc(f.mcsub)}, ${esc(f.mc)} lv ${l}` : f.mc ? `${esc(f.mc)} lv ${l}` : (f.race ? esc(raceLabel(c)) + ", " : "") + "lv " + l; };
function featuresListHTML(c, edit) {
  const feats = (c.feats || []).filter(f => !edit || !String(f.f).startsWith("Feat: "));
  return `<ul class="plain">${feats.map(f => featLi(f.f, featTagOf(c, f), c, edit || undefined)).join("")}${(c.traits || []).map(t => featLi(t, esc(raceLabel(c)), c)).join("")}</ul>`;
}
function featLi(f, tag, c, edit) {
  const d = featDesc(f, c), full = subFeatDesc(f, c) ? "" : FEAT_FULL[f];
  const head = `<b>${esc(f)}</b> <span class="muted" style="font-size:13px">(${tag})</span>${d ? `<div class="ft-desc">${esc(d)}</div>` : ""}${edit && CHOICES[f] ? choiceHTML(c, f) : ""}`;
  return full ? `<li class="ft-li"><details><summary title="Show the full description">${head}</summary><div class="ft-full">${esc(full)}</div></details></li>` : `<li>${head}</li>`;
}
