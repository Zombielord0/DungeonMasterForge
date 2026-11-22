/* Fixed spell grants by the level that unlocks them. Choice-dependent book grants
   use the same track format in spell-grants.json and extra-options.json. Core tracks follow the 2014 and 2024 Player’s Handbooks and
   the corresponding System Reference Documents. */
const CLASS_SPELL_GRANTS = {
  Artificer: [[1, "Tinker’s Magic", "Mending"]],
  Druid: [[1, "Druidic", "Speak with Animals"]],
  Ranger: [[1, "Favored Enemy", "Hunter's Mark", "hmark"]],
  Paladin: [[2, "Paladin's Smite", "Divine Smite", "freeDivineSmite"], [5, "Faithful Steed", "Find Steed", "freePaladinSteed"]],
};

const SUBCLASS_SPELL_GRANTS = {
  "2014": {
    "Cleric|Life Domain": {
      1: ["Bless", "Cure Wounds"], 3: ["Lesser Restoration", "Spiritual Weapon"],
      5: ["Beacon of Hope", "Revivify"], 7: ["Death Ward", "Freedom of Movement"],
      9: ["Mass Cure Wounds", "Raise Dead"],
    },
    "Cleric|Knowledge Domain": {
      1: ["Command", "Identify"], 3: ["Augury", "Suggestion"], 5: ["Nondetection", "Speak with Dead"],
      7: ["Arcane Eye", "Confusion"], 9: ["Legend Lore", "Scrying"],
    },
    "Cleric|Light Domain": {
      1: ["Burning Hands", "Faerie Fire", "Light"], 3: ["Flaming Sphere", "Scorching Ray"],
      5: ["Daylight", "Fireball"], 7: ["Guardian of Faith", "Wall of Fire"], 9: ["Flame Strike", "Scrying"],
    },
    "Cleric|Nature Domain": {
      1: ["Animal Friendship", "Speak with Animals"], 3: ["Barkskin", "Spike Growth"],
      5: ["Plant Growth", "Wind Wall"], 7: ["Dominate Beast", "Grasping Vine"], 9: ["Insect Plague", "Tree Stride"],
    },
    "Cleric|Tempest Domain": {
      1: ["Fog Cloud", "Thunderwave"], 3: ["Gust of Wind", "Shatter"], 5: ["Call Lightning", "Sleet Storm"],
      7: ["Control Water", "Ice Storm"], 9: ["Destructive Wave", "Insect Plague"],
    },
    "Cleric|Trickery Domain": {
      1: ["Charm Person", "Disguise Self"], 3: ["Mirror Image", "Pass without Trace"],
      5: ["Blink", "Dispel Magic"], 7: ["Dimension Door", "Polymorph"], 9: ["Dominate Person", "Modify Memory"],
    },
    "Cleric|War Domain": {
      1: ["Divine Favor", "Shield of Faith"], 3: ["Magic Weapon", "Spiritual Weapon"],
      5: ["Crusader's Mantle", "Spirit Guardians"], 7: ["Freedom of Movement", "Stoneskin"], 9: ["Flame Strike", "Hold Monster"],
    },
    "Paladin|Oath of the Ancients": {
      3: ["Ensnaring Strike", "Speak with Animals"], 5: ["Moonbeam", "Misty Step"], 9: ["Plant Growth", "Protection from Energy"],
      13: ["Ice Storm", "Stoneskin"], 17: ["Commune with Nature", "Tree Stride"],
    },
    "Paladin|Oath of Vengeance": {
      3: ["Bane", "Hunter's Mark"], 5: ["Hold Person", "Misty Step"], 9: ["Haste", "Protection from Energy"],
      13: ["Banishment", "Dimension Door"], 17: ["Hold Monster", "Scrying"],
    },
    "Paladin|Oath of Devotion": {
      3: ["Protection from Evil and Good", "Sanctuary"], 5: ["Lesser Restoration", "Zone of Truth"],
      9: ["Beacon of Hope", "Dispel Magic"], 13: ["Freedom of Movement", "Guardian of Faith"],
      17: ["Commune", "Flame Strike"],
    },
  },
  "2024": {
    "Cleric|Life Domain": {
      3: ["Aid", "Bless", "Cure Wounds", "Lesser Restoration"], 5: ["Mass Healing Word", "Revivify"],
      7: ["Aura of Life", "Death Ward"], 9: ["Greater Restoration", "Mass Cure Wounds"],
    },
    "Cleric|Light Domain": {
      3: ["Burning Hands", "Faerie Fire", "Scorching Ray", "See Invisibility"], 5: ["Daylight", "Fireball"],
      7: ["Arcane Eye", "Wall of Fire"], 9: ["Flame Strike", "Scrying"],
    },
    "Cleric|Trickery Domain": {
      3: ["Charm Person", "Disguise Self", "Invisibility", "Pass without Trace"], 5: ["Hypnotic Pattern", "Nondetection"],
      7: ["Confusion", "Dimension Door"], 9: ["Dominate Person", "Modify Memory"],
    },
    "Cleric|War Domain": {
      3: ["Guiding Bolt", "Magic Weapon", "Shield of Faith", "Spiritual Weapon"], 5: ["Crusader's Mantle", "Spirit Guardians"],
      7: ["Fire Shield", "Freedom of Movement"], 9: ["Hold Monster", "Steel Wind Strike"],
    },
    "Paladin|Oath of Devotion": {
      3: ["Protection from Evil and Good", "Shield of Faith"], 5: ["Aid", "Zone of Truth"],
      9: ["Beacon of Hope", "Dispel Magic"], 13: ["Freedom of Movement", "Guardian of Faith"],
      17: ["Commune", "Flame Strike"],
    },
    "Paladin|Oath of the Ancients": {
      3: ["Ensnaring Strike", "Speak with Animals"], 5: ["Misty Step", "Moonbeam"], 9: ["Plant Growth", "Protection from Energy"],
      13: ["Ice Storm", "Stoneskin"], 17: ["Commune with Nature", "Tree Stride"],
    },
    "Paladin|Oath of Vengeance": {
      3: ["Bane", "Hunter's Mark"], 5: ["Hold Person", "Misty Step"], 9: ["Haste", "Protection from Energy"],
      13: ["Banishment", "Dimension Door"], 17: ["Hold Monster", "Scrying"],
    },
    "Paladin|Oath of Glory": {
      3: ["Guiding Bolt", "Heroism"], 5: ["Enhance Ability", "Magic Weapon"], 9: ["Haste", "Protection from Energy"],
      13: ["Compulsion", "Freedom of Movement"], 17: ["Legend Lore", "Yolande's Regal Presence"],
    },
    "Ranger|Fey Wanderer": { 3: ["Charm Person"], 5: ["Misty Step"], 9: ["Summon Fey"], 13: ["Dimension Door"], 17: ["Mislead"] },
    "Ranger|Gloom Stalker": { 3: ["Disguise Self"], 5: ["Rope Trick"], 9: ["Fear"], 13: ["Greater Invisibility"], 17: ["Seeming"] },
    "Sorcerer|Aberrant Sorcery": {
      3: ["Arms of Hadar", "Calm Emotions", "Detect Thoughts", "Dissonant Whispers", "Mind Sliver"],
      5: ["Hunger of Hadar", "Sending"], 7: ["Black Tentacles", "Summon Aberration"], 9: ["Telepathic Bond", "Telekinesis"],
    },
    "Sorcerer|Clockwork Sorcery": {
      3: ["Aid", "Alarm", "Lesser Restoration", "Protection from Evil and Good"], 5: ["Dispel Magic", "Protection from Energy"],
      7: ["Freedom of Movement", "Summon Construct"], 9: ["Greater Restoration", "Wall of Force"],
    },
    "Sorcerer|Draconic Sorcery": {
      3: ["Alter Self", "Chromatic Orb", "Command", "Dragon's Breath"], 5: ["Fear", "Fly"],
      7: ["Arcane Eye", "Charm Monster"], 9: ["Legend Lore", "Summon Dragon"],
    },
    "Warlock|Archfey Patron": {
      3: ["Calm Emotions", "Faerie Fire", "Misty Step", "Phantasmal Force", "Sleep"], 5: ["Blink", "Plant Growth"],
      7: ["Dominate Beast", "Greater Invisibility"], 9: ["Dominate Person", "Seeming"],
    },
    "Warlock|Celestial Patron": {
      3: ["Aid", "Cure Wounds", "Guiding Bolt", "Lesser Restoration", "Light", "Sacred Flame"], 5: ["Daylight", "Revivify"],
      7: ["Guardian of Faith", "Wall of Fire"], 9: ["Greater Restoration", "Summon Celestial"],
    },
    "Warlock|Great Old One Patron": {
      3: ["Detect Thoughts", "Dissonant Whispers", "Phantasmal Force", "Hideous Laughter"], 5: ["Clairvoyance", "Hunger of Hadar"],
      7: ["Confusion", "Summon Aberration"], 9: ["Modify Memory", "Telekinesis"],
    },
    "Warlock|Fiend Patron": {
      3: ["Burning Hands", "Command", "Scorching Ray", "Suggestion"], 5: ["Fireball", "Stinking Cloud"],
      7: ["Fire Shield", "Wall of Fire"], 9: ["Geas", "Insect Plague"],
    },
    "Druid|Circle of the Moon": {
      3: ["Cure Wounds", "Moonbeam", "Starry Wisp"], 5: ["Conjure Animals"], 7: ["Fount of Moonlight"], 9: ["Mass Cure Wounds"],
    },
    "Druid|Circle of the Sea": {
      3: ["Fog Cloud", "Gust of Wind", "Ray of Frost", "Shatter", "Thunderwave"],
      5: ["Lightning Bolt", "Water Breathing"], 7: ["Control Water", "Ice Storm"], 9: ["Conjure Elemental", "Hold Monster"],
    },
  },
};

