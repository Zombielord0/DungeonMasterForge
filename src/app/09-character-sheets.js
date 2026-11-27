/* 09-character-sheets.js: Characters: saving, prepared spells, sheet export and spell cards. */

/* ======================= Characters: persistence, prepared spells, sheet export ======================= */
const PC_KEY = "dmforge.pcs.v1";
const PCS = { cur: null, roster: [], updated: 0 };
let pcRemote = null, pcTimer = null;
/* ---- multiclassing: c.multi = [{ cls, lv, subclass }] beside the main class (c.cls at c.level) ---- */
const clsLv = (c, k) => !c ? 0 : c.cls === k ? c.level : (((c.multi || []).find(x => x.cls === k)) || {}).lv || 0;
// Variants use the feature scaling of their parent class while keeping separate character class levels.
const classFeatureLevel = (c, k) => Math.max(clsLv(c, k),
  baseClassOf(c.cls) === k ? +c.level : 0,
  ...(c.multi || []).filter(x => baseClassOf(x.cls) === k).map(x => +x.lv));
const totalLv = c => (c.level || 0) + (c.multi || []).reduce((s2, x) => s2 + (+x.lv || 0), 0);
const classLine = c => [`${c.cls} ${c.level}`, ...(c.multi || []).filter(x => +x.lv > 0).map(x => `${x.cls} ${x.lv}`)].join(" / ");
const MC_PREREQ = { Barbarian: [["str"]], Bard: [["cha"]], Cleric: [["wis"]], Druid: [["wis"]], Fighter: [["str", "dex"]], Monk: [["dex"], ["wis"]], Paladin: [["str"], ["cha"]], Ranger: [["dex"], ["wis"]], Rogue: [["dex"]], Sorcerer: [["cha"]], Warlock: [["cha"]], Wizard: [["int"]] };
const mcPrereq = k => MC_PREREQ[baseClassOf(k)] || (CLASS_DATA[k] && CLASS_DATA[k].hb ? [[CLASS_DATA[k].pri[0]]] : []); // a homebrew class: its main ability
const mcPrereqText = k => mcPrereq(k).map(g => g.map(a => `${AB_NAME[a]} 13`).join(" or ")).join(" and ");
const mcMeets = (c, k) => mcPrereq(k).every(g => g.some(a => (+c.scores[a] || 0) >= 13));
const MC_ARMOR = { Barbarian: "shield", Bard: "light", Cleric: "light medium shield", Druid: "light medium shield", Fighter: "light medium shield", Paladin: "light medium shield", Ranger: "light medium shield", Rogue: "light", Warlock: "light", Monk: "", Sorcerer: "", Wizard: "" };
const MC_MARTIAL = ["Barbarian", "Fighter", "Paladin", "Ranger"];
// a class's own caster level for multiclass slots
function casterLv(ed, k, l, sub) { const cast = castOf(k, sub); if (!cast) return 0; const kind = cast[0]; return kind === "full" ? l : kind === "artificer" ? Math.ceil(l / 2) : kind === "half" ? (ed === "2024" ? Math.ceil(l / 2) : Math.floor(l / 2)) : kind === "third" ? Math.floor(l / 3) : 0; }
const pactSlots = l => ({ n: l >= 17 ? 4 : l >= 11 ? 3 : l >= 2 ? 2 : 1, lvl: Math.min(5, Math.ceil(l / 2)) });
// what a rebuild keeps from the character as it is: rolled or assigned base scores, skill picks, expertise
const pcKeep = c => ({ multi: c.multi && c.multi.length ? c.multi : undefined, keepMcSkills: c.mcSkills, base: c.customData ? undefined : c.base, rolls: c.rolls || undefined, keepSkills: (c.skills || []).filter(s => s.p).map(s => s.s), keepExpert: c.expertOrder || (c.skills || []).filter(s => s.x).map(s => s.s), keepSkilled: c.skilled });
/* Numbers on a sheet are numbers (including the spell block and hit dice). Other members' characters arrive from the campaign database as any JSON, and many
   of these fields are written into the page as they are, so a string here could carry page code. "" stays "" where the
   sheet lets a box be emptied. */
const PC_NUMS = ["hp", "hpCur", "hpTemp", "ac", "acAuto", "speed", "prof", "hd", "init", "passive", "xp", "startGold", "initBonus", "atkBonus", "formHp", "acBonus"];
function pcNums(c) {
  const n = v => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
  if (c.level !== undefined) c.level = clamp(Math.round(n(c.level)) || 1, 1, 20);
  PC_NUMS.forEach(k => { if (c[k] !== undefined && c[k] !== null && c[k] !== "" && typeof c[k] !== "number") c[k] = n(c[k]); });
  if (c.scores && typeof c.scores === "object") Object.keys(c.scores).forEach(a => { if (typeof c.scores[a] !== "number") c.scores[a] = n(c.scores[a]); });
  if (Array.isArray(c.multi)) c.multi.forEach(m => { if (m && typeof m === "object" && m.lv !== undefined) m.lv = clamp(Math.round(n(m.lv)) || 1, 1, 20); });
  const num = (o, ks) => { if (o && typeof o === "object") ks.forEach(k => { if (o[k] !== undefined && o[k] !== null && typeof o[k] !== "number" && typeof o[k] !== "boolean") o[k] = n(o[k]); }); };
  num(c.death, ["s", "f"]); /* death-save counters: shown as numbers in the fight window (security review, 2026-11-25) */
  if (Array.isArray(c.hdList)) c.hdList = c.hdList.map(d => typeof d === "number" ? d : n(d));
  const S = c.spell;
  if (S && typeof S === "object") {
    num(S, ["dc", "atk", "bonus", "max", "cantrips"]);
    if (Array.isArray(S.slots)) S.slots = S.slots.map(x => typeof x === "number" ? x : n(x));
    num(S.pact, ["n", "lvl"]);
    if (Array.isArray(S.others)) S.others.forEach(o => num(o, ["dc", "atk", "max", "bonus"]));
  }
}
/* A character as it arrives from the campaign database (portal.js calls this before anything reads it). Lossless:
   only a rules edition that isn't 2014/2024 and number fields that aren't numbers are fixed; text is kept exactly as typed.
   Page code hidden in text is stopped by the page-wide guard (00-guard.js) and by esc() in the templates. */
