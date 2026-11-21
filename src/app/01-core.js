/* 01-core.js: Shared basics: the rules data loader (dmData), utilities ($, esc, toast), seeded random numbers, encounter maths and the content tables. */

/* The built-in rules data (spells, monsters, items), turned into objects the first time something needs it and shared after that.
   The text comes from the /assets/*.js files (tools/build.mjs); it is dropped once read, to save memory.
   The open-licensed extra books (data/extra-*.json, tools/convert-open5e-extras.py) join the end of each edition's list,
   after the SRD entries, so the SRD entries keep their ids. They are written for the 2014 rules and work in both, so
   each edition gets its own copy (the tabs add their own fields to each one). Each extra entry has src, its book's code. */
const DM_DATA = {};
const DM_EXTRA = { spellData: "spellExtra", monsterData: "monsterExtra", itemData: "itemExtra" };
function dmData(key) {
  if (!DM_DATA[key]) {
    const d = JSON.parse(window.DMDATA[key]); delete window.DMDATA[key];
    const xk = DM_EXTRA[key], text = xk && window.DMDATA[xk];
    if (text) {
      delete window.DMDATA[xk];
      for (const ed of ["2014", "2024"]) {
        const L = JSON.parse(text);
        if (key === "spellData") d[ed].push(...(ed === "2024" ? L.map(dmSpell2024) : L));
        else if (key === "monsterData") d[ed].push(...L);
        else d[ed].mi.push(...L);
      }
    }
    DM_DATA[key] = d;
  }
  return DM_DATA[key];
}
/* Load the largest optional catalog when a tool first needs it. */
let extraMonsterRequest, extraMonstersReady = false;
function dmLoadExtraMonsters() {
  if (extraMonsterRequest) return extraMonsterRequest;
  extraMonsterRequest = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = document.querySelector('meta[name="forge-extra-monsters"]').content;
    script.onload = () => { script.remove(); resolve(); };
    script.onerror = () => { script.remove(); reject(new Error("Extra monsters are unavailable")); };
    document.head.append(script);
  }).then(() => {
    const raw = dmData("monsterData");
    const extra = window.DMDATA.monsterExtra;
    if (extra) {
      for (const ed of ["2014", "2024"]) {
        const first = raw[ed].length;
        raw[ed].push(...JSON.parse(extra));
        if (BS.data) raw[ed].slice(first).forEach((m, i) => bsPrepareMonster(m, ed, first + i));
      }
      delete window.DMDATA.monsterExtra;
    }
    RAND_MON = null;
    extraMonstersReady = true;
    return true;
  }).catch(() => { extraMonsterRequest = null; return false; });
  return extraMonsterRequest;
}
/* 2024 wording for a spell written the 2014 way ("1 action" → "Action") */
function dmSpell2024(s) {
  s.t = s.t.replace(/^1 (action|bonus action|reaction)/, (_, a) => a.replace(/\b\w/g, c => c.toUpperCase()));
  s.du = s.du.replace(/^Up to/, "up to");
  return s;
}
/* The extra books: dmBook(code) → { name, short, by, lic, url }, or null for SRD entries */
function dmBooks() {
  if (!DM_DATA.bookData) { try { DM_DATA.bookData = JSON.parse(window.DMDATA.bookData).books; } catch { DM_DATA.bookData = {}; } }
  return DM_DATA.bookData;
}
function dmBook(code) {
  if (!code) return null;
  return dmBooks()[code] || { name: code, short: code, by: "another publisher" };
}
/* the small tag on a list row, and the "Source" line in its details */
const bookTag = x => { const b = dmBook(x && x.src); return b ? `<span class="tag book hide-sm" title="${esc(b.name)}">${esc(b.short)}</span>` : ""; };
const bookLine = x => { const b = dmBook(x && x.src); return b ? `<p class="hint book-line">Source: <i>${esc(b.name)}</i> (${esc(b.by)})${x.page ? `, p. ${esc(x.page)}` : ""}${b.lic === "reference" ? " · Rules summary" : ", open content"}. <a href="/credits.html" target="_blank" rel="noopener">Credits and licences</a></p>` : ""; };
/* The Book filter's choices for a list: Any, the SRD, then each extra book in it. Its values: "", "srd" or a book code. */
function bookOptions(list) {
  const codes = [...new Set(list.map(x => x.src).filter(Boolean))].sort((a, b) => dmBook(a).name.localeCompare(dmBook(b).name));
  return `<option value="">Any</option><option value="srd">Official rules (SRD)</option>` + codes.map(c => `<option value="${esc(c)}">${esc(dmBook(c).name)}</option>`).join("");
}
const bookOk = (x, v) => !v || (v === "srd" ? !x.src && !x.hb && x.kind !== "custom" : x.src === v);
/* ======================= Utilities ======================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); }
function confirmBox(title, msg, yes = "Delete") {
  return new Promise(res => {
    $("#modalTitle").textContent = title; $("#modalMsg").textContent = msg; $("#modalYes").textContent = yes;
    const m = $("#modal"); m.classList.add("open");
    const done = v => { m.classList.remove("open"); $("#modalYes").onclick = $("#modalNo").onclick = null; res(v); };
    $("#modalYes").onclick = () => done(true); $("#modalNo").onclick = () => done(false);
  });
}
function uid(p = "x") { return p + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ======================= Seeded RNG ======================= */
function xmur3(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }; }
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeRng(...parts) {
  const f = mulberry32(xmur3(parts.join("|"))());
  const R = {
    f, int: (a, b) => a + Math.floor(f() * (b - a + 1)),
    pick: arr => arr[Math.floor(f() * arr.length)],
    chance: p => f() < p,
    shuffle: arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    pickN: (arr, n) => R.shuffle(arr).slice(0, n)
  };
  return R;
}
/* On narrow screens the result is below the form: bring it into view after forging (laptops show it beside the form). */
function showResult(sel) { if (!matchMedia("(max-width:900px)").matches) return; const el = document.querySelector(sel); if (!el) return; const phone = matchMedia("(max-width:600px)").matches; /* phones: the header slides away when scrolling down; tablets: it shrinks to a slim bar */
  scrollTo({ top: el.getBoundingClientRect().top + scrollY - (phone ? 8 : 80), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
const newSeed = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const fill = (s, ctx) => s.replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? k);

/* ======================= 5e encounter math (2014 DMG) ======================= */
const CR_XP = { 0: 10, 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900, 11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000, 16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000, 21: 33000, 22: 41000, 23: 50000, 24: 62000, 30: 155000 };
const THR = {
  easy: [25, 50, 75, 125, 250, 300, 350, 450, 550, 600, 800, 1000, 1100, 1250, 1400, 1600, 2000, 2100, 2400, 2800],
  medium: [50, 100, 150, 250, 500, 600, 750, 900, 1100, 1200, 1600, 2000, 2200, 2500, 2800, 3200, 3900, 4200, 4900, 5700],
  hard: [75, 150, 225, 375, 750, 900, 1100, 1400, 1600, 1900, 2400, 3000, 3400, 3800, 4300, 4800, 5900, 6300, 7300, 8500],
  deadly: [100, 200, 400, 500, 1100, 1400, 1700, 2100, 2400, 2800, 3600, 4500, 5100, 5700, 6400, 7200, 8800, 9500, 10900, 12700]
};
const xpOf = cr => CR_XP[cr] ?? 0;
const mult = n => n <= 1 ? 1 : n === 2 ? 1.5 : n <= 6 ? 2 : n <= 10 ? 2.5 : n <= 14 ? 3 : 4;
const partyThr = (lv, party, d) => THR[d][clamp(lv, 1, 20) - 1] * party;
const crLabel = cr => cr === 0.125 ? "1/8" : cr === 0.25 ? "1/4" : cr === 0.5 ? "1/2" : String(cr);
function rateXP(adj, lv, party) {
  const t = d => partyThr(lv, party, d);
  return adj >= t("deadly") ? "Deadly" : adj >= t("hard") ? "Hard" : adj >= t("medium") ? "Medium" : adj >= t("easy") ? "Easy" : "Trivial";
}
// [name, CR, habitat tags]
const MON = [
  ["Kobold", .125, "cave mine"], ["Giant rat", .125, "sewer cave"], ["Bandit", .125, "keep sewer"], ["Cultist", .125, "temple crypt sewer"],
  ["Goblin", .25, "cave keep mine"], ["Skeleton", .25, "crypt temple"], ["Zombie", .25, "crypt"], ["Wolf", .25, "cave"], ["Giant bat", .25, "cave mine"], ["Swarm of rats", .25, "sewer"], ["Pseudodragon", .25, "temple"],
  ["Orc", .5, "keep cave mine"], ["Hobgoblin", .5, "keep"], ["Gnoll", .5, "cave keep"], ["Shadow", .5, "crypt temple"], ["Gray ooze", .5, "sewer cave mine"], ["Thug", .5, "keep sewer"],
  ["Ghoul", 1, "crypt sewer"], ["Bugbear", 1, "cave keep mine"], ["Giant spider", 1, "cave mine"], ["Animated armor", 1, "keep temple"], ["Specter", 1, "crypt temple"], ["Dire wolf", 1, "cave"], ["Harpy", 1, "cave"], ["Spy", 1, "keep sewer"],
  ["Ogre", 2, "cave keep"], ["Gargoyle", 2, "temple keep"], ["Gelatinous cube", 2, "sewer crypt mine"], ["Cult fanatic", 2, "temple"], ["Priest", 2, "temple"], ["Ghast", 2, "crypt sewer"], ["Wererat", 2, "sewer"], ["Bandit captain", 2, "keep sewer"], ["Mimic", 2, "any"],
  ["Wight", 3, "crypt"], ["Owlbear", 3, "cave"], ["Knight", 3, "keep temple"], ["Veteran", 3, "keep"], ["Basilisk", 3, "cave mine"], ["Hell hound", 3, "temple keep"], ["Mummy", 3, "crypt temple"],
  ["Banshee", 4, "crypt"], ["Black pudding", 4, "sewer mine cave"], ["Ghost", 4, "crypt keep"], ["Ettin", 4, "cave"],
  ["Troll", 5, "cave sewer"], ["Wraith", 5, "crypt"], ["Earth elemental", 5, "mine cave"], ["Hill giant", 5, "cave keep"], ["Vampire spawn", 5, "crypt keep"], ["Otyugh", 5, "sewer"], ["Roper", 5, "cave mine"], ["Gladiator", 5, "keep"],
  ["Mage", 6, "keep temple"], ["Medusa", 6, "temple cave"], ["Chimera", 6, "cave"], ["Wyvern", 6, "cave"],
  ["Stone giant", 7, "cave mine"], ["Young black dragon", 7, "sewer cave"], ["Oni", 7, "keep"],
  ["Assassin", 8, "keep sewer"], ["Young green dragon", 8, "cave"], ["Hydra", 8, "sewer cave"],
  ["Bone devil", 9, "temple crypt"], ["Fire giant", 9, "mine keep"], ["Clay golem", 9, "temple"],
  ["Stone golem", 10, "temple keep mine"], ["Young red dragon", 10, "cave mine"], ["Aboleth", 10, "cave sewer"], ["Deva", 10, "temple"],
  ["Behir", 11, "cave mine"], ["Remorhaz", 11, "cave"], ["Horned devil", 11, "temple"],
  ["Archmage", 12, "keep temple"], ["Erinyes", 12, "temple"],
  ["Adult white dragon", 13, "cave"], ["Rakshasa", 13, "keep temple"], ["Vampire", 13, "crypt keep"], ["Storm giant", 13, "keep"],
  ["Adult black dragon", 14, "sewer cave"], ["Ice devil", 14, "temple"],
  ["Mummy lord", 15, "crypt temple"], ["Purple worm", 15, "cave mine"],
  ["Iron golem", 16, "keep temple mine"], ["Marilith", 16, "temple"], ["Planetar", 16, "temple"],
  ["Adult red dragon", 17, "cave mine"], ["Dragon turtle", 17, "cave sewer"],
  ["Demilich", 18, "crypt"], ["Balor", 19, "temple"], ["Pit fiend", 20, "temple"],
  ["Lich", 21, "crypt temple"], ["Solar", 21, "temple"], ["Ancient blue dragon", 23, "cave"], ["Kraken", 23, "sewer cave"], ["Ancient red dragon", 24, "cave mine"]
];
// stat blocks to run a humanoid/fiendish villain
const VSTAT = [["Thug", .5], ["Spy", 1], ["Bandit captain", 2], ["Cult fanatic", 2], ["Knight", 3], ["Veteran", 3], ["Gladiator", 5], ["Mage", 6], ["Oni", 7], ["Assassin", 8], ["Bone devil", 9], ["Archmage", 12], ["Rakshasa", 13], ["Vampire", 13], ["Mummy lord", 15], ["Pit fiend", 20], ["Lich", 21]];

const hasTag = (m, tags) => !tags || m[2] === "any" || tags.some(t => m[2].split(" ").includes(t));
function encText(parts) { return parts.map(([m, n]) => `${n} × ${m[0]} (CR ${crLabel(m[1])})`).join(" + "); }

function buildEncounter(rng, level, party, diff, tags) {
  level = clamp(level, 1, 20);
  const target = partyThr(level, party, diff);
  const cap = diff === "deadly" ? target * 1.5 : partyThr(level, party, diff === "easy" ? "medium" : diff === "medium" ? "hard" : "deadly");
  const minCR = level <= 3 ? 0 : level / 4, maxCR = level + (diff === "deadly" ? 4 : 2);
  const filt = tg => MON.filter(m => m[1] >= minCR && m[1] <= maxCR && hasTag(m, tg));
  let pool = filt(tags); if (pool.length < 3) pool = filt(null);
  const opts = [];
  for (let a = 0; a < 60 && opts.length < 8; a++) {
    const base = rng.pick(pool);
    let leader = null;
    if (rng.chance(.45)) { const strong = pool.filter(m => m[1] > base[1]); if (strong.length) leader = rng.pick(strong); }
    let best = null;
    for (let n = 1; n <= 8; n++) {
      const raw = n * xpOf(base[1]) + (leader ? xpOf(leader[1]) : 0);
      const adj = raw * mult(n + (leader ? 1 : 0));
      if (adj <= cap && adj >= target) best = { base, n, leader, raw, adj };
    }
    if (best) opts.push(best);
  }
  let o;
  if (opts.length) o = rng.pick(opts);
  else {
    // fallback: the group that gets closest to the cap without exceeding it
    for (const src of [pool, MON]) {
      for (const m of src) for (let n = 1; n <= 8; n++) {
        const adj = n * xpOf(m[1]) * mult(n);
        if (adj <= cap && (!o || adj > o.adj)) o = { base: m, n, leader: null, raw: n * xpOf(m[1]), adj };
      }
      if (o && o.adj >= target) break;
    }
    if (!o) o = { base: MON[0], n: 1, leader: null, raw: 25, adj: 25 };
  }
  const parts = []; if (o.leader) parts.push([o.leader, 1]); parts.push([o.base, o.n]);
  return { text: encText(parts), xp: o.raw, adj: Math.round(o.adj), rating: rateXP(o.adj, level, party), level };
}
function buildClimax(rng, level, party, tags, villainName) {
  level = clamp(level, 1, 20);
  const target = partyThr(level, party, "deadly");
  let c = VSTAT.filter(v => v[1] >= level - 4 && v[1] <= level + 2 && xpOf(v[1]) <= target * 1.1);
  if (!c.length) c = [VSTAT.filter(v => xpOf(v[1]) <= target * 1.1).pop() || VSTAT[0]];
  c.sort((a, b) => b[1] - a[1]);
  const v = rng.pick(c.slice(0, 3)), vx = xpOf(v[1]);
  let best = { m: null, n: 0, adj: vx };
  const pool = MON.filter(m => m[1] < v[1] && m[1] <= level + 1 && m[1] >= (level <= 3 ? 0 : level / 5) && hasTag(m, tags));
  const pool2 = pool.length ? pool : MON.filter(m => m[1] < v[1] && m[1] <= level);
  for (let a = 0; a < 25 && pool2.length; a++) {
    const m = rng.pick(pool2);
    for (let n = 1; n <= 8; n++) {
      const adj = (vx + n * xpOf(m[1])) * mult(n + 1);
      if (adj <= target * 1.3 && adj > best.adj) best = { m, n, adj };
    }
  }
  const text = `${villainName} (use the ${v[0]} stat block, CR ${crLabel(v[1])})` + (best.m ? ` + ${best.n} × ${best.m[0]} (CR ${crLabel(best.m[1])})` : "");
  return { text, adj: Math.round(best.adj), rating: rateXP(best.adj, level, party), level, climax: true };
}

/* ======================= Content tables ======================= */
const N1 = ["Al", "Bar", "Cor", "Dra", "El", "Fen", "Gar", "Hal", "Is", "Jor", "Kel", "Lor", "Mar", "Ner", "Or", "Pel", "Quen", "Ral", "Sar", "Tor", "Ul", "Val", "Wyn", "Yr", "Zan", "Bri", "Cael", "Dun", "Eir", "Thal", "Mor", "Ves"];
const N2 = ["a", "e", "i", "o", "an", "en", "ar", "or", "il", "el", "ra", "ri", "", "", ""];
const N3 = ["dor", "wyn", "ric", "ion", "eth", "as", "mir", "ra", "ia", "on", "us", "ys", "wen", "ard", "is", "grim", "dal", "ene", "ka", "rin"];
const SUR1 = ["Ash", "Black", "Bright", "Cold", "Dusk", "Ember", "Frost", "Gold", "Grey", "Iron", "Moon", "Oak", "Raven", "Silver", "Stone", "Storm", "Thorn", "Winter", "Marrow", "Hollow"];
const SUR2 = ["bane", "brook", "crest", "field", "forge", "hand", "hart", "helm", "mantle", "ridge", "shield", "song", "vale", "ward", "wood", "whistle", "cloak"];
const PL1 = ["Brack", "Cinder", "Dread", "Fall", "Gloom", "Hollow", "Mire", "Raven", "Salt", "Shadow", "Thorn", "Wolf", "Grim", "Elder", "Star", "Ash", "Bitter", "Copper", "Kings", "Red"];
const PL2 = ["mere", "hold", "fen", "reach", "watch", "haven", "ford", "barrow", "spire", "gate", "march", "moor", "deep", "crag", "wick", "port"];
const RACES = ["human", "human", "elf", "dwarf", "halfling", "gnome", "half-orc", "tiefling", "dragonborn", "half-elf"];
const personName = r => r.pick(N1) + r.pick(N2) + r.pick(N3);
const N3_M = ["dain", "ric", "ion", "eth", "as", "mir", "on", "us", "ard", "grim", "dal", "rin", "an", "or", "ius", "orn"];
const N3_F = ["wyn", "ra", "ia", "ys", "wen", "ene", "ka", "is", "a", "elle", "ira", "ith", "ara", "ina", "ea", "ari"];
const personNameG = (r, g) => g === "male" || g === "female" ? r.pick(N1) + r.pick(N2) + r.pick(g === "male" ? N3_M : N3_F) : personName(r);
const fullName = (r, g) => personNameG(r, g) + " " + r.pick(SUR1) + r.pick(SUR2);
const GENDERS = [["male", "Male"], ["female", "Female"]];
const placeName = r => r.pick(PL1) + r.pick(PL2);

const SETTINGS = {
  coast: ["Coastal city", "a fog-bound coastal city of smugglers and lighthouses"],
  frontier: ["Frontier town", "a frontier mining town on the edge of the known map"],
  capital: ["Imperial capital", "a decaying imperial capital full of old money and older grudges"],
  desert: ["Desert caravans", "a sun-scorched desert crossed by caravan routes and buried cities"],
  north: ["Frozen north", "a frozen northern march where winters last half the year"],
  swamp: ["Haunted swamp", "a haunted swampland of stilt villages and drowned ruins"],
  islands: ["Pirate isles", "an island chain of rival pirate ports"],
  border: ["Borderland forest", "a dark forest on the border between two wary kingdoms"],
  under: ["Underground city", "a vast cavern city lit by glowing fungus, far beneath the surface"],
  jungle: ["Jungle ruins", "a steaming jungle hiding the temples of a fallen empire"]
};

const THEMES = {
  combat: {
    label: "Combat",
    premise: [
      "A warband led by {villain} is burning its way toward {place}, and the defenders have days, not weeks.",
      "Monsters pour from a newly opened rift near {place}; someone has to close it from the inside.",
      "{villain} has raised an army from the old battlefields, and {place} is next on the list.",
      "The fortress guarding the pass above {place} has gone silent. The party is sent to find out why, and to hold it.",
      "A rival mercenary company under {villain} has seized the only bridge into {place} and is charging tolls in blood.",
      "A bounty in {place} offers a fortune for the head of the beast stalking the roads. {villain} wants it alive."
    ],
    objectives: ["Break the siege", "Defeat the warlord's champions", "Hold the line until reinforcements arrive", "Destroy the source of the monsters", "Rescue captured soldiers", "Retake the fortress", "Hunt the beast to its lair"],
    scenes: ["an ambush on a narrow ridge road", "a burning village under raid", "a pitched battle on a collapsing bridge", "a beast's lair littered with old bones", "a breach in the siege wall at midnight", "an arena where prisoners fight for their freedom", "a running fight through a flooded tunnel", "a cavalry charge across an open field"],
    villains: ["a hobgoblin warlord", "a disgraced knight-commander", "a necromancer general", "an orc chieftain uniting the clans", "a mercenary queen", "a warpriest of a war god"],
    nouns: ["War", "Siege", "Banner", "Blade", "Fall", "Shield"]
  },
  espionage: {
    label: "Espionage",
    premise: [
      "Someone inside {faction} is selling secrets to {villain}, and the party must find the traitor before the treaty signing in {place}.",
      "A ledger that could topple the council of {place} sits in {villain}'s vault. Steal it without anyone knowing it's gone.",
      "{villain} plans to assassinate the heir during the masquerade in {place}. The party has three days to get inside the court.",
      "The party poses as a merchant delegation in {place} to learn what {faction} is smuggling, and for whom.",
      "A spymaster has vanished in {place}, leaving only a coded letter and a list of names. One of them is {villain}.",
      "Two noble houses in {place} edge toward civil war, and {villain} is quietly feeding both sides."
    ],
    objectives: ["Unmask the traitor", "Steal the evidence", "Prevent the assassination", "Plant false intelligence", "Extract an informant alive", "Expose the conspiracy publicly", "Crack the cipher"],
    scenes: ["a masked ball where every guest is lying", "a forged-document handoff in a crowded market", "a rooftop chase after a fleeing courier", "a tense interrogation of a captured spy", "a vault heist with shifting guard rotations", "a secret meeting in a temple's catacombs", "a dinner party where one dish is poisoned", "a card game where the stakes are state secrets"],
    villains: ["a smiling chancellor", "a guild spymaster", "a shapechanger wearing a noble's face", "a merchant prince", "a cult hidden among the clergy", "an exiled royal"],
    nouns: ["Mask", "Cipher", "Whisper", "Ledger", "Knife", "Veil"]
  },
  exploration: {
    label: "Exploration",
    premise: [
      "Maps of the hills beyond {place} show a valley no surveyor can find. {villain} has found it first.",
      "A lost expedition's journal points to ruins beneath {place}, and to the reason no one came back.",
      "A tower appears off the coast of {place} only at the lowest tide. {villain} intends to claim what sleeps inside.",
      "{faction} will pay any price for a safe route through the wilds to {place}."
    ],
    objectives: ["Chart the lost valley", "Recover the expedition's relic", "Reach the ruins before the rivals", "Map a safe route", "Find the source of the strange star-fall"],
    scenes: ["a rope bridge over a mist-filled gorge", "a ruined observatory with a working orrery", "a river journey past watching stone faces", "a camp raided by curious beasts in the night", "a sealed door with a riddle in a dead tongue", "an abandoned rival camp, still warm"],
    villains: ["a ruthless treasure hunter", "an archaeologist-mage obsessed with the old empire", "a rival guild's expedition leader", "a druid who wants the land left untouched at any cost"],
    nouns: ["Map", "Expedition", "Horizon", "Ruin", "Compass"]
  },
  horror: {
    label: "Horror",
    premise: [
      "Children in {place} keep drawing the same door. Last night, it appeared in the town square.",
      "Every night another villager in {place} wakes with no reflection, and {villain} has started visiting them.",
      "A plague ship has run aground near {place}, and its crew is still walking.",
      "The bells of {place} ring at midnight with no one in the tower. {villain} says it is a blessing."
    ],
    objectives: ["Close the door before the new moon", "Break the curse", "Find out what the crew brought ashore", "Survive until dawn", "Destroy the thing in the tower"],
    scenes: ["a candlelit vigil interrupted by scratching from inside the coffin", "a fog that hides something enormous", "a house where every portrait's eyes have been scratched out", "a village feast where no one eats", "a well that whispers names", "a church whose pews face the wrong way"],
    villains: ["a vampire posing as the town's benefactor", "a hag who trades in memories", "a grieving priest who bargained with something", "a ghost who doesn't know it is dead"],
    nouns: ["Hunger", "Night", "Bell", "Rot", "Door", "Hollow"]
  },
  mystery: {
    label: "Mystery",
    premise: [
      "A prominent alchemist in {place} is found dead in a laboratory locked from the inside. {villain} was the last to see her.",
      "Statues are appearing overnight in {place}, each one resembling someone who has gone missing.",
      "Someone is stealing names in {place}: victims forget who they are, and {villain} seems to know why.",
      "A priceless relic vanished from the vault of {faction} during a feast with forty witnesses."
    ],
    objectives: ["Solve the murder", "Find the missing people", "Identify the thief", "Prove the innocent's innocence", "Learn what the victims had in common"],
    scenes: ["a crime scene with one detail that doesn't fit", "a suspect's alibi that falls apart under questioning", "a coroner's cellar with an unexpected visitor", "a library where a page has been cut from every copy of one book", "a reconstruction of the night of the crime", "a confrontation in a crowded courtroom"],
    villains: ["a respected magistrate", "a jealous apprentice", "a collector of rare and forbidden things", "a doppelganger hiding in plain sight"],
    nouns: ["Riddle", "Silence", "Glass", "Locked Room", "Secret"]
  },
  survival: {
    label: "Survival",
    premise: [
      "A blizzard traps the party and a caravan in a mountain pass above {place}, and something is hunting the stragglers.",
      "Shipwrecked on an island east of {place}, the party must find water, shelter and a way home.",
      "A wildfire sweeps the forest around {place}. Something, or someone like {villain}, is driving it.",
      "The party must escort refugees from {place} across a hostile wasteland before supplies run out."
    ],
    objectives: ["Reach shelter before the storm peaks", "Find a way off the island", "Get the refugees to safety", "Ration supplies and survive", "Find what is driving the disaster"],
    scenes: ["a frozen river crossing that cracks underfoot", "a night of rationing and hard choices", "a predator circling the camp", "a rival group of survivors with supplies", "a shelter that is already occupied", "a desperate climb as the weather turns"],
    villains: ["a frost giant's huntmaster", "a druid twisted by grief", "a bandit lord controlling the only water", "an elemental cult"],
    nouns: ["Winter", "Storm", "Wilds", "Long Road", "Ashes"]
  },
  social: {
    label: "Social",
    premise: [
      "A royal wedding in {place} must go flawlessly, and the party are the planners' last resort. {villain} wants it ruined.",
      "A contested election for lord-mayor of {place} turns dangerous when {villain} enters the race.",
      "The party must negotiate peace between {faction} and the river folk of {place} before the harvest festival.",
      "A grand tournament in {place} draws nobles from every realm, along with their feuds."
    ],
    objectives: ["Keep the wedding on schedule", "Win the election for the right candidate", "Broker the peace", "Win the tournament with honor", "Earn a seat at the high table"],
    scenes: ["a toast that goes horribly wrong", "a debate in the town square", "a backroom negotiation over wine", "a tournament joust with a sabotaged lance", "a scandalous rumor spreading through the court", "a grand feast seating chart from hell"],
    villains: ["a scheming dowager", "a charismatic demagogue", "a bitter rival suitor", "a guild master with every vote bought"],
    nouns: ["Wedding", "Crown", "Accord", "Gala", "Tournament"]
  },
  planar: {
    label: "Planar",
    premise: [
      "A crack between worlds has opened above {place}, and things from the other side are curious.",
      "The party wakes in {place} on the same day, again and again. Only {villain} seems to remember.",
      "{villain} is building a gate in the ruins near {place} to bring back an exiled god.",
      "A celestial has fallen near {place}, wounded and hunted by fiends."
    ],
    objectives: ["Seal the rift", "Break the time loop", "Stop the gate's completion", "Protect the fallen celestial", "Bargain with an outsider"],
    scenes: ["gravity flips mid-fight", "a market where memories are currency", "a bridge made of starlight", "a parley with a devil over the fine print", "a city reflected upside down in the sky", "a duel on a floating island"],
    villains: ["a warlock bound to an archfey", "a fiendish ambassador", "a mad planar cartographer", "a fallen angel"],
    nouns: ["Rift", "Mirror", "Threshold", "Starfall", "Gate"]
  }
};

const MOTIVES = ["wants to resurrect someone they lost", "believes only tyranny can stop a coming catastrophe", "seeks revenge on the family that ruined them", "hungers for immortality", "was promised a throne by something from below", "wants to erase a shameful history", "is paying off a debt to a fiend", "wants to be worshipped", "is protecting a terrible secret about the realm's founding", "thinks the gods have abandoned the world and means to replace them"];
const FAC_A = ["Crimson", "Silent", "Gilded", "Ashen", "Iron", "Veiled", "Last", "Hollow", "Sable", "Emerald", "Broken", "Lantern"];
const FAC_N = ["Hand", "Lanterns", "Circle", "Company", "Order", "Syndicate", "Covenant", "Watch", "Brotherhood", "Concord", "Chorus", "Compact"];
const FAC_GOALS = ["control the city's trade in secrets", "restore a fallen noble line", "wipe out all undead in the region", "profit from the coming war", "protect an ancient seal", "overthrow the current ruler", "find a lost relic before anyone else", "keep the old roads open and safe", "preach a forbidden faith", "buy up land around the ruins"];
const ATTITUDES = ["Ally", "Neutral", "Rival", "Hostile", "Unknown"];
const ROLES = ["innkeeper", "captain of the watch", "disgraced scholar", "street urchin informant", "temple healer", "retired adventurer", "fence", "noble's steward", "ferryman", "blacksmith", "court bard", "hedge witch", "dockmaster", "cartographer"];
const TRAITS = ["speaks only in questions", "has a nervous laugh", "collects teeth", "is honest to a fault", "owes money to everyone", "quotes old scripture constantly", "never removes their gloves", "is overly familiar", "distrusts all magic", "fiercely protects a younger sibling", "is always eating", "speaks in a whisper"];
const SECRETS = ["secretly works for the villain", "is the rightful heir", "witnessed the crime", "is not who they claim to be", "is dying and hiding it", "stole the relic years ago", "has a map to the hidden lair", "is a shapechanger", "is in love with the villain", "knows the villain's true name"];
const SITES = [
  ["ruined watchtower", "keep"], ["smugglers' cove", "cavern"], ["sunken temple", "temple"], ["noble's manor", "keep"], ["goblin-held mine", "mine"], ["haunted crypt", "crypt"],
  ["merchant guildhall", "keep"], ["abandoned monastery", "temple"], ["thieves' den beneath the docks", "sewer"], ["ancient barrow", "crypt"], ["wizard's tower", "keep"], ["flooded catacombs", "sewer"],
  ["collapsed dwarven hall", "mine"], ["beast's cavern", "cavern"], ["cult shrine", "temple"]
];
const SITE_DESC = ["half-flooded", "overgrown with black ivy", "guarded by bribed watchmen", "lit by eerie blue fire", "rumored to be cursed", "recently reoccupied", "sealed for a century", "crawling with scavengers", "smelling of fresh incense", "marked on no official map"];
const TWISTS = [
  "The patron who hired the party is the true villain.", "The villain is trying to prevent something even worse.", "The relic everyone wants is a living, thinking being.",
  "A trusted NPC has been replaced by a shapechanger.", "Two rival factions are secretly run by the same person.", "The dungeon is a prison, and the party just opened it.",
  "The reward was never going to be paid.", "The 'monster' is protecting its young.", "The villain is already dead; something else wears their body.",
  "One of the party's backstories ties directly to the villain.", "The villain is the hero of an older story who was never thanked."
];
const HOOKS = [
  "A letter arrives for one PC, written in their own handwriting.", "{npc} owes one of the PCs a life-debt and needs it repaid now.", "A PC's family heirloom is the key the villain needs.",
  "One PC wakes with a map tattooed on their arm.", "A bounty poster with a PC's face appears in {place}.", "A dying stranger presses a ring into a PC's hand and whispers {villain}'s name.",
  "A PC's old mentor has joined {faction}.", "The party shares a recurring dream of the same ruined tower.", "A PC's sibling went missing near {place}.", "A god speaks to the party's cleric, and it sounds afraid."
];
const REWARDS = [
  ["Potion of healing ×3", "Bag of holding", "+1 weapon", "Cloak of protection", "Boots of elvenkind", "Wand of magic missiles", "Deed to a ruined tower", "A noble's favor"],
  ["+2 armor", "Cloak of displacement", "Wand of fireballs", "Flame tongue", "Ring of protection", "Gauntlets of ogre power", "A small keep and its lands", "Membership in a powerful guild"],
  ["+3 weapon", "Staff of power", "Ring of spell storing", "Rod of absorption", "Belt of fire giant strength", "Manual of bodily health", "A seat on the royal council", "A barony"],
  ["Vorpal sword", "Holy avenger", "Robe of the archmagi", "Ring of three wishes", "Staff of the magi", "Cubic gate", "Your own demiplane", "A kingdom's gratitude"]
];
const TONE_TIPS = {
  Heroic: "Let the heroes shine: clear stakes, cheering crowds, villains worth booing.",
  Gritty: "Resources are scarce, wounds linger, and every victory costs something.",
  Dark: "Offer moral choices with no clean answer, and let dread build slowly.",
  Lighthearted: "Lean into colorful NPCs, absurd complications and generous rewards."
};
const TITLE_ADJ = ["Crimson", "Silent", "Broken", "Hollow", "Last", "Gilded", "Drowned", "Burning", "Forgotten", "Iron", "Shattered", "Midnight"];
const CH_NOUN = ["Road", "Gate", "Debt", "Oath", "Crown", "Flame", "Tide", "Vault", "Key", "Hunt", "Bargain", "Reckoning", "Descent", "Return"];
const tierOf = lv => lv <= 4 ? 0 : lv <= 10 ? 1 : lv <= 16 ? 2 : 3;
const TAGMAP = { crypt: ["crypt"], cavern: ["cave"], keep: ["keep"], sewer: ["sewer"], temple: ["temple"], mine: ["mine", "cave"] };