const ARTIFICER_SPELL_GRANTS = {
  Alchemist: {
    3: ["Healing Word", "Ray of Sickness"], 5: ["Flaming Sphere", "Acid Arrow"], 9: ["Gaseous Form", "Mass Healing Word"],
    13: ["Blight", "Death Ward"], 17: ["Cloudkill", "Raise Dead"],
  },
  Armorer: {
    3: ["Magic Missile", "Thunderwave"], 5: ["Mirror Image", "Shatter"], 9: ["Hypnotic Pattern", "Lightning Bolt"],
    13: ["Fire Shield", "Greater Invisibility"], 17: ["Passwall", "Wall of Force"],
  },
  Artillerist: {
    3: ["Shield", "Thunderwave"], 5: ["Scorching Ray", "Shatter"], 9: ["Fireball", "Wind Wall"],
    13: ["Ice Storm", "Wall of Fire"], 17: ["Cone of Cold", "Wall of Force"],
  },
  "Battle Smith": {
    3: ["Heroism", "Shield"], 5: ["Branding Smite", "Warding Bond"], 9: ["Aura of Vitality", "Conjure Barrage"],
    13: ["Aura of Purity", "Fire Shield"], 17: ["Banishing Smite", "Mass Cure Wounds"],
  },
};
const REVISED_ARTIFICER_SPELL_GRANTS = {
  ...ARTIFICER_SPELL_GRANTS,
  Alchemist: { ...ARTIFICER_SPELL_GRANTS.Alchemist, 13: ["Death Ward", "Vitriolic Sphere"] },
  "Battle Smith": { ...ARTIFICER_SPELL_GRANTS["Battle Smith"], 5: ["Shining Smite", "Warding Bond"] },
  Cartographer: {
    3: ["Faerie Fire", "Guiding Bolt", "Healing Word"], 5: ["Locate Object", "Mind Spike"],
    9: ["Call Lightning", "Clairvoyance"], 13: ["Banishment", "Locate Creature"], 17: ["Scrying", "Teleportation Circle"],
  },
};

