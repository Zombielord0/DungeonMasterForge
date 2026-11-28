/* Revised summon stat references. Draconic Spirit: SRD 5.2.1 p.166, CC BY 4.0. Other cards retain the existing PHB summaries. Spell attacks and saves use the caster's values. */
const SUMMON_SPIRITS = {
  "Summon Dragon": {
    name: "Draconic Spirit", type: "Large Dragon, Neutral", ac: 14, hp: 50, hpPerSlot: 10, scores: [19,14,17,10,14,14], speed: "30 ft., fly 60 ft., swim 30 ft.", senses: "Blindsight 30 ft., darkvision 60 ft., passive Perception 12", languages: "Draconic; understands the caster’s languages",
    saves: "STR +4 · DEX +2 · CON +3 · INT +0 · WIS +2 · CHA +2",
    source: "SRD 5.2.1, p. 166", minSlot: 5,
    resistances: ["Acid","Cold","Fire","Lightning","Poison"],
    rules: "Condition immunities: Charmed, Frightened, Poisoned. CR none (0 XP). Shared Resistances: at summoning, choose one of the spirit’s damage resistances; you also have that resistance until the spell ends.",
    attack: "Rend · melee reach 10 ft. · 1d6 + 4 + slot level piercing · use the caster’s spell attack modifier.",
    additional: "Breath Weapon · 30-foot cone · Dexterity save against the caster’s spell save DC. Choose a damage type from the spirit’s resistances when casting. Each creature in the cone takes 2d6 of that type on a failed save, half on success. The Multiattack action includes one Breath Weapon use in addition to the Rend attacks.",
    forms: {Dragon:{}},
  },
  "Summon Beast": {
    name: "Bestial Spirit", type: "Small Beast", ac: 11, hp: 30, hpPerSlot: 5, scores: [18, 11, 16, 4, 14, 5], speed: "30 ft.", senses: "Darkvision 60 ft., passive Perception 12", languages: "Understands the caster’s languages",
    attack: "Rend · melee 5 ft. · 1d8 + 4 + slot level piercing",
    forms: {
      Air: { hp: 20, speed: "Fly 60 ft.", rules: "Flying out of reach does not provoke opportunity attacks." },
      Land: { speed: "Climb 30 ft.", rules: "Pack Tactics grants advantage when a conscious, non-incapacitated ally is within 5 feet of the target." },
      Water: { speed: "Swim 30 ft.", rules: "Pack Tactics as Land. Breathes only underwater." },
    },
  },
  "Summon Fey": {
    name: "Fey Spirit", type: "Small Fey", ac: 12, hp: 30, hpPerSlot: 10, scores: [13, 16, 14, 14, 11, 16], speed: "30 ft., fly 30 ft.", senses: "Darkvision 60 ft., passive Perception 10", languages: "Sylvan, understands the caster’s languages",
    attack: "Fey Blade · melee 5 ft. · 2d6 + 3 + slot level force",
    rules: "Immune to charm. Fey Step is a bonus action that teleports the spirit up to 30 feet to a visible, open space before applying its mood.",
    forms: {
      Fuming: { rules: "After Fey Step, gain advantage on the next attack this turn." },
      Mirthful: { rules: "After Fey Step, one visible creature within 10 feet makes a Wisdom save or is charmed by both summoner and spirit for 1 minute or until damaged." },
      Tricksy: { rules: "After Fey Step, create a 10-foot cube of magical darkness within 5 feet until the end of the spirit’s next turn." },
    },
  },
  "Summon Undead": {
    name: "Undead Spirit", type: "Medium Undead", ac: 11, hp: 30, hpPerSlot: 10, scores: [12, 16, 15, 4, 10, 9], speed: "30 ft.", senses: "Darkvision 60 ft., passive Perception 10", languages: "Understands the caster’s languages",
    rules: "Immune to necrotic and poison damage, exhaustion, fear, paralysis, and the poisoned condition.",
    forms: {
      Ghostly: { speed: "Fly 40 ft. (hover)", attack: "Deathly Touch · melee 5 ft. · 1d8 + 3 + slot level necrotic and frightened until the end of the target’s next turn", rules: "Pass through creatures and objects as difficult terrain. Ending a turn inside an object ejects the spirit to open space and deals 1d10 force per 5 feet traveled." },
      Putrid: { attack: "Rotting Claw · melee 5 ft. · 1d6 + 3 + slot level slashing. A poisoned target is paralyzed until the end of its next turn.", rules: "Other creatures except the caster that start within 5 feet make a Constitution save or are poisoned until their next turn." },
      Skeletal: { hp: 20, attack: "Grave Bolt · ranged 150 ft. · 2d4 + 3 + slot level necrotic" },
    },
  },
  "Summon Aberration": {
    name: "Aberrant Spirit", type: "Medium Aberration", ac: 11, hp: 40, hpPerSlot: 10, scores: [16, 10, 15, 16, 10, 6], speed: "30 ft.", senses: "Darkvision 60 ft., passive Perception 10", languages: "Deep Speech, understands the caster’s languages",
    rules: "Immune to psychic damage.",
    forms: {
      Beholderkin: { speed: "Fly 30 ft. (hover)", attack: "Eye Ray · ranged 150 ft. · 1d8 + 3 + slot level psychic" },
      "Mind Flayer": { attack: "Psychic Slam · melee 5 ft. · 1d8 + 3 + slot level psychic", rules: "At the start of its turn while able to act, creatures within 5 feet other than the caster make a Wisdom save or take 2d6 psychic." },
      Slaad: { attack: "Claw · melee 5 ft. · 1d10 + 3 + slot level slashing and no healing until the spirit’s next turn", rules: "Recovers 5 HP at the start of its turn if it has any HP left." },
    },
  },
  "Summon Construct": {
    name: "Construct Spirit", type: "Medium Construct", ac: 13, hp: 40, hpPerSlot: 15, scores: [18, 10, 18, 14, 11, 5], speed: "30 ft.", senses: "Darkvision 60 ft., passive Perception 10", languages: "Understands the caster’s languages",
    attack: "Slam · melee 5 ft. · 1d8 + 4 + slot level bludgeoning",
    rules: "Resists poison damage. Immune to charm, exhaustion, fear, paralysis, and the poisoned condition.",
    forms: {
      Clay: { rules: "React to damage from a creature with a Slam against it or move half speed toward it without provoking opportunity attacks." },
      Metal: { rules: "Deals 1d10 fire to creatures that hit it in melee or start their turn grappled with it." },
      Stone: { rules: "One visible creature starting its turn within 10 feet can be forced to make a Wisdom save. Failure halves its speed and prevents opportunity attacks until its next turn." },
    },
  },
  "Summon Elemental": {
    name: "Elemental Spirit", type: "Medium Elemental", ac: 11, hp: 50, hpPerSlot: 10, scores: [18, 15, 17, 4, 10, 16], speed: "40 ft.", senses: "Darkvision 60 ft., passive Perception 10", languages: "Primordial, understands the caster’s languages",
    rules: "Immune to poison damage, exhaustion, paralysis, petrification, and the poisoned condition. Air, Fire, and Water can pass through a 1-inch space at normal movement cost.",
    forms: {
      Air: { speed: "Fly 40 ft. (hover)", attack: "Slam · melee 5 ft. · 1d10 + 4 + slot level lightning", rules: "Resists lightning and thunder." },
      Earth: { speed: "Burrow 40 ft.", attack: "Slam · melee 5 ft. · 1d10 + 4 + slot level bludgeoning", rules: "Resists piercing and slashing." },
      Fire: { attack: "Slam · melee 5 ft. · 1d10 + 4 + slot level fire", rules: "Immune to fire." },
      Water: { speed: "Swim 40 ft.", attack: "Slam · melee 5 ft. · 1d10 + 4 + slot level cold", rules: "Resists acid." },
    },
  },
  "Summon Celestial": {
    name: "Celestial Spirit", type: "Large Celestial", ac: 11, hp: 40, hpPerSlot: 10, scores: [16, 14, 16, 10, 14, 16], speed: "30 ft., fly 40 ft.", senses: "Darkvision 60 ft., passive Perception 12", languages: "Celestial, understands the caster’s languages",
    rules: "Resists radiant damage and is immune to charm and fear. Once per day, heal another creature by touch for 2d8 + slot level HP.",
    forms: {
      Avenger: { attack: "Radiant Bow · ranged 600 ft. · 2d6 + 2 + slot level radiant" },
      Defender: { acBonus: 2, attack: "Radiant Mace · melee 5 ft. · 1d10 + 3 + slot level radiant", rules: "On a hit, the spirit or another visible creature within 10 feet of the target can gain 1d10 temporary HP." },
    },
  },
  "Summon Fiend": {
    name: "Fiendish Spirit", type: "Large Fiend", ac: 12, hp: 50, hpPerSlot: 15, scores: [13, 16, 15, 10, 10, 16], speed: "40 ft.", senses: "Darkvision 60 ft., passive Perception 10", languages: "Abyssal, Infernal, telepathy 60 ft.",
    rules: "Resists fire, is immune to poison damage and the poisoned condition, and has advantage on saves against magic.",
    forms: {
      Demon: { speed: "Climb 40 ft.", attack: "Bite · melee 5 ft. · 1d12 + 3 + slot level necrotic", rules: "At 0 HP or when the spell ends, creatures within 10 feet make a Dexterity save against 2d10 + slot level fire damage, half on success." },
      Devil: { hp: 40, speed: "Fly 60 ft.", attack: "Fiery Strike · melee 5 ft. or ranged 150 ft. · 2d6 + 3 + slot level fire", rules: "Magical darkness does not block its darkvision." },
      Yugoloth: { hp: 60, attack: "Claws · melee 5 ft. · 1d8 + 3 + slot level slashing", rules: "After each claw attack it can teleport to a visible open space within 30 feet." },
    },
  },
};

