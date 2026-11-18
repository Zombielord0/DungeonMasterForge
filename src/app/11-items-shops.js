/* 11-items-shops.js: Items tab and shops. */

/* ======================= Items (SRD 5.1 / 5.2) ======================= */
const RARITY = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact"];
const R_VALUE = [100, 400, 4000, 40000, 200000, null];
const R_RANGE14 = ["50–100 gp", "101–500 gp", "501–5,000 gp", "5,001–50,000 gp", "50,001+ gp", "priceless"];
const R_LEVEL = ["any level", "any level", "level 5 and up", "level 11 and up", "level 17 and up", "any level"];
const R_CLASS = ["c", "u", "r", "vr", "l", "a"];
const IT = { data: null, ed: "2024", mode: "all", rar: new Set(), open: new Set(), custom: [], updated: 0, target: undefined, draft: null };
const IT_KEY = "dmforge.items.v1";
let itemsRemote = null, itTimer = null, itRT = null;
function fmtGp(v) {
  if (v === null || v === undefined) return "—";
  if (v >= 1) return (Math.round(v * 100) / 100).toLocaleString() + " gp";
  if (v >= 0.1) return Math.round(v * 10) + " sp";
  return Math.round(v * 100) + " cp";
}
function magicPrice(m) {
  if (m.rk === 5) return { gp: null, text: "Priceless (artifact)" };
  if (m.rk < 0) return { gp: null, text: "Varies by version" };
  let v = R_VALUE[m.rk]; if (m.cons) v /= 2;
  return { gp: v, text: fmtGp(v) + (m.base ? " + base item" : "") };
}
const rarName = x => x.rk >= 0 ? RARITY[x.rk] : (x.r || "Rarity varies");
function itLoad() {
  if (IT.data) return;
  const raw = dmData("itemData");
  IT.data = {};
  for (const ed of Object.keys(raw)) {
    const L = [];
    raw[ed].eq.forEach((e, i) => L.push({ id: `${ed}-g${i}`, kind: "gear", n: e.n, cat: e.cat, g: e.g, c: e.c, gp: e.gp, w: e.w, st: e.st, d: e.d, rk: -2 }));
    raw[ed].mi.forEach((m, i) => { const p = magicPrice(m); L.push({ id: `${ed}-m${i}`, kind: "magic", n: m.n, cat: m.cat, type: m.type, r: m.r, rk: m.rk, att: m.att, cons: m.cons, base: m.base, c: p.text, gp: p.gp, st: [], d: m.d }); });
    L.forEach(x => { x.hay = x.n.toLowerCase(); x.hayD = (x.n + " " + x.cat + " " + (x.type || "") + " " + x.d).toLowerCase(); });
    IT.data[ed] = L;
  }
  const all = Object.values(IT.data).flat();
  [...new Set(all.filter(x => x.kind === "gear").map(x => x.g))].sort().forEach(g => $("#itGroup").insertAdjacentHTML("beforeend", `<option>${esc(g)}</option>`));
  [...new Set(all.filter(x => x.kind === "magic").map(x => x.cat))].sort().forEach(g => $("#itMType").insertAdjacentHTML("beforeend", `<option>${esc(g)}</option>`));
}
const itemsGear = () => (itLoad(), IT.data[IT.ed].filter(x => x.kind === "gear"));
function itCustomList() { return IT.custom.map(x => Object.assign(x, { hay: String(x.n).toLowerCase(), hayD: (x.n + " " + x.cat + " " + (x.type || "") + " " + x.d).toLowerCase() })); }
function itFind(id) { itLoad(); if (/^20(14|24)-/.test(id)) return IT.data[id.slice(0, 4)].find(x => x.id === id); return itCustomList().find(x => x.id === id); }
function itPersist() {
  IT.updated = Date.now();
  const blob = { list: IT.custom.map(({ hay, hayD, ...x }) => x), updated: IT.updated };
  try { localStorage.setItem(IT_KEY, JSON.stringify(blob)); } catch { }
  Cloud.touch("items");
  clearTimeout(itTimer);
  itTimer = setTimeout(async () => { if (Store.mode === "db" && Store.col && !Store.readOnly) { try { await Store.col.doc("items").set(JSON.parse(JSON.stringify(blob))); } catch { } } }, 700);
}
function itRestore() { try { const d = JSON.parse(localStorage.getItem(IT_KEY) || "null"); if (d && Array.isArray(d.list)) { IT.custom = d.list; IT.updated = d.updated || 0; } } catch { } }
function itemsAdopt() {
  if (itemsRemote && Array.isArray(itemsRemote.list) && (itemsRemote.updated || 0) > IT.updated) {
    IT.custom = itemsRemote.list; IT.updated = itemsRemote.updated;
    try { localStorage.setItem(IT_KEY, JSON.stringify(itemsRemote)); } catch { }
    if (location.hash === "#items") renderItems();
  } else if (Store.mode === "db" && IT.custom.length) itPersist();
}
function itFiltered() {
  const words = $("#itQ").value.trim().toLowerCase().split(/\s+/).filter(Boolean), inD = $("#itInDesc").checked;
  const grp = IT.mode === "magic" || IT.mode === "custom" ? "" : $("#itGroup").value;
  const mt = IT.mode === "gear" ? "" : $("#itMType").value, att = IT.mode === "gear" ? "" : $("#itAtt").value;
  const rar = IT.mode === "gear" ? new Set() : IT.rar, max = parseFloat($("#itMax").value);
  const base = IT.data[IT.ed];
  let list = IT.mode === "custom" ? itCustomList() : IT.mode === "gear" ? base.filter(x => x.kind === "gear") : IT.mode === "magic" ? base.filter(x => x.kind === "magic") : base.concat(itCustomList());
  const magicF = mt || rar.size || att;
  list = list.filter(x => {
    if (words.length && !words.every(w => (inD ? x.hayD : x.hay).includes(w))) return false;
    if (grp && (x.kind !== "gear" || x.g !== grp)) return false;
    if (magicF && x.kind === "gear") return false;
    if (mt && x.cat !== mt) return false;
    if (rar.size && !rar.has(x.rk)) return false;
    if (att === "1" && !x.att) return false;
    if (att === "0" && x.att) return false;
    if (!isNaN(max) && (x.gp === null || x.gp === undefined || x.gp > max)) return false;
    return true;
  });
  const s = $("#itSort").value, byName = (a, b) => a.n.localeCompare(b.n);
  const P = (x, hi) => x.gp === null || x.gp === undefined ? (hi ? -1 : Infinity) : x.gp;
  list.sort(s === "price" ? (a, b) => P(a) - P(b) || byName(a, b) : s === "price-d" ? (a, b) => P(b, 1) - P(a, 1) || byName(a, b) : s === "rarity" ? (a, b) => a.rk - b.rk || byName(a, b) : byName);
  return list;
}
function itTypeLine(x) {
  return `${x.type || x.cat}${x.kind !== "gear" ? ", " + rarName(x).toLowerCase() : ""}${x.att ? ` (requires attunement${x.att.replace(/^Required/, "")})` : ""}`;
}
function itStats(x) {
  const st = [];
  if (x.kind !== "gear") st.push(["Rarity", rarName(x)]);
  (x.st || []).forEach(s => st.push(s));
  if (x.kind !== "gear") st.push(["Attunement", x.att ? "Required" + x.att.replace(/^Required/, "") : "Not required"]);
  st.push([x.kind === "gear" ? "Cost" : "Price", x.c]);
  if (x.w) st.push(["Weight", x.w + " lb"]);
  return st;
}
function itPriceNote(x) {
  if (x.kind === "gear") return "";
  if (x.rk === 5) return "Artifacts are priceless and can't be bought.";
  if (x.rk < 0) return "This entry covers several versions of the item. Price each version by its own rarity: common 100 gp, uncommon 400 gp, rare 4,000 gp, very rare 40,000 gp, legendary 200,000 gp (halved for consumables).";
  let s = `Price is the 2024 Dungeon Master's Guide value for a ${RARITY[x.rk].toLowerCase()} item`;
  if (x.cons) s += ", halved because the item is used up";
  if (x.base) s += ", plus the cost of the armor, weapon or ammunition it is made from";
  s += `. The 2014 guide gives a range of ${R_RANGE14[x.rk]}. Suitable for characters of ${R_LEVEL[x.rk]}.`;
  if (/Spell Scroll/.test(x.n)) s += " In the 2024 rules a spell scroll is worth twice what it costs to scribe, so treat this as a rough guide.";
  return s;
}
function itRow(x) {
  const open = IT.open.has(x.id);
  const rar = x.kind === "gear" ? "" : `<span class="tag rar-${R_CLASS[x.rk] || "v"}">${esc(rarName(x))}</span>`;
  return `<div class="sp-row it-row ${x.kind === "gear" ? "it-gear" : "it-r-" + (R_CLASS[x.rk] || "v")} ${open ? "open" : ""}" data-id="${esc(x.id)}">
    <div class="sp-head it-head" data-it="toggle" data-id="${esc(x.id)}" role="button" tabindex="0" aria-expanded="${open}">
      <b class="sp-name">${esc(x.n)}</b>
      <span class="sp-meta hide-sm">${esc(x.cat)}</span>
      <span class="sp-meta it-cost">${esc(x.c)}</span>
      <span class="sp-tags">${x.att ? `<span class="tag" title="Requires attunement">A</span>` : ""}${x.cons ? `<span class="tag hide-sm" title="Consumable">1×</span>` : ""}${x.kind === "custom" ? `<span class="tag gold" title="Your custom item">✎</span>` : ""}${rar}</span>
    </div>${open ? itDetail(x) : ""}</div>`;
}
function itCanBase(x) { return x.kind === "gear" && (x.g === "Weapons" || x.g === "Armor" || x.cat === "Ammunition"); }
function itDetail(x) {
  const note = itPriceNote(x);
  return `<div class="sp-detail">
    <div class="muted"><i>${esc(itTypeLine(x))}</i></div>
    <div class="sp-stats">${itStats(x).map(([k, v]) => `<div><span>${esc(k)}</span>${esc(v)}</div>`).join("")}</div>
    ${spFormat(x.d || "")}
    ${note ? `<p class="hint">${esc(note)}</p>` : ""}
    <div class="actions"><button class="btn sm" data-it="card" data-id="${esc(x.id)}">🂠 Export item card</button><button class="btn sm" data-it="copy" data-id="${esc(x.id)}">Copy</button><button class="btn sm primary" data-it="give" data-id="${esc(x.id)}">+ Give to character</button>${x.gp !== null && x.gp !== undefined ? `<button class="btn sm" data-it="buy" data-id="${esc(x.id)}" title="Take the price from the character's coins">🪙 Buy (${esc(fmtGp(+x.gp))})</button>` : ""}<button class="btn sm" data-it="loot" data-id="${esc(x.id)}">+ Campaign loot</button>${x.kind === "custom" ? `<button class="btn sm" data-it="edit" data-id="${esc(x.id)}">✎ Edit</button><button class="btn sm danger" data-it="del" data-id="${esc(x.id)}">✕ Delete</button>` : itCanBase(x) ? `<button class="btn sm" data-it="clone" data-id="${esc(x.id)}">✚ Make a magic version</button>` : ""}</div>
  </div>`;
}
function itText(x) {
  return `${x.n}\n${itTypeLine(x)}\n${itStats(x).map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${String(x.d || "").replace(/\*\*/g, "")}`;
}
function renderItTargets() {
  const row = $("#itTargetRow"), chars = PCS.roster;
  if (IT.target === undefined || !chars.some(c => c.id === IT.target)) IT.target = chars[0] ? chars[0].id : "";
  row.innerHTML = `${chars.length ? "" : `<span class="hint" style="flex-basis:100%;margin:0">No characters to give items to yet. <a href="#character">Make one on the Characters tab</a> and save it to My characters.</span>`}<span>Give items to</span><select id="itTarget" aria-label="Character">${chars.length ? chars.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("") : `<option value="">No saved characters yet</option>`}</select><span>Loot for</span><select id="itCamp" class="campSelect" aria-label="Campaign"></select>`;
  $("#itTarget").value = IT.target || "";
  renderCampList();
}
/* ======================= Shops =======================
   shopMake picks a shop's stock from the item lists for its kind, settlement size and the party's level, with the shopkeeper's prices. Same seed, same shop. */
