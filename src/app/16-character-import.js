/* 16-character-import.js: Character import: 5e Companion App files, PDF sheets, and the Import character window. */

/* ======================= Character import =======================
   A reader turns a file into a Draft: { opts (generateCharacter options), final (the scores the file shows), extras (stored
   fields applied after the build), homebrew (entries to create), report: { matched, made, differ, dropped } }.
   compImport reads the 5e Companion App's JSON; pdfImport reads a fillable PDF sheet. importBuild turns a Draft into a
   character without saving it; importCommit saves it. */
const IMP_SRC = "5e Companion App";
const impNorm = s => String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\[\]]+/g, " ").trim();
const impStrip = s => String(s || "").replace(/\s*\[(?!ua\])[^\]]*\]\s*$/i, "").trim(); // drop a source tag like [PHB] or [TCE], keep [UA]
const impTitle = s => String(s || "").replace(/_/g, " ").replace(/\s*\[[^\]]*\]\s*$/, "").replace(/\b\w/g, ch => ch.toUpperCase()).replace(/\bOf\b/g, "of").replace(/\bThe\b/g, "the").trim();
const impSame = (a, b) => impNorm(a) === impNorm(b);
const impCut = (s, n) => String(s ?? "").trim().slice(0, n);
const impJSON = s => { if (s && typeof s === "object") return s; try { return JSON.parse(s); } catch { return null; } };
const impDesc = f => impCut((f && (f.descriptionModels || f.descriptions) || []).map(d => d.description).filter(Boolean).join("\n\n") || (f && f.description) || "", 4000);
const impFeat = x => (x && x.feat) || x || {};
// a homebrew entry of this kind and name that already exists (campaign, pending or an extra book), or null
const impHave = (kind, name, cls) => hbAny(kind).find(x => impSame(x.name, name) && (kind !== "subclass" || x.cls === cls)) || null;
const impKind = x => x && x.book ? "extra book" : "homebrew";
/* Names from a file, allowing for spelling mistakes (2026-11-23). `tiers` are lists of names, best first (built-in, then
   the books, then homebrew). Each pass tries every tier before the next, looser pass: the same letters (case, spaces,
   punctuation and a source tag aside); then, with `part`, a name that starts or ends with the file's ("Devotion" ->
   "Oath of Devotion", 5+ letters); then, for 5+ letters with the same first letter, one letter wrong, missing or extra,
   or two letters swapped. Never more: a near-miss like Warforged/Gearforged or Child of the Sun/Sea is a different
   thing. Two different names equally close is no match. -> { name, tier, fixed (the file spelled it differently) } or null */
