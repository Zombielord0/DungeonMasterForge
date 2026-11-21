/* 13d-choices.js: My Characters: choices inside features and feats (CHOICES: maneuvers, invocations, metamagic…) and the equipped-items list. */

/* ---- choices inside features and feats: maneuvers, invocations, metamagic, Hunter options, tools, Magic Initiate spells ---- */
const MANEUVERS = [
  ["ambush", "Ambush", "Add the die to a Stealth check or initiative roll.", "2024"], ["bait", "Bait and Switch", "Swap places with an ally within 5 ft; one of you adds the die to AC until your next turn.", "2024"],
  ["commander", "Commander's Strike", "Give up an attack so an ally can attack with its reaction, adding the die to damage."], ["presence", "Commanding Presence", "Add the die to an Intimidation, Performance or Persuasion check.", "2024"],
  ["disarm", "Disarming Attack", "Add the die to damage; the target makes a STR save or drops an item."], ["distract", "Distracting Strike", "Add the die to damage; the next attack on the target by someone else has advantage."],
  ["evasive", "Evasive Footwork", "When you move, add the die to your AC until you stop."], ["feint", "Feinting Attack", "Bonus action: advantage on your next attack against a creature, adding the die to damage."],
  ["goad", "Goading Attack", "Add the die to damage; the target makes a WIS save or has disadvantage attacking anyone but you."], ["grapple", "Grappling Strike", "After you hit, grapple as a bonus action and add the die to the check.", "2024"],
  ["lunge", "Lunging Attack", "Your reach grows by 5 ft for one attack (2024: move 5 ft first); add the die to damage."], ["maneuver", "Maneuvering Attack", "Add the die to damage; an ally can move half its speed without provoking."],
  ["menace", "Menacing Attack", "Add the die to damage; the target makes a WIS save or is frightened until your next turn ends."], ["parry", "Parry", "Reaction: reduce melee damage by the die + DEX (2024: + STR or DEX)."],
  ["precision", "Precision Attack", "Add the die to an attack roll."], ["push", "Pushing Attack", "Add the die to damage; a Large or smaller target makes a STR save or is pushed 15 ft."],
  ["rally", "Rally", "Bonus action: an ally gains temporary hit points equal to the die + your CHA (2024: + half your fighter level)."], ["riposte", "Riposte", "Reaction when a creature misses you: attack it and add the die to damage."],
  ["sweep", "Sweeping Attack", "After a hit, deal the die's damage to another creature within 5 ft of you and the target."], ["tactical", "Tactical Assessment", "Add the die to a History, Investigation or Insight check.", "2024"],
  ["trip", "Trip Attack", "Add the die to damage; a Large or smaller target makes a STR save or falls prone."]
];
const INVOCATIONS = [
  ["agonizing", "Agonizing Blast", "Add your Charisma modifier to the damage of each Eldritch Blast beam (applied when you cast it).", 1], ["armor", "Armor of Shadows", "Cast Mage Armor on yourself at will (use the Mage Armor toggle).", 1],
  ["beast", "Beast Speech", "Cast Speak with Animals at will.", 1, "2014"], ["beguile", "Beguiling Influence", "Proficiency in Deception and Persuasion.", 1, "2014"],
  ["devil", "Devil's Sight", "See normally in darkness, magical or not, to 120 ft.", 1], ["sight", "Eldritch Sight", "Cast Detect Magic at will.", 1],
  ["spear", "Eldritch Spear", "Eldritch Blast's range becomes 300 ft (2024: 30 ft × warlock level).", 1], ["rune", "Eyes of the Rune Keeper", "Read all writing.", 1],
  ["vigor", "Fiendish Vigor", "Cast False Life on yourself at will.", 1], ["twominds", "Gaze of Two Minds", "Perceive through a willing creature's senses.", 1],
  ["mask", "Mask of Many Faces", "Cast Disguise Self at will.", 1], ["misty", "Misty Visions", "Cast Silent Image at will.", 1],
  ["repel", "Repelling Blast", "Push a creature hit by Eldritch Blast up to 10 ft away.", 1], ["thief", "Thief of Five Fates", "Cast Bane once per long rest using a warlock spell slot.", 1, "2014"],
  ["chain", "Pact of the Chain", "Find Familiar, with a special familiar form.", 1, "2024"], ["blade", "Pact of the Blade", "Conjure a pact weapon and attack with Charisma.", 1, "2024"], ["tome", "Pact of the Tome", "A Book of Shadows with three cantrips and two rituals.", 1, "2024"],
  ["shadows", "One with Shadows", "In dim light or darkness, become invisible until you move or act.", 5], ["mire", "Mire the Mind", "Cast Slow once per long rest using a warlock spell slot.", 5, "2014"],
  ["omen", "Sign of Ill Omen", "Cast Bestow Curse once per long rest using a warlock spell slot.", 5, "2014"], ["thirst", "Thirsting Blade", "Attack twice with your pact weapon when you take the Attack action.", 5],
  ["whispers", "Bewitching Whispers", "Cast Compulsion once per long rest using a warlock spell slot.", 7, "2014"], ["dread", "Dreadful Word", "Cast Confusion once per long rest using a warlock spell slot.", 7, "2014"],
  ["sculptor", "Sculptor of Flesh", "Cast Polymorph once per long rest using a warlock spell slot.", 7, "2014"], ["ascend", "Ascendant Step", "Cast Levitate on yourself at will.", 9],
  ["leap", "Otherworldly Leap", "Cast Jump on yourself at will.", 9], ["grave", "Whispers of the Grave", "Cast Speak with Dead at will.", 9],
  ["lifedrinker", "Lifedrinker", "Your pact weapon deals extra necrotic damage equal to your CHA modifier (2024: 1d6, and you can heal).", 12],
  ["chains", "Chains of Carceri", "Cast Hold Monster at will on celestials, fiends or elementals.", 15, "2014"], ["myriad", "Master of Myriad Forms", "Cast Alter Self at will.", 15],
  ["visions", "Visions of Distant Realms", "Cast Arcane Eye at will.", 15], ["witch", "Witch Sight", "See the true form of shapechangers and illusions within 30 ft.", 15],
  ["devouring", "Devouring Blade", "Thirsting Blade gives three attacks.", 12, "2024"], ["gift", "Gift of the Protectors", "Allies whose names are in your Book of Shadows drop to 1 hit point instead of 0, once per long rest.", 9, "2024"]
];
const METAMAGIC = [["careful", "Careful Spell"], ["distant", "Distant Spell"], ["empowered", "Empowered Spell"], ["extended", "Extended Spell"], ["heightened", "Heightened Spell"], ["quickened", "Quickened Spell"], ["seeking", "Seeking Spell", "2024"], ["subtle", "Subtle Spell"], ["transmuted", "Transmuted Spell", "2024"], ["twinned", "Twinned Spell"]];
const DRAGONS = ["Black", "Blue", "Brass", "Bronze", "Copper", "Gold", "Green", "Red", "Silver", "White"];
const ARTISAN = ["Alchemist's supplies", "Brewer's supplies", "Calligrapher's supplies", "Carpenter's tools", "Cartographer's tools", "Cobbler's tools", "Cook's utensils", "Glassblower's tools", "Jeweler's tools", "Leatherworker's tools", "Mason's tools", "Painter's supplies", "Potter's tools", "Smith's tools", "Tinker's tools", "Weaver's tools", "Woodcarver's tools"];
const INSTRUMENTS = ["Bagpipes", "Drum", "Dulcimer", "Flute", "Horn", "Lute", "Lyre", "Pan flute", "Shawm", "Viol"];
const byEd = (c, L) => L.filter(x => !x[3] || typeof x[3] !== "string" || x[3] === edOf(c));
const opt3 = L => L.map(x => typeof x === "string" ? [x, x, ""] : [x[0], x[1], x[2] || ""]);
/* key: the feature (or "Feat: X") the choice belongs to. n(c): how many to choose. opts(c): [[id, label, description]] */
const CHOICES = {
  "Combat Superiority": { label: "Maneuvers", n: c => { const l = c.subclass === "Battle Master" ? c.level : 0; return l >= 15 ? 9 : l >= 10 ? 7 : l >= 7 ? 5 : l >= 3 ? 3 : 0; }, opts: c => MANEUVERS.filter(m => !m[3] || m[3] === edOf(c)).map(m => [m[0], m[1], m[2]]) },
  "Eldritch Invocations": { label: "Invocations", n: c => { const l = clsLv(c, "Warlock"); return edOf(c) === "2024" ? [0, 1, 3, 3, 3, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10][l] : [0, 0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8][l]; }, opts: c => INVOCATIONS.filter(v => (!v[4] || v[4] === edOf(c)) && clsLv(c, "Warlock") >= v[3]).map(v => [v[0], v[1] + (v[3] > 1 ? ` (lv ${v[3]})` : ""), v[2]]) },
  Metamagic: { label: "Metamagic options", n: c => { const l = clsLv(c, "Sorcerer"); return l >= 17 ? 4 : l >= 10 ? 3 : l >= (edOf(c) === "2024" ? 2 : 3) ? 2 : 0; }, opts: c => METAMAGIC.filter(m => !m[2] || m[2] === edOf(c)).map(m => [m[0], m[1], ""]) },
  "Hunter's Prey": { label: "Hunter's Prey", n: () => 1, opts: c => opt3(edOf(c) === "2024" ? [["colossus", "Colossus Slayer", "+1d8 once per turn against a creature missing hit points."], ["horde", "Horde Breaker", "One extra attack against another creature within 5 ft of the first."]] : [["colossus", "Colossus Slayer", "+1d8 once per turn against a creature below its maximum."], ["giant", "Giant Killer", "Reaction attack against a Large or larger creature that attacks you."], ["horde", "Horde Breaker", "One extra attack against another creature within 5 ft of the first."]]) },
  "Defensive Tactics": { label: "Defensive Tactics", n: () => 1, opts: c => opt3(edOf(c) === "2024" ? [["escape", "Escape the Horde", "Opportunity attacks against you have disadvantage."], ["multi", "Multiattack Defense", "After a creature hits you, its other attacks this turn have disadvantage."]] : [["escape", "Escape the Horde", "Opportunity attacks against you have disadvantage."], ["multi", "Multiattack Defense", "+4 AC against a creature's later attacks this turn after it hits you."], ["steel", "Steel Will", "Advantage on saves against being frightened."]]) },
  Multiattack: { label: "Multiattack", n: c => edOf(c) === "2014" ? 1 : 0, opts: () => opt3([["volley", "Volley", "Ranged attack against every creature within 10 ft of a point."], ["whirl", "Whirlwind Attack", "Melee attack against every creature within 5 ft of you."]]) },
  "Superior Hunter's Defense": { label: "Superior Hunter's Defense", n: c => edOf(c) === "2014" ? 1 : 0, opts: () => opt3([["evasion", "Evasion", "No damage on a successful DEX save for half, half on a failure."], ["tide", "Stand Against the Tide", "Redirect a missed melee attack to another creature."], ["uncanny", "Uncanny Dodge", "Reaction: halve an attack's damage."]]) },
  "Favored Enemy": { label: "Favored enemies", n: c => { if (edOf(c) === "2024") return 0; const l = clsLv(c, "Ranger"); return l >= 14 ? 3 : l >= 6 ? 2 : 1; }, opts: () => opt3(["Aberrations", "Beasts", "Celestials", "Constructs", "Dragons", "Elementals", "Fey", "Fiends", "Giants", "Monstrosities", "Oozes", "Plants", "Undead", "Two humanoid races"]) },
  "Natural Explorer": { label: "Favored terrains", n: c => { if (edOf(c) === "2024") return 0; const l = clsLv(c, "Ranger"); return l >= 10 ? 3 : l >= 6 ? 2 : 1; }, opts: () => opt3(["Arctic", "Coast", "Desert", "Forest", "Grassland", "Mountain", "Swamp", "Underdark"]) },
  "Circle Spells": { label: "Your land", n: () => 1, opts: () => opt3(["Arctic", "Coast", "Desert", "Forest", "Grassland", "Mountain", "Swamp", "Underdark"]) },
  "Circle of the Land Spells": { label: "Your land (change after a long rest)", n: () => 1, opts: () => opt3(["Arid", "Polar", "Temperate", "Tropical"]) },
  "Dragon Ancestor": { label: "Dragon ancestor", n: () => 1, opts: () => DRAGONS.map(d => [d, `${d} (${DRAGON_ANCESTRY[d] ? DRAGON_ANCESTRY[d].type : ""})`, ""]) },
  "Pact Boon": { label: "Pact boon", n: c => edOf(c) === "2014" ? 1 : 0, opts: () => opt3([["chain", "Pact of the Chain", "Find Familiar with special forms."], ["blade", "Pact of the Blade", "Conjure a pact weapon."], ["tome", "Pact of the Tome", "A Book of Shadows with three cantrips."]]) },
  "Feat: Crafter": { label: "Artisan's tools", n: () => 3, opts: () => opt3(ARTISAN) },
  "Feat: Musician": { label: "Instruments", n: () => 3, opts: () => opt3(INSTRUMENTS) }
};
const DRAGON_FEATURE_ELEMENTS = ["Acid", "Cold", "Fire", "Lightning", "Poison"];
const FEATURE_CHOICE_LANGUAGES = ["Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin", "Halfling", "Orc", "Abyssal", "Celestial", "Draconic", "Deep Speech", "Infernal", "Primordial", "Sylvan", "Undercommon"];
const choiceList = (label, options, n = 1) => ({ label, n: () => n, opts: () => opt3(options) });
const choiceSpellOptions = (c, filter) => {
  spLoad();
  return opt3([...new Set((SP.data[edOf(c)] || []).filter(s => !s.pend && filter(s)).map(s => s.n))].sort());
};
Object.assign(CHOICES, {
  "Giant Power": choiceList("Cantrip", ["Thaumaturgy", "Druidcraft"]),
  "Giant Power language": choiceList("Language", FEATURE_CHOICE_LANGUAGES),
  "Draconic Gift": choiceList("Language", FEATURE_CHOICE_LANGUAGES),
  "Draconic Disciple": choiceList("Language", FEATURE_CHOICE_LANGUAGES),
  "Drake Companion": choiceList("Drake essence (choose each summon)", DRAGON_FEATURE_ELEMENTS),
  "Drake's Breath": choiceList("Breath damage (choose each use)", DRAGON_FEATURE_ELEMENTS),
  "Breath of the Dragon": choiceList("Breath damage (choose each use)", DRAGON_FEATURE_ELEMENTS),
  "Elemental Cleaver": choiceList("Weapon damage (choose each rage)", DRAGON_FEATURE_ELEMENTS.concat("Thunder").filter(x => x !== "Poison")),
  "Aspect of the Wyrm": choiceList("Aura (choose each use)", ["Frightful Presence", ...DRAGON_FEATURE_ELEMENTS.map(x => x + " resistance")]),
  "Bonus Proficiencies": choiceList("Order Domain skill", ["Intimidation", "Persuasion"]),
  "Arcane Initiate": { label: "Wizard cantrips", n: () => 2, opts: c => choiceSpellOptions(c, s => s.l === 0 && s.c.includes("Wizard")) },
  "Spirit Session": { label: "Session spell", n: () => 1, opts: c => choiceSpellOptions(c, s => s.l > 0 && s.l <= Math.min(c.prof, Math.ceil(clsLv(c, "Bard") / 2)) && ["Divination", "Necromancy"].includes(s.s)) },
  "Training in War and Song (Bladesinging)": choiceList("One-handed melee weapon proficiency", ["Club", "Dagger", "Handaxe", "Javelin", "Light Hammer", "Mace", "Sickle", "Spear", "Battleaxe", "Flail", "Longsword", "Morningstar", "Rapier", "Scimitar", "Shortsword", "Trident", "War Pick", "Warhammer", "Whip"]),
  Eladrin: choiceList("Season", [
    ["Autumn", "Autumn", "Your Fey Step can charm up to two nearby creatures."],
    ["Winter", "Winter", "Your Fey Step can frighten a creature near your starting point."],
    ["Spring", "Spring", "You can teleport a willing creature instead of yourself."],
    ["Summer", "Summer", "Your Fey Step deals fire damage to chosen creatures near your destination."]]),
});
for (const lineage of ["Air Genasi", "Earth Genasi", "Fire Genasi", "Water Genasi"]) {
  CHOICES[lineage] = choiceList("Innate spellcasting ability", ["Intelligence", "Wisdom", "Charisma"]);
}
for (const level of [6, 7, 8, 9]) {
  CHOICES["Arcane Mastery " + level] = { label: "Level " + level + " wizard spell", n: () => 1, opts: c => choiceSpellOptions(c, s => s.l === level && s.c.includes("Wizard")) };
}
const additionalFeatureChoices = {
  "Giant Power": ["Giant Power language"],
  "Arcane Mastery": [6, 7, 8, 9].map(level => "Arcane Mastery " + level)
};
function featureChoiceHTML(c, k) {
  const keys = CHOICES[k] ? [k] : [];
  return keys.concat(additionalFeatureChoices[k] || []).map(key => choiceHTML(c, key)).join("");
}
const choiceOf = (c, k) => ((c.choices || {})[k]) || [];
const hasChoice = (c, k, id) => choiceOf(c, k).includes(id);
function choiceHTML(c, k) {
  const S = CHOICES[k]; if (!S) return "";
  const n = S.n(c); if (!n) return "";
  const O = S.opts(c), have = choiceOf(c, k).filter(id => O.some(o => o[0] === id)), left = n - have.length, kk = esc(k);
  return `<div class="choice"><span class="lbl" style="margin:0">${esc(S.label)} <span class="muted">${have.length}/${n}</span></span>
    ${have.map(id => { const o = O.find(x => x[0] === id); return `<span class="tag gold" title="${esc(o[2])}">${esc(o[1])}<button type="button" class="icon-btn" data-choicerm="${kk}|${esc(id)}" aria-label="Remove ${esc(o[1])}">✕</button></span>`; }).join("")}
    ${left > 0 ? `<select data-choice="${kk}" aria-label="Choose ${esc(S.label)}"><option value="">${have.length ? "Add another…" : "Choose…"}</option>${O.filter(o => !have.includes(o[0])).map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join("")}</select>` : ""}
    ${have.length ? `<ul class="plain choice-notes">${have.map(id => { const o = O.find(x => x[0] === id); return o[2] ? `<li><b>${esc(o[1])}:</b> ${esc(o[2])}</li>` : ""; }).join("")}</ul>` : ""}</div>`;
}
/* Magic Initiate: a spell list, two cantrips and a 1st-level spell, added to the character's spells */
function miState(c) { const L = choiceOf(c, "Feat: Magic Initiate"); return { list: (L.find(x => x.startsWith("list:")) || "").slice(5), can: L.filter(x => x.startsWith("c:")).map(x => x.slice(2)), one: L.filter(x => x.startsWith("s:")).map(x => x.slice(2)) }; }
function miLists(c) { const bg = (c.feats || []).find(f => f.bgFeat && f.f === "Feat: Magic Initiate"); if (bg && bg.note) return [bg.note]; return edOf(c) === "2024" ? ["Cleric", "Druid", "Wizard"] : ["Bard", "Cleric", "Druid", "Sorcerer", "Warlock", "Wizard"]; }
function miHTML(c) {
  spLoad(); const ed = edOf(c), M = miState(c), lists = miLists(c), list = M.list || (lists.length === 1 ? lists[0] : "");
  const pool = l => (SP.data[ed] || []).filter(s => !s.pend && s.l === l && (s.c || []).includes(list)).map(s => s.n).sort();
  const pick = (kind, l, n, have) => `${have.map(x => `<span class="tag gold">${esc(x)}<button type="button" class="icon-btn" data-mirm="${kind}:${esc(x)}" aria-label="Remove ${esc(x)}">✕</button></span>`).join("")}${have.length < n ? `<select data-mi="${kind}" aria-label="${l ? "1st-level spell" : "Cantrip"}"><option value="">${l ? "Choose a 1st-level spell…" : "Choose a cantrip…"}</option>${pool(l).filter(x => !have.includes(x)).map(x => `<option>${esc(x)}</option>`).join("")}</select>` : ""}`;
  return `<div class="choice"><span class="lbl" style="margin:0">Spell list</span>${lists.length > 1 ? `<select data-mi="list" aria-label="Spell list"><option value="">Choose…</option>${lists.map(l => `<option ${list === l ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>` : `<span class="tag">${esc(list)}</span>`}
    ${list ? `<span class="lbl" style="margin:0">Cantrips ${M.can.length}/2</span>${pick("c", 0, 2, M.can)}<span class="lbl" style="margin:0">1st level ${M.one.length}/1</span>${pick("s", 1, 1, M.one)}
    <p class="hint" style="margin:4px 0 0">These are added to your spells. Cast the 1st-level spell once per long rest without a slot ("Without a slot"), or with your slots.</p>` : ""}</div>`;
}
function miSync(c) {
  const M = miState(c), ed = edOf(c);
  c.prepared = (c.prepared || []).filter(p => p.src !== "Magic Initiate");
  [...M.can, ...M.one].forEach(n => { const s = spellOf(ed, n); if (s) c.prepared.push({ n: s.n, l: s.l, ed, src: "Magic Initiate" }); });
}
function actRun(c, name, choice) {
  const a = pcAbilities(c).find(x => x.name === name), S = a && actSpec(a); if (!S) return "";
  c.active = c.active || {}; c.used = c.used || {};
  if (S.kind === "toggle" && c.active[name]) { delete c.active[name]; if (name === "Wild Shape") delete c.formHp; return `${name} ended.`; }
  if (S.dialog) { S.dialog(c, a); return null; }
  const ch = actChoices(c, S).length ? (choice || actChoices(c, S)[0][0]) : null;
  const r = a.res ? pcResources(c).find(x => x.key === a.res) : null;
  let spent = 0;
  if (r && !S.noCost) {
    const cost = typeof S.cost === "function" ? S.cost(c, ch) : S.cost != null ? S.cost : 1;
    if (r.max !== Infinity) { if (resLeft(c, r) < cost) return `Not enough ${r.name.toLowerCase()} left (needs ${cost}).`; c.used[r.key] = (+c.used[r.key] || 0) + cost; }
    spent = cost;
  }
  if (S.kind === "toggle") { c.active[name] = ch || true; return S.start ? S.start(c, ch) : `${name} active${ch ? `: ${(actChoices(c, S).find(x => x[0] === ch) || [, ""])[1]}` : ""}.`; }
  return S.use ? S.use(c, ch, spent) || "" : `${name} used.`;
}
function rcAbilitiesHTML(c) {
  const R = Object.fromEntries(pcResources(c).map(r => [r.key, r])), A = pcAbilities(c), shown = new Set();
  const rows = A.map(a => {
    const r = a.res && !shown.has(a.res) ? R[a.res] : null; if (r) shown.add(a.res);
    const ref = a.res && !r && R[a.res] ? ` <span class="muted" style="font-size:13px">uses ${esc(R[a.res].name.toLowerCase())}</span>` : "";
    return `<div class="abl${(c.active || {})[a.name] && actSpec(a) && actSpec(a).kind === "toggle" ? " on" : ""}"><div class="abl-h"><b>${esc(a.name)}</b><span class="tag">${esc(a.when)}</span>${a.src ? `<span class="muted" style="font-size:13px">${esc(a.src)}</span>` : ""}${ref}<span class="sp"></span>${r ? `<span class="muted" style="font-size:13px">${esc(r.name)}</span>${resCtr(c, r)}` : ""}${actControls(c, a, R)}</div><div class="ft-desc">${esc(a.text)}</div></div>`;
  });
  return rcActiveHTML(c) + (rows.length ? rows.join("") : `<p class="muted">No active class abilities at this level yet.</p>`);
}
function rcSlotsHTML(c) {
  const R = pcResources(c).filter(r => r.key === "pact" || r.key.startsWith("slot"));
  if (!R.length) return c.spell && c.spell.note ? `<div>${esc(c.spell.note)}</div>` : `<div class="muted">No spell slots until level 2.</div>`;
  return `<div class="slots">${R.map(r => `<div class="slot"><span>${esc(r.name)}</span>${resCtr(c, r)}</div>`).join("")}</div>${c.spell.note ? `<p class="hint" style="margin:4px 0 0">${esc(c.spell.note)}.</p>` : ""}`;
}
function pcRest(c, kind) {
  c.used = c.used || {};
  const back = [];
  pcResources(c).forEach(r => {
    const u = Math.min(r.max, +c.used[r.key] || 0); if (!u) return;
    let nu = u;
    if (kind === "long") nu = r.key === "hd" ? (edOf(c) === "2024" ? 0 : Math.max(0, u - Math.max(1, Math.floor(c.level / 2)))) : 0;
    else if (r.recharge === "short") nu = 0;
    else if (r.recharge === "short1") nu = u - 1;
    if (nu !== u) { c.used[r.key] = nu; back.push(r.name); }
  });
  if (kind === "long") { const z = +c.hpCur === 0; c.hpCur = c.hp; c.hpTemp = ""; pcHealed(c, z); c.death = { s: 0, f: 0 }; if (c.conc) { delete c.conc; delete c.concCheck; c.fxEnded = true; } if (exhOf(c)) { c.exh = exhOf(c) - 1; back.push("Exhaustion level"); } if (c.fx && Object.values(c.fx).some(Boolean)) { c.fx = {}; c.fxEnded = true; } }
  Object.keys(c.active || {}).forEach(n => { if (!ACT[n] || ACT[n].kind !== "persist") { delete c.active[n]; c.fxEnded = true; } });
  delete c.formHp;
  pcACApply(c);
  return back;
}
function rcAttacksHTML(c) { return (c.attacks || []).map((a, i) => `<div class="enc atk-row" style="border-color:var(--gold)"><div>${atkLine(a)}</div><div class="atk-btns">${a.save ? "" : `<button type="button" class="btn sm" data-roll="atk:${i}" title="Roll to hit">🎲 ${sgn(a.hit)}${rollMark(c, "attack", a.ab, { tags: a.tags })}</button>`}<button type="button" class="btn sm" data-roll="dmg:${i}" title="Roll damage">🎲 ${esc(a.dmg)}</button></div></div>`).join(""); }
function rcEquippedHTML(c) {
  const ed = edOf(c), L = (c.inv || []).filter(i => i.eq && (+i.qty || 0) > 0);
  if (!L.length) return `<p class="muted">Nothing equipped. Tick <b>Equip</b> next to an item in the inventory.</p>`;
  return `<ul class="plain">${L.map(i => {
    const ref = inventoryCatalogItem(i, ed), w = eqWeaponOf(i, ed), a = (c.attacks || []).find(x => x.iid === i.id), ar = eqArmorOf(i, ed);
    const ac = ar ? ((ar.st.find(([k]) => k === "Armor Class") || [])[1] || "") + (eqArmorBonus(i, ed) ? ` +${eqArmorBonus(i, ed)}` : i.att && !i.attuned && /\+[1-3]/.test(i.n) ? " (attune for its bonus)" : "") : null;
    const what = a ? `${sgn(a.hit)} to hit, ${esc(a.dmg)} ${esc(a.type)}` : ac ? `AC ${esc(ac)}` : w ? "" : ref && /Weapon/.test(ref.cat + (ref.type || "")) ? `<span class="hint">Add its weapon to the name, e.g. “Longsword +1”, to get an attack</span>` : esc(i.note || "");
    return `<li>${inventoryDetailsButton(i, i.n || "Item details")}${+i.qty > 1 ? ` <span class="muted">×${esc(i.qty)}</span>` : ""}${what ? ` <span class="muted">· ${what}</span>` : ""}</li>`;
  }).join("")}</ul>`;
}
