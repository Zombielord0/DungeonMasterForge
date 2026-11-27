// Explicit same-edition aliases. These link to canonical existing SRD rules, not newly approved book text.
// FNV-1a fingerprints of whitespace-normalized archived SRD descriptions/higher-level text detect accidental changes.
export function srdTextFingerprint(text) {
 let h=2166136261;
 for(const ch of text.replace(/\s+/g," ").trim()) h=Math.imul(h^ch.codePointAt(0),16777619)>>>0;
 return h.toString(16).padStart(8,"0");
}
const fail=m=>{throw new Error("SRD spell link: "+m)};
const norm=s=>String(s||"").toLowerCase().trim().replace(/\b(hours?|minutes?|rounds?|days?)\b/g,m=>m.replace(/s$/,"")).replace(/concentration,\s*/g,"").replace("until ended","until dispelled");
export function validateSrdSpellLinks(manifest,refs,core) {
 if(!manifest||manifest.version!==1||!Array.isArray(manifest.entries))fail("invalid manifest");
 const seen=new Set(),out=[];
 for(const e of manifest.entries) {
  const existing=e.mode==="existing";
  if(e.ed!=="2014"||e.src!=="phb-2014"||(existing ? e.name!==e.target || e.archiveSourceKey!=="SRD 5.1|2014|Spell|"+e.target : e.mode!==undefined || typeof e.stableId!=="string" || !e.stableId.startsWith("cmp:")))fail("unsupported edition, source or link identity");
  const id=JSON.stringify([e.name,e.src,e.ed]);if(seen.has(id))fail("duplicate link");seen.add(id);
  const ref=refs.filter(r=>r.kind==="Spell"&&r.name===e.name&&r.src===e.src&&(r.ed||"2014")===e.ed);
  const target=core[e.ed].filter(s=>s.n===e.target&&!s.src&&!s.ref);
  if(ref.length!==1||target.length!==1)fail("missing or ambiguous exact reference/target: "+e.name);
  const p=target[0],r=ref[0],f=Object.fromEntries(r.details||[]);
  if(!p.d?.trim()||srdTextFingerprint(p.d)!==e.descriptionHash||srdTextFingerprint(p.h||"")!==e.higherLevelHash)fail("archived rules fingerprint mismatch: "+e.name);
  const level=f.Level==="Cantrip"?0:Number(f.Level);
  const tinyHutRange=e.target==="Tiny Hut"&&norm(f.Range)==="10 feet (hemisphere)"&&norm(p.r)==="self"&&/10-foot-radius/i.test(p.d);
  if(level!==p.l||norm(f.School)!==norm(p.s)||norm(f["Casting time"])!==norm(p.t)||(!tinyHutRange&&norm(f.Range)!==norm(p.r))||String(f.Components||"").replace(/[^VSM]/g,"")!==p.cp||norm(f.Duration)!==norm(p.du)||Number(/concentration/i.test(f.Duration||""))!==Number(p.co)||Number(!!f.Ritual)!==Number(p.ri))fail("reference metadata differs: "+e.name);
  out.push({entry:e,payload:p,reference:r});
 }
 return out;
}
// Preserve the reference shell's slot and name for saved lookup compatibility. It is not a second selectable spell.
export function fillSrdSpellReferences(rows,links) {
 const out=rows.slice();
 for(const {entry:e,payload:p,reference:r} of links) {
  if(e.mode==="existing")continue; // Canonical spell already exists; link the book-reference detail only.
  const hits=out.map((x,i)=>({x,i})).filter(({x})=>x.n===e.name&&x.src===e.src&&x.ed===e.ed);
  if(hits.length!==1||!hits[0].x.ref||!hits[0].x.referenceOnly)fail("expected one reference shell: "+e.name);
  const {i}=hits[0];
  out[i]={...p,n:e.name,src:e.src,ed:e.ed,page:r.page,ref:true,referenceOnly:true,srdSpell:p.n,srdRecoveryId:e.stableId};
 }
 return out;
}
export function joinSrdSpellReferences(rows,links) {
 return rows.map(r=>{
  const match=links.find(({entry:e})=>r.kind==="Spell"&&r.name===e.name&&r.src===e.src&&(r.ed||"2014")===e.ed);
  return match?{...r,srdSpell:match.entry.target}:r;
 });
}