function pcIncoming(d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return d;
  if (d.ed !== undefined && d.ed !== "2014" && d.ed !== "2024") d.ed = "2014";
  pcNums(d);
  return d;
}
function pcEnsure(c) { if (c) { pcNums(c); if (c.bgV === undefined && c.cls) { c.bgV = 1; if (c.ed === "2024") c.bgAsiLegacy = true; } if (!c.id) c.id = uid("pc"); if (c.subclass === undefined) { const f = (c.feats || []).find(x => String(x.f).startsWith("Subclass: ") && x.f !== "Subclass: not chosen yet"); c.subclass = f ? f.f.slice(10) : null; } if (!Array.isArray(c.prepared)) c.prepared = []; syncGrantedSpells(c); if (c.race === "Dragonborn" && !c.ancestry) c.ancestry = makeRng("anc", c.seed || c.id).pick(Object.keys(DRAGON_ANCESTRY)); if (c.race === "Dragonborn" && !c.sub) c.sub = c.ancestry; withTraitRes(c); raceLvUpgrade(c); hookUpgrade(c); } return c; }
function pcPersist() {
  PCS.cur = currentPC; PCS.updated = Date.now();
  if (currentPC) { const i = PCS.roster.findIndex(x => x.id === currentPC.id); if (i >= 0) PCS.roster[i] = currentPC; }
  // Signed in to a campaign: characters save to the shared database, not this browser.
  if (window.Portal && Portal.cloud) { Portal.changed(); return; }
  try { localStorage.setItem(PC_KEY, JSON.stringify(PCS)); } catch { }
  clearTimeout(pcTimer);
  pcTimer = setTimeout(async () => {
    if (Store.mode === "db" && Store.col && !Store.readOnly) { try { await Store.col.doc("pcs").set(JSON.parse(JSON.stringify(PCS))); } catch { } }
  }, 700);
}
function pcRestore() {
  try { const d = JSON.parse(localStorage.getItem(PC_KEY) || "null"); if (d) Object.assign(PCS, { cur: d.cur || null, roster: Array.isArray(d.roster) ? d.roster : [], updated: d.updated || 0 }); } catch { }
  PCS.roster.forEach(pcEnsure);
  if (PCS.cur && !PCS.roster.some(x => x.id === PCS.cur.id)) { currentPC = pcEnsure(PCS.cur); renderPC(); }
  renderRoster();
}
function pcAdoptRemote() {
  if (pcRemote && (pcRemote.updated || 0) > (PCS.updated || 0)) {
    Object.assign(PCS, { cur: pcRemote.cur || null, roster: Array.isArray(pcRemote.roster) ? pcRemote.roster : [], updated: pcRemote.updated });
    PCS.roster.forEach(pcEnsure);
    try { localStorage.setItem(PC_KEY, JSON.stringify(PCS)); } catch { }
    if (PCS.cur && !PCS.roster.some(x => x.id === PCS.cur.id)) { currentPC = pcEnsure(PCS.cur); renderPC(); }
    renderRoster();
  } else if (Store.mode === "db" && (PCS.cur || PCS.roster.length)) pcPersist();
}
function renderPC() {
  if (!currentPC) return;
  RC.id = currentPC.id; forgeOpen(false); pcShow("sheet"); renderRosterTab();
}
function keepPC() {
  const c = currentPC; if (!c) return;
  if (!PCS.roster.some(x => x.id === c.id)) PCS.roster.unshift(c);
  currentPC = null; RC.id = c.id; forgeOpen(false); pcPersist(); renderRosterTab();
  toast(`${c.name} saved to your characters`);
}
function addPCToCampaign(id, p = currentPC) {
  if (!p) { toast("Forge a character first"); return; }
  const c = Store.get(id); if (!c) { toast("Create a campaign first (Campaign Tracker)"); return; }
  c.party = c.party || [];
  const notes = sheetText(p).split("\n").slice(1).join("\n"), ex = c.party.find(x => x.pcId === p.id);
  if (ex) Object.assign(ex, { name: p.name, cls: `${p.race} ${p.cls}`, level: p.level, notes });
  else c.party.unshift({ id: uid("p"), pcId: p.id, name: p.name, cls: `${p.race} ${p.cls}`, level: p.level, player: "", notes });
  Store.save(c); toast(ex ? `Updated ${p.name} in “${c.name}”` : `${p.name} joined the party in “${c.name}”`);
  if (activeId === id && location.hash === "#tracker") renderTracker();
}

/* ---- prepared / known spells ---- */
const KNOWN_SPELLS = {
  Bard: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
  Sorcerer: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  Warlock: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  Ranger: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11]
};
const CANTRIP_BASE = { Bard: 2, Cleric: 3, Druid: 2, Sorcerer: 4, Warlock: 2, Wizard: 3 };
function spellLimits(c) {
  if (!c || !c.spell) return null;
  // every spellcasting class counts, each at its own level
  const m = c.mods, list = [...(castOf(c.cls, c.subclass) ? [{ cls: c.cls, lv: c.level, subclass: c.subclass }] : []), ...(c.multi || []).filter(x => castOf(x.cls, x.subclass) && +x.lv > 0)];
  let n = 0, cant = 0, word = "prepared";
  list.forEach(({ cls, lv, subclass }) => {
    const sc = subCaster(cls, subclass);
    if (sc) { n += THIRD_KNOWN[lv - 1] || 0; if (list.length === 1 && edOf(c) === "2014") word = "known"; cant += sc.cantrips + (lv >= 10 ? 1 : 0) - (cls === "Rogue" && lv >= 3 ? 1 : 0); return; } /* Eldritch Knight, Arcane Trickster */
    const book = classData(edOf(c), cls).hbx;
    if (book?.preparedAt) {
      n += Number(book.preparedAt[lv - 1]) || 0;
      cant += Number(book.cantripsAt?.[lv - 1]) || 0;
      return;
    }
    const ab = CLASS_DATA[cls].cast[1];
    if (CLASS_DATA[cls].cast[0] === "artificer") {
      const revised = [0, 2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15];
      n += edOf(c) === "2024" ? revised[lv] : Math.max(1, m[ab] + Math.floor(lv / 2));
      cant += 2 + (lv >= 10 ? 1 : 0) + (lv >= 14 ? 1 : 0);
      return;
    }
    if (KNOWN_SPELLS[cls]) { n += KNOWN_SPELLS[cls][lv - 1] || 0; if (list.length === 1) word = "known"; }
    else if (cls === "Paladin") n += lv >= 2 ? Math.max(1, m.cha + Math.floor(lv / 2)) : 0;
    else if (CLASS_DATA[cls].hb && CLASS_DATA[cls].cast[0] === "half") n += Math.max(1, m[ab] + Math.floor(lv / 2)); // a homebrew half caster prepares like a 2014 Paladin
    else n += Math.max(1, m[ab] + lv);
    const cb = CANTRIP_BASE[cls] || (CLASS_DATA[cls].hb && CLASS_DATA[cls].cast[0] !== "half" ? CANTRIP_BASE[clsSpellList(cls)] || 2 : 0); if (cb) cant += cb + (lv >= 4 ? 1 : 0) + (lv >= 10 ? 1 : 0);
  });
  return { n, word, cantrips: cant };
}
const isPrep = (c, name, ed) => !!(c && c.prepared && c.prepared.some(p => p.n === name && p.ed === ed));
function togglePrep(c, s, ed) {
  pcEnsure(c);
  if (c.prepared.some(p => p.n === s.n && p.ed === ed && p.src)) return true;
  const i = c.prepared.findIndex(p => p.n === s.n && p.ed === ed);
  if (i >= 0) { c.prepared.splice(i, 1); toast(`${s.n} removed from ${c.name}`); return false; }
  if (s.referenceOnly || s.pend) { toast("Complete spell rules are required before preparation."); return false; }
  if (!spellConditionalEligible(c,s,ed)) { toast("This spell is not available through this character’s class or background."); return false; }
  c.prepared.push({ n: s.n, l: s.l, ed });
  const L = spellLimits(c);
  if (L) {
    const selections = manualPreparedSpells(c);
    const can = selections.filter(p => p.l === 0).length, lev = selections.length - can;
    const over = s.l === 0 ? can > L.cantrips : lev > L.n;
    toast(over ? `${s.n} added, but that's over ${c.name}'s usual limit` : `${s.n} ${L.word === "known" ? "learned" : "prepared"} for ${c.name}`);
  } else toast(`${s.n} added to ${c.name}`);
  return true;
}
function pcChanged(c) {
  if (currentPC && c.id === currentPC.id) { const el = $("#pcPrepared"); if (el) el.innerHTML = preparedHTML(currentPC); }
  else { const i = PCS.roster.findIndex(x => x.id === c.id); if (i >= 0) PCS.roster[i] = c; }
  const rp = $("#rcPrepared"); if (rp && RC.id === c.id) rp.innerHTML = preparedHTML(c, true);
  pcPersist();
}
/* Every spellcasting class the character has (main and multiclass), each with the highest spell level its OWN class level
   reaches and whether it has cantrips. A Fighter/Wizard prepares from the Wizard list (owner's bug, 2026-11-18). */
