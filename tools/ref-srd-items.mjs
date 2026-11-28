// Archive verification and narrow official-SRD corrections (2014 only).
import {srdTextFingerprint as fingerprint} from "./ref-srd-spells.mjs";
const GROUPS = {"Potions of Healing":["Potion of Healing","Potion of Greater Healing","Potion of Superior Healing","Potion of Supreme Healing"]};
const CORRECTIONS = {"Staff of Swarming Insects":{r:"Rare",rk:2},"Staff of the Python":{r:"Uncommon",rk:1}};
const fail=m=>{throw new Error("Legacy SRD item: "+m)};
export function verifyLegacyItemArchive(items) {
 const a=items["2014"].mi.filter(x=>!x.src);
 const digest=fingerprint(a.map(x=>fingerprint(x.n+"|"+x.type+"|"+x.d)).sort().join("\n"));
 if(a.length!==341||digest!=="f5d0ded4")fail("canonical archive payload mismatch; review the source archive before changing this fingerprint");
 return {concreteItems:a.length,archiveVariantGroups:21,fingerprint:digest};
}
export function correctLegacyItemMetadata(items) {
 return {...items,"2014":{...items["2014"],mi:items["2014"].mi.map(p=>{
  if(p.src||!Object.hasOwn(CORRECTIONS,p.n))return p;
  const c=CORRECTIONS[p.n];
  return {...p,...c,type:p.type.replace(/^Staff, very rare\b/i,"Staff, "+c.r.toLowerCase())};
 })}};
}
export function verifyAndAnnotateLegacyItemLinks(rows,items) {
 const index=new Map(items["2014"].mi.filter(x=>!x.src).map(x=>[x.n,x]));
 return rows.map(r=>{
  if(!r.srd||r.kind!=="Item")return r;
  if((r.ed||"2014")!=="2014")fail("wrong edition: "+r.name);
  const p=index.get(r.srd);if(!p)fail("missing canonical target "+r.srd);
  const metadata=Object.fromEntries(r.details||[]),norm=x=>String(x||"").trim().toLowerCase();
  const group=r.src==="dmg-2014"?GROUPS[r.name]:null;
  if(group) {
   if(norm(metadata.Rarity)!=="varies"||!group.every(n=>index.has(n)))fail("missing potion variant");
   return {...r,srdVariants:group,srdItemArchiveVerified:true,srdItemSourceEquivalence:"not_certified"};
  }
  if(norm(metadata.Rarity)!==norm(p.r))fail("rarity disagreement: "+r.name);
  const att=metadata.Attunement;
  if(att!==undefined&&!(norm(p.att).includes(norm(att))||(norm(att)==="yes"&&p.att)))fail("attunement disagreement: "+r.name);
  return {...r,srdItemArchiveVerified:true,srdItemSourceEquivalence:"not_certified"};
 });
}
