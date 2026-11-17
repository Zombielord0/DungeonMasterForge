/* 08-spells.js: Spells tab: the spell browser. */

/* ======================= Spell browser (SRD 5.1 / 5.2) ======================= */
const SP = { data: null, ed: "2024", levels: new Set(), open: new Set(), expandAll: false };
const SAVE_ABBR = { STR: "Strength", DEX: "Dexterity", CON: "Constitution", INT: "Intelligence", WIS: "Wisdom", CHA: "Charisma" };
const ordinal = n => n === 0 ? "Cantrip" : n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th") + " level";
function spTimeCat(t) {
  const x = t.toLowerCase();
  if (x.includes("bonus action")) return "Bonus Action";
  if (x.startsWith("reaction") || x.startsWith("1 reaction")) return "Reaction";
  if (x.startsWith("action") || x.startsWith("1 action")) return "Action";
  return "Longer";
}
function spPrep(s, ed, i) {
  s.id = ed + "-" + i;
  s.tc = spTimeCat(s.t);
  s.ts = s.tc === "Longer" ? s.t : s.tc;
  if (s.sv) s.save = SAVE_ABBR[s.sv] || s.sv;
  else { const m = s.d.match(/(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/i); s.save = m ? cap1(m[1].toLowerCase()) : ""; }
  if (!s.at && /(melee|ranged) spell attack/i.test(s.d)) s.at = /ranged spell attack/i.test(s.d) ? "ranged" : "melee";
  s.hay = s.n.toLowerCase(); s.hayD = (s.n + " " + s.d + " " + s.h).toLowerCase();
  return s;
}
function spLoad() {
  if (SP.data) return;
  const raw = dmData("spellData");
  for (const ed of Object.keys(raw)) raw[ed].forEach((s, i) => spPrep(s, ed, i));
  SP.data = raw;
  hbSpellsApply();
  const all = [...raw["2014"], ...raw["2024"]];
  const fillSel = (id, vals) => vals.forEach(v => $(id).insertAdjacentHTML("beforeend", `<option>${esc(v)}</option>`));
  fillSel("#spClass", [...new Set(all.flatMap(s => s.c))].sort());
  fillSel("#spSchool", [...new Set(all.map(s => s.s))].sort());
  fillSel("#spDmg", [...new Set(all.map(s => s.dt).filter(Boolean))].sort());
}
const FAV_KEY = "dmforge.favspells";
let favs = new Set(); try { favs = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); } catch { }
const favKey = s => SP.ed + ":" + s.n;
function toggleFav(s) { const k = favKey(s); favs.has(k) ? favs.delete(k) : favs.add(k); try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); } catch { } }