function impFuzzy(tiers, raw, part) {
  const nm = impStrip(raw), k = impLetters(nm); if (!k) return null;
  const T = tiers.map(L => [...new Set((L || []).filter(Boolean))].map(n => [n, impLetters(n)]));
  const done = (n, tier) => ({ name: n, tier, fixed: impNorm(n) !== impNorm(nm) });
  for (let t = 0; t < T.length; t++) { const h = T[t].find(([, x]) => x === k); if (h) return done(h[0], t); }
  if (/\[ua\]/i.test(nm)) return null; /* an Unearthed Arcana version is its own thing */
  if (part && k.length >= 5) for (let t = 0; t < T.length; t++) {
    const h = T[t].filter(([, x]) => x.endsWith(k) || x.startsWith(k));
    if (h.length === 1) return done(h[0][0], t); if (h.length > 1) return null;
  }
  if (k.length < 5) return null;
  const swap = x => x.length === k.length && [...k].some((ch, i) => i + 1 < k.length && ch !== x[i] && k.slice(0, i) === x.slice(0, i) && k[i] === x[i + 1] && k[i + 1] === x[i] && k.slice(i + 2) === x.slice(i + 2));
  for (let t = 0; t < T.length; t++) {
    const hits = T[t].filter(([, x]) => x[0] === k[0] && (impDist(k, x, 1) <= 1 || swap(x)));
    if (hits.length) return hits.length === 1 ? done(hits[0][0], t) : null;
  }
  return null;
}
/* imported homebrew (made from an earlier file) is tried last, so a misspelled copy never beats the real name */
const impFuzzyFirst = (tiers, imported, raw, part) => impFuzzy(tiers, raw, part) || impFuzzy([imported], raw, part);
/* reports a match: a corrected spelling goes under "Different from the file", so the user checks it */
function impReport(D, what, m, raw, tag = "") {
  if (m.fixed) D.report.differ.push(`${what}: the file says “${impCut(impStrip(raw), 60)}”, so the Forge used ${m.name}${tag}. Change it on the sheet if that's wrong`);
  else D.report.matched.push(`${what}: ${m.name}${tag}`);
}
/* a class in this rules set: built-in, then the books, then homebrew; a misspelled name is matched and reported */
function impClassMatch(ed, name, D) {
  const L = classList(ed), hx = k => classData(ed, k).hbx;
  const m = impFuzzyFirst([L.filter(k => !hx(k)), L.filter(k => hx(k) && hx(k).book), L.filter(k => hx(k) && !hx(k).book && !hbFromImport(hx(k)))],
    L.filter(k => hbFromImport(hx(k))), name, false);
  if (m && m.fixed) impReport(D, "Class", m, name);
  return m ? m.name : null;
}
function impSubclass(ed, cls, name, arch, D) {
  let nm = impStrip(name); if (!nm) return null;
  /* an id like paladin_oathbreaker names the class first */
  const bare = nm.replace(new RegExp("^" + cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s_:-]+", "i"), "").trim(); if (bare) nm = bare;
  const sub = x => x.kind === "subclass" && x.cls === cls && hbEdOk(x, ed), names = L => L.map(x => x.name);
  const home = [...hbAny("subclass").filter(x => !x.book && sub(x)), ...D.homebrew.filter(sub)];
  const books = bookSubclassEntries(ed, cls), other = bookSubclassEntries(ed === "2014" ? "2024" : "2014", cls);
  const tiers = [(((SUBCLASSES[ed] || SUBCLASSES["2014"])[cls]) || []).map(x => x[0]), names(books), names(home.filter(x => !hbFromImport(x))), names(other)];
  const m = impFuzzyFirst(tiers, names(home.filter(hbFromImport)), nm, true);
  if (m) {
    const tag = m.tier === 1 || m.tier === 3 ? " (extra book)" : m.tier === 0 ? "" : " (homebrew)";
    impReport(D, `${cls} subclass`, m, nm, tag); return m.name;
  }
  D.homebrew.push({ id: uid("hb"), kind: "subclass", src: IMP_SRC, ed, cls, name: impCut(nm, 60), desc: "",
    features: ((arch && arch.features) || []).map(f => ({ l: clamp(+f.level || +impFeat(f).level || 1, 1, 20), n: impCut(impFeat(f).name, 60), d: impDesc(impFeat(f)), fx: [] })).filter(f => f.n) });
  D.report.made.push(`${impCut(nm, 60)} (${cls} subclass)`);
  return impCut(nm, 60);
}
/* species, background and feat names, with spelling mistakes allowed (built-in and book names before homebrew) */
function impSpeciesMatch(ed, name, D) {
  const R = PC_RACES[ed], L = Object.keys(R).filter(k => !R[k].pend), hb = n => hbAny("species").find(x => x.name === n);
  const m = impFuzzyFirst([L.filter(n => !hb(n)), L.filter(n => hb(n) && hb(n).book), L.filter(n => hb(n) && !hb(n).book && !hbFromImport(hb(n)))], L.filter(n => hbFromImport(hb(n))), name, false);
  if (m) impReport(D, "Species", m, name);
  return m ? m.name : null;
}
function impListMatch(what, list, name, D) {
  const m = impFuzzy([list], name, false); if (!m) return null;
  impReport(D, what, m, name); return m.name;
}
/* A class the Forge doesn't have -> a homebrew class (a matching homebrew class is used if there is one). `def` is the
   Companion App's class (hit die, saves, skills, proficiencies, equipment, caster type, features with their text);
   without one (PDF, MythWeaver) the class is a sketch for the DM to fill in, with the saves the sheet shows if known. */
const IMP_AB = { strength: "str", dexterity: "dex", constitution: "con", intelligence: "int", wisdom: "wis", charisma: "cha", str: "str", dex: "dex", con: "con", int: "int", wis: "wis", cha: "cha" };
function impClass(ed, name, def, D, src, saves) {
  const nm = impCut(impStrip(name), 60); if (!nm) return null;
  const have = impHave("class", nm) || D.homebrew.find(x => x.kind === "class" && impSame(x.name, nm));
  if (have) { D.report.matched.push(`Class: ${have.name} (homebrew)`); return have.name; }
  const d = def || {}, abOf = v => IMP_AB[String(v || "").toLowerCase()] || null;
  const sv = def ? Object.entries(d.savingThrows || {}).filter(([, v]) => v).map(([k]) => abOf(k)).filter(Boolean) : (saves || []);
  const cs = (d.classSkills || [])[0] || {}, skFrom = (cs.skillsModels || []).map(x => ALL_SKILLS.find(k => impSame(k, x.name))).filter(Boolean);
  const prof = l => (l || []).map(x => String(x.proficiency || x.name || "").trim()).filter(Boolean);
  const armorTxt = prof(d.armorProficiencies).join(" ").toLowerCase();
  const weapons = prof(d.weaponProficiencies).map(x => x === "all_simple" ? "Simple weapons" : x === "all_martial" ? "Martial weapons" : x.replace(/_/g, " "));
  const kit = (d.classEquipment || []).map(g => ((g.equipmentsModels || [])[0])).filter(Boolean).map(e => (+e.number > 1 ? `${e.number} ` : "") + e.name);
  const cw = d.classWeapon || {}, castKind = { FULL: "full", HALF: "half", PACT: "pact", WARLOCK: "pact" }[String(d.effectiveCasterLevel || "").toUpperCase()] || "none";
  const castAb = abOf(d.spellcastingAbility), wAb = abOf(cw.abilityName);
  const x = { id: uid("hb"), kind: "class", src: src || IMP_SRC, ed, name: nm, desc: def ? "" : `Imported from ${src}: fill in its details (hit die, skills, features).`,
    hd: +(String(d.hitDie || "").replace(/\D/g, "")) || 8, pri: [...new Set([castKind !== "none" && castAb, wAb, ...sv].filter(Boolean))].slice(0, 2),
    saves: sv.slice(0, 2), skills: { n: clamp(+cs.amountOfChoice || 2, 0, 8), any: !skFrom.length, from: skFrom },
    armor: ["light", "medium", "heavy"].filter(k => armorTxt.includes(k)).concat(/shield/.test(armorTxt) ? ["shield"] : []),
    weapons: impCut(weapons.join(", "), 300), tools: impCut(prof(d.toolProficiencies).join(", "), 300), kit: impCut(kit.join(", "), 300),
    wpn: { n: impCut(cw.name, 40) || "Simple weapon", d: `${+cw.diceAmount || 1}${String(cw.diceTypeName || "d4").toLowerCase()}`, ab: wAb || "str" },
    cast: castKind, ...(castKind !== "none" ? { castAb: castAb || "int", spellsFrom: "" } : {}),
    subName: `${nm} subclass`, subLv: clamp(+d.archetypeSelectionLevel || 3, 1, 20),
    features: (d.features || []).map(f => ({ l: clamp(+f.level || +impFeat(f).level || 1, 1, 20), n: impCut(impFeat(f).name, 60), d: impDesc(impFeat(f)), fx: [] })).filter(f => f.n) };
  if (!x.pri.length) x.pri = ["str"];
  if (x.saves.length < 2) x.saves = [...new Set([...x.saves, ...x.pri, "con", "wis"])].slice(0, 2);
  if (!/^\d+d\d+$/.test(x.wpn.d)) x.wpn.d = "1d4";
  D.homebrew.push(x);
  D.report.made.push(`${nm} (class${def ? "" : ", details to fill in"})`);
  return nm;
}
// "20 Arrows" -> qty 20; Items-tab matching with a few extra tries ("Scalemail", "Set Of Common Clothes")
/* an imported item's weight: the Forge's ammunition weighs a bundle of 20, and imports count single arrows or bolts (2026-11-26) */
const impW = g => !g ? 0 : g.cat === "Ammunition" ? Math.round((+g.w || 0) / 20 * 1000) / 1000 : +g.w || 0;
/* everyday names other apps use for an item the Forge names differently (owner, 2026-11-26: "code for naming mismatches") */
const IMP_GEAR_SYN = { "holy symbol": "Amulet", "holysymbol": "Amulet", "arrows": "Arrow", "bolts": "Crossbow bolt", "crossbow bolts": "Crossbow bolt", "rations": "Rations (1 day)", "ration": "Rations (1 day)", "bedroll": "Bedroll", "waterskin": "Waterskin", "torches": "Torch", "spell focus": "Arcane focus", "arcane focus": "Crystal", "druidic focus": "Sprig of mistletoe" };
/* one name -> a Forge gear item: exact (with "set of" dropped, "… Armor" added, a squashed name split), then the same letters */
function impGearFind(ed, name) {
  const tries = [name, name.replace(/^(a\s+)?set\s+of\s+/i, "")];
  if (!/armou?r$/i.test(name)) tries.push(name + " Armor"); /* "Half Plate", "Studded Leather" -> "… Armor" (owner's file, 2026-11-26) */
  const w = name.trim().split(/\s+/); if (w.length === 2) tries.push(`${w[1]}, ${w[0]}`); /* "iron pot" -> "Pot, iron" */
  if (/^\S+$/.test(name)) for (let i = 3; i <= name.length - 3; i++) tries.push(name.slice(0, i) + " " + name.slice(i));
  for (const t of tries) { const g = eqGear(ed, t); if (g) return g; }
  itLoad(); const k = impLetters(name), ks = k.replace(/s$/, ""), G = IT.data[ed === "2014" ? "2014" : "2024"].filter(x => x.kind === "gear");
  if (!k) return null;
  return G.find(x => [k, ks].includes(impLetters(x.n)) || [k, ks].includes(impLetters(x.n).replace(/s$/, ""))) || null;
}
/* a gear line -> { g: the Forge item or null, n: the name to show, qty }. The Forge's name is used for a plain match; a
   magic or named version ("Shield +1", "Morningstar Of Bleeding", "belt pouch") keeps its own name on the base item, so the
   sheet still reads its +1 and attacks with it. Tried in order: exact, magic/named base, everyday names, the last words,
   then a small typo (owner, 2026-11-26). */
function impGear(ed, raw) {
  let name = String(raw || "").trim(), qty = 1, m;
  if ((m = name.match(/^(\d+)\s+(.+)$/))) { qty = +m[1]; name = m[2]; }
  if ((m = name.match(/^(.*?\S)\s*\((\d+)\)$/))) { qty *= +m[2]; name = m[1]; } /* "bolts (20)" */
  const own = name, magic = /(^|\s)\+\s*\d\b/.test(name);
  const base = name.replace(/\s*\+\s*\d+\s*$/, "").replace(/^\+\s*\d+\s+/, "").replace(/\s+of\s+.+$/i, "").trim();
  if (magic && base) { const g = impGearFind(ed, base); if (g) return { g, n: own, qty }; }
  { const g = impGearFind(ed, name); if (g) return { g, n: g.n, qty }; }
  if (base && base !== name && base.length >= 3) { const g = impGearFind(ed, base); if (g) return { g, n: own, qty }; }
  const syn = IMP_GEAR_SYN[name.toLowerCase()] || IMP_GEAR_SYN[base.toLowerCase()];
  if (syn) { const g = impGearFind(ed, syn); if (g) return { g, n: /^(arrows|bolts|crossbow bolts|rations?|torches|bedroll|waterskin)$/i.test(name) ? g.n : own, qty }; }
  const w = base.split(/\s+/);
  for (let i = 1; i < w.length; i++) { const t = w.slice(i).join(" "); if (t.length < 4) continue; const g = impGearFind(ed, t); if (g) return { g, n: own, qty }; } /* "belt pouch" -> Pouch */
  itLoad(); const G = IT.data[ed === "2014" ? "2014" : "2024"].filter(x => x.kind === "gear");
  const fz = impFuzzy([G.map(x => x.n)], name); /* a small typo: "Longswrod" */
  if (fz) { const g = G.find(x => x.n === fz.name); if (g) return { g, n: g.n, qty }; }
  return { g: null, n: own, qty };
}
// spells: an exact name (any case) in this rule set, then the other one
// spells: exact letters first, then a name that starts a built-in name, then up to 2 letters different (names of 6+ letters)
const impLetters = s => String(s || "").toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z]/g, "");
function impDist(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { const cur = [i]; let low = i; for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); low = Math.min(low, cur[j]); } if (low > max) return max + 1; prev = cur; }
  return prev[b.length];
}
/* a spell matched despite its spelling goes under "Different from the file", like classes (QA-3, 2026-11-23) */
function impSpellSaid(D, raw, m) {
  if (impNorm(impStrip(raw)) !== impNorm(m.s.n)) D.report.differ.push(`Spell: the file says “${impCut(raw, 60)}”, so the Forge used ${m.s.n}. Change it on the sheet if that's wrong`);
}
function spellMatch(ed, name) {
  const m = spellMatch1(ed, name); if (m) return m;
  const rest = String(name || "").replace(/^\s*[A-Z][a-z]+(?:[’']s|s)\s+/, "");
  if (rest !== String(name || "") && impLetters(rest).length >= 6) { const m2 = spellMatch1(ed, rest); if (m2) return { ...m2, fuzzy: true }; }
  return null;
}
function spellMatch1(ed, name) {
  spLoad(); const k = impLetters(name); if (!k) return null;
  const eds = [ed, ed === "2014" ? "2024" : "2014"], fuzzy = s => s.n.toLowerCase() !== String(name).trim().toLowerCase();
  for (const e of eds) { const s = (SP.data[e] || []).find(x => !x.pend && !x.shadow && impLetters(x.n) === k); if (s) return { s, ed: e, fuzzy: fuzzy(s) }; }
  if (k.length < 6) return null;
  for (const e of eds) { const L = (SP.data[e] || []).filter(x => !x.pend && !x.shadow && impLetters(x.n).startsWith(k)).sort((a, b) => a.n.length - b.n.length); if (L.length) return { s: L[0], ed: e, fuzzy: true }; }
  for (const e of eds) {
    let best = null;
    for (const x of SP.data[e] || []) { if (x.pend || x.shadow) continue; const d = impDist(k, impLetters(x.n), 2); if (d <= 2 && (!best || d < best.d || d === best.d && x.n.length < best.s.n.length)) best = { s: x, d }; }
    if (best) return { s: best.s, ed: e, fuzzy: true };
  }
  return null;
}
const IMP_SKILL = Object.fromEntries(ALL_SKILLS.map(k => [k.toUpperCase().replace(/ /g, "_"), k]));
/* A character's gender from an imported file: a gender, sex or pronouns field anywhere in `src` (keys only), else the
   pronouns used in its own story `texts` (backstory, personality, notes; never rules text). The Forge has male and female
   names, so the answer is "male", "female" or "" (not known: the Forge picks one, as for a new character). */
function impGender(src, texts) {
  let field = "";
  const walk = (v, k, d) => {
    if (field || d > 6 || v == null) return;
    if (typeof v !== "object") { if (/gender|^sex$|pronoun/i.test(k || "") && String(v).trim()) field = String(v); return; }
    for (const [kk, vv] of Object.entries(v)) walk(vv, Array.isArray(v) ? k : kk, d + 1);
  };
  walk(src, "", 0);
  const f = field.trim().toLowerCase();
  if (f) {
    if (/^(m|male|man|boy|masculine|he\b)/.test(f)) return { g: "male", from: "the file" };
    if (/^(f|female|woman|girl|feminine|she\b)/.test(f)) return { g: "female", from: "the file" };
    return { g: "", from: "" };
  }
  const all = (texts || []).filter(t => typeof t === "string").join(" ").toLowerCase().replace(/\b(he|she|his|her|him)\s*(or|\/)\s*(he|she|his|her|him|hers)\b/g, " ");
  const he = (all.match(/\b(he|him|his|himself)\b/g) || []).length, she = (all.match(/\b(she|her|hers|herself)\b/g) || []).length;
  if (he >= 2 && he >= 2 * she) return { g: "male", from: "the backstory" };
  if (she >= 2 && she >= 2 * he) return { g: "female", from: "the backstory" };
  return { g: "", from: "" };
}
/* puts the gender on the Draft and says where it came from */
function impGenderSet(D, G) {
  if (G.g) { D.opts.gender = G.g; D.report.matched.push(`Gender: ${G.g} (from ${G.from})`); }
  else D.report.differ.push("The file doesn't say the character's gender, so the Forge picked one. Change it on the sheet if needed");
}

function compImport(j, ed) {
  const bad = { error: "This file isn't a 5e Companion App character. In the app, open the character and use Export or Share to save its file." };
  if (!j || typeof j !== "object" || j.jsonType !== "character" || !Array.isArray(j.jobs) || !j.jobs.length) return bad;
  ed = ed === "2024" ? "2024" : "2014";
  const D = { src: IMP_SRC, opts: {}, final: {}, extras: {}, homebrew: [], report: { matched: [], made: [], differ: [], dropped: [] } }, notes = [];
  // classes
  const defs = {}; ((j.allRequiredClasses && j.allRequiredClasses.jobs) || []).map(impJSON).filter(Boolean).forEach(d => defs[d.id] = d);
  const classes = [];
  for (const jb of j.jobs) {
    const def = defs[jb.jobId] || {}, nm = impStrip(def.name || impTitle(jb.jobId));
    const cls = impClassMatch(ed, nm, D) || impClass(ed, nm, defs[jb.jobId], D, IMP_SRC);
    if (!cls) return { error: "This character's class has no name in the file, so it can't be imported." };
    const lv = clamp(+jb.level || 1, 1, 20);
    let subclass = null;
    const arch = (def.archetypes || []).find(a => a.id === jb.archetypeId);
    if (jb.archetypeId) subclass = impSubclass(ed, cls, arch ? arch.name : impTitle(jb.archetypeId) + (/\[ua\]$/i.test(jb.archetypeId) ? " [UA]" : ""), arch, D); /* an id-only Unearthed Arcana subclass keeps its [UA] */
    const st = (def.subtypes || []).find(a => a.id === jb.subtypeId);
    classes.push({ cls, lv, subclass, style: st ? impStrip(st.name) : jb.subtypeId ? impTitle(jb.subtypeId.replace(/^[a-z]+_/, "")) : "" });
  }
  const [main, ...more] = classes;
  D.report.matched.push(classes.map(x => `${x.cls} ${x.lv}`).join(" / "));
  // species
  const rr = impJSON(j.requiredRace) || {}, rName = impStrip(rr.name || impTitle(j.race && j.race.raceId));
  let race = null, sub = "none";
  const R = PC_RACES[ed];
  race = Object.keys(R).find(k => !R[k].pend && impSame(k, rName)) || null;
  if (!race) for (const k of Object.keys(R)) { const subs = R[k].subs || {}; const sk = Object.keys(subs).find(s => impSame(s, rName) || impSame(subs[s].label, rName)); if (sk) { race = k; sub = sk; break; } }
  if (race) D.report.matched.push(`Species: ${sub !== "none" ? sub : race}`);
  else race = impSpeciesMatch(ed, rName, D);
  if (!race) {
    const have = impHave("species", rName) || null;
    if (have) { race = have.name; D.report.matched.push(`Species: ${have.name} (${impKind(have)})`); }
    else {
      const A = rr.abilityScores || {}, map = { str: "str", dex: "dex", con: "con", int: "int", intelligence: "int", wis: "wis", cha: "cha" };
      const asi = {}; Object.entries(A).forEach(([k, v]) => { if (map[k] && +v) asi[map[k]] = clamp(+v, -2, 3); });
      race = impCut(rName || "Unknown species", 60);
      D.homebrew.push({ id: uid("hb"), kind: "species", src: IMP_SRC, ed, name: race, desc: "", asi, speed: clamp(+((rr.speed && rr.speed.normal) ?? rr.speed) || 30, 0, 120), skills: [], term: "",
        traits: (rr.traits || []).map(t => ({ l: clamp(+t.level || 1, 1, 20), n: impCut(impFeat(t).name, 60), d: impDesc(impFeat(t)), fx: [] })).filter(t => t.n), subs: [] });
      D.report.made.push(`${race} (species)`);
    }
  }
  // background
  const bb = impJSON(j.requiredBackground) || {}, bName = impStrip(bb.name || impTitle(j.background && j.background.backgroundId));
  let bg = impListMatch("Background", bgList(ed), bName, D) || (impHave("background", bName) || {}).name || null;
  if (bg) { if (![...D.report.matched, ...D.report.differ].some(t => t.startsWith("Background: "))) D.report.matched.push(`Background: ${bg}`); }
  else if (bName) {
    bg = impCut(bName, 60);
    const sk = [...new Set(((j.background && j.background.skillProficiencies) || []).map(x => IMP_SKILL[x.name]).filter(Boolean))].slice(0, 2);
    D.homebrew.push({ id: uid("hb"), kind: "background", src: IMP_SRC, ed, name: bg, desc: impCut((bb.features || []).map(f => `${impFeat(f).name}: ${impDesc(impFeat(f))}`).join("\n\n"), 4000), skills: sk, feat: "", gear: "", fx: [] });
    D.report.made.push(`${bg} (background)`);
  }
  // feats
  const bonusFeats = [];
  (j.feats || []).forEach(f => {
    const F = impFeat(f), nm = impStrip(F.name); if (!nm) return;
    const built = impListMatch("Feat", featList(ed).map(x => x[0]), nm, D), have = !built && impHave("feat", nm);
    if (built || have) { bonusFeats.push({ n: built || have.name, l: 1 }); if (!built) D.report.matched.push(`Feat: ${have.name}`); return; }
    D.homebrew.push({ id: uid("hb"), kind: "feat", src: IMP_SRC, ed, name: impCut(nm, 60), desc: impDesc(F), group: "g", req: "", ab: "", fx: [] });
    bonusFeats.push({ n: impCut(nm, 60), l: 1 }); D.report.made.push(`${nm} (feat)`);
  });
  // scores and skills
  const AK = { str: "strength", dex: "dexterity", con: "constitution", int: "intelligence", wis: "wisdom", cha: "charisma" };
  for (const a of AB) { const v = +((j[AK[a]] || {}).score); if (!v) return { error: "This Companion App file has no ability scores." }; D.final[a] = v; }
  const keepSkills = [], keepExpert = [];
  (j.skills || []).forEach(s => { const k = IMP_SKILL[s.typeName]; if (!k) return; if (["FULL", "EXPERTISE"].includes(s.proficiencyName)) keepSkills.push(k); if (s.proficiencyName === "EXPERTISE") keepExpert.push(k); });
  const appSaves = AB.filter(a => (j[AK[a]] || {}).save);
  // spells
  const prepared = [];
  (j.spells || []).forEach(sp => {
    const m = spellMatch(ed, sp.name);
    if (m) { if (!prepared.some(x => x.n === m.s.n)) prepared.push({ n: m.s.n, l: m.s.l, ed: m.ed }); impSpellSaid(D, sp.name, m); return; }
    const nm = impCut(sp.name, 60); if (!nm) return;
    const have = impHave("spell", nm) || D.homebrew.find(x => x.kind === "spell" && impSame(x.name, nm));
    if (!have) {
      const comp = String(sp.components || ""), mat = comp.match(/M\s*\(([^)]*)\)/);
      D.homebrew.push({ id: uid("hb"), kind: "spell", src: IMP_SRC, ed, name: nm, desc: impCut(sp.description, 4000), l: clamp(+sp.level || 0, 0, 9), s: SP_SCHOOLS.find(k => impSame(k, sp.school)) || "Evocation",
        c: String(sp.classes || "").split(/,\s*/).map(x => Object.keys(CLASS_DATA).find(k => impSame(k, x))).filter(Boolean), t: impCut(sp.castingTime, 120), r: impCut(sp.range, 80),
        cp: ["V", "S", "M"].filter(k => new RegExp(`(^|[ ,])${k}([ ,(]|$)`).test(comp)).join(""), m: mat ? impCut(mat[1], 200) : "", du: impCut(sp.duration, 80), co: /concentration/i.test(sp.duration || ""), ri: !!sp.isRitual, h: impCut(sp.higherLevels, 2000) });
      D.report.made.push(`${nm} (spell)`);
    }
    prepared.push({ n: have ? have.name : nm, l: clamp(+sp.level || 0, 0, 9), ed });
  });
  // gear: an item marked equipped in the app is equipped; when the app marks nothing, weapons and armor start equipped as in the Forge
  const gearList = [...(j.equipment || []), ...(j.weapons || []), ...(j.armors || [])], anyEq = gearList.some(x => x.isEquipped);
  const inv = [];
  gearList.forEach(x => {
    if (!x || !x.name) return;
    const { g, n, qty } = impGear(ed, x.name), q = qty * Math.max(1, +x.amount || 1);
    const ex = inv.find(i => i.n.toLowerCase() === n.toLowerCase()); if (ex) { ex.qty += q; return; }
    inv.push({ id: uid("i"), ref: g ? g.id : undefined, n, qty: q, w: impW(g), att: false, attuned: !!x.isAttuned, value: g ? g.c : undefined, note: impCut(x.description, 300), eq: anyEq ? !!x.isEquipped : eqIsWeapon(g) || eqIsArmor(g) });
  });
  // fighting style, feature picks
  const fightStyles = [];
  if (main.style) { const k = Object.keys(FIGHT_STYLES).find(s => impSame(s, main.style)); if (k) { fightStyles.push(k); D.report.matched.push(`Fighting style: ${k}`); } else { D.report.dropped.push(`Fighting style: ${main.style} (saved in notes)`); notes.push(`Fighting style: ${main.style}`); } }
  (j.selectableFeatures || []).forEach(s => { const L = (s.selectedFeatures || []).map(f => impFeat(f).name).filter(Boolean); if (L.length) { D.report.dropped.push(`${s.name}: ${L.join(", ")} (saved in notes)`); notes.push(`${s.name}: ${L.join(", ")}`); } });
  const profs = j.proficiencies || [], langs = profs.filter(p => p.typeName === "LANGUAGE").map(p => p.name), tools = profs.filter(p => p.typeName === "TOOL").map(p => p.name);
  if (j.about) notes.unshift(String(j.about));
  (j.notes || []).map(n => n && n.text).filter(t => t && !/Swipe this message to dismiss/i.test(t)).forEach(t => notes.push(t));
  D.opts = { seed: String(j.id || uid("imp")), name: impCut(j.name, 80) || "Imported character", ed, bonus: "fixed", method: "array", cls: main.cls, level: main.lv, subclass: main.subclass || "none", race, sub, bg: bg || undefined,
    multi: more.length ? more.map(x => ({ cls: x.cls, lv: x.lv, subclass: x.subclass })) : undefined, keepSkills, keepExpert, bonusFeats: bonusFeats.length ? bonusFeats : undefined };
  impGenderSet(D, impGender({ preferences: j.preferences, player: j.player, gender: j.gender, pronouns: j.pronouns, sex: j.sex },
    [j.about, j.personalityTraits, j.ideals, j.bonds, j.flaws, ...(j.notes || []).map(n => n && n.text)]));
  const conds = Object.entries(j.conditions || {}).filter(([k, v]) => v).map(([k]) => String(k).toLowerCase()).filter(k => CONDS.some(c2 => c2[0] === k));
  D.extras = { inv, coins: { pp: +j.platinum || 0, gp: +j.gold || 0, ep: +j.electrum || 0, sp: +j.silver || 0, cp: +j.copper || 0 }, prepared, fightStyles,
    align: impTitle(String(j.alignmentName || "").toLowerCase()), xp: +j.exp || 0, hpCur: j.hp === undefined ? undefined : +j.hp, player: impCut(j.player, 60),
    trait: impCut(j.personalityTraits, 1000), ideal: impCut(j.ideals, 1000), bond: impCut(j.bonds, 1000), flaw: impCut(j.flaws, 1000),
    notes: notes.join("\n\n"), langs: langs.join(", "), toolsChosen: tools.join(", "), conds,
    ...((+j.successes || +j.failures) ? { death: { s: clamp(+j.successes || 0, 0, 3), f: clamp(+j.failures || 0, 0, 3) } } : {}) };
  D.appSaves = appSaves;
  if (!main.subclass && main.lv >= subclassLevel(ed, main.cls)) D.report.differ.push(`No ${main.cls} subclass in the file: choose one on the sheet`);
  return D;
}
/* ======================= Fifth Edition Character Sheet (Walter Kammerer's app) =======================
   Its export is XML; most fields are lists joined by ⊠ (then ⊡ and ⊟). Positions follow the open-source import5eChar
   reader. Unknown spells aren't made into homebrew (the file has no spell text): they go to notes (owner, 2026-11-18). */
const FECS_SRC = "Fifth Edition Character Sheet";
const FECS_SKILLS = ["Athletics", "Acrobatics", "Sleight of Hand", "Stealth", "Arcana", "History", "Investigation", "Nature", "Religion", "Animal Handling", "Insight", "Medicine", "Perception", "Survival", "Deception", "Intimidation", "Performance", "Persuasion"];
const FECS_X = /⊠|â\u008a /, FECS_D = /⊡|â\u008a¡/, FECS_M = /⊟|â\u008a\u009f/;
/* "holy water x5", "3x kegs", "pogs 100x" -> "5 holy water", "3 kegs", "100 pogs" (the count form impGear reads) */
function fecsQty(line) {
  const s = String(line || "").trim(); let m;
  if ((m = s.match(/^(.*?)\s+[x×]\s*(\d+)$/i)) && m[1]) return `${m[2]} ${m[1]}`; /* the x needs a space before it: "Wax 2" stays */
  if ((m = s.match(/^(\d+)\s*[x×]\s+(.+)$/i))) return `${m[1]} ${m[2]}`;
  if ((m = s.match(/^(.*?)\s+(\d+)\s*[x×]$/i))) return `${m[2]} ${m[1]}`;
  return s;
}
function fecsImport(text, ed) {
  const bad = { error: "This file isn't a Fifth Edition Character Sheet character. In the app, export the character (or upload it to Google Drive) and choose its .xml file." };
  const parse = t => { try { return new DOMParser().parseFromString(t, "application/xml"); } catch { return null; } };
  let doc = parse(String(text || ""));
  /* the app writes a bare & (an item called "Salt & pepper") without escaping it, which isn't valid XML: escape only those
     and read it again (owner's file, 2026-11-26) */
  if (!doc || doc.querySelector("parsererror")) doc = parse(String(text || "").replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/gi, "&amp;"));
  if (!doc || doc.querySelector("parsererror") || !doc.documentElement || doc.documentElement.nodeName !== "character") return bad;
  const tag = n => { const e = doc.documentElement.querySelector(":scope > " + n); return e ? e.textContent : ""; };
  if (!tag("classData") || !tag("abilityScores")) return bad;
  ed = ed === "2024" ? "2024" : "2014";
  const D = { src: FECS_SRC, opts: {}, final: {}, extras: {}, homebrew: [], report: { matched: [], made: [], differ: [], dropped: [] }, check: {} }, notes = [];
  const hb = x => { x.src = FECS_SRC; D.homebrew.push(x); };
  const N = tag("noteList").split(FECS_X), note = i => String(N[i] || "").trim();
  // classes: the first ⊟ piece of classData, ⊠ per class, ⊡ = class, subclass, level
  const CD = tag("classData").split(FECS_M), classes = [];
  for (const part of String(CD[0] || "").split(FECS_X)) {
    const [nm, arch, lvS] = part.split(FECS_D).map(x => String(x || "").trim()); if (!nm) continue;
    const cls = impClassMatch(ed, nm, D) || impClass(ed, nm, null, D, FECS_SRC);
    if (!cls) return { error: "This character's class has no name in the file, so it can't be imported." };
    const lv = clamp(+lvS || 1, 1, 20);
    let subclass = null;
    if (arch) { const n0 = D.homebrew.length; subclass = impSubclass(ed, cls, arch, null, D); D.homebrew.slice(n0).forEach(x => x.src = FECS_SRC); }
    classes.push({ cls, lv, subclass });
  }
  if (!classes.length) return bad;
  D.homebrew.forEach(x => x.src = FECS_SRC);
  const [main, ...more] = classes;
  D.report.matched.push(classes.map(x => `${x.cls} ${x.lv}`).join(" / "));
  // species and background (noteList 9 and 10)
  const rName = note(8);
  let race = null, sub = "none";
  const R = PC_RACES[ed];
  race = Object.keys(R).find(k => !R[k].pend && impSame(k, rName)) || null;
  if (!race) for (const k of Object.keys(R)) { const subs = R[k].subs || {}; const sk = Object.keys(subs).find(s => impSame(s, rName) || impSame(subs[s].label, rName)); if (sk) { race = k; sub = sk; break; } }
  if (race) D.report.matched.push(`Species: ${sub !== "none" ? sub : race}`);
  else if (rName && !/^custom$/i.test(rName) && (race = impSpeciesMatch(ed, rName, D))) { /* matched despite its spelling */ }
  else if (rName && !/^custom$/i.test(rName)) {
    const have = impHave("species", rName);
    if (have) { race = have.name; D.report.matched.push(`Species: ${have.name} (${impKind(have)})`); }
    else { race = impCut(rName, 60); hb({ id: uid("hb"), kind: "species", ed, name: race, desc: "", asi: {}, speed: clamp(+tag("baseSpeed") || 30, 0, 120), skills: [], term: "", traits: [], subs: [] }); D.report.made.push(`${race} (species)`); }
  } else { race = Object.keys(R).find(k => /human/i.test(k)) || Object.keys(R)[0]; D.report.differ.push(`The file's species is "${rName || "none"}": the Forge used ${race}. Change it on the sheet if needed`); }
  const bName = note(9);
  let bg = null;
  if (bName && !/^custom$/i.test(bName)) {
    bg = impListMatch("Background", bgList(ed), bName, D) || (impHave("background", bName) || {}).name || null;
    if (bg) { if (![...D.report.matched, ...D.report.differ].some(t => t.startsWith("Background: "))) D.report.matched.push(`Background: ${bg}`); }
    else { bg = impCut(bName, 60); hb({ id: uid("hb"), kind: "background", ed, name: bg, desc: "", skills: [], feat: "", gear: "", fx: [] }); D.report.made.push(`${bg} (background)`); }
  } else { bg = bName ? impCut(bName, 60) : "Custom"; D.report.dropped.push(`Background: ${bg} (kept as a name only, with no background features; the skills are kept)`); }
  // scores and saves: abilityScores 1-6, then 6 save flags
  const A = tag("abilityScores").split(FECS_X).map(x => String(x).trim());
  for (let i = 0; i < 6; i++) { const v = +A[i]; if (!v) return { error: "This Fifth Edition Character Sheet file has no ability scores." }; D.final[AB[i]] = clamp(v, 1, 30); }
  D.appSaves = AB.filter((a, i) => /^(true|1)$/i.test(A[6 + i]));
  // skills: 1-18 proficient, 39-56 expertise
  const S = tag("skillInfo").split(FECS_X).map(x => String(x).trim()), on = v => /^(true|1)$/i.test(v || "");
  const keepSkills = FECS_SKILLS.filter((k, i) => on(S[i])), keepExpert = FECS_SKILLS.filter((k, i) => on(S[38 + i]) && on(S[i]));
  // spells: spellList position 9, ⊡ per spell, ⊟ = level, name, …, prepared (8)
  const prepared = [], notSpells = [];
  String(tag("spellList").split(FECS_X)[8] || "").split(FECS_D).forEach(rec => {
    const f = rec.split(FECS_M), nm = String(f[1] || "").trim(); if (!nm) return;
    if (f[7] !== undefined && /^false$/i.test(String(f[7]).trim())) return;
    const m = spellMatch(ed, nm);
    if (m) { if (!prepared.some(x => x.n === m.s.n)) prepared.push({ n: m.s.n, l: m.s.l, ed: m.ed }); impSpellSaid(D, nm, m); return; }
    notSpells.push(impCut(nm, 80)); D.report.dropped.push(`${impCut(nm, 60)} (not a known spell; saved in notes)`);
  });
  if (notSpells.length) notes.push("From the spell list (not spells in the Forge):\n" + notSpells.map(x => "- " + x).join("\n"));
  // gear: noteList 6, one item per line
  const inv = [];
  note(5).split(/\r?\n/).map(x => x.trim()).filter(Boolean).forEach(line => {
    const { g, n, qty } = impGear(ed, fecsQty(line));
    const ex = inv.find(i => i.n.toLowerCase() === n.toLowerCase()); if (ex) { ex.qty += qty; return; }
    inv.push({ id: uid("i"), ref: g ? g.id : undefined, n, qty, w: impW(g), att: false, attuned: false, value: g ? g.c : undefined, note: "", eq: eqIsWeapon(g) || eqIsArmor(g) });
  });
  /* the weapon list (count, then 13 fields a weapon, the name first): each weapon is worn under the file's name; one already
     in the gear (the same item, or the same base weapon) takes that name instead of being added twice (owner, 2026-11-26) */
  { const WL = tag("weaponList").split(FECS_X), nW = clamp(parseInt(WL[0]) || 0, 0, 40), took = new Set();
    for (let k = 0; k < nW; k++) {
      const wn = impCut(String(WL[1 + k * 13] || "").trim(), 80); if (!wn) continue;
      const { g } = impGear(ed, wn), gw = g && eqIsWeapon(g) ? g : null;
      let it = inv.find(x => !took.has(x.id) && x.n.toLowerCase() === wn.toLowerCase()) || (gw && inv.find(x => !took.has(x.id) && x.ref === gw.id));
      if (it) { it.n = wn; it.eq = true; if (!it.ref && gw) { it.ref = gw.id; it.w = impW(gw); it.value = gw.c; } }
      else inv.push(it = { id: uid("i"), ref: gw ? gw.id : g ? g.id : undefined, n: wn, qty: 1, w: impW(gw || g), att: false, attuned: false, value: (gw || g || {}).c, note: "", eq: true });
      took.add(it.id);
      if (!gw && !eqWeaponOf(it, ed)) D.report.dropped.push(`${wn}: the Forge doesn't know this weapon, so it's kept as an item with no attack. On the sheet, write the weapon it's like in its note (for example Greataxe)`);
    }
  }
  // fighting style: a "fighting style⊡Name" piece in classData
  /* every "fighting style⊡Name" piece (one per class that has one), with either form of the separators */
  const fightStyles = [], fsRe = new RegExp(`fighting style\\s*(?:${FECS_D.source})\\s*(.+?)\\s*(?=${FECS_M.source}|${FECS_X.source}|${FECS_D.source}|$)`, "gi");
  for (const fsm of tag("classData").matchAll(fsRe)) {
    const nm = fsm[1].trim(); if (!nm) continue;
    const k = Object.keys(FIGHT_STYLES).find(s => impSame(s, nm));
    if (k) { if (!fightStyles.includes(k)) { fightStyles.push(k); D.report.matched.push(`Fighting style: ${k}`); } }
    else { D.report.dropped.push(`Fighting style: ${impCut(nm, 60)} (saved in notes)`); notes.push(`Fighting style: ${nm}`); }
  }
  if (note(0)) notes.unshift(note(0));
  if (note(6)) notes.push(note(6));
  D.opts = { seed: uid("imp"), name: impCut(note(15), 80) || "Imported character", ed, bonus: "fixed", method: "array", cls: main.cls, level: main.lv, subclass: main.subclass || "none", race, sub, bg: bg || undefined,
    multi: more.length ? more.map(x => ({ cls: x.cls, lv: x.lv, subclass: x.subclass })) : undefined, keepSkills, keepExpert };
  impGenderSet(D, impGender({}, [note(0), note(6), note(11), note(12), note(13), note(14)]));
  const coin = i => Math.max(0, Math.floor(+note(i) || 0));
  const hpCur = tag("currentHealth");
  D.extras = { inv, coins: { cp: coin(17), sp: coin(18), ep: coin(19), gp: coin(20), pp: coin(21) }, prepared, fightStyles,
    align: impTitle(note(10).toLowerCase()), xp: Math.max(0, Math.floor(+note(22) || 0)), hpCur: hpCur === "" ? undefined : +hpCur,
    trait: impCut(note(11), 1000), ideal: impCut(note(12), 1000), bond: impCut(note(13), 1000), flaw: impCut(note(14), 1000),
    notes: notes.join("\n\n"), langs: note(4).split(/\r?\n|,\s*/).map(x => x.trim()).filter(Boolean).join(", "), toolsChosen: note(3).split(/\r?\n|,\s*/).map(x => x.trim()).filter(Boolean).join(", "), conds: [] };
  /* speed: only flagged when the app's is higher (a feat or item the Forge doesn't know); the app may not count class bonuses like a Monk's */
  D.check = { hp: +tag("maxHealth") || 0, speed: (+tag("baseSpeed") || 0) + (+tag("speedMiscMod") || 0), speedUp: true };
  /* the app's misc AC bonus (magic items, a species bonus and the like) -> the sheet's Other AC bonus; and its AC, to compare */
  D.extras.acBonus = clamp(parseInt(tag("miscArmorBonus")) || 0, -10, 20);
  { const armor = parseInt(tag("armorBonus")) || 0; if (armor > 0) { const dex = Math.floor((D.final.dex - 10) / 2), mx = parseInt(tag("maxDex")); D.check.ac = armor + (parseInt(tag("shieldBonus")) || 0) + D.extras.acBonus + (Number.isFinite(mx) && mx >= 0 && mx < 10 ? Math.min(dex, mx) : dex); } }
  if (!main.subclass && main.lv >= subclassLevel(ed, main.cls)) D.report.differ.push(`No ${main.cls} subclass in the file: choose one on the sheet`);
  return D;
}
// Build the character a Draft describes. Its homebrew is applied for the build only; the base scores are solved so the
// final scores equal the file's.
function importBuild(D) {
  const keep = { pend: HB.pend, sig: HB.pendSig };
  const fresh = D.homebrew.filter(x => !hbAny(x.kind).some(y => pendKey(y) === pendKey(x)));
  HB.pend = [...HB.pend, ...fresh.map(x => ({ ...x, pend: true, from: [] }))]; HB.pendSig = ""; hbApply();
  try {
    const base = { ...(D.base || D.final) }; let n = null;
    for (let i = 0; i < (D.base ? 1 : 6); i++) {
      if (D.base) { n = generateCharacter({ ...D.opts, base: { ...base } }); break; }
      n = generateCharacter({ ...D.opts, base: { ...base } });
      const off = AB.filter(a => n.scores[a] !== D.final[a]); if (!off.length) break;
      off.forEach(a => base[a] = Math.max(1, base[a] + D.final[a] - n.scores[a]));
    }
    const c = n, report = JSON.parse(JSON.stringify(D.report));
    if (!D.base) AB.filter(a => c.scores[a] !== D.final[a]).forEach(a => report.differ.push(`${AB_NAME[a]} is ${c.scores[a]} in the Forge (the file says ${D.final[a]})`));
    if (D.appSaves) { const extra = D.appSaves.filter(a => !c.saves.includes(a)), less = c.saves.filter(a => !D.appSaves.includes(a)); if (extra.length || less.length) report.differ.push(`Saving throws: the Forge gives ${c.saves.map(a => AB_NAME[a]).join(", ")}${D.appSaves.length ? ` (the file marks ${D.appSaves.map(a => AB_NAME[a]).join(", ")})` : ""}`); }
    const X = D.extras;
    Object.assign(c, { id: uid("pc"), kit: [], kitMoved: true, goldAdded: true, inv: X.inv || [], coins: X.coins || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, prepared: X.prepared || [], importedFrom: { app: D.src, at: Date.now() }, ...(D.mwId ? { mwId: D.mwId } : {}) });
    ["align", "xp", "player", "trait", "ideal", "bond", "flaw", "notes", "langs", "toolsChosen", "look"].forEach(k => { if (X[k] !== undefined && X[k] !== "") c[k] = X[k]; });
    if (X.fightStyles && X.fightStyles.length) c.fightStyles = X.fightStyles;
    if (X.conds && X.conds.length) c.conds = X.conds;
    if (X.death) c.death = X.death;
    if (+X.acBonus) c.acBonus = +X.acBonus; /* the file's misc AC bonus (Fifth Edition Character Sheet) */
    pcEnsure(c);
    try { pcRecompute(c); } catch { }
    c.hpCur = X.hpCur === undefined || isNaN(X.hpCur) ? c.hp : clamp(X.hpCur, 0, c.hp);
    const K = D.check || {}, say = (what, ours, theirs) => { if (theirs > 0 && ours !== theirs) report.differ.push(`${what} is ${ours} in the Forge (the sheet says ${theirs})`); };
    say("Max HP", c.hp, K.hp); say("Armor class", c.ac, K.ac); { const sp = (() => { try { return pcSpeed(c).speed; } catch { return c.speed; } })(); if (!K.speedUp || K.speed > sp) say("Speed", sp, K.speed); }
    if (c.spell && K.dc > 0) say("Spell save DC", c.spell.dc, K.dc);
    return { c, report };
  } finally { HB.pend = keep.pend; HB.pendSig = keep.sig; hbApply(); }
}

/* ---- fillable PDF character sheets (the official 5e sheet's field names) ----
   pdf.js (vendor/pdfjs, Apache-2.0) is loaded only when a PDF is chosen. */
const PDF_SRC = "PDF character sheet";
async function pdfFields(buf) {
  const lib = await import(new URL("vendor/pdfjs/pdf.min.mjs", location.href).href);
  lib.GlobalWorkerOptions.workerSrc = new URL("vendor/pdfjs/pdf.worker.min.mjs", location.href).href;
  const doc = await lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise, fields = {}, pos = {};
  try {
    // each page's form boxes (widgets): name, value and where they sit
    for (let i = 1; i <= doc.numPages; i++) {
      const anns = await (await doc.getPage(i)).getAnnotations();
      for (const a of anns) {
        if (!a || !a.fieldName) continue;
        const name = a.fieldName;
        const v = a.fieldType === "Btn" ? (a.checkBox || a.radioButton ? (a.fieldValue && a.fieldValue !== "Off" ? "Yes" : "") : "") : a.fieldValue == null ? "" : String(Array.isArray(a.fieldValue) ? a.fieldValue.join(", ") : a.fieldValue);
        if (!fields[name]) fields[name] = v;
        if (a.rect && !pos[name]) pos[name] = { page: i - 1, x: a.rect[0], y: a.rect[1], x2: a.rect[2], y2: a.rect[3] };
      }
    }
  } finally { try { doc.destroy(); } catch { } }
  return { fields, pos };
}
const PDF_ALIGN = { LG: "Lawful Good", NG: "Neutral Good", CG: "Chaotic Good", LN: "Lawful Neutral", N: "True Neutral", TN: "True Neutral", NN: "True Neutral", CN: "Chaotic Neutral", LE: "Lawful Evil", NE: "Neutral Evil", CE: "Chaotic Evil" };
const PDF_SAVES = { 11: "str", 18: "dex", 19: "con", 20: "int", 21: "wis", 22: "cha" };
const PDF_SKILLS = ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"];
const PDF_SKILL_BOX = { "Animal Handling": "Animal", "Sleight of Hand": "SleightofHand" };
const PDF_LANGS = ["Common", "Dwarvish", "Elvish", "Giant", "Gnomish", "Goblin", "Halfling", "Orc", "Abyssal", "Celestial", "Draconic", "Deep Speech", "Infernal", "Primordial", "Sylvan", "Undercommon", "Thieves' Cant", "Druidic", "Aquan", "Auran", "Ignan", "Terran", "Sign Language", "Common Sign Language"];
// a spell line's level: the nearest "slots total" header above it in the same column (19 = 1st level … 27 = 9th); none above = cantrip
function pdfSpellLevel(name, pos) {
  const p = pos[name];
  if (p) {
    let best = null;
    for (const [k, h] of Object.entries(pos)) {
      const m = k.match(/^SlotsTotal (\d+)$/); if (!m || +m[1] < 19 || +m[1] > 27 || h.page !== p.page) continue;
      if (!(h.x < p.x2 && h.x2 > p.x) || h.y <= p.y) continue;
      if (!best || h.y - p.y < best.d) best = { d: h.y - p.y, l: +m[1] - 18 };
    }
    return best ? best.l : 0;
  }
  const n = +String(name).replace(/\D/g, "");
  return n === 1014 || (n >= 1016 && n <= 1022) ? 0 : n === 1015 || (n >= 1023 && n <= 1033) ? 1 : n === 1046 || (n >= 1034 && n <= 1045) ? 2 : 3;
}
function pdfImport(F, ed) {
  ed = ed === "2024" ? "2024" : "2014";
  const fields = (F && F.fields) || {}, pos = (F && F.pos) || {};
  const norm = k => String(k).replace(/\s+/g, "").toLowerCase(), N = {};
  Object.entries(fields).forEach(([k, v]) => { const n = norm(k); if (!(n in N) || (!N[n] && v)) N[n] = v; });
  const get = k => String(N[norm(k)] ?? "").replace(/\r/g, "").trim(), num = k => { const m = get(k).match(/-?\d+/); return m ? +m[0] : NaN; }, on = k => !!get(k);
  if (!Object.keys(fields).length) return { error: "This PDF has no fillable fields, so the Forge can't read it. Export it again as a fillable sheet, or type the character in." };
  if (!get("CharacterName") && !get("ClassLevel")) return { error: "This PDF isn't a 5e character sheet the Forge can read. It needs the official sheet's boxes (name, class and level, scores)." };
  const D = { src: PDF_SRC, opts: {}, final: {}, extras: {}, homebrew: [], report: { matched: [], made: [], differ: [], dropped: [] }, check: {} }, notes = [];
  // classes: "Wizard 6", "Ranger 5 / Rogue 2", "Wizard (Evocation) 6"
  const segs = get("ClassLevel").split(/\s*(?:\/|,|;|&|\band\b)\s*/i).filter(x => /[a-z]/i.test(x));
  if (!segs.length) return { error: "This sheet has no class and level filled in." };
  const classes = [];
  for (const seg of segs) {
    const cls = classList(ed).find(k => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(seg))
      || impClass(ed, seg.replace(/\d+/g, "").replace(/\b(lvl|level|lv)\b/gi, "").replace(/[()[\]]/g, " ").replace(/\s+/g, " ").trim(), null, D, PDF_SRC, Object.entries(PDF_SAVES).filter(([n]) => on(`Check Box ${n}`)).map(([, a]) => a));
    if (!cls) return { error: "This sheet's class and level box has no class name the Forge can read." };
    const lvs = seg.match(/\d+/g), lv = clamp(lvs ? +lvs[lvs.length - 1] : 1, 1, 20);
    const rest = seg.replace(new RegExp(`\\b${cls}\\b`, "i"), "").replace(/\d+/g, "").replace(/\b(lvl|level|lv)\b/gi, "").replace(/[()[\]]/g, " ").replace(/\s+/g, " ").trim();
    let subclass = null;
    if (rest.length >= 3) {
      const built = subclassList(ed, cls).find(x => impSame(x[0], rest) || impNorm(x[0]).includes(impNorm(rest)));
      const have = !built && impHave("subclass", rest, cls);
      if (built || have) { subclass = built ? built[0] : have.name; D.report.matched.push(`${cls} subclass: ${subclass}`); }
      else { subclass = impCut(rest, 60); D.homebrew.push({ id: uid("hb"), kind: "subclass", src: PDF_SRC, ed, cls, name: subclass, desc: "Imported from a PDF; add its features here.", features: [] }); D.report.made.push(`${subclass} (${cls} subclass, name only)`); }
    }
    classes.push({ cls, lv, subclass });
  }
  const [main, ...more] = classes;
  D.report.matched.push(classes.map(x => `${x.cls} ${x.lv}`).join(" / "));
  const TL = classes.reduce((t, x) => t + x.lv, 0), prof = 2 + Math.floor((TL - 1) / 4);
  // species: a subrace name ("Lightfoot Halfling"), a species ("Halfling", subrace from the features text), or homebrew
  const rText = get("Race"), feat = [get("Features and Traits"), get("Feat+Traits")].join("\n"), R = PC_RACES[ed];
  let race = null, sub = "none";
  for (const k of Object.keys(R)) { if (R[k].pend) continue; const S = R[k].subs || {}; const sk = Object.keys(S).find(s => impSame(s, rText) || impSame(S[s].label, rText)); if (sk) { race = k; sub = sk; break; } }
  if (!race) race = Object.keys(R).filter(k => !R[k].pend && new RegExp(`\\b${k.replace(/[-]/g, "\\-")}\\b`, "i").test(rText)).sort((a, b) => b.length - a.length)[0] || null;
  if (race && sub === "none" && R[race].subs) {
    const S = R[race].subs, hit = Object.keys(S).find(s => (S[s].traits || []).some(t => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(feat)) || new RegExp(`\\b${s.split(" ")[0]}\\b`, "i").test(rText));
    if (hit) sub = hit; else D.report.differ.push(`The sheet doesn't say which kind of ${race}: the Forge leaves the subrace out`);
  }
  if (race) D.report.matched.push(`Species: ${sub !== "none" ? sub : race}`);
  else if (rText) {
    const have = impHave("species", rText);
    if (have) { race = have.name; D.report.matched.push(`Species: ${race} (homebrew)`); }
    else { race = impCut(rText, 60); D.homebrew.push({ id: uid("hb"), kind: "species", src: PDF_SRC, ed, name: race, desc: "Imported from a PDF; add its traits here.", asi: {}, speed: num("Speed") || 30, skills: [], term: "", traits: [], subs: [] }); D.report.made.push(`${race} (species, name only)`); }
  } else return { error: "This sheet has no species (race) filled in." };
  // background
  const bText = get("Background");
  let bg = bText ? bgList(ed).find(k => impSame(k, bText)) || (impHave("background", bText) || {}).name || null : null;
  if (bg) D.report.matched.push(`Background: ${bg}`);
  else if (bText) { bg = impCut(bText, 60); D.homebrew.push({ id: uid("hb"), kind: "background", src: PDF_SRC, ed, name: bg, desc: "Imported from a PDF; add its feature here.", skills: [], feat: "", gear: "", fx: [] }); D.report.made.push(`${bg} (background, name only)`); }
  // scores, saves, skills
  for (const a of AB) { const v = num(a.toUpperCase()); if (!(v > 0)) return { error: "This sheet's ability scores aren't filled in." }; D.final[a] = v; }
  D.appSaves = Object.entries(PDF_SAVES).filter(([n]) => on(`Check Box ${n}`)).map(([, a]) => a);
  const keepSkills = [], keepExpert = [];
  PDF_SKILLS.forEach((k, i) => {
    if (!on(`Check Box ${23 + i}`)) return; keepSkills.push(k);
    const v = num(PDF_SKILL_BOX[k] || k), md = Math.floor((D.final[SKILLS[k]] - 10) / 2);
    if (v === md + 2 * prof) keepExpert.push(k);
  });
  // spells, by line position
  const prepared = [];
  Object.keys(fields).filter(k => /^Spells 1\d{3}$/.test(k.trim()) && get(k)).forEach(k => {
    const raw = get(k), l = pdfSpellLevel(k, pos), m = spellMatch(ed, raw);
    if (m) { if (!prepared.some(x => x.n === m.s.n)) prepared.push({ n: m.s.n, l: m.s.l, ed: m.ed }); if (m.fuzzy) D.report.matched.push(`${raw} → ${m.s.n}`); return; }
    const nm = impCut(raw.replace(/\s*\([^)]*\)\s*/g, " ").trim(), 60); if (!nm) return;
    const have = impHave("spell", nm) || D.homebrew.find(x => x.kind === "spell" && impSame(x.name, nm));
    if (!have) { D.homebrew.push({ id: uid("hb"), kind: "spell", src: PDF_SRC, ed, name: nm, desc: "", l, s: "Evocation", c: [main.cls], t: "", r: "", cp: "", m: "", du: "", co: false, ri: false, h: "" }); D.report.made.push(`${nm} (${l ? `level ${l} spell` : "cantrip"}, name only)`); }
    if (!prepared.some(x => x.n === (have ? have.name : nm))) prepared.push({ n: have ? have.name : nm, l: have ? +have.l || l : l, ed });
  });
  // gear: equipment and treasure, one item per line; weapons from the attack rows
  const inv = [];
  const addGear = (line, eq) => {
    let t = line.replace(/^[-•*]\s*/, "").trim(); if (!t) return;
    let note = ""; const pm = t.match(/^(.*?)\s*\((.*)\)\s*$/); if (pm && pm[1]) { t = pm[1]; note = pm[2]; }
    const { g, n, qty } = impGear(ed, t);
    const ex = inv.find(i => i.n.toLowerCase() === n.toLowerCase()); if (ex) { if (eq === null) ex.qty += qty; return; }
    inv.push({ id: uid("i"), ref: g ? g.id : undefined, n: impCut(n, 80), qty, w: impW(g), att: false, attuned: false, value: g ? g.c : undefined, note: impCut(note, 300), eq: eq === null ? eqIsWeapon(g) || eqIsArmor(g) : eq });
  };
  [get("Equipment"), get("Treasure")].join("\n").split(/\n/).forEach(l => addGear(l, null));
  ["Wpn Name", "Wpn Name 2", "Wpn Name 3"].map(get).filter(Boolean).forEach(w => addGear(w, true));
  // languages and tools
  const langs = [], tools = [];
  get("ProficienciesLang").split(/\n|,|;/).map(x => x.trim()).filter(Boolean).forEach(x => (PDF_LANGS.some(L => impSame(L, x)) ? langs : tools).push(x));
  // story and notes
  const look = ["Age", "Height", "Weight", "Eyes", "Skin", "Hair"].filter(k => get(k)).map(k => `${k}: ${get(k)}`).join(", ");
  [["Allies", get("Allies")], ["Organisation", get("FactionName")], ["Backstory", get("Backstory")], ["Features and traits", get("Features and Traits")], ["More features and traits", get("Feat+Traits")]].filter(([, v]) => v).forEach(([k, v]) => notes.push(`${k}:\n${v}`));
  if (get("Features and Traits") || get("Feat+Traits")) D.report.dropped.push("Features and traits text (saved in notes)");
  if ("CHARACTER IMAGE" in fields || "CHARACTERIMAGE" in N) D.report.dropped.push("Portrait not imported");
  D.opts = { seed: impCut(`${get("CharacterName")}|${get("ClassLevel")}`, 120), name: impCut(get("CharacterName"), 80) || "Imported character", ed, bonus: "fixed", method: "array", cls: main.cls, level: main.lv, subclass: main.subclass || "none", race, sub, bg: bg || undefined,
    multi: more.length ? more.map(x => ({ cls: x.cls, lv: x.lv, subclass: x.subclass })) : undefined, keepSkills, keepExpert };
  impGenderSet(D, impGender(Object.fromEntries(Object.entries(fields).filter(([k]) => /gender|^\s*sex\s*$|pronoun/i.test(k))),
    ["Backstory", "PersonalityTraits", "Ideals", "Bonds", "Flaws", "Allies"].map(get)));
  const a = get("Alignment");
  D.extras = { inv, coins: { pp: num("PP") || 0, gp: num("GP") || 0, ep: num("EP") || 0, sp: num("SP") || 0, cp: num("CP") || 0 }, prepared,
    align: PDF_ALIGN[a.toUpperCase().replace(/[^A-Z]/g, "")] || impCut(a, 40), xp: num("XP") || 0, hpCur: isNaN(num("HPCurrent")) ? undefined : num("HPCurrent"), player: impCut(get("PlayerName"), 60),
    trait: impCut(get("PersonalityTraits"), 1000), ideal: impCut(get("Ideals"), 1000), bond: impCut(get("Bonds"), 1000), flaw: impCut(get("Flaws"), 1000), look, notes: notes.join("\n\n"), langs: langs.join(", "), toolsChosen: tools.join(", ") };
  D.check = { hp: num("HPMax"), ac: num("AC"), speed: num("Speed"), dc: num("SpellSaveDC 2") };
  if (!main.subclass && main.lv >= subclassLevel(ed, main.cls)) D.report.differ.push(`No ${main.cls} subclass on the sheet: choose a ${main.cls} subclass on the sheet after importing`);
  return D;
}

