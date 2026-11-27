import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {correctRevisedItemVariants} from "../tools/ref-srd-2024-item-variants.mjs";
const raw=JSON.parse(readFileSync(new URL("../data/items.json",import.meta.url)));
test("revised variants filled in place; legacy and ordinary equipment untouched",()=>{
 const out=correctRevisedItemVariants(raw);
 assert.equal(out["2014"],raw["2014"]);assert.equal(out["2024"].eq,raw["2024"].eq);
 assert.deepEqual(out["2024"].mi.map(x=>[x.n,x.src,x.page]),raw["2024"].mi.map(x=>[x.n,x.src,x.page]));
 const changed=out["2024"].mi.filter((x,i)=>x!==raw["2024"].mi[i]);
 assert.equal(changed.length,56);
 assert.ok(changed.every(x=>!x.d.includes("See the sourcebook")&&x.rulesSource==="SRD 5.2.1 (2024 rules)"));
 assert.equal(raw["2024"].mi.filter(x=>x.d.includes("See the sourcebook")).length-out["2024"].mi.filter(x=>x.d.includes("See the sourcebook")).length,51);
});
test("all ten scroll levels use correct DC and attack bonus",()=>{
 const out=correctRevisedItemVariants(raw)["2024"].mi;
 for(const [i,dc] of [13,13,13,15,15,17,17,18,18,19].entries()){
  const x=out.find(x=>x.n===(i?"Spell Scroll (Level "+i+")":"Spell Scroll (Cantrip)"));
  assert.equal(x.scrollSaveDC,dc);assert.equal(x.scrollAttackBonus,[5,5,5,7,7,9,9,10,10,11][i]);assert.equal(x.scrollLevel,i);assert.match(x.d,/normal casting time/);assert.match(x.d,/Intelligence \(Arcana\)/);
 }
});
test("2024 item variants use their revised rules",()=>{
 const out=correctRevisedItemVariants(raw)["2024"].mi,get=n=>out.find(x=>x.n===n);
 assert.match(get("Ioun Stone, Reserve").d,/up to 4 levels of spells/);
 assert.match(get("Ioun Stone, Greater Absorption").d,/20 levels of spells/);
 assert.match(get("Ioun Stone, Regeneration").d,/15 Hit Points/);
 assert.match(get("Belt of Storm Giant Strength").d,/29/);
 assert.equal(get("Ring of Fire Resistance").att,"");
 assert.match(get("Ring of Fire Resistance").d,/garnet/);
 assert.match(get("Potion of Fire Resistance").d,/1 hour/);
 assert.match(get("Ring of Resistance").d,/Thunder — Spinel/);
});
