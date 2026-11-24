/* 21-sidebar.js: the side menu (2026-11-24). The tabs moved out of the header into #fside on the left:
   grouped, with sections under some tabs, foldable to icons on laptops, and a panel from the left on phones
   (the bottom bar's More). Its search box finds the person's own things (characters, campaigns, World places,
   Your NPCs, homebrew), the rules (through compendiumMatches) and the tabs. Portal still shows and hides the
   tab links, and route() calls sideSync. Notes: docs/features/layout.md, "Side menu". */
const SIDE_KEY = "dmforge.side.v1";
const SIDE_GROUPS = [
  ["Prep", ["generate", "npc", "world", "monsters", "map", "tracker"]],
  ["Characters", ["roster"]],
  ["Rules", ["compendium", "spells", "feats", "items", "homebrew"]],
  ["Players", ["party", "journal", "whispers"]],
  ["Forge", ["requests"]]
];
const SIDE_SECTIONS = {
  tracker: [["overview", "Overview"], ["session", "Open Session"], ["encounters", "Encounters"], ["sessions", "Sessions"], ["party", "Party"], ["npcs", "NPCs"], ["lore", "Lore"], ["quests", "Quests"], ["loot", "Loot"], ["notes", "Notes"], ["maps", "Maps"], ["calendar", "Calendar"], ["sources", "Sourcebooks"], ["handouts", "Handouts"]],
  monsters: [["forge", "Forge a creature"], ["build", "Build a monster"], ["srd", "Monster Manual"]],
  items: [["all", "All items"], ["gear", "Standard"], ["magic", "Magic"], ["custom", "Mine"]],
  world: [["place", "Places"], ["build", "World builder"]]
};
const SIDE = { open: new Set(), hits: [], req: 0, timer: 0 };
const sideNav = () => $("#fside nav");
const sideView = () => (location.hash.slice(1) === "character" ? "roster" : location.hash.slice(1)) || ($("section.view.active")?.id || "").replace("view-", "");
const sideCan = v => !window.Portal?.views || Portal.views.includes(v);
const sideLabel = a => a.firstChild.textContent.trim();

/* ---------- the menu ---------- */
(function sideBuild() {
  const nav = sideNav(), links = new Map($$("#fside nav a[data-view]").map(a => [a.dataset.view, a]));
  for (const [label, views] of SIDE_GROUPS) {
    const h = document.createElement("p"); h.className = "fside-grp"; h.textContent = label; nav.append(h);
    for (const v of views) {
      const a = links.get(v); if (!a) continue;
      links.delete(v);
      a.title = sideLabel(a);
      const row = document.createElement("div"); row.className = "fside-row"; row.dataset.rowOf = v;
      nav.append(row); row.append(a);
      const secs = SIDE_SECTIONS[v]; if (!secs) continue;
      row.insertAdjacentHTML("beforeend", `<button type="button" class="fside-arrow" data-side-toggle="${v}" aria-expanded="false" aria-controls="fsideSubs-${v}" aria-label="Show ${esc(sideLabel(a))} sections">▸</button>`);
      nav.insertAdjacentHTML("beforeend", `<div class="fside-subs" id="fsideSubs-${v}" data-subs-of="${v}" hidden>${secs.map(([k, l]) => `<button type="button" data-side-go="${v}" data-side-sec="${k}">${esc(l)}</button>`).join("")}</div>`);
    }
  }
  for (const a of links.values()) { const row = document.createElement("div"); row.className = "fside-row"; nav.append(row); row.append(a); } /* any tab not in a group keeps a place */
})();

/* opens a tab, and one of its sections when given */
function sideGo(view, section) {
  if (section) {
    if (view === "tracker") subTab = section;
    else if (view === "monsters" || view === "items") {
      const r = $(`input[name="${view === "monsters" ? "monMode" : "itMode"}"][value="${section}"]`);
      if (r) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); r.dispatchEvent(new Event("input", { bubbles: true })); }
    } else if (view === "world") { W.mode = section; if (section === "build" && !W.build) wbStart("settlement"); }
  }
  if (location.hash.slice(1) === view) route(); else location.hash = view;
  if (hdrPhone.matches) sideClose();
}

