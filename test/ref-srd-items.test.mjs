import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {verifyLegacyItemArchive,correctLegacyItemMetadata,verifyAndAnnotateLegacyItemLinks} from "../tools/ref-srd-items.mjs";
import {joinSrdItems} from "../tools/ref-summaries.mjs";
const read=n=>JSON.parse(readFileSync(new URL("../data/"+n+".json",import.meta.url),"utf8"));
test("all concrete archived items and 359 canonical links; official rarities and all healing variants",()=>{
 const raw=read("items"),items=correctLegacyItemMetadata(raw);
 assert.equal(verifyLegacyItemArchive(raw).concreteItems,341);
 assert.deepEqual(items["2024"],raw["2024"]);
 assert.deepEqual(items["2014"].mi.map(x=>x.n),raw["2014"].mi.map(x=>x.n));
 const a=items["2014"].mi.find(x=>x.n==="Staff of Swarming Insects"),b=items["2014"].mi.find(x=>x.n==="Staff of the Python");
 assert.equal(a.r,"Rare");assert.equal(a.rk,2);assert.match(a.type,/^Staff, rare/);
 assert.equal(b.r,"Uncommon");assert.equal(b.rk,1);assert.match(b.type,/^Staff, uncommon/);
 const refs=verifyAndAnnotateLegacyItemLinks(joinSrdItems(read("book-references"),read("reference-srd-items"),new Set(raw["2014"].mi.filter(x=>!x.src).map(x=>x.n))),items);
 assert.equal(refs.filter(x=>x.srdItemArchiveVerified).length,359);
 assert.equal(refs.find(x=>x.name==="Potions of Healing").srdVariants.length,4);
 assert.throws(()=>verifyAndAnnotateLegacyItemLinks([{...refs.find(x=>x.srd),ed:"2024"}],items));
});
