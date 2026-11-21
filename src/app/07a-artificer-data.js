/* 2014 rules summaries for the Artificer from Tasha’s Cauldron of Everything. */
const ARTIFICER_FEATURES = rows => rows.map(([l, n, d]) => ({ l, n, d }));
const ARTIFICER_BOOK_OPTIONS = [
  {
    kind: "class", name: "Artificer", ed: "2014", book: true, src: "tce", hd: 8,
    pri: ["int", "con", "dex"], saves: ["con", "int"],
    skills: { n: 2, from: ["Arcana", "History", "Investigation", "Medicine", "Nature", "Perception", "Sleight of Hand"] },
    cast: "artificer", castAb: "int", armor: ["light", "medium", "shield"], weapons: "Simple weapons",
    tools: "Thieves’ tools, tinker’s tools, and one type of artisan’s tools",
    kit: "Light crossbow, 20 bolts, Scale mail, Thieves' tools, Dungeoneer's pack",
    wpn: { n: "Light crossbow", d: "1d8", ab: "dex" }, subName: "Artificer Specialist", subLv: 3, asi: [4, 8, 12, 16, 19],
    features: ARTIFICER_FEATURES([
      [1, "Magical Tinkering", "Use tools to give a Tiny nonmagical object a minor magical effect, such as light, a recorded sound, an odor, or a visible mark. The number of active objects is limited by your Intelligence modifier."],
      [1, "Artificer Spellcasting", "Prepare artificer spells using Intelligence. Tools you are proficient with or an infused item serve as your focus. You can cast prepared ritual spells as rituals."],
      [2, "Infuse Item", "Learn four infusions and maintain up to two infused items after a long rest. Your available and active infusions increase with artificer level."],
      [3, "The Right Tool for the Job", "Spend an hour using thieves’ tools or artisan’s tools to create a set of artisan’s tools. The set disappears when you use this feature again."],
      [6, "Tool Expertise", "Double your proficiency bonus for ability checks that use a tool proficiency."],
      [7, "Flash of Genius", "When you or a visible creature within 30 feet makes an ability check or saving throw, react to add your Intelligence modifier. Uses equal your Intelligence modifier, minimum one, per long rest."],
      [10, "Magic Item Adept", "You can attune to four magic items. Crafting common or uncommon magic items takes a quarter of the time and half the usual gold."],
      [11, "Spell-Storing Item", "After a long rest, store an eligible 1st- or 2nd-level artificer spell in a weapon or suitable focus. A creature holding it can use an action to produce the effect a limited number of times."],
      [14, "Magic Item Savant", "You can attune to five magic items and ignore class, race, spell, and level requirements for attunement or use."],
      [18, "Magic Item Master", "You can attune to six magic items."],
      [20, "Soul of Artifice", "Add +1 to saving throws for each magic item you are attuned to. React to being reduced to 0 hit points without being killed outright by ending an infusion and dropping to 1 hit point instead."]
    ])
  },
  ...[
    ["Alchemist", "Create elixirs, specialize in restorative magic, and improve certain damage or healing spells.", [
      [3, "Alchemist Training", "Gain proficiency with alchemist’s supplies, or another artisan’s tool if already proficient. Your specialist spells are always prepared: 3: Healing Word and Ray of Sickness; 5: Flaming Sphere and Melf’s Acid Arrow; 9: Gaseous Form and Mass Healing Word; 13: Blight and Death Ward; 17: Cloudkill and Raise Dead."],
      [3, "Experimental Elixir", "Make a free elixir after a long rest and roll its effect. Expend a spell slot to make another and choose healing, swiftness, resilience, boldness, flight, or transformation."],
      [5, "Alchemical Savant", "With alchemist’s supplies as your focus, add your Intelligence modifier to one qualifying healing roll or one roll of acid, fire, necrotic, or poison damage."],
      [9, "Restorative Reagents", "Your elixirs also grant temporary hit points. Cast Lesser Restoration without a slot a limited number of times per long rest."],
      [15, "Chemical Mastery", "Resist acid and poison and become immune to being poisoned. Cast Greater Restoration and Heal once each per long rest without a slot."]
    ]],
    ["Armorer", "Build arcane armor and switch between Guardian and Infiltrator models.", [
      [3, "Armorer Training", "Gain heavy armor and smith’s tools proficiency. If you already know smith’s tools, choose another artisan’s tool. Your specialist spells are always prepared: 3: Magic Missile and Thunderwave; 5: Mirror Image and Shatter; 9: Hypnotic Pattern and Lightning Bolt; 13: Fire Shield and Greater Invisibility; 17: Passwall and Wall of Force."],
      [3, "Arcane Armor", "Transform a suit of armor into your spellcasting focus. It fits you, can replace missing limbs, and ignores its Strength requirement for you."],
      [3, "Armor Model", "Choose Guardian for thunder gauntlets and temporary hit points, or Infiltrator for a lightning launcher, extra speed, and better Stealth. Switch when you finish a short or long rest with smith’s tools."],
      [5, "Extra Attack", "Make two attacks when you take the Attack action."],
      [9, "Armor Modifications", "Infuse separate parts of your Arcane Armor. You can maintain two additional infusions, provided they are used on the armor."],
      [15, "Perfected Armor", "Guardian can pull an eligible nearby enemy close and make a reaction attack. Infiltrator can make a target glow, hinder its attacks against you, and set it up for a stronger allied hit."]
    ]],
    ["Artillerist", "Create an eldritch cannon and channel spells through an arcane firearm.", [
      [3, "Artillerist Training", "Gain woodcarver’s tools proficiency, or another artisan’s tool if already proficient. Your specialist spells are always prepared: 3: Shield and Thunderwave; 5: Scorching Ray and Shatter; 9: Fireball and Wind Wall; 13: Ice Storm and Wall of Fire; 17: Cone of Cold and Wall of Force."],
      [3, "Eldritch Cannon", "Create a temporary cannon in Flamethrower, Force Ballista, or Protector mode and command it as a bonus action. Expend a slot for additional creations after the free one each long rest."],
      [5, "Arcane Firearm", "Turn a wand, staff, or rod into an artificer focus. When you cast an artificer spell through it, add 1d8 to one of its damage rolls."],
      [9, "Explosive Cannon", "Your cannon deals an extra 1d8 damage. You can detonate it for a force burst that allows a Dexterity save for half damage."],
      [15, "Fortified Position", "You and allies near a cannon gain half cover. You can maintain two cannons and command both with the same bonus action."]
    ]],
    ["Battle Smith", "Use Intelligence with magic weapons and fight alongside a Steel Defender.", [
      [3, "Battle Smith Training", "Gain smith’s tools proficiency, or another artisan’s tool if already proficient. Your specialist spells are always prepared: 3: Heroism and Shield; 5: Branding Smite and Warding Bond; 9: Aura of Vitality and Conjure Barrage; 13: Aura of Purity and Fire Shield; 17: Banishing Smite and Mass Cure Wounds."],
      [3, "Battle Ready", "Gain martial weapon proficiency. You can use Intelligence for attack and damage rolls with magic weapons."],
      [3, "Steel Defender", "Build a defensive construct. It can protect a nearby creature with its reaction and follows your commands. In combat, command it to take most actions with your bonus action."],
      [5, "Extra Attack", "Make two attacks when you take the Attack action."],
      [9, "Arcane Jolt", "On a hit with a magic weapon or your defender, deal extra force damage or restore hit points to a creature or object near the target. Uses are limited per long rest."],
      [15, "Improved Defender", "Arcane Jolt improves, the defender gains +2 AC, and a creature affected by its Deflect Attack reaction takes force damage."]
    ]]
  ].map(([name, desc, rows]) => ({
    kind: "subclass", name, desc, cls: "Artificer", ed: "2014", book: true, src: "tce", features: ARTIFICER_FEATURES(rows)
  }))
];
const ARTIFICER_SPELL_NAMES = new Set((
  "Acid Splash|Booming Blade|Create Bonfire|Dancing Lights|Fire Bolt|Frostbite|Green-Flame Blade|Guidance|Light|Lightning Lure|Mage Hand|Magic Stone|Mending|Poison Spray|Prestidigitation|Ray of Frost|Resistance|Shocking Grasp|Spare the Dying|Sword Burst|Thorn Whip|Thunderclap|" +
  "Absorb Elements|Alarm|Catapult|Cure Wounds|Detect Magic|Disguise Self|Expeditious Retreat|Faerie Fire|False Life|Feather Fall|Grease|Identify|Jump|Longstrider|Purify Food and Drink|Sanctuary|Snare|Tasha's Caustic Brew|" +
  "Aid|Alter Self|Arcane Lock|Blur|Continual Flame|Darkvision|Enhance Ability|Enlarge/Reduce|Heat Metal|Invisibility|Lesser Restoration|Levitate|Magic Mouth|Magic Weapon|Protection from Poison|Pyrotechnics|Rope Trick|See Invisibility|Skywrite|Spider Climb|Web|" +
  "Blink|Catnap|Create Food and Water|Dispel Magic|Elemental Weapon|Flame Arrows|Fly|Glyph of Warding|Haste|Intellect Fortress|Protection from Energy|Revivify|Tiny Servant|Water Breathing|Water Walk|" +
  "Arcane Eye|Elemental Bane|Fabricate|Freedom of Movement|Leomund's Secret Chest|Mordenkainen's Faithful Hound|Mordenkainen's Private Sanctum|Otiluke's Resilient Sphere|Stone Shape|Stoneskin|Summon Construct|" +
  "Animate Objects|Bigby's Hand|Creation|Greater Restoration|Skill Empowerment|Transmute Rock|Wall of Stone"
).toLowerCase().split("|"));
