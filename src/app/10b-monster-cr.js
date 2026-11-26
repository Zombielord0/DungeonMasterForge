/* 10b-monster-cr.js: the monster builder's recommended challenge rating (owner, 2026-11-25).
   The usual method: a defensive CR from effective hit points and AC, an offensive CR from damage per round and the
   attack bonus or save DC, and their average. Special features (legendary actions and resistance, magic resistance,
   regeneration, pack tactics, flying with ranged attacks, many saving throws, resistances and immunities) change those
   four numbers rather than adding a flat bump. Only the maths is used; the wording is the Forge's own.
   CR_REC_TABLE holds, per CR: expected AC, the most hit points, attack bonus, the most damage per round, save DC.
   It was picked over the builder's typical-monster table (CR_TABLE) by testing both against the SRD monsters
   (test/e2e/monster-builder.cjs prints how close each gets). Notes: docs/features/history.md, "Recommended CR". */
const CR_REC_TABLE = [
  [0, 13, 6, 3, 1, 13], [0.125, 13, 35, 3, 3, 13], [0.25, 13, 49, 3, 5, 13], [0.5, 13, 70, 3, 8, 13],
  [1, 13, 85, 3, 14, 13], [2, 13, 100, 3, 20, 13], [3, 13, 115, 4, 26, 13], [4, 14, 130, 5, 32, 14],
  [5, 15, 145, 6, 38, 15], [6, 15, 160, 6, 44, 15], [7, 15, 175, 6, 50, 15], [8, 16, 190, 7, 56, 16],
  [9, 16, 205, 7, 62, 16], [10, 17, 220, 7, 68, 16], [11, 17, 235, 8, 74, 17], [12, 17, 250, 8, 80, 17],
  [13, 18, 265, 8, 86, 18], [14, 18, 280, 8, 92, 18], [15, 18, 295, 8, 98, 18], [16, 18, 310, 9, 104, 18],
  [17, 19, 325, 10, 110, 19], [18, 19, 340, 10, 116, 19], [19, 19, 355, 10, 122, 19], [20, 19, 400, 10, 140, 19],
  [21, 19, 445, 11, 158, 20], [22, 19, 490, 11, 176, 20], [23, 19, 535, 11, 194, 20], [24, 19, 580, 12, 212, 21],
  [25, 19, 625, 12, 230, 21], [26, 19, 670, 12, 248, 21], [27, 19, 715, 13, 266, 22], [28, 19, 760, 13, 284, 22],
  [29, 19, 805, 13, 302, 22], [30, 19, 850, 14, 320, 23]
];
/* the builder's typical-monster table as the same shape: an upper bound halfway to the next CR's typical value */
const CR_TYP_TABLE = CR_LIST.map((cr, i) => { const [ac, hp, atk, dmg, dc] = CR_TABLE[cr], nx = CR_TABLE[CR_LIST[i + 1]]; return [cr, ac, nx ? (hp + nx[1]) / 2 : 1e9, atk, nx ? (dmg + nx[3]) / 2 : 1e9, dc]; });
const crIdx = cr => Math.max(0, CR_LIST.indexOf(cr));
const crAt = i => CR_LIST[Math.max(0, Math.min(CR_LIST.length - 1, i))];
/* the lowest CR whose upper bound (column col) holds the value */
function crBand(table, col, v) { const row = table.find(r => v <= r[col]); return row ? row[0] : 30; }
const CR_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, twice: 2, thrice: 3 };

/* the damage one action deals and the bonus or DC it uses: "Hit: 19 (2d10 + 8) piercing damage plus 7 (2d6) fire",
   2024 style "+14, reach 10 ft. 13 (1d10 + 8) Slashing damage", or a saving throw's "Failure: 59 (17d6)" */
