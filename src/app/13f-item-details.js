/* Item reference and effects derived from the character's current inventory. */
function inventoryCatalogItem(i, ed) {
  if (i.itemRules?.kind === "custom") {
    const snapshot = i.itemRules;
    return { ...snapshot, st: Array.isArray(snapshot.st) ? snapshot.st.filter(row => Array.isArray(row) && row.length >= 2) : [] };
  }
  const ref = i.ref && itFind(i.ref);
  // Keep the saved source identity; do not substitute another edition's charged contract.
  if (ref && (!/^20(14|24)-/.test(i.ref) || i.ref.startsWith(ed+"-"))) return ref;
  if(ref && /^20(14|24)-/.test(i.ref)) return {...ref,referenceOnly:true};
  const name = String(i.n || "").trim().toLowerCase();
  itLoad();
  return IT.data[ed].find(x => x.n.toLowerCase() === name) || null;
}

function inventoryRulesSnapshot(x) {
  if (!x || x.kind !== "custom") return undefined;
  return { kind: x.kind, cat: x.cat, type: x.type, rk: x.rk, r: x.r, att: x.att, st: x.st, w: x.w, c: x.c, d: x.d };
}

function inventoryNeedsAttunement(i, ref) {
  return Boolean(i.att || ref?.att || (i.artificerInfusion && LEGACY_INFUSION_CONTRACTS[i.artificerInfusion.name]?.att));
}

function inventoryAttunementControl(i, ed) {
  return inventoryNeedsAttunement(i, inventoryCatalogItem(i, ed))
    ? `<input type="checkbox" data-rinv="attuned" data-iid="${esc(i.id)}" ${i.attuned ? "checked" : ""} aria-label="Attuned">`
    : '<span class="muted">—</span>';
}

function inventoryEffectActive(i, ref) {
  return !itemRulesIncomplete(ref) && +i.qty > 0 && i.eq && (!inventoryNeedsAttunement(i, ref) || i.attuned);
}

function inventoryEnhancement(i, ref, target) {
  if(itemRulesIncomplete(ref))return 0;
  // Explicit, equal weapon bonuses are safe; reaction-only or other special effects stay manual.
  if(target==="weapon" && Number.isInteger(ref?.attackBonus) && ref.attackBonus===ref.damageBonus && ref.attackBonus>=0 && ref.attackBonus<=3)return ref.attackBonus;
  if(target==="armor" && Number.isInteger(ref?.armorBonus) && ref.armorBonus>=0 && ref.armorBonus<=3)return ref.armorBonus;
  if(ref?.manualEffects)return 0;
  const rules = String(ref?.d || "");
  const match = target === "weapon"
    ? rules.match(/\+([1-3]) bonus to (?:weapon )?attack (?:rolls )?and damage rolls/i)
    : rules.match(/\+([1-3]) bonus to (?:Armor Class|AC)(?=\s*(?:[.,]|while))/i);
  const named = (String(i.n || "") + " " + (i.note || "")).match(/\+([1-3])\b/);
  return Number(match?.[1] || named?.[1] || 0);
}

