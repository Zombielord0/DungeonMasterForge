/* 13c-dice-conditions-casting.js: My Characters: conditions, exhaustion, concentration, death saves, the dice roller and roll dock, and casting from the sheet. */

/* ---- conditions, exhaustion, concentration, death saves and the dice roller (My Characters) ---- */
const CONDS = [
  ["blinded", "Blinded", "You can't see; attack rolls against you have advantage and yours have disadvantage."],
  ["charmed", "Charmed", "You can't attack the charmer, and it has advantage on social checks against you."],
  ["deafened", "Deafened", "You can't hear and automatically fail checks that need hearing."],
  ["frightened", "Frightened", "Disadvantage on ability checks and attacks while the source is in sight; you can't move closer to it."],
  ["grappled", "Grappled", "Your speed is 0."],
  ["incapacitated", "Incapacitated", "You can't take actions or reactions. Concentration ends."],
  ["invisible", "Invisible", "Your attack rolls have advantage, and attacks against you have disadvantage."],
  ["paralyzed", "Paralyzed", "Incapacitated, speed 0, you fail STR and DEX saves, and hits within 5 ft are critical hits."],
  ["petrified", "Petrified", "Turned to stone: incapacitated, speed 0, you fail STR and DEX saves, and resist all damage."],
  ["poisoned", "Poisoned", "Disadvantage on attack rolls and ability checks."],
  ["prone", "Prone", "Disadvantage on your attacks; melee attacks against you have advantage. Standing up costs half your speed."],
  ["restrained", "Restrained", "Speed 0; disadvantage on your attacks and DEX saves; attacks against you have advantage."],
  ["stunned", "Stunned", "Incapacitated; you fail STR and DEX saves, and attacks against you have advantage."],
  ["unconscious", "Unconscious", "Incapacitated and prone, you drop what you hold, fail STR and DEX saves, and hits within 5 ft are critical hits."]
];
const COND_INCAP = ["incapacitated", "paralyzed", "petrified", "stunned", "unconscious"];
const condOn = (c, k) => !!(c.conds || {})[k];
const exhOf = c => clamp(+c.exh || 0, 0, 6);
function exhText(c) {
  const n = exhOf(c); if (!n) return "";
  if (edOf(c) === "2024") return n >= 6 ? "Exhaustion 6: you die." : `Exhaustion ${n}: −${2 * n} to every d20 test and −${5 * n} ft speed.`;
  return ["", "Disadvantage on ability checks.", "Speed halved.", "Disadvantage on attacks and saves.", "Hit point maximum halved.", "Speed 0.", "You die."].slice(1, n + 1).map((t, i) => `${i + 1}: ${t}`).join(" ");
}
// what helps or hurts a roll right now: { adv: [why], dis: [why], fail: why, pen }
function rollState(c, kind, ab, o = {}) {
  const S = { adv: [], dis: [], fail: "", pen: 0 }, ed = edOf(c), n = exhOf(c), on = k => condOn(c, k);
  const sd = ab === "str" || ab === "dex";
  if (c.armorUntrained && sd && kind !== "init") S.dis.push("armor you aren't trained with");
  if (c.armorUntrained && kind === "init") S.dis.push("armor you aren't trained with");
  if (kind === "attack") {
    ["blinded", "frightened", "poisoned", "prone", "restrained"].forEach(k => { if (on(k)) S.dis.push(k); });
    if (on("invisible")) S.adv.push("invisible");
    if (ed === "2014" && n >= 3) S.dis.push("exhaustion");
    (o.tags || []).filter(t => /^advantage/.test(t)).forEach(t => S.adv.push(t.replace(/^advantage\s*/, "").replace(/[()]/g, "") || "advantage"));
  }
  if (kind === "check" || kind === "init") {
    ["frightened", "poisoned"].forEach(k => { if (on(k)) S.dis.push(k); });
    if (ed === "2014" && n >= 1) S.dis.push("exhaustion");
    if (o.skill === "Stealth" && c.acStealthDis) S.dis.push("armor (Stealth)");
    if (ab === "str" && isActive(c, "Rage")) S.adv.push("Rage");
  }
  if (kind === "init") {
    const has = f => (c.feats || []).some(x => x.f === f);
    if (has("Feral Instinct")) S.adv.push("Feral Instinct");
    if (artificerInfusionEquipped(c,"Helm of Awareness")) S.adv.push("Helm of Awareness");
    if (c.subclass === "Champion" && ed === "2024" && c.level >= 3) S.adv.push("Remarkable Athlete");
    if (c.subclass === "Assassin" && ed === "2024" && c.level >= 3) S.adv.push("Assassinate");
  }
  { const LD = pcLoad(c); if (LD.variant && LD.lb > LD.heavy && ["str", "dex", "con"].includes(ab) && kind !== "init") S.dis.push("heavily encumbered"); }
  if (kind === "save") {
    if (sd) { const k = ["paralyzed", "petrified", "stunned", "unconscious"].find(on); if (k) S.fail = k; }
    if (ab === "dex" && on("restrained")) S.dis.push("restrained");
    if (ed === "2014" && n >= 3) S.dis.push("exhaustion");
    if (ab === "str" && isActive(c, "Rage")) S.adv.push("Rage");
    if (o.conc && featTaken(c, "War Caster")) S.adv.push("War Caster");
    if(o.conc&&ab==="con"&&hasChoice(c,"Eldritch Invocations","mind"))S.adv.push("Eldritch Mind");
  }
  if(ed==="2024"&&kind==="save"&&ab==="dex"&&classFeatureLevel(c,"Barbarian")>=2&&!COND_INCAP.some(on))S.adv.push("Danger Sense");
  if(kind==="save"&&ed==="2014"&&clsLv(c,"Artificer")>=20)S.pen+=artificerAttunedCount(c);
  if (ed === "2024" && n) S.pen = -2 * n;
  if(kind==="check"||kind==="save"){
    if(ab==="str"&&runeKnightEffect(c,"might"))S.adv.push("Giant’s Might");
    if((ab==="str"||ab==="con")&&runeKnightEffect(c,"Frost"))S.pen+=2;
    if(kind==="save"&&o.poisoned&&runeKnightWorn(c,"Hill"))S.adv.push("Hill Rune");
    if(kind==="check"&&o.skill){
      for(const [name,rune] of Object.entries(KNIGHT_RUNES)){
        if(rune.skills?.includes(o.skill)&&runeKnightWorn(c,name))S.adv.push(`${name} Rune`);
      }
    }
  }
  return S;
}
const advMark = `<span class="advm" title="Advantage">A</span>`;
function rollMark(c, kind, ab, o) {
  const S = rollState(c, kind, ab, o);
  if (S.fail) return `<span class="dis" title="Automatically fails: ${esc(S.fail)}">✕</span>`;
  const a = S.adv.length, d = S.dis.length;
  return a && !d ? `<span class="advm" title="Advantage: ${esc(S.adv.join(", "))}">A</span>` : d && !a ? `<span class="dis" title="Disadvantage: ${esc(S.dis.join(", "))}">D</span>` : "";
}
/* the roller */
const ROLL = { mode: "normal", open: false };
const d20 = () => 1 + Math.floor(Math.random() * 20);
function rollLog(c, e) { c.rollLog = [{ t: Date.now(), ...e }, ...(c.rollLog || [])].slice(0, 30); pcPersist(); const d = $("#rollDock"); if (d) d.outerHTML = rollDockHTML(c); if (window.Portal && Portal.rolled) Portal.rolled(c, e); }
/* signed in as a player: a tick in the roll dock shares rolls with the DM's activity feed (src/portal.js, Portal.rolled) */
const SHARE_ROLLS_KEY = "dmforge.shareRolls";
const rollShareHTML = () => window.Portal && Portal.cloud && !Portal.isDM() ? `<label class="check rd-share"><input type="checkbox" data-rdshare ${localStorage.getItem(SHARE_ROLLS_KEY) === "1" ? "checked" : ""}><span>Share my rolls with the DM</span></label>` : "";
// The rolled die remains in the log. Reliable Talent applies to proficient skill checks,
 // not attacks, saves, initiative, or nonproficient ability checks. Tool checks remain manual.
