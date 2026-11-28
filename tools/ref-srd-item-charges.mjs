// Charge-only contracts for canonical SRD wands, not automated spell effects.
// 2014: previously archive-reconciled SRD 5.1 items. 2024: SRD 5.2.1 PDF pp. 250–251.
// Keep the raw archival JSON and all inventory slots intact. Source: https://www.dndbeyond.com/srd
// CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
const spellLevels=(name,base,max)=>Object.fromEntries(Array.from({length:max},(_,i)=>[name+" (level "+(base+i)+")",i+1]));
const specs=ed=>({
 "Wand of Magic Detection":{maxCharges:3,spellChargeCosts:{"Detect Magic":1}},
 "Wand of Secrets":{maxCharges:3,chargeActions:{"Detect nearest secret door or trap":1}},
 "Wand of Enemy Detection":{chargeActions:{"Detect nearest hostile creature":1}},
 "Wand of Fireballs":{spellChargeCosts:spellLevels("Fireball",3,ed==="2014"?7:3),spellSaveDC:15,spellcaster:true},
 "Wand of Lightning Bolts":{spellChargeCosts:spellLevels("Lightning Bolt",3,ed==="2014"?7:3),spellSaveDC:15,spellcaster:true},
 "Wand of Magic Missiles":{spellChargeCosts:spellLevels("Magic Missile",1,ed==="2014"?7:3)},
 "Wand of Paralysis":{chargeActions:{"Paralyzing ray (Constitution DC 15)":1},spellcaster:true},
 "Wand of Polymorph":{spellChargeCosts:{"Polymorph":1},spellSaveDC:15,spellcaster:true},
 "Wand of Web":{spellChargeCosts:{"Web":1},spellSaveDC:ed==="2014"?15:13,spellcaster:true}
});
export function addSrdWandChargeContracts(items){
 const out={...items};
 for(const ed of ["2014","2024"]){
  const entries=specs(ed),rows=items[ed].mi;
  for(const [name,spec] of Object.entries(entries)){
   const found=rows.filter(x=>x.n===name&&!x.src&&!x.ref&&!x.referenceOnly&&!x.rulesSummary&&!x.referenceSummary);
   if(found.length!==1||found[0].cat!=="Wand"||!found[0].d?.includes((spec.maxCharges||7)+" charges")||!found[0].d?.includes("1d"+(spec.maxCharges?3:6)))throw Error("SRD wand charge source mismatch: "+ed+" "+name);
  }
  const mi=rows.map(x=>{
   if(x.src||!Object.hasOwn(entries,x.n))return x;
   const {spellcaster,...spec}=entries[x.n],maxCharges=spec.maxCharges||7;
   return {...x,...spec,maxCharges,chargeRecharge:{at:"dawn",dice:maxCharges===3?3:6,add:maxCharges===3?0:1},lastChargeVanish:maxCharges===7,
    ...(ed==="2024"&&spellcaster?{att:"Required by a Spellcaster"}:{})};
  });
  out[ed]={...items[ed],mi};
 }
 return out;
}