// Explicit item resources only: no inferred charges from prose or class spell slots.
// Existing characters start uninitialized; the DM/player confirms their current charge count.
// Single physical charged items need individual inventory rows.
function itemChargeContract(ref){
 if(!ref||itemRulesIncomplete(ref)||!Number.isSafeInteger(ref.maxCharges)||ref.maxCharges<1||ref.maxCharges>100)return null;
 const recharge=ref.chargeRecharge;
 if(!recharge||recharge.at!=="dawn"||![0,3,4,6].includes(recharge.dice)||!Number.isSafeInteger(recharge.add)||recharge.add<0||recharge.add>ref.maxCharges)return null;
 const actions=[...Object.entries(ref.chargeActions||{}).map(([name,cost])=>({name,cost,kind:"action"})),...Object.entries(ref.spellChargeCosts||{}).map(([name,cost])=>({name,cost,kind:"spell"}))];
 if(!actions.length||actions.some(a=>!a.name||!Number.isSafeInteger(a.cost)||a.cost<0||a.cost>ref.maxCharges))return null;
 return {key:JSON.stringify([ref.id,ref.ed,ref.src,ref.n,ref.maxCharges]),max:ref.maxCharges,recharge,actions,vanish:ref.lastChargeVanish===true,dc:ref.spellSaveDC};
}
function itemChargeState(i,ref){
 const q=itemChargeContract(ref);
 if(!q||+i.qty!==1)return null;
 const s=i.itemCharge;
 return s?.key===q.key&&Number.isSafeInteger(s.left)&&s.left>=0&&s.left<=q.max?s:null;
}
function itemChargeInitialize(i,ref,left){
 const q=itemChargeContract(ref);
 if(!q||+i.qty!==1||itemChargeState(i,ref)||!Number.isSafeInteger(left)||left<0||left>q.max)return false;
 i.itemCharge={key:q.key,left};return true;
}
function itemChargeUse(i,ref,index,roll){
 const q=itemChargeContract(ref),s=itemChargeState(i,ref),a=q?.actions[index];
 if(!s||!a||!inventoryEffectActive(i,ref)||s.left<a.cost)return null;
 let vanished=false,lastRoll=null;
 if(q.vanish&&a.cost>0&&s.left===a.cost){
  lastRoll=roll(20);
  if(!Number.isSafeInteger(lastRoll)||lastRoll<1||lastRoll>20)return null;
  vanished=lastRoll===1;
 }
 s.left-=a.cost;
 if(vanished){i.qty=0;i.eq=false;i.attuned=false;}
 return {name:a.name,kind:a.kind,cost:a.cost,left:s.left,vanished,lastRoll,dc:q.dc};
}
function itemChargeDawn(i,ref,roll){
 const q=itemChargeContract(ref),s=itemChargeState(i,ref);
 if(!s||s.left>=q.max)return null;
 const r=q.recharge.dice?roll(q.recharge.dice):0;
 if(!Number.isSafeInteger(r)||r<(q.recharge.dice?1:0)||r>q.recharge.dice)return null;
 const gained=Math.min(q.max-s.left,r+q.recharge.add);s.left+=gained;
 return {gained,left:s.left};
}
function itemConsumableReady(i,ref){
 // Exclude scroll families, ammunition and other uncertain uses: player must resolve
 // exact single-use potion or level-specific scroll rules before recording consumption.
 return !!ref&&!itemRulesIncomplete(ref)&&ref.cons===true&&Number.isSafeInteger(+i.qty)&&+i.qty>0&&(!inventoryNeedsAttunement(i,ref)||i.attuned)&&
  (ref.cat==="Potion"||(/^Spell Scroll \((?:Level [1-9]|Cantrip)\)$/.test(ref.n)&&ref.cat==="Scroll"));
}
function itemConsume(i,ref){
 if(!itemConsumableReady(i,ref))return false;
 i.qty=+i.qty-1;if(i.qty===0){i.eq=false;i.attuned=false;}return true;
}
function inventoryItemResourceHTML(i,ref){
 const q=itemChargeContract(ref),s=itemChargeState(i,ref);
 let html="";
 if(q){
  if(+i.qty!==1)html='<p class="hint">Charge tracking requires one physical item per inventory row. Separate multiple copies before tracking charges.</p>';
  else if(!s)html='<div class="actions"><label>Current charges (confirm with DM)<input type="number" min="0" max="'+q.max+'" step="1" data-item-charge-start value="'+q.max+'"></label><button class="btn sm" type="button" data-item-init>Set current charges</button></div>';
  else html='<div><p><b>Charges: '+s.left+' / '+q.max+'</b></p><p class="hint">Resolve the effect using the item rules. These controls track charges only, not spell slots, targeting, concentration, or duration. Dawn is a campaign event, not a long rest.</p><div class="actions">'+q.actions.map((a,k)=>'<button class="btn sm" type="button" data-item-use="'+k+'" '+(inventoryEffectActive(i,ref)&&s.left>=a.cost?'':'disabled')+'>'+esc(a.name)+' ('+a.cost+' charges)</button>').join("")+'<button class="btn sm" type="button" data-item-dawn '+(s.left===q.max?'disabled':'')+'>Record dawn recharge</button></div></div>';
 }
 if(itemConsumableReady(i,ref))html+='<p class="hint">Resolve the potion or scroll manually first. Record consumption only when the rules expend it.</p><button class="btn sm" type="button" data-item-consume>Record one consumed</button>';
 return html;
}
function inventoryDetailsButton(i, label = "Item details") {
  return `<button class="btn sm" type="button" data-item-details="${esc(i.id)}" aria-label="${esc(label + (i.n ? " for " + i.n : ""))}">${esc(label)}</button>`;
}

