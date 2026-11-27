// SRD 5.2.1 (2024), Wizards of the Coast LLC, CC BY 4.0.
// https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf
// Preserve original item identities; these are open-rules replacements, not separate printing certifications.
export function correctRevisedItemTables(items){
 const rows=items["2024"].mi,fixes=new Map(),seen=new Set();
 const ranks={Common:0,Uncommon:1,Rare:2,"Very Rare":3,Legendary:4,"Rarity Varies":-1};
 const add=(n,d,r,att,cons,more={})=>fixes.set(n,{d,r,rk:ranks[r],att,cons,rulesSource:"SRD 5.2.1 (2024 rules)",...more});
 const str={Hill:[21,"Uncommon"],Frost:[23,"Rare"],Stone:[23,"Rare"],Fire:[25,"Rare"],Cloud:[27,"Very Rare"],Storm:[29,"Legendary"]};
 const rule="After drinking, your Strength becomes the indicated score for 1 hour unless your existing Strength is at least that score. The transparent liquid contains a luminous sliver resembling a giant's fingernail.";
 for(const [n,[s,r]] of Object.entries(str))add("Potion of "+n+" Giant Strength",rule+"\nStrength: "+s+".",r,"",true,{strengthScore:s});
 add("Potion of Giant Strength",rule+"\n"+Object.entries(str).map(([n,[s,r]])=>n+": "+s+" ("+r+")").join("\n"),"Rarity Varies","",true);
 const heals=[["Potion of Healing","2d4 + 2","Common"],["Potion of Greater Healing","4d4 + 4","Uncommon"],["Potion of Superior Healing","8d4 + 8","Rare"],["Potion of Supreme Healing","10d4 + 20","Very Rare"]];
 for(const [n,h,r] of heals)add(n,"Drinking restores "+h+" Hit Points. The red liquid glimmers when shaken.",r,"",true,{healingDice:h});
 add("Potions of Healing","Drinking restores Hit Points according to potency. The red liquid glimmers when shaken.\n"+heals.map(([n,h,r])=>n+": "+h+" HP ("+r+")").join("\n"),"Rarity Varies","",true);
 add("Potion of Heroism","Drinking grants 10 Temporary Hit Points for 1 hour and the effect of Bless for that duration without Concentration. The blue liquid bubbles as if boiling.","Rare","",true);
 add("Potion of Invulnerability","For 1 minute after drinking, you have Resistance to all damage. The syrupy liquid resembles molten iron.","Rare","",true);
 add("Potion of Longevity","Drinking reduces physical age by 1d6 + 6 years (minimum 13). Each subsequent use has a cumulative 10 percent chance of increasing age by 1d6 + 6 years instead. A tiny beating heart suspended in the amber liquid disappears when opened.","Very Rare","",true);
 add("Potion of Vitality","Drinking removes all Exhaustion levels and ends the Poisoned condition. For 24 hours, every Hit Point Die you spend restores its maximum Hit Points. The crimson liquid pulses with dim light.","Very Rare","",true);
 add("Bead of Nourishment","This tasteless gelatinous bead dissolves in your mouth and supplies the nourishment of one day's Rations.","Common","",true);
 add("Elixir of Health","Drinking cures all magical contagions and ends Blinded, Deafened, Paralyzed and Poisoned on you. Tiny red bubbles float in the clear liquid.","Rare","",true);
 add("Gloves of Thievery","These gloves are imperceptible when worn. While wearing them, add +5 to Dexterity (Sleight of Hand) checks.","Uncommon","",false);
 const carpetRule="Use a Magic action and the command word to make this carpet hover and fly. It follows your directions while within 30 feet of you. It can carry twice its normal capacity, but its flying speed is halved above normal capacity.";
 const carpets=[["3 ft. × 5 ft.",200,80,"01–20"],["4 ft. × 6 ft.",400,60,"21–55"],["5 ft. × 7 ft.",600,40,"56–80"],["6 ft. × 9 ft.",800,30,"81–100"]];
 for(const [n,c,s] of carpets)add("Carpet of Flying, "+n,carpetRule+"\nSize: "+n+"; normal capacity "+c+" lb.; Fly Speed "+s+" feet.","Very Rare","",false,{capacityLb:c,flySpeed:s});
 add("Carpet of Flying",carpetRule+"\nGM selects size or rolls d100:\n"+carpets.map(([n,c,s,d])=>d+": "+n+"; "+c+" lb.; "+s+" feet").join("\n"),"Very Rare","",false);
 const scales={Black:"Acid",Blue:"Lightning",Brass:"Fire",Bronze:"Lightning",Copper:"Acid",Gold:"Fire",Green:"Poison",Red:"Fire",Silver:"Cold",White:"Cold"};
 const scaleRule="Crafted from dragon scales, this Scale Mail grants +1 AC and Advantage on saves against Dragon breath weapons while worn. As a Magic action, sense the distance and direction of the nearest dragon of the same type within 30 miles; this property recharges at the next dawn.";
 for(const [n,d] of Object.entries(scales))add(n+" Dragon Scale Mail",scaleRule+"\nDragon type: "+n+". You have Resistance to "+d+" damage while wearing it.","Very Rare","Required",false,{resistanceType:d});
 add("Dragon Scale Mail",scaleRule+"\nYou have Resistance to the damage associated with its dragon type:\n"+Object.entries(scales).map(([n,d])=>n+": "+d).join("\n"),"Very Rare","Required",false);
 const gems={"Blue Sapphire":"Air Elemental",Emerald:"Water Elemental","Red Corundum":"Fire Elemental","Yellow Diamond":"Earth Elemental"};
 const gemRule="Break the gem as a Utilize action to summon the elemental; the gem loses its magic. The elemental appears in the nearest unoccupied space, understands your languages and obeys commands. It acts immediately after you on your Initiative count. It disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action.";
 for(const [n,m] of Object.entries(gems))add("Elemental Gem, "+n,gemRule+"\nSummoned creature: "+m+".","Uncommon","",true,{creatureDependency:m});
 add("Elemental Gem",gemRule+"\n"+Object.entries(gems).map(([n,m])=>n+": "+m).join("\n"),"Uncommon","",true);
 const bags={Gray:["Weasel","Giant Rat","Badger","Boar","Panther","Giant Badger","Dire Wolf","Giant Elk"],Rust:["Rat","Owl","Mastiff","Goat","Giant Goat","Giant Boar","Lion","Brown Bear"],Tan:["Jackal","Ape","Baboon","Axe Beak","Black Bear","Giant Weasel","Giant Hyena","Tiger"]};
 const bagRule="This bag appears empty but contains small fuzzy objects. With a Magic action, pull one out and throw it up to 20 feet; on landing, roll d8 on the color table to determine the creature. It is Friendly to you and allies and acts immediately after you on your Initiative count. As a Bonus Action, direct its movement and next action; without orders it acts according to its nature. It vanishes at next dawn or at 0 HP. After removing three objects, wait until next dawn to use the bag again.";
 const list=a=>a.map((n,i)=>(i+1)+". "+n).join("\n");
 for(const [n,a] of Object.entries(bags))add("Bag of Tricks, "+n,bagRule+"\n"+n+" d8 table:\n"+list(a),"Uncommon","",false,{creatureDependencies:a});
 add("Bag of Tricks",bagRule+"\n"+Object.entries(bags).map(([n,a])=>n+" d8 table:\n"+list(a)).join("\n\n"),"Uncommon","",false);
 const horns={Silver:[2,"None","Rare"],Brass:[3,"Proficiency with all Simple weapons","Rare"],Bronze:[4,"Training with all Medium armor","Very Rare"],Iron:[5,"Proficiency with all Martial weapons","Legendary"]};
 const hornRule="Blow the horn as a Magic action to summon Ysgard warrior spirits in unoccupied spaces within 60 feet. Each uses the Berserker stat block and has Immunity to Charmed and Frightened. Each returns to Ysgard after 1 hour or at 0 HP. The horn recharges after 7 days. If you meet its requirement, the spirits are Friendly to you and allies and follow commands; otherwise they attack you.";
 for(const [n,[num,req,r]] of Object.entries(horns))add("Horn of Valhalla, "+n,hornRule+"\nSummons "+num+" Berserkers. Requirement: "+req+".",r,"",false,{creatureDependency:"Berserker",summonCount:num});
 const golems={Clay:[30,65000],Flesh:[60,50000],Iron:[120,100000],Stone:[90,80000]};
 const golemRule="Only a spellcaster with at least two level 5 spell slots can decipher and use this manual. Another creature attempting to read it takes 6d6 Psychic damage. Work continuously for the indicated days with the manual at hand, resting no more than 8 hours a day, and pay the supply cost. When creation is complete the manual burns up. Sprinkle its ashes over the golem to animate it. The golem is under your control, understands your commands and obeys them; use its monster stat block.";
 for(const [n,[days,cost]] of Object.entries(golems))add("Manual of "+n+" Golems",golemRule+"\n"+n+" Golem: "+days+" days; "+cost+" GP.","Very Rare","",true,{creatureDependency:n+" Golem",creationDays:days,creationCostGp:cost});
 for(let n=1;n<=3;n++)add("+"+n+" Wand of the War Mage","While holding this attuned wand, add +"+n+" to spell attack rolls and ignore Half Cover on those rolls.",["Uncommon","Rare","Very Rare"][n-1],"Required by a spellcaster",false);
 const mi=rows.map(x=>{const v=fixes.get(x.n);if(!v||(x.src&&x.src!=="dmg-2024"))return x;if(seen.has(x.n))throw Error("Ambiguous revised table item "+x.n);seen.add(x.n);return {...x,...v};});
 if(seen.size!==fixes.size)throw Error("Missing revised table targets: "+[...fixes.keys()].filter(k=>!seen.has(k)).join(", "));
 return {...items,"2024":{...items["2024"],mi}};
}
