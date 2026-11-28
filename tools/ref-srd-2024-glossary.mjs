// Exact SRD 5.2.1 glossary definitions from the source archive, pages 176–191.
export function buildRevisedGlossary(data) {
 if(data?.version!==1||data.edition!=="2024"||data.source!=="SRD 5.2.1"||
   data.sourcePdfSha256!=="8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87"||
   !data.attribution?.includes("Creative Commons Attribution 4.0")||
   !Array.isArray(data.entries)||data.entries.length!==155)throw Error("Invalid revised SRD glossary");
 const ids=new Set(),names=new Set();
 return data.entries.map(e=>{
  if(!/^srd52:rule:[a-f0-9]+$/.test(e.id)||ids.has(e.id)||typeof e.name!=="string"||!e.name.trim()||names.has(e.name)||
   !Number.isInteger(e.page)||!Number.isInteger(e.pageEnd)||e.page<176||e.pageEnd>191||e.pageEnd<e.page||
   typeof e.text!=="string"||!e.text.trim()||/^(?:reference only|placeholder|loading)/i.test(e.text))throw Error("Incomplete or duplicate revised glossary definition: "+e.name);
  ids.add(e.id);names.add(e.name);
  return {kind:"Other rules",name:e.name,src:null,ed:"2024",page:e.page,pageEnd:e.pageEnd,details:[],srdGlossary:{id:e.id,text:e.text}};
 });
}
