import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateSrdSpellLinks,fillSrdSpellReferences,joinSrdSpellReferences,correctLegacySpellMetadata} from "../tools/ref-srd-spells.mjs";
import {appendReferenceSpells} from "../tools/recovered-content.mjs";
const read=n=>JSON.parse(readFileSync(new URL("../data/"+n+".json",import.meta.url),"utf8"));
test("315 reviewed legacy spell references display canonical full SRD mechanics without shifting slots",()=>{
 const manifest=read("reference-srd-spells"),refs=read("book-references"),core=read("spells");
 const links=validateSrdSpellLinks(manifest,refs,core);
 const previous=appendReferenceSpells(read("extra-spells"),core,read("spell-grants").legacySpells,refs,read("reference-spell-text").spells,read("extra-books").books).data;
 const out=fillSrdSpellReferences(previous,links),joined=joinSrdSpellReferences(refs,links);
 assert.equal(links.length,315);assert.equal(links.filter(x=>x.entry.mode==="existing").length,298);assert.equal(out.length,previous.length);
 assert.deepEqual(out.map(x=>[x.n,x.src,x.ed]),previous.map(x=>[x.n,x.src,x.ed]));
 assert.equal(joined.filter(x=>x.srdSpell).length,315);
 assert.equal(out.filter(x=>x.referenceOnly&&!x.srdSpell).length,37);
 for(const {entry:e,payload:p} of links.filter(x=>x.entry.mode!=="existing")){const x=out.find(x=>x.n===e.name&&x.src===e.src&&x.ed===e.ed);assert.equal(x.d,p.d);assert.equal(x.h,p.h);assert.equal(x.m,p.m);assert.equal(x.referenceOnly,true);assert.equal(x.srdSpell,p.n);}
 assert.throws(()=>validateSrdSpellLinks({...manifest,entries:[{...manifest.entries[0],ed:"2024"}]},refs,core));
 assert.throws(()=>validateSrdSpellLinks({...manifest,entries:[{...manifest.entries[0],descriptionHash:"00000000"}]},refs,core));
 assert.throws(()=>fillSrdSpellReferences([],links));
});

test("official 2014 school and casting-time corrections preserve source order and revised rules",()=>{
 const raw=read("spells"),out=correctLegacySpellMetadata(raw);
 assert.deepEqual(out["2024"],raw["2024"]);
 assert.deepEqual(out["2014"].map(x=>x.n),raw["2014"].map(x=>x.n));
 for(const [name,field,value] of [["Mass Cure Wounds","s","Evocation"],["Mass Heal","s","Evocation"],["Revivify","s","Necromancy"],["Plant Growth","t","1 action or 8 hours"]])assert.equal(out["2014"].find(x=>x.n===name&&!x.src)[field],value);
});
