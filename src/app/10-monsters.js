/* 10-monsters.js: Villain generator, Monster Manual, monster builder, and companions, familiars and Wild Shape. */

/* ======================= Villain & monster generator ======================= */
// Typical monster numbers by CR (based on Monster Manual medians): [AC, HP, attack bonus, damage per round, save DC]
const CR_TABLE = {
  0: [10, 4, 2, 1, 10], 0.125: [11, 9, 3, 3, 10], 0.25: [11, 13, 3, 5, 10], 0.5: [12, 22, 3, 8, 10],
  1: [12, 33, 3, 12, 11], 2: [13, 45, 3, 17, 11], 3: [13, 65, 4, 23, 12], 4: [14, 84, 5, 28, 13],
  5: [15, 95, 6, 35, 14], 6: [15, 112, 6, 41, 14], 7: [15, 130, 6, 47, 14], 8: [15, 136, 7, 53, 15],
  9: [16, 145, 7, 59, 15], 10: [17, 155, 7, 65, 15], 11: [17, 165, 8, 71, 16], 12: [17, 175, 8, 77, 16],
  13: [18, 184, 8, 83, 16], 14: [18, 196, 8, 89, 17], 15: [18, 210, 8, 95, 17], 16: [18, 229, 9, 101, 17],
  17: [19, 246, 10, 107, 18], 18: [19, 266, 10, 113, 18], 19: [19, 285, 10, 119, 18], 20: [19, 300, 10, 132, 19],
  21: [19, 325, 11, 150, 19], 22: [19, 350, 11, 168, 20], 23: [19, 375, 11, 186, 20], 24: [19, 400, 12, 204, 21],
  25: [19, 430, 12, 222, 21], 26: [19, 460, 12, 240, 21], 27: [19, 490, 13, 258, 22], 28: [19, 540, 13, 276, 22],
  29: [19, 600, 13, 294, 22], 30: [19, 666, 14, 312, 23]
};
const CR_LIST = Object.keys(CR_TABLE).map(Number).sort((a, b) => a - b);
const profOf = cr => cr < 5 ? 2 : cr < 9 ? 3 : cr < 13 ? 4 : cr < 17 ? 5 : cr < 21 ? 6 : cr < 25 ? 7 : cr < 29 ? 8 : 9;
const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];
const HIT_DIE = { Tiny: 4, Small: 6, Medium: 8, Large: 10, Huge: 12, Gargantuan: 20 };
const ELEMENTS = { fire: ["fire", "Ember", "searing"], cold: ["cold", "Frost", "freezing"], lightning: ["lightning", "Storm", "crackling"], acid: ["acid", "Bile", "corroding"], poison: ["poison", "Venom", "toxic"], necrotic: ["necrotic", "Grave", "withering"], radiant: ["radiant", "Dawn", "blinding"], psychic: ["psychic", "Mind", "maddening"], thunder: ["thunder", "Thunder", "booming"], force: ["force", "Rune", "shimmering"] };
const MTYPES = {
  aberration: { sizes: ["Medium", "Large", "Large", "Huge"], el: ["psychic", "psychic", "acid", "force"], ments: { int: 4, wis: 2, cha: 2 }, cast: "int", res: ["psychic"], imm: [], cimm: [], senses: "darkvision 120 ft", lang: "Deep Speech, telepathy 60 ft", align: ["lawful evil", "chaotic evil", "neutral evil"], nat: true,
    nouns: ["Mindrender", "Gloomeye", "Brainwyrm", "Hollow Choir", "Tendril Lord", "Unblinking", "Starspawn", "Veilfeeder"], weap: ["Tentacle", "Lashing Feeler", "Maw"], look: ["a mass of glistening tentacles around a single lidless eye", "a too-tall figure whose face folds open like petals", "a jellied sac that floats a few feet off the ground, trailing nerves", "a bloated brain encased in chitin, walking on six spindly legs"] },
  beast: { sizes: ["Medium", "Large", "Large", "Huge"], el: ["poison", "poison", "acid"], ments: { int: -4, wis: 1, cha: -3 }, cast: "wis", res: [], imm: [], cimm: [], senses: "darkvision 60 ft", lang: "—", align: ["unaligned"], nat: true,
    nouns: ["Stalker", "Ripjaw", "Thornback", "Shrike", "Gorehorn", "Tusker", "Prowler", "Razorhide"], weap: ["Bite", "Claws", "Gore", "Tail"], look: ["a slab-shouldered predator with bone plates growing through its fur", "a lean, eyeless hunter with a mouth that splits to the throat", "a towering horned grazer driven mad and hungry for meat", "a scaled pack-hunter whose feathers rattle like dry leaves"] },
  celestial: { sizes: ["Medium", "Large"], el: ["radiant"], ments: { int: 1, wis: 3, cha: 4 }, cast: "wis", res: ["radiant"], imm: [], cimm: ["charmed", "frightened"], senses: "truesight 60 ft", lang: "all, telepathy 120 ft", align: ["lawful good", "lawful neutral"], nat: false,
    nouns: ["Fallen Herald", "Choir-Warden", "Sunless Seraph", "Judgement", "Penitent", "Lantern Saint"], weap: ["Radiant Blade", "Burning Spear", "Gilded Mace"], look: ["a winged figure in cracked gold armor, halo guttering like a dying candle", "a faceless knight of white light with too many wings", "a weeping statue-like angel whose tears burn the ground"] },
  construct: { sizes: ["Medium", "Large", "Large", "Huge"], el: ["lightning", "fire", "force"], ments: { int: -3, wis: 0, cha: -4 }, cast: "int", res: [], imm: ["poison", "psychic"], cimm: ["charmed", "exhaustion", "frightened", "paralyzed", "petrified", "poisoned"], senses: "darkvision 60 ft", lang: "understands its creator's languages but can't speak", align: ["unaligned", "lawful neutral"], nat: false,
    nouns: ["Warden", "Siegebreaker", "Clockwork Knight", "Iron Penitent", "Runeguard", "Brass Colossus"], weap: ["Slam", "Piston Fist", "Bladed Arm"], look: ["a hulking frame of riveted iron with a furnace glowing in its chest", "a slender automaton of brass and glass, its gears visible as it moves", "a rune-carved stone giant whose eyes are two cold lanterns"] },
  dragon: { sizes: ["Large", "Huge", "Huge", "Gargantuan"], el: ["fire", "cold", "lightning", "acid", "poison"], ments: { int: 2, wis: 1, cha: 3 }, cast: "cha", res: [], imm: [], cimm: [], senses: "blindsight 30 ft, darkvision 120 ft", lang: "Common, Draconic", align: ["chaotic evil", "lawful evil", "neutral evil"], nat: true,
    nouns: ["Wyrm", "Drake", "Wyvernlord", "Scaled Tyrant", "Elder Serpent"], weap: ["Bite", "Claws", "Tail"], look: ["a long, sinuous dragon with scales the color of old blood", "a scarred, one-eyed dragon whose wings are torn but still strong", "a lean dragon whose scales shed glittering dust with every breath"] },
  elemental: { sizes: ["Large", "Large", "Huge"], el: ["fire", "cold", "lightning", "thunder", "acid"], ments: { int: -3, wis: 0, cha: -2 }, cast: "wis", res: ["bludgeoning, piercing, and slashing from nonmagical attacks"], imm: ["poison"], cimm: ["exhaustion", "grappled", "paralyzed", "petrified", "poisoned", "prone", "restrained", "unconscious"], senses: "darkvision 60 ft", lang: "Primordial", align: ["neutral"], nat: true,
    nouns: ["Tempest", "Cinder", "Maelstrom", "Avalanche", "Squall", "Wrath"], weap: ["Slam", "Lash", "Surge"], look: ["a whirling column of wind and grit with a face that forms and dissolves", "a shambling hulk of magma that cools and cracks as it walks", "a shape of living storm cloud, lightning branching through it"] },
  fey: { sizes: ["Small", "Medium", "Medium", "Large"], el: ["psychic", "poison", "cold"], ments: { int: 1, wis: 2, cha: 4 }, cast: "cha", res: [], imm: [], cimm: ["charmed"], senses: "darkvision 60 ft", lang: "Common, Elvish, Sylvan", align: ["chaotic neutral", "chaotic evil", "neutral evil"], nat: false,
    nouns: ["Thorn Queen", "Hollow Prince", "Gloamling", "Briar Hag", "Mirthless Jester", "Antlered Lord"], weap: ["Thorned Whip", "Silver Rapier", "Claws"], look: ["a beautiful figure whose shadow is a twisted, antlered thing", "a gaunt hag with bark for skin and moths nesting in her hair", "a laughing child-sized creature with a smile far too wide"] },
  fiend: { sizes: ["Medium", "Large", "Large", "Huge"], el: ["fire", "necrotic", "poison"], ments: { int: 2, wis: 1, cha: 4 }, cast: "cha", res: ["cold", "bludgeoning, piercing, and slashing from nonmagical attacks"], imm: ["fire", "poison"], cimm: ["poisoned"], senses: "darkvision 120 ft", lang: "Abyssal, Infernal, telepathy 120 ft", align: ["lawful evil", "chaotic evil"], nat: false,
    nouns: ["Hellwarden", "Pit Duke", "Ashen Tempter", "Chain Devil", "Soulbroker", "Gorefiend"], weap: ["Infernal Blade", "Barbed Whip", "Claws"], look: ["a horned giant in molten chains, smoke pouring from its mouth", "an elegant figure in red silks whose eyes are pits of embers", "a skinless brute wreathed in black flame"] },
  giant: { sizes: ["Large", "Huge", "Huge"], el: ["cold", "fire", "thunder", "lightning"], ments: { int: -1, wis: 0, cha: 0 }, cast: "wis", res: [], imm: [], cimm: [], senses: "darkvision 60 ft", lang: "Common, Giant", align: ["chaotic evil", "neutral evil", "lawful evil"], nat: false,
    nouns: ["Jarl", "Mountain-Breaker", "Skullcrusher", "Rimewalker", "Forge-Tyrant", "Oath-Breaker"], weap: ["Greataxe", "Greatclub", "Maul"], look: ["a towering giant in a cloak of stitched bear hides", "a soot-black giant with an anvil chained to its belt", "a blue-skinned giant whose beard is hung with icicles"] },
  humanoid: { sizes: ["Medium"], el: ["necrotic", "fire", "poison", "psychic", "force"], ments: { int: 2, wis: 1, cha: 3 }, cast: "int", res: [], imm: [], cimm: [], senses: "passive Perception only", lang: "Common and two others", align: ["lawful evil", "neutral evil", "chaotic evil"], nat: false, humanoid: true,
    nouns: ["Warlord", "Necromancer", "Cult Prophet", "Blackguard", "Witch-Queen", "Spymaster", "Inquisitor", "Mad Alchemist"], weap: ["Longsword", "Dagger", "Staff", "Glaive"], look: ["a tall figure in battered black plate, a crown welded to the helm", "a soft-spoken scholar with ink-stained fingers and dead eyes", "a scarred veteran wearing the tabards of every army they've destroyed"] },
  monstrosity: { sizes: ["Medium", "Large", "Large", "Huge"], el: ["poison", "acid", "psychic"], ments: { int: -2, wis: 1, cha: -1 }, cast: "wis", res: [], imm: [], cimm: [], senses: "darkvision 60 ft", lang: "understands Common but can't speak", align: ["unaligned", "neutral evil", "chaotic evil"], nat: true,
    nouns: ["Hydra-Maw", "Chimeric Horror", "Gorgonhide", "Spinewing", "Manticora", "Cave Matron"], weap: ["Bite", "Claws", "Tail Spikes", "Stinger"], look: ["a lion-bodied horror with a scorpion's tail and a human face", "a multi-headed serpent that hisses in several voices", "a spider the size of a cart with a woman's torso"] },
  ooze: { sizes: ["Large", "Large", "Huge"], el: ["acid", "poison"], ments: { int: -5, wis: -2, cha: -5 }, cast: "wis", res: ["acid"], imm: [], cimm: ["blinded", "charmed", "deafened", "exhaustion", "frightened", "prone"], senses: "blindsight 60 ft (blind beyond this radius)", lang: "—", align: ["unaligned"], nat: true,
    nouns: ["Devouring Slime", "Grey Hunger", "Crawling Pool", "Bile Mass", "Sludge Mother"], weap: ["Pseudopod"], look: ["a quivering mass of grey slime studded with half-dissolved bones", "a clear, almost invisible jelly that fills an entire corridor", "a tar-black pool that rises into grasping limbs"] },
  plant: { sizes: ["Medium", "Large", "Huge"], el: ["poison", "acid"], ments: { int: -3, wis: 1, cha: -3 }, cast: "wis", res: ["bludgeoning", "piercing"], imm: [], cimm: ["blinded", "deafened"], senses: "blindsight 60 ft", lang: "Sylvan (rarely)", align: ["unaligned", "neutral evil"], nat: true,
    nouns: ["Blightroot", "Strangler Tree", "Rotbloom", "Thornwood Horror", "Corpse Lily"], weap: ["Vine Lash", "Thorned Branch", "Root Slam"], look: ["a walking tangle of black roots wrapped around a corpse", "a huge flower whose petals open to reveal rows of teeth", "a gnarled tree that drags itself forward on its roots"] },
  undead: { sizes: ["Medium", "Medium", "Large"], el: ["necrotic", "cold"], ments: { int: 1, wis: 1, cha: 2 }, cast: "int", res: ["necrotic", "bludgeoning, piercing, and slashing from nonmagical attacks"], imm: ["poison"], cimm: ["exhaustion", "poisoned"], senses: "darkvision 60 ft", lang: "the languages it knew in life", align: ["lawful evil", "neutral evil", "chaotic evil"], nat: false,
    nouns: ["Grave Knight", "Dread Wraith", "Bone Tyrant", "Hollow King", "Plague Saint", "Drowned Widow"], weap: ["Grave Blade", "Life Drain", "Rotting Claws"], look: ["a skeletal knight in rusted armor, a pale fire in its chest", "a drifting woman in a waterlogged gown, her face hidden by black hair", "a corpse-king seated on a throne of bones, still wearing a moldering crown"] }
};
const ROLES_G = {
  brute: { label: "Brute", ac: -1, hp: 1.2, dmg: 1.15, prim: "str", tac: "brute" },
  soldier: { label: "Soldier", ac: 2, hp: 0.85, dmg: 0.95, prim: "str", tac: "soldier" },
  skirmisher: { label: "Skirmisher", ac: 1, hp: 0.85, dmg: 1.0, prim: "dex", tac: "skirmisher" },
  artillery: { label: "Artillery", ac: -1, hp: 0.8, dmg: 1.15, prim: "cast", tac: "artillery" },
  controller: { label: "Controller", ac: 0, hp: 0.9, dmg: 0.8, prim: "cast", tac: "controller" },
  lurker: { label: "Lurker", ac: 0, hp: 0.75, dmg: 1.2, prim: "dex", tac: "ambusher" },
  solo: { label: "Solo boss", ac: 1, hp: 1.0, dmg: 0.75, prim: "str", tac: "solo" }
};
ROLE_TAC.artillery = "Keep distance: start far back or high up, fire every round, and move away when anyone closes in. Pick off whoever is hiding behind the front line.";
const ENVS = {
  any: { label: "Anywhere", speed: "", lair: ["the ruin it has claimed"], feat: ["crumbling pillars", "a pit of old bones"] },
  caverns: { label: "Caverns", speed: "climb", lair: ["a sunless grotto beneath the mountains", "a cavern full of glowing fungus"], feat: ["stalactites that can be shaken loose", "a chasm with a narrow ledge"] },
  ruins: { label: "Crypts & ruins", speed: "", lair: ["a collapsed temple vault", "a royal crypt sealed for centuries"], feat: ["sarcophagi", "a collapsing floor"] },
  forest: { label: "Forest", speed: "climb", lair: ["a hollow at the heart of an ancient tree", "a ring of standing stones deep in the woods"], feat: ["thick undergrowth", "a deadfall of trunks"] },
  swamp: { label: "Swamp", speed: "swim", lair: ["a sunken shrine in a black bog", "a stilt-hut village it has emptied"], feat: ["sucking mud", "rotting walkways"] },
  mountains: { label: "Mountains", speed: "climb", lair: ["an eyrie on a wind-scoured peak", "a dwarven mine it has taken"], feat: ["sheer drops", "loose scree"] },
  desert: { label: "Desert", speed: "burrow", lair: ["a buried pyramid", "a dry oasis ringed with bleached bones"], feat: ["shifting sand", "a half-buried colossus"] },
  arctic: { label: "Arctic", speed: "", lair: ["an ice cave under a glacier", "a frozen shipwreck"], feat: ["thin ice", "blinding snow"] },
  coast: { label: "Coast & sea", speed: "swim", lair: ["a sea cave flooded at high tide", "a drowned lighthouse"], feat: ["crashing waves", "slick rocks"] },
  urban: { label: "City", speed: "", lair: ["the cellars beneath a noble estate", "an abandoned cathedral"], feat: ["rooftops and alleys", "panicking crowds"] },
  planar: { label: "Other planes", speed: "fly", lair: ["a fortress adrift in the Astral Sea", "a palace of brass on a burning plane"], feat: ["gravity that shifts", "portals that open and close"] }
};
const VILLAIN_ARCH = [
  ["The Tyrant", "rules through fear and wants total control"], ["The Zealot", "serves a dark power and believes they are righteous"], ["The Mastermind", "pulls every string from the shadows"],
  ["The Fallen Hero", "was once a champion and has decided the world must be saved by force"], ["The Avenger", "wants revenge for a real wrong, at any cost"], ["The Collector", "hoards relics, souls or secrets"],
  ["The Corruptor", "tempts others into ruin with gifts and bargains"], ["The Destroyer", "wants to burn the world down and start again"], ["The Immortal", "will do anything to escape death"]
];
const V_TITLES = ["the Ashen", "the Hollow", "the Unbowed", "of the Black Tide", "the Pale", "the Twice-Born", "the Crowned", "of the Thousand Eyes", "the Gentle", "the Iron Saint", "the Last", "the Starved"];
const V_MANNER = ["never raises their voice", "speaks to a voice no one else can hear", "is unfailingly polite, even while killing", "quotes old law and scripture", "laughs at the wrong moments", "keeps a ledger of every slight", "treats heroes as promising students", "hums a lullaby when angry"];
const V_WEAK = ["their true name, written in a book in a forgotten library", "a phylactery hidden in the one place they still love", "a sibling who still believes they can be saved", "a relic that once belonged to the hero who first defeated them", "pride: they cannot refuse a formal challenge", "the ritual must be completed on a specific night, or it fails", "their power depends on a pact that a clever lawyer could break", "an old wound that never closed, which radiant light reopens"];
const V_SECRET = ["they are already dying, and the plan is a race against time", "they were the one who hired the heroes for their first job", "they are being controlled by something far worse", "they are a relative of one of the heroes", "they tried to stop this same catastrophe once, and failed", "the person they want to resurrect is still alive", "their lieutenant is planning to betray them"];
const V_QUOTES = ["You think you are the heroes of this story? Look at the bodies behind you.", "Kneel, and I will remember your names.", "Everything I have done, I have done so that no one will ever suffer as I did.", "I don't need you to understand. I need you to stay out of my way.", "Run. It makes the ending sweeter.", "You are too late. You were always going to be too late.", "Every kingdom is built on graves. I'm simply honest about it.", "Ah, you're the ones who've been ruining my plans. I've been looking forward to this."];
const SCHEME = [
  ["gathers followers and resources in secret", "seizes a key place or person by force", "begins the ritual or war that will change everything"],
  ["eliminates those who could stand against them", "corrupts a trusted institution from within", "reveals themselves when it's too late to stop them"],
  ["steals the pieces of an ancient relic", "tests its power on a small village", "turns the relic on the capital"],
  ["makes bargains with the desperate", "calls in every debt at once", "opens the door to something that should stay shut"]
];
const MON_RUMORS = ["Livestock have been found drained and arranged in circles.", "A trapper came back from the {env} babbling about {what}.", "Three caravans have vanished on the same stretch of road.", "Children in town have started drawing the same shape in the dirt.", "The local priest refuses to talk about what was buried there.", "A bounty notice offers good gold for proof of the creature, dead or alive.", "Old songs speak of a beast that wakes every hundred years. It has been a hundred years."];
const MON_SIGNS = ["deep gouges in stone, far too high on the wall", "a sickly-sweet smell that lingers for hours", "trails of slime that eat through leather", "birds falling silent for a mile around", "bones picked clean and neatly stacked", "frost on the ground in high summer", "scorch marks in the shape of footprints", "whispers heard from empty rooms"];
const MON_PARTS = [["fangs", 25], ["hide", 50], ["venom gland", 100], ["heart", 150], ["eyes", 75], ["horn", 100], ["ichor (a vial)", 50], ["core crystal", 250]];
const NAME_PRE = ["Gloom", "Ash", "Blight", "Rime", "Grave", "Thorn", "Bile", "Storm", "Hollow", "Dread", "Ember", "Moon", "Bone", "Shade", "Rot", "Iron"];
// Sizes that make sense for each creature type
const SIZE_OK = {
  aberration: ["Small", "Medium", "Large", "Huge", "Gargantuan"], beast: ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"],
  celestial: ["Medium", "Large", "Huge"], construct: ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"],
  dragon: ["Large", "Huge", "Gargantuan"], elemental: ["Small", "Medium", "Large", "Huge", "Gargantuan"],
  fey: ["Tiny", "Small", "Medium", "Large"], fiend: ["Small", "Medium", "Large", "Huge"], giant: ["Large", "Huge", "Gargantuan"],
  humanoid: ["Small", "Medium"], monstrosity: ["Small", "Medium", "Large", "Huge", "Gargantuan"],
  ooze: ["Small", "Medium", "Large", "Huge"], plant: ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"], undead: ["Tiny", "Small", "Medium", "Large", "Huge"]
};
const SMALL_LOOK = {
  aberration: ["a floating eye the size of a fist, trailing thin red tendrils", "a pale, crab-like thing that skitters across walls and whispers"],
  beast: ["a sleek, rat-sized predator with needle teeth and glowing eyes", "a small, iridescent serpent that strikes faster than the eye can follow", "a swarm-hunting bird with a hooked, venomous beak"],
  construct: ["a clockwork spider the size of a cat, ticking softly", "a little brass homunculus with a keyhole in its back"],
  elemental: ["a dancing mote of living flame the size of a child", "a knee-high whirl of dust and pebbles with two glinting eyes"],
  fey: ["a tiny winged sprite with a cruel little smile", "a mossy, knee-high trickster with a lantern for a head"],
  fiend: ["an imp-like devil with leathery wings and a barbed tail", "a grinning, child-sized demon with too many teeth"],
  monstrosity: ["a dog-sized, many-legged hunter with a scorpion's tail", "a small chimera of rat, bat and lizard"],
  ooze: ["a glistening puddle of grey slime that creeps toward warmth", "a fist-sized jelly that has eaten through the floorboards"],
  plant: ["a walking bramble the size of a dog, trailing seed pods", "a carnivorous flower that drags itself on root-feet"],
  undead: ["a skittering skeletal hand that moves on its own", "a small, flickering ghost of a lost child"]
};
const BIG_LOOK = {
  beast: ["an enormous, ancient predator whose footsteps shake the ground"], monstrosity: ["a colossal beast whose back is overgrown with trees and moss"],
  aberration: ["a vast, pulsing mass of eyes and mouths that blots out the sky"], construct: ["a walking fortress of stone and iron, as tall as a castle tower"],
  plant: ["an ancient tree the size of a keep, its roots dragging boulders as it walks"], elemental: ["a living storm as wide as a valley"]
};
function pickLook(r, T, typeKey, size) {
  if ((size === "Tiny" || size === "Small") && SMALL_LOOK[typeKey]) return r.pick(SMALL_LOOK[typeKey]);
  if (size === "Gargantuan" && BIG_LOOK[typeKey]) return r.pick(BIG_LOOK[typeKey]);
  return r.pick(T.look);
}
function syncForgeSizes() {
  const ty = $("#fgType"), sz = $("#fgSize");
  [...ty.options].forEach(op => { op.disabled = !!op.value && !!sz.value && !SIZE_OK[op.value].includes(sz.value); });
  [...sz.options].forEach(op => { op.disabled = !!op.value && !!ty.value && !SIZE_OK[ty.value].includes(op.value); });
  $("#fgSizeHint").textContent = ty.value ? `${cap1(ty.value)} creatures can be ${SIZE_OK[ty.value].map(x => x.toLowerCase()).join(", ").replace(/, ([^,]+)$/, " or $1")}.` : sz.value ? `Only creature types that can be ${sz.value.toLowerCase()} will be generated.` : "";
}
function crFor(lv, party, mode) {
  // Suggested CR: a solo boss near the deadly threshold, or one of four similar monsters near the hard threshold.
  const deadly = partyThr(lv, party, "deadly"), hard = partyThr(lv, party, "hard");
  let best = 0;
  CR_LIST.forEach(cr => { const xp = xpOf(cr) || (cr >= 25 ? 75000 + (cr - 25) * 15000 : 0); if (mode === "solo" ? xp <= deadly : xp * 4 * 2 <= hard) best = cr; });
  return best;
}
function dmgExpr(r, total, mod, preferDie) {
  // Build "XdY + mod" whose average is close to total.
  const dies = preferDie ? [preferDie] : [6, 8, 10, 12];
  let bestE = null;
  dies.forEach(d => { const avg = (d + 1) / 2; const n = Math.max(1, Math.round((total - Math.max(0, mod)) / avg)); const a = Math.floor(n * avg + mod); const err = Math.abs(a - total) + (n > 12 ? 5 : 0); if (!bestE || err < bestE.err) bestE = { n, d, a: Math.max(1, a), err }; });
  return { text: `${bestE.a} (${bestE.n}d${bestE.d}${mod ? (mod > 0 ? " + " + mod : " − " + -mod) : ""})`, avg: bestE.a, n: bestE.n, d: bestE.d };
}
function diceOnly(total, d = 6) { const n = Math.max(1, Math.round(total / ((d + 1) / 2))); return { text: `${Math.floor(n * (d + 1) / 2)} (${n}d${d})`, n, d }; }
function generateCreature(o) {
  const r = makeRng("forge", o.seed);
  const villain = o.kind === "villain";
  const sizeOk = k => !o.size || SIZE_OK[k].includes(o.size);
  const vPool = ["humanoid", "humanoid", "undead", "fiend", "fey", "dragon", "aberration", "giant"].filter(sizeOk);
  const typeKey = o.type || (villain ? r.pick(vPool.length ? vPool : Object.keys(MTYPES).filter(sizeOk)) : r.pick(Object.keys(MTYPES).filter(sizeOk)));
  const T = MTYPES[typeKey];
  const ROLE_BY_TYPE = { ooze: ["brute", "lurker", "controller"], plant: ["brute", "controller", "lurker"], beast: ["brute", "brute", "skirmisher", "lurker"], construct: ["brute", "soldier", "artillery"], elemental: ["brute", "controller", "artillery", "skirmisher"], dragon: ["brute", "skirmisher", "artillery"], giant: ["brute", "soldier", "artillery"] };
  const roleKey = o.role || (villain ? "solo" : r.pick(ROLE_BY_TYPE[typeKey] || ["brute", "brute", "soldier", "skirmisher", "artillery", "controller", "lurker"]));
  const R = ROLES_G[roleKey];
  const envKey = o.env || r.pick(Object.keys(ENVS).filter(k => k !== "any"));
  const E = ENVS[envKey];
  const cr = o.cr;
  const [tAC, tHP, tAtk, tDmg, tDC] = CR_TABLE[cr];
  const prof = profOf(cr);
  const OK = SIZE_OK[typeKey];
  const nearest = want => OK.slice().sort((a, b) => Math.abs(SIZES.indexOf(a) - SIZES.indexOf(want)) - Math.abs(SIZES.indexOf(b) - SIZES.indexOf(want)))[0];
  let autoSize = cr < 1 ? r.pick(["Small", "Medium"]) : cr >= 17 ? r.pick(["Huge", "Gargantuan"]) : r.pick(T.sizes);
  const size = o.size && OK.includes(o.size) ? o.size : nearest(o.size || autoSize);
  const elKey = o.element || r.pick(T.el);
  const EL = ELEMENTS[elKey];
  const legendary = roleKey === "solo" && cr >= 3;
  const out = { seed: o.seed, kind: o.kind, cr, typeKey, roleKey, envKey, elKey, size };
  if (villain) {
    const nm = fullName(r);
    out.name = `${nm} ${r.pick(V_TITLES)}`; out.short = nm.split(" ")[0];
    out.race = T.humanoid ? r.pick(size === "Small" ? ["halfling", "gnome", "goblin", "kobold"] : RACES.filter(x => !["halfling", "gnome"].includes(x))) : null; out.title = r.pick(T.nouns);
  } else {
    const pre = r.chance(.5) ? EL[1] : r.pick(NAME_PRE), noun = r.pick(T.nouns);
    out.name = !/[ -]/.test(noun) && noun.length <= 7 && r.chance(.5) ? pre + noun.toLowerCase() : `${pre} ${noun}`;
    out.short = out.name.split(" ").pop().toLowerCase();
  }
  out.the = villain ? out.short : "the " + out.short;
  const shortName = () => out.short, The = () => cap1(out.the), the = () => out.the;

  // ability scores
  const primKey = R.prim === "cast" ? T.cast : R.prim;
  const primMod = clamp(tAtk - prof + (cr >= 8 ? 1 : 0) + (roleKey === "brute" ? 1 : 0), 0, 10);
  const sc = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const bump = (k, m) => { sc[k] = clamp(10 + 2 * m + r.int(0, 1), 1, 30); };
  bump(primKey, primMod);
  const conMod = clamp(Math.round(primMod * (roleKey === "brute" || roleKey === "solo" ? 1 : 0.7)) + (["Huge", "Gargantuan"].includes(size) ? 1 : 0), 0, 9);
  if (primKey !== "con") bump("con", conMod);
  if (primKey !== "str") bump("str", clamp(Math.round(primMod * 0.5) + (["Large", "Huge", "Gargantuan"].includes(size) ? 2 : 0) - (["Tiny", "Small"].includes(size) ? 2 : 0), -3, 9));
  if (primKey !== "dex") bump("dex", clamp(r.int(-1, 2) - (["Huge", "Gargantuan"].includes(size) ? 2 : 0), -3, 4));
  ["int", "wis", "cha"].forEach(k => { if (k !== primKey) bump(k, clamp(T.ments[k] + Math.round(cr / 6) + r.int(-1, 1), -5, 8)); });
  if (T.ments.int <= -4) sc.int = r.int(1, 3);
  const M = k => mod(sc[k]);

  // defenses
  const ac = clamp(tAC + R.ac + (T.humanoid ? 0 : 0), 8, 24);
  const acSrc = T.humanoid ? (ac >= 17 ? "plate armor" : ac >= 15 ? "half plate" : ac >= 13 ? "studded leather" : "leather armor") : T.nat ? "natural armor" : typeKey === "construct" ? "armor plating" : typeKey === "celestial" || typeKey === "fiend" ? "natural armor" : typeKey === "undead" ? "rusted armor" : "natural armor";
  const hd = HIT_DIE[size], hdAvg = (hd + 1) / 2;
  const hpTarget = Math.round(tHP * R.hp * (legendary ? 1.1 : 1));
  const nHD = Math.max(1, Math.round(hpTarget / (hdAvg + M("con"))));
  const hp = Math.max(1, Math.floor(nHD * hdAvg) + nHD * M("con"));
  const speedParts = [`${["Tiny", "Small"].includes(size) ? 25 : roleKey === "skirmisher" || roleKey === "lurker" ? 40 : ["Huge", "Gargantuan"].includes(size) ? 50 : 30} ft`];
  if (typeKey === "dragon" || (typeKey === "fiend" && r.chance(.5)) || typeKey === "celestial" || (E.speed === "fly" && !["ooze", "plant", "construct"].includes(typeKey))) speedParts.push(`fly ${typeKey === "dragon" ? 80 : 60} ft`);
  if (E.speed === "climb" && typeKey !== "ooze") speedParts.push("climb 30 ft");
  if (E.speed === "swim") speedParts.push(`swim ${typeKey === "beast" || typeKey === "dragon" ? 40 : 30} ft`);
  if (E.speed === "burrow" && !T.humanoid) speedParts.push("burrow 20 ft");
  if (typeKey === "ooze") speedParts[0] = "20 ft";
  if (typeKey === "undead" && roleKey === "lurker") { speedParts.length = 0; speedParts.push("0 ft", "fly 50 ft (hover)"); }

  const saveKeys = r.pickN(["str", "dex", "con", "int", "wis", "cha"].filter(k => k !== "int" || T.ments.int > 0), cr >= 5 ? (legendary ? 4 : 3) : cr >= 2 ? 2 : 0);
  if (legendary && !saveKeys.includes("con")) saveKeys[0] = "con";
  const saves = saveKeys.sort((a, b) => AB.indexOf(a) - AB.indexOf(b)).map(k => `${AB_NAME[k][0] + AB_NAME[k].slice(1).toLowerCase()} ${sgn(M(k) + prof)}`);
  const skillOpts = { lurker: ["Stealth", "Perception"], skirmisher: ["Acrobatics", "Perception"], brute: ["Athletics", "Intimidation"], soldier: ["Athletics", "Perception"], artillery: ["Perception", "Arcana"], controller: ["Insight", "Deception"], solo: ["Perception", "Insight", villain ? "Deception" : "Athletics"] }[roleKey];
  const SK = { Stealth: "dex", Perception: "wis", Acrobatics: "dex", Athletics: "str", Intimidation: "cha", Arcana: "int", Insight: "wis", Deception: "cha" };
  if (T.ments.int <= -3) skillOpts.forEach((s, i) => { if (["Intimidation", "Deception", "Arcana", "Insight"].includes(s)) skillOpts[i] = skillOpts.includes("Perception") ? "Stealth" : "Perception"; });
  const skills = [...new Set(skillOpts)].map(s => `${s} ${sgn(M(SK[s]) + prof * (cr >= 10 && s === "Perception" ? 2 : 1))}`);
  const res = T.res.slice(); const imm = T.imm.slice();
  if (!["humanoid", "beast"].includes(typeKey) && !imm.includes(EL[0]) && !res.includes(EL[0])) (cr >= 8 ? imm : res).push(EL[0]);
  const passive = 10 + M("wis") + (skillOpts.includes("Perception") ? prof * (cr >= 10 ? 2 : 1) : 0);
  const senses = `${T.senses}, passive Perception ${passive}`.replace("passive Perception only, ", "");

  // actions
  const dpr = tDmg * R.dmg;
  const nAtk = cr < 1 ? 1 : cr < 5 ? 2 : cr < 11 ? (roleKey === "brute" ? 2 : 3) : 3;
  const reach = ["Large", "Huge", "Gargantuan"].includes(size) && roleKey !== "artillery" ? 10 : 5;
  const weapons = r.shuffle(T.weap);
  const atkStat = R.prim === "cast" ? T.cast : primKey;
  const aMod = M(atkStat === "con" ? "str" : atkStat);
  const toHit = Math.max(tAtk, prof + aMod);
  const actions = [], traits = [], bonus = [], reacts = [], legend = [], lair = [];
  const ranged = roleKey === "artillery" || roleKey === "controller";
  const elPart = r.chance(villain || cr >= 3 ? .8 : .4);
  const perAtk = dpr / nAtk;
  const mkAttack = (name, avg, isRanged, extra = "") => {
    const wpnShare = elPart ? avg * 0.65 : avg;
    const w = dmgExpr(r, wpnShare, aMod, isRanged ? 8 : (["Huge", "Gargantuan"].includes(size) ? 10 : null));
    const dType = /Drain/.test(name) ? "necrotic" : isRanged ? (/Crossbow|Spines/.test(name) ? "piercing" : /Boulder/.test(name) ? "bludgeoning" : EL[0]) : /Bite|Fang|Maw|Spear|Stinger|Spikes|Thorn/i.test(name) ? "piercing" : /Claw|Blade|sword|axe|Glaive|Whip|Lash|Rapier|Arm/i.test(name) ? "slashing" : "bludgeoning";
    const el = elPart && !(isRanged && dType === EL[0]) ? ` plus ${diceOnly(avg * 0.35, 6).text} ${EL[0]} damage` : "";
    return `<i>${isRanged ? "Ranged" : "Melee"} ${T.humanoid || !T.nat ? "Weapon" : "Weapon"} Attack:</i> ${sgn(toHit)} to hit, ${isRanged ? `range ${roleKey === "artillery" ? "120/480" : "60/240"} ft` : `reach ${reach} ft`}, one target. <i>Hit:</i> ${w.text} ${dType} damage${el}.${extra}`;
  };
  const mainW = weapons[0], offW = weapons[1] || weapons[0];
  if (nAtk > 1) actions.push(["Multiattack", `${The()} makes ${nAtk === 2 ? "two" : "three"} attacks${ranged ? `: any combination of ${mainW} and ${EL[1]} Bolt` : nAtk === 3 && offW !== mainW ? `: two with its ${mainW} and one with its ${offW}` : ` with its ${mainW}`}.`]);
  actions.push([mainW, mkAttack(mainW, perAtk, false, roleKey === "brute" && cr >= 2 ? ` If the target is a creature, it must succeed on a DC ${tDC} Strength saving throw or be knocked prone.` : roleKey === "soldier" ? "" : "")]);
  if (nAtk === 3 && offW !== mainW && !ranged) actions.push([offW, mkAttack(offW, perAtk, false, roleKey === "skirmisher" ? "" : (r.chance(.5) ? ` The target is grappled (escape DC ${tDC}) if it is Large or smaller.` : ""))]);
  const noThrow = ["ooze", "plant", "elemental", "undead"].includes(typeKey);
  const rName = ranged ? `${EL[1]} Bolt` : T.humanoid ? "Heavy Crossbow" : typeKey === "giant" ? "Hurled Boulder" : ["beast", "monstrosity", "dragon"].includes(typeKey) ? "Hurled Spines" : `${EL[1]} Bolt`;
  if (ranged || T.humanoid || typeKey === "giant" || (!noThrow && r.chance(.35))) actions.push([rName, mkAttack(rName, perAtk * (ranged ? 1.1 : 0.9), true, roleKey === "controller" ? ` The target's speed is halved until the end of its next turn.` : "")]);
  // signature area action
  const blastDmg = Math.max(2, Math.round(dpr * (roleKey === "artillery" ? 1.2 : legendary ? 1.1 : 0.9)));
  const blastShape = size === "Gargantuan" || cr >= 15 ? "60-foot cone" : ["Large", "Huge"].includes(size) ? "30-foot cone" : "15-foot cone";
  const blastSave = { fire: "Dexterity", cold: "Constitution", lightning: "Dexterity", acid: "Dexterity", poison: "Constitution", necrotic: "Constitution", radiant: "Constitution", psychic: "Wisdom", thunder: "Constitution", force: "Dexterity" }[elKey];
  const blastName = typeKey === "dragon" ? `${cap1(elKey)} Breath` : { psychic: "Mind Scream", necrotic: "Wave of Decay", radiant: "Searing Halo", thunder: "Thunderous Roar", force: "Arcane Burst", fire: "Fire Burst", cold: "Frost Nova", lightning: "Storm Lash", acid: "Acid Spray", poison: "Toxic Cloud" }[elKey];
  if (cr >= 1 && (roleKey !== "skirmisher" || cr >= 5)) {
    const rider = { psychic: "is stunned until the end of its next turn", necrotic: "can't regain hit points until the start of the creature's next turn", radiant: "is blinded until the end of its next turn", thunder: "is pushed 10 feet away and knocked prone", cold: "has its speed halved until the end of its next turn", poison: "is poisoned until the end of its next turn", lightning: "can't take reactions until its next turn", fire: "catches fire, taking 5 (1d10) fire damage at the start of each of its turns until a creature uses an action to put it out", acid: "has its AC reduced by 1 until it finishes a long rest (nonmagical armor only)", force: "is pushed 15 feet away" }[elKey];
    actions.push([`${blastName} (Recharge 5–6)`, `Each creature in a ${roleKey === "controller" || villain ? "20-foot-radius sphere centered on a point within 60 feet" : blastShape} must make a DC ${tDC} ${blastSave} saving throw, taking ${diceOnly(blastDmg, cr >= 5 ? 8 : 6).text} ${elKey} damage on a failed save, or half as much on a success. ${cr >= 3 ? `A creature that fails ${rider}.` : ""}`.trim()]);
  }
  if (roleKey === "controller" || (villain && cr >= 5)) {
    const ctrl = { psychic: ["Dominating Glare", "Wisdom", "charmed. While charmed, it obeys the creature's spoken commands"], necrotic: ["Grasp of the Grave", "Strength", "restrained by spectral hands"], radiant: ["Judgement", "Wisdom", "frightened"], fire: ["Burning Chains", "Strength", "restrained"], cold: ["Freezing Gaze", "Constitution", "restrained as ice creeps up its limbs"], poison: ["Paralytic Spores", "Constitution", "paralyzed"], acid: ["Ensnaring Slime", "Strength", "restrained"], lightning: ["Arc Lock", "Constitution", "stunned"], thunder: ["Deafening Command", "Wisdom", "frightened and deafened"], force: ["Arcane Prison", "Charisma", "restrained in a cage of force"] }[elKey];
    if (cr < 7 && ctrl[2].startsWith("paralyzed")) ctrl[2] = "poisoned and has its speed reduced to 0";
    actions.push([ctrl[0], `One creature ${the()} can see within 60 feet must succeed on a DC ${tDC} ${ctrl[1]} saving throw or be ${ctrl[2]} for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on a success.`]);
  }
  if (villain && T.humanoid) {
    const sp = cr >= 11 ? ["fireball", "counterspell", "dimension door", "dominate person", "wall of force"] : cr >= 5 ? ["misty step", "hold person", "counterspell", "fear", "dimension door"] : ["shield", "misty step", "hold person", "command"];
    traits.push(["Spellcasting", `${The()}'s spellcasting ability is ${({ int: "Intelligence", wis: "Wisdom", cha: "Charisma" })[T.cast]} (spell save DC ${tDC}, ${sgn(toHit)} to hit). It can cast: <i>${sp.join(", ")}</i> (each 1/day).`]);
  }
  // traits
  const tPool = [];
  if (typeKey === "undead") tPool.push(["Turn Defiance", `${The()} and any undead within 30 feet of it have advantage on saving throws against effects that turn undead.`], ["Sunlight Sensitivity", "While in sunlight, it has disadvantage on attack rolls and Wisdom (Perception) checks that rely on sight."]);
  if (typeKey === "fiend" || typeKey === "fey" || typeKey === "celestial" || (villain && cr >= 8)) tPool.push(["Magic Resistance", "It has advantage on saving throws against spells and other magical effects."]);
  if (typeKey === "construct") tPool.push(["Immutable Form", "It is immune to any spell or effect that would alter its form."]);
  if (typeKey === "ooze") tPool.push(["Amorphous", "It can move through a space as narrow as 1 inch wide without squeezing."], ["Corrosive Form", "A creature that touches it or hits it with a melee attack while within 5 feet takes 4 (1d8) acid damage. Nonmagical weapons that hit it corrode."]);
  if (typeKey === "plant") tPool.push(["False Appearance", "While it remains motionless, it is indistinguishable from an ordinary plant."]);
  if (typeKey === "beast" || typeKey === "monstrosity") tPool.push(["Keen Senses", "It has advantage on Wisdom (Perception) checks that rely on smell or hearing."], ["Pounce", `If it moves at least 20 feet straight toward a creature and then hits it with a melee attack on the same turn, that target must succeed on a DC ${tDC} Strength saving throw or be knocked prone. If the target is prone, it can make one more attack against it as a bonus action.`]);
  if (typeKey === "elemental") tPool.push([`${EL[1]} Aura`, `At the start of each of its turns, each creature within 5 feet of it takes ${diceOnly(Math.max(3, Math.round(cr * 1.5)), 6).text} ${elKey} damage.`]);
  if (typeKey === "dragon" || typeKey === "aberration") tPool.push(["Amphibious", "It can breathe air and water."]);
  if (roleKey === "lurker") tPool.push(["Ambusher", `In the first round of combat, it has advantage on attack rolls against any creature it surprised, and its hits against them deal an extra ${diceOnly(Math.max(3, dpr * 0.4), 6).text} damage.`], ["Shadow Stealth", "While in dim light or darkness, it can take the Hide action as a bonus action."]);
  if (roleKey === "brute") tPool.push(["Reckless", "At the start of its turn, it can gain advantage on all melee attack rolls during that turn, but attack rolls against it have advantage until the start of its next turn."], ["Relentless (Recharges after a Short or Long Rest)", `If it takes ${Math.max(7, Math.round(cr * 4))} damage or less that would reduce it to 0 hit points, it is reduced to 1 hit point instead.`]);
  if (roleKey === "soldier") tPool.push(["Martial Advantage", `Once per turn, it deals an extra ${diceOnly(Math.max(4, cr * 2), 6).text} damage to a creature it hits if an ally is within 5 feet of that creature.`], ["Pack Tactics", "It has advantage on attack rolls against a creature if at least one ally is within 5 feet of that creature and isn't incapacitated."]);
  if (roleKey === "skirmisher") tPool.push(["Flyby", "It doesn't provoke opportunity attacks when it moves out of an enemy's reach."], ["Evasion", "When subjected to an effect that allows a Dexterity save for half damage, it takes no damage on a success and half on a failure."]);
  if (roleKey === "artillery") tPool.push(["Sniper", "Attacking at long range doesn't impose disadvantage on its ranged attack rolls."]);
  if (roleKey === "controller") tPool.push(["Unsettling Presence", "Creatures within 10 feet of it have disadvantage on concentration saving throws."]);
  if (E.speed === "climb") tPool.push(["Spider Climb", "It can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check."]);
  if (cr >= 4 && r.chance(.35) && !["construct", "ooze"].includes(typeKey)) tPool.push(["Regeneration", `It regains ${Math.max(5, Math.round(cr * 1.5 / 5) * 5)} hit points at the start of its turn if it has at least 1 hit point. If it takes ${elKey === "radiant" ? "necrotic" : typeKey === "undead" || typeKey === "fiend" ? "radiant" : "fire or acid"} damage, this trait doesn't function at the start of its next turn.`]);
  r.shuffle(tPool).slice(0, legendary ? 3 : 2).forEach(t => traits.push(t));
  if (legendary) {
    const lr = cr >= 10 ? 3 : cr >= 5 ? 2 : 1;
    traits.unshift(["Legendary Resistance (" + lr + "/Day)", "If it fails a saving throw, it can choose to succeed instead."]);
    traits.push(["Bloodied Fury", `The first time it is reduced to half its hit points or fewer, its ${blastName} recharges, it can immediately take one extra turn's worth of movement, and it ${villain ? "reveals a second form or a desperate new power" : "becomes enraged, gaining advantage on attack rolls until the end of its next turn"}.`]);
  }
  // bonus actions & reactions
  if (roleKey === "skirmisher" || roleKey === "lurker") bonus.push(["Nimble Step", "It takes the Dash, Disengage or Hide action."]);
  if (villain || roleKey === "solo") bonus.push(["Command Minions", "Up to two allies within 60 feet that can hear it can use their reactions to move up to half their speed or make one weapon attack."]);
  const armed = T.humanoid || ["celestial", "fiend", "giant", "construct"].includes(typeKey) || (typeKey === "undead" && !/Drain|Claws/.test(mainW));
  if ((roleKey === "soldier" || T.humanoid) && armed) reacts.push(["Parry", `It adds ${prof} to its AC against one melee attack that would hit it. It must see the attacker and be wielding a weapon.`]);
  else if (roleKey === "brute" || roleKey === "solo" || roleKey === "soldier") reacts.push(["Retaliate", "When a creature within 5 feet of it hits it with a melee attack, it makes one melee attack against that creature."]);
  else if (roleKey === "controller" || roleKey === "artillery") reacts.push(["Warding Flare", `When hit by an attack, it can impose disadvantage on that roll if it sees the attacker; if the attack still hits, the attacker takes ${diceOnly(Math.max(3, cr * 2), 6).text} ${elKey} damage.`]);
  // legendary + lair
  if (legendary) {
    legend.push(["Move", "It moves up to half its speed without provoking opportunity attacks."]);
    legend.push(["Attack", `It makes one ${mainW} attack.`]);
    legend.push([`${EL[1]} Pulse (Costs 2 Actions)`, `Each creature within 10 feet must succeed on a DC ${tDC} ${blastSave} saving throw or take ${diceOnly(Math.max(4, dpr * 0.4), 6).text} ${elKey} damage.`]);
    if (villain || cr >= 8) {
      lair.push(`The ground of ${E.lair[0]} heaves; each creature on the ground within the lair must succeed on a DC ${tDC} Dexterity saving throw or be knocked prone.`);
      lair.push(`${cap1(EL[2])} energy erupts from the walls in a 20-foot square; creatures there take ${diceOnly(Math.max(5, cr * 2), 6).text} ${elKey} damage (DC ${tDC} ${blastSave} saving throw for half).`);
      lair.push(villain ? "Two minions loyal to the villain arrive through hidden passages or portals and act on the next initiative count." : `The lair's ${E.feat[0]} shift; the area becomes difficult terrain until the next lair action.`);
    }
  }
  if (villain) {
    const arch = r.pick(VILLAIN_ARCH), race = out.race;
    out.subtitle = `${size} ${typeKey}${race ? ` (${race})` : ""}, ${r.pick(T.align)}`;
    out.villain = {
      archetype: arch[0], archDesc: arch[1], motive: r.pick(MOTIVES), look: pickLook(r, T, typeKey, size), manner: r.pick(V_MANNER),
      weakness: r.pick(V_WEAK), secret: r.pick(V_SECRET), quotes: r.pickN(V_QUOTES, 3), scheme: r.pick(SCHEME), lair: r.pick(E.lair),
      lieutenants: [], minions: null
    };
    const lcr = CR_LIST.filter(c2 => c2 <= Math.max(0.5, cr / 2.5) && c2 >= Math.max(0, cr / 5)).pop() || 0.5;
    const lpool = MON.filter(m => m[1] <= lcr && m[1] >= lcr / 2).concat(VSTAT.filter(v => v[1] <= lcr && v[1] >= lcr / 2));
    const lroles = r.pickN(["enforcer", "spymaster", "high priest", "quartermaster", "champion", "apprentice"], 2);
    for (let i = 0; i < 2; i++) { const s = r.pick(lpool.length ? lpool : MON.slice(0, 10)); out.villain.lieutenants.push({ name: fullName(r), role: lroles[i], stat: s[0], cr: s[1] }); }
    const mcr = Math.max(0.125, CR_LIST.filter(c2 => c2 <= cr / 4).pop() || 0.125);
    const mpool = MON.filter(m => m[1] <= mcr && m[1] >= mcr / 2);
    const ms = r.pick(mpool.length ? mpool : MON.slice(0, 6)); out.villain.minions = { stat: ms[0], cr: ms[1], n: r.int(4, 8) };
    out.villain.reward = r.pickN(REWARDS[tierOf(Math.max(1, Math.round(cr)))], 2);
  } else {
    out.subtitle = `${size} ${typeKey}, ${r.pick(T.align)}`;
    const what = pickLook(r, T, typeKey, size);
    out.monster = {
      look: what, habitat: r.pick(E.lair), signs: r.pickN(MON_SIGNS, 2),
      rumors: r.pickN(MON_RUMORS, 2).map(x => x.replace("{env}", E.label.toLowerCase()).replace("{what}", `a creature they called the ${out.name}`)),
      parts: r.pickN(MON_PARTS.filter(([p]) => ["construct", "elemental"].includes(typeKey) ? ["core crystal", "ichor (a vial)", "eyes"].includes(p) : typeKey === "ooze" ? ["ichor (a vial)", "core crystal"].includes(p) : !["core crystal"].includes(p)), 2).map(([p, v]) => [p, Math.round(v * Math.max(1, cr) / 5) * 5 || v]),
      weakness: elKey === "fire" ? "cold damage and deep water" : elKey === "necrotic" ? "radiant damage and holy symbols" : elKey === "radiant" ? "necrotic damage and darkness" : typeKey === "construct" ? "a command word carved on its core" : typeKey === "plant" ? "fire" : typeKey === "ooze" ? "cold, which makes it sluggish" : "its eyes and soft underbelly (called shots)"
    };
  }
  out.ac = ac; out.acSrc = acSrc; out.hp = hp; out.hpDice = `${nHD}d${hd}${M("con") ? (M("con") > 0 ? " + " : " − ") + Math.abs(nHD * M("con")) : ""}`;
  out.speed = speedParts.join(", "); out.scores = sc; out.saves = saves; out.skills = skills;
  out.res = res; out.imm = imm; out.cimm = T.cimm; out.senses = senses; out.lang = T.lang;
  out.prof = prof; out.dc = tDC; out.toHit = toHit; out.dpr = Math.round(dpr);
  out.traits = traits; out.actions = actions; out.bonus = bonus; out.reacts = reacts; out.legend = legend; out.lair = lair;
  out.tac = ROLE_TAC[R.tac] || ""; out.init = M("dex");
  out.blastName = blastName; out.mainW = mainW;
  return out;
}
/* ---- rendering ---- */
let forgeCur = null, forgeOpts = null;
function sbHTML(m) {
  const line = (k, v) => v ? `<div class="sb-l"><b>${k}</b> ${v}</div>` : "";
  const sec = (h, arr) => arr.length ? `<h4 class="sb-h">${h}</h4>${arr.map(([n, t]) => `<p><b><i>${esc(n)}.</i></b> ${t}</p>`).join("")}` : "";
  return `<div class="statblock">
    <div class="sb-name">${esc(m.name)}</div>
    <div class="sb-sub">${esc(cap1(m.subtitle))}</div>
    <div class="sb-rule"></div>
    ${line("Armor Class", `${m.ac} (${esc(m.acSrc)})`)}${line("Hit Points", `${m.hp} (${m.hpDice})`)}${line("Speed", esc(m.speed))}
    <div class="sb-rule"></div>
    <div class="abil">${AB.map(a => `<div class="ab"><div class="n">${AB_NAME[a]}</div><div class="m">${sgn(mod(m.scores[a]))}</div><div class="s">${m.scores[a]}</div></div>`).join("")}</div>
    <div class="sb-rule"></div>
    ${line("Saving Throws", m.saves.join(", "))}${line("Skills", m.skills.join(", "))}
    ${line("Damage Resistances", esc(m.res.join("; ")))}${line("Damage Immunities", esc(m.imm.join(", ")))}${line("Condition Immunities", esc(m.cimm.join(", ")))}
    ${line("Senses", esc(m.senses))}${line("Languages", esc(m.lang))}
    ${line("Challenge", `${crLabel(m.cr)} (${(xpOf(m.cr) || 0).toLocaleString()} XP)`)}${line("Proficiency Bonus", sgn(m.prof))}
    <div class="sb-rule"></div>
    ${m.traits.map(([n, t]) => `<p><b><i>${esc(n)}.</i></b> ${t}</p>`).join("")}
    ${sec("Actions", m.actions)}${sec("Bonus Actions", m.bonus)}${sec("Reactions", m.reacts)}
    ${m.legend.length ? `<h4 class="sb-h">Legendary Actions</h4><p>${esc(cap1(m.the))} can take 3 legendary actions, choosing from the options below. Only one option can be used at a time and only at the end of another creature's turn. It regains spent legendary actions at the start of its turn.</p>${m.legend.map(([n, t]) => `<p><b><i>${esc(n)}.</i></b> ${t}</p>`).join("")}` : ""}
    ${m.lair.length ? `<h4 class="sb-h">Lair Actions</h4><p>On initiative count 20 (losing initiative ties), ${esc(m.the)} takes a lair action to cause one of the following effects; it can't use the same effect two rounds in a row:</p><ul class="plain">${m.lair.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
  </div>`;
}
function forgeText(m) {
  const strip = s => String(s).replace(/<[^>]+>/g, "");
  const L = [m.name, cap1(m.subtitle), `Armor Class ${m.ac} (${m.acSrc})`, `Hit Points ${m.hp} (${m.hpDice})`, `Speed ${m.speed}`,
    AB.map(a => `${AB_NAME[a]} ${m.scores[a]} (${sgn(mod(m.scores[a]))})`).join("  ")];
  if (m.saves.length) L.push("Saving Throws " + m.saves.join(", "));
  L.push("Skills " + m.skills.join(", "));
  if (m.res.length) L.push("Damage Resistances " + m.res.join("; "));
  if (m.imm.length) L.push("Damage Immunities " + m.imm.join(", "));
  if (m.cimm.length) L.push("Condition Immunities " + m.cimm.join(", "));
  L.push("Senses " + m.senses, "Languages " + m.lang, `Challenge ${crLabel(m.cr)} (${(xpOf(m.cr) || 0).toLocaleString()} XP)   Proficiency Bonus ${sgn(m.prof)}`, "");
  m.traits.forEach(([n, t]) => L.push(`${n}. ${strip(t)}`));
  [["ACTIONS", m.actions], ["BONUS ACTIONS", m.bonus], ["REACTIONS", m.reacts], ["LEGENDARY ACTIONS (3 per round)", m.legend]].forEach(([h, a]) => { if (a.length) { L.push("", h); a.forEach(([n, t]) => L.push(`${n}. ${strip(t)}`)); } });
  if (m.lair.length) { L.push("", "LAIR ACTIONS (initiative 20)"); m.lair.forEach(x => L.push("- " + x)); }
  if (m.villain) {
    const v = m.villain;
    L.push("", "VILLAIN PROFILE", `Archetype: ${v.archetype}, who ${v.archDesc}`, `Motive: ${cap1(v.motive)}`, `Appearance: ${cap1(v.look)}`, `Manner: ${cap1(v.manner)}`,
      `Scheme: 1) ${cap1(v.scheme[0])}; 2) ${cap1(v.scheme[1])}; 3) ${cap1(v.scheme[2])}`, `Lair: ${cap1(v.lair)}`,
      `Lieutenants: ${v.lieutenants.map(l => `${l.name} (${l.role}, ${l.stat} stat block)`).join("; ")}`, `Minions: ${v.minions.n} × ${v.minions.stat}`,
      `Weakness: ${cap1(v.weakness)}`, `Secret: ${cap1(v.secret)}`, `Quotes: ${v.quotes.map(q => `"${q}"`).join(" ")}`);
  }
  if (m.monster) {
    const x = m.monster;
    L.push("", "LORE", `Appearance: ${cap1(x.look)}`, `Habitat: ${cap1(x.habitat)}`, `Signs: ${x.signs.join("; ")}`, `Rumors: ${x.rumors.join(" ")}`, `Weakness: ${cap1(x.weakness)}`, `Harvest: ${x.parts.map(([p, v]) => `${p} (${v} gp)`).join(", ")}`);
  }
  L.push("", "TACTICS: " + m.tac);
  return L.join("\n");
}
function forgeHTML(m) {
  const tags = `${m.villain ? `<span class="tag gold">${esc(m.title)}</span>` : ""}<span class="tag gold">CR ${crLabel(m.cr)}</span><span class="tag">${esc(ROLES_G[m.roleKey].label)}</span><span class="tag">${esc(cap1(m.typeKey))}</span><span class="tag">${esc(ENVS[m.envKey].label)}</span><span class="tag">${esc(cap1(m.elKey))}</span>`;
  const actionsBar = `<div class="actions"><button class="btn sm" data-fg="reroll">↻ Reroll</button><button class="btn sm" data-fg="copy">Copy stat block</button><button class="btn sm primary" data-fg="save">Save to campaign</button></div>`;
  let h = "";
  if (m.villain) {
    const v = m.villain;
    h += `<div class="card"><div class="gen-title">${esc(m.name)}</div><div class="gen-sub">${tags}</div>
      <div class="quote">“${esc(v.quotes[0])}”</div>
      <div class="npc-card" style="padding:0"><dl>
        <dt>Archetype</dt><dd><b>${esc(v.archetype)}</b>, who ${esc(v.archDesc)}.</dd>
        <dt>Motive</dt><dd>${esc(cap1(v.motive))}.</dd>
        <dt>Looks</dt><dd>${esc(cap1(v.look))}.</dd>
        <dt>Manner</dt><dd>${esc(cap1(v.manner))}.</dd>
        <dt>Lair</dt><dd>${esc(cap1(v.lair))}.</dd>
        <dt>Weakness</dt><dd>${esc(cap1(v.weakness))}.</dd>
        <dt>Secret</dt><dd>${esc(cap1(v.secret))}.</dd>
      </dl></div>${actionsBar}</div>`;
  } else {
    const x = m.monster;
    h += `<div class="card"><div class="gen-title">${esc(m.name)}</div><div class="gen-sub">${tags}</div>
      <p class="premise">${esc(cap1(x.look))}.</p>${actionsBar}</div>`;
  }
  h += `<div class="card">${sbHTML(m)}</div>`;
  if (m.villain) {
    const v = m.villain;
    h += `<div class="fg-grid">
      <div class="sec">${secHead("The Scheme")}<ol class="plain-ol">
        <li><b>Act I:</b> ${esc(cap1(v.scheme[0]))}. The heroes only see the effects: missing people, strange purchases, rumors.</li>
        <li><b>Act II:</b> ${esc(cap1(v.scheme[1]))}. The villain learns the heroes' names and starts working against them.</li>
        <li><b>Act III:</b> ${esc(cap1(v.scheme[2]))}. If no one stops them, they win, and the region is changed forever.</li></ol></div>
      <div class="sec">${secHead("Allies & Minions")}<ul class="plain">
        ${v.lieutenants.map(l => `<li><b>${esc(l.name)}</b>, the villain's ${esc(l.role)}. Use the ${esc(l.stat)} stat block (CR ${crLabel(l.cr)}).</li>`).join("")}
        <li><b>Minions:</b> groups of ${v.minions.n} × ${esc(v.minions.stat)} (CR ${crLabel(v.minions.cr)}) guard the lair and do the dirty work.</li></ul></div>
    </div>
    <div class="fg-grid">
      <div class="sec">${secHead("Foreshadowing")}<ul class="plain">
        <li>Someone mentions ${esc(m.name.split(" ")[0])} with fear, then refuses to say more.</li>
        <li>The heroes find the villain's sigil burned into a door or pressed into a wax seal at the scene of a crime, and hear it described: ${esc(v.look)}.</li>
        <li>A lieutenant (${esc(v.lieutenants[0].name)}) confronts the heroes first and quotes their master: “${esc(v.quotes[1])}”</li></ul></div>
      <div class="sec">${secHead("Running the Final Fight")}<ul class="plain">
        <li><b>Phase 1:</b> Fight in ${esc(v.lair)} with ${v.minions.n} minions and one lieutenant. The villain talks, tests the heroes and uses ${esc(m.blastName)} on clustered heroes.</li>
        <li><b>Phase 2 (half HP):</b> Bloodied Fury triggers. ${m.lair.length ? "Use lair actions every round" : "The lair turns against the heroes"}, and the second lieutenant arrives.</li>
        <li><b>Phase 3:</b> Desperate: “${esc(v.quotes[2])}” The villain tries to escape, bargain or take a hero with them. Exploiting the weakness (${esc(v.weakness)}) should end it.</li>
        <li><b>Reward:</b> ${v.reward.map(esc).join(", ")}.</li></ul></div>
    </div>`;
  } else {
    const x = m.monster;
    h += `<div class="fg-grid">
      <div class="sec">${secHead("Lore & Hooks")}<ul class="plain">
        <li><b>Habitat:</b> ${esc(cap1(x.habitat))}.</li>
        <li><b>Signs it's near:</b> ${x.signs.map(esc).join("; ")}.</li>
        ${x.rumors.map(q => `<li><b>Rumor:</b> ${esc(q)}</li>`).join("")}
        <li><b>Weakness:</b> ${esc(cap1(x.weakness))}.</li></ul></div>
      <div class="sec">${secHead("How to Run It")}<ul class="plain">
        <li>${esc(m.tac)}</li>
        <li><b>Opening move:</b> ${m.actions.some(a => /Recharge/.test(a[0])) ? `start with ${esc(m.blastName)} if two or more heroes are close together, then use ${esc(m.mainW)}.` : `close in and use ${esc(m.mainW)} on the nearest hero.`}</li>
        <li><b>Numbers:</b> ${m.toHit >= 0 ? "+" : ""}${m.toHit} to hit, about ${m.dpr} damage per round, save DC ${m.dc}.</li>
        <li><b>Harvest:</b> ${x.parts.map(([p, v]) => `${esc(p)} (${v} gp)`).join(", ")}, with a DC ${Math.min(20, 10 + Math.round(m.cr / 2))} Survival check.</li></ul></div>
    </div>`;
  }
  return h;
}
function readForge() {
  const crv = $("#fgCR").value;
  return { kind: $("input[name=fgKind]:checked").value, cr: crv === "" ? null : +crv, type: $("#fgType").value, role: $("#fgRole").value, env: $("#fgEnv").value, element: $("#fgEl").value, size: $("#fgSize").value };
}
function forgeGo(seed) {
  const o = readForge();
  if (o.cr === null) { const lv = clamp(parseInt($("#fgLv").value) || 5, 1, 20), p = clamp(parseInt($("#fgParty").value) || 4, 1, 8); o.cr = crFor(lv, p, o.kind === "villain" || o.role === "solo" ? "solo" : "group"); }
  o.seed = seed || newSeed(); forgeOpts = o;
  forgeCur = generateCreature(o);
  $("#fgOut").innerHTML = forgeHTML(forgeCur); $("#fgOut").className = forgeCur.villain ? "fg-villain" : "fg-monster";
}
function bestiaryEntry(m) {
  const atk = m.actions.filter(a => a[0] !== "Multiattack").slice(0, 3).map(([n, t]) => `${n}: ${t.replace(/<[^>]+>/g, "").replace(/^Melee Weapon Attack: |^Ranged Weapon Attack: /, "")}`).join(" ");
  const multi = (m.actions.find(a => a[0] === "Multiattack") || [, ""])[1];
  return { name: m.name, cr: m.cr, stat: [m.ac, m.hp, m.hpDice, m.init, m.speed, (multi ? multi + " " : "") + atk, m.traits.map(t => t[0]).join("; ") || "None", ROLES_G[m.roleKey].tac], text: forgeText(m) };
}
function registerBestiary(c) {
  (c && c.bestiary || []).forEach(b => { MSTAT[b.name] = b.stat; CUSTOM_CR[b.name] = b.cr; });
}
(function initForge() {
  const crSel = $("#fgCR");
  crSel.insertAdjacentHTML("beforeend", CR_LIST.map(c => `<option value="${c}">CR ${crLabel(c)}</option>`).join(""));
  Object.keys(MTYPES).forEach(k => $("#fgType").insertAdjacentHTML("beforeend", `<option value="${k}">${cap1(k)}</option>`));
  Object.entries(ROLES_G).forEach(([k, v]) => $("#fgRole").insertAdjacentHTML("beforeend", `<option value="${k}">${v.label}</option>`));
  Object.entries(ENVS).forEach(([k, v]) => k !== "any" && $("#fgEnv").insertAdjacentHTML("beforeend", `<option value="${k}">${v.label}</option>`));
  Object.keys(ELEMENTS).forEach(k => $("#fgEl").insertAdjacentHTML("beforeend", `<option value="${k}">${cap1(k)}</option>`));
  SIZES.forEach(s => $("#fgSize").insertAdjacentHTML("beforeend", `<option>${s}</option>`));
  const hint = () => {
    const lv = clamp(parseInt($("#fgLv").value) || 5, 1, 20), p = clamp(parseInt($("#fgParty").value) || 4, 1, 8);
    $("#fgHint").innerHTML = `For ${p} heroes of level ${lv}: a solo boss ≈ <b>CR ${crLabel(crFor(lv, p, "solo"))}</b>; one of a group of four ≈ <b>CR ${crLabel(crFor(lv, p, "group"))}</b>. Leave Challenge on Auto to use these.`;
  };
  $("#fgRole").value = "solo";
  $("#fgLv").addEventListener("input", hint); $("#fgParty").addEventListener("input", hint); hint();
  $("#fgForm").addEventListener("submit", e => { e.preventDefault(); forgeGo(); });
  $("#fgForm").addEventListener("change", e => { if (e.target.name === "fgKind") { $("#fgRole").value = e.target.value === "villain" ? "solo" : ""; } if (e.target.id === "fgType" || e.target.id === "fgSize") syncForgeSizes(); });
  syncForgeSizes();
  $("#fgOut").addEventListener("click", async e => {
    const b = e.target.closest("[data-fg]"); if (!b || !forgeCur) return;
    if (b.dataset.fg === "reroll") forgeGo();
    else if (b.dataset.fg === "copy") { try { await navigator.clipboard.writeText(forgeText(forgeCur)); toast("Stat block copied"); } catch { toast("Couldn't copy here"); } }
    else {
      const c = Store.get($("#fgCampaign").value); if (!c) { toast("Create a campaign first (Campaign Tracker)"); return; }
      if (!sourceAllowed(normalizeSourceRules(c.sourceRules), null, true)) { toast("This campaign has homebrew turned off."); return; }
      c.bestiary = c.bestiary || []; const be = bestiaryEntry(forgeCur);
      c.bestiary = c.bestiary.filter(x => x.name !== be.name); c.bestiary.push(be); registerBestiary(c);
      if (forgeCur.villain) c.npcs.unshift({ id: uid("n"), name: forgeCur.name, role: `Villain · ${forgeCur.villain.archetype}`, attitude: "Hostile", notes: forgeText(forgeCur) });
      Store.save(c); toast(`${forgeCur.name} added to “${c.name}”${forgeCur.villain ? " (NPCs + encounter list)" : " (encounter list)"}`); b.textContent = "✓ Saved"; b.disabled = true;
    }
  });
})();

/* ======================= Monster Manual (SRD 5.1 / 5.2) ======================= */
const BS = { data: null, ed: "2024", open: new Set(), expandAll: false };
const BS_SIZES = ["tiny", "small", "medium", "large", "huge", "gargantuan"];
function bsLoad() {
  if (BS.data) return;
  BS.data = dmData("monsterData");
  for (const ed of Object.keys(BS.data)) BS.data[ed].forEach((m, i) => bsPrepareMonster(m, ed, i));
  bsCustomRefresh();
}
function bsPrepareMonster(m, ed, i) {
  m.id = ed + "-" + i;
  m.cast = [...m.traits, ...m.actions].some(([n]) => /spellcasting/i.test(n));
  m.blob = [...m.traits, ...m.actions, ...(m.bonus || []), ...(m.reacts || []), ...(m.legend || [])].map(x => x.join(" ")).join(" ").toLowerCase();
}
const bsFind = id => BS.data[id.split("-")[0]][+id.split("-")[1]];
const bsPB = cr => cr < 5 ? 2 : cr < 9 ? 3 : cr < 13 ? 4 : cr < 17 ? 5 : cr < 21 ? 6 : cr < 25 ? 7 : cr < 29 ? 8 : 9;
const bsFmt = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^\w])[_*]([^_*]+?)[_*](?=[^\w]|$)/g, "$1<i>$2</i>").replace(/\n+/g, "<br>");
const bsSub = m => `${cap1(m.size)} ${m.type}${m.sub ? ` (${m.sub})` : ""}${m.al ? `, ${m.al}` : ""}`;
function bsName(c, m, ed) {
  // Keep different editions and books when they publish creatures with the same name.
  const clash = (c.bestiary || []).find(b => b.name === m.n);
  if (!clash) return m.n;
  if (clash.ed && clash.ed !== ed) return `${m.n} (${ed})`;
  return `${m.n} (${m.src ? dmBook(m.src).short : ed === "custom" ? "Homebrew" : "SRD"})`;
}
function bsInCamp(m, ed) {
  const c = Store.get($("#bsCamp").value);
  return !!(c && (c.bestiary || []).some(b => b.srd === (m.key || m.id) || (b.ed === ed && (b.name === m.n || b.name === `${m.n} (${ed})`))));
}
function bsSbHTML(m, ed) {
  const line = (k, v) => v ? `<div class="sb-l"><b>${k}</b> ${v}</div>` : "";
  const sec = (h, arr, intro = "") => arr && arr.length ? `<h4 class="sb-h">${h}</h4>${intro}${arr.map(([n, t]) => `<p><b><i>${esc(n)}.</i></b> ${bsFmt(t)}</p>`).join("")}` : "";
  const the = "the " + m.n.toLowerCase();
  const legIntro = ed !== "2024"
    ? `<p>${esc(cap1(the))} can take ${m.legN || 3} legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature's turn. ${esc(cap1(the))} regains spent legendary actions at the start of its turn.</p>`
    : `<p><b>Legendary action uses:</b> ${m.legN || 3}${m.legLair ? ` (${m.legLair} in its lair)` : ""}. Immediately after another creature's turn, ${esc(the)} can expend a use to take one of the following actions. ${esc(cap1(the))} regains all expended uses at the start of each of its turns.</p>`;
  return `<div class="statblock">
    <div class="sb-name">${esc(m.n)}</div>
    <div class="sb-sub">${esc(bsSub(m))}</div>
    <div class="sb-rule"></div>
    ${line("Armor Class", `${m.ac}${m.acd ? ` (${esc(m.acd)})` : ""}`)}${line(ed === "2024" ? "Initiative" : "", ed === "2024" ? `${sgn(m.init)} (${10 + m.init})` : "")}
    ${line("Hit Points", `${m.hp}${m.hd ? ` (${esc(m.hd)})` : ""}`)}${line("Speed", esc(m.speed))}
    <div class="sb-rule"></div>
    <div class="abil">${AB.map((a, i) => `<div class="ab"><div class="n">${AB_NAME[a]}</div><div class="m">${sgn(mod(m.scores[i]))}</div><div class="s">${m.scores[i]}</div></div>`).join("")}</div>
    <div class="sb-rule"></div>
    ${line("Saving Throws", esc((m.saves || []).join(", ")))}${line("Skills", esc((m.skills || []).join(", ")))}
    ${line("Damage Vulnerabilities", esc(m.vul))}${line("Damage Resistances", esc(m.res))}${line("Damage Immunities", esc(m.imm))}${line("Condition Immunities", esc(m.ci))}
    ${line("Senses", esc(m.senses))}${line("Languages", esc(m.lang))}
    ${line("Challenge", `${crLabel(m.cr)} (${(xpOf(m.cr) || 0).toLocaleString()} XP)`)}${line("Proficiency Bonus", sgn(bsPB(m.cr)))}
    <div class="sb-rule"></div>
    ${(m.traits || []).map(([n, t]) => `<p><b><i>${esc(n)}.</i></b> ${bsFmt(t)}</p>`).join("")}
    ${sec("Actions", m.actions)}${sec("Bonus Actions", m.bonus)}${sec("Reactions", m.reacts)}${sec("Legendary Actions", m.legend, legIntro)}${sec("Lair Actions", (m.lair || []).map((a,i)=>Array.isArray(a)?a:["Lair action "+(i+1),a]), "<p>Use the encounter’s initiative setting (2014 default: 20, losing ties).</p>")}
  </div>`;
}
function bsText(m, ed) {
  const L = [m.n, bsSub(m), `Armor Class ${m.ac}${m.acd ? ` (${m.acd})` : ""}`, `Hit Points ${m.hp}${m.hd ? ` (${m.hd})` : ""}`, `Speed ${m.speed}`,
    AB.map((a, i) => `${AB_NAME[a]} ${m.scores[i]} (${sgn(mod(m.scores[i]))})`).join(" | ")];
  [["Saving Throws", (m.saves || []).join(", ")], ["Skills", (m.skills || []).join(", ")], ["Damage Vulnerabilities", m.vul], ["Damage Resistances", m.res], ["Damage Immunities", m.imm], ["Condition Immunities", m.ci], ["Senses", m.senses], ["Languages", m.lang]]
    .forEach(([k, v]) => { if (v) L.push(`${k} ${v}`); });
  L.push(`Challenge ${crLabel(m.cr)} (${(xpOf(m.cr) || 0).toLocaleString()} XP)`, "");
  const block = (h, arr) => { if (arr && arr.length) { if (h) L.push(h.toUpperCase()); arr.forEach(([n, t]) => L.push(`${n}. ${t.replace(/[*_]/g, "")}`)); L.push(""); } };
  block("", m.traits); block("Actions", m.actions); block("Bonus Actions", m.bonus); block("Reactions", m.reacts); block("Legendary Actions", m.legend); block("Lair Actions", (m.lair || []).map((a,i)=>Array.isArray(a)?a:["Lair action "+(i+1),a]));
  if (m.src) {
    const book = dmBook(m.src);
    L.push(`Source: ${book.name}${m.page ? `, p. ${m.page}` : ""} · ${book.lic === "reference" ? "Rules summary" : book.lic === "cc-by-40" ? "CC BY 4.0" : "Open content"}`);
  } else if (ed !== "custom") L.push(`Source: ${ed === "2024" ? "SRD 5.2 (2024)" : "SRD 5.1 (2014)"}, CC BY 4.0`);
  return L.join("\n");
}
function bsEntry(m, ed, name) {
  const multi = (m.actions.find(a => a[0] === "Multiattack") || [, ""])[1];
  const atk = m.actions.filter(a => a[0] !== "Multiattack").slice(0, 3)
    .map(([n, t]) => { const s = t.replace(/[*_]/g, "").replace(/^(Melee|Ranged|Melee or Ranged) (Weapon |Spell )?Attack( Roll)?:\s*/i, ""); return `${n}: ${s.length > 150 ? s.slice(0, 147) + "…" : s}`; }).join(" ");
  return { name, cr: m.cr, ed, src: m.src, srd: m.key || m.id, stat: [m.ac, m.hp, m.hd || "", m.init, m.speed, (multi ? multi.replace(/[*_]/g, "") + " " : "") + atk, (m.traits || []).map(t => t[0]).join("; ") || "None", m.role], text: bsText(m, ed), ...(m.bossKit?{bossKit:m.bossKit}:{}), ...(m.lair?.length?{lair:m.lair}:{}), legN:m.legN };
}
function bsAdd(m, n) {
  const c = Store.get($("#bsCamp").value); if (!c) { toast("Create a campaign first (Campaign Tracker)"); return; }
  const ed = m.id.split("-")[0];
  const rules = normalizeSourceRules(c.sourceRules);
  if (rules && ((ed !== "custom" && ed !== rules.edition) || !sourceAllowed(rules, m.src, ed === "custom"))) {
    toast("This creature is outside the campaign's sourcebooks.");
    return;
  }
  c.bestiary = c.bestiary || [];
  const existing = c.bestiary.find(b => b.srd === (m.key || m.id)), name = existing ? existing.name : bsName(c, m, ed);
  c.bestiary = c.bestiary.filter(b => b.name !== name); c.bestiary.push(bsEntry(m, ed, name)); registerBestiary(c);
  const e = (c.encounters || []).find(x => x.id === $("#bsEnc").value);
  if (e) {
    const have = e.enemies.filter(x => x.stat === name && !x.boss).length;
    const rows = makeEnemies([{ name, stat: name, cr: m.cr, count: n, boss: false }]);
    rows.forEach((r, k) => r.name = (have + n > 1) ? `${name} ${have + k + 1}` : name);
    e.enemies.push(...rows);
  }
  Store.save(c);
  toast(e ? `${n > 1 ? n + " × " : ""}${name} added to “${e.name}”` : `${name} added to “${c.name}”`);
  if (activeId === c.id && location.hash === "#tracker") renderTracker();
}
function bsFillEnc() {
  const sel = $("#bsEnc"), keep = sel.value, c = Store.get($("#bsCamp").value);
  const encs = (c && c.encounters || []).filter(e => e.status !== "Done" && e.status !== "Complete");
  sel.innerHTML = `<option value="">Creature list only</option>` + encs.map(e => `<option value="${e.id}">${esc(e.name || "Encounter")}${e.status === "Active" ? " (active)" : ""}</option>`).join("");
  if (encs.some(e => e.id === keep)) sel.value = keep;
}
function bsFilters() {
  const all = BS.data[BS.ed], crs = [...new Set(all.map(m => m.cr))].sort((a, b) => a - b);
  const keepMin = $("#bsCrMin").value, keepMax = $("#bsCrMax").value;
  $("#bsCrMin").innerHTML = crs.map(c => `<option value="${c}">${crLabel(c)}</option>`).join("");
  $("#bsCrMax").innerHTML = crs.map(c => `<option value="${c}">${crLabel(c)}</option>`).join("");
  $("#bsCrMin").value = crs.includes(+keepMin) && keepMin !== "" ? keepMin : crs[0];
  $("#bsCrMax").value = crs.includes(+keepMax) && keepMax !== "" ? keepMax : crs[crs.length - 1];
  const fill = (sel, vals, label = cap1) => { const k = $(sel).value; $(sel).innerHTML = `<option value="">Any</option>` + vals.map(v => `<option value="${esc(v)}">${esc(label(v))}</option>`).join(""); if (vals.includes(k)) $(sel).value = k; };
  fill("#bsType", [...new Set(all.map(m => m.type))].sort());
  fill("#bsSize", BS_SIZES.filter(z => all.some(m => m.size === z)));
  const envs = [...new Set(all.flatMap(m => m.env || []))].sort();
  fill("#bsEnv", envs); $("#bsEnvWrap").classList.toggle("hidden", !envs.length);
  const book = $("#bsBook").value; $("#bsBook").innerHTML = bookOptions(all); if ([...$("#bsBook").options].some(o => o.value === book)) $("#bsBook").value = book;
  $("#bsBookWrap").classList.toggle("hidden", BS.ed === "custom");
}
function bsFiltered() {
  const rules = normalizeSourceRules(Store.get($("#bsCamp").value)?.sourceRules);
  const q = $("#bsQ").value.trim().toLowerCase(), inText = $("#bsInText").checked;
  const lo = +$("#bsCrMin").value, hi = +$("#bsCrMax").value, type = $("#bsType").value, size = $("#bsSize").value, env = $("#bsEnv").value, book = $("#bsBook").value;
  const leg = $("#bsLeg").checked, cast = $("#bsCast").checked, mine = $("#bsMine").checked;
  const list = BS.data[BS.ed].filter(m =>
    (!rules || (BS.ed === "custom" || BS.ed === rules.edition) && sourceAllowed(rules, m.src, BS.ed === "custom")) &&
    m.cr >= Math.min(lo, hi) && m.cr <= Math.max(lo, hi) && (!type || m.type === type) && (!size || m.size === size) &&
    (!env || (m.env || []).includes(env)) && (!leg || (m.legend || []).length) && (!cast || m.cast) &&
    (!q || m.n.toLowerCase().includes(q) || (inText && m.blob.includes(q))) && (!mine || bsInCamp(m, BS.ed)) && bookOk(m, BS.ed === "custom" ? "" : book));
  const by = $("#bsSort").value;
  return list.sort((a, b) => by === "name" ? a.n.localeCompare(b.n) : by === "hp" ? b.hp - a.hp || a.n.localeCompare(b.n)
    : by === "ac" ? b.ac - a.ac || a.n.localeCompare(b.n) : a.cr - b.cr || a.n.localeCompare(b.n));
}
function bsRow(m) {
  const open = BS.expandAll || BS.open.has(m.id), ed = m.id.split("-")[0], have = bsInCamp(m, ed);
  return `<div class="sp-row ${open ? "open" : ""}" data-id="${m.id}">
    <div class="sp-head" data-bs="toggle" data-id="${m.id}" role="button" tabindex="0" aria-expanded="${open}">
      <b class="sp-name">${esc(m.n)}</b>
      <span class="sp-meta num" title="Challenge rating">CR ${crLabel(m.cr)}</span>
      <span class="sp-meta hide-sm">${esc(cap1(m.type))}</span>
      <span class="sp-meta hide-sm">${esc(cap1(m.size))}</span>
      <span class="sp-meta num" title="Armor class">AC ${m.ac}</span>
      <span class="sp-meta num" title="Hit points">${m.hp} HP</span>
      <span class="sp-tags">${bookTag(m)}${(m.legend || []).length ? `<span class="tag gold hide-sm" title="Legendary actions">L</span>` : ""}<button class="btn sm ${have ? "" : "primary"}" type="button" data-bs="add1" data-id="${m.id}" title="Add one to the chosen campaign${$("#bsEnc").value ? " and encounter" : ""}">${have && !$("#bsEnc").value ? "✓ In campaign" : "+ Add"}</button></span>
    </div>
    ${open ? `<div class="sp-detail">${bsSbHTML(m, ed)}${bookLine(m)}
      <div class="bs-add"><label class="muted" for="bsN-${m.id}">How many</label><input type="number" min="1" max="20" value="1" id="bsN-${m.id}">
        <button class="btn sm primary" type="button" data-bs="addN" data-id="${m.id}">Add to campaign</button>
        <button class="btn sm" type="button" data-bs="copy" data-id="${m.id}">Copy stat block</button>
        <button class="btn sm" type="button" data-bs="edit" data-id="${m.id}">${ed === "custom" ? "✎ Edit" : "✎ Edit a copy"}</button></div></div>` : ""}
  </div>`;
}
function renderBestiary() {
  bsLoad();
  const rules = normalizeSourceRules(Store.get($("#bsCamp").value)?.sourceRules);
  $$("input[name=bsEd]").forEach(r => r.disabled = !!rules && (r.value === "custom" ? !rules.homebrew : r.value !== rules.edition));
  if (rules && BS.ed !== rules.edition && (BS.ed !== "custom" || !rules.homebrew)) {
    BS.ed = rules.edition; BS.open.clear();
    const radio = $(`input[name="bsEd"][value="${rules.edition}"]`);
    if (radio) radio.checked = true;
    $("#bsCrMin").innerHTML = $("#bsCrMax").innerHTML = "";
  }
  if (!$("#bsCrMin").options.length) bsFilters();
  bsFillEnc();
  const list = bsFiltered(), total = BS.data[BS.ed].length;
  $("#bsCount").innerHTML = `Showing <b>${list.length}</b> of ${total} ${BS.ed === "custom" ? "custom monsters" : `${BS.ed} monsters (SRD ${BS.ed === "2024" ? "5.2" : "5.1"} and extra books)`}`;
  if (!total && BS.ed === "custom") { $("#bsList").innerHTML = `<div class="card empty"><h2>No custom monsters yet</h2><p>Build one in “✎ Build a monster”, or open any monster here and press “Edit a copy”.</p></div>`; return; }
  if (!list.length) { $("#bsList").innerHTML = `<div class="card empty"><h2>No monsters found</h2><p>Loosen a filter or clear them all.</p></div>`; return; }
  const byCR = $("#bsSort").value === "cr";
  let h = "", last = null;
  for (const m of list) {
    if (byCR && m.cr !== last) { if (last !== null) h += `</div>`; h += `<div class="sec sp-group"><div class="sec-h"><h3>Challenge ${crLabel(m.cr)}</h3><span class="sp"></span><span class="muted" style="font-size:14px">${(xpOf(m.cr) || 0).toLocaleString()} XP · ${list.filter(x => x.cr === m.cr).length}</span></div>`; last = m.cr; }
    h += bsRow(m);
  }
  $("#bsList").innerHTML = byCR ? h + `</div>` : `<div class="sec sp-group">${h}</div>`;
}
let bsTimer = null;
const bsRerender = () => { clearTimeout(bsTimer); bsTimer = setTimeout(renderBestiary, 110); };
(function initBestiary() {
  const mode = async () => {
    const v = $('input[name="monMode"]:checked').value;
    $("#monSrd").classList.toggle("hidden", v !== "srd"); $("#monForge").classList.toggle("hidden", v !== "forge"); $("#monBuild").classList.toggle("hidden", v !== "build");
    if (v === "srd") {
      bsLoad(); bsCustomRefresh(); bsFilters(); renderBestiary();
      if (!extraMonstersReady) {
        $("#bsCount").textContent = "Loading monster catalog…";
        const all = await dmLoadExtraMonsters();
        if ($('input[name="monMode"]:checked').value !== "srd") return;
        if (!all) toast("Extra monsters are unavailable. Showing the saved catalog.");
        const upper = $("#bsCrMax"), atMaximum = upper.selectedIndex === upper.options.length - 1;
        bsFilters();
        if (atMaximum) upper.selectedIndex = upper.options.length - 1;
        renderBestiary();
      }
    }
  };
  $$('input[name="monMode"]').forEach(r => r.addEventListener("change", mode));
  $("#bsForm").addEventListener("input", e => { if (e.target.name === "bsEd") { BS.ed = e.target.value; BS.open.clear(); $("#bsCrMin").innerHTML = $("#bsCrMax").innerHTML = ""; bsFilters(); } bsRerender(); });
  $("#bsCamp").addEventListener("change", () => { bsFillEnc(); renderBestiary(); });
  $("#bsEnc").addEventListener("change", renderBestiary);
  $("#bsReset").addEventListener("click", () => {
    $("#bsQ").value = ""; ["#bsType", "#bsSize", "#bsEnv", "#bsBook"].forEach(id => $(id).value = ""); ["#bsInText", "#bsLeg", "#bsCast", "#bsMine"].forEach(id => $(id).checked = false);
    $("#bsCrMin").selectedIndex = 0; $("#bsCrMax").selectedIndex = $("#bsCrMax").options.length - 1; $("#bsSort").value = "cr"; renderBestiary();
  });
  $("#bsExpand").addEventListener("click", () => { BS.expandAll = !BS.expandAll; if (!BS.expandAll) BS.open.clear(); $("#bsExpand").textContent = BS.expandAll ? "Collapse all" : "Expand all"; renderBestiary(); });
  const act = async e => {
    const b = e.target.closest("[data-bs]"); if (!b) return; const m = bsFind(b.dataset.id);
    if (b.dataset.bs === "add1") { e.stopPropagation(); bsAdd(m, 1); }
    else if (b.dataset.bs === "addN") bsAdd(m, clamp(parseInt($(`#bsN-${m.id}`).value) || 1, 1, 20));
    else if (b.dataset.bs === "edit") { mbEditFrom(m); return; }
    else if (b.dataset.bs === "copy") { try { await navigator.clipboard.writeText(bsText(m, m.id.split("-")[0])); toast(`${m.n} copied`); } catch { toast("Couldn't copy here"); } return; }
    else { BS.open.has(m.id) ? BS.open.delete(m.id) : BS.open.add(m.id); if (BS.expandAll && !BS.open.has(m.id)) { BS.expandAll = false; $("#bsExpand").textContent = "Expand all"; } }
    const row = $(`#bsList .sp-row[data-id="${m.id}"]`); if (row) { const n = row.querySelector("input") && row.querySelector("input").value; row.outerHTML = bsRow(m); const i = $(`#bsN-${m.id}`); if (i && n) i.value = n; }
  };
  $("#bsList").addEventListener("click", act);
  $("#bsList").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".sp-head")) { e.preventDefault(); act(e); } });
})();

