/* 13e-sheet.js: My Characters: the roster and the editable sheet (renderRosterMain) with its event handlers, and older-save upgrades on load. */

function renderRoster() {
  hbPendSync();
  const list = $("#rosterList"), cur = rosterCur();
  const draft = pcIsDraft(currentPC) ? currentPC : null;
  const item = c => `<button class="camp-item ${cur && c.id === cur.id ? "on" : ""}" data-rc="${esc(c.id)}"><b>${esc(c.name)}${window.Portal ? Portal.ownerTag(c) : ""}</b><small>${(c.multi || []).length ? `${esc(c.race)} ${esc(classLine(c))}` : `Lv ${c.level} ${esc(c.race)} ${esc(c.cls)}`}</small></button>`;
  if (list) list.innerHTML = (draft ? `<button class="camp-item pc-draft ${cur === draft ? "on" : ""}" data-rc="${esc(draft.id)}"><b>${esc(draft.name)} <span class="tag">New · not saved</span></b><small>Lv ${draft.level} ${esc(draft.race)} ${esc(draft.cls)}</small></button>` : "")
    + (PCS.roster.length ? PCS.roster.map(item).join("") : draft ? "" : `<p class="muted" style="font-size:15px">No characters yet. Press “⚒ Forge a new character” below, or import one.</p>`);
}
function renderRosterTab() { renderRoster(); renderRosterMain(); }
function renderRosterMain() {
  const c = rosterCur(), main = $("#rosterMain");
  if (!c) { main.innerHTML = `<div class="card empty"><h2>A hero steps from the dark</h2><p>Forge a character: leave anything on Random, or lock in a race, class and level, and get a full 5e sheet. Or build one step by step, or import one from another app.</p><button class="btn primary" type="button" data-draft="forge">⚒ Forge a new character</button></div>`; return; }
  RC.id = c.id; if (!pcIsDraft(c)) rcRemember(c.id); pcEnsure(c);
  c.inv = c.inv || []; c.coins = c.coins || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }; if (c.hpCur === undefined) c.hpCur = c.hp;
  if (c.bgV === 1 && CLASS_DATA[c.cls]) { const cur = c.hpCur; pcLevelTo(c, c.level); c.bgV = 2; if (cur !== undefined && cur !== "") c.hpCur = Math.min(+cur, c.hp); pcPersist(); }
  /* saved before 2026-11-19, when Eldritch Knights and Arcane Tricksters had no spellcasting: rebuild to add it, keeping current HP */
  if (!c.spell && CLASS_DATA[c.cls] && [{ cls: c.cls, lv: c.level, subclass: c.subclass }, ...(c.multi || [])].some(x => x && subCaster(x.cls, x.subclass) && +x.lv >= 3)) { const cur = c.hpCur; pcLevelTo(c, c.level); if (cur !== undefined && cur !== "") c.hpCur = Math.min(+cur, c.hp); pcPersist(); }
  const moved = pcInvUpgrade(c), synced = pcSubSync(c), nums = pcSubNumbers(c);
  let repairedAttunement = false;
  for (const item of c.inv) {
    if (clearUnsupportedAttunement(item, edOf(c))) repairedAttunement = true;
  }
  pcRecompute(c);
  c.attacks = pcAttacks(c);
  if (moved || synced || nums || repairedAttunement) pcPersist();
  main.innerHTML = (pcIsDraft(c) ? draftBarHTML(c) : "") + rosterHTML(c); renderCampList(); $$("textarea", main).forEach(autoGrow);
}
/* A newly forged character is a draft until saved: everything on the sheet works, and this bar keeps, rerolls or discards it.
   Drafts stay in this browser (currentPC, PCS.cur); only saved characters (PCS.roster) go to a signed-in campaign. */
const draftBarHTML = c => `<div class="card draft-bar"><div><b>New character, not saved yet.</b> <span class="muted">Change anything below, then save ${esc(c.name)} to keep them.</span></div>
  <div class="draft-acts"><button class="btn primary sm" type="button" data-draft="keep">☆ Save character</button>${c.custom ? "" : `<button class="btn sm" type="button" data-draft="reroll" title="Forge again with the same choices">↻ Reroll</button>`}<button class="btn sm danger" type="button" data-draft="discard">✕ Discard</button></div></div>`;
function clearUnsupportedAttunement(item, edition) {
  if (!item?.attuned || inventoryNeedsAttunement(item, inventoryCatalogItem(item, edition))) return false;
  item.attuned = false;
  return true;
}
function inventoryAttunementCount(c) {
  const count=artificerAttunedCount(c),limit=artificerAttunementLimit(c);
  return `<b id="rcAttunementCount" class="${count > limit ? "over" : ""}">${count} / ${limit}</b>`;
}
function quickSheetActions(c) {
  const attackIndex = c.attacks.findIndex(a => !a.save);
  const attack = c.attacks[attackIndex];
  return `
    <button type="button" class="btn sm" data-quick-roll="init">Initiative</button>
    ${edOf(c)==="2024"&&classFeatureLevel(c,"Sorcerer")>=20?`<button type="button" class="btn sm" data-core-turn>Begin your turn</button>`:""}
    ${attack ? `<button type="button" class="btn sm" data-quick-roll="atk:${attackIndex}">Roll ${esc(attack.name)}</button>` : ""}
    <button type="button" class="btn sm" data-jump="attacks">Attacks</button>
    ${hasSheetSpells(c) ? '<button type="button" class="btn sm" data-jump="spells">Spells</button>' : ""}
    <button type="button" class="btn sm" data-jump="conditions">Conditions</button>`;
}
const hasSheetSpells = c => !!c.spell || (c.prepared || []).some(p => p.src) ||
  (edOf(c) === "2014" && c.race === "Elf" && c.sub === "High Elf");
function quickSheetHTML(c) {
  const conditions = CONDS.filter(([key]) => condOn(c, key)).map(([, label]) => label);
  if (exhOf(c)) conditions.push(`Exhaustion ${exhOf(c)}`);
  return `<section class="card mobile-sheet-quick" aria-label="Character quick controls">
    <h3>${esc(c.name)}</h3>
    <div class="mobile-vitals">
      <label>Current HP <input type="number" inputmode="numeric" min="0" max="${esc(c.hp)}" data-quick-hp value="${esc(c.hpCur)}"></label>
      <span>Max HP <b data-quick-vital="hp">${esc(c.hp)}</b></span>
      <span>Temp HP <b data-quick-vital="hpTemp">${esc(c.hpTemp || 0)}</b></span>
      <span>AC <b data-quick-vital="ac">${esc(c.ac)}</b></span>
    </div>
    ${conditions.length ? `<p>${esc(conditions.join(" · "))}</p>` : ""}
    <div class="mobile-quick-actions">${quickSheetActions(c)}</div>
  </section>`;
}