function skillCheckD20Floor(c,kind,skill,raw) {
  const level=clsLv(c,"Rogue"), qualifies=kind==="check"&&level>=(edOf(c)==="2024"?7:11)
    &&(c.skills||[]).some(s=>s.s===skill&&(s.p||s.x));
  return qualifies?Math.max(10,raw):raw;
}
function rollD20(c, label, bonus, kind, ab, o = {}) {
  const S = rollState(c, kind, ab, o);
  if (ROLL.mode === "adv") S.adv.push("chosen"); if (ROLL.mode === "dis") S.dis.push("chosen");
  ROLL.mode = "normal";
  const mode = S.adv.length && !S.dis.length ? "adv" : S.dis.length && !S.adv.length ? "dis" : "normal";
  if (S.fail) { rollLog(c, { label, total: "Fail", note: `automatically fails (${S.fail})`, fail: true }); toast(`${label}: automatically fails (${S.fail})`); return { fail: true }; }
  const dice = mode === "normal" ? [d20()] : [d20(), d20()], raw = mode === "adv" ? Math.max(...dice) : mode === "dis" ? Math.min(...dice) : dice[0];
  const starFloor=raw<10&&((kind==="check"&&["int","wis"].includes(ab))||(kind==="save"&&ab==="con"&&o.conc))&&starryForm(c)==="dragon";
  const keep=starFloor?10:skillCheckD20Floor(c,kind,o.skill,raw);
  const ordinary=keep+bonus+S.pen;
  const indomitable=classFeatureLevel(c,"Barbarian")>=18&&ab==="str"&&(kind==="check"||edOf(c)==="2024"&&kind==="save");
  const total=indomitable?Math.max(ordinary,+c.scores.str||0):ordinary, crit = raw >= (o.crit || 20), fumble = raw === 1;
  const why = [...S.adv.map(x => "adv: " + x), ...S.dis.map(x => "dis: " + x), ...(keep!==raw?[`${starFloor?"Starry Form (Dragon)":"Reliable Talent"}: ${raw} treated as ${keep}`]:[]),...(total!==ordinary?["Indomitable Might: total raised to Strength score"]:[])].join(", ");
  rollLog(c, { label, d: dice, keep, bonus: bonus + S.pen, total, mode, crit: kind === "attack" && crit, fumble: kind === "attack" && fumble, nat20: keep === 20, note: why });
  toast(`${label}: ${total}${dice.length > 1 ? ` (${dice.join(" / ")}${mode === "adv" ? ", advantage" : ", disadvantage"})` : ` (d20 ${keep})`}${kind === "attack" && crit ? " — critical hit!" : kind === "attack" && fumble ? " — miss" : ""}`);
  return { total, keep, crit, fumble, mode };
}
// damage: "1d8+3", "4", plus extra dice like "1d6 force vs marked"; a critical hit doubles every die
function rollDamage(c, label, a, crit) {
  const parts = [String(a.dmg), ...(a.extra || []).map(x => (String(x).match(/^\+?\s*(\d+d\d+|\d+)/) || [])[1]).filter(Boolean)];
  let total = 0; const txt = [];
  parts.forEach(p => { const mm = p.replace(/\s+/g, "").match(/^(\d*)d(\d+)([+-]\d+)?$/); if (mm) { const r = rollDice(`${(+mm[1] || 1) * (crit ? 2 : 1)}d${mm[2]}${mm[3] || ""}`); total += r.total; txt.push(r.text.split(": ").slice(1).join(": ") || r.text); } else if (+p) { total += +p; txt.push(String(+p)); } });
  total = Math.max(0, total);
  rollLog(c, { label, total, note: `${crit ? "critical: dice doubled · " : ""}${txt.join(" · ")}`, dmg: true });
  toast(`${label}: ${total} damage${crit ? " (critical)" : ""}`);
  return total;
}
function rollDockHTML(c) {
  const L = c.rollLog || [];
  return `<div class="roll-dock ${ROLL.open ? "open" : ""}" id="rollDock" aria-label="Dice rolls">
    <div class="rd-head"><button type="button" class="btn sm" data-rdtoggle aria-expanded="${ROLL.open}">🎲 Rolls${L.length ? ` · ${esc(String(L[0].total))}` : ""}</button>
      <div class="seg rd-mode" role="radiogroup" aria-label="Next roll">${[["normal", "Normal"], ["adv", "Adv."], ["dis", "Dis."]].map(([v, l]) => `<label class="opt"><input type="radio" name="rollMode" value="${v}" ${ROLL.mode === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
    ${ROLL.open ? rollShareHTML() : ""}${ROLL.open ? `<ol class="rd-list">${L.length ? L.map(e => `<li class="${e.crit || e.nat20 ? "crit" : ""} ${e.fumble ? "fumble" : ""}"><span class="rd-t">${new Date(e.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span> <b>${esc(e.label)}</b> <span class="rd-total">${esc(String(e.total))}</span>${e.d ? `<small>d20 ${esc(e.d.join(" / "))}${e.bonus ? ` ${esc(sgn(e.bonus))}` : ""}${e.mode && e.mode !== "normal" ? (e.mode === "adv" ? " · advantage" : " · disadvantage") : ""}</small>` : ""}${e.note ? `<small>${esc(e.note)}</small>` : ""}</li>`).join("") : `<li class="muted">Click a skill, save, ability, initiative or attack to roll.</li>`}</ol>${L.length ? `<button type="button" class="btn sm" data-rdclear style="margin-top:6px">Clear</button>` : ""}` : ""}</div>`;
}
/* hit points: damage at 0 counts as a death save failure; dropping to 0 knocks you out; damage asks for a concentration save */
function pcFellUnconscious(c){
  c.conds={...(c.conds||{}),unconscious:true};c.condAuto=true;endStarryForm(c);
  const notes=[`${c.name} falls unconscious`];
  if(c.conc){notes.push(`concentration on ${c.conc.spell} ends`);delete c.conc;delete c.concCheck;}
  return notes;
}
function pcDamaged(c, dmg, wasZero, excess=0) {
  const notes = [];
  if (!dmg) return notes;
  c.death = c.death || { s: 0, f: 0 };
  if(+c.hpCur===0&&+c.hp>0&&excess>=+c.hp&&xgeFighterLevel(c,"Samurai")>=18){
    c.death={s:0,f:0,dead:true};notes.push(`${c.name} dies from massive damage`);
  }else if(wasZero&&!c.death.dead){
    if(c.samuraiDeathTurn==="pending")notes.push(...endSamuraiDeathTurn(c));
    c.death.f=Math.min(3,(+c.death.f||0)+1);c.death.stable=false;
    notes.push(`${c.name} takes a death save failure (${c.death.f}/3)`);
    if(c.death.f>=3){c.death.dead=true;notes.push(`${c.name} dies`);}
  }else if(!wasZero&&+c.hpCur===0&&!c.death.dead){
    c.death={s:0,f:0};notes.push(`${c.name} drops to 0 hit points`);
    if(samuraiDeathReady(c)){
      c.samuraiDeathTurn="pending";
      notes.push("Use or decline Strength before Death now");
    }else if(c.samuraiDeathTurn!=="active")notes.push(...pcFellUnconscious(c));
  }
  if(c.death.dead){
    delete c.samuraiDeathTurn;delete c.conc;delete c.concCheck;endStarryForm(c);
    artificerRecordDeath(c);companionOnOwnerDeath(c);
  }
  if(c.conc&&(+c.hpCur>0||c.samuraiDeathTurn)){
    if(edOf(c)==="2024"&&classFeatureLevel(c,"Ranger")>=13&&String(c.conc.spell).replaceAll("’","\x27").toLowerCase()==="hunter\x27s mark")notes.push("Relentless Hunter: damage cannot break Concentration on Hunter’s Mark");
    else {const dc=Math.min(edOf(c)==="2024"?30:99,Math.max(10,Math.floor(dmg/2)));c.concCheck=dc;notes.push(`concentration save needed (CON, DC ${dc})`);}
  }
  return notes;
}
function pcHealed(c, wasZero) {
  if (wasZero && +c.hpCur > 0) { c.death = { s: 0, f: 0 }; if(c.samuraiDeathTurn==="pending")delete c.samuraiDeathTurn; if (c.condAuto && c.conds) { delete c.conds.unconscious; delete c.condAuto; } return [`${c.name} is back on their feet`]; }
  return [];
}
function deathSave(c) {
  if(c.samuraiDeathTurn==="pending"||c.death?.dead)return;
  c.death = c.death || { s: 0, f: 0 };
  const r = rollD20(c, "Death save", 0, "save", "", {}); if (r.fail) return;
  if (r.keep === 20) { c.hpCur = 1; pcHealed(c, true); toast(`Natural 20! ${c.name} regains 1 hit point.`); }
  else if (r.keep === 1) c.death.f = Math.min(3, c.death.f + 2);
  else if (r.total >= 10) c.death.s = Math.min(3, c.death.s + 1);
  else c.death.f = Math.min(3, c.death.f + 1);
  if (c.death.s >= 3) { c.death.stable = true; toast(`${c.name} is stable.`); }
  if (c.death.f >= 3) { c.death.dead = true; delete c.samuraiDeathTurn;delete c.conc;delete c.concCheck;artificerRecordDeath(c); companionOnOwnerDeath(c); toast(`${c.name} has died.`); }
}
function concSave(c) {
  const dc = c.concCheck || 10, bonus = c.mods.con + (c.saves.includes("con") ? c.prof : 0) + itemSaveBonus(c);
  const r = rollD20(c, `Concentration (DC ${dc})`, bonus, "save", "con", { conc: true }); delete c.concCheck;
  if (r.fail || r.total < dc) { toast(`Concentration broken: ${c.conc ? c.conc.spell : "the spell"} ends.`); delete c.conc; }
  else toast(`Concentration holds (${r.total} vs DC ${dc}).`);
}
function concStart(c, spell) { const old = c.conc && c.conc.spell; c.conc = { spell, since: Date.now() }; delete c.concCheck; return old && old !== spell ? `Concentration on ${old} ends.` : ""; }
// the conditions bar, exhaustion, concentration and dying, under the vitals
function rcStatusHTML(c) {
  const on = CONDS.filter(([k]) => condOn(c, k)), n = exhOf(c), D = c.death || { s: 0, f: 0 }, zero = +c.hpCur === 0 && c.hpCur !== "";
  const dots = (k, v) => [0, 1, 2].map(i => `<span class="ds ${i < v ? "on" : ""} ${k}" aria-hidden="true"></span>`).join("");
  return `<div class="status">
    <div class="cond-bar"><span class="lbl" style="margin:0">Conditions</span>${CONDS.map(([k, l, d]) => `<button type="button" class="cond ${condOn(c, k) ? "on" : ""}" data-cond="${k}" aria-pressed="${condOn(c, k)}" title="${esc(d)}">${l}</button>`).join("")}
      <span class="exh"><span class="lbl" style="margin:0">Exhaustion</span><button type="button" class="ctr-b" data-exh="-1" aria-label="Less exhaustion" ${n ? "" : "disabled"}>−</button><b>${n}</b><button type="button" class="ctr-b" data-exh="1" aria-label="More exhaustion" ${n < 6 ? "" : "disabled"}>+</button></span></div>
    ${on.length || n ? `<ul class="plain cond-notes">${on.map(([k, l, d]) => `<li><b>${l}:</b> ${esc(d)}</li>`).join("")}${n ? `<li><b>Exhaustion:</b> ${esc(exhText(c))}</li>` : ""}</ul>` : ""}
    <div class="conc-row"><span class="lbl" style="margin:0">Concentration</span>${c.conc ? `<span class="tag gold">${esc(c.conc.spell)}</span><button type="button" class="icon-btn" data-concend title="Stop concentrating" aria-label="Stop concentrating">✕</button>${c.concCheck ? `<button type="button" class="btn sm primary" data-concsave>🎲 CON save (DC ${c.concCheck})</button>` : ""}` : `<input type="text" data-concset placeholder="Not concentrating — type a spell to start" aria-label="Concentrating on" style="max-width:280px">`}</div>
    ${D.dead ? `<div class="dying dead"><b>☠ ${esc(c.name)} has died.</b> <button type="button" class="btn sm" data-revive>Revive with 1 HP</button></div>`
      : c.samuraiDeathTurn==="pending"?`<div class="dying"><b>Strength before Death is available.</b> Use or decline it under Abilities.</div>`
      : zero || D.s || D.f ? `<div class="dying"><b>${c.samuraiDeathTurn==="active"?"Strength before Death extra turn":D.stable ? "Stable at 0 HP" : "Dying"}</b><span class="dsr">Successes ${dots("s", D.s)}</span><span class="dsr">Failures ${dots("f", D.f)}</span>${D.stable ? "" : `<button type="button" class="btn sm primary" data-deathsave>🎲 Death save</button><button type="button" class="btn sm" data-stabilize>Stabilize</button>`}</div>` : ""}
  </div>`;
}
/* ---- casting spells from the sheet: pick a slot, spend it, then roll what the spell does ---- */
const AB_WORD = { strength: "str", dexterity: "dex", constitution: "con", intelligence: "int", wisdom: "wis", charisma: "cha" };
function spellOf(ed, name) {
  spLoad();
  const local = SP.data[ed] || [];
  const normalized = String(name).toLowerCase().replaceAll("’", "'");
  const match = x => !x.shadow && !x.pend && [x.n, ...(x.aliases || [])].some(n => n.toLowerCase().replaceAll("’", "'") === normalized);
  const exact = local.find(x => match(x) && x.n === name && !x.referenceOnly);
  if (exact) return exact;
  const linked = local.find(x => match(x) && x.srdSpell);
  const canonical = linked && local.find(x => !x.src && !x.ref && !x.hb && !x.pend && !x.shadow && !x.referenceOnly && x.n === linked.srdSpell);
  if (canonical) return canonical;
  // An explicit local shell takes priority over another edition. It is displayable, not castable.
  return local.find(x => match(x) && !x.referenceOnly) || local.find(match)
    || local.find(x => x.hb && x.pend && !x.shadow && String(x.n).toLowerCase().replaceAll("’", "'") === normalized)
    || Object.values(SP.data).flat().find(x => match(x) && !x.referenceOnly) || null;
}
// Pending user homebrew is distinct from an incomplete published reference. Keep it usable
// only for its owning character, and do not expose it through public preparation pickers.
function spellCastBlocked(c, sp, ed) {
  if (!sp || sp.referenceOnly || !spellConditionalEligible(c,sp,ed)||isActive(c,"Rage")) return true;
  if (!sp.pend) return false;
  if (!sp.hb || !String(sp.d || "").trim()) return true;
  return !(c?.hbPending || []).some(e => e.kind === "spell" && !e.rejected &&
    (!e.ed || e.ed === "both" || e.ed === ed) && e.name === sp.n && e.desc === sp.d);
}
// what a spell does, read from its text: damage or healing dice, upcasting, cantrip growth, attack or save, area, number of rays or darts
function spellManualResolution(sp) { return !!(sp.rulesSummary || sp.manualRoll || sp.manualEffects); }
function spellPlan(sp) {
  const d = String(sp.d || ""), h = String(sp.h || "") + " " + d, P = { heal: false, dice: "", flat: 0, type: sp.dt || "", per: "", count: 1, countPer: 0, save: "", half: false, attack: sp.at || "", area: false, mod: false };
  if (spellManualResolution(sp)) return {...P,attack:"",manual:true};
  const heal = d.match(/regains?\s+(?:a number of\s+)?hit points equal to\s+(\d+d\d+)(\s*(?:\+|plus)\s*your spellcasting ability modifier)?/i);
  if (heal) { P.heal = true; P.dice = heal[1]; P.mod = !!heal[2]; }
  else {
    let dm = d.match(/(\d+d\d+)(?:\s*\+\s*(\d+))?\s+([A-Za-z]+)\s+damage/i);
    /* book reference spells (the owner's summaries, 2026-11-23) write "3d8 fire to each creature": the first dice before a damage type */
    const typed = sp.ref && d.match(/(\d+d\d+)(?:\s*\+\s*(\d+))?\s+(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\b/i);
    if (typed && (!dm || typed.index < dm.index)) dm = typed;
    if (dm) { P.dice = dm[1]; P.flat = +(dm[2] || 0); if (!P.type) P.type = cap1(dm[3].toLowerCase()); }
  }
  const up = h.match(/(?:damage|healing)[^.]*?increases?\s+by\s+(\d+d\d+)\s+for each (?:spell )?slot level above/i)
    || (sp.ref && String(sp.h || "").match(/\+(\d+d\d+)\b[^.]*?\bper (?:spell )?slot level above/i)); if (up) P.per = up[1];
  const many = d.match(/\b(three|two|four)\s+(?:glowing\s+|fiery\s+)?(darts|rays|beams|bolts)\b/i);
  if (many) { P.count = { two: 2, three: 3, four: 4 }[many[1].toLowerCase()]; if (/(one more|one additional|additional)\s+(dart|ray|beam|bolt)/i.test(h)) P.countPer = 1; }
  const sv = (sp.sv || (d.match(/(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+saving throw/i) || [])[1] || "").toLowerCase();
  P.save = AB_WORD[sv] || sv.slice(0, 3);
  P.half = /half as much damage|half damage|half (?:as much )?on (?:a )?success|halved on success/i.test(d);
  if (!P.attack) { const at = d.match(/make an? (ranged|melee) spell attack/i); if (at) P.attack = at[1].toLowerCase(); }
  P.area = /\b\d+-foot[- ](?:radius|cone|cube|line|sphere|emanation|cylinder|square)|\beach creature\b/i.test(d);
  P.cantripTiers = sp.l === 0 && /when you reach 5th level|cantrip upgrade|levels? 5 \(/i.test(d);
  return P;
}
// the dice for a cast at this slot level (cantrips grow with character level)
function spellTweak(c, sp, P) {
  if (P.manual) return P;
  if (sp.n === "Eldritch Blast") { const L = totalLv(c); P.count = 1 + (L >= 5) + (L >= 11) + (L >= 17); P.cantripTiers = false; }
  if(sp.l===0&&P.dice&&!P.heal&&invocationAffects(c,"agonizing",sp.n))P.flat+=c.mods.cha;
  return P;
}
function spellDice(c, sp, P, slot, caster = spellCaster(c, sp)) {
  if (!P.dice) return "";
  const [n, f] = P.dice.split("d").map(Number), lvl = totalLv(c), tier = P.cantripTiers ? 1 + (lvl >= 5) + (lvl >= 11) + (lvl >= 17) : 1;
  let count = n * tier, face = f;
  if (P.per && slot > sp.l) { const [pn, pf] = P.per.split("d").map(Number); if (pf === face) count += pn * (slot - sp.l); }
  const flat = P.flat + (P.heal && P.mod ? c.mods[caster.ab] : 0);
  return `${count}d${face}${flat ? sgn(flat) : ""}`;
}
function spellCaster(c, sp, how, ed = edOf(c)) {
  if(sp.n==="Command"&&["majestyStart","majestyRepeat"].includes(how)&&majestyLevel(c)>=6)return {cls:"Bard",ab:"cha",dc:8+c.prof+c.mods.cha,atk:c.prof+c.mods.cha};
  if(how==="soulFragment"&&demonHunterOwner(c))return {cls:demonHunterOwner(c).cls,ab:"wis",dc:8+c.prof+c.mods.wis,atk:c.prof+c.mods.wis};
  const own = [...(c.spell ? [{ cls: c.spell.cls || c.cls, list: c.spell.list, ab: c.spell.ab, dc: c.spell.dc, atk: c.spell.atk }, ...(c.spell.others || [])] : [])];
  const sources = spellPreparationSources(c, sp.n, ed);
  const source = sources.find(g => how && g.free === how) || sources.find(g => own.some(x => x.cls === g.cls))
    || sources.find(g => g.kind === "feat" && !g.ritualOnly && !g.slotClass) || sources[0];
  if (source?.kind === "species" || source?.kind === "feat" || source?.kind==="subclass"&&source.innate&&source.ab) {
    const ab = source.ab || (source.name === "Aasimar" ? "cha" : speciesSpellAbility(c));
    return { cls: source.name, ab, dc: 8 + c.prof + c.mods[ab], atk: c.prof + c.mods[ab] };
  }
  const caster=own.find(x => x.cls === source?.cls) || own.find(x => (sp.c || []).includes(x.cls) || (x.list && (sp.c || []).includes(x.list))) || own.find(x=>pcCastClasses(c).some(k=>k.cls===x.cls&&spellClassListEligible(c,sp,ed,k)&&(sp.l===0?k.cantrips:sp.l<=k.max))) || own[0] || { cls: "", ab: "int", dc: 8 + c.prof, atk: c.prof };
  return ed==="2024"&&baseClassOf(caster.cls)==="Sorcerer"&&isActive(c,"Innate Sorcery")&&(sp.c||[]).some(cls=>cls==="Sorcerer"||cls===caster.cls)?{...caster,dc:caster.dc+1,innateSorcery:true}:caster;
}
/* The spell window: the full rules, then (on My Characters) "Cast at level" buttons and Cast. `o.view`: rules only (the
   Characters tab, where slots aren't tracked). The picked choice is kept in the hidden #castSlot that castGo reads. */
const BOOK_FREE_CASTS = { "Rune Strike": "freeRuneStrike", "Find Steed": "freeFindSteed" };
function freeSpellResources(c, sp, ed, resources) {
  const keys = spellPreparationSources(c, sp.n, ed).map(g => g.free).filter(Boolean);
  if (BOOK_FREE_CASTS[sp.n]) keys.push(BOOK_FREE_CASTS[sp.n]);
  if (sp.ri && c.prepared?.some(p => p.ed === ed && p.n === sp.n)) keys.push("featQuickRitual");
  return resources.filter(r => keys.includes(r.key));
}
function majestyLevel(c){return characterSubclassLevel(c,"Bard","College of Glamour");}
function majestyActive(c){return majestyLevel(c)>=6&&c.conc?.spell==="Mantle of Majesty"&&c.conc?.feature==="majesty";}
function majestyCastOptions(c,sp,ed=edOf(c)){
 if(ed!==edOf(c)||sp?.n!=="Command"||majestyLevel(c)<6)return [];
 if(majestyActive(c))return [["majestyRepeat","Mantle of Majesty","Bonus Action · no slot; confirm another turn"]];
 const r=pcResources(c).find(r=>r.key===subAblKey("Mantle of Majesty"));
 return r?[["majestyStart","Activate Mantle of Majesty","Bonus Action · 1 minute Concentration",!resLeft(c,r)]]:[];
}
function majestyCast(c,how){
 const sp={n:"Command"};
 if(!majestyCastOptions(c,sp).some(x=>x[0]===how&&!x[3]))return null;
 if(how==="majestyStart"){
  c.used=c.used||{};const key=subAblKey("Mantle of Majesty");c.used[key]=(+c.used[key]||0)+1;
  const ended=concStart(c,"Mantle of Majesty");c.conc.feature="majesty";
  return [ended,"Mantle of Majesty active for 1 minute; end concentration at expiry or when broken."].filter(Boolean).join(" ");
 }
 return "Mantle of Majesty: bonus-action Command, no slot; confirm this turn's Bonus Action.";
}
function castOpts(c, sp, ed = edOf(c)) {
  if (spellCastBlocked(c, sp, ed)) return [];
  const R = pcResources(c), opts = [];
  if (sp.l === 0) { opts.push(["free", "Cantrip", "no slot needed"]); return opts; }
  const sources = spellPreparationSources(c, sp.n, ed);
  const grants = freeSpellResources(c, sp, ed, R).map(r => [r.key, r.name, r.max === Infinity ? "no slot needed" : `${resLeft(c, r)} left per ${r.recharge === "short" ? "short or long" : "long"} rest`, !resLeft(c, r)]);
  const fragment=demonFragmentCast(c,sp,ed);
  if(fragment){
    const available=resLeft(c,R.find(r=>r.key==="soulFragments"));
    grants.push(["soulFragment",fragment.feature,`Spend ${fragment.cost} soul fragment${fragment.cost>1?"s":""} · ${available} left`,available<fragment.cost]);
  }
  const manual = c.prepared?.some(p => !p.bookGrant && p.n === sp.n && p.ed === ed);
  if(wizardBookActive(c)&&isWizardBookSpell(c,sp)&&!wizardBookOtherClass(c,sp,ed)&&!manual&&!sources.length){return wizardBookContains(c,sp.n)&&sp.ri?[["ritual","As a spellbook ritual","no slot, 10 min longer"]]:[];}
  if(sources.length&&sources.every(g=>g.feature==="Mystic Arcanum")&&!manual)return grants;
  const featOnly = sources.length > 0 && sources.every(g => g.kind === "feat") && !manual;
  const ritual = ["ritual", "As a ritual", "no slot, 10 min longer"];
  if (!manual && sources.length && sources.every(g => g.innate || (g.slotClass && !pcCastClasses(c).some(k => k.cls === g.slotClass)))) {
    if (sp.ri && sources.some(g => g.ritualOnly)) grants.push(ritual);
    return grants;
  }
  R.filter(r => /^slot\d$/.test(r.key) && +r.key.slice(4) >= sp.l).forEach(r => { const L = +r.key.slice(4), left = resLeft(c, r); opts.push([r.key, ordinal(L), `${left} left`, !left]); });
  const pact = R.find(r => r.key === "pact"); if (pact) { const L = +(pact.name.match(/level (\d)/) || [])[1]; if (L >= sp.l) opts.push(["pact", `Pact slot (${ordinal(L)})`, `${resLeft(c, pact)} left`, !resLeft(c, pact)]); }
  opts.push(...grants,...majestyCastOptions(c,sp,ed));
  if (sp.ri && (!featOnly || ed === "2024" || sources.some(g => g.ritualOnly))) opts.push(ritual);
  if (!featOnly) opts.push(["free", "Without a slot", "a feature or item"]);
  return opts;
}
function demonFragmentCast(c,sp,ed=edOf(c)){
  if(ed!==edOf(c))return null;
  const level=demonHunterOwner(c)?.level||0;
  if(level>=3&&["Feather Fall","Jump"].includes(sp.n))return {feature:"Double Jump",cost:1,timing:"Use the spell’s normal casting time."};
  if(level>=11&&sp.n==="Counterspell")return {feature:"Disrupt",cost:2,timing:"Confirm the spell’s reaction trigger."};
  if(level>=11&&sp.n==="Throw Glaive")return {feature:"Warglaive Mastery",cost:1,timing:"Cast as a bonus action."};
  return null;
}
function castSlotLevel(c, sp, how, ed = edOf(c)) {
  if (/^slot\d$/.test(how)) return +how.slice(4);
  if (how === "pact") { const r = pcResources(c).find(x => x.key === "pact"); return r ? +(r.name.match(/level (\d)/) || [])[1] || sp.l : sp.l; }
  return spellPreparationSources(c, sp.n, ed).find(g => g.free === how)?.castLevel || sp.l;
}
// Only apply the revised Life Domain modifier to parsed immediate healing.
function revisedLifeHealing(c,P,slot,how){
 const level=edOf(c)==="2024"?characterSubclassLevel(c,"Cleric","Life Domain"):0;
 if(!level||!P.heal||P.manual||!P.dice)return {bonus:0,maximum:false,blessed:0};
 const paid=(/^slot[1-9]$/.test(how)||how==="pact")&&slot>=1&&slot<=9;
 return {bonus:paid?2+slot:0,maximum:level>=17,blessed:paid&&level>=6?2+slot:0};
}
function rollLifeHealing(expr,life){
 const m=String(expr).match(/^(\d+)d(\d+)([+-]\d+)?$/);
 const rr=life.maximum&&m?{total:+m[1]*+m[2]+ +(m[3]||0),text:expr+" (maximum dice)"}:rollDice(expr);
 return {total:Math.max(0,rr.total+life.bonus),text:rr.text+(life.bonus?" + "+life.bonus+" (Disciple of Life)":"")};
}
function feySummonOption(c,sp,ed=edOf(c)){
  return ed===edOf(c)&&sp?.n==="Summon Fey"&&characterSubclassLevel(c,"Ranger","Fey Wanderer")>=11;
}
function summonSubclassCast(c,sp,ed){
  if(feySummonOption(c,sp,ed))return {feature:"Fey Reinforcements",control:"feyNoConcentration"};
  if(ed==="2024"&&sp?.n==="Summon Dragon"&&(draconicSorceryOwner(c)?.level||0)>=18)return {feature:"Dragon Companion",control:"dragonNoConcentration"};
  return null;
}
function feyTeleportOptions(c,sp,ed=edOf(c)){
  if(ed!==edOf(c)||sp?.n!=="Misty Step")return [];
  const out=[];
  if(characterSubclassLevel(c,"Ranger","Fey Wanderer")>=15)out.push("Misty Wanderer: optionally take a visible willing creature within 5 ft; choose a free space within 5 ft of your destination.");
  const l=ed==="2024"?characterSubclassLevel(c,"Warlock","Archfey Patron"):0;
  if(l>=3)out.push("Steps of the Fey: choose Refreshing Step (1d10 temporary HP to yourself or a visible creature within 10 ft) or Taunting Step (near departure, Wisdom save or disadvantage against others until your next turn)."+(l>=6?" You may instead use Disappearing Step (brief invisibility, ends on attack, damage or casting) or Dreadful Step (Wisdom save or 2d10 psychic within 5 ft of departure or arrival). Reaction casting after taking damage is available; confirm timing.":""));
  return out;
}
function castPreview(c, sp, how, ed = edOf(c)) {
  const P = spellTweak(c, sp, spellPlan(sp)), K = spellCaster(c, sp, how, ed), slot = castSlotLevel(c, sp, how, ed), up = Math.max(0, slot - sp.l);
  const spirit=summonSpiritDefinition(sp,ed);
  const subclassCast=summonSubclassCast(c,sp,ed);
  if(spirit&&!spellManualResolution(sp))return `At ${ordinal(slot)}: summon ${spirit.name}; resolve its stat block and attacks after casting${subclassCast?" · no material component; optional one-minute non-concentration cast":sp.co?" · needs concentration":""}.`;
  const count = P.count + (P.countPer ? up : 0), parts = [];
  if(["majestyStart","majestyRepeat"].includes(how))parts.push("Command as a Bonus Action; a creature Charmed by you automatically fails its save. Confirm timing and target.");
  if(arcaneWardCastEligible(c,sp,how,slot,ed))parts.push(arcaneWardExists(c)?"Restore up to "+2*slot+" Ward HP":"Optionally create an Arcane Ward ("+arcaneWardMax(c)+" HP)");
  if (spellManualResolution(sp) && sp.sv) parts.push(`${sp.sv.toUpperCase()} save DC ${K.dc}`);
  if (spellManualResolution(sp) && sp.at) parts.push(`Spell attack ${sgn(K.atk)}`);
  if (P.attack) parts.push(`Spell attack ${sgn(K.atk)}${K.innateSorcery?" with advantage":""}`); else if (P.save) parts.push(`${P.save.toUpperCase()} save against DC ${K.dc}`);
  if(how==="pactChainFamiliar"){
    parts.push("Pact of the Chain: cast as a Magic action; choose a permitted familiar form.");
    if(hasChoice(c,"Eldritch Invocations","investment"))parts.push("Investment of the Chain Master: "+(choiceOf(c,"Chain Master Movement")[0]||"choose Fly or Swim 40 feet")+"; familiar save DC "+K.dc+".");
  }
  if(["invocation:armor","invocation:vigor","invocation:ascend","invocation:leap","invocation:shadows"].includes(how))parts.push("Self only"+(how==="invocation:shadows"?"; confirm Dim Light or Darkness":""));
  if(how==="invocation:vigor"&&ed==="2024")parts.push("12 temporary HP (maximum roll)");
  if(how==="freeContactPatron"&&sp.n==="Contact Other Plane")parts.push("Contact your patron; automatically succeed on the spell’s saving throw.");
  if (P.dice) parts.push(`${P.heal ? "heals" : "deals"} ${spellDice(c, sp, P, slot, K)}${P.type && !P.heal ? " " + P.type.toLowerCase() : ""}${count > 1 ? ` × ${count}` : ""}`);
  const life=revisedLifeHealing(c,P,slot,how);
  if(life.bonus)parts.push("Disciple of Life +"+life.bonus+" HP on casting turn");
  if(life.maximum)parts.push("Supreme Healing: maximum healing dice");
  if(life.blessed)parts.push("Blessed Healer: regain "+life.blessed+" HP if another creature is healed");
  if (sp.l && up && (P.per || P.countPer)) parts.push(`upcast +${up} level${up === 1 ? "" : "s"}`);
  if (sp.rulesSummary) parts.push("Resolve the spell’s effects using its sourcebook");
  if (sp.manualRoll || sp.manualEffects) parts.push("Resolve all rolls and effects manually using the complete spell rules");
  if(sp.l===0&&invocationAffects(c,"spear",sp.n))parts.push(ed==="2024"?"Eldritch Spear: +"+30*clsLv(c,"Warlock")+" ft range":"Eldritch Spear: 300 ft range");
  if(sp.l===0&&invocationAffects(c,"repel",sp.n))parts.push(ed==="2024"?"Repelling Blast: push Large or smaller target up to 10 ft on hit":"Repelling Blast: push target up to 10 ft on hit");
  if(subclassCast)parts.push("No material component; optional one-minute non-concentration cast");
  else if (sp.co) parts.push(`needs concentration${c.conc ? ` (ends ${c.conc.spell})` : ""}`);
  parts.push(...feyTeleportOptions(c,sp,ed));
  if(ed==="2024"&&characterSubclassLevel(c,"Wizard","Abjurer")>=10&&["Counterspell","Dispel Magic"].includes(sp.n))parts.push("Spell Breaker: record whether this cast stopped a spell to retain or refund its slot. Dispel Magic can use a Bonus Action; add proficiency to its ability check.");
  return (sp.l ? `At ${ordinal(slot)}: ` : "") + (parts.join(" · ") || "No dice to roll.");
}
function expertDivinationHTML(c,sp,how,ed){
 const opts=expertDivinationOptions(c,sp,how,castSlotLevel(c,sp,how,ed),ed);
 return opts.length?`<label class="hint">Expert Divination: recover one lower-level expended slot <select id="expertDivinationSlot"><option value="">Do not recover</option>${opts.map(([id,label])=>`<option value="${esc(id)}">${esc(label)}</option>`).join("")}</select></label>`:"";
}
function castPick(how) {
  const c = ACTX.c, sp = ACTX.cast && spellOf(ACTX.cast.ed, ACTX.cast.name); if (!c || spellCastBlocked(c, sp, ACTX.cast.ed)) return;
  const f = $("#castSlot"); if (f) f.value = how;
  $$("#actModal [data-castlv]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.castlv === how)));
  const fx = $("#castFx"); if (fx) fx.textContent = castPreview(c, sp, how, ACTX.cast.ed);
  const expert=$("#expertDivinationChoice");if(expert)expert.innerHTML=expertDivinationHTML(c,sp,how,ACTX.cast.ed);
  const go = $("#actModal [data-castgo]"); if (go) go.disabled = false;
}
const ARMOR_CASTING_WARNING = "You can't cast spells while wearing armor or a shield you aren't trained with.";
function castDialog(c, ed, name, o = {}) {
  const reference = c.prepared?.find(p => p.bookGrant && p.ed === ed && p.n === name && p.reference);
  if (reference) {
    characterReference(name, `<p>Always prepared · ${esc(reference.sources.map(spellGrantLabel).join(" / "))}</p>
      <p>See the sourcebook for the spell rules.</p>`, document.activeElement);
    return;
  }
  const sp = spellOf(ed, name); if (!sp) { toast("That spell isn't in the spell list"); return; }
  ACTX.c = c; ACTX.cast = { ed, name };
  const subclassCast=summonSubclassCast(c,sp,ed);
  const components=subclassCast?String(sp.cp||"").replace(/M/g,""):[sp.cp,sp.m?`(${sp.m})`:""].filter(Boolean).join(" ");
  const stats = [["Casting time", sp.t], ["Range", sp.r], ["Components", components], ["Duration", `${sp.co ? "Concentration, " : ""}${sp.du || ""}`]].filter(([, v]) => v);
  const higher=summonHigherRules(sp,ed);
  const rules = `<div class="spell-rules"><p class="muted" style="margin:2px 0 8px">${sp.l ? ordinal(sp.l) : "Cantrip"} · ${esc(String(sp.s || "").toLowerCase())}${sp.ri ? " · ritual" : ""}</p>
    <div class="sp-stats">${stats.map(([k, v]) => `<div><span>${esc(k)}</span>${esc(v)}</div>`).join("")}</div>
    <div class="spell-desc">${spFormat(sp.d || "")}${higher ? `<p><b>At higher levels.</b> ${esc(higher)}</p>` : ""}${summonSpiritHTML(sp,ed)}</div></div>`;
  let cast = "";
  if (spellCastBlocked(c, sp, ed)) cast = '<p class="hint">This spell is reference only or not available to this character. Complete rules or DM approval are required before casting.</p><button class="btn" type="button" data-actclose>Close</button>';
  else if (o.view || c.armorUntrained) cast = `<p class="hint" style="margin:10px 0 0">${esc(c.armorUntrained ? ARMOR_CASTING_WARNING : "Save the character to cast this and track spell slots.")}</p><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Close</button></div>`;
  else {
    /* start on a real slot (or the cantrip); with none left, nothing is picked, so a free casting is always a choice */
    const opts = castOpts(c, sp, ed).filter(x=>o.featureOnly==="majesty"?x[0].startsWith("majesty"):true);
    const first = opts.find(x => !x[3] && x[0]===o.prefer)||opts.find(x => !x[3] && (sp.l === 0 || /^slot\d$|^pact$/.test(x[0])));
    cast = `<div class="cast-box"><div class="cast-h">${sp.l ? "Cast at level" : "Cast"}</div>
      ${sp.l ? `<div class="cast-lvs" role="group" aria-label="Cast at level">${opts.map(([v, l, sub, dis]) => `<button type="button" class="cast-lv" data-castlv="${esc(v)}" aria-pressed="${!!(first && first[0] === v)}" ${dis ? "disabled" : ""}><b>${esc(l)}</b><span>${esc(sub)}</span></button>`).join("")}</div>` : ""}
      ${subclassCast?`<label class="hint"><input type="checkbox" id="${subclassCast.control}"> ${subclassCast.feature}: cast without concentration (duration 1 minute)</label>`:""}
      ${arcaneWardLevel(c)&&!arcaneWardExists(c)&&String(sp.s).toLowerCase()==="abjuration"&&sp.l>0?`<label class="hint"><input type="checkbox" id="createArcaneWard" checked> Create Arcane Ward if this casting qualifies</label>`:""}
      <div id="expertDivinationChoice">${first?expertDivinationHTML(c,sp,first[0],ed):""}</div>
      <input type="hidden" id="castSlot" value="${first ? esc(first[0]) : ""}">
      <p id="castFx" class="cast-fx">${esc(first ? castPreview(c, sp, first[0], ed) : opts.some(x => !x[3]) ? "No slots left for this spell. Choose another way to cast." : "No cast available. Finish a rest to regain uses.")}</p></div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Close</button><button class="btn primary" type="button" data-castgo style="flex:0 0 auto" ${first ? "" : "disabled"}>✦ Cast</button></div>`;
  }
  const sources = spellPreparationSources(c, sp.n, ed);
  const limits = sources.filter(source=>source.restriction)
    .map(source=>`${source.name} grant: ${source.restriction}.`);
  const preparation = sources.length ? `<p class="hint">${grantedSpellStatus(sp.l, sources)} · ${esc(sources.map(spellGrantLabel).join(" / "))}</p>${limits.length?`<p class="hint">${esc(limits.join(" "))}</p>`:""}` : "";
  actDialog(`<h3 id="actTitle">${esc(sp.n)}</h3>${preparation}${rules}${cast}`);
  const m = $("#actBox"); if (m) m.classList.add("spell-box");
}
function castGo() {
  const c = ACTX.c;
  if (c.armorUntrained) { toast(ARMOR_CASTING_WARNING); return; }
  if (!ACTX.cast) return;
  const { ed, name } = ACTX.cast, sp = spellOf(ed, name);
  if (spellCastBlocked(c, sp, ed)) { toast("Complete spell rules or DM approval are required before casting."); return; }
  const how = $("#castSlot").value, P = spellTweak(c, sp, spellPlan(sp)), R = pcResources(c), K = spellCaster(c, sp, how, ed);
  if (!castOpts(c, sp, ed).some(o => o[0] === how && !o[3])) { toast("That cast is unavailable"); return; }
  c.used = c.used || {};
  let slot = castSlotLevel(c, sp, how, ed);
  if (/^slot\d$/.test(how)) { const r = R.find(x => x.key === how); if (!r || resLeft(c, r) < 1) { toast("No slot of that level left"); return; } c.used[how] = (+c.used[how] || 0) + 1; slot = +how.slice(4); }
  else if (how === "pact") { const r = R.find(x => x.key === "pact"); if (!r || resLeft(c, r) < 1) { toast("No pact slot left"); return; } c.used.pact = (+c.used.pact || 0) + 1; slot = +(r.name.match(/level (\d)/) || [])[1] || sp.l; }
  const grant = freeSpellResources(c, sp, ed, R).find(r => r.key === how);
  if (grant) {
    if (!resLeft(c, grant)) { toast("No free uses left until a rest"); return; }
    if (grant.max !== Infinity) c.used[how] = (+c.used[how] || 0) + 1;
  }
  const notes = [`${c.name} casts ${sp.n}${sp.l ? ` at level ${slot}` : ""}${how === "ritual" ? " as a ritual" : ""}.`];
  if(how==="soulFragment"){
    const fragment=demonFragmentCast(c,sp,ed);
    c.used.soulFragments=(+c.used.soulFragments||0)+fragment.cost;
    notes.push(fragment.feature+". "+fragment.timing);
  }
  if(how==="consultSpirits")notes.push("No Material components. "+(sp.n==="Clairvoyance"?"Place an invisible guardian spirit at the chosen location in place of the sensor.":"Consult your guardian spirits."));
  const recovered=expertDivinationRecover(c,sp,how,slot,$("#expertDivinationSlot")?.value,ed);if(recovered)notes.push(recovered);
  if(spellBreakerRecord(c,sp,how,ed))notes.push("Spell Breaker: resolve success or failure in Abilities before casting another spell."+ (sp.n==="Dispel Magic"?" Bonus Action is permitted; ability check bonus "+sgn(c.mods.int+c.prof)+".":""));
  if(["majestyStart","majestyRepeat"].includes(how)){const msg=majestyCast(c,how);if(!msg){toast("Mantle of Majesty is unavailable");return;}notes.push(msg,"A creature Charmed by you automatically fails its save; resolve the target and action timing manually.");}
  const wardNote=arcaneWardOnCast(c,sp,how,slot,$("#createArcaneWard")?.checked!==false,ed);if(wardNote)notes.push(wardNote);
  if(how==="pactChainFamiliar"){
    notes.push("Pact of the Chain: Magic action; choose a permitted familiar form and manage the familiar manually.");
    if(hasChoice(c,"Eldritch Invocations","investment"))notes.push("Investment of the Chain Master: "+(choiceOf(c,"Chain Master Movement")[0]||"choose Fly or Swim 40 feet")+"; familiar save DC "+K.dc+"; apply attacks, damage choices and resistance manually.");
  }
  if(["invocation:armor","invocation:vigor","invocation:ascend","invocation:leap","invocation:shadows"].includes(how))notes.push("Self only"+(how==="invocation:shadows"?"; confirm Dim Light or Darkness.":"."));
  if(how==="invocation:vigor"){const n=ed==="2024"?12:rollDice("1d4+4").total;giveTemp(c,n);notes.push("False Life: "+n+" temporary HP offered; higher existing temporary HP retained.");}
  if(how==="invocation:armor"){c.fx={...(c.fx||{}),mageArmor:true};pcACApply(c);notes.push("Mage Armor effect active if unarmored; end manually when the spell expires.");}
  if(how==="freeContactPatron"&&sp.n==="Contact Other Plane")notes.push("Contact your patron; the spell’s saving throw automatically succeeds.");
  const subclassCast=summonSubclassCast(c,sp,ed);
  if(subclassCast)notes.push(`${subclassCast.feature}: no material component required.`);
  if(subclassCast&&$("#"+subclassCast.control)?.checked)notes.push("Duration 1 minute without concentration; track expiry manually.");
  else if (sp.co) { const ended = concStart(c, sp.n); if (ended) notes.push(ended); notes.push(`Concentrating on ${sp.n}.`); }
  notes.push(...feyTeleportOptions(c,sp,ed));
  rollLog(c, { label: `Cast ${sp.n}`, total: sp.l ? `L${slot}` : "✦", note: how === "free" ? "no slot" : how === "ritual" ? "ritual" : "" });
  pcPersist();
  const dice = spellDice(c, sp, P, slot, K), count = P.count + (P.countPer ? Math.max(0, slot - sp.l) : 0), type = P.type ? ` ${P.type.toLowerCase()}` : "";
  const summoned = spellManualResolution(sp) ? "" : summonSpiritHTML(sp, ed, slot, K);
  if (summoned) {
    actDialog(`<h3 id="actTitle">${esc(sp.n)}</h3><p>${esc(notes.join(" "))}</p>${summoned}<button class="btn" type="button" data-actclose>Close</button>`);
    return;
  }
  if (spellManualResolution(sp)) {
    const manualDice = (sp.manualRoll || sp.manualEffects) ? [...new Set((sp.d + " " + sp.h).match(/\b[1-9]\d?d(?:4|6|8|10|12|20|100)\b/gi) || [])] : [];
    actDialog(`<h3 id="actTitle">${esc(sp.n)}</h3><p>${esc(notes.join(" "))}</p>
      ${sp.rulesSummary ? '<p class="hint">Resolve the remaining effects using the sourcebook.</p>' : '<p class="hint">The cast resource is recorded. Resolve attacks, saves, damage, healing, summon statistics and additional effects manually; optional dice buttons do not apply effects.</p>'}
      ${spDetail(sp, { edition: ed, actions: false })}
      ${manualDice.length ? `<div class="row" style="flex-wrap:wrap">${manualDice.map(expr => `<button class="btn sm" type="button" data-spell-dice="${esc(expr)}">Roll ${esc(expr)}</button>`).join("")}</div><p role="status" data-spell-roll></p>` : ""}
      <button class="btn" type="button" data-actclose>Close</button>`);
    return;
  }
  if (!dice) { if(feyTeleportOptions(c,sp,ed).length||how.startsWith("majesty")||wardNote||recovered||c.spellBreakerPending){actDialog(`<h3 id="actTitle">${esc(sp.n)}</h3><p>${esc(notes.join(" "))}</p><button class="btn" type="button" data-actclose>Close</button>`);return;} actClose(); toast(notes.join(" ")); return; }
  if (P.heal) { const life=revisedLifeHealing(c,P,slot,how),r=rollLifeHealing(dice,life); actResultDialog(c,{title:sp.n,msg:`${notes.join(" ")} Healing ${r.text}. Total ${r.total} HP.${life.blessed?" If you restore HP to another creature, regain "+life.blessed+" HP yourself (apply manually).":""}`,amount:r.total,kind:"heal"});return; }
  if (P.attack) {
    const lines = []; let tot = 0;
    for (let i = 0; i < count; i++) {
      const a = rollD20(c, `${sp.n}${count > 1 ? ` ${i + 1}` : ""} attack`, K.atk, "attack", K.ab, K.innateSorcery?{tags:["advantage (Innate Sorcery)"]}:{});
      if (a.fail) { lines.push(`attack ${i + 1}: fails`); continue; }
      const hit = rollDice(a.crit ? dice.replace(/^(\d+)d/, (m, n) => `${2 * n}d`) : dice);
      lines.push(`${count > 1 ? `${sp.n === "Eldritch Blast" ? "beam" : /dart/i.test(sp.d) ? "dart" : "ray"} ${i + 1}: ` : ""}attack ${a.total}${a.crit ? " (critical)" : a.fumble ? " (natural 1, misses)" : ""}, damage ${hit.total}`);
      if (!a.fumble) tot += hit.total;
    }
    actResultDialog(c, { title: sp.n, msg: `${notes.join(" ")} ${lines.join("; ")}. Apply the damage of the attacks that hit (total if all hit: ${tot}).${sp.manualEffects ? " " + sp.d : ""}`, amount: tot, kind: "damage" });
    return;
  }
  if (P.save) {
    const expr = count > 1 ? dice.replace(/^(\d+)d/, (m, n) => `${n * count}d`) : dice;
    actAoeDialog(c, { aoe: true, title: sp.n, expr, save: P.save, dc: K.dc, dtype: P.type || "", noneOnSave: !P.half, singleTarget: !P.area, note: sp.manualEffects ? sp.d : "", desc: `${notes.join(" ")} ${P.area ? "" : "Tick only the target. "}${P.half ? "Half damage on a successful save." : "No damage on a successful save."}${sp.manualEffects ? " " + sp.d : ""}` });
    return;
  }
  // automatic hits such as Magic Missile: every dart rolls
  const each = []; let tot = 0; for (let i = 0; i < count; i++) { const r = rollDice(dice); tot += r.total; each.push(r.total); }
  actResultDialog(c, { title: sp.n, msg: `${notes.join(" ")} ${count > 1 ? `${count} × ${dice}${type}: ${each.join(" + ")} = ${tot}` : `${dice}${type}: ${tot}`}. Split the darts between targets as you like.`, amount: tot, kind: "damage" });
}