/* ======================= Monster builder ======================= */
// A custom monster is kept as the builder's form state (MB.f) and compiled to the same
// shape as an SRD monster, so the Monster Manual, stat blocks and encounters treat it alike.
const MB_KEY = "dmforge.mymonsters.v1";
const MB_ABS = ["Str", "Dex", "Con", "Int", "Wis", "Cha"];
const MB_SKILLS = { Acrobatics: 1, "Animal Handling": 4, Arcana: 3, Athletics: 0, Deception: 5, History: 3, Insight: 4, Intimidation: 5, Investigation: 3, Medicine: 4, Nature: 3, Perception: 4, Performance: 5, Persuasion: 5, Religion: 3, "Sleight of Hand": 1, Stealth: 1, Survival: 4 };
const MB_TYPES = ["aberration", "beast", "celestial", "construct", "dragon", "elemental", "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead"];
const MB_DMG = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
/* Senses, languages & defenses: a drop-down for every field (owner, 2026-11-25). Senses pick a distance; the lists add
   their pick to the text box beside them, which can still be typed in (so copied monsters keep any wording). */
const MB_SENSE_FT = [10, 15, 20, 30, 60, 90, 120, 150, 300];
const MB_PICKS = {
  lang: ["Language", ["Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin", "Halfling", "Orc", "Abyssal", "Celestial", "Deep Speech", "Draconic", "Infernal", "Primordial", "Aquan", "Auran", "Ignan", "Terran", "Sylvan", "Undercommon", "Druidic", "Thieves' Cant", "Gith", "Sphinx",
    "telepathy 30 ft.", "telepathy 60 ft.", "telepathy 120 ft.", "all languages", "understands Common but can't speak", "understands the languages it knew in life but can't speak", "understands its creator's languages but can't speak"]],
  res: ["Resistance", [...MB_DMG, "bludgeoning, piercing, and slashing from nonmagical attacks", "damage from spells"]],
  imm: ["Immunity", [...MB_DMG, "bludgeoning, piercing, and slashing from nonmagical attacks"]],
  vul: ["Vulnerability", MB_DMG],
  ci: ["Condition", ["blinded", "charmed", "deafened", "exhaustion", "frightened", "grappled", "incapacitated", "invisible", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious"]]
};
/* the distance options, keeping an unusual one (from a copied monster) so it stays picked */
function mbSenseOptions(sel, v) {
  const ft = MB_SENSE_FT.slice(); if (mbNum(v) && !ft.includes(+v)) ft.push(+v);
  sel.innerHTML = `<option value="">—</option>` + ft.sort((a, b) => a - b).map(n => `<option value="${n}">${n} ft.</option>`).join("");
}
/* adds a pick to a comma list; a pick with commas of its own is joined with a semicolon, as stat blocks do */
function mbPickAdd(cur, pick) {
  cur = String(cur || "").trim(); if (cur === "—" || cur === "-") cur = "";
  const have = cur.split(/[;,]/).map(x => x.trim().toLowerCase());
  if (!pick.includes(",") && have.includes(pick.toLowerCase())) return cur;
  if (pick.includes(",") && cur.toLowerCase().includes(pick.toLowerCase())) return cur;
  return cur ? cur + (pick.includes(",") || cur.includes(";") ? "; " : ", ") + pick : pick;
}
const MB_LISTS = { traits: "Trait", actions: "Action", bonus: "Bonus action", reacts: "Reaction", legend: "Legendary action", lair: "Lair action" };
const MB = { f: null, lib: [] };
function mbBlank() {
  return { id: uid("mm"), name: "", size: "medium", type: "monstrosity", sub: "", al: "unaligned", cr: 1, role: "brute", desc: "", ac: 13, acd: "natural armor", hdN: 5, hdD: 8, hp: "",
    speed: { walk: 30, fly: "", swim: "", climb: "", burrow: "", hover: false }, scores: [14, 12, 14, 6, 10, 8], saves: [], skills: {},
    senses: { dark: 60, blind: "", tremor: "", true: "" }, lang: "—", res: "", imm: "", vul: "", ci: "",
    traits: [], actions: [], bonus: [], reacts: [], legend: [], lair: [], legN: 3 };
}
function mbLoadLib() { try { MB.lib = JSON.parse(localStorage.getItem(MB_KEY) || "[]"); } catch { MB.lib = []; } }
function mbSaveLib() { try { localStorage.setItem(MB_KEY, JSON.stringify(MB.lib)); Cloud.touch("mymonsters"); return true; } catch { toast("Couldn't save: this browser's storage is full"); return false; } }
const mbNum = v => v === "" || v === null || v === undefined || isNaN(+v) ? null : +v;
function mbCompile(f, id) {
  const cr = Math.max(0, +f.cr || 0), pb = bsPB(cr), mods = f.scores.map(x => mod(clamp(+x || 10, 1, 30)));
  const n = Math.max(0, Math.round(mbNum(f.hdN) || 0)), die = +f.hdD || 8, conT = n * mods[2];
  const avg = n ? Math.max(1, Math.floor(n * (die + 1) / 2) + conT) : 1;
  const sp = [`${mbNum(f.speed.walk) ?? 0} ft.`];
  ["burrow", "climb", "fly", "swim"].forEach(k => { if (mbNum(f.speed[k])) sp.push(`${k} ${f.speed[k]} ft.${k === "fly" && f.speed.hover ? " (hover)" : ""}`); });
  const skills = Object.entries(f.skills).filter(([, l]) => l).map(([k, l]) => `${k} ${sgn(mods[MB_SKILLS[k]] + pb * l)}`);
  const perc = f.skills.Perception ? mods[4] + pb * f.skills.Perception : mods[4];
  const sen = [["blind", "blindsight"], ["dark", "darkvision"], ["tremor", "tremorsense"], ["true", "truesight"]].filter(([k]) => mbNum(f.senses[k])).map(([k, w]) => `${w} ${f.senses[k]} ft.`);
  sen.push(`passive Perception ${10 + perc}`);
  const L = k => (f[k] || []).filter(x => x.n.trim() || x.t.trim()).map(x => [x.n.trim() || MB_LISTS[k], x.t.trim()]);
  return {
    id: id || "custom-x", key: f.id, n: f.name.trim() || "Unnamed monster", cr, type: f.type, sub: f.sub.trim(), size: f.size, al: f.al.trim(),
    ac: +f.ac > 0 ? Math.round(+f.ac) : 10, acd: f.acd.trim(), hp: mbNum(f.hp) > 0 ? Math.round(mbNum(f.hp)) : avg, /* 0 or less: the average (QA-5, 2026-11-24) */ hd: n ? `${n}d${die}${conT ? (conT > 0 ? "+" : "") + conT : ""}` : "", speed: sp.join(", "),
    scores: f.scores.map(x => clamp(Math.round(+x || 10), 1, 30)), saves: f.saves.slice().sort().map(i => `${MB_ABS[i]} ${sgn(mods[i] + pb)}`), skills,
    vul: f.vul.trim(), res: f.res.trim(), imm: f.imm.trim(), ci: f.ci.trim(), senses: sen.join(", "), lang: f.lang.trim() || "—", init: mods[1],
    traits: L("traits"), actions: L("actions"), bonus: L("bonus"), reacts: L("reacts"), legend: L("legend"), lair: L("lair"), ...(f.bossKit ? {bossKit:f.bossKit}:{}), legN: +f.legN || 3, role: f.role, desc: f.desc.trim(), env: [],
  };
}
// Turn an SRD stat block back into builder fields, for "Edit a copy".
function mbFromMonster(m) {
  const f = mbBlank(), hd = /^(\d+)d(\d+)/.exec(m.hd || "");
  Object.assign(f, { name: m.key ? m.n : `${m.n} (custom)`, size: m.size, type: MB_TYPES.includes(m.type) ? m.type : "monstrosity", sub: m.sub || "", al: m.al || "", cr: m.cr, role: m.role || "brute",
    desc: m.desc || "", ac: m.ac, acd: m.acd || "", hdN: hd ? +hd[1] : "", hdD: hd ? +hd[2] : 8, hp: m.hp, scores: m.scores.slice(),
    lang: m.lang || "—", res: m.res || "", imm: m.imm || "", vul: m.vul || "", ci: m.ci || "", legN: m.legN || 3 });
  const walk = /^(\d+) ft/.exec(m.speed || ""); f.speed = { walk: walk ? +walk[1] : 0, fly: "", swim: "", climb: "", burrow: "", hover: /hover/.test(m.speed || "") };
  ["fly", "swim", "climb", "burrow"].forEach(k => { const r = new RegExp(k + " (\\d+)").exec(m.speed || ""); if (r) f.speed[k] = +r[1]; });
  if(m.bossKit)f.bossKit=JSON.parse(JSON.stringify(m.bossKit));
  f.saves = MB_ABS.map((a, i) => (m.saves || []).some(s => s.startsWith(a + " ")) ? i : -1).filter(i => i >= 0);
  const pb = bsPB(m.cr);
  (m.skills || []).forEach(s => { const r = /^(.+) ([+-]\d+)$/.exec(s); if (!r || MB_SKILLS[r[1]] === undefined) return; const base = mod(m.scores[MB_SKILLS[r[1]]]); f.skills[r[1]] = +r[2] >= base + 2 * pb ? 2 : 1; });
  f.senses = { dark: "", blind: "", tremor: "", true: "" };
  [["dark", "darkvision"], ["blind", "blindsight"], ["tremor", "tremorsense"], ["true", "truesight"]].forEach(([k, w]) => { const r = new RegExp(w + " (\\d+)").exec(m.senses || ""); if (r) f.senses[k] = +r[1]; });
  Object.keys(MB_LISTS).forEach(k => f[k] = (m[k] || []).map((a,i) => Array.isArray(a)?({n:a[0],t:a[1]}):({n:"Lair action "+(i+1),t:String(a)})));
  return f;
}
function mbGet(path) { return path.split(".").reduce((o, k) => o && o[k], MB.f); }
function mbSet(path, v) { const ks = path.split("."), last = ks.pop(); ks.reduce((o, k) => o[k], MB.f)[last] = v; }
function mbFillForm() {
  const f = MB.f;
  $$("#mbForm [data-mbsense]").forEach(el => mbSenseOptions(el, mbGet(el.dataset.mb)));
  $$("#mbForm [data-mb]").forEach(el => { const v = mbGet(el.dataset.mb); if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? ""; });
  $("#mbAbil").innerHTML = AB.map((a, i) => `<div class="ab"><div class="n">${AB_NAME[a]}</div><div class="m" id="mbMod${i}">${sgn(mod(+f.scores[i] || 10))}</div><input type="number" min="1" max="30" class="ab-in" data-mbab="${i}" value="${esc(f.scores[i])}" aria-label="${AB_NAME[a]} score"></div>`).join("");
  $("#mbSaves").innerHTML = MB_ABS.map((a, i) => `<span class="chip ${f.saves.includes(i) ? "on" : ""}" data-mbsave="${i}" role="button" tabindex="0" aria-pressed="${f.saves.includes(i)}">${a}</span>`).join("");
  $("#mbSkills").innerHTML = Object.keys(MB_SKILLS).map(k => `<span class="chip ${f.skills[k] ? "on" : ""}" data-mbskill="${esc(k)}" role="button" tabindex="0" aria-pressed="${!!f.skills[k]}">${esc(k)}${f.skills[k] === 2 ? " ★" : ""}</span>`).join("");
  Object.keys(MB_LISTS).forEach(mbRenderList);
  if($("#mbBossKit"))$("#mbBossKit").value=f.bossKit?JSON.stringify(f.bossKit,null,2):"";
  mbPreview();
}
function mbRenderList(k) {
  const box = $(`[data-mblist="${k}"]`); if (!box) return; MB.f[k] = MB.f[k] || [];
  box.innerHTML = MB.f[k].length ? MB.f[k].map((x, i) => `<div class="mb-li">
      <input type="text" data-mbli="${k}|${i}|n" value="${esc(x.n)}" placeholder="${MB_LISTS[k]} name" aria-label="${MB_LISTS[k]} name">
      <div class="mb-tools"><button class="icon-btn" type="button" data-mbmove="${k}|${i}|-1" title="Move up" ${i ? "" : "disabled"}>↑</button><button class="icon-btn" type="button" data-mbmove="${k}|${i}|1" title="Move down" ${i < MB.f[k].length - 1 ? "" : "disabled"}>↓</button><button class="icon-btn" type="button" data-mbdel="${k}|${i}" title="Remove">✕</button></div>
      <textarea data-mbli="${k}|${i}|t" placeholder="What it does" aria-label="${MB_LISTS[k]} text">${esc(x.t)}</textarea></div>`).join("")
    : `<p class="muted" style="margin:4px 0">None yet.</p>`;
}
let mbTimer = null;
function mbPreview() {
  clearTimeout(mbTimer);
  mbTimer = setTimeout(() => {
    const m = mbCompile(MB.f), pb = bsPB(m.cr);
    $("#mbCRHint").textContent = `Proficiency bonus ${sgn(pb)} · ${(xpOf(m.cr) || 0).toLocaleString()} XP · ${m.hp} hit points`;
    /* recommended CR (10b-monster-cr.js): worked out twice, the second time at the first answer's CR, whose band sets the multipliers */
    const r = MB.rec = crRecommend(Object.assign({}, m, { cr: crRecommend(m).cr }));
    const spells = (m.actions || []).some(([n]) => /spellcasting/i.test(n)) ? `<li>Spells aren't counted: a spellcaster may be stronger than this.</li>` : "";
    $("#mbCRRec").innerHTML = `<p><b>Recommended: CR ${esc(crLabel(r.cr))}</b> <span class="muted">(defense ${esc(crLabel(r.def))}, offense ${esc(crLabel(r.off))})</span>${r.cr !== m.cr ? ` <button type="button" class="btn sm" data-mbcruse="${r.cr}">Use CR ${esc(crLabel(r.cr))}</button>` : ` <span class="muted">· matches your pick</span>`}</p>
      <details><summary>Why</summary><ul>${r.why.map(w => `<li>${esc(w)}</li>`).join("")}${spells}<li>Only damage written as numbers in attacks (like "Hit: 13 (2d8 + 4)") is counted.</li></ul></details>`;
    $("#mbHP").placeholder = `Average: ${mbCompile({ ...MB.f, hp: "" }).hp}`;
    $("#mbPreview").innerHTML = `${bsSbHTML(m, "custom")}${m.desc ? `<p class="mb-desc">${esc(m.desc)}</p>` : ""}`;
  }, 80);
}
function mbRenderLib() {
  $("#mbLib").innerHTML = MB.lib.length ? MB.lib.map(f => `<div class="mb-libitem"><button class="camp-item ${f.id === MB.f.id ? "on" : ""}" type="button" data-mbopen="${esc(f.id)}"><b>${esc(f.name || "Unnamed monster")}</b><small>CR ${crLabel(+f.cr || 0)} ${esc(cap1(f.size))} ${esc(f.type)}${f.needsStats ? ` · <span class="mb-needs">needs stats</span>` : ""}</small></button>
      <button class="icon-btn" type="button" data-mbrm="${esc(f.id)}" title="Delete ${esc(f.name || "this monster")}">✕</button></div>`).join("")
    : `<p class="muted" style="font-size:15px">Nothing saved yet. Build one and press “Save to My monsters”.</p>`;
}
function mbOpen(f) { MB.f = JSON.parse(JSON.stringify(f)); MB.f.lair = MB.f.lair || []; mbFillForm(); mbRenderLib(); }
function mbStore() {
  if (!MB.f.name.trim()) { toast("Give your monster a name first"); $("#mbName").focus(); return false; }
  const raw=$("#mbBossKit")?.value.trim();
  try { if(raw)MB.f.bossKit=bossConfig({...JSON.parse(raw),owner:""}); else delete MB.f.bossKit; } catch(err){toast("Boss kit: "+err.message);return false;}
  const i = MB.lib.findIndex(x => x.id === MB.f.id), copy = JSON.parse(JSON.stringify(MB.f));
  delete copy.needsStats; delete MB.f.needsStats; /* saved from the builder: the DM has looked at its numbers */
  if (i >= 0) MB.lib[i] = copy; else MB.lib.unshift(copy);
  if (!mbSaveLib()) return false;
  bsCustomRefresh(); mbRenderLib();
  return true;
}
function bsCustomRefresh() {
  if (!BS.data) return;
  mbLoadLib();
  BS.data.custom = MB.lib.map((f, i) => { const m = mbCompile(f, "custom-" + i); m.blob = [...m.traits, ...m.actions, ...m.bonus, ...m.reacts, ...m.legend].map(x => x.join(" ")).join(" ").toLowerCase() + " " + m.desc.toLowerCase(); m.cast = [...m.traits, ...m.actions].some(([n]) => /spellcasting/i.test(n)); return m; });
}
function mbEditFrom(m) {
  mbOpen(m.key ? (MB.lib.find(f => f.id === m.key) || mbFromMonster(m)) : mbFromMonster(m));
  if (!m.key) MB.f.id = uid("mm");
  const r = $('input[name="monMode"][value="build"]'); r.checked = true; r.dispatchEvent(new Event("change"));
  window.scrollTo({ top: 0 });
}
(function initBuilder() {
  mbLoadLib();
  $("#mbSize").innerHTML = BS_SIZES.map(z => `<option value="${z}">${cap1(z)}</option>`).join("");
  $("#mbType").innerHTML = MB_TYPES.map(t => `<option value="${t}">${cap1(t)}</option>`).join("");
  $("#mbCR").innerHTML = CR_LIST.map(c => `<option value="${c}">CR ${crLabel(c)}</option>`).join("");
  $("#mbRole").innerHTML = Object.keys(ROLE_TAC).map(k => `<option value="${k}">${cap1(k)}</option>`).join("");
  $("#mbAtkT").innerHTML = MB_DMG.map(d => `<option value="${d}">${cap1(d)}</option>`).join("");
  $$("#mbForm select[data-mbpick]").forEach(s => { const [lab, list] = MB_PICKS[s.dataset.mbpick]; s.innerHTML = `<option value="">+ Add ${lab.toLowerCase()}…</option>` + list.map(x => `<option value="${esc(x)}">${esc(cap1(x))}</option>`).join(""); });
  $("#mbForm").addEventListener("click", e => {
    const u = e.target.closest("[data-mbcruse]"); if (!u) return;
    MB.f.cr = +u.dataset.mbcruse; $("#mbCR").value = String(MB.f.cr); mbPreview();
  });
  $("#mbForm").addEventListener("change", e => {
    const s = e.target.closest("select[data-mbpick]"); if (!s || !s.value) return;
    const k = s.dataset.mbpick, box = $(`#mbForm [data-mb="${k}"]`);
    MB.f[k] = box.value = mbPickAdd(box.value, s.value); s.value = ""; mbPreview();
  });
  MB.f = mbBlank();
  const form = $("#mbForm");
  form.addEventListener("input", e => {
    const t = e.target;
    if (t.dataset.mb) { mbSet(t.dataset.mb, t.type === "checkbox" ? t.checked : t.value); }
    else if (t.dataset.mbab) { MB.f.scores[+t.dataset.mbab] = t.value; $(`#mbMod${t.dataset.mbab}`).textContent = sgn(mod(+t.value || 10)); }
    else if (t.dataset.mbli) { const [k, i, fld] = t.dataset.mbli.split("|"); MB.f[k][+i][fld] = t.value; }
    else return;
    mbPreview();
  });
  const chip = e => {
    const sv = e.target.closest("[data-mbsave]"), sk = e.target.closest("[data-mbskill]");
    if (sv) { const i = +sv.dataset.mbsave; MB.f.saves = MB.f.saves.includes(i) ? MB.f.saves.filter(x => x !== i) : [...MB.f.saves, i]; sv.classList.toggle("on"); sv.setAttribute("aria-pressed", MB.f.saves.includes(i)); mbPreview(); return true; }
    if (sk) { const k = sk.dataset.mbskill, l = ((MB.f.skills[k] || 0) + 1) % 3; if (l) MB.f.skills[k] = l; else delete MB.f.skills[k]; sk.classList.toggle("on", !!l); sk.setAttribute("aria-pressed", !!l); sk.textContent = k + (l === 2 ? " ★" : ""); mbPreview(); return true; }
    return false;
  };
  form.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".chip")) { e.preventDefault(); chip(e); } });
  form.addEventListener("click", e => {
    if (chip(e)) return;
    const add = e.target.closest("[data-mbadd]");
    if (add) { const k = add.dataset.mbadd; MB.f[k].push({ n: "", t: "" }); mbRenderList(k); const ins = $$(`[data-mblist="${k}"] input`); ins[ins.length - 1].focus(); return; }
    const del = e.target.closest("[data-mbdel]");
    if (del) { const [k, i] = del.dataset.mbdel.split("|"); MB.f[k].splice(+i, 1); mbRenderList(k); mbPreview(); return; }
    const mv = e.target.closest("[data-mbmove]");
    if (mv) { const [k, i, d] = mv.dataset.mbmove.split("|"), a = +i, b = a + +d, L = MB.f[k]; [L[a], L[b]] = [L[b], L[a]]; mbRenderList(k); mbPreview(); return; }
    if (e.target.id === "mbAtkGo") {
      const m = mbCompile(MB.f), pb = bsPB(m.cr), mods = m.scores.map(mod);
      const ab = $("#mbAtkAb").value, am = ab === "str" ? mods[0] : ab === "dex" ? mods[1] : Math.max(mods[0], mods[1]);
      const dice = /^(\d+)d(\d+)$/.exec($("#mbAtkD").value.replace(/\s/g, "")); if (!dice) { toast("Write the damage dice like 2d6"); $("#mbAtkD").focus(); return; }
      const avg = Math.max(1, Math.floor(+dice[1] * (+dice[2] + 1) / 2) + am), kind = $("#mbAtkK").value;
      const reach = $("#mbAtkR").value.trim() || (kind === "Ranged" ? "range 80/320 ft." : "reach 5 ft.");
      const where = /^(reach|range)/i.test(reach) ? reach : (kind === "Ranged" ? `range ${reach}` : `reach ${reach}`);
      MB.f.actions.push({ n: $("#mbAtkN").value.trim() || "Attack", t: `${kind} Attack Roll: ${sgn(am + pb)}, ${where} Hit: ${avg} (${dice[1]}d${dice[2]}${am ? (am > 0 ? " + " : " - ") + Math.abs(am) : ""}) ${cap1($("#mbAtkT").value)} damage.` });
      $("#mbAtkN").value = ""; mbRenderList("actions"); mbPreview(); toast("Attack added"); return;
    }
  });
  $("#mbSave").addEventListener("click", () => { if (mbStore()) toast(`${MB.f.name} saved to My monsters`); });
  $("#mbNew").addEventListener("click", () => { mbOpen(mbBlank()); $("#mbName").focus(); });
  $("#mbCopy").addEventListener("click", async () => { try { await navigator.clipboard.writeText((MB.f.desc ? MB.f.desc + "\n\n" : "") + bsText(mbCompile(MB.f), "custom")); toast("Stat block copied"); } catch { toast("Couldn't copy here"); } });
  $("#mbToCamp").addEventListener("click", () => {
    const c = Store.get($("#mbCamp").value); if (!c) { toast("Create a campaign first (Campaign Tracker)"); return; }
    if (!sourceAllowed(normalizeSourceRules(c.sourceRules), null, true)) { toast("This campaign has homebrew turned off."); return; }
    if (!mbStore()) return;
    const m = mbCompile(MB.f); c.bestiary = c.bestiary || [];
    c.bestiary = c.bestiary.filter(b => b.srd !== MB.f.id && b.name !== m.n); c.bestiary.push(bsEntry(m, "custom", m.n)); registerBestiary(c);
    Store.save(c); toast(`${m.n} added to “${c.name}”`);
  });
  $("#mbLib").addEventListener("click", async e => {
    const o = e.target.closest("[data-mbopen]"); if (o) { mbOpen(MB.lib.find(f => f.id === o.dataset.mbopen)); return; }
    const r = e.target.closest("[data-mbrm]"); if (!r) return;
    const f = MB.lib.find(x => x.id === r.dataset.mbrm);
    if (!(await confirmBox("Delete monster?", `Delete ${f.name || "this monster"} from My monsters? Copies already added to campaigns stay there.`, "Delete"))) return;
    MB.lib = MB.lib.filter(x => x !== f); mbSaveLib(); bsCustomRefresh(); if (MB.f.id === f.id) mbOpen(mbBlank()); else mbRenderLib();
  });
  mbFillForm(); mbRenderLib();
})();

