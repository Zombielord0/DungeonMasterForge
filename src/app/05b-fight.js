/* 05b-fight.js: the fight window (2026-11-25, owner's request): a full-screen view of one encounter with everyone in
   initiative order, conditions for foes and heroes (picked from a list, with how they end and their saving throw),
   reminders that wait for Saved / Failed, and concentration that links a spell to the conditions it caused.
   It sits on <body> over any tab (the Dungeon Map's Run this fight opens it there) and runs the encounter's own
   handlers itself (encClick for data-ea, onEncField for data-ef), so those buttons and fields work in it unchanged.
   Design: docs/superpowers/specs/2026-11-25-fight-window-design.md. Check: npm run test:fight. */
const FIGHT = { eid: null, sel: null };
const FIGHT_ENDS = [["removed", "Until removed"], ["saveEnd", "Save at the end of each of its turns"], ["saveStart", "Save at the start of each of its turns"], ["rounds", "After a number of rounds"], ["endNext", "At the end of its next turn"], ["startNext", "At the start of its next turn"]];
const FIGHT_ABS = [["str", "STR"], ["dex", "DEX"], ["con", "CON"], ["int", "INT"], ["wis", "WIS"], ["cha", "CHA"]];
const fightConds = () => [...CONDS.map(([k, l]) => [k, l]), ["exhaustion", "Exhaustion"]];
const fightCondLabel = k => (fightConds().find(x => x[0] === k) || [k, cap1(k)])[1];
const fightEd = () => (currentSourceRules() || {}).edition || "2024";

/* ---- who is in the fight: foes (foe:<enemy id>) and heroes (pc:<party id>) ---- */
function fightWho(c, e, key) {
  const [t, id] = String(key || "").split(":");
  if (t === "foe") { const m = e.enemies.find(x => x.id === id); return m ? { t, id, key, m, name: m.name } : null; }
  if (t === "pc") { const pt = (c.party || []).find(x => x.id === id); if (!pt) return null; const pc = pt.pcId ? PCS.roster.find(x => x.id === pt.pcId) : null; return { t, id, key, pt, pc, name: pc ? pc.name : pt.name || "Hero" }; }
  return null;
}
function fightAll(c, e) {
  const init = new Map(encOrder(c, e).map(o => [(o.foe ? "foe:" : "pc:") + o.key, o.init]));
  const rows = [...e.enemies.map(m => "foe:" + m.id), ...(c.party || []).map(p => "pc:" + p.id)].map(k => fightWho(c, e, k)).filter(Boolean);
  rows.forEach(r => r.init = init.has(r.key) ? init.get(r.key) : null);
  const order = encOrder(c, e).map(o => (o.foe ? "foe:" : "pc:") + o.key);
  return rows.sort((a, b) => (a.init === null) - (b.init === null) || order.indexOf(a.key) - order.indexOf(b.key));
}
function fightTurnKey(c, e) { if (!e.turn) return null; return e.enemies.some(m => m.id === e.turn) ? "foe:" + e.turn : "pc:" + e.turn; }
function fightCondList(e, w) { if (w.t === "foe") return w.m.conds = Array.isArray(w.m.conds) ? w.m.conds : []; e.pcConds = e.pcConds || {}; return e.pcConds[w.id] = Array.isArray(e.pcConds[w.id]) ? e.pcConds[w.id] : []; }

