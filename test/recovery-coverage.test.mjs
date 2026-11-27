import test from "node:test";
import assert from "node:assert/strict";
import {recoveryCoverage} from "../tools/recovery-coverage.mjs";
test("all references accounted; edition/source differences and placeholders remain gaps",()=>{
 const refs=[{kind:"Spell",name:"Known",src:"phb-2014",srdSpell:"Known"},{kind:"Item",name:"Item",src:"dmg-2014",srd:"Item"},{kind:"Monster",name:"Beast",src:"book",ed:"2014"},{kind:"Monster",name:"Beast",src:"book",ed:"2024"},{kind:"Feat",name:"Gift",src:"book",sum:"Summary"},{kind:"Subclass",name:"Path",src:"book"},{kind:"Other rules",name:"Rule",src:"book"}];
 const report=recoveryCoverage(refs,{"extra-monsters":[{n:"Beast",src:"book",ed:"2024",traits:[["Test","A defined feature."]],actions:[["Attack","Deal 1 damage."]]}],"extra-options":[{kind:"subclass",name:"Path",src:"book",ed:"2014",features:[{d:"See page 7."}]}]});
 assert.equal(report.total,7);
 assert.deepEqual(report.rows.map(x=>x.status),["full_srd_spell_link","srd_item_link_equivalence_review","reference_only","same_source_payload_candidate","summary_only","same_source_payload_review","reference_only"]);
 assert.equal(report.rows[2].sameSourcePlayableCandidates,0);
 assert.equal(report.rows[3].sameSourcePlayableCandidates,1);
 assert.equal(Object.values(report.statuses).reduce((a,b)=>a+b,0),7);
});