const LAND_SPELL_GRANTS = {
  Arid: { 3: ["Blur", "Burning Hands", "Fire Bolt"], 5: ["Fireball"], 7: ["Blight"], 9: ["Wall of Stone"] },
  Polar: { 3: ["Fog Cloud", "Hold Person", "Ray of Frost"], 5: ["Sleet Storm"], 7: ["Ice Storm"], 9: ["Cone of Cold"] },
  Temperate: { 3: ["Misty Step", "Shocking Grasp", "Sleep"], 5: ["Lightning Bolt"], 7: ["Freedom of Movement"], 9: ["Tree Stride"] },
  Tropical: { 3: ["Acid Splash", "Ray of Sickness", "Web"], 5: ["Stinking Cloud"], 7: ["Polymorph"], 9: ["Insect Plague"] },
};

const SPECIES_SPELL_GRANTS = {
  "Elf|Drow": { 1: ["Dancing Lights"], 3: ["Faerie Fire"], 5: ["Darkness"] },
  "Elf|High Elf": { 1: ["Prestidigitation"], 3: ["Detect Magic"], 5: ["Misty Step"] },
  "Elf|Wood Elf": { 1: ["Druidcraft"], 3: ["Longstrider"], 5: ["Pass without Trace"] },
  "Gnome|Forest Gnome": { 1: ["Minor Illusion", "Speak with Animals"] },
  "Gnome|Rock Gnome": { 1: ["Mending", "Prestidigitation"] },
  "Tiefling|Abyssal": { 1: ["Poison Spray"], 3: ["Ray of Sickness"], 5: ["Hold Person"] },
  "Tiefling|Chthonic": { 1: ["Chill Touch"], 3: ["False Life"], 5: ["Ray of Enfeeblement"] },
  "Tiefling|Infernal": { 1: ["Fire Bolt"], 3: ["Hellish Rebuke"], 5: ["Darkness"] },
  "Tiefling": { 1: ["Thaumaturgy"] },
  "Aasimar": { 1: ["Light"] },
};

