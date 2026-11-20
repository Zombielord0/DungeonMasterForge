/* 07b-feats-homebrew.js: Feats (FEATS, featList), homebrew (HB, hbApply, sheet effects HB_FX / hbEffects) and pending homebrew from players' imports. */

/* ---- feats by rules edition: [name, abilities it can raise by 1 ("any" or "str dex"), prerequisite, summary, group] ----
   prerequisite: "str13|dex13" (any one), "cast" (can cast spells), "lv19", or "@text" (shown, not checked). */
const FEATS = {
  "2014": [
    ["Actor", "cha", "", "Advantage on Deception and Performance while disguised; mimic voices and sounds."],
    ["Alert", "", "", "+5 initiative, can't be surprised while conscious, and hidden attackers gain no advantage on you."],
    ["Athlete", "str dex", "", "Stand up using only 5 ft, climb at full speed, and make running jumps after 5 ft."],
    ["Charger", "", "", "After you Dash, make a bonus-action melee attack for +5 damage or shove the target 10 ft."],
    ["Crossbow Expert", "", "", "Ignore loading, no disadvantage firing in melee, and a bonus-action hand crossbow shot."],
    ["Defensive Duelist", "", "dex13", "Reaction: add your proficiency bonus to AC against a melee hit while holding a finesse weapon."],
    ["Dual Wielder", "", "", "+1 AC while wielding two weapons, fight two-handed with non-light weapons, draw two at once."],
    ["Dungeon Delver", "", "", "Advantage to find secret doors and resist traps; resistance to trap damage; search at normal pace."],
    ["Durable", "con", "", "Each Hit Die you spend heals at least twice your CON modifier."],
    ["Elemental Adept", "", "cast", "Your spells ignore resistance to one damage type, and treat 1s on its damage dice as 2s."],
    ["Grappler", "", "str13", "Advantage on attacks against creatures you grapple, and you can pin them."],
    ["Great Weapon Master", "", "", "Bonus-action attack after a crit or kill; take -5 to hit for +10 damage with heavy weapons."],
    ["Healer", "", "", "A healer's kit can stabilize to 1 HP or heal 1d6 + 4 + the target's Hit Dice once per rest."],
    ["Heavily Armored", "str", "@Medium armor training", "Proficiency with heavy armor."],
    ["Heavy Armor Master", "str", "@Heavy armor training", "In heavy armor, nonmagical bludgeoning, piercing and slashing damage is cut by 3."],
    ["Inspiring Leader", "", "cha13", "A 10-minute speech gives up to six allies temp HP equal to your level + CHA."],
    ["Keen Mind", "int", "", "Always know north and the time, and recall anything seen or heard in the past month."],
    ["Lightly Armored", "str dex", "", "Proficiency with light armor."],
    ["Linguist", "int", "", "Learn three languages and create written ciphers."],
    ["Lucky", "", "", "Three luck points per long rest: roll an extra d20 for an attack, check or save, or against an attack on you."],
    ["Mage Slayer", "", "", "Reaction attack on adjacent casters; they struggle to concentrate, and you resist their spells."],
    ["Magic Initiate", "", "", "Two cantrips and one 1st-level spell from a class of your choice."],
    ["Martial Adept", "", "", "Learn two Battle Master maneuvers and gain one superiority die (d6)."],
    ["Medium Armor Master", "", "@Medium armor training", "No Stealth disadvantage in medium armor, and add up to +3 DEX to its AC."],
    ["Mobile", "", "", "+10 ft speed; Dash ignores difficult terrain; creatures you attack can't make opportunity attacks on you."],
    ["Moderately Armored", "str dex", "@Light armor training", "Proficiency with medium armor and shields."],
    ["Mounted Combatant", "", "", "Advantage on melee attacks against smaller unmounted foes while mounted, and protect your mount."],
    ["Observant", "int wis", "", "+5 to passive Perception and Investigation, and read lips."],
    ["Polearm Master", "", "", "Bonus-action butt-end attack, and opportunity attacks when foes enter your reach."],
    ["Resilient", "any", "", "Proficiency in saving throws for the ability you raise."],
    ["Ritual Caster", "", "int13|wis13", "A ritual book of spells you can cast as rituals, and you can copy more into it."],
    ["Savage Attacker", "", "", "Once per turn, reroll a melee weapon's damage dice and use either total."],
    ["Sentinel", "", "", "Opportunity attacks stop movement, ignore Disengage, and punish foes who attack your allies."],
    ["Sharpshooter", "", "", "No disadvantage at long range, ignore partial cover, and take -5 to hit for +10 damage."],
    ["Shield Master", "", "", "Bonus-action shove, shield bonus to DEX saves, and take no damage on a successful DEX save."],
    ["Skilled", "", "", "Proficiency in any combination of three skills or tools."],
    ["Skulker", "", "dex13", "Hide when lightly obscured; a missed ranged attack doesn't reveal you; dim light doesn't hinder sight."],
    ["Spell Sniper", "", "cast", "Double the range of attack spells, ignore partial cover, and learn one attack cantrip."],
    ["Tavern Brawler", "str con", "", "Proficient with improvised weapons, d4 unarmed strikes, and a bonus-action grapple after a hit."],
    ["Tough", "", "", "+2 hit points per level (added to your HP)."],
    ["War Caster", "", "cast", "Advantage on concentration saves, cast with hands full, and cast a spell as an opportunity attack."],
    ["Weapon Master", "str dex", "", "Proficiency with four weapons of your choice."]
  ],
  "2024": [
    ["Alert", "", "", "Add your proficiency bonus to initiative, and swap initiative with a willing ally.", "o"],
    ["Crafter", "", "", "Three artisan's tools, a 20% discount on nonmagical gear, and fast crafting.", "o"],
    ["Healer", "", "", "Use a healer's kit to let a creature spend a Hit Die; reroll 1s on healing dice.", "o"],
    ["Lucky", "", "", "Luck points equal to your proficiency bonus: gain advantage, or impose disadvantage on an attack on you.", "o"],
    ["Magic Initiate", "", "", "Two cantrips and a level 1 spell from the cleric, druid or wizard list.", "o"],
    ["Musician", "", "", "Three instruments; after a rest, give allies Heroic Inspiration with a song.", "o"],
    ["Savage Attacker", "", "", "Once per turn, roll a weapon's damage dice twice and use either roll.", "o"],
    ["Skilled", "", "", "Proficiency in any combination of three skills or tools.", "o"],
    ["Tavern Brawler", "", "", "Stronger unarmed strikes, reroll 1s on their damage, and push foes 5 ft.", "o"],
    ["Tough", "", "", "+2 hit points per level (added to your HP).", "o"],
    ["Actor", "cha", "cha13", "Advantage on Deception and Performance while disguised; mimic voices.", "g"],
    ["Athlete", "str dex", "str13|dex13", "Climb speed, stand up with 5 ft, and running jumps after 5 ft.", "g"],
    ["Charger", "str dex", "str13|dex13", "+10 ft when you Dash; a charging hit adds 1d8 damage or pushes 10 ft.", "g"],
    ["Chef", "con wis", "", "Cook to heal extra on short rests, and bake treats that grant temp HP.", "g"],
    ["Crossbow Expert", "dex", "dex13", "Ignore loading, no disadvantage in melee, and add your modifier to off-hand crossbow damage.", "g"],
    ["Crusher", "str con", "", "Bludgeoning hits push 5 ft; your crits give allies advantage on the target.", "g"],
    ["Defensive Duelist", "dex", "dex13", "Reaction: add your proficiency bonus to AC while holding a finesse weapon.", "g"],
    ["Dual Wielder", "str dex", "str13|dex13", "Extra off-hand attack with non-light weapons, and draw two weapons at once.", "g"],
    ["Durable", "con", "", "Advantage on death saves, and heal with a Hit Die as a bonus action.", "g"],
    ["Elemental Adept", "int wis cha", "cast", "Your spells ignore resistance to one element, and 1s on its damage become 2s.", "g"],
    ["Fey Touched", "int wis cha", "", "Learn Misty Step and one level 1 divination or enchantment spell.", "g"],
    ["Grappler", "str dex", "str13|dex13", "Grapple as part of a hit, advantage against creatures you grapple, drag them at full speed.", "g"],
    ["Great Weapon Master", "str", "str13", "Heavy weapon hits add your proficiency bonus to damage; bonus attack after a crit or kill.", "g"],
    ["Heavily Armored", "str con", "@Medium armor training", "Heavy armor training.", "g"],
    ["Heavy Armor Master", "str con", "@Heavy armor training", "In heavy armor, bludgeoning, piercing and slashing damage is cut by your proficiency bonus.", "g"],
    ["Inspiring Leader", "wis cha", "wis13|cha13", "After a rest, give up to six allies temp HP equal to your level + modifier.", "g"],
    ["Keen Mind", "int", "int13", "A knowledge skill gains expertise, and Study is a bonus action.", "g"],
    ["Lightly Armored", "str dex", "", "Light armor and shield training.", "g"],
    ["Mage Slayer", "str dex", "", "Your hits break concentration more easily, and you can turn a failed mental save into a success.", "g"],
    ["Martial Weapon Training", "str dex", "", "Proficiency with martial weapons.", "g"],
    ["Medium Armor Master", "str dex", "@Medium armor training", "Add up to +3 DEX to medium armor's AC.", "g"],
    ["Moderately Armored", "str dex", "@Light armor training", "Medium armor training.", "g"],
    ["Mounted Combatant", "str dex wis", "", "Advantage against unmounted foes, and protect your mount from attacks and area effects.", "g"],
    ["Observant", "int wis", "int13|wis13", "Expertise in Insight, Investigation or Perception; Search as a bonus action.", "g"],
    ["Piercer", "str dex", "", "Reroll one piercing damage die per turn; piercing crits add a die.", "g"],
    ["Poisoner", "dex int", "", "Your poison damage ignores resistance, and brew potent poisons.", "g"],
    ["Polearm Master", "str dex", "str13|dex13", "Bonus-action haft attack, and reaction attacks when foes enter your reach.", "g"],
    ["Resilient", "any", "", "Proficiency in saving throws for the ability you raise.", "g"],
    ["Ritual Caster", "int wis cha", "int13|wis13|cha13", "Learn ritual spells, and cast one quickly without the extra time.", "g"],
    ["Sentinel", "str dex", "str13|dex13", "Opportunity attacks stop movement and ignore Disengage; protect your allies.", "g"],
    ["Shadow Touched", "int wis cha", "", "Learn Invisibility and one level 1 illusion or necromancy spell.", "g"],
    ["Sharpshooter", "dex", "dex13", "Ignore partial cover, no disadvantage at long range or in melee.", "g"],
    ["Shield Master", "str", "@Shield training", "Shield-bash to push or knock prone, and take no damage on a successful DEX save.", "g"],
    ["Skill Expert", "any", "", "Proficiency in one skill and expertise in another.", "g"],
    ["Skulker", "dex", "dex13", "Blindsight 10 ft, hide while lightly obscured, and stay hidden after a missed shot.", "g"],
    ["Slasher", "str dex", "", "Slashing hits cut speed by 10 ft; slashing crits hamper the target's attacks.", "g"],
    ["Speedy", "dex con", "dex13|con13", "+10 ft speed, Dash ignores difficult terrain, and opportunity attacks have disadvantage.", "g"],
    ["Spell Sniper", "int wis cha", "cast", "Attack spells gain 60 ft range and ignore partial cover; no disadvantage in melee.", "g"],
    ["Telekinetic", "int wis cha", "", "Invisible Mage Hand, and bonus-action shoves with your mind.", "g"],
    ["Telepathic", "int wis cha", "", "Telepathy 60 ft, and Detect Thoughts once per long rest.", "g"],
    ["War Caster", "int wis cha", "cast", "Advantage on concentration saves, and cast a spell as an opportunity attack.", "g"],
    ["Weapon Master", "str dex", "", "Use the mastery property of one weapon type, and change it after a rest.", "g"],
    ["Boon of Combat Prowess", "any", "lv19", "Once per turn, turn a missed attack into a hit.", "b"],
    ["Boon of Dimensional Travel", "any", "lv19", "Teleport 30 ft after you attack or cast a spell.", "b"],
    ["Boon of Energy Resistance", "any", "lv19", "Resist two damage types and redirect that damage to a foe.", "b"],
    ["Boon of Fate", "any", "lv19", "Add or subtract 2d4 from a nearby creature's d20 roll.", "b"],
    ["Boon of Fortitude", "any", "lv19", "+40 hit points, and extra healing once per turn.", "b"],
    ["Boon of Irresistible Offense", "any", "lv19", "Your damage ignores resistance, and natural 20s deal extra damage.", "b"],
    ["Boon of Recovery", "any", "lv19", "Drop to 1 HP instead of 0 once per long rest, and a pool of d10s to heal.", "b"],
    ["Boon of Skill", "any", "lv19", "Proficiency in every skill, and expertise in one.", "b"],
    ["Boon of Speed", "any", "lv19", "+30 ft speed, and Disengage as a bonus action.", "b"],
    ["Boon of Spell Recall", "any", "lv19", "Cast a level 1-4 spell without a slot once per long rest.", "b"],
    ["Boon of the Night Spirit", "any", "lv19", "Turn invisible in dim light or darkness, and resist most damage there.", "b"],
    ["Boon of Truesight", "any", "lv19", "Truesight out to 60 ft.", "b"]
  ]
};
const FEAT_GROUPS = { o: "Origin", g: "General", b: "Epic boon" };
const FEAT_REPEAT = new Set(["Elemental Adept", "Magic Initiate", "Skilled"]);
/* a feat row: [name, abilities, prerequisite, text, 2024 group, homebrew?, book code] */
const featList = ed => { const L = [...(FEATS[ed] || FEATS["2014"]), ...hbOf("feat").filter(x => hbEdOk(x, ed)).map(x => [x.name, x.ab || "", x.req || "", (x.desc || "") + fxNote(x.fx), ed === "2024" ? (x.group || "g") : undefined, true])];
  hbBook("feat").filter(x => hbEdOk(x, ed) && !L.some(F => F[0] === x.name)).forEach(x => L.push([x.name, x.ab || "", x.req || "", x.desc || "", ed === "2024" ? (x.group || "g") : undefined, false, x.src]));
  return L; };
