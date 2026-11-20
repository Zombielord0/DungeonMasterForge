/* 12-level-homebrew-feats.js: Level up and subclass choice, the Homebrew tab, and the Feats tab. */

/* ======================= Level up & subclass choice ======================= */
/* plain: no orange button (the Characters tab's sheet keeps one main action, Save to My characters) */
function lvBarHTML(c, plain) {
  const id = esc(c.id), max = c.level >= 20, sl = subclassLevel(edOf(c), c.cls);
  return `<div class="lv-bar">
    <button class="btn ${plain ? "" : "primary "}sm" type="button" data-lvup="${id}" ${max || totalLv(c) >= 20 ? "disabled" : ""}>${max || totalLv(c) >= 20 ? "Level 20 (max)" : (c.multi || []).length ? `⬆ ${esc(c.cls)} ${c.level + 1}` : `⬆ Level up to ${c.level + 1}`}</button>
    ${totalLv(c) < 20 ? `<button class="btn sm" type="button" data-mcup="${id}" title="Take a level in another class (multiclassing)">＋ Another class</button>` : ""}
    ${(() => { const nx = xpNext(c), xp = +c.xp || 0; return nx === null ? "" : xp >= nx ? `<span class="tag gold lv-ready">✨ Enough XP for level ${totalLv(c) + 1}</span>` : xp ? `<span class="muted" style="font-size:13px">XP ${xp.toLocaleString()} / ${nx.toLocaleString()}</span>` : ""; })()}
    ${(c.multi || []).filter(x => +x.lv > 0).map(x => `<span class="tag">${esc(x.cls)} ${x.lv}${x.subclass ? ` · ${esc(x.subclass)}` : ""}<button type="button" class="icon-btn" data-mcdown="${id}|${esc(x.cls)}" title="Remove a ${esc(x.cls)} level" aria-label="Remove a ${esc(x.cls)} level">−</button></span>`).join("")}
    ${needsSubclass(c) ? `<span class="lv-need">⚠ ${esc(c.cls)} subclass not chosen</span><button class="btn sm" type="button" data-subpick="${id}">Choose subclass</button>`
      : c.subclass ? `<span class="tag gold" title="${esc(subclassDesc(c.subclass))}">${esc(c.subclass)}</span>`
      : `<span class="muted" style="font-size:14px">Subclass at level ${sl}</span>`}
  </div>`;
}
// True when the homebrew effects this character would get now differ from the ones on its sheet.
function hbStale(c) {
  if (!HB.list.length && !c.hbSig) return false;
  try { return lvBuild(c, c.level, c.asiPicks || undefined).hbSig !== (c.hbSig || ""); } catch { return false; }
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-hbupdate]"); if (!b) return;
  const c = pcById(b.dataset.hbupdate); if (!c) return;
  const cur = c.hpCur; pcLevelTo(c, c.level); if (cur !== undefined && cur !== "") c.hpCur = Math.min(+cur, c.hp);
  pcRefresh(c); toast(`${c.name}'s sheet now matches the homebrew`);
});
const pcById = id => (currentPC && currentPC.id === id ? currentPC : PCS.roster.find(x => x.id === id)) || null;
function pcRefresh(c) {
  if (currentPC && currentPC.id === c.id) renderPC();
  pcPersist(); renderRoster();
  if (location.hash === "#roster" && RC.id === c.id) renderRosterMain();
}
const LV = { c: null, to: 0, pick: "", onlySub: false, back: null, asi: null };
const lvBuild = (c, to, picks) => generateCharacter({ seed: c.seed || c.id, name: c.name, race: c.race, ed: edOf(c), sub: c.sub || (c.race === "Dragonborn" && c.ancestry) || "none", ancestry: c.ancestry || undefined, cls: c.cls, bg: c.bg, level: to, subclass: c.subclass || "none", asiPicks: picks, bonusFeats: c.bonusFeats || undefined, bgAsiLegacy: c.bgAsiLegacy || undefined, ...pcKeep(c), method: c.method || "array", bonus: c.bonus || "flex", custom: c.customData || undefined });
const lvHasAsi = (c, to) => (CLASS_DATA[c.cls].asi || [4, 8, 12, 16, 19]).includes(to);
// The choice as stored on the character: { str: 2 }, { str: 1, con: 1 } or { feat: "Alert" }; null while incomplete.
function lvAsiPick() {
  const A = LV.asi; if (!A) return null;
  if (A.mode === "feat") {
    const name = A.feat.trim().slice(0, 80); if (!name) return null;
    const F = featInfo(edOf(LV.c), name), max = F && F[4] === "b" ? 30 : 20, open = featAbs(F).filter(a => LV.cur[a] + 1 <= max);
    if (!open.length) return { feat: name };
    const ab = open.length === 1 ? open[0] : open.includes(A.featAb) ? A.featAb : ""; if (!ab) return null;
    return max === 30 ? { feat: name, [ab]: 1, max } : { feat: name, [ab]: 1 };
  }
  if (A.mode === "one") return A.a ? { [A.a]: 2 } : null;
  return A.a && A.b && A.a !== A.b ? { [A.a]: 1, [A.b]: 1 } : null;
}
function lvPicks(c, to, pick) { const P = {}; Object.entries(c.asiPicks || {}).forEach(([k, v]) => { if (+k < to) P[k] = v; }); if (pick) P[to] = pick; return P; }
function lvGains(c, to) {
  const sub = !c.subclass && LV.c === c && LV.pick ? LV.pick : null; /* the subclass being chosen in this window */
  const n = lvBuild(sub ? { ...c, subclass: sub } : c, to, lvPicks(c, to, lvAsiPick() || (lvHasAsi(c, to) ? { feat: "-" } : null)));
  const g = [`Hit points ${c.hp} → <b>${n.hp}</b> (+${n.hp - c.hp})`];
  if (n.prof !== c.prof) g.push(`Proficiency bonus ${sgn(c.prof)} → <b>${sgn(n.prof)}</b>`);
  const C = CLASS_DATA[c.cls];
  n.feats.filter(f => f.l === to && !f.f.startsWith("Subclass: ") && !f.f.startsWith("Ability Score") && !f.f.startsWith("Feat: ")).forEach(f => { const d = featDesc(f.f, n); g.push(`<b>${esc(f.f)}</b>${d ? ` — ${esc(d)}` : ""}`); });
  if (n.spell && c.spell) {
    if (n.spell.note && n.spell.note !== c.spell.note) g.push(esc(cap1(n.spell.note)));
    else if (!n.spell.note && n.spell.slots.join() !== c.spell.slots.join()) g.push(`Spell slots: ${n.spell.slots.map((x, i) => `L${i + 1}×${x}`).join(" ") || "none"}`);
    if (n.spell.max > c.spell.max) g.push(`You can now cast level ${n.spell.max} spells`);
  }
  if (n.spell && !c.spell) { /* spellcasting starts now (e.g. Eldritch Knight, Arcane Trickster) */
    const b = spellLimits({ ...c, level: to, subclass: sub || c.subclass, spell: n.spell, mods: n.mods });
    g.push(`<b>Spellcasting</b> (${AB_NAME[n.spell.ab] || "INT"}): ${n.spell.note ? esc(n.spell.note) : `spell slots ${n.spell.slots.map((x, i) => `L${i + 1}×${x}`).join(" ")}`}${b ? `, ${b.n} spells ${b.word}${b.cantrips ? ` and ${b.cantrips} cantrips` : ""}` : ""}`);
  }
  if (c.spell && castOf(c.cls, c.subclass)) { const a = spellLimits(c), b = spellLimits({ ...c, level: to, spell: n.spell, mods: n.mods }); if (b && a && (b.n > a.n || b.cantrips > a.cantrips)) g.push(`Spells ${b.word}: ${a.n} → <b>${b.n}</b>${b.cantrips > a.cantrips ? `, cantrips ${a.cantrips} → <b>${b.cantrips}</b>` : ""}`); }
  return g;
}
function lvAsiHTML(c, to) {
  const A = LV.asi, cur = LV.cur; // scores before this level's points
  const room = n => a => cur[a] + n <= 20;
  const opt = (sel, ok, skip) => `<option value="">Choose…</option>${AB.filter(a => a !== skip).map(a => `<option value="${a}" ${sel === a ? "selected" : ""} ${ok(a) ? "" : "disabled"}>${AB_FULL[a]} ${cur[a]} → ${Math.min(20, cur[a] + (A.mode === "one" ? 2 : 1))}${ok(a) ? "" : " (max 20)"}</option>`).join("")}`;
  const modes = [["one", "+2 to one score"], ["two", "+1 to two scores"], ["feat", "Take a feat instead"]];
  return `<div class="sec-h" style="margin-top:6px"><h3>Ability Score Improvement</h3></div>
    <p class="hint" style="margin:4px 0 8px">Spend 2 points: +2 to one score or +1 to two. No score can go above 20.${edOf(c) === "2024" ? " In the 2024 rules this is the Ability Score Improvement feat, or you can pick another feat." : " With your DM's OK you can take a feat instead."}</p>
    <div class="seg" role="radiogroup" aria-label="Ability Score Improvement">${modes.map(([v, l]) => `<label class="opt"><input type="radio" name="lvAsiMode" value="${v}" ${A.mode === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>
    <div class="row" style="margin-top:10px;flex-wrap:wrap">${A.mode === "feat"
      ? lvFeatHTML(c)
      : A.mode === "one" ? `<label class="lbl" style="margin:0;flex:1 1 220px">+2 to<select data-lvasi="a">${opt(A.a, room(2))}</select></label>`
      : `<label class="lbl" style="margin:0;flex:1 1 200px">+1 to<select data-lvasi="a">${opt(A.a, room(1), A.b)}</select></label><label class="lbl" style="margin:0;flex:1 1 200px">and +1 to<select data-lvasi="b">${opt(A.b, room(1), A.a)}</select></label>`}</div>`;
}
function lvFeatHTML(c) {
  const A = LV.asi;
  if (!A.feat) return `<button class="btn primary" type="button" data-featopen>✦ Choose a feat…</button>`;
  const F = featInfo(edOf(c), A.feat), max = F && F[4] === "b" ? 30 : 20, abs = featAbs(F), open = abs.filter(a => LV.cur[a] + 1 <= max);
  return `<div class="pick on feat-chosen"><b>${esc(A.feat)}</b>${F && F[5] ? ` <span class="tag gold">Homebrew</span>` : F && F[6] ? ` <span class="tag">${esc(dmBook(F[6]).short)}</span>` : F && F[4] ? ` <span class="tag">${FEAT_GROUPS[F[4]]}</span>` : ""}<small>${esc(F ? F[3] : "Your own feat — note its details under Features after levelling up.")}</small></div>
    ${open.length > 1 ? `<label class="lbl" style="margin:0;flex:1 1 220px">+1 from the feat to<select data-lvfeatab><option value="">Choose…</option>${abs.map(a => `<option value="${a}" ${A.featAb === a ? "selected" : ""} ${open.includes(a) ? "" : "disabled"}>${AB_FULL[a]} ${LV.cur[a]} → ${Math.min(max, LV.cur[a] + 1)}${open.includes(a) ? "" : ` (max ${max})`}</option>`).join("")}</select></label>`
      : open.length === 1 ? `<p class="hint" style="margin:0;flex:1 1 220px">Also +1 ${AB_FULL[open[0]]} (${LV.cur[open[0]]} → ${LV.cur[open[0]] + 1}).</p>` : ""}
    <button class="btn sm" type="button" data-featopen style="flex:0 0 auto;align-self:flex-end">Change feat</button>`;
}
/* ---- feat picker: pops out over the level-up window ---- */
const FP = { q: "", grp: "" };
function featOpen() {
  let m = $("#featModal");
  if (!m) {
    document.body.insertAdjacentHTML("beforeend", `<div id="featModal" role="dialog" aria-modal="true" aria-labelledby="featTitle"><div class="box">
      <div class="row" style="align-items:center"><h3 id="featTitle" style="flex:1;margin:0">Choose a feat</h3><button class="btn sm" type="button" data-featclose style="flex:0 0 auto">✕ Close</button></div>
      <div class="row" style="margin-top:10px;flex-wrap:wrap"><input type="search" id="featQ" placeholder="Search feats, e.g. armor, spell, speed" aria-label="Search feats" style="flex:2 1 240px"><div id="featGrp" class="row" style="flex:1 1 auto;gap:6px;flex-wrap:wrap"></div></div>
      <div id="featList"></div>
      <div class="row" style="margin-top:10px;flex-wrap:wrap;align-items:flex-end"><label class="lbl" style="margin:0;flex:1 1 240px">Not listed? Type your own feat<input type="text" id="featOwn" maxlength="80" placeholder="Feat name"></label><button class="btn" type="button" data-featown style="flex:0 0 auto">Use this feat</button></div>
    </div></div>`);
    m = $("#featModal");
    m.addEventListener("click", e => {
      const t = e.target, b = t.closest("[data-feat]"), g = t.closest("[data-featgrp]");
      if (t === m || t.closest("[data-featclose]")) { featClose(); return; }
      if (g) { FP.grp = g.dataset.featgrp; featRender(); g.focus(); return; }
      if (b && !b.disabled) { featPick(b.dataset.feat); return; }
      if (t.closest("[data-featown]")) { const v = $("#featOwn").value.trim(); if (v) featPick(v); else { toast("Type a feat name first"); $("#featOwn").focus(); } }
    });
    m.addEventListener("input", e => { if (e.target.id === "featQ") { FP.q = e.target.value; featRender(); } });
    m.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.stopPropagation(); featClose(); }
      else if (e.key === "Enter" && e.target.id === "featOwn") { e.preventDefault(); m.querySelector("[data-featown]").click(); }
    });
  }
  FP.q = ""; $("#featQ").value = ""; $("#featOwn").value = "";
  const ed = edOf(LV.c); FP.grp = ed === "2024" ? (LV.to >= 19 ? "b" : "g") : "";
  featRender(); m.classList.add("open"); $("#featQ").focus();
}
function featRender() {
  const { c, to, cur } = LV, ed = edOf(c);
  const taken = new Set([...Object.entries(c.asiPicks || {}).filter(([k, v]) => +k < to && v && v.feat).map(([, v]) => v.feat), ...(c.bonusFeats || []).map(b => b.n)]);
  const tabs = (ed === "2024" ? [["", "All"], ["g", "General"], ["o", "Origin"], ["b", "Epic boon"]] : [["", "All"]]).concat(featList(ed).some(F => F[5]) ? [["h", "Homebrew"]] : []);
  $("#featGrp").innerHTML = tabs.length > 1 ? tabs.map(([k, l]) => `<button type="button" class="btn sm ${FP.grp === k ? "primary" : ""}" data-featgrp="${k}" aria-pressed="${FP.grp === k}" style="flex:0 0 auto">${l}</button>`).join("") : "";
  const words = FP.q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = featList(ed).filter(F => (!FP.grp || (FP.grp === "h" ? F[5] : F[4] === FP.grp)) && words.every(w => (F[0] + " " + F[3] + " " + featReqText(F)).toLowerCase().includes(w)));
  $("#featList").innerHTML = list.length ? `<div class="pick-grid">${list.map(F => {
    const why = taken.has(F[0]) && !FEAT_REPEAT.has(F[0]) ? "Already taken" : featBlock(F, c, cur, to), abs = featAbs(F), req = featReqText(F);
    return `<button type="button" class="pick ${LV.asi.feat === F[0] ? "on" : ""}" data-feat="${esc(F[0])}" ${why ? `disabled aria-disabled="true"` : ""}>
      <b>${esc(F[0])}</b>${F[5] ? ` <span class="tag gold">Homebrew</span>` : F[6] ? ` <span class="tag">${esc(dmBook(F[6]).short)}</span>` : F[4] && !FP.grp ? ` <span class="tag">${FEAT_GROUPS[F[4]]}</span>` : ""}
      ${req ? `<small class="req">Prerequisite: ${esc(req)}</small>` : ""}
      ${abs.length ? `<small>+1 ${abs.length === 6 ? "to any score" : abs.map(a => AB_NAME[a]).join(" or ")}${F[4] === "b" ? " (up to 30)" : ""}</small>` : ""}
      <small>${esc(F[3])}</small>${why ? `<small class="why">${esc(why)}</small>` : ""}</button>`;
  }).join("")}</div>` : `<p class="muted">No feats match “${esc(FP.q)}”.</p>`;
}
function featPick(name) { LV.asi.feat = name; LV.asi.featAb = ""; featClose(); lvRender("[data-lvfeatab], [data-featopen]"); }
function featClose() { const m = $("#featModal"); if (m) m.classList.remove("open"); const f = $("#lvModal [data-featopen]"); if (f) f.focus(); }
function mcDialog(c) {
  pcEnsure(c); ACTX.c = c; ACTX.mc = { pick: "", sub: "", ok: false };
  const ed = edOf(c), have = (c.multi || []).filter(x => +x.lv > 0), fresh = classList(ed).filter(k => k !== c.cls && !have.some(x => x.cls === k));
  const needAll = [c.cls, ...have.map(x => x.cls)].filter(k => !mcMeets(c, k));
  const opt = (k, label) => { const ok = mcMeets(c, k); return `<label class="mc-opt"><input type="radio" name="mcPick" value="${esc(k)}"> <b>${esc(label)}</b> <span class="${ok ? "muted" : "warn"}">${ok ? "✓" : "✗"} needs ${esc(mcPrereqText(k))}</span></label>`; };
  actDialog(`<h3 id="actTitle">Level up in another class</h3>
    <p class="muted" style="margin:4px 0 10px">${esc(c.name)} is ${esc(classLine(c))} (level ${totalLv(c)}). Pick the class that gains level ${totalLv(c) + 1}.</p>
    ${have.length ? `<fieldset class="mc-set"><legend>Classes you already have</legend>${have.map(x => opt(x.cls, `${x.cls} ${x.lv} → ${x.lv + 1}`)).join("")}</fieldset>` : ""}
    <fieldset class="mc-set"><legend>A new class</legend>${fresh.map(k => opt(k, `${k} 1`)).join("")}</fieldset>
    ${needAll.length ? `<p class="warn" style="margin:8px 0 0">To multiclass you also need the prerequisites of the classes you already have: ${needAll.map(k => `${esc(k)} (${esc(mcPrereqText(k))})`).join(", ")}.</p>` : ""}
    <div id="mcSub"></div>
    <label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:14px"><input type="checkbox" id="mcOverride"> My DM lets me ignore the prerequisites</label>
    <p class="hint" id="mcMiss" aria-live="polite"></p>
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Cancel</button><button class="btn primary" type="button" data-mcgo style="flex:0 0 auto" disabled>⬆ Level up</button></div>`);
}
function mcRefresh() {
  const c = ACTX.c, M = ACTX.mc, ed = edOf(c), k = M.pick; if (!k) return;
  const cur = ((c.multi || []).find(x => x.cls === k) || { lv: 0, subclass: null }), to = cur.lv + 1, sl = subclassLevel(ed, k), needSub = to >= sl && !cur.subclass;
  $("#mcSub").innerHTML = needSub ? `<div class="field" style="margin:10px 0 0"><label for="mcSubSel">${esc(k)} subclass (chosen at ${esc(k)} level ${sl})</label><select id="mcSubSel"><option value="">Choose…</option>${subclassList(ed, k).map(([n]) => `<option ${M.sub === n ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></div>` : "";
  const pre = [k, c.cls, ...(c.multi || []).filter(x => +x.lv > 0).map(x => x.cls)].every(x => mcMeets(c, x)), over = $("#mcOverride").checked;
  const miss = [!pre && !over ? "meet the prerequisites (or tick the DM option)" : "", needSub && !M.sub ? "choose a subclass" : ""].filter(Boolean);
  $("#mcMiss").textContent = miss.length ? cap1(miss.join(" and ")) + " to continue." : `${k} ${to} adds d${CLASS_DATA[k].hd} hit points and its level ${to} features.`;
  $("[data-mcgo]").disabled = miss.length > 0;
}
function mcGo() {
  const c = ACTX.c, M = ACTX.mc, k = M.pick; if (!k) return;
  const multi = (c.multi || []).map(x => ({ ...x })), ex = multi.find(x => x.cls === k);
  if (ex) { ex.lv += 1; if (M.sub) ex.subclass = M.sub; } else multi.push({ cls: k, lv: 1, subclass: M.sub || null });
  const cur = +c.hpCur, before = +c.hp; c.multi = multi;
  pcLevelTo(c, c.level); c.hpCur = isNaN(cur) ? c.hp : Math.min(c.hp, cur + (c.hp - before));
  actClose(); pcRefresh(c); toast(`${c.name} is now ${classLine(c)} (level ${totalLv(c)})`);
}
function mcDown(c, k) {
  const multi = (c.multi || []).map(x => ({ ...x })), ex = multi.find(x => x.cls === k); if (!ex) return;
  ex.lv -= 1; if (ex.lv < subclassLevel(edOf(c), k)) ex.subclass = null;
  c.multi = multi.filter(x => x.lv > 0);
  const cur = +c.hpCur; pcLevelTo(c, c.level); c.hpCur = isNaN(cur) ? c.hp : Math.min(c.hp, cur);
  pcRefresh(c); toast(`${c.name} is now ${classLine(c)}`);
}
document.addEventListener("click", e => {
  const up = e.target.closest("[data-mcup]"); if (up) { const c = pcById(up.dataset.mcup); if (c) mcDialog(c); return; }
  const dn = e.target.closest("[data-mcdown]"); if (dn) { const [id, ...k] = dn.dataset.mcdown.split("|"), c = pcById(id); if (c) mcDown(c, k.join("|")); }
});
function lvMissing() {
  const { c, to } = LV, out = [];
  if (LV.asi && !lvAsiPick()) out.push(LV.asi.mode === "feat" ? (LV.asi.feat ? "pick the score your feat raises" : "choose a feat") : LV.asi.mode === "two" ? "pick two different scores" : "pick a score");
  if (!c.subclass && to >= subclassLevel(edOf(c), c.cls) && !LV.pick) out.push("pick a subclass");
  return out;
}
function lvFoot() {
  const miss = lvMissing(), y = $("[data-lvyes]", $("#lvModal")), h = $("#lvMiss");
  if (y) y.disabled = miss.length > 0;
  if (h) h.textContent = miss.length ? cap1(miss.join(" and ")) + " to continue." : "";
}
function lvOpen(c, onlySub) {
  pcEnsure(c);
  const to = onlySub ? c.level : c.level + 1;
  Object.assign(LV, { c, to, pick: "", onlySub: !!onlySub, back: LV.chain ? LV.chain.back : document.activeElement, asi: !onlySub && lvHasAsi(c, to) ? { mode: "one", a: "", b: "", feat: "", featAb: "" } : null });
  LV.cur = lvBuild(c, to, lvPicks(c, to, { feat: "-" })).scores;
  let m = $("#lvModal");
  if (!m) {
    document.body.insertAdjacentHTML("beforeend", `<div id="lvModal" role="dialog" aria-modal="true" aria-labelledby="lvTitle"><div class="box" id="lvBox"></div></div>`);
    m = $("#lvModal");
    m.addEventListener("click", e => {
      const t = e.target, p = t.closest("[data-lvsub]");
      if (t === m || t.closest("[data-lvno]")) { lvClose(); return; }
      if (p) { LV.pick = p.dataset.lvsub; lvRender(`[data-lvsub="${CSS.escape(LV.pick)}"]`); return; }
      if (t.closest("[data-featopen]")) { featOpen(); return; }
      if (t.closest("[data-lvyes]")) lvConfirm();
    });
    m.addEventListener("change", e => {
      const t = e.target; if (!LV.asi) return;
      if (t.name === "lvAsiMode") { LV.asi.mode = t.value; LV.asi.a = LV.asi.b = ""; lvRender(`input[name="lvAsiMode"][value="${t.value}"]`); if (t.value === "feat" && !LV.asi.feat) featOpen(); }
      else if (t.dataset.lvfeatab !== undefined) { LV.asi.featAb = t.value; lvRender("[data-lvfeatab]"); }
      else if (t.dataset.lvasi) { LV.asi[t.dataset.lvasi] = t.value; lvRender(`[data-lvasi="${t.dataset.lvasi}"]`); }
    });
    m.addEventListener("keydown", e => { if (e.key === "Escape") lvClose(); });
  }
  lvRender(); m.classList.add("open");
  const f = $('input[name="lvAsiMode"]:checked, [data-lvsub], [data-lvyes]', m); if (f) f.focus();
}
function lvRender(focusSel) {
  const { c, to, onlySub } = LV, ed = edOf(c), sl = subclassLevel(ed, c.cls);
  const ask = !c.subclass && to >= sl, list = subclassList(ed, c.cls);
  const gains = onlySub ? [] : lvGains(c, to), ch = LV.chain;
  const step = ch ? ch.steps.indexOf(to) + 1 : 0, more = ch && step < ch.steps.length;
  const yes = more ? "Next →" : ch && ch.target > ch.start ? `⬆ Level up to ${ch.target}` : onlySub ? "Choose subclass" : `⬆ Level up to ${to}`;
  $("#lvBox").innerHTML = `<h3 id="lvTitle">${ch && ch.target > ch.start ? `Level ${esc(c.name)} up to ${ch.target}` : onlySub ? `Choose a subclass for ${esc(c.name)}` : `Level up ${esc(c.name)}`}</h3>
    ${ch && ch.steps.length > 1 ? `<p class="hint" style="margin:4px 0 0">Choice ${step} of ${ch.steps.length}. Levels with nothing to choose are applied automatically.</p>` : ""}
    ${onlySub ? "" : `<p style="margin:6px 0 4px"><span class="tag gold">Level ${c.level} → ${to} ${esc(c.cls)}</span></p><ul class="plain lv-gains">${gains.map(x => `<li>${x}</li>`).join("")}</ul>`}
    ${LV.asi ? lvAsiHTML(c, to) : ""}
    ${ask ? `<div class="sec-h" style="margin-top:14px"><h3>Choose your subclass</h3></div>
      <p class="hint" style="margin:4px 0 0">${esc(c.cls)}s choose a subclass at level ${sl} (${ed} rules). This is required to ${onlySub ? "finish the sheet" : "level up"}.</p>
      <div class="pick-grid" role="radiogroup" aria-label="Subclass">${list.map(([n, d]) => `<button type="button" class="pick ${LV.pick === n ? "on" : ""}" data-lvsub="${esc(n)}" role="radio" aria-checked="${LV.pick === n}"><b>${esc(n)}</b><small>${esc(d)}</small></button>`).join("")}</div>` : ""}
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" type="button" data-lvno style="flex:0">Cancel</button>
      <button class="btn primary" type="button" data-lvyes style="flex:0 0 auto">${yes}</button></div>
    <p class="hint" id="lvMiss" style="text-align:right;margin:6px 0 0" aria-live="polite"></p>`;
  lvFoot();
  if (focusSel) { const f = $(focusSel, $("#lvModal")); if (f) f.focus(); }
}
function lvClose(cancel = true) {
  featClose(); const m = $("#lvModal"); if (m) m.classList.remove("open");
  const c = LV.c, ch = LV.chain, b = LV.back; LV.c = null; LV.chain = null;
  if (cancel && ch && c) { // a typed level jump was cancelled part-way: put the character back as it was
    Object.keys(c).forEach(k => delete c[k]); Object.assign(c, ch.snap);
    pcRefresh(c); toast(`Cancelled — ${c.name} stays at level ${c.level}`);
  }
  if (b && document.contains(b)) b.focus();
}
// Levels between now and target that ask the player something: an ASI, or reaching the subclass level without one.
function lvChainSteps(c, target) {
  const out = [], sl = subclassLevel(edOf(c), c.cls); let sub = !!c.subclass;
  if (!sub && c.level >= sl) { out.push(c.level); sub = true; }
  for (let L = c.level + 1; L <= target; L++) if (lvHasAsi(c, L) || (!sub && L >= sl)) { out.push(L); if (L >= sl) sub = true; }
  return out;
}
// Go from the current level to target, stopping at each level that needs a choice.
function lvChain(c, target, done) {
  pcEnsure(c);
  LV.chain = { target, start: c.level, snap: JSON.parse(JSON.stringify(c)), steps: lvChainSteps(c, target), back: document.activeElement, done };
  lvNext(c);
}
function lvNext(c) {
  const ch = LV.chain;
  if (needsSubclass(c)) { lvOpen(c, true); return; }
  while (c.level < ch.target) {
    const to = c.level + 1;
    if (lvHasAsi(c, to) || (!c.subclass && to >= subclassLevel(edOf(c), c.cls))) { lvOpen(c, false); return; }
    pcLevelTo(c, to);
  }
  LV.c = c; lvClose(false); pcRefresh(c);
  toast(ch.done ? ch.done(c) : `${c.name} is now level ${c.level}${c.subclass && ch.steps.length ? ` — ${c.subclass}` : ""}`);
}
function lvConfirm() {
  const { c, to } = LV; if (!c || lvMissing().length) return;
  if (LV.pick) c.subclass = LV.pick;
  const pk = lvAsiPick(); if (pk) c.asiPicks = lvPicks(c, to, pk);
  if (LV.chain) { pcLevelTo(c, to); lvNext(c); return; }
  const up = to !== c.level; pcLevelTo(c, to); lvClose(false); LV.back = null; pcRefresh(c);
  toast(up ? `${c.name} is now level ${to}${LV.pick ? ` — ${LV.pick}` : ""}` : `${c.name} follows the ${LV.pick}`);
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-lvup], [data-subpick]"); if (!b) return;
  const c = pcById(b.dataset.lvup || b.dataset.subpick); if (!c) return;
  lvOpen(c, !!b.dataset.subpick);
});

/* ======================= Homebrew editor (DM) ======================= */
const HBE = { id: null, draft: null, saved: "" };
const hbBuiltIn = (kind, name, cls) => {
  const n = name.toLowerCase(), has = l => l.some(x => x.toLowerCase() === n);
  if (kind === "background") return has(Object.keys(BACKGROUNDS).filter(x => !HB_BG[x]));
  if (kind === "spell") { spLoad(); return has([...SP.data["2014"], ...SP.data["2024"]].filter(x => !x.hb).map(x => x.n)); }
  if (kind === "species") return ["2014", "2024"].some(ed => has(Object.keys(PC_RACES[ed]).filter(x => !PC_RACES[ed][x].hb)));
  if (kind === "class") return has(builtInClasses());
  if (kind === "feat") return has([...FEATS["2014"], ...FEATS["2024"]].map(F => F[0]));
  return ["2014", "2024"].some(ed => has(((SUBCLASSES[ed] || {})[cls] || []).map(x => x[0])));
};
function hbNew(kind) {
  const d = { id: uid("hb"), kind, name: "", ed: "both", desc: "" };
  if (kind === "subclass") Object.assign(d, { cls: Object.keys(CLASS_DATA)[0], features: [{ l: 3, n: "", d: "" }] });
  if (kind === "class") Object.assign(d, { hd: 8, pri: ["str", ""], saves: ["str", "con"], skN: 2, skFrom: [], skAny: false, armor: [], weapons: "Simple weapons", tools: "", kit: "",
    wpnN: "Club", wpnD: "1d4", wpnAb: "str", cast: "none", castAb: "int", spellsFrom: "", subName: "Subclass", subLv: 3, features: [{ l: 1, n: "", d: "" }] });
  if (kind === "background") Object.assign(d, { skills: ["", ""], feat: "", gear: "" });
  if (kind === "feat") Object.assign(d, { group: "g", reqType: "none", reqAb: "str", reqMin: 13, reqText: "", abType: "none", abs: [] });
  if (kind === "species") Object.assign(d, { speed: 30, skills: [""], asi: {}, traits: [{ l: 1, n: "", d: "" }], subs: [], term: "" });
  if (kind === "spell") Object.assign(d, { l: 1, s: "Evocation", c: [], t: "1 action", r: "60 feet", cp: "VS", m: "", du: "Instantaneous", co: false, ri: false, h: "" });
  return d;
}
function hbDraftOf(x) { // a saved entry -> editable form state
  const d = JSON.parse(JSON.stringify(x));
  if (d.kind === "feat") {
    const r = d.req || "";
    Object.assign(d, { reqType: !r ? "none" : r === "cast" ? "cast" : r[0] === "@" ? "other" : "ability", reqAb: /^[a-z]{3}\d/.test(r) ? r.slice(0, 3) : "str", reqMin: /^[a-z]{3}\d/.test(r) ? +r.slice(3).split("|")[0] || 13 : 13, reqText: r[0] === "@" ? r.slice(1) : "",
      abType: !d.ab ? "none" : d.ab === "any" ? "any" : "some", abs: d.ab && d.ab !== "any" ? d.ab.split(" ") : [] });
  }
  if (d.kind === "species") { d.skills = d.skills && d.skills.length ? d.skills : [""]; d.asi = d.asi || {}; d.traits = d.traits || []; d.subs = d.subs || []; }
  if (d.kind === "background") d.skills = [...(d.skills || []), "", ""].slice(0, 2);
  if (d.kind === "class") {
    const sk = d.skills || {}, w = d.wpn || {};
    Object.assign(d, { pri: [...(d.pri || []), "", ""].slice(0, 2), saves: [...(d.saves || []), "", ""].slice(0, 2), skN: sk.n ?? 2, skFrom: sk.from || [], skAny: !!sk.any, armor: d.armor || [],
      wpnN: w.n || "", wpnD: w.d || "1d4", wpnAb: w.ab || "str", cast: d.cast || "none", castAb: d.castAb || "int", spellsFrom: d.spellsFrom || "", features: d.features || [] });
    delete d.skills; delete d.wpn;
  }
  return d;
}
function hbItemOf(d) { // form state -> the entry that is saved and shared
  const t = (v, n) => String(v ?? "").trim().slice(0, n);
  const rows = (l, lv) => (l || []).map(r => ({ ...(lv ? { l: clamp(parseInt(r.l) || 1, 1, 20) } : {}), n: t(r.n, 60), d: t(r.d, 4000), fx: fxClean(r.fx) })).filter(r => r.n);
  const x = { id: d.id, kind: d.kind, name: t(d.name, 60), ed: d.ed || "both", desc: t(d.desc, 4000) };
  if (d.kind === "spell") Object.assign(x, { l: clamp(parseInt(d.l) || 0, 0, 9), s: SP_SCHOOLS.includes(d.s) ? d.s : "Evocation", c: (d.c || []).filter(k => CLASS_DATA[k]), t: t(d.t, 120), r: t(d.r, 80), cp: ["V", "S", "M"].filter(k => String(d.cp || "").includes(k)).join(""), m: t(d.m, 200), du: t(d.du, 80), co: !!d.co, ri: !!d.ri, h: t(d.h, 2000) });
  if (d.kind === "subclass") Object.assign(x, { cls: d.cls, features: rows(d.features, true).sort((a, b) => a.l - b.l) });
  if (d.kind === "class") {
    const ab = a => AB.includes(a) ? a : null, cast = ["full", "half", "pact"].includes(d.cast) ? d.cast : "none";
    Object.assign(x, { hd: [6, 8, 10, 12].includes(+d.hd) ? +d.hd : 8, pri: [...new Set(d.pri.map(ab).filter(Boolean))], saves: [...new Set(d.saves.map(ab).filter(Boolean))],
      skills: { n: clamp(parseInt(d.skN) || 0, 0, 8), any: !!d.skAny, from: d.skAny ? [] : (d.skFrom || []).filter(k => SKILLS[k]) },
      armor: ["light", "medium", "heavy", "shield"].filter(k => (d.armor || []).includes(k)), weapons: t(d.weapons, 300), tools: t(d.tools, 300), kit: t(d.kit, 300),
      wpn: { n: t(d.wpnN, 40) || "Club", d: /^\d+d\d+$/.test(String(d.wpnD).trim()) ? String(d.wpnD).trim() : "1d4", ab: ab(d.wpnAb) || "str" },
      cast, ...(cast !== "none" ? { castAb: ab(d.castAb) || "int", spellsFrom: CLASS_DATA[d.spellsFrom] && !CLASS_DATA[d.spellsFrom].hb ? d.spellsFrom : "" } : {}),
      subName: t(d.subName, 60) || "Subclass", subLv: clamp(parseInt(d.subLv) || 3, 1, 20), features: rows(d.features, true).sort((a, b) => a.l - b.l) });
    if (d.src) x.src = d.src;
  }
  if (d.kind === "background") Object.assign(x, { skills: d.skills.filter(k => SKILLS[k]), feat: t(d.feat, 60), gear: t(d.gear, 300), fx: fxClean(d.fx) });
  if (d.kind === "feat") Object.assign(x, {
    fx: fxClean(d.fx), group: d.group === "o" ? "o" : "g",
    req: d.reqType === "cast" ? "cast" : d.reqType === "ability" ? `${d.reqAb}${clamp(parseInt(d.reqMin) || 13, 1, 30)}` : d.reqType === "other" && t(d.reqText, 80) ? "@" + t(d.reqText, 80) : "",
    ab: d.abType === "any" ? "any" : d.abType === "some" ? AB.filter(a => d.abs.includes(a)).join(" ") : "" });
  if (d.kind === "species") Object.assign(x, { speed: clamp(parseInt(d.speed) || 30, 0, 120), skills: d.skills.filter(k => SKILLS[k]).slice(0, 1),
    asi: Object.fromEntries(AB.filter(a => +d.asi[a]).map(a => [a, clamp(+d.asi[a], -2, 3)])), traits: rows(d.traits, true), subs: rows(d.subs).map(r => { const o = (d.subs || []).find(y => String(y.n ?? "").trim().slice(0, 60) === r.n), a = o && o.asi && Object.fromEntries(AB.filter(k => +o.asi[k]).map(k => [k, clamp(+o.asi[k], -2, 3)])); return a && Object.keys(a).length ? { ...r, asi: a } : r; }), term: t(d.term, 30) });
  return x;
}
const hbDirty = () => !!HBE.draft && JSON.stringify(hbItemOf(HBE.draft)) !== HBE.saved;
function hbProblem(x) {
  if (!x.name) return "Give it a name";
  if (hbBuiltIn(x.kind, x.name, x.cls)) return `“${x.name}” is already a built-in ${x.kind === "species" ? "species" : x.kind}. Pick another name.`;
  if (HB.list.some(y => y.id !== x.id && y.kind === x.kind && y.name.toLowerCase() === x.name.toLowerCase() && (x.kind !== "subclass" || y.cls === x.cls))) return `You already have a homebrew ${x.kind} called “${x.name}”`;
  if (x.kind === "background" && (x.skills.length !== 2 || x.skills[0] === x.skills[1])) return "Pick two different skills";
  if (x.kind === "class" && !x.pri.length) return "Pick the class's main ability";
  if (x.kind === "class" && x.saves.length !== 2) return "Pick two different saving throws";
  if (x.kind === "class" && !x.skills.any && x.skills.n > x.skills.from.length) return `Tick at least ${x.skills.n} skills to choose from, or tick Any skill`;
  if (x.kind === "feat" && HBE.draft.abType === "some" && !x.ab) return "Tick at least one ability the feat can raise, or choose None";
  return "";
}
async function hbOpen(id, kind) {
  if (hbDirty() && !(await confirmBox("Discard changes?", `Your changes to “${HBE.draft.name || "this entry"}” aren't saved.`, "Discard"))) return;
  const x = id && HB.list.find(y => y.id === id);
  HBE.draft = x ? hbDraftOf(x) : hbNew(kind); HBE.id = HBE.draft.id; HBE.saved = x ? JSON.stringify(hbItemOf(HBE.draft)) : "";
  renderHomebrew(); const n = $('#hbMain [data-hbf="name"]'); if (n) n.focus();
}
function renderHomebrew() {
  const side = $("#hbSide"), main = $("#hbMain"); if (!side) return;
  if (hbCloud() && !Portal.isDM()) { side.innerHTML = ""; main.innerHTML = `<div class="card empty"><h2>Homebrew</h2><p>Your DM adds homebrew for this campaign. It appears in your character choices.</p></div>`; return; }
  const where = hbCloud() ? `Shared with everyone in ${esc(Portal.campName())}. Players pick these when building and levelling characters.` : "Saved in this browser. Sign in and join a campaign to share homebrew with your players.";
  side.innerHTML = `<div class="sec-h"><h3>Homebrew</h3></div><p class="hint" style="margin:0 0 4px">${where}</p><button class="btn wide" type="button" id="hbBulk" style="margin:4px 0 8px">📥 Bulk import from a file</button>${hbPendHTML()}
    ${Object.entries(HB_KINDS).map(([k, l]) => `<div class="hb-kind"><h4>${l}</h4><button class="btn sm" type="button" data-hbnew="${k}" style="flex:0 0 auto" aria-label="New ${l.toLowerCase()}">+ New</button></div>
      ${hbOf(k).map(x => `<button class="camp-item ${HBE.id === x.id ? "on" : ""}" type="button" data-hbsel="${esc(x.id)}"><b>${esc(x.name)}</b><small>${esc([x.kind === "subclass" ? x.cls : x.kind === "class" ? `d${x.hd}${x.cast && x.cast !== "none" ? ", spellcaster" : ""}` : "", x.ed === "both" || !x.ed ? "2014 & 2024" : x.ed + " rules"].filter(Boolean).join(" · "))}</small></button>`).join("") || `<p class="muted" style="font-size:14px;margin:0">None yet.</p>`}`).join("")}`;
  const d = HBE.draft;
  if (!d) { main.innerHTML = `<div class="card empty"><h2>Make your own rules content</h2><p>Create classes, subclasses, backgrounds, feats, species and spells. They show up next to the built-in options in the character creator, the Level up window, the feat list and the Spells tab${hbCloud() ? " for every player in your campaign" : ""}.</p><p>Pick “+ New” on the left to start.</p></div>`; return; }
  main.innerHTML = hbFormHTML(d); $$("textarea", main).forEach(autoGrow);
}
function fxHTML(path, list) {
  const o = (v, opts) => opts.map(([k, l]) => `<option value="${esc(k)}" ${v === k ? "selected" : ""}>${esc(l)}</option>`).join("");
  const at = (j, k) => `data-fx="${path}" data-j="${j}" data-k="${k}"`;
  return `<div class="hb-fx"><span class="fx-lbl">Changes to the sheet</span>${(list || []).map((e, j) => `<div class="hb-fxrow">
      <select ${at(j, "t")} aria-label="What it changes">${o(e.t, Object.entries(HB_FX))}</select>
      ${fxNum(e.t) ? `<input type="number" ${at(j, "v")} value="${esc(e.v)}" aria-label="Amount" title="Amount (negative to reduce)">` : ""}
      ${fxAb(e.t) ? `<select ${at(j, "a")} aria-label="Ability">${o(e.a, AB.map(a => [a, AB_FULL[a]]))}</select>` : fxSkill(e.t) ? `<select ${at(j, "a")} aria-label="Skill">${o(e.a, ALL_SKILLS.map(k => [k, k]))}</select>` : fxDmg(e.t) ? `<select ${at(j, "a")} aria-label="Damage type">${o(e.a, FX_DMG.map(k => [k, cap1(k)]))}</select>` : fxCond(e.t) ? `<select ${at(j, "a")} aria-label="Condition">${o(e.a, FX_COND.map(k => [k, cap1(k)]))}</select>` : fxSadv(e.t) ? `<select ${at(j, "a")} aria-label="Against">${o(e.a, SADV_OPTS.map(k => [k, / saves$/.test(k) ? `All ${k}` : cap1(k)]))}</select>` : ""}
      ${e.t === "ab" ? `<label class="hint" style="margin:0">up to <input type="number" min="1" max="30" ${at(j, "max")} value="${esc(e.max ?? 20)}" aria-label="Maximum score"></label>` : ""}
      <button class="icon-btn" type="button" data-fxdel="${path}" data-j="${j}" title="Remove effect" aria-label="Remove effect">✕</button></div>`).join("")}
    <button class="btn sm" type="button" data-fxadd="${path}">+ Add an effect</button></div>`;
}
const fxList = (d, path) => { if (path === "fx") return d.fx = d.fx || []; const [k, i] = path.split("."); const r = d[k][+i]; return r.fx = r.fx || []; };
function hbFormHTML(d) {
  const isNew = !HB.list.some(x => x.id === d.id), kindName = { class: "class", subclass: "subclass", background: "background", feat: "feat", species: "species", spell: "spell" }[d.kind];
  const sel = (f, opts, v) => `<select data-hbf="${f}">${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(v) === String(k) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  const skillOpts = [["", "Choose…"], ...ALL_SKILLS.map(k => [k, k])];
  const rowsHTML = (key, lv, nameLbl) => `<div class="hb-rows">${(d[key] || []).map((r, i) => `<div class="hb-row ${lv ? "" : "nolv"}">
      ${lv ? `<label class="lbl" style="margin:0">Level<input type="number" min="1" max="20" data-hbrow="${key}" data-i="${i}" data-k="l" value="${esc(r.l)}"></label>` : ""}
      <label class="lbl" style="margin:0">${nameLbl}<input type="text" maxlength="60" data-hbrow="${key}" data-i="${i}" data-k="n" value="${esc(r.n)}"></label>
      <label class="lbl" style="margin:0">What it does<textarea maxlength="4000" data-hbrow="${key}" data-i="${i}" data-k="d">${esc(r.d)}</textarea></label>
      <button class="icon-btn" type="button" data-hbdel="${key}" data-i="${i}" title="Remove" aria-label="Remove ${esc(r.n || "row")}" style="margin-top:22px">✕</button>
      ${fxHTML(`${key}.${i}`, r.fx)}</div>`).join("")}</div>`;
  let body = "";
  if (d.kind === "subclass") {
    const sl = d.ed === "2024" ? 3 : d.ed === "2014" ? CLASS_DATA[d.cls].sub[1] : null;
    body = `<div class="field"><label>Class</label>${sel("cls", Object.keys(CLASS_DATA).map(k => [k, k]), d.cls)}
      <p class="hint" style="margin:6px 0 0">${esc(d.cls)}s choose a subclass at level ${sl || `${CLASS_DATA[d.cls].sub[1]} (2014) or 3 (2024)`}. Features appear on the sheet once the character reaches their level.</p></div>
      <div class="sec-h" style="margin-top:6px"><h3>Features</h3><span class="sp"></span><button class="btn sm" type="button" data-hbadd="features">+ Add feature</button></div>${rowsHTML("features", true, "Feature name")}`;
  }
  if (d.kind === "class") {
    const abOpts = (none) => [...(none ? [["", none]] : []), ...AB.map(a => [a, AB_FULL[a]])];
    const tick = (attr, on, label) => `<label class="check" style="flex:0 0 auto;margin:0"><input type="checkbox" ${attr} ${on ? "checked" : ""}><span>${label}</span></label>`;
    body = `<div class="field row"><div><label>Hit die</label>${sel("hd", [6, 8, 10, 12].map(n => [n, "d" + n]), d.hd)}</div>
        <div><label>Main ability</label>${sel("pri.0", abOpts(), d.pri[0])}</div><div><label>Second ability (optional)</label>${sel("pri.1", abOpts("None"), d.pri[1])}</div></div>
      <div class="field row"><div><label>Saving throw</label>${sel("saves.0", abOpts(), d.saves[0])}</div><div><label>Second saving throw</label>${sel("saves.1", abOpts(), d.saves[1])}</div></div>
      <div class="field"><label>Skills: choose <input type="number" min="0" max="8" data-hbf="skN" value="${esc(d.skN)}" style="width:64px;display:inline-block" aria-label="How many skills"> from</label>
        <div class="row" style="flex-wrap:wrap">${tick("data-hbskany", d.skAny, "Any skill")}${d.skAny ? "" : ALL_SKILLS.map(k => tick(`data-hbsk="${esc(k)}"`, d.skFrom.includes(k), k)).join("")}</div></div>
      <div class="field"><label>Armor training</label><div class="row" style="flex-wrap:wrap">${[["light", "Light armor"], ["medium", "Medium armor"], ["heavy", "Heavy armor"], ["shield", "Shields"]].map(([k, l]) => tick(`data-hbarm="${k}"`, d.armor.includes(k), l)).join("")}</div></div>
      <div class="field row"><div><label>Weapons</label><input type="text" maxlength="300" data-hbf="weapons" value="${esc(d.weapons)}" placeholder="e.g. Simple and martial weapons"></div><div><label>Tools (optional)</label><input type="text" maxlength="300" data-hbf="tools" value="${esc(d.tools)}" placeholder="e.g. Alchemist's supplies"></div></div>
      <div class="field"><label>Starting equipment (commas between items)</label><input type="text" maxlength="300" data-hbf="kit" value="${esc(d.kit)}" placeholder="e.g. Longsword, Studded leather armor, Explorer's pack"></div>
      <div class="field row"><div style="flex:2"><label>Main weapon (for the sheet's attack)</label><input type="text" maxlength="40" data-hbf="wpnN" value="${esc(d.wpnN)}"></div><div><label>Damage</label><input type="text" maxlength="8" data-hbf="wpnD" value="${esc(d.wpnD)}" placeholder="1d8"></div><div><label>Uses</label>${sel("wpnAb", abOpts(), d.wpnAb)}</div></div>
      <div class="field row"><div><label>Spellcasting</label>${sel("cast", [["none", "None"], ["full", "Full caster (like a Wizard)"], ["half", "Half caster (like a Paladin)"], ["pact", "Pact magic (like a Warlock)"]], d.cast)}</div>
        ${d.cast !== "none" ? `<div><label>Spellcasting ability</label>${sel("castAb", abOpts(), d.castAb)}</div><div><label>Spell list</label>${sel("spellsFrom", [["", "Only spells marked for this class"], ...builtInClasses().filter(k => CLASS_DATA[k].cast).map(k => [k, `The ${k} list`])], d.spellsFrom)}</div>` : ""}</div>
      <div class="field row"><div style="flex:2"><label>Subclasses are called</label><input type="text" maxlength="60" data-hbf="subName" value="${esc(d.subName)}" placeholder="e.g. Blood Hunter Order"></div><div><label>Chosen at level</label><input type="number" min="1" max="20" data-hbf="subLv" value="${esc(d.subLv)}"></div></div>
      <p class="hint" style="margin:0 0 6px">Make its subclasses as homebrew subclasses for this class. Ability Score Improvements come at levels 4, 8, 12, 16 and 19.</p>
      <div class="sec-h" style="margin-top:6px"><h3>Features</h3><span class="sp"></span><button class="btn sm" type="button" data-hbadd="features">+ Add feature</button></div>${rowsHTML("features", true, "Feature name")}`;
  }
  if (d.kind === "background") body = `<div class="field row"><div><label>Skill proficiency</label>${sel("skills.0", skillOpts, d.skills[0])}</div><div><label>Second skill</label>${sel("skills.1", skillOpts, d.skills[1])}</div></div>
      <div class="field row"><div><label>Origin feat (optional)</label><input type="text" maxlength="60" data-hbf="feat" value="${esc(d.feat)}" placeholder="e.g. Alert"></div><div><label>Equipment (optional)</label><input type="text" maxlength="300" data-hbf="gear" value="${esc(d.gear)}" placeholder="e.g. a lantern, a map case, 10 gp"></div></div>
      <div class="field">${fxHTML("fx", d.fx)}</div>`;
  if (d.kind === "feat") body = `${d.ed !== "2014" ? `<div class="field"><label>Feat type (2024 rules)</label>${sel("group", [["g", "General — taken at level 4 and later"], ["o", "Origin — also fits a background"]], d.group)}</div>` : ""}
      <div class="field"><label>Prerequisite</label><div class="row" style="flex-wrap:wrap">${sel("reqType", [["none", "None"], ["ability", "An ability score"], ["cast", "Can cast spells"], ["other", "Something else (shown, not checked)"]], d.reqType)}
        ${d.reqType === "ability" ? `${sel("reqAb", AB.map(a => [a, AB_FULL[a]]), d.reqAb)}<label class="lbl" style="margin:0;flex:0 0 110px">At least<input type="number" min="1" max="30" data-hbf="reqMin" value="${esc(d.reqMin)}"></label>` : d.reqType === "other" ? `<input type="text" maxlength="80" data-hbf="reqText" value="${esc(d.reqText)}" placeholder="e.g. Proficiency with shields">` : ""}</div></div>
      <div class="field"><label>Raises an ability score by 1</label>${sel("abType", [["none", "No"], ["any", "Yes, any score the player picks"], ["some", "Yes, one of these…"]], d.abType)}
        ${d.abType === "some" ? `<div class="row" style="flex-wrap:wrap;margin-top:8px">${AB.map(a => `<label class="check" style="flex:0 0 auto;margin:0"><input type="checkbox" data-hbab="${a}" ${d.abs.includes(a) ? "checked" : ""}><span>${AB_FULL[a]}</span></label>`).join("")}</div>` : ""}</div>
      <div class="field">${fxHTML("fx", d.fx)}<p class="hint" style="margin:6px 0 0">The +1 the player picks is handled above; add effects here for anything else the feat changes.</p></div>`;
  if (d.kind === "species") body = `<div class="field row"><div><label>Speed (ft)</label><input type="number" min="0" max="120" data-hbf="speed" value="${esc(d.speed)}"></div><div><label>Skill proficiency (optional)</label>${sel("skills.0", [["", "None"], ...ALL_SKILLS.map(k => [k, k])], d.skills[0])}</div></div>
      ${d.ed !== "2024" ? `<div class="field"><label>Ability score increases (2014 rules)</label><div class="hb-asi">${AB.map(a => `<label class="lbl" style="margin:0">${AB_NAME[a]}<input type="number" min="-2" max="3" data-hbasi="${a}" value="${esc(d.asi[a] || 0)}"></label>`).join("")}</div>
        <p class="hint" style="margin:6px 0 0">In the 2024 rules ability increases come from the background, so these only apply to 2014 characters.</p></div>` : ""}
      <div class="sec-h" style="margin-top:6px"><h3>Traits</h3><span class="sp"></span><button class="btn sm" type="button" data-hbadd="traits">+ Add trait</button></div>
      <p class="hint" style="margin:4px 0 0">Level 1 traits apply from the start. Give a trait a higher level and it is added to the sheet when the character reaches it.</p>${rowsHTML("traits", true, "Trait name")}
      <div class="sec-h" style="margin-top:14px"><h3>Subraces / lineages (optional)</h3><span class="sp"></span><button class="btn sm" type="button" data-hbadd="subs">+ Add</button></div>
      ${d.subs.length ? `<div class="field" style="margin-top:6px"><label>Called</label><input type="text" maxlength="30" data-hbf="term" value="${esc(d.term)}" placeholder="Subrace"></div>` : ""}${rowsHTML("subs", false, "Name")}`;
  if (d.kind === "spell") {
    const tick = (attr, on, label) => `<label class="check" style="flex:0 0 auto;margin:0"><input type="checkbox" ${attr} ${on ? "checked" : ""}><span>${label}</span></label>`;
    body = `<div class="field row"><div><label>Level</label>${sel("l", Array.from({ length: 10 }, (_, i) => [i, i ? `Level ${i}` : "Cantrip"]), d.l)}</div><div><label>School</label>${sel("s", SP_SCHOOLS.map(k => [k, k]), d.s)}</div></div>
      <div class="field"><label>Classes that can learn it</label><div class="row" style="flex-wrap:wrap">${Object.keys(CLASS_DATA).map(k => tick(`data-hbcls="${k}"`, (d.c || []).includes(k), k)).join("")}</div></div>
      <div class="field row"><div><label>Casting time</label><input type="text" maxlength="120" data-hbf="t" value="${esc(d.t)}"></div><div><label>Range</label><input type="text" maxlength="80" data-hbf="r" value="${esc(d.r)}"></div><div><label>Duration</label><input type="text" maxlength="80" data-hbf="du" value="${esc(d.du)}"></div></div>
      <div class="field"><label>Components</label><div class="row" style="flex-wrap:wrap;align-items:center">${["V", "S", "M"].map(k => tick(`data-hbcp="${k}"`, String(d.cp || "").includes(k), { V: "Verbal", S: "Somatic", M: "Material" }[k])).join("")}
        ${String(d.cp || "").includes("M") ? `<input type="text" maxlength="200" data-hbf="m" value="${esc(d.m)}" placeholder="Material, e.g. a pinch of salt" style="flex:1;min-width:200px">` : ""}</div></div>
      <div class="field"><div class="row" style="flex-wrap:wrap">${tick('data-hbflag="co"', d.co, "Concentration")}${tick('data-hbflag="ri"', d.ri, "Ritual")}</div></div>
      <div class="field"><label>At higher levels (optional)</label><textarea maxlength="2000" data-hbf="h">${esc(d.h)}</textarea></div>`;
  }
  return `<div class="card">
    <div class="row" style="align-items:flex-start;flex-wrap:wrap"><div class="sheet-h" style="font-size:22px;flex:1">${isNew ? `New ${kindName}` : esc(d.name || kindName)}</div>
      ${isNew ? "" : `<button class="btn sm danger" type="button" data-hbact="del" style="flex:0 0 auto">✕ Delete</button>`}</div>
    <div class="field row" style="margin-top:10px"><div style="flex:2"><label>Name</label><input type="text" maxlength="60" data-hbf="name" value="${esc(d.name)}"></div>
      <div><label>Rules edition</label>${sel("ed", [["both", "2014 & 2024"], ["2014", "2014 only"], ["2024", "2024 only"]], d.ed)}</div></div>
    <div class="field"><label>Description</label><textarea maxlength="4000" data-hbf="desc" placeholder="${d.kind === "spell" ? "What the spell does" : "What players should know when choosing it"}">${esc(d.desc)}</textarea></div>
    ${body}
    <div class="row" style="justify-content:flex-end;margin-top:16px;flex-wrap:wrap;gap:8px"><span class="hint" id="hbMsg" style="flex:1;margin:0" aria-live="polite"></span>
      <button class="btn" type="button" data-hbact="close" style="flex:0 0 auto">Close</button><button class="btn primary" type="button" data-hbact="save" style="flex:0 0 auto">${isNew ? "Create" : "Save changes"}</button></div>
  </div>`;
}
(function initHomebrew() {
  const side = $("#hbSide"), main = $("#hbMain");
  side.addEventListener("click", e => {
    const pa = e.target.closest("[data-pendact]");
    if (pa) { if (pa.dataset.pendact === "ok") hbApprove(pa.dataset.pendkey); else hbReject(pa.dataset.pendkey); return; }
    const n = e.target.closest("[data-hbnew]"), s = e.target.closest("[data-hbsel]");
    if (n) hbOpen(null, n.dataset.hbnew); else if (s && s.dataset.hbsel !== HBE.id) hbOpen(s.dataset.hbsel);
  });
  const set = (d, f, v) => { if (f.includes(".")) { const [k, i] = f.split("."); d[k][+i] = v; } else d[f] = v; };
  main.addEventListener("input", e => {
    const d = HBE.draft, t = e.target; if (!d) return;
    if (t.dataset.hbf && t.tagName !== "SELECT") set(d, t.dataset.hbf, t.value);
    else if (t.dataset.hbrow) d[t.dataset.hbrow][+t.dataset.i][t.dataset.k] = t.value;
    else if (t.dataset.hbasi) d.asi[t.dataset.hbasi] = +t.value || 0;
    else if (t.dataset.fx && t.tagName === "INPUT") fxList(d, t.dataset.fx)[+t.dataset.j][t.dataset.k] = t.value;
    if (t.tagName === "TEXTAREA") autoGrow(t);
  });
  main.addEventListener("change", e => {
    const d = HBE.draft, t = e.target; if (!d) return;
    if (t.tagName === "SELECT" && t.dataset.hbf) { set(d, t.dataset.hbf, t.value); if (["ed", "cls", "reqType", "abType", "cast"].includes(t.dataset.hbf)) { renderHomebrew(); const f = $(`#hbMain [data-hbf="${t.dataset.hbf}"]`); if (f) f.focus(); } }
    else if (t.dataset.hbab) { d.abs = AB.filter(a => a === t.dataset.hbab ? t.checked : d.abs.includes(a)); }
    else if (t.dataset.hbsk) { const k = t.dataset.hbsk; d.skFrom = ALL_SKILLS.filter(x => x === k ? t.checked : d.skFrom.includes(x)); }
    else if (t.dataset.hbskany !== undefined) { d.skAny = t.checked; renderHomebrew(); }
    else if (t.dataset.hbarm) { const k = t.dataset.hbarm; d.armor = ["light", "medium", "heavy", "shield"].filter(x => x === k ? t.checked : d.armor.includes(x)); }
    else if (t.dataset.hbcls) { const k = t.dataset.hbcls; d.c = Object.keys(CLASS_DATA).filter(x => x === k ? t.checked : (d.c || []).includes(x)); }
    else if (t.dataset.hbcp) { const k = t.dataset.hbcp; d.cp = ["V", "S", "M"].filter(x => x === k ? t.checked : String(d.cp || "").includes(x)).join(""); if (k === "M") renderHomebrew(); }
    else if (t.dataset.hbflag) d[t.dataset.hbflag] = t.checked;
    else if (t.dataset.fx && t.tagName === "SELECT") {
      const e = fxList(d, t.dataset.fx)[+t.dataset.j]; e[t.dataset.k] = t.value;
      if (t.dataset.k === "t") { e.a = fxAb(e.t) ? "str" : fxSkill(e.t) ? ALL_SKILLS[0] : fxDmg(e.t) ? "fire" : fxCond(e.t) || fxSadv(e.t) ? "charmed" : undefined; if (fxNum(e.t) && !e.v) e.v = 1; renderHomebrew(); const f = $(`#hbMain [data-fx="${t.dataset.fx}"][data-j="${t.dataset.j}"][data-k="t"]`); if (f) f.focus(); }
    }
  });
  main.addEventListener("click", async e => {
    const d = HBE.draft; if (!d) return; const t = e.target;
    const add = t.closest("[data-hbadd]"), del = t.closest("[data-hbdel]"), act = t.closest("[data-hbact]");
    if (add) { const k = add.dataset.hbadd; d[k].push(k === "features" ? { l: d[k].length ? d[k][d[k].length - 1].l : 3, n: "", d: "" } : k === "traits" ? { l: 1, n: "", d: "" } : { n: "", d: "" }); renderHomebrew(); const ins = $$(`#hbMain [data-hbrow="${k}"][data-k="n"]`); if (ins.length) ins[ins.length - 1].focus(); return; }
    if (del) { d[del.dataset.hbdel].splice(+del.dataset.i, 1); renderHomebrew(); return; }
    const fa = t.closest("[data-fxadd]"), fd = t.closest("[data-fxdel]");
    if (fa) { const l = fxList(d, fa.dataset.fxadd); l.push({ t: "ac", v: 1 }); renderHomebrew(); const f = $(`#hbMain [data-fx="${fa.dataset.fxadd}"][data-j="${l.length - 1}"][data-k="t"]`); if (f) f.focus(); return; }
    if (fd) { fxList(d, fd.dataset.fxdel).splice(+fd.dataset.j, 1); renderHomebrew(); return; }
    if (!act) return;
    if (act.dataset.hbact === "close") { if (hbDirty() && !(await confirmBox("Discard changes?", "Your changes aren't saved.", "Discard"))) return; HBE.draft = null; HBE.id = null; renderHomebrew(); return; }
    if (act.dataset.hbact === "del") {
      if (!(await confirmBox(`Delete ${d.name || "this entry"}?`, `Characters that already use it keep its name on their sheet, but it disappears from the choices${hbCloud() ? " for everyone in the campaign" : ""}.`, "Delete"))) return;
      if (await hbDel(d.id)) { toast(`${d.name} deleted`); HBE.draft = null; HBE.id = null; renderHomebrew(); }
      return;
    }
    const x = hbItemOf(d), bad = hbProblem(x);
    if (bad) { $("#hbMsg").textContent = bad; $("#hbMsg").style.color = "#f2b8ae"; return; }
    act.disabled = true;
    const ok = await hbPut(x); act.disabled = false;
    if (ok) { HBE.saved = JSON.stringify(x); HBE.draft = hbDraftOf(x); renderHomebrew(); toast(hbCloud() ? `${x.name} saved and shared with the campaign` : `${x.name} saved`); }
  });
})();

