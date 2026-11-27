import test from "node:test";
import assert from "node:assert/strict";
import { appendReferenceSpells, validateRecoveryManifest, applyRecoveredContent, validateRecoveredBackgroundDependencies } from "../tools/recovered-content.mjs";
const books={fixture:{name:"Fixture"}}, reference={kind:"Spell",name:"Example",src:"fixture",ed:"2014",page:1,details:[["Level","1"]]};
const payload={n:"Example",src:"fixture",ed:"2014",l:1,s:"Evocation",c:["Wizard"],t:"1 action",r:"30 feet",cp:"V",m:"",du:"Instantaneous",co:0,ri:0,d:"One target takes 1 force damage.",h:"",dt:"Force",at:"",sv:""};
const entry={kind:"Spell",name:"Example",src:"fixture",ed:"2014",stableId:"cmp:example",action:"replace",releaseGate:"PASS",productionReady:true,review:{sourceVerified:true,mechanicsVerified:true,dependenciesVerified:true,runtimeVerified:true,distributionCleared:true,evidence:"Synthetic test only"},payload};
const manifest=e=>({version:1,entries:e});
test("opposite edition must not suppress a reference, but it stays browse only",()=>{const r=appendReferenceSpells([],{"2014":[],"2024":[{n:"Example"}]},[],[reference],{},books);assert.equal(r.added.length,1);assert.equal(r.added[0].referenceOnly,true);assert.equal(r.added[0].ed,"2014");});
test("preserve existing generated order and shared aliases",()=>{const r=appendReferenceSpells([{n:"Shared",aliases:["Alias"]}],{"2014":[],"2024":[{n:"Example"}]},[],[reference,{...reference,name:"Other"},{...reference,name:"Alias"}],{},books);assert.deepEqual(r.data.map(x=>x.n),["Shared","Other","Example"]);});
test("empty manifest accepts no records",()=>assert.deepEqual(validateRecoveryManifest(manifest([]),books),[]));
test("replacement preserves slot and other editions",()=>{const rows=[{n:"Before"},{n:"Example",src:"fixture",ed:"2014",ref:true},{n:"Example",src:"fixture",ed:"2024"}];const out=applyRecoveredContent("extra-spells",rows,validateRecoveryManifest(manifest([entry]),books),[reference]);assert.equal(out.length,3);assert.equal(out[1].recoveryId,entry.stableId);assert.equal(out[1].ref,undefined);assert.equal(out[0],rows[0]);assert.equal(out[2],rows[2]);});
test("blocked, uncleared, page-only, loading, and cross-edition payloads rejected",()=>{for(const row of [{...entry,releaseGate:"BLOCKED"},{...entry,review:{...entry.review,distributionCleared:false}},{...entry,payload:{...payload,d:"From Fixture, page 7."}},{...entry,payload:{...payload,d:"See sourcebook for the full rules."}},{...entry,payload:{...payload,d:"Loading Example"}},{...entry,payload:{...payload,ed:"2024"}}])assert.throws(()=>validateRecoveryManifest(manifest([row]),books));});
test("promotion requires an exact reference and no existing playable record",()=>{const p={...entry,action:"promote"};assert.equal(applyRecoveredContent("extra-spells",[],[p],[reference]).length,1);assert.throws(()=>applyRecoveredContent("extra-spells",[],[p],[]));assert.throws(()=>applyRecoveredContent("extra-spells",[payload],[p],[reference]));});
test("shared or ambiguous replacement fails",()=>{assert.throws(()=>applyRecoveredContent("extra-spells",[{...payload,ed:undefined}],[entry],[reference]));assert.throws(()=>applyRecoveredContent("extra-spells",[payload,payload],[entry],[reference]));});

