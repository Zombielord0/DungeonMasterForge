// Account for every book reference; presence is not mechanical certification.
const norm=s=>String(s||"").normalize("NFKD").toLowerCase().replace(/[\p{M}'’]/gu,"").replace(/[^\p{L}\p{N}]+/gu," ").trim();
const marker=/\b(?:see (?:the )?(?:sourcebook|book) for (?:the )?(?:full|complete) rules|not its rules text|rules text (?:is )?(?:unavailable|not included|not reproduced)|loading(?:\s|\.{3})|placeholder)\b/i;
const pageOnly=/^\s*[^\n.]{0,140}\b(?:page|p\.)\s*\d+\s*[.!]?\s*$/i;
const sections=["features","traits","actions","bonus","reacts","legend","lair","regional","choices","subs"];
function texts(x){
 if(!x||typeof x!=="object")return [];
 const t=[x.d,x.desc,x.h].filter(y=>typeof y==="string"&&y.trim());
 for(const k of sections)for(const y of Array.isArray(x[k])?x[k]:[]){
  if(Array.isArray(y)){if(typeof y[1]==="string")t.push(y[1]);}
  else if(typeof y==="object"&&y!==null)t.push(...texts(y),...([y.rules].filter(z=>typeof z==="string")));
 }
 if(Array.isArray(x.feature)&&typeof x.feature[1]==="string")t.push(x.feature[1]);
 return t;
}
const incomplete=x=>!!(x.ref||x.referenceOnly||x.referenceSummary||x.rulesSummary||x.pend||x.hb||x.shadow);
function suspect(x){
 const t=texts(x);
 return !t.length||t.some(y=>!y.trim()||marker.test(y)||pageOnly.test(y));
}
// This inventory includes emitted JSON rows without book reference counterparts.
// It deliberately does not label any structurally present record mechanically certified.
export function catalogRecoveryInventory(catalogs){
 const buckets=new Map(),identities=new Map(),rows=[];
 const add=(kind,edition,row,name=row.n)=>{
  if(typeof name!=="string"||!name.trim())return;
  const source=row.src||"srd",key=JSON.stringify([kind,edition,source,norm(name)]);
  const status=incomplete(row)?"reference_or_unapproved":suspect(row)?"source_or_mechanics_review":"payload_candidate";
  const entry={kind,edition,source,name,status,recoveryId:row.recoveryId||null};
  rows.push(entry);
  const matches=identities.get(key)||[];matches.push(entry);identities.set(key,matches);
  const bucketKey=JSON.stringify([kind,edition]),bucket=buckets.get(bucketKey)||{kind,edition,total:0,reference_or_unapproved:0,source_or_mechanics_review:0,payload_candidate:0};
  bucket.total++;bucket[status]++;buckets.set(bucketKey,bucket);
 };
 for(const ed of ["2014","2024"]){
  for(const x of catalogs.spells?.[ed]||[])add("Spell",ed,x);
  for(const x of catalogs.monsters?.[ed]||[])add("Monster",ed,x);
  for(const x of catalogs.items?.[ed]?.mi||[])add("Item",ed,x);
  for(const x of catalogs.items?.[ed]?.eq||[])add("Equipment",ed,x);
  for(const [kind,key] of [["Spell","extra-spells"],["Monster","extra-monsters"],["Item","extra-items"]])
   for(const x of catalogs[key]||[])if(!x.ed||x.ed==="both"||x.ed===ed)add(kind,ed,x);
  for(const x of catalogs["extra-options"]||[])if((!x.ed||x.ed==="both"||x.ed===ed)&&x.kind){
   add(x.kind[0].toUpperCase()+x.kind.slice(1),ed,x,x.name);
  }
 }
 return {scope:"Emitted JSON catalog rows by edition. Shared entries counted in each eligible edition; hardcoded options and browser behavior excluded. Candidate presence is not certification.",total:rows.length,counts:[...buckets.values()],duplicateIdentities:[...identities.values()].filter(x=>x.length>1).map(x=>({kind:x[0].kind,edition:x[0].edition,source:x[0].source,names:x.map(y=>y.name),count:x.length})),rows};
}
export function recoveryCoverage(refs,catalogs){
 const index=new Map();
 const add=(kind,ed,row,name=row.n)=>{
  if(!name)return;
  const k=JSON.stringify([kind,ed,norm(name)]);
  if(!index.has(k))index.set(k,[]);
  index.get(k).push({row,name});
 };
 const extras=(kind,key,ed)=>{for(const row of catalogs[key]||[])if(!row.ed||row.ed==="both"||row.ed===ed)add(kind,ed,row)};
 for(const ed of ["2014","2024"]){
  for(const row of catalogs.spells?.[ed]||[])add("Spell",ed,row);
  for(const row of catalogs.items?.[ed]?.mi||[])add("Item",ed,row);
  for(const row of catalogs.monsters?.[ed]||[])add("Monster",ed,row);
  extras("Spell","extra-spells",ed);extras("Item","extra-items",ed);extras("Monster","extra-monsters",ed);
  for(const row of catalogs["extra-options"]||[])if(!row.ed||row.ed==="both"||row.ed===ed){
   const kind=row.kind?.[0]?.toUpperCase()+row.kind?.slice(1);add(kind,ed,row,row.name);
  }
 }
 const counts={},statuses={},rows=refs.map(r=>{
  const ed=r.ed||"2014",matches=index.get(JSON.stringify([r.kind,ed,norm(r.name)]))||[];
  const exact=matches.filter(x=>x.row.src===r.src&&x.name===r.name);
  const playable=exact.filter(x=>!incomplete(x.row));
  const flagged=exact.filter(x=>x.row.rulesSummary||x.row.referenceSummary);
  let status;
  if(r.srdGlossary)status="full_srd_glossary_definition";
  else if(r.srdSpell)status="full_srd_spell_link";
  else if(r.srd)status="srd_item_link_equivalence_review";
  else if(playable.length===1&&!suspect(playable[0].row))status="same_source_payload_candidate";
  else if(playable.length)status="same_source_payload_review";
  else if(r.sum||flagged.length)status="summary_only";
  else status="reference_only";
  const c=counts[r.kind]??={total:0};c.total++;c[status]=(c[status]||0)+1;statuses[status]=(statuses[status]||0)+1;
  return {kind:r.kind,name:r.name,source:r.src,edition:ed,page:r.page??null,status,canonicalSrd:r.srdSpell||r.srd||null,canonicalSrdVariants:r.srdVariants||null,srdItemArchiveVerified:r.srdItemArchiveVerified===true,sameSourcePlayableCandidates:playable.length,otherSourceNameCandidates:matches.filter(x=>x.row.src!==r.src&&!incomplete(x.row)).length};
 });
 return {schemaVersion:1,scope:"Book-reference rows and emitted JSON catalog candidates; hardcoded options and browser behavior not audited. No completeness certification.",total:rows.length,counts,statuses,rows,catalogInventory:catalogRecoveryInventory(catalogs)};
}