/* ---- adding and removing conditions; a hero's go on their character sheet too ---- */
function fightAddCond(c, e, w, cd) {
  cd = Object.assign({ id: uid("fc") }, cd);
  if (cd.ends === "rounds") cd.untilRound = (e.round || 1) + Math.max(1, +cd.rounds || 1);
  fightCondList(e, w).push(cd);
  if (w.t === "pc" && w.pc) { if (cd.k === "exhaustion") w.pc.exh = Math.min(6, exhOf(w.pc) + 1); else w.pc.conds = { ...(w.pc.conds || {}), [cd.k]: true }; pcPersist(); }
  return cd;
}
function fightRemoveCond(c, e, w, id) {
  const list = fightCondList(e, w), cd = list.find(x => x.id === id); if (!cd) return null;
  list.splice(list.indexOf(cd), 1);
  e.prompts = (e.prompts || []).filter(p => p.condId !== id); /* its waiting save reminder goes too */
  if (w.t === "pc" && w.pc) {
    if (cd.k === "exhaustion") w.pc.exh = Math.max(0, exhOf(w.pc) - 1);
    else if (!list.some(x => x.k === cd.k)) { const cs = { ...(w.pc.conds || {}) }; delete cs[cd.k]; w.pc.conds = cs; }
    pcPersist();
  }
  return cd;
}
/* a spell's casting ends (concentration lost, the caster down, a new concentration spell): its conditions go */
function fightEndCast(c, e, castId, why) {
  const cast = (e.casts || {})[castId]; if (!cast) return;
  const freed = [];
  for (const w of fightAll(c, e)) for (const cd of fightCondList(e, w).filter(x => x.castId === castId)) { fightRemoveCond(c, e, w, cd.id); freed.push(`${w.name} (${fightCondLabel(cd.k)})`); }
  const by = fightWho(c, e, cast.by);
  if (by && by.t === "foe" && by.m.conc && by.m.conc.castId === castId) by.m.conc = null;
  if (by && by.t === "pc" && by.pc && by.pc.conc && by.pc.conc.spell === cast.spell) { delete by.pc.conc; delete by.pc.concCheck; pcPersist(); }
  delete e.casts[castId];
  e.prompts = (e.prompts || []).filter(p => p.castId !== castId);
  toast(`${cast.spell} ends${why ? ` (${why})` : ""}.${freed.length ? ` Freed: ${freed.join(", ")}.` : ""}`);
}
/* keep the fight in step with the heroes' sheets and the foes' hit points */
function fightSync(c, e) {
  let changed = false;
  for (const [id, cast] of Object.entries(e.casts || {})) {
    const by = fightWho(c, e, cast.by);
    if (!by) { fightEndCast(c, e, id, "its caster left the fight"); changed = true; continue; }
    if (by.t === "pc" && by.pc && (by.pc.conc || {}).spell !== cast.spell) { fightEndCast(c, e, id, `${by.name}'s concentration ended`); changed = true; } /* no sheet (or not loaded yet): the cast is tracked here only */
    else if (by.t === "foe" && by.m.hp <= 0) { fightEndCast(c, e, id, `${by.name} is down`); changed = true; }
  }
  /* a hero who took damage while concentrating: the sheet set concCheck; ask here too */
  for (const w of fightAll(c, e)) if (w.t === "pc" && w.pc && w.pc.conc && w.pc.concCheck && !(e.prompts || []).some(p => p.type === "pcconc" && p.who === w.key)) {
    (e.prompts = e.prompts || []).push({ id: uid("fp"), type: "pcconc", who: w.key, dc: w.pc.concCheck, text: `${w.name}: Concentration save (CON) DC ${w.pc.concCheck} to keep ${w.pc.conc.spell}` }); changed = true;
  }
  if (changed) Store.save(c);
}