const featInfo = (ed, name) => featList(ed).find(f => f[0] === name) || null;
const featAbs = F => !F || !F[1] ? [] : F[1] === "any" ? [...AB] : F[1].split(" ");
// Why a character can't take a feat right now ("" if they can). scores are their scores before this level's points.
function featBlock(F, c, scores, lv) {
  const req = F[2]; if (!req || req[0] === "@") return "";
  const ok = req.split("|").some(t => t === "cast" ? !!c.spell : t === "lv19" ? lv >= 19 : (scores[t.slice(0, 3)] || 0) >= +t.slice(3));
  if (ok) return "";
  return req === "cast" ? "Requires spellcasting" : req === "lv19" ? "Requires level 19" : "Requires " + req.split("|").map(t => `${AB_NAME[t.slice(0, 3)]} ${t.slice(3)}`).join(" or ");
}
const featReqText = F => !F[2] ? "" : F[2][0] === "@" ? F[2].slice(1) : F[2] === "cast" ? "Spellcasting" : F[2] === "lv19" ? "Level 19" : F[2].split("|").map(t => `${AB_NAME[t.slice(0, 3)]} ${t.slice(3)}+`).join(" or ");
/* ---- homebrew: subclasses, backgrounds, feats and species added by the DM ----
   Signed in to a campaign they come from the campaign database (Portal); otherwise from this browser.
   Backgrounds and species are merged into BACKGROUNDS / PC_RACES so every picker and the generator see them. */