const SHOPS = {
  general: { label: "General store", nouns: ["Lantern", "Wagon", "Barrel", "Coin", "Rope", "Kettle"], gear: x => (x.g === "Adventuring Gear" || x.g === "Tools") && !/mount|vehicle/i.test(x.cat), magic: null, count: [8, 14, 22] },
  smith: { label: "Blacksmith & armorer", nouns: ["Anvil", "Hammer", "Forge", "Tongs", "Shield", "Bellows"], gear: x => x.g === "Weapons" || x.g === "Armor", magic: x => /Weapon|Armor/.test(x.cat), count: [6, 10, 16] },
  bowyer: { label: "Bowyer & fletcher", nouns: ["Arrow", "Fletch", "Quiver", "Stag", "Yew", "Hawk"], gear: x => /bow|arrow|bolt|sling|dart|javelin|quiver|net|blowgun|needle/i.test(x.n) && (x.g === "Weapons" || x.g === "Adventuring Gear"), magic: x => /bow|arrow|bolt|ammunition/i.test(x.n + " " + x.cat), count: [4, 7, 10] },
  alchemist: { label: "Alchemist & herbalist", nouns: ["Cauldron", "Mortar", "Flask", "Toad", "Mandrake", "Ember"], gear: x => /potion|acid|antitoxin|alchemist|healer|herbal|poison|vial|flask|oil|perfume/i.test(x.n), magic: x => /Potion/.test(x.cat), count: [4, 8, 12] },
  magic: { label: "Magic shop", nouns: ["Wand", "Owl", "Star", "Grimoire", "Moon", "Crystal"], gear: x => /component pouch|arcane focus|spellbook|crystal|orb|wand|rod|staff|ink|parchment|scroll case|druidic focus|holy symbol/i.test(x.n), magic: x => true, count: [3, 6, 10], magicShare: .75 },
  temple: { label: "Temple & healer", nouns: ["Lamp", "Chalice", "Dove", "Candle", "Halo", "Bell"], gear: x => /holy|healer|incense|candle|vestment|amulet|emblem|reliquary|antitoxin|healing/i.test(x.n), magic: x => /Potion|Scroll/.test(x.cat) && /heal|protect|restor|bless|ward|cure|resist/i.test(x.n + " " + x.cat), count: [3, 6, 9] }
};
const SHOP_ADJ = ["Gilded", "Crooked", "Silver", "Rusty", "Laughing", "Copper", "Old", "Wandering", "Hidden", "Black", "Lucky", "Sleeping"];
const SHOP_MOODS = [["haggles hard and loves every minute of it", 1.15], ["fair and friendly", 1], ["gruff but honest", 1.05], ["desperate to sell before the rent is due", .85], ["greedy, all smiles", 1.25], ["old and forgetful, so prices wander", 0]];
function shopNiceGp(v) { return v >= 20 ? Math.round(v) : v >= 1 ? Math.round(v * 10) / 10 : Math.max(.01, Math.round(v * 100) / 100); }
const SHOP_AMOUNT = { small: .5, normal: 1, large: 1.5 };
/* rar: rarity ranks to stock (missing = Automatic); amount: small|normal|large; moodIx: index into SHOP_MOODS (missing = random).
   With none of them set, the random calls are exactly as before, so older saved shops keep their stock. */
function shopMake({ type, size, level, seed, ed, rar, amount, moodIx }) {
  itLoad();
  const rarOn = Array.isArray(rar) && rar.length > 0, amtOn = !!SHOP_AMOUNT[amount] && amount !== "normal", moodOn = Number.isInteger(+moodIx) && moodIx !== "" && moodIx !== null && moodIx !== undefined && SHOP_MOODS[+moodIx];
  const key = ["shop", seed, type, size, level, ed]; if (rarOn) key.push("r" + rar.join(".")); if (amtOn) key.push("a" + amount); if (moodOn) key.push("m" + (+moodIx));
  const S = SHOPS[type] || SHOPS.general, r = makeRng(...key), lv = clamp(level || 1, 1, 20), si = { village: 0, town: 1, city: 2 }[size] ?? 1;
  const maxRk = si === 0 ? 1 : si === 1 ? (lv >= 5 ? 2 : 1) : (lv >= 11 ? 3 : 2);
  const all = IT.data[ed] || IT.data["2024"], priced = x => x.gp !== null && x.gp !== undefined && +x.gp > 0;
  const total = amtOn ? Math.max(1, Math.round(S.count[si] * SHOP_AMOUNT[amount])) : S.count[si];
  let nMagic = !S.magic ? 0 : S.magicShare ? Math.round(total * S.magicShare) : [0, r.int(0, 1), r.int(1, 3)][si];
  if (rarOn && S.magic) nMagic = Math.max(nMagic, 2);
  const rkOk = x => rarOn ? rar.includes(x.rk) : x.rk >= 0 && x.rk <= maxRk;
  const magicPool = S.magic ? r.shuffle(all.filter(x => x.kind === "magic" && rkOk(x) && priced(x) && S.magic(x))) : [];
  const gearPool = r.shuffle(all.filter(x => x.kind === "gear" && priced(x) && S.gear(x)));
  nMagic = Math.min(nMagic, total, magicPool.length);
  const picks = [...gearPool.slice(0, total - nMagic), ...magicPool.slice(0, nMagic)];
  const mi = moodOn ? +moodIx : null, mood = moodOn ? SHOP_MOODS[mi] : r.pick(SHOP_MOODS);
  const stock = picks.map(x => {
    const k = mood[1] || (0.8 + r.f() * 0.4), gp = shopNiceGp(+x.gp * k);
    const qty = x.kind === "magic" ? 1 : x.g === "Weapons" || x.g === "Armor" ? r.int(1, 3) : r.int(2, 10);
    return { id: x.id, n: x.n, cat: x.cat, g: x.g || "", kind: x.kind, rk: x.rk, r: x.r, att: !!x.att, w: x.w || 0, gp, c: fmtGp(gp), qty };
  }).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "gear" ? -1 : 1) || a.n.localeCompare(b.n));
  const out = { seed, type, size, level: lv, ed, name: `The ${r.pick(SHOP_ADJ)} ${r.pick(S.nouns)}`, label: S.label, keeper: fullName(r, r.pick(["male", "female"])), mood: mood[0], stock };
  out.moodIx = SHOP_MOODS.indexOf(mood); if (rarOn) out.rar = rar.slice(); if (amtOn) out.amount = amount;
  return out;
}
function shopLevelGuess() { const lv = PCS.roster.map(c => totalLv(c)).filter(Boolean); return lv.length ? Math.max(...lv) : 3; }
/* Saved shops (2026-11-17): a World place keeps the whole shop in p.shop, with stock, markup and the DM's own prices.
   IT.shop is that same object while it's open; IT.shopPlace is the place's id. */
