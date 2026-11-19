/* 11b-hoard.js: the treasure hoard generator (2026-11-19). Coins, gems, art objects and magic items for a challenge
   band, rolled with a seed so a hoard can be redrawn. The numbers and lists are the Forge's own (not the Dungeon
   Master's Guide tables, which aren't in the SRD). Magic items come from the rules data (IT.data) of the chosen
   edition. A hoard goes to a campaign's Loot list (hoardToLoot), where Give hands items to characters.
   Shown on the Items tab (#itHoard, the "Treasure hoard" button) and on the Campaign Tracker's Loot tab. */

const HOARD_TIERS = ["Challenge 0–4", "Challenge 5–10", "Challenge 11–16", "Challenge 17+"];
/* coins per band: [coin, dice, sides, multiplier] */
const HOARD_COINS = [
  [["cp", 5, 6, 100], ["sp", 4, 6, 100], ["gp", 3, 6, 10]],
  [["sp", 3, 6, 100], ["gp", 5, 6, 100], ["pp", 2, 6, 10]],
  [["gp", 4, 6, 1000], ["pp", 4, 6, 100]],
  [["gp", 10, 6, 1000], ["pp", 6, 6, 1000]],
];
/* gems or art: how many groups, and the values a group's pieces can be worth */
const HOARD_TREASURE = [
  { groups: [0, 2], values: [10, 25, 50] },
  { groups: [1, 3], values: [50, 100, 250] },
  { groups: [1, 3], values: [250, 750, 1000] },
  { groups: [2, 4], values: [1000, 2500, 5000] },
];
/* magic items: how many, and the chance of each rarity (common, uncommon, rare, very rare, legendary) */
const HOARD_MAGIC = [
  { n: [0, 2], w: [45, 48, 7, 0, 0] },
  { n: [1, 3], w: [10, 50, 32, 8, 0] },
  { n: [1, 4], w: [0, 20, 45, 30, 5] },
  { n: [2, 5], w: [0, 0, 25, 45, 30] },
];
const HOARD_GEMS = {
  10: ["Azurite", "Blue quartz", "Hematite", "Malachite", "Obsidian", "Tiger eye", "Turquoise", "Moss agate"],
  25: ["Banded agate", "Lapis lazuli", "Rhodochrosite", "Eye agate", "Smoky quartz"],
  50: ["Bloodstone", "Carnelian", "Chalcedony", "Citrine", "Jasper", "Moonstone", "Onyx", "Zircon"],
  100: ["Amber", "Amethyst", "Coral", "Garnet", "Jade", "Pearl", "Spinel", "Tourmaline"],
  250: ["Alexandrite", "Aquamarine", "Black pearl", "Peridot", "Topaz", "Violet garnet"],
  750: ["Blue spinel", "Golden yellow topaz", "Star rose quartz", "Fire opal"],
  1000: ["Black opal", "Blue sapphire", "Emerald", "Fire opal", "Star ruby"],
  2500: ["Black sapphire", "Diamond", "Jacinth", "Ruby", "Star sapphire"],
  5000: ["Flawless diamond", "Blue diamond", "Heartstone ruby", "Midnight sapphire"],
};
const HOARD_ART_THINGS = ["silver ewer", "carved bone figurine", "gold bracelet", "embroidered silk mantle", "copper chalice", "painted wooden mask", "brass mug with jade inlay", "small mirror in a painted frame",
  "ceremonial dagger", "gold locket holding a portrait", "silver comb", "carved ivory statuette", "jeweled anklet", "velvet cloak with gold thread", "obsidian bowl", "gilded music box", "embroidered tapestry",
  "jade game pieces in a lacquered box", "platinum ring", "gold crown", "jeweled sceptre", "painted icon of a forgotten saint"];
const HOARD_ART_HOW = ["engraved with a hunting scene", "set with tiny garnets", "inlaid with mother-of-pearl", "worked with dragon scales", "with a maker's mark from a lost city", "etched with runes",
  "showing a sea battle", "edged with filigree", "bearing a noble house's crest", "polished to a mirror shine"];
const HOARD = { tier: 0, seed: "", camp: "" };