const HB_KEY = "dmforge.homebrew.v1";
const HB_KINDS = { class: "Classes", subclass: "Subclasses", background: "Backgrounds", feat: "Feats", species: "Species & races", spell: "Spells" };
const SP_SCHOOLS = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"];
const HB = { list: [], pend: [], pendSig: "", applied: { bg: [], races: [], raceDesc: [], classes: [] } };
const HB_DESC = {};      // homebrew feature / trait name -> description
const HB_BG = {};        // homebrew background name -> its entry
const hbEdOk = (x, ed) => !x.ed || x.ed === "both" || x.ed === ed;
/* Sheet effects a homebrew feature, trait, feat or background can carry: { t: type, v: amount, a: ability or skill, max } */
const HB_FX = { ac: "Armor class", hp: "Max HP", hpLv: "Max HP per level", speed: "Speed (ft)", init: "Initiative", atk: "Weapon attack rolls", spell: "Spell save DC & spell attack", ab: "Ability score", save: "Saving throw proficiency", skill: "Skill proficiency", exp: "Skill expertise", res: "Damage resistance", imm: "Damage immunity", vul: "Damage vulnerability", cimm: "Condition immunity", sadv: "Advantage on saves against" };
const FX_COND = ["blinded", "charmed", "deafened", "exhaustion", "frightened", "grappled", "incapacitated", "invisible", "paralyzed", "petrified", "poisoned", "prone", "restrained", "stunned", "unconscious"];
const fxCond = t => t === "cimm";
const SADV_OPTS = [...FX_COND.filter(k => !["incapacitated", "invisible", "unconscious"].includes(k)), "magic", "spells", "traps", ...AB.map(a => `${AB_NAME[a]} saves`)];
const fxSadv = t => t === "sadv";
const FX_DMG = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
const fxDmg = t => t === "res" || t === "imm" || t === "vul";
const fxNum = t => !["save", "skill", "exp", "res", "imm", "vul", "cimm", "sadv"].includes(t);
const fxAb = t => t === "ab" || t === "save", fxSkill = t => t === "skill" || t === "exp";
function fxClean(l) {
  return (Array.isArray(l) ? l : []).filter(e => e && HB_FX[e.t]).slice(0, 12).map(e => {
    const o = { t: e.t };
    if (fxNum(e.t)) o.v = clamp(parseInt(e.v) || 0, -100, 100);
    if (fxAb(e.t)) o.a = AB.includes(e.a) ? e.a : "str";
    if (fxSkill(e.t)) o.a = SKILLS[e.a] ? e.a : ALL_SKILLS[0];
    if (fxDmg(e.t)) o.a = FX_DMG.includes(e.a) ? e.a : "fire";
    if (fxCond(e.t)) o.a = FX_COND.includes(e.a) ? e.a : "charmed";
    if (fxSadv(e.t)) o.a = SADV_OPTS.includes(e.a) ? e.a : "charmed";
    if (e.t === "ab") o.max = clamp(parseInt(e.max) || 20, 1, 30);
    return o;
  }).filter(e => !fxNum(e.t) || e.v);
}
function fxText(e) {
  const n = v => (v >= 0 ? "+" : "−") + Math.abs(v);
  return { ac: () => `${n(e.v)} AC`, hp: () => `${n(e.v)} max HP`, hpLv: () => `${n(e.v)} max HP per level`, speed: () => `${n(e.v)} ft speed`, init: () => `${n(e.v)} initiative`,
    atk: () => `${n(e.v)} to weapon attacks`, spell: () => `${n(e.v)} spell save DC and spell attacks`, ab: () => `${n(e.v)} ${AB_NAME[e.a]} (max ${e.max || 20})`,
    save: () => `${AB_NAME[e.a]} saving throw proficiency`, skill: () => `${e.a} proficiency`, exp: () => `${e.a} expertise`,
    res: () => `${e.a} resistance`, imm: () => `${e.a} immunity`, vul: () => `${e.a} vulnerability`, cimm: () => e.a === "exhaustion" ? "immune to exhaustion" : `can't be ${e.a}`,
    sadv: () => / saves$/.test(e.a) ? `advantage on ${e.a}` : `advantage on saves against ${FX_COND.includes(e.a) && e.a !== "exhaustion" ? "being " : ""}${e.a}` }[e.t]();
}
const fxNote = l => { const c = fxClean(l); return c.length ? ` [On the sheet: ${c.map(fxText).join(", ")}.]` : ""; };
// Every homebrew effect a character has: species traits and subrace, background, subclass features reached, feats taken.
function hbEffects(ed, race, sub, bg, cls, subclass, lv, featNames) {
  const out = [], add = (src, l) => fxClean(l).forEach(e => out.push({ ...e, src }));
  const sp = hbAny("species").find(x => x.name === race && hbEdOk(x, ed) && PC_RACES[ed][race] && PC_RACES[ed][race].hb);
  if (sp) { (sp.traits || []).filter(t => (+t.l || 1) <= lv).forEach(t => add(t.n, t.fx)); const su = (sp.subs || []).find(t => t.n === sub); if (su) add(su.n, su.fx); }
  if (HB_BG[bg]) add(`${bg} background`, HB_BG[bg].fx);
  const sc = subclass && hbAny("subclass").find(x => x.name === subclass && x.cls === cls);
  if (sc) (sc.features || []).filter(f => f.n && +f.l <= lv).forEach(f => add(f.n, f.fx));
  const hc = CLASS_DATA[cls] && CLASS_DATA[cls].hb && CLASS_DATA[cls].hbx;
  if (hc) (hc.features || []).filter(f => f.n && +f.l <= lv).forEach(f => add(f.n, f.fx));
  featNames.forEach(nm => { const f = hbAny("feat").find(x => x.name === nm && hbEdOk(x, ed)); if (f) add(nm, f.fx); });
  return out;
}
const hbOf = kind => HB.list.filter(x => x.kind === kind);
/* ---- pending homebrew: brought in with a player's imported character, waiting for the DM ----
   It lives on the character (c.hbPending). HB.pend gathers it from the roster so those characters build properly,
   but pickers only read hbOf (HB.list), so nobody else can choose it until the DM approves. */