function pcCastClasses(c) {
  if (!c || !c.spell) return [];
  const ed = edOf(c), list = [{ cls: c.cls, lv: c.level, subclass: c.subclass }, ...(c.multi || []).filter(x => +x.lv > 0)].filter(x => castOf(x.cls, x.subclass));
  return list.map(({ cls, lv, subclass }) => {
    const k = castOf(cls, subclass)[0];
    if (k === "third") return { cls, lv, list: castListOf(cls, subclass), max: thirdSlots(lv).length, cantrips: true };
    if (k === "artificer") return { cls, lv, max: ARTIFICER_SLOTS[lv].length, cantrips: true };
    const max = k === "pact" ? Math.min(5, Math.ceil(lv / 2)) : k === "full" ? (FULL_SLOTS[lv] || []).length : (lv >= 2 || ed === "2024" ? (FULL_SLOTS[Math.ceil(lv / 2)] || []).length : 0);
    return { cls, lv, max: Math.max(k === "half" && !max ? 0 : 1, max), cantrips: k !== "half" };
  });
}
const pcCastNames = c => { const L = pcCastClasses(c).map(x => x.cls); return L.length ? L.join(" and ") : c.cls; };
// Guild-style expanded spell lists add choices, not automatic preparation or extra slots.
// Require the selected, edition-valid source background, not a homebrew name collision.
function spellBackgroundList(c, s, ed) {
  if (!c || edOf(c) !== ed || (s.ed && s.ed !== ed) || !Array.isArray(s.backgroundLists)) return false;
  const bg = HB_BG[c.bg];
  return !!(bg?.book && !bg.pend && hbEdOk(bg, ed) && s.backgroundLists.some(b => b.name === c.bg && b.src === bg.src));
}
function spellClassListEligible(c, s, ed, k) {
  return (s.c || []).includes(k.cls) || (s.c || []).includes(k.list || clsSpellList(k.cls)) || spellBackgroundList(c, s, ed);
}
function spellConditionalEligible(c, s, ed) {
  if (!s.backgroundLists?.length) return true;
  return edOf(c) === ed && pcCastClasses(c).some(k => spellClassListEligible(c,s,ed,k) && (s.l === 0 ? k.cantrips : s.l <= k.max));
}
function pcSpellPool(c, ed) {
  spLoad();
  const K = pcCastClasses(c); if (!K.length) return [];
  return SP.data[ed].filter(s => !s.pend && !s.referenceOnly && !s.shadow && K.some(k => spellClassListEligible(c,s,ed,k) && (s.l === 0 ? k.cantrips : s.l <= k.max)));
}
function manualPreparedSpells(c) {
  const granted = new Set((c.prepared || []).filter(p => p.src).map(p => spellKey(p.ed, p.n)));
  return (c.prepared || []).filter(p => !p.src && !granted.has(spellKey(p.ed, p.n)));
}
function sheetPreparedSpells(c, manual = manualPreparedSpells(c)) {
  const granted = (c.prepared || []).filter(p => p.src);
  const automatic = new Set(granted.filter(p => p.bookGrant).map(p => spellKey(p.ed, p.n)));
  return [...manual, ...granted.filter(p => p.bookGrant || !automatic.has(spellKey(p.ed, p.n)))];
}
function preparedGrantBadge(p) {
  if (!p.bookGrant || !Array.isArray(p.sources) || !p.sources.length) return p.src ? `<span class="prep-source">From ${esc(p.src)}</span>` : "";
  return `<span class="prep-source"><strong>${grantedSpellStatus(p.l, p.sources)}</strong> · ${esc(p.sources.map(spellGrantLabel).join(" / "))}${p.reference ? " · Rules reference" : ""}</span>`;
}
/* Prepared spells as bubbles: tap one for the spell window (castDialog). `cast` (My Characters) adds slots left per level. */
function prepBubble(p, canRemove = true) {
  const sp = spellOf(p.ed, p.n) || {};
  const marks = `${sp.co ? `<span class="prep-mk" title="Concentration">C</span>` : ""}${sp.ri ? `<span class="prep-mk" title="Ritual">R</span>` : ""}`;
  return `<span class="prep-chip"><button type="button" class="prep-b" data-spell="${esc(p.ed + "|" + p.n)}" title="Open ${esc(p.n)}">${esc(p.n)}${marks}${p.ed === "2014" ? ` <span class="muted" style="font-size:11px">2014</span>` : ""}</button>${preparedGrantBadge(p)}${canRemove && !p.src ? `<button type="button" class="prep-x" data-unprep="${esc(p.ed + "|" + p.n)}" title="Remove ${esc(p.n)}" aria-label="Remove ${esc(p.n)}">✕</button>` : ""}</span>`;
}
function prepSlotsText(c, l) {
  let R; try { R = pcResources(c); } catch { return ""; }
  const r = R.find(x => x.key === "slot" + l); if (!r || !r.max) return "";
  return ` <span class="prep-slots">· ${resLeft(c, r)} of ${r.max} slot${r.max === 1 ? "" : "s"} left</span>`;
}
function preparedHTML(c, cast) {
  const L = spellLimits(c), PC = manualPreparedSpells(c), P = sheetPreparedSpells(c, PC);
  const can = PC.filter(p => p.l === 0).length, lev = PC.length - can;
  const byL = {}; P.forEach(p => (byL[p.l] = byL[p.l] || []).push(p));
  const lvls = Object.keys(byL).map(Number).sort((a, b) => a - b);
  const counts = L ? `<div class="prep-count">${L.cantrips ? `<span>Cantrips <b class="${can > L.cantrips ? "over" : ""}">${can} / ${L.cantrips}</b></span>` : ""}<span>Spells ${L.word} <b class="${lev > L.n ? "over" : ""}">${lev} / ${L.n}</b></span>${c.cls === "Wizard" ? `<span class="muted">Wizards prepare from their spellbook.</span>` : ""}</div>` : "";
  const list = P.length ? lvls.map(l => `<div class="prep-lv">${l === 0 ? "Cantrips" : ordinal(l)}${cast && l ? prepSlotsText(c, l) : ""}</div><div class="prep-row">${byL[l].slice().sort((a, b) => a.n.localeCompare(b.n)).map(p => prepBubble(p)).join("")}</div>`).join("")
    : L ? `<p class="muted" style="margin:8px 0 0">No spells ${L.word} yet. Use Prepare spells to search the ${esc(pcCastNames(c))} list, or pick spells from the Spells tab.</p>` : "";
  return counts + list;
}
function prepPanelHTML(c, pre = "pc") {
  const lvOpts = (c.spell.cantrips ? `<option value="0">Cantrips</option>` : "") + Array.from({ length: c.spell.max }, (_, i) => `<option value="${i + 1}">Level ${i + 1}</option>`).join("");
  return `<div class="prep-panel hidden" id="${pre}PrepPanel">
    <div class="row" style="flex-wrap:wrap"><input type="search" id="${pre}PrepQ" autocomplete="off" placeholder="Search ${esc(pcCastNames(c))} spells, e.g. cure" style="flex:2 1 200px" aria-label="Search spells">
      <select id="${pre}PrepLv" style="flex:1 1 110px" aria-label="Spell level"><option value="">All levels</option>${lvOpts}</select>
      <select id="${pre}PrepEd" style="flex:1 1 110px" aria-label="Rules edition"><option value="2024">2024 rules</option><option value="2014">2014 rules</option></select></div>
    <div class="prep-res" id="${pre}PrepList"></div></div>`;
}
function renderPrepList(c = currentPC, pre = "pc") {
  const box = $(`#${pre}PrepList`); if (!c || !c.spell || !box) return;
  const ed = $(`#${pre}PrepEd`).value, lv = $(`#${pre}PrepLv`).value, words = $(`#${pre}PrepQ`).value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = pcSpellPool(c, ed).filter(s => (!words.length || words.every(w => s.hay.includes(w))) && (lv === "" || s.l === +lv)).sort((a, b) => a.l - b.l || a.n.localeCompare(b.n));
  box.innerHTML = list.length ? list.slice(0, 150).map(s => {
    const on = isPrep(c, s.n, ed), locked = c.prepared.some(p => p.n === s.n && p.ed === ed && p.src);
    return `<div class="prep-row"><details><summary><b>${esc(s.n)}</b> <span class="muted">${s.l ? "Lv " + s.l : "Cantrip"} · ${esc(s.s)}${s.co ? " · Concentration" : ""}${s.ri ? " · Ritual" : ""}</span></summary>
      <div class="sp-desc"><div class="muted" style="font-size:13.5px">${esc(s.t)} · ${esc(s.r)} · ${esc(s.du)}</div>${spFormat(s.d)}</div></details>
      <button type="button" class="btn sm ${on ? "" : "primary"}" data-prep="${s.id}" style="flex:0 0 auto" ${locked ? "disabled" : ""}>${locked ? "✓ Granted" : on ? "✓ Prepared" : "+ Prepare"}</button></div>`;
  }).join("") + (list.length > 150 ? `<p class="hint">Showing 150 of ${list.length}. Narrow the search to see more.</p>` : "")
    : `<p class="muted" style="margin:8px 0">No ${esc(pcCastNames(c))} spells match.</p>`;
}

