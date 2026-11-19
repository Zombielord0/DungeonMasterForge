/* 13b-abilities-rests.js: My Characters: limited-use resources, the Abilities list, activations (ACT), their dialogs, rests, Wild Shape and area effects. */

/* ---- limited-use resources (ki, rages, slots, hit dice…), the Abilities list, and rests ---- */
// recharge: "long" = back on a long rest; "short" = all back on a short rest; "short1" = one back on a short rest (2024 rules)
function pcResources(c) {
  const ed = edOf(c), lv = c.level, m = c.mods, prof = c.prof, has = n => (c.feats || []).some(f => f.f === n), tr = n => (c.traits || []).includes(n); const CLV = k => clsLv(c, k), TLV = totalLv(c);
  const R = [], add = (key, name, max, recharge) => R.push({ key, name, max, recharge });
  add("hd", `Hit dice (${[...new Set(c.hdList || [c.hd])].map(d => "d" + d).join(" + ")})`, TLV, "hd");
  if (has("Rage")) add("rage", "Rages", ed === "2014" && CLV("Barbarian") >= 20 ? Infinity : CLV("Barbarian") >= 17 ? 6 : CLV("Barbarian") >= 12 ? 5 : CLV("Barbarian") >= 6 ? 4 : CLV("Barbarian") >= 3 ? 3 : 2, ed === "2024" ? "short1" : "long");
  if (has("Bardic Inspiration")) add("bardic", "Bardic Inspiration", Math.max(1, m.cha), CLV("Bard") >= 5 ? "short" : "long");
  if (has("Channel Divinity")) add("channel", "Channel Divinity", ed === "2024" ? (CLV("Cleric") >= 18 ? 4 : CLV("Cleric") >= 6 ? 3 : 2) : (CLV("Cleric") >= 18 ? 3 : CLV("Cleric") >= 6 ? 2 : 1), ed === "2024" ? "short1" : "short");
  if (CLV("Paladin") >= 3) add("channel", "Channel Divinity", ed === "2024" ? (CLV("Paladin") >= 11 ? 3 : 2) : 1, ed === "2024" ? "short1" : "short");
  if (has("Wild Shape")) add("wild", "Wild Shape", ed === "2014" && CLV("Druid") >= 20 ? Infinity : ed === "2024" ? (CLV("Druid") >= 17 ? 4 : CLV("Druid") >= 6 ? 3 : 2) : 2, ed === "2024" ? "short1" : "short");
  if (has("Second Wind")) add("wind", "Second Wind", ed === "2024" ? (CLV("Fighter") >= 10 ? 4 : CLV("Fighter") >= 4 ? 3 : 2) : 1, ed === "2024" ? "short1" : "short");
  if (has("Action Surge")) add("surge", "Action Surge", CLV("Fighter") >= 17 ? 2 : 1, "short");
  if (has("Indomitable")) add("indom", "Indomitable", CLV("Fighter") >= 17 ? 3 : CLV("Fighter") >= 13 ? 2 : 1, "long");
  if (has("Ki")) add("ki", ed === "2024" ? "Focus points" : "Ki points", CLV("Monk"), "short");
  if (has("Lay on Hands")) add("loh", "Lay on Hands pool", 5 * CLV("Paladin"), "long");
  if (has("Divine Sense") && ed === "2014") add("dsense", "Divine Sense", 1 + Math.max(0, m.cha), "long");
  if (has("Cleansing Touch")) add("cleanse", "Cleansing Touch", Math.max(1, m.cha), "long");
  if (has("Font of Magic")) add("sorc", "Sorcery points", CLV("Sorcerer"), "long");
  if (has("Favored Enemy") && ed === "2024") add("hmark", "Free Hunter's Mark", CLV("Ranger") >= 17 ? 6 : CLV("Ranger") >= 13 ? 5 : CLV("Ranger") >= 9 ? 4 : CLV("Ranger") >= 5 ? 3 : 2, "long");
  if (has("Arcane Recovery")) add("arcrec", "Arcane Recovery", 1, "long");
  if (has("Stroke of Luck")) add("luck", "Stroke of Luck", 1, "short");
  if (featTaken(c, "Lucky")) add("luckfeat", "Luck points", ed === "2024" ? prof : 3, "long");
  if (c.race === "Dragonborn") add("breath", "Breath Weapon", ed === "2024" ? prof : 1, ed === "2024" ? "long" : "short");
  if (tr("Healing Hands")) add("hhands", "Healing Hands", 1, "long");
  if (tr("Relentless Endurance")) add("relent", "Relentless Endurance", 1, "long");
  if (tr("Celestial Revelation") && TLV >= 3) add("crev", "Celestial Revelation", 1, "long");
  if (tr("Large Form") && TLV >= 5) add("large", "Large Form", 1, "long");
  if (tr("Draconic Flight") && TLV >= 5) add("dflight", "Draconic Flight", 1, "long");
  if (tr("Adrenaline Rush")) add("adren", "Adrenaline Rush", prof, "long");
  if (tr("Giant Ancestry")) add("giant", "Giant Ancestry", prof, "long");
  (c.feats || []).filter(f => (f.sub || f.mcsub) && SUB_ABL[f.f] && SUB_ABL[f.f].res).forEach(f => { const [n, mx, rc] = SUB_ABL[f.f].res; add(subAblKey(f.f), n, mx(c), typeof rc === "function" ? rc(c) : rc); });
  if (c.spell) {
    if (c.spell.note) { const mm = c.spell.note.match(/^(\d+) pact slots? of level (\d+)/); if (mm) add("pact", `Pact slots (level ${mm[2]})`, +mm[1], "short"); }
    else c.spell.slots.forEach((n, i) => add("slot" + (i + 1), `Level ${i + 1} slots`, n, "long"));
    if (c.spell.pact) add("pact", `Pact slots (level ${c.spell.pact.lvl})`, c.spell.pact.n, "short");
  }
  return R;
}
const resLeft = (c, r) => r.max === Infinity ? Infinity : Math.max(0, r.max - Math.min(r.max, +((c.used || {})[r.key]) || 0));
function resCtr(c, r) {
  if (!r) return "";
  if (r.max === Infinity) return `<span class="ctr"><span class="tag">Unlimited</span></span>`;
  const left = resLeft(c, r);
  return `<span class="ctr" title="${esc(r.name)}: ${left} of ${r.max} left"><button type="button" class="ctr-b" data-use="${r.key}" data-d="1" aria-label="Use one ${esc(r.name)}" ${left ? "" : "disabled"}>−</button><input type="number" min="0" max="${r.max}" data-left="${r.key}" value="${left}" aria-label="${esc(r.name)} left"><span class="ctr-max">/ ${r.max}</span><button type="button" class="ctr-b" data-use="${r.key}" data-d="-1" aria-label="Regain one ${esc(r.name)}" ${left < r.max ? "" : "disabled"}>+</button></span>`;
}
// features you use in play: actions, bonus actions, reactions, on-hit riders and auras, with this character's numbers
function pcAbilities(c) {
  const ed = edOf(c), lv = c.level, m = c.mods, prof = c.prof, has = n => (c.feats || []).some(f => f.f === n), tr = n => (c.traits || []).includes(n); const CLV = k => clsLv(c, k), TLV = totalLv(c);
  const A = [], add = (name, when, text, res, src) => A.push({ name, when, text, res, src });
  const wisDC = 8 + prof + m.wis, chaB = Math.max(1, m.cha);
  if (has("Rage")) add("Rage", "Bonus action", `+${CLV("Barbarian") >= 16 ? 4 : CLV("Barbarian") >= 9 ? 3 : 2} damage on Strength melee attacks, resistance to bludgeoning, piercing and slashing, advantage on Strength checks and saves. No spellcasting while raging.`, "rage");
  if (has("Reckless Attack")) add("Reckless Attack", "On attack", "Advantage on your Strength attacks this turn; attacks against you have advantage until your next turn.");
  const ea = has("Extra Attack (3)") ? 4 : has("Extra Attack (2)") ? 3 : has("Extra Attack") ? 2 : 0;
  if (ea) add("Extra Attack", "Action", `Make ${ea} attacks when you take the Attack action.`);
  if (has("Bardic Inspiration")) add("Bardic Inspiration", "Bonus action", `Give a creature within 60 ft a d${CLV("Bard") >= 15 ? 12 : CLV("Bard") >= 10 ? 10 : CLV("Bard") >= 5 ? 8 : 6} to add to one attack, check or save.`, "bardic");
  if (has("Channel Divinity")) add("Channel Divinity", "Action", `Turn Undead: undead within 30 ft make a WIS save (DC ${wisDC}) or are turned for 1 minute.${ed === "2024" ? ` Divine Spark: heal, or deal radiant or necrotic damage (CON save), ${CLV("Cleric") >= 18 ? 4 : CLV("Cleric") >= 13 ? 3 : CLV("Cleric") >= 7 ? 2 : 1}d8 + ${m.wis}.` : ""} Your domain adds more options.`, "channel");
  if (CLV("Paladin") >= 3) add("Channel Divinity", "Action", `Use one of your Sacred Oath's Channel Divinity options${ed === "2024" ? ", or Divine Sense" : ""}.`, "channel");
  if (has("Wild Shape")) add("Wild Shape", ed === "2024" ? "Bonus action" : "Action", (L => `Turn into a beast up to CR ${crText(L.cr)}${L.noFly && L.noSwim ? " (no flying or swimming)" : L.noFly ? " (no flying)" : ""} for ${Math.max(1, Math.floor(CLV("Druid") / 2))} hour${CLV("Druid") >= 4 ? "s" : ""}. Pick the beast, then Activate.`)(wildShapeLimit(c)), "wild");
  if (has("Second Wind")) add("Second Wind", "Bonus action", `Regain 1d10 + ${CLV("Fighter")} hit points.`, "wind");
  if (has("Action Surge")) add("Action Surge", "Free", "Take one additional action on your turn.", "surge");
  if (has("Indomitable")) add("Indomitable", "On a failed save", `Reroll a saving throw you failed${ed === "2024" ? `, adding +${CLV("Fighter")}` : ""}.`, "indom");
  if (has("Martial Arts")) { const wm = Math.max(m.str, m.dex), d = ed === "2024" ? (CLV("Monk") >= 17 ? 12 : CLV("Monk") >= 11 ? 10 : CLV("Monk") >= 5 ? 8 : 6) : (CLV("Monk") >= 17 ? 10 : CLV("Monk") >= 11 ? 8 : CLV("Monk") >= 5 ? 6 : 4); add("Martial Arts", "Bonus action", `After the Attack action, make an unarmed strike: ${sgn(wm + prof)} to hit, 1d${d}${wm ? sgn(wm) : ""} bludgeoning.`); }
  if (has("Ki")) add(ed === "2024" ? "Monk's Focus" : "Ki", "Bonus action", "1 point each: Flurry of Blows (two unarmed strikes), Patient Defense (Dodge), Step of the Wind (Dash or Disengage, double jump).", "ki");
  if (has("Stunning Strike")) add("Stunning Strike", "On hit", `Spend 1 point: the target makes a CON save (DC ${wisDC}) or is stunned until the end of your next turn.`, "ki");
  if (has("Deflect Missiles")) add(ed === "2024" ? "Deflect Attacks" : "Deflect Missiles", "Reaction", `Reduce the damage of an attack that hits you by 1d10 + ${m.dex + CLV("Monk")}.`);
  if (has("Slow Fall")) add("Slow Fall", "Reaction", `Reduce falling damage by ${5 * CLV("Monk")}.`);
  if (has("Sneak Attack")) add("Sneak Attack", "On hit, once per turn", `+${Math.ceil(CLV("Rogue") / 2)}d6 damage with a finesse or ranged weapon when you have advantage, or an ally is within 5 ft of the target.`);
  if (has("Cunning Action")) add("Cunning Action", "Bonus action", "Dash, Disengage or Hide.");
  if (has("Uncanny Dodge")) add("Uncanny Dodge", "Reaction", "Halve the damage of an attack that hits you from an attacker you can see.");
  if (has("Evasion")) add("Evasion", "Defense", "On a DEX save for half damage, take none on a success and half on a failure.");
  if (has("Lay on Hands")) add("Lay on Hands", ed === "2024" ? "Bonus action" : "Action", `Touch a creature and restore hit points from your pool of ${5 * CLV("Paladin")}, or spend 5 to cure a disease or poison.`, "loh");
  if (has("Divine Smite")) add("Divine Smite", "On hit", "Spend a spell slot: +2d8 radiant, +1d8 per slot level above 1st (max 5d8), +1d8 more against undead and fiends.");
  if (has("Divine Sense") && ed === "2014") add("Divine Sense", "Action", "Sense celestials, fiends and undead within 60 ft until the end of your next turn.", "dsense");
  if (has("Aura of Protection")) add("Aura of Protection", "Aura", `You and allies within ${CLV("Paladin") >= 18 ? 30 : 10} ft add +${chaB} to saving throws.`);
  if (has("Aura of Courage")) add("Aura of Courage", "Aura", `You and allies within ${CLV("Paladin") >= 18 ? 30 : 10} ft can't be frightened.`);
  if (has("Improved Divine Smite")) add(ed === "2024" ? "Radiant Strikes" : "Improved Divine Smite", "On hit", "+1d8 radiant damage on every melee weapon hit.");
  if (has("Cleansing Touch")) add("Cleansing Touch", "Action", "End one spell on yourself or a willing creature you touch.", "cleanse");
  if (has("Favored Enemy") && ed === "2024") add("Hunter's Mark", "Bonus action", `Cast without a spell slot: +1d${has("Foe Slayer") ? 10 : 6} damage to the marked creature, advantage to track it.`, "hmark");
  if (has("Font of Magic")) add("Font of Magic", "Bonus action", "Turn a spell slot into sorcery points, or spend 2/3/5/6/7 points for a level 1–5 slot.", "sorc");
  if (has("Metamagic")) add("Metamagic", "When casting", "Spend sorcery points to change a spell: Quickened (2), Twinned (spell level), Subtle, Careful, Distant, Empowered, Extended (1).", "sorc");
  if (has("Arcane Recovery")) add("Arcane Recovery", "Short rest", `Recover spell slots with a combined level up to ${Math.ceil(CLV("Wizard") / 2)} (none above 5th).`, "arcrec");
  if (featTaken(c, "Lucky")) add("Lucky (feat)", "On a roll", ed === "2024" ? "Spend a luck point: advantage on a d20 test, or disadvantage on an attack roll against you." : "Spend a luck point: roll an extra d20 for an attack, check or save (or an attack against you) and choose which to use.", "luckfeat");
  if (has("Stroke of Luck")) add("Stroke of Luck", "Free", "Turn a missed attack into a hit, or treat a failed ability check's d20 as a 20.", "luck");
  if (c.race === "Dragonborn") { const x = (c.extras || []).find(e => e.startsWith("Breath Weapon")); if (x) add("Breath Weapon", ed === "2024" ? "Replaces an attack" : "Action", x.replace(/^Breath Weapon \([^)]*\):\s*/, "").replace(/, (\d+ uses per long rest|once per short or long rest)$/, ""), "breath"); }
  if (tr("Healing Hands")) add("Healing Hands", "Action", `Touch a creature and heal ${prof}d4 hit points.`, "hhands");
  if (tr("Relentless Endurance")) add("Relentless Endurance", "When reduced to 0 HP", "Drop to 1 hit point instead.", "relent");
  (c.feats || []).filter(f => (f.sub || f.mcsub) && (SUB_ABL[f.f] || (ACT[f.f] && ACT[f.f].kind !== "none"))).forEach(f => { const S = SUB_ABL[f.f] || { when: ACT[f.f].kind === "persist" ? "Your choice" : ACT[f.f].kind === "toggle" ? "Activated" : "Use" }; add(f.f, S.when, subFeatDesc(f.f, c), S.res ? subAblKey(f.f) : S.uses, f.mcsub || c.subclass); });
  if (tr("Large Form") && TLV >= 5) add("Large Form", "Bonus action", "Become Large for 10 minutes: advantage on Strength checks and +10 ft speed.", "large");
  if (tr("Draconic Flight") && TLV >= 5) add("Draconic Flight", "Bonus action", "Spectral wings for 10 minutes: fly at your walking speed.", "dflight");
  if (tr("Adrenaline Rush")) add("Adrenaline Rush", "Bonus action", `Dash, and gain ${prof} temporary hit points.`, "adren");
  if (tr("Giant Ancestry")) add("Giant Ancestry", "Varies", `Your ${c.sub || "giant"} boon.`, "giant");
  if (tr("Celestial Revelation") && TLV >= 3) add("Celestial Revelation", "Bonus action", `Transform for 1 minute: once per turn add +${prof} radiant or necrotic damage, plus wings, light or fear.`, "crev");
  return A;
}
/* ---- activated abilities: Activate / End for lasting effects, Use for one-off ones; active effects change the sheet ---- */
function rollDice(expr) {
  const mm = String(expr).replace(/\s+/g, "").match(/^(\d*)d(\d+)([+-]\d+)?$/);
  if (!mm) return { total: +expr || 0, text: String(expr) };
  const n = +(mm[1] || 1), d = +mm[2], k = +(mm[3] || 0), rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * d)), total = rolls.reduce((s, x) => s + x, 0) + k;
  return { total, text: `${n}d${d}${k ? sgn(k) : ""}: ${rolls.join(" + ")}${k ? ` ${k < 0 ? "−" : "+"} ${Math.abs(k)}` : ""} = ${total}` };
}
const healSelf = (c, n) => { const before = +c.hpCur || 0, max = +c.hp || 0; c.hpCur = Math.min(max, before + n); pcHealed(c, before === 0); return c.hpCur - before; };
const giveTemp = (c, n) => { if (n > (+c.hpTemp || 0)) { c.hpTemp = n; return true; } return false; };
const wearingArmor = c => (c.inv || []).some(i => i.eq && (+i.qty || 0) > 0 && (a => a && a.cat !== "Shield")(eqArmorOf(i, edOf(c))));
const isActive = (c, n) => !!(c.active || {})[n];
const maDie = c => { const lv = clsLv(c, "Monk") || c.level; return edOf(c) === "2024" ? (lv >= 17 ? 12 : lv >= 11 ? 10 : lv >= 5 ? 8 : 6) : (lv >= 17 ? 10 : lv >= 11 ? 8 : lv >= 5 ? 6 : 4); };
const rageDmg = c => { const l = clsLv(c, "Barbarian"); return l >= 16 ? 4 : l >= 9 ? 3 : 2; };
const psiDie = c => c.level >= 17 ? 12 : c.level >= 11 ? 10 : c.level >= 5 ? 8 : 6;
const healMsg = (c, label, r) => { const h = healSelf(c, r.total); return `${label}: ${r.text}. You regain ${h} hit point${h === 1 ? "" : "s"} (${c.hpCur}/${c.hp}).`; };
const rollMsg = (label, expr, tail) => { const r = rollDice(expr); return `${label}: ${r.text}${tail ? ". " + tail : ""}`; };
const DMG_LIST = ["acid", "cold", "fire", "lightning", "necrotic", "poison", "psychic", "radiant", "thunder", "bludgeoning", "piercing", "slashing"];
/* kind: "toggle" (Activate / End, effects while on), "persist" (a standing choice that stays through rests), "instant" (Use).
   choices: [[id, label]] or (c) => [...]. cost: uses spent (default 1). fx(c, choice): effects while on.
   start(c, choice) / use(c, choice): what happens when activated or used; returns the message to show. */
