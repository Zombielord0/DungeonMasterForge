import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {correctRevisedItemEquipment} from "../tools/ref-srd-2024-item-equipment.mjs";
const raw=JSON.parse(readFileSync(new URL("../data/items.json",import.meta.url)));

test("exact revised equipment identities preserved; manual effects not claimed as automated",()=>{
 const result=correctRevisedItemEquipment(raw),a=raw["2024"].mi,b=result["2024"].mi;
 assert.equal(result["2014"],raw["2014"]);assert.equal(result["2024"].eq,raw["2024"].eq);
 assert.deepEqual(a.map(x=>[x.n,x.src,x.page]),b.map(x=>[x.n,x.src,x.page]));
 assert.equal(b.filter((x,i)=>x!==a[i]).length,3);
 for(const x of b.filter((x,i)=>x!==a[i])){assert.ok(!x.d.includes("See the sourcebook"));assert.equal(x.manualEffects,true);assert.equal(x.rulesSource,"SRD 5.2.1 (2024 rules)");}
});
test("reaction AC is conditional, shield field uses concentration, greatclub preserves saves",()=>{
 const a=correctRevisedItemEquipment(raw)["2024"].mi,g=n=>a.find(x=>x.n===n);
 assert.equal(g("Quarterstaff of the Acrobat").rulesSourcePage,237);assert.match(g("Quarterstaff of the Acrobat").d,/Short or Long Rest/);assert.match(g("Quarterstaff of the Acrobat").d,/30\/120 feet/);
 assert.equal(g("Shield of the Cavalier").rulesSourcePage,243);assert.match(g("Shield of the Cavalier").d,/2d6 \+ 2 \+ your Strength modifier/);assert.match(g("Shield of the Cavalier").d,/Concentration up to 1 minute/);
 assert.equal(g("Thunderous Greatclub").rulesSourcePage,249);assert.match(g("Thunderous Greatclub").d,/DC 15 Strength/);assert.match(g("Thunderous Greatclub").d,/DC 20 Dexterity/);assert.match(g("Thunderous Greatclub").d,/DC 20 Constitution/);assert.match(g("Thunderous Greatclub").d,/50 Bludgeoning/);
});
