/* 17-mythweaver.js: MythWeaver campaign import and the Import campaign window. */

/* ======================= MythWeaver import =======================
   MythWeaver exports a whole account as JSON ({format: "mythweaver-account-export", campaigns, otherLore, characters, images}).
   mwRead keeps only what the Forge uses: the account block (email, name) is never read. mwPlanCamp maps one campaign onto
   a Tracker campaign, updating one imported before (matched by mwId) without deleting anything. Nothing here saves. */
const MW_SRC = "MythWeaver";
const MW_TYPE = { location: "place", place: "place", item: "item", monster: "monster", creature: "monster", encounter: "encounter" };
function mwText(s) {
  let t = String(s ?? "");
  if (!/<[a-z!/]/i.test(t)) return t.replace(/\r/g, "").trim();
  t = t.replace(/\r/g, "").replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*h([1-6])[^>]*>/gi, (m, n) => "\n\n" + "#".repeat(Math.min(3, +n)) + " ").replace(/<\/\s*h[1-6]\s*>/gi, "\n\n")
    .replace(/<\s*li[^>]*>/gi, "\n- ").replace(/<\/\s*li\s*>/gi, "")
    .replace(/<\/?\s*(ul|ol)[^>]*>/gi, "\n\n")
    .replace(/<\s*p[^>]*>/gi, "\n\n").replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<\/?\s*(strong|b)\s*>/gi, "**").replace(/<\/?\s*(em|i)\s*>/gi, "*")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&amp;/g, "&");
  return t.split("\n").map(l => l.replace(/[ \t]+$/g, "").replace(/^[ \t]+(?=\S)/, "")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function mwRead(j) {
  if (!j || typeof j !== "object" || j.format !== "mythweaver-account-export") return { error: "This file isn't a MythWeaver export. In MythWeaver, export your account data and choose the .json file it gives you." };
  return {
    campaigns: (Array.isArray(j.campaigns) ? j.campaigns : []).map(c => ({ mwId: String(c.id ?? uid("mw")), name: String(c.name || "Untitled campaign").slice(0, 120), desc: mwText(c.description), gameSystem: String(c.gameSystem || ""), lore: Array.isArray(c.lore) ? c.lore : [], sessions: Array.isArray(c.sessions) ? c.sessions : [] })),
    other: Array.isArray(j.otherLore) ? j.otherLore : [],
    characters: (Array.isArray(j.characters) ? j.characters : []).map(ch => ({ mwId: String(ch.id ?? uid("mw")), name: String(ch.name || (ch.sheet && ch.sheet.name) || "Unnamed").slice(0, 80), cls: ch.class || "", ancestry: ch.ancestry || "", level: +ch.level || 1, gameSystem: String(ch.gameSystem || ""), campaignIds: (ch.campaignIds || []).map(String), sheet: ch.sheet || {}, raw: ch })),
    images: Array.isArray(j.images) ? j.images.length : 0
  };
}
// MythWeaver files many things as "generic"; its tags usually say what they are
function mwTagType(tags) {
  const t = tags.join(" | ").toLowerCase();
  if (/\b(magic item|item|weapon|armou?r|potion|artifact|consumable|treasure|scroll)\b/.test(t)) return "item";
  if (/\b(location|place|city|town|village|dungeon|region|building|tavern|inn|temple|district)\b/.test(t)) return "place";
  if (/\b(monster|creature|beast|undead|stat block)\b/.test(t)) return "monster";
  if (/\bencounter\b/.test(t)) return "encounter";
  return "other";
}
const mwPlain = s => String(s || "").replace(/\*\*|__/g, "").replace(/^[-*#\s]+/, "").trim();
function mwLore(x, extraTag) {
  const tags = (Array.isArray(x.tags) ? x.tags : []).map(String).filter(Boolean);
  if (extraTag && !tags.includes(extraTag)) tags.push(extraTag);
  return { mwId: (extraTag ? "acct-" : "") + String(x.id ?? uid("mw")), name: String(x.name || "Untitled").slice(0, 120), type: MW_TYPE[String(x.type || "").toLowerCase()] || mwTagType(tags), tags,
    ...(npcUrlOk(x.imageUrl) ? { imgUrl: x.imageUrl } : {}), desc: mwText(x.description), sections: (Array.isArray(x.sections) ? x.sections : []).map(s => ({ t: String(s.title || "").slice(0, 120), x: mwText(s.text), dm: !!s.dmOnly })).filter(s => s.t || s.x), src: MW_SRC };
}
function mwNpc(x) {
  const secs = Array.isArray(x.sections) ? x.sections : [], rs = secs.find(s => /role|occupation/i.test(s.title || ""));
  const role = rs ? mwPlain(mwText(rs.text).split("\n")[0]) : mwPlain((mwText(x.description).split(/[,.;—–]/)[0] || ""));
  const notes = [mwText(x.description), ...secs.map(s => `${s.title || "Notes"}${s.dmOnly ? " (DM only)" : ""}: ${mwText(s.text)}`), (x.tags || []).length ? `Tags: ${x.tags.join(", ")}` : ""].filter(Boolean).join("\n\n");
  return { mwId: String(x.id ?? uid("mw")), name: String(x.name || "Unnamed").slice(0, 120), role: role.slice(0, 60), notes, ...(npcUrlOk(x.imageUrl) ? { imgUrl: x.imageUrl } : {}) };
}
function mwPlanCamp(R, i, existing) {
  const src = R.campaigns[i], updated = !!existing;
  const camp = existing ? JSON.parse(JSON.stringify(existing)) : blankCampaign(src.name);
  ["chapters", "encounters", "sessions", "party", "npcs", "lore", "quests", "loot", "maps"].forEach(k => { if (!Array.isArray(camp[k])) camp[k] = []; });
  camp.mwId = src.mwId; camp.mwAt = Date.now();
  if (!updated || !String(camp.notes || "").trim()) camp.notes = src.desc;
  const upsert = (list, item, fresh) => { const j = list.findIndex(x => x.mwId && x.mwId === item.mwId); if (j >= 0) { list[j] = { ...list[j], ...item, id: list[j].id }; return list[j]; } const it = { id: uid(fresh), ...fresh === "n" ? { attitude: "Unknown" } : {}, ...item }; list.push(it); return it; };
  const lore = src.lore.filter(x => String(x.type || "").toLowerCase() !== "npc"), npcs = src.lore.filter(x => String(x.type || "").toLowerCase() === "npc");
  const loreL = lore.map(x => mwLore(x));
  const places = [...new Set([...loreL, ...camp.lore].filter(l => l.type === "place").map(l => l.name).filter(Boolean))];
  npcs.forEach(x => { const n = mwNpc(x), had = camp.npcs.find(y => y.mwId === n.mwId); if (had && had.img) delete n.imgUrl;
    if (!(had && had.place)) { const pl = mwNpcPlace(x, places); if (pl) n.place = pl; }
    upsert(camp.npcs, n, "n"); });
  [...loreL, ...R.other.map(x => mwLore(x, "Account"))].forEach(x => upsert(camp.lore, x, "lo"));
  // encounters also become fights on the Encounters tab, with the monsters their text names
  const encL = loreL.filter(l => l.type === "encounter");
  if (encL.length) {
    const idx = mwMonsterIndex(lore.filter(x => mwLore(x).type === "monster").map(mwMonster));
    encL.forEach(l => { const e = mwEncounter(l, camp, idx), had = camp.encounters.find(y => y.mwId && y.mwId === e.mwId);
      if (had) { had.name = e.name; had.notes = e.notes; if (!(had.enemies || []).length) had.enemies = e.enemies; } else camp.encounters.push(e); });
  }
  src.sessions.forEach(s => upsert(camp.sessions, { mwId: String(s.id ?? uid("mw")), title: String(s.name || `Session ${s.number || ""}`).trim(), num: +s.number || 0, date: String(s.playedOn || "").slice(0, 10), summary: mwText(s.detailedRecap || s.summary || s.shortRecap || "") }, "s"));
  camp.sessions.sort((a, b) => (+b.num || 0) - (+a.num || 0)); // newest first, as the Sessions tab keeps them
  return { camp, stats: { npcs: npcs.length, lore: lore.length + R.other.length, sessions: src.sessions.length, encounters: encL.length, updated } };
}
/* MythWeaver items and spells -> custom items (Items → Custom) and homebrew spells, so they can be handed out.
   Ones the Forge already has built in (same name) are left out; they're in Items or Spells already. They stay in Lore too. */
const MW_ITEM_CAT = [[/\b(weapon|\w*sword|\w*axe|\w*bow|blade|dagger|mace|spear|\w*hammer|scimitar|rapier|halberd|glaive|trident|whip|flail|pike|sling|club|lance)s?\b/, "Weapon"], [/\bshield\b/, "Shield"], [/\b(armou?r|mail|plate)\b/, "Armor"], [/\b(ammunition|arrows?|bolts?)\b/, "Ammunition"], [/\bpotion\b/, "Potion"], [/\bscroll\b/, "Scroll"], [/\bring\b/, "Ring"], [/\bwand\b/, "Wand"], [/\bstaff\b/, "Staff"], [/\brod\b/, "Rod"]];
const mwIsSpell = x => String(x.type || "").toLowerCase() === "spell" || (Array.isArray(x.tags) && x.tags.some(t => /^\s*spells?\s*$/i.test(t)));
function mwExtras(R, camps) {
  itLoad(); spLoad();
  const all = [...camps.flatMap(i => R.campaigns[i].lore), ...R.other], seen = new Set(), items = [], homebrew = [], monsters = [];
  const builtItem = n => Object.values(IT.data).flat().some(y => y.n.toLowerCase() === n.toLowerCase());
  for (const x of all) {
    const name = impCut(x.name, 60), key = String(x.id ?? name); if (!name || seen.has(key)) continue; seen.add(key);
    const L = mwLore(x), body = [L.desc, ...L.sections.filter(t => !t.dm).map(t => (t.t ? `**${t.t}.** ` : "") + t.x)].filter(Boolean).join("\n\n");
    const hay = (name + " " + L.tags.join(" ") + " " + body).toLowerCase();
    if (mwIsSpell(x)) {
      const m = spellMatch1("2014", name); if (m && !m.fuzzy && !m.s.hb) continue;
      const f = re => { const r = body.match(re); return r ? impCut(mwPlain(r[1]), 120) : ""; };
      const lv = /\bcantrip\b/.test(hay) ? 0 : +((hay.match(/\b([1-9])(?:st|nd|rd|th)[- ]level\b/) || hay.match(/\blevel\s*([1-9])\b/) || [])[1] || 1);
      const comp = f(/components?\**:?\**\s*([^\n]+)/i), du = f(/duration\**:?\**\s*([^\n]+)/i);
      homebrew.push({ id: uid("hb"), kind: "spell", src: MW_SRC, ed: "both", name, desc: impCut(body || "Imported from MythWeaver.", 4000), l: lv, s: SP_SCHOOLS.find(k => hay.includes(k.toLowerCase())) || "Evocation",
        c: Object.keys(CLASS_DATA).filter(k => L.tags.some(t => impSame(t, k))), t: f(/casting time\**:?\**\s*([^\n]+)/i) || "1 action", r: f(/range\**:?\**\s*([^\n]+)/i) || "Self",
        cp: comp ? ["V", "S", "M"].filter(k => new RegExp(`(^|[ ,])${k}([ ,(.]|$)`).test(comp)).join("") : "VS", m: impCut(((comp || "").match(/\(([^)]*)\)/) || [])[1] || "", 200), du: du || "Instantaneous", co: /concentration/i.test(du), ri: /\britual\b/.test(hay), h: "" });
    } else if (L.type === "monster") {
      monsters.push(mwMonster(x));
    } else if (L.type === "item") {
      if (builtItem(name)) continue;
      items.push({ ...ciRecord(loreItemDraft({ ...L, name }, "Imported from MythWeaver.")), mwId: "mw-" + key, src: MW_SRC });
    }
  }
  return { items, homebrew, monsters };
}
/* A Lore entry ({name, tags, desc, sections}) -> a custom item draft (Items → Custom): its type and rarity are read from the text.
   DM-only sections stay out of the item's text, since items can be handed to players. */
function loreItemDraft(L, fallback) {
  const name = impCut(L.name, 60), body = [L.desc, ...(L.sections || []).filter(t => !t.dm).map(t => (t.t ? `**${t.t}.** ` : "") + t.x)].filter(Boolean).join("\n\n");
  const tags = L.tags || [], hay = (name + " " + tags.join(" ") + " " + body).toLowerCase();
  const d = ciNew(); d.n = name; const catHay = (name + " " + tags.join(" ") + " " + String(L.desc || "").split("\n")[0].slice(0, 120)).toLowerCase().replace(/armou?r class/g, ""); d.type = (MW_ITEM_CAT.find(([re]) => re.test(catHay)) || [0, "Wondrous Item"])[1];
  const rar = ["very rare", "legendary", "uncommon", "rare", "common"].find(r => new RegExp(`\\b${r}\\b`).test(hay));
  d.rarOverride = rar ? RARITY.findIndex(r => r.toLowerCase() === rar) : ""; d.att = /requires? attunement/.test(hay) ? "yes" : "no";
  d.flavor = body || fallback;
  return d;
}
/* A MythWeaver monster entry -> a My monsters entry (the builder's form). If its text has a stat block (AC, HP and the six
   scores) the numbers come from it, with traits and actions; otherwise it keeps the name and text and is marked needsStats. */
function mwMonster(x) {
  const f = loreMonster(mwLore(x)); f.mwId = "mw-" + String(x.id ?? f.name); f.src = MW_SRC; return f;
}
/* A Lore entry -> a My monsters entry, the same way (Lore saves use it too) */
function loreMonster(L) {
  const f = mbBlank();
  const text = [L.desc, ...(L.sections || []).map(t => (t.t ? `## ${t.t}\n` : "") + t.x)].filter(Boolean).join("\n\n"), plain = text.replace(/\*\*|__|\*/g, "");
  const num = re => { const m = plain.match(re); return m ? m : null; };
  f.id = uid("mm"); f.name = impCut(L.name, 80); f.desc = impCut(text, 4000);
  const st = num(/\b(tiny|small|medium|large|huge|gargantuan)\s+(aberration|beast|celestial|construct|dragon|elemental|fey|fiend|giant|humanoid|monstrosity|ooze|plant|undead)s?\b(?:\s*\(([^)]*)\))?(?:,\s*([^\n]+))?/i);
  if (st) { f.size = st[1].toLowerCase(); f.type = st[2].toLowerCase(); f.sub = impCut(st[3] || "", 60); f.al = impCut(st[4] || "", 40); }
  const ac = num(/(?:armou?r class|\bAC)\s*:?\s*(\d+)(?:\s*\(([^)]*)\))?/i), hp = num(/(?:hit points|\bHP)\s*:?\s*(\d+)(?:\s*\((\d+)d(\d+)[^)]*\))?/i);
  const sc = ["STR", "DEX", "CON", "INT", "WIS", "CHA"].map(a => { const m = plain.match(new RegExp(`\\b${a}\\b\\s*:?\\s*(\\d{1,2})\\b`, "i")); return m ? +m[1] : null; });
  let scores = sc.every(v => v) ? sc : null;
  if (!scores) { const row = [...plain.matchAll(/\b(\d{1,2})\s*\(\s*[+\-−–]\s*\d+\s*\)/g)].map(m => +m[1]); if (row.length >= 6) scores = row.slice(0, 6); }
  if (ac) { f.ac = +ac[1]; f.acd = impCut(ac[2] || "", 40); }
  if (hp) { f.hp = +hp[1]; if (hp[2]) { f.hdN = +hp[2]; f.hdD = +hp[3]; } else { f.hdN = ""; } }
  if (scores) f.scores = scores.map(v => clamp(v, 1, 30));
  const sp = num(/\bspeed\s*:?\s*(\d+)\s*ft[^\n]*/i);
  if (sp) { f.speed.walk = +sp[1]; ["fly", "swim", "climb", "burrow"].forEach(k => { const m = sp[0].match(new RegExp(`${k}\\s*(\\d+)`, "i")); f.speed[k] = m ? +m[1] : ""; }); f.speed.hover = /hover/i.test(sp[0]); }
  const cr = num(/(?:challenge|\bCR)\s*:?\s*(\d+\s*\/\s*\d+|\d+)/i);
  if (cr) { const v = cr[1].includes("/") ? cr[1].split("/").reduce((a, b) => +a / +b) : +cr[1]; f.cr = CR_LIST.reduce((b, c) => Math.abs(c - v) < Math.abs(b - v) ? c : b, CR_LIST[0]); }
  const dv = num(/darkvision\s*(\d+)/i); f.senses.dark = dv ? +dv[1] : "";
  ["blind", "tremor", "true"].forEach(k => { const m = plain.match(new RegExp(`${k}(?:sight|sense)\\s*(\\d+)`, "i")); if (m) f.senses[k] = +m[1]; });
  const lang = num(/\blanguages\s*:?\s*([^\n]+)/i); if (lang) f.lang = impCut(lang[1], 120);
  [["res", /damage resistances\s*:?\s*([^\n]+)/i], ["imm", /damage immunities\s*:?\s*([^\n]+)/i], ["vul", /damage vulnerabilities\s*:?\s*([^\n]+)/i], ["ci", /condition immunities\s*:?\s*([^\n]+)/i]].forEach(([k, re]) => { const m = plain.match(re); if (m) f[k] = impCut(m[1], 160); });
  f.needsStats = !(ac && hp && scores);
  if (!f.needsStats) {
    // "Name. What it does." lines, filed under the heading above them (Actions, Bonus Actions, Reactions, Legendary Actions; traits before any of those)
    let list = "traits";
    for (const raw of text.split("\n")) {
      const line = raw.trim(), head = line.replace(/^#+\s*|\*\*|__|:$/g, "").trim().toLowerCase();
      if (/^(actions?)$/.test(head)) { list = "actions"; continue; } if (/^bonus actions?$/.test(head)) { list = "bonus"; continue; }
      if (/^reactions?$/.test(head)) { list = "reacts"; continue; } if (/^legendary actions?(?:\s*\([^)]*\))?$/.test(head)) { list = "legend"; const n=head.match(/(\d+)\s*(?:per|\/|actions)/); if(n)f.legN=+n[1]; continue; } if (/^lair actions?(?:\s*\([^)]*\))?$/.test(head)) { list = "lair"; continue; }
      const m = line.replace(/\*+|__/g, "").match(/^-?\s*([A-Z][^.\n]{1,58}?)\.\s+(.{3,})$/);
      if (!m || m[1].trim().split(/\s+/).length > 6 || /^(armou?r class|hit points|speed|str|dex|con|int|wis|cha|saving throws|skills|senses|languages|challenge|damage|condition)\b/i.test(m[1])) continue;
      f[list].push({ n: impCut(m[1].trim(), 60), t: impCut(m[2], 1000) });
    }
  }
  return f;
}
/* MythWeaver NPC -> a place: a tag, or the first line of a Location / Lives / Home section, naming one of the campaign's Places */
function mwNpcPlace(x, places) {
  if (!places.length) return "";
  const hit = t => places.find(p => impSame(p, t)) || "";
  for (const t of x.tags || []) { const h = hit(String(t)); if (h) return h; }
  for (const sec of x.sections || []) if (/location|lives|home|based|found|residence|where/i.test(sec.title || "")) {
    const txt = mwPlain(mwText(sec.text).split("\n")[0]).toLowerCase(); const h = places.find(p => txt.includes(p.toLowerCase())); if (h) return h; }
  return "";
}
/* Every monster an encounter's text might name: the Monster Manual (both rule sets), My monsters and the ones in this import. Longest names first. */
function mwMonsterIndex(extra) {
  const seen = new Map(), add = (n, cr, ac, hp) => { const k = String(n || "").toLowerCase(); if (k.length >= 3 && !seen.has(k)) seen.set(k, { n, cr: +cr || 0, ac: +ac || 12, hp: +hp || 10 }); };
  [...MB.lib, ...(extra || [])].forEach(f => { try { const m = mbCompile(f, "x"); add(m.n, m.cr, m.ac, m.hp); } catch { } });
  try { const d = dmData("monsterData"); ["2014", "2024"].forEach(ed => (d[ed] || []).forEach(m => add(m.n, m.cr, m.ac, m.hp))); } catch { }
  return [...seen.values()].sort((a, b) => b.n.length - a.n.length);
}
const MW_NUMS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, pair: 2, couple: 2, several: 3, few: 3 };
// "3 goblins", "two Bugbears", "Ogre x2", "a wolf": the largest count named for each monster, matching each stretch of text once
function mwFoes(text, idx) {
  const low = " " + String(text || "").toLowerCase().replace(/[*_#]/g, " ") + " ", used = [], out = [];
  for (const m of idx) {
    const nm = m.n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!low.includes(m.n.toLowerCase().slice(0, -1))) continue;
    const re = new RegExp(`(?:\\b(\\d{1,2}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|pair|couple|several|few)\\s+(?:of\\s+)?(?:[x×]\\s*)?)?\\b${nm}(?:e?s)?\\b(?:\\s*[x×]\\s*(\\d{1,2}))?`, "gi");
    let r, count = 0;
    while ((r = re.exec(low))) {
      const a = r.index, b = a + r[0].length; if (used.some(([x, y]) => a < y && b > x)) continue; used.push([a, b]);
      count = Math.max(count, r[2] ? +r[2] : r[1] ? (/^\d/.test(r[1]) ? +r[1] : MW_NUMS[r[1].toLowerCase()] || 1) : 1);
    }
    if (count) out.push({ ...m, count: clamp(count, 1, 20) });
  }
  return out;
}
function mwEncounter(l, camp, idx, from = "Imported from MythWeaver") {
  const text = [l.desc, ...l.sections.map(t => (t.t ? `${t.t}${t.dm ? " (DM only)" : ""}: ` : "") + t.x)].filter(Boolean).join("\n\n");
  const foes = mwFoes([l.name, text].join("\n"), idx);
  const e = newEncounter(null, l.name, camp.currentLevel || 1, foes.map(f => ({ name: f.n, stat: f.n, cr: f.cr, count: f.count, boss: false })),
    { kind: "import", ...(l.mwId ? { mwId: l.mwId } : {}), notes: impCut(text, 4000) + `\n\n(${from}.${foes.length ? " Monsters were read from the text: check them." : " No monsters were found in its text: add them here."})` });
  e.enemies.forEach(m => { const f = foes.find(x => x.n === m.stat); if (f) { m.ac = f.ac; m.hp = m.max = f.hp; } });
  return e;
}
// a MythWeaver character -> a Draft for importBuild (its scores are starting scores, before the species bonus)
function mwChar(ch, ed) {
  ed = ed === "2024" ? "2024" : "2014";
  const sh = ch.sheet || {}, sel = sh.selectionsBySlot || {}, A = sh.abilityScores || {};
  const D = { src: MW_SRC, mwId: ch.mwId, opts: {}, extras: {}, homebrew: [], report: { matched: [], made: [], differ: [], dropped: [] }, base: {} };
  const cName = impTitle(String(sel.class || ch.cls || "").replace(/-/g, " "));
  const cls = impClassMatch(ed, cName, D) || impClass(ed, cName, null, D, MW_SRC);
  if (!cls) return { error: `${ch.name} has no class in the file.` };
  for (const a of AB) { const v = +A[a] || +A[{ int: "intelligence" }[a]]; if (!(v > 0)) return { error: `${ch.name} has no ability scores in the file.` }; D.base[a] = v; }
  const lv = clamp(+sh.level || ch.level || 1, 1, 20);
  // species: a species, or a subrace's name; a species with subraces the file doesn't name gets the first one
  const sName = impTitle(String(sel.species || ch.ancestry || "").replace(/-/g, " ")), R = PC_RACES[ed];
  let race = Object.keys(R).find(k => !R[k].pend && impSame(k, sName)) || null, sub = "none";
  if (!race) for (const k of Object.keys(R)) { const S = R[k].subs || {}; const sk = Object.keys(S).find(s => impSame(s, sName) || impSame(S[s].label, sName)); if (sk) { race = k; sub = sk; break; } }
  const fixedSp = !race && sName && impSpeciesMatch(ed, sName, D); /* a misspelled species (reported by impSpeciesMatch) */
  if (fixedSp) race = fixedSp;
  if (race && sub === "none" && R[race].subs) { sub = Object.keys(R[race].subs)[0]; D.report.differ.push(`MythWeaver doesn't say which kind of ${race}: the Forge chose ${sub}. Change it on the sheet if needed`); }
  if (race && !fixedSp) D.report.matched.push(`Species: ${sub !== "none" ? sub : race}`);
  else if (race) { /* already reported */ }
  else if (sName) { const have = impHave("species", sName); race = have ? have.name : impCut(sName, 60); if (!have) { D.homebrew.push({ id: uid("hb"), kind: "species", src: MW_SRC, ed, name: race, desc: "Imported from MythWeaver; add its traits here.", asi: {}, speed: 30, skills: [], term: "", traits: [], subs: [] }); D.report.made.push(`${race} (species, name only)`); } }
  else return { error: `${ch.name} has no species in the file.` };
  const bName = impTitle(String(sel.background || "").replace(/-/g, " "));
  let bg = bName ? impListMatch("Background", bgList(ed), bName, D) || (impHave("background", bName) || {}).name || null : null;
  if (bg) { if (![...D.report.matched, ...D.report.differ].some(t => t.startsWith("Background: "))) D.report.matched.push(`Background: ${bg}`); }
  else if (bName) { bg = impCut(bName, 60); D.homebrew.push({ id: uid("hb"), kind: "background", src: MW_SRC, ed, name: bg, desc: "Imported from MythWeaver; add its feature here.", skills: [], feat: "", gear: "", fx: [] }); D.report.made.push(`${bg} (background, name only)`); }
  const keepSkills = (sel.class_skills || []).map(s => ALL_SKILLS.find(k => impSame(k, String(s).replace(/^skill-/, "").replace(/-/g, " ")))).filter(Boolean);
  const gearIds = Object.entries(sel).filter(([k]) => /equipment/i.test(k)).flatMap(([, v]) => Array.isArray(v) ? v : [v]).filter(v => typeof v === "string");
  const inv = gearIds.map(id => { const { g, n, qty } = impGear(ed, impTitle(id.replace(/-/g, " "))); return { id: uid("i"), ref: g ? g.id : undefined, n, qty, w: impW(g), att: false, attuned: false, value: g ? g.c : undefined, note: "", eq: eqIsWeapon(g) || eqIsArmor(g) }; });
  D.report.matched.unshift(`${cls} ${lv}`);
  D.opts = { seed: "mw|" + ch.mwId, name: ch.name, ed, bonus: "fixed", method: "array", cls, level: lv, subclass: "none", race, sub, bg: bg || undefined, keepSkills };
  { const texts = []; const walk = (v, d) => { if (d > 6 || v == null) return; if (typeof v === "string") { if (v.length > 12) texts.push(mwText(v)); } else if (typeof v === "object") Object.values(v).forEach(x => walk(x, d + 1)); };
    walk(ch.raw || ch.sheet, 0); impGenderSet(D, impGender(ch.raw || ch.sheet, texts)); }
  D.extras = { inv, coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, prepared: [], langs: (sel.background_language_choices || []).map(x => impTitle(String(x).replace(/-/g, " "))).join(", ") };
  if (lv >= subclassLevel(ed, cls)) D.report.differ.push(`No ${cls} subclass in the file: choose one on the sheet`);
  return D;
}

/* ---- the Import campaign window (MythWeaver exports) ---- */
const MWI = { read: null };
const mwMB = n => (n / 1e6).toFixed(n < 1e5 ? 2 : 1) + " MB";
const lsUsed = () => { let n = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += k.length + (localStorage.getItem(k) || "").length; } } catch { } return n; };
function mwWindowHTML(R) {
  const have = i => Store.list().find(c => c.mwId && c.mwId === R.campaigns[i].mwId);
  const size = R.campaigns.reduce((t, c, i) => t + JSON.stringify(mwPlanCamp(R, i, null).camp).length, 0), free = Math.max(0, 5e6 - lsUsed());
  const ed = /5e\.2|2024/.test((R.characters[0] || {}).gameSystem || "") ? "2024" : "2014";
  return `<p>Choose what to bring into the Campaign Tracker. NPCs go to each campaign's NPCs tab (and to Your NPCs on the NPC tab), encounters to Encounters (and Lore), sessions to Sessions, and everything else to its <b>Lore</b> tab.</p>
    <h4>Campaigns</h4>${R.campaigns.map((c, i) => { const h = have(i), npcs = c.lore.filter(x => String(x.type).toLowerCase() === "npc").length;
      return `<label class="check"><input type="checkbox" data-mwcamp="${i}" checked><span><b>${esc(c.name)}</b><br><small class="muted">${npcs} NPC${npcs === 1 ? "" : "s"} · ${c.lore.length - npcs + R.other.length} lore · ${(n => n ? `${n} encounter${n === 1 ? "" : "s"} · ` : "")(c.lore.filter(x => mwLore(x).type === "encounter").length)}${c.sessions.length} session${c.sessions.length === 1 ? "" : "s"}${h ? ` · Updates ${esc(h.name)} (imported ${new Date(h.mwAt || h.updated || Date.now()).toLocaleDateString()})` : ""}</small></span></label>`; }).join("")}
    ${R.characters.length ? `<h4>Characters (to the Characters tab)</h4>${R.characters.map((c, i) => `<label class="check"><input type="checkbox" data-mwchar="${i}" ${PCS.roster.some(x => x.mwId === c.mwId) ? "" : "checked"}><span><b>${esc(c.name)}</b><br><small class="muted">${esc(impTitle(c.cls || (c.sheet.selectionsBySlot || {}).class || ""))} ${c.level} · ${esc(c.ancestry)}${PCS.roster.some(x => x.mwId === c.mwId) ? " · already on the Characters tab" : ""}</small></span></label>`).join("")}
      <div class="field"><label>Rules for characters</label><div class="seg"><label class="opt"><input type="radio" name="impCampEd" value="2014" ${ed === "2014" ? "checked" : ""}><span>2014 rules</span></label><label class="opt"><input type="radio" name="impCampEd" value="2024" ${ed === "2024" ? "checked" : ""}><span>2024 rules</span></label></div></div>` : ""}
    ${(() => { const X = mwExtras(R, R.campaigns.map((c, i) => i)), ni = X.items.length, ns = X.homebrew.length, nm = X.monsters.length, nb = X.monsters.filter(f => f.needsStats).length, pl = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
      return ni || ns || nm ? `<h4>Items, spells and monsters</h4><label class="check"><input type="checkbox" data-mwextras checked><span>Add ${[ni ? `${pl(ni, "item")} to <b>Items → Custom</b>` : "", ns ? `${pl(ns, "spell")} to <b>Homebrew</b>` : "", nm ? `${pl(nm, "monster")} to <b>My monsters</b>` : ""].filter(Boolean).join(", ").replace(/, ([^,]*)$/, " and $1")}, so you can use them in play<br><small class="muted">They stay in Lore too. Ones the Forge already has are left out, and importing again updates items.${nb ? ` ${nb === nm ? (nm === 1 ? "The monster has" : "The monsters have") : `${pl(nb, "monster")} ${nb === 1 ? "has" : "have"}`} no stat block in MythWeaver, so ${nb === 1 ? "it's" : "they're"} marked “needs stats” for you to finish in Build a monster.` : ""}${ns && hbCloud() && !Portal.isDM() ? " Only the DM can add homebrew spells." : ""}</small></span></label>` : ""; })()}
    <p class="hint">About ${mwMB(size)} of text; this browser has room for about ${mwMB(free)} more.${size > free ? ` <b style="color:#f2b8ae">That may not fit: delete an old campaign or untick one first.</b>` : ""}${R.images ? ` ${R.images} MythWeaver picture${R.images === 1 ? "" : "s"} aren't imported; they stay in your MythWeaver account. Pictures attached to an NPC or lore entry come across as links.` : ""}</p>`;
}
function impCampOpen(R) {
  MWI.read = R;
  document.getElementById("impCampBody").innerHTML = mwWindowHTML(R);
  document.getElementById("impCampOut").textContent = ""; document.getElementById("impCampGo").disabled = false;
  document.getElementById("impCampModal").classList.add("open"); document.getElementById("impCampGo").focus();
}
function impCampClose() { document.getElementById("impCampModal").classList.remove("open"); MWI.read = null; }
// Save the chosen campaigns all at once; if the browser is full, put everything back as it was.
async function mwCommit(R, ch) {
  const plans = ch.camps.map(i => mwPlanCamp(R, i, Store.list().find(c => c.mwId && c.mwId === R.campaigns[i].mwId) || null));
  if (Store.mode === "db") plans.forEach(P => Store.save(P.camp));
  else {
    const old = plans.map(P => [P.camp.id, Store.cache.get(P.camp.id)]);
    plans.forEach(P => { P.camp.updated = Date.now(); Store.cache.set(P.camp.id, P.camp); });
    if (!Store.lsWrite()) {
      old.forEach(([id, c]) => { if (c) Store.cache.set(id, c); else Store.cache.delete(id); });
      Store.lsWrite();
      return { ok: false, error: "There isn't room in this browser for that. Delete an old campaign, or untick a campaign, and try again. Nothing was imported." };
    }
    if (Store.mode === "cloud") plans.forEach(P => Cloud.touch(P.camp.id));
    setBadge();
  }
  const notes = [];
  for (const i of ch.chars) {
    const C = R.characters[i]; if (PCS.roster.some(x => x.mwId === C.mwId)) continue;
    const D = mwChar(C, ch.ed); if (D.error) { notes.push(D.error); continue; }
    try { const B = importBuild(D); if (!(await importCommit(D, B.c))) notes.push(`${C.name} wasn't imported.`); } catch (e) { notes.push(`${C.name} couldn't be built.`); }
  }
  if (plans.length) { activeId = plans[0].camp.id; subTab = "overview"; }
  renderTracker();
  return { ok: true, plans, notes };
}
document.getElementById("impCampCancel").addEventListener("click", impCampClose);
document.getElementById("impCampModal").addEventListener("keydown", e => { if (e.key === "Escape") impCampClose(); });
document.getElementById("impCampGo").addEventListener("click", async () => {
  const R = MWI.read; if (!R) return;
  const box = document.getElementById("impCampModal"), pick = a => [...box.querySelectorAll(`[${a}]`)].filter(b => b.checked).map(b => +b.getAttribute(a));
  const ed = (box.querySelector('input[name="impCampEd"]:checked') || {}).value || "2014";
  const camps = pick("data-mwcamp"), chars = pick("data-mwchar");
  if (!camps.length && !chars.length) { document.getElementById("impCampOut").textContent = "Tick something to import."; return; }
  document.getElementById("impCampGo").disabled = true;
  const r = await mwCommit(R, { camps, chars, ed }); if (r.ok) worldAdopt();
  if (!r.ok) { document.getElementById("impCampOut").textContent = r.error; document.getElementById("impCampGo").disabled = false; return; }
  const xb = box.querySelector("[data-mwextras]"), got = xb && xb.checked ? await campExtrasAdopt(mwExtras(R, camps)) : [];
  impCampClose();
  const upd = r.plans.filter(P => P.stats.updated).length, made = r.plans.length - upd;
  toast([made ? `${made} campaign${made === 1 ? "" : "s"} imported` : "", upd ? `${upd} updated` : "", chars.length ? "characters added to the Characters tab" : "", ...got].filter(Boolean).join(", ") + (r.notes.length ? `. ${r.notes.join(" ")}` : ""));
});