test("legacy background promotion requires complete fields, preserves identity and validates exact playable spell dependencies",()=>{
 const bg={kind:"Background",name:"Fixture Guild",src:"fixture",ed:"2014",stableId:"cmp:bg",action:"promote",releaseGate:"PASS",productionReady:true,review:entry.review,payload:{kind:"background",name:"Fixture Guild",src:"fixture",ed:"2014",id:"fixture-bg",book:true,skills:["Arcana","Investigation"],desc:"Synthetic background description.",feature:["Fixture feature","Synthetic feature mechanics."],tools:"",lang:"One language",gearItems:["Notebook"],gp:5,choices:[],spellListExtensions:[{name:"Example",src:"fixture",level:1}]}};
 const refs=[{kind:"Background",name:bg.name,src:bg.src,ed:bg.ed}];
 const accepted=validateRecoveryManifest(manifest([bg]),books);
 const result=applyRecoveredContent("extra-options",[],accepted,refs);
 assert.equal(result[0].id,bg.payload.id);assert.equal(result[0].recoveryId,bg.stableId);
 assert.throws(()=>applyRecoveredContent("extra-options",[{...bg.payload,src:"other",id:"different"}],accepted,refs));
 assert.throws(()=>validateRecoveryManifest(manifest([{...bg,payload:{...bg.payload,feature:["Fixture","See page 7."]}}]),books));
 assert.throws(()=>validateRecoveryManifest(manifest([{...bg,releaseGate:"BLOCKED"}]),books));
 validateRecoveredBackgroundDependencies(accepted,{spells:{"2014":[payload]}});
 for(const bad of [{...payload,ref:true},{...payload,src:"other"},{...payload,l:2},{...payload,rulesSummary:true}])assert.throws(()=>validateRecoveredBackgroundDependencies(accepted,{spells:{"2014":[bad]}}));
 assert.throws(()=>validateRecoveredBackgroundDependencies(accepted,{spells:{"2024":[payload]}}));
 assert.throws(()=>validateRecoveredBackgroundDependencies(accepted,{spells:{"2014":[payload,payload]}}));
});

test("structured background selection schema rejects invalid counts, duplicate values and unknown effects",()=>{
 const bg={...entry,kind:"Background",name:"Fixture Guild",action:"promote",payload:{kind:"background",name:"Fixture Guild",src:"fixture",ed:"2014",id:"fixture-bg",book:true,skills:["Arcana","Insight"],desc:"Synthetic fixture.",feature:["Feature","Synthetic mechanics."],tools:"",lang:"Choose two languages.",gearItems:["Book"],gp:0,choices:[{id:"language",label:"Language",rules:"Choose two.",selection:{effect:"language",count:2,options:["Elvish","Dwarvish","Giant"]}}]}};
 assert.equal(validateRecoveryManifest(manifest([bg]),books).length,1);
 for(const bad of [{effect:"language",count:4,options:["Elvish"]},{effect:"language",count:1,options:["Elvish","Elvish"]},{effect:"spell",count:1,options:["Example"]}]){
  assert.throws(()=>validateRecoveryManifest(manifest([{...bg,payload:{...bg.payload,choices:[{...bg.payload.choices[0],selection:bad}]}}]),books));
 }
});

test("open language and deferred equipment choice schema",()=>{
 const bg={...entry,kind:"Background",name:"Fixture Guild",action:"promote",payload:{kind:"background",name:"Fixture Guild",src:"fixture",ed:"2014",id:"fixture-bg",book:true,skills:["Arcana","Insight"],desc:"Synthetic fixture.",feature:["Feature","Synthetic mechanics."],tools:"",lang:"Choose a language.",gearItems:["Book"],gp:5,deferStartingEquipment:true,choices:[{id:"language",label:"Language",rules:"Choose one.",selection:{effect:"language",count:1,open:true,options:[]}},{id:"tool",label:"Tool",rules:"Choose a tool.",selection:{effect:"tool",count:1,options:["Lute"],equipment:{Lute:"Lute"}}}]}};
 assert.equal(validateRecoveryManifest(manifest([bg]),books).length,1);
 assert.throws(()=>validateRecoveryManifest(manifest([{...bg,payload:{...bg.payload,deferStartingEquipment:undefined}}]),books));
 assert.throws(()=>validateRecoveryManifest(manifest([{...bg,payload:{...bg.payload,choices:[{...bg.payload.choices[1],selection:{...bg.payload.choices[1].selection,open:true}}]}}]),books));
 assert.throws(()=>validateRecoveryManifest(manifest([{...bg,payload:{...bg.payload,choices:[{...bg.payload.choices[1],selection:{...bg.payload.choices[1].selection,equipment:{}}}]}}]),books));
});
