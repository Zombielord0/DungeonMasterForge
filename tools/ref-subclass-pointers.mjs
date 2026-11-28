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