const pendKey = x => `${x.kind}|${x.kind === "subclass" ? String(x.cls || "").toLowerCase() : ""}|${String(x.name || "").toLowerCase()}`;
/* The extra books' species, subclasses, feats and backgrounds (data/extra-options.json, docs/features/extra-books.md):
   homebrew-shaped entries with book: true and src. They come after the campaign's own homebrew, so a homebrew entry
   of the same name wins. They aren't in HB.list, so the Homebrew tab doesn't list them and they're never synced. */
let HB_BOOK = null;
function hbBook(kind) {
  if (!HB_BOOK) { try { HB_BOOK = JSON.parse((window.DMDATA && window.DMDATA.optionExtra) || "[]"); } catch { HB_BOOK = []; } if (window.DMDATA) delete window.DMDATA.optionExtra; }
  return HB_BOOK.filter(x => x.kind === kind);
}
const hbAny = kind => [...hbOf(kind), ...HB.pend.filter(x => x.kind === kind), ...hbBook(kind)];
function hbPendSync() {
  const have = new Set(HB.list.map(pendKey)), by = new Map();
  for (const c of PCS.roster) for (const e of (c.hbPending || [])) {
    if (!e || !HB_KINDS[e.kind] || !e.name) continue;
    if (e.rejected && !["species", "background"].includes(e.kind)) continue; // rejected subclasses, feats and spells were taken off the character
    const k = pendKey(e); if (have.has(k)) continue;
    if (!by.has(k)) { const { from, rejected, ...clean } = e; by.set(k, { ...clean, pend: true, rejected: !!e.rejected, from: [] }); }
    const x = by.get(k); x.from.push({ id: c.id, name: c.name || "Unnamed" }); if (!e.rejected) x.rejected = false;
  }
  const L = [...by.values()], sig = JSON.stringify(L);
  if (sig === HB.pendSig) return;
  HB.pend = L; HB.pendSig = sig; hbApply();
  if (location.hash === "#homebrew" && typeof renderHomebrew === "function") renderHomebrew();
}
const hbClean = x => { const { from, pend, rejected, ...y } = x; return y; };
async function hbApprove(key) {
  const x = HB.pend.find(e => pendKey(e) === key); if (!x) return;
  if (!(await hbPut(hbClean(x)))) return;
  PCS.roster.forEach(c => { if ((c.hbPending || []).some(e => pendKey(e) === key)) { c.hbPending = c.hbPending.filter(e => pendKey(e) !== key); if (!c.hbPending.length) delete c.hbPending; } });
  pcPersist(); hbPendSync(); renderHomebrew(); toast(`${x.name} added to your homebrew`);
}
async function hbReject(key) {
  const x = HB.pend.find(e => pendKey(e) === key); if (!x) return;
  const keeps = ["species", "background", "class"].includes(x.kind);
  if (!(await confirmBox(`Don't approve ${x.name}?`, keeps ? `${x.from.map(f => f.name).join(", ")} keep${x.from.length > 1 ? "" : "s"} it so the sheet still works, with a note to choose another ${x.kind} with you.` : `It is taken off ${x.from.map(f => f.name).join(", ")}${x.kind === "subclass" ? ", who will be asked to choose another subclass" : ""}.`, "Don't approve"))) return;
  PCS.roster.forEach(c => {
    const e = (c.hbPending || []).find(y => pendKey(y) === key); if (!e) return;
    e.rejected = true;
    if (x.kind === "subclass") { let ch = false; if (c.subclass === x.name && c.cls === x.cls) { c.subclass = null; ch = true; } (c.multi || []).forEach(m => { if (m.subclass === x.name && m.cls === x.cls) { m.subclass = null; ch = true; } }); if (ch) pcRebuild(c); }
    if (x.kind === "feat" && (c.bonusFeats || []).some(b => b.n === x.name)) { c.bonusFeats = c.bonusFeats.filter(b => b.n !== x.name); pcRebuild(c); }
    if (x.kind === "spell") c.prepared = (c.prepared || []).filter(s2 => s2.n !== x.name);
  });
  pcPersist(); hbPendSync(); renderHomebrew(); toast(`${x.name} not approved`);
}
// the note on a sheet whose species or background the DM didn't approve
const hbRejectedHTML = c => (c.hbPending || []).filter(e => e.rejected && ["species", "background"].includes(e.kind)).map(e => `<div class="lv-bar"><span class="lv-need">⚠ Your DM didn't approve ${esc(e.name)}. Talk to them about another ${e.kind}.</span></div>`).join("");
function hbPendHTML() {
  const L = HB.pend.filter(x => !x.rejected); if (!L.length) return "";
  const kindName = { class: "class", subclass: "subclass", background: "background", feat: "feat", species: "species", spell: "spell" };
  const body = x => [x.desc, ...(x.features || []).map(f => `Level ${f.l} · ${f.n}: ${f.d}`), ...(x.traits || []).map(f => `${f.n}: ${f.d}`)].filter(Boolean).join("\n\n");
  return `<div id="hbPendBox" class="hb-pend-box"><h4>Waiting for approval</h4><p class="hint" style="margin:0 0 6px">Brought in with players' imported characters. Only those characters use them until you approve.</p>
    ${L.map(x => { const k = esc(pendKey(x)); return `<div class="hb-pend" data-pendrow="${k}"><details><summary><b>${esc(x.name)}</b> <small class="muted">${kindName[x.kind]}${x.kind === "subclass" ? ` (${esc(x.cls)})` : ""} · from ${esc(x.from.map(f => f.name).join(", "))}</small></summary><div class="hb-pend-text">${esc(body(x) || "No description.")}</div></details>
      <div class="row" style="gap:6px;margin-top:4px"><button class="btn sm primary" type="button" data-pendact="ok" data-pendkey="${k}">✓ Approve</button><button class="btn sm" type="button" data-pendact="no" data-pendkey="${k}">✕ Don't approve</button></div></div>`; }).join("")}</div>`;
}
function hbApply() {
  const A = HB.applied;
  A.bg.forEach(n => { delete BACKGROUNDS[n]; delete HB_BG[n]; });
  A.races.forEach(([ed, n]) => { delete PC_RACES[ed][n]; });
  A.raceDesc.forEach(n => { delete RACE_DESC[n]; });
  (A.classes || []).forEach(n => { if (CLASS_DATA[n] && CLASS_DATA[n].hb) delete CLASS_DATA[n]; });
  Object.keys(HB_DESC).forEach(k => delete HB_DESC[k]);
  const N = HB.applied = { bg: [], races: [], raceDesc: [], classes: [] };
  hbAny("class").forEach(x => {
    if (CLASS_DATA[x.name]) return; // never replace a built-in
    CLASS_DATA[x.name] = hbClassData(x); N.classes.push(x.name);
    (x.features || []).forEach(f => { if (f.n) HB_DESC[f.n] = (f.d || "") + fxNote(f.fx); });
  });
  hbAny("background").forEach(x => {
    if (BACKGROUNDS[x.name]) return; // never replace a built-in
    BACKGROUNDS[x.name] = (x.skills || []).filter(k => SKILLS[k]).slice(0, 2); HB_BG[x.name] = x; N.bg.push(x.name);
    HB_DESC[`${x.name} background`] = [x.desc, x.feat ? `Origin feat: ${x.feat}.` : "", x.gear ? `Gear: ${x.gear}.` : ""].filter(Boolean).join(" ") + fxNote(x.fx);
  });
  hbAny("species").forEach(x => {
    const traits = (x.traits || []).filter(t => t.n), subs = (x.subs || []).filter(t => t.n);
    traits.concat(subs).forEach(t => HB_DESC[t.n] = (t.d || "") + fxNote(t.fx));
    ["2014", "2024"].filter(ed => hbEdOk(x, ed) && !PC_RACES[ed][x.name]).forEach(ed => {
      PC_RACES[ed][x.name] = { hb: true, ...(x.pend ? { pend: true } : {}), asi: ed === "2014" ? Object.fromEntries(AB.filter(a => +(x.asi || {})[a]).map(a => [a, +x.asi[a]])) : {}, speed: +x.speed || 30,
        traits: traits.map(t => t.n), skills: (x.skills || []).filter(k => SKILLS[k]), term: x.term || (ed === "2024" ? "Lineage" : "Subrace"),
        ...(subs.length ? { subs: Object.fromEntries(subs.map(t => [t.n, { label: `${t.n}`, traits: [t.n], d: t.d || "", ...(ed === "2014" && t.asi ? { asi: Object.fromEntries(AB.filter(a => +t.asi[a]).map(a => [a, +t.asi[a]])) } : {}) }])) } : {}),
        ...(x.src ? { src: x.src } : {}) };
      N.races.push([ed, x.name]);
    });
    if (!RACE_DESC[x.name]) { RACE_DESC[x.name] = x.desc || ""; N.raceDesc.push(x.name); }
  });
  hbAny("subclass").forEach(x => (x.features || []).forEach(f => { if (f.n) HB_DESC[f.n] = (f.d || "") + fxNote(f.fx); }));
  hbSpellsApply();
}
/* homebrew spells join the spell data (after the built-ins, so built-in ids stay the same) */
function hbSpellsApply() {
  if (!SP.data) return;
  for (const ed of ["2014", "2024"]) {
    const L = SP.data[ed] = SP.data[ed].filter(s => !s.hb);
    hbAny("spell").filter(x => hbEdOk(x, ed)).forEach(x => { const s = { n: x.name, l: +x.l || 0, s: x.s || "", c: x.c || [], t: x.t || "", r: x.r || "", cp: x.cp || "", m: x.m || "", du: x.du || "", co: x.co ? 1 : 0, ri: x.ri ? 1 : 0, d: x.desc || "", h: x.h || "", dt: "", at: "", sv: "", hb: true, ...(x.pend ? { pend: true } : {}) }; spPrep(s, ed, L.length); L.push(s); });
  }
}
function hbRefreshUI() {
  if (window.pcSelectsRefresh) pcSelectsRefresh();
  if (CB.on && location.hash === "#roster") renderCB();
  if (location.hash === "#homebrew") renderHomebrew();
}
function hbSet(list) { HB.list = Array.isArray(list) ? list.filter(x => x && HB_KINDS[x.kind] && x.name) : []; HB.pendSig = ""; hbPendSync(); hbApply(); hbRefreshUI(); }
function hbLoadLocal() { let l = []; try { l = JSON.parse(localStorage.getItem(HB_KEY) || "[]"); } catch { } hbSet(l); }
const hbCloud = () => !!(window.Portal && Portal.cloud);
async function hbPut(item) {
  if (hbCloud()) return Portal.hbPut(item);
  const l = HB.list.filter(x => x.id !== item.id).concat(item);
  try { localStorage.setItem(HB_KEY, JSON.stringify(l)); } catch { toast("Couldn't save in this browser"); return false; }
  hbSet(l); return true;
}
async function hbDel(id) {
  if (hbCloud()) return Portal.hbDel(id);
  const l = HB.list.filter(x => x.id !== id);
  try { localStorage.setItem(HB_KEY, JSON.stringify(l)); } catch { }
  hbSet(l); return true;
}