const armorCastingWarningHTML = c => `<div id="rcArmorCastingWarning" class="enc" style="margin-top:10px" ${c.armorUntrained ? "" : "hidden"}>${esc(ARMOR_CASTING_WARNING)}</div>`;
function subclassPrintingHTML(c){
  const ed=edOf(c),owners=[{cls:c.cls,subclass:c.subclass},...(c.multi||[])];
  return owners.map(({cls,subclass})=>{
    const prints=namedSubclassPrints(ed,cls,subclass);
    if(prints.length<2||!characterSubclassLevel(c,cls,subclass))return "";
    const explicit=characterSubclassPrinting(c,cls),current=subclassEntry(ed,cls,subclass,false,explicit);
    const defaultName=dmBook(subclassEntry(ed,cls,subclass,false)?.src)?.name||"Forge default";
    const options=prints.map(row=>{
      const book=dmBook(row.src)?.name||row.src;
      const page=row.page?` · p. ${row.page}`:"";
      return `<option value="${esc(row.id)}" ${current?.id===row.id&&explicit===row.id?"selected":""}>${esc(book+page)}</option>`;
    }).join("");
    return `<label>${esc(subclass)} source<select data-subclass-print="${esc(cls)}"><option value="">Default · ${esc(defaultName)}</option>${options}</select></label>`;
  }).join("");
}
function setSubclassPrinting(c,cls,printing){
  const row=[{cls:c.cls,subclass:c.subclass},...(c.multi||[])].find(x=>x.cls===cls);
  if(!row?.subclass||printing&&!namedSubclassPrints(edOf(c),cls,row.subclass).some(x=>x.id===printing))return false;
  const previous=c.subclassPrints&&typeof c.subclassPrints==="object"?Object.entries(c.subclassPrints):[];
  c.subclassPrints=Object.fromEntries(previous.filter(([key])=>key!==cls).concat(printing?[[cls,printing]]:[]));
  if(cls==="Druid")endSymbioticEntity(c);
  pcSubSync(c);syncGrantedSpells(c);pcSubNumbers(c);pcRecompute(c);
  return true;
}
function rosterHTML(c) {
  const isb = itemSaveBonus(c), sv = a => c.mods[a] + (c.saves.includes(a) ? c.prof : 0) + isb;
  const D = c.hookDetail || { story: "", questions: [], use: "" };
  const wt = c.inv.reduce((s, i) => s + (+i.w || 0) * (+i.qty || 0), 0);
  const L = c.spell ? spellLimits(c) : null;
  return `${sheetJumpHTML(c)}${quickSheetHTML(c)}<div class="card">
    <div class="row" style="align-items:flex-start;flex-wrap:wrap"><input class="title-input" type="text" data-rf="name" value="${esc(c.name)}" aria-label="Character name" style="flex:1 1 260px">
      <div style="flex:0 1 auto;min-width:0;display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" type="button" data-ra="sheet">⎙ Export character sheet</button><button class="btn sm" type="button" data-ra="cards" title="Printable cards for this character's prepared spells">🃏 Spell cards</button><button class="btn sm" type="button" data-ra="copy">Copy as text</button><button class="btn sm danger" type="button" data-ra="del">✕ Delete</button></div></div>
    <div class="gen-sub"><span class="tag gold">${esc(raceLabel(c))} ${esc((c.multi || []).length ? classLine(c) : c.cls)}</span>${(c.multi || []).length ? `<span class="tag">Level ${totalLv(c)}</span>` : ""}<span class="tag">${esc(edOf(c))} rules</span><span class="tag">${esc(c.bg)}</span>${c.custom ? `<span class="tag">Custom build</span>` : ""}</div>
    <div class="rc-grid">
      ${subclassPrintingHTML(c)}
      <label>Level<input type="number" min="1" max="20" data-rlv="1" value="${c.level}"></label>
      <label>Gender<select data-rf="gender">${c.gender ? "" : `<option value="">Not set</option>`}${GENDERS.map(([v, l]) => `<option value="${v}" ${c.gender === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label>Alignment<input type="text" data-rf="align" value="${esc(c.align || "")}"></label>
      <label>Player<input type="text" data-rf="player" value="${esc(c.player || "")}" placeholder="Player name"></label>
      <label>Experience<input type="number" min="0" data-rf="xp" value="${esc(c.xp ?? "")}" placeholder="XP"></label>
    </div>
    ${lvBarHTML(c)}
    <div class="actions">
      ${[c, ...(c.multi || [])].filter(x => Object.hasOwn(CLASS_DATA, x.cls)).map(x => progressionButton(edOf(c), "class", x.cls, x.subclass || "", x.cls + " progression")).join("")}
      ${Object.hasOwn(PC_RACES[edOf(c)], c.race) ? progressionButton(edOf(c), "species", c.race, c.sub || c.ancestry || "", "Species progression") : ""}
    </div>
    ${hbRejectedHTML(c)}${hbStale(c) ? `<div class="lv-bar"><span class="lv-need">⚠ Homebrew this character uses has changed.</span><button class="btn sm" type="button" data-hbupdate="${esc(c.id)}" title="Rebuilds the numbers from the homebrew; current HP, notes, inventory and spells stay">Update sheet</button></div>` : ""}
    <p class="hint">Changes save automatically. Level up, or changing the level, rebuilds hit points, proficiency, features, spell slots and ability scores for the new level; your notes, inventory and spells stay.</p>
    <div class="pc-actions"><select class="campSelect" id="rcCamp" aria-label="Campaign"></select><button class="btn primary sm" type="button" data-ra="camp">+ Add to campaign party</button></div>
  </div>
  ${readinessHTML(c)}
  <div class="card"><div class="sec-h"><h3>Ability Scores & Vitals</h3><span class="sp"></span><div class="rest-btns"><button class="btn primary" type="button" data-rest="short" title="One hour: spend hit dice to heal and regain short-rest abilities">☾ Short rest</button><button class="btn primary" type="button" data-rest="long" title="Eight hours: full hit points, spell slots and abilities, and hit dice back">✦ Long rest</button></div></div>
    <p class="hint" style="margin:-4px 0 10px">Edit a score and everything that uses it updates.</p>
    <div class="abil">${AB.map(a => `<div class="ab"><div class="n">${AB_NAME[a]}</div><button type="button" class="m roll-b" data-roll="check:${a}" title="Roll a ${AB_FULL[a]} check">${rollMark(c, "check", a)}${sgn(c.mods[a])}</button><input type="number" min="1" max="30" class="ab-in" data-rs="${a}" value="${c.scores[a]}" aria-label="${AB_FULL[a]} score"><button type="button" class="sv roll-b ${c.saves.includes(a) ? "p" : ""}" data-roll="save:${a}" title="Roll a ${AB_FULL[a]} saving throw">save ${sgn(sv(a))}${c.saves.includes(a) ? " ●" : ""}${rollMark(c, "save", a)}</button></div>`).join("")}</div>
    <div class="vitals" id="sec-hp">
      ${[["hp", "Max HP"], ["hpCur", "Current HP"], ["hpTemp", "Temp HP"], ["ac", "Armor class"], ["speed", "Speed (ft)"]].map(([k, l]) => `<div class="vit"><input type="number" data-rf="${k}" value="${esc(c[k] ?? "")}" aria-label="${l}"><span>${l}</span></div>`).join("")}
      <div class="vit"><button type="button" class="roll-b vit-roll" data-roll="init" title="Roll initiative">${rollMark(c, "init", "dex")}${sgn(c.init)}</button><span>Initiative</span></div><div class="vit"><b>${sgn(c.prof)}</b><span>Proficiency</span></div><div class="vit"><b>${c.passive}</b><span>Passive Perc.</span></div><div class="vit">${resCtr(c, pcResources(c).find(r => r.key === "hd"))}<span>Hit dice (d${c.hd})</span></div>
    </div><div id="rcSpeedLine">${rcSpeedLine(c)}</div>${defHTML(c)}<div id="sec-conditions">${rcStatusHTML(c)}</div></div>
  <div class="grid2 rc-two" style="margin-top:0">
    <div class="sec"><div class="sec-h"><h3>Skills</h3><span class="sp"></span><span class="muted" style="font-size:13px">Click a name to cycle none → ● → ★; click a number to roll</span></div>
      <div class="skills">${c.skills.map((s, i) => `<div class="${s.p ? "p" : ""} ${s.x ? "x" : ""} rc-sk"><button type="button" class="sk-name" data-rsk="${i}" title="Change proficiency">${s.p ? "● " : ""}${esc(s.s)} <span class="muted" style="font-size:12px">${AB_NAME[s.ab]}</span></button><button type="button" class="sk-roll roll-b" data-roll="skill:${i}" title="Roll ${esc(s.s)}">${rollMark(c, "check", s.ab, { skill: s.s })}${sgn(s.v)}</button></div>`).join("")}</div></div>
    <div class="sec" id="sec-attacks"><div class="sec-h"><h3>Attacks</h3></div>
      <div id="rcAtk">${rcAttacksHTML(c)}</div>
      <p class="hint" style="margin:4px 0 0">${pcFx(c).form ? "From your beast form. End Wild Shape under Abilities to go back." : "From your equipped weapons. Tick <b>Equip</b> in the inventory to change them."}</p>
      ${fightSlots(c) ? `<div class="field" style="margin:10px 0 0"><label>Fighting style${fightSlots(c) > 1 ? "s" : ""}</label><div class="row" style="flex-wrap:wrap">${[...Array(fightSlots(c)).keys()].map(n => `<select data-fstyle="${n}" aria-label="Fighting style ${n + 1}"><option value="">Choose…</option>${fightStyleOptions(c).filter(o => o === (c.fightStyles || [])[n] || !(c.fightStyles || []).includes(o)).map(o => `<option ${(c.fightStyles || [])[n] === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`).join("")}</div>${(c.fightStyles || []).slice(0, fightSlots(c)).filter(Boolean).map(o => `<p class="hint" style="margin:4px 0 0"><b>${esc(o)}:</b> ${esc(FIGHT_STYLES[o])}</p>`).join("")}</div>` : ""}
      ${(c.extras || []).length ? `<ul class="plain" style="margin-top:10px">${c.extras.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    </div>
  </div>
  <div class="sec"><div class="sec-h"><h3>Abilities</h3><span class="sp"></span><span class="muted" style="font-size:13px">Actions, reactions and boosts from your features · − spends a use, + gives one back</span></div><div id="rcAbl">${rcAbilitiesHTML(c)}</div></div>
  ${c.spell ? `<div class="sec" id="sec-spells"><div class="sec-h"><h3>Spells</h3><span class="sp"></span><button class="btn sm" type="button" data-ra="prep">✦ Prepare spells</button></div>
    <div class="spell-top">${armorCastingWarningHTML(c)}<p style="margin:0 0 4px"><b>Spell save DC ${esc(c.spell.dc)}</b> · spell attack ${esc(sgn(c.spell.atk))} · ability ${AB_NAME[c.spell.ab]}${(c.spell.others || []).length ? ` <span class="muted">(${esc(c.spell.cls || c.cls)})</span>` : ""}</p>${(c.spell.others || []).map(o => `<p style="margin:0 0 4px"><b>${esc(o.cls)}: DC ${esc(o.dc)}</b> · spell attack ${esc(sgn(o.atk))} · ${AB_NAME[o.ab]}</p>`).join("")}
        ${rcSlotsHTML(c)}
        <button class="btn sm" type="button" style="margin-top:10px" data-spells="${esc(c.spell.list || c.spell.cls || c.cls)}|${esc(c.spell.max)}|${c.spell.cantrips ? 1 : 0}">✦ Browse ${esc(c.spell.cls || c.cls)} spells</button></div>
    ${speciesSpellChoicesHTML(c)}${wizardSpellChoicesHTML(c)}
    <div class="prep-h">${L.word === "known" ? "Spells known" : "Prepared spells"}</div>
    <div id="rcPrepared">${preparedHTML(c, true)}</div>${prepPanelHTML(c, "rc")}</div>` : hasSheetSpells(c) ? `<div class="sec" id="sec-spells"><div class="sec-h"><h3>Spells</h3><span class="sp"></span></div>${armorCastingWarningHTML(c)}${speciesSpellChoicesHTML(c)}<div id="rcPrepared">${preparedHTML(c, true)}</div></div>` : ""}
  ${profSecHTML(c)}
  ${backgroundSelectionsHTML(c)}
  ${featsSecHTML(c)}
  ${compSectionHTML(c)}
  <div class="sec" id="sec-gear"><div class="sec-h"><h3>Inventory</h3><span class="sp"></span><a class="btn sm" href="#items" data-ra="browse" style="text-decoration:none">Browse items</a><button class="btn sm primary" type="button" data-ra="addInv">+ Add item</button></div>
    <div class="row rc-coins">${["cp", "sp", "ep", "gp", "pp"].map(k => `<label>${k.toUpperCase()}<input type="number" min="0" data-rcoin="${k}" value="${+c.coins[k] || 0}"></label>`).join("")}</div>
    ${c.inv.length ? `<table class="foes rc-inv"><thead><tr><th>Qty</th><th>Item</th><th>Notes</th><th>Equip</th><th>Attuned</th><th></th></tr></thead><tbody>${c.inv.map(i => `<tr>
      <td><input type="number" min="0" data-rinv="qty" data-iid="${esc(i.id)}" value="${esc(i.qty)}" style="width:64px" aria-label="Quantity"></td>
      <td><input type="text" data-rinv="n" data-iid="${esc(i.id)}" value="${esc(i.n)}" placeholder="Item name" aria-label="Item">${inventoryDetailsButton(i)}</td>
      <td><input type="text" data-rinv="note" data-iid="${esc(i.id)}" value="${esc(i.note || "")}" placeholder="Notes" aria-label="Notes"></td>
      <td><input type="checkbox" data-rinv="eq" data-iid="${esc(i.id)}" ${i.eq ? "checked" : ""} aria-label="Equip ${esc(i.n)}"></td>
      <td data-attunement-cell>${inventoryAttunementControl(i, edOf(c))}</td>
      <td><button class="icon-btn" type="button" data-rdel="${esc(i.id)}" title="Remove">✕</button></td></tr>`).join("")}</tbody></table>` : `<p class="muted">Nothing carried yet. Add items here, or give them from the Items tab.</p>`}
    <p class="hint">Attuned to ${inventoryAttunementCount(c)} magic items · ${(() => { const LD = pcLoad(c); return `carrying <b class="${LD.lb > LD.cap ? "over" : ""}">${LD.lb} lb</b> of ${LD.cap} lb${LD.lb > LD.cap ? " — over your carrying capacity: speed 5 ft" : LD.variant && LD.lb > LD.heavy ? " — heavily encumbered" : LD.variant && LD.lb > LD.enc ? " — encumbered" : ""}`; })()}.</p>
    ${edOf(c) === "2014" ? `<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" data-varenc ${c.varEnc ? "checked" : ""}> Use variant encumbrance (−10 ft over ${pcLoad(c).enc} lb, −20 ft and disadvantage over ${pcLoad(c).heavy} lb)</label>` : ""}</div>
  <div class="grid2 rc-two" style="margin-top:0">
    <div class="sec"><div class="sec-h"><h3>Features & Traits</h3></div>${featuresListHTML(c, true)}<div id="rcItemFeatures">${inventoryEffectsHTML(c)}</div>
      <textarea data-rf="featNotes" placeholder="Extra features, feats, boons…" style="margin-top:8px">${esc(c.featNotes || "")}</textarea></div>
    <div class="sec"><div class="sec-h"><h3>Equipped Items</h3></div><div id="rcEquipped">${rcEquippedHTML(c)}</div><div id="rcACLine">${rcACLine(c)}</div></div>
  </div>
  <div class="sec" id="sec-notes"><div class="sec-h"><h3>Personality & Backstory</h3></div>
    <div class="rc-grid2">${[["trait", "Personality trait"], ["ideal", "Ideal"], ["bond", "Bond"], ["flaw", "Flaw"]].map(([k, l]) => `<label>${l}<input type="text" data-rf="${k}" value="${esc(c[k] || "")}"></label>`).join("")}</div>
    <label class="lbl" style="margin-top:12px">Hook</label><input type="text" data-rf="hook" value="${esc(c.hook || "")}">
    <label class="lbl" style="margin-top:12px">Backstory</label><textarea data-rf="hd.story" style="min-height:100px">${esc(D.story)}</textarea>
    <label class="lbl" style="margin-top:12px">Unanswered questions (one per line)</label><textarea data-rf="hd.questions">${esc((D.questions || []).join("\n"))}</textarea>
    <label class="lbl" style="margin-top:12px">For the DM</label><textarea data-rf="hd.use">${esc(D.use || "")}</textarea>
    <label class="lbl" style="margin-top:12px">Appearance</label><textarea data-rf="look" placeholder="Age, height, eyes, hair, distinguishing marks…">${esc(c.look || "")}</textarea>
    <label class="lbl" style="margin-top:12px">Notes</label><textarea data-rf="notes" placeholder="Allies, rivals, session notes…">${esc(c.notes || "")}</textarea>
  </div>${rollDockHTML(c)}`;
}
/* Phones: a bar of shortcuts to the parts of the sheet you need mid-fight. It stays under the header (or at the very top
   while the header is away); the sections' scroll-margin keeps them clear of both. */
const sheetJumpHTML = c => `<div id="sheetJump" class="sheet-jump" role="navigation" aria-label="Jump to part of the sheet">${[["hp", "❤ HP"], ["attacks", "⚔ Attacks"], ...(hasSheetSpells(c) ? [["spells", "✦ Spells"]] : []), ["gear", "🎒 Gear"], ["notes", "📝 Notes"]].map(([k, l]) => `<a role="button" tabindex="0" data-jump="${k}">${l}</a>`).join("")}</div>`;
function sheetJump(k) {
  const t = document.getElementById("sec-" + k); if (!t) return; foldOpen(t);
  t.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth", block: "start" });
}
document.addEventListener("click", e => { const a = e.target.closest("[data-jump]"); if (a) { e.preventDefault(); sheetJump(a.dataset.jump); } });
document.addEventListener("keydown", e => { const a = e.target.closest && e.target.closest("[data-jump]"); if (a && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); sheetJump(a.dataset.jump); } });
// how many Spells filters are on (shown on the phone's Filters button)
function spFilterCount() {
  const f = document.getElementById("spForm"); if (!f) return 0;
  return ["spClass", "spSchool", "spTime", "spConc", "spDmg", "spSave", "spBook"].filter(id => (document.getElementById(id) || {}).value).length
    + f.querySelectorAll("#spLevels .chip.on").length + ["spRitual", "spNoM", "spFav"].filter(id => (document.getElementById(id) || {}).checked).length;
}
function spFiltersSync() { const b = document.getElementById("spFiltersBtn"); if (!b) return; const n = spFilterCount(), open = document.getElementById("spForm").classList.contains("filters-open"); b.textContent = `${open ? "▴" : "▾"} Filters${n ? ` · ${n} on` : ""}`; b.setAttribute("aria-expanded", String(open)); }
document.getElementById("spFiltersBtn").addEventListener("click", () => { document.getElementById("spForm").classList.toggle("filters-open"); spFiltersSync(); });
["change", "click", "input"].forEach(ev => document.getElementById("spForm").addEventListener(ev, () => setTimeout(spFiltersSync)));
spFiltersSync();
(function initRoster() {
  $("#rosterList").addEventListener("click", e => { const b = e.target.closest("[data-rc]"); if (b) { RC.id = b.dataset.rc; CB.on = false; pcShow("sheet"); renderRosterTab(); rosterFoldPhone(); showResult("#rosterMain"); } });
  const main = $("#rosterMain");
  const resSet = (c, key, left) => { const r = pcResources(c).find(x => x.key === key); if (!r || r.max === Infinity) return; c.used = c.used || {}; c.used[key] = r.max - clamp(left, 0, r.max); pcPersist(); renderRosterMain(); };
  main.addEventListener("click", e => {
    const c = rosterCur(); if (!c) return;
    const review = e.target.closest("[data-readiness], [data-readiness-reviewed]");
    if (review) {
      if (review.hasAttribute("data-readiness-reviewed")) {
        delete c.importReview; pcPersist(); renderRosterMain();
      } else {
        const target = main.querySelector(review.dataset.readiness);
        const fold = target?.closest(".folded");
        fold?.querySelector(".fold-btn")?.click();
        target?.focus();
      }
      return;
    }
    if(e.target.closest("[data-bgkit]")){if(backgroundEquipmentClaim(c)){pcRecompute(c);pcPersist();renderRosterMain();toast("Background starting equipment added.");}return;}
    const br=e.target.closest("[data-bgchoice-remove]");
    if(br){if(backgroundSelectionChange(c,br.dataset.bgchoiceRemove,br.dataset.bgchoiceValue,true)){pcPersist();renderRosterMain();}return;}
    if(e.target.closest("[data-core-turn]")){if(edOf(c)==="2024"&&classFeatureLevel(c,"Sorcerer")>=20){delete c.apotheosisUsedThisTurn;pcPersist();renderRosterMain();toast("New turn: Arcane Apotheosis allowance reset.");}return;}
    if(e.target.closest("[data-wizard-book-start]")){if(wizardBookStart(c)){syncGrantedSpells(c);pcPersist();renderRosterMain();}return;}
    const wr=e.target.closest("[data-wizard-book-remove]");if(wr){if(wizardBookRemove(c,wr.dataset.wizardBookRemove)){syncGrantedSpells(c);pcPersist();renderRosterMain();}else toast("Remove this spell from prepared and class-feature choices first.");return;}
    const cr = e.target.closest("[data-choicerm]");
    if (cr) { const [k, ...id] = cr.dataset.choicerm.split("|"); c.choices = { ...(c.choices || {}) }; c.choices[k] = choiceOf(c, k).filter(x => x !== id.join("|")); if(k==="Replicate Magic Item")artificerForgetPlan(c,id.join("|")); syncGrantedSpells(c); pcRecompute(c); pcPersist(); renderRosterMain(); return; }
    const mr = e.target.closest("[data-mirm]");
    if (mr) { const k = "Feat: Magic Initiate"; c.choices = { ...(c.choices || {}) }; c.choices[k] = choiceOf(c, k).filter(x => x !== mr.dataset.mirm); syncGrantedSpells(c); pcRecompute(c); pcPersist(); renderRosterMain(); return; }
    const cb = e.target.closest("[data-spell]");
    if (cb && cb.closest("#rcPrepared")) { const [ed, ...n] = cb.dataset.spell.split("|"); castDialog(c, ed, n.join("|")); return; }
    const rb = e.target.closest("[data-roll], [data-quick-roll]");
    if (rb) {
      const [k, v] = (rb.dataset.roll || rb.dataset.quickRoll).split(":"), xb = itemSaveBonus(c);
      if (k === "check") rollD20(c, `${AB_FULL[v]} check`, c.mods[v], "check", v);
      else if (k === "save") rollD20(c, `${AB_FULL[v]} save`, c.mods[v] + (c.saves.includes(v) ? c.prof : 0) + xb, "save", v);
      else if (k === "skill") { const s = c.skills[+v]; rollD20(c, s.s, s.v, "check", s.ab, { skill: s.s }); }
      else if (k === "init") {
        rollD20(c,"Initiative",c.init,"init","dex");
        if(arcaneArcherInitiative(c)){pcPersist();renderRosterMain();toast("Ever-Ready Shot restored one Arcane Shot use.");}
        if(samuraiInitiative(c)){pcPersist();renderRosterMain();toast("Tireless Spirit restored one Fighting Spirit use.");}
      }
      else if (k === "atk") { const a = c.attacks[+v]; const r = rollD20(c, `${a.name} attack`, a.hit, "attack", a.ab, { tags: a.tags, crit: a.crit }); ROLL.lastCrit = r && r.crit ? a.name : ""; }
      else if (k === "dmg") { const a = c.attacks[+v]; rollDamage(c, `${a.name} damage`, a, ROLL.lastCrit === a.name); ROLL.lastCrit = ""; }
      return;
    }
    if (e.target.closest("[data-rdtoggle]")) { ROLL.open = !ROLL.open; $("#rollDock").outerHTML = rollDockHTML(c); const t = $("[data-rdtoggle]"); if (t) t.focus(); return; }
    if (e.target.matches("[data-rdshare]")) { localStorage.setItem(SHARE_ROLLS_KEY, e.target.checked ? "1" : "0"); toast(e.target.checked ? "Your rolls now show in the DM's activity feed" : "Your rolls stay on your screen"); return; }
    if (e.target.closest("[data-rdclear]")) { c.rollLog = []; pcPersist(); $("#rollDock").outerHTML = rollDockHTML(c); return; }
    const cd = e.target.closest("[data-cond]");
    if (cd) { const k = cd.dataset.cond; c.conds = { ...(c.conds || {}) }; if (c.conds[k]) delete c.conds[k]; else c.conds[k] = true; if (k === "unconscious") delete c.condAuto; if (c.conds[k] && COND_INCAP.includes(k) && c.conc) { toast(`${cap1(k)}: concentration on ${c.conc.spell} ends.`); delete c.conc; delete c.concCheck; } pcRecompute(c); pcPersist(); renderRosterMain(); const f = $(`[data-cond="${k}"]`, main); if (f) f.focus(); return; }
    const ex = e.target.closest("[data-exh]");
    if (ex) { c.exh = clamp(exhOf(c) + +ex.dataset.exh, 0, 6); pcRecompute(c); pcPersist(); renderRosterMain(); const f = $(`[data-exh="${ex.dataset.exh}"]`, main); if (f && !f.disabled) f.focus(); return; }
    if (e.target.closest("[data-concend]")) { toast(`Concentration on ${c.conc.spell} ends.`); delete c.conc; delete c.concCheck; pcPersist(); renderRosterMain(); return; }
    if (e.target.closest("[data-concsave]")) { concSave(c); pcPersist(); renderRosterMain(); return; }
    if (e.target.closest("[data-deathsave]")) { deathSave(c); pcRecompute(c); pcPersist(); renderRosterMain(); return; }
    if (e.target.closest("[data-stabilize]")) { c.death = { s: 0, f: 0, stable: true }; pcPersist(); renderRosterMain(); toast(`${c.name} is stable at 0 hit points.`); return; }
    if (e.target.closest("[data-revive]")) { c.death = { s: 0, f: 0 }; c.hpCur = 1; pcHealed(c, true); pcRecompute(c); pcPersist(); renderRosterMain(); return; }
    const comp=e.target.closest("[data-companion-op]");
    if(comp){
      const key=comp.dataset.companionKey,op=comp.dataset.companionOp;if(!Object.hasOwn(SUB_COMPANIONS,key))return;
      let msg="";
      if(op==="summon")msg=companionSummon(c,key,$('[data-companion-form="'+key+'"]',main)?.value,$('[data-companion-pay="'+key+'"]',main)?.value);
      else if(op==="revive")msg=companionRevive(c,key,$('[data-companion-revive="'+key+'"]',main)?.value,$('[data-companion-recent="'+key+'"]',main)?.checked);
      else if(op==="finish")msg=companionFinishRevive(c,key);
      else if(op==="dismiss"&&["drake","wildfire"].includes(key)&&c.subCompanions){delete c.subCompanions[key];msg="Summon ended.";}
      else msg=companionRoll(c,key,op);
      pcRecompute(c);pcPersist();renderRosterMain();
      if(msg&&typeof msg==="object"){if(msg.aoe)actAoeDialog(c,msg);else if(msg.amount)actResultDialog(c,msg);else toast(msg.msg);}else if(msg)toast(msg);return;
    }
    const ab = e.target.closest("[data-act]");
    if (ab) { const msg = actRun(c, ab.dataset.act, (($(`[data-actsel="${CSS.escape(ab.dataset.act)}"]`, main) || {}).value) || null); pcRecompute(c); pcPersist(); renderRosterMain(); if (msg && typeof msg === "object") { if (msg.aoe) actAoeDialog(c, msg); else if (msg.amount) actResultDialog(c, msg); else toast(msg.msg); } else if (msg) toast(msg); return; }
    const u = e.target.closest("[data-use]");
    if (u) { const r = pcResources(c).find(x => x.key === u.dataset.use); if (r) { resSet(c, r.key, resLeft(c, r) - +u.dataset.d); const f = $(`[data-use="${r.key}"][data-d="${u.dataset.d}"]`, main); if (f && !f.disabled) f.focus(); } return; }
    if (e.target.closest("[data-spdauto]")) { c.speedManual = false; pcACApply(c); pcPersist(); renderRosterMain(); toast(`Speed ${c.speed} ft`); return; }
    if (e.target.closest("[data-acauto]")) { c.acManual = false; pcACApply(c); pcPersist(); renderRosterMain(); toast(`Armor class ${c.ac} from equipment`); return; }
    const rs = e.target.closest("[data-rest]");
    if (rs && rs.dataset.rest === "short") { shortRestDialog(c); return; }
    if (rs) {
      const kind = rs.dataset.rest, back = pcRest(c, kind), fxEnded = c.fxEnded; delete c.fxEnded; pcPersist(); renderRosterMain();
      toast(kind === "long" ? `${c.name} takes a long rest: full hit points${back.length ? ", " + back.join(", ").toLowerCase() + " restored" : ""}${fxEnded ? ". Active effects ended" : ""}` : back.length ? `${c.name} takes a short rest: ${back.join(", ").toLowerCase()} regained${fxEnded ? ". Active abilities ended" : ""}` : `${c.name} takes a short rest.${fxEnded ? " Active abilities ended." : " Nothing to regain."}`);
    }
  });
  main.addEventListener("change", e => {
    const t = e.target, c = rosterCur(); if (!c) return;
    if(t.hasAttribute("data-subclass-print")){
      if(setSubclassPrinting(c,t.dataset.subclassPrint,t.value)){pcPersist();renderRosterMain();}
      return;
    }
    if(t.dataset.companionHp){companionSetHP(c,t.dataset.companionHp,t.value);pcRecompute(c);pcPersist();renderRosterMain();return;}
    if(t.hasAttribute("data-companion-variant")){
      const variant=t.value,previous=c.beastCompanionVariant||"natural";
      if(!["natural","primal"].includes(variant)||variant===previous)return;
      const apply=()=>{c.beastCompanionVariant=variant;pcRecompute(c);pcPersist();renderRosterMain();};
      if(c.subCompanions?.[previous==="primal"?"primal14":"beast14"]){
        t.value=previous;
        confirmBox("Switch companion rules?","This releases the companion recorded under your current rules.","Switch rules").then(confirmed=>{if(confirmed)apply();});
      }else apply();
      return;
    }
    if(t.hasAttribute("data-wizard-book-add")){if(t.value&&wizardBookAdd(c,t.value)){syncGrantedSpells(c);pcPersist();renderRosterMain();}}
    else if (t.dataset.left) resSet(c, t.dataset.left, parseInt(t.value) || 0);
    else if (t.dataset.fstyle !== undefined) { c.fightStyles = c.fightStyles || []; c.fightStyles[+t.dataset.fstyle] = t.value; pcRecompute(c); pcPersist(); renderRosterMain(); }
    else if (t.name === "rollMode") { ROLL.mode = t.value; }
    else if (t.dataset.varenc !== undefined) { c.varEnc = t.checked; pcRecompute(c); pcPersist(); renderRosterMain(); }
    else if (t.dataset.bgchoice) { if(t.value&&backgroundSelectionChange(c,t.dataset.bgchoice,t.value)){pcPersist();renderRosterMain();} }
    else if (t.dataset.choice) { if (t.value) { const k = t.dataset.choice,S=CHOICES[k]; if(!S||!S.opts(c).some(([id])=>id===t.value)||choiceOf(c,k).includes(t.value)||choiceOf(c,k).filter(id=>S.opts(c).some(([x])=>x===id)).length>=S.n(c))return; c.choices = { ...(c.choices || {}) }; c.choices[k] = [...choiceOf(c, k), t.value]; syncGrantedSpells(c); pcRecompute(c); pcPersist(); renderRosterMain(); const f = $(`[data-choice="${CSS.escape(k)}"]`, main); if (f) f.focus(); } }
    else if (t.dataset.mi) { if (t.value) { const k = "Feat: Magic Initiate"; c.choices = { ...(c.choices || {}) }; let L = choiceOf(c, k); if (t.dataset.mi === "list") L = [`list:${t.value}`]; else L = [...L, `${t.dataset.mi}:${t.value}`]; c.choices[k] = [...new Set(L)]; syncGrantedSpells(c); pcRecompute(c); pcPersist(); renderRosterMain(); } }
    else if (t.dataset.concset !== undefined) { const v = t.value.trim().slice(0, 60); if (v) { concStart(c, v); pcPersist(); renderRosterMain(); } }
    else if (t.dataset.rf === "hpCur" || t.hasAttribute("data-quick-hp")) {
      const quick = t.hasAttribute("data-quick-hp");
      if (quick && !Number.isFinite(t.valueAsNumber)) { t.value = c.hpCur; return; }
      const prev = quick ? +(c.hpCur || 0) : t.dataset.prev === undefined || t.dataset.prev === "" ? null : +t.dataset.prev;
      const now = quick ? clamp(Math.trunc(t.valueAsNumber), 0, +c.hp || 0) : +t.value || 0;
      if (quick) c.hpCur = now;
      t.dataset.prev = t.value;
      if (prev !== null && now < prev) { const n = pcDamaged(c, prev - now, prev === 0); if (n.length) toast(n.map(cap1).join(". ") + "."); }
      else if (prev !== null && now > prev) { const n = pcHealed(c, prev === 0); if (n.length) toast(n.join(". ") + "."); }
      pcRecompute(c); pcPersist(); renderRosterMain();
    }
    else if (t.dataset.rf==="hpTemp") { pcRecompute(c);pcPersist();renderRosterMain(); }
    else if (t.dataset.formhp) { c.formHp = Math.max(0, parseInt(t.value) || 0); pcPersist(); renderRosterMain(); }
    else if (t.dataset.actpersist) { c.active = c.active || {}; if (t.value) c.active[t.dataset.actpersist] = t.value; else delete c.active[t.dataset.actpersist]; pcRecompute(c); pcPersist(); renderRosterMain(); }
    else if (t.dataset.fx) { c.fx = c.fx || {}; c.fx[t.dataset.fx] = t.checked; pcACApply(c); pcPersist(); renderRosterMain(); }
    else if (t.dataset.acbonus) { c.acBonus = clamp(parseInt(t.value) || 0, -10, 20); pcACApply(c); pcPersist(); renderRosterMain(); }
  });
  main.addEventListener("input", e => {
    const c = rosterCur(); if (!c) return; const t = e.target;
    if (["rcPrepQ", "rcPrepLv", "rcPrepEd"].includes(t.id)) { renderPrepList(c, "rc"); return; }
    if (t.dataset.rf) {
      const k = t.dataset.rf, v = t.value;
      if (k.startsWith("hd.")) { c.hookDetail = c.hookDetail || { story: "", questions: [], use: "" }; const f = k.slice(3); c.hookDetail[f] = f === "questions" ? v.split("\n").map(x => x.trim()).filter(Boolean) : v; }
      else if (["hp", "hpCur", "hpTemp", "ac", "speed", "xp"].includes(k)) { c[k] = v === "" ? "" : +v; if(k==="hpTemp"&&!+v)endSymbioticEntity(c); if (k === "ac") { c.acManual = v !== "" && +v !== c.acAuto; const l = $("#rcACLine"); if (l) l.innerHTML = rcACLine(c); } if (k === "speed") { c.speedManual = v !== "" && +v !== c.speedAuto; const l = $("#rcSpeedLine"); if (l) l.innerHTML = rcSpeedLine(c); } }
      else c[k] = v;
      const vital = $(`[data-quick-vital="${CSS.escape(k)}"]`, main);
      if (vital) vital.textContent = c[k] || 0;
      if (k === "hp") $("[data-quick-hp]", main).max = c.hp;
      if (t.tagName === "TEXTAREA") autoGrow(t);
      if (k === "name") {
        $(".mobile-sheet-quick h3", main).textContent = c.name;
        renderRoster();
      }
      pcPersist(); return;
    }
    if (t.dataset.rcoin) { c.coins[t.dataset.rcoin] = Math.max(0, +t.value || 0); pcACApply(c); const sl = $("#rcSpeedLine"); if (sl) sl.innerHTML = rcSpeedLine(c); const sp = $('[data-rf="speed"]', main); if (sp && !c.speedManual) sp.value = c.speed; pcPersist(); return; }
    if (t.dataset.rinv) {
      const i = c.inv.find(x => x.id === t.dataset.iid); if (!i) return; const f = t.dataset.rinv;
      if((i.artificerOrigin||i.artificerInfusion)&&["qty","n"].includes(f)){t.value=i[f];toast("Artificer-created and infused items are individual objects. Use the class feature to change them.");return;}
      if(f==="attuned"&&t.checked&&!i.attuned&&artificerAttunedCount(c)>=artificerAttunementLimit(c)){t.checked=false;toast("Attunement limit reached.");return;}
      i[f] = f === "attuned" || f === "eq" ? t.checked : f === "qty" ? Math.max(0, +t.value || 0) : t.value;
      c.attacks = pcAttacks(c); pcACApply(c); pcPersist();
      if (f === "attuned" || f === "eq") renderRosterMain();
      else {
        if (f === "n") {
          const row = t.closest("tr");
          $("[data-attunement-cell]", row).innerHTML = inventoryAttunementControl(i, edOf(c));
          $("#rcAttunementCount", main).outerHTML = inventoryAttunementCount(c);
          $("[data-item-details]", row).setAttribute("aria-label", i.n ? "Item details for " + i.n : "Item details");
          $('[data-rinv="eq"]', row).setAttribute("aria-label", "Equip " + i.n);
        }
        const warning = $("#rcArmorCastingWarning", main);
        if (warning) warning.hidden = !c.armorUntrained;
        $('[data-roll="init"]', main).innerHTML = rollMark(c, "init", "dex") + sgn(c.init);
        c.skills.forEach((skill, index) => {
          $(`[data-roll="skill:${index}"]`, main).innerHTML = rollMark(c, "check", skill.ab, { skill: skill.s }) + sgn(skill.v);
        });
        const saveBonus = itemSaveBonus(c);
        AB.forEach(a => {
          $(`[data-roll="check:${a}"]`, main).innerHTML = rollMark(c, "check", a) + sgn(c.mods[a]);
          const trained = c.saves.includes(a), bonus = c.mods[a] + (trained ? c.prof : 0) + saveBonus;
          $(`[data-roll="save:${a}"]`, main).innerHTML = `save ${sgn(bonus)}${trained ? " ●" : ""}${rollMark(c, "save", a)}`;
        });
        $("[data-quick-vital=ac]", main).textContent = c.ac;
        $(".mobile-quick-actions", main).innerHTML = quickSheetActions(c);
        $("#rcItemFeatures").innerHTML = inventoryEffectsHTML(c); $("#rcAtk").innerHTML = rcAttacksHTML(c); $("#rcEquipped").innerHTML = rcEquippedHTML(c); $("#rcACLine").innerHTML = rcACLine(c); $("#rcSpeedLine").innerHTML = rcSpeedLine(c); const a = $('[data-rf="ac"]', main); if (a && !c.acManual) a.value = c.ac; const sp = $('[data-rf="speed"]', main); if (sp && !c.speedManual) sp.value = c.speed;
      }
    }
  });
  main.addEventListener("change", e => {
    const c = rosterCur(); if (!c) return; const t = e.target;
    if (t.dataset.rinv === "n") {
      const item = c.inv.find(i => i.id === t.dataset.iid);
      if (clearUnsupportedAttunement(item, edOf(c))) pcPersist();
      return;
    }
    if (t.dataset.rs) { c.scores[t.dataset.rs] = clamp(parseInt(t.value) || 10, 1, 30); pcRecompute(c); pcPersist(); renderRosterMain(); }
    else if (t.dataset.rlv) {
      const lv = clamp(parseInt(t.value) || 1, 1, 20);
      if (LV.c) return; // the Level up window is already open for this change
      if (lv > c.level) lvChain(c, lv); // asks for each subclass / ASI choice on the way up
      else if (lv < c.level) { Object.keys(c.asiPicks || {}).forEach(k => { if (+k > lv) delete c.asiPicks[k]; }); pcLevelTo(c, lv); pcPersist(); renderRoster(); renderRosterMain(); toast(`${c.name} is now level ${lv}`); }
      else t.value = c.level;
    }
  });
  main.addEventListener("click", async e => {
    const dr = e.target.closest("[data-draft]");
    if (dr) { const k = dr.dataset.draft; if (k === "forge") forgeOpen(); else if (k === "keep") keepPC(); else if (k === "reroll" && window.pcReroll) pcReroll(); else if (k === "discard") discardPC(); return; }
    const c = rosterCur(); if (!c) return; const t = e.target;
    const sk = t.closest("[data-rsk]");
    if (sk) { const s = c.skills[+sk.dataset.rsk]; if(s.primalGranted||s.scholarGranted||s.loreGranted||s.orderGranted||s.envoyGranted||s.envoyExpert||s.peaceGranted||s.glamourGranted||s.archerGranted||s.xgeTrainingGranted){toast("Change the feature choice in Features instead.");return;} if (s.x) { s.x = false; s.p = false; } else if (s.p) s.x = true; else s.p = true; pcRecompute(c); pcPersist(); renderRosterMain(); return; }
    const a = t.closest("[data-ra]");
    if (a) {
      const k = a.dataset.ra;
      if (k === "sheet") openSheet(c);
      else if (k === "cards") openSpellCards(c);
      else if (k === "copy") { try { await navigator.clipboard.writeText(sheetText(c)); toast("Character sheet copied"); } catch { toast("Couldn't copy here"); } }
      else if (k === "camp") addPCToCampaign($("#rcCamp").value, c);
      else if (k === "del" && pcIsDraft(c)) discardPC();
      else if (k === "del") {
        if (!(await confirmBox("Delete character?", `Delete ${c.name}? Copies already added to a campaign party stay there.`, "Delete"))) return;
        PCS.roster = PCS.roster.filter(x => x.id !== c.id); RC.id = null; pcPersist(); renderRosterTab(); toast(`${c.name} deleted`);
      }
      else if (k === "addInv") { c.inv.push({ id: uid("i"), n: "", qty: 1, note: "", att: false }); pcPersist(); renderRosterMain(); const ins = $$('[data-rinv="n"]', main); if (ins.length) ins[ins.length - 1].focus(); }
      else if (k === "browse") IT.target = c.id;
      else if (k === "addFeat") { FT.target = c.id; FT.ed = edOf(c); FT.q = ""; const q = $("#ftQ"); if (q) q.value = ""; location.hash = "feats"; window.scrollTo(0, 0); }
      else if (k === "prep") {
        const p = $("#rcPrepPanel"); p.classList.toggle("hidden"); const open = !p.classList.contains("hidden");
        a.textContent = open ? "Close search" : "✦ Prepare spells";
        if (open) { $("#rcPrepEd").value = SP.ed; renderPrepList(c, "rc"); $("#rcPrepQ").focus(); }
      }
      return;
    }
    const rf = t.closest("[data-rmfeat]");
    if (rf) { const b = (c.bonusFeats || [])[+rf.dataset.rmfeat]; if (!b || !(await confirmBox(`Remove ${b.n}?`, `${c.name} loses ${b.n}${b.a ? ` and its +1 ${AB_FULL[b.a]}` : ""}.`, "Remove"))) return; c.bonusFeats.splice(+rf.dataset.rmfeat, 1); pcRebuild(c); toast(`${b.n} removed`); return; }
    const dl = t.closest("[data-rdel]"); if (dl) { c.inv = c.inv.filter(i => i.id !== dl.dataset.rdel); renderRosterMain(); pcPersist(); return; }
    const sb = t.closest("[data-spells]"); if (sb) { const [cl, mx, ca] = sb.dataset.spells.split("|"); SP.target = c.id; openSpellsFor(cl, +mx, ca === "1"); return; }
    const pb = t.closest("[data-prep]"); if (pb) { const s = spFind(pb.dataset.prep), on = togglePrep(c, s, pb.dataset.prep.split("-")[0]); pb.textContent = on ? "✓ Prepared" : "+ Prepare"; pb.classList.toggle("primary", !on); pcChanged(c); return; }
    const ub = t.closest("[data-unprep]"); if (ub) { const [ed, ...rest] = ub.dataset.unprep.split("|"), n = rest.join("|"); c.prepared = c.prepared.filter(x => x.src || x.ed !== ed || x.n !== n); pcChanged(c); renderPrepList(c, "rc"); }
  });
  main.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.hasAttribute("data-quick-hp")) e.target.blur();
  });
  main.addEventListener("focusin", e => { if (e.target.matches('[data-rf="hpCur"]')) e.target.dataset.prev = e.target.value; });
})();