const LEGACY_LAND_SPELL_GRANTS = {
  Arctic: { 3: ["Hold Person", "Spike Growth"], 5: ["Sleet Storm", "Slow"], 7: ["Freedom of Movement", "Ice Storm"], 9: ["Commune with Nature", "Cone of Cold"] },
  Coast: { 3: ["Mirror Image", "Misty Step"], 5: ["Water Breathing", "Water Walk"], 7: ["Control Water", "Freedom of Movement"], 9: ["Conjure Elemental", "Scrying"] },
  Desert: { 3: ["Blur", "Silence"], 5: ["Create Food and Water", "Protection from Energy"], 7: ["Blight", "Hallucinatory Terrain"], 9: ["Insect Plague", "Wall of Stone"] },
  Forest: { 3: ["Barkskin", "Spider Climb"], 5: ["Call Lightning", "Plant Growth"], 7: ["Divination", "Freedom of Movement"], 9: ["Commune with Nature", "Tree Stride"] },
  Grassland: { 3: ["Invisibility", "Pass without Trace"], 5: ["Daylight", "Haste"], 7: ["Divination", "Freedom of Movement"], 9: ["Dream", "Insect Plague"] },
  Mountain: { 3: ["Spider Climb", "Spike Growth"], 5: ["Lightning Bolt", "Meld into Stone"], 7: ["Stone Shape", "Stoneskin"], 9: ["Passwall", "Wall of Stone"] },
  Swamp: { 3: ["Darkness", "Acid Arrow"], 5: ["Water Walk", "Stinking Cloud"], 7: ["Freedom of Movement", "Locate Creature"], 9: ["Insect Plague", "Scrying"] },
  Underdark: { 3: ["Spider Climb", "Web"], 5: ["Gaseous Form", "Stinking Cloud"], 7: ["Greater Invisibility", "Stone Shape"], 9: ["Cloudkill", "Insect Plague"] },
};

