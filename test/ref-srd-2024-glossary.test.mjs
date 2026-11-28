import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildRevisedGlossary} from "../tools/ref-srd-2024-glossary.mjs";
const source=JSON.parse(readFileSync(new URL("../data/srd-2024-glossary.json",import.meta.url),"utf8"));
test("all 155 unique revised SRD glossary definitions preserve exact archived text, provenance and edition",()=>{
 const rows=buildRevisedGlossary(source);
 assert.equal(rows.length,155);
 for(let i=0;i<rows.length;i++){const r=rows[i],s=source.entries[i];assert.equal(r.srdGlossary.text,s.text);assert.equal(r.srdGlossary.id,s.id);assert.equal(r.ed,"2024");assert.equal(r.kind,"Other rules");assert.equal(r.page,s.page);assert.equal(r.pageEnd,s.pageEnd);}
 const get=n=>rows.find(x=>x.name===n).srdGlossary.text.replace(/\s+/g," ");
 assert.match(get("Exhaustion [Condition]"),/2 times your Exhaustion level/);
 assert.match(get("Exhaustion [Condition]"),/5 times your Exhaustion level/);
 assert.match(get("Carrying Capacity"),/Str\. × 240 lb\./);
 assert.match(get("Breaking Objects"),/27 \(5d10\)/);
 assert.match(get("Unarmed Strike"),/8 plus your Strength modifier and Proficiency Bonus/);
 for(const change of [d=>d.entries.pop(),d=>d.entries[1].id=d.entries[0].id,d=>d.entries[1].name=d.entries[0].name,d=>d.entries[0].text="",d=>d.entries[0].page=175,d=>d.edition="2014"]){const d=structuredClone(source);change(d);assert.throws(()=>buildRevisedGlossary(d));}
});