function hoardRoll(tier, seed, ed) {
  tier = clamp(+tier || 0, 0, 3);
  const r = makeRng("hoard", seed, tier), d = (n, s) => { let t = 0; for (let i = 0; i < n; i++) t += r.int(1, s); return t; };
  const coins = {};
  HOARD_COINS[tier].forEach(([k, n, s, m]) => { coins[k] = d(n, s) * m; });
  const T = HOARD_TREASURE[tier], groups = [];
  for (let i = r.int(T.groups[0], T.groups[1]); i > 0; i--) {
    const v = r.pick(T.values), qty = r.int(1, v >= 1000 ? 3 : v >= 250 ? 4 : 6);
    if (r.chance(0.55)) groups.push({ kind: "gem", name: r.pick(HOARD_GEMS[v]), each: v, qty });
    else groups.push({ kind: "art", name: cap1(`${r.pick(HOARD_ART_THINGS)} ${r.pick(HOARD_ART_HOW)}`), each: v, qty: 1 });
  }
  itLoad();
  const pool = ((IT.data && IT.data[ed === "2014" ? "2014" : "2024"]) || []).filter(x => x.kind === "magic" && x.rk >= 0 && x.rk <= 4);
  const M = HOARD_MAGIC[tier], items = [], seen = new Set();
  for (let i = r.int(M.n[0], M.n[1]); i > 0; i--) {
    let roll = r.int(1, M.w.reduce((a, b) => a + b, 0)), rk = 0;
    while (roll > M.w[rk]) { roll -= M.w[rk]; rk++; }
    let list = [];
    for (let k = rk; k <= 4 && !list.length; k++) list = pool.filter(x => x.rk === k && !seen.has(x.n)); /* few commons: step up a rarity */
    for (let k = rk - 1; k >= 0 && !list.length; k--) list = pool.filter(x => x.rk === k && !seen.has(x.n));
    if (!list.length) break;
    const x = r.pick(list); seen.add(x.n); items.push(x);
  }
  return { tier, seed, ed: ed === "2014" ? "2014" : "2024", coins, groups, items };
}
const hoardCoinGp = c => (c.cp || 0) / 100 + (c.sp || 0) / 10 + (c.ep || 0) / 2 + (c.gp || 0) + (c.pp || 0) * 10;
const hoardCoinText = c => ["pp", "gp", "ep", "sp", "cp"].filter(k => c[k]).map(k => `${c[k].toLocaleString()} ${k}`).join(", ");
const hoardGroupText = g => g.kind === "gem" ? `${g.qty} × ${g.name} (${g.each.toLocaleString()} gp each)` : `${g.name}`;
function hoardTotalGp(H) { return hoardCoinGp(H.coins) + H.groups.reduce((t, g) => t + g.each * g.qty, 0); }

