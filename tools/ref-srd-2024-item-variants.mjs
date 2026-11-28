// Revised SRD 5.2.1, Wizards of the Coast LLC, CC BY 4.0.
// https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf
// Original DMG source labels remain; this is a same-edition open-rules replacement,
// not an independent verification of the original book printing.
const giants={Hill:[21,"Rare"],Frost:[23,"Very Rare"],Stone:[23,"Very Rare"],Fire:[25,"Very Rare"],Cloud:[27,"Legendary"],Storm:[29,"Legendary"]};
const gems={Acid:"Pearl",Cold:"Tourmaline",Fire:"Garnet",Force:"Sapphire",Lightning:"Citrine",Necrotic:"Jet",Poison:"Amethyst",Psychic:"Jade",Radiant:"Topaz",Thunder:"Spinel"};
const scrolls=[[13,5,"Common"],[13,5,"Common"],[13,5,"Uncommon"],[15,7,"Uncommon"],[15,7,"Rare"],[17,9,"Rare"],[17,9,"Very Rare"],[18,10,"Very Rare"],[18,10,"Very Rare"],[19,11,"Legendary"]];
const scrollRules="A scroll contains one spell. Only a character with the spell on their spell list can decipher and cast it, using its normal casting time without Material components. Casting consumes the scroll; interruption does not. If the spell exceeds the level you can normally cast, make an ability check using your spellcasting ability (DC 10 + spell level). Failure destroys the spell without effect. A Wizard copying a Wizard spell into a spellbook makes an Intelligence (Arcana) check against DC 10 + spell level; success copies the spell, and the scroll is destroyed regardless of the check.";
const rank={Common:0,Uncommon:1,Rare:2,"Very Rare":3,Legendary:4};
export function correctRevisedItemVariants(items){
 const rows=items["2024"].mi, known=new Map(), seen=new Set();
 const add=(n,d,r,att,cons,more={})=>known.set(n,{d,r,rk:rank[r]??-1,att,cons,rulesSource:"SRD 5.2.1 (2024 rules)",...more});
 for(const [g,[s,r]] of Object.entries(giants))add("Belt of "+g+" Giant Strength","While wearing this attuned belt, your Strength becomes "+s+". It has no effect if your Strength without it is already "+s+" or greater.",r,"Required",false);
 for(const [t,gem] of Object.entries(gems)){
  add("Potion of "+t+" Resistance","Drinking this potion grants Resistance to "+t.toLowerCase()+" damage for 1 hour, consuming the potion.","Uncommon","",true);
  add("Ring of "+t+" Resistance","While wearing this ring set with "+gem.toLowerCase()+", you have Resistance to "+t.toLowerCase()+" damage.","Rare","",false);
 }
 // The existing open SRD parent contains all fourteen effects. Preserve its full
 // orbit, retrieval and attunement rules in each individual variant.
 const parent=rows.find(x=>x.n==="Ioun Stone"&&!x.src);
 if(!parent)throw Error("Missing revised Ioun Stone parent");
 const ioun=parent.d.replace("level 8or","level 8 or").replace("fromthe","from the");
 const marker=/^([A-Za-z ]+) \((Rare|Very Rare|Legendary)\)\. /gm;
 const marks=[...ioun.matchAll(marker)];
 if(marks.length!==14)throw Error("Incomplete Ioun Stone effects");
 const common=ioun.slice(0,marks[0].index).trim();
 for(const [i,m] of marks.entries()){
  const effect=ioun.slice(m.index+m[0].length,marks[i+1]?.index??ioun.length).trim();
  add("Ioun Stone, "+m[1],common+"\n\n"+m[1]+": "+effect,m[2],"Required",false);
 }
 add("Ioun Stone",ioun,"Rarity Varies","Required",false);
 for(const [l,[dc,a,r]] of scrolls.entries())add(l?"Spell Scroll (Level "+l+")":"Spell Scroll (Cantrip)",scrollRules+"\n\nSpell level: "+(l||"cantrip")+". Spell save DC "+dc+"; spell attack bonus +"+a+".",r,"",true,{scrollLevel:l,scrollSaveDC:dc,scrollAttackBonus:a});
 add("Stone of Good Luck","While carrying this attuned polished agate, gain a +1 bonus to ability checks and saving throws.","Uncommon","Required",false);
 add("Belt of Giant Strength","While wearing this attuned belt, your Strength becomes the value for its giant type, unless your unaided Strength is already at least that value.\n"+Object.entries(giants).map(([g,[s,r]])=>g+": "+s+" ("+r+")").join("\n"),"Rarity Varies","Required",false);
 add("Potion of Resistance","Drinking this potion grants Resistance to one damage type for 1 hour, consuming the potion. GM chooses or rolls d10:\n"+Object.keys(gems).map((t,i)=>(i+1)+". "+t).join("\n"),"Uncommon","",true);
 add("Ring of Resistance","While wearing this ring, you have Resistance to the damage type indicated by its gemstone. GM chooses or rolls d10:\n"+Object.entries(gems).map(([t,g],i)=>(i+1)+". "+t+" — "+g).join("\n"),"Rare","",false);
 add("Spell Scroll",scrollRules+"\n\n"+scrolls.map(([dc,a,r],l)=>(l||"Cantrip")+": "+r+", save DC "+dc+", attack +"+a).join("\n"),"Rarity Varies","",true);
 const mi=rows.map(x=>{const v=known.get(x.n);if(!v||(x.src&&x.src!=="dmg-2024"))return x;if(seen.has(x.n))throw Error("Ambiguous revised item "+x.n);seen.add(x.n);return {...x,...v};});
 if(seen.size!==known.size)throw Error("Missing revised item targets: "+[...known.keys()].filter(k=>!seen.has(k)).join(", "));
 return {...items,"2024":{...items["2024"],mi}};
}
