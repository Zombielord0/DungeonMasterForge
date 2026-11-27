// Account for every book reference; presence is not mechanical certification.
const norm=s=>String(s||"").normalize("NFKD").toLowerCase().replace(/[\p{M}'’]/gu,"").replace(/[^\p{L}\p{N}]+/gu," ").trim();
const marker=/\b(?:see (?:the )?(?:sourcebook|book) for (?:the )?full rules|not its rules text|rules text (?:is )?(?:unavailable|not included|not reproduced)|loading(?:\s|\.{3})|placeholder)\b/i;
const pageOnly=/^\s*[^\n.]{0,140}\b(?:page|p\.)\s*\d+\s*[.!]?\s*$/i;
function suspect(x){
 const t=[x.d,x.desc,...(x.features||[]).map(y=>y.d),...(x.traits||[]).map(y=>Array.isArray(y)?y[1]:y.d),...(x.actions||[]).map(y=>y[1])].filter(y=>typeof y==="string");
 return !t.length||t.some(y=>!y.trim()||marker.test(y)||pageOnly.test(y));
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
  const playable=exact.filter(x=>!x.row.ref&&!x.row.referenceOnly&&!x.row.pend&&!x.row.hb);
  let status;
  if(r.srdSpell)status="full_srd_spell_link";
  else if(r.srd)status="srd_item_link_equivalence_review";
  else if(playable.length===1&&!suspect(playable[0].row))status="same_source_payload_candidate";
  else if(playable.length)status="same_source_payload_review";
  else if(r.sum||exact.some(x=>x.row.referenceSummary))status="summary_only";
  else status="reference_only";
  const c=counts[r.kind]??={total:0};c.total++;c[status]=(c[status]||0)+1;statuses[status]=(statuses[status]||0)+1;
  return {kind:r.kind,name:r.name,source:r.src,edition:ed,page:r.page??null,status,canonicalSrd:r.srdSpell||r.srd||null,canonicalSrdVariants:r.srdVariants||null,srdItemArchiveVerified:r.srdItemArchiveVerified===true,sameSourcePlayableCandidates:playable.length,otherSourceNameCandidates:matches.filter(x=>x.row.src!==r.src&&!x.row.ref&&!x.row.referenceOnly&&!x.row.pend).length};
 });
 return {schemaVersion:1,scope:"Book-reference rows and emitted JSON catalog candidates; hardcoded options and browser behavior not audited. No completeness certification.",total:rows.length,counts,statuses,rows};
}