/* the hoard as a card; `where` is "items" (pick a campaign) or "tracker" (this campaign) */
const hoardCamp = () => { const L = Store.list(); if (!L.some(c => c.id === HOARD.camp)) HOARD.camp = (L[0] || {}).id || ""; return HOARD.camp; };
/* the band for an encounter: its toughest monster's challenge, or its level when it has no monsters yet */
const hoardEncTier = e => { const crs = (e.enemies || []).map(m => +m.cr || 0); return tierOf(crs.length ? Math.max(...crs) : +e.level || 1); };
const hoardEncs = c => (c && c.encounters) || [];
function hoardHTML(H, where) {
  if (where === "items") hoardCamp();
  const camps = Store.list(), camp = where === "items" ? Store.get(HOARD.camp) : curCamp(), encs = hoardEncs(camp);
  const magic = H.items.length ? `<ul class="plain hoard-list">${H.items.map(x => `<li><b>${esc(x.n)}</b> <span class="tag rar-${R_CLASS[x.rk] || "v"}">${esc(RARITY[x.rk] || "")}</span> <span class="muted">${esc(x.cat)}${x.att ? " · attunement" : ""} · ${esc(x.c || "")}</span></li>`).join("")}</ul>` : `<p class="muted">No magic items this time.</p>`;
  const canAdd = where === "tracker" || camps.length;
  return `<div class="hoard-top"><h3>💰 Treasure hoard</h3>${where === "items" ? `<button class="icon-btn" type="button" data-hoard="close" title="Close" aria-label="Close the hoard">✕</button>` : ""}</div>
    <div class="hoard-ctl"><select data-hoard="tier" aria-label="Challenge of the creatures guarding it">${HOARD_TIERS.map((t, i) => `<option value="${i}" ${H.tier === i ? "selected" : ""}>${t}</option>`).join("")}</select>
      <button class="btn sm" type="button" data-hoard="roll">🎲 Roll again</button></div>
    <p class="hint" style="margin:6px 0 10px">${H.ed} rules · worth about <b>${Math.round(hoardTotalGp(H)).toLocaleString()} gp</b> before magic items.</p>
    <div class="hoard-grid">
      <div><div class="prep-h">Coins</div><p style="margin:0">${esc(hoardCoinText(H.coins)) || "None"}</p></div>
      <div><div class="prep-h">Gems and art</div>${H.groups.length ? `<ul class="plain hoard-list">${H.groups.map(g => `<li>${esc(hoardGroupText(g))}${g.kind === "art" ? ` <span class="muted">(${g.each.toLocaleString()} gp)</span>` : ""}</li>`).join("")}</ul>` : `<p class="muted" style="margin:0">None this time.</p>`}</div>
    </div>
    <div class="prep-h">Magic items</div>${magic}
    <div class="hoard-dest">
      ${where === "items" ? (camps.length ? `<label>Campaign<select data-hoard="camp">${camps.map(c => `<option value="${esc(c.id)}" ${c.id === HOARD.camp ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>` : `<p class="muted" style="margin:0">Make a campaign in the Campaign Tracker to keep hoards in its Loot.</p>`) : ""}
      ${canAdd && encs.length ? `<label><span>Encounter <span class="muted">(optional)</span></span><select data-hoard="enc"><option value="">None</option>${encs.map(e => `<option value="${esc(e.id)}" ${H.enc === e.id ? "selected" : ""}>${esc(e.name || "Encounter")}${e.status === "Done" ? " (done)" : ""}</option>`).join("")}</select></label>` : ""}
    </div>
    <div class="hoard-acts">${canAdd ? `<button class="btn primary sm" type="button" data-hoard="loot">+ Add to ${where === "items" ? "campaign" : "this campaign's"} Loot</button>` : ""}<button class="btn sm" type="button" data-hoard="copy">Copy as text</button></div>`;
}
function hoardText(H) {
  return [`Treasure hoard (${HOARD_TIERS[H.tier]})`, `Coins: ${hoardCoinText(H.coins) || "none"}`, ...H.groups.map(g => `${hoardGroupText(g)}${g.kind === "art" ? ` (${g.each} gp)` : ""}`),
    ...H.items.map(x => `${x.n} (${RARITY[x.rk]}${x.att ? ", requires attunement" : ""})`)].join("\n");
}
/* one Loot entry for the coins, one per gem or art group, one per magic item */
function hoardToLoot(c, H) {
  c.loot = c.loot || [];
  const e = H.enc && hoardEncs(c).find(x => x.id === H.enc), from = e ? `From ${e.name || "an encounter"}` : "";
  const add = (item, value, notes) => c.loot.push({ id: uid("l"), item, holder: "", value, notes: [from, notes].filter(Boolean).join(": "), ...(e ? { encId: e.id } : {}) });
  if (e) { const line = [hoardCoinText(H.coins) && `Coins ${hoardCoinText(H.coins)}`, H.groups.length && `${H.groups.length} gem or art ${H.groups.length === 1 ? "lot" : "lots"}`, ...H.items.map(x => x.n)].filter(Boolean).join("; ");
    e.treasure = [e.treasure, line].filter(Boolean).join("\n"); }
  if (hoardCoinText(H.coins)) add(`Coins: ${hoardCoinText(H.coins)}`, `${Math.round(hoardCoinGp(H.coins)).toLocaleString()} gp`, e ? "" : "From a treasure hoard");
  H.groups.forEach(g => add(hoardGroupText(g), `${(g.each * g.qty).toLocaleString()} gp`, g.kind === "art" ? "Art object" : "Gems"));
  H.items.forEach(x => add(x.n, x.c || "", `${RARITY[x.rk] || ""} ${x.cat || ""}${x.att ? ", requires attunement" : ""}`.trim()));
  Store.save(c);
  return 1 + H.groups.length + H.items.length;
}

/* ---- the Items tab panel ---- */
function hoardItemsRender() {
  const box = $("#itHoard"); if (!box) return;
  if (!HOARD.H) { box.hidden = true; box.innerHTML = ""; return; }
  box.hidden = false; box.innerHTML = hoardHTML(HOARD.H, "items");
}
/* pick (or clear) the encounter a hoard is for; its band follows the encounter's toughest monster */
function hoardForEnc(H, camp, encId, ed) {
  const e = encId && hoardEncs(camp).find(x => x.id === encId);
  if (!e) return { ...H, enc: "" };
  const tier = hoardEncTier(e);
  return { ...(tier === H.tier ? H : hoardRoll(tier, newSeed(), ed || H.ed)), enc: e.id, ...(H.camp ? { camp: H.camp } : {}) };
}
function hoardNew(tier) { HOARD.H = hoardRoll(tier, newSeed(), IT.ed); return HOARD.H; } /* the Items tab's rules edition */
async function hoardAct(e, where) {
  const b = e.target.closest("[data-hoard]"); if (!b || b.tagName === "SELECT") return false;
  const k = b.dataset.hoard, H = where === "tracker" ? HOARD.T : HOARD.H; if (!H) return true;
  const redraw = () => where === "tracker" ? renderTracker() : hoardItemsRender();
  if (k === "roll") { const n = { ...hoardRoll(H.tier, newSeed(), where === "tracker" ? H.ed : IT.ed), enc: H.enc || "" }; if (where === "tracker") HOARD.T = { ...n, camp: activeId }; else HOARD.H = n; redraw(); }
  else if (k === "close") { if (where === "tracker") HOARD.T = null; else HOARD.H = null; redraw(); }
  else if (k === "copy") { try { await navigator.clipboard.writeText(hoardText(H)); toast("Hoard copied"); } catch { toast("Couldn't copy here"); } }
  else if (k === "loot") {
    const c = where === "tracker" ? curCamp() : Store.get(hoardCamp()); if (!c) { toast("Pick a campaign first"); return true; }
    const n = hoardToLoot(c, H); toast(`${n} ${n === 1 ? "entry" : "entries"} added to ${c.name}'s Loot`);
    if (where === "tracker") { HOARD.T = null; redraw(); }
  }
  return true;
}
(function initHoard() {
  const btn = $("#itHoardBtn"); if (!btn) return;
  btn.addEventListener("click", () => { HOARD.camp = HOARD.camp || activeId || ""; hoardNew(HOARD.tier); hoardItemsRender(); const b = $("#itHoard"); if (b) b.scrollIntoView({ block: "nearest" }); });
  const box = $("#itHoard");
  box.addEventListener("click", e => { hoardAct(e, "items"); });
  box.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.hoard === "tier") { const enc = HOARD.H && HOARD.H.enc; HOARD.tier = +t.value; hoardNew(HOARD.tier); HOARD.H.enc = enc || ""; hoardItemsRender(); }
    else if (t.dataset.hoard === "camp") { HOARD.camp = t.value; if (HOARD.H) HOARD.H.enc = ""; hoardItemsRender(); }
    else if (t.dataset.hoard === "enc") { HOARD.H = hoardForEnc(HOARD.H, Store.get(hoardCamp()), t.value, IT.ed); hoardItemsRender(); }
  });
})();