function summonSpiritDefinition(spell,ed) {
  if(ed!=="2024"||!spell||spell.hb||spell.ref||spell.referenceOnly||spell.rulesSummary||spell.pend) return null;
  if(spell.n==="Summon Dragon") return !spell.src&&spell.l===5?SUMMON_SPIRITS[spell.n]:null;
  return spell.src==="phb-2024"&&Object.hasOwn(SUMMON_SPIRITS,spell.n)?SUMMON_SPIRITS[spell.n]:null;
}
// Do not modify the stored archival spell text; present its embedded stat block in the structured card instead.
function summonHigherRules(spell,ed) {
  return summonSpiritDefinition(spell,ed)?.source==="SRD 5.2.1, p. 166"
    ?"Use the spell slot’s level for the spell’s level in the stat block.":spell.h;
}
function summonSpiritStats(spell,ed,slot,formName) {
  const spirit=summonSpiritDefinition(spell,ed);
  if(!spirit||!Number.isInteger(slot)||slot<spell.l||slot>9||!Object.hasOwn(spirit.forms,formName))return null;
  const form=spirit.forms[formName];
  return {level:slot,ac:spirit.ac+slot+(form.acBonus||0),hp:(form.hp??spirit.hp)+(slot-spell.l)*spirit.hpPerSlot,attacks:Math.floor(slot/2),...(spirit.source?{rendDamage:"1d6+"+(4+slot),breathDamage:"2d6",breathUses:1}:{})};
}
function summonSpiritHTML(spell, ed, slot = spell.l, caster = null) {
  const spirit=summonSpiritDefinition(spell,ed);
  if(!spirit||!Number.isInteger(slot)||slot<spell.l||slot>9)return "";
  const level = slot;
  const abilities = spirit.scores.map((score, i) => AB_NAME[AB[i]] + " " + score + " (" + sgn(mod(score)) + ")").join(" · ");
  return `<details open><summary>${esc(spirit.name)} · slot level ${level}</summary>
    <p>${esc(spirit.type)} · Speed ${esc(spirit.speed)}<br>${esc(abilities)}<br>${esc(spirit.senses)} · ${esc(spirit.languages)}</p>
    <p>Attacks in Multiattack: ${Math.floor(level / 2)}${spirit.additional?" Rend attacks plus one Breath Weapon use":""} · ${caster ? `Spell attack ${sgn(caster.atk)} · Save DC ${caster.dc}` : "Use the caster’s spell attack modifier and spell save DC."} Proficiency bonus equals the caster’s.</p>
    ${spirit.saves?`<p>Saving throws: ${esc(spirit.saves)}</p>`:""}
    ${spirit.resistances?`<p>Damage resistances: ${esc(spirit.resistances.join(", "))}</p>`:""}
    ${spirit.rules ? `<p>${esc(spirit.rules)}</p>` : ""}
    ${Object.entries(spirit.forms).map(([name, form]) => {
      const stats=summonSpiritStats(spell,ed,level,name);
      return `<p><b>${esc(name)}</b> · AC ${stats.ac} · HP ${stats.hp}${form.speed ? " · " + esc(form.speed) : ""}<br>${esc(form.attack || spirit.attack)}${stats.rendDamage?" ("+esc(stats.rendDamage)+" at this slot)":""}${form.rules ? "<br>" + esc(form.rules) : ""}</p>`;
    }).join("")}
    ${spirit.additional?`<p>${esc(spirit.additional)}</p>`:""}
    ${spirit.source?`<p class="hint">Source: ${esc(spirit.source)} · Wizards of the Coast LLC · <a href="https://www.dndbeyond.com/srd" target="_blank" rel="noopener noreferrer">SRD</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Choose resistances and resolve attacks manually.</p>`:""}
  </details>`;
}