const LEGACY_SPECIES_SPELL_GRANTS = {
  Tiefling: ["Infernal Legacy", "cha", { 1: ["Thaumaturgy"], 3: ["Hellish Rebuke"], 5: ["Darkness"] }],
  Aasimar: ["Light Bearer", "cha", { 1: ["Light"] }],
  "Elf|High Elf": ["High Elf", "int", {}],
  "Elf|Drow": ["Drow Magic", "cha", { 1: ["Dancing Lights"], 3: ["Faerie Fire"], 5: ["Darkness"] }],
  "Gnome|Forest Gnome": ["Natural Illusionist", "int", { 1: ["Minor Illusion"] }],
  "Gith|Githyanki": ["Githyanki Psionics", "int", { 1: ["Mage Hand"], 3: ["Jump"], 5: ["Misty Step"] }],
  "Gith|Githzerai": ["Githzerai Psionics", "wis", { 1: ["Mage Hand"], 3: ["Shield"], 5: ["Detect Thoughts"] }],
  "Dwarf|Duergar": ["Duergar Magic", "int", { 3: ["Enlarge/Reduce"], 5: ["Invisibility"] }],
  "Dwarf|Mark of Warding": ["Wards and Seals", "int", { 1: ["Alarm", "Mage Armor"], 3: ["Arcane Lock"] }],
  "Elf|Mark of Shadow": ["Shape Shadows", "cha", { 1: ["Minor Illusion"], 3: ["Invisibility"] }],
  "Gnome|Mark of Scribing": ["Scribe’s Insight", "int", { 1: ["Message", "Comprehend Languages"], 3: ["Magic Mouth"] }],
  "Halfling|Mark of Healing": ["Healing Touch", "wis", { 1: ["Cure Wounds"], 3: ["Lesser Restoration"] }],
  "Halfling|Mark of Hospitality": ["Innkeeper’s Magic", "cha", { 1: ["Prestidigitation", "Purify Food and Drink", "Unseen Servant"] }],
};

const WIZARD_SPELL_CHOICES = [
  { choice: "Spell Mastery (1st level)", feature: "Spell Mastery", level: 18, uses: "atWill" },
  { choice: "Spell Mastery (2nd level)", feature: "Spell Mastery", level: 18, uses: "atWill" },
  { choice: "Signature Spells", feature: "Signature Spells", level: 20, uses: 1, recharge: "short" },
];

const GENASI_SPELL_GRANTS = {
  "Air Genasi": { 1: ["Shocking Grasp"], 3: ["Feather Fall"], 5: ["Levitate"] },
  "Earth Genasi": { 1: ["Blade Ward"], 5: ["Pass without Trace"] },
  "Fire Genasi": { 1: ["Produce Flame"], 3: ["Burning Hands"], 5: ["Flame Blade"] },
  "Water Genasi": { 1: ["Acid Splash"], 3: ["Create or Destroy Water"], 5: ["Water Walk"] },
};

const SPELL_GRANT_REFERENCES = { bloodbound: { n: "Bloodbound", l: 1 } };

const FEAT_SPELLS = {
  "Fey Touched": { fixed: ["Misty Step"], schools: ["Divination", "Enchantment"] },
  "Shadow Touched": { fixed: ["Invisibility"], schools: ["Illusion", "Necromancy"] },
  Telekinetic: { fixed: ["Mage Hand"] },
  Telepathic: { fixed: ["Detect Thoughts"] },
  "Ritual Caster": {},
  "Spell Sniper": {},
};
const featSpellKey = name => name.replace(/^(Fey|Shadow)-Touched$/, "$1 Touched");
function activeCharacterFeats(c) {
  return [...new Set((c.feats || []).filter(f => f.f.startsWith("Feat: "))
    .map(f => f.f.slice(6).replace(/ \(\+.*\)$/, "")))];
}
function featCastingAbility(c, name) {
  const pick = Object.entries(c.asiPicks || {}).find(([level, feat]) => +level <= c.level && feat?.feat === name)?.[1];
  return (c.bonusFeats || []).find(feat => feat.n === name && feat.a)?.a
    || ["int", "wis", "cha"].find(ab => pick?.[ab])
    || ["int", "wis", "cha"].find(ab => choiceOf(c, "Feat casting ability: " + featSpellKey(name)).includes(ab))
    || "int";
}