function inventoryInfusionDescription(c,i){
  const {name,damageType}=i.artificerInfusion,spec=LEGACY_INFUSION_CONTRACTS[name];
  const bonus=[["armor","AC"],["weapon","weapon attack and damage rolls"],["focus","spell attack rolls"]]
    .filter(([kind])=>spec[kind]).map(([kind,label])=>"+"+spec[kind](artificerInfusionLevel(c))+" to "+label+".");
  const selected=INFUSION_RESISTANCES.includes(damageType)?"Resistance to "+damageType+" damage.":"";
  return [...bonus,spec.text,selected].filter(Boolean).join(" ");
}

function inventoryEffectsHTML(c) {
  const entries = (c.inv || []).flatMap(i => {
    if(+i.qty<=0)return [];
    const tinkering=i.artificerTinkering;
    if(edOf(c)==="2014"&&clsLv(c,"Artificer")>=1&&tinkering?.owner===c.id&&ARTIFICER_TINKER_PROPERTIES[tinkering.kind]){
      return ['<details><summary>'+esc(i.n)+' · Magical Tinkering</summary><p>'+esc(ARTIFICER_TINKER_PROPERTIES[tinkering.kind])+'</p></details>'];
    }
    if(artificerInfusions(c).includes(i)&&LEGACY_INFUSION_CONTRACTS[i.artificerInfusion.name]){
      const name=i.artificerInfusion.name,spec=LEGACY_INFUSION_CONTRACTS[name],att=spec?.att&&!i.attuned;
      return ['<details><summary>'+esc(i.n)+' · '+esc(name)+'</summary><p>'+esc(inventoryInfusionDescription(c,i))+(att?' Requires attunement.':'')+(!i.eq?' Carried.':'')+'</p></details>'];
    }
    if (!i.eq || +i.qty <= 0) return [];
    const ref = inventoryCatalogItem(i, edOf(c));
    if (!ref || ref.kind === "gear" || !ref.d || !inventoryEffectActive(i, ref)) return [];
    return [`<details><summary>${esc(i.n)}</summary>${itemRuleNotice(ref)?`<p class="hint">${esc(itemRuleNotice(ref))}</p>`:""}${spFormat(String(ref.d))}</details>`];
  });
  return entries.length ? `<div class="inventory-effects"><h4>Magic item effects</h4>${entries.join("")}</div>` : "";
}

function inventoryWeaponChoices(ref, ed) {
  if (ref?.cat !== "Weapon" && !/^Weapon\b/i.test(String(ref?.type || ""))) return [];
  const type = String(ref.type || "").toLowerCase();
  const qualifier = type.match(/^weapon\s*\(([^)]+)\)/)?.[1];
  const matches = IT.data[ed].filter(eqIsWeapon);
  const sword = x => /sword|rapier|scimitar/.test(x.n.toLowerCase());
  const axe = x => /axe/.test(x.n.toLowerCase());
  switch (qualifier) {
    case "any": return matches;
    case "any simple or martial": return matches.filter(x => /^(simple|martial) /i.test(x.cat));
    case "any melee weapon": return matches.filter(x => /\bmelee\b/i.test(x.cat));
    case "any ranged weapon": return matches.filter(x => /\branged\b/i.test(x.cat));
    case "any axe": return matches.filter(axe);
    case "any axe or sword": return matches.filter(x => axe(x) || sword(x));
    case "any sword": return matches.filter(sword);
    case "any sword that deals slashing damage":
      return matches.filter(x => sword(x) && x.st.some(([k, v]) => k === "Damage" && /slashing/i.test(v)));
    default: {
      if (!qualifier && /^weapon(?:,|$)/.test(type)) return matches;
      const names = (qualifier || "").split(/,\s*(?:or\s+)?|\s+or\s+/);
      return matches.filter(x => names.includes(x.n.toLowerCase()));
    }
  }
}

