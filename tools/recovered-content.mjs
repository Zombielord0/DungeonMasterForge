// Build-time boundary for independently reviewed, distribution-cleared compact catalog data.
const EDS = ["2014", "2024"];
const CATALOG = { Spell:"extra-spells", Item:"extra-items", Monster:"extra-monsters", Background:"extra-options" };
const names = r => [r.n,...(r.aliases || [])].filter(Boolean).map(n=>n.toLowerCase());
const key = e => JSON.stringify([e.kind,e.name,e.src,e.ed]);
const okText = t => typeof t === "string" && !!t.trim() &&
 !/^\s*(?:loading\b|placeholder\b|reference only\b|[^\n.]{0,140}\b(?:page|p\.)\s*\d+\s*[.!]?\s*$)/i.test(t) &&
 !/\b(?:see (?:the )?(?:sourcebook|book) for (?:the )?full rules|not its rules text|rules text (?:is )?(?:unavailable|not included|not reproduced)|a short summary\.\s*see)\b/i.test(t);
const fail = m => {throw new Error("Recovered content: "+m);};
export function validateRecoveryManifest(m,books) {
 if (!m || m.version!==1 || !Array.isArray(m.entries)) fail("invalid manifest");
 const ids=new Set(),targets=new Set();
 for(const e of m.entries) {
  if(!e || !Object.hasOwn(CATALOG,e.kind) || !EDS.includes(e.ed) || !Object.hasOwn(books,e.src) || typeof e.name!=="string" || !e.name.trim() || typeof e.stableId!=="string" || !e.stableId.trim() || !["replace","promote"].includes(e.action)) fail("invalid or unsupported record identity");
  if(ids.has(e.stableId)||targets.has(key(e))) fail("duplicate stable ID or target");
  ids.add(e.stableId);targets.add(key(e));
  if(e.releaseGate!=="PASS"||e.productionReady!==true||!["sourceVerified","mechanicsVerified","dependenciesVerified","runtimeVerified","distributionCleared"].every(k=>e.review?.[k]===true)||typeof e.review.evidence!=="string"||!e.review.evidence.trim()) fail("approval missing: "+e.name);
  const p=e.payload;
  if(!p||(e.kind==="Background"?p.name:p.n)!==e.name||p.src!==e.src||p.ed!==e.ed||p.ref||p.referenceOnly||p.pend||p.hb||p.shadow) fail("identity or release state mismatch");
  if(e.kind==="Spell") {
   const conditional = p.backgroundLists;
   if (conditional !== undefined && (!Array.isArray(conditional) || !conditional.length ||
     conditional.some(b => !b || typeof b.name !== "string" || !b.name.trim() || !Object.hasOwn(books,b.src)) ||
     new Set(conditional.map(b=>JSON.stringify([b.name,b.src]))).size !== conditional.length)) fail("invalid background spell eligibility: "+e.name);
   if(!Number.isInteger(p.l)||p.l<0||p.l>9||!Array.isArray(p.c)||(!p.c.length&&!conditional?.length)||!p.c.every(x=>typeof x==="string"&&x.trim())||!["s","t","r","du"].every(k=>typeof p[k]==="string"&&p[k].trim())||!["cp","m","h","dt","at","sv"].every(k=>typeof p[k]==="string")||![0,1].includes(p.co)||![0,1].includes(p.ri)||!okText(p.d)||(p.h&&!okText(p.h))) fail("incomplete spell: "+e.name);
  } else if(e.kind==="Background") {
   // This contract covers legacy backgrounds only. Revised ability scores and Origin feats need their own adapter.
   if(e.ed!=="2014"||p.kind!=="background"||p.book!==true||typeof p.id!=="string"||!p.id.trim()||
      !Array.isArray(p.skills)||p.skills.length!==2||new Set(p.skills).size!==2||!p.skills.every(okText)||
      !okText(p.desc)||!Array.isArray(p.feature)||p.feature.length!==2||!p.feature.every(okText)||
      typeof p.tools!=="string"||typeof p.lang!=="string"||
      (p.tools&&!okText(p.tools))||(p.lang&&!okText(p.lang))||
      !Array.isArray(p.gearItems)||!p.gearItems.length||!p.gearItems.every(okText)||
      !Number.isFinite(p.gp)||p.gp<0||!Array.isArray(p.choices)||
      p.choices.some(c=>!c||!okText(c.id)||!okText(c.label)||!okText(c.rules))) fail("incomplete legacy background: "+e.name);
   if(p.spellListExtensions!==undefined&&(!Array.isArray(p.spellListExtensions)||!p.spellListExtensions.length||
      p.spellListExtensions.some(s=>!s||!okText(s.name)||!(s.src==="srd"||Object.hasOwn(books,s.src))||!Number.isInteger(s.level)||s.level<0||s.level>9)||
      new Set(p.spellListExtensions.map(s=>JSON.stringify([s.name,s.src,s.level]))).size!==p.spellListExtensions.length)) fail("invalid background spell dependencies: "+e.name);
  } else if(e.kind==="Item") {
   if(!["k","cat","type","r"].every(k=>typeof p[k]==="string"&&p[k].trim())||!Number.isFinite(p.rk)||typeof p.att!=="string"||typeof p.cons!=="boolean"||typeof p.base!=="boolean"||!okText(p.d)) fail("incomplete item: "+e.name);
  } else {
   if(!["type","size","al","speed","hd","senses","lang"].every(k=>typeof p[k]==="string"&&p[k].trim())||![p.cr,p.ac,p.hp].every(Number.isFinite)||p.hp<0||p.ac<0||!Array.isArray(p.scores)||p.scores.length!==6||!p.scores.every(Number.isFinite)||!Array.isArray(p.actions)||(!p.actions.length&&!okText(e.review.noPrintedActionsEvidence))||!Array.isArray(p.traits)) fail("incomplete or unsupported dynamic monster: "+e.name);
   for(const s of ["traits","actions","bonus","reacts","legend"]) if(p[s]!==undefined&&(!Array.isArray(p[s])||!p[s].every(a=>Array.isArray(a)&&typeof a[0]==="string"&&a[0].trim()&&okText(a[1])))) fail("incomplete monster feature: "+e.name);
  }
 }
 return m.entries;
}
export function applyRecoveredContent(catalog,original,entries,refs) {
 const data=original.slice();
 for(const e of entries.filter(x=>CATALOG[x.kind]===catalog)) {
  const hits=data.map((x,i)=>({x,i})).filter(({x})=>(e.kind==="Background"?x.kind==="background"&&x.name===e.name:x.n===e.name)&&x.src===e.src&&(!x.ed||x.ed==="both"||x.ed===e.ed));
  if(hits.length>1) fail("ambiguous source record: "+e.name);
  const hit=hits[0],p={...e.payload,recoveryId:e.stableId};
  if(hit&&(!hit.x.ed||hit.x.ed==="both")) fail("shared record requires explicit edition migration: "+e.name);
  if(data.some(x=>x.recoveryId===e.stableId&&(!hit||x!==hit.x))) fail("stable ID already in use");
  if(e.kind==="Background"&&data.some(x=>x!==hit?.x&&(x.id===p.id||(x.kind==="background"&&x.name===p.name&&(!x.ed||x.ed==="both"||x.ed===e.ed))))) fail("background ID or name collision: "+e.name);
  if(p.k&&data.some(x=>x.k===p.k&&(!hit||x!==hit.x))) fail("duplicate item key");
  if(e.action==="replace") {
   if(!hit||(hit.x.recoveryId&&hit.x.recoveryId!==e.stableId)) fail("missing or different replacement target");
   if(hit.x.k!==undefined&&p.k!==hit.x.k) fail("existing item key cannot change");
   if(hit.x.id!==undefined&&p.id!==hit.x.id) fail("existing record ID cannot change");
   data[hit.i]=p;
  } else {
   if(hit) fail("promotion would duplicate a record");
   if(refs.filter(r=>r.kind===e.kind&&r.name===e.name&&r.src===e.src&&(r.ed||"2014")===e.ed).length!==1) fail("promotion requires exactly one source reference");
   data.push(p);
  }
 }
 return data;
}
export function appendReferenceSpells(data,core,legacy,refs,told,books) {
 const globalHave=new Set([...core["2014"],...core["2024"],...data].flatMap(names));
 const have=Object.fromEntries(EDS.map(ed=>[ed,new Set([...core[ed],...(ed==="2014"?legacy:[]),...data.filter(x=>!x.ed||x.ed===ed)].flatMap(names))]));
 const out=data.slice(),added=[];
 const AB={strength:"STR",dexterity:"DEX",constitution:"CON",intelligence:"INT",wisdom:"WIS",charisma:"CHA"},cap=t=>String(t||"").replace(/\b\w/g,ch=>ch.toUpperCase());
 function make(row,referenceOnly) {
  const f=Object.fromEntries(row.details||[]),book=books[row.src]?.name||row.src,summary=told[row.name];
  return {n:row.name,l:f.Level==="Cantrip"?0:+f.Level||0,s:f.School||"",c:[],t:f["Casting time"]||"",r:f.Range||"",
    cp:String(f.Components||"").replace(/[^VSM]/g,""),m:"",du:cap(f.Duration),co:/concentration/i.test(f.Duration||"")?1:0,ri:f.Ritual?1:0,
    d:summary?summary.d+"\n\nFrom "+book+", page "+row.page+".":"From "+book+", page "+row.page+". The Forge lists this spell's details but not its rules text: see the book.",
    h:summary?.h||"",dt:summary?.dt||cap(String(f["Damage types"]||"").split(/,\s*/)[0]),at:"",sv:AB[String(f["Saving throws"]||"").split(/,\s*/)[0].toLowerCase()]||"",
    src:row.src,ref:true,page:row.page,ed:row.ed||"2014",referenceSummary:!!summary,...(referenceOnly?{referenceOnly:true}:{})};
 }
 // Preserve existing numeric catalog positions. Only append new edition-specific references at the end.
 for(const row of refs) if(row.kind==="Spell"&&!globalHave.has(row.name.toLowerCase())) {
  const p=make(row,false);if(!EDS.includes(p.ed))fail("unknown spell edition");out.push(p);globalHave.add(row.name.toLowerCase());have[p.ed].add(row.name.toLowerCase());
 }
 for(const row of refs) if(row.kind==="Spell") {
  const ed=row.ed||"2014";if(!EDS.includes(ed))fail("unknown spell edition");
  if(have[ed].has(row.name.toLowerCase()))continue;
  const p=make(row,true);out.push(p);added.push(p);have[ed].add(row.name.toLowerCase());
 }
 return {data:out,added};
}

// Evaluate approved background dependencies against the actual emitted spell catalogs, never against names alone.
export function validateRecoveredBackgroundDependencies(entries,catalogs) {
 for(const e of entries.filter(x=>x.kind==="Background")) {
  const rows=[...(catalogs.spells?.[e.ed]||[]),...(catalogs["extra-spells"]||[]).filter(s=>!s.ed||s.ed===e.ed)];
  for(const dep of e.payload.spellListExtensions||[]) {
   const matches=rows.filter(s=>s.n===dep.name&&(s.src||"srd")===dep.src&&s.l===dep.level&&!s.ref&&!s.referenceOnly&&!s.pend&&!s.rulesSummary&&!s.shadow);
   if(matches.length!==1) fail("unresolved or ambiguous complete background spell dependency: "+e.name+" / "+dep.name);
  }
 }
}
