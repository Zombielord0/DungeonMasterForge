/* 12b-bulk-import.js: Bulk import (Homebrew tab → 📥 Bulk import). A spreadsheet saved as CSV, or a JSON file, of spells,
   feats, species, backgrounds, subclasses, magic items and monsters, typed in from books the DM owns and added in one go:
   rules entries to the homebrew (hbPut: this browser, or the campaign when signed in as its DM), magic items to
   Items → Custom, monsters to My monsters. Entries go through the Homebrew editor's own hbItemOf, so they get the same
   limits as hand-made ones. Nothing is added that the Forge already has (same kind and name). See docs/features/bulk-import.md. */

const BI_COLS = {
  spell: ["name", "level", "school", "classes", "casting_time", "range", "components", "material", "duration", "concentration", "ritual", "description", "higher_levels"],
  feat: ["name", "prerequisite", "ability_increase", "description"],
  species: ["name", "speed", "ability_bonuses", "skills", "description", "trait", "trait_text", "subrace"],
  background: ["name", "skills", "equipment", "feature", "feature_text", "description"],
  subclass: ["name", "class", "description", "level", "feature", "feature_text"],
  item: ["name", "type", "rarity", "attunement", "description"],
  monster: ["name", "stat_block"]
};
const BI_ONE = { spell: ["spell", "spells"], feat: ["feat", "feats"], species: ["species", "species"], background: ["background", "backgrounds"], subclass: ["subclass", "subclasses"], item: ["magic item", "magic items"], monster: ["monster", "monsters"], hb: ["homebrew entry", "homebrew entries"] };
const biCount = (n, k) => `${n} ${BI_ONE[k][n === 1 ? 0 : 1]}`;
const BI_LABEL = { spell: "Spells", feat: "Feats", species: "Species", background: "Backgrounds", subclass: "Subclasses", item: "Magic items", monster: "Monsters" };
/* made-up examples for the templates (one or more rows each) */
const BI_EXAMPLE = {
  spell: [["Lantern Moth", "1", "Conjuration", "Wizard, Druid", "1 action", "60 feet", "V, S, M", "a moth's wing", "1 hour", "no", "yes", "A glowing moth appears and sheds bright light in a 20-foot radius.", "The light's radius grows by 10 feet for each slot level above 1."]],
  feat: [["Steady Hands", "Dexterity 13", "Dexterity", "You gain the following benefits:\n- Increase your Dexterity score by 1, to a maximum of 20.\n- You have advantage on checks to pick locks."]],
  species: [["Reedling", "30", "dex +2, wis +1", "Stealth", "Small river folk who live among the reeds.", "", "", ""],
    ["Reedling", "", "", "", "", "Reed Step", "You can move through reeds and tall grass without slowing down.", ""],
    ["Reedling", "", "con +1", "", "", "", "You can hold your breath for an hour.", "Marsh Reedling"]],
  background: [["Lamplighter", "Perception, Stealth", "A ladder, a tinderbox and a city map", "Night Paths", "You know every alley that stays lit after dark.", "You kept a city's streets lit."]],
  subclass: [["Path of the Tide", "Barbarian", "Barbarians who rage like the sea.", "3", "Undertow", "When you hit a creature while raging, you can pull it 5 feet toward you."],
    ["Path of the Tide", "Barbarian", "", "6", "Salt Skin", "You have resistance to cold damage."]],
  item: [["Lantern of Small Hours", "Wondrous Item", "Uncommon", "no", "While lit, this lantern shows the hour in its flame."]],
  monster: [["Marsh Lurker", "Medium beast, unaligned\nArmor Class 13 (natural armor)\nHit Points 22 (4d8 + 4)\nSpeed 20 ft., swim 40 ft.\nSTR 14 (+2) DEX 12 (+1) CON 12 (+1) INT 2 (-4) WIS 12 (+1) CHA 4 (-3)\nSenses passive Perception 11\nChallenge 1/2 (100 XP)\nBite. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) piercing damage."]]
};
const BI_KIND = { spell: "spell", spells: "spell", feat: "feat", feats: "feat", species: "species", race: "species", races: "species",
  background: "background", backgrounds: "background", subclass: "subclass", subclasses: "subclass", item: "item", items: "item",
  magic_item: "item", magic_items: "item", monster: "monster", monsters: "monster", creature: "monster", creatures: "monster" };