const grantedSpellStatus = (level, sources) => !level ? "Granted cantrip"
  : sources.some(g => !g.innate && !g.known) ? "Always prepared"
  : sources.some(g => g.known) ? "Granted spell" : sources.every(g => g.ritualOnly) ? "Ritual spell" : "Innate spell";
const spellKey = (ed, name) => ed + "|" + name;
function spellPreparationSources(c, name, ed = edOf(c)) {
  return c.prepared?.find(p => p.bookGrant && p.n === name && p.ed === ed)?.sources || [];
}
function spellGrantLabel(source) {
  const type = { class: "Class", subclass: "Subclass", species: "Species", feat: "Feat" }[source.kind];
  return type + " · " + source.name + (source.feature ? " (" + source.feature + ")" : "") + (source.book ? " · " + dmBook(source.book).name : "");
}

function speciesSpellAbility(c) {
  const selected = choiceOf(c, "Species Spellcasting")[0];
  return selected === "Wisdom" ? "wis" : selected === "Charisma" ? "cha" : "int";
}
function speciesSpellChoicesHTML(c) {
  if (edOf(c) === "2014") return c.race === "Elf" && c.sub === "High Elf" ? choiceHTML(c, "High Elf Cantrip") : "";
  if (!(c.prepared || []).some(p => p.bookGrant && p.sources?.some(g => g.kind === "species" && !g.ab && g.name !== "Aasimar"))) return "";
  const current = AB_FULL[speciesSpellAbility(c)];
  const cantripChoice = c.race === "Elf" && c.sub === "High Elf" ? choiceHTML(c, "Elven Lineage Cantrip")
    : c.race === "Khoravar" ? choiceHTML(c, "Fey Gift Cantrip") : "";
  return `<p class="hint">Species spellcasting ability · ${esc(current)}</p>${choiceHTML(c, "Species Spellcasting")}${cantripChoice}`;
}

