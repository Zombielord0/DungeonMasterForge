import test from "node:test";
import assert from "node:assert/strict";
import { appendReferenceSpells, validateRecoveryManifest, applyRecoveredContent, validateRecoveredBackgroundDependencies, applyRecoveredCoreItems, applyRecoveredCoreSpells, validateRecoveredCatalogDependencies } from "../tools/recovered-content.mjs";
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

test("denominated coins and cover guilds reject unsafe or missing contracts",()=>{
 const bg={...entry,kind:"Background",name:"Fixture Guild",action:"promote",payload:{kind:"background",name:"Fixture Guild",src:"fixture",ed:"2014",id:"fixture-bg",book:true,skills:["Arcana","Insight"],desc:"Synthetic fixture.",feature:["Feature","Synthetic mechanics."],tools:"",lang:"",gearItems:["Book"],gp:0,deferStartingEquipment:true,startingCoins:{pp:1},coverGuildChoice:"cover",coverGuilds:[{name:"Cover",src:"fixture"}],choices:[{id:"cover",label:"Cover",rules:"Choose one.",selection:{effect:"detail",count:1,options:["Cover"]}}]}};
 const approved=validateRecoveryManifest(manifest([bg]),books);
 assert.equal(approved.length,1);
 for(const startingCoins of [{pp:-1},{pp:1.5},{xx:1}])assert.throws(()=>validateRecoveryManifest(manifest([{...bg,payload:{...bg.payload,startingCoins}}]),books));
 assert.throws(()=>validateRecoveryManifest(manifest([{...bg,payload:{...bg.payload,gp:10}}]),books));
 assert.throws(()=>validateRecoveredBackgroundDependencies(approved,{"extra-options":[]}));
 validateRecoveredBackgroundDependencies(approved,{"extra-options":[{kind:"background",name:"Cover",src:"fixture",ed:"2014",book:true,recoveryId:"cmp:cover"}]});
 assert.throws(()=>validateRecoveredBackgroundDependencies(approved,{"extra-options":[{kind:"background",name:"Cover",src:"fixture",ed:"2014",book:true,recoveryId:"cmp:cover",coverGuilds:[]}]}));
});

test("reviewed core magic items replace exact slots, not supplemental rows",()=>{
 const item={...entry,kind:"Item",name:"Fixture Rod",ed:"2024",catalog:"core-items",stableId:"cmp:rod",payload:{n:"Fixture Rod",src:"fixture",ed:"2024",page:12,cat:"Rod",type:"Rod",r:"Rare",rk:2,att:"Required",cons:false,base:false,d:"Synthetic item: once each dawn, emit light for one minute.",manualEffects:true}};
 const legacy={eq:[],mi:[{n:item.name,src:item.src,page:12}]}, original={"2014":legacy,"2024":{eq:[{n:"Gear"}],mi:[{n:"Before"},{n:item.name,src:item.src,page:12,d:"See the sourcebook for complete rules."},{n:"After"}]}};
 const approved=validateRecoveryManifest(manifest([item]),books),out=applyRecoveredCoreItems(original,approved);
 assert.equal(out["2014"],legacy);assert.equal(out["2024"].eq,original["2024"].eq);
 assert.equal(out["2024"].mi.length,3);assert.equal(out["2024"].mi[0],original["2024"].mi[0]);assert.equal(out["2024"].mi[2],original["2024"].mi[2]);
 assert.equal(out["2024"].mi[1].recoveryId,item.stableId);assert.equal(out["2024"].mi[1].k,undefined);
 assert.deepEqual(applyRecoveredContent("extra-items",[],approved,[]),[]);
 assert.equal(applyRecoveredCoreItems(original,[]),original);
 for(const bad of [{...item,action:"promote"},{...item,catalog:"unknown"},{...item,releaseGate:"BLOCKED"},{...item,payload:{...item.payload,d:"Charges 4. See the sourcebook for complete rules."}},{...item,payload:{...item.payload,page:undefined}}])assert.throws(()=>validateRecoveryManifest(manifest([bad]),books));
 for(const bad of [{...item,payload:{...item.payload,page:13}},{...item,payload:{...item.payload,k:"new-key"}},{...item,payload:{...item.payload,id:"new-id"}}])assert.throws(()=>applyRecoveredCoreItems(original,[bad]));
 assert.throws(()=>applyRecoveredCoreItems(original,[{...item,name:"Missing"}]));
 assert.throws(()=>applyRecoveredCoreItems({...original,"2024":{...original["2024"],mi:[original["2024"].mi[1],original["2024"].mi[1]]}},approved));
});