function inventoryArmorChoices(ref, ed) {
  const qualifier = String(ref?.type || "").toLowerCase().match(/^armor\s*\(([^)]+)\)/)?.[1];
  if (!qualifier) return [];
  const [included, excluded] = qualifier.replace(/^any\s+/, "").split(/,\s*(?:except|but not)\s+/);
  const names = included.split(/,\s*(?:or\s+)?|\s+or\s+/);
  const normalize = name => name.replace(/-/g, " ").replace(/ armor$/, "");
  return IT.data[ed].filter(x => {
    if (!eqIsArmor(x)) return false;
    const name = normalize(x.n.toLowerCase());
    return (!excluded || name !== normalize(excluded))
      && names.some(choice => normalize(choice) === name || choice === armorKind(x));
  });
}

function openInventoryDetails(c, i, trigger) {
  const ed = edOf(c), ref = inventoryCatalogItem(i, ed);
  const resourceItem=()=>artificerInfusionChargeItem(c,i)||inventoryCatalogItem(i,edOf(c));
  const infused=artificerInfusions(c).includes(i)&&LEGACY_INFUSION_CONTRACTS[i.artificerInfusion.name];
  const weapon = eqWeaponOf(i, ed), armor = eqArmorOf(i, ed);
  const stats = ref ? itStats({ ...ref, att: String(ref.att || "") }) : [];
  const selectedAttack = (c.attacks || []).find(a => a.iid === i.id);
  for (const gear of [weapon, armor]) {
    if (gear && gear !== ref) stats.push(...gear.st);
  }
  const enhancement = weapon ? inventoryEnhancement(i, ref, "weapon") : armor ? inventoryEnhancement(i, ref, "armor") : 0;
  if (selectedAttack) {
    stats.push(["Your attack", sgn(selectedAttack.hit) + " to hit"]);
    stats.push(["Your damage", selectedAttack.dmg + " " + selectedAttack.type]);
  }
  if (enhancement) stats.push(["Enhancement", "+" + enhancement + (weapon ? " to attack and damage" : " to AC")]);
  const needsAttunement = inventoryNeedsAttunement(i, ref);
  const status = +i.qty <= 0 ? "Quantity is zero" : !i.eq ? "Carried"
    : needsAttunement && !i.attuned ? "Equipped · awaiting attunement" : "Equipped";
  const weaponChoices = inventoryWeaponChoices(ref, ed);
  const armorChoices = inventoryArmorChoices(ref, ed);
  const choices = weaponChoices.length ? weaponChoices : armorChoices;
  const base = weaponChoices.length ? weapon : armor;
  const field = weaponChoices.length ? "baseWeapon" : "baseArmor";
  const dialog = characterReference(i.n || "Item details", `
    <p class="hint">${esc(status)}${needsAttunement ? " · Requires attunement" : ""}</p>
    ${choices.length > 1 ? `<label class="field">${weaponChoices.length ? "Base weapon" : "Base armor"}<select data-item-base><option value="">Choose base gear</option>${choices.map(x => `<option value="${esc(x.n)}" ${base?.n === x.n ? "selected" : ""}>${esc(x.n)}</option>`).join("")}</select></label>` : ""}
    <div class="sp-stats">${stats.filter(([, value]) => value !== "" && value != null).map(([label, value]) => `<div><span>${esc(label)}</span>${esc(value)}</div>`).join("")}</div>
    ${itemRuleNotice(ref)?'<p class="hint">'+esc(itemRuleNotice(ref))+'</p>':""}
    ${ref?.rulesSource?'<p class="hint">Rules source: '+esc(ref.rulesSource)+(ref.rulesSourcePage?' · page '+esc(String(ref.rulesSourcePage)):Array.isArray(ref.rulesSourceLines)?' · lines '+esc(ref.rulesSourceLines.join('–')):'')+'</p>':""}
    ${infused?`<h3>${esc(i.artificerInfusion.name)}</h3><p>${esc(inventoryInfusionDescription(c,i))}</p>`:""}
    ${i.artificerInfusion?.original?`<p class="hint">Replicate Magic Item · Original object ${esc(i.artificerInfusion.original.n)}</p>`:""}
    ${inventoryItemResourceHTML(i,resourceItem())}
    ${ref?.d ? spFormat(String(ref.d)) : !i.note ? '<p class="hint">No rules description is available for this item.</p>' : ""}
    ${i.note ? `<h3>Inventory notes</h3>${spFormat(String(i.note))}` : ""}`, trigger);
  const refresh=()=>{pcPersist();renderRosterMain();const next=$$("[data-item-details]",$("#rosterMain")).find(b=>b.dataset.itemDetails===i.id);openInventoryDetails(c,i,next);};
  const roll=s=>1+Math.floor(Math.random()*s);
  // The shared confirmation overlay is outside the modal dialog; close the dialog first.
  // Reopen on cancellation or stale state so keyboard and pointer users can continue.
  const confirmItem=async(title,message,label)=>{dialog.close();const yes=await confirmBox(title,message,label);if(!yes)refresh();return yes;};
  $("[data-item-init]",dialog)?.addEventListener("click",()=>{
    const value=$("[data-item-charge-start]",dialog).value;
    if(value.trim()!==""&&itemChargeInitialize(i,resourceItem(),Number(value)))refresh();
  });
  $$("[data-item-use]",dialog).forEach(b=>b.addEventListener("click",async()=>{
    const q=itemChargeContract(resourceItem()),a=q?.actions[+b.dataset.itemUse];if(!a)return;
    if(!await confirmItem("Record item use?",a.name+" — resolve the effect manually and spend "+a.cost+" item charges.","Record use"))return;
    const current=resourceItem();
    const r=itemChargeContract(current)?.key===q.key?itemChargeUse(i,current,+b.dataset.itemUse,roll):null;
    if(!r){refresh();return;}
    refresh();toast(r.name+": "+r.left+" charges left"+(r.lastRoll!==null?" · final-charge d20: "+r.lastRoll+(r.vanished?" — item destroyed":""):"")+".");
  }));
  $("[data-item-dawn]",dialog)?.addEventListener("click",async()=>{
    if(!await confirmItem("Record dawn recharge?","Confirm that a new dawn has occurred in the campaign and this item has not already recharged for that dawn.","Recharge"))return;
    const r=itemChargeDawn(i,resourceItem(),roll);refresh();if(r)toast(r.gained+" charges regained.");
  });
  $("[data-item-consume]",dialog)?.addEventListener("click",async()=>{
    if(!await confirmItem("Record consumption?","Confirm this item was expended under its rules. No spell slot, healing, or other effect is applied automatically.","Consume one"))return;
    itemConsume(i,inventoryCatalogItem(i,edOf(c)));refresh();
  });
  $("[data-item-base]", dialog)?.addEventListener("change", e => {
    i[field] = e.target.value;
    pcPersist();
    renderRosterMain();
    const nextTrigger = $$("[data-item-details]", $("#rosterMain")).find(b => b.dataset.itemDetails === i.id);
    openInventoryDetails(c, i, nextTrigger);
    $("[data-item-base]", dialog)?.focus();
  });
}

$("#rosterMain").addEventListener("click", e => {
  const button = e.target.closest("[data-item-details]");
  if (!button) return;
  const c = rosterCur(), i = c?.inv?.find(x => x.id === button.dataset.itemDetails);
  if (i) openInventoryDetails(c, i, button);
});