/* marks the open tab's section, and hides group headings with no tabs showing */
function sideSync(view) {
  view = view || sideView();
  const cur = {
    tracker: () => subTab,
    monsters: () => $('input[name="monMode"]:checked')?.value,
    items: () => $('input[name="itMode"]:checked')?.value,
    world: () => W.mode === "place" ? "place" : W.mode
  };
  $$("#fside [data-side-sec]").forEach(b => {
    const on = b.dataset.sideGo === view && cur[view] && cur[view]() === b.dataset.sideSec;
    if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
  });
  $$("#fside .fside-grp").forEach(h => {
    let n = h.nextElementSibling, any = false;
    while (n && !n.classList.contains("fside-grp")) { if (n.matches(".fside-row") && n.querySelector("a[data-view]:not([hidden])")) any = true; n = n.nextElementSibling; }
    h.hidden = !any;
  });
  $$("#fside .fside-row").forEach(r => { const a = r.querySelector("a[data-view]"); r.hidden = !!(a && a.hidden); });
  $$("#fside [data-subs-of]").forEach(d => { const a = $(`#fside a[data-view="${d.dataset.subsOf}"]`); d.hidden = !SIDE.open.has(d.dataset.subsOf) || !!(a && a.hidden); });
}

function sideFold(folded) {
  document.documentElement.classList.toggle("fside-folded", folded);
  const b = $("#sideFoldBtn");
  b.textContent = folded ? "»" : "«"; b.setAttribute("aria-expanded", String(!folded));
  b.title = folded ? "Open the menu" : "Fold the menu to icons";
  try { localStorage.setItem(SIDE_KEY, folded ? "1" : "0"); } catch (e) {}
}
/* phones: the menu slides in from the left */
function sideOpen() {
  document.documentElement.classList.add("fside-open"); $("#fsideShade").hidden = false;
  sideSync();
  const a = $("#fside nav a.active") || $("#fside nav a[data-view]:not([hidden])");
  if (a) a.focus({ preventScroll: true });
}
function sideClose() {
  if (!document.documentElement.classList.contains("fside-open")) return;
  document.documentElement.classList.remove("fside-open"); $("#fsideShade").hidden = true;
  if ($("#fside").contains(document.activeElement)) $("#mobileMore").focus({ preventScroll: true });
}

$("#fside").addEventListener("click", e => {
  const t = e.target.closest("[data-side-toggle]");
  if (t) {
    const v = t.dataset.sideToggle, open = !SIDE.open.has(v);
    open ? SIDE.open.add(v) : SIDE.open.delete(v);
    t.setAttribute("aria-expanded", String(open)); t.textContent = open ? "▾" : "▸";
    if (open && document.documentElement.classList.contains("fside-folded")) sideFold(false);
    sideSync(); return;
  }
  const g = e.target.closest("[data-side-go]");
  if (g) { sideGo(g.dataset.sideGo, g.dataset.sideSec); return; }
  if (e.target.closest("nav a[data-view]") && hdrPhone.matches) sideClose();
});
$("#sideFoldBtn").addEventListener("click", () => { if (hdrPhone.matches) sideClose(); else sideFold(!document.documentElement.classList.contains("fside-folded")); });
$("#fsideShade").addEventListener("click", sideClose);
document.addEventListener("keydown", e => { if (e.key === "Escape" && document.documentElement.classList.contains("fside-open") && !document.querySelector("dialog[open]")) { e.preventDefault(); sideClose(); } });
hdrPhone.addEventListener("change", () => { sideClose(); sideSyncPhone(); });
function sideSyncPhone() { const b = $("#sideFoldBtn"); if (hdrPhone.matches) { b.textContent = "✕"; b.title = "Close the menu"; b.removeAttribute("aria-expanded"); } else sideFold(document.documentElement.classList.contains("fside-folded")); }
sideSyncPhone();
/* sections picked inside a page (the Tracker's sub-tabs, Items' and Monsters' modes, the World builder) */
["click", "change"].forEach(t => document.addEventListener(t, e => { if (!e.target.closest || e.target.closest("#fside")) return; requestAnimationFrame(() => sideSync()); }));

/* ---------- search ---------- */
const SIDE_SKIP = /^(id|img|imgUrl|v|version|seed|key|src|ed|bonus|kind)$|At$/;
/* the strings in obj (any depth) that hold every search word; path = the keys down to each */
function sideHits(words, obj, max = 1, path = [], out = []) {
  if (out.length >= max || obj == null) return out;
  if (typeof obj === "string") { const t = compendiumText(obj); if (words.every(w => t.includes(w))) out.push({ path, text: obj }); return out; }
  if (typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) { if (out.length >= max) break; if (!Array.isArray(obj) && SIDE_SKIP.test(k)) continue; sideHits(words, v, max, [...path, k], out); }
  return out;
}
const SIDE_WHERE = { spells: "spell", prepared: "spell", spell: "spell", known: "spell", cantrips: "spell", inv: "item", gear: "item", items: "item", equipment: "item", attacks: "attack", feats: "feat", features: "feature", notes: "notes", name: "name", race: "species", cls: "class", background: "background" };
const sideName = x => typeof x === "string" ? x : (x && (x.name || x.title || x.n || x.text)) || "";
const sideSnip = t => { t = String(t).replace(/\s+/g, " ").trim(); return t.length > 60 ? t.slice(0, 57) + "…" : t; };

