/* Fixed spell grants by the level that unlocks them. Choice-dependent book grants
   use the same track format in extra-options.json. Core tracks follow the 2014 and 2024 Player’s Handbooks and
   the corresponding System Reference Documents. */
const CLASS_SPELL_GRANTS = {
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
    "Druid|Circle of Stars": { 2: ["Guiding Bolt"] },
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

// These legacy grants have a newer catalog entry, but no 2014 spell text in Forge.
const LEGACY_GRANT_REFERENCES = { "Crusader's Mantle": 3, "Grasping Vine": 4 };

const LEGACY_TIEFLING_SPELLS = { 1: ["Thaumaturgy"], 3: ["Hellish Rebuke"], 5: ["Darkness"] };
const grantedSpellStatus = (level, sources) => !level ? "Granted cantrip" : sources.every(g => g.innate) ? "Innate spell" : "Always prepared";
const spellKey = (ed, name) => ed + "|" + name;
function spellPreparationSources(c, name, ed = edOf(c)) {
  return c.prepared?.find(p => p.bookGrant && p.n === name && p.ed === ed)?.sources || [];
}
function spellGrantLabel(source) {
  const type = { class: "Class", subclass: "Subclass", species: "Species" }[source.kind];
  return type + " · " + source.name + (source.feature ? " (" + source.feature + ")" : "") + (source.book ? " · " + dmBook(source.book).name : "");
}

function speciesSpellAbility(c) {
  const selected = choiceOf(c, "Species Spellcasting")[0];
  return selected === "Wisdom" ? "wis" : selected === "Charisma" ? "cha" : "int";
}
function speciesSpellChoicesHTML(c) {
  if (!(c.prepared || []).some(p => p.bookGrant && Array.isArray(p.sources) && p.sources.some(g => g.kind === "species" && !g.innate && g.name !== "Aasimar"))) return "";
  const current = AB_FULL[speciesSpellAbility(c)];
  return `<p class="hint">Species spellcasting ability · ${esc(current)}</p>${choiceHTML(c, "Species Spellcasting")}${c.race === "Elf" && c.sub === "High Elf" ? choiceHTML(c, "Elven Lineage Cantrip") : ""}`;
}

function syncGrantedSpells(c) {
  const ed = edOf(c), grants = new Map();
  const add = (track, level, source, details = () => ({})) => {
    for (const [minimum, names] of Object.entries(track || {})) {
      if (!Array.isArray(names) || +minimum > level) continue;
      for (const name of names) {
        const spell = spellOf(ed, name);
        if (!spell) continue;
        const reference = ed === "2014" && spell.id.startsWith("2024-") && Object.hasOwn(LEGACY_GRANT_REFERENCES, name);
        const key = spellKey(ed, spell.n);
        if (!grants.has(key)) grants.set(key, { n: spell.n, l: reference ? LEGACY_GRANT_REFERENCES[name] : spell.l, ed, src: source.name, bookGrant: true, sources: [], ...(reference ? { reference: true } : {}) });
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
    const data = classData(ed, cls)?.hbx;
    add(data?.alwaysPrepared, lv, { ...classSource, book: data?.src });
    if (!subclass || lv < subclassLevel(ed, cls)) continue;
    const entry = subclassEntry(ed, cls, subclass);
    const source = { kind: "subclass", name: subclass, cls, book: entry?.src };
    const artificer = ed === "2024" ? REVISED_ARTIFICER_SPELL_GRANTS : ARTIFICER_SPELL_GRANTS;
    add(SUBCLASS_SPELL_GRANTS[ed]?.[cls + "|" + subclass], lv, source);
    if (cls === "Artificer" && Object.hasOwn(artificer, subclass)) add(artificer[subclass], lv, source);
    add(entry?.alwaysPrepared, lv, source);
    if (entry?.spellTracks) {
      add(entry.spellTracks.All, lv, source);
      const choice = choiceOf(c, entry.spellTrackChoice)[0];
      if (choice && choice !== "All" && Object.hasOwn(entry.spellTracks, choice)) add(entry.spellTracks[choice], lv, { ...source, feature: choice });
    }
    if (ed === "2024" && cls === "Druid" && subclass === "Circle of the Land") {
      const land = choiceOf(c, "Circle of the Land Spells")[0];
      if (land && Object.hasOwn(LAND_SPELL_GRANTS, land)) add(LAND_SPELL_GRANTS[land], lv, { ...source, feature: land });
    }
  }
  if (ed === "2014" && c.race === "Tiefling") {
    add(LEGACY_TIEFLING_SPELLS, totalLv(c), { kind: "species", name: "Tiefling", feature: "Infernal Legacy", innate: true }, spell => spell.l ? {
      free: "speciesSpell:2014:" + encodeURIComponent(spell.n), uses: 1, castLevel: 2,
    } : {});
  }
  if (ed === "2024") {
    const race = PC_RACES[ed][c.race], lineage = race?.subs?.[c.sub];
    const source = { kind: "species", name: c.race };
    const subSource = { ...source, feature: c.sub };
    const innate = spell => spell.l ? {
      free: "speciesSpell:" + encodeURIComponent(c.race + "|" + c.sub + "|" + spell.n),
      uses: c.race === "Gnome" ? "proficiency" : 1,
    } : {};
    add(SPECIES_SPELL_GRANTS[c.race], totalLv(c), source);
    const lineageTrack = lineage && SPECIES_SPELL_GRANTS[c.race + "|" + c.sub];
    const cantrip = c.race === "Elf" && c.sub === "High Elf" && choiceOf(c, "Elven Lineage Cantrip")[0];
    add(cantrip ? { ...lineageTrack, 1: [cantrip] } : lineageTrack, totalLv(c), subSource, innate);
    add(race?.alwaysPrepared, totalLv(c), source);
    add(lineage?.alwaysPrepared, totalLv(c), subSource);
  }
  c.prepared = c.prepared.filter(p => !p.bookGrant).concat([...grants.values()]);
}