/* ---- prepare from the Spells tab ---- */
function spTargets() { const l = []; if (currentPC && currentPC.spell) l.push(currentPC); PCS.roster.forEach(c => { if (c.spell && !l.some(x => x.id === c.id)) l.push(c); }); return l; }
function spTargetPC() { return spTargets().find(c => c.id === SP.target) || null; }
function renderSpTargets() {
  const row = $("#spTargetRow"), list = spTargets();
  if (!list.length) { row.innerHTML = `<span class="muted" style="font-size:14px">Forge a spellcaster on the Characters tab to prepare spells for them here.</span>`; SP.target = ""; return; }
  if (SP.target === undefined || (SP.target && !list.some(c => c.id === SP.target))) SP.target = list[0].id;
  row.innerHTML = `<span>Prepare spells for</span><select id="spTarget" aria-label="Character to prepare spells for"><option value="">No one (just browsing)</option>${list.map(c => `<option value="${esc(c.id)}">${esc(c.name)} · Lv ${c.level} ${esc(c.cls)}${currentPC && c.id === currentPC.id ? " (current)" : ""}</option>`).join("")}</select>`;
  $("#spTarget").value = SP.target || "";
}
function spPrepBtn(s) {
  if (s.srdSpell) return `<span class="hint">Prepare the canonical spell ${esc(s.srdSpell)} to avoid a duplicate.</span>`;
  if (s.referenceOnly) return '<span class="hint">Reference only — rules not yet certified.</span>';
  const t = spTargetPC(); if (!t) return "";
  const on = isPrep(t, s.n, SP.ed), locked = t.prepared.some(p => p.n === s.n && p.ed === SP.ed && p.src);
  return `<button class="btn sm ${on ? "" : "primary"}" data-sp="prep" data-id="${s.id}" ${locked ? "disabled" : ""}>${locked ? "✓ Granted" : on ? `✓ Prepared for ${esc(t.name)}` : `✦ Prepare for ${esc(t.name)}`}</button>`;
}
function spPrepToggle(s) {
  if (s.referenceOnly) { toast("This spell is reference only; its full rules have not been certified."); return; }
  const t = spTargetPC(); if (!t) { toast("Pick a character to prepare spells for"); return; }
  if (!isPrep(t, s.n, SP.ed) && !pcCastClasses(t).some(k => spellClassListEligible(t,s,SP.ed,k))) toast(`${s.n} isn't on the ${pcCastNames(t)} list, added anyway`);
  togglePrep(t, s, SP.ed); pcChanged(t);
}
$("#spTargetRow").addEventListener("change", e => { if (e.target.id === "spTarget") { SP.target = e.target.value; renderSpells(); } });