function crActionInfo(text) {
  const t = String(text || ""), atk = /(?:\+(\d+) to hit|Attack Roll: \+(\d+))/i.exec(t), dc = /DC (\d+)/.exec(t);
  const seg = atk ? t.slice(atk.index) : dc ? t.slice(dc.index) : "";
  let dmg = 0; if (seg) { const cut = seg.split(/\b(?:Success|on a successful (?:one|save))\b/i)[0]; for (const m of cut.matchAll(/(\d+) \(\d+d\d+(?:\s*[+−-]\s*\d+)?\)/g)) dmg += +m[1]; if (!dmg) { const flat = /(?:Hit:|\d+ ft\.,?)\s*(\d+) (?:\w+ )?damage/i.exec(cut); if (flat) dmg = +flat[1]; } }
  const area = !atk && /\b(cone|line|sphere|cube|radius|each creature|cylinder|emanation)\b/i.test(t);
  return { dmg, atk: atk ? +(atk[1] || atk[2]) : null, dc: dc ? +dc[1] : null, area, recharge: /recharge|\/day/i.test(t) };
}

/* damage per round and the bonus or DC that goes with it, from a stat block's actions and legendary actions */
function crOffense(m) {
  const acts = (m.actions || []).map(([n, t]) => Object.assign({ n: String(n || ""), t: String(t || "") }, crActionInfo(t)));
  const byName = n => { n = n.toLowerCase().replace(/s$/, ""); return acts.find(a => a.dmg && a.n.toLowerCase().replace(/\s*\(.*$/, "").replace(/s$/, "") === n); };
  const attacks = acts.filter(a => a.dmg && !a.recharge && !/^multiattack/i.test(a.n));
  const best = attacks.reduce((b, a) => (a.dmg > (b ? b.dmg : 0) ? a : b), null);
  let round = best ? best.dmg : 0, used = best;
  const ma = acts.find(a => /^multiattack/i.test(a.n));
  if (ma && attacks.length) {
    let sum = 0, any = false;
    /* "two attacks: one with its bite and two with its claws", "three Rend attacks", "two Claw attacks and one Bite attack" */
    for (const m2 of ma.t.matchAll(/\b(one|two|three|four|five|six|seven|eight|twice|thrice)\b(?: (?:times|attacks?))?(?: with its)? ([A-Z][\w'-]*(?: [A-Z][\w'-]*)?|[a-z][\w'-]*)/g)) {
      const a = byName(m2[2]) || byName(m2[2].split(" ").pop()); if (!a) continue; any = true; sum += CR_WORDS[m2[1]] * a.dmg;
    }
    if (!any) { const n = /\b(two|three|four|five|six|seven|eight)\b[^.]*?attacks?/i.exec(ma.t); if (n && best) sum = CR_WORDS[n[1].toLowerCase()] * best.dmg; }
    if (sum > round) round = sum;
  }
  /* a recharge or limited attack, used once in the first three rounds; area damage counts two targets */
  const big = acts.filter(a => a.dmg && a.recharge).reduce((b, a) => Math.max(b, a.dmg * (a.area ? 2 : 1)), 0);
  if (big) round = Math.max(round, (big + 2 * round) / 3);
  /* legendary actions: the best damage per action point, times the actions a round */
  let leg = 0;
  if ((m.legend || []).length) {
    const per = (m.legend || []).map(([n, t]) => {
      const cost = +(/costs? (\d+) actions?/i.exec(n) || [0, 1])[1], info = crActionInfo(t);
      let d = info.dmg * (info.area ? 2 : 1);
      if (!d) { const ref = /makes? (?:a|an|one) ([\w'-]+(?: [\w'-]+)?) attack/i.exec(t) || /makes? (?:a|an|one) ([\w'-]+) /i.exec(t); const a = ref && (byName(ref[1]) || byName(ref[1].split(" ").pop())); if (a) d = a.dmg; }
      return d / cost;
    });
    leg = Math.max(0, ...per) * (+m.legN || 3);
  }
  const ref = used || acts.find(a => a.dmg) || {};
  return { round, leg, atk: ref.atk, dc: ref.atk == null ? ref.dc : null };
}

/* the recommended CR for a stat block (the builder's compiled monster, or one from the Monster Manual) */
function crRecommend(m, table = CR_REC_TABLE) {
  const why = [], traits = (m.traits || []).map(([n, t]) => `${n} ${t}`).join(" "), cr0 = +m.cr || 0;
  const band = cr0 <= 4 ? 0 : cr0 <= 10 ? 1 : cr0 <= 16 ? 2 : 3;
  /* defense: hit points made bigger by resistances and immunities, legendary resistance and regeneration */
  let hp = +m.hp || 1, ac = +m.ac || 10;
  const types = s => { s = String(s || "").toLowerCase(); return (s.match(/\b(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\b/g) || []).length + (/nonmagical|non-magical/.test(s) ? 3 : 0); };
  const imm = types(m.imm), res = types(m.res);
  if (imm >= 3) { const x = [2, 2, 1.5, 1.25][band]; hp *= x; why.push(`Immune to several damage types: hit points count ×${x}`); }
  else if (res + imm >= 3) { const x = [2, 1.5, 1.25, 1][band]; if (x > 1) { hp *= x; why.push(`Resistant to several damage types: hit points count ×${x}`); } }
  const lr = /Legendary Resistance \((\d+)\/Day/i.exec(traits);
  if (lr) { const per = [10, 20, 30, 30][band]; hp += +lr[1] * per; why.push(`Legendary Resistance (${lr[1]}/day): +${+lr[1] * per} hit points`); }
  const regen = /regains (\d+) hit points at the start of (?:its|each of its) turn/i.exec(traits);
  if (regen) { hp += 3 * +regen[1]; why.push(`Regeneration: +${3 * +regen[1]} hit points`); }
  if (/Magic Resistance/i.test(traits)) { ac += 2; why.push("Magic Resistance: counts as +2 AC"); }
  const saves = (m.saves || []).length;
  if (saves >= 3) { const x = saves >= 5 ? 4 : 2; ac += x; why.push(`Proficient in ${saves} saving throws: counts as +${x} AC`); }
  const off = crOffense(m);
  if (/\bfly\b/i.test(m.speed || "") && cr0 <= 10 && (m.actions || []).some(([, t]) => /Ranged (?:Weapon )?Attack/i.test(t))) { ac += 2; why.push("Flies and attacks at range: counts as +2 AC"); }
  let def = crBand(table, 2, hp);
  const expAC = table.find(r => r[0] === def)[1], dAC = Math.trunc((ac - expAC) / 2);
  def = crAt(crIdx(def) + dAC);
  why.unshift(`Defense CR ${crLabel(def)}: ${Math.round(hp)} effective hit points, effective AC ${ac}`);
  /* offense: damage per round plus legendary actions, then the attack bonus or save DC */
  let dpr = off.round + off.leg, atk = off.atk;
  if (off.leg) why.push(`Legendary actions: +${Math.round(off.leg)} damage a round`);
  if (atk != null && /Pack Tactics|has advantage on (?:an )?attack rolls?/i.test(traits)) { atk += 1; why.push("Pack Tactics: counts as +1 to hit"); }
  let offCR = crBand(table, 4, dpr);
  const row = table.find(r => r[0] === offCR), dAtk = atk != null ? Math.trunc((atk - row[3]) / 2) : off.dc != null ? Math.trunc((off.dc - row[5]) / 2) : 0;
  offCR = crAt(crIdx(offCR) + dAtk);
  why.splice(1, 0, dpr ? `Offense CR ${crLabel(offCR)}: ${Math.round(dpr)} damage a round, ${atk != null ? `+${atk} to hit` : off.dc != null ? `save DC ${off.dc}` : "no attack bonus read"}` : `Offense CR ${crLabel(offCR)}: no attack damage could be read from the actions`);
  /* the average, as a CR from the list */
  const avg = (def + offCR) / 2, cr = CR_LIST.reduce((b, c) => Math.abs(c - avg) < Math.abs(b - avg) ? c : b, 0);
  return { cr, def, off: offCR, dpr: Math.round(dpr), hp: Math.round(hp), ac, why };
}