test("approved core spell reconciliation preserves position, aliases and source-page identity",()=>{
 const core={...entry,catalog:"core-spells",payload:{...payload,page:"7",manualRoll:true,manualEffects:true}};
 const old={...payload,page:"7",aliases:["Saved Alias"]},other={n:"Other"},legacy={ "2014":[other,old], "2024":[old]};
 const approved=validateRecoveryManifest(manifest([core]),books),out=applyRecoveredCoreSpells(legacy,approved);
 assert.equal(out["2024"],legacy["2024"]);assert.equal(out["2014"][0],other);
 assert.equal(out["2014"].length,2);assert.equal(out["2014"][1].recoveryId,core.stableId);
 assert.deepEqual(out["2014"][1].aliases,["Saved Alias"]);assert.equal(out["2014"][1].manualRoll,true);
 assert.deepEqual(applyRecoveredContent("extra-spells",[],approved,[]),[]);
 assert.equal(applyRecoveredCoreSpells(legacy,[]),legacy);
 assert.throws(()=>applyRecoveredCoreSpells(legacy,[{...core,payload:{...core.payload,page:"8"}}]));
 assert.throws(()=>applyRecoveredCoreSpells({"2014":[old,old],"2024":[]},approved));
 assert.throws(()=>validateRecoveryManifest(manifest([{...core,action:"promote"}]),books));
 assert.throws(()=>validateRecoveryManifest(manifest([{...core,payload:{...core.payload,rulesSummary:true}}]),books));
});
test("exact declared dependencies fail closed for wrong edition, source, level, summary, and ambiguity",()=>{
 const dep={kind:"Spell",name:"Example",src:"fixture",ed:"2014",level:1}, item={...entry,dependencies:[dep]};
 const a=validateRecoveryManifest(manifest([item]),books);
 validateRecoveredCatalogDependencies(a,{spells:{"2014":[payload]}});
 for(const bad of [{...payload,d:"See the sourcebook for complete rules."},{...payload,referenceSummary:true},{...payload,ed:"2024"},{...payload,src:"other"},{...payload,l:2},{...payload,pending:true,pend:true}])assert.throws(()=>validateRecoveredCatalogDependencies(a,{spells:{"2014":[bad]}}));
 assert.throws(()=>validateRecoveredCatalogDependencies(a,{spells:{"2024":[payload]}}));
 assert.throws(()=>validateRecoveredCatalogDependencies(a,{spells:{"2014":[payload,payload]}}));
 for(const bad of [{...dep,ed:"2024"},{...dep,src:"unknown"},{...dep,level:10},{...dep,kind:"Rule"}])assert.throws(()=>validateRecoveryManifest(manifest([{...item,dependencies:[bad]}]),books));
 assert.throws(()=>validateRecoveryManifest(manifest([{...item,dependencies:[dep,dep]}]),books));
 const md={kind:"Monster",name:"Fixture Beast",src:"srd",ed:"2014"},id={kind:"Item",name:"Fixture Potion",src:"fixture",ed:"2014"};
 const accepted=validateRecoveryManifest(manifest([{...entry,dependencies:[md,id]}]),books);
 const beast={n:md.name,hp:10,ac:12,actions:[["Bite","Deals 1 damage."]]},potion={n:id.name,src:"fixture",d:"Synthetic effect."};
 validateRecoveredCatalogDependencies(accepted,{monsters:{"2014":[beast]},items:{"2014":{mi:[potion]}}});
 assert.throws(()=>validateRecoveredCatalogDependencies(accepted,{monsters:{"2014":[{...beast,actions:[["Bite","Loading"]]}]},items:{"2014":{mi:[potion]}}}));
 assert.throws(()=>validateRecoveredCatalogDependencies(accepted,{monsters:{"2014":[beast]},items:{"2014":{mi:[{...potion,referenceOnly:true}]}}}));
});