const BI_ALIAS = { desc: "description", text: "description", cls: "class", statblock: "stat_block", stats: "stat_block", higher_level: "higher_levels",
  at_higher_levels: "higher_levels", casting: "casting_time", time: "casting_time", prereq: "prerequisite", asi: "ability_bonuses", ability_scores: "ability_bonuses" };
const BI_MAX_ROWS = 3000, BI_MAX_BYTES = 5e6;
const BI = { plan: null, busy: false };

const biKey = h => { const k = String(h ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); return BI_ALIAS[k] || k; };
const biStr = v => String(v ?? "").trim();
const biYes = v => /^(y|yes|true|1|x|✓)$/i.test(biStr(v));
const biList = v => biStr(v).split(/\s*[,;/]\s*|\s+and\s+/i).map(s => s.trim()).filter(Boolean);
const BI_AB = { str: "str", strength: "str", dex: "dex", dexterity: "dex", con: "con", constitution: "con", int: "int", intelligence: "int", wis: "wis", wisdom: "wis", cha: "cha", charisma: "cha" };
const biAbs = v => [...new Set((biStr(v).toLowerCase().match(/[a-z]+/g) || []).map(w => BI_AB[w]).filter(Boolean))];
/* "dex +2, wis +1", "Dexterity 2; Wisdom 1" or "+2 DEX, +1 WIS" → { dex: 2, wis: 1 } */
function biAsi(v) {
  const out = {};
  biStr(v).split(/[,;/]|\band\b/i).forEach(part => { const a = biAbs(part)[0], n = (part.match(/[+-]?\d+/) || [])[0]; if (a && n) out[a] = clamp(parseInt(n), -2, 3); });
  return out;
}
const biSkills = v => biList(v).map(s => ALL_SKILLS.find(k => k.toLowerCase() === s.toLowerCase())).filter(Boolean);
const biClass = v => { const s = biStr(v).toLowerCase(); return s ? [...new Set([...classList("2014"), ...classList("2024")])].find(k => k.toLowerCase() === s) || "" : ""; };
const biCut = (P, name, what, text, n) => { if (biStr(text).length > n) P.probs.push(`${name}: ${what} was cut to ${n.toLocaleString()} characters`); return text; };