function sideMine(words) {
  const hits = [], max = 5;
  for (const c of PCS.roster) {
    if (hits.length >= max) break;
    const h = sideHits(words, c)[0]; if (!h) continue;
    const where = SIDE_WHERE[h.path[0]] || h.path[0];
    const cls = (c.multi || []).length ? classLine(c) : `${c.cls || ""} ${c.level || ""}`.trim();
    hits.push({ icon: "🧙", name: c.name || "Unnamed", sub: `${cls} · ${where === "name" ? "character" : where}${where !== "name" ? ": " + sideSnip(h.text) : ""}`, open: () => { RC.id = c.id; CB.on = false; sideGo("roster"); sideReveal("#rosterMain", words); } });
  }
  if (sideCan("tracker")) {
    const subs = Object.fromEntries(SIDE_SECTIONS.tracker);
    for (const c of Store.list()) for (const key of ["npcs", "lore", "quests", "loot", "sessions", "encounters", "notes"]) {
      if (hits.length >= max * 2) break;
      const list = Array.isArray(c[key]) ? c[key] : c[key] ? [c[key]] : [];
      for (const x of list) {
        const h = sideHits(words, x)[0]; if (!h) continue;
        const nm = sideName(x);
        hits.push({ icon: "📜", name: sideSnip(typeof x === "string" ? h.text : nm || h.text), sub: `Campaign "${c.name}" · ${subs[key]}`, open: () => { activeId = c.id; sideGo("tracker", key); sideReveal("#campMain", words); } });
        break;
      }
    }
  }
  if (sideCan("world")) {
    if (!W.loaded) worldLoad();
    for (const p of W.places) { const h = sideHits(words, p)[0]; if (!h) continue; hits.push({ icon: "🗺️", name: p.name, sub: `World place · ${sideSnip(h.text)}`, open: () => { W.sel = p.id; W.open.add(p.id); sideGo("world", "place"); } }); }
  }
  if (sideCan("npc")) for (const n of npcLoose()) { const h = sideHits(words, n)[0]; if (!h) continue; hits.push({ icon: "🧑", name: n.name || "NPC", sub: `Your NPCs · ${sideSnip(h.text)}`, open: () => { sideGo("npc"); sideReveal("#view-npc", words); } }); }
  if (sideCan("homebrew")) for (const x of HB.list) { const h = sideHits(words, x)[0]; if (!h) continue; hits.push({ icon: "⚗️", name: x.name, sub: `Homebrew ${x.kind || ""}`.trim(), open: () => { sideGo("homebrew"); sideReveal("#view-homebrew", words); } }); }
  const j = $('#fside a[data-view="journal"]');
  if (j && !j.hidden) { const t = compendiumText($("#view-journal")?.innerText || ""); if (t && words.every(w => t.includes(w))) hits.push({ icon: "📖", name: "Journal", sub: "The party's Journal", open: () => { sideGo("journal"); sideReveal("#view-journal", words); } }); }
  return hits.slice(0, max);
}
function sideTabs(words) {
  const out = [];
  for (const a of $$("#fside nav a[data-view]")) {
    if (a.hidden) continue;
    const v = a.dataset.view, lab = sideLabel(a);
    if (words.every(w => compendiumText(lab).includes(w))) out.push({ icon: "📑", name: lab, sub: "Tab", open: () => sideGo(v) });
    for (const [k, l] of SIDE_SECTIONS[v] || []) if (words.every(w => compendiumText(l).includes(w))) out.push({ icon: "📑", name: l, sub: lab, open: () => sideGo(v, k) });
  }
  return out.slice(0, 5);
}
async function sideRules(q) {
  const eds = currentSourceRules() ? [currentSourceRules().edition] : ["2024", "2014"];
  const sets = await Promise.all(eds.map(ed => compendiumMatches({ query: q, ed }).catch(() => ({ rows: [] }))));
  const rows = sets.flatMap(s => s.rows).sort((a, b) => b.rank - a.rank || (a.ed === b.ed ? 0 : a.ed === "2024" ? -1 : 1));
  return { total: rows.length, hits: rows.slice(0, 5).map(r => ({ icon: { Spell: "✨", Item: "🪄", Monster: "🐉", Feat: "🎖️", Class: "⚔️", Subclass: "⚔️", Species: "🧝", Background: "📜" }[r.kind] || "📘", name: r.name, sub: [r.kind, r.group, r.ed, r.source].filter(Boolean).join(" · "), rule: r })) };
}