/* ======================= Companions, familiars & Wild Shape (My Characters) ======================= */
// Which beasts a character may take, by class, level and prepared spells. The rules are the
// SRD's where it has them; Beast Master isn't in either SRD, so rangers get its 2014 limits.
const FAMILIARS_2014 = ["Bat", "Cat", "Crab", "Frog", "Hawk", "Lizard", "Octopus", "Owl", "Poisonous Snake", "Quipper", "Rat", "Raven", "Sea Horse", "Spider", "Weasel"];
const STEEDS_2014 = ["Warhorse", "Pony", "Camel", "Elk", "Mastiff"];
const COMP_KIND = { wild: "Wild Shape form", beast: "Beast companion", familiar: "Familiar", steed: "Steed" };
function compHasSpell(c, name) { return (c.prepared || []).some(p => p.n === name); }
function compKinds(c) {
  const k = [];
  /* by class level, so a multiclass Druid or Ranger counts too (QA-2, 2026-11-24) */
  if (clsLv(c, "Druid") >= 2) k.push("wild");
  if (clsLv(c, "Ranger") >= 3) k.push("beast");
  if (compHasSpell(c, "Find Familiar")) k.push("familiar");
  if (compHasSpell(c, "Find Steed")) k.push("steed");
  return k;
}
function compRule(c, kind, ed) {
  if (kind === "wild") {
    /* the same limits as the sheet's Wild Shape picker, Circle of the Moon included (QA-3, 2026-11-24) */
    const L = wildShapeLimit(c), max = L.cr, fly = !L.noFly, swim = !L.noSwim;
    return { test: m => m.type === "beast" && m.cr <= max && (fly || !/\bfly\b/.test(m.speed)) && (swim || !/\bswim\b/.test(m.speed)),
      text: `Druid level ${clsLv(c, "Druid")}${druidSub(c) === "Circle of the Moon" ? " (Circle of the Moon)" : ""}: beasts of CR ${crLabel(max)} or lower${fly ? "" : ", no flying speed"}${swim ? "" : ", no swimming speed"}.` };
  }
  if (kind === "beast") return { test: m => m.type === "beast" && m.cr <= 0.25 && ["tiny", "small", "medium"].includes(m.size),
    text: "Ranger companion: a beast of Medium size or smaller with CR 1/4 or lower (Beast Master rules, which aren't in the free SRD)." };
  if (kind === "familiar") return ed === "2014"
    ? { test: m => FAMILIARS_2014.includes(m.n), text: "Find Familiar (2014): bat, cat, crab, frog, hawk, lizard, octopus, owl, poisonous snake, quipper, rat, raven, sea horse, spider or weasel." }
    : { test: m => m.type === "beast" && m.cr === 0, text: "Find Familiar (2024): any beast of challenge rating 0." };
  return { test: m => STEEDS_2014.includes(m.n), text: "Find Steed: warhorse, pony, camel, elk or mastiff." };
}
function compFind(x) { bsLoad(); return (BS.data[x.ed] || []).find(m => m.n === x.n) || null; }
function compSectionHTML(c) {
  const kinds = compKinds(c), list = c.companions || [];
  if (!kinds.length && !list.length) return "";
  const card = x => {
    const m = compFind(x);
    if (!m && !extraMonstersReady) dmLoadExtraMonsters().then(loaded => {
      if (!loaded || rosterCur()?.id !== c.id) return;
      const row = $(`[data-comp-card="${CSS.escape(x.id)}"]`);
      const monster = compFind(x);
      const placeholder = row?.querySelector("[data-comp-stat]");
      if (!placeholder || !monster) return;
      $(".comp-sub", row).append(` · CR ${crLabel(monster.cr)} · AC ${monster.ac} · ${monster.speed}`);
      placeholder.outerHTML = `<details class="comp-sb"><summary>Stat block</summary>${bsSbHTML(monster, x.ed)}</details>`;
    });
    return `<div class="comp-card" data-comp-card="${esc(x.id)}">
      <div class="comp-top"><input type="text" class="comp-nick" data-comp="nick" data-cid="${esc(x.id)}" value="${esc(x.nick || "")}" placeholder="${esc(x.n)}" aria-label="Name for this ${esc(COMP_KIND[x.kind] || "companion")}">
        <span class="tag">${esc(COMP_KIND[x.kind] || "Companion")}</span><button class="icon-btn" type="button" data-cdel="${esc(x.id)}" title="Remove ${esc(x.nick || x.n)}">✕</button></div>
      <div class="muted comp-sub">${esc(x.n)} · ${x.ed === "custom" ? "custom" : x.ed} rules${m ? ` · CR ${crLabel(m.cr)} · AC ${m.ac} · ${esc(m.speed)}` : ""}</div>
      <div class="row comp-hp"><label>HP <input type="number" min="0" data-comp="hp" data-cid="${esc(x.id)}" value="${esc(x.hp)}" aria-label="Current hit points"></label><span class="muted">/ ${esc(x.max)}</span>
        <input type="text" data-comp="notes" data-cid="${esc(x.id)}" value="${esc(x.notes || "")}" placeholder="Notes: tricks, conditions, where it is…" aria-label="Notes"></div>
      ${m ? `<details class="comp-sb"><summary>Stat block</summary>${bsSbHTML(m, x.ed)}</details>` : `<p class="hint" data-comp-stat>This creature's stat block isn't in the Forge's data.</p>`}
    </div>`;
  };
  return `<div class="sec" id="rcComp"><div class="sec-h"><h3>Companions &amp; Wild Shape</h3><span class="sp"></span>${kinds.length ? `<button class="btn sm" type="button" data-ra="comp">✦ Find a beast</button>` : ""}</div>
    ${list.length ? `<div class="comp-grid">${list.map(card).join("")}</div>` : `<p class="muted">No ${kinds.map(k => COMP_KIND[k].toLowerCase()).join(" or ")} yet. Press “Find a beast” to pick one.</p>`}
    <div class="prep-panel hidden" id="rcCompPanel">
      <div class="row" style="flex-wrap:wrap">
        <select id="rcCompKind" style="flex:1 1 160px" aria-label="What you're looking for">${kinds.map(k => `<option value="${k}">${COMP_KIND[k]}</option>`).join("")}</select>
        <input type="search" id="rcCompQ" autocomplete="off" placeholder="Search beasts, e.g. wolf" style="flex:2 1 180px" aria-label="Search beasts">
        <select id="rcCompEd" style="flex:1 1 110px" aria-label="Rules edition"><option value="2024">2024 rules</option><option value="2014">2014 rules</option></select></div>
      <p class="hint" id="rcCompRule" style="margin:6px 0 0"></p>
      <label class="check" style="margin:4px 0 0"><input type="checkbox" id="rcCompAll"><span>Show every beast (the DM has allowed something else)</span></label>
      <div class="prep-res" id="rcCompList"></div></div></div>`;
}
function renderCompList(c) {
  const box = $("#rcCompList"); if (!box) return;
  bsLoad();
  const kind = $("#rcCompKind").value, ed = $("#rcCompEd").value, all = $("#rcCompAll").checked;
  const rule = compRule(c, kind, ed), q = $("#rcCompQ").value.trim().toLowerCase();
  $("#rcCompRule").textContent = rule.text;
  const list = (BS.data[ed] || []).filter(m => (all ? m.type === "beast" : rule.test(m)) && (!q || m.n.toLowerCase().includes(q))).sort((a, b) => a.cr - b.cr || a.n.localeCompare(b.n));
  const have = new Set((c.companions || []).filter(x => x.kind === kind && x.ed === ed).map(x => x.n));
  box.innerHTML = list.length ? list.slice(0, 120).map(m => `<div class="prep-row"><details><summary><b>${esc(m.n)}</b> <span class="muted">CR ${crLabel(m.cr)} · ${esc(cap1(m.size))} · AC ${m.ac} · ${m.hp} HP · ${esc(m.speed)}</span></summary>${bsSbHTML(m, ed)}</details>
      <button type="button" class="btn sm ${have.has(m.n) ? "" : "primary"}" data-cadd="${esc(m.n)}" style="flex:0 0 auto">${have.has(m.n) ? "✓ Added" : "+ Add"}</button></div>`).join("")
    + (list.length > 120 ? `<p class="hint">Showing 120 of ${list.length}. Narrow the search to see more.</p>` : "")
    : `<p class="muted" style="margin:8px 0">No beasts match. Try the other rules edition or clear the search.</p>`;
}
(function initCompanions() {
  const main = $("#rosterMain");
  main.addEventListener("input", e => {
    const c = rosterCur(), t = e.target; if (!c) return;
    if (["rcCompKind", "rcCompQ", "rcCompEd", "rcCompAll"].includes(t.id)) { renderCompList(c); return; }
    if (!t.dataset.comp) return;
    const x = (c.companions || []).find(y => y.id === t.dataset.cid); if (!x) return;
    x[t.dataset.comp] = t.dataset.comp === "hp" ? Math.max(0, parseInt(t.value) || 0) : t.value;
    pcPersist();
  });
  main.addEventListener("click", async e => {
    const c = rosterCur(); if (!c) return;
    const open = e.target.closest('[data-ra="comp"]');
    if (open) {
      const p = $("#rcCompPanel"); p.classList.toggle("hidden"); const on = !p.classList.contains("hidden");
      open.textContent = on ? "Close search" : "✦ Find a beast";
      if (on) {
        await dmLoadExtraMonsters();
        if (!p.isConnected || p.classList.contains("hidden")) return;
        bsLoad(); $("#rcCompEd").value = BS.ed === "2014" ? "2014" : "2024"; renderCompList(c); $("#rcCompQ").focus();
      }
      return;
    }
    const add = e.target.closest("[data-cadd]");
    if (add) {
      const kind = $("#rcCompKind").value, ed = $("#rcCompEd").value, m = (BS.data[ed] || []).find(x => x.n === add.dataset.cadd); if (!m) return;
      c.companions = c.companions || [];
      const same = c.companions.findIndex(x => x.kind === kind && x.ed === ed && x.n === m.n);
      if (same >= 0) c.companions.splice(same, 1);
      else c.companions.push({ id: uid("cmp"), kind, ed, n: m.n, nick: "", hp: m.hp, max: m.hp, notes: "" });
      pcPersist();
      const keep = { q: $("#rcCompQ").value, kind, ed, all: $("#rcCompAll").checked };
      renderRosterMain();
      const p = $("#rcCompPanel"); p.classList.remove("hidden"); $('[data-ra="comp"]').textContent = "Close search";
      $("#rcCompQ").value = keep.q; $("#rcCompKind").value = keep.kind; $("#rcCompEd").value = keep.ed; $("#rcCompAll").checked = keep.all; renderCompList(c);
      toast(same >= 0 ? `${m.n} removed` : `${m.n} added as a ${COMP_KIND[kind].toLowerCase()}`);
      return;
    }
    const del = e.target.closest("[data-cdel]");
    if (del) { const x = (c.companions || []).find(y => y.id === del.dataset.cdel); c.companions = (c.companions || []).filter(y => y !== x); pcPersist(); renderRosterMain(); if (x) toast(`${x.nick || x.n} removed`); }
  });
})();