function syncGrantedSpells(c) {
  const ed = edOf(c), grants = new Map();
  const add = (track, level, source, details = () => ({})) => {
    for (const [minimum, names] of Object.entries(track || {})) {
      if (!Array.isArray(names) || +minimum > level) continue;
      for (const name of names) {
        const catalogSpell = spellOf(ed, name);
        const spell = catalogSpell || SPELL_GRANT_REFERENCES[name.toLowerCase()];
        if (!spell) continue;
        const key = spellKey(ed, spell.n);
        if (!grants.has(key)) grants.set(key, {
          n: spell.n, l: spell.l, ed, src: source.name, bookGrant: true, sources: [], ...(!catalogSpell ? { reference: true } : {}),
        });
        const sources = grants.get(key).sources;
        if (!sources.some(item => item.kind === source.kind && item.name === source.name && item.feature === source.feature && item.cls === source.cls)) {
          sources.push({ ...source, ...details(spell) });
        }
      }
    }
  };

  for (const { cls, lv, subclass } of [{ cls: c.cls, lv: c.level, subclass: c.subclass }, ...(c.multi || [])]) {
    const classSource = { kind: "class", name: cls, cls };
    if (ed === "2024" && Object.hasOwn(CLASS_SPELL_GRANTS, cls)) {
      for (const [level, feature, spell, free] of CLASS_SPELL_GRANTS[cls]) {
        add({ [level]: [spell] }, lv, { ...classSource, feature }, () => free ? { free } : {});
      }
    }
    if (cls === "Wizard") {
      for (const { choice, feature, level, uses, recharge } of WIZARD_SPELL_CHOICES) {
        if (lv < level || !choiceOf(c, choice).length || (feature === "Spell Mastery" && ed !== "2024")) continue;
        const candidates = CHOICES[choice].opts(c);
        const names = choiceOf(c, choice).filter(name => candidates.some(([id]) => id === name)).slice(0, CHOICES[choice].n(c));
        add({ [level]: names }, lv, { ...classSource, feature }, spell => ({
          free: "wizardSpell:" + encodeURIComponent(feature + "|" + spell.n), uses, recharge,
        }));
      }
    }
    const data = classData(ed, cls)?.hbx;
    add(data?.alwaysPrepared, lv, { ...classSource, book: data?.src });
    if (!subclass || lv < subclassLevel(ed, cls)) continue;
    const entry = subclassEntry(ed, cls, subclass);
    const source = { kind: "subclass", name: subclass, cls, book: entry?.src };
    const artificer = ed === "2024" ? REVISED_ARTIFICER_SPELL_GRANTS : ARTIFICER_SPELL_GRANTS;
    add(SUBCLASS_SPELL_GRANTS[ed]?.[cls + "|" + subclass], lv, source);
    if (cls === "Artificer" && Object.hasOwn(artificer, subclass)) add(artificer[subclass], lv, source);
    add(entry?.alwaysPrepared, lv, source);
    add(entry?.bonusSpells, lv, { ...source, known: true });
    if (cls === "Rogue" && ["Arcane Trickster", "Eldritch Trickster"].includes(subclass)) {
      add({ 3: ["Mage Hand"] }, lv, { ...source, feature: "Spellcasting", known: true });
    }
    if (cls === "Cleric" && subclass === "Arcana Domain" && choiceOf(c, "Arcane Initiate").length) {
      const candidates = CHOICES["Arcane Initiate"].opts(c);
      const choices = choiceOf(c, "Arcane Initiate").filter(name => candidates.some(([id]) => id === name)).slice(0, 2);
      add({ [subclassLevel(ed, cls)]: choices }, lv, { ...source, feature: "Arcane Initiate", known: true });
    }
    if (cls === "Sorcerer" && subclass === "Divine Soul") {
      const affinity = CHOICES["Divine Magic"].opts(c).find(([id]) => id === choiceOf(c, "Divine Magic")[0]);
      if (affinity) add({ [subclassLevel(ed, cls)]: [affinity[2]] }, lv, { ...source, feature: "Divine Magic", known: true });
    }
    if (entry?.spellTracks) {
      add(entry.spellTracks.All, lv, source);
      const choice = choiceOf(c, entry.spellTrackChoice)[0];
      if (choice && choice !== "All" && Object.hasOwn(entry.spellTracks, choice)) add(entry.spellTracks[choice], lv, { ...source, feature: choice });
    }
    if (cls === "Druid" && subclass === "Circle of Stars") {
      add({ 2: ["Guidance", "Guiding Bolt"] }, lv, { ...source, feature: "Star Map" }, spell => spell.l ? {
        free: "starMapGuidingBolt", uses: ed === "2014" ? "proficiency" : Math.max(1, c.mods?.wis || 0),
      } : {});
    }
    if (cls === "Wizard" && ["School of Illusion", "Illusionist"].includes(subclass)) {
      add({ [subclassLevel(ed, cls)]: ["Minor Illusion"] }, lv, { ...source, feature: "Improved Illusions" });
    }
    if (cls === "Druid" && subclass === "Circle of the Land") {
      const tracks = ed === "2024" ? LAND_SPELL_GRANTS : LEGACY_LAND_SPELL_GRANTS;
      const land = choiceOf(c, ed === "2024" ? "Circle of the Land Spells" : "Circle Spells")[0];
      if (land && Object.hasOwn(tracks, land)) add(tracks[land], lv, { ...source, feature: land });
    }
  }

  const race = PC_RACES[ed]?.[c.race], lineage = race?.subs?.[c.sub];
  const species = { kind: "species", name: c.race, book: race?.src };
  const subSpecies = { ...species, feature: c.sub, book: lineage?.src || race?.src };
  const level = totalLv(c);
  const freeCast = (spell, uses = 1, key = c.sub || "") => spell.l ? {
    free: "speciesSpell:" + encodeURIComponent(c.race + "|" + key + "|" + spell.n), uses,
  } : {};

  if (ed === "2014") {
    for (const [key, source] of [[c.race, species], [c.race + "|" + c.sub, subSpecies]]) {
      const legacy = LEGACY_SPECIES_SPELL_GRANTS[key];
      if (!legacy) continue;
      const [feature, ab, track] = legacy;
      const cantrip = key === "Elf|High Elf" && choiceOf(c, "High Elf Cantrip")[0];
      const spells = cantrip && CHOICES["High Elf Cantrip"].opts(c).some(([id]) => id === cantrip) ? { 1: [cantrip] } : track;
      add(spells, level, { ...source, feature, ab, innate: true }, spell => c.race === "Tiefling" && spell.l ? {
        free: "speciesSpell:2014:" + encodeURIComponent(spell.n), uses: 1, castLevel: 2,
      } : freeCast(spell));
    }
  } else {
    add(SPECIES_SPELL_GRANTS[c.race], level, species);
    const track = lineage && SPECIES_SPELL_GRANTS[c.race + "|" + c.sub];
    const choice = c.race === "Elf" && c.sub === "High Elf" && choiceOf(c, "Elven Lineage Cantrip")[0];
    const cantrip = choice && CHOICES["Elven Lineage Cantrip"].opts(c).some(([id]) => id === choice);
    add(cantrip ? { ...track, 1: [choice] } : track, level, subSpecies, spell => freeCast(spell, c.race === "Gnome" ? "proficiency" : 1));
  }
  if (c.race === "Genasi" && lineage && Object.hasOwn(GENASI_SPELL_GRANTS, c.sub)) {
    const ability = choiceOf(c, c.sub)[0];
    add(GENASI_SPELL_GRANTS[c.sub], level, { ...subSpecies, ab: AB_WORD[ability?.toLowerCase()] || "int" }, freeCast);
  }
  const khoravarChoice = c.race === "Khoravar" && choiceOf(c, "Fey Gift Cantrip")[0];
  const validFeyGift = khoravarChoice && CHOICES["Fey Gift Cantrip"].opts(c).some(([id]) => id === khoravarChoice);
  add(validFeyGift ? { 1: [khoravarChoice] } : race?.alwaysPrepared, level, species);
  add(lineage?.alwaysPrepared, level, subSpecies);
  add(race?.innateSpells, level, { ...species, innate: !race?.spellSlots, ab: race?.spellAbility }, spell => freeCast(spell, 1, ""));
  add(lineage?.innateSpells, level, { ...subSpecies, innate: !lineage?.spellSlots, ab: lineage?.spellAbility }, freeCast);
  for (const name of activeCharacterFeats(c)) {
    const key = featSpellKey(name);
    if (key !== "Magic Initiate" && !Object.hasOwn(FEAT_SPELLS, key)) continue;
    const source = { kind: "feat", name, book: featInfo(ed, name)?.[6] };
    const free = spell => spell.l ? { free: "featSpell:" + encodeURIComponent(name + "|" + spell.n), uses: 1 } : {};
    if (key === "Magic Initiate") {
      const { list, can, one } = miState(c);
      if (!list) continue;
      const names = (level, selected, count) => selected.filter(n => miSpellOptions(c, list, level).some(s => s.n === n)).slice(0, count);
      const ability = miCastingAbility(c, list);
      add({ 1: [...names(0, can, 2), ...names(1, one, 1)] }, 1, { ...source, feature: list, ab: ability,
        ...(ed === "2014" ? { known: true, slotClass: list } : {}),
      }, spell => spell.l ? { free: "featMagicInitiate", uses: 1 } : {});
      continue;
    }
    const { fixed = [] } = FEAT_SPELLS[key];
    const choice = "Feat spells: " + key;
    const rule = CHOICES[choice];
    const candidates = rule ? rule.opts(c) : [];
    const selected = choiceOf(c, choice).filter(n => candidates.some(([id]) => id === n)).slice(0, rule?.n(c) || 0);
    const legacyRitual = key === "Ritual Caster" && ed === "2014";
    const innate = legacyRitual || (key === "Telepathic" && ed === "2014");
    const list = choiceOf(c, "Feat spell list: " + key)[0];
    add({ 1: [...fixed, ...selected] }, 1, { ...source, innate, ritualOnly: legacyRitual,
      ab: ed === "2014" && list ? featListAbility(list) : featCastingAbility(c, name),
    }, key === "Ritual Caster" ? undefined : free);
  }
  c.prepared = c.prepared.filter(p => !p.bookGrant && p.src !== "Magic Initiate").concat([...grants.values()]);
}
