/* Generic, DM-only encounter mechanics. Config and live state are kept in the encounter,
   not on the monster or player-facing feed. All mutations use the normal combat undo. */
const BOSS_SCHEMA = "dmforge-boss-kit";
function bossInt(v, min, max, fallback = min) { const n = Number(v); return v === "" || v == null || !Number.isFinite(n) ? fallback : Math.max(min, Math.min(max, Math.trunc(n))); }
function bossText(v, n = 4000) { return String(v ?? "").trim().slice(0, n); }
function bossConfig(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw Error("Expected a boss configuration object.");
  const list = (v, limit, fn) => (Array.isArray(v) ? v : []).slice(0, limit).map(fn);
  const ids = new Set();
  const id = (v, i, prefix) => { const k = bossText(v, 80) || prefix + (i + 1); if (!/^[a-zA-Z0-9_-]+$/.test(k) || ["__proto__","constructor","prototype"].includes(k)) throw Error("Invalid ID: "+k); if (ids.has(k)) throw Error("Duplicate ID: " + k); ids.add(k); return k; };
  const objects = list(raw.objects, 40, (o, i) => ({ id: id(o.id,i,"object"), name: bossText(o.name,120) || "Object", ac: bossInt(o.ac,1,40,15), hp: bossInt(o.hp,1,9999,30), threshold: bossInt(o.threshold,0,999,0), dc: bossInt(o.dc,0,40,0), immunities: bossText(o.immunities,300), text: bossText(o.text) }));
  const clocks = list(raw.clocks, 20, (o,i) => ({id:id(o.id,i,"clock"), name:bossText(o.name,120)||"Clock", max:bossInt(o.max,1,100,6), auto:o.auto !== false, text:bossText(o.text)}));
  const actions = list(raw.actions, 40, (a,i) => ({ id:id(a.id,i,"action"), name:bossText(a.name,120)||"Lair action", text:bossText(a.text), requires:bossText(a.requires,80), uses:bossInt(a.uses,0,99,0), heal:bossInt(a.heal,0,999,0) }));
  for (const a of actions) if (a.requires && !objects.some(o=>o.id===a.requires)) throw Error("Unknown required object: "+a.requires);
  const phases = list(raw.phases, 12, (p,i) => ({id:id(p.id,i,"phase"),name:bossText(p.name,120)||"Phase",hp:bossInt(p.hp,1,99999,1),text:bossText(p.text)})).sort((a,b)=>b.hp-a.hp);
  const powers = list(raw.powers, 30, (p,i) => ({id:id(p.id,i,"power"),name:bossText(p.name,120)||"Power",text:bossText(p.text),max:bossInt(p.max,1,99,1),reset:["turn","round","manual"].includes(p.reset)?p.reset:"manual"}));
  const slots = Array.from({length:9},(_,i)=>bossInt((raw.slots||[])[i],0,30,0));
  return { app:BOSS_SCHEMA,v:1, name:bossText(raw.name,120)||"Boss & lair", initiative:bossInt(raw.initiative,-50,100,20), repeat:raw.repeat===true, owner:bossText(raw.owner,120), legendary:bossInt(raw.legendary,0,20,0), resistance:bossInt(raw.resistance,0,20,0), slots, actions, objects, clocks, phases, powers, regional:bossText(raw.regional,12000) };
}
function bossFresh(config) {
  return {config, state:{resolved:0,pending:0,last:"",lastRound:0,used:{},objects:Object.fromEntries(config.objects.map(o=>[o.id,{hp:o.hp,disabled:false}])),clocks:Object.fromEntries(config.clocks.map(o=>[o.id,{value:0,stopped:false}])),phases:[],powers:Object.fromEntries(config.powers.map(p=>[p.id,p.max])),legendary:config.legendary,resistance:config.resistance,slots:config.slots.slice()}};
}
function bossOwner(e) { const id=e.bossKit?.config.owner; return id ? e.enemies.find(m=>m.id===id) : null; }
function bossCanAct(e) { const b=e.bossKit, m=bossOwner(e); return !b.config.owner || !!m && m.hp>0 && !(m.conds||[]).some(c=>["incapacitated","unconscious","paralyzed","petrified","stunned"].includes(c.k)); }
function bossAvailable(e,a) { const b=e.bossKit,s=b.state,o=a.requires&&s.objects[a.requires]; return bossCanAct(e)&&(!a.requires||o&&o.hp>0&&!o.disabled)&&(!a.uses||(s.used[a.id]||0)<a.uses)&&(b.config.repeat||s.last!==a.id||s.lastRound!==s.pending-1); }
function bossMark(e, round) { const b=e.bossKit; if(b&&b.config.actions.length&&round>0&&b.state.resolved<round&&!b.state.pending) b.state.pending=round; }
function bossPhase(e) { const b=e.bossKit,m=bossOwner(e); if(!b||!m||m.hp<=0)return; for(const p of b.config.phases) if(m.hp<=p.hp&&!b.state.phases.includes(p.id)) b.state.phases.push(p.id); }
function bossOnTurn(c,e,prevTurn,prevRound) {
  const b=e.bossKit;if(!b)return;const s=b.state, cfg=b.config, round=e.round||0;
  if(round>prevRound&&prevRound>0) {
    for(const k of cfg.clocks){const v=s.clocks[k.id];if(k.auto&&!v.stopped)v.value=Math.min(k.max,v.value+1);}
    for(const p of cfg.powers)if(p.reset==="round")s.powers[p.id]=p.max;
  }
  if(e.turn&&e.turn===cfg.owner){s.legendary=cfg.legendary;for(const p of cfg.powers)if(p.reset==="turn")s.powers[p.id]=p.max;}
  const cur=encOrder(c,e).find(o=>o.key===e.turn);
  if(cur&&cur.init<cfg.initiative)bossMark(e,round);
  bossPhase(e);
}
/* Stop before crossing initiative (ties go first) or wrapping a round. Resolve/skip explicitly,
   then Next turn continues. When the first creature rolls below initiative, bossOnTurn marks it. */
