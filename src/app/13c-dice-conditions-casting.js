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
  }
  if (ed === "2024" && n) S.pen = -2 * n;
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
function rollD20(c, label, bonus, kind, ab, o = {}) {
  const S = rollState(c, kind, ab, o);
  if (ROLL.mode === "adv") S.adv.push("chosen"); if (ROLL.mode === "dis") S.dis.push("chosen");
  ROLL.mode = "normal";
  const mode = S.adv.length && !S.dis.length ? "adv" : S.dis.length && !S.adv.length ? "dis" : "normal";
  if (S.fail) { rollLog(c, { label, total: "Fail", note: `automatically fails (${S.fail})`, fail: true }); toast(`${label}: automatically fails (${S.fail})`); return { fail: true }; }
  const dice = mode === "normal" ? [d20()] : [d20(), d20()], keep = mode === "adv" ? Math.max(...dice) : mode === "dis" ? Math.min(...dice) : dice[0];
  const total = keep + bonus + S.pen, crit = keep >= (o.crit || 20), fumble = keep === 1;
  const why = [...S.adv.map(x => "adv: " + x), ...S.dis.map(x => "dis: " + x)].join(", ");
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
function pcDamaged(c, dmg, wasZero) {
  const notes = [];
  if (!dmg) return notes;
  c.death = c.death || { s: 0, f: 0 };
  if (wasZero && !c.death.dead) { c.death.f = Math.min(3, c.death.f + 1); c.death.stable = false; notes.push(`${c.name} takes a death save failure (${c.death.f}/3)`); if (c.death.f >= 3) { c.death.dead = true; notes.push(`${c.name} dies`); } }
  else if (+c.hpCur === 0) { c.conds = { ...(c.conds || {}), unconscious: true }; c.condAuto = true; c.death = { s: 0, f: 0 }; notes.push(`${c.name} drops to 0 hit points and falls unconscious`); if (c.conc) { notes.push(`concentration on ${c.conc.spell} ends`); delete c.conc; } }
  if (c.conc && +c.hpCur > 0) { const dc = Math.min(edOf(c) === "2024" ? 30 : 99, Math.max(10, Math.floor(dmg / 2))); c.concCheck = dc; notes.push(`concentration save needed (CON, DC ${dc})`); }
  return notes;
}
function pcHealed(c, wasZero) {
  if (wasZero && +c.hpCur > 0) { c.death = { s: 0, f: 0 }; if (c.condAuto && c.conds) { delete c.conds.unconscious; delete c.condAuto; } return [`${c.name} is back on their feet`]; }
  return [];
}
function deathSave(c) {
  c.death = c.death || { s: 0, f: 0 };
  const r = rollD20(c, "Death save", 0, "save", "", {}); if (r.fail) return;
  if (r.keep === 20) { c.hpCur = 1; pcHealed(c, true); toast(`Natural 20! ${c.name} regains 1 hit point.`); }
  else if (r.keep === 1) c.death.f = Math.min(3, c.death.f + 2);
  else if (r.total >= 10) c.death.s = Math.min(3, c.death.s + 1);
  else c.death.f = Math.min(3, c.death.f + 1);
  if (c.death.s >= 3) { c.death.stable = true; toast(`${c.name} is stable.`); }
  if (c.death.f >= 3) { c.death.dead = true; toast(`${c.name} has died.`); }
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
      : zero || D.s || D.f ? `<div class="dying"><b>${D.stable ? "Stable at 0 HP" : "Dying"}</b><span class="dsr">Successes ${dots("s", D.s)}</span><span class="dsr">Failures ${dots("f", D.f)}</span>${D.stable ? "" : `<button type="button" class="btn sm primary" data-deathsave>🎲 Death save</button><button type="button" class="btn sm" data-stabilize>Stabilize</button>`}</div>` : ""}
  </div>`;
}
/* ---- casting spells from the sheet: pick a slot, spend it, then roll what the spell does ---- */
const AB_WORD = { strength: "str", dexterity: "dex", constitution: "con", intelligence: "int", wisdom: "wis", charisma: "cha" };
function spellOf(ed, name) {
  spLoad();
  const local = SP.data[ed] || [];
  return local.find(x => x.n === name) || local.find(x => x.aliases?.includes(name))
    || Object.values(SP.data).flat().find(x => x.n === name) || null;
}
// what a spell does, read from its text: damage or healing dice, upcasting, cantrip growth, attack or save, area, number of rays or darts
function spellPlan(sp) {
  const d = String(sp.d || ""), h = String(sp.h || "") + " " + d, P = { heal: false, dice: "", flat: 0, type: sp.dt || "", per: "", count: 1, countPer: 0, save: "", half: false, attack: sp.at || "", area: false, mod: false };
  if (sp.rulesSummary || sp.manualRoll) return P;
  const heal = d.match(/regains?\s+(?:a number of\s+)?hit points equal to\s+(\d+d\d+)(\s*(?:\+|plus)\s*your spellcasting ability modifier)?/i);
  if (heal) { P.heal = true; P.dice = heal[1]; P.mod = !!heal[2]; }
  else {
    const dm = d.match(/(\d+d\d+)(?:\s*\+\s*(\d+))?\s+([A-Za-z]+)\s+damage/i);
    if (dm) { P.dice = dm[1]; P.flat = +(dm[2] || 0); if (!P.type) P.type = cap1(dm[3].toLowerCase()); }
  }
  const up = h.match(/(?:damage|healing)[^.]*?increases?\s+by\s+(\d+d\d+)\s+for each (?:spell )?slot level above/i); if (up) P.per = up[1];
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
  if (sp.n === "Eldritch Blast") { const L = totalLv(c); P.count = 1 + (L >= 5) + (L >= 11) + (L >= 17); P.cantripTiers = false; if (hasChoice(c, "Eldritch Invocations", "agonizing")) P.flat += c.mods.cha; }
  return P;
}
function spellDice(c, sp, P, slot) {
  if (!P.dice) return "";
  const [n, f] = P.dice.split("d").map(Number), lvl = totalLv(c), tier = P.cantripTiers ? 1 + (lvl >= 5) + (lvl >= 11) + (lvl >= 17) : 1;
  let count = n * tier, face = f;
  if (P.per && slot > sp.l) { const [pn, pf] = P.per.split("d").map(Number); if (pf === face) count += pn * (slot - sp.l); }
  const flat = P.flat + (P.heal && P.mod ? c.mods[spellCaster(c, sp).ab] : 0);
  return `${count}d${face}${flat ? sgn(flat) : ""}`;
}
function miCaster(c) {
  const list = miState(c).list || (miLists(c).length === 1 ? miLists(c)[0] : ""); if (!list) return null;
  const ab = ["Cleric", "Druid"].includes(list) ? "wis" : list === "Wizard" ? "int" : "cha";
  return { cls: `Magic Initiate (${list})`, ab, dc: 8 + c.prof + c.mods[ab], atk: c.prof + c.mods[ab] };
}
function spellCaster(c, sp) {
  const mi = (c.prepared || []).some(p => p.src === "Magic Initiate" && p.n === sp.n) ? miCaster(c) : null;
  const own = [...(c.spell ? [{ cls: c.spell.cls || c.cls, list: c.spell.list, ab: c.spell.ab, dc: c.spell.dc, atk: c.spell.atk }, ...(c.spell.others || [])] : [])];
  return own.find(x => (sp.c || []).includes(x.cls) || (x.list && (sp.c || []).includes(x.list))) || mi || own[0] || miCaster(c) || { cls: "", ab: "int", dc: 8 + c.prof, atk: c.prof };
}
/* The spell window: the full rules, then (on My Characters) "Cast at level" buttons and Cast. `o.view`: rules only (the
   Characters tab, where slots aren't tracked). The picked choice is kept in the hidden #castSlot that castGo reads. */
const BOOK_FREE_CASTS = { "Rune Strike": "freeRuneStrike", "Find Steed": "freeFindSteed" };
function castOpts(c, sp) {
  const R = pcResources(c), opts = [];
  if (sp.l === 0) { opts.push(["free", "Cantrip", "no slot needed"]); return opts; }
  R.filter(r => /^slot\d$/.test(r.key) && +r.key.slice(4) >= sp.l).forEach(r => { const L = +r.key.slice(4), left = resLeft(c, r); opts.push([r.key, ordinal(L), `${left} left`, !left]); });
  const pact = R.find(r => r.key === "pact"); if (pact) { const L = +(pact.name.match(/level (\d)/) || [])[1]; if (L >= sp.l) opts.push(["pact", `Pact slot (${ordinal(L)})`, `${resLeft(c, pact)} left`, !resLeft(c, pact)]); }
  const grant = R.find(r => r.key === BOOK_FREE_CASTS[sp.n]);
  if (grant) opts.push([grant.key, grant.name, `${resLeft(c, grant)} left per long rest`, !resLeft(c, grant)]);
  if (sp.ri) opts.push(["ritual", "As a ritual", "no slot, 10 min longer"]);
  opts.push(["free", "Without a slot", "a feature or item"]);
  return opts;
}
function castSlotLevel(c, sp, how) {
  if (/^slot\d$/.test(how)) return +how.slice(4);
  if (how === "pact") { const r = pcResources(c).find(x => x.key === "pact"); return r ? +(r.name.match(/level (\d)/) || [])[1] || sp.l : sp.l; }
  return sp.l;
}
function castPreview(c, sp, how) {
  const P = spellTweak(c, sp, spellPlan(sp)), K = spellCaster(c, sp), slot = castSlotLevel(c, sp, how), up = Math.max(0, slot - sp.l);
  const count = P.count + (P.countPer ? up : 0), parts = [];
  if (sp.manualRoll && sp.sv) parts.push(`${sp.sv.toUpperCase()} save DC ${K.dc}`);
  if (sp.manualRoll && sp.at) parts.push(`Spell attack ${sgn(K.atk)}`);
  if (P.attack) parts.push(`Spell attack ${sgn(K.atk)}`); else if (P.save) parts.push(`${P.save.toUpperCase()} save against DC ${K.dc}`);
  if (P.dice) parts.push(`${P.heal ? "heals" : "deals"} ${spellDice(c, sp, P, slot)}${P.type && !P.heal ? " " + P.type.toLowerCase() : ""}${count > 1 ? ` × ${count}` : ""}`);
  if (sp.l && up && (P.per || P.countPer)) parts.push(`upcast +${up} level${up === 1 ? "" : "s"}`);
  if (sp.rulesSummary) parts.push("Resolve the spell’s effects using its sourcebook");
  if (sp.manualEffects) parts.push("Use the spell description for additional effects");
  if (sp.co) parts.push(`needs concentration${c.conc ? ` (ends ${c.conc.spell})` : ""}`);
  return (sp.l ? `At ${ordinal(slot)}: ` : "") + (parts.join(" · ") || "No dice to roll.");
}
function castPick(how) {
  const c = ACTX.c, sp = ACTX.cast && spellOf(ACTX.cast.ed, ACTX.cast.name); if (!c || !sp) return;
  const f = $("#castSlot"); if (f) f.value = how;
  $$("#actModal [data-castlv]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.castlv === how)));
  const fx = $("#castFx"); if (fx) fx.textContent = castPreview(c, sp, how);
  const go = $("#actModal [data-castgo]"); if (go) go.disabled = false;
}
function castDialog(c, ed, name, o = {}) {
  const sp = spellOf(ed, name); if (!sp) { toast("That spell isn't in the spell list"); return; }
  ACTX.c = c; ACTX.cast = { ed, name };
  const stats = [["Casting time", sp.t], ["Range", sp.r], ["Components", [sp.cp, sp.m ? `(${sp.m})` : ""].filter(Boolean).join(" ")], ["Duration", `${sp.co ? "Concentration, " : ""}${sp.du || ""}`]].filter(([, v]) => v);
  const rules = `<div class="spell-rules"><p class="muted" style="margin:2px 0 8px">${sp.l ? ordinal(sp.l) : "Cantrip"} · ${esc(String(sp.s || "").toLowerCase())}${sp.ri ? " · ritual" : ""}</p>
    <div class="sp-stats">${stats.map(([k, v]) => `<div><span>${esc(k)}</span>${esc(v)}</div>`).join("")}</div>
    <div class="spell-desc">${spFormat(sp.d || "")}${sp.h ? `<p><b>At higher levels.</b> ${esc(sp.h)}</p>` : ""}</div></div>`;
  let cast = "";
  if (o.view) cast = `<p class="hint" style="margin:10px 0 0">Save the character to cast this and track spell slots.</p><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Close</button></div>`;
  else {
    /* start on a real slot (or the cantrip); with none left, nothing is picked, so a free casting is always a choice */
    const opts = castOpts(c, sp), first = opts.find(x => !x[3] && (sp.l === 0 || /^slot\d$|^pact$/.test(x[0])));
    cast = `<div class="cast-box"><div class="cast-h">${sp.l ? "Cast at level" : "Cast"}</div>
      ${sp.l ? `<div class="cast-lvs" role="group" aria-label="Cast at level">${opts.map(([v, l, sub, dis]) => `<button type="button" class="cast-lv" data-castlv="${v}" aria-pressed="${!!(first && first[0] === v)}" ${dis ? "disabled" : ""}><b>${esc(l)}</b><span>${esc(sub)}</span></button>`).join("")}</div>` : ""}
      <input type="hidden" id="castSlot" value="${first ? first[0] : ""}">
      <p id="castFx" class="cast-fx">${esc(first ? castPreview(c, sp, first[0]) : "No slots left for this spell. Take a rest, or cast it without a slot.")}</p></div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Close</button><button class="btn primary" type="button" data-castgo style="flex:0 0 auto" ${first ? "" : "disabled"}>✦ Cast</button></div>`;
  }
  actDialog(`<h3 id="actTitle">${esc(sp.n)}</h3>${rules}${cast}`);
  const m = $("#actBox"); if (m) m.classList.add("spell-box");
}
function castGo() {
  const c = ACTX.c, { ed, name } = ACTX.cast, sp = spellOf(ed, name), how = $("#castSlot").value, P = spellTweak(c, sp, spellPlan(sp)), R = pcResources(c), K = spellCaster(c, sp);
  c.used = c.used || {};
  let slot = sp.l;
  if (/^slot\d$/.test(how)) { const r = R.find(x => x.key === how); if (!r || resLeft(c, r) < 1) { toast("No slot of that level left"); return; } c.used[how] = (+c.used[how] || 0) + 1; slot = +how.slice(4); }
  else if (how === "pact") { const r = R.find(x => x.key === "pact"); if (!r || resLeft(c, r) < 1) { toast("No pact slot left"); return; } c.used.pact = (+c.used.pact || 0) + 1; slot = +(r.name.match(/level (\d)/) || [])[1] || sp.l; }
  const grant = R.find(r => r.key === how && BOOK_FREE_CASTS[sp.n] === how);
  if (grant) {
    if (!resLeft(c, grant)) { toast("No free uses left until a long rest"); return; }
    c.used[how] = (+c.used[how] || 0) + 1;
  }
  const notes = [`${c.name} casts ${sp.n}${sp.l ? ` at level ${slot}` : ""}${how === "ritual" ? " as a ritual" : ""}.`];
  if (sp.co) { const ended = concStart(c, sp.n); if (ended) notes.push(ended); notes.push(`Concentrating on ${sp.n}.`); }
  rollLog(c, { label: `Cast ${sp.n}`, total: sp.l ? `L${slot}` : "✦", note: how === "free" ? "no slot" : how === "ritual" ? "ritual" : "" });
  pcPersist();
  const dice = spellDice(c, sp, P, slot), count = P.count + (P.countPer ? Math.max(0, slot - sp.l) : 0), type = P.type ? ` ${P.type.toLowerCase()}` : "";
  const summoned = summonSpiritHTML(sp, ed, slot, K);
  if (summoned) {
    actDialog(`<h3 id="actTitle">${esc(sp.n)}</h3><p>${esc(notes.join(" "))}</p>${summoned}<button class="btn" type="button" data-actclose>Close</button>`);
    return;
  }
  if (sp.rulesSummary || sp.manualRoll) {
    const manualDice = sp.manualRoll ? [...new Set((sp.d + " " + sp.h).match(/\b[1-9]\d?d(?:4|6|8|10|12|20|100)\b/gi) || [])] : [];
    actDialog(`<h3 id="actTitle">${esc(sp.n)}</h3><p>${esc(notes.join(" "))}</p>
      ${sp.rulesSummary ? '<p class="hint">Resolve the remaining effects using the sourcebook.</p>' : ""}
      ${spDetail(sp, { edition: ed, actions: false })}
      ${manualDice.length ? `<div class="row" style="flex-wrap:wrap">${manualDice.map(expr => `<button class="btn sm" type="button" data-spell-dice="${esc(expr)}">Roll ${esc(expr)}</button>`).join("")}</div><p role="status" data-spell-roll></p>` : ""}
      <button class="btn" type="button" data-actclose>Close</button>`);
    return;
  }
  if (!dice) { actClose(); toast(notes.join(" ")); return; }
  if (P.heal) { const r = rollDice(dice); actResultDialog(c, { title: sp.n, msg: `${notes.join(" ")} Healing ${r.text}.${sp.manualEffects ? " " + sp.d : ""}`, amount: r.total, kind: "heal" }); return; }
  if (P.attack) {
    const lines = []; let tot = 0;
    for (let i = 0; i < count; i++) {
      const a = rollD20(c, `${sp.n}${count > 1 ? ` ${i + 1}` : ""} attack`, K.atk, "attack", K.ab);
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