/* ---- Next turn: end-of-turn and start-of-turn saves, conditions that end by themselves ---- */
function fightOnTurn(c, e, prevTurn, prevRound) {
  if (!e.turn) return; /* the same creature again (one left standing) counts as its turn ending, then starting */
  const key = id => e.enemies.some(m => m.id === id) ? "foe:" + id : "pc:" + id;
  const prev = prevTurn ? fightWho(c, e, key(prevTurn)) : null, cur = fightWho(c, e, key(e.turn)), notes = [];
  const ask = (w, cd, when) => (e.prompts = e.prompts || []).push({ id: uid("fp"), type: "save", who: w.key, condId: cd.id, castId: cd.castId || null,
    text: `${w.name}, ${when} of turn: ${(cd.save || {}).ab ? cd.save.ab.toUpperCase() : "a"} save${(cd.save || {}).dc ? ` DC ${cd.save.dc}` : ""} to end ${fightCondLabel(cd.k)}${cd.src && (cd.src.spell || cd.src.name) ? ` (${[cd.src.spell, cd.src.name].filter(Boolean).join(" · ")})` : ""}` });
  if (prev) for (const cd of [...fightCondList(e, prev)]) {
    if (cd.ends === "saveEnd") ask(prev, cd, "end");
    if (cd.ends === "endNext" && cd.seenStart) { fightRemoveCond(c, e, prev, cd.id); notes.push(`${prev.name} is no longer ${fightCondLabel(cd.k)}`); }
  }
  if (cur) for (const cd of [...fightCondList(e, cur)]) {
    if (cd.ends === "startNext") { fightRemoveCond(c, e, cur, cd.id); notes.push(`${cur.name} is no longer ${fightCondLabel(cd.k)}`); continue; }
    cd.seenStart = true;
    if (cd.ends === "saveStart") ask(cur, cd, "start");
  }
  if ((e.round || 0) > (prevRound || 0)) for (const w of fightAll(c, e)) for (const cd of [...fightCondList(e, w)]) if (cd.untilRound && e.round >= cd.untilRound) { fightRemoveCond(c, e, w, cd.id); notes.push(`${w.name}'s ${fightCondLabel(cd.k)} ran out`); }
  bossOnTurn(c,e,prevTurn,prevRound);
  if (notes.length) toast(notes.join(". ") + ".");
}
/* damage to a foe that's concentrating */
function fightOnFoeDamage(c, e, m, amount) {
  if (!m.conc || !amount) return;
  if (m.hp <= 0) { fightEndCast(c, e, m.conc.castId, `${m.name} is down`); return; }
  const dc = Math.max(10, Math.floor(amount / 2));
  (e.prompts = e.prompts || []).push({ id: uid("fp"), type: "conc", who: "foe:" + m.id, castId: m.conc.castId, dc, text: `${m.name}: Concentration save (CON) DC ${dc} to keep ${m.conc.spell}` });
}
function fightReset(c, e) {
  for (const id of Object.keys(e.casts || {})) fightEndCast(c, e, id, "the fight was reset"); /* heroes stop concentrating too */
  for (const w of fightAll(c, e)) if (w.t === "pc") for (const cd of [...fightCondList(e, w)]) fightRemoveCond(c, e, w, cd.id);
  e.enemies.forEach(m => { m.conds = []; m.conc = null; }); e.prompts = []; e.casts = {};
  if(e.bossKit)e.bossKit=bossFresh(e.bossKit.config);
}

/* ---- what's filled in for you: the caster's DC and spells, and the spell's save, condition, timing and concentration ---- */
function fightMonster(m) {
  for (const ed of ["2024", "2014"]) { const x = (dmData("monsterData")[ed] || []).find(y => y.n === m.stat); if (x) return { mon: x, ed }; }
  try { bsLoad(); const x = (BS.data.custom || []).find(y => y.n === m.stat); if (x) return { mon: x, ed: "custom" }; } catch (err) { }
  return null;
}
const fightMonText = mon => [...(mon.traits || []), ...(mon.actions || []), ...(mon.legend || [])].map(([n, t]) => `${n} ${t}`).join("\n");
function fightCasterDC(c, e, key) {
  const w = fightWho(c, e, key); if (!w) return null;
  if (w.t === "pc") return w.pc && w.pc.spell ? +w.pc.spell.dc || null : null;
  const f = fightMonster(w.m); if (!f) return null; const t = fightMonText(f.mon);
  const r = /spell save DC (\d+)/i.exec(t) || /DC (\d+)/.exec(t); return r ? +r[1] : null;
}
function fightSpellsAll() { spLoad(); const seen = new Set(), out = []; for (const ed of ["2024", "2014"]) for (const s of SP.data[ed] || []) if (!seen.has(s.n.toLowerCase())) { seen.add(s.n.toLowerCase()); out.push(s.n); } return out.sort(); }
function fightCasterSpells(c, e, key) {
  const w = fightWho(c, e, key); if (!w) return [];
  if (w.t === "pc") return w.pc ? (w.pc.prepared || []).map(p => p.n).filter(Boolean) : [];
  const f = fightMonster(w.m); if (!f) return []; const t = fightMonText(f.mon).toLowerCase();
  return fightSpellsAll().filter(n => n.length > 3 && t.includes(n.toLowerCase()));
}
function fightSpellInfo(name, ed) {
  spLoad(); name = String(name || "").trim().toLowerCase(); if (!name) return null;
  const s = (SP.data[ed] || []).find(x => x.n.toLowerCase() === name) || (SP.data[ed === "2014" ? "2024" : "2014"] || []).find(x => x.n.toLowerCase() === name);
  if (!s) return null;
  const text = String(s.d || ""), sv = String(s.sv || "").toLowerCase();
  const abName = /(strength|dexterity|constitution|intelligence|wisdom|charisma) saving throw/i.exec(text);
  const ab = FIGHT_ABS.some(([k]) => k === sv) ? sv : abName ? abName[1].slice(0, 3).toLowerCase() : "";
  const cond = (CONDS.find(([k]) => new RegExp(`\\b${k}\\b`, "i").test(text)) || [""])[0];
  const ends = /end of each of its turns/i.test(text) ? "saveEnd" : /start of each of its turns/i.test(text) ? "saveStart" : cond ? "removed" : "removed";
  const du = String(s.du || "").toLowerCase(), n = parseInt(du.replace(/[^0-9]/g, "")) || 1;
  const rounds = /minute/.test(du) ? n * 10 : /round/.test(du) ? n : /hour/.test(du) ? n * 600 : 0;
  return { n: s.n, ab, cond, ends, conc: !!s.co, rounds };
}