function shopPrice(s, x) { return x.own > 0 ? x.own : shopNiceGp(x.gp * (1 + (+s.markup || 0) / 100)); }
function shopSaleText(s) {
  const st = (s.stock || []).filter(x => x.qty > 0);
  return st.length ? st.slice(0, 24).map(x => `- ${x.n}: ${fmtGp(shopPrice(s, x))}${x.kind === "magic" ? " (magic)" : ""}`).join("\n") + (st.length > 24 ? `\n- …and ${st.length - 24} more` : "") : "Nothing on the shelves today.";
}
function shopEnsure(p) {
  const s = p.shop;
  if (!Array.isArray(s.stock)) {
    Object.assign(s, shopMake(s), { markup: 0 });
    const sec = (p.sections || []).find(x => x.t === "For sale"), txt = shopSaleText(s);
    if (sec && sec.x === txt) { sec.auto = true; s.sale = txt; }
  }
  return s;
}
function shopSave() {
  const p = wp(IT.shopPlace); if (!p || p.shop !== IT.shop) return;
  const sec = (p.sections || []).find(x => x.auto && x.t === "For sale");
  if (sec && sec.x === p.shop.sale) { sec.x = p.shop.sale = shopSaleText(p.shop); }
  worldSave(); wpSyncOut(p);
}
function shopOpen(p) {
  IT.shop = shopEnsure(p); IT.shopPlace = p.id; worldSave();
  location.hash = "items"; setTimeout(() => { shopRender(); $("#itShop").scrollIntoView({ block: "start" }); }, 80);
}
function shopRestock(s) {
  const n = shopMake({ type: s.type, size: s.size, level: s.level, ed: s.ed, rar: s.rar, amount: s.amount, moodIx: s.moodIx, seed: newSeed() });
  const own = new Map(s.stock.filter(x => x.own > 0).map(x => [x.id, x.own]));
  s.stock = n.stock.map(x => own.has(x.id) ? { ...x, own: own.get(x.id) } : x); s.seed = n.seed;
}
function shopRowPrice(s, x, i) { return `<input type="number" class="shop-price" min="0" step="any" data-shopown="${i}" value="${shopPrice(s, x)}" aria-label="Price of ${esc(x.n)} in gp" title="Type your own price; empty it to use the markup price"> gp${x.own > 0 ? ` <span class="shop-own" title="Your own price">✎</span>` : ""}`; }
function shopRender() {
  const s = IT.shop, el = $("#itShop"); if (!s) { el.hidden = true; return; } el.hidden = false;
  el.innerHTML = `<div class="sec-h"><h3>🏪 ${esc(s.name)}</h3><span class="muted" style="font-size:14px;margin-left:8px">${esc(s.label)}</span><span class="sp"></span><button class="icon-btn" type="button" id="shopClose" title="Close the shop">✕</button></div>
    <p style="margin:4px 0 10px"><b>${esc(s.keeper)}</b> runs the place: ${esc(s.mood)}.</p>
    <div class="field row" style="align-items:end">
      <div style="max-width:140px"><label for="shopMarkup">Markup %</label><input type="number" id="shopMarkup" min="-90" max="500" step="1" value="${+s.markup || 0}" title="Raise or lower every price, for example 20 or -10"></div>
      <div style="flex:0 0 auto"><button class="btn sm" type="button" id="shopRestock" title="Sold-out items come back and the stock is rolled again">🔄 Restock</button></div>
      <div style="flex:0 0 auto"><button class="btn sm" type="button" id="shopWorld">Edit in the World</button></div>
    </div>
    ${s.stock.length ? `<table class="shop-tbl"><thead><tr><th>Item</th><th>Price</th><th>In stock</th><th></th></tr></thead><tbody>${s.stock.map((x, i) => `<tr class="${x.qty ? "" : "sold"}"><td>${esc(x.n)}${x.kind === "magic" ? ` <span class="tag">${esc(rarName(x))}</span>` : ""}</td><td>${shopRowPrice(s, x, i)}</td><td>${x.qty}</td><td><button class="btn sm" type="button" data-shopbuy="${i}" ${x.qty ? "" : "disabled"}>Buy</button></td></tr>`).join("")}</tbody></table>`
      : `<p class="muted">Nothing on the shelves today. Press Restock, or make a shop with more stock in the World builder.</p>`}
    <p class="hint" style="margin:8px 0 0">Buy pays from the coins of the character chosen in “Give items to” below, and puts the item in their inventory. Type in a price to set your own; empty it to go back to the markup price.</p>`;
}
$("#itShopBtn").addEventListener("click", () => { wbStart("shop"); W.mode = "build"; location.hash = "world"; });
$("#itShop").addEventListener("input", e => {
  const s = IT.shop; if (!s || e.target.id !== "shopMarkup") return;
  const v = parseFloat(e.target.value); s.markup = isNaN(v) ? 0 : clamp(Math.round(v), -90, 500);
  s.stock.forEach((x, i) => { const f = $(`#itShop [data-shopown="${i}"]`); if (f && !(x.own > 0)) f.value = shopPrice(s, x); });
  clearTimeout(IT.shopT); IT.shopT = setTimeout(shopSave, 300);
});
$("#itShop").addEventListener("change", e => {
  const s = IT.shop; if (!s) return;
  if (e.target.id === "shopMarkup") { e.target.value = +s.markup || 0; clearTimeout(IT.shopT); shopSave(); return; }
  const f = e.target.closest("[data-shopown]"); if (!f) return;
  const x = s.stock[+f.dataset.shopown]; if (!x) return; const v = parseFloat(f.value);
  if (v > 0) x.own = Math.round(v * 100) / 100; else delete x.own;
  f.parentElement.innerHTML = shopRowPrice(s, x, +f.dataset.shopown); shopSave();
});
$("#itShop").addEventListener("click", async e => {
  if (e.target.id === "shopClose") { IT.shop = null; IT.shopPlace = null; shopRender(); return; }
  if (e.target.id === "shopWorld") { W.sel = IT.shopPlace; W.mode = "place"; location.hash = "world"; return; }
  if (e.target.id === "shopRestock") { if (!(await confirmBox("Restock?", "Sold-out items come back and the stock is rolled again.", "Restock"))) return; shopRestock(IT.shop); shopSave(); shopRender(); return; }
  const b = e.target.closest("[data-shopbuy]"); if (!b) return;
  const s = IT.shop, x = s.stock[+b.dataset.shopbuy], c = PCS.roster.find(r => r.id === ($("#itTarget") || {}).value); if (!x || !x.qty) return;
  const before = c ? JSON.stringify(c.coins || {}) : ""; itBuy({ ...x, gp: shopPrice(s, x) });
  if (c && JSON.stringify(c.coins || {}) !== before) { x.qty--; shopSave(); shopRender(); }
});
/* Phones fold the Items filters behind a Filters button, as the Spells tab does. */
function itFiltersSync() { const b = document.getElementById("itFiltersBtn"); if (!b) return; const n = ["itGroup", "itMType", "itAtt", "itMax"].filter(id => (document.getElementById(id) || {}).value).length + document.querySelectorAll("#itRar .chip.on").length + (IT.mode && IT.mode !== "all" ? 1 : 0), open = $("#itForm").classList.contains("filters-open"); b.textContent = `${open ? "▴" : "▾"} Filters${n ? ` · ${n} on` : ""}`; b.setAttribute("aria-expanded", String(open)); }
$("#itFiltersBtn").addEventListener("click", () => { $("#itForm").classList.toggle("filters-open"); itFiltersSync(); });
function renderItems() {
  itLoad(); renderItTargets(); itFiltersSync();
  $("#itShopBtn").hidden = !!(window.Portal && Portal.views && !Portal.views.includes("world"));
  $("#itGearF").classList.toggle("hidden", IT.mode === "magic" || IT.mode === "custom");
  $("#itMagicF").classList.toggle("hidden", IT.mode === "gear");
  const list = itFiltered();
  const label = { all: IT.ed === "2024" ? "2024 (SRD 5.2) and custom" : "2014 (SRD 5.1) and custom", gear: IT.ed === "2024" ? "2024 standard" : "2014 standard", magic: IT.ed === "2024" ? "2024 magic" : "2014 magic", custom: "custom" }[IT.mode];
  $("#itCount").innerHTML = `Showing <b>${list.length}</b> ${label} items`;
  if (!list.length) {
    $("#itList").innerHTML = IT.mode === "custom" && !IT.custom.length ? `<div class="card empty"><h2>No custom items yet</h2><p>Press “Create custom item” to build one. Its rarity and price are worked out as you add properties.</p></div>` : `<div class="card empty"><h2>No items found</h2><p>Loosen a filter or clear them all.</p></div>`;
    return;
  }
  let h = "";
  if ($("#itSort").value === "name") {
    const key = x => x.kind === "gear" ? x.g : x.kind === "magic" ? "Magic: " + x.cat : "Your custom items";
    const rank = k => k.startsWith("Your") ? 0 : k.startsWith("Magic") ? 2 : 1;
    const groups = new Map(); list.forEach(x => { const k = key(x); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); });
    [...groups.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).forEach(k => {
      h += `<div class="sec sp-group"><div class="sec-h"><h3>${esc(k)}</h3><span class="sp"></span><span class="muted" style="font-size:14px">${groups.get(k).length}</span></div>${groups.get(k).map(itRow).join("")}</div>`;
    });
  } else h = `<div class="sec sp-group">${list.map(itRow).join("")}</div>`;
  $("#itList").innerHTML = h;
}
// pay a price (in gp) from a character's coins, making change; returns false if they can't afford it
function payCoins(c, gp) {
  c.coins = c.coins || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  const V = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 }, cost = Math.round(gp * 100);
  let total = Object.entries(V).reduce((t, [k, v]) => t + (+c.coins[k] || 0) * v, 0);
  if (total < cost) return false;
  let rem = total - cost;
  const pp = Math.min(+c.coins.pp || 0, Math.floor(rem / 1000)); rem -= pp * 1000;
  const ep = Math.min(+c.coins.ep || 0, Math.floor(rem / 50)); rem -= ep * 50;
  c.coins = { pp, ep, gp: Math.floor(rem / 100), sp: Math.floor((rem % 100) / 10), cp: rem % 10 };
  return true;
}
const coinText = c => ["pp", "gp", "ep", "sp", "cp"].filter(k => +c.coins[k]).map(k => `${c.coins[k]} ${k}`).join(", ") || "no coins";
function itBuy(x) {
  const c = PCS.roster.find(r => r.id === $("#itTarget").value);
  if (!c) { toast("Save a character to My Characters first"); return; }
  const price = x.gp;
  if (price === null || price === undefined || isNaN(+price)) { toast(`${x.n} has no set price. Give it instead, and take the coins off by hand.`); return; }
  if (!payCoins(c, +price)) { toast(`${c.name} can't afford ${x.n} (${fmtGp(+price)}); they have ${coinText(c)}.`); return; }
  itGive(x, true); toast(`${c.name} bought ${x.n} for ${fmtGp(+price)} and has ${coinText(c)} left.`);
}
function itGive(x, quiet) {
  const c = PCS.roster.find(r => r.id === $("#itTarget").value);
  if (!c) { toast("Save a character to My Characters first"); return; }
  c.inv = c.inv || [];
  const ex = c.inv.find(i => i.ref === x.id);
  if (ex) ex.qty = (+ex.qty || 1) + 1;
  else c.inv.push({ id: uid("i"), ref: x.id, n: x.n, qty: 1, w: x.w || 0, att: !!x.att, attuned: false, value: x.c, note: x.kind === "gear" ? "" : `${rarName(x)} ${String(x.cat).toLowerCase()}` });
  pcPersist(); if (!quiet) toast(`${x.n} given to ${c.name}`);
}
function itLoot(x) {
  const c = Store.get($("#itCamp").value); if (!c) { toast("Create a campaign first (Campaign Tracker)"); return; }
  c.loot = c.loot || [];
  c.loot.unshift({ id: uid("l"), item: x.n, holder: "", value: x.c, notes: `${itTypeLine(x)}. ${String(x.d || "").replace(/\*\*/g, "").slice(0, 700)}` });
  Store.save(c); toast(`${x.n} added to “${c.name}” loot`);
}
function itCardHTML(x) {
  const st = (x.st || []).slice(); if (x.kind !== "gear" && x.att) st.push(["Attunement", "Required" + x.att.replace(/^Required/, "")]);
  return `<div class="icard r-${x.kind === "gear" ? "g" : R_CLASS[x.rk] || "v"}">
    <h2>${esc(x.n)}</h2><div class="ty">${esc(itTypeLine(x))}</div>
    ${st.map(([k, v]) => `<div class="st"><b>${esc(k)}:</b> ${esc(v)}</div>`).join("")}
    <div class="ds">${spFormat(x.d || "")}</div>
    <div class="ft"><span>${esc(x.c)}</span><span>${x.kind === "gear" ? "" : `<span class="rb">${esc(rarName(x))}</span>`}${x.w ? ` ${esc(x.w + " lb")}` : ""}</span></div></div>`;
}
function itCardFile(x) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(x.n)} · Item Card</title><link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap" rel="stylesheet"><style>${ITEMCARD_CSS}
body{margin:0;padding:24px;background:#5a5a5a}@media print{body{background:#fff;padding:0}}</style></head><body><div class="icards">${itCardHTML(x)}</div></body></html>`;
}
function itOpenCard(x) { openOverlay(`<div class="icards">${itCardHTML(x)}</div>`, x.n.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") + "-item-card.html", itCardFile(x), "Item card"); }

/* ---- custom item builder ---- */
const CI_TYPES = ["Wondrous Item", "Weapon", "Armor", "Shield", "Ammunition", "Ring", "Rod", "Staff", "Wand", "Potion", "Scroll"];
const CI_CONS = ["Potion", "Scroll", "Ammunition"];
const DMG_TYPES = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
const CI_SUB = {
  dmgType: ["Damage type", "select", DMG_TYPES], resType: ["Damage type", "select", DMG_TYPES], immType: ["Damage type", "select", DMG_TYPES],
  setAb: ["Ability", "select", AB.map(a => [a, AB_FULL[a]])], incAb: ["Ability", "select", AB.map(a => [a, AB_FULL[a]])],
  skill: ["Skill", "select", ALL_SKILLS], spellName: ["Spell name", "text"],
  spellUses: ["Uses", "select", ["1/day", "3 charges, regains all at dawn", "7 charges, regains 1d6 + 1 at dawn", "10 charges, regains 1d6 + 4 at dawn"]],
  minorText: ["Describe it", "text"], curseText: ["Describe the curse", "text"]
};
function ciCons(d) { return CI_CONS.includes(d.type) || !!d.single; }
function ciWhile(d) {
  if (d.type === "Potion") return "for 1 hour after you drink this potion";
  if (d.type === "Scroll") return "for 1 hour after you read this scroll";
  if (ciCons(d) && d.type !== "Ammunition") return "for 1 hour after you use this item, after which it is used up";
  return { Weapon: "while you hold this weapon", Armor: "while you wear this armor", Shield: "while you hold this shield", Ring: "while you wear this ring", Ammunition: "while you carry this ammunition", Rod: "while you hold this rod", Staff: "while you hold this staff", Wand: "while you hold this wand" }[d.type] || "while you wear or carry this item";
}
const ALL = () => true;
const CI_PROPS = [
  { k: "atk", label: "Attack and damage bonus", for: t => t === "Weapon" || t === "Ammunition", opts: [["+1", 1], ["+2", 2], ["+3", 3]],
    text: (v, d) => d.type === "Ammunition" ? `You have a ${v} bonus to attack and damage rolls made with this piece of magic ammunition. Once it hits a target, the ammunition is no longer magical.` : `You have a ${v} bonus to attack and damage rolls made with this magic weapon.` },
  { k: "ac", label: "Armor Class bonus", for: t => t === "Armor" || t === "Shield", opts: t => t === "Shield" ? [["+1", 1], ["+2", 2], ["+3", 3]] : [["+1", 2], ["+2", 3], ["+3", 4]],
    text: (v, d) => `You have a ${v} bonus to Armor Class ${ciWhile(d)}.` },
  { k: "prot", label: "Bonus to AC and saving throws", for: t => ["Wondrous Item", "Ring", "Rod", "Staff"].includes(t), opts: [["+1", 2], ["+2", 3], ["+3", 4]],
    text: (v, d) => `You have a ${v} bonus to Armor Class and saving throws ${ciWhile(d)}.` },
  { k: "dmg", label: "Extra damage on a hit", for: t => t === "Weapon" || t === "Ammunition", opts: [["1d4", 1], ["1d6", 1], ["2d6", 2], ["3d6", 3], ["4d6", 4]], sub: ["dmgType"],
    text: (v, d) => `${d.type === "Ammunition" ? "This ammunition" : "This weapon"} deals an extra ${v} ${d.sub.dmgType || "fire"} damage to any target it hits.` },
  { k: "res", label: "Damage resistance", kind: "check", tier: 2, for: ALL, sub: ["resType"], text: (v, d) => `You have resistance to ${d.sub.resType || "fire"} damage ${ciWhile(d)}.` },
  { k: "imm", label: "Damage immunity", kind: "check", tier: 3, for: ALL, sub: ["immType"], text: (v, d) => `You have immunity to ${d.sub.immType || "poison"} damage ${ciWhile(d)}.` },
  { k: "set", label: "Sets an ability score", for: ALL, opts: [["19", 1], ["21", 2], ["23", 3], ["25", 3], ["27", 4], ["29", 4]], sub: ["setAb"],
    text: (v, d) => { const a = AB_FULL[d.sub.setAb || "str"]; return `Your ${a} score is ${v} ${ciWhile(d)}. It has no effect on you if your ${a} is already ${v} or higher.`; } },
  { k: "inc", label: "Permanently raises an ability score", for: t => !["Weapon", "Armor", "Shield", "Ammunition"].includes(t), opts: [["+1, to a maximum of 20", 2], ["+2, to a maximum of 22", 3], ["+2, to a maximum of 24", 4]], sub: ["incAb"],
    text: (v, d) => `${ciCons(d) ? "When you use this item" : "After you spend 48 hours over 6 days studying or using this item"}, your ${AB_FULL[d.sub.incAb || "str"]} score increases by ${v}.${ciCons(d) ? "" : " The item then loses its magic for 100 years."}` },
  { k: "sense", label: "Darkvision", for: ALL, opts: [["60 feet", 1], ["120 feet", 1]], text: (v, d) => `You have darkvision out to ${v} ${ciWhile(d)}.` },
  { k: "move", label: "Movement", for: ALL, opts: [["+10 ft walking speed", 1], ["Climb and swim speed", 1], ["Fly speed, 4 hours a day", 1], ["Fly speed, always", 3], ["Teleport 30 ft, 3/day", 2]],
    text: (v, d) => ({
      "+10 ft walking speed": `Your walking speed increases by 10 feet ${ciWhile(d)}.`,
      "Climb and swim speed": `You have a climbing speed and a swimming speed equal to your walking speed ${ciWhile(d)}.`,
      "Fly speed, 4 hours a day": `You have a flying speed equal to your walking speed ${ciWhile(d)}. You can fly for up to 4 hours a day, all at once or in several shorter flights.`,
      "Fly speed, always": `You have a flying speed equal to your walking speed ${ciWhile(d)}.`,
      "Teleport 30 ft, 3/day": ciCons(d) ? "When you use this item, you can teleport up to 30 feet to an unoccupied space you can see." : "As a bonus action, you can teleport up to 30 feet to an unoccupied space you can see. You can do this 3 times, and regain all uses at dawn."
    })[v] },
  { k: "skill", label: "Advantage on a skill", kind: "check", tier: 1, for: ALL, sub: ["skill"], text: (v, d) => `You have advantage on ${d.sub.skill || "Stealth"} checks ${ciWhile(d)}.` },
  { k: "invis", label: "Invisibility", for: ALL, opts: [["1/day for 1 hour", 2], ["At will", 4]],
    text: (v, d) => ciCons(d) ? "When you use this item, you become invisible for 1 hour. Anything you are wearing or carrying is invisible with you. The effect ends early if you attack or cast a spell." : v === "At will" ? `As an action, you can turn invisible, or end the invisibility, ${ciWhile(d)}.` : "As an action, you can turn invisible for up to 1 hour. The invisibility ends early if you attack or cast a spell. Once used, this property can't be used again until the next dawn." },
  { k: "magres", label: "Advantage on saves against spells", kind: "check", tier: 2, for: ALL, text: (v, d) => `You have advantage on saving throws against spells ${ciWhile(d)}.` },
  { k: "spell", label: "Casts a spell", for: ALL, opts: [["Cantrip", 1], ["Level 1", 1], ["Level 2", 2], ["Level 3", 2], ["Level 4", 3], ["Level 5", 3], ["Level 6", 3], ["Level 7", 4], ["Level 8", 4], ["Level 9", 4]], sub: ["spellName", "spellUses"],
    text: (v, d, t) => {
      const dc = [13, 13, 15, 17, 19][t] || 13, nm = (d.sub.spellName || "").trim() || "a spell of your choice", lv = v === "Cantrip" ? "cantrip" : v.toLowerCase();
      if (d.type === "Scroll") return `When you read this scroll, you cast ${nm} (${lv}) from it without material components, with a spell save DC of ${dc} and a +${dc - 8} spell attack bonus. The scroll then crumbles to dust.`;
      if (ciCons(d)) return `When you use this item, you gain the effect of ${nm} (${lv}), with a spell save DC of ${dc} where one is needed.`;
      const u = d.sub.spellUses || "1/day";
      return u === "1/day" ? `While holding this item, you can cast ${nm} (${lv}) from it (spell save DC ${dc}, +${dc - 8} to hit). Once used, it can't be used this way again until the next dawn.` : `This item has ${u}. While holding it, you can expend 1 charge to cast ${nm} (${lv}) from it (spell save DC ${dc}, +${dc - 8} to hit).`;
    } },
  { k: "heal", label: "Healing", for: ALL, opts: [["2d4 + 2", 0], ["4d4 + 4", 1], ["8d4 + 8", 2], ["10d4 + 20", 3]],
    text: (v, d) => d.type === "Potion" ? `When you drink this potion, you regain ${v} hit points.` : ciCons(d) ? `When you use this item, you regain ${v} hit points.` : `As an action, you can regain ${v} hit points. Once used, this property can't be used again until the next dawn.` },
  { k: "minor", label: "Minor property (glows, always clean, etc.)", kind: "check", tier: 0, for: ALL, sub: ["minorText"],
    text: (v, d) => { const s = (d.sub.minorText || "").trim() || "On command, the item sheds dim light in a 10-foot radius"; return /[.!?]$/.test(s) ? s : s + "."; } },
  { k: "curse", label: "Cursed", kind: "check", tier: null, for: ALL, sub: ["curseText"],
    text: (v, d) => { const s = (d.sub.curseText || "").trim() || "Once you are attuned to this item, you can't willingly part with it until the curse is broken, for example by a Remove Curse spell"; return `**Curse.** ${/[.!?]$/.test(s) ? s : s + "."}`; } }
];
const ciOpts = (p, type) => typeof p.opts === "function" ? p.opts(type) : p.opts;
function ciNew(base) {
  const type = !base ? "Wondrous Item" : base.cat === "Shield" ? "Shield" : base.cat === "Ammunition" ? "Ammunition" : base.g === "Armor" ? "Armor" : "Weapon";
  return { id: null, n: "", type, base: base ? base.n : "", flavor: "", att: "auto", single: false, rarOverride: "", w: "", props: {},
    sub: { dmgType: "fire", resType: "fire", immType: "poison", setAb: "str", incAb: "str", skill: "Stealth", spellName: "", spellUses: "7 charges, regains 1d6 + 1 at dawn", minorText: "", curseText: "" } };
}
function ciBaseList(type) {
  const g = itemsGear();
  return type === "Weapon" ? g.filter(x => x.g === "Weapons" && x.cat !== "Ammunition") : type === "Armor" ? g.filter(x => x.g === "Armor" && x.cat !== "Shield") : type === "Shield" ? g.filter(x => x.cat === "Shield") : type === "Ammunition" ? g.filter(x => x.cat === "Ammunition") : [];
}
function ciEval(d) {
  const cons = ciCons(d), rows = [];
  CI_PROPS.forEach(p => {
    if (!p.for(d.type)) return;
    const v = d.props[p.k]; if (!v) return;
    let t = p.kind === "check" ? p.tier : (ciOpts(p, d.type).find(o => o[0] === v) || [])[1];
    if (t === undefined) return;
    if (t !== null) { if (p.k === "heal") t = cons ? t : t + 1; else if (cons && p.k !== "spell") t = Math.max(0, t - 1); t = Math.min(4, t); }
    rows.push({ p, v, t });
  });
  const tiers = rows.filter(r => r.t !== null).map(r => r.t);
  let rk = 0;
  if (tiers.length) { const score = tiers.reduce((s, t) => s + Math.pow(3, t), 0); rk = Math.min(4, Math.max(Math.max(...tiers), Math.floor(Math.log(score) / Math.log(3) + 1e-9))); }
  const manual = d.rarOverride !== "" && d.rarOverride !== undefined && d.rarOverride !== null;
  if (manual) rk = clamp(+d.rarOverride, 0, 4);
  const baseIt = d.base ? ciBaseList(d.type).find(x => x.n === d.base) : null, baseGp = baseIt ? baseIt.gp : 0;
  const value = R_VALUE[rk] / (cons ? 2 : 1);
  const attRec = !cons && rows.some(r => ["set", "prot", "res", "imm", "magres", "invis", "sense", "move"].includes(r.p.k) || (r.t !== null && r.t >= 2));
  return { rk, rows, cons, value, gp: value + baseGp, baseGp, baseIt, attRec, manual };
}
function ciText(d, ev) {
  const P = [];
  if (d.flavor.trim()) P.push(d.flavor.trim());
  ev.rows.filter(r => r.p.k !== "curse").forEach(r => P.push(r.p.text(r.v, d, r.t ?? 0)));
  ev.rows.filter(r => r.p.k === "curse").forEach(r => P.push(r.p.text(r.v, d, 0)));
  if (!P.length) P.push("A finely made item with no magical properties yet.");
  return P.join("\n\n");
}
function ciRecord(d, ev = ciEval(d)) {
  const att = d.att === "yes" || (d.att === "auto" && ev.attRec) ? "Required" : "";
  const typeLine = d.type + (ev.baseIt ? ` (${ev.baseIt.n})` : d.base === "" && ["Weapon", "Armor", "Shield", "Ammunition"].includes(d.type) ? ` (any ${d.type === "Armor" ? "armor" : d.type === "Weapon" ? "weapon" : d.type.toLowerCase()})` : "");
  return { id: d.id || uid("ci"), kind: "custom", n: d.n.trim() || "Unnamed item", cat: d.type, type: typeLine, r: RARITY[ev.rk], rk: ev.rk, att, cons: ev.cons, base: !!ev.baseIt,
    c: fmtGp(ev.gp), gp: ev.gp, w: ev.baseIt ? ev.baseIt.w : (+d.w || 0), st: ev.baseIt ? ev.baseIt.st.slice() : [], d: ciText(d, ev), draft: JSON.parse(JSON.stringify(d)) };
}
function ciSubHTML(s, d) {
  const [l, kind, opts] = CI_SUB[s], v = d.sub[s] ?? "";
  return `<label class="ci-sub">${l}${kind === "select" ? `<select data-cis="${s}">${opts.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${val === v ? "selected" : ""}>${esc(lab)}</option>`; }).join("")}</select>` : `<input type="text" data-cis="${s}" value="${esc(v)}">`}</label>`;
}
function ciPropHTML(p, d) {
  const v = d.props[p.k] || "";
  const ctl = p.kind === "check"
    ? `<label class="check" style="margin:0"><input type="checkbox" data-cip="${p.k}" ${v ? "checked" : ""}><span>${esc(p.label)}</span></label><span class="muted" style="font-size:13px">${p.tier === null ? "No rarity change" : RARITY[p.tier]}</span>`
    : `<span>${esc(p.label)}</span><select data-cip="${p.k}" aria-label="${esc(p.label)}"><option value="">None</option>${ciOpts(p, d.type).map(([o, t]) => `<option value="${esc(o)}" ${o === v ? "selected" : ""}>${esc(o)} · ${RARITY[t]}</option>`).join("")}</select>`;
  const sub = v && p.sub ? `<div class="sub">${p.sub.filter(s => !(s === "spellUses" && ciCons(d))).map(s => ciSubHTML(s, d)).join("")}</div>` : "";
  return `<div class="ci-prop">${ctl}${sub}</div>`;
}
function ciHTML(d) {
  const baseList = ciBaseList(d.type);
  return `<div class="card"><div class="sec-h"><h3>${d.id ? "Edit custom item" : "Create a custom item"}</h3><span class="sp"></span><button class="icon-btn" type="button" data-ci-act="close" title="Close">✕</button></div>
  <div class="ci-rand"><div><label>Random magic item</label><select data-ci-rr aria-label="Rarity for random item"><option value="">Any rarity</option>${RARITY.slice(0, 5).map((r, i) => `<option value="${i}" ${String(IT.randRar ?? "") === String(i) ? "selected" : ""}>${r}</option>`).join("")}</select></div><button class="btn" type="button" data-ci-act="random">🎲 Roll random item</button><p class="hint">Rolls a type, properties, name and lore that add up to the chosen rarity. Everything stays editable, and you can roll again as often as you like.</p></div>
  <div class="ci-grid"><div>
    <div class="field"><label>Name</label><input type="text" data-ci="n" value="${esc(d.n)}" placeholder="e.g. Emberfang"></div>
    <div class="field row"><div><label>Item type</label><select data-ci="type">${CI_TYPES.map(t => `<option ${t === d.type ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      ${baseList.length ? `<div><label>Base item</label><select data-ci="base"><option value="">Any ${esc(d.type.toLowerCase())}</option>${baseList.map(x => `<option value="${esc(x.n)}" ${x.n === d.base ? "selected" : ""}>${esc(x.n)} (${esc(x.c)})</option>`).join("")}</select></div>` : `<div><label>Weight (lb)</label><input type="number" min="0" step="0.5" data-ci="w" value="${esc(d.w)}"></div>`}</div>
    <div class="field"><label>Magic properties</label>${CI_PROPS.filter(p => p.for(d.type)).map(p => ciPropHTML(p, d)).join("")}</div>
    <div class="field"><label>Description and lore</label><textarea data-ci="flavor" placeholder="What it looks like, who made it, rumors about it…">${esc(d.flavor)}</textarea></div>
    <div class="field row"><div><label>Attunement</label><select data-ci="att"><option value="auto" ${d.att === "auto" ? "selected" : ""}>Use the recommendation</option><option value="yes" ${d.att === "yes" ? "selected" : ""}>Requires attunement</option><option value="no" ${d.att === "no" ? "selected" : ""}>No attunement</option></select></div>
      <div><label>Rarity</label><select data-ci="rarOverride"><option value="">Auto (from properties)</option>${RARITY.slice(0, 5).map((r, i) => `<option value="${i}" ${String(d.rarOverride) === String(i) ? "selected" : ""}>${r}</option>`).join("")}</select></div></div>
    ${CI_CONS.includes(d.type) ? "" : `<label class="check"><input type="checkbox" data-ci="single" ${d.single ? "checked" : ""}><span><b>Single use</b><small>The item is used up after one use, which halves its value</small></span></label>`}
  </div><div id="ciSide"></div></div>
  <div class="actions"><button class="btn primary" type="button" data-ci-act="save">✓ Save item</button><button class="btn" type="button" data-ci-act="savecard">Save and export card</button><button class="btn" type="button" data-ci-act="close">Cancel</button></div></div>`;
}
function ciExplain(d, ev) {
  const P = [];
  P.push(ev.manual ? "Rarity set by hand." : ev.rows.filter(r => r.t !== null).length > 1 ? "Each property is rated against official items of similar power; several strong properties together push the item up a rarity." : ev.rows.length ? "Rarity comes from the closest official equivalent of the property." : "");
  P.push(`Value: ${fmtGp(R_VALUE[ev.rk])} for a ${RARITY[ev.rk].toLowerCase()} item in the 2024 Dungeon Master's Guide${ev.cons ? ", halved because it is used up" : ""}${ev.baseIt ? `, plus ${fmtGp(ev.baseGp)} for the ${ev.baseIt.n}` : ""}.`);
  P.push(`Suitable for characters of ${R_LEVEL[ev.rk]}.`);
  if (d.att === "auto") P.push(ev.attRec ? "Attunement recommended: the item gives a lasting bonus." : "No attunement needed.");
  return P.filter(Boolean).join(" ");
}
function ciPreview() {
  const d = IT.draft, side = $("#ciSide"); if (!d || !side) return;
  const ev = ciEval(d), rec = ciRecord(d, ev);
  const rows = ev.rows.map(r => `<li>${esc(r.p.label)}${r.v === true ? "" : `: ${esc(r.v)}`} <span class="muted">→ ${r.t === null ? "no rarity change" : RARITY[r.t]}${ev.cons && r.t !== null && !["heal", "spell"].includes(r.p.k) ? " (one step lower for a consumable)" : ""}</span></li>`).join("");
  side.innerHTML = `<div class="ci-eval"><div class="lbl">Evaluation</div>
    <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px"><span class="big rar-${R_CLASS[ev.rk]}">${RARITY[ev.rk]}</span><span class="big">${esc(rec.c)}</span></div>
    ${rows ? `<ul class="plain" style="margin:6px 0">${rows}</ul>` : `<p class="muted" style="margin:6px 0">No magic properties yet. Add some on the left and the rarity and price update as you go.</p>`}
    <p class="hint" style="margin:6px 0 0">${esc(ciExplain(d, ev))}</p></div>
    <div class="icards" style="justify-content:flex-start;padding:0">${itCardHTML(rec)}</div>`;
}

/* ---- random magic item generator ---- */
const rPick = a => a[Math.floor(Math.random() * a.length)];
const rWeighted = list => { const tot = list.reduce((s, x) => s + x[1], 0); let r = Math.random() * tot; for (const x of list) { r -= x[1]; if (r <= 0) return x[0]; } return list[list.length - 1][0]; };
const RI_TYPES = [["Wondrous Item", 30], ["Weapon", 18], ["Armor", 9], ["Shield", 5], ["Ring", 10], ["Potion", 9], ["Scroll", 5], ["Wand", 5], ["Rod", 3], ["Staff", 4], ["Ammunition", 4]];
const RI_RAR = [[0, 22], [1, 34], [2, 26], [3, 13], [4, 5]];
const RI_ALLOWED = { Potion: ["heal", "res", "invis", "move", "sense", "set", "skill", "magres", "prot", "inc"], Scroll: ["spell"], Ammunition: ["atk", "dmg"],
  Wand: ["spell", "minor", "res", "magres", "skill", "sense"], Staff: ["spell", "prot", "minor", "res", "magres", "set"], Rod: ["spell", "prot", "minor", "magres", "res", "move", "invis"] };
const RI_WONDROUS = [["Cloak", 1], ["Amulet", 0], ["Boots", 1], ["Circlet", 0], ["Bracers", 1], ["Gloves", 0], ["Belt", 1], ["Lantern", 2], ["Horn", 2], ["Brooch", 0], ["Mask", 1], ["Pendant", 0], ["Mantle", 2], ["Torc", 1], ["Censer", 3], ["Mirror", 1], ["Compass", 0.5], ["Hourglass", 1], ["Tome", 5], ["Figurine", 1]];
const RI_NOUN = { Ring: ["Ring", "Band", "Signet", "Loop"], Rod: ["Rod", "Scepter", "Baton"], Staff: ["Staff", "Stave", "Crook", "Quarterstaff"], Wand: ["Wand", "Switch", "Spindle"], Potion: ["Potion", "Elixir", "Draught", "Tincture", "Philter"], Scroll: ["Scroll"], Shield: ["Shield", "Aegis", "Bulwark"], Armor: ["Armor", "Mail", "Harness", "Plate"], Weapon: ["Blade"], Ammunition: ["Arrows", "Bolts", "Shafts"] };
const RI_ELEM = { acid: ["Corroding", "Caustic", "Etching"], cold: ["Frost", "Rime", "Winter's", "Glacial"], fire: ["Ember", "Cinder", "Flame", "Ashen"], force: ["Arcane", "Shattering", "Starbound"], lightning: ["Storm", "Thunderhead", "Sparking", "Tempest"],
  necrotic: ["Grave", "Withering", "Dusk", "Hollow"], poison: ["Viper's", "Venom", "Nightshade"], psychic: ["Dreaming", "Whispering", "Mind's"], radiant: ["Dawn", "Sunlit", "Hallowed", "Gleaming"], thunder: ["Booming", "Roaring", "Drum"],
  bludgeoning: ["Crushing", "Iron", "Hammer's"], piercing: ["Needle", "Thorn", "Lancing"], slashing: ["Rending", "Keen", "Razor"] };
const RI_ADJ = ["Wanderer's", "Gilded", "Silent", "Ancient", "Moonlit", "Duskwood", "Runed", "Ironbound", "Whispering", "Starlit", "Forgotten", "Twilight", "Oathbound", "Sable", "Verdant", "Gloaming", "Hearthward", "Wyrm-touched"];
const RI_EPI = { set: "Might", inc: "Ascension", sense: "the Owl", move: "the Wind", invis: "Shadows", magres: "Warding", prot: "Protection", res: "Endurance", imm: "the Unbroken", heal: "Mending", skill: "Cunning", spell: "the Magus", atk: "Valor", dmg: "Fury", ac: "the Bastion", minor: "Small Wonders" };
const RI_MAKERS = ["Vecna's Apprentice", "Old Mother Ivrel", "the Thornwood Coven", "Baradun the Smith", "the Order of the Gilded Lantern", "a forgotten dwarven clan", "the drowned court of Sel'Varra", "Archmage Oriel Tamsk", "the gnomes of Brasswhistle", "a nameless hedge witch", "the Ember Kings", "an elven bladesinger"];
const RI_ABILITY_NOUN = { str: "the Giant", dex: "the Cat", con: "the Bear", int: "the Sage", wis: "the Hermit", cha: "the Silver Tongue" };
const RI_LOOK = ["Its surface is etched with tiny runes that shimmer when no one is looking directly at them.", "It is warm to the touch, as though it were alive.", "Faint music, like a distant choir, can be heard when it is held to the ear.", "Thin silver filigree winds across it in patterns that never seem to repeat.", "It smells faintly of rain and cedar smoke.", "Its color shifts subtly with its bearer's mood.", "A single drop of dried blood stains it, and no cleaning removes it.", "It is lighter than it looks, as if part of it exists somewhere else.", "Tiny motes of light drift around it in darkness.", "Old tooth marks score one edge, though no one remembers whose."];
const RI_LORE = ["Legends claim it was made by {m} to settle a debt that could not be paid in gold.", "It was last seen in the hoard of a young dragon, who traded it for a promise it never kept.", "{m} forged it in a single night, and the effort cost them their name.", "Scholars argue whether it was a gift or a trap left behind by {m}.", "It surfaced at a black-market auction in Waterdeep, its provenance scrubbed from every ledger.", "Every owner it has had is said to have died far from home, though none of them died young.", "{m} made a dozen like it; this is the only one still accounted for.", "It was pulled from the ashes of a burned monastery, unharmed and still faintly glowing."];
const RI_MINOR = ["On command, the item sheds dim light in a 10-foot radius", "The item is always clean and can't be tarnished or stained", "The item hums softly when a creature within 30 feet is lying", "The item is always cool to the touch, even in blazing heat", "Frost forms on the item when an undead creature is within 60 feet", "The item whispers its previous owner's name at midnight", "The item floats on water and other liquids", "As a bonus action, you can make the item change color", "The item can't be harmed by mundane fire"];
const RI_CURSE = ["You become unwilling to part with the item, and you have disadvantage on Wisdom saving throws while attuned to it", "While attuned to the item, you can't benefit from a long rest more than once per week", "The item whispers to you each night; you have disadvantage on Insight checks while attuned", "While attuned, your reflection does not appear in mirrors and animals become hostile toward you"];
function riSpell(level) {
  try { spLoad(); const l = level === "Cantrip" ? 0 : +String(level).replace(/\D/g, ""); const pool = SP.data["2024"].filter(s => s.l === l); if (pool.length) return rPick(pool).n; } catch { }
  return "";
}
function riName(d, keys) {
  const noun = d.type === "Wondrous Item" ? d.wNoun : d.base && ["Weapon", "Armor", "Shield", "Ammunition"].includes(d.type) ? d.base.replace(/,.*$/, "") : rPick(RI_NOUN[d.type] || ["Relic"]);
  const elemKey = keys.find(k => ["dmg", "res", "imm"].includes(k));
  const elem = elemKey ? d.sub[{ dmg: "dmgType", res: "resType", imm: "immType" }[elemKey]] : null;
  const main = keys.find(k => k !== "minor" && k !== "curse") || "minor";
  if (d.type === "Scroll" && d.sub.spellName) return `Scroll of ${d.sub.spellName}`;
  if (d.type === "Potion") { if (main === "heal") return rPick(["Potion of Healing", "Elixir of Mending", "Draught of Vigor"]); if (main === "res") return `Potion of ${cap1(d.sub.resType)} Resistance`; if (main === "set") return `Potion of ${cap1(AB_FULL[d.sub.setAb])}`; }
  const epi = main === "set" || main === "inc" ? RI_ABILITY_NOUN[d.sub[main === "set" ? "setAb" : "incAb"]] : main === "spell" && d.sub.spellName && ["Wand", "Staff", "Rod"].includes(d.type) && Math.random() < 0.6 ? d.sub.spellName : RI_EPI[main];
  const adj = elem && Math.random() < 0.75 ? rPick(RI_ELEM[elem]) : rPick(RI_ADJ);
  if (main === "minor") return rWeighted([[`${adj} ${noun}`, 4], [`${noun} of ${rPick(["Small Wonders", "the Hearth", "Whimsy", "the Traveler"])}`, 1]]);
  return rWeighted([[`${adj} ${noun}`, 3], [`${noun} of ${epi}`, 3], [`${adj} ${noun} of ${epi}`, 2]]);
}
function riFlavor(d) {
  const m = rPick(RI_MAKERS);
  const lead = d.type === "Potion" ? rPick(["The liquid inside swirls slowly on its own.", "It is thick and shimmering, like molten pearl.", "Tiny bubbles rise endlessly through it, even when it sits still.", "It smells of crushed mint and lightning."]) : d.type === "Scroll" ? rPick(["The vellum is singed at the edges and smells of ozone.", "The ink glows faintly when the scroll is unrolled.", "The script rearranges itself to match the reader's native tongue."]) : rPick(RI_LOOK);
  return `${lead} ${rPick(RI_LORE).replace("{m}", m)}`;
}
function ciRandom(target) {
  let want = target === "" || target === undefined || target === null ? rWeighted(RI_RAR) : clamp(+target, 0, 4);
  for (let attempt = 0; attempt < 400; attempt++) {
    let type = rWeighted(RI_TYPES);
    if (attempt > 250) type = "Wondrous Item";
    const d = ciNew(); d.type = type; d.props = {};
    const bl = ciBaseList(type); if (bl.length) d.base = Math.random() < 0.85 ? rPick(bl).n : "";
    d.sub.dmgType = rPick(DMG_TYPES.filter(t => !["bludgeoning", "piercing", "slashing"].includes(t)));
    d.sub.resType = rPick(DMG_TYPES); d.sub.immType = rPick(["poison", "fire", "cold", "necrotic", "psychic", "lightning"]);
    d.sub.setAb = rPick(AB); d.sub.incAb = rPick(AB); d.sub.skill = rPick(ALL_SKILLS);
    d.sub.spellUses = rPick(CI_SUB.spellUses[2]);
    if (type === "Wondrous Item") { const [n, w] = rPick(RI_WONDROUS); d.wNoun = n; d.w = String(w); }
    else if (!bl.length) d.w = { Ring: "0", Rod: "2", Staff: "4", Wand: "1", Potion: "0.5", Scroll: "0" }[type] || "";
    const allowed = CI_PROPS.filter(p => p.for(type) && p.k !== "curse" && p.k !== "minor" && (!RI_ALLOWED[type] || RI_ALLOWED[type].includes(p.k)));
    if (!allowed.length) continue;
    const n = want === 0 ? 1 : rWeighted([[1, 5], [2, 4], [3, want >= 3 ? 3 : 1]]);
    const pool = allowed.slice();
    for (let i = 0; i < n && pool.length; i++) {
      const p = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      if (p.kind === "check") d.props[p.k] = true;
      else { const opts = ciOpts(p, type).filter(o => o[1] <= want + 1); if (!opts.length) continue; d.props[p.k] = rPick(opts)[0]; }
    }
    if (want === 0 && type !== "Potion" && type !== "Scroll" && Math.random() < 0.7) d.props = {};
    if (type !== "Scroll" && type !== "Potion" && (want === 0 || Math.random() < 0.35)) { d.props.minor = true; d.sub.minorText = rPick(RI_MINOR); }
    if (type !== "Scroll" && type !== "Potion" && want >= 2 && Math.random() < 0.1) { d.props.curse = true; d.sub.curseText = rPick(RI_CURSE); }
    const ev = ciEval(d);
    if (ev.rk !== want || !ev.rows.length) continue;
    if (d.props.spell) d.sub.spellName = riSpell(d.props.spell);
    d.n = riName(d, Object.keys(d.props));
    d.flavor = riFlavor(d);
    delete d.wNoun;
    return d;
  }
  const d = ciNew(); d.n = "Curious Trinket"; d.props.minor = true; d.sub.minorText = rPick(RI_MINOR); d.flavor = riFlavor(d); return d;
}
function ciRoll() { IT.draft = ciRandom(IT.randRar ?? ""); ciRerender(); }
function ciOpen(d) {
  IT.draft = d;
  if (location.hash !== "#items") location.hash = "items";
  $("#view-items").classList.add("ci-open");
  const box = $("#itBuilder"); box.classList.remove("hidden"); box.innerHTML = ciHTML(d); ciPreview();
  setTimeout(() => box.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
}
function ciClose() { IT.draft = null; $("#view-items").classList.remove("ci-open"); const box = $("#itBuilder"); box.classList.add("hidden"); box.innerHTML = ""; }
function ciRerender() { const y = window.scrollY; $("#itBuilder").innerHTML = ciHTML(IT.draft); ciPreview(); window.scrollTo(0, y); }
function ciSave(card) {
  const d = IT.draft; if (!d) return;
  if (!d.n.trim()) { toast("Give the item a name first"); const i = $('[data-ci="n"]'); if (i) i.focus(); return; }
  const rec = ciRecord(d); d.id = rec.id; rec.draft.id = rec.id;
  const i = IT.custom.findIndex(x => x.id === rec.id);
  if (i >= 0 && IT.custom[i].loreId) { rec.loreId = IT.custom[i].loreId; rec.loreOff = true; } /* made from Lore, now changed here: Lore saves leave it alone */
  if (i >= 0) IT.custom[i] = rec; else IT.custom.unshift(rec);
  itPersist(); ciClose(); IT.open.add(rec.id); renderItems(); foldReveal($(`#itList .it-row[data-id="${CSS.escape(rec.id)}"]`)); toast(`${rec.n} saved to your custom items`);
  if (card) itOpenCard(rec);
}
(function initItems() {
  itRestore();
  document.head.insertAdjacentHTML("beforeend", `<style id="itemCardCss">${ITEMCARD_CSS}</style>`);
  const rer = () => { clearTimeout(itRT); itRT = setTimeout(renderItems, 110); };
  $("#itForm").addEventListener("input", e => {
    if (e.target.name === "itEd") { IT.ed = e.target.value; IT.open.clear(); }
    if (e.target.name === "itMode") IT.mode = e.target.value;
    rer();
  });
  $("#itRar").addEventListener("click", e => { const c = e.target.closest(".chip"); if (!c) return; const r = +c.dataset.r; IT.rar.has(r) ? IT.rar.delete(r) : IT.rar.add(r); c.classList.toggle("on"); renderItems(); });
  $("#itReset").addEventListener("click", () => {
    ["#itQ", "#itGroup", "#itMType", "#itAtt", "#itMax"].forEach(id => $(id).value = ""); $("#itInDesc").checked = false; $("#itSort").value = "name";
    IT.rar.clear(); $$("#itRar .chip").forEach(c => c.classList.remove("on"));
    IT.mode = "all"; const all = $("input[name=itMode][value=all]"); if (all) all.checked = true; renderItems();
  });
  $("#itNew").addEventListener("click", () => ciOpen(ciNew()));
  $("#itRandom").addEventListener("click", () => ciOpen(ciRandom(IT.randRar ?? "")));
  const act = async e => {
    const b = e.target.closest("[data-it]"); if (!b) return; const x = itFind(b.dataset.id); if (!x) return; const k = b.dataset.it;
    if (k === "toggle") { IT.open.has(x.id) ? IT.open.delete(x.id) : IT.open.add(x.id); const row = b.closest(".it-row"); if (row) row.outerHTML = itRow(x); return; }
    if (k === "card") itOpenCard(x);
    else if (k === "copy") { try { await navigator.clipboard.writeText(itText(x)); toast(`${x.n} copied`); } catch { toast("Couldn't copy here"); } }
    else if (k === "give") itGive(x);
    else if (k === "buy") itBuy(x);
    else if (k === "loot") itLoot(x);
    else if (k === "edit") ciOpen(Object.assign(ciNew(), JSON.parse(JSON.stringify(x.draft || {})), { id: x.id }));
    else if (k === "clone") ciOpen(ciNew(x));
    else if (k === "del") { if (!(await confirmBox("Delete item?", `Delete your custom item “${x.n}”?`, "Delete"))) return; IT.custom = IT.custom.filter(y => y.id !== x.id); itPersist(); renderItems(); toast(`${x.n} deleted`); }
  };
  $("#itList").addEventListener("click", act);
  $("#itList").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".it-head")) { e.preventDefault(); act(e); } });
  $("#itTargetRow").addEventListener("change", e => { if (e.target.id === "itTarget") IT.target = e.target.value; });
  const bx = $("#itBuilder");
  bx.addEventListener("input", e => {
    const d = IT.draft; if (!d) return; const t = e.target;
    if (t.dataset.ciRr !== undefined) { IT.randRar = t.value; return; }
    if (t.dataset.ci) { const k = t.dataset.ci; d[k] = t.type === "checkbox" ? t.checked : t.value; if (k === "type") d.base = ""; if (k === "type" || k === "single") ciRerender(); else ciPreview(); return; }
    if (t.dataset.cip) { d.props[t.dataset.cip] = t.type === "checkbox" ? t.checked : t.value; ciRerender(); return; }
    if (t.dataset.cis) { d.sub[t.dataset.cis] = t.value; ciPreview(); }
  });
  bx.addEventListener("click", e => { const b = e.target.closest("[data-ci-act]"); if (!b) return; const a = b.dataset.ciAct; if (a === "close") ciClose(); else if (a === "random") ciRoll(); else ciSave(a === "savecard"); });
})();
