import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {addSrdWandChargeContracts} from "../tools/ref-srd-item-charges.mjs";
const raw=JSON.parse(readFileSync(new URL("../data/items.json",import.meta.url),"utf8"));
const data=addSrdWandChargeContracts(raw);
const get=(ed,n)=>data[ed].mi.find(x=>x.n===n&&!x.src);
test("exact canonical wand contracts preserve both editions, source and inventory positions",()=>{
 for(const ed of ["2014","2024"]){
  assert.equal(data[ed].mi.length,raw[ed].mi.length);
  assert.equal(data[ed].eq,raw[ed].eq);
  assert.equal(data[ed].mi.filter(x=>x.chargeRecharge).length,9);
  for(let i=0;i<data[ed].mi.length;i++){const a=data[ed].mi[i],b=raw[ed].mi[i];assert.equal(a.n,b.n);assert.equal(a.k,b.k);assert.equal(a.src,b.src);assert.equal(a.d,b.d);}
 }
 assert.equal(get("2014","Wand of Web").spellSaveDC,15);
 assert.equal(get("2024","Wand of Web").spellSaveDC,13);
 assert.equal(get("2024","Wand of Web").att,"Required by a Spellcaster");
 assert.equal(get("2014","Wand of Fireballs").spellChargeCosts["Fireball (level 9)"],7);
 assert.equal(get("2024","Wand of Fireballs").spellChargeCosts["Fireball (level 6)"],undefined);
 assert.equal(get("2024","Wand of Secrets").lastChargeVanish,false);
 assert.equal(get("2024","Wand of Magic Detection").chargeRecharge.dice,3);
 assert.equal(get("2024","Wand of Magic Missiles").chargeRecharge.dice,6);
 assert.equal(raw["2024"].mi.find(x=>x.n==="Wand of Magic Missiles").maxCharges,undefined);
 const broken=structuredClone(raw);broken["2024"].mi.find(x=>x.n==="Wand of Magic Missiles").d="Reference only";
 assert.throws(()=>addSrdWandChargeContracts(broken),/source mismatch/);
});
test("actual inventory charge functions enforce initialization, attunement, consumption and edition binding",()=>{
 const source=readFileSync(new URL("../src/app/13f-item-details.js",import.meta.url),"utf8");
 const code=source.slice(0,source.indexOf('$("#rosterMain").addEventListener'));
 const ctx={itemRulesIncomplete:x=>!!x?.referenceOnly,console};
 runInNewContext(code+"\nObject.assign(globalThis,{itemChargeContract,itemChargeState,itemChargeInitialize,itemChargeUse,itemChargeDawn,itemConsume,itemConsumableReady});",ctx);
 const wand={...get("2024","Wand of Web"),id:"2024-test",ed:"2024"},i={qty:1,eq:true,attuned:false};
 assert.equal(ctx.itemChargeInitialize(i,wand,2),true);
 assert.equal(ctx.itemChargeInitialize(i,wand,7),false);
 assert.equal(ctx.itemChargeUse(i,wand,0,()=>20),null);
 i.attuned=true;assert.equal(ctx.itemChargeUse(i,wand,0,()=>20).left,1);
 assert.equal(ctx.itemChargeDawn(i,wand,()=>6).left,7);
 assert.equal(ctx.itemChargeState(i,{...wand,id:"2014-test",ed:"2014"}),null);
 const last={qty:1,eq:true,attuned:true};ctx.itemChargeInitialize(last,wand,1);
 assert.equal(ctx.itemChargeUse(last,wand,0,()=>1).vanished,true);assert.equal(last.qty,0);assert.equal(last.eq,false);assert.equal(last.attuned,false);
 assert.equal(ctx.itemChargeInitialize({qty:2},wand,1),false);
 assert.equal(ctx.itemChargeContract({...wand,referenceOnly:true}),null);
 const potion={cat:"Potion",cons:true},p={qty:1,eq:true};assert.equal(ctx.itemConsume(p,potion),true);assert.equal(p.qty,0);
 assert.equal(ctx.itemConsumableReady({qty:1},{cat:"Scroll",cons:true,n:"Spell Scroll (Level 1) (unknown)"}),false);
});
