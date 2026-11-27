// SRD 5.2.1, Wizards of the Coast LLC, CC BY 4.0.
// https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf
// Same-edition open rules; retain original catalog/source identity and do not certify book printing.
export function correctRevisedItemFamilies(items){
 const rows=items["2024"].mi,fixes=new Map(),seen=new Set();
 const ranks={Uncommon:1,Rare:2,"Very Rare":3,Legendary:4,"Rarity Varies":-1};
 const add=(n,d,r,att="",cons=false,extra={})=>fixes.set(n,{d,r,rk:ranks[r],att,cons,rulesSource:"SRD 5.2.1 (2024 rules)",...extra});
 const parent=n=>{const a=rows.filter(x=>x.n===n&&!x.src);if(a.length!==1)throw Error("Missing or ambiguous parent "+n);return a[0].d;};
 const shared="While wearing this attuned ring, you have Advantage on attacks against Elementals, and Elementals have Disadvantage on attacks against you. As a Magic action, choose a visible Elemental within 60 feet. It makes a DC 18 Wisdom save. On failure, it is Charmed until the start of your next turn, and you decide its movement and action on its next turn. The ring has 5 charges and restores 1d4 + 1 expended charges at dawn each day. While wearing it, you can cast the spells listed for its linked plane, using save DC 18 and the indicated charges.";
 const rings={
  Air:["Know Auran, resist Lightning damage, and gain a Fly Speed equal to your Speed with the ability to hover.",{"Chain Lightning":3,"Feather Fall":0,"Gust of Wind":2,"Wind Wall":1}],
  Earth:["Know Terran and resist Acid damage. Rubble, rocks and dirt are not Difficult Terrain for you. You may pass through solid earth or rock as Difficult Terrain without disturbing it. If you finish your turn inside it, you are moved back to the nearest unoccupied space you last occupied.",{"Earthquake":5,"Stone Shape":2,"Stoneskin":3,"Wall of Stone":3}],
  Fire:["Know Ignan and have Immunity to Fire damage.",{"Burning Hands":1,Fireball:2,"Fire Storm":4,"Wall of Fire":3}],
  Water:["Know Aquan, have a Swim Speed of 60 feet, and can breathe underwater.",{"Create or Destroy Water":1,"Ice Storm":2,Tsunami:5,"Wall of Ice":3,"Water Walk":2}]
 };
 const ringText=(plane,[focus,spells])=>plane+": "+focus+"\nSpells (charges): "+Object.entries(spells).map(([n,c])=>n+" ("+c+")").join(", ")+".";
 for(const [plane,data] of Object.entries(rings))add("Ring of Elemental Command ("+plane+")",shared+"\n\n"+ringText(plane,data),"Legendary","Required",false,{elementalPlane:plane,spellChargeCosts:data[1],maxCharges:5,spellSaveDC:18});
 add("Ring of Elemental Command","The GM selects or randomly determines the linked Elemental Plane.\n"+shared+"\n\n"+Object.entries(rings).map(([p,d])=>ringText(p,d)).join("\n\n"),"Legendary","Required",false);
 // Reuse already archived open-rules parent text, preserving each variant's limits.
 const fig=parent("Figurine of Wondrous Power").replaceAll("wouldappear","would appear").replaceAll("com-mands","commands").replaceAll("can'tbe","can't be").replaceAll("haspassed","has passed").replaceAll("goatmust","goat must").replaceAll("goat,any","goat, any").replaceAll("follows:Goat","follows:\nGoat").replaceAll("passed.Goat","passed.\nGoat");
 const marks=[...fig.matchAll(/^(Bronze Griffon|Ebony Fly|Golden Lions|Ivory Goats|Marble Elephant|Obsidian Steed|Onyx Dog|Serpentine Owl|Silver Raven) \((Uncommon|Rare|Very Rare)\)\. /gm)];
 if(marks.length!==9)throw Error("Unexpected figurine parent layout");
 const common=fig.slice(0,marks[0].index).trim(),figParts=[];
 const fly="Giant Fly: Large Beast, Unaligned. AC 11; Initiative +1 (11); HP 19 (3d10 + 3); Speed 30 ft., Fly 60 ft. STR 14 (+2), DEX 13 (+1), CON 13 (+1), INT 2 (-4), WIS 10 (+0), CHA 3 (-4); saving throw modifiers equal ability modifiers. Darkvision 60 ft.; Passive Perception 10; Languages none; CR 0 (0 XP, PB +2).";
 for(const [i,m] of marks.entries()){
  let effect=fig.slice(m.index+m[0].length,marks[i+1]?.index??fig.length).trim();
  if(m[1]==="Ebony Fly"){if(!effect.includes("Large Beast, Unaligned"))throw Error("Missing embedded Giant Fly");effect=effect.split("Large Beast, Unaligned")[0].trim()+"\n\n"+fly;}
  const detail=m[1]+" ("+m[2]+"). "+effect;figParts.push(detail);
  add("Figurine of Wondrous Power, "+m[1],common+"\n\n"+detail,m[2]);
 }
 add("Figurine of Wondrous Power",common+"\n\n"+figParts.join("\n\n"),"Rarity Varies");
 const feather=parent("Feather Token").replaceAll("next24","next 24").replaceAll("cre-ates","creates").replaceAll("50-footlong","50-foot-long").replaceAll("takea","take a").replaceAll("dis-appears","disappears");
 const fm=[...feather.matchAll(/^(Anchor|Bird|Fan|Swan Boat|Tree|Whip) \((Uncommon|Rare)\)\. /gm)];
 if(fm.length!==6)throw Error("Unexpected feather token layout");
 const fc=feather.slice(0,fm[0].index).trim(),parts=[];
 for(const [i,m] of fm.entries()){
  const effect=feather.slice(m.index+m[0].length,fm[i+1]?.index??feather.length).split("Feather Tokens1d100")[0].trim();
  const d=m[1]+" ("+m[2]+"). "+effect;parts.push(d);
  add("Quaal's Feather Token, "+m[1],d,m[2],"",true);
 }
 add("Feather Token",fc+"\n\n"+parts.join("\n\n")+"\n\nRoll d100: 01–20 Anchor; 21–35 Bird; 36–50 Fan; 51–65 Swan Boat; 66–90 Tree; 91–100 Whip.","Rarity Varies","",true);
 add("Cloak of Invisibility","This attuned cloak has 3 charges, recovering 1d3 spent charges each dawn. While wearing it, take a Magic action to raise the hood and spend one charge to become Invisible for 1 hour. Lowering the hood (no action required) or removing the cloak ends the effect early.","Legendary","Required",false,{maxCharges:3});
 add("Sending Stones","The two stones have matching carvings. Touch either to cast Sending to the bearer of the other. If it has no bearer, you learn this immediately and no spell is cast. After either casts Sending, neither can do so until the next dawn. Destroying one makes the other nonmagical.","Uncommon");
 add("Sentinel Shield","This shield bears an eye emblem. While holding it, you have Advantage on Initiative rolls and Wisdom (Perception) checks.","Uncommon");
 add("Rod of Resurrection","This attuned rod has 5 charges. While holding it, expend 1 to cast Heal or 5 to cast Resurrection. It restores one expended charge at dawn each day. When its last charge is used, roll d20; on a 1 it vanishes in a harmless flash of light.","Legendary","Required",false,{maxCharges:5,spellChargeCosts:{Heal:1,Resurrection:5}});
 const mi=rows.map(x=>{const v=fixes.get(x.n);if(!v||(x.src&&x.src!=="dmg-2024"))return x;if(seen.has(x.n))throw Error("Ambiguous revised family target "+x.n);seen.add(x.n);return {...x,...v};});
 if(seen.size!==fixes.size)throw Error("Missing targets: "+[...fixes.keys()].filter(n=>!seen.has(n)).join(", "));
 return {...items,"2024":{...items["2024"],mi}};
}