const ACT = {
  // ---------- Barbarian
  Rage: { kind: "toggle", fx: c => ({ atk: [{ f: "strMelee", dmg: rageDmg(c), label: `Rage +${rageDmg(c)}` }], res: ["bludgeoning", "piercing", "slashing"], notes: ["Advantage on Strength checks and Strength saving throws", "You can't cast spells or concentrate while raging"] }),
    start: c => { const tree = c.subclass === "Path of the World Tree" && c.level >= 3 && giveTemp(c, c.level); if (c.conc) { toast(`Rage ends your concentration on ${c.conc.spell}.`); delete c.conc; } return `${c.name} rages: +${rageDmg(c)} damage on Strength melee attacks, resistance to bludgeoning, piercing and slashing.${tree ? ` Vitality of the Tree: ${c.level} temporary hit points.` : ""}`; } },
  "Reckless Attack": { kind: "toggle", fx: () => ({ atk: [{ f: "strMelee", adv: "advantage (Reckless)" }], notes: ["Attacks against you have advantage until your next turn"] }), start: () => "Reckless Attack: advantage on your Strength attacks this turn; attacks against you have advantage until your next turn." },
  Frenzy: { kind: "toggle", needs: "Rage", fx: c => edOf(c) === "2024" ? { notes: [`Frenzy: the first Reckless Strength hit each turn deals +${rageDmg(c)}d6`] } : { notes: ["Frenzy: one melee weapon attack as a bonus action each turn; one level of exhaustion when the rage ends"] } },
  "Totem Spirit": { kind: "persist", choices: [["bear", "Bear"], ["eagle", "Eagle"], ["wolf", "Wolf"]], fx: (c, ch) => !isActive(c, "Rage") ? {} : ch === "bear" ? { res: DMG_LIST.filter(d => d !== "psychic"), notes: ["Bear totem: resistance to all damage except psychic while raging"] } : ch === "eagle" ? { notes: ["Eagle totem: enemies have disadvantage on opportunity attacks against you; Dash as a bonus action"] } : { notes: ["Wolf totem: friends have advantage on melee attacks against enemies within 5 ft of you"] } },
  "Aspect of the Beast": { kind: "persist", choices: [["bear", "Bear"], ["eagle", "Eagle"], ["wolf", "Wolf"]], fx: (c, ch) => ({ notes: [ch === "bear" ? "Aspect of the Bear: double carrying capacity, advantage on Strength checks to push, pull, lift or break" : ch === "eagle" ? "Aspect of the Eagle: see clearly up to 1 mile; dim light doesn't hinder Perception" : "Aspect of the Wolf: track at a fast pace, move stealthily at a normal pace"] }) },
  "Totemic Attunement": { kind: "persist", choices: [["bear", "Bear"], ["eagle", "Eagle"], ["wolf", "Wolf"]], fx: (c, ch) => !isActive(c, "Rage") ? {} : ch === "eagle" ? { fly: "speed", notes: ["Eagle attunement: fly at your walking speed while raging (you fall at the end of your turn if nothing holds you up)"] } : ch === "bear" ? { notes: ["Bear attunement: enemies within 5 ft have disadvantage attacking anyone but you"] } : { notes: ["Wolf attunement: bonus action to knock a Large or smaller creature you hit prone"] } },
  "Rage of the Wilds": { kind: "persist", choices: [["bear", "Bear"], ["eagle", "Eagle"], ["wolf", "Wolf"]], fx: (c, ch) => !isActive(c, "Rage") ? {} : ch === "bear" ? { res: DMG_LIST.filter(d => !["necrotic", "psychic", "radiant"].includes(d)), notes: ["Bear: resistance to every damage type except force, necrotic, psychic and radiant while raging"] } : ch === "eagle" ? { notes: ["Eagle: Dash and Disengage as part of entering the rage, and as a bonus action while raging"] } : { notes: ["Wolf: allies have advantage on attacks against enemies within 5 ft of you"] } },
  "Aspect of the Wilds": { kind: "persist", choices: [["owl", "Owl"], ["panther", "Panther"], ["salmon", "Salmon"]], fx: (c, ch) => ch === "owl" ? { notes: ["Owl: darkvision 60 ft (or +60 ft)"] } : ch === "panther" ? { climb: "speed" } : { swim: "speed" } },
  "Power of the Wilds": { kind: "persist", choices: [["falcon", "Falcon"], ["lion", "Lion"], ["ram", "Ram"]], fx: (c, ch) => !isActive(c, "Rage") ? {} : ch === "falcon" ? (wearingArmor(c) ? { notes: ["Falcon: fly only works while you aren't wearing armor"] } : { fly: "speed" }) : ch === "lion" ? { notes: ["Lion: enemies within 5 ft have disadvantage attacking anyone but you"] } : { notes: ["Ram: knock a Large or smaller creature you hit with a melee attack prone"] } },
  "Warrior of the Gods": { kind: "instant", use: c => healMsg(c, "Warrior of the Gods", rollDice("1d12")) },
  "Rage of the Gods": { kind: "toggle", fx: () => ({ fly: 60, res: ["necrotic", "psychic", "radiant"], notes: ["Rage of the Gods: when an ally within 30 ft would drop to 0 hit points, spend a rage use to set them to hit points equal to your barbarian level"] }) },
  "Zealous Presence": { kind: "instant", use: () => "Zealous Presence: up to ten creatures within 60 ft gain advantage on attacks and saves until your next turn." },
  // ---------- Bard
  "Bardic Inspiration": { kind: "instant", use: c => `Bardic Inspiration: give a creature within 60 ft a d${c.level >= 15 ? 12 : c.level >= 10 ? 10 : c.level >= 5 ? 8 : 6}.` },
  "Cutting Words": { kind: "instant", use: c => rollMsg("Cutting Words", `1d${c.level >= 15 ? 12 : c.level >= 10 ? 10 : c.level >= 5 ? 8 : 6}`, "Subtract it from the creature's roll") },
  "Peerless Skill": { kind: "instant", use: c => rollMsg("Peerless Skill", `1d${c.level >= 15 ? 12 : c.level >= 10 ? 10 : c.level >= 5 ? 8 : 6}`, "Add it to your roll") },
  "Mantle of Inspiration": { kind: "instant", use: c => { const r = rollDice(`1d${c.level >= 15 ? 12 : c.level >= 10 ? 10 : c.level >= 5 ? 8 : 6}`); return { title: "Mantle of Inspiration", msg: `Mantle of Inspiration: ${r.text}. Allies within 60 ft gain ${2 * r.total} temporary hit points and can move without provoking opportunity attacks.`, amount: 2 * r.total, kind: "temp" }; } },
  "Mantle of Majesty": { kind: "toggle", fx: () => ({ notes: ["Mantle of Majesty: cast command as a bonus action each turn (concentration, 1 minute)"] }) },
  "Unbreakable Majesty": { kind: "toggle", fx: () => ({ notes: ["Unbreakable Majesty: a creature that attacks you must make a CHA save or pick a new target"] }) },
  // ---------- Cleric
  "Channel Divinity": { kind: "instant", choices: c => c.cls === "Paladin" ? [["oath", "Oath option"], ...(edOf(c) === "2024" ? [["sense", "Divine Sense"]] : [])] : [["turn", "Turn Undead"], ...(edOf(c) === "2024" ? [["spark", "Divine Spark"]] : [])],
    use: (c, ch) => ch === "spark" ? roll("Divine Spark", `${c.level >= 18 ? 4 : c.level >= 13 ? 3 : c.level >= 7 ? 2 : 1}d8${sgn(c.mods.wis)}`, "either", `Heal a creature, or deal radiant or necrotic damage (CON save DC ${8 + c.prof + c.mods.wis} for half)`, true) : ch === "turn" ? `Turn Undead: undead within 30 ft make a WIS save (DC ${8 + c.prof + c.mods.wis}) or are turned for 1 minute.` : ch === "sense" ? "Divine Sense: sense celestials, fiends and undead within 60 ft for 10 minutes." : "Channel Divinity: use your oath's option." },
  "Warding Flare": { kind: "instant", use: () => "Warding Flare: impose disadvantage on that attack roll." },
  "Wrath of the Storm": { kind: "instant", use: c => roll("Wrath of the Storm", "2d8", "damage", `Lightning or thunder damage to the attacker (DEX save DC ${8 + c.prof + c.mods.wis} for half)`, true) },
  "War Priest": { kind: "instant", use: () => "War Priest: make one weapon attack as a bonus action." },
  "Channel Divinity: Preserve Life": { kind: "instant", use: c => ({ title: "Preserve Life", msg: `Preserve Life: restore up to ${5 * c.level} hit points among creatures within 30 ft (none above half their maximum). Apply it to one creature here, or use the target's own sheet to split it.`, amount: 5 * c.level, kind: "heal" }) },
  "Preserve Life": { kind: "instant", use: c => ({ title: "Preserve Life", msg: `Preserve Life: restore up to ${5 * c.level} hit points among creatures within 30 ft (none above half their maximum). Apply it to one creature here, or use the target's own sheet to split it.`, amount: 5 * c.level, kind: "heal" }) },
  "Channel Divinity: Radiance of the Dawn": { kind: "instant", use: c => area("Radiance of the Dawn", `2d10+${c.level}`, "con", 8 + c.prof + c.mods.wis, "Radiant", "Magical darkness within 30 ft is dispelled. Each hostile creature within 30 ft makes a CON save: radiant damage, half on a success.") },
  "Radiance of the Dawn": { kind: "instant", use: c => area("Radiance of the Dawn", `2d10+${c.level}`, "con", 8 + c.prof + c.mods.wis, "Radiant", "Magical darkness within 30 ft is dispelled. Each creature you choose within 30 ft makes a CON save: radiant damage, half on a success.") },
  "Channel Divinity: Destructive Wrath": { kind: "instant", use: () => "Destructive Wrath: deal maximum lightning or thunder damage on this roll." },
  "Channel Divinity: Guided Strike": { kind: "instant", use: () => "Guided Strike: +10 to this attack roll." },
  "Guided Strike": { kind: "instant", use: () => "Guided Strike: +10 to the missed attack roll." },
  "Channel Divinity: War God's Blessing": { kind: "instant", use: () => "War God's Blessing: +10 to an ally's attack roll." },
  "War God's Blessing": { kind: "toggle", fx: () => ({ notes: ["War God's Blessing: shield of faith or spiritual weapon without concentration for 1 minute"] }) },
  "Channel Divinity: Invoke Duplicity": { kind: "toggle", fx: () => ({ notes: ["Invoke Duplicity: cast spells from your duplicate's space; advantage on attacks against creatures within 5 ft of both of you"] }) },
  "Invoke Duplicity": { kind: "toggle", fx: () => ({ notes: ["Invoke Duplicity: cast spells from the illusion's space; advantage on attacks against creatures within 5 ft of it"] }) },
  "Channel Divinity: Cloak of Shadows": { kind: "toggle", fx: () => ({ notes: ["Invisible until the end of your next turn, or until you attack or cast a spell"] }) },
  "Channel Divinity: Charm Animals and Plants": { kind: "instant", use: c => `Charm Animals and Plants: beasts and plants within 30 ft make a WIS save (DC ${8 + c.prof + c.mods.wis}) or are charmed for 1 minute.` },
  "Channel Divinity: Knowledge of the Ages": { kind: "toggle", fx: () => ({ notes: ["Knowledge of the Ages: proficiency with one skill or tool for 10 minutes"] }) },
  "Channel Divinity: Read Thoughts": { kind: "instant", use: c => `Read Thoughts: a creature within 60 ft makes a WIS save (DC ${8 + c.prof + c.mods.wis}).` },
  "Blessing of the Trickster": { kind: "instant", use: () => "Blessing of the Trickster: advantage on Stealth checks for the target." },
  // ---------- Druid
  "Wild Shape": { kind: "toggle", choices: c => wildBeasts(c).map(m => [m.id, `${m.n} (CR ${crText(m.cr)})`]),
    fx: (c, ch) => { const B = beastForm(ch), moon = c.subclass === "Circle of the Moon", ed = edOf(c); if (!B) return { notes: ["Wild Shape: use the beast's stat block"] };
      const ac = ed === "2024" && moon ? Math.max(B.m.ac, 13 + c.mods.wis) : B.m.ac;
      return { form: { name: B.m.n, ac, acNote: ed === "2024" && moon && ac > B.m.ac ? "Circle Forms" : B.m.acd || "", sp: B.sp, attacks: B.attacks, scores: B.m.scores.slice(0, 3), hp: B.m.hp, traits: (B.m.traits || []).map(t => t[0]), senses: B.m.senses, size: B.m.size, magic: moon && (ed === "2024" ? c.level >= 6 : c.level >= 6) },
        notes: [`You keep your INT, WIS and CHA, features, proficiencies and hit points${ed === "2014" ? " (the beast's hit points come first)" : ""}. ${ed === "2014" ? "You can't cast spells in beast form." : "You can't cast spells, but you can keep concentrating on one."}`] }; },
    start: (c, ch) => { const ed = edOf(c), moon = c.subclass === "Circle of the Moon", B = beastForm(ch), t = ed === "2024" ? (moon ? 3 * c.level : c.level) : 0, got = t && giveTemp(c, t); if (ed === "2014" && B) c.formHp = B.m.hp; return `${c.name} becomes ${B ? (/^[aeiou]/i.test(B.m.n) ? "an " : "a ") + B.m.n : "a beast"}.${got ? ` ${t} temporary hit points.` : ""}${ed === "2014" && B ? ` Beast hit points: ${B.m.hp}.` : ""}`; } },
  "Combat Wild Shape": { kind: "none" }, "Circle Forms": { kind: "none" },
  "Starry Form": { kind: "toggle", choices: [["archer", "Archer"], ["chalice", "Chalice"], ["dragon", "Dragon"]], fx: (c, ch) => { const d = c.level >= 10 ? "2d8" : "1d8", w = c.mods.wis; return ch === "archer" ? { attacks: [{ name: "Luminous arrow (bonus action)", hit: c.prof + w, die: d, mod: w, type: "radiant", ab: "wis", altNote: "ranged spell attack, 60 ft" }] } : ch === "chalice" ? { notes: [`Chalice: when you heal with a spell slot, another creature within 30 ft regains ${d} + ${w}`] } : { fly: c.level >= 10 ? 20 : null, notes: ["Dragon: treat d20 rolls of 9 or lower as 10 on INT and WIS checks and concentration saves"] }; }, start: () => "Starry Form for 10 minutes." },
  "Wrath of the Sea": { kind: "toggle", fx: c => { const n = Math.max(1, c.mods.wis); return { attacks: [{ name: "Wrath of the Sea (bonus action)", save: `CON save DC ${8 + c.prof + c.mods.wis}`, die: `${n}d6`, mod: 0, type: "cold", altNote: "pushed up to 15 ft" }], ...(c.level >= 10 && (c.feats || []).some(f => f.f === "Stormborn") ? { fly: "speed", res: ["cold", "lightning", "thunder"] } : {}), notes: [`Wrath of the Sea: ${c.level >= 6 ? 10 : 5} ft emanation for 10 minutes`] }; } },
  "Land's Aid": { kind: "instant", use: c => { const n = c.level >= 14 ? 4 : c.level >= 10 ? 3 : 2, h = rollDice(`${n}d6`); return area("Land's Aid", `${n}d6`, "con", 8 + c.prof + c.mods.wis, "Necrotic", "Creatures you choose in a 10 ft sphere make a CON save: necrotic damage, half on a success.", { note: `One creature of your choice in the sphere also regains ${h.text.split(" = ").pop()} hit points (${h.text}).`, heal: h.total }); } },
  "Moonlight Step": { kind: "instant", use: () => "Moonlight Step: teleport up to 30 ft; advantage on your next attack this turn." },
  "Nature's Sanctuary": { kind: "toggle", fx: () => ({ notes: ["Nature's Sanctuary: you and allies in the trees have half cover and resistance to your land's damage type"] }) },
  "Star Map": { kind: "instant", use: () => "Guiding bolt cast without a spell slot." },
  "Cosmic Omen": { kind: "instant", use: () => rollMsg("Cosmic Omen", "1d6", "Add it to an ally's roll (Weal) or subtract it from an enemy's (Woe)") },
  "Natural Recovery": { kind: "instant", dialog: (c, a) => recoveryDialog(c, "Natural Recovery", a.res) },
  // ---------- Fighter
  "Second Wind": { kind: "instant", use: c => healMsg(c, "Second Wind", rollDice(`1d10+${clsLv(c, "Fighter")}`)) },
  "Action Surge": { kind: "instant", use: () => "Action Surge: take one additional action this turn." },
  Indomitable: { kind: "instant", use: c => `Indomitable: reroll the failed saving throw${edOf(c) === "2024" ? `, adding +${clsLv(c, "Fighter")}` : ""}.` },
  "Combat Superiority": { kind: "instant", choices: c => { const mine = choiceOf(c, "Combat Superiority").map(id => MANEUVERS.find(m => m[0] === id)).filter(Boolean).map(m => [m[0], m[1]]); return mine.length ? mine : [["trip", "Trip Attack"], ["riposte", "Riposte"], ["precision", "Precision Attack"], ["disarm", "Disarming Attack"], ["push", "Pushing Attack"], ["menace", "Menacing Attack"], ["other", "Other maneuver"]]; },
    use: (c, ch) => { const d = c.level >= 18 ? 12 : c.level >= 10 ? 10 : 8, dc = 8 + c.prof + Math.max(c.mods.str, c.mods.dex), lab = (MANEUVERS.find(m => m[0] === ch) || [, "Maneuver"])[1]; return ch === "precision" ? rollMsg(lab, `1d${d}`, "Add it to the attack roll") : roll(lab, `1d${d}`, "damage", `Extra damage on the hit${["trip", "disarm", "push", "menace"].includes(ch) ? `; the target makes a save against DC ${dc}` : ""}`); } },
  "Psionic Power": { kind: "instant", choices: c => c.subclass === "Soulknife" ? [["knack", "Psi-Bolstered Knack"], ["whisper", "Psychic Whispers"]] : [["field", "Protective Field"], ["strike", "Psionic Strike"], ["move", "Telekinetic Movement"]],
    use: (c, ch) => { const d = `1d${psiDie(c)}`, i = c.mods.int; return ch === "field" ? rollMsg("Protective Field", `${d}${sgn(i)}`, "Reduce the damage by that much") : ch === "strike" ? roll("Psionic Strike", `${d}${sgn(i)}`, "damage", "Force damage to the target") : ch === "knack" ? rollMsg("Psi-Bolstered Knack", d, "Add it to the failed ability check") : ch === "whisper" ? "Psychic Whispers: telepathy with creatures you choose for hours equal to a Psionic Energy die." : "Telekinetic Movement: move a Large or smaller object or willing creature up to 30 ft."; } },
  "Bulwark of Force": { kind: "toggle", fx: () => ({ notes: ["Bulwark of Force: you and chosen allies within 30 ft have half cover"] }) },
  // ---------- Monk
  Ki: { kind: "instant", choices: [["flurry", "Flurry of Blows"], ["patient", "Patient Defense"], ["step", "Step of the Wind"]], use: (c, ch) => ch === "flurry" ? "Flurry of Blows: two unarmed strikes as a bonus action." : ch === "patient" ? "Patient Defense: Dodge as a bonus action." : "Step of the Wind: Dash or Disengage as a bonus action; jump distance doubled." },
  "Monk's Focus": { kind: "instant", choices: [["flurry", "Flurry of Blows"], ["patient", "Patient Defense"], ["step", "Step of the Wind"]], use: (c, ch) => ch === "flurry" ? `Flurry of Blows: ${c.level >= 10 ? "three" : "two"} unarmed strikes as a bonus action.` : ch === "patient" ? "Patient Defense: Disengage and Dodge as a bonus action." : "Step of the Wind: Dash and Disengage as a bonus action; jump distance doubled." },
  "Stunning Strike": { kind: "instant", use: c => `Stunning Strike: the target makes a CON save (DC ${8 + c.prof + c.mods.wis}) or is stunned until the end of your next turn.` },
  "Wholeness of Body": { kind: "instant", use: c => healMsg(c, "Wholeness of Body", rollDice(edOf(c) === "2024" ? `1d${maDie(c)}${sgn(c.mods.wis)}` : String(3 * c.level))) },
  "Quivering Palm": { kind: "instant", use: c => edOf(c) === "2024" ? roll("Quivering Palm", "10d12", "damage", `Force damage (CON save DC ${8 + c.prof + c.mods.wis} for half)`, true) : roll("Quivering Palm", "10d10", "damage", `Necrotic damage if the target succeeds on its CON save (DC ${8 + c.prof + c.mods.wis}); on a failure it drops to 0 hit points`) },
  "Shadow Arts": { kind: "instant", use: () => "Shadow Arts: cast darkness (you can see through it)." },
  "Improved Shadow Step": { kind: "instant", use: () => "Improved Shadow Step: teleport up to 60 ft and make an Unarmed Strike." },
  "Cloak of Shadows": { kind: "toggle", fx: () => ({ notes: ["Cloak of Shadows: invisible while in dim light or darkness"] }) },
  "Disciple of the Elements": { kind: "instant", use: () => "Elemental discipline used." },
  "Elemental Attunement": { kind: "toggle", fx: c => ({ atk: [{ f: "unarmed", label: "reach +10 ft, elemental damage" }], ...(c.level >= 11 && (c.feats || []).some(f => f.f === "Stride of the Elements") ? { fly: "speed", swim: "speed" } : {}), notes: ["Elemental Attunement: Unarmed Strikes reach 10 ft farther, can deal acid, cold, fire, lightning or thunder damage, and push or pull 10 ft (STR save)"] }) },
  "Elemental Burst": { kind: "instant", use: c => area("Elemental Burst", `3d${maDie(c)}`, "dex", 8 + c.prof + c.mods.wis, "Elemental", "Each creature in a 20 ft sphere within 120 ft makes a DEX save: acid, cold, fire, lightning or thunder damage (your choice), half on a success.") },
  "Hand of Harm": { kind: "instant", use: c => roll("Hand of Harm", `1d${maDie(c)}${sgn(c.mods.wis)}`, "damage", "Necrotic damage") },
  "Hand of Healing": { kind: "instant", use: c => roll("Hand of Healing", `1d${maDie(c)}${sgn(c.mods.wis)}`, "heal", "Hit points restored to the creature you touch") },
  "Flurry of Healing and Harm": { kind: "instant", use: () => "Hand of Harm used with Flurry of Blows without spending a Focus Point." },
  "Hand of Ultimate Mercy": { kind: "instant", use: c => roll("Hand of Ultimate Mercy", `4d10${sgn(c.mods.wis)}`, "heal", "The creature returns to life with that many hit points") },
  // ---------- Paladin
  "Lay on Hands": { kind: "instant", choices: [["self", "Heal yourself"], ["5", "5 points to another"], ["10", "10 points to another"], ["cure", "Cure a poison (5 points)"]],
    cost: (c, ch) => ch === "self" ? Math.min(resLeft(c, pcResources(c).find(r => r.key === "loh")), Math.max(0, (+c.hp || 0) - (+c.hpCur || 0))) : ch === "10" ? 10 : 5,
    use: (c, ch, spent) => ch === "self" ? `Lay on Hands: you regain ${healSelf(c, spent)} hit points (${c.hpCur}/${c.hp}).` : ch === "cure" ? "Lay on Hands: one poison (or disease) ended." : { title: "Lay on Hands", msg: `Lay on Hands: ${spent} hit points from your pool.`, amount: spent, kind: "heal" } },
  "Divine Smite": { kind: "instant", choices: c => pcResources(c).filter(r => /^slot\d$/.test(r.key) && resLeft(c, r) > 0).map(r => [r.key, `${r.name.replace(" slots", "")} slot`]),
    noCost: true, use: (c, ch) => { if (!ch) return "No spell slots left to smite with."; const L = +ch.slice(4), n = Math.min(5, 1 + L); c.used = c.used || {}; c.used[ch] = (+c.used[ch] || 0) + 1; return roll(`Divine Smite (level ${L} slot)`, `${n}d8`, "damage", "Radiant damage on the hit (roll another 1d8 against undead and fiends)"); } },
  "Divine Sense": { kind: "instant", use: () => "Divine Sense: celestials, fiends and undead within 60 ft revealed." },
  "Cleansing Touch": { kind: "instant", use: () => "Cleansing Touch: one spell ended." },
  "Channel Divinity: Sacred Weapon": { kind: "toggle", fx: c => ({ atk: [{ f: "weapon", hit: Math.max(1, c.mods.cha), label: `Sacred Weapon +${Math.max(1, c.mods.cha)}` }], notes: ["Sacred Weapon: your weapon sheds light and counts as magical"] }) },
  "Sacred Weapon": { kind: "toggle", fx: c => ({ atk: [{ f: "weapon", hit: Math.max(1, c.mods.cha), label: `Sacred Weapon +${Math.max(1, c.mods.cha)}` }], notes: ["Sacred Weapon: your weapon sheds light and can deal radiant damage"] }) },
  "Channel Divinity: Vow of Enmity": { kind: "toggle", fx: () => ({ atk: [{ f: "all", adv: "advantage vs vowed foe" }] }) },
  "Vow of Enmity": { kind: "toggle", fx: () => ({ atk: [{ f: "all", adv: "advantage vs vowed foe" }] }) },
  "Channel Divinity: Abjure Enemy": { kind: "instant", use: c => `Abjure Enemy: a creature within 60 ft makes a WIS save (DC ${8 + c.prof + c.mods.cha}) or is frightened with speed 0.` },
  "Channel Divinity: Turn the Unholy": { kind: "instant", use: c => `Turn the Unholy: fiends and undead within 30 ft make a WIS save (DC ${8 + c.prof + c.mods.cha}).` },
  "Channel Divinity: Turn the Faithless": { kind: "instant", use: c => `Turn the Faithless: fey and fiends within 30 ft make a WIS save (DC ${8 + c.prof + c.mods.cha}).` },
  "Channel Divinity: Nature's Wrath": { kind: "instant", use: () => "Nature's Wrath: spectral vines restrain the target." },
  "Nature's Wrath": { kind: "instant", use: c => `Nature's Wrath: creatures within 15 ft make a STR save (DC ${8 + c.prof + c.mods.cha}) or are restrained.` },
  "Inspiring Smite": { kind: "instant", use: c => roll("Inspiring Smite", `2d8+${c.level}`, "temp", "Temporary hit points to share among creatures within 30 ft") },
  "Peerless Athlete": { kind: "toggle", fx: () => ({ notes: ["Peerless Athlete: advantage on Athletics and Acrobatics checks; longer jumps"] }) },
  "Glorious Defense": { kind: "instant", use: c => `Glorious Defense: +${Math.max(1, c.mods.cha)} to the ally's AC against that attack.` },
  "Holy Nimbus": { kind: "toggle", fx: () => ({ notes: ["Holy Nimbus: bright light; enemies starting their turn in it take radiant damage; advantage on saves against fiends and undead"] }) },
  "Elder Champion": { kind: "toggle", fx: () => ({ notes: ["Elder Champion: regain 10 hit points at the start of each turn; paladin spells as a bonus action; enemies nearby have disadvantage on saves against your spells"] }) },
  "Avenging Angel": { kind: "toggle", fx: () => ({ fly: 60, notes: ["Avenging Angel: frightening aura; attacks against frightened creatures have advantage"] }) },
  "Living Legend": { kind: "toggle", fx: () => ({ notes: ["Living Legend: advantage on Charisma checks; once per turn turn a miss into a hit; reroll failed saves"] }) },
  "Undying Sentinel": { kind: "instant", use: c => { c.hpCur = edOf(c) === "2024" ? Math.min(+c.hp || 0, 1 + 3 * c.level) : 1; return `Undying Sentinel: you drop to ${c.hpCur} hit point${c.hpCur === 1 ? "" : "s"} instead of 0.`; } },
  // ---------- Ranger
  "Hunter's Mark": { kind: "toggle", fx: c => ({ atk: [{ f: "weapon", extra: `${(c.feats || []).some(f => f.f === "Foe Slayer") ? "1d10" : "1d6"} force vs marked`, label: "Hunter's Mark" }] }), start: () => "Hunter's Mark cast without a spell slot." },
  "Dread Ambusher": { kind: "instant", use: c => roll("Dread Ambusher", (c.feats || []).some(f => f.f === "Stalker's Flurry") ? "2d8" : "2d6", "damage", "Psychic damage on this hit") },
  "Fey Reinforcements": { kind: "instant", use: () => "Summon fey cast without a spell slot." },
  "Misty Wanderer": { kind: "instant", use: () => "Misty step cast without a spell slot." },
  // ---------- Rogue
  "Psychic Veil": { kind: "toggle", fx: () => ({ notes: ["Psychic Veil: invisible for 1 hour, until you damage a creature or force a save"] }) },
  "Rend Mind": { kind: "instant", use: c => `Rend Mind: the target makes a WIS save (DC ${8 + c.prof + c.mods.dex}) or is stunned for 1 minute.` },
  "Spell Thief": { kind: "instant", use: c => `Spell Thief: the caster makes an INT save against DC ${8 + c.prof + c.mods.int}.` },
  "Stroke of Luck": { kind: "instant", use: () => "Stroke of Luck: the miss becomes a hit, or the check's d20 counts as a 20." },
  // ---------- Sorcerer
  "Font of Magic": { kind: "instant", choices: c => { const slots = pcResources(c).filter(r => /^slot[1-5]$/.test(r.key)); return [...slots.map(r => [`make${r.key.slice(4)}`, `Create a level ${r.key.slice(4)} slot (${[0, 2, 3, 5, 6, 7][+r.key.slice(4)]} points)`]), ...slots.map(r => [`burn${r.key.slice(4)}`, `Turn a level ${r.key.slice(4)} slot into ${r.key.slice(4)} point${r.key.slice(4) === "1" ? "" : "s"}`])]; },
    noCost: true, use: (c, ch) => {
      if (!ch) return "You have no spell slots to convert yet."; c.used = c.used || {}; const L = +ch.slice(4), sorc = pcResources(c).find(r => r.key === "sorc"), slot = pcResources(c).find(r => r.key === "slot" + L);
      if (ch.startsWith("make")) { const cost = [0, 2, 3, 5, 6, 7][L]; if (resLeft(c, sorc) < cost) return `Not enough sorcery points (need ${cost}).`; if (!(+c.used["slot" + L] > 0)) return `All your level ${L} slots are already full.`; c.used.sorc = (+c.used.sorc || 0) + cost; c.used["slot" + L] -= 1; return `Font of Magic: ${cost} sorcery points became a level ${L} spell slot.`; }
      if (resLeft(c, slot) < 1) return `No level ${L} slot left to convert.`; if (!(+c.used.sorc > 0)) return "Your sorcery points are already full."; c.used["slot" + L] = (+c.used["slot" + L] || 0) + 1; c.used.sorc = Math.max(0, c.used.sorc - L); return `Font of Magic: a level ${L} slot became ${L} sorcery point${L === 1 ? "" : "s"}.`;
    } },
  Metamagic: { kind: "instant", choices: c => { const mine = choiceOf(c, "Metamagic"); const all = [["quick", "Quickened Spell (2)"], ["twin1", "Twinned Spell, level 1 (1)"], ["twin2", "Twinned Spell, level 2 (2)"], ["twin3", "Twinned Spell, level 3 (3)"], ["subtle", "Subtle Spell (1)"], ["careful", "Careful Spell (1)"], ["distant", "Distant Spell (1)"], ["empower", "Empowered Spell (1)"], ["extend", "Extended Spell (1)"], ["height", `Heightened Spell (${edOf(c) === "2024" ? 2 : 3})`], ...(edOf(c) === "2024" ? [["seek", "Seeking Spell (1)"], ["trans", "Transmuted Spell (1)"]] : [])]; const map = { quickened: ["quick"], twinned: ["twin1", "twin2", "twin3"], subtle: ["subtle"], careful: ["careful"], distant: ["distant"], empowered: ["empower"], extended: ["extend"], heightened: ["height"], seeking: ["seek"], transmuted: ["trans"] }; const keep = mine.flatMap(id => map[id] || []); return keep.length ? all.filter(o => keep.includes(o[0])) : all; },
    cost: (c, ch) => ({ quick: 2, twin2: 2, twin3: 3, height: edOf(c) === "2024" ? 2 : 3 })[ch] || 1, use: (c, ch, spent) => `Metamagic: ${spent} sorcery point${spent === 1 ? "" : "s"} spent.` },
  "Dragon Wings": { kind: "toggle", fx: c => ({ fly: edOf(c) === "2024" ? 60 : "speed", notes: ["Dragon Wings: you can't use them while wearing armor not made for them"] }) },
  "Draconic Presence": { kind: "toggle", fx: () => ({ notes: ["Draconic Presence: 60 ft aura of awe or fear (WIS save)"] }) },
  "Revelation in Flesh": { kind: "toggle", choices: [["sight", "See the Invisible"], ["fly", "Glistening Flight"], ["swim", "Aquatic Adaptation"], ["worm", "Wormlike Movement"]], fx: (c, ch) => ch === "fly" ? { fly: "speed" } : ch === "swim" ? { swim: "2speed", notes: ["Aquatic Adaptation: breathe underwater"] } : ch === "sight" ? { notes: ["See invisible creatures within 60 ft"] } : { notes: ["Wormlike Movement: squeeze through 1-inch spaces, escape grapples with 5 ft of movement"] } },
  "Trance of Order": { kind: "toggle", fx: () => ({ notes: ["Trance of Order: attacks against you can't have advantage; your d20 rolls of 9 or lower count as 10"] }) },
  "Tides of Chaos": { kind: "instant", use: () => "Tides of Chaos: advantage on this roll." },
  "Bend Luck": { kind: "instant", cost: c => edOf(c) === "2024" ? 1 : 2, use: () => rollMsg("Bend Luck", "1d4", "Add it to or subtract it from the roll") },
  "Bastion of Law": { kind: "instant", choices: [["1", "1 point"], ["2", "2 points"], ["3", "3 points"], ["4", "4 points"], ["5", "5 points"]], cost: (c, ch) => +ch || 1, use: (c, ch, spent) => `Bastion of Law: the creature gets ${spent}d8 ward dice.` },
  "Psionic Sorcery": { kind: "none" },
  // ---------- Warlock
  "Fiendish Resilience": { kind: "persist", choices: DMG_LIST.concat([]).map(d => [d, d.charAt(0).toUpperCase() + d.slice(1)]), fx: (c, ch) => ({ res: [ch] }) },
  "Dark One's Blessing": { kind: "instant", use: c => { const n = Math.max(1, c.mods.cha + c.level); giveTemp(c, n); return `Dark One's Blessing: ${n} temporary hit points.`; } },
  "Dark One's Own Luck": { kind: "instant", use: () => rollMsg("Dark One's Own Luck", "1d10", "Add it to the check or save") },
  "Healing Light": { kind: "instant", use: () => roll("Healing Light", "1d6", "heal", "Hit points restored (use it again to spend more dice)") },
  "Searing Vengeance": { kind: "instant", use: c => area("Searing Vengeance", `2d8${sgn(c.mods.cha)}`, null, 0, "Radiant", "The creature stands up with half its hit points. Each creature of your choice within 30 ft takes radiant damage and is blinded until the end of the turn.") },
  "Hurl Through Hell": { kind: "instant", use: c => edOf(c) === "2024" ? roll("Hurl Through Hell", "8d10", "damage", `Psychic damage if the target fails a CHA save (DC ${8 + c.prof + c.mods.cha}); it is incapacitated until the end of your next turn`) : roll("Hurl Through Hell", "10d10", "damage", "Psychic damage when the creature returns (none if it is a fiend)") },
  "Celestial Resilience": { kind: "instant", use: c => { const n = c.level + c.mods.cha; giveTemp(c, n); return `Celestial Resilience: ${n} temporary hit points.`; } },
  "Warping Implosion": { kind: "instant", use: c => area("Warping Implosion", "3d10", "str", 8 + c.prof + c.mods.cha, "Force", "You teleport up to 120 ft. Each creature within 30 ft of the space you left makes a STR save: force damage and pulled next to that space, half and not pulled on a success.") },
  // ---------- Wizard
  "Arcane Recovery": { kind: "instant", dialog: (c, a) => recoveryDialog(c, "Arcane Recovery", a.res) },
  Portent: { kind: "instant", use: () => "Portent die used: replace the roll with it." },
  "Illusory Self": { kind: "instant", use: () => "Illusory Self: the attack misses." },
  // ---------- species
  "Breath Weapon": { kind: "instant", use: c => { const x = (c.extras || []).find(e => e.startsWith("Breath Weapon")) || "", d = (x.match(/(\d+d\d+)/) || [])[1] || "2d6", dc = +((x.match(/DC (\d+)/) || [])[1] || 8 + c.prof + c.mods.con), A = DRAGON_ANCESTRY[c.ancestry] || {}, sv = edOf(c) === "2024" ? "dex" : String(A.save || "DEX").toLowerCase(); return area("Breath Weapon", d, sv, dc, cap1(A.type || ""), `Each creature in the ${edOf(c) === "2024" ? "15 ft cone or 30 ft line" : A.shape || "area"} makes a ${sv.toUpperCase()} save: ${A.type || ""} damage, half on a success.`); } },
  "Healing Hands": { kind: "instant", use: c => roll("Healing Hands", `${c.prof}d4`, "heal", "Hit points restored to the creature you touch") },
  "Relentless Endurance": { kind: "instant", use: c => { c.hpCur = 1; return "Relentless Endurance: you drop to 1 hit point instead of 0."; } },
  "Celestial Revelation": { kind: "toggle", choices: [["wings", "Heavenly Wings"], ["radiance", "Inner Radiance"], ["shroud", "Necrotic Shroud"]], fx: (c, ch) => ({ atk: [{ f: "all", extra: `${c.prof} ${ch === "shroud" ? "necrotic" : "radiant"} once per turn`, label: "Celestial Revelation" }], ...(ch === "wings" ? { fly: "speed" } : {}), notes: [ch === "radiance" ? "Inner Radiance: bright light; creatures within 10 ft take radiant damage equal to your proficiency bonus at the end of your turns" : ch === "shroud" ? "Necrotic Shroud: creatures within 10 ft make a CHA save or are frightened of you until the end of your next turn" : "Heavenly Wings: flying speed equal to your speed"] }) },
  "Large Form": { kind: "toggle", fx: () => ({ speed: [10, "Large Form"], notes: ["Large Form: you are Large, with advantage on Strength checks, for 10 minutes"] }) },
  "Draconic Flight": { kind: "toggle", fx: () => ({ fly: "speed", notes: ["Draconic Flight: spectral wings for 10 minutes"] }) },
  "Adrenaline Rush": { kind: "instant", use: c => { giveTemp(c, c.prof); return `Adrenaline Rush: Dash as a bonus action and gain ${c.prof} temporary hit points.`; } },
  "Giant Ancestry": { kind: "instant", use: c => `${c.sub || "Giant"} boon used.` }
};
// spend a recovery on the highest spent slots that fit (5th level at most)
function slotRecover(c, budget, label) {
  c.used = c.used || {}; const got = [];
  for (let L = 5; L >= 1; L--) while (budget >= L && (+c.used["slot" + L] || 0) > 0) { c.used["slot" + L] -= 1; budget -= L; got.push(L); }
  return got.length ? `${label}: recovered ${got.map(L => `a level ${L}`).join(", ")} slot${got.length > 1 ? "s" : ""}.` : `${label}: no spent slots that it can recover.`;
}
const actSpec = a => ACT[a.name] || (a.res ? { kind: "instant" } : null);
const actChoices = (c, S) => typeof S.choices === "function" ? S.choices(c) : S.choices || [];
// everything active right now, merged into one set of effects
function pcFx(c) {
  const F = { ac: [], acMin: null, acUnarm: [], speed: [], mult: 1, fly: null, climb: null, swim: null, res: new Set(), atk: [], attacks: [], notes: [], on: [], form: null };
  const act = c.active || {}; if (!Object.keys(act).length) return F;
  const have = new Set(pcAbilities(c).map(a => a.name));
  for (const [name, val] of Object.entries(act)) {
    const S = ACT[name]; if (!val || !S || !S.fx || !have.has(name)) continue;
    if (S.needs && !act[S.needs]) continue;
    const ch = val === true ? null : val, x = S.fx(c, ch) || {};
    F.on.push(name);
    if (x.form) F.form = x.form;
    if (x.ac) F.ac.push(x.ac); if (x.acMin && (!F.acMin || x.acMin[0] > F.acMin[0])) F.acMin = x.acMin; if (x.acUnarm) F.acUnarm.push(x.acUnarm);
    if (x.speed) F.speed.push(x.speed); if (x.mult) F.mult *= x.mult;
    ["fly", "climb", "swim"].forEach(k => { if (x[k] != null) F[k] = x[k]; });
    (x.res || []).forEach(r => F.res.add(r)); F.atk.push(...(x.atk || [])); F.attacks.push(...(x.attacks || [])); F.notes.push(...(x.notes || []));
  }
  return F;
}
function actControls(c, a, R) {
  const S = actSpec(a); if (!S || S.kind === "none") return "";
  const on = (c.active || {})[a.name], ch = actChoices(c, S), k = esc(a.name);
  const sel = cur => ch.length ? `<select class="act-sel" data-actsel="${k}" aria-label="${k} option"${S.kind === "persist" ? ` data-actpersist="${k}"` : ""}>${S.kind === "persist" ? `<option value="">Choose…</option>` : ""}${ch.map(([id, l]) => `<option value="${esc(id)}" ${cur === id ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>` : "";
  if (S.kind === "persist") return `<span class="act">${sel(on || "")}</span>`;
  if (S.kind === "toggle") return on ? `<span class="act">${ch.length ? `<span class="tag">${esc((ch.find(x => x[0] === on) || [, ""])[1])}</span>` : ""}<button type="button" class="btn sm primary" data-act="${k}">■ End</button></span>`
    : `<span class="act">${sel()}<button type="button" class="btn sm" data-act="${k}"${a.res && R[a.res] && resLeft(c, R[a.res]) < 1 ? " disabled" : ""}>▶ Activate</button></span>`;
  if (S.kind === "instant" && (S.use || a.res)) return `<span class="act">${sel()}<button type="button" class="btn sm" data-act="${k}"${a.res && R[a.res] && resLeft(c, R[a.res]) < 1 && !S.noCost ? " disabled" : ""}>Use</button></span>`;
  return "";
}
function rcActiveHTML(c) {
  const F = pcFx(c), act = c.active || {}, list = Object.entries(act).filter(([n, v]) => v && ACT[n] && pcAbilities(c).some(a => a.name === n));
  if (!list.length) return "";
  const lab = ([n, v]) => { const ch = actChoices(c, ACT[n]).find(x => x[0] === v); return ch ? `${n}: ${ch[1]}` : n; };
  const res = [...F.res], move = pcSpeed(c).other;
  return `<div class="active-fx"><div class="row" style="flex-wrap:wrap;gap:6px;align-items:center"><b style="flex:0 0 auto">Active</b>${list.map(e => `<span class="tag act-on">${esc(lab(e))}${ACT[e[0]].kind === "toggle" ? ` <button type="button" class="icon-btn" data-act="${esc(e[0])}" title="End ${esc(e[0])}" aria-label="End ${esc(e[0])}">✕</button>` : ""}</span>`).join("")}</div>
    ${F.form ? `<div class="beast"><b>${esc(F.form.name)}</b> <span class="muted">${esc(cap1(F.form.size || ""))} beast</span> · AC ${F.form.ac} · STR ${F.form.scores[0]} (${sgn(mod(F.form.scores[0]))}) · DEX ${F.form.scores[1]} (${sgn(mod(F.form.scores[1]))}) · CON ${F.form.scores[2]} (${sgn(mod(F.form.scores[2]))})${F.form.senses ? ` · ${esc(F.form.senses)}` : ""}${F.form.traits.length ? `<br><span class="muted">Traits: ${F.form.traits.map(esc).join(", ")}</span>` : ""}
      ${edOf(c) === "2014" ? `<div class="slot" style="margin-top:6px"><span>Beast hit points</span><span class="ctr"><input type="number" min="0" max="${F.form.hp}" data-formhp="1" value="${c.formHp ?? F.form.hp}" aria-label="Beast hit points"><span class="ctr-max">/ ${F.form.hp}</span></span>${(c.formHp ?? F.form.hp) <= 0 ? ` <span class="tag">at 0: you revert; extra damage carries over to you</span>` : ""}</div>` : ""}</div>` : ""}
    ${res.length ? `<p style="margin:6px 0 0"><b>Resistances:</b> ${res.map(esc).join(", ")}</p>` : ""}${move.length ? `<p style="margin:4px 0 0"><b>Movement:</b> ${move.map(esc).join(" · ")}</p>` : ""}
    ${F.notes.length ? `<ul class="plain" style="margin:6px 0 0">${F.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}</div>`;
}
/* ---- ability dialogs: results applied to a target, Wild Shape forms, slot recovery, short rests ---- */
const ACTX = {};
function actDialog(html) {
  let m = $("#actModal");
  if (!m) {
    document.body.insertAdjacentHTML("beforeend", `<div id="actModal" role="dialog" aria-modal="true" aria-labelledby="actTitle"><div class="box" id="actBox"></div></div>`);
    m = $("#actModal");
    m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-actclose]")) actClose(); else actDialogClick(e); });
    m.addEventListener("input", e => { if (e.target.matches("[data-recn]")) recoverySum(); });
    m.addEventListener("change", e => { const t = e.target; if (t.name === "mcPick") { ACTX.mc.pick = t.value; ACTX.mc.sub = ""; mcRefresh(); return; } if (t.id === "mcSubSel") { ACTX.mc.sub = t.value; mcRefresh(); return; } if (t.id === "mcOverride") { mcRefresh(); return; } if (t.matches("[data-aoeok]") && ACTX.aoe) { const r = ACTX.aoe[+t.dataset.aoeok]; r.saveOk = t.value === "1"; $(`[data-aoeamt="${t.dataset.aoeok}"]`).textContent = ACTX.aoeAmt(r); } });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && m.classList.contains("open")) actClose(); });
  }
  ACTX.back = document.activeElement;
  const box = $("#actBox"); box.className = "box"; box.innerHTML = html; m.classList.add("open"); /* a dialog may add its own class (spell-box) after this */
  const f = $("#actBox [autofocus]") || $("#actBox select, #actBox input, #actBox button"); if (f) f.focus();
}
function actClose() { const m = $("#actModal"); if (m) m.classList.remove("open"); const c = ACTX.c; if (c && location.hash === "#roster") { renderRosterMain(); } if (ACTX.back && document.contains(ACTX.back)) ACTX.back.focus(); }
const area = (title, expr, save, dc, dtype, desc, extra) => ({ aoe: true, title, expr, save, dc, dtype, desc, msg: desc, ...(extra || {}) });
const roll = (title, expr, kind, tail, half) => { const r = rollDice(expr); return { title, msg: `${title}: ${r.text}${tail ? ". " + tail : ""}`, amount: r.total, kind, half: !!half }; };
// who a heal, temporary hit points or damage can go to: you, your other characters, and monsters in your campaigns' encounters
function actTargets(c) {
  const pcs = PCS.roster.map(p => ({ id: "pc:" + p.id, label: `${p.name}${p.id === c.id ? " (you)" : ""} · ${p.hpCur ?? p.hp}/${p.hp} HP${+p.hpTemp ? ` +${p.hpTemp} temp` : ""}`, self: p.id === c.id }));
  let camps = Store.list().filter(k => (k.party || []).some(x => x.pcId === c.id)); if (!camps.length) camps = Store.list();
  const foes = [];
  camps.forEach(k => (k.encounters || []).filter(e => e.status !== "Done" && e.status !== "Completed").forEach(e => (e.enemies || []).filter(m => m.hp > 0).forEach(m => foes.push({ id: `foe:${k.id}:${e.id}:${m.id}`, label: `${m.name} · ${m.hp}/${m.max} HP`, group: `${k.name} — ${e.name}` }))));
  return { pcs: pcs.sort((a, b) => b.self - a.self), foes };
}
function actApply(targetId, amount, kind) {
  const [t, a, b, d] = targetId.split(":");
  if (t === "pc") {
    const p = PCS.roster.find(x => x.id === a); if (!p) return "That character is gone.";
    const cur = +(p.hpCur ?? p.hp) || 0, max = +p.hp || 0;
    if (kind === "heal") { p.hpCur = Math.min(max, cur + amount); const hn = pcHealed(p, cur === 0); pcPersist(); return `${p.name} regains ${p.hpCur - cur} hit points (${p.hpCur}/${max}).${hn.length ? " " + hn.join(". ") + "." : ""}`; }
    if (kind === "temp") { const was = +p.hpTemp || 0; if (amount > was) p.hpTemp = amount; pcPersist(); return amount > was ? `${p.name} has ${amount} temporary hit points.` : `${p.name} keeps their ${was} temporary hit points (they don't stack).`; }
    let left = amount; const tmp = +p.hpTemp || 0; if (tmp) { const use = Math.min(tmp, left); p.hpTemp = tmp - use || ""; left -= use; }
    p.hpCur = Math.max(0, cur - left); const dn = pcDamaged(p, amount, cur === 0); pcPersist(); return `${p.name} takes ${amount} damage (${p.hpCur}/${max}${+p.hpTemp ? `, ${p.hpTemp} temp left` : ""}).${dn.length ? " " + dn.map(cap1).join(". ") + "." : ""}`;
  }
  const k = Store.get(a), e = k && (k.encounters || []).find(x => x.id === b), m = e && e.enemies.find(x => x.id === d);
  if (!m) return "That creature is gone.";
  if (kind === "damage") m.hp = Math.max(0, m.hp - amount); else m.hp = Math.min(m.max, m.hp + amount);
  Store.save(k);
  return kind === "damage" ? `${m.name} takes ${amount} damage (${m.hp}/${m.max}).${m.hp === 0 ? ` ${m.name} is down.` : ""}` : `${m.name} regains hit points (${m.hp}/${m.max}).`;
}
function actResultDialog(c, R) {
  ACTX.c = c; ACTX.r = R;
  const T = actTargets(c), kind = R.kind === "either" ? "damage" : R.kind, wantFoe = kind === "damage";
  const opt = x => `<option value="${esc(x.id)}">${esc(x.label)}</option>`;
  const groups = [...new Set(T.foes.map(f => f.group))];
  const sel = `<select id="actTarget" aria-label="Target">${wantFoe && T.foes.length ? "" : ""}<optgroup label="Characters">${T.pcs.map(opt).join("")}</optgroup>${groups.map(g => `<optgroup label="${esc(g)}">${T.foes.filter(f => f.group === g).map(opt).join("")}</optgroup>`).join("")}</select>`;
  const kinds = R.kind === "either" ? `<div class="seg" style="margin:10px 0 0"><label class="opt"><input type="radio" name="actKind" value="heal"><span>Heal</span></label><label class="opt"><input type="radio" name="actKind" value="damage" checked><span>Damage</span></label></div>` : "";
  actDialog(`<h3 id="actTitle">${esc(R.title || "Result")}</h3><p style="margin:10px 0">${esc(R.msg)}</p>
    ${R.amount ? `<div class="field" style="margin:0"><label for="actTarget">${kind === "heal" ? "Heal" : kind === "temp" ? "Give temporary hit points to" : "Apply damage to"}</label>${sel}${!T.foes.length && wantFoe ? `<p class="hint" style="margin:6px 0 0">No monsters in an active encounter. Add an encounter in the Campaign Tracker to apply damage to it.</p>` : ""}</div>${kinds}
    <div class="row" style="justify-content:flex-end;margin-top:16px;flex-wrap:wrap"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Don't apply</button>${R.half ? `<button class="btn" type="button" data-actapply="half" style="flex:0 0 auto">Apply half (${Math.floor(R.amount / 2)})</button>` : ""}<button class="btn primary" type="button" data-actapply="full" style="flex:0 0 auto" autofocus>Apply ${R.amount}</button></div>`
    : `<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn primary" type="button" data-actclose style="flex:0 0 auto" autofocus>OK</button></div>`}`);
  const s = $("#actTarget"); if (s) s.value = (wantFoe && T.foes.length ? T.foes[0].id : "pc:" + c.id);
}
function actDialogClick(e) {
  const ap = e.target.closest("[data-actapply]");
  if (ap && ACTX.r) {
    const R = ACTX.r, k = R.kind === "either" ? (($("input[name=actKind]:checked") || {}).value || "damage") : R.kind, n = ap.dataset.actapply === "half" ? Math.floor(R.amount / 2) : R.amount;
    const msg = actApply($("#actTarget").value, n, k); actClose(); toast(msg); return;
  }
  const rc = e.target.closest("[data-recover]"); if (rc) { recoveryConfirm(); return; }
  if (e.target.closest("[data-castgo]")) { castGo(); return; }
  const lvb = e.target.closest("[data-castlv]"); if (lvb && !lvb.disabled) { castPick(lvb.dataset.castlv); return; }
  if (e.target.closest("[data-mcgo]")) { mcGo(); return; }
  if (e.target.closest("[data-aoeroll]")) { aoeRoll(); return; }
  if (e.target.closest("[data-aoeapply]")) { aoeApply(); return; }
  const hd = e.target.closest("[data-hdroll]"); if (hd) { shortRestRoll(); return; }
  const fin = e.target.closest("[data-restfinish]"); if (fin) { shortRestFinish(); return; }
}
/* ---- choose which spent slots Arcane Recovery or Natural Recovery brings back ---- */
function recoveryDialog(c, name, resKey) {
  const budget = Math.ceil((clsLv(c, name === "Arcane Recovery" ? "Wizard" : "Druid") || c.level) / 2), spent = [1, 2, 3, 4, 5].map(L => ({ L, n: Math.min(+((c.used || {})["slot" + L]) || 0, (pcResources(c).find(r => r.key === "slot" + L) || { max: 0 }).max) })).filter(x => x.n > 0);
  ACTX.c = c; ACTX.rec = { name, resKey, budget };
  if (!spent.length) { actDialog(`<h3 id="actTitle">${esc(name)}</h3><p style="margin:10px 0">You have no spent spell slots of 5th level or lower to recover.</p><div class="row" style="justify-content:flex-end"><button class="btn primary" type="button" data-actclose style="flex:0 0 auto">OK</button></div>`); return; }
  actDialog(`<h3 id="actTitle">${esc(name)}</h3><p style="margin:10px 0">Recover spent slots with a combined level of up to <b>${budget}</b>.</p>
    ${spent.map(x => `<div class="slot" style="margin:6px 0"><span style="min-width:120px">Level ${x.L} (${x.n} spent)</span><input type="number" min="0" max="${Math.min(x.n, Math.floor(budget / x.L))}" value="0" data-recn="${x.L}" aria-label="Level ${x.L} slots to recover" style="width:70px"></div>`).join("")}
    <p class="hint" id="recSum">0 of ${budget} levels chosen.</p>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Cancel</button><button class="btn primary" type="button" data-recover style="flex:0 0 auto" disabled>Recover</button></div>`);
}
function recoverySum() {
  const { budget } = ACTX.rec, tot = $$("[data-recn]").reduce((s, i) => s + (+i.value || 0) * +i.dataset.recn, 0);
  $("#recSum").textContent = `${tot} of ${budget} levels chosen.${tot > budget ? " That's too many." : ""}`;
  $("[data-recover]").disabled = !tot || tot > budget;
}
function recoveryConfirm() {
  const c = ACTX.c, { name, resKey, budget } = ACTX.rec, pick = $$("[data-recn]").map(i => [+i.dataset.recn, +i.value || 0]).filter(x => x[1] > 0);
  if (pick.reduce((s, [L, n]) => s + L * n, 0) > budget) return;
  c.used = c.used || {}; const r = pcResources(c).find(x => x.key === resKey);
  if (r && resLeft(c, r) < 1) { actClose(); toast(`No ${name} use left`); return; }
  if (r) c.used[resKey] = (+c.used[resKey] || 0) + 1;
  pick.forEach(([L, n]) => c.used["slot" + L] = Math.max(0, (+c.used["slot" + L] || 0) - n));
  pcPersist(); actClose(); toast(`${name}: recovered ${pick.map(([L, n]) => `${n} level ${L} slot${n > 1 ? "s" : ""}`).join(", ")}`);
}
/* ---- short rest: spend hit dice to heal, then regain short-rest abilities ---- */
function shortRestDialog(c) {
  ACTX.c = c; ACTX.log = [];
  const hd = pcResources(c).find(r => r.key === "hd"), left = resLeft(c, hd);
  actDialog(`<h3 id="actTitle">Short rest</h3><p style="margin:10px 0">An hour of rest. Spend hit dice to heal: each one rolls a d${c.hd} and adds your CON modifier (${sgn(c.mods.con)}).</p>
    <p style="margin:0 0 8px"><b>Hit points:</b> <span id="srHp">${c.hpCur}/${c.hp}</span> · <b>Hit dice left:</b> <span id="srHd">${left}/${hd.max}</span></p>
    <div class="row" style="flex-wrap:wrap;gap:8px"><label style="flex:0 0 auto;display:inline-flex;gap:6px;align-items:center">Spend <input type="number" id="srN" min="1" max="${left}" value="${left ? 1 : 0}" style="width:64px" ${left ? "" : "disabled"}> hit dice</label><button class="btn" type="button" data-hdroll style="flex:0 0 auto" ${left ? "" : "disabled"}>Roll and heal</button></div>
    <div id="srLog" class="hint"></div>
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Cancel</button><button class="btn primary" type="button" data-restfinish style="flex:0 0 auto" autofocus>Finish short rest</button></div>`);
}
function shortRestRoll() {
  const c = ACTX.c, hd = pcResources(c).find(r => r.key === "hd"), n = clamp(parseInt($("#srN").value) || 0, 0, resLeft(c, hd)); if (!n) return;
  c.used = c.used || {}; c.used.hd = (+c.used.hd || 0) + n;
  const rolls = Array.from({ length: n }, () => Math.max(0, 1 + Math.floor(Math.random() * c.hd) + c.mods.con)), tot = rolls.reduce((s, x) => s + x, 0), got = healSelf(c, tot);
  ACTX.log.push(`${n}d${c.hd}${c.mods.con ? ` ${sgn(c.mods.con)} each` : ""}: ${rolls.join(" + ")} = ${tot}, healed ${got}`);
  pcPersist();
  const left = resLeft(c, hd);
  $("#srHp").textContent = `${c.hpCur}/${c.hp}`; $("#srHd").textContent = `${left}/${hd.max}`; $("#srLog").innerHTML = ACTX.log.map(esc).join("<br>");
  $("#srN").max = left; $("#srN").value = left ? 1 : 0; $("#srN").disabled = !left; $("[data-hdroll]").disabled = !left;
}
function shortRestFinish() {
  const c = ACTX.c, back = pcRest(c, "short"), fxEnded = c.fxEnded; delete c.fxEnded; pcPersist();
  const healed = ACTX.log.length ? ` Hit points ${c.hpCur}/${c.hp}.` : "";
  toast(`${c.name} takes a short rest${back.length ? `: ${back.join(", ").toLowerCase()} regained` : ""}.${healed}${fxEnded ? " Active abilities ended." : ""}`);
  // offer slot recovery while resting
  const rec = pcAbilities(c).find(a => (a.name === "Arcane Recovery" || a.name === "Natural Recovery") && a.res && resLeft(c, pcResources(c).find(r => r.key === a.res)) > 0);
  const spentSlots = [1, 2, 3, 4, 5].some(L => +((c.used || {})["slot" + L]) > 0);
  if (rec && spentSlots) recoveryDialog(c, rec.name, rec.res); else actClose();
}
/* ---- Wild Shape: pick a beast; its AC, speeds and attacks replace yours ---- */
const crText = v => v === 0.125 ? "1/8" : v === 0.25 ? "1/4" : v === 0.5 ? "1/2" : String(v);
function wildShapeLimit(c) {
  const lv = clsLv(c, "Druid") || c.level, ed = edOf(c), moon = c.subclass === "Circle of the Moon";
  let cr = lv >= 8 ? 1 : lv >= 4 ? 0.5 : 0.25;
  if (moon) cr = ed === "2024" ? Math.max(1, Math.floor(lv / 3)) : lv >= 6 ? Math.floor(lv / 3) : 1;
  return { cr, noFly: lv < 8, noSwim: ed === "2014" && lv < 4 };
}
function wildBeasts(c) {
  bsLoad(); const L = wildShapeLimit(c);
  return BS.data[edOf(c) === "2014" ? "2014" : "2024"].filter(m => m.type === "beast" && m.cr <= L.cr && !(L.noFly && /fly/i.test(m.speed)) && !(L.noSwim && /swim/i.test(m.speed))).sort((a, b) => a.cr - b.cr || a.n.localeCompare(b.n));
}
function beastForm(id) {
  bsLoad(); const m = Object.values(BS.data).flat().find(x => x.id === id); if (!m) return null;
  const sp = {}; String(m.speed).split(",").forEach(p => { const mm = p.trim().match(/^(?:(fly|swim|climb|burrow)\s+)?(\d+)\s*ft/i); if (mm) sp[(mm[1] || "walk").toLowerCase()] = +mm[2]; });
  const attacks = (m.actions || []).map(([n, t]) => {
    const hit = (t.match(/Attack(?: Roll)?:\s*\+(\d+)/) || [])[1], d = t.match(/(\d+)\s*\((\d+d\d+)\s*(?:([+\-−])\s*(\d+))?\)\s*([A-Za-z]+) damage/);
    if (hit === undefined || !d) return null;
    return { name: n, hit: +hit, die: d[2], mod: d[3] ? (d[3] === "+" ? 1 : -1) * +d[4] : 0, type: d[5].toLowerCase(), melee: /Melee/.test(t), prof: true, beast: true, ab: "beast" };
  }).filter(Boolean);
  return { m, sp, attacks };
}
/* ---- area effects: pick every creature caught in it; each gets its own damage roll and its own saving throw ---- */
const AB_KEY = { str: "Str", dex: "Dex", con: "Con", int: "Int", wis: "Wis", cha: "Cha" };
// a monster's saving throw bonus from its stat block (by its stat name), or null when the app doesn't know it
function foeSaveBonus(m, ab, ed) {
  bsLoad();
  const want = String(m.stat || m.name || "").replace(/\s+\d+$/, "").toLowerCase(), base = String(m.name || "").replace(/\s+\d+$/, "").toLowerCase();
  const find = L => L.find(x => x.n.toLowerCase() === want) || L.find(x => x.n.toLowerCase() === base);
  const sb = find(BS.data[ed === "2014" ? "2014" : "2024"]) || find(BS.data[ed === "2014" ? "2024" : "2014"]); if (!sb) return null;
  const listed = (sb.saves || []).find(x => x.startsWith(AB_KEY[ab] + " "));
  if (listed) return +listed.split(" ")[1];
  return mod(sb.scores[["str", "dex", "con", "int", "wis", "cha"].indexOf(ab)]);
}
function pcSaveBonus(p, ab) { return (p.mods || {})[ab] + ((p.saves || []).includes(ab) ? p.prof : 0) + itemSaveBonus(p); }
// remembered between uses: separate rolls (default) or one shared roll
const aoeShared = () => { try { return localStorage.getItem("dmforge.aoeShared") === "1"; } catch { return false; } };
function aoeTargets(c, ed) {
  const T = actTargets(c), out = [];
  T.foes.forEach(f => { const [, k, e, id] = f.id.split(":"), camp = Store.get(k), enc = camp && camp.encounters.find(x => x.id === e), m = enc && enc.enemies.find(x => x.id === id); if (m) out.push({ id: f.id, label: f.label, group: f.group, foe: m }); });
  T.pcs.filter(x => !x.self).forEach(x => out.push({ id: x.id, label: x.label, group: "Characters", pc: PCS.roster.find(p => "pc:" + p.id === x.id) }));
  return out;
}
function actAoeDialog(c, R) {
  ACTX.c = c; ACTX.r = R; ACTX.aoe = null;
  const L = aoeTargets(c, edOf(c)), groups = [...new Set(L.map(t => t.group))];
  actDialog(`<h3 id="actTitle">${esc(R.title)}</h3><p style="margin:10px 0">${esc(R.desc)}</p>
    ${L.length ? `<p class="hint" style="margin:0 0 6px">Tick every creature in the area${R.save ? `. Each one makes its own ${R.save.toUpperCase()} save against DC ${R.dc}` : ""}.</p>
      <div class="aoe-list">${groups.map(g => `<fieldset><legend>${esc(g)}</legend>${L.filter(t => t.group === g).map(t => `<label class="aoe-t"><input type="checkbox" data-aoet="${esc(t.id)}" ${t.foe ? "checked" : ""}> ${esc(t.label)}</label>`).join("")}</fieldset>`).join("")}</div>
      <div class="seg" role="radiogroup" aria-label="Damage rolls" style="margin-top:10px"><label class="opt"><input type="radio" name="aoeShare" value="0" ${aoeShared() ? "" : "checked"}><span>Separate ${esc(R.expr)} roll for each target</span></label><label class="opt"><input type="radio" name="aoeShare" value="1" ${aoeShared() ? "checked" : ""}><span>One shared roll for everyone (rules as written)</span></label></div>
      <div class="row" style="justify-content:flex-end;margin-top:14px;flex-wrap:wrap"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Cancel</button><button class="btn primary" type="button" data-aoeroll style="flex:0 0 auto" autofocus>Roll damage</button></div>`
    : `<p class="hint">No creatures to target. Add an encounter with monsters in the Campaign Tracker, or other characters on the Characters tab.</p><div class="row" style="justify-content:flex-end"><button class="btn primary" type="button" data-actclose style="flex:0 0 auto">OK</button></div>`}`);
}
function aoeRoll() {
  const c = ACTX.c, R = ACTX.r, ed = edOf(c), L = aoeTargets(c, ed), ids = $$("[data-aoet]").filter(i => i.checked).map(i => i.dataset.aoet);
  if (!ids.length) { toast("Tick at least one creature"); return; }
  const shared = (($("input[name=aoeShare]:checked") || {}).value) === "1"; try { localStorage.setItem("dmforge.aoeShared", shared ? "1" : "0"); } catch { }
  const one = shared ? rollDice(R.expr) : null;
  ACTX.aoe = ids.map(id => {
    const t = L.find(x => x.id === id), dmg = one || rollDice(R.expr);
    let save = null;
    if (R.save) {
      const bonus = t.foe ? foeSaveBonus(t.foe, R.save, ed) : pcSaveBonus(t.pc, R.save), d20 = 1 + Math.floor(Math.random() * 20);
      save = bonus === null ? { d20, bonus: null, ok: false, text: `${R.save.toUpperCase()} save: unknown bonus, d20 ${d20}` } : { d20, bonus, ok: d20 + bonus >= R.dc, text: `${R.save.toUpperCase()} save: ${d20} ${bonus < 0 ? "−" : "+"} ${Math.abs(bonus)} = ${d20 + bonus} vs DC ${R.dc}` };
    }
    return { id, name: t.foe ? t.foe.name : t.pc.name, dmg, save };
  });
  const amt = r => !r.save ? r.dmg.total : r.saveOk ? (R.noneOnSave ? 0 : Math.floor(r.dmg.total / 2)) : r.dmg.total;
  ACTX.aoe.forEach(r => r.saveOk = r.save ? r.save.ok : false);
  const row = (r, i) => `<tr><td><b>${esc(r.name)}</b></td><td>${one ? (i ? `<span class="muted">same roll</span>` : esc(r.dmg.text)) : esc(r.dmg.text)}</td><td>${r.save ? `${esc(r.save.text)}<br><select data-aoeok="${i}" aria-label="${esc(r.name)} save result"><option value="0" ${r.saveOk ? "" : "selected"}>Failed: full damage</option><option value="1" ${r.saveOk ? "selected" : ""}>Saved: ${R.noneOnSave ? "no damage" : "half damage"}</option></select>` : "No save"}</td><td class="aoe-amt" data-aoeamt="${i}">${amt(r)}</td></tr>`;
  ACTX.aoeAmt = amt;
  $("#actBox").innerHTML = `<h3 id="actTitle">${esc(R.title)}</h3>${R.note ? `<p class="hint" style="margin:8px 0 0">${esc(R.note)}</p>` : ""}
    ${one ? `<p style="margin:8px 0 0"><b>Shared damage roll:</b> ${esc(one.text)}</p>` : ""}<div style="overflow-x:auto;margin-top:10px"><table class="foes aoe-res"><thead><tr><th>Target</th><th>Damage roll${one ? " (shared)" : ""}</th><th>Saving throw</th><th>${esc(R.dtype || "")} damage</th></tr></thead><tbody>${ACTX.aoe.map(row).join("")}</tbody></table></div>
    <div class="row" style="justify-content:flex-end;margin-top:14px;flex-wrap:wrap"><button class="btn" type="button" data-actclose style="flex:0 0 auto">Don't apply</button><button class="btn primary" type="button" data-aoeapply style="flex:0 0 auto" autofocus>Apply to all</button></div>`;
  const f = $("#actBox [autofocus]"); if (f) f.focus();
}
function aoeApply() {
  const msgs = ACTX.aoe.map(r => { const n = ACTX.aoeAmt(r); return n ? actApply(r.id, n, "damage") : `${r.name} takes no damage.`; });
  const R = ACTX.r, c = ACTX.c; actClose(); toast(msgs.join(" "));
  if (R.heal) actResultDialog(c, { title: `${R.title}: healing`, msg: `One creature of your choice in the area regains ${R.heal} hit points.`, amount: R.heal, kind: "heal" });
}