/* ---- the Campaign Tracker's Loot tab: a hoard for this campaign's level, added straight to its Loot ---- */
(function initTrackerHoard() {
  if (typeof campMain === "undefined") return;
  campMain.addEventListener("click", e => {
    const eb = e.target.closest('[data-ea="hoard"]');
    if (eb) { const c = curCamp(), en = c && hoardEncs(c).find(x => x.id === eb.dataset.eid); if (!en) return; HOARD.T = { ...hoardRoll(hoardEncTier(en), newSeed(), IT.ed || "2024"), camp: activeId, enc: en.id }; subTab = "loot"; renderTracker(); const h = document.querySelector("#campMain .hoard"); if (h) h.scrollIntoView({ block: "nearest" }); return; }
    if (e.target.closest("[data-hoardopen]")) { const c = curCamp(); HOARD.T = hoardRoll(tierOf(+(c && c.currentLevel) || 1), newSeed(), IT.ed || "2024"); HOARD.T.camp = activeId; renderTracker(); return; }
    if (e.target.closest(".hoard [data-hoard]")) hoardAct(e, "tracker");
  });
  campMain.addEventListener("change", e => {
    const t = e.target; if (!t.closest(".hoard") || !HOARD.T) return;
    if (t.dataset.hoard === "tier") { HOARD.T = { ...hoardRoll(+t.value, newSeed(), HOARD.T.ed), camp: activeId, enc: HOARD.T.enc || "" }; renderTracker(); }
    else if (t.dataset.hoard === "enc") { HOARD.T = { ...hoardForEnc(HOARD.T, curCamp(), t.value, HOARD.T.ed), camp: activeId }; renderTracker(); }
  });
})();
