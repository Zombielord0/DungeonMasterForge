// Original mechanical paraphrases, not a copy of sourcebook prose.
// Secondary references are not primary-source certification.
export const SUBCLASS_POINTER_RECOVERY={
  "reference-bgg-barbarian-path-of-the-giant": {
    "url": "https://dnd5e.wikidot.com/barbarian:giant",
    "desc": "Channel elemental might into giant-sized transformations and returning thrown weapons.",
    "features": [
      [
        3,
        "Giant Power",
        "Learn Giant; if already known, learn another language. Choose Druidcraft or Thaumaturgy as a cantrip using Wisdom."
      ],
      [
        3,
        "Giant's Havoc",
        "During Rage, Strength-based thrown weapon hits also gain Rage Damage. Your reach grows by 5 feet, and you and worn gear become Large if smaller and space permits."
      ],
      [
        6,
        "Elemental Cleaver",
        "Upon raging, infuse one held weapon with Acid, Cold, Fire, Lightning or Thunder. While you wield it during Rage, convert its damage to that type, add 1d6 on hits, and give it thrown ranges 20/60 feet. After throwing, it returns immediately after a hit or miss. Another wielder suppresses the benefits. While raging and holding it, change the element as a Bonus Action."
      ],
      [
        10,
        "Mighty Impel",
        "While raging, use a Bonus Action to move one Medium or smaller creature within your reach to a visible unoccupied space within 30 feet of you. An unwilling target can resist with a Strength save, DC 8 + proficiency + Strength modifier. Unsupported targets fall normally and land Prone."
      ],
      [
        14,
        "Demiurgic Colossus",
        "When raging, extend reach by 10 feet instead of 5, optionally grow to Large or Huge, and allow Mighty Impel against Large or smaller creatures. Elemental Cleaver adds 2d6 instead of 1d6."
      ]
    ]
  },
  "reference-scag-barbarian-path-of-the-battlerager": {
    "url": "https://dnd5e.wikidot.com/barbarian:battlerager",
    "desc": "A close-quarters warrior who uses spiked armor as a weapon while raging.",
    "features": [
      [
        3,
        "Battlerager Armor",
        "While wearing spiked armor during Rage, use a Bonus Action for one melee weapon attack with its spikes, reach 5 feet. Use Strength for attack and damage; base damage is 1d4 Piercing. A successful grapple using the Attack action additionally deals 3 Piercing damage."
      ],
      [
        3,
        "Restriction—Dwarves Only",
        "The Forgotten Realms restricts this path to dwarves. The DM may waive this requirement for their setting."
      ],
      [
        6,
        "Reckless Abandon",
        "Using Reckless Attack during Rage grants temporary HP equal to Constitution modifier, minimum 1. Any of these temporary HP still remaining disappear when that Rage ends."
      ],
      [
        10,
        "Battlerager Charge",
        "During Rage you may Dash as a Bonus Action."
      ],
      [
        14,
        "Spiked Retribution",
        "A creature within 5 feet that lands a melee attack on you suffers 3 Piercing damage if you are raging, wearing spiked armor and not Incapacitated."
      ]
    ]
  },
  "reference-scag-fighter-purple-dragon-knight-banneret": {
    "url": "https://dndroll.wikidot.com/fighter:banneret",
    "desc": "A martial leader who shares the benefits of Second Wind, Action Surge and Indomitable with nearby allies.",
    "features": [
      [
        3,
        "Rallying Cry",
        "On using Second Wind, choose up to three allies within 60 feet who can see or hear you. Each heals HP equal to your Fighter level."
      ],
      [
        3,
        "Restriction: Knighthood",
        "In the Forgotten Realms this archetype represents Cormyrean knighthood. Use Banneret as its generic title in other settings."
      ],
      [
        7,
        "Royal Envoy",
        "Gain Persuasion proficiency; if already proficient, instead select Animal Handling, Insight, Intimidation or Performance. Regardless of that selection, double your proficiency bonus for Persuasion checks."
      ],
      [
        10,
        "Inspiring Surge",
        "When using Action Surge, choose one ally within 60 feet who can see or hear you. That ally can use its Reaction for one weapon attack (melee or ranged)."
      ],
      [
        15,
        "Bulwark",
        "When you use Indomitable on an Intelligence, Wisdom or Charisma save while not Incapacitated, select one ally within 60 feet who failed a save against the same effect and can see or hear you. That ally may reroll, using the new result."
      ],
      [
        18,
        "Inspiring Surge",
        "Your level-10 Inspiring Surge can now affect two eligible allies instead of one."
      ]
    ]
  },
  "reference-scag-monk-way-of-the-long-death": {
    "url": "https://dnd5e.wikidot.com/monk:long-death",
    "desc": "A monk who converts nearby deaths into vitality, inspires fear and uses ki to avoid death or deliver necrotic power.",
    "features": [
      [
        3,
        "Touch of Death",
        "When you personally reduce a creature within 5 feet to 0 HP, gain temporary HP equal to your Monk level plus Wisdom modifier (at least 1)."
      ],
      [
        6,
        "Hour of Reaping",
        "Use an Action: every creature within 30 feet able to see you makes a Wisdom save against your ki DC or becomes Frightened of you until your next turn ends."
      ],
      [
        11,
        "Mastery of Death",
        "When you would be reduced to 0 HP, spend 1 ki point without taking an action to remain at 1 HP instead."
      ],
      [
        17,
        "Touch of the Long Death",
        "Use an Action to touch a creature within 5 feet and pay 1–10 ki points. It makes a Constitution save against your ki DC, taking 2d10 Necrotic damage per point paid on failure or half on success."
      ]
    ]
  }
};
export function recoverSubclassPointers(data){
 const seen=new Set();
 const result=data.map(x=>{
  const rec=SUBCLASS_POINTER_RECOVERY[x.id];if(!rec)return x;
  if(x.kind!=="subclass"||x.ed!=="2014"||!x.features?.length||seen.has(x.id))throw Error("Invalid subclass recovery target "+x.id);
  const key=f=>JSON.stringify([+f.l,f.n]);
  const replacement=new Map(rec.features.map(([l,n,d])=>[key({l,n}),d]));
  if(replacement.size!==x.features.length||x.features.some(f=>!replacement.has(key(f))||!/^See\s/.test(f.d||"")))throw Error("Subclass source feature mismatch "+x.id);
  seen.add(x.id);
  return {...x,desc:rec.desc,features:x.features.map(f=>({...f,d:replacement.get(key(f))})),featureSourceReview:{status:"secondary_mechanics_candidate",reference:rec.url,primaryVerified:false}};
 });
 if(seen.size!==Object.keys(SUBCLASS_POINTER_RECOVERY).length)throw Error("Missing subclass recovery target");
 return result;
}
