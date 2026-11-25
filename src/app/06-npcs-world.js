/* 06-npcs-world.js: NPC tab (NPC generator and Your NPCs) and the World tab with the World builder. */

/* ======================= NPC generator ======================= */
const NPC_ROLES = {
  Commoner: [["farmer", "Commoner"], ["baker", "Commoner"], ["fishmonger", "Commoner"], ["stablehand", "Commoner"], ["shepherd", "Commoner"], ["miller", "Commoner"], ["gravedigger", "Commoner"]],
  Merchant: [["spice trader", "Commoner"], ["jeweler", "Noble"], ["innkeeper", "Commoner"], ["pawnbroker", "Commoner"], ["caravan master", "Veteran"], ["tailor", "Commoner"], ["apothecary", "Commoner"]],
  Noble: [["minor baron", "Noble"], ["courtier", "Noble"], ["heir apparent", "Noble"], ["diplomat", "Noble"], ["landed knight", "Knight"], ["dowager", "Noble"]],
  Criminal: [["pickpocket", "Bandit"], ["fence", "Spy"], ["smuggler", "Bandit captain"], ["assassin", "Assassin"], ["forger", "Spy"], ["gang boss", "Thug"], ["con artist", "Spy"]],
  Clergy: [["acolyte", "Acolyte"], ["temple priest", "Priest"], ["wandering friar", "Acolyte"], ["oracle", "Priest"], ["gravekeeper", "Acolyte"], ["inquisitor", "Cult fanatic"]],
  Military: [["town guard", "Guard"], ["sergeant", "Veteran"], ["mercenary captain", "Veteran"], ["scout", "Scout"], ["old soldier", "Veteran"], ["bounty hunter", "Gladiator"]],
  Scholar: [["librarian", "Commoner"], ["alchemist", "Commoner"], ["sage", "Commoner"], ["cartographer", "Commoner"], ["astronomer", "Commoner"], ["court wizard", "Mage"]],
  Adventurer: [["retired adventurer", "Veteran"], ["sellsword", "Thug"], ["monster hunter", "Scout"], ["treasure seeker", "Scout"], ["wandering bard", "Spy"]]
};
const STAT_CR = { Commoner: "0", Noble: "1/8", Guard: "1/8", Bandit: "1/8", Acolyte: "1/4", Scout: "1/2", Thug: "1/2", Spy: "1", "Bandit captain": "2", Priest: "2", "Cult fanatic": "2", Veteran: "3", Knight: "3", Gladiator: "5", Mage: "6", Assassin: "8" };
const NPC_RACES = ["Human", "Elf", "Dwarf", "Halfling", "Gnome", "Half-Orc", "Tiefling", "Dragonborn", "Half-Elf"];
const LOOKS = ["a crooked nose", "a shaved head", "braided silver hair", "a burn scar across one cheek", "ink-stained fingers", "one milky eye", "freckles everywhere", "an elaborate neck tattoo", "a missing ear", "immaculate clothes", "patched, mismatched clothes", "a gap-toothed grin", "rings on every finger", "a pronounced limp", "an unusually tall frame", "a short, wiry build", "piercing green eyes", "a well-kept beard", "sun-weathered skin", "a nervous twitch", "a fine silk scarf", "dirt under every nail"];
const VOICES = ["gravelly whisper", "booming baritone", "high and fast", "slow drawl", "sing-song lilt", "clipped military bark", "nasal and fussy", "warm and grandmotherly", "soft stutter", "theatrical flourish", "flat monotone", "thick regional accent"];
const MANNER = ["taps their fingers constantly", "avoids eye contact", "laughs at their own jokes", "sniffs the air before speaking", "rolls a coin across their knuckles", "stands far too close", "repeats the last word you said", "calls everyone 'friend'", "checks over their shoulder", "hums old tavern songs", "cracks their knuckles", "counts things under their breath"];
const IDEALS = ["Tradition: the old ways keep us safe", "Charity: help those who can't help themselves", "Freedom: no one should wear chains", "Greed: everything has a price", "Honor: a promise is a promise", "Knowledge: the truth is worth any risk", "Power: the strong decide", "Family: blood comes first", "Faith: the gods have a plan", "Redemption: everyone deserves a second chance", "Independence: rely on no one", "Fairness: rules apply to everyone"];
const BONDS = ["would die for their hometown", "owes a life-debt to a stranger", "protects a younger sibling", "hunts the person who wronged them", "is devoted to a lost love", "guards a family heirloom", "is loyal to their guild above all", "is raising an orphan", "keeps a promise made to a dying friend", "serves a patron they've never met"];
const FLAWS = ["can't resist a wager", "lies when nervous", "never forgives a slight", "flees when it counts", "drinks too much", "trusts no one", "falls for flattery", "can't keep a secret", "has a short temper", "is greedy to the bone", "is hopelessly vain", "panics in the dark"];
const WANTS = ["to pay off a crushing debt", "a way out of town", "revenge on a rival", "to be taken seriously", "to find a missing friend", "a cure for a sick relative", "fame, any kind", "a quiet life", "to prove their innocence", "to learn real magic", "a seat on the town council", "to see the sea once"];
const OPENERS = ["You're not from around here. Good. I need someone who isn't.", "Keep your voice down. These walls have ears, and some of them are paid.", "If you're buying, I'm talking.", "Finally, people who look capable of violence.", "I've seen your kind before. It didn't end well for them.", "Don't touch that. Actually, don't touch anything.", "Whatever they told you about me, it's half true.", "Blessings on you, travelers. And on your coin purses.", "You want the story or the truth? They cost different.", "Wipe your boots. This is a respectable establishment.", "Oh thank the gods. Can any of you swim?", "I knew you'd come. I didn't know you'd be this short."];
const AGES = { default: ["young", "adult", "middle-aged", "old"], Elf: ["young (under 100)", "adult", "centuries old", "ancient"], Dwarf: ["young", "adult", "grizzled", "venerable"] };

function generateNPC(r, o) {
  const race = o.race || r.pick(NPC_RACES);
  const cat = o.role || r.pick(Object.keys(NPC_ROLES));
  const [job, stat] = r.pick(NPC_ROLES[cat]);
  const [l1, l2] = r.pickN(LOOKS, 2);
  return {
    id: uid("npc"), name: fullName(r), race, category: cat, occupation: job, stat,
    gender: o.gender || r.pick(["Female", "Male", "Female", "Male", "Nonbinary"]),
    age: r.pick(AGES[race] || AGES.default), attitude: o.att || r.pick(["Friendly", "Neutral", "Neutral", "Wary", "Hostile"]),
    look: `${l1} and ${l2}`, voice: r.pick(VOICES), manner: r.pick(MANNER), ideal: r.pick(IDEALS), bond: r.pick(BONDS),
    flaw: r.pick(FLAWS), want: r.pick(WANTS), secret: r.pick(SECRETS), quote: r.pick(OPENERS)
  };
}
let npcs = [], npcOpts = {};
function npcText(n) {
  return `${n.name}: ${n.age} ${n.gender.toLowerCase()} ${n.race.toLowerCase()} ${n.occupation} (${n.attitude})\nLooks: ${n.look}. Voice: ${n.voice}; ${n.manner}.\nIdeal: ${n.ideal}. Bond: ${n.bond}. Flaw: ${n.flaw}.\nWants ${n.want}. Secret: ${n.secret}.\n"${n.quote}"\nStat block: ${n.stat} (CR ${STAT_CR[n.stat]})`;
}
function npcCard(n, i) {
  return `<div class="card npc-card">
    <h3>${esc(n.name)}</h3>
    <div class="k">${esc(cap1(n.age))} ${esc(n.gender.toLowerCase())} ${esc(n.race.toLowerCase())} · ${esc(n.occupation)} · <span class="tag">${esc(n.attitude)}</span></div>
    <div class="quote">“${esc(n.quote)}”</div>
    <dl>
      <dt>Looks</dt><dd>${esc(cap1(n.look))}</dd>
      <dt>Voice</dt><dd>${esc(cap1(n.voice))}; ${esc(n.manner)}</dd>
      <dt>Ideal</dt><dd>${esc(n.ideal)}</dd>
      <dt>Bond</dt><dd>${esc(cap1(n.bond))}</dd>
      <dt>Flaw</dt><dd>${esc(cap1(n.flaw))}</dd>
      <dt>Wants</dt><dd>${esc(cap1(n.want))}</dd>
      <dt>Secret</dt><dd>${esc(cap1(n.secret))}</dd>
      <dt>Stats</dt><dd>Use the <b>${esc(n.stat)}</b> stat block (CR ${STAT_CR[n.stat]})</dd>
    </dl>
    <div class="actions"><button class="btn sm" data-npc="reroll" data-i="${i}">↻ Reroll</button><button class="btn sm" data-npc="copy" data-i="${i}">Copy</button><button class="btn sm primary" data-npc="save" data-i="${i}">Save to campaign</button></div>
  </div>`;
}
function drawNPCs() { $("#npcOut").innerHTML = `<div class="npc-grid">${npcs.map(npcCard).join("")}</div>`; }
(function initNPC() {
  NPC_RACES.forEach(x => $("#npcRace").insertAdjacentHTML("beforeend", `<option>${x}</option>`));
  Object.keys(NPC_ROLES).forEach(x => $("#npcRole").insertAdjacentHTML("beforeend", `<option>${x}</option>`));
  $("#npcForm").addEventListener("submit", e => {
    e.preventDefault();
    npcOpts = { race: $("#npcRace").value, role: $("#npcRole").value, gender: $("#npcGender").value, att: $("#npcAtt").value };
    const n = +$("input[name=npcCount]:checked").value; const seed = newSeed();
    npcs = Array.from({ length: n }, (_, i) => generateNPC(makeRng("npc", seed, i), npcOpts)); drawNPCs();
  });
  $("#npcOut").addEventListener("click", async e => {
    const b = e.target.closest("[data-npc]"); if (!b) return; const i = +b.dataset.i, n = npcs[i];
    if (b.dataset.npc === "reroll") { npcs[i] = generateNPC(makeRng("npc", newSeed()), npcOpts); drawNPCs(); }
    else if (b.dataset.npc === "copy") { try { await navigator.clipboard.writeText(npcText(n)); toast("NPC copied"); } catch { toast("Couldn't copy here"); } }
    else {
      const c = Store.get($("#npcCampaign").value); if (!c) { toast("Create a campaign first (Campaign Tracker)"); return; }
      c.npcs.unshift({ id: uid("n"), name: n.name, role: `${n.race} ${n.occupation}`, attitude: { Wary: "Neutral" }[n.attitude] || n.attitude, notes: npcText(n).split("\n").slice(1).join("\n") });
      Store.save(c); toast(`${n.name} joined “${c.name}”`); b.textContent = "✓ Saved"; b.disabled = true; renderNpcLib();
    }
  });
})();

/* ======================= Your NPCs (the list on the NPC tab) =======================
   NPCs still live in each campaign's c.npcs, so the Tracker's NPCs tab works as before. Copies of one NPC in several
   campaigns share a lib id (npcLibId); editing a copy here or in the Tracker updates the others (npcSync).
   NPCs in no campaign are kept in localStorage dmforge.npclib.v1 ("loose"). */
