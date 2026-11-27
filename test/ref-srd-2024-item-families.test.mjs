import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {correctRevisedItemVariants} from "../tools/ref-srd-2024-item-variants.mjs";
import {correctRevisedItemTables} from "../tools/ref-srd-2024-item-tables.mjs";
import {correctRevisedItemFamilies} from "../tools/ref-srd-2024-item-families.mjs";
const second=correctRevisedItemTables(correctRevisedItemVariants(JSON.parse(readFileSync(new URL("../data/items.json",import.meta.url)))));

test("family recovery preserves identity and leaves other records untouched",()=>{
 const a=correctRevisedItemFamilies(second),b=second["2024"].mi,c=a["2024"].mi;
 assert.equal(a["2014"],second["2014"]);assert.equal(a["2024"].eq,second["2024"].eq);
 assert.deepEqual(c.map(x=>[x.n,x.src,x.page]),b.map(x=>[x.n,x.src,x.page]));
 assert.equal(c.filter((x,i)=>x!==b[i]).length,26);
 assert.equal(b.filter(x=>x.d.includes("See the sourcebook")).length-c.filter(x=>x.d.includes("See the sourcebook")).length,23);
});
test("plane-specific ring charge tables preserve zero cost and correct effects",()=>{
 const a=correctRevisedItemFamilies(second)["2024"].mi,g=n=>a.find(x=>x.n===n);
 for(const [plane,spell,cost] of [["Air","Feather Fall",0],["Air","Chain Lightning",3],["Earth","Earthquake",5],["Fire","Fire Storm",4],["Water","Tsunami",5]]){
 const x=g("Ring of Elemental Command ("+plane+")");assert.equal(x.spellChargeCosts[spell],cost);assert.equal(x.spellSaveDC,18);assert.equal(x.maxCharges,5);
 }
 assert.match(g("Ring of Elemental Command (Fire)").d,/Immunity to Fire/);assert.match(g("Ring of Elemental Command (Water)").d,/60 feet/);
 assert.match(g("Ring of Elemental Command (Earth)").d,/nearest unoccupied space/);assert.match(g("Ring of Elemental Command (Air)").d,/hover/);
});
test("figurines and feather tokens preserve individual variants and exceptions",()=>{
 const a=correctRevisedItemFamilies(second)["2024"].mi,g=n=>a.find(x=>x.n===n),fig=n=>g("Figurine of Wondrous Power, "+n),token=n=>g("Quaal's Feather Token, "+n);
 assert.match(fig("Ebony Fly").d,/HP 19 \(3d10 \+ 3\)/);assert.match(fig("Ebony Fly").d,/Fly 60 ft/);
 assert.match(fig("Ivory Goats").d,/24 charges/);assert.match(fig("Ivory Goats").d,/30 days/);
 assert.match(fig("Obsidian Steed").d,/10 percent/);assert.match(fig("Silver Raven").d,/Animal Messenger/);
 assert.ok(!fig("Bronze Griffon").d.includes("Giant Fly"));
 for(const n of ["Anchor","Bird","Fan","Swan Boat","Tree","Whip"])assert.equal(token(n).cons,true);
 assert.match(token("Bird").d,/1,000 pounds/);assert.match(token("Whip").d,/1d6 \+ 5 Force/);
 assert.match(g("Feather Token").d,/91–100 Whip/);
 assert.match(g("Cloak of Invisibility").d,/1d3/);assert.match(g("Sending Stones").d,/next dawn/);
 assert.match(g("Sentinel Shield").d,/Initiative/);assert.equal(g("Rod of Resurrection").spellChargeCosts.Resurrection,5);
});
