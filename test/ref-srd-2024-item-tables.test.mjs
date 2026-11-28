import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {correctRevisedItemVariants} from "../tools/ref-srd-2024-item-variants.mjs";
import {correctRevisedItemTables} from "../tools/ref-srd-2024-item-tables.mjs";
const first=correctRevisedItemVariants(JSON.parse(readFileSync(new URL("../data/items.json",import.meta.url))));

test("table repairs preserve all existing catalog identities and other editions",()=>{
 const out=correctRevisedItemTables(first),a=out["2024"].mi,b=first["2024"].mi;
 assert.equal(out["2014"],first["2014"]);assert.equal(out["2024"].eq,first["2024"].eq);
 assert.deepEqual(a.map(x=>[x.n,x.src,x.page]),b.map(x=>[x.n,x.src,x.page]));
 assert.equal(a.filter((x,i)=>x!==b[i]).length,55);
 assert.equal(b.filter(x=>x.d.includes("See the sourcebook")).length-a.filter(x=>x.d.includes("See the sourcebook")).length,48);
 assert.ok(a.filter((x,i)=>x!==b[i]).every(x=>!x.d.includes("See the sourcebook")&&x.rulesSource==="SRD 5.2.1 (2024 rules)"));
});
test("potion strength, healing, and heroism match their own rule tables",()=>{
 const m=correctRevisedItemTables(first)["2024"].mi,g=n=>m.find(x=>x.n===n);
 for(const [n,s,r] of [["Hill",21,"Uncommon"],["Frost",23,"Rare"],["Stone",23,"Rare"],["Fire",25,"Rare"],["Cloud",27,"Very Rare"],["Storm",29,"Legendary"]]){const x=g("Potion of "+n+" Giant Strength");assert.equal(x.strengthScore,s);assert.equal(x.r,r);assert.match(x.d,/1 hour/);assert.ok(!x.d.includes("Bless"));}
 assert.match(g("Potion of Heroism").d,/10 Temporary Hit Points/);assert.match(g("Potion of Heroism").d,/Bless/);
 assert.ok(!g("Potion of Heroism").d.includes("Gaseous Form"));assert.equal(g("Potion of Supreme Healing").healingDice,"10d4 + 20");
 assert.match(g("Potion of Vitality").d,/24 hours/);assert.match(g("Gloves of Thievery").d,/Sleight of Hand/);
});
test("equipment tables specify correct capacity, creature, cost, and resistance",()=>{
 const m=correctRevisedItemTables(first)["2024"].mi,g=n=>m.find(x=>x.n===n);
 for(const [n,c,s] of [["3 ft. × 5 ft.",200,80],["4 ft. × 6 ft.",400,60],["5 ft. × 7 ft.",600,40],["6 ft. × 9 ft.",800,30]]){assert.equal(g("Carpet of Flying, "+n).capacityLb,c);assert.equal(g("Carpet of Flying, "+n).flySpeed,s);}
 for(const [n,d] of Object.entries({Black:"Acid",Blue:"Lightning",Brass:"Fire",Bronze:"Lightning",Copper:"Acid",Gold:"Fire",Green:"Poison",Red:"Fire",Silver:"Cold",White:"Cold"}))assert.equal(g(n+" Dragon Scale Mail").resistanceType,d);
 for(const n of ["Gray","Rust","Tan"])assert.equal(g("Bag of Tricks, "+n).creatureDependencies.length,8);
 assert.equal(g("Elemental Gem, Blue Sapphire").creatureDependency,"Air Elemental");assert.equal(g("Horn of Valhalla, Iron").summonCount,5);
 assert.equal(g("Manual of Iron Golems").creationCostGp,100000);assert.match(g("+3 Wand of the War Mage").d,/Half Cover/);
});