const NPCLIB_KEY = "dmforge.npclib.v1";
const NPC_SHARED = ["name", "role", "attitude", "place", "placeId", "notes", "img", "imgUrl"];
const NPC_ATT = ["Friendly", "Neutral", "Unknown", "Hostile", "Dead"];
const NL = { q: "", camp: "", tab: "", open: new Set() };
const NL_NEW = "\u0001new";
function npcLoose() { try { const l = JSON.parse(localStorage.getItem(NPCLIB_KEY) || "[]"); return Array.isArray(l) ? l.filter(n => n && typeof n === "object") : []; } catch { return []; } }
function npcLooseSave(l) { try { localStorage.setItem(NPCLIB_KEY, JSON.stringify(l)); Cloud.touch("npclib"); return true; } catch { toast("Couldn't save: this browser's storage is full"); return false; } }
const npcLibId = n => n.lib || (n.lib = n.mwId ? "mw-" + n.mwId : "nl-" + n.id);
function npcGroups() {
  const G = new Map();
  for (const c of Store.list()) for (const n of c.npcs || []) { const k = npcLibId(n); if (!G.has(k)) G.set(k, { lib: k, n, camps: [] }); const g = G.get(k); if (!g.camps.includes(c.id)) g.camps.push(c.id); }
  for (const n of npcLoose()) { const k = npcLibId(n); if (!G.has(k)) G.set(k, { lib: k, n, camps: [], loose: true }); }
  return [...G.values()].sort((a, b) => String(a.n.name || "").localeCompare(String(b.n.name || "")));
}
function npcCopyShared(from, to) { let ch = false; NPC_SHARED.forEach(f => { if (from[f] === undefined) { if (f in to) { delete to[f]; ch = true; } } else if (to[f] !== from[f]) { to[f] = from[f]; ch = true; } }); return ch; }
function npcSync(src) {
  const k = npcLibId(src);
  for (const c of Store.list()) { let ch = false; for (const n of c.npcs || []) if (n !== src && npcLibId(n) === k && npcCopyShared(src, n)) ch = true; if (ch) Store.save(c); }
  const L = npcLoose(); let ch = false; L.forEach(n => { if (npcLibId(n) === k && npcCopyShared(src, n)) ch = true; }); if (ch) npcLooseSave(L);
}
const npcImgUsed = key => Store.list().some(c => (c.npcs || []).some(n => n.img === key)) || npcLoose().some(n => n.img === key);
function npcLibToggle(lib, campId, on) {
  const g = npcGroups().find(x => x.lib === lib), c = Store.get(campId); if (!g || !c) return;
  c.npcs = c.npcs || [];
  if (on) {
    if (c.npcs.some(n => npcLibId(n) === lib)) return;
    const { id, ...rest } = JSON.parse(JSON.stringify(g.n));
    c.npcs.push({ id: uid("n"), ...rest, lib, attitude: rest.attitude || "Unknown" }); Store.save(c);
    if (g.loose) npcLooseSave(npcLoose().filter(n => npcLibId(n) !== lib));
    toast(`${g.n.name || "NPC"} added to “${c.name}”`);
  } else {
    const n = c.npcs.find(x => npcLibId(x) === lib); if (!n) return;
    c.npcs = c.npcs.filter(x => x !== n); Store.save(c);
    if (g.camps.length <= 1) { const { id, ...rest } = n; const L = npcLoose(); L.push({ id: uid("n"), ...rest, lib }); npcLooseSave(L); }
    toast(`${g.n.name || "NPC"} taken out of “${c.name}”${g.camps.length <= 1 ? ". It stays here in Your NPCs" : ""}`);
  }
}
function npcLibSet(lib, obj) {
  const put = n => Object.entries(obj).forEach(([k, v]) => { if (v === undefined) delete n[k]; else n[k] = v; });
  for (const c of Store.list()) { const n = (c.npcs || []).find(x => npcLibId(x) === lib); if (n) { put(n); Store.save(c); npcSync(n); return; } }
  const L = npcLoose(), n = L.find(x => npcLibId(x) === lib); if (n) { put(n); npcLooseSave(L); }
}
function npcLibEdit(lib, key, val) {
  for (const c of Store.list()) { const n = (c.npcs || []).find(x => npcLibId(x) === lib); if (n) { n[key] = val; Store.save(c); npcSync(n); return; } }
  const L = npcLoose(), n = L.find(x => npcLibId(x) === lib); if (n) { n[key] = val; npcLooseSave(L); }
}
async function npcLibDelete(lib) {
  const g = npcGroups().find(x => x.lib === lib); if (!g) return;
  const where = g.camps.length ? ` It's in ${g.camps.length} campaign${g.camps.length === 1 ? "" : "s"}, and will be taken out of ${g.camps.length === 1 ? "it" : "all of them"}.` : "";
  if (!(await confirmBox("Delete NPC?", `Delete “${g.n.name || "this NPC"}”?${where} This can't be undone.`, "Delete"))) return;
  const imgs = new Set();
  for (const c of Store.list()) { const had = (c.npcs || []).filter(n => npcLibId(n) === lib); if (had.length) { had.forEach(n => n.img && imgs.add(n.img)); c.npcs = c.npcs.filter(n => npcLibId(n) !== lib); Store.save(c); } }
  const L = npcLoose(); L.filter(n => npcLibId(n) === lib).forEach(n => n.img && imgs.add(n.img)); npcLooseSave(L.filter(n => npcLibId(n) !== lib));
  for (const k of imgs) if (!npcImgUsed(k)) { try { await MAPIMG.del(k); } catch { } }
  NL.open.delete(lib); renderNpcLib(); toast(`${g.n.name || "NPC"} deleted`);
}
function npcMoveHTML(n) {
  return `<select class="npc-move" data-nlmove aria-label="Move ${esc(n.name || "this NPC")} to a place" title="Move to a place">${wpOptionsHTML(n.placeId, "📍 Move to…")}</select>`;
}
function npcLibRowHTML(g, camps) {
  const n = g.n, open = NL.open.has(g.lib), f = (k, ph, w) => `<input type="text" data-nlf="${k}" value="${esc(n[k] || "")}" placeholder="${ph}" aria-label="${ph}" maxlength="120" style="flex:${w}">`;
  return `<div class="item npc-lib-row" data-lib="${esc(g.lib)}">
    <div class="item-h"><button class="npc-lib-name" type="button" data-nl="open" aria-expanded="${open}"><b>${esc(n.name || "Unnamed NPC")}</b>${n.role ? ` <span class="muted">· ${esc(n.role)}</span>` : ""}${n.attitude ? ` <span class="tag">${esc(n.attitude)}</span>` : ""}</button>
      ${npcMoveHTML(n)}
      <button class="icon-btn" type="button" data-nl="del" title="Delete ${esc(n.name || "this NPC")} from every campaign" aria-label="Delete ${esc(n.name || "this NPC")}">✕</button></div>
    <div class="npc-camps">${camps.length ? camps.map(c => { const on = g.camps.includes(c.id); return `<label class="chip${on ? " on" : ""}" title="${on ? "In" : "Not in"} ${esc(c.name)}"><input type="checkbox" data-nlc="${esc(c.id)}" ${on ? "checked" : ""}>${on ? "✓ " : ""}${esc(c.name)}</label>`; }).join("") : `<span class="muted" style="font-size:14px">Make a campaign in the Campaign Tracker to put NPCs in it.</span>`}${camps.length && !g.camps.length ? `<span class="muted" style="font-size:14px">Not in a campaign</span>` : ""}</div>
    ${open ? `<div class="row" style="margin-top:8px;gap:8px;flex-wrap:wrap">${f("name", "NPC name", "2 1 160px")}${f("role", "Role", "2 1 160px")}<select data-nlf="attitude" aria-label="Attitude" style="flex:1 1 120px">${NPC_ATT.map(a => `<option ${n.attitude === a ? "selected" : ""}>${a}</option>`).join("")}</select></div>
      <textarea data-nlf="notes" placeholder="Notes" aria-label="Notes" style="margin-top:6px">${esc(n.notes || "")}</textarea>` : ""}
  </div>`;
}
function npcLibListHTML() {
  const camps = Store.list(), all = npcGroups(), q = NL.q.trim().toLowerCase();
  const shown = all.filter(g => (!q || [g.n.name, g.n.role, g.n.place, g.n.notes].join(" ").toLowerCase().includes(q)) && (!NL.camp || (NL.camp === "-" ? !g.camps.length : g.camps.includes(NL.camp))));
  const T = npcPlaceTabs(shown.map(g => g.n), NL.tab); NL.tab = T.cur;
  const L = shown.filter(g => T.keep(g.n));
  return `${all.length ? T.html("nltab") : ""}
    ${L.length ? L.map(g => npcLibRowHTML(g, camps)).join("") : `<p class="muted">${all.length ? "No NPCs match." : "No NPCs yet. Summon some above and press Save to campaign, add them in the Campaign Tracker, import a campaign, or press + New NPC."}</p>`}`;
}
function renderNpcLib(listOnly) {
  const box = $("#npcLib"); if (!box) return;
  if (NL.camp && NL.camp !== "-" && !Store.get(NL.camp)) NL.camp = "";
  if (listOnly && $("#npcLibList")) { $("#npcLibList").innerHTML = npcLibListHTML(); return; }
  const camps = Store.list(), n = npcGroups().length;
  box.innerHTML = `<div class="sec-h"><h3>Your NPCs</h3><span class="sp"></span><button class="btn sm" type="button" data-nl="new">+ New NPC</button></div>
    <p class="hint" style="margin:0 0 8px">Every NPC from your campaigns. Tick a campaign to put an NPC in it; an NPC can be in several. Use 📍 Move to… to file NPCs under a place from the <a href="#world">World</a> tab, and the tabs to see one place at a time (a city's tab includes the places inside it). A change here or in the Campaign Tracker changes the NPC everywhere.</p>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:6px"><input type="search" id="npcLibQ" autocomplete="off" placeholder="Search names, roles and notes…" aria-label="Search NPCs" value="${esc(NL.q)}" style="flex:2 1 180px">
      <select id="npcLibCamp" aria-label="Show NPCs from" style="flex:1 1 160px"><option value="">All campaigns (${n})</option><option value="-" ${NL.camp === "-" ? "selected" : ""}>Not in a campaign</option>${camps.map(c => `<option value="${esc(c.id)}" ${NL.camp === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
    <div id="npcLibList">${npcLibListHTML()}</div>`;
}
(function initNpcLib() {
  const box = $("#npcLib"); if (!box) return;
  box.addEventListener("click", async e => {
    const b = e.target.closest("[data-nl]"); if (!b) return;
    const row = b.closest("[data-lib]"), lib = row && row.dataset.lib;
    if (b.dataset.nl === "new") {
      const id = uid("n"), n = { id, lib: "nl-" + id, name: "New NPC", role: "", attitude: "Unknown", notes: "", ...(NL.tab && wp(NL.tab) ? { placeId: NL.tab, place: wp(NL.tab).name } : {}) }, c = NL.camp && NL.camp !== "-" ? Store.get(NL.camp) : null;
      if (c) { c.npcs = c.npcs || []; c.npcs.push(n); Store.save(c); } else { const L = npcLoose(); L.push(n); npcLooseSave(L); }
      NL.q = ""; NL.open.add(n.lib); renderNpcLib();
      const i = box.querySelector(`[data-lib="${n.lib}"] [data-nlf="name"]`); if (i) { i.focus(); i.select(); }
    } else if (b.dataset.nl === "open") { NL.open.has(lib) ? NL.open.delete(lib) : NL.open.add(lib); renderNpcLib(true); const nb = box.querySelector(`[data-lib="${CSS.escape(lib)}"] [data-nl="open"]`); if (nb) nb.focus(); }
    else if (b.dataset.nl === "del") npcLibDelete(lib);
  });
  box.addEventListener("click", e => { const t = e.target.closest("[data-nltab]"); if (!t) return; NL.tab = t.dataset.nltab; renderNpcLib(true); const nb = box.querySelector(`[data-nltab="${CSS.escape(NL.tab)}"]`); if (nb) nb.focus(); });
  box.addEventListener("change", e => {
    const t = e.target;
    if (t.id === "npcLibCamp") { NL.camp = t.value; renderNpcLib(true); return; }
    const row = t.closest("[data-lib]"); if (!row) return;
    if (t.hasAttribute("data-nlmove")) {
      const lib = row.dataset.lib, name = (row.querySelector(".npc-lib-name b") || {}).textContent || "NPC";
      const pl = wpPick(t.value, name); if (pl === null) { renderNpcLib(true); return; }
      npcLibSet(lib, pl ? { placeId: pl.id, place: pl.name } : { placeId: undefined, place: undefined }); renderNpcLib(true);
      toast(pl ? `${name} moved to ${pl.name}` : `${name} has no place now`);
      const sel = box.querySelector(`[data-lib="${CSS.escape(lib)}"] [data-nlmove]`); if (sel) sel.focus();
      return;
    }
    if (t.dataset.nlc) { npcLibToggle(row.dataset.lib, t.dataset.nlc, t.checked); renderNpcLib(true); const cb = box.querySelector(`[data-lib="${CSS.escape(row.dataset.lib)}"] [data-nlc="${CSS.escape(t.dataset.nlc)}"]`); if (cb) cb.focus(); return; }
    if (t.dataset.nlf) { npcLibEdit(row.dataset.lib, t.dataset.nlf, t.value); if (t.dataset.nlf !== "notes") { const h = row.querySelector(".npc-lib-name"); if (h) h.innerHTML = `<b>${esc(row.querySelector('[data-nlf="name"]').value || "Unnamed NPC")}</b>${row.querySelector('[data-nlf="role"]').value ? ` <span class="muted">· ${esc(row.querySelector('[data-nlf="role"]').value)}</span>` : ""} <span class="tag">${esc(row.querySelector('[data-nlf="attitude"]').value)}</span>`; } }
  });
  box.addEventListener("input", e => {
    const t = e.target;
    if (t.id === "npcLibQ") { NL.q = t.value; renderNpcLib(true); return; }
    const row = t.closest("[data-lib]"); if (row && t.dataset.nlf && t.tagName !== "SELECT") npcLibEdit(row.dataset.lib, t.dataset.nlf, t.value);
  });
})();

/* ======================= World (places, nested) =======================
   W.places = [{id, name, type, parent, desc, sections?, tags?, imgUrl?, mwId?}] in localStorage dmforge.world.v1, shared by every campaign.
   A campaign has a place when its Lore has an entry {type:"place", wpId}; worldAdopt() links Lore places (making World places
   for new ones) and turns NPCs' place names into placeId. Edits flow World -> Lore with wpSyncOut, and Lore -> World on Lore save. */
const WORLD_KEY = "dmforge.world.v1";
const WP_TYPES = { region: ["🗺️", "Region"], city: ["🏰", "City"], town: ["🏘️", "Town"], village: ["🛖", "Village"], district: ["🏙️", "District"], building: ["🏛️", "Building"], tavern: ["🍺", "Tavern or inn"], shop: ["🛒", "Shop"], temple: ["⛪", "Temple"], dungeon: ["💀", "Dungeon"], wilderness: ["🌲", "Wilderness"], landmark: ["🗿", "Landmark"], other: ["📍", "Place"] };
const WP_LORE = ["name", "desc", "sections", "tags", "imgUrl"];
const W = { places: [], sel: null, open: new Set(), q: "", loaded: false, dirty: false, view: "type", camp: "", openT: new Set(), mode: "place", build: null };
const WP_PLURAL = { region: "Regions", city: "Cities", town: "Towns", village: "Villages", district: "Districts", building: "Buildings", tavern: "Taverns & inns", shop: "Shops", temple: "Temples", dungeon: "Dungeons", wilderness: "Wilderness", landmark: "Landmarks", other: "Other places" };
function worldLoad() { try { const d = JSON.parse(localStorage.getItem(WORLD_KEY) || "null"); W.places = d && Array.isArray(d.places) ? d.places.filter(p => p && p.id && p.name) : []; W.atlas = d && d.atlas && d.atlas.seed ? d.atlas : null; } catch { W.places = []; W.atlas = null; } W.loaded = true; }
function worldSave() { W.dirty = false; try { localStorage.setItem(WORLD_KEY, JSON.stringify(W.atlas ? { places: W.places, atlas: W.atlas } : { places: W.places })); Cloud.touch("world"); return true; } catch { toast("Couldn't save: this browser's storage is full"); return false; } }
const wp = id => (W.loaded || worldLoad(), id ? W.places.find(p => p.id === id) || null : null);
const wpIcon = p => (WP_TYPES[p && p.type] || WP_TYPES.other)[0];
function wpPath(p) { const out = []; let x = p, k = 0; while (x && k++ < 30) { out.unshift(x); x = wp(x.parent); } return out; }
const wpPathText = p => wpPath(p).map(x => x.name).join(" › ");
const wpKids = id => (id ? W.places.filter(p => p.parent === id) : W.places.filter(p => !p.parent || !wp(p.parent))).sort((a, b) => a.name.localeCompare(b.name));
function wpUnder(id) { const out = new Set([id]); let grew = true; while (grew) { grew = false; for (const p of W.places) if (p.parent && out.has(p.parent) && !out.has(p.id)) { out.add(p.id); grew = true; } } return out; }
function wpNew(o) { if (!W.loaded) worldLoad(); const p = { id: uid("wp"), name: "New place", type: "other", parent: null, desc: "", ...o }; W.places.push(p); W.dirty = true; return p; }
const WP_GUESS = [[/\b(kingdom|realm|empire|region|province|duchy|barony|continent|isles?|lands)\b/, "region"], [/\b(city|capital|metropolis)\b/, "city"], [/\btown\b/, "town"], [/\b(village|hamlet)\b/, "village"], [/\b(district|quarter|ward|slums|docks)\b/, "district"],
  [/\b(tavern|inn|alehouse|pub)\b/, "tavern"], [/\b(shop|store|market|smithy|emporium)\b/, "shop"], [/\b(temple|shrine|church|cathedral|monastery|abbey|chapel)\b/, "temple"], [/\b(dungeon|crypt|tomb|catacombs?|lair|caves?|caverns?|mines?|ruins?|vault)\b/, "dungeon"],
  [/\b(forest|woods?|swamp|marsh|mountains?|hills|desert|plains|river|lake|sea|coast|valley|wastes?)\b/, "wilderness"], [/\b(tower|keep|castle|fort|fortress|manor|hall|guildhall|guild|palace|academy)\b/, "building"], [/\b(statue|monument|bridge|gate|standing stones?|well)\b/, "landmark"]];
function wpGuessType(...texts) { for (const t of texts) { const s = String(t || "").toLowerCase(); for (const [re, k] of WP_GUESS) if (re.test(s)) return k; } return "other"; }
const WP_CHILD = { region: "city", city: "district", town: "building", village: "building", district: "building" };
/* <option>s for every place, as an indented tree; value "" = none, NL_NEW = make a new one */
function wpOptionsHTML(cur, noneLabel, skip) {
  if (!W.loaded) worldLoad();
  const out = [], walk = (id, d) => wpKids(id).forEach(p => { if (skip && skip.has(p.id)) return; out.push(`<option value="${esc(p.id)}" ${p.id === cur ? "selected" : ""}>${"\u00a0\u00a0\u00a0".repeat(d)}${wpIcon(p)} ${esc(p.name)}</option>`); walk(p.id, d + 1); });
  walk(null, 0);
  return `<option value="" ${cur && wp(cur) ? "" : "selected"}>${cur && wp(cur) ? "No place" : noneLabel}</option>${out.join("")}${noneLabel === "(top level)" ? "" : `<option value="${NL_NEW}">＋ New place…</option>`}`;
}
/* a value from a place <select>: a place, "" (none) or NL_NEW (asks for a name). null = cancelled */
function wpPick(v, who) {
  if (v === NL_NEW) { const a = prompt(`New place${who ? ` for ${who}` : ""} (a city, town, tavern, dungeon…). You can fill it in on the World tab.`, ""); const name = a === null ? "" : a.trim().slice(0, 80); if (!name) return null; const p = wpNew({ name, type: wpGuessType(name) }); worldSave(); return p; }
  return v ? wp(v) : "";
}
/* the place tabs above an NPC list (NPC tab and the Tracker): one per place NPCs are in; a place's tab includes the places inside it */
function npcPlaceTabs(list, cur) {
  if (!W.loaded) worldLoad();
  const has = n => !!(n.placeId && wp(n.placeId)), ids = [...new Set(list.filter(has).map(n => n.placeId))].map(wp).sort((a, b) => wpPathText(a).localeCompare(wpPathText(b)));
  if (cur && cur !== "-" && !wp(cur)) cur = "";
  const under = {}, inTab = (n, t) => t === "" ? true : t === "-" ? !has(n) : (under[t] = under[t] || wpUnder(t)).has(n.placeId);
  const count = t => list.filter(n => inTab(n, t)).length;
  const tabs = [["", "All", ""], ...ids.map(p => [p.id, `${wpIcon(p)} ${p.name}`, wpPathText(p)]), ["-", "No place", ""]].filter(([t]) => t === "" || t === cur || count(t));
  if (cur && cur !== "-" && !tabs.some(([t]) => t === cur)) { const p = wp(cur); tabs.splice(1, 0, [cur, `${wpIcon(p)} ${p.name}`, wpPathText(p)]); }
  return { cur, keep: n => inTab(n, cur || ""),
    html: attr => `<div class="npc-tabs" role="tablist" aria-label="Places">${tabs.map(([t, lab, title]) => `<button type="button" role="tab" class="chip${t === (cur || "") ? " on" : ""}" aria-selected="${t === (cur || "")}" data-${attr}="${esc(t)}"${title ? ` title="${esc(title)}"` : ""}>${esc(lab)} <span class="npc-tab-n">${count(t)}</span></button>`).join("")}</div>` };
}
/* MythWeaver doesn't say which place is inside which, so guess it from the text, once per place (nestTried):
   a tag naming another place, a Location / Region / Part of section naming one, or "in / within / inside / of X" early in the
   description. Only a bigger kind of place can hold a smaller one (WP_SIZE), and the most specific fit wins. A place the DM
   has already put somewhere, or one tried before, is never moved. */
const WP_SIZE = { region: 0, wilderness: 1, city: 2, town: 2, village: 2, dungeon: 3, district: 3, other: 3, landmark: 4, building: 4, tavern: 5, shop: 5, temple: 5 };
function wpNestGuess() {
  const todo = W.places.filter(p => p.mwId && !p.parent && !p.nestTried); if (!todo.length) return;
  const esc2 = t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), core = n => String(n || "").trim().replace(/^the\s+/i, "");
  const pool = W.places.filter(x => core(x.name).length >= 3);
  for (const a of todo) {
    a.nestTried = true; W.dirty = true;
    const ra = WP_SIZE[a.type] ?? 3, fits = b => b.id !== a.id && !wpUnder(a.id).has(b.id) && ((WP_SIZE[b.type] ?? 3) < ra || (a.type === "other" && b.type !== "other"));
    const named = (text, re) => pool.filter(b => fits(b) && new RegExp(re(esc2(core(b.name))), "i").test(text));
    const tags = (a.tags || []).join(" | ");
    const secs = (a.sections || []).filter(x => /location|region|located|part of|parent|within|where|area/i.test(x.t || "")).map(x => String(x.x || "").split("\n")[0]).join(" | ");
    const lead = String(a.desc || "").replace(/[*_#]/g, "").split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
    const found = named(tags, n => `(^|\\|)\\s*(the\\s+)?${n}\\s*(\\||$)`).concat([]);
    const cands = found.length ? found : (c => c.length ? c : named(lead, n => `\\b(in|within|inside|of|beneath|under|located in|part of)\\s+(the\\s+)?${n}\\b`))(named(secs, n => `\\b${n}\\b`));
    if (!cands.length) continue;
    cands.sort((x, y) => (WP_SIZE[y.type] ?? 3) - (WP_SIZE[x.type] ?? 3));
    a.parent = cands[0].id;
  }
}
/* link Lore places to World places (making new ones), and NPC place names to placeId */
function npcPlaceFix(n, c) {
  if (n.placeId && wp(n.placeId)) { const p = wp(n.placeId); if (n.place !== p.name) { n.place = p.name; return true; } return false; }
  const name = String(n.place || "").trim().toLowerCase();
  if (!name) { if (n.placeId) { delete n.placeId; return true; } return false; }
  let p = c && (c.lore || []).map(l => l.wpId && wp(l.wpId)).find(x => x && x.name.toLowerCase() === name);
  p = p || W.places.find(x => x.name.toLowerCase() === name) || wpNew({ name: String(n.place).trim().slice(0, 80), type: wpGuessType(n.place) });
  n.placeId = p.id; n.place = p.name; return true;
}
function worldAdopt() {
  if (!W.loaded) worldLoad();
  for (const c of Store.list()) {
    let ch = false;
    for (const l of c.lore || []) {
      if (l.type !== "place") { if (l.wpId) { delete l.wpId; ch = true; } continue; }
      let p = l.wpId && wp(l.wpId);
      if (!p) p = (l.mwId && W.places.find(x => x.mwId === l.mwId)) || W.places.find(x => x.name.toLowerCase() === String(l.name || "").trim().toLowerCase());
      if (!p) p = wpNew({ ...(l.wpId ? { id: l.wpId } : {}), name: String(l.name || "Untitled").slice(0, 120), type: wpGuessType((l.tags || []).filter(t => !/\s/.test(String(t).trim())).join(" "), l.name, String(l.desc || "").slice(0, 300)), desc: l.desc || "", sections: JSON.parse(JSON.stringify(l.sections || [])), tags: (l.tags || []).slice(), ...(l.imgUrl ? { imgUrl: l.imgUrl } : {}), ...(l.mwId ? { mwId: l.mwId } : {}) });
      if (l.wpId !== p.id) { l.wpId = p.id; ch = true; }
    }
    for (const n of c.npcs || []) if (npcPlaceFix(n, c)) ch = true;
    if (ch) Store.save(c);
  }
  const L = npcLoose(); let lch = false; for (const n of L) if (npcPlaceFix(n)) lch = true; if (lch) npcLooseSave(L);
  wpNestGuess();
  if (W.dirty) worldSave();
}
/* a World place's text -> its Lore copies, and its name -> NPCs filed there */
function wpSyncOut(p) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const c of Store.list()) {
    let ch = false;
    for (const l of c.lore || []) if (l.wpId === p.id) WP_LORE.forEach(k => { const v = p[k] === undefined || p[k] === "" && k === "imgUrl" ? undefined : JSON.parse(JSON.stringify(p[k])); if (!same(l[k], v)) { if (v === undefined) delete l[k]; else l[k] = v; ch = true; } });
    for (const n of c.npcs || []) if (n.placeId === p.id && n.place !== p.name) { n.place = p.name; ch = true; }
    if (ch) Store.save(c);
  }
  const L = npcLoose(); let ch = false; L.forEach(n => { if (n.placeId === p.id && n.place !== p.name) { n.place = p.name; ch = true; } }); if (ch) npcLooseSave(L);
}
const wpCamps = id => Store.list().filter(c => (c.lore || []).some(l => l.wpId === id));
function wpSetCamp(p, c, on) {
  c.lore = c.lore || [];
  if (on) { if (!c.lore.some(l => l.wpId === p.id)) c.lore.unshift({ id: uid("lo"), name: p.name, type: "place", tags: (p.tags || []).slice(), desc: p.desc || "", sections: JSON.parse(JSON.stringify(p.sections || [])), ...(p.imgUrl ? { imgUrl: p.imgUrl } : {}), wpId: p.id }); }
  else c.lore = c.lore.filter(l => l.wpId !== p.id);
  Store.save(c);
}
async function wpDelete(p) {
  const kids = W.places.filter(x => x.parent === p.id), up = wp(p.parent), npcN = npcGroups().filter(g => g.n.placeId === p.id).length, camps = wpCamps(p.id);
  const msg = [`Delete “${p.name}”?`, kids.length ? `The ${kids.length} place${kids.length === 1 ? "" : "s"} inside it move up to ${up ? up.name : "the top level"}.` : "", npcN ? `Its ${npcN} NPC${npcN === 1 ? "" : "s"} move to ${up ? up.name : "no place"}.` : "", camps.length ? `It's also taken out of the Lore of ${camps.map(c => c.name).join(", ")}.` : ""].filter(Boolean).join(" ");
  if (!(await confirmBox("Delete place?", msg, "Delete"))) return;
  kids.forEach(x => { x.parent = p.parent || null; });
  W.places = W.places.filter(x => x.id !== p.id); if (p.map && p.map.imgId) mapImgTidy(p.map.imgId);
  if (p.atlas && p.atlas.img) MAPIMG.del(p.atlas.img).catch(() => { });
  if (HOST.show === "atlas" && HOST.atlas && HOST.atlas.id === p.id) { HOST.show = "map"; HOST.atlas = null; handoutUI(); hostSend(); } /* its map was on the TV */
  const move = n => { if (n.placeId !== p.id) return false; if (up) { n.placeId = up.id; n.place = up.name; } else { delete n.placeId; delete n.place; } return true; };
  for (const c of Store.list()) { let ch = false; (c.npcs || []).forEach(n => { if (move(n)) ch = true; }); const before = (c.lore || []).length; c.lore = (c.lore || []).filter(l => l.wpId !== p.id); if (ch || c.lore.length !== before) Store.save(c); }
  const L = npcLoose(); let lch = false; L.forEach(n => { if (move(n)) lch = true; }); if (lch) npcLooseSave(L);
  worldSave(); W.sel = up ? up.id : null; renderWorld(); toast(`${p.name} deleted`);
}
/* the places a campaign has: ones in its Lore, and everything inside them */
function wpCampSet(campId) {
  const c = Store.get(campId); if (!c) return null;
  const out = new Set(); (c.lore || []).forEach(l => { if (l.wpId && wp(l.wpId)) wpUnder(l.wpId).forEach(id => out.add(id)); });
  return out;
}
function worldTreeHTML(counts) {
  if (!W.places.length) return `<p class="muted" style="font-size:15px">No places yet. Press 🛠 World builder to make a city, inn, shop, temple or dungeon.</p>`;
  const q = W.q.trim().toLowerCase(), cnt = id => counts[id] ? ` <span class="wcount" title="NPCs here and inside">${counts[id]}</span>` : "";
  const inC = W.camp ? wpCampSet(W.camp) : null, keep = p => !inC || inC.has(p.id);
  const btn = p => `<button type="button" class="wname${p.id === W.sel && W.mode === "place" ? " on" : ""}" data-w="sel" data-id="${esc(p.id)}"${p.id === W.sel ? ' aria-current="true"' : ""}><span class="wic" aria-hidden="true">${wpIcon(p)}</span>${esc(p.name)}${cnt(p.id)}</button>`;
  const path = p => p.parent && wp(p.parent) ? `<small class="muted wpath">${esc(wpPath(p).slice(0, -1).map(x => x.name).join(" › "))}</small>` : "";
  const none = `<p class="muted" style="font-size:15px">${W.camp ? "No places in this campaign yet. Tick it on a place's page, or build one with the campaign chosen." : "No places match."}</p>`;
  if (q) { const L = W.places.filter(p => keep(p) && [p.name, (WP_TYPES[p.type] || WP_TYPES.other)[1], (p.tags || []).join(" ")].join(" ").toLowerCase().includes(q)).sort((a, b) => wpPathText(a).localeCompare(wpPathText(b)));
    return L.length ? L.map(p => `<div class="wnode">${btn(p)}${path(p)}</div>`).join("") : none; }
  if (W.view === "type") {
    const groups = Object.keys(WP_TYPES).map(t => [t, W.places.filter(p => (WP_TYPES[p.type] ? p.type : "other") === t && keep(p)).sort((a, b) => a.name.localeCompare(b.name))]).filter(([, L]) => L.length);
    if (!groups.length) return none;
    return groups.map(([t, L]) => { const open = W.openT.has(t) || !!q;
      return `<div class="wgroup"><button type="button" class="wgroup-h" data-w="tgroup" data-t="${t}" aria-expanded="${open}"><span class="wtog" aria-hidden="true">${open ? "▾" : "▸"}</span><span class="wic" aria-hidden="true">${WP_TYPES[t][0]}</span>${WP_PLURAL[t]}<span class="wcount">${L.length}</span></button>
        ${open ? `<div class="wgroup-b">${L.map(p => `<div class="wnode">${btn(p)}${path(p)}</div>`).join("")}</div>` : ""}</div>`; }).join("");
  }
  const vis = inC ? new Set([...W.places.filter(keep)].flatMap(p => wpPath(p).map(x => x.id))) : null;
  const walk = (id, d) => wpKids(id).filter(p => !vis || vis.has(p.id)).map(p => { const kids = wpKids(p.id).filter(k => !vis || vis.has(k.id)).length, open = W.open.has(p.id);
    return `<div class="wnode" style="--d:${d}">${kids ? `<button type="button" class="wtog" data-w="tog" data-id="${esc(p.id)}" aria-expanded="${open}" aria-label="${open ? "Close" : "Open"} ${esc(p.name)}">${open ? "▾" : "▸"}</button>` : `<span class="wtog" aria-hidden="true"></span>`}${btn(p)}</div>${kids && open ? walk(p.id, d + 1) : ""}`; }).join("");
  const html = walk(null, 0);
  return html ? `<div role="tree" aria-label="Places">${html}</div>` : none;
}
function worldPlaceHTML(p, groups) {
  const t = WP_TYPES[p.type] || WP_TYPES.other, under = wpUnder(p.id), camps = Store.list(), inC = new Set(wpCamps(p.id).map(c => c.id));
  const here = groups.filter(g => under.has(g.n.placeId)), kids = wpKids(p.id);
  const byPlace = {}; here.forEach(g => (byPlace[g.n.placeId] = byPlace[g.n.placeId] || []).push(g));
  const order = [p.id, ...[...under].filter(id => id !== p.id && byPlace[id]).sort((a, b) => wpPathText(wp(a)).localeCompare(wpPathText(wp(b))))];
  const npcRow = g => `<div class="wnpc"><button type="button" class="npc-lib-name" data-w="opennpc" data-lib="${esc(g.lib)}" title="Open in Your NPCs"><b>${esc(g.n.name || "Unnamed NPC")}</b>${g.n.role ? ` <span class="muted">· ${esc(g.n.role)}</span>` : ""}${g.n.attitude ? ` <span class="tag">${esc(g.n.attitude)}</span>` : ""}</button>${g.camps.length ? `<small class="muted">${esc(g.camps.map(id => (Store.get(id) || {}).name).filter(Boolean).join(", "))}</small>` : `<small class="muted">Not in a campaign</small>`}</div>`;
  const others = groups.filter(g => !under.has(g.n.placeId)).sort((a, b) => String(a.n.name).localeCompare(String(b.n.name)));
  const pic = npcUrlOk(p.imgUrl) ? p.imgUrl : "";
  return `<div class="card wplace">
    <div class="wcrumbs">${wpPath(p).map((x, i, a) => i < a.length - 1 ? `<button type="button" class="wcrumb" data-w="sel" data-id="${esc(x.id)}">${wpIcon(x)} ${esc(x.name)}</button><span aria-hidden="true">›</span>` : `<span>${wpIcon(x)} ${esc(t[1])}</span>`).join("")}</div>
    <input type="text" class="title-input" data-wf="name" value="${esc(p.name)}" aria-label="Place name" maxlength="120">
    <div class="row" style="gap:10px;flex-wrap:wrap">
      <div class="field" style="flex:1 1 180px"><label for="wpType">Type</label><select id="wpType" data-wf="type">${Object.entries(WP_TYPES).map(([k, [ic, l]]) => `<option value="${k}" ${k === p.type ? "selected" : ""}>${ic} ${l}</option>`).join("")}</select></div>
      <div class="field" style="flex:2 1 220px"><label for="wpParent">Inside</label><select id="wpParent" data-wf="parent">${wpOptionsHTML(p.parent, "(top level)", under)}</select></div></div>
    ${ATLAS_PIN.has(p.type) || p.type === "region" ? `<label class="check"><input type="checkbox" data-wfound ${p.found ? "checked" : ""}><span>Found by the players: shown on the TV's maps</span></label>` : ""}
    <div class="field"><label>In campaigns</label><div class="npc-camps">${camps.length ? camps.map(c => { const on = inC.has(c.id); return `<label class="chip${on ? " on" : ""}"><input type="checkbox" data-wc="${esc(c.id)}" ${on ? "checked" : ""}>${on ? "✓ " : ""}${esc(c.name)}</label>`; }).join("") : `<span class="muted" style="font-size:14px">Make a campaign in the Campaign Tracker to use this place in it.</span>`}</div>
      <p class="hint" style="margin:4px 0 0">A ticked campaign shows this place in its Lore tab. Changes made there or here show in both.</p></div>
    <div class="field"><label for="wpDesc">Description</label><textarea id="wpDesc" data-wf="desc" placeholder="What it's like, who runs it, what's going on…">${esc(p.desc || "")}</textarea></div>
    ${(p.sections || []).length ? `<div class="wsecs">${p.sections.map(x => `<div class="lore-sec"><h4>${esc(x.t || "")}${x.dm ? ` <span class="tag lore-dm" title="Only for you">🔒 DM only</span>` : ""}</h4>${mdHTML(x.x)}</div>`).join("")}<p class="hint">Edit these sections in a campaign's Lore tab.</p></div>` : ""}
    <div class="field"><label for="wpPic">Picture link</label><input type="text" id="wpPic" data-wf="imgUrl" value="${esc(p.imgUrl || "")}" placeholder="https://…">${pic ? `<img class="wpic" src="${esc(pic)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : ""}</div>
    ${p.shop ? `<div class="row" style="gap:8px;margin:6px 0 10px;align-items:center"><button class="btn sm primary" type="button" data-w="openshop" style="flex:0 0 auto">🛒 Open the shop</button><span class="muted" style="font-size:14px">Opens it on the Items tab, where characters can buy from it.</span></div>` : ""}
    ${p.type === "region" ? `<div class="sec-h"><h3>Region map</h3></div>${p.atlas ? `<button type="button" class="atlas-thumb" data-at="open" data-id="${esc(p.id)}" aria-label="Open the map of ${esc(p.name)}"><canvas id="atlasThumb"></canvas></button>
      <div class="row" style="gap:6px;margin:6px 0 12px;flex-wrap:wrap"><button class="btn sm primary" type="button" data-at="open" data-id="${esc(p.id)}" style="flex:0 0 auto">🗺️ Open the region map</button></div>`
      : `<p class="muted" style="margin:0 0 6px">A painted map of the region, with its towns, dungeons and landmarks pinned on it.</p><div class="row" style="gap:6px;margin-bottom:12px"><button class="btn sm primary" type="button" data-at="make" style="flex:0 0 auto">🗺️ Make a map</button></div>`}` : ""}
    <div class="sec-h"><h3>${p.type === "region" ? "Other map" : "Map"}</h3></div>
    ${p.map ? `<div class="wmap"><button type="button" class="wmap-view" id="wpMapView" data-w="openmap" title="Open on the Dungeon Map tab" aria-label="Open the map of ${esc(p.name)} on the Dungeon Map tab"><span class="muted">Loading map…</span></button>
      <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px"><button class="btn sm primary" type="button" data-w="openmap" style="flex:0 0 auto">🗺 Open on Dungeon Map</button><label class="btn sm" style="flex:0 0 auto">🖼 Replace with a picture…<input type="file" id="wpMapFile" accept="image/*" hidden></label><button class="btn sm" type="button" data-w="rmmap" style="flex:0 0 auto">✕ Remove map</button></div>
      <p class="hint" style="margin:6px 0 0">${p.map.kind === "image" ? "A map picture" : p.map.kind === "drawn" ? "A drawn map" : `A generated ${esc(p.map.theme || "dungeon")} map`}${p.map.fog ? ", with its fog" : ""}. Open it to add room notes, show it on the TV and reveal it as the players explore, then press <b>Save to a World place</b> there to keep the changes.</p></div>`
      : `<p class="muted" style="margin:0 0 6px">No map yet.</p><div class="row" style="flex-wrap:wrap;gap:6px"><label class="btn sm" style="flex:0 0 auto">🖼 Upload a map picture…<input type="file" id="wpMapFile" accept="image/*" hidden></label><button class="btn sm" type="button" data-w="genmap" style="flex:0 0 auto">🎲 Generate a dungeon map</button>${currentMap ? `<button class="btn sm" type="button" data-w="usemap" style="flex:0 0 auto">Use the map on the Dungeon Map tab (${esc(currentMap.params.name)})</button>` : ""}</div>
        <p class="hint" style="margin:6px 0 0">A picture can be a city, town or region map, or a battle map from Dungeondraft or a book.</p>`}
    <div class="sec-h"><h3>Places inside</h3><span class="sp"></span><button class="btn sm" type="button" data-w="child">+ Add a place inside</button></div>
    ${kids.length ? `<div class="wkids">${kids.map(k => { const n = groups.filter(g => wpUnder(k.id).has(g.n.placeId)).length; return `<button type="button" class="chip" data-w="sel" data-id="${esc(k.id)}">${wpIcon(k)} ${esc(k.name)}${n ? ` <span class="npc-tab-n">${n} NPC${n === 1 ? "" : "s"}</span>` : ""}</button>`; }).join("")}</div>` : `<p class="muted">Nothing inside yet.</p>`}
    <div class="sec-h"><h3>NPCs here</h3><span class="sp"></span><button class="btn sm" type="button" data-w="npc">+ New NPC here</button></div>
    ${here.length ? order.filter(id => byPlace[id]).map(id => `${id !== p.id ? `<h4 class="wsub">${wpIcon(wp(id))} In ${esc(wpPath(wp(id)).slice(wpPath(p).length).map(x => x.name).join(" › "))}</h4>` : ""}${byPlace[id].sort((a, b) => String(a.n.name).localeCompare(String(b.n.name))).map(npcRow).join("")}`).join("") : `<p class="muted">No NPCs here yet.</p>`}
    ${others.length ? `<div class="field" style="margin-top:8px"><label for="wpMoveNpc">Move an NPC here</label><select id="wpMoveNpc" data-w-move><option value="">Choose an NPC…</option>${others.map(g => `<option value="${esc(g.lib)}">${esc(g.n.name || "Unnamed")}${g.n.place ? ` (now in ${esc(g.n.place)})` : ""}</option>`).join("")}</select></div>` : ""}
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn sm danger" type="button" data-w="del" style="flex:0 0 auto">Delete this place</button></div>
  </div>`;
}
function renderWorld(treeOnly) {
  const side = $("#worldSide"), main = $("#worldMain"); if (!side || !main) return;
  worldAdopt();
  if (W.sel && !wp(W.sel)) W.sel = null;
  if (W.camp && !Store.get(W.camp)) W.camp = "";
  if (W.sel) { wpPath(wp(W.sel)).slice(0, -1).forEach(x => W.open.add(x.id)); W.openT.add(WP_TYPES[wp(W.sel).type] ? wp(W.sel).type : "other"); }
  const groups = npcGroups(), counts = {};
  groups.forEach(g => { let x = wp(g.n.placeId), k = 0; while (x && k++ < 30) { counts[x.id] = (counts[x.id] || 0) + 1; x = wp(x.parent); } });
  if (!$("#worldTree")) side.innerHTML = `<div class="sec-h"><h3>World</h3><span class="sp"></span><button class="btn sm" type="button" data-w="new">+ Place</button></div>
    <button class="btn primary wide" type="button" data-w="build" style="margin-bottom:6px">🛠 World builder</button>
    <button class="btn wide" type="button" data-at="world" style="margin-bottom:10px">🌍 World map</button>
    <select id="worldCamp" aria-label="Show places from" style="margin-bottom:8px"></select>
    <div class="seg wview" role="radiogroup" aria-label="Show places"><label class="opt"><input type="radio" name="wview" value="type"><span>By type</span></label><label class="opt"><input type="radio" name="wview" value="tree"><span>Map</span></label></div>
    <input type="search" id="worldQ" autocomplete="off" placeholder="Search places…" aria-label="Search places" style="margin:8px 0"><div id="worldTree" class="wtree"></div>
    <p class="hint" style="margin-top:10px"><b>By type</b> groups your cities, towns, inns and so on; click a group to open it. <b>Map</b> shows what's inside what. Places in your campaigns' Lore appear here by themselves.</p>`;
  $("#worldCamp").innerHTML = `<option value="">All campaigns</option>${Store.list().map(c => `<option value="${esc(c.id)}" ${c.id === W.camp ? "selected" : ""}>${esc(c.name)}</option>`).join("")}`;
  side.querySelectorAll('input[name="wview"]').forEach(r => { r.checked = r.value === W.view; });
  $("#worldTree").innerHTML = worldTreeHTML(counts);
  if (treeOnly) return;
  if (W.mode === "build") { main.innerHTML = wbHTML(); wbMapDraw(); return; }
  if (W.mode === "atlas") { main.innerHTML = atlasViewHTML(); atlasRender(); return; }
  const p = wp(W.sel);
  main.innerHTML = p ? worldPlaceHTML(p, groups) : `<div class="card empty"><h2>${W.places.length ? "Pick a place" : "Build your world"}</h2><p>${W.places.length ? "Choose a place on the left to see what's inside it and who lives there." : "Add regions, cities, towns, taverns and dungeons, put them inside each other, and file your NPCs under them. Places in your campaigns' Lore are added for you."}</p><div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap"><button class="btn primary" type="button" data-w="build" style="flex:0 0 auto">🛠 World builder</button>${W.places.length ? "" : `<button class="btn" type="button" data-w="new" style="flex:0 0 auto">+ Add a place yourself</button>`}</div></div>`;
  main.querySelectorAll("textarea").forEach(autoGrow);
  if (p && p.map) wpMapThumb(p);
  if (p && p.atlas && $("#atlasThumb")) { const m = p.atlas, cv = $("#atlasThumb"); atlasPinsFill(p.id); (m.img ? atlasPicture(m) : Promise.resolve(null)).then(pic => { if (cv.isConnected) atlasDraw(cv, m, { picture: m.img ? pic || atlasBlank(m) : null, pins: atlasPins(p.id, false), names: m.img ? [] : (m.names || []).filter(f => f.name), scale: .4 }); }); }
}
/* the map's picture on the place page: a generated map is drawn from its settings, an imported one comes from this computer */
let wpMapUrl = null;
async function wpMapThumb(p) {
  const box = $("#wpMapView"); if (!box) return; const m = p.map;
  if (wpMapUrl) { URL.revokeObjectURL(wpMapUrl); wpMapUrl = null; }
  try {
    if (m.kind === "image") {
      let blob = null; try { blob = await MAPIMG.get(m.imgId); } catch { }
      if (!box.isConnected || W.sel !== p.id) return;
      if (!blob) { box.innerHTML = `<span class="muted">The picture isn't on this computer. Upload it again with Replace.</span>`; return; }
      wpMapUrl = URL.createObjectURL(blob); box.innerHTML = `<img src="${wpMapUrl}" alt="Map of ${esc(p.name)}">`;
    } else {
      const cap = { small: 10, medium: 16, large: 24 }[m.size] || 16, d = m.kind === "drawn" ? drawnBuild(m) : generateDungeon({ ...m, rooms: Math.min(m.rooms || 10, cap) }), cv = document.createElement("canvas");
      drawDungeon(cv, d, true, { scale: 1 }); cv.setAttribute("aria-hidden", "true"); box.replaceChildren(cv);
    }
  } catch (e) { box.innerHTML = `<span class="muted">Couldn't draw this map.</span>`; }
}
const WP_MAP_THEME = { dungeon: "crypt", temple: "temple", wilderness: "cavern", landmark: "crypt", building: "keep", tavern: "keep", shop: "keep", city: "keep", town: "keep", village: "keep", district: "sewer", region: "cavern", other: "crypt" };
function wpMapOpen(p) { MAPLINK.place = p.id; const r = mapOpenSaved(p.map); setTimeout(mapPlaceFill, 50); toast(`${p.name}'s map is open. Press Save to a World place to keep changes.`); return r; }
/* ======================= World builder =======================
   W.build = {kind, seed, o (options)}. Each builder in WB turns (rng, o) into a draft {name, type, desc, sections, kids, npcs, shop?, map?};
   the preview shows it, Roll again changes the seed, and wbCommit makes the World places (and their NPCs) from it. */
const WB_KINDS = { settlement: ["🏰", "Settlement"], tavern: ["🍺", "Inn or tavern"], shop: ["🛒", "Shop"], temple: ["⛪", "Temple"], dungeon: ["💀", "Dungeon"], region: ["🗺️", "Region"] };
const WB_TERRAIN = { river: "on both banks of a slow river", coast: "around a sheltered harbour", mountains: "high in the mountains, where the passes meet", forest: "in a clearing of old forest", plains: "at a crossroads on the open plains", hills: "on a hill above the farmland", marsh: "on stilts and causeways over the marsh", desert: "around an oasis in the dry country" };
const WB_A = ["Ash", "Bright", "Cold", "Deep", "Elm", "Fair", "Gold", "Green", "Grey", "High", "Iron", "King's", "Lake", "Long", "Mill", "Oak", "Raven", "Red", "Salt", "Silver", "Stone", "Storm", "Thorn", "White", "Wolf", "Wind", "Black", "Copper", "Frost", "Amber"];
const WB_B = ["ford", "haven", "bridge", "wick", "stead", "fall", "holm", "moor", "port", "gate", "hollow", "mere", "vale", "watch", "crest", "barrow", "field", "march", "reach", "burg", "ton", "dale", "wood", "cliff"];
const WB_GOV = [["a hereditary lord", "Noble", "lord of the town"], ["an elected council of guildmasters", "Merchant", "council speaker"], ["a temple that rules in its god's name", "Clergy", "high priest"], ["a merchant prince", "Merchant", "merchant prince"], ["a military governor", "Military", "governor"], ["a council of elders", "Commoner", "eldest of the council"], ["a mayor everyone agrees is useless", "Commoner", "mayor"], ["a regent ruling for a child heir", "Noble", "regent"], ["a mage who rarely leaves the tower", "Scholar", "wizard-lord"]];
const WB_KNOWN = ["its wool and weaving", "the best ale for a hundred miles", "a famous summer fair", "its silver mines", "shipbuilding", "a holy relic in the temple", "horse breeding", "a ruined wizard's tower on the hill", "its fishing fleet", "trade with the dwarves", "a college of bards", "a giant's skull over the gate", "smuggling, quietly", "its orchards and cider", "a bridge older than anyone knows", "its fighting pits"];
const WB_DEF = [["a wooden palisade", "a watchtower with a bell", "a few hunters with bows"], ["stone walls and a small watch", "an earth rampart and an old keep", "a militia that drills on feast days"], ["high walls with towered gates", "a standing garrison and a city watch", "a citadel above the old town"]];
const WB_RUMOURS = ["Livestock has been going missing at night.", "The well water has tasted of iron since the earthquake.", "A noble's heir vanished on the road last month.", "Strangers in grey cloaks are buying up every map in town.", "The temple bells rang by themselves last week.", "A merchant swears a ghost haunts the old mill.", "Bandits are charging a toll on the trade road.", "Someone is poisoning the guild's horses.", "A travelling circus came to town and never left.", "The mayor has been seen talking to his own shadow.", "Children keep dreaming of the same red door.", "Gold coins from a kingdom nobody has heard of are turning up.", "A ship came in with no crew aboard.", "Wolves were heard howling inside the walls."];
const WB_DISTRICTS = [["Old Town", "Narrow streets and leaning houses around the oldest market."], ["Market Ward", "Stalls, shouting and the smell of spice and fish."], ["Temple Quarter", "Quiet squares, bells and pilgrims."], ["Docks", "Warehouses, sailors and things that fall off ships.", "water"], ["Noble Hill", "Walled gardens and guards who ask your business."], ["The Warrens", "Crowded tenements where the watch doesn't go after dark."], ["Guild Row", "Workshops and guildhalls, each with its own banner."], ["Castle Ward", "Barracks, the courts and the lord's keep."], ["Craftsmen's Quarter", "Smithies, tanners and the ring of hammers."]];
const WB_TAV_A = ["Prancing", "Drunken", "Golden", "Sleeping", "Rusty", "Laughing", "Wandering", "Crooked", "Jolly", "Silver", "Salty", "Thirsty", "Howling", "Blind", "Merry", "Red", "Gilded", "Lucky"];
const WB_TAV_N = ["Pony", "Goose", "Dragon", "Griffon", "Barrel", "Tankard", "Stag", "Boar", "Lantern", "Anchor", "Mermaid", "Wyvern", "Fiddler", "Crown", "Owl", "Badger", "Kettle", "Hound"];
const WB_TAV_Q = { poor: ["Poor", "1 sp", "6 cp", "A common room with straw pallets and a draughty loft."], modest: ["Modest", "5 sp", "3 sp", "Small rooms with real beds and a lock on the door."], comfortable: ["Comfortable", "8 sp", "5 sp", "Clean rooms, a warm fire and a bath for a copper."], wealthy: ["Wealthy", "2 gp", "8 sp", "Fine rooms with feather beds, and a servant to fetch whatever you need."] };
const WB_TAV_ATM = ["smoky and loud", "quiet, with a crackling fire", "packed with dockworkers and sailors", "clean and suspiciously cheerful", "dim, with private booths", "full of bards competing for coin", "rowdy, with a fight most nights", "cosy, with a fat cat who owns the best chair"];
const WB_TAV_SP = ["a dartboard where the bets run high", "an arm-wrestling champion who has never lost", "a notice board full of jobs", "a cellar nobody is allowed into", "a stew that has been simmering for years", "a stage for travelling performers", "a mounted owlbear head over the bar", "a back room the thieves' guild uses", "a bathhouse out back", "a regular in the corner who never speaks"];
const WB_FOOD = ["mutton stew and dark bread", "river trout with onions", "roast boar", "barley soup", "honeyed ham", "mushroom pie", "spiced sausages", "cheese, pickles and apples", "eel pie", "rabbit with herbs"];
const WB_DRINK = [["house ale", "4 cp a mug"], ["dark stout", "5 cp a mug"], ["cider", "3 cp a mug"], ["mead", "1 sp a cup"], ["elven wine", "2 gp a bottle"], ["dwarven firebrandy", "5 sp a glass"], ["spiced wine", "2 sp a jug"]];
const WB_GODS = { Life: "the Dawnmother", Light: "the Sunlord", War: "the Iron Father", Knowledge: "the Keeper of Pages", Nature: "the Green Lady", Tempest: "the Storm King", Trickery: "the Laughing Fox", Death: "the Pale Ferryman", Forge: "the Smith Below", Grave: "the Quiet Warden", Order: "the Lawgiver", Peace: "the Open Hand", Twilight: "the Lantern of Dusk" };
const WB_TEMPLE_F = ["a reliquary holding a saint's finger bone", "a garden of night-blooming flowers", "a bell that rings by itself before storms", "catacombs beneath the altar", "a scriptorium copying old texts", "a famous stained-glass window", "a sacred spring", "an eternal flame that has never gone out"];
const WB_TEMPLE_T = ["The high priest is secretly losing their faith.", "A relic was stolen last month, and the theft is being hushed up.", "Pilgrims report visions of a dark figure in the crypt.", "The temple is deep in debt to a moneylender.", "An acolyte is dabbling in necromancy.", "A rival faith wants the building."];
const WB_DUN_A = ["Sunken", "Forgotten", "Howling", "Burning", "Silent", "Shattered", "Drowned", "Cursed", "Hollow", "Black", "Whispering", "Bleeding"];
const WB_DUN_N = { crypt: ["Crypt", "Tomb", "Barrow"], cavern: ["Caves", "Grotto", "Deeps"], keep: ["Keep", "Fortress", "Tower"], sewer: ["Sewers", "Undercity", "Cisterns"], temple: ["Temple", "Sanctum", "Shrine"], mine: ["Mine", "Delve", "Shafts"] };
const WB_DUN_PAST = ["built by a forgotten king to hide his treasure", "once a monastery, abandoned after a plague", "dug by dwarves who broke into something below", "a wizard's prison whose wards are failing", "the last stand of an army that never surrendered", "a cult's holy place, sealed by the church a century ago"];
const WB_DUN_NOW = ["goblins who think it's a palace", "the restless dead", "a band of outlaws", "a young dragon's brood", "cultists trying to finish an old ritual", "something that came up from below"];
const WB_DUN_WHY = ["A villager's child was taken there.", "A map to the treasure was found in an old book.", "The thing inside is waking, and the town feels it.", "A patron pays well for a relic said to lie at the bottom.", "The local lord wants it cleared before winter.", "Someone the party knows went in and didn't come out."];
function wbNpc(r, role, occ, att) { const n = generateNPC(r, { role, ...(att ? { att } : {}) }); if (occ) n.occupation = occ; return n; }
const WB = {
  settlement(r, o) {
    const size = o.size || "town", si = { village: 0, town: 1, city: 2 }[size], gov = r.pick(WB_GOV), terr = WB_TERRAIN[o.terrain] ? o.terrain : r.pick(Object.keys(WB_TERRAIN));
    const name = String(o.name || "").trim() || r.pick(WB_A) + r.pick(WB_B), pop = [r.int(5, 40) * 10, r.int(10, 60) * 100, r.int(10, 60) * 1000][si];
    const known = r.pickN(WB_KNOWN, 2), def = r.pick(WB_DEF[si]), rum = r.pickN(WB_RUMOURS, 3);
    const d = { name, type: size, desc: `A ${size} of about ${pop.toLocaleString()} people ${WB_TERRAIN[terr]}. It's ruled by ${gov[0]}, defended by ${def}, and known for ${known[0]} and ${known[1]}.`,
      sections: [{ t: "Rumours", x: rum.map(x => "- " + x).join("\n"), dm: false }, { t: "What's really going on", x: r.pick(WB_TEMPLE_T.concat(["A cult has members on the town council.", "The founding charter is a forgery, and someone has proof.", "A dragon is owed a tribute nobody has paid in years."])), dm: true }], kids: [], npcs: [] };
    if (o.npcs !== false) { d.npcs.push(wbNpc(r, gov[1], gov[2]), wbNpc(r, "Military", si ? "captain of the watch" : "head of the militia")); if (si) d.npcs.push(wbNpc(r, r.pick(["Criminal", "Scholar", "Merchant"]))); }
    if (o.places !== false) {
      const sub = [WB.tavern(r, { quality: r.pick(["poor", "modest", "comfortable"]), npcs: o.npcs, size }), WB.shop(r, { type: "general", size, npcs: o.npcs, level: o.level })];
      if (si >= 1) sub.push(WB.shop(r, { type: r.pick(["smith", "alchemist", "bowyer"]), size, npcs: o.npcs, level: o.level }), WB.temple(r, { npcs: o.npcs, size }));
      if (si === 2) sub.push(WB.tavern(r, { quality: "wealthy", npcs: o.npcs, size }), WB.shop(r, { type: "magic", size, npcs: o.npcs, level: o.level }));
      if (si === 2) {
        const pool = WB_DISTRICTS.filter(x => !x[2] || terr === "coast" || terr === "river"), ds = r.pickN(pool, r.int(3, 4)).map(([n, t]) => ({ name: n, type: "district", desc: t, sections: [], kids: [], npcs: [] }));
        sub.forEach((x, i) => ds[i % ds.length].kids.push(x)); d.kids = ds;
      } else d.kids = sub;
    }
    return d;
  },
  tavern(r, o) {
    const q = WB_TAV_Q[o.quality] || WB_TAV_Q[r.pick(Object.keys(WB_TAV_Q))], name = String(o.name || "").trim() || `The ${r.pick(WB_TAV_A)} ${r.pick(WB_TAV_N)}`;
    const food = r.pickN(WB_FOOD, 3), drinks = r.pickN(WB_DRINK, 3), keeper = o.npcs !== false ? wbNpc(r, "Merchant", "innkeeper", "Friendly") : null;
    const d = { name, type: "tavern", desc: `A ${q[0].toLowerCase()} inn, ${r.pick(WB_TAV_ATM)}.${keeper ? ` ${keeper.name} keeps the place.` : ""} Its claim to fame is ${r.pick(WB_TAV_SP)}.`,
      sections: [{ t: "Rooms", x: `${q[3]}\n\n**A night's stay:** ${q[1]} each`, dm: false }, { t: "On the menu", x: `- **Meal** (${q[2]}): ${food.join("; ")}\n${drinks.map(([n, c]) => `- **${cap1(n)}**: ${c}`).join("\n")}`, dm: false }, { t: "Overheard at the bar", x: r.pickN(WB_RUMOURS, 2).map(x => "- " + x).join("\n"), dm: false }], kids: [], npcs: [] };
    if (keeper) d.npcs.push(keeper, wbNpc(r, "Commoner", r.pick(["cook", "server", "stablehand", "bouncer"])), wbNpc(r, r.pick(["Adventurer", "Criminal", "Merchant", "Military"])));
    return d;
  },
  shop(r, o) {
    const sh = shopMake({ type: SHOPS[o.type] ? o.type : r.pick(Object.keys(SHOPS)), size: o.size || "town", level: +o.level || shopLevelGuess(), seed: r.int(1, 1e9).toString(36).toUpperCase(), ed: IT.ed || "2024",
      ...(Array.isArray(o.rar) && o.rar.length ? { rar: o.rar } : {}), ...(o.amount && o.amount !== "normal" ? { amount: o.amount } : {}), ...(o.moodIx !== undefined && o.moodIx !== "" ? { moodIx: +o.moodIx } : {}) });
    const name = String(o.name || "").trim() || sh.name, full = { ...sh, markup: 0 }, sale = shopSaleText(full); full.sale = sale;
    const d = { name, type: sh.type === "temple" ? "temple" : "shop", desc: `${sh.label}, run by ${sh.keeper}, who is ${sh.mood}.`, shop: { type: sh.type, size: sh.size, level: sh.level, seed: sh.seed, ed: sh.ed }, shopFull: full,
      sections: [{ t: "For sale", x: sale, dm: false, auto: true }], kids: [], npcs: [] };
    if (o.npcs !== false) { const k = wbNpc(r, "Merchant", "shopkeeper"); k.name = sh.keeper; d.npcs.push(k); }
    return d;
  },
  temple(r, o) {
    const dom = WB_GODS[o.domain] ? o.domain : r.pick(Object.keys(WB_GODS)), god = WB_GODS[dom], kind = { village: "shrine", town: "temple", city: "great temple" }[o.size || "town"] || "temple";
    const name = String(o.name || "").trim() || r.pick([`The ${kind === "shrine" ? "Shrine" : "Temple"} of ${god.replace(/^the /, "")}`, `${r.pick(["Saint", "Blessed"])} ${r.pick(["Aldric", "Mirena", "Tobias", "Ysolde", "Corwin", "Hesta"])}'s ${kind === "shrine" ? "Shrine" : "Chapel"}`, `The House of ${r.pick(["Dawn", "Mercy", "Iron", "Pages", "Storms", "Lanterns", "Silence"])}`]);
    const d = { name, type: "temple", desc: `A ${kind} to ${god}, god of ${dom.toLowerCase()}. It's known for ${r.pick(WB_TEMPLE_F)}.`,
      sections: [{ t: "Services", x: `- **Cure Wounds**: 10 gp\n- **Lesser Restoration**: 40 gp\n- **Remove Curse**: 90 gp\n- **Raise Dead**: 1,250 gp, and only for the faithful\n- A night's shelter and a meal: free, for those who pray`, dm: false }, { t: "Trouble", x: r.pick(WB_TEMPLE_T), dm: true }], kids: [], npcs: [] };
    if (o.npcs !== false) d.npcs.push(wbNpc(r, "Clergy", kind === "shrine" ? "shrine keeper" : "high priest"), wbNpc(r, "Clergy", "acolyte"));
    return d;
  },
  dungeon(r, o) {
    const theme = WB_DUN_N[o.theme] ? o.theme : r.pick(Object.keys(WB_DUN_N)), name = String(o.name || "").trim() || `The ${r.pick(WB_DUN_A)} ${r.pick(WB_DUN_N[theme])}`, level = +o.level || shopLevelGuess();
    const d = { name, type: "dungeon", desc: `A place ${r.pick(WB_DUN_PAST)}. These days it's home to ${r.pick(WB_DUN_NOW)}.`,
      sections: [{ t: "Why go in", x: r.pickN(WB_DUN_WHY, 2).map(x => "- " + x).join("\n"), dm: false }, { t: "The truth", x: r.pick(["The treasure was taken long ago; what's left is a trap.", "The monsters are guarding something worse, not hiding from it.", "Someone in town knows exactly what's down there.", "The way out closes behind whoever reaches the bottom."]), dm: true }], kids: [], npcs: [] };
    if (o.map !== false) d.map = { name: name.slice(0, 60), theme, size: "medium", rooms: 8, level, party: 4, seed: r.int(1, 1e9).toString(36).toUpperCase().slice(0, 6), style: "parchment" };
    return d;
  },
  /* a region with its own generated map (2026-11-18). The map's seed comes from the build seed, so typing doesn't change it; o.names are the DM's own feature names.
     2026-11-24: a climate, towns and villages (o.towns) and kingdoms inside it (o.realms), pinned on the map. Pins use draft keys (x._pin)
     until wbCommit gives the places their ids. */
  region(r, o) {
    const shape = ATLAS_SHAPES[o.shape] ? o.shape : "coast", land = ATLAS_LANDS[o.land] ? o.land : "balanced", climate = ATLAS_CLIMATES[o.climate] ? o.climate : "temperate";
    const isle = shape === "island" || shape === "archipelago" || shape === "volcano";
    const name = String(o.name || "").trim() || (isle ? r.pick([`The ${r.pick(ATLAS_NA)} Isle`, `The ${r.pick(ATLAS_NB)} Isles`]) : r.pick([`The ${r.pick(ATLAS_NA)} Reach`, `The ${r.pick(ATLAS_NB)} Marches`, `The Kingdom of ${r.pick(ATLAS_NB)}`, `The ${r.pick(ATLAS_NA)} Vale`]));
    const atlas = { v: 2, seed: "at-" + W.build.seed, shape, land, climate, pins: {}, names: [] }, own = o.names || {};
    atlas.names = atlasNames(atlas).map(f => own[f.id] ? { ...f, name: own[f.id] } : f);
    const what = `${{ temperate: "", desert: "desert ", jungle: "jungle-covered ", tundra: "frozen ", swamp: "marshy " }[climate]}${{ coast: "coastal land", inland: "land far from the sea", island: "island", archipelago: "chain of islands", peninsula: "peninsula", volcano: "volcanic island", twin: "pair of lands across a strait" }[shape]}`;
    const desc = `${/^[aeiou]/.test(what) ? "An" : "A"} ${what}${land === "balanced" ? "" : " of " + { mountains: "mountains", forest: "forests", plains: "open plains" }[land]}.`;
    const kids = wbRegionPlaces(atlas, o);
    return { name, type: "region", desc, sections: [], kids, npcs: [], atlas };
  }
};
/* the region builder's towns and kingdoms: drafts with _pin keys, and their spots in atlas.pins. Its own random streams, so
   changing the name doesn't move anything, and the same build seed always puts them in the same places. */
const WB_REALM_N = [["The Kingdom of {B}", "kingdom"], ["The Duchy of {B}", "duchy"], ["The {A} March", "march"], ["The Free Lands of {B}", "free land"], ["The {A} Throne", "kingdom"], ["The Barony of {B}", "barony"]];
function wbRegionPlaces(atlas, o) {
  const T = atlasTerrain(atlas), rr = makeRng("wb-region", W.build.seed), nRealm = [2, 3, 4].includes(+o.realms) ? +o.realms : 0;
  const plan = ({ none: [], few: ["town", "village", "village"], many: ["city", "town", "town", "town", "village", "village", "village", "village"] }[o.towns || "few"] || []).slice();
  if (plan.length) while (plan.filter(t => t !== "village").length < nRealm) plan.push("town"); // each kingdom gets a seat
  const spots = [], cellAt = q => atlasCell(T, q), mid = i => ({ x: +(((i % T.W) + .5) / T.W).toFixed(5), y: +((Math.floor(i / T.W) + .5) / T.H).toFixed(5) });
  const place = (score, room) => { let best = null, bs = -Infinity; for (let k = 0; k < 400; k++) { const q = { x: .06 + rr.f() * .88, y: .08 + rr.f() * .84 }, i = cellAt(q); if (T.h[i] < .01) continue; let s = score(i, q) + rr.f() * .5; for (const o2 of spots) { const d = Math.hypot(o2.x - q.x, (o2.y - q.y) * ATLAS_H / ATLAS_W); if (d < room) s -= (room - d) * 400; } if (s > bs) { bs = s; best = i; } } return best === null ? null : mid(best); };
  const used = new Set(), uname = f => { for (let k = 0; k < 20; k++) { const n = f(); if (!used.has(n)) { used.add(n); return n; } } return f() + " " + (used.size + 1); };
  const realms = [];
  for (let k = 0; k < nRealm; k++) { // spread out: each kingdom's heart as far from the others as the land allows
    const q = place((i, q2) => Math.min(1, ...realms.map(a => Math.hypot(a.spot.x - q2.x, a.spot.y - q2.y))) * 12 - (Math.abs(q2.x - .5) > .34 || Math.abs(q2.y - .5) > .36 ? 6 : 0), .2); if (!q) break; spots.push(q);
    const [t, kind] = WB_REALM_N[(k + rr.int(0, 5)) % WB_REALM_N.length];
    realms.push({ spot: q, d: { name: uname(() => t.replace("{A}", rr.pick(ATLAS_NA)).replace("{B}", rr.pick(ATLAS_NB))), type: "region", desc: `A ${kind} within the region.`, sections: [], kids: [], npcs: [], _pin: "a" + k } });
  }
  const towns = plan.map((type, i) => { const q = place(i2 => atlasLikes(type, T, i2), .1); if (!q) return null; spots.push(q);
    const d = WB.settlement(makeRng("wb-town", W.build.seed, i), { size: type, name: uname(() => rr.pick(WB_A) + rr.pick(WB_B)), npcs: false, places: false });
    d._pin = "t" + i; return { spot: q, d }; }).filter(Boolean);
  [...realms, ...towns].forEach(x => { atlas.pins[x.d._pin] = x.spot; });
  if (!realms.length) return towns.map(x => x.d);
  towns.forEach(x => { let best = realms[0], bd = Infinity; realms.forEach(a => { const d = Math.hypot(a.spot.x - x.spot.x, a.spot.y - x.spot.y); if (d < bd) { bd = d; best = a; } }); best.d.kids.push(x.d); });
  return realms.map(a => a.d);
}
/* the region builder's preview pins, from the draft's places */
function wbRegionPins(d) {
  const out = [], walk = x => { const q = x._pin && d.atlas.pins[x._pin]; if (q) out.push({ id: x._pin, name: x.name, icon: (WP_TYPES[x.type] || WP_TYPES.other)[0], x: q.x, y: q.y, hidden: false, area: x.type === "region", big: x.type === "city", type: x.type }); x.kids.forEach(walk); };
  d.kids.forEach(walk); return out;
}
const WB_DEFAULTS = { settlement: { size: "town", terrain: "", npcs: true, places: true }, tavern: { quality: "", npcs: true }, shop: { type: "", size: "town", level: "", npcs: true, rar: [], amount: "normal", moodIx: "" }, temple: { domain: "", size: "town", npcs: true }, dungeon: { theme: "", level: "", map: true }, region: { shape: "coast", land: "balanced", climate: "temperate", towns: "few", realms: "0", names: {} } };
/* The settlement size of the nearest village, town or city a place is in (or the place itself), or null. */
function wpSettleSize(id) { const p = id && wp(id); if (!p) return null; const hit = wpPath(p).reverse().find(x => ["village", "town", "city"].includes(x.type)); return hit ? hit.type : null; }
function wbStart(kind) { const prev = W.build; W.build = { kind, seed: newSeed(), o: { ...WB_DEFAULTS[kind], name: "" }, parent: prev ? prev.parent : (W.sel && wp(W.sel) ? W.sel : null), camp: prev ? prev.camp : W.camp }; }
function wbMapDraw() { const cv = $("#wbMapCv"); if (!cv || !W.build) return; const d = wbDraft(); if (!d.atlas) return; atlasDraw(cv, d.atlas, { picture: null, pins: wbRegionPins(d), names: d.atlas.names.filter(f => f.name), title: d.name }); }
const wbDraft = () => WB[W.build.kind](makeRng("wb", W.build.kind, W.build.seed), W.build.o);
function wbCount(d) { let p = 0, n = 0; const walk = x => { p++; n += x.npcs.length; x.kids.forEach(walk); }; walk(d); return { p, n }; }
function wbHTML() {
  const B = W.build, o = B.o, d = wbDraft(), cnt = wbCount(d), sel = (k, opts, any = "Any") => `<select data-wb="${k}" aria-label="${k}">${any ? `<option value="">${any}</option>` : ""}${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(o[k]) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  const chk = (k, l) => `<label class="check"><input type="checkbox" data-wb="${k}" ${o[k] !== false ? "checked" : ""}> ${l}</label>`;
  const f = (l, h) => `<div class="field" style="flex:1 1 160px"><label>${l}</label>${h}</div>`;
  const opts = {
    settlement: f("Size", sel("size", [["village", "Village"], ["town", "Town"], ["city", "City"]], "")) + f("Where", sel("terrain", Object.keys(WB_TERRAIN).map(k => [k, cap1(k)]))),
    tavern: f("Quality", sel("quality", Object.entries(WB_TAV_Q).map(([k, v]) => [k, v[0]]))),
    shop: f("Kind of shop", sel("type", Object.entries(SHOPS).map(([k, v]) => [k, v.label]))) + f("Settlement", sel("size", [["village", "Village"], ["town", "Town"], ["city", "City"]], "")) + f("Party level", `<input type="number" data-wb="level" min="1" max="20" value="${esc(o.level)}" placeholder="${shopLevelGuess()}" aria-label="Party level">`)
      + f("How much stock", sel("amount", [["small", "Small"], ["normal", "Normal"], ["large", "Large"]], "")) + f("Shopkeeper's manner", sel("moodIx", SHOP_MOODS.map((m, i) => [i, cap1(m[0])]), "Random"))
      + `<div class="field" style="flex:1 1 100%"><label>Magic item rarities</label><div class="wb-rar">${[["auto", "Automatic"], ...RARITY.slice(0, 5).map((n, i) => [i, n])].map(([v, l]) => `<label class="check"><input type="checkbox" data-wbrar="${v}" ${v === "auto" ? (!(o.rar || []).length ? "checked" : "") : (o.rar || []).includes(v) ? "checked" : ""}> ${esc(l)}</label>`).join("")}</div>${o.type && SHOPS[o.type] && !SHOPS[o.type].magic ? `<p class="hint wb-note">A ${esc(SHOPS[o.type].label.toLowerCase())} doesn't sell magic items, so rarity doesn't apply.</p>` : ""}</div>`,
    temple: f("God of", sel("domain", Object.keys(WB_GODS).map(k => [k, `${k} (${WB_GODS[k]})`]))) + f("Settlement", sel("size", [["village", "Village (a shrine)"], ["town", "Town"], ["city", "City (a great temple)"]], "")),
    region: f("Shape", sel("shape", Object.entries(ATLAS_SHAPES), "")) + f("Land", sel("land", Object.entries(ATLAS_LANDS), "")) + f("Climate", sel("climate", Object.entries(ATLAS_CLIMATES), ""))
      + f("Towns", sel("towns", [["none", "None"], ["few", "A few"], ["many", "Many"]], "")) + f("Kingdoms", sel("realms", [["0", "None"], ["2", "Two"], ["3", "Three"], ["4", "Four"]], "")),
    dungeon: f("Kind", sel("theme", Object.keys(WB_DUN_N).map(k => [k, cap1(k)]))) + f("Party level", `<input type="number" data-wb="level" min="1" max="20" value="${esc(o.level)}" placeholder="${shopLevelGuess()}" aria-label="Party level">`)
  }[B.kind];
  const checks = { settlement: chk("places", "Add inns, shops and a temple" + (o.size === "city" ? ", in districts" : "")) + chk("npcs", "Add NPCs who live there"), tavern: chk("npcs", "Add the innkeeper, staff and a regular"), shop: chk("npcs", "Add the shopkeeper as an NPC"), temple: chk("npcs", "Add the priest and an acolyte"), region: "", dungeon: chk("map", "Generate a map for it") }[B.kind];
  const tree = x => `<li>${wpIcon({ type: x.type })} <b>${esc(x.name)}</b> <span class="muted">${esc((WP_TYPES[x.type] || WP_TYPES.other)[1])}${x.npcs.length ? ` · ${x.npcs.length} NPC${x.npcs.length === 1 ? "" : "s"}` : ""}</span>${x.kids.length ? `<ul>${x.kids.map(tree).join("")}</ul>` : ""}</li>`;
  return `<div class="card wbuild">
    <div class="sec-h"><h3>🛠 World builder</h3></div>
    <div class="wb-kinds" role="tablist" aria-label="What to build">${Object.entries(WB_KINDS).map(([k, [ic, l]]) => `<button type="button" role="tab" class="chip${k === B.kind ? " on" : ""}" aria-selected="${k === B.kind}" data-w="wbkind" data-k="${k}">${ic} ${l}</button>`).join("")}</div>
    <div class="row" style="gap:10px;flex-wrap:wrap;margin-top:10px">${f("Name", `<input type="text" data-wb="name" value="${esc(o.name)}" placeholder="Leave empty for a random name" maxlength="80">`)}${opts}</div>
    <div class="row" style="gap:10px;flex-wrap:wrap">${f("Inside", `<select data-wb="parent">${wpOptionsHTML(B.parent, "(top level)", null).replace(/<option value="\u0001new">[^<]*<\/option>/, "")}</select>`)}${f("Add to campaign", `<select data-wb="camp"><option value="">None (just the World)</option>${Store.list().map(c => `<option value="${esc(c.id)}" ${c.id === B.camp ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>`)}</div>
    <div class="wb-checks">${checks}</div>
    <div class="wb-out">
      <h2 class="gen-title">${wpIcon({ type: d.type })} ${esc(d.name)}</h2>
      <div class="muted" style="margin-bottom:6px">${esc((WP_TYPES[d.type] || WP_TYPES.other)[1])}${B.parent && wp(B.parent) ? ` in ${esc(wp(B.parent).name)}` : ""}</div>
      ${mdHTML(d.desc)}
      ${d.sections.map(x => `<div class="lore-sec"><h4>${esc(x.t)}${x.dm ? ` <span class="tag lore-dm" title="Only for you">🔒 DM only</span>` : ""}</h4>${mdHTML(x.x)}</div>`).join("")}
      ${d.atlas ? `<div class="wb-map"><canvas id="wbMapCv" aria-label="Map of ${esc(d.name)}"></canvas></div>${d.atlas.names.length ? `<div class="field" style="margin-top:10px"><label>Names on the map</label><div class="atlas-names">${d.atlas.names.map(f => `<label class="lbl" style="margin:0">${{ mountains: "⛰ Mountains", forest: "🌲 Forest", river: "〰 River", sea: "🌊 Sea", lake: "💧 Lake" }[f.kind] || esc(f.kind)}<input type="text" data-wbname="${esc(f.id)}" value="${esc((o.names || {})[f.id] || "")}" placeholder="${esc(atlasNames(d.atlas).find(g => g.id === f.id).name)}" maxlength="60"></label>`).join("")}</div></div>` : ""}` : ""}
      ${d.map ? `<p class="muted">🗺 Comes with a generated ${esc(d.map.theme)} map (${d.map.rooms} rooms, party level ${d.map.level}).</p>` : ""}
      ${d.npcs.length ? `<h4>Who's here</h4><ul class="wb-list">${d.npcs.map(n => `<li><b>${esc(n.name)}</b> <span class="muted">· ${esc(n.race)} ${esc(n.occupation)} (${esc(n.attitude)})</span></li>`).join("")}</ul>` : ""}
      ${d.kids.length ? `<h4>Places inside</h4><ul class="wb-list">${d.kids.map(tree).join("")}</ul>` : ""}
    </div>
    <div class="row" style="justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:12px"><span class="muted" style="font-size:14px;align-self:center;flex:1 1 200px">Adds ${cnt.p} place${cnt.p === 1 ? "" : "s"}${cnt.n ? ` and ${cnt.n} NPC${cnt.n === 1 ? "" : "s"}` : ""}.</span><button class="btn" type="button" data-w="wbroll" style="flex:0 0 auto">🎲 Roll again</button><button class="btn primary" type="button" data-w="wbadd" style="flex:0 0 auto">✓ Add to World</button></div>
  </div>`;
}
function wbCommit() {
  const B = W.build; if (!B) return null; const d = wbDraft(), camp = B.camp && Store.get(B.camp), looseL = npcLoose(), pinIds = {};
  const make = (x, parent) => {
    const p = wpNew({ name: x.name.slice(0, 120), type: x.type, parent: parent || null, desc: x.desc, sections: x.sections.map(s2 => ({ ...s2 })), ...(x.shop ? { shop: x.shopFull || x.shop } : {}), ...(x.atlas ? { atlas: JSON.parse(JSON.stringify(x.atlas)) } : {}), ...(x.map ? { map: { ...x.map, id: uid("m"), saved: Date.now() } } : {}) });
    x.npcs.forEach(n => { const id = uid("n"), rec = { id, lib: "nl-" + id, name: n.name, role: `${n.race} ${n.occupation}`, attitude: { Wary: "Neutral" }[n.attitude] || n.attitude, notes: npcText(n).split("\n").slice(1).join("\n"), placeId: p.id, place: p.name };
      if (camp) { camp.npcs = camp.npcs || []; camp.npcs.push(rec); } else looseL.push(rec); });
    x.kids.forEach(k => make(k, p.id));
    if (x._pin) pinIds[x._pin] = p.id;
    return p;
  };
  const top = make(d, B.parent && wp(B.parent) ? B.parent : null);
  if (top.atlas) { const pins = {}; Object.entries(top.atlas.pins || {}).forEach(([k, q]) => { if (pinIds[k]) pins[pinIds[k]] = q; }); top.atlas.pins = pins; } // draft keys -> the new places' ids
  worldSave(); npcLooseSave(looseL);
  if (camp) wpSetCamp(top, camp, true);
  B.seed = newSeed(); B.o.name = ""; if (B.o.names) B.o.names = {};
  return top;
}
function worldGoNpc(lib, placeId) { NL.tab = placeId || ""; NL.camp = ""; NL.q = ""; if (lib) NL.open.add(lib); location.hash = "npc";
  setTimeout(() => { const r = lib && document.querySelector(`#npcLib [data-lib="${CSS.escape(lib)}"]`); if (r) { r.scrollIntoView({ block: "center" }); const i = r.querySelector('[data-nlf="name"]'); if (i) i.focus({ preventScroll: true }); } }, 60); }
(function initWorld() {
  const view = $("#view-world"); if (!view) return;
  view.addEventListener("change", async e => {
    if (e.target.id !== "wpMapFile") return; const f = e.target.files[0]; e.target.value = ""; const p = wp(W.sel); if (!f || !p) return;
    let loaded; try { loaded = await loadImageCanvas(f); } catch { toast("Couldn't open that picture. Try a PNG, JPG or WebP."); return; }
    const id = uid("img"); try { await MAPIMG.put(id, await canvasBlob(loaded.cv)); } catch { toast("Couldn't keep the picture on this computer."); return; }
    const across = clamp(Math.round(loaded.cv.width / 70), 4, 200), d = imageMapBuild({ imgId: id, name: p.name.slice(0, 60), px: loaded.cv.width / across, theme: WP_MAP_THEME[p.type] || "crypt" }, loaded.cv);
    const old = p.map; p.map = { ...imgRecord(d), id: uid("m"), saved: Date.now() }; worldSave(); if (old && old.imgId) mapImgTidy(old.imgId);
    renderWorld(); toast(`Map added to ${p.name}`);
  });
  view.addEventListener("click", async e => {
    const b = e.target.closest("[data-w]"); if (!b) return;
    const a = b.dataset.w, p = wp(W.sel);
    if (a === "sel") { W.sel = b.dataset.id; W.mode = "place"; W.open.add(W.sel); renderWorld(); const h = $("#worldMain .title-input"); if (h && window.innerWidth <= 900) $("#worldMain").scrollIntoView({ block: "start" }); }
    else if (a === "tgroup") { const t = b.dataset.t; W.openT.has(t) ? W.openT.delete(t) : W.openT.add(t); renderWorld(true); const nb = $(`#worldTree [data-w="tgroup"][data-t="${t}"]`); if (nb) nb.focus(); }
    else if (a === "build") { W.mode = "build"; if (!W.build) wbStart("settlement"); renderWorld(); const h = $("#worldMain h2"); if (h) $("#worldMain").scrollIntoView({ block: "nearest" }); }
    else if (a === "wbkind") { wbStart(b.dataset.k); renderWorld(); const nb = $(`#worldMain [data-w="wbkind"][data-k="${b.dataset.k}"]`); if (nb) nb.focus(); }
    else if (a === "wbroll") { W.build.seed = newSeed(); W.build.o.names = {}; renderWorld(); }
    else if (a === "wbadd") { const top = wbCommit(); if (top) { W.mode = "place"; W.sel = top.id; W.openT.add(top.type); W.q = ""; const q = $("#worldQ"); if (q) q.value = ""; renderWorld(); toast(`${top.name} added to your World`); } }
    else if (a === "openshop" && p && p.shop) shopOpen(p);
    else if (a === "tog") { const id = b.dataset.id; W.open.has(id) ? W.open.delete(id) : W.open.add(id); renderWorld(true); const nb = $(`#worldTree [data-w="tog"][data-id="${CSS.escape(id)}"]`); if (nb) nb.focus(); }
    else if (a === "new" || (a === "child" && p)) {
      const n = wpNew(a === "child" ? { parent: p.id, type: WP_CHILD[p.type] || "other" } : {}); worldSave(); W.mode = "place";
      if (a === "child") W.open.add(p.id); W.sel = n.id; W.q = ""; const q = $("#worldQ"); if (q) q.value = "";
      renderWorld(); const i = $("#worldMain .title-input"); if (i) { i.focus(); i.select(); }
    }
    else if (a === "del" && p) wpDelete(p);
    else if (a === "openmap" && p && p.map) wpMapOpen(p);
    else if (a === "rmmap" && p && p.map) { if (!(await confirmBox("Remove map?", `Remove the map from ${p.name}? Campaigns that saved it keep their copy.`, "Remove"))) return; const old = p.map; delete p.map; worldSave(); if (old.imgId) mapImgTidy(old.imgId); renderWorld(); toast("Map removed"); }
    else if (a === "usemap" && p && currentMap) { p.map = mapEntryNow(); worldSave(); renderWorld(); toast(`Map saved to ${p.name}`); }
    else if (a === "genmap" && p) {
      setMapForm({ ...readMapForm(), name: p.name.slice(0, 60), theme: WP_MAP_THEME[p.type] || "crypt", seed: newSeed() }); HOST.key = null;
      MAPLINK.place = p.id; location.hash = "map"; renderMap(); p.map = mapEntryNow(); worldSave(); mapPlaceFill();
      toast(`A map for ${p.name}. Press Generate Dungeon for a different one, then Save to a World place to keep it.`);
    }
    else if (a === "opennpc") worldGoNpc(b.dataset.lib, W.sel);
    else if (a === "npc" && p) {
      const id = uid("n"), n = { id, lib: "nl-" + id, name: "New NPC", role: "", attitude: "Unknown", notes: "", placeId: p.id, place: p.name }, camps = wpCamps(p.id);
      if (camps.length) camps.forEach(c => { c.npcs = c.npcs || []; c.npcs.push({ ...n, id: uid("n") }); Store.save(c); });
      else { const L = npcLoose(); L.push(n); npcLooseSave(L); }
      worldGoNpc(n.lib, p.id);
    }
  });
  view.addEventListener("input", e => {
    const t = e.target;
    if (t.id === "worldQ") { W.q = t.value; renderWorld(true); return; }
    if (t.dataset.wbname && W.build) { const v = t.value.trim().slice(0, 60), n = { ...(W.build.o.names || {}) }; if (v) n[t.dataset.wbname] = v; else delete n[t.dataset.wbname]; W.build.o.names = n; wbMapDraw(); return; }
    if (t.dataset.wb === "name") { W.build.o.name = t.value; return; }
    const p = wp(W.sel); if (!p || !t.dataset.wf || t.tagName === "SELECT") return;
    const k = t.dataset.wf; p[k] = k === "name" ? t.value.slice(0, 120) : t.value; if (k === "imgUrl" && !p.imgUrl) delete p.imgUrl;
    if (t.tagName === "TEXTAREA") autoGrow(t);
    clearTimeout(W.t); W.t = setTimeout(worldSave, 300);
  });
  view.addEventListener("change", e => {
    const t = e.target;
    if (t.id === "worldCamp") { W.camp = t.value; renderWorld(true); return; }
    if (t.name === "wview") { W.view = t.value; renderWorld(true); return; }
    if (t.dataset.wbrar) { const o = W.build.o; if (t.dataset.wbrar === "auto") o.rar = []; else { const v = +t.dataset.wbrar, set = new Set(o.rar || []); t.checked ? set.add(v) : set.delete(v); o.rar = [...set].sort((a, b) => a - b); } renderWorld(); const f = $(`#worldMain [data-wbrar="${t.dataset.wbrar}"]`); if (f) f.focus(); return; }
    if (t.dataset.wb === "parent" && (W.build.kind === "shop" || W.build.kind === "temple")) { const sz = wpSettleSize(t.value); if (sz) W.build.o.size = sz; }
    if (t.dataset.wb === "parent" || t.dataset.wb === "camp") { W.build[t.dataset.wb] = t.value || (t.dataset.wb === "parent" ? null : ""); renderWorld(); const f = $(`#worldMain [data-wb="${t.dataset.wb}"]`); if (f) f.focus(); return; }
    if (t.dataset.wb) { const o = W.build.o, k = t.dataset.wb; o[k] = t.type === "checkbox" ? t.checked : t.value; if (k === "name") return; renderWorld(); const f = $(`#worldMain [data-wb="${k}"]`); if (f) f.focus(); return; }
    const p = wp(W.sel); if (!p) return;
    if (t.dataset.wc) { const c = Store.get(t.dataset.wc); if (c) { wpSetCamp(p, c, t.checked); toast(t.checked ? `${p.name} added to “${c.name}” Lore` : `${p.name} taken out of “${c.name}”`); } renderWorld(); const cb = $(`#worldMain [data-wc="${CSS.escape(t.dataset.wc)}"]`); if (cb) cb.focus(); return; }
    if (t.hasAttribute("data-w-move")) { if (t.value) { npcLibSet(t.value, { placeId: p.id, place: p.name }); toast(`Moved to ${p.name}`); renderWorld(); } return; }
    const k = t.dataset.wf; if (!k) return;
    if (k === "type") p.type = WP_TYPES[t.value] ? t.value : "other";
    else if (k === "parent") p.parent = t.value && !wpUnder(p.id).has(t.value) ? t.value : null;
    else if (k === "name") p.name = t.value.trim().slice(0, 120) || "Unnamed place";
    else if (k === "imgUrl") { const u = t.value.trim(); if (u && !npcUrlOk(u)) { toast("Use a picture link that starts with https://"); return; } if (u) p.imgUrl = u; else delete p.imgUrl; }
    worldSave(); wpSyncOut(p);
    if (k === "desc") return;
    renderWorld(k === "name"); if (k !== "name") { const f = $(`#worldMain [data-wf="${k}"]`); if (f) f.focus(); }
  });
})();
