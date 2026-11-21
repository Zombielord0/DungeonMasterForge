/* 07e-generator.js: generateCharacter (the whole sheet from a few choices, with a seeded RNG), and the quick forge (the Characters tab's forge form; the sheet itself is rosterHTML in 13e). */

const PC_TRAITS = ["I quote old proverbs for every occasion.", "I'm always polite, even to my enemies.", "I can't sit still for long.", "I ask far too many questions.", "I name my weapons and talk to them.", "I keep a journal of every meal I eat.", "I hum when I'm nervous, and I'm often nervous.", "I trust animals more than people.", "I laugh loudest when things are worst.", "I count my coins twice."];
const mod = s => Math.floor((s - 10) / 2);
const sgn = n => (n >= 0 ? "+" : "") + n;
const diceAvg = d => d / 2 + 1;

function generateCharacter(o) {
  const r = makeRng("pc", o.seed);
  const ed = o.ed === "2024" ? "2024" : "2014";
  // random picks stay with the built-in rules; homebrew is chosen on purpose
  const race = o.race || r.pick(raceList(ed).filter(x => !PC_RACES[ed][x].hb && !PC_RACES[ed][x].src)), cls = o.cls || r.pick(builtInClasses()), bg = o.bg || r.pick(bgList(ed).filter(x => !HB_BG[x]));
  const lv = clamp(o.level, 1, 20), C = classData(ed, cls), RB = PC_RACES[ed][race];
  // a separate rng for the subrace, so older characters re-level to the same results
  let sub = o.sub === "none" ? null : o.sub || (race === "Dragonborn" && o.ancestry) || null;
  if (o.sub !== "none" && !sub && RB && RB.subs) sub = makeRng("sub", o.seed).pick(o.campaign ? campaignLineageChoices(ed, race) : Object.keys(RB.subs));
  if (sub && !(RB && RB.subs && RB.subs[sub])) sub = null;
  const R = raceInfo(ed, race, sub);
  const anc = race === "Dragonborn" ? (sub || o.ancestry || r.pick(Object.keys(DRAGON_ANCESTRY))) : null;
  if ((ed === "2024" || R.flexible) && o.bonus === "fixed") o = { ...o, bonus: "flex" };
  // Subclass: a random forge picks one (own rng, so other rolls stay the same); custom builds and level-ups ask the player.
  const subLv = subclassLevel(ed, cls);
  let subclass = o.subclass && o.subclass !== "none" ? String(o.subclass) : null;
  if (!subclass && o.subclass !== "none" && !o.custom && lv >= subLv) { const L = subclassList(ed, cls).filter(x => !x[2]); if (L.length) subclass = makeRng("subclass", o.seed).pick(L)[0]; }
  // other classes taken by multiclassing, and the total character level
  const MC = (o.multi || []).filter(x => x && classData(ed, x.cls) && x.cls !== cls && +x.lv > 0).map(x => ({ cls: x.cls, lv: +x.lv, subclass: x.subclass || null })), TL = lv + MC.reduce((t, x) => t + x.lv, 0);
  // scores
  let rolls = null, base;
  const order = [...C.pri, ...["con", "dex", "wis", "str", "int", "cha"].filter(a => !C.pri.includes(a))];
  if (o.custom && o.custom.base) base = { ...o.custom.base };
  else if (o.base && AB.every(a => +o.base[a])) { base = { ...o.base }; rolls = o.rolls || null; }
  else {
    let pool;
    if (o.method === "roll") {
      rolls = Array.from({ length: 6 }, () => { const d = Array.from({ length: 4 }, () => r.int(1, 6)).sort((a, b) => b - a); return { d, t: d[0] + d[1] + d[2] }; });
      pool = rolls.map(x => x.t).sort((a, b) => b - a);
    } else pool = [15, 14, 13, 12, 10, 8];
    base = {}; order.forEach((a, i) => base[a] = pool[i]);
  }
  const sc = { ...base };
  // 2024: the background raises three abilities; characters made before this keep their old bonus (bgAsiLegacy)
  if (ed === "2024" && !o.bgAsiLegacy) bgAbilityBonus(sc, ed, bg, order, o.custom);
  else if (o.custom && o.custom.plus2) { sc[o.custom.plus2] += 2; if (o.custom.plus1) sc[o.custom.plus1] += 1; }
  else if (o.bonus === "flex") { sc[C.pri[0]] += 2; sc[C.pri[1]] += 1; }
  else {
    Object.entries(R.asi).forEach(([a, v]) => sc[a] += v);
    if (R.plus1) order.filter(a => R.plus1Any || a !== "cha").slice(0, R.plus1).forEach(a => sc[a] += 1);
  }
  const asiLv = (C.asi || [4, 8, 12, 16, 19]).filter(x => x <= lv);
  // Ability Score Improvements from other classes' levels go to that class's main abilities
  MC.forEach(x => { const C2 = classData(ed, x.cls); (C2.asi || [4, 8, 12, 16, 19]).filter(L => L <= x.lv).forEach(() => { let pts = 2; for (const a of C2.pri) { while (pts > 0 && sc[a] < 20) { sc[a]++; pts--; } if (!pts) break; } }); });
  // Levels where the player chose (o.asiPicks[level] = { str: 2 } or { feat: "Alert" }) use that choice; the rest go to the main abilities.
  const asiPicks = o.asiPicks || {}, asiAuto = [];
  for (const L of asiLv) {
    const pk = asiPicks[L];
    if (pk) { AB.forEach(a => { if (pk[a]) sc[a] = Math.min(pk.max || 20, sc[a] + pk[a]); }); continue; }
    asiAuto.push(L); let pts = 2;
    for (const a of C.pri) { while (pts > 0 && sc[a] < 20) { sc[a]++; pts--; } if (!pts) break; }
  }
  // feats added outside level-ups (Feats tab / sheet): { n: name, l: level added, a: ability raised by 1, max }
  const bonusFeats = (o.bonusFeats || []).filter(b => b && b.n);
  // 2024: the background's Origin feat
  const BGI = bgInfo(ed, bg), bgFeat = ed === "2024" && BGI && BGI.feat ? BGI.feat : "";
  const bgGold50 = ed === "2024" && BGI && !BGI.hb && Boolean(o.bgGold50 || o.custom?.bgGold50);
  bonusFeats.forEach(b => { if (AB.includes(b.a)) sc[b.a] = Math.max(sc[b.a], Math.min(b.max || 20, sc[b.a] + 1)); });
  // homebrew effects (see hbEffects); ability scores first, since everything else reads them
  const fx = hbEffects(ed, race, sub, bg, cls, subclass, lv, [...asiLv.map(L => asiPicks[L]).filter(pk => pk && pk.feat).map(pk => pk.feat), ...bonusFeats.map(b => b.n), ...(bgFeat ? [bgFeat] : [])]);
  const fxSum = t => fx.filter(e => e.t === t).reduce((n, e) => n + e.v, 0);
  fx.filter(e => e.t === "ab").forEach(e => { sc[e.a] = e.v >= 0 ? Math.max(sc[e.a], Math.min(e.max || 20, sc[e.a] + e.v)) : Math.max(1, sc[e.a] + e.v); });
  const m = {}; AB.forEach(a => m[a] = mod(sc[a]));
  const prof = 2 + Math.floor((TL - 1) / 4);
  // skills
  const profSk = new Set([...bgSkills(ed, bg), ...(R.skills || [])]);
  const pickSkills = (list, n) => {
    const opts = r.shuffle(list.filter(s => !profSk.has(s))).sort((a, b) => m[SKILLS[b]] - m[SKILLS[a]]);
    // mostly take skills that fit the best abilities, with a little randomness
    const chosen = []; while (chosen.length < n && opts.length) { const i = r.chance(.7) ? 0 : r.int(0, opts.length - 1); chosen.push(opts.splice(i, 1)[0]); }
    chosen.forEach(s => profSk.add(s));
  };
  if (o.custom && o.custom.skills) o.custom.skills.forEach(s => profSk.add(s));
  else if (o.keepSkills) o.keepSkills.forEach(s => { if (SKILLS[s]) profSk.add(s); });
  else { pickSkills(C.skills[0], C.skills[1]); if (R.extraSkills) pickSkills(ALL_SKILLS, R.extraSkills); }
  // Skilled (an Origin feat): three more skills, picked with their own dice so other rolls stay the same
  const skilled = !bgFeat || bgFeat !== "Skilled" ? [] : o.keepSkilled ? o.keepSkilled.filter(x => SKILLS[x]) : makeRng("skilled", o.seed).shuffle(ALL_SKILLS.filter(x => !profSk.has(x))).sort((a, b) => m[SKILLS[b]] - m[SKILLS[a]]).slice(0, 3);
  skilled.forEach(x => profSk.add(x));
  const mcSkills = o.keepMcSkills || MC.filter(x => ["Bard", "Ranger", "Rogue"].includes(baseClassOf(x.cls))).flatMap(x => makeRng("mc" + x.cls, o.seed).shuffle(classData(ed, x.cls).skills[0].filter(k => !profSk.has(k))).sort((a, b) => m[SKILLS[b]] - m[SKILLS[a]]).slice(0, 1));
  mcSkills.forEach(k => { if (SKILLS[k]) profSk.add(k); });
  const expert = new Set();
  // expertise: keep what the character already has, and pick more only when a new level grants it
  (o.keepExpert || []).forEach(s => { if (profSk.has(s)) expert.add(s); });
  let wantX = 0;
  [...(C.expertise || []).map(([l, n]) => [l, n, lv]), ...MC.flatMap(x => (classData(ed, x.cls).expertise || []).map(([l, n]) => [l, n, x.lv]))].forEach(([l, n, have]) => { if (have >= l) { wantX += n; const need = wantX - expert.size; if (need > 0) r.shuffle([...profSk].filter(s => !expert.has(s))).sort((a, b) => m[SKILLS[b]] - m[SKILLS[a]]).slice(0, need).forEach(s => expert.add(s)); } });
  if (expert.size > wantX) [...expert].slice(wantX).forEach(s => expert.delete(s));
  const expertOrder = [...expert];
  fx.forEach(e => { if (fxSkill(e.t)) profSk.add(e.a); if (e.t === "exp") expert.add(e.a); });
  const jack = cls === "Bard" && lv >= 2;
  const skillVals = ALL_SKILLS.map(s => {
    const p = profSk.has(s), x = expert.has(s);
    return { s, ab: SKILLS[s], p, x, v: m[SKILLS[s]] + (x ? prof * 2 : p ? prof : jack ? Math.floor(prof / 2) : 0) };
  });
  // combat
  const conBonus = m.con + (C.hpBonus || 0);
  const featsTaken = [...asiLv.map(L => asiPicks[L]).filter(pk => pk && pk.feat), ...bonusFeats.map(b => ({ feat: b.n, ...(b.a ? { [b.a]: 1 } : {}) })), ...(bgFeat ? [{ feat: bgFeat }] : [])];
  const hasFeat = n => featsTaken.some(pk => pk.feat === n);
  let hp = Math.max(1, C.hd + conBonus) + (lv - 1) * Math.max(1, diceAvg(C.hd) + conBonus) + MC.reduce((t, x) => t + x.lv * Math.max(1, diceAvg(classData(ed, x.cls).hd) + conBonus), 0) + (R.hpLv || 0) * TL + (hasFeat("Tough") ? 2 * TL : 0) + (hasFeat("Boon of Fortitude") ? 40 : 0) + fxSum("hp") + fxSum("hpLv") * TL;
  const saves = [...C.saves]; featsTaken.filter(pk => pk.feat === "Resilient").forEach(pk => { const a = AB.find(x => pk[x]); if (a && !saves.includes(a)) saves.push(a); });
  fx.forEach(e => { if (e.t === "save" && !saves.includes(e.a)) saves.push(e.a); });
  // homebrew AC bonuses are kept apart (hbAc) so the equipment-based AC on My Characters can add them too
  let [ac, acSrc] = C.ac(m);
  const hbAc = fxSum("ac"), hbAcTxt = fx.filter(e => e.t === "ac").map(e => ` ${e.v >= 0 ? "+" : "−"} ${Math.abs(e.v)} ${e.src}`).join("");
  const atkBonus = fxSum("atk"), initBonus = (hasFeat("Alert") ? (ed === "2024" ? prof : 5) : 0) + fxSum("init");
  const w = C.wpn, wm = cls === "Monk" ? Math.max(m.str, m.dex) : m[w[2]];
  const attacks = [{ name: w[0], hit: wm + prof + atkBonus, dmg: `${w[1]}${wm ? sgn(wm) : ""}` }];
  if (cls === "Monk") { const md = lv >= 17 ? "1d10" : lv >= 11 ? "1d8" : lv >= 5 ? "1d6" : "1d4"; attacks.push({ name: "Unarmed strike", hit: wm + prof + atkBonus, dmg: md + sgn(wm) }); }
  // spells
  let spell = null;
  const CAST = castOf(cls, subclass);
  if (CAST) {
    const [kind, sa] = CAST; let slots = [], note = "";
    if (kind === "full") slots = FULL_SLOTS[lv];
    else if (kind === "third") slots = thirdSlots(lv);
    else if (kind === "artificer") slots = ARTIFICER_SLOTS[lv];
    else if (kind === "half") slots = lv >= 2 || ed === "2024" ? FULL_SLOTS[Math.ceil(lv / 2)] : []; // 2024 half casters get Spellcasting at level 1
    else { const n = lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 2 ? 2 : 1, sl = Math.min(5, Math.ceil(lv / 2)); note = `${n} pact slot${n > 1 ? "s" : ""} of level ${sl}, regained on a short rest`; }
    const max = kind === "pact" ? Math.min(5, Math.ceil(lv / 2)) : Math.max(1, slots.length);
    const sb = fxSum("spell");
    spell = { ab: sa, dc: 8 + prof + m[sa] + sb, atk: prof + m[sa] + sb, bonus: sb, slots, note, max, cantrips: kind !== "half", ...(subCaster(cls, subclass) ? { list: castListOf(cls, subclass) } : {}) };
  }
  const mcCasters = MC.filter(x => castOf(x.cls, x.subclass));
  if (mcCasters.length) {
    const sb = fxSum("spell"), all = [...(CAST ? [{ cls, lv, subclass }] : []), ...mcCasters], slotted = all.filter(x => castOf(x.cls, x.subclass)[0] !== "pact");
    const cl = slotted.reduce((t, x) => t + casterLv(ed, x.cls, x.lv, x.subclass), 0);
    const own = x => { const k = castOf(x.cls, x.subclass)[0]; return k === "full" ? FULL_SLOTS[x.lv] : k === "third" ? thirdSlots(x.lv) : k === "artificer" ? ARTIFICER_SLOTS[x.lv] : (k === "half" && (x.lv >= 2 || ed === "2024")) ? FULL_SLOTS[Math.ceil(x.lv / 2)] : []; };
    const slots = slotted.length >= 2 ? (FULL_SLOTS[Math.max(0, Math.min(20, cl))] || []) : slotted.length === 1 ? own(slotted[0]) : [];
    const lock = all.find(x => x.cls === "Warlock"), P = lock ? pactSlots(lock.lv) : null;
    const mk = x => { const sa = castOf(x.cls, x.subclass)[1]; return { cls: x.cls, ...(subCaster(x.cls, x.subclass) ? { list: castListOf(x.cls, x.subclass) } : {}), ab: sa, dc: 8 + prof + m[sa] + sb, atk: prof + m[sa] + sb }; };
    const head = spell ? { ...spell } : { ...mk(mcCasters[0]), bonus: sb, cantrips: castOf(mcCasters[0].cls, mcCasters[0].subclass)[0] !== "half", max: 1 };
    head.slots = slots; head.note = slots.length ? "" : P ? `${P.n} pact slot${P.n > 1 ? "s" : ""} of level ${P.lvl}, regained on a short rest` : head.note || "";
    head.pact = P && slots.length ? P : null;
    head.max = Math.max(head.max || 1, slots.length, P ? P.lvl : 0);
    head.cls = spell ? cls : mcCasters[0].cls;
    head.others = all.filter(x => x.cls !== head.cls).map(mk);
    spell = head;
  }
  // features
  const feats = [];
  Object.entries(C.f).forEach(([l, list]) => { if (+l <= lv) list.forEach(f => feats.push({ l: +l, f })); });
  if (lv >= subLv) feats.push({ l: subLv, f: subclass ? `Subclass: ${subclass}` : "Subclass: not chosen yet" });
  const hbSub = subclass && subclassEntry(ed, cls, subclass);
  if (hbSub) (hbSub.features || []).filter(f => f.n && +f.l <= lv).forEach(f => feats.push({ l: +f.l, f: f.n, ...(hbSub.book ? { bookSub: true } : {}) }));
  else if (subclass) feats.push(...subFeatList(ed, subclass, lv));
  const SB = subBonuses(ed, subclass, lv, m, prof);
  hp += SB.hp; subAddSaves(saves, SB); if (SB.ac) [ac, acSrc] = SB.ac;
  ac += hbAc; acSrc += hbAcTxt;
  skillVals.forEach(s => s.v += athleteBonus(SB, s, prof));
  if (HB_BG[bg] && HB_DESC[`${bg} background`]) feats.push({ l: 1, f: `${bg} background` });
  if (BGI && !HB_BG[bg]) feats.push({ l: 1, f: `Background: ${bg}`, bgInfo: true });
  if (ed === "2014" && BGI && BGI.feature) feats.push({ l: 1, f: BGI.feature[0], bgFeature: true });
  if (bgFeat) feats.push({ l: 1, f: `Feat: ${bgFeat}`, bgFeat: true, note: BGI.fnote || "" });
  const RL = raceLevelFeats(ed, race, R.traits, TL); feats.push(...RL.feats);
  // features of added classes, and their subclasses
  MC.forEach(x => {
    const C2 = classData(ed, x.cls); Object.entries(C2.f).forEach(([l, L]) => { if (+l <= x.lv) L.forEach(f => feats.push({ l: +l, f, mc: x.cls })); });
    const sl2 = subclassLevel(ed, x.cls);
    if (x.lv < sl2) return;
    const label = x.subclass ? `Subclass: ${x.subclass}` : `Subclass: not chosen yet (${x.cls})`;
    feats.push({ l: sl2, f: label, mc: x.cls });
    if (!x.subclass) return;
    const entry = subclassEntry(ed, x.cls, x.subclass);
    const features = entry ? (entry.features || []).filter(f => f.n && +f.l <= x.lv).map(f => ({ l: +f.l, f: f.n })) : subFeatList(ed, x.subclass, x.lv);
    features.forEach(sf => feats.push({ l: sf.l, f: sf.f, mc: x.cls, mcsub: x.subclass }));
  });
  bonusFeats.forEach(b => feats.push({ l: +b.l || 1, f: `Feat: ${b.n}${b.a ? ` (+1 ${AB_NAME[b.a]})` : ""}`, bonus: true }));
  if (asiAuto.length) feats.push({ l: asiAuto[0], f: `Ability Score Improvement ×${asiAuto.length} (applied)` });
  asiLv.filter(L => asiPicks[L]).forEach(L => { const pk = asiPicks[L]; feats.push({ l: L, f: pk.feat ? `Feat: ${pk.feat}${AB.some(a => pk[a]) ? ` (${AB.filter(a => pk[a]).map(a => `+${pk[a]} ${AB_NAME[a]}`).join(", ")})` : ""}` : `Ability Score Improvement: ${AB.filter(a => pk[a]).map(a => `+${pk[a]} ${AB_NAME[a]}`).join(", ")}` }); });
  feats.sort((a, b) => a.l - b.l);
  const extras = [];
  if (cls === "Rogue") extras.push(`Sneak Attack ${Math.ceil(lv / 2)}d6`);
  if (cls === "Barbarian") extras.push(`Rages per day: ${lv >= 20 ? "unlimited" : lv >= 17 ? 6 : lv >= 12 ? 5 : lv >= 6 ? 4 : lv >= 3 ? 3 : 2}, rage damage +${lv >= 16 ? 4 : lv >= 9 ? 3 : 2}`);
  if (cls === "Bard") extras.push(`Bardic Inspiration d${lv >= 15 ? 12 : lv >= 10 ? 10 : lv >= 5 ? 8 : 6}, ${Math.max(1, m.cha)}× per ${lv >= 5 ? "short" : "long"} rest`);
  if (cls === "Monk" && lv >= 2) extras.push(`Ki points: ${lv}`);
  if (cls === "Paladin") extras.push(`Lay on Hands pool: ${lv * 5} HP`);
  if (cls === "Sorcerer" && lv >= 2) extras.push(`Sorcery points: ${lv}`);
  if (anc) {
    const A = DRAGON_ANCESTRY[anc];
    if (ed === "2024") extras.push(`Breath Weapon (${anc.toLowerCase()} dragon): replaces one attack; 15 ft cone or 30 ft line of ${A.type}, ${lv >= 17 ? "4d10" : lv >= 11 ? "3d10" : lv >= 5 ? "2d10" : "1d10"} ${A.type} damage, DEX save DC ${8 + prof + m.con}, ${prof} uses per long rest`);
    else extras.push(`Breath Weapon (${anc.toLowerCase()} dragon): ${A.shape} of ${A.type}, ${lv >= 16 ? "5d6" : lv >= 11 ? "4d6" : lv >= 6 ? "3d6" : "2d6"} ${A.type} damage, ${A.save} save DC ${8 + prof + m.con}, once per short or long rest`);
  }
  const gender = o.gender === "male" || o.gender === "female" ? o.gender : makeRng("gender", o.seed).pick(["male", "female"]);
  const pcName = o.name || fullName(r, gender);
  const hk = hookBuild(r.pick(PC_HOOKS), hookCtx(r, pcName.split(" ")[0]));
  return {
    seed: o.seed, method: o.method, bonus: o.bonus, name: pcName, gender, race, ed, sub, ancestry: anc, subclass, custom: !!o.custom, customData: o.custom || null, cls, bg, level: lv, align: (o.custom && o.custom.align) || r.pick(ALIGN), base, scores: sc, mods: m, rolls,
    prof, saves, skills: skillVals, hp, ac, acSrc, speed: R.speed + fxSum("speed") + SB.speed + (C.f && Object.entries(C.f).some(([l, L]) => +l <= lv && L.includes("Unarmored Movement")) ? unarmoredMove(lv) : 0) + (cls === "Barbarian" && lv >= 5 ? 10 : 0) + (hasFeat("Mobile") || hasFeat("Speedy") ? 10 : 0) + (hasFeat("Boon of Speed") ? 30 : 0),
    init: m.dex + initBonus + SB.init + (SB.athlete ? Math.ceil(prof / 2) : 0) + (jack && ed === "2014" ? Math.floor(prof / 2) : 0) /* 2014 Jack of All Trades counts on initiative, a Dexterity check */, initBonus, atkBonus, hbAc, hbSpeed: fxSum("speed"), hbSig: fx.length ? JSON.stringify(fx) : "",
    ...Object.fromEntries(["res", "imm", "vul", "cimm"].map(t => [t, [...new Set([...fx.filter(e => e.t === t).map(e => e.a), ...(t === "res" ? traitRes(R.traits, anc, ed) : [])])].sort()])),
    sadv: [...new Set([...traitSadv(R.traits), ...fx.filter(e => e.t === "sadv").map(e => e.a)])], passive: 10 + skillVals.find(s => s.s === "Perception").v, subHp: SB.hp, subSpd: SB.speed,
    attacks, spell, feats, extras, traits: R.traits.filter(t => !RL.hidden.has(t)), kit: [...C.kit, ...((BGI && BGI.gear && !bgGold50) ? BGI.gear : [])], startGold: bgGold50 ? 50 : (BGI && BGI.gp) || 0, bgGold50: bgGold50 || undefined, bgV: 2, skilled, expertOrder, multi: MC.length ? MC : undefined, totalLevel: TL, mcSkills, hdList: [C.hd, ...MC.map(x => classData(ed, x.cls).hd)], bgAsiLegacy: o.bgAsiLegacy || undefined, hd: C.hd,
    trait: r.pick(PC_TRAITS), ideal: r.pick(IDEALS), bond: r.pick(BONDS), flaw: r.pick(FLAWS), hook: hk.hook, hookDetail: hk.hookDetail
  };
}
// Characters saved before species level features existed: add the ones they have reached.
function raceLvUpgrade(c) {
  if (c.raceLv || !Array.isArray(c.traits) || !Array.isArray(c.feats)) return;
  const R = raceLevelFeats(edOf(c), c.race, c.traits, c.level || 1);
  R.feats.forEach(f => { if (!c.feats.some(x => x.f === f.f)) c.feats.push(f); });
  c.feats.sort((a, b) => a.l - b.l); c.traits = c.traits.filter(t => !R.hidden.has(t)); c.raceLv = 1;
}
// Damage resistances that built-in species traits give (Dragonborn's depends on their ancestry)
const TRAIT_RES = { "Dwarven Resilience": ["poison"], "Stout Resilience": ["poison"], "Hellish Resistance": ["fire"], "Celestial Resistance": ["necrotic", "radiant"],
  "Abyssal Legacy": ["poison"], "Chthonic Legacy": ["necrotic"], "Infernal Legacy": ["fire"] };