/* A CSV file (as Excel, Numbers or Google Sheets save it) → rows of cells. Commas, semicolons or tabs between cells. */
function csvParse(text) {
  text = String(text).replace(/^﻿/, "");
  const first = text.split(/\r?\n/, 1)[0] || "", n = c => first.split(c).length - 1;
  const delim = n("\t") > n(",") && n("\t") > n(";") ? "\t" : n(";") > n(",") ? ";" : ",";
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
    if (ch === '"' && cell === "") { q = true; continue; }
    if (ch === delim) { row.push(cell); cell = ""; continue; }
    if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ""));
}
const csvCell = v => /[",\n\r;]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
function biTemplate(kind) {
  return [["kind", ...BI_COLS[kind]], ...BI_EXAMPLE[kind].map(r => [kind, ...r])].map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
/* the file's text → { rows: [{ kind, name, … }], error } (column names are lowercased with underscores) */
function biRead(text) {
  const t = String(text || "").replace(/^﻿/, "").trim();
  if (!t) return { error: "The file is empty." };
  let objs;
  if (/^[[{]/.test(t)) {
    let j; try { j = JSON.parse(t); } catch { return { error: "This JSON file couldn't be read. Check it was saved completely." }; }
    const L = Array.isArray(j) ? j : j && (j.entries || j.homebrew || j.items);
    if (!Array.isArray(L)) return { error: "The JSON file should hold a list of entries, each with a kind and a name." };
    objs = L.filter(x => x && typeof x === "object").map(x => Object.fromEntries(Object.entries(x).map(([k, v]) => [biKey(k), Array.isArray(v) ? v.join(", ") : typeof v === "object" ? "" : v])));
  } else {
    const rows = csvParse(t); if (rows.length < 2) return { error: "The file needs a header row and at least one entry. Start from a template." };
    const head = rows[0].map(biKey);
    if (!head.includes("name")) return { error: "The header row has no name column. Start from a template, and keep its first row." };
    const kindOf = head.includes("kind") ? null : Object.keys(BI_COLS).find(k => BI_COLS[k].every(c => head.includes(c)));
    if (!head.includes("kind") && !kindOf) return { error: "The header row has no kind column, and its columns don't match a template." };
    objs = rows.slice(1).map(r => { const o = {}; head.forEach((h, i) => { if (h && r[i] !== undefined && o[h] === undefined) o[h] = r[i]; }); if (kindOf) o.kind = kindOf; return o; });
  }
  if (objs.length > BI_MAX_ROWS) return { error: `That's ${objs.length.toLocaleString()} rows; the most at once is ${BI_MAX_ROWS.toLocaleString()}. Split the file.` };
  return { rows: objs };
}

/* one entry per kind and name (several rows can make one species or subclass) → { kind, name, dest, x } */
const BI_MAKE = {
  spell(g, P) {
    const r = g.rows[0], d = hbNew("spell"), lvT = biStr(r.level), lv = /cantrip/i.test(lvT) ? 0 : parseInt(lvT);
    if (isNaN(lv) || lv < 0 || lv > 9) P.probs.push(`${g.name}: the level should be 0 (cantrip) to 9, so 1 was used`);
    const school = SP_SCHOOLS.find(s => s.toLowerCase() === biStr(r.school).toLowerCase());
    if (!school) P.probs.push(`${g.name}: “${biStr(r.school) || "no school"}” isn't a school of magic, so Evocation was used`);
    const cls = biList(r.classes), known = cls.map(biClass).filter(Boolean);
    if (known.length < cls.length) P.probs.push(`${g.name}: left out the classes the Forge doesn't know (${cls.filter(c => !biClass(c)).join(", ")})`);
    Object.assign(d, { name: g.name, desc: biCut(P, g.name, "the description", biStr(r.description), 4000), l: isNaN(lv) || lv < 0 || lv > 9 ? 1 : lv, s: school || "Evocation", c: known,
      t: biStr(r.casting_time) || "1 action", r: biStr(r.range), cp: biStr(r.components).toUpperCase(), m: biStr(r.material), du: biStr(r.duration) || "Instantaneous",
      co: biYes(r.concentration), ri: biYes(r.ritual), h: biStr(r.higher_levels) });
    return { dest: "hb", x: hbItemOf(d) };
  },
  feat(g, P) {
    const r = g.rows[0], d = hbNew("feat"), req = biStr(r.prerequisite), m = req.match(/^(str|dex|con|int|wis|cha)[a-z]*\s+(\d+)(\s+or\s+higher)?$/i);
    Object.assign(d, { name: g.name, desc: biCut(P, g.name, "the description", biStr(r.description), 4000) });
    if (!req || /^(none|n\/?a|-)$/i.test(req)) d.reqType = "none";
    else if (/^(spellcasting|the ability to cast (at least one )?spells?)$/i.test(req)) d.reqType = "cast";
    else if (m) Object.assign(d, { reqType: "ability", reqAb: m[1].toLowerCase(), reqMin: +m[2] });
    else Object.assign(d, { reqType: "other", reqText: req.slice(0, 80) });
    const inc = biStr(r.ability_increase);
    if (/^any/i.test(inc)) d.abType = "any"; else if (biAbs(inc).length) Object.assign(d, { abType: "some", abs: biAbs(inc) });
    return { dest: "hb", x: hbItemOf(d) };
  },
  species(g, P) {
    const d = hbNew("species"), skills = [];
    Object.assign(d, { name: g.name, traits: [], subs: [], speed: 30 });
    for (const r of g.rows) {
      if (biStr(r.subrace)) { d.subs.push({ n: biStr(r.subrace), d: biCut(P, g.name, "a subrace's text", biStr(r.trait_text) || biStr(r.description), 4000), fx: [], asi: biAsi(r.ability_bonuses) }); continue; }
      if (biStr(r.speed)) d.speed = parseInt(r.speed) || 30;
      if (biStr(r.ability_bonuses)) d.asi = { ...d.asi, ...biAsi(r.ability_bonuses) };
      skills.push(...biSkills(r.skills));
      if (biStr(r.description)) d.desc = d.desc ? d.desc + "\n\n" + biStr(r.description) : biStr(r.description);
      if (biStr(r.trait)) d.traits.push({ l: 1, n: biStr(r.trait), d: biCut(P, g.name, "a trait's text", biStr(r.trait_text), 4000), fx: [] });
    }
    d.skills = skills.length ? [skills[0]] : [""];
    if (skills.length > 1) P.probs.push(`${g.name}: a species gives one skill on the sheet, so only ${skills[0]} was kept`);
    d.term = d.subs.length ? "Subrace" : "";
    return { dest: "hb", x: hbItemOf(d) };
  },
  background(g, P) {
    const r = g.rows[0], d = hbNew("background"), sk = biSkills(r.skills);
    const feature = biStr(r.feature) ? `**${biStr(r.feature)}.** ${biStr(r.feature_text)}` : "";
    Object.assign(d, { name: g.name, desc: biCut(P, g.name, "the description", [biStr(r.description), feature].filter(Boolean).join("\n\n"), 4000), skills: [sk[0] || "", sk[1] || ""], gear: biStr(r.equipment) });
    if (sk.length < 2) P.probs.push(`${g.name}: ${sk.length ? "only one skill" : "no skills"} the Forge knows`);
    return { dest: "hb", x: hbItemOf(d) };
  },
  subclass(g, P) {
    if (!g.cls) throw new Error(`“${biStr(g.rows[0].class) || "no class"}” isn't a class the Forge knows`);
    const d = hbNew("subclass"), first = subclassLevel("2014", g.cls);
    Object.assign(d, { name: g.name, cls: g.cls, desc: biCut(P, g.name, "the description", g.rows.map(r => biStr(r.description)).find(Boolean) || "", 4000),
      features: g.rows.filter(r => biStr(r.feature)).map(r => ({ l: clamp(parseInt(r.level) || first, 1, 20), n: biStr(r.feature), d: biCut(P, g.name, `${biStr(r.feature)}'s text`, biStr(r.feature_text), 4000), fx: [] })) });
    if (!d.features.length) P.probs.push(`${g.name}: no features (one row per feature, with its level)`);
    return { dest: "hb", x: hbItemOf(d) };
  },
  item(g, P) {
    const r = g.rows[0], att = biStr(r.attunement);
    const d = loreItemDraft({ name: g.name, desc: biStr(r.description), tags: [biStr(r.type), biStr(r.rarity)].filter(Boolean) }, "");
    const rk = RARITY.findIndex(x => x.toLowerCase() === biStr(r.rarity).toLowerCase());
    if (rk >= 0) d.rarOverride = rk; else if (biStr(r.rarity)) P.probs.push(`${g.name}: “${biStr(r.rarity)}” isn't a rarity, so it was guessed from the text`);
    if (att) d.att = biYes(att) || /^requir/i.test(att) ? "yes" : "no";
    return { dest: "item", x: ciRecord(d) };
  },
  monster(g, P) {
    const r = g.rows[0], f = loreMonster({ name: g.name, desc: biStr(r.stat_block) || biStr(r.description), sections: [], tags: [] });
    if (f.needsStats) P.probs.push(`${g.name}: no stat block found (it needs Armor Class, Hit Points and the six scores), so it was added with its text only`);
    return { dest: "monster", x: f };
  }
};
/* why the Forge already has this entry, or "" */
function biHave(kind, name, cls) {
  const lc = s => String(s || "").toLowerCase(), n = lc(name);
  if (BI_COLS[kind] && HB_KINDS[kind]) {
    const h = hbAny(kind).find(x => lc(x.name) === n && (kind !== "subclass" || x.cls === cls));
    if (h) return h.book ? `already in the Forge (${dmBook(h.src).name})` : h.pend ? "already waiting for your approval" : "already in your homebrew";
  }
  const built = {
    spell: () => { spLoad(); return [...SP.data["2014"], ...SP.data["2024"]].some(s => !s.hb && lc(s.n) === n); },
    feat: () => [...FEATS["2014"], ...FEATS["2024"]].some(F => lc(F[0]) === n),
    species: () => ["2014", "2024"].some(ed => Object.keys(PC_RACES[ed]).some(k => !PC_RACES[ed][k].hb && lc(k) === n)),
    background: () => ["2014", "2024"].some(ed => Object.keys(BG_DATA[ed]).some(k => lc(k) === n)),
    subclass: () => ["2014", "2024"].some(ed => ((SUBCLASSES[ed] || {})[cls] || []).some(x => lc(x[0]) === n)),
    item: () => { itLoad(); return IT.custom.some(x => lc(x.n) === n) || Object.values(IT.data).flat().some(x => lc(x.n) === n); },
    monster: () => { mbLoadLib(); return MB.lib.some(x => lc(x.name) === n); }
  }[kind];
  if (built && built()) return kind === "item" ? "already in Items" : kind === "monster" ? "already in My monsters" : "already in the Forge's rules";
  return "";
}
function biPlan(rows) {
  const P = { add: [], skip: [], probs: [] }, groups = new Map();
  rows.forEach((r, i) => {
    const line = i + 2, kind = BI_KIND[biKey(r.kind)], name = biStr(r.name).slice(0, 60);
    if (!kind) { P.probs.push(`Row ${line}: “${biStr(r.kind) || "(empty)"}” isn't a kind the import knows (${Object.keys(BI_COLS).join(", ")})`); return; }
    if (!name) { P.probs.push(`Row ${line}: no name`); return; }
    const cls = kind === "subclass" ? biClass(r.class) : "", k = `${kind}|${cls}|${name.toLowerCase()}`;
    if (!groups.has(k)) groups.set(k, { kind, name, cls, rows: [] });
    groups.get(k).rows.push(r);
  });
  for (const g of groups.values()) {
    const why = biHave(g.kind, g.name, g.cls);
    if (why) { P.skip.push(`${g.name} (${g.kind}): ${why}`); continue; }
    try { P.add.push({ kind: g.kind, name: g.name, ...BI_MAKE[g.kind](g, P) }); } catch (e) { P.probs.push(`${g.name}: ${e.message}`); }
  }
  return P;
}
/* add everything in the plan; onStep(done, total) while campaign homebrew is sent one by one */
async function biCommit(P, onStep = () => { }) {
  const hb = P.add.filter(e => e.dest === "hb").map(e => e.x), items = P.add.filter(e => e.dest === "item").map(e => e.x), mons = P.add.filter(e => e.dest === "monster").map(e => e.x);
  const R = { hb: 0, fail: 0, items: 0, mons: 0 };
  if (hb.length && hbCloud()) {
    for (const x of hb) { if (await Portal.hbPut(x)) R.hb++; else R.fail++; onStep(R.hb + R.fail, hb.length); }
  } else if (hb.length) {
    const l = HB.list.concat(hb);
    try { localStorage.setItem(HB_KEY, JSON.stringify(l)); hbSet(l); R.hb = hb.length; } catch { R.fail = hb.length; }
  }
  if (items.length) { itLoad(); IT.custom.push(...items); itPersist(); R.items = items.length; }
  if (mons.length) { mbLoadLib(); MB.lib.push(...mons); if (mbSaveLib()) { R.mons = mons.length; bsCustomRefresh(); } else MB.lib.splice(MB.lib.length - mons.length); }
  return R;
}

/* ---- the window ---- */
function biOpen() {
  BI.plan = null;
  $("#bulkTpl").innerHTML = Object.keys(BI_COLS).map(k => `<button class="btn sm" type="button" data-bitpl="${k}" style="flex:0 0 auto">${esc(BI_LABEL[k])}</button>`).join("");
  $("#bulkOut").innerHTML = ""; $("#bulkFile").value = ""; $("#bulkGo").disabled = true; $("#bulkGo").textContent = "Add";
  $("#bulkModal").classList.add("open"); $("#bulkCancel").focus();
}
function biClose() { if (BI.busy) return; $("#bulkModal").classList.remove("open"); BI.plan = null; }
function biPlanHTML(P) {
  const by = {}; P.add.forEach(e => by[e.kind] = (by[e.kind] || 0) + 1);
  const where = hbCloud() ? `the campaign ${esc(Portal.campName())}` : "this browser";
  const list = (title, L, open) => L.length ? `<details ${open ? "open" : ""}><summary><b>${esc(title)}</b> (${L.length})</summary><ul class="plain">${L.slice(0, 300).map(x => `<li>${esc(x)}</li>`).join("")}${L.length > 300 ? `<li>…and ${L.length - 300} more</li>` : ""}</ul></details>` : "";
  return `${P.add.length ? `<p><b>Ready to add:</b> ${Object.entries(by).map(([k, n]) => biCount(n, k)).join(", ")}.</p>
      <p class="hint">Spells, feats, species, backgrounds and subclasses go to your homebrew in ${where}${hbCloud() ? ", where your players can choose them" : ""}. Magic items go to Items → Custom, monsters to My monsters.</p>` : `<p><b>Nothing new to add.</b></p>`}
    ${list("Problems (added as noted, or left out)", P.probs, P.probs.length <= 8)}
    ${list("Skipped: the Forge already has these", P.skip, false)}
    ${list("To add", P.add.map(e => `${e.name} (${e.kind})`), false)}`;
}
async function biFile(file) {
  if (!file) return;
  if (file.size > BI_MAX_BYTES) { $("#bulkOut").innerHTML = `<p class="imp-err">That file is over 5 MB. Split it into smaller files.</p>`; return; }
  const R = biRead(await file.text());
  if (R.error) { BI.plan = null; $("#bulkGo").disabled = true; $("#bulkOut").innerHTML = `<p class="imp-err">${esc(R.error)}</p>`; return; }
  BI.plan = biPlan(R.rows);
  $("#bulkOut").innerHTML = biPlanHTML(BI.plan);
  $("#bulkGo").disabled = !BI.plan.add.length; $("#bulkGo").textContent = BI.plan.add.length ? `Add ${BI.plan.add.length}` : "Add";
}
async function biGo() {
  const P = BI.plan; if (!P || !P.add.length || BI.busy) return;
  BI.busy = true; $("#bulkGo").disabled = true; $("#bulkCancel").disabled = true;
  try {
    const R = await biCommit(P, (n, t) => { $("#bulkGo").textContent = `Adding ${n} of ${t}…`; });
    const parts = [R.hb && biCount(R.hb, "hb"), R.items && biCount(R.items, "item"), R.mons && biCount(R.mons, "monster")].filter(Boolean);
    toast(parts.length ? `Added ${parts.join(", ")}` : "Nothing was added");
    if (R.fail) $("#bulkOut").insertAdjacentHTML("afterbegin", `<p class="imp-err">${R.fail} homebrew ${R.fail === 1 ? "entry" : "entries"} couldn't be saved${hbCloud() ? "" : " (this browser's storage is full)"}.</p>`);
    hbRefreshUI(); if (location.hash === "#homebrew") renderHomebrew();
    BI.plan = null; $("#bulkGo").textContent = "Add";
    if (!R.fail) { BI.busy = false; $("#bulkCancel").disabled = false; biClose(); }
  } finally { BI.busy = false; $("#bulkCancel").disabled = false; }
}
(function initBulk() {
  document.addEventListener("click", e => {
    if (e.target.closest("#hbBulk")) { biOpen(); return; }
    const t = e.target.closest("[data-bitpl]"); if (t) saveFile(`forge-${t.dataset.bitpl}-template.csv`, new Blob([biTemplate(t.dataset.bitpl)], { type: "text/csv" }));
  });
  $("#bulkFile").addEventListener("change", e => biFile(e.target.files[0]));
  $("#bulkGo").addEventListener("click", biGo);
  $("#bulkCancel").addEventListener("click", biClose);
  $("#bulkModal").addEventListener("click", e => { if (e.target.id === "bulkModal") biClose(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#bulkModal").classList.contains("open")) biClose(); });
})();
