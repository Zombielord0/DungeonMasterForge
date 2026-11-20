/* 07d-builder.js: The step-by-step custom character builder (CB, renderCB). */

/* ---- step-by-step custom character builder ---- */
const CB = { on: false, step: 0, ed: "2024", race: "", sub: "", cls: "", bg: "", method: "array", pool: null, rolls: null, assignIdx: {}, manual: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }, bonus: "flex", plus2: "", plus1: "", skills: new Set(), name: "", level: 1, align: "True neutral" };
const CB_STEPS = ["Race", "Class", "Background", "Abilities", "Skills", "Details"];
function cbStart() { CB.on = true; CB.step = 0; if (!PC_RACES[CB.ed][CB.race]) { CB.race = ""; CB.sub = ""; } if (CB.ed === "2024") CB.bonus = "flex"; renderCB(); }
const cbR = () => raceInfo(CB.ed, CB.race, CB.sub);
function cbAllowed() { const C = CLASS_DATA[CB.cls], R = cbR(); return new Set(R && R.extraSkills ? ALL_SKILLS : C.skills[0]); }
function cbLocked() { const R = cbR(); return new Set([...bgSkills(CB.ed, CB.bg), ...((R && R.skills) || [])]); }
function cbNeed() { const C = CLASS_DATA[CB.cls], R = cbR(); return C.skills[1] + ((R && R.extraSkills) || 0); }
function cbBase() {
  const b = {};
  if (CB.method === "manual") AB.forEach(a => b[a] = clamp(parseInt(CB.manual[a]) || 10, 3, 20));
  else AB.forEach(a => b[a] = CB.assignIdx[a] != null && CB.pool ? CB.pool[CB.assignIdx[a]] : null);
  return b;
}
// 2024: +2/+1 (or +1 to each) among the background's three abilities
function cbFix24() {
  const B = bgInfo(CB.ed, CB.bg), L = B && B.ab ? B.ab : AB, C = CLASS_DATA[CB.cls], order = [...(C ? C.pri : []), ...AB].filter((a, i, A) => A.indexOf(a) === i && L.includes(a));
  if (!L.includes(CB.plus2)) CB.plus2 = order[0];
  if (!L.includes(CB.plus1) || CB.plus1 === CB.plus2) CB.plus1 = order.find(a => a !== CB.plus2);
  if (!(B && B.ab)) CB.bgSpread = "21";
}
function cbBonus24() {
  cbFix24();
  const B = bgInfo(CB.ed, CB.bg), L = B && B.ab ? B.ab : AB, tri = CB.bgSpread === "111" && B && B.ab;
  return `<div class="field" style="margin:14px 0 0"><label>Background ability scores (${esc(CB.bg)}: ${L.map(a => AB_FULL[a]).join(", ")})</label>
    ${B && B.ab ? `<div class="seg"><label class="opt"><input type="radio" name="cbSpread" value="21" ${tri ? "" : "checked"}><span>+2 to one, +1 to another</span></label><label class="opt"><input type="radio" name="cbSpread" value="111" ${tri ? "checked" : ""}><span>+1 to all three</span></label></div>` : ""}
    ${tri ? `<p class="hint">+1 to ${L.map(a => AB_FULL[a]).join(", ")}.</p>` : `<div class="row" style="margin-top:8px"><label class="lbl" style="margin:0">+2 to<select data-cbplus="plus2">${L.map(a => `<option value="${a}" ${CB.plus2 === a ? "selected" : ""}>${AB_NAME[a]}</option>`).join("")}</select></label><label class="lbl" style="margin:0">+1 to<select data-cbplus="plus1">${L.filter(a => a !== CB.plus2).map(a => `<option value="${a}" ${CB.plus1 === a ? "selected" : ""}>${AB_NAME[a]}</option>`).join("")}</select></label></div>`}</div>`;
}
function cbFinal(base) {
  const s = { ...base }, R = cbR();
  if (CB.ed === "2024") { const B = bgInfo(CB.ed, CB.bg); cbFix24(); if (CB.bgSpread === "111" && B && B.ab) B.ab.forEach(a => s[a] += 1); else { if (CB.plus2) s[CB.plus2] += 2; if (CB.plus1) s[CB.plus1] += 1; } }
  else if (CB.bonus === "flex") { if (CB.plus2) s[CB.plus2] += 2; if (CB.plus1) s[CB.plus1] += 1; }
  else if (R) { Object.entries(R.asi).forEach(([a, v]) => s[a] += v); if (R.plus1) { const C = CLASS_DATA[CB.cls]; [...C.pri, ...["con", "dex", "wis", "str", "int", "cha"].filter(a => !C.pri.includes(a))].filter(a => R.plus1Any || a !== "cha").slice(0, R.plus1).forEach(a => s[a] += 1); } }
  return s;
}
function cbCanNext() {
  if (CB.step === 0) { const B = PC_RACES[CB.ed][CB.race]; return !!B && (!B.subs || !!B.subs[CB.sub]); }
  if (CB.step === 1) return !!CB.cls;
  if (CB.step === 2) return !!CB.bg;
  if (CB.step === 3) return CB.method === "manual" || (CB.pool && AB.every(a => CB.assignIdx[a] != null));
  if (CB.step === 4) return CB.skills.size === cbNeed();
  return true;
}
function cbEnter() {
  const C = CLASS_DATA[CB.cls];
  if (CB.step === 3) {
    if (CB.method === "array" && !CB.pool) CB.pool = [15, 14, 13, 12, 10, 8];
    if (CB.ed === "2024") cbFix24();
    else if (CB.bonus === "flex") { if (!CB.plus2) CB.plus2 = C.pri[0]; if (!CB.plus1 || CB.plus1 === CB.plus2) CB.plus1 = C.pri.find(a => a !== CB.plus2) || "con"; }
  }
  if (CB.step === 4) { const al = cbAllowed(), lk = cbLocked(); [...CB.skills].forEach(s => { if (!al.has(s) || lk.has(s)) CB.skills.delete(s); }); }
}
function cbBody() {
  const C = CLASS_DATA[CB.cls], R = cbR();
  if (CB.step === 0) {
    const RS = PC_RACES[CB.ed];
    const asiTxt = d => CB.ed === "2024" ? "Ability bonuses from background" : Object.entries(d.asi).map(([a, v]) => `+${v} ${AB_NAME[a]}`).join(", ") + (d.plus1 ? ` and +1 to ${d.plus1} others` : "") + (d.subs ? " + subrace" : "");
    return `<div class="seg" style="margin-bottom:12px"><label class="opt"><input type="radio" name="cbEd" value="2024" ${CB.ed === "2024" ? "checked" : ""}><span>2024 rules (5.5e)</span></label><label class="opt"><input type="radio" name="cbEd" value="2014" ${CB.ed === "2014" ? "checked" : ""}><span>2014 rules (5e)</span></label></div>
    <p class="hint" style="margin-top:0">${CB.ed === "2024" ? "Pick a species to see its traits and choose a lineage. Your background sets ability score increases." : "Pick a race to see its bonuses and traits and choose a subrace."}</p>
    <div class="pick-grid">${raceList(CB.ed).map(x => { const d = RS[x]; return `<button type="button" class="pick ${CB.race === x ? "on" : ""}" data-cbrace="${esc(x)}"><b>${esc(x)}</b><small>${asiTxt(d)} · ${d.speed} ft${d.subs ? ` · ${Object.keys(d.subs).length} ${esc((d.term || "subrace").toLowerCase())} options` : ""}</small>${CB.race === x && CB.sub ? `<small data-cb-lineage>${esc(subLabel(CB.ed, x, CB.sub))}</small>` : ""}${d.src ? `<small class="req">${esc(dmBook(d.src).name)}</small>` : d.hb ? `<small class="req">Homebrew</small>` : ""}</button>`; }).join("")}</div>`;
  }
  if (CB.step === 1) return `<p class="hint" style="margin-top:0">Pick a class. This sets hit points, armor, saves, skills and spellcasting.</p>
    <div class="pick-grid">${classList(CB.ed).map(x => { const d = CLASS_DATA[x]; return `<button type="button" class="pick ${CB.cls === x ? "on" : ""}" data-cbcls="${esc(x)}"><b>${esc(x)}</b><small>d${d.hd} hit die · ${d.pri.slice(0, 2).map(a => AB_NAME[a]).join(" & ")}${d.cast ? ` · ${d.cast[0] === "half" ? "half caster" : d.cast[0] === "pact" ? "pact magic" : "full caster"}` : ""}</small><small>${esc(CLASS_DESC[x] || (d.hbx && d.hbx.desc) || "Homebrew class")}</small></button>`; }).join("")}</div>`;
  if (CB.step === 2) {
    const L = bgList(CB.ed); if (CB.bg && !L.includes(CB.bg)) CB.bg = "";
    const card = x => { const B = bgInfo(CB.ed, x) || {}; return `<button type="button" class="pick ${CB.bg === x ? "on" : ""}" data-cbbg="${esc(x)}"><b>${esc(x)}</b><small>${(B.sk || []).join(" · ")}</small>${CB.ed === "2024" && B.ab ? `<small>${B.ab.map(a => AB_NAME[a]).join(" · ")} · ${esc(bgFeatLabel(B))}</small>` : B.feature ? `<small>Feature: ${esc(B.feature[0])}</small>` : ""}${HB_BG[x] ? `<small class="req">${HB_BG[x].src ? esc(dmBook(HB_BG[x].src).name) : "Homebrew"}</small>` : ""}</button>`; };
    return `<p class="hint" style="margin-top:0">${CB.ed === "2024" ? "Pick a background. In the 2024 rules it gives two skills, a tool, an Origin feat (added to your character) and starting equipment, and raises three of your ability scores." : "Pick a background. It gives two skills, tools or languages, starting equipment and a special feature."}</p>
    <div class="pick-grid">${L.map(card).join("")}</div>`;
  }
  if (CB.step === 3) {
    const base = cbBase(), ok = AB.every(a => base[a] != null), fin = ok ? cbFinal(base) : null;
    const seg = `<div class="seg" style="margin-bottom:12px">${[["array", "Standard array"], ["roll", "Roll 4d6"], ["manual", "Enter manually"]].map(([v, l]) => `<label class="opt"><input type="radio" name="cbMethod" value="${v}" ${CB.method === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>`;
    let body = "";
    if (CB.method === "manual") body = `<div class="cb-abil">${AB.map(a => `<label class="lbl">${AB_FULL[a]}<input type="number" min="3" max="20" data-cbman="${a}" value="${esc(CB.manual[a])}"></label>`).join("")}</div><p class="hint">Type each score before racial bonuses (3–20).</p>`;
    else {
      if (CB.method === "roll") body += `<div class="row" style="margin-bottom:10px"><button class="btn" type="button" data-cbroll style="flex:0 0 auto">🎲 Roll 4d6, drop lowest</button>${CB.rolls ? `<span class="hint" style="margin:0">${CB.rolls.map(x => `[${x.d.join(",")}]→${x.t}`).join("  ")}</span>` : `<span class="hint" style="margin:0">Roll a pool of six scores, then assign them.</span>`}</div>`;
      if (CB.pool) body += `<div class="cb-abil">${AB.map(a => `<label class="lbl">${AB_FULL[a]}<select data-cbassign="${a}"><option value="">—</option>${CB.pool.map((v, i) => `<option value="${i}" ${CB.assignIdx[a] === i ? "selected" : ""} ${CB.assignIdx[a] !== i && Object.entries(CB.assignIdx).some(([k, j]) => k !== a && j === i) ? "disabled" : ""}>${v}</option>`).join("")}</select></label>`).join("")}</div>
        <div class="row" style="margin-top:10px"><button class="btn sm" type="button" data-cbauto style="flex:0 0 auto">Auto-assign for a ${esc(CB.cls)}</button><button class="btn sm" type="button" data-cbclear style="flex:0 0 auto">Clear</button></div>`;
    }
    const bonus = CB.ed === "2024" ? cbBonus24() : `<div class="field" style="margin:14px 0 0"><label>${CB.ed === "2024" ? "Background ability bonus (2024 rules)" : "Racial bonus"}</label>
      <div class="seg ${CB.ed === "2024" ? "hidden" : ""}"><label class="opt"><input type="radio" name="cbBonus" value="flex" ${CB.ed === "2024" ? "disabled" : ""} ${CB.bonus === "flex" ? "checked" : ""}><span>Flexible +2/+1</span></label><label class="opt"><input type="radio" name="cbBonus" value="fixed" ${CB.bonus === "fixed" ? "checked" : ""}><span>Classic racial</span></label></div>
      ${CB.bonus === "flex" ? `<div class="row" style="margin-top:8px"><label class="lbl" style="margin:0">+2 to<select data-cbplus="plus2">${AB.map(a => `<option value="${a}" ${CB.plus2 === a ? "selected" : ""}>${AB_NAME[a]}</option>`).join("")}</select></label><label class="lbl" style="margin:0">+1 to<select data-cbplus="plus1">${AB.filter(a => a !== CB.plus2).map(a => `<option value="${a}" ${CB.plus1 === a ? "selected" : ""}>${AB_NAME[a]}</option>`).join("")}</select></label></div>` : `<p class="hint">${esc(CB.race)}: ${Object.entries(R.asi).map(([a, v]) => `+${v} ${AB_NAME[a]}`).join(", ")}${R.plus1 ? `, plus +1 to ${R.plus1} other scores (assigned automatically)` : ""}.</p>`}</div>`;
    const prev = fin ? `<div class="chips" style="margin-top:14px">${AB.map(a => `<span class="tag ${C.pri.includes(a) ? "gold" : ""}">${AB_NAME[a]} ${fin[a]} (${sgn(mod(fin[a]))})</span>`).join("")}</div><p class="hint">Final scores with racial bonuses. ${esc(CB.cls)}s lean on ${C.pri.slice(0, 2).map(a => AB_NAME[a]).join(" and ")}.</p>` : "";
    return seg + body + bonus + prev;
  }
  if (CB.step === 4) {
    const lk = cbLocked(), al = [...cbAllowed()].filter(s => !lk.has(s)).sort(), need = cbNeed();
    return `<p class="hint" style="margin-top:0">Already proficient from your background${R && R.skills ? " and race" : ""}: ${[...lk].join(", ")}.</p>
    <p style="margin:0 0 8px">Pick <span class="cb-count ${CB.skills.size > need ? "over" : ""}">${CB.skills.size} / ${need}</span> more${R && R.extraSkills ? ` (${esc(CB.race)} may choose from any skill)` : ` from the ${esc(CB.cls)} list`}:</p>
    <div class="cb-skills">${al.map(s => `<label class="check" style="margin-bottom:4px"><input type="checkbox" data-cbsk="${esc(s)}" ${CB.skills.has(s) ? "checked" : ""}><span><b>${esc(s)}</b> <small>${AB_NAME[SKILLS[s]]}</small></span></label>`).join("")}</div>`;
  }
  const base = cbFinal(cbBase());
  if (!CB.gender) CB.gender = "male";
  return `<div class="field"><label>Gender</label><div class="seg" role="radiogroup" aria-label="Gender">${GENDERS.map(([v, l]) => `<label class="opt"><input type="radio" name="cbGender" value="${v}" ${CB.gender === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
  <div class="field"><label>Name</label><div class="row"><input type="text" data-cbname value="${esc(CB.name)}" placeholder="Random"><button class="btn" type="button" data-cbnamerand style="flex:0 0 auto" title="Random name">🎲</button></div></div>
  <div class="field row"><div><label>Level</label><input type="number" min="1" max="20" data-cblevel value="${CB.level}"></div><div><label>Alignment</label><select data-cbalign>${ALIGN.map(a => `<option ${CB.align === a ? "selected" : ""}>${a}</option>`).join("")}</select></div></div>
  <div class="sec"><div class="sec-h"><h3>Summary</h3></div>
    <p>${esc(subLabel(CB.ed, CB.race, CB.sub))} ${esc(CB.cls)} (${esc(CB.bg)}), level ${CB.level}, ${CB.ed} rules.<br>
    ${AB.map(a => `${AB_NAME[a]} ${base[a]}`).join(" · ")}<br>
    Skills: ${[...cbLocked(), ...CB.skills].join(", ")}</p>
    <p class="hint">Levels past 4 apply ability score increases to your main abilities automatically. You can fine-tune every score, skill and detail afterwards on the sheet.</p></div>`;
}
function renderCB() {
  pcShow("build"); forgeOpen(false);
  $("#pcOut").innerHTML = `<div class="card">
    <div class="row" style="align-items:flex-start"><div class="sheet-h" style="font-size:24px;flex:1">Create a custom character</div><button class="btn sm" type="button" data-cbquit style="flex:0 0 auto">✕ Cancel</button></div>
    <div class="cb-steps">${CB_STEPS.map((s, i) => `<span class="cb-step ${i === CB.step ? "cur" : ""} ${i < CB.step ? "done" : ""}" ${i < CB.step ? `data-cbgo="${i}" role="button" tabindex="0"` : ""}>${i + 1}. ${s}</span>`).join("")}</div>
    ${cbBody()}
    <div class="row" style="margin-top:16px">
      ${CB.step ? `<button class="btn" type="button" data-cbback style="flex:0 0 auto">← Back</button>` : ""}<span style="flex:1"></span>
      ${CB.step < 5 ? `<button class="btn primary" type="button" data-cbnext style="flex:0 0 auto" ${cbCanNext() ? "" : "disabled"}>Next →</button>` : `<button class="btn primary" type="button" data-cbcreate style="flex:0 0 auto">⚒ Create character</button>`}
    </div>
  </div>`;
}
function cbCreate() {
  const custom = { base: cbBase(), skills: [...CB.skills], align: CB.align, plus2: CB.bonus === "flex" || CB.ed === "2024" ? CB.plus2 : null, plus1: CB.bonus === "flex" || CB.ed === "2024" ? CB.plus1 : null, tri: CB.ed === "2024" && CB.bgSpread === "111", bgGold50: CB.ed === "2024" && !!CB.bgGold50 };
  currentPC = pcEnsure(generateCharacter({ seed: newSeed(), name: CB.name.trim().slice(0, 60), race: CB.race, ed: CB.ed, sub: CB.sub || "none", cls: CB.cls, bg: CB.bg, level: 1, gender: CB.gender, method: "custom", bonus: CB.ed === "2024" ? "flex" : CB.bonus, custom }));
  CB.on = false; renderPC(); pcPersist();
  const target = clamp(CB.level, 1, 20), ready = c => `${c.name} is ready: tweak anything on the sheet, then save them`;
  if (target > 1 || needsSubclass(currentPC)) lvChain(currentPC, target, ready); else toast(ready(currentPC));
}
(function initCB() {
  const out = $("#pcOut");
  out.addEventListener("click", e => {
    if (!CB.on) return; const t = e.target; let b;
    if (b = t.closest("[data-cbquit]")) { CB.on = false; pcShow("sheet"); renderRosterTab(); return; }
    if (b = t.closest("[data-cbgo]")) { CB.step = +b.dataset.cbgo; renderCB(); return; }
    if (b = t.closest("[data-cbback]")) { CB.step--; renderCB(); return; }
    if (b = t.closest("[data-cbnext]")) { if (cbCanNext()) { CB.step++; cbEnter(); renderCB(); } return; }
    if (t.closest("[data-cbcreate]")) { cbCreate(); return; }
    if (b = t.closest("[data-cbrace]")) {
      const race = b.dataset.cbrace;
      const lineages = Object.keys(PC_RACES[CB.ed][race].subs || {});
      if (CB.race !== race || !lineages.includes(CB.sub)) CB.sub = lineages[0] || "";
      CB.race = race;
      renderCB();
      const card = $(".pick.on", out);
      openProgression(CB.ed, "species", race, CB.sub, card, {
        requireLineage: true,
        setLineage: value => {
          CB.sub = value;
          $("[data-cb-lineage]", card).textContent = subLabel(CB.ed, race, value);
        },
      });
      return;
    }
    if (b = t.closest("[data-cbcls]")) {
      CB.cls = b.dataset.cbcls;
      renderCB();
      openProgression(CB.ed, "class", CB.cls, "", $(".pick.on", out));
      return;
    }
    if (b = t.closest("[data-cbbg]")) {
      CB.bg = b.dataset.cbbg;
      renderCB();
      openBackgroundReference(CB.ed, CB.bg, $(".pick.on", out), {
        gold: CB.bgGold50,
        setGold: value => { CB.bgGold50 = value; },
      });
      return;
    }
    if (t.closest("[data-cbroll]")) {
      CB.rolls = Array.from({ length: 6 }, () => { const d = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((x, y) => y - x); return { d, t: d[0] + d[1] + d[2] }; });
      CB.pool = CB.rolls.map(x => x.t).sort((a, b) => b - a); CB.assignIdx = {}; renderCB(); return;
    }
    if (t.closest("[data-cbauto]")) { const C = CLASS_DATA[CB.cls], order = [...C.pri, ...["con", "dex", "wis", "str", "int", "cha"].filter(a => !C.pri.includes(a))]; CB.assignIdx = {}; order.forEach((a, i) => CB.assignIdx[a] = i); renderCB(); return; }
    if (t.closest("[data-cbclear]")) { CB.assignIdx = {}; renderCB(); return; }
    if (t.closest("[data-cbnamerand]")) { CB.name = fullName(makeRng("nm", newSeed()), CB.gender); renderCB(); return; }
  });
  out.addEventListener("keydown", e => { if (CB.on && (e.key === "Enter" || e.key === " ") && e.target.matches("[data-cbgo]")) { e.preventDefault(); e.target.click(); } });
  out.addEventListener("change", e => {
    if (!CB.on) return; const t = e.target;
    if (t.name === "cbEd") { CB.ed = t.value; if (!PC_RACES[CB.ed][CB.race]) { CB.race = ""; CB.sub = ""; } else { const B = PC_RACES[CB.ed][CB.race]; if (!(B.subs && B.subs[CB.sub])) CB.sub = B.subs ? Object.keys(B.subs)[0] : ""; } if (CB.ed === "2024") CB.bonus = "flex"; renderCB(); }
    else if (t.name === "cbMethod") { CB.method = t.value; if (CB.method === "array") { CB.pool = [15, 14, 13, 12, 10, 8]; CB.assignIdx = {}; CB.rolls = null; } else if (CB.method === "roll") { CB.pool = null; CB.assignIdx = {}; CB.rolls = null; } renderCB(); }
    else if (t.name === "cbBonus") { CB.bonus = t.value; renderCB(); }
    else if (t.name === "cbSpread") { CB.bgSpread = t.value; renderCB(); }
    else if (t.name === "cbGender") { CB.gender = t.value; renderCB(); }
    else if (t.dataset.cbplus) { CB[t.dataset.cbplus] = t.value; if (CB.plus1 === CB.plus2) CB.plus1 = AB.find(a => a !== CB.plus2); if (CB.ed === "2024") cbFix24(); renderCB(); }
    else if (t.dataset.cbassign) { const a = t.dataset.cbassign; if (t.value === "") delete CB.assignIdx[a]; else CB.assignIdx[a] = +t.value; renderCB(); }
    else if (t.dataset.cbsk) { const s = t.dataset.cbsk; if (t.checked) { if (CB.skills.size >= cbNeed()) { t.checked = false; toast(`That's all ${cbNeed()} — untick one first`); return; } CB.skills.add(s); } else CB.skills.delete(s); renderCB(); }
    else if (t.dataset.cbman !== undefined) { CB.manual[t.dataset.cbman] = t.value; renderCB(); }
    else if (t.dataset.cblevel !== undefined) { CB.level = clamp(parseInt(t.value) || 1, 1, 20); t.value = CB.level; renderCB(); }
    else if (t.dataset.cbalign !== undefined) CB.align = t.value;
  });
  out.addEventListener("input", e => {
    if (!CB.on) return; const t = e.target;
    if (t.dataset.cbname !== undefined) CB.name = t.value;
    else if (t.dataset.cbman !== undefined) CB.manual[t.dataset.cbman] = t.value;
  });
})();