/* ---- the Import character window ---- */
const IMPC = { file: null, draft: null, built: null };
const impPlayer = () => !!(window.Portal && Portal.cloud && !Portal.isDM());
async function impCharRead(file, ed) {
  let buf; try { buf = new Uint8Array(await file.arrayBuffer()); } catch { return { error: "Couldn't read that file." }; }
  if (String.fromCharCode(...buf.slice(0, 5)) === "%PDF-") {
    if (typeof pdfImport !== "function") return { error: "PDF import is coming soon." };
    try { return pdfImport(await pdfFields(buf.buffer), ed); } catch (e) { return { error: "Couldn't read that PDF." }; }
  }
  const txt = new TextDecoder().decode(buf);
  if (/^﻿?\s*</.test(txt)) return fecsImport(txt, ed); /* XML: the Fifth Edition Character Sheet app */
  let j = null; try { j = JSON.parse(txt); } catch { }
  if (j && j.app === "dmforge-backup") return { error: "That's a Forge backup file. Restore it with 💾 Backup instead." };
  if (j && j.cls && j.scores && j.skills) return { error: "That's a Forge character. Restore it with 💾 Backup, or forge it again." };
  return compImport(j, ed);
}
function impSummaryHTML(D, built) {
  if (D.error) return `<p class="imp-err">${esc(D.error)}</p>`;
  const R = built.report, c = built.c, li = L => `<ul>${L.map(t => `<li>${esc(t)}</li>`).join("")}</ul>`;
  return `<p style="margin:0"><b>${esc(c.name)}</b> · ${esc(classLine(c))} · ${esc(c.race)} · ${esc(c.bg || "")}</p>
    ${R.matched.length ? `<h4>Matched</h4>${li(R.matched)}` : ""}
    ${R.made.length ? `<h4>New homebrew${impPlayer() ? " (your DM will be asked to approve)" : ""}</h4>${li(R.made)}<p class="hint" style="margin:4px 0 0">${D.src === IMP_SRC ? "Their rules text comes from the file." : `${D.src === FECS_SRC ? "This app's file" : "A PDF"} has names only: add their rules text in the Homebrew tab.`} Sheet effects (bonuses to numbers) aren't added; set them in the Homebrew tab if you need them.</p>` : ""}
    ${R.differ.length ? `<h4>Different from the file</h4>${li(R.differ)}` : ""}
    ${R.dropped.length ? `<h4>Not brought across</h4>${li(R.dropped)}` : ""}
    ${characterReadiness(c).length ? `<h4>Choices to finish on the sheet</h4>${li(characterReadiness(c).map(([label]) => label))}` : ""}`;
}
async function impCharRefresh() {
  const out = document.getElementById("impCharOut"), go = document.getElementById("impCharGo"); go.disabled = true; IMPC.draft = IMPC.built = null;
  if (!IMPC.file) { out.innerHTML = ""; return; }
  out.innerHTML = `<p class="muted">Reading ${esc(IMPC.file.name)}…</p>`;
  const r = document.querySelector('#impCharModal input[name="impEd"]:checked'), ed = r ? r.value : "2014";
  const D = await impCharRead(IMPC.file, ed);
  let built = null;
  if (!D.error) { try { built = importBuild(D); } catch (e) { D.error = "Couldn't build that character: " + (e && e.message || e); } }
  IMPC.draft = D; IMPC.built = built;
  out.innerHTML = impSummaryHTML(D, built); go.disabled = !!D.error;
}
// save the homebrew (to the campaign, or waiting on the character for a player) and the character
async function importCommit(D, c) {
  if (D.homebrew.length) {
    if (impPlayer()) c.hbPending = D.homebrew.map(x => ({ ...x }));
    else for (const x of D.homebrew) { let ok = false; try { ok = await hbPut({ ...x }); } catch { ok = false; } if (!ok) { toast(`Couldn't save the homebrew “${x.name}”, so the character wasn't imported`); return false; } }
  }
  PCS.roster.unshift(c); RC.id = c.id; CB.on = false; forgeOpen(false); pcShow("sheet"); pcPersist(); hbPendSync(); renderRosterTab();
  return true;
}
function impCharOpen() { IMPC.file = null; document.getElementById("impCharFile").value = ""; impCharRefresh(); document.getElementById("impCharModal").classList.add("open"); document.getElementById("impCharFile").closest("label").focus(); }
function impCharClose() { document.getElementById("impCharModal").classList.remove("open"); IMPC.file = IMPC.draft = IMPC.built = null; const b = document.getElementById("impCharBtn"); if (b) b.focus(); }
document.getElementById("impCharBtn").addEventListener("click", impCharOpen);
document.getElementById("impCharCancel").addEventListener("click", impCharClose);
document.getElementById("impCharModal").addEventListener("keydown", e => { if (e.key === "Escape") impCharClose(); });
document.getElementById("impCharFile").addEventListener("change", e => { IMPC.file = e.target.files[0] || null; impCharRefresh(); });
document.querySelectorAll('#impCharModal input[name="impEd"]').forEach(r => r.addEventListener("change", () => { if (IMPC.file) impCharRefresh(); }));
document.getElementById("impCharGo").addEventListener("click", async () => {
  const D = IMPC.draft, B = IMPC.built; if (!D || D.error || !B) return;
  document.getElementById("impCharGo").disabled = true;
  B.c.importReview = [...B.report.differ, ...B.report.dropped];
  if (await importCommit(D, B.c)) { const n = B.c.name; impCharClose(); location.hash = "roster"; toast(`${n} imported${B.c.hbPending ? ". Your DM will be asked to approve the new homebrew." : ""}`); }
  else document.getElementById("impCharGo").disabled = false;
});
