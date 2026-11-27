import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateSrdSpellLinks,fillSrdSpellReferences,joinSrdSpellReferences} from "../tools/ref-srd-spells.mjs";
import {appendReferenceSpells} from "../tools/recovered-content.mjs";
const read=n=>JSON.parse(readFileSync(new URL("../data/"+n+".json",import.meta.url),"utf8"));
test("282 reviewed legacy spell references display canonical full SRD mechanics without shifting slots",()=>{
 const manifest=read("reference-srd-spells"),refs=read("book-references"),core=read("spells");
 const links=validateSrdSpellLinks(manifest,refs,core);
 const previous=appendReferenceSpells(read("extra-spells"),core,read("spell-grants").legacySpells,refs,read("reference-spell-text").spells,read("extra-books").books).data;
 const out=fillSrdSpellReferences(previous,links),joined=joinSrdSpellReferences(refs,links);
 assert.equal(links.length,282);assert.equal(links.filter(x=>x.entry.mode==="existing").length,265);assert.equal(out.length,previous.length);
 assert.deepEqual(out.map(x=>[x.n,x.src,x.ed]),previous.map(x=>[x.n,x.src,x.ed]));
 assert.equal(joined.filter(x=>x.srdSpell).length,282);
 assert.equal(out.filter(x=>x.referenceOnly&&!x.srdSpell).length,37);
 for(const {entry:e,payload:p} of links.filter(x=>x.entry.mode!=="existing")){const x=out.find(x=>x.n===e.name&&x.src===e.src&&x.ed===e.ed);assert.equal(x.d,p.d);assert.equal(x.h,p.h);assert.equal(x.m,p.m);assert.equal(x.referenceOnly,true);assert.equal(x.srdSpell,p.n);}
 assert.throws(()=>validateSrdSpellLinks({...manifest,entries:[{...manifest.entries[0],ed:"2024"}]},refs,core));
 assert.throws(()=>validateSrdSpellLinks({...manifest,entries:[{...manifest.entries[0],descriptionHash:"00000000"}]},refs,core));
 assert.throws(()=>fillSrdSpellReferences([],links));
});