function traitRes(traits, ancestry, ed) {
  const out = new Set();
  (traits || []).forEach(t => {
    if (t === "Infernal Legacy" && ed !== "2024") return; // 2014: spells only; Hellish Resistance gives the fire resistance
    (TRAIT_RES[t] || []).forEach(x => out.add(x));
    if (t === "Damage Resistance" && ancestry && DRAGON_ANCESTRY[ancestry]) out.add(DRAGON_ANCESTRY[ancestry].type);
  });
  return [...out];
}
// Advantage on saving throws that built-in species traits give
const TRAIT_SADV = { "Fey Ancestry": ["charmed"], "Brave": ["frightened"], "Dwarven Resilience": ["poisoned"], "Stout Resilience": ["poisoned"],
  "Gnome Cunning": ["INT, WIS and CHA saves against magic"], "Gnomish Cunning": ["INT, WIS and CHA saves"] };
const traitSadv = traits => [...new Set((traits || []).flatMap(t => TRAIT_SADV[t] || []))];
const withTraitRes = c => {
  if (c && Array.isArray(c.traits)) {
    c.res = [...new Set([...(c.res || []), ...traitRes(c.traits, c.ancestry, edOf(c))])].sort();
    c.sadv = [...new Set([...(c.sadv || []), ...traitSadv(c.traits)])];
  }
  return c;
};
// Damage resistances, immunities and vulnerabilities from species traits and homebrew effects
const defList = c => [["Resistant", c.res], ["Immune", c.imm], ["Vulnerable", c.vul], ["Condition immunities", c.cimm], ["Advantage on", (c.sadv || []).map(x => / saves/.test(x) ? x.replace(" against ", " vs ") : `saves vs ${x}`)]].filter(([, l]) => l && l.length);
const defHTML = c => { const L = defList(c); return L.length ? `<div class="chips" style="margin:8px 0 0">${L.map(([k, l]) => `<span class="tag ${k === "Vulnerable" ? "" : "gold"}">${k}: ${l.map(esc).join(", ")}</span>`).join("")}</div>` : ""; };
const defText = c => defList(c).map(([k, l]) => `${k}: ${l.join(", ")}`).join(" | ");
function sheetText(c) {
  return `${c.name} — Level ${c.level} ${raceLabel(c)} ${c.cls} [${edOf(c)} rules] (${c.bg}, ${c.align})
${AB.map(a => `${AB_NAME[a]} ${c.scores[a]} (${sgn(c.mods[a])})`).join(" | ")}
HP ${c.hp} | AC ${c.ac} (${c.acSrc}) | Init ${sgn(c.init)} | Speed ${c.speed} ft | Prof ${sgn(c.prof)} | Passive Perception ${c.passive}
${defText(c) ? defText(c) + "\n" : ""}Saves: ${c.saves.map(a => `${AB_NAME[a]} ${sgn(c.mods[a] + c.prof)}`).join(", ")}
Skills: ${c.skills.filter(s => s.p).map(s => `${s.s} ${sgn(s.v)}${s.x ? "*" : ""}`).join(", ")}
Attacks: ${c.attacks.map(a => `${a.name} ${sgn(a.hit)} (${a.dmg}${a.type ? " " + a.type : ""})`).join("; ")}
${c.spell ? `Spellcasting: DC ${c.spell.dc}, attack ${sgn(c.spell.atk)}; ${c.spell.note || c.spell.slots.map((n, i) => `L${i + 1}×${n}`).join(" ") || "no slots yet"}\n` : ""}${(c.prepared || []).length ? `Spells: ${[...c.prepared].sort((a, b) => a.l - b.l || a.n.localeCompare(b.n)).map(p => p.l ? `${p.n} (${p.l})` : `${p.n} (cantrip)`).join(", ")}\n` : ""}Features: ${c.feats.map(f => f.f).concat(c.extras).join(", ")}
Racial traits: ${c.traits.join(", ")}
Equipment: ${c.kit.concat((c.inv || []).filter(i => i.n).map(i => (+i.qty > 1 ? i.qty + " × " : "") + i.n)).join(", ")}
Trait: ${c.trait} Ideal: ${c.ideal}. Bond: ${c.bond}. Flaw: ${c.flaw}.
Hook: ${c.hook}.${c.hookDetail ? `\nBackstory: ${c.hookDetail.story}\nUnanswered questions: ${c.hookDetail.questions.join(" ")}\nFor the DM: ${c.hookDetail.use}` : ""}`;
}
let currentPC = null;
/* The Characters tab's main column shows either the sheet (#rosterMain) or the step-by-step builder (#pcOut) */
function pcShow(which) { const b = which === "build"; $("#pcOut").hidden = !b; $("#rosterMain").hidden = b; }
/* the "⚒ Forge a new character" fold-out in the side panel */
function forgeOpen(on = true) { const d = $("#forgeBox"); if (d) d.open = on; }
async function discardPC() {
  const c = currentPC; if (!c) return;
  const saved = PCS.roster.some(x => x.id === c.id);
  if (!(await confirmBox("Discard character?", saved ? `Discard ${c.name}? This also removes them from your characters. Copies already added to a campaign party stay there.` : `Discard ${c.name}? They aren't saved yet, so they'll be gone for good.`, "Discard"))) return;
  PCS.roster = PCS.roster.filter(x => x.id !== c.id);
  currentPC = null; if (RC.id === c.id) RC.id = null; pcPersist(); renderRosterTab();
  toast(`${c.name} discarded`);
}
function setForgeLineage(value) {
  $("#pcAnc").value = value;
  $("#pcAnc").dispatchEvent(new Event("change"));
}
(function initPC() {

  const curEd = () => currentSourceRules()?.edition || ($("input[name=pcEd]:checked") || {}).value || "2024";
  const fillClasses = () => {
    const keep = $("#pcClass").value, L = campaignClassChoices(curEd());
    $("#pcClass").innerHTML = `<option value="">Random</option>` + L.map(x => `<option>${esc(x)}</option>`).join("");
    $("#pcClass").value = L.includes(keep) ? keep : "";
  };
  fillClasses();
  const syncBackgroundEquipment = () => {
    $("#pcGoldWrap").classList.toggle("ed-hide", curEd() !== "2024" || Boolean(HB_BG[$("#pcBg").value]));
  };
  const fillBgs = () => {
    const keep = $("#pcBg").value, L = campaignBackgroundChoices(curEd());
    $("#pcBg").innerHTML = `<option value="">Random</option>` + L.map(x => `<option>${esc(x)}</option>`).join("");
    $("#pcBg").value = L.includes(keep) ? keep : "";
    $("#pcBonusWrap").classList.toggle("ed-hide", curEd() === "2024");
    syncBackgroundEquipment();
  };
  const fillRaces = () => {
    const ed = curEd(), keep = $("#pcRace").value;
    $("#pcRace").innerHTML = `<option value="">Random</option>` + campaignRaceChoices(ed).map(x => `<option>${esc(x)}</option>`).join("");
    if (campaignRaceChoices(ed).includes(keep)) $("#pcRace").value = keep;
    $("#pcEdHint").textContent = ed === "2024" ? "2024 Player's Handbook: species (with Aasimar, Goliath and Orc); ability bonuses come from your background." : "2014 Player's Handbook: races with subraces; ability bonuses come from your race.";
  };
  const ancHint = () => {
    const ed = curEd(), B = PC_RACES[ed][$("#pcRace").value], v = $("#pcAnc").value, S = B && B.subs && B.subs[v];
    $("#pcAncHint").textContent = S ? S.d : B && B.subs ? `Leave on Random, or pick one of ${campaignLineageChoices(curEd(), $("#pcRace").value).length} options.` : "";
  };
  const syncRace = () => {
    if (($("input[name=pcMode]:checked") || {}).value === "custom") return;
    const B = PC_RACES[curEd()][$("#pcRace").value], keep = $("#pcAnc").value;
    $("#pcAncWrap").classList.toggle("hidden", !(B && B.subs));
    if (B && B.subs) {
      $("#pcAncLbl").textContent = B.term || "Subrace";
      $("#pcAnc").innerHTML = `<option value="">Random</option>` + campaignLineageChoices(curEd(), $("#pcRace").value).map(k => `<option value="${esc(k)}">${esc(subLabel(curEd(), $("#pcRace").value, k))}</option>`).join("");
      if (B.subs[keep]) $("#pcAnc").value = keep;
    }
    ancHint();
  };
  fillRaces();
  window.pcSelectsRefresh = () => {
    const edition = currentSourceRules()?.edition;
    $$("input[name=pcEd]").forEach(r => {
      r.disabled = !!edition && r.value !== edition;
      if (edition) r.checked = r.value === edition;
    });
    fillBgs(); fillClasses();
    fillRaces(); syncRace();
  };
  $$("input[name=pcEd]").forEach(rd => rd.addEventListener("change", () => { fillRaces(); syncRace(); fillBgs(); fillClasses(); }));
  $("#pcRace").addEventListener("change", event => {
    syncRace();
    if (event.target.value) {
      const race = PC_RACES[curEd()][event.target.value];
      openProgression(curEd(), "species", event.target.value, race.subs ? $("#pcAnc").value : "", event.target, {
        setLineage: setForgeLineage,
      });
    }
  });
  $("#pcAnc").addEventListener("change", ancHint);
  $("#pcClass").addEventListener("change", event => {
    if (event.target.value) openProgression(curEd(), "class", event.target.value, "", event.target, { campaign: true });
  });
  $("#pcBg").addEventListener("change", event => {
    syncBackgroundEquipment();
    if (event.target.value) openBackgroundReference(curEd(), event.target.value, event.target);
  });
  fillBgs();
  $$("input[name=pcMode]").forEach(rd => rd.addEventListener("change", () => {
    const cust = ($("input[name=pcMode]:checked") || {}).value === "custom";
    $$("#pcForm .rnd-only").forEach(d => d.classList.toggle("hidden", cust));
    $("#pcForgeBtn").textContent = cust ? "Build step by step" : "Forge Character";
    if (!cust) syncRace();
  }));
  const run = () => {
    const lv = clamp(parseInt($("#pcLevel").value) || 1, 1, 20); $("#pcLevel").value = lv;
    currentPC = pcEnsure(generateCharacter({ seed: newSeed(), campaign: true, name: $("#pcName").value.trim().slice(0, 60), gender: $("#pcGender").value || undefined, bgGold50: curEd() === "2024" && $("#pcGold50").checked, race: $("#pcRace").value, ed: curEd(), sub: $("#pcAncWrap").classList.contains("hidden") ? undefined : ($("#pcAnc").value || undefined), cls: $("#pcClass").value, bg: $("#pcBg").value, level: lv, method: $("input[name=pcMethod]:checked").value, bonus: $("input[name=pcBonus]:checked").value }));
    renderPC(); pcPersist(); forgeOpen(false); showResult("#rosterMain");
  };
  window.pcReroll = run; /* the draft bar's ↻ Reroll forges again from the same form */
  $("#pcForm").addEventListener("submit", e => { e.preventDefault(); if (($("input[name=pcMode]:checked") || {}).value === "custom") { CB.ed = curEd(); cbStart(); } else { CB.on = false; run(); } });
})();