function spFiltered() {
  const q = $("#spQ").value.trim().toLowerCase(), inD = $("#spInDesc").checked;
  const cls = $("#spClass").value, sch = $("#spSchool").value, tm = $("#spTime").value, conc = $("#spConc").value;
  const dmg = $("#spDmg").value, sv = $("#spSave").value, rit = $("#spRitual").checked, noM = $("#spNoM").checked, fav = $("#spFav").checked;
  const words = q.split(/\s+/).filter(Boolean);
  let list = SP.data[SP.ed].filter(s => !s.pend &&
    (!words.length || words.every(w => (inD ? s.hayD : s.hay).includes(w))) &&
    (!SP.levels.size || SP.levels.has(s.l)) && (!cls || s.c.includes(cls)) && (!sch || s.s === sch) &&
    (!tm || s.tc === tm) && (conc === "" || s.co === +conc) && (!dmg || s.dt === dmg) &&
    (!sv || (sv === "attack" ? !!s.at : s.save === sv)) && (!rit || s.ri) && (!noM || !s.cp.includes("M")) && (!fav || favs.has(favKey(s))));
  const byName = (a, b) => a.n.localeCompare(b.n);
  list.sort($("#spSort").value === "name" ? byName : (a, b) => a.l - b.l || byName(a, b));
  return list;
}
function spFormat(text) {
  // escape, then light markdown: **bold**, pipe tables, bullet lists
  const paras = text.split(/\n\s*\n|\n(?=\s*[-*] )|\n(?=\|)/).map(p => p.trim()).filter(Boolean);
  let h = "", table = [], list = [];
  const inline = t => esc(t).replace(/\*\*\*(.+?)\*\*\*/g, "<b><i>$1</i></b>").replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/_(.+?)_/g, "<i>$1</i>");
  const flushT = () => { if (!table.length) return; h += `<table class="sp-table">${table.map((r, i) => `<tr>${r.map(c => i === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</table>`; table = []; };
  const flushL = () => { if (!list.length) return; h += `<ul class="plain">${list.map(x => `<li>${inline(x)}</li>`).join("")}</ul>`; list = []; };
  for (const p of paras) {
    if (p.startsWith("|")) { flushL(); if (/^\|[\s|:-]+\|$/.test(p)) continue; table.push(p.replace(/^\||\|$/g, "").split("|").map(c => c.trim())); continue; }
    flushT();
    if (/^[-*] /.test(p)) { list.push(p.slice(2)); continue; }
    flushL(); h += `<p>${inline(p).replace(/\n/g, "<br>")}</p>`;
  }
  flushT(); flushL();
  return h;
}
function spDetail(s) {
  const comps = s.cp.split("").join(", ") + (s.m ? ` (${s.m})` : "");
  return `<div class="sp-detail">
    <div class="muted"><i>${s.l ? `Level ${s.l} ${esc(s.s)}` : `${esc(s.s)} cantrip`}${s.ri ? " (ritual)" : ""} · ${esc(s.c.join(", "))}</i></div>
    <div class="sp-stats"><div><span>Casting time</span>${esc(s.t)}${s.ri ? " or ritual" : ""}</div><div><span>Range</span>${esc(s.r)}</div><div><span>Components</span>${esc(comps)}</div><div><span>Duration</span>${s.co && !/concentration/i.test(s.du) ? "Concentration, " : ""}${esc(s.du)}</div></div>
    ${spFormat(s.d)}
    ${s.h ? `<p><b><i>${SP.ed === "2024" ? "Using a Higher-Level Spell Slot." : "At Higher Levels."}</i></b> ${spFormat(s.h).replace(/^<p>|<\/p>$/g, "")}</p>` : ""}
    <div class="actions"><button class="btn sm" data-sp="copy" data-id="${s.id}">Copy spell</button><button class="btn sm" data-sp="fav" data-id="${s.id}">${favs.has(favKey(s)) ? "★ Remove favorite" : "☆ Add favorite"}</button>${spPrepBtn(s)}</div>
  </div>`;
}
function spRow(s) {
  const open = SP.expandAll || SP.open.has(s.id), fav = favs.has(favKey(s));
  return `<div class="sp-row sch-${String(s.s || "").toLowerCase()} ${open ? "open" : ""}" data-id="${s.id}">
    <div class="sp-head" data-sp="toggle" data-id="${s.id}" role="button" tabindex="0" aria-expanded="${open}">
      <button class="sp-star ${fav ? "on" : ""}" data-sp="fav" data-id="${s.id}" title="${fav ? "Remove favorite" : "Add favorite"}" aria-label="Favorite">${fav ? "★" : "☆"}</button>
      <b class="sp-name">${esc(s.n)}</b>
      <span class="sp-meta">${esc(s.s)}</span>
      <span class="sp-meta hide-sm">${esc(s.ts.length > 22 ? s.tc + "*" : s.ts)}</span>
      <span class="sp-meta hide-sm">${esc(s.r)}</span>
      <span class="sp-tags">${s.hb ? `<span class="tag gold" title="Homebrew spell">Homebrew</span>` : ""}${s.co ? `<span class="tag" title="Concentration">C</span>` : ""}${s.ri ? `<span class="tag" title="Ritual">R</span>` : ""}${s.dt ? `<span class="tag hide-sm">${esc(s.dt)}</span>` : ""}${spTargetPC() && isPrep(spTargetPC(), s.n, SP.ed) ? `<span class="tag gold" title="Prepared for ${esc(spTargetPC().name)}">✦</span>` : ""}</span>
    </div>
    ${open ? spDetail(s) : ""}
  </div>`;
}
function renderSpells() {
  spLoad(); renderSpTargets();
  const list = spFiltered(), total = SP.data[SP.ed].length;
  $("#spCount").innerHTML = `Showing <b>${list.length}</b> of ${total} ${SP.ed === "2024" ? "2024 (SRD 5.2)" : "2014 (SRD 5.1)"} spells`;
  if (!list.length) { $("#spList").innerHTML = `<div class="card empty"><h2>No spells found</h2><p>Loosen a filter or clear them all.</p></div>`; return; }
  let h = "", last = null;
  const byLevel = $("#spSort").value === "level";
  for (const s of list) {
    if (byLevel && s.l !== last) { if (last !== null) h += `</div>`; h += `<div class="sec sp-group"><div class="sec-h"><h3>${s.l === 0 ? "Cantrips" : ordinal(s.l) + " spells"}</h3><span class="sp"></span><span class="muted" style="font-size:14px">${list.filter(x => x.l === s.l).length}</span></div>`; last = s.l; }
    h += spRow(s);
  }
  if (byLevel) h += `</div>`; else h = `<div class="sec sp-group">${h}</div>`;
  $("#spList").innerHTML = h;
}
function spText(s) {
  return `${s.n}\n${s.l ? `Level ${s.l} ${s.s}` : `${s.s} cantrip`} (${s.c.join(", ")})\nCasting Time: ${s.t}${s.ri ? " or Ritual" : ""}\nRange: ${s.r}\nComponents: ${s.cp.split("").join(", ")}${s.m ? ` (${s.m})` : ""}\nDuration: ${s.co && !/concentration/i.test(s.du) ? "Concentration, " : ""}${s.du}\n\n${s.d.replace(/\*\*/g, "")}${s.h ? `\n\n${SP.ed === "2024" ? "Using a Higher-Level Spell Slot" : "At Higher Levels"}: ${s.h}` : ""}`;
}
const spFind = id => SP.data[id.split("-")[0]][+id.split("-")[1]];
let spTimer = null;
const spRerender = () => { clearTimeout(spTimer); spTimer = setTimeout(renderSpells, 110); };
(function initSpells() {
  $("#spForm").addEventListener("input", e => { if (e.target.name === "spEd") { SP.ed = e.target.value; SP.open.clear(); } spRerender(); });
  $("#spLevels").addEventListener("click", e => { const c = e.target.closest(".chip"); if (!c) return; const l = +c.dataset.l; SP.levels.has(l) ? SP.levels.delete(l) : SP.levels.add(l); c.classList.toggle("on"); renderSpells(); });
  $("#spReset").addEventListener("click", () => {
    $("#spQ").value = ""; ["#spClass", "#spSchool", "#spTime", "#spConc", "#spDmg", "#spSave"].forEach(id => $(id).value = "");
    ["#spInDesc", "#spRitual", "#spNoM", "#spFav"].forEach(id => $(id).checked = false);
    SP.levels.clear(); $$("#spLevels .chip").forEach(c => c.classList.remove("on")); renderSpells();
  });
  $("#spExpand").addEventListener("click", () => { SP.expandAll = !SP.expandAll; if (!SP.expandAll) SP.open.clear(); $("#spExpand").textContent = SP.expandAll ? "Collapse all" : "Expand all"; renderSpells(); });
  const act = async (e) => {
    const b = e.target.closest("[data-sp]"); if (!b) return; const s = spFind(b.dataset.id);
    if (b.dataset.sp === "fav") { e.stopPropagation(); toggleFav(s); }
    else if (b.dataset.sp === "prep") { e.stopPropagation(); spPrepToggle(s); }
    else if (b.dataset.sp === "copy") { try { await navigator.clipboard.writeText(spText(s)); toast(`${s.n} copied`); } catch { toast("Couldn't copy here"); } return; }
    else { SP.open.has(s.id) ? SP.open.delete(s.id) : SP.open.add(s.id); if (SP.expandAll && !SP.open.has(s.id)) { SP.expandAll = false; $("#spExpand").textContent = "Expand all"; } }
    const row = $(`.sp-row[data-id="${s.id}"]`); if (row) row.outerHTML = spRow(s);
    if (b.dataset.sp === "fav" && $("#spFav").checked) renderSpells();
  };
  $("#spList").addEventListener("click", act);
  $("#spList").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".sp-head")) { e.preventDefault(); act(e); } });
})();
function openSpellsFor(cls, maxLevel, hasCantrips) {
  spLoad();
  $("#spReset").click();
  $("#spClass").value = cls;
  for (let l = hasCantrips ? 0 : 1; l <= maxLevel; l++) SP.levels.add(l);
  $$("#spLevels .chip").forEach(c => c.classList.toggle("on", SP.levels.has(+c.dataset.l)));
  location.hash = "spells"; renderSpells();
}
