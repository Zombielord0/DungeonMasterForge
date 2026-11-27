// Explicit same-edition aliases. These link to canonical existing SRD rules, not newly approved book text.
// FNV-1a fingerprints of whitespace-normalized archived SRD descriptions/higher-level text detect accidental changes.
export function srdTextFingerprint(text) {
 let h=2166136261;
 for(const ch of text.replace(/\s+/g," ").trim()) h=Math.imul(h^ch.codePointAt(0),16777619)>>>0;
 return h.toString(16).padStart(8,"0");
}
const fail=m=>{throw new Error("SRD spell link: "+m)};
const norm=s=>String(s||"").toLowerCase().trim().replace(/\b(hours?|minutes?|rounds?|days?)\b/g,m=>m.replace(/s$/,"")).replace(/concentration,\s*/g,"").replace("until ended","until dispelled");
// Corrections verified against official SRD 5.1 pp. 162, 163, 169, 175
// and PHB Errata v3 p.5. Keep the original archive unchanged.
const LEGACY_METADATA = {
 "Mass Cure Wounds":{s:"Evocation"}, "Mass Heal":{s:"Evocation"},
 "Revivify":{s:"Necromancy"}, "Plant Growth":{t:"1 action or 8 hours"}
};
export function correctLegacySpellMetadata(core) {
 return {...core,"2014":core["2014"].map(p=>!p.src && Object.hasOwn(LEGACY_METADATA,p.n) ? {...p,...LEGACY_METADATA[p.n]} : p)};
}
const SELF_SHAPES = {
 "Antilife Shell":["10 feet (radius)",/10-foot radius/i],
 "Antimagic Field":["10 feet (sphere)",/10-foot-radius invisible sphere/i],
 "Burning Hands":["15 feet (cone)",/15-foot cone/i],
 "Color Spray":["15 feet (cone)",/15-foot cone/i],
 "Cone of Cold":["60 feet (cone)",/60-foot cone/i],
 "Control Weather":["5 miles (radius)",/within 5 miles of you/i],
 "Fear":["30 feet (cone)",/30-foot cone/i],
 "Globe of Invulnerability":["10 feet (radius)",/10-foot radius/i],
 "Gust of Wind":["60 feet (line)",/line of strong wind 60 feet long/i],
 "Lightning Bolt":["100 feet (line)",/line 100 feet long/i],
 "Prismatic Spray":["60 feet (cone)",/60-foot cone/i],
 "Speak with Plants":["30 feet (radius)",/within 30 feet of you/i],
 "Spirit Guardians":["15 feet (radius)",/distance of 15 feet/i],
 "Sunbeam":["60 feet (line)",/60-foot-long line/i],
 "Thunderwave":["15 feet (cube)",/15-foot cube/i]
};
function rangeMatches(f,p){
 if(norm(f)===norm(p.r))return true;
 if(["Clairvoyance","Meteor Swarm"].includes(p.n)&&norm(f)==="1 miles"&&norm(p.r)==="1 mile")return true;
 if(p.n==="Dream"&&norm(f)==="(special)"&&norm(p.r)==="special")return true;
 const shape=SELF_SHAPES[p.n];
 return !!shape&&norm(f)===shape[0]&&norm(p.r)==="self"&&shape[1].test(p.d);
}
function durationMatches(f,p){
 if(norm(f)===norm(p.du))return true;
 return ["Find the Path","Forbiddance","Project Image"].includes(p.n)&&norm(f).replace(/1 day\b/,"24 hour")===norm(p.du);
}

export function validateSrdSpellLinks(manifest,refs,core) {
 core=correctLegacySpellMetadata(core);
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
  if(level!==p.l||norm(f.School)!==norm(p.s)||norm(f["Casting time"])!==norm(p.t)||(!tinyHutRange&&!rangeMatches(f.Range,p))||String(f.Components||"").replace(/[^VSM]/g,"")!==p.cp||!durationMatches(f.Duration,p)||Number(/concentration/i.test(f.Duration||""))!==Number(p.co)||Number(!!f.Ritual)!==Number(p.ri))fail("reference metadata differs: "+e.name);
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
