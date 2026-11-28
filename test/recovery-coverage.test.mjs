import test from "node:test";
import assert from "node:assert/strict";
import {recoveryCoverage,catalogRecoveryInventory} from "../tools/recovery-coverage.mjs";
test("all references accounted; edition/source differences and placeholders remain gaps",()=>{
 const refs=[{kind:"Spell",name:"Known",src:"phb-2014",srdSpell:"Known"},{kind:"Item",name:"Item",src:"dmg-2014",srd:"Item"},{kind:"Monster",name:"Beast",src:"book",ed:"2014"},{kind:"Monster",name:"Beast",src:"book",ed:"2024"},{kind:"Feat",name:"Gift",src:"book",sum:"Summary"},{kind:"Subclass",name:"Path",src:"book"},{kind:"Other rules",name:"Rule",src:"book"}];
 const report=recoveryCoverage(refs,{"extra-monsters":[{n:"Beast",src:"book",ed:"2024",traits:[["Test","A defined feature."]],actions:[["Attack","Deal 1 damage."]]}],"extra-options":[{kind:"subclass",name:"Path",src:"book",ed:"2014",features:[{d:"See page 7."}]}]});
 assert.equal(report.total,7);
 assert.deepEqual(report.rows.map(x=>x.status),["full_srd_spell_link","srd_item_link_equivalence_review","reference_only","same_source_payload_candidate","summary_only","same_source_payload_review","reference_only"]);
 assert.equal(report.rows[2].sameSourcePlayableCandidates,0);
 assert.equal(report.rows[3].sameSourcePlayableCandidates,1);
 assert.equal(Object.values(report.statuses).reduce((a,b)=>a+b,0),7);
});


test("cross-category inventory keeps source summaries, nested placeholders, duplicates and editions visible",()=>{
 const data={spells:{"2024":[{n:"Example",src:"book",d:"Rules",rulesSummary:true}]},items:{"2014":{eq:[{n:"Rope",d:"Equipment rules"}],mi:[]},"2024":{eq:[],mi:[]}},"extra-options":[{kind:"species",name:"Sample",src:"book",ed:"2024",desc:"Traits",subs:[{d:"See the sourcebook for complete rules."}]},{kind:"background",name:"Example",src:"book",ed:"2014",desc:"Details",feature:["Feature","Defined mechanics."]},{kind:"class",name:"Shared",src:"book",desc:"Class rules"}],"extra-spells":[{n:"Example",src:"book",ed:"2024",d:"Rules",shadow:true}]};
 const report=recoveryCoverage([{kind:"Spell",name:"Example",src:"book",ed:"2024"}],data);
 assert.equal(report.rows[0].status,"summary_only");
 assert.equal(report.rows[0].sameSourcePlayableCandidates,0);
 const inventory=catalogRecoveryInventory(data);
 assert.equal(inventory.total,7);
 assert.equal(inventory.rows.find(x=>x.name==="Sample").status,"source_or_mechanics_review");
 assert.equal(inventory.rows.find(x=>x.name==="Rope").kind,"Equipment");
 assert.equal(inventory.rows.filter(x=>x.name==="Shared").length,2);
 assert.equal(inventory.duplicateIdentities.length,1);
 assert.equal(inventory.duplicateIdentities[0].edition,"2024");
 assert.equal(inventory.counts.reduce((n,x)=>n+x.total,0),inventory.total);
 assert.ok(inventory.rows.every(x=>x.status!=="certified"));
});