/* ======================= Feats tab: browse feats and add them to a character ======================= */
// A small select-one dialog: resolves to the chosen value, or null if cancelled.
function choiceBox(title, msg, opts, yes = "OK") {
  return new Promise(res => {
    const m = $("#choiceModal"), sel = $("#choiceSel");
    $("#choiceTitle").textContent = title; $("#choiceMsg").textContent = msg; $("#choiceYes").textContent = yes;
    sel.innerHTML = opts.map(([v, l, off]) => `<option value="${esc(v)}" ${off ? "disabled" : ""}>${esc(l)}</option>`).join("");
    const first = opts.find(o => !o[2]); if (first) sel.value = first[0];
    m.classList.add("open"); sel.focus();
    const done = v => { m.classList.remove("open"); $("#choiceYes").onclick = $("#choiceNo").onclick = m.onkeydown = null; res(v); };
    $("#choiceYes").onclick = () => done(sel.value); $("#choiceNo").onclick = () => done(null);
    m.onkeydown = e => { if (e.key === "Escape") { e.stopPropagation(); done(null); } };
  });
}
const FT = { ed: "2024", q: "", grp: "", ok: false, target: undefined };
function ftTargets() { const l = []; if (currentPC) l.push(currentPC); PCS.roster.forEach(c => { if (!l.some(x => x.id === c.id)) l.push(c); }); return l; }
const ftTarget = () => ftTargets().find(c => c.id === FT.target) || null;
const pcFeatNames = c => [...Object.values(c.asiPicks || {}).filter(v => v && v.feat).map(v => v.feat), ...(c.bonusFeats || []).map(b => b.n), ...(c.feats || []).filter(f => f.bgFeat).map(f => f.f.slice(6))];
function pcRebuild(c) { const cur = c.hpCur; pcLevelTo(c, c.level); if (cur !== undefined && cur !== "") c.hpCur = Math.min(+cur, c.hp); pcRefresh(c); }
function renderFeats() {
  const list = ftTargets();
  if (FT.target === undefined || (FT.target && !list.some(c => c.id === FT.target))) { FT.target = list.length ? list[0].id : ""; const t = ftTarget(); if (t) FT.ed = edOf(t); }
  $$("input[name=ftEd]").forEach(r => r.checked = r.value === FT.ed);
  const t = ftTarget(), ed = FT.ed;
  $("#ftTargetRow").innerHTML = list.length ? `<span>Add feats to</span><select id="ftTarget" aria-label="Character to add feats to"><option value="">No one (just browsing)</option>${list.map(c => `<option value="${esc(c.id)}" ${c.id === FT.target ? "selected" : ""}>${esc(c.name)} · Lv ${c.level} ${esc(c.cls)} (${edOf(c)})</option>`).join("")}</select>`
    : `<span class="muted" style="font-size:14px">Forge a character on the Characters tab to add feats to them here.</span>`;
  const hasHb = featList(ed).some(F => F[5]);
  const grps = (ed === "2024" ? [["", "All"], ["g", "General"], ["o", "Origin"], ["b", "Epic boon"]] : [["", "All"]]).concat(hasHb ? [["h", "Homebrew"]] : []);
  if (!grps.some(g => g[0] === FT.grp)) FT.grp = "";
  $("#ftGrp").innerHTML = grps.map(([k, l]) => `<option value="${k}" ${FT.grp === k ? "selected" : ""}>${l}</option>`).join("");
  $("#ftGrpWrap").classList.toggle("hidden", grps.length < 2);
  const has = t ? pcFeatNames(t) : [], words = FT.q.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = featList(ed).filter(F => (!FT.grp || (FT.grp === "h" ? F[5] : F[4] === FT.grp)) && words.every(w => (F[0] + " " + F[3] + " " + featReqText(F)).toLowerCase().includes(w)))
    .map(F => ({ F, why: !t ? "" : has.includes(F[0]) && !FEAT_REPEAT.has(F[0]) ? `${t.name} already has it` : edOf(t) !== ed ? `${t.name} uses the ${edOf(t)} rules` : featBlock(F, t, t.scores, t.level) }))
    .filter(r => !FT.ok || !r.why);
  $("#ftCount").textContent = `${rows.length} feat${rows.length === 1 ? "" : "s"}`;
  $("#ftList").innerHTML = rows.length ? rows.map(({ F, why }) => {
    const abs = featAbs(F), req = featReqText(F), mine = t && has.filter(n => n === F[0]).length;
    return `<div class="sec ft-card"><div class="ft-h"><h3>${esc(F[0])}</h3>${F[5] ? `<span class="tag gold">Homebrew</span>` : F[6] ? `<span class="tag" title="${esc(dmBook(F[6]).name)}">${esc(dmBook(F[6]).short)}</span>` : F[4] ? `<span class="tag">${FEAT_GROUPS[F[4]]}</span>` : ""}${mine ? `<span class="tag gold">✓ ${esc(t.name)} has it</span>` : ""}
      ${t ? `<button class="btn sm ${why ? "" : "primary"}" type="button" data-ftadd="${esc(F[0])}" style="flex:0 0 auto">+ Add to ${esc(t.name)}</button>` : ""}</div>
      ${req || abs.length ? `<p class="hint" style="margin:4px 0 0">${req ? `Prerequisite: ${esc(req)}` : ""}${req && abs.length ? " · " : ""}${abs.length ? `+1 ${abs.length === 6 ? "to any score" : abs.map(a => AB_NAME[a]).join(" or ")}${F[4] === "b" ? " (up to 30)" : ""}` : ""}</p>` : ""}
      <p>${esc(F[3])}</p>${why ? `<p class="ft-why" style="margin:4px 0 0;font-size:14px">⚠ ${esc(why)}</p>` : ""}</div>`;
  }).join("") : `<div class="card empty"><p>No feats match.</p></div>`;
}
async function ftAdd(c, name) {
  const ed = FT.ed, F = featInfo(ed, name); if (!F) return;
  if (pcFeatNames(c).includes(name) && !FEAT_REPEAT.has(name)) { toast(`${c.name} already has ${name}`); return; }
  if (edOf(c) !== ed && !(await confirmBox("Different rules edition", `${name} is from the ${ed} feat list, but ${c.name} uses the ${edOf(c)} rules. Add it anyway?`, "Add anyway"))) return;
  const block = featBlock(F, c, c.scores, c.level);
  if (block && !(await confirmBox("Prerequisite not met", `${block}. ${c.name} doesn't meet it. Add ${name} anyway (for example as a DM's reward)?`, "Add anyway"))) return;
  const max = F[4] === "b" ? 30 : 20, open = featAbs(F).filter(a => (c.scores[a] || 0) + 1 <= max);
  let a = open.length === 1 ? open[0] : "";
  if (open.length > 1) {
    a = await choiceBox(`${name}: raise which score?`, `${name} raises one ability score by 1 (to a maximum of ${max}).`, open.map(x => [x, `${AB_FULL[x]} ${c.scores[x]} → ${c.scores[x] + 1}`]), "Add feat");
    if (a === null) return;
  }
  c.bonusFeats = [...(c.bonusFeats || []), { n: name, l: c.level, ...(a ? { a } : {}), ...(a && max === 30 ? { max } : {}) }];
  pcRebuild(c); renderFeats(); toast(`${name} added to ${c.name}`);
}
(function initFeats() {
  const form = $("#ftForm");
  form.addEventListener("input", e => { if (e.target.id === "ftQ") { FT.q = e.target.value; renderFeats(); } });
  form.addEventListener("change", e => {
    const t = e.target;
    if (t.name === "ftEd") FT.ed = t.value; else if (t.id === "ftGrp") FT.grp = t.value; else if (t.id === "ftOk") FT.ok = t.checked; else return;
    renderFeats();
  });
  $("#view-feats").addEventListener("change", e => { if (e.target.id === "ftTarget") { FT.target = e.target.value; const c = ftTarget(); if (c) FT.ed = edOf(c); renderFeats(); $("#ftTarget").focus(); } });
  $("#ftList").addEventListener("click", e => { const b = e.target.closest("[data-ftadd]"), c = ftTarget(); if (b && c) ftAdd(c, b.dataset.ftadd); });
})();
// Feats section on My Characters
/* ---- proficiencies and languages: worked out from class, background, species, feats and added classes; choices are typed in ---- */
const CLASS_WEAPONS = {
  "2014": { Barbarian: "Simple and martial weapons", Bard: "Simple weapons, hand crossbows, longswords, rapiers, shortswords", Cleric: "Simple weapons", Druid: "Clubs, daggers, darts, javelins, maces, quarterstaffs, scimitars, sickles, slings, spears", Fighter: "Simple and martial weapons", Monk: "Simple weapons, shortswords", Paladin: "Simple and martial weapons", Ranger: "Simple and martial weapons", Rogue: "Simple weapons, hand crossbows, longswords, rapiers, shortswords", Sorcerer: "Daggers, darts, slings, quarterstaffs, light crossbows", Warlock: "Simple weapons", Wizard: "Daggers, darts, slings, quarterstaffs, light crossbows" },
  "2024": { Barbarian: "Simple and martial weapons", Bard: "Simple weapons", Cleric: "Simple weapons", Druid: "Simple weapons", Fighter: "Simple and martial weapons", Monk: "Simple weapons and martial weapons with the Light property", Paladin: "Simple and martial weapons", Ranger: "Simple and martial weapons", Rogue: "Simple weapons and martial weapons with the Finesse or Light property", Sorcerer: "Simple weapons", Warlock: "Simple weapons", Wizard: "Simple weapons" }
};
const CLASS_TOOLS = { Bard: "Three musical instruments of your choice", Druid: "Herbalism kit", Monk: "One artisan's tool or musical instrument of your choice", Rogue: "Thieves' tools" };
const MC_TOOLS = { Bard: "One musical instrument of your choice", Rogue: "Thieves' tools" };
const RACE_LANG = { Dwarf: ["Dwarvish"], Elf: ["Elvish"], Halfling: ["Halfling"], Human: [], Dragonborn: ["Draconic"], Gnome: ["Gnomish"], "Half-Elf": ["Elvish"], "Half-Orc": ["Orc"], Tiefling: ["Infernal"] };
const RACE_LANG_PICK = { Human: 1, "Half-Elf": 1 };
function profInfo(c) {
  const ed = edOf(c), B = bgInfo(ed, c.bg) || {}, T = armorTraining(c);
  const armor = [T.has("light") && "Light armor", T.has("medium") && "Medium armor", T.has("heavy") && "Heavy armor", T.has("shield") && "Shields"].filter(Boolean);
  const HC = CLASS_DATA[c.cls] && CLASS_DATA[c.cls].hb ? CLASS_DATA[c.cls] : null;
  const weapons = [(CLASS_WEAPONS[ed] || CLASS_WEAPONS["2014"])[c.cls] || (HC && HC.weapons) || "", ...(c.multi || []).filter(x => MC_MARTIAL.includes(x.cls)).length ? ["Martial weapons (multiclass)"] : [], ...(c.multi || []).some(x => x.cls === "Monk") ? ["Shortswords (multiclass)"] : []].filter(Boolean);
  const tools = [CLASS_TOOLS[c.cls] || (HC && HC.tools), ...(c.multi || []).map(x => MC_TOOLS[x.cls]), B.tools && `${B.tools} (background)`, ...choiceOf(c, "Feat: Crafter"), ...choiceOf(c, "Feat: Musician"), (c.subclass === "Battle Master" && "One artisan's tool (Student of War)")].filter(Boolean);
  const langs = ["Common"], picks = [];
  if (ed === "2024") picks.push("two languages of your choice (species)");
  else { (RACE_LANG[c.race] || []).forEach(l => langs.push(l)); if (RACE_LANG_PICK[c.race]) picks.push(`${RACE_LANG_PICK[c.race]} of your choice (${c.race})`); if (/High Elf/.test(raceLabel(c))) picks.push("1 of your choice (High Elf)"); }
  if (B.lang) picks.push(`${B.lang.toLowerCase()} (background)`);
  if (choiceOf(c, "Feat: Skilled").length) tools.push(...choiceOf(c, "Feat: Skilled"));
  return { armor, weapons, tools, langs, picks };
}
function profSecHTML(c) {
  const P = profInfo(c), row = (k, v) => `<div class="prof-row"><b>${k}</b><span>${v}</span></div>`;
  return `<div class="sec"><div class="sec-h"><h3>Proficiencies & Languages</h3></div>
    ${row("Armor", P.armor.length ? esc(P.armor.join(", ")) : "None")}
    ${row("Weapons", esc(P.weapons.join("; ") || "None"))}
    ${row("Tools", esc(P.tools.join("; ") || "None"))}
    ${row("Languages", esc(P.langs.join(", ")) + (P.picks.length ? `, plus ${esc(P.picks.join(" and "))}` : ""))}
    <div class="rc-grid2" style="margin-top:8px"><label>Languages you chose<input type="text" data-rf="langs" value="${esc(c.langs || "")}" placeholder="e.g. Elvish, Draconic"></label><label>Tools and instruments you chose<input type="text" data-rf="toolsChosen" value="${esc(c.toolsChosen || "")}" placeholder="e.g. Lute, Smith's tools"></label></div></div>`;
}
function featsSecHTML(c) {
  const lv = Object.entries(c.asiPicks || {}).filter(([k, v]) => v && v.feat && +k <= c.level).map(([k, v]) => ({ n: v.feat, a: AB.find(x => v[x]), src: `lv ${k} level-up` }));
  const bonus = (c.bonusFeats || []).map((b, i) => ({ n: b.n, a: b.a, src: `added at lv ${b.l || 1}`, i }));
  const bgf = (c.feats || []).filter(f => f.bgFeat).map(f => ({ n: f.f.slice(6), src: `${c.bg} background${f.note ? `, ${f.note.toLowerCase()} spells` : ""}` }));
  const all = [...bgf, ...lv, ...bonus];
  return `<div class="sec"><div class="sec-h"><h3>Feats</h3><span class="sp"></span><button class="btn sm primary" type="button" data-ra="addFeat">+ Add feat</button></div>
    ${all.length ? `<ul class="plain">${all.map(x => { const d = featDesc("Feat: " + x.n, c); return `<li><b>${esc(x.n)}</b>${x.a ? ` <span class="tag">+1 ${AB_NAME[x.a]}</span>` : ""} <span class="muted" style="font-size:13px">(${esc(x.src)})</span>
      ${x.i !== undefined ? `<button class="icon-btn" type="button" data-rmfeat="${x.i}" title="Remove ${esc(x.n)}" aria-label="Remove ${esc(x.n)}">✕</button>` : ""}${d ? `<div class="ft-desc">${esc(d)}</div>` : ""}${x.n === "Magic Initiate" ? miHTML(c) : CHOICES["Feat: " + x.n] ? choiceHTML(c, "Feat: " + x.n) : ""}</li>`; }).join("")}</ul>`
      : `<p class="muted" style="margin:6px 0 0">No feats yet. Take one instead of an Ability Score Improvement when levelling up, or add one with + Add feat.</p>`}</div>`;
}