/* ---- printable character sheet (classic three-page 5e layout) ---- */
const AB_FULL = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };
const CLASS_PROFS = {
  Barbarian: "Light & medium armor, shields; simple & martial weapons", Bard: "Light armor; simple weapons, hand crossbows, longswords, rapiers, shortswords; three musical instruments",
  Cleric: "Light & medium armor, shields; simple weapons", Druid: "Light & medium armor, shields (nonmetal); clubs, daggers, darts, javelins, maces, quarterstaffs, scimitars, sickles, slings, spears; herbalism kit",
  Fighter: "All armor, shields; simple & martial weapons", Monk: "Simple weapons, shortswords; one artisan's tool or instrument", Paladin: "All armor, shields; simple & martial weapons",
  Ranger: "Light & medium armor, shields; simple & martial weapons", Rogue: "Light armor; simple weapons, hand crossbows, longswords, rapiers, shortswords; thieves' tools",
  Sorcerer: "Daggers, darts, slings, quarterstaffs, light crossbows", Warlock: "Light armor; simple weapons", Wizard: "Daggers, darts, slings, quarterstaffs, light crossbows"
};
const RACE_LANGS = { Aasimar: "Common, Celestial", Goliath: "Common, Giant", Orc: "Common, Orc", Dwarf: "Common, Dwarvish", Elf: "Common, Elvish", Halfling: "Common, Halfling", Human: "Common, one extra language", Dragonborn: "Common, Draconic", Gnome: "Common, Gnomish", "Half-Elf": "Common, Elvish, one extra language", "Half-Orc": "Common, Orc", Tiefling: "Common, Infernal" };
const DMG_TYPE = { Greataxe: "slashing", Rapier: "piercing", Mace: "bludgeoning", Scimitar: "slashing", Longsword: "slashing", Shortsword: "piercing", Longbow: "piercing", "Light crossbow": "piercing", Quarterstaff: "bludgeoning", "Unarmed strike": "bludgeoning" };
const SHEET_CSS = `
.dsheet{color:#111;font-family:Georgia,"Times New Roman",serif;font-size:11px;line-height:1.3;overflow-x:auto}
.dsheet *{box-sizing:border-box}
.dsheet .page{background:#fff;width:8.5in;min-height:11in;margin:0 auto 20px;padding:.38in .4in;box-shadow:0 6px 24px rgba(0,0,0,.6);break-after:page;page-break-after:always;position:relative}
.dsheet .page:last-child{break-after:auto;page-break-after:auto}
.dsheet .lab{font-family:Arial,Helvetica,sans-serif;font-size:7.5px;text-transform:uppercase;letter-spacing:.06em;color:#444}
.dsheet .hdr{display:grid;grid-template-columns:2.3in 1fr;gap:10px;align-items:stretch;margin-bottom:10px}
.dsheet .namebox{border:2px solid #111;border-radius:10px 0 0 10px;padding:8px 10px;display:flex;flex-direction:column;justify-content:flex-end}
.dsheet .namebox .v{font-size:18px;font-weight:bold;border-bottom:1px solid #999;min-height:24px}
.dsheet .hgrid{border:2px solid #111;border-radius:0 10px 10px 0;padding:6px 10px;display:grid;grid-template-columns:repeat(3,1fr);gap:5px 14px}
.dsheet .hgrid .v{border-bottom:1px solid #999;min-height:16px;font-size:12px}
.dsheet .cols{display:grid;grid-template-columns:2.5in 2.45in 1fr;gap:10px;align-items:start}
.dsheet .box{border:1.5px solid #111;border-radius:7px;padding:6px 7px;margin-bottom:8px}
.dsheet .boxt{font-family:Arial,Helvetica,sans-serif;font-size:8px;text-transform:uppercase;letter-spacing:.08em;text-align:center;font-weight:bold;margin-top:5px}
.dsheet .abil{display:grid;grid-template-columns:.82in 1fr;gap:8px}
.dsheet .abs{display:flex;flex-direction:column;gap:7px;background:#e8e8e8;border-radius:7px;padding:5px}
.dsheet .ab{border:1.5px solid #111;border-radius:7px;text-align:center;padding:3px 2px 0;height:.84in;background:#fff}
.dsheet .ab .lab{font-size:6.6px;font-weight:bold}
.dsheet .ab .m{font-size:22px;font-weight:bold;line-height:1.15}
.dsheet .ab .s{display:inline-block;border:1.5px solid #111;border-radius:50%;background:#fff;min-width:30px;font-size:11.5px;padding:0 4px}
.dsheet .line{display:flex;align-items:center;gap:5px;padding:1.4px 0;font-size:10.5px}
.dsheet .dot{width:8px;height:8px;border:1.2px solid #111;border-radius:50%;flex:0 0 8px;display:inline-block}
.dsheet .dot.f{background:#111}
.dsheet .dot.x{background:#111;outline:1.2px solid #111;outline-offset:1.5px}
.dsheet .num{min-width:22px;border-bottom:1px solid #111;text-align:center;flex:0 0 auto}
.dsheet .pill{display:flex;align-items:center;gap:8px;border:1.5px solid #111;border-radius:7px;padding:4px 7px;margin-bottom:8px}
.dsheet .pill .num{font-size:13px;font-weight:bold;min-width:30px;height:24px;line-height:22px;border:1.5px solid #111;border-radius:50%;display:inline-block}
.dsheet .trio{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}
.dsheet .stat{border:1.5px solid #111;border-radius:7px;text-align:center;padding:4px 3px}
.dsheet .stat .v{font-size:20px;font-weight:bold;min-height:26px}
.dsheet .hpv{min-height:34px;font-size:16px;text-align:center}
.dsheet table{width:100%;border-collapse:collapse}
.dsheet td,.dsheet th{border-bottom:1px solid #aaa;padding:2px 3px;text-align:left;font-size:10.5px;vertical-align:top}
.dsheet th{font-family:Arial,Helvetica,sans-serif;font-size:7.5px;text-transform:uppercase;color:#444;font-weight:normal}
.dsheet ul{margin:0;padding-left:14px}.dsheet li{margin-bottom:1px}
.dsheet .free{white-space:pre-wrap;min-height:.45in}
.dsheet .blank{min-height:1.4in}
.dsheet .shdr{display:grid;grid-template-columns:2.3in 1fr;gap:10px;margin-bottom:10px}
.dsheet .sgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;align-items:start}
.dsheet .slv{border:1.5px solid #111;border-radius:7px;padding:4px 6px 6px;break-inside:avoid}
.dsheet .slvh{display:flex;align-items:center;gap:6px;border-bottom:1.5px solid #111;padding-bottom:4px;margin-bottom:3px}
.dsheet .slvh b{font-size:14px;border:1.5px solid #111;border-radius:50%;width:24px;height:24px;display:grid;place-items:center;flex:0 0 24px}
.dsheet .slvh .sl{border:1px solid #111;border-radius:4px;padding:0 5px;min-width:26px;text-align:center}
.dsheet .sline{display:flex;align-items:center;gap:5px;border-bottom:1px solid #bbb;min-height:16px;font-size:10.5px}
.dsheet .foot{font-family:Arial,Helvetica,sans-serif;font-size:7px;color:#777;text-align:center;position:absolute;left:0;right:0;bottom:.18in}
@media print{.dsheet{overflow:visible}.dsheet .page{box-shadow:none;margin:0}}`;
function sheetDoc(c) {
  const sv = a => c.mods[a] + (c.saves.includes(a) ? c.prof : 0);
  const field = (v, l) => `<div><div class="v">${esc(v)}</div><div class="lab">${l}</div></div>`;
  const dots = n => Array.from({ length: n }, () => `<span class="dot"></span>`).join("");
  const foot = n => `<div class="foot">Dungeon Master's Forge · 5e character sheet · page ${n}</div>`;
  const nameHdr = (extra) => `<div class="hdr"><div class="namebox"><div class="v">${esc(c.name)}</div><div class="lab">Character name</div></div><div class="hgrid">${extra}</div></div>`;
  const first = c.name.split(" ")[0];
  // page 1
  const p1 = `<div class="page">${nameHdr([[`${c.cls} ${c.level}`, "Class & level"], [c.bg, "Background"], [c.player || "", "Player name"], [raceLabel(c), edOf(c) === "2024" ? "Species" : "Race"], [c.align, "Alignment"], ["", "Experience points"]].map(([v, l]) => field(v, l)).join(""))}
  <div class="cols">
    <div>
      <div class="abil">
        <div class="abs">${AB.map(a => `<div class="ab"><div class="lab">${AB_FULL[a]}</div><div class="m">${sgn(c.mods[a])}</div><div class="s">${c.scores[a]}</div></div>`).join("")}</div>
        <div>
          <div class="pill"><span class="num"></span><span class="lab">Inspiration</span></div>
          <div class="pill"><span class="num">${sgn(c.prof)}</span><span class="lab">Proficiency bonus</span></div>
          <div class="box">${AB.map(a => `<div class="line"><span class="dot ${c.saves.includes(a) ? "f" : ""}"></span><span class="num">${sgn(sv(a))}</span>${AB_FULL[a]}</div>`).join("")}<div class="boxt">Saving throws</div></div>
          <div class="box">${c.skills.map(s => `<div class="line"><span class="dot ${s.x ? "x" : s.p ? "f" : ""}"></span><span class="num">${sgn(s.v)}</span>${esc(s.s)} <span class="lab">(${AB_NAME[s.ab]})</span></div>`).join("")}<div class="boxt">Skills</div></div>
        </div>
      </div>
      <div class="pill"><span class="num">${c.passive}</span><span class="lab">Passive wisdom (perception)</span></div>
      <div class="box"><div><b>Armor &amp; weapons:</b> ${esc(CLASS_PROFS[baseClassOf(c.cls)] || (CLASS_DATA[c.cls] && CLASS_DATA[c.cls].hb ? [CLASS_DATA[c.cls].armorT.replace(/shield/, "shields").split(" ").filter(Boolean).map(k => k === "shields" ? k : k + " armor").join(", "), CLASS_DATA[c.cls].weapons, CLASS_DATA[c.cls].tools].filter(Boolean).join("; ") : ""))}</div><div style="margin-top:4px"><b>Languages:</b> ${esc(RACE_LANGS[c.race] || "Common")}</div><div class="boxt">Other proficiencies &amp; languages</div></div>
    </div>
    <div>
      <div class="trio"><div class="stat"><div class="v">${c.ac}</div><div class="lab">Armor class</div></div><div class="stat"><div class="v">${sgn(c.init)}</div><div class="lab">Initiative</div></div><div class="stat"><div class="v">${c.speed}</div><div class="lab">Speed</div></div></div>
      <div class="box"><div class="lab">Hit point maximum <b style="font-size:11px;color:#111">${c.hp}</b></div><div class="hpv">${c.hp}</div><div class="boxt">Current hit points</div></div>
      <div class="box"><div class="hpv"></div><div class="boxt">Temporary hit points</div></div>
      <div class="trio" style="grid-template-columns:1fr 1fr"><div class="stat"><div class="lab">Total ${c.level}d${c.hd}</div><div class="v" style="font-size:15px">${c.level}d${c.hd}</div><div class="lab">Hit dice</div></div>
        <div class="stat"><div class="line" style="justify-content:flex-end"><span class="lab">Successes</span>${dots(3)}</div><div class="line" style="justify-content:flex-end"><span class="lab">Failures</span>${dots(3)}</div><div class="lab">Death saves</div></div></div>
      <div class="box"><table><tr><th>Name</th><th>Atk bonus</th><th>Damage / type</th></tr>
        ${c.attacks.map(a => `<tr><td>${esc(a.name)}</td><td>${sgn(a.hit)}</td><td>${esc(a.dmg)} ${a.type || DMG_TYPE[a.name] || ""}</td></tr>`).join("")}
        ${c.spell ? `<tr><td>Spell attack</td><td>${esc(sgn(c.spell.atk))}</td><td>Save DC ${esc(c.spell.dc)}</td></tr>` : ""}<tr><td>&nbsp;</td><td></td><td></td></tr></table>
        ${c.extras.length ? `<div style="margin-top:5px">${c.extras.map(esc).join("<br>")}</div>` : ""}${defText(c) ? `<div style="margin-top:5px"><b>${esc(defText(c))}</b></div>` : ""}<div class="boxt">Attacks &amp; spellcasting</div></div>
      <div class="box"><ul>${c.kit.map(k => `<li>${esc(k)}</li>`).join("")}${c.bgV >= 2 ? (+c.startGold ? `<li>${+c.startGold} gp</li>` : "") : `<li>${esc(c.bg)} background gear</li>`}${(c.inv || []).filter(i => i.n).map(i => `<li>${+i.qty > 1 ? i.qty + " × " : ""}${esc(i.n)}${i.attuned ? " (attuned)" : ""}</li>`).join("")}</ul><div style="margin-top:6px" class="lab">${["cp", "sp", "ep", "gp", "pp"].map(k => `${k.toUpperCase()} ${c.coins && +c.coins[k] ? c.coins[k] : "____"}`).join(" ")}</div><div class="boxt">Equipment</div></div>
    </div>
    <div>
      ${[["Personality traits", c.trait], ["Ideals", c.ideal], ["Bonds", cap1(c.bond) + "."], ["Flaws", cap1(c.flaw) + "."]].map(([l, v]) => `<div class="box"><div class="free">${esc(v)}</div><div class="boxt">${l}</div></div>`).join("")}
      <div class="box"><ul>${c.feats.map(f => `<li>${esc(f.f)} <span class="lab">(lv ${f.l})</span></li>`).join("")}${c.traits.map(t => `<li>${esc(t)} <span class="lab">(${esc(c.race)})</span></li>`).join("")}</ul><div class="boxt">Features &amp; traits</div></div>
    </div>
  </div>${foot(1)}</div>`;
  // page 2
  const p2 = `<div class="page">${nameHdr([["", "Age"], ["", "Height"], ["", "Weight"], ["", "Eyes"], ["", "Skin"], ["", "Hair"]].map(([v, l]) => field(v, l)).join(""))}
  <div class="cols" style="grid-template-columns:2.5in 1fr">
    <div><div class="box"><div class="free" style="min-height:2.4in">${esc(c.look || "")}</div><div class="boxt">Character appearance</div></div>
      <div class="box"><div class="free" style="min-height:3in">${esc(first)} ${esc(c.hook)}.${c.hookDetail ? `\n\n${esc(c.hookDetail.story)}\n\nUnanswered questions:\n${c.hookDetail.questions.map(q => "• " + esc(q)).join("\n")}` : ""}</div><div class="boxt">Character backstory</div></div></div>
    <div><div class="box"><div class="free" style="min-height:2.4in">${esc(c.notes || "")}</div><div class="boxt">Allies &amp; organizations</div></div>
      <div class="box"><div class="free" style="min-height:2in">${esc(c.featNotes || "")}</div><div class="boxt">Additional features &amp; traits</div></div>
      <div class="box"><div class="blank"></div><div class="boxt">Treasure</div></div></div>
  </div>${foot(2)}</div>`;
  const P = sheetPreparedSpells(c);
  if (!c.spell && !P.length) return p1 + p2;
  // page 3: spellcasting
  const lv = c.level, pact = !!c.spell?.note, pn = lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 2 ? 2 : 1, psl = Math.min(5, Math.ceil(lv / 2));
  const slotsFor = l => pact ? (l === psl ? pn : 0) : (c.spell?.slots[l - 1] || 0);
  const box = l => {
    const sp = P.filter(p => p.l === l).sort((a, b) => a.n.localeCompare(b.n));
    const rows = Math.max(l === 0 ? 8 : l <= 3 ? 12 : l <= 6 ? 9 : 7, sp.length);
    return `<div class="slv"><div class="slvh"><b>${l}</b>${l === 0 ? `<span class="lab">Cantrips</span>` : `<span class="lab">Slots total</span><span class="sl">${slotsFor(l) || "&nbsp;"}</span><span class="lab">Expended</span><span class="sl">&nbsp;</span>`}</div>
      ${Array.from({ length: rows }, (_, i) => `<div class="sline">${l ? `<span class="dot ${sp[i] ? "f" : ""}"></span>` : ""}${sp[i] ? esc(sp[i].n) : ""}${sp[i]?.sources?.some(g => g.kind === "feat") ? `<span class="lab">${esc(sp[i].sources.filter(g => g.kind === "feat").map(g => g.name).join(", "))}</span>` : ""}</div>`).join("")}</div>`;
  };
  const cols = [[0, 1, 2], [3, 4, 5], [6, 7, 8, 9]];
  const p3 = `<div class="page"><div class="shdr"><div class="namebox" style="border:2px solid #111;border-radius:10px 0 0 10px;padding:8px 10px"><div class="v" style="font-size:16px;font-weight:bold;border-bottom:1px solid #999">${esc(c.spell ? c.cls : "Granted spells")}</div><div class="lab">Spellcasting</div></div>
    <div class="hgrid" style="border:2px solid #111;border-radius:0 10px 10px 0;padding:6px 10px">${c.spell ? field(AB_FULL[c.spell.ab], "Spellcasting ability") + field(c.spell.dc, "Spell save DC") + field(sgn(c.spell.atk), "Spell attack bonus") : ""}</div></div>
    ${pact ? `<p style="margin:0 0 8px"><b>Pact Magic:</b> ${esc(c.spell.note)}.</p>` : ""}
    <div class="sgrid">${cols.map(col => `<div>${col.map(l => `<div style="margin-bottom:8px">${box(l)}</div>`).join("")}</div>`).join("")}</div>${foot(3)}</div>`;
  return p1 + p2 + p3;
}
function sheetFileHTML(c) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(c.name)} · Character Sheet</title><style>${SHEET_CSS}
body{margin:0;padding:20px 0;background:#5a5a5a}@page{size:letter;margin:0}@media print{body{background:#fff;padding:0}}</style></head><body><div class="dsheet">${sheetDoc(c)}</div></body></html>`;
}
const ITEMCARD_CSS = `
.icards{display:flex;flex-wrap:wrap;gap:18px;justify-content:center;padding:6px}
.icard{width:3.5in;min-height:5in;box-sizing:border-box;background:#f3e7c9;background-image:radial-gradient(ellipse at 50% 0%,rgba(255,255,255,.55),transparent 60%),radial-gradient(ellipse at 50% 120%,rgba(120,80,30,.28),transparent 60%);border:3px solid #3b2a17;outline:1px solid #b08a4a;outline-offset:-9px;border-radius:12px;padding:17px 17px 13px;color:#1d140a;font-family:Georgia,"Times New Roman",serif;font-size:11.5px;line-height:1.38;display:flex;flex-direction:column;box-shadow:0 8px 22px rgba(0,0,0,.55);break-inside:avoid;page-break-inside:avoid;text-shadow:none;text-align:left}
.icard h2{font-family:Cinzel,Georgia,serif;font-size:17px;font-weight:700;margin:0 0 2px;color:#6b2412;letter-spacing:.02em;text-shadow:none}
.icard .ty{font-style:italic;color:#4b3a26;padding-bottom:5px;margin-bottom:6px;border-bottom:2px solid #8b3a1a}
.icard .st{margin:1px 0}.icard .st b{color:#6b2412}
.icard .ds{flex:1;margin-top:6px;width:auto;height:auto;border:0;border-radius:0;display:block} /* undo the death-save dot style that shares the .ds name */.icard .ds p{margin:0 0 6px}.icard .ds ul{margin:0 0 6px;padding-left:16px}.icard .ds b{color:#3b1a0c}
.icard table,.icard .sp-table{border-collapse:collapse;width:100%;margin:4px 0 6px;font-size:10.5px}
.icard th,.icard td,.icard .sp-table th,.icard .sp-table td{border:1px solid #a88c5f;padding:2px 4px;text-align:left;color:#1d140a;background:transparent;font-family:Georgia,serif}
.icard .sp-table th{color:#6b2412;font-size:10px}
.icard .ft{display:flex;justify-content:space-between;gap:8px;border-top:1px solid #8b6a44;margin-top:8px;padding-top:5px;font-weight:bold;color:#3b2a17}
.icard .rb{display:inline-block;font-family:Cinzel,Georgia,serif;font-size:9px;letter-spacing:.08em;text-transform:uppercase;padding:1px 6px;border-radius:3px;background:#3b2a17;color:#f3e7c9}
.icard.r-u{border-color:#2f5a22}.icard.r-u .rb{background:#2f5a22}.icard.r-r{border-color:#1f3f78}.icard.r-r .rb{background:#1f3f78}.icard.r-vr{border-color:#4f2a78}.icard.r-vr .rb{background:#4f2a78}.icard.r-l{border-color:#8a5a12}.icard.r-l .rb{background:#8a5a12}.icard.r-a{border-color:#7a1f14}.icard.r-a .rb{background:#7a1f14}
@media print{.icard{box-shadow:none}}`;
let overlayDL = null;
function openOverlay(html, dlName, dlHtml, label) {
  if (!$("#sheetCss")) document.head.insertAdjacentHTML("beforeend", `<style id="sheetCss">${SHEET_CSS}</style>`);
  let ov = $("#sheetOverlay");
  if (!ov) {
    document.body.insertAdjacentHTML("beforeend", `<div id="sheetOverlay" role="dialog" aria-modal="true" aria-label="Printable view"><div class="bar"><button class="btn primary" type="button" data-sh="print">⎙ Print / Save as PDF</button><button class="btn" type="button" data-sh="dl">Download (.html)</button><button class="btn" type="button" data-sh="close">Close</button><p class="hint">If printing doesn't open here, download the file and print it from your browser. Choose “Save as PDF” to get a PDF.</p></div><div id="sheetBody"></div></div>`);
    ov = $("#sheetOverlay");
    ov.addEventListener("click", e => {
      const b = e.target.closest("[data-sh]"); if (!b) return;
      if (b.dataset.sh === "close") ov.classList.remove("open");
      else if (b.dataset.sh === "print") { try { window.print(); } catch { toast("Printing is blocked here. Download the file instead."); } }
      else if (overlayDL) saveFile(overlayDL.name, new Blob([overlayDL.html], { type: "text/html" }));
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") ov.classList.remove("open"); });
  }
  overlayDL = { name: dlName, html: dlHtml };
  ov.setAttribute("aria-label", label || "Printable view");
  $("#sheetBody").innerHTML = html;
  ov.classList.add("open"); ov.scrollTop = 0;
}
/* ---- spell cards: one printable card per prepared spell, in the item-card style ---- */
function spellCardHTML(s) {
  const kind = s.l === 0 ? `${s.s} cantrip` : `Level ${s.l} ${String(s.s).toLowerCase()}`;
  const du = (s.co && !/concentration/i.test(s.du) ? "Concentration, " : "") + s.du;
  const st = [["Casting time", s.t + (s.ri && !/ritual/i.test(s.t) ? " (ritual)" : "")], ["Range", s.r], ["Components", s.cp + (s.m ? ` (${s.m})` : "")], ["Duration", du]];
  return `<div class="icard r-${s.l === 0 ? "g" : s.l <= 2 ? "u" : s.l <= 4 ? "r" : s.l <= 6 ? "vr" : "l"}"><h2>${esc(s.n)}</h2><div class="ty">${esc(kind)}</div>
    ${st.map(([k, v]) => `<div class="st"><b>${esc(k)}:</b> ${esc(v || "—")}</div>`).join("")}
    <div class="ds">${spFormat(s.d || "")}</div><div class="ft"><span>${esc((s.c || []).join(", "))}</span><span class="rb">${s.l === 0 ? "Cantrip" : "Level " + s.l}</span></div></div>`;
}
function openSpellCards(c) {
  spLoad(); const seen = new Set();
  const list = (c.prepared || []).map(x => (SP.data[x.ed || edOf(c)] || []).find(s => !s.shadow && s.n === x.n)).filter(s => s && !seen.has(s.n) && seen.add(s.n)).sort((a, b) => a.l - b.l || a.n.localeCompare(b.n));
  if (!list.length) { toast("No prepared spells on this sheet yet. Add some in the Spells section first."); return; }
  const cards = list.map(spellCardHTML).join(""), file = c.name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") + "-spell-cards.html";
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(c.name)} · Spell Cards</title><style>${ITEMCARD_CSS}
body{margin:0;padding:24px;background:#5a5a5a}@media print{body{background:#fff;padding:0}.icard{break-inside:avoid}}</style></head><body><div class="icards">${cards}</div></body></html>`;
  openOverlay(`<div class="icards">${cards}</div>`, file, html, "Spell cards");
}
function openSheet(c) {
  if (!c) { toast("Forge a character first"); return; }
  openOverlay(`<div class="dsheet">${sheetDoc(c)}</div>`, c.name.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") + "-character-sheet.html", sheetFileHTML(c), "Character sheet");
}