function bossGate(c,e) {
  const b=e.bossKit;if(!b||!b.config.actions.length)return false;
  if(b.state.pending)return true;
  const order=encOrder(c,e).filter(o=>!o.down), i=order.findIndex(o=>o.key===e.turn), r=e.round||1;
  if(i>=0&&b.state.resolved<r&&(i===order.length-1||order[i+1].init<b.config.initiative)){bossMark(e,r);return !!b.state.pending;}
  return false;
}
function bossResolve(e,a) {
  const b=e.bossKit,s=b.state;if(!s.pending)throw Error("No pending lair turn.");
  if(a){if(!bossAvailable(e,a))throw Error("This action is unavailable.");s.used[a.id]=(s.used[a.id]||0)+1;s.last=a.id;s.lastRound=s.pending;const m=bossOwner(e);if(a.heal&&m&&m.hp>0)m.hp=Math.min(m.max,m.hp+a.heal);}
  s.resolved=s.pending;s.pending=0;
}
function bossSeed(e, ownerId) {
  const m=e.enemies.find(x=>x.id===ownerId)||e.enemies.find(x=>x.boss)||e.enemies[0], f=m&&fightMonster(m), mon=f?.mon;
  const legend=mon?.legend||[], traits=mon?.traits||[], lair=mon?.lair||[];
  if(mon?.bossKit) return bossConfig({...mon.bossKit,owner:m.id});
  const slots=Array(9).fill(0); for(const t of traits.map(x=>x.join(" "))) for(const match of t.matchAll(/\b([1-9])(?:st|nd|rd|th)\s+level\s*\((\d+)\s+slots?\)/gi)) slots[+match[1]-1]=+match[2];
  const lr=traits.map(x=>x.join(" ")).join(" ").match(/Legendary Resistance\s*\((\d+)\s*\/\s*Day\)/i);
  return bossConfig({name:mon?.n||"Encounter mechanics",owner:m?.id||"",legendary:legend.length?(mon.legN||3):0,resistance:lr?+lr[1]:0,slots,actions:lair.map((a,i)=>({name:Array.isArray(a)?a[0]:"Lair action "+(i+1),text:Array.isArray(a)?a[1]:a})),powers:[],objects:[],clocks:[],phases:[]});
}
function bossButton(action,label,id="",disabled=false) { return '<button type="button" class="btn sm" data-boss="'+esc(action)+'" data-bid="'+esc(id)+'" '+(disabled?'disabled':'')+'>'+esc(label)+'</button>'; }
function bossPanel(c,e) {
  const b=e.bossKit, selected=FIGHT.sel?.startsWith("foe:")?FIGHT.sel.slice(4):"";
  if(!b) return '<section class="boss-panel"><h3>Boss &amp; lair</h3><p class="muted">Configure initiative actions, resources, objects and objectives for this encounter.</p>'+bossButton("setup","Configure",selected)+'</section>';
  const cfg=b.config,s=b.state,m=bossOwner(e), btn=bossButton, txt=t=>'<p style="white-space:pre-wrap">'+esc(t)+'</p>', row=(t,buttons)=>'<div class="boss-row"><span>'+t+'</span><div>'+buttons+'</div></div>';
  let h='<section class="boss-panel"><h3>'+esc(cfg.name)+'</h3>'+row(esc(m?.name||"Environmental encounter"),btn("edit","Edit / import")+btn("export","Export")+btn("remove","Remove kit"))+
  '<h4>Lair · initiative '+cfg.initiative+'</h4><p role="status">'+(s.pending?'Resolve round '+s.pending+' before advancing.':s.resolved===e.round&&e.round?'Resolved this round.':'Waiting for initiative.')+'</p>';
  for(const a of cfg.actions) h+='<details><summary>'+esc(a.name)+(bossAvailable(e,a)?'':' · unavailable')+'</summary>'+txt(a.text)+btn("action","Use",a.id,!s.pending||!bossAvailable(e,a))+'</details>';
  if(s.pending)h+=btn("skip","Skip lair turn");
  if(cfg.legendary||cfg.resistance||cfg.slots.some(Boolean)||cfg.powers.length) h+='<h4>Boss resources</h4>';
  if(cfg.legendary)h+=row('Legendary actions '+s.legendary+'/'+cfg.legendary,btn("legend","Spend 1","",!s.legendary||!bossCanAct(e)||e.turn===cfg.owner)+btn("legend2","Spend 2","",s.legendary<2||!bossCanAct(e)||e.turn===cfg.owner));
  if(cfg.resistance)h+=row('Legendary resistance '+s.resistance+'/'+cfg.resistance,btn("resist","Use","",!s.resistance||!m||m.hp<=0));
  cfg.slots.forEach((n,i)=>{if(n)h+=row('Spell level '+(i+1)+' · '+s.slots[i]+'/'+n,btn("slot","Spend",String(i),!s.slots[i]||!bossCanAct(e))+btn("slotBack","Restore",String(i),s.slots[i]>=n));});
  for(const p of cfg.powers)h+='<details><summary>'+esc(p.name)+' · '+s.powers[p.id]+'/'+p.max+'</summary>'+txt(p.text)+btn("power","Spend",p.id,!s.powers[p.id]||!bossCanAct(e))+btn("powerBack","Restore",p.id,s.powers[p.id]>=p.max)+'</details>';
  if(cfg.objects.length)h+='<h4>Environmental objects</h4>';
  for(const o of cfg.objects){const v=s.objects[o.id];h+='<details><summary>'+esc(o.name)+' · '+(v.hp===0?'Destroyed':v.disabled?'Disabled':v.hp+'/'+o.hp+' HP')+'</summary>'+txt('AC '+o.ac+' · damage threshold '+o.threshold+(o.dc?' · sabotage DC '+o.dc:'')+(o.immunities?' · immune: '+o.immunities:'')+'\n'+o.text)+'<label>Damage <input type="number" min="0" max="9999" data-boss-damage="'+esc(o.id)+'" value="10"></label>'+btn("damage","Damage",o.id,!v.hp)+btn("disable",v.disabled?'Re-enable':'Disable',o.id,!v.hp)+'</details>';}
  if(cfg.clocks.length)h+='<h4>Objectives &amp; clocks</h4>';
  for(const k of cfg.clocks){const v=s.clocks[k.id];h+='<details open><summary>'+esc(k.name)+' · '+v.value+'/'+k.max+(v.stopped?' · stopped':v.value===k.max?' · complete':'')+'</summary>'+txt(k.text)+btn("clockPlus","+1",k.id,v.stopped||v.value>=k.max)+btn("clockMinus","−1",k.id,!v.value)+btn("clockStop",v.stopped?'Resume':'Stop',k.id)+'</details>';}
  if(cfg.phases.length)h+='<h4>Boss phases</h4>';
  for(const p of cfg.phases)h+='<details '+(s.phases.includes(p.id)?'open':'')+'><summary>'+esc(p.name)+' · '+(s.phases.includes(p.id)?'Triggered':'At '+p.hp+' HP')+'</summary>'+txt(p.text)+'</details>';
  if(cfg.regional)h+='<details><summary>Regional effects</summary>'+txt(cfg.regional)+'</details>';
  return h+'<p class="hint">Apply saves, damage, conditions and map effects using the existing fight and map tools. Resource controls record DM decisions; they do not cast spells.</p></section>';
}
function bossEditor(c,e,ownerId) {
  const config=e.bossKit?.config||bossSeed(e,ownerId), old=document.getElementById("bossConfigEditor");if(old)old.remove();
  const d=document.createElement("dialog");d.id="bossConfigEditor";d.className="boss-editor";d.innerHTML='<h3>Boss &amp; lair configuration</h3><p>Choose a boss, edit the configuration, or load a boss-kit JSON. Saving resets the kit counters, not the encounter HP. Existing state can be undone.</p><label>Boss<select id="bossOwner"><option value="">Environmental encounter</option>'+e.enemies.map(m=>'<option value="'+esc(m.id)+'" '+(m.id===config.owner?'selected':'')+'>'+esc(m.name)+'</option>').join("")+'</select></label><label>Load JSON <input type="file" id="bossFile" accept=".json,application/json"></label><textarea id="bossJSON" rows="19" spellcheck="false" aria-label="Boss configuration JSON"></textarea><p class="hint">Objects, actions, clocks, phases and powers are arrays. Add an object ID to an action’s requires field to link it. See docs/features/boss-lair.md.</p><p id="bossError" role="alert"></p>'+bossButton("saveConfig","Save configuration")+bossButton("cancelConfig","Cancel");
  document.body.append(d);d.querySelector("#bossJSON").value=JSON.stringify(config,null,2);
  d.querySelector("#bossFile").addEventListener("change",async ev=>{try{const f=ev.target.files[0];if(!f)return;if(f.size>300000)throw Error("File too large.");const j=JSON.parse(await f.text());d.querySelector("#bossJSON").value=JSON.stringify(j,null,2);}catch(err){d.querySelector("#bossError").textContent=err.message;}});
  d.addEventListener("click",ev=>{const a=ev.target.closest("[data-boss]")?.dataset.boss;if(a==="cancelConfig"){d.close();return;}if(a!=="saveConfig")return;try{if(curCamp()?.id!==c.id||findEnc(c,e.id)!==e)throw Error("Encounter changed; reopen the editor.");const raw=JSON.parse(d.querySelector("#bossJSON").value);raw.owner=d.querySelector("#bossOwner").value;const cfg=bossConfig(raw),before=combatSnapshot(e);e.bossKit=bossFresh(cfg);e.bossKit.state.resolved=Math.max(0,(e.round||1)-1);if(e.round)bossOnTurn(c,e,null,e.round);combatRecord(e,before,"Configured boss mechanics");Store.save(c);d.close();rerenderEnc(c,e);}catch(err){d.querySelector("#bossError").textContent=err.message;}});
  d.addEventListener("close",()=>d.remove());d.showModal();
}
document.addEventListener("click",ev=>{
  const el=ev.target.closest("#fightWin [data-boss]");if(!el)return;
  const c=curCamp(),e=c&&findEnc(c,FIGHT.eid);if(!e)return;
  const a=el.dataset.boss,id=el.dataset.bid,b=e.bossKit;
  if(a==="setup"||a==="edit"){bossEditor(c,e,id);return;}if(!b)return;
  if(a==="remove"){const before=combatSnapshot(e);e.bossKit=null;combatRecord(e,before,"Removed boss mechanics");Store.save(c);rerenderEnc(c,e);return;}
  if(a==="export"){saveFile("boss-kit.json",new Blob([JSON.stringify({...b.config,owner:""},null,2)],{type:"application/json"}));return;}
  const s=b.state,cfg=b.config,before=combatSnapshot(e),o=cfg.objects.find(x=>x.id===id),k=cfg.clocks.find(x=>x.id===id),p=cfg.powers.find(x=>x.id===id),v=s.objects[id],cl=s.clocks[id];
  try{
    if(a==="action"){const act=cfg.actions.find(x=>x.id===id);if(!act)return;bossResolve(e,act);}
    else if(a==="skip")bossResolve(e,null);
    else if(a==="legend"||a==="legend2"){const n=a==="legend"?1:2;if(!bossCanAct(e)||s.legendary<n||e.turn===cfg.owner)return;s.legendary-=n;}
    else if(a==="resist"&&s.resistance>0)s.resistance--;
    else if(a==="slot"&&s.slots[+id]>0&&bossCanAct(e))s.slots[+id]--;
    else if(a==="slotBack"&&s.slots[+id]<cfg.slots[+id])s.slots[+id]++;
    else if(a==="power"&&p&&s.powers[id]>0&&bossCanAct(e))s.powers[id]--;
    else if(a==="powerBack"&&p&&s.powers[id]<p.max)s.powers[id]++;
    else if(a==="damage"&&o&&v){const n=bossInt([...document.querySelectorAll("[data-boss-damage]")].find(x=>x.dataset.bossDamage===id)?.value,0,9999,0);if(n>=o.threshold)v.hp=Math.max(0,v.hp-n);}
    else if(a==="disable"&&v&&v.hp>0)v.disabled=!v.disabled;
    else if(a==="clockPlus"&&k&&!cl.stopped)cl.value=Math.min(k.max,cl.value+1);
    else if(a==="clockMinus"&&k)cl.value=Math.max(0,cl.value-1);
    else if(a==="clockStop"&&k)cl.stopped=!cl.stopped;
    else return;
    combatRecord(e,before,"Boss: "+(cfg.actions.find(x=>x.id===id)?.name||o?.name||k?.name||p?.name||a));Store.save(c);rerenderEnc(c,e);
  }catch(err){toast(err.message);}
});