async function sideSearch(q) {
  const req = ++SIDE.req, box = $("#sideResults"), words = compendiumText(q).split(" ").filter(Boolean);
  if (compendiumText(q).length < 2) { box.hidden = true; box.innerHTML = ""; SIDE.hits = []; $("#fside").classList.remove("fside-searching"); return; }
  let mine = [];
  try { mine = sideMine(words); } catch (e) { console.warn(e); }
  const tabs = sideTabs(words), rules = await sideRules(q);
  if (req !== SIDE.req) return; /* a newer search has started */
  SIDE.hits = [...mine, ...rules.hits, ...tabs];
  let i = 0;
  const rows = list => list.map(h => `<button type="button" class="fside-hit" data-side-hit="${i++}"><span aria-hidden="true">${h.icon}</span><span><b>${esc(h.name)}</b><small>${esc(h.sub)}</small></span></button>`).join("");
  const grp = (label, list, extra = "") => list.length ? `<p class="fside-rgrp">${label}</p>${rows(list)}${extra}` : "";
  box.innerHTML = (grp("Your stuff", mine) + grp("Rules", rules.hits, rules.total > rules.hits.length ? `<button type="button" class="fside-all" data-side-all="1">Show all ${rules.total.toLocaleString()} in the Compendium</button>` : "") + grp("Tabs", tabs))
    || `<p class="muted fside-none">Nothing matches “${esc(q.trim())}”.</p>`;
  box.hidden = false; $("#fside").classList.add("fside-searching");
}
$("#sideQ").addEventListener("input", () => { clearTimeout(SIDE.timer); SIDE.timer = setTimeout(() => sideSearch($("#sideQ").value), 150); });
function sideClear() { $("#sideQ").value = ""; clearTimeout(SIDE.timer); sideSearch(""); }
$("#sideResults").addEventListener("click", e => {
  const all = e.target.closest("[data-side-all]");
  if (all) { $("#compendiumQuery").value = $("#sideQ").value; sideClear(); sideGo("compendium"); return; }
  const b = e.target.closest("[data-side-hit]"); if (!b) return;
  const h = SIDE.hits[b.dataset.sideHit]; if (!h) return;
  if (h.rule) { h.rule.open(b); return; } /* the rules window opens over the page; the results stay */
  sideClear(); if (hdrPhone.matches) sideClose(); h.open();
});
$("#fside").addEventListener("keydown", e => {
  const items = $$("#sideResults [data-side-hit], #sideResults [data-side-all]"), i = items.indexOf(document.activeElement);
  if (e.key === "ArrowDown" && (e.target.id === "sideQ" || i >= 0) && items.length) { e.preventDefault(); items[Math.min(i + 1, items.length - 1)].focus(); }
  else if (e.key === "ArrowUp" && i >= 0) { e.preventDefault(); i === 0 ? $("#sideQ").focus() : items[i - 1].focus(); }
  else if (e.key === "Escape" && (e.target.id === "sideQ" || i >= 0) && $("#sideQ").value) { e.preventDefault(); e.stopPropagation(); sideClear(); $("#sideQ").focus(); }
});

/* after a search result opens a page: find the words on it, open any folded part around them, scroll there and flash it */
function sideReveal(root, words) {
  const go = () => {
    const r = $(root); if (!r) return;
    const has = t => { t = compendiumText(t || ""); return words.every(w => t.includes(w)); };
    let best = null;
    for (const el of r.querySelectorAll("*")) {
      if (el.matches("script,style,option,select")) continue;
      const own = el.matches("input,textarea") ? el.value : el.textContent;
      if (!has(own)) continue;
      if ([...el.children].some(ch => !ch.matches("script,style") && has(ch.matches("input,textarea") ? ch.value : ch.textContent))) continue;
      best = el; break;
    }
    if (!best) return;
    for (let d = best.closest("details:not([open])"); d; d = d.parentElement && d.parentElement.closest("details:not([open])")) d.open = true;
    best.scrollIntoView({ block: "center" });
    best.classList.add("side-flash"); setTimeout(() => best.classList.remove("side-flash"), 1500);
  };
  requestAnimationFrame(() => requestAnimationFrame(go));
}
sideSync();
window.sideReady = true;