/* ---- the window ---- */
function fightChip(e, w, cd) {
  const why = [cd.save && cd.save.ab ? `${cd.save.ab.toUpperCase()} ${cd.save.dc || ""}`.trim() : "", cd.ends === "rounds" && cd.untilRound ? `until round ${cd.untilRound}` : cd.ends === "endNext" ? "ends end of its next turn" : cd.ends === "startNext" ? "ends start of its next turn" : "", cd.src && cd.src.spell ? cd.src.spell : "", cd.src && cd.src.name ? cd.src.name : ""].filter(Boolean).join(" · ");
  return `<span class="fight-chip" title="${esc(why)}">${esc(fightCondLabel(cd.k))}${why ? ` <small>${esc(why)}</small>` : ""}<button type="button" class="fight-x" data-frm="${esc(cd.id)}" data-fwho="${esc(w.key)}" aria-label="Remove ${esc(fightCondLabel(cd.k))} from ${esc(w.name)}">✕</button></span>`;
}
function fightRowHTML(c, e, w, turnKey) {
  const conds = fightCondList(e, w);
  let hp, max, ac, extra = "", conc = null;
  if (w.t === "foe") { hp = w.m.hp; max = w.m.max; ac = w.m.ac; conc = w.m.conc && w.m.conc.spell; }
  else if (w.pc) { max = +w.pc.hp || 0; hp = w.pc.hpCur === undefined || w.pc.hpCur === "" || isNaN(+w.pc.hpCur) ? max : +w.pc.hpCur; ac = w.pc.ac; conc = w.pc.conc && w.pc.conc.spell; const D = w.pc.death || {}; if (hp === 0) extra = `<span class="fight-chip down">${D.dead ? "Dead" : D.stable ? "Stable" : `Dying ${+D.s || 0}✓ ${+D.f || 0}✗`}</span>`; }
  const pct = max ? Math.max(0, Math.min(100, Math.round(hp / max * 100))) : 0;
  const quick = `<select data-fqk="${esc(w.key)}" aria-label="Add a condition to ${esc(w.name)}"><option value="">+ Condition</option>${fightConds().map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select>`;
  const dmg = w.t === "foe" ? `<div class="fight-dmg"><input type="number" min="0" data-amt="${esc(w.m.id)}" placeholder="0" aria-label="Amount for ${esc(w.name)}"><button class="btn sm danger" type="button" data-ea="dmg" data-eid="${esc(e.id)}" data-mid="${esc(w.m.id)}" title="Damage">−</button><button class="btn sm" type="button" data-ea="heal" data-eid="${esc(e.id)}" data-mid="${esc(w.m.id)}" title="Heal">+</button></div>`
    : w.pc ? `<div class="fight-dmg"><input type="number" min="0" data-pgamt="${esc(w.pc.id)}" placeholder="0" aria-label="Amount for ${esc(w.name)}"><button class="btn sm danger" type="button" data-pg="damage" data-pc="${esc(w.pc.id)}" title="Damage">−</button><button class="btn sm" type="button" data-pg="heal" data-pc="${esc(w.pc.id)}" title="Heal">+</button></div>` : "";
  return `<div class="fight-row ${w.t} ${turnKey === w.key ? "cur" : ""} ${FIGHT.sel === w.key ? "sel" : ""} ${hp <= 0 && max ? "down" : ""}">
    <div class="fight-init">${w.init === null ? "–" : w.init}</div>
    <div class="fight-main"><button type="button" class="fight-name" data-fsel="${esc(w.key)}">${esc(w.name)}</button>
      ${max ? `<div class="hpbar"><span style="width:${pct}%"></span></div>` : ""}
      <div class="fight-chips">${extra}${conc ? `<span class="fight-chip conc">◎ ${esc(conc)}</span>` : ""}${conds.map(cd => fightChip(e, w, cd)).join("")}${w.t === "foe" && w.m.cond ? `<span class="fight-chip note">${esc(w.m.cond)}<button type="button" class="fight-x" data-frm="note" data-fwho="${esc(w.key)}" aria-label="Clear the note">✕</button></span>` : ""}${quick}</div></div>
    <div class="fight-side">${ac !== undefined ? `AC ${esc(ac)}` : ""}${max ? ` · ${hp}/${max} HP` : w.t === "pc" ? "no saved sheet" : ""}${dmg}</div></div>`;
}
function fightNowHTML(c, e, w) {
  if (!w) return `<p class="muted">Pick someone in the turn order.</p>`;
  let body = "";
  if (w.t === "foe") { const f = fightMonster(w.m); body = f ? bsSbHTML(f.mon, f.ed === "custom" ? fightEd() : f.ed) : `<p class="muted">No stat block found for ${esc(w.m.stat || w.name)}.</p>`; }
  else if (w.pc) body = `<div class="fight-stats"><span>AC ${esc(w.pc.ac)}</span><span>HP ${esc(w.pc.hpCur ?? w.pc.hp)}/${esc(w.pc.hp)}</span>${w.pc.spell ? `<span>Spell save DC ${esc(w.pc.spell.dc)}</span>` : ""}<span>Passive ${esc(w.pc.passive)}</span></div><p>${w.pc.conc ? `◎ Concentrating on <b>${esc(w.pc.conc.spell)}</b>. ` : ""}<button type="button" class="link-b" data-openpc="${esc(w.pc.id)}">Open ${esc(w.name)}'s sheet</button></p>`;
  else body = `<p class="muted">${esc(w.name)} has no saved character sheet.</p>`;
  const casters = fightAll(c, e);
  return `<h3>${esc(w.name)}</h3>${body}
    <div class="fight-add"><h3>Add a condition to ${esc(w.name)}</h3>
      <div class="fight-form">
        <label>Condition<select id="fcCond">${fightConds().map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
        <label>Caster<select id="fcCaster"><option value="">Other / none</option>${casters.map(x => `<option value="${esc(x.key)}">${esc(x.name)}</option>`).join("")}</select></label>
        <label>Spell<input type="text" id="fcSpell" list="fcSpellList" placeholder="e.g. Hold Person" autocomplete="off"></label>
        <label>Ends<select id="fcEnds">${FIGHT_ENDS.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
        <label>Rounds<input type="number" id="fcRounds" min="1" value="10"></label>
        <label>Save<select id="fcAb"><option value="">—</option>${FIGHT_ABS.map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select></label>
        <label>DC<input type="number" id="fcDC" min="1" max="40" placeholder="—"></label>
        <label class="chk-inline"><input type="checkbox" id="fcConc"> Concentration</label>
      </div><datalist id="fcSpellList"></datalist>
      <p class="hint" id="fcHint"></p>
      <button class="btn primary" type="button" id="fcAdd">Add</button></div>`;
}
function fightRender() {
  let box = $("#fightWin");
  const c = curCamp(), e = c && FIGHT.eid && findEnc(c, FIGHT.eid);
  if (!e) { if (box) box.remove(); FIGHT.eid = null; document.documentElement.classList.remove("fight-open"); return; }
  fightSync(c, e);
  /* over any tab (the Dungeon Map's Run this fight opens it there), so it handles the encounter's buttons and fields itself */
  if (!box) {
    box = document.createElement("div"); box.id = "fightWin"; box.className = "fight-win"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Fight");
    box.addEventListener("click", encClick); box.addEventListener("input", ev => onEncField(ev, false)); box.addEventListener("change", ev => onEncField(ev, true));
  }
  if (box.parentNode !== document.body) document.body.append(box);
  document.documentElement.classList.add("fight-open");
  const all = fightAll(c, e), turnKey = fightTurnKey(c, e);
  if (!FIGHT.sel || !all.some(w => w.key === FIGHT.sel)) FIGHT.sel = turnKey || (all[0] && all[0].key) || null;
  const rolled = e.enemies.some(m => m.init !== "" && m.init !== null);
  const prompts = e.prompts || [], p0 = prompts[0];
  const conc = Object.values(e.casts || {});
  const keepSel = FIGHT.formFor === FIGHT.sel, keep = keepSel ? Object.fromEntries(["fcCond", "fcEnds", "fcCaster", "fcSpell", "fcRounds", "fcAb", "fcDC"].map(id => [id, $("#" + id)?.value])) : {}, keepConc = keepSel && $("#fcConc")?.checked;
  box.innerHTML = `<div class="fight-top"><b>⚔ ${esc(e.name)}</b><span class="muted">${e.round ? `Round ${e.round}` : "Not started"}</span><span class="sp"></span>
      ${rolled ? "" : `<button class="btn sm primary" type="button" data-ea="roll" data-eid="${esc(e.id)}">🎲 Roll enemy initiative</button>`}
      <button class="btn sm" type="button" data-ea="tv" data-eid="${esc(e.id)}">${HOST.enc && HOST.enc.eid === e.id ? "📺 Off TV" : "📺 Show on TV"}</button>
      ${combatHistory(e).some(r => !r.undone) ? `<button class="btn sm" type="button" data-ea="undo" data-eid="${esc(e.id)}">↶ Undo</button>` : ""}
      <button class="btn sm primary" type="button" data-ea="next" data-eid="${esc(e.id)}" ${encOrder(c, e).length ? "" : "disabled"}>Next turn ▶</button>
      <button class="btn sm" type="button" data-fclose="1">✕ Close</button></div>
    ${(c.party || []).length && !rolled ? `<div class="pc-init"><span class="muted">Heroes' initiative:</span>${c.party.map(p => `<label>${esc(p.name || "Hero")} <input type="number" data-ef="pcinit" data-eid="${esc(e.id)}" data-pid="${esc(p.id)}" value="${esc((e.pcInit || {})[p.id] ?? "")}"></label>`).join("")}</div>` : ""}
    ${p0 ? `<div class="fight-rem" role="status">⏳ <span>${esc(p0.text)}</span>${prompts.length > 1 ? `<span class="muted">(+${prompts.length - 1} more)</span>` : ""}<span class="sp"></span>
      <button class="btn sm fight-ok" type="button" data-fp="ok">${p0.type === "save" ? "Saved" : "Kept"}</button><button class="btn sm danger" type="button" data-fp="fail">${p0.type === "save" ? "Failed" : "Lost"}</button></div>` : ""}
    <div class="fight-cols">
      <div class="card fight-order"><h3>Turn order</h3>${all.map(w => fightRowHTML(c, e, w, turnKey)).join("") || `<p class="muted">No one in this fight yet.</p>`}</div>
      <div class="card fight-now">${fightNowHTML(c, e, fightWho(c, e, FIGHT.sel))}</div>
      <div class="card fight-right">${bossPanel(c,e)}<h3>Concentration</h3>${conc.length ? conc.map(x => { const by = fightWho(c, e, x.by); return `<p>◎ <b>${esc(by ? by.name : "?")}</b>: ${esc(x.spell)}</p>`; }).join("") : `<p class="muted">No one is concentrating.</p>`}
        <h3>Log</h3>${combatHistory(e).length ? `<ol class="plain fight-log">${combatHistory(e).slice(0, 12).map(r => `<li>${esc(r.label)}${r.undone ? ' <span class="muted">· undone</span>' : ""}</li>`).join("")}</ol>` : `<p class="muted">Nothing yet.</p>`}</div>
    </div>`;
  /* what was typed in Add a condition survives a redraw (damage, a sync), for the same creature */
  for (const [id, v] of Object.entries(keep)) if (v !== undefined && $("#" + id)) $("#" + id).value = v;
  if (keepConc && $("#fcConc")) $("#fcConc").checked = true;
  FIGHT.formFor = FIGHT.sel;
  fightFormUpdate(c, e);
}
function fightFormUpdate(c, e) {
  const caster = $("#fcCaster")?.value || "", dl = $("#fcSpellList"); if (!dl) return;
  const mine = caster ? fightCasterSpells(c, e, caster) : [];
  dl.innerHTML = [...mine, ...fightSpellsAll().filter(n => !mine.includes(n))].slice(0, 2000).map(n => `<option value="${esc(n)}">`).join("");
  $("#fcRounds").closest("label").hidden = $("#fcEnds").value !== "rounds";
}
function fightOpen(eid) { FIGHT.eid = eid; FIGHT.sel = null; fightRender(); const b = $("#fightWin [data-ea='next']"); if (b) b.focus({ preventScroll: true }); }
function fightClose() { FIGHT.eid = null; const b = $("#fightWin"); if (b) b.remove(); document.documentElement.classList.remove("fight-open"); }

/* ---- events: the window's own controls; the encounter's buttons (data-ea, data-ef) are handled by the Tracker ---- */
document.addEventListener("click", e => {
  const open = e.target.closest("[data-fopen]"); if (open) { fightOpen(open.dataset.fopen); return; }
  const box = e.target.closest("#fightWin"); if (!box) return;
  const c = curCamp(), en = c && findEnc(c, FIGHT.eid); if (!en) return;
  if (e.target.closest("[data-fclose]")) { fightClose(); return; }
  const sel = e.target.closest("[data-fsel]"); if (sel) { FIGHT.sel = sel.dataset.fsel; fightRender(); return; }
  const rm = e.target.closest("[data-frm]");
  if (rm) {
    const w = fightWho(c, en, rm.dataset.fwho); if (!w) return;
    const before = combatSnapshot(en);
    if (rm.dataset.frm === "note") w.m.cond = "";
    else fightRemoveCond(c, en, w, rm.dataset.frm);
    combatRecord(en, before, `Removed a condition from ${w.name}`); Store.save(c); rerenderEnc(c, en); fightRender(); return;
  }
  const fp = e.target.closest("[data-fp]");
  if (fp) {
    const p = (en.prompts || [])[0]; if (!p) return;
    const before = combatSnapshot(en), ok = fp.dataset.fp === "ok", w = fightWho(c, en, p.who);
    en.prompts = en.prompts.slice(1);
    if (p.type === "save" && ok && w) { const cd = fightRemoveCond(c, en, w, p.condId); if (cd) toast(`${w.name} is no longer ${fightCondLabel(cd.k)}.`); }
    if (p.type === "conc" && !ok) fightEndCast(c, en, p.castId, `${w ? w.name : "the caster"} lost concentration`);
    if (p.type === "pcconc" && w && w.pc) { delete w.pc.concCheck; if (!ok) { const cast = Object.entries(en.casts || {}).find(([, x]) => x.by === w.key && x.spell === (w.pc.conc || {}).spell); delete w.pc.conc; pcPersist(); if (cast) fightEndCast(c, en, cast[0], `${w.name} lost concentration`); else toast(`${w.name} stops concentrating.`); } else pcPersist(); }
    combatRecord(en, before, `${w ? w.name : "Someone"}: ${p.type === "save" ? (ok ? "saved" : "failed the save") : ok ? "kept concentration" : "lost concentration"}`);
    Store.save(c); rerenderEnc(c, en); fightRender(); return;
  }
  if (e.target.id === "fcAdd") {
    const w = fightWho(c, en, FIGHT.sel); if (!w) return;
    const k = $("#fcCond").value, ends = $("#fcEnds").value, ab = $("#fcAb").value, dc = parseInt($("#fcDC").value) || null, casterKey = $("#fcCaster").value, spell = $("#fcSpell").value.trim(), concOn = $("#fcConc").checked;
    const caster = casterKey ? fightWho(c, en, casterKey) : null;
    const before = combatSnapshot(en);
    let castId = null;
    if (caster && spell && concOn) {
      en.casts = en.casts || {};
      const same = Object.entries(en.casts).find(([, x]) => x.by === caster.key && x.spell.toLowerCase() === spell.toLowerCase());
      if (same) castId = same[0];
      else {
        for (const [id, x] of Object.entries(en.casts)) if (x.by === caster.key) fightEndCast(c, en, id, `${caster.name} starts concentrating on ${spell}`);
        castId = uid("cast"); en.casts[castId] = { by: caster.key, spell };
        if (caster.t === "foe") caster.m.conc = { spell, castId };
        else if (caster.pc) { concStart(caster.pc, spell); pcPersist(); }
      }
    }
    fightAddCond(c, en, w, { k, ends, rounds: parseInt($("#fcRounds").value) || 1, save: ab || dc ? { ab, dc } : null, src: caster || spell ? { by: caster ? caster.key : null, name: caster ? caster.name : "", spell } : null, castId });
    combatRecord(en, before, `${w.name} is ${fightCondLabel(k)}${spell ? ` (${spell})` : ""}`);
    Store.save(c); rerenderEnc(c, en); fightRender(); return;
  }
});
document.addEventListener("change", e => {
  const box = e.target.closest && e.target.closest("#fightWin"); if (!box) return;
  const c = curCamp(), en = c && findEnc(c, FIGHT.eid); if (!en) return;
  if (e.target.dataset.fqk) {
    const w = fightWho(c, en, e.target.dataset.fqk), k = e.target.value; if (!w || !k) return;
    const before = combatSnapshot(en); fightAddCond(c, en, w, { k, ends: "removed" });
    combatRecord(en, before, `${w.name} is ${fightCondLabel(k)}`); Store.save(c); rerenderEnc(c, en); fightRender(); return;
  }
  if (e.target.id === "fcCaster" || e.target.id === "fcSpell") {
    const casterKey = $("#fcCaster").value, caster = casterKey ? fightWho(c, en, casterKey) : null;
    if (e.target.id === "fcCaster") { const dc = fightCasterDC(c, en, casterKey); if (dc) $("#fcDC").value = dc; fightFormUpdate(c, en); }
    const info = fightSpellInfo($("#fcSpell").value, caster && caster.pc ? edOf(caster.pc) : fightEd());
    if (info) {
      if (info.ab) $("#fcAb").value = info.ab; if (info.cond) $("#fcCond").value = info.cond;
      $("#fcEnds").value = info.ends === "removed" && info.rounds ? "rounds" : info.ends; if (info.rounds) $("#fcRounds").value = info.rounds;
      $("#fcConc").checked = info.conc;
      const dc = fightCasterDC(c, en, casterKey); if (dc) $("#fcDC").value = dc;
      $("#fcHint").textContent = `Filled in from ${info.n}${caster ? ` and ${caster.name}` : ""}. Change anything before Add.`;
    }
    fightFormUpdate(c, en); return;
  }
  if (e.target.id === "fcEnds") fightFormUpdate(c, en);
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && FIGHT.eid && !document.querySelector('dialog[open], #modal.open, [id$="Modal"].open, #newsPanel:not([hidden])') && !(e.target.closest && e.target.closest("input, select, textarea"))) fightClose(); });
